#!/usr/bin/env node
// Hook PreToolUse de Claude Code (reto 10.1).
// Recibe por stdin el JSON de la herramienta que la IA quiere usar.
// Si la acción toca secretos, sale del proyecto o usa curl/wget/sudo:
// escribe el motivo en stderr y sale con código 2 (Claude Code la bloquea).
// No reemplaza al sandbox: es una capa más, que falla cerrada.
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ARCHIVO_SECRETO =
  /(^|[\\/])(\.env[^\\/]*|[^\\/]*\.(pem|key|keystore|jks|p12|p8)|[^\\/]*firebase-adminsdk[^\\/]*\.json)$/i;
const MENCION_ENV = /(^|[\s'"=:/\\(<>|;&*])\.env/i;
const MENCION_LLAVE = /\.(pem|key|keystore|jks|p12|p8)\b|firebase-adminsdk/i;
const COMANDO_RED_O_ROOT = /(^|[^\w.-])(sudo|curl|wget)(?![\w.-])/;
const RAIZ_ABSOLUTA =
  /^(\/(etc|home|root|Users|mnt|proc|var|usr|opt|bin|sbin|sys|run|srv|boot|lib|media|c|d)(\/|$)|[A-Za-z]:[\\/])/;
const RUTAS_SISTEMA_PERMITIDAS = ['/dev/null', '/tmp'];
const HERRAMIENTAS_ARCHIVO = new Set(['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

/** Devuelve true si `destino` queda dentro de `raiz`. */
export function estaDentro(raiz, destino) {
  const absoluto = path.resolve(raiz, destino);
  const relativo = path.relative(raiz, absoluto);
  return relativo === '' || (!relativo.startsWith('..') && !path.isAbsolute(relativo));
}

function bloqueo(motivo) {
  return { bloquear: true, motivo };
}

const PERMITIR = { bloquear: false, motivo: '' };

function revisarRuta(ruta, raiz) {
  if (typeof ruta !== 'string' || ruta === '') return PERMITIR;
  if (ARCHIVO_SECRETO.test(ruta)) return bloqueo(`archivo de secretos: ${path.basename(ruta)}`);
  if (ruta.startsWith('~')) return bloqueo(`ruta fuera del proyecto: ${ruta}`);
  if (!estaDentro(raiz, ruta)) return bloqueo(`ruta fuera del proyecto: ${ruta}`);
  return PERMITIR;
}

function revisarPatron(patron) {
  if (typeof patron !== 'string') return PERMITIR;
  if (MENCION_ENV.test(patron) || patron.startsWith('.env')) {
    return bloqueo(`patrón que apunta a .env*: ${patron}`);
  }
  return PERMITIR;
}

function esRutaSistemaPermitida(token) {
  return RUTAS_SISTEMA_PERMITIDAS.some((p) => token === p || token.startsWith(`${p}/`));
}

function tokenSaleDelProyecto(token, raiz) {
  if (token.startsWith('~') || /\$\{?HOME\}?/.test(token)) return true;
  if (esRutaSistemaPermitida(token)) return false;
  const pareceRuta = RAIZ_ABSOLUTA.test(token) || /(^|[\\/])\.\.([\\/]|$)/.test(token);
  return pareceRuta && !estaDentro(raiz, token);
}

/** Separa un comando en "palabras" aproximadas (sin comillas, cortando en = y ;). */
export function tokenizar(comando) {
  return comando
    .split(/[\s;&|()<>=,]+/)
    .map((t) => t.replace(/^['"`]+|['"`]+$/g, ''))
    .filter((t) => t !== '');
}

function revisarComando(comando, raiz) {
  if (typeof comando !== 'string') return PERMITIR;
  const red = COMANDO_RED_O_ROOT.exec(comando);
  if (red) return bloqueo(`comando prohibido: ${red[2]}`);
  if (MENCION_ENV.test(comando)) return bloqueo('el comando menciona un archivo .env*');
  if (MENCION_LLAVE.test(comando))
    return bloqueo('el comando menciona una clave o cuenta de servicio');
  const fuera = tokenizar(comando).find((t) => tokenSaleDelProyecto(t, raiz));
  if (fuera) return bloqueo(`el comando sale del proyecto: ${fuera}`);
  return PERMITIR;
}

function primeraFalla(resultados) {
  return resultados.find((r) => r.bloquear) ?? PERMITIR;
}

/** Decide si una llamada a herramienta se bloquea. Función pura, fácil de probar. */
export function evaluar(entrada, raiz) {
  const nombre = entrada?.tool_name;
  const datos = entrada?.tool_input ?? {};
  if (HERRAMIENTAS_ARCHIVO.has(nombre)) {
    return revisarRuta(datos.file_path ?? datos.notebook_path, raiz);
  }
  if (nombre === 'Grep' || nombre === 'Glob') {
    return primeraFalla([
      revisarRuta(datos.path, raiz),
      revisarPatron(datos.glob),
      nombre === 'Glob' ? revisarPatron(datos.pattern) : PERMITIR,
    ]);
  }
  if (nombre === 'Bash') return revisarComando(datos.command, raiz);
  return PERMITIR;
}

function leerEntrada() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const entrada = leerEntrada();
  if (entrada === null) {
    process.stderr.write('guard.mjs: entrada JSON inválida; se bloquea por seguridad.\n');
    process.exit(2);
  }
  const raiz = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
  const resultado = evaluar(entrada, raiz);
  if (resultado.bloquear) {
    process.stderr.write(
      `Bloqueado por .claude/hooks/guard.mjs: ${resultado.motivo}. ` +
        'Regla del proyecto (AGENTS.md): no leer secretos, no salir de la carpeta, ' +
        'no usar curl/wget/sudo. No intente rodear el bloqueo; pregunte a la persona.\n',
    );
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
