
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import IdeaVoting from "./idea-voting";
import IdeaComments from "./idea-comments";
import IdeaFollow from "./idea-follow";
import IdeaProgressUpdates from "./idea-progress-updates";
import IdeaDemo from "./idea-demo";

export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    evaluation?: string;
    evaluation_error?: string;
    status_success?: string;
    status_error?: string;
    owner_success?: string;
    owner_error?: string;
  }>;
};

async function evaluateIdea(formData: FormData) {
  "use server";

  const id = String(formData.get("idea_id") || "");
  const impactScore = Number(formData.get("impact_score"));
  const effortScore = Number(formData.get("effort_score"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect(`/ideas/${id}?evaluation_error=Unauthorized`);
  }

  if (
    !Number.isInteger(impactScore) ||
    !Number.isInteger(effortScore) ||
    impactScore < 1 ||
    impactScore > 5 ||
    effortScore < 1 ||
    effortScore > 5
  ) {
    redirect(`/ideas/${id}?evaluation_error=Invalid%20scores`);
  }

  const { error } = await supabase.rpc("evaluate_idea", {
    p_idea_id: id,
    p_impact_score: impactScore,
    p_effort_score: effortScore,
  });

  if (error) {
    redirect(
      `/ideas/${id}?evaluation_error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/ideas/${id}`);
  revalidatePath("/dashboard");
  redirect(`/ideas/${id}?evaluation=success`);
}

async function changeIdeaStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("idea_id") || "");
  const newStatus = String(formData.get("new_status") || "");
  const reason = String(formData.get("reason") || "").trim();
  const ownerValue = String(formData.get("owner_id") || "");
  const targetDateValue = String(formData.get("target_date") || "");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("transition_idea", {
    p_idea_id: id,
    p_new_status: newStatus,
    p_reason: reason || null,
    p_owner_id: ownerValue || null,
    p_target_date: targetDateValue || null,
  });

  if (error) {
    redirect(
      `/ideas/${id}?status_error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/ideas/${id}`);
  revalidatePath("/dashboard");

  redirect(`/ideas/${id}?status_success=success`);
}

async function reassignIdeaOwner(formData: FormData) {
  "use server";

  const id = String(formData.get("idea_id") || "");
  const newOwnerId = String(formData.get("new_owner_id") || "");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect(`/ideas/${id}?owner_error=Unauthorized`);
  }

  if (!newOwnerId) {
    redirect(`/ideas/${id}?owner_error=Please%20select%20a%20member`);
  }

  const { error } = await supabase.rpc("reassign_idea_owner", {
    p_idea_id: id,
    p_new_owner_id: newOwnerId,
  });

  if (error) {
    redirect(
      `/ideas/${id}?owner_error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/ideas/${id}`);
  revalidatePath("/dashboard");

  redirect(`/ideas/${id}?owner_success=success`);
}

export default async function IdeaDetailsPage({
  params,
  searchParams,
}: Props) {
  await connection();

  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  const { data: idea, error } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      category,
      problem,
      proposed_solution,
      who_benefits,
      expected_impact,
      rough_effort,
      links,
      is_anonymous,
      status,
      created_at,
      submitted_at,
      updated_at,
      impact_score,
      effort_score,
      evaluation_quadrant,
      owner_id,
      target_date,
      demo_video_path,
      outcome_summary,
      demo_video_url
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !idea) notFound();

  // Check whether the current user is the submitter.
  const { data: ownPrivateDetails } = await supabase
    .from("idea_private_details")
    .select("idea_id")
    .eq("idea_id", id)
    .eq("submitter_id", user.id)
    .maybeSingle();

  const isOwnIdea = Boolean(ownPrivateDetails);

  // Securely retrieve the submitter name.
  // Named ideas: visible to Members and Admins.
  // Anonymous ideas: visible only to Admins.
  // The database function enforces these privacy rules.
  const { data: submitterName, error: submitterError } =
    await supabase.rpc("get_idea_submitter_name", {
      p_idea_id: id,
    });

  if (submitterError) {
    console.error(
      "Error retrieving idea submitter name:",
      submitterError.message
    );
  }

  const isOwner = idea.owner_id === user.id;
  const canManageDemo = isAdmin || isOwner;

  const { data: ownerProfile } = idea.owner_id
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", idea.owner_id)
        .maybeSingle()
    : { data: null };

  const ownerDisplayName = !idea.owner_id
    ? null
    : isOwner
      ? ownerProfile?.full_name
        ? `You (${ownerProfile.full_name})`
        : "You"
      : isAdmin
        ? ownerProfile?.full_name || "Assigned member"
        : "Assigned member";

  let signedVideoUrl: string | null = null;

  if (idea.demo_video_path) {
    const { data: signedData, error: signedError } =
      await supabase.storage
        .from("idea-demos")
        .createSignedUrl(idea.demo_video_path, 3600);

    if (signedError) {
      console.error("Error creating demo video URL:", signedError.message);
    } else {
      signedVideoUrl = signedData.signedUrl;
    }
  }

  const { data: voteSummary, error: voteError } = await supabase.rpc(
    "get_idea_vote_summary",
    { p_idea_id: id }
  );

  const voteData = !voteError ? voteSummary?.[0] : null;

  const canVote =
    !isOwnIdea &&
    ["Submitted", "Needs More Info", "Under Evaluation"].includes(
      idea.status
    );

  const { data: followSummary, error: followError } =
    await supabase.rpc("get_idea_follow_summary", {
      p_idea_id: id,
    });

  const followData = !followError ? followSummary?.[0] : null;

  const { data: statusHistory } = await supabase
    .from("idea_status_history")
    .select("from_status, to_status, reason, changed_at, changed_by")
    .eq("idea_id", id)
    .order("changed_at", { ascending: false });

  const { data: members } = isAdmin
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "member")
        .order("full_name")
    : { data: [] };

  function formatDate(date: string | null) {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const canEvaluate =
    isAdmin &&
    ["Submitted", "Under Evaluation"].includes(idea.status);

  const availableTransitions: string[] = [];

  if (isAdmin) {
    if (idea.status === "Submitted") {
      availableTransitions.push(
        "Under Evaluation",
        "Needs More Info",
        "Rejected"
      );
    }

    if (idea.status === "Under Evaluation") {
      availableTransitions.push(
        "Approved",
        "Rejected",
        "Parked",
        "Needs More Info"
      );
    }

    if (idea.status === "Parked") {
      availableTransitions.push("Under Evaluation");
    }

    if (idea.status === "Approved") {
      availableTransitions.push("In Progress");
    }

    if (idea.status === "In Progress") {
      availableTransitions.push("Done", "Parked");
    }
  }

  if (isOwnIdea && idea.status === "Submitted") {
    availableTransitions.push("Withdrawn");
  }

  if (isOwnIdea && idea.status === "Needs More Info") {
    availableTransitions.push("Submitted", "Withdrawn");
  }

  if ((isAdmin || isOwner) && idea.status === "Approved") {
    if (!availableTransitions.includes("In Progress")) {
      availableTransitions.push("In Progress");
    }
  }

  if ((isAdmin || isOwner) && idea.status === "In Progress") {
    for (const status of ["Done", "Parked"]) {
      if (!availableTransitions.includes(status)) {
        availableTransitions.push(status);
      }
    }
  }

  const needsAssignment =
    idea.status === "Approved" &&
    availableTransitions.includes("In Progress");

  const canReassignOwner =
    isAdmin &&
    Boolean(idea.owner_id) &&
    ["Approved", "In Progress", "Parked"].includes(idea.status);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-gray-700 underline underline-offset-4 hover:text-black"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6 rounded-xl border border-gray-300 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">
                {idea.category}
              </p>

              <h1 className="mt-2 text-3xl font-bold text-black">
                {idea.title}
              </h1>
            </div>

            <span className="rounded-md border border-gray-400 px-3 py-1 text-sm font-semibold text-black">
              {idea.status}
            </span>
          </div>

          {/* Submitter identity is returned according to database privacy rules. */}
          {submitterName && (
            <section className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h2 className="text-sm font-bold text-blue-900">
                Submitter Details
              </h2>

              <p className="mt-2 text-sm text-blue-900">
                <strong>Submitted by:</strong> {submitterName}
              </p>

              <p className="mt-1 text-sm text-blue-900">
                <strong>Submission type:</strong>{" "}
                {idea.is_anonymous ? "Anonymous" : "Named"}
              </p>
            </section>
          )}

          <div className="mt-6 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-black">
                Problem Statement
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-gray-700">
                {idea.problem}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black">
                Proposed Solution
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-gray-700">
                {idea.proposed_solution}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black">
                Who Will Benefit?
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-gray-700">
                {idea.who_benefits}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black">
                Expected Impact
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-gray-700">
                {idea.expected_impact}
              </p>
            </section>

            {idea.rough_effort && (
              <section>
                <h2 className="text-lg font-bold text-black">
                  Rough Effort
                </h2>
                <p className="mt-2 text-gray-700">
                  {idea.rough_effort}
                </p>
              </section>
            )}

            {idea.links && idea.links.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-black">
                  Supporting Links
                </h2>

                <ul className="mt-2 list-inside list-disc space-y-1">
                  {idea.links.map((link: string, index: number) => (
                    <li key={index}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-blue-700 underline"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-lg font-bold text-black">
                Evaluation
              </h2>

              <div className="mt-2 space-y-1 text-gray-700">
                <p>
                  Impact Score: {idea.impact_score ?? "Not evaluated"}
                </p>
                <p>
                  Effort Score: {idea.effort_score ?? "Not evaluated"}
                </p>
                <p>
                  Evaluation Quadrant:{" "}
                  {idea.evaluation_quadrant ?? "Not evaluated"}
                </p>
              </div>
            </section>

            {isAdmin && (
              <section className="rounded-xl border border-gray-300 bg-gray-50 p-5">
                <h2 className="text-xl font-bold text-black">
                  Admin Evaluation
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Rate the expected impact and implementation effort from 1 to 5.
                </p>

                {query.evaluation === "success" && (
                  <p className="mt-4 rounded-md bg-green-100 p-3 text-sm text-green-800">
                    Evaluation scores saved successfully!
                  </p>
                )}

                {query.evaluation_error && (
                  <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800">
                    Evaluation failed: {query.evaluation_error}
                  </p>
                )}

                {canEvaluate ? (
                  <form action={evaluateIdea} className="mt-5 space-y-4">
                    <input type="hidden" name="idea_id" value={idea.id} />

                    <div>
                      <label
                        htmlFor="impact_score"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Impact Score (1–5)
                      </label>
                      <input
                        id="impact_score"
                        name="impact_score"
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        required
                        defaultValue={idea.impact_score ?? ""}
                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="effort_score"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Effort Score (1–5)
                      </label>
                      <input
                        id="effort_score"
                        name="effort_score"
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        required
                        defaultValue={idea.effort_score ?? ""}
                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      Save Evaluation
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-gray-600">
                    {["Submitted", "Under Evaluation"].includes(idea.status)
                      ? "Evaluation is available to admins only."
                      : "This idea cannot be evaluated in its current status."}
                  </p>
                )}
              </section>
            )}

            <section className="rounded-xl border border-gray-300 bg-gray-50 p-5">
              <h2 className="text-xl font-bold text-black">
                Status Management
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Current status: <strong>{idea.status}</strong>
              </p>

              {query.status_success === "success" && (
                <p className="mt-4 rounded-md bg-green-100 p-3 text-sm text-green-800">
                  Idea status updated successfully!
                </p>
              )}

              {query.status_error && (
                <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800">
                  Status update failed: {query.status_error}
                </p>
              )}

              {availableTransitions.length > 0 ? (
                <form action={changeIdeaStatus} className="mt-5 space-y-4">
                  <input type="hidden" name="idea_id" value={idea.id} />

                  <div>
                    <label
                      htmlFor="new_status"
                      className="mb-2 block text-sm font-semibold text-gray-800"
                    >
                      Change Status To
                    </label>

                    <select
                      id="new_status"
                      name="new_status"
                      required
                      defaultValue=""
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black"
                    >
                      <option value="" disabled>
                        Select a status
                      </option>
                      {availableTransitions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="reason"
                      className="mb-2 block text-sm font-semibold text-gray-800"
                    >
                      Reason (required for Needs More Info, Rejected, or Parked)
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      rows={3}
                      placeholder="Enter the reason for this status change, if required."
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black"
                    />
                  </div>

                  {needsAssignment && isAdmin && (
                    <>
                      <div>
                        <label
                          htmlFor="owner_id"
                          className="mb-2 block text-sm font-semibold text-gray-800"
                        >
                          Assign Owner
                        </label>

                        <select
                          id="owner_id"
                          name="owner_id"
                          defaultValue={idea.owner_id ?? ""}
                          className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black"
                        >
                          <option value="">Keep current owner</option>
                          {members?.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.full_name || member.id}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="target_date"
                          className="mb-2 block text-sm font-semibold text-gray-800"
                        >
                          Target Date
                        </label>

                        <input
                          id="target_date"
                          name="target_date"
                          type="date"
                          defaultValue={idea.target_date ?? ""}
                          className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Update Status
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-sm text-gray-600">
                  No status changes are currently available for your account.
                </p>
              )}
            </section>

            {idea.owner_id && (
              <section>
                <h2 className="text-lg font-bold text-black">
                  Assigned Owner
                </h2>
                <p className="mt-2 text-gray-700">{ownerDisplayName}</p>
              </section>
            )}

            {canReassignOwner && (
              <section className="rounded-xl border border-gray-300 bg-gray-50 p-5">
                <h2 className="text-xl font-bold text-black">
                  Reassign Owner
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Admins can assign this idea to another registered member.
                  The current status and target date will remain unchanged.
                </p>

                {query.owner_success === "success" && (
                  <p className="mt-4 rounded-md bg-green-100 p-3 text-sm text-green-800">
                    Owner reassigned successfully!
                  </p>
                )}

                {query.owner_error && (
                  <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800">
                    Owner reassignment failed: {query.owner_error}
                  </p>
                )}

                <form action={reassignIdeaOwner} className="mt-5 space-y-4">
                  <input type="hidden" name="idea_id" value={idea.id} />

                  <div>
                    <label
                      htmlFor="new_owner_id"
                      className="mb-2 block text-sm font-semibold text-gray-800"
                    >
                      Select New Owner
                    </label>

                    <select
                      id="new_owner_id"
                      name="new_owner_id"
                      required
                      defaultValue=""
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black"
                    >
                      <option value="" disabled>
                        Choose a member
                      </option>

                      {members
                        ?.filter((member) => member.id !== idea.owner_id)
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name || member.id}
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Reassign Owner
                  </button>
                </form>
              </section>
            )}

            {idea.target_date && (
              <section>
                <h2 className="text-lg font-bold text-black">Target Date</h2>
                <p className="mt-2 text-gray-700">
                  {formatDate(idea.target_date)}
                </p>
              </section>
            )}

            <IdeaProgressUpdates
              ideaId={idea.id}
              currentUserId={user.id}
              isAdmin={isAdmin}
              ownerId={idea.owner_id}
              status={idea.status}
            />

            <IdeaDemo
              ideaId={idea.id}
              canManage={canManageDemo}
              status={idea.status}
              initialVideoPath={idea.demo_video_path}
              initialVideoUrl={idea.demo_video_url}
              initialOutcomeSummary={idea.outcome_summary}
              signedVideoUrl={signedVideoUrl}
            />

            <section>
              <h2 className="text-lg font-bold text-black">
                Status History
              </h2>

              {statusHistory && statusHistory.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {statusHistory.map((entry, index) => (
                    <div
                      key={`${entry.changed_at}-${index}`}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <p className="font-semibold text-gray-800">
                        {entry.from_status || "Created"} → {entry.to_status}
                      </p>
                      {entry.reason && (
                        <p className="mt-1 text-sm text-gray-600">
                          Reason: {entry.reason}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(entry.changed_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-600">
                  No status history available yet.
                </p>
              )}
            </section>
          </div>

          <div className="mt-8 border-t border-gray-300 pt-6">
            <h2 className="mb-4 text-xl font-bold text-black">Voting</h2>

            {voteError || !voteData ? (
              <p className="text-sm text-gray-600">
                Voting information is currently unavailable.
              </p>
            ) : (
              <IdeaVoting
                ideaId={idea.id}
                initialVoteCount={Number(voteData.vote_count)}
                initialHasVoted={voteData.has_voted}
                canVote={canVote}
              />
            )}
          </div>

          <div className="mt-8 border-t border-gray-300 pt-6">
            <h2 className="mb-4 text-xl font-bold text-black">
              Follow this Idea
            </h2>

            {followError || !followData ? (
              <p className="text-sm text-gray-600">
                Follow information is currently unavailable.
              </p>
            ) : (
              <IdeaFollow
                ideaId={idea.id}
                initialFollowerCount={Number(followData.follower_count)}
                initialIsFollowing={followData.is_following}
              />
            )}
          </div>

          <div className="mt-8 border-t border-gray-300 pt-6">
            <IdeaComments
              ideaId={idea.id}
              currentUserId={user.id}
              canComment={idea.status !== "Draft"}
            />
          </div>

          <div className="mt-8 border-t border-gray-300 pt-6 text-sm text-gray-500">
            <p>Created: {formatDate(idea.created_at)}</p>
            <p className="mt-1">
              Submitted: {formatDate(idea.submitted_at)}
            </p>
            <p className="mt-1">
              Last Updated: {formatDate(idea.updated_at)}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
