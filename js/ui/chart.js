/* Biểu đồ lệnh trong bảng: nến thật từ Binance, vùng LONG/SHORT giống công cụ "Long/Short Position" của TradingView
   (vùng lời xanh từ giá vào tới TP2, vùng lỗ đỏ từ giá vào tới cắt lỗ), các đường Entry, SL, TP1, TP2, giá thanh lý.
   Dùng thư viện mã nguồn mở Lightweight Charts của TradingView (tải từ CDN); nếu không tải được thì vẽ bằng SVG.
   Lưu ý: trang tradingview.com không cho trang khác vẽ sẵn lệnh lên biểu đồ của họ, nên nút "Mở TradingView" chỉ mở đúng coin/khung;
   bảng kèm nút sao chép các mức giá để bạn dán vào công cụ Long/Short Position. */
const ChartView={
  CDN:['https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js','https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js'],
  lib:null,cur:null,
  load(){
    if(window.LightweightCharts)return Promise.resolve(true);
    if(this.lib)return this.lib;
    return this.lib=(async()=>{for(const u of this.CDN){const ok=await new Promise(res=>{const s=document.createElement('script');s.src=u;s.async=true;
      const t=setTimeout(()=>{s.remove();res(false)},7000);s.onload=()=>{clearTimeout(t);res(!!window.LightweightCharts)};s.onerror=()=>{clearTimeout(t);s.remove();res(false)};document.head.appendChild(s)});if(ok)return true}
      this.lib=null;return false})()},
  css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888'},
  // o: {s, tf, side, dir, entry, sl, tp1, tp2, t0 (ms nến tín hiệu), st, liq?, title?, beSL? (đã dời SL về entry)}
  async open(o){
    const lv=this.levels(o),id='c'+Date.now();
    Modal.open(`${o.side==='LONG'?'🟢':'🔴'} ${o.side} ${Fmt.coin(o.s)} · ${o.tf} · ${esc(o.title||ST[o.st]||'')}`,
      `<div class="tfb" id="${id}b">${['5m','15m','1h','4h','1d'].map(t=>`<button class="${t===o.tf?'on':''}" data-tf="${t}">${t==='1d'?'1D':t}${t===o.tf?' · khung lệnh':''}</button>`).join('')}${o.ana?`<label class="sw anw"><input type="checkbox" id="${id}a"${Store.get('anaOn',true)?' checked':''}><span></span>Vẽ phân tích</label>`:''}</div>
      <div class="chw" id="${id}"><div class="chl"><span class="spin"></span> Đang tải biểu đồ…</div></div>
      <div class="chlg">${lv.map(x=>`<span class="lg ${x.k}"><i></i>${x.n}<b>${Fmt.px(x.p)}</b>${x.d!=null?`<small>${x.d>=0?'+':''}${x.d.toFixed(2)}%</small>`:''}</span>`).join('')}</div>
      ${o.ana?`<div class="anck" id="${id}k"></div>`:''}
      <div class="row2" style="margin-top:12px"><a class="btnl" href="${TV(o.s,o.tf)}" target="_blank" rel="noopener">Mở ${Fmt.coin(o.s)} trên TradingView ↗</a><button class="ghost bx" data-copy>Sao chép các mức giá</button><span class="mut">Trên TradingView: chọn công cụ Long/Short Position rồi dán các mức này.</span></div>`);
    const box=$(id),cp=box.parentElement.querySelector('[data-copy]');
    if(cp)cp.onclick=async()=>{const txt=`${Fmt.coin(o.s)}USDT.P ${o.tf} ${o.side}\n`+lv.map(x=>`${x.n}: ${Fmt.px(x.p)}`).join('\n');try{await navigator.clipboard.writeText(txt);toast('Đã sao chép các mức giá.','up')}catch(e){toast('Trình duyệt chặn sao chép.','dn')}};
    // Vẽ theo khung đã chọn (mặc định khung của lệnh). Khung khác chỉ tải nến để xem, không ảnh hưởng việc theo dõi lệnh.
    const draw=async tf=>{
      box.innerHTML='<div class="chl"><span class="spin"></span> Đang tải biểu đồ…</div>';
      let D;try{D=tf===o.tf?(o.ana?await Sig.series(o.s,o.tf,600):(Data.cache[o.s+'|'+o.tf]||await Sig.series(o.s,o.tf,600))):await Data.load(o.s,tf,500,6e4)}catch(e){box.innerHTML=`<div class="empty">Không tải được nến khung ${tf}: ${esc(e.message)}</div>`;return}
      // Phân tích chỉ tính trên khung lệnh (khung chiến lược dùng để ra tín hiệu)
      let spec=null;if(o.ana&&tf===o.tf){try{const i=Draw.idx(D,o.ana.t);spec=Draw.spec(D,o.ana.base,o.ana.P,i);if(spec)spec.t=D.t[i]}catch(e){spec=null}}
      if(o.ana)this.checklist($(id+'k'),spec,o,tf);
      const ok=await this.load();if(!$(id))return;
      this.close();
      if(ok)this.lwc(box,D,o,lv,tf,spec);else this.svg(box,D,o,lv,tf)};
    if(o.ana){const sw=$(id+'a');sw.onchange=()=>{Store.set('anaOn',sw.checked);this.showAna(sw.checked)};
      const K=$(id+'k');K.addEventListener('mouseover',e=>{const r=e.target.closest('[data-ck]');this.hiAna(r?r.dataset.ck:null)});K.addEventListener('mouseleave',()=>this.hiAna(null));
      K.addEventListener('click',e=>{const r=e.target.closest('[data-ck]');if(r){this.hiAna(r.dataset.ck);box.scrollIntoView({behavior:'smooth',block:'nearest'})}})}
    $(id+'b').onclick=e=>{const b=e.target.closest('[data-tf]');if(!b)return;$(id+'b').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw(b.dataset.tf)};
    await draw(o.tf)},
  levels(o){
    const be=o.beSL||o.st==='H',d=p=>(p/o.entry-1)*100;
    const a=[{k:'tp2',n:'TP2',p:o.tp2},{k:'tp1',n:'TP1',p:o.tp1},{k:'en',n:'Giá vào',p:o.entry},{k:'sl',n:be?'Cắt lỗ (đã dời về entry)':'Cắt lỗ',p:be?o.entry:o.sl}];
    if(o.liq)a.push({k:'liq',n:'Thanh lý ≈',p:o.liq});
    return a.map(x=>({...x,d:x.k==='en'?null:d(x.p)}))},
  tz:()=>-new Date().getTimezoneOffset()*60,
  bars(D,n=260){const k=Math.max(0,D.t.length-n),tz=this.tz(),a=[];for(let i=k;i<D.t.length;i++)a.push({time:D.t[i]/1000+tz,open:D.o[i],high:D.h[i],low:D.l[i],close:D.c[i]});return a},
  // Bảng điều kiện dưới biểu đồ: ✓ đạt / ✗ thiếu, màu ứng với hình vẽ trên biểu đồ, cách đọc từng điều kiện
  checklist(el,spec,o,tf){
    if(!el)return;
    if(tf!==o.tf){el.innerHTML=`<p class="note">Phân tích được vẽ trên <b>khung ${o.tf}</b> (khung chiến lược dùng để ra tín hiệu). Bấm nút ${o.tf} để xem.</p>`;return}
    if(!spec){el.innerHTML='<p class="note">Không đủ dữ liệu để vẽ phân tích cho tín hiệu này (tín hiệu quá cũ so với số nến đang tải).</p>';return}
    const ok=spec.checks.filter(c=>c[1]).length,col=q=>{const it=spec.items.find(x=>x.ck===q)||(spec.pane&&spec.pane.ck===q?spec.pane:null);return q===0?'linear-gradient(90deg,var(--up),var(--dn))':it?it.c:''};
    el.innerHTML=`<div class="anh"><b>Điều kiện tại nến tín hiệu ${Fmt.hm(spec.t+Data.MS[o.tf])}</b><span class="chip ${ok===spec.checks.length?'up':''}">${ok}/${spec.checks.length} đạt</span></div>
      <div class="anl">${spec.checks.map((c,q)=>`<div class="ar ${c[1]?'ok':'no'}" data-ck="${q}"><i>${c[1]?'✓':'✗'}</i><div><b>${esc(c[0])}</b>${spec.req.includes(q)?'<span class="tag rq">bắt buộc</span>':''}${spec.notes[q]?`<small>${esc(spec.notes[q])}</small>`:''}</div>${col(q)?`<span class="swc" style="background:${col(q)}"></span>`:''}</div>`).join('')}</div>
      ${spec.gate?`<p class="wn">${esc(spec.gate)}</p>`:''}<p class="mut" style="font-size:12px;margin-top:8px">Rê chuột hoặc chạm vào một điều kiện để làm nổi hình vẽ tương ứng. Phần sau nến tín hiệu chỉ để xem giá đã đi thế nào.</p>`},
  showAna(on){const A=this.cur&&this.cur.ana;if(!A)return;for(const s of A.series)try{s.applyOptions({visible:on})}catch(e){}A.box.querySelectorAll('.abox').forEach(e=>e.style.visibility=on?'':'hidden');try{A.main.setMarkers(on?A.mkAll:A.mkBase)}catch(e){}},
  hiAna(q){const A=this.cur&&this.cur.ana;if(!A)return;A.box.querySelectorAll('.abox').forEach(e=>e.classList.toggle('hi',q!=null&&e.dataset.ck===String(q)));A.box.classList.toggle('anfocus',q!=null&&!!A.box.querySelector(`.abox[data-ck="${q}"]`))},
  lwc(box,D,o,lv,tf,spec){
    const L=window.LightweightCharts,up=this.css('--up'),dn=this.css('--dn'),tx=this.css('--mut'),ln=this.css('--line'),acc=this.css('--acc');
    box.innerHTML='<div class="lwc"></div><div class="zone pz"></div><div class="zone lz"></div>';
    const el=box.firstChild,chart=L.createChart(el,{autoSize:true,layout:{background:{type:'solid',color:'transparent'},textColor:tx,fontFamily:'inherit'},
      grid:{vertLines:{color:ln},horzLines:{color:ln}},rightPriceScale:{borderColor:ln},timeScale:{borderColor:ln,timeVisible:true,secondsVisible:false},crosshair:{mode:0}});
    const s=chart.addCandlestickSeries({upColor:up,downColor:dn,wickUpColor:up,wickDownColor:dn,borderVisible:false,priceFormat:{type:'price',precision:o.entry>=100?2:o.entry>=1?4:5,minMove:o.entry>=100?0.01:o.entry>=1?0.0001:0.00001}});
    const bars=this.bars(D);s.setData(bars);
    const col={tp2:up,tp1:up,en:acc,sl:dn,liq:'#f59e0b'},sty={tp2:0,tp1:2,en:0,sl:0,liq:1};
    for(const x of lv)s.createPriceLine({price:x.p,color:col[x.k],lineWidth:x.k==='en'?2:1,lineStyle:sty[x.k],axisLabelVisible:true,title:x.n.replace(' (đã dời về entry)','=entry')});
    const ms=Data.MS[o.tf],bt=t=>{let k=D.t.length-1;while(k>0&&D.t[k]>t)k--;return D.t[k]/1000+this.tz()}; // nến chứa thời điểm t
    const t0=bt(o.t0||D.t[D.t.length-1]),mk=[];
    if(o.sig0)mk.push({time:bt(o.sig0),position:o.dir>0?'belowBar':'aboveBar',color:tx,shape:'circle',text:'Tín hiệu '+Fmt.hm(o.sig0+ms)});
    if(o.ts)mk.push({time:bt(o.ts),position:o.dir>0?'belowBar':'aboveBar',color:acc,shape:o.dir>0?'arrowUp':'arrowDown',text:`Bạn đặt ${o.side} ${Fmt.hm(o.ts)}`});
    if(o.fillT&&Math.abs(o.fillT-(o.ts||0))>6e4)mk.push({time:bt(o.fillT),position:o.dir>0?'belowBar':'aboveBar',color:o.dir>0?up:dn,shape:o.dir>0?'arrowUp':'arrowDown',text:'Khớp '+Fmt.hm(o.fillT)});
    if(!mk.length)mk.push({time:t0,position:o.dir>0?'belowBar':'aboveBar',color:o.dir>0?up:dn,shape:o.dir>0?'arrowUp':'arrowDown',text:o.side});
    mk.sort((a,b)=>a.time-b.time);try{s.setMarkers(mk)}catch(e){}
    const ana=spec?this.drawAna(chart,s,box,D,spec,mk,bars):null;
    chart.timeScale().setVisibleLogicalRange({from:Math.max(0,bars.length-140),to:bars.length+12});
    const pz=box.querySelector('.pz'),lz=box.querySelector('.lz'),be=o.beSL||o.st==='H';
    const place=()=>{if(!box.isConnected)return;
      const x0=chart.timeScale().timeToCoordinate(t0),W=el.clientWidth-(chart.priceScale('right').width()||60),y=p=>s.priceToCoordinate(p);
      const set=(z,a,b)=>{const ya=y(a),yb=y(b);if(ya==null||yb==null||x0==null){z.style.display='none';return}z.style.display='block';z.style.left=Math.max(0,x0)+'px';z.style.width=Math.max(0,W-Math.max(0,x0))+'px';z.style.top=Math.min(ya,yb)+'px';z.style.height=Math.abs(ya-yb)+'px'};
      set(pz,o.entry,o.tp2);if(be)lz.style.display='none';else set(lz,o.entry,o.sl);
      if(ana)for(const b of ana.boxes){const xa=chart.timeScale().timeToCoordinate(b.ta),xb=b.end?W:chart.timeScale().timeToCoordinate(b.tb),ya=y(b.hi),yb=y(b.lo);
        if(xa==null||ya==null||yb==null){b.el.style.display='none';continue}b.el.style.display='block';const l=Math.max(0,xa),r=Math.min(W,xb==null?W:xb+3);
        b.el.style.left=l+'px';b.el.style.width=Math.max(2,r-l)+'px';b.el.style.top=Math.max(0,Math.min(ya,yb))+'px';b.el.style.height=Math.max(2,Math.abs(yb-ya))+'px'}};
    chart.timeScale().subscribeVisibleLogicalRangeChange(place);
    const tick=()=>{if(!box.isConnected){this.close();return}const p=Data.px[o.s],b=bars[bars.length-1];if(p!=null&&p!==b.close){b.close=p;b.high=Math.max(b.high,p);b.low=Math.min(b.low,p);s.update({...b})}place();this.cur.raf=requestAnimationFrame(tick)};
    this.cur={chart,raf:requestAnimationFrame(tick),ana};if(ana&&!Store.get('anaOn',true))this.showAna(false);setTimeout(place,60)},
  // Vẽ các hình phân tích lên biểu đồ Lightweight Charts
  drawAna(chart,main,box,D,spec,mkBase,bars){
    const tz=this.tz(),k0=D.t.length-bars.length,last=D.t.length-1,T=j=>D.t[Math.min(last,Math.max(k0,j))]/1000+tz,series=[],boxes=[],hex=(c,a)=>{const n=parseInt(c.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
    const opt={priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false};
    // Dải xu hướng 4h/1D dưới đáy (điều kiện 0)
    if(D.bias){const r=chart.addHistogramSeries({...opt,priceScaleId:'trend',priceFormat:{type:'volume'},base:0});
      r.priceScale().applyOptions({scaleMargins:{top:0.965,bottom:0},visible:false});
      const up=this.css('--up'),dn=this.css('--dn');r.setData(bars.map((b,q)=>{const v=D.bias[k0+q];return{time:b.time,value:1,color:v>0?up:v<0?dn:'#64748b'}}));series.push(r)}
    if(spec.pane){main.priceScale().applyOptions({scaleMargins:{top:0.06,bottom:0.27}});
      const p=chart.addLineSeries({...opt,color:spec.pane.c,lineWidth:1,priceScaleId:'osc',lastValueVisible:true,title:spec.pane.n});p.priceScale().applyOptions({scaleMargins:{top:0.76,bottom:0.05}});
      p.setData(bars.map((b,q)=>({time:b.time,value:spec.pane.v[k0+q]})).filter(x=>x.value!=null&&isFinite(x.value)));
      for(const v of spec.pane.lv)p.createPriceLine({price:v,color:this.css('--mut'),lineWidth:1,lineStyle:2,axisLabelVisible:true,title:''});series.push(p)}
    const mk=[];
    for(const it of spec.items){
      if(it.type==='line'){const l=chart.addLineSeries({...opt,color:it.c,lineWidth:it.w||1});l.setData(bars.map((b,q)=>({time:b.time,value:it.v[k0+q]})).filter(x=>x.value!=null&&isFinite(x.value)));series.push(l)}
      else if(it.type==='hl'){const a=T(it.a),b=T(it.b);if(b<=a||!isFinite(it.p))continue;const l=chart.addLineSeries({...opt,color:it.c,lineWidth:1,lineStyle:it.dash||0});l.setData([{time:a,value:it.p},{time:b,value:it.p}]);series.push(l)}
      else if(it.type==='mk'){if(it.j<k0)continue;mk.push({time:T(it.j),position:it.up?'aboveBar':'belowBar',color:it.c,shape:it.shape||'circle',text:it.n})}
      else if(it.type==='box'){if(!isFinite(it.lo)||!isFinite(it.hi))continue;const el=document.createElement('div');el.className='abox'+(it.bg?' bg':'');if(it.ck!=null)el.dataset.ck=it.ck;
        el.style.background=hex(it.c,it.op||.12);el.style.borderColor=hex(it.c,it.bg?0:.75);el.innerHTML=it.bg?'':`<span style="color:${it.c}">${esc(it.n)}</span>`;box.appendChild(el);
        boxes.push({el,ta:T(it.a),tb:T(it.b),end:it.b>=last,lo:it.lo,hi:it.hi})}}
    const all=[...mkBase,...mk].sort((a,b)=>a.time-b.time);try{main.setMarkers(all)}catch(e){}
    return{series,boxes,main,mkAll:all,mkBase,box}},
  // Dự phòng khi không tải được thư viện: vẽ nến và vùng lệnh bằng SVG
  svg(box,D,o,lv,tf){
    const bars=this.bars(D,120),W=900,H=420,R=130,ps=[...bars.flatMap(b=>[b.high,b.low]),...lv.map(x=>x.p)],mn=Math.min(...ps),mx=Math.max(...ps),pad=(mx-mn)*0.04;
    const y=p=>(H-10-(p-mn+pad)/(mx-mn+2*pad)*(H-20)).toFixed(1),cw=(W-R)/bars.length,x=i=>(i*cw+cw/2).toFixed(1);
    let k0=D.t.length-1;const tt=o.t0||D.t[k0];while(k0>0&&D.t[k0]>tt)k0--;const t0=D.t[k0]/1000+this.tz(),i0=Math.max(0,bars.findIndex(b=>b.time>=t0)),be=o.beSL||o.st==='H';
    const zone=(a,b,c)=>`<rect x="${x(i0)}" y="${Math.min(y(a),y(b))}" width="${W-R-x(i0)}" height="${Math.abs(y(a)-y(b))}" fill="${c}" opacity=".16"/>`;
    const col={tp2:'var(--up)',tp1:'var(--up)',en:'var(--acc)',sl:'var(--dn)',liq:'#f59e0b'};
    box.innerHTML=`<svg class="chsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${zone(o.entry,o.tp2,'var(--up)')}${be?'':zone(o.entry,o.sl,'var(--dn)')}
      ${bars.map((b,i)=>{const c=b.close>=b.open?'var(--up)':'var(--dn)';return`<line x1="${x(i)}" x2="${x(i)}" y1="${y(b.high)}" y2="${y(b.low)}" stroke="${c}"/><rect x="${(i*cw+cw*0.15).toFixed(1)}" y="${Math.min(y(b.open),y(b.close))}" width="${(cw*0.7).toFixed(1)}" height="${Math.max(1,Math.abs(y(b.open)-y(b.close)))}" fill="${c}"/>`}).join('')}
      ${(()=>{const ix=t=>{if(!t)return -1;let k=D.t.length-1;while(k>0&&D.t[k]>t)k--;const bt=D.t[k]/1000+this.tz();return bars.findIndex(b=>b.time>=bt)};
        const out=[],is=ix(o.sig0),io=ix(o.ts);
        if(is>=0)out.push(`<line x1="${x(is)}" x2="${x(is)}" y1="0" y2="${H}" stroke="var(--mut)" stroke-dasharray="3 4"/><text x="${+x(is)+4}" y="14" fill="var(--mut)" font-size="11">Tín hiệu ${Fmt.hm(o.sig0+Data.MS[o.tf])}</text>`);
        if(io>=0)out.push(`<line x1="${x(io)}" x2="${x(io)}" y1="0" y2="${H}" stroke="var(--acc)" stroke-dasharray="5 3"/><text x="${+x(io)+4}" y="30" fill="var(--acc)" font-size="11">Bạn đặt ${o.side} ${Fmt.hm(o.ts)}</text>`);
        return out.join('')})()}
      ${lv.map(v=>`<line x1="0" x2="${W-R}" y1="${y(v.p)}" y2="${y(v.p)}" stroke="${col[v.k]}" stroke-dasharray="${v.k==='tp1'?'6 4':v.k==='liq'?'2 3':''}"/><text x="${W-R+4}" y="${+y(v.p)+4}" fill="${col[v.k]}" font-size="11">${v.k==='en'?'Entry':v.k.toUpperCase()} ${Fmt.px(v.p)}</text>`).join('')}</svg>
      <p class="note">Không tải được thư viện biểu đồ của TradingView (kiểm tra mạng), đang hiển thị bản vẽ đơn giản.</p>`},
  close(){if(this.cur){cancelAnimationFrame(this.cur.raf);try{this.cur.chart.remove()}catch(e){}this.cur=null}},
  // Mở biểu đồ cho một lệnh trong Sổ lệnh hoặc một tín hiệu trên thẻ
  order(id){const o=Book.byId(id);if(!o)return;const v=o.strat&&Strat.byId(o.strat.id),base=o.strat&&o.strat.base;
    this.open({...o,t0:o.fillT||o.ts,sig0:o.sig0||o.sigT,title:`${ST[o.st]} · ký quỹ $${o.amt.toFixed(2)} × ${o.lev||1} · bạn đặt lúc ${Fmt.hm(o.ts)}`,
      ana:base&&Strat.impl[base]?{base,P:{...Strat.impl[base].defaults,...(v?v.params:{}),...(o.P||{})},t:o.sig0||o.sigT}:null})},
  signal(s){const x=Sig.state[s];if(!x||!x.tr)return;const{sig,i,L}=x.tr,z=Sig.size(s);
    this.open({s,tf:x.tf,side:sig.side,dir:sig.dirN,entry:L.e,sl:L.sl,tp1:L.tp1,tp2:L.tp2,t0:L.fill!=null?x.D.t[L.fill]:x.D.t[i],sig0:x.D.t[i],fillT:L.fill!=null?x.D.t[L.fill]+Data.MS[x.tf]:null,st:L.st,liq:z.liq,title:`${ST[L.st]} · ${Strat.label(x.v)}`,
      ana:{base:x.v.base,P:x.P||x.v.params,t:x.D.t[i]}})}
};
