"""Inspect manually downloaded Wave 1 PDFs before registering them in the manifest."""

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PDF_ROOT = ROOT / "knowledge-sources" / "wave1" / "pdf"


def main() -> None:
    # Downloader-managed files use document IDs beginning with www_/iris_.
    manual_files = [
        path for path in PDF_ROOT.glob("*.pdf")
        if not path.name.startswith(("www_", "iris_"))
    ]
    for path in sorted(manual_files, key=lambda item: item.name.lower()):
        try:
            result = subprocess.run(
                ["pdfinfo", str(path)],
                check=True,
                capture_output=True,
                text=True,
            )
            fields = {}
            for line in result.stdout.splitlines():
                if ":" in line:
                    key, value = line.split(":", 1)
                    fields[key.strip()] = value.strip()
            print(f"FILE: {path.name}")
            print(f"PAGES: {fields.get('Pages', '(unknown)')}")
            print(f"TITLE: {fields.get('Title', '(not set)')}")
            print(f"CREATOR: {fields.get('Creator', '(not set)')}")
        except Exception as exc:
            print(f"FILE: {path.name}\nERROR: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
