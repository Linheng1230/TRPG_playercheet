#!/usr/bin/env python3
"""Reproducible source/catalog/consumer regression for shared watercolor art."""
import hashlib
import importlib.util
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
LIB=ROOT/"assets/art/watercolor-academy"
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def safe_path(value,prefix):
    p=Path(value)
    if p.is_absolute() or ".." in p.parts or not value.startswith(prefix+"/"):
        raise AssertionError(f"Unsafe asset path: {value}")
    q=(LIB/p).resolve()
    assert q.is_relative_to(LIB.resolve()), "Asset path escapes library"
    assert q.is_file(), f"Missing: {value}"
    return q
def check():
    spec=importlib.util.spec_from_file_location("artbuilder",ROOT/"scripts/build-watercolor-academy-assets.py")
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    data=json.loads((LIB/"catalog.json").read_text(encoding="utf-8"))
    assert data["schema"]=="dnd5r-watercolor-assets-v1"
    assert data["root"]=="assets/art/watercolor-academy/"
    assert data["style_source"]=="docs/WATERCOLOR_VISUAL_SYSTEM.md"
    sources=data["sources"]
    assets=data["assets"]
    assert len(sources)>=6 and len(assets)>=25
    source_ids={s["id"] for s in sources}
    assert len(source_ids)==len(sources)
    assert set(mod.SOURCES).issubset(source_ids), "All six artworks must remain preserved"
    for s in sources:
        p=safe_path(s["path"],"source")
        hash_expected=mod.SOURCES[s["id"]][1] if s["id"] in mod.SOURCES else s["sha256"]
        if s["id"] in mod.SOURCES: assert p.name==mod.SOURCES[s["id"]][0]
        assert sha(p)==hash_expected==s["sha256"],f"Original hash drift: {s['id']}"
        with Image.open(p) as im:
            im.verify()
    names=set()
    for item in assets:
        assert item["id"] not in names,"Duplicate ID"
        names.add(item["id"])
        assert item["status"]=="ready"
        assert item["kind"] in ("source-atlas","background","icon","ornament")
        assert item["usage"],"Missing usage"
        orig=safe_path(item["source"],"source")
        web=safe_path(item["web"],"web")
        assert web.suffix==".webp"
        assert sha(web)==item["sha256"],f"Derived hash drift: {item['id']}"
        with Image.open(web) as im:
            im.verify()
        with Image.open(web) as im:
            assert list(im.size)==item["size"],f"Dimension drift: {item['id']}"
            assert im.width>=48 and im.height>=48
            if item["kind"] in ("icon","ornament"):
                assert "A" in im.getbands(),f"Transparent background lost: {item['id']}"
                alpha=im.getchannel("A")
                a,b=alpha.getextrema()
                assert a==0 and b>=200,f"No visible alpha variation: {item['id']}"
    assert len([a for a in assets if a["kind"]=="icon"])==12
    assert len([a for a in assets if a["kind"]=="ornament"])>=7
    for doc in ("PROJECT_RULES.md","README.md","docs/WATERCOLOR_VISUAL_SYSTEM.md"):
        text=(ROOT/doc).read_text(encoding="utf-8")
        assert "assets/art/watercolor-academy/" in text,f"Missing shared art entry in {doc}"
        assert "catalog.json" in text,f"Missing catalog route in {doc}"
    workflow=(ROOT/".github/workflows/qa-creator-visual-golden.yml").read_text(encoding="utf-8")
    assert "assets/art/watercolor-academy/**" in workflow
    assert "python tests/qa-watercolor-academy-asset-library.py" in workflow
    print(f"PASS WATERCOLOUR_LIBRARY six originals / {len(assets)} web assets / 12 icons / {len([a for a in assets if a['kind']=='ornament'])} ornaments / 3 rule entrypoints / 1 CI gate")
if __name__=="__main__":
    check()
