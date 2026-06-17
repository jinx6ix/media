"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MediaCategory } from "@/types";
import PlacePicker, { type PlaceResult } from "@/components/PlacePicker";
import clsx from "clsx";

interface MediaWithCats {
  id: string;
  sub_location_id: string;
  destination_id: string;
  media_type: "image" | "video";
  storage_path: string;
  public_url: string;
  filename: string;
  caption: string | null;
  description: string | null;
  tags: string[];
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  shot_lat?: number | null;
  shot_lng?: number | null;
  shot_place_id?: string | null;
  shot_place_name?: string | null;
  category_links?: { category_id: string }[];
}

interface Props {
  mediaItems: MediaWithCats[];
  allCategories: MediaCategory[];    // all categories for this sub-location
  defaultCategoryId: string;         // the category page we're on
  subLocationId: string;
  destinationId: string;
  destSlug: string;
  subSlug: string;
  catSlug: string;
}

const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO_EXTS = /\.(mp4|mov|webm|avi|mkv)$/i;

export default function CategoryMediaGrid({
  mediaItems: initial,
  allCategories,
  defaultCategoryId,
  subLocationId,
  destinationId,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<MediaWithCats[]>(initial);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState("");
  const [lightbox, setLightbox] = useState<MediaWithCats | null>(null);
  const [editing, setEditing] = useState<MediaWithCats | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);
  const [editShotPlace, setEditShotPlace] = useState<PlaceResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Upload state for shot location
  const [uploadShotPlace, setUploadShotPlace] = useState<PlaceResult | null>(null);
  const [uploadCategoryIds, setUploadCategoryIds] = useState<string[]>([defaultCategoryId]);
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f =>
      IMAGE_EXTS.test(f.name) || VIDEO_EXTS.test(f.name)
    ).slice(0, 20);
    if (!arr.length) return;

    setUploading(true); setUploadProgress(0);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const total = arr.length;
    let done = 0;

    for (const file of arr) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const isVideo = VIDEO_EXTS.test(file.name);
      const path = `destinations/${destinationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setUploadLabel(`Uploading ${file.name}…`);
      await supabase.storage.from("media-hub").upload(path, file, { cacheControl: "3600", upsert: false });
      const { data: urlData } = supabase.storage.from("media-hub").getPublicUrl(path);

      // AI caption
      let caption: string | null = null;
      let tags: string[] = [];
      if (!isVideo) {
        setUploadLabel(`Captioning ${file.name}…`);
        try {
          const res = await fetch("/api/caption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: urlData.publicUrl, mediaType: "image" }),
          });
          if (res.ok) { const d = await res.json(); caption = d.caption; tags = d.tags ?? []; }
        } catch {}
      }

      // Insert media row (no category_id column now)
      const { data: newItem } = await supabase.from("destination_media")
        .insert({
          sub_location_id: subLocationId,
          destination_id: destinationId,
          media_type: isVideo ? "video" : "image",
          storage_path: path,
          public_url: urlData.publicUrl,
          filename: file.name,
          size_bytes: file.size,
          caption,
          tags,
          uploaded_by: user?.id,
          shot_lat: uploadShotPlace?.lat ?? null,
          shot_lng: uploadShotPlace?.lng ?? null,
          shot_place_id: uploadShotPlace?.place_id ?? null,
          shot_place_name: uploadShotPlace?.formatted_address ?? null,
        })
        .select().single();

      if (newItem) {
        // Link to selected categories
        const catIds = uploadCategoryIds.length ? uploadCategoryIds : [defaultCategoryId];
        await supabase.from("media_category_links").insert(
          catIds.map(cid => ({ media_id: newItem.id, category_id: cid }))
        );
        setItems(prev => [{ ...newItem, category_links: catIds.map(cid => ({ category_id: cid })) }, ...prev]);
      }

      done++;
      setUploadProgress(Math.round((done / total) * 100));
    }

    setUploading(false);
    router.refresh();
  }

  async function deleteItem(item: MediaWithCats) {
    if (!confirm(`Delete "${item.filename}"?`)) return;
    const supabase = createClient();
    await supabase.storage.from("media-hub").remove([item.storage_path]);
    await supabase.from("destination_media").delete().eq("id", item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
    if (lightbox?.id === item.id) setLightbox(null);
  }

  function openEdit(item: MediaWithCats) {
    setEditing(item);
    setEditCaption(item.caption ?? "");
    setEditDesc((item as MediaWithCats & { description: string }).description ?? "");
    setEditTags((item.tags ?? []).join(", "));
    setEditCategoryIds(item.category_links?.map(l => l.category_id) ?? [defaultCategoryId]);
    setEditShotPlace(item.shot_lat ? {
      lat: item.shot_lat, lng: item.shot_lng!,
      place_id: item.shot_place_id ?? "",
      name: item.shot_place_name ?? "",
      formatted_address: item.shot_place_name ?? "",
    } : null);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    const tags = editTags.split(",").map(t => t.trim()).filter(Boolean);

    const { data: updated } = await supabase.from("destination_media")
      .update({
        caption: editCaption.trim() || null,
        description: editDesc.trim() || null,
        tags,
        shot_lat: editShotPlace?.lat ?? null,
        shot_lng: editShotPlace?.lng ?? null,
        shot_place_id: editShotPlace?.place_id ?? null,
        shot_place_name: editShotPlace?.formatted_address ?? null,
      })
      .eq("id", editing.id).select().single();

    // Re-sync category links
    await supabase.from("media_category_links").delete().eq("media_id", editing.id);
    if (editCategoryIds.length) {
      await supabase.from("media_category_links").insert(
        editCategoryIds.map(cid => ({ media_id: editing.id, category_id: cid }))
      );
    }

    if (updated) {
      setItems(prev => prev.map(i => i.id === updated.id
        ? { ...updated, category_links: editCategoryIds.map(cid => ({ category_id: cid })) }
        : i
      ));
    }
    setSaving(false);
    setEditing(null);
  }

  function toggleCat(id: string, arr: string[], set: (v: string[]) => void) {
    set(arr.includes(id) ? arr.filter(c => c !== id) : [...arr, id]);
  }

  const inField = "w-full bg-[#0d0d0d] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors";

  return (
    <>
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !showUploadOptions && document.getElementById("cat-file-input")?.click()}
        className={`border-2 border-dashed rounded-xl p-6 mb-4 transition-colors ${
          dragging ? "border-[#c9a84c60] bg-[#1a1500]" : "border-[#2a2010] hover:border-[#c9a84c40] hover:bg-[#1a1500]"
        } ${showUploadOptions ? "cursor-default" : "cursor-pointer"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl mb-1 opacity-50">📁</div>
            <p className="text-sm text-[#a09070]">Drop photos or videos here, or click to browse</p>
            <p className="text-xs text-[#5a4a2a] mt-0.5">AI captions generated automatically</p>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setShowUploadOptions(v => !v); }}
            className={clsx("text-xs border rounded-lg px-3 py-1.5 transition-colors flex-shrink-0",
              showUploadOptions
                ? "border-[#c9a84c40] text-[#c9a84c] bg-[#c9a84c10]"
                : "border-[#2a2010] text-[#a09070] hover:text-[#c9a84c]"
            )}
          >
            ⚙ Options
          </button>
        </div>

        {showUploadOptions && (
          <div className="mt-4 space-y-3 border-t border-[#2a2010] pt-4" onClick={e => e.stopPropagation()}>
            {/* Category selection */}
            <div>
              <p className="text-xs text-[#7a6a4a] mb-2">Add to categories</p>
              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => (
                  <button key={cat.id} type="button"
                    onClick={() => toggleCat(cat.id, uploadCategoryIds, setUploadCategoryIds)}
                    className={clsx("text-xs rounded-lg px-2.5 py-1 border transition-colors flex items-center gap-1",
                      uploadCategoryIds.includes(cat.id)
                        ? "bg-[#c9a84c] text-[#0d0d0d] border-[#c9a84c]"
                        : "border-[#2a2010] text-[#a09070] hover:border-[#c9a84c40]"
                    )}>
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Shot location */}
            <div>
              <p className="text-xs text-[#7a6a4a] mb-2">📍 Where was this taken? (optional)</p>
              <PlacePicker
                value={uploadShotPlace}
                onChange={setUploadShotPlace}
                placeholder="Specific spot within the sub-location…"
              />
            </div>

            <button
              type="button"
              onClick={() => document.getElementById("cat-file-input")?.click()}
              className="bg-[#c9a84c] hover:bg-[#e0bc60] text-[#0d0d0d] font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Choose files
            </button>
          </div>
        )}
      </div>

      <input id="cat-file-input" type="file" accept="image/*,video/*" multiple className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)} />

      {uploading && (
        <div className="mb-4">
          <div className="h-1 bg-[#1e1a10] rounded-full overflow-hidden">
            <div className="h-full bg-[#c9a84c] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-xs text-[#5a4a2a] mt-1.5">{uploadLabel || `${uploadProgress}%`}</p>
        </div>
      )}

      {/* Grid */}
      {!items.length ? (
        <div className="text-center py-16 text-[#5a4a2a] text-sm">No media yet — upload some above</div>
      ) : (
        <div className="masonry-grid">
          {items.map(item => (
            <div key={item.id} className="masonry-item group relative">
              <div className="overflow-hidden rounded-lg bg-[#161616] cursor-pointer" onClick={() => setLightbox(item)}>
                {item.media_type === "video" ? (
                  <div className="relative">
                    <video src={item.public_url} className="w-full block" preload="metadata" muted playsInline
                      onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                      onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 bg-black/60 rounded-full flex items-center justify-center group-hover:bg-[#c9a84c]/80 transition-colors">
                        <span className="text-white text-xs ml-0.5">▶</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.public_url} alt={item.caption ?? item.filename}
                    className="w-full block transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                )}
              </div>

              <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none" />

              {/* Shot location badge */}
              {item.shot_place_name && (
                <div className="absolute top-2 left-2 bg-black/70 text-[#c9a84c] text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[60%] truncate">
                  📍 <span className="truncate">{item.shot_place_name}</span>
                </div>
              )}

              {/* Multi-category badges */}
              {item.category_links && item.category_links.length > 1 && (
                <div className="absolute bottom-8 left-2 bg-black/70 text-[#c9a84c] text-[9px] px-1.5 py-0.5 rounded">
                  {item.category_links.length} categories
                </div>
              )}

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                  className="w-7 h-7 bg-black/70 text-[#c9a84c] rounded-full text-xs flex items-center justify-center hover:bg-[#c9a84c] hover:text-[#0d0d0d] transition-colors"
                  title="Edit">✎</button>
                <button onClick={e => { e.stopPropagation(); deleteItem(item); }}
                  className="w-7 h-7 bg-black/70 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-900/80 transition-colors"
                  title="Delete">×</button>
              </div>

              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-xs text-[#f0e6c8] line-clamp-2 leading-relaxed">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {lightbox.media_type === "video"
              ? <video src={lightbox.public_url} controls autoPlay className="w-full max-h-[60vh] rounded-lg bg-black" />
              : <img src={lightbox.public_url} alt={lightbox.caption ?? lightbox.filename} className="w-full max-h-[60vh] object-contain rounded-lg" /> // eslint-disable-line @next/next/no-img-element
            }
            <div className="mt-3 flex items-start gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                {lightbox.shot_place_name && (
                  <p className="text-xs text-[#c9a84c] flex items-center gap-1">
                    📍 {lightbox.shot_place_name}
                    {lightbox.shot_lat && (
                      <span className="text-[#5a4a2a] font-mono ml-1">
                        {lightbox.shot_lat.toFixed(4)}, {lightbox.shot_lng?.toFixed(4)}
                      </span>
                    )}
                  </p>
                )}
                {lightbox.caption && <p className="text-sm text-[#d4b870] font-medium leading-relaxed">{lightbox.caption}</p>}
                {(lightbox as MediaWithCats & { description: string }).description && (
                  <p className="text-sm text-[#a09070] leading-relaxed">{(lightbox as MediaWithCats & { description: string }).description}</p>
                )}
                {lightbox.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lightbox.tags.map(t => (
                      <span key={t} className="text-[10px] bg-[#1e1800] border border-[#2a2010] text-[#c9a84c] rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
                {lightbox.category_links && lightbox.category_links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lightbox.category_links.map(link => {
                      const cat = allCategories.find(c => c.id === link.category_id);
                      return cat ? (
                        <span key={cat.id} className="text-[10px] bg-[#1e1800] border border-[#2a2010] text-[#a09070] rounded px-1.5 py-0.5">
                          {cat.icon} {cat.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => { setLightbox(null); openEdit(lightbox); }}
                  className="border border-[#c9a84c40] text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs hover:bg-[#c9a84c10] transition-colors">
                  Edit
                </button>
                <button onClick={() => setLightbox(null)}
                  className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 text-xs transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#2a2010] rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1a10] flex-shrink-0">
              <h2 className="text-sm font-medium text-[#c9a84c]">Edit media</h2>
              <button onClick={() => setEditing(null)} className="text-[#5a4a2a] hover:text-[#a09070] text-lg leading-none">×</button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {editing.media_type === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editing.public_url} alt={editing.filename} className="w-full h-36 object-cover rounded-lg" />
              )}

              {/* Categories */}
              <div>
                <label className="text-xs text-[#7a6a4a] block mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map(cat => (
                    <button key={cat.id} type="button"
                      onClick={() => toggleCat(cat.id, editCategoryIds, setEditCategoryIds)}
                      className={clsx("text-xs rounded-lg px-2.5 py-1 border transition-colors",
                        editCategoryIds.includes(cat.id)
                          ? "bg-[#c9a84c] text-[#0d0d0d] border-[#c9a84c]"
                          : "border-[#2a2010] text-[#a09070] hover:border-[#c9a84c40]"
                      )}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shot location */}
              <div>
                <label className="text-xs text-[#7a6a4a] block mb-1.5">📍 Where was this taken?</label>
                <PlacePicker value={editShotPlace} onChange={setEditShotPlace} placeholder="Specific spot within the sub-location…" />
              </div>

              <div>
                <label className="text-xs text-[#7a6a4a] block mb-1.5">Caption</label>
                <input type="text" value={editCaption} onChange={e => setEditCaption(e.target.value)}
                  placeholder="Short caption…" className={inField} />
              </div>
              <div>
                <label className="text-xs text-[#7a6a4a] block mb-1.5">Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  placeholder="Longer story or notes…" rows={3} className={`${inField} resize-none`} />
              </div>
              <div>
                <label className="text-xs text-[#7a6a4a] block mb-1.5">Tags (comma-separated)</label>
                <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)}
                  placeholder="flamingo, lake, dawn" className={inField} />
              </div>

              <div className="flex gap-3">
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-40 text-[#0d0d0d] font-medium rounded-lg py-2.5 text-sm transition-colors">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditing(null)}
                  className="border border-[#2a2010] text-[#a09070] rounded-lg px-4 py-2.5 text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inField = "w-full bg-[#0d0d0d] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors";
