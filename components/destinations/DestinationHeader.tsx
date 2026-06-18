"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Destination } from "@/types";

interface Props {
  destination: Destination;
  shareUrl: string;
  subCount: number;
}

export default function DestinationHeader({ destination, shareUrl, subCount }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${destination.name}" and everything inside it? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("destinations").delete().eq("id", destination.id);
    router.push("/dashboard/destinations");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-20 bg-[#0d0d0d]/90 backdrop-blur border-b border-[#1e1a10] px-6 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#5a4a2a]">
              <Link href="/dashboard/destinations" className="hover:text-[#c9a84c] transition-colors">Destinations</Link>
              {" /"}
            </span>
            <h1 className="text-base font-medium text-[#d4b870] truncate">{destination.name}</h1>
            <span className="text-xs text-[#5a4a2a]">{destination.country}</span>
          </div>
          <p className="text-xs text-[#5a4a2a] mt-0.5">{subCount} sub-location{subCount !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <button onClick={copyLink}
            className="border border-[#c9a84c40] text-[#c9a84c] hover:bg-[#c9a84c10] rounded-lg px-3 py-1.5 text-xs transition-colors">
            {copied ? "✓ Copied!" : "⎘ Share link"}
          </button>

          <Link href={`/dashboard/destinations/${destination.slug}/edit`}
            className="border border-[#2a2010] hover:border-[#c9a84c40] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs transition-colors">
            Edit
          </Link>

          <button onClick={handleDelete}
            className="border border-[#2a2010] hover:border-red-900/60 text-[#5a4a2a] hover:text-red-400 rounded-lg px-3 py-1.5 text-xs transition-colors">
            Delete
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 bg-[#111] border border-[#2a2010] rounded-lg px-3 py-1.5 max-w-xl">
        <span className="text-[10px] text-[#5a4a2a] flex-shrink-0">Share:</span>
        <span className="text-xs text-[#c9a84c80] truncate flex-1 font-mono">{shareUrl}</span>
        <button onClick={copyLink} className="text-[10px] text-[#c9a84c] hover:text-[#e0bc60] flex-shrink-0">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}