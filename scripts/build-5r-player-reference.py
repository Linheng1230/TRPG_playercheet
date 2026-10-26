
from pathlib import Path
import json,re,math,subprocess,os

REPO=Path(__file__).resolve().parents[1]
QA=Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa")
UP=Path(os.environ.get("FIVETOOLS_SRC", str(QA/"5etools-v2.37.0")))
COMMIT="8c026b807fac21862a309379a0c3228a0683198b"
VERSION="v2.37.0"

def strip_tags(s):
    s=str(s or "").replace("{@h}","Hit: ").replace("{@m}","Miss: ")
    def repl(m):
        tag=m.group(1).lower(); parts=m.group(2).split("|")
        if tag=="dc": return "DC "+parts[0]
        if tag=="hit": return ("+" if parts and not parts[0].startswith(("+","-")) else "")+(parts[0] if parts else "")
        if tag in {"damage","dice","chance","scaledice","scaledamage"}: return parts[0] if parts else ""
        if tag=="recharge": return "Recharge "+(parts[0] if parts and parts[0] else "6")
        return parts[2] if len(parts)>=3 and parts[2] else parts[0] if parts else ""
    prev=None
    while prev!=s:
        prev=s
        s=re.sub(r"\{@([A-Za-z0-9]+)\s+([^{}]+)\}",repl,s)
    s=re.sub(r"\{@[^{}]*\}","",s)
    return re.sub(r"\s+"," ",s).strip()

def flat(v):
    out=[]
    if v is None:return out
    if isinstance(v,str):
        t=strip_tags(v)
        if t:out.append(t)
    elif isinstance(v,(int,float)):out.append(str(v))
    elif isinstance(v,list):
        for x in v:out.extend(flat(x))
    elif isinstance(v,dict):
        if v.get("type")=="table":
            cap=strip_tags(v.get("caption",""))
            if cap:out.append(cap+":")
            labs=[strip_tags(x) for x in v.get("colLabels",[])]
            if labs:out.append(" | ".join(labs))
            for row in v.get("rows",[]):
                if isinstance(row,list):out.append(" | ".join(" ".join(flat(c)) for c in row))
            return out
        name=strip_tags(v.get("name",""))
        if name:out.append(name+":")
        for k in ("entries","entry","items","headerEntries","footerEntries"):
            if k in v:out.extend(flat(v[k]))
    return [x for x in out if x]

def sections(v):
    lines=flat(v); out=[]; h=""; buf=[]
    for line in lines:
        if line.endswith(":") and len(line)<=100:
            if h or buf:out.append({"h":h,"t":" ".join(buf).strip()})
            h=line[:-1];buf=[]
        else:buf.append(line)
    if h or buf:out.append({"h":h,"t":" ".join(buf).strip()})
    return [x for x in out if x["h"] or x["t"]]

def typ(t):
    return t if isinstance(t,str) else str(t.get("type","")) if isinstance(t,dict) else ""

def swarm(t,name):
    return (isinstance(t,dict) and bool(t.get("swarmSize"))) or str(name).lower().startswith("swarm of ")

def crnum(v):
    if isinstance(v,dict):v=v.get("cr")
    if v is None:return None
    try:
        s=str(v)
        if "/" in s:
            a,b=s.split("/",1);return float(a)/float(b)
        return float(s)
    except:return None

def crtext(v):
    if isinstance(v,dict):return str(v.get("cr","—"))
    return str(v if v is not None else "—")

def speed(v):
    if not isinstance(v,dict):return {}
    out={}
    for k,x in v.items():
        if k=="canHover":continue
        if isinstance(x,(int,float)):out[k]=x
        elif isinstance(x,dict) and x.get("number") is not None:out[k]=x["number"]
        elif isinstance(x,str):
            m=re.search(r"\d+",x)
            if m:out[k]=int(m.group())
    return out

