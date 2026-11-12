from pathlib import Path
import json,re,subprocess
from opencc import OpenCC

REPO=Path(__file__).resolve().parents[1]
CN=Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5etools-cn")
DATA=CN/"data"
cc=OpenCC("s2twp")
CN_COMMIT=subprocess.run(["git","rev-parse","HEAD"],cwd=CN,capture_output=True,text=True,check=True).stdout.strip()
CORRECTIONS=json.loads((REPO/"assets/data/player-reference-zh-corrections.json").read_text(encoding="utf-8"))

def load_js(path):
    s=path.read_text(encoding="utf-8")
    a=s.index("Object.freeze(")+len("Object.freeze(")
    b=s.rindex(");")
    return json.loads(s[a:b])

def collect_pairs(v,out):
    if isinstance(v,dict):
        en=v.get("ENG_name"); zh=v.get("name")
        if isinstance(en,str) and isinstance(zh,str) and en and zh:
            out[en]=cc.convert(zh)
        for x in v.values(): collect_pairs(x,out)
    elif isinstance(v,list):
        for x in v: collect_pairs(x,out)

TAG=re.compile(r"\{@([A-Za-z0-9]+)(?:\s+([^{}]+))?\}")
def strip_5e_tags(s):
    s=str(s or "").replace("{@h}","命中：").replace("{@m}","未命中：")
    def rep(m):
        tag=m.group(1).lower(); parts=(m.group(2) or "").split("|"); first=parts[0] if parts else ""
        if tag=="dc": return "難度 "+first
        if tag=="hit": return ("+" if first and not first.startswith(("+","-")) else "")+first
        if tag in {"damage","dice","scaledice","scaledamage"}: return first
        if tag=="chance": return first if first.endswith("%") else first+"%"
        if tag=="recharge": return "充能 "+(first or "6")
        if tag=="atkr": return {"m":"近戰攻擊檢定：","r":"遠程攻擊檢定：","mr":"近戰或遠程攻擊檢定：","m,r":"近戰或遠程攻擊檢定："}.get(first,first)
        if tag=="actsave": return {"str":"力量","dex":"敏捷","con":"體質","int":"智力","wis":"感知","cha":"魅力"}.get(first.lower(),first)+"豁免檢定："
        if tag=="actsavefail": return {"1":"第一次豁免失敗：","2":"第二次豁免失敗："}.get(first,"豁免失敗：")
        if tag=="actsavesuccess": return "豁免成功："
        if tag=="actsavesuccessorfail": return "豁免成功或失敗："
        if tag=="actsavefailby": return "豁免失敗差距 "+first+"："
        if tag=="acttrigger": return "觸發條件："
        if tag=="actresponse": return "反應："
        if tag=="hityourspellattack": return "法術攻擊命中："
        if len(parts)>=3 and parts[2]: return parts[2]
        return first
    old=None
    while old!=s:
        old=s; s=TAG.sub(rep,s)
    return re.sub(r"\{@[^{}]*\}","",s)

def zh_text(s,pairs):
    s=strip_5e_tags(s)
    protected=[]
    dice_tokens=sorted(set(re.findall(r"(?:\d+)?d\d+(?:\s*[+-]\s*\d+)?",s,re.I)),key=len,reverse=True)
    for token in dice_tokens:
        protected.append(token)
        s=s.replace(token,f"§{len(protected)-1}§")
    s=cc.convert(s)
    # XMM/XDMG 2024 action term; leave the pinned upstream source unchanged.
    s=s.replace("疾走", "疾行")
    replacements={
        "DC":"難度","AC":"護甲等級","HP":"生命值","PB":"熟練加值","XP":"經驗值",
        " GP":" 金幣"," SP":" 銀幣"," CP":" 銅幣"," gp":" 金幣"," sp":" 銀幣"," cp":" 銅幣","DM":"地城主","NPC":"非玩家角色","summonSpellLevel":"召喚法術環位","環階":"環位",
        "（Auran）":"","(Auran)":"","（Terran）":"","(Terran)":"",
        "（Ignan）":"","(Ignan)":"","（Aquan）":"","(Aquan)":"",
    }
    for a,b in replacements.items(): s=s.replace(a,b)
    s=re.sub(r"(?<![A-Za-z])(?:GP|SP|CP)(?![A-Za-z])",lambda m:{"gp":"金幣","sp":"銀幣","cp":"銅幣"}[m.group(0).lower()],s,flags=re.I)
    for fix in CORRECTIONS.get("contextFixes",[]): s=s.replace(fix["from"],fix["to"])
    # Replace known bilingual inline English terms with their Chinese pair.
    for en,zh in sorted(pairs.items(),key=lambda kv:len(kv[0]),reverse=True):
        if en and en in s:
            s=s.replace(zh+en,zh).replace(zh+" "+en,zh).replace(en,zh)
    # Restore protected dice and formulas after removing Latin prose.
    s=re.sub(r"[A-Za-z][A-Za-z0-9'’._-]*(?:\s+[A-Za-z][A-Za-z0-9'’._-]*)*","",s)
    for i,v in enumerate(protected): s=s.replace(f"§{i}§",v)
    s=re.sub(r"[ \t]+"," ",s)
    s=re.sub(r"\s+([，。；：！？、）])",r"\1",s)
    return s.strip()

