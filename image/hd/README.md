# Zeek the Geek — HD artwork

The four production PNG atlases are redrawn with the built-in image generation
tool, guided by the original GIFs. This is new cartoon linework and cel shading,
not a filtered enlargement. Original colors, character identities, tile layout,
directions, poison states and game rules remain the reference.

| Atlas | Contents | Size | Grid |
| --- | --- | --- | --- |
| `1.png` | Piclasop, rotten apple, dynamite, crystals, carnivorous flowers, lasers | 432 × 1728 | 3 × 12 |
| `2.png` | Walls, items, Zeek, walking/sleeping/poison frames, effects | 576 × 2160 | 4 × 15 |
| `3.png` | Connected two-cell carnivorous flower grabbing poses | 576 × 576 | 4 × 4 |
| `4.png` | Partner, walking/sleeping/poison frames | 288 × 2160 | 2 × 15 |

Every cell is **144 × 144**, four times the original 36 × 36 cell. Atlases use
opaque white backgrounds to match the game's original full-cell painting.
`manifest.json` lists nonempty coordinates and their engine identifiers.

## Play and inspect

The game uses HD by default. The artwork selector switches to the untouched
original GIFs (`game.html?puzzlePack=zeek1&art=classic`). Switching reloads the
current level; completed-level progress remains in the existing save system.
`art-preview.html` compares both versions, shows all nonempty frames, offers
preview sizes from 48 to 144 pixels, and links to the production PNGs.

## Source and reproducibility

`references/` contains square contact sheets repacked from the original GIFs.
`source/1.png` through `source/4.png` are the full generated masters.
`source/hero-walk.png` supplies four separately redrawn hero frames.
The **exact final prompts** for all five built-in calls are in
`source/prompt-1.txt` through `source/prompt-5.txt`.

`scripts/prepare-art.cjs` prepares references. `scripts/pack-art.cjs` crops,
isolates and packs existing generated artwork into engine-ready atlases. Both
require the Node package `sharp`; the game itself has no new dependencies.
Generated flower and partner sheets needed explicitly reviewed row boundaries;
these are recorded in the packer. Connected flower segments are packed together
without per-cell silhouette normalization to preserve stem continuity.

In the renderer, source cells are 144px while logical movement cells remain
36px. The board fits the available viewport at a 17:12 ratio and offers
fullscreen. Backing resolution accounts for both displayed size and device
pixel ratio, capped at native 4× atlas resolution. Mouse coordinates map back
to the logical grid. The
original art, original maps and existing gameplay code are retained.

## Verification

`scripts/verify-art.cjs` exercised loading and rendering for all nine puzzle
packs, movement/restart inputs, the classic selector, all 131 nonempty gallery
frames, gallery resizing and a 2x device pixel ratio. Chromium reported no page
errors or failed HTTP responses. Screenshots are in `previews/`.

`scripts/verify-display.cjs` checks enlarged desktop rendering, portrait and
landscape layouts, scaled mouse movement, paused resizing and fullscreen.

`npm start` generates the bundle successfully. The existing ESLint integration
still reports parser errors for the repository's pre-existing class-field syntax;
this is separate from the passing browser checks.
