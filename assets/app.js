/* ============================================================
   marcoesposito.at
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ──────────────────────────────────────────────────────────
     1. The gap chart
     ────────────────────────────────────────────────────────── */

  var SVG_NS = "http://www.w3.org/2000/svg";

  // capability rises convexly; 0 → 1 across the time axis
  function capability(t) {
    var k = 2.9;
    return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
  }

  // value follows, scaled and delayed by how well people are enabled
  function value(t, e) {
    var ceiling = 0.06 + 0.76 * e;        // how much of the potential is reached
    var lag = 0.34 - 0.24 * e;            // how long it takes to get going
    var tt = Math.max(0, (t - lag) / (1 - lag));
    return capability(tt) * ceiling;
  }

  function gapPercent(e) {
    return Math.round((1 - value(1, e) / capability(1)) * 100);
  }

  function path(fn, e, box) {
    var d = "";
    for (var i = 0; i <= 60; i++) {
      var t = i / 60;
      var x = box.x0 + t * (box.x1 - box.x0);
      var y = box.y1 - fn(t, e) * (box.y1 - box.y0);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d;
  }

  function el(name, attrs, text) {
    var n = document.createElementNS(SVG_NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  // gradient + diagonal hatching for the gap, ids scoped per svg
  function defs(svg, id, strong) {
    var d = el("defs", {});
    var grad = el("linearGradient", { id: id + "-g", x1: "0", y1: "0", x2: "1", y2: "0" });
    grad.appendChild(el("stop", { offset: "0", "stop-color": "#F2A541", "stop-opacity": "0" }));
    grad.appendChild(el("stop", { offset: ".55", "stop-color": "#F2A541", "stop-opacity": strong ? ".14" : ".1" }));
    grad.appendChild(el("stop", { offset: "1", "stop-color": "#F2A541", "stop-opacity": strong ? ".34" : ".26" }));
    d.appendChild(grad);

    var hatch = el("pattern", {
      id: id + "-h", width: "9", height: "9",
      patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)"
    });
    hatch.appendChild(el("line", {
      x1: "0", y1: "0", x2: "0", y2: "9",
      stroke: "#F2A541", "stroke-width": "1.1", "stroke-opacity": strong ? ".32" : ".22"
    }));
    d.appendChild(hatch);

    var mask = el("linearGradient", { id: id + "-m", x1: "0", y1: "0", x2: "1", y2: "0" });
    mask.appendChild(el("stop", { offset: "0", "stop-color": "#fff", "stop-opacity": "0" }));
    mask.appendChild(el("stop", { offset: ".5", "stop-color": "#fff", "stop-opacity": ".5" }));
    mask.appendChild(el("stop", { offset: "1", "stop-color": "#fff", "stop-opacity": "1" }));
    d.appendChild(mask);
    var m = el("mask", { id: id + "-mk", maskContentUnits: "objectBoundingBox" });
    m.appendChild(el("rect", { x: "0", y: "0", width: "1", height: "1", fill: "url(#" + id + "-m)" }));
    d.appendChild(m);

    svg.appendChild(d);
  }

  function drawChart(svg, e, opts) {
    opts = opts || {};
    var bg = opts.mode === "bg";
    var vb = svg.getAttribute("viewBox").split(" ").map(Number);
    var W = vb[2], H = vb[3];
    var compact = opts.compact;
    var box = bg
      ? { x0: -40, x1: W - 64, y0: H * 0.13, y1: H - 26 }
      : compact
        ? { x0: 30, x1: W - 16, y0: 52, y1: H - 44 }
        : { x0: 58, x1: W - 176, y0: 44, y1: H - 58 };

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    defs(svg, svg.id, bg);

    if (!bg) {
      /* grid */
      for (var g = 0; g <= 3; g++) {
        var gy = box.y0 + (g / 3) * (box.y1 - box.y0);
        svg.appendChild(el("line", { x1: box.x0, y1: gy, x2: box.x1, y2: gy, class: "gc-grid" }));
      }

      /* axes */
      svg.appendChild(el("line", { x1: box.x0, y1: box.y1, x2: box.x1 + 34, y2: box.y1, class: "gc-axis" }));
      svg.appendChild(el("line", { x1: box.x0, y1: box.y0 - 14, x2: box.x0, y2: box.y1, class: "gc-axis" }));

      /* x ticks */
      var years = ["2022", "2024", "2026", "2028"];
      years.forEach(function (yr, i) {
        var x = box.x0 + (i / (years.length - 1)) * (box.x1 - box.x0);
        svg.appendChild(el("text", {
          x: x, y: box.y1 + 26, class: "gc-t", "text-anchor": i === 0 ? "start" : "middle"
        }, yr));
      });

      /* y label */
      svg.appendChild(el("text", { x: box.x0, y: box.y0 - 24, class: "gc-t" }, opts.yLabel || ""));
    }

    var dA = path(function (t) { return capability(t); }, e, box);
    var dB = path(value, e, box);

    /* the gap itself: curve A forwards, curve B backwards, closed */
    var back = "";
    for (var i = 60; i >= 0; i--) {
      var t = i / 60;
      var bxp = box.x0 + t * (box.x1 - box.x0);
      var byp = box.y1 - value(t, e) * (box.y1 - box.y0);
      back += "L" + bxp.toFixed(1) + " " + byp.toFixed(1);
    }
    var area = dA + back + " Z";
    var fill = el("g", { class: "gc-gap" });
    fill.appendChild(el("path", { d: area, fill: "url(#" + svg.id + "-g)" }));
    fill.appendChild(el("path", { d: area, fill: "url(#" + svg.id + "-h)", mask: "url(#" + svg.id + "-mk)" }));
    svg.appendChild(fill);

    /* curves */
    var lineB = el("path", { d: dB, class: "gc-line gc-line--b" });
    var lineA = el("path", { d: dA, class: "gc-line gc-line--a" });
    svg.appendChild(lineB);
    svg.appendChild(lineA);

    /* end points */
    var yA = box.y1 - capability(1) * (box.y1 - box.y0);
    var yB = box.y1 - value(1, e) * (box.y1 - box.y0);

    if (bg) {
      svg.appendChild(el("circle", { cx: box.x1, cy: yA, r: 14, class: "gc-halo gc-halo--a" }));
      svg.appendChild(el("circle", { cx: box.x1, cy: yB, r: 14, class: "gc-halo gc-halo--b" }));
    }
    svg.appendChild(el("circle", { cx: box.x1, cy: yA, r: bg ? 6 : 5.5, class: "gc-dot gc-dot--a" }));
    svg.appendChild(el("circle", { cx: box.x1, cy: yB, r: bg ? 6 : 5.5, class: "gc-dot gc-dot--b" }));

    var labels = el("g", { class: "gc-labels" });
    if (compact) {
      // labels inside the plot, left of the end points
      labels.appendChild(el("text", { x: box.x1 - 12, y: yA - 14, class: "gc-t gc-t--lead", "text-anchor": "end" }, opts.labelA));
      labels.appendChild(el("text", { x: box.x1 - 12, y: Math.max(yB + 24, yA + 22), class: "gc-t gc-t--lead", "text-anchor": "end" }, opts.labelB));
    } else if (bg) {
      labels.appendChild(el("text", { x: box.x1 - 18, y: yA - 18, class: "gc-t gc-t--lead", "text-anchor": "end" }, opts.labelA));
      labels.appendChild(el("text", { x: box.x1 - 18, y: yB + 30, class: "gc-t gc-t--lead", "text-anchor": "end" }, opts.labelB));
      /* rotated gap label along the right edge */
      var midY = (yA + yB) / 2;
      labels.appendChild(el("path", {
        d: "M" + (box.x1 + 30) + " " + (yA + 16) + " L" + (box.x1 + 30) + " " + (yB - 16),
        class: "gc-brace"
      }));
      labels.appendChild(el("text", {
        x: box.x1 + 46, y: midY, class: "gc-t gc-t--gap", "text-anchor": "middle",
        transform: "rotate(90 " + (box.x1 + 46) + " " + midY + ")"
      }, "ADAPTATION GAP"));
    } else {
      // keep the two end labels at least 22 units apart
      var mid = (yA + yB) / 2;
      var tA = Math.min(yA + 4, mid - 7);
      var tB = Math.max(yB + 4, mid + 15);
      labels.appendChild(el("text", { x: box.x1 + 16, y: tA, class: "gc-t gc-t--lead" }, opts.labelA));
      labels.appendChild(el("text", { x: box.x1 + 16, y: tB, class: "gc-t gc-t--lead" }, opts.labelB));
      var bx = box.x1 + 2;
      if (yB - yA > 56) {
        labels.appendChild(el("path", { d: "M" + bx + " " + (yA + 10) + " L" + bx + " " + (yB - 10), class: "gc-brace" }));
        labels.appendChild(el("text", {
          x: bx - 12, y: (yA + yB) / 2 + 4, class: "gc-t gc-t--amber", "text-anchor": "end"
        }, opts.gapLabel));
      }
    }
    svg.appendChild(labels);

    return { lineA: lineA, lineB: lineB, fill: fill, labels: labels };
  }

  /* ──────────────────────────────────────────────────────────
     2. Copy (both languages)
     ────────────────────────────────────────────────────────── */

  var COPY = {
    de: {
      labelA: "Was KI kann",
      labelB: "Nutzen",
      labelBLong: "Was Organisationen daraus machen",
      gapLabel: "Lücke",
      yLabel: "Fähigkeit / Nutzen →",
      notes: [
        "Die Werkzeuge sind da. Die Nutzung bleibt an der Oberfläche — Texte, Bilder, ein paar Routineaufgaben.",
        "Erste Schulungen laufen. Das Wissen bleibt bei einzelnen Personen und strahlt nicht ins Team aus.",
        "Die Formate greifen. Was noch fehlt, sind die Rahmenbedingungen: klare Regeln, Zugang, Zeit zum Üben.",
        "Kompetenz und Rahmenbedingungen greifen ineinander. Die Lücke schließt sich — ganz verschwindet sie nie."
      ]
    },
    en: {
      labelA: "What AI can do",
      labelB: "Value",
      labelBLong: "What organizations get out of it",
      gapLabel: "Gap",
      yLabel: "Capability / value →",
      notes: [
        "The tools are there. Use stays on the surface — text, images, a few routine tasks.",
        "First training sessions run. The knowledge stays with individuals and does not spread across the team.",
        "The formats work. What is still missing are the conditions: clear rules, access, time to practise.",
        "Competence and conditions reinforce each other. The gap narrows — it never closes completely."
      ]
    }
  };

  function noteFor(e, lang) {
    var n = COPY[lang].notes;
    if (e < 0.22) return n[0];
    if (e < 0.48) return n[1];
    if (e < 0.74) return n[2];
    return n[3];
  }

  /* ──────────────────────────────────────────────────────────
     3. Language
     ────────────────────────────────────────────────────────── */

  var lang = (function () {
    try { return localStorage.getItem("me-lang") || "de"; } catch (err) { return "de"; }
  })();

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;

    document.querySelectorAll("[data-en]").forEach(function (node) {
      if (node.dataset.de === undefined) node.dataset.de = node.innerHTML;
      node.innerHTML = next === "en" ? node.dataset.en : node.dataset.de;
    });

    var opts = document.querySelectorAll(".lang__o");
    if (opts.length === 2) {
      opts[0].classList.toggle("lang__o--on", next === "de");
      opts[1].classList.toggle("lang__o--on", next === "en");
    }

    try { localStorage.setItem("me-lang", next); } catch (err) { /* private mode */ }

    renderCharts();
  }

  /* ──────────────────────────────────────────────────────────
     4. Charts on the page
     ────────────────────────────────────────────────────────── */

  var heroSvg = document.getElementById("heroChart");
  var labSvg = document.getElementById("labChart");
  var range = document.getElementById("enable");
  var gapVal = document.getElementById("gapVal");
  var labNote = document.getElementById("labNote");

  function chartOpts() {
    return {
      labelA: COPY[lang].labelA,
      labelB: COPY[lang].labelB,
      gapLabel: COPY[lang].gapLabel,
      yLabel: COPY[lang].yLabel
    };
  }

  function renderLab() {
    if (!range || !labSvg) return;
    var e = Number(range.value) / 100;
    var o = chartOpts();
    o.compact = labSvg.parentNode.clientWidth < 520;
    labSvg.setAttribute("viewBox", o.compact ? "0 0 360 300" : "0 0 760 440");
    drawChart(labSvg, e, o);
    range.style.setProperty("--p", range.value + "%");
    if (gapVal) gapVal.textContent = gapPercent(e);
    if (labNote) labNote.textContent = noteFor(e, lang);
  }

  function renderHero() {
    if (!heroSvg) return;
    var o = chartOpts();
    o.mode = "bg";
    o.labelB = COPY[lang].labelBLong;
    var parts = drawChart(heroSvg, 0.14, o);
    if (reduced || heroSvg.dataset.drawn === "1") return;
    heroSvg.dataset.drawn = "1";

    [parts.lineA, parts.lineB].forEach(function (p, i) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.getBoundingClientRect(); // commit the start state
      p.style.transition = "stroke-dashoffset 2.2s cubic-bezier(.65,0,.35,1) " + (0.25 + i * 0.25) + "s";
      p.style.strokeDashoffset = "0";
    });
    [parts.fill, parts.labels].forEach(function (g, i) {
      g.style.opacity = "0";
      g.getBoundingClientRect();
      g.style.transition = "opacity 1.2s ease " + (1.7 + i * 0.35) + "s";
      g.style.opacity = "1";
    });
    heroSvg.querySelectorAll(".gc-dot, .gc-halo").forEach(function (c) {
      c.style.opacity = "0";
      c.getBoundingClientRect();
      c.style.transition = "opacity .6s ease 2.4s";
      c.style.opacity = "";
    });
  }

  function renderCharts() { renderHero(); renderLab(); }

  if (range) {
    range.addEventListener("input", renderLab);
  }

  /* ──────────────────────────────────────────────────────────
     5. Reveal on scroll + counters
     ────────────────────────────────────────────────────────── */

  document.querySelectorAll(".reveal").forEach(function (node) {
    if (node.dataset.delay) node.style.setProperty("--d", node.dataset.delay);
  });

  function countUp(node) {
    var target = Number(node.dataset.count);
    var suffix = node.dataset.suffix || "";
    if (reduced) { node.textContent = target + suffix; return; }
    var start = performance.now(), dur = 1100;
    (function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  function reveal(node) {
    if (node.classList.contains("is-in")) return;
    node.classList.add("is-in");
    node.querySelectorAll("[data-count]").forEach(function (n) {
      if (!n.dataset.done) { n.dataset.done = "1"; countUp(n); }
    });
  }

  // the hero never waits for an observer
  setTimeout(function () {
    document.querySelectorAll(".hero .reveal").forEach(reveal);
  }, 40);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    document.querySelectorAll(".reveal").forEach(function (n) { io.observe(n); });

    // safety net for renderers that never run the observer (crawlers, previews)
    setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-in)").forEach(function (n) {
        if (n.getBoundingClientRect().top < window.innerHeight) reveal(n);
      });
    }, 1800);
  } else {
    document.querySelectorAll(".reveal").forEach(reveal);
  }

  /* ──────────────────────────────────────────────────────────
     6. Chrome
     ────────────────────────────────────────────────────────── */

  var nav = document.getElementById("nav");
  function onScroll() {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var langBtn = document.getElementById("lang");
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      applyLang(lang === "de" ? "en" : "de");
    });
  }

  var revealInj = document.getElementById("revealInj");
  var inj = document.getElementById("inj");
  if (revealInj && inj) {
    revealInj.addEventListener("click", function () {
      var open = !inj.hidden;
      inj.hidden = open;
      revealInj.setAttribute("aria-expanded", String(!open));
      if (!open) inj.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    });
    revealInj.setAttribute("aria-expanded", "false");
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* style switcher for reviewing — only away from the live domain */
  if (!/(^|\.)marcoesposito\.at$/.test(location.hostname)) {
    var STYLES = [["roboto", "Roboto"], ["editorial", "Editorial"]];
    var pick = document.createElement("div");
    pick.className = "stylepick";
    pick.setAttribute("role", "group");
    pick.setAttribute("aria-label", "Design-Stil");
    pick.innerHTML = '<span class="stylepick__l">Stil</span>' + STYLES.map(function (s) {
      return '<button type="button" data-style="' + s[0] + '">' + s[1] + "</button>";
    }).join("");
    var mark = function () {
      var cur = document.documentElement.dataset.style || "roboto";
      pick.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.style === cur));
      });
    };
    pick.addEventListener("click", function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      document.documentElement.dataset.style = b.dataset.style;
      try { localStorage.setItem("me-style", b.dataset.style); } catch (err) { /* private mode */ }
      mark();
    });
    mark();
    document.body.appendChild(pick);
  }

  /* filmstrip: duplicate the items once so the marquee loops seamlessly */
  var strip = document.getElementById("stripTrack");
  if (strip && !reduced) {
    Array.prototype.slice.call(strip.children).forEach(function (li) {
      var c = li.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      c.querySelector("img").alt = "";
      strip.appendChild(c);
    });
    strip.style.setProperty("--dur", (strip.children.length * 4.2) + "s");
  }

  /* newsletter: swap in the daily-refreshed feed if it differs from the static fallback */
  var issues = document.getElementById("issues");
  if (issues && window.fetch) {
    fetch("assets/newsletter.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) {
        if (!list || !list.length) return;
        var current = Array.prototype.map.call(issues.querySelectorAll("a"), function (a) { return a.href; }).join("|");
        if (list.map(function (i) { return i.url; }).join("|") === current) return;

        var esc = function (s) {
          return String(s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
          });
        };
        // titles come with mixed quote styles; drop the outer ones
        var unquote = function (s) { return String(s).trim().replace(/^["„“”«»']+|["„“”«»']+$/g, ""); };
        var shorten = function (s) {
          s = String(s).trim();
          var cut = s.search(/[.!?](\s|$)/);
          return cut > 30 && cut < s.length - 1 ? s.slice(0, cut + 1) : s;
        };
        var fmt = function (d) { var p = d.split("-"); return p[2] + "." + p[1] + "." + p[0]; };

        issues.innerHTML = list.slice(0, 3).map(function (i) {
          return '<li class="issue"><a href="' + esc(i.url) + '" target="_blank" rel="noopener">' +
            '<time datetime="' + esc(i.date) + '">' + esc(fmt(i.date)) + "</time>" +
            '<span class="issue__t">' + esc(unquote(i.title)) + "</span>" +
            (i.subtitle ? '<span class="issue__s">' + esc(shorten(i.subtitle)) + "</span>" : "") +
            "</a></li>";
        }).join("");
      })
      .catch(function () { /* keep the static fallback */ });
  }

  /* ── go ── */
  applyLang(lang);

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderCharts, 160);
  });

  /* a nod to anyone who opens the console */
  try {
    console.log(
      "%cMarco Esposito%c\nAI Literacy & AI Enablement\n\nDiese Seite enthält eine absichtliche, harmlose Prompt Injection.\nSie ist ein Lehrmittel — siehe den Abschnitt „Hallo, Agent.“\n\nhi@visavi.at",
      "font-size:20px;font-weight:600;color:#3DAEE1",
      "font-size:12px;color:#9DB4BF"
    );
  } catch (err) { /* no console */ }

})();
