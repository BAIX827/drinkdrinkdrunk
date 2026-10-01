const S = require('../../shared/store'), U = require('../../shared/ui');
U.page(Page, {
  data: { month: S.today().slice(0, 7), selected: S.today(), weekdays: ['一', '二', '三', '四', '五', '六', '日'] },
  onShow() { U.theme(this); this.setData({weekdays:require('../../shared/engine').i18n.weekdays}); if (getApp().journalDate) { const date = getApp().journalDate; this.setData({ selected: date, month: date.slice(0, 7) }); getApp().journalDate = ''; } this.refresh(); },
  refresh() {
    const state = S.get(), calendar = S.core.journalMonth(this.data.month, state.logs);
    const cells = calendar.cells.map((cell, i) => cell ? { key: cell.date, date: cell.date, day: cell.day, count: cell.entries.length, selected: cell.date === this.data.selected, today: cell.date === S.today() } : { key: `blank-${i}` });
    const logs = state.logs.filter(l => l.date === this.data.selected).map(l => { const recipe = S.recipe(l.recipeID), {photos,...plain}=l; return { ...plain, userNamed: !recipe || ![recipe.chineseName,recipe.englishName].includes(l.name), recipe: recipe || {}, look: { glass:l.glass,color:l.color,visual:l.visual }, image: S.photo(recipe), photoCount: (photos || []).length }; });
    this.setData({ cells, logs, count: calendar.count, previous: calendar.previous, next: calendar.next });
  },
  month(e) { const value = e.currentTarget.dataset.direction === 'previous' ? this.data.previous : this.data.next; if (value) { this.setData({ month: value, selected: `${value}-01` }); this.refresh(); } },
  day(e) { const date = e.currentTarget.dataset.date; if (date) { this.setData({ selected: date }); this.refresh(); } },
  today() { this.setData({ month: S.today().slice(0, 7), selected: S.today() }); this.refresh(); },
  add() { wx.navigateTo({ url: `/pages/editor/index?type=log&date=${this.data.selected}` }); },
  rate(e) { wx.navigateTo({ url: '/pages/recipe/index?id=' + encodeURIComponent(e.currentTarget.dataset.recipe) }); },
  edit(e) { wx.navigateTo({ url: `/pages/editor/index?type=log&id=${encodeURIComponent(e.currentTarget.dataset.id)}` }); }
});
