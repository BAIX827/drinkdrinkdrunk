import { writeFileSync } from 'node:fs';
import { researchedRecipes } from '../data/researched-recipes.mjs';

const quote = (value) => JSON.stringify(value).replace(/\\u2028/g, '\\u2028');
export function syncCuratedSwift() {
  const entries = researchedRecipes.map((r) => `        CocktailRecipe(
            id: ${quote(r.id)},
            englishName: ${quote(r.englishName)},
            chineseName: ${quote(r.chineseName)},
            ingredients: [${r.ingredients.map(quote).join(', ')}],
            tags: [${r.tags.map(quote).join(', ')}],
            glass: ${quote(r.glass)},
            method: ${quote(r.method)},
            note: ${r.note ? quote(r.note) : 'nil'},
            accentHex: ${quote(r.appearance.color)},
            isUserCreated: false
        )`).join(',\n');
  writeFileSync(new URL('../Cocktail60/CuratedCocktailData.swift', import.meta.url),
    `// Generated from data/researched-recipes.mjs by npm run build.\nimport Foundation\n\nenum CuratedCocktailData {\n    static let recipes: [CocktailRecipe] = [\n${entries}\n    ]\n}\n`);
}
