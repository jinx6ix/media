"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface PlaceResult {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  formatted_address: string;
}

interface Props {
  value?: PlaceResult | null;
  onChange: (place: PlaceResult | null) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks: (() => void)[] = [];

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (mapsLoaded) { resolve(); return; }
    mapsCallbacks.push(resolve);
    if (mapsLoading) return;
    mapsLoading = true;
    window.initGoogleMaps = () => {
      mapsLoaded = true;
      mapsCallbacks.forEach(cb => cb());
      mapsCallbacks.length = 0;
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    document.head.appendChild(script);
  });
}

export default function PlacePicker({ value, onChange, placeholder = "Search for a place…" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);
  const [inputVal, setInputVal] = useState(value?.name ?? "");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

  const initMap = useCallback((lat: number, lng: number) => {
    if (!mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 13,
      styles: DARK_MAP_STYLE,
      disableDefaultUI: true,
      zoomControl: true,
    });
    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#c9a84c",
        fillOpacity: 1,
        strokeColor: "#0d0d0d",
        strokeWeight: 2,
      },
    });

    // Allow clicking map to move pin
    mapInstanceRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat(), lng = e.latLng.lng();
      markerRef.current?.setPosition({ lat, lng });
      // Reverse geocode
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const r = results[0];
          onChange({
            place_id: r.place_id,
            name: r.formatted_address,
            lat, lng,
            formatted_address: r.formatted_address,
          });
          setInputVal(r.formatted_address);
        }
      });
    });
  }, [onChange]);

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey).then(() => setReady(true));
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !inputRef.current) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["place_id", "name", "formatted_address", "geometry"],
    });
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current!.getPlace();
      if (!place.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const result: PlaceResult = {
        place_id: place.place_id ?? "",
        name: place.name ?? place.formatted_address ?? "",
        lat, lng,
        formatted_address: place.formatted_address ?? "",
      };
      onChange(result);
      setInputVal(result.name);
      // Update or init map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat, lng });
        markerRef.current?.setPosition({ lat, lng });
      } else {
        setTimeout(() => initMap(lat, lng), 0);
      }
    });
  }, [ready, onChange, initMap]);

  // Init map with existing value
  useEffect(() => {
    if (!ready || !value?.lat) return;
    setTimeout(() => initMap(value.lat, value.lng), 0);
  }, [ready, value, initMap]);

  const handleClear = () => {
    onChange(null);
    setInputVal("");
    if (mapInstanceRef.current) {
      markerRef.current?.setMap(null);
      mapInstanceRef.current = null;
    }
  };

  if (!apiKey) {
    return (
      <div className="bg-[#111] border border-[#2a2010] rounded-lg px-3 py-3 text-xs text-[#5a4a2a]">
        Add <span className="font-mono text-[#c9a84c]">NEXT_PUBLIC_GOOGLE_MAPS_KEY</span> to .env.local to enable place search
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors pr-8"
        />
        {value && (
          <button onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a4a2a] hover:text-[#a09070] text-sm">
            ×
          </button>
        )}
      </div>

      {value && (
        <div className="text-xs text-[#5a4a2a] flex items-center gap-1.5">
          <span className="text-[#c9a84c]">📍</span>
          <span className="font-mono">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>
          <span>· {value.formatted_address}</span>
        </div>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        className={`w-full rounded-lg overflow-hidden border border-[#2a2010] transition-all ${value?.lat ? "h-48" : "h-0"}`}
      />

      {!ready && apiKey && (
        <p className="text-xs text-[#5a4a2a]">Loading maps…</p>
      )}
    </div>
  );
}

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a0a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#c9a84c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2010" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#111" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3010" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1a0d" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1a2010" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8a6d27" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2a2010" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#5a4a2a" }] },
];
