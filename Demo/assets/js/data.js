/* ==========================================================================
   DATA — toàn bộ số liệu lấy nguyên từ các report trong 01. → 05.
   Không có con số nào được ước lượng hay bịa thêm. Chỗ nào report không có
   số thì ở đây cũng không có.
   Nguồn:
     01. EDA/1. data_quality_report.md + README.md
     02. Synthetic_data/README.md
     03. Segmentation/Segmentation_report.md
     04. AB Testing/AB_testing_report.md
     05. Stress test/stress_test_report.md
     Causal_thinking/Causal_thinking.md
   ========================================================================== */
window.DATA = {

  /* ---------------------------------------------------------------- 01 EDA */
  eda: {
    kpi: [
      { label: "Chuyến thô", value: "11,077,206", note: "20 trường · Q1 2026" },
      { label: "Chuyến sạch", value: "~10.6M", tag: { text: "−4.1%", kind: "warning" }, note: "sau khi lọc" },
      { label: "Bản ghi trùng", value: "0", tag: { text: "sạch", kind: "good" }, note: "20 cột & 7 trường ID" },
      { label: "Null Flex Fare", value: "27.6%", note: "3,057,123 bản ghi" },
      { label: "Kiểm tra logic", value: "4 / 4", tag: { text: "pass", kind: "good" }, note: "thời gian · tốc độ" }
    ],
    volumeByMonth: [
      { label: "Tháng 1", value: 3.7 },
      { label: "Tháng 2", value: 3.4 },
      { label: "Tháng 3", value: 4.0 }
    ],
    invalidRate: [
      { label: "trip_distance", value: 3.3,   action: "Loại" },
      { label: "fare_amount",   value: 0.9,   action: "Loại" },
      { label: "total_amount",  value: 0.8,   action: "Loại" },
      { label: "passenger_count", value: 0.4, action: "Giữ" },
      { label: "tip_amount",    value: 0.002, action: "Giữ" }
    ],
    funnel: [
      { label: "Chuyến thô", value: 11.077, note: "3 file parquet TLC" },
      { label: "Sau lọc bất thường", value: 10.6, note: "loại 4.1% vi phạm quy tắc" }
    ],
    invalidTable: [
      ["trip_distance",   "0",  "370K", "495", "3.3%",   "Loại"],
      ["fare_amount",     "0",  "94K",  "162", "0.9%",   "Loại"],
      ["total_amount",    "0",  "90K",  "12",  "0.8%",   "Loại"],
      ["passenger_count", "3M", "41K",  "14",  "0.4%",   "Giữ"],
      ["tip_amount",      "0",  "148",  "29",  "0.002%", "Giữ"]
    ],
    derived: [
      ["hour", "tpep_pickup_datetime.hour", "Giờ đón khách, 0–23"],
      ["day_of_week", "tpep_pickup_datetime.dayofweek", "0 = Thứ Hai"],
      ["is_wknd", "day_of_week >= 5", "Chuyến cuối tuần"],
      ["duration", "dropoff − pickup", "Thời lượng, phút"],
      ["speed", "trip_distance * 60 / duration", "Tốc độ TB, mph"],
      ["tip_rate", "tip_amount / fare_amount", "Tỷ lệ tip, chỉ trên thẻ"],
      ["is_air", "RatecodeID in {2,3} hoặc Airport_fee > 0", "Chuyến sân bay"],
      ["is_flex", "payment_type == 0", "Chuyến Flex Fare"],
      ["is_card", "payment_type == 1", "Chuyến thẻ"]
    ],
    logicChecks: [
      ["dropoff > pickup", "Thời gian hợp lý", "pass"],
      ["0 < duration ≤ 300 phút", "Không quá 5 giờ", "pass"],
      ["speed ≥ 0 mph", "Tốc độ không âm", "pass"],
      ["speed < 80 mph", "Hợp lý với NYC", "pass"]
    ],

    /* --- Bước 3: phân tích thời gian ---------------------------------- */
    timeBuckets: [
      ["morning",    "6 – 10",  "Cao điểm sáng"],
      ["midday",     "10 – 16", "Giữa ngày"],
      ["evening",    "16 – 22", "Cao điểm chiều tối"],
      ["late_night", "22 – 6",  "Đêm khuya"]
    ],
    timeAnalysis: [
      { name: "Theo giờ trong ngày", detail: "Phân phối số chuyến theo 24 giờ; xác định giờ cao điểm (sáng 6–10h, chiều 16–20h) và giờ thấp điểm (3–5h sáng)." },
      { name: "Theo ngày trong tuần", detail: "So sánh sản lượng giữa các ngày, tách pattern ngày thường và cuối tuần." },
      { name: "Theo tháng", detail: "Xu hướng ba tháng: tháng 1 → tháng 2 → tháng 3." }
    ],
    timeOutputs: ["hour", "is_wknd", "hour_group"],

    /* --- Bước 4: phân tích không gian --------------------------------- */
    geoAnalysis: [
      { name: "Top pickup zones", detail: "Những khu vực tập trung đón khách nhiều nhất — chủ yếu là trung tâm Manhattan (Midtown, Flatiron)." },
      { name: "Top dropoff zones", detail: "Các khu vực được trả khách nhiều nhất; thường trùng với vùng đón hoặc các hotspot khác." },
      { name: "Cặp OD (zone pairs)", detail: "Các tuyến đi phổ biến nhất, ví dụ Midtown → Upper West Side — giúp xác định hành vi di chuyển tiêu biểu." },
      { name: "Phân bố địa lý", detail: "Tỷ lệ chuyến trong Manhattan so với các quận ngoài, và các zone chuyên biệt như sân bay, điểm du lịch." }
    ],
    geoOutputs: ["home_borough", "ánh xạ zone → borough"],

    /* --- Bước 5: phân tích hành vi ------------------------------------ */
    behaviorAnalysis: [
      { name: "Trip distance", detail: "Phân phối cự ly (median, các phân vị) — cơ sở để tách cụm chuyến ngắn / trung bình / dài." },
      { name: "Fare amount", detail: "Phân phối cước trung bình và quan hệ với cự ly." },
      { name: "Tip behavior", detail: "Tỷ lệ tip trên chuyến thanh toán thẻ, trải từ 0% đến khoảng 30%." },
      { name: "Payment method", detail: "Phân bố các loại thanh toán; Flex Fare (payment_type = 0) chiếm 27.6% số chuyến.", metric: "27.6%" },
      { name: "Airport trips", detail: "Tỷ lệ chuyến sân bay (JFK, LaGuardia, Newark) — đặc trưng là cước cao và cự ly dài." },
      { name: "Weekend vs weekday", detail: "So sánh cự ly, cước và tip giữa cuối tuần và ngày thường." }
    ],
    behaviorOutputs: [
      ["typical_distance", "Median trip distance"],
      ["avg_fare", "Mean fare amount"],
      ["pct_tip_rate", "Mean tip rate, chỉ trên thẻ"],
      ["pct_flex_payment", "% chuyến Flex Fare"],
      ["pct_airport", "% chuyến sân bay"],
      ["weekend_ratio", "% chuyến cuối tuần"],
      ["route_entropy", "Độ đa dạng tuyến đi"],
      ["pref_time_bucket", "Khung giờ ưa thích"],
      ["home_borough", "Quận hoạt động chính"]
    ],

    /* ==================================================================
       DECK — nội dung 5 slide của index.html (EDA Summary Deck)
       Đây là nguồn có số liệu chi tiết nhất cho mục 01.
       ================================================================== */
    deck: {
      /* ---- slide 1: Data · Quality ---- */
      quality: {
        kpi: [
          ["11.077.206", "Total records (raw)"],
          ["20", "Trường dữ liệu (cột)"],
          ["Jan–Mar", "Date range · 2026"],
          ["10.444.717", "Sau làm sạch"]
        ],
        checks: [
          ["Total records", "11.077.206 chuyến · 20 cột. Sau lọc còn 10.444.717 (loại 4,1%)."],
          ["Date range", "Pickup 2026-01-01 → 2026-04-01, tập trung Jan–Mar. Chỉ 10 chuyến (0,0001%) nằm ngoài khoảng."],
          ["Missing values", "5 cột cùng thiếu đúng 3.057.123 dòng (27,6%) = nhóm Flex Fare. Chỉ 2 tổ hợp null → có cấu trúc, không ngẫu nhiên."],
          ["Duplicate records", "0 bản ghi trùng — kiểm tra cả trên 20 cột lẫn 7 trường định danh một chuyến."],
          ["Invalid values", "0 giá trị categorical sai mã theo TLC. Lọc ~4,1% chuyến bất hợp lệ về distance / fare / duration / speed trước phân tích."]
        ],
        missingSplit: [
          { label: "Đủ 20 cột", value: 8020083 },
          { label: "Thiếu 5 cột · Flex Fare", value: 3057123 }
        ],
        dictGroups: [
          ["Chuyến & thời gian", 4, "VendorID · pickup / dropoff_datetime · store_and_fwd_flag"],
          ["Hành trình & vị trí", 4, "trip_distance · PULocationID · DOLocationID · RatecodeID"],
          ["Khách & thanh toán", 2, "passenger_count · payment_type"],
          ["Tiền cước & phụ phí", 10, "fare · extra · mta_tax · tip · tolls · improvement_surcharge · total · congestion · airport_fee · cbd_congestion_fee"]
        ]
      },

      /* ---- slide 2: When · Giờ & Ngày ---- */
      time: {
        hourOfDay: [
          "Peak: 17–18h — đỉnh 18h = 693.124 chuyến (17, 19, 21h cũng rất cao).",
          "Off-peak: 2–5h sáng — đáy 4h ≈ 89K (chênh ~7,8 lần so đỉnh).",
          "Morning commute: 5–8h tăng vọt (98K → 437K).",
          "Evening commute: 17–21h duy trì rất cao & kéo dài hơn buổi sáng."
        ],
        dayOfWeek: [
          "Cao nhất T7 (1,72M), thấp nhất T2 (1,18M); tăng dần về cuối tuần.",
          "Cuối tuần nhỉnh hơn ngày thường ~2,4%/ngày (118,0K vs 115,2K).",
          "Hình dạng khác: ngày thường cao điểm nhọn (17–21h đều > 450K), cuối tuần mượt hơn (đỉnh 17–19h)."
        ],
        peakTrough: [
          { label: "Đỉnh · 18h", value: 693, unit: "K chuyến" },
          { label: "5h sáng", value: 98, unit: "K chuyến" },
          { label: "8h sáng", value: 437, unit: "K chuyến" },
          { label: "Đáy · 4h", value: 89, unit: "K chuyến" }
        ],
        weekExtremes: [
          { label: "Thứ 7 (cao nhất)", value: 1.72 },
          { label: "Thứ 2 (thấp nhất)", value: 1.18 }
        ],
        perDay: [
          { label: "Cuối tuần", value: 118.0 },
          { label: "Ngày thường", value: 115.2 }
        ],
        insight: "Giờ cao điểm sáng 6–8h phản ánh giờ đi làm, đi học; chiều 17–21h là tan làm, mua sắm, ăn uống nên cao và kéo dài hơn. Cuối tuần đường cong mượt và tính trên mỗi ngày lại nhỉnh hơn vì nhu cầu giải trí trải đều, không dồn vào khung giờ hành chính."
      },

      /* ---- slide 3: When · Mùa vụ ---- */
      season: {
        anomalies: [
          { date: "25/01", trips: 43407 },
          { date: "23/02", trips: 22733 }
        ],
        anomalyCause: "Bão mùa đông lớn ở NYC — ban bố tình trạng khẩn cấp, hạn chế đi lại.",
        monthTotal: [
          { label: "Tháng 1", value: 3.50 },
          { label: "Tháng 2", value: 3.20 },
          { label: "Tháng 3", value: 3.75 }
        ],
        monthPerDay: [
          { label: "Tháng 1", value: 112920 },
          { label: "Tháng 2", value: 114149 },
          { label: "Tháng 3", value: 120903 }
        ],
        perDayNotes: [
          "Chuẩn hoá theo số ngày thì T2 (114.149) vượt T1 (112.920) — ngược hẳn kết luận khi nhìn tổng.",
          "T3 vẫn cao nhất với 120.903 chuyến/ngày, hơn T1 khoảng 7,1%."
        ],
        monthNotes: [
          "T2 tổng thấp nhất do chỉ 28 ngày cộng 2 ngày bão tuyết.",
          "T3 cao nhất: nhu cầu tăng sau T2, thời tiết thuận lợi hơn, hoạt động đi lại sôi động hơn khi bước sang đầu mùa xuân."
        ],
        holidays: [
          { name: "New Year's Day", date: "01/01", trips: 106592,
            detail: "Cao nhất 00–02h (01h: 9.860), sáng vắng (08h: 1.648) — người dân di chuyển về sau các hoạt động đón giao thừa; nghỉ làm, trường học đóng cửa nên mất cao điểm sáng." },
          { name: "Martin Luther King Jr. Day", date: "19/01", trips: 93074,
            detail: "Rạng sáng rất thấp (04h: 793), dồn chiều 12–16h (đỉnh 14h: 6.855)." },
          { name: "Presidents' Day", date: "16/02", trips: 80567,
            detail: "Thấp hơn ~18% so với thứ Hai thường (98.216); sáng vắng (05h: 770), dồn chiều 13–18h (đỉnh 15h: 5.559)." }
        ],
        holidayInsight: "Ngày nghỉ chuyển nhu cầu từ đi làm sang mua sắm và giải trí — holiday ảnh hưởng rõ đến hành vi theo giờ."
      },

      /* ---- slide 4: Where · Không gian ---- */
      geo: {
        pickup: [
          "Zone phổ biến nhất: Upper East Side South (455.545) — điểm đón cao nhất; kế đến UES North (424.564) và Midtown Center (424.343).",
          "Top 5 đều > 310.000, giảm dần còn ~200.000 ở cuối Top 20 → tập trung ở ít khu vực, không đều.",
          "Manhattan chiếm ưu thế tuyệt đối trong Top 20 (trung tâm tài chính, thương mại, du lịch).",
          "Sân bay: JFK trong Top 5, LaGuardia trong Top 20 — đầu mối giao thông lớn."
        ],
        pickupTop: [
          { label: "UES South", value: 455545 },
          { label: "UES North", value: 424564 },
          { label: "Midtown Center", value: 424343 },
          { label: "JFK Airport", value: 404393 },
          { label: "Penn Station", value: 315120 }
        ],
        dropoffTop: [
          { label: "UES North", value: 439978 },
          { label: "UES South", value: 414474 },
          { label: "Midtown Center", value: 340458 },
          { label: "Murray Hill", value: 286049 },
          { label: "UWS South", value: 272956 }
        ],
        dropoff: [
          "2 khu đầu vượt trội; từ vị trí 4 dao động 200.000–290.000.",
          "Toàn bộ Top 20 đều thuộc Manhattan.",
          "Cụm trung tâm thương mại: Midtown, Times Sq, Penn Station, Union Sq, Hudson Yards (văn phòng, TTTM, khách sạn, du lịch)."
        ],
        odFlow: [
          "Tuyến lớn nhất giữa UES North ↔ UES South; phần lớn tuyến lưu lượng cao nằm trong Manhattan.",
          "Midtown là trung tâm kết nối quan trọng của mạng lưới.",
          "Top 10 tuyến không có tuyến sân bay nào — JFK → Outside of NYC chỉ xếp thứ 19 với 19.415 chuyến → phần lớn là đi lại nội đô."
        ],
        odTop: [
          { label: "UES South → UES North", value: 68093 },
          { label: "UES North → UES South", value: 58500 },
          { label: "UES North → UES North", value: 45652 },
          { label: "UES South → UES South", value: 44065 },
          { label: "Midtown → UES South", value: 29789 }
        ],
        airport: {
          share: 7.67,
          compare: [
            { metric: "Fare TB", airport: 56.37, other: 18.51, ratio: 3.05, unit: "$" },
            { metric: "Distance TB", airport: 13.07, other: 2.68, ratio: 4.87, unit: " mi" },
            { metric: "Total TB", airport: 77.91, other: 26.16, ratio: 2.98, unit: "$" }
          ],
          note: "Chênh chủ yếu đến từ cước quãng đường, phụ phí chiếm phần nhỏ."
        }
      },

      /* ---- slide 5: What · Chuyến đi ---- */
      behavior: {
        distance: [
          "Phần lớn chuyến rất ngắn, tập trung 0–3 dặm; 50% ≤ 1,9 mi, 25% < 1,09 mi → dân dùng taxi cho di chuyển gần.",
          "Tần suất giảm rất nhanh khi khoảng cách tăng; 75% ≤ 3,86 mi.",
          "Nhóm Short (< 2 mi) ~5,5tr — gần gấp đôi Medium; giảm dần Short > Medium > Long > Very Long."
        ],
        distancePct: [
          { label: "p25", value: 1.09 },
          { label: "Median", value: 1.90 },
          { label: "p75", value: 3.86 }
        ],
        fareBars: [
          { label: "Cước trung bình", value: 21.42 },
          { label: "Cước trung vị", value: 15.60 }
        ],
        durationNotes: [
          "Nhóm 5–15 phút phổ biến nhất với ~46,4%; kế đến 15–30 phút với ~32,3%.",
          "Chuyến dưới 30 phút chiếm ~87,5% — taxi chủ yếu phục vụ di chuyển ngắn trong nội đô.",
          "Median 13,7 phút nhưng trung bình 17,4 phút → phân phối lệch phải do nhóm chuyến dài."
        ],
        segmentTop: [
          { label: "Short · UES S → UES N", value: 67597 },
          { label: "Short · UES N → UES S", value: 58099 },
          { label: "VeryLong · JFK → Times Sq", value: 14638 },
          { label: "VeryLong · JFK → ngoài NYC", value: 13097 },
          { label: "Long · JFK → Flushing", value: 10209 },
          { label: "Medium · Lincoln Sq → UES N", value: 9620 }
        ],
        fare: [
          { label: "Giá cước trung bình", value: "$21,42" },
          { label: "Giá cước trung vị", value: "$15,60" },
          { label: "Cước / mile (tổng ÷ tổng)", value: "~$6,16" },
          { label: "Cước / mile (median)", value: "~$7,66" }
        ],
        duration: [
          { label: "Very Short (< 5 phút)", value: 8.8 },
          { label: "Short (5–15)", value: 46.4 },
          { label: "Medium (15–30)", value: 32.3 },
          { label: "Long (30–60)", value: 10.4 },
          { label: "Very Long (> 60)", value: 2.1 }
        ],
        durationStats: [
          ["Median", "13,7 phút"], ["Trung bình", "17,4 phút"],
          ["p75", "≤ 21,7 phút"], ["Dưới 30 phút", "~87,5%"]
        ],
        segments: [
          { name: "Short (< 2 mi)", detail: "Toàn bộ Top 5 là tuyến nội Manhattan quanh Upper East Side (UES South ↔ North: 67.597 / 58.099 chuyến) và Midtown → UES." },
          { name: "Medium (2–5 mi)", detail: "Vẫn trong Manhattan nhưng liên khu — Lincoln Sq / Midtown → UES North, UES → UWS North, Midtown → East Village (cross-town)." },
          { name: "Long (5–10 mi)", detail: "Bắt đầu xuất hiện sân bay — JFK → Flushing Meadows, LaGuardia → Times Sq / UES / Midtown." },
          { name: "Very Long (> 10 mi)", detail: "JFK → Times Sq (14.638), → Outside of NYC (13.097), → Midtown, Clinton East. Chuyến rất dài gần như hoàn toàn là đi/đến sân bay." }
        ]
      }
    },

    /* ==================================================================
       BIỂU ĐỒ GỐC — trích thẳng từ 12 ảnh nhúng trong deck index.html.
       Đây là biểu đồ do notebook EDA xuất ra, không phải vẽ lại.
       ================================================================== */
    figures: {
      time: [
        ["time_02_hourly_area.png", "Số chuyến theo giờ trong ngày", "Trọn 24 giờ — đỉnh 18h với 693.124 chuyến, đáy 4h với 88.921."],
        ["time_06_weekday_weekend_hour_avg.png", "Nhu cầu theo giờ · Weekday vs Weekend", "Trung bình chuyến/ngày — đã chuẩn hoá theo 64 ngày thường và 26 ngày cuối tuần."],
        ["time_03_day_of_week.png", "Số chuyến theo thứ trong tuần", "Tổng số chuyến cả quý; thứ Tư chỉ có 12 lần xuất hiện nên tổng bị hụt."],
        ["time_04_avg_daily_day_type.png", "TB số chuyến/ngày · Weekday vs Weekend", "Chuẩn hoá theo số ngày: 118.031 so với 115.249 chuyến/ngày."]
      ],
      season: [
        ["deck-05.png", "Xu hướng số chuyến theo ngày", "Hai hõm sâu là hai ngày bão tuyết 25/01 và 23/02."],
        ["deck-06.png", "Trung bình số chuyến/ngày theo tháng", "T2 không còn thấp nhất khi chuẩn hoá."],
        ["deck-07.png", "Phân bố theo giờ · 3 ngày lễ", "Ngày nghỉ dịch cao điểm từ sáng sang chiều."]
      ],
      geo: [
        ["deck-08.png", "Top 20 điểm đón · Pickup", "Upper East Side South dẫn đầu với 457.709 chuyến."],
        ["deck-09.png", "Top 20 điểm trả · Dropoff", "Hai khu đầu vượt trội, từ vị trí 4 dao động 200–290K."],
        ["deck-10.png", "Ma trận O-D · Top 10 zone", "Đơn vị: nghìn chuyến."]
      ],
      behavior: [
        ["deck-11.png", "Phân khúc theo quãng đường", "Đơn vị: triệu chuyến."],
        ["deck-12.png", "Phân khúc theo thời lượng", "Đơn vị: triệu chuyến."]
      ]
    },

    /* --- Từ điển 20 trường NYC TLC ------------------------------------ */
    dictionary: [
      [1,  "VendorID",              "int",      "code",      "Nhà cung cấp TPEP", "1 = Creative Mobile, 2 = Curb Mobility, 6 = Myle Tech, 7 = Helix"],
      [2,  "tpep_pickup_datetime",  "datetime", "timestamp", "Thời điểm bật đồng hồ", ""],
      [3,  "tpep_dropoff_datetime", "datetime", "timestamp", "Thời điểm tắt đồng hồ", ""],
      [4,  "passenger_count",       "float",    "người",     "Số hành khách", "Null với Flex Fare"],
      [5,  "trip_distance",         "float",    "dặm",       "Quãng đường theo đồng hồ", ""],
      [6,  "RatecodeID",            "float",    "code",      "Mã giá cước cuối cùng", "Null với Flex Fare"],
      [7,  "store_and_fwd_flag",    "object",   "Y/N",       "Bản ghi có lưu tạm trên xe không", ""],
      [8,  "PULocationID",          "int",      "code",      "Mã zone đón khách", "1–265, nối taxi_zone_lookup"],
      [9,  "DOLocationID",          "int",      "code",      "Mã zone trả khách", "1–265"],
      [10, "payment_type",          "int",      "code",      "Phương thức thanh toán", "0 = Flex, 1 = Thẻ, 2 = Tiền mặt, 3 = Không thu, 4 = Tranh chấp, 5 = Không rõ, 6 = Đã hủy"],
      [11, "fare_amount",           "float",    "USD",       "Cước theo đồng hồ", ""],
      [12, "extra",                 "float",    "USD",       "Phụ phí giờ cao điểm và khoản khác", ""],
      [13, "mta_tax",               "float",    "USD",       "Thuế MTA", ""],
      [14, "tip_amount",            "float",    "USD",       "Tiền tip", "Chỉ ghi nhận với thanh toán thẻ"],
      [15, "tolls_amount",          "float",    "USD",       "Phí cầu đường", ""],
      [16, "improvement_surcharge", "float",    "USD",       "Phụ phí cải thiện dịch vụ", ""],
      [17, "total_amount",          "float",    "USD",       "Tổng tiền khách trả", "Không gồm tip tiền mặt"],
      [18, "congestion_surcharge",  "float",    "USD",       "Phụ phí ùn tắc", "Null với Flex Fare"],
      [19, "Airport_fee",           "float",    "USD",       "Phụ phí sân bay", "Chỉ LGA và JFK"],
      [20, "cbd_congestion_fee",    "float",    "USD",       "Phí khu vực trung tâm", "Áp dụng từ 05/2025"]
    ]
  },

  /* ------------------------------------------------------ 02 SYNTHETIC DATA */
  synthetic: {
    kpi: [
      { label: "Rider mô phỏng", value: "20,000", note: "× 14 cột hành vi" },
      { label: "Nhánh RCT", value: "10,000 / 10,000", tag: { text: "cân bằng", kind: "good" }, note: "bốc thăm theo khối" },
      { label: "ate_realized", value: "1.8332", note: "estimand thật nhánh RCT" },
      { label: "ate_true", value: "1.8368", note: "mốc cho nhánh quan sát" },
      { label: "Archetype", value: "16", note: "4 khung giờ × 4 cự ly" }
    ],
    params: [
      ["N_RIDERS", "20,000", "Quy mô quần thể mô phỏng"],
      ["SEED", "42", "Cố định để tái lập"],
      ["ALPHA", "0.1", "Độ tập trung sở thích archetype"],
      ["BASELINE_MEAN", "8 chuyến / 30 ngày", "Rider trung bình ~2 chuyến/tuần"],
      ["CV_LAMBDA", "0.60", "Hệ số biến thiên tần suất giữa rider"],
      ["ZERO_TARGET", "0.20", "Tỷ lệ rider không phát sinh chuyến"],
      ["WAKE_RATE", "0.25", "Rider ngủ đông được voucher đánh thức"]
    ],
    archetypes: {
      time: ["Morning 6–10", "Midday 10–16", "Evening 16–22", "Late night 22–6"],
      dist: ["Short < 2 dặm", "Medium 2–5", "Long 5–10", "Very long > 10"],
      /* p_arch — tỷ trọng thật của 16 archetype trong TLC, % (hàng = khung giờ) */
      pArch: [
        [6.5, 4.0, 1.8, 1.2],
        [17.2, 7.8, 3.1, 2.4],
        [20.4, 10.4, 3.6, 2.5],
        [8.0, 6.5, 3.0, 1.6]
      ]
    },
    behaviorCols: [
      ["typical_distance", "Median trip_distance", "Cự ly điển hình, dặm"],
      ["route_entropy", "Shannon entropy PU→DO", "Độ đa dạng tuyến; 0 = một tuyến"],
      ["pct_airport", "Tỷ lệ chuyến is_air = 1", "Mức gắn với sân bay"],
      ["pref_time_bucket", "Mode khung giờ", "Khung giờ xuất hiện nhiều nhất"],
      ["weekend_ratio", "Tỷ lệ chuyến is_wknd = 1", "Mức hoạt động cuối tuần"],
      ["pct_flex_payment", "Tỷ lệ chuyến is_flex = 1", "Mức dùng thanh toán Flex"],
      ["pct_tip_rate", "Trung bình tip_rate", "Tỷ lệ tip, chỉ trên thẻ"],
      ["avg_fare", "Trung bình fare_amount", "Cước TB mỗi chuyến, USD"],
      ["home_borough", "Quận nhiều điểm đón nhất", "Quận hoạt động chính"]
    ],
    contract: [
      ["Unit", "Rider i, i = 1 … 20,000"],
      ["Treatment", "T ∈ {0, 1} — có nhận voucher hay không"],
      ["Feature window", "90 ngày, dùng tính 9 biến hành vi"],
      ["Outcome window", "30 ngày ngay sau feature window"],
      ["Potential outcomes", "Y(0), Y(1) — số chuyến trong outcome window"],
      ["Ground truth ATE", "tau_true = E[Y(1) − Y(0)]"],
      ["Observed outcome", "Y_rct (RCT) hoặc Y_obs (quan sát)"]
    ],
    branches: [
      { file: "synthetic_riders_rct.parquet", mech: "Bốc thăm 50/50 trong từng khối", prop: "Không thiên lệch", use: "Đo ATE đúng, làm mốc đối chiếu" },
      { file: "synthetic_riders_obs.parquet", mech: "Xác suất phụ thuộc 3 confounder", prop: "Có thiên lệch chọn lọc", use: "Chấm điểm phương pháp xử lý bias" }
    ],
    confounders: [
      ["past_visits_freq", "Tần suất chuyến trong 90 ngày quan sát"],
      ["last_trip_age", "Số ngày kể từ chuyến cuối"],
      ["engagement_score", "Chỉ số kết hợp: xuất hiện, tip, dùng thẻ"]
    ],
    outputs: [
      ["synthetic_riders.parquet", "20,000 × 14", "Bảng rider cơ bản"],
      ["synthetic_riders_rct.parquet", "20,000 × 18", "+ treatment, Y_0, Y_1, Y_rct, ite_realized, cate_true"],
      ["synthetic_riders_obs.parquet", "20,000 × 18", "+ treatment (có bias), Y_0, Y_1, Y_obs"]
    ]
  },

  /* ------------------------------------------------------- 03 SEGMENTATION */
  segmentation: {
    kpi: [
      { label: "Rider phân cụm", value: "20,000", note: "trên 4 trục hành vi" },
      { label: "Số cụm chốt", value: "K = 3", tag: { text: "2 tiêu chí", kind: "good" }, note: "sil_gap + Elbow" },
      { label: "Cụm nhỏ nhất", value: "13.04%", tag: { text: "≥ 5%", kind: "good" }, note: "ràng buộc quy mô" },
      { label: "ARI 2 seed", value: "0.9751", tag: { text: "≥ 0.90", kind: "good" }, note: "ổn định khởi tạo" }
    ],
    kSelection: [
      { k: 2, sil: 0.3405, silNull: 0.3190, gap: 0.0216, ari: 0.9991, minShare: 22.03, verdict: "Đạt ràng buộc" },
      { k: 3, sil: 0.2484, silNull: 0.2005, gap: 0.0479, ari: 0.9751, minShare: 13.04, verdict: "Đạt · sil_gap cao nhất", chosen: true },
      { k: 4, sil: 0.2197, silNull: 0.1984, gap: 0.0213, ari: 0.9979, minShare: 11.31, verdict: "Đạt ràng buộc" },
      { k: 5, sil: 0.2218, silNull: 0.2140, gap: 0.0078, ari: 0.9986, minShare: 1.53,  verdict: "Loại · cụm quá nhỏ" },
      { k: 6, sil: 0.2066, silNull: 0.1917, gap: 0.0149, ari: 0.9735, minShare: 1.51,  verdict: "Loại · cụm quá nhỏ" }
    ],
    elbow: [
      { k: 1, d: 0.0000 }, { k: 2, d: 0.1257 }, { k: 3, d: 0.1776 },
      { k: 4, d: 0.1450 }, { k: 5, d: 0.0901 }, { k: 6, d: 0.0000 }
    ],
    clusters: [
      { id: 0, name: "Khách nội đô ngày thường, tip cao", short: "Nội đô ngày thường", n: 10946, share: 54.73,
        z: { tip: 0.42, flex: -0.43, airport: -0.36, weekend: -0.28 },
        dist: 1.70, fare: 16.51, rides: 23.12,
        time: { evening: 38.0, lateNight: 10.2, midday: 35.1, morning: 16.6 },
        note: "Đi lại nội đô chặng ngắn, tập trung evening và midday. Volume ổn định nhưng hành vi đã đều, voucher có rủi ro rơi vào chuyến vốn dĩ vẫn xảy ra." },
      { id: 1, name: "Khách sân bay / đường dài", short: "Sân bay / đường dài", n: 2608, share: 13.04,
        z: { tip: -0.78, flex: -0.42, airport: 2.04, weekend: -0.20 },
        dist: 7.32, fare: 38.26, rides: 21.51,
        time: { evening: 32.4, lateNight: 15.7, midday: 35.1, morning: 16.8 },
        note: "Giá trị mỗi chuyến cao nhất, nhưng nhu cầu gắn lịch bay nên khó dịch chuyển bằng voucher giá ngắn hạn." },
      { id: 2, name: "Khách cuối tuần, trả Flex, tip thấp", short: "Cuối tuần · Flex", n: 6446, share: 32.23, target: true,
        z: { tip: -0.41, flex: 0.90, airport: -0.21, weekend: 0.56 },
        dist: 3.02, fare: 22.67, rides: 21.61,
        time: { evening: 26.4, lateNight: 34.3, midday: 22.4, morning: 16.8 },
        note: "Nhạy chi phí, hành vi đi lại mang tính dịp. Tỷ lệ late night cao nhất 34.3%. Được chọn làm target." }
    ],
    features: [
      ["pct_tip_rate", "Tip thấp là dấu hiệu nhạy chi phí"],
      ["pct_flex_payment", "Quan tâm tính linh hoạt của chi phí"],
      ["pct_airport", "Nhu cầu sân bay gắn lịch trình bắt buộc"],
      ["weekend_ratio", "Hành vi theo dịp co giãn theo giá hơn"]
    ],
    quality: [["Giá trị thiếu", "0"], ["Dòng trùng lặp hoàn toàn", "0"], ["user_id trùng", "0"]]
  },

  /* ---------------------------------------------------------- 04 AB TESTING */
  abtest: {
    kpi: [
      { label: "Uplift / rider", value: "1.9670", tag: { text: "> hòa vốn", kind: "good" }, note: "CI [1.6901, 2.2439]" },
      { label: "Ngưỡng hòa vốn", value: "1.3783" },
      { label: "Chuyến tăng thêm", value: "12,679", note: "trên 6,446 rider" },
      { label: "Lợi nhuận ròng", value: "$17,206", tag: { text: "ROI 42.7%", kind: "good" }, note: "chi phí $40,288" },
      { label: "CPIT", value: "$3.18", tag: { text: "< $4.53", kind: "good" }, note: "doanh thu biên / chuyến" }
    ],
    assignment: [
      ["Cụm target", "2"], ["Persona", "Khách cuối tuần, trả Flex, tip thấp"],
      ["Tổng rider", "6,446"], ["Treatment", "3,216"], ["Control", "3,230"], ["Treatment share", "49.9%"]
    ],
    economics: [
      ["Mệnh giá voucher", "$5.00 / rider"],
      ["Chi phí vận hành", "$1.25 / rider"],
      ["Tổng chi phí", "$6.25 / rider"],
      ["Take rate", "20%"],
      ["Cước TB cụm target", "$22.67 / chuyến"],
      ["Doanh thu biên mỗi chuyến", "$4.53"],
      ["Ngưỡng hòa vốn", "1.3783 chuyến / rider"]
    ],
    randomization: [
      { metric: "SRM p-value", value: "0.8714", threshold: "> 0.05", ok: true },
      { metric: "Max |SMD| hiệp biến liên tục", value: "0.0306", threshold: "< 0.10", ok: true },
      { metric: "Max |SMD| hiệp biến phân loại", value: "0.0580", threshold: "< 0.10", ok: true },
      { metric: "MDE", value: "0.3864", threshold: "< breakeven 1.3783", ok: true }
    ],
    power: [["SD(Y0) trong khối", "5.5373"], ["SE thiết kế", "0.1379"], ["MDE", "0.3864"], ["Ngưỡng hòa vốn", "1.3783"]],
    effect: [
      { name: "Hiệu trung bình thô", est: 2.0798, lo: 1.7448, hi: 2.4147, se: 0.1709, lift: "28.4%", p: "1.022e−33" },
      { name: "Block FE + HC1", est: 1.9670, lo: 1.6901, hi: 2.2439, se: 0.1412, lift: "26.9%", p: "1.83e−43", main: true }
    ],
    guardrails: [
      { name: "Doanh thu biên tăng thêm / rider", got: "$8.49 (cận dưới $7.04)", threshold: "≥ chi phí $6.25", ok: true },
      { name: "ATE mọi nhóm hoạt động nền", got: "cả 3 nhóm CI nằm trọn trên 0", threshold: "> 0 ở cả 3 nhóm", ok: true },
      { name: "Voucher chi cho rider 0 chuyến", got: "13.81%", threshold: "≤ 20%", ok: true }
    ],
    monteCarlo: [
      { effect: 0.00, truth: 0.0000, est: 0.0018, bias: 0.0018,  coverage: 0.951, power: 0.049 },
      { effect: 0.10, truth: 0.1833, est: 0.1768, bias: -0.0065, coverage: 0.950, power: 0.249 },
      { effect: 0.25, truth: 0.4583, est: 0.4608, bias: 0.0025,  coverage: 0.946, power: 0.920 },
      { effect: 0.50, truth: 0.9166, est: 0.9140, bias: -0.0026, coverage: 0.950, power: 1.000 },
      { effect: 1.00, truth: 1.8332, est: 1.8326, bias: -0.0006, coverage: 0.958, power: 1.000 }
    ],
    business: [
      ["Rider được gửi voucher", "6,446"], ["Uplift dùng để tính", "1.9670"],
      ["Chuyến tăng thêm", "12,679"], ["Chi phí voucher", "$32,230"],
      ["Chi phí vận hành", "$8,058"], ["Tổng chi phí", "$40,288"],
      ["Doanh thu biên tăng thêm", "$57,494"], ["Lợi nhuận ròng", "$17,206"],
      ["ROI", "42.7%"], ["CPIT", "$3.18 / chuyến tăng thêm"]
    ],
    rubric: [
      { name: "Accuracy — |uplift − sự thật|", value: "0.1338", threshold: "< 0.20", pass: true },
      { name: "Bias — Monte Carlo", value: "0.0065", threshold: "< 0.05", pass: true },
      { name: "Coverage — CI 95% phủ sự thật", value: "0.946 – 0.958", threshold: "0.93 – 0.97", pass: true },
      { name: "Decision — cận dưới CI vượt breakeven", value: "1.6901 vs 1.3783", threshold: "cận dưới > breakeven", pass: true },
      { name: "Cost — chi phí / chuyến tăng thêm", value: "$3.18", threshold: "< $4.53", pass: true },
      { name: "Latency — một lần fit", value: "0.38 ms", threshold: "—", pass: null }
    ],
    cate: [
      { cluster: 0, name: "Nội đô ngày thường", n: 10946, cate: 1.6016, lo: 1.3944, hi: 1.8087, fare: 16.51, breakeven: 1.8931, decision: "Dừng" },
      { cluster: 1, name: "Sân bay / đường dài", n: 2608, cate: 0.4073, lo: -0.1602, hi: 0.9747, fare: 38.26, breakeven: 0.8168, decision: "Dừng" },
      { cluster: 2, name: "Cuối tuần · Flex", n: 6446, cate: 1.9670, lo: 1.6902, hi: 2.2438, fare: 22.67, breakeven: 1.3783, decision: "Triển khai" }
    ],
    pooled: { ate: 1.5668, breakeven: 1.4650 },
    scenarios: [
      { name: "Rải cho tất cả", riders: 20000, cost: 125000, revenue: 123500, profit: -1500, roi: -1.2, opexMax: 1.175, revPerRider: 6.175 },
      { name: "Chỉ cụm đạt ngưỡng", riders: 6446, cost: 40288, revenue: 57494, profit: 17206, roi: 42.7, opexMax: 3.919, revPerRider: 8.919 }
    ],
    estimators: [
      { name: "Naive", prop: "T_obs thô",  est: 4.8665, lo: 4.545, hi: 5.188, gap: 3.0297, covers: false },
      { name: "IPW Hájek", prop: "thật",       est: 2.0657, lo: 1.665, hi: 2.466, gap: 0.2289, covers: true },
      { name: "AIPW", prop: "thật",            est: 2.0171, lo: 1.712, hi: 2.323, gap: 0.1803, covers: true },
      { name: "IPW Hájek", prop: "ước lượng",  est: 1.9964, lo: 1.574, hi: 2.419, gap: 0.1596, covers: true },
      { name: "AIPW", prop: "ước lượng",       est: 2.0612, lo: 1.746, hi: 2.376, gap: 0.2244, covers: true },
      { name: "RCT, block FE", prop: "bốc thăm", est: 1.9670, lo: 1.690, hi: 2.244, gap: 0.1302, covers: true, main: true }
    ],
    ateTrue: 1.8368,
    outcomeShift: [
      ["Trung vị số chuyến", "6 → 9"],
      ["Tỷ lệ rider 0 chuyến", "20.4% → 13.8%"],
      ["P(rider treatment > rider control)", "0.598"]
    ]
  },

  /* ---------------------------------------------------------- 05 STRESS TEST */
  stress: {
    kpi: [
      { label: "Kết luận vững", value: "10 / 11", tag: { text: "1 mong manh", kind: "warning" }, note: "ngưỡng khai báo trước" },
      { label: "ARI đổi seed", value: "0.978 – 1.000", tag: { text: "≥ 0.90", kind: "good" }, note: "10 seed 42 → 51" },
      { label: "Target giữ qua bootstrap", value: "99.8%", tag: { text: "≥ 90%", kind: "good" }, note: "40 vòng" },
      { label: "p hoán vị", value: "< 0.0001", tag: { text: "13.7 SD", kind: "good" }, note: "10,000 lần tráo" },
      { label: "Lưới kinh tế", value: "52%", tag: { text: "< 90%", kind: "critical" }, note: "ô giữ nguyên quyết định" }
    ],
    baseline: [
      ["Số rider", "20,000"], ["Số cụm", "K = 3"], ["Target cluster", "Cụm 2"],
      ["Target size", "6,446 rider"], ["ATE chính", "1.9670 chuyến / rider"],
      ["SE", "0.1412"], ["95% CI", "[1.6902, 2.2438]"], ["Breakeven", "1.3783"]
    ],
    seedStability: [
      { metric: "ARI", lo: 0.9775, hi: 1.0000 },
      { metric: "Jaccard", lo: 0.9786, hi: 1.0000 },
      { metric: "Precision", lo: 0.9937, hi: 1.0000 },
      { metric: "Recall", lo: 0.9846, hi: 1.0000 }
    ],
    seedTargetSize: "6,384 – 6,484",
    bootstrap: [
      ["Số vòng bootstrap", "40"], ["Jaccard trung bình", "0.9633"],
      ["Jaccard min – max", "0.9002 – 0.9918"], ["Rider target gốc vẫn thuộc target", "99.8%"],
      ["Rider ngoài bị kéo vào", "0.4%"], ["Rider có vị trí lung lay", "3.6%"]
    ],
    specs: [
      { name: "Hiệu trung bình thô", ate: 2.0798, se: 0.1709, lo: 1.7449, hi: 2.4146 },
      { name: "Block FE + HC1", ate: 1.9670, se: 0.1412, lo: 1.6902, hi: 2.2438, main: true },
      { name: "Block FE + hiệp biến + HC1", ate: 1.9172, se: 0.1329, lo: 1.6566, hi: 2.1777 }
    ],
    specSpread: "0.1626 chuyến = 1.2 SE = 8.3% ATE chính",
    leaveOneBlock: [
      ["ATE riêng từng khối", "1.2020 – 2.4977"],
      ["ATE khi bỏ một khối", "1.9062 – 2.0463"],
      ["Biên độ khi bỏ khối", "0.1401 (1.0 SE)"],
      ["Số lần vẫn vượt breakeven", "10 / 10"]
    ],
    fisher: [
      ["Số lần hoán vị", "10,000"], ["Tâm phân phối null", "+0.0018"],
      ["SD null", "0.1437"], ["ATE quan sát", "1.9670"],
      ["ATE so với null", "13.7 SD"], ["p-value hoán vị", "< 0.0001"]
    ],
    bootstrapCI: [
      ["Số lần bootstrap", "2,000"], ["95% CI HC1", "[1.6902, 2.2438]"],
      ["95% CI bootstrap", "[1.6979, 2.2531]"], ["Lệch biên lớn nhất", "0.0093 (1.7% độ rộng CI)"],
      ["SD bootstrap", "0.1421"], ["Tỷ lệ bootstrap vượt breakeven", "100.0%"]
    ],
    dispersion: [
      { label: "SE giải tích", value: 0.1412 },
      { label: "SD phân phối null", value: 0.1437 },
      { label: "SD bootstrap", value: 0.1421 }
    ],
    tipping: [
      { name: "Chi phí / rider", current: "$6.25", flip: "$7.66", margin: 22.6 },
      { name: "Mệnh giá voucher", current: "$5.00", flip: "$6.41", margin: 28.3 },
      { name: "Take rate", current: "20.0%", flip: "16.3%", margin: -18.5 },
      { name: "Cước trung bình / chuyến", current: "$22.67", flip: "$18.49", margin: -18.5 }
    ],
    grid: {
      takeRates: ["15%", "20%", "25%"],
      vouchers: ["$3", "$4", "$5", "$6", "$8", "$10", "$12"],
      /* hàng = voucher, cột = take rate */
      cells: [
        ["Triển khai", "Triển khai", "Triển khai"],
        ["Triển khai", "Triển khai", "Triển khai"],
        ["Cân nhắc",   "Triển khai", "Triển khai"],
        ["Dừng",       "Triển khai", "Triển khai"],
        ["Dừng",       "Dừng",       "Triển khai"],
        ["Dừng",       "Dừng",       "Dừng"],
        ["Dừng",       "Dừng",       "Dừng"]
      ],
      current: { voucher: "$5", takeRate: "20%" }
    },
    summary: [
      { claim: "Cách chia cụm không đổi khi đổi seed", evidence: "ARI 0.978 – 1.000", threshold: "≥ 0.90", verdict: "Vững" },
      { claim: "Target giữ thành viên khi đổi seed", evidence: "Jaccard 0.979 – 1.000", threshold: "≥ 0.80", verdict: "Vững" },
      { claim: "Thành viên target ổn định qua bootstrap", evidence: "99.8%", threshold: "≥ 90%", verdict: "Vững" },
      { claim: "Kết luận không đổi theo estimator", evidence: "Biên độ 0.163 chuyến", threshold: "< 0.20", verdict: "Vững" },
      { claim: "Không khối nào chi phối kết quả", evidence: "Biên độ 0.140 khi bỏ khối", threshold: "< 2 SE", verdict: "Vững" },
      { claim: "Voucher có tác động dương", evidence: "p hoán vị < 0.0001", threshold: "< 0.05", verdict: "Vững" },
      { claim: "Công thức SE đáng tin", evidence: "SD null lệch 1.8% so với SE", threshold: "< 10%", verdict: "Vững" },
      { claim: "Khoảng tin cậy HC1 đáng tin", evidence: "Lệch biên 0.0093", threshold: "< 0.10", verdict: "Vững" },
      { claim: "Uplift vượt hòa vốn", evidence: "100.0% lần bootstrap", threshold: "≥ 95%", verdict: "Vững" },
      { claim: "Quyết định không lật trong vùng vận hành", evidence: "100% ô", threshold: "≥ 90%", verdict: "Vững" },
      { claim: "Quyết định không lật trên toàn lưới kinh tế", evidence: "52% ô", threshold: "≥ 90%", verdict: "Mong manh" }
    ]
  },

  /* ------------------------------------------------------------- CAUSAL */
  causal: {
    question: "Việc gửi mã khuyến mãi cho một người dùng có làm tăng số chuyến đi của chính người đó trong tháng tiếp theo hay không — và tăng bao nhiêu?",
    concepts: [
      { name: "Correlation", q: "X và Y có đi cùng nhau không?",
        ex: "Người nhận promo thường có số chuyến cao hơn, nhưng chưa biết promo làm tăng chuyến hay marketing vốn nhắm người đã đi nhiều." },
      { name: "Prediction", q: "Biết X, đoán Y có tốt hơn không?",
        ex: "Biết một người nhận promo giúp mô hình dự đoán họ đi nhiều hơn, ngay cả khi promo không hề tạo tác động." },
      { name: "Causal effect", q: "Nếu thay đổi X, Y đổi bao nhiêu?",
        ex: "Nếu gửi promo thay vì không gửi cho cùng nhóm người, số chuyến tăng thêm bao nhiêu." }
    ],
    confounders: [
      { name: "Mức độ hoạt động trước đây", toT: "Marketing nhắm vào người đã đi nhiều", toY: "Người đi nhiều trong quá khứ cũng đi nhiều trong tương lai" },
      { name: "Khu vực đô thị", toT: "Thị trường trọng điểm được nhắm nhiều hơn", toY: "Nhiều xe sẵn, quãng đường ngắn, thói quen dùng dịch vụ cao" },
      { name: "Mức độ nhạy giá", toT: "Người nhạy giá dễ được nhắm bằng coupon", toY: "Phản ứng mạnh với giá nên hành vi đặt chuyến khác biệt" }
    ],
    biasDemo: { naive: 4.8665, truth: 1.8368, gap: 3.0297, corrected: 0.2289 }
  },

  /* ------------------------------------------------------------ RUNBOOK */
  runbook: {
    order: [
      ["1", "01. EDA/Data.ipynb", "data/yellow_tripdata_2026.csv"],
      ["2", "01. EDA/2. Time_pattern_analysis.ipynb", "hour, is_wknd, hour_group"],
      ["3", "01. EDA/3. Geo_pattern_analysis.ipynb", "home_borough"],
      ["4", "01. EDA/4. Behavior_analysis.ipynb", "Định nghĩa 9 biến hành vi"],
      ["5", "02. Synthetic_data/gen_synthetic_data_v_final.ipynb", "3 file parquet trong output/"],
      ["6", "03. Segmentation/segmentation.ipynb", "Nhãn cụm + TARGET_CLUSTER + centroid"],
      ["7", "04. AB Testing/experiment.ipynb", "Uplift, CI, guardrail, đánh giá kinh doanh"],
      ["8", "05. Stress test/", "Ma trận độ bền 11 kết luận"]
    ],
    limits: [
      ["Dữ liệu rider là synthetic (TLC không có user_id)", "Kết luận về phương pháp vững; kết luận về thị trường chỉ minh họa quy trình"],
      ["Cơ chế sinh outcome do người thiết kế đặt ra", "IPW/AIPW hoạt động tốt một phần vì mô hình propensity khớp cơ chế sinh dữ liệu"],
      ["Chưa kiểm tra confounder ẩn", "Chưa trả lời được: confounder ẩn phải mạnh cỡ nào mới lật kết luận"],
      ["Take rate 20% và voucher $5 là giả định", "Nguồn của kết luận mong manh duy nhất trong stress test"],
      ["Cửa sổ dữ liệu chỉ 3 tháng", "Không nắm được biến động theo mùa"],
      ["Outcome window chỉ 30 ngày", "Không biết voucher tạo thói quen hay chỉ kéo chuyến từ tương lai về"],
      ["Giả định SUTVA", "Voucher có thể ảnh hưởng nguồn cung xe và qua đó tới rider không nhận voucher"],
      ["Nhắm mục tiêu dừng ở cấp cụm", "Tác động thật biến thiên liên tục theo từng rider"]
    ]
  }
};
