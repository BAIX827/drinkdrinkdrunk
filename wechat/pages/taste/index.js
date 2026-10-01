const S = require('../../shared/store'), U = require('../../shared/ui');
const flavors = require('../../shared/flavors');
U.page(Page, {
  data: { selected: [], strength: 'balanced', recommendations: [] },
  onShow() { U.theme(this); this.loadSaved(); },
  loadSaved() { const s=S.get();this.setData({selected:s.taste.onboarding?.palette||s.taste.onboarding?.flavors||[],strength:s.taste.onboarding?.strength||'balanced',editing:!S.taste.dna(s.taste).ready});this.refresh(); },
  edit() { this.setData({editing:true}); },
  cancel() { this.loadSaved();if(!this.data.dna.ready)wx.switchTab({url:'/pages/discover/index'}); },
  refresh() {
    const s = S.get(), dna = S.taste.dna(s.taste);
    const preview=this.data.selected.length?S.taste.dna({...s.taste,onboarding:{palette:this.data.selected,strength:this.data.strength}}):dna;
    const keys=this.data.selected, color='#'+[0,2,4].map(offset=>Math.round(keys.length?keys.reduce((sum,key)=>sum+parseInt(S.taste.palette[key][1].slice(offset+1,offset+3),16),0)/keys.length:200).toString(16).padStart(2,'0')).join('');
    this.setData({ previewBars:S.taste.dimensions.map((name,i)=>({name,value:preview.vector[i]})), previewLook:{glass:'coupe',color,visual:{garnish:keys.includes('mint')?'mint':keys.includes('lemon')?'lemon':'none',level:keys.length?.7:0}} });
    this.setData({ dna, preferredStrength:S.taste.strength(dna.vector), history:[...s.taste.ratings].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(r=>{const recipe=S.recipe(r.recipeID);return {...r,id:r.recipeID,name:recipe?require('../../shared/engine').i18n.name(recipe):r.name,userNamed:true,available:!!recipe,ratingName:{like:'喜欢',okay:'还行',dislike:'不喜欢'}[r.value],feedbackText:r.feedback.map(k=>S.taste.feedback[k][0]).join(' · ')};}), bars: S.taste.dimensions.map((name, i) => ({ name, value: dna.vector[i] })),
      palette: Object.entries(S.taste.palette).map(([key, [name, color]]) => ({ key, name, color, ...flavors[key], selected: this.data.selected.includes(key) })),
      savedFlavors:(s.taste.onboarding?.palette||s.taste.onboarding?.flavors||[]).filter(key=>flavors[key]).map(key=>({key,...flavors[key]})),
      strengths: Object.entries(S.taste.strengths).map(([key, [name]]) => ({ key, name })),
      recommendations: S.taste.recommend(S.recipes(), s.taste, dna).filter(g => g.items.length).map(g => ({ title: g.title, subtitle: g.subtitle, items: g.items.map(x => ({ ...S.card(x.recipe, s, dna), reason: S.taste.explain(x.profile, dna) })) })) });
  },
  toggle(e) { const key = e.currentTarget.dataset.key, selected = [...this.data.selected]; const i = selected.indexOf(key); if (i >= 0) selected.splice(i, 1); else selected.push(key); this.setData({ selected }); this.refresh(); },
  strength(e) { this.setData({ strength: e.currentTarget.dataset.key }); this.refresh(); },
  save() { U.action(() => { if (!this.data.selected.length) throw new Error('至少选择一种喜欢的风味。'); S.update(s => { s.taste.onboarding = { palette: this.data.selected, strength: this.data.strength }; }); this.setData({editing:false});this.refresh(); U.toast('口味偏好已保存'); }); },
  remove(e) { U.action(()=>{S.update(s=>{s.taste.ratings=s.taste.ratings.filter(r=>r.recipeID!==e.currentTarget.dataset.id);});this.refresh();if(!this.data.dna.ready)this.setData({editing:true});}); },
  clear() { U.modal({title:'清除口味档案？',content:'将移除风味调色盘与评价。库存、收藏和饮酒日记会保留。',confirmText:'清除口味数据',success:r=>{if(r.confirm)U.action(()=>{S.update(s=>{s.taste=S.taste.empty();});this.loadSaved();});}}); },
  open: U.openRecipe
});
