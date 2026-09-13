import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../lib/geoDetection';

export function MapaPedidos({ pedidos, driverPos, onMudarStatus }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const polygonsGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inicializa o mapa apenas uma vez
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-21.9325, -42.6075],
        zoom: 14,
        zoomControl: true
      });

      // Camada de mapa OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      polygonsGroupRef.current = L.layerGroup().addTo(map);
      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const polyGroup = polygonsGroupRef.current;
    const markersGroup = layersGroupRef.current;

    // 1. Renderiza Polígonos de Carmo
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
        color: isActive ? '#dc2626' : '#64748b',
        weight: isActive ? 2.5 : 1,
        fillColor: isActive ? '#f59e0b' : '#94a3b8',
        fillOpacity: isActive ? 0.45 : 0.08,
        dashArray: isActive ? null : '3, 4'
      });

      leafPoly.bindTooltip(
        `<strong>${poly.folder || 'Carmo'}</strong><br/>Quarteirão: ${poly.name}`,
        { permanent: false, direction: 'top' }
      );

      leafPoly.addTo(polyGroup);
    });

    // 2. Renderiza Marcadores dos Pedidos
    markersGroup.clearLayers();

    (pedidos || []).forEach(pedido => {
      if (pedido.status === 'concluido' || pedido.status === 'cancelado') return;

      const isCaminho = pedido.status === 'a_caminho';
      const isEntregue = pedido.status === 'entregue';

      const iconHtml = `
        <div class="relative flex flex-col items-center">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg border-2 ${
            isEntregue
              ? 'bg-emerald-500 border-white text-white'
              : isCaminho
              ? 'bg-blue-600 border-white text-white animate-bounce'
              : 'bg-amber-500 border-slate-900 text-slate-950 pulsing-marker'
          }">
            🪜
          </div>
          <span class="mt-1 px-2 py-0.5 rounded-md text-[11px] font-black tracking-tight whitespace-nowrap shadow-md ${
            isEntregue
              ? 'bg-emerald-700 text-white'
              : isCaminho
              ? 'bg-blue-800 text-white'
              : 'bg-slate-900 text-amber-400'
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

      const marker = L.marker([pedido.latitude, pedido.longitude], { icon: customIcon });

      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pedido.latitude},${pedido.longitude}`;
      const wazeUrl = `https://waze.com/ul?ll=${pedido.latitude},${pedido.longitude}&navigate=yes`;

      const popupContent = `
        <div class="p-2 text-slate-900 font-sans min-w-[220px]">
          <div class="flex items-center gap-2 border-b pb-1.5 mb-2">
            <span class="text-xl">🪜</span>
            <div>
              <div class="font-bold text-sm">${pedido.agente_nome}</div>
              <div class="text-xs text-slate-600">${pedido.microarea} • ${pedido.quarteirao}</div>
            </div>
          </div>
          
          ${pedido.referencia ? `<div class="text-xs bg-slate-100 p-1.5 rounded mb-2 text-slate-700"><strong>Ref:</strong> ${pedido.referencia}</div>` : ''}

          <div class="flex flex-col gap-1.5 mt-2">
            <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" 
               class="bg-blue-600 text-white text-center text-xs py-1.5 px-2 rounded-md font-bold hover:bg-blue-700">
               🗺️ Abrir no Google Maps
            </a>
            <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" 
               class="bg-cyan-600 text-white text-center text-xs py-1.5 px-2 rounded-md font-bold hover:bg-cyan-700">
               🚗 Abrir no Waze
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(markersGroup);
    });

    // 3. Marcador da Posição do Motorista / Supervisor
    if (driverPos && driverPos.latitude && driverPos.longitude) {
      const driverIcon = L.divIcon({
        className: 'driver-marker',
        html: `
          <div class="w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-sm shadow-xl">
            🚚
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      L.marker([driverPos.latitude, driverPos.longitude], { icon: driverIcon })
        .bindTooltip("Você (Veículo da Escada)", { permanent: false })
        .addTo(markersGroup);
    }

  }, [pedidos, driverPos]);

  return (
    <div className="w-full h-80 sm:h-96 md:h-[450px] relative rounded-2xl overflow-hidden border border-slate-300 shadow-md">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
