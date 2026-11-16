/* 30｜AcademyBridge v1 (00 contract). Standalone adapter, not yet wired to UI.
 * Navigation/learning progress ONLY. Never mutate Creator S or save schema v9.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof document !== "undefined") {
    let bridge = null;
    root.DND5RAcademyBridge = Object.freeze({
      configure: host => { bridge = api.createBridge(host); return root.DND5RAcademyBridge; },
      openCreator: route => bridge ? bridge.openCreator(route) : {ok:false,reason:"not-configured"},
      returnToAcademy: () => bridge ? bridge.returnToAcademy() : {ok:false,reason:"not-configured"},
      getRoute: () => bridge ? bridge.getRoute() : null,
      getCreatorSnapshot: () => bridge ? bridge.getCreatorSnapshot() : null,
      saveProgress: p => bridge ? bridge.saveProgress(p) : {ok:false,reason:"not-configured"},
      restoreProgress: () => bridge ? bridge.restoreProgress() : null,
      getProgressPersistence: () => bridge ? bridge.getProgressPersistence() : false
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION=1, ROUTE_KEY="dnd5r:academy:v1:route", PROGRESS_KEY="dnd5r:academy:v1:progress";
  const STEPS=Object.freeze({
    "creator.class":[0,"creator"],"creator.origin":[1,"origin"],
    "creator.abilities":[2,"abilities"],"creator.skills":[3,"skills"],
    "creator.details":[4,"details"],"creator.level":[5,"level"],
    "creator.spells":[6,"prepare"],"creator.sheet":[7,"sheet"],
    "reference.rules":[8,"rules"],"reference.spells":[9,"spells"],
    "reference.shop":[10,"shop"],"reference.characters":[12,"characters"],
    "reference.adventures":[13,"adventures"]
  });
  const academyIds=[
    ...["welcome","class","abilities","checks","origin","details","turn","spells","sheet","next"].map(x=>"lesson."+x),
    ...["intro","result","review",...Array.from({length:10},(_,i)=>"q"+String(i+1).padStart(2,"0"))].map(x=>"quiz."+x),
    ...["intro","ability-check","turn-choice","spell-choice","review"].map(x=>"practice."+x)
  ];
  const ACADEMY_IDS=new Set(academyIds);
  const SOURCES=Object.freeze({lesson:"lesson.",quiz:"quiz.",practice:"practice."});
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const safeText=(v,n)=>typeof v==="string"&&v.length>0&&v.length<=n&&!/[\u0000-\u001f<>\\/"']/.test(v)&&!v.includes(String.fromCharCode(96));
  function cleanRoute(v) {
    if (!v||v.v!==VERSION||!own(SOURCES,v.source)||!ACADEMY_IDS.has(v.academyStepId)||
        !v.academyStepId.startsWith(SOURCES[v.source])||!own(STEPS,v.creatorStepId)||
        v.returnURL!=="./academy.html"||v.returnStep!==v.academyStepId||
        !["inspect","suggest"].includes(v.mode)) return null;
    const r={v:VERSION,source:v.source,academyStepId:v.academyStepId,
      creatorStepId:v.creatorStepId,returnURL:"./academy.html",returnStep:v.returnStep,mode:v.mode};
    if (v.suggestion!=null) {
      const s=v.suggestion;
      if (!s||!["class","background","species","subclass"].includes(s.kind)||
          s.catalogVersion!=="2024"||!safeText(s.canonicalRef,120)) return null;
      r.suggestion={kind:s.kind,canonicalRef:s.canonicalRef,catalogVersion:"2024"};
    }
    return r;
  }
  function cleanProgress(v) {
    if (!v||v.v!==VERSION||!safeText(v.curriculumVersion,80)||!own(SOURCES,v.activeSource)||
        !ACADEMY_IDS.has(v.academyStepId)||!v.academyStepId.startsWith(SOURCES[v.activeSource])||
        !Array.isArray(v.completedStepIds)||v.completedStepIds.length>ACADEMY_IDS.size||
        !v.completedStepIds.every(x=>ACADEMY_IDS.has(x))||
        !Number.isSafeInteger(v.updatedAt)||v.updatedAt<0) return null;
    const p={v:VERSION,curriculumVersion:v.curriculumVersion,activeSource:v.activeSource,
      academyStepId:v.academyStepId,completedStepIds:[...new Set(v.completedStepIds)],updatedAt:v.updatedAt};
    if (v.questionSetId!=null) {
      if (!safeText(v.questionSetId,80)) return null;
      p.questionSetId=v.questionSetId;
    }
    if (v.answers!=null) {
      if (!v.answers||typeof v.answers!=="object"||Array.isArray(v.answers)||
          Object.keys(v.answers).length>10) return null;
      p.answers={};
      for (const [k,a] of Object.entries(v.answers)) {
        if (!/^Q(10|[1-9])$/.test(k)||!["A","B","C","D"].includes(a)) return null;
        p.answers[k]=a;
      }
    }
    return p;
  }
  function createBridge(host) {
    if (!host||typeof host.getRuleset!=="function"||
        typeof host.navigateCreator!=="function"||typeof host.navigateAcademy!=="function")
      throw new TypeError("AcademyBridge requires getRuleset/navigateCreator/navigateAcademy");
    let session=host.sessionStorage, local=host.localStorage;
    if (session===undefined) {try{session=typeof sessionStorage!=="undefined"?sessionStorage:null;}catch(_){session=null;}}
    if (local===undefined) {try{local=typeof localStorage!=="undefined"?localStorage:null;}catch(_){local=null;}}
    let inMemory=null, persisted=true;
    function read(store,key,clean) {
      try {const raw=store&&store.getItem(key);return raw?clean(JSON.parse(raw)):null;}
      catch(_){return null;}
    }
    function write(store,key,value) {
      try {if(!store)return false;const raw=JSON.stringify(value);
        store.setItem(key,raw);return store.getItem(key)===raw;
      } catch(_){return false;}
    }
    const eligible=()=>host.getRuleset()==="2024";
    const getRoute=()=>{const v=read(session,ROUTE_KEY,cleanRoute);return v?clone(v):null;};
    function openCreator(candidate) {
      const route=cleanRoute(candidate);
      if(!route)return {ok:false,reason:"invalid-route"};
      if(!eligible())return {ok:false,reason:"edition-2014"};
      if(route.suggestion && (typeof host.isValidSuggestion!=="function"||
          !host.isValidSuggestion(route.suggestion.kind,route.suggestion.canonicalRef,"2024")))
        return {ok:false,reason:"invalid-canonical-ref"};
      if(typeof host.canOpenCreatorStep==="function"&&!host.canOpenCreatorStep(route.creatorStepId))
        return {ok:false,reason:"confirmation-gate"};
      if(!write(session,ROUTE_KEY,route))return {ok:false,reason:"session-storage-unavailable"};
      try {const step=STEPS[route.creatorStepId];
        if(host.navigateCreator(step[0],step[1],clone(route))===false)
          return {ok:false,reason:"target-not-ready"};
      }catch(_){return {ok:false,reason:"target-not-ready"};}
      return {ok:true,creatorStepId:route.creatorStepId};
    }
    function returnToAcademy() {
      const route=getRoute();
      if(!route)return {ok:false,reason:"missing-or-invalid-return"};
      if(!eligible())return {ok:false,reason:"edition-2014"};
      const safeURL="./academy.html?step="+encodeURIComponent(route.returnStep);
      try {if(host.navigateAcademy(safeURL,route.returnStep)===false)
        return {ok:false,reason:"target-not-ready"};
      }catch(_){return {ok:false,reason:"target-not-ready"};}
      return {ok:true,returnStep:route.returnStep};
    }
    function getCreatorSnapshot() {
      try {const ruleset=host.getRuleset(),step=typeof host.getCreatorStep==="function"?host.getCreatorStep():0;
        if(!["2024","2014"].includes(ruleset))return null;
        const hit=Object.entries(STEPS).find(([,v])=>v[0]===step);
        return hit?{ruleset,creatorStepId:hit[0],
          characterPresent:typeof host.hasCharacter==="function"?!!host.hasCharacter():false}:null;
      }catch(_){return null;}
    }
    function saveProgress(candidate) {
      const progress=cleanProgress(candidate);
      if(!progress)return {ok:false,reason:"invalid-progress"};
      inMemory=clone(progress);
      persisted=write(local,PROGRESS_KEY,progress);
      return persisted?{ok:true,persisted:true}:{ok:true,persisted:false,reason:"storage-unavailable"};
    }
    function restoreProgress() {
      const saved=read(local,PROGRESS_KEY,cleanProgress);
      const p=saved||inMemory;
      if(!p)return null;
      const result=clone(p);
      if(result.questionSetId&&typeof host.acceptQuestionSetId==="function"&&
          !host.acceptQuestionSetId(result.questionSetId))delete result.answers;
      return result;
    }
    return Object.freeze({openCreator,returnToAcademy,getRoute,getCreatorSnapshot,
      saveProgress,restoreProgress,getProgressPersistence:()=>persisted});
  }
  return Object.freeze({createBridge,VERSION,ROUTE_KEY,PROGRESS_KEY,STEPS,
    ACADEMY_IDS:Object.freeze(academyIds.slice()),cleanRoute,cleanProgress});
});
