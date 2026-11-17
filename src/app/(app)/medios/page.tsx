import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { canEdit, requireMember } from "@/lib/auth";
import { getActiveClients } from "@/lib/queries";
import { signMediaUrls } from "@/lib/signed-urls";
import { createClient } from "@/lib/supabase/server";
import { MediaLibrary, type MediaAsset } from "./media-library";

export const metadata: Metadata = { title: "Medios" };

type Search = { cliente?: string; carpeta?: string; etiqueta?: string; tipo?: string; q?: string };

export default async function MediaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const user = await requireMember();
  const clients = await getActiveClients();
  if (!clients.length) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title="Medios" />
        <EmptyState icon={<FolderOpen />} title="Primero crea un cliente" description="Cada cliente tiene su propia biblioteca de imágenes y videos." />
      </div>
    );
  }
  const client = clients.find((c) => c.id === sp.cliente) ?? clients[0];
  const supabase = await createClient();

  const [{ data: folders }, { data: all }] = await Promise.all([
    supabase.from("media_folders").select("id, name").eq("client_id", client.id).order("name"),
    supabase.from("media_assets").select("folder_id, tags").eq("client_id", client.id),
  ]);

  let q = supabase
    .from("media_assets")
    .select("id, storage_path, kind, mime, size_bytes, width, height, duration_s, filename, tags, folder_id, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (sp.carpeta === "sin") q = q.is("folder_id", null);
  else if (sp.carpeta) q = q.eq("folder_id", sp.carpeta);
  if (sp.etiqueta) q = q.contains("tags", [sp.etiqueta]);
  if (sp.tipo === "image" || sp.tipo === "video") q = q.eq("kind", sp.tipo);
  if (sp.q?.trim()) q = q.ilike("filename", `%${sp.q.trim().replace(/[%_]/g, "")}%`);
  const { data: assets } = await q;

  const urls = await signMediaUrls(supabase, (assets ?? []).map((a) => a.storage_path));
  const counts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  all?.forEach((a) => {
    const k = a.folder_id ?? "sin";
    counts.set(k, (counts.get(k) ?? 0) + 1);
    a.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Medios" description="Imágenes y videos de cada cliente, organizados en carpetas y etiquetas." />
      <MediaLibrary
        key={client.id}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        clientId={client.id}
        userId={user.id}
        editable={canEdit(user.role)}
        folders={(folders ?? []).map((f) => ({ ...f, count: counts.get(f.id) ?? 0 }))}
        total={all?.length ?? 0}
        unfiledCount={counts.get("sin") ?? 0}
        tags={[...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)}
        filters={{ carpeta: sp.carpeta ?? "", etiqueta: sp.etiqueta ?? "", tipo: sp.tipo ?? "", q: sp.q ?? "" }}
        assets={(assets ?? []).map((a) => ({ ...a, url: urls.get(a.storage_path) ?? "" })) as MediaAsset[]}
      />
    </div>
  );
}
