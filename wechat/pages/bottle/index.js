const S = require('../../shared/store'), U = require('../../shared/ui');
U.page(Page, {
  data: { name: '', typeIndex: 0, shapeIndex: 0, color: '#79a883', drawing: [], types: ['待选择类型', ...S.data.catalog.map(c => c.name)], shapes: Object.values(S.core.bottleShapes), editing: false, colors: ['#79a883','#cba468','#976c51','#af7b91','#7594b3','#cf795e','#e6dfb8','#384b42'] },
  onLoad(options) { this.id = options.id || ''; const entry = S.get().inventory.find(i => i.id === this.id); if (entry) this.setData({ name: entry.name, typeIndex: Math.max(0, this.data.types.indexOf(entry.type)), shapeIndex: Object.keys(S.core.bottleShapes).indexOf(entry.shape), color: entry.color, drawing: entry.drawing, editing: true }); this.preview(); },
  onShow() { U.theme(this); },
  onReady() { wx.createSelectorQuery().in(this).select('#drawing').fields({ node: true, size: true, rect: true }).exec(res => { if (!res[0]) return; this.canvas = res[0].node; this.rect = res[0]; this.canvas.width = 400; this.canvas.height = 400; this.ctx = this.canvas.getContext('2d'); this.redraw(); }); },
  preview() { this.setData({ bottle: { name: this.data.name, shape: Object.keys(S.core.bottleShapes)[this.data.shapeIndex], color: this.data.color, drawing: this.data.drawing } }); },
  name(e) { this.setData({ name: e.detail.value }); },
  type(e) { const index = Number(e.detail.value); this.setData({ typeIndex: index, name: this.data.name || (index ? this.data.types[index] : '') }); },
  shape(e) { this.setData({ shapeIndex: Number(e.detail.value) }); this.preview(); },
  color(e) { const color = e.currentTarget.dataset.color || e.detail.value; if (/^#[0-9a-f]{6}$/i.test(color)) { this.setData({ color }); this.preview(); } },
  point(event) { const t = event.touches[0]; return [Math.max(0,Math.min(200,Number(t.x === undefined ? t.clientX - this.rect.left : t.x) / this.rect.width * 200)), Math.max(0,Math.min(200,Number(t.y === undefined ? t.clientY - this.rect.top : t.y) / this.rect.height * 200))]; },
  start(e) { if (!this.ctx || this.data.drawing.length >= 200) return; this.stroke = [this.point(e)]; this.redraw(); },
  move(e) { if (!this.stroke || this.stroke.length >= 2000) return; this.stroke.push(this.point(e)); this.redraw(); },
  end() { if (!this.stroke) return; if (this.stroke.length === 1) this.stroke.push([Math.min(200,this.stroke[0][0] + .1), this.stroke[0][1]]); this.setData({ drawing: this.data.drawing.concat([this.stroke]) }); this.stroke = null; this.preview(); this.redraw(); },
  undo() { this.setData({ drawing: this.data.drawing.slice(0,-1) }); this.preview(); this.redraw(); },
  clear() { this.setData({ drawing: [] }); this.preview(); this.redraw(); },
  redraw() { if (!this.ctx) return; const c = this.ctx; c.fillStyle = '#fff8e8'; c.fillRect(0,0,400,400); c.strokeStyle = '#29494d'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'; for (const stroke of this.data.drawing.concat(this.stroke ? [this.stroke] : [])) { c.beginPath(); stroke.forEach(([x,y],i) => c[i ? 'lineTo' : 'moveTo'](x*2,y*2)); c.stroke(); } },
  save() { U.action(() => { if (!this.data.name.trim()) throw new Error('请填写名称。'); const item = { id: this.id || S.id('stock'), name: this.data.name.trim(), type: this.data.typeIndex ? this.data.types[this.data.typeIndex] : '', shape: Object.keys(S.core.bottleShapes)[this.data.shapeIndex], color: this.data.color, drawing: this.data.drawing }; S.update(s => { s.inventory = s.inventory.filter(i => i.id !== item.id).concat([item]); }); wx.navigateBack(); }); },
  remove() { U.modal({ title: U.t('删除这瓶材料？'), content: U.t('只删除库存记录，不改变配方或日记。'), success: res => { if (res.confirm) U.action(() => { S.update(s => { s.inventory = s.inventory.filter(i => i.id !== this.id); }); wx.navigateBack(); }); } }); }
});
