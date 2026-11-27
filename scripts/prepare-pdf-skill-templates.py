#!/usr/bin/env python3
"""One-time source-pinned template migration. Keep original form fields and artwork.
Run inside isolated worktree, with PyMuPDF and repository pdf-lib/fontkit.
No changes to source template until all structural and raster guards pass."""
import hashlib,json,re,subprocess,tempfile,sys
from pathlib import Path
import pymupdf as fitz
from PIL import Image, ImageChops, ImageDraw
from fontTools import subset
ROOT=Path(__file__).resolve().parents[1]
BASE="af8f2c184c10962d9bfd32d4368a84af60035bb7"
EXPECTED={"2014":"a2a25e53bd9212a8e10c4079edb858b8b839ca06","2024":"d04305f6028003ecdf9a5948c55100195116b642"}
# Exact old printed labels, observed in the two pinned input PDFs.
# Recognition only: all output names are derived from the website, not this table.
OLD14={"雜技":"特技動作","巧手":"扒手","隱匿":"隱藏","奧秘":"奧術","動物馴養":"馴服動物","洞悉":"察言觀色","醫藥":"醫術","察覺":"觀察"}
OLD24={"雜技":"體操","隱匿":"潛匿","奧秘":"奥秘","動物馴養":"馴獸","說服":"遊说"}
def read(p):return subprocess.check_output(["git","-C",str(ROOT),"show",BASE+":"+p])
def blob(b):return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def fields(doc):
 out={}
 for p in doc:
  for w in p.widgets() or []:
   out.setdefault(w.field_name,[]).append((p.number,tuple(round(v,3) for v in w.rect),w.field_type,w.field_flags,w.field_value))
 return out
def asimg(p):
 z=p.get_pixmap(matrix=fitz.Matrix(3,3),alpha=False,annots=False)
 return Image.frombytes("RGB",[z.width,z.height],z.samples)
