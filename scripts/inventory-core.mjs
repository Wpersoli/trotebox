import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));
const ignoredDirectories = new Set(['.git', '.next', '.vercel', 'node_modules', 'out', 'dist', 'coverage', 'android', 'ios']);
export const generatedFiles = new Set(['SOURCE_MANIFEST.csv', 'CHECKSUMS.sha256', 'DEPENDENCY_MANIFEST.csv', 'FILE_MAP.md']);
const ignoredBasenames = new Set(['.DS_Store', 'Thumbs.db', 'next-env.d.ts']);
const binaryExtensions = new Set(['.png', '.webp', '.jpg', '.jpeg', '.ico', '.gif', '.pdf', '.zip']);

export function shouldIgnorePath(path) {
  const normalized = path.replaceAll('\\', '/');
  const name = basename(normalized);
  if (generatedFiles.has(normalized)) return true;
  if (ignoredBasenames.has(name)) return true;
  if (name.endsWith('.tsbuildinfo') || name.endsWith('.log')) return true;
  if (normalized === 'packages/db/prisma/dev.db') return true;
  if (name.startsWith('.env') && name !== '.env.example') return true;
  return false;
}

export async function collectFiles() {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) { await walk(absolute); continue; }
      const path = relative(root, absolute).replaceAll('\\', '/');
      if (!shouldIgnorePath(path)) files.push({ absolute, path });
    }
  }
  await walk(root);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

const csv = (value) => `"${String(value).replaceAll('"', '""')}"`;

export async function buildInventory() {
  const files = await collectFiles();
  const dependencyRows = ['workspace,section,name,version'];
  for (const file of files.filter((item) => item.path.endsWith('package.json'))) {
    const packageJson = JSON.parse(await readFile(file.absolute, 'utf8'));
    const workspace = packageJson.name ?? file.path;
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const [name, version] of Object.entries(packageJson[section] ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
        dependencyRows.push([workspace, section, name, version].map(csv).join(','));
      }
    }
  }

  const sourceRows = ['path,bytes,lines,sha256'];
  const checksums = [];
  const fileMapRows = [
    '# Mapa de arquivos — TroteBox', '',
    'Gerado por `npm run inventory`. Arquivos `.env*` reais, `next-env.d.ts`, caches e artefatos de build são excluídos.', '',
    '| Caminho | Bytes | SHA-256 |', '|---|---:|---|'
  ];
  for (const file of files) {
    const content = await readFile(file.absolute);
    const metadata = await stat(file.absolute);
    const hash = createHash('sha256').update(content).digest('hex');
    const isBinary = binaryExtensions.has(extname(file.path).toLowerCase());
    const lines = isBinary || content.length === 0 ? 0 : content.toString('utf8').split(/\r?\n/).length;
    sourceRows.push(`${csv(file.path)},${metadata.size},${lines},${hash}`);
    checksums.push(`${hash}  ${file.path}`);
    fileMapRows.push(`| \`${file.path.replaceAll('|', '\\|')}\` | ${metadata.size} | \`${hash}\` |`);
  }
  return {
    files, dependencyCount: dependencyRows.length - 1,
    dependencyManifest: `${dependencyRows.join('\n')}\n`,
    sourceManifest: `${sourceRows.join('\n')}\n`,
    checksums: `${checksums.join('\n')}\n`,
    fileMap: `${fileMapRows.join('\n')}\n`
  };
}
