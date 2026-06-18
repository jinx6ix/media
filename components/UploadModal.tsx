"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlacePicker, { type PlaceResult } from "@/components/PlacePicker";

interface SubLocation { id: string; name: string; slug: string; destination_id: string; }
interface Accommodation { id: string; name: string; sub_location_id: string; }
interface Album { id: string; name: string; slug: string; }

interface Props {
  albums: Album[];
  defaultAlbumId?: string;
  defaultSubLocationId?: string;
  onClose: () => void;
}

interface PendingFile {
  file: File;
  preview: string;
  name: string;
  isVideo: boolean;
  shotLat?: number;
  shotLng?: number;
  shotPlaceName?: string;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/mpeg"];

function isVideoFile(file: File) {
  return VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
}
function isImageFile(file: File) {
  return IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name);
}

async function extractExifGps(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer();
    const view = new DataView(buffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });

    if (view.getUint16(0) !== 0xFFD8) return null;

    let offset = 2;
    while (offset < buffer.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) {
        const length = view.getUint16(offset + 2);
        const exifData = new Uint8Array(buffer, offset + 4, length - 2);
        const ascii = decoder.decode(exifData.slice(0, 4));
        if (ascii !== "Exif") { offset += 2 + view.getUint16(offset + 2); continue; }

        const tiffOffset = 8;
        const littleEndian = exifData[tiffOffset] === 0x49;
        const getU16 = (o: number) => (littleEndian ? view.getUint16(offset + tiffOffset + o) : view.getUint16(offset + tiffOffset + o, false));
        const getU32 = (o: number) => (littleEndian ? view.getUint32(offset + tiffOffset + o) : view.getUint32(offset + tiffOffset + o, false));

        const ifdOffset = getU32(4);
        const numEntries = getU16(ifdOffset);
        const entries: Map<number, { tag: number; type: number; count: number; offset: number }> = new Map();

        for (let i = 0; i < numEntries; i++) {
          const entryOffset = ifdOffset + 2 + i * 12;
          const tag = getU16(entryOffset);
          const type = getU16(entryOffset + 2);
          const count = getU32(entryOffset + 4);
          const valOffset = entryOffset + 8;
          entries.set(tag, { tag, type, count, offset: valOffset });
        }

        const gpsIFDPointer = entries.get(0x8825)?.offset;
        if (!gpsIFDPointer) return null;

        const gpsNumEntries = getU16(gpsIFDPointer);
        const gpsEntries: Map<number, { data: number[]; ref: string }> = new Map();
        for (let i = 0; i < gpsNumEntries; i++) {
          const entryOffset = gpsIFDPointer + 2 + i * 12;
          const gpsTag = getU16(entryOffset);
          const data = [];
          for (let c = 0; c < 3; c++) {
            const n = getU32(entryOffset + 4 + c * 4);
            data.push(n);
          }
          const refTag = 0x0001;
          const refOffset = entryOffset + 4;
          const refArr = new Uint8Array(buffer, offset + tiffOffset + refOffset, 2);
          const ref = decoder.decode(refArr).replace(/\0/g, "");
          gpsEntries.set(gpsTag, { data, ref });
        }

        const latArr = gpsEntries.get(0x0002)?.data;
        const latRef = gpsEntries.get(0x0001)?.ref ?? "N";
        const lngArr = gpsEntries.get(0x0004)?.data;
        const lngRef = gpsEntries.get(0x0003)?.ref ?? "E";

        if (!latArr || !lngArr) return null;

        const lat = latArr[0] / latArr[1] + latArr[2] / (latArr[3] * 60) + latArr[4] / (latArr[5] * 3600);
        const lng = lngArr[0] / lngArr[1] + lngArr[2] / (lngArr[3] * 60) + lngArr[4] / (lngArr[5] * 3600);

        const finalLat = latRef === "S" ? -lat : lat;
        const finalLng = lngRef === "W" ? -lng : lng;

        if (isNaN(finalLat) || isNaN(finalLng) || Math.abs(finalLat) > 90 || Math.abs(finalLng) > 180) return null;
        return { lat: finalLat, lng: finalLng };
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      offset += 2 + view.getUint16(offset + 2);
    }
  } catch { /* ignore parse errors */ }
  return null;
}

