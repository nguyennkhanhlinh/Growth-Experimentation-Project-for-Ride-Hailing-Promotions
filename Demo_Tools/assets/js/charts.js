/* ==========================================================================
   CHARTS — SVG thuần, không thư viện ngoài, chạy được khi mở file trực tiếp.
   Quy ước theo dataviz skill:
     · màu categorical gán theo thứ tự cố định, không xoay vòng
     · đầu cột bo 4px, neo vào baseline; khe 2px giữa các mảnh chồng nhau
     · nét 2px, marker ≥ 8px, lưới/trục lùi về sau
     · ≥ 2 series luôn có legend; nhãn trực tiếp dùng chọn lọc
     · mọi biểu đồ đều có lớp hover + tooltip
     · màu status luôn đi kèm icon/chữ, không bao giờ đứng một mình
   ========================================================================== */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var SERIES = ["#8b5cf6", "#ec4899", "#0891b2"];
  var SEQ = ["#075985", "#0e7490", "#0aa5c4", "#22d3ee", "#a5f3fc"];
  var STATUS = { good: "#0ce4b2", warning: "#fab219", serious: "#ec835a", critical: "#ff647c" };
  var uid = 0;

  /* ------------------------------------------------------------ theme ----
     Màu nằm trong CSS custom property, không nằm trong JS: đổi theme là đổi
     token, JS chỉ đọc lại. Giá trị hex ở trên chỉ là dự phòng khi biến trống.
     refreshPalette ghi đè TẠI CHỖ vào chính mảng đang được app.js giữ tham
     chiếu, nên không cần app.js lấy lại mảng mới.                          */
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = v ? v.trim() : "";
    return v || fallback || "";
  }
  function refreshPalette() {
    SERIES[0] = cssVar("--series-1", SERIES[0]);
    SERIES[1] = cssVar("--series-2", SERIES[1]);
    SERIES[2] = cssVar("--series-3", SERIES[2]);
    for (var i = 0; i < 5; i++) SEQ[i] = cssVar("--seq-" + (i + 1), SEQ[i]);
    STATUS.good     = cssVar("--status-good", STATUS.good);
    STATUS.warning  = cssVar("--status-warning", STATUS.warning);
    STATUS.serious  = cssVar("--status-serious", STATUS.serious);
    STATUS.critical = cssVar("--status-critical", STATUS.critical);
    UI[0] = cssVar("--ui-1", UI[0]);
    UI[1] = cssVar("--ui-2", UI[1]);
    UI[2] = cssVar("--ui-3", UI[2]);
  }

  function n(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (kids) kids.forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function svgRoot(w, h) {
    /* CSS cho svg giãn 100% chiều rộng thẻ; chặn ở 1.35x kích thước gốc để
       biểu đồ hẹp (lưới quyết định, gauge) không bị phóng to méo chữ */
    var e = n("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img", preserveAspectRatio: "xMinYMin meet" });
    e.style.maxWidth = Math.round(w * 1.35) + "px";
    return e;
  }
  function text(x, y, str, cls, anchor) {
    var t = n("text", { x: x, y: y, class: cls || "axis-text", "text-anchor": anchor || "middle" });
    t.textContent = str;
    return t;
  }
  function fmt(v, d) { return Number(v).toFixed(d === undefined ? 2 : d); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---------------------------------------------------------- tooltip ---- */
  var tipEl = null;
  function tip() { return tipEl || (tipEl = document.getElementById("tooltip")); }
  function showTip(html, evt) {
    var t = tip(); if (!t) return;
    t.innerHTML = html; t.classList.add("show");
    moveTip(evt);
  }
  function moveTip(evt) {
    var t = tip(); if (!t) return;
    var r = t.getBoundingClientRect();
    var x = evt.clientX + 14, y = evt.clientY - r.height - 12;
    if (x + r.width > window.innerWidth - 10) x = evt.clientX - r.width - 14;
    if (y < 10) y = evt.clientY + 18;
    t.style.left = x + "px"; t.style.top = y + "px";
  }
  function hideTip() { var t = tip(); if (t) t.classList.remove("show"); }

  function bindHit(hit, html, marks) {
    hit.addEventListener("mouseenter", function (e) {
      showTip(html, e);
      if (marks) marks.forEach(function (m) { m.classList.add("on"); });
      var root = hit.closest(".chart"); if (root && marks) root.classList.add("dim");
    });
    hit.addEventListener("mousemove", moveTip);
    hit.addEventListener("mouseleave", function () {
      hideTip();
      if (marks) marks.forEach(function (m) { m.classList.remove("on"); });
      var root = hit.closest(".chart"); if (root) root.classList.remove("dim");
    });
  }
  function ttRows(rows) {
    return rows.map(function (r) {
      return '<div class="tt-row">' +
        (r.color ? '<span class="tt-sw" style="background:' + r.color + '"></span>' : "") +
        '<span class="tt-key">' + esc(r.k) + '</span>' +
        '<span class="tt-val">' + esc(r.v) + '</span></div>';
    }).join("");
  }
  function ttHTML(title, rows, note) {
    return '<div class="tt-title">' + esc(title) + "</div>" + ttRows(rows) +
      (note ? '<div class="tt-note">' + esc(note) + "</div>" : "");
  }

  /* ------------------------------------------------------------ legend ---- */
  function legend(items) {
    var d = document.createElement("div");
    d.className = "legend";
    d.innerHTML = items.map(function (it) {
      return '<span class="legend-item"><span class="legend-swatch" style="background:' +
        it.color + '"></span>' + esc(it.label) + "</span>";
    }).join("");
    return d;
  }

  /* --------------------------------------------------------- niceScale ---- */
  function ticks(max, count) {
    count = count || 4;
    if (!(max > 0)) return [0, 1];
    var raw = max / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    /* mốc cuối BẮT BUỘC >= max, nếu không cột/đường sẽ tràn khỏi vùng vẽ */
    var out = [], v = 0;
    while (v < max - 1e-9) { out.push(+v.toFixed(10)); v += step; }
    out.push(+v.toFixed(10));
    return out;
  }

  /* ======================================================================
     1. Cột dọc — 1 hoặc nhiều series (nhóm cạnh nhau)
     ====================================================================== */
  function barChart(opts) {
    var cats = opts.categories, series = opts.series;
    var W = opts.width || 620, H = opts.height || 240;
    var m = { t: 14, r: 12, b: 34, l: opts.leftPad || 44 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var max = opts.max || Math.max.apply(null, series.reduce(function (a, s) { return a.concat(s.values); }, [0]));
    var tk = ticks(max), top = tk[tk.length - 1];
    var svg = svgRoot(W, H), g = n("g", {});

    tk.forEach(function (t) {
      var y = m.t + ih - (t / top) * ih;
      g.appendChild(n("line", { x1: m.l, x2: m.l + iw, y1: y, y2: y, class: t === 0 ? "axis-line" : "grid-line" }));
      g.appendChild(text(m.l - 8, y + 3.5, opts.tickFmt ? opts.tickFmt(t) : t, "axis-text tabular", "end"));
    });

    var band = iw / cats.length, gap = 2, pad = band * (opts.barPad || 0.28);
    var slotW = (band - pad * 2 - gap * (series.length - 1)) / series.length;

    cats.forEach(function (cat, i) {
      var x0 = m.l + band * i + pad, marks = [];
      var rows = series.map(function (s, si) {
        var v = s.values[i], h = Math.max((v / top) * ih, v > 0 ? 2 : 0);
        var x = x0 + si * (slotW + gap), y = m.t + ih - h;
        var color = s.color || SERIES[si % SERIES.length];
        var r = n("rect", { x: x, y: y, width: slotW, height: h, rx: Math.min(4, slotW / 2), class: "mark", fill: color });
        g.appendChild(r); marks.push(r);
        return { k: s.name, v: opts.valueFmt ? opts.valueFmt(v) : v, color: color };
      });
      g.appendChild(text(m.l + band * i + band / 2, H - 12, cat, "axis-text"));
      var hit = n("rect", { x: m.l + band * i, y: m.t, width: band, height: ih, class: "hit" });
      bindHit(hit, ttHTML(opts.catLabel ? opts.catLabel(cat, i) : cat, rows, opts.note && opts.note(i)), marks);
      g.appendChild(hit);
    });

    svg.appendChild(g);
    var wrap = document.createElement("div");
    wrap.className = "chart";
    if (series.length > 1) {
      var lg = legend(series.map(function (s, i) { return { label: s.name, color: s.color || SERIES[i % SERIES.length] }; }));
      lg.style.marginBottom = "10px";
      wrap.appendChild(lg);
    }
    wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     2. Cột chồng — mỗi mảnh cách nhau 2px
     ====================================================================== */
  function stackedBar(opts) {
    var cats = opts.categories, series = opts.series;
    var W = opts.width || 620, H = opts.height || 250;
    var m = { t: 14, r: 12, b: 36, l: 44 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var totals = cats.map(function (_, i) { return series.reduce(function (a, s) { return a + s.values[i]; }, 0); });
    var top = opts.max || Math.max.apply(null, totals);
    var tk = ticks(top); top = tk[tk.length - 1];
    var svg = svgRoot(W, H), g = n("g", {});

    tk.forEach(function (t) {
      var y = m.t + ih - (t / top) * ih;
      g.appendChild(n("line", { x1: m.l, x2: m.l + iw, y1: y, y2: y, class: t === 0 ? "axis-line" : "grid-line" }));
      g.appendChild(text(m.l - 8, y + 3.5, opts.tickFmt ? opts.tickFmt(t) : t, "axis-text tabular", "end"));
    });

    var band = iw / cats.length, bw = Math.min(band * 0.56, 46);
    cats.forEach(function (cat, i) {
      var x = m.l + band * i + (band - bw) / 2, acc = 0, marks = [], rows = [];
      series.forEach(function (s, si) {
        var v = s.values[i], h = (v / top) * ih;
        var y = m.t + ih - (acc + v) / top * ih;
        var color = s.color || SERIES[si % SERIES.length];
        var hh = Math.max(h - 2, 1); /* khe 2px giữa các mảnh */
        var r = n("rect", { x: x, y: y, width: bw, height: hh, rx: si === series.length - 1 ? 4 : 2, class: "mark", fill: color });
        g.appendChild(r); marks.push(r);
        rows.push({ k: s.name, v: opts.valueFmt ? opts.valueFmt(v) : v, color: color });
        acc += v;
      });
      g.appendChild(text(m.l + band * i + band / 2, H - 12, cat, "axis-text"));
      var hit = n("rect", { x: m.l + band * i, y: m.t, width: band, height: ih, class: "hit" });
      bindHit(hit, ttHTML(cat, rows, opts.note && opts.note(i)), marks);
      g.appendChild(hit);
    });

    svg.appendChild(g);
    var wrap = document.createElement("div"); wrap.className = "chart";
    var lg = legend(series.map(function (s, i) { return { label: s.name, color: s.color || SERIES[i % SERIES.length] }; }));
    lg.style.marginBottom = "10px";
    wrap.appendChild(lg); wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     3. Cột ngang — nhãn dài, có nhãn trực tiếp ở đầu cột
     ====================================================================== */
  function hBar(opts) {
    var rows = opts.rows;
    var W = opts.width || 560, rowH = opts.rowH || 34, labelW = opts.labelW || 150;
    var H = rows.length * rowH + 12;
    var iw = W - labelW - 74;
    var max = opts.max || Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value); }));
    var svg = svgRoot(W, H), g = n("g", {});

    rows.forEach(function (r, i) {
      var y = i * rowH + 6, h = Math.min(rowH - 14, 18);
      var w = Math.max(Math.abs(r.value) / max * iw, 2);
      var color = r.color || SERIES[0];
      g.appendChild(text(labelW - 10, y + h / 2 + 4, r.label, "label-text", "end"));
      g.appendChild(n("rect", { x: labelW, y: y, width: iw, height: h, rx: 4, fill: cssVar("--chart-track", "rgba(255,255,255,.035)") }));
      var bar = n("rect", { x: labelW, y: y, width: w, height: h, rx: 4, class: "mark", fill: color });
      g.appendChild(bar);
      g.appendChild(text(labelW + w + 9, y + h / 2 + 4, opts.valueFmt ? opts.valueFmt(r.value, r) : r.value, "label-strong", "start"));
      var hit = n("rect", { x: 0, y: y - 5, width: W, height: rowH - 2, class: "hit" });
      bindHit(hit, ttHTML(r.label, (opts.ttRows ? opts.ttRows(r) : [{ k: opts.measure || "Giá trị", v: opts.valueFmt ? opts.valueFmt(r.value, r) : r.value, color: color }]), r.note), [bar]);
      g.appendChild(hit);
    });

    svg.appendChild(g);
    var wrap = document.createElement("div"); wrap.className = "chart"; wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     4. Gauge bán nguyệt — phân bố cụm (giống mẫu dashboard)
     ====================================================================== */
  function gauge(opts) {
    var segs = opts.segments, W = opts.width || 320, H = opts.height || 210;
    var cx = W / 2, cy = H - 26, R = Math.min(W / 2 - 14, cy - 14), thick = 26;
    var total = segs.reduce(function (a, s) { return a + s.value; }, 0);
    var svg = svgRoot(W, H), g = n("g", {});

    function pt(a, r) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function arc(a0, a1, color) {
      var r0 = R - thick, r1 = R;
      var p0 = pt(a0, r1), p1 = pt(a1, r1), p2 = pt(a1, r0), p3 = pt(a0, r0);
      var large = (a1 - a0) > Math.PI ? 1 : 0;
      var d = "M" + p0[0] + "," + p0[1] + " A" + r1 + "," + r1 + " 0 " + large + " 1 " + p1[0] + "," + p1[1] +
        " L" + p2[0] + "," + p2[1] + " A" + r0 + "," + r0 + " 0 " + large + " 0 " + p3[0] + "," + p3[1] + " Z";
      return n("path", { d: d, fill: color, class: "mark" });
    }

    var start = Math.PI, sweep = Math.PI, gapA = 0.028; /* khe 2px quy đổi ra góc */
    var acc = start;
    segs.forEach(function (s, i) {
      var frac = s.value / total, a0 = acc, a1 = acc + sweep * frac - gapA;
      var color = s.color || SERIES[i % SERIES.length];
      var p = arc(a0, Math.max(a1, a0 + 0.01), color);
      g.appendChild(p);
      var mid = (a0 + a1) / 2, lp = pt(mid, R - thick / 2);
      var hit = n("path", { d: p.getAttribute("d"), class: "hit" });
      bindHit(hit, ttHTML(s.label, [
        { k: opts.measure || "Số lượng", v: s.display || s.value.toLocaleString("en-US"), color: color },
        { k: "Tỷ trọng", v: fmt(frac * 100, 2) + "%" }
      ], s.note), [p]);
      g.appendChild(hit);
      if (frac > 0.12) {
        var lb = text(lp[0], lp[1] + 4, fmt(frac * 100, 1) + "%", "label-strong");
        lb.setAttribute("fill", cssVar("--on-bright", "#04151f"));
        g.appendChild(lb);
      }
      acc = a0 + sweep * frac;
    });

    g.appendChild(text(cx, cy - 30, opts.centerLabel || "", "axis-text"));
    var big = text(cx, cy - 6, opts.centerValue || "", "label-strong");
    big.setAttribute("style", "font-size:23px;letter-spacing:-.02em");
    g.appendChild(big);

    svg.appendChild(g);
    var wrap = document.createElement("div"); wrap.className = "chart"; wrap.appendChild(svg);
    var lg = legend(segs.map(function (s, i) { return { label: s.label, color: s.color || SERIES[i % SERIES.length] }; }));
    lg.style.marginTop = "10px";
    wrap.appendChild(lg);
    return wrap;
  }

  /* ======================================================================
     5. Forest plot — điểm ước lượng + CI, có đường tham chiếu sự thật
     ====================================================================== */
  function forest(opts) {
    var rows = opts.rows, W = opts.width || 620, rowH = 40, labelW = opts.labelW || 168;
    var H = rows.length * rowH + 44;
    var pad = 78, iw = W - labelW - pad;
    /* miền trục phải chứa cả đường tham chiếu VÀ vạch ngưỡng, nếu không chúng
       bị vẽ ra ngoài vùng biểu đồ và đè lên nhãn */
    var extra = [];
    if (opts.ref !== undefined) extra.push(opts.ref);
    if (opts.threshold !== undefined) extra.push(opts.threshold);
    var lo = Math.min.apply(null, rows.map(function (r) { return r.lo; }).concat(extra));
    var hi = Math.max.apply(null, rows.map(function (r) { return r.hi; }).concat(extra));
    var span = hi - lo || 1; lo -= span * 0.10; hi += span * 0.10;
    var x = function (v) { return labelW + (v - lo) / (hi - lo) * iw; };
    var svg = svgRoot(W, H), g = n("g", {});
    var plotBottom = rows.length * rowH + 6;

    /* trục dưới */
    var tickVals = ticks(hi).filter(function (t) { return t >= lo && t <= hi; });
    if (tickVals.length < 3) tickVals = [lo, (lo + hi) / 2, hi].map(function (v) { return +v.toFixed(1); });
    tickVals.forEach(function (t) {
      g.appendChild(n("line", { x1: x(t), x2: x(t), y1: 4, y2: plotBottom, class: "grid-line" }));
      g.appendChild(text(x(t), plotBottom + 18, fmt(t, 1), "axis-text tabular"));
    });

    /* đường tham chiếu — sự thật */
    if (opts.ref !== undefined) {
      g.appendChild(n("line", { x1: x(opts.ref), x2: x(opts.ref), y1: 4, y2: plotBottom, stroke: cssVar("--chart-ref", "#a9effb"), "stroke-width": 2, "stroke-dasharray": "5 4", opacity: ".75" }));
      var rl = text(x(opts.ref), plotBottom + 34, (opts.refLabel || "sự thật") + " " + fmt(opts.ref, 4), "label-text");
      rl.setAttribute("fill", cssVar("--chart-ref", "#a9effb"));
      g.appendChild(rl);
    }
    /* ngưỡng phụ (breakeven) */
    if (opts.threshold !== undefined) {
      g.appendChild(n("line", { x1: x(opts.threshold), x2: x(opts.threshold), y1: 4, y2: plotBottom, stroke: STATUS.warning, "stroke-width": 2, "stroke-dasharray": "3 5", opacity: ".8" }));
    }

    rows.forEach(function (r, i) {
      var cy = i * rowH + rowH / 2, marks = [];
      var color = r.color || (r.main ? SERIES[0] : (r.covers === false ? STATUS.critical : SERIES[2]));
      g.appendChild(text(labelW - 12, cy + 4, r.label, r.main ? "label-strong" : "label-text", "end"));
      var line = n("line", { x1: x(r.lo), x2: x(r.hi), y1: cy, y2: cy, stroke: color, "stroke-width": 2, "stroke-linecap": "round", class: "mark" });
      g.appendChild(line); marks.push(line);
      [r.lo, r.hi].forEach(function (v) {
        g.appendChild(n("line", { x1: x(v), x2: x(v), y1: cy - 5, y2: cy + 5, stroke: color, "stroke-width": 2, "stroke-linecap": "round", class: "mark" }));
      });
      /* marker ≥ 8px, có vòng 2px màu nền để tách khỏi nét CI */
      var dot = n("circle", { cx: x(r.est), cy: cy, r: 5.5, fill: color, stroke: cssVar("--chart-halo", "#071a2a"), "stroke-width": 2, class: "mark" });
      g.appendChild(dot); marks.push(dot);
      g.appendChild(text(W - 6, cy + 4, fmt(r.est, 4), "label-strong", "end"));

      var tr = [{ k: "Ước lượng", v: fmt(r.est, 4), color: color }, { k: "95% CI", v: "[" + fmt(r.lo, 3) + ", " + fmt(r.hi, 3) + "]" }];
      if (r.gap !== undefined) tr.push({ k: "Lệch vs sự thật", v: (r.gap > 0 ? "+" : "") + fmt(r.gap, 4) });
      if (r.covers !== undefined) tr.push({ k: "Phủ sự thật", v: r.covers ? "Có" : "Không" });
      var hit = n("rect", { x: 0, y: i * rowH, width: W, height: rowH, class: "hit" });
      bindHit(hit, ttHTML(r.label + (r.sub ? " · " + r.sub : ""), tr, r.note), marks);
      g.appendChild(hit);
    });

    svg.appendChild(g);
    var wrap = document.createElement("div"); wrap.className = "chart"; wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     6. Line chart — nét 2px, marker 8px, crosshair
     ====================================================================== */
  function lineChart(opts) {
    var cats = opts.categories, series = opts.series;
    var W = opts.width || 560, H = opts.height || 230;
    var m = { t: 14, r: 16, b: 34, l: 46 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var all = series.reduce(function (a, s) { return a.concat(s.values); }, []);
    var maxV = opts.max !== undefined ? opts.max : Math.max.apply(null, all);
    var minV = opts.min !== undefined ? opts.min : 0;
    var tk = ticks(maxV - minV).map(function (t) { return t + minV; });
    var topV = tk[tk.length - 1];
    var X = function (i) { return m.l + (cats.length === 1 ? iw / 2 : (i / (cats.length - 1)) * iw); };
    var Y = function (v) { return m.t + ih - (v - minV) / (topV - minV) * ih; };
    var svg = svgRoot(W, H), g = n("g", {});

    tk.forEach(function (t) {
      g.appendChild(n("line", { x1: m.l, x2: m.l + iw, y1: Y(t), y2: Y(t), class: t === minV ? "axis-line" : "grid-line" }));
      g.appendChild(text(m.l - 8, Y(t) + 3.5, opts.tickFmt ? opts.tickFmt(t) : fmt(t, 2), "axis-text tabular", "end"));
    });
    if (opts.refLine !== undefined) {
      g.appendChild(n("line", { x1: m.l, x2: m.l + iw, y1: Y(opts.refLine), y2: Y(opts.refLine), stroke: STATUS.warning, "stroke-width": 2, "stroke-dasharray": "4 4", opacity: ".85" }));
    }

    series.forEach(function (s, si) {
      var color = s.color || SERIES[si % SERIES.length];
      var d = s.values.map(function (v, i) { return (i ? "L" : "M") + X(i) + "," + Y(v); }).join(" ");
      g.appendChild(n("path", { d: d, fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", class: "mark" }));
      s.values.forEach(function (v, i) {
        g.appendChild(n("circle", { cx: X(i), cy: Y(v), r: 4.5, fill: color, stroke: cssVar("--chart-halo", "#071a2a"), "stroke-width": 2, class: "mark" }));
      });
    });

    cats.forEach(function (c, i) {
      g.appendChild(text(X(i), H - 12, c, "axis-text"));
      var bw = iw / Math.max(cats.length - 1, 1);
      var hit = n("rect", { x: X(i) - bw / 2, y: m.t, width: bw, height: ih, class: "hit" });
      bindHit(hit, ttHTML(opts.catLabel ? opts.catLabel(c, i) : c, series.map(function (s, si) {
        return { k: s.name, v: opts.valueFmt ? opts.valueFmt(s.values[i]) : fmt(s.values[i], 3), color: s.color || SERIES[si % SERIES.length] };
      }), opts.note && opts.note(i)));
      g.appendChild(hit);
    });

    svg.appendChild(g);
    var wrap = document.createElement("div"); wrap.className = "chart";
    if (series.length > 1) {
      var lg = legend(series.map(function (s, i) { return { label: s.name, color: s.color || SERIES[i % SERIES.length] }; }));
      lg.style.marginBottom = "10px"; wrap.appendChild(lg);
    }
    wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     7. Diverging bar — z-score quanh trục 0
     ====================================================================== */
  function divergingBar(opts) {
    var groups = opts.groups;     /* [{label, values:[{name,value}]}] */
    var W = opts.width || 620, gh = opts.groupH || 68;
    var H = groups.length * gh + 30, labelW = opts.labelW || 108;
    var iw = W - labelW - 24, cx = labelW + iw / 2;
    var arm = iw / 2 - 46;   /* chừa chỗ cho nhãn số ở đầu cột */
    var max = Math.max.apply(null, groups.reduce(function (a, g0) {
      return a.concat(g0.values.map(function (v) { return Math.abs(v.value); }));
    }, [0]));
    var svg = svgRoot(W, H), g = n("g", {});

    g.appendChild(n("line", { x1: cx, x2: cx, y1: 4, y2: groups.length * gh + 4, class: "axis-line" }));
    g.appendChild(text(cx, H - 8, "z-score 0 = trung bình toàn bộ rider", "axis-text"));

    groups.forEach(function (grp, gi) {
      var y0 = gi * gh + 8;
      g.appendChild(text(labelW - 12, y0 + gh / 2 - 4, grp.label, "label-text", "end"));
      var bh = 11, gap = 3;
      var startY = y0 + (gh - (bh * grp.values.length + gap * (grp.values.length - 1))) / 2 - 6;
      grp.values.forEach(function (v, vi) {
        var color = v.color || SERIES[vi % SERIES.length];
        var w = Math.abs(v.value) / max * arm;
        var x = v.value >= 0 ? cx + 1 : cx - 1 - w;
        var y = startY + vi * (bh + gap);
        var r = n("rect", { x: x, y: y, width: Math.max(w, 2), height: bh, rx: 3.5, class: "mark", fill: color });
        g.appendChild(r);
        var lx = v.value >= 0 ? x + w + 7 : x - 7;
        g.appendChild(text(lx, y + bh - 1.5, (v.value > 0 ? "+" : "") + fmt(v.value, 2), "label-text", v.value >= 0 ? "start" : "end"));
        var hit = n("rect", { x: labelW, y: y - 1, width: iw, height: bh + 2, class: "hit" });
        bindHit(hit, ttHTML(grp.label, [{ k: v.name, v: (v.value > 0 ? "+" : "") + fmt(v.value, 2), color: color }], v.note), [r]);
        g.appendChild(hit);
      });
    });

    svg.appendChild(g);
    var wrap = document.createElement("div"); wrap.className = "chart";
    var lg = legend(groups[0].values.map(function (v, i) { return { label: v.name, color: v.color || SERIES[i % SERIES.length] }; }));
    lg.style.marginBottom = "10px";
    wrap.appendChild(lg); wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     8. Lưới quyết định — màu status LUÔN kèm chữ trong ô
     ====================================================================== */
  function decisionGrid(opts) {
    var cols = opts.cols, rows = opts.rows, cells = opts.cells;
    var cw = opts.cellW || 116, ch = 40, labelW = 76, headH = 30;
    var W = labelW + cols.length * cw + 6, H = headH + rows.length * ch + 8;
    var map = opts.colorMap;
    var svg = svgRoot(W, H), g = n("g", {});

    cols.forEach(function (c, ci) {
      g.appendChild(text(labelW + ci * cw + cw / 2, 18, c, "axis-text"));
    });
    rows.forEach(function (r, ri) {
      var y = headH + ri * ch;
      g.appendChild(text(labelW - 12, y + ch / 2 + 4, r, "label-text", "end"));
      cells[ri].forEach(function (val, ci) {
        var x = labelW + ci * cw, conf = map[val];
        var isCur = opts.current && opts.current.row === ri && opts.current.col === ci;
        /* khe 2px giữa các ô */
        var rect = n("rect", { x: x + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: 8, fill: conf.fill, stroke: isCur ? cssVar("--chart-current", "#ede9fe") : conf.stroke, "stroke-width": isCur ? 2 : 1, class: "mark" });
        g.appendChild(rect);
        var t = text(x + cw / 2, y + ch / 2 + 4, val, "label-text");
        t.setAttribute("fill", conf.text);
        t.setAttribute("font-weight", "640");
        g.appendChild(t);
        var hit = n("rect", { x: x, y: y, width: cw, height: ch, class: "hit" });
        bindHit(hit, ttHTML("Voucher " + r + " · take rate " + cols[ci],
          [{ k: "Quyết định", v: val, color: conf.text }],
          isCur ? "Đây là giả định đang dùng trong báo cáo." : null), [rect]);
        g.appendChild(hit);
      });
    });

    svg.appendChild(g);
    var wrap = document.createElement("div"); wrap.className = "chart"; wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     9. Funnel 2 chặng — làm sạch dữ liệu
     ====================================================================== */
  function funnel(opts) {
    var steps = opts.steps, W = opts.width || 560, rowH = 62;
    var H = steps.length * rowH + 6, iw = W - 92;  /* chừa 92px cho nhãn số bên phải */
    var max = steps[0].value;
    var svg = svgRoot(W, H), g = n("g", {});
    steps.forEach(function (s, i) {
      var y = i * rowH + 8, h = 30, w = s.value / max * iw;
      var color = i === 0 ? SEQ[2] : SEQ[1];
      var rect = n("rect", { x: 4, y: y, width: w, height: h, rx: 4, class: "mark", fill: color });
      g.appendChild(rect);
      var t1 = text(12, y + 19, s.label, "label-strong", "start"); t1.setAttribute("fill", cssVar("--on-bright", "#04151f"));
      g.appendChild(t1);
      g.appendChild(text(4, y + h + 17, s.note, "axis-text", "start"));
      var t2 = text(w + 12, y + 19, opts.valueFmt(s.value), "label-strong", "start");
      g.appendChild(t2);
      var hit = n("rect", { x: 0, y: y - 4, width: W, height: rowH, class: "hit" });
      bindHit(hit, ttHTML(s.label, [{ k: "Số chuyến", v: opts.valueFmt(s.value), color: color },
        { k: "So với thô", v: fmt(s.value / max * 100, 1) + "%" }], s.note), [rect]);
      g.appendChild(hit);
    });
    svg.appendChild(g);
    var wrap = document.createElement("div"); wrap.className = "chart"; wrap.appendChild(svg);
    return wrap;
  }

  /* ======================================================================
     10. Dải trang trí cho thẻ KPI — KHÔNG phải dữ liệu, chỉ là nền
     ====================================================================== */
  function kpiWash(colorA, colorB) {
    var id = "wash" + (++uid);
    var svg = svgRoot(260, 46);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.style.width = "100%"; svg.style.height = "46px";
    var defs = n("defs", {}, [
      n("linearGradient", { id: id, x1: "0", y1: "0", x2: "0", y2: "1" }, [
        n("stop", { offset: "0", "stop-color": colorA, "stop-opacity": "0" }),
        n("stop", { offset: "1", "stop-color": colorB || colorA, "stop-opacity": ".26" })
      ])
    ]);
    svg.appendChild(defs);
    svg.appendChild(n("rect", { x: 0, y: 0, width: 260, height: 46, fill: "url(#" + id + ")" }));
    return svg;
  }

  var UI = ["#0878ff", "#12d9f7", "#0ce4b2"];   /* accent cho phần chrome */

  global.Charts = {
    SERIES: SERIES, SEQ: SEQ, STATUS: STATUS, UI: UI,
    cssVar: cssVar, refreshPalette: refreshPalette,
    barChart: barChart, stackedBar: stackedBar, hBar: hBar, gauge: gauge,
    forest: forest, lineChart: lineChart, divergingBar: divergingBar,
    decisionGrid: decisionGrid, funnel: funnel, kpiWash: kpiWash,
    legend: legend, fmt: fmt
  };
})(window);
