"""Create an audited, normalized copy of prognosis_kg.csv.

This script deliberately does not overwrite the source CSV.  It accepts the
raw file's duplicate binary feature headers and consolidates them with logical
OR (maximum of 0/1), preserving a traceable audit of every transformation.

The input dataset is a legacy vocabulary source only.  Column names produced
here are terminology labels; they are not clinical evidence or diagnostic
rules.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from typing import Iterable


# Approved merges.  Every member is a binary 0/1 source column.  If any member
# is 1 in a row, the output column is 1.
MERGE_TARGETS = {
    "Rash": "Rash",
    "Skin Rash": "Rash",
    "Dry Skin": "Dry or rough skin",
    "Rough Skin": "Dry or rough skin",
}

# Approved vocabulary changes.  Numbness and generalized body numbness remain
# separate because the legacy source uses them as different concepts.
RENAMES = {
    "Body Numbness": "Generalized body numbness",
    "Numbness": "Numbness (unspecified distribution)",
    "Burning Sensation": "Burning sensation (skin)",
    "Cold Body": "Feeling cold",
    "Cough With Mucus": "Productive cough",
    "Discharge": "Vaginal discharge",
    # User-selected legacy label. It must remain vocabulary-only: its presence
    # does not diagnose diabetes or establish an evidence-backed relationship.
    "Eye Problems": "Eye problems (likely diabetes)",
    "Fear of Wind": "Aerophobia (fear of drafts or fresh air)",
    "Heaviness": "Chest heaviness",
    "Abnormal Menstruation": "Menstrual irregularity",
    "Bladder Dysfunction": "Reduced bladder function",
    "Reduced Smell and Taste": "Reduced sense of smell and taste",
    "Throat Mucus": "Sensation of mucus in the throat",
    "Weak Joints": "Perceived joint weakness",
    "Weakness": "Generalized weakness",
    "Yellow Eyes": "Yellowing of eyes",
    "Yellow Skin": "Yellowing of skin",
}

# The raw English column "Cold" has a known Bengali-to-English translation
# collision.  It is removed from the normalised symptom columns, while the
# audit records how many positive values were excluded.
DROP_COLUMNS = {"Cold"}


def canonical_name(column_name: str) -> str | None:
    """Return the output name for one raw header, or None when retired."""
    if column_name in DROP_COLUMNS:
        return None
    if column_name in MERGE_TARGETS:
        return MERGE_TARGETS[column_name]
    return RENAMES.get(column_name, column_name)


def parse_binary(value: str, row_number: int, column_name: str) -> int:
    """Accept only 0/1 feature values and fail with an actionable message."""
    try:
        parsed = int(value)
    except ValueError as exc:
        raise ValueError(
            f"Row {row_number}, column '{column_name}' is not an integer 0/1: {value!r}"
        ) from exc
    if parsed not in (0, 1):
        raise ValueError(
            f"Row {row_number}, column '{column_name}' must be 0 or 1, got {parsed}."
        )
    return parsed


def output_columns(raw_header: Iterable[str]) -> list[str]:
    """Build stable output order, preserving the first appearance of each name."""
    columns: list[str] = []
    for name in raw_header:
        target = canonical_name(name)
        if target is not None and target not in columns:
            columns.append(target)
    if not columns or columns[0] != "prognosis":
        raise ValueError("The first column must be named 'prognosis'.")
    return columns


def normalize(input_path: Path, output_path: Path, audit_path: Path) -> None:
    with input_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.reader(source)
        raw_header = next(reader, None)
        if raw_header is None:
            raise ValueError("Input CSV is empty.")

        if raw_header.count("prognosis") != 1:
            raise ValueError("Expected exactly one 'prognosis' column.")

        targets = output_columns(raw_header)
        raw_header_counts = Counter(raw_header)
        duplicate_headers = {
            name: count for name, count in raw_header_counts.items() if count > 1
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        rows_written = 0
        retired_cold_positive_rows = 0

        with output_path.open("w", encoding="utf-8", newline="") as destination:
            writer = csv.DictWriter(destination, fieldnames=targets)
            writer.writeheader()

            for row_number, raw_row in enumerate(reader, start=2):
                if len(raw_row) != len(raw_header):
                    raise ValueError(
                        f"Row {row_number} has {len(raw_row)} values; "
                        f"expected {len(raw_header)}."
                    )

                normalized = {name: 0 for name in targets}
                for raw_name, raw_value in zip(raw_header, raw_row):
                    if raw_name == "prognosis":
                        normalized["prognosis"] = raw_value
                        continue

                    binary = parse_binary(raw_value, row_number, raw_name)
                    target = canonical_name(raw_name)
                    if target is None:
                        if raw_name == "Cold" and binary == 1:
                            retired_cold_positive_rows += 1
                        continue
                    normalized[target] = max(normalized[target], binary)

                writer.writerow(normalized)
                rows_written += 1

    audit = {
        "inputFile": str(input_path),
        "outputFile": str(output_path),
        "rowsWritten": rows_written,
        "rawColumnCount": len(raw_header),
        "outputColumnCount": len(targets),
        "duplicateRawHeadersMergedWithBinaryOr": duplicate_headers,
        "explicitMergeTargets": MERGE_TARGETS,
        "renamedColumns": RENAMES,
        "retiredColumns": {
            "Cold": {
                "reason": "Known Bengali-to-English translation collision; not retained as an atomic symptom.",
                "positiveValuesExcluded": retired_cold_positive_rows,
            }
        },
        "terminologyBoundary": (
            "This is a vocabulary normalization audit. It does not validate medical "
            "relationships, diagnose conditions, or create clinical rules."
        ),
    }
    with audit_path.open("w", encoding="utf-8") as audit_file:
        json.dump(audit, audit_file, indent=2, ensure_ascii=False)
        audit_file.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv", type=Path, help="Path to the original prognosis_kg.csv")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("prognosis_kg_amended.csv"),
        help="Destination CSV; defaults to prognosis_kg_amended.csv in the current directory.",
    )
    parser.add_argument(
        "--audit",
        type=Path,
        default=Path("prognosis_kg_amendment_audit.json"),
        help="Destination JSON audit; defaults to prognosis_kg_amendment_audit.json.",
    )
    arguments = parser.parse_args()
    normalize(arguments.input_csv, arguments.output, arguments.audit)
    print(f"Wrote normalized CSV: {arguments.output.resolve()}")
    print(f"Wrote audit file: {arguments.audit.resolve()}")


if __name__ == "__main__":
    main()
