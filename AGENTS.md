# AGENTS.md — flotaBus

Instrucciones para agentes que trabajen en este repo (Astro + Tailwind frontend, NestJS + Prisma backend).

## Verificación obligatoria antes de dar una tarea por terminada

- Frontend: `cd frontend && npm run lint` (astro check — 0 errores) y `npm run build`.
- Backend: `cd backend && npm test` (jest) y `npm run typecheck` (`tsc --noEmit`).
- `prisma generate` puede fallar con `EPERM` (lock del query engine por OneDrive o procesos node activos). Si el schema **no** cambió, compila directo con `npx nest build`.
- Repro al final: si corriste servidores locales, mátalos por puerto (ver "Verificación end-to-end").

## Regla dura: ids de controles dentro de formularios

**Nunca uses `id="reset"` ni `id="submit"` en controles dentro de un `<form>`.** El DOM expone los controles del form como propiedades del propio form, así que `form.reset` / `form.submit` devuelven el **elemento** en vez del método nativo y el código revienta con `TypeError: X is not a function` — típicamente al final de un flujo que por lo demás funcionó (síntoma clásico: un mensaje de error que aparece *después* de que la acción ya se completó). Usa ids como `clear-form`, `save-form`.

Evita también ids que colisionen con propiedades nativas de `HTMLFormElement`: `action`, `method`, `elements`, `length`, `name`, `target`, `enctype`, `acceptCharset`, `noValidate`, `autocomplete`.

Bug real que originó esta regla: `chofer/historial.astro` mostraba el SweetAlert "No se pudo guardar / Error inesperado." después de guardar el reporte y enviar el evento de incidencia correctamente, porque `form.reset()` apuntaba al botón "Limpiar".

## Estado de carga vs estados de contenido

Una función de "cargando" (p. ej. `setBusLoading` en `chofer/historial.astro`) solo debe alternar **su propio skeleton**. Nunca debe hacer visibles los estados de contenido (tarjeta / estado vacío): si lo hace, tras renderizar el contenido el mismo `setBusLoading(false)` vuelve a revelar el estado vacío y el usuario ve dos estados a la vez. La visibilidad de esos estados es propiedad exclusiva de quien los pinta (`renderBusCard` / `showBusEmpty`).

## `feedback` (SweetAlert2) bloquea o no, según el helper

- `feedback.error`, `feedback.info`, `feedback.confirm` → **modal**: el `Swal.fire()` solo resuelve cuando el usuario lo cierra, así que `await feedback.error(...)` **suspende el flujo** hasta entonces (el botón de envío sigue deshabilitado mientras el popup está abierto).
- `feedback.success` → toast: no bloquea.

No encadenes pasos críticos después de `await feedback.error(...)` asumiendo que corren de inmediato; y si un error debe verse sin bloquear, usa un toast.

## Doble init y listeners en el shell SPA

Las páginas de chofer corren dos veces en carga completa (ejecución del módulo + evento `astro:page-load`); en navegación SPA solo corre el listener que se registró la primera vez (`loadScripts` no re-ejecuta un módulo cuyo `<script src>` ya está en el documento). Por eso:

- Los listeners de form se protegen con una marca **en el elemento** (`form.__bound = true`), no con variables de módulo.
- Las mutaciones deben ser idempotentes: el backend ya lo es para `INCIDENT` (`rule.to === trip.status` devuelve el viaje sin duplicar evento), lo que hace seguro reintentar.

## Backend: viajes, estados y unidad del chofer

- `ACTIVE_TRIP_STATUSES` (`backend/src/driver-portal/driver-portal.service.ts`) decide qué viajes ven los choferes. Incluye `INCIDENT` y `ARRIVED` a propósito: sin ellos el viaje desaparecía del panel y quedaba trabado sin salida.
- `activeAssignment` (manda sobre `activeTrip` y los controles del viaje) y `busAssignment` (manda sobre `currentBus`) están **separados** a propósito: el bus no debe desaparecer del panel del chofer cuando el viaje se cierra (`busAssignment = activeAssignment ?? assignmentsWithTrip[0]`).
- Eventos por tramo (`STARTED`/`ARRIVED` con `legId`) los maneja `markLegEvent`: valida secuencia, inicia el viaje a `IN_TRANSIT` (mismo estado que `RESUME`) y rechaza viajes `CANCELLED`/`RETURNED`.
- El frontend no debe adivinar qué tramo toca: `currentLeg` es por construcción el primer tramo sin llegada confirmada.

## Verificación end-to-end de UI (sin test runner de UI)

Se puede reproducir el flujo real en un navegador headless vía CDP desde Node (WebSocket es global en Node ≥ 22):

1. Lanza `msedge.exe --headless=new --remote-debugging-port=9222`, conecta a `webSocketDebuggerUrl` de `/json/list`.
2. Inyecta la sesión con una página temporal en `frontend/public/` que escriba el JWT en `sessionStorage` (`flotabus_session_token`) y redirija a la ruta a probar. **Bórrala al terminar.**
3. `Runtime.evaluate` para rellenar campos y `form.requestSubmit()`; captura `Runtime.exceptionThrown` y `Runtime.consoleAPICalled`.
4. Excepciones capturadas por un `catch` propio de la página **no** llegan a `Runtime.exceptionThrown`: usa un div oculto de trazas (`__s('paso')`) o `window.onunhandledrejection` para ver la secuencia real, y vuelca el DOM final con `--dump-dom`.

Al terminar:

- Matar los procesos de prueba **por puerto**: en Windows matar el proceso de `npm` **no** mata a sus hijos (`astro`), y varios `astro dev` huérfanos provocan cuelgues falsos:
  `powershell -Command "Get-NetTCPConnection -LocalPort 3000,4321 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
- `spawn('npm.cmd', ...)` requiere `shell: true` (Node moderno rechaza `.cmd` sin shell).
- El pooler de Supabase tarda **5-8 s por request** desde local: las esperas de reproducción deben ser ≥ 45 s o darán falsos negativos.
- Para descartar popups de SweetAlert en pruebas automatizadas, clickea `.swal2-popup .swal2-confirm` en un loop.
