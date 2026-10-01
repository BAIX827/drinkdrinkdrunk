(() => {
  const { html: localHTML, t: localText } = globalThis.BarI18n || { html: s => s, t: s => s };
  let played = false;
  let active;

  function scene() {
    const art = (svg, x, y, width, height) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${width}" height="${height}" `);
    const bottle = (shape, color, x, y, size = 64) => art(BarArt.bottle({ shape, color }), x, y, size, size * 170 / 110);
    const lamp = (x, delay) => `<g transform="translate(${x} 0)">
      <path d="M0 0V49" stroke="#82704f" stroke-width="2"/>
      <path d="M-29 69Q-24 48 0 48Q24 48 29 69Z" fill="#b59861"/>
      <g class="opening-light" style="--on:${delay}ms"><path d="M-24 72L-100 280H100L24 72Z" fill="url(#opening-beam)"/>
      <ellipse cy="71" rx="25" ry="4" fill="#ffe2a1"/><ellipse cy="74" rx="37" ry="11" fill="url(#opening-halo)"/></g></g>`;
    return `<svg class="opening-scene" viewBox="0 0 560 370" aria-hidden="true">
      <defs>
        <linearGradient id="opening-beam" x2="0" y2="1"><stop stop-color="#edc47d" stop-opacity=".2"/><stop offset="1" stop-color="#edc47d" stop-opacity="0"/></linearGradient>
        <radialGradient id="opening-halo"><stop stop-color="#ffe1a0" stop-opacity=".65"/><stop offset="1" stop-color="#ffe1a0" stop-opacity="0"/></radialGradient>
        <linearGradient id="opening-wood" x2="0" y2="1"><stop stop-color="#94704c"/><stop offset="1" stop-color="#513c2b"/></linearGradient>
      </defs>
      <g class="opening-room">
        <path d="M77 296V139C77-33 483-33 483 139V296Z" fill="#15271f" stroke="#576047" stroke-width="1.5"/>
        <path d="M90 285V141C90-14 470-14 470 141V285" fill="none" stroke="#c4a575" stroke-opacity=".16"/>
        <path d="M205 107V287M355 107V287" stroke="#637354" stroke-opacity=".18"/>
        <g class="opening-shelf" style="--on:650ms">
          ${bottle('whiskey', '#ae7c46', 112, 112)}${bottle('gin', '#73988e', 166, 95, 74)}
          ${bottle('rum', '#798c60', 326, 105, 69)}${bottle('bottle', '#a88558', 385, 114)}
          <rect x="100" y="207" width="360" height="9" rx="3" fill="url(#opening-wood)"/>
          <rect class="opening-strip" x="104" y="207" width="352" height="2" rx="1" fill="#f2cf8e"/>
        </g>
        <g class="opening-shelf" style="--on:1000ms">
          ${bottle('bottle', '#5d8475', 123, 227, 43)}${bottle('whiskey', '#bc8651', 163, 240, 35)}
          ${art(BarArt.glass('coupe', '#d6a05c', { garnish: 'lime' }), 354, 226, 62, 74)}
          <rect x="100" y="291" width="360" height="8" rx="3" fill="url(#opening-wood)"/>
          <rect class="opening-strip" x="104" y="291" width="352" height="2" rx="1" fill="#f2cf8e"/>
        </g>
        <g class="opening-sign" style="--on:1350ms">
          <path d="M256 120L280 99L304 120" fill="none" stroke="#c5a772" stroke-width="1.5"/>
          <rect x="234" y="120" width="92" height="59" rx="12" fill="#19271f" stroke="#dfba7b"/>
          <text x="280" y="146" text-anchor="middle" fill="#f1cf92" font-size="18" letter-spacing="3">OPEN</text>
          <text x="280" y="166" text-anchor="middle" fill="#ded5bd" font-size="10" letter-spacing="3">营业中</text>
        </g>
        ${lamp(166, 250)}${lamp(394, 450)}
        <g class="opening-shelf" style="--on:850ms">
          <rect x="62" y="301" width="436" height="16" rx="5" fill="url(#opening-wood)"/>
          <path d="M70 304H490" stroke="#d0ac72" stroke-opacity=".65"/>
          <path d="M82 317H478L470 350H90Z" fill="#1d3026" stroke="#5b6448"/>
          <path d="M100 324H460" stroke="#c3a06a" stroke-opacity=".2"/>
        </g>
      </g>
      <g class="opening-drink" style="--on:1100ms">
        <ellipse cx="280" cy="304" rx="42" ry="5" fill="#d7b777" opacity=".2"/>
        ${art(BarArt.glass('martini', '#dfad69', { garnish: 'olive' }), 230, 192, 100, 119)}
      </g>
    </svg>`;
  }

  function start({ replay = false } = {}) {
    if (active) return active;
    if (played && !replay) return Promise.resolve();
    played = true;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Decorative only: reduced motion and background loads go straight in.
    if (motion.matches || document.hidden) return Promise.resolve();
    let complete;
    const result = active = new Promise(resolve => { complete = resolve; });
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.id = 'bar-opening';
    dialog.setAttribute('aria-labelledby', 'opening-title');
    dialog.innerHTML = localHTML(`<div class="opening-content"><p class="opening-eyebrow">MY LITTLE HOME BAR</p>
      <h1 id="opening-title">大喝特喝</h1><p class="opening-english">DRINK, DRINK, DRUNK</p>
      ${scene()}<p class="opening-welcome">灯亮了，吧台见。</p><span class="opening-rule" aria-hidden="true"></span></div>
      <button type="button" class="opening-skip" autofocus aria-label="跳过开场动画">跳过 <span aria-hidden="true">↗</span></button>`);
    const oldOverflow = document.documentElement.style.overflow;
    let timer, finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const restoreFocus = dialog.contains(document.activeElement);
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', finish);
      window.removeEventListener('hashchange', finish);
      motion.removeEventListener('change', finish);
      dialog.close();
      dialog.remove();
      document.documentElement.style.overflow = oldOverflow;
      active = undefined;
      if (restoreFocus) {
        const target = replay && previousFocus?.isConnected ? previousFocus : document.querySelector('#main');
        target?.focus({ preventScroll: true });
      }
      complete();
    };
    const onVisibility = () => { if (document.hidden) finish(); };
    dialog.querySelector('button').addEventListener('click', finish);
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
    dialog.addEventListener('animationend', event => {
      if (event.target === dialog && event.animationName === 'opening-exit') finish();
    });
    document.body.append(dialog);
    // Clean up if an older host cannot show a modal dialog.
    try { dialog.showModal(); } catch { finish(); return result; }
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', finish);
    window.addEventListener('hashchange', finish);
    motion.addEventListener('change', finish);
    timer = setTimeout(finish, 3400);
    return result;
  }

  globalThis.BarOpening = { start };
})();
