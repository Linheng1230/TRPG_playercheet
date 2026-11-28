import assert from "node:assert/strict";
import { WOW_DLC_ID, WOW_BASE_CLASS_IDS } from "../assets/wow-dlc-policy.mjs";
import { validateWowPrivateProgressionManifest, auditWowPrivateProgressionRelease }
  from "../assets/wow-dlc-private-provider-contract.mjs";

const sha = c => c.repeat(64);
const classIds = Object.keys(WOW_BASE_CLASS_IDS);
const classes = classIds.map(id => ({ id, coreClassId: WOW_BASE_CLASS_IDS[id],
  minLevel: ["death-knight","demon-hunter","evoker"].includes(id) ? 3 : 1 }));
const specializations = [];
for (const classId of classIds) {
  const count = classId === "druid" ? 4 : 3;
  for (let i=1;i<=count;i++) specializations.push({
    id: classId + ".spec-" + i, classId, sourceKind: i === 1 ? "wow" : "core",
    sourceId: i === 1 ? "wowSource" + String(i).padStart(10,"0") : "Core subclass " + i,
  });
}
assert.equal(specializations.length, 40);
const ids = ["wowfeatAAAA0001","wowspellAAA0001","wowresAAAA00001","wowchoiceAA0001","wowtableAAA0001"];
const records = Object.fromEntries(ids.map((id,i)=>[id,{
  pack: i===1 ? "spells" : "classes", sourceSha: sha(String(i+1)),
  translationSha: sha(String(i+5)), semantic:"PASS", mechanics:"PASS",
  nativeMapping:"PASS", liveUAT:"PASS",
}]));
const progressionRows = specializations.flatMap(spec => [1,2,3].map(level=>({
  classId:spec.classId, specializationId:spec.id, level,
  eligibility:["death-knight","demon-hunter"].includes(spec.classId)&&level<3
    ? "GM_EARLY_START_ONLY" : spec.classId==="evoker"&&level<3 ? "LOCKED" : "BASE_LEVEL_OK",
  subclassAvailable:level===3,
  grantItemIds:level===3?[ids[0]]:[], overrideItemIds:level===1?[ids[0]]:[],
  spellTableItemIds:level===3?[ids[4]]:[], spellIds:level<=3?[ids[1]]:[],
  resourceItemIds:[ids[2]], choiceItemIds:level===3?[ids[3]]:[],
})));
const manifest={schemaVersion:1,dlcId:WOW_DLC_ID,sourceSnapshotSha:sha("a"),
  levels:[1,2,3],classes,specializations,progressionRows,records};
const ctx={entitlement:true,privateDelivery:true,sourceSnapshotSha:manifest.sourceSnapshotSha};
const ok=validateWowPrivateProgressionManifest(manifest,ctx);
assert.equal(ok.ok,true);assert.equal(ok.playable,false);
assert.deepEqual(ok.counts,{classes:13,specializations:40,progressionRows:120,referencedRecords:5});
assert.equal(validateWowPrivateProgressionManifest({...manifest,description:"paid prose"},ctx).ok,false);
assert.equal(validateWowPrivateProgressionManifest({...manifest,levels:[1,2]},ctx).ok,false);
assert.equal(validateWowPrivateProgressionManifest({...manifest,progressionRows:manifest.progressionRows.slice(1)},ctx).ok,false);
assert.equal(validateWowPrivateProgressionManifest(manifest,{...ctx,entitlement:false}).ok,false);
const pending=structuredClone(manifest);pending.records[ids[0]].semantic="PENDING";
assert.equal(validateWowPrivateProgressionManifest(pending,ctx).ok,true);
assert.equal(auditWowPrivateProgressionRelease(pending,ctx).playable,false);
const releaseCtx={...ctx,integrationQA:true,saveRoundtrip:true,jsonRoundtrip:true,pdfUAT:true,
  cloudUAT:true,fvttUAT:true,liveUAT:true,readback:true};
assert.equal(auditWowPrivateProgressionRelease(manifest,releaseCtx).playable,true);
assert.equal(auditWowPrivateProgressionRelease(manifest,{...releaseCtx,pdfUAT:false}).playable,false);
console.log("PASS WoW private Lv1-3 provider contract: 13 classes / 40 specs / 120 rows, no paid prose");
