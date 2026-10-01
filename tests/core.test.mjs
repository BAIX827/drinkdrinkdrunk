import test from "node:test";
import assert from "node:assert/strict";
import "../Cocktail60/BarWeb/core.js";
import "../Cocktail60/BarWeb/taste.js";
import "../Cocktail60/BarWeb/data.js";
import { readRecipes } from "../scripts/export-recipes.mjs";
import { researchedRecipes } from "../data/researched-recipes.mjs";
import { readFileSync } from "node:fs";
const {
  ingredient,
  match,
  satisfies,
  migrate,
  validateState,
  blankState,
  category,
} = BarCore;
const recipe = (...ingredients) => ({ ingredients });
const stock = (...types) => types.map((type) => ({ type, name: "任意名字" }));

test("bar appearance replaces the old default without changing saved records or explicit themes", () => {
  const state = blankState();
  state.logs = [{ id: "night-test", date: "2026-10-01", name: "我的一杯", note: "保留记录" }];
  assert.equal(state.theme, "bar");
  assert.deepEqual(validateState({ ...state, theme: "system" }), validateState(state));
  for (const theme of ["bar", "light", "dark"]) {
    const restored = validateState(JSON.parse(JSON.stringify({ ...state, theme })));
    assert.equal(restored.theme, theme);
    assert.deepEqual(restored.logs, state.logs);
  }
});

test("journal backup preserves appearance snapshots and accepts old text-only entries", () => {
  const old = {id:"old",date:"2026-09-30",name:"旧日记",note:"保留原文"};
  const current = {id:"new",date:"2026-09-30",name:"金汤力",note:"",recipeID:"gin-and-tonic",glass:"rocks",color:"#b366aa"};
  const state = {...blankState(),logs:[old,current]};
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))).logs,[old,current]);
  for (const change of [{glass:"unknown"},{color:"red"},{color:undefined}]) {
    assert.throws(()=>validateState({...state,logs:[{...current,...change}]}));
  }
  assert.deepEqual(BarCore.drinkAppearance({glass:"马天尼杯",accentHex:"#aa3322"}), {glass:"martini",color:"#aa3322"});
});

