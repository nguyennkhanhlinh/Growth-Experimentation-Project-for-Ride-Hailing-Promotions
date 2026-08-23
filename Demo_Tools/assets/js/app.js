/* ==========================================================================
   APP - Demo_Tools only: campaign calculator + scenario lab.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.DATA;
  var C = window.Charts;
  var S = C.SERIES;
  var ST = C.STATUS;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var ICON = {
    good: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.8"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 4l9 16H3z" stroke-linejoin="round"/><path d="M12 10v4M12 17.2v.2" stroke-linecap="round"/></svg>',
    bad:  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>'
  };

  function chip(kind, label) {
    var map = { good: ["chip-good", ICON.good], warning: ["chip-warning", ICON.warn], critical: ["chip-critical", ICON.bad] };
    var m = map[kind] || map.good;
    return '<span class="chip ' + m[0] + '">' + m[1] + esc(label) + "</span>";
  }

  function resultKind(decision) {
    return decision === "Triển khai" ? "good" : (decision === "Cân nhắc" ? "warning" : "critical");
  }

  function card(opts) {
    var c = el("div", "card " + (opts.cls || ""));
    if (opts.title) {
      var head = el("div", "card-head");
      var left = el("div", "");
      left.appendChild(el("h3", "card-title", esc(opts.title)));
      if (opts.sub) left.appendChild(el("p", "card-sub", opts.sub));
      head.appendChild(left);
      c.appendChild(head);
    }
    (opts.body || []).forEach(function (b) {
      if (b) c.appendChild(typeof b === "string" ? el("div", "", b) : b);
    });
    return c;
  }

  function table(headers, rows, opts) {
    opts = opts || {};
    var wrap = el("div", "table-wrap");
    var t = el("table");
    var thead = el("thead");
    var tr = el("tr");
    headers.forEach(function (h, i) {
      tr.appendChild(el("th", (opts.num || []).indexOf(i) >= 0 ? "num" : "", esc(h)));
    });
    thead.appendChild(tr);
    t.appendChild(thead);

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
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
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

  function lead(html) {
    return el("p", "lead", html);
  }

  function grid(cls, kids) {
    var g = el("div", "grid " + cls);
    kids.forEach(function (k) {
      if (k) g.appendChild(k);
    });
    return g;
  }

  function decisionColors() {
    return {
      "Triển khai": { fill: C.cssVar("--dec-go-fill"), stroke: C.cssVar("--dec-go-stroke"), text: C.cssVar("--dec-go-text") },
      "Cân nhắc":   { fill: C.cssVar("--dec-hold-fill"), stroke: C.cssVar("--dec-hold-stroke"), text: C.cssVar("--dec-hold-text") },
      "Dừng":       { fill: C.cssVar("--dec-stop-fill"), stroke: C.cssVar("--dec-stop-stroke"), text: C.cssVar("--dec-stop-text") }
    };
  }

  function nf(v, d) {
    return Number(v).toLocaleString("en-US", {
      minimumFractionDigits: d || 0,
      maximumFractionDigits: d || 0
    });
  }

  function usd(v, d) {
    return (v < 0 ? "-$" : "$") + nf(Math.abs(v), d || 0);
  }

  function labelUsd(v) {
    return usd(v, v % 1 ? 2 : 0);
  }

  function kpi(label, value, note, tag) {
    var k = el("div", "kpi kpi-plain");
    k.appendChild(el("p", "kpi-label", esc(label)));
    k.appendChild(el("p", "kpi-value", value));
    var m = el("div", "kpi-meta");
    if (tag) m.innerHTML = '<span class="tag tag-' + tag.kind + '">' + esc(tag.text) + "</span>";
    if (note) m.appendChild(el("span", "kpi-note", esc(note)));
    k.appendChild(m);
    return k;
  }

  function campaignCompute(seg, p) {
    var margin = seg.fare * p.take / 100;
    var costPer = p.voucher * p.redeem / 100 + p.opex;
    var breakeven = costPer / margin;
    var uplift = seg.cate * p.carry / 100;
    var upliftLo = seg.lo * p.carry / 100;
    var nSent = Math.round(seg.n * p.reach / 100);
    var rides = uplift * nSent;
    var revenue = rides * margin;
    var cost = costPer * nSent;
    var profit = revenue - cost;

    return {
      margin: margin,
      costPer: costPer,
      breakeven: breakeven,
      uplift: uplift,
      upliftLo: upliftLo,
      nSent: nSent,
      rides: rides,
      revenue: revenue,
      cost: cost,
      profit: profit,
      roi: cost > 0 ? profit / cost * 100 : 0,
      perRide: rides > 0 ? cost / rides : null,
      decision: upliftLo > breakeven ? "Triển khai" : (uplift > breakeven ? "Cân nhắc" : "Dừng")
    };
  }

  function control(key, label, value, min, max, step, left, right, labels, setValue, paint) {
    var box = el("div", "control");
    var hd = el("div", "control-head");
    var lb = el("label", "", esc(label));
    lb.setAttribute("for", "ctl-" + key);
    labels[key] = el("b", "", "");
    hd.appendChild(lb);
    hd.appendChild(labels[key]);
    box.appendChild(hd);

    var inp = el("input", "");
    inp.type = "range";
    inp.id = "ctl-" + key;
    inp.min = min;
    inp.max = max;
    inp.step = step;
    inp.value = value;
    inp.addEventListener("input", function () {
      setValue(+inp.value);
      paint();
    });
    box.appendChild(inp);

    var rl = el("div", "range-labels");
    rl.appendChild(el("span", "", left));
    rl.appendChild(el("span", "", right));
    box.appendChild(rl);
    return box;
  }

  var PAGES = {};
  var pageTitle = "";
  var campaignState = Object.assign({}, D.abtest.defaults);
  var econState = { voucher: 5, take: 20 };

  PAGES.overview = function () {
    var o = D.overview;
    var f = document.createDocumentFragment();

    f.appendChild(lead("Dữ liệu gốc là <strong>NYC Yellow Taxi Trip Data</strong> quý I/2026; sau làm sạch còn <strong>10.444.717 chuyến</strong> trên 20 cột ở cấp chuyến đi. Vì dữ liệu TLC không có <code>user_id</code> thật, dự án không thể phân tích khuyến mãi trực tiếp ở cấp khách hàng — nên phải dựng thêm một tầng dữ liệu rider-level mô phỏng từ chính các chuyến có thật."));

    var flow = el("div", "flow");
    o.pipeline.forEach(function (s) {
      var st = el("div", "flow-step");
      st.appendChild(el("p", "flow-num", s[0]));
      st.appendChild(el("p", "flow-title", s[1]));
      st.appendChild(el("p", "flow-text", s[2]));
      flow.appendChild(st);
    });
    f.appendChild(sectionLead(null, "Pipeline chạy tuần tự"));
    f.appendChild(card({ title: "Pipeline", body: [flow] }));

    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "Kết quả chính"));
    f.appendChild(grid("grid-kpi", o.result.map(function (it) {
      var k = kpi(it.label, it.value, it.note, it.tag);
      if (it.accent) k.classList.add("accent");
      return k;
    })));

    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "Quy mô và độ tin cậy"));
    f.appendChild(grid("grid-kpi", o.scale.map(function (it) {
      return kpi(it.label, it.value, it.note, it.tag);
    })));

    f.appendChild(el("div", "mb"));
    f.appendChild(lead("<strong>Kết luận tổng quát:</strong> voucher có tác động tích cực, nhưng chỉ nên triển khai <strong>có chọn lọc</strong> cho nhóm target, không nên rải đại trà cho toàn bộ rider."));

    return f;
  };

  PAGES.campaign = function () {
    var CATE = D.abtest.cate;
    var f = document.createDocumentFragment();
    var picker = el("div", "segment-cards");
    var controls = el("div", "controls");
    var resCard = el("article", "result-card viable");
    var statusEl = el("span", "result-status", "");
    var roiVal = el("b", "rc-value", "");
    var explain = el("p", "", "");
    var kpiHost = el("div", "grid grid-3");
    var forestHost = el("div", "");
    var compareHost = el("div", "");
    var labels = {};

    pageTitle = "Máy tính chiến dịch";
    f.appendChild(lead("Chọn nhóm khách hàng và chỉnh tham số kinh doanh. Tool tính lại ngưỡng hòa vốn, ROI, lợi nhuận và quyết định triển khai từ CATE của từng cụm."));

    function paint() {
      var seg = CATE[campaignState.segment];
      var r = campaignCompute(seg, campaignState);
      var ok = r.decision === "Triển khai";

      labels.voucher.textContent = labelUsd(campaignState.voucher);
      labels.take.textContent = campaignState.take + "%";
      labels.opex.textContent = usd(campaignState.opex, 2);
      labels.redeem.textContent = campaignState.redeem + "%";
      labels.reach.textContent = campaignState.reach + "%";
      labels.carry.textContent = campaignState.carry + "%";

      resCard.className = "result-card " + (ok ? "viable" : "notviable");
      statusEl.textContent = r.decision.toUpperCase();
      roiVal.textContent = (r.roi >= 0 ? "" : "-") + Math.abs(r.roi).toFixed(1) + "%";
      explain.innerHTML =
        "Cụm <strong>" + esc(seg.name) + "</strong>: uplift <strong>" + r.uplift.toFixed(4) +
        "</strong>, cận dưới <strong>" + r.upliftLo.toFixed(4) +
        "</strong>, ngưỡng hòa vốn <strong>" + r.breakeven.toFixed(4) +
        "</strong> chuyến/rider. Gửi cho <strong>" + nf(r.nSent) + "</strong> rider.";

      kpiHost.innerHTML = "";
      [
        ["Ngưỡng hòa vốn", r.breakeven.toFixed(4), "chuyến/rider"],
        ["Chuyến tăng thêm", nf(Math.round(r.rides)), "uplift x rider gửi"],
        ["Tổng chi phí", usd(r.cost), usd(r.costPer, 2) + " mỗi rider"],
        ["Doanh thu biên", usd(r.revenue), "biên " + usd(r.margin, 2) + " mỗi chuyến"],
        ["Lợi nhuận ròng", usd(r.profit), r.profit >= 0 ? "kịch bản có lãi" : "kịch bản lỗ",
          { text: (r.roi >= 0 ? "+" : "-") + Math.abs(r.roi).toFixed(1) + "% ROI", kind: resultKind(r.decision) }],
        ["Chi phí/chuyến tăng thêm", r.perRide === null ? "-" : usd(r.perRide, 2),
          r.perRide === null ? "không có chuyến tăng thêm" : "so với biên " + usd(r.margin, 2)]
      ].forEach(function (x) {
        kpiHost.appendChild(kpi(x[0], x[1], x[2], x[3]));
      });

      forestHost.innerHTML = "";
      forestHost.appendChild(C.forest({
        rows: CATE.map(function (c, i) {
          var x = campaignCompute(c, campaignState);
          return {
            label: "Cụm " + c.cluster + " · " + c.name,
            est: x.uplift,
            lo: x.upliftLo,
            hi: c.hi * campaignState.carry / 100,
            color: i === campaignState.segment ? (x.decision === "Triển khai" ? S[0] : ST.critical) : S[2],
            main: i === campaignState.segment,
            note: x.decision
          };
        }),
        threshold: r.breakeven,
        width: 620,
        labelW: 190
      }));

      compareHost.innerHTML = "";
      compareHost.appendChild(table(
        ["Cụm", "Rider gửi", "Uplift", "Hòa vốn", "Lợi nhuận", "ROI", "Quyết định"],
        CATE.map(function (c, i) {
          var x = campaignCompute(c, campaignState);
          var name = "Cụm " + c.cluster + " · " + esc(c.name);
          return [
            i === campaignState.segment ? "<strong>" + name + "</strong>" : name,
            nf(x.nSent),
            x.uplift.toFixed(4),
            x.breakeven.toFixed(4),
            usd(x.profit),
            (x.roi >= 0 ? "+" : "-") + Math.abs(x.roi).toFixed(1) + "%",
            chip(resultKind(x.decision), x.decision)
          ];
        }),
        { num: [1, 2, 3, 4, 5] }
      ));

      Array.prototype.forEach.call(picker.children, function (btn, i) {
        btn.classList.toggle("selected", i === campaignState.segment);
      });
    }

    CATE.forEach(function (c, i) {
      var b = el("button", "segment-card");
      b.type = "button";
      b.innerHTML =
        '<span class="cluster-id c' + c.cluster + '">0' + c.cluster + "</span>" +
        "<span><h3>" + esc(c.name) + "</h3><p>" + nf(c.n) + " rider</p></span>" +
        "<b>" + esc(c.decision) + "</b>";
      b.addEventListener("click", function () {
        campaignState.segment = i;
        paint();
      });
      picker.appendChild(b);
    });

    [
      ["voucher", "Mệnh giá voucher", 2, 15, 0.5, "$2", "$15"],
      ["take", "Take rate nền tảng", 10, 30, 1, "10%", "30%"],
      ["opex", "Chi phí vận hành/rider", 0, 3, 0.05, "$0", "$3"],
      ["redeem", "Tỷ lệ dùng voucher", 40, 100, 5, "40%", "100%"],
      ["reach", "Quy mô gửi trong cụm", 10, 100, 5, "10%", "100%"],
      ["carry", "Hiệu lực thực tế", 50, 100, 5, "50%", "100%"]
    ].forEach(function (c) {
      controls.appendChild(control(c[0], c[1], campaignState[c[0]], c[2], c[3], c[4], c[5], c[6], labels, function (v) {
        campaignState[c[0]] = v;
      }, paint));
    });

    resCard.appendChild(el("span", "rc-label", "Khuyến nghị"));
    resCard.appendChild(statusEl);
    var roiWrap = el("div", "");
    roiWrap.appendChild(el("small", "rc-label", "ROI dự phóng"));
    roiWrap.appendChild(roiVal);
    resCard.appendChild(roiWrap);
    resCard.appendChild(explain);

    f.appendChild(sectionLead(null, "1. Chọn nhóm khách hàng"));
    f.appendChild(picker);
    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "2. Đặt tham số kinh doanh"));
    f.appendChild(grid("lab", [
      card({ body: [controls] }),
      resCard
    ]));
    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "3. Kết quả chiến dịch"));
    f.appendChild(kpiHost);
    f.appendChild(sectionLead(null, "4. Ba cụm dưới cùng bộ tham số"));
    f.appendChild(card({ body: [forestHost] }));
    f.appendChild(el("div", "mb"));
    f.appendChild(compareHost);

    paint();
    return f;
  };

  PAGES.economics = function () {
    var f = document.createDocumentFragment();
    var eff = D.abtest.effect[0];
    var target = D.abtest.cate[2];
    var gridData = D.stress.grid;
    var labels = {};
    var controls = el("div", "controls");
    var resCard = el("article", "result-card viable");
    var statusEl = el("span", "result-status", "");
    var roiVal = el("b", "rc-value", "");
    var explain = el("p", "", "");
    var kpiHost = el("div", "grid grid-3");
    var forestHost = el("div", "");
    var gridHost = el("div", "");

    pageTitle = "Scenario lab";
    f.appendChild(lead("Kéo voucher và take rate để xem ngưỡng hòa vốn dịch chuyển. Quyết định dựa trên cận dưới CI của uplift."));

    function paint() {
      var r = campaignCompute(target, {
        voucher: econState.voucher,
        take: econState.take,
        opex: 1.25,
        redeem: 100,
        reach: 100,
        carry: 100
      });
      var ok = r.decision === "Triển khai";

      labels.voucher.textContent = labelUsd(econState.voucher);
      labels.take.textContent = econState.take + "%";
      resCard.className = "result-card " + (ok ? "viable" : "notviable");
      statusEl.textContent = r.decision.toUpperCase();
      roiVal.textContent = (r.roi >= 0 ? "" : "-") + Math.abs(r.roi).toFixed(1) + "%";
      explain.innerHTML =
        "Ngưỡng hòa vốn <strong>" + r.breakeven.toFixed(4) +
        "</strong> so với cận dưới CI <strong>" + eff.lo.toFixed(4) +
        "</strong>. Voucher <strong>" + labelUsd(econState.voucher) +
        "</strong>, take rate <strong>" + econState.take + "%</strong>.";

      kpiHost.innerHTML = "";
      [
        ["Chi phí/rider", usd(r.costPer, 2), "voucher + opex $1.25"],
        ["Biên/chuyến", usd(r.margin, 2), "cước TB cụm 2 $" + target.fare.toFixed(2)],
        ["Ngưỡng hòa vốn", r.breakeven.toFixed(4), "chuyến/rider"]
      ].forEach(function (x) { kpiHost.appendChild(kpi(x[0], x[1], x[2])); });

      forestHost.innerHTML = "";
      forestHost.appendChild(C.forest({
        rows: [{
          label: "Uplift cụm target",
          est: eff.est,
          lo: eff.lo,
          hi: eff.hi,
          color: ok ? S[0] : ST.critical,
          main: true,
          note: "Ngưỡng hòa vốn: " + r.breakeven.toFixed(4)
        }],
        threshold: r.breakeven,
        width: 620,
        labelW: 150
      }));

      gridHost.innerHTML = "";
      gridHost.appendChild(C.decisionGrid({
        cols: gridData.takeRates,
        rows: gridData.vouchers,
        cells: gridData.cells,
        colorMap: decisionColors(),
        current: {
          row: gridData.vouchers.indexOf("$" + econState.voucher),
          col: gridData.takeRates.indexOf(econState.take + "%")
        },
        cellW: 110
      }));
    }

    controls.appendChild(control("voucher", "Mệnh giá voucher", econState.voucher, 3, 12, 1, "$3", "$12", labels, function (v) {
      econState.voucher = v;
    }, paint));
    controls.appendChild(control("take", "Take rate nền tảng", econState.take, 15, 25, 1, "15%", "25%", labels, function (v) {
      econState.take = v;
    }, paint));

    resCard.appendChild(el("span", "rc-label", "Quyết định trực tiếp"));
    resCard.appendChild(statusEl);
    var roiWrap = el("div", "");
    roiWrap.appendChild(el("small", "rc-label", "ROI dự phóng"));
    roiWrap.appendChild(roiVal);
    resCard.appendChild(roiWrap);
    resCard.appendChild(explain);

    f.appendChild(sectionLead(null, "1. Giả định kinh doanh"));
    f.appendChild(grid("lab", [
      card({ title: "Giả định", sub: "Uplift 1.9670 chuyến/rider giữ nguyên.", body: [controls] }),
      resCard
    ]));
    f.appendChild(el("div", "mb"));
    f.appendChild(kpiHost);
    f.appendChild(sectionLead(null, "2. Uplift so với ngưỡng hòa vốn"));
    f.appendChild(card({ body: [forestHost] }));
    f.appendChild(sectionLead(null, "3. Lưới quyết định stress test"));
    f.appendChild(card({ body: [gridHost] }));

    paint();
    return f;
  };

  var TITLES = { overview: "Tổng quan", campaign: "Máy tính chiến dịch", economics: "Scenario lab" };
  var content = document.getElementById("content");
  var pageTitleEl = document.getElementById("pageTitle");

  function current() {
    var key = (location.hash || "#overview").slice(1).split(":")[0];
    return PAGES[key] ? key : "overview";
  }

  function render() {
    var key = current();
    pageTitle = "";
    var wrap = el("div", "animate-in");
    wrap.appendChild(PAGES[key]());
    content.innerHTML = "";
    content.appendChild(wrap);
    content.focus({ preventScroll: true });
    pageTitleEl.textContent = pageTitle || TITLES[key];
    document.title = TITLES[key] + " — Ride-Hailing Promotions";

    Array.prototype.forEach.call(document.querySelectorAll(".nav-item, .mobile-nav a"), function (a) {
      a.classList.toggle("active", a.dataset.section === key);
    });
    window.scrollTo(0, 0);
    document.body.classList.remove("nav-open");
  }

  function applyTheme(t, redraw) {
    document.documentElement.setAttribute("data-theme", t);
    var themeBtn = document.getElementById("themeBtn");
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", String(t === "light"));
      themeBtn.title = t === "light" ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng";
    }
    C.refreshPalette();
    if (redraw) render();
  }

  window.addEventListener("hashchange", render);

  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      try { localStorage.setItem("rg-theme", next); } catch (e) {}
      applyTheme(next, true);
    });
  }

  var menuBtn = document.getElementById("menuBtn");
  var sidebarClose = document.getElementById("sidebarClose");
  var scrim = document.getElementById("scrim");
  if (menuBtn) menuBtn.addEventListener("click", function () { document.body.classList.add("nav-open"); });
  if (sidebarClose) sidebarClose.addEventListener("click", function () { document.body.classList.remove("nav-open"); });
  if (scrim) scrim.addEventListener("click", function () { document.body.classList.remove("nav-open"); });

  applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark", false);
  render();
})();
