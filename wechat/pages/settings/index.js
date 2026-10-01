const S = require('../../shared/store'), U = require('../../shared/ui');
U.page(Page, {
  data: { backupText: '', themes: [{ key: 'bar', name: '深绿吧台' }, { key: 'light', name: '日间' }, { key: 'dark', name: '低光' }] },
  onShow() { U.theme(this); this.refresh(); },
  refresh() { const s = S.get(); this.setData({ inventory: s.inventory.length, favorites: s.favorites.length, logs: s.logs.length, custom: s.customRecipes.length, size: Math.round(S.bytes(JSON.stringify(s)) / 1024), blocked: S.isBlocked() }); },
  theme(e) { U.action(() => { S.update(s => { s.theme = e.currentTarget.dataset.key; }); U.theme(this); }); },
  input(e) { if(S.bytes(e.detail.value)>500000){this.setData({backupText:''});U.toast('备份较大，请使用文件导入。');return;}this.setData({ backupText: e.detail.value }); },
  language(e) { U.action(() => { S.update(s => { s.locale = e.currentTarget.dataset.locale; }); U.theme(this); this.refresh(); }); },
  motion(e) { U.action(() => { S.update(s => { s.reducedMotion = e.detail.value; }); U.theme(this); }); },
  intro() { wx.navigateTo({ url: '/pages/intro/index' }); },
  export() { U.action(() => {
    if (S.isBlocked()) throw new Error('正常备份不可用，请使用下方的“导出原始数据文件”。');
    const filePath = `${wx.env.USER_DATA_PATH}/dddrunk-backup-${S.today()}.json`;
    wx.getFileSystemManager().writeFileSync(filePath, JSON.stringify(S.get(), null, 2), 'utf8');
    if (wx.shareFileMessage) wx.shareFileMessage({ filePath, fileName: `大喝特喝备份-${S.today()}.json`, fail: e => { if (!/cancel/.test(e.errMsg || '')) U.error(new Error('备份文件已生成，但当前环境不能分享文件。可使用复制备份文本，或在手机真机中导出。')); } });
    else U.error(new Error('当前环境不能分享文件，请使用复制备份文本，或在手机真机中导出。'));
  }); },
  raw() {
    U.sheet({ itemList: ['导出原始文件 A', '导出原始文件 B'], success: res => U.action(() => {
      const filePath = S.rawPaths()[res.tapIndex]; wx.getFileSystemManager().accessSync(filePath);
      if (!wx.shareFileMessage) throw new Error('当前环境不支持分享文件，请在真机中操作。');
      wx.shareFileMessage({ filePath, fail: e => { if (!/cancel/.test(e.errMsg || '')) U.error(new Error('无法分享该文件，请保留本地数据并联系开发者。')); } });
    }) });
  },
  copy() { U.action(() => { if (S.isBlocked()) throw new Error('请先恢复数据，或导出原始文件。'); const text = JSON.stringify(S.get()); if (S.bytes(text) > 500000) throw new Error('备份较大，请使用文件导出，避免剪贴板截断照片。'); wx.setClipboardData({ data: text, fail: () => U.toast('复制失败，请使用文件导出') }); }); },
  chooseFile() {
    wx.chooseMessageFile({ count: 1, type: 'file', extension: ['json'], success: res => {
      U.action(() => { const file = res.tempFiles[0]; if (file.size > 6 * 1024 * 1024) throw new Error('备份文件超过 6 MB。'); const text = wx.getFileSystemManager().readFileSync(file.path, 'utf8'); this.previewImport(text); });
    }, fail: e => { if (!/cancel/.test(e.errMsg || '')) U.toast('无法选择文件，也可以粘贴备份文本'); } });
  },
  paste() { wx.getClipboardData({ success: res => this.previewImport(res.data), fail: () => U.toast('无法读取剪贴板，请手动粘贴') }); },
  importText() { this.previewImport(this.data.backupText); },
  previewImport(text) {
    U.action(() => {
      if (typeof text !== 'string' || S.bytes(text) > 6 * 1024 * 1024) throw new Error('备份文本无效或过大。');
      let value; try { value = S.validate(JSON.parse(text)); } catch (e) { throw new Error(`备份无法读取：${e.message}`); }
      if (S.bytes(JSON.stringify(value)) > 3800000) throw new Error('备份超过 3.8 MB，请先减少照片。当前数据未改变。');
      U.modal({ title: '用这份备份替换当前数据？', content: `包含 ${value.inventory.length} 样材料、${value.favorites.length} 个收藏、${value.customRecipes.length} 款自建配方、${value.logs.length} 篇日记。当前数据将被替换，建议先导出。`, confirmText: '确认替换', success: res => {
        if (!res.confirm) return; U.action(() => { S.save(value, true); this.setData({ backupText: '' }); U.theme(this); this.refresh(); U.toast('备份已恢复'); });
      } });
    });
  }
});
