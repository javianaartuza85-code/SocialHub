import type { Metadata } from "next";
import { canEdit, requireMember } from "@/lib/auth";
import { getActiveClients } from "@/lib/queries";
import { ContentCalendar } from "./content-calendar";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarPage() {
  const user = await requireMember();
  const clients = await getActiveClients();
  return (
    <div className="mx-auto max-w-7xl">
      <ContentCalendar
        clients={clients.map((c) => ({ id: c.id, name: c.name, color: c.color_primary, logo_url: c.logo_url }))}
        editable={canEdit(user.role)}
      />
    </div>
  );
}
