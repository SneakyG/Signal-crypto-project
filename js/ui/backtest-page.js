/* Trang Backtest: "Thử nghiệm chiến lược" – trả lời bằng TIỀN câu hỏi:
   "Nếu tôi giữ đúng bộ quy tắc này (rủi ro X%, chốt Y% ở TP1, phần còn lại ở TP2) trong N lệnh vừa qua thì túi tiền ra sao?"

   LOGIC CỐT LÕI (đơn vị R: 1R = số tiền rủi ro của một lệnh)
   ─ Mỗi lệnh chỉ có 4 kết cục, tính ra R theo quy tắc chốt lời (f = phần chốt ở TP1, ví dụ 50% → f = 0,5):
       Chạm TP2            → f×TP1 + (1−f)×TP2        (1,5R / 3R, f=0,5 → +2,25R)   = THẮNG
       Chạm TP1 rồi về giá vào → f×TP1                  (→ +0,75R)                    = HÒA VỐN (BE)
       Cắt sớm             → trước TP1: R lúc thoát; sau TP1: f×TP1 + (1−f)×R lúc thoát
       Chạm cắt lỗ         → −1R                                                     = THUA
   ─ Tiền mỗi lệnh = R × (vốn × rủi ro%). Bật "lãi kép" thì vốn = số dư hiện tại, tắt thì luôn là vốn ban đầu.
   ─ Nguồn chuỗi lệnh:
       • Lịch sử thật: chạy lại chiến lược trên nến thật Binance với đúng TP1/TP2 bạn chọn (giá có chạm hay không là thật).
       • Giả định tỉ lệ: bạn tự đặt % chạm TP2 và % hòa vốn; bảng tung xúc xắc 1.000 lần để thấy kết quả tốt / thường / xấu.
       • Sổ lệnh của tôi: dùng đúng kết quả R các lệnh bạn đã đóng.
   ─ Chuỗi đen = số lệnh THUA liên tiếp dài nhất; một lệnh thắng hoặc hòa vốn làm đứt chuỗi. */
