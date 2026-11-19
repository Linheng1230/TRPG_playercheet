from pathlib import Path
from PIL import Image
import json,hashlib,numpy as np
r=Path(__file__).resolve().parents[1]
base=r/"assets/species-watercolor"
m=json.loads((base/"manifest.json").read_text(encoding="utf8"))
assert m["version"]=="species-watercolor-v1"
assert hashlib.sha256((base/"species-watercolor-master.png").read_bytes()).hexdigest()==m["source_sha256"]
names="human elf dwarf halfling aasimar dragonborn gnome goliath orc tiefling".split()
assert [x["key"] for x in m["species"]]==names
assert len(list(base.glob("*.webp")))==10
for row in m["species"]:
 p=base/(row["key"]+".webp")
 a=np.array(Image.open(p).convert("RGBA").getchannel("A"))
 assert a.shape==(440,440),(row["key"],a.shape)
 assert a[0,0]==a[0,-1]==a[-1,0]==a[-1,-1]==0,row["key"]
 assert np.mean(a==0)>.14,row["key"]
 assert np.mean(a>180)>.13,row["key"]
 assert hashlib.sha256(p.read_bytes()).hexdigest()==row["sha256"],row["key"]
 print("PASS",row["key"],"rgba",Image.open(p).mode,"transparent",round(float(np.mean(a==0))*100,1),"%","bytes",p.stat().st_size)
print("PASS ALL 10 UNIQUE STANDALONE WATERCOLOUR SPECIES")
