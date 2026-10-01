// Re-encode locally: no remote upload and no original image metadata in backups.
(() => {
  const { html: localHTML, t: localText } = globalThis.BarI18n || { html: s => s, t: s => s };
  async function compress(file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片。');
    if (file.size > 12 * 1024 * 1024) throw new Error('单张原图不能超过 12 MB。');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      let scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
      for (let attempt = 0; attempt < 5; attempt++, scale *= .75) {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', .78);
        if (data.length <= 180000) return data;
      }
      throw new Error('这张图片压缩后仍太大，请选择较小的图片。');
    } catch (error) {
      throw new Error(error.message?.includes('太大') ? error.message : '图片无法读取，请换一张有效图片。');
    } finally { URL.revokeObjectURL(url); }
  }
  function mount(form, initial = []) {
    let photos = [...initial], busy = false;
    const input = form.querySelector('[data-photo-input]');
    const inputs = [input, form.querySelector('[data-photo-camera]')].filter(Boolean);
    const gallery = form.querySelector('[data-photo-preview]');
    const status = form.querySelector('[data-photo-status]');
    const submit = form.querySelector('button[type="submit"]');
    const render = () => {
      gallery.innerHTML = localHTML(photos.map((p,i) => `<div class="photo-preview"><img src="${p}" alt="日记照片 ${i+1}"><button type="button" data-remove-photo="${i}" aria-label="移除照片 ${i+1}">×</button></div>`).join(''));
      gallery.querySelectorAll('[data-remove-photo]').forEach(button => button.onclick = () => {
        if (busy) return;
        photos.splice(Number(button.dataset.removePhoto), 1); render();
      });
      inputs.forEach(picker => { picker.disabled = busy || photos.length >= 3; });
    };
    inputs.forEach(picker => { picker.onchange = async () => {
      const files = [...picker.files];
      if (photos.length + files.length > 3) { status.textContent = localText('每篇最多 3 张，请减少选择数量。'); picker.value = ''; return; }
      busy = true; submit.disabled = true; status.textContent = localText('正在本地压缩照片…'); render();
      try {
        const additions = [];
        for (const file of files) additions.push(await compress(file));
        photos.push(...additions);
        status.textContent = localText('照片已准备好，保存日记后生效。');
      } catch (error) { status.textContent = localText(error.message); }
      finally { busy = false; picker.value = ''; submit.disabled = false; render(); }
    }; });
    render();
    return { value: () => [...photos], busy: () => busy };
  }
  globalThis.BarPhotos = { compress, mount };
})();
