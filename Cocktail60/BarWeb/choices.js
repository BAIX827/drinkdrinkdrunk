(() => {
  const { escape: e, glass } = BarArt;

  function render({ id, name = id, label, options, value, draw }) {
    return `<fieldset id="${e(id)}" class="choice-field ${draw ? "visual-choices" : "text-choices"}"><legend>${e(label)}</legend><div class="choice-track" id="${e(id)}-options">${Object.entries(options).map(([key, title]) =>
      `<label class="choice-option"><input type="radio" id="${e(id)}-${e(key)}" name="${e(name)}" value="${e(key)}" aria-label="${e(title)}" ${key === value ? "checked" : ""}><span class="choice-card">${draw ? `<span class="choice-art" data-choice="${e(key)}" aria-hidden="true">${draw(key)}</span>` : ""}<span>${e(title)}</span></span></label>`
    ).join("")}</div></fieldset>`;
  }

  function glasses({ id, name = "glass", label = "杯型", value, color, visual = {} }) {
    return render({ id, name, label, options: BarCore.glassNames, value,
      draw: key => glass(key, color, visual) });
  }

  function updateArt(field, draw) {
    field.querySelectorAll(".choice-art").forEach(art => {
      art.innerHTML = draw(art.dataset.choice);
    });
  }

  function reveal(root) {
    root.querySelectorAll(".choice-track").forEach(track => {
      const option = track.querySelector("input:checked")?.closest("label");
      if (option && track.scrollWidth > track.clientWidth) {
        track.scrollLeft += option.getBoundingClientRect().left - track.getBoundingClientRect().left - (track.clientWidth - option.offsetWidth) / 2;
      }
    });
  }

  // Tutorial steps replace the view; keep the picker position and keyboard focus.
  function remember(root) {
    const positions = [...root.querySelectorAll(".choice-track")].map(track => [track.id, track.scrollLeft]);
    const focused = document.activeElement;
    const focusID = focused?.matches('input[type="radio"]') && root.contains(focused) ? focused.id : null;
    return () => {
      reveal(root);
      positions.forEach(([id, left]) => {
        const track = root.querySelector(`#${id}`);
        if (track) track.scrollLeft = left;
      });
      if (focusID) root.querySelector(`#${focusID}`)?.focus({ preventScroll: true });
    };
  }

  globalThis.BarChoices = { render, glasses, updateArt, reveal, remember };
})();
