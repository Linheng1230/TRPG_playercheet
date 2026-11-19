// Isolated RC-only navigation injection; exact targeted anchors, idempotent.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function update(name, edits) {
 const file=path.join(root,name);
 let text=fs.readFileSync(file,"utf8");
 for (const [id,needle,replacement] of edits) {
   if(text.includes(id)) continue; // idempotent only when anchor added
   const n=text.split(needle).length-1;
   if(n!==1)throw Error("RC_NAV_ANCHOR_MISMATCH:"+name+":"+id+":"+n);
   text=text.replace(needle,replacement);
 }
 fs.writeFileSync(file,text,"utf8");
 console.log("UPDATED "+name);
}
update("home.html",[
 ["data-icon=\"cloud-vault\"",
  '    <a href="./index.html?view=sheet" data-icon="sheet"><svg class="wcs-nav-icon" aria-hidden="true" focusable="false"><use href="./assets/watercolor-icons.svg#wc-grimoire"></use></svg>角色卡</a>',
  '    <a href="./index.html?view=sheet" data-icon="sheet"><svg class="wcs-nav-icon" aria-hidden="true" focusable="false"><use href="./assets/watercolor-icons.svg#wc-grimoire"></use></svg>角色卡</a>\n    <a href="./cloud-vault/" data-icon="cloud-vault"><svg class="wcs-nav-icon" aria-hidden="true" focusable="false"><use href="./assets/watercolor-icons.svg#wc-grimoire"></use></svg>雲端角色庫</a>'
 ]
]);
update("index.html",[
 ['id="actCloudVault"', '<button id="actExportAll">匯出全部（備份）</button>', '<button id="actExportAll">匯出全部（備份）</button>\n      <button type="button" id="actCloudVault" onclick="location.href=\'./cloud-vault/\'">雲端角色庫（免費帳號）</button>']
]);
update("cloud-free/src/main.tsx",[
 ['aria-label="返回原角色卡"', '<p>使用帳號及密碼即可，不必提供 Email 或手機。</p>', '<p>使用帳號及密碼即可，不必提供 Email 或手機。</p>\n    <p><a href="../index.html?view=sheet" aria-label="返回原角色卡">返回原角色卡</a></p>'],
 ['aria-label="返回角色卡"','<span className="eyebrow">D&D 5R｜雲端卷宗</span><button type="button" onClick={()=>void signOut()}>登出</button>','<span className="eyebrow">D&D 5R｜雲端卷宗</span><div className="topbar-actions"><a href="../index.html?view=sheet" aria-label="返回角色卡">返回角色卡</a><button type="button" onClick={()=>void signOut()}>登出</button></div>']
]);
update("cloud-free/src/style.css",[
 ['.topbar-actions{', '@media(max-width:520px){main{padding:12px}', '.topbar-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.topbar-actions a{color:#f7e7b8;text-decoration:underline;min-height:42px;display:inline-flex;align-items:center}.topbar-actions a:focus-visible{outline:3px solid #d8a34b;outline-offset:2px}\n@media(max-width:520px){main{padding:12px}']
]);
