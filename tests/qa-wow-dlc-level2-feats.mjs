import assert from "node:assert/strict";
import {validateWowLevel2Option} from "../assets/wow-dlc-policy.mjs";
const sha="a".repeat(64),translated="b".repeat(64);
const origins=["wowftArathiHerit","wowftChildSea000","wowftWillSurvive"];
const higher=["wowftClearcastin","wowftElusiveBraw","wowftEnvelopiMis",
 "wowftFingersFros","wowftFistsFury00","wowftHotStreak00",
 "wowftInscriptAde","wowftStaggerSway"];
const campaignId="deadmines-20261219",characterId="player1";
const selected=id=>JSON.stringify([campaignId,characterId,id]);
const choice=id=>({pack:"feats",id,characterLevel:2});
const rec=id=>({pack:"feats",id,sourceRecordSHA:sha,
 translationSHA:translated,sourceLevelProof:"PASS",
 sourceFeatType:"origin",minimumCharacterLevel:1,
 requiresHuman:true,requiresWowCampaign:true,autoGrant:false,
 eligibilityCertified:true,liveMapped:true,
 semantic:"PASS",mechanics:"PASS",nativeMapping:"PASS",gmUAT:"PASS"});
const context=(id,row=rec(id))=>({
 trustedItems:new Map([["feats:"+id,row]]),
 trustedSpeciesId:"human",trustedCampaignKind:"wow",
 campaignId,characterId,trustedFeatSelections:new Set([selected(id)])
});
const assess=(id,overrides={},record={})=>
 validateWowLevel2Option(choice(id),{...context(id,{...rec(id),...record}),...overrides});
for(const id of origins){
 const valid=assess(id);
 assert.deepEqual(valid,{ok:true,reason:"SOURCE_CERTIFIED_FEAT_SELECTION_ONLY",
  scope:"LEVEL2_ORIGIN_FEAT_SELECTION_ONLY",grantable:false,playable:false});
 assert.equal(assess(id,{trustedSpeciesId:"orc"}).reason,"HUMAN_WOW_CAMPAIGN_REQUIRED");
 assert.equal(assess(id,{trustedCampaignKind:"nonwow"}).reason,"HUMAN_WOW_CAMPAIGN_REQUIRED");
 assert.equal(assess(id,{trustedFeatSelections:new Set()}).reason,
  "EXACTLY_ONE_ORIGIN_FEAT_SELECTION_REQUIRED");
 assert.equal(assess(id,{trustedFeatSelections:new Set([selected(id),selected(origins.find(x=>x!==id))])}).reason,
  "EXACTLY_ONE_ORIGIN_FEAT_SELECTION_REQUIRED");
 assert.equal(assess(id,{campaignId:"different-campaign"}).reason,
  "EXACTLY_ONE_ORIGIN_FEAT_SELECTION_REQUIRED");
 assert.equal(assess(id,{characterId:"different-character"}).reason,
  "EXACTLY_ONE_ORIGIN_FEAT_SELECTION_REQUIRED");
 assert.equal(assess(id,{}, {sourceFeatType:"general"}).reason,"ORIGIN_FEAT_SOURCE_SCOPE_INVALID");
 assert.equal(assess(id,{}, {requiresHuman:false}).reason,"ORIGIN_FEAT_SOURCE_SCOPE_INVALID");
 assert.equal(assess(id,{}, {requiresWowCampaign:false}).reason,"ORIGIN_FEAT_SOURCE_SCOPE_INVALID");
 assert.equal(assess(id,{}, {minimumCharacterLevel:4}).reason,"ORIGIN_FEAT_SOURCE_SCOPE_INVALID");
 assert.equal(assess(id,{}, {autoGrant:true}).reason,"ORIGIN_FEAT_SOURCE_SCOPE_INVALID");
 assert.equal(assess(id,{}, {translationSHA:"bad"}).reason,"SOURCE_AND_TRANSLATION_PROOF_REQUIRED");
 assert.equal(assess(id,{}, {semantic:"PENDING"}).reason,"SOURCE_NATIVE_SEMANTIC_GATE_PENDING");
 assert.equal(assess(id,{}, {gmUAT:"NOT_VERIFIED"}).reason,"SOURCE_NATIVE_SEMANTIC_GATE_PENDING");
 assert.equal(assess(id,{}, {liveMapped:false}).reason,"SOURCE_NATIVE_SEMANTIC_GATE_PENDING");
 assert.equal(assess(id,{}, {eligibilityCertified:false}).reason,"SOURCE_NATIVE_SEMANTIC_GATE_PENDING");
}
for(const id of higher){
 const blocked=assess(id,{},{sourceFeatType:"general",minimumCharacterLevel:1,autoGrant:true});
 assert.equal(blocked.reason,"FEAT_NOT_CERTIFIED_FOR_LEVEL2",id);
 assert.equal(blocked.playable,false);
}
assert.equal(assess("wowftUnknown0000").reason,"FEAT_NOT_CERTIFIED_FOR_LEVEL2");
assert.equal(validateWowLevel2Option({...choice(origins[0]),characterLevel:4},context(origins[0])).reason,
 "INVALID_LEVEL2_OPTION");
console.log("PASS wow-dlc-level2-feats: 3 exact human WoW origin feat selections; 8 general feats Lv2-denied; source GM entitlement and no auto-grant negatives");
