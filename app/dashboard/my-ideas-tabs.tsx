
"use client";

import { useState } from "react";
import Link from "next/link";
import SubmitIdeaButton from "./submit-idea-button";
import DeleteDraftButton from "./delete-draft-button";

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
  target_date: string | null;
};

type Props = {
  drafts: Idea[];
  submissions: Idea[];
  ownedIdeas: Idea[];
  followedIdeas: Idea[];
};

const tabs = [
  { id: "drafts", label: "Drafts" },
  { id: "submissions", label: "My Submissions" },
  { id: "owned", label: "Owned by Me" },
  { id: "following", label: "Following" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function IdeaCard({ idea }: { idea: Idea }) {
  const isDraft = idea.status === "Draft";
  const canEdit =
    isDraft ||
    idea.status === "Submitted" ||
    idea.status === "Needs More Info";

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

      <div className="mt-3 space-y-1 text-sm text-gray-600">
        <p>Created: {formatDate(idea.created_at)}</p>
        {idea.submitted_at && (
          <p>Submitted: {formatDate(idea.submitted_at)}</p>
        )}
        {idea.target_date && (
          <p>Target date: {formatDate(idea.target_date)}</p>
        )}
      </div>

      <Link
        href={`/ideas/${idea.id}`}
        className="mt-4 inline-block text-sm font-semibold text-black underline underline-offset-4"
      >
        View Idea
      </Link>

      {isDraft && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/ideas/${idea.id}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-black px-4 text-sm font-medium hover:bg-gray-100"
          >
            Edit Draft
          </Link>
          <SubmitIdeaButton ideaId={idea.id} />
          <DeleteDraftButton ideaId={idea.id} />
        </div>
      )}

      {!isDraft && canEdit && (
        <div className="mt-4">
          <Link
            href={`/ideas/${idea.id}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-black px-4 text-sm font-medium hover:bg-gray-100"
          >
            Edit Idea
          </Link>
        </div>
      )}
    </article>
  );
}

export default function MyIdeasTabs({
  drafts,
  submissions,
  ownedIdeas,
  followedIdeas,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("drafts");

  const ideasByTab: Record<TabId, Idea[]> = {
    drafts,
    submissions,
    owned: ownedIdeas,
    following: followedIdeas,
  };

  const currentIdeas = ideasByTab[activeTab];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-300 pb-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = ideasByTab[tab.id].length;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                isActive
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-black hover:bg-gray-100"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {currentIdeas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-600">
            {activeTab === "drafts" && "You don't have any drafts yet."}
            {activeTab === "submissions" && "You haven't submitted any ideas yet."}
            {activeTab === "owned" && "You don't own any assigned ideas yet."}
            {activeTab === "following" && "You aren't following any ideas yet."}
          </p>

          {activeTab === "drafts" && (
            <Link
              href="/ideas/new"
              className="mt-3 inline-block text-sm font-semibold text-black underline underline-offset-4"
            >
              Create your first idea
            </Link>
          )}

          {activeTab === "following" && (
            <p className="mt-2 text-sm text-gray-500">
              Visit an idea and select Follow Idea to see it here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {currentIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
