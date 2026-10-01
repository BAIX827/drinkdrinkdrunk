const S = require('../../shared/store'), U = require('../../shared/ui');
U.page(Page, {
  data: { query: '', scope: 'all', stock: 'all', base: '全部基酒', sort: 'original', cards: [], bases: [], total: 0, checked: Object.keys(S.core.categories) },
  onShow() {
    U.theme(this); this.refresh();
    const app = getApp();
    if (app.storageError) { U.error(new Error(app.storageError)); app.storageError = ''; }
    if(!S.get().guideVersion && !app.introOffered){app.introOffered=true;wx.navigateTo({url:'/pages/intro/index'});}
    if(!app.openingShown){app.openingShown=true;this.setData({opening:!S.get().reducedMotion});this.openingTimer=setTimeout(()=>this.setData({opening:false}),1200);}
  },
  refresh() {
    const snapshot = S.get(), dna = S.taste.dna(snapshot.taste), all = S.recipes();
    const q = this.data.query.trim().toLowerCase();
    const canonicalQuery=S.core.canonical(q).toLowerCase();
    let rows = all.filter(r => (!q || [r.chineseName, r.englishName, ...r.ingredients, ...r.tags].join(' ').toLowerCase().includes(q) || r.ingredients.join(' ').toLowerCase().includes(canonicalQuery)) &&
      (this.data.scope !== 'favorites' || snapshot.favorites.includes(r.id)) && (this.data.scope !== 'mine' || r.isUserCreated) && (this.data.scope !== 'curated' || r.tags.includes('IBA 精选')))
      .map(r => {const card=S.card(r,snapshot,dna);return {...card,missing:S.core.match(r,snapshot.inventory,this.data.checked).count,checked:this.data.checked.length>0,recipe:r.isUserCreated?r:null};}).filter(c => (this.data.stock === 'all' || c.checked && c.missing <= Number(this.data.stock)) && (this.data.base === '全部基酒' || c.base === this.data.base));
    if (this.data.sort === 'match') rows.sort((a, b) => (b.score === null ? -1 : b.score) - (a.score === null ? -1 : a.score));
    this.setData({ cards: rows, total: all.length, ready: dna.ready, inventoryCount: snapshot.inventory.length, bases: ['全部基酒', ...new Set(all.map(r => S.taste.profile(r).base))] });
    this.setData({ categories:Object.entries(S.core.categories).map(([key,name])=>({key,name,selected:this.data.checked.includes(key)})) });
  },
  search(e) { this.setData({ query: e.detail.value }); clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.refresh(), 150); },
  onUnload() { clearTimeout(this.searchTimer); clearTimeout(this.openingTimer); },
  scope(e) { this.setData({ scope: e.currentTarget.dataset.value }); this.refresh(); },
  stock(e) { this.setData({ stock: e.currentTarget.dataset.value }); this.refresh(); },
  category(e){const key=e.currentTarget.dataset.key;this.setData({checked:this.data.checked.includes(key)?this.data.checked.filter(k=>k!==key):[...this.data.checked,key]});this.refresh();},
  base(e) { this.setData({ base: this.data.bases[Number(e.detail.value)] }); this.refresh(); },
  sort() { this.setData({ sort: this.data.sort === 'original' ? 'match' : 'original' }); this.refresh(); },
  open: U.openRecipe,
  taste() { wx.switchTab({ url: '/pages/taste/index' }); },
  settings() { wx.navigateTo({ url: '/pages/settings/index' }); },
  create() { wx.navigateTo({ url: '/pages/editor/index?type=recipe' }); },
  onShareAppMessage() { return { title: '大喝特喝 · 发现你的下一杯', path: '/pages/discover/index' }; }
});
