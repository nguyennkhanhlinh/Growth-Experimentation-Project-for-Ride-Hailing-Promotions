# Growth & Experimentation Project for Ride-Hailing Promotions

Dự án phân tích dữ liệu & thiết kế thử nghiệm (experimentation) dựa trên bộ dữ liệu **NYC Yellow Taxi Trip Data**.

Link demo: https://growth-experimentation-project-for-phi.vercel.app/

---

## Mục tiêu dự án

- Làm sạch và kiểm định chất lượng dữ liệu taxi trip-level.
- Phân tích **hành vi theo thời gian**: giờ, ngày, cao điểm, cuối tuần, holiday.
- Phân tích **hành vi theo không gian**: pickup/dropoff hotspots, OD flow, airport trips.
- Phân tích **hành vi chuyến đi**: quãng đường, giá cước, duration, tip, payment.
- Tạo **synthetic rider-level dataset** từ dữ liệu chuyến đi thật.
- Phân khúc khách hàng và chọn target segment cho voucher.
- Thiết kế A/B test để đo incremental trips và hiệu quả kinh tế của promotion.
- Stress test pipeline để kiểm tra độ vững của kết luận.

---

## Cấu trúc dự án

```text
Growth & Experimentation Project/
├── data/                                  # Dữ liệu thô và lookup table
├── 01. EDA/                               # Phân tích khám phá dữ liệu
│   ├── Data.ipynb                         # Setup, overview
│   ├── 1. Data_Dictionary.md              # Từ điển dữ liệu
│   ├── 1. data_quality_report.md          # Chất lượng dữ liệu
│   ├── 2. Time_pattern_analysis.ipynb     # Pattern theo thời gian
│   ├── 3. Geo_pattern_analysis.ipynb      # Pattern không gian
│   ├── 4. Behavior_analysis.ipynb         # Distance, fare, duration, payment
│   ├── 5. feature_catalog.md              # Danh mục feature đề xuất
│   └── EDA_report.md                      # Report tổng hợp EDA
├── 02. Synthetic_data/                    # Sinh dữ liệu cấp rider
│   ├── gen_synthetic_data_v_final.ipynb   # Pipeline tạo synthetic data
│   └── gen_synthetic_data_report.md       # Report synthetic data
├── 03. Segmentation/                      # Phân khúc khách hàng
│   ├── segmentation.ipynb                  # KMeans clustering và chọn target
│   └── Segmentation_report.md              # Report segmentation
├── 04. AB Testing/                        # Thiết kế & phân tích thử nghiệm
│   ├── experiment.ipynb                    # A/B test voucher
│   └── AB_testing_report.md
├── 05. Stress test/                       # Kiểm tra độ vững của pipeline
│   ├── stress_test.ipynb                   # Stress test segmentation và experiment
│   └── stress_test_report.md               # Report stress test
└── README.md
```

---

## Dữ liệu

**Nguồn:** [NYC TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)

- **Khoảng thời gian:** 2026-01-01 -> 2026-04-01
- **Số bản ghi raw:** 11,077,206 chuyến
- **Số bản ghi sau làm sạch:** 10,444,717 chuyến
- **Định dạng:** `.parquet` theo tháng + `taxi_zone_lookup.csv`

---

## Kết quả chính

- Synthetic dataset gồm **20,000 rider**.
- Segmentation chọn **K = 3**.
- Target segment: **Cụm 2 - Khách cuối tuần, trả Flex, tip thấp**.
- A/B test trên target segment ước lượng uplift khoảng **1.967 chuyến/rider/30 ngày**.
- Campaign target dự kiến đạt **ROI 42.7%**, tốt hơn rải voucher đại trà.

