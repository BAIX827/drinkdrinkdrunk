// Optional real WXML/WXSS compilation with an installed WeChat DevTools compiler.
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const location = process.argv[2];
if (!location) throw new Error('Usage: node scripts/verify-weapp.mjs "F:\\微信web开发者工具"');
const root = fileURLToPath(new URL('../wechat/', import.meta.url));
const output = fileURLToPath(new URL('../test-results/wechat/', import.meta.url));
mkdirSync(output, { recursive: true });
const pages = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).pages;
const walk = dir => readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : [path.join(dir,entry.name).replaceAll('\\','/')]);
const all = walk('');
const binaries = path.join(location, 'resources/app.asar.unpacked/node_modules/wcc-exec');
for (const [compiler, files, destination] of [
  ['wcc.exe', all.filter(p=>p.endsWith('.wxml')), 'wxml.js'],
  ['wcsc.exe', all.filter(p=>p.endsWith('.wxss')), 'wxss.js']
]) {
  const result = spawnSync(path.join(binaries, compiler), ['-o', path.join(output, destination), ...files], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`${compiler}: ${result.error || result.stderr || result.stdout}`);
  console.log(`${compiler}: passed (${files.length} files)`);
  if (result.stderr.trim()) console.log(result.stderr.trim());
}
