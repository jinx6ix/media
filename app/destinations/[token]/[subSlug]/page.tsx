import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ token: string; subSlug: string }>;
  searchParams: Promise<{ cat?: string }>;
}

export default async function PublicSubLocationPage({ params, searchParams }: Props) {
  const { token, subSlug } = await params;
  const { cat: catSlug } = await searchParams;
  const supabase = await createServiceClient();

  const { data: dest } = await supabase.from("destinations").select("*").eq("share_token", token).single();
  if (!dest) notFound();

  const { data: sl } = await supabase.from("sub_locations").select("*").eq("destination_id", dest.id).eq("slug", subSlug).single();
  if (!sl) notFound();

  const { data: categories } = await supabase.from("media_categories").select("*").eq("sub_location_id", sl.id).order("name");

  const activeCategory = catSlug
    ? categories?.find(c => c.slug === catSlug) ?? categories?.[0]
    : categories?.[0];

  let mediaQuery = supabase.from("destination_media").select("*").eq("sub_location_id", sl.id).order("created_at", { ascending: false });
  if (activeCategory) mediaQuery = mediaQuery.eq("category_id", activeCategory.id);
  const { data: mediaItems } = await mediaQuery;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#1e1a10] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#c9a84c] rounded-md flex items-center justify-center text-[#0d0d0d] font-bold text-sm">J</div>
          <Link href={`/destinations/${token}`} className="text-[#c9a84c] font-medium text-sm tracking-wide hover:text-[#e0bc60] transition-colors">
            {dest.name}
          </Link>
        </div>
        <a href="https://jaetravel.co.ke" target="_blank" rel="noopener noreferrer"
          className="text-xs text-[#5a4a2a] hover:text-[#c9a84c] transition-colors">jaetravel.co.ke ↗</a>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-1 text-xs text-[#5a4a2a]">
          <Link href={`/destinations/${token}`} className="hover:text-[#c9a84c] transition-colors">{dest.name}</Link>
          {" / "}
        </div>
        <h1 className="text-2xl font-medium text-[#d4b870]">{sl.name}</h1>
        {sl.description && <p className="text-sm text-[#7a6a4a] mt-2">{sl.description}</p>}

        {/* Category tabs */}
        {categories && categories.length > 1 && (
          <div className="flex gap-2 mt-6 flex-wrap">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/destinations/${token}/${subSlug}?cat=${cat.slug}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory?.id === cat.id
                    ? "bg-[#c9a84c] text-[#0d0d0d]"
                    : "bg-[#161616] border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] hover:border-[#c9a84c30]"
                }`}
              >
                <span>{cat.icon}</span> {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Media grid */}
        <div className="mt-6">
          {!mediaItems?.length ? (
            <div className="text-center py-16 text-[#5a4a2a] text-sm">No photos in this category yet</div>
          ) : (
            <div className="masonry-grid">
              {mediaItems.map(item => (
                <div key={item.id} className="masonry-item group relative">
                  <div className="overflow-hidden rounded-lg bg-[#161616]">
                    {item.media_type === "video" ? (
                      <video src={item.public_url} className="w-full block" preload="metadata" controls playsInline />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.public_url} alt={item.caption ?? item.filename}
                        className="w-full block transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    )}
                  </div>
                  {(item.caption || item.description) && (
                    <div className="mt-2 px-1">
                      {item.caption && <p className="text-xs text-[#c9a84c] font-medium leading-relaxed">{item.caption}</p>}
                      {item.description && <p className="text-xs text-[#7a6a4a] mt-1 leading-relaxed">{item.description}</p>}
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.tags.map((t: string) => (
                            <span key={t} className="text-[9px] bg-[#1e1800] border border-[#2a2010] text-[#c9a84c] rounded px-1.5 py-0.5">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-[#1e1a10] px-6 py-6 text-center mt-12">
        <p className="text-xs text-[#3a3020]">© JaeTravel Expeditions ·{" "}
          <a href="https://jaetravel.co.ke" target="_blank" rel="noopener noreferrer"
            className="text-[#5a4a2a] hover:text-[#c9a84c] transition-colors">jaetravel.co.ke</a>
        </p>
      </footer>
    </div>
  );
}
