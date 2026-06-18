"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function NewAlbumPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slug = slugify(name);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error: dbError } = await supabase
      .from("albums")
      .insert({
        name: name.trim(),
        slug,
        description: desc.trim() || null,
        created_by: user?.id,
      })
      .select()
      .single();

    if (dbError || !data) {
      setError(dbError?.message ?? "Failed to create");
      setLoading(false);
      return;
    }

    router.push(`/dashboard/albums/${data.slug}`);
    router.refresh();
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-[#c9a84c]">Create album</h1>
        <p className="text-sm text-[#5a4a2a] mt-1">Organise photos into a collection</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">
            Album name <span className="text-[#c9a84c]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Masai Mara October 2026"
            required
            className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors"
          />
          {slug && (
            <p className="text-xs text-[#5a4a2a] mt-1">
              URL slug: <span className="text-[#c9a84c80]">{slug}</span>
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optional short description…"
            rows={3}
            className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-40 text-[#0d0d0d] font-medium rounded-lg py-2.5 px-6 text-sm"
          >
            {loading ? "Creating…" : "Create album"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-[#2a2010] text-[#a09070] rounded-lg py-2.5 px-6 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}