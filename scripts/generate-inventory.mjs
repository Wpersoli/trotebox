import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'out', 'dist', 'coverage']);
const generated = new Set(['SOURCE_MANIFEST.csv', 'CHECKSUMS.sha256']);
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else {
      const path = relative(root, absolute).replaceAll('\\', '/');
      if (!generated.has(path)) files.push({ absolute, path });
    }
  }
}

await walk(root);
files.sort((left, right) => left.path.localeCompare(right.path));

const dependencyRows = ['workspace,section,name,version'];
for (const file of files.filter((item) => item.path.endsWith('package.json'))) {
  const packageJson = JSON.parse(await readFile(file.absolute, 'utf8'));
  const workspace = packageJson.name ?? file.path;
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(packageJson[section] ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
      dependencyRows.push([workspace, section, name, version]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
    }
  }
}
await writeFile(join(root, 'DEPENDENCY_MANIFEST.csv'), `${dependencyRows.join('\n')}\n`);

const rows = ['path,bytes,lines,sha256'];
const checksums = [];
for (const file of files) {
  const content = await readFile(file.absolute);
  const metadata = await stat(file.absolute);
  const hash = createHash('sha256').update(content).digest('hex');
  const lines = content.length ? content.toString('utf8').split(/\r?\n/).length : 0;
  const quotedPath = `"${file.path.replaceAll('"', '""')}"`;
  rows.push(`${quotedPath},${metadata.size},${lines},${hash}`);
  checksums.push(`${hash}  ${file.path}`);
}
await writeFile(join(root, 'SOURCE_MANIFEST.csv'), `${rows.join('\n')}\n`);
await writeFile(join(root, 'CHECKSUMS.sha256'), `${checksums.join('\n')}\n`);
console.log(`Inventário gerado para ${files.length} arquivos e ${dependencyRows.length - 1} dependências.`);
