// Quantities checked against linked IBA recipes on 2026-09-30. Instructions paraphrased.
const step = (action, target, hint, part) => ({ action, target, hint,
  tool: ({ ice: '冰铲', shake: '摇壶', strain: '滤冰器', float: '吧勺', garnish: '装饰夹', stir: '吧勺' })[action] || '量酒器',
  ...(part === undefined ? {} : { part }) });
function shaken(ingredients, garnish) {
  return [...ingredients.map((raw, part) => step('pour', 'shaker', `量取并加入 ${raw}。`, part)),
    step('ice', 'shaker', '加入冰块。'), step('shake', 'shaker', '摇匀至充分冷却。'),
    step('strain', 'glass', '过滤到预冷的酒杯中。'),
    ...(garnish ? [step('garnish', 'glass', garnish)] : [])];
}
const entries = [
  ['paper-plane','纸飞机','Paper Plane',['波本 30 ml','Amaro Nonino 30 ml','阿佩罗 30 ml','柠檬汁 30 ml'],'#df9751'],
  ['last-word','最后一语','Last Word',['金酒 22.5 ml','绿查特酒 22.5 ml','马拉斯奇诺 22.5 ml','青柠汁 22.5 ml'],'#c8d38e'],
  ['french-martini','法式马天尼','French Martini',['伏特加 45 ml','覆盆子利口酒 15 ml','菠萝汁 15 ml'],'#d394a1','在表面挤出柠檬皮油。'],
  ['grasshopper','蚱蜢','Grasshopper',['白可可利口酒 20 ml','绿薄荷利口酒 20 ml','奶油 20 ml'],'#a9d3a6','可用薄荷叶装饰。'],
  ['hemingway-special','海明威特调','Hemingway Special',['朗姆 60 ml','西柚汁 40 ml','马拉斯奇诺 15 ml','青柠汁 15 ml'],'#eed2b8'],
  ['corpse-reviver-2','亡者复苏二号','Corpse Reviver #2',['金酒 30 ml','君度 30 ml','Lillet Blanc 30 ml','柠檬汁 30 ml','苦艾酒 1 dash'],'#e4dba4','用橙皮装饰。'],
  ['gin-basil-smash','金酒罗勒司马什','Gin Basil Smash',['金酒 60 ml','柠檬汁 22.5 ml','糖浆 22.5 ml','罗勒 10 片'],'#99b664'],
];
export const researchedRecipes = entries.map(([slug, chineseName, englishName, ingredients, color, garnish]) => ({
  id: `iba-${slug}`, chineseName, englishName, ingredients, glass: '鸡尾酒杯', tags: ['IBA 精选','摇和'],
  method: `材料与冰块加入摇壶，${slug === 'grasshopper' ? '短暂摇匀' : slug === 'gin-basil-smash' ? '用力摇匀' : '摇匀'}后过滤入预冷的${slug === 'hemingway-special' ? '大号' : ''}鸡尾酒杯。${garnish || '不需装饰。'}`,
  steps: shaken(ingredients, garnish).map(s => s.action === 'shake' ? {...s, hint: slug === 'grasshopper' ? '短暂摇匀即可。' : slug === 'gin-basil-smash' ? '用力摇匀，让罗勒释放香气。' : s.hint} : s),
  appearance: { color, garnish: slug === 'grasshopper' ? 'mint' : slug === 'corpse-reviver-2' ? 'orange' : 'none', foam: slug === 'french-martini' },
  source: { title: 'IBA · 官方配方与教程', url: `https://iba-world.com/iba-cocktail/${slug}/` },
}));
researchedRecipes.push(
  { id:'iba-dark-n-stormy',chineseName:'黑暗风暴',englishName:'Dark ’N’ Stormy',glass:'高球杯',tags:['IBA 精选','分层'],
    ingredients:['黑朗姆 60 ml','姜汁啤酒 100 ml'], method:'高球杯装满冰，先倒入姜汁啤酒，再将 Goslings 朗姆漂浮在上层。用青柠角或片装饰。',note:'IBA 指定 Goslings 朗姆；使用其他黑朗姆时是家庭替代版本。',
    steps:[step('ice','glass','高球杯装满冰块。'),step('pour','glass','先倒入姜汁啤酒，保留气泡。',1),step('float','glass','沿吧勺背缓慢加入 Goslings 朗姆，让深色酒液浮在上层。',0),step('garnish','glass','用青柠角或片装饰。')],
    appearance:{color:'#ead4a0',layers:['#764325','#ead4a0'],layerPart:'黑朗姆',garnish:'lime',ice:true},
    source:{title:'IBA · 官方配方与教程',url:'https://iba-world.com/iba-cocktail/dark-n-stormy/'} },
  { id:'iba-garibaldi',chineseName:'加里波第',englishName:'Garibaldi',glass:'高球杯',tags:['IBA 精选','直接调和'],
    ingredients:['金巴利 45 ml','橙汁 120 ml'],method:'在高球杯中加冰，加入金巴利和橙汁，轻轻调和，以橙角装饰。',
    steps:[step('ice','glass','高球杯加入冰块。'),step('pour','glass','量取金巴利。',0),step('pour','glass','倒入橙汁。',1),step('stir','glass','轻轻调和。'),step('garnish','glass','以橙角装饰。')],
    appearance:{color:'#ec793f',garnish:'orange',ice:true},source:{title:'IBA · 官方配方与教程',url:'https://iba-world.com/iba-cocktail/garibaldi/'} },
  { id:'iba-brandy-crusta',chineseName:'白兰地克鲁斯塔',englishName:'Brandy Crusta',glass:'细长鸡尾酒杯',tags:['IBA 精选','搅拌'],
    ingredients:['白兰地 52.5 ml','马拉斯奇诺 7.5 ml','橙味利口酒 1 吧勺','柠檬汁 15 ml','糖浆 1 吧勺','苦精 2 dash'],
    method:'用柠檬或橙润湿杯缘，蘸细砂糖，放入一条卷起的长柑橘皮。将其余材料在调酒杯中加冰搅匀，过滤入准备好的杯子。',note:'来源中的吧勺与 dash 保留原单位；糖边和长柑橘皮另外准备。',
    steps:[step('garnish','glass','准备糖边，并将长橙皮或柠檬皮卷在杯内。'),...['白兰地','马拉斯奇诺','橙味利口酒','柠檬汁','糖浆','苦精'].map((n,i)=>step('pour','mixing',`量取${n}加入调酒杯。`,i)),step('ice','mixing','加入冰块。'),step('stir','mixing','充分搅拌冷却。'),step('strain','glass','过滤到准备好的糖边杯。')],
    appearance:{color:'#d4ad62',garnish:'lemon'},source:{title:'IBA · 官方配方与教程',url:'https://iba-world.com/iba-cocktail/brandy-crusta/'} }
);

