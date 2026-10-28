import PDFDocument from 'pdfkit';
import path from 'node:path';
export function renderDocumentPdf(data) {
 return new Promise((resolve,reject)=> {
  const doc=new PDFDocument({size:'A4',margin:44,bufferPages:true,info:{Title:`${data.type} ${data.number}`,Author:data.issuer.name}});
  const chunks=[]; doc.on('data',c=>chunks.push(c)); doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
  doc.registerFont('body',path.join(process.cwd(),'assets/fonts/DejaVuSans.ttf')).font('body');
  const width=507, bottom=770;
  const money=n=>`${data.currency} ${(Number(n)/100).toFixed(2)}`;
  function header() {
   doc.rect(0,0,596,10).fill('#ed510c');
   doc.fillColor('#222').fontSize(17).text(data.issuer.name,44,35,{width:320});
   doc.fontSize(9).text([data.issuer.address,data.issuer.email,data.issuer.phone].filter(Boolean).join('\n'),44,62,{width:305});
   const leftBottom=doc.y;
   doc.fillColor('#d84b08').fontSize(14).text(data.type,365,35,{width:186,align:'right'});
   doc.fillColor('#222').fontSize(10).text(data.number,365,60,{width:186,align:'right'});
   doc.fontSize(9).text(`Date: ${data.date}\n${data.status}`,365,78,{width:186,align:'right'});
   doc.y=Math.max(leftBottom,doc.y,110)+16;doc.x=44;
  }
  function newPage(){doc.addPage();header();}
  function ensure(height){if(doc.y+height>bottom)newPage();}
  function block(label,value) {
   if(!value)return;
   ensure(40);doc.fillColor('#d84b08').fontSize(10).text(label,44,doc.y,{width});doc.moveDown(.4);
   doc.fillColor('#222').fontSize(10);
   // Draw individually wrapped lines so even very long text cannot invade the footer.
   for(const paragraph of String(value).split('\n')) {
    let line='';
    for(const word of paragraph.split(/\s+/)) {
     for(const character of (line?' ':'')+word) {
      if(doc.widthOfString(line+character)>width){ensure(15);doc.text(line,44,doc.y,{width,lineBreak:false});doc.y+=15;line='';}
      line+=character;
     }
    }
    ensure(15);doc.text(line||' ',44,doc.y,{width,lineBreak:false});doc.y+=15;
   }
   doc.y+=10;
  }
  function columns() {ensure(28);const y=doc.y;doc.rect(44,y,width,24).fill('#ed510c');doc.fillColor('white').fontSize(9);[['DESCRIPTION',50,260],['RATE',315,85],['QTY',405,48],['AMOUNT',455,90]].forEach(([t,x,w])=>doc.text(t,x,y+6,{width:w,align:x===50?'left':'right',lineBreak:false}));doc.y=y+32;}
  header();block('BILL TO',[data.customer.name,data.customer.contactName,data.customer.address,data.customer.email].filter(Boolean).join('\n'));
  if(data.validUntil)block('VALID UNTIL',data.validUntil);
  if(data.title)block('WORK',data.title);
  if(data.source)block('APPROVED SOURCE',data.source);
  columns();
  for(const item of data.items) {
   // Long descriptions are split into bounded lines; amounts appear once on the first line.
   doc.fontSize(9).fillColor('#222');let wrapped=[];
   for(const paragraph of item.description.split('\n')){
    let line='';for(const char of paragraph){if(doc.widthOfString(line+char)>255){wrapped.push(line);line='';}line+=char;}wrapped.push(line);
   }
   for(let index=0;index<wrapped.length;index++){
    if(doc.y+17>bottom){newPage();columns();doc.fontSize(9).fillColor('#222');}
    const y=doc.y;doc.text(wrapped[index]||' ',50,y,{width:255,lineBreak:false});
    if(index===0){doc.text(money(item.unitPriceMinor),310,y,{width:90,align:'right',lineBreak:false});doc.text(String(item.quantity),405,y,{width:48,align:'right',lineBreak:false});doc.text(money(item.amountMinor),455,y,{width:96,align:'right',lineBreak:false});}
    doc.y=y+15;
   }
   doc.y+=9;
  }
  ensure(90);doc.moveTo(44,doc.y).lineTo(551,doc.y).strokeColor('#dddddd').stroke();doc.y+=16;
  doc.fillColor('#222').fontSize(13).text(`TOTAL   ${money(data.totalMinor)}`,44,doc.y,{width,align:'right'});
  if(data.type==='INVOICE'){
   doc.fontSize(11).text(`Payments   ${money(data.paidMinor||0)}`,{align:'right'});
   doc.text(`BALANCE DUE   ${money(data.totalMinor-(data.paidMinor||0))}`,{align:'right'});
   if(data.dueDate)doc.fontSize(9).text(`Due: ${data.dueDate}`,{align:'right'});
  }
  doc.y+=20;
  block('PAYMENT TERMS',data.terms);block('NOTES',data.notes);block('BANK DETAILS',data.issuer.bank);
  if(data.status==='Draft')block('DRAFT','Not issued or approved.');
  const range=doc.bufferedPageRange();
  for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.page.margins.bottom=0;doc.fontSize(8).fillColor('#666').text(`${data.number}  |  ${i+1} / ${range.count}`,44,800,{width,align:'right',lineBreak:false});}
  doc.end();
 });
}
