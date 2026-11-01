
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  ideaId: string;
  initialFollowerCount: number;
  initialIsFollowing: boolean;
};

export default function IdeaFollow({
  ideaId,
  initialFollowerCount,
  initialIsFollowing,
}: Props) {
  const [supabase] = useState(() => createClient());
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleFollow() {
    if (busy) return;

    setBusy(true);
    setMessage("");

    const functionName = isFollowing ? "unfollow_idea" : "follow_idea";

    const { error } = await supabase.rpc(functionName, {
      p_idea_id: ideaId,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setIsFollowing((previous) => !previous);
      setFollowerCount((previous) =>
        isFollowing ? Math.max(0, previous - 1) : previous + 1
      );
    }

    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void toggleFollow()}
          disabled={busy}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${
            isFollowing
              ? "border border-gray-400 bg-white text-black hover:bg-gray-100"
              : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          {busy
            ? "Please wait..."
            : isFollowing
              ? "Following ✓"
              : "Follow Idea +"}
        </button>

        <p className="text-sm text-gray-600">
          {followerCount} follower{followerCount === 1 ? "" : "s"}
        </p>
      </div>

      {message && (
        <p role="status" className="mt-2 text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
