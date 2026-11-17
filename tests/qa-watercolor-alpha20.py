"""True alpha / geometry / source identity regression for independent watercolor icons."""
from pathlib import Path
import json, hashlib
from PIL import Image
import numpy as np
import cv2
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/"assets/watercolor-icons-alpha"
EVIDENCE=ROOT/"tmp/qa-watercolor-alpha20"
HOME=["creator","sheet","rules","spells","shop","characters","adventures","play"]
CLASSES=["barbarian","bard","cleric","druid","fighter","monk","paladin","ranger","rogue","sorcerer","warlock","wizard"]
EXPECTED=set(HOME+CLASSES)
files={p.stem:p for p in ASSETS.glob("*.png")}
assert set(files)==EXPECTED,{"missing":sorted(EXPECTED-set(files)),"extra":sorted(set(files)-EXPECTED)}
records=[]
for name in HOME+CLASSES:
  p=files[name]
  im=Image.open(p)
  assert im.mode=="RGBA",(name,"not native alpha",im.mode)
  size=(240,144) if name in HOME else (180,116)
  assert im.size==size,(name,"wrong canvas",im.size,size)
  a=np.array(im.getchannel("A"))
  assert a[0,0]==a[0,-1]==a[-1,0]==a[-1,-1]==0,(name,"corners opaque")
  assert np.all(a[:2]==0) and np.all(a[-2:]==0) and np.all(a[:,:2]==0) and np.all(a[:,-2:]==0),(name,"clipped alpha")
  mask=a>12
  assert np.mean(mask)<.72 and np.mean(mask)>.16,(name,"background remnant, or missing artwork",np.mean(mask))
  yy,xx=np.nonzero(mask)
  bbox=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
  assert min(bbox[0],bbox[1],size[0]-bbox[2],size[1]-bbox[3])>=7,(name,"cropped",bbox)
  y,x=np.indices(a.shape)
  tot=a.astype(np.float64).sum()
  cx=float((a*x).sum()/tot);cy=float((a*y).sum()/tot)
  target=(size[0]/2,size[1]/2)
  assert abs(cx-target[0])<=9 and abs(cy-target[1])<=8,(name,"off center",cx,cy)
  n,labels,stats,_=cv2.connectedComponentsWithStats(np.uint8(mask),8)
  fragments=[dict(bbox=list(map(int,s[:4])),area=int(s[4])) for s in stats[1:] if s[4]>5]
  sha=hashlib.sha256(p.read_bytes()).hexdigest()
  records.append(dict(name=name,size=size,bbox=bbox,center=[round(cx,1),round(cy,1)],opaquePercent=round(float(mask.mean())*100,1),bytes=p.stat().st_size,sha256=sha,fragments=fragments))
  print("PASS_ALPHA",name,round(cx,1),round(cy,1),bbox,"solid%",round(float(mask.mean())*100,1))
manifest={r["name"]:r for r in records}
EVIDENCE.mkdir(parents=True,exist_ok=True)
(EVIDENCE/"alpha20-qa.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
print("PASS 20 RGBA independent PNG icons, alpha, margins, weighted centering, bounded composition")
