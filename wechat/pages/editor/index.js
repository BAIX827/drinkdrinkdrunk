const S = require('../../shared/store'), U = require('../../shared/ui');
U.page(Page, {
  data: { type: 'log', editing: false, name: '', english: '', ingredients: '', method: '', date: S.today(), note: '', photos: [], glassIndex: 0, glassNames: Object.values(S.core.glassNames), recipeIndex: 0, recipeNames: [], busy: false, color:'#d4a16e' },
  onLoad(options) {
    this.type = options.type === 'recipe' ? 'recipe' : 'log'; this.id = options.id || ''; this.recipeID = options.recipe || '';
    this.allRecipes = S.recipes(); this.setData({ type: this.type, editing: !!this.id, date: options.date || S.today(), recipeNames: [U.t('手动填写酒名'), ...this.allRecipes.map(r => require('../../shared/engine').i18n.name(r))] });
    const existing = this.type === 'recipe' ? S.get().customRecipes.find(r => r.id === this.id) : S.get().logs.find(l => l.id === this.id);
    if (this.id && !existing) { this.invalid = true; U.toast('这条记录已不存在'); return; }
    if (existing) {
      this.original = existing; this.recipeID = existing.recipeID || ''; this.setData({color:S.core.drinkAppearance(existing).color});
      this.setData(this.type === 'recipe' ? { name: existing.chineseName, english: existing.englishName, ingredients: existing.ingredients.join('\n'), method: existing.method, note: existing.note || '', glassIndex: Math.max(0, this.data.glassNames.indexOf(existing.glass)) } : { name: existing.name, date: existing.date, note: existing.note, photos: existing.photos || [], recipeIndex: Math.max(0, this.allRecipes.findIndex(r => r.id === existing.recipeID) + 1) });
    } else if (this.recipeID) {
      const r = S.recipe(this.recipeID); if (r) this.setData({ name: r.chineseName, recipeIndex: this.allRecipes.findIndex(v => v.id === r.id) + 1 });
    }
    wx.setNavigationBarTitle({ title: this.type === 'recipe' ? (this.id ? '编辑配方' : '我的新配方') : (this.id ? '编辑日记' : '记下这一杯') });
  },
  onShow() { U.theme(this); },
  input(e) { const key = e.currentTarget.dataset.field; this.setData({ [key]: e.detail.value }); if (key === 'name' && this.type === 'log') { this.recipeID = ''; this.setData({ recipeIndex: 0 }); } },
  date(e) { this.setData({ date: e.detail.value }); },
  glass(e) { this.setData({ glassIndex: Number(e.detail.value) }); },
  color(e){if(/^#[0-9a-f]{6}$/i.test(e.detail.value))this.setData({color:e.detail.value});},
  selectRecipe(e) { const index = Number(e.detail.value), r = this.allRecipes[index - 1]; this.recipeID = r ? r.id : ''; this.setData({ recipeIndex: index, name: r ? r.chineseName : this.data.name }); },
  async addPhotos() {
    if (this.data.busy || this.data.photos.length >= 3) return;
    this.setData({ busy: true });
    try {
      const result = await new Promise((resolve, reject) => wx.chooseMedia({ count: 3 - this.data.photos.length, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'], success: resolve, fail: reject }));
      const photos = [...this.data.photos];
      for (const file of result.tempFiles) {
        if (file.size > 12 * 1024 * 1024) throw new Error('单张原图不能超过 12 MB。');
        // Re-encode using a local canvas to normalize HEIC/PNG/JPEG and bound backup size.
        const photo = await this.compress(file.tempFilePath); photos.push(photo);
      }
      this.setData({ photos });
    } catch (err) { if (!/cancel/.test(err.errMsg || '')) U.error(err.message ? err : new Error('无法读取照片，请检查微信权限或换一张图片。')); }
    finally { this.setData({ busy: false }); }
  },
  async compress(src) {
    const canvas = await new Promise((resolve, reject) => {
      wx.createSelectorQuery().in(this).select('#photo-canvas').fields({ node: true }).exec(result => {
        if (result[0] && result[0].node) resolve(result[0].node);
        else reject(new Error('照片画布暂未就绪，请重试。'));
      });
    });
    const img = canvas.createImage();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = src; });
    let scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    for (let attempt = 0; attempt < 6; attempt++, scale *= .7) {
      canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const file = await new Promise((resolve, reject) => wx.canvasToTempFilePath({ canvas,
        width: canvas.width, height: canvas.height, destWidth: canvas.width, destHeight: canvas.height,
        fileType: 'jpg', quality: .72, success: resolve, fail: reject }, this));
      const value = 'data:image/jpeg;base64,' + wx.getFileSystemManager().readFileSync(file.tempFilePath, 'base64');
      if (value.length <= 180000) return value;
    }
    throw new Error('照片压缩后仍过大，请选择较小的照片。');
  },
  removePhoto(e) { this.setData({ photos: this.data.photos.filter((_, i) => i !== Number(e.currentTarget.dataset.index)) }); },
  previewPhoto(e){U.action(()=>{const urls=this.data.photos.map((photo,i)=>{const file=`${wx.env.USER_DATA_PATH}/dddrunk-preview-${i}.jpg`;wx.getFileSystemManager().writeFileSync(file,photo.split(',')[1],'base64');return file;});wx.previewImage({urls,current:urls[Number(e.currentTarget.dataset.index)]});});},
  save() {
    if (this.data.busy || this.saving || this.invalid) return;
    this.saving = true;
    const result = U.action(() => {
      const d = this.data, name = d.name.trim(); if (!name) throw new Error('请填写名称。');
      if (this.type === 'recipe') {
        const ingredients = d.ingredients.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (!ingredients.length || !d.method.trim()) throw new Error('请填写材料与调制方法。每行填写一种材料和用量。');
        const id = this.id || S.id('user');
        const entry = { ...(this.original || {}), id, chineseName: name, englishName: d.english.trim(), ingredients, method: d.method.trim(), note: d.note.trim(), glass: d.glassNames[d.glassIndex], tags: [], accentHex: this.original && this.original.accentHex || '#d4a16e', isUserCreated: true };
        entry.appearance = {...entry.appearance,color:d.color};
        S.update(s => { s.customRecipes = s.customRecipes.filter(r => r.id !== id).concat([entry]); });
        if (this.id) wx.navigateBack(); else wx.redirectTo({ url: `/pages/recipe/index?id=${id}` });
      } else {
        const r = S.recipe(this.recipeID), entry = { ...(this.original || {}), id: this.id || S.id('log'), name, date: d.date, note: d.note.trim(), photos: d.photos };
        if (r) Object.assign(entry, { recipeID: r.id }, S.core.drinkAppearance(r, this.original && this.original.recipeID === r.id ? this.original : {}));
        else { delete entry.recipeID; if (this.original && this.original.recipeID) { delete entry.glass; delete entry.color; delete entry.visual; } }
        S.update(s => { s.logs = s.logs.filter(l => l.id !== entry.id).concat([entry]); }); getApp().journalDate = entry.date;
        wx.switchTab({ url: '/pages/journal/index' });
      }
      return true;
    });
    if (result === false) this.saving = false;
  },
  remove() {
    U.modal({ title: this.type === 'recipe' ? '删除这款自建配方？' : '删除这篇日记？', content: '删除后无法撤销，建议先在设置中导出备份。', confirmText: '删除', confirmColor: '#a44835', success: res => {
      if (!res.confirm) return;
      U.action(() => { S.update(s => { if (this.type === 'recipe') { s.customRecipes = s.customRecipes.filter(r => r.id !== this.id); s.favorites = s.favorites.filter(id => id !== this.id); s.taste.ratings = s.taste.ratings.filter(r => r.recipeID !== this.id); } else s.logs = s.logs.filter(l => l.id !== this.id); }); wx.switchTab({ url: this.type === 'recipe' ? '/pages/discover/index' : '/pages/journal/index' }); });
    } });
  }
});
