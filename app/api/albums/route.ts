import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicAlbum } from "@/types";

export async function GET() {
  const supabase = await createServiceClient();

  const { data: albums, error } = await supabase
    .from("albums")
    .select(`
      id,
      name,
      slug,
      description,
      cover_url,
      created_at,
      images ( count )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: PublicAlbum[] = (albums ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    description: a.description,
    cover_url: a.cover_url,
    image_count: (a.images as unknown as { count: number }[])?.[0]?.count ?? 0,
    created_at: a.created_at,
  }));

  return NextResponse.json(result, {
    headers: {
      "Access-Control-Allow-Origin": "https://jaetravel.co.ke",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
