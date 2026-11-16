"""Build original-watercolor-preserving transparent class sprite atlas.

Input:  assets/watercolor-class-icons-source.webp (unchanged original RGB artwork)
Output: assets/watercolor-class-icons.webp (672x270 lossless RGBA)
Tile IDs and positions remain 4 columns x 3 rows of 168x90.
Requires Pillow, numpy, opencv-python. No generative redraw or new design system.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
import cv2
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"assets"/"watercolor-class-icons-source.webp"
TARGET=ROOT/"assets"/"watercolor-class-icons.webp"
REPORT=Path(r"D:\Tools\zizi-ai-runtime\visual-skill-golden-20261116\alpha-build.json")

def run():
    image=np.asarray(Image.open(SOURCE).convert("RGB"),dtype=np.uint8)
    assert image.shape==(270,672,3),image.shape
    out=np.zeros((270,672,4),dtype=np.uint8)
    reports=[]
    for index in range(12):
        x0=(index%4)*168;y0=(index//4)*90
        rgb=image[y0:y0+90,x0:x0+168].copy()
        perimeter=np.concatenate((rgb[:3].reshape(-1,3),rgb[-3:].reshape(-1,3),rgb[:,:8].reshape(-1,3),rgb[:,-8:].reshape(-1,3)))
        backdrop=np.median(perimeter,axis=0).astype(np.uint8)
        lab=cv2.cvtColor(rgb,cv2.COLOR_RGB2LAB).astype(np.float32)
        bg_lab=cv2.cvtColor(backdrop.reshape(1,1,3),cv2.COLOR_RGB2LAB).astype(np.float32)[0,0]
        delta=np.linalg.norm((lab-bg_lab)*np.array([1,1.25,1.25]),axis=2)
        mask=np.full((90,168),cv2.GC_PR_BGD,np.uint8)
        mask[delta>19]=cv2.GC_PR_FGD
        mask[delta>38]=cv2.GC_FGD
        mask[:3]=cv2.GC_BGD;mask[-3:]=cv2.GC_BGD;mask[:,:6]=cv2.GC_BGD;mask[:,-6:]=cv2.GC_BGD
        assert np.count_nonzero(mask==cv2.GC_FGD)>40, f"Foreground seed missing: {index}"
        b=np.zeros((1,65),np.float64);f=np.zeros((1,65),np.float64)
        cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),mask,None,b,f,6,cv2.GC_INIT_WITH_MASK)
        alpha=(np.uint8((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD)))*255
        total,labels,stats,_=cv2.connectedComponentsWithStats(alpha,8)
        for component in range(1,total):
            if stats[component,cv2.CC_STAT_AREA]<5:alpha[labels==component]=0
        alpha=cv2.GaussianBlur(alpha,(3,3),.55)
        # Old paper card includes a separate thin line at the top of tiles 4 and 8.
        # Its 0..14px stripe is not the watercolor class symbol (verified on original atlas).
        if index in (3,7):alpha[:15,:]=0
        diff=np.max(abs(rgb.astype(np.float32)-backdrop.astype(np.float32)),axis=2)
        weights=np.clip(diff/120.0,0,1)*alpha.astype(np.float32)/255
        weights[diff<50]=0
        cols=np.arange(168,dtype=np.float32)
        weight=weights.sum()
        assert weight>100, f"Insufficient visible art: {index}"
        cx=float((weights*cols.reshape(1,-1)).sum()/weight)
        xshift=int(round(83.5-cx))
        assert abs(xshift)<=26,(index,cx,xshift)
        # Relocate the *original* pixels/alpha together, never hallucinate/repaint art.
        relocated=np.zeros((90,168,4),dtype=np.uint8)
        rgba=np.dstack((rgb,alpha))
        if xshift>=0:
            relocated[:,xshift:]=rgba[:,:168-xshift]
            discarded=rgba[:,168-xshift:,3]
        else:
            relocated[:,:168+xshift]=rgba[:,-xshift:]
            discarded=rgba[:,:-xshift,3]
        discarded_fraction=float(discarded.astype(np.float32).sum()/max(1,alpha.astype(np.float32).sum()))
        assert discarded_fraction<.002, f"Art crop at {index}: {discarded_fraction}"
        out[y0:y0+90,x0:x0+168]=relocated
        reports.append(dict(classIndex=index,centerBefore=round(cx,2),horizontalShift=xshift,discardedAlphaFraction=round(discarded_fraction,6),transparentPercent=round(float(np.mean(relocated[:,:,3]<5))*100,2),sourceBackground=backdrop.tolist()))
    rendered=Image.fromarray(out,"RGBA")
    rendered.save(TARGET,format="WEBP",lossless=True,method=6)
    readback=np.asarray(Image.open(TARGET).convert("RGBA"),dtype=np.uint8)
    assert readback.shape==out.shape,"WEBP shape mismatch"
    assert np.array_equal(readback[:,:,3],out[:,:,3]),"WEBP alpha readback mismatch"
    visible=out[:,:,3]>0
    assert np.array_equal(readback[:,:,:3][visible],out[:,:,:3][visible]),"WEBP visible RGB readback mismatch"
    assert np.mean(readback[:,:,3]<5)>.65,"Unexpected paper opacity"
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    record=dict(sourceSha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                outputSha256=hashlib.sha256(TARGET.read_bytes()).hexdigest(),
                sourceSize=[672,270],outputSize=list(readback.shape[:2][::-1]),
                globallyTransparentPercent=round(float(np.mean(readback[:,:,3]<5))*100,2),
                rgbaReadbackVerified=True,tiles=reports)
    REPORT.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf-8")
    print("SUCCESS transparent atlas: 12 original watercolor icons, RGBA, lossless; alpha transparent",record["globallyTransparentPercent"],"%")
    print("shifts",[(t["classIndex"],t["horizontalShift"]) for t in reports])

if __name__=="__main__":run()
