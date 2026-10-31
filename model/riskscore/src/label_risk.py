#!/usr/bin/env python3
"""
label_risk.py - gán nhãn risk_level (Low / Medium / High) cho dữ liệu prototype.

Đầu vào : CSV/XLSX có các cột heart_rate, spo2, bmi, weight, height, temp
Đầu ra  : file mới có risk_level + các cột trung gian để truy vết từng nhãn

Nguồn quy tắc
  [1] Royal College of Physicians (2017). National Early Warning Score (NEWS) 2.
      -> điểm cho pulse, SpO2 (Scale 1), temperature và ngưỡng tổng hợp 5-6 / >=7,
         quy tắc "1 thông số đạt 3 điểm".
  [2] WHO Expert Consultation (2004). Appropriate body-mass index for Asian
      populations... Lancet 363:157-163 -> mốc BMI 18.5 / 23.0 / 27.5.

LƯU Ý: đây là quy tắc để tạo nhãn cho prototype, KHÔNG phải công cụ chẩn đoán.
NEWS2 gốc dùng 7 thông số; ở đây chỉ có 3 (pulse, SpO2, temp) nên đây là
phiên bản rút gọn, chưa được kiểm chứng lâm sàng.
"""
import argparse
import sys
from pathlib import Path

# Configure UTF-8 for console output on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import pandas as pd

NAME = {0: "Low", 1: "Medium", 2: "High"}

# Khoảng hợp lệ; ngoài khoảng => coi là lỗi cảm biến/nhập liệu, không gán nhãn.
VALID = {
    "heart_rate": (30, 220),
    "spo2": (70, 100),      # MAX30102 hay trả -999 hoặc 0 khi đọc lỗi
    "temp": (30.0, 43.0),
    "bmi": (10, 60),
    "weight": (20, 250),
    "height": (100, 230),
}
BMI_TOLERANCE = 0.5          # chênh lệch cho phép giữa bmi ghi sẵn và weight/height^2
MIN_CLASS_COUNT = 30         # cảnh báo nếu một lớp có ít mẫu hơn mức này

# True : BMI một mình tối đa chỉ đẩy lên Medium; High cần dấu hiệu sinh tồn bất thường.
#        (BMI >=27.5 là nguy cơ mạn tính ĐTĐ2/tim mạch, khác bản chất với nguy cơ cấp tính
#         của NEWS2, nên không để nó ngang hàng với SpO2 thấp + sốt cao.)
# False: ánh xạ 1:1 theo WHO 2004 (>=27.5 -> High).
BMI_CAP_AT_MEDIUM = True


def _half_up(x):
    return np.floor(np.asarray(x, dtype=float) + 0.5)


def pts_pulse(hr):
    """NEWS2 - Pulse (bpm): 51-90=0; 41-50 hoặc 91-110=1; 111-130=2; <=40 hoặc >=131=3."""
    hr = _half_up(hr)
    return np.select([hr <= 40, hr <= 50, hr <= 90, hr <= 110, hr <= 130],
                     [3, 1, 0, 1, 2], default=3)


def pts_spo2(s):
    """NEWS2 - SpO2 Scale 1 (%): >=96=0; 94-95=1; 92-93=2; <=91=3."""
    s = _half_up(s)
    return np.select([s >= 96, s >= 94, s >= 92], [0, 1, 2], default=3)


def pts_temp(t):
    """NEWS2 - Temperature (C): 36.1-38.0=0; 35.1-36.0 hoặc 38.1-39.0=1; >=39.1=2; <=35.0=3."""
    t = np.round(np.asarray(t, dtype=float), 1)
    return np.select([t <= 35.0, t <= 36.0, t <= 38.0, t <= 39.0],
                     [3, 1, 0, 1], default=2)


def bmi_level(b):
    """WHO 2004 (điểm hành động y tế công cộng cho người châu Á), kg/m2.
    <18.5 thiếu cân -> Medium (quyết định của người làm; WHO ghi nguy cơ bệnh đi kèm thấp
    nhưng tăng nguy cơ vấn đề lâm sàng khác); 18.5-22.9 -> Low;
    23.0-27.4 -> Medium (nguy cơ tăng); >=27.5 -> High (nguy cơ cao)."""
    b = np.round(np.asarray(b, dtype=float), 1)
    return np.select([b < 18.5, b < 23.0, b < 27.5], [1, 0, 1], default=2)


