
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Comment = {
  id: string;
  idea_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  ideaId: string;
  currentUserId: string;
  canComment: boolean;
};

export default function IdeaComments({
  ideaId,
  currentUserId,
  canComment,
}: Props) {
  const [supabase] = useState(() => createClient());
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadComments() {
    const { data, error } = await supabase
      .from("idea_comments")
      .select(
        "id, idea_id, user_id, parent_comment_id, content, created_at, updated_at"
      )
      .eq("idea_id", ideaId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage("Unable to load comments. Please refresh the page.");
    } else {
      setComments((data ?? []) as Comment[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId]);

  function withinEditWindow(comment: Comment) {
    return (
      comment.user_id === currentUserId &&
      Date.now() - new Date(comment.created_at).getTime() <=
        15 * 60 * 1000
    );
  }

  async function addComment() {
    if (!content.trim()) {
      setMessage("Please enter a comment.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc("add_idea_comment", {
      p_idea_id: ideaId,
      p_content: content.trim(),
      p_parent_comment_id: replyTo,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setContent("");
      setReplyTo(null);
      setMessage("Comment added.");
      await loadComments();
    }

    setBusy(false);
  }

  async function saveEdit(commentId: string) {
    if (!editContent.trim()) {
      setMessage("Comment cannot be empty.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc("edit_idea_comment", {
      p_comment_id: commentId,
      p_content: editContent.trim(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setEditingId(null);
      setEditContent("");
      setMessage("Comment updated.");
      await loadComments();
    }

    setBusy(false);
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("Delete this comment?")) return;

    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc("delete_idea_comment", {
      p_comment_id: commentId,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Comment deleted.");
      await loadComments();
    }

    setBusy(false);
  }

  function renderComment(comment: Comment, isReply = false) {
    const canEdit = withinEditWindow(comment);

    return (
      <article
        key={comment.id}
        className={`rounded-lg border border-gray-200 p-4 ${
          isReply ? "ml-5 mt-3 bg-gray-50" : "mt-4 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            {comment.user_id === currentUserId ? "You" : "Member"} ·{" "}
            {new Date(comment.created_at).toLocaleString("en-IN")}
            {comment.updated_at !== comment.created_at ? " · Edited" : ""}
          </p>
        </div>

        {editingId === comment.id ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              maxLength={5000}
              rows={3}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm"
            />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveEdit(comment.id)}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-sm underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-800">
            {comment.content}
          </p>
        )}

        {!editingId && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {!isReply && canComment && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(comment.id);
                  setContent("");
                  setMessage("");
                }}
                className="font-medium underline"
              >
                Reply
              </button>
            )}

            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditContent(comment.content);
                    setMessage("");
                  }}
                  className="underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteComment(comment.id)}
                  className="text-red-700 underline disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}

        {!isReply &&
          comments
            .filter((item) => item.parent_comment_id === comment.id)
            .map((reply) => renderComment(reply, true))}
      </article>
    );
  }

  const topLevelComments = comments.filter(
    (comment) => comment.parent_comment_id === null
  );

  return (
    <section className="mt-2">
      <h2 className="text-xl font-bold">Comments</h2>

      <p className="mt-1 text-sm text-gray-600">
        Share feedback or discuss this idea with other members.
      </p>

      {canComment ? (
        <div className="mt-4 space-y-3">
          {replyTo && (
            <div className="flex items-center justify-between text-sm">
              <span>Writing a reply</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="underline"
              >
                Cancel reply
              </button>
            </div>
          )}

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={replyTo ? "Write your reply..." : "Write a comment..."}
            maxLength={5000}
            rows={4}
            className="w-full rounded-lg border border-gray-300 p-3 text-sm"
          />

          <button
            type="button"
            disabled={busy || !content.trim()}
            onClick={() => void addComment()}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Please wait..." : replyTo ? "Post Reply" : "Post Comment"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-600">
          Comments are unavailable for draft ideas.
        </p>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading comments...</p>
        ) : topLevelComments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No comments yet. Start the discussion!
          </p>
        ) : (
          topLevelComments.map((comment) => renderComment(comment))
        )}
      </div>
    </section>
  );
}
