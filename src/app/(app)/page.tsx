import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DemoLoader } from "./demo-loader";

export default async function HomePage() {
  const user = await requireMember();
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name, logo_url").is("archived_at", null).order("name");

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Hola, {user.fullName.split(" ")[0]} 👋</h1>
      <p className="mb-6 text-sm text-muted-foreground">Esto es lo que pasa hoy con tus clientes.</p>
      {clients && clients.length === 0 ? (
        user.role === "admin" ? <DemoLoader /> : <p className="text-muted-foreground">Aún no hay clientes.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {clients?.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              {c.logo_url && <img src={c.logo_url} alt="" className="size-10 rounded-lg" />}
              <span className="font-medium">{c.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
