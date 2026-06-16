import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const sbCookies = allCookies.filter((c) =>
    c.name.startsWith("sb-") || c.name.includes("supabase")
  );

  let userResult: Record<string, unknown> = {};
  let sessionResult: Record<string, unknown> = {};
  let envCheck: Record<string, unknown> = {};

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  envCheck = {
    SUPABASE_URL_set: !!supabaseUrl,
    SUPABASE_URL_value: supabaseUrl || "(not set)",
    ANON_KEY_set: !!anonKey,
    ANON_KEY_preview: anonKey ? anonKey.slice(0, 20) + "…" : "(not set)",
    ANON_KEY_looks_valid: anonKey.startsWith("eyJ"),
  };

  try {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    });

    const { data: ud, error: ue } = await supabase.auth.getUser();
    userResult = {
      user: ud.user
        ? {
            id: ud.user.id,
            email: ud.user.email,
            confirmed_at: ud.user.email_confirmed_at,
            role: ud.user.role,
          }
        : null,
      error: ue ? { message: ue.message, status: ue.status } : null,
    };

    const { data: sd, error: se } = await supabase.auth.getSession();
    sessionResult = {
      session: sd.session
        ? {
            expires_at: sd.session.expires_at,
            access_token_preview: sd.session.access_token?.slice(0, 20) + "…",
          }
        : null,
      error: se ? { message: se.message } : null,
    };
  } catch (err) {
    userResult = { error: String(err) };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: envCheck,
    cookies: {
      total: allCookies.length,
      supabase_cookies: sbCookies.map((c) => ({
        name: c.name,
        has_value: !!c.value,
        value_preview: c.value?.slice(0, 30) + "…",
      })),
    },
    getUser: userResult,
    getSession: sessionResult,
  });
}