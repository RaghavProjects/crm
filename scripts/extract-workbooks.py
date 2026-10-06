"""Extract the shared workbook rows into scripts/workbook-data.json.
Run: python3 scripts/extract-workbooks.py
"""
import json
import pandas as pd

ASSETS = "/Users/lakshmi/Downloads/CRM/Ram Prasad Assets"


def read(path, sheet):
    return pd.read_excel(path, sheet_name=sheet, header=None)


def find_header(df, key="SN"):
    for i in range(min(len(df), 10)):
        row = [str(v).strip().upper() if pd.notna(v) else "" for v in df.iloc[i].tolist()]
        if any(key == c or key + "." == c or c.startswith(key) for c in row):
            return i
    return 0


def rows_with_header(df, header_idx, key_col):
    cols = [str(v).strip() if pd.notna(v) else "" for v in df.iloc[header_idx].tolist()]

    def clean(v):
        if pd.isna(v):
            return ""
        if hasattr(v, "isoformat"):
            return v.date().isoformat()
        return str(v).strip()

    out = []
    for i in range(header_idx + 1, len(df)):
        vals = [clean(v) for v in df.iloc[i].tolist()]
        rec = dict(zip(cols, vals))
        if rec.get(key_col, ""):
            out.append(rec)
    return out


data = {}

# Enquiries
df = read(f"{ASSETS}/1. Enquries  26-27.xls", "MASTER ENQ QTNS")
h = find_header(df)
data["enquiries"] = rows_with_header(df, h, "ENQ No.")

# Master POs (enquiries file, second sheet)
df = read(f"{ASSETS}/1. Enquries  26-27.xls", "Master POs")
h = find_header(df)
data["pos"] = rows_with_header(df, h, "PO No")

# Quotations
df = read(f"{ASSETS}/2.. Quotation 26-27 .xlsx", "26-27")
h = find_header(df)
data["quotations"] = rows_with_header(df, h, "Qtn Ref")

# Orders (the third workbook, first sheet)
df = read(f"{ASSETS}/3. Orderts 26-27.xls", 0)
h = find_header(df, "SLNO")
data["orders"] = rows_with_header(df, h, "PO NO.")

# OEM master
df = read(f"{ASSETS}/7. Master List of OEM.xls", "Master OEM")
h = find_header(df)
data["oems"] = rows_with_header(df, h, "OEM")

# Customers master
df = read(f"{ASSETS}/8. Master List of Customers.xls", "Master Customer")
h = find_header(df)
data["customers"] = rows_with_header(df, h, "Customer")

with open("/Users/lakshmi/Downloads/CRM/scripts/workbook-data.json", "w") as f:
    json.dump(data, f, indent=1)

for k, v in data.items():
    print(k, len(v))
