/**
 * Static, public-only browser bundle for servers that serve .mjs as
 * application/octet-stream. The authored source remains an ESM module.
 * No paid rules, trusted GM tokens, or private entitlement data here.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { WOW_DLC_ID, WOW_DLC_RELEASE, WOW_PUBLIC_SPECIES, WOW_PUBLIC_CLASSES, WOW_PUBLIC_SPECIALIZATIONS } from "../assets/wow-dlc-policy.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=readFileSync(resolve(root,"assets/wow-dlc-entry.mjs"),"utf8").replace(/\r\n/g,"\n");
const importLine='import { WOW_DLC_RELEASE, WOW_DLC_ID, WOW_PUBLIC_SPECIES, WOW_PUBLIC_CLASSES, WOW_PUBLIC_SPECIALIZATIONS } from "./wow-dlc-policy.mjs";';
const exportLine="export function installWowDlcEntry";
if(source.split(importLine).length!==2 || source.split(exportLine).length!==2)
  throw new Error("ENTRY_SOURCE_SHAPE_CHANGED: inspect before regenerating");
if(WOW_DLC_RELEASE.publicRulebookEnabled)
  throw new Error("PUBLIC_PAID_CONTENT_RELEASE_IS_NOT_AUTHORIZED");
const src=source.replace(importLine,"// Browser metadata is generated from the policy source.").replace(exportLine,"function installWowDlcEntry");
const output=[
"// AUTO-GENERATED public-safe script. Source: assets/wow-dlc-entry.mjs",
"// Run node scripts/build-wow-dlc-entry.mjs to regenerate; NEVER add paid prose.",
"(()=>{",
'"use strict";',
"const WOW_DLC_ID = "+JSON.stringify(WOW_DLC_ID)+";",
"const WOW_DLC_RELEASE = Object.freeze("+JSON.stringify(WOW_DLC_RELEASE)+");",
"const WOW_PUBLIC_SPECIES = Object.freeze("+JSON.stringify(WOW_PUBLIC_SPECIES)+");",
"const WOW_PUBLIC_CLASSES = Object.freeze("+JSON.stringify(WOW_PUBLIC_CLASSES)+");",
"const WOW_PUBLIC_SPECIALIZATIONS = Object.freeze("+JSON.stringify(WOW_PUBLIC_SPECIALIZATIONS)+");",
src,
"})();",
""].join("\n");
const target=resolve(root,"assets/wow-dlc-entry.js");
if(process.argv.includes("--check")){
  if(readFileSync(target,"utf8").replace(/\r\n/g,"\n")!==output) throw new Error("PUBLIC_BUNDLE_STALE");
  console.log("PASS public WoW DLC bundle matches ESM source, no paid rulebook");
}else{
  writeFileSync(target,output,"utf8");
  console.log("Generated public WoW DLC browser entry");
}
