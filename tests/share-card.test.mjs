import test from 'node:test';
import assert from 'node:assert/strict';
import '../Cocktail60/BarWeb/core.js';
import '../Cocktail60/BarWeb/taste-data.js';
import '../Cocktail60/BarWeb/taste.js';
import '../Cocktail60/BarWeb/art.js';
import '../Cocktail60/BarWeb/data.js';
import '../Cocktail60/BarWeb/share-card.js';

const S = BarShare;
const measure = (s, size) => Array.from(s).reduce((n, c) => n + (c.charCodeAt(0) > 255 ? size : size * .6), 0);

test('share cards preserve every built-in recipe and use the existing drink and taste models', () => {
  for (const recipe of BarData.recipes) {
    const before = JSON.stringify(recipe), data = S.dataFor(recipe), plan = S.layout(data, measure);
    assert.deepEqual(data.ingredients, recipe.ingredients, recipe.id);
    assert.deepEqual(data.vector, BarTaste.profile(recipe).vector, recipe.id);
    assert.match(data.art, new RegExp(`data-glass="${BarCore.drinkAppearance(recipe).glass}"`));
    assert.equal(JSON.stringify(recipe), before, 'must not modify the original recipe');
    assert.equal(plan.width, 1080);
    assert.ok(plan.height >= 1080 && plan.height <= 8192);
    const ingredientBlocks = plan.blocks.filter(b => b.role === 'ingredient');
    assert.equal(ingredientBlocks.length, recipe.ingredients.length);
    ingredientBlocks.forEach((b, i) => assert.equal(b.lines.join(''), recipe.ingredients[i].replaceAll('\n', '')));
    for (const b of plan.blocks) assert.ok(b.y + b.lines.length * b.lineHeight < plan.divider);
    assert.ok(S.templates.some(t => t.id === S.defaultTemplate));
  }
});

test('unknown ingredients never produce fabricated taste scores, and multi-base recipes retain all bases', () => {
  const custom = { ...BarData.recipes[0], englishName: '', ingredients: ['神秘材料 30 ml'], parts: undefined, source: undefined };
  const data = S.dataFor(custom);
  assert.equal(data.known, false); assert.equal(data.vector, null); assert.deepEqual(data.tags, []);
  assert.equal(data.english, ''); assert.equal(data.source, '');
  assert.equal(S.dataFor({ ...custom, ingredients: ['神秘材料 30 ml（可选）'] }).known, false);
  const multi = S.dataFor({ ...custom, ingredients: ['金酒 20 ml', '伏特加 20 ml'] });
  assert.match(multi.base, /金酒/); assert.match(multi.base, /伏特加/);
});

test('long names, multiline ingredients, dash and alternatives wrap without dropping recipe content', () => {
  const data = S.dataFor(BarData.recipes[0]);
  data.name = '这是一款名字比较长的自建鸡尾酒'.repeat(3);
  data.english = 'A LONG CUSTOM COCKTAIL NAME '.repeat(5);
  data.ingredients = Array.from({ length: 18 }, (_, i) => `材料 ${i + 1} · 苦精 2 dash\n柠檬汁或青柠汁 15–30 ml（可选）`);
  data.source = '测试来源 '.repeat(30);
  const plan = S.layout(data, measure);
  assert.ok(plan.height > 1440);
  for (const b of plan.blocks) {
    assert.ok(b.y + b.lines.length * b.lineHeight < plan.divider);
    b.lines.forEach(s => assert.ok(measure(s, b.size) <= b.width));
  }
  assert.deepEqual(plan.blocks.filter(b => b.role === 'ingredient').map(b => b.lines.join('')), data.ingredients.map(s => s.replaceAll('\n', '')));
  assert.throws(() => S.layout({ ...data, ingredients: Array(100).fill('极长材料'.repeat(100)) }, measure), /过长/);
});

test('short recipes use a compact square and long recipes grow with content', () => {
  const base = S.dataFor(BarData.recipes.find(r => /尼格罗尼/.test(r.chineseName)));
  const short = S.layout({ ...base, source: '' }, measure);
  assert.equal(short.height, 1080);
  const long = S.layout({ ...base, ingredients: Array(12).fill('金酒 30 ml'), source: '' }, measure);
  assert.ok(long.height > short.height);
  assert.equal(long.divider - short.divider, (12 - base.ingredients.length) * 65);
});

test('export names are safe and default color follows the current application theme', () => {
  assert.doesNotMatch(S.filename({ name: '非法:/\\?*"<>|酒名' }, 'archive'), /[<>:"/\\|?*]/);
  assert.match(S.filename({ name: '尼格罗尼' }, 'botanical'), /青柠气泡\.png$/);
  assert.equal(S.defaultTemplate, 'theme');
  assert.equal(S.resolveTemplate('theme', 'bar').paper, '#0e1714');
  assert.equal(S.resolveTemplate('theme', 'dark').paper, '#0b100e');
  assert.equal(S.resolveTemplate('theme', 'light').paper, '#f2ecdf');
  assert.deepEqual(S.resolveTemplate('berry', 'bar'), S.resolveTemplate('berry', 'light'));
  assert.equal(new Set(S.templates.map(t => t.id)).size, 8);
});
