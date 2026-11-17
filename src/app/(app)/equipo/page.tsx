import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { ROLE_INFO } from "@/lib/constants";
import { fmt } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { InviteForm, InvitationRow, MemberRoleControl } from "./team-controls";

export const metadata: Metadata = { title: "Equipo" };

export default async function TeamPage() {
  const me = await requireMember();
  const isAdmin = me.role === "admin";
  const supabase = await createClient();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase.from("members").select("user_id, role, created_at, profiles(full_name, email)").order("created_at"),
    supabase.from("invitations").select("id, email, role, created_at").is("accepted_at", null).order("created_at", { ascending: false }),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Equipo" description="Quién tiene acceso a Social Hub y qué puede hacer." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {Object.entries(ROLE_INFO).map(([k, r]) => (
          <div key={k} className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">{r.label}</p>
            <p className="text-xs text-muted-foreground">{r.description}</p>
          </div>
        ))}
      </div>

      {isAdmin && <InviteForm />}

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Miembros ({members?.length ?? 0})</h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {members?.map((m) => (
            <li key={m.user_id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.profiles?.full_name} {m.user_id === me.id && <span className="text-muted-foreground">(tú)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.profiles?.email} · desde {fmt(m.created_at, "d MMM yyyy")}
                </p>
              </div>
              {isAdmin && m.user_id !== me.id ? (
                <MemberRoleControl userId={m.user_id} role={m.role} />
              ) : (
                <span className="text-sm text-muted-foreground">{ROLE_INFO[m.role].label}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {!!invitations?.length && (
        <section>
          <h2 className="mb-2 font-semibold">Invitaciones pendientes</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {invitations.map((i) => (
              <InvitationRow key={i.id} invitation={i} registerUrl={`${site}/registro?email=${encodeURIComponent(i.email)}`} canManage={isAdmin} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
