"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { NetworkBadge } from "@/components/network-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { connectMetaPage } from "./actions";

export function PagePicker({ clientId, pages }: { clientId: string; pages: { id: string; name: string; instagram: string | null }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(pages[0]?.id ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2" role="radiogroup">
        {pages.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected === p.id}
              onClick={() => setSelected(p.id)}
              className={cn("flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left", selected === p.id && "border-primary ring-2 ring-primary/30")}
            >
              <NetworkBadge network="facebook" size="md" />
              <span className="flex-1">
                <span className="block font-medium">{p.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {p.instagram ? (
                    <>
                      <NetworkBadge network="instagram" size="xs" /> {p.instagram}
                    </>
                  ) : (
                    "Sin Instagram profesional vinculado"
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Button
        className="w-fit"
        disabled={!selected || pending}
        onClick={() =>
          start(async () => {
            const r = await connectMetaPage(clientId, selected);
            if (r.error) return void toast.error(r.error);
            toast.success("¡Conectado! Las publicaciones programadas se publicarán solas.");
            router.push(`/clientes/${clientId}`);
          })
        }
      >
        Conectar esta página
      </Button>
    </div>
  );
}
