import json,re
from pathlib import Path
src=json.loads(Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-live\items-base.json").read_text(encoding="utf-8-sig"))
rt=json.loads(Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\runtime-weapons.json").read_text(encoding="utf-8"))
rows=rt["weapons"]; prices=rt["prices"]
name_map={
"Club":"棍棒","Dagger":"匕首","Greatclub":"巨棒","Handaxe":"手斧","Javelin":"標槍","Light Hammer":"輕錘","Mace":"釘頭錘","Quarterstaff":"木杖","Sickle":"鐮刀","Spear":"矛","Dart":"飛鏢","Light Crossbow":"輕弩","Shortbow":"短弓","Sling":"投石索",
"Battleaxe":"戰斧","Flail":"連枷","Glaive":"長柄斧","Greataxe":"巨斧","Greatsword":"巨劍","Halberd":"戟","Lance":"騎槍","Longsword":"長劍","Maul":"巨錘","Morningstar":"晨星","Pike":"長槍","Rapier":"刺劍","Scimitar":"彎刀","Shortsword":"短劍","Trident":"三叉戟","Warpick":"戰鎬","Warhammer":"戰錘","Whip":"鞭","Blowgun":"吹箭筒","Hand Crossbow":"手弩","Heavy Crossbow":"重弩","Longbow":"長弓","Musket":"火槍","Pistol":"手槍"
}
dmg={"B":"鈍擊","P":"穿刺","S":"揮砍"}
mast={"Cleave":"順勢","Graze":"掠傷","Nick":"迅捷","Push":"推撞","Sap":"削弱","Slow":"減速","Topple":"撂倒","Vex":"破綻"}
def mastery(x):
 for e in x.get("entries",[]) or []:
  n=e.get("name","") if isinstance(e,dict) else ""
  m=re.search(r"([A-Za-z]+)\s*$",n)
  if m and m.group(1) in mast:return mast[m.group(1)]
 return None
def props(x):
 out=[]
 for p in x.get("property") or []:
  if p=="F": out.append("靈巧")
  elif p=="L": out.append("輕型")
  elif p=="T": out.append(f"投擲({x.get('range')})")
  elif p=="V": out.append(f"多用({x.get('dmg2')})")
  elif p=="A": out.append(f"彈藥({x.get('range')})")
  elif p=="LD": out.append("裝填")
  elif p=="2H": out.append("雙手")
  elif p=="H": out.append("重型")
  elif p=="R": out.append("長武器")
  else: out.append("<?>"+p)
 return sorted(out)
source=[x for x in src["baseitem"] if x.get("source")=="PHB2024" and x.get("ENG_name") in name_map]
by_site={r[1]:r for r in rows}
fails=[]
report=[]
for x in source:
 n=name_map[x["ENG_name"]]; got=by_site.get(n)
 if not got:
  fails.append((n,"missing",None,x["ENG_name"]));continue
 expected_cat=("簡易" if x.get("weaponCategory")=="simple" else "軍用")+("近戰" if x.get("type")=="M" else "遠端")
 expected_dmg=f"{x.get('dmg1')} {dmg[x.get('dmgType')]}"
 gotprops=[] if got[3]=="—" else sorted(got[3].split("、"))
 exp={
  "category":expected_cat,"damage":expected_dmg,"properties":props(x),
  "mastery":mastery(x),"price":x.get("value")
 }
 act={"category":got[0],"damage":got[2],"properties":gotprops,"mastery":got[4],"price":prices.get(n)}
 diff={k:(act[k],exp[k]) for k in exp if act[k]!=exp[k]}
 report.append({"site":n,"eng":x["ENG_name"],"diff":diff})
 if diff:fails.append((n,"diff",diff,x["ENG_name"]))
print(json.dumps({"source":len(source),"runtime":len(rows),"fails":fails,"report":report},ensure_ascii=False,indent=2))
