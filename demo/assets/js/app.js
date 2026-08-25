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

  /* marker trong biểu đồ tô theo quyết định thật của từng cụm, không theo cụm
     đang được chọn — chọn cụm nào chỉ đổi độ đậm của nhãn */
  function decisionMark(decision) {
    return C.STATUS[resultKind(decision)];
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
  /* trạng thái máy tính — mặc định đúng giả định trong AB_testing_report */
  /* dải của thanh điều chỉnh — dùng chung cho control và kịch bản what-if */
  var V_MIN = 1, V_MAX = 10, U_MIN = 0.5, U_MAX = 3;

  var simState = {
    segment: 2,
    n: 6446,
    voucher: 5,
    opex: 1.25,
    margin: 22.6722 * 0.20,
    uplift: 1.9670,
    days: 30
  };

  /* ======================================================================
     Component dùng chung cho các trang dashboard
     ====================================================================== */

  var GLYPH = {
    calendar: '<rect x="3.2" y="4.6" width="17.6" height="16.2" rx="2.4"/><path d="M3.2 9.4h17.6M8 2.8v3.6M16 2.8v3.6"/>',
    people:   '<circle cx="9" cy="8" r="3.1"/><path d="M3.4 19.2a5.8 5.8 0 0 1 11.2 0"/><circle cx="17.4" cy="9.4" r="2.4"/><path d="M16 14.6a4.6 4.6 0 0 1 4.7 4.6"/>',
    target:   '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1"/>',
    flask:    '<path d="M10 3v6.2L5.2 18a2 2 0 0 0 1.7 3h10.2a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M8.6 3h6.8"/>',
    shield:   '<path d="M12 2.9l7.4 3v5.5c0 4.3-3 8.2-7.4 9.7-4.4-1.5-7.4-5.4-7.4-9.7V5.9z"/><path d="M9 12.1l2.2 2.2L15.4 10"/>',
    bulb:     '<path d="M9.2 17.4h5.6M10 20.6h4"/><path d="M12 3.2a5.8 5.8 0 0 1 3.5 10.4c-.5.4-.8 1-.8 1.6H9.3c0-.6-.3-1.2-.8-1.6A5.8 5.8 0 0 1 12 3.2z"/>',
    simulate: '<rect x="4" y="2.8" width="16" height="18.4" rx="2.4"/><path d="M8 7h8M8 11.4h2.6M12.7 11.4h2.6M8 15.6h2.6M12.7 15.6h2.6"/>',
    arrow:    '<path d="M5 12h13M12.5 6.2L19 12l-6.5 5.8"/>'
  };

  function ico(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 18) + '" height="' + (size || 18) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + GLYPH[name] + "</svg>";
  }

  /* tiêu đề lớn của trang + chip ngày cập nhật */
  function hero(title, text) {
    var h = el("div", "hero");
    var left = el("div", "");
    left.appendChild(el("h2", "hero-title", esc(title)));
    if (text) left.appendChild(el("p", "hero-lead", esc(text)));
    h.appendChild(left);
    return h;
  }

  /* thẻ có tiêu đề và link sang trang chi tiết */
  function panel(title, href, kids) {
    var c = el("section", "panel");
    var head = el("div", "panel-head");
    head.appendChild(el("h3", "", esc(title)));
    if (href) {
      var a = el("a", "panel-link", "Xem chi tiết " + ico("arrow", 13));
      a.href = "#" + href;
      head.appendChild(a);
    }
    c.appendChild(head);
    var body = el("div", "panel-body");
    kids.forEach(function (k) { if (k) body.appendChild(typeof k === "string" ? el("div", "", k) : k); });
    c.appendChild(body);
    return c;
  }

  function passChip(ok, label) {
    return '<span class="pass ' + (ok ? "pass-yes" : "pass-no") + '">' +
      (ok ? ICON.good : ICON.bad) + esc(label || (ok ? "PASS" : "FAIL")) + "</span>";
  }

  /* ======================================================================
     Trang 1 — Quyết định
     ====================================================================== */
  PAGES.decision = function () {
    var d = D.decision;
    var f = document.createDocumentFragment();

    f.appendChild(hero(d.question, d.lead));

    /* --- hai phương án + khuyến nghị --- */
    var opts = el("div", "options");
    d.options.forEach(function (o) {
      var wrap = el("div", "opt-wrap opt-" + o.kind);
      var c = el("article", "opt");
      c.appendChild(el("span", "opt-mark", o.kind === "good" ? ICON.good : ICON.bad));
      var body = el("div", "opt-body");
      body.appendChild(el("h3", "opt-name", esc(o.name)));
      body.appendChild(el("p", "opt-riders", "<strong>" + esc(o.riders) + "</strong> riders đủ điều kiện"));
      var rows = el("div", "opt-rows");
      rows.innerHTML =
        "<div><span>Chi phí</span><b>" + esc(o.cost) + "</b></div>" +
        '<div><span>Lợi nhuận</span><b class="' + o.kind + '">' + esc(o.profit) + "</b></div>";
      body.appendChild(rows);
      c.appendChild(body);
      var roi = el("div", "opt-roi");
      roi.innerHTML = "<b>" + esc(o.roi) + "</b><small>ROI</small>";
      c.appendChild(roi);
      wrap.appendChild(c);
      wrap.appendChild(el("p", "opt-verdict", chip(o.kind, o.verdict)));
      opts.appendChild(wrap);
    });

    var rec = el("aside", "rec");
    rec.appendChild(el("p", "rec-label", ico("bulb", 14) + "<span>Khuyến nghị</span>"));
    rec.appendChild(el("p", "rec-title", esc(d.recommend.title)));
    rec.appendChild(el("p", "rec-text", esc(d.recommend.body)));
    var cta = el("a", "btn btn-primary", "Mô phỏng chiến dịch " + ico("arrow", 14));
    cta.href = "#simulate";
    rec.appendChild(cta);
    var alt = el("a", "btn-link", "Xem bằng chứng");
    alt.href = "#evidence";
    rec.appendChild(alt);

    var top = el("div", "decision-top");
    top.appendChild(opts);
    top.appendChild(rec);
    f.appendChild(top);

    /* --- lộ trình 5 bước --- */
    f.appendChild(sectionLead(null, "Lộ trình ra quyết định dựa trên bằng chứng"));
    var road = el("div", "roadmap");
    d.roadmap.forEach(function (st, i) {
      var s = el("div", "road-step" + (i === 2 ? " road-on" : ""));
      s.appendChild(el("p", "road-num", esc(st[0])));
      s.appendChild(el("span", "road-ico", ico(st[1], 17)));
      s.appendChild(el("p", "road-title", esc(st[2])));
      s.appendChild(el("p", "road-text", esc(st[3])));
      s.appendChild(el("p", "road-out", esc(st[4])));
      road.appendChild(s);
      if (i < d.roadmap.length - 1) road.appendChild(el("span", "road-arrow", ico("arrow", 14)));
    });
    f.appendChild(road);

    /* --- ba cột tóm tắt --- */
    f.appendChild(el("div", "mb"));
    var cols = el("div", "summary3");
    cols.appendChild(panel("Khách hàng mục tiêu: 3 nhóm hành vi", "segments",
      [personaList(true), whyTarget()]));
    cols.appendChild(panel("Bằng chứng thực nghiệm", "evidence",
      [armStrip(), upliftChart(330), stressStrip()]));
    cols.appendChild(panel("Hiệu quả kinh tế: So sánh hai phương án", "economics",
      [compareTable(), waterfall()]));
    f.appendChild(cols);

    /* --- dải mô phỏng --- */
    f.appendChild(el("div", "mb"));
    f.appendChild(simStrip());
    return f;
  };

  /* --------------------------------------------------- khối dùng lại được */
  function personaList(compact) {
    var box = el("div", "personas");
    D.segments.rows.forEach(function (r) {
      var a = el(compact ? "a" : "div", "persona" + (r.target ? " persona-on" : ""));
      if (compact) a.href = "#segments";
      a.innerHTML =
        '<span class="persona-id c' + r.cluster + '">' + ico("people", 15) + "</span>" +
        '<span class="persona-main">' +
          '<span class="persona-head"><b>Cluster ' + r.cluster + "</b>" +
          '<span class="sep">|</span><span>' + esc(r.name) + "</span></span>" +
          '<span class="persona-traits">' + r.traits.map(esc).join(" · ") + "</span>" +
          '<span class="persona-size">' + nf(r.n) + " riders · " + esc(r.share) + "</span>" +
        "</span>" +
        '<span class="persona-tag ' + (r.target ? "on" : "off") + '">' +
        (r.target ? "TARGET" : "Không target") + "</span>";
      box.appendChild(a);
    });
    return box;
  }

  function whyTarget(asCard) {
    var w = el("div", asCard ? "why why-card" : "why");
    w.appendChild(el("p", "why-title", "Tại sao chọn Cluster 2?"));
    var ul = el("ul", "why-list");
    D.segments.reasons.forEach(function (r) {
      ul.appendChild(el("li", "",
        '<span class="why-ico">' + ICON.good + "</span>" +
        '<span class="why-text"><b>' + esc(r.title) + "</b><small>" + esc(r.note) + "</small></span>"));
    });
    w.appendChild(ul);
    return w;
  }

  function armStrip() {
    var g = el("div", "arms");
    D.evidence.arms.forEach(function (a) {
      var b = el("div", "arm");
      b.appendChild(el("p", "arm-label", esc(a.label)));
      b.appendChild(el("p", "arm-value", esc(a.value)));
      b.appendChild(el("p", "arm-note", a.pass === undefined ? esc(a.note) : passChip(true)));
      g.appendChild(b);
    });
    return g;
  }

  function upliftChart(width) {
    var u = D.evidence.uplift;
    var box = el("div", "uplift");
    var head = el("div", "uplift-head");
    head.innerHTML =
      '<p class="uplift-label">Uplift (incremental trips / rider)</p>' +
      '<p class="uplift-value">' + u.est.toFixed(3) + "<small>trips / rider</small></p>";
    box.appendChild(head);
    box.appendChild(C.forest({
      rows: [{
        label: "Cluster 2",
        est: u.est, lo: u.lo, hi: u.hi,
        threshold: u.breakeven,
        color: C.STATUS.good,
        main: true,
        note: "Triển khai"
      }],
      width: width || 520,
      labelW: width && width < 400 ? 62 : 90
    }));
    box.appendChild(el("p", "uplift-note", ICON.good + esc(D.evidence.note)));
    return box;
  }

  function stressStrip() {
    var w = el("div", "stress-strip");
    w.appendChild(el("p", "strip-title", "Độ tin cậy kết quả"));
    var row = el("div", "stress-row");
    D.evidence.stress.forEach(function (s) {
      var c = el("div", "stress-cell");
      c.innerHTML = '<span class="stress-name">' + esc(s.name) + "</span>" + passChip(true);
      row.appendChild(c);
    });
    w.appendChild(row);
    return w;
  }

  function compareTable() {
    var e = D.economics.compare;
    return table(["", e.cols[0], e.cols[1]], e.rows.map(function (r) {
      var kind = r[3];
      if (kind === "chip") return [esc(r[0]), chip("critical", r[1]), chip("good", r[2])];
      if (kind === "num") {
        return [esc(r[0]), '<b class="critical">' + esc(r[1]) + "</b>", '<b class="good">' + esc(r[2]) + "</b>"];
      }
      return [esc(r[0]), esc(r[1]), esc(r[2])];
    }), { num: [1, 2] });
  }

  function waterfall() {
    var w = D.economics.waterfall;
    var max = Math.max.apply(null, w.map(function (x) { return Math.abs(x.value); }));
    var box = el("div", "wf");
    box.appendChild(el("p", "strip-title", "Cấu trúc lợi nhuận (Targeted rollout)"));
    var row = el("div", "wf-row");
    w.forEach(function (x, i) {
      if (i) row.appendChild(el("span", "wf-op", i === w.length - 1 ? "=" : "−"));
      var cell = el("div", "wf-cell");
      cell.appendChild(el("p", "wf-value", usd(Math.abs(x.value))));
      var track = el("div", "wf-track");
      var bar = el("div", "wf-bar wf-" + x.kind);
      bar.style.width = Math.max(Math.abs(x.value) / max * 100, 5) + "%";
      track.appendChild(bar);
      cell.appendChild(track);
      cell.appendChild(el("p", "wf-label", esc(x.label)));
      row.appendChild(cell);
    });
    box.appendChild(row);
    return box;
  }

  /* dải mô phỏng nhanh — set tham số rồi nhảy sang máy tính */
  function simStrip() {
    var CATE = D.abtest.cate;
    var box = el("section", "simstrip");
    var head = el("div", "simstrip-head");
    head.innerHTML = '<span class="simstrip-ico">' + ico("simulate", 20) + "</span>" +
      "<div><h3>Mô phỏng chiến dịch</h3>" +
      "<p>Thay đổi ngân sách, giá trị voucher hoặc kỳ vọng uplift để xem hiệu quả và quyết định thay đổi như thế nào.</p></div>";
    box.appendChild(head);

    var form = el("div", "simstrip-form");
    var sel = el("select", "field-input");
    CATE.forEach(function (c, i) {
      var o = el("option", "", "Cluster " + c.cluster);
      o.value = i;
      if (i === simState.segment) o.selected = true;
      sel.appendChild(o);
    });
    var nEl = el("input", "field-input");
    nEl.readOnly = true;
    var vEl = el("input", "field-input");
    vEl.type = "text";
    vEl.inputMode = "decimal";
    vEl.value = simState.voucher.toFixed(2);
    var uEl = el("input", "field-input");
    uEl.readOnly = true;

    function sync() {
      var c = CATE[simState.segment];
      nEl.value = nf(simState.n);
      uEl.value = simState.uplift.toFixed(2) + " trips/rider";
    }
    sel.addEventListener("change", function () {
      simState.segment = +sel.value;
      var d = simDefaults(simState.segment);
      simState.n = d.n; simState.margin = d.margin; simState.uplift = d.uplift;
      sync();
    });
    vEl.addEventListener("input", function () {
      var v = parseFloat(String(vEl.value).replace(",", ".").replace(/[^\d.]/g, ""));
      if (!isNaN(v) && v >= V_MIN && v <= V_MAX) simState.voucher = v;
    });
    vEl.addEventListener("blur", function () { vEl.value = simState.voucher.toFixed(2); });
    sync();

    [["Chọn segment", sel], ["Số rider đủ điều kiện", nEl], ["Giá trị voucher", vEl], ["Kỳ vọng uplift", uEl]]
      .forEach(function (pair) {
        var fld = el("label", "field");
        fld.appendChild(el("span", "field-label", esc(pair[0])));
        fld.appendChild(pair[1]);
        form.appendChild(fld);
      });

    var go = el("a", "btn btn-primary", "Mở máy tính chiến dịch " + ico("arrow", 14));
    go.href = "#simulate";
    form.appendChild(go);
    box.appendChild(form);
    return box;
  }

  /* ======================================================================
     Trang 2 — Khách hàng mục tiêu
     ====================================================================== */

  /* giá trị dùng cho thanh Thấp -> Cao: fare/cự ly lấy trực tiếp,
     tip và airport lấy z-score vì đơn vị gốc không so sánh được */
  function segVal(r, key) {
    return key === "tip" ? r.z[0] : (key === "airport" ? r.z[2] : r[key]);
  }

  function segRange() {
    var out = {};
    D.segments.metrics.forEach(function (m) {
      var vs = D.segments.rows.map(function (r) { return segVal(r, m[1]); });
      out[m[1]] = { lo: Math.min.apply(null, vs), hi: Math.max.apply(null, vs) };
    });
    return out;
  }

  PAGES.segments = function () {
    var sg = D.segments;
    var rg = segRange();
    var f = document.createDocumentFragment();

    f.appendChild(hero("Khách hàng mục tiêu", sg.lead));
    f.appendChild(sectionLead(null, "3 nhóm hành vi được phát hiện"));

    var wrap = el("div", "clusters");
    sg.rows.forEach(function (r) {
      var c = el("article", "cl cl-" + r.tone + (r.target ? " cl-on" : ""));

      var head = el("div", "cl-head");
      head.innerHTML = '<span class="cl-ico">' + ico("people", 15) + "</span><b>Cluster " + r.cluster + "</b>";
      c.appendChild(head);
      c.appendChild(el("p", "cl-name", esc(r.name)));
      c.appendChild(el("p", "cl-size",
        "<b>" + nf(r.n) + " riders</b><span>·</span><b>" + esc(r.share) + "</b>"));

      var ul = el("ul", "cl-list");
      r.bullets.forEach(function (b) { ul.appendChild(el("li", "", esc(b))); });
      c.appendChild(ul);

      var scale = el("div", "cl-scale", "<span>Thấp</span><span>Cao</span>");
      c.appendChild(scale);

      var bars = el("div", "cl-bars");
      sg.metrics.forEach(function (m) {
        var band = rg[m[1]], v = segVal(r, m[1]);
        var pct = band.hi === band.lo ? 50 : 12 + (v - band.lo) / (band.hi - band.lo) * 76;
        var row = el("div", "cl-bar");
        row.innerHTML =
          '<span class="cl-bar-key">' + esc(m[0]) + "</span>" +
          '<span class="cl-bar-track"><i style="width:' + pct.toFixed(1) + '%"></i>' +
          '<u style="left:' + pct.toFixed(1) + '%"></u></span>';
        bars.appendChild(row);
      });
      c.appendChild(bars);

      c.appendChild(el("p", "cl-verdict " + (r.target ? "on" : "off"),
        (r.target ? ICON.good + "TARGET" : ICON.bad + "Không target")));
      wrap.appendChild(c);
    });
    wrap.appendChild(whyTarget(true));
    f.appendChild(wrap);

    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "Thông tin nhanh về nhóm mục tiêu"));
    var q = el("div", "quickfacts");
    sg.quick.forEach(function (x) {
      var it = el("div", "qf");
      it.innerHTML = '<span class="qf-ico">' + ico(x[0], 17) + "</span>" +
        "<span class=\"qf-text\"><b>" + esc(x[1]) + "</b><small>" + esc(x[2]) + "</small></span>";
      q.appendChild(it);
    });
    f.appendChild(card({ body: [q] }));
    return f;
  };

  /* ======================================================================
     Trang 3 — Bằng chứng thực nghiệm
     ====================================================================== */

  /* Biểu đồ khoảng tin cậy: trục ngang, vạch breakeven đỏ, nhãn ngay trên điểm */
  function ciPlot(opts) {
    var u = opts.uplift, W = opts.width || 620, H = 150;
    var padL = 26, padR = 26, y = 92;
    var lo = 0, hi = opts.max || 3;
    var x = function (v) { return padL + (v - lo) / (hi - lo) * (W - padL - padR); };
    var ns = "http://www.w3.org/2000/svg";
    function n(tag, attrs) {
      var e = document.createElementNS(ns, tag);
      for (var k in attrs) if (attrs[k] !== null) e.setAttribute(k, attrs[k]);
      return e;
    }
    function txt(px, py, str, cls, anchor) {
      var t = n("text", { x: px, y: py, class: cls, "text-anchor": anchor || "middle" });
      t.textContent = str;
      return t;
    }
    var svg = n("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img" });
    svg.style.maxWidth = "100%";
    svg.setAttribute("aria-label",
      "Uplift " + u.est.toFixed(3) + ", khoảng tin cậy 95% từ " + u.lo.toFixed(3) +
      " đến " + u.hi.toFixed(3) + ", ngưỡng hòa vốn " + u.breakeven.toFixed(3));

    /* trục và vạch chia */
    svg.appendChild(n("line", { x1: padL, x2: W - padR, y1: y + 26, y2: y + 26, class: "axis-line" }));
    for (var t0 = 0; t0 <= hi; t0 += 1) {
      svg.appendChild(n("line", { x1: x(t0), x2: x(t0), y1: y + 22, y2: y + 30, class: "grid-line" }));
      svg.appendChild(txt(x(t0), y + 44, t0.toFixed(1), "axis-text tabular"));
    }

    /* ngưỡng hòa vốn */
    var bx = x(u.breakeven);
    svg.appendChild(n("line", {
      x1: bx, x2: bx, y1: 34, y2: y + 26,
      stroke: C.STATUS.critical, "stroke-width": 1.6, "stroke-dasharray": "4 4"
    }));
    var bl = txt(bx, 26, "Breakeven", "label-strong");
    bl.setAttribute("fill", C.STATUS.critical);
    svg.appendChild(bl);
    var bv = txt(bx, 40, u.breakeven.toFixed(3), "label-text");
    bv.setAttribute("fill", C.STATUS.critical);
    svg.appendChild(bv);

    /* thanh khoảng tin cậy */
    var blue = C.UI[0];
    svg.appendChild(n("line", {
      x1: x(u.lo), x2: x(u.hi), y1: y, y2: y,
      stroke: blue, "stroke-width": 5, "stroke-linecap": "round"
    }));
    [u.lo, u.hi].forEach(function (v) {
      svg.appendChild(n("circle", { cx: x(v), cy: y, r: 5, fill: blue }));
      svg.appendChild(txt(x(v), y - 16, v.toFixed(3), "label-text"));
    });
    svg.appendChild(n("circle", {
      cx: x(u.est), cy: y, r: 7.5, fill: blue,
      stroke: C.cssVar("--chart-halo", "#fff"), "stroke-width": 2.5
    }));
    svg.appendChild(txt(x(u.est), y - 20, u.est.toFixed(3), "label-strong"));

    var wrap = el("div", "chart");
    wrap.appendChild(svg);
    wrap.appendChild(el("div", "ci-legend",
      '<span><i class="dot"></i>Cận dưới (95% CI)</span>' +
      '<span><i class="dot big"></i>Ước lượng</span>' +
      '<span><i class="dot"></i>Cận trên (95% CI)</span>' +
      '<span><i class="dash"></i>Breakeven</span>'));
    return wrap;
  }

  PAGES.evidence = function () {
    var ev = D.evidence;
    var f = document.createDocumentFragment();
    f.appendChild(hero("Bằng chứng thực nghiệm", ev.lead));

    /* --- 1. sức khoẻ thí nghiệm --- */
    f.appendChild(sectionLead("1.", "Randomization"));
    var health = el("div", "health");
    ev.health.forEach(function (h) {
      var c = el("div", "hcard" + (h.accent ? " hcard-on" : ""));
      if (h.icon) c.appendChild(el("span", "hcard-ico", ico(h.icon, 18)));
      c.appendChild(el("p", "hcard-label", esc(h.label)));
      c.appendChild(el("p", "hcard-value", esc(h.value)));
      c.appendChild(el("p", "hcard-note", h.pass ? passChip(true) : esc(h.note)));
      if (h.pass && h.note) c.appendChild(el("p", "hcard-sub", esc(h.note)));
      health.appendChild(c);
    });
    f.appendChild(health);

    /* --- 2. tác động của voucher --- */
    f.appendChild(sectionLead("2.", "Tác động của voucher"));
    var impact = el("div", "impact");

    var left = el("div", "card impact-main");
    var box = el("div", "");
    box.appendChild(el("p", "uplift-label", "Uplift ước tính"));
    box.appendChild(el("p", "uplift-value", ev.uplift.est.toFixed(3) + "<small>trips / rider</small>"));
    box.appendChild(el("p", "uplift-tag",
      '<span class="pass pass-yes">+' + ev.means.relative.replace("%", "") + "% relative lift</span>" +
      '<span class="pass pass-yes">+' + ev.overBreakeven + "% vs breakeven</span>"));
    var chartRow = el("div", "impact-row");
    chartRow.appendChild(box);
    chartRow.appendChild(ciPlot({ uplift: ev.uplift, width: 560 }));
    left.appendChild(el("p", "impact-cap", "Incremental trips / rider"));
    left.appendChild(chartRow);
    impact.appendChild(left);

    var right = el("aside", "card impact-side");
    right.appendChild(el("p", "why-title", "Kết luận"));
    ev.conclusion.forEach(function (t, i) {
      var p = el("p", i === 0 ? "concl concl-good" : "concl");
      p.innerHTML = (i === 0 ? '<span class="why-ico">' + ICON.good + "</span>" : "") +
        "<span>" + esc(t) + "</span>";
      right.appendChild(p);
    });
    impact.appendChild(right);
    f.appendChild(impact);

    /* --- 3. độ tin cậy --- */
    f.appendChild(sectionLead("3.", "Độ tin cậy & độ vững của kết quả"));
    var rob = el("div", "robust");
    ev.stress.forEach(function (s) {
      var c = el("div", "rcard");
      c.appendChild(el("p", "rcard-name", esc(s.name)));
      c.appendChild(el("p", "", passChip(true)));
      c.appendChild(el("p", "rcard-note", esc(s.metric)));
      rob.appendChild(c);
    });
    var sum = el("div", "rcard rcard-sum");
    sum.appendChild(el("span", "rcard-ico", ico("shield", 18)));
    sum.appendChild(el("p", "rcard-name", "Stress test (5/5)"));
    sum.appendChild(el("p", "rcard-big", "PASS"));
    sum.appendChild(el("p", "rcard-note", "Kết quả ổn định qua tất cả kiểm tra"));
    rob.appendChild(sum);
    f.appendChild(rob);

    f.appendChild(el("p", "muted-text", esc(ev.stressFragile.note)));
    return f;
  };

  /* ======================================================================
     Trang 5 — Mô phỏng chiến dịch
     ====================================================================== */

  function simCompute(st) {
    var costPer = st.voucher + st.opex;
    var factor = st.days / 30;                 /* uplift đo trong cửa sổ 30 ngày */
    var upliftEff = st.uplift * factor;
    var trips = upliftEff * st.n;
    var revenue = trips * st.margin;
    var cost = costPer * st.n;
    var profit = revenue - cost;
    return {
      costPer: costPer,
      breakeven: st.margin > 0 ? costPer / st.margin : Infinity,
      upliftEff: upliftEff,
      trips: trips,
      revenue: revenue,
      cost: cost,
      profit: profit,
      roi: cost > 0 ? profit / cost * 100 : 0,
      ok: st.margin > 0 && upliftEff > costPer / st.margin
    };
  }

  /* mốc gốc của một cụm — đúng giả định trong AB_testing_report,
     dùng làm vế trái cố định của bảng what-if */
  function simBase(i) {
    var c = D.abtest.cate[i];
    return {
      segment: i,
      n: c.n,
      voucher: 5,
      opex: 1.25,
      margin: c.fare * D.abtest.defaults.take / 100,
      uplift: c.cate,
      days: 30
    };
  }

  function simDefaults(i) {
    var c = D.abtest.cate[i];
    return { n: c.n, margin: c.fare * D.abtest.defaults.take / 100, uplift: c.cate };
  }

  PAGES.simulate = function () {
    var CATE = D.abtest.cate;
    var f = document.createDocumentFragment();
    pageTitle = "Mô phỏng chiến dịch";

    f.appendChild(hero("Mô phỏng chiến dịch",
      "Thay đổi giả định để xem hiệu quả và quyết định thay đổi như thế nào."));

    var paramHost = el("div", "card sim-params");
    var outHost = el("div", "sim-out");
    var decHost = el("aside", "card sim-dec");
    var whatHost = el("aside", "card sim-what");
    var forestHost = el("div", "");
    var tableHost = el("div", "");
    var refs = {};

    function paint() {
      var r = simCompute(simState);

      /* --- cột 2: kết quả --- */
      outHost.innerHTML = "";
      outHost.appendChild(el("p", "sim-head", "Kết quả mô phỏng"));
      [
        ["economics", "Tổng chi phí chiến dịch", usd(r.cost), null, false],
        ["simulate", "Chuyến tăng thêm", nf(Math.round(r.trips)), "trips", false],
        ["economics", "Doanh thu tăng thêm", usd(r.revenue), null, false],
        ["shield", "Lợi nhuận ròng", usd(r.profit), null, true],
        ["target", "ROI", (r.roi >= 0 ? "" : "−") + Math.abs(r.roi).toFixed(1) + "%", null, true],
        ["flask", "Uplift breakeven", r.breakeven.toFixed(3), "trips / rider", false]
      ].forEach(function (x) {
        var hot = x[4] && r.ok;
        var row = el("div", "sim-row" + (hot ? " sim-row-on" : ""));
        row.innerHTML =
          '<span class="sim-ico">' + ico(x[0], 17) + "</span>" +
          '<span class="sim-text"><small>' + esc(x[1]) + "</small><b>" + x[2] +
          (x[3] ? '<i class="sim-unit">' + esc(x[3]) + "</i>" : "") + "</b></span>";
        outHost.appendChild(row);
      });

      /* --- cột 3: quyết định --- */
      decHost.innerHTML = "";
      decHost.appendChild(el("p", "sim-head", "Quyết định"));
      var pane = el("div", "dec-pane " + (r.ok ? "dec-ok" : "dec-no"));
      pane.appendChild(el("span", "dec-mark", r.ok ? ICON.good : ICON.bad));
      pane.appendChild(el("p", "dec-title", r.ok ? "Đủ điều kiện triển khai" : "Chưa đủ điều kiện"));
      pane.appendChild(el("p", "dec-text", r.ok
        ? "Uplift kỳ vọng vượt breakeven và mang lại ROI dương."
        : "Uplift kỳ vọng chưa vượt breakeven " + r.breakeven.toFixed(3) + " chuyến/rider."));
      var btn = el("span", "btn " + (r.ok ? "btn-go" : "btn-stop"),
        (r.ok ? ICON.good + "Triển khai có kiểm soát" : ICON.bad + "Không triển khai"));
      pane.appendChild(btn);
      decHost.appendChild(pane);

      /* --- what-if: vế trái là giá trị đang đặt, vế phải tự chỉnh --- */
      paintWhat();

      /* --- ba cụm dưới cùng bộ tham số --- */
      var take = simState.margin / CATE[simState.segment].fare;
      function perCluster(c) {
        return simCompute(Object.assign({}, simState, {
          n: c.n, margin: c.fare * take, uplift: c.cate
        }));
      }
      forestHost.innerHTML = "";
      forestHost.appendChild(C.forest({
        rows: CATE.map(function (c, i) {
          var x = perCluster(c);
          var dec = c.lo * simState.days / 30 > x.breakeven ? "Triển khai"
                  : (x.upliftEff > x.breakeven ? "Cân nhắc" : "Dừng");
          return {
            label: "Cụm " + c.cluster + " · " + c.name,
            est: x.upliftEff,
            lo: c.lo * simState.days / 30,
            hi: c.hi * simState.days / 30,
            threshold: x.breakeven,
            color: decisionMark(dec),
            main: i === simState.segment,
            note: dec
          };
        }),
        width: 620,
        labelW: 190
      }));

      tableHost.innerHTML = "";
      tableHost.appendChild(table(
        ["Cụm", "Rider", "Uplift", "Hòa vốn", "Lợi nhuận", "ROI", "Quyết định"],
        CATE.map(function (c, i) {
          var x = perCluster(c);
          var dec = c.lo * simState.days / 30 > x.breakeven ? "Triển khai"
                  : (x.upliftEff > x.breakeven ? "Cân nhắc" : "Dừng");
          var name = "Cụm " + c.cluster + " · " + esc(c.name);
          return [
            i === simState.segment ? "<strong>" + name + "</strong>" : name,
            nf(c.n), x.upliftEff.toFixed(4), x.breakeven.toFixed(4),
            usd(x.profit), (x.roi >= 0 ? "" : "−") + Math.abs(x.roi).toFixed(1) + "%",
            chip(resultKind(dec), dec)
          ];
        }),
        { num: [1, 2, 3, 4, 5] }
      ));

      /* đồng bộ nhãn điều khiển */
      if (refs.voucherOut) refs.voucherOut.textContent = simState.voucher.toFixed(2);
      if (refs.upliftOut) refs.upliftOut.textContent = simState.uplift.toFixed(2);
    }

    /* ---------------------------------------------- khối what-if (dựng 1 lần)
       Vế trái là mốc gốc của cụm và không đổi. Vế phải bám theo thanh điều
       chỉnh bên trái. ROI mỗi dòng = ROI khi CHỈ tham số đó rời mốc gốc,
       các tham số còn lại giữ ở mốc — nên đọc được đúng phần đóng góp của
       từng thay đổi, thay vì ROI tổng đã trộn lẫn cả ba. */
    var WHAT = [
      { key: "voucher", label: "Voucher", money: true },
      { key: "uplift",  label: "Uplift",  money: false },
      { key: "margin",  label: "Margin",  money: true }
    ];
    var whatRows = [];

    function whatFmt(spec, v) { return spec.money ? usd(v, 2) : v.toFixed(2); }

    function buildWhat() {
      whatHost.innerHTML = "";
      whatRows = [];
      whatHost.appendChild(el("p", "sim-head", "What-if nhanh"));
      whatHost.appendChild(el("p", "what-note",
        "Vế trái là mốc gốc. Kéo thanh bên trái để đổi vế phải và xem ROI của riêng thay đổi đó."));

      WHAT.forEach(function (spec) {
        var row = el("div", "what-item");

        var head = el("div", "what-head");
        head.appendChild(el("span", "what-key", esc(spec.label)));
        var roiEl = el("b", "");
        var roiBox = el("span", "what-roi", "<small>ROI</small>");
        roiBox.appendChild(roiEl);
        head.appendChild(roiBox);
        row.appendChild(head);

        var line = el("div", "what-line");
        var fromEl = el("span", "what-from", "");
        var toEl = el("b", "what-to", "");
        line.appendChild(fromEl);
        line.appendChild(el("span", "what-arrow", "→"));
        line.appendChild(toEl);
        row.appendChild(line);

        whatHost.appendChild(row);
        whatRows.push({ spec: spec, row: row, fromEl: fromEl, toEl: toEl, roiEl: roiEl });
      });

      var more = el("a", "what-link", "Xem chi tiết kịch bản " + ico("arrow", 13));
      more.href = "#simulate";
      more.addEventListener("click", function () {
        var t = document.getElementById("scenarios");
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      whatHost.appendChild(more);
    }

    function paintWhat() {
      var base = simBase(simState.segment);
      whatRows.forEach(function (r) {
        var k = r.spec.key;
        var from = base[k], to = simState[k];
        r.fromEl.textContent = whatFmt(r.spec, from);
        r.toEl.textContent = whatFmt(r.spec, to);

        var patch = {};
        patch[k] = to;
        var x = simCompute(Object.assign({}, base, patch));
        r.roiEl.textContent = (x.roi >= 0 ? "" : "−") + Math.abs(x.roi).toFixed(1) + "%";
        r.roiEl.className = x.roi >= 0 ? "good" : "bad";
        r.row.classList.toggle("what-item-same", Math.abs(to - from) < 0.005);
      });
    }

    /* ------------------------------------------------ cột 1: tham số */
    paramHost.appendChild(el("p", "sim-head", "Tham số mô phỏng"));

    function field(label, node, hint) {
      var box = el("div", "sim-field");
      box.appendChild(el("span", "field-label", esc(label)));
      box.appendChild(node);
      if (hint) box.appendChild(el("span", "field-hint", esc(hint)));
      paramHost.appendChild(box);
      return box;
    }

    var segSel = el("select", "field-input");
    CATE.forEach(function (c, i) {
      var o = el("option", "", "Cluster " + c.cluster + (i === 2 ? "  (Target)" : ""));
      o.value = i;
      if (i === simState.segment) o.selected = true;
      segSel.appendChild(o);
    });
    segSel.addEventListener("change", function () {
      simState.segment = +segSel.value;
      var d = simDefaults(simState.segment);
      simState.n = d.n; simState.margin = d.margin; simState.uplift = d.uplift;
      nIn.value = nf(d.n); mIn.value = d.margin.toFixed(2);
      uRange.value = d.uplift; refs.upliftOut.textContent = d.uplift.toFixed(2);
      paint();
    });
    field("Chọn segment", segSel);

    /* dùng input text thay type=number: ở locale VN trình duyệt render
       type=number thành "1,25", lệch với phần còn lại của trang dùng dấu chấm */
    var nIn = el("input", "field-input");
    nIn.type = "text";
    nIn.inputMode = "numeric";
    nIn.value = nf(simState.n);
    nIn.addEventListener("input", function () {
      var v = parseInt(String(nIn.value).replace(/[^\d]/g, ""), 10);
      if (!isNaN(v) && v > 0) { simState.n = v; paint(); }
    });
    nIn.addEventListener("blur", function () { nIn.value = nf(simState.n); });
    field("Số rider đủ điều kiện", nIn);

    var vWrap = el("div", "range-wrap");
    var vTop = el("div", "range-top");
    refs.voucherOut = el("b", "", simState.voucher.toFixed(2));
    vTop.innerHTML = "<span>$</span>";
    vTop.appendChild(refs.voucherOut);
    var vRange = el("input", "");
    vRange.type = "range"; vRange.min = V_MIN; vRange.max = V_MAX; vRange.step = 0.5;
    vRange.value = simState.voucher;
    vRange.addEventListener("input", function () { simState.voucher = +vRange.value; paint(); });
    vWrap.appendChild(vTop); vWrap.appendChild(vRange);
    vWrap.appendChild(el("div", "range-labels", "<span>$1</span><span>$10</span>"));
    field("Giá trị voucher trung bình", vWrap);

    function decField(label, get, min, apply, hint) {
      var inp = el("input", "field-input");
      inp.type = "text";
      inp.inputMode = "decimal";
      inp.value = get().toFixed(2);
      inp.addEventListener("input", function () {
        var v = parseFloat(String(inp.value).replace(",", ".").replace(/[^\d.]/g, ""));
        if (!isNaN(v) && v >= min) { apply(v); paint(); }
      });
      inp.addEventListener("blur", function () { inp.value = get().toFixed(2); });
      field(label, inp, hint);
      return inp;
    }

    var oIn = decField("Chi phí vận hành / rider (opex)",
      function () { return simState.opex; }, 0,
      function (v) { simState.opex = v; });

    var mIn = decField("Margin mỗi chuyến",
      function () { return simState.margin; }, 0.01,
      function (v) { simState.margin = v; }, "fare trung bình × take rate");

    var uWrap = el("div", "range-wrap");
    var uTop = el("div", "range-top");
    refs.upliftOut = el("b", "", simState.uplift.toFixed(2));
    uTop.appendChild(refs.upliftOut);
    var uRange = el("input", "");
    uRange.type = "range"; uRange.min = U_MIN; uRange.max = U_MAX; uRange.step = 0.01;
    uRange.value = simState.uplift;
    uRange.addEventListener("input", function () { simState.uplift = +uRange.value; paint(); });
    uWrap.appendChild(uTop); uWrap.appendChild(uRange);
    uWrap.appendChild(el("div", "range-labels", "<span>0.5</span><span>3.0</span>"));
    field("Uplift kỳ vọng (trips / rider)", uWrap);

    var dSel = el("select", "field-input");
    [30, 60, 90].forEach(function (d) {
      var o = el("option", "", d + " ngày");
      o.value = d;
      if (d === simState.days) o.selected = true;
      dSel.appendChild(o);
    });
    dSel.addEventListener("change", function () { simState.days = +dSel.value; paint(); });
    field("Thời gian chạy chiến dịch", dSel, "trên 30 ngày là ngoại suy tuyến tính");

    /* ------------------------------------------------------- ghép trang */
    var row = el("div", "sim-grid");
    row.appendChild(paramHost);
    row.appendChild(outHost);
    var right = el("div", "sim-right");
    right.appendChild(decHost);
    right.appendChild(whatHost);
    row.appendChild(right);
    f.appendChild(row);

    buildWhat();

    var sc = el("div", "");
    sc.id = "scenarios";
    sc.appendChild(sectionLead(null, "Ba cụm dưới cùng bộ tham số"));
    sc.appendChild(card({
      sub: "Vạch đứt xám trên mỗi dòng là ngưỡng hòa vốn của <strong>chính cụm đó</strong> — khác nhau vì cước trung bình mỗi cụm khác nhau.",
      body: [forestHost]
    }));
    sc.appendChild(el("div", "mb"));
    sc.appendChild(tableHost);
    f.appendChild(sc);

    paint();
    return f;
  };

  /* ======================================================================
     Trang 4 — Hiệu quả kinh tế
     ====================================================================== */
  PAGES.economics = function () {
    var ec = D.economics;
    var f = document.createDocumentFragment();
    f.appendChild(hero("Hiệu quả kinh tế", ec.lead));

    var cols = el("div", "plans");
    ec.plans.forEach(function (p) {
      var c = el("article", "plan plan-" + p.tone);
      c.appendChild(el("p", "plan-title", esc(p.title)));
      var rows = el("div", "plan-rows");
      p.rows.forEach(function (r) {
        var d = el("div", "plan-row" + (r[0] === "Tổng chi phí" ? " plan-row-sum" : ""));
        d.innerHTML = "<span>" + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b>";
        rows.appendChild(d);
      });
      c.appendChild(rows);
      var tot = el("div", "plan-total");
      tot.innerHTML =
        "<div><span>Lợi nhuận ròng</span><b>" + esc(p.profit) + "</b></div>" +
        "<div><span>ROI</span><b>" + esc(p.roi) + "</b></div>";
      c.appendChild(tot);
      c.appendChild(el("p", "plan-verdict", (p.ok ? ICON.good : ICON.bad) + esc(p.verdict)));
      cols.appendChild(c);
    });

    var wf = el("aside", "wfv");
    wf.appendChild(el("p", "wfv-title", "Cấu trúc lợi nhuận"));
    wf.appendChild(el("p", "wfv-sub", "(Phương án B)"));
    var max = Math.max.apply(null, ec.waterfall.map(function (x) { return Math.abs(x.value); }));
    ec.waterfall.forEach(function (x) {
      var row = el("div", "wfv-row");
      row.appendChild(el("p", "wfv-label", esc(x.label)));
      var line = el("div", "wfv-line");
      var bar = el("div", "wfv-bar wf-" + x.kind);
      bar.style.width = Math.max(Math.abs(x.value) / max * 100, 6) + "%";
      line.appendChild(bar);
      line.appendChild(el("span", "wfv-val", usd(Math.abs(x.value))));
      row.appendChild(line);
      wf.appendChild(row);
    });
    cols.appendChild(wf);
    f.appendChild(cols);

    f.appendChild(el("div", "mb"));
    var con = el("section", "conclusion");
    con.appendChild(el("span", "conclusion-ico", ICON.good));
    var body = el("div", "");
    body.appendChild(el("p", "why-title", "Kết luận"));
    ec.conclusion.forEach(function (t) { body.appendChild(el("p", "concl", esc(t))); });
    con.appendChild(body);
    f.appendChild(con);

    f.appendChild(el("div", "mb"));
    f.appendChild(sectionLead(null, "Giả định kinh tế"));
    f.appendChild(card({
      sub: "Ngưỡng hòa vốn = (mệnh giá voucher + chi phí vận hành) ÷ (fare trung bình × take rate).",
      body: [table(["Tham số", "Giá trị"],
        ec.assumptions.map(function (a) { return [esc(a[0]), esc(a[1])]; }),
        { num: [1] })]
    }));
    return f;
  };

  var TITLES = {
    decision: "Quyết định",
    segments: "Khách hàng mục tiêu",
    evidence: "Bằng chứng thực nghiệm",
    economics: "Hiệu quả kinh tế",
    simulate: "Mô phỏng chiến dịch"
  };
  var content = document.getElementById("content");
  var pageTitleEl = document.getElementById("pageTitle");

  function current() {
    var key = (location.hash || "#decision").slice(1).split(":")[0];
    return PAGES[key] ? key : "decision";
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
