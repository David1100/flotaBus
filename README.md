# flotaBus MVP

Consola Astro/Tailwind para autenticación y CRUD de choferes, con API NestJS, Prisma/PostgreSQL, JWT en cookie `httpOnly`, CSRF y roles.

## Desarrollo

1. Copia `backend/.env.example` a `backend/.env` y completa variables localmente. No subas `.env`. Para este despliegue `DATABASE_URL` y `DIRECT_URL` deben ser URLs PostgreSQL (`postgresql://` o `postgres://`); no uses `prisma://` ni `prisma+postgres://` porque Accelerate/Data Proxy no está habilitado.
2. `cd backend && npm install && npm run prisma:generate && npm run start:dev`
3. En otra terminal: `cd frontend && npm install && npm run dev`

`DATABASE_URL` y `DIRECT_URL` son obligatorias para `prisma migrate deploy` y el seed. `DATABASE_URL` puede ser una URL pooler PostgreSQL para la aplicación y `DIRECT_URL` una URL PostgreSQL directa para migraciones. En producción configura ambas como secretos del entorno, nunca en código.

### Fotos de buses y choferes

Las fotos se suben desde el backend a Cloudinary mediante `POST /buses/:id/photo` y `POST /drivers/:id/photo`, autenticados con JWT/cookie, CSRF y rol `ADMINISTRADOR`. Solo se aceptan JPG, PNG, WEBP o GIF de hasta **5 MB**; la base de datos guarda únicamente `photoUrl` y `photoPublicId`. Configura en el backend `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y opcionalmente `CLOUDINARY_FOLDER`. Durante la transición también se aceptan los aliases `CLOUDINARY_NAME`, `CLOUDINARY_KEY` y `CLOUDINARY_SECRET`. Nunca copies estas variables al frontend ni expongas el secret. Si el secret fue compartido previamente, rótalo en Cloudinary.

### Prisma: reinicio y regeneración segura

Este backend usa el engine `library` de Prisma para PostgreSQL directo. Los scripts `prisma:*` ejecutan primero un guard que rechaza variables heredadas de Data Proxy/Accelerate (`PRISMA_GENERATE_DATAPROXY`, `PRISMA_GENERATE_ACCELERATE`, `PRISMA_ACCELERATE_URL`) y tipos de engine distintos de `library`/`binary`. Si el guard falla, elimina esas variables del proceso/servicio y no conviertas `DATABASE_URL` a `prisma://`.

Para aplicar la corrección tras cambiar entorno o dependencias: detén todos los procesos Nest (`Ctrl+C`; en Windows verifica `Get-Process node` y detén solo los procesos del backend), ejecuta `npm run prisma:validate`, `npm run prisma:generate`, `npm run build` y luego inicia de nuevo con `npm run start:dev` o `npm start`. El cliente generado en `node_modules/.prisma/client` debe regenerarse en el mismo directorio `backend`; `prisma migrate status` confirma el estado de migraciones sin modificar la base.

## API

`GET /health` devuelve únicamente `{ "status": "ok" }` y se puede usar como health check público de Render. `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; CRUD protegido de administrador en `/drivers` y `/buses`. Los buses exponen `GET /buses?search=&page=1&limit=20` con `{data,total,page,limit}`, además de `POST`, `PATCH /buses/:id` y `DELETE /buses/:id`. Las mutaciones requieren la cookie CSRF y header `x-csrf-token`; solo `ADMINISTRADOR` puede acceder.

`GET /dashboard/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&busId=&status=` devuelve los KPI y listas agregadas del dashboard administrativo. Si no se envían fechas usa el mes calendario actual hasta el momento de la consulta (`period.defaulted=true`). El endpoint está protegido por JWT y rol `ADMINISTRADOR`; incluye únicamente costos de `MaintenanceRecord` y no calcula combustible ni peajes.

## Migraciones

La migración aditiva `20261009010000_add_buses` crea únicamente `buses` y su índice único de placa. Aplicar con `cd backend && npx prisma migrate deploy && npx prisma generate`. No uses `migrate reset`; cualquier rollback debe ser una migración controlada que afecte exclusivamente a `buses`.

## PWA y despliegue Vercel/Render

El frontend incluye un manifest instalable y un service worker manual (`frontend/public/sw.js`). El worker solo guarda assets públicos versionados (`/_astro/`, `/icons/`, el manifest) y las navegaciones públicas `/` y `/login` con network-first. Nunca guarda `/auth`, `/admin`, `/api`, peticiones cross-origin ni respuestas de mutaciones.

### Producción

1. En Vercel selecciona `frontend` como **Root Directory**, usa `npm run build` y `dist` como output. Configura `PUBLIC_API_URL=https://<backend-en-render>.onrender.com` (sin `/` final) como variable de producción. No necesita rewrites: las rutas Astro son archivos estáticos y `frontend/vercel.json` solo ajusta cache de PWA.
2. Para usar Render Blueprint, selecciona **New > Blueprint**, conecta este repositorio y aplica el `render.yaml` de la raíz. El Blueprint configura `backend` como **Root Directory**, `npm ci --include=dev && npm run build` como Build Command, `npm run start:render` como Start Command y `/health` como Health Check Path. `--include=dev` es necesario porque `build` usa `prisma` y Nest CLI/TypeScript, declarados en `devDependencies`, incluso cuando Render tiene `NODE_ENV=production`; esto solo afecta la instalación de build y no elimina `NODE_ENV=production` del runtime. `build` ejecuta `prisma generate` antes de compilar; `start:render` ejecuta `prisma migrate deploy` antes de iniciar Nest.
3. Después de crear el Blueprint, completa en **Environment** los valores de `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (secreto de al menos 32 caracteres) y `CORS_ORIGIN`. Esas variables tienen `sync: false` en `render.yaml`, por lo que nunca se incluyen en el repositorio. Configura exactamente `CORS_ORIGIN=https://flota-bus.vercel.app` (sin slash final), `COOKIE_SECURE=true` y `NODE_ENV=production`. Si agregas un dominio custom, usa una lista separada por comas, por ejemplo `https://flota-bus.vercel.app,https://admin.example.com`; cada valor debe ser un origen HTTPS exacto, sin `/` final, ruta ni wildcard. No se leen `CORS_ORIGINS` ni `FRONTEND_URL`.
4. Si creas el servicio manualmente en vez de usar Blueprint, configura exactamente: **Root Directory** `backend`; **Build Command** `npm ci --include=dev && npm run build`; **Start Command** `npm run start:render`; **Health Check Path** `/health`. Mantén `NODE_ENV=production` en el entorno del servicio; `--include=dev` solo garantiza que las herramientas de compilación estén disponibles durante el build. Añade las mismas variables de entorno y secretos del paso anterior.
5. La sesión usa cookies `httpOnly`, `Secure` y `SameSite=None` en producción para permitir `fetch` con credenciales entre Vercel y Render; la protección CSRF exige que el token de la cookie coincida con `x-csrf-token`. En local usa `COOKIE_SECURE=false` y `SameSite=Lax` automáticamente.

