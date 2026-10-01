const store = require('./store');
const L = require('./localize');
function error(error) { wx.showModal({ title: L.t('暂时无法完成'), content: L.t(error.message || String(error)), showCancel: false }); }
function action(work) { try { return work(); } catch (err) { error(err); return false; } }
function toast(title) { wx.showToast({ title: L.t(title), icon: 'none' }); }
function openRecipe(event) { wx.navigateTo({ url: `/pages/recipe/index?id=${encodeURIComponent(event.currentTarget.dataset.id)}` }); }
function theme(page) {
  const state = store.get(), value = state.theme;
  require('./engine').i18n.setLocale(state.locale);
  page.setData({ theme: value, locale: state.locale, reduced: !!state.reducedMotion });
  const light = value === 'light', backgroundColor = light ? '#f5efdf' : '#122f2a';
  wx.setNavigationBarColor({ frontColor: light ? '#000000' : '#ffffff', backgroundColor });
  wx.setTabBarStyle({ color: light ? '#52685d' : '#a4b9ae', selectedColor: light ? '#164e3d' : '#e8c68d', backgroundColor, borderStyle: light ? 'white' : 'black' });
  if (wx.setTabBarItem) ['发现','我的酒','口味 DNA','日记'].forEach((name, index) => wx.setTabBarItem({ index, text: state.locale === 'en' ? ['Discover','My bar','Taste DNA','Diary'][index] : name }));
  const titles={discover:'发现',inventory:'我的酒',taste:'口味 DNA',journal:'日记',settings:'设置与数据',bottle:'编辑瓶子',share:'图片分享卡片',intro:'新手引导',guide:'分步跟做'};
  const name=page.route && page.route.split('/')[1];if(titles[name])wx.setNavigationBarTitle({title:L.t(titles[name])});
}
function modal(options){const result={...options};for(const key of ['title','content','confirmText','cancelText'])if(result[key])result[key]=L.t(result[key]);wx.showModal(result);}
function sheet(options){wx.showActionSheet({...options,itemList:options.itemList.map(L.t)});}
function page(register, config) {
  const onLoad = config.onLoad, onShow = config.onShow;
  function install() {
    if (this._localized) return;
    this._localized = true; const original = this.setData.bind(this);
    this.setData = (patch, callback) => {
      const raw = { ...this.data, ...patch }; delete raw.v;
      require('./engine').i18n.setLocale(store.get().locale);
      original({ ...patch, v: L.view(raw) }, callback);
    };
    this.setData({ locale: store.get().locale });
  }
  config.onLoad = function(options) { install.call(this); if (onLoad) onLoad.call(this, options); };
  config.onShow = function() { install.call(this); if (onShow) onShow.call(this); };
  register(config);
}
module.exports = { action, error, toast, openRecipe, theme, page, modal, sheet, t: L.t };
