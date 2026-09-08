import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const excludedDirectories = new Set(['node_modules', '.next', '.git', '.vercel', 'out', 'dist', 'coverage', 'android', 'ios']);
const required = [
  'package.json',
  'package-lock.json',
  '.gitignore',
  'apps/web/package.json',
  'apps/web/capacitor.config.ts',
  'apps/web/vercel.json',
  'apps/api/package.json',
  'packages/contracts/package.json',
  'packages/db/prisma/schema.prisma',
  'packages/db/prisma/migrations/20260805010000_initial/migration.sql',
  'scripts/setup-local.ps1',
  'scripts/acceptance-local.ps1',
  'scripts/smoke-local.mjs',
  'scripts/inventory-core.mjs',
  'scripts/generate-inventory.mjs',
  'scripts/verify-inventory.mjs',
  'RELEASE_NOTES_0.3.8.md',
  'LOCAL_TEST.md',
  'SUPABASE_LOCAL.md',
  '.env.example',
  'README.md',
  'SECURITY.md',
  'OPENAPI.yaml'
];

for (const file of required) await stat(join(root, file));

const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else {
      const rel = relative(root, absolute).replaceAll('\\', '/');
      const name = entry.name;
      const localOnly = (name.startsWith('.env') && name !== '.env.example') || name === 'next-env.d.ts' || name.endsWith('.tsbuildinfo') || name.endsWith('.log');
      if (!localOnly) files.push(absolute);
    }
  }
}
await walk(root);

const jsonFiles = files.filter((file) => extname(file) === '.json');
for (const file of jsonFiles) JSON.parse(await readFile(file, 'utf8'));

const rootPackage = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const projectVersion = rootPackage.version;
if (!/^\d+\.\d+\.\d+$/.test(projectVersion)) throw new Error(`Versão raiz inválida: ${projectVersion}`);
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
if (lock.version !== projectVersion || lock.packages?.['']?.version !== projectVersion) throw new Error(`package-lock fora da versão ${projectVersion}.`);
for (const workspace of ['apps/api', 'apps/web', 'packages/contracts', 'packages/db']) {
  const entry = lock.packages?.[workspace];
  if (!entry || entry.version !== projectVersion) throw new Error(`package-lock sem workspace alinhado: ${workspace}`);
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(entry[section] ?? {})) {
      if (name.startsWith('@trotebox/') && version !== projectVersion) {
        throw new Error(`package-lock com dependência interna desalinhada: ${workspace}:${name}=${version}`);
      }
    }
  }
}

const gitignore = await readFile(join(root, '.gitignore'), 'utf8');
for (const rule of ['node_modules/', '.next/', '.env*', '!**/.env.example', '*.tsbuildinfo', '**/next-env.d.ts']) {
  if (!gitignore.includes(rule)) throw new Error(`Regra obrigatória ausente em .gitignore: ${rule}`);
}

const packageFiles = jsonFiles.filter((file) => file.endsWith('package.json'));
for (const file of packageFiles) {
  const packageJson = JSON.parse(await readFile(file, 'utf8'));
  if (packageJson.name?.startsWith('@trotebox/') && packageJson.version !== projectVersion) {
    throw new Error(`Workspace fora da versão ${projectVersion}: ${relative(root, file)}=${packageJson.version}`);
  }
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
      if (typeof version === 'string' && /^[~^]/.test(version)) {
        throw new Error(`Versão não pinada em ${relative(root, file)}: ${name}=${version}`);
      }
      if (name.startsWith('@trotebox/') && version !== projectVersion) {
        throw new Error(`Dependência interna desalinhada em ${relative(root, file)}: ${name}=${version}`);
      }
    }
  }
}

const envText = await readFile(join(root, '.env.example'), 'utf8');
for (const origin of ['capacitor://localhost', 'https://localhost']) {
  if (!envText.includes(origin)) throw new Error(`Origem Capacitor ausente em .env.example: ${origin}`);
}
for (const requiredEnv of ['DATABASE_URL=', 'DIRECT_URL=', 'JWT_SECRET=', 'DATA_ENCRYPTION_KEY=', 'HASH_PEPPER=', 'BREVO_API_KEY=', 'EMAIL_FROM_NAME=', 'EMAIL_FROM_ADDRESS=']) {
  if (!envText.includes(requiredEnv)) throw new Error(`Variável ausente em .env.example: ${requiredEnv.slice(0, -1)}`);
}
if (envText.includes('RESEND_API_KEY=') || /^EMAIL_FROM=/m.test(envText)) {
  throw new Error('Variáveis legadas do Resend ainda presentes em .env.example.');
}
const secretPatterns = [
  new RegExp(['sk', 'live', '[A-Za-z0-9]{12,}'].join('_')),
  new RegExp(['sk', 'test', '[A-Za-z0-9]{12,}'].join('_')),
  new RegExp(['ghp', '[A-Za-z0-9]{20,}'].join('_')),
  /xkeysib-[A-Za-z0-9_-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  new RegExp(['-----BEGIN', 'PRIVATE KEY-----'].join(' '))
];
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yaml', '.yml', '.txt', '.csv', '.ps1', '.example']);
for (const file of files) {
  if (!textExtensions.has(extname(file)) && !file.endsWith('.env.example')) continue;
  const text = await readFile(file, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) throw new Error(`Possível segredo real em ${relative(root, file)}: ${pattern}`);
  }
}

