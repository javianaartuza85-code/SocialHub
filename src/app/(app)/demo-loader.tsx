"use client";

import { Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadDemoData } from "./demo-actions";

export function DemoLoader() {
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
      <Sparkles className="mx-auto mb-3 size-8 text-primary" />
      <h2 className="mb-1 text-lg font-semibold">Tu agencia está vacía</h2>
      <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
        Carga 3 clientes de ejemplo con publicaciones, imágenes, plantillas y métricas para probar la app de inmediato. Podrás
        archivarlos o borrarlos cuando quieras.
      </p>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await loadDemoData();
            if (res.error) toast.error(res.error);
            else toast.success("¡Datos de ejemplo cargados!");
          })
        }
      >
        {pending ? "Cargando…" : "Cargar datos de ejemplo"}
      </Button>
    </div>
  );
}
