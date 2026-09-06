const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),readline=require('node:readline'),crypto=require('node:crypto');
const root=process.pkg?path.dirname(process.execPath):__dirname,port=Number(process.env.PORT||8787),url='http://127.0.0.1:'+port,logFile=path.join(root,'Go.log'),recordsDir=path.join(root,'records'),pending=new Map();
const normalModel=()=>process.env.KATAGO_MODEL||path.join(root,'engine','model.txt.gz');
const humanModel=()=>process.env.KATAGO_HUMAN_MODEL||path.join(root,'engine','b18c384nbt-humanv0.bin.gz');
const allowedVisits=new Set([1,2,4,8,16,32,64,96,256,512,800,1200]),humanProfiles=new Set(['rank_20k','rank_10k','rank_5k','rank_1d','rank_5d','rank_9d']);
const recordExtensions=new Set(['.sgf','.gib','.ngf','.json','.txt']);
try{fs.mkdirSync(recordsDir,{recursive:true});}catch{}
let proc=null,engineError='',ready=false,shuttingDown=false;
function log(message){const line=`[${new Date().toISOString()}] ${message}`;try{fs.appendFileSync(logFile,line+'\n');}catch{}console.log(line);}
function rejectPending(error){for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(error));}pending.clear();}
function stop(error){if(shuttingDown){proc=null;return;}ready=false;engineError=error;log(error);rejectPending(error);proc=null;}
function humanModelPresent(){return fs.existsSync(humanModel());}
function openBrowser(){if(process.platform!=='win32'||process.env.NO_BROWSER==='1')return;try{const browser=spawn('explorer.exe',[url],{windowsHide:true,detached:true,stdio:'ignore'});browser.on('error',()=>{try{spawn('cmd.exe',['/c','start','""',url],{windowsHide:true,detached:true,stdio:'ignore'}).unref();}catch{}});browser.unref();}catch{try{spawn('cmd.exe',['/c','start','""',url],{windowsHide:true,detached:true,stdio:'ignore'}).unref();}catch{}}}
function shutdown(reason,code=0){if(shuttingDown)return;shuttingDown=true;ready=false;if(reason)log(reason);rejectPending(reason||'程序已结束');if(proc){const child=proc;proc=null;try{child.kill();}catch{}}const force=setTimeout(()=>process.exit(code),1800);force.unref();if(server.listening)server.close(()=>process.exit(code));else process.nextTick(()=>process.exit(code));}
function startEngine(){
  if(proc||shuttingDown)return;const exe=process.env.KATAGO_PATH||path.join(root,'engine','katago.exe'),model=normalModel(),human=humanModel();
  if(!fs.existsSync(exe)||!fs.existsSync(model)){engineError='未找到 KataGo 引擎或模型，请查看 README';log(engineError);return;}
  const args=['analysis','-config',path.join(root,'engine','analysis.cfg'),'-model',model];if(fs.existsSync(human))args.push('-human-model',human);else log('未找到 Human SL 模型：最低难度将不可用');
  log(`正在启动 KataGo：${path.basename(exe)}${fs.existsSync(human)?'（含 Human SL）':''}`);
  proc=spawn(exe,args,{cwd:path.join(root,'engine'),windowsHide:true});
  proc.on('error',e=>stop('KataGo 启动失败：'+e.message));proc.on('exit',code=>{if(code!==0&&!shuttingDown)log('KataGo 退出码：'+code);stop('KataGo 已退出：'+code);});proc.stderr.on('data',d=>{const t=d.toString();process.stderr.write(t);if(/Started, ready to begin handling requests/.test(t)){ready=true;engineError='';log('KataGo 已就绪');}});
  readline.createInterface({input:proc.stdout}).on('line',line=>{try{const data=JSON.parse(line),p=pending.get(data.id);if(!p||data.isDuringSearch||(!data.rootInfo&&!data.error))return;clearTimeout(p.timer);pending.delete(data.id);if(data.error)p.reject(Error(data.error));else{ready=true;engineError='';p.resolve(data);}}catch{}});
}
function analyze(q){startEngine();if(!proc)return Promise.reject(Error(engineError||'引擎未启动'));if(pending.size>=4)return Promise.reject(Error('引擎繁忙，请稍后再试'));
  return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);if(proc)proc.stdin.write(JSON.stringify({id:'cancel-'+id,action:'terminate',terminateId:id})+'\n');reject(Error('分析超时，请降低搜索量后重试'));},120000);pending.set(id,{resolve,reject,timer});proc.stdin.write(JSON.stringify({...q,id})+'\n');});}
