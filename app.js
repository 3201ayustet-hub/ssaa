const CFG = window.APP_CONFIG || {};
const isSupabaseMode = Boolean(CFG.supabaseUrl && CFG.supabaseAnonKey);
const supabaseClient = isSupabaseMode ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;

const PREFS = [
  ["01","北海道","北海道"],["02","青森県","東北"],["03","岩手県","東北"],["04","宮城県","東北"],["05","秋田県","東北"],["06","山形県","東北"],["07","福島県","東北"],
  ["08","茨城県","関東"],["09","栃木県","関東"],["10","群馬県","関東"],["11","埼玉県","関東"],["12","千葉県","関東"],["13","東京都","関東"],["14","神奈川県","関東"],
  ["15","新潟県","中部"],["16","富山県","中部"],["17","石川県","中部"],["18","福井県","中部"],["19","山梨県","中部"],["20","長野県","中部"],["21","岐阜県","中部"],["22","静岡県","中部"],["23","愛知県","中部"],
  ["24","三重県","近畿"],["25","滋賀県","近畿"],["26","京都府","近畿"],["27","大阪府","近畿"],["28","兵庫県","近畿"],["29","奈良県","近畿"],["30","和歌山県","近畿"],
  ["31","鳥取県","中国"],["32","島根県","中国"],["33","岡山県","中国"],["34","広島県","中国"],["35","山口県","中国"],
  ["36","徳島県","四国"],["37","香川県","四国"],["38","愛媛県","四国"],["39","高知県","四国"],
  ["40","福岡県","九州・沖縄"],["41","佐賀県","九州・沖縄"],["42","長崎県","九州・沖縄"],["43","熊本県","九州・沖縄"],["44","大分県","九州・沖縄"],["45","宮崎県","九州・沖縄"],["46","鹿児島県","九州・沖縄"],["47","沖縄県","九州・沖縄"]
].map(([code,name,region])=>({code,name,short:name.replace(/[都道府県]$/,""),region}));

const COLORS = [
  {id:"red",name:"赤",value:"#e85d63"},
  {id:"blue",name:"青",value:"#3e8fe7"},
  {id:"green",name:"緑",value:"#46a969"},
  {id:"yellow",name:"黄",value:"#e9ae36"}
];
const STORE_KEY="momo-toride-state-v1";

let state = null;
let mapSvg = null;

