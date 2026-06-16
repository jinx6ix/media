"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Media } from "@/types";
import UploadModal from "./UploadModal";

interface MediaWithAlbum extends Media {
  albums?: { name: string; slug: string } | null;
}

interface Props {
  images: MediaWithAlbum[];   // kept as "images" prop name for compat
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
                  {/* Video play badge */}
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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.public_url}
                  alt={item.caption ?? item.filename}
                  className="w-full block transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none" />

            {/* Album badge */}
            {showAlbumBadge && item.albums && (
              <div className="absolute top-2 left-2 bg-black/60 text-[#c9a84c] text-[10px] px-2 py-0.5 rounded font-medium">
                {item.albums.name}
              </div>
            )}

            {/* Type badge for video */}
            {item.media_type === "video" && !showAlbumBadge && (
              <div className="absolute top-2 left-2 bg-black/60 text-[#c9a84c] text-[10px] px-2 py-0.5 rounded">
                VIDEO
              </div>
            )}

            {/* Delete button */}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMedia(item);
                }}
                disabled={deleting === item.id}
                className="absolute top-2 right-2 w-7 h-7 bg-black/70 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/80 flex items-center justify-center"
                title="Delete"
              >
                {deleting === item.id ? "…" : "×"}
              </button>
            )}

            {/* Caption on hover */}
            {item.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="text-xs text-[#f0e6c8] line-clamp-2 leading-relaxed">
                  {item.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.media_type === "video" ? (
              <video
                src={lightbox.public_url}
                controls
                autoPlay
                className="w-full max-h-[75vh] rounded-lg bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.public_url}
                alt={lightbox.caption ?? lightbox.filename}
                className="w-full max-h-[75vh] object-contain rounded-lg"
              />
            )}

            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-[#5a4a2a]">{lightbox.filename}</p>
                  {lightbox.media_type === "video" && (
                    <span className="text-[9px] bg-[#1e1800] border border-[#2a2010] text-[#c9a84c] rounded px-1 py-0.5">
                      VIDEO
                    </span>
                  )}
                </div>
                {lightbox.caption && (
                  <p className="text-sm text-[#a09070] leading-relaxed">
                    {lightbox.caption}
                  </p>
                )}
                {lightbox.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lightbox.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-[#1e1800] border border-[#2a2010] text-[#c9a84c] rounded px-1.5 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <a
                  href={lightbox.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open ↗
                </a>
                {!readOnly && (
                  <button
                    onClick={() => deleteMedia(lightbox)}
                    className="border border-red-900/40 text-red-400/60 hover:text-red-400 hover:border-red-900 rounded-lg px-3 py-1.5 text-xs transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setLightbox(null)}
                  className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs transition-colors"
                >
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
