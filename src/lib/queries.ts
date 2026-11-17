import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";

/** Cliente con sus redes. Se cachea por petición (lo usan el layout y las pestañas). */
export const getClient = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*, client_social_accounts(id, network, handle, profile_url, connection, external_name, connected_at)")
    .eq("id", id)
    .maybeSingle();
  return data;
});

/** Clientes activos para filtros y selectores. */
export const getActiveClients = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, logo_url, color_primary, client_social_accounts(network)")
    .is("archived_at", null)
    .order("name");
  return data ?? [];
});
