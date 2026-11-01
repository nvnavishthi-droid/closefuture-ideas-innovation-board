
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type ProgressUpdate = {
  id: string;
  user_id: string;
  update_text: string;
  created_at: string;
};

type Props = {
  ideaId: string;
  currentUserId: string;
  isAdmin: boolean;
  ownerId: string | null;
  status: string;
};

export default function IdeaProgressUpdates({
  ideaId,
  currentUserId,
  isAdmin,
  ownerId,
  status,
}: Props) {
  const supabase = createClient();

  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [updateText, setUpdateText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadUpdates() {
    setLoading(true);

    const { data, error } = await supabase
      .from("idea_progress_updates")
      .select("id, user_id, update_text, created_at")
      .eq("idea_id", ideaId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Unable to load progress updates.");
    } else {
      setUpdates(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId]);

  const canPost =
    status === "In Progress" &&
    (isAdmin || ownerId === currentUserId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!updateText.trim()) {
      setMessage("Please enter a progress update.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("add_idea_progress_update", {
      p_idea_id: ideaId,
      p_update_text: updateText.trim(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setUpdateText("");
      setMessage("Progress update added successfully.");
      await loadUpdates();
    }

    setSubmitting(false);
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-gray-900">
        Progress Updates
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Track the latest progress of this idea.
      </p>

      {canPost && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <textarea
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            placeholder="Share a progress update..."
            maxLength={2000}
            rows={4}
            className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {updateText.length}/2000 characters
            </span>

            <button
              type="submit"
              disabled={submitting || !updateText.trim()}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post Update"}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p className="mt-3 text-sm text-gray-700">{message}</p>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500">Loading updates...</p>
        ) : updates.length === 0 ? (
          <p className="text-sm text-gray-500">
            No progress updates yet.
          </p>
        ) : (
          updates.map((update) => (
            <article
              key={update.id}
              className="rounded-lg border border-gray-200 p-4"
            >
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {update.update_text}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                {update.user_id === currentUserId
                  ? "You"
                  : "Team member"}{" "}
                · {new Date(update.created_at).toLocaleString()}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
