import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export default async function NoAccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <Logo className="mb-6" />
        <h1 className="mb-2 text-xl font-semibold">Aún no tienes acceso</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Tu cuenta <strong>{user.email}</strong> está creada, pero nadie del equipo te ha invitado todavía. Pide a un
          administrador que te invite desde <em>Equipo</em> con este mismo correo y vuelve a entrar.
        </p>
        <form action={signOut}>
          <Button variant="outline">Cerrar sesión</Button>
        </form>
      </div>
    </main>
  );
}
