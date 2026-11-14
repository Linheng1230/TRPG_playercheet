"""Build only 2024 cantrip material/save metadata from pinned 5RTools snapshot.
No duplicate rules text; user-facing effects still come from the site's SPELLS database.
"""
import json, pathlib, hashlib, sys
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-2024\data__spells__spells-phb2024.json")
if not source.is_file():
    raise SystemExit("Missing pinned 5RTools source: "+str(source))
raw=source.read_bytes()
source_spells=json.loads(raw.decode("utf-8-sig"))["spell"]
cantrips=[s for s in source_spells if s.get("level")==0]
if len(cantrips)!=34: raise SystemExit("Unexpected source cantrip count: "+str(len(cantrips)))
data={}
for s in cantrips:
    key=s.get("ENG_name","").strip().casefold()
    if not key or key in data: raise SystemExit("Missing/duplicate English cantrip identity: "+key)
    comps=s["components"]
    m=comps.get("m")
    data[key]={"material":m if isinstance(m,(str,dict)) else None,
               "save":s.get("savingThrow") or [],
               "range":s.get("range") or {}}
output=root/"assets"/"data"/"cantrip-tooltip-meta-2024.js"
text="/* Pinned 5RTools PHB2024 structural projection; no full spell prose. SHA256 "+hashlib.sha256(raw).hexdigest()+" */\n"
text+="globalThis.CANTRIP_TOOLTIP_META_2024=Object.freeze("+json.dumps(data,ensure_ascii=False,separators=(",",":"))+");\n"
output.write_text(text,encoding="utf-8")
print("generated",output,"cantrips",len(data),"material",sum(bool(v["material"]) for v in data.values()),"saves",sum(bool(v["save"]) for v in data.values()))
