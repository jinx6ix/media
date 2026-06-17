"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/mpeg"];

function isVideoFile(file: File) {
  return VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
}
function isImageFile(file: File) {
  return IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name);
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
    const arr = Array.from(files)
      .filter((f) => isImageFile(f) || isVideoFile(f))
      .slice(0, 20);

    arr.forEach((file) => {
      if (isImageFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPending((prev) => [
            ...prev,
            { file, preview: e.target?.result as string, name: file.name, isVideo: false },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setPending((prev) => [
          ...prev,
          { file, preview: "", name: file.name, isVideo: true },
        ]);
      }
    });
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeFile(idx: number) {
    setPending((prev) => prev.filter((_, i) => i !== idx));
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

  const imageCount = pending.filter((p) => !p.isVideo).length;
  const videoCount = pending.filter((p) => p.isVideo).length;

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
              <select value={albumId} onChange={(e) => setAlbumId(e.target.value)} className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2 text-sm text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]">
                {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {subLocations.length > 0 && (
            <>
              <div>
                <label className="text-xs text-[#7a6a4a] block mb-1.5">Tag location (optional)</label>
                <select value={subLocationId} onChange={(e) => { setSubLocationId(e.target.value); setAccommodationId(""); }} className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2 text-sm text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]">
                  <option value="">— None —</option>
                  {subLocations.map((sl) => <option key={sl.id} value={sl.id}>{sl.name}</option>)}
                </select>
              </div>

              {filteredAccommodations.length > 0 && (
                <div>
                  <label className="text-xs text-[#7a6a4a] block mb-1.5">Tag accommodation (optional)</label>
                  <select value={accommodationId} onChange={(e) => setAccommodationId(e.target.value)} className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2 text-sm text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]">
                    <option value="">— None —</option>
                    {filteredAccommodations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => document.getElementById("file-input")?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-[#c9a84c60] bg-[#1a1500]" : "border-[#2a2010] hover:border-[#c9a84c40] hover:bg-[#1a1500]"}`}>
            <div className="text-3xl mb-2 opacity-60">📁</div>
            <p className="text-sm text-[#a09070]">Drop photos or videos here, or click to browse</p>
            <p className="text-xs text-[#5a4a2a] mt-1">Images: JPG, PNG, WEBP · Videos: MP4, MOV, WEBM</p>
            <input id="file-input" type="file" accept="image/*,video/*,.mp4,.mov,.webm,.avi" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
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