def mapping(s,n):return dict(re.findall(r'([^,\s:]+):"([^"\n]+)"',re.search(r"const "+n+r"=\{([^{}]*)\};",s).group(1)))
def main():
 src=read("assets/character-sheet-export.js").decode()
 sf,skm=mapping(src,"sf"),mapping(src,"skm")
 order=json.loads(re.search(r'const order=(\["運動"[^\n]*?\]);order\.forEach',src).group(1))
 names=json.loads(re.search(r'"skills":(\{[^{}]+\})',read("assets/data/name-migrations-5r.js").decode()).group(1))
 assert len(sf)==len(skm)==len(order)==18 and set(sf)==set(skm)==set(order)
 outdir=Path(sys.argv[1]).resolve();outdir.mkdir(parents=True,exist_ok=True)
 paths=[p for p in subprocess.check_output(["git","-C",str(ROOT),"ls-tree","-r","--name-only","-z",BASE,"assets/character-sheets"]).decode().split("\0") if p.endswith(".pdf")]
 assert len(paths)==2
 manifest={}
 for file in paths:
  year="2014" if "2014" in file else "2024";b=read(file);assert blob(b)==EXPECTED[year],file
  vals=sf if year=="2014" else skm
  checks={n:f"Check Box {23+i}" for i,n in enumerate(order)} if year=="2014" else {n:f+"-c" for n,f in vals.items()}
  old=OLD14 if year=="2014" else OLD24
  doc=fitz.open(stream=b,filetype="pdf");before=fields(doc);p=doc[0];before_img=asimg(p);spec=[];areas=[]
  for n,f in vals.items():
   v,c=before[f],before[checks[n]];assert len(v)==len(c)==1 and v[0][0]==c[0][0]==0 and v[0][2]==fitz.PDF_WIDGET_TYPE_TEXT and c[0][2]==fitz.PDF_WIDGET_TYPE_CHECKBOX,n
   vr,cr=fitz.Rect(v[0][1]),fitz.Rect(c[0][1]);cy=(vr.y0+vr.y1)/2
   match=[fitz.Rect(w[:4]) for w in p.get_text("words") if w[4]==old.get(n,n) and vr.x1<=w[0]<=vr.x1+15 and abs((w[1]+w[3])/2-cy)<=3]
   assert len(match)==1,(year,n,match)
   r=match[0];mx=(r.y0+r.y1)/2
   fr=fitz.Rect(r.x0-.25,mx-6.25,r.x0+(39 if year=="2014" else 29),mx+6.25)
   # Label fields may not overlap another form or neighboring attribute label.
   assert all(not fr.intersects(fitz.Rect(w[1])) for fs in before.values() for w in fs if w[0]==0),(year,n,fr)
   assert not any(fr.intersects(fitz.Rect(w[:4])) for w in p.get_text("words") if fitz.Rect(w[:4])!=r and not (fitz.Rect(w[:4])&r).get_area()>0),(year,n,"label collision")
   # Underlying circle is printed on both templates. Remove only its white-panel rectangle.
   pad=1.25 if year=="2014" else .7
   mask=fitz.Rect(cr.x0-pad,cr.y0-.6,cr.x1+pad,cr.y1+.6)
   assert not mask.intersects(vr),(year,n,"marker hits numeric field")
   spec.append({"skill":n,"field":f,"checkbox":checks[n],"labelField":"skill-label-"+f,"name":n if year=="2014" else names.get(n,n),"rect":list(fr),"oldRect":list(r),"markerRect":list(mask)})
   areas.extend([r,mask])
  assert len(spec)==18 and len({x["field"] for x in spec})==18
  for q in spec:p.add_redact_annot(fitz.Rect(q["oldRect"]),fill=False,cross_out=False)
  p.apply_redactions(images=0,graphics=0,text=0)
  for q in spec:
   p.draw_rect(fitz.Rect(q["markerRect"]),color=None,fill=(1,1,1),overlay=True)
   w=fitz.Widget();w.field_name=q["labelField"];w.field_type=fitz.PDF_WIDGET_TYPE_TEXT;w.field_flags=fitz.PDF_FIELD_IS_READ_ONLY;w.rect=fitz.Rect(q["rect"]);w.field_value="";w.text_font="Helv";w.text_fontsize=8;w.border_width=0;w.fill_color=None;p.add_widget(w)
  after_img=asimg(p)
  diff=ImageChops.difference(before_img,after_img);mask_img=Image.new("RGB",diff.size,(0,0,0));dr=ImageDraw.Draw(mask_img)
  for r in areas:dr.rectangle([int(r.x0*3)-3,int(r.y0*3)-3,int(r.x1*3)+3,int(r.y1*3)+3],fill=(255,255,255))
  assert ImageChops.subtract(diff,mask_img).getbbox() is None,(year,"artwork changed outside precise label/marker regions")
  temp=outdir/(year+"-blank.pdf");doc.save(temp,garbage=4,deflate=True);doc.close()
  manifest[year]={"path":file,"fieldsBefore":len(before),"rows":spec}
  # Populate default names with the same repo font; default template also readable
  # for cached older clients. Existing widgets are not regenerated in this step.
  js=r"""const fs=require('fs'),P=require('./assets/vendor/pdf-lib.min.js'),fk=require('./assets/vendor/fontkit.umd.min.js');
(async()=>{const [input,output,rowsPath,fontPath]=process.argv.slice(1);const doc=await P.PDFDocument.load(fs.readFileSync(input));doc.registerFontkit(fk);const font=await doc.embedFont(fs.readFileSync(fontPath),{subset:false});const form=doc.getForm();
for(const r of JSON.parse(fs.readFileSync(rowsPath,'utf8'))){const f=form.getTextField(r.labelField);const rect=f.acroField.getWidgets()[0].getRectangle();let size=10;while(size>=7&&(font.widthOfTextAtSize(r.name,size)>rect.width-2||font.heightAtSize(size)>rect.height-1))size-=.25;if(size<7)throw Error('label size '+r.name);f.setText(r.name);f.setFontSize(size);f.enableReadOnly();f.updateAppearances(font);
 const box=form.getCheckBox(r.checkbox);box.uncheck();box.updateAppearances((_f,w)=>{const {width,height}=w.getRectangle(),x=width/2,y=height/2,d=Math.min(width,height)*.41,c=P.rgb(.12,.12,.12);const draw=on=>[P.pushGraphicsState(),P.setStrokingColor(c),P.setFillingColor(c),P.setLineWidth(.65),P.moveTo(x,y+d),P.lineTo(x+d,y),P.lineTo(x,y-d),P.lineTo(x-d,y),P.closePath(),on?P.fill():P.stroke(),P.popGraphicsState()];return {normal:{on:draw(true),off:draw(false)},down:{on:draw(true),off:draw(false)}}});
 }
fs.writeFileSync(output,await doc.save({updateFieldAppearances:false}));})().catch(e=>{console.error(e);process.exitCode=1});"""
  # PDF-lib's CFF subsetter can produce an invalid font in MuPDF.
  # Subset the original OTF with fontTools, then embed that valid OTF whole.
  smallfont=outdir/(year+"-labels.otf")
  opts=subset.Options();opts.retain_gids=True;ft=subset.load_font(str(ROOT/"assets/fonts/NotoSansCJKtc-Regular.otf"),opts)
  sub=subset.Subsetter(options=opts);sub.populate(text="".join(q["name"] for q in spec));sub.subset(ft);subset.save_font(ft,str(smallfont),opts)
  meta=outdir/(year+"-rows.json");meta.write_text(json.dumps(spec,ensure_ascii=False),encoding="utf8");dest=outdir/(year+"-candidate.pdf")
  subprocess.run(["node","-e",js,str(temp),str(dest),str(meta),str(smallfont)],cwd=ROOT,check=True)
  verified=fitz.open(dest);after=fields(verified)
  assert len(after)==len(before)+18
  skill_checks={q["checkbox"] for q in spec}
  for k,v in before.items():
   # Existing 2014 checkboxes can have no /V; explicit /Off is the same unchecked state.
   if k in skill_checks:
    assert len(v)==len(after[k])==1 and v[0][:-1]==after[k][0][:-1] and v[0][-1] in ("","Off",None) and after[k][0][-1]=="Off",(year,k,"checkbox semantics changed")
   else:assert after[k]==v,(year,k,"original field changed")
  assert all(after[q["labelField"]][0][4]==q["name"] for q in spec),(year,"name values")
  for q in spec:
   rr=fitz.Rect(q["rect"])
   # Read actual renderer glyphs within each row, not just the AcroForm /V.
   spans=[sp for b in verified[0].get_text("dict")["blocks"] for ln in b.get("lines",[]) for sp in ln["spans"] if rr.contains(fitz.Point(sp["origin"])) and sp["text"].strip()]
   assert "".join(sp["text"].strip() for sp in spans)==q["name"],(year,q["skill"],spans)
   zz=verified[0].get_pixmap(matrix=fitz.Matrix(4,4),clip=rr,alpha=False)
   assert min(zz.samples)<100,(year,"blank rendered label",q["name"])
  for pi in range(1,len(verified)):
   original=fitz.open(stream=b,filetype="pdf")
   assert ImageChops.difference(asimg(original[pi]),asimg(verified[pi])).getbbox() is None,(year,"non-skill page changed",pi)
   original.close()
  clip=fitz.Rect(92,315,205,568) if year=="2014" else fitz.Rect(12,178,209,606)
  verified[0].get_pixmap(matrix=fitz.Matrix(3,3),clip=clip).save(outdir/(year+"-template.png"));verified.close()
  print(year,"original fields",len(before),"candidate fields",len(after),"all original form identities and non-skill graphics preserved",flush=True)
 # Only after both templates pass do we write the isolated repository worktree.
 for year,record in manifest.items():(ROOT/record["path"]).write_bytes((outdir/(year+"-candidate.pdf")).read_bytes())
 (outdir/"template-report.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
 print("PASS exact 36 original label positions and all original fields")
if __name__=="__main__":main()
