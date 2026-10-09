import { readFile, writeFile, readdir } from 'node:fs/promises';
import { format } from 'prettier';
// Protect Ghost's Handlebars syntax while formatting the surrounding HTML.
for (const directory of ['.', 'partials']) {
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.hbs')) continue;
    const file = `${directory}/${name}`;
    const source = await readFile(file, 'utf8');
    const tokens = [];
    const protectedHtml = source.replace(/{{{[\s\S]*?}}}|{{[\s\S]*?}}/g, (token) => {
      const index = tokens.push(token) - 1;
      return `GHOSTTOKEN${String(index).padStart(5, '0')}`;
    });
    const formatted = await format(protectedHtml, { parser: 'html', printWidth: 100, tabWidth: 2 });
    const restored = formatted.replace(/GHOSTTOKEN(\d{5})/g, (_, index) => tokens[Number(index)]);
    await writeFile(file, restored);
  }
}