const $ = (s)=>document.querySelector(s);
const esc = (s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const todayISO=()=>new Date().toISOString().slice(0,10);
const colorOf=(id)=>COLORS.find(c=>c.id===id)?.value||"#999";

function blankState(){
  return {
    game:{id:"local-game",started:false,startDate:null,period:1,periodStartedAt:null,settings:{homePoints:5,otherPoints:10}},
    players:Array.from({length:4},(_,i)=>({id:`p${i+1}`,name:["Aさん","Bさん","Cさん","Dさん"][i],residence:"",color:COLORS[i].id})),
    stays:[],
    settlements:[],
    events:[]
  };
}
function loadLocal(){ try{return JSON.parse(localStorage.getItem(STORE_KEY))||blankState()}catch{return blankState()} }
function saveLocal(){ localStorage.setItem(STORE_KEY,JSON.stringify(state)) }

function init(){
  state=loadLocal();
  renderPlayerForm();
  if(!state.game.started) showSetup(); else bootGame();
  bindGlobal();
}
function showSetup(){$("#setupView").classList.remove("hidden");$("#gameView").classList.add("hidden")}
function bootGame(){$("#setupView").classList.add("hidden");$("#gameView").classList.remove("hidden");renderGame();loadMap()}
function renderPlayerForm(){
  const root=$("#playerForm"); root.innerHTML="";
  state.players.forEach((p,i)=>{
    const row=document.createElement("div");row.className="form-row";
    row.innerHTML=`<input class="setup-name" data-i="${i}" value="${esc(p.name)}" aria-label="プレイヤー${i+1}の名前">
      <select class="setup-residence" data-i="${i}" aria-label="${esc(p.name)}の居住県">
        <option value="">居住県を選択</option>${PREFS.map(x=>`<option value="${x.code}" ${p.residence===x.code?"selected":""}>${x.name}</option>`).join("")}
      </select>
      <div class="color-select"><span class="color-swatch" style="background:${colorOf(p.color)}"></span>
      <select class="setup-color" data-i="${i}">${COLORS.map(c=>`<option value="${c.id}" ${p.color===c.id?"selected":""}>${c.name}</option>`).join("")}</select></div>`;
    root.appendChild(row);
  });
  root.querySelectorAll(".setup-color").forEach(el=>el.addEventListener("change",()=>renderPlayerForm()));
}

async function setupStart(){
  const names=[...document.querySelectorAll(".setup-name")].map(x=>x.value.trim());
  const residences=[...document.querySelectorAll(".setup-residence")].map(x=>x.value);
  const colors=[...document.querySelectorAll(".setup-color")].map(x=>x.value);
  if(names.some(n=>!n)||residences.some(r=>!r)){alert("4人全員の名前と居住県を入力してください。");return}
  if(new Set(colors).size!==4){alert("4人の色は重複できません。");return}
  state.players=state.players.map((p,i)=>({...p,name:names[i],residence:residences[i],color:colors[i]}));
  state.game.started=true;state.game.startDate=todayISO();state.game.periodStartedAt=todayISO();
  state.events.unshift({at:new Date().toISOString(),text:"ゲームを開始しました"});
  if(isSupabaseMode){
    try{
      let g=await supabaseClient.from("games").select("*").eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
      let game=g.data;
      if(!game){const ins=await supabaseClient.from("games").insert({name:"日本全国陣取り",start_date:todayISO(),started:true,is_active:true,current_period:1,home_points:5,other_points:10}).select().single();if(ins.error)throw ins.error;game=ins.data}
      else {const up=await supabaseClient.from("games").update({start_date:todayISO(),started:true,current_period:1}).eq("id",game.id);if(up.error)throw up.error}
      state.game.id=game.id;
      for(let i=0;i<4;i++){
        const old=state.players[i];
        const existing=await supabaseClient.from("players").select("id").eq("game_id",game.id).eq("slot",i+1).maybeSingle();
        const row={game_id:game.id,slot:i+1,name:old.name,residence_prefecture:old.residence,color:old.color};
        const q=existing.data?.id ? await supabaseClient.from("players").update(row).eq("id",existing.data.id) : await supabaseClient.from("players").insert(row);
        if(q.error)throw q.error;
      }
      await refreshFromSupabase();return;
    }catch(e){console.error(e);alert("Supabaseへのゲーム開始処理に失敗しました。supabase.sqlの実行とRLSを確認してください。");return}
  }
  saveLocal();bootGame();
}

async function loadMap(){
  const mount=$("#mapMount");
  mount.innerHTML=`<div class="warning">日本地図を読み込んでいます…</div>`;
  try{
    const res=await fetch(CFG.mapSvgUrl,{cache:"force-cache"});
    if(!res.ok)throw new Error("map fetch failed");
    const text=await res.text();
    mount.innerHTML=text;
    mapSvg=mount.querySelector("svg");
    mapSvg.setAttribute("role","img");
    mapSvg.setAttribute("aria-label","47都道府県の日本地図");
    decorateMap();
  }catch(e){
    mount.innerHTML=`<div class="warning">地図の読み込みに失敗しました。ネットワーク接続を確認してください。</div>`;
  }
}
function decorateMap(){
  const groups=[...mapSvg.querySelectorAll(".prefecture[data-code]")];
  groups.forEach(g=>{
    const code=g.dataset.code.padStart(2,"0");
    const p=PREFS.find(x=>x.code===code); if(!p)return;
    g.setAttribute("tabindex","0");
    g.setAttribute("role","button");
    g.setAttribute("aria-label",p.name);
    g.addEventListener("click",()=>openPref(code));
    g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")openPref(code)});
    const box=g.getBBox();
    const t=document.createElementNS("http://www.w3.org/2000/svg","text");
    t.classList.add("pref-label");
    const len=p.short.length;
    t.classList.add(len>=5?"small":len===4?"normal":"large");
    t.setAttribute("x",box.x+box.width/2);
    t.setAttribute("y",box.y+box.height/2);
    t.textContent=p.short;
    g.appendChild(t);
  });
  renderMapState();
}
function currentOwnersAt(date){
  const excluded=new Set(state.players.map(p=>p.residence).filter(Boolean));
  const byPref={};
  for(const code of PREFS.map(p=>p.code)){
    if(excluded.has(code)){byPref[code]={status:"out"};continue}
    const stays=state.stays.filter(s=>s.prefecture===code && s.stayDate>=state.game.startDate && s.stayDate<=date)
      .sort((a,b)=>a.stayDate.localeCompare(b.stayDate)||a.createdAt.localeCompare(b.createdAt));
    if(!stays.length){byPref[code]={status:"unclaimed"};continue}
    const latestDate=stays[stays.length-1].stayDate;
    const same=stays.filter(s=>s.stayDate===latestDate);
    const players=new Set(same.map(s=>s.playerId));
    if(players.size>1){byPref[code]={status:"blank",date:latestDate};continue}
    byPref[code]={status:"owned",playerId:same[0].playerId,date:latestDate,stay:same[same.length-1]};
  }
  return byPref;
}
function currentOwners(){return currentOwnersAt(todayISO())}
function renderMapState(focusPlayerId=null){
  if(!mapSvg)return;
  const owners=currentOwners();
  mapSvg.querySelectorAll(".prefecture[data-code]").forEach(g=>{
    const code=g.dataset.code.padStart(2,"0"), o=owners[code];
    g.classList.remove("owned","out","blank","focus-dim","focus-hit");
    g.style.removeProperty("fill");
    if(o?.status==="out")g.classList.add("out");
    else if(o?.status==="blank")g.classList.add("blank");
    else if(o?.status==="owned"){
      g.classList.add("owned");g.style.fill=colorOf(state.players.find(p=>p.id===o.playerId)?.color);
      if(focusPlayerId===o.playerId)g.classList.add("focus-hit");
      else if(focusPlayerId)g.classList.add("focus-dim");
    }else if(focusPlayerId)g.classList.add("focus-dim");
  });
}
function ownedBy(pid){return Object.entries(currentOwners()).filter(([,o])=>o.status==="owned"&&o.playerId===pid).map(([code])=>code)}
function homeRegion(pid){const p=state.players.find(x=>x.id===pid), r=PREFS.find(x=>x.code===p?.residence)?.region;return r}
function completions(pid){
  const owners=currentOwners(), home=homeRegion(pid), regions=[...new Set(PREFS.map(p=>p.region))], out=[];
  regions.forEach(region=>{
    const targets=PREFS.filter(p=>p.region===region && owners[p.code]?.status!=="out");
    if(targets.length && targets.every(p=>owners[p.code]?.status==="owned"&&owners[p.code]?.playerId===pid))out.push(region);
  });
  return out;
}
function monthStarts(){
  const start=new Date(state.game.startDate+"T00:00:00");
  const first=new Date(start.getFullYear(),start.getMonth()+1,1);
  const now=new Date(); const out=[];
  for(let d=first;d<=now;d=new Date(d.getFullYear(),d.getMonth()+1,1))out.push(d.toISOString().slice(0,10));
  return out;
}
function monthlyPointsFor(pid){
  const p=state.players.find(x=>x.id===pid), home=homeRegion(pid), out=[];
  for(const month of monthStarts()){
    const owners=currentOwnersAt(month), completionsAt=new Set();
    for(const region of [...new Set(PREFS.map(x=>x.region))]){
      const targets=PREFS.filter(x=>x.region===region&&owners[x.code]?.status!=="out");
      if(targets.length&&targets.every(x=>owners[x.code]?.status==="owned"&&owners[x.code]?.playerId===pid))completionsAt.add(region);
    }
    for(const pref of PREFS){
      const o=owners[pref.code];
      if(o?.status!=="owned"||o.playerId!==pid)continue;
      let pts=pref.region===home?state.game.settings.homePoints:state.game.settings.otherPoints;
      if(completionsAt.has(pref.region))pts*=1.5;
      out.push({month,prefecture:pref.code,points:pts,region:pref.region});
    }
  }
  return out;
}
function pointsFor(pid){return monthlyPointsFor(pid).reduce((n,x)=>n+x.points,0)}
function periodPointsFor(pid){
  const cutoff=state.settlements.length?state.settlements[state.settlements.length-1].at:null;
  if(!cutoff)return pointsFor(pid);
  const lastMonth=cutoff.slice(0,7);
  return monthlyPointsFor(pid).filter(x=>x.month.slice(0,7)>lastMonth).reduce((n,x)=>n+x.points,0);
}
function renderGame(){
  $("#periodLabel").textContent=`第${state.game.period}期`;
  const owners=currentOwners();
  const target=PREFS.filter(p=>owners[p.code]?.status!=="out").length;
  $("#targetCount").textContent=`対象 ${target}県`;
  const root=$("#playerCards");root.innerHTML="";
  state.players.forEach(p=>{
    const tpl=$("#playerCardTemplate").content.cloneNode(true), card=tpl.querySelector(".player-card");
    card.querySelector(".player-dot").style.background=colorOf(p.color);
    card.querySelector(".player-name").textContent=p.name;
    card.querySelector(".player-points").textContent=`${periodPointsFor(p.id)}pt`;
    card.querySelector(".player-count").textContent=`${ownedBy(p.id).length}県`;
    card.addEventListener("click",()=>openPlayer(p.id));
    root.appendChild(tpl);
  });
  const ev=$("#recentEvents");ev.innerHTML=state.events.slice(0,3).map(e=>`<div class="event">${esc(e.text)}</div>`).join("");
  renderMapState();
}
function openPref(code){
  const p=PREFS.find(x=>x.code===code), o=currentOwners()[code];
  let body=`<div class="kicker">PREFECTURE</div><h2 class="sheet-title">${esc(p.name)}</h2>`;
  if(o.status==="out")body+=`<p class="sheet-sub">現在の居住県として対象外です。</p>`;
  else if(o.status==="blank")body+=`<p class="sheet-sub">同じ滞在日に複数人が登録したため、現在はブランクです。</p>`;
  else if(o.status==="owned"){const pl=state.players.find(x=>x.id===o.playerId);body+=`<div class="detail-grid"><div class="detail-stat"><b>${esc(pl.name)}</b><span>現在の所有者</span></div><div class="detail-stat"><b>${esc(o.date)}</b><span>最新取得日</span></div></div>`}
  else body+=`<p class="sheet-sub">未取得。次の旅行先にできます。</p>`;
  body+=`<button class="primary-btn" onclick="openRecord('${code}')">この県を旅行記録する</button>`;
  showSheet(body);
}
function openPlayer(pid){
  const p=state.players.find(x=>x.id===pid), codes=ownedBy(pid), comps=completions(pid);
  showSheet(`<div class="kicker">PLAYER</div><h2 class="sheet-title">${esc(p.name)}</h2><p class="sheet-sub"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${colorOf(p.color)}"></span> ${esc(PREFS.find(x=>x.code===p.residence)?.name||"")}</p>
  <div class="detail-grid"><div class="detail-stat"><b>${periodPointsFor(pid)}pt</b><span>期間ポイント</span></div><div class="detail-stat"><b>${codes.length}県</b><span>現在の所有</span></div><div class="detail-stat"><b>${settledTotal(pid)}pt</b><span>累積ポイント</span></div><div class="detail-stat"><b>${comps.length}地方</b><span>制覇中</span></div></div>
  ${comps.length?`<div class="success">制覇中：${comps.join("・")} ／ 対象地方は1.5倍</div>`:""}
  <h3>所有している県</h3><div class="pref-list">${codes.map(c=>`<button class="pref-tag" onclick="openPref('${c}')">${PREFS.find(x=>x.code===c).short}</button>`).join("")||"<span class='muted'>まだありません</span>"}</div>
  <button class="primary-btn" onclick="focusPlayer('${pid}')">地図でこの人の県を強調</button>`);
}
function settledTotal(pid){return state.settlements.reduce((n,s)=>n+(s.players.find(x=>x.playerId===pid)?.cumulative||0),0)}
function focusPlayer(pid){closeSheet();renderMapState(pid);setTimeout(()=>document.querySelector(".map-stage")?.scrollIntoView({behavior:"smooth",block:"start"}),50)}
function openRecord(code=""){
  const pOpts=state.players.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  const prefOpts=PREFS.filter(p=>currentOwners()[p.code]?.status!=="out").map(p=>`<option value="${p.code}" ${p.code===code?"selected":""}>${p.name}</option>`).join("");
  showSheet(`<div class="kicker">TRAVEL LOG</div><h2 class="sheet-title">旅行を記録</h2><p class="sheet-sub">登録後は変更・削除できません。</p>
  <form id="recordForm" class="form-stack">
    <label>プレイヤー<select name="player">${pOpts}</select></label>
    <label>都道府県<select name="prefecture">${prefOpts}</select></label>
    <label>滞在日<input type="date" name="stayDate" max="${todayISO()}" value="${todayISO()}" required></label>
    <label>滞在種別<select name="type"><option>食事</option><option>観光</option><option>宿泊</option><option>旅行</option><option>その他</option></select></label>
    <label>証拠写真1枚<div class="photo-box"><input id="photoInput" name="photo" type="file" accept="image/*" required><div id="photoPreview"></div></div></label>
    <label>コメント（任意）<textarea name="comment" maxlength="300"></textarea></label>
    <button class="primary-btn" type="submit">確認画面へ</button>
  </form>`);
  $("#photoInput").addEventListener("change",e=>{
    const f=e.target.files[0];if(!f)return;
    const u=URL.createObjectURL(f);$("#photoPreview").innerHTML=`<img class="photo-preview" src="${u}" alt="選択した写真">`;
  });
  $("#recordForm").addEventListener("submit",e=>{e.preventDefault();confirmRecord(new FormData(e.target))});
}
function confirmRecord(fd){
  const player=state.players.find(p=>p.id===fd.get("player")),pref=PREFS.find(p=>p.code===fd.get("prefecture"));
  const photo=fd.get("photo");
  const reader=new FileReader();
  reader.onload=()=>showSheet(`<div class="kicker">CONFIRM</div><h2 class="sheet-title">この内容で登録しますか？</h2>
    <div class="detail-grid"><div class="detail-stat"><b>${esc(player.name)}</b><span>プレイヤー</span></div><div class="detail-stat"><b>${esc(pref.name)}</b><span>都道府県</span></div><div class="detail-stat"><b>${esc(fd.get("stayDate"))}</b><span>滞在日</span></div><div class="detail-stat"><b>${esc(fd.get("type"))}</b><span>滞在種別</span></div></div>
    <img class="photo-preview" src="${reader.result}" alt="証拠写真">
    <div class="warning">登録後は変更・削除できません。未来の日付とゲーム開始前の日付は登録できません。</div>
    <button class="primary-btn" id="confirmSave">登録を実行</button>`);
  $("#confirmSave").onclick=()=>saveStay({...Object.fromEntries(fd.entries()),photoData:reader.result});
  reader.readAsDataURL(photo);
}
async function saveStay(data){
  if(data.stayDate>todayISO()||data.stayDate<state.game.startDate){alert("滞在日はゲーム開始日以降、今日以前である必要があります。");return}
  if(isSupabaseMode){
    try{
      const file=data.photo;
      const blob=await (await fetch(file)).blob();
      const path=`${state.game.id}/${data.player}/${crypto.randomUUID()}.jpg`;
      const up=await supabaseClient.storage.from("stay-photos").upload(path,blob,{contentType:blob.type||"image/jpeg",upsert:false});
      if(up.error)throw up.error;
      const ins=await supabaseClient.from("stays").insert({game_id:state.game.id,player_id:data.player,prefecture_code:data.prefecture,stay_date:data.stayDate,stay_type:data.type,comment:data.comment||null,photo_path:path});
      if(ins.error)throw ins.error;
      alert("旅行記録を登録しました。");closeSheet();await refreshFromSupabase();return;
    }catch(e){console.error(e);alert("Supabaseへの登録に失敗しました。SQLとStorage設定を確認してください。");return}
  }
  state.stays.push({id:crypto.randomUUID(),playerId:data.player,prefecture:data.prefecture,stayDate:data.stayDate,type:data.type,comment:data.comment||"",photoData:data.photoData,createdAt:new Date().toISOString()});
  const p=PREFS.find(x=>x.code===data.prefecture),pl=state.players.find(x=>x.id===data.player);
  state.events.unshift({at:new Date().toISOString(),text:`${pl.name}が${p.short}を取得`});
  saveLocal();closeSheet();renderGame();loadMap();
}
async function refreshFromSupabase(){
  if(!isSupabaseMode)return;
  const [g,ps,ss,se]=await Promise.all([
    supabaseClient.from("games").select("*").eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    supabaseClient.from("players").select("*").order("slot"),
    supabaseClient.from("stays").select("*").order("stay_date").order("created_at")
  ]);
  if(g.data){state.game={...state.game,...g.data,settings:{homePoints:g.data.home_points||5,otherPoints:g.data.other_points||10},id:g.data.id,started:g.data.started,startDate:g.data.start_date,period:g.data.current_period||1}}
  if(ps.data?.length)state.players=ps.data.map(p=>({id:p.id,name:p.name,residence:p.residence_prefecture,color:p.color,slot:p.slot}));
  if(ss.data)state.stays=ss.data.map(s=>({id:s.id,playerId:s.player_id,prefecture:s.prefecture_code,stayDate:s.stay_date,type:s.stay_type,comment:s.comment,createdAt:s.created_at,photoPath:s.photo_path}));
  state.events=state.stays.slice().reverse().map(s=>({at:s.createdAt,text:`${state.players.find(p=>p.id===s.playerId)?.name||"プレイヤー"}が${PREFS.find(p=>p.code===s.prefecture)?.short||""}を取得`})).slice(0,10);
  if(state.game.started)bootGame();
}
function bindGlobal(){
  $("#startGameBtn").addEventListener("click",setupStart);
  $("#recordBtn").addEventListener("click",()=>openRecord());
  $("#sheetClose").addEventListener("click",closeSheet);
  $("#sheet").addEventListener("click",e=>{if(e.target.id==="sheet")closeSheet()});
  $("#adminBtn").addEventListener("click",openAdmin);
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    const t=b.dataset.tab;if(t==="record")openRecord();else if(t==="history")openHistory();else if(t==="menu")openAdmin();
  }));
}
function showSheet(html){$("#sheetContent").innerHTML=html;$("#sheet").classList.remove("hidden")}
function closeSheet(){ $("#sheet").classList.add("hidden");$("#sheetContent").innerHTML=""}
function openHistory(){
  showSheet(`<div class="kicker">HISTORY</div><h2 class="sheet-title">取得履歴</h2><p class="sheet-sub">旅行記録は削除・変更できません。</p>${state.stays.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(s=>`<div class="admin-action"><b>${esc(state.players.find(p=>p.id===s.playerId)?.name||"")} → ${esc(PREFS.find(p=>p.code===s.prefecture)?.name||"")}</b><span>${esc(s.stayDate)} ・ ${esc(s.type)}</span></div>`).join("")||"<p class='muted'>まだありません。</p>"}`);
}
function openAdmin(){
  showSheet(`<div class="kicker">ADMIN</div><h2 class="sheet-title">管理</h2><p class="sheet-sub">このMVPでは認証を設けず、管理URLを知っている人が利用する想定です。</p>
  <div class="admin-grid">
    <button class="admin-action" onclick="openPlayerAdmin()"><b>プレイヤー管理</b><span>名前・居住県・色</span></button>
    <button class="admin-action" onclick="openSettings()"><b>ゲーム設定</b><span>居住地方5pt / その他10ptなど</span></button>
    <button class="admin-action" onclick="settleGame()"><b>この時点で決着する</b><span>地図は維持し、期間ポイントだけ次期へ</span></button>
    <button class="admin-action" onclick="openSettlements()"><b>決着履歴</b><span>過去の決着を確認</span></button>
    ${isSupabaseMode?"":"<div class='warning'>現在はローカルデモモードです。Supabase接続後に実データ保存へ切り替わります。</div>"}
  </div>`);
}
function openPlayerAdmin(){
  showSheet(`<div class="kicker">PLAYERS</div><h2 class="sheet-title">プレイヤー管理</h2><div class="form-stack">${state.players.map((p,i)=>`
  <label>${i+1}人目
    <input id="an${i}" value="${esc(p.name)}" placeholder="名前">
    <select id="ar${i}">${PREFS.map(x=>`<option value="${x.code}" ${p.residence===x.code?"selected":""}>${x.name}</option>`).join("")}</select>
    <select id="ac${i}">${COLORS.map(c=>`<option value="${c.id}" ${p.color===c.id?"selected":""}>${c.name}</option>`).join("")}</select>
  </label>`).join("")}<button class="primary-btn" id="savePlayers">保存</button></div>`);
  $("#savePlayers").onclick=async()=>{
    state.players=state.players.map((p,i)=>({...p,name:$("#an"+i).value.trim()||p.name,residence:$("#ar"+i).value,color:$("#ac"+i).value}));
    if(isSupabaseMode){
      for(let i=0;i<state.players.length;i++){
        const p=state.players[i];
        const q=await supabaseClient.from("players").update({name:p.name,residence_prefecture:p.residence,color:p.color}).eq("id",p.id);
        if(q.error){alert("プレイヤー情報の保存に失敗しました。");return}
      }
      await refreshFromSupabase();
    }else{saveLocal();closeSheet();renderGame();loadMap()}
  };
}
function openSettings(){
  showSheet(`<div class="kicker">SETTINGS</div><h2 class="sheet-title">ゲーム設定</h2><div class="form-stack">
  <label>居住地方の月次ポイント<input id="homePts" type="number" min="0" value="${state.game.settings.homePoints}"></label>
  <label>その他地方の月次ポイント<input id="otherPts" type="number" min="0" value="${state.game.settings.otherPoints}"></label>
  <button class="primary-btn" id="saveSettings">保存</button></div>`);
  $("#saveSettings").onclick=async()=>{
    state.game.settings.homePoints=Number($("#homePts").value);state.game.settings.otherPoints=Number($("#otherPts").value);
    if(isSupabaseMode){
      const q=await supabaseClient.from("games").update({home_points:state.game.settings.homePoints,other_points:state.game.settings.otherPoints}).eq("id",state.game.id);
      if(q.error){alert("設定の保存に失敗しました。");return}
      await refreshFromSupabase();
    }else{saveLocal();closeSheet();renderGame()}
  };
}
async function settleGame(){
  if(!confirm("この時点で決着します。取り消しはできません。"))return;
  const ranked=state.players.map(p=>({playerId:p.id,periodPoints:periodPointsFor(p.id),cumulative:settledTotal(p.id)+periodPointsFor(p.id)})).sort((a,b)=>b.periodPoints-a.periodPoints);
  if(isSupabaseMode){
    const ins=await supabaseClient.from("settlements").insert({game_id:state.game.id,snapshot:{players:ranked}});
    if(ins.error){alert("決着保存に失敗しました。");return}
  }
  const now=new Date().toISOString();
  state.settlements.push({at:now,players:ranked.map((x,i)=>({...x,rank:i+1}))});
  state.game.period+=1;state.game.periodStartedAt=todayISO();
  state.stays.forEach(s=>s._periodStart=state.game.period);
  state.events.unshift({at:now,text:"決着しました。次の期間を開始しました"});
  saveLocal();closeSheet();renderGame();
}
function openSettlements(){
  showSheet(`<div class="kicker">SETTLEMENTS</div><h2 class="sheet-title">決着履歴</h2>${state.settlements.slice().reverse().map(s=>`<div class="admin-action"><b>${new Date(s.at).toLocaleString("ja-JP")}</b><span>${s.players.map(x=>`${x.rank}位 ${state.players.find(p=>p.id===x.playerId)?.name||""} ${x.periodPoints}pt`).join(" ／ ")}</span></div>`).join("")||"<p class='muted'>まだ決着はありません。</p>"}`);
}
window.openRecord=openRecord;window.openPref=openPref;window.openPlayer=openPlayer;window.focusPlayer=focusPlayer;
window.openPlayerAdmin=openPlayerAdmin;window.openSettings=openSettings;window.settleGame=settleGame;window.openSettlements=openSettlements;
init();
