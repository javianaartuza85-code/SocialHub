import { canEdit, requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ContentManager } from "./content-manager";

export default async function ClientContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireMember();
  const supabase = await createClient();
  const [{ data: templates }, { data: groups }] = await Promise.all([
    supabase.from("templates").select("id, name, format, caption, first_comment, networks").eq("client_id", id).order("name"),
    supabase.from("hashtag_groups").select("id, name, hashtags").eq("client_id", id).order("name"),
  ]);
  return <ContentManager clientId={id} editable={canEdit(user.role)} templates={templates ?? []} groups={groups ?? []} />;
}
