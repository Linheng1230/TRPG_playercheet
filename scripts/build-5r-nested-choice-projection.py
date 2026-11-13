"""Rebuild only Wild Heart options omitted by flattening 5RTools refSubclassFeature nodes.
Source: pinned 5RTools PHB2024 snapshot; no manual mechanical rule text.
Run: python scripts/build-5r-nested-choice-projection.py
"""
from __future__ import annotations
import json
import os
import re
from pathlib import Path
from opencc import OpenCC

ROOT = Path(os.environ.get("FIVERTOOLS_ROOT", r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-2024"))
REPO = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data__class__class-barbarian.json"
OUTPUT = REPO / "assets" / "data" / "feature-5r-nested-choice-rules.js"
TARGET = {
    "Rage of the Wilds": ("野蠻人|野心之道|荒野之怒|3", 3, ("Bear", "Eagle", "Wolf")),
    "Aspect of the Wilds": ("野蠻人|野心之道|荒野形貌|6", 6, ("Owl", "Panther", "Salmon")),
    "Power of the Wilds": ("野蠻人|野心之道|荒野偉力|14", 14, ("Falcon", "Lion", "Ram")),
}
DISPLAY_NAMES = {
    "Bear": "熊", "Eagle": "鷹", "Wolf": "狼",
    "Owl": "貓頭鷹", "Panther": "黑豹", "Salmon": "鮭魚",
    "Falcon": "遊隼", "Lion": "雄獅", "Ram": "公羊",
}
converter = OpenCC("s2twp")
def plain(value: str) -> str:
    cleaned = re.sub(r"\{@[^ ]+\s+([^}|]+)(?:\|[^}]*)?\}", r"\1", str(value))
    cleaned = converter.convert(cleaned).replace("尺", "呎")
    return cleaned.strip()
def run() -> None:
    src = json.loads(SOURCE.read_text(encoding="utf-8"))
    feats = src["subclassFeature"]
    choices = {}
    for en_feature, (key, lv, expected) in TARGET.items():
        found = [x for x in feats if x.get("ENG_name") == en_feature and x.get("subclassShortName") == "Wild Heart" and x.get("level") == lv]
        if len(found) != 1:
            raise ValueError(f"Missing or duplicate upstream feature {en_feature}: {len(found)}")
        options = [x for x in found[0].get("entries", []) if isinstance(x, dict) and x.get("type") == "options"]
        if len(options) != 1 or options[0].get("count") != 1:
            raise ValueError(f"Unexpected canonical one-of schema for {en_feature}")
        rows = []
        for child in options[0]["entries"]:
            ref = child.get("subclassFeature", "").split("|")
            if child.get("type") != "refSubclassFeature" or len(ref) < 6:
                raise ValueError(f"Unexpected nested reference: {child}")
            cname = ref[0]
            matches = [x for x in feats if x.get("name") == cname and x.get("level") == lv and x.get("subclassShortName") == "Wild Heart"]
            if len(matches) != 1:
                raise ValueError(f"Missing or duplicate option {cname}: {len(matches)}")
            match = matches[0]
            en = match["ENG_name"]
            body = " ".join(plain(v) for v in match.get("entries", []) if isinstance(v, str))
            if not body or not DISPLAY_NAMES.get(en):
                raise ValueError(f"Missing body or label for {en}")
            rows.append({"name": DISPLAY_NAMES[en], "eng": en, "text": body})
        if tuple(x["eng"] for x in rows) != expected:
            raise ValueError(f"Source ordering changed for {en_feature}: {rows}")
        intro = " ".join(plain(v) for v in found[0].get("entries", []) if isinstance(v, str) and not v.startswith("{@i "))
        choices[key] = {"intro": intro, "count": 1, "options": rows}
    payload = json.dumps(choices, ensure_ascii=False, separators=(",", ":"))
    OUTPUT.write_text("/* Generated from pinned PHB2024 refSubclassFeature options; do not hand-edit. */\nwindow.ZIZI_5R_NESTED_CHOICE_RULES=Object.freeze(" + payload + ");\n", encoding="utf-8")
    print("Generated", OUTPUT.name, "features", len(choices), "options", sum(len(x["options"]) for x in choices.values()))
if __name__ == "__main__":
    run()
