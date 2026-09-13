/**
 * Serviço de Roteamento Real via OSRM (Project OSRM)
 * Adaptado da arquitetura do MOTOJAGEMINI para a cidade de Carmo - RJ.
 * Traça rotas reais que seguem as curvas das ruas asfaltadas e calçadas de Carmo.
 */

export const osrmLineCache = new Map();

/**
 * Calcula a distância em linha reta (Haversine) entre dois pontos em km
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calcula ETA (tempo estimado de chegada em minutos)
 * Velocidade média urbana em Carmo para veículo de apoio/moto com escada: ~25 km/h
 */
export function estimatePickupEta(driverLat, driverLng, destLat, destLng, speedKmh = 25) {
  if (driverLat == null || driverLng == null || destLat == null || destLng == null) return null;
  const nums = [driverLat, driverLng, destLat, destLng].map(Number);
  if (nums.some((v) => Number.isNaN(v))) return null;
  const [dLat, dLng, oLat, oLng] = nums;
  const km = haversineKm(dLat, dLng, oLat, oLng);
  if (km <= 0.04) return { arrived: true, minutes: 0, km }; // Chegou ao imóvel (< 40m)
  const minutes = Math.max(1, Math.ceil((km / speedKmh) * 60));
  return { arrived: false, minutes, km };
}

/**
 * Busca o traçado real da rota pelas vias urbanas através do OSRM.
 * Retorna array de coordenadas [latitude, longitude] para polylines do Leaflet.
 */
export async function fetchOsrmLine(points) {
  const valid = (points || [])
    .map((p) => {
      if (!p) return null;
      const lat = p.latitude ?? p.lat;
      const lng = p.longitude ?? p.lng;
      if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        return { lat: Number(lat), lng: Number(lng) };
      }
      return null;
    })
    .filter(Boolean);

  if (valid.length < 2) return null;

  // Cache em memória para evitar requisições repetidas e jitter de GPS
  const cacheKey = valid
    .map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)
    .join(';');

  if (osrmLineCache.has(cacheKey)) {
    return osrmLineCache.get(cacheKey);
  }

  try {
    const osrmCoords = valid.map((p) => `${p.lng},${p.lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`
    );

    if (res.ok) {
      const data = await res.json();
      const coords = data?.routes?.[0]?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        // Converte [lng, lat] do GeoJSON para [lat, lng] do Leaflet
        const line = coords.map(([lng, lat]) => [lat, lng]);
        osrmLineCache.set(cacheKey, line);
        return line;
      }
    }
  } catch (err) {
    // Silently fallback on network error
  }

  // Fallback para linha direta se o OSRM falhar
  return valid.map((p) => [p.lat, p.lng]);
}
