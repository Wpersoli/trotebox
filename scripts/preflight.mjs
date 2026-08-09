import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const major = Number(process.versions.node.split('.')[0]);
if (major !== 22) {
  throw new Error(`Node.js 22 é obrigatório. Versão detectada: ${process.version}`);
}

const requiredExecutables = process.platform === 'win32'
  ? ['node_modules/.bin/next.cmd', 'node_modules/.bin/eslint.cmd', 'node_modules/.bin/tsc.cmd']
  : ['node_modules/.bin/next', 'node_modules/.bin/eslint', 'node_modules/.bin/tsc'];
for (const dependencyExecutable of requiredExecutables) {
  if (!existsSync(resolve(root, dependencyExecutable))) {
    throw new Error(`Dependência npm ausente: ${dependencyExecutable}. Execute npm install antes de iniciar a stack completa.`);
  }
}

const requiredEnvFiles = [
  'apps/api/.env.local',
  'apps/web/.env.local',
  'packages/db/.env'
];
for (const relative of requiredEnvFiles) {
  if (!existsSync(resolve(root, relative))) {
    throw new Error(`Arquivo ausente: ${relative}. Execute npm run setup:local.`);
  }
}

const apiEnv = readFileSync(resolve(root, 'apps/api/.env.local'), 'utf8');
const dbEnv = readFileSync(resolve(root, 'packages/db/.env'), 'utf8');
const placeholders = [
  'replace-with-at-least-32-random-characters',
  'replace-with-a-distinct-32-character-secret',
  'replace-with-another-distinct-32-character-secret',
  'replace-with-at-least-16-random-characters'
];
for (const placeholder of placeholders) {
  if (apiEnv.includes(placeholder)) throw new Error(`Segredo placeholder ainda presente: ${placeholder}`);
}
for (const key of ['DATABASE_URL=', 'DIRECT_URL=']) {
  if (!dbEnv.includes(key)) throw new Error(`Variável ausente em packages/db/.env: ${key.slice(0, -1)}`);
}

console.log(`Preflight aprovado com Node ${process.version} e ambientes locais presentes.`);
