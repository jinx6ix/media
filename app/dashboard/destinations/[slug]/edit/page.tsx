"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

const input = "w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors";

export default function EditDestinationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Kenya");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from("destinations").select("*").eq("slug", slug).single()
      .then(({ data }) => {
        if (data) { setId(data.id); setName(data.name); setCountry(data.country); setDescription(data.description ?? ""); }
        setFetching(false);
      });
  }, [slug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const newSlug = slugify(name);
    const supabase = createClient();
    const { error: dbErr } = await supabase.from("destinations")
      .update({ name: name.trim(), slug: newSlug, country: country.trim(), description: description.trim() || null })
      .eq("id", id);
    if (dbErr) { setError(dbErr.message); setLoading(false); return; }
    router.push(`/dashboard/destinations/${newSlug}`);
    router.refresh();
  }

  if (fetching) return <div className="p-6 text-sm text-[#5a4a2a]">Loading…</div>;

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-medium text-[#c9a84c] mb-6">Edit destination</h1>
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Destination name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className={input} />
        </div>
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Country</label>
          <input type="text" value={country} onChange={e => setCountry(e.target.value)} className={input} />
        </div>
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Slug</label>
          <input type="text" value={slugify(name)} readOnly className={input + " opacity-60"} />
        </div>
        <div>
          <label className="text-xs text-[#7a6a4a] block mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className={input + " resize-none"} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-50 text-[#0d0d0d] font-medium rounded-lg py-2.5 px-6 text-sm">{loading ? "Saving..." : "Save changes"}</button>
          <button type="button" onClick={() => router.back()} className="border border-[#2a2010] text-[#a09070] rounded-lg py-2.5 px-6 text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}