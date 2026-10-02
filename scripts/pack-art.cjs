// Crop and pack generated artwork into the original engine's atlas layout.
// Run from the repository root with sharp available (npm install --no-save sharp).
const sharp = require('sharp');
const fs = require('fs');
const vm = require('vm');
const specs = require('../image/hd/layout.json');
const TILE = 144;
const mappingSource = fs.readFileSync('js/image.js', 'utf8').split('export const image=')[1];
const mapping = vm.runInNewContext('(' + mappingSource.trim().replace(/;$/, '') + ')', {
  imageObj: [1, 2, 3, 4].map(id => ({ id })),
});
const labels = {};
function walk(value, path) {
  if (value.img) {
    const key = `${value.img.id}:${value.x}:${value.y}`;
    (labels[key] ||= []).push(path);
  } else {
    for (const key of Object.keys(value)) walk(value[key], path ? `${path}.${key}` : key);
  }
}
walk(mapping, '');

// Isolate the main sprite before packing: generated sheets sometimes have a
// sliver from a neighbouring frame at a cell edge. This only crops artwork.
async function isolateSprite(buffer, sleepy = false) {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(info.width * info.height);
  let largest = null;
  for (let p = 0; p < seen.length; p++) {
    const isInk = n => data[n * info.channels] < 225 || data[n * info.channels + 1] < 225 || data[n * info.channels + 2] < 225;
    if (seen[p] || !isInk(p)) continue;
    const queue = [p];
    seen[p] = 1;
    const box = { count: 0, left: info.width, right: 0, top: info.height, bottom: 0 };
    for (let head = 0; head < queue.length; head++) {
      const n = queue[head], x = n % info.width, y = Math.floor(n / info.width);
      box.count++;
      box.left = Math.min(box.left, x); box.right = Math.max(box.right, x);
      box.top = Math.min(box.top, y); box.bottom = Math.max(box.bottom, y);
      const neighbours = [];
      if (x > 0) neighbours.push(n - 1);
      if (x + 1 < info.width) neighbours.push(n + 1);
      if (y > 0) neighbours.push(n - info.width);
      if (y + 1 < info.height) neighbours.push(n + info.width);
      for (const next of neighbours) if (!seen[next] && isInk(next)) { seen[next] = 1; queue.push(next); }
    }
    if (!largest || box.count > largest.count) largest = box;
  }
  if (!largest) throw new Error('A nonempty original cell has no redrawn sprite.');
  const left = Math.max(0, largest.left - 2), top = sleepy ? 0 : Math.max(0, largest.top - 2);
  const right = Math.min(info.width, largest.right + 3), bottom = Math.min(info.height, largest.bottom + 3);
  const cropped = await sharp(buffer).extract({ left, top, width: right - left, height: bottom - top })
    .resize(TILE - 6, TILE - 6, { fit: 'inside' }).png().toBuffer();
  const size = await sharp(cropped).metadata();
  return sharp({ create: { width: TILE, height: TILE, channels: 3, background: '#ffffff' } })
    .composite([{ input: cropped, left: Math.floor((TILE - size.width) / 2), top: TILE - size.height - 3 }]).png().toBuffer();
}

(async () => {
  const manifest = { tileSize: TILE, logicalTileSize: 36, scale: 4, sheets: [] };
  for (const spec of specs) {
    const frames = [];
    const source = `image/hd/source/${spec.id}.png`;
    const meta = await sharp(source).metadata();
    // Generated sheets 3/4 have extra white space below the artwork. These
    // reviewed row boundaries preserve the connected flower stems and hats.
    const rowEdges = spec.id === 3 ? [0, 270, 540, 810, 1080]
      : spec.id === 4 ? [0, 200, 400, 600, 800, 1000, 1254] : null;
    const overlays = [];
    for (let i = 0; i < spec.cols * spec.rows; i++) {
      const original = await sharp(`image/${spec.id}.gif`).extract({
        left: i % spec.cols * 36, top: Math.floor(i / spec.cols) * 36, width: 36, height: 36,
      }).raw().toBuffer();
      // Empty cells must be truly blank, including the empty floor tile.
      if (!original.some(value => value < 245)) continue;
      frames.push({ x: i % spec.cols, y: Math.floor(i / spec.cols),
        names: labels[`${spec.id}:${i % spec.cols}:${Math.floor(i / spec.cols)}`] || [] });
      let input = source;
      let col = i % spec.grid;
      let row = Math.floor(i / spec.grid);
      let left = Math.round(col * meta.width / spec.grid);
      let right = Math.round((col + 1) * meta.width / spec.grid);
      let top = rowEdges ? rowEdges[row] : Math.round(row * meta.height / spec.grid);
      let bottom = rowEdges ? rowEdges[row + 1] : Math.round((row + 1) * meta.height / spec.grid);
      // Supplement missing hero walk frames with their separately redrawn cells.
      const patchCells = { 50: 0, 51: 1, 55: 2, 59: 3 };
      if (spec.id === 2 && patchCells[i] !== undefined) {
        input = 'image/hd/source/hero-walk.png';
        const patchMeta = await sharp(input).metadata();
        const patch = patchCells[i];
        left = Math.round((patch % 2) * patchMeta.width / 2);
        right = Math.round((patch % 2 + 1) * patchMeta.width / 2);
        top = Math.round(Math.floor(patch / 2) * patchMeta.height / 2);
        bottom = Math.round((Math.floor(patch / 2) + 1) * patchMeta.height / 2);
      }
      let buffer = await sharp(input).extract({ left, top, width: right - left, height: bottom - top })
        .flatten({ background: '#ffffff' }).png().toBuffer();
      const x = i % spec.cols, y = Math.floor(i / spec.cols);
      const hero = spec.id === 4 || (spec.id === 2 && x >= 2);
      const item = spec.id === 2 && ((x === 1 && y !== 12) || (x === 0 && y === 10));
      const creature = spec.id === 1 && !(x === 2 && y >= 8) && !(x === 1 && y === 11);
      buffer = hero || item || creature ? await isolateSprite(buffer, hero && x === (spec.id === 4 ? 0 : 2) && y === 4)
        : await sharp(buffer).resize(TILE, TILE, { fit: 'fill' }).png().toBuffer();
      overlays.push({ input: buffer, left: i % spec.cols * TILE, top: Math.floor(i / spec.cols) * TILE });
    }
    await sharp({ create: { width: spec.cols * TILE, height: spec.rows * TILE, channels: 3, background: '#ffffff' } })
      .composite(overlays).png().toFile(`image/hd/${spec.id}.png`);
    manifest.sheets.push({ file: `${spec.id}.png`, columns: spec.cols, rows: spec.rows,
      width: spec.cols * TILE, height: spec.rows * TILE, frames });
  }
  fs.writeFileSync('image/hd/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log('Packed four HD atlases at 144px per cell (4x original).');
})();
