import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { canEdit, requireMember } from "@/lib/auth";
import { NETWORK_INFO } from "@/lib/constants";
import { fromInputValue } from "@/lib/dates";
import { getActiveClients } from "@/lib/queries";
import { getClientEditorData } from "../actions";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "Nueva publicación" };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ cliente?: string; fecha?: string }> }) {
  const sp = await searchParams;
  const user = await requireMember();
  if (!canEdit(user.role)) redirect("/calendario");
  const clients = await getActiveClients();
  if (!clients.length) {
    return (
      <EmptyState
        title="Primero crea un cliente"
        description="Cada publicación pertenece a un cliente."
        action={
          <Button asChild>
            <Link href="/clientes/nuevo">Crear cliente</Link>
          </Button>
        }
      />
    );
  }
  const client = clients.find((c) => c.id === sp.cliente) ?? clients[0];
  const editorData = await getClientEditorData(client.id);
  const nets = client.client_social_accounts.map((a) => a.network).filter((n) => NETWORK_INFO[n].formats.includes("post"));
  // ?fecha=2026-11-20 o ?fecha=2026-11-20T15:00 (desde el calendario)
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}/.test(sp.fecha) ? (sp.fecha.length > 10 ? sp.fecha.slice(0, 16) : `${sp.fecha}T10:00`) : null;

  return (
    <PostEditor
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      editorData={editorData}
      readOnly={false}
      initial={{
        client_id: client.id,
        title: "",
        format: "post",
        caption: "",
        first_comment: "",
        scheduled_at: fecha ? fromInputValue(fecha) : null,
        status: "draft",
        networks: nets.length ? nets : ["instagram"],
        overrides: {},
        published: [],
        media: [],
      }}
    />
  );
}
