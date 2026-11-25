import assert from "node:assert/strict";
import { validateWowLevel2Option } from "../assets/wow-dlc-policy.mjs";

const sha="a".repeat(64),translation="b".repeat(64);
const id="syntheticSpell01",base={
  pack:"spells",id,sourceRecordSHA:sha,translationSHA:translation,
  sourceLevelProof:"PASS",minimumCharacterLevel:1,requiredLineage:"nightborne",
  lineageMinimumLevel:1,liveMapped:false,eligibilityCertified:false,
  semantic:"PENDING",mechanics:"PASS",nativeMapping:"PASS",
  gmUAT:"NOT_VERIFIED",autoGrant:false
};
const ctx={trustedItems:new Map([["spells:"+id,base]]),
  campaignId:"deadmines-20261219",characterId:"p1",
  trustedLineageSelections:new Map([[JSON.stringify(["deadmines-20261219","p1"]),"nightborne"]])};
const choice={pack:"spells",id,characterLevel:2,
  lineageId:"nightborne",classId:"mage"};
const check=(c=choice,x=ctx)=>validateWowLevel2Option(c,x);
assert.equal(check().reason,"SOURCE_NATIVE_SEMANTIC_GATE_PENDING");
assert.equal(check({...choice,lineageId:"void-elf"}).reason,"LINEAGE_PREREQUISITE");
const ready={...base,liveMapped:true,eligibilityCertified:true,semantic:"PASS",gmUAT:"PASS",autoGrant:true};
assert.deepEqual(check(choice,{...ctx,trustedItems:new Map([["spells:"+id,ready]])}),
 {ok:true,reason:"SOURCE_CERTIFIED_OPTION_ONLY",scope:"LEVEL2_OPTION_ONLY",playable:false});
assert.equal(check({...choice,characterLevel:3}).reason,"INVALID_LEVEL2_OPTION");
assert.equal(check({...choice,id:"not-uuid"}).reason,"INVALID_LEVEL2_OPTION");
assert.equal(check(choice,{...ctx,trustedItems:null}).reason,"PRIVATE_SOURCE_CATALOGUE_REQUIRED");
assert.equal(check(choice,{...ctx,trustedItems:new Map()}).reason,"UNVERIFIED_SOURCE_ITEM");
assert.equal(check(choice,{...ctx,trustedItems:new Map([["spells:"+id,{...ready,sourceRecordSHA:"invalid"}]])}).reason,
 "SOURCE_AND_TRANSLATION_PROOF_REQUIRED");
const withItem=(record,c=choice,more={})=>check(c,{...ctx,...more,
 trustedItems:new Map([["spells:"+id,{...ready,...record}]])});
assert.equal(withItem({requiredLineage:"void-elf",lineageMinimumLevel:3},
 {...choice,lineageId:"void-elf"}).reason,"LINEAGE_LEVEL_PREREQUISITE");
assert.equal(withItem({sourcePrerequisiteConflict:true}).reason,"SOURCE_PREREQUISITE_CONFLICT");
assert.equal(withItem({access:"SOURCE_PREREQUISITE_CONFLICT_NO_AUTO_UNLOCK"}).reason,"SOURCE_PREREQUISITE_CONFLICT");
assert.equal(withItem({minimumCharacterLevel:3}).reason,"CHARACTER_LEVEL_PREREQUISITE");
assert.equal(withItem({requiredClassId:"priest"}).reason,"CLASS_PREREQUISITE");
assert.equal(withItem({srdSameIdCandidate:true,semanticEquivalentToSrd:"UNVERIFIED"}).reason,
 "SRD_SAME_ID_NOT_EQUIVALENT");
assert.equal(withItem({autoGrant:false}).reason,"OPTION_NOT_AUTO_GRANTED");
const hero={
 requiredClassId:"death-knight",requiresDmPermission:true,
 requiresSubclass:true,requiredSubclassId:"dk-early",
};
const dkChoice={...choice,classId:"death-knight"};
assert.equal(withItem(hero,dkChoice).reason,"SUBCLASS_PREREQUISITE_NOT_VERIFIED");
const subkey=JSON.stringify([ctx.campaignId,ctx.characterId,"death-knight","dk-early"]);
assert.equal(withItem(hero,dkChoice,{trustedSubclassChoices:new Set([subkey])}).reason,"DM_HERO_PERMISSION_REQUIRED");
const herokey=JSON.stringify([ctx.campaignId,ctx.characterId,"death-knight"]);
assert.equal(withItem(hero,dkChoice,{trustedSubclassChoices:new Set([subkey]),
 gmHeroWaivers:new Map([[herokey,true]]),heroSubclassLocks:new Set([herokey])}).reason,
 "SOURCE_CERTIFIED_OPTION_ONLY");
