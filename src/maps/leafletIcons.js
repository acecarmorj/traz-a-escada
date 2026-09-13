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

export function ladderTruckIcon(label = "Escada") {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:38px;height:38px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="position:absolute;width:38px;height:38px;border-radius:999px;background:rgba(37,99,235,0.3);animation:pulseLive 1.6s ease-out infinite;"></div>
        <div style="width:30px;height:30px;border-radius:8px;background:#1e3a8a;border:2px solid #3b82f6;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,0.35);">
          🚚
        </div>
        <span style="margin-top:2px;background:#0f172a;color:#ffffff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${label}</span>
      </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [19, 15]
  });
}
