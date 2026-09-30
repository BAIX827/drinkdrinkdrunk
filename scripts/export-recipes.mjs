import { readFileSync } from "node:fs";

// The existing Swift library remains the source of truth for recipe text.
const strings = (text) =>
  [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) =>
    JSON.parse(`"${m[1]}"`),
  );
export function readRecipes() {
  const classic = readFileSync(
    new URL("../Cocktail60/CocktailData.swift", import.meta.url),
    "utf8",
  );
  const world = readFileSync(
    new URL("../Cocktail60/WorldCocktailData.swift", import.meta.url),
    "utf8",
  );
  const recipes = [];
  for (const m of classic.matchAll(
    /\br\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*\[([\s\S]*?)\],\s*tags:\s*\[([\s\S]*?)\],\s*glass:\s*"([^"]+)",\s*method:\s*"([^"]+)"[\s\S]*?accent:\s*"([^"]+)"\s*\)/g,
  )) {
    const note = m[0].match(/note:\s*"([^"]+)"/);
    recipes.push({
      id: m[1],
      englishName: m[2],
      chineseName: m[3],
      ingredients: strings(m[4]),
      tags: strings(m[5]),
      glass: m[6],
      method: m[7],
      note: note?.[1] ?? null,
      accentHex: m[8],
      isUserCreated: false,
    });
  }
  for (const m of world.matchAll(
    /CocktailRecipe\(([\s\S]*?)isUserCreated: false\s*\)/g,
  )) {
    const field = (key) => m[1].match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1];
    const list = (key) =>
      strings(m[1].match(new RegExp(`${key}:\\s*\\[([\\s\\S]*?)\\]`))[1]);
    recipes.push({
      id: field("id"),
      englishName: field("englishName"),
      chineseName: field("chineseName"),
      ingredients: list("ingredients"),
      tags: list("tags"),
      glass: field("glass"),
      method: field("method"),
      note: field("note") ?? null,
      accentHex: field("accentHex"),
      isUserCreated: false,
    });
  }
  if (recipes.length !== 120 || new Set(recipes.map((r) => r.id)).size !== 120)
    throw new Error(
      "Expected 120 unique Swift recipes. Update the exporter when changing the library.",
    );
  return recipes;
}
