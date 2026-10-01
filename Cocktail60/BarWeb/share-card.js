(() => {
  const WIDTH = 1080, MAX_HEIGHT = 8192;
  const sans = '"PingFang SC", "Microsoft YaHei", sans-serif';
  const templates = [
    { id: 'theme', name: '跟随主题', subtitle: '与当前应用外观一致' },
    { id: 'archive', name: '奶油吧台', subtitle: '奶油白 · 珊瑚橙', paper: '#f2e9d8', ink: '#31535a', accent: '#cf795e', soft: '#ead9b9', panel: '#fffaf0', motif: 'tabs' },
    { id: 'botanical', name: '青柠气泡', subtitle: '鼠尾草绿 · 青柠黄', paper: '#dbe6d2', ink: '#31535a', accent: '#a4b776', soft: '#c4d5b4', panel: '#f6f9ed', motif: 'bubbles' },
    { id: 'tropical', name: '落日橘调', subtitle: '杏桃橘 · 暖沙色', paper: '#f1d4bc', ink: '#31535a', accent: '#db9262', soft: '#edb393', panel: '#fff5e6', motif: 'sun' },
    { id: 'ocean', name: '午夜海蓝', subtitle: '深海蓝 · 冰川青', paper: '#132b39', ink: '#e3f0ee', accent: '#80c9c3', soft: '#264957', panel: '#1d3946', motif: 'waves', dark: true },
    { id: 'berry', name: '莓果奶昔', subtitle: '浅莓粉 · 玫瑰红', paper: '#f0dbe0', ink: '#633d4c', accent: '#c27690', soft: '#e9c1cd', panel: '#fff3f5', motif: 'diamonds' },
    { id: 'violet', name: '雾紫微醺', subtitle: '雾紫灰 · 鸢尾紫', paper: '#e6e0ef', ink: '#49465f', accent: '#a193c6', soft: '#d6cce6', panel: '#f7f4fc', motif: 'bubbles' },
    { id: 'cocoa', name: '可可拿铁', subtitle: '燕麦米 · 可可棕', paper: '#e5dacb', ink: '#54463d', accent: '#b38b67', soft: '#d1bba2', panel: '#f8f0e5', motif: 'tabs' },
  ];
  function resolveTemplate(id, theme = 'bar') {
    let t = templates.find(t => t.id === id) || templates[0];
    if (t.id === 'theme') {
      t = theme === 'light'
        ? { ...t, paper: '#f2ecdf', ink: '#293d32', accent: '#976442', soft: '#e5e5d3', panel: '#fff9ee', motif: 'tabs' }
        : { ...t, paper: theme === 'dark' ? '#0b100e' : '#0e1714', ink: '#f0e7d6', accent: '#d9b579', soft: theme === 'dark' ? '#19291f' : '#21372d', panel: theme === 'dark' ? '#131c17' : '#19251f', motif: 'diamonds', dark: true };
    }
    return { ...t, edge: t.dark ? t.accent : t.ink, tasteBg: t.dark ? t.soft : t.ink, tasteInk: t.dark ? t.ink : t.panel };
  }
  function dataFor(recipe) {
    const profile = BarTaste.profile(recipe);
    const mainParts = (recipe.parts || recipe.ingredients.map(BarCore.ingredient)).filter(p => !p.optional && !p.substitution);
    const known = mainParts.length > 0 && !profile.unknown.length;
    const bases = [...new Set(mainParts
      .flatMap(p => p.types.map(type => BarTasteData[BarCore.canonical(type)]?.base).filter(Boolean)))];
    return {
      name: recipe.chineseName, english: recipe.englishName || '',
      ingredients: [...recipe.ingredients], glass: recipe.glass || '',
      base: bases.join(' / ') || (known ? '无基酒' : '基酒待补充'),
      family: known ? profile.family : '', known,
      tags: known ? BarTaste.characteristics(profile.vector) : [],
      vector: known ? [...profile.vector] : null,
      source: recipe.source?.title || '', art: BarArt.drink(recipe),
    };
  }
  // Preserve every character, including explicit newlines and quantities. The caller
  // supplies real font metrics in browsers and a deterministic measure in tests.
  function wrap(text, width, measure) {
    const lines = [];
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      for (const char of Array.from(paragraph)) {
        if (line && measure(line + char) > width) { lines.push(line); line = ''; }
        line += char;
      }
      lines.push(line);
    }
    return lines;
  }
  function layout(data, measure) {
    const blocks = [];
    const add = (text, x, y, width, size, lineHeight, kind = 'body', align = 'left', role = '') => {
      const lines = wrap(text, width, s => measure(s, size, kind));
      blocks.push({ lines, x, y, width, size, lineHeight, kind, align, role });
      return y + (lines.length - 1) * lineHeight;
    };
    let y = add(data.name, 82, 192, 565, 66, 82, 'title');
    if (data.english) y = add(data.english, 84, y + 48, 555, 29, 39, 'english');
    y = add(data.base, 84, y + 55, 545, 27, 38, 'muted');
    if (data.family) y = add(data.family, 84, y + 40, 545, 27, 38, 'muted');
    const glassEnd = data.glass ? add(data.glass, 845, 398, 260, 24, 32, 'muted', 'center') : 398;
    const mainY = Math.max(430, y + 42, glassEnd + 32);
    let ingredientY = mainY + 118;
    const rows = [];
    for (const ingredient of data.ingredients) {
      const top = ingredientY;
      ingredientY = add(ingredient, 140, ingredientY, 824, 34, 46, 'body', 'left', 'ingredient');
      rows.push({ top, bottom: ingredientY + 22 });
      ingredientY += 65;
    }
    const divider = ingredientY - 18;
    const footer = divider + 24;
    const sourceLines = data.source ? wrap(`配方来源 · ${data.source}`, 910, s => measure(s, 21, 'muted')) : [];
    const height = Math.max(1080, footer + 238 + Math.max(1, sourceLines.length) * 29 + 55);
    if (height > MAX_HEIGHT) throw new Error('配方文字过长，无法放入一张清晰的图片。请精简后重试。');
    return { width: WIDTH, height, blocks, rows, mainY, divider, footer, sourceLines };
  }
  function font(size, kind) {
    return `${kind === 'title' ? '700' : kind === 'english' ? '500' : '400'} ${size}px ${sans}`;
  }
  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function box(ctx, x, y, width, height, radius, fill, stroke = null, lineWidth = 3) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function circle(ctx, x, y, radius, fill, stroke = null) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
  }
  function border(ctx, template, height) {
    ctx.fillStyle = template.paper; ctx.fillRect(0, 0, WIDTH, height);
    box(ctx, 23, 23, WIDTH - 46, height - 46, 38, null, template.edge, 4);
    ctx.globalAlpha = .3;
    box(ctx, 36, 36, WIDTH - 72, height - 72, 29, null, template.edge, 1.4);
    ctx.globalAlpha = 1;
    for (const x of [51, WIDTH - 51]) {
      for (const y of [51, height - 51]) circle(ctx, x, y, 4, template.accent);
    }
    ctx.strokeStyle = template.accent; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const x of [23, WIDTH - 23]) {
      for (let i = -2; i <= 2; i++) line(ctx, x - 5, height / 2 + i * 12, x + 5, height / 2 + i * 12);
    }
    if (template.motif === 'bubbles') {
      for (const y of [58, 84, 110]) circle(ctx, 23, y + 37, 7, template.accent, template.ink);
      for (const y of [58, 84, 110]) circle(ctx, WIDTH - 23, height - y - 37, 7, template.accent, template.ink);
    } else if (template.motif === 'waves') {
      for (let i = 0; i < 3; i++) {
        const y = 95 + i * 18;
        ctx.beginPath(); ctx.moveTo(14, y); ctx.quadraticCurveTo(23, y - 13, 32, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(WIDTH - 32, height - y); ctx.quadraticCurveTo(WIDTH - 23, height - y - 13, WIDTH - 14, height - y); ctx.stroke();
      }
    } else if (template.motif === 'diamonds') {
      for (const [x, y] of [[23, 113], [WIDTH - 23, height - 113]]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        box(ctx, -10, -10, 20, 20, 4, template.accent, template.edge, 2); ctx.restore();
        circle(ctx, x, y - 29, 4, template.accent); circle(ctx, x, y + 29, 4, template.accent);
      }
    } else if (template.motif === 'sun') {
      box(ctx, 94, 16, 156, 14, 7, template.accent, template.ink, 3);
      box(ctx, WIDTH - 250, height - 30, 156, 14, 7, template.accent, template.ink, 3);
    } else {
      box(ctx, 13, 86, 20, 86, 8, template.accent, template.ink, 3);
      box(ctx, WIDTH - 33, height - 172, 20, 86, 8, template.accent, template.ink, 3);
    }
  }
  function text(ctx, value, x, y, size, color, align = 'left', kind = 'body') {
    ctx.font = font(size, kind); ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y);
  }
  function draw(ctx, data, template, plan, art) {
    const { height, mainY, divider, footer } = plan;
    border(ctx, template, height);
    box(ctx, 78, 58, 40, 40, 12, template.ink);
    ctx.strokeStyle = template.panel; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.moveTo(87, 69); ctx.lineTo(109, 69); ctx.lineTo(98, 81); ctx.closePath(); ctx.stroke();
    line(ctx, 98, 81, 98, 90); line(ctx, 92, 90, 104, 90);
    circle(ctx, 108, 69, 4, template.accent);
    text(ctx, '大喝特喝', 134, 87, 27, template.ink, 'left', 'title');
    text(ctx, 'COCKTAIL RECIPE', 997, 84, 20, template.ink, 'right', 'english');
    box(ctx, 690, 122, 310, 246, 46, template.soft);
    if (template.motif === 'sun') circle(ctx, 925, 180, 37, template.accent);
    else if (template.motif === 'bubbles') { circle(ctx, 974, 146, 10, template.panel); circle(ctx, 714, 344, 7, template.panel); }
    else { box(ctx, 713, 141, 56, 14, 7, template.accent); box(ctx, 939, 330, 38, 14, 7, template.accent); }
    ctx.drawImage(art, 732, 109, 234, 278);
    box(ctx, 60, mainY, 960, divider - mainY, 28, template.panel, template.edge, 3);
    text(ctx, '配方', 98, mainY + 57, 32, template.ink, 'left', 'title');
    text(ctx, `${data.ingredients.length} 项材料`, 978, mainY + 55, 24, template.ink, 'right');
    ctx.strokeStyle = template.soft; ctx.lineWidth = 2;
    line(ctx, 98, mainY + 77, 981, mainY + 77);
    plan.rows.forEach((row, i) => {
      circle(ctx, 110, row.top - 12, 6, template.accent);
      if (i < plan.rows.length - 1) line(ctx, 140, row.bottom, 979, row.bottom);
    });
    for (const b of plan.blocks) {
      const parts = b.role === 'ingredient' && b.lines.length === 1
        ? b.lines[0].match(/^(.+?)\s+(\d+(?:[./–—-]\d+)?\s*(?:ml|cl|滴|dash|片|个|茶匙|吧勺|毫升|克|g))$/i) : null;
      ctx.font = font(b.size, b.kind);
      if (parts && ctx.measureText(parts[1]).width + ctx.measureText(parts[2]).width + 45 < b.width) {
        text(ctx, parts[1], b.x, b.y, b.size, template.ink);
        text(ctx, parts[2], b.x + b.width, b.y, b.size, template.ink, 'right', 'english');
        continue;
      }
      b.lines.forEach((s, i) => text(ctx, s, b.x, b.y + i * b.lineHeight, b.size, template.ink, b.align, b.kind));
    }
    box(ctx, 60, footer, 960, 238, 28, template.tasteBg);
    const tags = !data.known ? '风味待补充' : data.tags.join(' · ') || '轻盈 · 柔和';
    text(ctx, '风味', 99, footer + 57, 28, template.tasteInk, 'left', 'title');
    text(ctx, tags, 978, footer + 57, 27, template.tasteInk, 'right');
    if (data.known) {
      [0, 1, 3].forEach((index, column) => {
        const x = 99 + column * 309;
        text(ctx, BarTaste.dimensions[index], x, footer + 131, 27, template.tasteInk);
        box(ctx, x, footer + 158, 264, 16, 8, '#ffffff28');
        if (data.vector[index]) box(ctx, x, footer + 158, 264 * data.vector[index] / 100, 16, 8, template.accent);
      });
    } else text(ctx, '部分材料尚无风味数据', 99, footer + 137, 27, template.tasteInk);
    plan.sourceLines.forEach((s, i) => text(ctx, s, 84, height - 48 - (plan.sourceLines.length - 1 - i) * 29, 21, template.ink));
    if (!plan.sourceLines.length) text(ctx, '大喝特喝  /  MY LITTLE HOME BAR', 84, height - 48, 20, template.ink);
  }
  function loadArt(svg) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => { image.src = ''; reject(new Error('酒杯插画加载超时，请重试。')); }, 10000);
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('酒杯插画生成失败，请重试。')); };
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="190" '));
    });
  }
  async function render(data, templateID = 'theme', theme = document.documentElement.dataset.theme || 'bar') {
    const template = resolveTemplate(templateID, theme);
    if (document.fonts) await document.fonts.ready;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前环境无法生成图片。');
    const plan = layout(data, (s, size, kind) => { ctx.font = font(size, kind); return ctx.measureText(s).width; });
    const art = await loadArt(template.dark ? data.art.replaceAll('stroke="#31535a"', 'stroke="#b7cbbb"') : data.art);
    canvas.width = WIDTH; canvas.height = plan.height;
    try {
      draw(ctx, data, template, plan, art);
      const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片生成失败，请重试。')), 'image/png'));
      return { blob, width: WIDTH, height: plan.height };
    } finally { canvas.width = 1; canvas.height = 1; }
  }
  function filename(data, templateID) {
    const name = data.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 60) || '鸡尾酒';
    return `大喝特喝-${name}-${(templates.find(t => t.id === templateID) || templates[0]).name}.png`;
  }
  function thumbnail(t) {
    // Match the exported card's flat border and compact color-block layout.
    const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 132;
    const ctx = canvas.getContext('2d'); ctx.scale(1 / 6, 1 / 6); border(ctx, t, 792);
    text(ctx, '配方卡', 130, 260, 94, t.ink, 'left', 'title');
    box(ctx, 680, 135, 270, 190, 34, t.soft);
    box(ctx, 90, 374, 900, 165, 28, t.panel, t.edge);
    box(ctx, 90, 567, 900, 143, 28, t.tasteBg);
    for (let i = 0; i < 3; i++) box(ctx, 145 + i * 284, 635, 215, 16, 8, t.accent);
    const url = canvas.toDataURL(); canvas.width = 1; canvas.height = 1; return url;
  }
  let activeCleanup = null;
  function dispose() { activeCleanup?.(); }
  function open(recipe, { showModal, toast }) {
    dispose();
    const data = dataFor(recipe), recommended = 'theme', e = BarArt.escape;
    const theme = document.documentElement.dataset.theme || 'bar';
    const native = window.webkit?.messageHandlers?.barShare;
    const nativeIOS = native && window.barHost?.platform === 'ios';
    showModal(`<section class="share-panel"><header><span class="share-eyebrow">COCKTAIL RECIPE</span><h2 id="share-title">分享卡片</h2></header><div class="share-layout"><div class="share-preview" aria-busy="true"><img id="share-image" hidden alt="${e(data.name)}的配方与风味分享卡片"><p id="share-loading" role="status">正在生成卡片…</p></div><div class="share-options"><fieldset><legend>配色与边框</legend><div class="share-templates">${templates.map(t => `<label class="share-template"><input type="radio" name="share-template" value="${t.id}" ${t.id === recommended ? 'checked' : ''}><img src="${thumbnail(resolveTemplate(t.id, theme))}" alt=""><span><strong>${t.name}${t.id === recommended ? '<small>默认</small>' : ''}</strong><span>${t.subtitle}</span></span></label>`).join('')}</div></fieldset><p class="share-dimensions" id="share-dimensions"></p><p class="error" id="share-error" role="alert"></p><button class="secondary" id="share-retry" hidden>重新生成</button><div class="share-actions"><button class="primary" id="share-save" disabled>${nativeIOS ? '保存／分享图片' : '保存图片'}</button><button class="secondary" id="share-system" hidden disabled>系统分享</button></div></div></div></section>`);
    const modal = document.querySelector('#modal');
    modal.classList.add('share-dialog');
    modal.setAttribute('aria-labelledby', 'share-title');
    const panel = modal.querySelector('.share-panel'), image = panel.querySelector('#share-image');
    image.alt = `${data.name}${data.english ? ` · ${data.english}` : ''}。配方：${data.ingredients.join('；')}。${data.known ? `主要风味：${data.tags.join('、') || '轻盈柔和'}；甜感 ${data.vector[0]}，酸感 ${data.vector[1]}，酒感 ${data.vector[3]}。` : '风味待补充。'}`;
    const loading = panel.querySelector('#share-loading'), error = panel.querySelector('#share-error');
    const save = panel.querySelector('#share-save'), system = panel.querySelector('#share-system');
    const retry = panel.querySelector('#share-retry'), dimensions = panel.querySelector('#share-dimensions');
    let selected = recommended, revision = 0, closed = false, current = null, exporting = false;
    const cleanCurrent = () => {
      image.removeAttribute('src'); image.hidden = true;
      if (current) URL.revokeObjectURL(current.url);
      current = null;
    };
    const cleanup = () => {
      if (closed) return;
      closed = true; revision++; cleanCurrent();
      modal.classList.remove('share-dialog'); modal.removeAttribute('aria-labelledby');
      modal.removeEventListener('close', cleanup); window.removeEventListener('hashchange', onRoute);
      activeCleanup = null;
    };
    const onRoute = () => { cleanup(); if (modal.open) modal.close(); };
    activeCleanup = cleanup;
    modal.addEventListener('close', cleanup); window.addEventListener('hashchange', onRoute);
    const canShare = file => {
      try { return !native && typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }); }
      catch { return false; }
    };
    async function update() {
      const token = ++revision, choice = selected;
      cleanCurrent(); error.textContent = ''; dimensions.textContent = ''; retry.hidden = true;
      loading.hidden = false; save.disabled = true; system.hidden = true;
      panel.querySelector('.share-preview').setAttribute('aria-busy', 'true');
      try {
        const result = await render(data, choice, theme);
        if (closed || token !== revision) return;
        const file = new File([result.blob], filename(data, choice), { type: 'image/png' });
        current = { ...result, file, url: URL.createObjectURL(result.blob) };
        image.src = current.url; image.hidden = false;
        dimensions.textContent = `PNG · ${result.width} × ${result.height}`;
        save.disabled = false; system.disabled = false; system.hidden = !canShare(file);
      } catch (reason) {
        if (!closed && token === revision) { error.textContent = reason.message || '图片生成失败，请重试。'; retry.hidden = false; }
      } finally {
        if (!closed && token === revision) { loading.hidden = true; panel.querySelector('.share-preview').setAttribute('aria-busy', 'false'); }
      }
    }
    panel.querySelectorAll('input[name="share-template"]').forEach(input => input.addEventListener('change', () => { selected = input.value; update(); }));
    retry.onclick = update;
    function setExporting(value) {
      exporting = value; save.disabled = value || !current; system.disabled = value || !current;
      panel.querySelectorAll('input').forEach(input => { input.disabled = value; });
    }
    async function exportImage(useSystem) {
      if (!current || exporting) return;
      setExporting(true); error.textContent = '';
      const output = current;
      try {
        if (native) {
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(new Error('图片读取失败。')); reader.readAsDataURL(output.blob);
          });
          if (closed) return;
          const result = await native.postMessage({ base64, filename: output.file.name });
          if (!closed && result === 'saved') toast('图片已保存。');
        } else if (useSystem) {
          // The PNG is ready before this click, preserving transient user activation.
          await navigator.share({ files: [output.file], title: data.name });
        } else {
          const url = URL.createObjectURL(output.blob), a = document.createElement('a');
          a.href = url; a.download = output.file.name; document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 30000);
          toast('已开始下载图片。');
        }
      } catch (reason) {
        if (!closed && reason.name !== 'AbortError') error.textContent = useSystem ? '系统分享暂不可用，请保存图片后分享。' : '图片保存失败，请重试。';
      } finally { if (!closed) setExporting(false); }
    }
    save.onclick = () => exportImage(false); system.onclick = () => exportImage(true);
    update();
  }
  globalThis.BarShare = { templates, resolveTemplate, defaultTemplate: 'theme', dataFor, wrap, layout, filename, render, open, dispose };
})();
