/* Presentation-only localization. Canonical ingredient IDs and saved user text
   stay in their original language. No network translation or DOM observer. */
(() => {
  let locale = 'zh-CN';
  const messages = Object.create(null);
  let matcher;
  const han = /[\u3400-\u9fff]/;
  function add(entries) {
    Object.assign(messages, entries);
    matcher = null;
  }
  function setLocale(value) {
    locale = value === 'en' ? 'en' : 'zh-CN';
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.title = locale === 'en' ? 'drinkdrinkdrunk' : '大喝特喝';
      document.querySelector('#modal')?.setAttribute('aria-label', t('编辑内容'));
    }
  }
  function t(value) {
    const source = String(value ?? '');
    if (locale !== 'en' || !han.test(source)) return source;
    const trimmed = source.trim();
    if (Object.hasOwn(messages, trimmed)) return source.replace(trimmed, messages[trimmed]);
    const step = trimmed.match(/^(可选：)?将 (.+) 加入(.+)。$/);
    if (step) return `${step[1] ? 'Optional: ' : ''}Add ${t(step[2])} to the ${t(step[3]).toLowerCase()}.`;
    const about = trimmed.match(/^(\d+) 款配方，含 (\d+) 款 IBA 精选。$/);
    if (about) return `${about[1]} recipes, including ${about[2]} IBA selections.`;
    const missing = trimmed.match(/^缺 (\d+) 项 · (.+)$/);
    if (missing) return `Missing ${missing[1]}: ${t(missing[2])}`;
    const flavor = trimmed.match(/^(.+)更突出，酒感(.+)。$/);
    if (flavor) return `Prominent notes: ${t(flavor[1])}. ${t(flavor[2])} strength.`;
    const light = trimmed.match(/^风味较轻盈，酒感(.+)。$/);
    if (light) return `Light flavors, with ${t(light[1]).toLowerCase()} strength.`;
    // Longest phrases first: quantities and punctuation remain intact.
    matcher ||= new RegExp(Object.keys(messages).filter(Boolean).sort((a,b)=>b.length-a.length)
      .map(s=>s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
    return source.replace(matcher, s => messages[s])
      .replace(/，|、/g, ', ').replace(/。/g, '. ').replace(/；/g, '; ')
      .replace(/：/g, ': ').replace(/（/g, ' (').replace(/）/g, ')')
      .replace(/「|」|“|”/g, '"').replace(/？/g, '?');
  }
  function html(source) {
    if (locale !== 'en' || !han.test(source)) return source;
    const template = document.createElement('template');
    template.innerHTML = source;
    function visit(node) {
      if (node.nodeType === 3) { node.textContent = t(node.textContent); return; }
      if (node.nodeType === 1) {
        if (node.matches('[translate="no"],script,style')) return;
        // An option without an explicit value uses its label as its data value.
        if (node.tagName === 'OPTION' && !node.hasAttribute('value')) node.value = node.textContent;
        for (const attr of ['aria-label','aria-description','aria-valuetext','title','alt','placeholder','label']) {
          if (node.hasAttribute(attr)) node.setAttribute(attr, t(node.getAttribute(attr)));
        }
        if (node.tagName === 'TEXTAREA') return;
      }
      [...node.childNodes].forEach(visit);
    }
    visit(template.content);
    return template.innerHTML;
  }
  function name(recipe) {
    return locale === 'en' ? recipe.englishName || recipe.chineseName : recipe.chineseName;
  }
  function savedName(record, recipes = globalThis.BarData?.recipes || []) {
    const recipe = recipes.find(r => r.id === record.recipeID);
    return recipe && [recipe.chineseName, recipe.englishName].includes(record.name) ? name(recipe) : record.name;
  }
  function recipeText(recipe, value) { return recipe.isUserCreated ? String(value ?? '') : t(value); }
  function canonicalIngredient(value) {
    const lower = value.toLowerCase();
    return globalThis.BarData?.catalog.find(item => String(messages[item.name] || item.name.replace(/[\u3400-\u9fff]+/g, part => messages[part] || part)).toLowerCase() === lower)?.name || value;
  }
  function month(value) {
    const [y,m] = value.split('-').map(Number);
    const d = new Date(0); d.setFullYear(y,m-1,1);
    return new Intl.DateTimeFormat(locale, {year:'numeric',month:'long'}).format(d);
  }
  function day(value) {
    const [y,m,d] = value.split('-').map(Number);
    const date = new Date(0); date.setFullYear(y,m-1,d);
    return new Intl.DateTimeFormat(locale, {month:'long',day:'numeric'}).format(date);
  }
  globalThis.BarI18n = { add, t, html, setLocale, name, savedName, recipeText, month, day, canonicalIngredient,
    get locale() { return locale; }, get messages() { return {...messages}; },
    get weekdays() { return locale === 'en' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['一','二','三','四','五','六','日']; } };
})();
