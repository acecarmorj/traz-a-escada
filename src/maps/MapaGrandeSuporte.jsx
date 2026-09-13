import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../lib/geoDetection';
import { fetchOsrmLine, estimatePickupEta } from '../lib/geoRoute';
import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE, pinIcon, ladderTruckIcon } from './leafletIcons';
import { makeAutoFit } from './mapFit';
import { MapControlButtons } from './MapControlButtons';

/**
 * Mapa Grande do Agente que Leva a Escada (Inspirado no DriverRideMap do MOTOJAGEMINI)
 * Exibe a posição do veículo, os chamados pendentes e traça a rota real pelas ruas via OSRM.
 */
export function MapaGrandeSuporte({
  pedidos,
  driverPos,
  pedidoFocadoId,
  onSelecionarPedido
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const autoFitRef = useRef(null);
  const layersRef = useRef({
    polygons: null,
    driverMarker: null,
    pedidosGroup: null,
    routeLine: null
  });

  const [satellite, setSatellite] = useState(false);
  const [etaInfo, setEtaInfo] = useState(null);

  // Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = driverPos?.latitude || -21.9339;
    const initialLng = driverPos?.longitude || -42.6089;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
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
    layersRef.current.pedidosGroup = L.layerGroup().addTo(map);

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

    allPolys.forEach((poly) => {
      if (!poly.coordinates || poly.coordinates.length < 3) return;

      const leafPoly = L.polygon(poly.coordinates, {
        color: '#94a3b8',
        weight: 1,
        fillColor: '#cbd5e1',
        fillOpacity: 0.05,
        dashArray: '3, 4'
      });

      leafPoly.bindTooltip(`<b>${poly.folder || 'Carmo'}</b><br/>Quarteirão: ${poly.name}`, {
        direction: 'center',
        permanent: false
      });

      leafPoly.addTo(polyGroup);
    });
  }, []);

  // Renderização de Posição do Motorista, Marcadores de Chamados e Rota OSRM
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    let isCancelled = false;

    (async () => {
      const layers = layersRef.current;
      const markersGroup = layers.pedidosGroup;
      markersGroup.clearLayers();

      // 1. Marcador do Motorista da Escada ("Você")
      if (driverPos?.latitude && driverPos?.longitude) {
        if (!layers.driverMarker) {
          layers.driverMarker = L.marker([driverPos.latitude, driverPos.longitude], {
            icon: ladderTruckIcon('Você (Escada)'),
            zIndexOffset: 1500
          }).addTo(map);
        } else {
          layers.driverMarker.setLatLng([driverPos.latitude, driverPos.longitude]);
        }
      }

      // Pedido alvo da rota: pedido selecionado ou primeiro a_caminho ou primeiro solicitado
      const pedidosAtivos = (pedidos || []).filter(
        (p) => p.status === 'solicitado' || p.status === 'a_caminho' || p.status === 'entregue'
      );

      const pedidoAtivo =
        pedidosAtivos.find((p) => p.id === pedidoFocadoId) ||
        pedidosAtivos.find((p) => p.status === 'a_caminho') ||
        pedidosAtivos[0] ||
        null;

      const allPointsToFit = [];
      if (driverPos?.latitude && driverPos?.longitude) {
        allPointsToFit.push([driverPos.latitude, driverPos.longitude]);
      }

      // 2. Marcadores para todos os pedidos ativos
      pedidosAtivos.forEach((p) => {
        const pLat = Number(p.latitude);
        const pLng = Number(p.longitude);
        if (isNaN(pLat) || isNaN(pLng)) return;

        allPointsToFit.push([pLat, pLng]);
        const isSelected = pedidoAtivo && pedidoAtivo.id === p.id;
        const color = p.status === 'a_caminho' ? '#2563eb' : p.status === 'entregue' ? '#059669' : '#d97706';
        const label = p.status === 'a_caminho' ? 'Em trânsito' : p.status === 'entregue' ? 'Entregue' : 'Chamado';

        const marker = L.marker([pLat, pLng], {
          icon: pinIcon(color, label, isSelected ? 32 : 26),
          zIndexOffset: isSelected ? 1300 : 1000
        }).addTo(markersGroup);

        marker.bindTooltip(`
          <div style="font-family:Inter,sans-serif;font-size:11px;">
            <b>${p.morador_nome || 'Morador'}</b><br/>
            ${p.rua || ''} ${p.numero ? `nº ${p.numero}` : ''}<br/>
            ${p.quarteirao} • ${p.microarea}
          </div>
        `, { direction: 'top', offset: [0, -10] });

        marker.on('click', () => {
          if (onSelecionarPedido) onSelecionarPedido(p.id);
        });
      });

      // 3. Traçado da Rota pelas Ruas Reais (OSRM) até o chamado ativo
      if (pedidoAtivo && driverPos?.latitude && driverPos?.longitude) {
        const destLat = Number(pedidoAtivo.latitude);
        const destLng = Number(pedidoAtivo.longitude);

        if (!isNaN(destLat) && !isNaN(destLng)) {
          const routePts = [
            { lat: Number(driverPos.latitude), lng: Number(driverPos.longitude) },
            { lat: destLat, lng: destLng }
          ];

          const lineCoords = await fetchOsrmLine(routePts);
          if (isCancelled) return;

          if (lineCoords && lineCoords.length >= 2) {
            if (layers.routeLine) {
              map.removeLayer(layers.routeLine);
            }

            // Dupla camada profissional estilo MotoJá/Google Maps
            const casing = L.polyline(lineCoords, {
              color: '#0f172a',
              weight: 7,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round'
            });

            const core = L.polyline(lineCoords, {
              color: pedidoAtivo.status === 'a_caminho' ? '#2563eb' : '#d97706',
              weight: 4.5,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round'
            });

            layers.routeLine = L.layerGroup([casing, core]).addTo(map);

            const eta = estimatePickupEta(driverPos.latitude, driverPos.longitude, destLat, destLng);
            setEtaInfo(eta);

            autoFitRef.current?.fit(lineCoords, { top: 80, bottom: 220, maxZoom: 16 });
            return;
          }
        }
      }

      // Se não há rota OSRM ativa, limpa a linha e enquadra os pontos conhecidos
      if (layers.routeLine) {
        map.removeLayer(layers.routeLine);
        layers.routeLine = null;
      }
      setEtaInfo(null);

      if (allPointsToFit.length > 0) {
        autoFitRef.current?.fit(allPointsToFit, { top: 70, bottom: 200, maxZoom: 16 });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [pedidos, driverPos?.latitude, driverPos?.longitude, pedidoFocadoId]);

  const handleRecenter = () => {
    autoFitRef.current?.resume();
    const map = mapInstanceRef.current;
    if (!map) return;

    if (driverPos?.latitude && driverPos?.longitude) {
      map.setView([driverPos.latitude, driverPos.longitude], 16, { animate: true });
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-200">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Botões Flutuantes (Centralizar + Satélite) posicionados com folga abaixo do header e do alerta */}
      <MapControlButtons
        onRecenter={handleRecenter}
        satellite={satellite}
        onToggleSatellite={() => setSatellite((prev) => !prev)}
        top={118}
        right={12}
      />
    </div>
  );
}
