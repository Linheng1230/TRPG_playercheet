/* Academy Bridge：只驗證測驗進入原創角器的路由，所有呈現共用 academy-guided-creator.js。 */
(function(){
"use strict";
const params=new URLSearchParams(window.location.search);
if(params.get("academy")!=="1")return;
const bridge=window.DND5RAcademyBridge;
if(!bridge||typeof go!=="function"||typeof S==="undefined")return;
bridge.configure({
 getRuleset:()=>S.ruleset,
 getCreatorStep:()=>S.step,
 hasCharacter:()=>!!S.cls,
 navigateCreator:step=>{go(step);return true;},
 navigateAcademy:url=>{window.location.assign(url);return true;},
 isValidSuggestion:(kind,ref,edition)=>{
  if(edition!=="2024")return false;
  if(kind==="class")return CLASSES.some(c=>c.n===ref);
  if(kind==="background")return BACKGROUNDS_2024.some(b=>b.n===ref);
  if(kind==="species")return SPECIES_2024.some(s=>s.n===ref);
  if(kind==="subclass")return Object.values(PROG_2024).some(p=>p.subs?.some(s=>s.n===ref));
  return false;
 },
 canOpenCreatorStep:()=>true,
 acceptQuestionSetId:id=>id==="class-fit-5r-v"+(window.ZIZI_CLASS_FIT_5R?.version||"")
});
})();
