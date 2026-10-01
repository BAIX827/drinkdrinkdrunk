const T = require('../../shared/tour'), S = require('../../shared/store'), E = require('../../shared/engine');
const PAD = 6;
Component({
  properties: { page: String },
  data: { visible: false, spot: null },
  lifetimes: {
    attached() { this.unsubscribe = T.subscribe(() => this.sync()); this.sync(); },
    detached() { if (this.unsubscribe) this.unsubscribe(); clearTimeout(this.timer); }
  },
  pageLifetimes: { show() { this.shown = true; this.sync(); }, hide() { this.shown = false; clearTimeout(this.timer); }, resize() { this.sync(); } },
  methods: {
    noop() {},
    sync() {
      clearTimeout(this.timer);
      const step = T.current();
      if (!step || step.page !== this.properties.page || this.shown === false) { if (this.data.visible) this.setData({ visible: false, spot: null }); return; }
      const state = S.get(); E.i18n.setLocale(state.locale); const t = E.i18n.t;
      this.setData({ visible: true, busy: false, theme: state.theme, title: t(step.title), text: t(step.text), index: step.index, last: step.index === step.total - 1,
        count: `${step.index + 1} / ${step.total}`, progress: Math.round((step.index + 1) / step.total * 100),
        labels: { skip: t('跳过引导'), previous: t('上一步'), next: t('下一步'), done: t('开始体验') } });
      if (!step.target) return this.setData({ spot: null, cardStyle: '', placed: true });
      this.setData({ placed: false });
      // 等页面渲染完成后把目标滚到可视区域，再测量它的位置。
      this.timer = setTimeout(() => this.locate(step, 0), 320);
    },
    locate(step, attempt) {
      const targets = [].concat(step.target), query = wx.createSelectorQuery();
      targets.forEach(selector => query.select(selector).boundingClientRect());
      // 用浮层自身的尺寸作为可视区域：从 tab 页跳到普通页时 getWindowInfo 可能还是旧高度。
      this.createSelectorQuery().select('.tour').boundingClientRect().select('.tour-card').boundingClientRect().exec(([box, card]) => query.exec(rects => {
        const current = T.current(); if (!current || current.index !== step.index) return;
        const found = (rects || []).findIndex(rect => rect && rect.height);
        if (found < 0) { if (attempt < 3) this.timer = setTimeout(() => this.locate(step, attempt + 1), 300); else this.setData({ spot: null, cardStyle: '', placed: true }); return; }
        const rect = rects[found], info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const height = box && box.height || info.windowHeight, width = box && box.width || info.windowWidth, ch = card && card.height || 240, gap = 14;
        const fitsBelow = rect.bottom + PAD + gap + ch <= height - 8, fitsAbove = rect.top - PAD - gap - ch >= 8;
        const visible = rect.top >= PAD && rect.bottom <= height - PAD;
        if (!step.fixed && attempt < 4 && (!visible || !fitsBelow && !fitsAbove)) {
          // 把目标滚到上方，给下面的说明卡片留出位置；目标太高时贴近顶部。
          const room = rect.height + ch + gap + PAD * 2 + 24 <= height;
          const offset = room ? Math.max(PAD + 8, Math.min(height * .12, height - rect.height - ch - gap - PAD * 2 - 16)) : PAD + 8;
          wx.pageScrollTo({ selector: targets[found], offsetTop: -Math.round(offset), duration: 0, complete: () => { this.timer = setTimeout(() => this.locate(step, attempt + 1), 150); } });
          return;
        }
        const spot = { top: Math.max(4, rect.top - PAD), left: Math.max(4, rect.left - PAD), width: Math.min(width - 8, rect.width + PAD * 2), height: Math.min(height - 8, rect.height + PAD * 2) };
        const cardStyle = fitsBelow ? `top:${spot.top + spot.height + gap}px` : fitsAbove ? `bottom:${height - spot.top + gap}px` : 'bottom:12px';
        this.setData({ spot, cardStyle, placed: true });
        // 切回缓存的 tab 页时滚动可能稍后才生效：稍等再量一次，只修正位置，不再滚动。
        if (attempt < 10) this.timer = setTimeout(() => this.locate(step, 10), 450);
      }));
    },
    next() { this.setData({ busy: true }); try { T.next(); } catch (error) { this.setData({ busy: false }); wx.showModal({ title: E.i18n.t('暂时无法完成'), content: E.i18n.t(error.message || String(error)), showCancel: false }); } },
    previous() { T.previous(); },
    skip() { try { T.finish(); } catch (error) { wx.showModal({ title: E.i18n.t('暂时无法完成'), content: E.i18n.t(error.message || String(error)), showCancel: false }); } }
  }
});
