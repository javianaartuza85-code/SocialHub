import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Crear cuenta</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        La primera persona en registrarse será la administradora. Las demás necesitan una invitación.
      </p>
      <AuthForm mode="registro" />
    </>
  );
}
