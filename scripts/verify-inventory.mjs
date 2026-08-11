import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildInventory, root } from './inventory-core.mjs';

const expected = await buildInventory();
const outputs = {
  'DEPENDENCY_MANIFEST.csv': expected.dependencyManifest,
  'SOURCE_MANIFEST.csv': expected.sourceManifest,
  'CHECKSUMS.sha256': expected.checksums,
  'FILE_MAP.md': expected.fileMap
};
const stale = [];
for (const [name, content] of Object.entries(outputs)) {
  let current = '';
  try { current = await readFile(join(root, name), 'utf8'); }
  catch { stale.push(`${name} (ausente)`); continue; }
  if (current !== content) stale.push(name);
}
if (stale.length) throw new Error(`Inventário desatualizado: ${stale.join(', ')}. Execute npm run inventory.`);
for (const file of expected.files) {
  if (/(^|\/)\.env(?!\.example)(?:$|\.)/.test(file.path) || /next-env\.d\.ts$/.test(file.path) || /\.tsbuildinfo$/.test(file.path) || /(^|\/)node_modules\//.test(file.path) || /(^|\/)\.next\//.test(file.path)) {
    throw new Error(`Arquivo proibido entrou no inventário: ${file.path}`);
  }
}
console.log(`Inventário íntegro: ${expected.files.length} arquivos-fonte e ${expected.dependencyCount} dependências declaradas.`);
