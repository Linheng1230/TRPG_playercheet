import json,re,sys
from pathlib import Path
from opencc import OpenCC
p=Path(r"D:\Repositories\trpg-playercheet-private\assets\data\spell-rules-2024.js")
text=p.read_text(encoding="utf-8")
m=re.search(r"globalThis\.SPELLS_2024_FULL_RULES=(\{.*?\});\n",text,re.S)
if not m: raise SystemExit("missing SPELLS_2024_FULL_RULES")
rules=json.loads(m.group(1));cc=OpenCC("s2twp");changed=[]
for k,v in rules.items():
 if cc.convert(v)!=v: changed.append((k,v[:120],cc.convert(v)[:120]))
out={"rules":len(rules),"singleCanonical":("SPELLS_2024_DIGESTS" not in text),"changed":len(changed),"preview":changed[:10]}
print(json.dumps(out,ensure_ascii=False,indent=2))
sys.exit(1 if len(rules)!=391 or not out["singleCanonical"] or changed else 0)
