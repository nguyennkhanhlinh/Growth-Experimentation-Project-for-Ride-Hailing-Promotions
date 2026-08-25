window.DATA = {
  meta: {
    source: "NYC TLC Yellow Taxi · Q1 2026"
  },

  /* ---------------------------------------------------------- Quyết định */
  decision: {
    question: "Voucher có tạo tăng trưởng có lợi nhuận không?",
    lead: "Xác định đúng nhóm khách hàng để tăng số chuyến mà không lãng phí ngân sách cho các chuyến vốn đã xảy ra.",
    options: [
      {
        name: "Rải voucher đại trà",
        riders: "20,000",
        cost: "$125,000",
        profit: "-$1,500",
        roi: "-1.2%",
        verdict: "Không triển khai",
        kind: "critical"
      },
      {
        name: "Chỉ triển khai cho target segment",
        riders: "6,446",
        cost: "$40,288",
        profit: "$17,206",
        roi: "42.7%",
        verdict: "Khuyến nghị triển khai",
        kind: "good"
      }
    ],
    recommend: {
      title: "Triển khai voucher cho nhóm khách cuối tuần, trả Flex, tip thấp.",
      body: "Bắt đầu bằng pilot có giới hạn ngân sách, sau đó scale nếu hiệu quả giữ được duy trì."
    },
    roadmap: [
      ["01", "calendar", "Hiểu nhu cầu",
        "Khách đi khi nào, ở đâu, và như thế nào?", "EDA trên 10.44M chuyến"],
      ["02", "people", "Xây góc nhìn khách hàng",
        "Chuyển dữ liệu chuyến đi thành góc nhìn rider", "20,000 synthetic riders"],
      ["03", "target", "Chọn nhóm có tiềm năng",
        "Nhóm nào có khả năng thay đổi hành vi?", "3 personas"],
      ["04", "flask", "Đo tác động thực",
        "Voucher có thực sự tạo thêm chuyến?", "Randomized A/B test"],
      ["05", "shield", "Bảo vệ quyết định",
        "Uplift có vượt hòa vốn và đủ ổn định không?", "Economics & stress test"]
    ]
  },

  /* ------------------------------------------------- Khách hàng mục tiêu */
  segments: {
    lead: "Chọn đúng nhóm khách hàng có khả năng thay đổi hành vi nhờ voucher.",
    /* trục vẽ thanh so sánh Thấp -> Cao, giá trị lấy từ chính hàng cụm bên dưới */
    metrics: [["Fare", "fare"], ["Cự ly", "dist"], ["Tip", "tip"], ["Airport", "airport"]],
    reasons: [
      { title: "Đủ quy mô", note: "6,446 riders" },
      { title: "Có headroom", note: "Hành vi chưa đều, còn dư địa tăng" },
      { title: "Có economics tốt", note: "Uplift dự kiến vượt breakeven" },
      { title: "Phù hợp mục tiêu", note: "Tập trung tăng thêm chuyến, không lãng phí ngân sách" }
    ],
    quick: [
      ["people",  "6,446",     "Riders đủ điều kiện"],
      ["target",  "32.2%",     "Tỷ trọng toàn bộ riders"],
      ["calendar","Cuối tuần", "Thời điểm di chuyển chính"],
      ["flask",   "Flex",      "Phương thức thanh toán chủ đạo"],
      ["shield",  "Thấp",      "Mức tip trung bình"]
    ],
    axes: ["z_tip", "z_flex", "z_airport", "z_weekend"],
    rows: [
      {
        cluster: 0,
        name: "Khách nội đô ngày thường",
        tone: "rose",
        traits: ["Fare thấp", "Cự ly ngắn", "Tip cao"],
        bullets: ["Fare thấp", "Cự ly ngắn", "Tip cao", "Rủi ro subsidize chuyến vốn đã xảy ra"],
        n: 10946, share: "54.7%",
        z: [0.42, -0.43, -0.36, -0.28],
        dist: 1.70, fare: 16.51, rides: 23.12,
        night: "10.2%", evening: "38.0%",
        target: false,
        why: "Hành vi đi lại đã đều, voucher dễ rơi vào chuyến vốn dĩ vẫn xảy ra."
      },
      {
        cluster: 1,
        name: "Khách sân bay / đường dài",
        tone: "amber",
        traits: ["Fare cao", "Pct airport cao", "Nhu cầu kém nhạy"],
        bullets: ["Fare cao", "Tỷ lệ airport cao", "Nhu cầu ít nhạy với giá", "Quy mô nhỏ"],
        n: 2608, share: "13.0%",
        z: [-0.78, -0.42, 2.04, -0.20],
        dist: 7.32, fare: 38.26, rides: 21.51,
        night: "15.7%", evening: "32.4%",
        target: false,
        why: "Giá trị mỗi chuyến cao nhưng nhu cầu gắn với lịch bay, khó dịch chuyển bằng voucher."
      },
      {
        cluster: 2,
        name: "Khách cuối tuần, trả Flex, tip thấp",
        tone: "teal",
        traits: ["Flex cao", "Weekend cao", "Nhạy giá"],
        bullets: ["Ưu tiên di chuyển cuối tuần", "Thanh toán Flex", "Tip thấp",
                  "Dấu hiệu nhạy giá rõ ràng", "Quy mô đủ lớn để triển khai"],
        n: 6446, share: "32.2%",
        z: [-0.41, 0.90, -0.21, 0.56],
        dist: 3.02, fare: 22.67, rides: 21.61,
        night: "34.3%", evening: "26.4%",
        target: true,
        why: "Nhạy chi phí, đi lại mang tính dịp — nhóm có khả năng phản hồi ưu đãi giá tốt nhất."
      }
    ]
  },

  /* ------------------------------------------------ Bằng chứng thử nghiệm */
  evidence: {
    lead: "Voucher có thực sự tạo thêm chuyến? Kết quả A/B test cho nhóm mục tiêu.",
    health: [
      { label: "Treatment", value: "3,216", note: "riders" },
      { label: "Control", value: "3,230", note: "riders" },
      { label: "SRM p-value", value: "0.8714", pass: true },
      { label: "Max SMD", value: "0.058", pass: true },
      { label: "Randomization", value: "PASS", icon: "shield", accent: true,
        note: "Phân bổ ngẫu nhiên cân bằng" }
    ],
    arms: [
      { label: "Treatment", value: "3,216", note: "49.9% target" },
      { label: "Control", value: "3,230", note: "50.1% target" },
      { label: "SRM p-value", value: "0.8714", pass: true, note: "không mismatch" },
      { label: "Max SMD", value: "0.058", pass: true, note: "covariates cân bằng" }
    ],
    uplift: { est: 1.9670, lo: 1.6902, hi: 2.2438, breakeven: 1.3783 },
    means: { treatment: 9.3999, control: 7.3201, raw: 2.0798, relative: "26.9%" },
    /* (1.9670 - 1.3783) / 1.3783 */
    overBreakeven: "42.7",
    note: "Cận dưới khoảng tin cậy (1.690) vẫn cao hơn breakeven (1.378).",
    conclusion: [
      "Cận dưới khoảng tin cậy (1.690) cao hơn mức breakeven (1.378).",
      "Voucher tạo thêm chuyến có ý nghĩa thống kê và kinh tế."
    ],
    stress: [
      { name: "Seed stability", metric: "ARI 0.978 – 1.000", gate: ">= 0.90", pass: true },
      { name: "Bootstrap seg.", metric: "99.8% giữ target", gate: ">= 90%", pass: true },
      { name: "Alternative est.", metric: "biên độ 0.163", gate: "< 0.20", pass: true },
      { name: "Block removal", metric: "biên độ 0.140", gate: "< 2 SE", pass: true },
      { name: "Bootstrap CI", metric: "100% vượt breakeven", gate: ">= 95%", pass: true }
    ],
    stressFragile: {
      name: "Lưới kinh tế toàn dải",
      metric: "52% ô không lật",
      gate: ">= 90%",
      pass: false,
      note: "Ngoài 5 kiểm tra trên, stress test còn một kết luận mong manh: trên toàn lưới kinh tế chỉ 52% ô giữ nguyên quyết định — voucher lên $8 ở take rate 20%, hoặc ngay từ $5 nếu take rate chỉ 15%, là quyết định lật."
    },
    guardrails: [
      ["Relative lift", "26.9%"],
      ["Marginal revenue", "$8.49 / rider"],
      ["Voucher 0-trip", "13.81% ≤ 20%"]
    ]
  },

  /* -------------------------------------------------- Hiệu quả kinh tế */
  economics: {
    lead: "So sánh hai phương án triển khai để tối ưu lợi nhuận.",
    /* $6.25/rider = $5.00 voucher + $1.25 opex — tách đúng cấu phần,
       không dồn hết vào dòng voucher rồi để opex bằng 0 */
    plans: [
      {
        title: "Phương án A: Rải voucher đại trà",
        tone: "rose",
        rows: [
          ["Riders đủ điều kiện", "20,000"],
          ["Chi phí voucher", "$100,000"],
          ["Chi phí vận hành (opex)", "$25,000"],
          ["Tổng chi phí", "$125,000"],
          ["Doanh thu tăng thêm", "$123,500"]
        ],
        profit: "-$1,500",
        roi: "-1.2%",
        verdict: "STOP",
        ok: false
      },
      {
        title: "Phương án B: Chỉ triển khai cho target",
        tone: "teal",
        rows: [
          ["Riders đủ điều kiện", "6,446"],
          ["Chi phí voucher", "$32,230"],
          ["Chi phí vận hành (opex)", "$8,058"],
          ["Tổng chi phí", "$40,288"],
          ["Doanh thu tăng thêm", "$57,494"]
        ],
        profit: "$17,206",
        roi: "42.7%",
        verdict: "ROLLOUT",
        ok: true
      }
    ],
    compare: {
      cols: ["Đại trà", "Target"],
      rows: [
        ["Eligible riders", "20,000", "6,446"],
        ["Total cost", "$125,000", "$40,288"],
        ["Incremental revenue", "$123,500", "$57,494"],
        ["Net profit", "-$1,500", "$17,206", "num"],
        ["ROI", "-1.2%", "42.7%", "num"],
        ["Decision", "STOP", "ROLLOUT", "chip"]
      ]
    },
    waterfall: [
      { label: "Doanh thu tăng thêm", value: 57494, kind: "in" },
      { label: "− Chi phí voucher", value: -32230, kind: "out" },
      { label: "− Opex", value: -8058, kind: "out" },
      { label: "Lợi nhuận ròng", value: 17206, kind: "net" }
    ],
    conclusion: [
      "Triển khai cho đúng nhóm mục tiêu mang lại ROI dương 42.7% và lợi nhuận ròng $17,206.",
      "Rải đại trà tạo uplift nhưng không đủ bù chi phí, dẫn đến lỗ."
    ],
    assumptions: [
      ["Mệnh giá voucher", "$5.00 / rider"],
      ["Chi phí vận hành", "$1.25 / rider"],
      ["Take rate nền tảng", "20%"],
      ["Fare TB cụm target", "$22.67 / chuyến"],
      ["Doanh thu biên", "$4.53 / chuyến"],
      ["Ngưỡng hòa vốn", "1.3783 chuyến / rider"]
    ]
  },

  /* --------------------------------------- Máy tính / mô phỏng chiến dịch */
  abtest: {
    cate: [
      {
        cluster: 0,
        name: "Nội đô ngày thường",
        n: 10946,
        cate: 1.6016,
        lo: 1.3944,
        hi: 1.8087,
        fare: 16.5076,
        decision: "Dừng"
      },
      {
        cluster: 1,
        name: "Sân bay / đường dài",
        n: 2608,
        cate: 0.4073,
        lo: -0.1602,
        hi: 0.9747,
        fare: 38.2606,
        decision: "Dừng"
      },
      {
        cluster: 2,
        name: "Cuối tuần · Flex",
        n: 6446,
        cate: 1.9670,
        lo: 1.6902,
        hi: 2.2438,
        fare: 22.6722,
        decision: "Triển khai"
      }
    ],
    effect: [
      { name: "Block FE + HC1", est: 1.9670, lo: 1.6901, hi: 2.2439, main: true }
    ],
    defaults: {
      segment: 2,
      voucher: 5,
      take: 20,
      opex: 1.25,
      redeem: 100,
      reach: 100,
      carry: 100
    }
  },

  stress: {
    grid: {
      takeRates: ["15%", "20%", "25%"],
      vouchers: ["$3", "$4", "$5", "$6", "$8", "$10", "$12"],
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
    }
  }
};
