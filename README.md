# Social Hub

Aplicación web para social media managers que gestionan varios clientes: planifica el contenido en un calendario, prepara cada publicación con su vista previa por red, pide la aprobación del cliente con un enlace privado, recibe recordatorios a la hora de publicar (o publica solo en Instagram y Facebook) y entrega un reporte mensual en PDF.

Funciona en computador y celular, en modo claro y oscuro, y está en español.

---

## Índice

1. [Qué necesitas](#1-qué-necesitas)
2. [Crear la base de datos en Supabase](#2-crear-la-base-de-datos-en-supabase)
3. [Copiar las claves de Supabase](#3-copiar-las-claves-de-supabase)
4. [Crear dos contraseñas secretas](#4-crear-dos-contraseñas-secretas)
5. [Publicar la app en Vercel](#5-publicar-la-app-en-vercel)
6. [Conectar Vercel y Supabase](#6-conectar-vercel-y-supabase)
7. [Primer ingreso y datos de ejemplo](#7-primer-ingreso-y-datos-de-ejemplo)
8. [Activar los recordatorios automáticos](#8-activar-los-recordatorios-automáticos)
9. [Invitar a tu equipo](#9-invitar-a-tu-equipo)
10. [Opcional: publicar solo en Instagram y Facebook (Meta)](#10-opcional-publicar-solo-en-instagram-y-facebook-meta)
11. [Cómo se usa día a día](#11-cómo-se-usa-día-a-día)
12. [Problemas frecuentes](#12-problemas-frecuentes)
13. [Para programadores](#13-para-programadores)

---

## 1. Qué necesitas

- **30 a 45 minutos** la primera vez.
- Tres cuentas gratuitas (puedes entrar con la misma cuenta de GitHub en las otras dos):
  - **GitHub**: ya tienes el código en `javianaartuza85-code/socialhub`.
  - **Supabase** (<https://supabase.com>): guarda la base de datos, los usuarios y los archivos.
  - **Vercel** (<https://vercel.com>): pone la app en internet.
- Un bloc de notas para ir guardando las claves que copies. **No las compartas con nadie.**

> 💡 Todo lo que dice `entre comillas así` es el nombre exacto de un botón o un campo.

---

## 2. Crear la base de datos en Supabase

1. Entra a <https://supabase.com> y pulsa `Start your project`. Inicia sesión (con GitHub es lo más rápido).
2. Pulsa `New project`.
   - **Name:** `social-hub`
   - **Database Password:** pulsa `Generate a password` y **guárdala** en tu bloc de notas.
   - **Region:** elige `South America (São Paulo)`, la más cercana a Colombia.
   - Pulsa `Create new project` y espera 1 o 2 minutos.
3. En el menú de la izquierda, abre `SQL Editor` y pulsa `New query`.
4. En GitHub, abre el archivo [`supabase/setup.sql`](supabase/setup.sql), pulsa el botón **Copy raw file** (dos cuadraditos) y pega todo en el editor de Supabase.
5. Pulsa `Run` (abajo a la derecha). Debe aparecer `Success. No rows returned`.
6. Para comprobarlo, abre `Table Editor`: deberías ver tablas como `clients`, `posts` y `media_assets`.

---

## 3. Copiar las claves de Supabase

1. En Supabase, abre `Project Settings` (el engranaje) y luego `API` o `API Keys`.
2. Copia en tu bloc de notas estas tres cosas:

| Lo que copias en Supabase | Cómo se llamará en Vercel |
|---|---|
| **Project URL** (empieza con `https://` y termina en `.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** o **Publishable key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** o **Secret key** (pulsa `Reveal`) | `SUPABASE_SERVICE_ROLE_KEY` |

> Si tu panel muestra "Legacy API keys", puedes usar esas (`anon` y `service_role`) o las nuevas (`publishable` y `secret`). Las dos funcionan.
>
> ⚠️ La `service_role` / `secret` da acceso total a tus datos. Solo va en Vercel; nunca la mandes por chat ni la pongas en otro lugar.

---

## 4. Crear dos contraseñas secretas

La app necesita dos textos largos y aleatorios, inventados por ti:

- `CRON_SECRET`: protege la tarea que envía recordatorios y publica.
- `TOKEN_ENCRYPTION_KEY`: cifra las conexiones con Instagram y Facebook.

Para cada una, usa un generador de contraseñas (el de tu navegador, el de tu gestor de contraseñas o <https://www.random.org/strings/>) con **40 caracteres de letras y números, sin símbolos**. Guárdalas en tu bloc de notas.

> No cambies `TOKEN_ENCRYPTION_KEY` después: si lo haces, tendrás que volver a conectar las cuentas de Meta.

---

## 5. Publicar la app en Vercel

1. Entra a <https://vercel.com> con tu cuenta de GitHub.
2. Pulsa `Add New…` → `Project`, busca el repositorio `socialhub` y pulsa `Import`. Si no aparece, pulsa `Adjust GitHub App Permissions` y dale acceso a ese repositorio.
3. Abre la sección `Environment Variables` y agrega una por una (Key = nombre, Value = valor):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | La Project URL del paso 3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave anon/publishable del paso 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave service_role/secret del paso 3 |
| `CRON_SECRET` | La primera contraseña del paso 4 |
| `TOKEN_ENCRYPTION_KEY` | La segunda contraseña del paso 4 |
| `NEXT_PUBLIC_TIMEZONE` | `America/Bogota` |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | `50` |
| `NEXT_PUBLIC_SITE_URL` | Por ahora, `https://example.com`. Lo corregimos en el paso 6. |

4. Pulsa `Deploy` y espera 2 a 3 minutos. Al terminar verás confeti 🎉 y la dirección de tu app, por ejemplo `https://socialhub-tuusuario.vercel.app`. **Cópiala.**

---

## 6. Conectar Vercel y Supabase

**En Vercel:**

1. Abre tu proyecto → `Settings` → `Environment Variables`.
2. Edita `NEXT_PUBLIC_SITE_URL` y pon la dirección real de tu app, **sin `/` al final**. Por ejemplo: `https://socialhub-tuusuario.vercel.app`.
3. Ve a `Deployments`, abre los tres puntos `⋯` del último despliegue y pulsa `Redeploy`.

**En Supabase**, abre `Authentication` → `URL Configuration`:

1. **Site URL:** la dirección de tu app.
2. En **Redirect URLs** pulsa `Add URL` y agrega `https://TU-APP.vercel.app/auth/callback` (con tu dirección).
3. Pulsa `Save`.

> Recomendado: en `Authentication` → `Sign In / Providers` → `Email`, deja activado **Confirm email**. Así nadie puede registrarse con un correo que no es suyo.

---

## 7. Primer ingreso y datos de ejemplo

1. Abre tu app y pulsa `Regístrate`.
2. **La primera persona que se registra es la administradora**, así que hazlo tú primero.
3. Confirma tu correo con el enlace que te llega (revisa también la carpeta de spam) y entra.
4. Verás el botón **`Cargar datos de ejemplo`**. Púlsalo: se crean 3 clientes de muestra (Café Aroma, FitZone Gym y Estudio Lumen) con publicaciones en todos los estados, imágenes, plantillas, hashtags y 6 meses de métricas.
5. ¡Listo para probar! Cuando quieras empezar en serio, archiva o elimina los clientes de ejemplo desde su ficha (menú `⋯`).

---

## 8. Activar los recordatorios automáticos

Cada minuto, Supabase le pregunta a la app si hay algo que publicar. Así llegan los recordatorios y, si conectas Meta, las publicaciones automáticas.

1. En GitHub, abre [`supabase/cron.sql`](supabase/cron.sql) y copia todo.
2. En Supabase, abre `SQL Editor` → `New query` y pégalo.
3. **Cambia los dos valores marcados con ←**:
   - `https://TU-APP.vercel.app` → la dirección de tu app.
   - `PEGA_AQUI_TU_CRON_SECRET` → tu `CRON_SECRET` del paso 4.
4. Pulsa `Run`.
5. Comprueba que funciona: en la app, abre **Ajustes**. En 1 o 2 minutos verás ✅ *Última revisión: hace un momento*.

> Si te equivocaste en algún valor, corrige y vuelve a ejecutar el mismo archivo: reemplaza la tarea anterior.

---

## 9. Invitar a tu equipo

1. En la app, abre **Equipo**, escribe el correo de la persona, elige su rol y pulsa `Invitar`.
2. Pulsa `Copiar enlace` y envíaselo por WhatsApp o correo.
3. La persona se registra **con ese mismo correo** y entra con el rol que le diste.

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Todo, incluido el equipo, la conexión con Meta y eliminar clientes |
| **Editor** | Crear y editar clientes, publicaciones, medios, plantillas y métricas |
| **Solo lectura** | Ver todo y descargar reportes, sin modificar nada |

---

## 10. Opcional: publicar solo en Instagram y Facebook (Meta)

Sin este paso la app funciona igual: a la hora programada recibes un recordatorio y publicas tú (copiar texto → descargar archivos → `Marcar publicado`). Con Meta, las publicaciones de Instagram y Facebook salen solas.

**Antes de empezar:**

- La cuenta de Instagram de cada cliente debe ser **profesional** (de empresa o creador) y estar **vinculada a la página de Facebook** del cliente.
- Tú (o quien conecte) debes ser **administrador de esa página de Facebook**.
- Meta pide verificar tu negocio y revisar la app (**App Review**) antes de que funcione con cuentas de clientes. Este trámite puede tardar días o semanas. Mientras tanto, la app solo funciona con cuentas de personas que tengan un rol dentro de la app de Meta (por ejemplo, tú como administradora).

**Pasos generales** (Meta cambia sus pantallas con frecuencia; si algo no coincide, busca la opción con un nombre parecido):

1. Entra a <https://developers.facebook.com>, pulsa `My Apps` → `Create App` y elige el tipo **Business**.
2. Agrega el producto **Facebook Login for Business** (o *Facebook Login*). En sus ajustes, en **Valid OAuth Redirect URIs**, pon `https://TU-APP.vercel.app/api/meta/callback`. Esta dirección exacta también aparece en **Ajustes** dentro de Social Hub.
3. Pide estos permisos: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`, `instagram_basic`, `instagram_content_publish` e `instagram_manage_comments`.
4. En `App settings` → `Basic`, copia el **App ID** y el **App Secret**.
5. En Vercel, agrega las variables `META_APP_ID` y `META_APP_SECRET` y haz `Redeploy`.
6. En Social Hub, abre la ficha del cliente → `Conectar con Meta` → elige su página. Verás *Conectado a Meta: Facebook e Instagram*.

> **Importante:** Instagram solo publica automáticamente imágenes **JPG** (no PNG ni SVG) con proporciones entre 4:5 y 1.91:1, y videos MP4. Si algo falla, la app te avisa en la campana y la publicación queda en *Error al publicar*, con un botón para reintentar.

---

## 11. Cómo se usa día a día

1. **Clientes:** crea cada marca con su logo, colores, redes y notas internas.
2. **Medios:** sube imágenes y videos por cliente y ordénalos en carpetas y etiquetas.
3. **Nueva publicación:** elige cliente, formato y redes; escribe el texto (con contador por red) y agrega archivos, hashtags guardados o una plantilla. A la derecha ves cómo se verá en cada red.
4. **Estados:** Idea → Borrador → En revisión → Aprobado → Programado → Publicado.
5. **Aprobación del cliente:** en la ficha del cliente → `Aprobación` → `Crear enlace`, y envíalo por WhatsApp. El cliente ve lo que está *En revisión* y lo aprueba o pide cambios, sin crear una cuenta. Te llega un aviso en la campana 🔔.
6. **Calendario:** vista de mes, semana o lista, con filtros. Arrastra una publicación para cambiarle la fecha. Toca un día vacío para crear una publicación en esa fecha.
7. **Publicar:** a la hora programada te llega el aviso ⏰ y en Inicio aparece *Para publicar ahora*. Abre la publicación, copia el texto, descarga los archivos, publica en la red y pulsa `Marcar publicado`.
8. **Métricas:** cada mes pulsa `Registrar métricas` y copia los números de las estadísticas de cada red. Luego descarga el reporte en **PDF** para tu cliente.

---

## 12. Problemas frecuentes

**No me llega el correo de confirmación.**
El servicio de correo gratuito de Supabase envía muy pocos correos por hora y a veces caen en spam. Para un equipo pequeño, espera unos minutos y revisa el spam. Para algo más estable, configura tu propio correo en Supabase → `Authentication` → `Emails` → `SMTP Settings`.

**En Ajustes, la revisión automática aparece en rojo.**
Repite el [paso 8](#8-activar-los-recordatorios-automáticos) y revisa que la dirección no tenga `/` al final y que el `CRON_SECRET` sea idéntico al de Vercel.

**"Este enlace no está disponible" en el portal del cliente.**
El enlace venció o fue revocado. Crea uno nuevo en la pestaña `Aprobación` del cliente.

**No puedo subir un video.**
El plan gratuito de Supabase permite archivos de hasta **50 MB**. Comprime el video o mejora el plan. Si lo haces, cambia también `NEXT_PUBLIC_MAX_UPLOAD_MB`.

**Las horas salen corridas.**
Revisa que `NEXT_PUBLIC_TIMEZONE` sea `America/Bogota` en Vercel y haz `Redeploy`.

**El proyecto de Supabase se "pausó".**
En el plan gratuito, Supabase pausa los proyectos sin actividad durante una semana. Entra al panel de Supabase y pulsa `Restore`. Con la tarea automática del paso 8 activa, esto rara vez pasa.

**Alguien se registró y ve "Aún no tienes acceso".**
Es lo esperado: solo entran las personas invitadas. Invítala desde **Equipo** con el mismo correo con el que se registró y pídele que vuelva a entrar.

---

## 13. Para programadores

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · componentes estilo shadcn/ui (sobre Radix) · Supabase (Postgres + RLS, Auth, Storage, pg_cron) · FullCalendar · Recharts · @react-pdf/renderer · Playwright.

### Desarrollo local

Requiere Node 20+ y Docker.

```bash
npm install
```

```bash
npx supabase start
```

```bash
cp .env.example .env.local
```

Completa `.env.local` con lo que imprime `npx supabase status`: la `API URL`, la clave `anon` (o `publishable`) y la `service_role` (o `secret`). Agrega también dos secretos de al menos 32 caracteres. Luego:

```bash
npm run seed
```

```bash
npm run dev
```

Entra a <http://localhost:3000> con `admin@demo.test`, `editor@demo.test` o `lector@demo.test` (contraseña `demo12345`).

### Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run test:all` | Reinicia la base local, carga datos, corre las pruebas de seguridad (RLS), la prueba simulada de Meta, el build y todas las pruebas de navegador (escritorio y móvil) |
| `npm run test:meta` | Prueba la publicación automática con una API de Meta simulada |
| `npm run cron` | Ejecuta una vez la tarea de recordatorios y publicación (con `npm run dev` corriendo) |
| `npm run db:types` | Regenera los tipos de TypeScript desde la base local |
| `npm run db:bundle` | Regenera `supabase/setup.sql` a partir de `supabase/migrations/` |

### Estructura

```
src/app/(auth)/            Login y registro
src/app/(app)/             App con sesión: inicio, calendario, clientes, medios, métricas, equipo, ajustes
src/app/(app)/publicaciones/  Editor, vistas previas, panel de publicación
src/app/aprobar/[token]/   Portal público de aprobación del cliente
src/app/api/cron/publicar/ Tarea por minuto (recordatorios y publicación con Meta)
src/app/api/meta/          Conexión OAuth con Meta
src/app/api/reportes/      Reporte mensual en PDF
src/lib/                   Lógica compartida (reglas de publicación, fechas, Meta, cifrado, métricas)
supabase/migrations/       Esquema, RLS, almacenamiento y funciones
supabase/tests/rls.sql     Pruebas de permisos por rol
e2e/                       Pruebas de Playwright por fase
```

### Seguridad

- Row Level Security en todas las tablas: el rol (admin, editor o solo lectura) se valida en la base de datos, no solo en la interfaz.
- Los enlaces de aprobación usan 32 bytes aleatorios. Solo se guarda su hash SHA-256, se pueden revocar y vencen.
- Los tokens de Meta se cifran con AES-256-GCM, en una tabla sin acceso desde el navegador.
- Los archivos de clientes están en un bucket privado con URLs firmadas temporales.
- La tarea automática exige `CRON_SECRET`, comparado en tiempo constante.
- Las invitaciones solo se aceptan con el correo confirmado de la cuenta.

### Limitaciones conocidas

- La integración con Meta está probada con una API simulada (`npm run test:meta`), no contra Meta real. Hace falta una app de Meta aprobada para usarla con clientes.
- En Facebook, los reels se publican como video normal.
- TikTok, LinkedIn y X funcionan en modo manual (recordatorio, copiar, descargar y marcar como publicado).
- Las métricas se registran a mano cada mes; no se leen automáticamente de las redes.
- Los avisos aparecen dentro de la app (campana 🔔); no se envían por correo ni como notificaciones del celular.
