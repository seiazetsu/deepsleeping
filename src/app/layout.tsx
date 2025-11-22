// src/app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "DeepSleeping",
  description: "温泉と睡眠のゆるい記録アプリ DeepSleeping",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
