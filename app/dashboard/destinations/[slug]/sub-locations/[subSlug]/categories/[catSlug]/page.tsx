import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CategoryMediaGrid from "@/components/destinations/CategoryMediaGrid";

interface Props { params: Promise<{ slug: string; subSlug: string; catSlug: string }> }

export default async function CategoryPage({ params }: Props) {
  const { slug, subSlug, catSlug } = await params;
  const supabase = await createClient();

  const { data: dest } = await supabase.from("destinations").select("id,name,slug").eq("slug", slug).single();
  if (!dest) notFound();

  const { data: sl } = await supabase.from("sub_locations").select("id,name,slug,lat,lng,place_name").eq("destination_id", dest.id).eq("slug", subSlug).single();
  if (!sl) notFound();

  const { data: cat } = await supabase.from("media_categories").select("*").eq("sub_location_id", sl.id).eq("slug", catSlug).single();
  if (!cat) notFound();

  const { data: allCategories } = await supabase.from("media_categories").select("*").eq("sub_location_id", sl.id).order("name");

  // Fetch media in this category via junction table
  const { data: links } = await supabase
    .from("media_category_links")
    .select("media_id")
    .eq("category_id", cat.id);

  const mediaIds = links?.map(l => l.media_id) ?? [];

  let mediaItems: Record<string, unknown>[] = [];
  if (mediaIds.length > 0) {
    const { data: rawMedia } = await supabase
      .from("destination_media")
      .select("*")
      .in("id", mediaIds)
      .order("created_at", { ascending: false });

    if (rawMedia) {
      // Attach category links to each item
      const { data: allLinks } = await supabase
        .from("media_category_links")
        .select("media_id, category_id")
        .in("media_id", mediaIds);

      mediaItems = rawMedia.map(m => ({
        ...m,
        category_links: allLinks?.filter(l => l.media_id === m.id) ?? [],
      }));
    }
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-[#0d0d0d]/90 backdrop-blur border-b border-[#1e1a10] px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#5a4a2a] flex-wrap">
              <Link href="/dashboard/destinations" className="hover:text-[#c9a84c] transition-colors">Destinations</Link>
              <span>/</span>
              <Link href={`/dashboard/destinations/${slug}`} className="hover:text-[#c9a84c] transition-colors">{dest.name}</Link>
              <span>/</span>
              <Link href={`/dashboard/destinations/${slug}/sub-locations/${subSlug}`} className="hover:text-[#c9a84c] transition-colors">{sl.name}</Link>
              <span>/</span>
              <span className="text-[#a09070]">{cat.icon} {cat.name}</span>
            </div>
            {sl.place_name && (
              <p className="text-xs text-[#5a4a2a] mt-0.5 flex items-center gap-1">
                📍 {sl.place_name}
                {sl.lat && <span className="font-mono text-[#3a3020] ml-1">{(sl.lat as number).toFixed(4)}, {(sl.lng as number).toFixed(4)}</span>}
              </p>
            )}
          </div>
          <p className="text-xs text-[#5a4a2a] flex-shrink-0">{mediaItems.length} items</p>
        </div>
      </div>

      <div className="p-6">
        <CategoryMediaGrid
          mediaItems={mediaItems as Parameters<typeof CategoryMediaGrid>[0]["mediaItems"]}
          allCategories={allCategories ?? []}
          defaultCategoryId={cat.id}
          subLocationId={sl.id}
          destinationId={dest.id}
          destSlug={slug}
          subSlug={subSlug}
          catSlug={catSlug}
        />
      </div>
    </div>
  );
}
