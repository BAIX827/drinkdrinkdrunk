import test from 'node:test';
import assert from 'node:assert/strict';
import '../Cocktail60/BarWeb/core.js';
import '../Cocktail60/BarWeb/taste-data.js';
import '../Cocktail60/BarWeb/taste.js';
import '../Cocktail60/BarWeb/data.js';
const T=BarTaste;
const answers={drink:'lemonade',style:'fresh',flavors:['lemon','mint']};
const record=(i,changes={})=>({recipeID:`test-${i}`,name:`测试 ${i}`,value:'like',vector:[70,80,10,30,85,40,0,20],base:'金酒',family:'酸甜系 Sour',feedback:[],updatedAt:new Date(Date.UTC(2026,0,i+1)).toISOString(),...changes});

test('all built-in recipes and catalogue ingredients have bounded deterministic estimates',()=>{
  for(const item of BarData.catalog) assert.ok(BarTasteData[BarCore.canonical(item.name)],item.name);
  for(const recipe of BarData.recipes) {
    const p=T.profile(recipe);
    assert.deepEqual(p,T.profile(recipe));assert.deepEqual(p.unknown,[],recipe.id);
    assert.equal(p.vector.length,8);assert.ok(p.vector.every(v=>Number.isFinite(v)&&v>=0&&v<=100));
    assert.ok(p.base&&p.family);
  }
  const find=id=>T.profile(BarData.recipes.find(r=>r.id===id));
  assert.ok(find('world-012-dry-martini').vector[3]>find('world-004-mojito').vector[3]);
  assert.ok(find('world-015-negroni').vector[2]>find('world-005-daiquiri').vector[2]);
  assert.ok(find('world-007-pina-colada').vector[7]>find('world-011-gin-and-tonic').vector[7]);
  assert.ok(find('world-005-daiquiri').vector[1]>find('world-005-daiquiri').vector[7]);
  assert.ok(find('world-004-mojito').vector[5]>=45);
});

test('unknown custom ingredients stay explicit and are excluded from matching',()=>{
  const r={id:'user-x',ingredients:['神秘材料 20 ml'],method:'搅拌'};
  assert.deepEqual(T.profile(r).unknown,['神秘材料']);
  assert.ok(T.recommend([r],{onboarding:answers,ratings:[]}).every(g=>g.items.length===0));
  assert.deepEqual(T.profile({...r,ingredients:['constructor 20 ml']}).unknown,['constructor']);
});

test('cold start has no claimed personal match and quiz has reproducible influence',()=>{
  assert.equal(T.dna().ready,false);assert.deepEqual(T.recommend(BarData.recipes,T.empty()),[]);
  const a=T.dna({onboarding:answers,ratings:[]});
  assert.equal(a.ready,true);assert.equal(a.count,0);assert.equal(a.stage,'DNA 起步');
  assert.equal(a.base,'等待喜欢的记录');
  assert.ok(T.initial({...answers,flavors:['lemon']})[1]>T.initial({...answers,flavors:[]})[1]);
});

test('a single rating cannot swing DNA, while accumulated actual preferences outweigh quiz',()=>{
  const empty={onboarding:answers,ratings:[]},before=T.dna(empty);
  const once=T.dna({...empty,ratings:[record(0)]});
  assert.ok(once.vector.every((v,i)=>Math.abs(v-before.vector[i])<=17));
  const many=T.dna({...empty,ratings:Array.from({length:24},(_,i)=>record(i))});
  assert.ok(T.distance(many.vector,record(0).vector)<T.distance(once.vector,record(0).vector));
  assert.equal(many.base,'金酒');assert.equal(many.family,'酸甜系 Sour');
  assert.equal(many.stage,'DNA 逐渐清晰');assert.equal(many.explored,1);
});

test('newer ratings have greater weight and rebuilding from reordered storage is deterministic',()=>{
  const a=record(0,{vector:[0,0,0,0,0,0,0,0]}),b=record(1,{vector:[100,100,100,100,100,100,100,100]});
  const newerHigh=T.dna({onboarding:null,ratings:[a,b]});
  const newerLow=T.dna({onboarding:null,ratings:[{...a,updatedAt:b.updatedAt},{...b,updatedAt:a.updatedAt}]});
  assert.ok(newerHigh.vector.every((v,i)=>v>=newerLow.vector[i]));
  assert.ok(newerHigh.vector.some((v,i)=>v>newerLow.vector[i]));
  assert.deepEqual(newerHigh,T.dna({onboarding:null,ratings:[b,a]}));
});

test('specific feedback moves the intended preference in the correct direction',()=>{
  const base=record(0,{vector:[50,50,50,50,50,50,50,50]});
  const plain=T.dna({onboarding:null,ratings:[base]}).vector;
  for(const [key,[,i,delta]] of Object.entries(T.feedback)) {
    const changed=T.dna({onboarding:null,ratings:[{...base,feedback:[key]}]}).vector;
    assert.ok(delta<0?changed[i]<plain[i]:changed[i]>plain[i]);
  }
  const dark=record(0,{value:'dislike',vector:[80,80,80,80,80,80,80,80]});
  assert.ok(T.dna({onboarding:null,ratings:[dark]}).vector[0]<T.dna().vector[0]);
});

test('distance scores are symmetric, bounded, and ranking excludes disliked drinks',()=>{
  const a=[0,0,0,0,0,0,0,0],b=[100,100,100,100,100,100,100,100];
  assert.equal(T.score(a,a),100);assert.equal(T.score(a,b),0);assert.equal(T.score(a,b),T.score(b,a));
  const recipe=BarData.recipes[0],profile=T.profile(recipe);
  const taste={onboarding:answers,ratings:[record(0,{recipeID:recipe.id,value:'dislike',vector:profile.vector})]};
  const groups=T.recommend(BarData.recipes,taste);
  assert.ok(groups.every(g=>g.items.every(x=>x.recipe.id!==recipe.id)));
  assert.ok(groups[3].items.every(x=>x.score>=45&&x.score<65));
  assert.deepEqual(groups,T.recommend(BarData.recipes,taste));
});

test('legacy backups migrate and taste backups round-trip without losing diary or inventory',()=>{
  const old=BarCore.blankState();delete old.taste;
  assert.deepEqual(BarCore.validateState(old).taste,T.empty());
  const state={...old,taste:{onboarding:answers,ratings:[record(0)]}};
  assert.deepEqual(BarCore.validateState(JSON.parse(JSON.stringify(state))),state);
  assert.deepEqual(T.dna({...state.taste,ratings:[]}),T.dna({onboarding:answers,ratings:[]}));
});

test('malformed snapshots, duplicate ratings and contradictory feedback are rejected',()=>{
  const state=BarCore.blankState(),r=record(0);
  const invalid=[{...r,vector:[1,2]}, {...r,vector:[NaN,1,2,3,4,5,6,7]}, {...r,vector:[101,1,2,3,4,5,6,7]},
    {...r,feedback:['strong','weak']},{...r,feedback:['invented']},{...r,value:'five-stars'},{...r,updatedAt:'yesterday'}];
  for(const bad of invalid)assert.throws(()=>BarCore.validateState({...state,taste:{onboarding:null,ratings:[bad]}}));
  assert.throws(()=>T.validate({onboarding:null,ratings:[r,r]}));
  assert.throws(()=>T.validate({onboarding:{...answers,drink:'unknown'},ratings:[]}));
});