test("120 recipe texts and quantities remain identical to the original Swift library", () => {
  const original = readRecipes();
  assert.equal(original.length, 120);
  assert.equal(BarData.recipes.length, 145);
  for (const r of BarData.recipes.filter(r => !r.source)) {
    const source = original.find((x) => x.id === r.id);
    for (const key of ["ingredients", "method", "glass", "note"])
      assert.deepEqual(r[key], source[key]);
    assert.ok(
      r.parts.every((p) => p.types.length && p.types.every(Boolean)),
      r.id,
    );
  }
});
test("curated recipes are present once in the native and web libraries", () => {
  const swift = readFileSync(new URL("../Cocktail60/CuratedCocktailData.swift", import.meta.url), "utf8");
  const originalIDs = new Set(readRecipes().map(r => r.id));
  assert.equal(researchedRecipes.length, 25);
  assert.equal(new Set(researchedRecipes.map(r => r.id)).size, 25);
  for (const r of researchedRecipes) {
    assert.equal(originalIDs.has(r.id), false, r.id);
    assert.equal(BarData.recipes.filter(x => x.id === r.id).length, 1, r.id);
    assert.ok(swift.includes(`id: "${r.id}"`), r.id);
    for (const ingredient of r.ingredients)
      assert.ok(swift.includes(JSON.stringify(ingredient)), `${r.id}: ${ingredient}`);
  }
});
test("specific spirits satisfy their parent, never a sibling or more specific type", () => {
  assert.equal(satisfies("白朗姆", "朗姆"), true);
  assert.equal(satisfies("朗姆", "白朗姆"), false);
  assert.equal(satisfies("黑朗姆", "白朗姆"), false);
  assert.equal(satisfies("甜味美思", "干味美思"), false);
  assert.equal(satisfies("深色朗姆", "黑朗姆"), true);
  assert.equal(satisfies("我的金酒瓶", "金酒"), false);
});
test("names and bottle color do not affect matching", () => {
  assert.equal(
    match(recipe("金酒 45 ml"), [
      { type: "伏特加", name: "金酒", color: "#79a883" },
    ]).count,
    1,
  );
  assert.equal(
    match(recipe("金酒 45 ml"), [{ type: "金酒", name: "我的蓝瓶" }]).count,
    0,
  );
});
test("selected categories do not imply unchecked ingredients are owned", () => {
  const r = recipe("金酒 45 ml", "柠檬汁 15 ml", "糖浆 10 ml");
  const result = match(r, stock("金酒"), ["spirit"]);
  assert.equal(result.count, 0);
  assert.equal(result.unchecked.length, 2);
  assert.equal(match(r, stock("金酒")).count, 2);
  assert.equal(match(r, stock("金酒"), []).checked, false);
});
test("maximum missing count is inclusive and duplicate requirements count once", () => {
  const r = recipe("金酒 30 ml", "金酒 15 ml", "糖浆 10 ml");
  assert.equal(match(r, []).count, 2);
  assert.equal(match(r, stock("金酒")).count <= 1, true);
  assert.equal(match(r, stock("金酒", "糖浆")).count <= 1, true);
});
test("optional ingredients and substitution notes are not required twice", () => {
  assert.equal(match(recipe("蛋白可选", "咖啡 30 ml 可选"), []).count, 0);
  const p = ingredient("没有龙舌兰糖浆可用普通糖浆 20 ml");
  assert.equal(p.substitution, true);
  assert.equal(p.optional, true);
  assert.equal(ingredient("龙舌兰糖浆 30 ml").category, "syrup");
});
test("alternatives are one required item satisfied by either option", () => {
  const r = recipe("波本或黑麦威士忌 45 ml");
  assert.equal(match(r, stock("波本")).count, 0);
  assert.equal(match(r, stock("黑麦")).count, 0);
  assert.equal(match(r, stock("威士忌")).count, 1);
  assert.equal(
    match(recipe("姜汁啤酒或姜汁汽水 120 ml"), stock("姜汁汽水")).count,
    0,
  );
});
test("amounts and ingredient names preserve decimal, ranges and original wording", () => {
  assert.equal(ingredient("金酒 52.5 ml").amount, "52.5 ml");
  assert.equal(ingredient("汤力水 120 到 150 ml").amount, "120 到 150 ml");
  assert.equal(ingredient("奶油漂浮").types[0], "奶油");
  assert.equal(category("咖啡利口酒"), "spirit");
  for (const name of [
    "伏特加",
    "威士忌",
    "白兰地",
    "泥煤威士忌",
    "爱尔兰威士忌",
  ])
    assert.equal(category(name), "spirit");
});
test("migration preserves unknown names without guessing and does not lose duplicates of different names", () => {
  const result = migrate(
    ["金酒", "我的蓝瓶酒", "金酒", "深色朗姆"],
    BarData.catalog,
  );
  assert.equal(result.length, 3);
  assert.equal(result[1].name, "我的蓝瓶酒");
  assert.equal(result[1].type, "");
  assert.equal(result[2].type, "黑朗姆");
});
test("backup validation rejects malformed, excessive or executable-looking artwork", () => {
  const good = {
    ...blankState(),
    inventory: [
      {
        id: "1",
        name: "我的金酒",
        type: "金酒",
        color: "#112233",
        shape: "bottle",
        drawing: [
          [
            [0, 0],
            [200, 200],
          ],
        ],
      },
    ],
  };
  assert.deepEqual(validateState(good), good);
  assert.throws(() => validateState({ ...good, version: 2 }));
  assert.throws(() =>
    validateState({
      ...good,
      inventory: [{ ...good.inventory[0], drawing: [[["<script>", 0]]] }],
    }),
  );
  assert.throws(() =>
    validateState({
      ...good,
      inventory: [good.inventory[0], good.inventory[0]],
    }),
  );
  assert.throws(() => validateState({ ...good, customRecipes: [{}] }));
});
test("every authored animation refers to a real ingredient and retains its exact quantity", () => {
  const actions = new Set([
    "pour",
    "ice",
    "shake",
    "stir",
    "strain",
    "serve",
    "top",
    "garnish",
    "muddle",
    "blend",
    "float",
    "rinse",
    "method",
  ]);
  assert.equal(BarData.recipes.filter((r) => r.steps).length, 145);
  for (const r of BarData.recipes.filter((r) => r.steps)) {
    assert.ok(r.steps.length > 1);
    for (const step of r.steps) {
      assert.ok(actions.has(step.action));
      assert.ok(step.hint && step.tool && step.target);
      if (step.part !== undefined)
        assert.equal(step.ingredient.raw, r.ingredients[step.part]);
    }
  }
});
test("all listed ingredients are represented and carbonation is never added to the shaker", () => {
  for (const r of BarData.recipes) {
    const represented = new Set(r.steps.map((s) => s.part));
    r.parts.forEach((p, i) => {
      if (!p.substitution)
        assert.ok(represented.has(i), `${r.id} misses ${p.raw}`);
    });
    for (const s of r.steps) {
      if (
        s.ingredient &&
        /汽水|汤力|苏打水|可乐|雪碧|啤酒|香槟|普罗塞克/.test(s.ingredient.raw)
      )
        assert.notEqual(s.target, "shaker", r.id);
    }
  }
});
test("carbonated top-ups stay after shaking in the French 75", () => {
  const r = BarData.recipes.find((r) => r.id === "world-055-french-75");
  assert.ok(
    r.steps.findIndex((s) => s.action === "top") >
      r.steps.findIndex((s) => s.action === "shake"),
  );
  assert.equal(r.steps.at(-1).ingredient.types[0], "香槟");
});
