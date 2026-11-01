export const instant = false;
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import EditIdeaForm from "./edit-idea-form";

export default async function EditIdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: privateDetails } = await supabase
    .from("idea_private_details")
    .select("idea_id")
    .eq("idea_id", id)
    .eq("submitter_id", user.id)
    .maybeSingle();

  if (!privateDetails) notFound();

  const { data: idea, error } = await supabase
    .from("ideas")
    .select(
      "id, title, category, problem, proposed_solution, who_benefits, expected_impact, rough_effort, links, is_anonymous, status"
    )
    .eq("id", id)
    .single();

  if (error || !idea) notFound();

  if (!["Draft", "Submitted", "Needs More Info"].includes(idea.status)) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-red-600">
          This idea cannot be edited in its current status.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <EditIdeaForm idea={idea} />
      </div>
    </main>
  );
}
