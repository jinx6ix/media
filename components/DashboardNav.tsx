"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import clsx from "clsx";

interface NavAlbum { id: string; name: string; slug: string; }
interface Props { user: User; albums: NavAlbum[]; destinations?: { id: string; name: string; slug: string }[]; }

export default function DashboardNav({ user, albums, destinations }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (user.email ?? "JT").split("@")[0].slice(0, 2).toUpperCase();
  const inDest = pathname.startsWith("/dashboard/destinations");
  const inMedia = !inDest;

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#111] border-r border-[#1e1a10] flex flex-col z-40">
      <div className="px-4 py-4 border-b border-[#1e1a10] flex items-center gap-2.5">
        <div className="w-7 h-7 bg-[#c9a84c] rounded-md flex items-center justify-center text-[#0d0d0d] font-bold text-sm flex-shrink-0">J</div>
        <span className="text-[#c9a84c] font-medium text-sm tracking-wide truncate">Media Hub</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Section: Destinations */}
        <div className="mb-4">
          <p className="text-[10px] text-[#5a4a2a] uppercase tracking-widest px-2 mb-1.5">Destinations</p>
          <NavLink href="/dashboard/destinations" active={inDest} icon="🗺️">Destinations</NavLink>
          <NavLink href="/dashboard/destinations/new" active={pathname === "/dashboard/destinations/new"} icon="+">New destination</NavLink>
        </div>

        {destinations && destinations.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-[#5a4a2a] uppercase tracking-widest px-2 mb-1.5">Your Destinations</p>
            <div className="space-y-0.5">
              {destinations.map(d => (
                <NavLink key={d.id} href={`/dashboard/destinations/${d.slug}`}
                  active={pathname === `/dashboard/destinations/${d.slug}`} icon="▫">
                  <span className="truncate flex-1">{d.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-[#1e1a10] pt-4 mb-4">
          <p className="text-[10px] text-[#5a4a2a] uppercase tracking-widest px-2 mb-1.5">Media library</p>
          <NavLink href="/dashboard" active={pathname === "/dashboard" && inMedia} icon="⊞">All media</NavLink>
          <NavLink href="/dashboard/albums/new" active={pathname === "/dashboard/albums/new"} icon="+">New album</NavLink>
        </div>

        {albums.length > 0 && (
          <div>
            <p className="text-[10px] text-[#5a4a2a] uppercase tracking-widest px-2 mb-1.5">Albums</p>
            <div className="space-y-0.5">
              {albums.map(a => (
                <NavLink key={a.id} href={`/dashboard/albums/${a.slug}`}
                  active={pathname === `/dashboard/albums/${a.slug}`} icon="▫">
                  <span className="truncate flex-1">{a.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-[#1e1a10]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#1e1800] border border-[#c9a84c50] flex items-center justify-center text-[10px] text-[#c9a84c] font-medium flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#a09070] truncate">{user.email}</p>
          </div>
          <button onClick={signOut} title="Sign out" className="text-[#5a4a2a] hover:text-[#c9a84c] transition-colors text-sm">↩</button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ href, active, icon, children }: {
  href: string; active: boolean; icon: string; children: React.ReactNode;
}) {
  return (
    <Link href={href} className={clsx(
      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
      active ? "bg-[#1e1800] text-[#c9a84c]" : "text-[#a09070] hover:bg-[#1a1500] hover:text-[#c9a84c]"
    )}>
      <span className="text-xs opacity-60 flex-shrink-0">{icon}</span>
      {children}
    </Link>
  );
}
