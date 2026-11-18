from PIL import Image, ImageDraw
from pathlib import Path
import numpy as np, hashlib, json
root=Path(__file__).resolve().parents[1]/'assets'/'species-watercolor'
qa=Path(__file__).resolve().parents[1]/'tmp'/'qa-species-watercolor'
qa.mkdir(parents=True,exist_ok=True)
src=Image.open(root/'species-watercolor-master.png').convert('RGBA')
assert src.size==(1983,793)
keys=['human','elf','dwarf','halfling','aasimar','dragonborn','gnome','goliath','orc','tiefling']
xedges=[0,395,788,1177,1578,1983]
yedges=[0,389,793]
records=[]
for i,key in enumerate(keys):
 col=i%5; row=i//5
 l,r=xedges[col],xedges[col+1]
 top,bot=yedges[row],yedges[row+1]
 pix=np.array(src.crop((l,top,r,bot)),dtype=np.uint8).copy()
 a=pix[:,:,3].astype(np.float32)
 # Suppress low-alpha watercolor paper backscatter but retain pale wings and feathered edges.
 corrected=np.clip((a-85)*255.0/170.0,0,255)
 corrected=corrected*np.clip((a-68)/80.0,0,1)
 # Fade bottom edge of the portrait rather than creating a hard cut on the sample sheet boundary.
 H,W=a.shape
 yy=np.arange(H)
 fade_bottom=np.clip((H-yy)/32,0,1).astype(np.float32)[:,None]
 # Modest fade only at cut edges, while keeping central watercolor intact.
 xx=np.arange(W)
 fadeside=np.minimum(np.clip(xx/10,0,1),np.clip((W-1-xx)/10,0,1))[None,:]
 corrected*=fade_bottom*fadeside
 corrected=np.clip(corrected,0,255).astype(np.uint8)
 pix[:,:,3]=corrected
 # Trim only fully invisible surrounding alpha, add transparent generous margin to avoid tangent edges.
 img=Image.fromarray(pix,'RGBA')
 bbox=img.getbbox()
 if not bbox: raise RuntimeError(key)
 img=img.crop(bbox)
 target=Image.new('RGBA',(440,440),(0,0,0,0))
 # Uniform fit 405x400 preserving all the head/wing/props.
 scale=min(405/img.width,400/img.height)
 sz=(int(round(img.width*scale)),int(round(img.height*scale)))
 resized=img.resize(sz,Image.Resampling.LANCZOS)
 # Anchor visual center on canvas, and place bottom of bust about 424.
 pos=((440-sz[0])//2, max(12,(440-sz[1])//2))
 target.alpha_composite(resized,pos)
 path=root/f'{key}.webp'
 target.save(path,'WEBP',quality=90,method=6)
 alpha=np.array(target.getchannel('A'))
 rec=dict(key=key,size=list(target.size),alpha0=float(np.mean(alpha==0)),opaque=float(np.mean(alpha>=240)),corners=[int(alpha[0,0]),int(alpha[0,-1]),int(alpha[-1,0]),int(alpha[-1,-1])],sha256=hashlib.sha256(path.read_bytes()).hexdigest(),bytes=path.stat().st_size,bbox=list(target.getbbox()))
 assert all(v==0 for v in rec['corners']),key
 assert rec['alpha0']>.15,(key,rec)
 records.append(rec)
 print(key,rec['bytes'],rec['bbox'],rec['alpha0'])
(root/'manifest.json').write_text(json.dumps({'version':'species-watercolor-v1','source':'assets/species-watercolor/species-watercolor-master.png','source_sha256':hashlib.sha256((root/'species-watercolor-master.png').read_bytes()).hexdigest(),'species':records},ensure_ascii=False,indent=2),encoding='utf-8')
# QA grid 5x2 displayed at near card size, light and dark
for theme,color in [('paper',(251,245,233)),('dark',(28,33,42))]:
 canvas=Image.new('RGB',(1100,580),color)
 d=ImageDraw.Draw(canvas)
 for i,key in enumerate(keys):
  img=Image.open(root/f'{key}.webp').convert('RGBA')
  img.thumbnail((210,244),Image.Resampling.LANCZOS)
  x=(i%5)*220+(220-img.width)//2; y=(i//5)*290+3
  tile=Image.new('RGBA',img.size,(*color,255));tile.alpha_composite(img)
  canvas.paste(tile.convert('RGB'),(x,y))
  d.text(((i%5)*220+17,(i//5)*290+255),key,fill=(25,23,20) if theme=='paper' else (250,250,250))
 canvas.save(qa/f'species-{theme}.png')
