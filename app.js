const MAP_URL='https://raw.githubusercontent.com/geolonia/japanese-prefectures/master/map-mobile.svg';
const KEY='travel-territory-state-v2';

const PREFS=[
['01','北海道','北海道'],['02','青森','東北'],['03','岩手','東北'],['04','宮城','東北'],['05','秋田','東北'],['06','山形','東北'],['07','福島','東北'],
['08','茨城','関東'],['09','栃木','関東'],['10','群馬','関東'],['11','埼玉','関東'],['12','千葉','関東'],['13','東京','関東'],['14','神奈川','関東'],
['15','新潟','中部'],['16','富山','中部'],['17','石川','中部'],['18','福井','中部'],['19','山梨','中部'],['20','長野','中部'],['21','岐阜','中部'],['22','静岡','中部'],['23','愛知','中部'],
['24','三重','近畿'],['25','滋賀','近畿'],['26','京都','近畿'],['27','大阪','近畿'],['28','兵庫','近畿'],['29','奈良','近畿'],['30','和歌山','近畿'],
['31','鳥取','中国'],['32','島根','中国'],['33','岡山','中国'],['34','広島','中国'],['35','山口','中国'],
['36','徳島','四国'],['37','香川','四国'],['38','愛媛','四国'],['39','高知','四国'],
['40','福岡','九州・沖縄'],['41','佐賀','九州・沖縄'],['42','長崎','九州・沖縄'],['43','熊本','九州・沖縄'],['44','大分','九州・沖縄'],['45','宮崎','九州・沖縄'],['46','鹿児島','九州・沖縄'],['47','沖縄','九州・沖縄']
];
const PREF=Object.fromEntries(PREFS.map(([code,name,region])=>[code,{code,name,region}]));
const REGIONS=['北海道','東北','関東','中部','近畿','中国','四国','九州・沖縄'];
const COLORS={p1:'#d95757',p2:'#3d78c8',p3:'#42945f',p4:'#d29a27'};
const COLOR_NAMES={p1:'赤',p2:'青',p3:'緑',p4:'黄'};
const DEFAULT={
  game:{period:1,periodPoints:{p1:0,p2:0,p3:0,p4:0},cumulativePoints:{p1:0,p2:0,p3:0,p4:0},residencePoints:5,otherPoints:10},
  players:[
    {id:'p1',name:'プレイヤー1',residence:'',color:'p1'},
    {id:'p2',name:'プレイヤー2',residence:'',color:'p2'},
    {id:'p3',name:'プレイヤー3',residence:'',color:'p3'},
    {id:'p4',name:'プレイヤー4',residence:'',color:'p4'}
  ],
  stays:[],settlements:[]
};
let state=load();
let route='map',selectedPref=null,photoData='',photoName='';

