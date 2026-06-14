#!/usr/bin/env python3
"""
fix-theme-fields.py
Scans all theme JSON files and ensures required fields are present.
Adds missing 'backgroundImage' (null) and 'version' ("2.1") fields.

Usage:
  python3 scripts/fix-theme-fields.py          # dry-run, report only
  python3 scripts/fix-theme-fields.py --apply   # actually fix files
"""
import json
import glob
import sys
import os

REQUIRED_DEFAULTS = {
    "backgroundImage": None,
    "version": "2.1",
}

def main():
    apply = "--apply" in sys.argv
    themes_dir = os.path.join(os.path.dirname(__file__), "..", "src", "content", "themes")
    files = sorted(glob.glob(os.path.join(themes_dir, "*.json")))

    if not files:
        print("No theme files found.")
        return

    fixed_count = 0
    for filepath in files:
        filename = os.path.basename(filepath)
        with open(filepath) as f:
            data = json.load(f)

        missing = {}
        for key, default in REQUIRED_DEFAULTS.items():
            if key not in data:
                missing[key] = default

        if not missing:
            print(f"  ✅ {filename}")
            continue

        fixed_count += 1
        details = ", ".join(f"{k}={json.dumps(v)}" for k, v in missing.items())
        print(f"  🔧 {filename}: missing {details}")

        if apply:
            # Insert fields in logical positions
            new_data = {}
            inserted = set()
            for key in data:
                new_data[key] = data[key]
                # Insert backgroundImage right after backgroundColor
                if key == "backgroundColor" and "backgroundImage" in missing:
                    new_data["backgroundImage"] = None
                    inserted.add("backgroundImage")
                # Insert version right after isDark
                if key == "isDark" and "version" in missing:
                    new_data["version"] = "2.1"
                    inserted.add("version")
            # Append any remaining fields at the end
            for key, default in missing.items():
                if key not in inserted:
                    new_data[key] = default

            with open(filepath, "w") as f:
                json.dump(new_data, f, indent=2, ensure_ascii=False)
                f.write("\n")

    print(f"\n{fixed_count} file(s) {'would be' if not apply else ''} fixed out of {len(files)} total.")
    if fixed_count > 0 and not apply:
        print("Run with --apply to write changes.")

if __name__ == "__main__":
    main()
