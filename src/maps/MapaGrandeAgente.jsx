import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../lib/geoDetection';
import { fetchOsrmLine, estimatePickupEta } from '../lib/geoRoute';
import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE, pinIcon, youDotIcon, ladderTruckIcon } from './leafletIcons';
import { makeAutoFit } from './mapFit';
import { MapControlButtons } from './MapControlButtons';

/**
 * Mapa Grande do Agente de Campo (Inspirado no PassengerLiveMap do MOTOJAGEMINI)
 * Exibe a malha territorial de Carmo, posição do agente, posição da escada
 * e a rota real pelas ruas via OSRM.
 */
export function MapaGrandeAgente({
  userPos,
  microarea,
  quarteirao,
  pedidoAtivo,
  driverPos
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const autoFitRef = useRef(null);
  const layersRef = useRef({
    polygons: null,
    agentMarker: null,
    driverMarker: null,
    destMarker: null,
    routeLine: null
  });

  const [satellite, setSatellite] = useState(false);
  const [etaInfo, setEtaInfo] = useState(null);

  // Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = userPos?.latitude || -21.9339;
    const initialLng = userPos?.longitude || -42.6089;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;
    autoFitRef.current = makeAutoFit(map);

    tileLayerRef.current = L.tileLayer(MAP_TILE_STANDARD.url, {
      maxZoom: MAP_TILE_STANDARD.maxZoom,
      attribution: MAP_TILE_STANDARD.attribution
    }).addTo(map);

    layersRef.current.polygons = L.layerGroup().addTo(map);

    const onResize = () => {
      try {
        if (mapInstanceRef.current && map._leaflet_id && map.getContainer()) {
          map.invalidateSize();
        }
      } catch (e) {}
    };

    window.addEventListener('resize', onResize);
    requestAnimationFrame(onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      try {
        map.remove();
      } catch (e) {}
      mapInstanceRef.current = null;
      autoFitRef.current = null;
    };
  }, []);

  // Alternância Satélite / Rua Padrão
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = satellite ? MAP_TILE_SATELLITE : MAP_TILE_STANDARD;
    tileLayerRef.current = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      attribution: cfg.attribution
    }).addTo(map);
  }, [satellite]);

  // Renderização dos Polígonos de Carmo
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polyGroup = layersRef.current.polygons;
    if (!map || !polyGroup) return;

    polyGroup.clearLayers();
    const allPolys = getAllPolygons();
    const currentNumOnly = String(quarteirao || '').replace(/^Q\s*[-/]?\s*/i, '').trim();

    allPolys.forEach((poly) => {
      if (!poly.coordinates || poly.coordinates.length < 3) return;

      const polyMicro = (poly.folder || '').toLowerCase();
      const polyName = String(poly.name || '').toLowerCase();

      const isCurrent =
        polyMicro.includes(String(microarea || '').toLowerCase()) &&
        (polyName === currentNumOnly.toLowerCase() || polyName === `q-${currentNumOnly.toLowerCase()}`);

      const leafPoly = L.polygon(poly.coordinates, {
        color: isCurrent ? '#059669' : '#64748b',
        weight: isCurrent ? 2.5 : 1,
        fillColor: isCurrent ? '#10b981' : '#94a3b8',
        fillOpacity: isCurrent ? 0.28 : 0.06,
        dashArray: isCurrent ? null : '2, 3'
      });

      leafPoly.bindTooltip(`<b>${poly.folder || 'Carmo'}</b><br/>Quarteirão: ${poly.name}`, {
        direction: 'center',
        permanent: false
      });

      leafPoly.addTo(polyGroup);
    });
  }, [microarea, quarteirao]);

  // Renderização de Marcadores e Rota OSRM em Tempo Real
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    let isCancelled = false;

    (async () => {
      const layers = layersRef.current;

      // 1. Marcador do Agente ("Você")
      if (userPos?.latitude && userPos?.longitude) {
        if (!layers.agentMarker) {
          layers.agentMarker = L.marker([userPos.latitude, userPos.longitude], {
            icon: youDotIcon('Você (Agente)'),
            zIndexOffset: 1200
          }).addTo(map);
        } else {
          layers.agentMarker.setLatLng([userPos.latitude, userPos.longitude]);
        }
      }

      // 2. Marcador e Rota da Escada de Apoio
      const ladderLat = pedidoAtivo?.motorista_lat ?? driverPos?.latitude;
      const ladderLng = pedidoAtivo?.motorista_lng ?? driverPos?.longitude;
      const hasLadderPos = ladderLat != null && ladderLng != null && !isNaN(Number(ladderLat));

      if (hasLadderPos) {
        if (!layers.driverMarker) {
          layers.driverMarker = L.marker([ladderLat, ladderLng], {
            icon: ladderTruckIcon('Escada de Apoio'),
            zIndexOffset: 1400
          }).addTo(map);
        } else {
          layers.driverMarker.setLatLng([ladderLat, ladderLng]);
        }
      } else if (layers.driverMarker) {
        map.removeLayer(layers.driverMarker);
        layers.driverMarker = null;
      }

      // 3. Traçado da Rota pelas Ruas Reais (OSRM)
      if (pedidoAtivo && (pedidoAtivo.status === 'solicitado' || pedidoAtivo.status === 'a_caminho') && hasLadderPos && userPos?.latitude) {
        const routePoints = [
          { lat: Number(ladderLat), lng: Number(ladderLng) },
          { lat: Number(userPos.latitude), lng: Number(userPos.longitude) }
        ];

        const lineCoords = await fetchOsrmLine(routePoints);
        if (isCancelled) return;

        if (lineCoords && lineCoords.length >= 2) {
          if (layers.routeLine) {
            map.removeLayer(layers.routeLine);
          }

          // Dupla camada de polyline estilo app profissional
          const casing = L.polyline(lineCoords, {
            color: '#0f172a',
            weight: 7,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
          });

          const core = L.polyline(lineCoords, {
            color: pedidoAtivo.status === 'a_caminho' ? '#2563eb' : '#f59e0b',
            weight: 4.5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
          });

          layers.routeLine = L.layerGroup([casing, core]).addTo(map);

          // Cálculo do ETA e Distância
          const eta = estimatePickupEta(ladderLat, ladderLng, userPos.latitude, userPos.longitude);
          setEtaInfo(eta);

          // Ajuste de enquadramento
          autoFitRef.current?.fit(lineCoords, { top: 70, bottom: 200, maxZoom: 16 });
        }
      } else {
        if (layers.routeLine) {
          map.removeLayer(layers.routeLine);
          layers.routeLine = null;
        }
        setEtaInfo(null);

        // Se não há rota ativa, foca no agente
        if (userPos?.latitude && userPos?.longitude) {
          autoFitRef.current?.fit([[userPos.latitude, userPos.longitude]], { maxZoom: 16 });
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [userPos?.latitude, userPos?.longitude, pedidoAtivo?.status, pedidoAtivo?.motorista_lat, pedidoAtivo?.motorista_lng, driverPos?.latitude, driverPos?.longitude]);

  const handleRecenter = () => {
    autoFitRef.current?.resume();
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userPos?.latitude && userPos?.longitude) {
      map.setView([userPos.latitude, userPos.longitude], 16, { animate: true });
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-200">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Botões Flutuantes (Centralizar + Satélite) */}
      <MapControlButtons
        onRecenter={handleRecenter}
        satellite={satellite}
        onToggleSatellite={() => setSatellite((prev) => !prev)}
        top={12}
        right={12}
      />

      {/* Badge Flutuante de Status do Pedido no Topo */}
      {pedidoAtivo && (
        <div className="absolute top-3 left-3 z-[800] pointer-events-none max-w-[calc(100%-80px)]">
          <div className="bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 shadow-md flex items-center gap-2 text-[11px] font-semibold">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                pedidoAtivo.status === 'a_caminho'
                  ? 'bg-blue-400 animate-pulse'
                  : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="truncate">
              {pedidoAtivo.status === 'a_caminho'
                ? etaInfo?.arrived
                  ? 'Escada no local!'
                  : etaInfo
                  ? `Escada a caminho • ~${etaInfo.minutes} min (${etaInfo.km.toFixed(1)} km)`
                  : 'Escada a caminho do imóvel'
                : 'Aguardando atendimento do suporte'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
