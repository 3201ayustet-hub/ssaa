let state=Game.resolve(Game.load());
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function render(){
 $("summary").innerHTML=state.players.map(p=>`<div class="stat"><span>${esc(p.name)}</span><strong>${p.points}pt</strong><small>${p.owned}県</small></div>`).join("");
 $("players").innerHTML=state.players.map(p=>`<div class="player"><span><i class="dot" style="background:${p.color}"></i>${esc(p.name)}</span><b>${p.owned}県 / ${p.points}pt</b></div>`).join("");
 $("map").innerHTML=PREFECTURES.map(([id,name])=>{
   const owner=state.owners[id], p=state.players.find(x=>x.id===owner);
   const cls=Game.excluded.has(id)?"excluded":owner?"owned":"";
   const style=p?` style="background:${p.color}"`:"";
   return `<button class="prefecture ${cls}"${style} data-pref="${id}">${esc(name)}</button>`;
 }).join("");
 $("player").innerHTML=state.players.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
 $("prefecture").innerHTML=PREFECTURES.filter(x=>!Game.excluded.has(x[0])).map(x=>`<option value="${x[0]}">${esc(x[1])}</option>`).join("");
}
$("stay-form").addEventListener("submit",e=>{
 e.preventDefault();
 const row={playerId:$("player").value,prefectureId:$("prefecture").value,date:$("date").value};
 if(!row.date){$("message").textContent="日付を入力してください";return}
 state=Game.addStay(state,row);render();$("message").textContent="滞在を登録しました";
});
$("reset").addEventListener("click",()=>{if(confirm("記録をリセットしますか？")){state=Game.reset();render();$("message").textContent="リセットしました"}});
$("map").addEventListener("click",e=>{const b=e.target.closest("[data-pref]");if(b){$("prefecture").value=b.dataset.pref;$("message").textContent=`${b.textContent}を選択しました`}});
$("date").value=new Date().toISOString().slice(0,10);
render();