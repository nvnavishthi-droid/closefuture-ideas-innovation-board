
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import SubmitIdeaButton from "./submit-idea-button";
import DeleteDraftButton from "./delete-draft-button";
import CommunityIdeasBoard from "./community-ideas-board";
import MyIdeasTabs from "./my-ideas-tabs";

type Idea = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  problem: string;
  proposed_solution: string;
  owner_id: string | null;
  evaluation_quadrant: string | null;
  target_date: string | null;
};

type OwnerOption = {
  id: string;
  full_name: string | null;
};

async function logout() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function IdeaCard({ idea }: { idea: Idea }) {
  const isDraft = idea.status === "Draft";

  const canEdit =
    isDraft ||
    idea.status === "Submitted" ||
    idea.status === "Needs More Info";

  return (
    <article className="rounded-xl border border-gray-300 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-black">
            {idea.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {idea.category}
          </p>
        </div>

        <span className="rounded-md border border-gray-400 px-3 py-1 text-xs font-medium text-black">
          {idea.status}
        </span>
      </div>

      <div className="mt-4 space-y-1 text-sm text-gray-600">
        <p>Created: {formatDate(idea.created_at)}</p>

        {idea.submitted_at && (
          <p>Submitted: {formatDate(idea.submitted_at)}</p>
        )}

        {idea.target_date && (
          <p>Target date: {formatDate(idea.target_date)}</p>
        )}
      </div>

      <div className="mt-4">
        <Link
          href={`/ideas/${idea.id}`}
          className="inline-block text-sm font-semibold text-black underline underline-offset-4 hover:text-gray-600"
        >
          View Idea
        </Link>
      </div>

      {isDraft && (
        <div className="mt-5 flex flex-row flex-wrap items-center gap-3">
          <Link
            href={`/ideas/${idea.id}/edit`}
            className="inline-flex h-10 min-w-32 items-center justify-center rounded-lg border border-black bg-white px-4 text-sm font-medium text-black hover:bg-gray-100"
          >
            Edit Draft
          </Link>

          <SubmitIdeaButton ideaId={idea.id} />
          <DeleteDraftButton ideaId={idea.id} />
        </div>
      )}

      {!isDraft && canEdit && (
        <div className="mt-5">
          <Link
            href={`/ideas/${idea.id}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-black bg-white px-4 text-sm font-medium text-black hover:bg-gray-100"
          >
            Edit Idea
          </Link>
        </div>
      )}
    </article>
  );
}

async function DashboardContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-white p-6 text-black">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-4 text-gray-600">
            Unable to load your profile. Please try again.
          </p>
        </div>
      </main>
    );
  }

  const isAdmin = profile.role === "admin";

  const ideaFields =
    "id, title, category, status, created_at, submitted_at, updated_at, problem, proposed_solution, owner_id, evaluation_quadrant, target_date";

  let ownIdeas: Idea[] = [];
  let followedIdeas: Idea[] = [];
  let ownedIdeas: Idea[] = [];
  let communityIdeas: Idea[] = [];
  let adminQueue: Idea[] = [];
  let overdueIdeas: Idea[] = [];
  let ownerOptions: OwnerOption[] = [];

  const { data: privateDetails, error: detailsError } = await supabase
    .from("idea_private_details")
    .select("idea_id")
    .eq("submitter_id", user.id);

  const ownIdeaIds = (privateDetails || []).map(
    (item) => item.idea_id
  );

  if (detailsError) {
    console.error(
      "Error loading your ideas:",
      detailsError.message
    );
  } else if (ownIdeaIds.length > 0) {
    const { data, error } = await supabase
      .from("ideas")
      .select(ideaFields)
      .in("id", ownIdeaIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading ideas:", error.message);
    } else {
      ownIdeas = (data || []) as Idea[];
    }
  }

  const { data: followedRows, error: followedError } = await supabase
    .from("idea_followers")
    .select("idea_id")
    .eq("user_id", user.id);

  if (followedError) {
    console.error(
      "Error loading followed ideas:",
      followedError.message
    );
  } else {
    const followedIds = (followedRows || []).map(
      (item) => item.idea_id
    );

    if (followedIds.length > 0) {
      const { data, error } = await supabase
        .from("ideas")
        .select(ideaFields)
        .in("id", followedIds)
        .neq("status", "Draft")
        .neq("status", "Withdrawn")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error(
          "Error loading followed ideas:",
          error.message
        );
      } else {
        followedIdeas = (data || []) as Idea[];
      }
    }
  }

  const { data: ownedData, error: ownedError } = await supabase
    .from("ideas")
    .select(ideaFields)
    .eq("owner_id", user.id)
    .neq("status", "Draft")
    .neq("status", "Withdrawn")
    .order("updated_at", { ascending: false });

  if (ownedError) {
    console.error(
      "Error loading owned ideas:",
      ownedError.message
    );
  } else {
    ownedIdeas = (ownedData || []) as Idea[];
  }

  // Community Board: show all ideas visible to the current user,
  // including their own submitted ideas. Drafts and Withdrawn ideas
  // remain excluded. RLS continues to enforce database visibility.
  const {
    data: communityData,
    error: communityError,
  } = await supabase
    .from("ideas")
    .select(ideaFields)
    .neq("status", "Draft")
    .neq("status", "Withdrawn")
    .order("created_at", { ascending: false });

  if (communityError) {
    console.error(
      "Error loading community ideas:",
      communityError.message
    );
  } else {
    communityIdeas = (communityData || []) as Idea[];

    const ownerIds = Array.from(
      new Set(
        communityIdeas
          .map((idea) => idea.owner_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (ownerIds.length > 0) {
      const {
        data: ownersData,
        error: ownersError,
      } = await supabase.rpc("get_profile_names", {
        p_user_ids: ownerIds,
      });

      if (ownersError) {
        console.error(
          "Error loading owner names:",
          ownersError.message
        );
      } else {
        ownerOptions = (ownersData || []) as OwnerOption[];
      }
    }
  }

  if (isAdmin) {
    const { data, error } = await supabase
      .from("ideas")
      .select(ideaFields)
      .in("status", [
        "Submitted",
        "Needs More Info",
        "Under Evaluation",
      ])
      .order("submitted_at", { ascending: true });

    if (error) {
      console.error(
        "Error loading admin review queue:",
        error.message
      );
    } else {
      adminQueue = (data || []) as Idea[];
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const {
      data: overdueData,
      error: overdueError,
    } = await supabase
      .from("ideas")
      .select(ideaFields)
      .eq("status", "In Progress")
      .not("target_date", "is", null)
      .lt("target_date", today)
      .order("target_date", { ascending: true });

    if (overdueError) {
      console.error(
        "Error loading overdue ideas:",
        overdueError.message
      );
    } else {
      overdueIdeas = (overdueData || []) as Idea[];
    }
  }

  const displayName =
    profile.full_name?.trim() || user.email || "User";

  const drafts = ownIdeas.filter(
    (idea) => idea.status === "Draft"
  );

  const submissions = ownIdeas.filter(
    (idea) => idea.status !== "Draft"
  );

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-5 border-b border-gray-300 pb-7">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gray-500">
              CloseFuture
            </p>

            <h1 className="text-3xl font-bold">
              Welcome, {displayName}!
            </h1>

            <p className="mt-2 text-gray-600">
              Manage your ideas and discover innovations from others.
            </p>

            <p className="mt-2 text-sm font-medium text-gray-500">
              Account role: {profile.role}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/ideas/new"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-black bg-black px-5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              + Submit New Idea
            </Link>

            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-400 bg-white px-5 text-sm font-semibold text-black hover:bg-gray-100"
              >
                Logout
              </button>
            </form>
          </div>
        </header>

        {isAdmin && (
          <section className="mb-10">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">
                Admin Dashboard
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Review submitted ideas and monitor overdue work.
              </p>
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Submitted",
                  count: adminQueue.filter(
                    (idea) => idea.status === "Submitted"
                  ).length,
                },
                {
                  label: "Needs More Info",
                  count: adminQueue.filter(
                    (idea) => idea.status === "Needs More Info"
                  ).length,
                },
                {
                  label: "Under Evaluation",
                  count: adminQueue.filter(
                    (idea) => idea.status === "Under Evaluation"
                  ).length,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-300 p-5"
                >
                  <p className="text-sm text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {item.count}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                Idea Review Queue
              </h3>
              <span className="text-sm text-gray-500">
                {adminQueue.length} idea(s) waiting
              </span>
            </div>

            {adminQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-600">
                  No ideas are currently waiting for review.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {adminQueue.map((idea) => (
                  <article
                    key={idea.id}
                    className="rounded-xl border border-gray-300 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold">
                          {idea.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600">
                          {idea.category}
                        </p>
                      </div>

                      <span className="rounded-md border border-gray-400 px-3 py-1 text-xs font-medium">
                        {idea.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-500">
                      Submitted:{" "}
                      {idea.submitted_at
                        ? formatDate(idea.submitted_at)
                        : "Date unavailable"}
                    </p>

                    <Link
                      href={`/ideas/${idea.id}`}
                      className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                    >
                      Review Idea
                    </Link>
                  </article>
                ))}
              </div>
            )}

            <div className="mb-4 mt-10 flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                Overdue Ideas
              </h3>
              <span className="text-sm text-gray-500">
                {overdueIdeas.length} overdue
              </span>
            </div>

            {overdueIdeas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-600">
                  No overdue In Progress ideas. Great!
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {overdueIdeas.map((idea) => (
                  <article
                    key={idea.id}
                    className="rounded-xl border border-gray-300 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold">
                          {idea.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600">
                          {idea.category}
                        </p>
                      </div>

                      <span className="rounded-md border border-gray-400 px-3 py-1 text-xs font-medium">
                        Overdue
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-600">
                      Target date:{" "}
                      {idea.target_date
                        ? formatDate(idea.target_date)
                        : "Not set"}
                    </p>

                    <Link
                      href={`/ideas/${idea.id}`}
                      className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                    >
                      View Idea
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mb-10">
          <h2 className="mb-2 text-2xl font-bold">
            My Ideas
          </h2>

          <p className="mb-5 text-sm text-gray-600">
            View and manage your drafts, submissions, assigned work and followed ideas.
          </p>

          <MyIdeasTabs
            drafts={drafts}
            submissions={submissions}
            ownedIdeas={ownedIdeas}
            followedIdeas={followedIdeas}
          />

          {followedError && (
            <p className="mt-3 text-sm text-gray-500">
              Some followed ideas could not be loaded. Please refresh the page.
            </p>
          )}
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold">
              Community Ideas Board
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Search, filter, sort and explore ideas from other members.
            </p>
          </div>

          {communityError ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-600">
                Unable to load community ideas. Please refresh the page.
              </p>
            </div>
          ) : communityIdeas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-600">
                No community ideas are available yet.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Submitted ideas will appear here.
              </p>
            </div>
          ) : (
            <CommunityIdeasBoard
              ideas={communityIdeas}
              owners={ownerOptions}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function DashboardLoading() {
  return (
    <main className="min-h-screen bg-white p-10 text-black">
      <div className="mx-auto max-w-5xl">
        <p className="text-gray-600">
          Loading dashboard...
        </p>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
