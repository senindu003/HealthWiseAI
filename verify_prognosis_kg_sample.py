"""Read-only deterministic 10-row verification for the KG normalizer."""

import csv
import random
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT))

import normalize_prognosis_kg as normalizer


RAW_PATH = Path(r"C:\Users\Lenovo\Downloads\prognosis_kg.csv")
OUTPUT_PATH = PROJECT / "prognosis_kg_amended.csv"


def main() -> None:
    with RAW_PATH.open(encoding="utf-8-sig", newline="") as raw_file:
        raw_rows = list(csv.reader(raw_file))
    raw_header, raw_data = raw_rows[0], raw_rows[1:]

    with OUTPUT_PATH.open(encoding="utf-8", newline="") as output_file:
        output_rows = list(csv.DictReader(output_file))

    if len(raw_data) != len(output_rows):
        raise AssertionError("Source and output row counts differ.")

    targets = normalizer.output_columns(raw_header)
    sample_indices = random.Random(20260904).sample(range(len(raw_data)), 10)

    for index in sample_indices:
        expected = {name: 0 for name in targets}
        for raw_name, raw_value in zip(raw_header, raw_data[index]):
            if raw_name == "prognosis":
                expected["prognosis"] = raw_value
                continue
            target = normalizer.canonical_name(raw_name)
            if target is not None:
                expected[target] = max(
                    expected[target],
                    normalizer.parse_binary(raw_value, index + 2, raw_name),
                )

        actual = output_rows[index]
        differences = {
            key: (expected[key], actual[key])
            for key in targets
            if str(expected[key]) != actual[key]
        }
        if differences:
            raise AssertionError(
                f"Row {index + 2} ({expected['prognosis']}) mismatch: {differences}"
            )
        print(f"PASS source row {index + 2}: {expected['prognosis']}")

    print("10/10 deterministic random rows matched the documented transformation exactly.")


if __name__ == "__main__":
    main()
