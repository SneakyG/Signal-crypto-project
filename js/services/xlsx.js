/* Bộ tạo file Excel (.xlsx) chuyên nghiệp, không cần thư viện: nhiều sheet, định dạng, công thức (kèm giá trị tính sẵn),
   cố định hàng/cột, bộ lọc, định dạng có điều kiện, thanh dữ liệu và biểu đồ (đường, cột, vòng). */
function crc32(u){let t=crc32.t;if(!t){t=crc32.t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}}let r=-1;for(const b of u)r=t[(r^b)&255]^(r>>>8);return(r^-1)>>>0}
function zip(files){ // files: [[đường dẫn, chuỗi]] → Blob ZIP (lưu, không nén)
  const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  const u16=n=>[n&255,n>>8&255],u32=n=>[n&255,n>>8&255,n>>16&255,n>>>24&255];
  for(const[n,s]of files){
    const nm=enc.encode(n),d=enc.encode(s),c=crc32(d),L=d.length;
    const h=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(L),...u32(L),...u16(nm.length),...u16(0)]);
    parts.push(h,nm,d);
    cd.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(L),...u32(L),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=h.length+nm.length+L}
  const sz=cd.reduce((a,x)=>a+x.length,0);
  return new Blob([...parts,...cd,new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(sz),...u32(off),...u16(0)])],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}

