import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Bienvenido de nuevo</h1>
      <p className="mb-6 text-sm text-muted-foreground">Entra para gestionar el contenido de tus clientes.</p>
      <AuthForm mode="login" next={next} />
    </>
  );
}
