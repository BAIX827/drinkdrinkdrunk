const E = require('./engine'), voices = require('./voice-index'), provider = require('./voice-provider');
let music, speech, playing = false, pending = false, volume = .25, speechTicket = 0, wanted = false;
const listeners = new Set(), loaded = new Set();
function status() { return { playing, pending, volume }; }
function publish() { listeners.forEach(fn => fn(status())); }
function ensureMusic() {
  if (music) return;
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
function loadPackage(name) { if(loaded.has(name))return Promise.resolve(); return new Promise((resolve,reject)=>wx.loadSubpackage({name,success:()=>{loaded.add(name);resolve();},fail:reject})); }
function playSpeech(src, ticket) { if(ticket!==speechTicket)return; if(!speech){speech=wx.createInnerAudioContext();speech.onError(()=>wx.showToast({title:E.i18n.t('语音播放失败，请重试。'),icon:'none'}));} speech.src=src;speech.play(); }
async function speak(text, locale) {
  stopSpeech(); const ticket=speechTicket, entry=voices[locale+':'+text];
  try {
    if(entry) { await loadPackage(entry.package); playSpeech('/'+entry.file,ticket); return; }
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
  } catch(error) { if(ticket===speechTicket)throw error.message?error:new Error('语音资源加载失败，请重试。'); }
}
module.exports={status,toggleMusic,pauseMusic,setVolume,stopSpeech,speak,providerEnabled:provider.enabled,
  subscribe(fn){listeners.add(fn);fn(status());return()=>listeners.delete(fn);},pauseAll(){pauseMusic();stopSpeech();}};
