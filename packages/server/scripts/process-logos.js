// Standalone, one-off script: NOT part of the running server. Processes
// the raw brand/ source logos into transparent-background PNGs used by
// the editor and player. Run manually:
//
//   node packages/server/scripts/process-logos.js
//   DARK_THRESHOLD=80 node packages/server/scripts/process-logos.js
//
// See DECISIONS.md for the final threshold value and why it was chosen.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAND_SOURCE_DIR = path.resolve(__dirname, '../../../brand');
const BRAND_OUTPUT_DIRS = [
  path.resolve(__dirname, '../../editor/public/brand'),
  path.resolve(__dirname, '../../player/public/brand'),
];
const PUBLIC_DIRS = [
  path.resolve(__dirname, '../../editor/public'),
  path.resolve(__dirname, '../../player/public'),
];

// Dark semi-transparent halo/glow-bleed removal.
//
// The source PNGs turned out to have NO real alpha variation at all --
// every pixel is fully opaque (alpha=255) and the "transparent"
// checkerboard is baked directly into the RGB data as a literal gray
// checker texture. So the naive "RGB dark AND alpha<200" rule from the
// original spec is a no-op against these files (alpha is never below
// 200) and had to be adapted -- see DECISIONS.md.
//
// A pure "all channels below threshold" rule also doesn't work: sampled
// pixel data shows the dark navy wordmark (~13,24,49) is just as dark as
// the checkerboard (~15,15,15 / ~79,80,80) and would be erased right
// along with it. The distinguishing signal is hue, not brightness: navy
// is blue-dominant (B well above both G and R), while the checkerboard
// is neutral gray (R≈G≈B) and the teal halo is cyan-tinted (G≈B, both
// above R). So: protect any pixel whose blue channel meaningfully
// exceeds both green and red (isNavy) regardless of darkness, and remove
// any other pixel whose brightest channel is below DARK_THRESHOLD.
// Tried 60, 80, 90, 100, 110 against composited previews on both white
// and navy backgrounds (see DECISIONS.md). 100 was the smallest value
// that fully cleared the checkerboard on the wave/neuron artwork without
// visibly touching the wordmark; higher values gained nothing further
// there. Some faint haze remains at full resolution specifically in the
// spark/bloom glow near the dendrite tips (that glow has no clean
// brightness separation from the background at any single threshold),
// but it disappears at the sizes these assets are actually displayed at
// (36px-tall top-bar lockup, 32x32 favicon) -- verified directly.
const DARK_THRESHOLD = Number(process.env.DARK_THRESHOLD) || 100;
const NAVY_HUE_MARGIN = 15;

async function stripDarkHalo(inputBuffer) {
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isNavyWordmark = b - g > NAVY_HUE_MARGIN && b - r > NAVY_HUE_MARGIN;
    const maxChannel = Math.max(r, g, b);
    if (!isNavyWordmark && maxChannel < DARK_THRESHOLD) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

function writeToAll(dirs, filename, buffer) {
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
  }
}

async function main() {
  console.log(`[process-logos] dark pixel threshold = ${DARK_THRESHOLD}, navy hue margin = ${NAVY_HUE_MARGIN}`);

  // 2a: convert the JPEG lockup to PNG first, then treat it identically
  // to the two PNG sources below.
  const lockupPngBuffer = await sharp(path.join(BRAND_SOURCE_DIR, 'Mnemonify-Horizontal-Lockup.jpeg')).png().toBuffer();

  const sources = [
    { name: 'Mnemonify-Full-Logo.png', buffer: fs.readFileSync(path.join(BRAND_SOURCE_DIR, 'Mnemonify-Full-Logo.png')) },
    { name: 'Mnemonify-Icon.png', buffer: fs.readFileSync(path.join(BRAND_SOURCE_DIR, 'Mnemonify-Icon.png')) },
    { name: 'Mnemonify-Horizontal-Lockup.png', buffer: lockupPngBuffer },
  ];

  let iconBuffer = null;
  for (const { name, buffer } of sources) {
    const processed = await stripDarkHalo(buffer);
    writeToAll(BRAND_OUTPUT_DIRS, name, processed);
    console.log(`[process-logos] wrote ${name} -> ${BRAND_OUTPUT_DIRS.length} directories`);
    if (name === 'Mnemonify-Icon.png') iconBuffer = processed;
  }

  // 2d: 32x32 favicon generated from the processed (transparent-bg) icon
  const favicon = await sharp(iconBuffer).resize(32, 32).png().toBuffer();
  writeToAll(PUBLIC_DIRS, 'favicon.png', favicon);
  console.log(`[process-logos] wrote favicon.png -> ${PUBLIC_DIRS.length} directories`);

  console.log('[process-logos] done');
}

main().catch((err) => {
  console.error('[process-logos] failed:', err);
  process.exit(1);
});