export default function UploadModal({ albums, defaultAlbumId, defaultSubLocationId, onClose }: Props) {
  const router = useRouter();
  const [albumId, setAlbumId] = useState(defaultAlbumId ?? albums[0]?.id ?? "");
  const [subLocationId, setSubLocationId] = useState(defaultSubLocationId ?? "");
  const [accommodationId, setAccommodationId] = useState("");
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [place, setPlace] = useState<PlaceResult | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("sub_locations").select("id, name, slug, destination_id").order("name"),
      supabase.from("accommodations").select("id, name, sub_location_id").order("name"),
    ]).then(([{ data: sl }, { data: acc }]) => {
      setSubLocations(sl ?? []);
      setAccommodations(acc ?? []);
    });
  }, []);

  const filteredAccommodations = subLocationId
    ? accommodations.filter(a => a.sub_location_id === subLocationId)
    : [];

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => isImageFile(f) || isVideoFile(f)).slice(0, 20);

    arr.forEach(async (file) => {
      const base = { file, preview: "", name: file.name, isVideo: isVideoFile(file) };
      if (isImageFile(file)) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const preview = e.target?.result as string;
          const gps = await extractExifGps(file);
          setPending(prev => [...prev, { ...base, preview, shotLat: gps?.lat, shotLng: gps?.lng }]);
        };
        reader.readAsDataURL(file);
      } else {
        setPending(prev => [...prev, base]);
      }
    });
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeFile(idx: number) {
    setPending(prev => prev.filter((_, i) => i !== idx));
  }

  function applyPlaceToAll() {
    if (!place) return;
    setPending(prev => prev.map(p => ({
      ...p,
      shotLat: place.lat,
      shotLng: place.lng,
      shotPlaceName: place.formatted_address || place.name,
    })));
    setShowLocationPicker(false);
  }

  async function upload() {
    if (!pending.length || !albumId) return;
    setUploading(true);
    setError("");
    setProgress(0);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in"); setUploading(false); return; }

    const total = pending.length;
    let done = 0;

    for (const pf of pending) {
      const ext = pf.file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${albumId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const mediaType = pf.isVideo ? "video" : "image";

      setProgressLabel(`Uploading ${pf.name}…`);

      const { error: storageErr } = await supabase.storage
        .from("media-hub")
        .upload(path, pf.file, { cacheControl: "3600", upsert: false });

      if (storageErr) {
        setError(`Upload failed: ${storageErr.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("media-hub").getPublicUrl(path);

      const { data: mediaData, error: mediaErr } = await supabase
        .from("media")
        .insert({
          album_id: albumId,
          media_type: mediaType,
          storage_path: path,
          public_url: urlData.publicUrl,
          filename: pf.file.name,
          size_bytes: pf.file.size,
          uploaded_by: user.id,
          shot_lat: pf.shotLat ?? place?.lat ?? null,
          shot_lng: pf.shotLng ?? place?.lng ?? null,
          shot_place_name: pf.shotPlaceName ?? place?.formatted_address ?? null,
        })
        .select()
        .single();

      if (mediaErr || !mediaData) {
        setError(`DB error: ${mediaErr?.message}`);
        setUploading(false);
        return;
      }

      if (subLocationId) {
        const subLoc = subLocations.find(sl => sl.id === subLocationId);
        if (subLoc) {
          await supabase.from("destination_media").insert({
            media_id: mediaData.id,
            sub_location_id: subLocationId,
            destination_id: subLoc.destination_id,
            accommodation_id: accommodationId || null,
            media_type: mediaType,
            storage_path: path,
            public_url: urlData.publicUrl,
            filename: pf.file.name,
            size_bytes: pf.file.size,
            uploaded_by: user.id,
          });
        }
      }

      done++;
      setProgress(Math.round((done / total) * 100));
    }

    setProgressLabel("Done!");
    router.refresh();
    onClose();
  }

  const imageCount = pending.filter(p => !p.isVideo).length;
  const videoCount = pending.filter(p => p.isVideo).length;
  const hasLocation = place?.lat || pending.some(p => p.shotLat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#161616] border border-[#2a2010] rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1a10] flex-shrink-0">
          <h2 className="text-sm font-medium text-[#c9a84c]">Upload media</h2>
          <button onClick={onClose} className="text-[#5a4a2a] hover:text-[#a09070] transition-colors text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {albums.length > 1 && (
            <div>
              <label className="text-xs text-[#7a6a4a] block mb-1.5">Album</label>
              <select value={albumId} onChange={e => setAlbumId(e.target.value)} className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2 text-sm text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]">
                {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {subLocations.length > 0 && (
            <>
              <div>
                <label className="text-xs text-[#7a6a4a] block mb-1.5">Tag location (optional)</label>
                <select value={subLocationId} onChange={e => { setSubLocationId(e.target.value); setAccommodationId(""); }} className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2 text-sm text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]">
                  <option value="">— None —</option>
                  {subLocations.map(sl => <option key={sl.id} value={sl.id}>{sl.name}</option>)}
                </select>
              </div>

              {filteredAccommodations.length > 0 && (
                <div>
                  <label className="text-xs text-[#7a6a4a] block mb-1.5">Tag accommodation (optional)</label>
                  <select value={accommodationId} onChange={e => setAccommodationId(e.target.value)} className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2 text-sm text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]">
                    <option value="">— None —</option>
                    {filteredAccommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#7a6a4a]">Photo location</label>
              <button onClick={() => setShowLocationPicker(!showLocationPicker)} className="text-[10px] text-[#c9a84c] hover:text-[#e0bc60] transition-colors">
                {showLocationPicker ? "Hide map" : hasLocation ? "✎ Change location" : "+ Add on map"}
              </button>
            </div>

            {showLocationPicker && (
              <div className="space-y-2">
                <PlacePicker value={place} onChange={setPlace} />
                {place && (
                  <button onClick={applyPlaceToAll} className="text-xs text-[#c9a84c] hover:text-[#e0bc60] transition-colors">
                    Apply "{place.formatted_address || place.name}" to all photos
                  </button>
                )}
              </div>
            )}

            {!showLocationPicker && hasLocation && (
              <div className="text-xs text-[#5a4a2a] flex items-center gap-1.5">
                <span className="text-[#c9a84c]">📍</span>
                {place ? place.formatted_address : "GPS location embedded in photo"}
              </div>
            )}

            {!showLocationPicker && !hasLocation && (
              <p className="text-xs text-[#3a3020]">No location set — click "Add on map" or GPS will be extracted from EXIF if available</p>
            )}
          </div>

          <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => document.getElementById("file-input")?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-[#c9a84c60] bg-[#1a1500]" : "border-[#2a2010] hover:border-[#c9a84c40] hover:bg-[#1a1500]"}`}>
            <div className="text-3xl mb-2 opacity-60">📁</div>
            <p className="text-sm text-[#a09070]">Drop photos or videos here, or click to browse</p>
            <p className="text-xs text-[#5a4a2a] mt-1">Images: JPG, PNG, WEBP · Videos: MP4, MOV, WEBM</p>
            <input id="file-input" type="file" accept="image/*,video/*,.mp4,.mov,.webm,.avi" multiple className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />
          </div>

          {pending.length > 0 && (
            <div>
              <p className="text-xs text-[#5a4a2a] mb-2">
                {imageCount > 0 && `${imageCount} photo${imageCount !== 1 ? "s" : ""}`}
                {imageCount > 0 && videoCount > 0 && " · "}
                {videoCount > 0 && `${videoCount} video${videoCount !== 1 ? "s" : ""}`}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {pending.map((pf, i) => (
                  <div key={i} className="relative group aspect-square">
                    {pf.isVideo ? (
                      <div className="w-full h-full bg-[#1a1500] border border-[#2a2010] rounded-md flex items-center justify-center"><span className="text-xl">🎬</span></div>
                    ) : (
                      <img src={pf.preview} alt={pf.name} className="w-full h-full object-cover rounded-md" />
                    )}
                    {pf.shotLat && (
                      <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/70 text-[#c9a84c] px-1 rounded">📍</span>
                    )}
                    <button onClick={() => removeFile(i)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div>
              <div className="h-1 bg-[#1e1a10] rounded-full overflow-hidden">
                <div className="h-full bg-[#c9a84c] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-[#5a4a2a] mt-1.5">{progressLabel || `${progress}%`}</p>
            </div>
          )}

          {error && <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button onClick={upload} disabled={!pending.length || uploading || !albumId}
              className="flex-1 bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-40 disabled:cursor-not-allowed text-[#0d0d0d] font-medium rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2">
              {uploading ? <><span className="w-3.5 h-3.5 border-2 border-[#0d0d0d]/30 border-t-[#0d0d0d] rounded-full animate-spin" />Uploading…</> : `Upload ${pending.length > 0 ? pending.length + " file" + (pending.length !== 1 ? "s" : "") : ""}`}
            </button>
            <button onClick={onClose} className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-4 py-2.5 text-sm transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}