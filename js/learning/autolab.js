/* Tự học tự động.
   1) Mỗi lệnh kết thúc (lệnh thật trong Sổ lệnh, hoặc tín hiệu bảng đang theo dõi) được ghi vào phiên bản chiến lược đã tạo ra nó.
   2) Cứ đủ 10 kết quả MỚI: thắng ≥ 7/10 → giữ nguyên; thắng < 7/10 → tự học lại phiên bản đó (bộ học ở learner.js).
   3) Bộ học lưu bản ✓70% khi 10 lệnh kiểm chứng gần nhất thắng ≥ 7 (và lãi kỳ vọng dương), nhân bản ra bản mới học tiếp,
      đạt ≥ 9/10 thì lưu bản dự phòng ★90%. Bản ✓70% và ★90% xuất hiện ngay trong ô Chiến lược ở Bảng tín hiệu. */
const AutoLab={
  on:Store.get('autolab',true),queue:[],running:null,lines:Store.get('autolabLog',[]),
  say(m){this.lines.unshift({t:Date.now(),m});if(this.lines.length>120)this.lines.length=120;Store.set('autolabLog',this.lines);if(typeof Lab!=='undefined')Lab.renderLog()},
  stats(v){const tr=v.track||[],fresh=tr.length-(v.mark||0),last=tr.slice(-10);return{total:tr.length,fresh,last:last.length,w:last.filter(x=>x.win).length,all:tr.filter(x=>x.win).length}},
  // Ghi một kết quả cho phiên bản chiến lược (không ghi trùng)
  rec(vid,key,win,rr,src){
    const v=Strat.byId(vid);if(!v)return;v.track=v.track||[];if(v.track.some(x=>x.k===key))return;
    v.track.push({k:key,t:Date.now(),win:!!win,rr:+rr||0,src});if(v.track.length>300){v.track.splice(0,v.track.length-300);v.mark=Math.max(0,(v.mark||0)-1)}
    Strat.save();this.check(v);if(typeof Lab!=='undefined')Lab.render()},
  check(v){
    const s=this.stats(v);if(s.fresh<10)return;
    v.mark=v.track.length;Strat.save();
    const w=v.track.slice(-10).filter(x=>x.win).length;
    if(w>=7){this.say(`${Strat.label(v)}: 10 lệnh gần nhất thắng ${w}/10 (≥ 70%). Giữ nguyên và tiếp tục theo dõi.`);return}
    this.say(`${Strat.label(v)}: 10 lệnh gần nhất chỉ thắng ${w}/10 (< 70%). ${this.on?'Bắt đầu tự học lại.':'Tự học đang tắt, bật ở trang Chiến lược để bảng tự học lại.'}`);
    Notify.push('lab',`<b>${esc(Strat.label(v))}</b> chỉ thắng ${w}/10 lệnh gần nhất.${this.on?' Đang tự học lại.':''}`,`🧪 ${Strat.label(v)}: 10 lệnh gần nhất thắng ${w}/10 (< 70%).${this.on?' Bảng đang tự học lại chiến lược này.':''}`,'dn');
    if(this.on)this.enqueue(v.id)},
  enqueue(id){if(this.running!==id&&!this.queue.includes(id))this.queue.push(id);if(typeof Lab!=='undefined')Lab.render();this.next()},
  coins(v){
    const im=Strat.impl[v.base];if(im.only)return im.only.slice();
    const fromTrack=(v.track||[]).map(x=>x.k.split('|')[0]),focus=Sig.focus.filter(s=>Strat.forCoin(s).id===v.id);
    return[...new Set([...fromTrack.reverse(),...focus,'BTCUSDT','ETHUSDT','SOLUSDT'])].slice(0,6)},
  async next(){
    if(this.running||!this.queue.length||Learn.running)return;
    const id=this.queue.shift(),v=Strat.byId(id);if(!v)return this.next();
    this.running=id;Lab.render();
    const before=new Set(Strat.list.filter(x=>x.status==='saved70'||x.status==='saved90').map(x=>x.id)),im=Strat.impl[v.base],tf=im.tf||UI.tf();
    try{await Learn.run(id,{coins:this.coins(v),tf,iters:8},m=>this.say(m))}
    finally{
      this.running=null;
      for(const x of Strat.list.filter(x=>(x.status==='saved70'||x.status==='saved90')&&!before.has(x.id)))
        Notify.push('lab',`Tự học đã lưu <b>${esc(Strat.label(x))}</b>. Chọn được ở Bảng tín hiệu.`,`🧪 TỰ HỌC: đã lưu ${Strat.label(x)}. Bạn có thể chọn bản này ở ô Chiến lược trên Bảng tín hiệu.`,'up');
      UI.fillStrat();Ana.fillStrats();Lab.render();this.next()}}
};
