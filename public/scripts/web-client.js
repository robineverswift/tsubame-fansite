(function () {
    "use strict";
    var $ = function (id) { return document.getElementById(id); };
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    /* ---------- YouTube HD Thumbnail Fallback ---------- */
    document.querySelectorAll("img[data-vid]").forEach(function (img) {
      var vid = img.getAttribute("data-vid");
      var fallbacks = ["sddefault.jpg", "hqdefault.jpg"];
      var idx = 0;
      function next() { if (idx < fallbacks.length) img.src = "https://i.ytimg.com/vi/" + vid + "/" + fallbacks[idx++]; }
      img.addEventListener("error", next);
      img.addEventListener("load", function () { if (img.naturalWidth <= 120) next(); });
    });

    /* ---------- Splash + v2.9.4 Polite Approach B Sound Choice ---------- */
    (function () {
      var sp = $("splash");
      if (!sp) return;
      var bar = $("splash-bar");
      var gate = $("splash-sound-gate");
      var btnOn = $("splash-sound-on");
      var btnOff = $("splash-sound-off");
      var SOUND_KEY = "tsubame-sound-pref";
      var prevPref = null;
      try { prevPref = sessionStorage.getItem(SOUND_KEY); } catch (_) {}

      var isSubViewHash = window.location.hash.indexOf("#archive") === 0 ||
        window.location.hash.indexOf("#history") === 0 ||
        window.location.hash.indexOf("#about") === 0 ||
        window.location.hash.indexOf("#owner") === 0;
      var skipGate = reduced || isSubViewHash || prevPref === "on" || prevPref === "off" || !gate;

      if (skipGate) {
        if (reduced || isSubViewHash) {
          sp.classList.add("done");
        } else {
          setTimeout(function () { sp.classList.add("done"); }, 680);
        }
        return;
      }

      // First visit this session: finish progress bar, then politely present Sound ON / OFF
      sp.setAttribute("aria-hidden", "false");
      setTimeout(function () {
        if (bar) bar.classList.add("is-faded");
        setTimeout(function () {
          if (bar) bar.style.display = "none";
          gate.hidden = false;
        }, 260);
      }, 680);

      function enterSite(withSound) {
        try { sessionStorage.setItem(SOUND_KEY, withSound ? "on" : "off"); } catch (_) {}
        if (withSound) {
          if (typeof window.playTsubameSe === "function") window.playTsubameSe("pop");
          var fab = $("bgm-fab-btn");
          if (fab && fab.getAttribute("aria-pressed") !== "true") {
            fab.click();
          }
        }
        sp.setAttribute("aria-hidden", "true");
        sp.classList.add("done");
      }

      if (btnOn) btnOn.addEventListener("click", function () { enterSite(true); });
      if (btnOff) btnOff.addEventListener("click", function () { enterSite(false); });
    })();

    /* ---------- Compact Globe Language Popover ---------- */
    var langBtn = $("lang-btn"), langMenu = $("lang-menu");
    var I18N_UI = {
      ja: { qPlaceholder: "タイトル・サークル・RJ番号・タグ…", allYears: "すべての年", allCircles: "すべてのサークル", sorts: { new: "新しい順", old: "古い順", rate: "評価が高い順", sales: "販売数が多い順", cheap: "価格が安い順", exp: "価格が高い順" } },
      cn: { qPlaceholder: "搜索作品名、社团、RJ号、标签…", allYears: "全部年份", allCircles: "全部社团", sorts: { new: "最新发售优先", old: "最早发售优先", rate: "评分最高优先", sales: "销量最高优先", cheap: "价格最低优先", exp: "价格最高优先" } },
      en: { qPlaceholder: "Search title, circle, RJ code, tag…", allYears: "All Years", allCircles: "All Circles", sorts: { new: "Newest First", old: "Oldest First", rate: "Highest Rated", sales: "Most Sold", cheap: "Lowest Price", exp: "Highest Price" } }
    };
    var currentLang = "ja";
    function applyLangUI(lang, animate) {
      currentLang = lang;
      var shell = document.querySelector(".page-shell");
      if (animate && shell && !reduced) {
        shell.classList.add("lang-switching");
        setTimeout(function () { shell.classList.remove("lang-switching"); }, 140);
      }
      document.body.setAttribute("data-lang", lang);
      try { localStorage.setItem("fansite-lang", lang); } catch (e) {}
      var pack = I18N_UI[lang] || I18N_UI.ja;
      if ($("f-q")) $("f-q").placeholder = pack.qPlaceholder;
      if ($("f-sort")) {
        Array.prototype.forEach.call($("f-sort").options, function (opt) {
          if (pack.sorts[opt.value]) opt.textContent = pack.sorts[opt.value];
        });
      }
      if (WORKS) buildFilterOptions();
      if (typeof window.syncArchiveSelects === "function") window.syncArchiveSelects();
      if (typeof window.refreshEraShowcase === "function") window.refreshEraShowcase();
      if (typeof window.refreshOtdLang === "function") window.refreshOtdLang();
      if (WORKS && typeof render === "function") render();
      if (typeof window.refreshNewsFlow === "function") window.refreshNewsFlow();
      if (typeof window.refreshAnnex === "function") window.refreshAnnex();
      if (typeof window.refreshEraShowcase === "function") window.refreshEraShowcase();
    }
    langBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !langMenu.hidden;
      langMenu.hidden = open;
      langBtn.setAttribute("aria-expanded", open ? "false" : "true");
    });
    document.querySelectorAll("[data-lang-opt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-lang-opt");
        document.querySelectorAll("[data-lang-opt]").forEach(function (b) { b.setAttribute("aria-checked", b === btn ? "true" : "false"); });
        langMenu.hidden = true;
        langBtn.setAttribute("aria-expanded", "false");
        applyLangUI(lang, true);
      });
    });
    (function restoreLang() {
      var saved = null;
      try { saved = localStorage.getItem("fansite-lang"); } catch (e) {}
      if (saved && saved !== "ja" && I18N_UI[saved]) {
        document.querySelectorAll("[data-lang-opt]").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-lang-opt") === saved ? "true" : "false"); });
        applyLangUI(saved);
      }
    })();
    document.addEventListener("click", function (e) {
      if (!langMenu.hidden && !langMenu.contains(e.target) && e.target !== langBtn) {
        langMenu.hidden = true;
        langBtn.setAttribute("aria-expanded", "false");
      }
    });

    /* ---------- Dual-Theme Controller (Yuzu default <-> Coral, synced via bird click + localStorage) ---------- */
    var THEME_KEY = "site_theme";
    var THEMES = ["yuzu", "coral"];
    var THEME_META = { yuzu: "#E08D03", coral: "#E8536B" };
    var THEME_BIRDS = {
      yuzu: "/assets/brand/noto-bird-theme-yuzu.webp",
      coral: "/assets/brand/noto-bird-theme-coral.webp"
    };
    var THEME_NOTE_COLORS = { yuzu: "#e08d03", coral: "#ef6688" };
    var isThemeTransitioning = false;
    var lastThemeSwitchAt = 0;
    var pendingSiteTheme = null;
    function nextThemeOf(t) {
      var idx = THEMES.indexOf(t);
      return THEMES[((idx >= 0 ? idx : 0) + 1) % THEMES.length];
    }
    function getSiteTheme() {
      var t = document.documentElement.dataset.theme;
      return THEMES.indexOf(t) >= 0 ? t : "yuzu";
    }
    function applySiteTheme(th, persist) {
      pendingSiteTheme = null;
      var next = THEMES.indexOf(th) >= 0 ? th : "yuzu";
      document.documentElement.dataset.theme = next;
      if (persist) {
        try {
          localStorage.setItem(THEME_KEY, next);
          localStorage.setItem("site_theme_v1", "1");
        } catch (_) {}
      }
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", THEME_META[next]);
      var btnBird = $("swallow-btn-bird");
      if (btnBird) btnBird.setAttribute("src", THEME_BIRDS[nextThemeOf(next)]);
    }
    function toggleSiteThemeWithRipple(ev, el) {
      var now = Date.now();
      if (isThemeTransitioning || now - lastThemeSwitchAt < 720) return false;
      lastThemeSwitchAt = now;
      var next = nextThemeOf(getSiteTheme());
      pendingSiteTheme = next;
      if (reduced || typeof document.startViewTransition !== "function") {
        applySiteTheme(next, true);
        return true;
      }
      var rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      var cx = (ev && typeof ev.clientX === "number" && ev.clientX > 0) ? ev.clientX : (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
      var cy = (ev && typeof ev.clientY === "number" && ev.clientY > 0) ? ev.clientY : (rect ? rect.top + rect.height / 2 : 90);
      var endR = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
      isThemeTransitioning = true;
      var safetyTimer = setTimeout(function () { isThemeTransitioning = false; pendingSiteTheme = null; }, 900);
      var vt = document.startViewTransition(function () { applySiteTheme(next, true); });
      vt.ready.then(function () {
        document.documentElement.animate(
          { clipPath: ["circle(0px at " + cx + "px " + cy + "px)", "circle(" + endR + "px at " + cx + "px " + cy + "px)"] },
          { duration: 640, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(function () {});
      vt.finished.finally(function () { clearTimeout(safetyTimer); isThemeTransitioning = false; pendingSiteTheme = null; });
      return true;
    }
    applySiteTheme(getSiteTheme(), false);
    window.addEventListener("storage", function (ev) {
      if (ev.key === THEME_KEY) {
        applySiteTheme(ev.newValue === "coral" ? "coral" : "yuzu", false);
      }
    });

    /* ---------- Faithful Fluent-3D 🐦💨 Theme-Matched Songbird Flight (Right -> Left) ---------- */
    function launchSwallow(ev) {
      if (reduced) return;
      if (document.querySelectorAll(".flying-swallow").length >= 6) return;
      var startY = ev && ev.clientY ? Math.max(84, Math.min(window.innerHeight - 120, ev.clientY)) : window.innerHeight * 0.30;
      var bird = document.createElement("div");
      bird.className = "flying-swallow";
      bird.style.left = (window.innerWidth + 20) + "px";
      bird.style.top = startY + "px";
      var activeTheme = pendingSiteTheme || getSiteTheme();
      var uid = "b" + Math.random().toString(36).slice(2, 7);
      var NOTO_PUFF = "/assets/brand/noto-puff-fb0b3b19.webp";
      var birdSrc = THEME_BIRDS[activeTheme] || THEME_BIRDS.yuzu;
      bird.innerHTML = '<img src="' + birdSrc + '" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 6px 12px rgba(56,34,40,0.16));">';
      document.body.appendChild(bird);

      var wing = bird.querySelector("#fb-wing-el");
      var beak = bird.querySelector("#fb-beak-el");
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var startX = vw + 20;
      var hoverX = vw <= 560
        ? Math.max(190, vw * 0.72)
        : Math.max(240, Math.min(vw * 0.64, vw - 140)) + Math.round((Math.random() - 0.5) * 44);
      var hoverYOffset = Math.max(88 - startY, Math.min(180 - startY, (Math.random() - 0.5) * 32));
      var endX = -110;
      var t0 = null, lastPuff = 0;
      var T_IN = 560, T_HOLD = 1480, T_OUT = 680;
      var T_TOTAL = T_IN + T_HOLD + T_OUT;
      var speechText = (typeof ev === "object" && ev && ev._cheerText) ? ev._cheerText : null;
      var bubbleEl = null, bubbleShown = false, bubbleHidden = false;

      function spawnPuff(px, py) {
        var pf = document.createElement("span");
        pf.className = "puff-cloud-rtl";
        pf.style.left = px + "px";
        pf.style.top = py + "px";
        pf.style.setProperty("--py", Math.round((Math.random() - 0.5) * 14) + "px");
        pf.innerHTML = '<img src="' + NOTO_PUFF + '" alt="" width="40" height="40" style="display:block;width:40px;height:40px;object-fit:contain;">';
        document.body.appendChild(pf);
        setTimeout(function () { pf.remove(); }, 950);
      }

      function step(ts) {
        if (!t0) t0 = ts;
        var el = ts - t0;
        var curX = startX, dy = 0, tilt = 0, flapFreq = 16;

        if (el < T_IN) {
          // Beat 1: Fly in from right and brake smoothly into hover spot
          var p1 = el / T_IN;
          var easeOut = 1 - Math.pow(1 - p1, 3);
          curX = startX + (hoverX - startX) * easeOut;
          dy = hoverYOffset * easeOut + Math.sin(p1 * Math.PI) * -14;
          tilt = -8 * (1 - p1);
          if (ts - lastPuff > 130 && p1 < 0.85) {
            lastPuff = ts;
            spawnPuff(curX + 54, startY + dy + 18);
          }
        } else if (el < T_IN + T_HOLD) {
          // Beat 2: Gentle mid-air hover while speaking (speech bubble stays 100% still!)
          var p2 = (el - T_IN) / T_HOLD;
          curX = hoverX;
          dy = hoverYOffset + Math.sin(p2 * Math.PI * 5) * 4.5;
          tilt = Math.sin(p2 * Math.PI * 2.5) * 3.5;
          flapFreq = 22;

          if (!bubbleShown && speechText) {
            bubbleShown = true;
            bubbleEl = document.createElement("div");
            bubbleEl.className = "bird-speech-bubble";
            bubbleEl.textContent = speechText;
            var bx = Math.max(150, Math.min(vw - 16, hoverX + 4));
            var by = Math.max(58, startY + hoverYOffset + 12);
            bubbleEl.style.left = bx + "px";
            bubbleEl.style.top = by + "px";
            document.body.appendChild(bubbleEl);
            requestAnimationFrame(function () {
              if (bubbleEl) bubbleEl.classList.add("show");
            });
          }
          if (beak) {
            var chirping = (p2 < 0.16) || (p2 > 0.24 && p2 < 0.36);
            beak.setAttribute("transform", chirping ? "translate(14,28.8) scale(1.18,1.35) translate(-14,-28.8)" : "");
          }
          if (!bubbleHidden && p2 > 0.86 && bubbleEl) {
            bubbleHidden = true;
            bubbleEl.classList.remove("show");
            bubbleEl.classList.add("hide");
          }
        } else {
          // Beat 3: Puff clouds and zoom away to the left
          var p3 = Math.min((el - T_IN - T_HOLD) / T_OUT, 1);
          var easeIn = p3 * p3 * (2.2 - 1.2 * p3);
          curX = hoverX + (endX - hoverX) * easeIn;
          dy = hoverYOffset - p3 * 22 + Math.sin(p3 * Math.PI * 2) * 10;
          tilt = -10 * p3;
          if (beak) beak.setAttribute("transform", "");
          if (ts - lastPuff > 95 && p3 < 0.88) {
            lastPuff = ts;
            spawnPuff(curX + 54, startY + dy + 18);
          }
        }

        var dx = curX - startX;
        var flap = Math.sin((el / 1000) * Math.PI * (flapFreq * 0.65));
        if (wing) {
          wing.setAttribute("transform", "translate(32,34) rotate(" + (flap * 24).toFixed(1) + ") translate(-32,-34)");
        }
        bird.style.transform = "translate3d(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px, 0) rotate(" + tilt.toFixed(1) + "deg)";

        if (el < T_TOTAL) requestAnimationFrame(step);
        else {
          bird.remove();
          if (bubbleEl) bubbleEl.remove();
        }
      }
      requestAnimationFrame(step);
    }
    var SWALLOW_CHEERS = [
      "ちゅんぴー！",
      "10年間ありがとう！",
      "今日もお疲れさま！",
      "ゆっくり休んでね",
      "ずっと聴いてるよ！"
    ];
    var swallowCheerIdx = 0;
    function launchSwallowWithBubble(ev) {
      var didSwitch = toggleSiteThemeWithRipple(ev, $("swallow-btn"));
      var msg = SWALLOW_CHEERS[swallowCheerIdx++ % SWALLOW_CHEERS.length];
      launchSwallow({ _cheerText: msg, _themeSwitch: didSwitch, clientX: ev && ev.clientX, clientY: ev && ev.clientY });
    }
    $("swallow-btn").addEventListener("click", launchSwallowWithBubble);
    // Hero #swallow-btn launches theme-matched swallows & toggles site palette (Apricot <-> Coral)


    /* ---------- CENTERPIECE #1 (v1.2.1 Direction B): Centered Fan-Note Pill + Corner Floating Mini Yuzu Disc ---------- */
    (function () {

      var wrap = $("nav-bgm-wrap"), fabBtn = $("bgm-fab-btn"), fabLab = $("bgm-fab-label");

      var REAL_BGM = [
        { src: "./audio/bgm-1.mp3", title: "ある春の日に…(One spring day...)", composer: "蒲鉾さちこ (OpenTracks)" },
        { src: "./audio/bgm-2.mp3", title: "静かな海鳴り", composer: "蒲鉾さちこ (OpenTracks)" }
      ];
      var trackIdx = 0;
      var playing = false, playCount = 0;
      var realAudio = null;
      var fadeRaf = null;

      function cancelFade() {
        if (fadeRaf) { cancelAnimationFrame(fadeRaf); fadeRaf = null; }
      }
      function fadeHtmlAudio(el, targetVol, ms, onDone) {
        cancelFade();
        var startVol = el.volume;
        var t0 = performance.now();
        function step(now) {
          var p = Math.min(1, (now - t0) / ms);
          el.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * p));
          if (p < 1) fadeRaf = requestAnimationFrame(step);
          else { fadeRaf = null; if (onDone) onDone(); }
        }
        fadeRaf = requestAnimationFrame(step);
      }

      function syncUI() {
        var rt = REAL_BGM[trackIdx % REAL_BGM.length];
        if (fabLab) fabLab.textContent = playing ? rt.title : "BGM";
        if (fabBtn) {
          fabBtn.setAttribute("aria-pressed", playing ? "true" : "false");
          if (playing) fabBtn.title = "♪ " + rt.title + " — " + rt.composer;
        }
        if (wrap) wrap.classList.toggle("playing", playing);
      }

      function startPlay() {
        if (playCount > 0) {
          trackIdx = (trackIdx + 1) % REAL_BGM.length;
        }
        playCount++;
        playing = true;
        var rt = REAL_BGM[trackIdx % REAL_BGM.length];
        try {
          if (!realAudio) {
            realAudio = new Audio();
            realAudio.loop = true;
            realAudio.preload = "none";
          }
          realAudio.src = rt.src;
          realAudio.volume = 0;
          syncUI();
          var playPromise = realAudio.play();
          if (playPromise && typeof playPromise.then === "function") {
            playPromise.then(function () {
              if (playing) fadeHtmlAudio(realAudio, 0.24, 1200);
            }).catch(function () {
              playing = false;
              syncUI();
            });
          } else {
            fadeHtmlAudio(realAudio, 0.24, 1200);
          }
        } catch (_) {
          playing = false;
          syncUI();
        }
      }

      function stopPlay() {
        playing = false;
        syncUI();
        if (realAudio) {
          fadeHtmlAudio(realAudio, 0, 420, function () {
            try { realAudio.pause(); } catch (_) {}
          });
        }
      }

      if (fabBtn) fabBtn.addEventListener("click", function () {
        if (playing) stopPlay(); else startPlay();
      });
    })();

    /* ---------- CENTERPIECE #2: 4-Chapter Creative Arc Showcase (Zero Slider, Live Runtime Data) ---------- */
    var ERA_CHAPTERS = [
      {
        id: 0,
        years: [2017, 2026],
        kicker: { ja: "CHAPTER · SAMPLE", cn: "章节 · 示例", en: "CHAPTER · SAMPLE" },
        headline: {
          ja: "サンプルチャプター（差し替え用）",
          cn: "示例章节（请替换）",
          en: "Sample Chapter (replace with your own)"
        },
        summary: {
          ja: "これはテンプレートのサンプルです。対象アーティストの活動時期ごとに、章の区切り・見出し・要約を書き換えてください。",
          cn: "这是模板示例。请按目标艺人的活动时期，改写每个章节的年份、标题与摘要。",
          en: "This is a template sample. Rewrite each chapter's years, headline, and summary for the periods of the artist you are archiving."
        }
      }
    ];

    var curEraIdx = 0;
    var ERA_WORKS_CACHE = null;

    function eraGateOk() {
      if (window.__ownerHideR18) return false;
      try { return window.localStorage.getItem("site-archive-18") === "1"; } catch (e) { return false; }
    }

    function computeEraData(years) {
      var yearSet = {};
      years.forEach(function (y) { yearSet[String(y)] = true; });
      var totalAll = 0;
      var eraTotal = 0;
      if (typeof YEARS !== "undefined" && YEARS.length) {
        YEARS.forEach(function (p) {
          totalAll += p[1];
          if (yearSet[String(p[0])]) eraTotal += p[1];
        });
      }
      var list = ERA_WORKS_CACHE || (typeof WORKS !== "undefined" && WORKS ? WORKS : null);
      if (!list) return { eraTotal: eraTotal, totalAll: totalAll, circles: [], works: [] };

      var circleCounts = {};
      var eraWorks = [];
      list.forEach(function (r) {
        var yr = r[2] ? r[2].slice(0, 4) : "";
        if (!yearSet[yr]) return;
        eraWorks.push(r);
        if (r[3]) circleCounts[r[3]] = (circleCounts[r[3]] || 0) + 1;
      });
      if (!eraTotal) {
        eraTotal = eraWorks.length;
        totalAll = list.length;
      }
      var topCircles = Object.keys(circleCounts).map(function (c) {
        return { name: c, count: circleCounts[c] };
      }).sort(function (a, b) { return b.count - a.count; }).slice(0, 4);

      var openR18 = eraGateOk();
      var candidates = eraWorks.filter(function (r) { return openR18 || r[11] !== 2; });
      if (!candidates.length) candidates = eraWorks;
      candidates.sort(function (a, b) {
        var sa = (a[7] || 0) * 10 + (a[5] || 0) * 100;
        var sb = (b[7] || 0) * 10 + (b[5] || 0) * 100;
        return sb - sa;
      });
      return {
        eraTotal: eraTotal,
        totalAll: totalAll,
        circles: topCircles,
        works: candidates.slice(0, 3)
      };
    }

    function renderEraShowcase(idx, animate) {
      curEraIdx = Math.max(0, Math.min(ERA_CHAPTERS.length - 1, idx));
      var ch = ERA_CHAPTERS[curEraIdx];
      var lang = currentLang || "ja";
      var stage = $("era-stage");
      if (!stage) return;

      if (animate && !reduced) {
        stage.classList.remove("era-fade-in");
        void stage.offsetWidth;
        stage.classList.add("era-fade-in");
      }

      if ($("era-kicker")) $("era-kicker").textContent = ch.kicker[lang] || ch.kicker.ja;
      if ($("era-headline")) $("era-headline").textContent = ch.headline[lang] || ch.headline.ja;
      if ($("era-summary")) $("era-summary").textContent = ch.summary[lang] || ch.summary.ja;

      var data = computeEraData(ch.years);
      var statEl = $("era-stat-pill");
      if (statEl) {
        if (data.eraTotal > 0 && data.totalAll > 0) {
          var pct = Math.round((data.eraTotal / data.totalAll) * 100);
          statEl.textContent = lang === "cn"
            ? (data.eraTotal + " 部 · 占十年 " + pct + "%")
            : (lang === "en" ? (data.eraTotal + " works · " + pct + "% of decade") : (data.eraTotal + "作 · 10年間の" + pct + "%"));
          statEl.hidden = false;
        } else {
          statEl.hidden = true;
        }
      }

      var cEl = $("era-circles");
      if (cEl) {
        if (data.circles.length) {
          cEl.innerHTML = data.circles.map(function (c) {
            return '<button type="button" class="era-circle-chip" data-era-circle="' + esc(c.name) + '">'
              + '<span class="ec-name">' + esc(c.name) + '</span>'
              + '<span class="ec-cnt">' + c.count + '</span>'
              + '</button>';
          }).join("");
          cEl.querySelectorAll("[data-era-circle]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var cname = btn.getAttribute("data-era-circle");
              if (cname && typeof openArchiveWithCircle === "function") openArchiveWithCircle(cname);
              else if (typeof showView === "function") showView("archive");
            });
          });
        } else {
          cEl.innerHTML = '<span class="era-loading">' + (lang === "cn" ? "读取社团数据中…" : (lang === "en" ? "Loading circles…" : "サークル集計を読み込み中…")) + '</span>';
        }
      }

      var wEl = $("era-works");
      if (wEl) {
        if (data.works.length) {
          var openR18 = eraGateOk();
          wEl.innerHTML = data.works.map(function (r) {
            var isR18 = r[11] === 2;
            var yr = r[2] ? r[2].slice(0, 4) : String(ch.years[ch.years.length - 1]);
            var label = (openR18 || !isR18)
              ? r[1]
              : (lang === "cn" ? (r[3] + " 合作代表作（" + yr + "）") : (lang === "en" ? ("Notable release with " + r[3] + " (" + yr + ")") : (r[3] + " の注目作（" + yr + "）")));
            return '<button type="button" class="era-work-item" data-era-yr="' + esc(yr) + '">'
              + '<span class="ew-yr">' + esc(yr) + '</span>'
              + '<span class="ew-title">' + esc(label) + '</span>'
              + '<span class="ew-arr" aria-hidden="true">→</span>'
              + '</button>';
          }).join("");
          wEl.querySelectorAll("[data-era-yr]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var y = btn.getAttribute("data-era-yr");
              if (y && typeof openArchiveWithYear === "function") openArchiveWithYear(y);
            });
          });
        } else {
          wEl.innerHTML = '<span class="era-loading">' + (lang === "cn" ? "读取代表作中…" : (lang === "en" ? "Loading works…" : "代表作を読み込み中…")) + '</span>';
        }
      }

      var jEl = $("era-year-jumps");
      if (jEl) {
        jEl.innerHTML = ch.years.map(function (y) {
          var lbl = lang === "cn" ? ("查看 " + y + " 年 →") : (lang === "en" ? ("Browse " + y + " →") : (y + "年の作品 →"));
          return '<button type="button" class="era-jump-btn" data-jump-yr="' + y + '">' + esc(lbl) + '</button>';
        }).join("");
        jEl.querySelectorAll("[data-jump-yr]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            openArchiveWithYear(btn.getAttribute("data-jump-yr"));
          });
        });
      }

      if ($("mem-prev")) $("mem-prev").disabled = curEraIdx <= 0;
      if ($("mem-next")) $("mem-next").disabled = curEraIdx >= ERA_CHAPTERS.length - 1;
      document.querySelectorAll("#year-dial .era-tab").forEach(function (btn) {
        var active = parseInt(btn.getAttribute("data-era"), 10) === curEraIdx;
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    var dial = $("year-dial");
    if (dial) {
      dial.addEventListener("click", function (e) {
        var btn = e.target.closest(".era-tab");
        if (btn) renderEraShowcase(parseInt(btn.getAttribute("data-era"), 10) || 0, true);
      });
    }
    if ($("mem-prev")) $("mem-prev").addEventListener("click", function () { renderEraShowcase(curEraIdx - 1, true); });
    if ($("mem-next")) $("mem-next").addEventListener("click", function () { renderEraShowcase(curEraIdx + 1, true); });
    window.refreshEraShowcase = function () { renderEraShowcase(curEraIdx, false); };
    renderEraShowcase(curEraIdx, false);

    fetch("./data/works.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (Array.isArray(d) && d.length) {
        ERA_WORKS_CACHE = d;
        renderEraShowcase(curEraIdx, false);
      }
    }).catch(function () {});

    /* ---------- View Switching + Mobile Tab Sync (4 Views: home, history, archive, about) ---------- */
    var VIEWS = ["home", "history", "archive", "about"];
    var curView = "home";
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
    function updateHash(name, year, mode) {
      try {
        var url = name === "archive"
          ? (year ? "#archive?year=" + encodeURIComponent(year) : "#archive")
          : (name === "history" ? "#history" : (name === "about" ? "#about" : "#"));
        if (mode === "push") history.pushState(null, "", url);
        else history.replaceState(null, "", url);
      } catch (e) {}
    }
    function syncActiveTabs(viewName, anchor) {
      document.querySelectorAll("nav .navlink[data-view], .mobile-tabbar .m-tab").forEach(function (b) {
        var bv = b.getAttribute("data-view"), bg = b.getAttribute("data-goto");
        var isCur = (anchor && bg === anchor) || (!anchor && bv === viewName);
        if (isCur) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
    }
    function showView(name, anchor, yearParam, histMode) {
      if (VIEWS.indexOf(name) === -1) name = "home";
      var preScrollY = window.scrollY || 0;
      var targetEl = $("view-" + name);
      var wasHidden = targetEl && targetEl.hidden;
      VIEWS.forEach(function (v) {
        var el = $("view-" + v);
        if (el) el.hidden = v !== name;
      });
      if (targetEl && name !== "home") {
        targetEl.querySelectorAll(".folder-sec.reveal-ready").forEach(function (sec) {
          sec.classList.add("is-revealed");
          sec.querySelectorAll(".reveal-item").forEach(function (it) { it.classList.add("is-hover-ready"); });
        });
      }
      if (wasHidden && targetEl && !reduced) {
        targetEl.classList.remove("view-entering");
        void targetEl.offsetWidth;
        targetEl.classList.add("view-entering");
      }
      syncActiveTabs(name, anchor);
      if (!histMode) histMode = name !== curView ? "push" : "replace";
      curView = name;
      if (name === "archive") {
        ensureArchive();
        if (histMode !== "none") {
          if (histMode === "push") { try { history.replaceState({ hs: preScrollY }, ""); } catch (e) {} }
          updateHash("archive", yearParam || ($("f-year") ? $("f-year").value : ""), histMode);
        }
      } else if (histMode !== "none") {
        if (histMode === "push") { try { history.replaceState({ hs: preScrollY }, ""); } catch (e) {} }
        updateHash(name, null, histMode);
      }
      if (histMode === "none") {
        // Arrived via browser Back/Forward: the URL is already correct and
        // the browser restores the saved scroll position — do not fight it.
      } else if (anchor) {
        var t = document.getElementById(anchor);
        if (t) setTimeout(function () { t.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); }, 30);
      } else {
        window.scrollTo(0, 0);
      }
    }
    document.querySelectorAll("[data-view]").forEach(function (b) { b.addEventListener("click", function () { showView(b.getAttribute("data-view")); }); });
    document.querySelectorAll("[data-goto]").forEach(function (b) { b.addEventListener("click", function () { showView("home", b.getAttribute("data-goto")); }); });
    $("brand-home").addEventListener("click", function (e) { e.preventDefault(); showView("home"); });
    if ($("starter-allages-btn")) $("starter-allages-btn").addEventListener("click", function () { setScope(false); showView("archive"); });
    window.addEventListener("popstate", function () {
      var h = window.location.hash || "";
      if (h.indexOf("#archive") === 0) {
        var ym = h.match(/year=(\d{4})/);
        if (ym) openArchiveWithYear(ym[1], "none");
        else showView("archive", null, null, "none");
        window.scrollTo(0, 0);
      } else if (h.indexOf("#history") === 0) {
        showView("history", null, null, "none");
        window.scrollTo(0, 0);
      } else if (h.indexOf("#about") === 0) {
        showView("about", null, null, "none");
        window.scrollTo(0, 0);
      } else if (h.indexOf("#owner") === 0) {
        // The owner flow manages its own hash handling; leave the view as-is.
      } else {
        showView("home", null, null, "none");
        var st = null;
        try { st = history.state; } catch (e) {}
        if (st && typeof st.hs === "number") {
          var y = st.hs;
          setTimeout(function () { window.scrollTo(0, y); }, 60);
        } else {
          window.scrollTo(0, 0);
        }
      }
    });

    /* ---------- Hero Subtle Ambient Background Canvas ---------- */
    (function () {
      var cv = $("hero-canvas"), ctx = cv.getContext("2d");
      var W = 0, H = 0, dpr = 1, t = 0, dots = [];
      function resize() {
        var r = cv.parentElement.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = r.width; H = r.height;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!dots.length) {
          for (var i = 0; i < 28; i++) dots.push({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 4, s: 0.14 + Math.random() * 0.45, p: Math.random() * 6.28, yuzu: i % 3 === 0 });
        }
      }
      function draw(ts) {
        t = ts * 0.001;
        ctx.clearRect(0, 0, W, H);
        dots.forEach(function (d) {
          var bx = ((d.x + t * 0.006 * d.s) % 1) * W;
          var by = d.y * H + Math.sin(t * 0.7 + d.p) * 10;
          var alpha = 0.25 + 0.3 * Math.abs(Math.sin(t + d.p));
          ctx.beginPath(); ctx.arc(bx, by, d.r, 0, Math.PI * 2);
          ctx.fillStyle = d.yuzu ? "rgba(255,212,71," + alpha.toFixed(2) + ")" : "rgba(255,255,255," + alpha.toFixed(2) + ")";
          ctx.fill();
        });
        if (!reduced) requestAnimationFrame(draw);
      }
      resize(); window.addEventListener("resize", resize);
      requestAnimationFrame(draw);
    })();

    /* ---------- Official Links (12 Cards) ---------- */
    var LINKS = [
      {
        plat: "公式サイト", icon: "site",
        name: "[アーティスト名] オフィシャルサイト",
        ja: "example.com — 依頼窓口・お知らせ",
        cn: "example.com — 委托窗口与公告",
        en: "example.com — Inquiries & announcements",
        tag: { ja: "公式", cn: "官网", en: "Official", tone: "rose" },
        url: "https://example.com/"
      },
      {
        plat: "X · メイン", icon: "x",
        name: "[アーティスト名]",
        ja: "@your_artist — 作品紹介・収録報告・日常ポスト",
        cn: "@your_artist — 作品介绍、收录动态与日常动态",
        en: "@your_artist — Releases, recording reports & daily posts",
        tag: { ja: "主アカウント", cn: "主账号", en: "Main", tone: "rose" },
        url: "https://x.com/your_artist"
      },
      {
        plat: "YouTube", icon: "youtube",
        name: "[アーティスト名] 公式チャンネル",
        ja: "ライブ配信・オリジナルMV・開封動画・サンプル",
        cn: "官方直播、原创 MV、开箱与试听样本",
        en: "Streams, original MVs, unboxings & samples",
        url: "https://www.youtube.com/@your_artist"
      },
      {
        plat: "DLsite 出演一覧", icon: "dlsite-mic",
        name: "[アーティスト名] 出演作品",
        ja: "DLsite 公式声優検索ページ（DLsite掲載分）",
        cn: "DLsite 官方声优搜索页（DLsite 收录部分）",
        en: "Official DLsite voice-actor search page (DLsite listings)",
        url: "https://www.dlsite.com/"
      }
    ];

    // v2.3.2 Tsubame Portal HD Squircle Icon Pack (full-bleed 48x48 geometricPrecision artboards + bespoke Official Site & Tsubamate Circle crests)
    var LINK_ICONS = {
      site: {
        bg: "linear-gradient(145deg, #f6476d 0%, #bf163c 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<circle cx="33.2" cy="14.8" r="3.6" fill="#FFD84D"/>'
           + '<path d="M35.5 21.0 C32.8 18.9 29.6 18.7 27.1 20.2 C23.6 15.2 18.5 12.0 12.1 11.8 C14.3 16.6 17.4 20.6 20.8 23.4 C16.6 26.7 12.6 29.5 9.0 33.0 C12.8 31.6 16.0 30.5 18.5 29.2 C16.4 32.2 14.1 35.1 12.0 37.6 C17.1 35.7 21.7 32.8 25.2 29.4 C27.7 32.0 30.7 34.0 34.4 34.9 C32.5 31.1 30.9 27.9 30.0 24.8 C32.4 23.8 34.4 22.5 35.5 21.0 Z" fill="#FFFFFF"/>'
           + '</svg>'
      },
      x: {
        bg: "linear-gradient(145deg, #27272c 0%, #09090b 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<path d="M26.8 21.7L37.6 9.2h-2.6l-9.4 10.9-7.5-10.9H9.5l11.3 16.4L9.5 38.8h2.6l9.9-11.5 7.9 11.5h8.6L26.8 21.7zm-3.5 4.1l-1.2-1.6-9.2-13.1h3.9l7.4 10.6 1.2 1.6 9.6 13.7h-3.9l-7.8-11.2z" fill="#FFFFFF"/>'
           + '</svg>'
      },
      "x-notice": {
        bg: "linear-gradient(145deg, #27272c 0%, #09090b 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<path d="M25.6 22.8L35.4 11.4h-2.4l-8.5 9.9-6.8-9.9H9.8l10.3 14.9L9.8 38.2h2.4l9-10.4 7.2 10.4h7.8L25.6 22.8zm-3.2 3.7l-1.1-1.5-8.3-11.9h3.5l6.7 9.6 1.1 1.5 8.7 12.4h-3.5l-7.1-10.1z" fill="#FFFFFF"/>'
           + '<circle cx="37.2" cy="10.8" r="5.6" fill="#FFD447" stroke="#18181b" stroke-width="2"/>'
           + '</svg>'
      },
      "x-runa": {
        bg: "linear-gradient(145deg, #4f3580 0%, #20123b 100%)", fg: "#f3e8ff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<path d="M26.4 22.2L36.8 10.2h-2.5l-9 10.5-7.2-10.5H9.8l10.9 15.8L9.8 38.6h2.5l9.5-11 7.6 11h8.3L26.4 22.2zm-3.4 3.9l-1.1-1.6-8.8-12.6h3.8l7.1 10.2 1.1 1.6 9.2 13.2h-3.8l-7.5-10.8z" fill="#F5EEFF"/>'
           + '<path d="M38 11.5l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1 1-2.2z" fill="#D8B4FE"/>'
           + '</svg>'
      },
      cien: {
        bg: "linear-gradient(145deg, #332224 0%, #1d1213 100%)", fg: "#fff3e6",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<path d="M31.2 13.0 C33.6 10.6 36.2 10.8 36.6 12.6 C37.0 14.2 35.0 16.0 33.0 16.8 C32.0 15.5 31.5 14.2 31.2 13.0 Z" fill="#B05274"/>'
           + '<path d="M17.2 17.5 C11.6 22.8 10.6 29.8 11.2 35.8 C17.2 36.4 24.4 35.4 29.8 30.0 C25.6 25.8 21.4 21.6 17.2 17.5 Z" fill="#AE6C73"/>'
           + '<path d="M16.2 17.2 C20.6 11.2 29.4 11.4 34.4 16.4 C39.4 21.4 38.8 28.6 31.2 31.4 C27.0 27.6 20.4 21.2 16.2 17.2 Z" fill="#F3BC98"/>'
           + '<circle cx="17.5" cy="26.8" r="3.3" fill="#FFFFFF"/>'
           + '</svg>'
      },
      tsubamate: {
        bg: "linear-gradient(145deg, #ffc645 0%, #f26852 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<circle cx="23.5" cy="23.5" r="17.5" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.6"/>'
           + '<path d="M11 26.5c0-6.8 5.4-12 12.2-12 4.6 0 8.5 2.4 10.2 6l3.6 1.5-3.1 2.2c-0.7 5.8-5.5 10.3-11.5 10.3-3.2 0-6.2-1.2-8.4-3.3l-4.2 1.8 1.9-4.1c-0.5-0.8-0.7-1.6-0.7-2.4z" fill="#FFFFFF"/>'
           + '<circle cx="28.6" cy="21.4" r="1.8" fill="#3B2329"/>'
           + '<path d="M21.2 25.5c0-1.5 1.9-2.2 2.9-1 1-1.2 2.9-0.5 2.9 1 0 1.8-2.9 3.6-2.9 3.6s-2.9-1.8-2.9-3.6z" fill="#F24C6B"/>'
           + '<rect x="29.5" y="31.5" width="14.5" height="11" rx="4" fill="#0B46C8" stroke="#FFFFFF" stroke-width="1.4"/>'
           + '<text x="36.8" y="39.5" text-anchor="middle" fill="#FFFFFF" font-family="Fredoka,sans-serif" font-weight="700" font-size="7.6">DL</text>'
           + '</svg>'
      },
      "dlsite-mic": {
        bg: "linear-gradient(145deg, #1f64e6 0%, #072c8a 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<text x="21.5" y="31.5" text-anchor="middle" fill="#FFFFFF" font-family="Fredoka,sans-serif" font-weight="700" font-size="22" letter-spacing="-0.8">DL</text>'
           + '<rect x="35.5" y="10.5" width="4.4" height="8.5" rx="2.2" fill="#7DD3FC"/>'
           + '<path d="M33.2 16.8a4.5 4.5 0 0 0 9 0M37.7 21.3v2.8" stroke="#7DD3FC" stroke-width="2" stroke-linecap="round"/>'
           + '</svg>'
      },
      youtube: {
        bg: "linear-gradient(145deg, #ff2442 0%, #cc0022 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<rect x="7" y="12" width="34" height="24" rx="7.2" fill="#FFFFFF"/>'
           + '<path d="M20.5 18.2l11 5.8-11 5.8V18.2z" fill="#E00628"/>'
           + '</svg>'
      },
      booth: {
        bg: "linear-gradient(145deg, #ff6368 0%, #e63238 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<path d="M16.2 10.5l3.6 8.2h6.8l4.1-6.8c1-1.5 3.3-0.7 3.1 1.1l-1 8.8c3.2 1.3 5.2 4.2 5.2 8.2v6.5h-5.6v-5.2c0-1.8-1.3-3-3.2-3h-7.4c-1.9 0-3.2 1.2-3.2 3v5.2H13v-10c0-4 1.5-7.2 3.9-9.1l-3.6-5.3c-0.7-1.6 1.5-3 2.9-1.6z" fill="#FFFFFF"/>'
           + '</svg>'
      },
      skeb: {
        bg: "linear-gradient(145deg, #32ab9f 0%, #166b64 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<circle cx="24" cy="24" r="15.2" stroke="#FFFFFF" stroke-width="3.4"/>'
           + '<path d="M16.8 28.4c3.4-8.4 10.2-13.2 17.4-12.1-3.4 5.9-7.1 11.6-13.8 16.5-1.9 1.3-4.5-1.9-3.6-4.4z" fill="#FFFFFF"/>'
           + '</svg>'
      },
      tiktok: {
        bg: "linear-gradient(145deg, #212126 0%, #08080a 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<g transform="translate(8,7) scale(1.38)">'
           + '<path d="M18.6 6.7a4.8 4.8 0 0 1-3.7-4.2h-2.9v13.2a2.9 2.9 0 1 1-2.1-2.8V9.9a6 6 0 1 0 5.2 5.9V8.8a8 8 0 0 0 4.5 1.4V7.3c-0.3 0-0.7-0.2-1-0.6z" fill="#25F4EE" transform="translate(-0.85,-0.65)"/>'
           + '<path d="M18.6 6.7a4.8 4.8 0 0 1-3.7-4.2h-2.9v13.2a2.9 2.9 0 1 1-2.1-2.8V9.9a6 6 0 1 0 5.2 5.9V8.8a8 8 0 0 0 4.5 1.4V7.3c-0.3 0-0.7-0.2-1-0.6z" fill="#FE2C55" transform="translate(0.85,0.65)"/>'
           + '<path d="M18.6 6.7a4.8 4.8 0 0 1-3.7-4.2h-2.9v13.2a2.9 2.9 0 1 1-2.1-2.8V9.9a6 6 0 1 0 5.2 5.9V8.8a8 8 0 0 0 4.5 1.4V7.3c-0.3 0-0.7-0.2-1-0.6z" fill="#FFFFFF"/>'
           + '</g></svg>'
      },
      line: {
        bg: "linear-gradient(145deg, #10d660 0%, #04ab48 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<path d="M24 9c-9.1 0-16.5 5.9-16.5 13.2 0 6.5 5.8 12 13.7 13.1 0.5 0.1 1.2 0.3 1.4 0.8 0.2 0.5 0.1 1.1 0 1.6l-0.5 2.4c-0.1 0.6 0.5 0.9 1.1 0.6 3.9-2.2 10.5-6.2 14.1-10.3 2.1-2.2 3.2-5 3.2-8.2C40.5 14.9 33.1 9 24 9z" fill="#FFFFFF"/>'
           + '<text x="24" y="26.2" text-anchor="middle" fill="#05B34C" font-family="Fredoka,sans-serif" font-weight="700" font-size="10.6" letter-spacing="0.2">LINE</text>'
           + '</svg>'
      },
      amazon: {
        bg: "linear-gradient(145deg, #ffab26 0%, #e67e00 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<text x="24" y="28.2" text-anchor="middle" fill="#FFFFFF" font-family="Fredoka,sans-serif" font-weight="700" font-size="25">a</text>'
           + '<path d="M11.5 33.2c7.2 4.6 17.8 4.6 25 0" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>'
           + '<path d="M32.5 31.8l4.4 0.9-1.2 4.2" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'
           + '</svg>'
      },
      pommu: {
        bg: "linear-gradient(145deg, #47b5ff 0%, #167ad8 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<path d="M10.5 22.5C10.5 15.5 16.5 9.8 24 9.8s13.5 5.7 13.5 12.7-6 12.7-13.5 12.7c-2 0-4-0.5-5.8-1.4L11.5 37l1.9-5.6c-1.8-2.4-2.9-5.5-2.9-8.9z" fill="#FFFFFF"/>'
           + '<text x="24" y="28.5" text-anchor="middle" fill="#167AD8" font-family="Fredoka,sans-serif" font-weight="700" font-size="19.5">p</text>'
           + '</svg>'
      },
      litlink: {
        bg: "linear-gradient(145deg, #32dba9 0%, #3478f6 100%)", fg: "#ffffff",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" stroke="#FFFFFF" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">'
           + '<path d="M20.5 26.5a7.5 7.5 0 0 0 11.3 0.8l3.8-3.8a7.5 7.5 0 0 0-10.6-10.6l-2.3 2.3"/>'
           + '<path d="M27.5 21.5a7.5 7.5 0 0 0-11.3-0.8l-3.8 3.8a7.5 7.5 0 0 0 10.6 10.6l2.3-2.3"/>'
           + '</svg>'
      },
      fantia: {
        bg: "linear-gradient(145deg, #ffffff 0%, #f5eef1 100%)", fg: "#382228",
        svg: '<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" shape-rendering="geometricPrecision">'
           + '<text x="24" y="21.5" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="15.5"><tspan fill="#F05A7E">f</tspan><tspan fill="#38BDF8">a</tspan><tspan fill="#F5B82E">n</tspan></text>'
           + '<text x="24" y="36.5" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="15.5"><tspan fill="#2EC994">t</tspan><tspan fill="#9B7DF7">i</tspan><tspan fill="#FB7185">a</tspan></text>'
           + '</svg>'
      }
    };

        var MATRIX_AVATARS = {"official": "/assets/avatars/official-44e5104e.jpg", "x_main": "/assets/avatars/x_main-c330b699.jpg", "x_kokuchi": "/assets/avatars/x_kokuchi-894578a3.jpg", "x_runa": "/assets/avatars/x_runa-5e163347.jpg", "cien": "/assets/avatars/cien-435406d4.jpg", "youtube": "/assets/avatars/youtube-4872dbc8.jpg", "booth": "/assets/avatars/booth-329b1a67.jpg", "litlink": "/assets/avatars/litlink-ce6bc3de.jpg", "x_legacy2": "/assets/avatars/x_legacy2-2acb0083.jpg", "x_legacy1": "/assets/avatars/x_legacy1-cfdd4f30.jpg", "fantia": "/assets/avatars/fantia-8201429e.jpg"};
    var ICON_AVATAR_KEY = {"site": "official", "x": "x_main", "x-notice": "x_kokuchi", "x-runa": "x_runa", "cien": "cien", "tsubamate": "cien", "youtube": "youtube", "booth": "booth", "skeb": "x_main", "tiktok": "youtube", "fantia": "fantia", "x-legacy1": "x_legacy1", "x-legacy2": "x_legacy2", "litlink": "litlink"};

        var OFFICIAL_ICONS = {"site": "/assets/icons/site-df5a2059.png", "x": "/assets/icons/x-4cdc76f1.png", "cien": "/assets/icons/cien-8396c1b3.png", "dlsite": "/assets/icons/dlsite-90b6c736.png", "youtube": "/assets/icons/youtube-156dc3a8.png", "booth": "/assets/icons/booth-99c5caf8.png", "skeb": "/assets/icons/skeb-68b24d6c.png", "tiktok": "/assets/icons/tiktok-35508a57.png", "line": "/assets/icons/line-405d5059.png", "amazon": "/assets/icons/amazon-8d52c6b1.png", "fantia": "/assets/icons/fantia-fc17ab57.png"};
    var ICON_PNG_MAP = {"site": {"png": "site", "bg": "#c81d45", "pad": 0}, "x": {"png": "x", "bg": "#000000", "pad": 0}, "x-notice": {"png": "x", "bg": "#000000", "pad": 0}, "x-runa": {"png": "x", "bg": "#000000", "pad": 0}, "cien": {"png": "cien", "bg": "#ffffff", "pad": 0}, "tsubamate": {"png": "dlsite", "bg": "#ffffff", "pad": 0}, "dlsite-mic": {"png": "dlsite", "bg": "#ffffff", "pad": 0}, "youtube": {"png": "youtube", "bg": "#ffffff", "pad": 2}, "booth": {"png": "booth", "bg": "#fc4d50", "pad": 0}, "skeb": {"png": "skeb", "bg": "#ffffff", "pad": 0}, "tiktok": {"png": "tiktok", "bg": "#000000", "pad": 0}, "line": {"png": "line", "bg": "#06c755", "pad": 0}, "amazon": {"png": "amazon", "bg": "#ff9900", "pad": 0}, "pommu": {"png": "dlsite", "bg": "#ffffff", "pad": 0}, "fantia": {"png": "fantia", "bg": "#ffffff", "pad": 0}, "x-archive": {"png": "x", "bg": "#5c5358", "pad": 0}, "x-legacy1": {"png": "x", "bg": "#5c5358", "pad": 0}, "x-legacy2": {"png": "x", "bg": "#5c5358", "pad": 0}};

        var PLAT_I18N = {
      "公式サイト": { ja: "公式サイト", cn: "官方网站", en: "Official Site" },
      "X · メイン": { ja: "X · メイン", cn: "X · 主账号", en: "X · Main" },
      "X · 告知": { ja: "X · 告知", cn: "X · 告知号", en: "X · Notices" },
      "X · 椎名るな": { ja: "X · 椎名るな", cn: "X · 椎名るな", en: "X · Runa Shiina" },
      "つばめいと · DLsite": { ja: "つばめいと · DLsite", cn: "つばめいと · DLsite", en: "Tsubameito · DLsite" },
      "DLsite 出演一覧": { ja: "DLsite 出演一覧", cn: "DLsite 出演一览", en: "DLsite Credits" },
      "LINE スタンプ": { ja: "LINE スタンプ", cn: "LINE 表情贴纸", en: "LINE Stickers" },
      "Amazon": { ja: "Amazon", cn: "Amazon 愿望单", en: "Amazon Wishlist" },
      "X · 初代（旧）": { ja: "X · 初代（旧）", cn: "X · 初代（旧）", en: "X · 1st Gen (Legacy)" },
      "X · 第二代（旧）": { ja: "X · 第二代（旧）", cn: "X · 第二代（旧）", en: "X · 2nd Gen (Legacy)" }
    };
    function platLabelHtml(p) {
      var m = PLAT_I18N[p];
      if (!m) return esc(p);
      return '<span class="t-ja">' + esc(m.ja) + '</span><span class="t-cn">' + esc(m.cn) + '</span><span class="t-en">' + esc(m.en) + '</span>';
    }
    $("links-grid").innerHTML = LINKS.map(function (l) {
      var vis = LINK_ICONS[l.icon] || LINK_ICONS.site;
      var avKey = ICON_AVATAR_KEY[l.icon];
      var avSrc = avKey ? MATRIX_AVATARS[avKey] : "";
      var pm = ICON_PNG_MAP[l.icon];
      var pipInner = pm
        ? '<img class="link-icon-img" src="' + OFFICIAL_ICONS[pm.png] + '" alt="" style="' + (pm.pad ? 'padding:' + pm.pad + 'px;object-fit:contain;' : 'object-fit:cover;') + '">'
        : vis.svg;
      var pipBg = pm ? pm.bg : vis.bg;
      var mediaHtml = avSrc
        ? '<span class="link-avatar-wrap" aria-hidden="true">'
          + '<img class="link-avatar-img" src="' + avSrc + '" alt="" loading="lazy" decoding="async">'
          + '<span class="link-plat-pip" style="background:' + pipBg + ';color:' + vis.fg + ';">' + pipInner + '</span>'
          + '</span>'
        : '<span class="link-icon-badge" style="background:' + pipBg + ';color:' + vis.fg + ';" aria-hidden="true">' + pipInner + '</span>';
      var tagHtml = l.tag
        ? '<span class="link-status-pill is-' + l.tag.tone + '"><span class="t-ja">' + esc(l.tag.ja) + '</span><span class="t-cn">' + esc(l.tag.cn) + '</span><span class="t-en">' + esc(l.tag.en) + '</span></span>'
        : '';
      var openTag = l.archived
        ? '<div class="link-card is-hcard is-archived">'
        : '<a class="link-card is-hcard" href="' + l.url + '" target="_blank" rel="noopener">';
      var closeTag = l.archived ? '</div>' : '</a>';
      var rightMark = l.archived
        ? '<span class="link-harr is-arc"><span class="t-ja">記録</span><span class="t-cn">记录</span><span class="t-en">Record</span></span>'
        : '<span class="link-harr" aria-hidden="true">↗</span>';
      return openTag
        + mediaHtml
        + '<div class="link-hbody">'
        +   '<div class="link-htop">'
        +     '<span class="link-plat">' + platLabelHtml(l.plat) + '</span>'
        +     tagHtml
        +     rightMark
        +   '</div>'
        +   '<div class="link-name">' + esc(l.name) + '</div>'
        +   '<div class="link-note"><span class="t-ja">' + esc(l.ja) + '</span><span class="t-cn">' + esc(l.cn) + '</span><span class="t-en">' + esc(l.en) + '</span></div>'
        + '</div>'
        + closeTag;
    }).join("");

    /* ---------- Countdown & Counters ---------- */
    var target = new Date("2026-12-10T20:00:00+09:00").getTime();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var countdownTimer = null;
    function tick() {
      if (countdownTimer) { clearTimeout(countdownTimer); countdownTimer = null; }
      var card = $("flagship-countdown");
      var diff = target - Date.now();
      if (diff <= 0) {
        if (card) card.hidden = true;
        return;
      }
      if (card) card.hidden = false;
      $("cd-d").textContent = Math.floor(diff / 86400000);
      $("cd-h").textContent = pad(Math.floor(diff % 86400000 / 3600000));
      $("cd-m").textContent = pad(Math.floor(diff % 3600000 / 60000));
      $("cd-s").textContent = pad(Math.floor(diff % 60000 / 1000));
      countdownTimer = setTimeout(tick, 1000);
    }
    tick();
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var end = parseInt(el.getAttribute("data-count"), 10);
      if (reduced) { el.textContent = end.toLocaleString("ja-JP"); return; }
      var t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / 1000, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString("ja-JP");
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });

    /* ---------- Unified Release Constellation & Top 10 Circles (runtime from /data/stats.json) ---------- */
    var STATS_DATA = null;
    var YEARS = [];
    var YEAR_MAP = {};
    var MONTHLY = {};
    var TOP_CIRCLES = [];

    function syncDynamicWorkCounts(stats) {
      if (!stats || typeof stats !== "object") return;
      var total = Number(stats.works_total);
      if (total > 0) {
        var totalStr = total.toLocaleString("en-US");
        var hc = $("hero-works-count");
        if (hc && Number(hc.getAttribute("data-count")) !== total) {
          hc.setAttribute("data-count", String(total));
          hc.textContent = total.toLocaleString("ja-JP");
        }
        var segAllCnt = document.querySelector("#seg-all .cnt");
        if (segAllCnt) segAllCnt.textContent = totalStr;
        document.querySelectorAll("[data-works-total-text], .works-total-cnt").forEach(function (el) {
          el.textContent = totalStr;
        });
      }
      var age = stats.age_breakdown && typeof stats.age_breakdown === "object" ? stats.age_breakdown : null;
      if (age) {
        var nonR18 = Number(age["\u5168\u5e74\u9f62"] || 0) + Number(age["R-15"] || 0);
        if (nonR18 > 0) {
          var nonStr = nonR18.toLocaleString("en-US");
          var segGenCnt = document.querySelector("#seg-gen .cnt");
          if (segGenCnt) segGenCnt.textContent = nonStr;
          document.querySelectorAll(".non-r18-cnt").forEach(function (el) {
            el.textContent = nonStr;
          });
        }
      }
    }

    function renderStatsKpis() {
      var el = $("stats-kpi-strip");
      if (!el) return;
      if (!YEARS.length) { el.innerHTML = ""; return; }
      var total = (STATS_DATA && STATS_DATA.works_total) || YEARS.reduce(function (acc, p) { return acc + p[1]; }, 0);
      var peak = YEARS[0];
      YEARS.forEach(function (p) { if (p[1] > peak[1]) peak = p; });
      var span = YEARS[0][0] + "–" + YEARS[YEARS.length - 1][0];
      el.innerHTML =
        '<div class="skpi"><span class="skpi-val">' + Number(total).toLocaleString("en-US") + '</span><span class="skpi-lab"><span class="t-ja">収録作品</span><span class="t-cn">收录作品</span><span class="t-en">Works</span></span></div>'
        + '<div class="skpi skpi-peak"><span class="skpi-val">★ ' + peak[0] + '</span><span class="skpi-lab"><span class="t-ja">最多 ' + peak[1] + '作</span><span class="t-cn">最多 ' + peak[1] + ' 部</span><span class="t-en">Most ' + peak[1] + '</span></span></div>'
        + '<div class="skpi"><span class="skpi-val">' + span + '</span><span class="skpi-lab"><span class="t-ja">記録期間</span><span class="t-cn">记录跨度</span><span class="t-en">Span</span></span></div>';
    }

    var MONTHS_EN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function formatHeatTip(yr, monthNum, count) {
      if (currentLang === "cn") return yr + " 年 " + monthNum + " 月：" + count + " 部";
      if (currentLang === "en") return (MONTHS_EN_SHORT[monthNum - 1] || ("M" + monthNum)) + " " + yr + ": " + count + (count === 1 ? " work" : " works");
      return yr + "年" + monthNum + "月：" + count + "作";
    }

    function renderHeatmap() {
      var hmEl = $("heatmap");
      var mBox = $("heatmap-mobile");
      if (!YEARS.length) {
        if (hmEl) hmEl.innerHTML = "";
        if (mBox) mBox.innerHTML = "";
        return;
      }
      var maxYr = 1;
      var peakYr = YEARS[0][0];
      YEARS.forEach(function (p) { if (p[1] > maxYr) { maxYr = p[1]; peakYr = p[0]; } });

      if (hmEl) {
        var html = '<div class="hcol-lab"></div>';
        for (var m = 1; m <= 12; m++) html += '<div class="hcol-lab">' + m + '</div>';
        html += '<div class="hcol-lab hcol-tot"><span class="t-ja">年計</span><span class="t-cn">年计</span><span class="t-en">Year</span></div>';
        YEARS.forEach(function (pair) {
          var yr = pair[0], tot = pair[1];
          var isPeak = yr === peakYr;
          var pct = Math.max(8, Math.round((tot / maxYr) * 100));
          var row = MONTHLY[String(yr)] || [0,0,0,0,0,0,0,0,0,0,0,0];
          html += '<button type="button" class="hrow-lab' + (isPeak ? ' is-peak' : '') + '" data-year="' + yr + '">' + (isPeak ? '<span class="hpeak-dot" aria-hidden="true">★</span>' : '') + yr + '</button>';
          row.forEach(function (n, i) {
            var lv = n === 0 ? 0 : n <= 6 ? 1 : n <= 14 ? 2 : n <= 21 ? 3 : 4;
            html += '<div class="hcell" data-l="' + lv + '" data-year="' + yr + '" data-month="' + (i + 1) + '" data-cnt="' + n + '"></div>';
          });
          html += '<button type="button" class="hyear-tally' + (isPeak ? ' is-peak' : '') + '" data-year="' + yr + '" title="' + yr + ': ' + tot + '">'
            + '<span class="hyear-bar"><i style="width:' + pct + '%"></i></span>'
            + '<span class="hyear-num">' + tot + '</span>'
            + '</button>';
        });
        hmEl.innerHTML = html;
        var tip = $("heat-tip");
        hmEl.querySelectorAll(".hcell").forEach(function (cell) {
          cell.addEventListener("mouseenter", function (e) {
            var yr = cell.getAttribute("data-year");
            var mo = Number(cell.getAttribute("data-month"));
            var cnt = Number(cell.getAttribute("data-cnt"));
            tip.textContent = formatHeatTip(yr, mo, cnt);
            tip.classList.add("show");
            tip.style.left = (e.clientX + 12) + "px";
            tip.style.top = (e.clientY - 34) + "px";
          });
          cell.addEventListener("mousemove", function (e) { tip.style.left = (e.clientX + 12) + "px"; tip.style.top = (e.clientY - 34) + "px"; });
          cell.addEventListener("mouseleave", function () { tip.classList.remove("show"); });
          cell.addEventListener("click", function () { openArchiveWithYear(cell.getAttribute("data-year")); });
        });
        hmEl.querySelectorAll(".hrow-lab, .hyear-tally").forEach(function (el) {
          el.addEventListener("click", function () { openArchiveWithYear(el.getAttribute("data-year")); });
        });
      }

      if (mBox) {
        var mHtml = YEARS.slice().reverse().map(function (pair, idx) {
          var yr = pair[0], tot = pair[1];
          var isPeak = yr === peakYr;
          var pct = Math.max(6, Math.round((tot / maxYr) * 100));
          var row = MONTHLY[String(yr)] || [0,0,0,0,0,0,0,0,0,0,0,0];
          var cells = row.map(function (n, i) {
            var lv = n === 0 ? 0 : n <= 6 ? 1 : n <= 14 ? 2 : n <= 21 ? 3 : 4;
            return '<div class="hm-mcell" data-l="' + lv + '"><span class="mm"><span class="t-ja">' + (i + 1) + '月</span><span class="t-cn">' + (i + 1) + '月</span><span class="t-en">' + (MONTHS_EN_SHORT[i] || (i + 1)) + '</span></span><span class="mn">' + n + '</span></div>';
          }).join("");
          return '<div class="hm-year-item' + (idx === 0 ? ' open' : '') + (isPeak ? ' is-peak' : '') + '">'
            + '<button type="button" class="hm-year-btn" aria-expanded="' + (idx === 0 ? 'true' : 'false') + '">'
            + '<span class="hm-yr">' + yr + (isPeak ? ' <i class="hpeak-dot">★</i>' : '') + '</span>'
            + '<span class="hm-bar"><i style="width:' + pct + '%"></i></span>'
            + '<span class="hm-cnt">' + tot + '<span class="t-ja">作</span><span class="t-cn">部</span><span class="t-en"></span></span>'
            + '<span class="hm-chev">▾</span>'
            + '</button>'
            + '<div class="hm-months-panel">'
            + '<div class="hm-months-grid">' + cells + '</div>'
            + '<button type="button" class="hm-arch-go" data-open-year="' + yr + '"><span class="t-ja">' + yr + '年の作品一覧を見る →</span><span class="t-cn">查看 ' + yr + ' 年作品档案 →</span><span class="t-en">View ' + yr + ' works →</span></button>'
            + '</div></div>';
        }).join("");
        mBox.innerHTML = mHtml;
      }
    }

    (function () {
      var mBox = $("heatmap-mobile");
      if (mBox) {
        mBox.addEventListener("click", function (e) {
          var go = e.target.closest("[data-open-year]");
          if (go) { openArchiveWithYear(go.getAttribute("data-open-year")); return; }
          var btn = e.target.closest(".hm-year-btn");
          if (btn) {
            var item = btn.parentElement;
            var isOpen = item.classList.toggle("open");
            btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
          }
        });
      }
    })();

    function renderTopCircles() {
      var cEl = $("circles-list");
      if (!cEl) return;
      if (!TOP_CIRCLES.length) { cEl.innerHTML = ""; return; }
      var max = TOP_CIRCLES[0][1] || 1;
      cEl.innerHTML = TOP_CIRCLES.map(function (pair, idx) {
        var rank = idx + 1;
        var rankStr = (rank < 10 ? "0" : "") + rank;
        var tier = rank <= 3 ? " rank-top" : "";
        return '<button type="button" class="circle-row-btn' + tier + '" data-circle="' + esc(pair[0]) + '">'
          + '<div class="circle-row">'
          + '<span class="crank' + tier + '">' + rankStr + '</span>'
          + '<div class="cinfo">'
          + '<div class="cinfo-top"><span class="cname">' + esc(pair[0]) + '</span><span class="cnum">' + pair[1] + '<span class="t-ja">作</span><span class="t-cn"> 部</span><span class="t-en"> works</span></span></div>'
          + '<span class="bar"><i style="width:' + Math.max(4, Math.round(pair[1] / max * 100)) + '%"></i></span>'
          + '</div>'
          + '</div>'
          + '</button>';
      }).join("");
    }
    (function () {
      var cEl = $("circles-list");
      if (cEl) {
        cEl.addEventListener("click", function (e) {
          var btn = e.target.closest("[data-circle]");
          if (btn) openArchiveWithCircle(btn.getAttribute("data-circle"));
        });
      }
    })();

    (function () {
      if (!window.fetch || window.location.protocol.indexOf("http") !== 0) return;
      fetch("./data/stats.json", { cache: "default" })
        .then(function (r) { if (!r.ok) throw new Error("stats fetch"); return r.json(); })
        .then(function (stats) {
          if (!stats || typeof stats !== "object") return;
          STATS_DATA = stats;
          var yc = stats.yearly_counts || {};
          YEARS = Object.keys(yc).sort().map(function (yr) { return [Number(yr), Number(yc[yr]) || 0]; });
          YEAR_MAP = {};
          YEARS.forEach(function (p) { YEAR_MAP[String(p[0])] = p[1]; });
          MONTHLY = stats.monthly_matrix && typeof stats.monthly_matrix === "object" ? stats.monthly_matrix : {};
          var tc = Array.isArray(stats.top_circles) ? stats.top_circles.slice(0, 10) : [];
          TOP_CIRCLES = tc.map(function (item) { return [item.circle, Number(item.count) || 0]; });
          syncDynamicWorkCounts(stats);
          renderStatsKpis();
      if (typeof window.refreshEraShowcase === "function") window.refreshEraShowcase();
          renderHeatmap();
          renderTopCircles();
          if (window.refreshOtd) window.refreshOtd();
          if (typeof WORKS !== "undefined" && WORKS && typeof buildFilterOptions === "function") buildFilterOptions();
        })
        .catch(function () {
          /* Graceful degradation: leave stats widgets empty without crashing */
        });
    })();

    /* ---------- Commemorative Days & Today's Record ---------- */
    (function () {
      var bodyEl = $("otd-body"), badgesEl = $("otd-badges");
      if (!bodyEl || !badgesEl) return;
      var pillsEl = document.querySelector(".otd-pills");

      var nowJst = new Date(Date.now() + 9 * 3600000);
      var yNow = nowJst.getUTCFullYear(), mNow = nowJst.getUTCMonth() + 1, dNow = nowJst.getUTCDate();
      var EN_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      var mEn = EN_MONTHS[mNow - 1] || ("Month " + mNow);
      function pad(n) { return (n < 10 ? "0" : "") + n; }
      var mdNow = pad(mNow) + "-" + pad(dNow);
      var dateNow = yNow + "-" + mdNow;
      var tmrD = new Date(Date.UTC(yNow, mNow - 1, dNow) + 86400000);
      var dateTmr = tmrD.getUTCFullYear() + "-" + pad(tmrD.getUTCMonth() + 1) + "-" + pad(tmrD.getUTCDate());
      function getMonthTotal() {
        var mt = 0;
        Object.keys(MONTHLY).forEach(function (yr) { mt += (MONTHLY[yr][mNow - 1] || 0); });
        return mt;
      }

      var OTD = null;     // ./data/on-this-day.json (build-generated release data)
      var MILES = null;   // /api/milestones (owner-managed commemorations)
      var ALMANAC = null; // ./data/almanac.json (curated on-this-day stories, optional)
      var curOtdKey = "today";

      function L(obj) { if (!obj) return ""; return obj[currentLang] || obj.ja || ""; }
      function LA(obj) { if (!obj) return []; return obj[currentLang] || obj.ja || []; }
      function chipHtml(c) { if (!/\p{Extended_Pictographic}/u.test(c)) c = "🔖 " + c; return '<span class="otd-chip">' + esc(c) + '</span>'; }
      function gateOk() {
        if (window.__ownerHideR18) return false;
        try { return window.localStorage.getItem("site-archive-18") === "1"; } catch (e) { return false; }
      }
      function workName(w) {
        if (gateOk() || !w.r18) return esc(w.t);
        if (currentLang === "cn") return esc(w.c) + " 的作品";
        if (currentLang === "en") return "a release from " + esc(w.c);
        return esc(w.c) + " の作品";
      }
      function monthSentence() {
        if (currentLang === "cn") return "今天是 <b>" + mNow + " 月 " + dNow + " 日</b>。过去 10 年里，仅 <b>" + mNow + " 月</b> 累计就有 <b>" + getMonthTotal() + " 部</b>作品发售。";
        if (currentLang === "en") return "Today is <b>" + mEn + " " + dNow + "</b>. Across the past decade, <b>" + getMonthTotal() + " works</b> were released in <b>" + mEn + "</b> alone.";
        return "今日は<b>" + mNow + "月" + dNow + "日</b>。これまでの10年間で、<b>" + mNow + "月</b>には合計<b>" + getMonthTotal() + "作</b>の作品が世に送り出されています。";
      }
      function monthChip() {
        if (!YEARS.length) return "";
        var span = YEARS[0][0] + "–" + YEARS[YEARS.length - 1][0];
        if (currentLang === "cn") return "🗓️ " + span + " 年 " + mNow + " 月累计：" + getMonthTotal() + " 部";
        if (currentLang === "en") return "🗓️ " + span + " " + mEn + " Total: " + getMonthTotal() + " works";
        return "🗓️ " + span + "年" + mNow + "月累計：" + getMonthTotal() + "作";
      }
      function totalsChip() {
        var w = (OTD && OTD.totals && OTD.totals.works) || (STATS_DATA && STATS_DATA.works_total);
        var c = OTD && OTD.totals ? OTD.totals.circles : null;
        if (!w) return "";
        var ws = Number(w).toLocaleString("en-US");
        if (c) {
          if (currentLang === "cn") return "🎧 DLsite 收录 " + ws + " 部 · " + c + " 个合作社团";
          if (currentLang === "en") return "🎧 " + ws + " DLsite-listed Works · " + c + " Circles";
          return "🎧 DLsite収録" + ws + "作 · " + c + "サークル";
        }
        if (currentLang === "cn") return "🎧 DLsite 收录 " + ws + " 部";
        if (currentLang === "en") return "🎧 " + ws + " DLsite-listed Works";
        return "🎧 DLsite収録" + ws + "作";
      }
      function storyRow(whenText, whatHtml, year) {
        if (year) return '<button type="button" class="otd-story" data-year-go="' + year + '"><span class="otd-story-when">' + esc(whenText) + '</span><span class="otd-story-what">' + whatHtml + '</span></button>';
        return '<div class="otd-story"><span class="otd-story-when">' + esc(whenText) + '</span><span class="otd-story-what">' + whatHtml + '</span></div>';
      }
      function almanacRows(md) {
        var rows = (ALMANAC && ALMANAC[md]) || [];
        return rows.map(function (e) {
          var n = yNow - e.y;
          var when = (md === mdNow && n > 0)
            ? L({ ja: n + "年前の今日", cn: n + " 年前的今天", en: n === 1 ? "1 year ago today" : n + " years ago today" })
            : String(e.y);
          return storyRow(when, esc((e.emoji ? e.emoji + " " : "") + L(e.text)), null);
        }).join("");
      }
      function releaseSummary(md) {
        var rows = (OTD && OTD.days && OTD.days[md]) || [];
        if (!rows.length) return "";
        var years = rows.map(function (w) { return w.y; });
        var minY = Math.min.apply(null, years), maxY = Math.max.apply(null, years);
        var range = minY === maxY ? String(minY) : minY + "–" + maxY;
        var mm = Number(md.slice(0, 2)), dd = Number(md.slice(3, 5));
        return L({
          ja: "これまで" + mm + "月" + dd + "日には" + rows.length + "作が発売されています（" + range + "年）",
          cn: "过去的 " + mm + " 月 " + dd + " 日共有 " + rows.length + " 部作品发售（" + range + " 年）",
          en: rows.length === 1
            ? "1 work was released on " + (EN_MONTHS[mm - 1] || mm) + " " + dd + " (" + range + ")"
            : rows.length + " works were released on " + (EN_MONTHS[mm - 1] || mm) + " " + dd + " in past years (" + range + ")"
        });
      }
      function storiesBlock(md, extraRows) {
        var rows = almanacRows(md) + (extraRows || "");
        var summary = releaseSummary(md);
        if (!rows && !summary) return "";
        return '<div class="otd-stories">' + rows + (summary ? '<div class="otd-more">' + esc(summary) + '</div>' : "") + '</div>';
      }
      function todayNewsRows() {
        var html = "";
        ((OTD && OTD.days && OTD.days[mdNow]) || []).forEach(function (w) {
          if (w.y === yNow) html += storyRow(L({ ja: "今日発売", cn: "今日发售", en: "Out today" }), workName(w), w.y);
        });
        ((OTD && OTD.upcoming) || []).forEach(function (u) {
          if (u.date === dateTmr) html += storyRow(L({ ja: "明日発売", cn: "明日发售", en: "Out tomorrow" }), workName(u), null);
        });
        return html;
      }
      function nextMilestone() {
        var best = null;
        var todayUtc = Date.UTC(yNow, mNow - 1, dNow);
        (MILES || []).forEach(function (m) {
          var target = null;
          if (m.md) {
            target = Date.UTC(yNow, Number(m.md.slice(0, 2)) - 1, Number(m.md.slice(3, 5)));
            if (target <= todayUtc) target = Date.UTC(yNow + 1, Number(m.md.slice(0, 2)) - 1, Number(m.md.slice(3, 5)));
          } else if (m.date) {
            var p = m.date.split("-");
            target = Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
            if (target <= todayUtc) return;
          } else return;
          var days = Math.round((target - todayUtc) / 86400000);
          if (!best || days < best.days) best = { m: m, days: days };
        });
        return best;
      }
      function renderToday() {
        var parts = [];
        var matched = (MILES || []).filter(function (m) { return m.md === mdNow || m.date === dateNow; });
        matched.forEach(function (m) { parts.push(L(m.body)); });
        var block = storiesBlock(mdNow, todayNewsRows());
        if (block) parts.push(block);
        if (!matched.length && !block) {
          parts.push(monthSentence());
          var nx = nextMilestone();
          if (nx) {
            parts.push('<div class="otd-stories">' + storyRow(
              L({ ja: "次の記念日", cn: "下一个纪念日", en: "Next milestone" }),
              esc(L(nx.m.label)) + L({ ja: "（あと" + nx.days + "日）", cn: "（还有 " + nx.days + " 天）", en: " (in " + nx.days + " days)" }),
              null) + '</div>');
          }
        }
        bodyEl.innerHTML = parts.join("");
        var chips = [];
        matched.forEach(function (m) { LA(m.chips).forEach(function (c) { chips.push(c); }); });
        var mc = monthChip(); if (mc) chips.push(mc);
        var tc = totalsChip(); if (tc) chips.push(tc);
        badgesEl.innerHTML = chips.map(chipHtml).join("");
      }
      function renderMilestone(m) {
        var parts = [L(m.body)];
        var md = m.md || (m.date ? m.date.slice(5) : null);
        if (md) {
          var block = storiesBlock(md, "");
          if (block) parts.push(block);
        }
        bodyEl.innerHTML = parts.join("");
        badgesEl.innerHTML = LA(m.chips).map(chipHtml).join("");
      }
      function renderPills() {
        if (!pillsEl) return;
        var html = '<button type="button" class="otd-pill" data-otd="today" aria-pressed="' + (curOtdKey === "today" ? "true" : "false") + '">' + L({ ja: "✨ 今日", cn: "✨ 今天", en: "✨ Today" }) + '</button>';
        (MILES || []).forEach(function (m) {
          var lbl = L(m.label);
          if (!/\p{Extended_Pictographic}/u.test(lbl)) lbl = "🔖 " + lbl;
          html += '<button type="button" class="otd-pill" data-otd="' + esc(m.id) + '" aria-pressed="' + (curOtdKey === m.id ? "true" : "false") + '">' + esc(lbl) + '</button>';
        });
        pillsEl.innerHTML = html;
      }
      function showOtd(key) {
        curOtdKey = key || curOtdKey || "today";
        renderPills();
        if (curOtdKey !== "today" && MILES) {
          for (var i = 0; i < MILES.length; i++) {
            if (MILES[i].id === curOtdKey) { renderMilestone(MILES[i]); return; }
          }
          curOtdKey = "today";
          renderPills();
        }
        renderToday();
      }
      window.refreshOtdLang = function () { showOtd(curOtdKey); };
      window.refreshOtd = function () { showOtd(curOtdKey); };
      if (pillsEl) {
        pillsEl.addEventListener("click", function (e) {
          var b = e.target.closest("[data-otd]");
          if (b) showOtd(b.getAttribute("data-otd"));
        });
      }
      bodyEl.addEventListener("click", function (e) {
        var b = e.target.closest("[data-year-go]");
        if (b) openArchiveWithYear(b.getAttribute("data-year-go"));
      });

      // First paint without data: the month summary, then enhance.
      bodyEl.innerHTML = monthSentence();
      badgesEl.innerHTML = [monthChip(), totalsChip()].map(chipHtml).join("");
      renderPills();
      Promise.all([
        fetch("./data/on-this-day.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        fetch("/api/milestones").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        fetch("./data/almanac.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      ]).then(function (res) {
        OTD = res[0];
        if (res[1] && Array.isArray(res[1].milestones)) MILES = res[1].milestones;
        ALMANAC = res[2];
        showOtd(curOtdKey);
      });
    })();

    /* ---------- Archive Data Loader (Decoupled ./data/works.json + Embedded Fallback) ---------- */
    var PAGE = 40, page = 1, filtered = [], WORKS = null, archiveReady = false;
    var includeR18 = false;
    try { includeR18 = window.localStorage.getItem("site-archive-18") === "1"; } catch (e) { includeR18 = false; }
    if (window.__ownerHideR18) includeR18 = false;

    function syncScopeUI() {
      $("seg-gen").setAttribute("aria-pressed", includeR18 ? "false" : "true");
      $("seg-all").setAttribute("aria-pressed", includeR18 ? "true" : "false");
    }
    function onWorksLoaded(list) {
      WORKS = list || [];
      buildFilterOptions();
      $("works-loading").hidden = true;
      applyFilters(true);
      if (typeof window.refreshNewsFlow === "function") window.refreshNewsFlow();
      if (typeof window.refreshAnnex === "function") window.refreshAnnex();
    }
    function loadEmbeddedArchive() {
      /* v3.0.0: removed 654KB legacy base64 fallback; Archive fetches live /data/works.json.
         No embedded data remains, so a fetch failure must surface instead of
         leaving the loading indicator up forever. */
      if (!window.ARCHIVE) window.ARCHIVE = [];
      var loading = $("works-loading");
      if (loading) loading.textContent = "データの読み込みに失敗しました。";
    }
    function ensureArchive() {
      syncScopeUI();
      if (archiveReady) return;
      archiveReady = true;
      if (window.fetch && window.location.protocol.indexOf("http") === 0) {
        fetch("./data/works.json", { cache: "default" })
          .then(function (r) { if (!r.ok) throw new Error("fallback"); return r.json(); })
          .then(function (data) { if (Array.isArray(data) && data.length > 0) onWorksLoaded(data); else loadEmbeddedArchive(); })
          .catch(loadEmbeddedArchive);
      } else {
        loadEmbeddedArchive();
      }
    }

    function buildFilterOptions() {
      if (!WORKS) return;
      var pack = I18N_UI[currentLang] || I18N_UI.ja;
      var curY = $("f-year").value, curC = $("f-circle").value;
      var yCounts = {}, cCounts = {};
      WORKS.forEach(function (r) {
        if (!includeR18 && r[11] === 2) return;
        var yr = String(r[2] || "").slice(0, 4);
        if (yr) yCounts[yr] = (yCounts[yr] || 0) + 1;
        if (r[3]) cCounts[r[3]] = (cCounts[r[3]] || 0) + 1;
      });
      var ysel = $("f-year");
      ysel.innerHTML = '<option value="">' + esc(pack.allYears) + '</option>';
      var yearList = YEARS.length ? YEARS : Object.keys(yCounts).sort().map(function (yr) { return [yr]; });
      yearList.forEach(function (pair) {
        var yr = String(pair[0]), n = yCounts[yr] || 0;
        if (!includeR18 && n === 0) return;
        var o = document.createElement("option"); o.value = yr; o.textContent = yr + "年（" + n + "）"; ysel.appendChild(o);
      });
      if (curY && yCounts[curY]) ysel.value = curY;

      var csel = $("f-circle");
      csel.innerHTML = '<option value="">' + esc(pack.allCircles) + '</option>';
      Object.keys(cCounts).map(function (k) { return [k, cCounts[k]]; })
        .sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); })
        .forEach(function (pair) {
          var o = document.createElement("option"); o.value = pair[0]; o.textContent = pair[0] + "（" + pair[1] + "）"; csel.appendChild(o);
        });
      if (curC && cCounts[curC]) csel.value = curC;
      if (typeof window.syncArchiveSelects === "function") window.syncArchiveSelects();
    }

    function openArchiveWithCircle(circle) {
      showView("archive");
      var trySetC = function () {
        if (WORKS) {
          var optExists = Array.prototype.some.call($("f-circle").options, function (o) { return o.value === circle; });
          if (optExists) { $("f-circle").value = circle; $("f-q").value = ""; }
          else { $("f-q").value = circle; }
          applyFilters(true);
        } else {
          setTimeout(trySetC, 100);
        }
      };
      trySetC();
    }

    function openArchiveWithYear(year, histMode) {
      showView("archive", null, year, histMode);
      var trySet = function () {
        if (WORKS) {
          var optExists = Array.prototype.some.call($("f-year").options, function (o) { return o.value === String(year); });
          if (optExists) $("f-year").value = String(year);
          else $("f-year").setAttribute("data-pending-year", String(year));
          applyFilters(true);
        } else {
          setTimeout(trySet, 100);
        }
      };
      trySet();
    }

    function cleanTags(raw) {
      if (!raw) return [];
      return String(raw).split("/").map(function (t) {
        t = t.trim();
        var m = t.match(/[（(]([^）)]+)[）)]/);
        return m ? m[1].trim() : t;
      }).filter(Boolean).slice(0, 6);
    }

    var AGE_LABEL = ["全年齢", "R-15", "R18"], AGE_CLS = ["gen", "r15", "r18"];
    function rowHTML(r) {
      var ageIdx = r[11] === 2 ? 2 : (r[11] === 1 ? 1 : 0);
      var tagArr = cleanTags(r[8]);
      var tagsHtml = tagArr.length ? '<div class="w-tags">' + tagArr.map(function (t) { return '<span class="w-tag">#' + esc(t) + '</span>'; }).join("") + '</div>' : '';
      var rate = r[5] ? '<div class="w-rate">★ ' + Number(r[5]).toFixed(2) + ' (' + Number(r[6] || 0).toLocaleString("ja-JP") + ') · ' + Number(r[7] || 0).toLocaleString("ja-JP") + ' DL</div>' : (r[7] ? '<div class="w-rate">' + Number(r[7]).toLocaleString("ja-JP") + ' DL</div>' : '');
      var price = r[4] != null ? '<div class="w-price">¥' + Number(r[4]).toLocaleString("ja-JP") + '</div>' : '';
      return '<article class="work-card">'
        + '<div><div class="w-rj">' + esc(r[0]) + '</div><div class="w-date">' + esc(r[2]) + '</div><span class="age-pill ' + AGE_CLS[ageIdx] + '">' + AGE_LABEL[ageIdx] + '</span></div>'
        + '<div><h3>' + esc(r[1]) + '</h3><div class="w-meta"><span class="circ">' + esc(r[3]) + '</span><span>' + esc(r[9]) + '</span></div>' + tagsHtml + '</div>'
        + '<div class="w-right"><div>' + price + rate + '</div><a class="dl-pill" href="' + esc(r[10]) + '" target="_blank" rel="noopener">DLsite ↗</a></div>'
        + '</article>';
    }

    function render() {
      var total = filtered.length, pages = Math.max(1, Math.ceil(total / PAGE));
      if (page > pages) page = pages;
      $("works-list").innerHTML = filtered.slice((page - 1) * PAGE, page * PAGE).map(rowHTML).join("");
      $("res-count").textContent = total.toLocaleString("ja-JP");
      $("works-empty").hidden = total !== 0;

      var selY = $("f-year").value || $("f-year").getAttribute("data-pending-year") || "";
      var banner = $("year-unlock-banner");
      var lang = currentLang || "ja";
      if (!includeR18 && selY && YEAR_MAP[selY]) {
        $("year-unlock-text").textContent = lang === "cn"
          ? selY + " 年当前显示全年龄・R-15 作品 " + total + " 部（全年共 " + YEAR_MAP[selY] + " 部）。"
          : (lang === "en"
            ? "Showing " + total + " all-ages/R-15 works from " + selY + " (out of " + YEAR_MAP[selY] + " total)."
            : selY + "年は全年齢・R-15の " + total + " 作を表示中（全 " + YEAR_MAP[selY] + " 作中）。");
        banner.hidden = false;
      } else {
        banner.hidden = true;
      }
      var parts = [];
      if (!includeR18) parts.push(lang === "cn" ? "仅全年龄・R-15" : (lang === "en" ? "All-Ages & R-15 only" : "全年齢・R-15のみ"));
      if ($("f-year").value) parts.push(lang === "en" ? $("f-year").value : $("f-year").value + "年");
      if ($("f-circle").value) parts.push($("f-circle").value);
      if ($("f-q").value.trim()) parts.push("「" + $("f-q").value.trim() + "」");
      var pgLabel = lang === "cn" ? ("第 " + page + " / " + pages + " 页") : (lang === "en" ? ("Page " + page + " / " + pages) : ("ページ " + page + " / " + pages));
      $("res-hint").textContent = (parts.length ? parts.join(" · ") + " · " : "") + pgLabel;
      renderPager(pages);
    }

    function renderPager(pages) {
      var p = $("pager");
      if (pages <= 1) { p.innerHTML = ""; return; }
      var nums = [];
      function add(n) { if (nums.indexOf(n) === -1) nums.push(n); }
      add(1); add(pages);
      for (var i = page - 2; i <= page + 2; i++) if (i >= 1 && i <= pages) add(i);
      nums.sort(function (a, b) { return a - b; });
      var html = '<button type="button" id="pg-prev" ' + (page <= 1 ? "disabled" : "") + '>←</button>';
      var last = 0;
      nums.forEach(function (n) {
        if (last && n - last > 1) html += '<span style="color:var(--muted);padding:0 4px;">…</span>';
        html += '<button type="button" data-page="' + n + '" ' + (n === page ? 'aria-current="page"' : "") + '>' + n + '</button>';
        last = n;
      });
      html += '<button type="button" id="pg-next" ' + (page >= pages ? "disabled" : "") + '>→</button>';
      p.innerHTML = html;
      p.querySelectorAll("[data-page]").forEach(function (b) { b.addEventListener("click", function () { page = parseInt(b.getAttribute("data-page"), 10); render(); scrollToList(); }); });
      var prev = $("pg-prev"), next = $("pg-next");
      if (prev) prev.addEventListener("click", function () { page--; render(); scrollToList(); });
      if (next) next.addEventListener("click", function () { page++; render(); scrollToList(); });
    }
    function scrollToList() {
      var y = $("works-list").getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: Math.max(0, y), behavior: reduced ? "auto" : "smooth" });
    }
    function applyFilters(reset) {
      if (!WORKS) return;
      var q = $("f-q").value.trim().toLowerCase(), y = $("f-year").value, c = $("f-circle").value, s = $("f-sort").value;
      if (!$("view-archive").hidden) updateHash("archive", y);
      filtered = WORKS.filter(function (r) {
        if (!includeR18 && r[11] === 2) return false;
        if (y && r[2].indexOf(y) !== 0) return false;
        if (c && r[3] !== c) return false;
        if (q && (r[1] + " " + r[3] + " " + r[0] + " " + r[8]).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      filtered.sort(function (a, b) {
        if (s === "new") return a[2] < b[2] ? 1 : -1;
        if (s === "old") return a[2] > b[2] ? 1 : -1;
        if (s === "rate") return (b[5] || 0) - (a[5] || 0) || (b[6] || 0) - (a[6] || 0);
        if (s === "sales") return (b[7] || 0) - (a[7] || 0);
        if (s === "cheap") return (a[4] == null ? 1e9 : a[4]) - (b[4] == null ? 1e9 : b[4]);
        if (s === "exp") return (b[4] || 0) - (a[4] || 0);
        return 0;
      });
      if (reset) page = 1;
      if (typeof window.syncArchiveSelects === "function") window.syncArchiveSelects();
      render();
    }

    /* ---------- Archive Editorial Custom Dropdowns (aligned with /admin .p-select) ---------- */
    (function () {
      var controlsBar = document.querySelector(".arch-controls");
      var SELECT_IDS = ["f-year", "f-circle", "f-sort"];
      var instances = [];

      function getFieldTitle(sel) {
        var lbl = document.querySelector('label[for="' + sel.id + '"]');
        if (!lbl) return "";
        var lang = document.body.getAttribute("data-lang") || "ja";
        var span = lbl.querySelector(".t-" + lang);
        return (span ? span.textContent : lbl.textContent).trim();
      }

      function closeAllArchiveMenus() {
        instances.forEach(function (inst) {
          inst.wrap.classList.remove("is-open");
          inst.trigger.setAttribute("aria-expanded", "false");
          inst.menu.hidden = true;
        });
        if (controlsBar) controlsBar.classList.remove("has-open-menu");
      }

      function syncInstance(inst) {
        var sel = inst.sel;
        var opts = Array.prototype.slice.call(sel.options || []);
        var activeOpt = opts[sel.selectedIndex] || opts[0];
        inst.valEl.textContent = activeOpt ? activeOpt.textContent : "";
        inst.headTitleEl.textContent = getFieldTitle(sel);
        inst.countEl.textContent = String(opts.length);
        inst.listEl.innerHTML = opts.map(function (o, idx) {
          var isSel = o.value === sel.value;
          return '<button type="button" class="w-opt' + (isSel ? " is-selected" : "") + '" role="option" aria-selected="' + (isSel ? "true" : "false") + '" data-opt-idx="' + idx + '">' +
            '<span class="w-opt-text">' + esc(o.textContent) + '</span>' +
            '<span class="w-opt-check" aria-hidden="true">✓</span></button>';
        }).join("");
        inst.listEl.querySelectorAll(".w-opt").forEach(function (btn) {
          btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            var idx = parseInt(btn.getAttribute("data-opt-idx"), 10);
            var targetOpt = sel.options[idx];
            if (!targetOpt) return;
            sel.value = targetOpt.value;
            closeAllArchiveMenus();
            syncInstance(inst);
            sel.dispatchEvent(new Event("change", { bubbles: true }));
          });
        });
      }

      SELECT_IDS.forEach(function (id) {
        var sel = $(id);
        if (!sel || sel.dataset.enhanced === "1") return;
        sel.dataset.enhanced = "1";
        var wrap = document.createElement("div");
        wrap.className = "w-select";
        sel.parentNode.insertBefore(wrap, sel);
        sel.classList.add("w-native-select");
        sel.setAttribute("tabindex", "-1");
        sel.setAttribute("aria-hidden", "true");
        wrap.appendChild(sel);

        var trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "w-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        trigger.innerHTML = '<span class="w-trig-val"></span><span class="w-chev" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>';

        var menu = document.createElement("div");
        menu.className = "w-menu";
        menu.hidden = true;
        menu.innerHTML = '<div class="w-menu-head"><span class="w-menu-title"></span><span class="w-menu-count">0</span></div><div class="w-menu-list" role="listbox"></div>';

        wrap.appendChild(trigger);
        wrap.appendChild(menu);

        var inst = {
          sel: sel,
          wrap: wrap,
          trigger: trigger,
          menu: menu,
          valEl: trigger.querySelector(".w-trig-val"),
          headTitleEl: menu.querySelector(".w-menu-title"),
          countEl: menu.querySelector(".w-menu-count"),
          listEl: menu.querySelector(".w-menu-list")
        };
        instances.push(inst);

        trigger.addEventListener("click", function (ev) {
          ev.stopPropagation();
          var willOpen = menu.hidden;
          closeAllArchiveMenus();
          if (willOpen) {
            syncInstance(inst);
            wrap.classList.add("is-open");
            trigger.setAttribute("aria-expanded", "true");
            menu.hidden = false;
            if (controlsBar) controlsBar.classList.add("has-open-menu");
            var selItem = inst.listEl.querySelector(".w-opt.is-selected");
            if (selItem && typeof selItem.scrollIntoView === "function") {
              selItem.scrollIntoView({ block: "nearest" });
            }
          }
        });

        var lbl = document.querySelector('label[for="' + id + '"]');
        if (lbl) {
          lbl.addEventListener("click", function (ev) {
            ev.preventDefault();
            trigger.focus();
            trigger.click();
          });
        }

        syncInstance(inst);
      });

      document.addEventListener("click", function (ev) {
        if (!ev.target.closest || !ev.target.closest(".w-select")) closeAllArchiveMenus();
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") closeAllArchiveMenus();
      });

      window.syncArchiveSelects = function () {
        instances.forEach(syncInstance);
      };
    })();

    var debounce;
    $("f-q").addEventListener("input", function () { clearTimeout(debounce); debounce = setTimeout(function () { applyFilters(true); }, 200); });
    $("f-year").addEventListener("change", function () { $("f-year").removeAttribute("data-pending-year"); applyFilters(true); });
    $("f-circle").addEventListener("change", function () { applyFilters(true); });
    $("f-sort").addEventListener("change", function () { applyFilters(true); });

    function setScope(all) {
      includeR18 = all;
      var pendingY = $("f-year").getAttribute("data-pending-year");
      syncScopeUI();
      buildFilterOptions();
      if (all && pendingY) { $("f-year").value = pendingY; $("f-year").removeAttribute("data-pending-year"); }
      applyFilters(true);
      if (typeof window.refreshAnnex === "function") window.refreshAnnex();
    }
    window.__forceScopeNoR18 = function () {
      try { window.localStorage.removeItem("site-archive-18"); } catch (e) {}
      if (includeR18) setScope(false);
      var g = $("gate"); if (g) g.hidden = true;
    };
    function requestR18() {
      if (includeR18 || window.__ownerHideR18) return;
      var remembered = false;
      try { remembered = window.localStorage.getItem("site-archive-18") === "1"; } catch (e) {}
      if (remembered) { setScope(true); return; }
      $("gate").hidden = false; $("gate-yes").focus();
    }
    $("seg-gen").addEventListener("click", function () { setScope(false); });
    $("seg-all").addEventListener("click", requestR18);
    $("year-unlock-btn").addEventListener("click", requestR18);
    $("gate-yes").addEventListener("click", function () { try { window.localStorage.setItem("site-archive-18", "1"); } catch (e) {} $("gate").hidden = true; setScope(true); });
    $("gate-no").addEventListener("click", function () { $("gate").hidden = true; });
    $("gate").addEventListener("click", function (e) { if (e.target === $("gate")) $("gate").hidden = true; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("gate").hidden = true; });


    /* ---------- v3.0.4.1 Split-Track Carousel (Uniform 2x2 Main Track + Dedicated 4-Col Shorts Shelf) ---------- */
    (function initNewsFlowModule() {
      var trackEl = $("flow-track");
      var viewportEl = $("flow-viewport");
      var pillsEl = $("flow-pills");
      var dotsEl = $("flow-dots");
      var stageEl = $("news-flow-stage");

      var shortsStage = $("shorts-shelf-stage");
      var shortsViewport = $("shorts-viewport");
      var shortsTrack = $("shorts-track");
      var shortsDots = $("shorts-dots");
      if (!trackEl || !stageEl) return;

      // Evergreen curated official 16:9 videos used to supplement /data/videos.json so standard pages never run short
      var CURATED_VIDEOS = [
        {
          id: "SAMPLE_VIDEO_ID",
          title: "【サンプル】Sample Video Title",
          url: "https://www.youtube.com/watch?v=SAMPLE_VIDEO_ID",
          published_at: "2026-01-01",
          thumbnail: "https://i.ytimg.com/vi/SAMPLE_VIDEO_ID/maxresdefault.jpg",
          tag_ja: "公式オリジナル MV", tag_cn: "官方原创 MV", tag_en: "Official Music Video"
        }
      ];

      var FALLBACK_MILESTONES = [
        { id: "account-anniv", mmdd: "01-30", since: 2017, ja: "アカウント記念日（1月30日）", cn: "账号周年纪念日（1月30日）", en: "Account Anniversary (Jan 30)" },
        { id: "circle-anniv", mmdd: "04-01", since: 2021, ja: "自社サークル「つばめいと」記念日（4月1日）", cn: "自社团「つばめいと」纪念日（4月1日）", en: "Circle “Tsubameito” Anniversary (Apr 1)" },
        { id: "birthday", mmdd: "10-21", since: null, ja: "お誕生日（10月21日）", cn: "生日纪念（10月21日）", en: "Birthday (Oct 21)" },
        { id: "first-flight", mmdd: "10-24", since: 2026, ja: "初ソロイベント「FIRST FLIGHT」記念日（10月24日）", cn: "首次个人活动「FIRST FLIGHT」纪念日（10月24日）", en: "Solo Event “FIRST FLIGHT” Anniversary (Oct 24)" }
      ];

      var flowRaw = { videos: CURATED_VIDEOS.slice(), upcoming: [], releases: [], milestones: FALLBACK_MILESTONES };
      var FLOW_CATS = ["videos"];
      var flowFilter = "videos";
      var flowPage = 0;
      var shortsPage = 0;
      var autoTimer = null;
      var shortsTimer = null;
      var hovered = false;
      var shortsHovered = false;
      var touchStartX = null;
      var shortsTouchX = null;

      function isR18Open() {
        if (window.__ownerHideR18) return false;
        try { return window.localStorage.getItem("site-archive-18") === "1"; } catch (e) { return false; }
      }
      function safeWorkTitle(title, circle, isR18) {
        if (isR18Open() || !isR18) return title;
        if (currentLang === "cn") return circle + " 合作新作";
        if (currentLang === "en") return "Release with " + circle;
        return circle + " の作品";
      }
      function jstTodayParts() {
        var jst = new Date(Date.now() + 9 * 3600000);
        return { y: jst.getUTCFullYear(), m: jst.getUTCMonth() + 1, d: jst.getUTCDate() };
      }
      function daysUntilDateStr(isoDate) {
        if (!isoDate || isoDate.length < 10) return null;
        var p = isoDate.split("-");
        var t = jstTodayParts();
        var todayUtc = Date.UTC(t.y, t.m - 1, t.d);
        var tgtUtc = Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        return Math.round((tgtUtc - todayUtc) / 86400000);
      }
      function daysUntilMmdd(mmdd) {
        var t = jstTodayParts();
        var todayUtc = Date.UTC(t.y, t.m - 1, t.d);
        var mm = Number(mmdd.slice(0, 2)), dd = Number(mmdd.slice(3, 5));
        var tgt = Date.UTC(t.y, mm - 1, dd);
        if (tgt < todayUtc) tgt = Date.UTC(t.y + 1, mm - 1, dd);
        return Math.round((tgt - todayUtc) / 86400000);
      }
      function extractYtId(v) {
        if (v.id) return String(v.id);
        var m = String(v.url || "").match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
        return m ? m[1] : "";
      }
      function isShortVideo(v) {
        if (v.is_short === true || String(v.type || "").toLowerCase() === "short" || String(v.tag || "").toLowerCase() === "shorts") return true;
        if (v.is_short === false) return false;
        if (/\/shorts\//i.test(String(v.url || ""))) return true;
        if (/#shorts\b/i.test(String(v.title || ""))) return true;
        return false;
      }

      function applyFlagshipOverride(cfg) {
        if (!cfg || !cfg.flagship) return;
        var f = cfg.flagship;
        var card = $("flagship-countdown");
        if (!card) return;
        if (f.active_until) {
          var remain = daysUntilDateStr(f.active_until);
          if (remain !== null && remain < 0) { card.hidden = true; return; }
        }
        if (f.target_date) {
          var ts = new Date(f.target_date.indexOf("T") > 0 ? f.target_date : (f.target_date + "T20:00:00+09:00")).getTime();
          if (!isNaN(ts)) {
            target = ts;
            tick();
          }
        }
      }

      function chunkPages(items, pp) {
        if (!items.length) return [];
        var out = [];
        for (var i = 0; i < items.length; i += pp) {
          var slice = items.slice(i, i + pp);
          if (items.length > pp && slice.length < pp) {
            var need = pp - slice.length;
            for (var k = 0; k < need; k++) slice.push(items[k % items.length]);
          }
          out.push(slice);
        }
        return out;
      }

      function splitVideos() {
        var stdVids = [];
        var shortVids = [];
        var seenStd = {};

        function toItem(v, shortFlag) {
          var ytId = extractYtId(v);
          var thumb = shortFlag
            ? (v.hd_thumbnail || (ytId ? ("https://i.ytimg.com/vi/" + ytId + "/oar2.jpg") : (v.thumbnail || "")))
            : (v.hd_thumbnail || (ytId ? ("https://i.ytimg.com/vi/" + ytId + "/maxresdefault.jpg") : (v.thumbnail || "")));
          return {
            kind: shortFlag ? "short" : "video",
            ytId: ytId,
            url: v.url || (ytId ? (shortFlag ? ("https://www.youtube.com/shorts/" + ytId) : ("https://www.youtube.com/watch?v=" + ytId)) : "#"),
            thumb: thumb,
            fallbackThumb: v.thumbnail || (ytId ? ("https://i.ytimg.com/vi/" + ytId + "/hqdefault.jpg") : ""),
            duration: v.duration || "",
            date: v.published_at || "",
            title: v.title || "",
            sub: currentLang === "cn" ? (v.tag_cn || "官方 YouTube 视频") : (currentLang === "en" ? (v.tag_en || "Official YouTube Video") : (v.tag_ja || "公式 YouTube 動画")),
            badge: { ja: "公式動画", cn: "官方视频", en: "OFFICIAL VIDEO" }
          };
        }

        (flowRaw.videos || []).forEach(function (v) {
          var sf = isShortVideo(v);
          var item = toItem(v, sf);
          if (sf) {
            shortVids.push(item);
          } else {
            if (item.ytId) seenStd[item.ytId] = true;
            stdVids.push(item);
          }
        });

        // Supplement standard 16:9 videos from evergreen curated pool so Page 1 is always full 4/4 (and never repeats prematurely)
        if (stdVids.length < 8) {
          CURATED_VIDEOS.forEach(function (cv) {
            if (stdVids.length >= 8) return;
            var id = extractYtId(cv);
            if (id && seenStd[id]) return;
            if (id) seenStd[id] = true;
            stdVids.push(toItem(cv, false));
          });
        }

        return { stdVids: stdVids, shortVids: shortVids };
      }

      function buildMainPages(targetFilter) {
        var split = splitVideos();
        var stdVids = split.stdVids;

        var upc = (flowRaw.upcoming || []).slice().sort(function (a, b) {
          var da = a[2] || "9999-99-99", db = b[2] || "9999-99-99";
          return da < db ? -1 : (da > db ? 1 : 0);
        }).slice(0, 6).map(function (u) {
          var dLeft = daysUntilDateStr(u[2]);
          var dTag = "";
          if (dLeft !== null && dLeft >= 0 && dLeft <= 45) {
            dTag = dLeft === 0
              ? (currentLang === "cn" ? "今日发售" : (currentLang === "en" ? "OUT TODAY" : "本日発売"))
              : ("D-" + dLeft);
          }
          var isR18 = u[11] === 2;
          return {
            kind: "upcoming",
            url: u[10] || "#",
            date: u[2] || (currentLang === "cn" ? "发售日待定" : (currentLang === "en" ? "Date TBA" : "発売日未定")),
            pill: dTag,
            title: safeWorkTitle(u[1], u[3], isR18),
            sub: (u[3] || "") + (u[0] ? (" · " + u[0]) : ""),
            badge: { ja: "発売予定", cn: "即将发售", en: "UPCOMING" }
          };
        });

        var rels = (flowRaw.releases || []).slice(0, 6).map(function (r) {
          var isR18 = r[11] === 2;
          var yr = r[2] ? r[2].slice(0, 4) : "";
          return {
            kind: "release",
            year: yr,
            date: r[2] || "",
            title: safeWorkTitle(r[1], r[3], isR18),
            sub: (r[3] || "") + (r[0] ? (" · " + r[0]) : ""),
            badge: { ja: "最新収録", cn: "最新收录", en: "NEW RELEASE" }
          };
        });

        var mergedRel = [];
        var maxR = Math.max(upc.length, rels.length);
        for (var rIdx = 0; rIdx < maxR; rIdx++) {
          if (upc[rIdx]) mergedRel.push(upc[rIdx]);
          if (rels[rIdx]) mergedRel.push(rels[rIdx]);
        }

        var miles = (flowRaw.milestones || []).map(function (m) {
          var dLeft = m.mmdd ? daysUntilMmdd(m.mmdd) : daysUntilDateStr(m.date);
          var label = m[currentLang] || m.ja || m.cn || m.en || "";
          var dTxt = dLeft === 0
            ? (currentLang === "cn" ? "就是今天" : (currentLang === "en" ? "TODAY" : "本日"))
            : (currentLang === "cn" ? ("还有 " + dLeft + " 天") : (currentLang === "en" ? ("In " + dLeft + " days") : ("あと " + dLeft + " 日")));
          return {
            kind: "milestone",
            days: dLeft === null ? 999 : dLeft,
            date: m.mmdd || m.date || "",
            pill: dLeft === 0 ? "TODAY" : ("D-" + dLeft),
            title: label,
            sub: dTxt,
            badge: { ja: "記念日", cn: "纪念日", en: "MILESTONE" }
          };
        }).sort(function (a, b) { return a.days - b.days; });

        var isMobile = (window.innerWidth || 1200) <= 680;
        var stdPP = isMobile ? 2 : 4;

        var stdPages = chunkPages(stdVids, stdPP);
        var relPages = chunkPages(mergedRel, stdPP);
        var milePages = chunkPages(miles, stdPP);

        var f = targetFilter || flowFilter;
        if (f === "releases") return relPages;
        if (f === "milestones") return milePages;
        return stdPages;
      }

      function cardHTML(item) {
        if (item.kind === "short") {
          return '<a class="short-yt-card" data-yt-play="1" data-yt-id="' + esc(item.ytId) + '" data-yt-short="1" data-yt-title="' + esc(item.title) + '" href="' + esc(item.url) + '" target="_blank" rel="noopener">'
            + '<div class="short-yt-poster">'
            + (item.thumb ? '<img src="' + esc(item.thumb) + '" data-yt-id="' + esc(item.ytId) + '" data-yt-short="1" data-yt-fb="' + esc(item.fallbackThumb) + '" alt="' + esc(item.title) + '" loading="lazy" />' : '')
            + '<span class="short-yt-badge" aria-hidden="true">Shorts</span>'
            + '<span class="play-bubble play-bubble-sm" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span>'
            + '</div>'
            + '<div class="short-yt-cap">'
            +   '<div class="short-yt-title">' + esc(item.title) + '</div>'
            +   '<div class="short-yt-meta"><span>' + esc(item.date) + '</span><span>Shorts ↗</span></div>'
            + '</div></a>';
        }

        var badgeTxt = item.badge[currentLang] || item.badge.ja;
        var kindCls = "flow-card flow-kind-" + item.kind;
        var headMeta = '<div class="flow-card-top">'
          + '<span class="flow-badge flow-badge-' + item.kind + '">' + esc(badgeTxt) + '</span>'
          + (item.pill ? '<span class="flow-dtag">' + esc(item.pill) + '</span>' : (item.date ? '<span class="flow-date">' + esc(item.date) + '</span>' : ''))
          + '</div>';

        if (item.kind === "video") {
          return '<a class="' + kindCls + '" data-yt-play="1" data-yt-id="' + esc(item.ytId) + '" data-yt-short="0" data-yt-title="' + esc(item.title) + '" href="' + esc(item.url) + '" target="_blank" rel="noopener">'
            + '<div class="flow-thumb">'
            + (item.thumb ? '<img src="' + esc(item.thumb) + '" data-yt-id="' + esc(item.ytId) + '" data-yt-short="0" data-yt-fb="' + esc(item.fallbackThumb) + '" alt="' + esc(item.title) + '" loading="lazy" />' : '')
            + '<span class="play-bubble" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span>'
            + (item.duration ? '<span class="flow-dur">' + esc(item.duration) + '</span>' : '')
            + '</div>'
            + '<div class="flow-body">' + headMeta
            + '<div class="flow-title">' + esc(item.title) + '</div>'
            + '<div class="flow-foot"><span>' + esc(item.sub) + '</span><span>YouTube ↗</span></div>'
            + '</div></a>';
        }
        if (item.kind === "upcoming") {
          return '<a class="' + kindCls + '" href="' + esc(item.url) + '" target="_blank" rel="noopener">'
            + '<div class="flow-body flow-body-editorial">' + headMeta
            + '<div class="flow-title">' + esc(item.title) + '</div>'
            + '<div class="flow-sub">' + esc(item.sub) + '</div>'
            + '<div class="flow-foot"><span>' + esc(item.date) + '</span><span>DLsite ↗</span></div>'
            + '</div></a>';
        }
        if (item.kind === "release") {
          return '<button type="button" class="' + kindCls + '" data-flow-year="' + esc(item.year) + '">'
            + '<div class="flow-body flow-body-editorial">' + headMeta
            + '<div class="flow-title">' + esc(item.title) + '</div>'
            + '<div class="flow-sub">' + esc(item.sub) + '</div>'
            + '<div class="flow-foot"><span>' + esc(item.date) + '</span><span>'
            + (currentLang === "cn" ? "档案中查看 →" : (currentLang === "en" ? "View in Archive →" : "アーカイブで見る →"))
            + '</span></div>'
            + '</div></button>';
        }
        return '<a class="' + kindCls + '" href="#history">'
          + '<div class="flow-body flow-body-editorial">' + headMeta
          + '<div class="flow-title">' + esc(item.title) + '</div>'
          + '<div class="flow-sub">' + esc(item.sub) + '</div>'
          + '<div class="flow-foot"><span>' + esc(item.date) + '</span><span>'
          + (currentLang === "cn" ? "十年轨迹 ↓" : (currentLang === "en" ? "10-Year History ↓" : "10年の軌跡 ↓"))
          + '</span></div>'
          + '</div></a>';
      }

      // Upgraded HD thumbnail fallback chain: maxresdefault (1280x720) -> sddefault (640x480) -> hqdefault (480x360)
      function attachThumbFallbacks(container) {
        container.querySelectorAll("img[data-yt-id]").forEach(function (img) {
          var ytId = img.getAttribute("data-yt-id");
          var isShort = img.getAttribute("data-yt-short") === "1";
          var fb = img.getAttribute("data-yt-fb") || (ytId ? ("https://i.ytimg.com/vi/" + ytId + "/hqdefault.jpg") : "");
          var step = 0;

          function tryNext() {
            step++;
            if (isShort) {
              if (step === 1 && ytId) {
                img.src = "https://i.ytimg.com/vi/" + ytId + "/maxresdefault.jpg";
              } else if (step === 2 && ytId) {
                img.src = "https://i.ytimg.com/vi/" + ytId + "/sddefault.jpg";
                img.classList.add("short-crop-43");
              } else if (step === 3 && fb) {
                img.src = fb;
                img.classList.add("short-crop-43");
              }
            } else {
              if (step === 1 && ytId) {
                img.src = "https://i.ytimg.com/vi/" + ytId + "/sddefault.jpg";
                img.classList.add("vid-crop-43");
              } else if (step === 2 && fb && img.src !== fb) {
                img.src = fb;
                img.classList.add("vid-crop-43");
              }
            }
          }

          img.addEventListener("error", tryNext);
          img.addEventListener("load", function () {
            if (img.naturalWidth && img.naturalWidth <= 120 && step < 3) {
              tryNext();
            } else if (!isShort && img.naturalWidth && img.naturalHeight && (img.naturalWidth / img.naturalHeight) < 1.5) {
              img.classList.add("vid-crop-43");
            }
          });
        });
      }

      function renderMainFlow(dir) {
        var pages = buildMainPages();
        if (!pages.length) { trackEl.innerHTML = ""; if (dotsEl) dotsEl.innerHTML = ""; return; }
        if (flowPage >= pages.length) flowPage = 0;
        var items = pages[flowPage];

        trackEl.classList.remove("flow-anim-next", "flow-anim-prev");
        trackEl.innerHTML = items.map(cardHTML).join("");
        attachThumbFallbacks(trackEl);

        if (!reduced && (dir === "next" || dir === "prev")) {
          void trackEl.offsetWidth;
          trackEl.classList.add(dir === "next" ? "flow-anim-next" : "flow-anim-prev");
        }

        trackEl.querySelectorAll("[data-flow-year]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var y = btn.getAttribute("data-flow-year");
            if (y && typeof openArchiveWithYear === "function") openArchiveWithYear(y);
            else if (typeof showView === "function") showView("archive");
          });
        });

        if (dotsEl) {
          if (pages.length <= 1) {
            dotsEl.innerHTML = "";
          } else {
            var dotsHtml = "";
            for (var d = 0; d < pages.length; d++) {
              dotsHtml += '<button type="button" class="flow-dot' + (d === flowPage ? " is-active" : "") + '" data-flow-dot="' + d + '" aria-label="Page ' + (d + 1) + ' / ' + pages.length + '"></button>';
            }
            dotsEl.innerHTML = dotsHtml;
            dotsEl.querySelectorAll("[data-flow-dot]").forEach(function (dot) {
              dot.addEventListener("click", function () {
                var nextIdx = parseInt(dot.getAttribute("data-flow-dot"), 10) || 0;
                if (nextIdx === flowPage) return;
                var dDir = nextIdx > flowPage ? "next" : "prev";
                flowPage = nextIdx;
                renderMainFlow(dDir);
                resetMainAuto();
              });
            });
          }
        }
      }

      function renderShortsShelf(dir) {
        if (!shortsStage || !shortsTrack) return;
        var shortVids = splitVideos().shortVids;
        if (!shortVids.length) {
          shortsStage.hidden = true;
          return;
        }
        shortsStage.hidden = false;
        var pages = chunkPages(shortVids, 4);
        if (shortsPage >= pages.length) shortsPage = 0;

        shortsTrack.classList.remove("flow-anim-next", "flow-anim-prev");
        shortsTrack.innerHTML = pages[shortsPage].map(cardHTML).join("");
        attachThumbFallbacks(shortsTrack);

        if (!reduced && (dir === "next" || dir === "prev")) {
          void shortsTrack.offsetWidth;
          shortsTrack.classList.add(dir === "next" ? "flow-anim-next" : "flow-anim-prev");
        }

        if (shortsDots) {
          if (pages.length <= 1) {
            shortsDots.innerHTML = "";
          } else {
            var html = "";
            for (var d = 0; d < pages.length; d++) {
              html += '<button type="button" class="flow-dot' + (d === shortsPage ? " is-active" : "") + '" data-short-dot="' + d + '" aria-label="Shorts Page ' + (d + 1) + ' / ' + pages.length + '"></button>';
            }
            shortsDots.innerHTML = html;
            shortsDots.querySelectorAll("[data-short-dot]").forEach(function (dot) {
              dot.addEventListener("click", function () {
                var nextIdx = parseInt(dot.getAttribute("data-short-dot"), 10) || 0;
                if (nextIdx === shortsPage) return;
                var dDir = nextIdx > shortsPage ? "next" : "prev";
                shortsPage = nextIdx;
                renderShortsShelf(dDir);
                resetShortsAuto();
              });
            });
          }
        }
      }

      function syncFlowPills() {
        if (!pillsEl) return;
        pillsEl.querySelectorAll("[data-flow-filter]").forEach(function (b) {
          b.setAttribute("aria-selected", b.getAttribute("data-flow-filter") === flowFilter ? "true" : "false");
        });
      }

      function stepMain(delta) {
        flowFilter = "videos";
        var pages = buildMainPages("videos");
        if (pages.length <= 1) return;
        flowPage = (flowPage + delta + pages.length) % pages.length;
        renderMainFlow(delta >= 0 ? "next" : "prev");
      }

      function stepShorts(delta) {
        var shortVids = splitVideos().shortVids;
        var pages = chunkPages(shortVids, 4);
        if (pages.length <= 1) return;
        shortsPage = (shortsPage + delta + pages.length) % pages.length;
        renderShortsShelf(delta >= 0 ? "next" : "prev");
      }

      function resetMainAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        if (!reduced) {
          autoTimer = setInterval(function () {
            if (!hovered && !document.hidden) stepMain(1);
          }, 7000);
        }
      }

      function resetShortsAuto() {
        if (shortsTimer) { clearInterval(shortsTimer); shortsTimer = null; }
        if (!reduced) {
          shortsTimer = setInterval(function () {
            if (!shortsHovered && !document.hidden) stepShorts(1);
          }, 8500);
        }
      }

      if (pillsEl) {
        pillsEl.querySelectorAll("[data-flow-filter]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            flowFilter = btn.getAttribute("data-flow-filter") || "videos";
            flowPage = 0;
            syncFlowPills();
            renderMainFlow("next");
            resetMainAuto();
          });
        });
      }

      stageEl.addEventListener("mouseenter", function () { hovered = true; });
      stageEl.addEventListener("mouseleave", function () { hovered = false; });
      stageEl.addEventListener("focusin", function () { hovered = true; });
      stageEl.addEventListener("focusout", function () { hovered = false; });

      if (shortsStage) {
        shortsStage.addEventListener("mouseenter", function () { shortsHovered = true; });
        shortsStage.addEventListener("mouseleave", function () { shortsHovered = false; });
        shortsStage.addEventListener("focusin", function () { shortsHovered = true; });
        shortsStage.addEventListener("focusout", function () { shortsHovered = false; });
      }

      if (viewportEl) {
        viewportEl.addEventListener("touchstart", function (e) {
          if (e.touches && e.touches.length === 1) touchStartX = e.touches[0].clientX;
        }, { passive: true });
        viewportEl.addEventListener("touchend", function (e) {
          if (touchStartX === null || !e.changedTouches || !e.changedTouches.length) return;
          var dx = e.changedTouches[0].clientX - touchStartX;
          touchStartX = null;
          if (Math.abs(dx) > 42) { stepMain(dx < 0 ? 1 : -1); resetMainAuto(); }
        }, { passive: true });
      }

      if (shortsViewport) {
        shortsViewport.addEventListener("touchstart", function (e) {
          if (e.touches && e.touches.length === 1) shortsTouchX = e.touches[0].clientX;
        }, { passive: true });
        shortsViewport.addEventListener("touchend", function (e) {
          if (shortsTouchX === null || !e.changedTouches || !e.changedTouches.length) return;
          var dx = e.changedTouches[0].clientX - shortsTouchX;
          shortsTouchX = null;
          if (Math.abs(dx) > 42) { stepShorts(dx < 0 ? 1 : -1); resetShortsAuto(); }
        }, { passive: true });
      }

      var lastMob = (window.innerWidth || 1200) <= 680;
      window.addEventListener("resize", function () {
        var curMob = (window.innerWidth || 1200) <= 680;
        if (curMob !== lastMob) { lastMob = curMob; flowPage = 0; renderMainFlow(); }
      });
      window.refreshNewsFlow = function () { renderMainFlow(); renderShortsShelf(); };


      /* v3.0.5.0 Official YouTube Lite-Embed Lightbox (honors /admin flag external_youtube_only) */
      var ytLb = $("yt-lightbox");
      var ytCard = $("yt-lb-card");
      var ytTitle = $("yt-lb-title");
      var ytIframe = $("yt-lb-iframe");
      var ytExt = $("yt-lb-ext");
      var ytClose = $("yt-lb-close");

      function openYtLightbox(ytId, title, url, isShort) {
        if (!ytLb || !ytIframe || !ytId) return false;
        if (ytCard) ytCard.classList.toggle("is-short-mode", !!isShort);
        if (ytTitle) ytTitle.textContent = title || "";
        if (ytExt) ytExt.href = url || ("https://www.youtube.com/watch?v=" + ytId);
        ytIframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(ytId) + "?autoplay=1&rel=0";
        ytLb.hidden = false;
        hovered = true;
        shortsHovered = true;
        if (ytClose) ytClose.focus();
        return true;
      }

      function closeYtLightbox() {
        if (!ytLb) return;
        ytLb.hidden = true;
        if (ytIframe) ytIframe.src = "";
        hovered = false;
        shortsHovered = false;
      }

      if (ytClose) ytClose.addEventListener("click", closeYtLightbox);
      if (ytLb) {
        ytLb.addEventListener("click", function (e) { if (e.target === ytLb) closeYtLightbox(); });
      }
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && ytLb && !ytLb.hidden) closeYtLightbox();
      });

      function bindYtPlayClicks(container) {
        if (!container) return;
        container.addEventListener("click", function (e) {
          var a = e.target.closest('a[data-yt-play="1"]');
          if (!a) return;
          if (window.__externalYoutubeOnly !== false) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
          var ytId = a.getAttribute("data-yt-id");
          if (!ytId) return;
          if (openYtLightbox(ytId, a.getAttribute("data-yt-title") || "", a.getAttribute("href"), a.getAttribute("data-yt-short") === "1")) {
            e.preventDefault();
          }
        });
      }
      bindYtPlayClicks(trackEl);
      bindYtPlayClicks(shortsTrack);

      renderMainFlow();
      renderShortsShelf();
      resetMainAuto();
      resetShortsAuto();

      fetch("./data/videos.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var list = Array.isArray(d) ? d : (d && Array.isArray(d.videos) ? d.videos : null);
        if (list && list.length) { flowRaw.videos = list; renderMainFlow(); renderShortsShelf(); }
      }).catch(function () {});

      fetch("./data/upcoming.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (Array.isArray(d) && d.length) { flowRaw.upcoming = d; renderMainFlow(); }
      }).catch(function () {});

      fetch("./data/works.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (Array.isArray(d) && d.length) {
          var sorted = d.slice().sort(function (a, b) {
            var da = a[2] || "", db = b[2] || "";
            return da > db ? -1 : (da < db ? 1 : 0);
          });
          flowRaw.releases = sorted.slice(0, 6);
          renderMainFlow();
        }
      }).catch(function () {});

      fetch("./data/milestones.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d) return;
        applyFlagshipOverride(d);
        var list = Array.isArray(d) ? d : (Array.isArray(d.milestones) ? d.milestones : null);
        if (list && list.length) { flowRaw.milestones = list; renderMainFlow(); }
      }).catch(function () {});
    })();

    /* ---------- v3.0.3.0 Subordinate Other-Platform Exclusives Annex (/data/annex-works.json) ---------- */
    (function initAnnexModule() {
      var secEl = $("annex-sec");
      var listEl = $("annex-list");
      var gateBar = $("annex-gate-bar");
      var gateMsg = $("annex-gate-msg");
      var unlockBtn = $("annex-unlock-btn");
      if (!secEl || !listEl) return;

      var ANNEX = [];

      function normalizeEntry(e) {
        return {
          title: e.title || "",
          circle: e.circle || "",
          platform: e.platform || "OTHER",
          url: e.url || e.platform_url || "",
          id: e.id || e.platform_id || "",
          date: e.date || e.release_date || "",
          r18: typeof e.r18 === "boolean" ? e.r18 : (String(e.platform || "").toUpperCase() === "FANZA")
        };
      }

      function renderAnnex() {
        if (!ANNEX.length) { secEl.hidden = true; return; }
        secEl.hidden = false;
        var total = ANNEX.length;
        if ($("annex-cnt-ja")) $("annex-cnt-ja").textContent = total;
        if ($("annex-cnt-cn")) $("annex-cnt-cn").textContent = total;
        if ($("annex-cnt-en")) $("annex-cnt-en").textContent = total;

        var visible = ANNEX.filter(function (e) { return includeR18 || !e.r18; });
        var hiddenCount = total - visible.length;

        if (gateBar && gateMsg) {
          if (hiddenCount > 0 && !window.__ownerHideR18) {
            gateBar.hidden = false;
            gateMsg.textContent = currentLang === "cn"
              ? ("另有 " + hiddenCount + " 部 R18 附表作品当前隐藏（需确认年龄后查看）。")
              : (currentLang === "en"
                ? (hiddenCount + " R18 annex entries are hidden until age confirmation.")
                : ("ほか " + hiddenCount + " 作のR18収録分は年齢確認後に表示されます。"));
          } else {
            gateBar.hidden = true;
          }
        }

        listEl.innerHTML = visible.map(function (e) {
          var titleHtml = e.url
            ? '<a class="annex-link" href="' + esc(e.url) + '" target="_blank" rel="noopener">' + esc(e.title) + ' <span aria-hidden="true">↗</span></a>'
            : '<span class="annex-link">' + esc(e.title) + '</span>';
          return '<div class="annex-row">'
            + '<div class="annex-meta">'
            +   '<span class="annex-plat">' + esc(e.platform) + '</span>'
            +   (e.date ? '<span class="annex-date">' + esc(e.date) + '</span>' : '')
            +   (e.id ? '<span class="annex-id">' + esc(e.id) + '</span>' : '')
            + '</div>'
            + '<div class="annex-main">'
            +   '<div class="annex-name">' + titleHtml + '</div>'
            +   (e.circle ? '<div class="annex-circle">' + esc(e.circle) + '</div>' : '')
            + '</div>'
            + '</div>';
        }).join("");
      }

      if (unlockBtn) unlockBtn.addEventListener("click", requestR18);
      window.refreshAnnex = renderAnnex;

      fetch("./data/annex-works.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var list = Array.isArray(d) ? d : (d && Array.isArray(d.entries) ? d.entries : (d && Array.isArray(d.works) ? d.works : null));
        if (list && list.length) {
          ANNEX = list.map(normalizeEntry).sort(function (a, b) {
            return (a.date || "") > (b.date || "") ? -1 : ((a.date || "") < (b.date || "") ? 1 : 0);
          });
          renderAnnex();
        }
      }).catch(function () {});
    })();

    if (window.location.hash.indexOf("#archive") === 0) {
      var ym = window.location.hash.match(/year=(\d{4})/);
      if (ym) openArchiveWithYear(ym[1], "replace");
      else showView("archive", null, null, "replace");
    } else if (window.location.hash.indexOf("#history") === 0) {
      showView("history", null, null, "replace");
    } else if (window.location.hash.indexOf("#about") === 0) {
      showView("about", null, null, "replace");
    }
  })();
    // === v1.5.0 Living Kinetic Typography (Character-Split Ripple + Acoustic Chime Wave) ===
    (function initKineticTitle() {
      const stage = document.getElementById("hero-kinetic-title");
      if (!stage) return;
      const chars = Array.from(stage.querySelectorAll(".kt-char"));
      const bars = Array.from(document.querySelectorAll(".kt-bar"));
      const playedSet = new Set();
      const glyphs = ["♪", "✦", "˚", "✧"];
      let chimeCtx = null;
      let chimeLastAt = 0;

      function playChime(freq, vol) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          if (!chimeCtx) chimeCtx = new AC();
          if (chimeCtx.state === "suspended") chimeCtx.resume();
          const now = chimeCtx.currentTime;
          const o1 = chimeCtx.createOscillator();
          const o2 = chimeCtx.createOscillator();
          const g = chimeCtx.createGain();
          const g2 = chimeCtx.createGain();
          o1.type = "sine";
          o2.type = "triangle";
          o1.frequency.setValueAtTime(freq, now);
          o2.frequency.setValueAtTime(freq * 2, now);
          g2.gain.value = 0.16;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(vol || 0.068, now + 0.014);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
          o1.connect(g);
          o2.connect(g2);
          g2.connect(g);
          g.connect(chimeCtx.destination);
          o1.start(now);
          o2.start(now);
          o1.stop(now + 0.75);
          o2.stop(now + 0.75);
          chimeLastAt = Date.now();
          setTimeout(function () {
            if (chimeCtx && Date.now() - chimeLastAt >= 800 && chimeCtx.state === "running") { try { chimeCtx.suspend(); } catch (e) {} }
          }, 880);
        } catch (e) {}
      }

      function spawnNotes(btn, color) {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.35;
        for (let i = 0; i < 4; i++) {
          const p = document.createElement("span");
          p.className = "kt-particle";
          p.textContent = glyphs[i % glyphs.length];
          p.style.color = color;
          p.style.left = (cx + (Math.random() - 0.5) * 26) + "px";
          p.style.top = (cy + (Math.random() - 0.5) * 14) + "px";
          p.style.setProperty("--dx", ((Math.random() - 0.5) * 52).toFixed(1) + "px");
          p.style.setProperty("--dy", (-28 - Math.random() * 34).toFixed(1) + "px");
          p.style.setProperty("--dr", ((Math.random() - 0.5) * 50).toFixed(0) + "deg");
          document.body.appendChild(p);
          setTimeout(() => p.remove(), 920);
        }
      }

      function applyNeighborRipple(centerIdx) {
        chars.forEach((el, idx) => {
          const d = idx - centerIdx;
          if (d === 0) {
            el.style.setProperty("--nx", "0px");
            el.style.setProperty("--ny", "-10px");
            el.style.setProperty("--nr", "0deg");
            el.style.setProperty("--nsx", "1.07");
            el.style.setProperty("--nsy", "1.07");
            el.classList.add("is-active");
          } else if (Math.abs(d) === 1) {
            el.style.setProperty("--nx", (d * 4.5) + "px");
            el.style.setProperty("--ny", "-3.5px");
            el.style.setProperty("--nr", (d * 3.2) + "deg");
            el.style.setProperty("--nsx", "1.02");
            el.style.setProperty("--nsy", "1.02");
            el.classList.remove("is-active");
          } else {
            el.style.removeProperty("--nx");
            el.style.removeProperty("--ny");
            el.style.removeProperty("--nr");
            el.style.removeProperty("--nsx");
            el.style.removeProperty("--nsy");
            el.classList.remove("is-active");
          }
        });
      }

      function clearRipple() {
        chars.forEach((el) => {
          el.style.removeProperty("--nx");
          el.style.removeProperty("--ny");
          el.style.removeProperty("--nr");
          el.style.removeProperty("--nsx");
          el.style.removeProperty("--nsy");
          el.classList.remove("is-active");
        });
      }

      function triggerWaveFinale() {
        chars.forEach((el, idx) => {
          setTimeout(() => {
            el.classList.remove("is-bouncing", "is-wave");
            void el.offsetWidth;
            el.classList.add("is-wave");
            const f = parseFloat(el.dataset.freq || "523.25");
            playChime(f * 1.5, 0.045);
            spawnNotes(el, el.dataset.color || (THEME_NOTE_COLORS[getSiteTheme()] || "#e08d03"));
          }, idx * 85);
        });
        setTimeout(() => {
          playedSet.clear();
          bars.forEach((b) => b.classList.remove("lit"));
        }, 1450);
      }

      chars.forEach((btn, idx) => {
        btn.addEventListener("mouseenter", () => applyNeighborRipple(idx));
        btn.addEventListener("click", () => {
          btn.classList.remove("is-bouncing", "is-wave");
          void btn.offsetWidth;
          btn.classList.add("is-bouncing");
          const freq = parseFloat(btn.dataset.freq || "523.25");
          const color = btn.dataset.color || (THEME_NOTE_COLORS[getSiteTheme()] || "#e08d03");
          playChime(freq, 0.072);
          spawnNotes(btn, color);
          playedSet.add(idx);
          if (bars[idx]) bars[idx].classList.add("lit");
          if (playedSet.size === chars.length) {
            setTimeout(triggerWaveFinale, 220);
          }
        });
        btn.addEventListener("animationend", (e) => {
          if (e.animationName === "ktElasticBounce" || e.animationName === "ktWaveDance") {
            btn.classList.remove("is-bouncing", "is-wave");
          }
        });
      });

      stage.addEventListener("mouseleave", clearRipple);
    })();
    // === v1.6.0 Tactile Logo Bounce + Soft Crystal Chime (Decoupled from Bird Trigger) ===
    (function initHeroLogoTap() {
      const stage = document.getElementById("hero-logo-switcher");
      if (!stage) return;
      const notes = [523.25, 587.33, 659.25, 783.99, 880.00];
      let idx = 0, ctx = null, logoLastAt = 0;

      function chime() {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          if (!ctx) ctx = new AC();
          if (ctx.state === "suspended") ctx.resume();
          const f = notes[idx++ % notes.length];
          const now = ctx.currentTime;
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(f, now);
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
          o.connect(g); g.connect(ctx.destination);
          o.start(now); o.stop(now + 0.68);
          logoLastAt = Date.now();
          setTimeout(function () {
            if (ctx && Date.now() - logoLastAt >= 700 && ctx.state === "running") { try { ctx.suspend(); } catch (e) {} }
          }, 780);
        } catch (e) {}
      }

      stage.addEventListener("click", () => {
        stage.classList.remove("is-pop");
        void stage.offsetWidth;
        stage.classList.add("is-pop");
        chime();
      });
    })();


  
    // === v2.9.4 Live State (/api/state) + Guest Contact Window / Straight-to-Admin Redirect ===
    (function initOwnerConsoleAndState() {
      const trigger = document.getElementById("owner-console-trigger");
      const modal = document.getElementById("owner-modal");
      const closeGuest = document.getElementById("owner-modal-close");
      const goLink = document.getElementById("owner-oauth-go");
      const localHint = document.getElementById("owner-local-hint");
      const viewGuest = document.getElementById("owner-view-guest");
      const noticeBanner = document.getElementById("owner-notice-banner");
      const noticeText = document.getElementById("owner-notice-text");

      const isLiveOrigin = window.location.protocol === "https:" || window.location.hostname === "localhost";
      let liveState = { hide_r18: false, custom_notice: "", kill_switch: false };

      function applyPublicState(st) {
        if (!st || typeof st !== "object") return;
        liveState = Object.assign(liveState, st);
        if (noticeBanner && noticeText) {
          const msg = (liveState.custom_notice || "").trim();
          if (msg) {
            noticeText.textContent = msg;
            noticeBanner.hidden = false;
          } else {
            noticeBanner.hidden = true;
          }
        }
        window.__ownerHideR18 = !!liveState.hide_r18;
        window.__externalYoutubeOnly = (liveState.flags && typeof liveState.flags.external_youtube_only === "boolean") ? liveState.flags.external_youtube_only : true;
        var otdEl = document.getElementById("otd-strip");
        if (otdEl) otdEl.hidden = liveState.flags ? liveState.flags.hide_almanac === true : false;
        ["seg-all", "year-unlock-btn"].forEach(function (bid) {
          var bb = document.getElementById(bid);
          if (bb) bb.style.display = liveState.hide_r18 ? "none" : "";
        });
        if (liveState.hide_r18 && window.__forceScopeNoR18) window.__forceScopeNoR18();
        if (typeof window.refreshOtd === "function") window.refreshOtd();
      }

      async function fetchPublicState() {
        if (!isLiveOrigin) return;
        try {
          const r = await fetch("/api/state", { cache: "no-store" });
          if (r.ok) applyPublicState(await r.json());
        } catch (_) {}
      }

      // If already signed in as a verified owner, go straight to /admin; otherwise show the guest contact window
      async function openModalOrAdmin() {
        if (isLiveOrigin) {
          try {
            const r = await fetch("/api/owner/me", { cache: "no-store", credentials: "same-origin" });
            if (r.ok) {
              const data = await r.json();
              if (data && data.ok) {
                window.location.href = "/admin";
                return;
              }
            }
          } catch (_) {}
        }
        if (!modal) return;
        if (viewGuest) viewGuest.hidden = false;
        if (localHint) localHint.style.display = "none";
        modal.hidden = false;
      }

      function closeModal() {
        if (!modal || modal.hidden || modal.classList.contains("is-closing")) return;
        if (typeof window.playTsubameSe === "function") window.playTsubameSe("close");
        if (window.location.hash === "#owner") {
          history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          modal.hidden = true;
          return;
        }
        modal.classList.add("is-closing");
        setTimeout(function () {
          modal.classList.remove("is-closing");
          modal.hidden = true;
        }, 185);
      }

      if (trigger) trigger.addEventListener("click", openModalOrAdmin);
      document.querySelectorAll("[data-open-owner-modal]").forEach(function (btn) {
        btn.addEventListener("click", openModalOrAdmin);
      });
      if (closeGuest) closeGuest.addEventListener("click", closeModal);
      if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal && !modal.hidden) closeModal(); });

      if (goLink) {
        goLink.addEventListener("click", (e) => {
          if (!isLiveOrigin) {
            e.preventDefault();
            if (localHint) localHint.style.display = "block";
          }
        });
      }

      // Initial public state fetch + straight-to-admin check on /#owner OAuth return
      fetchPublicState();
      if (window.location.hash === "#owner") openModalOrAdmin();
    })();

    // === v2.1.0 Floating Back-to-Top Pill ===
    (function initBackTop() {
      const btn = document.getElementById("back-top-btn");
      if (!btn) return;
      const onScroll = () => {
        btn.classList.toggle("is-show", window.scrollY > 420);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    })();


  
    /* ---------- v2.9.4 Audiophile Micro-SE Engine (Throttled, Vinyl-Warm & Properly Wired) ---------- */
    (function initTsubameSeEngine() {
      var seCtx = null;
      var seBuffers = {};
      var seGen = 0;
      var seAudioCache = {};
      var seRealMissing = {};
      var lastPlayed = {};
      var SE_COOLDOWN_MS = 68;
      var SE_FILES = {
        swallow: "./audio/se-swallow.mp3",
        dial: "./audio/se-dial.mp3",
        pop: "./audio/se-pop.mp3"
      };
      var isHttp = window.location.protocol === "https:" || window.location.protocol === "http:";

      function getSeCtx() {
        if (!seCtx) {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return null;
          seCtx = new Ctx();
        }
        if (seCtx.state === "suspended") { try { seCtx.resume(); } catch (_) {} }
        return seCtx;
      }

      // Release the audio session as soon as the SE burst is over, so the OS
      // does not keep ducking the user's background music (v1.3.12.6).
      function scheduleSeSuspend(delayMs) {
        var gen = seGen;
        setTimeout(function () {
          if (gen !== seGen) return;
          if (seCtx && seCtx.state === "running") { try { seCtx.suspend(); } catch (_) {} }
        }, delayMs);
      }

      function ensureSeBuffer(kind) {
        var ctx = getSeCtx();
        if (!ctx || seBuffers[kind]) return;
        if (typeof fetch !== "function" || !ctx.decodeAudioData) { seRealMissing[kind] = true; return; }
        fetch(SE_FILES[kind]).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          return ctx.decodeAudioData(buf);
        }).then(function (decoded) {
          seBuffers[kind] = decoded;
        }).catch(function () { seRealMissing[kind] = true; });
      }

      function playBufferSe(kind) {
        var ctx = getSeCtx();
        if (!ctx || !seBuffers[kind]) { playSynthSe(kind); scheduleSeSuspend(500); return; }
        var src = ctx.createBufferSource();
        src.buffer = seBuffers[kind];
        var g = ctx.createGain();
        g.gain.value = 0.14;
        src.connect(g); g.connect(ctx.destination);
        src.start(0);
        scheduleSeSuspend(seBuffers[kind].duration * 1000 + 90);
      }

      function playSynthSe(kind) {
        var ctx = getSeCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        if (kind === "dial") {
          // Soft 32ms Japanese hi-fi turntable detent / cardstock page-turn tick
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          var f = ctx.createBiquadFilter();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(185, now + 0.03);
          f.type = "lowpass";
          f.frequency.setValueAtTime(1150, now);
          g.gain.setValueAtTime(0.0008, now);
          g.gain.linearRampToValueAtTime(0.062, now + 0.0035);
          g.gain.exponentialRampToValueAtTime(0.0006, now + 0.034);
          osc.connect(f); f.connect(g); g.connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.038);
        } else if (kind === "pop") {
          // Warm 58ms felt-mallet marimba bloom with subtle octave shimmer
          var o2 = ctx.createOscillator(), o2h = ctx.createOscillator();
          var g2 = ctx.createGain(), g2h = ctx.createGain();
          o2.type = "sine";
          o2.frequency.setValueAtTime(520, now);
          o2.frequency.exponentialRampToValueAtTime(780, now + 0.052);
          g2.gain.setValueAtTime(0.0008, now);
          g2.gain.linearRampToValueAtTime(0.054, now + 0.007);
          g2.gain.exponentialRampToValueAtTime(0.0006, now + 0.064);
          o2h.type = "sine";
          o2h.frequency.setValueAtTime(1040, now);
          o2h.frequency.exponentialRampToValueAtTime(1560, now + 0.048);
          g2h.gain.setValueAtTime(0.0004, now);
          g2h.gain.linearRampToValueAtTime(0.012, now + 0.006);
          g2h.gain.exponentialRampToValueAtTime(0.0004, now + 0.05);
          o2.connect(g2); g2.connect(ctx.destination);
          o2h.connect(g2h); g2h.connect(ctx.destination);
          o2.start(now); o2.stop(now + 0.068);
          o2h.start(now); o2h.stop(now + 0.054);
        } else if (kind === "close") {
          // Gentle 48ms descending felt-settle tone
          var oc = ctx.createOscillator(), gc = ctx.createGain();
          oc.type = "sine";
          oc.frequency.setValueAtTime(600, now);
          oc.frequency.exponentialRampToValueAtTime(400, now + 0.045);
          gc.gain.setValueAtTime(0.0008, now);
          gc.gain.linearRampToValueAtTime(0.038, now + 0.006);
          gc.gain.exponentialRampToValueAtTime(0.0006, now + 0.052);
          oc.connect(gc); gc.connect(ctx.destination);
          oc.start(now); oc.stop(now + 0.056);
        } else if (kind === "swallow") {
          // Delicate two-note crystal windchime (C6 -> G6) with airy tail
          [1046.5, 1568.0].forEach(function (freq, idx) {
            var t = now + idx * 0.072;
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.0006, t);
            g.gain.linearRampToValueAtTime(0.05, t + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0005, t + 0.34);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + 0.36);
          });
        }
      }

      window.playTsubameSe = function (kind) {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        var nowMs = Date.now();
        if (lastPlayed[kind] && (nowMs - lastPlayed[kind]) < SE_COOLDOWN_MS) return;
        lastPlayed[kind] = nowMs;
        seGen++;
        // v1.3.12.6: SE go through WebAudio only (no <audio> elements) and the
        // context is suspended right after each burst, so background music in
        // other apps is not ducked by a lingering media session.
        if (isHttp && SE_FILES[kind] && !seRealMissing[kind]) {
          if (seBuffers[kind]) { playBufferSe(kind); return; }
          ensureSeBuffer(kind);
        }
        playSynthSe(kind);
        scheduleSeSuspend(500);
      };

      // Wire cleanly to key tactile interactions
      var swBtn = document.getElementById("swallow-btn");
      if (swBtn) swBtn.addEventListener("click", function () { window.playTsubameSe("swallow"); });

      var dialEl = document.getElementById("year-dial");
      if (dialEl) dialEl.addEventListener("click", function (e) {
        if (e.target.closest(".dial-btn")) window.playTsubameSe("dial");
      });
      ["seg-gen", "seg-all", "mem-prev", "mem-next"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener("click", function () { window.playTsubameSe("dial"); });
      });
      document.querySelectorAll("[data-view], [data-goto]").forEach(function (el) {
        el.addEventListener("click", function () { window.playTsubameSe("dial"); });
      });
      ["lang-btn", "owner-console-trigger"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener("click", function () { window.playTsubameSe("pop"); });
      });
      document.querySelectorAll("[data-lang-opt]").forEach(function (el) {
        el.addEventListener("click", function () { window.playTsubameSe("pop"); });
      });
    })();

    /* ---------- v2.9.4 Editorial Scroll Choreography, Stagger & Glass Navbar Progress ---------- */
    (function initEditorialMotionCraft() {
      var navEl = document.querySelector("nav");
      var progEl = null;
      if (navEl && !document.getElementById("scroll-progress")) {
        progEl = document.createElement("div");
        progEl.id = "scroll-progress";
        progEl.setAttribute("aria-hidden", "true");
        navEl.appendChild(progEl);
      }

      var rafPending = false;
      function updateScrollChrome() {
        rafPending = false;
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        if (navEl) navEl.classList.toggle("is-scrolled", y > 24);
        if (progEl) {
          var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          var ratio = Math.min(1, Math.max(0, y / maxScroll));
          progEl.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
        }
      }
      function onScroll() {
        if (!rafPending) {
          rafPending = true;
          window.requestAnimationFrame(updateScrollChrome);
        }
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      updateScrollChrome();

      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!("IntersectionObserver" in window)) return;

      document.documentElement.classList.add("js-motion-ready");
      var secs = Array.prototype.slice.call(document.querySelectorAll(".folder-sec"));
      secs.forEach(function (sec) {
        sec.classList.add("reveal-ready");
        var items = sec.querySelectorAll(".starter-card, .link-card, .yt-card");
        items.forEach(function (it, idx) {
          it.classList.add("reveal-item");
          it.style.setProperty("--stagger-i", String(Math.min(idx, 6)));
        });
      });

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var sec = entry.target;
          sec.classList.add("is-revealed");
          io.unobserve(sec);
          // Unlock 0ms instant hover after entrance stagger settles
          setTimeout(function () {
            sec.querySelectorAll(".reveal-item").forEach(function (it) {
              it.classList.add("is-hover-ready");
            });
          }, 720);
        });
      }, { threshold: 0.06, rootMargin: "0px 0px -36px 0px" });

      secs.forEach(function (sec) { io.observe(sec); });
    })();
