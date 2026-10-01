const S = require('../../shared/store'), U = require('../../shared/ui');
U.page(Page, {
  data: { query: '', category: 'all' },
  onShow() { U.theme(this); this.refresh(); },
  refresh() {
    const inventory = S.get().inventory, q = this.data.query.toLowerCase();
    const dictionary=require('../../shared/engine').i18n.messages;
    const items = S.data.catalog.filter(c => (this.data.category === 'all' || c.category === this.data.category) && (c.name+' '+(dictionary[c.name]||'')).toLowerCase().includes(q)).map(c => ({ ...c, owned: inventory.some(i => i.type === c.name) }));
    const ready = S.recipes().filter(r => S.core.match(r, inventory).count === 0).length;
    this.setData({ items, bottles: inventory, count: inventory.length, ready, categories: Object.entries(S.core.categories).map(([key, name]) => ({ key, name })), unknown: inventory.filter(i => !S.data.catalog.some(c => c.name === i.type)) });
  },
  search(e) { this.setData({ query: e.detail.value }); this.refresh(); },
  category(e) { this.setData({ category: e.currentTarget.dataset.value }); this.refresh(); },
  toggle(e) { U.action(() => {
    const type = e.currentTarget.dataset.type;
    S.update(s => { if (s.inventory.some(i => i.type === type)) s.inventory = s.inventory.filter(i => i.type !== type); else s.inventory.push({ id: S.id('stock'), name: type, type, shape: 'bottle', color: '#79a883', drawing: [] }); }); this.refresh();
  }); },
  removeUnknown(e) { U.action(() => { S.update(s => { s.inventory = s.inventory.filter(i => i.id !== e.currentTarget.dataset.id); }); this.refresh(); }); },
  edit(e) { wx.navigateTo({ url: '/pages/bottle/index' + (e.currentTarget.dataset.id ? '?id=' + encodeURIComponent(e.currentTarget.dataset.id) : '') }); },
  discover() { getApp().discoverReady = true; wx.switchTab({ url: '/pages/discover/index' }); }
});
