import test from 'node:test';
import assert from 'node:assert/strict';
import '../Cocktail60/BarWeb/core.js';
import '../Cocktail60/BarWeb/taste.js';
import '../Cocktail60/BarWeb/iphone.js';
const recipe = { id: 'user-legacy', chineseName: '柠檬金酒', englishName: 'Lemon Gin', ingredients: ['金酒 45 ml', '柠檬汁 20 ml'], tags: ['金酒'], glass: '马天尼杯', method: '摇和', note: '原始备注', isUserCreated: true };
const photo = 'data:image/jpeg;base64,/9j/2Q==';
const log = { id: 'native-entry', date: '2026-10-01', name: '旧记录', note: '保留', legacyPhotos: true, photos: Array(8).fill(photo) };
test('iPhone migration merges both libraries, preserves photos and favorites, and is idempotent', () => {
  const state = BarCore.blankState(); state.favorites = ['web-favorite'];
  state.logs = [{ id:'web-entry', date:'2026-09-30', name:'网页记录', note:'' }];
  const legacy = { recipes:[recipe], logs:[log], favorites:['native-favorite'] };
  const merged = BarIPhone.mergeLegacy(state, legacy);
  assert.equal(merged.logs.length, 2);
  assert.deepEqual(merged.logs[1].photos, log.photos);
  assert.equal(merged.customRecipes[0].note, recipe.note);
  assert.deepEqual(merged.favorites, ['web-favorite','native-favorite']);
  assert.deepEqual(BarIPhone.mergeLegacy(merged, legacy), merged);
  assert.deepEqual(BarCore.validateState(JSON.parse(JSON.stringify(merged))), merged);
  assert.equal(state.logs.length, 1);
});
test('deleted records stay deleted and new native imports are ingested once', () => {
  const migrated = BarIPhone.mergeLegacy(BarCore.blankState(), {recipes:[recipe],logs:[log]});
  migrated.customRecipes = []; migrated.logs = [];
  const next = BarIPhone.mergeLegacy(migrated, {recipes:[recipe],logs:[log]});
  assert.deepEqual(next.customRecipes, []); assert.deepEqual(next.logs, []);
  const imported = {...recipe,id:'user-new'};
  assert.equal(BarIPhone.mergeLegacy(next, {recipes:[recipe,imported],migrated:true}).customRecipes[0].id, 'user-new');
  const restored = BarIPhone.mergeLegacy(BarCore.blankState(), {recipes:[recipe],logs:[log],migrated:true,consumedRecipeIDs:['user-legacy']});
  assert.deepEqual(restored.customRecipes, []); assert.deepEqual(restored.logs, []);
});
test('invalid legacy payload fails atomically and ordinary diary photo limits still apply', () => {
  const original = BarCore.blankState();
  assert.throws(() => BarIPhone.mergeLegacy(original, {recipes:[{...recipe,id:'bad'}],logs:[log]}));
  assert.deepEqual(original, BarCore.blankState());
  assert.throws(() => BarCore.validateState({...original,logs:[{...log,legacyPhotos:false}]}));
});
test('search prioritizes names while matching accents, split terms, materials, and notes', () => {
  assert.ok(BarIPhone.searchScore(recipe,'Lemon Gin') > BarIPhone.searchScore({...recipe, englishName:'Other drink'},'Lemon Gin'));
  assert.ok(BarIPhone.searchScore(recipe,'lemon 柠檬') > 0);
  assert.ok(BarIPhone.searchScore(recipe,'金酒') > 0);
  assert.ok(BarIPhone.searchScore({...recipe,englishName:'Piña Colada'},'pina') > 0);
  assert.equal(BarIPhone.searchScore(recipe,'whiskey'), 0);
});
test('a backup from another iPhone still merges this phone’s original diary', () => {
  const foreign = BarIPhone.mergeLegacy(BarCore.blankState(), {sourceID:'phone-one',logs:[log]});
  const local = {...log,id:'native-other',name:'本机旧日记'};
  const merged = BarIPhone.mergeLegacy(foreign, {sourceID:'phone-two',logs:[local]});
  assert.equal(merged.logs.length,2);
  assert.deepEqual(merged.nativeMigrationSources,['phone-one','phone-two']);
  const deleted = {...merged,logs:[]};
  assert.equal(BarIPhone.mergeLegacy(deleted,{sourceID:'phone-two',logs:[local]}).logs.length,0);
});
test('imported recipe photos survive backup and invalid image sources are rejected', () => {
  const merged = BarIPhone.mergeLegacy(BarCore.blankState(),{recipes:[{...recipe,photo}]});
  assert.equal(BarCore.validateState(JSON.parse(JSON.stringify(merged))).customRecipes[0].photo,photo);
  assert.throws(()=>BarIPhone.mergeLegacy(BarCore.blankState(),{recipes:[{...recipe,photo:'https://example.com/image.jpg'}]}));
});