const Go=require('./go.js');
function validate(body){const n=body.size;if(![9,13,19].includes(n))throw Error('无效棋盘大小');let b=Go.empty(n);const initial=body.initialStones||[],moves=body.moves||[];
  if(!Array.isArray(initial)||initial.length>361||!Array.isArray(moves)||moves.length>2000)throw Error('棋谱过长');
  for(const m of initial){if(!Array.isArray(m)||m.length!==2||!['B','W'].includes(m[0]))throw Error('无效初始棋子');const [x,y]=Go.fromGtp(m[1],n);if(x===null||b[y][x])throw Error('重复初始棋子');b[y][x]=m[0];}
  let turn=body.initialPlayer||'B';if(!['B','W'].includes(turn))throw Error('无效先手');const history=[Go.key(b)];
  for(const m of moves){if(!Array.isArray(m)||m.length!==2||m[0]!==turn)throw Error('落子次序错误');const [x,y]=Go.fromGtp(m[1],n);b=Go.play(b,turn,x,y,history).board;history.push(Go.key(b));turn=Go.other(turn);}
  const visits=Number(body.visits);if(!allowedVisits.has(visits))throw Error('无效搜索量');const pvLen=Number(body.analysisPVLen??12);if(!Number.isInteger(pvLen)||pvLen<1||pvLen>50)throw Error('无效变化长度');const humanProfile=body.humanProfile;
  if(humanProfile!==undefined&&!humanProfiles.has(humanProfile))throw Error('无效的人类棋力配置');
  return {initialStones:initial,moves,initialPlayer:body.initialPlayer||'B',boardXSize:n,boardYSize:n,rules:{ko:'POSITIONAL',scoring:'AREA',tax:'NONE',suicide:false,hasButton:false,whiteHandicapBonus:'0'},komi:initial.length?0:7.5,maxVisits:visits,analysisPVLen:pvLen,...(humanProfile?{includePolicy:true,overrideSettings:{humanSLProfile:humanProfile,ignorePreRootHistory:false}}: {})};
}
function recordName(name){const base=path.basename(String(name||'')).replace(/[^\w\-.\u4e00-\u9fff ]/g,'_').trim().slice(0,80)||`record-${Date.now()}`;return recordExtensions.has(path.extname(base).toLowerCase())?base:`${base}.sgf`;}
function recordPath(name){const safe=recordName(name),full=path.resolve(recordsDir,safe);if(path.dirname(full)!==path.resolve(recordsDir))throw Error('无效棋谱文件名');return {safe,full};}
function listRecords(){try{return fs.readdirSync(recordsDir,{withFileTypes:true}).filter(e=>e.isFile()&&recordExtensions.has(path.extname(e.name).toLowerCase())).map(e=>{const s=fs.statSync(path.join(recordsDir,e.name));return {name:e.name,size:s.size,mtime:s.mtimeMs};}).sort((a,b)=>b.mtime-a.mtime);}catch{return [];}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function trusted(req){return !req.headers.origin||['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin);}
const server=http.createServer(async(req,res)=>{try{
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){json(res,403,{error:'仅限本机访问'});return;}
  const u=new URL(req.url,url);
  if(u.pathname==='/api/status'){json(res,200,{ready,running:!!proc,error:engineError,engine:'KataGo 1.16.4 · CPU',model:'kata1-b6c96-s69427456-d10051148',humanModel:humanModelPresent()});return;}
  if(u.pathname==='/api/shutdown'&&req.method==='POST'){if(!trusted(req)){json(res,403,{error:'来源不受信任'});return;}json(res,200,{ok:true});setTimeout(()=>shutdown('用户结束了弈境程序'),30);return;}
  if(u.pathname==='/api/analyze'&&req.method==='POST'){
    if(!trusted(req)){json(res,403,{error:'来源不受信任'});return;}if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'需要 JSON'});return;}
    let raw='';for await(const c of req){raw+=c;if(raw.length>100000){json(res,413,{error:'请求过大'});return;}}
    let q;try{q=validate(JSON.parse(raw));}catch(e){json(res,400,{error:e.message});return;}if(q.humanProfile&&!humanModelPresent()){json(res,503,{error:'未找到 Human SL 模型，最低难度不可用'});return;}
    const result=await analyze(q);json(res,200,result);return;
  }
  if(u.pathname==='/api/records'&&req.method==='GET'){json(res,200,{records:listRecords()});return;}
  if(u.pathname==='/api/records/file'&&req.method==='GET'){
    const name=u.searchParams.get('name');if(!name){json(res,400,{error:'缺少棋谱文件名'});return;}let target;try{target=recordPath(name);}catch(e){json(res,400,{error:e.message});return;}
    if(!fs.existsSync(target.full)){json(res,404,{error:'棋谱不存在'});return;}res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(target.full).pipe(res);return;
  }
  if(u.pathname==='/api/records'&&req.method==='POST'){
    if(!trusted(req)){json(res,403,{error:'来源不受信任'});return;}if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'需要 JSON'});return;}
    let raw='';for await(const c of req){raw+=c;if(raw.length>1500000){json(res,413,{error:'棋谱文件过大'});return;}}let body;try{body=JSON.parse(raw);}catch{json(res,400,{error:'JSON 格式错误'});return;}
    if(typeof body.content!=='string'||!body.content.trim()){json(res,400,{error:'棋谱内容为空'});return;}let target;try{target=recordPath(body.name);}catch(e){json(res,400,{error:e.message});return;}try{fs.writeFileSync(target.full,body.content,'utf8');log(`已保存棋谱：${target.safe}`);json(res,200,{ok:true,name:target.safe});}catch(e){json(res,500,{error:'棋谱保存失败：'+e.message});}return;
  }
  if(req.method!=='GET'){json(res,405,{error:'不支持此操作'});return;}
  const name=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1));
  if(!['index.html','styles.css','custom.css','app.js','i18n.js','go.js','solutions.js','README.md','SOURCES.md','assets/loading-tea-go.png'].includes(name)){json(res,404,{error:'未找到'});return;}
  const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png'};res.writeHead(200,{'Content-Type':types[path.extname(name)]||'text/plain; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(path.join(root,name)).pipe(res);
}catch(e){json(res,503,{error:e.message});}});
function probeExisting(){return new Promise(resolve=>{let done=false;const finish=value=>{if(done)return;done=true;resolve(value);};const req=http.get({host:'127.0.0.1',port,path:'/api/status',timeout:900},res=>{let raw='';res.setEncoding('utf8');res.on('data',d=>raw+=d);res.on('end',()=>{try{const s=JSON.parse(raw);finish(res.statusCode===200&&typeof s.engine==='string'?s:null);}catch{finish(null);}});});req.on('timeout',()=>{req.destroy();finish(null);});req.on('error',()=>finish(null));});}
async function launch(){const existing=await probeExisting();if(existing){log('检测到已运行的弈境服务，已复用现有 KataGo 实例');openBrowser();return;}startEngine();server.listen(port,'127.0.0.1',()=>{log('弈境网页服务已启动：'+url);openBrowser();});}
server.on('error',e=>{if(e.code==='EADDRINUSE'){probeExisting().then(existing=>{if(existing){log('端口已由弈境占用，已转交给现有实例');openBrowser();shutdown('新启动实例已退出');}else shutdown('网页服务启动失败：端口 '+port+' 已被其他程序占用',1);});return;}shutdown('网页服务启动失败：'+e.message,1);});
if(require.main===module)launch();
process.on('SIGINT',()=>shutdown('收到退出指令'));process.on('SIGTERM',()=>shutdown('收到系统结束指令'));
module.exports={validate,analyze,server,startEngine,humanModelPresent,probeExisting};
