/* 跑團狀態休息操作：只改同一份 S.play / S.slotsUsed；規則依 2014/2024 分支。 */
(function (global) {
  "use strict";
  const safe = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+n) ? Math.trunc(+n) : lo));
  const spent = (obj, key, max) => clamp(obj && obj[key], 0, max);
  const kindLabel = kind => kind === "short" ? "短休" : "長休";

  // 所有短休資源以穩定 key 分流，絕不解析中文描述做自動計算。
  function shortRestGain(state, key, used) {
    const lvl = Number(state.level) || 1, v24 = state.ruleset === "2024";
    if (key === "rage") return v24 ? 1 : 0;
    if (key === "bi") return lvl >= 5 ? used : 0;
    if (key === "cd") return v24 ? 1 : used;
    if (key === "ws") return v24 ? 1 : used;
    if (key === "sw") return v24 ? 1 : used;
    if (key === "ai" || key === "ki") return used;
    return 0; // 奧術恢復、術法恢復及其他條件型特性由玩家決定，不能擅自恢復。
  }

  function recovery(state, kind, resources, slots) {
    const play = state.play, result = {kind, changes:[], reminders:[]};
    (resources || []).forEach(r => {
      const max = clamp(play.resMax && play.resMax[r.k] != null ? play.resMax[r.k] : r.max, 0, 9999);
      const was = spent(play.res, r.k, max);
      const gain = kind === "long" ? was : Math.min(was, shortRestGain(state, r.k, was));
      if (gain) result.changes.push({scope:"resource", key:r.k, label:r.label, before:was, after:was-gain, gain});
    });
    (slots || []).forEach(s => {
      const max = clamp(s.max, 0, 99), was = spent(state.slotsUsed, s.key, max);
      const gain = kind === "long" || s.key === "pact" ? was : 0;
      if (gain) result.changes.push({scope:"slot", key:s.key, label:s.label, before:was, after:was-gain, gain});
    });
    (play.custom || []).forEach((counter,i) => {
      const max = clamp(counter.max, 0, 9999);
      const was = clamp(counter.used, 0, max);
      const rest = counter.rest || "manual";
      const eligible = kind === "long" ? ["short","long"].includes(rest) : rest === "short";
      if (eligible && was) result.changes.push({scope:"custom", key:i, label:counter.n, before:was, after:0, gain:was});
    });
    if (kind === "short") {
      if (state.className === "法師" && (Number(state.level) || 1) >= 1) result.reminders.push("奧術恢復：可自行選擇恢復法術位（每長休一次），不自動代選。");
      if (state.className === "術士" && state.ruleset === "2024" && state.level >= 5) result.reminders.push("術法恢復：可自行決定是否恢復魔源點（每長休一次），不自動代用。");
    } else {
      result.reminders.push("力竭減少 1 級、被降低的屬性與生命值上限恢復正常（若有，請依角色實際狀態調整）。");
    }
    if ((play.custom || []).some(c => !c.rest || c.rest === "manual")) result.reminders.push("未設定恢復時機的自訂計數器不會自動重置。");
    return result;
  }

  function mixed2014(state, diceTypes) {
    return state.ruleset === "2014" && (diceTypes || []).filter(x => Number(x.level) > 0).length > 1;
  }

  // 提供純函式可測 API；沒有修改 state 就不會產生任何消耗。
  function apply(state, kind, options) {
    options = options || {};
    if (kind !== "short" && kind !== "long") throw Error("未知的休息類型");
    if (!state || !state.play || !state.slotsUsed) throw Error("缺少角色狀態");
    const play = state.play, maxHP = clamp(options.maxHP, 1, 99999);
    if (clamp(play.hp, 0, maxHP) < 1) throw Error("生命值必須大於 0，才能開始休息");
    const totalDice = clamp(state.level, 1, 20);
    const remaining = clamp(play.hd == null ? totalDice : play.hd, 0, totalDice);
    const count = kind === "short" ? Number(options.diceCount || 0) : 0;
    if (!Number.isInteger(count) || count < 0 || count > remaining) throw Error("生命骰數量超出可用範圍");
    if (kind === "short" && count && mixed2014(state, options.diceTypes)) throw Error("2014 多職業有不同生命骰型；請在角色卡手動記錄本次生命骰與回血");
    const die = clamp(options.hitDie, 1, 20), con = Math.trunc(Number(options.conMod) || 0);
    const draws = [];
    let healed = 0;
    // 全部前置驗證完成後才更動持久狀態。
    for (let i=0;i<count;i++) {
      const rolled = clamp(Math.floor((options.random || Math.random)() * die) + 1, 1, die);
      const gain = Math.max(1, rolled + con);
      draws.push({die, rolled, con, gain}); healed += gain;
    }
    const beforeHP = clamp(play.hp, 0, maxHP), beforeDice = remaining;
    const plan = recovery(state, kind, options.resources, options.slots);
    play.hp = kind === "long" ? maxHP : Math.min(maxHP, beforeHP + healed);
    play.hd = kind === "long" ? (state.ruleset === "2014" ? Math.min(totalDice, remaining + Math.max(1, Math.floor(totalDice / 2))) : totalDice) : remaining - count;
    if (kind === "long") {
      play.thp = 0; // 暫時生命值持續至長休結束。
      play.ds = {s:0,f:0};
    }
    plan.changes.forEach(c => {
      if (c.scope === "slot") state.slotsUsed[c.key] = c.after;
      if (c.scope === "resource") play.res[c.key] = c.after;
      if (c.scope === "custom") play.custom[c.key].used = c.after;
    });
    // PHB2024 Human Resourceful：完成長休時獲得英雄激勵；只有未持有時才新增。
    if (kind === "long" && state.ruleset === "2024" && state.sp?.n === "人類" && !play.insp) {
      play.insp = true;
      plan.changes.push({scope:"inspiration",key:"human-resourceful",label:"人類：英雄激勵",gain:1});
    }
    plan.hpBefore=beforeHP; plan.hpAfter=play.hp;
    plan.diceBefore=beforeDice; plan.diceAfter=play.hd;
    plan.rolls=draws;
    plan.hpGained=play.hp-beforeHP;
    return plan;
  }

  function summaryHTML(result) {
    const lines = [];
    lines.push("<li>生命值：" + result.hpBefore + " → <b>" + result.hpAfter + "</b>" + (result.kind === "short" ? "（實際恢復 " + result.hpGained + "）" : "（已回滿）") + "</li>");
    lines.push("<li>生命骰：" + result.diceBefore + " → <b>" + result.diceAfter + "</b></li>");
    result.changes.forEach(c => lines.push(c.scope === "inspiration" ? "<li>" + safe(c.label) + "：已獲得</li>" : "<li>" + safe(c.label) + "：恢復 " + c.gain + " 次</li>"));
    if (result.kind === "long") lines.push("<li>暫時 HP 已清除；死亡豁免計數歸零。</li>");
    if (!result.changes.length && result.kind === "short") lines.push("<li>本次沒有需要自動恢復的其他資源。</li>");
    const rolls = result.rolls.length ? '<p class="ps-rest-rolls">生命骰：' + result.rolls.map(x => "d" + x.die + " 擲出 " + x.rolled + (x.con>=0?"+":"") + x.con + " → " + x.gain).join("；") + "</p>" : "";
    const notes = result.reminders.length ? '<p class="ps-rest-notes">' + result.reminders.map(safe).join("<br>") + "</p>" : "";
    return '<ul class="ps-rest-result">' + lines.join("") + "</ul>" + rolls + notes;
  }

  function showDialog(heading, inner, action, onSubmit) {
    document.querySelector("#psRestDialog")?.remove();
    const dlg=document.createElement("dialog");
    dlg.id="psRestDialog";dlg.className="ps-rest-dialog";
    dlg.setAttribute("aria-label",heading);
    dlg.innerHTML='<div class="ps-rest-modal"><h3>' + safe(heading) + '</h3>' + inner + '<div class="ps-rest-actions">' + (action ? '<button type="button" data-rest-close>取消</button><button type="button" class="ps-rest-confirm" data-rest-submit>' + safe(action) + '</button>' : '<button type="button" class="ps-rest-confirm" data-rest-close>確定</button>') + "</div></div>";
    document.body.appendChild(dlg);
    dlg.querySelector("[data-rest-close]").onclick=()=>dlg.close();
    if (onSubmit) dlg.querySelector("[data-rest-submit]").onclick=()=>onSubmit(dlg);
    dlg.addEventListener("close",()=>dlg.remove(),{once:true});
    dlg.showModal();
  }

  function open(kind, data) {
    const state=data.state,play=state.play,remain=clamp(play.hd == null ? state.level : play.hd,0,state.level);
    const mix=mixed2014(state,data.diceTypes);
    if ((Number(play.hp)||0)<=0) {data.notify("生命值必須大於 0，才能開始短休或長休");return;}
    const preview=recovery(state,kind,data.resources,data.slots);
    const labels=preview.changes.map(x=>safe(x.label)+"（+"+x.gain+"）");
    const applicable=labels.length ? labels.join("、") : "目前沒有已消耗且可自動恢復的資源";
    const notes=preview.reminders.length?'<p class="ps-rest-notes">'+preview.reminders.map(safe).join("<br>")+"</p>":"";
    const perform=(count,setupDialog)=>{
      try {
        const result=apply(state,kind,{diceCount:count,hitDie:data.hitDie,conMod:data.conMod,diceTypes:data.diceTypes,resources:data.resources,slots:data.slots,maxHP:data.maxHP});
        if(setupDialog?.open)setupDialog.close();
        data.onUpdate();
        showDialog(kindLabel(kind)+"完成",summaryHTML(result),null,null);
      } catch(e) {data.notify(e.message);}
    };
    if (kind === "long") {perform(0);return;}
    const diceField = mix
      ? '<p class="ps-rest-notes">2014 多職業角色可能持有不同骰型的生命骰。為避免錯擲，本次請使用既有生命骰／治療欄位手動記錄；短休資源仍可自動恢復。</p>'
      : '<label class="ps-rest-dice">使用幾枚生命骰？<input id="psRestDiceCount" type="number" inputmode="numeric" min="0" max="'+remain+'" value="0" step="1"><small>剩餘 '+remain+' 枚 · 每枚 d'+clamp(data.hitDie,1,20)+'＋體質調整值 '+(data.conMod>=0?"+":"")+data.conMod+'（至少恢復 1 HP）</small></label>';
    showDialog("短休 · 1 小時",'<p class="ps-rest-desc">可選擇不使用生命骰；完成短休仍會恢復符合條件的能力。</p>' + diceField +
      '<p class="ps-rest-desc"><b>本次可恢復：</b>'+applicable+'</p>'+notes,
      "完成短休",dlg=>{
        let count=0;
        if(!mix) {
          const input=dlg.querySelector("#psRestDiceCount"),n=Number(input.value);
          if(!input.value.trim()||!Number.isInteger(n)||n<0||n>remain){data.notify("請輸入 0～"+remain+" 的整數生命骰數量");return;}
          count=n;
        }
        perform(count,dlg);
      });
  }

  global.PlayStatusRest5R={apply,recovery,open,shortRestGain,mixed2014};
})(typeof window !== "undefined" ? window : globalThis);
