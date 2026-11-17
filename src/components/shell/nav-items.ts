import { BarChart3, CalendarDays, FolderOpen, Home, Settings, Users, UsersRound } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/medios", label: "Medios", icon: FolderOpen },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/equipo", label: "Equipo", icon: UsersRound },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