def ac(v):
    arr=v if isinstance(v,list) else [v]; out=[]
    for x in arr:
        if isinstance(x,(int,float)):out.append(str(x))
        elif isinstance(x,dict):
            if x.get("special"):out.append(strip_tags(x["special"]));continue
            z=str(x.get("ac",""))
            if x.get("from"):z+=" ("+", ".join(strip_tags(q) for q in x["from"])+")"
            if x.get("condition"):z+=" "+strip_tags(x["condition"])
            if z:out.append(z)
    return "; ".join(out)

def simple(v):
    if v is None:return ""
    if isinstance(v,str):return strip_tags(v)
    if isinstance(v,list):
        a=[]
        for x in v:
            if isinstance(x,str):a.append(strip_tags(x))
            elif isinstance(x,dict):a.append(strip_tags(x.get("note") or x.get("special") or x.get("name") or ""))
        return ", ".join(x for x in a if x)
    return strip_tags(v)

def main():
    head=subprocess.run(["git","rev-parse","HEAD"],cwd=UP,capture_output=True,text=True,check=True).stdout.strip()
    if head!=COMMIT:raise SystemExit(f"upstream pin mismatch {head}")
    items=json.loads((UP/"data/items.json").read_text(encoding="utf-8"))["item"]
    xdmg=[x for x in items if x.get("source")=="XDMG"]
    magic=[]
    for x in xdmg:
        if x.get("rarity") in (None,"none"):continue
        magic.append({
            "id":re.sub(r"[^a-z0-9]+","-",x["name"].lower()).strip("-")+"|xdmg",
            "name":x["name"],"source":"XDMG","page":x.get("page"),
            "type":str(x.get("type","")).split("|")[0] or ("wondrous" if x.get("wondrous") else "item"),
            "rarity":x.get("rarity"),"attunement":bool(x.get("reqAttune")),
            "attunementText":strip_tags(x.get("reqAttune","")) if isinstance(x.get("reqAttune"),str) else "",
            "baseItem":strip_tags(x.get("baseItem","")),"charges":x.get("charges"),
            "bonusAc":x.get("bonusAc"),"bonusWeapon":x.get("bonusWeapon"),
            "bonusSpellAttack":x.get("bonusSpellAttack"),"bonusSpellSaveDc":x.get("bonusSpellSaveDc"),
            "sections":sections(x.get("entries",[]))
        })
    magic.sort(key=lambda z:(z["rarity"],z["name"]))

    mons=[]
    for fn in ("bestiary-xmm.json","bestiary-xphb.json","bestiary-xdmg.json"):
        mons.extend(json.loads((UP/"data/bestiary"/fn).read_text(encoding="utf-8"))["monster"])
    spells=json.loads((UP/"data/spells/spells-xphb.json").read_text(encoding="utf-8"))["spell"]
    refmap={}
    for sp in spells:
        blob=json.dumps(sp.get("entries",[]),ensure_ascii=False)
        for m in re.finditer(r"\{@creature\s+([^}|]+)(?:\|([^}|]+))?(?:\|([^}]+))?\}",blob):
            refmap.setdefault((m.group(1),m.group(2) or "XMM"),[]).append(sp["name"])
    rank={"T":0,"S":1,"M":2,"L":3,"H":4,"G":5}
    creatures=[]
    for x in mons:
        src=x.get("source"); tt=typ(x.get("type")); isbeast=tt=="beast"; isswarm=swarm(x.get("type"),x.get("name",""))
        c=crnum(x.get("cr")); spd=speed(x.get("speed")); fly=bool(spd.get("fly"))
        sizes=x.get("size") or [];sizes=sizes if isinstance(sizes,list) else [sizes]
        wb=None
        if isbeast and not isswarm and c is not None:
            if c<=0.25 and not fly:wb=2
            elif c<=0.5 and not fly:wb=4
            elif c<=1:wb=8
        wm=None
        if isbeast and not isswarm and c is not None:
            wm=max(3,int(math.ceil(c*3-1e-9)))
            if fly:wm=max(8,wm)
            if wm>20:wm=None
        mount=isbeast and not isswarm and any(rank.get(s,-1)>=3 for s in sizes) and bool(spd.get("walk"))
        hp=x.get("hp") if isinstance(x.get("hp"),dict) else {}
        creatures.append({
            "id":re.sub(r"[^a-z0-9]+","-",x["name"].lower()).strip("-")+"|"+src.lower(),
            "name":x["name"],"source":src,"page":x.get("page"),"sizeCodes":sizes,"size":"/".join(sizes),
            "type":tt,"cr":crtext(x.get("cr")),"crValue":c,"ac":ac(x.get("ac")),
            "hp":hp.get("average"),"hpFormula":hp.get("formula",""),"hpSpecial":strip_tags(hp.get("special","")),
            "speed":spd,"str":x.get("str"),"dex":x.get("dex"),"con":x.get("con"),"int":x.get("int"),"wis":x.get("wis"),"cha":x.get("cha"),
            "save":x.get("save") or {},"skill":x.get("skill") or {},
            "vulnerable":simple(x.get("vulnerable")),"resist":simple(x.get("resist")),"immune":simple(x.get("immune")),
            "conditionImmune":simple(x.get("conditionImmune")),"senses":simple(x.get("senses")),"passive":x.get("passive"),
            "languages":simple(x.get("languages")),"familiar":bool(x.get("familiar")),"summonedBySpell":strip_tags(x.get("summonedBySpell","")),
            "summonedByClass":strip_tags(x.get("summonedByClass","")),"spellRefs":refmap.get((x["name"],src),[]),"isBeast":isbeast,"isSwarm":isswarm,"hasFly":fly,
            "wildBaseMin":wb,"wildMoonMin":wm,"mountCandidate":mount,
            "traits":sections(x.get("trait",[])),"spellcasting":sections(x.get("spellcasting",[])),
            "actions":sections(x.get("action",[])),"bonus":sections(x.get("bonus",[])),"reactions":sections(x.get("reaction",[])),"legendary":sections(x.get("legendary",[]))
        })
    creatures.sort(key=lambda z:(z["source"],99 if z["crValue"] is None else z["crValue"],z["name"]))
    meta={"upstream":"5etools-mirror-3/5etools-src","version":VERSION,"commit":COMMIT,
          "rawXDMGItems":len(xdmg),"magicItems":len(magic),
          "creatures":{"XMM":sum(x["source"]=="XMM" for x in creatures),"XPHB":sum(x["source"]=="XPHB" for x in creatures),"XDMG":sum(x["source"]=="XDMG" for x in creatures)},
          "playerCategories":{"summonedBySpell":sum(bool(x["summonedBySpell"]) for x in creatures),"summonedByClass":sum(bool(x["summonedByClass"]) for x in creatures),
                              "familiar":sum(x["familiar"] for x in creatures),"spellRefs":sum(bool(x["spellRefs"]) for x in creatures),
                              "wildBase":sum(x["wildBaseMin"] is not None for x in creatures),"wildMoon":sum(x["wildMoonMin"] is not None for x in creatures),
                              "mountCandidate":sum(x["mountCandidate"] for x in creatures)}}
    d=REPO/"assets/data"
    (d/"magic-items-5r.js").write_text("window.ZIZI_5R_MAGIC_ITEMS=Object.freeze("+json.dumps(magic,ensure_ascii=False,separators=(",",":"))+");\n",encoding="utf-8")
    (d/"creatures-5r.js").write_text("window.ZIZI_5R_CREATURES=Object.freeze("+json.dumps(creatures,ensure_ascii=False,separators=(",",":"))+");\n",encoding="utf-8")
    (d/"player-reference-5r-meta.js").write_text("window.ZIZI_5R_PLAYER_REFERENCE_META=Object.freeze("+json.dumps(meta,ensure_ascii=False,separators=(",",":"))+");\n",encoding="utf-8")
    print(json.dumps(meta,ensure_ascii=False,indent=2))
if __name__=="__main__":main()
