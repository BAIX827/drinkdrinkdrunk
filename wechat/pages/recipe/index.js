const S = require('../../shared/store'), U = require('../../shared/ui');
U.page(Page, {
  data: { recipe: null, rating: '', feedback: [], compareOptions: [], compare: null },
  onLoad(options) { this.id = options.id; },
  onShow() { U.theme(this); this.refresh(); },
  refresh() {
    const r = S.recipe(this.id);
    if (!r) { this.setData({ recipe: null }); return; }
    const s = S.get(), p = S.taste.profile(r), dna = S.taste.dna(s.taste), rating = s.taste.ratings.find(v => v.recipeID === r.id);
    this.allRecipes = S.recipes().filter(other => other.id !== r.id);
    this.setData({ recipe: r, image: S.photo(r), favorite: s.favorites.includes(r.id),
      ingredients: r.parts.map(part => ({ raw: part.raw, optional: part.optional, available: part.optional || part.types.some(type => s.inventory.some(item => S.core.satisfies(item.type, type))) })),
      profile: p, score: dna.ready && !p.unknown.length ? S.taste.score(p.vector, dna.vector) : null,
      explanation: S.taste.explain(p, dna), bars: S.taste.dimensions.map((name, i) => ({ name, value: p.vector[i] })),
      dna, personalBars:S.taste.dimensions.map((name,i)=>({name,first:p.vector[i],second:dna.vector[i]})),
      rating: rating ? rating.value : '', feedback: rating ? rating.feedback : [],
      ratings: [{ key: 'like', name: '喜欢' }, { key: 'okay', name: '还行' }, { key: 'dislike', name: '不喜欢' }],
      compareOptions: this.allRecipes.map(other => require('../../shared/engine').i18n.name(other)) });
    this.feedbackOptions();
    wx.setNavigationBarTitle({ title: require('../../shared/engine').i18n.name(r) });
  },
  feedbackOptions() { this.setData({ feedbackOptions: Object.entries(S.taste.feedback).map(([key, [name]]) => ({ key, name, selected: this.data.feedback.includes(key) })) }); },
  favorite() { U.action(() => { S.update(s => { s.favorites = s.favorites.includes(this.id) ? s.favorites.filter(id => id !== this.id) : [...s.favorites, this.id]; }); this.refresh(); }); },
  rate(e) { this.persistRating(e.currentTarget.dataset.key, this.data.feedback); },
  persistRating(value, feedback) {
    U.action(() => {
      const r = this.data.recipe, p = this.data.profile;
      if (p.unknown.length) throw new Error('这款配方含有尚无风味数据的材料，暂时无法纳入口味学习。');
      S.update(s => { s.taste.ratings = s.taste.ratings.filter(v => v.recipeID !== r.id); s.taste.ratings.push({ recipeID: r.id, name: r.chineseName, value, vector: p.vector, base: p.base, family: p.family, feedback, updatedAt: new Date().toISOString() }); }); this.refresh(); U.toast('评价已保存');
    });
  },
  feedback(e) {
    if (!this.data.rating) return U.toast('先选择喜欢、还行或不喜欢');
    const key = e.currentTarget.dataset.key;
    let feedback = this.data.feedback.includes(key) ? this.data.feedback.filter(k => k !== key) : [...this.data.feedback, key];
    if (key === 'strong') feedback = feedback.filter(k => k !== 'weak');
    if (key === 'weak') feedback = feedback.filter(k => k !== 'strong');
    this.persistRating(this.data.rating, feedback);
  },
  removeRating() { U.action(() => { S.update(s => { s.taste.ratings = s.taste.ratings.filter(r => r.recipeID !== this.id); }); this.refresh(); }); },
  compare(e) { const r = this.allRecipes[Number(e.detail.value)], p = S.taste.profile(r); this.setData({ compare: { name: r.chineseName, unknown: p.unknown.length > 0, bars: S.taste.dimensions.map((name, i) => ({ name, first: this.data.profile.vector[i], second: p.vector[i] })) } }); },
  guide() { wx.navigateTo({ url: `/pages/guide/index?id=${encodeURIComponent(this.id)}` }); },
  log() { wx.navigateTo({ url: `/pages/editor/index?type=log&recipe=${encodeURIComponent(this.id)}` }); },
  edit() { wx.navigateTo({ url: `/pages/editor/index?type=recipe&id=${encodeURIComponent(this.id)}` }); },
  shareCard() { wx.navigateTo({ url: `/pages/share/index?id=${encodeURIComponent(this.id)}` }); },
  source() { if (this.data.recipe.source) wx.setClipboardData({ data: this.data.recipe.source.url }); },
  onShareAppMessage() {
    const r = this.data.recipe;
    return r && !r.isUserCreated ? { title: `${r.chineseName} · 一起调一杯`, path: `/pages/recipe/index?id=${encodeURIComponent(r.id)}`, imageUrl: S.photo(r) } : { title: '大喝特喝 · 发现你的下一杯', path: '/pages/discover/index' };
  }
});
