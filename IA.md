# IA.md — Índice de configuración y evidencias de IA (`medidor-app`)

Este repositorio aplica defensa en profundidad para trabajar con asistentes de IA
(Claude Code / agentes compatibles) sin exponer secretos, salir del directorio
del proyecto, guardar audio del micrófono ni aceptar código que no supere
`npm run check`.

## Índice de archivos

| Archivo                                                        | Propósito                                                                 | Punto de la guía              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------- |
| [AGENTS.md](./AGENTS.md)                                       | Reglas del proyecto para la IA (≤ 100 líneas, escritas por el equipo)     | 1 · Reglas del proyecto       |
| [CLAUDE.md](./CLAUDE.md)                                       | Puntero `@AGENTS.md` para Claude Code                                     | 1 · Reglas del proyecto       |
| [.claude/settings.json](./.claude/settings.json)               | Permisos (`deny`/`ask`/`allow`), sandbox y hook `PreToolUse`              | 2, 3, 4 · Contención          |
| [.claude/hooks/guard.mjs](./.claude/hooks/guard.mjs)           | Hook `PreToolUse` propio (sale con código 2 y motivo en `stderr`)         | 5, 10.1 · Hook propio         |
| [.claude/hooks/guard.test.mjs](./.claude/hooks/guard.test.mjs) | 13 pruebas unitarias y de proceso con `node:test`                         | 10.1 · Pruebas del hook       |
| [.claude/agents/revisor.md](./.claude/agents/revisor.md)       | Subagente revisor de solo lectura (`npm run check` + diff vs `AGENTS.md`) | 10.5 · Subagente revisor      |
| [.claude/commands/revisar.md](./.claude/commands/revisar.md)   | Comando `/revisar` que invoca al subagente revisor                        | 10.5 · Comando revisor        |
| [env.example](./env.example)                                   | Plantilla sin `.env` delante (solo variables públicas `EXPO_PUBLIC_*`)    | 2 · Secretos fuera de alcance |
| [ia/CONFIGURACION.md](./ia/CONFIGURACION.md)                   | Riesgos que cubre cada barrera, sus límites y ajustes realizados          | 11 · Evidencias               |
| [ia/PRUEBAS-CONTENCION.md](./ia/PRUEBAS-CONTENCION.md)         | Las 10 pruebas obligatorias con canario y comparación con/sin regla       | 9, 11 · Pruebas de contención |
| [ia/BITACORA.md](./ia/BITACORA.md)                             | Bitácora de sesiones y ≥ 3 rechazos/correcciones a propuestas de la IA    | 8, 11 · Cómo trabajar con IA  |
| [ia/RETOS.md](./ia/RETOS.md)                                   | Retos de excelencia implementados, evidencia y pasos para reproducirlos   | 10, 11 · Retos de excelencia  |
| [ia/INFORME-INYECCION.md](./ia/INFORME-INYECCION.md)           | Informe de 3 ataques de prompt injection (archivo, API, dependencia)      | 10.7 · Informe de inyección   |
