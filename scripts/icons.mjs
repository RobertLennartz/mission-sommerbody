// Renders all app icons from assets/frieda-icon.webp (Frieda, 10.10.2026).
// Run after changing the picture:
//   node scripts/icons.mjs
// Uses sharp, which ships with Next.js (not a direct dependency).
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const SOURCE = path("assets/frieda-icon.webp");
/** Square around Frieda's head for the favicon: the full picture is a yellow blur at 16 px. */
const HEAD = { left: 400, top: 300, width: 500, height: 500 };
/** Android crops maskable icons down to a circle of 80 %: picture scaled so the title stays inside. */
const MASKABLE_SCALE = 0.72;

const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const N = info.width;
if (info.height !== N) throw new Error("The icon picture has to be square.");

// The picture comes with white rounded corners baked in, not quite circular
// (deeper on the diagonal). Measure both and cut with a circle that covers
// the white everywhere, plus a few pixels for the soft edge.
const isWhite = (x, y) => {
  const i = (y * N + x) * 3;
  return data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235;
};
let radius = 0;
while (radius < N / 2 && isWhite(radius, 0)) radius++;
let diagonal = 0;
while (diagonal < N / 2 && isWhite(diagonal, diagonal)) diagonal++;
// A circle of radius r reaches r * (1 - 1/sqrt 2) into the corner on the diagonal.
const cut = Math.ceil(Math.max(radius, diagonal / (1 - Math.SQRT1_2))) + 8;
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}"><rect width="${N}" height="${N}" rx="${cut}" ry="${cut}"/></svg>`);
const rounded = await sharp(SOURCE).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();

// Opaque version for iOS (it rounds itself and turns transparency black):
// the corners get a blurred, enlarged copy of the picture's middle.
const inset = Math.round(N * 0.15);
const backdrop = await sharp(SOURCE)
  .extract({ left: inset, top: inset, width: N - 2 * inset, height: N - 2 * inset })
  .resize(N, N)
  .blur(40)
  .png()
  .toBuffer();
const opaque = await sharp(backdrop).composite([{ input: rounded }]).png().toBuffer();

// Maskable: the picture as a card on the navy of its palm trees, small
// enough that a round launcher mask keeps the whole title.
const M = 512;
const inner = Math.round(M * MASKABLE_SCALE);
const maskable = await sharp({ create: { width: M, height: M, channels: 4, background: "#0D366A" } })
  .composite([{ input: await sharp(rounded).resize(inner, inner).toBuffer(), gravity: "center" }])
  .png()
  .toBuffer();

const head = await sharp(SOURCE).extract(HEAD).png().toBuffer();

async function png(input, size, file, { flatten = false } = {}) {
  let img = sharp(input).resize(size, size);
  if (flatten) img = img.flatten({ background: "#FDB833" });
  await img.png().toFile(path(file));
  console.log(`${file} ${size}x${size}`);
}

await png(opaque, 180, "app/apple-icon.png", { flatten: true });
await png(rounded, 192, "public/icons/icon-192.png");
await png(rounded, 512, "public/icons/icon-512.png");
await png(maskable, 512, "public/icons/icon-maskable-512.png", { flatten: true });
await png(head, 64, "app/icon.png");

// favicon.ico for browsers that ask for it directly: PNG images in an ICO container.
const sizes = [16, 32, 48];
// RGBA on purpose: the ICO reader in Next.js rejects PNGs without alpha.
const images = await Promise.all(sizes.map((s) => sharp(head).resize(s, s).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e); // width
  header.writeUInt8(s, e + 1); // height
  header.writeUInt8(0, e + 2); // no palette
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); // planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
await writeFile(path("app/favicon.ico"), Buffer.concat([header, ...images]));
console.log(`app/favicon.ico ${sizes.join("/")} (white corner ${radius} px on the edge, ${diagonal} px on the diagonal, cut radius ${cut} of ${N})`);
