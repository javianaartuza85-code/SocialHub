#!/usr/bin/env bash
# Reinicia la base de datos local, vuelve a cargar los datos de ejemplo y corre todas las pruebas.
set -euo pipefail
npx supabase db reset
npm run seed
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -q -f supabase/tests/rls.sql
npm run build
npx playwright test --trace off "$@"
