/* Trang Phân tích: (1) phân tích chi tiết một coin từ hiện tại đến tương lai, (2) backtest có hướng dẫn từng bước */
const Ana={
  init(){
    const coins=Scan.POP.map(s=>`<option value="${s}">${Fmt.coin(s)}</option>`).join('');
    $('bsym').innerHTML=coins;$('asym').innerHTML=coins;this.fillStrats();
    $('brun').onclick=()=>this.backtest();$('arun').onclick=()=>this.analyze();$('bstrat').addEventListener('input',()=>this.lockBt())},
  // Chiến lược chỉ dành cho một coin/khung (BTC x100) thì khóa ô chọn tương ứng
  lockBt(){const v=Strat.byId($('bstrat').value),I=v&&Strat.impl[v.base];if(!I)return;if(I.only)$('bsym').value=I.only[0];if(I.tf)$('btf').value=I.tf;$('bsym').disabled=!!I.only;$('btf').disabled=!!I.tf},
  fillStrats(){
    const cur=$('bstrat').value||(Strat.isAuto()?'rsi2-v1':Strat.active);
    $('bstrat').innerHTML=Strat.usable().map(v=>`<option value="${v.id}"${v.id===cur?' selected':''}>${Strat.label(v)}</option>`).join('');this.lockBt()},

  // ============ BACKTEST ============
  async backtest(){
    const out=$('bres'),btn=$('brun');btn.disabled=true;out.innerHTML='<div class="empty">Đang tải dữ liệu và chạy mô phỏng…</div>';
    try{
      const v=Strat.byId($('bstrat').value),impl=Strat.impl[v.base],P={...v.params,W:Math.max(1,+$('bw').value||3),maxHold:Math.max(2,+$('bmh').value||48)};
      const s=$('bsym').value,tf=$('btf').value,n=+$('bn').value,fee=Math.max(0,+$('bfee').value),rk=Math.max(0.1,+$('brisk').value||1),cap=+$('bcap').value||1000;
      const D=await Sig.series(s,tf,n),r=Backtest.run(D,impl,P,{fee}),T=r.trades;
      if(!r.placed){out.innerHTML='<div class="empty">Không có lệnh chờ nào trong giai đoạn này. Hãy tăng số nến, đổi coin hoặc đổi khung nến.</div>';return}
      let eq=cap,pk=cap,dd=0;const pts=[cap];
      for(const t of T){eq+=eq*rk/100*t.rr;pts.push(eq);pk=Math.max(pk,eq);dd=Math.max(dd,(pk-eq)/pk)}
      const by={S:0,B:0,T:0,E:0},why={};
      for(const t of T){by[t.st]++;if(t.st==='E')why[t.why]=(why[t.why]||0)+1}
      const kv=(l,val,c,sub)=>`<div><i>${l}</i><b${c?` class="${c}"`:''}>${val}</b>${sub?`<span class="sub">${sub}</span>`:''}</div>`,pct=(eq/cap-1)*100;
      const days=((D.t[D.c.length-2]-D.t[210])/864e5).toFixed(0);
      const verdict=r.n<20?'Mẫu còn nhỏ (dưới 20 lệnh): kết quả có thể chỉ do may mắn. Hãy tăng số nến hoặc thử thêm coin trước khi tin.'
        :r.avg<=0?'Chưa có lợi thế: lãi kỳ vọng mỗi lệnh âm sau phí. Không nên dùng cấu hình này để vào lệnh thật.'
        :r.wil>=50?'Có dấu hiệu lợi thế: lãi kỳ vọng dương sau phí và tỉ lệ thắng khá vững (cận dưới từ 50%). Vẫn cần kiểm tra thêm coin và giai đoạn khác.'
        :'Lãi kỳ vọng dương nhưng tỉ lệ thắng chưa vững (cận dưới dưới 50%). Cần thêm dữ liệu.';
      out.innerHTML=`<div class="lv">
        ${kv('Lệnh chờ đã đặt',r.placed,'','Số lần có tín hiệu mới')}${kv('Tỉ lệ khớp',(r.n/r.placed*100).toFixed(0)+'%','',`${r.n} khớp / ${r.placed} đã đặt`)}
        ${kv('Tỉ lệ thắng (đạt TP1)',r.win.toFixed(1)+'%','',`${r.w}/${r.n} lệnh, cận dưới ${r.wil.toFixed(0)}%`)}${kv('Lãi kỳ vọng mỗi lệnh',(r.avg>=0?'+':'')+r.avg.toFixed(2)+'R',r.avg>=0?'up':'dn','Đã trừ phí hai chiều')}
        ${kv('Profit factor',r.pf.toFixed(2),r.pf>=1?'up':'dn','Tổng lãi / tổng lỗ (trên 1 là có lãi)')}${kv('Sụt vốn tối đa',(dd*100).toFixed(1)+'%','dn',`${r.dd.toFixed(1)}R, rủi ro ${rk}%/lệnh`)}
        ${kv('Chuỗi thua dài nhất',r.ml+' lệnh','','Để chuẩn bị tâm lý')}${kv('Lợi nhuận vốn',(pct>=0?'+':'')+pct.toFixed(1)+'%',pct>=0?'up':'dn',`${cap} → ${eq.toFixed(0)} USDT sau ${days} ngày`)}</div>
        <p class="note"><b>Kết luận tự động:</b> ${verdict}</p>
        <div class="ch" style="margin-top:12px"><b>Đường vốn mô phỏng</b><span class="${pct>=0?'up':'dn'}">${(pct>=0?'+':'')+pct.toFixed(1)}%</span></div>${lineChart(pts)}
        <p class="note">Kết quả theo loại: cắt lỗ <b>${by.S}</b>, TP1 rồi về hòa vốn <b>${by.B}</b>, chốt TP2 <b>${by.T}</b>, cắt sớm <b>${by.E}</b>${Object.keys(why).length?`. Lý do cắt sớm: ${Object.entries(why).map(([a,b])=>`${esc(a)} (${b})`).join('; ')}`:''}.</p><div id="btt"></div>`;
      Tbl.render('btt',$('btt'),[
        {k:'t',h:'Thời điểm tín hiệu',v:t=>t.t,f:t=>Fmt.dt(t.t)},
        {k:'side',h:'Hướng',v:t=>t.side,f:t=>`<span class="${t.side==='LONG'?'up':'dn'}">${t.side}</span>`},
        {k:'st',h:'Kết quả',v:t=>ST[t.st],f:t=>`<span class="st ${t.st}">${ST[t.st]}</span>${t.why?`<span class="sub">${esc(t.why)}</span>`:''}`},
        {k:'rr',h:'Kết quả (R, sau phí)',v:t=>t.rr,f:t=>`<span class="chip ${t.rr>0?'up':'dn'}">${(t.rr>=0?'+':'')+t.rr.toFixed(2)}R</span>`},
        {k:'w',h:'Thắng (đạt TP1)',v:t=>t.win?1:0,f:t=>t.win?'Có':'Không'}
      ],T.slice(-15),{def:{k:'t',d:-1}})
    }catch(e){out.innerHTML=`<div class="empty">Không chạy được: ${esc(e.message)}</div>`}
    finally{btn.disabled=false}},

  // ============ PHÂN TÍCH COIN: HIỆN TẠI → TƯƠNG LAI ============
  async analyze(){
    const s=$('asym').value,tf=UI.tf(),out=$('ares'),btn=$('arun');
    btn.disabled=true;out.innerHTML='<div class="empty">Đang phân tích đa khung và mô phỏng kịch bản…</div>';
    try{
      let st=Strat.forCoin(s);if(!Strat.fits(st,s,tf))st=Strat.byId('rsi2-v1');
      const impl=Strat.impl[st.base],P=st.params,D=await Sig.series(s,tf,5000),D4=Data.cache[s+'|4h'],D1=Data.cache[s+'|1d'];
      await Data.prices();
      const n=D.c.length,k=n-2,price=Data.px[s]||D.c[n-1],I=Ind.prep(D),M=Strat.impl.smc,tw=t=>t>0?'Tăng':t<0?'Giảm':'Đi ngang / chưa rõ';
      const view=(X,name)=>{ // trạng thái một khung: xu hướng, cấu trúc, chỉ báo, vùng cung/cầu chưa chạm
        const Ix=Ind.prep(X),j=X.c.length-2,c=X.c[j],S=M.prep(X,{k:3,fvgMin:0.25}),zs=S.zones.filter(z=>z.born>=j-120&&(z.mit==null||z.mit>j));
        return{name,tr:HTF.trend(X)[j],rsi:Ix.rsi[j],mac:Ix.hist[j]>0,vr:X.v[j]/(Ix.vol[j]||1),atrp:Ix.atr[j]/c*100,st:S.dirAt[j],hi:S.hiAt[j],lo:S.loAt[j],
          dem:zs.filter(z=>z.side>0&&z.prox<price).sort((a,b)=>b.prox-a.prox)[0],sup:zs.filter(z=>z.side<0&&z.prox>price).sort((a,b)=>a.prox-b.prox)[0]}};
      const V=[view(D1,'1D'),view(D4,'4h'),view(D,tf)],b=D.bias[k];
      const trow=V.map(v=>`<tr><td><b>${v.name}</b></td><td class="${v.tr>0?'up':v.tr<0?'dn':''}">${tw(v.tr)}</td><td>${v.st>0?'BOS/CHoCH tăng':v.st<0?'BOS/CHoCH giảm':'-'}</td><td>${v.rsi.toFixed(0)}</td><td>${v.mac?'dương':'âm'}</td><td>${v.vr.toFixed(1)}×</td><td>${v.atrp.toFixed(2)}%</td></tr>`).join('');
      // mức giá quan trọng quanh giá hiện tại
      const lv=[];
      for(const v of V){if(isFinite(v.hi))lv.push([v.hi,`Đỉnh gần nhất ${v.name}`]);if(isFinite(v.lo))lv.push([v.lo,`Đáy gần nhất ${v.name}`]);
        if(v.dem)lv.push([v.dem.prox,`Vùng cầu ${v.dem.type} chưa chạm (${v.name})`]);if(v.sup)lv.push([v.sup.prox,`Vùng cung ${v.sup.type} chưa chạm (${v.name})`])}
      const above=lv.filter(x=>x[0]>price).sort((a,c)=>a[0]-c[0]).slice(0,4),below=lv.filter(x=>x[0]<=price).sort((a,c)=>c[0]-a[0]).slice(0,4);
      const li=a=>a.length?a.map(x=>`<p>${Fmt.px(x[0])} <span class="mut">(${Fmt.pct((x[0]/price-1)*100)}) ${x[1]}</span></p>`).join(''):'<p class="mut">Không có mức nào gần.</p>';
      // tín hiệu theo chiến lược đang chọn
      const an=impl.analyze(D,k,P),tr=Sig.track(D,impl,P);
      const sg=tr&&Book.isOpen(tr.L)?`Có tín hiệu <b class="${tr.sig.dirN>0?'up':'dn'}">${tr.sig.side}</b> (${ST[tr.L.st]}): ${tr.sig.dirN>0?'Buy':'Sell'} Limit ${Fmt.px(tr.L.e)}, cắt lỗ ${Fmt.px(tr.L.sl)}, TP1 ${Fmt.px(tr.L.tp1)}, TP2 ${Fmt.px(tr.L.tp2)}.`
        :`Chưa có lệnh chờ: mới đủ ${an.score}/${an.checks.length} điều kiện (nghiêng về ${an.dir}). Còn thiếu: ${an.checks.filter(c=>!c[1]).map(c=>c[0]).join('; ')||'không'}.`;
      // thống kê có điều kiện: những lần trong quá khứ giống hiện tại thì giá đi thế nào
      const key=i=>`${D.bias[i]}|${I.e20[i]>I.e50[i]?1:-1}|${I.rsi[i]<40?0:I.rsi[i]>60?2:1}`;
      const hs=[1,4,12,24].map(h=>({h,c:Math.max(1,Math.round(h*36e5/Data.MS[tf]))})),H=hs[3].c;
      const pick=f=>{const a=[];for(let j=210;j<n-H-1;j++)if(f(j))a.push(j);return a};
      let idx=pick(j=>key(j)===key(k)),how='cùng trạng thái xu hướng 1D/4h, EMA và RSI như hiện tại';
      if(idx.length<30){idx=pick(j=>D.bias[j]===D.bias[k]&&(I.e20[j]>I.e50[j])===(I.e20[k]>I.e50[k]));how='cùng xu hướng khung lớn và EMA như hiện tại'}
      if(idx.length<30){idx=pick(()=>true);how='toàn bộ lịch sử (có ít trường hợp giống hiện tại)'}
      const q=(a,p)=>{const z=a.slice().sort((x,y)=>x-y);return z[Math.min(z.length-1,Math.floor(p*z.length))]};
      const rows=hs.map(h=>{const r=idx.map(j=>Math.log(D.c[j+h.c]/D.c[j]));return{h:h.h,up:r.filter(x=>x>0).length/r.length*100,p10:price*Math.exp(q(r,.1)),p50:price*Math.exp(q(r,.5)),p90:price*Math.exp(q(r,.9))}});
      const step=Math.max(1,Math.floor(H/48)),qs=[];
      for(let t=step;t<=H;t+=step){const r=idx.map(j=>Math.log(D.c[j+t]/D.c[j]));qs.push({t,p10:q(r,.1),p25:q(r,.25),p50:q(r,.5),p75:q(r,.75),p90:q(r,.9)})}
      const W=620,Hh=230,L0=8,pw=W-82,ph=Hh-32,all=qs.flatMap(z=>[z.p10,z.p90]).concat([0]),mn=Math.min(...all),mx=Math.max(...all);
      const X=t=>(L0+t/H*pw).toFixed(1),Y=r=>(10+(mx-r)/(mx-mn||1)*ph).toFixed(1),end=qs[qs.length-1];
      const poly=(a,c)=>qs.map(z=>`${X(z.t)},${Y(z[a])}`).concat(qs.slice().reverse().map(z=>`${X(z.t)},${Y(z[c])}`)).join(' ');
      const fan=`<svg class="fan" viewBox="0 0 ${W} ${Hh}"><polygon class="b1" points="${poly('p90','p10')}"/><polygon class="b2" points="${poly('p75','p25')}"/>
        <line class="pl" x1="${L0}" x2="${L0+pw}" y1="${Y(0)}" y2="${Y(0)}"/><polyline class="md" points="${qs.map(z=>X(z.t)+','+Y(z.p50)).join(' ')}"/>
        <text x="${L0+pw+5}" y="${+Y(end.p90)+3}">${Fmt.px(price*Math.exp(end.p90))}</text><text x="${L0+pw+5}" y="${+Y(end.p50)+3}">${Fmt.px(price*Math.exp(end.p50))}</text><text x="${L0+pw+5}" y="${+Y(end.p10)+3}">${Fmt.px(price*Math.exp(end.p10))}</text>
        ${hs.map(h=>`<text x="${X(h.c)}" y="${Hh-8}" text-anchor="middle">+${h.h} giờ</text>`).join('')}</svg>`;
      const R3=rows[3],dirTxt=b>0?'chỉ ưu tiên LONG':b<0?'chỉ ưu tiên SHORT':'đứng ngoài (xu hướng 1D/4h chưa đồng thuận)',up1=above[0],dn1=below[0];
      const scA=b>0?`<b class="up">Kịch bản chính (theo xu hướng tăng):</b> giá giữ được trên ${dn1?Fmt.px(dn1[0]):'vùng hỗ trợ gần nhất'} và tiếp tục đi lên. Mốc thống kê sau 24 giờ: trung vị ${Fmt.px(R3.p50)}, vùng cao ${Fmt.px(R3.p90)}${up1?`; cản gần nhất ${Fmt.px(up1[0])}`:''}.`
        :b<0?`<b class="dn">Kịch bản chính (theo xu hướng giảm):</b> giá không vượt nổi ${up1?Fmt.px(up1[0]):'vùng cản gần nhất'} và tiếp tục đi xuống. Mốc thống kê sau 24 giờ: trung vị ${Fmt.px(R3.p50)}, vùng thấp ${Fmt.px(R3.p10)}${dn1?`; hỗ trợ gần nhất ${Fmt.px(dn1[0])}`:''}.`
        :`<b>Kịch bản chính (đi ngang):</b> giá dao động giữa ${dn1?Fmt.px(dn1[0]):Fmt.px(R3.p10)} và ${up1?Fmt.px(up1[0]):Fmt.px(R3.p90)} cho tới khi 1D/4h đồng thuận.`;
      const scB=b>0?`<b class="dn">Kịch bản đảo chiều:</b> nếu giá đóng nến dưới ${dn1?Fmt.px(dn1[0]):Fmt.px(R3.p10)} thì kịch bản tăng bị vô hiệu; khi đó đứng ngoài hoặc chờ 4h đổi hướng.`
        :b<0?`<b class="up">Kịch bản đảo chiều:</b> nếu giá đóng nến trên ${up1?Fmt.px(up1[0]):Fmt.px(R3.p90)} thì kịch bản giảm bị vô hiệu; khi đó đứng ngoài hoặc chờ 4h đổi hướng.`
        :`<b>Kịch bản bứt phá:</b> chờ giá đóng nến ngoài khoảng đi ngang kèm volume cao rồi mới theo hướng bứt phá.`;
      out.innerHTML=`<div class="rep">
        <div class="box"><h3>1. Xu hướng đa khung</h3><p>Giá hiện tại <b>${Fmt.px(price)}</b>. Khung lớn: 1D ${tw(V[0].tr).toLowerCase()}, 4h ${tw(V[1].tr).toLowerCase()} → <b>${dirTxt}</b>.</p>
          <div class="tw"><table><thead><tr><th>Khung</th><th>Xu hướng (EMA20/50/200)</th><th>Cấu trúc</th><th>RSI</th><th>MACD</th><th>Volume / TB</th><th>Biên độ ATR</th></tr></thead><tbody>${trow}</tbody></table></div></div>
        <div class="cols"><div class="box"><h3>2. Mức giá quan trọng</h3><p><b>Phía trên (cản)</b></p>${li(above)}<p><b>Phía dưới (hỗ trợ)</b></p>${li(below)}</div>
          <div class="box"><h3>3. Tín hiệu của chiến lược đang chọn</h3><p class="mut">${Strat.label(st)}</p><p>${sg}</p></div></div>
        <div class="box"><h3>4. Dự báo xác suất tới 24 giờ</h3>${fan}
          <p class="note">Vệt vàng đậm là mức trung vị, vùng đậm là 50% và vùng nhạt là 80% các trường hợp. Dựa trên <b>${idx.length}</b> lần trong quá khứ ${how}.</p>
          <div class="tw"><table><thead><tr><th>Sau</th><th>Xác suất giá cao hơn hiện tại</th><th>Giá thấp (10%)</th><th>Giá trung vị</th><th>Giá cao (90%)</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.h} giờ</td><td class="${r.up>=55?'up':r.up<=45?'dn':''}">${r.up.toFixed(0)}%</td><td>${Fmt.px(r.p10)}</td><td>${Fmt.px(r.p50)}</td><td>${Fmt.px(r.p90)}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="box"><h3>5. Kịch bản</h3><p>${scA}</p><p>${scB}</p>
          <p class="note">Đây là xác suất rút ra từ dữ liệu quá khứ, không phải dự đoán chắc chắn. Tin tức đột biến có thể phá mọi kịch bản; luôn đặt cắt lỗ.</p></div></div>`
    }catch(e){out.innerHTML=`<div class="empty">Không phân tích được: ${esc(e.message)}</div>`}
    finally{btn.disabled=false}}
};
