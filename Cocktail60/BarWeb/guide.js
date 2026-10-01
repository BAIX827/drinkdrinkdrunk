(() => {
  const { html: localHTML, t: localText } = globalThis.BarI18n || { html: s => s, t: s => s };
  const VERSION = 1;
  function steps(recipeID, hasTaste) {
    return [
      { title: '从你的吧台，开始第一杯', text: '登记材料，找到配方，跟着调制，再留下自己的口味记录。接下来一起认识这些入口。', icon: '◈' },
      { route: 'bar', target: '[data-action="add-item"]', title: '先把家里的材料放上吧台', text: '先登记家里的一瓶酒、一盒果汁或一罐糖浆。名称可以自己起，标准材料类型用于匹配配方。还可以选瓶型、换颜色，或在标签上画几笔。', icon: '▥' },
      { route: 'discover', target: '.inventory-filter', title: '用已有材料找一杯酒', text: '选择要检查的材料类别，再选缺 0 项、最多缺 1 项或最多缺 2 项。按所选材料检查，可选配料不计缺项；没勾选的类别不代表已经拥有。', icon: '⌕' },
      { route: `recipe/${recipeID}`, target: '.ingredients', title: '调制前，核对材料和用量', text: '详情会检查配方所列的全部必需材料，逐项标出缺少什么。冰块、方法中的装饰请另外备妥；做法和配方备注也在这里。', icon: '✓' },
      { route: `follow/${recipeID}`, target: '.play-controls', title: '跟着步骤慢慢调', text: '开始跟做后可以暂停、回看上一步，或调整每步等待时间。也可以选杯型、开语音提示、保持屏幕常亮。调完后能一键加入饮酒日记。', icon: '▷' },
      { route: 'dna', target: hasTaste ? '.dna-identity' : '.flavor-palette', title: '调出自己的口味 DNA', text: `${hasTaste ? '在“调整风味”里重新搭配。' : ''}点选喜欢的味道，再点一次移除；选择酒感后保存。喝过之后还可以评价喜欢、还行或不喜欢，让后续推荐逐渐贴近你。`, icon: '✦' },
      { route: 'journal', target: '.calendar-days', title: '把这一杯记下来', text: '点选日历中的日期，再点击“记一杯”，就能记录或补记当天喝的酒，添加照片和感受。有配方关联的记录，还可以直接留下口味评价。', icon: '▤' },
      { route: `recipe/${recipeID}`, target: '.detail-copy > .detail-actions', title: '收藏，也分享给朋友', text: '喜欢的配方可以收藏。点击“分享卡片”查看图片，默认配色跟随主题，也能换配色和边框，再保存图片；设备支持时还可打开系统分享。', icon: '♡' },
      { route: 'discover', target: '[data-action="add-recipe"]', title: '也可以写下自己的配方', text: '填入酒名、杯型、材料与用量和做法。材料每行一项，尽量使用标准材料名称，方便库存匹配和风味分析。自建配方也能查看、分享和按原方跟做。', icon: '＋' },
      { route: 'settings', target: '[data-guide="backup"]', title: '最后，记得备份你的吧台', text: '备份包含材料、收藏、自建配方、日记照片和口味档案，设备之间不会自动同步。导入会替换当前记录。以后想再看一遍，在设置里打开“新手引导”。', icon: '↗' },
    ];
  }
  function create({ getState, getRecipeID, hasTaste, navigate, markSeen }) {
    let dialog, index = 0, items = [], originalHash, originalScroll = 0, returnAction, frame;
    let active = false;
    const ready = () => (getState().guideVersion || 0) >= VERSION;
    function position() {
      if (!active) return;
      const card = dialog.querySelector('.tour-card'), spot = dialog.querySelector('.tour-spot');
      const step = items[index];
      card.style.left = ''; card.style.top = ''; card.style.bottom = '';
      const target = step.target ? document.querySelector(step.target) : null;
      if (!target) { dialog.classList.add('tour-centered'); spot.hidden = true; return; }
      dialog.classList.remove('tour-centered');
      const small = window.innerWidth <= 680, rect = target.getBoundingClientRect();
      const cardHeight = card.getBoundingClientRect().height;
      const bottom = window.innerHeight - (small ? 18 : 28);
      const availableBottom = bottom - cardHeight - 22;
      const top = Math.max(12, Math.min(rect.top - 8, availableBottom - 35));
      spot.hidden = false;
      Object.assign(spot.style, {
        left: `${Math.max(8, rect.left - 8)}px`, top: `${top}px`,
        width: `${Math.min(rect.width + 16, window.innerWidth - Math.max(8, rect.left - 8) - 8)}px`,
        height: `${Math.max(30, Math.min(rect.bottom + 8, availableBottom) - top)}px`,
      });
      card.style.left = small ? '16px' : `${Math.max(20, Math.min(rect.left, window.innerWidth - 468))}px`;
      card.style.top = `${Math.max(18, small ? bottom - cardHeight : Math.min(bottom - cardHeight, rect.bottom + 30))}px`;
    }
    function render() {
      cancelAnimationFrame(frame);
      const step = items[index], e = BarArt.escape;
      if (step.route) navigate(step.route);
      const last = index === items.length - 1;
      dialog.innerHTML = localHTML(`<div class="tour-spot" aria-hidden="true" hidden></div><section class="tour-card"><div class="tour-meta"><span>${index ? `新手引导 · ${index} / ${items.length - 1}` : '欢迎来到大喝特喝'}</span><button type="button" class="text-button" data-tour="skip">跳过引导</button></div><div class="tour-route" aria-hidden="true">${items.slice(1).map((_, i) => `<span class="${i < index ? 'visited' : ''}"></span>`).join('')}</div><div class="tour-icon" aria-hidden="true">${step.icon}</div><h2 id="tour-title">${e(step.title)}</h2><p id="tour-description">${e(step.text)}</p><div class="tour-actions">${index ? '<button type="button" class="secondary" data-tour="back">上一步</button>' : '<span></span>'}<button type="button" class="primary" data-tour="next">${last ? '完成引导' : index ? '下一步' : '开始引导'}</button></div></section>`);
      dialog.classList.toggle('tour-centered', !step.target);
      frame = requestAnimationFrame(() => {
        if (!active) return;
        const target = step.target ? document.querySelector(step.target) : null;
        if (target) {
          const rect = target.getBoundingClientRect();
          const room = window.innerHeight - dialog.querySelector('.tour-card').getBoundingClientRect().height - 48;
          const inset = window.innerWidth <= 680 ? Math.max(28, (room - rect.height) / 2) : 70;
          window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - inset), behavior: 'instant' });
        }
        position();
        dialog.querySelector('[data-tour="next"]').focus({ preventScroll: true });
      });
    }
    function finish(restore = true) {
      if (!active) return;
      active = false; cancelAnimationFrame(frame);
      dialog.close(); dialog.remove(); dialog = null;
      document.body.classList.remove('tour-running');
      window.removeEventListener('resize', position); window.removeEventListener('scroll', position);
      window.removeEventListener('hashchange', routeChanged);
      markSeen(VERSION);
      if (restore) {
        navigate(originalHash.slice(1) || 'discover');
        window.scrollTo({ top: originalScroll, behavior: 'instant' });
        const focus = returnAction ? document.querySelector(`[data-action="${CSS.escape(returnAction)}"]`) : document.querySelector('#main');
        focus?.focus({ preventScroll: true });
      }
    }
    function routeChanged() { finish(false); }
    function start() {
      if (active || document.querySelector('#modal')?.open) return;
      originalHash = location.hash; originalScroll = window.scrollY;
      returnAction = document.activeElement?.dataset.action;
      items = steps(getRecipeID(), hasTaste()); index = 0; active = true;
      BarPlayer.stop();
      document.body.classList.add('tour-running');
      dialog = document.createElement('dialog'); dialog.className = 'tour-dialog tour-centered';
      dialog.setAttribute('aria-labelledby', 'tour-title'); dialog.setAttribute('aria-describedby', 'tour-description');
      document.body.append(dialog);
      dialog.addEventListener('wheel', event => { if (!event.target.closest('.tour-card')) event.preventDefault(); }, { passive: false });
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
      dialog.addEventListener('click', event => {
        const action = event.target.closest('[data-tour]')?.dataset.tour;
        if (action === 'skip') finish();
        else if (action === 'back' && index) { index--; if (!index) navigate(originalHash.slice(1) || 'discover'); render(); }
        else if (action === 'next') { if (index === items.length - 1) finish(); else { index++; render(); } }
      });
      render(); dialog.showModal();
      window.addEventListener('resize', position); window.addEventListener('scroll', position, { passive: true });
      window.addEventListener('hashchange', routeChanged);
    }
    return { start, get active() { return active; }, autoStart: () => { if (!ready()) start(); } };
  }
  globalThis.BarGuide = { VERSION, steps, create };
})();
