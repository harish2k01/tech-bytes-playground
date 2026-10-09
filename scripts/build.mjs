import { build, context } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
await mkdir('assets/built', { recursive: true });
await mkdir('assets/fonts', { recursive: true });
await copyFile('node_modules/photoswipe/LICENSE', 'assets/built/photoswipe-LICENSE.txt');
await copyFile(
  path.join(path.dirname(require.resolve('lucide/package.json')), 'LICENSE'),
  'assets/built/lucide-LICENSE.txt',
);
for (const [pkg, slug] of [
  ['dm-sans', 'dm-sans'],
  ['space-grotesk', 'space-grotesk'],
]) {
  const base = path.dirname(require.resolve(`@fontsource-variable/${pkg}/package.json`));
  await copyFile(
    path.join(base, `files/${slug}-latin-wght-normal.woff2`),
    `assets/fonts/${slug}-latin.woff2`,
  );
  await copyFile(path.join(base, 'LICENSE'), `assets/fonts/${slug}-LICENSE.txt`);
}
const options = {
  entryPoints: ['assets/js/main.js'],
  bundle: true,
  minify: true,
  target: ['es2020'],
  outfile: 'assets/built/main.js',
  legalComments: 'eof',
};
const css = {
  entryPoints: ['assets/css/screen.css'],
  bundle: true,
  minify: true,
  target: ['chrome111', 'firefox128', 'safari16.4'],
  outfile: 'assets/built/screen.css',
  external: ['../fonts/*'],
  loader: { '.woff2': 'file' },
};
if (process.argv.includes('--watch')) {
  const contexts = await Promise.all([context(options), context(css)]);
  await Promise.all(contexts.map((c) => c.watch()));
  console.log('Watching theme assets.');
} else {
  await Promise.all([build(options), build(css)]);
  console.log('Theme assets built.');
}
