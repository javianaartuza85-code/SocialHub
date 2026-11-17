import { canEdit, requireMember } from "@/lib/auth";
import { getClient } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { ApprovalLinks } from "./approval-links";

export default async function ClientApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, client] = await Promise.all([requireMember(), getClient(id)]);
  const supabase = await createClient();
  const [{ data: links }, { count }] = await Promise.all([
    supabase.from("approval_links").select("id, label, token_hint, expires_at, revoked_at, last_used_at, created_at").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("client_id", id).eq("status", "in_review"),
  ]);
  return <ApprovalLinks clientId={id} contactName={client?.contact_name ?? ""} contactPhone={client?.contact_phone ?? ""} editable={canEdit(user.role)} links={links ?? []} pending={count ?? 0} />;
}
