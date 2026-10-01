const V = require('../../shared/vector'), E = require('../../shared/engine');
Component({
  properties: { mode: { type: String, value: 'drink' }, recipe: Object, look: Object, item: Object, scene: Object, playing: Boolean, reduced: Boolean },
  observers: { 'mode,recipe,look,item,scene,playing,reduced': function() { this.redraw(); } },
  lifetimes: { ready() { this.createSelectorQuery().select('#art').fields({ node: true, size: true }).exec(res => { if (!res[0] || !res[0].node) return; this.canvas = res[0].node; this.w = res[0].width; this.h = res[0].height; const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2; this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr; this.ctx = this.canvas.getContext('2d'); this.ctx.scale(dpr, dpr); this.lastTime = Date.now(); this.redraw(); }); }, detached() { this.stop(); } },
  pageLifetimes: { hide() { this.hidden = true; this.stop(); }, show() { this.hidden = false; this.lastTime = Date.now(); this.redraw(); } },
  methods: {
    stop() { if (this.frame && this.canvas) this.canvas.cancelAnimationFrame(this.frame); this.frame = null; },
    redraw() {
      if (!this.ctx || this.hidden) return;
      this.stop(); const now = Date.now(), p = this.properties;
      const key = p.scene && p.scene.key;
      if (key !== this.sceneKey) { this.elapsed = 0; this.sceneKey = key; }
      if (p.playing && this.wasPlaying && !p.reduced) this.elapsed = (this.elapsed || 0) + Math.min(100, now - (this.lastTime || now)) / 1000;
      this.wasPlaying=p.playing;
      this.lastTime = now; const ctx = this.ctx; ctx.clearRect(0, 0, this.w, this.h);
      const scale = Math.min(this.w / 320, this.h / 300); ctx.save(); ctx.translate((this.w - 320 * scale) / 2, (this.h - 300 * scale) / 2); ctx.scale(scale, scale);
      if (p.mode === 'bottle') V.paint(ctx, E.art.bottle(p.item || {}), 70, 8, 180, 278);
      else if (p.mode === 'stage' && p.scene) this.stage(ctx, p.scene, p.reduced ? 5 : this.elapsed || 0);
      else { const look = E.core.drinkAppearance(p.recipe || {}, p.look || {}); V.paint(ctx, E.art.glass(look.glass, look.color, look.visual || {}), 48, 0, 224, 266); }
      ctx.restore();
      if (p.playing && !p.reduced) this.frame = this.canvas.requestAnimationFrame(() => this.redraw());
    },
    stage(ctx, s, t) {
      const action = s.action, moving = this.properties.playing && !this.properties.reduced;
      const transfer = ['pour','top','float','strain','serve','rinse'].includes(action);
      const shake = moving && action === 'shake' ? Math.sin(t * 16) * 5 : 0;
      ctx.save(); ctx.translate(shake, moving && action === 'muddle' ? Math.sin(t * 9) * 3 : 0);
      const options = { ...s.visual, ...s.content, animateIce: action === 'ice' };
      const target = s.target === 'glass' ? E.art.glass(s.glass, s.color, options) : E.art.vessel(s.target, { ...options, color: s.color });
      V.paint(ctx, target, 135, 86, 140, 166, { iceTime: action === 'ice' ? t : undefined }); ctx.restore();
      if (!s.complete) {
        if (transfer) {
          ctx.save(); ctx.translate(92, 76); ctx.rotate(-.75);
          V.paint(ctx, ['strain','serve'].includes(action) ? E.art.vessel(s.source || 'shaker', { color: s.color, level: .65 }) : E.art.bottle(s.bottle || {}), -42, -58, 80, 124); ctx.restore();
          if (moving || this.properties.reduced) { ctx.save(); ctx.strokeStyle = s.color; ctx.globalAlpha = .65; ctx.lineWidth = action === 'float' ? 3 : 6; ctx.beginPath(); ctx.moveTo(124, 66); ctx.quadraticCurveTo(174, 62, 202, 87 + E.art.rim(s.target === 'glass' ? s.glass : s.target) * 166 / 190); ctx.stroke(); ctx.restore(); }
        } else if (['stir','muddle','blend'].includes(action)) {
          const wobble = moving ? Math.sin(t * 7) * 9 : 0; ctx.strokeStyle = '#92704b'; ctx.lineWidth = action === 'muddle' ? 12 : 4; ctx.beginPath(); ctx.moveTo(209 + wobble, 62); ctx.lineTo(199 - wobble, 203); ctx.stroke();
          if (action === 'blend') { ctx.strokeStyle = '#e4e7ce'; ctx.beginPath(); ctx.ellipse(204, 196, 21, 6, t, 0, Math.PI * 1.6); ctx.stroke(); }
        } else if (action === 'garnish') V.paint(ctx, E.art.glass(s.glass, s.color, { ...options, garnish: s.visual.garnish }), 135, 86, 140, 166);
        if (!transfer) V.paint(ctx, E.art.bottle(s.bottle || {}), 18, 77, 92, 143);
        if (s.target !== 'glass') V.paint(ctx, E.art.glass(s.glass, s.color, { level: 0, garnish: false }), 18, 168, 75, 89);
      }
      ctx.strokeStyle = '#aa936b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(14, 256); ctx.lineTo(302, 256); ctx.stroke();
    }
  }
});
