import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

interface Props { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createServiceClient();
  const { data } = await supabase.from("destinations").select("name,description").eq("share_token", token).single();
  if (!data) return { title: "Destination — JaeTravel Expeditions" };
  return {
    title: `${data.name} — JaeTravel Expeditions`,
    description: data.description ?? "Safari destination by JaeTravel Expeditions",
  };
}

export default async function PublicDestinationPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: dest } = await supabase.from("destinations").select("*").eq("share_token", token).eq("is_public", true).single();
  if (!dest) notFound();

  const { data: subLocs } = await supabase
    .from("sub_locations")
    .select(`*, accommodations(*), media_categories(*, destination_media(count))`)
    .eq("destination_id", dest.id)
    .order("name");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#1e1a10] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#c9a84c] rounded-md flex items-center justify-center text-[#0d0d0d] font-bold text-sm">J</div>
          <a href="https://jaetravel.co.ke" target="_blank" rel="noopener noreferrer"
            className="text-[#c9a84c] font-medium text-sm tracking-wide hover:text-[#e0bc60] transition-colors">
            JaeTravel Expeditions
          </a>
        </div>
        <a href="https://jaetravel.co.ke" target="_blank" rel="noopener noreferrer"
          className="text-xs text-[#5a4a2a] hover:text-[#c9a84c] transition-colors">jaetravel.co.ke ↗</a>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-2 text-xs text-[#5a4a2a]">{dest.country}</div>
        <h1 className="text-3xl font-medium text-[#d4b870]">{dest.name}</h1>
        {dest.description && <p className="text-base text-[#7a6a4a] mt-3 leading-relaxed max-w-2xl">{dest.description}</p>}

        <div className="mt-10 space-y-10">
          {subLocs?.map(sl => (
            <section key={sl.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#1e1800] border border-[#c9a84c30] flex items-center justify-center text-sm">📍</div>
                <div>
                  <h2 className="text-lg font-medium text-[#c9a84c]">{sl.name}</h2>
                  {sl.description && <p className="text-xs text-[#5a4a2a]">{sl.description}</p>}
                </div>
              </div>

              {/* Accommodations */}
              {sl.accommodations?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs text-[#5a4a2a] uppercase tracking-widest mb-3">Where to stay</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sl.accommodations.map((a: { id: string; name: string; type: string; description: string | null; website_url: string | null }) => (
                      <div key={a.id} className="bg-[#161616] border border-[#1e1a10] rounded-xl p-4">
                        <p className="text-sm font-medium text-[#d4b870]">{a.name}</p>
                        <span className="text-[10px] bg-[#1e1800] text-[#c9a84c] border border-[#c9a84c30] rounded px-1.5 py-0.5 mt-1 inline-block capitalize">
                          {a.type.replace("_", " ")}
                        </span>
                        {a.description && <p className="text-xs text-[#7a6a4a] mt-2 leading-relaxed">{a.description}</p>}
                        {a.website_url && (
                          <a href={a.website_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#c9a84c] hover:text-[#e0bc60] mt-2 inline-block transition-colors">
                            Visit website ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Media categories */}
              {sl.media_categories?.length > 0 && (
                <div>
                  <h3 className="text-xs text-[#5a4a2a] uppercase tracking-widest mb-3">Photo galleries</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sl.media_categories.map((cat: { id: string; slug: string; name: string; icon: string; description: string | null; destination_media: { count: number }[] }) => {
                      const count = cat.destination_media?.[0]?.count ?? 0;
                      return (
                        <Link
                          key={cat.id}
                          href={`/destinations/${token}/${sl.slug}?cat=${cat.slug}`}
                          className="group bg-[#161616] border border-[#1e1a10] hover:border-[#c9a84c30] rounded-xl p-4 transition-colors"
                        >
                          <div className="text-2xl mb-2">{cat.icon}</div>
                          <p className="text-sm font-medium text-[#d4b870] group-hover:text-[#e8ca80] transition-colors">{cat.name}</p>
                          {cat.description && <p className="text-xs text-[#7a6a4a] mt-1 line-clamp-2">{cat.description}</p>}
                          <p className="text-xs text-[#5a4a2a] mt-2">{count} photo{count !== 1 ? "s" : ""}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          ))}
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
