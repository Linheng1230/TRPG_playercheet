import {projectDmSheet,type DmSheet} from "../../cloud-free/src/dm-sheet-projection";
import {MAX_CHARACTER_BYTES,validateCharacterJson} from "../../cloud-free/convex/lib/characterPayload";
export {MAX_CHARACTER_BYTES};
export type Role="player"|"gm";
export type PlayerProfile={role:Role;displayName:string;createdAt:number};
export type SavedCharacter={
  ownerUid:string;saveId:string;originalJson:string;revision:number;
  saveVersion:9|10;ruleset:"2014"|"2024";displayName:string;updatedAt:number
};
export type Campaign={ownerUid:string;name:string;createdAt:number;closedAt:number;deletedAt?:number};
export type CampaignRef=Campaign&{id:string};
export type SharedCharacter={
  ownerUid:string;saveId:string;originalJson:string;revision:number;
  saveVersion:9|10;ruleset:"2014"|"2024";displayName:string;sharedAt:number
};
export function parseCharacter(raw:string):{sheet:DmSheet;v:9|10}{
  if(new TextEncoder().encode(raw).byteLength>MAX_CHARACTER_BYTES)
    throw Error("角色存檔不得超過 512 KiB。");
  const validated=validateCharacterJson(raw);
  const sheet=projectDmSheet(raw);
  return{sheet,v:validated.saveVersion};
}
export function campaignIsClosed(c:Campaign):boolean{return c.closedAt>0;}
// Legacy campaigns have no deletedAt: treat them as active, without migration.
export function campaignIsDeleted(c:Campaign):boolean{return (c.deletedAt??0)>0;}
export function viewSharedSave(share:SharedCharacter):DmSheet{
  const parsed=parseCharacter(share.originalJson);
  if(parsed.sheet.id!==share.saveId||
      parsed.sheet.ruleset!==share.ruleset||
      parsed.v!==share.saveVersion||
      !Number.isInteger(share.revision)||share.revision<1)
    throw Error("分享資料版本不一致。");
  return parsed.sheet;
}
