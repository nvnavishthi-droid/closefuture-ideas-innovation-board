
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SubmitIdeaButton({
  ideaId,
}: {
  ideaId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    const confirmed = window.confirm(
      "Are you sure you want to submit this idea?"
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("submit_idea", {
      p_idea_id: ideaId,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="inline-flex h-10 min-w-32 items-center justify-center rounded-lg border border-black bg-black px-4 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Idea"}
      </button>

      {message && (
        <p className="mt-2 text-sm text-gray-700">
          {message}
        </p>
      )}
    </div>
  );
}
