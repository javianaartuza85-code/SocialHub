-- Un usuario ya registrado (sin acceso) puede reclamar una invitación enviada a su correo.
create or replace function public.claim_invitation()
returns public.user_role
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations;
  my_email text;
begin
  if auth.uid() is null then return null; end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    return (select role from public.members where user_id = auth.uid());
  end if;
  select email into my_email from public.profiles where id = auth.uid();
  select * into inv from public.invitations
    where lower(email) = lower(my_email) and accepted_at is null
    order by created_at desc limit 1;
  if not found then return null; end if;
  insert into public.members (user_id, role) values (auth.uid(), inv.role);
  update public.invitations set accepted_at = now() where id = inv.id;
  return inv.role;
end $$;
grant execute on function public.claim_invitation() to authenticated;

-- Siempre debe quedar al menos un administrador.
create or replace function public.ensure_admin_remains()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.members where role = 'admin') then
    raise exception 'Debe quedar al menos un administrador en el equipo.';
  end if;
  return null;
end $$;
create constraint trigger members_keep_admin
  after update or delete on public.members
  deferrable initially immediate
  for each row execute function public.ensure_admin_remains();
