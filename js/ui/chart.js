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
      `<div class="chw" id="${id}"><div class="chl"><span class="spin"></span> Đang tải biểu đồ…</div></div>
      <div class="chlg">${lv.map(x=>`<span class="lg ${x.k}"><i></i>${x.n}<b>${Fmt.px(x.p)}</b>${x.d!=null?`<small>${x.d>=0?'+':''}${x.d.toFixed(2)}%</small>`:''}</span>`).join('')}</div>
      <div class="row2" style="margin-top:12px"><a class="btnl" href="${TV(o.s,o.tf)}" target="_blank" rel="noopener">Mở ${Fmt.coin(o.s)} trên TradingView ↗</a><button class="ghost bx" data-copy>Sao chép các mức giá</button><span class="mut">Trên TradingView: chọn công cụ Long/Short Position rồi dán các mức này.</span></div>`);
    const box=$(id),cp=box.parentElement.querySelector('[data-copy]');
    if(cp)cp.onclick=async()=>{const txt=`${Fmt.coin(o.s)}USDT.P ${o.tf} ${o.side}\n`+lv.map(x=>`${x.n}: ${Fmt.px(x.p)}`).join('\n');try{await navigator.clipboard.writeText(txt);toast('Đã sao chép các mức giá.','up')}catch(e){toast('Trình duyệt chặn sao chép.','dn')}};
    let D;try{D=Data.cache[o.s+'|'+o.tf]||await Sig.series(o.s,o.tf,600)}catch(e){box.innerHTML='<div class="empty">Không tải được dữ liệu nến.</div>';return}
    const ok=await this.load();if(!$(id))return;
    this.close();
    if(ok)this.lwc(box,D,o,lv);else this.svg(box,D,o,lv)},
  levels(o){
    const be=o.beSL||o.st==='H',d=p=>(p/o.entry-1)*100;
    const a=[{k:'tp2',n:'TP2',p:o.tp2},{k:'tp1',n:'TP1',p:o.tp1},{k:'en',n:'Giá vào',p:o.entry},{k:'sl',n:be?'Cắt lỗ (đã dời về entry)':'Cắt lỗ',p:be?o.entry:o.sl}];
    if(o.liq)a.push({k:'liq',n:'Thanh lý ≈',p:o.liq});
    return a.map(x=>({...x,d:x.k==='en'?null:d(x.p)}))},
  tz:()=>-new Date().getTimezoneOffset()*60,
  bars(D,n=260){const k=Math.max(0,D.t.length-n),tz=this.tz(),a=[];for(let i=k;i<D.t.length;i++)a.push({time:D.t[i]/1000+tz,open:D.o[i],high:D.h[i],low:D.l[i],close:D.c[i]});return a},
  lwc(box,D,o,lv){
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
    chart.timeScale().setVisibleLogicalRange({from:Math.max(0,bars.length-140),to:bars.length+12});
    const pz=box.querySelector('.pz'),lz=box.querySelector('.lz'),be=o.beSL||o.st==='H';
    const place=()=>{if(!box.isConnected)return;
      const x0=chart.timeScale().timeToCoordinate(t0),W=el.clientWidth-(chart.priceScale('right').width()||60),y=p=>s.priceToCoordinate(p);
      const set=(z,a,b)=>{const ya=y(a),yb=y(b);if(ya==null||yb==null||x0==null){z.style.display='none';return}z.style.display='block';z.style.left=Math.max(0,x0)+'px';z.style.width=Math.max(0,W-Math.max(0,x0))+'px';z.style.top=Math.min(ya,yb)+'px';z.style.height=Math.abs(ya-yb)+'px'};
      set(pz,o.entry,o.tp2);if(be)lz.style.display='none';else set(lz,o.entry,o.sl)};
    chart.timeScale().subscribeVisibleLogicalRangeChange(place);
    const tick=()=>{if(!box.isConnected){this.close();return}const p=Data.px[o.s],b=bars[bars.length-1];if(p!=null&&p!==b.close){b.close=p;b.high=Math.max(b.high,p);b.low=Math.min(b.low,p);s.update({...b})}place();this.cur.raf=requestAnimationFrame(tick)};
    this.cur={chart,raf:requestAnimationFrame(tick)};setTimeout(place,60)},
  // Dự phòng khi không tải được thư viện: vẽ nến và vùng lệnh bằng SVG
  svg(box,D,o,lv){
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
  order(id){const o=Book.byId(id);if(o)this.open({...o,t0:o.fillT||o.ts,sig0:o.sig0||o.sigT,title:`${ST[o.st]} · ký quỹ $${o.amt.toFixed(2)} × ${o.lev||1} · bạn đặt lúc ${Fmt.hm(o.ts)}`})},
  signal(s){const x=Sig.state[s];if(!x||!x.tr)return;const{sig,i,L}=x.tr,z=Sig.size(s);
    this.open({s,tf:x.tf,side:sig.side,dir:sig.dirN,entry:L.e,sl:L.sl,tp1:L.tp1,tp2:L.tp2,t0:L.fill!=null?x.D.t[L.fill]:x.D.t[i],sig0:x.D.t[i],fillT:L.fill!=null?x.D.t[L.fill]+Data.MS[x.tf]:null,st:L.st,liq:z.liq,title:`${ST[L.st]} · ${Strat.label(x.v)}`})}
};
