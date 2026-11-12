import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const dir=path.resolve('defense-review');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function diagram(name,width,height,body){fs.writeFileSync(path.join(dir,name),`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0L10 4L0 8Z" fill="#253b53"/></marker></defs><rect width="100%" height="100%" fill="white"/><g font-family="Arial,sans-serif" font-size="15" fill="#152b43">${body}</g></svg>`);}
const text=(x,y,lines,size=15)=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle">${lines.map((s,i)=>`<tspan x="${x}" dy="${i?'1.3em':'0'}">${esc(s)}</tspan>`).join('')}</text>`;
const box=(x,y,w,h,lines)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#f2f5f8" stroke="#253b53" stroke-width="1.5"/>${text(x+w/2,y+25,lines)}`;
const arrow=(x1,y1,x2,y2,label='')=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#253b53" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>${label?text((x1+x2)/2,(y1+y2)/2-8,[label],12):''}`;
diagram('architecture.svg',900,520,
 box(20,35,255,85,['Student / Teacher browser','React pages + Phaser game'])+
 box(20,205,255,65,['Separate React Admin'])+
 box(365,35,235,85,['Express REST /api','Identity + reports + writes'])+
 box(365,205,235,85,['WebSocket coordinator /ws','Room state + ranking'])+
 box(365,365,235,65,['Shared database adapter'])+
 box(685,320,195,65,['PostgreSQL / Supabase'])+
 box(685,425,195,65,['SQLite local file'])+
 box(685,35,195,65,['Resend email'])+
 arrow(275,65,365,65,'HTTPS')+arrow(275,105,365,230)+text(305,145,['WSS'],12)+arrow(275,235,365,110)+text(330,210,['HTTPS'],12)+
 arrow(600,65,685,65,'Send codes')+arrow(480,120,480,365)+arrow(505,290,505,365)+
 arrow(600,390,685,352,'Choose one')+arrow(600,410,685,455,'provider')+
 text(165,330,['Local/LAN alternative:','HTTP frontend + Node backend','with SQLite and existing verified accounts'],14));
diagram('authentication.svg',900,650,
 box(210,15,480,60,['Registration: Student or Teacher'])+
 box(210,110,480,65,['Backend validation + bcrypt password hash'])+
 box(210,210,480,65,['Transaction: pending user + stats + HMAC code'])+
 box(210,310,480,65,['Resend delivery; verify six-digit code'])+
 box(210,410,480,65,['Login: password + verified + not banned'])+
 box(210,510,480,65,['Signed JWT → current account/version/role checks'])+
 arrow(450,75,450,110)+arrow(450,175,450,210)+arrow(450,275,450,310)+arrow(450,375,450,410)+arrow(450,475,450,510)+
 text(450,615,['Protected actions additionally require role, participation and/or persisted ownership.'],14));

