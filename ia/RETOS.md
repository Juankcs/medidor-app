# Retos de excelencia de IA (`medidor-api`)

El punto 10 pide elegir **al menos 2** retos y justificarlos con evidencia.
En este proyecto implementamos **5 retos complementarios** para cubrir todas las
capas de defensa en profundidad.

---

## Reto 1 (10.1) — Hook `PreToolUse` propio con código 2 en `stderr` y pruebas en `node:test`

### Justificación

Las reglas `permissions.deny` de Claude Code (`Bash(curl *)`, `Read(**/.env*)`)
no inspeccionan comandos compuestos (`sh -c '...'`), rutas al binario
(`/usr/bin/curl`) ni argumentos de comandos de shell (`cat .env.local`,
`ls ..`). Un hook `PreToolUse` recibe el JSON de cada herramienta antes de
ejecutarse y, si devuelve código de salida `2`, Claude Code aborta la llamada y
le entrega el `stderr` al modelo.

### Archivos de evidencia

- [`.claude/hooks/guard.mjs`](../.claude/hooks/guard.mjs) — implementación sin
  dependencias externas, falla cerrada si la entrada no es JSON válido.
- [`.claude/hooks/guard.test.mjs`](../.claude/hooks/guard.test.mjs) — **13
  pruebas** con `node:test` (10 casos requeridos + 3 de borde/proceso).

### Cómo reproducirlo

```bash
npm run test:hooks
```

Salida real verificada:

```
✔ 1. bloquea Read de .env.local (y variantes .env*)
✔ 2. permite leer env.example y código normal
✔ 3. bloquea claves y cuentas de servicio
✔ 4. bloquea rutas fuera del proyecto (.., ~ y absolutas)
✔ 5. bloquea curl, wget, sudo y /usr/bin/curl en Bash
✔ 6. bloquea comandos Bash que mencionan .env*
✔ 7. bloquea comandos Bash que salen del proyecto
✔ 8. permite comandos de trabajo normales
✔ 9. Grep y Glob no pueden apuntar a .env* ni fuera del proyecto
✔ 10. el proceso sale con código 2 y explica el motivo en stderr
✔ 11. el proceso sale con código 0 para acciones permitidas
✔ 12. falla cerrado si la entrada no es JSON válido
✔ 13. utilidades: estaDentro y tokenizar
ℹ tests 13 | pass 13 | fail 0
```

---

## Reto 2 (10.3) — Cero secretos reales en disco: repositorio en memoria + Firebase Emulator Suite con script de siembra

### Justificación

La mejor forma de que un asistente de IA nunca filtre una clave de producción es
**que la clave no exista en el disco de desarrollo**. En local trabajamos de dos
formas sin credenciales:

1. `REPOSITORIO=memoria` (por defecto): la API arranca con las zonas del campus
   en memoria sin tocar red ni credenciales.
2. `REPOSITORIO=firestore` + `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` con el
   proyecto `demo-medidor` (el prefijo `demo-` le indica al Firebase Emulator
   Suite que opere 100 % offline sin cuenta de servicio).

### Archivos de evidencia

- [`firebase.json`](../firebase.json) — configuración del emulador de Firestore en `127.0.0.1:8080`.
- [`scripts/sembrar.mjs`](../scripts/sembrar.mjs) — script `npm run sembrar` que
  puebla las 6 zonas del campus y 6 mediciones iniciales en el emulador sin credenciales.
- [`src/lib/firebase.ts`](../src/lib/firebase.ts) — cuando detecta
  `FIRESTORE_EMULATOR_HOST`, inicializa `firebase-admin` solo con `projectId`
  (sin `cert()`).

### Cómo reproducirlo

```bash
# Terminal 1: levantar el emulador de Firestore sin cuenta de servicio
npx firebase-tools emulators:start --only firestore --project demo-medidor

# Terminal 2: sembrar las zonas y mediciones de prueba
npm run sembrar
```

---

## Reto 3 (10.4) — Escaneo de secretos con `gitleaks` en `pre-commit` y CI

### Justificación

Si por error humano alguien intenta hacer commit de un token o clave privada en
un archivo permitido, `.husky/pre-commit` y el job `secretos` de GitHub Actions
ejecutan `gitleaks` y detienen el commit o hacen fallar el PR.

### Archivos de evidencia

- [`.gitleaks.toml`](../.gitleaks.toml) — extiende las reglas oficiales de `gitleaks`.
- [`.husky/pre-commit`](../.husky/pre-commit) — corre `gitleaks git --pre-commit --staged --redact --verbose`.
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — job `secretos` con `gitleaks/gitleaks-action@v2`.

### Prueba con clave falsa plantada

Al preparar un archivo temporal con un token con formato de clave privada RSA o
AWS (`AKIAIOSFODNN7EXAMPLE`) y pasarlo por `gitleaks git --pre-commit --staged`,
`gitleaks` devuelve código `1` (`leaks found: 1`) y `.husky/pre-commit` aborta
el commit.

---

## Reto 4 (10.5) — Subagente y comando `/revisar` de solo lectura

### Justificación

Separar el agente que escribe código del agente que lo audita evita que el mismo
contexto justifique sus propios atajos. El subagente `revisor` solo tiene
herramientas de lectura (`Read, Grep, Glob, Bash`), ejecuta `npm run check` y
contrasta el `git diff` contra `AGENTS.md`.

### Archivos de evidencia

- [`.claude/agents/revisor.md`](../.claude/agents/revisor.md)
- [`.claude/commands/revisar.md`](../.claude/commands/revisar.md)

### Cómo reproducirlo

En Claude Code, antes de hacer commit, ejecutar:

```
/revisar
```

---

## Reto 5 (10.7) — Informe de inyección de prompt con 3 ataques y cómo los frena la configuración

Documentado completo en [`ia/INFORME-INYECCION.md`](./INFORME-INYECCION.md).
