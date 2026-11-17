"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TabDef = { slug: string; label: string; external?: (id: string) => string };

const TABS: TabDef[] = [
  { slug: "", label: "Resumen" },
  { slug: "publicaciones", label: "Publicaciones" },
  { slug: "medios", label: "Medios", external: (id) => `/medios?cliente=${id}` },
  { slug: "contenido", label: "Plantillas y hashtags" },
  { slug: "aprobacion", label: "Aprobación" },
  { slug: "metricas", label: "Métricas", external: (id) => `/metricas?cliente=${id}` },
];

export function ClientTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/clientes/${id}`;
  return (
    <nav className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-full gap-1 border-b sm:min-w-0">
        {TABS.map((t) => {
          const href = t.external ? t.external(id) : t.slug ? `${base}/${t.slug}` : base;
          const active = pathname === href;
          return (
            <Link
              key={t.slug}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground",
                active && "border-primary text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
