/* Non-authoritative creator sidebar: forwards to the existing step navigator. */
(function(){
"use strict";
const main=document.querySelector("main");
const rail=main?.querySelector(".wcs-creator-rail");
const nav=document.getElementById("stepNav");
if(!main||!rail||!nav)return;
const buttons=[...rail.querySelectorAll("button.wcs-rail-step[data-step]")];
if(buttons.length!==7)return;
function sync(){
 const active=main.querySelector(".step-panel.active");
 const step=active?Number(active.dataset.step):-1;
 const creator=Number.isInteger(step)&&step>=0&&step<=6;
 main.classList.toggle("wcs-creator-mode",creator);
 rail.setAttribute("aria-hidden",creator?"false":"true");
 buttons.forEach(button=>{
   const current=creator&&Number(button.dataset.step)===step;
   button.classList.toggle("active",current);
   if(current)button.setAttribute("aria-current","step");
   else button.removeAttribute("aria-current");
 });
}
rail.addEventListener("click",event=>{
 const button=event.target.closest("button.wcs-rail-step");
 if(!button||!rail.contains(button))return;
 const step=Number(button.dataset.step);
 if(!Number.isInteger(step)||step<0||step>6)return;
 // Forward to the canonical navigation button to retain all existing rules and persistence.
 const original=[...nav.querySelectorAll(".nav-secondary button")][step];
 if(original)original.click();
});
new MutationObserver(sync).observe(nav,{childList:true,subtree:false});
sync();
})();