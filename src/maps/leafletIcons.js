import L from 'leaflet';

export const MAP_TILE_STANDARD = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri'
};

export const MAP_TILE_SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri'
};

export function pinIcon(color, label, size = 28) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px)">
        <div style="min-width:${size}px;height:${size}px;padding:0 8px;border-radius:999px;background:${color};border:2px solid #0f172a;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:800;color:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.3);letter-spacing:0.02em;">
          ${label}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-1px"></div>
      </div>
    `,
    iconSize: [size + 16, size + 10],
    iconAnchor: [(size + 16) / 2, size + 8]
  });
}

export function youDotIcon(label = "Você") {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:16px;height:16px;border-radius:999px;background:#ffffff;border:3.5px solid #059669;box-shadow:0 0 0 5px rgba(5,150,105,0.35);"></div>
        <span style="margin-top:2px;background:#0f172a;color:#ffffff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${label}</span>
      </div>
    `,
    iconSize: [32, 36],
    iconAnchor: [16, 8]
  });
}

export function yellowSedanIcon(label = "Apoio Escada") {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="position:absolute;width:40px;height:40px;border-radius:999px;background:rgba(234,179,8,0.45);animation:pulseLive 1.6s ease-out infinite;"></div>
        <div style="width:32px;height:32px;border-radius:10px;background:#eab308;border:2px solid #0f172a;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,0.35);">
          🚖
        </div>
        <span style="margin-top:2px;background:#0f172a;color:#fef08a;font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.35);border:1px solid #eab308;">${label}</span>
      </div>
    `,
    iconSize: [40, 52],
    iconAnchor: [20, 16]
  });
}

// Alias de compatibilidade
export const ladderTruckIcon = yellowSedanIcon;
