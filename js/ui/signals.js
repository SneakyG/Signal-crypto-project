/* Trang Bảng tín hiệu: thiết lập, thẻ tín hiệu, đặt lệnh, KPI */
const UI={
  tf:()=>$('tf').value,bal:()=>+$('bal').value||0,risk:()=>+$('risk').value||5,slots:()=>+$('slots').value||20,topk:()=>+$('topk').value||4,
  save(){Store.set('ui',{tf:$('tf').value,bal:$('bal').value,risk:$('risk').value,slots:$('slots').value,topk:$('topk').value})},
  load(){const u=Store.get('ui',null);if(u)for(const k of['tf','bal','risk','slots','topk'])if(u[k]!=null&&$(k))$(k).value=u[k]},
  fillStrat(){$('strat').innerHTML=Strat.usable().map(v=>`<option value="${v.id}"${v.id===Strat.active?' selected':''}>${Strat.label(v)}</option>`).join('')}
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
  // Bộ nến khung nhỏ đã gắn xu hướng 1D/4h
  async series(s,tf,n=600){
    const need=HTF.need(tf,n),[D,D4,D1]=await Promise.all([Data.load(s,tf,n),Data.load(s,'4h',need.h4),Data.load(s,'1d',need.d1)]);
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
  plan(){
    const xs=this.watch().map(s=>this.state[s]).filter(x=>x&&x.ok),
      sl=xs.map(x=>x.an.R&&x.an.entry?x.an.R/x.an.entry:1.5*x.an.A/x.price),
      p=Sizing.plan(UI.bal(),UI.risk(),UI.slots(),sl);
    p.used=Book.data.orders.filter(Book.isOpen).length;return p},
  async refresh(){
    if(this.busy)return;this.busy=true;
    try{
      const tf=UI.tf(),impl=Strat.I(),P=Strat.P(),cur={};
      await Promise.all(this.watch().map(async s=>{
        try{
          const D=await this.series(s,tf),an=impl.analyze(D,D.c.length-2,P);if(!an)throw new Error('ít nến');
          cur[s+'|'+tf]=D;
          this.state[s]={tf,D,an,tr:this.track(D,impl,P),price:Data.px[s]||D.c[D.c.length-1],spark:D.c.slice(-49,-1),n:D.c.length-1,ok:true}
        }catch(e){this.state[s]={ok:false}}}));
      this.events(tf);await Book.sync(cur);this.render();
      $('st').className='dot on';$('upd').textContent=new Date().toLocaleTimeString('vi-VN')
    }finally{this.busy=false}},
  // Báo khi tín hiệu của các coin đang theo dõi xuất hiện, khớp hoặc bị bỏ (kể cả khi bạn chưa đặt lệnh)
  events(tf){
    const sd=this.seeded[tf]||(this.seeded[tf]={}),st=Strat.cur(),p=this.plan();
    for(const s of Object.keys(this.state)){
      const x=this.state[s];if(!x.ok||x.tf!==tf)continue;
      const first=!sd[s];sd[s]=true;if(!x.tr)continue;
      const L=x.tr.L,sigT=x.D.t[x.tr.i],id=`${s}|${tf}|${st.id}|${sigT}`,pv=this.seen[id];this.seen[id]=L.st;
      if(first||pv===L.st)continue;
      if(Book.data.orders.some(o=>o.s===s&&o.sigT===sigT&&o.strat.id===st.id))continue; // lệnh của bạn đã có thông báo riêng
      const nm=`${Fmt.coin(s)} ${x.tr.sig.side}`,W=st.params.W||3;
      if(pv===undefined&&L.st==='P')
        Notify.push('signal',`Tín hiệu mới <b>${nm}</b>: đặt lệnh chờ ${Fmt.px(L.e)}`,
          `📌 TÍN HIỆU MỚI ${nm} (${tf}, ${Strat.label(st)})\nĐặt ${x.tr.sig.dirN>0?'Buy':'Sell'} Limit tại ${Fmt.px(L.e)}. Cắt lỗ ${Fmt.px(L.sl)}, TP1 ${Fmt.px(L.tp1)}, TP2 ${Fmt.px(L.tp2)}.\nSố tiền gợi ý $${p.A.toFixed(2)}. Mất tín hiệu hoặc quá ${W} nến chưa khớp sẽ báo bỏ lệnh.`,'up');
      else if(pv==='P'&&(L.st==='C'||L.st==='X'))
        Notify.push('signal',`Tín hiệu <b>${nm}</b> bị bỏ: ${L.why}`,`❌ BỎ LỆNH CHỜ ${nm} (${tf})\nLý do: ${L.why}. Hủy lệnh limit ${Fmt.px(L.e)} trên sàn nếu bạn đã đặt.`,'dn')}},
  kpi(p){
    const S=Book.stats(Book.data.orders),live=Book.data.orders.filter(Book.isFilled).reduce((a,o)=>{const l=Book.live(o);return a+(l?l.pnl:0)},0);
    tween($('k-per'),p.A,v=>'$'+v.toFixed(2));$('k-per2').textContent=`${(p.A/(p.bal||1)*100).toFixed(1)}% vốn cho mỗi lệnh`;
    tween($('k-lev'),p.lev,v=>Math.round(v)+'×');$('k-lev').className=p.lev>10?'dn':'';
    $('k-lev2').textContent=p.lev>10?'Quá cao, nên giảm rủi ro':`Để đủ ${p.N} lệnh cùng một khoản`;
    tween($('k-tot'),p.tot,v=>'$'+v.toFixed(2));$('k-tot2').textContent=`Nếu cả ${p.N} lệnh cùng cắt lỗ`;
    $('k-ring').style.strokeDashoffset=100-Math.min(100,p.used/p.N*100);$('k-used').textContent=`${p.used}/${p.N}`;$('k-used').className=p.used>p.N?'dn':'';
    tween($('k-pnl'),S.net,Fmt.sgn);$('k-pnl').className=S.net>=0?'up':'dn';
    $('k-pnl2').textContent=`${S.cl} lệnh đóng, thắng ${S.rate.toFixed(0)}%. Đang chạy ${Fmt.sgn(live)}`},
  cardItem(s,p){
    const x=this.state[s],{sig,L}=x.tr,coin=Fmt.coin(s),pill=(t,c)=>`<span class="badge ${c}">${t}</span>`,
      mine=Book.openFor(s),amt=this.amts[s]!==undefined?this.amts[s]:p.A.toFixed(2),a=+amt||p.A,qty=a/L.e,risk=qty*L.R,
      up=x.spark[x.spark.length-1]>=x.spark[0],W=Strat.P().W||3,cls=L.st==='H'?'F':L.st;
    const ord=mine?`<div class="done"><b>✔ ${coin} đang có lệnh ${mine.side} $${mine.amt} (${ST[mine.st]}).</b> Chỉ đặt lệnh mới của coin này sau khi lệnh đó đóng. Xem ở trang Sổ lệnh.</div>`
      :L.st==='H'?'<div class="done">Tín hiệu này đã chạm TP1, không nên đặt thêm lệnh mới.</div>'
      :`<label>Số tiền mỗi lệnh (USDT)<input type="number" min="1" step="any" value="${amt}" data-amt="${s}"></label><button data-place="${s}">Đặt lệnh</button><small>Ghi nhận và theo dõi lệnh trong bảng, không gửi lệnh lên sàn.${L.st==='F'?` Tín hiệu đã khớp, bảng tính theo giá vào ${Fmt.px(L.e)}.`:''}</small>`;
    const r=Scan.res[s],bt=r&&r.n!=null?`Backtest ${r.placed} lệnh chờ, khớp ${r.n}: thắng ${r.win.toFixed(0)}% (cận dưới ${r.wil.toFixed(0)}%), ${r.avg>=0?'+':''}${r.avg.toFixed(2)}R mỗi lệnh khớp`:'Đang quét backtest…';
    const tpl=`<article class="card ${sig.side} ${cls}">
      <div class="top"><b>${coinLink(s,x.tf)}</b><small>/USDT</small>${spark(x.spark,up?'up':'dn',100,30)}<span class="px" data-live="p:${s}">%PX%</span></div>
      <div class="pills">${pill(sig.side,sig.side)}${pill(ST[L.st],cls)}<span class="meter">${sig.checks.map((c,i)=>`<i class="${c[1]?'on':''}" style="--d:${i*90}ms"></i>`).join('')}</span><span class="mut">${sig.score}/${sig.checks.length} điều kiện</span></div>
      <ul>${sig.checks.map(c=>`<li class="${c[1]?'y':''}">${c[0]}</li>`).join('')}</ul>
      <div class="rail"><em style="left:0" data-l="Cắt lỗ"></em><em style="left:25%" data-l="Vào"></em><em style="left:62.5%" data-l="TP1"></em><em style="left:100%" data-l="TP2"></em></div>
      <div class="lv"><div><i>Giá đặt (limit)</i><b>${Fmt.px(L.e)}</b></div><div><i>${L.st==='H'?'Cắt lỗ (đã dời về giá vào)':'Cắt lỗ'}</i><b>${Fmt.px(L.st==='H'?L.e:L.sl)}</b></div><div><i>Chốt lời 1 (1,5R)</i><b>${Fmt.px(L.tp1)}</b></div><div><i>Chốt lời 2 (3R)</i><b>${Fmt.px(L.tp2)}</b></div></div>
      <div class="ord">${ord}</div>
      <p class="note">Với $${a.toFixed(2)}: khối lượng ${qty.toFixed(4)}, lỗ nếu cắt lỗ $${risk.toFixed(2)} (${(risk/p.bal*100).toFixed(2)}% vốn), cách giá đặt ${(L.R/L.e*100).toFixed(2)}%. ${L.st==='P'?`Tự huỷ sau ${W} nến nếu chưa khớp; mất tín hiệu ở nến đóng kế tiếp thì báo bỏ lệnh.`:'Đạt TP1 thì chốt 50%, dời cắt lỗ về giá vào. Chiến lược sẽ báo cắt sớm nếu hết hy vọng thắng.'}</p>
      <p class="bt">${bt}</p></article>`;
    return{k:s,tpl,px:x.price}},
  miniItem(s){
    const x=this.state[s],tr=x.tr,L=tr&&tr.L,done=L&&!Book.isOpen(L)&&x.n-L.end<=2,sc=done?tr.sig.score:x.an.score,tot=x.an.checks.length,
      up=x.spark[x.spark.length-1]>=x.spark[0],W=Strat.P().W||3,
      txt=done?{C:'Đã bỏ lệnh vì mất tín hiệu',X:`Hết ${W} nến chưa khớp`,S:'Đã chạm cắt lỗ',B:'TP1 rồi về hòa vốn',T:'Đã chốt TP2',E:'Chiến lược đã cắt sớm'}[L.st]:`Nghiêng về ${x.an.dir}`;
    const tpl=`<article class="mini"><div class="mh"><b>${coinLink(s,x.tf)}</b><small>/USDT</small><span class="px" data-live="p:${s}">%PX%</span></div>${spark(x.spark,up?'up':'dn',240,34)}
      <div class="mf"><span class="badge ${done?tr.sig.side:''}">${done?ST[L.st]:'Chờ tín hiệu'}</span><span class="meter">${Array.from({length:tot},(_,i)=>`<i class="${i<sc?'on':''}" style="--d:${i*90}ms"></i>`).join('')}</span></div><small class="mut">${sc}/${tot} điều kiện. ${txt}</small></article>`;
    return{k:s,tpl,px:x.price}},
  render(){
    const p=this.plan(),xs=this.watch().filter(s=>this.state[s]&&this.state[s].ok),
      isAct=s=>{const t=this.state[s].tr;return t&&Book.isOpen(t.L)},
      act=xs.filter(isAct).sort((a,b)=>'PFH'.indexOf(this.state[a].tr.L.st)-'PFH'.indexOf(this.state[b].tr.L.st)),rest=xs.filter(s=>!isAct(s));
    this.kpi(p);
    paint($('grid'),act.map(s=>this.cardItem(s,p)));
    paint($('wait'),rest.map(s=>this.miniItem(s)));
    put($('errs'),this.watch().filter(s=>this.state[s]&&!this.state[s].ok).map(s=>`<p class="note">Không tải được ${s}. Kiểm tra mạng hoặc VPN, bảng sẽ thử lại sau 15 giây.</p>`).join(''));
    $('none').hidden=act.length>0;$('na').textContent=act.length;$('nw').textContent=rest.length;
    BookPage.render();Scan.renderRank();Scan.paintBar()},
  // Đặt lệnh = ghi nhận và theo dõi lệnh trong bảng (KHÔNG gửi lệnh lên sàn). Mỗi coin chỉ có 1 lệnh mở tại một thời điểm.
  place(s,btn){
    const x=this.state[s],inp=$('p-main').querySelector(`[data-amt="${s}"]`),amt=+(inp?inp.value:0);
    if(!x||!x.ok||!x.tr)return;
    const{sig,i,L}=x.tr;if(L.st!=='P'&&L.st!=='F')return;
    if(Book.openFor(s)){toast(`<b>${Fmt.coin(s)}</b> đang có lệnh mở. Chỉ đặt tiếp sau khi lệnh đó đóng.`,'dn');return}
    if(!(amt>0)){if(inp){inp.classList.add('bad');inp.focus()}return}
    const st=Strat.cur(),P=st.params;
    Book.add({id:`${s}|${x.tf}|${x.D.t[i]}|${Date.now()}`,s,tf:x.tf,side:sig.side,dir:sig.dirN,sigT:x.D.t[i],entry:L.e,sl:L.sl,tp1:L.tp1,tp2:L.tp2,R:L.R,tp1R:P.tp1R,tp2R:P.tp2R,
      amt,ts:Date.now(),st:L.st,fillT:L.st==='F'?Date.now():null,strat:{id:st.id,base:st.base,name:Strat.label(st)},P:{...P},feat:sig.feat});
    delete this.amts[s];if(btn)btn.blur();
    toast(`Đã ghi nhận lệnh <b>${Fmt.coin(s)} ${sig.side}</b> $${amt}. Bảng sẽ theo dõi tới khi đóng lệnh.`,'up');this.render()},
  async reload(){ // đổi chiến lược hoặc khung nến: áp dụng ngay, quét lại và chọn lại coin
    UI.save();this.state={};this.seeded={};this.render();
    await this.refresh();await Scan.run();await this.refresh()},
  init(){
    const m=$('p-main');
    m.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.amt;if(k){this.amts[k]=e.target.value;e.target.classList.remove('bad')}});
    m.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-place]');if(b)this.place(b.dataset.place,b)});
    for(const id of['bal','risk','slots'])$(id).addEventListener('input',()=>{UI.save();this.render()});
    $('topk').addEventListener('input',()=>{UI.save();Scan.pick();Scan.renderRank();this.refresh()});
    $('tf').addEventListener('input',()=>this.reload());
    $('strat').addEventListener('input',()=>{Strat.active=$('strat').value;Strat.save();this.reload()});
    $('rescan').onclick=async()=>{await Scan.run();await this.refresh()};
    document.addEventListener('mousemove',e=>{const c=e.target.closest&&e.target.closest('.card,.mini,.tile,.kpi');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}});
    document.addEventListener('click',Tbl.click)}
};
