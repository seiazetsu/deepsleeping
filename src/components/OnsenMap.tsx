// src/components/OnsenMap.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { OnsenLog } from "@/types/onsenLog";
import L from "leaflet";

type Props = {
  logs: OnsenLog[];
};

// Leaflet のデフォルトアイコン対策
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

// ★ ここを default export にする
export default function OnsenMap({ logs }: Props) {
  const points = logs.filter((log) => log.lat && log.lng);

  if (!points.length) {
    return <p>地図に表示できる座標付きデータがまだありません。</p>;
  }

  const first = points[0];

  return (
    <div style={{ height: "400px", width: "100%" }}>
      <MapContainer
        center={[first.lat as number, first.lng as number]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">
          OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((log) => (
          <Marker
            key={log.id}
            position={[log.lat as number, log.lng as number]}
          >
            <Popup>
              <div>
                <strong>{log.onsenName}</strong>
                <br />
                日付: {log.date}
                <br />
                スコア: {log.sleepScore}
                <br />
                評価: {log.rating ?? "-"}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
