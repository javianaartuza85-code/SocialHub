import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { listPages, type MetaPage } from "@/lib/meta";
import { getClient } from "@/lib/queries";
import { readPendingMeta } from "./actions";
import { PagePicker } from "./page-picker";

export default async function ConnectMetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireMember();
  if (user.role !== "admin") redirect(`/clientes/${id}`);
  const client = await getClient(id);
  const token = await readPendingMeta(id);
  let pages: MetaPage[] = [];
  let error: string | null = null;
  if (token) {
    try {
      pages = await listPages(token);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Conectar Meta a ${client?.name ?? "cliente"}`} description="Elige la página de Facebook del cliente. Si tiene una cuenta de Instagram profesional vinculada, también se conectará." />
      {!token || error ? (
        <div className="rounded-xl border bg-card p-6 text-sm">
          <p className="mb-4">{error ?? "La conexión venció o no se inició. Vuelve a intentarlo."}</p>
          <Button asChild variant="outline">
            <Link href={`/clientes/${id}`}>Volver al cliente</Link>
          </Button>
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm">
          No encontramos páginas de Facebook en tu cuenta. Asegúrate de ser administrador de la página del cliente y de haber marcado la página al dar permiso.
        </div>
      ) : (
        <PagePicker clientId={id} pages={pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram_business_account?.username ?? (p.instagram_business_account ? "Instagram vinculado" : null) }))} />
      )}
    </div>
  );
}
