-- Seguridad: el correo del perfil no se puede editar y las invitaciones
-- se validan contra el correo real de la cuenta (auth.users), no el del perfil.

revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url) on public.profiles to authenticated;

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
  -- Solo cuentas con el correo confirmado pueden reclamar una invitación
  select email into my_email from auth.users
    where id = auth.uid() and (email_confirmed_at is not null);
  if my_email is null then return null; end if;
  select * into inv from public.invitations
    where lower(email) = lower(my_email) and accepted_at is null
    order by created_at desc limit 1;
  if not found then return null; end if;
  insert into public.members (user_id, role) values (auth.uid(), inv.role);
  update public.invitations set accepted_at = now() where id = inv.id;
  return inv.role;
end $$;

-- El límite por archivo del bucket coincide con el plan gratuito de Supabase (50 MB)
update storage.buckets set file_size_limit = 52428800 where id = 'media';

-- Al registrarse, la invitación solo se aplica si el correo ya está confirmado.
-- (Si Supabase pide confirmar el correo, se aplica en el primer inicio de sesión.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));

  if not exists (select 1 from public.members) then
    insert into public.members (user_id, role) values (new.id, 'admin');
  elsif new.email_confirmed_at is not null then
    select * into inv from public.invitations
      where lower(email) = lower(new.email) and accepted_at is null
      order by created_at desc limit 1;
    if found then
      insert into public.members (user_id, role) values (new.id, inv.role);
      update public.invitations set accepted_at = now() where id = inv.id;
    end if;
  end if;
  return new;
end $$;
