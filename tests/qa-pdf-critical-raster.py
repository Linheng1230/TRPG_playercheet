import pymupdf, json, sys
from pathlib import Path
from PIL import Image
pdf=Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\pdf-export-fix-smoke.pdf")
if not pdf.exists(): raise SystemExit("missing PDF fixture")
doc=pymupdf.open(pdf)
page=doc[0]; zoom=3
pix=page.get_pixmap(matrix=pymupdf.Matrix(zoom,zoom),alpha=False)
im=Image.frombytes("RGB",[pix.width,pix.height],pix.samples)
rects={"light":(56.0073,118.423,14.1732,14.174),"medium":(96.4133,118.3,14.1737,14.174),"heavy":(134.318,118.289,14.174,14.173),"shield":(171.859,118.388,14.173,14.173)}
means={}
for name,(x,y,w,h) in rects.items():
    l=int((x+3)*zoom);r=int((x+w-3)*zoom)
    top=int((page.rect.height-(y+h)+3)*zoom);bot=int((page.rect.height-y-3)*zoom)
    crop=im.crop((l,top,r,bot)).convert("L")
    px=list(crop.getdata());means[name]=sum(px)/len(px)
align="混沌善良" in doc[1].get_text()
lightVisible=means["light"]+35<min(means["medium"],means["heavy"],means["shield"])
out={"alignVisible":align,"boxMeans":means,"lightVisible":lightVisible}
print(json.dumps(out,ensure_ascii=False,indent=2))
sys.exit(0 if align and lightVisible else 1)
