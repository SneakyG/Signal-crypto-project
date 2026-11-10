/* Trang Bảng tín hiệu: thiết lập, thẻ tín hiệu, đặt lệnh (ký quỹ + đòn bẩy tự tính), KPI, giải thích "vì sao chưa có lệnh" */
const UI={
  tf:()=>$('tf').value,bal:()=>+$('bal').value||0,risk:()=>+$('risk').value||5,slots:()=>+$('slots').value||20,topk:()=>+$('topk').value||10,
  // ô Khung bị khóa (chiến lược cố định khung) thì vẫn lưu khung bạn tự chọn, để chuyển lại SMC / ICT không bị đổi khung
  save(){Store.set('ui',{tf:$('tf').disabled?Store.get('tfOwn',$('tf').value):$('tf').value,bal:$('bal').value,risk:$('risk').value,slots:$('slots').value,topk:$('topk').value,v:6})},
  load(){const u=Store.get('ui',null);if(u)for(const k of['tf','bal','risk','slots','topk'])if(u[k]!=null&&$(k)&&(u.v>=6||k!=='risk')&&(u.v>=3||k!=='topk')&&(u.v>=4||k!=='tf'))$(k).value=u[k];if(u&&u.v<6){$('risk').value=5;this.save()}}, // rủi ro mặc định 5% cho mọi chiến lược
  fillStrat(){
    $('strat').innerHTML=`<option value="auto"${Strat.isAuto()?' selected':''}>⚡ Tự động: chiến lược thắng cao nhất cho từng coin</option>`
      +Strat.usable().map(v=>`<option value="${v.id}"${v.id===Strat.active?' selected':''}>${Strat.label(v)}</option>`).join('');
    this.lockTf()},
  // Chiến lược gắn với một khung (BTC x100 → 15m) thì khóa ô khung nến
  lockTf(){const f=Strat.isAuto()?null:Strat.I().tf,e=$('tf');
    if(f){if(!e.disabled)Store.set('tfOwn',e.value);e.value=f}       // nhớ khung bạn đang chọn trước khi khóa
    else if(e.disabled)e.value=Store.get('tfOwn',e.value);           // mở khóa: trả lại khung bạn đã chọn
    e.disabled=!!f;e.title=f?'Chiến lược này chỉ dùng khung '+f+'. Chuyển sang chiến lược khác sẽ trả lại khung bạn đã chọn.':''}
};

// Chỉ vẽ lại khối thẻ khi nội dung (không tính giá) thay đổi; giá được cập nhật riêng mỗi 3 giây bởi Tick nên hiệu ứng không bị giật.
function paint(box,items){
  const sig=items.map(i=>i.k+i.tpl).join(''),ae=document.activeElement,typing=ae&&ae.tagName==='INPUT'&&box.contains&&box.contains(ae);
  if(box._sig===sig||typing)return;
  const seen=box._keys||new Set();
  box.innerHTML=items.map((i,n)=>i.tpl.replace('%PX%',Fmt.px(Data.px[i.k]!=null?Data.px[i.k]:i.px)).replace('<article',`<article style="--i:${n}" data-k="${i.k}"${seen.has(i.k)?'':' data-new="1"'}`)).join('');
  box._sig=sig;box._keys=new Set(items.map(i=>i.k))}

