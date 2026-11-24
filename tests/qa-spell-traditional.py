import json,re,sys
from pathlib import Path
from opencc import OpenCC
# Resolve the checkout under test, never a separate dirty local main.
p=Path(__file__).resolve().parents[1] / "assets" / "data" / "spell-rules-2024.js"
text=p.read_text(encoding="utf-8")
m=re.search(r"globalThis\.SPELLS_2024_FULL_RULES=(\{.*?\});\n",text,re.S)
if not m: raise SystemExit("missing SPELLS_2024_FULL_RULES")
rules=json.loads(m.group(1));cc=OpenCC("s2twp");changed=[]
# OpenCC is context-free: it wrongly sees "內存" (memory) across the
# grammatical boundary in "範圍內存在" and changes "無吉無凶" to a
# different but not necessarily more correct form. Protect ONLY these
# exact, source-verified phrases, never the entire spell or common words.
protected={
 "augury":("無吉無凶",),
 "locate-animals-or-plants":("範圍內存在",),
}
for spell,phrases in protected.items():
 if spell not in rules or any(phrase not in rules[spell] for phrase in phrases):
  raise SystemExit("protected context source changed: "+spell)
def mask(key,value):
 for index,phrase in enumerate(protected.get(key,())):
  value=value.replace(phrase,"__TRAD_CONTEXT_"+str(index)+"__")
 return value
# Negative controls: unrelated Simplified Chinese MUST still be detected.
negative=["这个法术","范围内存在"]
if any(cc.convert(mask("augury",value))==mask("augury",value) for value in negative):
 raise SystemExit("traditional QA negative fixture became blind")
for k,v in rules.items():
 candidate=mask(k,v)
 if cc.convert(candidate)!=candidate:changed.append((k,v[:120],cc.convert(v)[:120]))
out={"rules":len(rules),"singleCanonical":("SPELLS_2024_DIGESTS" not in text),"protectedContexts":2,"negativeChecks":len(negative),"changed":len(changed),"preview":changed[:10]}
print(json.dumps(out,ensure_ascii=False,indent=2))
sys.exit(1 if len(rules)!=391 or not out["singleCanonical"] or changed else 0)
