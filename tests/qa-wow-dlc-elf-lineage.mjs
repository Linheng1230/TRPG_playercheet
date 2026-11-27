import assert from "node:assert/strict";
import { WOW_ELF_LINEAGE_IDS,inspectWowElfLineageLevel2 } from "../assets/wow-dlc-policy.mjs";
const sha="a".repeat(64),translation="b".repeat(64);
const sourcePageId="wowElf0000000000/Vre1pgtt7JtdX96D";
const choices=WOW_ELF_LINEAGE_IDS;
assert.equal(choices.length,4);
const catalogue=new Map(choices.map(id=>[id,{id,sourceRecordSHA:sha,translationSHA:translation,
 level1:true,level3AtLv2:false,level5AtLv2:false,native:"PASS",
 semantic:"PENDING",gmUAT:"NOT_VERIFIED",liveMapped:false}]));
const make=id=>({level:2,originPageId:sourcePageId,selectedLineageIds:[id]});
for(const id of choices){
 const source=make(id);
 assert.equal(inspectWowElfLineageLevel2(source,{trustedLineages:catalogue})
  .reason,"LINEAGE_SOURCE_GM_RELEASE_HOLD");
 assert.equal(inspectWowElfLineageLevel2(source,{trustedLineages:null})
  .reason,"PRIVATE_LINEAGE_SOURCE_REQUIRED");
 const resolved=new Map(catalogue);
 resolved.set(id,{...resolved.get(id),semantic:"PASS",gmUAT:"PASS",liveMapped:true});
 assert.deepEqual(inspectWowElfLineageLevel2(source,{
  trustedLineages:resolved,authorizedProvider:true
 }),{ok:true,reason:"CERTIFIED_LINEAGE_SELECTION_ONLY",
  scope:"ELF_LINEAGE_SELECTION_ONLY",playable:false});
}
assert.equal(inspectWowElfLineageLevel2({...make(choices[0]),level:3}).reason,
 "EXACTLY_ONE_LV2_ELF_LINEAGE_REQUIRED");
assert.equal(inspectWowElfLineageLevel2({...make(choices[0]),selectedLineageIds:[]}).reason,
 "EXACTLY_ONE_LV2_ELF_LINEAGE_REQUIRED");
assert.equal(inspectWowElfLineageLevel2({...make(choices[0]),selectedLineageIds:choices.slice(0,2)}).reason,
 "EXACTLY_ONE_LV2_ELF_LINEAGE_REQUIRED");
assert.equal(inspectWowElfLineageLevel2(make("someOtherSpecies")).reason,
 "UNRECOGNIZED_ELF_LINEAGE_ITEM");
const altered=idFields=>({trustedLineages:new Map([[choices[0],{
 ...catalogue.get(choices[0]),...idFields}]])});
assert.equal(inspectWowElfLineageLevel2(make(choices[0]),altered({
 translationSHA:"bad"})).reason,"LINEAGE_SOURCE_PROVENANCE_MISSING");
assert.equal(inspectWowElfLineageLevel2(make(choices[0]),altered({
 level3AtLv2:true})).reason,"HIGH_LEVEL_LINEAGE_FEATURE_AT_LV2");
assert.equal(inspectWowElfLineageLevel2(make(choices[0]),altered({
 level5AtLv2:true})).reason,"HIGH_LEVEL_LINEAGE_FEATURE_AT_LV2");
assert.equal(inspectWowElfLineageLevel2(make(choices[0]),altered({
 level1:false})).reason,"HIGH_LEVEL_LINEAGE_FEATURE_AT_LV2");
console.log("PASS wow-dlc-elf-lineage: 4 exact source IDs, exactly-one choice, Lv1 allowed and Lv3/Lv5 excluded, native/GM/private release holds");
