-- ============================================================================
-- SOCIAL HUB — instalación completa de la base de datos
-- Pega TODO este archivo en Supabase → SQL Editor → New query y presiona "Run".
-- Solo se ejecuta una vez, en un proyecto nuevo.
-- (Archivo generado con: npm run db:bundle — no lo edites a mano)
-- ============================================================================

-- ─── 20261117000001_schema.sql ───────────────────────────────────
-- =============================================================================
-- Social Hub — esquema principal
-- Una sola agencia: todos los miembros del equipo ven todos los clientes.
-- La seguridad se aplica con Row Level Security (RLS) según el rol del miembro.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'editor', 'viewer');
create type public.social_network as enum ('instagram', 'facebook', 'tiktok', 'linkedin', 'x');
create type public.post_status as enum ('idea', 'draft', 'in_review', 'approved', 'scheduled', 'published', 'failed');
create type public.post_format as enum ('post', 'carousel', 'video', 'reel');
create type public.target_status as enum ('pending', 'published', 'failed');
create type public.publish_mode as enum ('auto', 'manual');
create type public.media_kind as enum ('image', 'video');
create type public.notification_type as enum ('publish_due', 'client_comment', 'client_approved', 'client_changes', 'publish_failed', 'published');

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Equipo
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.user_role not null default 'editor',
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invitations_pending_email on public.invitations (lower(email)) where accepted_at is null;

-- Funciones de permisos (security definer para que RLS no se llame a sí misma)
create or replace function public.my_role()
returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.members where user_id = auth.uid()
$$;

create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where user_id = auth.uid())
$$;

create or replace function public.can_edit()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role in ('admin', 'editor'))
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'admin')
$$;

-- Al registrarse: crea el perfil. El primer usuario es administrador;
-- los siguientes solo entran si tienen una invitación pendiente con su correo.
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
  else
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  logo_url text,
  color_primary text not null default '#6366f1',
  color_secondary text not null default '#a5b4fc',
  color_accent text not null default '#f59e0b',
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

create table public.client_social_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  network public.social_network not null,
  handle text not null,
  profile_url text,
  connection public.publish_mode not null default 'manual',
  external_id text,            -- page_id (Facebook) o ig_user_id (Instagram)
  external_name text,
  connected_at timestamptz,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, network)
);

