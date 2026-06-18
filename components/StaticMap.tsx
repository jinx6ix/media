"use client";

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  label?: string;
}

export default function StaticMap({ lat, lng, zoom = 12, width = 400, height = 180, label }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    return (
      <div className="w-full h-full bg-[#111] border border-[#2a2010] rounded-lg flex items-center justify-center text-xs text-[#5a4a2a]">
        Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to .env.local
      </div>
    );
  }

  const marker = label
    ? `markers=color:0xC9A84C|size:large|${lat},${lng}`
    : `markers=color:0xC9A84C|${lat},${lng}`;

  const src = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&${marker}&key=${apiKey}&style=feature:all|element:geometry|color:0x1a1a0a&style=feature:water|color:0x0d1a0d&style=feature:road|element:geometry|color:0x2a2010&style=feature:poi|element:labels.text.fill|color:0x8a6d27&maptype=hybrid`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Map showing ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
      width={width}
      height={height}
      className="rounded-lg border border-[#2a2010] w-full object-cover"
    />
  );
}