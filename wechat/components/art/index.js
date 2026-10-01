const V = require('../../shared/vector'), E = require('../../shared/engine');
// 跟做舞台：逻辑坐标 320×300。目标容器画在右侧 (135,86,140,166)，SVG 视窗 160×190。
const TX = 135, TY = 86, SX = 140 / 160, SY = 166 / 190, FLOOR = 256;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, k) => a + (b - a) * k;
const TRANSFER = ['pour', 'top', 'float', 'strain', 'serve', 'rinse'];
// 每个动作一轮演示的时长（秒），循环播放。
const PERIOD = { pour: 3.6, top: 3.6, float: 4, rinse: 3.2, strain: 3.8, serve: 3.8, ice: 2.8, shake: 1, stir: 1.3, muddle: 1, blend: .6, garnish: 3, prepare: 2.4, method: 2.4 };
function rotated(dx, dy, a) { const c = Math.cos(a), s = Math.sin(a); return [dx * c - dy * s, dx * s + dy * c]; }
function surfaceOf(svg, fallback) { const m = svg.match(/<rect x="0" y="([\d.]+)" width="160"/); return m ? Number(m[1]) : fallback; }
function garnishOnly(svg) {
  const at = svg.lastIndexOf('data-reflection'); if (at < 0) return '';
  let rest = svg.slice(svg.indexOf('/>', at) + 2, svg.lastIndexOf('</svg>'));
  rest = rest.replace(/^<path d="M80 [^>]*\/>/, '').replace(/<path d="M115 66[^>]*\/>/, '');
  return rest.trim() ? `<svg viewBox="0 0 160 190">${rest}</svg>` : '';
}
Component({
  properties: { mode: { type: String, value: 'drink' }, recipe: Object, look: Object, item: Object, scene: Object, playing: Boolean, reduced: Boolean },
  observers: { 'mode,recipe,look,item,scene,playing,reduced': function() { this.redraw(); } },
  lifetimes: { ready() { this.createSelectorQuery().select('#art').fields({ node: true, size: true }).exec(res => { if (!res[0] || !res[0].node) return; this.canvas = res[0].node; this.w = res[0].width; this.h = res[0].height; const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2; this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr; this.ctx = this.canvas.getContext('2d'); this.ctx.scale(dpr, dpr); this.redraw(); }); }, detached() { this.stop(); } },
  pageLifetimes: { hide() { this.hidden = true; this.stop(); }, show() { this.hidden = false; this.redraw(); } },
  methods: {
    stop() { if (this.frame && this.canvas) this.canvas.cancelAnimationFrame(this.frame); this.frame = null; },
    redraw() {
      if (!this.ctx || this.hidden) return;
      this.stop(); const now = Date.now(), p = this.properties;
      const key = p.scene && p.scene.key;
      if (key !== this.sceneKey) { this.sceneStart = now; this.sceneKey = key; }
      const ctx = this.ctx; ctx.clearRect(0, 0, this.w, this.h);
      const scale = Math.min(this.w / 320, this.h / 300); ctx.save(); ctx.translate((this.w - 320 * scale) / 2, (this.h - 300 * scale) / 2); ctx.scale(scale, scale);
      // 舞台演示与计时器无关：暂停、手动翻步时也持续示范当前动作；减少动态效果时只画关键帧。
      const animate = p.mode === 'stage' && p.scene && !p.reduced;
      if (p.mode === 'bottle') V.paint(ctx, E.art.bottle(p.item || {}), 70, 8, 180, 278);
      else if (p.mode === 'stage' && p.scene) this.stage(ctx, p.scene, animate ? (now - this.sceneStart) / 1000 : null);
      else { const look = E.core.drinkAppearance(p.recipe || {}, p.look || {}); V.paint(ctx, E.art.glass(look.glass, look.color, look.visual || {}), 48, 0, 224, 266); }
      ctx.restore();
      if (animate) this.frame = this.canvas.requestAnimationFrame(() => this.redraw());
    },
    stage(ctx, s, t) {
      const action = s.complete ? 'complete' : s.action, period = PERIOD[action] || 3;
      // t 为 null 表示静态关键帧：取动作进行到一半的样子。
      const u = t === null ? .55 : (t % period) / period, time = t === null ? period * .55 : t;
      const kind = s.target === 'glass' ? s.glass : s.target, rim = E.art.rim(kind), rimY = TY + rim * SY;
      const to = s.content.level || 0, from = s.fromLevel === undefined ? to : s.fromLevel;
      const transfer = TRANSFER.includes(action);
      // 液面：倒入类动作在演示中途从上一步的液面涨到本步的液面。
      const fill = transfer ? ease(clamp((u - .24) / .52)) : 1;
      const level = lerp(from, to, fill);
      const options = { ...s.visual, ...s.content, level, animateIce: action === 'ice' };
      const garnishLater = action === 'garnish';
      // 往摇壶里倒料、加冰时盖子是打开的，只有摇和与倒出时盖上。
      const open = s.target === 'shaker' && !['shake', 'strain', 'serve'].includes(action);
      const targetSVG = s.target === 'glass' ? E.art.glass(s.glass, s.color, garnishLater ? { ...options, garnish: 'none' } : options) : E.art.vessel(open ? 'mixing' : s.target, { ...options, color: s.color });
      const surfaceY = TY + surfaceOf(targetSVG, rim + (172 - rim) * .92) * SY;
      this.floor(ctx);
      if (action === 'complete') return this.complete(ctx, targetSVG, time);
      // 不是作用在最终酒杯时，左下角放一只空的最终酒杯作参照。
      if (s.target !== 'glass' && action !== 'ice') V.paint(ctx, E.art.glass(s.glass, s.color, { level: 0, garnish: 'none' }), 14, 178, 64, 76);
      if (transfer) return this.transfer(ctx, s, action, u, targetSVG, rimY, surfaceY, time);
      if (action === 'shake') return this.shake(ctx, targetSVG, time);
      if (action === 'ice') { this.bucket(ctx, u); V.paint(ctx, targetSVG, TX, TY, 140, 166, { iceTime: u * period }); return; }
      if (action === 'stir') return this.stir(ctx, targetSVG, rimY, surfaceY, time);
      if (action === 'muddle') return this.muddle(ctx, targetSVG, rimY, time);
      if (action === 'blend') return this.blend(ctx, targetSVG, time);
      if (action === 'garnish') return this.garnish(ctx, s, targetSVG, u);
      return this.prepare(ctx, s, targetSVG, time);
    },
    floor(ctx) { ctx.save(); ctx.strokeStyle = '#aa936b'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, FLOOR); ctx.lineTo(306, FLOOR); ctx.stroke(); ctx.restore(); },
    // 倒入 / 补满 / 漂浮 / 过滤：拿起瓶子（或摇壶）→ 倾倒 → 液流落入、液面上涨 → 放回。
    transfer(ctx, s, action, u, targetSVG, rimY, surfaceY, time) {
      const fromVessel = ['strain', 'serve'].includes(action);
      const lift = u < .22 ? ease(u / .22) : u > .78 ? 1 - ease((u - .78) / .22) : 1;
      const pouring = u > .24 && u < .76, flow = pouring ? clamp(Math.min((u - .24) / .06, (.76 - u) / .06)) : 0;
      let svg, w, h, mouth, angle;
      if (fromVessel) {
        const source = s.source || 'shaker', left = lerp(s.sourceLevel === undefined ? .65 : s.sourceLevel, 0, ease(clamp((u - .24) / .52)));
        svg = E.art.vessel(source, { color: s.color, level: left, ice: s.sourceIce }); w = 86; h = 102; angle = 1.95;
        mouth = source === 'shaker' ? [0, -h / 2 + 10] : [w * (120 / 160) - w / 2, h * (62 / 190) - h / 2];
      } else {
        svg = E.art.bottle(s.bottle || {}); w = 84; h = 130; angle = action === 'float' ? 1.75 : 2.05;
        mouth = [w * (54 / 110) - w / 2, h * (16 / 170) - h / 2];
      }
      const target = [192, Math.min(rimY - 8, Math.max(92, rimY - (action === 'float' ? 26 : 18)))];
      const [mx, my] = rotated(mouth[0], mouth[1], angle);
      const rest = [62, FLOOR - h / 2], pour = [target[0] - mx, target[1] - my];
      const cx = lerp(rest[0], pour[0], lift), cy = lerp(rest[1], pour[1], lift) - Math.sin(lift * Math.PI) * 14, a = angle * lift;
      if (flow) this.stream(ctx, s, action, target, surfaceY, flow, time);
      V.paint(ctx, targetSVG, TX, TY, 140, 166);
      if (action === 'float') { ctx.save(); ctx.strokeStyle = '#b9a37a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(196, surfaceY - 3); ctx.lineTo(262, rimY - 34); ctx.stroke(); ctx.beginPath(); ctx.ellipse(193, surfaceY - 3, 7, 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#b9a37a'; ctx.fill(); ctx.restore(); }
      if (flow) this.ripple(ctx, target[0] + 5, surfaceY, time, flow);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); V.paint(ctx, svg, -w / 2, -h / 2, w, h); ctx.restore();
      if (action === 'strain' && lift > .9) { ctx.save(); ctx.globalAlpha = .8; ctx.strokeStyle = '#7f949a'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(target[0] - 8, target[1] - 4 + i * 3); ctx.lineTo(target[0] + 8, target[1] - 4 + i * 3); ctx.stroke(); } ctx.restore(); }
    },
    stream(ctx, s, action, start, surfaceY, flow, time) {
      const width = action === 'float' ? 2.5 : action === 'top' ? 4.5 : action === 'rinse' ? 3 : 5.5;
      const end = [start[0] + 5, action === 'float' ? surfaceY - 4 : surfaceY + 4];
      const line = () => { ctx.beginPath(); ctx.moveTo(start[0], start[1]); ctx.quadraticCurveTo(start[0] + 7, (start[1] + end[1]) / 2, end[0], end[1]); ctx.stroke(); };
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = '#31535a'; ctx.globalAlpha = .3 * flow; ctx.lineWidth = width + 3; line();
      ctx.strokeStyle = s.color; ctx.globalAlpha = .95 * flow; ctx.lineWidth = width; line();
      // 流动的高光，表示液体正在往下走。
      ctx.globalAlpha = .9 * flow; ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = Math.max(1.2, width / 3); ctx.setLineDash([7, 9]); ctx.lineDashOffset = -time * 70; line(); ctx.restore();
    },
    ripple(ctx, x, y, time, flow) {
      ctx.save(); ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) { const k = (time * 1.6 + i / 2) % 1; ctx.globalAlpha = (1 - k) * .7 * flow; ctx.beginPath(); ctx.ellipse(x, y, 4 + k * 20, 1.5 + k * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    },
    // 摇和：摇壶沿斜线大幅来回摇，两侧出现动感弧线。
    shake(ctx, svg, time) {
      const w = Math.sin(time * Math.PI * 2 * 2.2), cx = TX + 70, cy = TY + 83;
      ctx.save(); ctx.translate(cx + w * 16 - 22, cy - w * 14); ctx.rotate(-.35 + w * .22); V.paint(ctx, svg, -70, -83, 140, 166); ctx.restore();
      ctx.save(); ctx.strokeStyle = '#fffbe8'; ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.globalAlpha = .35 + .45 * Math.abs(w);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const r = 76 + i * 12; ctx.beginPath(); ctx.arc(cx - 22, cy, r, side > 0 ? -.55 : Math.PI - .25, side > 0 ? -.05 : Math.PI + .25); ctx.stroke(); }
      ctx.restore();
    },
    bucket(ctx, u) {
      ctx.save(); ctx.translate(26, 198);
      ctx.fillStyle = '#9fb7bd'; ctx.strokeStyle = '#31535a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(70, 0); ctx.lineTo(62, 54); ctx.lineTo(8, 54); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dceff2'; ctx.strokeStyle = '#7ca5b0'; ctx.lineWidth = 1.2;
      for (const [x, y, r] of [[14, -12, -.2], [34, -16, .15], [52, -11, .3]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16); ctx.restore(); }
      ctx.restore();
      // 一块冰从冰桶飞向杯口，提示“加冰”。
      if (u < .3) { const k = easeOut(u / .3), x = lerp(70, 205, k), y = lerp(185, TY - 10, k) - Math.sin(k * Math.PI) * 40; ctx.save(); ctx.translate(x, y); ctx.rotate(k * 3); ctx.fillStyle = '#dceff2'; ctx.strokeStyle = '#7ca5b0'; ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16); ctx.restore(); }
    },
    // 搅拌：吧勺沿杯内画圈，液面出现旋涡。
    stir(ctx, svg, rimY, surfaceY, time) {
      const cx = TX + 70, phi = time * Math.PI * 2 / PERIOD.stir, x = cx + Math.cos(phi) * 18, behind = Math.sin(phi) < 0;
      const spoon = () => { ctx.save(); ctx.strokeStyle = '#b9a37a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, Math.min(FLOOR - 26, surfaceY + 34)); ctx.lineTo(cx + 14 + Math.cos(phi) * 6, rimY - 72); ctx.stroke(); ctx.fillStyle = '#b9a37a'; ctx.beginPath(); ctx.arc(cx + 14 + Math.cos(phi) * 6, rimY - 74, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
      if (behind) spoon();
      V.paint(ctx, svg, TX, TY, 140, 166);
      if (!behind) spoon();
      ctx.save(); ctx.strokeStyle = '#fffbe8'; ctx.globalAlpha = .75; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -time * 40;
      ctx.beginPath(); ctx.ellipse(cx, surfaceY + 2, 26, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    },
    // 捣压：捣棒上下按压，碎叶在杯底跳动。
    muddle(ctx, svg, rimY, time) {
      const cx = TX + 70, press = Math.abs(Math.sin(time * Math.PI / PERIOD.muddle)), bottom = TY + 150 * SY - press * 26;
      V.paint(ctx, svg, TX, TY, 140, 166);
      ctx.save(); ctx.fillStyle = '#5b975d';
      for (let i = 0; i < 5; i++) { const jump = (1 - press) * 8 * ((i % 2) + .5); ctx.beginPath(); ctx.ellipse(cx - 22 + i * 11, TY + 152 * SY - jump, 5, 2.5, i, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#92704b'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, bottom); ctx.lineTo(cx + 6, bottom - 120); ctx.stroke();
      ctx.restore();
    },
    blend(ctx, svg, time) {
      const j = Math.sin(time * 90) * 1.5, cx = TX + 70, cy = TY + 110 * SY;
      ctx.save(); ctx.translate(j, 0); V.paint(ctx, svg, TX, TY, 140, 166); ctx.restore();
      ctx.save(); ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -time * 120; ctx.globalAlpha = .75;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, cy + i * 14, 28 - i * 7, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    },
    // 装饰：先画没有装饰的杯子，再让装饰从上方落到杯口。
    garnish(ctx, s, svg, u) {
      V.paint(ctx, svg, TX, TY, 140, 166);
      const piece = garnishOnly(E.art.glass(s.glass, s.color, { ...s.visual, garnish: s.visual.garnish || 'lime' }));
      if (!piece) return;
      const k = clamp(u / .4), drop = k < 1 ? (1 - easeOut(k)) * -90 : 0, bounce = k >= 1 && u < .5 ? -Math.sin((u - .4) / .1 * Math.PI) * 6 : 0;
      ctx.save(); ctx.globalAlpha = clamp(u / .1); V.paint(ctx, piece, TX, TY + drop + bounce, 140, 166); ctx.restore();
      if (u > .4 && u < .7) this.sparkle(ctx, TX + 110, TY + 30, (u - .4) / .3);
    },
    // 备料 / 原方提示：材料瓶轻轻上下浮动，旁边是最终酒杯。
    prepare(ctx, s, svg, time) {
      const bob = Math.sin(time * Math.PI * 2 / PERIOD.prepare) * 4;
      ctx.save(); ctx.strokeStyle = '#d9be88'; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 20; ctx.globalAlpha = .7; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(64, 242, 48, 9, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      V.paint(ctx, E.art.bottle(s.bottle || {}), 22, 102 + bob, 84, 130);
      V.paint(ctx, svg, TX, TY, 140, 166);
    },
    complete(ctx, svg, time) {
      V.paint(ctx, svg, 85, TY - 10, 150, 178);
      for (let i = 0; i < 4; i++) this.sparkle(ctx, [60, 230, 90, 210][i], [70, 90, 190, 200][i], (time * .7 + i / 4) % 1);
    },
    sparkle(ctx, x, y, k) {
      const r = 3 + Math.sin(k * Math.PI) * 7; ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI) * .9; ctx.fillStyle = '#f3dfa6'; ctx.translate(x, y);
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill(); ctx.restore();
    }
  }
});
