// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeoResult = {
  lat: number;
  lng: number;
};

export async function POST(req: NextRequest) {
  try {
    const { onsenName } = await req.json();

    if (!onsenName || typeof onsenName !== "string") {
      return NextResponse.json(
        { error: "onsenName is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEOCODING_API_KEY;
    if (!apiKey) {
      console.error("GEOCODING_API_KEY is not set");
      return NextResponse.json(
        { error: "geocoding_api_key_not_set" },
        { status: 500 }
      );
    }

    // 温泉名 + 日本 でジオコード
    const address = encodeURIComponent(`${onsenName} 温泉 日本`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text();
      console.error("Geocoding HTTP error", res.status, text);
      return NextResponse.json(
        { error: "geocoding_http_error" },
        { status: 502 }
      );
    }

    const json = await res.json() as {
      results: Array<{
        geometry: { location: { lat: number; lng: number } };
      }>;
      status: string;
    };

    if (json.status !== "OK" || !json.results?.length) {
      console.warn("Geocoding no result", json.status);
      return NextResponse.json(
        { error: "no_result" },
        { status: 404 }
      );
    }

    const loc = json.results[0].geometry.location;
    const body: GeoResult = { lat: loc.lat, lng: loc.lng };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("Geocode route error", err);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }
}
