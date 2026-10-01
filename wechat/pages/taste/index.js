const S = require('../../shared/store'), U = require('../../shared/ui');
U.page(Page, {
  data: { selected: [], strength: 'balanced', recommendations: [] },
  onShow() { U.theme(this); const s = S.get(); this.setData({ selected: s.taste.onboarding && s.taste.onboarding.palette || [], strength: s.taste.onboarding && s.taste.onboarding.strength || 'balanced' }); this.refresh(); },
  refresh() {
    const s = S.get(), dna = S.taste.dna(s.taste);
    const preview=this.data.selected.length?S.taste.dna({...s.taste,onboarding:{palette:this.data.selected,strength:this.data.strength}}):dna;
    const keys=this.data.selected, color='#'+[0,2,4].map(offset=>Math.round(keys.length?keys.reduce((sum,key)=>sum+parseInt(S.taste.palette[key][1].slice(offset+1,offset+3),16),0)/keys.length:200).toString(16).padStart(2,'0')).join('');
    this.setData({ previewBars:S.taste.dimensions.map((name,i)=>({name,value:preview.vector[i]})), previewLook:{glass:'coupe',color,visual:{garnish:keys.includes('mint')?'mint':keys.includes('lemon')?'lemon':'none',level:keys.length?.7:0}} });
    this.setData({ dna, bars: S.taste.dimensions.map((name, i) => ({ name, value: dna.vector[i] })),
      palette: Object.entries(S.taste.palette).map(([key, [name, color]]) => ({ key, name, color, selected: this.data.selected.includes(key) })),
      strengths: Object.entries(S.taste.strengths).map(([key, [name]]) => ({ key, name })),
      recommendations: S.taste.recommend(S.recipes(), s.taste, dna).filter(g => g.items.length).map(g => ({ title: g.title, subtitle: g.subtitle, items: g.items.map(x => ({ ...S.card(x.recipe, s, dna), reason: S.taste.explain(x.profile, dna) })) })) });
  },
  toggle(e) { const key = e.currentTarget.dataset.key, selected = [...this.data.selected]; const i = selected.indexOf(key); if (i >= 0) selected.splice(i, 1); else selected.push(key); this.setData({ selected }); this.refresh(); },
  strength(e) { this.setData({ strength: e.currentTarget.dataset.key }); this.refresh(); },
  save() { U.action(() => { if (!this.data.selected.length) throw new Error('至少选择一种喜欢的风味。'); S.update(s => { s.taste.onboarding = { palette: this.data.selected, strength: this.data.strength }; }); this.refresh(); U.toast('口味偏好已保存'); }); },
  open: U.openRecipe
});
