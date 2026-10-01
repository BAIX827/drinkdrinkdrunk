// Small Canvas renderer for our own BarArt SVG vocabulary. No remote assets or DOM.
const E = require('./engine');
function parse(source) {
  const root = { tag: 'root', attrs: {}, children: [] }, stack = [root];
  for (const token of source.match(/<[^>]+>/g) || []) {
    if (token.startsWith('</')) { stack.pop(); continue; }
    const match = token.match(/^<([\w-]+)/); if (!match) continue;
    const node = { tag: match[1], attrs: {}, children: [] };
    for (const attr of token.matchAll(/([\w:-]+)="([^"]*)"/g)) node.attrs[attr[1]] = attr[2];
    stack[stack.length - 1].children.push(node);
    if (!token.endsWith('/>')) stack.push(node);
  }
  return root.children[0];
}
function path(ctx, value, begin = true) {
  const tokens = value.match(/[MLHVQCZmlhvqcz]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi) || [];
  let i = 0, command = '', x = 0, y = 0, startX = 0, startY = 0;
  if (begin) ctx.beginPath();
  const number = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    const relative = command === command.toLowerCase(), c = command.toUpperCase();
    const px = n => n + (relative ? x : 0), py = n => n + (relative ? y : 0);
    if (c === 'Z') { ctx.closePath(); x = startX; y = startY; command = ''; continue; }
    if (c === 'M' || c === 'L') { x = px(number()); y = py(number()); ctx[c === 'M' ? 'moveTo' : 'lineTo'](x, y); if (c === 'M') { startX = x; startY = y; command = relative ? 'l' : 'L'; } }
    else if (c === 'H') { x = px(number()); ctx.lineTo(x, y); }
    else if (c === 'V') { y = py(number()); ctx.lineTo(x, y); }
    else if (c === 'Q') { const a = px(number()), b = py(number()), endX = px(number()), endY = py(number()); ctx.quadraticCurveTo(a, b, endX, endY); x = endX; y = endY; }
    else if (c === 'C') { const a = px(number()), b = py(number()), c1 = px(number()), d = py(number()), endX = px(number()), endY = py(number()); ctx.bezierCurveTo(a, b, c1, d, endX, endY); x = endX; y = endY; }
    else throw new Error('Unsupported artwork path: ' + command);
  }
}
function shape(ctx, node, begin = true) {
  const a = node.attrs, n = key => Number(a[key] || 0);
  if (node.tag === 'path') return path(ctx, a.d, begin);
  if (begin) ctx.beginPath();
  if (node.tag === 'rect') {
    const x = n('x'), y = n('y'), w = n('width'), h = n('height'), r = Math.min(n('rx'), w / 2, h / 2);
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  } else if (node.tag === 'ellipse' || node.tag === 'circle') {
    ctx.save(); ctx.translate(n('cx'), n('cy')); ctx.scale(node.tag === 'circle' ? n('r') : n('rx'), node.tag === 'circle' ? n('r') : n('ry')); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore();
  } else if (node.tag === 'polyline') {
    const points = a.points.trim().split(/[ ,]+/).map(Number); for (let i = 0; i < points.length; i += 2) ctx[i ? 'lineTo' : 'moveTo'](points[i], points[i + 1]);
  }
}
function paint(ctx, source, x, y, width, height, options = {}) {
  const tree = typeof source === 'string' ? parse(source) : source, defs = {};
  function collect(node) { if (node.attrs.id) defs[node.attrs.id] = node; node.children.forEach(collect); } collect(tree);
  const vb = tree.attrs.viewBox.split(' ').map(Number);
  ctx.save(); ctx.translate(x, y); ctx.scale(width / vb[2], height / vb[3]);
  function color(value) {
    const match = String(value).match(/^url\(#(.+)\)$/); if (!match) return value;
    const def = defs[match[1]]; if (!def) return '#000000';
    const a = def.attrs, g = ctx.createLinearGradient(Number(a.x1), Number(a.y1), Number(a.x2), Number(a.y2));
    def.children.forEach(stop => g.addColorStop(Number(stop.attrs.offset), stop.attrs['stop-color'])); return g;
  }
  function draw(node, inherited) {
    if (['defs', 'clipPath', 'linearGradient', 'stop'].includes(node.tag)) return;
    const a = node.attrs, style = { ...inherited };
    for (const key of ['fill','stroke','stroke-width','fill-opacity','stroke-opacity','stroke-linecap','stroke-linejoin']) if (a[key] !== undefined) style[key] = a[key];
    ctx.save(); ctx.globalAlpha *= Number(a.opacity === undefined ? 1 : a.opacity);
    for (const match of (a.transform || '').matchAll(/(translate|scale|rotate)\(([^)]+)\)/g)) {
      const v = match[2].trim().split(/[ ,]+/).map(Number);
      if (match[1] === 'translate') ctx.translate(v[0], v[1] || 0);
      if (match[1] === 'scale') ctx.scale(v[0], v[1] === undefined ? v[0] : v[1]);
      if (match[1] === 'rotate') ctx.rotate(v[0] * Math.PI / 180);
    }
    if ((a.class || '').includes('ice-piece') && options.iceTime !== undefined) {
      const delay = Number((a.style || '').match(/--ice-delay:([.\d]+)/)[1]), start = Number(a.style.match(/--ice-start:([-\d.]+)/)[1]);
      const t = Math.max(0, Math.min(1, (options.iceTime - delay) / .7)); ctx.translate(0, t < .8 ? start * (1 - (t / .8) ** 2) : -5 * Math.sin((t - .8) / .2 * Math.PI));
    }
    const clipping = (a['clip-path'] || '').match(/url\(#(.+)\)/);
    if (clipping && defs[clipping[1]]) { ctx.beginPath(); defs[clipping[1]].children.forEach(child => shape(ctx, child, false)); ctx.clip(); }
    if (['path','rect','circle','ellipse','polyline'].includes(node.tag)) {
      shape(ctx, node); const alpha = ctx.globalAlpha;
      if (style.fill !== 'none') { ctx.globalAlpha = alpha * Number(style['fill-opacity'] || 1); ctx.fillStyle = color(style.fill); ctx.fill(); }
      if (style.stroke !== 'none') { ctx.globalAlpha = alpha * Number(style['stroke-opacity'] || 1); ctx.strokeStyle = color(style.stroke); ctx.lineWidth = Number(style['stroke-width'] || 1); ctx.lineCap = style['stroke-linecap'] || 'butt'; ctx.lineJoin = style['stroke-linejoin'] || 'miter'; ctx.stroke(); }
      ctx.globalAlpha = alpha;
    }
    node.children.forEach(child => draw(child, style)); ctx.restore();
  }
  draw(tree, { fill: '#000000', stroke: 'none' }); ctx.restore();
}
function drink(ctx, recipe, look, x, y, w, h) { const a = E.core.drinkAppearance(recipe, look); paint(ctx, E.art.glass(a.glass, a.color, a.visual || {}), x, y, w, h); }
module.exports = { parse, path, paint, drink };
