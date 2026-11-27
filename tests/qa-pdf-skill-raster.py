"""Actual exported PDF visual gate: MuPDF and PDFium, not just form /V."""
import json,sys
from pathlib import Path
import pymupdf as fitz
import pypdfium2 as pdfium
from PIL import Image
D=Path(sys.argv[1]);report=json.loads((D/"report.json").read_text(encoding="utf8"))
assert report["fieldParityPass"] and len(report["report"])==10
SCALE=4
def crop(im,r):
 return im.crop((round(r.x0*SCALE),round(r.y0*SCALE),round(r.x1*SCALE),round(r.y1*SCALE))).convert("L")
def components(im):
 w,h=im.size;px=im.load();points={(x,y) for y in range(h) for x in range(w) if px[x,y]<128};sizes=[]
 while points:
  todo=[points.pop()];n=0
  while todo:
   x,y=todo.pop();n+=1
   for dy in (-1,0,1):
    for dx in (-1,0,1):
     q=x+dx,y+dy
     if q in points:points.remove(q);todo.append(q)
  sizes.append(n)
 return [x for x in sizes if x>=3]
def norm(s):return "".join(s.split())
results=[]
for c in report["report"]:
 file=D/c["file"];doc=fitz.open(file);p=doc[0]
 fields={w.field_name:w for w in p.widgets()}
 spans=[sp for b in p.get_text("dict")["blocks"] for ln in b.get("lines",[]) for sp in ln["spans"]]
 pix=p.get_pixmap(matrix=fitz.Matrix(SCALE,SCALE),alpha=False,annots=True);m=Image.frombytes("RGB",[pix.width,pix.height],pix.samples)
 pd=pdfium.PdfDocument(str(file));pd.init_forms();pg=pd[0];im=pg.render(scale=SCALE,draw_annots=True,may_draw_forms=True).to_pil().convert("RGB")
 for r in c["rows"]:
  lab=fields[r["labelField"]].rect;num=fields[r["field"]].rect;box=fields[r["checkbox"]].rect
  for rect,expected in [(lab,r["name"]),(num,r["value"])]:
   got=norm("".join(sp["text"] for sp in spans if rect.contains(fitz.Point((sp["bbox"][0]+sp["bbox"][2])/2,(sp["bbox"][1]+sp["bbox"][3])/2))))
   assert got==norm(expected),(file.name,r["id"],"rendered text",expected,got)
  for engine,img in [("MuPDF",m),("PDFium",im)]:
   a=crop(img,lab);dark=a.point(lambda x:255 if x<128 else 0);bounds=dark.getbbox()
   assert bounds and sum(1 for x in a.getdata() if x<128)>12,(file.name,engine,r["id"],"blank label")
   assert bounds[0]>0 and bounds[1]>0 and bounds[2]<a.width and bounds[3]<a.height,(file.name,engine,r["id"],"label touching bounds",bounds,a.size)
   b=crop(img,box);found=components(b);want=4 if r["marker"]=="❖" else 1
   assert len(found)==want,(file.name,engine,r["id"],r["marker"],"marker components",found)
   center=b.getpixel((b.width//2,b.height//2))
   assert (center<128)==(r["marker"]=="◆"),(file.name,engine,r["id"],"mark center",center)
   assert min(crop(img,num).getdata())<128,(file.name,engine,r["id"],"blank number")
 # Preserve a reviewable crop from both independent renderers.
 rr=fitz.Rect(92,315,205,568) if c["fixture"]["rs"]=="2014" else fitz.Rect(12,178,209,606)
 for engine,img in [("mupdf",m),("pdfium",im)]:
  img.crop((round(rr.x0*SCALE),round(rr.y0*SCALE),round(rr.x1*SCALE),round(rr.y1*SCALE))).save(D/(file.stem+"-"+engine+".png"))
 results.append({"file":file.name,"rows":len(c["rows"]),"renderers":["MuPDF","PDFium"]})
 doc.close();pg.close();pd.close()
 print("PASS",file.name,"18 printed names, totals and three-state marker raster",flush=True)
(D/"raster-report.json").write_text(json.dumps({"pass":True,"results":results},ensure_ascii=False,indent=2),encoding="utf8")
print("PASS",len(results)*18*2,"rendered skill row checks")