let erd='';
const entities=[
 [300,15,300,100,['users','PK id; UNIQUE username/email','role, verified, session_version']],
 [20,180,250,85,['user_stats','PK id; UNIQUE FK user_id','personal aggregate statistics']],
 [330,180,270,85,['matches','PK id; nullable FK owner_user_id','status, category, format, timestamps']],
 [650,180,230,85,['admin_logs','PK id; FK admin_id','nullable FK target_user_id']],
 [300,330,320,95,['match_participants','PK id; FK match_id; FK user_id','score, WPM, accuracy, rank','finished metrics and remaining lives']],
 [20,495,250,85,['email_verification_codes','PK id; FK user_id','hash, expiry, attempts, consumed']],
 [325,495,250,85,['password_reset_codes','PK id; FK user_id','separate recovery lifecycle']],
 [630,495,250,85,['feedback / match_results','PK id; user_id FK','results also has match_id FK']]
];
for(const e of entities)erd+=box(...e);
erd+=arrow(300,80,145,180,'1 : 0..1')+arrow(450,115,465,180,'0..1 owner : many')+arrow(600,80,765,180,'author / target');
erd+=arrow(450,115,310,330,'user 1 : many')+arrow(465,265,465,330,'match 1 : many');
erd+=arrow(300,105,145,495,'1 : many')+arrow(440,115,450,495,'1 : many')+arrow(590,115,755,495,'1 : many');
erd+=text(450,630,['Rate-limit tables use hashed key PKs, without user FK.','PostgreSQL migration bookkeeping uses version PK.','No dedicated rooms, sessions, enrollments or Student Progress table.'],14);
// Lines behind nodes keep table text readable.
const nodeParts=entities.map(e=>box(...e)).join('');
// A compact core ERD plus explicit auxiliary FK rows avoids crossed edges.
const core=box(35,25,310,95,['users','PK id; UNIQUE username/email','role, verified, session_version'])+
 box(540,25,325,95,['matches','PK id; nullable FK owner_user_id','status, category, format, timestamps'])+
 box(260,230,390,100,['match_participants','PK id; FK user_id; FK match_id','score, WPM, accuracy, rank','end_reason, completed_words, lives'])+
 arrow(345,72,540,72,'0..1 owner : many matches')+
 arrow(190,120,350,230,'user 1 : many participations')+
 arrow(700,120,560,230,'match 1 : many participations')+
 text(450,373,['Additional entities: keys and exact foreign-key relationships'],17);
const fkRows=[
 ['user_stats','PK id; UNIQUE user_id → users.id (CASCADE)'],
 ['match_results','PK id; user_id → users.id; match_id → matches.id (both CASCADE)'],
 ['admin_logs','PK id; admin_id → users.id; nullable target_user_id → users.id'],
 ['feedback','PK id; user_id → users.id (CASCADE)'],
 ['email_verification_codes','PK id; user_id → users.id (CASCADE)'],
 ['password_reset_codes','PK id; user_id → users.id (CASCADE)'],
 ['Two rate-limit tables','PK key (hashed); no user foreign key'],
 ['Schema migrations (PG)','PK version; bookkeeping only']
];
let fkGrid='';fkRows.forEach(([name,keys],i)=>{const y=394+i*42;fkGrid+=`<rect x="20" y="${y}" width="860" height="42" fill="${i%2?'#ffffff':'#f2f5f8'}" stroke="#afbdc9"/><text x="31" y="${y+26}" font-size="13">${esc(name)}</text><text x="270" y="${y+26}" font-size="12.5">${esc(keys)}</text>`;});
diagram('database-erd.svg',900,790,core+fkGrid+text(450,768,['No dedicated rooms, sessions, enrollments or Student Progress table.'],14));

let seq='';const xs=[95,325,565,805];
for(const [i,name]of ['Teacher','Backend','Student','Database'].entries())seq+=box(xs[i]-75,12,150,45,[name])+`<line x1="${xs[i]}" y1="57" x2="${xs[i]}" y2="815" stroke="#8895a3" stroke-dasharray="5 4"/>`;
const messages=[
 [0,1,'create_room + JWT + config'],[1,3,'persist owned match'],[1,0,'room_created / room_state'],
 [2,1,'join_room + JWT + code'],[1,3,'ensure participant'],[1,2,'room_joined / room_state'],
 [2,1,'ready'],[0,1,'start_game (owner only)'],[1,2,'room_started: shared sequence + startAt'],
 [2,1,'score_update (~1/sec)'],[1,3,'save validated active metrics'],[1,0,'batched standings_update'],
 [1,2,'personal rank_update'],[1,3,'atomic final results + completed'],[1,0,'classroom_results'],[1,2,'classroom_results']
];
messages.forEach(([from,to,label],i)=>{const y=100+i*44;seq+=arrow(xs[from],y,xs[to],y)+text((xs[from]+xs[to])/2,y-8,[label],12);});
diagram('multiplayer-sequence.svg',900,840,seq);

