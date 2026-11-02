/* Tin tức uy tín: đọc RSS của các toà soạn crypto lớn qua bộ chuyển RSS→JSON miễn phí (rss2json.com, có CORS, không cần khoá).
   (API tin tức của CryptoCompare/CoinDesk Data đã thu phí từ 05/2026 nên không dùng.)
   Nhãn Tăng/Giảm được gán TỰ ĐỘNG theo từ khoá trong tiêu đề và mô tả, chỉ mang tính tham khảo. */
const News={
  FEEDS:[['Cointelegraph','https://cointelegraph.com/rss'],['CoinDesk','https://www.coindesk.com/arc/outboundfeeds/rss/'],['Decrypt','https://decrypt.co/feed'],
    ['The Block','https://www.theblock.co/rss.xml'],['CryptoSlate','https://cryptoslate.com/feed/'],['Bitcoin Magazine','https://bitcoinmagazine.com/.rss/full/']],
  NAMES:{BTC:['bitcoin'],ETH:['ethereum','ether'],BNB:['bnb chain','binance coin'],SOL:['solana'],XRP:['ripple','xrp ledger'],DOGE:['dogecoin'],ADA:['cardano'],TRX:['tron'],AVAX:['avalanche'],
    LINK:['chainlink'],DOT:['polkadot'],LTC:['litecoin'],BCH:['bitcoin cash'],NEAR:['near protocol'],UNI:['uniswap'],ATOM:['cosmos hub'],XLM:['stellar'],ETC:['ethereum classic'],APT:['aptos'],SUI:['sui network']},
  // dấu * = khớp phần đầu của từ (vd. "surge*" khớp "surges", "surged")
  UP:['surge*','soar*','rally','rallies','jump*','climb*','rise','rises','gain*','breakout','record high','all-time high','ath','approv*','inflow*','adopt*','partnership*','launch*','upgrade*','bullish','accumulat*','rebound*','recover*','boost*','milestone*','integrat*','institution*'],
  DN:['plunge*','crash*','tumbl*','drop*','fall*','fell','slump*','sell-off','selloff','dump*','liquidat*','hack*','exploit*','stolen','theft','lawsuit*','sues','sued','ban','bans','banned','crackdown*','probe*','investigat*','fraud*','scam*','bankrupt*','insolven*','outflow*','bearish','warning*','delist*','declin*','halt*','shutdown*','penalt*','fined'],
  items:[],at:0,err:'',
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
  async feed(name,url,key){
    const u='https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(url)+(key?'&api_key='+encodeURIComponent(key)+'&count=40':'');
    const j=await(await fetch(u)).json();if(j.status!=='ok')throw new Error(j.message||'lỗi nguồn tin');
    return j.items.map(it=>{
      const title=this.strip(it.title),text=this.strip(it.description||it.content),sc=this.score(title,text);
      return{src:name,title,link:it.link,t:Date.parse(String(it.pubDate||'').replace(' ','T')+'Z')||Date.now(),text,sc,tone:sc>=1?'up':sc<=-1?'dn':'nt',coins:this.coins(title,text)}})},
  async load(force){
    if(!force&&this.items.length&&Date.now()-this.at<6e5)return this.items;
    const key=Store.get('rssk',''),res=await Promise.allSettled(this.FEEDS.map(([n,u])=>this.feed(n,u,key))),seen=new Set(),items=[];let ok=0;
    for(const r of res)if(r.status==='fulfilled'){ok++;for(const it of r.value)if(!seen.has(it.link)){seen.add(it.link);items.push(it)}}
    this.err=ok?'':'Không tải được nguồn tin nào. Kiểm tra mạng rồi bấm Tải lại.';
    items.sort((a,b)=>b.t-a.t);this.items=items;this.at=Date.now();return items}
};
