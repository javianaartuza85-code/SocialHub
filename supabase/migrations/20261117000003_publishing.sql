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
