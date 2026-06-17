"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import clsx from "clsx";

const input = "w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors";

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-"); }

export default function EditSubLocationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const subSlug = params.subSlug as string;
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "details";

  const [sl, setSl] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const [accomName, setAccomName] = useState("");
  const [accomType, setAccomType] = useState("lodge");
  const [accomDesc, setAccomDesc] = useState("");
  const [accomWeb, setAccomWeb] = useState("");
  const [accommodations, setAccommodations] = useState<{ id:string; name:string; type:string; description:string|null; website_url:string|null }[]>([]);

  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catIcon, setCatIcon] = useState("📷");
  const [categories, setCategories] = useState<{ id:string; name:string; icon:string; description:string|null }[]>([]);

  useEffect(() => {
    if (!slug || !subSlug) return;
    const supabase = createClient();
    supabase.from("destinations").select("id").eq("slug", slug).single()
      .then(({ data: dest }) => {
        if (!dest) return;
        return supabase.from("sub_locations").select("*").eq("destination_id", dest.id).eq("slug", subSlug).single();
      })
      .then(({ data: s }) => {
        if (!s) return;
        setSl(s); setName(s.name); setDesc(s.description ?? "");
        return Promise.all([
          supabase.from("accommodations").select("*").eq("sub_location_id", s.id).order("name"),
          supabase.from("media_categories").select("*").eq("sub_location_id", s.id).order("name"),
        ]);
      })
      .then(([{ data: acc }, { data: cats }]) => {
        setAccommodations(acc ?? []); setCategories(cats ?? []);
      });
  }, [slug, subSlug]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault(); if (!sl) return;
    setLoading(true); setError("");
    const newSlug = slugify(name);
    const supabase = createClient();
    const { error: err } = await supabase.from("sub_locations").update({ name: name.trim(), slug: newSlug, description: desc.trim() || null }).eq("id", sl.id);
    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/dashboard/destinations/${slug}/sub-locations/${newSlug}`);
    router.refresh();
  }

  async function addAccommodation(e: React.FormEvent) {
    e.preventDefault(); if (!sl) return;
    const supabase = createClient();
    await supabase.from("accommodations").insert({ sub_location_id: sl.id, name: accomName, type: accomType, description: accomDesc || null, website_url: accomWeb || null });
    setAccomName(""); setAccomType("lodge"); setAccomDesc(""); setAccomWeb("");
    const { data: acc } = await supabase.from("accommodations").select("*").eq("sub_location_id", sl.id).order("name");
    setAccommodations(acc ?? []);
  }

  async function deleteAccommodation(id: string) {
    if (!confirm("Delete?")) return;
    const supabase = createClient();
    await supabase.from("accommodations").delete().eq("id", id);
    setAccommodations(prev => prev.filter(a => a.id !== id));
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault(); if (!sl) return;
    const supabase = createClient();
    const catSlug = slugify(catName);
    await supabase.from("media_categories").insert({ sub_location_id: sl.id, name: catName, slug: catSlug, description: catDesc || null, icon: catIcon });
    setCatName(""); setCatDesc(""); setCatIcon("📷");
    const { data: cats } = await supabase.from("media_categories").select("*").eq("sub_location_id", sl.id).order("name");
    setCategories(cats ?? []);
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete?")) return;
    const supabase = createClient();
    await supabase.from("media_categories").delete().eq("id", id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  const tabs = [
    { id: "details", label: "Details" },
    { id: "accommodations", label: `Accommodations (${accommodations.length})` },
    { id: "categories", label: `Categories (${categories.length})` },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-xs text-[#5a4a2a] hover:text-[#c9a84c] mb-4">← Back</button>
      <h1 className="text-lg font-medium text-[#c9a84c] mb-4">Edit: {sl?.name ?? "..."}</h1>

      <div className="flex gap-1 border-b border-[#1e1a10] mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={clsx("px-4 py-2 text-sm border-b-2 -mb-px transition-colors", tab === t.id ? "border-[#c9a84c] text-[#c9a84c]" : "border-transparent text-[#5a4a2a]")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <form onSubmit={saveDetails} className="space-y-4">
          <div>
            <label className="text-xs text-[#7a6a4a] block mb-1.5">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={input} required />
          </div>
          <div>
            <label className="text-xs text-[#7a6a4a] block mb-1.5">Slug</label>
            <input type="text" value={slugify(name)} readOnly className={input + " opacity-60"} />
          </div>
          <div>
            <label className="text-xs text-[#7a6a4a] block mb-1.5">Description</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className={input} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-50 text-[#0d0d0d] font-medium rounded-lg py-2.5 text-sm px-6">{loading ? "Saving..." : "Save"}</button>
        </form>
      )}

      {tab === "accommodations" && (
        <div className="space-y-4">
          <form onSubmit={addAccommodation} className="bg-[#161616] border border-[#2a2010] rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-[#d4b870]">Add accommodation</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={accomName} onChange={e => setAccomName(e.target.value)} placeholder="Name" className={input} required />
              <select value={accomType} onChange={e => setAccomType(e.target.value)} className={input}>
                {["lodge","camp","hotel","tented_camp","bandas","homestay","other"].map(t => <option key={t} value={t}>{t.replace("_"," ")}</option>)}
              </select>
            </div>
            <input type="text" value={accomDesc} onChange={e => setAccomDesc(e.target.value)} placeholder="Description" className={input} />
            <input type="url" value={accomWeb} onChange={e => setAccomWeb(e.target.value)} placeholder="Website URL" className={input} />
            <button type="submit" className="bg-[#c9a84c] hover:bg-[#e0bc60] text-[#0d0d0d] font-medium rounded-lg py-2 text-sm px-4">Add</button>
          </form>
          <div className="space-y-2">
            {accommodations.map(a => (
              <div key={a.id} className="bg-[#161616] border border-[#2a2010] rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#d4b870]">{a.name}</p>
                  <p className="text-xs text-[#5a4a2a]">{a.type}</p>
                </div>
                <div className="flex gap-3">
                  {a.website_url && <a href={a.website_url} target="_blank" rel="noopener" className="text-xs text-[#c9a84c]">↗</a>}
                  <button onClick={() => deleteAccommodation(a.id)} className="text-xs text-red-400">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "categories" && (
        <div className="space-y-4">
          <form onSubmit={addCategory} className="bg-[#161616] border border-[#2a2010] rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-[#d4b870]">Add category</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Name" className={input} required />
              <input type="text" value={catIcon} onChange={e => setCatIcon(e.target.value)} placeholder="Icon" className={input} />
            </div>
            <input type="text" value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Description" className={input} />
            <button type="submit" className="bg-[#c9a84c] hover:bg-[#e0bc60] text-[#0d0d0d] font-medium rounded-lg py-2 text-sm px-4">Add</button>
          </form>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <div key={c.id} className="bg-[#161616] border border-[#2a2010] rounded-lg px-3 py-2 flex items-center gap-2">
                <span>{c.icon}</span>
                <span className="text-sm text-[#d4b870]">{c.name}</span>
                <button onClick={() => deleteCategory(c.id)} className="text-xs text-red-400 ml-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}