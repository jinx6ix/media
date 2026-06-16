import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/DashboardNav";

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
  console.log("[Layout] User from cookie:", user?.id ?? "null");

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: albums } = await supabase
    .from("albums")
    .select("id, name, slug, is_public")
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen">
      <DashboardNav user={user} albums={albums ?? []} />
      <main className="flex-1 min-w-0 ml-[220px]">{children}</main>
    </div>
  );
}