// Compile the existing library's known methods into small reusable procedures.
// Special techniques are explicit; unknown/new wording must be reviewed at build time.
export function compileProcedure(recipe) {
  const parts = recipe.parts;
  const method = recipe.method;
  const steps = [];
  const added = new Set();
  const step = (action, target, tool, hint, extra = {}) =>
    steps.push({ action, target, tool, hint, ...extra });
  const add = (index, target, action = "pour", hint) => {
    if (added.has(index) || parts[index].substitution) return;
    added.add(index);
    step(
      action,
      target,
      action === "garnish" ? "装饰夹" : "量酒器 / 量勺",
      hint ||
        `${parts[index].optional ? "可选：" : ""}将 ${parts[index].raw} 加入${vesselNames[target]}。`,
      { part: index },
    );
  };
  const ice = (target) =>
    step("ice", target, "冰夹", `在${vesselNames[target]}中加入冰块。`);
  const stir = (target) =>
    step("stir", target, "吧勺", "按原方轻轻搅拌至调和。", { duration: 20 });
  const shake = (dry = false) =>
    step(
      "shake",
      "shaker",
      "摇壶",
      dry
        ? "先不加冰，盖紧摇壶干摇；可选蛋白未使用时可跳过此步。"
        : "盖紧摇壶，加冰摇匀。",
      { duration: 15 },
    );
  const serve = (target, strain = true) =>
    step(
      strain ? "strain" : "serve",
      "glass",
      strain ? "滤冰器" : vesselNames[target],
      strain ? "过滤冰块，将酒液倒入最终酒杯。" : "将调好的酒液倒入最终酒杯。",
      { source: target },
    );
  const find = (pattern) => parts.findIndex((p) => pattern.test(p.raw));
  const all = (target, exclude = []) =>
    parts.forEach((p, i) => {
      if (!exclude.includes(i) && !/可选.*盐|盐边/.test(p.raw)) add(i, target);
    });
  const finish = () => {
    // Every original ingredient must be accounted for, including optional garnish.
    parts.forEach((p, i) => {
      if (!added.has(i) && !p.substitution) add(i, "glass", "garnish");
    });
    if (recipe.note)
      steps.unshift({
        action: "method",
        target: "glass",
        tool: "原方备注",
        hint: recipe.note,
      });
    return steps;
  };
  const special = recipe.id;
  if (special === "world-045-sazerac") {
    add(3, "glass", "rinse", "以苦艾酒润洗最终酒杯，倒掉多余酒液。");
    add(1, "mixing", "muddle", "将方糖放入调酒杯。");
    add(2, "mixing", "pour", "加入苦精，将糖压碎调和。");
    add(0, "mixing");
    ice("mixing");
    stir("mixing");
    serve("mixing");
    return finish();
  }
  if (special === "world-036-old-fashioned") {
    add(1, "glass");
    add(2, "glass");
    add(3, "glass");
    step("muddle", "glass", "捣棒 / 吧勺", "将糖、苦精和水压碎调和。");
    add(0, "glass");
    ice("glass");
    stir("glass");
    return finish();
  }
  if (special === "world-046-irish-coffee") {
    add(2, "glass");
    add(1, "glass", "pour", "将热咖啡倒入耐热杯，搅拌溶解糖。");
    add(0, "glass");
    stir("glass");
    add(3, "glass", "float", "沿勺背缓缓加入奶油，使其漂浮在表面。");
    return finish();
  }
  if (special === "world-059-caipirinha") {
    add(1, "glass");
    add(2, "glass");
    step("muddle", "glass", "捣棒", "压碎青柠与糖，释放汁液。");
    add(0, "glass");
    ice("glass");
    stir("glass");
    return finish();
  }
  if (
    special === "world-040-mint-julep" ||
    /薄荷.*轻压|轻压薄荷/.test(method)
  ) {
    const mint = find(/薄荷/),
      sugar = find(/糖浆/),
      lime = find(/青柠汁/),
      crushed = find(/碎冰/);
    [sugar, lime, mint].filter((i) => i >= 0).forEach((i) => add(i, "glass"));
    step("muddle", "glass", "捣棒", "轻压薄荷与酸甜料，释放香气。");
    if (crushed >= 0) add(crushed, "glass", "ice");
    else ice("glass");
    const soda = find(/苏打水/);
    all("glass", [soda]);
    if (soda >= 0) add(soda, "glass", "top", "最后用苏打水补满。");
    stir("glass");
    return finish();
  }
  if (/热咖啡中|热饮搅匀/.test(method)) {
    all("glass");
    stir("glass");
    step("method", "glass", "耐热杯", `本次演示热饮版本；原方：${method}`);
    return finish();
  }
  if (/冰镇后直接调和/.test(method)) {
    all("glass");
    stir("glass");
    return finish();
  }
  if (/轻轻搅匀/.test(method) && !/加冰/.test(method)) {
    all("glass");
    stir("glass");
    return finish();
  }
  if (method === "杯中搅拌，加入大冰块") {
    all("glass");
    stir("glass");
    ice("glass");
    return finish();
  }
  if (/前三项摇匀后加入红酒|摇匀后漂浮泥煤/.test(method)) {
    const floated = find(/漂浮/);
    all("shaker", [floated]);
    ice("shaker");
    shake();
    serve("shaker");
    add(floated, "glass", "float", "最后沿勺背缓缓加入，形成表面漂浮层。");
    return finish();
  }
  if (method === "碎冰杯中制作，黑莓利口酒最后淋入。") {
    ice("glass");
    all("glass", [3]);
    stir("glass");
    add(3, "glass", "top", "最后将黑莓利口酒淋入杯中。");
    return finish();
  }
  if (/摇匀|加冰摇|先干摇/.test(method)) {
    const post = parts
      .map((p, i) => (/补满|苏打水|香槟/.test(p.raw) ? i : -1))
      .filter((i) => i >= 0);
    const garnishes = parts
      .map((p, i) => (/皮可选|片$|盐边/.test(p.raw) ? i : -1))
      .filter((i) => i >= 0);
    garnishes
      .filter((i) => /盐边/.test(parts[i].raw))
      .forEach((i) => add(i, "glass", "garnish", "可选：预先准备盐边杯。"));
    if (/糖边/.test(method))
      step("garnish", "glass", "糖碟", "原方可选：预先准备糖边杯。");
    all("shaker", [...post, ...garnishes]);
    if (/先干摇/.test(method)) shake(true);
    ice("shaker");
    shake();
    serve("shaker", !method.includes("倒入"));
    post.forEach((i) =>
      add(
        i,
        "glass",
        "top",
        "摇匀并入杯后，再缓缓加入这项材料；不要放进摇壶中摇。",
      ),
    );
    return finish();
  }
  if (/加冰搅拌.*滤|搅拌，过滤/.test(method)) {
    ice("mixing");
    all("mixing");
    stir("mixing");
    serve("mixing");
    if (/橄榄或柠檬皮/.test(method))
      step("garnish", "glass", "装饰夹", "以橄榄或柠檬皮装饰。");
    return finish();
  }
  if (/加冰直调|加冰轻轻搅匀|加冰搅拌|杯中搅拌/.test(method)) {
    const final = parts
      .map((p, i) => (/补满|片$|皮可选|盐边/.test(p.raw) ? i : -1))
      .filter((i) => i >= 0);
    if (/石榴糖浆最后/.test(method)) final.push(find(/石榴糖浆/));
    ice("glass");
    all("glass", final);
    final
      .filter((i) => !/片$|皮可选|盐边/.test(parts[i].raw))
      .forEach((i) => add(i, "glass", "top"));
    if (!/石榴糖浆最后/.test(method)) stir("glass");
    return finish();
  }
  throw new Error(
    `Review and author an explicit procedure for ${recipe.id}: ${method}`,
  );
}
const vesselNames = {
  glass: "最终酒杯",
  mixing: "调酒杯",
  shaker: "摇壶",
  blender: "搅拌机",
};