def flat(v,pairs):
    out=[]
    if v is None: return out
    if isinstance(v,str):
        t=zh_text(v,pairs)
        if t: out.append(t)
    elif isinstance(v,(int,float)):
        out.append(str(v))
    elif isinstance(v,list):
        for x in v: out.extend(flat(x,pairs))
    elif isinstance(v,dict):
        if v.get("name"):
            n=zh_text(v["name"],pairs)
            if n: out.append(n+"：")
        if v.get("type")=="table":
            cap=zh_text(v.get("caption",""),pairs)
            if cap: out.append(cap+"：")
            labs=[zh_text(x,pairs) for x in v.get("colLabels",[])]
            if any(labs): out.append("｜".join(labs))
            for row in v.get("rows",[]):
                if isinstance(row,list):
                    cells=[]
                    for c in row:
                        cells.append(zh_text(c,pairs) if isinstance(c,str) else " ".join(flat(c,pairs)))
                    out.append("｜".join(cells))
            return out
        for k in ("entries","entry","items","headerEntries","footerEntries"):
            if k in v: out.extend(flat(v[k],pairs))
    return [x for x in out if x]

def sections(v,pairs):
    lines=flat(v,pairs); out=[]; cur={"h":"","t":[]}
    for line in lines:
        if line.endswith("：") and len(line)<=100:
            if cur["h"] or cur["t"]: out.append({"h":cur["h"],"t":" ".join(cur["t"]).strip()})
            cur={"h":line[:-1],"t":[]}
        else:
            cur["t"].append(line)
    if cur["h"] or cur["t"]: out.append({"h":cur["h"],"t":" ".join(cur["t"]).strip()})
    return [x for x in out if x["h"] or x["t"]]

def simple(v,pairs):
    if v is None: return ""
    if isinstance(v,str): return zh_text(v,pairs)
    if isinstance(v,list):
        vals=[]
        for x in v:
            if isinstance(x,str): vals.append(zh_text(x,pairs))
            else: vals.extend(flat(x,pairs))
        return "、".join(x for x in vals if x)
    return "、".join(flat(v,pairs)) if isinstance(v,dict) else zh_text(v,pairs)

def ac_display(v,pairs):
    vals=v if isinstance(v,list) else [v]
    out=[]
    for x in vals:
        if isinstance(x,(int,float)):
            out.append(str(x)); continue
        if not isinstance(x,dict): continue
        if x.get("special"):
            out.append(zh_text(x["special"],pairs)); continue
        base=str(x.get("ac","")).strip()
        detail=[]
        for f in x.get("from",[]) or []:
            z=zh_text(f,pairs)
            if z: detail.append(z)
        cond=zh_text(x.get("condition",""),pairs)
        if cond: detail.append(cond)
        out.append(base+("（"+"、".join(detail)+"）" if detail else ""))
    return "；".join(x for x in out if x)

def hp_display(v,pairs):
    if not isinstance(v,dict): return zh_text(v,pairs)
    if v.get("special"): return zh_text(v["special"],pairs)
    avg=v.get("average"); formula=v.get("formula","")
    if avg is None: return zh_text(formula,pairs)
    return str(avg)+("（"+zh_text(formula,pairs)+"）" if formula else "")

ITEM_REF=re.compile(r"^\{#itemEntry\s+([^|{}]+)\|([^{}]+)\}$")
ITEM_VAR=re.compile(r"\{\{([^{}]+)\}\}")
def expand_item_entries(v,item,ix):
    if isinstance(v,str):
        m=ITEM_REF.fullmatch(v.strip())
        if not m: return v
        template=ix.get((m.group(1),m.group(2)))
        if not template: raise ValueError("Unknown itemEntry reference: "+v)
        def replace_var(m):
            expr=m.group(1).strip()
            if expr.startswith("getFullImmRes "): expr=expr[len("getFullImmRes "):]
            if not expr.startswith("item."): raise ValueError("Unknown itemEntry variable: "+expr)
            val=item.get(expr[5:],"")
            if isinstance(val,list): return "、".join(str(x) for x in val)
            return str(val)
        return [ITEM_VAR.sub(replace_var,entry) if isinstance(entry,str) else entry for entry in template.get("entriesTemplate",[])]
    if isinstance(v,list):
        out=[]
        for x in v:
            z=expand_item_entries(x,item,ix)
            if isinstance(x,str) and ITEM_REF.fullmatch(x.strip()): out.extend(z)
            else: out.append(z)
        return out
    if isinstance(v,dict):
        return {k:expand_item_entries(x,item,ix) if k in ("entries","entry","items","headerEntries","footerEntries") else x for k,x in v.items()}
    return v

