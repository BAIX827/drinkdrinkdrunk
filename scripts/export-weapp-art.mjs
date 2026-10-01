// Optional artwork regeneration: npm install --no-save sharp, then run this file.
// PNGs are committed, so importing/building the mini program needs no sharp install.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import '../Cocktail60/BarWeb/core.js';
import '../Cocktail60/BarWeb/art.js';
import '../Cocktail60/BarWeb/data.js';
const require = createRequire(import.meta.url);
const sharp = require(process.env.WEAPP_SHARP_PATH || 'sharp');
const root = new URL('../wechat/assets/', import.meta.url);
mkdirSync(new URL('drinks/', root), { recursive: true });
async function png(svg, file, width = 160, height = 190) {
  const source = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  const buffer = await sharp(Buffer.from(source)).resize(width, height).png({ palette: true, colours: 96, compressionLevel: 9 }).toBuffer();
  writeFileSync(new URL(file, root), buffer);
}
for (const recipe of BarData.recipes) await png(BarArt.drink(recipe), `drinks/${recipe.id}.png`);
await png(BarArt.glass('coupe', '#d4a16e', { garnish: 'lime' }), 'drinks/custom.png');
const paths = {
  discover: '<path d="M10 8h28L24 25zM24 25v14M16 40h16"/>',
  inventory: '<path d="M19 5h10v11l5 6v20H14V22l5-6zM14 29h20M14 36h20"/>',
  taste: '<path d="M14 5c0 18 20 20 20 38M34 5c0 18-20 20-20 38M16 10h16M17 18h14M17 30h14M16 38h16"/>',
  journal: '<rect x="8" y="10" width="32" height="31" rx="4"/><path d="M8 20h32M16 5v10M32 5v10M17 28h3M28 28h3M17 34h3"/>'
};
for (const [name, drawing] of Object.entries(paths)) for (const active of [false, true]) {
  await png(`<svg viewBox="0 0 48 48"><g fill="none" stroke="${active ? '#e8c68d' : '#a4b9ae'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg>`, `tab-${name}${active ? '-active' : ''}.png`, 72, 72);
}
console.log('Generated 146 cocktail PNGs and 8 native tab icons.');