// Additional established IBA cocktails. Quantities and techniques follow the linked IBA pages.
const additions = [
  ['angel-face','天使之面','Angel Face',['金酒 30 ml','杏子白兰地 30 ml','卡尔瓦多斯 30 ml'],'鸡尾酒杯','加冰摇匀，过滤入冰镇鸡尾酒杯。','shake','#dfb46d'],
  ['between-the-sheets','床笫之间','Between the Sheets',['白朗姆 30 ml','干邑 30 ml','三秒酒 30 ml','柠檬汁 20 ml'],'鸡尾酒杯','加冰摇匀，过滤入冰镇鸡尾酒杯。','shake','#e6cf9c'],
  ['cardinale','红衣主教','Cardinale',['金酒 40 ml','干味美思 20 ml','金巴利 10 ml'],'鸡尾酒杯','加冰搅拌，过滤入冰镇鸡尾酒杯；以柠檬皮装饰。','stir','#ca654e'],
  ['champagne-cocktail','香槟鸡尾酒','Champagne Cocktail',['香槟 90 ml','干邑 10 ml','安格仕苦精 2 dash','方糖 1 块','Grand Marnier 少量可选'],'香槟杯','杯中放方糖并滴上苦精，加入干邑与可选的 Grand Marnier，缓缓倒入冰镇香槟；以橙皮和酒渍樱桃装饰。','champagne','#e9d49a'],
  ['hanky-panky','汉基潘基','Hanky Panky',['金酒 45 ml','甜味美思 45 ml','费奈特 7.5 ml'],'鸡尾酒杯','加冰搅拌，过滤入冰镇鸡尾酒杯；以橙皮装饰。','stir','#a6573e'],
  ['jungle-bird','丛林鸟','Jungle Bird',['黑朗姆 45 ml','金巴利 22.5 ml','菠萝汁 45 ml','青柠汁 15 ml','德梅拉拉糖浆 15 ml'],'岩石杯','加冰摇匀，过滤入盛冰的岩石杯；以菠萝角装饰。','shake-ice','#bf6841'],
  ['kir','基尔','Kir',['黑醋栗利口酒 10 ml','干白葡萄酒 90 ml'],'葡萄酒杯','先倒入黑醋栗利口酒，再缓缓加入干白葡萄酒。','build','#a94a66'],
  ['lemon-drop-martini','柠檬滴马天尼','Lemon Drop Martini',['伏特加 30 ml','三秒酒 20 ml','柠檬汁 15 ml'],'鸡尾酒杯','加冰摇匀，过滤入冰镇鸡尾酒杯。','shake','#e6d381'],
  ['martinez','马丁内斯','Martinez',['金酒 45 ml','甜味美思 45 ml','马拉斯奇诺 1 吧勺','橙味苦精 2 dash'],'鸡尾酒杯','加冰搅拌，过滤入冰镇鸡尾酒杯；以柠檬皮装饰。','stir','#aa593e'],
  ['monkey-gland','猴腺','Monkey Gland',['金酒 45 ml','橙汁 45 ml','苦艾酒 1 汤匙','石榴糖浆 1 汤匙'],'鸡尾酒杯','加冰摇匀，过滤入冰镇鸡尾酒杯。','shake','#d3995b'],
  ['naked-and-famous','赤裸与名声','Naked and Famous',['梅斯卡尔 22.5 ml','黄查特酒 22.5 ml','阿佩罗 22.5 ml','青柠汁 22.5 ml'],'鸡尾酒杯','加冰摇匀，过滤入冰镇鸡尾酒杯。','shake','#de9b61'],
  ['old-cuban','老古巴','Old Cuban',['薄荷 6 到 8 片','陈年朗姆 45 ml','青柠汁 22.5 ml','糖浆 30 ml','安格仕苦精 2 dash','香槟或普罗塞克 60 ml'],'鸡尾酒杯','薄荷、朗姆、青柠汁、糖浆与苦精加冰摇匀，过滤入冰镇杯，最后加入起泡酒；以薄荷枝装饰。','old-cuban','#b89c5a'],
  ['paradise','天堂','Paradise',['金酒 30 ml','杏子白兰地 20 ml','橙汁 15 ml'],'鸡尾酒杯','加冰摇匀，过滤入冰镇鸡尾酒杯。','shake','#e7a569'],
  ['stinger','毒刺','Stinger',['干邑 50 ml','白薄荷利口酒 20 ml'],'鸡尾酒杯','加冰搅拌，过滤入冰镇鸡尾酒杯；可用薄荷叶装饰。','stir','#d4c6ab'],
  ['vieux-carre','老广场','Vieux Carré',['黑麦威士忌 30 ml','干邑 30 ml','甜味美思 30 ml','廊酒 1 吧勺','佩乔氏苦精 2 dash'],'鸡尾酒杯','加冰搅拌，过滤入冰镇鸡尾酒杯；以橙皮和酒渍樱桃装饰。','stir','#b87345'],
];
function stepsFor(mode, ingredients) {
  const pour = (part, target = 'shaker', action = 'pour') => step(action, target, `加入 ${ingredients[part]}。`, part);
  if (mode === 'champagne') return [pour(3,'glass'),pour(2,'glass'),pour(1,'glass'),pour(4,'glass'),pour(0,'glass','top'),step('garnish','glass','用橙皮和酒渍樱桃装饰。')];
  if (mode === 'build') return [pour(0,'glass'),pour(1,'glass','top')];
  if (mode === 'old-cuban') return [0,1,2,3,4].map(i=>pour(i)).concat([step('ice','shaker','加入冰块。'),step('shake','shaker','摇匀至充分冷却。'),step('strain','glass','过滤入冰镇杯。'),pour(5,'glass','top'),step('garnish','glass','以薄荷枝装饰。')]);
  const target = mode === 'stir' ? 'mixing' : 'shaker';
  return ingredients.map((_,i)=>pour(i,target)).concat([step('ice',target,'加入冰块。'),step(mode === 'stir' ? 'stir' : 'shake',target,mode === 'stir' ? '搅拌至充分冷却。' : '摇匀至充分冷却。'),...(mode === 'shake-ice' ? [step('ice','glass','在岩石杯中加入冰块。')] : []),step('strain','glass',mode === 'shake-ice' ? '过滤入盛冰的岩石杯。' : '过滤入冰镇酒杯。')]);
}
const garnishHints = {
  cardinale:'以柠檬皮装饰。',hanky_panky:'以橙皮装饰。',jungle_bird:'以菠萝角装饰。',
  martinez:'以柠檬皮装饰。',stinger:'可用薄荷叶装饰。',vieux_carre:'以橙皮和酒渍樱桃装饰。',
};
researchedRecipes.push(...additions.map(([slug,chineseName,englishName,ingredients,glass,method,mode,color])=>({
  id:`iba-${slug}`,chineseName,englishName,ingredients,glass,method,
  tags:['IBA 精选',mode === 'stir' ? '搅拌' : mode === 'build' || mode === 'champagne' ? '直接调和' : '摇和'],
  steps:[...stepsFor(mode,ingredients),...(garnishHints[slug.replaceAll('-','_')] ? [step('garnish','glass',garnishHints[slug.replaceAll('-','_')])] : [])],appearance:{color,ice:mode === 'shake-ice'},
  source:{title:'IBA · 官方配方与教程',url:`https://iba-world.com/iba-cocktail/${slug}/`},
})));
