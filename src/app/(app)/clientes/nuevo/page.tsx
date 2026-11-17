import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { canEdit, requireMember } from "@/lib/auth";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewClientPage() {
  const user = await requireMember();
  if (!canEdit(user.role)) redirect("/clientes");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nuevo cliente" description="Podrás cambiar todo esto más adelante." />
      <ClientForm />
    </div>
  );
}
