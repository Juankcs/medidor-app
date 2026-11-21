# Configuración de IA: barreras, límites y ajustes (`medidor-api`)

Una instrucción en `AGENTS.md` orienta al modelo, pero **no es una frontera de
seguridad**: un prompt malicioso o una alucinación pueden ignorarla. Por eso
combinamos cinco capas independientes.

## 1. Mapa de barreras y qué riesgo cubre cada una

| Capa                                             | Archivo / Mecanismo                                                                                                                                    | Riesgo que cubre                                                                                                                                                                          | Límite conocido                                                                                                       | Qué capa compensa su límite                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **0. Cero secretos en disco**                    | `env.example`, `REPOSITORIO=memoria`, Firebase Emulator (`firebase.json`)                                                                              | Que exista una clave real que pueda filtrarse                                                                                                                                             | En producción sí existen credenciales                                                                                 | Producción vive **solo en Vercel**; `vercel env pull` está prohibido                                        |
| **1. Instrucciones (`AGENTS.md`)**               | `AGENTS.md` (73 líneas) + `CLAUDE.md` (`@AGENTS.md`)                                                                                                   | Desalineación de arquitectura, estilo, capas o privacidad de audio                                                                                                                        | El modelo puede ignorarlas ante prompt injection                                                                      | Permisos + Hook + Sandbox + Linters (`npm run check`)                                                       |
| **2. Permisos de herramientas**                  | `.claude/settings.json` → `permissions.deny` / `ask` / `allow`, `blockReadsOutsideWorkingDirectories: true`, `disableBypassPermissionsMode: "disable"` | Uso directo de `Read`/`Edit` sobre `.env*`, claves, `.claude/**` o rutas fuera del repo                                                                                                   | `Read(**/.env*)` no inspecciona un script de `node -e` ni `/usr/bin/curl`                                             | Hook `PreToolUse` (`guard.mjs`) + Sandbox del SO (`bubblewrap`)                                             |
| **3. Hook `PreToolUse`**                         | `.claude/hooks/guard.mjs` (código de salida `2` + explicación en `stderr`)                                                                             | Comandos `Bash`, `Read`, `Edit`, `Grep` o `Glob` que mencionan `.env*`, llaves, `..`, `~`, rutas absolutas externas o `curl`/`wget`/`sudo` (incluso `/usr/bin/curl` o `sh -c 'curl ...'`) | Un script ofuscado en `node -e` que arme el nombre `".e"+"nv"` en tiempo de ejecución no menciona `.env` literalmente | `sandbox.filesystem.denyRead` + cero secretos reales en disco                                               |
| **4. Sandbox de SO (WSL2 + bubblewrap + socat)** | `.claude/settings.json` → `sandbox` (`enabled: true`, `failIfUnavailable: true`, `allowUnsandboxedCommands: false`)                                    | Acceso a `~/`, escritura en `.claude`/`.husky`/`.git/hooks`, lectura de `.env.local` desde subprocesos y salida de red a dominios no autorizados                                          | En Windows nativo no existe `bubblewrap`; además `bwrap` monta directorios completos                                  | Ejecutar Claude Code en **WSL2 (Ubuntu)** con `bubblewrap` y `socat`, más `denyRead` explícito de `./.env*` |

## 2. Orden de evaluación y decisiones clave

1. **Orden `deny → ask → allow`**: en `permissions`, una regla `allow` nunca
   abre excepciones dentro de un `deny`. Por ejemplo, aunque `git add` y
   `git commit` están en `allow`, `git push` cae en `ask` y `git push --force`
   cae en `deny`.
2. **`env.example` sin punto inicial**: la regla `Read(**/.env*)` y el hook
   bloquean cualquier archivo cuyo nombre empiece por `.env`. Si la plantilla se
   llamara `.env.example`, la IA no podría leerla para saber qué variables usa
   el proyecto. Por eso se publica como `env.example`.
3. **Protección de la propia jaula**:
   - `Edit(./.claude/**)`, `Edit(./.husky/**)` y `Edit(./.git/**)` están en
     `permissions.deny`.
   - `sandbox.filesystem.denyWrite` incluye `["./.claude", "./.husky", "./.git/hooks"]`.
   - `disableBypassPermissionsMode: "disable"` impide activar
     `--dangerously-skip-permissions`.
4. **Dominios de red mínimos (`sandbox.network.allowedDomains`)**:
   - `registry.npmjs.org`: necesario únicamente cuando la persona autoriza en
     `ask` instalar o auditar paquetes con `npm`.
   - `github.com`: necesario únicamente cuando la persona autoriza operaciones
     contra el repositorio remoto.
   - Todo otro dominio queda bloqueado por el proxy `socat` del sandbox.

## 3. Ajustes realizados durante las pruebas

- **Ajuste 1 — Rutas de flags como `/dev/null` y regex en comandos Bash**:
  Al probar el hook `guard.mjs` con comandos legítimos (`ls src > /dev/null`),
  detectamos que tratar cualquier `/` inicial como ruta absoluta bloqueaba
  redirecciones estándar. Ajustamos `guard.mjs` para permitir explícitamente
  `/dev/null` y `/tmp` y reconocer prefijos reales del sistema (`/etc`, `/home`,
  `/Users`, `/usr`, `/var`, `/mnt`, `C:\`, etc.).
- **Ajuste 2 — `denyRead` explícito para `./.env*` dentro del workspace**:
  Como `sandbox.filesystem` usa `denyRead: ["~/"]` y `allowRead: ["."]`, en
  `srt`/`bubblewrap` `allowRead: ["."]` re-habilita la carpeta del proyecto.
  Para que `node -e "fs.readFileSync('.env.local')"` falle también a nivel de
  sandbox, añadimos `"./.env"`, `"./.env.local"`, `"./.env.development.local"`,
  `"./.env.test.local"`, `"./.env.production.local"` y `"./.env.production"` en
  `sandbox.filesystem.denyRead`.
- **Ajuste 3 — Detección de `/usr/bin/curl` y `sh -c 'curl ...'`**:
  La regla `Bash(curl *)` de `permissions.deny` solo coincide con el prefijo
  `curl `. Añadimos en `guard.mjs` la expresión regular
  `/(^|[^\w.-])(sudo|curl|wget)(?![\w.-])/` que detecta el binario aunque vaya
  precedido por ruta (`/usr/bin/curl`) o envuelto en `sh -c '...'`.
