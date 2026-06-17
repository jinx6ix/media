import { createClient as makeClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof makeClient> | null = null;

export function createClient() {
  if (!browserClient) {
    browserClient = makeClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}