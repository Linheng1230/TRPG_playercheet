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
      img.src=dir+key+".png?v=ref-complete-v2";
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