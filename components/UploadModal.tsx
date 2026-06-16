"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UploadAlbum {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  albums: UploadAlbum[];
  defaultAlbumId?: string;
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

export default function UploadModal({ albums, defaultAlbumId, onClose }: Props) {
  const router = useRouter();
  const [albumId, setAlbumId] = useState(() => {
    const initial = defaultAlbumId ?? albums[0]?.id ?? "";
    console.log("[UploadModal] Initial albumId:", initial, { defaultAlbumId, firstAlbum: albums[0]?.id });
    return initial;
  });
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  console.log("[UploadModal] Render:", { albumId, pendingCount: pending.length, uploading });

  const addFiles = useCallback((files: FileList | File[]) => {
    const allFiles = Array.from(files);
    console.log("[UploadModal] addFiles called:", allFiles.map(f => ({ name: f.name, type: f.type })));

    const filtered = allFiles.filter((f) => isImageFile(f) || isVideoFile(f));
    console.log("[UploadModal] Filtered:", filtered.map(f => f.name));

    filtered.slice(0, 20).forEach((file) => {
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
    console.log("[UploadModal] Upload clicked!", { pending: pending.length, albumId, uploading });
    if (!pending.length || !albumId || uploading) {
      console.log("[UploadModal] Upload blocked");
      return;
    }

    setUploading(true);
    setError("");

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    console.log("[UploadModal] Session:", session ? "exists" : "null");

    const total = pending.length;
    let done = 0;

    for (const pf of pending) {
      const ext = pf.file.name.split(".").pop()?.toLowerCase() ?? (pf.isVideo ? "mp4" : "jpg");
      const path = `${albumId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("media-hub")
        .upload(path, pf.file, { cacheControl: "3600", upsert: false });

      if (storageErr) {
        setError(`Upload failed: ${storageErr.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("media-hub")
        .getPublicUrl(path);

      let caption: string | null = null;
      let tags: string[] = [];

      if (!pf.isVideo) {
        try {
          const capRes = await fetch("/api/caption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: urlData.publicUrl }),
          });
          if (capRes.ok) {
            const capData = await capRes.json();
            caption = capData.caption ?? null;
            tags = capData.tags ?? [];
          }
        } catch {}
      }

      await supabase.from("media").insert({
        album_id: albumId,
        storage_path: path,
        public_url: urlData.publicUrl,
        filename: pf.file.name,
        size_bytes: pf.file.size,
        caption,
        tags,
        media_type: pf.isVideo ? "video" : "image",
      });

      done++;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#161616] border border-[#2a2010] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1a10] sticky top-0 bg-[#161616]">
          <h2 className="text-sm font-medium text-[#c9a84c]">Upload media</h2>
          <button
            onClick={onClose}
            className="text-[#5a4a2a] hover:text-[#a09070] transition-colors text-lg leading-none p-1"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {albums.length > 1 && (
            <div>
              <label className="text-xs text-[#7a6a4a] block mb-1.5">
                Upload to album
              </label>
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2 text-sm text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]"
              >
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("file-input")?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-[#c9a84c60] bg-[#1a1500]"
                : "border-[#2a2010] hover:border-[#c9a84c40] hover:bg-[#1a1500]"
            }`}
          >
            <div className="text-3xl mb-2 text-[#c9a84c] opacity-60">⬆</div>
            <p className="text-sm text-[#a09070]">
              Drop photos or videos here, or click to browse
            </p>
            <p className="text-xs text-[#5a4a2a] mt-1">
              Images: JPG, PNG, WEBP · Videos: MP4, MOV, WEBM · Up to 20 files
            </p>
            <input
              id="file-input"
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {pending.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {pending.map((pf, i) => (
                <div key={i} className="relative group aspect-square bg-[#111] rounded-lg overflow-hidden">
                  {pf.isVideo ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                  ) : (
                    <img src={pf.preview} alt={pf.name} className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={upload}
              className="flex-1 bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-40 disabled:cursor-not-allowed text-[#0d0d0d] font-medium rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#0d0d0d]/30 border-t-[#0d0d0d] rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                `Upload ${pending.length} file${pending.length !== 1 ? "s" : ""}`
              )}
            </button>
            <button
              onClick={onClose}
              className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}