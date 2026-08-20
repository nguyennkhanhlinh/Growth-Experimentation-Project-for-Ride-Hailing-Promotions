/* ==========================================================================
   APP — dựng từng trang từ window.DATA
   ========================================================================== */
(function () {
  "use strict";

  var D = window.DATA, C = window.Charts;
  var S = C.SERIES, SEQ = C.SEQ, ST = C.STATUS;

  /* Ba màu của lưới quyết định đọc từ token, nên đổi theme là đổi theo.
     Phải gọi lại mỗi lần vẽ — không cache — vì màu chỉ đúng sau khi
     data-theme đã được gắn lên <html>. */
  function decisionColors() {
    return {
      "Triển khai": { fill: C.cssVar("--dec-go-fill"),   stroke: C.cssVar("--dec-go-stroke"),   text: C.cssVar("--dec-go-text") },
      "Cân nhắc":   { fill: C.cssVar("--dec-hold-fill"), stroke: C.cssVar("--dec-hold-stroke"), text: C.cssVar("--dec-hold-text") },
      "Dừng":       { fill: C.cssVar("--dec-stop-fill"), stroke: C.cssVar("--dec-stop-stroke"), text: C.cssVar("--dec-stop-text") }
    };
  }

  /* ---------------------------------------------------------- helpers ---- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function code(s) { return "<code>" + esc(s) + "</code>"; }

  var ICON = {
    good: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.8"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 4l9 16H3z" stroke-linejoin="round"/><path d="M12 10v4M12 17.2v.2" stroke-linecap="round"/></svg>',
    bad:  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>'
  };
  /* status luôn = icon + chữ, không bao giờ chỉ có màu */
  function chip(kind, label) {
    var map = { good: ["chip-good", ICON.good], warning: ["chip-warning", ICON.warn], critical: ["chip-critical", ICON.bad] };
    var m = map[kind] || map.good;
    return '<span class="chip ' + m[0] + '">' + m[1] + esc(label) + "</span>";
  }

  function card(opts) {
    var c = el("div", "card " + (opts.cls || ""));
    if (opts.title) {
      var head = el("div", "card-head");
      var left = el("div", "");
      left.appendChild(el("h3", "card-title", esc(opts.title)));
      if (opts.sub) left.appendChild(el("p", "card-sub", opts.sub));
      head.appendChild(left);
      if (opts.right) { var r = el("div", "card-head-right"); r.innerHTML = opts.right; head.appendChild(r); }
      c.appendChild(head);
    }
    (opts.body || []).forEach(function (b) { if (b) c.appendChild(typeof b === "string" ? el("div", "", b) : b); });
    return c;
  }

  function kpiRow(items) {
    var g = el("div", "grid grid-kpi");
    items.forEach(function (it, i) {
      var k = el("div", "kpi");
      var top = el("div", "kpi-top");
      top.appendChild(el("span", "kpi-label", esc(it.label)));
      top.appendChild(el("span", "dot-menu", "•••"));
      k.appendChild(top);
      k.appendChild(el("p", "kpi-value", it.value));
      var meta = el("div", "kpi-meta");
      if (it.tag) meta.innerHTML = '<span class="tag tag-' + it.tag.kind + '">' + esc(it.tag.text) + "</span>";
      if (it.note) meta.appendChild(el("span", "kpi-note", esc(it.note)));
      k.appendChild(meta);
      var wash = el("div", "kpi-spark");
      wash.appendChild(C.kpiWash(C.UI[i % C.UI.length], C.UI[(i + 1) % C.UI.length]));
      k.appendChild(wash);
      g.appendChild(k);
    });
    return g;
  }

  function table(headers, rows, opts) {
    opts = opts || {};
    var wrap = el("div", "table-wrap"), t = el("table");
    var thead = el("thead"), tr = el("tr");
    headers.forEach(function (h, i) {
      var th = el("th", (opts.num || []).indexOf(i) >= 0 ? "num" : "", esc(h));
      tr.appendChild(th);
    });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (r) {
      var row = el("tr");
      r.forEach(function (cell, i) {
        var td = el("td", (opts.num || []).indexOf(i) >= 0 ? "num" : "");
        td.innerHTML = cell;
        row.appendChild(td);
      });
      tb.appendChild(row);
    });
    t.appendChild(tb); wrap.appendChild(t);
    return wrap;
  }

  function kv(pairs) {
    var d = el("div", "kv");
    pairs.forEach(function (p) {
      var r = el("div", "kv-row");
      r.appendChild(el("span", "kv-key", esc(p[0])));
      r.appendChild(el("span", "kv-val", p[1]));
      d.appendChild(r);
    });
    return d;
  }

  function callout(kind, title, body) {
    var c = el("div", "callout " + (kind || ""));
    c.appendChild(el("p", "callout-title", title));
    c.appendChild(el("p", "", body));
    return c;
  }

  /* Tiêu đề trang nằm trên TOPBAR (như bản gốc), không nằm trong nội dung.
     head() chỉ đăng ký tiêu đề rồi trả về phần phụ đề nếu có. */
  var _pageTitle = "";
  function head(title, sub) {
    _pageTitle = title;
    var h = el("div", "page-head");
    if (sub) h.appendChild(el("p", "page-sub", sub));
    return h;
  }

  /* ------- lời dẫn: đoạn mở đầu, câu hỏi trọng tâm, dẫn cho từng khối ----- */
  function lead(html) { return el("p", "lead", html); }

  function quote(label, html) {
    var q = el("blockquote", "quote");
    if (label) q.appendChild(el("span", "quote-label", esc(label)));
    q.appendChild(document.createTextNode(""));
    var span = el("span", "", html);
    q.appendChild(span);
    return q;
  }

  function sectionLead(tag, title, text) {
    var s = el("div", "section-lead");
    var h = el("h2", "");
    if (tag) h.appendChild(el("span", "step-tag", esc(tag)));
    h.appendChild(el("span", "", esc(title)));
    s.appendChild(h);
    if (text) s.appendChild(el("p", "", text));
    return s;
  }

  /* neo cho mục con trong sidebar nhảy tới */
  function anchor(id) {
    var a = el("div", "anchor");
    a.id = "sec-" + id;
    return a;
  }

  /* danh sách gạch đầu dòng từ mảng chuỗi */
  function bullets(items) {
    var ul = el("ul", "");
    ul.style.cssText = "margin:0;padding-left:1.15rem;display:grid;gap:9px";
    items.forEach(function (t) {
      var li = el("li", "");
      li.style.cssText = "color:var(--ink-2);font-size:15px;line-height:1.65";
      li.innerHTML = esc(t);
      ul.appendChild(li);
    });
    return ul;
  }

  /* dải định nghĩa hour_group, rộng tỉ lệ số giờ mỗi khung */
  function hourStripe(buckets) {
    var wrap = el("div", "");
    wrap.style.cssText = "display:flex;gap:2px;flex-wrap:wrap";
    buckets.forEach(function (b, i) {
      var hours = b[0] === "late_night" ? 8 : (b[0] === "morning" ? 4 : 6);
      var seg = el("div", "");
      seg.style.cssText = "flex:" + hours + " 1 0;min-width:96px;padding:8px 10px;border-radius:7px;background:" +
        SEQ[i + 1] + ";color:" + C.cssVar("--on-seq", "#0c0a12") + ";font-weight:700;font-size:12px;line-height:1.35;overflow:hidden";
      seg.innerHTML = esc(b[0]) + "<br><span style='font-weight:600;opacity:.8'>" + esc(b[1]) + "h</span>";
      wrap.appendChild(seg);
    });
    return wrap;
  }

  /* ---------------------------------------------------------------------
     Hero dùng chung cho mọi trang: thẻ gradient xanh bên trái + lưới KPI 2×2
     bên phải. Cùng một khối màu với trang Tổng quan.
     --------------------------------------------------------------------- */
  function kpiTile(it, i) {
    var k = el("div", "kpi" + (it.accent ? " accent" : ""));
    var top = el("div", "kpi-top");
    top.appendChild(el("span", "kpi-label", esc(it.label)));
    top.appendChild(el("span", "dot-menu", "•••"));
    k.appendChild(top);
    k.appendChild(el("p", "kpi-value", it.value));
    var m = el("div", "kpi-meta");
    if (it.tag) m.innerHTML = '<span class="tag tag-' + it.tag.kind + '">' + esc(it.tag.text) + "</span>";
    if (it.note) m.appendChild(el("span", "kpi-note", esc(it.note)));
    k.appendChild(m);
    var wash = el("div", "kpi-spark");
    wash.appendChild(C.kpiWash(C.UI[i % C.UI.length], C.UI[(i + 1) % C.UI.length]));
    k.appendChild(wash);
    return k;
  }

  function pageHero(kpis) {
    var frag = document.createDocumentFragment();
    var row = el("div", "grid grid-kpi");
    (kpis || []).forEach(function (it, i) { row.appendChild(kpiTile(it, i)); });
    frag.appendChild(row);
    return frag;
  }

  /* Biểu đồ gốc trích từ deck — đóng trong đúng loại thẻ như các thẻ khác:
     card gradient + tiêu đề + phụ đề, ảnh nằm trong khung sáng bên trong. */
  /* một ảnh biểu đồ notebook, dùng thẳng trong thân card */
  function fig(file, alt) {
    var frame = el("figure", "figure-frame");
    var img = el("img", "");
    img.src = "assets/img/" + file;
    img.alt = alt || "";
    img.loading = "eager";
    frame.appendChild(img);
    return frame;
  }

  function figureGrid(list, cols) {
    var g = el("div", "figure-grid");
    if (cols) g.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0,1fr))";
    list.forEach(function (f) {
      var frame = el("figure", "figure-frame");
      var img = el("img", "");
      img.src = "assets/img/" + f[0];
      img.alt = f[1];
      img.loading = "eager";
      frame.appendChild(img);
      g.appendChild(card({
        title: f[1],
        sub: f[2],
        body: [frame]
      }));
    });
    return g;
  }

  function steps(items) {
    var d = el("div", "steps");
    items.forEach(function (s, i) {
      var row = el("div", "step");
      row.appendChild(el("div", "step-num", s.num || String(i + 1)));
      var body = el("div", "");
      body.appendChild(el("p", "step-title", s.title));
      body.appendChild(el("p", "step-text", s.text));
      row.appendChild(body);
      d.appendChild(row);
    });
    return d;
  }

  function grid(cls, kids) {
    var g = el("div", "grid " + cls);
    kids.forEach(function (k) { if (k) g.appendChild(k); });
    return g;
  }

  var nf = function (v, d) { return Number(v).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };

  /* ====================================================================== */
  /* PAGES                                                                  */
  /* ====================================================================== */
  var PAGES = {};

  /* -------------------------------------------------------- TỔNG QUAN --- */
  PAGES.overview = function () {
    var f = document.createDocumentFragment();
    f.appendChild(head("Tổng quan dự án"));

    f.appendChild(lead("Dữ liệu gốc là <strong>NYC Yellow Taxi Trip Data</strong> quý I/2026; sau làm sạch còn <strong>10.444.717 chuyến</strong> trên 20 cột ở cấp chuyến đi. Vì dữ liệu TLC không có <code>user_id</code> thật, dự án không thể phân tích khuyến mãi trực tiếp ở cấp khách hàng — nên phải dựng thêm một tầng dữ liệu rider-level mô phỏng từ chính các chuyến có thật."));

    var flow = el("div", "flow");
    [
      ["01", "EDA", "khám phá pattern thời gian, không gian, hành vi chuyến đi"],
      ["02", "Synthetic data", "mô phỏng dữ liệu rider-level từ chuyến thật"],
      ["03", "Segmentation", "phân nhóm rider, xác định target cluster"],
      ["04", "A/B Testing", "đo uplift có ý nghĩa thống kê và kinh tế"],
      ["05", "Stress test", "kiểm tra độ ổn định của kết quả"]
    ].forEach(function (s) {
      var st = el("div", "flow-step");
      st.appendChild(el("p", "flow-num", s[0]));
      st.appendChild(el("p", "flow-title", s[1]));
      st.appendChild(el("p", "flow-text", s[2]));
      flow.appendChild(st);
    });

    f.appendChild(sectionLead(null, "Pipeline chạy tuần tự"));
    f.appendChild(card({
      title: "Pipeline",
      body: [flow]
    }));

    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "Kết quả chính"));

    /* ---- hàng KPI ---- */
    /* mọi con số dưới đây đọc thẳng từ data.js — nguồn là report của từng mục */
    var ab = D.abtest;
    var eff = ab.effect.filter(function (e) { return e.main; })[0] || ab.effect[0];
    var biz = {};
    ab.business.forEach(function (r) { biz[r[0]] = r[1]; });
    var bev = ab.economics.filter(function (r) { return /hòa vốn/i.test(r[0]); })[0];
    var bevVal = bev ? String(bev[1]).replace(/[^\d.]/g, "") : "";

    var heroKpi = el("div", "grid grid-kpi");
    [
      { label: "Uplift / rider", value: "+" + eff.est.toFixed(3), note: "chuyến · 30 ngày" },
      { label: "Khoảng tin cậy 95%", value: eff.lo.toFixed(2) + "–" + eff.hi.toFixed(2),
        tag: { text: "> hòa vốn", kind: "good" },
        note: "cận dưới vượt " + (bevVal || "ngưỡng hòa vốn"), accent: true },
      { label: "Rider mục tiêu", value: biz["Rider được gửi voucher"],
        note: D.segmentation.clusters[2].share + "% quần thể" },
      { label: "Lợi nhuận ròng", value: biz["Lợi nhuận ròng"], note: "chi phí " + biz["Tổng chi phí"] }
    ].forEach(function (it, i) {
      var k = el("div", "kpi" + (it.accent ? " accent" : ""));
      k.appendChild(el("p", "kpi-label", esc(it.label)));
      k.appendChild(el("p", "kpi-value", it.value));
      var m = el("div", "kpi-meta");
      if (it.tag) m.innerHTML = '<span class="tag tag-' + it.tag.kind + '">' + esc(it.tag.text) + "</span>";
      m.appendChild(el("span", "kpi-note", esc(it.note)));
      k.appendChild(m);
      var wash = el("div", "kpi-spark");
      wash.appendChild(C.kpiWash(C.UI[i % C.UI.length], C.UI[(i + 1) % C.UI.length]));
      k.appendChild(wash);
      heroKpi.appendChild(k);
    });

    f.appendChild(heroKpi);

    var segK = D.segmentation.kpi;
    var naive = ab.estimators[0];
    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "Quy mô và độ tin cậy"));
    f.appendChild(kpiRow([
      { label: "Chuyến thô đầu vào", value: D.eda.deck.quality.kpi[0][0], note: "NYC TLC · Q1 2026" },
      { label: "Rider mô phỏng", value: segK[0].value, note: "14 cột hành vi" },
      { label: "Persona", value: String(D.segmentation.clusters.length),
        tag: { text: segK[1].value, kind: "series1" }, note: "ARI 2 seed " + segK[3].value },
      { label: "Kết luận vững", value: D.stress.kpi[0].value,
        tag: { text: "stress test", kind: "warning" }, note: D.stress.kpi[0].tag.text },
      { label: "Thiên lệch đo được", value: "+" + naive.gap.toFixed(2),
        tag: { text: naive.name.toLowerCase(), kind: "critical" },
        note: "trên tác động thật " + ab.ateTrue.toFixed(2) }
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(lead("<strong>Kết luận tổng quát:</strong> voucher có tác động tích cực, nhưng chỉ nên triển khai <strong>có chọn lọc</strong> cho nhóm target, không nên rải đại trà cho toàn bộ rider."));

    return f;
  };

  /* ------------------------------------------------------------- 01 EDA --- */
  /* Mục 01 được tách thành 6 trang con riêng, không phải một trang cuộn dài.
     Mỗi trang con tương ứng một slide của deck index.html.                    */

  var EDA_ORDER = ["dict", "quality", "time", "geo", "behavior"];
  var EDA_TITLES = {
    dict:     "Từ điển dữ liệu",
    quality:  "Chất lượng dữ liệu",
    time:     "Time pattern analysis",
    geo:      "Geo pattern analysis",
    behavior: "Behavior analysis"
  };
  function subHead(sub, title, subtitle) {
    _pageTitle = title;
    var h = el("div", "page-head");
    if (subtitle) h.appendChild(el("p", "page-sub", subtitle));
    return h;
  }

  function edaPager(cur) {
    var i = EDA_ORDER.indexOf(cur);
    var p = el("div", "pager");
    var prev = EDA_ORDER[i - 1], next = EDA_ORDER[i + 1];

    if (prev) {
      var a = el("a", "pager-link prev");
      a.href = "#eda:" + prev;
      a.innerHTML = '<span class="pager-dir">← Trước</span><span class="pager-name">' + esc(EDA_TITLES[prev]) + "</span>";
      p.appendChild(a);
    } else { p.appendChild(el("div", "pager-empty")); }

    if (next) {
      var b = el("a", "pager-link next");
      b.href = "#eda:" + next;
      b.innerHTML = '<span class="pager-dir">Tiếp →</span><span class="pager-name">' + esc(EDA_TITLES[next]) + "</span>";
      p.appendChild(b);
    } else { p.appendChild(el("div", "pager-empty")); }
    return p;
  }

  var EDA = {};

  /* ------------------------- 1 · Chất lượng dữ liệu ---------------------- */
  EDA.quality = function () {
    var d = D.eda, k = d.deck, f = document.createDocumentFragment();
    f.appendChild(subHead("quality", "Chất lượng dữ liệu"));
    f.appendChild(quote("Mục tiêu",
      "Từ 11 triệu chuyến đi thô, hiểu rõ chất lượng dữ liệu, phân phối hành vi, và tạo ra một bộ dữ liệu sạch đủ để xây dựng synthetic rider-level dataset."));

    f.appendChild(pageHero(k.quality.kpi.map(function (r, i) {
      return { label: r[1], value: r[0], note: i === 3 ? "lọc bản ghi bất hợp lệ" : "", accent: i === 3 };
    })));

    f.appendChild(sectionLead(null, "Tổng quan"));
    f.appendChild(card({
      body: [table(["", "Nhóm", "Kết quả"],
        k.quality.checks.map(function (c) {
          return [chip("good", ""), "<strong>" + esc(c[0]) + "</strong>", esc(c[1])];
        }))]
    }));

    f.appendChild(el("div", "mb"));
    f.appendChild(grid("grid-2", [
      card({
        title: "Tỷ lệ bản ghi bất thường theo cột",
        sub: 'Quy tắc <code>0 &lt; x ≤ 1.5 × p99.9</code> — ngưỡng chọn để giữ 99.9% dữ liệu thật.',
        body: [C.hBar({
          rows: d.invalidRate.map(function (r) {
            return { label: r.label, value: r.value, color: r.action === "Loại" ? S[1] : S[2], note: "Xử lý: " + r.action };
          }),
          width: 520, labelW: 138, max: 3.5,
          valueFmt: function (v) { return v + "%"; },
          ttRows: function (r) { return [{ k: "Tỷ lệ vi phạm", v: r.value + "%", color: r.color }]; }
        }),
          C.legend([{ label: "Loại bản ghi", color: S[1] }, { label: "Giữ nguyên", color: S[2] }])]
      }),
      card({
        title: "Làm sạch dữ liệu",
        sub: "Từ bản ghi thô xuống bộ dữ liệu dùng được.",
        body: [C.funnel({
          steps: [
            { label: "Chuyến thô", value: 11.077206, note: "3 file parquet TLC · 20 cột" },
            { label: "Sau làm sạch", value: 10.483497, note: "loại bản ghi bất hợp lệ về distance / fare / duration / speed" }
          ],
          width: 520, valueFmt: function (v) { return v.toFixed(2) + "M"; }
        })]
      })
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(grid("grid-2", [
      card({
        title: "Rule lọc giá trị bất thường",
        body: [table(["Cột", "Rule"],
          [
            ["trip_distance", "0 < x <= 100"],
            ["fare_amount", "0 < x <= 500"],
            ["total_amount", "0 < x <= 1000"],
            ["passenger_count", "1 <= x <= 6"],
            ["tip_amount", "0 <= x <= 200"]
          ].map(function (r) { return [code(r[0]), code(r[1])]; }))]
      }),
      card({
        title: "Giá trị thiếu không phải lỗi dữ liệu",
        sub: "5 cột cùng thiếu đúng một tập bản ghi.",
        body: [C.barChart({
          categories: D.eda.deck.quality.missingSplit.map(function (r) { return r.label; }),
          series: [{ name: "Số bản ghi", values: D.eda.deck.quality.missingSplit.map(function (r) { return r.value; }), color: S[1] }],
          width: 430, height: 200,
          valueFmt: function (v) { return nf(v); },
          tickFmt: function (t) { return (t / 1e6).toFixed(0) + "M"; }
        }),
          el("div", "mb"),
          kv([
          ["Số bản ghi null", "<strong>3.057.123</strong>"],
          ["Tỷ lệ", "<strong>27,6%</strong>"],
          ["Số tổ hợp null", "<strong>2</strong>"],
          ["Trùng khớp với", code("payment_type = 0")]
        ]),
        ]
      })
    ]));

    f.appendChild(el("div", "mb"));
    return f;
  };

  /* ------------------------------ 2 · Giờ & ngày ------------------------- */
  EDA.time = function () {
    var k = D.eda.deck, f = document.createDocumentFragment();
    f.appendChild(subHead("time", "Time pattern analysis — giờ, ngày và mùa vụ"));

    f.appendChild(grid("grid-2", [
      card({
        title: "Hour-of-day",
        sub: "Chênh lệch giữa giờ cao điểm và thấp điểm lên tới ~7,8 lần.",
        body: [fig("time_02_hourly_area.png", "Số chuyến theo giờ trong ngày"),
          el("div", "mb"),
          bullets(k.time.hourOfDay)]
      }),
      card({
        title: "Day-of-week",
        sub: "Tổng số chuyến cả quý theo từng thứ.",
        body: [fig("time_03_day_of_week.png", "Số chuyến theo thứ trong tuần"),
          el("div", "mb"),
          bullets(k.time.dayOfWeek)]
      })
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(grid("grid-2", [
      card({
        title: "Weekday vs Weekend theo giờ",
        sub: "Trung bình chuyến/ngày",
        body: [fig("time_06_weekday_weekend_hour_avg.png", "Nhu cầu theo giờ, weekday so với weekend"),
          el("div", "mb"),
          bullets([esc(k.time.insight)])]
      }),
      card({
        title: "TB chuyến/ngày · Weekday vs Weekend",
        sub: "Chuẩn hoá theo số ngày của từng loại.",
        body: [fig("time_04_avg_daily_day_type.png", "TB số chuyến mỗi ngày theo day type"),
          el("div", "mb"),
          kv(k.time.perDay.map(function (r) { return ["TB/ngày · " + r.label, "<strong>" + r.value + "K</strong>"]; }))]
      })
    ]));

    f.appendChild(el("div", "mb"));

    f.appendChild(grid("grid-2", [
      card({
        title: "Tổng số chuyến theo tháng",
        sub: "Đơn vị: triệu chuyến.",
        body: [C.barChart({
          categories: k.season.monthTotal.map(function (r) { return r.label; }),
          series: [{ name: "Tổng chuyến", values: k.season.monthTotal.map(function (r) { return r.value; }), color: S[0] }],
          width: 460, height: 240,
          valueFmt: function (v) { return v + "M"; }, tickFmt: function (t) { return t + "M"; }
        }),
          bullets(k.season.monthNotes)]
      }),
      card({
        title: "TB chuyến/ngày theo tháng",
        sub: "Chuẩn hoá theo số ngày — tháng 2 không còn là tháng thấp nhất.",
        body: [C.barChart({
          categories: k.season.monthPerDay.map(function (r) { return r.label; }),
          series: [{ name: "TB/ngày", values: k.season.monthPerDay.map(function (r) { return r.value; }), color: S[2] }],
          width: 460, height: 240,
          valueFmt: function (v) { return nf(v) + " chuyến"; },
          tickFmt: function (t) { return (t / 1000) + "K"; }
        }),
          bullets(k.season.perDayNotes)]
      })
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(grid("grid-2", [
      card({
        title: "Hai ngày bất thường",
        body: [C.hBar({
          rows: k.season.anomalies.map(function (a) {
            return { label: a.date, value: a.trips, color: ST.critical, note: k.season.anomalyCause };
          }).concat([{ label: "TB ngày thường", value: 115249, color: S[2], note: "mốc so sánh" }]),
          width: 420, labelW: 124, max: 120000,
          valueFmt: function (v) { return nf(v); },
          ttRows: function (r) { return [{ k: "Số chuyến", v: nf(r.value), color: r.color }]; }
        }),
          fig("time_07_daily_trend.png", "Xu hướng số chuyến theo ngày"),
          el("div", "mb"),
          callout("danger", "Nguyên nhân", esc(k.season.anomalyCause))]
      }),
      card({
        title: "Holiday effect — ba ngày lễ",
        sub: "Ngày lễ không chỉ làm giảm, nó <em>dịch chuyển</em> phân bố theo giờ.",
        body: [fig("time_08_holiday_hourly.png", "Phân bố theo giờ của ba ngày lễ"),
          el("div", "mb"),
          table(["Ngày lễ", "Số chuyến", "Đặc điểm theo giờ"],
            k.season.holidays.map(function (h) {
              return ["<strong>" + esc(h.name) + "</strong><br><span class=\"kpi-note\">" + esc(h.date) + "</span>",
                nf(h.trips), esc(h.detail)];
            }), { num: [1] })]
      })
    ]));

    f.appendChild(el("div", "mb"));

    return f;
  };

  /* ------------------------------ 4 · Không gian ------------------------- */
  EDA.geo = function () {
    var k = D.eda.deck, f = document.createDocumentFragment();
    f.appendChild(subHead("geo", "Geo pattern analysis — không gian hoạt động"));

    f.appendChild(grid("grid-2", [
      card({
        title: "Pickup hotspots",
        sub: "Năm điểm đón nhiều nhất trong Top 20.",
        body: [C.hBar({
          rows: k.geo.pickupTop.map(function (r, i) {
            return { label: r.label, value: r.value, color: SEQ[i] };
          }),
          width: 470, labelW: 140, max: 470000,
          valueFmt: function (v) { return nf(v); },
          ttRows: function (r) { return [{ k: "Số chuyến đón khách", v: nf(r.value), color: r.color }]; }
        }),
          el("div", "mb"),
          bullets(k.geo.pickup)]
      }),
      card({
        title: "Dropoff hotspots",
        sub: "Năm zone trả khách nhiều nhất.",
        body: [C.hBar({
          rows: k.geo.dropoffTop.map(function (r, i) {
            return { label: r.label, value: r.value, color: SEQ[i] };
          }),
          width: 470, labelW: 140, max: 470000,
          valueFmt: function (v) { return nf(v); },
          ttRows: function (r) { return [{ k: "Số chuyến trả khách", v: nf(r.value), color: r.color }]; }
        }),
          el("div", "mb"),
          bullets(k.geo.dropoff)]
      })
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(grid("grid-2", [
      card({
        title: "Origin–Destination flow",
        sub: "Năm tuyến có lưu lượng lớn nhất.",
        body: [C.hBar({
          rows: k.geo.odTop.map(function (r, i) {
            return { label: r.label, value: r.value, color: SEQ[i] };
          }),
          width: 470, labelW: 172, max: 70000,
          valueFmt: function (v) { return nf(v); },
          ttRows: function (r) { return [{ k: "Số chuyến", v: nf(r.value), color: r.color }]; }
        }),
          el("div", "mb"),
          bullets(k.geo.odFlow)]
      }),
      card({
        title: "Airport analysis",
        sub: "Chỉ <strong>" + k.geo.airport.share + "%</strong> số chuyến liên quan sân bay (JFK · LGA · EWR), nhưng đặc tính khác hẳn phần còn lại.",
        body: [C.hBar({
          rows: k.geo.airport.compare.map(function (c, i) {
            return { label: c.metric, value: c.ratio, color: [S[0], S[1], S[2]][i],
              note: "Sân bay " + (c.unit === "$" ? "$" + c.airport : c.airport + c.unit) +
                    " vs còn lại " + (c.unit === "$" ? "$" + c.other : c.other + c.unit) };
          }),
          width: 420, labelW: 116, max: 5.2,
          valueFmt: function (v) { return v.toFixed(2) + "×"; },
          ttRows: function (r) { return [{ k: "Chênh lệch", v: r.value.toFixed(2) + " lần", color: r.color }]; }
        }),
          el("div", "mb"),
          table(["Chỉ số", "Chuyến sân bay", "Chuyến còn lại", "Chênh"],
            k.geo.airport.compare.map(function (c) {
              var f1 = c.unit === "$" ? "$" + c.airport : c.airport + c.unit;
              var f2 = c.unit === "$" ? "$" + c.other : c.other + c.unit;
              return [c.metric, "<strong>" + f1 + "</strong>", f2, c.ratio.toFixed(2) + "×"];
            }), { num: [1, 2, 3] }),
          el("p", "card-sub", esc(k.geo.airport.note))]
      })
    ]));

    f.appendChild(figureGrid(D.eda.figures.geo));
    return f;
  };

  /* --------------------------- 5 · Hành vi chuyến đi --------------------- */
  EDA.behavior = function () {
    var k = D.eda.deck, f = document.createDocumentFragment();
    f.appendChild(subHead("behavior", "Behavior analysis — hành vi chuyến đi"));

    f.appendChild(grid("grid-2", [
      card({
        title: "Trip distance",
        sub: "Phân vị quãng đường, đơn vị: dặm.",
        body: [C.barChart({
          categories: k.behavior.distancePct.map(function (r) { return r.label; }),
          series: [{ name: "Quãng đường", values: k.behavior.distancePct.map(function (r) { return r.value; }), color: S[0] }],
          width: 440, height: 220,
          valueFmt: function (v) { return v.toFixed(2) + " mi"; },
          tickFmt: function (t) { return t + " mi"; }
        }),
          el("div", "mb"),
          bullets(k.behavior.distance)]
      }),
      card({
        title: "Fare analysis",
        sub: "Trung bình cao hơn trung vị — phân phối lệch phải do nhóm chuyến dài.",
        body: [C.barChart({
          categories: k.behavior.fareBars.map(function (r) { return r.label; }),
          series: [{ name: "USD / chuyến", values: k.behavior.fareBars.map(function (r) { return r.value; }), color: S[1] }],
          width: 430, height: 200,
          valueFmt: function (v) { return "$" + v.toFixed(2); },
          tickFmt: function (t) { return "$" + t; }
        }),
          el("div", "mb"),
          kv(k.behavior.fare.map(function (r) { return [r.label, "<strong>" + esc(r.value) + "</strong>"]; }))]
      })
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(card({
        title: "Trip duration — phân khúc theo thời lượng",
        sub: "Đơn vị: % tổng số chuyến. Dưới 30 phút chiếm ~87,5%.",
        body: [C.barChart({
          categories: k.behavior.duration.map(function (r) { return r.label.replace(/ \(.*/, ""); }),
          series: [{ name: "Tỷ trọng", values: k.behavior.duration.map(function (r) { return r.value; }), color: S[2] }],
          width: 560, height: 250,
          valueFmt: function (v) { return v + "%"; }, tickFmt: function (t) { return t + "%"; },
          catLabel: function (c, i) { return k.behavior.duration[i].label; }
        }),
          el("div", "mb"),
          kv(k.behavior.durationStats.map(function (r) { return [r[0], "<strong>" + esc(r[1]) + "</strong>"]; })),
          el("div", "mb"),
          bullets(k.behavior.durationNotes)]
    }));

    f.appendChild(figureGrid(D.eda.figures.behavior));

    f.appendChild(el("div", "mb"));
    f.appendChild(card({
      title: "Địa điểm theo phân khúc quãng đường",
      sub: "Cự ly càng dài thì tuyến càng dịch ra khỏi Manhattan — và ở nhóm dài nhất thì gần như hoàn toàn là chuyến sân bay.",
      body: [C.hBar({
        rows: k.behavior.segmentTop.map(function (r, i) {
          return { label: r.label, value: r.value, color: SEQ[Math.min(i, 4)] };
        }),
        width: 620, labelW: 210, max: 70000,
        valueFmt: function (v) { return nf(v); },
        ttRows: function (r) { return [{ k: "Số chuyến", v: nf(r.value), color: r.color }]; }
      }),
        el("div", "mb"),
        table(["Phân khúc", "Tuyến tiêu biểu"],
        k.behavior.segments.map(function (s) { return ["<strong>" + esc(s.name) + "</strong>", esc(s.detail)]; }))]
    }));

    return f;
  };

  /* ---------------------------- 6 · Từ điển dữ liệu ---------------------- */
  EDA.dict = function () {
    var d = D.eda, k = D.eda.deck, f = document.createDocumentFragment();
    f.appendChild(subHead("dict", "Từ điển dữ liệu — 20 trường NYC TLC"));

    f.appendChild(grid("grid-kpi", k.quality.dictGroups.map(function (g) {
      var c = el("div", "kpi kpi-plain");
      c.appendChild(el("p", "kpi-label", esc(g[0])));
      c.appendChild(el("p", "kpi-value", String(g[1]) + '<span class="unit"> trường</span>'));
      var m = el("div", "kpi-meta");
      m.appendChild(el("span", "kpi-note", esc(g[2])));
      c.appendChild(m);
      return c;
    })));

    f.appendChild(el("div", "mb"));
    f.appendChild(card({
      body: [table(["#", "Trường", "Kiểu", "Đơn vị", "Ý nghĩa", "Ghi chú"],
        d.dictionary.map(function (r) {
          return [String(r[0]), code(r[1]), esc(r[2]), esc(r[3]), esc(r[4]),
            r[5] ? '<span class="kpi-note">' + esc(r[5]) + "</span>" : ""];
        }), { num: [0] })]
    }));
    return f;
  };

  PAGES.eda = function (sub) {
    if (sub === "season") sub = "time";          /* gộp vào Time pattern */
    sub = EDA[sub] ? sub : "dict";
    var f = document.createDocumentFragment();
    f.appendChild(EDA[sub]());
    return f;
  };

  /* ------------------------------------------------------- 02 SYNTHETIC --- */
  PAGES.synthetic = function () {
    var d = D.synthetic, f = document.createDocumentFragment();
    f.appendChild(head("Synthetic data — Sinh dữ liệu cấp rider"));
    f.appendChild(pageHero(d.kpi.map(function (x, i) { return i === 1 ? Object.assign({}, x, { accent: true }) : x; })));

    /* 16 archetype = lưới 4x4, đậm nhạt theo tỷ trọng thật p_arch */
    var pA = d.archetypes.pArch;
    var pMax = Math.max.apply(null, pA.map(function (r) { return Math.max.apply(null, r); }));

    var gridBox = el("div", "");
    var tbl = el("table");
    var thr = el("tr");
    thr.appendChild(el("th", "", ""));
    d.archetypes.dist.forEach(function (x) { thr.appendChild(el("th", "", esc(x))); });
    thr.appendChild(el("th", "", "Tổng"));
    var thead = el("thead"); thead.appendChild(thr); tbl.appendChild(thead);
    var tbody = el("tbody");
    d.archetypes.time.forEach(function (t, ti) {
      var tr = el("tr");
      tr.appendChild(el("td", "", "<strong>" + esc(t) + "</strong>"));
      var sum = 0;
      d.archetypes.dist.forEach(function (_, di) {
        var v = pA[ti][di];
        sum += v;
        var td = el("td", "", v.toFixed(1) + "%");
        td.style.background = "rgba(139,92,246," + (0.05 + 0.40 * (v / pMax)).toFixed(3) + ")";
        td.style.textAlign = "center";
        td.style.fontVariantNumeric = "tabular-nums";
        if (v === pMax) td.style.fontWeight = "700";
        td.title = t + " · " + d.archetypes.dist[di];
        tr.appendChild(td);
      });
      var tot = el("td", "", "<strong>" + sum.toFixed(1) + "%</strong>");
      tot.style.textAlign = "center";
      tr.appendChild(tot);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    var wrapT = el("div", "table-wrap"); wrapT.appendChild(tbl);
    gridBox.appendChild(wrapT);

    var flowPre = el("pre", "pre");
    flowPre.textContent =
      "lambda_i ~ LogNormal(mu = 8, CV = 0.60)\n" +
      "     |\n" +
      "     v  ai ngủ đông\n" +
      "dormant_i ~ Bernoulli(pi_i)                    [xác suất cao nếu lambda thấp]\n" +
      "     |\n" +
      "     v  còn hoạt động bao nhiêu ngày\n" +
      "a_days = 90 nếu còn hoạt động; ~ Uniform(5, 70) nếu ngủ đông\n" +
      "     |\n" +
      "     v  quan sát được bao nhiêu chuyến\n" +
      "total_rides ~ Poisson(lambda_i * a_days / 30)  [sàn 1]\n" +
      "     |\n" +
      "     v  chuyến gần nhất cách đây bao lâu\n" +
      "recency_days = (90 - a_days) + Exponential(30 / lambda_i)   [trần 90]";

    f.appendChild(sectionLead(null, "1. Chia chuyến đi thành archetype",
      "Mỗi chuyến TLC được xếp vào một trong 16 archetype theo hai trục: khung giờ và cự ly. Tỷ lệ xuất hiện <code>p_arch</code> của từng archetype trong dữ liệu thật trở thành phân phối nền, nhờ vậy hành vi rider giữ được cấu trúc thực tế thay vì sinh từ phân phối giả định."));
    f.appendChild(grid("grid-2", [
      card({
        title: "16 archetype chuyến đi",
        sub: "4 khung giờ × 4 nhóm cự ly. Số trong ô là <code>p_arch[k]</code> — tỷ trọng thật của archetype đó trong 10,4 triệu chuyến TLC.",
        body: [gridBox]
      }),
      card({
        title: "Tham số cấu hình",
        sub: "Toàn bộ giả định tập trung ở cell SET UP.",
        body: [table(["Tham số", "Giá trị", "Ý nghĩa"],
          d.params.map(function (r) { return [code(r[0]), "<strong>" + esc(r[1]) + "</strong>", r[2]]; }))]
      })
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "2. Sinh tần suất và recency của rider",
      "Mỗi rider được mô phỏng bằng một mức nhu cầu riêng <code>lambda_i ~ LogNormal(mean = 8, CV = 0,60)</code>. Từ lambda suy ra xác suất ngủ đông, số ngày còn hoạt động trong cửa sổ 90 ngày, rồi mới tới <code>total_rides</code> và <code>recency_days</code> — nên hai biến này tương quan với nhau"));
    f.appendChild(card({
      title: "Sinh khung thời gian hoạt động",
      sub: "Toàn bộ tần suất điều khiển bởi một biến duy nhất <code>lambda_i</code>.",
      body: [flowPre]
    }));

    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "3. Gán chuyến TLC thật và tổng hợp feature rider-level",
      "Từ vector tỷ trọng archetype, mỗi rider được bốc đúng <code>total_rides</code> chuyến từ dữ liệu TLC thực tế. Sau đó dữ liệu được tổng hợp từ cấp chuyến lên cấp rider: tần suất do mô phỏng, còn cự ly, cước, tip, sân bay và borough đều lấy từ chuyến thật."));
    f.appendChild(card({
      title: "Chín biến hành vi tổng hợp",
      sub: "Mọi đặc trưng đều tính từ chuyến TLC có thật được gán cho rider.",
      body: [table(["Biến", "Cách tính", "Ý nghĩa"],
        d.behaviorCols.map(function (r) { return [code(r[0]), esc(r[1]), r[2]]; }))]
    }));

    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "4. Causal contract",
      "Định nghĩa tường minh trước khi sinh outcome. Nhờ có mốc chuẩn này, các bước sau chấm điểm được từng phương pháp ước lượng: nếu kết quả lệch xa <code>ate_true</code> thì lỗi nằm ở phương pháp, không phải vì không biết sự thật."));
    f.appendChild(card({
      title: "Causal contract",
      sub: "Đơn vị, treatment, cửa sổ quan sát và ground truth.",
      body: [table(["Khái niệm", "Định nghĩa"], d.contract.map(function (r) { return ["<strong>" + esc(r[0]) + "</strong>", esc(r[1])]; }))]
    }));

    return f;
  };

  /* ---------------------------------------------------- 03 SEGMENTATION --- */
  PAGES.segmentation = function () {
    var d = D.segmentation, f = document.createDocumentFragment();
    f.appendChild(head("Segmentation — Phân khúc khách hàng"));
    f.appendChild(lead("Trong bối cảnh khuyến mãi, gửi voucher cho toàn bộ người dùng thường dễ gây lãng phí ngân sách. Một số rider vốn đã đi đều, một số có nhu cầu khó thay đổi bằng giá, và chỉ một phần khách hàng có khả năng phản hồi tốt với ưu đãi. Vì vậy segmentation ở đây được dùng như <strong>bước lọc chiến lược</strong> trước khi thiết kế A/B test."));
    f.appendChild(quote("Câu hỏi",
      "Trong toàn bộ rider, nhóm khách hàng nào đủ tiềm năng để chọn làm target cho chiến dịch voucher?"));
    f.appendChild(pageHero(d.kpi.map(function (x, i) { return i === 4 ? Object.assign({}, x, { accent: true }) : x; })));

    /* chọn K */
    var ks = d.kSelection;
    f.appendChild(sectionLead(null, "1. Chọn K",
      "Trước khi phân cụm, dữ liệu được kiểm tra sạch (0 giá trị thiếu, 0 dòng trùng, 0 <code>user_id</code> trùng) và bốn trục hành vi được chuẩn hóa về cùng thang đo. Khi các trục đã cùng thang đo, bước tiếp theo là quyết định chia rider thành bao nhiêu cụm — số cụm sẽ quyết định toàn bộ cách diễn giải persona phía sau, nên nó được chọn theo <strong>ràng buộc trước, tối ưu sau</strong> thay vì theo một chỉ số duy nhất."));
    f.appendChild(grid("grid-2-1", [
      card({
        title: "Chọn số cụm K — ràng buộc trước, tối ưu sau",
        sub: "Silhouette thật so với baseline hoán vị. Chỉ phần <em>vượt</em> baseline mới là bằng chứng về cấu trúc thật.",
        body: [C.barChart({
          categories: ks.map(function (r) { return "K = " + r.k; }),
          series: [
            { name: "Silhouette thật", values: ks.map(function (r) { return r.sil; }), color: S[0] },
            { name: "Silhouette null (hoán vị)", values: ks.map(function (r) { return r.silNull; }), color: S[2] }
          ],
          width: 600, height: 250,
          valueFmt: function (v) { return v.toFixed(4); },
          tickFmt: function (t) { return t.toFixed(2); },
          note: function (i) { return "sil_gap " + ks[i].gap.toFixed(4) + " · " + ks[i].verdict; }
        }),
          callout("", "Vì sao K = 2 bị loại dù silhouette cao nhất",
            "Silhouette thô của K = 2 là <strong>0.3405</strong> — cao nhất. Nhưng silhouette null của nó cũng tới <strong>0.3190</strong>, nghĩa là phần lớn điểm số đến từ cấu trúc ngẫu nhiên còn lại sau khi hoán vị. K = 3 có silhouette thấp hơn nhưng phần vượt baseline cao nhất (0.0479).")]
      }),
      card({
        title: "Elbow đối chiếu",
        sub: "Khoảng cách tới dây cung, xác định bằng kneedle.",
        body: [C.lineChart({
          categories: d.elbow.map(function (e) { return String(e.k); }),
          series: [{ name: "Khoảng cách", values: d.elbow.map(function (e) { return e.d; }), color: S[1] }],
          width: 300, height: 220,
          valueFmt: function (v) { return v.toFixed(4); },
          tickFmt: function (t) { return t.toFixed(2); },
          catLabel: function (c) { return "K = " + c; }
        }),
          el("p", "card-sub", "Hai tiêu chí độc lập cùng chỉ về <strong>K = 3</strong>.")]
      })
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(table(["K", "Silhouette", "Sil null", "Sil gap", "ARI 2 seed", "Min share", "Kết luận"],
      ks.map(function (r) {
        return [(r.chosen ? "<strong>K = " + r.k + "</strong>" : "K = " + r.k),
          r.sil.toFixed(4), r.silNull.toFixed(4),
          (r.chosen ? "<strong>" + r.gap.toFixed(4) + "</strong>" : r.gap.toFixed(4)),
          r.ari.toFixed(4), r.minShare.toFixed(2) + "%",
          r.chosen ? chip("good", r.verdict) : (r.verdict.indexOf("Loại") === 0 ? chip("critical", r.verdict) : r.verdict)];
      }), { num: [1, 2, 3, 4, 5] }));

    /* phân bố cụm + z-score */
    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "2. Phân cụm",
      "Chạy KMeans với K đã chọn trên ma trận 20.000 × 4 đã chuẩn hoá, cấu hình <code>n_init=10</code> và <code>random_state=42</code> để kết quả tái lập được. Mỗi rider nhận một nhãn cụm; ba cụm thu được đều đủ lớn để triển khai chiến dịch riêng."));
    f.appendChild(grid("grid-2", [
      card({
        title: "Phân bố ba cụm",
        sub: "Mọi cụm đều ≥ 5% quần thể.",
        body: [C.gauge({
          segments: d.clusters.map(function (c, i) {
            return { label: "Cụm " + c.id + " · " + c.short, value: c.n, display: nf(c.n) + " rider", color: S[i], note: c.target ? "Được chọn làm target" : null };
          }),
          centerLabel: "TỔNG RIDER", centerValue: "20,000",
          measure: "Số rider", width: 330, height: 215
        })]
      }),
      card({
        title: "Hồ sơ persona theo z-score",
        sub: "z > 0 nghĩa là cụm cao hơn trung bình toàn bộ rider trên trục đó.",
        body: [C.divergingBar({
          groups: [
            { label: "pct_tip_rate", values: d.clusters.map(function (c, i) { return { name: "Cụm " + c.id, value: c.z.tip, color: S[i] }; }) },
            { label: "pct_flex_payment", values: d.clusters.map(function (c, i) { return { name: "Cụm " + c.id, value: c.z.flex, color: S[i] }; }) },
            { label: "pct_airport", values: d.clusters.map(function (c, i) { return { name: "Cụm " + c.id, value: c.z.airport, color: S[i] }; }) },
            { label: "weekend_ratio", values: d.clusters.map(function (c, i) { return { name: "Cụm " + c.id, value: c.z.weekend, color: S[i] }; }) }
          ],
          width: 620, groupH: 62, labelW: 128
        })]
      })
    ]));

    f.appendChild(el("div", "mb"));
    /* ---- bộ chọn phân khúc tương tác ---- */
    var TRAITS = [["pct_tip_rate", "tip"], ["pct_flex_payment", "flex"], ["pct_airport", "airport"], ["weekend_ratio", "weekend"]];
    var zMax = 2.04;
    var picker = el("div", "segment-cards");
    var profile = el("div", "");
    var sel = 2;

    function drawProfile() {
      var c = d.clusters[sel];
      var ok = !!c.target;
      profile.innerHTML = "";

      var head2 = el("div", "card-head");
      var left = el("div", "");
      left.innerHTML = '<span class="sub-badge">HỒ SƠ · CỤM 0' + c.id + "</span>";
      left.appendChild(el("h3", "card-title", esc(c.name)));
      head2.appendChild(left);
      var right = el("div", "card-head-right");
      right.innerHTML = '<span class="decision-tag ' + (ok ? "go" : "stop") + '">' + (ok ? "TARGET" : "KHÔNG CHỌN") + "</span>";
      head2.appendChild(right);

      var tc = el("div", "trait-chart");
      TRAITS.forEach(function (t) {
        var z = c.z[t[1]];
        var row = el("div", "");
        row.appendChild(el("span", "", t[0]));
        var track = el("div", "trait-track");
        var fill = el("span", "trait-fill" + (z < 0 ? " neg" : ""));
        fill.style.width = Math.max(Math.abs(z) / zMax * 100, 3) + "%";
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("b", "", (z > 0 ? "+" : "") + z.toFixed(2)));
        tc.appendChild(row);
      });

      var facts = el("div", "profile-facts");
      [["Cước TB", "$" + c.fare.toFixed(2)], ["Cự ly TB", c.dist.toFixed(2) + " mi"], ["Chuyến TB", c.rides.toFixed(2)]]
        .forEach(function (p) {
          var b = el("div", "");
          b.appendChild(el("small", "", p[0]));
          b.appendChild(el("b", "", p[1]));
          facts.appendChild(b);
        });

      var cd = card({ body: [head2, tc, facts, el("p", "card-sub", esc(c.note))] });
      profile.appendChild(cd);

      Array.prototype.forEach.call(picker.children, function (btn, i) {
        btn.classList.toggle("selected", i === sel);
      });
    }

    d.clusters.forEach(function (c, i) {
      var b = el("button", "segment-card");
      b.type = "button";
      b.innerHTML =
        '<span class="cluster-id c' + c.id + '">0' + c.id + "</span>" +
        "<span><small>" + c.share.toFixed(1) + "% QUẦN THỂ</small>" +
        "<h3>" + esc(c.short) + "</h3><p>" + esc(c.name) + "</p></span>" +
        "<b>" + nf(c.n) + "</b>";
      b.addEventListener("click", function () { sel = i; drawProfile(); });
      picker.appendChild(b);
    });

    f.appendChild(grid("grid-1-2", [picker, profile]));
    drawProfile();

    f.appendChild(sectionLead(null, "4. Chọn nhóm target",
      "Mỗi cụm được đặt tên theo trục hành vi nổi bật nhất."));
    f.appendChild(grid("grid-3", d.clusters.map(function (c, i) {
      var body = [];
      var badge = el("div", "kpi-meta");
      badge.innerHTML = '<span class="tag tag-' + (c.target ? "good" : "neutral") + '">' +
        (c.target ? "TARGET" : "Cụm " + c.id) + '</span><span class="kpi-note">' + nf(c.n) + " rider · " + c.share + "%</span>";
      body.push(badge);
      body.push(kv([
        ["Cự ly TB", c.dist.toFixed(2) + " dặm"],
        ["Cước TB", "$" + c.fare.toFixed(2)],
        ["Chuyến TB", c.rides.toFixed(2)]
      ]));
      body.push(el("p", "card-sub", esc(c.note)));
      var cd = card({ title: c.name, body: body });
      cd.style.borderColor = c.target ? "rgba(139,92,246,.45)" : "";
      return cd;
    })));
    return f;
  };

  /* -------------------------------------------------------- 04 AB TEST --- */
  PAGES.abtest = function () {
    var d = D.abtest, f = document.createDocumentFragment();
    f.appendChild(head("A/B Testing — Thiết kế và phân tích thí nghiệm"));
    f.appendChild(lead("Sau khi segmentation đã xác định được nhóm <strong>Khách cuối tuần, trả Flex, tip thấp</strong>, bước này kiểm tra xem voucher có thật sự làm nhóm đó đi nhiều hơn hay không. Nhưng bài toán không chỉ hỏi “voucher có tăng số chuyến không” — vì mỗi rider nhận voucher đều tạo chi phí, phân tích phải đi thêm một bước nữa."));
    f.appendChild(quote("Câu hỏi",
      "Nếu gửi voucher cho nhóm Khách cuối tuần, trả Flex, tip thấp, số chuyến tăng thêm có đủ để triển khai chiến dịch một cách có lãi không?"));
    f.appendChild(pageHero(d.kpi.map(function (x, i) { return i === 0 ? Object.assign({}, x, { accent: true }) : x; })));

    /* kiểm tra phân bổ ngẫu nhiên */
    f.appendChild(sectionLead(null, "1. Kiểm tra phân bổ ngẫu nhiên và ước lượng tác động",
      "Trước khi ước lượng tác động, phải kiểm tra treatment và control có được chia hợp lệ không."));
    f.appendChild(grid("grid-2", [
      card({
        title: "Kiểm tra phân bổ ngẫu nhiên",
        body: [(function () {
          var sp = el("div", "split");
          sp.innerHTML =
            "<div><i>T</i><b>3,216</b><small>Treatment</small></div>" +
            "<div><i>C</i><b>3,230</b><small>Control</small></div>";
          return sp;
        })(),
          el("div", "mb"),
          table(["Chỉ số", "Giá trị", ""],
            d.randomization.map(function (r) {
              return [r.metric + '<br><span class="kpi-note">' + esc(r.threshold) + "</span>", "<strong>" + esc(r.value) + "</strong>", chip("good", "Đạt")];
            }), { num: [1] })]
      }),
      card({
        title: "Ước lượng tác động",
        sub: "Đường vàng đứt là ngưỡng hòa vốn <strong>1.3783</strong>. Quyết định dựa trên <em>cận dưới</em> CI, không dựa trên điểm ước lượng.",
        body: [C.forest({
          rows: d.effect.map(function (e) {
            return { label: e.name, est: e.est, lo: e.lo, hi: e.hi, main: e.main, note: "SE " + e.se + " · lift " + e.lift + " · p = " + e.p };
          }),
          threshold: 1.3783, width: 620, labelW: 176
        }),
          callout("", "Đọc kết quả",
            "Rider nhận voucher tạo thêm <strong>~1.967 chuyến trong 30 ngày</strong>. Cận dưới CI <strong>1.6901</strong> vẫn trên breakeven <strong>1.3783</strong> → quy tắc quyết định cho ra <strong>Triển khai</strong>.")]
      })
    ]));

    /* ---- 4 stat lớn ---- */
    f.appendChild(el("div", "mb"));
    f.appendChild((function () {
      var g = el("div", "stat-grid");
      [["Power analysis", "0.3864", "MDE thấp hơn ngưỡng hòa vốn"],
       ["Monte Carlo", "95.8%", "coverage cao nhất qua 5 mức"],
       ["Sai lầm loại I", "4.9%", "ở effect size bằng 0"],
       ["Rider 0 chuyến", "−6.6đ%", "20.4% → 13.8%"]
      ].forEach(function (s, i) {
        var a = el("article", "stat-card");
        a.appendChild(el("span", "idx", "0" + (i + 1)));
        a.appendChild(el("small", "", esc(s[0])));
        a.appendChild(el("b", "", esc(s[1])));
        a.appendChild(el("p", "", esc(s[2])));
        g.appendChild(a);
      });
      return g;
    })());

    /* kinh tế + guardrail */
    f.appendChild(sectionLead(null, "2. Ngưỡng hòa vốn và guardrail",
      "Với chiến dịch voucher, thành công không chỉ là uplift dương mà uplift đó phải <strong>vượt ngưỡng hòa vốn</strong> — và ngưỡng ấy được suy từ kinh tế đơn vị, chứ không suy ngược từ kết quả ước lượng. Song song, guardrail trả lời một câu khác hẳn: không phải “có tác dụng không” mà “có gây tổn hại ở đâu không”."));
    f.appendChild(grid("grid-2", [
      card({
        title: "Ngưỡng hòa vốn suy từ kinh tế đơn vị",
        sub: "Tính trên <strong>tổng chi phí</strong> $6.25, và dùng cước của <strong>đúng cụm target</strong>.",
        body: [(function () {
          var p = el("pre", "pre");
          p.textContent = "breakeven = (voucher + opex) / (avg_fare × take_rate)\n" +
            "          = (5.00 + 1.25) / (22.67 × 0.20)\n" +
            "          = 1.3783 chuyến / rider";
          return p;
        })(),
          el("div", "mb"),
          kv(d.economics.map(function (r) { return [r[0], "<strong>" + esc(r[1]) + "</strong>"]; }))]
      }),
      card({
        title: "Guardrail",
        sub: "Metric chính nói có tác dụng không; guardrail nói <em>không có tổn hại</em> — nên đọc cận CI về phía xấu, không đọc p-value.",
        body: [table(["Guardrail", "Đo được", "Ngưỡng", ""],
          d.guardrails.map(function (r) { return [r.name, "<strong>" + esc(r.got) + "</strong>", r.threshold, chip("good", "Đạt")]; }))]
      })
    ]));

    /* monte carlo */
    var mc = d.monteCarlo;
    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "3. Monte Carlo validation",
      "Giữ nguyên potential outcome rồi bốc lại treatment 1.000 lần theo đúng thiết kế 50% trong từng khối, chạy ở 5 mức effect size. Phép này kiểm tra estimator có bias không, khoảng tin cậy có phủ đúng 95% không và power đạt bao nhiêu."));
    f.appendChild(grid("grid-2", [
      card({
        title: "Monte Carlo — coverage và power",
        sub: "Giữ nguyên potential outcomes, bốc lại treatment 1,000 lần. Đường vàng là mức danh nghĩa 95%.",
        body: [C.lineChart({
          categories: mc.map(function (r) { return r.effect.toFixed(2); }),
          series: [
            { name: "Coverage", values: mc.map(function (r) { return r.coverage; }), color: S[0] },
            { name: "Power", values: mc.map(function (r) { return r.power; }), color: S[1] }
          ],
          width: 460, height: 240, min: 0, max: 1, refLine: 0.95,
          valueFmt: function (v) { return v.toFixed(3); },
          tickFmt: function (t) { return t.toFixed(2); },
          catLabel: function (c) { return "Effect size " + c; }
        }),
          el("p", "card-sub", "Sai lầm loại I ở effect size 0 là <strong>0.049</strong> — đúng mức danh nghĩa. Kết quả không phải sản phẩm của một lần bốc thăm may mắn.")]
      }),
      card({
        title: "Bias theo từng mức effect size",
        body: [table(["Effect size", "Sự thật", "TB ước lượng", "Bias", "Coverage", "Power"],
          mc.map(function (r) {
            return [r.effect.toFixed(2), r.truth.toFixed(4), r.est.toFixed(4),
              (r.bias > 0 ? "+" : "") + r.bias.toFixed(4), r.coverage.toFixed(3), r.power.toFixed(3)];
          }), { num: [0, 1, 2, 3, 4, 5] })]
      })
    ]));

    /* CATE */
    f.appendChild(sectionLead(null, "4. Phân tích CATE — nếu rải voucher cho tất cả"));
    f.appendChild(card({
      title: "CATE theo cụm — nếu rải voucher cho tất cả thì sao?",
      sub: "Mỗi cụm có ngưỡng hòa vốn <em>riêng</em>, vì cước trung bình mỗi cụm khác nhau. Chấm tròn là CATE, thanh là 95% CI, vạch vàng là breakeven riêng của cụm đó.",
      body: [(function () {
        /* bảng so sánh nhanh: CATE vs ngưỡng hòa vốn riêng, vạch trắng là ngưỡng */
        var scale = 2.4;
        return table(["Cụm", "Rider", "CATE so với ngưỡng hòa vốn riêng", "Quyết định"],
          d.cate.map(function (c) {
            var ok = c.decision === "Triển khai";
            var w = Math.min(c.cate / scale * 100, 100);
            var tick = Math.min(c.breakeven / scale * 100, 98);
            return [
              '<span class="cluster-id c' + c.cluster + '" style="display:inline-grid">0' + c.cluster + "</span> <strong>" + esc(c.name) + "</strong>",
              nf(c.n),
              '<div class="compare"><div class="compare-track">' +
                '<span class="compare-fill' + (ok ? "" : " under") + '" style="width:' + w.toFixed(1) + '%"></span>' +
                '<span class="compare-tick" style="left:' + tick.toFixed(1) + '%"></span>' +
              '</div><span class="compare-note"><strong>' + c.cate.toFixed(4) + "</strong> / " + c.breakeven.toFixed(4) + "</span></div>",
              '<span class="decision-tag ' + (ok ? "go" : "stop") + '">' + (ok ? "TRIỂN KHAI" : "DỪNG") + "</span>"
            ];
          }), { num: [1] });
      })(),
        el("div", "mb"),
        (function () {
          var lg = C.legend([{ label: "CATE ước lượng", color: S[2] }]);
          lg.innerHTML += '<span class="legend-item"><span class="legend-swatch" style="background:var(--ink);width:2px;height:12px;border-radius:2px"></span>Ngưỡng hòa vốn riêng của cụm</span>';
          return lg;
        })(),
        el("div", "mb"),
        (function () {
        var wrap = el("div", "stack");
        d.cate.forEach(function (c, i) {
          var ok = c.decision === "Triển khai";
          var box = el("div", "");
          var hd = el("div", "kpi-meta");
          hd.innerHTML = "<strong>Cụm " + c.cluster + " · " + esc(c.name) + "</strong>" +
            '<span class="kpi-note">' + nf(c.n) + " rider · cước TB $" + c.fare.toFixed(2) + "</span>" +
            (ok ? chip("good", "Triển khai") : chip("critical", "Dừng"));
          box.appendChild(hd);
          box.appendChild(C.forest({
            rows: [{ label: "CATE", est: c.cate, lo: c.lo, hi: c.hi, color: ok ? S[0] : ST.critical, main: ok,
              note: "Breakeven riêng của cụm: " + c.breakeven.toFixed(4) }],
            threshold: c.breakeven, width: 600, labelW: 70
          }));
          wrap.appendChild(box);
        });
        return wrap;
      })()]
    }));

    /* estimator comparison */
    f.appendChild(sectionLead(null, "5. So sánh RCT và observational",
      "Cùng một tập rider, cùng một tập potential outcome — chỉ khác cơ chế gán treatment. Nhánh quan sát chưa hiệu chỉnh cho ra một con số hoàn toàn khác, và toàn bộ phần chênh là confounding: rider vốn đi nhiều cũng chính là người tự chọn nhận voucher."));
    f.appendChild(grid("grid-2-1", [
      card({
        title: "RCT so với các estimator trên dữ liệu quan sát",
        body: [C.forest({
          rows: d.estimators.map(function (e) {
            return { label: e.name, sub: e.prop, est: e.est, lo: e.lo, hi: e.hi, gap: e.gap, covers: e.covers, main: e.main,
              note: "Propensity: " + e.prop };
          }),
          ref: d.ateTrue, refLabel: "sự thật", width: 620, labelW: 152
        })]
      }),
      card({
        title: "Lệch so với sự thật",
        body: [C.hBar({
          rows: d.estimators.map(function (e) {
            return { label: e.name + " · " + e.prop, value: e.gap, color: e.covers ? S[0] : ST.critical, note: e.covers ? "CI phủ sự thật" : "CI KHÔNG phủ sự thật" };
          }),
          width: 340, labelW: 158, rowH: 32,
          valueFmt: function (v) { return "+" + v.toFixed(3); },
          ttRows: function (r) { return [{ k: "Lệch tuyệt đối", v: "+" + r.value.toFixed(4), color: r.color }]; }
        }),
          el("p", "card-sub", "Sau hiệu chỉnh, sai lệch lớn nhất còn <strong>0.2289</strong> — khoảng <strong>8%</strong> của sai lệch naive.")]
      })
    ]));

    /* rubric + business */
    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "6. Rubric đánh giá và tác động kinh doanh",
      "Kết quả được chấm lại theo một rubric gồm ba trục đo chất lượng ước lượng (accuracy, bias, coverage) và hai trục đo giá trị kinh doanh (decision, cost), rồi quy uplift ra tiền trên toàn bộ cụm target."));
    f.appendChild(grid("grid-2", [
      card({
        title: "Rubric đánh giá",
        sub: "Coverage là trục dễ bỏ qua nhất nhưng quan trọng nhất — bias nhỏ mà CI quá hẹp còn nguy hiểm hơn bias lớn với CI trung thực.",
        body: [table(["Tiêu chí", "Giá trị", "Ngưỡng", ""],
          d.rubric.map(function (r) {
            return [r.name, "<strong>" + esc(r.value) + "</strong>", r.threshold,
              r.pass === null ? '<span class="kpi-note">—</span>' : chip("good", "PASS")];
          }))]
      }),
      card({
        title: "Đánh giá kinh doanh trên cụm target",
        body: [kv(d.business.map(function (r) { return [r[0], "<strong>" + esc(r[1]) + "</strong>"]; })),
          el("div", "mb"),
          callout("", "Kết luận triển khai",
            "Gửi voucher cho <strong>6,446 rider</strong> thuộc Cụm 2. Không rải đại trà cho toàn bộ 20,000 rider — kịch bản đó cho ROI <strong>−1.2%</strong>.")]
      })
    ]));
    return f;
  };

  /* ---------------------------------------------------------- 05 STRESS --- */
  PAGES.stress = function () {
    var d = D.stress, f = document.createDocumentFragment();
    f.appendChild(head("Stress test — Kiểm tra độ bền kết luận"));
    f.appendChild(lead("Sau mục 03 và 04, pipeline đã đưa ra một khuyến nghị khá rõ. Tuy nhiên, một kết luận tốt trên <strong>một lần chạy</strong> chưa đủ để ra quyết định. Nếu chỉ cần đổi seed KMeans, đổi cách ước lượng ATE, bootstrap lại mẫu, hoặc thay đổi một vài giả định kinh tế mà kết luận bị lật, thì khuyến nghị đó chưa đủ chắc để trình bày như một quyết định đáng tin."));
    f.appendChild(lead("Vì vậy mục này được dùng để <em>cố tình làm lung lay pipeline</em>. Thay vì tìm thêm một kết luận mới, phân tích này hỏi ngược lại."));
    f.appendChild(quote("Câu hỏi",
      "Nếu thay đổi những lựa chọn hợp lý trong pipeline, kết luận về target segment, uplift và quyết định rollout có còn đứng vững không?"));

    /* lớp 1 */
    f.appendChild(sectionLead(null, "1. Stress segmentation và đặc tả mô hình",
      "Segmentation là nền của toàn bộ phần sau, vì A/B test chỉ chạy trên target segment — nếu target không ổn định thì mọi con số uplift phía sau đang mô tả một nhóm không nhất quán. Sau khi biết target ổn định, lớp thứ hai mới lay <strong>cách tính</strong>: nếu uplift chỉ xuất hiện dưới đúng một dạng mô hình thì kết luận sẽ yếu."));
    f.appendChild(grid("grid-2", [
      card({
        title: "Đổi seed KMeans 42 → 51",
        sub: "Target được truy lại bằng centroid, vì cluster ID của KMeans không có ý nghĩa cố định giữa các lần chạy.",
        body: [C.hBar({
          rows: d.seedStability.map(function (r) {
            return { label: r.metric, value: r.lo, color: S[0], note: "Khoảng: " + r.lo.toFixed(4) + " – " + r.hi.toFixed(4) };
          }),
          width: 500, labelW: 96, max: 1,
          valueFmt: function (v, r) { return v.toFixed(4); },
          ttRows: function (r) { return [{ k: "Giá trị thấp nhất qua 10 seed", v: r.value.toFixed(4), color: r.color }]; }
        }),
          el("p", "card-sub", "Cột hiển thị giá trị <strong>thấp nhất</strong> qua 10 seed — kể cả lần xấu nhất vẫn giữ ~98.5% rider gốc. Target size dao động " + esc(d.seedTargetSize) + "."),
          el("div", "mb"),
          kv(d.bootstrap.map(function (r) { return [r[0], "<strong>" + esc(r[1]) + "</strong>"]; }))]
      }),
      card({
        title: "Đổi đặc tả mô hình",
        sub: "Nếu uplift chỉ xuất hiện dưới đúng một dạng mô hình thì kết luận sẽ yếu. Vạch vàng là breakeven 1.3783.",
        body: [C.forest({
          rows: d.specs.map(function (s) { return { label: s.name, est: s.ate, lo: s.lo, hi: s.hi, main: s.main, note: "SE " + s.se }; }),
          threshold: 1.3783, width: 560, labelW: 180
        }),
          el("p", "card-sub", "Biên độ giữa ba estimator: <strong>" + esc(d.specSpread) + "</strong>. Cả ba cùng kết luận."),
          el("div", "mb"),
          kv(d.leaveOneBlock.map(function (r) { return [r[0], "<strong>" + esc(r[1]) + "</strong>"]; }))]
      })
    ]));

    /* lớp 2 - hoán vị & bootstrap */
    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "2. Kiểm định hoán vị và bootstrap"));
    f.appendChild(card({
        title: "Kiểm định hoán vị và bootstrap",
        sub: "Hai phép trả lời hai câu hỏi khác nhau: hoán vị kiểm <em>giả thuyết null</em>, bootstrap kiểm <em>độ rộng khoảng tin cậy</em>.",
        body: [grid("grid-2", [
          card({ cls: "", title: "Fisher randomization test", body: [kv(d.fisher.map(function (r) { return [r[0], "<strong>" + esc(r[1]) + "</strong>"]; }))] }),
          card({ cls: "", title: "Bootstrap phân tầng", body: [kv(d.bootstrapCI.map(function (r) { return [r[0], "<strong>" + esc(r[1]) + "</strong>"]; }))] })
        ])]
      }));

    /* lớp 3 */
    var g = d.grid;
    var colorMap = decisionColors();
    var curRow = g.vouchers.indexOf(g.current.voucher), curCol = g.takeRates.indexOf(g.current.takeRate);

    f.appendChild(sectionLead(null, "3. Stress khuyến nghị kinh tế",
      "Hai lớp trên lay <em>cách đo</em>. Lớp này lay <em>giả định kinh doanh</em>: mệnh giá voucher, take rate, cước trung bình. Đây cũng là lớp duy nhất trong toàn bộ stress test <strong>không đạt ngưỡng</strong> — và kết quả đó được giữ nguyên trong báo cáo thay vì bị loại bỏ."));
    f.appendChild(grid("grid-2", [
      card({
        title: "Lưới quyết định kinh tế",
        sub: "Hàng = mệnh giá voucher, cột = take rate. Ô viền sáng là giả định đang dùng. <strong>Chữ trong ô mang nghĩa</strong> — màu chỉ là hỗ trợ.",
        body: [C.decisionGrid({
          cols: g.takeRates, rows: g.vouchers, cells: g.cells,
          colorMap: colorMap, current: { row: curRow, col: curCol }, cellW: 110
        })]
      }),
      card({
        title: "Điểm lật của từng giả định",
        sub: "Kết luận lật đúng lúc breakeven chạm cận dưới CI = 1.6902. Mỗi dòng lay một trục và giữ nguyên ba trục còn lại.",
        body: [C.hBar({
          rows: d.tipping.map(function (t) {
            return { label: t.name, value: Math.abs(t.margin), color: Math.abs(t.margin) >= 22 ? S[0] : S[1],
              note: "Đang dùng " + t.current + " → lật tại " + t.flip };
          }),
          width: 480, labelW: 168, max: 30,
          valueFmt: function (v) { return v.toFixed(1) + "%"; },
          ttRows: function (r) { return [{ k: "Biên an toàn", v: r.value.toFixed(1) + "%", color: r.color }]; }
        }),
          table(["Giả định", "Đang dùng", "Điểm lật", "Biên an toàn"],
            d.tipping.map(function (t) {
              return [t.name, t.current, "<strong>" + esc(t.flip) + "</strong>",
                (t.margin > 0 ? "+" : "") + t.margin + "%"];
            }), { num: [1, 2, 3] })]
      })
    ]));

    return f;
  };

  /* ---------------------------------------------------------- CAUSAL ---- */
  PAGES.causal = function () {
    var d = D.causal, f = document.createDocumentFragment();
    f.appendChild(head("Tư duy nhân quả",
      "Phần khái niệm dùng xuyên suốt các mục 02, 04 và 05."));

    f.appendChild(callout("", "Câu hỏi nhân quả", esc(d.question)));
    f.appendChild(el("div", "mb"));

    f.appendChild(grid("grid-3", d.concepts.map(function (c, i) {
      var body = [el("p", "card-sub", esc(c.q)), el("div", "mb"), el("p", "", esc(c.ex))];
      var cd = card({ title: c.name, body: body });
      cd.style.borderTop = "2px solid " + S[i];
      return cd;
    })));

    f.appendChild(el("div", "mb"));
    var dag = el("pre", "pre");
    dag.textContent =
      "Mức độ hoạt động trước đây ──┐\n" +
      "                             ├──> T (gửi promo) ──[tác động cần đo]──> Y (số chuyến)\n" +
      "Khu vực đô thị ──────────────┤          ^                                  ^\n" +
      "                             │          │                                  │\n" +
      "Mức độ nhạy giá ─────────────┘          └──────────────────────────────────┘\n" +
      "                                         (cả 3 confounder cũng đi thẳng vào Y)";

    f.appendChild(grid("grid-2", [
      card({
        title: "Sơ đồ DAG",
        sub: "Randomization cắt đứt toàn bộ mũi tên đi vào T — khi treatment được bốc thăm, nó độc lập với mọi confounder, kể cả confounder chưa quan sát được.",
        body: [dag]
      }),
      card({
        title: "Ba biến gây nhiễu",
        body: [table(["Confounder", "Ảnh hưởng đến việc nhận promo", "Ảnh hưởng đến số chuyến"],
          d.confounders.map(function (c) { return ["<strong>" + esc(c.name) + "</strong>", c.toT, c.toY]; }))]
      })
    ]));

    f.appendChild(el("div", "mb"));
    var eq = el("pre", "pre");
    eq.textContent =
      "Chênh lệch = E[Y | T=1] − E[Y | T=0]\n" +
      "           = Tác động nhân quả thật  +  Thiên lệch chọn lọc";
    f.appendChild(card({
      title: "Vì sao so sánh trực tiếp bị bias",
      sub: "Hai nhóm vốn đã khác nhau ngay từ đầu, trước cả khi có promo.",
      body: [eq,
        el("div", "mb"),
        C.hBar({
          rows: [
            { label: "Naive (quan sát)", value: d.biasDemo.naive, color: ST.critical, note: "không phủ sự thật" },
            { label: "Sự thật (ate_true)", value: d.biasDemo.truth, color: SEQ[4], note: "mốc đối chiếu" },
            { label: "Sau hiệu chỉnh AIPW", value: 2.0171, color: S[0], note: "lệch +0.1803" }
          ],
          width: 560, labelW: 158, max: 5,
          valueFmt: function (v) { return v.toFixed(4); },
          ttRows: function (r) { return [{ k: "Ước lượng", v: r.value.toFixed(4), color: r.color }]; }
        }),
        callout("", "Con số minh họa từ mục 04",
          "Naive <strong>4.8665</strong> so với sự thật <strong>1.8368</strong> → thiên lệch <strong>+3.0297</strong>, tức phép so sánh trực tiếp phóng đại gần <strong>2.6 lần</strong>.")]
    }));
    return f;
  };

  /* --------------------------------------------------------- RUNBOOK ---- */
  PAGES.runbook = function () {
    var d = D.runbook, f = document.createDocumentFragment();
    f.appendChild(head("Cách chạy & giới hạn",
      "Các notebook phụ thuộc lẫn nhau nên phải chạy đúng thứ tự. Đổi SEED sẽ làm thay đổi mọi con số trên trang này."));

    f.appendChild(grid("grid-2", [
      card({
        title: "Thứ tự chạy",
        sub: "Mỗi bước phải xuất đủ đầu ra trước khi sang bước sau.",
        body: [table(["#", "File", "Đầu ra cần có"],
          d.order.map(function (r) { return ["<strong>" + r[0] + "</strong>", code(r[1]), r[2]]; }))]
      }),
      card({
        title: "Chuẩn bị môi trường",
        body: [(function () {
          var p = el("pre", "pre");
          p.textContent = 'cd "Growth & Experimentation Project for Ride-Hailing Promotions"\n& ".\\.venv\\Scripts\\Activate.ps1"';
          return p;
        })(),
          el("div", "mb"),
          el("p", "card-sub", "Chưa có <code>.venv</code> thì tạo bằng <code>uv</code> dựa trên <code>pyproject.toml</code> và <code>uv.lock</code> có sẵn."),
          el("div", "mb"),
          (function () {
            var p = el("pre", "pre");
            p.textContent =
              "N_RIDERS      = 20_000   # 50_000 để có dataset lớn hơn\n" +
              "SEED          = 42       # đổi để kiểm tra độ ổn định\n" +
              "ALPHA         = 0.1      # 0.5 để hành vi rider đa dạng hơn\n" +
              "BASELINE_MEAN = 8        # 4 để mô phỏng rider đi ít hơn\n" +
              "CV_LAMBDA     = 0.60\n" +
              "ZERO_TARGET   = 0.20\n" +
              "WAKE_RATE     = 0.25";
            return p;
          })()]
      })
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(card({
      title: "Giới hạn của nghiên cứu",
      sub: "Nêu ở đây thay vì giấu trong phụ lục.",
      body: [table(["Hạn chế", "Ảnh hưởng"], d.limits.map(function (r) { return ["<strong>" + esc(r[0]) + "</strong>", r[1]]; }))]
    }));

    f.appendChild(el("div", "mb"));
    f.appendChild(callout("warn", "⚠ Ranh giới phải giữ",
      "Khuyến nghị về <strong>phương pháp</strong> (dùng estimator nào khi không có RCT, kiểm tra gì trước khi đọc kết quả) có cơ sở vững, vì dataset được dựng chính xác để trả lời câu hỏi đó. Khuyến nghị về <strong>kinh doanh</strong> (có nên gửi voucher không, cho ai) chỉ minh họa quy trình ra quyết định, không phải kết luận về thị trường taxi New York thật."));
    return f;
  };

  /* ==================================================================== */
  /* SCENARIO LAB — phần tương tác, tính lại quyết định theo giả định      */
  /* ==================================================================== */
  /* giữ ngoài PAGES.economics để vẽ lại (ví dụ khi đổi theme) không ném mất kịch bản đang xem */
  var labState = { voucher: 5, take: 20 };

  var LAB = {
    uplift: 1.9670,      // ATE block FE + HC1, mục 04
    ciLo:   1.6901,      // cận dưới KTC 95%
    riders: 6446,        // quy mô cụm target
    avgFare: 22.6722,    // cước TB cụm 2
    opex: 1.25           // chi phí vận hành / rider
  };

  function labCompute(voucher, takeRate) {
    var margin = LAB.avgFare * (takeRate / 100);
    var be = (voucher + LAB.opex) / margin;
    var cost = (voucher + LAB.opex) * LAB.riders;
    var revenue = LAB.uplift * margin * LAB.riders;
    var profit = revenue - cost;
    var decision = LAB.ciLo > be ? "Triển khai" : (LAB.uplift > be ? "Cân nhắc" : "Dừng");
    return { be: be, cost: cost, revenue: revenue, profit: profit, roi: profit / cost * 100, decision: decision, margin: margin };
  }

  PAGES.economics = function () {
    var f = document.createDocumentFragment();
    f.appendChild(head("Scenario lab — kinh tế đơn vị"));
    f.appendChild(lead("Toàn bộ kết luận “nên triển khai” ở mục 04 dựa trên hai giả định kinh doanh: <strong>mệnh giá voucher $5</strong> và <strong>take rate 20%</strong>."));
    
    /* ---- điều khiển ---- */
    var voucher = labState.voucher, take = labState.take;

    var beVal   = el("b", "", ""), roiVal = el("b", "", "");
    var vLabel  = el("b", "", ""), tLabel = el("b", "", "");
    var resCard = el("article", "result-card viable");
    var statusEl = el("span", "result-status", "");
    var roiWrap = el("div", "");
    var explain = el("p", "", "");
    var kpiHost = el("div", "grid grid-3");
    var forestHost = el("div", "");

    function paint() {
      var r = labCompute(voucher, take);
      var ok = r.decision === "Triển khai";
      vLabel.textContent = "$" + voucher;
      tLabel.textContent = take + "%";

      resCard.className = "result-card " + (ok ? "viable" : "notviable");
      statusEl.textContent = r.decision.toUpperCase();
      roiVal.textContent = (r.roi >= 0 ? "" : "−") + Math.abs(r.roi).toFixed(1) + "%";
      explain.innerHTML = "Uplift <strong>" + LAB.uplift.toFixed(4) + "</strong> (cận dưới KTC <strong>" +
        LAB.ciLo.toFixed(4) + "</strong>) so với ngưỡng hòa vốn <strong>" + r.be.toFixed(4) + "</strong> chuyến / rider.";

      kpiHost.innerHTML = "";
      [
        { label: "Ngưỡng hòa vốn", value: r.be.toFixed(4), note: "chuyến / rider" },
        { label: "Doanh thu biên", value: "$" + nf(Math.round(r.revenue)), note: "uplift × margin × rider" },
        { label: "Tổng chi phí", value: "$" + nf(Math.round(r.cost)), note: "voucher + opex" },
        { label: "Lợi nhuận ròng", value: (r.profit < 0 ? "−$" : "$") + nf(Math.abs(Math.round(r.profit))),
          note: r.profit >= 0 ? "kịch bản có lãi" : "kịch bản lỗ",
          tag: { text: (r.roi >= 0 ? "+" : "−") + Math.abs(r.roi).toFixed(1) + "% ROI", kind: r.profit >= 0 ? "good" : "critical" } }
      ].forEach(function (it, i) {
        var k = el("div", "kpi");
        k.appendChild(el("p", "kpi-label", esc(it.label)));
        k.appendChild(el("p", "kpi-value", it.value));
        var m = el("div", "kpi-meta");
        if (it.tag) m.innerHTML = '<span class="tag tag-' + it.tag.kind + '">' + esc(it.tag.text) + "</span>";
        m.appendChild(el("span", "kpi-note", esc(it.note)));
        k.appendChild(m);
        kpiHost.appendChild(k);
      });

      forestHost.innerHTML = "";
      forestHost.appendChild(C.forest({
        rows: [{ label: "Uplift cụm target", est: LAB.uplift, lo: LAB.ciLo, hi: 2.2439,
          color: ok ? S[0] : ST.critical, main: ok,
          note: "Ngưỡng hòa vốn ở kịch bản này: " + r.be.toFixed(4) }],
        threshold: r.be, width: 620, labelW: 150
      }));
    }

    var controls = el("div", "controls");
    [["voucher", "Mệnh giá voucher", 3, 12, 1, vLabel, function (v) { voucher = labState.voucher = v; }, "$3", "$12"],
     ["take", "Take rate nền tảng", 15, 25, 1, tLabel, function (v) { take = labState.take = v; }, "15%", "25%"]
    ].forEach(function (c) {
      var box = el("div", "control");
      var hd = el("div", "control-head");
      var lb = el("label", "", esc(c[1])); lb.setAttribute("for", c[0]);
      hd.appendChild(lb); hd.appendChild(c[5]);
      box.appendChild(hd);
      var inp = el("input", "");
      inp.type = "range"; inp.id = c[0]; inp.min = c[2]; inp.max = c[3]; inp.step = c[4];
      inp.value = c[0] === "voucher" ? voucher : take;
      inp.addEventListener("input", function () { c[6](+inp.value); paint(); });
      box.appendChild(inp);
      var rl = el("div", "range-labels");
      rl.appendChild(el("span", "", c[7])); rl.appendChild(el("span", "", c[8]));
      box.appendChild(rl);
      controls.appendChild(box);
    });
    var fixed = el("div", "fixed-assumptions");
    fixed.innerHTML =
      "<span>Opex / rider <b>$1.25</b></span>" +
      "<span>Cước TB cụm 2 <b>$22.67</b></span>" +
      "<span>Quy mô rollout <b>6,446</b></span>";
    controls.appendChild(fixed);

    resCard.appendChild(el("span", "rc-label", "Quyết định trực tiếp"));
    resCard.appendChild(statusEl);
    roiWrap.appendChild(el("small", "rc-label", "ROI dự phóng"));
    roiWrap.appendChild(roiVal);
    roiVal.className = "rc-value";
    resCard.appendChild(roiWrap);
    resCard.appendChild(explain);

    f.appendChild(grid("lab", [
      card({ title: "Giả định", sub: "Uplift 1.9670 chuyến/rider giữ nguyên.", body: [controls] }),
      resCard
    ]));

    f.appendChild(el("div", "mb"));
    f.appendChild(kpiHost);

    f.appendChild(sectionLead(null, "Uplift so với ngưỡng hòa vốn ở kịch bản đang chọn",
      "Vạch vàng dịch chuyển theo giả định. Quyết định lật đúng lúc vạch đó vượt qua <strong>cận dưới</strong> khoảng tin cậy, chứ không phải khi vượt điểm ước lượng."));
    f.appendChild(card({ body: [forestHost] }));

    f.appendChild(sectionLead(null, "Đối chiếu với lưới quyết định ở mục 05",
      "Lưới dưới đây là kết quả stress test tính sẵn. Kéo hai thanh trượt ở trên sẽ cho ra đúng ô tương ứng trong lưới này."));
    var g = D.stress.grid;
    var colorMap = decisionColors();
    f.appendChild(card({
      body: [C.decisionGrid({
        cols: g.takeRates, rows: g.vouchers, cells: g.cells, colorMap: colorMap,
        current: { row: g.vouchers.indexOf(g.current.voucher), col: g.takeRates.indexOf(g.current.takeRate) },
        cellW: 110
      })]
    }));

    paint();
    return f;
  };

  /* ====================================================================== */
  /* ROUTER                                                                 */
  /* ====================================================================== */
  var TITLES = {
    overview: "Tổng quan", eda: "01 · EDA", synthetic: "02 · Synthetic data",
    segmentation: "03 · Segmentation", abtest: "04 · A/B Testing",
    stress: "05 · Stress test", economics: "Scenario lab",
    causal: "Tư duy nhân quả", runbook: "Cách chạy"
  };

  var content = document.getElementById("content");
  var pageTitleEl = document.getElementById("pageTitle");

  function render(key, sub) {
    if (!PAGES[key]) key = "overview";

    /* bọc trong .animate-in để mỗi lần đổi trang có fade + stagger */
    _pageTitle = "";
    var wrap = el("div", "animate-in");
    wrap.appendChild(PAGES[key](sub));
    content.innerHTML = "";
    content.appendChild(wrap);
    content.focus({ preventScroll: true });

    var label = TITLES[key] + (key === "eda" && EDA_TITLES[sub] ? " · " + EDA_TITLES[sub] : "");
    pageTitleEl.textContent = _pageTitle || label;
    document.title = label + " — Ride-Hailing Promotions";

    Array.prototype.forEach.call(document.querySelectorAll(".nav-item, .mobile-nav a"), function (a) {
      a.classList.toggle("active", a.dataset.section === key);
    });
    /* Nhóm nav tự mở khi đang ở mục đó, nhưng người dùng gập lại được —
       data-user ghi lựa chọn thủ công và được ưu tiên hơn mặc định. */
    Array.prototype.forEach.call(document.querySelectorAll(".nav-group"), function (g) {
      var isCurrent = g.dataset.group === key;
      if (isCurrent && sub) g.dataset.user = "open";     /* vào thẳng một mục con thì phải mở */
      var open = g.dataset.user ? g.dataset.user === "open" : isCurrent;
      g.classList.toggle("open", open);
      var chev = g.querySelector(".nav-chev");
      if (chev) chev.setAttribute("aria-expanded", String(open));
    });
    Array.prototype.forEach.call(document.querySelectorAll(".nav-subitem"), function (a) {
      /* mặc định phải trùng với PAGES.eda: không có mục con thì mở "dict";
         "season" đã gộp vào "time" nên highlight theo "time". */
      var cur = sub === "season" ? "time" : (sub || "dict");
      a.classList.toggle("active", a.dataset.anchor === cur);
    });

    window.scrollTo(0, 0);
    document.body.classList.remove("nav-open");
  }

  /* hash dạng "#eda" hoặc "#eda:time" */
  function current() {
    var h = (location.hash || "#overview").slice(1).split(":");
    return { key: h[0], sub: h[1] || null };
  }
  function route() { var c = current(); render(c.key, c.sub); }
  window.addEventListener("hashchange", route);

  /* mũi tên ở nhóm nav: gập / mở, không điều hướng */
  Array.prototype.forEach.call(document.querySelectorAll(".nav-parent .nav-chev"), function (chev) {
    function toggle(e) {
      e.preventDefault(); e.stopPropagation();
      var g = chev.parentNode.parentNode;                 /* .nav-item -> .nav-group */
      var open = !g.classList.contains("open");
      g.classList.toggle("open", open);
      g.dataset.user = open ? "open" : "closed";
      chev.setAttribute("aria-expanded", String(open));
    }
    chev.addEventListener("click", toggle);
    chev.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") toggle(e);
    });
  });

  /* ------------------------------------------------------------ theme ----
     Biểu đồ là SVG vẽ sẵn với màu ghi thẳng vào thuộc tính, CSS không với tới
     được. Nên đổi theme = đọc lại bảng màu rồi vẽ lại trang hiện tại.
     Lựa chọn lưu trong localStorage; chưa chọn thì theo cài đặt hệ điều hành
     (đoạn script trong <head> gắn data-theme trước khi trang vẽ, tránh nháy). */
  var THEME_KEY = "rg-theme";
  var themeBtn = document.getElementById("themeBtn");

  function applyTheme(t, redraw) {
    document.documentElement.setAttribute("data-theme", t);
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", String(t === "light"));
      themeBtn.title = t === "light" ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng";
    }
    C.refreshPalette();
    if (redraw) route();
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next, true);
    });
  }
  applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark", false);

  document.getElementById("menuBtn").addEventListener("click", function () { document.body.classList.add("nav-open"); });
  document.getElementById("sidebarClose").addEventListener("click", function () { document.body.classList.remove("nav-open"); });
  document.getElementById("scrim").addEventListener("click", function () { document.body.classList.remove("nav-open"); });

  route();
})();
