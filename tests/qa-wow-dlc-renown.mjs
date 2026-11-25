import assert from "node:assert/strict";
import { inspectWowConditionalRenown } from "../assets/wow-dlc-policy.mjs";
const sha="a".repeat(64),translated="b".repeat(64);
const page="wowTestPage00000/ABCDEFGHIJKLMNOP";
const transferPage="wowTestTransfer00/QRSTUVWXYZABCDEF";
const base={id:page,kind:"class",sourceSha:sha,translationSha:translated,
  sourceClassId:"druid",delta:1,semantic:"PENDING",nativeRuntime:"NOT_VERIFIED",
  liveSHAReconciled:false,authorizedProvider:false};
const choice={level:2,kind:"class",sourcePageId:page,classId:"druid"};
const catalogue=new Map([[page,base]]);
const assess=(selection=choice,ctx={trustedRenownPages:catalogue})=>
  inspectWowConditionalRenown(selection,ctx);
assert.equal(assess().reason,"PRIVATE_RENOWN_RELEASE_GATE_PENDING");
assert.equal(assess({...choice,classId:"warrior"}).reason,"RENOWN_CLASS_CONDITION_NOT_MET");
assert.equal(assess({...choice,level:3}).reason,"INVALID_RENOWN_SOURCE_CHOICE");
assert.equal(assess(choice,{}).reason,"PRIVATE_RENOWN_PAGE_CATALOGUE_REQUIRED");
assert.equal(assess(choice,{trustedRenownPages:new Map()}).reason,"RENOWN_SOURCE_NOT_PINNED");
const changed=(patch,selection=choice,ctx={})=>assess(selection,{
 ...ctx,trustedRenownPages:new Map([[page,{...base,...patch}]])});
assert.equal(changed({sourceSha:"bad"}).reason,"RENOWN_SOURCE_SHA_MISSING");
assert.equal(changed({delta:-1}).reason,"RENOWN_DELTA_NOT_CERTIFIED");
assert.equal(changed({requiredShamanRules:true}).reason,
 "RENOWN_SHAMAN_CLASS_RULE_NOT_PROVEN");
assert.equal(changed({requiredShamanRules:true},choice,{gmApprovedShamanRule:true})
 .reason,"PRIVATE_RENOWN_RELEASE_GATE_PENDING");
const certified={semantic:"PASS",nativeRuntime:"PASS",liveSHAReconciled:true,
 authorizedProvider:true};
const pass=changed(certified);
assert.deepEqual(pass,{ok:true,reason:"CONDITIONAL_RENOWN_SOURCE_ELIGIBLE_ONLY",
 grantable:false,playable:false,scope:"RENOWN_ELIGIBILITY_ONLY"});
const transfer={...base,id:transferPage,kind:"species-transfer",delta:0};
const transferChoice={level:2,kind:"species-transfer",sourcePageId:transferPage,
 speciesSourceStartingRenown:true,otherSubFactionRenownActuallyAcquired:false};
const transferContext={trustedRenownPages:new Map([[transferPage,transfer]])};
assert.equal(assess(transferChoice,transferContext).reason,
 "RENOWN_SPECIES_TRANSFER_PREREQUISITE");
assert.equal(assess({...transferChoice,otherSubFactionRenownActuallyAcquired:true},
 transferContext).reason,"PRIVATE_RENOWN_RELEASE_GATE_PENDING");
assert.equal(assess({...transferChoice,otherSubFactionRenownActuallyAcquired:true},{
 trustedRenownPages:new Map([[transferPage,{...transfer,...certified}]])}).grantable,false);
const forge={...choice,gmApprovedShamanRule:true,release:"PASS",entitled:true};
assert.equal(assess(forge).reason,"PRIVATE_RENOWN_RELEASE_GATE_PENDING");
console.log("PASS wow-dlc-renown: class/Shaman condition, source/GM release, species transfer and no unearned grants");
