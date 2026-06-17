import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardNav from "@/components/DashboardNav";
import { createServiceClient } from "@/lib/supabase/server";

async function getUserFromCookies() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.getAll().find(c => c.name.includes("auth-token"));
  if (!authCookie) return null;
  try {
    const value = decodeURIComponent(authCookie.value);
    const data = JSON.parse(value);
    return data.user || null;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");

  const supabase = await createServiceClient();
  const [destinationsResult, albumsResult] = await Promise.all([
    supabase.from("destinations").select("id, name, slug").order("name"),
    supabase.from("albums").select("id, name, slug, is_public").order("created_at", { ascending: false }),
  ]);

  const destinations = destinationsResult.data || [];
  const albums = albumsResult.data || [];

  return (
    <div className="flex min-h-screen">
      <DashboardNav user={user} destinations={destinations} albums={albums} />
      <main className="flex-1 min-w-0 ml-[220px]">{children}</main>
    </div>
  );
}