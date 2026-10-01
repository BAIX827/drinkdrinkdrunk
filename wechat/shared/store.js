const { core, taste } = require('./engine');
const data = require('./data');
const POINTER = 'dddrunk-state-slot-v1';
const MAX_BYTES = 3800000;
let state = null, active = '', blocked = false;
const clone = value => JSON.parse(JSON.stringify(value));
const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const path = slot => `${wx.env.USER_DATA_PATH}/dddrunk-${slot}.json`;
const bytes = text => encodeURIComponent(text).replace(/%[A-F\d]{2}/gi, 'x').length;
function validate(value) {
  const result = core.validateState(value);
  const ids = new Set();
  for (const entry of result.logs) {
    const date = new Date(`${entry.date}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== entry.date || ids.has(entry.id)) throw new Error('日记日期或编号不正确。');
    ids.add(entry.id);
  }
  return result;
}
function load() {
  if (state) return clone(state);
  state = core.blankState();
  try {
    const fs = wx.getFileSystemManager();
    active = wx.getStorageSync(POINTER) || '';
    if (active && !['a', 'b'].includes(active)) throw new Error('存储指针无效');
    if (active) state = validate(JSON.parse(fs.readFileSync(path(active), 'utf8')));
    else {
      const existing = fs.readdirSync(wx.env.USER_DATA_PATH);
      if (existing.some(name => /^dddrunk-[ab]\.json$/.test(name))) throw new Error('存在未恢复的数据文件');
    }
  } catch (_) {
    blocked = true;
    throw new Error('本地数据未能读取，已保留原文件并暂停保存。请在设置中导出原始文件，或导入有效备份恢复。');
  }
  return clone(state);
}
function get() { return state ? clone(state) : load(); }
function save(value, recovery = false) {
  if (blocked && !recovery) throw new Error('请先在设置中恢复备份；原数据不会被覆盖。');
  const checked = validate(value), text = JSON.stringify(checked);
  if (bytes(text) > MAX_BYTES) throw new Error('本地数据超过 3.8 MB，请先导出备份并减少照片。原数据已保留。');
  const next = active === 'a' ? 'b' : 'a';
  // Commit the small pointer only after the inactive file has been fully written.
  // A failed write or pointer update leaves the last committed state intact.
  wx.getFileSystemManager().writeFileSync(path(next), text, 'utf8');
  wx.setStorageSync(POINTER, next);
  active = next; state = checked; blocked = false;
  return get();
}
function update(edit) { const draft = get(); edit(draft); return save(draft); }
function recipes() { return data.recipes.concat(get().customRecipes.map(r => ({ ...r, parts: r.ingredients.map(core.ingredient) }))); }
function recipe(key) { return recipes().find(r => r.id === key); }
function photo(recipe) { return recipe && !recipe.isUserCreated ? `/assets/drinks/${recipe.id}.png` : '/assets/drinks/custom.png'; }
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function addLog(r, logID = id('log'), look = {}) {
  update(draft => {
    if (draft.logs.some(l => l.id === logID)) return;
    draft.logs.push({ id: logID, date: today(), name: r.chineseName, note: '', recipeID: r.id, ...core.drinkAppearance(r, look) });
  });
  return logID;
}
function card(r, snapshot, dna) {
  const match = core.match(r, snapshot.inventory), p = taste.profile(r);
  return { id: r.id, name: r.chineseName, english: r.englishName, image: photo(r),
    base: p.base, family: p.family, color: core.drinkAppearance(r).color, custom: !!r.isUserCreated,
    missing: match.count, favorite: snapshot.favorites.includes(r.id),
    score: dna.ready && !p.unknown.length ? taste.score(p.vector, dna.vector) : null };
}
module.exports = { core, taste, data, get, load, save, update, recipes, recipe, photo, today, id, addLog, card, bytes, validate,
  isBlocked: () => blocked, rawPaths: () => ['a', 'b'].map(path) };
