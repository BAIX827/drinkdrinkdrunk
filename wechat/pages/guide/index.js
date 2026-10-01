const S = require('../../shared/store'), U = require('../../shared/ui');
const E = require('../../shared/engine'), M = require('../../shared/media');
const labels = { pour: '量取与倒入', ice: '加入冰块', shake: '摇匀', stir: '搅拌', strain: '过滤入杯', serve: '倒入酒杯', top: '补入饮料', garnish: '装饰', muddle: '轻压', blend: '搅打', float: '漂浮分层', rinse: '润洗酒杯', prepare: '准备材料', method: '原方提示' };
U.page(Page, {
  data: { recipe: null, index: 0, playing: false, complete: false, recorded: false, remaining: 0, delay: 8, delays: [5, 8, 15, 30, 60], awake: false, speech: false, lookMode: 'recipe', glasses: Object.values(S.core.glassNames), glassIndex: 0, color: '#da9561' },
  onLoad(options) {
    const recipe = S.recipe(options.id);
    if (!recipe) return;
    this.steps = recipe.steps || recipe.parts.filter(p => !p.substitution).map(p => ({ action: 'prepare', tool: '量酒器 / 备料碟', hint: `备好 ${p.raw}，先不要混合。`, ingredient: p })).concat([{ action: 'method', tool: '按原配方选择', hint: recipe.method }]);
    this.logID = S.id('log');
    const look = S.core.drinkAppearance(recipe); this.look = look;
    this.setData({ recipe, image: S.photo(recipe), total: this.steps.length, color:look.color, glassIndex:Object.keys(S.core.glassNames).indexOf(look.glass) }); this.showStep();
  },
  onShow() { U.theme(this); },
  seconds() { const step = this.steps[this.data.index]; return Math.max(this.data.delay, Number(step.duration) || 0); },
  showStep() {
    const step = this.steps[this.data.index];
    this.setData({ step, label: labels[step.action] || '调制', remaining: this.seconds(), progress: Math.round((this.data.index + 1) / this.steps.length * 100), nextLabel: this.steps[this.data.index + 1] ? (this.steps[this.data.index + 1].ingredient || {}).raw || labels[this.steps[this.data.index + 1].action] : '完成后记录这一杯' });
    this.scene();
  },
  scene() {
    if(!this.steps)return;
    const step=this.steps[this.data.index], complete=this.data.complete, target=complete || step.target==='counter'?'glass':step.target;
    const content=E.contentsAt(this.steps,this.data.index,target); if(complete&&!this.data.recipe.steps)content.level=.7;
    const visual=E.visualAt(this.look.visual||{},this.steps,this.data.index,target,complete);
    if(!complete&&!this.steps.slice(0,this.data.index+1).some(s=>s.action==='garnish'))visual.garnish='none';
    const stock=S.get().inventory, bottle=step.ingredient && stock.find(item=>step.ingredient.types.some(type=>S.core.satisfies(item.type,type)));
    const previous=this.steps.slice(0,this.data.index).reverse().find(s=>['shaker','mixing','blender'].includes(s.target));
    this.setData({ scene:{ key:this.logID+':'+this.data.index+':'+complete, action:step.action, target:target||'glass', source:step.source || (previous&&previous.target) || 'shaker', content, visual, glass:this.look.glass,color:this.look.color,bottle:bottle||{color:this.look.color,shape:'bottle'},complete } });
  },
  glass(e){this.setData({glassIndex:Number(e.detail.value)});this.look.glass=Object.keys(S.core.glassNames)[this.data.glassIndex];this.scene();},
  color(e){if(/^#[0-9a-f]{6}$/i.test(e.detail.value)){this.look.color=e.detail.value;this.setData({color:e.detail.value});this.scene();}},
  look(e){const mode=e.currentTarget.dataset.mode;this.setData({lookMode:mode});this.look.visual=mode==='recipe'?S.core.drinkAppearance(this.data.recipe).visual||{}:{garnish:'none'};this.scene();},
  voice(e){
    if(!e.detail.value){this.setData({speech:false});M.stopSpeech();return;}
    const enable=()=>{this.setData({speech:true});this.say();};
    if(this.data.recipe.isUserCreated && M.providerEnabled)U.modal({title:U.t('朗读自建配方'),content:U.t('开启后，这段自建配方文字会发送给微信同声传译服务合成语音。内置配方使用本地录音。'),success:r=>{if(r.confirm)enable();}});else enable();
  },
  say(){if(!this.data.speech||!this.data.playing||this.data.complete)return;const text=E.i18n.recipeText(this.data.recipe,this.steps[this.data.index].hint);M.speak(text,S.get().locale).catch(error=>{this.setData({speech:false});U.error(error);});},
  schedule() {
    clearInterval(this.timer);
    if (!this.data.playing || this.data.complete) return;
    this.say();
    this.deadline = Date.now() + this.data.remaining * 1000;
    this.timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
      this.setData({ remaining }); if (!remaining) this.next();
    }, 200);
  },
  toggle() {
    if (this.data.complete) {
      this.logID = S.id('log'); this.setData({ index: 0, complete: false, recorded: false, playing: true }); this.showStep();
    } else if (this.data.playing) { this.pause(); return; }
    else this.setData({ playing: true });
    this.schedule();
  },
  pause() {
    if (this.data.playing && this.deadline) this.setData({ remaining: Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000)) });
    clearInterval(this.timer); M.stopSpeech(); this.setData({ playing: false });
  },
  next() {
    if (!this.steps || this.data.complete) return;
    clearInterval(this.timer);
    if (this.data.index + 1 >= this.steps.length) { this.setData({ complete: true, playing: false, remaining: 0, progress: 100 }); M.stopSpeech(); this.scene(); this.releaseScreen(); }
    else { this.setData({ index: this.data.index + 1 }); this.showStep(); this.schedule(); }
  },
  previous() { if (!this.steps || !this.data.index) return; this.setData({ index: this.data.index - 1, complete: false }); this.showStep(); this.schedule(); },
  delay(e) { this.setData({ delay: this.data.delays[Number(e.detail.value)] }); this.showStep(); this.schedule(); },
  record() { if (!this.data.complete || this.data.recorded) return; U.action(() => { S.addLog(this.data.recipe, this.logID, this.look); this.setData({ recorded: true }); U.toast('已加入今天的日记'); }); },
  awake() { const awake = !this.data.awake; wx.setKeepScreenOn({ keepScreenOn: awake, success: () => this.setData({ awake }), fail: () => U.toast('当前环境无法保持常亮') }); },
  releaseScreen() { if (this.data.awake) wx.setKeepScreenOn({ keepScreenOn: false }); this.setData({ awake: false }); },
  onHide() { this.pause(); this.releaseScreen(); },
  onUnload() { clearInterval(this.timer); M.stopSpeech(); this.releaseScreen(); }
});
