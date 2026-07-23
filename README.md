# Growth & Experimentation Project for Ride-Hailing Promotions

Dự án phân tích dữ liệu & thiết kế thử nghiệm (experimentation) dựa trên bộ dữ liệu **NYC Yellow Taxi Trip Data** 
---

## 🎯 Mục tiêu dự án

- Làm sạch và kiểm định chất lượng dữ liệu (~11 triệu chuyến đi).
- Phân tích **hành vi theo thời gian** (giờ, ngày, cao điểm) 
- Phân tích **hành vi theo không gian** (hotspot đón/trả khách, ...)
- Phân tích **hành vi chuyến đi** (quãng đường, giá cước, tip, phương thức thanh toán).
- Đề xuất **feature catalog** 
- Summary **deck EDA 5 slide** (`index.html`).
- Ghi chú **tư duy nhân quả** làm nền cho thiết kế thử nghiệm khuyến mãi (`Causal_thinking.md`).

---

## 📁 Cấu trúc dự án

| File | Nội dung |
|------|----------|
| `Data.ipynb` | SETUP, OVERVIEW|
| `1. Data_Dictionary.md` | Từ điển dữ liệu: mô tả 20 trường của NYC Yellow Taxi |
| `1. data_quality_report.md` | Báo cáo chất lượng dữ liệu: volume, missing, duplicate, invalid values |
| `2. Time_pattern_analysis.ipynb` | Phân tích hành vi rider theo thời gian (hour-of-day, cao điểm...) |
| `3. Geo_pattern_analysis.ipynb` | Phân tích hành vi rider không gian: pickup/dropoff hotspots |
| `4. Behavior_analysis.ipynb` | Phân tích hành vi: trip distance, fare, tip, payment |
| `5. feature_catalog.xlsx` | Danh mục feature đề xuất |
| `index.html` | Deck tóm tắt EDA 5 slide(Link:)|
| `Causal_thinking.md` | Ghi chú tư duy nhân quả: câu hỏi nhân quả, treatment/outcome, confounders, DAG, selection bias |
| `data/` | Dữ liệu thô  |

---

## 📊 Dữ liệu

**Nguồn:** [NYC TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)

- **Khoảng thời gian:** 2026-01-01 → 2026-04-01 
- **Số bản ghi (raw):** 11,077,206 chuyến · **20 cột**
- **Định dạng:** `.parquet` theo tháng + `taxi_zone_lookup.csv` để join khu vực

