"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function NewDestinationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Kenya");
  const [description, setDescription] = useState("");
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

    const { data, error: dbErr } = await supabase
      .from("destinations")
      .insert({ name: name.trim(), slug, country: country.trim(), description: description.trim() || null, is_public: true, created_by: user?.id })
      .select().single();

    if (dbErr) { setError(dbErr.message); setLoading(false); return; }
    router.push(`/dashboard/destinations/${data.slug}`);
    router.refresh();
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-[#c9a84c]">New destination</h1>
        <p className="text-sm text-[#5a4a2a] mt-1">Add a top-level safari destination</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        <Field label="Destination name *">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Masai Mara" required className={input} />
          {slug && <p className="text-xs text-[#5a4a2a] mt-1">Slug: <span className="text-[#c9a84c80] font-mono">{slug}</span></p>}
        </Field>

        <Field label="Country">
          <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Kenya" className={input} />
        </Field>

        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief overview of this destination…" rows={4} className={`${input} resize-none`} />
        </Field>

        {error && <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading || !name.trim()}
            className="bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-40 text-[#0d0d0d] font-medium rounded-lg px-5 py-2.5 text-sm transition-colors flex items-center gap-2">
            {loading ? <><span className="w-3.5 h-3.5 border-2 border-[#0d0d0d]/30 border-t-[#0d0d0d] rounded-full animate-spin" />Creating…</> : "Create destination"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-5 py-2.5 text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const input = "w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-[#7a6a4a] block mb-1.5">{label}</label>
      {children}
    </div>
  );
}