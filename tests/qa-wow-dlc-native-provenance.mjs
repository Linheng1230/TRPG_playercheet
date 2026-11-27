import assert from "node:assert/strict";
import {auditWowNativeSourceProvenance} from "../assets/wow-dlc-policy.mjs";
const a="a".repeat(64),b="b".repeat(64),c="c".repeat(64),d="d".repeat(64);
const id1="wowinvPactLegion",id2="wowsplMoonfire00",id3="wowsplWrath00000";
const src=[{pack:"classes",id:id1,sourceRecordSHA:a,sourceBodySHA:c,translationSHA:d},
 {pack:"spells",id:id2,sourceRecordSHA:a,sourceBodySHA:c,translationSHA:d},
 {pack:"spells",id:id3,sourceRecordSHA:a,sourceBodySHA:c,translationSHA:d}];
const native=src.map((x,i)=>({...x,hydratedNativeSourceSHA:b,
 effectRecords:[{id:["H23CxuZIpfBM5pUr","XLxRZMmJ6ugxfL9q","zFR6eogPR89S3dG1"][i],sourceSHA:c}],
 independentSemantic:"PENDING",gmUAT:"NOT_VERIFIED"}));
const test=(rows=native,sourceRows=src)=>auditWowNativeSourceProvenance({sourceRows,nativeRows:rows});
const ok=test();
assert.equal(ok.ok,true);
assert.equal(ok.checked,3);
assert.equal(ok.playable,false);
assert.equal(ok.semantic,"PENDING");
assert.equal(ok.gmUAT,"NOT_VERIFIED");
const has=(x,txt)=>x.blockers.some(s=>s.startsWith(txt));
assert.equal(has(test(native.map((r,i)=>i===0?{...r,sourceRecordSHA:b}:r)), "NATIVE_RAW_PROVENANCE_MISMATCH:"),true);
assert.equal(has(test(native.map((r,i)=>i===1?{...r,hydratedNativeSourceSHA:a}:r)), "HYDRATED_EFFECTS_NOT_DISTINCT:"),true);
assert.equal(has(test(native.map((r,i)=>i===2?{...r,effectRecords:[]}:r)), "HYDRATED_WITHOUT_EFFECTS:"),true);
assert.equal(has(test(native.slice(0,2)), "MISSING_NATIVE_SOURCE:"),true);
assert.equal(has(test([...native,native[0]]), "DUPLICATE_NATIVE_SOURCE:"),true);
assert.equal(has(test([...native,{...native[0],id:"wowinvMissing012"}]),"UNEXPECTED_NATIVE_SOURCE:"),true);
assert.equal(has(test(native.map((r,i)=>i===0?{...r,independentSemantic:"PASS"}:r)), "UNAUTHORIZED_SEMANTIC_OR_GM_PROMOTION:"),true);
assert.equal(has(test(native.map((r,i)=>i===1?{...r,gmUAT:"PASS"}:r)), "UNAUTHORIZED_SEMANTIC_OR_GM_PROMOTION:"),true);
assert.equal(has(test(native.map((r,i)=>i===2?{...r,translationSHA:b}:r)), "NATIVE_RAW_PROVENANCE_MISMATCH:"),true);
assert.equal(has(test(native.map((r,i)=>i===2?{...r,effectRecords:[native[2].effectRecords[0],native[2].effectRecords[0]]}:r)), "INVALID_NATIVE_SOURCE_ROW"),true);
assert.equal(test([],[]).ok,false);
console.log("PASS wow-dlc-native-provenance: 3 raw/hydrated fixture pairs and 11 negative rollback/GM gates");
