
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
export const instant = false;
export default async function HomePage() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function handleExplore() {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }

    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-5 sm:px-12">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          CloseFuture<span className="text-gray-400">.</span>
        </Link>

        <div className="flex items-center gap-5">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold hover:underline"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="flex min-h-[75vh] flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-6 text-sm font-bold uppercase tracking-[0.3em] text-gray-500">
          Ideas & Innovation Board
        </p>

        <h1 className="max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-7xl">
          Every Great Idea
          <br />
          Starts Somewhere.
        </h1>

        <p className="mt-6 text-sm font-bold tracking-[0.25em] text-gray-500 sm:text-base">
          THINK. SHARE. INNOVATE.
        </p>

        <p className="mt-8 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
          Share your ideas, collaborate with your team, and turn innovation
          into reality. Every thought has the power to create something
          meaningful.
        </p>

        <form action={handleExplore} className="mt-10">
          <button
            type="submit"
            className="rounded-lg bg-black px-8 py-4 text-base font-semibold text-white transition hover:bg-gray-800"
          >
            Explore Ideas →
          </button>
        </form>

        <p className="mt-5 text-sm text-gray-500">
          Have an idea? This is where it begins.
        </p>
      </section>

      <section className="border-t border-gray-200 bg-gray-50 px-6 py-14">
        <div className="mx-auto grid max-w-5xl gap-10 text-center sm:grid-cols-3">
          <div>
            <h2 className="text-lg font-bold">Share Ideas</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Bring your ideas to the community and make your voice heard.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">Collaborate</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Discuss ideas, share feedback, and learn from others.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold">Create Impact</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Turn promising ideas into meaningful improvements.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 px-6 py-6 text-center text-sm text-gray-500">
        © 2026 CloseFuture. Ideas create the future.
      </footer>
    </main>
  );
}
