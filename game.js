window.Game=(function(){
const KEY="momotetsu-v1.2-state";
const excluded=new Set(["tokyo","osaka"]);
function initial(){return {stays:[],owners:{},players:PLAYERS.map(p=>({...p,points:0,owned:0}))};}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||initial()}catch{return initial()}}
function save(s){localStorage.setItem(KEY,JSON.stringify(s));return s}
function resolve(s){
 const owners={};
 PREFECTURES.forEach(([id])=>{
   if(excluded.has(id)) return;
   const rows=s.stays.filter(x=>x.prefectureId===id).sort((a,b)=>a.date.localeCompare(b.date));
   if(rows.length) owners[id]=rows[rows.length-1].playerId;
 });
 s.owners=owners;
 s.players.forEach(p=>{p.owned=Object.values(owners).filter(x=>x===p.id).length;p.points=p.owned*10});
 return s;
}
function reset(){return save(initial())}
function addStay(s,row){s.stays.push(row);return save(resolve(s))}
function prefecture(id){return PREFECTURES.find(x=>x[0]===id)}
return {load,save,reset,addStay,resolve,prefecture,excluded};
})();