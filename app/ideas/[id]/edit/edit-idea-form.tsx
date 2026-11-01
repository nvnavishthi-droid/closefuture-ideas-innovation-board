
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Idea = {
  id: string;
  title: string;
  category: string;
  problem: string;
  proposed_solution: string;
  who_benefits: string;
  expected_impact: string;
  rough_effort: string | null;
  links: string[] | null;
  is_anonymous: boolean;
};

const categories = [
  "New Service Offering",
  "Internal Tool",
  "Process Improvement",
  "Marketing/Content",
  "Client Experience",
  "Training",
];

export default function EditIdeaForm({ idea }: { idea: Idea }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(idea.title);
  const [category, setCategory] = useState(idea.category);
  const [problem, setProblem] = useState(idea.problem);
  const [solution, setSolution] = useState(idea.proposed_solution);
  const [benefits, setBenefits] = useState(idea.who_benefits);
  const [impact, setImpact] = useState(idea.expected_impact);
  const [effort, setEffort] = useState(idea.rough_effort || "");
  const [links, setLinks] = useState(
    (idea.links || []).join("\n")
  );
  const [anonymous, setAnonymous] = useState(idea.is_anonymous);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("update_idea", {
      p_idea_id: idea.id,
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

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Edit Idea</h1>
      <p className="mb-6 text-gray-600">
        Update your idea details below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block font-medium">
            Idea Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            className="w-full rounded-lg border p-3"
          />
          <p className="mt-1 text-sm text-gray-500">
            Maximum 100 characters.
          </p>
        </div>

        <div>
          <label className="mb-1 block font-medium">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full rounded-lg border p-3"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block font-medium">
            What problem are you solving? *
          </label>
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            required
            rows={4}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">
            Proposed Solution *
          </label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            required
            rows={4}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">
            Who will benefit? *
          </label>
          <textarea
            value={benefits}
            onChange={(e) => setBenefits(e.target.value)}
            required
            rows={3}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">
            Expected Impact *
          </label>
          <textarea
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            required
            rows={3}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">
            Rough Effort
          </label>
          <select
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
            className="w-full rounded-lg border p-3"
          >
            <option value="">Not specified</option>
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-medium">
            Reference Links
          </label>
          <textarea
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            rows={3}
            placeholder="Enter one link per line"
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="anonymous"
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="anonymous">
            Submit this idea anonymously
          </label>
        </div>

        {message && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border px-5 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
