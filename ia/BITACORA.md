# Bitácora de trabajo con IA (`medidor-app`)

Metodología aplicada en todas las sesiones (punto 8):

1. Una tarea pequeña por sesión.
2. Empezar en **modo plan** (la IA lee y propone, sin editar archivos).
3. Pedir primero la prueba que falla (`tests/**`) con criterios de aceptación.
4. Revisar el `git diff` línea por línea y correr `npm run check` antes de cada commit.
5. Nunca pegar secretos ni `.env` en el prompt.

---

## Registro de sesiones

### Sesión 1 — Configuración de contención, hook `PreToolUse` y reglas de calidad

- **Propósito**: Configurar `AGENTS.md`, `.claude/settings.json`,
  `.claude/hooks/guard.mjs`, `eslint.config.mjs` (con `eslint-config-expo`) y
  `jest.config.js` con umbral ≥ 80 % antes de generar código de la app.
- **Evidencia**: `.claude/settings.json`, `.claude/hooks/guard.mjs`,
  `.claude/hooks/guard.test.mjs`, `eslint.config.mjs`, `jest.config.js`.
- **Validación**: `npm run test:hooks` (13/13 pruebas) y las 10 pruebas de
  contención con el canario `CANARIO=ZZZ-NO-ES-UN-SECRETO`.
- **Decisión**: Reemplazar el `AGENTS.md` y `.claude/settings.json` genéricos que
  creaba la plantilla de `create-expo-app` por nuestras reglas propias de ≤ 100
  líneas y contención real.

### Sesión 2 — Conversión de PCM a dB en memoria sin guardar audio (`src/domain/acustica.ts`)

- **Propósito**: Transformar cada ventana PCM `float32` del micrófono en un
  único escalar en dB ($20 \log_{10}(\text{RMS}) + \text{calibración}$),
  descartar el buffer inmediatamente y calcular el $L_{eq}$ de la sesión.
- **Evidencia**: `tests/domain/acustica.test.ts`, `src/domain/acustica.ts`,
  `src/services/sesionMedicion.ts`.
- **Validación**: `jest --coverage` con **100 % de líneas** en `src/domain` y
  **98.21 % de líneas** en `src/services`.
- **Decisión**: Usar `useAudioStream` de `expo-audio` en lugar de grabar archivos
  temporales en caché (ver Caso 1 abajo).

### Sesión 3 — Cliente HTTP con validación sin `as` y pantallas de medición y ranking

- **Propósito**: Consumir `GET /api/zonas`, `POST /api/mediciones` y
  `GET /api/ranking` validando cada respuesta externa y mostrar las zonas más
  ruidosas y más silenciosas.
- **Evidencia**: `src/services/clienteApi.ts`, `tests/services/servicios.test.ts`,
  `src/screens/PantallaMedir.tsx`, `src/screens/PantallaRanking.tsx`, `App.tsx`.
- **Validación**: `npm run check` en verde.
- **Decisión**: Dividir `App.tsx` en `BarraPestanas` y `useControladorCampus`
  para respetar `max-lines-per-function ≤ 50` y evitar llamadas síncronas a
  `setState` dentro de `useEffect`.

---

## Casos en que rechazamos o corregimos lo que propuso la IA (≥ 3)

### Caso 1 (Rechazado) — Usar `expo-av` o grabar un `.m4a` temporal en disco para medir el ruido

- **Qué propuso inicialmente la IA**: Importar `Audio.Recording` de `expo-av`
  (deprecado en SDK 58) o grabar un archivo de audio en caché y borrarlo al
  terminar la medición.
- **Por qué lo rechazamos**:
  1. El enunciado del proyecto exige **medir el nivel de ruido sin guardar
     audio**: ni siquiera un archivo temporal en caché debe escribirse en disco.
  2. En Expo SDK 58 el paquete actual es `expo-audio`, que ofrece
     `useAudioStream({ onBuffer })` para recibir buffers PCM en memoria sin
     llamar nunca a `startFileRecordingAsync`.
- **Corrección aplicada**: Inspeccionamos `node_modules/expo-audio/build/AudioStream.types.d.ts`,
  desinstalando `expo-file-system` porque no escribimos ningún archivo, y
  calculamos el RMS directamente sobre el `Float32Array` de cada callback.

### Caso 2 (Rechazado) — Usar `as Categoria` y `as unknown as Response` en el cliente y sus pruebas

- **Qué propuso inicialmente la IA**: En `esCategoria` usar
  `CATEGORIAS.has(v as Categoria)` y en las pruebas crear un mock con
  `{ ok: true, status, json: async () => cuerpo } as unknown as Response`.
- **Por qué lo rechazamos**: La regla
  `@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]`
  prohíbe cualquier `as` para callar errores de tipos.
- **Corrección aplicada**: En `esCategoria` comparamos explícitamente los 4
  literales de unión (`v === 'silencioso' || ...`), y en las pruebas construimos
  instancias reales con `new Response(JSON.stringify(cuerpo), { status })`.

### Caso 3 (Rechazado) — Dejar el `AGENTS.md` y `.claude/settings.json` por defecto de `create-expo-app`

- **Qué ocurrió**: La plantilla `blank-typescript` de Expo SDK 58 incluye un
  `AGENTS.md` genérico en inglés y un `.claude/settings.json` que solo tenía
  `{"enabledPlugins": {"expo@claude-plugins-official": true}}`, sin ninguna
  regla `deny`, sin sandbox y sin hook.
- **Por qué lo rechazamos**: El punto 1 exige un `AGENTS.md` escrito por el
  equipo (≤ 100 líneas) con las reglas y prohibiciones del proyecto, y los
  puntos 2–4 exigen `permissions.deny`, `ask`, `sandbox` y bloqueo fuera del
  directorio desde el primer commit.
- **Corrección aplicada**: Eliminamos los archivos de plantilla y escribimos
  nuestro `AGENTS.md` (67 líneas), `CLAUDE.md` (`@AGENTS.md`) y
  `.claude/settings.json` completo con hook `PreToolUse`.

### Caso 4 (Corregido) — `App()` de 76 líneas y `useEffect` que disparaba `react-hooks/set-state-in-effect`

- **Qué ocurrió**: En el primer borrador de `App.tsx`, la función `App` tenía 76
  líneas (superando el máximo de 50) y llamaba a `void cargarRanking()` dentro
  de un `useEffect`.
- **Corrección aplicada**: Extrajimos `BarraPestanas` y el hook
  `useControladorCampus`, y disparamos la carga del ranking al pulsar la pestaña
  "Ranking del campus" o al terminar de enviar una medición.
