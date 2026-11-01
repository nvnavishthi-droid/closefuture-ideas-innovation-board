
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

const categories = [
  "New Service Offering",
  "Internal Tool",
  "Process Improvement",
  "Marketing/Content",
  "Client Experience",
  "Training",
];

export default function NewIdeaPage() {
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [benefits, setBenefits] = useState("");
  const [impact, setImpact] = useState("");
  const [effort, setEffort] = useState("");
  const [links, setLinks] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  function clearMessage() {
    if (messageType === "success") {
      setMessage("");
    }
  }

  function resetForm() {
    setTitle("");
    setCategory("");
    setProblem("");
    setSolution("");
    setBenefits("");
    setImpact("");
    setEffort("");
    setLinks("");
    setAnonymous(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;

    const action = submitter?.value ?? "draft";

    const { data, error } = await supabase.rpc("create_idea", {
      p_title: title.trim(),
      p_category: category,
      p_problem: problem.trim(),
      p_proposed_solution: solution.trim(),
      p_who_benefits: benefits.trim(),
      p_expected_impact: impact.trim(),
      p_rough_effort: effort || null,
      p_links: links
        .split("\n")
        .map((link) => link.trim())
        .filter(Boolean),
      p_is_anonymous: anonymous,
    });

    if (error) {
      setLoading(false);
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    if (!data) {
      setLoading(false);
      setMessageType("error");
      setMessage("Idea could not be created. Please try again.");
      return;
    }

    if (action === "submit") {
      const { error: submitError } = await supabase.rpc("submit_idea", {
        p_idea_id: data,
      });

      if (submitError) {
        setLoading(false);
        setMessageType("error");
        setMessage(
          "Your idea was saved as a Draft, but submission failed: " +
            submitError.message
        );
        return;
      }
    }

    resetForm();
    setLoading(false);
    setMessageType("success");
    setMessage(
      action === "submit"
        ? "Your idea has been submitted successfully!"
        : "Your idea has been saved as a Draft successfully!"
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold">Submit a New Idea</h1>
          <p className="mt-2 text-gray-600">
            Share your idea and help us make a difference.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Idea Title *
            </label>
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => {
                clearMessage();
                setTitle(e.target.value);
              }}
              placeholder="Enter a clear title for your idea"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {title.length}/100
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Category *
            </label>
            <select
              required
              value={category}
              onChange={(e) => {
                clearMessage();
                setCategory(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            >
              <option value="">Select a category</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Problem Statement *
            </label>
            <textarea
              required
              rows={4}
              value={problem}
              onChange={(e) => {
                clearMessage();
                setProblem(e.target.value);
              }}
              placeholder="What problem are you trying to solve?"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Proposed Solution *
            </label>
            <textarea
              required
              rows={4}
              value={solution}
              onChange={(e) => {
                clearMessage();
                setSolution(e.target.value);
              }}
              placeholder="Describe your proposed solution"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Who Benefits? *
            </label>
            <textarea
              required
              rows={3}
              value={benefits}
              onChange={(e) => {
                clearMessage();
                setBenefits(e.target.value);
              }}
              placeholder="Who will benefit from this idea?"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Expected Impact *
            </label>
            <textarea
              required
              rows={3}
              value={impact}
              onChange={(e) => {
                clearMessage();
                setImpact(e.target.value);
              }}
              placeholder="What positive impact do you expect?"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Rough Effort
            </label>
            <select
              value={effort}
              onChange={(e) => {
                clearMessage();
                setEffort(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            >
              <option value="">Not specified</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Reference Links
            </label>
            <textarea
              rows={2}
              value={links}
              onChange={(e) => {
                clearMessage();
                setLinks(e.target.value);
              }}
              placeholder="Enter one URL per line (optional)"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => {
                clearMessage();
                setAnonymous(e.target.checked);
              }}
              className="h-4 w-4"
            />
            Submit this idea anonymously
          </label>

          {message && (
            <p
              role="status"
              className={`rounded-lg p-3 text-sm ${
                messageType === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </p>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              name="action"
              value="draft"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Save as Draft"}
            </button>

            <button
              type="submit"
              name="action"
              value="submit"
              disabled={loading}
              className="w-full rounded-lg bg-black py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Submit Idea"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            Save as Draft to continue later, or Submit Idea to send it for review.
          </p>
        </form>
      </div>
    </main>
  );
}
