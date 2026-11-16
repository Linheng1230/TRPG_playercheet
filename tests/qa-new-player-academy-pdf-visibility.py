#!/usr/bin/env python3
"""Workstream 90 read-only PDF visibility regression.

Requires the already-generated, QA-isolated 2024 PDF and its exporter fit report.
A fit 'overflow:false' is not proof that every line reached the PDF page.
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path

BASE = Path(r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\new-player-90")
PDF = Path(os.environ.get("QA_PDF_FILE", str(BASE / "pdf-export-fix-smoke.pdf")))
REPORT = Path(os.environ.get("QA_PDF_FIT_REPORT", str(BASE / "qa-pdf-export-fixes.json")))
normalize = lambda s: re.sub(r"\s+", "", str(s))

if not PDF.is_file() or not REPORT.is_file():
    print(json.dumps({"status": "BLOCKED", "reason": "PDF or fit report absent",
                      "pdf": str(PDF), "report": str(REPORT)}, ensure_ascii=False))
    sys.exit(2)

try:
    import pymupdf
    fit = json.loads(REPORT.read_text(encoding="utf-8"))["fit"]["species"]
    expected = normalize(fit["text"])
    if len(expected) < 30:
        raise ValueError("species expected text is too short; cannot validate visibility")
    with pymupdf.open(PDF) as d:
        extracted = normalize("\n".join(page.get_text() for page in d))
        pages = len(d)
    expected_tail = expected[-12:]
    expected_start = expected[:12]
    tail_visible = expected_tail in extracted
    start_visible = expected_start in extracted
    has_full_text = expected in extracted
    # Fail if the trailing content is absent, even when fit claims no overflow.
    status = "PASS" if has_full_text and tail_visible and start_visible else "FAIL"
    output = {
        "test": "2024 PDF species full-text visible/read-back",
        "status": status,
        "pdf": str(PDF),
        "pdfSha256": hashlib.sha256(PDF.read_bytes()).hexdigest(),
        "fitReportSha256": hashlib.sha256(REPORT.read_bytes()).hexdigest(),
        "pages": pages,
        "fitClaimsNoOverflow": fit.get("overflow") is False,
        "expectedTextLength": len(expected),
        "expectedStart": expected_start,
        "expectedTail": expected_tail,
        "startVisible": start_visible,
        "tailVisible": tail_visible,
        "fullTextVisible": has_full_text,
        "classification": ("FALSE_PASS_FROM_FIT_REPORT" if status == "FAIL"
                           and fit.get("overflow") is False else status),
        "scope": "existing 2024 PDF baseline; not evidence of new academy integration",
    }
    print(json.dumps(output, ensure_ascii=True, indent=2))
    sys.exit(0 if status == "PASS" else 1)
except Exception as exc:
    print(json.dumps({"status": "ERROR", "reason": str(exc)}, ensure_ascii=True))
    sys.exit(3)
