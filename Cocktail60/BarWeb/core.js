/* Pure data and matching rules, shared by the browser and both Apple apps. */
(() => {
  const categories = {
    spirit: "酒类",
    juice: "果汁",
    syrup: "糖浆与糖",
    mixer: "饮料与乳品",
    other: "水果与其他",
  };
  const aliases = {
    深色朗姆: "黑朗姆",
    苏格兰威士忌: "苏格兰",
    黑麦威士忌: "黑麦",
    普罗塞克: "普洛赛克",
    葡萄柚汁: "西柚汁",
    薄荷叶: "薄荷",
    冷浓缩咖啡: "浓缩咖啡",
    热咖啡: "咖啡",
    普通糖浆: "糖浆",
    白糖: "糖",
    盐边杯: "盐",
    盐边: "盐",
  };
  const parents = {
    白朗姆: "朗姆",
    黑朗姆: "朗姆",
    椰子朗姆: "朗姆",
    过量朗姆: "朗姆",
    波本: "威士忌",
    黑麦: "威士忌",
    苏格兰: "威士忌",
    爱尔兰威士忌: "威士忌",
    泥煤威士忌: "威士忌",
    干邑: "白兰地",
    干味美思: "味美思",
    甜味美思: "味美思",
    香槟: "起泡酒",
    普洛赛克: "起泡酒",
    君度: "橙味利口酒",
    三秒酒: "橙味利口酒",
    浓缩咖啡: "咖啡",
  };
  const clean = (text) => text.trim().replace(/\s+/g, " ");
  const canonical = (name) => {
    const normalized = globalThis.BarI18n?.canonicalIngredient(clean(name)) || clean(name);
    return Object.hasOwn(aliases, normalized) ? aliases[normalized] : normalized;
  };
  function category(name) {
    if (name === "啤酒") return "spirit";
    if (/糖浆|糖$/.test(name)) return "syrup";
    if (/汁$/.test(name)) return "juice";
    if (
      /汽水|啤酒|汤力|苏打|雪碧|可乐|红茶|能量饮料|奶|咖啡|椰浆/.test(name) &&
      !/利口酒|百利/.test(name)
    )
      return "mixer";
    if (
      /酒|伏特加|威士忌|白兰地|朗姆|金巴利|阿佩罗|普洛赛克|香槟|干邑|波本|黑麦|苏格兰|君度|三秒|味美思|百利甜|Amaro|Lillet|杜林标|DOM|皮斯科|卡莎萨|龙舌兰|柑曼怡|马拉斯奇诺/.test(
        name,
      )
    )
      return "spirit";
    return "other";
  }
  function ingredient(raw) {
    // Preserve the exact original amount, alternatives, and optional markers.
    const substitution = raw.startsWith("没有");
    const text = raw.replace(/^没有龙舌兰糖浆可用/, "");
    const marker = text.search(/\d|补满|少量|可选|漂浮|洗杯|to top up|a little|optional|float|glass rinse/i);
    let names = (marker < 0 ? text : text.slice(0, marker)).trim();
    names = names.replace("波本或黑麦威士忌", "波本或黑麦");
    const types = names.split(/或|\s+or\s+/i).map(canonical);
    return {
      raw,
      types,
      amount: marker < 0 ? "按配方" : text.slice(marker).trim(),
      optional: /可选|\boptional\b/i.test(raw) || substitution,
      substitution,
      category: category(types[0]),
    };
  }
  function satisfies(owned, required) {
    for (let current = canonical(owned); current; current = Object.hasOwn(parents, current) ? parents[current] : null)
      if (current === canonical(required)) return true;
    return false;
  }
  function match(recipe, inventory, selected = Object.keys(categories)) {
    const checked = new Set(selected);
    const missing = new Map();
    const unchecked = [];
    for (const part of recipe.parts || recipe.ingredients.map(ingredient)) {
      if (part.optional) continue;
      if (!checked.has(part.category)) {
        unchecked.push(part);
        continue;
      }
      if (
        !inventory.some((item) =>
          part.types.some((type) => satisfies(item.type, type)),
        )
      )
        missing.set([...part.types].sort().join("|"), part);
    }
    return {
      missing: [...missing.values()],
      unchecked,
      count: missing.size,
      checked: checked.size > 0,
    };
  }
  function migrate(names, catalog) {
    return [...new Set(names)]
      .filter((n) => typeof n === "string" && n.trim())
      .map((name, index) => {
        const type = canonical(name);
        return {
          id: `legacy-${index}`,
          name,
          type: catalog.some((t) => t.name === type) ? type : "",
          color: "#79a883",
          shape: "bottle",
          drawing: [],
          legacy: true,
        };
      });
  }
  const glassNames = {
    coupe: "碟形杯",
    martini: "马天尼杯",
    highball: "高球杯",
    rocks: "古典杯",
    wine: "葡萄酒杯",
    hurricane: "飓风杯",
    mug: "热饮杯",
    shot: "烈酒杯",
    margarita: "玛格丽特杯",
    bowl: "分享碗",
  };
  const bottleShapes = { bottle: '经典长瓶', round: '圆肚酒瓶', whiskey: '方肩威士忌瓶', gin: '平肩金酒瓶', vodka: '圆肩伏特加瓶', tequila: '矮身龙舌兰瓶', rum: '修长朗姆瓶', carton: '果汁纸盒', jar: '糖浆罐' };
  const validColor = value => /^#[0-9a-f]{6}$/i.test(value);
  function validVisual(v) {
    return v && typeof v === 'object' && !Array.isArray(v) &&
      (v.layers === undefined || (Array.isArray(v.layers) && v.layers.length === 2 && v.layers.every(validColor))) &&
      (v.garnish === undefined || ['none','orange','lime','lemon','mint','olive','coffee'].includes(v.garnish)) &&
      ['ice','foam'].every(k => v[k] === undefined || typeof v[k] === 'boolean');
  }
  function drinkAppearance(recipe = {}, selected = {}) {
    const defaultGlass = /飓风/.test(recipe.glass) ? 'hurricane' : /热饮/.test(recipe.glass) ? 'mug'
      : /烈酒/.test(recipe.glass) ? 'shot' : /玛格丽特/.test(recipe.glass) ? 'margarita'
      : /碗/.test(recipe.glass) ? 'bowl' : /高球|铜|柯林/.test(recipe.glass) ? "highball"
      : /岩石|古典/.test(recipe.glass) ? "rocks"
      : /马天尼|鸡尾酒/.test(recipe.glass) ? "martini"
      : /葡萄酒/.test(recipe.glass) ? "wine" : "coupe";
    return {
      ...(recipe.appearance ? { visual: { ...recipe.appearance } } : {}),
      ...(selected.visual ? { visual: { ...selected.visual } } : {}),
      glass: Object.hasOwn(glassNames, selected.glass) ? selected.glass : defaultGlass,
      color: /^#[0-9a-f]{6}$/i.test(selected.color) ? selected.color
        : validColor(recipe.appearance?.color) ? recipe.appearance.color
        : /^#[0-9a-f]{6}$/i.test(recipe.accentHex) ? recipe.accentHex : "#da9561",
    };
  }
  function journalMonth(month, logs = []) {
    const [year, number] = month.split("-").map(Number);
    // UTC is used only for calendar arithmetic; diary dates remain local date strings.
    const first = new Date(0);
    first.setUTCFullYear(year, number - 1, 1);
    const offset = (first.getUTCDay() + 6) % 7;
    const last = new Date(first);
    last.setUTCMonth(number, 0);
    const days = Array.from({ length: last.getUTCDate() }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, "0")}`;
      return { date, day: index + 1, entries: [] };
    });
    for (const log of logs) {
      const day = days[Number(log.date.slice(8)) - 1];
      if (day?.date === log.date) day.entries.push(log);
    }
    const cells = Array(Math.ceil((offset + days.length) / 7) * 7).fill(null);
    days.forEach((day, index) => { cells[offset + index] = day; });
    const shift = (delta) => {
      const date = new Date(first);
      date.setUTCMonth(date.getUTCMonth() + delta);
      const y = date.getUTCFullYear();
      return y < 1 || y > 9999 ? null : `${String(y).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    };
    return { year, number, cells, previous: shift(-1), next: shift(1),
      count: days.reduce((sum, day) => sum + day.entries.length, 0) };
  }
  const blankState = () => ({
    version: 1,
    inventory: [],
    favorites: [],
    customRecipes: [],
    logs: [],
    taste: { onboarding: null, ratings: [] },
    theme: "bar",
    locale: "zh-CN",
    migrated: false,
    guideVersion: 0,
  });
  function validateState(value) {
    if (
      !value ||
      value.version !== 1 ||
      !["inventory", "favorites", "customRecipes", "logs"].every((k) =>
        Array.isArray(value[k]),
      )
    )
      throw new Error("这不是有效的吧台备份文件。");
    if (
      value.inventory.length > 1000 ||
      value.customRecipes.length > 1000 ||
      value.logs.length > 10000
    )
      throw new Error("备份内容过大。");
    const isText = (x) => typeof x === "string" && x.length <= 5000;
    if (
      !value.inventory.every(
        (i) =>
          i &&
          isText(i.id) &&
          isText(i.name) &&
          isText(i.type) &&
          /^#[0-9a-f]{6}$/i.test(i.color) &&
          Object.hasOwn(bottleShapes, i.shape) &&
          Array.isArray(i.drawing) &&
          i.drawing.length <= 200 &&
          i.drawing.every(
            (s) =>
              Array.isArray(s) &&
              s.length <= 2000 &&
              s.every(
                (p) =>
                  Array.isArray(p) &&
                  p.length === 2 &&
                  p.every((v) => Number.isFinite(v) && v >= 0 && v <= 200),
              ),
          ),
      )
    )
      throw new Error("库存数据格式不正确。");
    if (
      !value.favorites.every(isText) ||
      !value.customRecipes.every(
        (r) =>
          r &&
          isText(r.id) &&
          /^user-[a-zA-Z0-9-]+$/.test(r.id) &&
          isText(r.chineseName) &&
          isText(r.englishName) &&
          isText(r.method) &&
          isText(r.glass) &&
          (r.appearance === undefined || (validVisual(r.appearance) && validColor(r.appearance.color))) &&
          Array.isArray(r.ingredients) &&
          r.ingredients.length > 0 &&
          r.ingredients.length <= 100 &&
          r.ingredients.every(isText) &&
          Array.isArray(r.tags) &&
          r.tags.every(isText),
      )
    )
      throw new Error("配方数据格式不正确。");
    if (
      !value.logs.every(
        (l) =>
          l &&
          isText(l.id) &&
          /^\d{4}-\d{2}-\d{2}$/.test(l.date) &&
          isText(l.name) &&
          isText(l.note) &&
          (l.recipeID === undefined || isText(l.recipeID)) &&
          (l.visual === undefined || validVisual(l.visual)) &&
          (l.photos === undefined || (Array.isArray(l.photos) && l.photos.length <= 3 && l.photos.every(p => typeof p === 'string' && p.length <= 180000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p)))) &&
          ((l.glass === undefined && l.color === undefined) ||
            (Object.hasOwn(glassNames, l.glass) && /^#[0-9a-f]{6}$/i.test(l.color))),
      )
    )
      throw new Error("日记数据格式不正确。");
    if (
      new Set(value.inventory.map((i) => i.id)).size !==
        value.inventory.length ||
      new Set(value.customRecipes.map((r) => r.id)).size !==
        value.customRecipes.length
    )
      throw new Error("备份包含重复编号。");
    return {
      ...blankState(),
      ...value,
      taste: value.taste === undefined ? { onboarding: null, ratings: [] } : BarTaste.validate(value.taste),
      customRecipes: value.customRecipes.map(r => ({
        id: r.id, chineseName: r.chineseName, englishName: r.englishName,
        ingredients: r.ingredients, tags: r.tags, glass: r.glass,
        method: r.method, note: typeof r.note === 'string' ? r.note : null,
        accentHex: /^#[0-9a-f]{6}$/i.test(r.accentHex) ? r.accentHex : '#b87b5d',
        ...(r.appearance ? { appearance: { color: r.appearance.color, layers: r.appearance.layers,
          garnish: r.appearance.garnish, ice: r.appearance.ice, foam: r.appearance.foam } } : {}),
        isUserCreated: true,
      })),
      theme: ["bar", "light", "dark"].includes(value.theme)
        ? value.theme
        : "bar",
      guideVersion: value.guideVersion === 1 ? 1 : 0,
      locale: value.locale === "en" ? "en" : "zh-CN",
    };
  }
  globalThis.BarCore = {
    categories,
    canonical,
    category,
    ingredient,
    satisfies,
    match,
    migrate,
    blankState,
    validateState,
    glassNames,
    bottleShapes,
    drinkAppearance,
    journalMonth,
  };
})();
