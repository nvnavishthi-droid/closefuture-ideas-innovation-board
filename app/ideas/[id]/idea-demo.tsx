
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  ideaId: string;
  canManage: boolean;
  status: string;
  initialVideoPath: string | null;
  initialVideoUrl: string | null;
  initialOutcomeSummary: string | null;
  signedVideoUrl: string | null;
};

export default function IdeaDemo({
  ideaId,
  canManage,
  status,
  initialVideoPath,
  initialVideoUrl,
  initialOutcomeSummary,
  signedVideoUrl,
}: Props) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl || "");
  const [outcomeSummary, setOutcomeSummary] = useState(
    initialOutcomeSummary || ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canEdit = canManage && status === "In Progress";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!canEdit) return;

    const allowedTypes = ["video/mp4", "video/quicktime", "video/webm"];

    if (videoFile) {
      if (!allowedTypes.includes(videoFile.type)) {
        setError("Please select an MP4, MOV or WebM video.");
        return;
      }

      if (videoFile.size > 100 * 1024 * 1024) {
        setError("Video size must not exceed 100 MB.");
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();
    let videoPath = initialVideoPath;

    try {
      if (videoFile) {
        const extension = videoFile.name.split(".").pop()?.toLowerCase();

        if (!extension || !["mp4", "mov", "webm"].includes(extension)) {
          setError("Unsupported video file extension.");
          setLoading(false);
          return;
        }

        const filePath = `${ideaId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("idea-demos")
          .upload(filePath, videoFile, {
            contentType: videoFile.type,
            upsert: false,
          });

        if (uploadError) {
          setError(`Video upload failed: ${uploadError.message}`);
          setLoading(false);
          return;
        }

        videoPath = filePath;
      }

      const { error: saveError } = await supabase.rpc("save_idea_demo", {
        p_idea_id: ideaId,
        p_demo_video_path: videoPath,
        p_demo_video_url: videoUrl.trim() || null,
        p_outcome_summary: outcomeSummary.trim() || null,
      });

      if (saveError) {
        setError(`Could not save demo details: ${saveError.message}`);
        setLoading(false);
        return;
      }

      setMessage("Demo details saved successfully. Refresh the page to view the latest video.");
      setVideoFile(null);
      window.location.reload();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-5">
      <h2 className="text-xl font-bold text-black">Demo Video & Outcome</h2>

      <p className="mt-2 text-sm text-gray-600">
        Add a demo video or an external video link and describe the outcome.
      </p>

      {initialVideoPath && signedVideoUrl && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-gray-800">
            Uploaded Demo Video
          </p>
          <video
            controls
            className="w-full max-w-2xl rounded-lg border border-gray-300"
            src={signedVideoUrl}
          >
            Your browser does not support video playback.
          </video>
        </div>
      )}

      {initialVideoPath && !signedVideoUrl && (
        <p className="mt-3 text-sm text-gray-600">
          A demo video is uploaded, but its preview is currently unavailable.
        </p>
      )}

      {initialVideoUrl && (
        <p className="mt-4 text-sm">
          <a
            href={initialVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-700 underline"
          >
            Open External Demo
          </a>
        </p>
      )}

      {initialOutcomeSummary && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-800">
            Saved Outcome Summary
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
            {initialOutcomeSummary}
          </p>
        </div>
      )}

      {canEdit ? (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="demo_file"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              Upload Demo Video
            </label>
            <input
              id="demo_file"
              type="file"
              accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
              onChange={(event) =>
                setVideoFile(event.target.files?.[0] || null)
              }
              className="block w-full rounded-lg border border-gray-300 p-3 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              MP4, MOV or WebM. Maximum size: 100 MB.
            </p>
            {videoFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {videoFile.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="demo_url"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              External Demo Link
            </label>
            <input
              id="demo_url"
              type="url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://youtube.com/... or Loom / Google Drive link"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              YouTube, Loom or Google Drive HTTPS links are accepted.
            </p>
          </div>

          <div>
            <label
              htmlFor="outcome_summary"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              Outcome Summary (Optional)
            </label>
            <textarea
              id="outcome_summary"
              value={outcomeSummary}
              onChange={(event) => setOutcomeSummary(event.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="Describe the result or outcome of the idea..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum 5000 characters.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Demo Details"}
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-gray-500">
          {status !== "In Progress"
            ? "Demo details can be added while the idea is In Progress."
            : "Only the assigned owner or an admin can update demo details."}
        </p>
      )}
    </section>
  );
}
