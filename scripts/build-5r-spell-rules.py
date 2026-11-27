import json,re,html,hashlib,sys
from pathlib import Path
from opencc import OpenCC

ROOT=Path(__file__).resolve().parents[1]
SRC=Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-2024\data__spells__spells-phb2024.json")
PINNED_SHA256="9a45afaea0ad571011fb80b7af80c17a2aa1d321d39c4cb96dbf2d73f43ad0ea"
# Source-verified PHB2024 tables already shipped in the canonical corpus.
# Gate the exact pinned table shape; never invent rule rows or expand to other spells.
VERIFIED_TABLE_ROWS={
    "augury":4,"confusion":4,"control-weather":16,"creation":5,
    "divine-word":4,"prismatic-spray":8,"prismatic-wall":7,
    "reincarnate":5,"scrying":6,"teleport":6,
}
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
            # Preserve explicit table captions and each row's mechanical meaning.
            if x.get("caption") and x.get("caption")!="\u9884\u5146":out.append(chr(0x3010)+str(x["caption"])+chr(0x3011))
            labels=x.get("colLabels") or []
            for row in x["rows"]:
                cells=row.get("row") if isinstance(row,dict) and "row" in row else row
                if isinstance(cells,list):
                    parts=[" ".join(flat(cell,include_tables)).strip() for cell in cells]
                    if x.get("caption")=="\u9884\u5146":out.append(chr(0xff1a).join(part for part in parts if part))
                    elif len(parts)==4 and len(labels)==4:
                        out.append(parts[0]+chr(0xff1a)+parts[1]+chr(0xff1b)+parts[2]+chr(0xff1a)+parts[3])
                    elif len(parts)==5 and len(labels)==5:
                        out.append(chr(0xff1b).join(str(label)+chr(0xff1a)+part for label,part in zip(labels,parts)))
                    else:out.append(chr(0xff1a).join(part for part in parts if part))
                else:out+=flat(cells,include_tables)
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

