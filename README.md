# flotaBus MVP

Consola Astro/Tailwind para autenticación y CRUD de choferes, con API NestJS, Prisma/PostgreSQL, JWT en cookie `httpOnly`, CSRF y roles.

## Desarrollo

1. Copia `backend/.env.example` a `backend/.env` y completa variables localmente. No subas `.env`. Para este despliegue `DATABASE_URL` y `DIRECT_URL` deben ser URLs PostgreSQL (`postgresql://` o `postgres://`); no uses `prisma://` ni `prisma+postgres://` porque Accelerate/Data Proxy no está habilitado.
2. `cd backend && npm install && npm run prisma:generate && npm run start:dev`
3. En otra terminal: `cd frontend && npm install && npm run dev`

`DATABASE_URL` y `DIRECT_URL` son obligatorias para `prisma migrate deploy` y el seed. `DATABASE_URL` puede ser una URL pooler PostgreSQL para la aplicación y `DIRECT_URL` una URL PostgreSQL directa para migraciones. En producción configura ambas como secretos del entorno, nunca en código.

### Prisma: reinicio y regeneración segura

Este backend usa el engine `library` de Prisma para PostgreSQL directo. Los scripts `prisma:*` ejecutan primero un guard que rechaza variables heredadas de Data Proxy/Accelerate (`PRISMA_GENERATE_DATAPROXY`, `PRISMA_GENERATE_ACCELERATE`, `PRISMA_ACCELERATE_URL`) y tipos de engine distintos de `library`/`binary`. Si el guard falla, elimina esas variables del proceso/servicio y no conviertas `DATABASE_URL` a `prisma://`.

Para aplicar la corrección tras cambiar entorno o dependencias: detén todos los procesos Nest (`Ctrl+C`; en Windows verifica `Get-Process node` y detén solo los procesos del backend), ejecuta `npm run prisma:validate`, `npm run prisma:generate`, `npm run build` y luego inicia de nuevo con `npm run start:dev` o `npm start`. El cliente generado en `node_modules/.prisma/client` debe regenerarse en el mismo directorio `backend`; `prisma migrate status` confirma el estado de migraciones sin modificar la base.

## API

`GET /health` devuelve únicamente `{ "status": "ok" }` y se puede usar como health check público de Render. `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; CRUD protegido de administrador en `/drivers` y `/buses`. Los buses exponen `GET /buses?search=&page=1&limit=20` con `{data,total,page,limit}`, además de `POST`, `PATCH /buses/:id` y `DELETE /buses/:id`. Las mutaciones requieren la cookie CSRF y header `x-csrf-token`; solo `ADMINISTRADOR` puede acceder.

## Migraciones

La migración aditiva `20261009010000_add_buses` crea únicamente `buses` y su índice único de placa. Aplicar con `cd backend && npx prisma migrate deploy && npx prisma generate`. No uses `migrate reset`; cualquier rollback debe ser una migración controlada que afecte exclusivamente a `buses`.

## PWA y despliegue Vercel/Render

El frontend incluye un manifest instalable y un service worker manual (`frontend/public/sw.js`). El worker solo guarda assets públicos versionados (`/_astro/`, `/icons/`, el manifest) y las navegaciones públicas `/` y `/login` con network-first. Nunca guarda `/auth`, `/admin`, `/api`, peticiones cross-origin ni respuestas de mutaciones.

### Producción

1. En Vercel selecciona `frontend` como **Root Directory**, usa `npm run build` y `dist` como output. Configura `PUBLIC_API_URL=https://<backend-en-render>.onrender.com` (sin `/` final) como variable de producción. No necesita rewrites: las rutas Astro son archivos estáticos y `frontend/vercel.json` solo ajusta cache de PWA.
2. En Render selecciona `backend` como **Root Directory**, usa `npm ci && npm run build` como Build Command y `npm run start:render` como Start Command. Configura `GET /health` como Health Check Path. `build` ejecuta `prisma generate` antes de compilar; `start:render` ejecuta `prisma migrate deploy` antes de iniciar Nest.
3. En Render configura `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (secreto de al menos 32 caracteres), `CORS_ORIGIN=https://<frontend-en-vercel>.vercel.app` (o el dominio personalizado exacto, sin una ruta final), `COOKIE_SECURE=true` y `NODE_ENV=production`. `CORS_ORIGIN` admite una lista separada por comas de orígenes HTTPS explícitos; nunca uses `*` con cookies.
4. La sesión usa cookies `httpOnly`, `Secure` y `SameSite=None` en producción para permitir `fetch` con credenciales entre Vercel y Render; la protección CSRF exige que el token de la cookie coincida con `x-csrf-token`. En local usa `COOKIE_SECURE=false` y `SameSite=Lax` automáticamente.

Variables requeridas en producción: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `COOKIE_SECURE=true`, `NODE_ENV=production`. `PORT` es opcional: Render lo inyecta. `ADMIN_*` solo es necesario si se ejecuta el seed manualmente.

### Validación de instalación

Después del despliegue abre el frontend en HTTPS, verifica en DevTools > Application que el manifest es válido, que aparecen los dos iconos y que el worker está `activated`. Comprueba también que `https://<frontend>/manifest.webmanifest`, `/sw.js` y `/icons/icon-192.svg` responden 200; inicia sesión y confirma en Network que `/auth/*` y cualquier llamada a Render no aparecen en Cache Storage. La instalación requiere HTTPS (localhost es la excepción de desarrollo).
