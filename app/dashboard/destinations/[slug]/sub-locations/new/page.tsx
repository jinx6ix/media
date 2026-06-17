"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlacePicker, { type PlaceResult } from "@/components/PlacePicker";

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-");
}
const input = "w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors";

export default function NewSubLocationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [destId, setDestId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from("destinations").select("id").eq("slug", slug).single()
      .then(({ data }) => { if (data) setDestId(data.id); });
  }, [slug]);

  const subSlug = slugify(name);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!destId || !name.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("sub_locations")
      .insert({ destination_id: destId, name, slug: subSlug, description: description || null })
      .select()
      .single();

    if (err || !data) {
      setError(err?.message ?? "Failed to create");
      setLoading(false);
      return;
    }

    router.push(`/dashboard/destinations/${slug}/sub-locations`);
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <button onClick={() => router.back()} className="text-xs text-[#5a4a2a] hover:text-[#c9a84c] mb-4">← Back</button>
      <h1 className="text-lg font-medium text-[#c9a84c] mb-6">New sub-destination</h1>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Mara Triangle" className={input} required />
        </div>
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Slug</label>
          <input type="text" value={subSlug} readOnly className={input + " opacity-60"} />
        </div>
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" className={input} />
        </div>
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Location (optional)</label>
          <PlacePicker value={place} onChange={setPlace} />
        </div>
        {error && <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-50 text-[#0d0d0d] font-medium rounded-lg py-2.5 text-sm">
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}