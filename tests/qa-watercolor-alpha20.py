"""True-alpha watercolor visual regression. Asset-level only, not a claim of LIVE UAT."""
from pathlib import Path
from PIL import Image
import numpy as np
import cv2, hashlib, json
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"assets/watercolor-icons-alpha"
META=json.loads((DIR/"manifest.json").read_text(encoding="utf-8"))
HOME=["creator","sheet","rules","spells","shop","characters","adventures","play"]
CLASSES=["barbarian","bard","cleric","druid","fighter","monk","paladin","ranger","rogue","sorcerer","warlock","wizard"]
NAMES=HOME+CLASSES
assert META["version"]=="original-watercolor-v3"
source=ROOT/META["source"]
assert source.name=="watercolor-icons-master-v3.png"
assert hashlib.sha256(source.read_bytes()).hexdigest()==META["sourceSha256"]
assert Image.open(source).mode=="RGBA"
assert Image.open(source).size==(1122,1402)
src=np.asarray(Image.open(source).convert("RGBA"))[:,:,3]
components,_,stats,_=cv2.connectedComponentsWithStats(np.uint8(src>20),8)
assert sum(1 for k in range(1,components) if stats[k,cv2.CC_STAT_AREA]>700)==21,"original complete silhouette components changed"
rows=META["icons"]
assert [r["key"] for r in rows]==NAMES
assert {p.stem for p in DIR.glob("*.png")}==set(NAMES)
results=[]
for idx,entry in enumerate(rows):
    name=entry["key"];p=DIR/(name+".png")
    assert hashlib.sha256(p.read_bytes()).hexdigest()==entry["sha256"],name
    img=Image.open(p)
    dim=(480,288) if idx<8 else (360,232)
    assert img.mode=="RGBA" and img.size==dim,(name,img.mode,img.size)
    pix=np.asarray(img);a=pix[:,:,3]
    assert a[0].max()==a[-1].max()==a[:,0].max()==a[:,-1].max()==0,name
    yy,xx=np.nonzero(a>20)
    assert len(xx)>6000,name
    bbox=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
    assert min(bbox[0],bbox[1],dim[0]-bbox[2],dim[1]-bbox[3])>=14,(name,bbox)
    weights=a.astype(np.float64)/255;Y,X=np.indices(a.shape)
    center=((weights*X).sum()/weights.sum(),(weights*Y).sum()/weights.sum())
    assert abs(center[0]-dim[0]/2)<=25 and abs(center[1]-dim[1]/2)<=(31 if idx<8 else 20),(name,center)
    bottom=a[yy.max()]>40;run=best=0
    for v in bottom:
        run=run+1 if v else 0;best=max(best,run)
    assert best<=34,(name,"clipped silhouette",best)
    r,g,b=[pix[:,:,j].astype(int) for j in range(3)]
    neon=((r>230)&(g>230)&(b<90))|((r>245)&(g<30)&(b<30))|((r>225)&(b>220)&(g<140))
    noise=int(((a>20)&neon).sum())
    assert noise<=10,(name,"neon matte contamination",noise)
    results.append((name,bbox,round(center[0],1),round(center[1],1),best,noise))
    print("PASS",name,"bbox",bbox,"center",results[-1][2:4],"bottomRun",best,"neon",noise)
# Regression: previously cropped 840x463 RGB derivative is not an acceptable alpha source.
legacy=Image.open(ROOT/"assets/source/watercolor-icon-atlas.png")
assert legacy.mode=="RGB" and legacy.size==(840,463),"old truncation fixture changed"
assert META["source"]!="assets/source/watercolor-icon-atlas.png"
evidence=ROOT/"tmp/qa-watercolor-alpha20";evidence.mkdir(parents=True,exist_ok=True)
(evidence/"alpha20-v3-qa.json").write_text(json.dumps({"sourceSha256":META["sourceSha256"],"status":"ASSET_QA_PASS","browser":"PENDING","live":"PENDING","results":results},ensure_ascii=False,indent=2),encoding="utf-8")
print("PASS 20/20 source provenance, complete silhouettes, alpha, geometry and edge checks")
