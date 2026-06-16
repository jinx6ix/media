"use client";

import { useState } from "react";
import UploadModal from "./UploadModal";

interface TopBarAlbum {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  title: string;
  count: number;
  albums: TopBarAlbum[];
  albumId?: string;
}

export default function TopBar({ title, count, albums, albumId }: Props) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-20 bg-[#0d0d0d]/90 backdrop-blur border-b border-[#1e1a10] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#d4b870]">{title}</h1>
          <p className="text-xs text-[#5a4a2a] mt-0.5">
            {count} photo{count !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-[#c9a84c] hover:bg-[#e0bc60] text-[#0d0d0d] font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-1.5"
        >
          ↑ Upload
        </button>
      </div>

      {showUpload && (
        <UploadModal
          albums={albums}
          defaultAlbumId={albumId}
          onClose={() => setShowUpload(false)}
        />
      )}
    </>
  );
}
