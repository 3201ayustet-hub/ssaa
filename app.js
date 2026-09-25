const MAP_URL='https://raw.githubusercontent.com/geolonia/japanese-prefectures/master/map-mobile.svg';
const CFG=window.APP_CONFIG||{};
const SB_URL=CFG.supabaseUrl;
const SB_KEY=CFG.supabasePublishableKey;
const COLORS={red:'#d95757',blue:'#3d78c8',green:'#42945f',yellow:'#d29a27'};
const COLOR_NAMES={red:'赤',blue:'青',green:'緑',yellow:'黄'};
const REGIONS=['北海道','東北','関東','中部','近畿','中国','四国','九州・沖縄'];
const PREFS=[
['01','北海道','北海道'],['02','青森県','東北'],['03','岩手県','東北'],['04','宮城県','東北'],['05','秋田県','東北'],['06','山形県','東北'],['07','福島県','東北'],
['08','茨城県','関東'],['09','栃木県','関東'],['10','群馬県','関東'],['11','埼玉県','関東'],['12','千葉県','関東'],['13','東京都','関東'],['14','神奈川県','関東'],
['15','新潟県','中部'],['16','富山県','中部'],['17','石川県','中部'],['18','福井県','中部'],['19','山梨県','中部'],['20','長野県','中部'],['21','岐阜県','中部'],['22','静岡県','中部'],['23','愛知県','中部'],
['24','三重県','近畿'],['25','滋賀県','近畿'],['26','京都府','近畿'],['27','大阪府','近畿'],['28','兵庫県','近畿'],['29','奈良県','近畿'],['30','和歌山県','近畿'],
['31','鳥取県','中国'],['32','島根県','中国'],['33','岡山県','中国'],['34','広島県','中国'],['35','山口県','中国'],
['36','徳島県','四国'],['37','香川県','四国'],['38','愛媛県','四国'],['39','高知県','四国'],
['40','福岡県','九州・沖縄'],['41','佐賀県','九州・沖縄'],['42','長崎県','九州・沖縄'],['43','熊本県','九州・沖縄'],['44','大分県','九州・沖縄'],['45','宮崎県','九州・沖縄'],['46','鹿児島県','九州・沖縄'],['47','沖縄県','九州・沖縄']
];
const PREF=Object.fromEntries(PREFS.map(([code,name,region])=>[code,{code,name,region}]));
let db={game:null,players:[],stays:[],settlements:[]};
let route='map',selectedPref='',photoData='',photoName='',pending=null;
let loading=false,saveLock=false;