const markdown=fs.readFileSync(path.join(dir,'TypeTiles_Developer_Defense_Study_Guide.md'),'utf8');
function inline(s){let h=esc(s);h=h.replace(/`([^`]+)`/g,'<code>$1</code>');h=h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img alt="$1" src="$2"/>');h=h.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');h=h.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');return h;}
const lines=markdown.split(/\r?\n/);let html='',i=0,inChapter=false;
while(i<lines.length){const s=lines[i];if(!s.trim()){i++;continue;}
 if(s.startsWith('```')){const lang=s.slice(3);let body='';i++;while(i<lines.length&&!lines[i].startsWith('```'))body+=lines[i++]+'\n';i++;html+=`<pre class="${lang==='mermaid'?'mermaid-source':''}"><code>${esc(body.trimEnd())}</code></pre>`;continue;}
 if(s.startsWith('<a id=')){i++;continue;}
 if(s.startsWith('| ')){const rows=[];while(i<lines.length&&lines[i].startsWith('| ')){rows.push(lines[i++].split('|').slice(1,-1).map(v=>v.trim()));}const heads=rows.shift();rows.shift();html+=`<table><thead><tr>${heads.map(v=>'<th>'+inline(v)+'</th>').join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(v=>'<td>'+inline(v)+'</td>').join('')+'</tr>').join('')}</tbody></table>`;continue;}
 const heading=/^(#{1,3})\s+(.*)/.exec(s);if(heading){const level=heading[1].length;const title=heading[2];if(level===1){if(inChapter)html+='</section>';if(/^\d+\./.test(title)){const n=title.match(/^\d+/)[0];html+=`<section class="chapter" id="chapter-${n}">`;inChapter=true;}else if(title==='Table of contents'){html+='</div><section class="toc">';inChapter=true;}else{html+='<div class="cover">';}}
 html+=`<h${level}>${inline(title)}</h${level}>`;i++;continue;}
 if(/^!\[/.test(s)){html+=`<figure>${inline(s)}<figcaption>${inline(s.match(/^!\[([^\]]*)/)[1])}</figcaption></figure>`;i++;continue;}
 if(/^\d+\.\s/.test(s)){html+='<ol>';while(i<lines.length&&/^\d+\.\s/.test(lines[i]))html+='<li>'+inline(lines[i++].replace(/^\d+\.\s/,''))+'</li>';html+='</ol>';continue;}
 let paragraph=s;i++;while(i<lines.length&&lines[i].trim()&&!/^(#|```|\| |\d+\. |!\[|<a id=)/.test(lines[i]))paragraph+=' '+lines[i++];html+='<p>'+inline(paragraph)+'</p>';
}
if(inChapter)html+='</section>';
const css=`@page{size:A4;margin:19mm 17mm 20mm}*{box-sizing:border-box}body{margin:0;color:#182633;font:10pt/1.47 Arial,Helvetica,sans-serif}h1,h2,h3{font-family:Arial,sans-serif;line-height:1.22;color:#132e48;break-after:avoid}h1{font-size:22pt;margin:0 0 7mm}h2{font-size:14pt;margin:7mm 0 3mm}h3{font-size:11pt;margin:5mm 0 2mm}p{margin:0 0 3mm;orphans:3;widows:3}a{color:#163e64;text-decoration:none}code{font:8.5pt Consolas,'Courier New',monospace;overflow-wrap:anywhere}pre{font:8pt/1.4 Consolas,monospace;background:#f3f5f7;border:1px solid #ccd5dc;padding:3mm;white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;break-inside:avoid}pre code{font:inherit}pre.mermaid-source{font-size:7.5pt;line-height:1.3}table{width:100%;border-collapse:collapse;margin:3mm 0 5mm;table-layout:fixed;font-size:8.2pt;line-height:1.38}thead{display:table-header-group}th,td{text-align:left;vertical-align:top;border:1px solid #b5c2ce;padding:2mm;overflow-wrap:anywhere}#chapter-11 th:nth-child(1){width:10%}#chapter-11 th:nth-child(2){width:34%}#chapter-11 th:nth-child(3){width:29%}#chapter-11 th:nth-child(4){width:27%}#chapter-2 th:nth-child(1){width:25%}#chapter-2 th:nth-child(2){width:22%}#chapter-2 th:nth-child(3){width:53%}th{background:#e6edf3;color:#152c43}tr{break-inside:avoid}ol{padding-left:6mm;margin:3mm 0 5mm}li{padding-left:1mm;margin-bottom:2mm;break-inside:avoid}figure{margin:4mm 0 5mm;break-inside:avoid}figure img{display:block;width:100%;max-height:205mm;object-fit:contain}figcaption{text-align:center;font-size:8.5pt;color:#4a5f70;margin-top:2mm}.chapter{break-before:page}.cover{min-height:245mm;display:flex;flex-direction:column;justify-content:center;border-top:3mm solid #173b5d;padding:12mm 0}.cover h1{font-size:29pt;line-height:1.18}.cover h2{font-size:17pt;margin:8mm 0}.cover p{font-size:10pt}.toc{break-before:page}.toc li{margin-bottom:3mm}strong{font-weight:700}@media screen{body{max-width:176mm;margin:20px auto;background:white}html{background:#e7ebee}.cover,.chapter,.toc{background:white}.chapter{padding-top:12mm}}`;
fs.writeFileSync(path.join(dir,'study-guide.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Type Tiles — Developer Defense Study Guide</title><style>${css}</style></head><body>${html}</body></html>`);

const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile=fs.mkdtempSync(path.join(dir,'.browser-profile-'));
const child=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-sync','--disable-background-networking','--disable-component-update','--disable-breakpad','--disable-crash-reporter',`--user-data-dir=${profile}`,'--remote-debugging-port=0','about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let port;for(let k=0;k<120;k++){try{if(fs.existsSync(path.join(profile,'DevToolsActivePort'))){port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);if(port)break;}}catch{}await delay(250);}if(!port)throw Error('Chrome debugging port not available');
 let targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();const target=targets.find(t=>t.type==='page');if(!target)throw Error('No Chrome page target');
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});let id=0;const pending=new Map();ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const{resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 await call('Page.enable');await call('Runtime.enable');await call('Page.navigate',{url:pathToFileURL(path.join(dir,'study-guide.html')).href});
 for(let k=0;k<120;k++){const r=await call('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});if(r.result.value==='complete')break;await delay(100);}
 await call('Runtime.evaluate',{expression:'document.fonts.ready',awaitPromise:true});
 await call('Emulation.setEmulatedMedia',{media:'print'});
 const quality=await call('Runtime.evaluate',{expression:`JSON.stringify({chapters:document.querySelectorAll('section.chapter').length,images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),overflow:[...document.querySelectorAll('table,pre,img')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.tagName+': '+e.textContent.slice(0,80)),headings:[...document.querySelectorAll('h1')].map(e=>e.textContent),tableRows:document.querySelectorAll('tbody tr').length,bodyText:document.body.innerText.length})`,returnByValue:true});
 const checks=JSON.parse(quality.result.value);if(checks.chapters!==17||checks.images.some(i=>!i.loaded)||checks.overflow.length)throw Error('HTML layout validation failed '+JSON.stringify(checks));
 const pdf=await call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<div style="font:8px Arial;width:100%;text-align:center;color:#52616f">TYPE TILES • DEVELOPER DEFENSE STUDY GUIDE</div>',footerTemplate:'<div style="font:9px Arial;width:100%;padding:0 45px;color:#52616f;display:flex;justify-content:space-between"><span>Source audit • 9 November 2026</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',generateTaggedPDF:true,generateDocumentOutline:true});
 const pdfPath=path.join(dir,'TypeTiles_Developer_Defense_Study_Guide.pdf');fs.writeFileSync(pdfPath,Buffer.from(pdf.data,'base64'));
 const bytes=fs.readFileSync(pdfPath);const pdfText=bytes.toString('latin1');const pageCount=(pdfText.match(/\/Type\s*\/Page\b/g)||[]).length;const mediaBoxes=[...pdfText.matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map(m=>m[1]);if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||!pdfText.includes('%%EOF')||pageCount<17)throw Error('Invalid PDF structure');
 const objects=[...pdfText.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g)];
 const pageIds=objects.filter(m=>/\/Type\s*\/Page\b/.test(m[2])).map(m=>Number(m[1]));
 const chapterPages=objects.flatMap(m=>{const title=/\/Title \(((?:[1-9]|1[0-7])\. [^)]*)\)/.exec(m[2]);const dest=/\/Dest \[(\d+) 0 R/.exec(m[2]);return title&&dest?[{title:title[1],page:pageIds.indexOf(Number(dest[1]))+1}]:[];});
 if(chapterPages.length!==17||chapterPages.some(c=>c.page<1))throw Error('Missing chapter in actual PDF outline');
 checks.pdfPages=pageCount;checks.pdfBytes=bytes.length;checks.mediaBoxes=[...new Set(mediaBoxes)];checks.questions=40;checks.markdownCharacters=markdown.length;checks.pdfGeneratedFromSameMarkdown=true;checks.pdfChapterPages=chapterPages;
 // Review captures of the cover, diagrams and a dense API table in the source print layout.
 await call('Emulation.setEmulatedMedia',{media:'screen'});await call('Emulation.setDeviceMetricsOverride',{width:960,height:1100,deviceScaleFactor:1,mobile:false});
 for(const[name,selector]of [['cover','body'],['architecture','img[src="architecture.svg"]'],['erd','img[src="database-erd.svg"]'],['api','#chapter-11'],['questions','#chapter-15']]){
   await call('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`});await delay(100);const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,`review-${name}.png`),Buffer.from(shot.data,'base64'));
 }
 // Reopen the actual PDF in Chrome; a valid local PDF must produce a PDF-viewer document.
 await call('Page.navigate',{url:pathToFileURL(pdfPath).href});await delay(1800);
 const opened=await call('Runtime.evaluate',{expression:'JSON.stringify({url:location.href,contentType:document.contentType,hasPdfEmbed:!!document.querySelector("embed[type=\\"application/pdf\\"]")})',returnByValue:true});checks.pdfOpen=JSON.parse(opened.result.value);
 const pdfShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,'review-pdf-open.png'),Buffer.from(pdfShot.data,'base64'));
 checks.pdfSamplePages=[];
 for(const chapter of [5,11,15,17]){
   const page=chapterPages.find(c=>c.title.startsWith(`${chapter}.`)).page;
   // Chrome's PDF viewer handles its own navigation; changing only the URL hash
   // through Page.navigate does not reliably move an already-open document.
   await call('Input.dispatchMouseEvent',{type:'mousePressed',x:292,y:29,button:'left',clickCount:1});
   await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:292,y:29,button:'left',clickCount:1});
   await call('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
   await call('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
   await call('Input.insertText',{text:String(page)});
   await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r'});
   await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
   await call('Input.dispatchMouseEvent',{type:'mousePressed',x:240,y:29,button:'left',clickCount:1});
   await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:240,y:29,button:'left',clickCount:1});
   await delay(900);
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,`review-pdf-chapter-${chapter}.png`),Buffer.from(shot.data,'base64'));checks.pdfSamplePages.push(page);
 }
 fs.writeFileSync(path.join(dir,'document-validation.json'),JSON.stringify(checks,null,2));
 console.log(JSON.stringify({pdf:pdfPath,pages:pageCount,bytes:bytes.length,chapters:checks.chapters,images:checks.images,overflow:checks.overflow,pdfOpen:checks.pdfOpen}));
 ws.close();
}finally{child.kill();}
