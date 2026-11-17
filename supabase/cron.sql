-- ============================================================================
-- Activa la tarea automática (recordatorios y publicación) cada minuto.
-- Pega este archivo en Supabase → SQL Editor, REEMPLAZA los dos valores
-- marcados y presiona "Run". Solo hay que hacerlo una vez.
-- ============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Si ya existía, la reemplaza
select cron.unschedule('social-hub-publicar') where exists (select 1 from cron.job where jobname = 'social-hub-publicar');

select cron.schedule(
  'social-hub-publicar',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://TU-APP.vercel.app/api/cron/publicar',          -- ← 1) tu dirección de Vercel
    headers := jsonb_build_object(
      'Authorization', 'Bearer PEGA_AQUI_TU_CRON_SECRET',          -- ← 2) el mismo CRON_SECRET de Vercel
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 55000
  );
  $$
);
