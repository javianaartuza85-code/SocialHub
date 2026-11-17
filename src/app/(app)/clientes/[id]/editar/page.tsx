import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { canEdit, requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "../../client-form";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireMember();
  if (!canEdit(user.role)) redirect(`/clientes/${id}`);
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clients")
    .select("*, client_social_accounts(network, handle, profile_url, connection)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  const { client_social_accounts, ...rest } = c;
  const { id: clientId, name, industry, logo_url, color_primary, color_secondary, color_accent, contact_name, contact_email, contact_phone, website, notes } = rest;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Editar ${c.name}`} />
      <ClientForm
        initial={{
          id: clientId,
          name,
          industry,
          logo_url,
          color_primary,
          color_secondary,
          color_accent,
          contact_name,
          contact_email,
          contact_phone,
          website,
          notes,
          accounts: client_social_accounts,
        }}
      />
    </div>
  );
}