#### Comprobación de CORS y redeploy

El servicio que atiende `https://flota-bus.onrender.com` debe ser el servicio de este Blueprint. En Render confirma que el dominio público de **ese servicio** coincide exactamente con el valor de `PUBLIC_API_URL`; una respuesta `404` con `x-render-routing: no-server` significa que el hostname no tiene un servicio activo y no es un error de allowlist. En ese caso:

1. En **Render > servicio backend > Settings**, establece **Root Directory** `backend`, **Build Command** `npm ci --include=dev && npm run build` y **Start Command** `npm run start:render`.
2. En **Environment** establece `NODE_ENV=production`, `COOKIE_SECURE=true` y `CORS_ORIGIN=https://flota-bus.vercel.app`, además de los cuatro secretos/URLs requeridos. Guarda y usa **Manual Deploy > Deploy latest commit**; espera a que el deploy termine en estado **Live**.
3. Verifica primero `https://flota-bus.onrender.com/health` (debe devolver `200` y `{ "status": "ok" }`). Luego ejecuta:

   ```bash
   curl -i -X OPTIONS https://flota-bus.onrender.com/auth/login \
     -H "Origin: https://flota-bus.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: content-type,x-csrf-token"
   ```

   Debe devolver `204`, `Access-Control-Allow-Origin: https://flota-bus.vercel.app`, `Access-Control-Allow-Credentials: true`, los métodos y `Access-Control-Allow-Headers`. Un `404`, `502` o ausencia de esos headers indica URL/servicio/deploy incorrecto, no un problema que se arregle desde el frontend.
4. En DevTools > **Network**, marca **Preserve log**, filtra `auth/login`, selecciona la solicitud `OPTIONS` y confirma `Status 204` y esos headers en **Response Headers**. En **Request Headers** confirma `Origin: https://flota-bus.vercel.app`; después la solicitud `POST` debe incluir `credentials`/cookies. Si `OPTIONS` devuelve `401/403`, el proceso activo no contiene esta versión: revisa el commit desplegado y vuelve a hacer redeploy.

Variables requeridas en producción: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN=https://flota-bus.vercel.app`, `COOKIE_SECURE=true`, `NODE_ENV=production`. `PORT` es opcional: Render lo inyecta. `ADMIN_*` solo es necesario si se ejecuta el seed manualmente. Si falta `CORS_ORIGIN`, el backend falla al arrancar con un mensaje de configuración; no usa wildcard ni acepta orígenes enviados arbitrariamente por el navegador.

La causa del error `Couldn't find a package.json file in /opt/render/project/src` es que Render estaba ejecutando `npm` desde la raíz del monorepo, donde no existe `package.json`. `rootDir: backend` hace que todos los comandos se ejecuten en `/opt/render/project/src/backend`, donde sí están `package.json` y `package-lock.json`.

### Validación de instalación

Después del despliegue abre el frontend en HTTPS, verifica en DevTools > Application que el manifest es válido, que aparecen los dos iconos y que el worker está `activated`. Comprueba también que `https://<frontend>/manifest.webmanifest`, `/sw.js` y `/icons/icon-192.svg` responden 200; inicia sesión y confirma en Network que `/auth/*` y cualquier llamada a Render no aparecen en Cache Storage. La instalación requiere HTTPS (localhost es la excepción de desarrollo).