items=load_js(REPO/"assets/data/magic-items-5r.js")
creatures=load_js(REPO/"assets/data/creatures-5r.js")
cn_items=json.loads((DATA/"items.json").read_text(encoding="utf-8"))["item"]
item_entries=json.loads((DATA/"items-base.json").read_text(encoding="utf-8"))["itemEntry"]
item_entry_ix={(x.get("name"),x.get("source")):x for x in item_entries}
cn_mon=[]
for fn in ("bestiary-xmm.json","bestiary-xphb.json","bestiary-xdmg.json"):
    cn_mon.extend(json.loads((DATA/"bestiary"/fn).read_text(encoding="utf-8"))["monster"])
cn_spells=json.loads((DATA/"spells"/"spells-xphb.json").read_text(encoding="utf-8"))["spell"]

item_ix={(x.get("ENG_name"),x.get("source")):x for x in cn_items if x.get("ENG_name")}
mon_ix={(x.get("ENG_name"),x.get("source")):x for x in cn_mon if x.get("ENG_name")}
spell_ix={x.get("ENG_name"):cc.convert(x.get("name","")) for x in cn_spells if x.get("ENG_name")}
pairs={}
for src in (cn_items,cn_mon,cn_spells):
    collect_pairs(src,pairs)

item_zh={}
missing=[]
for x in items:
    src=item_ix.get((x["name"],"XDMG"))
    if not src:
        missing.append(("item",x["name"])); continue
    sec=sections(expand_item_entries(src.get("entries",[]),src,item_entry_ix),pairs)
    item_zh[x["id"]]={
        "nameZh":cc.convert(src.get("name","")),
        "attunementTextZh":zh_text(src.get("reqAttune",""),pairs) if isinstance(src.get("reqAttune"),str) else ("需要同調" if src.get("reqAttune") else ""),
        "sectionsZh":sec,
        "bodyZh":" ".join(((z["h"]+"："+z["t"]) if z["h"] else z["t"]) for z in sec).strip(),
    }

creature_zh={}
for x in creatures:
    src=mon_ix.get((x["name"],x["source"]))
    if not src:
        missing.append(("creature",x["name"],x["source"])); continue
    ent={"nameZh":cc.convert(src.get("name","")),"acZh":ac_display(src.get("ac"),pairs),"hpZh":hp_display(src.get("hp"),pairs)}
    for k in ("vulnerable","resist","immune","conditionImmune","senses","languages"):
        ent[k+"Zh"]=simple(src.get(k),pairs)
    for src_k,out_k in (("trait","traitsZh"),("spellcasting","spellcastingZh"),("action","actionsZh"),("bonus","bonusZh"),("reaction","reactionsZh"),("legendary","legendaryZh")):
        ent[out_k]=sections(src.get(src_k,[]),pairs)
    for corr in CORRECTIONS.get("corrections",[]):
        parts=corr.get("id","").split("|")
        if len(parts)!=3 or parts[0]!=x["name"] or parts[1]!=x["source"]: continue
        feature=parts[2]
        for i,tr in enumerate(src.get("trait",[]) or []):
            if tr.get("ENG_name")==feature and i<len(ent["traitsZh"]):
                ent["traitsZh"][i]["t"]=corr["zhTraditional"]
    spell_en=str(x.get("summonedBySpell","")).split("|")[0]
    ent["summonedBySpellZh"]=spell_ix.get(spell_en,"") if spell_en else ""
    ent["summonedByClassZh"]="遊俠" if x.get("summonedByClass") else ""
    ent["spellRefsZh"]=[spell_ix.get(n,n) for n in x.get("spellRefs",[])]
    allsec=[]
    for k in ("traitsZh","spellcastingZh","actionsZh","bonusZh","reactionsZh","legendaryZh"):
        allsec.extend(ent[k])
    ent["bodyZh"]=" ".join(((z["h"]+"："+z["t"]) if z["h"] else z["t"]) for z in allsec).strip()
    creature_zh[x["id"]]=ent

if missing:
    raise SystemExit("Missing exact Chinese mappings: "+repr(missing[:20]))

out=REPO/"assets/data"
license_header="/* Traditional Chinese localized data: tjliqy/5etools-cn cn2.0, CC BY-NC-SA 4.0; OpenCC s2twp conversion. */\n"
(out/"magic-items-5r-zh.js").write_text(license_header+"window.ZIZI_5R_MAGIC_ITEMS_ZH=Object.freeze("+json.dumps(item_zh,ensure_ascii=False,separators=(",",":"))+");\n",encoding="utf-8")
(out/"creatures-5r-zh.js").write_text(license_header+"window.ZIZI_5R_CREATURES_ZH=Object.freeze("+json.dumps(creature_zh,ensure_ascii=False,separators=(",",":"))+");\n",encoding="utf-8")
meta={"source":"tjliqy/5etools-cn","sourceUrl":"https://github.com/tjliqy/5etools-cn","branch":"cn2.0","commit":CN_COMMIT,"license":"CC BY-NC-SA 4.0","items":len(item_zh),"creatures":len(creature_zh),"conversion":"OpenCC s2twp","canonicalEnglishUnchanged":True}
(out/"player-reference-zh-meta.js").write_text("window.ZIZI_5R_PLAYER_REFERENCE_ZH_META=Object.freeze("+json.dumps(meta,ensure_ascii=False,separators=(",",":"))+");\n",encoding="utf-8")
print(json.dumps(meta,ensure_ascii=False,indent=2))
