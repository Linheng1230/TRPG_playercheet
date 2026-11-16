from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]
assets=root/"assets"
src=assets/"source"
src.mkdir(parents=True,exist_ok=True)
scene=Image.open(src/"fantasy-watercolor-scene.png").convert("RGB")
atlas=Image.open(src/"watercolor-icon-atlas.png").convert("RGB")
assert scene.size==(1672,941),scene.size
assert atlas.size==(840,463),atlas.size
# High-fidelity desktop paint. Keep original watercolor brush strokes, not 5KB AVIF.
scene.resize((1600,901),Image.Resampling.LANCZOS).save(assets/"fantasy-watercolor-scene.webp","WEBP",quality=84,method=6)
atlas.save(assets/"watercolor-icon-atlas.webp","WEBP",quality=88,method=6)
# Mobile original composition: castle on left, Western winged dragon on right, clear central parchment.
canvas=Image.new("RGBA",(780,330),(249,239,221,255))
base=canvas.copy()
def paint_fragment(crop,box,alpha=1.0):
    region=scene.crop(crop).resize((box[2],box[3]),Image.Resampling.LANCZOS).convert("RGBA")
    # Soft watercolor edges that fade into the parchment, retaining internal detail.
    from PIL import ImageDraw
    mask=Image.new("L",region.size,0)
    draw=ImageDraw.Draw(mask)
    draw.ellipse((int(-.2*region.width),int(-.2*region.height),int(1.2*region.width),int(1.2*region.height)),fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(max(8,int(region.width*.09))))
    if alpha!=1:mask=mask.point(lambda v:int(v*alpha))
    region.putalpha(mask)
    canvas.alpha_composite(region,dest=(box[0],box[1]))
paint_fragment((0,0,570,550),(0,0,355,330),.94)
paint_fragment((1060,0,1672,640),(420,0,360,330),.99)
# Middle paper makes narrow-width labels readable if text overlays in future.
overlay=Image.new("RGBA",canvas.size,(248,237,218,0))
from PIL import ImageDraw
middle=Image.new("L",canvas.size,0)
d=ImageDraw.Draw(middle)
d.rectangle((335,0,440,330),fill=125)
middle=middle.filter(ImageFilter.GaussianBlur(65))
overlay.putalpha(middle)
canvas=Image.alpha_composite(canvas,overlay)
canvas.convert("RGB").save(assets/"fantasy-watercolor-mobile.webp","WEBP",quality=85,method=6)
# Class icon cut-outs: 12 complete watercolors, with reduced empty paper margins.
# The canonical source atlas is 4 columns x 5 rows; classes occupy rows 3-5.
# This sprite is presentation-only and is never a class identity data source.
class_sheet=Image.new("RGB",(672,270),(250,242,227))
for index in range(12):
    col=index % 4
    row=index // 4
    x0=col*210
    y0=[208,293,378][row]
    # Wide bows and branches need more of the original frame than compact emblems.
    frame_width=186 if index in (3,7,8) else 156
    pad=(210-frame_width)//2
    tile=atlas.crop((x0+pad,y0+3,x0+pad+frame_width,y0+84))
    tile=tile.resize((168,90),Image.Resampling.LANCZOS)
    class_sheet.paste(tile,(col*168,row*90))
class_sheet.save(assets/"watercolor-class-icons.webp","WEBP",quality=91,method=6)
for p in [src/"fantasy-watercolor-scene.png",src/"watercolor-icon-atlas.png",assets/"fantasy-watercolor-scene.webp",assets/"watercolor-icon-atlas.webp",assets/"watercolor-class-icons.webp",assets/"fantasy-watercolor-mobile.webp"]:
    b=p.read_bytes()
    print(p.relative_to(root),len(b),hashlib.sha256(b).hexdigest()[:16],Image.open(p).size)
