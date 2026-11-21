# medidor-app — App móvil del Medidor de ruido del campus

Aplicación móvil construida con **Expo SDK 58**, **React Native**, **TypeScript
strict** y **`expo-audio`** (`useAudioStream`) que mide el nivel de ruido de una
zona del campus en decibeles **sin guardar ni enviar audio** y compara las zonas
más ruidosas y más silenciosas consumiendo `medidor-api`.

- Índice de configuración y evidencias de IA: [IA.md](./IA.md)
- Reglas para asistentes de IA: [AGENTS.md](./AGENTS.md)

## Cómo garantiza que nunca se guarda audio

1. Usa `useAudioStream` de `expo-audio`, que entrega buffers PCM `float32` en
   memoria (`onBuffer`).
2. En cada callback, `pcmANivelDb` calcula el valor RMS
   ($20 \log_{10}(\text{RMS}) + \text{calibración}$), guarda **solo el número en
   dB** y descarta el buffer PCM inmediatamente.
3. **Nunca** se invoca `startFileRecordingAsync` ni se instala
   `expo-file-system`.
4. Al detener la medición, la app envía a `POST /api/mediciones` únicamente el
   resumen numérico: `{ zonaId, leqDb, minDb, maxDb, duracionSeg, muestras }`.

## Comandos principales

```bash
npm install          # instala dependencias
npm start            # inicia el servidor de desarrollo de Expo
npm run check        # typecheck + lint + format:check + test (cobertura >= 80%) + test:hooks
npm run test         # Jest con cobertura en src/domain y src/services
npm run test:hooks   # 13 pruebas del hook PreToolUse (.claude/hooks/guard.test.mjs)
npm run build        # exporta el bundle de producción (expo export)
```

## Estructura y capas

```
App.tsx                         -> Navegación por pestañas (Medir zona / Ranking del campus)
src/screens/PantallaMedir.tsx   -> UI de selección de zona y lectura instantánea en dB
src/screens/PantallaRanking.tsx -> UI comparativa de zonas más ruidosas y más silenciosas
src/hooks/useMedidor.ts         -> Conecta useAudioStream (PCM en vivo) con SesionMedicion
src/services/sesionMedicion.ts  -> Acumula escalares dB en memoria y resume la sesión
src/services/clienteApi.ts      -> Cliente HTTP con validación en tiempo de ejecución (sin `as`)
src/domain/acustica.ts          -> Lógica pura: pcmANivelDb, promedioEnergetico (Leq), clasificar
src/domain/zonas.ts             -> Catálogo inicial de zonas del campus
tests/                          -> Pruebas unitarias Jest (98.85 % cobertura de líneas)
```

## Justificación de dependencias (punto 7)

### Dependencias de producción (`dependencies`)

| Paquete                                    | Justificación                                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `expo` (~58.0.26)                          | Runtime y SDK base del proyecto móvil.                                                                                                       |
| `expo-audio` (~58.0.12)                    | Módulo oficial de audio en Expo SDK 58; provee `useAudioStream` para leer buffers PCM del micrófono en memoria sin grabar archivos en disco. |
| `expo-status-bar` (~58.0.5)                | Control de la barra de estado del sistema operativo.                                                                                         |
| `react` (19.3.0) / `react-native` (0.88.1) | Motor de interfaz nativa móvil.                                                                                                              |

### Dependencias de desarrollo (`devDependencies`)

| Paquete                                     | Justificación                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `typescript`, `@types/react`, `@types/jest` | Verificación de tipos con `strict: true` y `noUncheckedIndexedAccess: true`.                                            |
| `eslint`, `eslint-config-expo`              | Linter estático con flat config (`eslint.config.mjs`) y reglas de complejidad/tamaño.                                   |
| `prettier`                                  | Formateo consistente verificado en `npm run format:check`.                                                              |
| `jest`, `jest-expo`                         | Pruebas unitarias con cobertura obligatoria ≥ 80 % en `src/domain` y `src/services`.                                    |
| `husky`, `lint-staged`                      | Hooks de Git (`pre-commit` con `gitleaks` + `lint-staged`, `commit-msg` convencional y `pre-push` con `npm run check`). |
