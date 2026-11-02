/* Tin tức realtime từ các toà soạn crypto uy tín. Tự tải lại mỗi 60 giây khi trang đang mở.
   Nguồn (chạy song song, nguồn nào lỗi thì bỏ qua):
     1) RSS gốc của từng toà soạn, đọc qua cầu nối CORS allorigins.win (mới nhất, không bị bộ nhớ đệm)
     2) Dự phòng: rss2json.com (miễn phí, có thể chậm tới ~1 giờ)
     3) cryptocurrency.cv/api/news (tổng hợp tin miễn phí, không cần khoá)
   Nhãn Tăng/Giảm gán TỰ ĐỘNG theo từ khoá, chỉ để tham khảo. */
const News={
  FEEDS:[['Cointelegraph','https://cointelegraph.com/rss'],['CoinDesk','https://www.coindesk.com/arc/outboundfeeds/rss/'],['Decrypt','https://decrypt.co/feed'],
    ['The Block','https://www.theblock.co/rss.xml'],['CryptoSlate','https://cryptoslate.com/feed/'],['Bitcoin Magazine','https://bitcoinmagazine.com/.rss/full/'],['CryptoPotato','https://cryptopotato.com/feed/']],
  NAMES:{BTC:['bitcoin'],ETH:['ethereum','ether'],BNB:['bnb chain','binance coin'],SOL:['solana'],XRP:['ripple','xrp ledger'],DOGE:['dogecoin'],ADA:['cardano'],TRX:['tron'],AVAX:['avalanche'],
    LINK:['chainlink'],DOT:['polkadot'],LTC:['litecoin'],BCH:['bitcoin cash'],NEAR:['near protocol'],UNI:['uniswap'],ATOM:['cosmos hub'],XLM:['stellar'],ETC:['ethereum classic'],APT:['aptos'],SUI:['sui network'],
    TON:['toncoin','the open network'],ARB:['arbitrum'],OP:['optimism'],INJ:['injective'],AAVE:['aave'],FIL:['filecoin'],HBAR:['hedera'],ICP:['internet computer'],SEI:['sei network'],TIA:['celestia']},
  UP:['surge*','soar*','rally','rallies','jump*','climb*','rise','rises','gain*','breakout','record high','all-time high','ath','approv*','inflow*','adopt*','partnership*','launch*','upgrade*','bullish','accumulat*','rebound*','recover*','boost*','milestone*','integrat*','institution*'],
  DN:['plunge*','crash*','tumbl*','drop*','fall*','fell','slump*','sell-off','selloff','dump*','liquidat*','hack*','exploit*','stolen','theft','lawsuit*','sues','sued','ban','bans','banned','crackdown*','probe*','investigat*','fraud*','scam*','bankrupt*','insolven*','outflow*','bearish','warning*','delist*','declin*','halt*','shutdown*','penalt*','fined'],
  items:[],at:0,err:'',seen:new Map(),fresh:new Set(),src:{},FRESH:6e5, // tin được đánh dấu MỚI trong 10 phút
  re(l){return l.map(w=>new RegExp(w.endsWith('*')?'\\b'+w.slice(0,-1)+'\\w*':'\\b'+w.replace(/[-]/g,'\\-')+'\\b','i'))},
  strip(h){return String(h||'').replace(/<[^>]*>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim()},
  hits(t,R){let n=0;for(const r of R)if(r.test(t))n++;return n},
  score(title,text){
    this.U=this.U||this.re(this.UP);this.D=this.D||this.re(this.DN);const b=text.slice(0,300);
    return 2*(this.hits(title,this.U)-this.hits(title,this.D))+(this.hits(b,this.U)-this.hits(b,this.D))},
  coins(title,text){
    const all=title+' '+text,low=all.toLowerCase(),out=[];
    for(const[c,names]of Object.entries(this.NAMES))if(names.some(n=>low.includes(n))||new RegExp('\\b'+c+'\\b').test(all))out.push(c);
    return out},
  mk(src,title,link,t,desc){title=this.strip(title);const text=this.strip(desc),sc=this.score(title,text);
    return{src,title,link,t:t||Date.now(),text,sc,tone:sc>=1?'up':sc<=-1?'dn':'nt',coins:this.coins(title,text)}},
  async get(u,ms=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r}finally{clearTimeout(t)}},
  // RSS gốc qua cầu nối CORS → mới nhất
  async direct(name,url){
    const x=await(await this.get('https://api.allorigins.win/raw?url='+encodeURIComponent(url)+'&_='+Math.floor(Date.now()/6e4))).text();
    const doc=new DOMParser().parseFromString(x,'text/xml'),items=[...doc.querySelectorAll('item,entry')];if(!items.length)throw new Error('RSS rỗng');
    const g=(n,s)=>{const e=n.querySelector(s);return e?(e.textContent||e.getAttribute('href')||''):''};
    return items.slice(0,30).map(n=>this.mk(name,g(n,'title'),g(n,'link')||(n.querySelector('link')||{getAttribute:()=>''}).getAttribute('href'),Date.parse(g(n,'pubDate')||g(n,'published')||g(n,'updated')),g(n,'description')||g(n,'summary')))},
  async viaJson(name,url){
    const key=Store.get('rssk',''),u='https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(url)+(key?'&api_key='+encodeURIComponent(key)+'&count=40':'');
    const j=await(await this.get(u)).json();if(j.status!=='ok')throw new Error(j.message||'lỗi nguồn tin');
    return j.items.map(it=>this.mk(name,it.title,it.link,Date.parse(String(it.pubDate||'').replace(' ','T')+'Z'),it.description||it.content))},
  async feed(name,url){try{const r=await this.direct(name,url);this.src[name]='trực tiếp';return r}catch(e){const r=await this.viaJson(name,url);this.src[name]='rss2json';return r}},
  async aggregator(){
    const j=await(await this.get('https://cryptocurrency.cv/api/news?limit=50')).json();
    const arr=Array.isArray(j)?j:j.articles||j.news||j.data||j.items||[];
    return arr.map(a=>this.mk((typeof a.source==='string'?a.source:a.source&&a.source.name)||a.source_name||'cryptocurrency.cv',a.title,a.link||a.url,Date.parse(a.pubDate||a.published_at||a.publishedAt||a.date||'')||Date.now(),a.description||a.summary||'')).filter(x=>x.title&&x.link)},
  async load(force){
    if(!force&&this.items.length&&Date.now()-this.at<55e3)return this.items;
    const res=await Promise.allSettled([...this.FEEDS.map(([n,u])=>this.feed(n,u)),this.aggregator()]),map=new Map();let ok=0;
    for(const r of res)if(r.status==='fulfilled'){ok++;for(const it of r.value){const k=it.link||it.title;if(k&&!map.has(k))map.set(k,it)}}
    if(!ok){this.err='Không tải được nguồn tin nào. Kiểm tra mạng, bảng sẽ thử lại sau 60 giây.';return this.items}
    this.err='';const items=[...map.values()].filter(i=>i.t<=Date.now()+6e5).sort((a,b)=>b.t-a.t).slice(0,150);
    const first=!this.seen.size,now=Date.now(),before=new Set(this.fresh);this.fresh=new Set();this.added=0;
    for(const it of items){const k=it.link||it.title;if(!this.seen.has(k)){this.seen.set(k,first?0:now);if(!first)this.added++}
      if(now-this.seen.get(k)<this.FRESH)this.fresh.add(k)}
    this.newNow=items.filter(it=>{const k=it.link||it.title;return this.fresh.has(k)&&!before.has(k)});
    this.items=items;this.at=Date.now();return items}
};
