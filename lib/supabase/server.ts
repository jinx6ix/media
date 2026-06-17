import { createClient as makeClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function createServiceClient(): Promise<SupabaseClient> {
  return makeClient(supabaseUrl, supabaseServiceKey);
}

export async function createClient(): Promise<SupabaseClient> {
  return makeClient(supabaseUrl, supabaseAnonKey);
}