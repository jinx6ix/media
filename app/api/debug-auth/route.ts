import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] ?? "";
  const tokenBase = `sb-${projectRef}-auth-token`;

  // Classify cookies
  const sbCookies = allCookies.filter(
    (c) => c.name.startsWith("sb-") || c.name.includes("supabase")
  );
  const singleJson = allCookies.find((c) => c.name === tokenBase);
  const chunks = allCookies.filter((c) => c.name.startsWith(`${tokenBase}.`));

  // Assemble whichever format is present
  const chunkMap: Record<number, string> = {};
  for (const c of chunks) {
    const idx = parseInt(c.name.split(".").pop() ?? "0", 10);
    chunkMap[idx] = c.value;
  }
  const assembled =
    chunks.length > 0
      ? Object.keys(chunkMap)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => chunkMap[Number(k)])
          .join("")
      : null;

  const cookieForServer = singleJson?.value ?? assembled ?? null;

  let parsedSession: unknown = null;
  if (cookieForServer) {
    try {
      parsedSession = JSON.parse(cookieForServer);
    } catch {
      parsedSession = { error: "Could not parse cookie value as JSON" };
    }
  }

  // Test getUser with dual-format parser
  let userResult: Record<string, unknown> = {};
  try {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll: () => {
          const result: { name: string; value: string }[] = [];
          const cm: Record<number, string> = {};
          for (const cookie of allCookies) {
            if (cookie.name === tokenBase) {
              result.push({ name: cookie.name, value: cookie.value });
            } else if (cookie.name.startsWith(`${tokenBase}.`)) {
              const idx = parseInt(cookie.name.split(".").pop() ?? "0", 10);
              cm[idx] = cookie.value;
            } else {
              result.push({ name: cookie.name, value: cookie.value });
            }
          }
          if (Object.keys(cm).length > 0) {
            const joined = Object.keys(cm)
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => cm[Number(k)])
              .join("");
            result.push({ name: tokenBase, value: joined });
          }
          return result;
        },
        setAll: () => {},
      },
    });

    const { data: ud, error: ue } = await supabase.auth.getUser();
    userResult = {
      user: ud.user
        ? { id: ud.user.id, email: ud.user.email, confirmed_at: ud.user.email_confirmed_at }
        : null,
      error: ue ? { message: ue.message, status: ue.status } : null,
    };
  } catch (err) {
    userResult = { error: String(err) };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      url: supabaseUrl,
      anon_key_valid: anonKey.startsWith("eyJ"),
      project_ref: projectRef,
      token_base: tokenBase,
    },
    cookies: {
      total: allCookies.length,
      sb_cookies: sbCookies.map((c) => ({ name: c.name, len: c.value.length })),
      format_detected: singleJson
        ? "single-json"
        : chunks.length > 0
        ? "chunked"
        : "none",
      chunks_found: chunks.length,
      cookie_value_starts_with: cookieForServer?.slice(0, 50),
    },
    parsed_session: parsedSession
      ? {
          has_access_token: !!(parsedSession as Record<string, unknown>).access_token,
          has_refresh_token: !!(parsedSession as Record<string, unknown>).refresh_token,
          token_type: (parsedSession as Record<string, unknown>).token_type,
        }
      : null,
    getUser: userResult,
  });
}
