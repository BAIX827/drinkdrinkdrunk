// Optional regeneration. Committed PNGs keep normal mini-program builds dependency-free.
// WEAPP_SHARP_PATH can point to an existing sharp installation.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url), sharp=require(process.env.WEAPP_SHARP_PATH || 'sharp');
const E=require('../wechat/shared/engine');
const source=readFileSync(new URL('../Cocktail60/BarWeb/taste-palette.js',import.meta.url),'utf8');
// Execute the web's icon definitions, without its DOM-dependent palette UI.
const context={BarTaste:E.taste,BarArt:E.art};
vm.runInNewContext(source.slice(0,source.indexOf('  function scene('))+'globalThis.assets=Object.keys(T.palette).map(key=>({key,name:T.palette[key][0],note:notes[key],svg:icon(key)}));})();',context);
const root=new URL('../wechat/assets/',import.meta.url);
async function png(svg,path,width,height){
  const output=new URL(path,root);mkdirSync(new URL('./',output),{recursive:true});
  writeFileSync(output,await sharp(Buffer.from(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '))).resize(width,height).png({palette:true,colours:96,compressionLevel:9}).toBuffer());
}
const flavors={};
for(const {key,name,note,svg} of context.assets){
  const image=`/assets/flavors/${key}.png`;await png(svg,`flavors/${key}.png`,128,128);flavors[key]={name,note,image};
}
for(const shape of Object.keys(E.core.bottleShapes))await png(E.art.bottle({shape,color:'#a9b88e',drawing:[]}),`bottles/${shape}.png`,100,140);
writeFileSync(new URL('../wechat/shared/flavors.js',import.meta.url),'// Generated from BarWeb/taste-palette.js by export-weapp-choice-art.mjs.\nmodule.exports = '+JSON.stringify(flavors,null,2)+';\n');
console.log(`Exported ${Object.keys(flavors).length} web flavor icons and ${Object.keys(E.core.bottleShapes).length} bottle thumbnails.`);
