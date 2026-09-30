(() => {
  const { escape: e, bottle, glass } = BarArt;
  const { categories, match, ingredient, category, blankState, validateState } =
    BarCore;
  const key = "drinkdrinkdrunk.bar.v1";
  const catalog = BarData.catalog;
  const host = window.barHost || {};
  let state = blankState(),
    storageError = "",
    locked = false;
  try {
    const raw = host.state || localStorage.getItem(key);
    if (raw)
      state = validateState(typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch {
    storageError =
      "本地数据无法读取，已停止写入以保护原数据。请先导出原始数据，再导入有效备份。";
    locked = true;
  }
  if (!state.migrated && !locked) {
    let legacy = host.legacyLiquors || [];
    try {
      if (!legacy.length)
        legacy = JSON.parse(localStorage.getItem("myOwnedLiquors") || "[]");
    } catch {
      /* Keep the legacy key untouched. */
    }
    if (Array.isArray(legacy))
      state.inventory.push(...BarCore.migrate(legacy, catalog));
    if (Array.isArray(host.favorites)) state.favorites = host.favorites;
    state.migrated = true;
  }
  // Native favorites may have changed since the previous sheet was closed.
  if (!locked && Array.isArray(host.favorites))
    state.favorites = host.favorites;
  let page = "discover",
    query = "",
    base = "",
    limit = "all",
    scope = Object.keys(categories),
    collection = "all";
  let tasteSort = "match";
  let modalReturnFocus, toastTimer;
  const app = document.querySelector("#app"),
    modal = document.querySelector("#modal");
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  let journalDate = today();
  let journalMonth = journalDate.slice(0, 7);
  function selectJournalDate(date) {
    journalDate = date;
    journalMonth = date.slice(0, 7);
  }
  function recipes() {
    const all = [
      ...BarData.recipes,
      ...(host.recipes || []).filter((r) => r.isUserCreated),
      ...state.customRecipes,
    ];
    return [
      ...new Map(
        all.map((r) => [
          r.id,
          { ...r, parts: r.parts || r.ingredients.map(ingredient) },
        ]),
      ).values(),
    ];
  }
  function toast(message) {
    const node = document.querySelector("#toast");
    node.textContent = message;
    node.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("visible"), 4200);
  }
  function save(next = state) {
    if (locked) {
      toast(storageError);
      return false;
    }
    try {
      next = validateState(next);
      const serialized = JSON.stringify(next);
      if (serialized.length > 3800000) { toast('本地数据已接近容量上限，请先导出备份，再减少日记照片。原记录未更改。'); return false; }
      localStorage.setItem(key, serialized);
      window.webkit?.messageHandlers?.barState?.postMessage(
        JSON.stringify(next),
      );
      state = next;
      return true;
    } catch {
      toast("保存失败：存储空间不足或数据格式不正确。请先备份，内容尚未保存。");
      return false;
    }
  }
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
  }
  function badge(r) {
    const m = match(r, state.inventory, scope);
    if (!m.checked) return '<span class="availability">尚未选择检查类别</span>';
    return `<span class="availability ${m.count ? "missing" : ""}">${m.count ? `缺 ${m.count} 项 · ${e(m.missing.map((p) => p.types.join(" / ")).join("、"))}` : scope.length === Object.keys(categories).length ? "所列必需材料齐全" : "所检查材料齐全"}</span>`;
  }
  function shell() {
    app.innerHTML = `<aside class="sidebar"><a class="brand" href="#discover"><img src="icon.svg" alt=""/><span>大喝特喝<small>DRINK, DRINK, DRUNK</small></span></a><span class="nav-caption">你的居家调酒手册</span><nav aria-label="主要导航">${[
      ["discover", "◈", "发现配方"],
      ["bar", "▥", "我的吧台"],
      ["favorites", "♡", "我的收藏"],
      ["journal", "▤", "饮酒日记"],
      ["dna", "✦", "口味 DNA"],
    ]
      .map(
        ([id, icon, label]) =>
          `<a href="#${id}" class="${page === id ? "active" : ""}" ${page === id ? 'aria-current="page"' : ""}><span>${icon}</span>${label}${id === "bar" ? `<b>${state.inventory.length}</b>` : ""}</a>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><div class="tiny-bottles">${bottle({ color: "#b87b5d", shape: "round" })}${bottle({ color: "#8da88b" })}${bottle({ color: "#b3c6cd", shape: "carton" })}</div><a href="#settings">设置与数据备份 ↗</a></div></aside><div class="workspace"><header class="topbar"><span>MY LITTLE HOME BAR <span class="topbar-dot">●</span></span><div class="topbar-actions"><a href="#settings" class="text-button" aria-label="设置与备份">⚙</a><button class="secondary small" data-action="add-recipe">＋ 自建配方</button></div></header><main id="main" tabindex="-1"></main><footer><span>请适量饮用 · 饮酒后勿驾驶</span></footer></div>`;
  }
  function route() {
    BarPlayer.stop();
    const [section = "discover", id] = location.hash.slice(1).split("/");
    page = ["bar", "favorites", "journal", "settings", "dna"].includes(section)
      ? section
      : "discover";
    shell();
    const main = document.querySelector("#main");
    if (section === "recipe" || section === "follow") {
      const recipe = recipes().find((r) => r.id === id);
      if (!recipe) {
        main.innerHTML =
          '<h1>未找到这个配方</h1><a href="#discover">返回配方库</a>';
        return;
      }
      if (section === "follow")
        BarPlayer.mount(main, recipe, state.inventory, (r, appearance) => {
          const entry = {
            id: uid(), date: today(), name: r.chineseName, note: "",
            recipeID: r.id, ...appearance,
          };
          if (!save({ ...state, logs: [...state.logs, entry] })) return false;
          selectJournalDate(entry.date);
          location.hash = "journal";
          toast("已加入饮酒日记，杯型和颜色一起保存了。可以随时补充备注。");
          return true;
        });
      else detail(recipe);
    } else if (page === "bar") renderBar();
    else if (page === "journal") renderJournal();
    else if (page === "settings") settings();
    else if (page === "dna") tasteUI.renderDna();
    else if (section === "compare") tasteUI.compare(id);
    else discover();
    window.scrollTo(0, 0);
  }
  function discover() {
    document.querySelector("#main").innerHTML =
      `<section class="hero"><div class="hero-copy"><h1>${page === "favorites" ? "我的收藏" : "配方库"}</h1><a class="primary" href="#bar">整理我的吧台 <span>↗</span></a><div class="hero-stats"><span><b>${recipes().length}</b> 款配方</span><span><b>${state.inventory.length}</b> 件吧台材料</span><span><b id="favorite-count">${state.favorites.length}</b> 款收藏</span></div></div><div class="hero-art"><span class="spark one">✦</span><span class="spark two">✧</span><div class="hero-bottle">${bottle({ color: "#95ac8c", shape: "round" })}</div><div class="hero-glass">${glass("coupe", "#e5a365")}</div></div></section>
      <section class="discovery"><div class="section-heading"><div><h2>${page === "favorites" ? "我的收藏" : "配方列表"}</h2></div><div class="search-wrap"><span>⌕</span><input id="search" type="search" placeholder="搜索酒名、基酒、材料…" aria-label="搜索配方" value="${e(query)}"></div></div>
      <div class="filter-row" aria-label="基酒筛选">${["", "金酒", "伏特加", "朗姆", "威士忌", "龙舌兰", "白兰地"].map((v) => `<button class="chip ${base === v ? "selected" : ""}" data-base="${v}" aria-pressed="${base === v}">${v || "全部配方"}</button>`).join("")}<button class="chip ${collection === "mine" ? "selected" : ""}" data-action="mine">我的配方</button><button class="chip ${collection === "guided" ? "selected" : ""}" data-action="guided">动画跟做</button><button class="chip ${collection === "researched" ? "selected" : ""}" data-action="researched">新增 IBA 精选</button></div>
      <div class="inventory-filter"><div><strong>按我的材料找酒</strong><span class="muted small">按所选材料检查 · 可选配料不计缺项</span></div><div class="match-options">${[
        ["all", "不限"],
        ["0", "缺 0 项"],
        ["1", "最多缺 1 项"],
        ["2", "最多缺 2 项"],
      ]
        .map(
          ([v, l]) =>
            `<button data-limit="${v}" class="chip ${limit === v ? "selected" : ""}" aria-pressed="${limit === v}">${l}</button>`,
        )
        .join("")}</div><div class="category-checks">${Object.entries(
        categories,
      )
        .map(
          ([k, v]) =>
            `<label><input type="checkbox" data-scope="${k}" ${scope.includes(k) ? "checked" : ""}> ${v}</label>`,
        )
        .join("")}</div></div>
      <div class="result-heading"><span id="result-count" role="status"></span><span class="muted small">${scope.length === 5 ? "检查配方所列材料；冰块、方法中的装饰请另外备妥" : "未检查的类别不代表已经拥有"}</span></div><div id="recipe-grid" class="recipe-grid"></div></section>`;
    if(page === "discover") {
      document.querySelector(".hero").insertAdjacentHTML("afterend", tasteUI.welcome() + '<div id="taste-recommendations"></div>');
      document.querySelector(".hero-copy > .primary").outerHTML = tasteUI.current().ready
        ? '<a class="primary" href="#dna">我的口味 DNA ↗</a>'
        : '<button class="primary" data-taste-onboard>口味小测</button>';
    }
    document.querySelector(".result-heading").insertAdjacentHTML("beforebegin", `<div class="taste-sort-row"><label>配方排序 <select id="taste-sort"><option value="match" ${tasteSort==="match"?"selected":""}>按我的口味匹配</option><option value="original" ${tasteSort==="original"?"selected":""}>原有顺序</option></select></label><a class="text-button" href="#compare">比较两杯 ↗</a></div>`);
    document.querySelector("#taste-sort").onchange=event=>{tasteSort=event.target.value;renderCards();};
    renderCards();
    document.querySelector("#search").oninput = (event) => {
      query = event.target.value;
      renderCards();
    };
  }
  function renderCards() {
    const user = tasteUI.current();
    const count = document.querySelector("#favorite-count");
    if (count) count.textContent = state.favorites.length;
    const q = query.trim().toLowerCase();
    const list = recipes().filter(
      (r) =>
        (page !== "favorites" || state.favorites.includes(r.id)) &&
        (!base || r.tags.includes(base)) &&
        (collection !== "mine" || r.isUserCreated) &&
        (collection !== "guided" || r.steps) &&
        (collection !== "researched" || r.source) &&
        `${r.chineseName} ${r.englishName} ${r.ingredients.join(" ")} ${r.tags.join(" ")}`
          .toLowerCase()
          .includes(q) &&
        (limit === "all" ||
          (scope.length &&
            match(r, state.inventory, scope).count <= Number(limit))),
    );
    if(tasteSort === "match" && user.ready) list.sort((a,b)=>{
      const pa=BarTaste.profile(a),pb=BarTaste.profile(b);
      return (pb.unknown.length?-1:BarTaste.score(pb.vector,user.vector)) - (pa.unknown.length?-1:BarTaste.score(pa.vector,user.vector)) || a.id.localeCompare(b.id);
    });
    const suggestions=document.querySelector("#taste-recommendations");
    if(suggestions) suggestions.innerHTML=tasteUI.recommendations(list);
    document.querySelector("#result-count").textContent =
      `${list.length} 款配方`;
    document.querySelector("#recipe-grid").innerHTML = list.length
      ? list
          .map(
            (r, index) =>
              `<article class="recipe-card"><a href="#recipe/${e(r.id)}" class="recipe-visual palette-${index % 4}" aria-label="查看${e(r.chineseName)}"><span class="card-number">NO. ${String(BarData.recipes.findIndex((x) => x.id === r.id) + 1 || index + 1).padStart(3, "0")}</span>${BarArt.drink(r)}<span class="visual-tag">${r.steps ? "动画跟做" : e(r.baseSummary || r.tags[0] || "我的配方")}</span></a><button class="favorite ${state.favorites.includes(r.id) ? "saved" : ""}" data-favorite="${e(r.id)}" aria-label="${state.favorites.includes(r.id) ? "取消收藏" : "收藏"}${e(r.chineseName)}" aria-pressed="${state.favorites.includes(r.id)}">${state.favorites.includes(r.id) ? "♥" : "♡"}</button><div class="recipe-copy"><a href="#recipe/${e(r.id)}"><h3>${e(r.chineseName)}</h3><p class="english">${e(r.englishName)}</p></a><div class="recipe-tags">${r.tags
                .slice(0, 3)
                .map((t) => `<span>${e(t)}</span>`)
                .join("")}</div>${tasteUI.card(r,user)}${badge(r)}</div></article>`,
          )
          .join("")
      : `<div class="empty"><span>◇</span><h3>${page === "favorites" ? "收藏夹还在等第一杯" : "还没有找到合适的配方"}</h3><p>试试调整搜索、检查类别或缺项上限。</p><button class="secondary" data-action="reset-filters">重置筛选</button></div>`;
  }
  function renderBar() {
    const groups = Object.keys(categories).map((key) => [
      key,
      state.inventory.filter((i) => i.type && category(i.type) === key),
    ]);
    if (state.inventory.some((i) => !i.type))
      groups.push(["unmapped", state.inventory.filter((i) => !i.type)]);
    document.querySelector("#main").innerHTML =
      `<div class="page-heading"><div><h1>我的吧台</h1></div><button class="primary" data-action="add-item">＋ 登记材料</button></div><div class="bar-room"><div class="bar-sign"><span>EST. AT HOME</span><b>AFTER HOURS</b><span>YOUR LITTLE COCKTAIL CLUB</span></div><div class="bar-intro"><div><b>${state.inventory.length}</b> 件材料 · ${new Set(state.inventory.map((i) => i.type).filter(Boolean)).size} 种标准类型<p class="muted">名字和外观由你决定，配方按标准类型匹配。</p></div><a class="secondary" href="#discover">看看能调什么 ↗</a></div>${
        state.inventory.length
          ? groups
              .filter(([, items]) => items.length)
              .map(
                ([key, items]) =>
                  `<section class="shelf-section"><div class="section-heading"><h2>${categories[key] || "旧记录 · 请补选标准类型"}</h2><span class="muted">${items.length} 件</span></div><div class="shelf">${items.map((item) => `<button class="stock-item" data-edit-item="${e(item.id)}">${bottle(item)}<strong>${e(item.name)}</strong><small>${e(item.type || "待选择类型")}</small></button>`).join("")}</div></section>`,
              )
              .join("")
          : '<div class="empty bar-empty"><div class="empty-bottle">' +
            bottle({ color: "#b4c2ad" }) +
            '</div><h2>暂无材料</h2><p>先登记家里的一瓶酒、一盒果汁或一罐糖浆。</p><button class="primary" data-action="add-item">登记第一件材料</button></div>'
      }</div>`;
  }
  function detail(r) {
    const full = match(r, state.inventory);
    document.querySelector("#main").innerHTML =
      `<a class="back-link" href="#discover">← 回到配方库</a><div class="detail-layout"><div class="detail-art palette-1">${BarArt.drink(r)}<span>${e(r.glass)}</span></div><section class="detail-copy"><h1>${e(r.chineseName)}</h1><p class="detail-english">${e(r.englishName)}</p><div class="recipe-tags">${r.tags.map((t) => `<span>${e(t)}</span>`).join("")}</div>${tasteUI.detail(r)}<h2>配料</h2><p class="small muted">详情检查全部类别 · ${full.count ? `所列必需材料缺 ${full.count} 项` : "所列必需材料齐全"} · 冰块与方法中的装饰另备</p><ul class="ingredients">${r.parts
        .map((p) => {
          const owned = state.inventory.some((i) =>
            p.types.some((t) => BarCore.satisfies(i.type, t)),
          );
          return `<li class="${!owned && !p.optional ? "not-owned" : ""}"><span>${owned ? "✓" : p.optional ? "○" : "＋"} ${e(p.raw)}</span><small>${p.substitution ? "替代方案" : p.optional ? "可选" : owned ? "已有" : "缺少"}</small></li>`;
        })
        .join(
          "",
        )}</ul>${r.source ? `<p class="recipe-source"><a href="${e(r.source.url)}" target="_blank" rel="noopener noreferrer">${e(r.source.title)} ↗</a></p>` : ""}<p class="small muted">外观为材料与做法示意，品牌、用量和操作会影响实际颜色。</p><h2>做法</h2><p class="method">${e(r.method)}</p>${r.note ? `<p class="notice">${e(r.note)}</p>` : ""}<div class="detail-actions"><a class="primary" href="#follow/${e(r.id)}">▶ 开始跟做</a><button class="secondary" data-favorite="${e(r.id)}">${state.favorites.includes(r.id) ? "♥ 已收藏" : "♡ 收藏"}</button><button class="text-button" data-log-recipe="${e(r.id)}">记一杯</button>${state.customRecipes.some((x) => x.id === r.id) ? `<button class="text-button" data-delete-recipe="${e(r.id)}">删除自建配方</button>` : ""}</div><p class="small muted">${r.steps ? "逐步动作演示 · 可暂停、调速、选择杯型" : "逐项备料 + 完整原方指引；详细动画将逐批补充"}</p></section></div>`;
  }
  function showModal(html) {
    modalReturnFocus = document.activeElement;
    modal.innerHTML = `<button class="modal-close" data-action="close" aria-label="关闭">×</button>${html}`;
    if (!modal.open) modal.showModal();
  }
  function closeModal() {
    modal.close();
    modalReturnFocus?.focus();
  }
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      const b = modal.getBoundingClientRect();
      if (
        event.clientX < b.left ||
        event.clientX > b.right ||
        event.clientY < b.top ||
        event.clientY > b.bottom
      )
        closeModal();
    }
  });
  function openItem(id) {
    const item = state.inventory.find((i) => i.id === id) || {
      id: uid(),
      name: "",
      type: "金酒",
      color: "#79a883",
      shape: "bottle",
      drawing: [],
    };
    let drawing = structuredClone(item.drawing);
    showModal(
      `<form id="item-form"><h2>${id ? "编辑材料" : "登记一件材料"}</h2><div class="item-editor"><div id="bottle-preview">${bottle(item)}</div><div><label>展示名称<input name="name" maxlength="80" required value="${e(item.name)}" placeholder="例如：我的蓝瓶酒"></label><label>标准材料类型<select name="type" required><option value="">请选择标准类型</option>${Object.entries(
        categories,
      )
        .map(
          ([k, v]) =>
            `<optgroup label="${v}">${catalog
              .filter((t) => t.category === k)
              .map(
                (t) =>
                  `<option ${item.type === t.name ? "selected" : ""}>${e(t.name)}</option>`,
              )
              .join("")}</optgroup>`,
        )
        .join(
          "",
        )}</select></label><p class="small muted">配方只按这个类型匹配，与展示名称无关。</p></div></div><div class="form-row"><label>容器造型<select name="shape">${Object.entries(BarCore.bottleShapes)
        .map(
          ([k, v]) =>
            `<option value="${k}" ${item.shape === k ? "selected" : ""}>${v}</option>`,
        )
        .join(
          "",
        )}</select></label><label>容器颜色<input type="color" name="color" value="${item.color}"></label></div><details><summary>亲手画外观 · 标签与瓶身涂鸦</summary><p class="small muted">在画板上拖动绘制，会同时出现在酒架和跟做画面中。</p><canvas id="drawing" width="200" height="200" aria-label="材料外观画板"></canvas><button type="button" class="text-button" id="undo-drawing">撤销一笔</button><button type="button" class="text-button" id="clear-drawing">清空画板</button></details><div class="modal-actions">${id ? `<button type="button" class="danger" data-remove-item="${e(id)}">移除材料</button>` : ""}<button type="button" class="secondary" data-action="close">取消</button><button type="submit" class="primary">保存材料</button></div></form>`,
    );
    const form = document.querySelector("#item-form"),
      canvas = document.querySelector("#drawing"),
      ctx = canvas.getContext("2d");
    const preview = () => {
      document.querySelector("#bottle-preview").innerHTML = bottle({
        color: form.elements.color.value,
        shape: form.elements.shape.value,
        drawing,
      });
    };
    const redraw = () => {
      ctx.clearRect(0, 0, 200, 200);
      ctx.strokeStyle = "#29494d";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const stroke of drawing) {
        ctx.beginPath();
        stroke.forEach(([x, y], i) =>
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
        );
        ctx.stroke();
      }
      preview();
    };
    let stroke;
    const point = (event) => {
      const rect = canvas.getBoundingClientRect();
      return [
        Math.max(
          0,
          Math.min(200, ((event.clientX - rect.left) * 200) / rect.width),
        ),
        Math.max(
          0,
          Math.min(200, ((event.clientY - rect.top) * 200) / rect.height),
        ),
      ];
    };
    canvas.onpointerdown = (event) => {
      if (drawing.length >= 200) return;
      canvas.setPointerCapture(event.pointerId);
      stroke = [point(event)];
      drawing.push(stroke);
      redraw();
    };
    canvas.onpointermove = (event) => {
      if (stroke && stroke.length < 2000) {
        stroke.push(point(event));
        redraw();
      }
    };
    canvas.onpointerup = canvas.onpointercancel = () => {
      stroke = null;
    };
    document.querySelector("#clear-drawing").onclick = () => {
      drawing = [];
      redraw();
    };
    document.querySelector("#undo-drawing").onclick = () => {
      drawing.pop();
      redraw();
    };
    form.elements.color.oninput = preview;
    form.elements.shape.onchange = preview;
    redraw();
    form.onsubmit = (event) => {
      event.preventDefault();
      const name = form.elements.name.value.trim();
      if (!name) return;
      const updated = {
        ...item,
        name,
        type: form.elements.type.value,
        color: form.elements.color.value,
        shape: form.elements.shape.value,
        drawing,
      };
      const inventory = id
        ? state.inventory.map((i) => (i.id === id ? updated : i))
        : [...state.inventory, updated];
      if (save({ ...state, inventory })) {
        closeModal();
        route();
        toast("材料已保存，配方匹配已更新。");
      }
    };
  }
  function openRecipe() {
    showModal(
      `<form id="recipe-form"><h2>记录你的配方</h2><label>中文名称<input name="name" maxlength="80" required></label><label>英文名称（可留空）<input name="english" maxlength="100"></label><label>材料与用量（每行一项）<textarea name="ingredients" rows="5" required placeholder="金酒 45 ml&#10;汤力水 120 ml"></textarea></label><p class="small muted">建议使用吧台中的标准材料名称；未知类型会保留为缺料，不会自动认定已有。</p><label>杯型<input name="glass" required value="高球杯" maxlength="40"></label><label>成品外观<select name="appearance"><option value="plain">自选纯色</option><option value="sunset">下蓝上橙 · 自定义</option></select></label><label>主色<input name="color" type="color" value="#d8ac6d"></label><label>做法<textarea name="method" rows="3" required></textarea></label><div class="modal-actions"><button type="button" class="secondary" data-action="close">取消</button><button class="primary">保存配方</button></div></form>`,
    );
    document.querySelector("#recipe-form").onsubmit = (event) => {
      event.preventDefault();
      const f = event.target.elements;
      const name = f.name.value.trim(),
        method = f.method.value.trim(),
        parts = f.ingredients.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      if (!name || !method || !parts.length) return;
      const r = {
        id: `user-${uid()}`,
        chineseName: name,
        englishName: f.english.value.trim(),
        ingredients: parts,
        tags: ["我的配方"],
        glass: f.glass.value.trim(),
        method,
        note: null,
        accentHex: f.color.value,
        appearance: { color: f.color.value, ...(f.appearance.value === "sunset" ? BarCore.sunsetLook : { garnish: "none" }) },
        isUserCreated: true,
      };
      if (save({ ...state, customRecipes: [...state.customRecipes, r] })) {
        closeModal();
        location.hash = `recipe/${r.id}`;
      }
    };
  }
  function renderJournal() {
    const month = BarCore.journalMonth(journalMonth, state.logs);
    const entries = state.logs.filter(l => l.date === journalDate).reverse();
    const currentDate = today();
    document.querySelector("#main").innerHTML =
      `<div class="page-heading"><div><h1>饮酒日记</h1></div><button class="primary" data-action="log">＋ 记一杯</button></div>
      <section class="journal-calendar" aria-label="饮酒日记月历">
        <div class="calendar-heading"><div><h2 id="calendar-month" aria-live="polite">${month.year} 年 ${month.number} 月</h2><p class="muted small">本月 ${month.count} 条记录</p></div><div class="calendar-controls"><button class="secondary" data-journal-month="${month.previous || ""}" aria-label="上个月" ${month.previous ? "" : "disabled"}>‹</button><button class="secondary" data-action="journal-today">今天</button><button class="secondary" data-journal-month="${month.next || ""}" aria-label="下个月" ${month.next ? "" : "disabled"}>›</button></div></div>
        <div class="calendar-weekdays" aria-hidden="true">${["一", "二", "三", "四", "五", "六", "日"].map(day => `<span>${day}</span>`).join("")}</div>
        <div class="calendar-days">${month.cells.map(day => day ? `
          <button class="calendar-day ${day.entries.length ? "has-entries" : ""}" data-journal-date="${day.date}" aria-pressed="${day.date === journalDate}" ${day.date === currentDate ? 'aria-current="date"' : ""} aria-label="${day.date}，${day.entries.length ? `${day.entries.length} 条记录：${e(day.entries.map(l => l.name).join("、"))}` : "暂无记录"}">
            <span class="calendar-day-number">${day.day}</span><span class="calendar-drinks" aria-hidden="true">${day.entries.slice(-2).map(l => l.glass ? `<span class="calendar-drink">${glass(l.glass, l.color, l.visual || {})}</span>` : '<span class="calendar-legacy">●</span>').join("")}</span>${day.entries.length > 2 ? `<span class="calendar-more">+${day.entries.length - 2}</span>` : ""}
          </button>` : '<span class="calendar-blank" aria-hidden="true"></span>').join("")}</div>
      </section>
      <section class="journal-day-detail" aria-labelledby="journal-day-title"><div class="section-heading"><div><h2 id="journal-day-title" aria-live="polite">${Number(journalDate.slice(5, 7))} 月 ${Number(journalDate.slice(8))} 日${journalDate === currentDate ? " · 今天" : ""}</h2></div><span class="muted small">${entries.length} 条记录</span></div><div class="journal-list">${
        entries.length
          ? entries
              .map(
                (l) =>
                  `<article class="journal-entry"><div class="journal-glass" role="img" aria-label="${l.glass ? `${e(BarCore.glassNames[l.glass])} · 酒液颜色 ${e(l.color)}` : "旧日记未记录外观"}">${l.glass ? glass(l.glass, l.color, l.visual || {}) : '<span class="muted small">未记录外观</span>'}</div><div class="journal-copy"><time>${e(l.date)}</time><h2>${e(l.name)}</h2>${l.glass ? `<span class="muted small">${e(BarCore.glassNames[l.glass])}</span>` : ""}<p>${e(l.note || "未填写备注")}</p>${l.photos?.length ? `<div class="journal-photos">${l.photos.map((p,i)=>`<a href="${p}" download="cocktail-${e(l.date)}-${i+1}.jpg" aria-label="下载日记照片 ${i+1}"><img src="${p}" alt="${e(l.name)}的照片 ${i+1}" loading="lazy"></a>`).join("")}</div>` : ""}</div><div class="journal-actions">${l.recipeID && recipes().some(r=>r.id===l.recipeID) ? tasteUI.rateButton(l.recipeID) : ""}<button class="text-button" data-edit-log="${e(l.id)}" aria-label="编辑${e(l.name)}日记">${l.note ? "编辑" : "补充备注"}</button><button class="text-button" data-delete-log="${e(l.id)}" aria-label="删除${e(l.name)}日记">删除</button></div></article>`,
              )
              .join("")
          : '<div class="calendar-empty"><p>这一天还没有记录</p><span class="muted small">选中日期后，点击“记一杯”添加记录。</span></div>'
      }</div></section>`;
  }
  function openLog(name = "", appearance = {}, entry = null, recipeID = entry?.recipeID) {
    const look = BarCore.drinkAppearance({}, appearance);
    showModal(
      `<form id="log-form"><h2>${entry ? "编辑日记" : "添加日记"}</h2><div id="log-preview" class="log-preview">${glass(look.glass, look.color, look.visual || {})}</div><div class="form-row"><label>杯型<select name="glass">${Object.entries(BarCore.glassNames).map(([k,v]) => `<option value="${k}" ${look.glass === k ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>酒液颜色<input name="color" type="color" value="${look.color}"></label></div><label>外观<select name="visual"><option value="keep">保留当前外观</option><option value="plain">自选纯色</option><option value="sunset">下蓝上橙 · 自定义外观参考</option></select></label><label>日期<input name="date" type="date" min="0001-01-01" max="9999-12-31" value="${e(entry?.date || (page === "journal" ? journalDate : today()))}" required></label><label>酒名<input name="name" required maxlength="100" value="${e(name)}"></label><label>今天的感受<textarea name="note" maxlength="3000" rows="4" placeholder="口味、用量调整或其他备注">${e(entry?.note || "")}</textarea></label><label>这一杯的照片<input type="file" data-photo-input accept="image/jpeg,image/png,image/webp" multiple></label><p class="small muted">最多 3 张，每张原图不超过 12 MB。仅在本机压缩保存，备份包含照片，不保留原图。</p><div class="photo-gallery" data-photo-preview></div><p class="small" data-photo-status role="status"></p><div class="modal-actions"><button type="button" class="secondary" data-action="close">取消</button><button type="submit" class="primary">保存日记</button></div></form>`,
    );
    const form = document.querySelector("#log-form");
    const photos = BarPhotos.mount(form, entry?.photos || []);
    let visual = { ...look.visual };
    const preview = () => {
      document.querySelector("#log-preview").innerHTML = glass(form.elements.glass.value, form.elements.color.value, visual);
    };
    form.elements.glass.onchange = preview;
    form.elements.color.oninput = () => { visual = { ...visual, layers: undefined }; form.elements.visual.value = 'plain'; preview(); };
    form.elements.visual.onchange = () => {
      visual = form.elements.visual.value === 'sunset' ? { ...BarCore.sunsetLook } : form.elements.visual.value === 'keep' ? { ...look.visual } : { ...look.visual, layers: undefined };
      preview();
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      const f = event.target.elements;
      if (!f.name.value.trim() || photos.busy()) return;
      const updated = {
        ...entry,
        id: entry?.id || uid(),
        ...(recipeID ? { recipeID } : {}),
        date: f.date.value,
        name: f.name.value.trim(),
        note: f.note.value.trim(),
        glass: f.glass.value,
        color: f.color.value,
        visual,
        photos: photos.value(),
      };
      const logs = entry ? state.logs.map(l => l.id === entry.id ? updated : l) : [...state.logs, updated];
      if (save({ ...state, logs })) {
        selectJournalDate(updated.date);
        closeModal();
        if (location.hash === "#journal") route();
        else location.hash = "journal";
      }
    };
  }
  function settings() {
    document.querySelector("#main").innerHTML =
      `<div class="page-heading"><div><h1>设置与数据</h1><p>吧台保存在当前设备，备份可以带到另一台设备。</p></div></div>${storageError ? `<p class="notice">${e(storageError)}</p>` : ""}<section class="settings-card"><h2>显示外观</h2><label>主题<select id="theme">${[
        ["system", "跟随系统"],
        ["light", "浅色"],
        ["dark", "深色"],
      ]
        .map(
          ([k, v]) =>
            `<option value="${k}" ${state.theme === k ? "selected" : ""}>${v}</option>`,
        )
        .join(
          "",
        )}</select></label></section><section class="settings-card"><h2>备份与迁移</h2><p>包含新吧台的材料、手绘外观、收藏、自建配方、日记（含压缩照片）和口味 DNA（小测与评价）。不同设备不会自动同步。原 iOS 照片日历和导入内容仍保留在原功能中。</p><div class="detail-actions"><button class="primary" data-action="export">导出备份</button><button class="secondary" data-action="import">导入备份</button></div></section><section class="settings-card"><h2>关于</h2><p>130 款配方均提供步骤与动作演示，新增 10 款 IBA 精选附官方来源；自建配方提供逐项备料和原方指引。所有配方都支持材料检查。</p><p class="muted">新吧台在 iOS、网页与 Mac 使用相同界面和匹配规则。小红书网页导入、系统小组件和照片日历继续由原 iOS App 提供。</p></section>`;
    document.querySelector("#theme").onchange = (event) => {
      if (save({ ...state, theme: event.target.value })) applyTheme();
    };
  }
  function exportBackup() {
    let text = JSON.stringify(state, null, 2);
    if (locked) {
      try {
        text = host.state || localStorage.getItem(key) || text;
      } catch {}
    }
    showModal(
      `<h2>导出吧台备份</h2><p>复制下面内容，在另一台设备的“导入备份”中粘贴。</p><textarea id="backup-text" rows="10" readonly aria-label="备份内容">${e(text)}</textarea><div class="modal-actions"><button class="secondary" id="copy-backup">选择并复制</button>${!window.webkit?.messageHandlers?.barState ? '<button class="primary" id="download-backup">下载 JSON</button>' : ""}</div>`,
    );
    document.querySelector("#copy-backup").onclick = async () => {
      const t = document.querySelector("#backup-text");
      t.select();
      try {
        await navigator.clipboard.writeText(t.value);
        toast("已复制备份。");
      } catch {
        toast("已选中，请使用系统复制操作。");
      }
    };
    document
      .querySelector("#download-backup")
      ?.addEventListener("click", () => {
        const url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `我的吧台-${today()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
  }
  function importBackup() {
    showModal(
      `<form id="import-form"><h2>导入吧台备份</h2><p>导入会替换当前新吧台数据，请先导出当前备份。</p><label>选择备份文件<input type="file" id="backup-file" accept=".json,application/json"></label><label>或粘贴备份内容<textarea id="import-text" rows="8" required maxlength="4000000"></textarea></label><label><input type="checkbox" required> 我已备份当前数据，确认替换</label><p id="import-error" class="error" role="alert"></p><div class="modal-actions"><button class="secondary" type="button" data-action="close">取消</button><button class="primary">确认导入</button></div></form>`,
    );
    document.querySelector("#backup-file").onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 4000000) {
        document.querySelector("#import-error").textContent = "文件超过 4 MB。";
        return;
      }
      document.querySelector("#import-text").value = await file.text();
    };
    document.querySelector("#import-form").onsubmit = (event) => {
      event.preventDefault();
      try {
        const next = validateState(
          JSON.parse(document.querySelector("#import-text").value),
        );
        const wasLocked = locked;
        locked = false;
        if (save(next)) {
          storageError = "";
          closeModal();
          applyTheme();
          route();
          toast("备份已导入。");
        } else locked = wasLocked;
      } catch (error) {
        document.querySelector("#import-error").textContent =
          error instanceof SyntaxError
            ? "JSON 格式不正确，请检查完整内容。"
            : error.message;
      }
    };
  }
  function confirmDelete(message, action) {
    showModal(
      `<h2>${e(message)}</h2><p>删除后可以通过先前导出的备份恢复。</p><div class="modal-actions"><button class="secondary" data-action="close">取消</button><button class="danger" id="confirm-delete">确认删除</button></div>`,
    );
    document.querySelector("#confirm-delete").onclick = () => {
      if (action()) {
        closeModal();
        route();
      }
    };
  }
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    const d = target.dataset;
    if (d.journalDate || d.journalMonth || d.action === "journal-today") {
      selectJournalDate(d.journalDate || (d.journalMonth ? `${d.journalMonth}-01` : today()));
      renderJournal();
      const focus = d.journalDate ? `[data-journal-date="${journalDate}"]`
        : d.journalMonth ? `[aria-label="${target.getAttribute("aria-label")}"]`
        : '[data-action="journal-today"]';
      document.querySelector(focus)?.focus({ preventScroll: true });
    }
    if (d.action === "close") closeModal();
    if (d.action === "add-item") openItem();
    if (d.editItem) openItem(d.editItem);
    if (d.removeItem)
      confirmDelete("移除这件材料？", () =>
        save({
          ...state,
          inventory: state.inventory.filter((i) => i.id !== d.removeItem),
        }),
      );
    if (d.action === "add-recipe") openRecipe();
    if (d.deleteRecipe)
      confirmDelete("删除这个自建配方？", () => {
        if (
          !save({
            ...state,
            customRecipes: state.customRecipes.filter(
              (r) => r.id !== d.deleteRecipe,
            ),
            favorites: state.favorites.filter((id) => id !== d.deleteRecipe),
          })
        )
          return false;
        location.hash = "discover";
        return true;
      });
    if (d.action === "log" || d.log) openLog(d.log || "");
    if (d.logRecipe) {
      const recipe = recipes().find(r => r.id === d.logRecipe);
      if (recipe) openLog(recipe.chineseName, BarCore.drinkAppearance(recipe), null, recipe.id);
    }
    if (d.editLog) {
      const entry = state.logs.find(l => l.id === d.editLog);
      if (entry) openLog(entry.name, entry, entry);
    }
    if (d.deleteLog)
      confirmDelete("删除这条日记？", () =>
        save({
          ...state,
          logs: state.logs.filter((l) => l.id !== d.deleteLog),
        }),
      );
    if (d.favorite) {
      const favorites = state.favorites.includes(d.favorite)
        ? state.favorites.filter((id) => id !== d.favorite)
        : [...state.favorites, d.favorite];
      if (save({ ...state, favorites })) {
        if (document.querySelector("#recipe-grid")) renderCards();
        else detail(recipes().find((r) => r.id === d.favorite));
        toast(favorites.includes(d.favorite) ? "已加入收藏。" : "已取消收藏。");
      }
    }
    if (d.base !== undefined) {
      base = d.base;
      discover();
    }
    if (d.limit !== undefined) {
      limit = d.limit;
      discover();
    }
    if (["mine", "guided", "researched"].includes(d.action)) {
      const v = d.action;
      collection = collection === v ? "all" : v;
      discover();
    }
    if (d.action === "reset-filters") {
      query = "";
      base = "";
      limit = "all";
      scope = Object.keys(categories);
      collection = "all";
      discover();
    }
    if (d.action === "export") exportBackup();
    if (d.action === "import") importBackup();
  });
  document.addEventListener("change", (event) => {
    const category = event.target.dataset.scope;
    if (category) {
      scope = event.target.checked
        ? [...scope, category]
        : scope.filter((c) => c !== category);
      discover();
    }
  });
  window.addEventListener("hashchange", route);
  window.addEventListener("storage", (event) => {
    if (
      event.key === key &&
      !modal.open &&
      !location.hash.startsWith("#follow/")
    ) {
      try {
        state = validateState(JSON.parse(event.newValue));
        applyTheme();
        route();
      } catch {
        toast("另一窗口的数据变动无法读取，请刷新后检查。");
      }
    }
  });
  applyTheme();
  const tasteUI = BarTasteUI.create({ getState:()=>state, getRecipes:recipes, save, showModal, closeModal, toast, refresh:route, badge });
  if (host.route) history.replaceState(null, "", `#${host.route}`);
  route();
  if (storageError) toast(storageError);
  else save();
})();