const XL={
  col(n){let s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s},
  ref(r,c,abs){return abs?`$${XL.col(c)}$${r}`:XL.col(c)+r},
  parse(a){const m=/^\$?([A-Z]+)\$?(\d+)$/.exec(a);let c=0;for(const ch of m[1])c=c*26+ch.charCodeAt(0)-64;return[+m[2],c]},
  // Ngày giờ → số sê-ri Excel theo giờ máy người dùng
  date(ms){return(ms-new Date(ms).getTimezoneOffset()*6e4)/864e5+25569},
  x:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
  book(){return new XLBook()}
};
class XLBook{
  constructor(){this.sheets=[];this.charts=[];this.fonts=[];this.fills=[{none:1},{gray:1}];this.borders=[{}];this.fmts=[];this.xfs=[];this.dxfs=[];this.xfKey={};this.style({})}
  sheet(name,o={}){const s=new XLSheet(this,name,o);this.sheets.push(s);return s}
  idx(list,obj){const k=JSON.stringify(obj);let i=list.findIndex(x=>JSON.stringify(x)===k);if(i<0){list.push(obj);i=list.length-1}return i}
  // s: {b,i,sz,color,fill,num,h,v,wrap,bd:'thin'|'med'|'bottom'|'top',bdc,indent}
  style(s){
    const k=JSON.stringify(s);if(this.xfKey[k]!=null)return this.xfKey[k];
    const font=this.idx(this.fonts,{b:!!s.b,i:!!s.i,sz:s.sz||10,color:s.color||'1F2937'});
    const fill=s.fill?this.idx(this.fills,{c:s.fill}):0;
    const border=s.bd?this.idx(this.borders,{t:s.bd,c:s.bdc||'D7DEE8'}):0;
    let num=0;if(s.num){const builtin={'0':1,'0.00':2,'#,##0':3,'#,##0.00':4,'0%':9,'0.00%':10,'@':49}[s.num];num=builtin!=null?builtin:164+this.idx(this.fmts,s.num)}
    this.xfs.push({font,fill,border,num,h:s.h,v:s.v||'center',wrap:s.wrap,indent:s.indent});return this.xfKey[k]=this.xfs.length-1}
  dxf(d){this.dxfs.push(d);return this.dxfs.length-1}
  stylesXml(){
    const col=c=>`<color rgb="FF${c}"/>`,b=this;
    const fmts=b.fmts.length?`<numFmts count="${b.fmts.length}">${b.fmts.map((f,i)=>`<numFmt numFmtId="${164+i}" formatCode="${XL.x(f)}"/>`).join('')}</numFmts>`:'';
    const fonts=`<fonts count="${b.fonts.length}">${b.fonts.map(f=>`<font>${f.b?'<b/>':''}${f.i?'<i/>':''}<sz val="${f.sz}"/>${col(f.color)}<name val="Calibri"/><family val="2"/></font>`).join('')}</fonts>`;
    const fills=`<fills count="${b.fills.length}">${b.fills.map(f=>f.none?'<fill><patternFill patternType="none"/></fill>':f.gray?'<fill><patternFill patternType="gray125"/></fill>':`<fill><patternFill patternType="solid"><fgColor rgb="FF${f.c}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills>`;
    const side=(n,st,c)=>st?`<${n} style="${st}">${col(c)}</${n}>`:`<${n}/>`;
    const borders=`<borders count="${b.borders.length}">${b.borders.map(d=>{const t=d.t,c=d.c,all=t==='thin'||t==='med'?(t==='med'?'medium':'thin'):null;
      return`<border>${side('left',all,c)}${side('right',all,c)}${side('top',all||(t==='top'?'medium':null),c)}${side('bottom',all||(t==='bottom'?'thin':t==='bottom2'?'medium':null),c)}<diagonal/></border>`}).join('')}</borders>`;
    const xfs=`<cellXfs count="${b.xfs.length}">${b.xfs.map(x=>`<xf numFmtId="${x.num}" fontId="${x.font}" fillId="${x.fill}" borderId="${x.border}" xfId="0"${x.num?' applyNumberFormat="1"':''} applyFont="1"${x.fill?' applyFill="1"':''}${x.border?' applyBorder="1"':''} applyAlignment="1"><alignment${x.h?` horizontal="${x.h}"`:''} vertical="${x.v}"${x.wrap?' wrapText="1"':''}${x.indent?` indent="${x.indent}"`:''}/></xf>`).join('')}</cellXfs>`;
    const dxfs=`<dxfs count="${b.dxfs.length}">${b.dxfs.map(d=>`<dxf>${d.color||d.b?`<font>${d.b?'<b/>':''}${d.color?col(d.color):''}</font>`:''}${d.fill?`<fill><patternFill patternType="solid"><fgColor rgb="FF${d.fill}"/><bgColor rgb="FF${d.fill}"/></patternFill></fill>`:''}</dxf>`).join('')}</dxfs>`;
    return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${fmts}${fonts}${fills}${borders}<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>${xfs}<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>${dxfs}<tableStyles count="0"/></styleSheet>`}
  blob(meta={}){
    const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',M='http://schemas.openxmlformats.org/spreadsheetml/2006/main',X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',CT='application/vnd.openxmlformats-officedocument.';
    const files=[],ov=[];let nChart=0,nDraw=0;
    this.sheets.forEach((s,i)=>{
      const n=i+1,rels=[];let drawing='';
      if(s.charts.length){
        nDraw++;const dn=nDraw,drels=[];
        const anchors=s.charts.map((c,k)=>{nChart++;drels.push(`<Relationship Id="rId${k+1}" Type="${R}/chart" Target="../charts/chart${nChart}.xml"/>`);
          files.push([`xl/charts/chart${nChart}.xml`,XLChart.xml(c)]);ov.push([`/xl/charts/chart${nChart}.xml`,CT+'drawingml.chart+xml']);
          const[r1,c1]=XL.parse(c.from),[r2,c2]=XL.parse(c.to);
          return`<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${c1-1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r1-1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${c2-1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r2-1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${k+2}" name="Biểu đồ ${k+1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${k+1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`});
        files.push([`xl/drawings/drawing${dn}.xml`,X+`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${R}">${anchors.join('')}</xdr:wsDr>`]);
        files.push([`xl/drawings/_rels/drawing${dn}.xml.rels`,X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drels.join('')}</Relationships>`]);
        ov.push([`/xl/drawings/drawing${dn}.xml`,CT+'drawing+xml']);
        rels.push(`<Relationship Id="rId1" Type="${R}/drawing" Target="../drawings/drawing${dn}.xml"/>`);drawing='<drawing r:id="rId1"/>'}
      files.push([`xl/worksheets/sheet${n}.xml`,s.xml(drawing)]);ov.push([`/xl/worksheets/sheet${n}.xml`,CT+'spreadsheetml.worksheet+xml']);
      if(rels.length)files.push([`xl/worksheets/_rels/sheet${n}.xml.rels`,X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`])});
    const dn=this.sheets.map((s,i)=>s.filter?`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${XL.x(s.name)}'!${s.filter.replace(/([A-Z]+)(\d+)/g,'$$$1$$$2')}</definedName>`:'').join('');
    files.unshift(
      ['[Content_Types].xml',X+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="${CT}spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${ov.map(([p,t])=>`<Override PartName="${p}" ContentType="${t}"/>`).join('')}</Types>`],
      ['_rels/.rels',X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
      ['docProps/core.xml',X+`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${XL.x(meta.title||'')}</dc:title><dc:creator>Tín hiệu</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0,19)}Z</dcterms:created></cp:coreProperties>`],
      ['xl/workbook.xml',X+`<workbook xmlns="${M}" xmlns:r="${R}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${this.sheets.map((s,i)=>`<sheet name="${XL.x(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets>${dn?`<definedNames>${dn}</definedNames>`:''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
      ['xl/_rels/workbook.xml.rels',X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${this.sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${R}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${this.sheets.length+1}" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml',this.stylesXml()]);
    return zip(files)}
}
class XLSheet{
  constructor(book,name,o){this.book=book;this.name=name;this.rows={};this.cols={};this.heights={};this.merges=[];this.cfs=[];this.charts=[];this.tab=o.tab;this.freeze=o.freeze;this.filter=null;this.grid=!!o.grid;this.zoom=o.zoom||100}
  // Ghi ô: v = giá trị (số, chuỗi, null), f = công thức (không có dấu =), s = kiểu (object)
  set(a,v,s,f){const[r,c]=typeof a==='string'?XL.parse(a):a;(this.rows[r]||(this.rows[r]={}))[c]={v,f,x:s?this.book.style(s):0};return this}
  width(c,w){this.cols[typeof c==='string'?XL.parse(c+'1')[1]:c]=w;return this}
  height(r,h){this.heights[r]=h;return this}
  merge(ref){this.merges.push(ref);return this}
  cf(ref,rules){this.cfs.push({ref,rules});return this}
  chart(c){this.charts.push(c);return this}
  xml(drawing){
    const b=this.book,rs=Object.keys(this.rows).map(Number).sort((a,b)=>a-b);
    const data=rs.map(r=>{const row=this.rows[r],cs=Object.keys(row).map(Number).sort((a,b)=>a-b);
      return`<row r="${r}"${this.heights[r]?` ht="${this.heights[r]}" customHeight="1"`:''}>${cs.map(c=>{const{v,f,x}=row[c],ref=XL.col(c)+r,st=x?` s="${x}"`:'';
        if(f!=null){const isS=typeof v==='string';return`<c r="${ref}"${st}${isS?' t="str"':''}><f>${XL.x(f)}</f>${v==null?'':`<v>${isS?XL.x(v):(isFinite(v)?v:0)}</v>`}</c>`}
        if(v==null||v==='')return x?`<c r="${ref}"${st}/>`:'';
        if(typeof v==='number')return isFinite(v)?`<c r="${ref}"${st}><v>${v}</v></c>`:`<c r="${ref}"${st}/>`;
        return`<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${XL.x(v)}</t></is></c>`}).join('')}</row>`}).join('');
    const cols=Object.keys(this.cols).map(Number).sort((a,b)=>a-b);
    let pane='';
    if(this.freeze){const[r,c]=XL.parse(this.freeze),xs=c-1,ys=r-1;pane=`<pane${xs?` xSplit="${xs}"`:''}${ys?` ySplit="${ys}"`:''} topLeftCell="${this.freeze}" activePane="${xs&&ys?'bottomRight':ys?'bottomLeft':'topRight'}" state="frozen"/>`}
    let pr=0;const cf=this.cfs.map(({ref,rules})=>`<conditionalFormatting sqref="${ref}">${rules.map(u=>{pr++;
      if(u.bar)return`<cfRule type="dataBar" priority="${pr}"><dataBar><cfvo type="min"/><cfvo type="max"/><color rgb="FF${u.bar}"/></dataBar></cfRule>`;
      const d=b.dxf(u.dxf);
      return u.expr?`<cfRule type="expression" dxfId="${d}" priority="${pr}"><formula>${XL.x(u.expr)}</formula></cfRule>`
        :`<cfRule type="cellIs" dxfId="${d}" priority="${pr}" operator="${u.op}"><formula>${XL.x(u.val)}</formula></cfRule>`}).join('')}</conditionalFormatting>`).join('');
    return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      +`<sheetPr>${this.tab?`<tabColor rgb="FF${this.tab}"/>`:''}<pageSetUpPr fitToPage="1"/></sheetPr>`
      +`<sheetViews><sheetView workbookViewId="0"${this.grid?'':' showGridLines="0"'}${this.zoom!==100?` zoomScale="${this.zoom}"`:''}>${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18" customHeight="1"/>`
      +(cols.length?`<cols>${cols.map(c=>`<col min="${c}" max="${c}" width="${this.cols[c]}" customWidth="1"/>`).join('')}</cols>`:'')
      +`<sheetData>${data}</sheetData>`
      +(this.filter?`<autoFilter ref="${this.filter}"/>`:'')
      +(this.merges.length?`<mergeCells count="${this.merges.length}">${this.merges.map(m=>`<mergeCell ref="${m}"/>`).join('')}</mergeCells>`:'')
      +cf+`<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>`+drawing+`</worksheet>`}
}
/* Biểu đồ: {type:'line'|'bar'|'doughnut', title, from:'H5', to:'P20', cat:{f, v:[nhãn]}, series:[{name, f, v:[số], color, colors?:[màu từng điểm]}], fmt, legend} */
const XLChart={
  rich(t,sz=1200,b=1,c='1F2937'){return`<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="${b}"><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></a:defRPr></a:pPr><a:r><a:rPr lang="vi-VN" sz="${sz}" b="${b}"><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></a:rPr><a:t>${XL.x(t)}</a:t></a:r></a:p></c:rich></c:tx>`},
  txt(sz=900,c='6B7280'){return`<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}"><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="vi-VN"/></a:p></c:txPr>`},
  fill:c=>`<a:solidFill><a:srgbClr val="${c}"/></a:solidFill>`,
  cat(c){return`<c:cat><c:strRef><c:f>${XL.x(c.f)}</c:f><c:strCache><c:ptCount val="${c.v.length}"/>${c.v.map((v,i)=>`<c:pt idx="${i}"><c:v>${XL.x(v)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>`},
  val(s){return`<c:val><c:numRef><c:f>${XL.x(s.f)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${s.v.length}"/>${s.v.map((v,i)=>`<c:pt idx="${i}"><c:v>${+(+v).toFixed(6)}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val>`},
  axes(fmt){
    const ln=`<c:spPr><a:ln w="6350">${this.fill('D7DEE8')}</a:ln></c:spPr>`;
    return`<c:catAx><c:axId val="5001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/>${ln}${this.txt(800)}<c:crossAx val="5002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`
      +`<c:valAx><c:axId val="5002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350">${this.fill('EEF1F5')}</a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${XL.x(fmt||'General')}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${this.txt(800)}<c:crossAx val="5001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`},
  xml(c){
    let plot='';
    if(c.type==='line')plot=`<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${c.series.map((s,i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${XL.x(s.name)}</c:v></c:tx><c:spPr><a:ln w="31750" cap="rnd">${this.fill(s.color)}<a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr>${this.fill('FFFFFF')}<a:ln w="19050">${this.fill(s.color)}</a:ln></c:spPr></c:marker>${this.cat(c.cat)}${this.val(s)}<c:smooth val="0"/></c:ser>`).join('')}<c:marker val="1"/><c:axId val="5001"/><c:axId val="5002"/></c:lineChart>${this.axes(c.fmt)}`;
    else if(c.type==='bar')plot=`<c:barChart><c:barDir val="${c.horiz?'bar':'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${c.series.map((s,i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${XL.x(s.name)}</c:v></c:tx><c:spPr>${this.fill(s.color)}</c:spPr><c:invertIfNegative val="0"/>${(s.colors||[]).map((col,k)=>`<c:dPt><c:idx val="${k}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/><c:spPr>${this.fill(col)}</c:spPr></c:dPt>`).join('')}<c:dLbls><c:numFmt formatCode="${XL.x(c.fmt||'General')}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${this.txt(800,'374151')}<c:dLblPos val="outEnd"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>${this.cat(c.cat)}${this.val(s)}</c:ser>`).join('')}<c:gapWidth val="60"/><c:axId val="5001"/><c:axId val="5002"/></c:barChart>${this.axes(c.fmt)}`.replace('<c:axPos val="b"/>',`<c:axPos val="${c.horiz?'l':'b'}"/>`);
    else plot=`<c:doughnutChart><c:varyColors val="1"/>${c.series.map((s,i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${XL.x(s.name)}</c:v></c:tx>${s.colors.map((col,k)=>`<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/><c:spPr>${this.fill(col)}<a:ln w="19050">${this.fill('FFFFFF')}</a:ln></c:spPr></c:dPt>`).join('')}<c:dLbls><c:numFmt formatCode="0" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${this.txt(1000,'FFFFFF')}<c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/><c:showLeaderLines val="0"/></c:dLbls>${this.cat(c.cat)}${this.val(s)}</c:ser>`).join('')}<c:firstSliceAng val="0"/><c:holeSize val="58"/></c:doughnutChart>`;
    const legend=c.legend?`<c:legend><c:legendPos val="${c.legend}"/><c:overlay val="0"/>${this.txt(900,'374151')}</c:legend>`:'';
    return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:roundedCorners val="0"/><c:chart><c:title>${this.rich(c.title)}<c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr>${this.fill('FFFFFF')}<a:ln w="9525">${this.fill('D7DEE8')}</a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="vi-VN"/></a:p></c:txPr></c:chartSpace>`}
};