-- Tokens de acceso: SOLO accesibles desde el servidor (service role). Sin políticas RLS.
create table public.social_tokens (
  account_id uuid primary key references public.client_social_accounts (id) on delete cascade,
  access_token_encrypted text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Biblioteca de medios
-- ---------------------------------------------------------------------------
create table public.media_folders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  parent_id uuid references public.media_folders (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  folder_id uuid references public.media_folders (id) on delete set null,
  storage_path text not null unique,
  kind public.media_kind not null,
  mime text not null,
  size_bytes bigint not null default 0,
  width int,
  height int,
  duration_s numeric,
  filename text not null,
  tags text[] not null default '{}',
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index media_assets_client on public.media_assets (client_id, created_at desc);
create index media_assets_tags on public.media_assets using gin (tags);

-- ---------------------------------------------------------------------------
-- Publicaciones
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null default '',
  status public.post_status not null default 'idea',
  format public.post_format not null default 'post',
  caption text not null default '',
  first_comment text not null default '',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_client_date on public.posts (client_id, scheduled_at);
create index posts_status on public.posts (status);
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create table public.post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  network public.social_network not null,
  caption_override text,
  publish_mode public.publish_mode not null default 'manual',
  status public.target_status not null default 'pending',
  external_post_id text,
  permalink text,
  error text,
  attempts int not null default 0,
  reminded_at timestamptz,
  published_at timestamptz,
  unique (post_id, network)
);

create table public.post_media (
  post_id uuid not null references public.posts (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  position int not null default 0,
  primary key (post_id, media_id)
);

create table public.post_status_history (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  from_status public.post_status,
  to_status public.post_status not null,
  actor_user_id uuid references public.profiles (id) on delete set null,
  actor_label text,
  created_at timestamptz not null default now()
);
create index post_status_history_post on public.post_status_history (post_id, created_at);

create or replace function public.log_post_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Los cambios hechos desde el portal del cliente o el cron (sin usuario) se
  -- registran explícitamente en el servidor con su propia etiqueta.
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.post_status_history (post_id, from_status, to_status, actor_user_id)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger posts_status_history after insert or update of status on public.posts
  for each row execute function public.log_post_status();

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_user_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  body text not null,
  is_client boolean not null default false,
  created_at timestamptz not null default now()
);
create index post_comments_post on public.post_comments (post_id, created_at);

-- ---------------------------------------------------------------------------
-- Plantillas y hashtags
-- ---------------------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  format public.post_format not null default 'post',
  caption text not null default '',
  first_comment text not null default '',
  networks public.social_network[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.hashtag_groups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  hashtags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Enlaces de aprobación (el token real nunca se guarda, solo su hash SHA-256)
-- ---------------------------------------------------------------------------
create table public.approval_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  token_hash text not null unique,
  token_hint text not null,     -- últimos caracteres, para reconocerlo en la lista
  label text not null default 'Enlace de aprobación',
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Métricas mensuales
-- ---------------------------------------------------------------------------
create table public.monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  network public.social_network not null,
  month date not null check (extract(day from month) = 1),
  followers int not null default 0,
  reach int not null default 0,
  impressions int not null default 0,
  interactions int not null default 0,
  posts_count int not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  unique (client_id, network, month)
);
create trigger monthly_metrics_updated_at before update on public.monthly_metrics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notificaciones
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  post_id uuid references public.posts (id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;
alter table public.clients enable row level security;
alter table public.client_social_accounts enable row level security;
alter table public.social_tokens enable row level security;
alter table public.media_folders enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.post_targets enable row level security;
alter table public.post_media enable row level security;
alter table public.post_status_history enable row level security;
alter table public.post_comments enable row level security;
alter table public.templates enable row level security;
alter table public.hashtag_groups enable row level security;
alter table public.approval_links enable row level security;
alter table public.monthly_metrics enable row level security;
alter table public.notifications enable row level security;

-- Perfiles: cada uno ve el suyo; los miembros ven a todo el equipo.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_member());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Miembros: lectura para el equipo, cambios solo administradores.
create policy members_select on public.members for select to authenticated
  using (user_id = auth.uid() or public.is_member());
create policy members_admin_update on public.members for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy members_admin_delete on public.members for delete to authenticated
  using (public.is_admin() and user_id <> auth.uid());

create policy invitations_select on public.invitations for select to authenticated
  using (public.is_member());
create policy invitations_admin_all on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Tablas de contenido: el equipo lee; administradores y editores escriben.
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'client_social_accounts', 'media_folders', 'media_assets',
    'posts', 'post_targets', 'post_media', 'post_comments',
    'templates', 'hashtag_groups', 'approval_links', 'monthly_metrics'
  ] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.is_member())', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.can_edit())', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.can_edit()) with check (public.can_edit())', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.can_edit())', t);
  end loop;
end $$;

-- Los clientes solo pueden borrarse definitivamente por un administrador.
drop policy clients_delete on public.clients;
create policy clients_delete on public.clients for delete to authenticated using (public.is_admin());

-- Las cuentas conectadas a Meta solo las gestiona un administrador.
drop policy client_social_accounts_update on public.client_social_accounts;
create policy client_social_accounts_update on public.client_social_accounts for update to authenticated
  using (public.can_edit() and (connection = 'manual' or public.is_admin()))
  with check (public.can_edit() and (connection = 'manual' or public.is_admin()));

create policy post_status_history_select on public.post_status_history for select to authenticated
  using (public.is_member());

create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- social_tokens: RLS activado y SIN políticas → nadie salvo el servidor puede leerla.

-- =============================================================================
-- Almacenamiento
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('media', 'media', false, 524288000),   -- 500 MB, privado (URLs firmadas)
  ('logos', 'logos', true, 5242880)       -- 5 MB, público
on conflict (id) do nothing;

create policy media_read on storage.objects for select to authenticated
  using (bucket_id in ('media', 'logos') and public.is_member());
create policy media_write on storage.objects for insert to authenticated
  with check (bucket_id in ('media', 'logos') and public.can_edit());
create policy media_update on storage.objects for update to authenticated
  using (bucket_id in ('media', 'logos') and public.can_edit());
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id in ('media', 'logos') and public.can_edit());


-- ─── 20261117000002_team.sql ─────────────────────────────────────
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


-- ─── 20261117000003_publishing.sql ───────────────────────────────
-- Estado del sistema (por ejemplo, la última vez que corrió la tarea automática)
create table public.system_status (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.system_status enable row level security;
create policy system_status_select on public.system_status for select to authenticated using (public.is_member());

-- Búsqueda rápida de publicaciones programadas que ya vencieron
create index if not exists posts_scheduled_due on public.posts (scheduled_at) where status = 'scheduled';


-- ─── 20261117000004_security.sql ─────────────────────────────────
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
