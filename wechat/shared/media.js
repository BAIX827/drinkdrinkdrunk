const E = require('./engine'), voices = require('./voice-index'), loaders = require('./voice-loaders'), provider = require('./voice-provider');
let music, speech, playing = false, pending = false, volume = .25, speechTicket = 0, wanted = false, configured = false;
const listeners = new Set(), loaded = new Set(), loading = new Map();
function status() { return { playing, pending, volume }; }
function publish() { listeners.forEach(fn => fn(status())); }
// iPhone 静音键默认会让 InnerAudioContext 完全无声，看起来像“语音打不开”。
function configure() {
  if (configured) return; configured = true;
  if (wx.setInnerAudioOption) wx.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: true, fail() {} });
}
function ensureMusic() {
  if (music) return;
  configure();
  try { const saved = wx.getStorageSync('dddrunk-music-volume'); if (typeof saved === 'number') volume = Math.max(0,Math.min(1,saved)); } catch (_) {}
  music = wx.createInnerAudioContext(); music.src = '/assets/audio/after-hours.mp3'; music.loop = true; music.volume = volume;
  music.onPlay(() => { if(!wanted){music.pause();return;}pending=false; playing=true; publish(); });
  music.onPause(() => { pending=false; playing=false; publish(); });
  music.onStop(() => { pending=false; playing=false; publish(); });
  music.onError(() => { pending=false; playing=false; publish(); wx.showToast({title:E.i18n.t('音乐暂时无法播放，请点击重试。'),icon:'none'}); });
}
function pauseMusic() { wanted=false; if (music) music.pause(); playing=false; pending=false; publish(); }
function toggleMusic() { ensureMusic(); if (playing || pending) return pauseMusic(); wanted=true; pending=true; publish(); music.play(); }
function setVolume(value) { volume=Math.max(0,Math.min(1,value)); if(music)music.volume=volume; try {wx.setStorageSync('dddrunk-music-volume',volume);}catch(_){} publish(); }
function stopSpeech() { speechTicket++; if(speech)speech.stop(); }
// 下载语音分包：小程序用分包异步化 require.async；wx.loadSubpackage 只在小游戏里存在（测试环境里用它模拟）。
function fetchPackage(name) {
  const loader=loaders[name];
  if(loader&&typeof require.async==='function')return loader();
  if(typeof wx.loadSubpackage==='function')return new Promise((resolve,reject)=>wx.loadSubpackage({name,success:resolve,fail:reject}));
  return Promise.reject(new Error('语音资源加载失败，请重试。'));
}
function loadPackage(name, quiet) {
  if(loaded.has(name))return Promise.resolve();
  if(loading.has(name))return loading.get(name);
  const promise=fetchPackage(name).then(()=>{loaded.add(name);loading.delete(name);},error=>{loading.delete(name);throw error;});
  loading.set(name,promise);
  if(!quiet&&wx.showLoading){wx.showLoading({title:E.i18n.t('正在加载语音…'),mask:false});promise.then(()=>wx.hideLoading&&wx.hideLoading(),()=>wx.hideLoading&&wx.hideLoading());}
  return promise;
}
function entry(text, locale) { return voices[locale+':'+text]; }
function available(text, locale) { return !!entry(text, locale) || provider.enabled; }
// 提前在后台下载本配方用到的语音分包，避免第一次朗读时等待。
function preload(texts, locale) {
  const names=[...new Set(texts.map(text=>entry(text,locale)).filter(Boolean).map(item=>item.package))];
  return Promise.all(names.map(name=>loadPackage(name,true).catch(()=>{})));
}
function ensureSpeech() {
  if(speech)return speech;
  configure();
  speech=wx.createInnerAudioContext();
  speech.onError(error=>{if(error&&error.errCode===-1)return;wx.showToast({title:E.i18n.t('语音播放失败，请重试。'),icon:'none'});});
  return speech;
}
function playSpeech(src, ticket) { if(ticket!==speechTicket)return; const audio=ensureSpeech(); audio.stop(); audio.src=src; audio.play(); }
async function speak(text, locale) {
  stopSpeech(); const ticket=speechTicket, recorded=entry(text,locale);
  try {
    if(recorded) { await loadPackage(recorded.package); playSpeech('/'+recorded.file,ticket); return; }
    if(!provider.enabled) throw new Error('这段自建文本没有离线录音。任意文本朗读需要在你的小程序账号中启用微信同声传译插件，步骤见导入说明；文字跟做仍可使用。');
    // The user enabled voice and confirmed the custom-text notice in the guide.
    const plugin=provider.create();
    const chunks=[]; let chunk='';
    for(const char of text) { if(encodeURIComponent(chunk+char).replace(/%[A-F\d]{2}/gi,'x').length>900){chunks.push(chunk);chunk='';} chunk+=char; }
    if(chunk)chunks.push(chunk);
    for(const content of chunks) {
      if(ticket!==speechTicket)return;
      const result=await new Promise((resolve,reject)=>plugin.textToSpeech({lang:locale==='en'?'en_US':'zh_CN',content,success:r=>r.retcode===0?resolve(r):reject(new Error('语音合成失败，请重试。')),fail:reject}));
      if(ticket!==speechTicket)return;
      playSpeech(result.filename,ticket);
      await new Promise(resolve=>{const end=()=>{speech.offEnded(end);speech.offStop(end);speech.offError(end);resolve();};speech.onEnded(end);speech.onStop(end);speech.onError(end);});
    }
  } catch(error) { if(ticket===speechTicket)throw error&&error.message&&!error.errMsg?error:new Error('语音资源加载失败，请重试。'); }
}
module.exports={status,toggleMusic,pauseMusic,setVolume,stopSpeech,speak,preload,available,configure,providerEnabled:provider.enabled,
  subscribe(fn){listeners.add(fn);fn(status());return()=>listeners.delete(fn);},pauseAll(){pauseMusic();stopSpeech();}};
