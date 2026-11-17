"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { deleteClient, setClientArchived } from "../../actions";

export function ClientActions({ id, archived, isAdmin }: { id: string; archived: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleArchive() {
    const res = await setClientArchived(id, !archived);
    if (res.error) return toast.error(res.error);
    toast.success(archived ? "Cliente restaurado" : "Cliente archivado");
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await deleteClient(id);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Cliente eliminado");
    router.push("/clientes");
  }

  return (
    <div className="flex gap-2">
      <Button asChild variant="outline">
        <Link href={`/clientes/${id}/editar`}>
          <Pencil /> Editar
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Más acciones">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={toggleArchive}>
            {archived ? <ArchiveRestore /> : <Archive />}
            {archived ? "Restaurar cliente" : "Archivar cliente"}
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 /> Eliminar definitivamente
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar este cliente?</DialogTitle>
            <DialogDescription>
              Se borrarán para siempre sus publicaciones, archivos, plantillas y métricas. Si solo quieres ocultarlo, usa
              <strong> Archivar</strong>. Escribe <strong>ELIMINAR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ELIMINAR" aria-label="Confirmación" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={typed !== "ELIMINAR" || busy} onClick={remove}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
