const S = require('../../shared/store'), U = require('../../shared/ui');
const steps = [
  ['从你的吧台，开始第一杯','登记材料，找到配方，跟着调制，再留下自己的口味记录。','发现'],
  ['先把家里的材料放上吧台','登记一瓶酒、一盒果汁或一罐糖浆。名称可以自己起，标准类型用于匹配，还可以选瓶型、换颜色、画标签。','我的酒'],
  ['用已有材料找一杯酒','选择要检查的材料类别，再选缺 0 项、最多缺 1 项或最多缺 2 项。没勾选的类别不代表已经拥有。','发现'],
  ['调制前，核对材料和用量','详情检查全部必需材料。做法中的冰块、装饰要另外备妥；完整做法与配方来源也在这里。','配方详情'],
  ['跟着步骤慢慢调','可以暂停、回看、改变等待时间，选择杯型与颜色，开语音和屏幕常亮；完成后记录这一杯。','分步跟做'],
  ['调出自己的口味 DNA','点选风味并即时预览，选择酒感后保存。喝过以后留下评价，让推荐逐渐贴近你。','口味 DNA'],
  ['把这一杯记下来','选择日期，记录酒名、感受和照片。有配方关联的记录还可直接打开配方评价。','日记'],
  ['收藏，也分享给朋友','分享卡片可选择八套配色，保存到相册或分享图片。内置配方还能直接分享小程序页面。','分享卡片'],
  ['也可以写下自己的配方','每行填写一种材料与用量，并写下完整做法。自建配方也能查看、分享和按原方跟做。','我的配方'],
  ['最后，记得备份你的吧台','备份包括材料、收藏、配方、照片日记和口味档案。设备之间不会自动同步，导入将替换当前数据。','设置与数据']
];
U.page(Page,{data:{index:0,total:steps.length},onLoad(){this.show();},onShow(){U.theme(this);},show(){this.setData({title:steps[this.data.index][0],description:steps[this.data.index][1],destination:steps[this.data.index][2]});},next(){if(this.data.index===steps.length-1)return this.finish();this.setData({index:this.data.index+1});this.show();},previous(){this.setData({index:Math.max(0,this.data.index-1)});this.show();},finish(){U.action(()=>{S.update(s=>{s.guideVersion=1;});wx.navigateBack({fail:()=>wx.switchTab({url:'/pages/discover/index'})});});}});
