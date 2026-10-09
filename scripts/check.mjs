import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
async function walk(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true }))
        .filter((e) => !['node_modules', '.git', 'dist', '.preview', '.runtime'].includes(e.name))
        .map(async (e) =>
          e.isDirectory() ? walk(path.join(dir, e.name)) : path.join(dir, e.name),
        ),
    )
  ).flat();
}
const templates = (await walk('.')).filter((p) => p.endsWith('.hbs'));
for (const filename of templates) Handlebars.precompile(await readFile(filename, 'utf8'));
const layout = await readFile('default.hbs', 'utf8');
for (const token of ['{{ghost_head}}', '{{ghost_foot}}', '{{{body}}}', '{{body_class}}'])
  if (!layout.includes(token)) throw Error(`Missing ${token}`);
console.log(`Parsed ${templates.length} Handlebars templates; Ghost integration hooks present.`);
