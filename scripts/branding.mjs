import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

// Paths keep the existing h: mark independent of installed fonts.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#b8a0ff"/><path d="M116 108h54v128c20-25 46-38 77-38 57 0 86 35 86 101v105h-55V301c0-39-15-58-44-58-38 0-64 29-64 76v85h-54z" fill="#252236"/><g fill="#f8d64e"><circle cx="389" cy="230" r="28"/><circle cx="389" cy="354" r="28"/></g></svg>`;
const dir = 'assets/branding';
await mkdir(dir, { recursive: true });
await writeFile(`${dir}/favicon.svg`, svg);
for (const [size, name] of [
  [512, 'publication-icon-512'],
  [180, 'apple-touch-icon'],
  [32, 'favicon-32'],
  [16, 'favicon-16'],
]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`${dir}/${name}.png`);
}
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(`${dir}/favicon.ico`, Buffer.concat([header, ...images]));
console.log('Generated SVG, PNG and ICO publication icons.');
