import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SubLocationActions from "@/components/destinations/SubLocationActions";
import AccommodationCard from "@/components/destinations/AccommodationCard";
import { ACCOMMODATION_TYPES } from "@/types";

interface Props { params: Promise<{ slug: string; subSlug: string }> }

export default async function SubLocationPage({ params }: Props) {
  const { slug, subSlug } = await params;
  const supabase = await createClient();

  const { data: dest } = await supabase.from("destinations").select("id,name,slug").eq("slug", slug).single();
  if (!dest) notFound();

  const { data: sl } = await supabase
    .from("sub_locations").select("*").eq("destination_id", dest.id).eq("slug", subSlug).single();
  if (!sl) notFound();

  const [{ data: accommodations }, { data: categories }] = await Promise.all([
    supabase.from("accommodations").select("*").eq("sub_location_id", sl.id).order("name"),
    supabase.from("media_categories")
      .select(`*, destination_media(count)`)
      .eq("sub_location_id", sl.id).order("name"),
  ]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0d0d0d]/90 backdrop-blur border-b border-[#1e1a10] px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#5a4a2a] flex-wrap">
              <Link href="/dashboard/destinations" className="hover:text-[#c9a84c] transition-colors">Destinations</Link>
              <span>/</span>
              <Link href={`/dashboard/destinations/${slug}`} className="hover:text-[#c9a84c] transition-colors">{dest.name}</Link>
              <span>/</span>
              <span className="text-[#a09070]">{sl.name}</span>
            </div>
            {sl.description && <p className="text-xs text-[#5a4a2a] mt-1 truncate max-w-lg">{sl.description}</p>}
          </div>
          <SubLocationActions subLocation={sl} destSlug={slug} />
        </div>
      </div>

      <div className="p-6 max-w-4xl space-y-8">
        {/* Accommodations section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#a09070]">Accommodations</h2>
            <Link
              href={`/dashboard/destinations/${slug}/sub-locations/${subSlug}/edit?tab=accommodation`}
              className="text-xs border border-[#2a2010] hover:border-[#c9a84c40] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 transition-colors"
            >
              + Add accommodation
            </Link>
          </div>

          {!accommodations?.length ? (
            <div className="border border-dashed border-[#2a2010] rounded-xl p-6 text-center">
              <p className="text-[#5a4a2a] text-sm">No accommodations yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {accommodations.map((a) => (
                <AccommodationCard
                  key={a.id}
                  accommodation={a}
                  destSlug={slug}
                  subSlug={subSlug}
                  typLabel={ACCOMMODATION_TYPES.find(t => t.value === a.type)?.label ?? a.type}
                />
              ))}
            </div>
          )}
        </section>

        {/* Media categories section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#a09070]">Media categories</h2>
            <Link
              href={`/dashboard/destinations/${slug}/sub-locations/${subSlug}/edit?tab=category`}
              className="text-xs border border-[#2a2010] hover:border-[#c9a84c40] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 transition-colors"
            >
              + Add category
            </Link>
          </div>

          {!categories?.length ? (
            <div className="border border-dashed border-[#2a2010] rounded-xl p-6 text-center">
              <p className="text-[#5a4a2a] text-sm">No media categories yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const mediaCount = (cat.destination_media as unknown as { count: number }[])?.[0]?.count ?? 0;
                return (
                  <Link
                    key={cat.id}
                    href={`/dashboard/destinations/${slug}/sub-locations/${subSlug}/categories/${cat.slug}`}
                    className="group bg-[#161616] border border-[#1e1a10] hover:border-[#c9a84c30] rounded-xl p-4 transition-colors"
                  >
                    <div className="text-3xl mb-2">{cat.icon}</div>
                    <h3 className="text-sm font-medium text-[#d4b870] group-hover:text-[#e8ca80] transition-colors">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-[#7a6a4a] mt-0.5 line-clamp-2">{cat.description}</p>
                    )}
                    <p className="text-xs text-[#5a4a2a] mt-2">{mediaCount} item{mediaCount !== 1 ? "s" : ""}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
