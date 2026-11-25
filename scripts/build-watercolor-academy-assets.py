#!/usr/bin/env python3
"""Build the canonical reusable fantasy watercolor asset library.

Keeps the six original PNGs byte-identical; creates WEBP derivatives, 12 isolated
transparent icons and selected decorative crops. This script NEVER deletes
unrelated assets, so new future artwork can live in this same directory.
"""
from __future__ import annotations
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "assets" / "art" / "watercolor-academy"
INCOMING = Path(r"D:\Tools\zizi-ai-runtime\dnd5r-generated-assets-20261125\incoming")
ORIGINALS = LIB / "source"
WEB = LIB / "web"
SOURCES = {
    "icons": ("icons-original.png", "58609ee8bde12da18f2f5ca320ff0d13b0d1e4f24125f412eaff2c7e00b36544"),
    "ornaments": ("ornaments-original.png", "41232c0d55427004814fcb1a7b637fc52acfec22a6aa83220eab5db78ea14200"),
    "frames": ("frames-original.png", "4f0900048ec84d34aefd7108cd12182802a3f3ced61c1d4a416c063ef8653286"),
    "arcade": ("arcade-original.png", "29938acb69c19e136fe2e330ef7604a8da464677dc44ee67f5c88e23fe7edc7c"),
    "landscape": ("landscape-original.png", "225eafba66f1befd0dae52cdde6ee7b4c05d4e1e75c45344c1c1ea8dbe35d9a6"),
    "parchment": ("parchment-original.png", "13648ae269b4294c9c4b74aad6841c727eeb83612d13936b0d173ea7e02982e2"),
}
ICON_NAMES = ("book", "wizard", "warrior", "ranger", "dice", "map", "backpack", "potion", "species", "feat", "rest", "vault")
ORNAMENT_REGIONS = {
    "compass-blue": (20, 3, 358, 205),
    "compass-cream": (346, 0, 642, 203),
    "laurel": (0, 197, 314, 400),
    "wax-seal-red": (758, 199, 1006, 393),
    "ribbon-parchment": (0, 395, 380, 538),
    "divider-vines": (619, 718, 899, 792),
    "book-flourish": (1132, 887, 1448, 1086),
}

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def rel(path: Path) -> str:
    return path.relative_to(LIB).as_posix()

def image_info(path: Path) -> dict:
    with Image.open(path) as im:
        return {"size": [im.width, im.height], "mode": im.mode, "bytes": path.stat().st_size, "sha256": sha(path)}

