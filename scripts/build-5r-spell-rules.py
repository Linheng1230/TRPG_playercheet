import json,re,html,hashlib,sys
from pathlib import Path
from opencc import OpenCC

ROOT=Path(__file__).resolve().parents[1]
SRC=Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-2024\data__spells__spells-phb2024.json")
PINNED_SHA256="9a45afaea0ad571011fb80b7af80c17a2aa1d321d39c4cb96dbf2d73f43ad0ea"
OUT=ROOT/"assets"/"data"/"spell-rules-2024.js"
cc=OpenCC("s2twp")

def flat(x,include_tables=True):
    if isinstance(x,str): return [x]
    if isinstance(x,list):
        out=[]
        for i in x: out+=flat(i,include_tables)
        return out
    if isinstance(x,dict):
        out=[]
        if x.get("name"): out.append(str(x["name"])+"：")
        # For this scoped PR, preserve the Augury omens rows.
        # Other table-bearing spells require separate semantic review, not
        # silent broad changes to existing full-rule projections.
        if include_tables and isinstance(x.get("rows"),list):
            for row in x["rows"]:
                cells=row.get("row") if isinstance(row,dict) and "row" in row else row
                if isinstance(cells,list):
                    parts=[" ".join(flat(cell,include_tables)).strip() for cell in cells]
                    out.append("：".join(part for part in parts if part))
                else:
                    out+=flat(cells,include_tables)
        for k in ("entry","entries","items"):
            if k in x: out+=flat(x[k],include_tables)
        return out
    return []

def table_row_count(x):
    if isinstance(x,list): return sum(table_row_count(item) for item in x)
    if not isinstance(x,dict): return 0
    rows=x.get("rows")
    own=len(rows) if isinstance(rows,list) else 0
    return own+sum(table_row_count(value) for key,value in x.items() if key!="rows")

def repair_verified_source_typos(identifier,text):
    if identifier=="augury":
        original=' \u5409\uff1a\u597d\u7684\u7d50\u679c\u3002 \u5147\uff1a\u58de\u7684\u7d50\u679c\u3002 \u5409\u51f6\u4e26\u5b58\uff1a\u7d50\u679c\u65e2\u6709\u597d\u7684\u65b9\u9762\uff0c\u4e5f\u6709\u58de\u7684\u65b9\u9762\u3002 \u7121\uff1a\u7d50\u679c\u4e26\u7121\u660e\u986f\u7684\u597d\u58de\u5206\u5225'
        localized='\u5409\u5146\uff08\u597d\u7d50\u679c\uff09\u3001\u51f6\u5146\uff08\u58de\u7d50\u679c\uff09\u3001\u5409\u51f6\u53c3\u534a\uff08\u597d\u58de\u517c\u6709\uff09\u3001\u7121\u5409\u7121\u51f6\uff08\u65e2\u4e0d\u597d\u4e5f\u4e0d\u58de\uff09'
        if original not in text: raise ValueError("Augury pinned source table changed")
        return text.replace(original,localized,1)
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
    t=re.sub(r"\u5c3a(?!\u5bf8)","\u544e",t)
    return t

def ident(eng):
    out=re.sub(r"[^a-z0-9]+","-",eng.lower().replace("'","").replace("’","")).strip("-")
    return {"branding-smite":"shining-smite","lightning-arrows":"lightning-arrow","jailarzis-storm-of-radiance":"jailarzs-storm-of-radiance","antipathysympathy":"antipathy-sympathy"}.get(out,out)

source_bytes=SRC.read_bytes()
source_sha256=hashlib.sha256(source_bytes).hexdigest()
if source_sha256!=PINNED_SHA256:
    raise ValueError("Pinned PHB2024 source SHA changed; independent review required")
data=json.loads(source_bytes.decode("utf-8-sig"))
rules={}
for sp in data["spell"]:
    key=ident(sp.get("ENG_name",""))
    entries=sp.get("entries",[])
    if key=="augury" and table_row_count(entries)<4:
        raise ValueError("Augury has no complete four-option Omens table in pinned PHB2024 source")
    rules[key]=repair_verified_source_typos(key,clean(" ".join(flat(entries,key=="augury"))))

if len(rules)!=391: raise ValueError("Unexpected PHB2024 spell count")

js="/* Single canonical spell text generated from fixed 5RTools PHB2024 snapshot; Traditional Chinese via OpenCC. */\n"
js+="globalThis.SPELLS_2024_FULL_RULES="+json.dumps(rules,ensure_ascii=False,separators=(",",":"))+";\n"
payload=js.encode("utf-8")
if len(sys.argv)>2 or any(arg!="--check" for arg in sys.argv[1:]):
    raise ValueError("Usage: build-5r-spell-rules.py [--check]")
if "--check" in sys.argv[1:]:
    if not OUT.is_file() or OUT.read_bytes().replace(b"\r\n",b"\n")!=payload:
        actual_hash=hashlib.sha256(OUT.read_bytes()).hexdigest() if OUT.is_file() else None
        raise ValueError("Pinned-source projection parity mismatch: actual="+str(actual_hash)+" rebuilt="+hashlib.sha256(payload).hexdigest())
else:
    OUT.write_bytes(payload)
print(json.dumps({"rules":len(rules),"output":str(OUT),"check_only":"--check" in sys.argv[1:],"source_sha256":source_sha256,"output_sha256":hashlib.sha256(payload).hexdigest()},ensure_ascii=True))
