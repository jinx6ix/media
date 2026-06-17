import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const raw = cookieStore.getAll();
          const result: { name: string; value: string }[] = [];

          const projectRef =
            (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
              .split("//")[1]
              ?.split(".")[0] ?? "";
          const tokenBase = `sb-${projectRef}-auth-token`;
          const chunkMap: Record<number, string> = {};

          for (const cookie of raw) {
            if (cookie.name === tokenBase) {
              result.push({ name: cookie.name, value: cookie.value });
            } else if (cookie.name.startsWith(`${tokenBase}.`)) {
              const idx = parseInt(cookie.name.split(".").pop() ?? "0", 10);
              chunkMap[idx] = cookie.value;
            } else {
              result.push({ name: cookie.name, value: cookie.value });
            }
          }

          if (Object.keys(chunkMap).length > 0) {
            const assembled = Object.keys(chunkMap)
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => chunkMap[Number(k)])
              .join("");
            result.push({ name: tokenBase, value: assembled });
          }

          return result;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — middleware handles the write
          }
        },
      },
    }
  );
}

export async function createServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
