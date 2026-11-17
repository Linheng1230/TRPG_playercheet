"""Reproducibly split original watercolor 20-icon artwork into 20 transparent PNGs.
Master asset is 1122x1402 RGBA with 4x5 individually disconnected silhouettes.
Use connected silhouettes, not rectangular cells, to preserve artwork crossing invisible rows.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,cv2,json,hashlib,sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
source=Path(sys.argv[2]) if len(sys.argv)>2 else root/'assets/source/watercolor-icons-master-v3.png'
dest=root/'assets'/'watercolor-icons-alpha';dest.mkdir(parents=True,exist_ok=True)
namegrid=['creator','sheet','rules','spells','shop','characters','adventures','play','barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard']
base=Image.open(source).convert('RGBA');assert base.size==(1122,1402)
rgba=np.array(base);alpha=rgba[:,:,3];h,w=alpha.shape
# Silhouette ID is built from full RGBA sheet so parts crossing cell seams are not chopped off.
num,labels,stats,cents=cv2.connectedComponentsWithStats(np.uint8(alpha>20),8)
centers=[((col+.5)*w/4,(row+.5)*h/5) for row in range(5) for col in range(4)]
major={i for i in range(1,num) if stats[i,cv2.CC_STAT_AREA]>700}
assert len(major)==21, ('unexpected component changes, inspect master',len(major))
owner={}
for i in range(1,num):
 area=int(stats[i,cv2.CC_STAT_AREA]);cx,cy=cents[i]
 if area<20:continue
 idx=int(np.argmin([(cx-x)**2+(cy-y)**2 for x,y in centers]))
 # Guard against phantom components floating in blank background.
 if area<700 and np.hypot(cx-centers[idx][0],cy-centers[idx][1])>175:continue
 owner[i]=idx
metadata=[]
for index,name in enumerate(namegrid):
 ids=[i for i,idx in owner.items() if idx==index]
 assert ids,('icon missing',name)
 high=np.isin(labels,ids).astype('uint8')
 assert high.sum()>1200,(name,'alpha too sparse')
 # Widen major silhouette by 2px to restore semi-transparent painterly outer edges.
 extent=cv2.dilate(high,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
 arr=rgba.copy()
 arr[:,:,3] = np.where(extent>0,alpha,0).astype('uint8')
 # RGB color under transparent pixels is immaterial; normalizing removes hidden neon noise.
 arr[arr[:,:,3]<12,:]=0
 ys,xs=np.nonzero(arr[:,:,3]>20)
 assert len(xs)>1000
 x0,x1=int(xs.min()),int(xs.max()+1);y0,y1=int(ys.min()),int(ys.max()+1)
 box=(x0,y0,x1,y1)
 icon=Image.fromarray(arr,'RGBA').crop(box)
 home=index<8
 W,H=(480,288) if home else (360,232)
 # 18px+ margins on each side; preserve real source aspect ratio.
 margin_x,margin_y=(28,23) if home else (18,18)
 scale=min((W-2*margin_x)/icon.width,(H-2*margin_y)/icon.height)
 dims=(max(1,round(icon.width*scale)),max(1,round(icon.height*scale)))
 icon=icon.resize(dims,Image.Resampling.LANCZOS)
 dst=Image.new('RGBA',(W,H),(0,0,0,0))
 # Perceptually center alpha-weighted mass, clamp to keep the entire painted outline.
 a=np.asarray(icon.getchannel('A')).astype('float64')/255
 yy,xx=np.indices(a.shape);cx=float((a*xx).sum()/a.sum());cy=float((a*yy).sum()/a.sum())
 left=round(W/2-cx);top=round(H/2-cy)
 left=int(np.clip(left,margin_x,W-icon.width-margin_x));top=int(np.clip(top,margin_y,H-icon.height-margin_y))
 dst.alpha_composite(icon,(left,top))
 a=np.asarray(dst.getchannel('A'))
 assert np.max(a[:12])==0 and np.max(a[-12:])==0 and np.max(a[:,:12])==0 and np.max(a[:,-12:])==0,('painted edge clipped',name)
 newyy,newxx=np.nonzero(a>20)
 rx0,rx1=int(newxx.min()),int(newxx.max()+1);ry0,ry1=int(newyy.min()),int(newyy.max()+1)
 assert min(rx0,ry0,W-rx1,H-ry1)>13,(name,rx0,ry0,rx1,ry1)
 out=dest/(name+'.png');dst.save(out,optimize=True)
 # Check full silhouette preserved: no hard straight horizontal last-row joins.
 bot=a[newyy.max()]>40
 runs=[];count=0
 for pixel in bot:
  if pixel:count+=1
  else:runs.append(count);count=0
 runs.append(count)
 longest=max(runs)
 assert longest<=34,('flat bottom cut',name,longest)
 metadata.append({'key':name,'group':'home' if home else 'class','sourceRect':box,'sourceComponentIds':ids,'sourceSource':'assets/source/watercolor-icons-master-v3.png','canvas':[W,H],'bbox':[rx0,ry0,rx1,ry1],'alphaCoverage':round(float(np.mean(a>20)),4),'longestBottomRun':longest,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()})
 print('PASS_ICON',name,box,'output bbox',[rx0,ry0,rx1,ry1],'flat',longest,'size',out.stat().st_size)
# Persist source master and manifest for deterministic regeneration.
sourcedir=root/'assets'/'source';sourcedir.mkdir(exist_ok=True)
(base).save(sourcedir/'watercolor-icons-master-v3.png',optimize=True)
manifest={'version':'original-watercolor-v3','source':'assets/source/watercolor-icons-master-v3.png','sourceSha256':hashlib.sha256((sourcedir/'watercolor-icons-master-v3.png').read_bytes()).hexdigest(),'icons':metadata}
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
# Two contact sheets: inspect edge halos against light and dark.
qa=root/'tmp'/'qa-watercolor-alpha20'/'v3';qa.mkdir(parents=True,exist_ok=True)
for bg,label in [((248,241,222),'paper'),((36,42,48),'dark')]:
 tw,th=260,200
 canvas=Image.new('RGBA',(4*tw,5*th),(*bg,255))
 draw=ImageDraw.Draw(canvas)
 for i,name in enumerate(namegrid):
  img=Image.open(dest/(name+'.png')).convert('RGBA');img.thumbnail((246,164),Image.Resampling.LANCZOS)
  col=i%4;row=i//4;x=col*tw+(tw-img.width)//2;y=row*th+2+(170-img.height)//2
  canvas.alpha_composite(img,(x,y));draw.text((col*tw+10,row*th+176),name,fill='white' if label=='dark' else '#332719')
 canvas.convert('RGB').save(qa/(f'watercolor20-{label}.png'))
print('PASS_FULL_SHEET',len(metadata),'source sha',manifest['sourceSha256'][:16], 'root',root)
