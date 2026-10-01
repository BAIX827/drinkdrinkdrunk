// Stylized looks for the built-in recipes. Colour is a volume-weighted blend of
// the listed ingredients; garnishes follow the recipe text first, then the
// classic (mostly IBA) presentation of the named drink. Actual colour still
// depends on brands and technique.

// [pattern, colour, tint strength]. Strength is how strongly 1 ml colours the drink.
const tints = [
  [/黑朗姆|深色朗姆|过量朗姆/, '#6e3a1c', 1.1], [/陈年朗姆/, '#b9783c', .8],
  [/百利/, '#c9a07a', 1], [/白可可/, '#f3efe4', .1], [/咖啡利口酒|可可利口酒/, '#3a2014', 3],
  [/浓缩咖啡|冷浓缩|热咖啡|^咖啡/, '#3f2518', 1.5], [/可乐/, '#3e1f14', 2.4], [/冰红茶/, '#a5552a', .9],
  [/杏子白兰地/, '#e08a3a', 1], [/樱桃白兰地/, '#8a1a2a', 1.6],
  [/威士忌|波本|黑麦|苏格兰/, '#c98a3e', .75], [/干邑|白兰地|卡尔瓦多斯/, '#b56f2e', .8], [/杜林标|廊酒|DOM/, '#c2782c', .9],
  [/奶油|牛奶|椰浆/, '#f3ead6', .9], [/蛋白/, '#f6f1e2', .2],
  [/青柠汁/, '#dfe6a0', .45], [/柠檬汁/, '#efe6a6', .45], [/橙汁/, '#f5a23c', 1.1],
  [/菠萝汁/, '#f2d27a', .85], [/西柚汁|葡萄柚汁/, '#f2b0a0', .8], [/西柚汽水/, '#f2d6c6', .3],
  [/蔓越莓/, '#c8344a', 1.3], [/番茄汁/, '#c3321f', 1.5], [/苹果汁/, '#d9a64a', .8], [/桃泥/, '#f4bf8a', 1.1],
  [/石榴糖浆/, '#c21f3a', 3], [/覆盆子/, '#c23a5a', 2.4], [/蜂蜜/, '#e9b44c', .7], [/德梅拉拉/, '#b9772e', .6],
  [/百香果/, '#f0b43a', 1.2], [/杏仁糖浆|肉桂糖浆|龙舌兰糖浆|^糖浆|白糖|方糖/, '#f6efd8', .05],
  [/金巴利/, '#c8102e', 2.2], [/阿佩罗/, '#f26a1f', 1.6], [/Amaro|费奈特/, '#7a3a1e', 1],
  [/甜味美思|红味美思/, '#7a2318', 1.1], [/干味美思/, '#efe9c8', .2], [/Lillet/, '#efd98a', .4],
  [/蓝橙|蓝库拉索/, '#1e8fd6', 2.4], [/绿薄荷/, '#3fae5a', 2.2], [/白薄荷/, '#f2f4ee', .05],
  [/绿查特/, '#9cbf3a', 1.6], [/黄查特/, '#e2c23a', 1.2], [/紫罗兰/, '#7d5fb5', 4],
  [/黑莓利口酒/, '#4b1238', 2], [/黑醋栗/, '#5a0f2e', 2.4], [/桃味利口酒/, '#f5c89a', .5],
  [/橙味利口酒|君度|三秒|Grand Marnier/, '#f6efdc', .08], [/马拉斯奇诺/, '#f2efe4', .05],
  [/汤力水/, '#f3f5ee', .12], [/苏打水/, '#f6f8f4', .04], [/姜汁啤酒/, '#dcc28a', .45], [/姜汁汽水/, '#ead9a8', .3],
  [/雪碧|柠檬汽水/, '#f1f4e6', .08], [/能量饮料/, '#d9e07a', .7], [/啤酒/, '#e2b54c', .7],
  [/香槟|普罗塞克|起泡酒/, '#f1e3a8', .3], [/红酒/, '#6d1a2a', 2.2], [/干白葡萄酒/, '#efe3a6', .3],
  [/苦精/, '#7a1f14', 1.5], [/金酒|伏特加|白朗姆|^朗姆|龙舌兰|皮斯科|卡莎萨|梅斯卡尔|苦艾/, '#f2f1ea', .12],
];
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const toHex = rgb => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function volume(raw) {
  if (/补满/.test(raw)) return 110;
  const range = raw.match(/(\d+(?:\.\d+)?)\s*(?:到|-|～)\s*(\d+(?:\.\d+)?)\s*ml/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const ml = raw.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (ml) return Number(ml[1]);
  if (/吧勺|茶匙|汤匙/.test(raw)) return 5;
  if (/滴|dash|少量|洗杯/.test(raw)) return 1;
  if (/个|块/.test(raw)) return /蛋白/.test(raw) ? 30 : 4;
  return 0;
}
// Blend in linear-ish space, weighted by volume × strength; clear mixers lighten.
export function blendColor(ingredients) {
  let total = 0; const sum = [0, 0, 0];
  for (const raw of ingredients) {
    if (/可选|装饰|薄荷|罗勒|盐|胡椒|伍斯特|辣椒|橙花水/.test(raw) && !/薄荷利口酒/.test(raw)) continue;
    const name = raw.replace(/\s*\d.*$/, '').trim();
    const tint = tints.find(([pattern]) => pattern.test(name));
    if (!tint) continue;
    const weight = volume(raw) * tint[2];
    if (!weight) continue;
    hex(tint[1]).forEach((v, i) => { sum[i] += (v / 255) ** 2.2 * weight; });
    total += weight;
  }
  if (!total) return '#e5e5c9';
  return toHex(sum.map(v => (v / total) ** (1 / 2.2) * 255));
}

const key = name => name.toLowerCase().replace(/[’']/g, "'").replace(/\b(style|variation)\b/g, '').replace(/[^a-z0-9#' ]/g, ' ').replace(/\s+/g, ' ').trim();

// Classic presentation by drink. Only what the drink is known for, and never
// against the recipe's own method text (handled after this table).
const classics = {
  'vesper': { garnish: 'lemon-twist', color: '#ecead0' },
  'silver bullet': { garnish: 'lemon-twist', rock: true },
  'suffering bastard': { garnish: 'mint', extras: ['orange', 'straw'], bubbles: true },
  'brass monkey': { garnish: 'orange-wedge', extras: ['straw'] },
  'acapulco cocktail': { garnish: 'pineapple', extras: ['umbrella', 'cherry'] },
  'baileys white russian': { extras: ['cocoa'], opaque: true },
  'baileys flat white martini': { garnish: 'coffee', foam: true, opaque: true },
  'baileys espresso martini': { garnish: 'coffee', foam: true },
  'mudslide': { extras: ['cocoa', 'straw'], opaque: true, color: '#9a7356' },
  'baileys irish coffee': { foam: true, extras: ['cocoa'] },
  'baileys whisky cream': { extras: ['cinnamon'], opaque: true },
  'baileys rum cream': { extras: ['nutmeg'], opaque: true },
  'tequila rum sour': { garnish: 'lime' },
  'gin rum collins': { garnish: 'lemon', extras: ['cherry', 'straw'], bubbles: true },
  'vodka tequila highball': { garnish: 'lime-wedge', bubbles: true },
  'rum whisky cola': { garnish: 'lime-wedge', extras: ['straw'], bubbles: true },
  'gin tequila tonic': { garnish: 'lime', bubbles: true },
  'vodka rum lime': { garnish: 'lime', extras: ['straw'], bubbles: true },
  'whisky tequila ginger': { garnish: 'lime-wedge', bubbles: true },
  'gin vodka cranberry': { garnish: 'lime-wedge', extras: ['straw'] },
  'three wise men': { garnish: 'none' },
  'creamy three wise men': { extras: ['nutmeg'], opaque: true },
  'gin vodka rum sour': { garnish: 'lemon' },
  'gin vodka tequila sour': { garnish: 'lime' },
  'rum tequila whisky sour': { garnish: 'orange', extras: ['cherry'] },
  'gin rum tequila cooler': { garnish: 'lime', extras: ['mint', 'straw'], bubbles: true },
  'vodka rum whisky cola': { garnish: 'lemon-wedge', extras: ['straw'], bubbles: true },
  'vodka gin whisky tea': { garnish: 'lemon', extras: ['straw'] },
  'vodka rum tequila pineapple': { garnish: 'pineapple', extras: ['cherry', 'straw'] },
  'gin rum whisky ginger': { garnish: 'lime-wedge', bubbles: true },
  'baileys vodka whisky coffee': { foam: true, extras: ['cocoa'] },
  'baileys vodka rum cream': { extras: ['cinnamon'], opaque: true },
  'baileys rum whisky coffee': { foam: true, extras: ['cinnamon'] },
  'tequila gin whisky ginger': { garnish: 'lime', bubbles: true },
  'vodka tequila whisky apple': { garnish: 'apple', extras: ['cinnamon'] },
  'long island iced tea': { garnish: 'lemon-wedge', extras: ['straw'], color: '#a2602e' },
  'texas tea': { garnish: 'lemon', extras: ['straw'], color: '#8b5326' },
  'long beach iced tea': { garnish: 'lemon-wedge', extras: ['straw'] },
  'amf': { garnish: 'lemon', extras: ['cherry', 'straw'], bubbles: true },
  'blue motorcycle': { garnish: 'lemon-twist', extras: ['straw'], bubbles: true },
  'tokyo tea': { garnish: 'lemon-wedge', extras: ['straw'], bubbles: true },
  'grateful dead': { garnish: 'lemon', extras: ['straw'] },
  'electric iced tea': { garnish: 'lemon', extras: ['straw'], bubbles: true },
  'bullfrog': { garnish: 'lime-wedge', extras: ['straw'], bubbles: true },
  'baltimore zoo': { garnish: 'lemon', extras: ['straw'], bubbles: true },
  'fog cutter': { garnish: 'mint', extras: ['orange', 'straw'] },
  'scorpion bowl': { garnish: 'orange', extras: ['umbrella', 'straw'], crushed: true },
  'zombie': { garnish: 'mint', extras: ['cherry', 'straw'], crushed: true },
  'hurricane': { garnish: 'orange', extras: ['cherry', 'umbrella'] },
  'mai tai': { garnish: 'mint', extras: ['lime-wedge'], crushed: true },
  'gin and tonic': { garnish: 'lime', bubbles: true },
  'mojito': { garnish: 'mint', extras: ['lime-wedge', 'straw'], bubbles: true },
  'cuba libre': { garnish: 'lime-wedge', extras: ['straw'], bubbles: true },
  'daiquiri': { garnish: 'lime' },
  "tommy's margarita": { garnish: 'lime' },
  'margarita': { garnish: 'lime', rim: 'salt' },
  'paloma': { garnish: 'grapefruit', bubbles: true },
  'moscow mule': { garnish: 'lime-wedge', extras: ['mint'], bubbles: true, glass: 'mug', copper: true },
  'whiskey sour': { garnish: 'orange', extras: ['cherry', 'bitters'] },
  'old fashioned': { garnish: 'orange-twist', extras: ['cherry'], rock: true, ice: false },
  'dry martini': { garnish: 'olive' },
  'vodka martini': { garnish: 'lemon-twist' },
  'negroni': { garnish: 'orange-twist' },
  'tom collins': { garnish: 'lemon', extras: ['cherry', 'straw'], bubbles: true },
  'john collins': { garnish: 'lemon-wedge', extras: ['cherry', 'straw'], bubbles: true },
  'gin fizz': { garnish: 'lemon-wedge', bubbles: true, foam: true },
  'ramos gin fizz': { garnish: 'none', foam: true, opaque: true, color: '#f4efe0' },
  "bee's knees": { garnish: 'lemon-twist', color: '#ead08a' },
  'aviation': { garnish: 'cherry', color: '#b9b0db' },
  'clover club': { garnish: 'raspberry', foam: true },
  'south side': { garnish: 'mint' },
  'bramble': { garnish: 'blackberry', extras: ['lemon'], crushed: true, ice: false },
  'white lady': { garnish: 'lemon-twist' },
  'cosmopolitan': { garnish: 'orange-twist', color: '#e0566f' },
  'espresso martini': { garnish: 'coffee', foam: true },
  'black russian': { garnish: 'none', rock: true, ice: false, color: '#3b2418' },
  'white russian': { garnish: 'none', extras: ['straw'] },
  'bloody mary': { garnish: 'celery', extras: ['lemon-wedge', 'pepper'], rim: 'spice' },
  'screwdriver': { garnish: 'orange', extras: ['straw'] },
  'sea breeze': { garnish: 'lime-wedge', extras: ['straw'] },
  'sex on the beach': { garnish: 'orange', extras: ['cherry', 'straw'], layers: ['#f2a447', '#c8344a'], layerPart: '蔓越莓汁' },
  'blue lagoon': { garnish: 'lemon', extras: ['cherry', 'straw'], bubbles: true },
  'manhattan': { garnish: 'cherry' },
  'rob roy': { garnish: 'lemon-twist' },
  'mint julep': { garnish: 'mint', extras: ['straw'], crushed: true, ice: false },
  'boulevardier': { garnish: 'orange-twist' },
  'penicillin': { garnish: 'ginger' },
  'new york sour': { garnish: 'lemon-twist' },
  'rusty nail': { garnish: 'lemon-twist', rock: true, ice: false },
  'sazerac': { garnish: 'lemon-twist' },
  'irish coffee': { extras: ['nutmeg'] },
  'tequila sunrise': { garnish: 'orange', extras: ['cherry', 'straw'] },
  'el diablo': { garnish: 'lime-wedge', extras: ['straw'], bubbles: true, layers: ['#e8d4a0', '#7d2346'], layerPart: '黑醋栗利口酒' },
  'batanga': { garnish: 'lime-wedge', extras: ['straw'], rim: 'salt', bubbles: true },
  'americano': { garnish: 'orange', extras: ['lemon-twist'], bubbles: true },
  'aperol spritz': { garnish: 'orange', bubbles: true },
  'bellini': { garnish: 'none', bubbles: true },
  'mimosa': { garnish: 'orange', bubbles: true },
  'french 75': { garnish: 'lemon-twist', bubbles: true },
  'sidecar': { garnish: 'orange-twist', rim: 'sugar' },
  'brandy alexander': { garnish: 'none', extras: ['nutmeg'], opaque: true },
  'pisco sour': { garnish: 'none', extras: ['bitters'], foam: true },
  'caipirinha': { garnish: 'lime-wedge', extras: ['lime'], crushed: true, ice: false },
  'singapore sling': { garnish: 'pineapple', extras: ['cherry'] },
  'french martini': { garnish: 'none', foam: true },
  'grasshopper': { garnish: 'mint', opaque: true },
  'corpse reviver #2': { garnish: 'orange-twist' },
  "dark 'n' stormy": { garnish: 'lime-wedge', extras: ['straw'], bubbles: true },
  'garibaldi': { garnish: 'orange-wedge', foam: true },
  'brandy crusta': { garnish: 'lemon-twist', rim: 'sugar' },
  'cardinale': { garnish: 'lemon-twist' },
  'champagne cocktail': { garnish: 'orange-twist', extras: ['cherry'], bubbles: true },
  'hanky panky': { garnish: 'orange-twist' },
  'jungle bird': { garnish: 'pineapple' },
  'lemon drop martini': { garnish: 'lemon', rim: 'sugar' },
  'martinez': { garnish: 'lemon-twist' },
  'old cuban': { garnish: 'mint', bubbles: true },
  'stinger': { garnish: 'mint' },
  'vieux carre': { garnish: 'orange-twist', extras: ['cherry'] },
};
const flat = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function appearanceFor(recipe) {
  const text = recipe.ingredients.join(' ');
  const method = `${recipe.method || ''} ${recipe.note || ''}`;
  const name = key(flat(recipe.englishName));
  const look = {
    color: blendColor(recipe.ingredients),
    garnish: /青柠/.test(text) ? 'lime' : /柠檬/.test(text) ? 'lemon' : 'none',
    ice: /高球|古典|岩石|柯林|铜/.test(recipe.glass),
    foam: /蛋白/.test(text),
  };
  if (/汤力|苏打|汽水|姜汁啤酒|雪碧|可乐|香槟|普罗塞克|起泡酒|啤酒|能量饮料/.test(text)) look.bubbles = true;
  if (/奶油|牛奶|椰浆|百利/.test(text)) look.opaque = true;
  // Researched (IBA) entries carry a checked colour; keep it as the base.
  if (recipe.appearance) Object.assign(look, recipe.appearance);
  const classic = classics[name];
  if (classic) Object.assign(look, classic);
  if (name === 'pina colada') Object.assign(look, { garnish: 'pineapple', extras: ['cherry', 'straw'], opaque: true, color: '#f1e3c0' });
  // Layered builds that are part of the recipe itself.
  if (/tequila sunrise/.test(name)) Object.assign(look, { color: '#f3b24a', layers: ['#f4b43f', '#df4a48'], layerPart: '石榴糖浆' });
  if (/new york sour/.test(name)) Object.assign(look, { color: '#e6c286', layers: ['#96354c', '#e6c286'], layerPart: '红酒', foam: false });
  if (name === 'white russian') Object.assign(look, { color: '#aa774e', layers: ['#f0e1c7', '#76503b'], layerPart: '奶油' });
  if (name === 'irish coffee') Object.assign(look, { color: '#63432d', layers: ['#f0e5d2', '#63432d'], layerPart: '奶油', garnish: 'none' });
  if (name === 'bramble') Object.assign(look, { color: '#e4d3ab', layers: ['#e4d3ab', '#943c68'], layerPart: '黑莓利口酒' });
  if (/espresso martini/.test(name)) look.color = /百利/.test(text) ? '#b68b68' : '#68432e';
  // The recipe's own wording wins over tradition.
  if (/不需装饰/.test(method)) { look.garnish = 'none'; delete look.extras; }
  if (/盐边/.test(method + text)) look.rim = 'salt';
  if (/糖边/.test(method + text)) look.rim = 'sugar';
  const garnishNote = (method.match(/[^。]*装饰[^。]*/g) || []).join(' ');
  if (/橙皮/.test(garnishNote) && /樱桃/.test(garnishNote)) Object.assign(look, { garnish: 'orange-twist', extras: [...new Set([...(look.extras || []), 'cherry'])] });
  else if (/橙皮/.test(garnishNote)) look.garnish = 'orange-twist';
  else if (/柠檬皮/.test(garnishNote) && !/橄榄/.test(garnishNote)) look.garnish = 'lemon-twist';
  if (/橙角/.test(method)) look.garnish = 'orange-wedge';
  if (/菠萝角/.test(method)) look.garnish = 'pineapple';
  if (/青柠角/.test(method)) look.garnish = 'lime-wedge';
  if (/薄荷(叶|枝)装饰/.test(method)) look.garnish = 'mint';
  if (/碎冰/.test(text + method)) { look.crushed = true; look.ice = false; }
  // Stemmed glasses are served up: no cubes, crushed ice or straws.
  if (/鸡尾酒杯|马天尼|香槟|葡萄酒|玛格丽特|酸酒/.test(recipe.glass)) {
    delete look.crushed; delete look.rock; look.ice = false;
    if (look.extras) look.extras = look.extras.filter(x => x !== 'straw');
  }
  if (look.crushed || look.rock) look.ice = false;
  if (look.extras && !look.extras.length) delete look.extras;
  for (const k of Object.keys(look)) if (look[k] === undefined || look[k] === false && !['ice', 'foam'].includes(k)) delete look[k];
  return look;
}
