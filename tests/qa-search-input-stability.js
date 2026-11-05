const fs=require("fs"),vm=require("vm"),assert=require("assert");
const index=fs.readFileSync("index.html","utf8"),player=fs.readFileSync("assets/player-reference-5r.js","utf8");
const required=[
 ["abilityRefQ",index],["gfeatRefQ",index],["itemRefQ",player],["creatureRefQ",player],["shopQ",index],["srefQ",index]
];
for(const [id,src] of required)assert(src.includes(id),id+" search input/handler missing");
const covered=new Set(required.map(x=>x[0]));
const searchInputs=[index,player,fs.readFileSync("assets/ability-lookup.js","utf8")].flatMap(src=>[...src.matchAll(/<input[^>]+id="([^"]+)"[^>]+placeholder="搜尋[^"]*"/g)].map(m=>m[1]));
assert.deepEqual([...new Set(searchInputs)].sort(),[...covered].sort(),"new search input exists without stability coverage");
for(const id of ["abilityRefQ","gfeatRefQ","shopQ"]){
 assert(index.includes('liveSearchIsComposing("'+id+'"'),id+" missing composition guard");
 assert(index.includes('rerenderSearchInput("'+id+'"')||index.includes('scheduleSearchRender("'+id+'"'),id+" missing focus-preserving render");
}
for(const id of ["itemRefQ","creatureRefQ"]){
 assert(player.includes('id="'+id+'"'),id+" input missing");
 assert(player.includes("liveSearchIsComposing"),id+" missing composition guard");
 assert(player.includes("scheduleSearchRender"),id+" missing debounced focus-preserving render");
}
assert(index.includes('document.addEventListener("compositionstart"'),"compositionstart guard missing");
assert(index.includes('document.addEventListener("compositionend"'),"compositionend guard missing");
assert(index.includes('srefQ.addEventListener("input"'),"spell search input handler missing");
assert(index.includes("renderSpellRefList()"),"spell search result updater missing");
const fnSrc=(index.match(/function rerenderSearchInput\(id,renderFn\)\{[^\n]+\}/)||[])[0];
assert(fnSrc,"rerenderSearchInput helper missing");
let current={selectionStart:2,selectionEnd:2,value:"狼蛛",focus(){this.focused=true},setSelectionRange(a,b){this.range=[a,b]}};
const ctx={$:()=>current,Number,Math};vm.createContext(ctx);vm.runInContext(fnSrc+";this.rerenderSearchInput=rerenderSearchInput",ctx);
const next={value:"狼蛛",focus(){this.focused=true},setSelectionRange(a,b){this.range=[a,b]}};
ctx.rerenderSearchInput("q",()=>{current=next});
assert.equal(next.focused,true,"rerender helper did not restore focus");
assert.deepEqual(next.range,[2,2],"rerender helper did not restore caret");
console.log(JSON.stringify({pass:true,searches:required.map(x=>x[0])},null,2));