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
        # Spell rules can include canonical 5RTools table rows, not only prose.
        # Preserve the two-column row meaning, rather than dropping entire tables.
        if isinstance(x.get("rows"),list):
            for row in x["rows"]:
                cells=row.get("row") if isinstance(row,dict) and "row" in row else row
                if isinstance(cells,list):
                    parts=[" ".join(flat(cell)).strip() for cell in cells]
                    out.append("：".join(part for part in parts if part))
                else:
                    out+=flat(cells)
        for k in ("entry","entries","items"):
            if k in x: out+=flat(x[k])
        return out
    return []

def table_row_count(x):
    if isinstance(x,list): return sum(table_row_count(item) for item in x)
    if not isinstance(x,dict): return 0
    rows=x.get("rows")
    own=len(rows) if isinstance(rows,list) else 0
    return own+sum(table_row_count(value) for key,value in x.items() if key!="rows")

def repair_verified_source_typos(identifier,text):
    # Exact, 2024-only repairs validated against the official English mechanics.
    # Fail closed if the pinned 5RTools wording changes; do not silently remap
    # another rule edition or grow a second prose catalog.
    changes={
        "locate-animals-or-plants":(
            "如果5裡記憶體在該類生物或植物",
            "如果5哩範圍內存在該類生物或植物"
        ),
        "animal-messenger":(
            "一段不超過二十五個單次的資訊",
            "一則不超過25個詞的訊息"
        )
    }
    if identifier not in changes: return text
    previous,corrected=changes[identifier]
    if previous in text: return text.replace(previous,corrected,1)
    if corrected in text: return text
    raise ValueError("2024 canonical Chinese source changed; editorial review needed for "+identifier)

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
    # Normalize damage-type names, preserving physical acid and school names.
    t=t.replace("一灘強酸", "一灘__ACID_MATERIAL__").replace("強酸中泡澡", "__ACID_MATERIAL__中泡澡")
    t=t.replace("強酸", "酸蝕").replace("暗蝕", "黯蝕").replace("__ACID_MATERIAL__", "強酸")
    # Normalize 2024 actions; do not rewrite the PHB2014 spell corpus.
    t=t.replace("疾走", "疾行").replace("操作動作", "使用物件動作")
    return t

def ident(eng):
    out=re.sub(r"[^a-z0-9]+","-",eng.lower().replace("'","").replace("’","")).strip("-")
    return {"branding-smite":"shining-smite","lightning-arrows":"lightning-arrow","jailarzis-storm-of-radiance":"jailarzs-storm-of-radiance","antipathysympathy":"antipathy-sympathy"}.get(out,out)

data=json.loads(SRC.read_text(encoding="utf-8-sig"))
rules={}
for sp in data["spell"]:
    key=ident(sp.get("ENG_name",""))
    entries=sp.get("entries",[])
    if key=="augury" and table_row_count(entries)<4:
        raise ValueError("Augury has no complete four-option Omens table in pinned PHB2024 source")
    rules[key]=repair_verified_source_typos(key,clean(" ".join(flat(entries))))

js="/* Single canonical spell text generated from fixed 5RTools PHB2024 snapshot; Traditional Chinese via OpenCC. */\n"
js+="globalThis.SPELLS_2024_FULL_RULES="+json.dumps(rules,ensure_ascii=False,separators=(",",":"))+";\n"
OUT.write_text(js,encoding="utf-8")
print(json.dumps({"rules":len(rules),"output":str(OUT)},ensure_ascii=False))
