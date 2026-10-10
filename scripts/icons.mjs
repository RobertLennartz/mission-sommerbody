// Renders the home screen icons from app/icon.svg. Run after changing the logo:
//   node scripts/icons.mjs
// Uses sharp, which ships with Next.js (not a direct dependency).
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const svg = await readFile(new URL("../app/icon.svg", import.meta.url), "utf8");

// Maskable icons get cropped to a circle or squircle by Android: the logo has
// to sit inside the middle 80 %, so it is scaled down on the same background.
const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0B0C0B"/>
  <g transform="translate(12.8 12.8) scale(0.6)">${inner}</g>
</svg>`;

const out = [
  // iOS home screen: opaque, square corners (iOS rounds them itself).
  { file: "app/apple-icon.png", size: 180, source: svg },
  { file: "public/icons/icon-192.png", size: 192, source: svg },
  { file: "public/icons/icon-512.png", size: 512, source: svg },
  { file: "public/icons/icon-maskable-512.png", size: 512, source: maskable },
];

for (const { file, size, source } of out) {
  await sharp(Buffer.from(source), { density: (72 * size) / 64 })
    .resize(size, size)
    .flatten({ background: "#0B0C0B" })
    .png()
    .toFile(fileURLToPath(new URL(`../${file}`, import.meta.url)));
  console.log(`${file} ${size}x${size}`);
}
