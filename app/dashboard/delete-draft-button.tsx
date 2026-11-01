
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function DeleteDraftButton({
  ideaId,
}: {
  ideaId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this draft?"
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("delete_draft", {
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
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex h-10 min-w-32 items-center justify-center rounded-lg border border-black bg-white px-4 text-sm font-medium text-black hover:bg-gray-100 disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete Draft"}
      </button>

      {message && (
        <p className="mt-2 text-sm text-gray-700">{message}</p>
      )}
    </div>
  );
}
