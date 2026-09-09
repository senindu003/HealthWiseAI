"""Render the saved official CPS practice point as a local full-tree PDF."""
from __future__ import annotations

from pathlib import Path

from lxml import html
from PyPDF2 import PdfReader
from xhtml2pdf import pisa


ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "knowledge-sources/wave1/html/canadian_paediatric_society_uncomplicated_pneumonia.html"
PDF = ROOT / "knowledge-sources/wave1/pdf/canadian_paediatric_society_uncomplicated_pneumonia.html-render.pdf"


def main() -> None:
    source = HTML.read_text(encoding="utf-8")
    document = html.document_fromstring(source)
    wrappers = document.xpath(
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' statement-wrapper ')]"
    )
    if len(wrappers) != 1:
        raise RuntimeError(f"Expected one CPS statement wrapper, found {len(wrappers)}")

    # Preserve the official article while discarding navigation, sharing widgets,
    # scripts, and images that do not aid retrieval.
    article = wrappers[0]
    for node in article.xpath(".//script | .//style | .//noscript | .//img | .//svg | .//iframe | .//button"):
        node.drop_tree()
    for node in article.xpath(
        ".//*[contains(concat(' ', normalize-space(@class), ' '), ' --podcast ') "
        "or contains(concat(' ', normalize-space(@class), ' '), ' sharethis-inline-share-buttons ')]"
    ):
        node.drop_tree()
    article_markup = html.tostring(article, encoding="unicode", method="html")
    markup = """<!doctype html>
<html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 1.5cm; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.42; color: #162238; }
h1 { color: #063f78; font-size: 19pt; line-height: 1.2; }
h2 { color: #063f78; font-size: 14pt; margin-top: 18pt; }
h3 { color: #063f78; font-size: 12pt; margin-top: 14pt; }
a { color: #063f78; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 0.5pt solid #aab8c6; padding: 5pt; vertical-align: top; }
.provenance { color: #455a70; font-size: 8.5pt; border-bottom: 0.5pt solid #aab8c6; padding-bottom: 7pt; }
</style></head><body>
<p class="provenance"><b>Official source rendering for retrieval:</b> Canadian Paediatric Society; source URL: https://cps.ca/en/documents/position/pneumonia-management-children-youth; downloaded 2026-09-06.</p>
""" + article_markup + "</body></html>"
    PDF.parent.mkdir(parents=True, exist_ok=True)
    with PDF.open("wb") as stream:
        result = pisa.CreatePDF(markup, dest=stream, path=str(HTML.parent))
    if result.err:
        raise RuntimeError("CPS HTML-to-PDF rendering failed")
    print(PDF)
    print(f"pages={len(PdfReader(PDF).pages)}")


if __name__ == "__main__":
    main()
