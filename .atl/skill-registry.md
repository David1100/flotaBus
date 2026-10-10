# Skill Registry

**Delegator use only.** This registry catalogs available user skills and compact rules for delegated work.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| instalar Forja, montar/crear/actualizar/diagnosticar bot, idioma/moneda, pausar chat, forjabot, Horizontes IA | forja | `C:\Users\acevd\.claude\skills\forja\SKILL.md` |
| crear skill, agregar instrucciones de agente, documentar patrones para IA | skill-creator | `C:\Users\acevd\.config\opencode\skills\skill-creator\SKILL.md` |
| judgment day, judgment-day, review adversarial, dual review, doble review, juzgar | judgment-day | `C:\Users\acevd\.config\opencode\skills\judgment-day\SKILL.md` |
| crear GitHub issue, reportar bug, solicitar feature | issue-creation | `C:\Users\acevd\.config\opencode\skills\issue-creation\SKILL.md` |
| crear PR, abrir pull request, preparar cambios para revisión | branch-pr | `C:\Users\acevd\.config\opencode\skills\branch-pr\SKILL.md` |
| escribir tests Go, teatest, cobertura | go-testing | `C:\Users\acevd\.config\opencode\skills\go-testing\SKILL.md` |
| deploy app/site, publicar en Vercel, preview deployment | deploy-to-vercel | `C:\Users\acevd\.agents\skills\deploy-to-vercel\SKILL.md` |
| construir interfaces frontend, páginas, componentes, dashboards, artefactos visuales | frontend-design | `C:\Users\acevd\.agents\skills\frontend-design\SKILL.md` |
| buscar o instalar skills para una capacidad | find-skills | `C:\Users\acevd\.agents\skills\find-skills\SKILL.md` |

## Compact Rules

### forja
- Haz una pregunta por mensaje y espera respuesta durante el onboarding.
- Antes de `init`, explica el mapa y espera consentimiento; verifica Node.js y pnpm.
- Usa flags, no menús interactivos; no pidas licencia salvo que el usuario ya tenga `HZN-...`.
- Configuración y comportamiento del miembro deben vivir en `member/`, no en `src/`.
- Nunca borres `member/`; cada bot debe tener recursos Cloudflare únicos.
- Para borrar, confirma claramente y usa `npx forjabot delete --yes` solo tras el sí.
- No hagas commit, push ni deploy sin confirmación explícita.
- Nunca imprimas ni guardes credenciales en archivos del repo; prefiere secretos de Cloudflare.

### skill-creator
- Crea skills solo para patrones reutilizables, workflows complejos o convenciones específicas.
- Usa `skills/{skill-name}/SKILL.md` con frontmatter completo y nombre lowercase con guiones.
- Incluye patrones críticos, ejemplos mínimos y una sección Commands.
- Mantén referencias apuntando a archivos locales, no URLs web.
- Revisa que la skill no exista y regístrala en `AGENTS.md` cuando corresponda.

### judgment-day
- Resuelve skills antes de lanzar revisores e inyecta las mismas reglas en ambos jueces y fixer.
- Lanza dos revisores ciegos en paralelo; no hagas la revisión tú mismo.
- Clasifica hallazgos como confirmados, sospechosos o contradicciones.
- Corrige solo problemas confirmados y re-juzga; permite como máximo dos iteraciones.
- Si persisten fallos tras dos iteraciones, escala a revisión humana.

### issue-creation
- Busca duplicados antes de crear una issue.
- Usa siempre plantilla de bug o feature; las issues en blanco están deshabilitadas.
- Completa todos los campos requeridos y checks de pre-flight.
- Las nuevas issues reciben `status:needs-review`; requieren `status:approved` antes del PR.
- Las preguntas van a Discussions, no a issues.

### branch-pr
- Cada PR debe enlazar una issue aprobada y tener exactamente una etiqueta `type:*`.
- Usa ramas `type/descripcion` en lowercase y commits convencionales.
- Ejecuta shellcheck sobre scripts modificados y completa la plantilla de PR.
- Incluye `Closes/Fixes/Resolves #N`, resumen, tabla de cambios y plan de pruebas.
- No abras PR hasta que la issue tenga `status:approved`.

### go-testing
- Usa tests table-driven para múltiples casos y cubre éxito y errores.
- Para Bubbletea prueba `Model.Update` directamente en transiciones de estado.
- Usa teatest para flujos interactivos completos y golden files para salida visual.
- Mockea efectos secundarios mediante interfaces; usa `t.TempDir()` para archivos.
- Ejecuta `go test ./...`; usa `-short` para omitir integración y `-update` para golden files.

### deploy-to-vercel
- Despliega como preview salvo petición explícita de producción.
- Comprueba remote Git, `.vercel/project.json`/`repo.json`, autenticación y equipos antes de decidir.
- No uses comandos interactivos de Vercel para detectar estado sin `.vercel/`.
- Nunca hagas push sin aprobación del usuario; usa `--scope` cuando corresponda.
- Devuelve URL de preview; no hagas curl para verificarla.

### frontend-design
- Antes de programar define propósito, tono estético, restricciones y un elemento diferenciador.
- Elige una dirección visual clara y ejecútala con precisión; evita layouts genéricos.
- Usa tipografía con carácter, variables CSS, contraste intencional y composición espacial cuidada.
- Añade movimiento y profundidad donde aporten; prioriza soluciones CSS simples cuando sea posible.
- Evita Arial/Roboto/Inter, gradientes morados cliché y estética de plantilla de IA.

### find-skills
- Identifica dominio y tarea concreta antes de buscar.
- Usa `npx skills find [query]` con palabras clave específicas.
- Presenta nombre, utilidad, comando de instalación y enlace skills.sh.
- Instala solo tras confirmación del usuario usando `npx skills add ... -g -y`.
- Si no hay resultados, ofrece ayuda directa y sugiere `npx skills init`.

## Project Conventions

No project convention files found. The project directory is currently empty; no application files, manifests, tests, CI, or VCS metadata were detected.
