
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Login successful! Redirecting to dashboard...");
    setPassword("");

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-12 text-black">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight">
            CloseFuture
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            Ideas & Innovation Board
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to continue sharing ideas.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            {message && (
              <p className="rounded-md bg-gray-100 p-3 text-sm text-gray-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-black py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-black underline underline-offset-4"
            >
              Create account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © 2026 CloseFuture. All rights reserved.
        </p>
      </div>
    </main>
  );
}
