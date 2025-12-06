from collections import OrderedDict
from pathlib import Path

import numpy as np
from astroquery.simbad import Simbad

Simbad.reset_votable_fields()
Simbad.add_votable_fields("flux(V)", "sptype")


def _extract_field(table, column: str):
    value = table[column][0]
    if np.ma.is_masked(value):
        return None
    return value


def get_star_info(name: str):
    table = Simbad.query_object(name)
    if table is None or len(table) == 0:
        return None

    ra = _extract_field(table, "ra")
    dec = _extract_field(table, "dec")
    vmag = _extract_field(table, "V")
    sp_type = _extract_field(table, "sp_type")
    if ra is None or dec is None:
        return None
    return ra, dec, vmag, sp_type

STARS_PATH = Path(__file__).resolve().parents[1] / "data" / "stars.js"
MISSING_PATH = Path(__file__).resolve().parents[1] / "missing-stars.txt"


def _extract_entries(body: str) -> list[str]:
    entries = []
    i = 0
    length = len(body)
    while i < length:
        if body[i] == "{":
            start = i
            depth = 0
            while i < length:
                if body[i] == "{":
                    depth += 1
                elif body[i] == "}":
                    depth -= 1
                    if depth == 0:
                        entries.append(body[start : i + 1])
                        i += 1
                        break
                i += 1
        else:
            i += 1
    return entries


def _parse_entry(entry: str) -> OrderedDict[str, str]:
    content = entry.strip()[1:-1]
    fields: OrderedDict[str, str] = OrderedDict()
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        if line.endswith(","):
            line = line[:-1]
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    return fields


def _render_entry(fields: OrderedDict[str, str]) -> str:
    lines = ["    {"]
    items = list(fields.items())
    for idx, (key, value) in enumerate(items):
        line = f"        {key}: {value}"
        if idx < len(items) - 1:
            line += ","
        lines.append(line)
    lines.append("    }")
    return "\n".join(lines)


def _sexagesimal_to_decimal(value: str | float, is_ra: bool) -> float:
    text_value = value if isinstance(value, str) else str(value)
    sanitized = text_value.strip().replace("−", "-")
    if " " not in sanitized and ":" not in sanitized:
        return float(sanitized)
    parts = sanitized.split()
    if len(parts) < 3:
        raise ValueError(f"Unexpected sexagesimal format: {value}")
    base = float(parts[0])
    minutes = float(parts[1])
    seconds = float(parts[2])
    if not is_ra:
        sign = -1 if parts[0].startswith("-") else 1
        base = abs(base)
        return sign * (base + minutes / 60 + seconds / 3600)
    return (base + minutes / 60 + seconds / 3600) * 15


def _update_star(fields: OrderedDict[str, str]) -> tuple[OrderedDict[str, str], bool, str | None]:
    raw_name = fields.get("nameSIMBAD")
    if raw_name is None:
        return fields, False, None
    name = raw_name.strip().strip("'\"")
    star_info = get_star_info(name)
    if star_info is None:
        return fields, False, name

    ra_str, dec_str, magnitude, sp_type = star_info
    ra = _sexagesimal_to_decimal(ra_str, is_ra=True)
    dec = _sexagesimal_to_decimal(dec_str, is_ra=False)
    fields["ra"] = f"{ra:.6f}"
    fields["dec"] = f"{dec:.6f}"
    if magnitude is None:
        mag_value = None
    else:
        try:
            mag_value = float(magnitude)
        except (TypeError, ValueError):
            mag_value = None
    if mag_value is not None:
        fields["magnitude"] = f"{mag_value:.2f}"
    if sp_type is not None:
        fields["sp_type"] = f"'{sp_type}'"
    return fields, True, None


def main() -> None:
    text = STARS_PATH.read_text(encoding="utf-8")
    start = text.index("[")
    end = text.rindex("]")
    header = text[: start + 1]
    footer = text[end:]
    body = text[start + 1 : end]

    entries = _extract_entries(body)
    updated_entries = []
    missing = []

    for entry in entries:
        fields = _parse_entry(entry)
        fields, updated, missing_name = _update_star(fields)
        updated_entries.append(fields)
        if missing_name:
            missing.append(missing_name)

    rendered = []
    for idx, fields in enumerate(updated_entries):
        entry_text = _render_entry(fields)
        if idx < len(updated_entries) - 1:
            entry_text += ","
        rendered.append(entry_text)

    new_body = "\n\n".join(rendered)
    result = f"{header}{new_body}\n{footer}"
    STARS_PATH.write_text(result, encoding="utf-8")

    if missing:
        MISSING_PATH.write_text("\n".join(missing) + "\n", encoding="utf-8")
        print(f"Missing data for {len(missing)} stars, see {MISSING_PATH}")
    else:
        if MISSING_PATH.exists():
            MISSING_PATH.unlink()

    print("Completed rewriting stars.js")


if __name__ == "__main__":
    main()
