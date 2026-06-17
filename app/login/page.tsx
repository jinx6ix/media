"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Full page reload to ensure cookie is set server-side
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 bg-[#c9a84c] rounded-lg flex items-center justify-center text-[#0d0d0d] font-bold text-base">
            J
          </div>
          <span className="text-[#c9a84c] font-medium tracking-wide text-lg">
            JaeTravel Media Hub
          </span>
        </div>

        <div className="bg-[#161616] border border-[#2a2010] rounded-xl p-8">
          <h1 className="text-lg font-medium text-[#c9a84c] mb-1">Team sign in</h1>
          <p className="text-sm text-[#5a4a2a] mb-6">
            Access restricted to JaeTravel team members
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-[#7a6a4a] block mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@jaetravel.co.ke"
                required
                className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-[#7a6a4a] block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#111] border border-[#2a2010] rounded-lg px-3 py-2.5 text-sm text-[#f0e6c8] placeholder:text-[#3a3020] focus:outline-none focus:border-[#c9a84c] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c9a84c] hover:bg-[#e0bc60] disabled:opacity-50 disabled:cursor-not-allowed text-[#0d0d0d] font-medium rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0d0d0d]/30 border-t-[#0d0d0d] rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-xs text-[#3a3020] text-center mt-4">
          Manage team accounts in Supabase Authentication
        </p>
      </div>
    </div>
  );
}