# Exact 2024 source-only repairs for already verified live canonical mechanics:
# Prismatic Wall >= 25 Cold / >=60 Force / >=25 Fire;
# Reincarnate new body (2024, not 2014 new adult body);
# Scrying firsthand means met the target; Teleport 2d12 miles.
# Every replacement carries source context and must occur once or fail closed.
VERIFIED_POST66_REPAIRS={
    "cloud-of-daggers": [('\u4f60\u6307\u5b9a\u65bd\u6cd5\u8ddd\u96e2\u5167\u4e00\u9ede\uff0c\u5728\u4ee5\u8a72\u9ede\u70ba\u4e2d\u5fc3\u76845\u544e\u7acb\u65b9\u5340\u57df\u5167\u5492\u559a\u51fa\u65cb\u8f49\u7684\u5315\u9996\u3002\u5340\u57df\u5167\u7684\u6bcf\u540d\u751f\u7269\u53d7\u52304d4\u9ede\u63ee\u780d\u50b7\u5bb3\u3002\u6bcf\u7576\u7acb\u65b9\u5340\u57df\u79fb\u52d5\u5230\u4e00\u540d\u751f\u7269\u5340\u57df\u5167\u6642\u3001\u4e00\u540d\u751f\u7269\u9032\u5165\u7acb\u65b9\u5340\u57df\u6216\u662f\u5728\u8a72\u5340\u57df\u7d50\u675f\u5176\u56de\u5408\u6642\uff0c\u8a72\u751f\u7269\u540c\u6a23\u6703\u53d7\u5230\u6b64\u50b7\u5bb3\u3002\u4e00\u540d\u751f\u7269\u4e00\u56de\u95a4\u4e2d\u53ea\u6703\u53d7\u5230\u4e00\u6b21\u8a72\u50b7\u5bb3\u3002 \u5728\u4f60\u5f8c\u7e8c\u7684\u56de\u5408\u4e2d\uff0c\u4f60\u80fd\u5920\u4ee5\u4e00\u500b\u9b54\u6cd5\u52d5\u4f5c\u5c07\u7acb\u65b9\u5340\u57df\u50b3\u9001\u81f3\u591a30\u544e\u3002 \u5347\u74b0\u65bd\u6cd5\uff1a\u4f7f\u7528\u7684\u6cd5\u8853\u4f4d\u6bcf\u6bd4\u4e8c\u74b0\u9ad8\u4e00\u74b0\uff0c\u6b64\u6cd5\u8853\u7684\u50b7\u5bb3\u5c31\u589e\u52a02d4\u3002', '\u4f60\u5728\u65bd\u6cd5\u8ddd\u96e2\u5167\u9078\u64c7\u4e00\u9ede\uff0c\u53ec\u559a\u65cb\u8f49\u7684\u5315\u9996\uff0c\u5f62\u6210\u4ee5\u8a72\u9ede\u70ba\u4e2d\u5fc3\u3001\u908a\u95775\u544e\u7684\u7acb\u65b9\u5340\u57df\u3002\u65bd\u6cd5\u6642\uff0c\u5340\u57df\u5167\u7684\u6bcf\u540d\u751f\u7269\u90fd\u53d7\u52304d4\u9ede\u63ee\u780d\u50b7\u5bb3\u3002\u7576\u751f\u7269\u9032\u5165\u8a72\u5340\u57df\u3001\u5728\u8a72\u5340\u57df\u5167\u7d50\u675f\u5176\u56de\u5408\uff0c\u6216\u8a72\u5340\u57df\u79fb\u5165\u751f\u7269\u6240\u5360\u64da\u7684\u7a7a\u9593\u6642\uff0c\u8a72\u751f\u7269\u4e5f\u6703\u53d7\u5230\u76f8\u540c\u50b7\u5bb3\u3002\u6bcf\u540d\u751f\u7269\u6bcf\u56de\u5408\u6700\u591a\u53d7\u5230\u4e00\u6b21\u6b64\u6cd5\u8853\u7684\u50b7\u5bb3\u3002 \u5728\u4f60\u5f8c\u7e8c\u7684\u56de\u5408\u4e2d\uff0c\u4f60\u53ef\u4ee5\u4f7f\u7528\u4e00\u500b\u9b54\u6cd5\u52d5\u4f5c\u5c07\u8a72\u7acb\u65b9\u5340\u57df\u50b3\u9001\u81f3\u591a30\u544e\u3002 \u5347\u74b0\u65bd\u6cd5\uff1a\u4f7f\u7528\u7684\u6cd5\u8853\u4f4d\u6bcf\u9ad8\u65bc2\u74b0\u4e00\u74b0\uff0c\u50b7\u5bb3\u4fbf\u589e\u52a02d4\u3002')],
    'find-steed': [('命中：1d8+法術環階點光耀（天族）、心靈（妖精）、黯蝕（邪魔）傷害。', '傷害：1d8+法術環階點光耀（天族）、心靈（妖精）、黯蝕（邪魔）傷害。')],
    'summon-fey': [('命中：2d6+3+法術環階的力場傷害。', '傷害：2d6+3+法術環階的力場傷害。')],
    'summon-undead': [('命中：1d8+3+法術環階的黯蝕傷害，且目標陷入恐慌}狀態直至其下一回合結束。', '傷害：1d8+3+法術環階的黯蝕傷害。命中後，目標陷入恐慌狀態直至其下一回合結束。'), ('命中：2d4+3+法術環階的黯蝕傷害。', '傷害：2d4+3+法術環階的黯蝕傷害。'), ('命中：1d6+3+法術環階的揮砍傷害。', '傷害：1d6+3+法術環階的揮砍傷害。')],
    'giant-insect': [('命中：1d6+3+法術環階點穿刺傷害+1d4點毒素傷害。', '傷害：1d6+3+法術環階點穿刺傷害+1d4點毒素傷害。'), ('命中：1d10+3+法術環階點鈍擊傷害，且目標的速度降為0直至巨蟲的下個回合開始。', '傷害：1d10+3+法術環階點鈍擊傷害。命中後，目標的速度降為0直至巨蟲的下個回合開始。')],
    'summon-aberration': [('命中：1d10+3+法術環階的揮砍傷害，目標無法恢復生命值直至靈魄的下一回合開始。', '傷害：1d10+3+法術環階的揮砍傷害。命中後，目標無法恢復生命值直至靈魄的下一回合開始。'), ('0呎。命中：1d8+3+法術環階的心靈傷害。', '0呎。傷害：1d8+3+法術環階的心靈傷害。'), ('5呎。命中：1d8+3+法術環階的心靈傷害。', '5呎。傷害：1d8+3+法術環階的心靈傷害。')],
    'summon-construct': [('命中：1d8+4+法術環階的鈍擊傷害。', '傷害：1d8+4+法術環階的鈍擊傷害。')],
    'summon-elemental': [('命中：1d10+4+法術環階的鈍擊（僅土）、寒冷（僅水）、閃電（僅氣）、火焰（僅火）傷害。', '傷害：1d10+4+法術環階的鈍擊（僅土）、寒冷（僅水）、閃電（僅氣）、火焰（僅火）傷害。')],
    'animate-objects': [('命中：1d4+3（中型）、2d6+3+你的施法調整值（大型）或2d12+3+你的施法調整值（巨型）的力場傷害。', '傷害：1d4+3（中型或更小）、2d6+3+你的施法調整值（大型）或2d12+3+你的施法調整值（巨型）的力場傷害。')],
    'summon-celestial': [('命中：2d6+2+法術環階的光耀傷害。', '傷害：2d6+2+法術環階的光耀傷害。'), ('命中：1d10+3+法術環階的光耀傷害，且靈魄可選擇自己或其10呎內可見的另一生物，令其獲得1d10臨時生命值。', '傷害：1d10+3+法術環階的光耀傷害。命中後，靈魄可選擇自己或攻擊目標10呎內可見的另一生物，令其獲得1d10臨時生命值。')],
    'summon-dragon': [('命中：1d6+4+法術環階的穿刺傷害。', '傷害：1d6+4+法術環階的穿刺傷害。')],
    'summon-fiend': [('命中：1d12+3+法術環階的黯蝕傷害。', '傷害：1d12+3+法術環階的黯蝕傷害。'), ('命中：1d8+3+法術環階的揮砍傷害。', '傷害：1d8+3+法術環階的揮砍傷害。'), ('命中：2d6+3+法術環階的火焰傷害。', '傷害：2d6+3+法術環階的火焰傷害。')],

    'summon-beast': [['命中：1d8+4+法術環階的揮砍傷害。', '傷害：1d8+4+法術環階的穿刺傷害。'], ['它遵從於你的口頭指令（無需任何動作）。如果你不發令，它將執行迴避動作並遠離危險。', '你可以口頭命令靈魄行動（無需消耗你的動作或附贈動作）。若未下達命令，靈魄會執行迴避動作並遠離危險。'], ['智力 5（-3）', '智力 4（-3）']],

    'prismatic-wall': [
        ('\u64ca\u7121\u6cd5\u7a7f\u904e\u6b64\u5c64\uff0c\u6b64\u5c64\u53d7\u5230\u7d2f\u8a0825\u9ede\u5bd2\u51b7\u50b7\u5bb3\u5f8c\u88ab\u6467\u6bc0\u3002 \u6a59\uff1a\u8c41', '\u64ca\u7121\u6cd5\u7a7f\u904e\u6b64\u5c64\uff0c\u6b64\u5c64\u53d7\u5230\u81f3\u5c1125\u9ede\u5bd2\u51b7\u50b7\u5bb3\u5f8c\u88ab\u6467\u6bc0\u3002 \u6a59\uff1a\u8c41'),
        ('\u534a\u50b7\u3002\u984d\u5916\u6548\u61c9\uff1a\u6b64\u5c64\u53d7\u5230\u7d2f\u8a0860\u9ede\u529b\u5834\u50b7\u5bb3\u5f8c\u88ab\u6467\u6bc0\u3002 \u7da0\uff1a\u8c41', '\u534a\u50b7\u3002\u984d\u5916\u6548\u61c9\uff1a\u6b64\u5c64\u53d7\u5230\u81f3\u5c1160\u9ede\u529b\u5834\u50b7\u5bb3\u5f8c\u88ab\u6467\u6bc0\u3002 \u7da0\uff1a\u8c41'),
        ('\u534a\u50b7\u3002\u984d\u5916\u6548\u61c9\uff1a\u6b64\u5c64\u53d7\u523025\u9ede\u706b\u7130\u50b7\u5bb3\u5f8c\u88ab\u6467\u6bc0\u3002 \u975b\uff1a\u8c41', '\u534a\u50b7\u3002\u984d\u5916\u6548\u61c9\uff1a\u6b64\u5c64\u53d7\u5230\u81f3\u5c1125\u9ede\u706b\u7130\u50b7\u5bb3\u5f8c\u88ab\u6467\u6bc0\u3002 \u975b\uff1a\u8c41'),
    ],
    'reincarnate': [
        ('\uff0c\u5247\u6cd5\u8853\u6703\u5275\u9020\u51fa\u4e00\u5177\u65b0\u7684\u6210\u5e74\u8eab\u9ad4\uff0c\u4e26\u547c\u559a\u8a72\u751f\u7269\u7684\u9748\u9b42\u9032\u5165\u6b64\u65b0', '\uff0c\u5247\u6cd5\u8853\u6703\u5275\u9020\u51fa\u4e00\u5177\u65b0\u7684\u8eab\u9ad4\uff0c\u4e26\u547c\u559a\u8a72\u751f\u7269\u7684\u9748\u9b42\u9032\u5165\u6b64\u65b0'),
    ],
    'scrying': [
        ('\uff09\uff1a+5 \u76f4\u63a5\u8cc7\u8a0a\uff08\u4f60\u66fe\u7d93\u898b\u904e\u76ee\u6a19\uff09\uff1a+0 \u719f\u6089\uff08\u4f60\u5c0d\u76ee\u6a19\u5f88\u77ad\u89e3\uff09', '\uff09\uff1a+5 \u76f4\u63a5\u8cc7\u8a0a\uff08\u4f60\u66fe\u8207\u76ee\u6a19\u898b\u9762\uff09\uff1a+0 \u719f\u6089\uff08\u4f60\u5c0d\u76ee\u6a19\u5f88\u77ad\u89e3\uff09'),
    ],
    'teleport': [
        ('\u76ee\u7684\u5730\u96a8\u6a5f\u65b9\u5411\u4e0a2d12\u88e1\u8ddd\u96e2\u7684\u4e00\u9ede\u3002\u9ab01d8\u4f86\u5224\u8aa4\u5dee\u51fa\u73fe', '\u76ee\u7684\u5730\u96a8\u6a5f\u65b9\u5411\u4e0a2d12\u54e9\u8ddd\u96e2\u7684\u4e00\u9ede\u3002\u9ab01d8\u4f86\u5224\u8aa4\u5dee\u51fa\u73fe'),
    ],
}
def apply_verified_post66_repair(identifier,text):
    for previous,corrected in VERIFIED_POST66_REPAIRS.get(identifier,[]):
        if text.count(previous)==1:
            text=text.replace(previous,corrected,1)
        elif text.count(corrected)!=1:
            raise ValueError("Pinned 2024 source drift: "+identifier)
    return text
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
        "control-weather":(
            "距你5裡內的天氣","距你5哩內的天氣"
        ),
        "divine-word":(
            "若其生命值低於50","若其生命值為50或以下"
        ),
        "locate-animals-or-plants":(
            "如果5裡記憶體在該類生物或植物",
            "如果5哩範圍內存在該類生物或植物"
        ),
        "animal-messenger":(
            "一段不超過二十五個單次的資訊",
            "一則不超過25個詞的訊息"
        )
    }
    if identifier not in changes: return apply_verified_post66_repair(identifier,text)
    previous,corrected=changes[identifier]
    if previous in text:
        text=text.replace(previous,corrected,1)
    elif corrected not in text:
        raise ValueError("2024 canonical Chinese source changed; editorial review needed for "+identifier)
    if identifier=="animal-messenger":
        # Existing live 2024 rule: flying 50 miles / walking 25 miles.
        # Chinese 裡 is not the Taiwan mileage unit 哩 in this projection.
        for old,new in (("50裡","50哩"),("25裡","25哩")):
            if text.count(old)==1: text=text.replace(old,new,1)
            elif text.count(new)!=1:
                raise ValueError("Animal Messenger mileage source changed; editorial review needed")
    return apply_verified_post66_repair(identifier,text)

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
    required_rows=VERIFIED_TABLE_ROWS.get(key)
    if required_rows is not None and table_row_count(entries)!=required_rows:
        raise ValueError("Verified PHB2024 rule table changed for "+key)
    rules[key]=repair_verified_source_typos(key,clean(" ".join(flat(entries,key in VERIFIED_TABLE_ROWS))))

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
