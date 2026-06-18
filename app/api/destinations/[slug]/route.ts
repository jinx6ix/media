import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface Props { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: dest } = await supabase.from("destinations").select("*").eq("slug", slug).single();
  if (!dest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: subLocs } = await supabase
    .from("sub_locations")
    .select("*, accommodations(*), media_categories(*, destination_media(count))")
    .eq("destination_id", dest.id).order("name");

  return NextResponse.json({ destination: dest, sub_locations: subLocs ?? [] },
    { headers: { "Access-Control-Allow-Origin": "https://jaetravel.co.ke", "Cache-Control": "public, s-maxage=60" } }
  );
}