function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||'null');
    if(!x)return clone(DEFAULT);
    const b=clone(DEFAULT);
    return {
      game:{...b.game,...x.game,periodPoints:{...b.game.periodPoints,...x.game?.periodPoints},cumulativePoints:{...b.game.cumulativePoints,...x.game?.cumulativePoints}},
      players:Array.isArray(x.players)&&x.players.length===4?x.players:b.players,
      stays:Array.isArray(x.stays)?x.stays:[],
      settlements:Array.isArray(x.settlements)?x.settlements:[]
    };
  }catch{return clone(DEFAULT)}
}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(state));return true}
  catch(e){alert('データ容量を超えました。写真サイズを小さくして再登録してください。');return false}
}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function today(){return new Date().toISOString().slice(0,10)}
function excluded(){return new Set(state.players.map(p=>p.residence).filter(Boolean))}
function validStays(){return state.stays.filter(s=>s.valid!==false&&s.date<=today())}
function owners(){
  const result={},ex=excluded(),groups={};
  PREFS.forEach(([c])=>{if(ex.has(c))result[c]={type:'excluded'}});
  for(const s of validStays())(groups[s.prefecture]??=[]).push(s);
  for(const [code,list] of Object.entries(groups)){
    if(ex.has(code))continue;
    const latest=[...new Set(list.map(s=>s.date))].sort().at(-1);
    const same=list.filter(s=>s.date===latest);
    result[code]=same.length>1?{type:'blank',date:latest}:{type:'owned',playerId:same[0].playerId,date:latest,stayId:same[0].id};
  }
  return result;
}
function countOwned(pid){return Object.values(owners()).filter(x=>x.type==='owned'&&x.playerId===pid).length}
function regionComplete(pid,region){
  const targets=PREFS.filter(([c,,r])=>r===region&&!excluded().has(c));
  return targets.length>0&&targets.every(([c])=>owners()[c]?.type==='owned'&&owners()[c].playerId===pid)
}
function completedRegions(pid){return REGIONS.filter(r=>regionComplete(pid,r))}
function Pref(code){return PREF[code]||{}}
function pointsForStay(pid,code){
  const p=state.players.find(x=>x.id===pid);
  const r=Pref(code).region, home=Pref(p?.residence).region;
  return r&&home&&r===home?Number(state.game.residencePoints):Number(state.game.otherPoints);
}
function recalcPoints(){
  // Current MVP keeps monthly scoring semantics. A season-end snapshot can be taken at any time.
  // New registrations are reflected in ownership immediately; point display is recalculated once per month.
  const month=new Date().toISOString().slice(0,7);
  if(state.game.lastPointMonth===month)return;
  const next={...state.game.periodPoints};
  const cumulative={...state.game.cumulativePoints};
  for(const p of state.players){next[p.id]=Number(next[p.id]||0);cumulative[p.id]=Number(cumulative[p.id]||0)}
  for(const [code,v] of Object.entries(owners())){
    if(v.type!=='owned')continue;
    const base=pointsForStay(v.playerId,code);
    const mult=completedRegions(v.playerId).includes(Pref(code).region)?1.5:1;
    next[v.playerId]+=base*mult;
    cumulative[v.playerId]+=base*mult;
  }
  state.game.periodPoints=next;
  state.game.cumulativePoints=cumulative;
  state.game.lastPointMonth=month;
  save();
}
function render(){
  document.querySelector('#app').innerHTML=`<main class="app">${
    route==='map'?mapScreen():
    route==='record'?recordScreen():
    route==='history'?historyScreen():
    route==='setup'?setupScreen():
    route==='admin'?adminScreen():menuScreen()
  }</main>${nav()}`;
  if(route==='map')loadMap();
}
function nav(){
  return `<nav class="bottom-nav">${[
    ['map','▦','マップ'],['record','✦','記録'],['history','▤','履歴'],['menu','☰','メニュー']
  ].map(([r,i,t])=>`<button class="nav-btn ${route===r?'active':''}" data-route="${r}"><span>${i}</span>${t}</button>`).join('')}</nav>`;
}
function mapScreen(){
  const completed=state.players.flatMap(p=>completedRegions(p.id).map(r=>({p,r})));
  return `<header class="topbar"><div class="eyebrow">TRAVEL TERRITORY</div><h1>日本全国陣取り</h1><div class="period">第${state.game.period}期</div></header>
  <section class="map-wrap"><div id="map">地図を読み込み中…</div></section>
  <div class="legend"><span>● 所有</span><span>■ 未取得</span><span>■ ブランク</span><span>■ 対象外</span><span class="target-count">対象 ${47-excluded().size}県</span></div>
  ${completed.length?`<section class="conquest-strip"><strong>地方制覇</strong>${completed.map(({p,r})=>`<span class="conquest-chip"><i style="background:${COLORS[p.color]}"></i>${esc(p.name)}・${r} <b>1.5倍</b></span>`).join('')}</section>`:''}
  <section class="players">${state.players.map((p,i)=>`<button class="player player-${p.color}" data-player="${p.id}">
    <span class="player-mark" style="--player-color:${COLORS[p.color]}"></span>
    <span class="player-body"><span class="player-name">${esc(p.name)}</span><span class="player-label">SCORE</span><strong>${state.game.periodPoints[p.id]||0}<small> PT</small></strong><span class="player-count">${countOwned(p.id)}県</span></span>
    <span class="player-index">${COLOR_NAMES[p.color]}</span>
  </button>`).join('')}</section>`;
}
async function loadMap(){
  const el=document.querySelector('#map'); if(!el)return;
  try{
    const res=await fetch(MAP_URL);
    if(!res.ok)throw new Error();
    el.innerHTML=await res.text();
    const svg=el.querySelector('svg'); if(!svg)throw new Error();
    svg.setAttribute('role','img');svg.setAttribute('aria-label','日本全国の都道府県地図');
    styleMap(svg);
    svg.querySelectorAll('.prefecture').forEach(g=>{
      const code=g.dataset.code;
      g.addEventListener('click',()=>showPref(code));
      g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',Pref(code).name||'都道府県');
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showPref(code)}})
    });
  }catch{el.innerHTML='<div class="notice">地図データを読み込めませんでした。通信環境を確認してください。</div>'}
}
function styleMap(svg){
  const o=owners();
  svg.querySelectorAll('.prefecture').forEach(g=>{
    const v=o[g.dataset.code];let fill='#fffdf8';
    if(v?.type==='owned')fill=COLORS[state.players.find(p=>p.id===v.playerId)?.color]||fill;
    if(v?.type==='blank')fill='#d7d7d7';
    if(v?.type==='excluded')fill='#888';
    g.style.fill=fill;g.style.stroke='#8f887c';g.style.strokeWidth='1.3';g.style.strokeLinejoin='round';
  });
}
function showPref(code){
  selectedPref=code;const v=owners()[code]||{},p=state.players.find(x=>x.id===v.playerId);
  openSheet(`<button class="sheet-close" data-close>×</button><h2>${Pref(code).name}</h2>
  <div class="row"><span class="label">状態</span><b>${v.type==='excluded'?'対象外':v.type==='blank'?'ブランク':v.type==='owned'?`${esc(p?.name||'')}が所有`:'未取得'}</b></div>
  ${v.date?`<div class="row"><span class="label">登録日</span><b>${v.date}</b></div>`:''}
  ${v.type!=='excluded'?`<button class="primary" data-record-pref="${code}">＋ この県の旅行を記録</button>`:''}`);
}
function showPlayer(pid){
  const p=state.players.find(x=>x.id===pid),list=PREFS.filter(([c])=>owners()[c]?.playerId===pid),regs=completedRegions(pid);
  openSheet(`<button class="sheet-close" data-close>×</button><h2>${esc(p.name)}</h2>
  <div class="row"><span class="label">色</span><b>${COLOR_NAMES[p.color]}</b></div>
  <div class="row"><span class="label">今期ポイント</span><b>${state.game.periodPoints[pid]||0} PT</b></div>
  <div class="row"><span class="label">累積ポイント</span><b>${state.game.cumulativePoints[pid]||0} PT</b></div>
  <div class="row"><span class="label">所有県数</span><b>${list.length}県</b></div>
  ${regs.length?`<div class="conquest-detail"><strong>地方制覇</strong>${regs.map(r=>`<div>✓ ${r}　<b>1.5倍</b></div>`).join('')}</div>`:''}
  <div class="row"><span class="label">居住県</span><b>${Pref(p.residence).name||'未設定'}</b></div>
  <h3>所有都道府県</h3><div class="owner-list">${list.map(([c,n])=>`<span class="tag">${n}</span>`).join('')||'<span class="label">まだありません</span>'}</div>`);
}
function recordScreen(){
  const selected=selectedPref&&!excluded().has(selectedPref)?selectedPref:'';
  return `<h1 class="screen-title">旅行を記録</h1><p class="screen-sub">旅行した県を1件ずつ登録します。</p>
  <form class="form" id="record-form" novalidate>
    <div class="field"><label for="record-player">プレイヤー</label><select id="record-player" required>${state.players.map(p=>`<option value="${p.id}">${esc(p.name)}（${COLOR_NAMES[p.color]}）</option>`).join('')}</select></div>
    <div class="field"><label for="record-pref">都道府県</label><select id="record-pref" required><option value="">選択してください</option>${PREFS.map(([c,n])=>`<option value="${c}" ${selected===c?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="record-date">滞在日</label><input id="record-date" type="date" max="${today()}" required></div>
    <div class="field"><label for="record-type">滞在種別</label><select id="record-type" required><option value="食事">食事</option><option value="観光">観光</option><option value="宿泊">宿泊</option><option value="旅行">旅行</option><option value="その他">その他</option></select></div>
    <div class="field"><label>証拠写真 1枚</label><label class="file-picker"><span>写真ライブラリから選択</span><span id="photo-name">${esc(photoName||'未選択')}</span><input id="record-photo" type="file" accept="image/*" required></label><div id="photo-preview"></div></div>
    <div class="field"><label for="record-comment">コメント（任意）</label><textarea id="record-comment" maxlength="300" placeholder="旅のメモなど"></textarea></div>
    <button class="primary" id="confirm-record" type="button" disabled>登録の確認画面へ</button>
  </form>`;
}
function updateRecordButton(){
  const form=document.querySelector('#record-form'),btn=document.querySelector('#confirm-record');if(!form||!btn)return;
  btn.disabled=!(document.querySelector('#record-player')?.value&&document.querySelector('#record-pref')?.value&&document.querySelector('#record-date')?.value&&document.querySelector('#record-type')?.value&&document.querySelector('#record-photo')?.files?.length&&photoData);
}
function compressImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=()=>{
      const img=new Image();
      img.onerror=reject;
      img.onload=()=>{
        const max=1280,scale=Math.min(1,max/Math.max(img.width,img.height));
        const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        resolve(c.toDataURL('image/jpeg',.78));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function handlePhotoChange(input){
  const file=input.files?.[0],name=document.querySelector('#photo-name'),preview=document.querySelector('#photo-preview');
  if(!file){photoData='';photoName='';if(name)name.textContent='未選択';if(preview)preview.innerHTML='';updateRecordButton();return}
  photoName=file.name;if(name)name.textContent=file.name;
  try{
    photoData=await compressImage(file);
    if(preview)preview.innerHTML=`<img class="preview" src="${photoData}" alt="証拠写真プレビュー">`;
  }catch{photoData='';alert('写真を読み込めませんでした。別の写真を選択してください。')}
  updateRecordButton();
}
function openRecordConfirm(){
  const d={
    playerId:document.querySelector('#record-player').value,
    prefecture:document.querySelector('#record-pref').value,
    date:document.querySelector('#record-date').value,
    type:document.querySelector('#record-type').value,
    comment:document.querySelector('#record-comment').value.trim(),
    photo:photoData,photoName
  };
  if(!d.playerId||!d.prefecture||!d.date||!d.type||!d.photo)return;
  if(d.date>today())return alert('未来の日付は登録できません。');
  if(excluded().has(d.prefecture))return alert('現在の居住県は対象外です。');
  window.__pendingStay=d;
  openSheet(`<button class="sheet-close" data-close>×</button><h2>登録内容の確認</h2>
  <div class="confirm-card"><div class="row"><span class="label">プレイヤー</span><b>${esc(state.players.find(p=>p.id===d.playerId)?.name||'')}</b></div><div class="row"><span class="label">都道府県</span><b>${Pref(d.prefecture).name}</b></div><div class="row"><span class="label">滞在日</span><b>${d.date}</b></div><div class="row"><span class="label">種別</span><b>${d.type}</b></div><img class="thumb" src="${d.photo}" alt="証拠写真">${d.comment?`<p>${esc(d.comment)}</p>`:''}</div>
  <div class="actions"><button class="secondary" data-close>戻る</button><button class="primary" id="final-register">登録する</button></div>`);
}
function confirmPending(){
  const d=window.__pendingStay;if(!d)return;
  state.stays.push({id:crypto.randomUUID(),...d,createdAt:new Date().toISOString()});
  if(!save()){state.stays.pop();return}
  window.__pendingStay=null;photoData='';photoName='';selectedPref=null;closeSheet();route='history';render();
}
function historyScreen(){
  const rows=[...state.stays].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return `<h1 class="screen-title">旅行履歴</h1><p class="screen-sub">登録した滞在はここから削除できます。テスト時の再登録にも使えます。</p>
  <div class="record-list">${rows.length?rows.map(s=>`<article class="record"><div class="record-head"><div><h3>${esc(Pref(s.prefecture).name)}・${esc(state.players.find(p=>p.id===s.playerId)?.name||'')}</h3><small>${s.date} / ${esc(s.type)}</small></div><button class="danger" data-delete-stay="${s.id}">削除</button></div>${s.photo?`<img src="${s.photo}" alt="証拠写真">`:''}${s.comment?`<p>${esc(s.comment)}</p>`:''}</article>`).join(''):'<div class="empty">まだ旅行記録がありません。</div>'}</div>`;
}
function setupScreen(){
  return `<h1 class="screen-title">プレイヤー登録・変更</h1><p class="screen-sub">4人の名前・居住県・色を設定します。プレイヤー番号ではなく、色でプレイヤーを識別します。</p>
  <div class="setup-grid">${state.players.map((p,i)=>`<div class="player-setup">
    <div class="setup-color-title"><span class="color-dot" style="background:${COLORS[p.color]}"></span><strong>${COLOR_NAMES[p.color]}</strong><small>プレイヤー${i+1}</small><input data-p-name="${p.id}" value="${esc(p.name)}" aria-label="${COLOR_NAMES[p.color]}のプレイヤー名"></div>
    <select data-p-res="${p.id}" aria-label="${COLOR_NAMES[p.color]}の居住県"><option value="">居住県なし</option>${PREFS.map(([c,n])=>`<option value="${c}" ${p.residence===c?'selected':''}>${n}</option>`).join('')}</select>
    <select class="color-select" data-p-color="${p.id}" aria-label="プレイヤーカラー">${Object.entries(COLOR_NAMES).map(([c,n])=>`<option value="${c}" ${p.color===c?'selected':''}>${n}</option>`).join('')}</select>
  </div>`).join('')}</div><button class="primary" id="save-players">保存する</button>`;
}
function adminScreen(){
  return `<h1 class="screen-title">管理者ページ</h1><div class="admin-grid">
  <div class="metric"><span>現在のシーズン</span><strong>第${state.game.period}期</strong></div>
  <div class="metric"><span>登録旅行数</span><strong>${state.stays.length}</strong></div>
  <div class="metric"><span>ポイント</span><div class="settings-row"><label>居住地方 <input id="residence-points" type="number" min="0" value="${state.game.residencePoints}"> pt/月</label><label>その他地方 <input id="other-points" type="number" min="0" value="${state.game.otherPoints}"> pt/月</label></div><button class="secondary" id="save-settings">設定を保存</button></div>
  <button class="primary" id="end-season">ゲーム終了・次シーズンへ</button>
  <p class="screen-sub compact">滞在獲得・地図の所有情報はそのまま残し、今期ポイントだけをリセットします。</p>
  <section class="panel"><h2>決着履歴</h2>${state.settlements.length?state.settlements.slice().reverse().map(s=>`<div class="settlement">第${s.period}期・${s.date}<br>${state.players.map(p=>`${esc(p.name)} ${s.points[p.id]||0}pt`).join(' ／ ')}</div>`).join(''):'<div class="empty">まだありません。</div>'}</section>
  <button class="danger danger-full" id="reset-all">テストデータをすべて削除</button></div>`;
}
function menuScreen(){
  return `<h1 class="screen-title">メニュー</h1><p class="screen-sub">ゲームの管理と登録をここから行います。</p><div class="menu-list">
    <button class="menu-item" data-route="setup">プレイヤー登録・変更 <span>›</span></button>
    <button class="menu-item" data-route="admin">管理者ページ <span>›</span></button>
  </div>`;
}
function openSheet(html){closeSheet();document.body.insertAdjacentHTML('beforeend',`<div class="modal-back"><section class="sheet">${html}</section></div>`)}
function closeSheet(){document.querySelector('.modal-back')?.remove()}
document.addEventListener('click',e=>{
  const routeBtn=e.target.closest('[data-route]');
  if(routeBtn){route=routeBtn.dataset.route;render();return}
  if(e.target.closest('[data-close]')){closeSheet();return}
  const player=e.target.closest('[data-player]');
  if(player){showPlayer(player.dataset.player);return}
  const rec=e.target.closest('[data-record-pref]');
  if(rec){selectedPref=rec.dataset.recordPref;closeSheet();route='record';render();return}
  const del=e.target.closest('[data-delete-stay]');
  if(del){if(confirm('この旅行記録を削除しますか？')){state.stays=state.stays.filter(s=>s.id!==del.dataset.deleteStay);save();render()}return}
  if(e.target.id==='final-register'){confirmPending();return}
  if(e.target.id==='confirm-record'){openRecordConfirm();return}
  if(e.target.id==='save-players'){
    const used=new Set(),next=[];
    for(const p of state.players){
      const name=document.querySelector(`[data-p-name="${p.id}"]`).value.trim()||p.name;
      const residence=document.querySelector(`[data-p-res="${p.id}"]`).value;
      const color=document.querySelector(`[data-p-color="${p.id}"]`).value;
      if(used.has(color)){alert('同じ色は複数のプレイヤーで使用できません。');return}
      used.add(color);next.push({...p,name,residence,color});
    }
    state.players=next;save();render();alert('プレイヤー情報を保存しました。');return
  }
  if(e.target.id==='save-settings'){
    state.game.residencePoints=Number(document.querySelector('#residence-points').value)||0;
    state.game.otherPoints=Number(document.querySelector('#other-points').value)||0;save();render();return
  }
  if(e.target.id==='end-season'){
    if(!confirm(`第${state.game.period}期を終了します。滞在獲得は残し、今期ポイントだけをリセットして次のシーズンへ移行します。`))return;
    recalcPoints();
    state.settlements.push({period:state.game.period,date:new Date().toISOString(),points:{...state.game.periodPoints},cumulative:{...state.game.cumulativePoints}});
    state.game.period++;
    state.game.periodPoints={p1:0,p2:0,p3:0,p4:0};
    state.game.lastPointMonth='';
    save();render();return
  }
  if(e.target.id==='reset-all'){
    if(confirm('旅行記録・ポイント・決着履歴・プレイヤー設定をすべて初期化します。よろしいですか？')){localStorage.removeItem(KEY);state=clone(DEFAULT);route='map';selectedPref=null;render()}
  }
});
document.addEventListener('input',e=>{if(e.target.closest('#record-form'))updateRecordButton()});
document.addEventListener('change',e=>{
  if(e.target.id==='record-photo')handlePhotoChange(e.target);
  if(e.target.closest('#record-form'))setTimeout(updateRecordButton,0);
});
render();
