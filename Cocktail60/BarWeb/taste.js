/* Deterministic local taste estimates and preference learning. No network or AI. */
(() => {
  const dimensions = ["甜感", "酸感", "苦感", "酒感", "果香", "草本", "烟熏", "醇厚"];
  const weights = [1.2, 1.2, 1.2, 1.3, 1, 0.8, 0.8, 0.7];
  const neutral = [50, 50, 25, 45, 45, 25, 10, 40];
  const drinks = {
    lemonade: ["清新柠檬水", [45,80,10,30,70,15,5,20]],
    cola: ["可乐", [75,30,20,35,30,20,5,40]],
    coffee: ["黑咖啡", [15,30,75,50,15,30,15,65]],
    tropical: ["热带果汁", [70,45,10,30,90,10,5,50]],
  };
  const styles = {
    fresh: ["清爽", [40,65,20,30,65,40,5,20]],
    sweet: ["香甜", [80,30,10,35,55,20,5,55]],
    strong: ["浓烈", [30,25,40,80,25,35,25,60]],
    fruity: ["果香", [60,55,15,35,90,20,5,35]],
    dry: ["干爽", [15,35,35,55,30,50,10,25]],
    bitter: ["微苦", [30,30,75,45,30,55,15,40]],
  };
  const flavors = {
    coffee: ["咖啡", 2], lemon: ["柠檬", 1], orange: ["橙子", 4], berry: ["莓果", 4],
    mint: ["薄荷", 5], ginger: ["生姜", 5], coconut: ["椰子", 7], chocolate: ["巧克力", 7], smoky: ["烟熏", 6],
  };
  const palette = {
    lemon: ["柠檬", "#d6b958", [30,85,10,45,75,15,5,20]],
    orange: ["橙子", "#da945a", [65,50,15,45,85,15,5,30]],
    berry: ["莓果", "#b77189", [60,60,10,45,90,10,5,35]],
    mint: ["薄荷", "#78a891", [25,40,25,45,25,90,5,15]],
    ginger: ["生姜", "#bc975d", [30,30,25,45,25,75,10,30]],
    coffee: ["咖啡", "#956f59", [15,25,80,45,10,25,20,65]],
    coconut: ["椰子", "#b9ae90", [65,10,10,45,35,10,5,90]],
    chocolate: ["巧克力", "#916f78", [70,10,45,45,10,10,10,85]],
    smoky: ["烟熏", "#84969a", [20,15,45,45,10,35,90,55]],
  };
  const strengths = { light: ["轻柔", 25], balanced: ["适中", 45], bold: ["浓烈", 75] };
  const feedback = { sweet: ["太甜", 0, -25], sour: ["太酸", 1, -25], bitter: ["太苦", 2, -25], strong: ["太烈", 3, -25], weak: ["太淡", 3, 25] };
  const clamp = n => Math.max(0, Math.min(100, n));
  const vectorValid = v => Array.isArray(v) && v.length === 8 && v.every(n => Number.isFinite(n) && n >= 0 && n <= 100);
  const empty = () => ({ onboarding: null, ratings: [] });
  function validate(value) {
    const text = s => typeof s === "string" && s.length > 0 && s.length <= 200;
    const list = (items, choices) => Array.isArray(items) && items.length <= Object.keys(choices).length && new Set(items).size === items.length && items.every(k => Object.hasOwn(choices, k));
    const o = value?.onboarding;
    const paletteMode = !!o && Object.hasOwn(o, "palette");
    const validSeed = o === null || (o && (paletteMode
      ? list(o.palette, palette) && o.palette.length > 0 && Object.hasOwn(strengths, o.strength)
      : Object.hasOwn(drinks, o.drink) && Object.hasOwn(styles, o.style) && list(o.flavors, flavors)));
    if (!value || !validSeed ||
      !Array.isArray(value.ratings) || value.ratings.length > 2000 ||
      !value.ratings.every(r => r && text(r.recipeID) && text(r.name) && ["like","okay","dislike"].includes(r.value) &&
        vectorValid(r.vector) && text(r.base) && text(r.family) && list(r.feedback, feedback) &&
        !(r.feedback.includes("strong") && r.feedback.includes("weak")) &&
        typeof r.updatedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.updatedAt) && Number.isFinite(Date.parse(r.updatedAt))) ||
      new Set(value.ratings.map(r => r.recipeID)).size !== value.ratings.length) throw new Error("口味档案格式不正确。");
    return { onboarding: o ? (paletteMode ? { palette: [...o.palette], strength: o.strength } : { drink: o.drink, style: o.style, flavors: [...o.flavors] }) : null,
      ratings: value.ratings.map(r => ({ recipeID:r.recipeID, name:r.name, value:r.value, vector:[...r.vector], base:r.base, family:r.family, feedback:[...r.feedback], updatedAt:r.updatedAt })) };
  }
  function initial(answers) {
    if (!answers) return [...neutral];
    if (answers.palette) {
      const vector = neutral.map((n,i) => Math.round((n + answers.palette.reduce((sum,key) => sum + palette[key][2][i], 0)) / (answers.palette.length + 1)));
      vector[3] = strengths[answers.strength][1];
      return vector;
    }
    const vector = drinks[answers.drink][1].map((v,i) => (v + styles[answers.style][1][i]) / 2);
    const selected = new Set(answers.flavors.map(k => flavors[k][1]));
    for (const i of selected) vector[i] = clamp(vector[i] + 12);
    return vector.map(Math.round);
  }
  function amount(raw) {
    const match = raw.match(/(\d+(?:\.\d+)?)(?:\s*(?:到|[-–])\s*(\d+(?:\.\d+)?))?\s*(ml|毫升|cl|oz|g|克)/i);
    if (match) return (Number(match[1]) + Number(match[2] || match[1])) / 2 * ({cl:10,oz:30,g:1.5,"克":1.5}[match[3].toLowerCase()] || 1);
    if (/补满/.test(raw)) return 90;
    if (/苦精|苦艾|橙花水|盐|胡椒|辣椒/.test(raw)) return 3;
    if (/薄荷|柠檬皮/.test(raw)) return 8;
    if (/糖/.test(raw)) return 10;
    return 20;
  }
  function profile(recipe) {
    const parts = (recipe.parts || recipe.ingredients.map(BarCore.ingredient)).filter(p => !p.optional && !p.substitution);
    const vectors = [], bases = Object.create(null), unknown = [];
    for (const part of parts) {
      const name = BarCore.canonical(part.types[0]);
      const data = Object.hasOwn(BarTasteData, name) ? BarTasteData[name] : null;
      if (!data) { unknown.push(name); continue; }
      if (/碎冰|盐|柠檬片|青柠片|柠檬皮/.test(name)) continue;
      const volume = amount(part.raw);
      vectors.push({ ...data, volume });
      if (data.base) bases[data.base] = (bases[data.base] || 0) + volume;
    }
    const volume = vectors.reduce((sum,v) => sum + v.volume, 0) || 1;
    // Acidity is perceptible at low juice ratios; body should not be amplified
    // like aroma. These are editorial response curves, not chemical measurements.
    const scale = [1.8, 1, 1.55, 0.9, 1.65, 1.3, 1.6, 1];
    const vector = neutral.map((_,i) => {
      const average = vectors.reduce((sum,v) => sum+v.vector[i]*v.volume,0)/volume;
      return Math.round(clamp(i===1 ? 100*(1-Math.exp(-average/28)) : average*scale[i]));
    });
    const names = parts.map(p=>p.types.join(" ")).join(" ");
    if (/薄荷/.test(names)) vector[5] = Math.max(60, vector[5]);
    const family = /热饮|热咖啡/.test(recipe.method) ? "热饮系"
      : /奶油|牛奶|百利甜|椰浆|可可/.test(names) ? "奶香甜点系"
      : /金巴利|阿佩罗/.test(names) ? "苦甜开胃系"
      : /苏打|汤力|汽水|可乐|姜汁|香槟|普洛赛克/.test(names) ? "清爽长饮系"
      : /柠檬汁|青柠/.test(names) ? "酸甜系 Sour"
      : vector[4] >= 45 && vector[3] < 55 ? "果香系"
      : vector[3] < 10 ? "轻盈调和系" : "经典烈酒系";
    return { vector, family, base:Object.entries(bases).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0] || "无基酒", unknown,
      estimated:true, approximate:parts.some(p=>/补满|到|少量|适量/.test(p.raw)) };
  }
  const distance = (a,b) => Math.sqrt(a.reduce((sum,v,i)=>sum+weights[i]*(v-b[i])**2,0)/weights.reduce((a,b)=>a+b,0));
  const score = (a,b) => Math.round(clamp(100-distance(a,b)));
  const strength = vector => vector[3] < 35 ? "轻柔" : vector[3] < 65 ? "适中" : "浓烈";
  function characteristics(vector) {
    return vector.map((v,i)=>({v,i})).filter(x=>x.i!==3 && x.v>=45).sort((a,b)=>b.v-a.v||a.i-b.i).slice(0,3).map(x=>dimensions[x.i]);
  }
  function describe(vector) {
    const names = characteristics(vector);
    return `${names.length ? `${names.join("、")}更突出` : "风味较轻盈"}，酒感${strength(vector)}。`;
  }
  function dna(taste = empty()) {
    const seed = initial(taste.onboarding), sums = seed.map(v=>v*5);
    const ratings = [...taste.ratings].sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt)||a.recipeID.localeCompare(b.recipeID));
    let total = 5;
    const bases = Object.create(null), families = Object.create(null);
    ratings.forEach((r,index)=>{
      const recent = 0.5 + 0.5 * 2 ** (-(ratings.length-1-index)/12);
      const weight = recent * ({like:1,okay:0.5,dislike:0.75}[r.value]);
      const target = r.vector.map((v,i)=>r.value === "dislike" ? clamp(seed[i]+(seed[i]-v)*0.5) : r.value === "okay" ? (seed[i]+v)/2 : v);
      for (const key of r.feedback) {
        const [,i,delta]=feedback[key]; target[i]=clamp(r.vector[i]+delta);
      }
      target.forEach((v,i)=>{ sums[i]+=v*weight; }); total+=weight;
      if(r.value==="like") {
        bases[r.base]=(bases[r.base]||0)+recent;
        families[r.family]=(families[r.family]||0)+recent;
      }
    });
    const favourite = values => Object.entries(values).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0] || "等待喜欢的记录";
    const vector=sums.map(v=>Math.round(v/total));
    return { vector, ready:!!taste.onboarding||ratings.length>0, count:ratings.length,
      stage:ratings.length<3?"DNA 起步":ratings.length<10?"DNA 形成中":"DNA 逐渐清晰",
      evidence:ratings.length<3?"目前只是初步线索，匹配仅供探索。":ratings.length<10?"正在结合你的真实反馈调整。":"已积累一些偏好线索，口味仍会变化。",
      base:favourite(bases), family:favourite(families), explored:new Set(ratings.map(r=>r.family)).size,
      description:describe(vector) };
  }
  function explain(profile, user) {
    if (!user.ready) return "选择喜欢的风味，或评价喝过的酒。";
    if(profile.unknown.length) return "部分材料尚无风味数据，暂不计算匹配度。";
    const closest=profile.vector.map((v,i)=>({i,d:Math.abs(v-user.vector[i])})).filter(x=>user.vector[x.i]>=30 || profile.vector[x.i]>=30).sort((a,b)=>a.d-b.d||a.i-b.i).slice(0,2);
    const different=profile.vector.map((v,i)=>({i,d:v-user.vector[i]})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)||a.i-b.i)[0];
    return `${closest.length?`${closest.map(x=>dimensions[x.i]).join("、")}接近你的偏好`:"整体风味较轻盈"}${Math.abs(different.d)>=15?`；${dimensions[different.i]}${different.d>0?"更突出":"更轻"}`:"，整体风格相近"}。`;
  }
  function recommend(recipes, taste, user=dna(taste)) {
    if(!user.ready) return [];
    const disliked=new Set(taste.ratings.filter(r=>r.value==="dislike").map(r=>r.recipeID));
    const ranked=recipes.map(r=>({recipe:r,profile:profile(r)})).filter(x=>!x.profile.unknown.length&&!disliked.has(x.recipe.id))
      .map(x=>({...x,score:score(x.profile.vector,user.vector)})).sort((a,b)=>b.score-a.score||a.recipe.id.localeCompare(b.recipe.id));
    return [
      { title:"贴合你的口味", subtitle:"从熟悉的味道开始", items:ranked.filter(x=>x.score>=75).slice(0,3) },
      { title:"换一点新口味", subtitle:"保留相似之处，尝试一点变化", items:ranked.filter(x=>x.score>=65&&x.score<85).slice(0,3) },
      { title:"喜欢的家族", subtitle:user.family, items:ranked.filter(x=>x.profile.family===user.family).slice(0,3) },
      { title:"走出熟悉口味", subtitle:"差异适中，先看看哪里不同", items:ranked.filter(x=>x.score>=45&&x.score<65).slice(0,3) },
    ];
  }
  globalThis.BarTaste={dimensions,drinks,styles,flavors,palette,strengths,feedback,empty,validate,initial,profile,dna,score,distance,strength,characteristics,describe,explain,recommend};
})();
