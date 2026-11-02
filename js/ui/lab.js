/* Trang Chiến lược: các phiên bản, học từ lệnh thua, mốc 70% (✓) và 90% (★) */
const Lab={
  lines:[],
  init(){
    $('lrun').onclick=()=>this.run();$('lstop').onclick=()=>Learn.stop();
    $('p-lab').addEventListener('click',e=>{
      const u=e.target.closest&&e.target.closest('[data-use]');
      if(u){Strat.active=u.dataset.use;Strat.save();UI.fillStrat();Ana.fillStrats();this.render();Sig.reload();return}
      const l=e.target.closest&&e.target.closest('[data-learn]');if(l){$('lbase').value=l.dataset.learn;this.run();return}
      const d=e.target.closest&&e.target.closest('[data-del]');
      if(d&&confirm('Xóa phiên bản này?')){Strat.list=Strat.list.filter(v=>v.id!==d.dataset.del);if(!Strat.byId(Strat.active)||Strat.byId(Strat.active).status==='learning')Strat.active=Strat.list.find(v=>v.status==='base').id;
        Strat.save();UI.fillStrat();Ana.fillStrats();this.render()}})},
  render(){
    const cur=$('lbase').value;
    $('lbase').innerHTML=Strat.list.slice().sort((a,b)=>a.base.localeCompare(b.base)||a.ver-b.ver).map(v=>`<option value="${v.id}"${v.id===(cur||Strat.active)?' selected':''}>${Strat.label(v)}</option>`).join('');
    const diff=v=>{const d=Strat.impl[v.base].defaults,a=Object.keys(v.params).filter(k=>v.params[k]!==d[k]).map(k=>`${k}=${v.params[k]}`);return a.length?a.join(', '):'giống bản gốc'};
    const sv=(s,k)=>s&&s[k]&&s[k].n?`${s[k].win.toFixed(0)}% (${s[k].n} lệnh)`:'-';
    const bd={base:'Bản gốc',learning:'Đang học',saved70:'✓ Đạt 70%',saved90:'★ Đạt 90% (dự phòng)'};
    Tbl.render('lab',$('lvers'),[
      {k:'name',h:'Phiên bản',v:v=>v.base+String(v.ver).padStart(3,'0'),f:v=>`<b>${Strat.label(v)}</b>${v.id===Strat.active?' <span class="tag up">đang dùng</span>':''}<span class="sub">${v.parent?'nhân bản từ '+Strat.label(Strat.byId(v.parent)||{base:v.base,ver:'?',status:'base'}):'phiên bản gốc'}</span>`},
      {k:'status',h:'Trạng thái',v:v=>v.status,f:v=>`<span class="st ${v.status==='saved90'?'T':v.status==='saved70'?'F':v.status==='learning'?'P':''}">${bd[v.status]}</span>`},
      {k:'tr',h:'Huấn luyện',v:v=>v.stats?v.stats.tr.win:-1,f:v=>sv(v.stats,'tr')},
      {k:'va',h:'Kiểm chứng',v:v=>v.stats?v.stats.va.win:-1,f:v=>sv(v.stats,'va')},
      {k:'l10',h:'10 lệnh cuối',v:v=>v.stats?v.stats.last10:-1,f:v=>v.stats?`${v.stats.last10}/${v.stats.n10} thắng`:'-'},
      {k:'avg',h:'Lãi kỳ vọng',v:v=>v.stats?v.stats.va.avg:-9,f:v=>v.stats&&v.stats.va.n?`${v.stats.va.avg>=0?'+':''}${v.stats.va.avg.toFixed(2)}R`:'-'},
      {k:'diff',h:'Thay đổi',v:diff,f:v=>`<span class="sub">${esc(diff(v))}</span>`},
      {k:'at',h:'Cập nhật',v:v=>v.stats?v.stats.at:v.created,f:v=>Fmt.ago(v.stats?v.stats.at:v.created)},
      {k:'act',h:'Thao tác',f:v=>`${v.status!=='learning'&&v.id!==Strat.active?`<button class="bx" data-use="${v.id}">Dùng làm chính</button> `:''}<button class="bx ghost" data-learn="${v.id}">Học tiếp</button>${v.status!=='base'?` <button class="bx dn" data-del="${v.id}">Xóa</button>`:''}`}
    ],Strat.list,{def:{k:'name',d:1}});
    $('llog').innerHTML=this.lines.join('')||'<p class="mut">Chưa chạy học. Chọn phiên bản và bấm Học ngay.</p>'},
  async run(){
    if(Learn.running)return;
    const coins=[...new Set([...Sig.focus,'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT'])].slice(0,6);
    const say=m=>{this.lines.unshift(`<p><time>${Fmt.hm(Date.now())}</time>${esc(m)}</p>`);if(this.lines.length>80)this.lines.pop();$('llog').innerHTML=this.lines.join('')};
    $('lrun').disabled=true;$('lstop').disabled=false;say(`Học trên ${coins.map(c=>Fmt.coin(c)).join(', ')}, khung ${UI.tf()}, 5000 nến mỗi coin.`);
    await Learn.run($('lbase').value,{coins,tf:UI.tf(),iters:Math.max(1,+$('liters').value||8)},say);
    $('lrun').disabled=false;$('lstop').disabled=true;UI.fillStrat();Ana.fillStrats();this.render()}
};
