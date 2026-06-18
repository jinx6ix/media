import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicMedia } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: album, error: albumErr } = await supabase
    .from("albums")
    .select("id, name, slug, description, cover_url")
    .eq("slug", slug)
    .single();

  if (albumErr || !album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");
  const typeFilter = req.nextUrl.searchParams.get("type"); // "image" | "video" | null

  let query = supabase
    .from("media")
    .select("id, media_type, public_url, thumbnail_url, filename, caption, tags, width, height, duration_sec, created_at")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (typeFilter === "image" || typeFilter === "video") {
    query = query.eq("media_type", typeFilter);
  }

  const { data: mediaItems, error: mediaErr } = await query;

  if (mediaErr) {
    return NextResponse.json({ error: mediaErr.message }, { status: 500 });
  }

  const result: PublicMedia[] = (mediaItems ?? []).map((m) => ({
    id: m.id,
    media_type: m.media_type,
    public_url: m.public_url,
    thumbnail_url: m.thumbnail_url,
    filename: m.filename,
    caption: m.caption,
    tags: m.tags ?? [],
    width: m.width,
    height: m.height,
    duration_sec: m.duration_sec,
    created_at: m.created_at,
  }));

  return NextResponse.json(
    {
      album: {
        name: album.name,
        slug: album.slug,
        description: album.description,
        cover_url: album.cover_url,
      },
      media: result,
      // backward compat
      images: result.filter((m) => m.media_type === "image"),
      total: result.length,
      limit,
      offset,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "https://jaetravel.co.ke",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
