/* Tiện ích dùng chung: DOM, định dạng, lưu trữ, hiệu ứng, bảng có thể sắp xếp */
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const median=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[s.length>>1]};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FEE=0.05; // % phí mỗi chiều (Futures taker ~0,04-0,05%)
// Cận dưới (Wilson) của tỉ lệ thắng: w = số thắng, n = số lệnh. Giúp coin chỉ thắng vài lệnh không đứng đầu bảng xếp hạng.
const wilson=(w,n,z=1.28)=>{if(!n)return 0;const p=w/n;return(p+z*z/(2*n)-z*Math.sqrt((p*(1-p)+z*z/(4*n))/n))/(1+z*z/n)*100};

const Store={
  get(k,d){try{const v=localStorage.getItem('th2.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('th2.'+k,JSON.stringify(v))}catch(e){}}
};

const Fmt={
  px:x=>x==null||!isFinite(x)?'-':x>=100?x.toFixed(2):x>=1?x.toFixed(4):x.toFixed(5),
  usd:x=>(x<0?'-':'')+'$'+Math.abs(x).toFixed(2),
  sgn:x=>(x>=0?'+':'-')+'$'+Math.abs(x).toFixed(2),
  pct:(x,n=2)=>(x>=0?'+':'')+x.toFixed(n)+'%',
  hm:t=>new Date(t).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}),
  dt:t=>new Date(t).toLocaleString('vi-VN'),
  coin:s=>s.replace('USDT',''),
  day:()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
  ago:t=>{const m=Math.max(0,Math.round((Date.now()-t)/6e4));return m<60?m+' phút trước':m<1440?Math.round(m/60)+' giờ trước':Math.round(m/1440)+' ngày trước'}
};

// Link TradingView của hợp đồng Futures (hậu tố .P = perpetual) theo khung nến đang dùng
const TV=(s,tf)=>`https://www.tradingview.com/chart/?symbol=BINANCE%3A${s}.P&interval=${{'5m':'5','15m':'15','1h':'60','4h':'240'}[tf]||'15'}`;
const coinLink=(s,tf)=>`<a class="cn" href="${TV(s,tf)}" target="_blank" rel="noopener" title="Mở biểu đồ ${s} Futures trên TradingView">${Fmt.coin(s)}</a>`;

function put(el,h){if(el._h!==h){el._h=h;el.innerHTML=h}}

function tween(el,to,fmt){
  const from=el._v!=null?el._v:0;el._v=to;
  if(from===to){el.textContent=fmt(to);return}
  const t0=performance.now();el._t=t0;
  (function st(t){if(el._t!==t0)return;const k=Math.min(1,(t-t0)/650),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(st)})(t0)}

function toast(m,c){
  const t=document.createElement('div');t.className='toast '+(c||'');t.innerHTML=m;$('toasts').appendChild(t);
  setTimeout(()=>t.classList.add('out'),4200);setTimeout(()=>t.remove(),4700)}

// Bảng có thể sắp xếp khi bấm tiêu đề cột.
// cols: [{k, h, v:(hàng)=>giá trị để sắp xếp, f:(hàng)=>html, cls}]; opt: {def:{k,d}, empty, foot, attr}
const Tbl={
  st:{},last:{},
  render(id,el,cols,rows,opt={}){
    this.last[id]={el,cols,rows,opt};
    const s=this.st[id]||(this.st[id]=opt.def?{...opt.def}:{k:null,d:-1});
    const list=rows.slice(),c0=cols.find(c=>c.k===s.k);
    if(c0&&c0.v)list.sort((a,b)=>{const x=c0.v(a),y=c0.v(b);return(x>y?1:x<y?-1:0)*s.d});
    if(!list.length){put(el,opt.empty||'<div class="empty">Chưa có dữ liệu.</div>');return}
    const th=cols.map(c=>`<th${c.v?` data-tbl="${id}" data-sort="${c.k}" class="srt${s.k===c.k?' on':''}" title="Bấm để sắp xếp"`:''}>${c.h}${s.k===c.k?(s.d>0?' ▲':' ▼'):''}</th>`).join('');
    const key=(r,i)=>String(opt.key?opt.key(r):r.id!=null?r.id:i),foot=opt.foot?opt.foot.map(x=>`<td>${x}</td>`).join(''):'';
    const T=el.querySelector&&el.querySelector(':scope>.tw>table');
    // Đã có bảng cùng cột: chỉ cập nhật ô thay đổi, giữ nguyên các dòng cũ (không chớp, không chạy lại hiệu ứng)
    if(T&&T.tBodies&&T._th===th){
      const tb=T.tBodies[0],old=new Map([...tb.rows].map(tr=>[tr.dataset.key,tr]));let prev=null;
      list.forEach((r,i)=>{
        const k=key(r,i),a=opt.attr?opt.attr(r):'';let tr=old.get(k);
        if(!tr){tr=document.createElement('tr');tr.className='rin';tr.dataset.key=k;tr._a=null}else old.delete(k);
        if(tr._a!==a){const tmp=document.createElement('tbody');tmp.innerHTML=`<tr${a}></tr>`;const t2=tmp.firstChild;
          for(const at of[...tr.attributes])if(at.name!=='data-key'&&!t2.hasAttribute(at.name))tr.removeAttribute(at.name);
          for(const at of[...t2.attributes])tr.setAttribute(at.name,at.name==='class'&&tr.classList.contains('rin')?at.value+' rin':at.value);tr._a=a}
        cols.forEach((c,j)=>{let td=tr.cells[j];if(!td){td=tr.insertCell();if(c.cls)td.className=c.cls;td.dataset.label=Tbl.lab(c.h)}const h=c.f(r);if(td._h!==h){td.innerHTML=h;td._h=h}});
        const want=prev?prev.nextSibling:tb.firstChild;if(want!==tr)tb.insertBefore(tr,want);prev=tr});
      for(const tr of old.values())tr.remove();
      let tf=T.tFoot;if(foot){if(!tf)tf=T.createTFoot();if(tf._h!==foot){tf.innerHTML=`<tr>${foot}</tr>`;tf._h=foot}}else if(tf)tf.remove();
      el._h=null;return}
    const body=list.map((r,i)=>`<tr class="rin" data-key="${esc(key(r,i))}" style="--i:${Math.min(i,12)}"${opt.attr?opt.attr(r):''}>${cols.map(c=>`<td data-label="${esc(Tbl.lab(c.h))}"${c.cls?` class="${c.cls}"`:''}>${c.f(r)}</td>`).join('')}</tr>`).join('');
    // gộp class của dòng (rin + class riêng) vì attr có thể tự khai báo class
    el.innerHTML=`<div class="tw"><table><thead><tr>${th}</tr></thead><tbody>${body.replace(/class="rin"([^>]*?) class="([^"]*)"/g,'class="rin $2"$1')}</tbody>${foot?`<tfoot><tr>${foot}</tr></tfoot>`:''}</table></div>`;el._h=null;
    const T2=el.querySelector&&el.querySelector('table');if(!T2||!T2.tBodies)return;T2._th=th;
    [...T2.tBodies[0].rows].forEach((tr,i)=>{tr._a=opt.attr?opt.attr(list[i]):'';cols.forEach((c,j)=>tr.cells[j]._h=c.f(list[i]))});
    if(T2.tFoot)T2.tFoot._h=foot;
    if(typeof Tick!=='undefined')Tick.paint()},
  lab(h){return String(h).replace(/<[^>]*>/g,'').trim()},
  click(e){
    const th=e.target.closest&&e.target.closest('th[data-sort]');if(!th)return;
    const id=th.dataset.tbl,s=Tbl.st[id]||(Tbl.st[id]={k:null,d:-1});
    s.d=s.k===th.dataset.sort?-s.d:-1;s.k=th.dataset.sort;
    const L=Tbl.last[id];if(L)Tbl.render(id,L.el,L.cols,L.rows,L.opt)}
};

// Biểu đồ đường nhỏ (SVG) dùng cho lãi/lỗ lũy kế và đường vốn; đường nét đứt là mốc ban đầu v[0]
function lineChart(v,W=600,H=100){
  const mn=Math.min(...v),mx=Math.max(...v),y=n=>(H-6-(n-mn)/(mx-mn||1)*(H-12)).toFixed(1),b=v[0],cls=v[v.length-1]>=b?'up':'dn',
    d=v.map((n,i)=>(i?'L':'M')+(i/(v.length-1||1)*W).toFixed(1)+' '+y(n)).join('');
  return`<svg class="pc ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line class="z" x1="0" x2="${W}" y1="${y(b)}" y2="${y(b)}"/><path class="a" d="${d}L${W} ${y(b)}L0 ${y(b)}Z"/><path class="l" d="${d}" pathLength="1"/></svg>`}
// Biểu đồ giá thu nhỏ trên thẻ coin
const spark=(a,c,W,H)=>{
  const mn=Math.min(...a),mx=Math.max(...a),d=a.map((v,i)=>(i?'L':'M')+(i/(a.length-1)*W).toFixed(1)+' '+(H-2-(v-mn)/(mx-mn||1)*(H-4)).toFixed(1)).join('');
  return`<svg class="spark ${c}" viewBox="0 0 ${W} ${H}"><path class="a" d="${d}L${W} ${H}L0 ${H}Z"/><path class="l" d="${d}" pathLength="1"/></svg>`};

// Hộp thoại (modal) dùng chung: Modal.open(tiêu đề, html), đóng bằng Esc, nút ✕ hoặc bấm ra ngoài
const Modal={
  open(title,html){
    let m=$('modal');
    if(!m){m=document.createElement('div');m.id='modal';m.className='modal';document.body.appendChild(m);
      m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]'))Modal.close()});
      document.addEventListener('keydown',e=>{if(e.key==='Escape')Modal.close()})}
    m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true"><div class="mhead"><h2>${title}</h2><button class="ghost bx" data-close aria-label="Đóng">✕</button></div><div class="mbody">${html}</div></div>`;
    m.classList.add('on');document.body.classList.add('noscroll')},
  close(){const m=$('modal');if(m){m.classList.remove('on');document.body.classList.remove('noscroll')}if(typeof ChartView!=='undefined')ChartView.close()}
};
