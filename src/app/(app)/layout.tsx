import { AppShell } from "@/components/shell/app-shell";
import { canEdit, requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMember();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return (
    <AppShell user={{ fullName: user.fullName, email: user.email, role: user.role }} canEdit={canEdit(user.role)} unread={count ?? 0}>
      {children}
    </AppShell>
  );
}
