"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Plus } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ROLE_INFO, type UserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";
import { NAV_ITEMS, isActive } from "./nav-items";
import { NotificationBell } from "./notification-bell";

type ShellUser = { fullName: string; email: string; role: UserRole };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function UserBlock({ user }: { user: ShellUser }) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
        {initials(user.fullName) || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{ROLE_INFO[user.role].label}</p>
      </div>
      <form action={signOut}>
        <Button variant="ghost" size="icon" type="submit" title="Cerrar sesión" className="size-8">
          <LogOut />
          <span className="sr-only">Cerrar sesión</span>
        </Button>
      </form>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  user,
  canEdit,
  unread,
  children,
}: {
  user: ShellUser;
  canEdit: boolean;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const mobileItems = NAV_ITEMS.slice(0, 3);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-card/60 p-4 lg:flex">
        <div className="flex items-center justify-between px-1">
          <Link href="/">
            <Logo />
          </Link>
          <NotificationBell initialUnread={unread} />
        </div>
        {canEdit && (
          <Button asChild className="w-full">
            <Link href="/publicaciones/nueva">
              <Plus /> Nueva publicación
            </Link>
          </Button>
        )}
        <NavLinks />
        <div className="mt-auto grid gap-3">
          <ThemeToggle className="self-start" />
          <UserBlock user={user} />
        </div>
      </aside>

      {/* Barra superior (móvil) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <NotificationBell initialUnread={unread} />
      </header>

      <main className="min-w-0 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>

      {/* Navegación inferior (móvil) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {mobileItems.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <MobileTab key={href} href={href} label={label} active={isActive(pathname, href)} Icon={Icon} />
        ))}
        <div className="grid place-items-center">
          {canEdit ? (
            <Link
              href="/publicaciones/nueva"
              className="-mt-5 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
            >
              <Plus className="size-5" />
              <span className="sr-only">Nueva publicación</span>
            </Link>
          ) : null}
        </div>
        <MobileTab href={mobileItems[2].href} label={mobileItems[2].label} active={isActive(pathname, mobileItems[2].href)} Icon={mobileItems[2].icon} />
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="size-5" />
          Más
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="gap-3 p-4">
          <SheetTitle className="px-1">Menú</SheetTitle>
          <NavLinks onNavigate={() => setMoreOpen(false)} />
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Tema</span>
            <ThemeToggle />
          </div>
          <UserBlock user={user} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileTab({
  href,
  label,
  active,
  Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground",
        active && "text-primary",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
