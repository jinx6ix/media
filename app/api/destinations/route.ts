import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("destinations")
    .select("id, name, slug, country, description, cover_url, share_token, created_at, sub_locations(count)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map(d => ({
      id: d.id, name: d.name, slug: d.slug, country: d.country,
      description: d.description, cover_url: d.cover_url,
      sub_location_count: (d.sub_locations as unknown as { count: number }[])?.[0]?.count ?? 0,
      created_at: d.created_at,
    })),
    { headers: { "Access-Control-Allow-Origin": "https://jaetravel.co.ke", "Cache-Control": "public, s-maxage=60" } }
  );
}
