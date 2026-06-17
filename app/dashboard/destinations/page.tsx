import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DestinationsPage() {
  const supabase = await createClient();

  const { data: destinations } = await supabase
    .from("destinations")
    .select(`
      *,
      sub_locations ( count )
    `)
    .order("name");

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-[#d4b870]">Destinations</h1>
          <p className="text-xs text-[#5a4a2a] mt-1">
            {destinations?.length ?? 0} destination{destinations?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/destinations/new"
          className="bg-[#c9a84c] hover:bg-[#e0bc60] text-[#0d0d0d] font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          + New destination
        </Link>
      </div>

      {!destinations?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[#2a2010] rounded-xl">
          <div className="text-5xl mb-4 opacity-30">🗺️</div>
          <p className="text-[#5a4a2a] text-sm mb-4">No destinations yet</p>
          <Link
            href="/dashboard/destinations/new"
            className="border border-[#2a2010] hover:border-[#c9a84c40] text-[#a09070] hover:text-[#c9a84c] rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Add your first destination
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {destinations.map((d) => {
            const subCount = (d.sub_locations as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <Link
                key={d.id}
                href={`/dashboard/destinations/${d.slug}`}
                className="group flex items-center justify-between bg-[#161616] border border-[#1e1a10] hover:border-[#c9a84c30] rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {d.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.cover_url}
                      alt={d.name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#1a1500] border border-[#2a2010] flex items-center justify-center text-2xl flex-shrink-0">
                      🗺️
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-medium text-[#d4b870] group-hover:text-[#e8ca80] transition-colors">
                        {d.name}
                      </h2>
                      {d.is_public && (
                        <span className="text-[9px] bg-[#c9a84c20] text-[#c9a84c] border border-[#c9a84c40] rounded px-1.5 py-0.5">
                          PUBLIC
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5a4a2a] mt-0.5">{d.country}</p>
                    {d.description && (
                      <p className="text-xs text-[#7a6a4a] mt-1 truncate max-w-md">
                        {d.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-[#c9a84c]">{subCount}</p>
                    <p className="text-[10px] text-[#5a4a2a]">sub-location{subCount !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-[#3a3020] group-hover:text-[#c9a84c] transition-colors">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
