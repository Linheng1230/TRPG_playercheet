const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const html=fs.readFileSync(require("node:path").join(__dirname,"../index.html"),"utf8");
const begin=html.indexOf("let featureSemanticRe5R=null;");
const end=html.indexOf("\nfunction featureTipHTML(",begin);
assert(begin>0&&end>begin,"shared semantic renderer must exist");
const source=html.slice(begin,end);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ctx={spellLinkedTextHTML2024:s=>escape(s)};
vm.createContext(ctx);
ctx.ZIZI_DAMAGE_SEMANTICS_5R={types:{'光耀':'radiant','火焰':'fire','黯蝕':'necrotic'}};
vm.runInContext('const CLASS_DAMAGE_TYPES_2024=["光耀","火焰","黯蝕"]',ctx);
vm.runInContext(source,ctx);
const render=s=>ctx.featureSemanticHTML5R(s);
for(const [input,cls] of [
 ["黑暗視覺 120 呎","number"],
 ["以附贈動作疾行","action"],
 ["長休恢復，使用次數為熟練加值","resource"],
 ["敏捷豁免具有優勢","check"],
 ["對光耀傷害具有抗性","damage-semantic"],
 ["失敗後陷入中毒狀態","condition"],
 ["額外 2d6 傷害，DC 15","number"]
])assert(render(input).includes(cls==="damage-semantic"?'class="rule-em damage-semantic':"rule-em-"+cls),input+" missing "+cls);
assert(!render("<img src=x onerror=alert(1)>").includes("<img"),"user text must be escaped");
assert(!render("優勢 <script>alert(1)</script>").includes("<script"),"script tags must be escaped");
ctx.spellLinkedTextHTML2024=s=>'<span class="sref" data-sref="光亮術">光亮術</span>，'+escape(s);
assert(render("附贈動作").includes('data-sref="光亮術"'),"spell links preserved");
assert(render("附贈動作").includes("rule-em-action"),"highlight survives linked spell");
assert(html.includes('class="bg-rule-preview"')&&html.includes("featureInlineHTML(featDesc(S.bg.feat))"),"background uses shared rules");
assert(html.includes("featureSemanticHTML5R(x[3])"),"reference uses shared rules");
console.log("PASS semantic preview targeted assertions: colors, resources, measures, escaped HTML, spell link, background, reference");
