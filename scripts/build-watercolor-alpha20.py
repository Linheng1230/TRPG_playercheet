"""Extract 20 complete independent watercolor icons from the USER-APPROVED design reference.
Source: docs/design-reference/reference-mockup.webp (1870x1172 RGB).
IMPORTANT: assets/source/watercolor-icon-atlas.png was an ALREADY-TRUNCATED derivative.
Slicing it and padding the missing silhouette with transparency caused the 5be5d74 false PASS.
Outputs are true RGBA (240x144 home; 180x116 class), no sprite-sheet background.
Preserve original painted colors, no new artwork, no D&D rule/state modifications.
"""
from pathlib import Path
import sys, json, hashlib
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"docs/design-reference/reference-mockup.webp"
OUT=ROOT/"assets/watercolor-icons-alpha"
PREVIEW=ROOT/"tmp/qa-watercolor-alpha20"
HOME=["creator","sheet","rules","spells","shop","characters","adventures","play"]
CLASSES=["barbarian","bard","cleric","druid","fighter","monk","paladin","ranger","rogue","sorcerer","warlock","wizard"]
# Original complete mockup artwork rectangles, excluding card labels and borders.
# These are intentionally taken from the actual user-approved third concept design.
HOME_X=[(365,565),(636,835),(920,1119),(1205,1405)]
HOME_Y=[(224,322),(410,506)]
CLASS_X=[(398,564),(608,782),(815,997),(1025,1208)]
CLASS_Y=[(786,848),(903,958),(1014,1073)]
def source_rect(group,idx):
    xs=HOME_X if group=="home" else CLASS_X
    ys=HOME_Y if group=="home" else CLASS_Y
    x0,x1=xs[idx%4]
    y0,y1=ys[idx//4]
    return (x0,y0,x1,y1)
# Optional aggressive inclusion for pale parchment centers enclosed by dark ink:
FILL_CONTOUR={"creator","sheet","rules","spells","shop","adventures","fighter","paladin","wizard"}
def segment(src,key):
    # RGB icon cut, with original source colors retained in fully visible pixels.
    src=np.array(src,dtype=np.uint8)
    h,w=src.shape[:2]
    border=np.concatenate((src[:3].reshape(-1,3),src[-3:].reshape(-1,3),src[:,:3].reshape(-1,3),src[:,-3:].reshape(-1,3)))
    bg=np.median(border,axis=0).astype(np.uint8)
    lab=cv2.cvtColor(src,cv2.COLOR_RGB2LAB).astype(np.float32)
    bglab=cv2.cvtColor(bg.reshape(1,1,3),cv2.COLOR_RGB2LAB).astype(np.float32)[0,0]
    delta=np.linalg.norm((lab-bglab)*np.array([1.0,1.25,1.25]),axis=2)
    mask=np.full((h,w),cv2.GC_PR_BGD,dtype=np.uint8)
    mask[delta>18]=cv2.GC_PR_FGD
    mask[delta>36]=cv2.GC_FGD
    mask[:2,:]=cv2.GC_BGD;mask[-2:,:]=cv2.GC_BGD;mask[:,:2]=cv2.GC_BGD;mask[:,-2:]=cv2.GC_BGD
    if np.count_nonzero(mask==cv2.GC_FGD)<10:raise RuntimeError("weak ink "+key)
    modelbg=np.zeros((1,65),np.float64);modelfg=np.zeros((1,65),np.float64)
    cv2.grabCut(cv2.cvtColor(src,cv2.COLOR_RGB2BGR),mask,None,modelbg,modelfg,5,cv2.GC_INIT_WITH_MASK)
    alpha=np.uint8((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD))*255
    if key in FILL_CONTOUR:
       # Restore light interiors of enclosed parchment objects (scroll/book/shield).
       morph=cv2.morphologyEx(alpha,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
       contours,_=cv2.findContours(morph,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
       for cnt in contours:
          if cv2.contourArea(cnt)>120:
            cv2.drawContours(alpha,[cnt],-1,255,thickness=-1)
    # Suppress isolated 1-2px speckles which are part of the source background paper.
    n,labels,stats,c=cv2.connectedComponentsWithStats(alpha,8)
    for i in range(1,n):
      if stats[i,cv2.CC_STAT_AREA]<(25 if key=="play" else 6):alpha[labels==i]=0
    alpha=cv2.GaussianBlur(alpha,(3,3),0.55)
    alpha[alpha<=6]=0
    # Remove known slim decorative horizontal rule on class cards.
    # Object bounding ROI excludes the bar, except it may touch border near very top.
    # Edge unmatting avoids cream halos against both dark and bright cards.
    a=alpha.astype(np.float32)/255
    fg=src.astype(np.float32)
    correction=np.maximum(a,.18)[...,None]
    clean=np.clip((fg-(1-a[...,None])*bg[None,None,:])/correction,0,255).astype(np.uint8)
    rgba=np.dstack((clean,alpha))
    return Image.fromarray(rgba,"RGBA"),[int(x) for x in bg]
def compose(cut,key,home):
    arr=np.asarray(cut)
    ys,xs=np.nonzero(arr[:,:,3]>12)
    if not len(xs):raise RuntimeError("empty segmentation "+key)
    bbox=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
    obj=cut.crop(bbox)
    canvas_size=(240,144) if home else (180,116)
    # Maintain shape; scale only uniformly, keeping 9-13 px margins for silhouette.
    available=(canvas_size[0]-40,canvas_size[1]-30) if home else (canvas_size[0]-28,canvas_size[1]-24)
    sf=min(available[0]/obj.width,available[1]/obj.height)
    # Do not force downscale a class portrait to fill the whole 180x116 visually.
    sz=(max(1,round(obj.width*sf)),max(1,round(obj.height*sf)))
    obj=obj.resize(sz,Image.Resampling.LANCZOS)
    # use opacity-weighted bounding box center (not source sheet cell center).
    rgba=np.asarray(obj)
    weights=rgba[:,:,3].astype(np.float64)/255
    y,x=np.indices(weights.shape)
    cx=float((weights*x).sum()/max(1,weights.sum()))
    cy=float((weights*y).sum()/max(1,weights.sum()))
    target=(canvas_size[0]/2,canvas_size[1]*.50)
    off=(int(round(target[0]-cx)),int(round(target[1]-cy)))
    off=(max(8,min(canvas_size[0]-sz[0]-8,off[0])),max(8,min(canvas_size[1]-sz[1]-8,off[1])))
    dest=Image.new("RGBA",canvas_size,(0,0,0,0))
    dest.alpha_composite(obj,off)
    # all 4 corners must be truly transparent, AND silhouette may not touch edges.
    d=np.asarray(dest)
    assert np.all(d[0,:,3]==0) and np.all(d[-1,:,3]==0) and np.all(d[:,0,3]==0) and np.all(d[:,-1,3]==0),(key,"edge clipped")
    ys2,xs2=np.nonzero(d[:,:,3]>12)
    if min(xs2.min(),ys2.min(),canvas_size[0]-xs2.max()-1,canvas_size[1]-ys2.max()-1)<2:raise RuntimeError("boundary risk "+key)
    return dest,dict(sourceBBox=bbox,canvas=canvas_size,foregroundBox=[int(xs2.min()),int(ys2.min()),int(xs2.max()+1),int(ys2.max()+1)],alphaCoverage=round(float(np.mean(d[:,:,3]>12)),4),center=[round(float((d[:,:,3]*np.arange(canvas_size[0])[None,:]).sum()/max(1,d[:,:,3].sum())),2),round(float((d[:,:,3]*np.arange(canvas_size[1])[:,None]).sum()/max(1,d[:,:,3].sum())),2)])
def run(sample=False):
    OUT.mkdir(exist_ok=True,parents=True);PREVIEW.mkdir(exist_ok=True,parents=True)
    src=Image.open(SRC).convert("RGB")
    assert src.size==(1870,1172),src.size
    source_sha=hashlib.sha256(SRC.read_bytes()).hexdigest()
    items=[]
    for group,names in [("home",HOME),("class",CLASSES)]:
      for idx,key in enumerate(names):
        if sample and key not in ("creator","spells","druid","bard"):continue
        rect=source_rect(group,idx)
        cut=src.crop(rect)
        segmented,bg=segment(cut,key)
        icon,meta=compose(segmented,key,group=="home")
        path=OUT/(key+".png")
        icon.save(path,optimize=True)
        check=np.array(Image.open(path).convert("RGBA"))
        assert check.shape[2]==4 and check[0,0,3]==0,(key,"not transparent")
        meta.update(key=key,group=group,background=bg,sourceRect=rect,sourceImage="docs/design-reference/reference-mockup.webp",sourceSha256=source_sha,filename=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        items.append(meta)
        print("CREATED",key,meta["foregroundBox"],"coverage",meta["alphaCoverage"],"bytes",path.stat().st_size)
    # Two separate full-coverage evidence contact sheets. Never crop an icon in the QA producer.
    cols=4;tile_w=246;tile_h=178
    for scheme,bg in [("dark",(35,43,50)),("paper",(252,248,236))]:
      sheet=Image.new("RGB",(cols*tile_w,((len(items)+cols-1)//cols)*tile_h),bg)
      label=ImageDraw.Draw(sheet)
      for i,record in enumerate(items):
        icon=Image.open(OUT/record["filename"]).convert("RGBA")
        icon.thumbnail((tile_w-25,tile_h-34),Image.Resampling.LANCZOS)
        bx=(i%cols)*tile_w;by=(i//cols)*tile_h
        tile=Image.new("RGBA",icon.size,(*bg,255))
        tile.alpha_composite(icon)
        sheet.paste(tile.convert("RGB"),(bx+(tile_w-icon.width)//2,by+2+(tile_h-34-icon.height)//2))
        label.text((bx+11,by+tile_h-23),record["key"],fill=(255,255,255) if scheme=="dark" else (41,32,28))
      output=PREVIEW/(("sample-" if sample else "all20-")+scheme+".png")
      sheet.save(output)
      print("PREVIEW",output)
    (PREVIEW/("sample.json" if sample else "manifest.json")).write_text(json.dumps(items,indent=2,ensure_ascii=False),encoding="utf-8")
    if not sample:
      # Tracked source/provenance contract. A padded cut silhouette is no longer acceptable.
      (OUT/"manifest.json").write_text(json.dumps({
        "version":"ref-complete-v2",
        "source":"docs/design-reference/reference-mockup.webp",
        "sourceSha256":source_sha,
        "icons":items
      },indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
if __name__=="__main__":run(sample="--sample" in sys.argv)
