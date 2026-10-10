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

`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; CRUD protegido de administrador en `/drivers` y `/buses`. Los buses exponen `GET /buses?search=&page=1&limit=20` con `{data,total,page,limit}`, además de `POST`, `PATCH /buses/:id` y `DELETE /buses/:id`. Las mutaciones requieren la cookie CSRF y header `x-csrf-token`; solo `ADMINISTRADOR` puede acceder.

## Migraciones

La migración aditiva `20261009010000_add_buses` crea únicamente `buses` y su índice único de placa. Aplicar con `cd backend && npx prisma migrate deploy && npx prisma generate`. No uses `migrate reset`; cualquier rollback debe ser una migración controlada que afecte exclusivamente a `buses`.