def bmi_category(b):
    b = np.round(np.asarray(b, dtype=float), 1)
    return np.select([b < 18.5, b < 23.0, b < 27.5],
                     ["Underweight", "Normal", "Overweight"], default="Obese")


def label(df: pd.DataFrame, bmi_cap_at_medium: bool = BMI_CAP_AT_MEDIUM) -> pd.DataFrame:
    df = df.copy()

    # --- QC ---------------------------------------------------------------
    flags = pd.Series("", index=df.index)
    for col, (lo, hi) in VALID.items():
        df[col] = pd.to_numeric(df[col], errors="coerce")
        bad = df[col].isna() | (df[col] < lo) | (df[col] > hi)
        flags = flags.where(~bad, flags + f"invalid_{col};")
    bmi_calc = df["weight"] / (df["height"] / 100) ** 2
    mismatch = (df["bmi"] - bmi_calc).abs() > BMI_TOLERANCE
    flags = flags.where(~mismatch, flags + "warn_bmi_mismatch;")
    df["qc_flag"] = flags
    ok = ~flags.str.contains("invalid_")

    # --- Gán nhãn trên các dòng hợp lệ ---------------------------------------
    d = df.loc[ok]
    p_hr, p_o2, p_t = pts_pulse(d.heart_rate), pts_spo2(d.spo2), pts_temp(d.temp)
    score = p_hr + p_o2 + p_t                       # 0..9 (NEWS2 rút gọn)
    single3 = np.maximum.reduce([p_hr, p_o2, p_t]) == 3

    vital = np.select([score >= 7, (score >= 5) | single3], [2, 1], default=0)
    bmi = bmi_level(d.bmi)
    if bmi_cap_at_medium:
        bmi = np.minimum(bmi, 1)
    final = np.maximum(vital, bmi)                  # lấy mức cao hơn của 2 trục
    driver = np.select([(vital == bmi) & (final > 0), vital > bmi, bmi > vital],
                       ["vital+bmi", "vital", "bmi"], default="none")

    for col in ["hr_pts", "spo2_pts", "temp_pts", "vital_score"]:
        df[col] = np.nan
    df.loc[ok, "hr_pts"], df.loc[ok, "spo2_pts"], df.loc[ok, "temp_pts"] = p_hr, p_o2, p_t
    df.loc[ok, "vital_score"] = score
    df["vital_level"] = None
    df["bmi_category"] = None
    df["bmi_level"] = None
    df["risk_level"] = None
    df["label_driver"] = None
    df.loc[ok, "vital_level"] = [NAME[i] for i in vital]
    df.loc[ok, "bmi_category"] = bmi_category(d.bmi)
    df.loc[ok, "bmi_level"] = [NAME[i] for i in bmi]
    df.loc[ok, "risk_level"] = [NAME[i] for i in final]
    df.loc[ok, "label_driver"] = driver
    return df


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("input", help="file .csv hoặc .xlsx")
    ap.add_argument("-o", "--output", help="mặc định: <input>_labeled.csv")
    ap.add_argument("--uncap-bmi", action="store_true", help="Không cap BMI tại Medium (cho phép BMI >= 27.5 -> High)")
    args = ap.parse_args()

    src = Path(args.input)
    df = pd.read_excel(src) if src.suffix.lower() in {".xlsx", ".xls"} else pd.read_csv(src)
    missing = [c for c in VALID if c not in df.columns]
    if missing:
        raise SystemExit(f"Thiếu cột: {missing}")

    out = label(df, bmi_cap_at_medium=not args.uncap_bmi)
    dst = Path(args.output) if args.output else src.with_name(src.stem + "_labeled.csv")
    out.to_csv(dst, index=False, encoding="utf-8")

    n_bad = int(out["risk_level"].isna().sum())
    n_warn = int(out["qc_flag"].str.contains("warn_").sum())
    print(f"Tổng {len(out)} dòng | không gán nhãn (lỗi dữ liệu): {n_bad} | cảnh báo bmi lệch: {n_warn}")
    counts = out["risk_level"].value_counts().reindex(["Low", "Medium", "High"], fill_value=0)
    print("\nPhân bố nhãn:")
    for k, n in counts.items():
        share = n / max(counts.sum(), 1)
        note = "  <-- quá ít mẫu" if n < MIN_CLASS_COUNT else ""
        print(f"  {k:<6} {n:>6}  ({share:5.1%}){note}")
    print("\nNhãn do trục nào quyết định (label_driver):")
    print(out["label_driver"].value_counts().to_string())
    print(f"\nĐã ghi: {dst}")


if __name__ == "__main__":
    main()

