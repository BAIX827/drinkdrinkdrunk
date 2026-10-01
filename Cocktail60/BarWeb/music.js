/* One local instrumental player survives route changes. Playback is opt-in. */
(() => {
  const { html: localHTML, t: localText } = globalThis.BarI18n || { html: s => s, t: s => s };
  const volumeKey = 'drinkdrinkdrunk.music.volume.v1';
  let audio, root, pending = false, error = '', request = 0, volume = .25;
  try {
    const saved = localStorage.getItem(volumeKey);
    if (saved !== null && Number.isFinite(Number(saved))) volume = Math.max(0, Math.min(1, Number(saved)));
  } catch { /* Playback also works when storage is unavailable. */ }
  function sync() {
    if (!root?.isConnected) return;
    const playing = !!audio && !audio.paused;
    const button = root.querySelector('[data-music-toggle]');
    button.textContent = localText(pending ? '◌ 加载中' : playing ? 'Ⅱ 暂停音乐' : '♫ 吧台音乐');
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', localText(playing ? '暂停吧台音乐' : '播放吧台音乐'));
    button.title = localText(error || 'After Hours · 电钢琴 / 低音 / 轻鼓 · 纯音乐');
    root.dataset.playing = String(playing);
    root.querySelector('[data-music-status]').textContent = localText(error);
    root.querySelector('input').value = String(Math.round(volume * 100));
  }
  function pause() {
    request++; pending = false;
    audio?.pause(); sync();
  }
  async function toggle() {
    if (pending || (audio && !audio.paused)) { pause(); return; }
    const id = ++request;
    error = ''; pending = true;
    try {
      if (!audio) {
        audio = new Audio('audio/after-hours.wav');
        audio.loop = true; audio.preload = 'none'; audio.volume = volume;
        ['play', 'pause', 'ended'].forEach(event => audio.addEventListener(event, sync));
        audio.addEventListener('error', () => {
          request++; pending = false; audio.pause();
          error = '音乐暂时无法播放，请点击重试。'; sync();
        });
      } else if (audio.error) audio.load();
      sync();
      await audio.play();
      if (id !== request) return;
      pending = false; sync();
    } catch {
      if (id !== request) return;
      pending = false; error = '音乐暂时无法播放，请点击重试。'; sync();
    }
  }
  function mount(container) {
    root = container;
    root.innerHTML = localHTML('<button type="button" class="secondary small music-toggle" data-music-toggle aria-pressed="false">♫ 吧台音乐</button><label class="music-volume"><span>音量</span><input type="range" min="0" max="100" step="1" aria-label="背景音乐音量"></label><span class="music-status" data-music-status role="status" aria-live="polite"></span>');
    root.querySelector('button').onclick = toggle;
    root.querySelector('input').oninput = event => {
      volume = Number(event.target.value) / 100;
      if (audio) audio.volume = volume;
      try { localStorage.setItem(volumeKey, String(volume)); } catch { /* Optional preference. */ }
    };
    sync();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', pause);
  globalThis.BarMusic = { mount };
})();
