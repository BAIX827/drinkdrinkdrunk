// iPhone integration helpers also run without WebKit for migration regression tests.
(() => {
  const compact = value => String(value || '').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  function searchScore(recipe, query, translate = value => value) {
    const terms = [...new Set([...query.split(/[\s,，、]+/).map(compact), compact(query)].filter(Boolean))];
    if (!terms.length) return 1;
    const names = [compact(recipe.chineseName), compact(recipe.englishName)];
    const tags = compact(`${recipe.tags.join(' ')} ${translate(recipe.tags.join(' '))}`);
    const ingredients = compact(`${recipe.ingredients.join(' ')} ${translate(recipe.ingredients.join(' '))}`);
    const other = compact(`${recipe.glass} ${recipe.method} ${recipe.note || ''}`);
    return terms.reduce((score, term) => score + (names.includes(term) ? 140 : names.some(n => n.startsWith(term)) ? 100 : names.some(n => n.includes(term)) ? 85 : tags.includes(term) ? 65 : ingredients.includes(term) ? 55 : other.includes(term) ? 20 : 0), 0);
  }
  function mergeLegacy(state, legacy) {
    if (!legacy) return state;
    // Receipts survive deletions: removed recipes must never return on next launch.
    const consumed = new Set([...(state.nativeImportedRecipeIDs || []), ...(legacy.consumedRecipeIDs || [])]);
    const recipes = new Map(state.customRecipes.map(r => [r.id, r]));
    for (const recipe of legacy.recipes || []) {
      if (!consumed.has(recipe.id) && !recipes.has(recipe.id)) recipes.set(recipe.id, recipe);
      consumed.add(recipe.id);
    }
    const logs = new Map(state.logs.map(log => [log.id, log]));
    const sources = new Set(state.nativeMigrationSources || []);
    const migrateRecords = !legacy.migrated && (legacy.sourceID ? !sources.has(legacy.sourceID) : !state.nativeMigrationVersion);
    if (migrateRecords) {
      for (const log of legacy.logs || []) if (!logs.has(log.id)) logs.set(log.id, log);
    }
    if (legacy.sourceID) sources.add(legacy.sourceID);
    return BarCore.validateState({ ...state, customRecipes: [...recipes.values()], logs: [...logs.values()],
      favorites: migrateRecords ? [...new Set([...state.favorites, ...(legacy.favorites || [])])] : state.favorites,
      nativeMigrationVersion: 1, nativeMigrationSources: [...sources], nativeImportedRecipeIDs: [...consumed] });
  }
  globalThis.BarIPhone = { mergeLegacy, searchScore };
})();
