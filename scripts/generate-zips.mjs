import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';

const themesDir = join(process.cwd(), 'src/content/themes');
const outDir = join(process.cwd(), 'public/downloads');
mkdirSync(outDir, { recursive: true });

const files = readdirSync(themesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const slug = file.replace('.json', '');
  const json = readFileSync(join(themesDir, file), 'utf-8');
  const zip = new JSZip();
  zip.file(`${slug}.json`, json);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  writeFileSync(join(outDir, `${slug}.zip`), buf);
  console.log(`  ${slug}.zip`);
}

console.log(`Done: ${files.length} zip files`);
