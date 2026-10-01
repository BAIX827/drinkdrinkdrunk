const S = require('../../shared/store'), U = require('../../shared/ui'), E = require('../../shared/engine'), V = require('../../shared/vector');
U.page(Page, {
  data: { selected: 'theme', templates: E.share.templates.map(t => ({ id: t.id, name: t.name })), preview: '', busy: false },
  onLoad(options) { this.recipe = S.recipe(options.id); },
  onShow() { U.theme(this); },
  onReady() { wx.createSelectorQuery().in(this).select('#share-canvas').fields({ node: true }).exec(res => { if (res[0]) { this.canvas = res[0].node; this.render(); } }); },
  template(e) { this.setData({ selected: e.currentTarget.dataset.id }); this.render(); },
  async render() {
    if (!this.canvas || !this.recipe) return; const ticket = this.ticket = (this.ticket || 0) + 1; this.setData({ busy: true, preview: '' });
    try { const c = this.canvas, ctx = c.getContext('2d'), data = E.share.dataFor(this.recipe), template = E.share.resolveTemplate(this.data.selected, S.get().theme);
      const plan = E.share.layout(data, (s,size,kind) => { ctx.font = E.share.font(size,kind); return ctx.measureText(s).width; }); c.width = plan.width; c.height = plan.height;
      const art = template.dark ? data.art.replace(/stroke="#31535a"/g,'stroke="#b7cbbb"') : data.art;
      E.share.draw(ctx, data, template, plan, (context,x,y,w,h) => V.paint(context, art, x,y,w,h));
      const file = await new Promise((resolve,reject) => wx.canvasToTempFilePath({ canvas:c, width:plan.width, height:plan.height, destWidth:plan.width, destHeight:plan.height, fileType:'png', success:resolve, fail:reject }, this));
      if (ticket === this.ticket) this.setData({ preview: file.tempFilePath });
    } catch (err) { if (ticket === this.ticket) U.error(err.message ? err : new Error('图片生成失败，请重试。')); }
    finally { if (ticket === this.ticket) this.setData({ busy: false }); }
  },
  preview() { if (this.data.preview) wx.previewImage({ urls: [this.data.preview] }); },
  save() { if (!this.data.preview || this.data.busy) return; wx.saveImageToPhotosAlbum({ filePath:this.data.preview, success:() => U.toast('图片已保存'), fail:e => { if (/cancel/.test(e.errMsg || '')) return; U.modal({ title:U.t('图片保存失败'), content:U.t('请在微信设置中允许保存到相册，然后重试。'), confirmText:U.t('打开设置'), success:r => { if (r.confirm) wx.openSetting({}); } }); } }); },
  share() { if (!this.data.preview || this.data.busy) return; if (wx.showShareImageMenu) wx.showShareImageMenu({ path:this.data.preview, fail:e => { if (!/cancel/.test(e.errMsg || '')) U.error(new Error('当前环境不能直接分享图片，请先保存到相册。')); } }); else this.preview(); },
  onUnload() { this.ticket = (this.ticket || 0) + 1; }
});
