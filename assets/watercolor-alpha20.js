/* Display-only 2024/2014 class illustration binding. Do not create a second class State. */
(function(){
  "use strict";
  const grid=document.getElementById("classGrid");
  if(!grid)return;
  const icons=Object.freeze({
    "野蠻人":"barbarian", "吟遊詩人":"bard", "牧師":"cleric", "德魯伊":"druid",
    "戰士":"fighter", "武僧":"monk", "聖武士":"paladin", "遊俠":"ranger",
    "遊蕩者":"rogue", "術士":"sorcerer", "邪術師":"warlock", "法師":"wizard"
  });
  const dir="assets/watercolor-icons-alpha/";
  function sync(){
    const cards=grid.querySelectorAll(":scope > .pick-card");
    for(const card of cards){
      if(card.querySelector(".wcs-alpha-class-icon"))continue;
      const key=icons[card.dataset.className];
      if(!key)continue;
      const img=document.createElement("img");
      img.className="wcs-alpha-class-icon";
      img.src=dir+key+".png?v=original-watercolor-v3";
      img.alt="";
      img.setAttribute("aria-hidden","true");
      img.decoding="async";
      img.loading="eager";
      img.draggable=false;
      card.prepend(img);
    }
  }
  const observer=new MutationObserver(sync);
  // renderClasses replaces direct children, so observing immediate children is enough.
  observer.observe(grid,{childList:true});
  sync();
})();
/* The existing portrait node remains the sole upload/display control.
   Move it only for wide screen with actual image; restore on narrow/print.
   No copied portrait data, duplicate IDs, or extra persisted state. */
