// Repack original cells into square reference sheets; no artwork is changed.
const sharp = require('sharp');
const fs = require('fs');
const specs = [
  { id: 1, cols: 3, rows: 12, grid: 6 },
  { id: 2, cols: 4, rows: 15, grid: 8 },
  { id: 3, cols: 4, rows: 4, grid: 4 },
  { id: 4, cols: 2, rows: 15, grid: 6 },
];
(async () => {
  for (const spec of specs) {
    const cells = [];
    for (let i = 0; i < spec.cols * spec.rows; i++) {
      cells.push({ input: await sharp(`image/${spec.id}.gif`)
        .extract({ left: (i % spec.cols) * 36, top: Math.floor(i / spec.cols) * 36, width: 36, height: 36 })
        .resize(192, 192, { kernel: 'nearest' }).png().toBuffer(),
        left: (i % spec.grid) * 192, top: Math.floor(i / spec.grid) * 192 });
    }
    await sharp({ create: { width: spec.grid * 192, height: spec.grid * 192, channels: 3, background: '#ffffff' } })
      .composite(cells).png().toFile(`image/hd/references/${spec.id}.png`);
  }
  fs.writeFileSync('image/hd/layout.json', JSON.stringify(specs, null, 2) + '\n');
})();
