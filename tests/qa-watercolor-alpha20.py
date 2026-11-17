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
# Provenance gate: the previous atlas itself was already cropped, so alpha margins
# alone incorrectly reported PASS. All icons must originate from the full design.
provenance=json.loads((ASSETS/"manifest.json").read_text(encoding="utf-8"))
assert provenance["version"]=="ref-complete-v2","stale visual-source producer"
assert provenance["source"]=="docs/design-reference/reference-mockup.webp","cropped atlas used"
reference=ROOT/provenance["source"]
assert hashlib.sha256(reference.read_bytes()).hexdigest()==provenance["sourceSha256"],"source mismatch"
source_rows={x["key"]:x for x in provenance["icons"]}
assert set(source_rows)==EXPECTED
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
  assert sha==source_rows[name]["sha256"],(name,"icon no longer matches verified source")
  # REAL SILHOUETTE regression: the previously cropped atlas produced up to
  # 191 consecutive nontransparent pixels on the lowest painted row. Padding
  # transparent canvas around that missing artwork did NOT repair the icon.
  # Complete silhouettes from the reference have at most 30px flat bottom runs.
  solid=a>48
  edge_row=solid[np.nonzero(solid)[0].max()]
  longest=0
  current=0
  for filled in edge_row:
    current=current+1 if filled else 0
    longest=max(longest,current)
  assert longest<=34,(name,"SILHOUETTE_TRUNCATED_FLAT_BOTTOM",longest)
  records.append(dict(name=name,size=size,bbox=bbox,center=[round(cx,1),round(cy,1)],opaquePercent=round(float(mask.mean())*100,1),bytes=p.stat().st_size,sha256=sha,flatBottomRun=longest,fragments=fragments))
  print("PASS_ALPHA_AND_SILHOUETTE",name,round(cx,1),round(cy,1),bbox,"flatBottom",longest)
manifest={r["name"]:r for r in records}
EVIDENCE.mkdir(parents=True,exist_ok=True)
(EVIDENCE/"alpha20-qa.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
# Negative regression: the historic already-cropped RGB atlas MUST fail the new
# silhouette gate, even after it is placed on a transparent padded canvas.
import importlib.util
spec=importlib.util.spec_from_file_location("watercolor_builder",ROOT/"scripts/build-watercolor-alpha20.py")
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
legacy_src=Image.open(ROOT/"assets/source/watercolor-icon-atlas.png").convert("RGB")
legacy_crop=legacy_src.crop((17,109,195,205)) # shop was row 2, first atlas cell
legacy_alpha,_=builder.segment(legacy_crop,"shop")
legacy_padded,_=builder.compose(legacy_alpha,"shop",True)
old_mask=np.array(legacy_padded.getchannel("A"))>48
old_row=old_mask[np.nonzero(old_mask)[0].max()]
old_run=0
old_cur=0
for px in old_row:
  old_cur=old_cur+1 if px else 0
  old_run=max(old_run,old_cur)
assert old_run>34,("NEGATIVE_REGRESSION_DID_NOT_REJECT_CROPPED_SHOP",old_run)
print("PASS NEGATIVE REGRESSION: old truncated shop bottom run",old_run,"fails current <=34 gate")
print("PASS 20 RGBA icons: original full reference, untruncated silhouette, alpha, margins and centering")
