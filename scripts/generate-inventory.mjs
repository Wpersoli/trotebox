import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildInventory, root } from './inventory-core.mjs';

const inventory = await buildInventory();
await writeFile(join(root, 'DEPENDENCY_MANIFEST.csv'), inventory.dependencyManifest);
await writeFile(join(root, 'SOURCE_MANIFEST.csv'), inventory.sourceManifest);
await writeFile(join(root, 'CHECKSUMS.sha256'), inventory.checksums);
await writeFile(join(root, 'FILE_MAP.md'), inventory.fileMap);
console.log(`Inventário gerado para ${inventory.files.length} arquivos e ${inventory.dependencyCount} dependências.`);