const Sim={
  st:{src:'hist',cap:1000,risk:5,t1:1.5,f:50,t2:3,n:50,pw:25,pb:30,comp:true,fee:true},
  PRESETS:[['now','Theo Cài đặt hiện tại'],['std','Chuẩn · TP1 1,5R chốt 50% · TP2 3R'],['safe','An toàn · TP1 1R chốt 70% · TP2 2R'],['far','Đánh xa · TP1 2R chốt 30% · TP2 4R'],['last','Giống lệnh gần nhất']],
  init(){
    const s=Store.get('sim',null);if(s)Object.assign(this.st,s);
    const el=$('simx');if(!el)return;
    el.innerHTML=`
    <section class="sim-card s1"><div class="sim-h"><span class="sim-n">1</span><div><h2>Chọn thông số</h2><p>Kéo thanh trượt, số tiền đổi ngay bên dưới.</p></div></div>
      <div class="sim-row"><label class="sim-l">Dữ liệu dùng để thử</label>
        <div class="seg sim-seg" id="simsrc">${[['hist','📜 Lịch sử thật của chiến lược'],['odds','🎲 Tự đặt tỉ lệ thắng'],['book','📒 Sổ lệnh của tôi']].map(([k,t])=>`<button data-src="${k}">${t}</button>`).join('')}</div></div>
      <div class="sim-row sim-hist"><div class="sim-2"><label>Chiến lược<select id="simstrat"></select></label><label>Coin<select id="simcoin"></select></label></div></div>
      <div class="sim-row sim-odds">
        ${this.slider('pw','Lệnh chạm TP2 (thắng)',0,90,5,'%')}${this.slider('pb','Lệnh chạm TP1 rồi về giá vào (hòa vốn)',0,90,5,'%')}
        <p class="sim-hint" id="simodds"></p></div>
      <div class="sim-row"><label class="sim-l">Bộ quy tắc chốt lời / cắt lỗ</label><div class="sim-chips" id="simpre">${this.PRESETS.map(([k,t])=>`<button class="chip2" data-pre="${k}">${t}</button>`).join('')}</div></div>
      <div class="sim-grid">
        <label class="sim-cap">Vốn ban đầu<span class="sim-dollar"><b>$</b><input id="simcap" type="number" min="10" step="10"></span></label>
        ${this.slider('risk','Rủi ro mỗi lệnh',0.5,10,0.5,'%')}
        ${this.slider('t1','TP1',0.5,3,0.25,'R')}${this.slider('f','Chốt ở TP1',0,100,10,'% vị thế')}${this.slider('t2','TP2',1,6,0.5,'R')}
      </div>
      <div class="sim-ruler" id="simruler"></div>
      <div class="sim-row"><label class="sim-l">Thử trên bao nhiêu lệnh?</label><div class="sim-chips" id="simn">${[[30,'30 lệnh'],[50,'50 lệnh'],[100,'100 lệnh'],[0,'Toàn bộ lịch sử']].map(([k,t])=>`<button class="chip2" data-n="${k}">${t}</button>`).join('')}</div></div>
      <div class="sim-tg"><label class="sw"><input type="checkbox" id="simcomp"><span></span>Lãi kép (rủi ro tính theo số dư hiện tại)</label><label class="sw"><input type="checkbox" id="simfee"><span></span>Trừ phí sàn</label></div>
    </section>
    <section class="sim-card s2"><span class="sim-n">2</span><button class="sim-go" id="simgo"><span>▶</span> Chạy thử nghiệm</button><p class="sim-what" id="simwhat"></p></section>
    <section class="sim-card s3" id="simres"><div class="sim-h"><span class="sim-n">3</span><div><h2>Kết quả</h2><p>Bấm "Chạy thử nghiệm" để xem túi tiền thay đổi thế nào.</p></div></div><div class="sim-empty">💰 Chưa chạy thử nghiệm nào.</div></section>`;
    el.addEventListener('input',e=>{const k=e.target.dataset.k;if(k){this.st[k]=+e.target.value;if(k==='pw'||k==='pb')this.fixOdds(k);this.paint()}});
    el.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.src){this.st.src=b.dataset.src;this.paint()}
      if(b.dataset.pre)this.preset(b.dataset.pre);
      if(b.dataset.n!=null){this.st.n=+b.dataset.n;this.paint()}});
    $('simcap').addEventListener('input',()=>{this.st.cap=Math.max(10,+$('simcap').value||1000);this.paint(true)});
    $('simcomp').addEventListener('change',()=>{this.st.comp=$('simcomp').checked;this.paint()});
    $('simfee').addEventListener('change',()=>{this.st.fee=$('simfee').checked;this.paint()});
    $('simstrat').addEventListener('change',()=>{this.coins();this.paint()});$('simcoin').addEventListener('change',()=>this.paint());
    $('simgo').onclick=()=>this.run();
    this.fill();this.paint()},
  slider(k,lab,mn,mx,step,unit){return`<label class="sim-sl">${lab}<span class="sim-v" id="simv-${k}"></span><input type="range" data-k="${k}" id="sims-${k}" min="${mn}" max="${mx}" step="${step}"></label>`},
  fixOdds(k){const o=k==='pw'?'pb':'pw';if(this.st.pw+this.st.pb>100)this.st[o]=100-this.st[k]},
  preset(k){
    const T=Strat.TP(),last=[...Book.data.orders].reverse().find(o=>o.tp1R),m={now:[T.t1,50,T.t2==='auto'?3:+T.t2],std:[1.5,50,3],safe:[1,70,2],far:[2,30,4],last:last?[last.tp1R,50,last.tp2R]:null}[k];
    if(!m){toast('Chưa có lệnh nào trong Sổ lệnh.','dn');return}[this.st.t1,this.st.f,this.st.t2]=m;if(this.st.t2<=this.st.t1)this.st.t2=this.st.t1+0.5;this.paint()},
  fill(){const old=$('simstrat').value;$('simstrat').innerHTML=Strat.usable().map(v=>`<option value="${v.id}">${Strat.label(v)}</option>`).join('');const cur=old&&Strat.byId(old)?old:Strat.isAuto()?'rsi2-v1':Strat.active;if(Strat.byId(cur))$('simstrat').value=cur;this.coins()},
  coins(){const v=Strat.byId($('simstrat').value),I=v&&Strat.impl[v.base],list=I&&I.only?I.only:Scan.POP,c=$('simcoin').value;
    $('simcoin').innerHTML=list.map(s=>`<option value="${s}">${Fmt.coin(s)}</option>`).join('');if(list.includes(c))$('simcoin').value=c},
  usd:x=>(x<0?'−':'')+'$'+Math.abs(x).toLocaleString('en-US',{maximumFractionDigits:x!==0&&Math.abs(x)<100?2:0,minimumFractionDigits:0}),
  // Cập nhật nhãn thanh trượt, thước tiền, giải thích — ngay khi kéo
  paint(keepCap){
    const S=this.st,R1=S.cap*S.risk/100,f=S.f/100,u=this.usd;if(S.t2<=S.t1)S.t2=S.t1+0.5;
    Store.set('sim',S);
    document.querySelectorAll('#simsrc button').forEach(b=>b.classList.toggle('on',b.dataset.src===S.src));
    document.querySelectorAll('#simn button').forEach(b=>b.classList.toggle('on',+b.dataset.n===S.n));
    $('simx').dataset.src=S.src;
    for(const k of['pw','pb','risk','t1','f','t2']){const r=$('sims-'+k);if(+r.value!==S[k])r.value=S[k];r.style.setProperty('--p',((S[k]-r.min)/(r.max-r.min)*100)+'%')}
    $('simv-risk').textContent=`${S.risk}% = ${u(R1)} mỗi lệnh`;$('simv-t1').textContent=`+${S.t1}R`;$('simv-f').textContent=`${S.f}%`;$('simv-t2').textContent=`+${S.t2}R`;
    $('simv-pw').textContent=S.pw+'%';$('simv-pb').textContent=S.pb+'%';
    if(!keepCap)$('simcap').value=S.cap;$('simcomp').checked=S.comp;$('simfee').checked=S.fee;
    const win=f*S.t1+(1-f)*S.t2,be=f*S.t1;
    $('simruler').innerHTML=`<div class="sr-bar" style="--e:${100/(1+S.t2)}%"><i class="sr-sl" style="--x:0%"></i><i class="sr-en" style="--x:${100/(1+S.t2)}%"></i><i class="sr-t1" style="--x:${(1+S.t1)/(1+S.t2)*100}%"></i><i class="sr-t2" style="--x:100%"></i></div>
      <div class="sr-cards"><div class="dn"><small>Chạm cắt lỗ (−1R)</small><b>${u(-R1)}</b><em>THUA</em></div>
      <div class="be"><small>TP1 rồi về giá vào</small><b>+${u(be*R1)}</b><em>HÒA VỐN · chốt ${S.f}% ở TP1</em></div>
      <div class="up"><small>Chạm cả TP1 và TP2</small><b>+${u(win*R1)}</b><em>THẮNG · +${win.toFixed(2)}R${S.f<100?` (${u(f*S.t1*R1)} + ${u((1-f)*S.t2*R1)})`:''}</em></div></div>`;
    const pl=Math.max(0,100-S.pw-S.pb),ev=(S.pw*win+S.pb*be-pl)/100,need=Math.max(0,(100-S.pb*(1+be))/(1+win));
    $('simodds').innerHTML=`Còn lại <b>${pl}%</b> là thua. Trung bình mỗi lệnh: <b class="${ev>=0?'up':'dn'}">${ev>=0?'+':''}${u(ev*R1)}</b> (${ev>=0?'+':''}${ev.toFixed(2)}R). Với ${S.pb}% hòa vốn, cần ít nhất <b>${need.toFixed(0)}%</b> lệnh chạm TP2 để không lỗ.`;
    const v=Strat.byId($('simstrat').value),n=S.n?`${S.n} lệnh gần nhất`:'toàn bộ lịch sử';
    $('simwhat').innerHTML=S.src==='hist'?`Chạy lại <b>${v?esc(Strat.label(v)):''}</b> trên nến thật của <b>${Fmt.coin($('simcoin').value)}</b>, lấy ${n}, áp quy tắc trên với vốn <b>${u(S.cap)}</b>.`
      :S.src==='odds'?`Tung xúc xắc <b>1.000 lần</b>, mỗi lần ${S.n||100} lệnh, theo tỉ lệ bạn đặt, để thấy kết quả tốt / thường / xấu.`
      :`Dùng kết quả thật các lệnh đã đóng trong Sổ lệnh (${n}), tính lại tiền với vốn ${u(S.cap)} và rủi ro ${S.risk}%.`},
  // R của một lệnh theo quy tắc chốt lời đang chọn
  rOf(k,S,rExit){const f=S.f/100;return k==='T'?f*S.t1+(1-f)*S.t2:k==='B'?f*S.t1:k==='S'?-1:k==='ET'?f*S.t1+(1-f)*rExit:rExit},
  cls(k,r){return k==='T'?'win':k==='S'?'loss':k==='B'||k==='ET'?'be':r>0?'be':'loss'},
  // Chạy chuỗi lệnh ra tiền
  money(seq,S){
    const eq=[S.cap];let bal=S.cap,pk=S.cap,dd=0,ddA=0,ddPk=0,run=0,runL=0,runS=0,best={n:0,lost:0,a:0,b:0},cnt={win:0,be:0,loss:0},sum={win:0,be:0,loss:0};
    seq.forEach((x,i)=>{const base=S.comp?bal:S.cap,p=x.r*base*S.risk/100;bal+=p;eq.push(bal);cnt[x.c]++;sum[x.c]+=p;x.p=p;x.bal=bal;
      if(bal>pk)pk=bal;if(pk-bal>dd){dd=pk-bal;ddA=pk}
      if(x.c==='loss'){if(!run){runS=i;runL=0}run++;runL+=p;if(run>best.n)best={n:run,lost:runL,a:runS,b:i,pre:eq[runS]}}else run=0});
    return{eq,end:bal,dd,ddP:ddA?dd/ddA*100:0,streak:best,cnt,sum,n:seq.length}},
  async run(){
    const S=this.st,btn=$('simgo'),out=$('simres');btn.disabled=true;btn.innerHTML='<span class="spin"></span> Đang chạy…';
    try{
      if(S.src==='odds')return this.showOdds(this.odds(S));
      let seq=[],note='';
      if(S.src==='hist'){
        const v=Strat.byId($('simstrat').value),impl=Strat.impl[v.base],s=$('simcoin').value,tf=impl.tf||UI.tf();
        const D=await Sig.series(s,tf,tf==='5m'?15000:5000),P={...v.params,tp1R:S.t1,tp2R:S.t2};
        const T=Backtest.trades(D,impl,P,{fee:S.fee?FEE:0}).trades;
        seq=T.map(t=>{const k=t.st==='E'&&t.tp1?'ET':t.st,rExit=t.st==='E'?(t.tp1?(t.gross-0.5*S.t1)/0.5:t.gross):0,r=this.rOf(k,S,rExit)-(t.gross-t.rr);
          return{k,r,c:this.cls(k,r),t:t.t,why:t.why,side:t.side}});
        note=`${Strat.label(v)} · ${Fmt.coin(s)} ${tf} · ${T.length} lệnh trong ${((D.t[D.t.length-1]-D.t[0])/864e5).toFixed(0)} ngày nến thật`}
      else{
        const L=[...(Book.prev?Book.prev.orders:[]),...Book.data.orders].filter(Book.isDone).sort((a,b)=>(a.x||0)-(b.x||0));
        seq=L.map(o=>({k:o.st,r:o.rr-(S.fee?2*FEE/100*o.entry/o.R:0),c:Book.res(o)||'loss',t:o.x,side:o.side,coin:Fmt.coin(o.s)}));note=`${L.length} lệnh đã đóng trong Sổ lệnh (hôm nay và hôm qua)`}
      if(S.n&&seq.length>S.n)seq=seq.slice(-S.n);
      if(!seq.length){out.innerHTML=this.head()+`<div class="sim-empty">Chưa có lệnh nào để thử. ${S.src==='book'?'Sổ lệnh chưa có lệnh đóng.':'Chiến lược chưa ra lệnh nào trên dữ liệu này, thử coin khác.'}</div>`;return}
      this.show(this.money(seq,S),seq,note,S.n&&seq.length<S.n?`Chỉ có ${seq.length} lệnh trong dữ liệu (ít hơn ${S.n}).`:'')}
    catch(e){out.innerHTML=this.head()+`<div class="sim-empty">Không chạy được: ${esc(e.message)}</div>`}
    finally{btn.disabled=false;btn.innerHTML='<span>▶</span> Chạy thử nghiệm';out.scrollIntoView({behavior:'smooth',block:'start'})}},
  // Giả định tỉ lệ: 1.000 lần thử, mỗi lần N lệnh
  odds(S){
    const N=S.n||100,K=1000,fee=S.fee?0.1:0,runs=[];
    for(let k=0;k<K;k++){const seq=[];for(let i=0;i<N;i++){const u=Math.random()*100,kk=u<S.pw?'T':u<S.pw+S.pb?'B':'S',r=this.rOf(kk,S,0)-fee;seq.push({k:kk,r,c:this.cls(kk,r)})}runs.push({seq,m:this.money(seq,S)})}
    runs.sort((a,b)=>a.m.end-b.m.end);
    const q=p=>runs[Math.min(K-1,Math.floor(p*K))],st=runs.map(r=>r.m.streak.n).sort((a,b)=>a-b);
    return{N,K,bad:q(0.1),mid:q(0.5),good:q(0.9),win:runs.filter(r=>r.m.end>S.cap).length/K*100,st50:st[K>>1],st90:st[Math.floor(K*0.9)],ruin:runs.filter(r=>r.m.end<S.cap*0.5).length/K*100}},
  head(){return`<div class="sim-h"><span class="sim-n">3</span><div><h2>Kết quả</h2><p>Quy tắc: rủi ro ${this.st.risk}% · TP1 +${this.st.t1}R chốt ${this.st.f}% · TP2 +${this.st.t2}R${this.st.comp?' · lãi kép':''}${this.st.fee?' · đã trừ phí':''}</p></div></div>`},
  tiles(m,S){
    const u=this.usd,st=m.streak,pc=x=>(x>=0?'+':'')+x.toFixed(1)+'%';
    return`<div class="sim-tiles">
      <div class="st-k"><small>Kết quả ${m.n} lệnh</small><div class="st-wl"><span class="w">${m.cnt.win} thắng</span><span class="b">${m.cnt.be} hòa vốn</span><span class="l">${m.cnt.loss} thua</span></div>
        <p>Thắng mang về <b class="up">+${u(m.sum.win)}</b>, hòa vốn <b>${m.sum.be>=0?'+':''}${u(m.sum.be)}</b>, thua mất <b class="dn">${u(m.sum.loss)}</b>.</p></div>
      <div class="st-k dk"><small>🌑 Chuỗi đen tồi tệ nhất</small><b class="dn">${st.n} lệnh thua liền</b><p>${st.n?`Mất <b class="dn">${u(st.lost)}</b> (${pc(st.lost/(st.pre||S.cap)*100)} tài khoản lúc đó). Hãy chuẩn bị tâm lý: chuỗi này sẽ lại đến.`:'Không có lệnh thua nào.'}</p></div>
      <div class="st-k"><small>📉 Lúc hụt hơi nhất</small><b class="dn">−${u(m.dd)}</b><p>Tài khoản từng giảm ${m.ddP.toFixed(1)}% so với đỉnh trước đó, rồi mới hồi lại.</p></div>
      <div class="st-k"><small>⚖️ Trung bình mỗi lệnh</small><b class="${m.end>=S.cap?'up':'dn'}">${(m.end-S.cap)>=0?'+':''}${u((m.end-S.cap)/(m.n||1))}</b><p>Cứ mỗi lệnh vào, túi tiền ${(m.end>=S.cap)?'thêm':'mất'} trung bình chừng đó.</p></div></div>`},
  hero(end,S,txt){const d=end-S.cap,p=d/S.cap*100,u=this.usd;
    return`<div class="sim-hero ${d>=0?'up':'dn'}"><div class="hv"><span>${u(S.cap)}</span><i>→</i><b>${u(end)}</b></div><div class="hc">${d>=0?'+':''}${u(d)} · ${d>=0?'+':''}${p.toFixed(1)}%</div><p>${txt}</p></div>`},
  show(m,seq,note,warn){
    const S=this.st,u=this.usd,st=m.streak;
    const txt=`Nếu giữ đúng quy tắc này trong ${m.n} lệnh, ${u(S.cap)} sẽ thành <b>${u(m.end)}</b>.${st.n>=2?` Có lúc bạn thua <b>${st.n} lệnh liền</b>, mất ${u(-st.lost)}.`:''}`;
    $('simres').innerHTML=this.head()+(warn?`<p class="wn">${esc(warn)}</p>`:'')+this.hero(m.end,S,txt)+this.tiles(m,S)+
      `<div class="sim-chart"><div class="sc-h"><b>Tài khoản qua từng lệnh</b><span class="mut">${esc(note)}</span></div>${this.curve([{eq:m.eq,c:'main'}],S,st,seq)}<div class="sc-lg"><span><i class="lg-up"></i>Số dư tài khoản</span><span><i class="lg-gz"></i>Đang lãi so với vốn ban đầu</span><span><i class="lg-dn"></i>Đang lỗ so với vốn ban đầu</span><span><i class="lg-st"></i>Chuỗi đen</span></div></div>`+
      `<details class="acc sim-list"><summary>Xem từng lệnh (${seq.length})</summary><div class="sim-rows">${seq.map((x,i)=>`<div class="sr ${x.c}"><span>#${i+1}</span><span>${x.t?Fmt.dt(x.t).slice(0,-3):''}${x.coin?' · '+x.coin:''}${x.side?' · '+x.side:''}</span><span class="wl ${x.c==='win'?'w':x.c==='be'?'be':'l'}">${x.c==='win'?'THẮNG':x.c==='be'?'HÒA VỐN':'THUA'}</span><span>${x.r>=0?'+':''}${x.r.toFixed(2)}R</span><b class="${x.p>=0?'up':'dn'}">${x.p>=0?'+':''}${u(x.p)}</b><span class="mut">${u(x.bal)}</span></div>`).join('')}</div></details>`;
    this.hover()},
  showOdds(o){
    const S=this.st,u=this.usd;
    const txt=`Trong 1.000 lần thử ${o.N} lệnh, <b>${o.win.toFixed(0)}%</b> số lần kết thúc có lãi. Thường gặp nhất là còn <b>${u(o.mid.m.end)}</b>; xui (1/10 lần) còn ${u(o.bad.m.end)}; hên (1/10 lần) lên ${u(o.good.m.end)}.`;
    $('simres').innerHTML=this.head()+this.hero(o.mid.m.end,S,txt)+
      `<div class="sim-tiles three"><div class="st-k"><small>😟 Kịch bản xui (1/10)</small><b class="${o.bad.m.end>=S.cap?'up':'dn'}">${u(o.bad.m.end)}</b><p>Chuỗi thua dài nhất ${o.bad.m.streak.n} lệnh.</p></div>
        <div class="st-k"><small>🙂 Kịch bản thường gặp</small><b class="${o.mid.m.end>=S.cap?'up':'dn'}">${u(o.mid.m.end)}</b><p>Chuỗi thua dài nhất ${o.mid.m.streak.n} lệnh.</p></div>
        <div class="st-k"><small>🤩 Kịch bản hên (1/10)</small><b class="up">${u(o.good.m.end)}</b><p>Chuỗi thua dài nhất ${o.good.m.streak.n} lệnh.</p></div>
        <div class="st-k dk"><small>🌑 Chuỗi đen nên chuẩn bị</small><b class="dn">${o.st50}–${o.st90} lệnh thua liền</b><p>Một nửa số lần gặp chuỗi ≥ ${o.st50} lệnh; cứ 10 lần thì 1 lần gặp ≥ ${o.st90} lệnh.</p></div>
        <div class="st-k"><small>🔥 Mất quá nửa tài khoản</small><b class="${o.ruin>5?'dn':''}">${o.ruin.toFixed(1)}% số lần</b><p>Khả năng tài khoản rơi dưới ${u(S.cap/2)} sau ${o.N} lệnh.</p></div></div>`+
      `<div class="sim-chart"><div class="sc-h"><b>3 kịch bản tiêu biểu</b><span class="mut">1.000 lần thử · ${o.N} lệnh mỗi lần · thắng ${S.pw}% / hòa vốn ${S.pb}% / thua ${100-S.pw-S.pb}%</span></div>
        ${this.curve([{eq:o.bad.m.eq,c:'bad'},{eq:o.good.m.eq,c:'good'},{eq:o.mid.m.eq,c:'main'}],S,o.mid.m.streak,o.mid.seq)}
        <div class="sc-lg"><span><i class="lg-good"></i>Hên</span><span><i class="lg-up"></i>Thường gặp</span><span><i class="lg-bad"></i>Xui</span><span><i class="lg-st"></i>Chuỗi đen (thường gặp)</span></div></div>`;
    this.hover()},
  // Biểu đồ đường tài khoản bằng SVG: vùng xanh trên vốn ban đầu, đỏ dưới vốn; dải đỏ đánh dấu chuỗi đen
  curve(L,S,st,seq){
    const W=900,H=280,pl=58,pr=14,pt=14,pb=28,all=L.flatMap(l=>l.eq),mn=Math.min(S.cap,...all),mx=Math.max(S.cap,...all),pad=(mx-mn)*0.06||1,n=L[0].eq.length-1||1;
    const x=i=>pl+i/n*(W-pl-pr),y=v=>pt+(mx+pad-v)/(mx-mn+2*pad)*(H-pt-pb),u=this.usd,y0=y(S.cap);
    const ticks=[mn,S.cap,mx].filter((v,i,a)=>a.findIndex(w=>Math.abs(y(w)-y(v))<16)===i);
    const main=L[L.length-1].eq,path=e=>e.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const area=`${path(main)}L${x(n)},${y0}L${x(0)},${y0}Z`;
    this._c={x,y,n,eq:main,seq,W,H,pl,pr};
    return`<div class="sc-w"><svg viewBox="0 0 ${W} ${H}" class="sc-svg" preserveAspectRatio="none">
      <defs><clipPath id="scA"><rect x="0" y="0" width="${W}" height="${y0}"/></clipPath><clipPath id="scB"><rect x="0" y="${y0}" width="${W}" height="${H}"/></clipPath>
        <linearGradient id="scG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--up)" stop-opacity=".35"/><stop offset="1" stop-color="var(--up)" stop-opacity="0"/></linearGradient>
        <linearGradient id="scR" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="var(--dn)" stop-opacity=".35"/><stop offset="1" stop-color="var(--dn)" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" class="sc-grid${v===S.cap?' base':''}"/><text x="${pl-8}" y="${y(v)+4}" text-anchor="end" class="sc-t">${u(v)}</text>`).join('')}
      ${st&&st.n>=2?`<rect x="${x(st.a)}" y="${pt}" width="${Math.max(3,x(st.b+1)-x(st.a))}" height="${H-pt-pb}" class="sc-st"/><text x="${(x(st.a)+x(st.b+1))/2}" y="${pt+12}" text-anchor="middle" class="sc-stt">${st.n} thua liền</text>`:''}
      <path d="${area}" fill="url(#scG)" clip-path="url(#scA)"/><path d="${area}" fill="url(#scR)" clip-path="url(#scB)"/>
      ${L.map(l=>`<path d="${path(l.eq)}" class="sc-l ${l.c}" vector-effect="non-scaling-stroke"/>`).join('')}
      <text x="${pl}" y="${H-8}" class="sc-t">Lệnh 0</text><text x="${W-pr}" y="${H-8}" text-anchor="end" class="sc-t">Lệnh ${n}</text>
      <line class="sc-cur" x1="0" x2="0" y1="${pt}" y2="${H-pb}" style="display:none"/><circle class="sc-dot" r="5" style="display:none"/></svg>
      <div class="sc-tip" style="display:none"></div><span class="sc-end ${main[n]>=S.cap?'up':'dn'}" style="top:${y(main[n])/H*100}%">${u(main[n])}</span></div>`},
  hover(){
    const w=document.querySelector('#simres .sc-w');if(!w||!this._c)return;const C=this._c,sv=w.querySelector('svg'),cur=sv.querySelector('.sc-cur'),dot=sv.querySelector('.sc-dot'),tip=w.querySelector('.sc-tip'),u=this.usd;
    const mv=e=>{const r=sv.getBoundingClientRect(),px=((e.touches?e.touches[0].clientX:e.clientX)-r.left)/r.width*C.W,i=Math.max(0,Math.min(C.n,Math.round((px-C.pl)/(C.W-C.pl-C.pr)*C.n)));
      const X=C.x(i),Y=C.y(C.eq[i]),s=C.seq&&C.seq[i-1];cur.setAttribute('x1',X);cur.setAttribute('x2',X);dot.setAttribute('cx',X);dot.setAttribute('cy',Y);cur.style.display=dot.style.display='';
      tip.style.display='';tip.style.left=(X/C.W*100)+'%';tip.style.top=(Y/C.H*100)+'%';
      tip.innerHTML=i?`<b>Lệnh ${i}</b> · ${s?(s.c==='win'?'<span class="up">THẮNG</span>':s.c==='be'?'HÒA VỐN':'<span class="dn">THUA</span>'):''}<br>${s&&s.p!=null?`${s.p>=0?'+':''}${u(s.p)} → `:''}<b>${u(C.eq[i])}</b>`:`<b>Bắt đầu</b><br>${u(C.eq[0])}`};
    w.addEventListener('pointermove',mv);w.addEventListener('pointerleave',()=>{cur.style.display=dot.style.display=tip.style.display='none'})}
};
