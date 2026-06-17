"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SubLocation } from "@/types";

interface Props { subLocation: SubLocation; destSlug: string; }

export default function SubLocationActions({ subLocation, destSlug }: Props) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${subLocation.name}" and all its content? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("sub_locations").delete().eq("id", subLocation.id);
    router.push(`/dashboard/destinations/${destSlug}`);
    router.refresh();
  }

  return (
    <div className="flex gap-2 flex-shrink-0">
      <Link
        href={`/dashboard/destinations/${destSlug}/sub-locations/${subLocation.slug}/edit`}
        className="border border-[#2a2010] hover:border-[#c9a84c40] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs transition-colors"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        className="border border-[#2a2010] hover:border-red-900/60 text-[#5a4a2a] hover:text-red-400 rounded-lg px-3 py-1.5 text-xs transition-colors"
      >
        Delete
      </button>
    </div>
  );
}
