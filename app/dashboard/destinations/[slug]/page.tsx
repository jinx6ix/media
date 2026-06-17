import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DestinationHeader from "@/components/destinations/DestinationHeader";

interface Props { params: Promise<{ slug: string }> }

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: dest } = await supabase
    .from("destinations").select("*").eq("slug", slug).single();
  if (!dest) notFound();

  const { data: subLocs } = await supabase
    .from("sub_locations")
    .select(`*, accommodations(count), media_categories(count)`)
    .eq("destination_id", dest.id)
    .order("name");

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/destinations/${dest.share_token}`;

  return (
    <div className="min-h-screen">
      <DestinationHeader destination={dest} shareUrl={shareUrl} subCount={subLocs?.length ?? 0} />

      <div className="p-6 max-w-4xl">
        {/* Sub-locations */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#a09070]">Sub-locations</h2>
          <Link
            href={`/dashboard/destinations/${slug}/sub-locations/new`}
            className="text-xs border border-[#2a2010] hover:border-[#c9a84c40] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-3 py-1.5 transition-colors"
          >
            + Add sub-location
          </Link>
        </div>

        {!subLocs?.length ? (
          <div className="border border-dashed border-[#2a2010] rounded-xl p-10 text-center">
            <div className="text-4xl mb-3 opacity-30">📍</div>
            <p className="text-[#5a4a2a] text-sm mb-3">No sub-locations yet</p>
            <Link
              href={`/dashboard/destinations/${slug}/sub-locations/new`}
              className="text-xs text-[#c9a84c] hover:text-[#e0bc60] transition-colors"
            >
              Add the first sub-location →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {subLocs.map((sl) => {
              const accomCount = (sl.accommodations as unknown as { count: number }[])?.[0]?.count ?? 0;
              const catCount   = (sl.media_categories as unknown as { count: number }[])?.[0]?.count ?? 0;
              return (
                <Link
                  key={sl.id}
                  href={`/dashboard/destinations/${slug}/sub-locations/${sl.slug}`}
                  className="group flex items-center justify-between bg-[#161616] border border-[#1e1a10] hover:border-[#c9a84c30] rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {sl.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sl.cover_url} alt={sl.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#1a1500] border border-[#2a2010] flex items-center justify-center text-xl flex-shrink-0">
                        📍
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-[#d4b870] group-hover:text-[#e8ca80] transition-colors">{sl.name}</h3>
                      {sl.description && (
                        <p className="text-xs text-[#7a6a4a] mt-0.5 truncate max-w-sm">{sl.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-5 flex-shrink-0 ml-4">
                    <div className="text-center">
                      <p className="text-xs text-[#c9a84c]">{accomCount}</p>
                      <p className="text-[10px] text-[#5a4a2a]">places</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#c9a84c]">{catCount}</p>
                      <p className="text-[10px] text-[#5a4a2a]">categories</p>
                    </div>
                    <span className="text-[#3a3020] group-hover:text-[#c9a84c] transition-colors">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
