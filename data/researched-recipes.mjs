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
