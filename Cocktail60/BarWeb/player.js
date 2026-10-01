(() => {
  const { html: localHTML, t: localText } = globalThis.BarI18n || { html: s => s, t: s => s };
  const { escape: e, bottle, glass, vessel, rim } = BarArt;
  const labels = {
    pour: "量取与倒入",
    ice: "加入冰块",
    shake: "摇匀",
    stir: "搅拌",
    strain: "过滤入杯",
    serve: "倒入酒杯",
    top: "补入饮料",
    garnish: "装饰",
    muddle: "轻压",
    blend: "搅打",
    float: "漂浮分层",
    rinse: "润洗酒杯",
    prepare: "准备材料",
    method: "原方提示",
  };
  const vessels = {
    shaker: "摇壶",
    mixing: "调酒杯",
    glass: "最终酒杯",
    blender: "搅拌机",
    counter: "备料区",
  };
  const { glassNames, drinkAppearance } = BarCore;
  let timer,
    wakeLock,
    active = false,
    playing = false,
    index = 0,
    delay = 8,
    speech = false,
    complete = false;
  let current, steps, stock, selectedGlass, selectedColor, root, onFinish;
  let recorded = false;
  let selectedVisual = {}, lookMode = 'recipe';
  let renderedIce = false;
  function stop() {
    active = false;
    playing = false;
    clearTimeout(timer);
    window.speechSynthesis?.cancel();
    wakeLock?.release();
    wakeLock = null;
  }
  function guide(recipe) {
    if (recipe.steps) return recipe.steps;
    return [
      ...recipe.parts
        .filter((p) => !p.substitution)
        .map((p) => ({
          action: "prepare",
          ingredient: p,
          tool: "量酒器 / 备料碟",
          target: "counter",
          hint: `${localText('备好')} ${p.raw}${localText('，先不要混合')}${p.optional ? localText("；此项可选") : ""}.`,
        })),
      {
        action: "method",
        target: "glass",
        tool: "按原配方选择",
        hint: recipe.method + (recipe.note ? ` ${recipe.note}` : ""),
      },
    ];
  }
  function mount(node, recipe, inventory, finish, { paused = false } = {}) {
    stop();
    active = true;
    index = 0;
    complete = false;
    recorded = false;
    current = recipe;
    steps = guide(recipe);
    stock = inventory;
    root = node;
    onFinish = finish;
    const appearance = drinkAppearance(recipe);
    selectedGlass = appearance.glass;
    selectedColor = appearance.color;
    selectedVisual = appearance.visual || {};
    lookMode = 'recipe';
    playing = !paused;
    render();
    say();
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (!active || !playing || complete) return;
    timer = setTimeout(
      next,
      Math.max(delay, steps[index].duration || 0) * 1000,
    );
  }
  function say() {
    window.speechSynthesis?.cancel();
    if (!speech || !window.speechSynthesis || !playing) return;
    const step = steps[index];
    const utterance = new SpeechSynthesisUtterance(
      `${index + 1}. ${step.ingredient ? BarI18n.recipeText(current, step.ingredient.raw) : localText(labels[step.action])}. ${BarI18n.recipeText(current, step.hint)}`,
    );
    utterance.lang = globalThis.BarI18n?.locale === "en" ? "en-US" : "zh-CN";
    speechSynthesis.speak(utterance);
  }
  function next() {
    if (index < steps.length - 1) {
      index++;
      render();
      say();
      schedule();
    } else {
      complete = true;
      playing = false;
      clearTimeout(timer);
      window.speechSynthesis?.cancel();
      wakeLock?.release();
      wakeLock = null;
      render();
    }
  }
  function contentsAt(steps, index, target) {
    const containers = {};
    let source = "shaker";
    for (const step of steps.slice(0, index + 1)) {
      const content = containers[step.target] ||= { level: 0, ice: false };
      if (["shaker", "mixing", "blender"].includes(step.target)) source = step.target;
      if (step.action === "ice") content.ice = true;
      if (step.action === "blend") content.ice = false;
      if (step.action === "pour") content.level = Math.min(0.7, content.level + 0.18);
      if (step.action === "top" || step.action === "float") content.level = 0.78;
      if (step.action === "strain" || step.action === "serve") {
        content.level = 0.65;
        if (step.action === "serve") content.ice ||= containers[step.source || source]?.ice || false;
      }
    }
    return containers[target] || { level: 0, ice: false };
  }
  function visualAt(visual, steps, index, target, complete = false) {
    const result = { ...visual };
    if (target !== 'glass' || (!complete && visual.layerPart && !steps.slice(0,index+1).some(s =>
      ['pour','float','top'].includes(s.action) && s.ingredient?.raw.includes(visual.layerPart)))) delete result.layers;
    if (!complete && !steps.slice(0,index+1).some(s => s.action === 'shake')) result.foam = false;
    return result;
  }
  function render() {
    const restoreChoices = BarChoices.remember(root);
    const step = steps[index];
    const target = complete || step.target === "counter" ? "glass" : step.target;
    const content = contentsAt(steps, index, target);
    if (complete && !current.steps) content.level = 0.7;
    const visual = visualAt(selectedVisual, steps, index, target, complete);
    const appearance = { ...visual, ...content, color: selectedColor,
      animateIce: playing && !complete && step.action === "ice",
      garnish: complete || step.action === "garnish" ? selectedVisual.garnish || 'none' : false };
    renderedIce = appearance.animateIce;
    const targetName = target === "glass" ? glassNames[selectedGlass] : vessels[target];
    const targetRim = rim(target === "glass" ? selectedGlass : target);
    const item =
      step.ingredient &&
      stock.find((i) =>
        step.ingredient.types.some((t) => BarCore.satisfies(i.type, t)),
      );
    const source = item || {
      color: current.accentHex,
      name: step.ingredient?.types.join(" / "),
    };
    root.innerHTML = localHTML(`<div class="player-top"><div><span class="eyebrow">FOLLOW ALONG · ${current.steps ? "动画跟做" : "备料与原方引导"}</span><h1 translate="no">${e(BarI18n.name(current))}</h1><p>${BarI18n.locale === "en" ? "" : e(current.englishName) + " · "}原方杯型：${e(current.glass)}</p></div><button data-player="exit" class="secondary">退出跟做</button></div>
      <div class="player-layout"><section class="stage-panel"><div class="stage ${playing ? "" : "paused"} ${complete ? "completed" : ""} action-${e(step.action)}" style="--target-rim:${targetRim}px;--drink-color:${selectedColor}" role="img" aria-label="${complete ? `调制完成 · ${e(glassNames[selectedGlass])}` : `${e(labels[step.action])} → ${e(targetName)}：${e(step.ingredient?.raw || step.hint)}`}">
      <span class="stage-label">${complete ? "调制完成" : e(labels[step.action])}</span>
      <div class="source-object">${
        ["strain", "serve"].includes(step.action)
          ? vessel(
              step.source ||
                steps
                  .slice(0, index)
                  .reverse()
                  .find((s) =>
                    ["shaker", "mixing", "blender"].includes(s.target),
                  )?.target ||
                "shaker", { color: selectedColor, level: 0.65 },
            )
          : bottle(source)
      }</div><div class="liquid-stream"></div><div class="spoon"></div>
      <div class="target-object">${target === "glass" ? glass(selectedGlass, selectedColor, appearance) : vessel(target, appearance)}</div>
      ${!complete && !["glass", "counter"].includes(step.target) ? `<div class="waiting-glass">${glass(selectedGlass, selectedColor, { level: 0, garnish: false })}<small>${e(glassNames[selectedGlass])}</small></div>` : ""}
      <span class="stage-floor">${complete ? e(glassNames[selectedGlass]) : `${item ? `你的「<span translate="no">${e(item.name)}</span>」` : e(source.name || step.tool)} → ${e(targetName)}`}</span></div>
      ${BarChoices.glasses({ id: "player-glass", label: "最终杯型", value: selectedGlass, color: selectedColor, visual: selectedVisual })}${BarChoices.render({ id: "player-look", label: "外观", options: { recipe: "配方外观", plain: "纯色" }, value: lookMode })}<label class="glass-select drink-color">酒液颜色 <input type="color" id="player-color" value="${selectedColor}"></label></section>
      <section class="step-panel" aria-live="polite"><div class="step-count">STEP ${String(index + 1).padStart(2, "0")} <span>/ ${String(steps.length).padStart(2, "0")}</span></div><progress value="${complete ? steps.length : index + 1}" max="${steps.length}"></progress><h2>${complete ? "这一杯，完成了。" : e(labels[step.action])}</h2><div class="amount" translate="no">${complete ? "" : e(step.ingredient ? BarI18n.recipeText(current, step.ingredient.raw) : localText(step.duration ? `${step.duration} 秒` : step.tool))}</div><p class="step-hint" translate="no">${complete ? "" : e(BarI18n.recipeText(current, step.hint))}</p><p class="muted">器具：${e(step.tool)} · 目标：${e(targetName)}</p><div class="next-step">${index < steps.length - 1 ? `接下来 · ${e(steps[index + 1].ingredient?.raw || labels[steps[index + 1].action])}` : "最后一步 · 完成后记录这一杯"}</div>
      <div class="play-controls"><button data-player="prev" class="secondary" ${index === 0 ? "disabled" : ""}>上一步</button><button data-player="toggle" class="primary">${complete ? "重新播放" : playing ? "Ⅱ 暂停" : "▶ 继续"}</button><button data-player="next" class="secondary" ${complete ? "disabled" : ""}>${index === steps.length - 1 ? "完成" : "下一步"}</button></div>
      ${complete ? `<button data-player="record" class="primary wide" ${recorded ? "disabled" : ""}>${recorded ? "已加入饮酒日记" : "一键加入饮酒日记"}</button>` : ""}
      <div class="play-options"><label>每步等待 <select id="player-delay">${[5, 8, 15, 30, 60].map((s) => `<option value="${s}" ${delay === s ? "selected" : ""}>${s} 秒</option>`).join("")}</select></label><label><input type="checkbox" id="player-speech" ${speech ? "checked" : ""} ${!window.speechSynthesis ? "disabled" : ""}> 语音提示</label><button class="text-button" data-player="wake">${wakeLock ? "已保持常亮" : "保持屏幕常亮"}</button><p id="wake-status" class="small" role="status"></p></div></section></div>`);
    restoreChoices();
    root.querySelectorAll("[data-player]").forEach(
      (button) =>
        (button.onclick = async () => {
          const action = button.dataset.player;
          if (action === "exit") {
            stop();
            location.hash = `recipe/${current.id}`;
          }
          if (action === "prev") {
            complete = false;
            index = Math.max(0, index - 1);
            render();
            say();
            schedule();
          }
          if (action === "next") next();
          if (action === "toggle") {
            if (complete) {
              active = true;
              index = 0;
              complete = false;
              recorded = false;
              playing = true;
              render();
            } else {
              playing = !playing;
              if (playing && step.action === "ice" && !renderedIce) render();
              else {
                root.querySelector(".stage").classList.toggle("paused", !playing);
                button.textContent = localText(playing ? "Ⅱ 暂停" : "▶ 继续");
              }
            }
            if (!playing) window.speechSynthesis?.cancel();
            if (playing) say();
            schedule();
          }
          if (action === "record") {
            if (!complete || recorded) return;
            recorded = true;
            if (onFinish(current, { glass: selectedGlass, color: selectedColor, visual: selectedVisual }) === true) {
              stop();
              button.disabled = true;
              button.textContent = localText("已加入饮酒日记");
            } else {
              recorded = false;
            }
          }
          if (action === "wake") {
            try {
              if (!navigator.wakeLock) throw new Error();
              wakeLock = await navigator.wakeLock.request("screen");
              button.textContent = localText("已保持常亮");
            } catch {
              root.querySelector("#wake-status").textContent =
                localText("当前环境不支持常亮，可在系统设置中延长锁屏时间。");
            }
          }
        }),
    );
    root.querySelector("#player-glass").onchange = (event) => {
      selectedGlass = event.target.value;
      render();
    };
    root.querySelector("#player-delay").onchange = (event) => {
      delay = Number(event.target.value);
      schedule();
    };
    root.querySelector("#player-color").onchange = (event) => {
      selectedColor = drinkAppearance(current, { color: event.target.value }).color;
      selectedVisual = { ...selectedVisual, layers: undefined };
      lookMode = "plain";
      render();
    };
    root.querySelector("#player-look").onchange = event => {
      lookMode = event.target.value;
      const original = drinkAppearance(current);
      selectedVisual = lookMode === 'recipe' ? original.visual || {} : { garnish: 'none' };
      if (lookMode === 'recipe') selectedColor = original.color;
      render();
    };
    root.querySelector("#player-speech").onchange = (event) => {
      speech = event.target.checked;
      say();
    };
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && active) {
      playing = false;
      clearTimeout(timer);
      window.speechSynthesis?.cancel();
      root.querySelector(".stage").classList.add("paused");
      root.querySelector('[data-player="toggle"]').textContent = localText("▶ 继续");
    }
  });
  window.addEventListener("pagehide", stop);
  globalThis.BarPlayer = { mount, stop, guide, contentsAt, visualAt };
})();
