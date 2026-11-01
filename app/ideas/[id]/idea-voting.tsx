
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Props = {
  ideaId: string;
  initialVoteCount: number;
  initialHasVoted: boolean;
  canVote: boolean;
};

export default function IdeaVoting({
  ideaId,
  initialVoteCount,
  initialHasVoted,
  canVote,
}: Props) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const router = useRouter();

  async function handleVote() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const functionName = hasVoted
      ? "unvote_for_idea"
      : "vote_for_idea";

    const { error } = await supabase.rpc(functionName, {
      p_idea_id: ideaId,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setHasVoted(!hasVoted);
    setVoteCount((count) => count + (hasVoted ? -1 : 1));

    router.refresh();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Community Votes</h2>

      <p className="mt-2 text-2xl font-bold">
        {voteCount}
        <span className="ml-2 text-sm font-normal text-gray-500">
          {voteCount === 1 ? "vote" : "votes"}
        </span>
      </p>

      {canVote ? (
        <button
          type="button"
          onClick={handleVote}
          disabled={loading}
          className={`mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-black px-5 text-sm font-semibold disabled:opacity-50 ${
            hasVoted
              ? "bg-white text-black hover:bg-gray-100"
              : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          {loading
            ? "Please wait..."
            : hasVoted
              ? "Remove Vote"
              : "Vote for Idea"}
        </button>
      ) : (
        <p className="mt-3 text-sm text-gray-600">
          {initialHasVoted
            ? "You have already voted for this idea."
            : "Voting is not available for this idea."}
        </p>
      )}

      {message && (
        <p className="mt-3 text-sm text-red-600">{message}</p>
      )}
    </div>
  );
}
