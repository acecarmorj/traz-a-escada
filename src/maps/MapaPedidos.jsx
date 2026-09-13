import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../lib/geoDetection';

export function MapaPedidos({ pedidos, driverPos, onMudarStatus }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const polygonsGroupRef = useRef(null);
  const routesGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inicializa o mapa Leaflet
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-21.9325, -42.6075],
        zoom: 15,
        zoomControl: true
      });

      // Camada padrão OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(map);

      polygonsGroupRef.current = L.layerGroup().addTo(map);
      routesGroupRef.current = L.layerGroup().addTo(map);
      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const polyGroup = polygonsGroupRef.current;
    const routesGroup = routesGroupRef.current;
    const markersGroup = layersGroupRef.current;

    // 1. Polígonos Oficiais de Carmo (134 Quarteirões)
    polyGroup.clearLayers();
    const allPolys = getAllPolygons();
    const activeQuarteiroes = new Set(
      (pedidos || [])
        .filter(p => p.status === 'solicitado' || p.status === 'a_caminho')
        .map(p => `${p.microarea}_${p.quarteirao}`)
    );

    allPolys.forEach(poly => {
      if (!poly.coordinates || poly.coordinates.length < 3) return;
      const key = `${poly.folder}_Q-${poly.name}`;
      const isActive = activeQuarteiroes.has(key) || activeQuarteiroes.has(`${poly.folder}_${poly.name}`);

      const leafPoly = L.polygon(poly.coordinates, {
        color: isActive ? '#dc2626' : '#94a3b8',
        weight: isActive ? 2.5 : 1,
        fillColor: isActive ? '#25D366' : '#cbd5e1',
        fillOpacity: isActive ? 0.35 : 0.08,
        dashArray: isActive ? null : '3, 4'
      });

      leafPoly.bindTooltip(
        `<strong>${poly.folder || 'Carmo'}</strong><br/>Quarteirão: ${poly.name}`,
        { permanent: false, direction: 'top' }
      );

      leafPoly.addTo(polyGroup);
    });

    // 2. Limpa e reconstrói rotas e marcadores
    routesGroup.clearLayers();
    markersGroup.clearLayers();

    const boundsPoints = [];

    // Posição do Motorista / Veículo da Escada
    if (driverPos && driverPos.latitude && driverPos.longitude) {
      boundsPoints.push([driverPos.latitude, driverPos.longitude]);
      const driverIcon = L.divIcon({
        className: 'driver-marker',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="w-9 h-9 rounded-full bg-slate-950 border-2 border-[#25D366] flex items-center justify-center text-lg shadow-lg">
              🚚
            </div>
            <span class="mt-0.5 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold shadow-xs">
              Você
            </span>
          </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 42]
      });

      L.marker([driverPos.latitude, driverPos.longitude], { icon: driverIcon })
        .bindTooltip("Você (Carro da Escada)", { permanent: false })
        .addTo(markersGroup);
    }

    // Marcadores dos Pedidos Ativos
    (pedidos || []).forEach(pedido => {
      if (pedido.status === 'concluido' || pedido.status === 'cancelado') return;

      const pLat = Number(pedido.latitude);
      const pLng = Number(pedido.longitude);
      if (isNaN(pLat) || isNaN(pLng)) return;

      boundsPoints.push([pLat, pLng]);

      const isCaminho = pedido.status === 'a_caminho';
      const isEntregue = pedido.status === 'entregue';

      // Traça linha pontilhada se o motorista tiver GPS
      if (driverPos && driverPos.latitude && driverPos.longitude && (pedido.status === 'solicitado' || isCaminho)) {
        L.polyline([
          [driverPos.latitude, driverPos.longitude],
          [pLat, pLng]
        ], {
          color: isCaminho ? '#25D366' : '#f59e0b',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.85
        }).addTo(routesGroup);
      }

      const iconHtml = `
        <div class="relative flex flex-col items-center">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-xl border-2 ${
            isEntregue
              ? 'bg-blue-600 border-white text-white'
              : isCaminho
              ? 'bg-[#25D366] border-white text-slate-950 animate-bounce'
              : 'bg-amber-500 border-slate-900 text-slate-950 pulsing-marker'
          }">
            🪜
          </div>
          <span class="mt-1 px-2 py-0.5 rounded-md text-[11px] font-black tracking-tight whitespace-nowrap shadow-md ${
            isEntregue
              ? 'bg-blue-700 text-white'
              : isCaminho
              ? 'bg-[#075E54] text-white'
              : 'bg-slate-900 text-amber-300'
          }">
            ${pedido.agente_nome || 'Agente'}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [40, 56],
        iconAnchor: [20, 48]
      });

      const marker = L.marker([pLat, pLng], { icon: customIcon });

      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}`;
      const wazeUrl = `https://waze.com/ul?ll=${pLat},${pLng}&navigate=yes`;

      const popupContent = `
        <div class="p-2 text-slate-900 font-sans min-w-[220px]">
          <div class="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
            <span class="text-xl">🪜</span>
            <div>
              <div class="font-bold text-sm text-slate-950">${pedido.agente_nome || 'Agente'}</div>
              <div class="text-xs text-slate-600">${pedido.microarea} • ${pedido.quarteirao}</div>
            </div>
          </div>

          <div class="text-xs font-semibold text-slate-800 mb-1">
            🏠 Morador: <span class="font-bold text-emerald-800">${pedido.morador_nome || 'Não informado'}</span>
          </div>
          <div class="text-xs text-slate-600 mb-2">
            📍 ${pedido.rua} ${pedido.numero ? `nº ${pedido.numero}` : ''}
          </div>
          
          ${pedido.referencia ? `<div class="text-xs bg-slate-100 p-1.5 rounded mb-2 text-slate-700"><strong>Ref:</strong> ${pedido.referencia}</div>` : ''}

          <div class="flex flex-col gap-1.5 mt-2">
            <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" 
               class="bg-[#128C7E] text-white text-center text-xs py-1.5 px-2 rounded-lg font-bold hover:bg-[#075E54]">
               🗺️ Rota no Google Maps
            </a>
            <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" 
               class="bg-cyan-600 text-white text-center text-xs py-1.5 px-2 rounded-lg font-bold hover:bg-cyan-700">
               🚗 Rota no Waze
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(markersGroup);
    });

    // 3. Ajuste inteligente do zoom para enquadrar chamados e motorista
    if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [40, 40], maxZoom: 16 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 16);
    }

  }, [pedidos, driverPos]);

  return (
    <div className="w-full h-72 sm:h-80 md:h-96 relative rounded-2xl overflow-hidden border-2 border-emerald-600/30 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
