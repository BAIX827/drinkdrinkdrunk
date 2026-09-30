// Stylized ingredient-based estimates; actual colour depends on brands and technique.
export function appearanceFor(recipe) {
  if (recipe.appearance) return recipe.appearance;
  const text = recipe.ingredients.join(' '), name = recipe.englishName.toLowerCase();
  let color = '#e5e5c9';
  for (const [pattern, value] of [
    [/威士忌|波本|白兰地|干邑|黑麦|黑朗姆/, '#c68c47'], [/柠檬汁|青柠汁/, '#e7dfa7'],
    [/西柚汁/, '#e8bda2'], [/菠萝汁/, '#e6ca79'], [/橙汁|阿佩罗/, '#efa048'],
    [/蔓越莓|石榴糖浆|覆盆子/, '#d26b7d'], [/金巴利|红味美思/, '#c35639'],
    [/可乐|咖啡/, '#754633'], [/椰浆|奶油|百利|牛奶/, '#e9d9bd'],
    [/番茄汁/, '#c94430'], [/蓝橙|蓝库拉索/, '#43bada'],
  ]) if (pattern.test(text)) color = value;
  const garnish = /mojito|julep|mai tai/.test(name) ? 'mint' : /old fashioned|negroni|spritz/.test(name) ? 'orange'
    : /martini/.test(name) ? 'olive' : /青柠/.test(text) ? 'lime' : /柠檬/.test(text) ? 'lemon' : 'none';
  const look = { color, garnish, ice: /高球|古典|岩石|柯林/.test(recipe.glass), foam: /蛋白/.test(text) };
  if (/tequila sunrise/.test(name)) Object.assign(look,{color:'#f3b24a',layers:['#f4b43f','#df4a48'],layerPart:'石榴糖浆',garnish:'orange'});
  if (/new york sour/.test(name)) Object.assign(look,{color:'#e6c286',layers:['#96354c','#e6c286'],layerPart:'红酒',foam:false});
  if (name === 'white russian') Object.assign(look,{color:'#aa774e',layers:['#f0e1c7','#76503b'],layerPart:'奶油',garnish:'none'});
  if (/espresso martini/.test(name)) Object.assign(look,{color:/百利/.test(text) ? '#b68b68' : '#68432e',garnish:'coffee',foam:true});
  if (/dry martini|vodka martini/.test(name)) Object.assign(look,{color:'#e3e8d6',garnish:'olive'});
  if (/blue hawai/.test(name)) Object.assign(look,{color:'#5bcbd0',garnish:'lime'});
  if (name === 'irish coffee') Object.assign(look,{color:'#63432d',layers:['#f0e5d2','#63432d'],layerPart:'奶油',garnish:'none'});
  if (name === 'aviation') Object.assign(look,{color:'#c0b8d8',garnish:'none'});
  if (name === 'bramble') Object.assign(look,{color:'#e4d3ab',layers:['#e4d3ab','#943c68'],layerPart:'黑莓利口酒',garnish:'lemon'});
  if (/ramos gin fizz/.test(name)) Object.assign(look,{color:'#f2eddb',foam:true});
  return look;
}
