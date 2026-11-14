// 2024/5R 傷害抗性速查：資料完整、分頁整合、篩選與可讀性靜態回歸。
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets','resistance-reference-5r.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const handlers={};
const styles=[];
const context=vm.createContext({
  document:{
    createElement(tag){assert.equal(tag,'style');return {textContent:''};},
    head:{appendChild(element){styles.push(element.textContent);}},
    addEventListener(type,handler){handlers[type]=handler;},
    getElementById(id){return id==='refBody'?{contains(){return true}}:null;}
  },
  renderRef(){context.renders=(context.renders||0)+1;}
});
new vm.Script(source,{filename:'resistance-reference-5r.js'});
vm.runInContext(source,context);
const data=vm.runInContext('RESISTANCE_DAMAGE_TYPES_5R',context);
assert.equal(data.length,13,'應列出 13 種 2024 傷害類型');
assert.equal(new Set(data.map(row=>row[0])).size,13,'傷害識別碼不得重複');
assert.deepEqual([...data.map(row=>row[0])].sort(),[
  'acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'
].sort(),'必須和 2024 13 種傷害類型對應');
assert.equal(data.filter(row=>row[3]==='物理').length,3);
assert.equal(data.filter(row=>row[3]==='元素').length,6);
assert.equal(data.filter(row=>row[3]==='特殊').length,4);
assert.equal(data.find(row=>row[0]==='slashing')[1],'揮砍','沿用官網用語');
let html=vm.runInContext('renderResistanceRef5R()',context);
assert.equal((html.match(/class="res5r-card"/g)||[]).length,13);
for(const text of ['抗性（Resistance）','免疫 Immunity','易傷 Vulnerability','無條件捨去小數','不疊加','混合傷害分開計算','計算順序','br-2024/playing-the-game','br-2024/rules-glossary']){
  assert.ok(html.includes(text),text+' 必須顯示於教學');
}
for(const [filter,count] of [['物理',3],['元素',6],['特殊',4],['全部',13]]){
  vm.runInContext('resistanceFilter5R='+JSON.stringify(filter),context);
  html=vm.runInContext('renderResistanceRef5R()',context);
  assert.equal((html.match(/class="res5r-card"/g)||[]).length,count,filter+' 篩選數量');
}
assert.ok(typeof handlers.click==='function','切換分類應有點擊事件');
handlers.click({target:{closest(selector){assert.equal(selector,'[data-res5r-filter]');return {getAttribute(){return '物理'}};}}});
assert.equal(vm.runInContext('resistanceFilter5R',context),'物理');
assert.equal(context.renders,1,'篩選後應重新渲染速查');
assert.ok(index.includes('<button data-r="resistance">抗性</button>'),'速查頁入口');
assert.ok(index.includes('if(refTab==="resistance"){b.innerHTML=renderResistanceRef5R();return;}'),'renderRef 接線');
assert.ok(index.includes('assets/resistance-reference-5r.js?v='),'腳本載入');
assert.ok(index.indexOf('assets/resistance-reference-5r.js?v=')<index.indexOf('function renderRef(){'),'腳本先於 renderRef 呼叫');
const css=styles.join('\n');
assert.ok(css.includes('max-width:700px')&&css.includes('max-width:390px'),'須提供手機斷點');
assert.ok(css.includes('grid-template-columns:1fr'),'手機卡片單欄');
assert.ok(css.includes('font-size:15.5px'),'正文不得太小');
console.log('QA PASS: 13 傷害類型、3 種分類、教學規則、頁籤接線、切換事件、響應式樣式');
