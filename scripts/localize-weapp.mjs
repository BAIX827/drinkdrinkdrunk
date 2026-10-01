// Compile readable Chinese WXML sources into bilingual templates.
// Data stays canonical in page JS. Only display bindings refer to the localized view.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), E = require('../wechat/shared/engine');
E.i18n.add(require('../wechat/shared/i18n-extra')); E.i18n.setLocale('en');
const root = fileURLToPath(new URL('../wechat/', import.meta.url)), src = fileURLToPath(new URL('../wechat-templates/', import.meta.url));
const missing = new Set(), han = /[\u3400-\u9fff]/;
const quote = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, '\\x27').replace(/"/g, '\\x22').replace(/\n/g,'\\n').replace(/</g,'\\x3c') + "'";
function translate(text) { const result = E.i18n.t(text); if (han.test(result) && text.trim() !== '简体中文') missing.add(text); return result; }
function literal(text) { return `(locale === 'en' ? ${quote(translate(text))} : ${quote(text)})`; }
function display(expression) {
  const strings = [];
  expression = expression.replace(/(['"])(?:\\.|(?!\1).)*?\1/g, s => { const raw = s.slice(1,-1); strings.push(han.test(raw) ? literal(raw) : s); return `@@${strings.length - 1}@@`; });
  expression = expression.replace(/\b[A-Za-z_$][\w$]*\b/g, (name, offset, all) => all[offset - 1] === '.' || ['item','drink','index','true','false','null','undefined','locale','v'].includes(name) ? name : `v.${name}`);
  return expression.replace(/@@(\d+)@@/g, (_, n) => strings[n]);
}
function textContent(value) {
  return value.split(/({{[\s\S]*?}})/).map(part => part.startsWith('{{') ? '{{' + display(part.slice(2,-2)) + '}}' : han.test(part) ? '{{' + literal(part) + '}}' : part).join('');
}
const tags = /<(?:(?:"[^"]*")|(?:'[^']*')|[^'">])*?>/g;
mkdirSync(src, { recursive: true });
for (const name of readdirSync(path.join(root,'pages'))) {
  const output = path.join(root,'pages',name,'index.wxml'), source = path.join(src,name + '.wxml');
  if (!existsSync(output) && !existsSync(source)) continue;
  if (!existsSync(source)) writeFileSync(source, readFileSync(output, 'utf8'));
  const original = readFileSync(source, 'utf8'); let last = 0, result = '';
  for (const match of original.matchAll(tags)) {
    result += textContent(original.slice(last, match.index));
    result += match[0].replace(/([\w:-]+)="([^"]*)"/g, (full, attr, value) => {
      if (['wx:for','range'].includes(attr)) return `${attr}="${value.replace(/{{(.*?)}}/g, (_, e) => '{{' + (e.trim()==='photos' ? e : display(e)) + '}}')}"`;
      if (['placeholder','aria-label'].includes(attr)) return `${attr}="${textContent(value)}"`;
      // Loop items come from v.*; routing, values and comparisons use their originals.
      return `${attr}="${value.replace(/\b(item|drink)\.(?!_raw\b)/g,'$1._raw.')}"`;
    });
    last = match.index + match[0].length;
  }
  result += textContent(original.slice(last)); writeFileSync(output, result);
}
mkdirSync(new URL('../test-results/wechat/', import.meta.url), { recursive:true });
writeFileSync(new URL('../test-results/wechat/missing-translations.json', import.meta.url), JSON.stringify([...missing], null, 2));
console.log(`Bilingual WXML generated; ${missing.size} phrases still need review.`);
