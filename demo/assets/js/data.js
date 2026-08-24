/* ==========================================================================
   DATA - subset used by Demo_Tools only.
   ========================================================================== */
window.DATA = {
  overview: {
    pipeline: [
      ["01", "EDA", "khám phá pattern thời gian, không gian, hành vi chuyến đi"],
      ["02", "Synthetic data", "mô phỏng dữ liệu rider-level từ chuyến thật"],
      ["03", "Segmentation", "phân nhóm rider, xác định target cluster"],
      ["04", "A/B Testing", "đo uplift có ý nghĩa thống kê và kinh tế"],
      ["05", "Stress test", "kiểm tra độ ổn định của kết quả"]
    ],
    result: [
      { label: "Uplift / rider", value: "+1.9670", note: "chuyến · 30 ngày" },
      { label: "Khoảng tin cậy 95%", value: "1.69–2.24", accent: true,
        tag: { text: "> hoà vốn", kind: "good" }, note: "cận dưới vượt 1.3783" },
      { label: "Rider mục tiêu", value: "6,446", note: "32.2% quần thể" },
      { label: "Chuyến tăng thêm", value: "12,679", note: "trên cụm target" },
      { label: "Lợi nhuận ròng", value: "$17,206", tag: { text: "+42.7% ROI", kind: "good" },
        note: "chi phí $40,288" }
    ],
    scale: [
      { label: "Chuyến sau làm sạch", value: "10,444,717",
        note: "từ 11,077,206 chuyến thô" },
      { label: "Rider mô phỏng", value: "20,000", note: "14 cột hành vi" },
      { label: "Persona", value: "3", tag: { text: "K = 3", kind: "series1" },
        note: "ARI 2 seed 0.9751" },
      { label: "Stress test", value: "5 / 5", tag: { text: "đạt", kind: "good" },
        note: "seed · bootstrap · estimator · block · CI" }
    ],
    rollout: {
      note: "Cùng một uplift, hai cách tiêu ngân sách cho hai kết cục ngược nhau.",
      rows: [
        { name: "Rải đại trà", n: "20,000", cost: "$125,000", revenue: "$123,500",
          profit: "-$1,500", roi: "-1.2%", decision: "Dừng" },
        { name: "Chọn lọc cụm target", n: "6,446", cost: "$40,288", revenue: "$57,494",
          profit: "$17,206", roi: "+42.7%", decision: "Triển khai" }
      ]
    }
  },
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