assert.equal(withItem({requiresDmPermission:true,requiredClassId:"mage"}).reason,
 "DM_HERO_PERMISSION_REQUIRED");
assert.equal(withItem({access:"NIGHTBORNE_LINEAGE_LEVEL1",requiredLineage:undefined}).reason,
 "SOURCE_LINEAGE_POLICY_INCOMPLETE");
assert.equal(withItem({access:"VOID_ELF_LINEAGE_LEVEL3_EXCLUDE_AT_LEVEL2",
 requiredLineage:"void-elf",lineageMinimumLevel:1}).reason,
 "SOURCE_LINEAGE_POLICY_INCOMPLETE");
assert.equal(withItem({access:"EVOKER_SUBCLASS_LEVEL3_DEFAULT_EXCLUDE_AT_LEVEL2",
 minimumCharacterLevel:1}).reason,"SOURCE_SUBCLASS_LEVEL_POLICY_INCOMPLETE");
assert.equal(withItem({access:"HERO_CLASS_DM_PERMISSION_REQUIRED",
 requiredClassId:"death-knight",requiresDmPermission:false},dkChoice).reason,
 "SOURCE_HERO_POLICY_INCOMPLETE");
assert.equal(withItem({sourceLevelBasis:"BOOK_RECOMMENDED_LEVEL1_NOT_ITEM_PREREQUISITE"}).reason,
 "BOOK_RECOMMENDATION_NOT_ENTITLEMENT");
// V4 native Headless PASS does not override the official Lv1 Book vs
// Subclass prerequisite conflict for these exact spell Item identities.
for (const conflictId of ["wowsplFrostNova0","wowsplShadowWord"]) {
  const fakeAllPass = {...ready, id:conflictId, requiredLineage:undefined,
    lineageMinimumLevel:undefined,requiredClassId:undefined,
    sourcePrerequisiteConflict:false, access:"AVAILABLE_FROM_LV1",
    semantic:"PASS", mechanics:"PASS", nativeMapping:"PASS", gmUAT:"PASS",
    eligibilityCertified:true, liveMapped:true, autoGrant:true};
  const verdict=check({...choice,id:conflictId},{
    ...ctx,trustedItems:new Map([["spells:"+conflictId,fakeAllPass]])});
  assert.equal(verdict.reason,"SOURCE_PREREQUISITE_CONFLICT");
  assert.equal(verdict.playable,false);
}
// V9 source-bound dependency: the exact native spell ID must require the
// actual Nightborne selection, and a Level 3 Void Elf feature never unlocks at Lv2.
const exact=(exactId,overrides={},more={})=>check({...choice,id:exactId},{
 ...ctx,...more,trustedItems:new Map([["spells:"+exactId,{...ready,id:exactId,...overrides}]])});
assert.equal(exact("wowsplArcanePuls").reason,"SOURCE_CERTIFIED_OPTION_ONLY");
assert.equal(exact("wowsplArcanePuls",{requiredLineage:undefined,lineageMinimumLevel:undefined}).reason,
 "SOURCE_LINEAGE_POLICY_INCOMPLETE");
assert.equal(exact("wowsplArcanePuls",{requiredLineage:"void-elf",lineageMinimumLevel:1}).reason,
 "SOURCE_LINEAGE_POLICY_INCOMPLETE");
assert.equal(exact("wowsplArcanePuls",{}, {trustedLineageSelections:null}).reason,
 "LINEAGE_SELECTION_NOT_VERIFIED");
assert.equal(exact("wowsplArcanePuls",{}, {characterId:"p2"}).reason,
 "LINEAGE_SELECTION_NOT_VERIFIED");
assert.equal(exact("wowsplArcanePuls",{}, {campaignId:"another-campaign"}).reason,
 "LINEAGE_SELECTION_NOT_VERIFIED");
assert.equal(exact("wowsplArcanePuls",{}, {trustedLineageSelections:new Map([
 [JSON.stringify([ctx.campaignId,ctx.characterId]),"void-elf"]])}).reason,
 "LINEAGE_SELECTION_NOT_VERIFIED");
assert.equal(exact("wowsplEntropEmbr",{requiredLineage:undefined,lineageMinimumLevel:undefined}).reason,
 "LINEAGE_LEVEL_PREREQUISITE");
assert.equal(exact("wowsplEntropEmbr",{requiredLineage:"void-elf",lineageMinimumLevel:1}).reason,
 "LINEAGE_LEVEL_PREREQUISITE");
console.log("PASS wow-dlc-level2-source: exact Arcane Pulse/Void Elf lineage and campaign-character selection, Lv1/Lv3, exact V4 conflict IDs, hero GM+subclass, SRD, native & live gates; certified option remains non-playable");
