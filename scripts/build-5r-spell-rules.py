import json,re,html
from pathlib import Path
from opencc import OpenCC

ROOT=Path(r"D:\Repositories\trpg-playercheet-private")
SRC=Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-2024\data__spells__spells-phb2024.json")
OUT=ROOT/"assets"/"data"/"spell-rules-2024.js"
cc=OpenCC("s2twp")

def flat(x):
    if isinstance(x,str): return [x]
    if isinstance(x,list):
        out=[]
        for i in x: out+=flat(i)
        return out
    if isinstance(x,dict):
        out=[]
        if x.get("name"): out.append(str(x["name"])+"：")
        for k in ("entry","entries","items"):
            if k in x: out+=flat(x[k])
        return out
    return []

def clean(t):
    t=html.unescape(str(t))
    t=re.sub(r"\{@(?:damage|dice|dc|hit|chance|scaledice|scaledamage) ([^}|]+)(?:\|[^}]*)?\}",r"\1",t)
    t=re.sub(r"\{@[^ }]+ ([^}|]+)(?:\|[^}]*)?\}",r"\1",t)
    t=re.sub(r"<[^>]+>"," ",t)
    t=t.replace("Former自己","自己")
    t=re.sub(r"\s+"," ",t).strip()
    for _ in range(3):
        n=cc.convert(t)
        if n==t: break
        t=n
    return t

def ident(eng):
    out=re.sub(r"[^a-z0-9]+","-",eng.lower().replace("'","").replace("’","")).strip("-")
    return {"branding-smite":"shining-smite","lightning-arrows":"lightning-arrow","jailarzis-storm-of-radiance":"jailarzs-storm-of-radiance","antipathysympathy":"antipathy-sympathy"}.get(out,out)

data=json.loads(SRC.read_text(encoding="utf-8-sig"))
rules={}
for sp in data["spell"]:
    key=ident(sp.get("ENG_name",""))
    rules[key]=clean(" ".join(flat(sp.get("entries",[]))))

js="/* Single canonical spell text generated from fixed 5RTools PHB2024 snapshot; Traditional Chinese via OpenCC. */\n"
js+="globalThis.SPELLS_2024_FULL_RULES="+json.dumps(rules,ensure_ascii=False,separators=(",",":"))+";\n"
OUT.write_text(js,encoding="utf-8")
print(json.dumps({"rules":len(rules),"output":str(OUT)},ensure_ascii=False))
