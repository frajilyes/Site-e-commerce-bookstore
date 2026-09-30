/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "assets");
const OUT = path.join(ROOT, "public", "media");

const TARGETS = [
  {
    input: "bookstore-bg.png",
    name: "hero",
    widths: [640, 768, 960, 1280, 1536],
    avif: 30,
    webp: 55,
  },
  {
    input: "imageCard.png",
    name: "catalog-bg",
    widths: [640, 960, 1280],
    avif: 15,
    webp: 40,
  },
];

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

const run = async () => {
  fs.mkdirSync(OUT, { recursive: true });

  for (const target of TARGETS) {
    const input = path.join(SRC, target.input);
    if (!fs.existsSync(input)) {
      console.warn(`skip ${target.input} (introuvable)`);
      continue;
    }

    const before = fs.statSync(input).size;
    let after = 0;

    for (const width of target.widths) {
      const base = sharp(input).resize({ width, withoutEnlargement: true });

      const avif = path.join(OUT, `${target.name}-${width}.avif`);
      const webp = path.join(OUT, `${target.name}-${width}.webp`);

      await base.clone().avif({ quality: target.avif, effort: 6 }).toFile(avif);
      await base.clone().webp({ quality: target.webp, effort: 6 }).toFile(webp);

      after += fs.statSync(avif).size + fs.statSync(webp).size;
    }

    console.log(
      `${target.input}: ${kb(before)} -> ${kb(after)} (${target.widths.length} largeurs x2 formats)`,
    );
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
