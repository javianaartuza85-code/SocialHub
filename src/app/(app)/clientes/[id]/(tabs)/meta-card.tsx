"use client";

import Link from "next/link";
import { Unplug, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { disconnectMeta } from "../conectar-meta/actions";

export function MetaCard({ clientId, configured, connected, isAdmin }: { clientId: string; configured: boolean; connected: string[]; isAdmin: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const m = sp.get("meta");
    if (m === "sin-configurar") toast.error("La conexión con Meta no está configurada. Revisa Ajustes.");
    if (m === "cancelado") toast.message("Conexión con Meta cancelada.");
    if (m === "error") toast.error("No se pudo conectar con Meta. " + (sp.get("detalle") ?? ""));
  }, [sp]);

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-5 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Zap className="size-4 text-primary" /> Publicación automática
      </p>
      {connected.length ? (
        <p className="text-muted-foreground">
          Conectado a Meta: <strong className="text-foreground">{connected.join(" y ")}</strong>. Las publicaciones programadas en estas redes se publican solas.
        </p>
      ) : configured ? (
        <p className="text-muted-foreground">Conecta la página de Facebook y el Instagram profesional del cliente para publicar automáticamente. Las demás redes usan el modo manual.</p>
      ) : (
        <p className="text-muted-foreground">
          Por ahora este cliente usa el <strong className="text-foreground">modo manual</strong>: te avisamos a la hora programada y tú copias, descargas y publicas. Para publicar solo en Instagram y Facebook, configura Meta (ver{" "}
          <Link href="/ajustes" className="text-primary hover:underline">
            Ajustes
          </Link>
          ).
        </p>
      )}
      {isAdmin && configured && (
        <div className="flex gap-2">
          {connected.length ? (
            <ConfirmButton
              trigger={
                <Button variant="outline" size="sm">
                  <Unplug /> Desconectar
                </Button>
              }
              title="¿Desconectar Meta?"
              description="Las publicaciones pendientes pasarán a modo manual."
              confirmLabel="Desconectar"
              onConfirm={async () => {
                await disconnectMeta(clientId);
                toast.success("Desconectado");
                router.refresh();
              }}
            />
          ) : (
            <Button asChild size="sm">
              <a href={`/api/meta/connect?cliente=${clientId}`}>Conectar con Meta</a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