const clone=x=>JSON.parse(JSON.stringify(x));
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
function headers(extra={}){return {'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Content-Type':'application/json',...extra}}
async function sb(path,opts={}){
  if(!SB_URL||!SB_KEY)throw new Error('Supabase設定がありません');
  const res=await fetch(`${SB_URL}/rest/v1/${path}`,{...opts,headers:headers(opts.headers||{})});
  if(!res.ok){let t='';try{t=await res.text()}catch{};throw new Error(`${res.status} ${t}`)}
  if(res.status===204)return null;
  return res.json();
}
async function select(table,query='select=*'){
  return sb(`${table}?${query}`,{method:'GET'});
}
async function insert(table,row){
  return sb(table,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
}
async function update(table,filter,row){
  return sb(`${table}?${filter}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
}
async function remove(table,filter){return sb(`${table}?${filter}`,{method:'DELETE'});}

function gameDefaults(){return {id:null,name:'デジ太郎電鉄',current_period:1,home_points:5,other_points:10,season_start_date:today(),is_active:true}}
function ensurePlayers(){
  const colors=['red','blue','green','yellow'];
  return colors.map((color,i)=>({
    id:null,slot:i+1,name:`プレイヤー${i+1}`,residence_prefecture:null,color
  }));
}
async function bootstrap(){
  if(loading)return;
  loading=true;setSync('同期中…');
  try{
    let games=await select('games','select=*&order=created_at.asc&limit=1');
    if(!games.length)games=await insert('games',gameDefaults());
    db.game=games[0];
    let players=await select('players',`select=*&game_id=eq.${db.game.id}&order=slot.asc`);
    if(!players.length){
      for(const p of ensurePlayers())players.push((await insert('players',{...p,game_id:db.game.id}))[0]);
    }else{
      for(const d of ensurePlayers()){
        if(!players.find(p=>p.color===d.color)){
          players.push((await insert('players',{...d,game_id:db.game.id}))[0]);
        }
      }
      players.sort((a,b)=>a.slot-b.slot);
    }
    db.players=players.slice(0,4);
    db.stays=await select('stays',`select=*&game_id=eq.${db.game.id}&order=stay_date.asc,created_at.asc`);
    db.settlements=await select('settlements',`select=*&game_id=eq.${db.game.id}&order=settled_at.desc`);
    setSync('Supabaseと同期済み','ok');render();
  }catch(e){
    console.error(e);setSync('Supabaseに接続できません。SQLを先に実行してください。','err');
    renderError(e);
  }finally{loading=false}
}
function setSync(t,c=''){const el=document.querySelector('.sync-status');if(el){el.textContent=t;el.className=`sync-status ${c}`}}
function renderError(e){
  if(document.querySelector('#app')?.innerHTML.includes('screen-title'))return;
  document.querySelector('#app').innerHTML=`<main class="app"><h1 class="screen-title">接続エラー</h1><p class="screen-sub">Supabaseのテーブル設定を確認してください。</p><div class="notice">${esc(e.message)}<br><br>同梱の <b>supabase.sql</b> をSupabaseのSQL Editorで一度実行してください。</div></main>`;
}
function excluded(){return new Set(db.players.map(p=>p.residence_prefecture).filter(Boolean))}
function validStays(){return db.stays.filter(s=>s.stay_date<=today())}
function owners(){
  const result={},ex=excluded(),groups={};
  PREFS.forEach(([c])=>{if(ex.has(c))result[c]={type:'excluded'}});
  for(const s of validStays())(groups[s.prefecture_code]??=[]).push(s);
  for(const [code,list] of Object.entries(groups)){
    if(ex.has(code))continue;
    const latest=[...new Set(list.map(s=>s.stay_date))].sort().at(-1);
    const same=list.filter(s=>s.stay_date===latest);
    result[code]=same.length>1?{type:'blank',date:latest}:{type:'owned',playerId:same[0].player_id,date:latest,stayId:same[0].id};
  }
  return result;
}
function countOwned(pid){return Object.values(owners()).filter(x=>x.type==='owned'&&x.playerId===pid).length}
function regionComplete(pid,region){
  const targets=PREFS.filter(([c,,r])=>r===region&&!excluded().has(c));
  return targets.length>0&&targets.every(([c])=>owners()[c]?.type==='owned'&&owners()[c].playerId===pid)
}
function completedRegions(pid){return REGIONS.filter(r=>regionComplete(pid,r))}
/* ポイントは滞在登録時点で、その県を取得したプレイヤーに付与する。
   その後、別プレイヤーに所有権を奪われた場合は、その県から得たポイントを0として扱う。 */
function pointsFor(pid){
  let total=0;
  const ex=excluded();

  for(const s of db.stays){
    if(s.player_id!==pid||ex.has(s.prefecture_code))continue;

    // 同じ県について、その登録が現在の所有権を持っている場合だけポイントを有効にする。
    // 同日複数登録はブランクなのでポイント対象外。
    const sameCode=db.stays.filter(x=>x.prefecture_code===s.prefecture_code);
    const latest=sameCode.map(x=>x.stay_date).sort().at(-1);
    if(s.stay_date!==latest)continue;

    const sameDate=sameCode.filter(x=>x.stay_date===latest);
    if(sameDate.length!==1||sameDate[0].player_id!==pid)continue;

    const region=PREF[s.prefecture_code]?.region;
    const p=db.players.find(x=>x.id===pid);
    const homeRegion=p?.residence_prefecture?PREF[p.residence_prefecture]?.region:null;
    const base=region===homeRegion
      ?Number(db.game.home_points)
      :Number(db.game.other_points);

    // 現在の地方制覇を判定。制覇中の地方は1.5倍。
    const owned=ownersAt(today());
    const conquered=regionCompleteAt(pid,region,owned);
    total+=base*(conquered?1.5:1);
  }

  return Math.round(total*10)/10;
}

function cumulativePoints(pid){
  const historical=db.settlements.reduce((sum,s)=>{
    const value=Number(s.snapshot?.points?.[pid]??0);
    return sum+value;
  },0);
  return Math.round((historical+pointsFor(pid))*10)/10;
}

function nav(){
  return `<nav class="bottom-nav">${[['map','▦','マップ'],['record','✦','記録'],['history','▤','履歴'],['menu','☰','メニュー']].map(([r,i,t])=>`<button class="nav-btn ${route===r?'active':''}" data-route="${r}"><span>${i}</span>${t}</button>`).join('')}</nav>`;
}
function render(){
  document.querySelector('#app').innerHTML=`<main class="app">${route==='map'?mapScreen():route==='record'?recordScreen():route==='history'?historyScreen():route==='setup'?setupScreen():route==='admin'?adminScreen():route==='rules'?rulesScreen():menuScreen()}</main>${nav()}`;
  if(route==='map')loadMap();
}
function mapScreen(){
  const completed=db.players.flatMap(p=>completedRegions(p.id).map(r=>({p,r})));
  return `<header class="topbar"><div class="eyebrow">TRAVEL TERRITORY</div><div class="game-logo">デジ太郎電鉄</div><div class="period">第${db.game.current_period}期</div><div class="sync-status ok">Supabaseと同期済み</div></header>
  <section class="map-wrap"><div id="map">地図を読み込み中…</div></section>
  <div class="legend"><span>● 所有</span><span>■ 未取得</span><span>■ ブランク</span><span>■ 対象外</span><span class="target-count">対象 ${47-excluded().size}県</span></div>
  ${completed.length?`<section class="conquest-strip"><strong>地方制覇</strong>${completed.map(({p,r})=>`<span class="conquest-chip"><i style="background:${COLORS[p.color]}"></i>${esc(p.name)}・${r} <b>1.5倍</b></span>`).join('')}</section>`:''}
  <section class="players">${db.players.map(p=>`<button class="player" data-player="${p.id}"><span class="player-mark" style="--player-color:${COLORS[p.color]}"></span><span class="player-body"><span class="player-name">${esc(p.name)}</span><span class="player-label">SCORE</span><strong>${pointsFor(p.id)}<small> PT</small></strong><span class="player-count">${countOwned(p.id)}県</span></span><span class="player-index">${COLOR_NAMES[p.color]}</span></button>`).join('')}</section>`;
}
async function loadMap(){
  const el=document.querySelector('#map');if(!el)return;
  try{
    const res=await fetch(MAP_URL);if(!res.ok)throw new Error('map');
    el.innerHTML=await res.text();
    const svg=el.querySelector('svg');if(!svg)throw new Error('svg');
    // 地図イラスト上の謎の線・装飾線を除去し、都道府県の形だけを残す。
    svg.querySelectorAll('path,line,polyline,polygon,rect,circle').forEach(n=>{
      if(!n.closest('.prefecture'))n.remove();
    });
    styleMap(svg);
    svg.querySelectorAll('.prefecture').forEach(g=>{
      const code=g.dataset.code;g.addEventListener('click',()=>showPref(code));
      g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',PREF[code]?.name||'都道府県');
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showPref(code)}})
    });
  }catch{el.innerHTML='<div class="notice">地図データを読み込めませんでした。通信環境を確認してください。</div>'}
}
function styleMap(svg){
  const o=owners();
  svg.querySelectorAll('.prefecture').forEach(g=>{
    const v=o[g.dataset.code];let fill='#fffdf8';
    if(v?.type==='owned')fill=COLORS[db.players.find(p=>p.id===v.playerId)?.color]||fill;
    if(v?.type==='blank')fill='#d7d7d7';if(v?.type==='excluded')fill='#888';
    g.style.fill=fill;g.style.stroke='#8f887c';g.style.strokeWidth='1.3';g.style.strokeLinejoin='round';
  });
}
function showPref(code){
  const v=owners()[code]||{},p=db.players.find(x=>x.id===v.playerId);
  openSheet(`<button class="sheet-close" data-close>×</button><h2>${PREF[code].name}</h2>
  <div class="row"><span class="label">状態</span><b>${v.type==='excluded'?'対象外':v.type==='blank'?'ブランク':v.type==='owned'?`${esc(p?.name||'')}が所有`:'未取得'}</b></div>
  ${v.date?`<div class="row"><span class="label">登録日</span><b>${v.date}</b></div>`:''}
  ${v.type!=='excluded'?`<button class="primary" data-record-pref="${code}">＋ この県の旅行を記録</button>`:''}`);
}
function showPlayer(pid){
  const p=db.players.find(x=>x.id===pid),list=PREFS.filter(([c])=>owners()[c]?.playerId===pid),regs=completedRegions(pid);
  openSheet(`<button class="sheet-close" data-close>×</button><h2>${esc(p.name)}</h2><div class="row"><span class="label">色</span><b>${COLOR_NAMES[p.color]}</b></div>
  <div class="row"><span class="label">今期ポイント</span><b>${pointsFor(pid)} PT</b></div><div class="row"><span class="label">累積ポイント</span><b>${cumulativePoints(pid)} PT</b></div>
  <div class="row"><span class="label">所有県数</span><b>${list.length}県</b></div>
  ${regs.length?`<div class="conquest-detail"><strong>地方制覇</strong>${regs.map(r=>`<div>✓ ${r}　<b>1.5倍</b></div>`).join('')}</div>`:''}
  <div class="row"><span class="label">居住県</span><b>${p.residence_prefecture?PREF[p.residence_prefecture]?.name:'未設定'}</b></div>
  <h3>所有都道府県</h3><div class="owner-list">${list.map(([c,n])=>`<span class="tag">${n}</span>`).join('')||'<span class="label">まだありません</span>'}</div>`);
}
function recordScreen(){
  const selected=selectedPref&&!excluded().has(selectedPref)?selectedPref:'';
  return `<h1 class="screen-title">旅行を記録</h1><p class="screen-sub">旅行した県を1件ずつ登録します。</p>
  <form class="form" id="record-form" novalidate>
  <div class="field"><label for="record-player">プレイヤー（色）</label><select id="record-player" required>${db.players.map(p=>`<option value="${p.id}">${COLOR_NAMES[p.color]}（${esc(p.name)}）</option>`).join('')}</select></div>
  <div class="field"><label for="record-pref">都道府県</label><select id="record-pref" required><option value="">選択してください</option>${PREFS.map(([c,n])=>`<option value="${c}" ${selected===c?'selected':''}>${n}</option>`).join('')}</select></div>
  <div class="field"><label for="record-date">滞在日</label><input class="date-input" id="record-date" type="date" max="${today()}" value="${today()}" required></div>
  <div class="field"><label for="record-type">滞在種別</label><select id="record-type" required><option>食事</option><option>観光</option><option>宿泊</option><option>旅行</option><option>その他</option></select></div>
  <div class="field"><label>証拠写真 1枚</label><label class="file-picker"><span>写真ライブラリから選択</span><span id="photo-name">${esc(photoName||'未選択')}</span><input id="record-photo" type="file" accept="image/*" required></label><div id="photo-preview">${photoData?`<img class="preview" src="${photoData}" alt="プレビュー">`:''}</div></div>
  <div class="field"><label for="record-comment">コメント（任意）</label><textarea id="record-comment" maxlength="300" placeholder="旅のメモなど"></textarea></div>
  <button class="primary" id="confirm-record" type="button" disabled>登録の確認画面へ</button></form>`;
}
function updateRecordButton(){
  const b=document.querySelector('#confirm-record');if(!b)return;
  b.disabled=!(document.querySelector('#record-player')?.value&&document.querySelector('#record-pref')?.value&&document.querySelector('#record-date')?.value&&document.querySelector('#record-type')?.value&&document.querySelector('#record-photo')?.files?.length&&photoData);
}
function compressImage(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();r.onerror=reject;r.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{
      const max=900,scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,img.width*scale);c.height=Math.max(1,img.height*scale);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.72));
    };img.src=r.result};r.readAsDataURL(file);
  });
}
async function handlePhotoChange(input){
  const f=input.files?.[0],name=document.querySelector('#photo-name'),preview=document.querySelector('#photo-preview');
  if(!f){photoData='';photoName='';if(name)name.textContent='未選択';if(preview)preview.innerHTML='';updateRecordButton();return}
  photoName=f.name;if(name)name.textContent=f.name;
  try{photoData=await compressImage(f);if(preview)preview.innerHTML=`<img class="preview" src="${photoData}" alt="証拠写真プレビュー">`;}
  catch{photoData='';alert('写真を読み込めませんでした。別の写真を選択してください。')}
  updateRecordButton();
}
function openRecordConfirm(){
  const d={playerId:document.querySelector('#record-player').value,prefecture:document.querySelector('#record-pref').value,date:document.querySelector('#record-date').value,type:document.querySelector('#record-type').value,comment:document.querySelector('#record-comment').value.trim(),photo:photoData,photoName};
  if(!d.playerId||!d.prefecture||!d.date||!d.type||!d.photo)return;
  if(d.date>today())return alert('未来の日付は登録できません。');if(excluded().has(d.prefecture))return alert('現在の居住県は対象外です。');
  pending=d;const p=db.players.find(x=>x.id===d.playerId);
  openSheet(`<button class="sheet-close" data-close>×</button><h2>登録内容の確認</h2><div class="confirm-card">
  <div class="row"><span class="label">プレイヤー</span><b>${COLOR_NAMES[p.color]}（${esc(p.name)}）</b></div><div class="row"><span class="label">都道府県</span><b>${PREF[d.prefecture].name}</b></div>
  <div class="row"><span class="label">滞在日</span><b>${d.date}</b></div><div class="row"><span class="label">種別</span><b>${d.type}</b></div><img class="thumb" src="${d.photo}" alt="証拠写真">${d.comment?`<p>${esc(d.comment)}</p>`:''}</div>
  <div class="actions"><button class="secondary" data-close>戻る</button><button class="primary" id="final-register">登録する</button></div>`);
}
async function confirmPending(){
  if(!pending||saveLock)return;saveLock=true;
  try{
    const d=pending;
    await insert('stays',{game_id:db.game.id,player_id:d.playerId,prefecture_code:d.prefecture,stay_date:d.date,stay_type:d.type,photo_path:d.photo,comment:d.comment||null});
    pending=null;photoData='';photoName='';selectedPref='';closeSheet();await refresh();route='history';render();alert('旅行記録を登録しました。');
  }catch(e){alert(`登録できませんでした。\n${e.message}`)}finally{saveLock=false}
}
async function refresh(){
  db.stays=await select('stays',`select=*&game_id=eq.${db.game.id}&order=stay_date.asc,created_at.asc`);
  db.players=await select('players',`select=*&game_id=eq.${db.game.id}&order=slot.asc`);
  db.settlements=await select('settlements',`select=*&game_id=eq.${db.game.id}&order=settled_at.desc`);
  db.game=(await select('games',`select=*&id=eq.${db.game.id}&limit=1`))[0];
}
function historyScreen(){
  const rows=[...db.stays].sort((a,b)=>`${b.stay_date}${b.created_at}`.localeCompare(`${a.stay_date}${a.created_at}`));
  return `<h1 class="screen-title">旅行履歴</h1><p class="screen-sub">登録した滞在はここから削除できます。テスト時の再登録にも使えます。</p><div class="record-list">${rows.length?rows.map(s=>`<article class="record"><div class="record-head"><div><h3>${PREF[s.prefecture_code]?.name||s.prefecture_code}・${esc(db.players.find(p=>p.id===s.player_id)?.name||'')}</h3><small>${s.stay_date} / ${esc(s.stay_type)}</small></div><button class="danger" data-delete-stay="${s.id}">削除</button></div>${s.photo_path?`<img src="${s.photo_path}" alt="証拠写真">`:''}${s.comment?`<p>${esc(s.comment)}</p>`:''}</article>`).join(''):'<div class="empty">まだ旅行記録がありません。</div>'}</div>`;
}
function setupScreen(){
  return `<h1 class="screen-title">プレイヤー登録・変更</h1><p class="screen-sub">4人の名前・居住県・色を設定します。登録画面ではP1/P2ではなく色で表示します。</p>
  <div class="setup-grid">${db.players.map((p,i)=>`<div class="player-setup"><div class="setup-color-title"><span class="color-dot" style="background:${COLORS[p.color]}"></span><strong>${COLOR_NAMES[p.color]}</strong><small>内部スロット ${i+1}</small><input data-p-name="${p.id}" value="${esc(p.name)}" aria-label="${COLOR_NAMES[p.color]}のプレイヤー名"></div>
  <select data-p-res="${p.id}" aria-label="${COLOR_NAMES[p.color]}の居住県"><option value="">居住県なし</option>${PREFS.map(([c,n])=>`<option value="${c}" ${p.residence_prefecture===c?'selected':''}>${n}</option>`).join('')}</select>
  <select class="color-select" data-p-color="${p.id}" aria-label="プレイヤーカラー">${Object.entries(COLOR_NAMES).map(([c,n])=>`<option value="${c}" ${p.color===c?'selected':''}>${n}</option>`).join('')}</select></div>`).join('')}</div>
  <button class="primary" id="save-players">保存する</button>`;
}
function adminScreen(){
  return `<h1 class="screen-title">管理者ページ</h1><div class="admin-grid">
  <div class="metric"><span>現在のシーズン</span><strong>第${db.game.current_period}期</strong></div>
  <div class="metric"><span>登録旅行数</span><strong>${db.stays.length}</strong></div>
  <div class="metric"><span>ポイント</span><div class="settings-row"><label>居住地方 <input id="home-points" type="number" min="0" value="${db.game.home_points}"> pt</label><label>その他地方 <input id="other-points" type="number" min="0" value="${db.game.other_points}"> pt</label></div><button class="secondary" id="save-settings">設定を保存</button></div>
  <button class="primary" id="end-season">ゲーム終了・次シーズンへ</button><p class="screen-sub compact">滞在獲得・地図の所有情報は残し、ポイントだけをリセットして次のシーズンへ進みます。</p>
  <section class="panel"><h2>決着履歴</h2>${db.settlements.length?db.settlements.map(s=>`<div class="settlement">${new Date(s.settled_at).toLocaleString('ja-JP')}<br>${Object.entries(s.snapshot?.points||{}).map(([id,v])=>`${esc(db.players.find(p=>p.id===id)?.name||id)} ${v}pt`).join(' ／ ')}</div>`).join(''):'<div class="empty">まだありません。</div>'}</section>
  <button class="danger danger-full" id="reset-all">テストデータをすべて削除</button></div>`;
}
function menuScreen(){return `<h1 class="screen-title">メニュー</h1><p class="screen-sub">ゲームの管理と登録をここから行います。</p><div class="menu-list"><button class="menu-item" data-route="setup">プレイヤー登録・変更 <span>›</span></button><button class="menu-item" data-route="rules">現在のルール <span>›</span></button><button class="menu-item" data-route="admin">管理者ページ <span>›</span></button></div>`}
function rulesScreen(){
  const rows=[['シーズン',`第${db.game.current_period}期`],['滞在登録','都道府県・滞在日・滞在種別・証拠写真1枚が必要'],['県の所有','同じ県は最新の滞在日の登録を採用。同日複数登録はブランク'],['居住県','プレイヤーの居住県は対象外'],['居住地方のポイント',`${db.game.home_points} pt`],['その他地方のポイント',`${db.game.other_points} pt`],['地方制覇','地方内の対象県をすべて所有すると、その地方のポイントは1.5倍'],['ゲーム終了','滞在獲得・地図の所有情報は残し、ポイントだけリセットして次の期へ'],['テストデータ','管理者ページから全登録データを初期化可能']];
  return `<h1 class="screen-title">現在のルール</h1><p class="screen-sub">この画面は現在Supabaseに設定されているルールを表示します。</p><section class="rules-card">${rows.map(([k,v])=>`<div class="rule-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</section>`;
}
function openSheet(html){closeSheet();document.body.insertAdjacentHTML('beforeend',`<div class="modal-back"><section class="sheet">${html}</section></div>`)}
function closeSheet(){document.querySelector('.modal-back')?.remove()}
async function savePlayers(){
  const used=new Set();
  try{
    for(const p of db.players){
      const name=document.querySelector(`[data-p-name="${p.id}"]`).value.trim()||p.name;
      const residence=document.querySelector(`[data-p-res="${p.id}"]`).value||null;
      const color=document.querySelector(`[data-p-color="${p.id}"]`).value;
      if(used.has(color))throw new Error('同じ色は複数のプレイヤーで使用できません。');
      used.add(color);await update('players',`id=eq.${p.id}`,{name,residence_prefecture:residence,color});
    }
    await refresh();render();alert('プレイヤー情報を保存しました。');
  }catch(e){alert(`保存できませんでした。\n${e.message}`)}
}
async function endSeason(){
  if(!confirm(`第${db.game.current_period}期を終了します。滞在獲得は残し、ポイントだけをリセットして次のシーズンへ移行します。`))return;
  const points=Object.fromEntries(db.players.map(p=>[p.id,pointsFor(p.id)]));
  try{
    await insert('settlements',{game_id:db.game.id,snapshot:{period:db.game.current_period,points}});
    await update('games',`id=eq.${db.game.id}`,{current_period:db.game.current_period+1,season_start_date:today()});
    await refresh();render();alert('ゲームを終了し、次のシーズンへ移行しました。');
  }catch(e){alert(`シーズン終了に失敗しました。\n${e.message}`)}
}
async function resetAll(){
  if(!confirm('旅行記録・決着履歴・プレイヤー設定をすべて初期化します。4人全員の端末からも消えます。よろしいですか？'))return;
  try{
    await remove('stays',`game_id=eq.${db.game.id}`);
    await remove('settlements',`game_id=eq.${db.game.id}`);
    await update('players',`game_id=eq.${db.game.id}`,{name:null});
  }catch(e){}
  try{
    for(const [i,p] of db.players.entries()){
      await update('players',`id=eq.${p.id}`,{name:`プレイヤー${i+1}`,residence_prefecture:null,color:['red','blue','green','yellow'][i]});
    }
    await update('games',`id=eq.${db.game.id}`,{current_period:1,season_start_date:today(),home_points:5,other_points:10});
    await refresh();route='map';render();alert('テストデータを初期化しました。');
  }catch(e){alert(`初期化に失敗しました。\n${e.message}`)}
}
document.addEventListener('click',async e=>{
  const r=e.target.closest('[data-route]');if(r){route=r.dataset.route;selectedPref='';render();return}
  if(e.target.closest('[data-close]')){closeSheet();return}
  const pl=e.target.closest('[data-player]');if(pl){showPlayer(pl.dataset.player);return}
  const rp=e.target.closest('[data-record-pref]');if(rp){selectedPref=rp.dataset.recordPref;closeSheet();route='record';render();return}
  const del=e.target.closest('[data-delete-stay]');if(del){
    if(!confirm('この旅行記録を削除しますか？'))return;
    try{await remove('stays',`id=eq.${del.dataset.deleteStay}`);await refresh();render()}catch(err){alert(`削除できませんでした。\n${err.message}`)}
    return
  }
  if(e.target.id==='confirm-record'){openRecordConfirm();return}
  if(e.target.id==='final-register'){await confirmPending();return}
  if(e.target.id==='save-players'){await savePlayers();return}
  if(e.target.id==='save-settings'){
    try{
      await update('games',`id=eq.${db.game.id}`,{home_points:Number(document.querySelector('#home-points').value)||0,other_points:Number(document.querySelector('#other-points').value)||0});
      await refresh();render();alert('ポイント設定を保存しました。');
    }catch(err){alert(`保存できませんでした。\n${err.message}`)}
    return
  }
  if(e.target.id==='end-season'){await endSeason();return}
  if(e.target.id==='reset-all'){await resetAll();return}
});
document.addEventListener('input',e=>{if(e.target.closest('#record-form'))updateRecordButton()});
document.addEventListener('change',e=>{if(e.target.id==='record-photo')handlePhotoChange(e.target);if(e.target.closest('#record-form'))setTimeout(updateRecordButton,0)});
setInterval(async()=>{if(document.hidden||loading||saveLock)return;try{await refresh();if(route==='map'||route==='history')render()}catch{}},5000);
document.addEventListener('visibilitychange',async()=>{if(!document.hidden&&!loading&&!saveLock){try{await refresh();render()}catch{}}});
bootstrap();
