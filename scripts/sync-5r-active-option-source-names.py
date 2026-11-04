import json,re
from pathlib import Path
repo=Path(r"D:\Repositories\trpg-playercheet-private")
def parse_obj(path,var):
 s=path.read_text(encoding="utf-8");m=re.search(re.escape(var)+r"=Object\.freeze\((\{.*\})\);",s,re.S)
 if not m: raise RuntimeError(var)
 return s,m,json.loads(m.group(1))
canon_s=(repo/"assets/data/canonical-5r-zh-names.js").read_text(encoding="utf-8")
canon=json.loads(re.search(r"globalThis\.ZIZI_5R_CANONICAL_NAMES=(\{.*\});",canon_s,re.S).group(1))
p=repo/"assets/data/active-options-5r-full-rules.js"
s,m,d=parse_obj(p,"window.ZIZI_5R_ACTIVE_OPTION_RULES")
changed=0
for v in d.values():
 en=v.get("eng"); want=(canon.get("optionalFeatures",{}).get(en) or {}).get("zh")
 if want and v.get("sourceName")!=want:
  v["sourceName"]=want;changed+=1
new=json.dumps(d,ensure_ascii=False,separators=(",",":"))
s=s[:m.start(1)]+new+s[m.end(1):]
p.write_text(s,encoding="utf-8")
print(json.dumps({"changed":changed,"count":len(d)},ensure_ascii=False))
