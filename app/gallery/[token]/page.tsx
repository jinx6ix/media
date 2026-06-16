import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import ImageGrid from "@/components/ImageGrid";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createServiceClient();
  const { data: album } = await supabase
    .from("albums")
    .select("name, description")
    .eq("share_token", token)
    .single();

  if (!album) return { title: "Gallery — JaeTravel Expeditions" };

  return {
    title: `${album.name} — JaeTravel Expeditions`,
    description: album.description ?? "Safari gallery by JaeTravel Expeditions",
    openGraph: {
      title: `${album.name} — JaeTravel Expeditions`,
      description: album.description ?? "Safari photography by JaeTravel Expeditions",
    },
  };
}

export default async function PublicGalleryPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("share_token", token)
    .single();

  if (!album) notFound();

  const { data: mediaItems } = await supabase
    .from("media")
    .select("*")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false });

  const imageCount = mediaItems?.filter((m) => m.media_type === "image").length ?? 0;
  const videoCount = mediaItems?.filter((m) => m.media_type === "video").length ?? 0;

  return (
    <div className="min-h-screen">
      {/* Public header */}
      <header className="border-b border-[#1e1a10] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#c9a84c] rounded-md flex items-center justify-center text-[#0d0d0d] font-bold text-sm">
            J
          </div>
          <a
            href="https://jaetravel.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c9a84c] font-medium text-sm tracking-wide hover:text-[#e0bc60] transition-colors"
          >
            JaeTravel Expeditions
          </a>
        </div>
        <a
          href="https://jaetravel.co.ke"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#5a4a2a] hover:text-[#c9a84c] transition-colors"
        >
          jaetravel.co.ke ↗
        </a>
      </header>

      {/* Album info */}
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-medium text-[#d4b870]">{album.name}</h1>
        {album.description && (
          <p className="text-sm text-[#7a6a4a] mt-2">{album.description}</p>
        )}
        <p className="text-xs text-[#3a3020] mt-1">
          {imageCount > 0 && `${imageCount} photo${imageCount !== 1 ? "s" : ""}`}
          {imageCount > 0 && videoCount > 0 && " · "}
          {videoCount > 0 && `${videoCount} video${videoCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Gallery */}
      <div className="px-6 pb-16 max-w-5xl mx-auto">
        <ImageGrid images={mediaItems ?? []} readOnly />
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1e1a10] px-6 py-6 text-center">
        <p className="text-xs text-[#3a3020]">
          © JaeTravel Expeditions ·{" "}
          <a
            href="https://jaetravel.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#5a4a2a] hover:text-[#c9a84c] transition-colors"
          >
            jaetravel.co.ke
          </a>
        </p>
      </footer>
    </div>
  );
}
