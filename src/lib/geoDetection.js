/**
 * Motor de detecção territorial do Carmo - RJ.
 * Cruza coordenadas GPS (latitude, longitude) com os polígonos oficiais
 * do arquivo carmo-territorios-data.js (base ACE-FINAL).
 */

function isPointInPolygon(point, vs) {
  if (!vs || vs.length < 3) return false;
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function calculateCentroid(coords) {
  if (!coords || coords.length === 0) return [0, 0];
  let sumLat = 0;
  let sumLng = 0;
  for (let i = 0; i < coords.length; i++) {
    sumLat += coords[i][0];
    sumLng += coords[i][1];
  }
  return [sumLat / coords.length, sumLng / coords.length];
}

function getDistanceSquared(p1, p2) {
  const dLat = p1[0] - p2[0];
  const dLng = p1[1] - p2[1];
  return dLat * dLat + dLng * dLng;
}

export function detectTerritoryFromGps(lat, lng) {
  const source = window.ACE_TERRITORY_SOURCE;
  if (!source || !Array.isArray(source.polygons)) {
    return {
      microarea: "Carmo (Geral)",
      quarteirao: "--",
      isExact: false,
      polygon: null
    };
  }

  const point = [Number(lat), Number(lng)];

  // 1. Busca se está estritamente dentro de algum polígono de quarteirão
  for (const poly of source.polygons) {
    if (isPointInPolygon(point, poly.coordinates)) {
      return {
        microarea: poly.folder || (poly.path && poly.path[0]) || "Centro",
        quarteirao: poly.name ? (poly.name.startsWith("Q") ? poly.name : `Q-${poly.name}`) : "Q-01",
        originalName: poly.originalName || poly.name,
        isExact: true,
        polygon: poly
      };
    }
  }

  // 2. Fallback por proximidade do centróide (se estiver na calçada ou divisa)
  let closestPoly = null;
  let minDistance = Infinity;

  for (const poly of source.polygons) {
    const centroid = calculateCentroid(poly.coordinates);
    const dist = getDistanceSquared(point, centroid);
    if (dist < minDistance) {
      minDistance = dist;
      closestPoly = poly;
    }
  }

  if (closestPoly) {
    return {
      microarea: closestPoly.folder || (closestPoly.path && closestPoly.path[0]) || "Carmo",
      quarteirao: closestPoly.name ? (closestPoly.name.startsWith("Q") ? closestPoly.name : `Q-${closestPoly.name}`) : "Aprox.",
      originalName: closestPoly.originalName || closestPoly.name,
      isExact: false,
      polygon: closestPoly
    };
  }

  return {
    microarea: "Carmo (Centro)",
    quarteirao: "Q-01",
    isExact: false,
    polygon: null
  };
}

export function getAllPolygons() {
  const source = window.ACE_TERRITORY_SOURCE;
  if (!source || !Array.isArray(source.polygons)) return [];
  return source.polygons;
}

export function getAllTerritoriesCatalog() {
  const source = window.ACE_TERRITORY_SOURCE;
  if (!source || !source.meta || !source.meta.catalog) {
    return {
      territories: ["Centro", "Jardim Centenário", "Progresso", "Botafogo", "Caixa d'Água", "Val Paraíso"],
      byTerritory: {}
    };
  }
  return source.meta.catalog;
}
