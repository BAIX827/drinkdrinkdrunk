(() => {
  const T = BarTaste, { escape: e } = BarArt;
  const drawings = {
    lemon: '<path d="M13 43Q7 34 19 20Q34 7 43 15L48 13L47 20Q55 34 39 45Q24 55 17 45Z"/><path d="M21 37Q18 27 32 20" fill="none" stroke="#fff8dc" stroke-width="3"/>',
    orange: '<circle cx="31" cy="34" r="20"/><circle cx="31" cy="34" r="15" fill="none" stroke="#fff0cf" stroke-width="2"/><path d="M31 19V49M16 34H46M20 23L42 45M20 45L42 23" stroke="#fff0cf"/><path d="M30 13Q35 3 46 7Q40 16 30 13" fill="#71997c"/>',
    berry: '<path d="M21 19L16 9L30 15L39 7L39 20" fill="#749979"/><circle cx="23" cy="29" r="11"/><circle cx="39" cy="28" r="11"/><circle cx="17" cy="42" r="10"/><circle cx="33" cy="42" r="12"/><circle cx="47" cy="40" r="9"/><path d="M19 24L23 23M29 38L33 37" stroke="#ffe5ec" stroke-width="3"/>',
    mint: '<path d="M31 54V18M30 39Q4 39 10 15Q32 17 30 39ZM32 29Q31 6 54 9Q53 33 32 29Z"/><path d="M15 21L30 39M48 15L33 29" stroke="#e5f2db" stroke-width="2"/>',
    ginger: '<path d="M10 41Q7 30 19 29L23 17Q28 10 34 16L34 27L44 23Q55 22 54 32L44 38L49 46Q51 55 41 54L29 44L21 49Q11 52 10 41Z"/><path d="M21 30L27 34M34 27L37 33M28 41L32 37" stroke="#f4dfb3" stroke-width="2"/>',
    coffee: '<ellipse cx="23" cy="30" rx="12" ry="20" transform="rotate(28 23 30)"/><ellipse cx="43" cy="39" rx="10" ry="16" transform="rotate(-20 43 39)"/><path d="M31 13Q17 24 18 46M39 25Q48 35 47 51" fill="none" stroke="#ead3b7" stroke-width="2"/>',
    coconut: '<path d="M8 29Q30 7 54 28L51 44Q29 63 12 44Z" fill="#997955"/><ellipse cx="31" cy="29" rx="23" ry="14" fill="#fff4df"/><ellipse cx="31" cy="29" rx="17" ry="8" fill="#dfd9bd"/><path d="M15 41L19 46M41 48L46 43" stroke="#c9a476" stroke-width="2"/>',
    chocolate: '<path d="M17 11H49V53H17Z"/><path d="M20 14H30V29H20ZM35 14H46V29H35ZM20 34H30V49H20ZM35 34H46V49H35Z" fill="#b99388"/><path d="M8 42L21 35L37 59H16Z" fill="#d9bf94"/>',
    smoky: '<path d="M17 45L46 52M19 52L46 42" fill="none" stroke="#a88062" stroke-width="5"/><path d="M25 39C9 26 42 25 26 10M39 39C23 25 54 22 39 7" fill="none" stroke-width="4" stroke-linecap="round"/>',
  };
  const notes = { lemon: "酸香", orange: "甜润果香", berry: "酸甜浆果", mint: "清凉草本", ginger: "辛香", coffee: "烘焙微苦", coconut: "柔滑奶香", chocolate: "浓郁可可", smoky: "木质烟香" };
  function icon(key) {
    return `<svg viewBox="0 0 64 64" aria-hidden="true" fill="${T.palette[key][1]}" stroke="${T.palette[key][1]}" stroke-width="1.5" stroke-linejoin="round">${drawings[key]}</svg>`;
  }
  function scene(keys, filled = keys.length > 0) {
    const rgb = [0, 2, 4].map(offset => keys.length ? Math.round(keys.reduce((sum,k) => sum + parseInt(T.palette[k][1].slice(offset + 1, offset + 3),16), 0) / keys.length) : 200);
    const color = keys.length ? `#${rgb.map(n => n.toString(16).padStart(2,"0")).join("")}` : "#a7ba94";
    return `<div class="palette-scene"><div class="palette-coaster"></div><div class="palette-glass">${BarArt.glass("coupe", color, { garnish: "none", level: filled ? Math.min(.8,.35 + keys.length * .05) : 0 })}</div><div class="palette-drops" aria-hidden="true">${keys.map((k,i) => `<span style="--drop:${i};--flavor:${T.palette[k][1]}">${icon(k)}</span>`).join("")}</div></div>`;
  }
  function wheel(vector) {
    const point = (i,r) => [160 + Math.sin(i * Math.PI / 4) * r, 143 - Math.cos(i * Math.PI / 4) * r];
    const polygon = scale => vector.map((v,i) => point(i, scale === null ? 20 + v * .72 : scale).join(",")).join(" ");
    return `<svg class="flavor-wheel" viewBox="0 0 320 290" role="img" aria-label="${e(T.dimensions.map((d,i)=>`${d} ${vector[i]}`).join('，'))}">${[32,62,92].map(r=>`<polygon points="${polygon(r)}" class="wheel-grid"/>`).join("")}${vector.map((v,i)=>`<line x1="160" y1="143" x2="${point(i,92)[0]}" y2="${point(i,92)[1]}" class="wheel-grid"/>`).join("")}<polygon points="${polygon(null)}" class="wheel-shape"/>${vector.map((v,i)=>{const [x,y]=point(i,119),[px,py]=point(i,20+v*.72);return `<circle cx="${px}" cy="${py}" r="3" class="wheel-dot"/><text x="${x}" y="${y-4}" text-anchor="middle">${T.dimensions[i]}<tspan x="${x}" dy="17" class="wheel-value">${v}</tspan></text>`;}).join("")}</svg>`;
  }
  function summary(taste, user) {
    const keys = taste.onboarding?.palette || taste.onboarding?.flavors || [];
    return `<div class="dna-portrait">${scene(keys,user.ready)}<div class="palette-tags">${keys.map(k=>`<span style="--flavor:${T.palette[k][1]}">${e(T.palette[k][0])}</span>`).join("")}</div><p>${e(user.description)}</p></div>`;
  }
  function mount(root, { taste, onSave, onCancel }) {
    const old = taste.onboarding;
    const selected = new Set(old?.palette || old?.flavors || []);
    let strength = old?.strength || (T.initial(old)[3] < 35 ? "light" : T.initial(old)[3] >= 65 ? "bold" : "balanced");
    root.innerHTML = `<section class="palette-workbench"><div class="palette-preview"><span class="palette-caption">风味预览</span><div id="palette-scene"></div><div id="palette-picked" class="palette-tags" aria-live="polite"></div><div id="palette-wheel"></div></div><div class="palette-controls"><div class="palette-heading"><h2>风味调色盘</h2><p class="muted small">点选喜欢的味道，再点一次移除</p></div><div class="flavor-palette" role="group" aria-label="喜欢的风味">${Object.keys(T.palette).map(k=>`<button type="button" class="flavor-token" data-flavor="${k}" aria-pressed="${selected.has(k)}" style="--flavor:${T.palette[k][1]}"><span class="flavor-icon">${icon(k)}</span><strong>${e(T.palette[k][0])}</strong><small>${notes[k]}</small><span class="flavor-tick" aria-hidden="true">✓</span></button>`).join("")}</div>${BarChoices.render({ id:"palette-strength", label:"酒感", options:Object.fromEntries(Object.entries(T.strengths).map(([k,[name]])=>[k,name])), value:strength })}<div class="palette-actions"><button class="primary" id="palette-save">保存搭配</button><button class="text-button" id="palette-cancel">${T.dna(taste).ready ? "取消" : "先看配方"}</button></div></div></section>`;
    function update() {
      const keys = [...selected], onboarding = { palette: keys, strength };
      root.querySelectorAll("[data-flavor]").forEach(button => button.setAttribute("aria-pressed", selected.has(button.dataset.flavor)));
      root.querySelector("#palette-scene").innerHTML = scene(keys);
      root.querySelector("#palette-picked").innerHTML = keys.length ? keys.map(k=>`<span style="--flavor:${T.palette[k][1]}">${e(T.palette[k][0])}</span>`).join("") : '<span class="palette-placeholder">尚未选择风味</span>';
      root.querySelector("#palette-wheel").innerHTML = keys.length ? wheel(T.dna({ ...taste, onboarding }).vector) : '<div class="palette-empty-wheel" aria-hidden="true"><span>甜</span><span>酸</span><span>苦</span><span>香</span></div>';
      root.querySelector("#palette-save").disabled = !keys.length;
    }
    root.querySelectorAll("[data-flavor]").forEach(button => {
      button.onclick = () => { const key = button.dataset.flavor; selected.has(key) ? selected.delete(key) : selected.add(key); update(); };
    });
    root.querySelector("#palette-strength").onchange = event => { strength = event.target.value; update(); };
    root.querySelector("#palette-save").onclick = () => { if(selected.size) onSave({ palette: [...selected], strength }); };
    root.querySelector("#palette-cancel").onclick = onCancel;
    update();
  }
  globalThis.BarTastePalette = { mount, summary, wheel };
})();
