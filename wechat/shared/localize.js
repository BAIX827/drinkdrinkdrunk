const E = require('./engine');
E.i18n.add(require('./i18n-extra'));
function view(data) {
  const keepKeys = new Set(['id','key','recipeID','type','shape','color','image','photos','sourceURL','url','src','date','month','selected','strength','scope','stock','sort','rating','action','target','hintRaw','nameRaw','theme']);
  function visit(value, key = '', preserve = false, depth = 0) {
    if (typeof value === 'string') return preserve || keepKeys.has(key) || ['backupText','english','recipeNames','compareOptions'].includes(key) || depth === 1 && ['name','ingredients','method','note'].includes(key) ? value : E.i18n.t(value);
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(child => visit(child, key, preserve, depth + 1));
    const custom = preserve || value.isUserCreated || value.custom;
    const result = {};
    for (const field of Object.keys(value)) {
      if (['v','_raw','photos','backupText'].includes(field)) continue;
      const userText = field === 'name' && (('type' in value && value.name !== value.type) || (['logs','history'].includes(key) && value.userNamed)) || field === 'note' && 'date' in value;
      result[field] = visit(value[field], field, custom || userText || ['step','stepList','ingredients','nextLabel'].includes(field) && data.recipe && data.recipe.isUserCreated, depth + 1);
      if (E.i18n.locale === 'en' && !userText && (field === 'chineseName' || field === 'name')) {
        if (value.englishName) result[field] = value.englishName;
        else if (value.english && value.id) result[field] = value.english;
        else if (value.recipe && !value.userNamed) result[field] = value.recipe.englishName || result[field];
      }
    }
    if (!depth) return result;
    result._raw = Object.fromEntries(Object.entries(value).filter(([key])=>!['photos','backupText'].includes(key)));
    return result;
  }
  return visit(data);
}
module.exports = { view, t: value => E.i18n.t(value) };
