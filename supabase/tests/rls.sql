-- Comprobaciones de seguridad por rol. Ejecutar con:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- Cada bloque simula ser un usuario concreto y verifica qué puede hacer.
begin;

create or replace function pg_temp.as_user(email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select id into uid from auth.users where auth.users.email = as_user.email;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- Solo lectura: ve clientes pero no puede crear ni editar
select pg_temp.as_user('lector@demo.test');
do $$ begin
  assert (select count(*) from public.clients) = 3, 'el lector debería ver 3 clientes';
  begin
    insert into public.clients (name) values ('No debería');
    raise exception 'el lector NO debería poder crear clientes';
  exception when insufficient_privilege then null;
  end;
  update public.clients set name = 'Hackeado';
  assert not exists (select 1 from public.clients where name = 'Hackeado'), 'el lector NO debería poder editar';
end $$;
reset role;

-- Editor: puede crear, no puede borrar clientes ni gestionar el equipo
select pg_temp.as_user('editor@demo.test');
do $$ begin
  insert into public.clients (name) values ('Cliente del editor');
  delete from public.clients where name = 'Cliente del editor';
  assert exists (select 1 from public.clients where name = 'Cliente del editor'), 'el editor NO debería borrar clientes';
  update public.members set role = 'admin';
  assert (select m.role from public.members m join public.profiles p on p.id = m.user_id where p.email = 'editor@demo.test') = 'editor', 'el editor NO debería cambiar roles';
  assert (select count(*) from public.social_tokens) = 0, 'nadie debería leer tokens';
end $$;
reset role;

-- Usuario sin membresía (registrado sin invitación): no ve nada
insert into auth.users (id, email, instance_id, aud, role) values (gen_random_uuid(), 'intruso@demo.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
select pg_temp.as_user('intruso@demo.test');
do $$ begin
  assert (select count(*) from public.clients) = 0, 'un usuario sin invitación NO debería ver clientes';
  assert (select count(*) from public.posts) = 0, 'un usuario sin invitación NO debería ver publicaciones';
  assert (select count(*) from storage.objects) = 0, 'un usuario sin invitación NO debería ver archivos';
end $$;
reset role;

-- Anónimo: no ve nada
set local role anon;
do $$ begin
  assert (select count(*) from public.clients) = 0, 'anónimo NO debería ver clientes';
end $$;
reset role;

select 'OK: todas las comprobaciones de seguridad pasaron' as resultado;
rollback;
