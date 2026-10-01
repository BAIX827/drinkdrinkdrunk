const M = require('../../shared/media');
Component({ properties:{locale:String},data:{playing:false,pending:false,volume:25},lifetimes:{attached(){this.unsubscribe=M.subscribe(s=>this.setData({...s,volume:Math.round(s.volume*100)}));},detached(){if(this.unsubscribe)this.unsubscribe();}},methods:{toggle(){M.toggleMusic();},volume(e){M.setVolume(Number(e.detail.value)/100);}} });
