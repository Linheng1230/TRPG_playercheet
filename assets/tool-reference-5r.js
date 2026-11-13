/* D&D 5R (PHB 2024) tool quick reference. Read-only; source: PHB 2024 Tools and Crafting Equipment. */
(function(){
"use strict";
const GROUPS={artisan:"工匠工具",other:"其他冒險工具",game:"遊戲組",music:"樂器"};
const ABILITY={str:"力量",dex:"敏捷",int:"智力",wis:"感知",cha:"魅力"};
// The kit-components field offers real-world examples; PHB 2024 does not prescribe a component-by-component inventory.
const D=[
["artisan","鍊金工具","Alchemist's Supplies","int","50 GP","小瓶、燒杯、研磨器與加熱器具",[["辨識物質",15],["生火",15]],"強酸、鍊金火、材料包、油、紙、香水","想知道瓶中液體是什麼，或利用器材點火"],
["artisan","釀酒工具","Brewer's Supplies","int","20 GP","發酵容器、量杯、濾網與釀造器具",[["檢查飲品是否遭下毒",15],["辨識酒類",10]],"抗毒劑","宴會上檢查可疑酒杯"],
["artisan","書法工具","Calligrapher's Supplies","dex","10 GP","筆尖、墨水、紙張與書寫工具",[["以難以偽造的花飾字體書寫文字",15]],"墨水、法術卷軸","為重要信件加上難以仿寫的筆跡"],
["artisan","木匠工具","Carpenter's Tools","str","8 GP","鋸子、鐵鎚、鑿刀、刨刀與量尺",[["封住或撬開門、容器",20]],"短棍、巨棍、長棍、木桶、箱子、梯子、長桿、便攜式破門槌、火把","撬開木箱，或把門板加固"],
["artisan","製圖工具","Cartographer's Tools","wis","15 GP","繪圖紙、墨筆、尺與測量器具",[["繪製小區域地圖",15]],"地圖","探索後把地城的走道畫成地圖"],
["artisan","鞋匠工具","Cobbler's Tools","dex","5 GP","針線、鞋楦、皮刀與修鞋工具",[["調整鞋子，使穿著者下一次敏捷（特技）檢定具有優勢",10]],"攀爬工具組","攀爬前先調整同伴的鞋底；僅適用下一次指定檢定"],
["artisan","廚師工具","Cook's Utensils","wis","1 GP","鍋具、刀具、調味容器與烹調器具",[["改善食物風味",10],["檢查食物腐敗或遭下毒",15]],"口糧","野營時檢查食物是否變質"],
["artisan","玻璃匠工具","Glassblower's Tools","int","30 GP","吹管、夾具、耐熱工具與玻璃加工器具",[["判斷玻璃器皿過去 24 小時裝過什麼",15]],"玻璃瓶、放大鏡、望遠鏡、小玻璃瓶","檢查被洗乾淨的藥瓶之前裝了什麼"],
["artisan","珠寶匠工具","Jeweler's Tools","int","25 GP","小鑷子、研磨工具、放大鏡與秤重器具",[["判斷寶石價值",15]],"奧術法器、聖徽","判斷寶石是否值得帶走"],
["artisan","皮匠工具","Leatherworker's Tools","dex","5 GP","皮刀、錐子、針線與皮革加工器具",[["為皮革製品加上裝飾",10]],"投石索、長鞭、獸皮甲、皮甲、鑲釘皮甲、背包、弩矢盒、地圖或卷軸筒、羊皮紙、腰包、箭袋、水袋","替皮革腰包刻上冒險隊徽記"],
["artisan","石匠工具","Mason's Tools","str","10 GP","鑿刀、鐵鎚、石工尺與測量工具",[["在石頭上鑿出符號或孔洞",10]],"滑輪組","在石牆上鑿出觀察孔"],
["artisan","畫家工具","Painter's Supplies","wis","10 GP","顏料、畫筆、畫板與畫布",[["畫出見過且可辨認的形象",10]],"德魯伊法器、聖徽","畫出目擊者曾看過的嫌犯外貌"],
["artisan","陶匠工具","Potter's Tools","int","10 GP","陶土工具、轉盤與燒製器具",[["判斷陶製容器過去 24 小時裝過什麼",15]],"陶壺、油燈","檢查可疑陶罐曾裝過的東西"],
["artisan","鐵匠工具","Smith's Tools","str","20 GP","鐵鎚、鉗子、砧板與金屬加工器具",[["撬開門或容器",20]],"多數近戰武器（不含短棍、巨棍、長棍、長鞭）、多數中甲（不含獸皮甲）、重甲、鐵蒺藜、鐵鍊、撬棍、鐵釘、攀鉤、子彈等","利用金屬槓桿撬開被封住的鐵門"],
["artisan","修補匠工具","Tinker's Tools","dex","50 GP","鉗子、小齒輪、金屬片、螺絲與細部加工工具",[["將廢料組成一件微型物品，1 分鐘後解體",20]],"火槍、手槍、鈴鐺、牛眼提燈、水壺、遮光提燈、狩獵陷阱、鎖、鐐銬、鏡子、鏟子、哨子、火絨盒","臨時拼出可維持一分鐘的簡易小裝置；具體功能由 DM 判定"],
["artisan","織工工具","Weaver's Tools","dex","1 GP","織針、線軸、剪刀與縫紉工具",[["修補衣物破洞",10],["縫製一件微型圖案",10]],"布甲、籃子、睡袋、毛毯、華服、網、長袍、繩索、麻袋、細繩、帳篷、旅行服","替破損斗篷縫補裂口"],
["artisan","木雕工具","Woodcarver's Tools","dex","1 GP","小刀、雕刻刀、木銼與打磨工具",[["在木頭上雕刻圖案",10]],"短棍、巨棍、長棍、多數遠程武器（不含手槍、火槍、投石索）、奧術法器、箭、弩矢、德魯伊法器、墨水筆、針","在木製門框刻上識別記號"],
["other","易容工具組","Disguise Kit","cha","25 GP","化妝品、假髮、假鬍鬚與簡易造型用品",[["上妝",10]],"戲服","扮成城內守衛；能否騙過對方仍由 DM 判定"],
["other","偽造工具組","Forgery Kit","dex","15 GP","墨筆、特殊墨水、印章模具與仿寫用品",[["模仿他人不超過 10 個字的筆跡",15],["複製蠟封",20]],"","模仿短簽名或仿造信封上的封蠟"],
["other","草藥工具組","Herbalism Kit","int","5 GP","採集刀、小袋、乾燥藥草與研磨器具",[["辨識植物",10]],"抗毒劑、蠟燭、治療工具組、治療藥水","找出森林中的有用植物；製作治療藥水另依專用規則"],
["other","領航工具","Navigator's Tools","wis","25 GP","航海圖、羅盤、測角器與定位器具",[["規劃航線",10],["觀星判定自身位置",15]],"","夜間觀星確認船隊的方向"],
["other","製毒工具組","Poisoner's Kit","int","50 GP","小瓶、滴管、研磨器與安全處理器具",[["辨識物品是否帶毒",10]],"基礎毒藥","檢查門把是否被塗毒；實際接觸風險由 DM 判定"],
["other","盜賊工具","Thieves' Tools","dex","25 GP","開鎖針、細鉗、小銼刀與探針",[["撬鎖",15],["解除陷阱",15]],"","在陷阱寶箱上找出機構並嘗試解除；不是自動成功"],
["game","骰子組","Dice Set","wis","1 SP","一組遊戲骰子",[["看出有人作弊",10],["贏得遊戲",20]],"","酒館裡觀察骰子賭局有無作弊"],
["game","龍棋組","Dragonchess Set","wis","1 GP","棋盤與龍棋棋子",[["看出有人作弊",10],["贏得遊戲",20]],"","靠龍棋對局結識當地棋手"],
["game","撲克牌組","Playing Card Set","wis","5 SP","一副紙牌",[["看出有人作弊",10],["贏得遊戲",20]],"","在牌局中辨識可疑手法"],
["game","三龍牌組","Three-Dragon Ante Set","wis","1 GP","三龍牌遊戲卡牌",[["看出有人作弊",10],["贏得遊戲",20]],"","在三龍牌對局爭取情報"],
["music","風笛","Bagpipes","cha","30 GP","風囊、吹管與音管",[["演奏熟悉的曲子",10],["即興演奏",15]],"","在慶典上演奏熟悉曲目"],
["music","鼓","Drum","cha","6 GP","鼓身、鼓皮與鼓槌",[["演奏熟悉的曲子",10],["即興演奏",15]],"","為隊友的遊行打出節奏"],
["music","揚琴","Dulcimer","cha","25 GP","弦樂器與敲弦槌或撥弦工具",[["演奏熟悉的曲子",10],["即興演奏",15]],"","酒館中即興伴奏"],
["music","長笛","Flute","cha","2 GP","一支長笛",[["演奏熟悉的曲子",10],["即興演奏",15]],"","用熟悉旋律讓同伴辨識你的位置"],
["music","號角","Horn","cha","3 GP","一支號角",[["演奏熟悉的曲子",10],["即興演奏",15]],"","吹奏一段號角旋律"],
["music","魯特琴","Lute","cha","35 GP","琴身與琴弦",[["演奏熟悉的曲子",10],["即興演奏",15]],"","吟遊詩人在酒館表演"],
["music","里拉琴","Lyre","cha","30 GP","小型弦框樂器",[["演奏熟悉的曲子",10],["即興演奏",15]],"","為故事吟唱伴奏"],
["music","排簫","Pan Flute","cha","12 GP","長度不同的多支管",[["演奏熟悉的曲子",10],["即興演奏",15]],"","在森林中演奏熟悉樂曲"],
["music","蕭姆管","Shawm","cha","2 GP","雙簧吹管樂器",[["演奏熟悉的曲子",10],["即興演奏",15]],"","在街頭即興吹奏"],
["music","維奧爾琴","Viol","cha","30 GP","擦弦樂器與琴弓",[["演奏熟悉的曲子",10],["即興演奏",15]],"","在宴會上拉奏一首曲子"]
];
const state={q:"",group:"all"};
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toolEntry(r){return {category:r[0],zh:r[1],en:r[2],ability:r[3],price:r[4],kit:r[5],uses:r[6],craft:r[7],scenario:r[8]};}
const TOOLS=D.map(toolEntry);
const categoryChoices=[["all","全部"],["artisan","工匠工具"],["other","其他工具"],["game","遊戲組"],["music","樂器"]];
function renderToolRef(){
 const q=state.q.trim().toLocaleLowerCase();
 const filtered=TOOLS.filter(t=>(state.group==="all"||t.category===state.group)&&(!q||[t.zh,t.en,t.kit,t.craft,t.scenario,...t.uses.map(x=>x[0])].join(" ").toLocaleLowerCase().includes(q)));
 const chips=categoryChoices.map(([k,label])=>'<button type="button" class="pr-segment'+(state.group===k?' active':'')+'" data-tool-group="'+k+'" aria-pressed="'+(state.group===k)+'">'+label+'</button>').join("");
 const cards=filtered.map(t=>'<details class="pr-card tool-ref-card"><summary><span class="pr-name">'+esc(t.zh)+' <span class="tool-ref-en">'+esc(t.en)+'</span></span><span class="pr-meta">'+GROUPS[t.category]+' · '+ABILITY[t.ability]+' · '+esc(t.price)+'</span></summary><div class="pr-body"><p class="tool-ref-part"><strong>實物內容（常見示例，非官方逐件清單）：</strong>'+esc(t.kit)+'</p><p class="tool-ref-part"><strong>使用（Utilize 動作）：</strong></p><ul class="tool-ref-uses">'+t.uses.map(u=>'<li>'+esc(u[0])+'（DC '+u[1]+'）</li>').join("")+'</ul>'+(t.craft?'<p class="tool-ref-part"><strong>可製作（需熟練、材料與時間）：</strong>'+esc(t.craft)+'</p>':'')+'<p class="tool-ref-part"><strong>冒險應用：</strong>'+esc(t.scenario)+'<span class="tool-ref-discretion">（延伸用途與難度由 DM 判定）</span></p></div></details>').join("");
 return '<div class="pr-panel tool-ref-panel"><div class="tool-ref-guide"><h3>工具不是只有一個名稱</h3><p><b>持有工具</b>是裝備；<b>工具熟練</b>是角色訓練，兩者不同。工具通常代表一整套器具，毋須拆成零件購買。PHB 2024 沒有逐件規定每套工具必須有什麼；下方的內容是協助想像用途的實物示例。</p><p><b>怎麼使用：</b>先向 DM 說明想做什麼、使用哪套工具。需要檢定時，擲 d20＋該工具列出的屬性調整值；<b>熟練該工具</b>才加一次熟練加值。同次檢定若相關技能與工具<b>兩者都有熟練</b>，獲得<b>優勢</b>（擲 2 顆 d20 取高），但熟練加值不重複加。規則列出的操作使用「使用（Utilize）動作」，每次選一項；是否需檢定及其他創意用途由 DM 判定。</p><p><b>製作：</b>須具備對應工具與熟練。一般非魔法裝備需要價值為售價一半（向下取整）的材料，每 10 GP 售價需 1 個工作日（不足 1 日進位，每日 8 小時）；治療藥水、法術卷軸另有專用規則。</p><p><b>舉例：</b>拿盜賊工具撬鎖（敏捷，DC 15），或拿木匠工具封住／撬開木門（力量，DC 20）。工具不是法術，攜帶不代表自動成功。</p><p class="tool-ref-source">資料範圍：2024《玩家手冊》工具規則。遊戲組與每種樂器均屬獨立熟練項目。</p></div><div class="pr-tools"><label class="tool-ref-search-label" for="toolRefQ">搜尋工具</label><input id="toolRefQ" type="search" autocomplete="off" placeholder="搜尋名稱、用途、可製作物…" value="'+esc(state.q)+'"><div class="pr-filter" role="group" aria-label="工具類別"><span class="pr-filter-label">分類</span><div class="pr-segments">'+chips+'</div></div></div><div class="pr-note" role="status">顯示 '+filtered.length+' / '+TOOLS.length+' 種工具。</div><div class="pr-list">'+(cards||'<p>沒有符合條件的工具。</p>')+'</div></div>';
}
document.addEventListener("click",function(e){
 const button=e.target.closest&&e.target.closest("[data-tool-group]"),body=document.getElementById("refBody");
 if(!button||!body||!body.contains(button))return;
 state.group=button.dataset.toolGroup; if(typeof renderRef==="function")renderRef();
});
document.addEventListener("input",function(e){
 if(e.target.id!=="toolRefQ")return;
 state.q=e.target.value;
 if(typeof liveSearchIsComposing==="function"&&liveSearchIsComposing("toolRefQ",e))return;
 if(typeof scheduleSearchRender==="function")scheduleSearchRender("toolRefQ",renderRef);
 else if(typeof renderRef==="function")renderRef();
});
const style=document.createElement("style");
style.textContent='.tool-ref-guide{border:1px solid #b7a27b;background:#f2e9d5;border-radius:8px;padding:14px 16px;font:15.5px/1.8 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",sans-serif;color:#382c24;max-width:80ch}.tool-ref-guide h3{margin:0 0 7px;font-size:19px}.tool-ref-guide p{margin:8px 0}.tool-ref-source,.tool-ref-discretion{font-size:13px;color:#695442}.tool-ref-search-label{font-weight:700;font-size:14px}.tool-ref-panel .pr-tools{gap:10px}.tool-ref-panel .pr-card summary{align-items:baseline}.tool-ref-en{font-size:13px;font-weight:500;color:#725947}.tool-ref-panel .pr-body{font-size:15.5px;line-height:1.8;color:#382c24}.tool-ref-part{margin:5px 0 10px}.tool-ref-uses{margin:3px 0 12px;padding-left:23px}.tool-ref-uses li{margin:3px 0}@media(max-width:520px){.tool-ref-guide{font-size:15px;padding:12px}.tool-ref-panel .pr-body{font-size:15px}.tool-ref-panel .pr-meta{text-align:left}.tool-ref-en{display:block;margin-top:2px}}';
document.head.appendChild(style);
window.ZIZI_5R_TOOL_REFERENCE=Object.freeze({tools:TOOLS,groups:GROUPS,render:renderToolRef});
window.renderToolRef=renderToolRef;
})();