def save_web(im: Image.Image, path: Path, lossless: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.mode not in ("RGBA", "RGB"):
        im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
    im.save(path, "WEBP", quality=88, method=6, lossless=lossless, exact=True)

def trim_alpha(tile: Image.Image, pad: int = 10) -> Image.Image:
    rgba = tile.convert("RGBA")
    box = rgba.getchannel("A").point(lambda a: 255 if a > 7 else 0).getbbox()
    if box is None:
        raise ValueError("No visible artwork in tile")
    a,b,c,d = box
    return rgba.crop((max(0,a-pad),max(0,b-pad),min(rgba.width,c+pad),min(rgba.height,d+pad)))

def main() -> None:
    for d in (ORIGINALS, WEB):
        d.mkdir(parents=True, exist_ok=True)
    assets = []
    source_records = []
    for name, (filename, expected) in SOURCES.items():
        src = ORIGINALS / filename
        if not src.exists():
            staged = INCOMING / filename
            if not staged.exists() or sha(staged) != expected:
                raise RuntimeError(f"Original missing or SHA mismatch: {filename}")
            shutil.copy2(staged, src)
        if sha(src) != expected:
            raise RuntimeError(f"Original altered: {src}")
        source_records.append({"id": name, "path": rel(src), **image_info(src)})
        with Image.open(src) as im:
            dest = WEB / f"{name}-atlas.webp" if name in ("icons","ornaments","frames") else WEB / f"{name}.webp"
            save_web(im, dest)
        assets.append({"id": f"{name}-atlas" if name in ("icons","ornaments","frames") else name,
                       "kind": "source-atlas" if name in ("icons","ornaments","frames") else "background",
                       "source": rel(src), "web": rel(dest), **image_info(dest),
                       "status":"ready", "usage": {
                           "icons":"Source sheet for twelve standalone icons; use web/icons/ for UI.",
                           "ornaments":"Painted ornament sheet; use isolated web/ornaments/ elements for UI.",
                           "frames":"Decorative frame reference; do not overlay text until cropped and checked.",
                           "arcade":"Wide academy interior hero / section banner; keep text in opaque panel.",
                           "landscape":"Wide cliffside scenery for decorative header / background.",
                           "parchment":"Subtle parchment section texture; preserve text contrast."
                       }[name]})
    icons_source = ORIGINALS / SOURCES["icons"][0]
    with Image.open(icons_source) as im:
        width,height = im.size
        if (width,height)!=(1448,1086) or im.mode!="RGBA":
            raise RuntimeError("Icon layout contract changed")
        for n,name in enumerate(ICON_NAMES):
            col,row=n%4,n//4
            tile=im.crop((col*362,row*362,(col+1)*362,(row+1)*362))
            tile=trim_alpha(tile)
            dest=WEB / "icons" / f"{name}.webp"
            save_web(tile,dest)
            assets.append({"id":f"icon-{name}","kind":"icon","source":rel(icons_source),"web":rel(dest),
                           **image_info(dest),"status":"ready","usage":"Navigation/category illustration; provide adjacent readable label."})
    with Image.open(ORIGINALS / SOURCES["ornaments"][0]) as im:
        if im.size!=(1448,1086) or im.mode!="RGBA":
            raise RuntimeError("Ornament sheet layout changed")
        for name,region in ORNAMENT_REGIONS.items():
            tile=trim_alpha(im.crop(region),4)
            dest=WEB / "ornaments" / f"{name}.webp"
            save_web(tile,dest)
            assets.append({"id":f"ornament-{name}","kind":"ornament","source":rel(ORIGINALS / SOURCES["ornaments"][0]),"web":rel(dest),
                           **image_info(dest),"status":"ready","usage":"Decorative flourish; never substitute for a button label."})
    # Preserve future approved assets outside this six-sheet batch. Never reset
    # a co-owner's registered work when rebuilding these original derivatives.
    previous_path = LIB / "catalog.json"
    if previous_path.exists():
        previous = json.loads(previous_path.read_text(encoding="utf-8"))
        if previous.get("schema") != "dnd5r-watercolor-assets-v1":
            raise RuntimeError("Unsupported catalog schema; do not overwrite")
        known_source_ids = {entry["id"] for entry in source_records}
        known_asset_ids = {entry["id"] for entry in assets}
        for old_source in previous.get("sources", []):
            if old_source["id"] not in known_source_ids:
                path = LIB / old_source["path"]
                if not old_source["path"].startswith("source/") or not path.is_file() or sha(path) != old_source["sha256"]:
                    raise RuntimeError("Future source integrity failure: " + old_source["id"])
                source_records.append(old_source)
        for old_asset in previous.get("assets", []):
            if old_asset["id"] not in known_asset_ids:
                path = LIB / old_asset["web"]
                if not old_asset["web"].startswith("web/") or not path.is_file() or sha(path) != old_asset["sha256"]:
                    raise RuntimeError("Future web asset integrity failure: " + old_asset["id"])
                assets.append(old_asset)
    catalog = {
        "schema":"dnd5r-watercolor-assets-v1",
        "library_id":"watercolor-academy",
        "root":"assets/art/watercolor-academy/",
        "style_source":"docs/WATERCOLOR_VISUAL_SYSTEM.md",
        "provenance":"Original AI-generated artworks created for the user in November 2026; no third-party logos reused.",
        "future_assets_rule":"Add original to source/, derived WEBP to web/, then append a unique asset entry; never overwrite existing IDs.",
        "sources": source_records,
        "assets": assets
    }
    (LIB / "catalog.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"PASS LIBRARY {len(source_records)} originals, {len(assets)} web assets, root={LIB}")
    print("SOURCE_BYTES",sum((ORIGINALS / filename).stat().st_size for filename,_ in SOURCES.values()))
    print("WEB_BYTES",sum((LIB / a["web"]).stat().st_size for a in assets))
if __name__=="__main__":
    main()
