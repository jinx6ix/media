import { createClient } from "@/lib/supabase/server";
import ImageGrid from "@/components/ImageGrid";
import TopBar from "@/components/TopBar";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: mediaItems } = await supabase
    .from("media")
    .select(`*, albums ( name, slug )`)
    .order("created_at", { ascending: false });

  const { data: albums } = await supabase
    .from("albums")
    .select("id, name, slug")
    .order("name");

  return (
    <div className="min-h-screen">
      <TopBar
        title="All Media"
        count={mediaItems?.length ?? 0}
        albums={albums ?? []}
      />
      <div className="p-6">
        <ImageGrid images={mediaItems ?? []} showAlbumBadge />
      </div>
    </div>
  );
}