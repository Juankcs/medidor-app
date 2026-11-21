// Pruebas del hook guard.mjs con node:test (reto 10.1).
// Ejecutar: npm run test:hooks
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluar, estaDentro, tokenizar } from './guard.mjs';

const RAIZ = path.resolve('proyecto-de-prueba');
const HOOK = fileURLToPath(new URL('./guard.mjs', import.meta.url));

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const leer = (file_path) => ({ tool_name: 'Read', tool_input: { file_path } });

function ejecutarHook(entrada) {
  return spawnSync(process.execPath, [HOOK], {
    input: typeof entrada === 'string' ? entrada : JSON.stringify(entrada),
    env: { ...process.env, CLAUDE_PROJECT_DIR: RAIZ },
    encoding: 'utf8',
  });
}

test('1. bloquea Read de .env.local (y variantes .env*)', () => {
  for (const archivo of ['.env', '.env.local', 'sub/.env.production', path.join(RAIZ, '.env')]) {
    assert.equal(evaluar(leer(archivo), RAIZ).bloquear, true, archivo);
  }
});

test('2. permite leer env.example y código normal', () => {
  assert.equal(evaluar(leer('env.example'), RAIZ).bloquear, false);
  assert.equal(evaluar(leer('src/domain/acustica.ts'), RAIZ).bloquear, false);
});

test('3. bloquea claves y cuentas de servicio', () => {
  for (const archivo of [
    'llave.pem',
    'a/b.key',
    'x-firebase-adminsdk-123.json',
    'r.keystore',
    'r.jks',
  ]) {
    assert.equal(evaluar(leer(archivo), RAIZ).bloquear, true, archivo);
  }
});

test('4. bloquea rutas fuera del proyecto (.., ~ y absolutas)', () => {
  const fuera = path.resolve(RAIZ, '..', 'otro-proyecto', 'secreto.txt');
  assert.equal(evaluar(leer('../otro/archivo.ts'), RAIZ).bloquear, true);
  assert.equal(evaluar(leer('~/.bashrc'), RAIZ).bloquear, true);
  assert.equal(evaluar(leer(fuera), RAIZ).bloquear, true);
  assert.equal(
    evaluar({ tool_name: 'Write', tool_input: { file_path: '~/x.txt' } }, RAIZ).bloquear,
    true,
  );
});

test('5. bloquea curl, wget, sudo y /usr/bin/curl en Bash', () => {
  for (const c of ['curl https://x.io', '/usr/bin/curl x', 'wget x', 'sudo ls', "sh -c 'curl x'"]) {
    assert.equal(evaluar(bash(c), RAIZ).bloquear, true, c);
  }
});

test('6. bloquea comandos Bash que mencionan .env*', () => {
  for (const c of [
    'cat .env.local',
    'grep -r CANARIO ./.env.local',
    'cp .env /tmp/x',
    'less "./.env"',
  ]) {
    assert.equal(evaluar(bash(c), RAIZ).bloquear, true, c);
  }
});

test('7. bloquea comandos Bash que salen del proyecto', () => {
  for (const c of ['ls ..', 'cat ~/.bashrc', 'ls $HOME', 'cat /etc/passwd', 'touch ~/pwned.txt']) {
    assert.equal(evaluar(bash(c), RAIZ).bloquear, true, c);
  }
});

test('8. permite comandos de trabajo normales', () => {
  const ok = [
    'npm run check',
    'git status',
    'git diff --stat',
    'git commit -m "feat: endpoint /api/ranking con su prueba"',
    'node -e "console.log(process.env.NODE_ENV)"',
    'cat env.example',
    'ls src > /dev/null',
  ];
  for (const c of ok) assert.equal(evaluar(bash(c), RAIZ).bloquear, false, c);
});

test('9. Grep y Glob no pueden apuntar a .env* ni fuera del proyecto', () => {
  assert.equal(
    evaluar({ tool_name: 'Glob', tool_input: { pattern: '**/.env*' } }, RAIZ).bloquear,
    true,
  );
  assert.equal(
    evaluar({ tool_name: 'Grep', tool_input: { pattern: 'X', glob: '.env*' } }, RAIZ).bloquear,
    true,
  );
  assert.equal(
    evaluar({ tool_name: 'Grep', tool_input: { pattern: 'X', path: '..' } }, RAIZ).bloquear,
    true,
  );
  assert.equal(
    evaluar({ tool_name: 'Grep', tool_input: { pattern: 'zona', path: 'src' } }, RAIZ).bloquear,
    false,
  );
});

test('10. el proceso sale con código 2 y explica el motivo en stderr', () => {
  const r = ejecutarHook(bash('cat .env.local'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Bloqueado por \.claude\/hooks\/guard\.mjs/);
  assert.doesNotMatch(r.stdout + r.stderr, /ZZZ-NO-ES-UN-SECRETO/);
});

test('11. el proceso sale con código 0 para acciones permitidas', () => {
  const r = ejecutarHook(bash('npm run check'));
  assert.equal(r.status, 0);
  assert.equal(r.stderr, '');
});

test('12. falla cerrado si la entrada no es JSON válido', () => {
  const r = ejecutarHook('esto no es json');
  assert.equal(r.status, 2);
});

test('13. utilidades: estaDentro y tokenizar', () => {
  assert.equal(estaDentro(RAIZ, 'src/a.ts'), true);
  assert.equal(estaDentro(RAIZ, '../a.ts'), false);
  assert.deepEqual(tokenizar('cp "a b" --x=../y'), ['cp', 'a', 'b', '--x', '../y']);
});
