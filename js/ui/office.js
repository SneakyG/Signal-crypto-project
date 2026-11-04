/* Trang Văn phòng: cơ sở giao dịch coin dạng game. Mỗi nhân viên (nhân vật pixel tự vẽ) phụ trách một bộ phận thật của bảng
   và nói đúng việc bộ phận đó ĐANG làm, lấy từ dữ liệu thật (quét coin, tín hiệu, Sổ lệnh, rủi ro, tự học, tin tức, Telegram, đồng bộ, Binance).
   Không có số liệu giả: nhân viên nào không có việc thì ngồi nghỉ, có sự cố thì giơ dấu "!". Chạm vào nhân viên để xem chi tiết. */
const Office={
  built:false,timer:null,prevLog:'',
  // ---------- Nhân vật pixel 12×15, vẽ bằng SVG ----------
  BODY:[
    '....HHHH....','...HHHHHH...','...HSSSSH...','...SESSES...','...SSSSSS...','....SMMS....','.....SS.....',
    '...BBBBBB...','..BBBTBBBB..','..SBBTBBBS..','..SBBTBBBS..','...BBBBBB...','...PP..PP...','...PP..PP...','...KK..KK...'],
  sprite(c,px=4){
    const P={H:c.hair,S:c.skin,E:'#1b1f2a',M:'#b4535a',B:c.shirt,T:c.tie||c.shirt,P:c.pants||'#2b3350',K:'#151a26'};
    let r='';this.BODY.forEach((row,y)=>[...row].forEach((ch,x)=>{if(P[ch])r+=`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${P[ch]}"/>`}));
    const A=c.acc||'';
    if(A.includes('glasses'))r+='<rect x="3" y="3" width="2.6" height="1" fill="none" stroke="#e8edf5" stroke-width=".35"/><rect x="6.4" y="3" width="2.6" height="1" fill="none" stroke="#e8edf5" stroke-width=".35"/>';
    if(A.includes('headset'))r+='<path d="M2.6 4.2 V2.2 Q6 -.6 9.4 2.2 V4.2" fill="none" stroke="#e8edf5" stroke-width=".5"/><rect x="2.1" y="3.4" width="1" height="1.6" fill="#38d6b4"/><rect x="8.9" y="3.4" width="1" height="1.6" fill="#38d6b4"/>';
    if(A.includes('cap'))r+=`<rect x="3" y="0" width="6" height="2" fill="${c.capc||'#ef4444'}"/><rect x="8" y="1.4" width="2.6" height=".7" fill="${c.capc||'#ef4444'}"/>`;
    if(A.includes('coat'))r+='<rect x="2" y="7" width="2" height="5" fill="#eef2f7"/><rect x="8" y="7" width="2" height="5" fill="#eef2f7"/>';
    if(A.includes('bun'))r+=`<rect x="5" y="-1" width="2" height="1.4" fill="${c.hair}"/>`;
    if(A.includes('helmet'))r+='<rect x="3" y="0" width="6" height="1.6" fill="#facc15"/><rect x="5.4" y="-.6" width="1.2" height=".8" fill="#facc15"/>';
    if(A.includes('beret'))r+='<rect x="2.6" y=".2" width="6.4" height="1.4" rx=".6" fill="#7c3aed"/>';
    return`<svg class="spr" viewBox="0 -1 12 16" width="${12*px}" height="${16*px}" shape-rendering="crispEdges">${r}</svg>`},
  // ---------- Đội ngũ: mỗi người gắn với một bộ phận thật ----------
  TEAM:[
    {id:'radar',room:'radar',name:'Tí Radar',role:'Trinh sát thị trường',go:'main',look:{hair:'#3b2a1a',skin:'#f1c27d',shirt:'#0ea5e9',acc:'headset'},screen:'radar',
     job:'Quét 30 coin phổ biến mỗi 5 phút, chấm điểm từng coin bằng backtest và chọn ra các coin đáng theo dõi nhất.'},
    {id:'rsi2',room:'ana',name:'Cô Ngọc RSI',role:'Chuyên viên RSI(2) Connors',go:'main',look:{hair:'#111827',skin:'#f6d0b1',shirt:'#f59e0b',acc:'glasses bun'},screen:'rsi',
     job:'Theo dõi các coin dùng RSI(2): chờ RSI(2) cực đoan đúng chiều xu hướng 4h/1D, giá cùng phía SMA200 (khung 1h).'},
    {id:'smc',room:'ana',name:'Anh Minh SMC',role:'Chuyên viên SMC / ICT',go:'main',look:{hair:'#4b2e1e',skin:'#e0ac69',shirt:'#8b5cf6',acc:'glasses'},screen:'zone',
     job:'Mô hình Unicorn: thuận cấu trúc 1H/4H, trong killzone chờ quét đáy/đỉnh phiên Á hoặc giờ trước tại vùng OB/FVG khung lớn → MSS thân lớn để lại FVG → lệnh chờ ở mép FVG trùng Breaker Block. TP1 1–1,5R, TP2 2,5–3R.'},
    {id:'btc100',room:'ana',name:'Xạ thủ Bảo',role:'Xạ thủ ICT BTC Scalper v2',go:'main',look:{hair:'#0f172a',skin:'#c68642',shirt:'#ef4444',acc:'cap',capc:'#111827'},screen:'scope',
     job:'Lướt sóng BTC 5m theo ICT 2022: trong killzone, chờ quét thanh khoản tại vùng OB/FVG 1h → MSS thân lớn để lại FVG → lệnh chờ ở mép FVG. Rủi ro 1%/lệnh, ký quỹ ≤ 20% tài khoản.'},
    {id:'trader',room:'desk',name:'Bé Lan Đặt Lệnh',role:'Nhân viên đặt lệnh',go:'book',look:{hair:'#7c2d12',skin:'#f1c27d',shirt:'#22c55e',acc:'headset'},screen:'orders',
     job:'Ghi nhận lệnh vào Sổ lệnh (bấm tay hoặc tự động), theo dõi khớp lệnh realtime 3 giây/lần. Không gửi lệnh lên sàn.'},
    {id:'risk',room:'desk',name:'Chú Hùng Rủi Ro',role:'Quản lý rủi ro',go:'main',look:{hair:'#9ca3af',skin:'#e0ac69',shirt:'#1f2937',tie:'#ef4444',acc:'glasses'},screen:'gauge',
     job:'Giữ tổng ký quỹ không vượt vốn, mỗi lệnh thua tối đa đúng % rủi ro đã đặt, thanh lý luôn xa hơn cắt lỗ.'},
    {id:'acc',room:'desk',name:'Cô Mai Kế Toán',role:'Kế toán',go:'book',look:{hair:'#1f2937',skin:'#f6d0b1',shirt:'#e5e7eb',tie:'#0ea5e9',acc:'bun'},screen:'pnl',
     job:'Tính lãi/lỗ realtime, chốt sổ khi lệnh đóng, đếm thắng (chạm TP2) / hòa vốn (BE) / thua, xuất Excel và khóa sổ khi qua ngày.'},
    {id:'lab',room:'lab',name:'Giáo sư Tuấn',role:'Trưởng phòng Tự học',go:'lab',look:{hair:'#e5e7eb',skin:'#f1c27d',shirt:'#e5e7eb',tie:'#7c3aed',acc:'coat glasses'},screen:'flask',
     job:`Ghi kết quả từng lệnh cho mỗi phiên bản chiến lược; đủ ${Strat.N} lệnh mà thua quá 30 thì tự học lại, đạt mốc thì lưu bản ✓70% / ★90%.`},
    {id:'calib',room:'lab',name:'Kỹ sư Phát',role:'Kỹ sư SL/TP',go:'set',look:{hair:'#3b2a1a',skin:'#c68642',shirt:'#f97316',acc:'helmet'},screen:'tune',
     job:'Tinh chỉnh cắt lỗ và TP2 (3–4R) theo thống kê riêng từng coin; chỉ dùng khi kết quả mới nhất cũng tốt hơn bản gốc.'},
    {id:'news',room:'comm',name:'Phóng viên Thảo',role:'Phóng viên tin tức',go:'news',look:{hair:'#b45309',skin:'#f6d0b1',shirt:'#ec4899',acc:'beret'},screen:'news',
     job:'Đọc tin từ các trang crypto lớn, chấm tin tốt/xấu và gắn tin với coin liên quan.'},
    {id:'post',room:'comm',name:'Bưu tá Tèo',role:'Liên lạc Telegram',go:'set',look:{hair:'#111827',skin:'#e0ac69',shirt:'#2563eb',acc:'cap',capc:'#2563eb'},screen:'mail',
     job:'Gửi cảnh báo qua Telegram: tín hiệu mới, khớp lệnh, chạm TP1, đóng lệnh, tự học.'},
    {id:'sync',room:'comm',name:'Thủ kho Vy',role:'Thủ kho đồng bộ (GitHub)',go:'set',look:{hair:'#0f172a',skin:'#f1c27d',shirt:'#14b8a6',acc:'glasses bun'},screen:'cloud',
     job:'Cất Sổ lệnh, bộ đếm và chiến lược vào kho GitHub Gist mỗi 20 giây để máy tính và điện thoại giống nhau.'},
    {id:'guard',room:'radar',name:'Bác Bảo Vệ Sơn',role:'Bảo vệ cổng Binance',go:'main',look:{hair:'#374151',skin:'#c68642',shirt:'#334155',acc:'cap',capc:'#334155'},screen:'shield',
     job:'Canh số lượng yêu cầu gửi Binance (giữ dưới ~45% giới hạn) để không bị chặn IP; bị chặn thì đóng cổng chờ hết hạn.'}
  ],
  ROOMS:[['ana','📈 Phòng Phân tích'],['desk','💼 Sàn Lệnh'],['radar','📡 Radar & Cổng Binance'],['lab','🧪 Phòng Tự học'],['comm','📨 Phòng Liên lạc']],
  // ---------- Đọc dữ liệu thật → trạng thái + câu nói + chỉ số ----------
  coinsOf(base){return Sig.focus.filter(s=>{try{return Strat.forCoin(s).base===base}catch(e){return false}})},
  sigOf(list){return list.filter(s=>{const x=Sig.state[s];return x&&x.ok&&x.tr&&Book.isOpen(x.tr.L)})},
  read(id){
    const C=s=>Fmt.coin(s),bal=UI.bal()||1,open=Book.data.orders.filter(Book.isOpen),T=Date.now();
    switch(id){
      case'radar':{const n=Scan.universe().length;
        if(Scan.busy)return{st:'busy',say:`Đang quét ${Scan.done||0}/${Scan.total||n} coin…`,kv:[['Đang theo dõi',Sig.focus.length+' coin'],['Lần quét trước',Scan.at?Fmt.hm(Scan.at):'chưa']]};
        return{st:Scan.at?'ok':'idle',say:Scan.at?`Xong! ${Sig.focus.length} coin tốt nhất: ${Sig.focus.slice(0,4).map(C).join(', ')}${Sig.focus.length>4?'…':''}`:'Chờ lượt quét đầu tiên…',
          kv:[['Coin quét',n],['Đang theo dõi',Sig.focus.length],['Quét lại lúc',Scan.at?Fmt.hm(Scan.at+3e5):'-']]}}
      case'rsi2':case'smc':case'btc100':{
        const cs=[...new Set([...this.coinsOf(id),...(id==='btc100'?this.coinsOf('ict2'):[])])],sg=this.sigOf(cs),go=sg.filter(s=>Sig.canPlace(s));
        if(!cs.length)return{st:'idle',say:id==='btc100'?'Chỉ làm việc khi chọn ICT BTC Scalper v2 (BTC 5m). Đang nghỉ.':'Hiện không coin nào giao cho tôi.',kv:[['Coin phụ trách',0]]};
        if(go.length)return{st:'happy',say:`Có kèo! ${go.map(s=>`${C(s)} ${Sig.state[s].tr.sig.side}`).join(', ')} đặt được ngay.`,kv:[['Coin phụ trách',cs.map(C).join(', ')],['Tín hiệu',sg.length],['Đặt được ngay',go.length]]};
        if(sg.length)return{st:'busy',say:`Đang canh ${sg.map(C).join(', ')}: tín hiệu đã có lệnh hoặc chưa đủ điều kiện vào.`,kv:[['Coin phụ trách',cs.map(C).join(', ')],['Tín hiệu',sg.length]]};
        const best=cs.map(s=>({s,x:Sig.state[s]})).filter(o=>o.x&&o.x.ok&&o.x.an).sort((a,b)=>b.x.an.score-a.x.an.score)[0];
        return{st:Sig.busy?'busy':'ok',say:best?`Chưa có kèo. Gần nhất: ${C(best.s)} đạt ${best.x.an.score}/${best.x.an.checks.length} điều kiện.`:'Đang đọc biểu đồ…',kv:[['Coin phụ trách',cs.map(C).join(', ')],['Tín hiệu',0]]}}
      case'trader':{const p=open.filter(o=>o.st==='P').length,f=open.filter(Book.isFilled).length,auto=Store.get('auto',false),idle=typeof Sync!=='undefined'&&Sync.idle();
        const kv=[['Tự động đặt lệnh',auto?(idle?'bật (máy phụ: không đặt)':'BẬT'):'tắt'],['Chờ khớp',p],['Đang chạy',f],['Chỗ trống',Math.max(0,UI.slots()-open.length)+'/'+UI.slots()]];
        if(!open.length)return{st:auto&&!idle?'ok':'idle',say:auto&&!idle?'Tự động đang bật, có tín hiệu là tôi ghi lệnh ngay.':'Chưa có lệnh. Bấm Đặt lệnh hoặc bật tự động nhé.',kv};
        return{st:'busy',say:`Đang giữ ${open.length} lệnh: ${p} chờ khớp, ${f} đã khớp.`,kv}}
      case'risk':{const m=Book.marginUsed(),r=open.reduce((a,o)=>a+Book.riskNow(o),0),mp=m/bal*100,rp=r/bal*100;
        const kv=[['Ký quỹ đang giữ',`$${m.toFixed(2)} (${mp.toFixed(0)}% vốn)`],['Có thể mất nếu chạm hết SL',`$${r.toFixed(2)} (${rp.toFixed(1)}%)`],['Rủi ro mỗi lệnh',UI.risk()+'% vốn']];
        if(mp>=90||rp>=25)return{st:'alert',say:`Cẩn thận! ${mp>=90?`Ký quỹ đã dùng ${mp.toFixed(0)}% vốn.`:`Nếu mọi lệnh chạm cắt lỗ sẽ mất ${rp.toFixed(1)}% vốn.`}`,kv};
        return{st:open.length?'busy':'ok',say:open.length?`Ổn. Ký quỹ ${mp.toFixed(0)}% vốn, rủi ro mở ${rp.toFixed(1)}%.`:'Vốn an toàn, chưa có rủi ro mở.',kv}}
      case'acc':{const S=Book.stats(Book.data.orders),lv=Book.data.orders.filter(Book.isFilled).map(o=>Book.live(o)).filter(Boolean).reduce((a,x)=>a+x.pnl,0);
        const kv=[['Đã chốt hôm nay',Fmt.sgn(S.net)],['Đang chạy (tạm tính)',Fmt.sgn(lv)],['Thắng / BE / thua',`${S.w} / ${S.be} / ${S.l}`],['Tỉ lệ thắng',S.rate.toFixed(0)+'%']];
        if(!S.cl&&!lv)return{st:'idle',say:'Sổ hôm nay còn trống.',kv};
        return{st:S.net+lv>=0?'happy':'busy',say:`Hôm nay ${Fmt.sgn(S.net)} đã chốt, ${Fmt.sgn(lv)} đang chạy. Thắng ${S.w}, hòa vốn ${S.be}, thua ${S.l}.`,kv}}
      case'lab':{const vs=Strat.list.filter(v=>v.status!=='learning'),best=vs.map(v=>({v,s:AutoLab.stats(v)})).sort((a,b)=>b.s.fresh-a.s.fresh)[0];
        const kv=[['Tự học tự động',AutoLab.on?'bật':'tắt'],['Hàng chờ',AutoLab.queue.length],['Tiến độ cao nhất',best?`${Strat.label(best.v)}: ${Math.min(best.s.fresh,Strat.N)}/${Strat.N}`:'-'],['Bản đã lưu',Strat.list.filter(v=>v.status==='saved70'||v.status==='saved90').length]];
        if(AutoLab.running){const v=Strat.byId(AutoLab.running);return{st:'busy',say:`Đang tự học ${v?Strat.label(v):''}… ${AutoLab.lines[0]?AutoLab.lines[0].m.slice(0,70):''}`,kv}}
        return{st:AutoLab.on?'ok':'idle',say:best&&best.s.total?`Đang ghi kết quả: ${Strat.label(best.v)} ${Math.min(best.s.fresh,Strat.N)}/${Strat.N} lệnh mới.`:'Chờ lệnh đóng để ghi kết quả.',kv}}
      case'calib':{const R=Object.values(Calib.res),u=R.filter(r=>r.use).length;
        return{st:Calib.busy?'busy':R.length?'ok':'idle',say:Calib.busy?'Đang thử các mức cắt lỗ và TP2 cho từng coin…':R.length?`Đã tinh chỉnh ${R.length} coin, ${u} coin dùng mức riêng.`:'Chờ Radar quét xong để tinh chỉnh.',
          kv:[['Coin đã tinh chỉnh',R.length],['Dùng mức riêng',u],['TP1 / TP2',`${Strat.TP().t1}R / ${Strat.TP().t2==='auto'?'3–4R':Strat.TP().t2+'R'}`]]}}
      case'news':{const I=News.items,up=I.filter(x=>x.tone==='up').length,dn=I.filter(x=>x.tone==='dn').length;
        if(!I.length)return{st:News.err?'alert':'busy',say:News.err?'Không lấy được tin, đang thử lại.':'Đang đọc báo…',kv:[]};
        return{st:'ok',say:`Tin mới: “${I[0].title.slice(0,80)}${I[0].title.length>80?'…':''}”`,kv:[['Số tin',I.length],['Tin tốt / xấu',`${up} / ${dn}`],['Cập nhật',News.at?Fmt.hm(News.at):'-']]}}
      case'post':{const ok=!!(TG.cfg().t&&TG.cfg().c),L=Book.data.log,idle=typeof Sync!=='undefined'&&Sync.idle();
        return{st:!ok?'idle':idle?'idle':'ok',say:!ok?'Chưa có địa chỉ Telegram. Vào Cài đặt để nhập bot.':idle?'Máy phụ: để máy chính gửi tin.':L[0]?`Vừa báo: ${L[0].text.slice(0,70)}`:'Sẵn sàng đưa thư.',kv:[['Telegram',ok?'đã cài':'chưa cài'],['Thông báo hôm nay',L.length]]}}
      case'sync':{if(typeof Sync==='undefined'||!Sync.on())return{st:'idle',say:'Chưa có chìa khóa kho GitHub. Mỗi máy đang giữ sổ riêng.',kv:[['Đồng bộ','tắt']]};
        return{st:Sync.err?'alert':Sync.busy?'busy':'ok',say:Sync.err?Sync.err:`Đã cất kho lúc ${Sync.at?Fmt.hm(Sync.at):'…'}.`,kv:[['Máy này',Sync.main()?'máy chính':'máy phụ'],['Lần cuối',Sync.at?Fmt.hm(Sync.at):'-']]}}
      case'guard':{const b=Net.banned(),age=Data.pxAt?Math.round((T-Data.pxAt)/1000):null;
        if(b.length)return{st:'alert',say:`Binance chặn tạm (${b[0].code}). Đóng cổng ${Math.ceil(b[0].left/1000)} giây.`,kv:[['Máy chủ',b[0].host]]};
        const used=Object.values(Net.h).reduce((a,x)=>a+x.used.filter(u=>T-u.t<6e4).reduce((q,u)=>q+u.w,0),0);
        return{st:age!=null&&age<15?'ok':'busy',say:age!=null?`Cổng mở. Giá cập nhật ${age} giây trước.`:'Đang mở cổng…',kv:[['Trọng số/phút',`${used} / ${Net.LIMIT}`],['Giá mới nhất',age!=null?age+' giây trước':'-']]}}}
    return{st:'idle',say:'',kv:[]}},
  // ---------- Màn hình trên bàn ----------
  screen(k){
    const s={radar:'<div class="scr-radar"><i></i></div>',rsi:'<svg viewBox="0 0 40 20"><polyline points="0,12 5,6 9,15 14,4 19,17 24,8 29,14 34,3 40,10" class="ln"/></svg>',
      zone:'<div class="scr-zone"><b></b><b></b><b></b></div>',scope:'<div class="scr-scope"></div>',orders:'<div class="scr-rows"><b></b><b></b><b></b></div>',
      gauge:'<div class="scr-gauge"><i></i></div>',pnl:'<svg viewBox="0 0 40 20"><polyline points="0,16 8,13 14,14 20,9 27,10 33,5 40,3" class="ln up"/></svg>',
      flask:'<div class="scr-flask">⚗️</div>',tune:'<div class="scr-tune"><b></b><b></b><b></b></div>',news:'<div class="scr-rows nw"><b></b><b></b><b></b></div>',
      mail:'<div class="scr-mail">✉️</div>',cloud:'<div class="scr-mail">☁️</div>',shield:'<div class="scr-mail">🛡️</div>'};return s[k]||''},
  build(){
    const el=$('office');if(!el)return;
    el.innerHTML=`<div class="of-mode"><div class="seg" id="ofmode"><button data-mode="3d">🧊 Văn phòng 3D</button><button data-mode="2d">🎮 Bản 2D nhẹ</button></div><span class="mut" id="ofnote"></span></div>
      <div class="o3" id="of3d"></div><div id="of2d"><div class="of-top"><div class="of-win" id="ofwin"><i class="sun"></i><i class="cl c1"></i><i class="cl c2"></i><span class="city"></span></div>
        <div class="of-sum"><b>Sàn giao dịch Tín hiệu</b><span id="ofclock"></span><div class="of-kpi" id="ofkpi"></div></div></div>
      <div class="of-floor">${this.ROOMS.map(([r,t])=>`<section class="of-room r-${r}"><h3>${t}</h3><div class="of-staff">${this.TEAM.filter(m=>m.room===r).map(m=>`
        <button class="of-desk" data-of="${m.id}" id="of-${m.id}">
          <div class="of-bub"><span></span></div>
          <div class="of-chr">${this.sprite(m.look,5)}<i class="of-fx"></i></div>
          <div class="of-tbl"><div class="of-mon">${this.screen(m.screen)}</div></div>
          <div class="of-name"><b>${m.name}</b><small>${m.role}</small></div><i class="of-led"></i></button>`).join('')}</div></section>`).join('')}</div>
      </div><section class="of-feed"><h3>📢 Loa thông báo</h3><div id="offeed"></div></section>`;
    $('ofmode').onclick=e=>{const b=e.target.closest('[data-mode]');if(b){Store.set('ofmode',b.dataset.mode);this.mode()}};
    el.addEventListener('click',e=>{const d=e.target.closest('[data-of]');if(d)this.detail(d.dataset.of)});
    this.built=true},
  sky(){const h=new Date().getHours(),w=$('ofwin');if(!w)return;w.dataset.t=h<5||h>=19?'night':h<7?'dawn':h<17?'day':'dusk'},
  WHO:{place:'trader',cancel:'trader',cut:'trader',fill:'trader',tp1:'acc',close:'acc',signal:'radar',lab:'lab'},
  update(){
    if(!this.built)this.build();
    for(const m of this.TEAM){const d=$('of-'+m.id);if(!d)continue;let r;try{r=this.read(m.id)}catch(e){r={st:'idle',say:'…',kv:[]}}
      if(d.dataset.st!==r.st){d.dataset.st=r.st}
      const b=d.querySelector('.of-bub span');if(b.textContent!==r.say)b.textContent=r.say;m.last=r}
    const S=Book.stats(Book.data.orders),open=Book.data.orders.filter(Book.isOpen).length;
    put($('ofkpi'),`<span>💰 ${Fmt.sgn(S.net)}</span><span>📂 ${open} lệnh mở</span><span>🏆 ${S.w} thắng · ${S.be} BE · ${S.l} thua</span><span>👥 ${this.TEAM.filter(m=>m.last&&(m.last.st==='busy'||m.last.st==='happy')).length}/${this.TEAM.length} đang làm</span>`);
    $('ofclock').textContent='Ca trực '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});this.sky();
    const L=Book.data.log.slice(0,10),sig=L.map(l=>l.t).join();
    if(sig!==this.prevLog){this.prevLog=sig;
      put($('offeed'),L.length?L.map(l=>{const m=this.TEAM.find(x=>x.id===(this.WHO[l.kind]||'acc'));return`<p><time>${Fmt.hm(l.t)}</time><span class="of-mini">${this.sprite(m.look,2)}</span><b>${m.name}:</b> ${esc(l.text)}</p>`}).join('')
        :'<p class="mut">Văn phòng đang yên ắng. Khi có lệnh, khớp lệnh, chạm TP1 hay tự học, mọi người sẽ báo ở đây.</p>')}},
  detail(id){
    const m=this.TEAM.find(x=>x.id===id);if(!m)return;const r=this.read(id),stt={busy:'Đang làm việc',happy:'Có tin vui',alert:'Cần chú ý',ok:'Sẵn sàng',idle:'Đang nghỉ'};
    const nav={main:'Bảng tín hiệu',book:'Sổ lệnh',lab:'Chiến lược',news:'Tin tức',set:'Cài đặt'};
    Modal.open(`${m.name} · ${m.role}`,`<div class="of-det"><div class="of-big st-${r.st}">${this.sprite(m.look,9)}</div><div>
      <span class="st ${r.st==='alert'?'S':r.st==='happy'?'T':r.st==='busy'?'F':''}">${stt[r.st]}</span>
      <p class="of-say">“${esc(r.say)}”</p><h3>Nhiệm vụ</h3><p class="note">${esc(m.job)}</p>
      ${r.kv.length?`<div class="of-kv">${r.kv.map(([k,v])=>`<div><small>${esc(k)}</small><b>${esc(String(v))}</b></div>`).join('')}</div>`:''}
      <button class="bx" data-ofgo="${m.go}" style="margin-top:14px">Đi tới ${nav[m.go]} →</button></div></div>`);
    const b=document.querySelector('[data-ofgo]');if(b)b.onclick=()=>{Modal.close();const n=document.querySelector(`#nav button[data-p="${m.go}"]`);if(n)n.click()}},
  // Chọn 3D (mặc định) hoặc 2D; 3D lỗi (không có WebGL, không tải được thư viện) thì tự về 2D
  async mode(){
    const m=Store.get('ofmode','3d');document.querySelectorAll('#ofmode button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
    $('of3d').hidden=m!=='3d';$('of2d').hidden=m==='3d';$('ofnote').textContent='';
    if(m!=='3d'){if(typeof Office3D!=='undefined')Office3D.stop();return}
    try{await Office3D.mount($('of3d'))}catch(e){console.warn(e);$('of3d').hidden=true;$('of2d').hidden=false;$('ofnote').textContent='Không mở được 3D ('+(e&&e.message||'lỗi')+'), đang dùng bản 2D.';
      document.querySelectorAll('#ofmode button').forEach(b=>b.classList.toggle('on',b.dataset.mode==='2d'))}},
  show(){this.update();this.mode();clearInterval(this.timer);this.timer=setInterval(()=>{if($('p-office')&&$('p-office').classList.contains('on'))this.update();else clearInterval(this.timer)},2000)}
};
