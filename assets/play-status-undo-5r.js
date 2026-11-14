/* 跑團狀態「撤銷上一步」：單一角色、單一操作、持久化快照，不建立第二份角色狀態。 */
(function (global) {
  "use strict";
  const clone = x => JSON.parse(JSON.stringify(x));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const own = (obj,k) => Object.prototype.hasOwnProperty.call(obj||{},k);
  const fields = ["hp","hpMax","thp","hd","ds","insp","res","resMax","custom"];
  const effectFields = ["concentration2024","concentrationChecks2024","conditions2024","exhaustion2024"];

  function snapshot(state) {
    const play = state.play || {}, out = {};
    [...fields,...effectFields].forEach(k => { out[k] = own(play,k) ? clone(play[k]) : null; });
    out.slotsUsed = clone(state.slotsUsed || {});
    return out;
  }

  function signature(state,maxHP) {
    return {
      id: String(state.id || ""),
      ruleset: state.ruleset === "2014" ? "2014" : "2024",
      cls: String(state.cls?.n || ""),
      level: Number(state.level),
      classLevels: clone(state.classLevels || {}),
      maxHP: Number(maxHP)
    };
  }

  // 記錄前快照 + 操作後指紋；後續若其他入口更改了相同狀態，禁止覆蓋較新的數值。
  function record(state,label,before,maxHP) {
    if (!state?.play || !before || !state.cls || !state.id) return false;
    const after = snapshot(state);
    if (same(before,after)) return false; // 零改變操作不能取代原本可撤銷紀錄
    const sig = signature(state,maxHP);
    state.play.undo = {
      v:1,
      label:String(label||"上一步操作").slice(0,64),
      signature:sig,
      before:clone(before),
      after:clone(after)
    };
    return true;
  }

  function available(state,maxHP) {
    const record=state?.play?.undo;
    if (!record || record.v!==1 || !record.before || !record.after || !record.signature) return null;
    const sig=signature(state,maxHP);
    if (!sig.id || !sig.cls || !same(sig,record.signature)) return null;
    if (!fields.every(k=>own(record.before,k)) || !own(record.before,"slotsUsed")) return null;
    const current=snapshot(state);
    if (!Object.keys(record.after).every(k=>same(current[k],record.after[k]))) return null;
    return record;
  }

  function undo(state,maxHP) {
    const r=available(state,maxHP);
    if (!r) return {ok:false,reason:"原本的角色、等級或狀態已變更，無法安全撤銷。"};
    const old=clone(r.before), label=r.label;
    // 同一份 S.play 保持物件身分；不變動角色筆記、能力選項、裝備與其他資料。
    [...fields,...effectFields].forEach(k => { if(own(old,k))state.play[k]=old[k]; });
    state.slotsUsed=old.slotsUsed;
    delete state.play.undo; // 一次性撤銷；不可撤銷撤銷動作
    return {ok:true,label};
  }

  global.PlayStatusUndo5R={snapshot,record,available,undo};
})(typeof window!=="undefined" ? window : globalThis);
