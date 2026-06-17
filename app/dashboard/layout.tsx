import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardNav from "@/components/DashboardNav";
import { createServiceClient } from "@/lib/supabase/server";

async function isAuthenticated(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const allCookies = cookieStore.getAll();
  return allCookies.some(c => c.name.includes("auth-token"));
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  if (!isAuthenticated(cookieStore)) {
    redirect("/login");
  }

  const supabase = await createServiceClient();
  const [destinationsResult, albumsResult] = await Promise.all([
    supabase.from("destinations").select("id, name, slug").order("name"),
    supabase.from("albums").select("id, name, slug, is_public").order("created_at", { ascending: false }),
  ]);

  const destinations = destinationsResult.data || [];
  const albums = albumsResult.data || [];

  return (
    <div className="flex min-h-screen">
      <DashboardNav user={{ id: "user", email: "" } as any} destinations={destinations} albums={albums} />
      <main className="flex-1 min-w-0 ml-[220px]">{children}</main>
    </div>
  );
}