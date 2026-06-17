import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import ImageGrid from "@/components/ImageGrid";
import AlbumTopBar from "@/components/AlbumTopBar";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AlbumPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: album, error } = await supabase
    .from("albums")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!album || error) notFound();

  const { data: mediaItems } = await supabase
    .from("media")
    .select("*")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false });

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/gallery/${album.share_token}`;

  return (
    <div className="min-h-screen">
      <AlbumTopBar
        album={album}
        shareUrl={shareUrl}
        imageCount={mediaItems?.length ?? 0}
      />
      <div className="p-6">
        <ImageGrid
          images={mediaItems ?? []}
          albumId={album.id}
          allowUpload
        />
      </div>
    </div>
  );
}