import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../lib/geoDetection';

export function MapaAgente({ userPos, microarea, quarteirao }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonsGroupRef = useRef(null);
  const markerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userPos?.latitude || -21.9325;
      const initialLng = userPos?.longitude || -42.6075;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      polygonsGroupRef.current = L.layerGroup().addTo(map);
      markerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const polyGroup = polygonsGroupRef.current;
    const markerGroup = markerGroupRef.current;

    // Renderizar polígonos dos quarteirões
    polyGroup.clearLayers();
    const allPolys = getAllPolygons();

    const currentKey = `${microarea}_${quarteirao}`.toLowerCase();
    const currentNumOnly = String(quarteirao || '').replace(/^Q\s*[-/]?\s*/i, '').trim();

    allPolys.forEach(poly => {
      if (!poly.coordinates || poly.coordinates.length < 3) return;

      const polyMicro = (poly.folder || '').toLowerCase();
      const polyName = String(poly.name || '').toLowerCase();

      const isCurrent = (
        polyMicro.includes(String(microarea || '').toLowerCase()) &&
        (polyName === currentNumOnly.toLowerCase() || polyName === `q-${currentNumOnly.toLowerCase()}`)
      );

      const leafPoly = L.polygon(poly.coordinates, {
        color: isCurrent ? '#059669' : '#64748b',
        weight: isCurrent ? 2.5 : 1,
        fillColor: isCurrent ? '#10b981' : '#94a3b8',
        fillOpacity: isCurrent ? 0.35 : 0.08,
        dashArray: isCurrent ? null : '2, 3'
      });

      leafPoly.bindTooltip(
        `<strong>${poly.folder || 'Carmo'}</strong><br/>Quarteirão: ${poly.name}`,
        { permanent: false, direction: 'center', className: 'corporate-tooltip' }
      );

      leafPoly.addTo(polyGroup);
    });

    // Marcador da posição do Agente
    markerGroup.clearLayers();
    if (userPos && userPos.latitude && userPos.longitude) {
      const agentIcon = L.divIcon({
        className: 'agent-pin',
        html: `
          <div style="position:relative; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:28px; height:28px; border-radius:9999px; background:rgba(16, 185, 129, 0.25); animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width:14px; height:14px; border-radius:9999px; background:#059669; border:2.5px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([userPos.latitude, userPos.longitude], { icon: agentIcon })
        .addTo(markerGroup);

      map.setView([userPos.latitude, userPos.longitude], 16, { animate: true });
    }
  }, [userPos, microarea, quarteirao]);

  return (
    <div className="w-full h-48 sm:h-56 relative rounded-lg overflow-hidden border border-slate-300 bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700 border border-slate-200 shadow-2xs pointer-events-none">
        Malha Territorial • Carmo - RJ
      </div>
    </div>
  );
}
