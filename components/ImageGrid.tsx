"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Media } from "@/types";
import UploadModal from "./UploadModal";

interface MediaWithAlbum extends Media {
  albums?: { name: string; slug: string } | null;
}

interface SubLocation { id: string; name: string; slug: string; destination_id: string; }
interface Accommodation { id: string; name: string; sub_location_id: string; }
interface ExistingTag { sub_location_id: string; accommodation_id: string | null; }

interface Props {
  images: MediaWithAlbum[];
  albumId?: string;
  showAlbumBadge?: boolean;
  allowUpload?: boolean;
  readOnly?: boolean;
}

export default function ImageGrid({
  images: mediaItems,
  albumId,
  showAlbumBadge,
  readOnly,
}: Props) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<MediaWithAlbum | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [taggingSubLocId, setTaggingSubLocId] = useState("");
  const [taggingAccomId, setTaggingAccomId] = useState("");
  const [existingTags, setExistingTags] = useState<ExistingTag[]>([]);
  const [savingTag, setSavingTag] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("sub_locations").select("id, name, slug, destination_id").order("name"),
      supabase.from("accommodations").select("id, name, sub_location_id").order("name"),
      supabase.from("destination_media").select("sub_location_id, accommodation_id").eq("media_id", lightbox.id),
    ]).then(([{ data: sl }, { data: acc }, { data: tags }]) => {
      setSubLocations(sl ?? []);
      setAccommodations(acc ?? []);
      if (tags && tags.length > 0) {
        setExistingTags(tags);
        setTaggingSubLocId(tags[0].sub_location_id);
        setTaggingAccomId(tags[0].accommodation_id ?? "");
      } else {
        setExistingTags([]);
        setTaggingSubLocId("");
        setTaggingAccomId("");
      }
    });
  }, [lightbox]);

  const filteredAccommodations = taggingSubLocId
    ? accommodations.filter(a => a.sub_location_id === taggingSubLocId)
    : [];

  async function saveTag() {
    if (!lightbox || !taggingSubLocId) return;
    setSavingTag(true);
    const supabase = createClient();
    const subLoc = subLocations.find(sl => sl.id === taggingSubLocId);

    await supabase.from("destination_media").delete().eq("media_id", lightbox.id);
    await supabase.from("destination_media").insert({
      media_id: lightbox.id,
      sub_location_id: taggingSubLocId,
      destination_id: subLoc?.destination_id ?? "",
      accommodation_id: taggingAccomId || null,
      media_type: lightbox.media_type,
      storage_path: lightbox.storage_path,
      public_url: lightbox.public_url,
      filename: lightbox.filename,
      size_bytes: lightbox.size_bytes ?? null,
    });

    setExistingTags([{ sub_location_id: taggingSubLocId, accommodation_id: taggingAccomId || null }]);
    setSavingTag(false);
    router.refresh();
  }

  async function removeTag() {
    if (!lightbox) return;
    const supabase = createClient();
    await supabase.from("destination_media").delete().eq("media_id", lightbox.id);
    setExistingTags([]);
    setTaggingSubLocId("");
    setTaggingAccomId("");
    router.refresh();
  }

  async function deleteMedia(item: MediaWithAlbum) {
    if (!confirm(`Delete "${item.filename}"? This cannot be undone.`)) return;
    setDeleting(item.id);
    const supabase = createClient();
    await supabase.storage.from("media-hub").remove([item.storage_path]);
    await supabase.from("media").delete().eq("id", item.id);
    setLightbox(null);
    router.refresh();
    setDeleting(null);
  }

  if (!mediaItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4 opacity-20">📷</div>
        <p className="text-[#5a4a2a] text-sm">No media yet</p>
        {!readOnly && (
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 border border-[#2a2010] hover:border-[#c9a84c40] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Upload the first photo or video
          </button>
        )}
        {showUpload && albumId && (
          <UploadModal
            albums={[{ id: albumId, name: "Album", slug: "" }]}
            defaultAlbumId={albumId}
            onClose={() => setShowUpload(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="masonry-grid">
        {mediaItems.map((item) => (
          <div key={item.id} className="masonry-item group relative">
            <div
              className="overflow-hidden rounded-lg bg-[#161616] cursor-pointer"
              onClick={() => setLightbox(item)}
            >
              {item.media_type === "video" ? (
                <div className="relative">
                  <video
                    src={item.public_url}
                    className="w-full block"
                    preload="metadata"
                    muted
                    playsInline
                    onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                      const v = e.currentTarget as HTMLVideoElement;
                      v.pause();
                      v.currentTime = 0;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center group-hover:bg-[#c9a84c]/80 transition-colors">
                      <span className="text-white text-sm ml-0.5">▶</span>
                    </div>
                  </div>
                  {item.duration_sec && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {Math.floor(item.duration_sec / 60)}:{String(item.duration_sec % 60).padStart(2, "0")}
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={item.public_url}
                  alt={item.caption ?? item.filename}
                  className="w-full block transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              )}
            </div>

            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none" />

            {showAlbumBadge && item.albums && (
              <div className="absolute top-2 left-2 bg-black/60 text-[#c9a84c] text-[10px] px-2 py-0.5 rounded font-medium">
                {item.albums.name}
              </div>
            )}

            {item.media_type === "video" && !showAlbumBadge && (
              <div className="absolute top-2 left-2 bg-black/60 text-[#c9a84c] text-[10px] px-2 py-0.5 rounded">VIDEO</div>
            )}

            {!readOnly && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteMedia(item); }}
                disabled={deleting === item.id}
                className="absolute top-2 right-2 w-7 h-7 bg-black/70 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/80 flex items-center justify-center"
                title="Delete"
              >
                {deleting === item.id ? "…" : "×"}
              </button>
            )}

            {item.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="text-xs text-[#f0e6c8] line-clamp-2 leading-relaxed">{item.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {lightbox.media_type === "video" ? (
              <video src={lightbox.public_url} controls autoPlay className="w-full max-h-[60vh] rounded-lg bg-black" />
            ) : (
              <img src={lightbox.public_url} alt={lightbox.caption ?? lightbox.filename} className="w-full max-h-[60vh] object-contain rounded-lg" />
            )}

            <div className="mt-3 flex items-start gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <p className="text-xs text-[#5a4a2a]">{lightbox.filename}</p>

                {!readOnly && (
                  <div className="bg-[#161616] border border-[#2a2010] rounded-lg p-3 space-y-2">
                    <p className="text-xs text-[#7a6a4a]">Tag this image</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#5a4a2a] block mb-1">Location</label>
                        <select value={taggingSubLocId} onChange={(e) => { setTaggingSubLocId(e.target.value); setTaggingAccomId(""); }}
                          className="w-full bg-[#111] border border-[#2a2010] rounded px-2 py-1.5 text-xs text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]">
                          <option value="">— None —</option>
                          {subLocations.map(sl => <option key={sl.id} value={sl.id}>{sl.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#5a4a2a] block mb-1">Accommodation</label>
                        <select value={taggingAccomId} onChange={(e) => setTaggingAccomId(e.target.value)}
                          className="w-full bg-[#111] border border-[#2a2010] rounded px-2 py-1.5 text-xs text-[#f0e6c8] focus:outline-none focus:border-[#c9a84c]" disabled={!taggingSubLocId}>
                          <option value="">— None —</option>
                          {filteredAccommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveTag} disabled={!taggingSubLocId || savingTag}
                        className="bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-40 text-[#0d0d0d] font-medium rounded px-3 py-1 text-xs">
                        {savingTag ? "Saving…" : existingTags.length > 0 ? "Update tag" : "Save tag"}
                      </button>
                      {existingTags.length > 0 && (
                        <button onClick={removeTag} className="border border-[#2a2010] text-[#5a4a2a] hover:text-red-400 rounded px-3 py-1 text-xs">
                          Remove tag
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {existingTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {existingTags.map((t, i) => {
                      const sl = subLocations.find(s => s.id === t.sub_location_id);
                      const acc = accommodations.find(a => a.id === t.accommodation_id);
                      return (
                        <span key={i} className="text-[10px] bg-[#1e1800] border border-[#2a2010] text-[#c9a84c] rounded px-2 py-0.5">
                          📍 {sl?.name ?? "?"}{acc ? ` · ${acc.name}` : ""}
                        </span>
                      );
                    })}
                  </div>
                )}

                {lightbox.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lightbox.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-[#1e1800] border border-[#2a2010] text-[#c9a84c] rounded px-1.5 py-0.5">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <a href={lightbox.public_url} target="_blank" rel="noopener noreferrer"
                  className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs transition-colors">
                  Open ↗
                </a>
                {!readOnly && (
                  <button onClick={() => deleteMedia(lightbox)}
                    className="border border-red-900/40 text-red-400/60 hover:text-red-400 hover:border-red-900 rounded-lg px-3 py-1.5 text-xs transition-colors">
                    Delete
                  </button>
                )}
                <button onClick={() => setLightbox(null)}
                  className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}