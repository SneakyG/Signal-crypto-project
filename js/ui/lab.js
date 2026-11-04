/* Trang Chiến lược: mỗi chiến lược là một thẻ gồm các phiên bản (gốc → ✓70% → ★90%), kết quả 100 lệnh gần nhất,
   trạng thái tự học và nút dùng phiên bản. Phần học thủ công và bảng chi tiết nằm trong mục thu gọn. */
const Lab={
  init(){
    $('lrun').onclick=()=>this.run();$('lstop').onclick=()=>Learn.stop();
    $('alon').checked=AutoLab.on;
    $('alreset').onclick=()=>{const vs=Strat.list.filter(v=>(v.track||[]).length);if(!vs.length){toast('Chưa có bộ đếm nào để đặt lại.');return}
      if(confirm(`Đặt lại bộ đếm thắng/thua của tất cả ${vs.length} phiên bản? Sổ lệnh không bị ảnh hưởng.`)){this.reset(vs);toast('Đã đặt lại bộ đếm của tất cả phiên bản.','up')}};
    $('alon').addEventListener('change',()=>{AutoLab.on=$('alon').checked;Store.set('autolab',AutoLab.on);AutoLab.say(AutoLab.on?'Đã bật tự học tự động.':'Đã tắt tự học tự động.');this.render()});
    $('p-lab').addEventListener('click',e=>{
      const u=e.target.closest&&e.target.closest('[data-use]');
      if(u){Strat.active=u.dataset.use;Strat.save();UI.fillStrat();Ana.fillStrats();this.render();toast(`Đang dùng <b>${esc(Strat.label(Strat.cur()))}</b> ở Bảng tín hiệu.`,'up');Sig.reload();return}
      const rs=e.target.closest&&e.target.closest('[data-reset]');
      if(rs){const v=Strat.byId(rs.dataset.reset);if(v&&confirm(`Đặt lại bộ đếm thắng/thua của ${Strat.label(v)}? Các lệnh đã ghi sẽ bị xóa khỏi tiến trình (Sổ lệnh không bị ảnh hưởng).`)){this.reset([v]);toast(`Đã đặt lại bộ đếm của <b>${esc(Strat.label(v))}</b>.`,'up')}return}
      const l=e.target.closest&&e.target.closest('[data-learn]');if(l){AutoLab.say(`Bạn yêu cầu học ngay ${Strat.label(Strat.byId(l.dataset.learn))}.`);AutoLab.enqueue(l.dataset.learn);return}
      const d=e.target.closest&&e.target.closest('[data-del]');
      if(d&&confirm('Xóa phiên bản này?')){Store.set('labDead',[...Store.get('labDead',[]),d.dataset.del]);Strat.list=Strat.list.filter(v=>v.id!==d.dataset.del);if(!Strat.isAuto()&&!Strat.byId(Strat.active))Strat.active='auto';
        Strat.save();UI.fillStrat();Ana.fillStrats();this.render()}})},
  // Xóa kết quả đã ghi của phiên bản: tiến trình quay về 0/100, tự học đếm lại từ đầu
  reset(vs){for(const v of vs){v.track=[];v.mark=0;v.resetAt=Date.now();AutoLab.queue=AutoLab.queue.filter(id=>id!==v.id);AutoLab.say(`Đặt lại bộ đếm thắng/thua của ${Strat.label(v)}: bắt đầu đếm lại từ 0/${Strat.N}.`)}Strat.save();this.render()},
  renderLog(){put($('llog'),AutoLab.lines.length?AutoLab.lines.map(l=>`<p><time>${Fmt.hm(l.t)}</time>${esc(l.m)}</p>`).join(''):'<p class="mut">Chưa có hoạt động. Bảng sẽ ghi lại mỗi lần đánh giá 100 lệnh và mỗi lần tự học.</p>')},
  card(base){
    const im=Strat.impl[base],vs=Strat.list.filter(v=>v.base===base).sort((a,b)=>a.ver-b.ver),used=v=>Strat.active===v.id||(Strat.isAuto()&&Object.values(Scan.best).includes(v.id));
    const st={base:['Bản gốc',''],learning:['Đang học','P'],saved70:['✓ Thua ≤ 30%','F'],saved90:['★ Thua ≤ 10%','T']};
    const ver=v=>{const s=AutoLab.stats(v),busy=AutoLab.running===v.id||(AutoLab.running&&Strat.byId(AutoLab.running)&&Strat.byId(AutoLab.running).parent===v.id),q=AutoLab.queue.includes(v.id),pct=s.last?s.ls/s.last*100:0;
      return`<div class="vn ${st[v.status][1]}${used(v)?' use':''}">
        <div class="vh"><b>v${v.ver}</b><span class="st ${st[v.status][1]}">${st[v.status][0]}</span>${used(v)?'<span class="tag up">đang dùng</span>':''}</div>
        <div class="vbar"><i style="width:${Math.min(100,s.fresh/Strat.N*100)}%"></i></div>
        <small class="tot">${s.total?`Đã ghi ${s.total} lệnh · thắng ${s.all} · thua ${s.allLs} (${(s.allLs/s.total*100).toFixed(0)}%)`:'Chưa ghi lệnh nào'}</small>
        <small>${v.status==='learning'?esc(v.stats?`Kiểm chứng: ${v.stats.n10} lệnh cuối thua ${v.stats.n10-v.stats.last10}`:'Đang được bộ học tinh chỉnh'):`${Math.min(s.fresh,Strat.N)}/${Strat.N} lệnh mới · ${s.last} lệnh gần nhất thua <b class="${pct<=30?'up':'dn'}">${s.ls}/${s.last}</b> (tối đa 30)`}</small>
        ${busy?'<small class="warn">⏳ Đang tự học…</small>':q?'<small class="warn">Trong hàng chờ tự học</small>':''}
        <div class="vact">${v.status!=='learning'&&Strat.active!==v.id?`<button class="bx" data-use="${v.id}">Dùng</button>`:''}<button class="bx ghost" data-learn="${v.id}">Học ngay</button>${s.total?`<button class="bx ghost" data-reset="${v.id}" title="Xóa các kết quả đã ghi, đếm lại từ 0/100">Đặt lại đếm</button>`:''}${v.status!=='base'?`<button class="bx ghost dn" data-del="${v.id}">Xóa</button>`:''}</div></div>`};
    return`<div class="lcard"><div class="lch"><h2>${esc(im.name)}</h2><span class="mut">${im.tf?'Khung '+im.tf:''}${im.only?' · chỉ '+im.only.map(Fmt.coin).join(', '):''}</span></div>
      <p class="note">${esc(im.desc)}</p><div class="vline">${vs.map(ver).join('<span class="arr">→</span>')}</div></div>`},
  render(){
    put($('lcards'),Strat.ORDER.filter(b=>Strat.impl[b]&&!Strat.impl[b].hidden).map(b=>this.card(b)).join(''));
    $('alon').checked=AutoLab.on;$('alst').textContent=AutoLab.running?`Đang tự học ${Strat.label(Strat.byId(AutoLab.running)||{base:'rsi2',ver:'?',status:'base'})}…`:AutoLab.queue.length?`${AutoLab.queue.length} phiên bản trong hàng chờ`:AutoLab.on?'Đang theo dõi kết quả':'Đã tắt';
    const cur=$('lbase').value;
    $('lbase').innerHTML=Strat.list.filter(v=>!Strat.impl[v.base].hidden).sort((a,b)=>a.base.localeCompare(b.base)||a.ver-b.ver).map(v=>`<option value="${v.id}"${v.id===cur?' selected':''}>${Strat.label(v)}</option>`).join('');
    const diff=v=>{const d=Strat.impl[v.base].defaults,a=Object.keys(v.params).filter(k=>k!=='tp1R'&&k!=='tp2R'&&v.params[k]!==d[k]).map(k=>`${k}=${v.params[k]}`);return a.length?a.join(', '):'giống bản gốc'};
    const sv=(s,k)=>s&&s[k]&&s[k].n?`${s[k].win.toFixed(0)}% (${s[k].n} lệnh)`:'-';
    Tbl.render('lab',$('lvers'),[
      {k:'name',h:'Phiên bản',v:v=>v.base+String(v.ver).padStart(3,'0'),f:v=>`<b>${Strat.label(v)}</b>`},
      {k:'tr',h:'Huấn luyện',v:v=>v.stats?v.stats.tr.win:-1,f:v=>sv(v.stats,'tr')},
      {k:'va',h:'Kiểm chứng',v:v=>v.stats?v.stats.va.win:-1,f:v=>sv(v.stats,'va')},
      {k:'live',h:'Kết quả thật / theo dõi',v:v=>AutoLab.stats(v).total,f:v=>{const s=AutoLab.stats(v);return s.total?`${s.all}/${s.total} thắng`:'-'}},
      {k:'diff',h:'Thay đổi so với bản gốc',v:diff,f:v=>`<span class="sub">${esc(diff(v))}</span>`}
    ],Strat.list.filter(v=>!Strat.impl[v.base].hidden),{def:{k:'name',d:1}});
    this.renderLog()},
  run(){const id=$('lbase').value;$('liters').value;AutoLab.say(`Học thủ công ${Strat.label(Strat.byId(id))}.`);AutoLab.enqueue(id)}
};