const deliverySources = [
  join(root, 'apps/api/src/server/env.ts'),
  join(root, 'apps/api/src/server/email-delivery.ts'),
  join(root, 'apps/api/.env.example')
];
for (const file of deliverySources) {
  const text = await readFile(file, 'utf8');
  if (text.includes('RESEND_API_KEY') || text.includes('api.resend.com')) {
    throw new Error(`Integração Resend legada ainda presente em ${relative(root, file)}.`);
  }
}

const webVercel = JSON.parse(await readFile(join(root, 'apps/web/vercel.json'), 'utf8'));
const apiRewrite = webVercel.rewrites?.find((item) => item.source === '/api/v1/:path*');
if (!apiRewrite || apiRewrite.destination !== 'https://trotebox-api.vercel.app/api/v1/:path*') {
  throw new Error('Rewrite same-origin /api/v1 da Vercel ausente ou divergente.');
}

const normalizedPath = (file) => file.replaceAll('\\', '/');
const apiRoutesRoot = resolve(root, 'apps/api/src/app/api');
const routeFiles = files.filter((file) => {
  const normalizedFile = resolve(file);
  const relativeToApiRoutes = relative(apiRoutesRoot, normalizedFile);
  return !relativeToApiRoutes.startsWith('..')
    && relativeToApiRoutes !== ''
    && normalizedPath(normalizedFile).endsWith('/route.ts');
});
const routes = routeFiles.map((file) => relative(apiRoutesRoot, dirname(file)).replaceAll('\\', '/'));
if (new Set(routes).size !== routes.length) throw new Error('Há colisão de rotas na API.');

function candidates(path) {
  return [path, `${path}.ts`, `${path}.tsx`, join(path, 'index.ts'), join(path, 'index.tsx')];
}
const available = new Set(files.map((file) => resolve(file)));
const sourceFiles = files.filter((file) => /\/apps\/(api|web)\/src\/.*\.tsx?$/.test(normalizedPath(file)));
const importExpression = /(?:from\s+|import\s*\()(['"])([^'"]+)\1/g;
for (const file of sourceFiles) {
  const text = await readFile(file, 'utf8');
  const normalizedFile = normalizedPath(file);
  const appMatch = normalizedFile.match(/^(.*\/apps\/(?:api|web))\/src\//);
  if (!appMatch) continue;
  const appRoot = appMatch[1];
  for (const match of text.matchAll(importExpression)) {
    const specifier = match[2];
    let base;
    if (specifier.startsWith('@/')) base = join(appRoot, 'src', specifier.slice(2));
    else if (specifier.startsWith('.')) base = resolve(dirname(file), specifier);
    else continue;
    if (!candidates(base).some((candidate) => available.has(resolve(candidate)))) {
      throw new Error(`Import interno não resolvido em ${relative(root, file)}: ${specifier}`);
    }
  }
}

const openApiText = await readFile(join(root, 'OPENAPI.yaml'), 'utf8');
if (!openApiText.includes(`version: ${projectVersion}`)) throw new Error(`OPENAPI.yaml fora da versão ${projectVersion}.`);
const openApiPaths = [...openApiText.matchAll(/^  \/[^:]+:/gm)].length;
if (openApiPaths !== routeFiles.length) {
  throw new Error(`OpenAPI possui ${openApiPaths} paths, mas a API possui ${routeFiles.length} rotas.`);
}

const prismaText = await readFile(join(root, 'packages/db/prisma/schema.prisma'), 'utf8');
const migrationRoot = join(root, 'packages/db/prisma/migrations');
const migrationDirectories = (await readdir(migrationRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const migrationParts = [];
for (const directory of migrationDirectories) {
  const migrationFile = join(migrationRoot, directory, 'migration.sql');
  try { migrationParts.push(await readFile(migrationFile, 'utf8')); } catch { /* lock/metadata directories are ignored */ }
}
const migrationText = migrationParts.join('\n');
const modelNames = [...prismaText.matchAll(/^model\s+(\w+)/gm)].map((match) => match[1]);
const enumNames = [...prismaText.matchAll(/^enum\s+(\w+)/gm)].map((match) => match[1]);
const models = modelNames.length;
const enums = enumNames.length;
if (!/directUrl\s*=\s*env\("DIRECT_URL"\)/.test(prismaText)) throw new Error('Prisma sem DIRECT_URL para migrations/Supabase.');
for (const name of modelNames) {
  if (!migrationText.includes(`CREATE TABLE "${name}"`)) throw new Error(`Migration inicial sem tabela ${name}.`);
  if (!migrationText.includes(`ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY;`)) throw new Error(`RLS ausente para ${name}.`);
}
for (const name of enumNames) {
  if (!migrationText.includes(`CREATE TYPE "${name}"`)) throw new Error(`Migration inicial sem enum ${name}.`);
}
const prismaInvariants = [
  /@@unique\(\[type, referenceType, referenceId\]\)/,
  /idempotencyKey\s+String\s+@unique/,
  /@@unique\(\[provider, externalEventId\]\)/,
  /providerConversationId\s+String\?\s+@unique/
];
for (const invariant of prismaInvariants) {
  if (!invariant.test(prismaText)) throw new Error(`Invariante Prisma ausente: ${invariant}`);
}

console.log([
  `Estrutura validada: ${required.length} arquivos obrigatórios`,
  `${jsonFiles.length} JSONs`,
  `${packageFiles.length} packages pinados/alinhados em ${projectVersion}`,
  `${sourceFiles.length} fontes com imports internos resolvidos`,
  `${routeFiles.length} rotas alinhadas ao OpenAPI`,
  `${models} modelos e ${enums} enums Prisma`
].join('; ') + '.');