const Sig={
  state:{},seen:{},seeded:{},amts:{},busy:false,
  focus:Store.get('focus',['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT']),
  // Bộ nến khung nhỏ đã gắn xu hướng 1D/4h (khung lớn chỉ tải lại tối đa 1 phút/lần). BTC kèm dữ liệu ETH để xét SMT.
  async series(s,tf,n=600,signal){
    const need=HTF.need(tf,n),jobs=[Data.load(s,tf,n,0,signal),Data.load(s,'4h',need.h4,6e4,signal),Data.load(s,'1d',need.d1,3e5,signal)];
    if(s==='BTCUSDT')jobs.push(Data.load('ETHUSDT',tf,Math.min(n,3000),tf==='15m'?0:6e4,signal).catch(e=>{if(isAbort(e))throw e;return null}));
    const [D,D4,D1,E]=await Promise.all(jobs);if(E)D.eth=E;
    return HTF.attach(D,D4,D1,tf)},
  // Tín hiệu MỚI gần nhất trong 30 nến và trạng thái hiện tại của lệnh chờ tương ứng
  track(D,impl,P){
    const last=D.c.length-1,memo={},an=i=>memo[i]!==undefined?memo[i]:(memo[i]=impl.analyze(D,i,P));
    for(let i=last-1;i>=Math.max(210,last-30);i--){
      const s=an(i);if(!s||s.side==='CHỜ')continue;
      const p=an(i-1);if(p&&p.side===s.side)continue;
      return{sig:s,i,L:Life.run(D,i,s,impl,P)}}
    return null},
  watch(){return[...new Set([...this.focus,...Book.data.orders.filter(Book.isOpen).map(o=>o.s)])]},
  // Khối lượng cho một tín hiệu: 1 lệnh thua = X% vốn; ký quỹ người dùng nhập (nếu có) chỉ làm thay đổi đòn bẩy
  size(s,margin){
    const x=this.state[s],L=x.tr.L;
    return Sizing.trade({s,bal:UI.bal(),risk:UI.risk(),slots:UI.slots(),entry:L.e,sl:L.sl,dir:x.tr.sig.dirN,fixLev:x.v.params.fixLev,margCap:Strat.impl[x.v.base].margCap,margin,avail:UI.bal()-Book.marginUsed()})},
  plan(){
    const xs=this.watch().map(s=>this.state[s]).filter(x=>x&&x.ok),
      sl=xs.map(x=>x.tr&&Book.isOpen(x.tr.L)?x.tr.L.R/x.tr.L.e:(x.v.params.k||x.v.params.slx||1.5)*x.an.A/x.price), // cắt lỗ điển hình theo chiến lược của từng coin
      fix=Strat.isAuto()?undefined:Strat.P().fixLev,used=Book.marginUsed(),p=Sizing.plan(UI.bal(),UI.risk(),UI.slots(),sl,fix,UI.bal()-used),open=Book.data.orders.filter(Book.isOpen);
    p.used=open.length;p.mUsed=used;p.openRisk=open.reduce((a,o)=>a+Book.riskNow(o),0);return p},
  async refresh(){
    if(this.busy){this.again=true;while(this.busy)await sleep(40);if(!this.again)return;} // đang làm mới thì chờ xong rồi làm thêm một lượt (không bỏ qua yêu cầu)
    this.again=false;this.busy=true;
    try{
      const cur={};
      await Promise.all(this.watch().map(async s=>{
        try{
          const v=Strat.forCoin(s),tf=Strat.tfOf(v);
          if(!Strat.fits(v,s,tf))throw new Error('chiến lược không áp dụng cho coin/khung này');
          const calib=Calib.get(s,v,tf),{impl,P}=Calib.wrap(Strat.impl[v.base],v.params,calib); // SL/TP đã tối ưu theo thống kê coin
          const D=await this.series(s,tf),an=impl.analyze(D,D.c.length-2,P);if(!an)throw new Error('ít nến');
          cur[s+'|'+tf]=D;
          this.state[s]={tf,D,v,P,calib,an,tr:this.track(D,impl,P),price:Data.px[s]||D.c[D.c.length-1],spark:D.c.slice(-49,-1),n:D.c.length-1,ok:true}
        }catch(e){this.state[s]={ok:false,err:e.message}}}));
      this.sweeps();for(const tf of new Set(Object.values(this.state).filter(x=>x.ok).map(x=>x.tf)))this.events(tf);await Book.sync(cur);this.autoPlace();this.render();
      $('st').className='dot on';$('upd').textContent=new Date().toLocaleTimeString('vi-VN')
    }finally{this.busy=false}},
  // Chiến lược có sweepAlert: báo ngay khi nến vừa đóng là một cú quét thanh khoản (bước 2), trước cả khi có MSS / lệnh chờ
  sweeps(){
    for(const s of Object.keys(this.state)){const x=this.state[s],I=x.ok&&Strat.impl[x.v.base],a=x.an;if(!I||!I.sweepAlert||!a||!a.sweep)continue;
      if(a.sweep.k!==x.D.c.length-2)continue;const key='sw|'+s+'|'+a.sweep.t;if(this.seen[key])continue;this.seen[key]=1;
      const d=a.sweep.dir>0;Notify.push('signal',`👀 <b>${Fmt.coin(s)}</b> vừa quét ${esc(a.sweep.src)} (${d?'chuẩn bị LONG':'chuẩn bị SHORT'}). Chờ MSS + FVG.`,
        `👀 PHÁT HIỆN QUÉT THANH KHOẢN ${Fmt.coin(s)} (${x.tf}, ${Strat.label(x.v)})\nNến ${Fmt.hm(a.sweep.t)} quét ${a.sweep.src} rồi đóng cửa quay lại.${a.kz?' Đang trong killzone '+a.kz+'.':' Ngoài killzone.'}\nChờ nến phá cấu trúc (MSS) để lại FVG rồi mới có lệnh chờ.`,d?'up':'dn')}},
  // Báo khi tín hiệu của các coin đang theo dõi xuất hiện, khớp hoặc bị bỏ (kể cả khi bạn chưa đặt lệnh)
  events(tf){
    const sd=this.seeded[tf]||(this.seeded[tf]={});
    for(const s of Object.keys(this.state)){
      const x=this.state[s];if(!x.ok||x.tf!==tf)continue;
      const first=!sd[s];sd[s]=true;if(!x.tr)continue;
      const L=x.tr.L,sigT=x.D.t[x.tr.i],id=`${s}|${tf}|${x.v.id}|${sigT}`,pv=this.seen[id];this.seen[id]=L.st;
      if(first||pv===L.st)continue;
      if(Book.isDone(L))AutoLab.rec(x.v.id,`${s}|${sigT}|${x.v.id}`,L.win,L.rr,'tín hiệu theo dõi',L.res);
      if(Book.data.orders.some(o=>o.s===s&&o.sigT===sigT))continue; // lệnh của bạn đã có thông báo riêng
      const nm=`${Fmt.coin(s)} ${x.tr.sig.side}`,W=x.v.params.W||3;
      if(pv===undefined&&L.st==='P'){
        const z=this.size(s);
        Notify.push('signal',`Tín hiệu mới <b>${nm}</b>: lệnh chờ ${Fmt.px(L.e)}`,
          `📌 TÍN HIỆU MỚI ${nm} (${tf}, ${Strat.label(x.v)})\nĐặt ${x.tr.sig.dirN>0?'Buy':'Sell'} Limit tại ${Fmt.px(L.e)}. Cắt lỗ ${Fmt.px(L.sl)}, TP1 ${Fmt.px(L.tp1)}, TP2 ${Fmt.px(L.tp2)}.\nKý quỹ $${z.margin.toFixed(2)} × ${z.lev} = vị thế $${z.notional.toFixed(0)}. Thua mất $${z.loss.toFixed(2)} (${z.lossPct.toFixed(1)}% vốn). Thanh lý ≈ ${Fmt.px(z.liq)}.\nMất tín hiệu hoặc quá ${W} nến chưa khớp sẽ báo bỏ lệnh.`,'up')}
      else if(pv==='P'&&(L.st==='C'||L.st==='X'))
        Notify.push('signal',`Tín hiệu <b>${nm}</b> bị bỏ: ${L.why}`,`❌ BỎ LỆNH CHỜ ${nm} (${tf})\nLý do: ${L.why}. Hủy lệnh limit ${Fmt.px(L.e)} trên sàn nếu bạn đã đặt.`,'dn')}},
  kpi(p){
    const S=Book.stats(Book.data.orders),bal=UI.bal()||1;
    tween($('k-risk'),p.tot,v=>'$'+v.toFixed(2));$('k-risk2').textContent=`Mất tối đa ${UI.risk()}% vốn khi chạm cắt lỗ, đã gồm phí sàn ≈ $${(p.fee||0).toFixed(2)}`;
    tween($('k-per'),p.A,v=>'$'+v.toFixed(2));$('k-per2').textContent=p.none?'Hết ký quỹ trống: đợi lệnh đóng hoặc hủy lệnh chờ':`≈ ${(p.A/bal*100).toFixed(1)}% vốn, vị thế ≈ $${p.notional.toFixed(0)}${p.capped?' (giảm vì thiếu ký quỹ trống)':''}`;
    tween($('k-lev'),p.lev,v=>Math.round(v)+'×');$('k-lev').className=p.lev>=50?'dn':p.lev>20?'warn':'';
    $('k-lev2').textContent=Strat.isAuto()||!Strat.P().fixLev?`Tính từ cắt lỗ ≈ ${(p.ref*100).toFixed(2)}%: mức thấp nhất vừa ngân sách, thanh lý ≥ 2 lần cắt lỗ`:`Cố định theo chiến lược, thanh lý cách ≈ ${(p.liqDist*100).toFixed(2)}%`;
    const mu=p.mUsed/bal*100;$('k-ring').style.strokeDashoffset=100-Math.min(100,mu);$('k-used').textContent=`$${p.mUsed.toFixed(0)}/$${bal.toFixed(0)}`;$('k-used').className=mu>=95?'dn':mu>=75?'warn':'';
    $('k-used2').textContent=`${p.used} lệnh mở · còn trống $${Math.max(0,bal-p.mUsed).toFixed(0)}`;
    tween($('k-open'),p.openRisk,v=>'$'+v.toFixed(2));$('k-open').className=p.openRisk/bal>0.2?'dn':'';
    $('k-open2').textContent=`${(p.openRisk/bal*100).toFixed(1)}% vốn nếu mọi lệnh mở cùng chạm cắt lỗ`;
    tween($('k-pnl'),S.net,Fmt.sgn);$('k-pnl').className=S.net>=0?'up':'dn';
    const live=Book.data.orders.filter(Book.isFilled).reduce((a,o)=>{const l=Book.live(o);return a+(l?l.pnl:0)},0);
    $('k-pnl2').textContent=`${S.cl} lệnh đóng, thắng ${S.rate.toFixed(0)}%. Đang chạy ${Fmt.sgn(live)}`},
  // Khối thông tin khối lượng trên thẻ (được cập nhật ngay khi gõ số tiền)
  sizeHtml(s,z){
    const warn=z.none?`<p class="wn dn">⚠ Hết ký quỹ trống (đã giữ $${(UI.bal()-z.avail).toFixed(2)} / $${UI.bal()} vốn). Đợi lệnh đóng hoặc hủy bớt lệnh chờ.</p>`
      :z.room?`<p class="wn">Chỉ còn $${z.avail.toFixed(2)} ký quỹ trống nên vị thế bị giảm: thua chỉ mất ${z.lossPct.toFixed(1)}% vốn thay vì ${UI.risk()}% (chưa tới 1R). <b>Tự động đặt lệnh sẽ bỏ qua lệnh này.</b></p>`
      :z.liqBeforeSL?`<p class="wn dn">⚠ Thanh lý (${Fmt.px(z.liq)}) nằm trước cắt lỗ. Giảm đòn bẩy hoặc bỏ qua lệnh này.</p>`
      :z.capped?`<p class="wn">Ký quỹ đã giới hạn bằng toàn bộ vốn, nên thua chỉ mất ${z.lossPct.toFixed(1)}% vốn thay vì ${UI.risk()}%.</p>`
      :z.levCut?`<p class="wn">Đòn bẩy dừng ở ${z.lev}× để thanh lý cách giá vào ≥ 2 lần cắt lỗ, nên ký quỹ cao hơn ngân sách $${z.budget.toFixed(2)}.</p>`
      :`<p class="wn ok">Đòn bẩy ${z.lev}× = mức thấp nhất để ký quỹ vừa ngân sách $${z.budget.toFixed(2)}; thanh lý cách ${(z.liqDist*100).toFixed(2)}%, xa hơn ${(z.liqDist/z.sl).toFixed(1)} lần khoảng cắt lỗ ${(z.sl*100).toFixed(2)}%.</p>`;
    return`<div class="szg"><div><i>Đòn bẩy</i><b>${z.lev}×</b></div><div><i>Giá trị vị thế</i><b>$${z.notional.toFixed(0)}</b></div><div><i>Thua nếu cắt lỗ</i><b class="dn">−$${z.loss.toFixed(2)}</b><span class="sub">${z.lossPct.toFixed(1)}% vốn · đã gồm phí ≈ $${(z.fee||0).toFixed(2)}</span></div><div><i>Giá thanh lý ≈</i><b>${Fmt.px(z.liq)}</b><span class="sub">cách ${(z.liqDist*100).toFixed(2)}%</span></div></div>${warn}`},
  cardItem(s,p){
    const x=this.state[s],{sig,L}=x.tr,coin=Fmt.coin(s),pill=(t,c)=>`<span class="badge ${c}">${t}</span>`,
      mine=Book.openFor(s),z=this.size(s,+this.amts[s]||0),up=x.spark[x.spark.length-1]>=x.spark[0],W=x.v.params.W||3,cls=L.st==='H'?'F':L.st;
    const ord=mine?`<div class="done"><b>✔ ${coin} đang có lệnh ${mine.side} ký quỹ $${mine.amt.toFixed(2)} × ${mine.lev||1} (${ST[mine.st]}).</b> Chỉ đặt lệnh mới của coin này sau khi lệnh đó đóng. Xem ở trang Sổ lệnh.</div>`
      :L.st==='H'?'<div class="done">Tín hiệu này đã chạm TP1, không nên đặt thêm lệnh mới.</div>'
      :`<label>Ký quỹ (số tiền đặt lệnh, USDT)<input type="number" min="1" step="any" value="${this.amts[s]!==undefined?this.amts[s]:z.margin.toFixed(2)}" data-amt="${s}"></label><button data-place="${s}">Đặt lệnh</button>
        <div class="szw" id="sz-${s}">${this.sizeHtml(s,z)}</div><small>Bảng tự chọn đòn bẩy để 1 lệnh thua mất đúng ${UI.risk()}% vốn. Chỉ ghi nhận và theo dõi trong bảng, không gửi lệnh lên sàn.${L.st==='F'?` Tín hiệu đã khớp ở giá ${Fmt.px(L.e)}.`:''}</small>`;
    const r=Scan.res[s],bt=r&&r.n!=null&&r.strat===x.v.id?`Backtest ${r.placed} lệnh chờ, khớp ${r.n}: thắng ${r.win.toFixed(0)}% (cận dưới ${r.wil.toFixed(0)}%), ${r.avg>=0?'+':''}${r.avg.toFixed(2)}R mỗi lệnh khớp`:'Đang quét backtest…';
    const tpl=`<article class="card ${sig.side} ${cls}">
      <div class="top"><b>${coinLink(s,x.tf)}</b><small>/USDT</small>${spark(x.spark,up?'up':'dn',100,30)}<span class="px" data-live="p:${s}">%PX%</span></div>
      <div class="pills">${pill(sig.side,sig.side)}${pill(ST[L.st],cls)}${this.canPlace(s)?'<span class="badge go">Đặt được ngay</span>':''}${this.meter(sig)}<span class="mut">${sig.score}/${sig.checks.length}</span></div>
      <div class="stg">${esc(Strat.label(x.v))} · ${x.tf}</div> <button class="bx ghost chb" data-sigchart="${s}">📈 Xem trên biểu đồ</button>${this.dash(s)}
      <ul>${sig.checks.map((c,i)=>`<li class="${c[1]?'y':''}${sig.req&&sig.req.includes(i)?' rq':''}">${esc(c[0])}</li>`).join('')}</ul>
      <div class="rail"><em style="left:0" data-l="Cắt lỗ"></em><em style="left:25%" data-l="Vào"></em><em style="left:62.5%" data-l="TP1"></em><em style="left:100%" data-l="TP2"></em></div>
      <div class="lv"><div><i>Giá đặt (limit)</i><b>${Fmt.px(L.e)}</b></div><div><i>${L.st==='H'?'Cắt lỗ (đã dời về entry)':'Cắt lỗ'}</i><b>${Fmt.px(L.st==='H'?L.e:L.sl)}</b><span class="sub">${(L.R/L.e*100).toFixed(2)}% từ giá vào</span></div><div><i>Chốt lời 1 (1,5R, chốt 50%)</i><b>${Fmt.px(L.tp1)}</b></div><div><i>Chốt lời 2 (3R, chốt hết)</i><b>${Fmt.px(L.tp2)}</b></div></div>
      <div class="ord">${ord}</div>
      <p class="note">${L.st==='P'?`Tự huỷ sau ${W} nến nếu chưa khớp; thiết lập hỏng thì báo bỏ lệnh.`:L.st==='F'?`<b>Tín hiệu đã khớp lúc ${Fmt.hm(x.D.t[L.fill]+Data.MS[x.tf])}</b> ở giá ${Fmt.px(L.e)}. Nếu bạn đặt bây giờ, lệnh vào theo <b>giá thị trường hiện tại</b>; cắt lỗ và TP dời theo giá vào mới, giữ nguyên khoảng cách của chiến lược.`:'Đạt TP1 thì chốt 50%, dời cắt lỗ về giá vào. Chiến lược sẽ báo cắt sớm nếu hết hy vọng thắng.'}</p>
      <p class="note cal">🎯 ${esc(Calib.note(x.calib))}</p>
      <p class="bt">${bt}</p></article>`;
    return{k:s,tpl,px:x.price}},
  // Thanh điều kiện: mỗi vạch là một điều kiện, vạch có viền là điều kiện bắt buộc
  meter(a){return`<span class="meter${a.checks.length>6?' many':''}">${a.checks.map((c,i)=>`<i class="${c[1]?'on':''}${a.req&&a.req.includes(i)?' rq':''}" style="--d:${i*80}ms" title="${esc(c[0])}"></i>`).join('')}</span>`},
  dash(s){const x=this.state[s],I=x&&x.v&&Strat.impl[x.v.base];if(!I||!I.dash)return'';try{return`<div class="dsh">${I.dash(x,s).map(([k,v])=>`<div><i>${esc(k)}</i><b>${esc(v)}</b></div>`).join('')}</div>`}catch(e){return''}},
  miniItem(s){
    const x=this.state[s],tr=x.tr,L=tr&&tr.L,done=L&&!Book.isOpen(L)&&x.n-L.end<=2,a=x.an,up=x.spark[x.spark.length-1]>=x.spark[0],W=x.v.params.W||3,
      old=a.side!=='CHỜ',miss=(a.req||[]).filter(q=>!a.checks[q][1]).length,
      txt=done?{C:'Đã bỏ lệnh: '+(L.why||'mất tín hiệu'),X:`Hết ${W} nến chưa khớp`,S:'Đã chạm cắt lỗ',B:'TP1 rồi về hòa vốn',T:'Đã chốt TP2',E:'Chiến lược đã cắt sớm'}[L.st]
        :old?'Tín hiệu cũ, chờ tín hiệu mới':miss?`Thiếu ${miss} điều kiện bắt buộc`:a.gate?'Bị bộ lọc chặn':a.score<a.min?`Cần ${a.min}/${a.checks.length} điều kiện`:`Nghiêng về ${a.dir}`;
    const tpl=`<article class="mini"><div class="mh"><b>${coinLink(s,x.tf)}</b><small>/USDT</small><span class="px" data-live="p:${s}">%PX%</span></div>${spark(x.spark,up?'up':'dn',240,34)}
      <div class="mf"><span class="badge ${done?tr.sig.side:old?a.side:''}">${done?ST[L.st]:old?a.side+' · cũ':'Chờ tín hiệu'}</span>${this.meter(a)}</div>
      <small class="mut">${a.score}/${a.checks.length} điều kiện (${a.dir}). ${esc(txt)}</small>${this.dash(s)}
      <div class="mfoot"><span class="stg">${esc(Strat.label(x.v))} · ${x.tf}</span><span class="mbt"><button class="bx ghost" data-watchchart="${s}">📈 Phân tích</button><button class="bx ghost why" data-why="${s}">Vì sao chưa có lệnh?</button></span></div></article>`;
    return{k:s,tpl,px:x.price}},
  // Giải thích chi tiết vì sao coin chưa có lệnh chờ
  explain(s){
    const x=this.state[s];if(!x||!x.ok)return;
    const v=x.v,impl=Strat.impl[v.base],P=v.params,D=x.D,a=x.an,last=D.c.length-1,ms=Data.MS[x.tf],tot=a.checks.length;
    const closeT=D.t[last-1]+ms,nextT=D.t[last]+ms,req=a.req||[],why=[];
    const rows=a.checks.map((c,i)=>`<tr class="${c[1]?'ok':''}"><td>${c[1]?'<b class="up">✓</b>':'<b class="dn">✗</b>'}</td><td>${esc(c[0])}</td><td>${req.includes(i)?'<span class="tag rq">bắt buộc</span>':'<span class="tag">cộng điểm</span>'}</td></tr>`).join('');
    if(a.side!=='CHỜ'){
      let k=last-1;while(k>211){const g=impl.analyze(D,k-1,P);if(!g||g.side!==a.side)break;k--}
      const age=last-1-k,tr=x.tr,same=tr&&tr.i===k;
      why.push(`<b>Tín hiệu ${a.side} vẫn đang đủ điều kiện, nhưng nó bắt đầu từ ${age} nến trước</b> (nến đóng lúc ${Fmt.hm(D.t[k]+ms)}).`
        +(same?` Lệnh chờ của tín hiệu đó đã kết thúc: <b>${ST[tr.L.st]}</b>${tr.L.why?' ('+esc(tr.L.why)+')':''}.`:age>=30?' Tín hiệu đã kéo dài hơn 30 nến.':'')
        +' Bảng chỉ đặt lệnh cho tín hiệu <b>mới</b> (nến trước chưa đủ điều kiện) để không vào muộn và đuổi giá. Lệnh mới sẽ xuất hiện khi tín hiệu mất đi rồi xuất hiện lại.')}
    else{
      const miss=req.filter(q=>!a.checks[q][1]);
      if(miss.length)why.push(`<b>Thiếu ${miss.length} điều kiện bắt buộc:</b> ${miss.map(q=>esc(a.checks[q][0])).join('; ')}. Điều kiện bắt buộc phải đạt hết, dù các vạch còn lại có sáng bao nhiêu.`);
      if(a.score<a.min)why.push(`<b>Mới đạt ${a.score}/${tot} điều kiện</b>, phiên bản chiến lược này cần tối thiểu <b>${a.min}/${tot}</b>.`);
      if(a.gate)why.push(`<b>Bộ lọc chặn:</b> ${esc(a.gate)}`);
      if(D.bias[last-1]===0)why.push('Khung 4h đang đi ngang hoặc 1D ngược chiều 4h, nên chiến lược đứng ngoài (không đoán hướng).');
      if(!why.length)why.push('Đã đủ điều kiện ở nến đang chạy, nhưng tín hiệu chỉ được xác nhận khi nến đóng.')}
    const def=Strat.impl[v.base].defaults,chg=Object.keys(P).filter(k=>P[k]!==def[k]);
    Modal.open(`Vì sao ${Fmt.coin(s)} chưa có lệnh?`,`
      <p class="mut">${esc(Strat.label(v))} · khung ${x.tf} · nến đã đóng gần nhất lúc ${Fmt.hm(closeT)} · kiểm tra lại khi nến kế tiếp đóng lúc <b>${Fmt.hm(nextT)}</b></p>
      <div class="whyl">${why.map(t=>`<p>${t}</p>`).join('')}</div>
      <h3>Điều kiện tại nến vừa đóng (${a.dir})</h3>
      <div class="tw"><table class="ck"><tbody>${rows}</tbody></table></div>
      <h3>Cắt lỗ và chốt lời</h3><p class="note">${esc(Calib.note(x.calib))}</p>
      <p class="note">Thanh vạch trên thẻ: vạch sáng là điều kiện đã đạt, vạch có viền là điều kiện bắt buộc. Thẻ có 4–5 vạch sáng mà thiếu một vạch bắt buộc (thường là "Xu hướng 4h/1D") thì vẫn chưa vào lệnh. Đây là chủ ý của chiến lược, không phải lỗi.${chg.length?` Phiên bản này đã được bộ học siết thêm: ${chg.map(k=>`<code>${k}=${P[k]}</code>`).join(' ')}.`:''}</p>`)},
  // Đặt lệnh = ghi nhận và theo dõi lệnh trong bảng (KHÔNG gửi lệnh lên sàn). Mỗi coin chỉ có 1 lệnh mở tại một thời điểm.
  // Coin này đặt lệnh được ngay không? (có tín hiệu chờ/đã khớp, chưa có lệnh mở, không đuổi giá, còn ký quỹ)
  canPlace(s){
    const x=this.state[s];if(!x||!x.ok||!x.tr)return false;const L=x.tr.L;
    if((L.st!=='P'&&L.st!=='F')||Book.openFor(s))return false;
    if(L.st==='F'){const px=Data.px[s]||x.D.c[x.D.c.length-1],P0=x.P||x.v.params;if(x.tr.sig.dirN*(px-L.e)/L.R>=(x.tr.sig.t1R||P0.tp1R)*0.8)return false}
    const z=this.size(s);return!z.none&&!z.liqBeforeSL},
  // Tự động đặt lệnh: coin nào đang hiện nút Đặt lệnh (chờ khớp, hoặc đã khớp mà giá chưa chạy quá 80% đường tới TP1) thì đặt luôn.
  // Mỗi tín hiệu chỉ đặt một lần: lệnh bạn đã hủy hoặc đã đóng của cùng tín hiệu sẽ không bị đặt lại.
  autoPlace(){
    if(!Store.get('auto',false)||Sync.idle())return; // đồng bộ nhiều máy: chỉ máy chính tự đặt lệnh
    const order=s=>this.state[s].tr.L.st==='P'?0:1; // ưu tiên lệnh chờ khớp khi còn ít chỗ
    for(const s of this.watch().filter(s=>this.canPlace(s)).sort((a,b)=>order(a)-order(b))){
      const x=this.state[s],t=x.D.t[x.tr.i];if(Book.data.orders.some(o=>o.s===s&&(o.sig0===t||(!o.sig0&&o.sigT===t))))continue;
      if(Book.data.orders.filter(Book.isOpen).length>=UI.slots())return;
      this.place(s,null,true)}},
  place(s,btn,auto){
    const x=this.state[s],inp=auto?null:$('p-main').querySelector(`[data-amt="${s}"]`),m=auto?this.size(s).budget:+(inp?inp.value:0);
    if(!x||!x.ok||!x.tr)return;
    const{sig,i,L}=x.tr;if(L.st!=='P'&&L.st!=='F')return;
    if(Book.openFor(s)){if(!auto)toast(`<b>${Fmt.coin(s)}</b> đang có lệnh mở. Chỉ đặt tiếp sau khi lệnh đó đóng.`,'dn');return}
    if(!(m>0)){if(inp){inp.classList.add('bad');inp.focus()}return}
    const say=auto?()=>{}:toast;
    // Tín hiệu đã khớp từ trước: bạn vào bây giờ theo giá thị trường; giữ nguyên khoảng cắt lỗ (1R) và tỉ lệ TP của chiến lược, dời theo giá vào mới
    const mk=L.st==='F',P0=x.P||x.v.params,last=x.D.t.length-1,px=Data.px[s]||x.D.c[last],d=sig.dirN,t1R=sig.t1R||P0.tp1R,t2R=sig.t2R||P0.tp2R; // TP theo từng tín hiệu nếu chiến lược có
    const lv=mk?{e:px,sl:px-d*L.R,tp1:px+d*t1R*L.R,tp2:px+d*t2R*L.R}:{e:L.e,sl:L.sl,tp1:L.tp1,tp2:L.tp2};
    if(mk&&d*(px-L.e)/L.R>=t1R*0.8){say(`Giá đã chạy gần tới TP1 của tín hiệu (vào lúc ${Fmt.hm(x.D.t[x.tr.L.fill]+Data.MS[x.tf])}). Vào bây giờ là đuổi giá, bảng không ghi nhận lệnh này.`,'dn');return}
    const z=Sizing.trade({s,bal:UI.bal(),risk:UI.risk(),slots:UI.slots(),entry:lv.e,sl:lv.sl,dir:d,fixLev:x.v.params.fixLev,margCap:Strat.impl[x.v.base].margCap,margin:m,avail:UI.bal()-Book.marginUsed()});
    if(z.none){say(`Hết ký quỹ trống: các lệnh đang mở đã giữ $${Book.marginUsed().toFixed(2)} / $${UI.bal()} vốn. Đợi lệnh đóng hoặc hủy lệnh chờ.`,'dn');return}
    if(auto&&!z.full)return; // tự động: ký quỹ trống chỉ đủ một vị thế thua chưa tới 1R → không đặt
    if(z.liqBeforeSL){say('Giá thanh lý nằm trước cắt lỗ, không đặt lệnh này.','dn');return}
    if(Book.marginUsed()+z.margin>UI.bal()+1e-6){say('Tổng ký quỹ sẽ vượt vốn, không đặt lệnh này.','dn');return}
    const v=x.v,P=x.P||v.params;
    Book.add({id:`${s}|${x.tf}|${x.D.t[i]}|${Date.now()}`,s,tf:x.tf,side:sig.side,dir:sig.dirN,sigT:mk?x.D.t[last]:x.D.t[i],sig0:x.D.t[i],mkt:mk,entry:lv.e,sl:lv.sl,tp1:lv.tp1,tp2:lv.tp2,R:L.R,tp1R:t1R,tp2R:t2R,
      amt:z.margin,lev:z.lev,notional:z.notional,qty:z.qty,riskUSD:z.loss,liq:z.liq,bal:UI.bal(),riskPct:UI.risk(),
      ts:Date.now(),st:L.st,fillT:L.st==='F'?Date.now():null,strat:{id:v.id,base:v.base,name:Strat.label(v)},P:{...P},feat:sig.feat,auto:!!auto});
    delete this.amts[s];if(btn)btn.blur();
    if(auto)Notify.push('place',`🤖 Tự động đặt lệnh <b>${Fmt.coin(s)} ${sig.side}</b>: chờ khớp ${Fmt.px(lv.e)}, ký quỹ $${z.margin.toFixed(2)} × ${z.lev}`,
      `🤖 TỰ ĐỘNG ĐẶT LỆNH ${Fmt.coin(s)} ${sig.side} (${x.tf}, ${Strat.label(v)})\n${d>0?'Buy':'Sell'} Limit ${Fmt.px(lv.e)}. Cắt lỗ ${Fmt.px(lv.sl)} (−1R), TP1 ${Fmt.px(lv.tp1)} (+${t1R}R), TP2 ${Fmt.px(lv.tp2)} (+${t2R}R).\nKý quỹ $${z.margin.toFixed(2)} × ${z.lev} = vị thế $${z.notional.toFixed(0)}, thua tối đa $${z.loss.toFixed(2)}.\nHãy đặt lệnh này trên sàn.`,'up');
    else toast(`Đã ghi nhận lệnh <b>${Fmt.coin(s)} ${sig.side}</b>: ký quỹ $${z.margin.toFixed(2)} × ${z.lev}. Bảng sẽ theo dõi tới khi đóng lệnh.`,'up');
    if(!auto)this.render()},
  // Gom nhiều lần gọi vẽ trong cùng một khung hình thành một lần (refresh, quét, Sổ lệnh… đều gọi render)
  render(){if(this.rq)return;this.rq=1;const f=()=>{this.rq=0;this.draw()};if(typeof requestAnimationFrame==='function')requestAnimationFrame(f);else setTimeout(f,16)},
  draw(){
    const p=this.plan(),xs=this.watch().filter(s=>this.state[s]&&this.state[s].ok),
      isAct=s=>{const t=this.state[s].tr;return t&&Book.isOpen(t.L)},
      rank=s=>{const L=this.state[s].tr.L;return this.canPlace(s)?(L.st==='P'?0:1):Book.openFor(s)?2:3},act=xs.filter(isAct).sort((a,b)=>rank(a)-rank(b)),
      // Đang theo dõi: coin đạt nhiều điều kiện nhất (tính theo tỉ lệ, vì mỗi chiến lược có số điều kiện khác nhau) lên trước; bằng nhau thì coin thiếu ít điều kiện bắt buộc hơn lên trước
      near=s=>{const a=this.state[s].an||{},ck=a.checks||[],n=ck.length||1,ok=ck.filter(c=>c[1]).length,miss=(a.req||[]).filter(q=>ck[q]&&!ck[q][1]).length;return[ok/n,-miss,ok]},
      rest=xs.filter(s=>!isAct(s)).map((s,i)=>[s,near(s),i]).sort((A,B)=>B[1][0]-A[1][0]||B[1][1]-A[1][1]||B[1][2]-A[1][2]||A[2]-B[2]).map(x=>x[0]);
    this.kpi(p);
    paint($('grid'),act.map(s=>this.cardItem(s,p)));
    paint($('wait'),rest.map(s=>this.miniItem(s)));
    put($('errs'),this.watch().filter(s=>this.state[s]&&!this.state[s].ok).map(s=>`<p class="note">Không tải được ${s}: ${esc(this.state[s].err||'')}. Bảng sẽ thử lại sau 15 giây.</p>`).join(''));
    $('none').hidden=act.length>0;$('na').textContent=act.length;$('nw').textContent=rest.length;
    $('skel').hidden=xs.length>0||Object.keys(this.state).length>0;
    BookPage.render();Scan.renderRank();Scan.paintBar();Tape.render()},
  // Đổi chiến lược hoặc khung nến:
  //   1) hủy NGAY việc của thiết lập cũ (yêu cầu tải nến đang chạy, backtest dở dang, tối ưu SL/TP)
  //   2) hiện trạng thái "Đang áp dụng" + khóa tạm hàng điều khiển, gom các lần đổi liên tiếp (chờ 350ms)
  //   3) làm mới thẻ coin → mở khóa → quét lại 30 coin chạy nền (thanh tiến trình) → tối ưu SL/TP
  //   Mỗi lần đổi có số thứ tự; chuỗi việc của lần đổi cũ tự dừng ở bước kế tiếp, không ghi đè kết quả của lần mới.
  rgen:0,
  reload(){
    UI.lockTf();UI.save();const g=++this.rgen,live=()=>g===this.rgen;
    Scan.stop();Calib.stop();this.applying(true);clearTimeout(this.rt);
    if(this.rdone){this.rdone();this.rdone=null} // lần đổi trước bị gộp vào lần này: kết thúc lời hứa của nó (không treo)
    return new Promise(res=>{this.rdone=res;this.rt=setTimeout(async()=>{if(this.rdone===res)this.rdone=null;
      try{
        if(!live())return;
        this.state={};this.seeded={};
        const o=Strat.isAuto()?null:Strat.I().only;if(o){this.focus=o.slice();Store.set('focus',this.focus)}
        this.render();
        try{await this.refresh()}finally{if(live())this.applying(false)}
        if(!live())return;await Scan.run();if(!live())return;await this.refresh();
        if(!live())return;await Calib.run(this.focus);if(!live())return;await this.refresh()
      }catch(e){if(!isAbort(e))console.warn('reload',e)}finally{res()}},this.DEB)})},
  DEB:350,
  // Trạng thái đang áp dụng thiết lập: mờ thẻ coin, thanh tiến trình chạy, khóa hàng điều khiển (inert = không bấm / gõ được)
  applying(on){
    this.busyUI=on;const st=document.querySelector&&document.querySelector('#p-main .strip');
    if(st){st.classList.toggle('busy',on);try{st.inert=on}catch(e){}st.setAttribute&&st.setAttribute('aria-busy',on?'true':'false')}
    const m=$('p-main');if(m&&m.classList)m.classList.toggle('applying',on);
    const sb=$('sb');if(sb&&sb.classList)sb.classList.toggle('run',on||Scan.busy);
    if(on){const t=$('stext');if(t)t.textContent='Đang áp dụng thiết lập mới…'}else Scan.paintBar()},
  init(){
    const m=$('p-main');
    m.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.amt;if(!k)return;
      this.amts[k]=e.target.value;e.target.classList.remove('bad');
      const w=$('sz-'+k);if(w&&+e.target.value>0)w.innerHTML=this.sizeHtml(k,this.size(k,+e.target.value))});
    m.addEventListener('click',e=>{
      const b=e.target.closest&&e.target.closest('[data-place]');if(b){this.place(b.dataset.place,b);return}
      const c=e.target.closest&&e.target.closest('[data-sigchart]');if(c){ChartView.signal(c.dataset.sigchart);return}
      const wc=e.target.closest&&e.target.closest('[data-watchchart]');if(wc){ChartView.watch(wc.dataset.watchchart);return}
      const w=e.target.closest&&e.target.closest('[data-why]');if(w)this.explain(w.dataset.why)});
    // gõ số vốn / rủi ro: lưu ngay nhưng chỉ vẽ lại khi ngừng gõ 250ms; đổi số coin: chọn lại coin sau 350ms
    const reAmt=debounce(()=>{this.amts={};this.render()},250),reTop=debounce(()=>{Scan.pick();Scan.renderRank();this.refresh()},350);
    for(const id of['bal','risk','slots'])$(id).addEventListener('input',()=>{UI.save();reAmt()});
    $('topk').addEventListener('input',()=>{UI.save();reTop()});
    $('tf').addEventListener('input',()=>{Store.set('tfOwn',$('tf').value);this.reload()});
    $('strat').addEventListener('input',()=>{Strat.active=$('strat').value;Strat.save();this.reload()}); // đổi chiến lược giữ nguyên ô Rủi ro (mặc định 5% cho mọi chiến lược)
    $('autoon').checked=Store.get('auto',false);
    $('autoon').addEventListener('change',()=>{const on=$('autoon').checked;Store.set('auto',on);toast(on?'Đã bật <b>tự động đặt lệnh</b>: coin nào hiện nút Đặt lệnh sẽ được ghi nhận ngay với số tiền gợi ý (chỉ trên thiết bị này).':'Đã tắt tự động đặt lệnh.',on?'up':'');if(on){this.autoPlace();this.render()}});
    $('rescan').onclick=async()=>{await Scan.run();await this.refresh();await Calib.run(this.focus);await this.refresh()};
    document.addEventListener('mousemove',e=>{const c=e.target.closest&&e.target.closest('.card,.mini,.tile,.kpi');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}});
    document.addEventListener('click',Tbl.click)}
};
