"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UploadModal from "./UploadModal";
import type { Album } from "@/types";

interface Props {
  album: Album;
  shareUrl: string;
  imageCount: number;
}

export default function AlbumTopBar({ album, shareUrl, imageCount }: Props) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [isPublic, setIsPublic] = useState(album.is_public);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function togglePublic() {
    setToggling(true);
    const supabase = createClient();
    const next = !isPublic;
    await supabase.from("albums").update({ is_public: next }).eq("id", album.id);
    setIsPublic(next);
    setToggling(false);
    router.refresh();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function deleteAlbum() {
    if (
      !confirm(
        `Delete album "${album.name}" and all its photos? This cannot be undone.`
      )
    )
      return;
    const supabase = createClient();
    // Delete images from storage first
    const { data: images } = await supabase
      .from("images")
      .select("storage_path")
      .eq("album_id", album.id);

    if (images?.length) {
      await supabase.storage
        .from("media-hub")
        .remove(images.map((i) => i.storage_path));
    }

    await supabase.from("albums").delete().eq("id", album.id);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <div className="sticky top-0 z-20 bg-[#0d0d0d]/90 backdrop-blur border-b border-[#1e1a10] px-6 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-medium text-[#d4b870] truncate">
                {album.name}
              </h1>
              <span
                className={`text-[9px] font-medium rounded px-1.5 py-0.5 border flex-shrink-0 ${
                  isPublic
                    ? "bg-[#c9a84c20] text-[#c9a84c] border-[#c9a84c40]"
                    : "bg-[#1e1a10] text-[#5a4a2a] border-[#2a2010]"
                }`}
              >
                {isPublic ? "PUBLIC" : "PRIVATE"}
              </span>
            </div>
            <p className="text-xs text-[#5a4a2a] mt-0.5">
              {imageCount} photo{imageCount !== 1 ? "s" : ""}
              {album.description ? ` · ${album.description}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Public toggle */}
            <button
              onClick={togglePublic}
              disabled={toggling}
              className="border border-[#2a2010] hover:border-[#c9a84c40] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5"
              title={isPublic ? "Make private" : "Make public"}
            >
              {isPublic ? "🔓 Public" : "🔒 Private"}
            </button>

            {/* Share link — only when public */}
            {isPublic && (
              <button
                onClick={copyLink}
                className="border border-[#c9a84c40] text-[#c9a84c] hover:bg-[#c9a84c10] rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5"
              >
                {copied ? "✓ Copied!" : "⎘ Share link"}
              </button>
            )}

            {/* Upload */}
            <button
              onClick={() => setShowUpload(true)}
              className="bg-[#c9a84c] hover:bg-[#e0bc60] text-[#0d0d0d] font-medium rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1"
            >
              ↑ Upload
            </button>

            {/* Delete */}
            <button
              onClick={deleteAlbum}
              className="border border-[#2a2010] hover:border-red-900/60 text-[#5a4a2a] hover:text-red-400 rounded-lg px-3 py-1.5 text-xs transition-colors"
              title="Delete album"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Share URL bar (when public) */}
        {isPublic && (
          <div className="mt-2.5 flex items-center gap-2 bg-[#111] border border-[#2a2010] rounded-lg px-3 py-1.5 max-w-xl">
            <span className="text-[10px] text-[#5a4a2a] flex-shrink-0">Share:</span>
            <span className="text-xs text-[#c9a84c80] truncate flex-1 font-mono">
              {shareUrl}
            </span>
            <button
              onClick={copyLink}
              className="text-[10px] text-[#c9a84c] hover:text-[#e0bc60] flex-shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Embed hint */}
        {isPublic && (
          <div className="mt-2 text-[10px] text-[#3a3020]">
            API:{" "}
            <span className="font-mono text-[#5a4a2a]">
              GET /api/albums/{album.slug}/images
            </span>
            {" — embed on jaetravel.co.ke"}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          albums={[{ id: album.id, name: album.name, slug: album.slug }]}
          defaultAlbumId={album.id}
          onClose={() => setShowUpload(false)}
        />
      )}
    </>
  );
}