(function(){
  "use strict";
  const sheet=document.getElementById("finalSheet");
  if(!sheet)return;
  const wide=matchMedia("screen and (min-width:1100px)");
  const print=matchMedia("print");
  let printing=false;
  function syncPortrait(){
    const head=sheet.querySelector(":scope > .sheet-head");
    const rail=sheet.querySelector(":scope > .portrait-col");
    const original=head?.querySelector(":scope > .portrait-col");
    const portrait=rail||original;
    if(!head||!portrait)return;
    const shouldRail=wide.matches&&!print.matches&&!printing&&!!portrait.querySelector(".portrait-frame img");
    if(shouldRail){
      if(portrait.parentElement!==sheet)sheet.insertBefore(portrait,head.nextSibling);
      const rows=[...sheet.children].filter(el=>el!==portrait&&el.className!=="print-template-title").length;
      sheet.style.setProperty("--wcs-portrait-rows",String(Math.max(1,rows)));
    }else{
      if(portrait.parentElement!==head)head.prepend(portrait);
      sheet.style.removeProperty("--wcs-portrait-rows");
    }
  }

  // Geometry belongs to the artwork, not the game state. Keep the original
  // number/text nodes and only wrap them for a measurable painted safe zone.
  function decorateBadge(el,kind){
    if(!el)return;
    el.dataset.wcsBadge=kind;
    let content=el.querySelector(":scope > .wcs-badge-content");
    if(!content){
      content=document.createElement("div");content.className="wcs-badge-content";
      const main=document.createElement("span");main.className="wcs-badge-main";
      const children=[...el.childNodes];
      for(const node of children){
        if(node.nodeType===1&&node.matches("small")){
          node.classList.add("wcs-badge-max");content.appendChild(node);
        }else main.appendChild(node);
      }
      content.prepend(main);el.appendChild(content);
    }
    const main=content.querySelector(".wcs-badge-main");
    const max=content.querySelector(".wcs-badge-max");
    const width=t=>Math.max(1.6,[...t.trim()].reduce((a,c)=>a+(/[\u3400-\u9fff]/u.test(c)?1.13:/\s/u.test(c)?.28:.72),.25));
    const value=main?.textContent||"";
    content.style.setProperty("--wcs-value-em",String(width(value)));
    if(max)content.style.setProperty("--wcs-max-em",String(width(max.textContent)));
    el.toggleAttribute("data-wcs-long",value.trim().length>6||(max?.textContent.trim().length||0)>8);
  }

  const folioArt = {
    skills:"academy-watercolor-art/d20.webp", proficiency:"academy-watercolor-art/medal.webp",
    mastery:"watercolor-icons-alpha/rogue.png", casting:"academy-watercolor-art/constellation.webp",
    class:"watercolor-icons-alpha/fighter.png", subclass:"academy-watercolor-art/signpost.webp",
    species:"academy-watercolor-art/paw.webp", origin:"academy-watercolor-art/notebook.webp",
    feat:"academy-watercolor-art/constellation.webp", equipment:"watercolor-icons-alpha/shop.png",
    armor:"academy-watercolor-art/shield.webp", weapons:"academy-watercolor-art/sword.webp",
    owned:"academy-watercolor-art/backpack.webp", money:"watercolor-icons-alpha/shop.png",
    starting:"academy-watercolor-art/compass.webp", spells:"academy-watercolor-art/spellbook.webp",
    notes:"watercolor-icons-alpha/creator.png", creature:"academy-watercolor-art/paw.webp"
  };
  function decorateSections(){
    for(const el of sheet.querySelectorAll(".fs-sec>.st,.play-box>.pt,.ss-title")){
      const t=el.textContent.trim();
      const kind=el.matches(".ss-title")?"spells":
        /^(2024|2014).*初始裝備|^初始裝備/.test(t)?"starting":
        /^護甲與盾牌/.test(t)?"armor":/^武器精通/.test(t)?"mastery":/^武器$/.test(t)?"weapons":
        /^已購武器/.test(t)?"owned":/^財物/.test(t)?"money":/^技能/.test(t)?"skills":
        /^熟練項/.test(t)?"proficiency":/^施法|^魔能祈喚/.test(t)?"casting":
        /子職業/.test(t)?"subclass":/^職業特性|特性[（(].*級|選擇$/.test(t)?"class":
        /^物種|^種族/.test(t)?"species":/^背景/.test(t)?"origin":/專長|豁免加成/.test(t)?"feat":
        /^裝備$/.test(t)?"equipment":/^法術/.test(t)?"spells":/^筆記/.test(t)?"notes":
        /^生物|^變形/.test(t)?"creature":"plain";
      el.dataset.wcsSection=kind;
      if(folioArt[kind])el.style.setProperty("--wcs-section-icon",'url("'+new URL('assets/'+folioArt[kind],document.baseURI).href+'")');
    }
  }
  function decorateValues(){
    const types=["heart","shield","metric","metric","metric","metric","metric","metric"];
    const icons=[null,null,"academy-watercolor-art/d20.webp","academy-watercolor-art/boot.webp","academy-watercolor-art/medal.webp","watercolor-icons-alpha/warlock.png","academy-watercolor-art/spellbook.webp","watercolor-icons-alpha/sorcerer.png"];
    const abilities=["barbarian","rogue","paladin","wizard","druid","bard"];
    sheet.querySelectorAll(".fs-statrow .stat-box .sv").forEach((el,i)=>{
      decorateBadge(el,types[i]||"metric");
      if(icons[i])el.style.setProperty("--wcs-value-icon",'url("'+new URL('assets/'+icons[i],document.baseURI).href+'")');
    });
    sheet.querySelectorAll(".fs-abrow .am").forEach((el,i)=>{
      decorateBadge(el,"ability");
      el.style.setProperty("--wcs-value-icon",'url("'+new URL('assets/watercolor-icons-alpha/'+abilities[i]+'.png',document.baseURI).href+'")');
    });
  }

  function syncEquipmentAC(){
    const box=sheet.querySelector(".play-box:has(#armorSel)");
    const value=sheet.querySelector(".fs-statrow .stat-box:nth-child(2) .sv")?.textContent.trim();
    if(!box||!value)return;
    let badge=box.querySelector(".wcs-equipment-ac");
    if(!badge){
      badge=document.createElement("div");
      badge.className="wcs-equipment-ac";
      const label=document.createElement("span");
      label.textContent="AC";
      const number=document.createElement("strong");
      badge.dataset.wcsBadge="equipment";
      const content=document.createElement("div");
      content.className="wcs-badge-content";
      label.className="wcs-badge-label";
      number.className="wcs-badge-main";
      content.append(label,number);
      badge.appendChild(content);
      box.appendChild(badge);
    }
    badge.querySelector("strong").textContent=value;
    badge.querySelector(".wcs-badge-content").style.setProperty("--wcs-value-em",String(Math.max(1.6,value.length*.72+.25)));
  }
  function syncFolio(){syncPortrait();decorateValues();decorateSections();syncEquipmentAC()}
  const observer=new MutationObserver(syncFolio);
  observer.observe(sheet,{childList:true});
  wide.addEventListener("change",syncPortrait);
  print.addEventListener("change",syncPortrait);
  window.addEventListener("beforeprint",()=>{printing=true;syncPortrait()});
  window.addEventListener("afterprint",()=>{printing=false;syncPortrait()});
  syncFolio();
})();
