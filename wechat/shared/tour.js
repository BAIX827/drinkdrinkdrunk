// 新手引导：逐页跳到真实页面，高亮对应控件并说明用法（对应网页版 BarWeb/guide.js）。
// 引导只演示入口，不创建材料、日记、收藏或口味偏好。
const S = require('./store');
const VERSION = 1, RECIPE = 'world-004-mojito', TABS = ['discover', 'inventory', 'taste', 'journal'];
const steps = [
  { page: 'discover', title: '从你的吧台，开始第一杯', text: '登记材料，找到配方，跟着调制，再留下自己的口味记录。接下来一起认识这些入口。' },
  { page: 'inventory', target: '#tour-add-item', title: '先把家里的材料放上吧台', text: '点“＋ 登记材料”，登记家里的一瓶酒、一盒果汁或一罐糖浆。名称可以自己起，标准类型用于匹配配方，还能选瓶型、换颜色、在标签上画几笔。' },
  { page: 'discover', target: '#tour-stock', title: '用已有材料找一杯酒', text: '选“现在能调”“最多缺 1 样”或“最多缺 2 样”，再在下方勾选要检查的材料类别。可选配料不计缺项；没勾选的类别不代表已经拥有。' },
  { page: 'recipe', target: '#tour-ingredients', title: '调制前，核对材料和用量', text: '这里列出全部材料和用量，并标出你还缺什么。冰块和装饰要另外备好；完整做法与配方来源在下方。' },
  { page: 'guide', target: '#tour-play', fixed: true, title: '跟着步骤慢慢调', text: '点“开始跟做”自动计时，也可以用上一步、下一步手动切换。步骤卡右上角可开语音朗读；“跟做设置”里能调等待时间和屏幕常亮，“酒杯与外观”里能换杯型和颜色。调完后一键记入日记。' },
  { page: 'taste', target: ['#tour-palette', '#tour-taste-edit'], title: '调出自己的口味 DNA', text: '点选喜欢的风味，再点一次取消；选好酒感后保存。喝过之后在配方页评价喜欢、还行或不喜欢，推荐会越来越贴近你。' },
  { page: 'journal', target: '#tour-calendar', title: '把这一杯记下来', text: '点日历里的日期，再点“＋ 记一杯”，就能记录或补记当天喝的酒，添加照片和感受。关联配方的记录还能直接去评价口味。' },
  { page: 'recipe', target: '#tour-share', title: '收藏，也分享给朋友', text: '顶部“♡ 收藏”可以收藏配方。点“图片分享卡片”生成图片，可换八种配色并保存到相册；内置配方还能直接把页面分享给朋友。' },
  { page: 'discover', target: '#tour-add-recipe', title: '也可以写下自己的配方', text: '在发现页底部点“＋ 记下自己的配方”，填写酒名、杯型、每行一种材料与用量，再写下做法。自建配方也能查看、分享和按原方跟做。' },
  { page: 'settings', target: '#tour-backup', title: '最后，记得备份你的吧台', text: '备份包括材料、收藏、自建配方、照片日记和口味档案。设备之间不会自动同步，导入会替换当前数据。想再看一遍引导，在设置里点“重看新手引导”。' }
];
let active = false, index = 0;
const listeners = new Set();
function notify() { listeners.forEach(fn => fn()); }
function recipeID() { return S.recipe(RECIPE) ? RECIPE : (S.recipes()[0] || {}).id; }
function current() { return active ? { ...steps[index], index, total: steps.length } : null; }
function url(step) { return `/pages/${step.page}/index` + (['recipe', 'guide'].includes(step.page) ? '?id=' + encodeURIComponent(recipeID()) : ''); }
function top() { const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []; const page = pages[pages.length - 1]; return page ? { name: (page.route || '').split('/')[1], id: page.options && page.options.id } : {}; }
function go(next) {
  index = Math.max(0, Math.min(steps.length - 1, next));
  const step = steps[index], here = top();
  notify();
  if (here.name === step.page && (!['recipe', 'guide'].includes(step.page) || here.id === recipeID())) return;
  const target = url(step);
  if (TABS.includes(step.page)) wx.switchTab({ url: target });
  else if (here.name && !TABS.includes(here.name)) wx.redirectTo({ url: target });
  else wx.navigateTo({ url: target });
}
function start(at = 0) { active = true; go(at); }
// 看完最后一步回到发现页开始使用；中途“跳过引导”则留在当前页面。
function next() { if (!active) return; if (index >= steps.length - 1) { finish(); wx.switchTab({ url: '/pages/discover/index' }); return; } go(index + 1); }
function previous() { if (active && index) go(index - 1); }
// 先保存“已看过”，保存失败时引导保持打开，可以重试，不会丢失现有数据。
function finish() { S.update(s => { s.guideVersion = VERSION; }); active = false; notify(); }
function seen() { return (S.get().guideVersion || 0) >= VERSION; }
module.exports = { steps, start, next, previous, finish, current, seen, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, get active() { return active; } };
