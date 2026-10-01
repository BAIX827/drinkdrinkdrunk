(() => {
  const T = BarTaste, { escape:e } = BarArt;
  const ratingNames = { like:"❤️ 喜欢", okay:"😐 还行", dislike:"👎 不喜欢" };
  function bars(vector, compact = false, other = null) {
    const indices = compact ? [0,1,3] : [0,1,2,3,4,5,6,7];
    return `<div class="taste-bars ${compact?"compact":""}">${indices.map(i=>`<div class="taste-bar-row"><span>${T.dimensions[i]}</span><div class="taste-tracks"><div class="taste-track" role="meter" aria-label="${T.dimensions[i]}${other?"，第一组":""}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${vector[i]}"><span style="width:${vector[i]}%"></span></div>${other?`<div class="taste-track alternate" role="meter" aria-label="${T.dimensions[i]}，第二组" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${other[i]}"><span style="width:${other[i]}%"></span></div>`:""}</div>${!compact?`<small>${vector[i]}${other?` / ${other[i]}`:""}</small>`:""}</div>`).join("")}</div>`;
  }
  function create({getState,getRecipes,save,showModal,closeModal,toast,refresh,badge}) {
    let editingPalette = false;
    const current = () => T.dna(getState().taste);
    const rating = id => getState().taste.ratings.find(r=>r.recipeID===id);
    const matchLabel = (profile,user) => profile.unknown.length ? "风味待完善" : user.ready ? `${T.score(profile.vector,user.vector)}% 口味匹配${user.count<3?" · 初步":""}` : "尚未建立口味档案";
    function card(recipe,user=current()) {
      const profile=T.profile(recipe);
      return `<div class="card-taste"><p>${e(T.characteristics(profile.vector).join(" · ")||"轻盈柔和")}</p>${bars(profile.vector,true)}<span class="taste-match">${matchLabel(profile,user)}</span></div>`;
    }
    function rateButton(recipeID) {
      return `<button class="secondary small" data-taste-rate="${e(recipeID)}">${rating(recipeID)?`${ratingNames[rating(recipeID).value]} · 修改评价`:"评价这一杯"}</button>`;
    }
    function detail(recipe) {
      const profile=T.profile(recipe),user=current();
      return `<section class="taste-panel"><h2>风味档案</h2><p class="taste-description">${e(T.describe(profile.vector))}</p><div class="recipe-tags"><span>${e(profile.family)}</span><span>酒感${T.strength(profile.vector)}</span><span>${e(profile.base)}</span></div>${bars(profile.vector)}<p class="taste-match">${matchLabel(profile,user)}</p><p class="small muted">${e(T.explain(profile,user))}</p><div class="detail-actions">${rateButton(recipe.id)}<a class="text-button" href="#compare/${e(recipe.id)}">比较两杯 ↗</a>${user.ready?`<button class="text-button" data-taste-personal="${e(recipe.id)}">与我的 DNA 对比</button>`:'<button class="text-button" data-taste-onboard>风味调色盘</button>'}</div>${profile.unknown.length?`<p class="small muted">未识别材料：${e(profile.unknown.join("、"))}</p>`:""}</section>`;
    }
    function welcome() {
      const user=current();
      return `<div class="dna-discovery-intro"><div><h2>${user.ready?"口味推荐":"口味档案"}</h2><p>${user.ready?e(user.description):"选择风味或评价配方后查看推荐。"}</p></div>${user.ready?'<a class="secondary" href="#dna">查看我的 DNA ↗</a>':'<button class="primary" data-taste-onboard>风味调色盘</button>'}</div>`;
    }
    function recommendations(recipes) {
      const user=current();
      if(!user.ready) return "";
      return `<div class="taste-recommendations">${T.recommend(recipes,getState().taste,user).map(group=>`<section><h3>${group.title}</h3>${group.items.length?group.items.map(x=>`<article class="taste-pick"><a href="#recipe/${e(x.recipe.id)}"><strong>${e(x.recipe.chineseName)}</strong><span class="taste-match">${x.score}% 匹配${user.count<3?" · 初步":""}</span></a><p class="small muted">${e(T.explain(x.profile,user))}</p>${badge(x.recipe)}</article>`).join(""):`<p class="small muted">${group.title==="喜欢的家族"?"暂无喜欢的配方。":"当前筛选下还没有这个范围的配方。"}</p>`}</section>`).join("")}</div>`;
    }
    function renderDna() {
      const user=current(),taste=getState().taste;
      const editing = editingPalette || !user.ready;
      editingPalette = false;
      document.querySelector("#main").innerHTML=`<div class="page-heading"><div><h1>我的口味 DNA</h1></div>${!editing?'<button class="secondary" data-taste-onboard>调整风味</button>':""}</div>
        ${editing?'<div id="dna-palette"></div>':
        `<section class="dna-identity"><div class="dna-summary"><span class="dna-stage">${user.stage}</span>${BarTastePalette.summary(taste,user)}</div><div><h2>我的风味轮廓</h2>${BarTastePalette.wheel(user.vector)}</div></section>
        <div class="dna-stats">${[["喜欢的基酒",user.base],["喜欢的家族",user.family],["偏好酒感",T.strength(user.vector)],["已评价配方",`${user.count} 款`],["探索过的家族",`${user.explored} 类`]].map(([label,value])=>`<div><small>${label}</small><strong>${e(value)}</strong></div>`).join("")}</div>${recommendations(getRecipes())}`}
        <section class="taste-history"><div class="section-heading"><h2>我的口味记录</h2><span class="muted small">${taste.ratings.length} 款</span></div>${taste.ratings.length?[...taste.ratings].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(r=>`<article class="taste-history-row"><div><strong>${e(r.name)}</strong><p class="small muted">${ratingNames[r.value]}${r.feedback.length?` · ${r.feedback.map(k=>T.feedback[k][0]).join("、")}`:""}</p></div><div>${getRecipes().some(x=>x.id===r.recipeID)?`<button class="text-button" data-taste-rate="${e(r.recipeID)}">修改</button>`:""}<button class="text-button" data-taste-remove="${e(r.recipeID)}" aria-label="撤销${e(r.name)}评价">撤销</button></div></article>`).join(""):'<p class="muted">暂无评价</p>'}</section>
        <div class="dna-privacy">${user.ready?'<button class="text-button" data-taste-reset>清除口味档案</button>':""}</div>`;
      if (editing) BarTastePalette.mount(document.querySelector("#dna-palette"), {
        taste,
        onSave: onboarding => {
          const state = getState();
          if (save({ ...state, taste: { ...state.taste, onboarding } })) { refresh(); toast("已保存风味搭配。"); }
        },
        onCancel: () => { if(user.ready) refresh(); else location.hash = "discover"; },
      });
    }
    function onboarding() {
      editingPalette = true;
      if(location.hash === "#dna") refresh(); else location.hash = "dna";
    }
    function openRating(id) {
      const recipe=getRecipes().find(r=>r.id===id); if(!recipe)return;
      const previous=rating(id),profile=T.profile(recipe);
      if(profile.unknown.length) { toast("这款配方还有未识别的材料，风味数据完善后再评价。");return; }
      showModal(`<form id="taste-rating"><h2>评价 · ${e(recipe.chineseName)}</h2><fieldset><legend>你的整体感受</legend><div class="taste-choices">${Object.entries(ratingNames).map(([value,label])=>`<label class="taste-choice"><input type="radio" name="rating" value="${value}" ${previous?.value===value?"checked":""} required><span>${label}</span></label>`).join("")}</div></fieldset><fieldset><legend>具体反馈（可选）</legend><div class="taste-choices">${Object.entries(T.feedback).map(([key,[label]])=>`<label class="taste-choice"><input type="checkbox" name="feedback" value="${key}" ${previous?.feedback.includes(key)?"checked":""}><span>${label}</span></label>`).join("")}</div></fieldset><p class="error" id="taste-rating-error" role="alert"></p><div class="modal-actions"><button type="button" class="secondary" data-action="close">取消</button><button class="primary">保存口味评价</button></div></form>`);
      document.querySelector("#taste-rating").onsubmit=event=>{
        event.preventDefault();const form=new FormData(event.target), feedback=form.getAll("feedback");
        if(feedback.includes("strong")&&feedback.includes("weak")) { document.querySelector("#taste-rating-error").textContent="太烈和太淡，请选择更符合这次感受的一项。";return; }
        const record={recipeID:id,name:recipe.chineseName,value:form.get("rating"),feedback,vector:profile.vector,base:profile.base,family:profile.family,updatedAt:new Date().toISOString()};
        const state=getState();
        if(save({...state,taste:{...state.taste,ratings:[...state.taste.ratings.filter(r=>r.recipeID!==id),record]}})) { closeModal();refresh();toast("已更新你的口味 DNA。"); }
      };
    }
    function personal(id) {
      const recipe=getRecipes().find(r=>r.id===id);if(!recipe)return;
      const profile=T.profile(recipe),user=current();
      showModal(`<h2>我的 DNA ↔ ${e(recipe.chineseName)}</h2><p class="taste-legend"><span>● 我的偏好</span><span>● 这杯的风味</span></p>${bars(user.vector,false,profile.vector)}<p>${e(T.explain(profile,user))}</p>`);
    }
    function compare(id) {
      const recipes=getRecipes();let left=recipes.find(r=>r.id===id)||recipes[0],right=recipes.find(r=>r.id!==left.id)||left;
      const options=selected=>recipes.map(r=>`<option value="${e(r.id)}" ${r.id===selected?"selected":""}>${e(r.chineseName)}</option>`).join("");
      document.querySelector("#main").innerHTML=`<a class="back-link" href="#discover">← 回到发现</a><div class="page-heading"><div><h1>比较两杯</h1><p>看清相似之处，也找到一点新变化。</p></div></div><section class="taste-panel taste-comparison"><div class="form-row"><label>第一杯<select id="taste-left">${options(left.id)}</select></label><label>第二杯<select id="taste-right">${options(right.id)}</select></label></div><div id="taste-comparison-result"></div></section>`;
      const update=()=>{
        left=recipes.find(r=>r.id===document.querySelector("#taste-left").value);
        right=recipes.find(r=>r.id===document.querySelector("#taste-right").value);
        const a=T.profile(left),b=T.profile(right),user=current();
        document.querySelector("#taste-comparison-result").innerHTML=`<div class="taste-compare-head">${[[left,a],[right,b]].map(([r,p])=>`<div><h2>${e(r.chineseName)}</h2><p>${e(T.describe(p.vector))}</p><p class="small muted">${e(p.family)} · ${matchLabel(p,user)}</p><a class="text-button" href="#recipe/${e(r.id)}">查看配方 ↗</a></div>`).join("")}</div><p class="taste-legend"><span>● ${e(left.chineseName)}</span><span>● ${e(right.chineseName)}</span></p>${bars(a.vector,false,b.vector)}${a.unknown.length||b.unknown.length?'<p class="small muted">部分材料未识别。</p>':""}`;
      };
      document.querySelector("#taste-left").onchange=update;document.querySelector("#taste-right").onchange=update;update();
    }
    document.addEventListener("click",event=>{
      const d=event.target.closest("button")?.dataset;if(!d)return;
      if(d.tasteOnboard!==undefined)onboarding();
      if(d.tasteRate)openRating(d.tasteRate);
      if(d.tastePersonal)personal(d.tastePersonal);
      if(d.tasteRemove) {
        const state=getState();
        if(save({...state,taste:{...state.taste,ratings:state.taste.ratings.filter(r=>r.recipeID!==d.tasteRemove)}})) { refresh();toast("已撤销评价，DNA 已重新计算。"); }
      }
      if(d.tasteReset!==undefined) {
        showModal('<h2>清除口味档案？</h2><p>将移除风味调色盘与评价。库存、收藏和饮酒日记会保留。</p><div class="modal-actions"><button class="secondary" data-action="close">取消</button><button class="danger" id="confirm-taste-reset">清除口味数据</button></div>');
        document.querySelector("#confirm-taste-reset").onclick=()=>{if(save({...getState(),taste:T.empty()})){closeModal();refresh();}};
      }
    });
    return {card,detail,welcome,recommendations,renderDna,compare,rateButton,current};
  }
  globalThis.BarTasteUI={create};
})();
