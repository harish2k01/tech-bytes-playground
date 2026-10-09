export function paletteIndex(value) {
  let hash = 0;
  for (const character of String(value)) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  return hash % 5;
}
export function uniqueHeadingId(text, reserved) {
  const base =
    String(text)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'section';
  let result = base;
  let suffix = 2;
  while (reserved.has(result)) result = `${base}-${suffix++}`;
  reserved.add(result);
  return result;
}
