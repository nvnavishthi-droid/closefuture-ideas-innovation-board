
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Idea = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  problem: string;
  proposed_solution: string;
  owner_id: string | null;
  evaluation_quadrant: string | null;
};

type OwnerOption = {
  id: string;
  full_name: string | null;
};

type Props = {
  ideas: Idea[];
  owners: OwnerOption[];
};

const statuses = [
  "Submitted",
  "Needs More Info",
  "Under Evaluation",
  "Approved",
  "In Progress",
  "Done",
  "Rejected",
  "Parked",
];

const categories = [
  "New Service Offering",
  "Internal Tool",
  "Process Improvement",
  "Marketing/Content",
  "Client Experience",
  "Training",
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CommunityIdeasBoard({
  ideas,
  owners,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [quadrantFilter, setQuadrantFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;

    async function loadVotes() {
      const supabase = createClient();

      const results = await Promise.all(
        ideas.map(async (idea) => {
          const { data, error } = await supabase.rpc(
            "get_idea_vote_summary",
            { p_idea_id: idea.id }
          );

          if (error) return [idea.id, 0] as const;

          const summary = Array.isArray(data) ? data[0] : data;

          return [
            idea.id,
            Number(summary?.vote_count ?? 0),
          ] as const;
        })
      );

      if (active) {
        setVoteCounts(Object.fromEntries(results));
      }
    }

    loadVotes();

    return () => {
      active = false;
    };
  }, [ideas]);

  const ownerNames = useMemo(() => {
    return new Map(
      owners.map((owner) => [
        owner.id,
        owner.full_name?.trim() || "Member",
      ])
    );
  }, [owners]);

  const ownersWithIdeas = useMemo(() => {
    return Array.from(
      new Set(
        ideas
          .map((idea) => idea.owner_id)
          .filter((id): id is string => Boolean(id))
      )
    );
  }, [ideas]);

  const filteredIdeas = useMemo(() => {
    let result = ideas.filter((idea) => {
      const text = [
        idea.title,
        idea.category,
        idea.problem,
        idea.proposed_solution,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || idea.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" || idea.category === categoryFilter;

      const matchesOwner =
        ownerFilter === "All" ||
        (ownerFilter === "Assigned" && Boolean(idea.owner_id)) ||
        (ownerFilter === "Unassigned" && !idea.owner_id) ||
        idea.owner_id === ownerFilter;

      const matchesQuadrant =
        quadrantFilter === "All" ||
        idea.evaluation_quadrant === quadrantFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesOwner &&
        matchesQuadrant
      );
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "votes") {
        return (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0);
      }

      if (sortBy === "updated") {
        return (
          new Date(b.updated_at).getTime() -
          new Date(a.updated_at).getTime()
        );
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });

    return result;
  }, [
    ideas,
    search,
    statusFilter,
    categoryFilter,
    ownerFilter,
    quadrantFilter,
    sortBy,
    voteCounts,
  ]);

  function IdeaItem({ idea }: { idea: Idea }) {
    const ownerName = idea.owner_id
      ? ownerNames.get(idea.owner_id) || "Member"
      : null;

    return (
      <article className="rounded-xl border border-gray-300 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-black">{idea.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{idea.category}</p>
          </div>

          <span className="rounded-md border border-gray-400 px-3 py-1 text-xs text-black">
            {idea.status}
          </span>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          {idea.problem}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
          <span>Created: {formatDate(idea.created_at)}</span>
          <span>Votes: {voteCounts[idea.id] ?? "..."}</span>

          {idea.evaluation_quadrant && (
            <span>{idea.evaluation_quadrant}</span>
          )}

          <span>
            {ownerName ? `Owner: ${ownerName}` : "No owner assigned"}
          </span>
        </div>

        <Link
          href={`/ideas/${idea.id}`}
          className="mt-4 inline-block text-sm font-semibold text-black underline underline-offset-4 hover:text-gray-600"
        >
          View Idea
        </Link>
      </article>
    );
  }

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ideas by title or content..."
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-black"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black"
        >
          <option value="newest">Sort: Newest</option>
          <option value="updated">Sort: Recently Updated</option>
          <option value="votes">Sort: Most Votes</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black"
        >
          <option value="All">All Statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black"
        >
          <option value="All">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black"
        >
          <option value="All">All Owners</option>
          <option value="Assigned">Owner Assigned</option>
          <option value="Unassigned">Unassigned</option>

          {ownersWithIdeas.map((ownerId) => (
            <option key={ownerId} value={ownerId}>
              {ownerNames.get(ownerId) || "Member"}
            </option>
          ))}
        </select>

        <select
          value={quadrantFilter}
          onChange={(e) => setQuadrantFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black"
        >
          <option value="All">All Evaluation Quadrants</option>
          <option value="Quick Win">Quick Win</option>
          <option value="Big Bet">Big Bet</option>
          <option value="Fill-in">Fill-in</option>
          <option value="Not Worth It">Not Worth It</option>
        </select>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Showing {filteredIdeas.length} of {ideas.length} ideas
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              view === "list"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black"
            }`}
          >
            List View
          </button>

          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              view === "kanban"
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-black"
            }`}
          >
            Kanban View
          </button>
        </div>
      </div>

      {filteredIdeas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-600">
            No ideas match your search or filters.
          </p>
        </div>
      ) : view === "list" ? (
        <div className="grid gap-4">
          {filteredIdeas.map((idea) => (
            <IdeaItem key={idea.id} idea={idea} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {statuses.map((status) => {
            const columnIdeas = filteredIdeas.filter(
              (idea) => idea.status === status
            );

            return (
              <section
                key={status}
                className="min-w-0 rounded-xl border border-gray-300 bg-gray-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-black">{status}</h3>
                  <span className="rounded-full border border-gray-300 px-2 py-1 text-xs">
                    {columnIdeas.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnIdeas.length === 0 ? (
                    <p className="text-sm text-gray-500">No ideas</p>
                  ) : (
                    columnIdeas.map((idea) => (
                      <IdeaItem key={idea.id} idea={idea} />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
