(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tri(arr) { return '<span class="t-ja">' + esc(arr[0]) + '</span><span class="t-cn">' + esc(arr[1]) + '</span><span class="t-en">' + esc(arr[2]) + '</span>'; }
  function fmt(n) { return Number(n || 0).toLocaleString("en-US"); }

  /* ---------- Language (syncs main site localStorage + live /admin switcher) ---------- */
  var LANG_KEY = "fansite-lang";
  var savedLang = "ja";
  try { savedLang = localStorage.getItem(LANG_KEY) || "ja"; } catch (e) {}
  if (savedLang !== "ja" && savedLang !== "cn" && savedLang !== "en") savedLang = "ja";
  document.body.setAttribute("data-lang", savedLang);
  function syncLangMenuUI(lang) {
    document.querySelectorAll("[data-admin-lang-opt]").forEach(function (b) {
      b.setAttribute("aria-checked", b.getAttribute("data-admin-lang-opt") === lang ? "true" : "false");
    });
  }
  syncLangMenuUI(savedLang);
  function closeAdminLangMenu() {
    var m = $("admin-lang-menu"), b = $("admin-lang-btn");
    if (m) m.hidden = true;
    if (b) b.setAttribute("aria-expanded", "false");
  }
  function applyAdminLang(lang, persist) {
    if (lang !== "ja" && lang !== "cn" && lang !== "en") lang = "ja";
    savedLang = lang;
    document.body.setAttribute("data-lang", savedLang);
    syncLangMenuUI(savedLang);
    if (persist) { try { localStorage.setItem(LANG_KEY, savedLang); } catch (e) {} }
    if (typeof applyPlaceholders === "function") applyPlaceholders();
    if (typeof syncLangRenderedUI === "function") syncLangRenderedUI();
  }
  if ($("admin-lang-btn") && $("admin-lang-menu")) {
    $("admin-lang-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      var m = $("admin-lang-menu"), open = !m.hidden;
      m.hidden = open;
      this.setAttribute("aria-expanded", open ? "false" : "true");
    });
    document.querySelectorAll("[data-admin-lang-opt]").forEach(function (b) {
      b.addEventListener("click", function () {
        var lang = b.getAttribute("data-admin-lang-opt");
        closeAdminLangMenu();
        applyAdminLang(lang, true);
      });
    });
    document.addEventListener("click", function (e) {
      var m = $("admin-lang-menu"), b = $("admin-lang-btn");
      if (m && !m.hidden && !m.contains(e.target) && b && e.target !== b && !b.contains(e.target)) {
        closeAdminLangMenu();
      }
    });
  }

  /* ---------- Dual-Theme Controller (Yuzu default <-> Coral, synced via localStorage) ---------- */
  var THEME_KEY = "site_theme";
  var THEMES = ["yuzu", "coral"];
  var THEME_META = { yuzu: "#DA8C03", coral: "#D94B2B" };
  var THEME_BIRDS = {
    yuzu: "/assets/brand/admin-theme-bird-yuzu.png",
    coral: "/assets/brand/admin-theme-bird-coral.png"
  };
  var isThemeTransitioning = false;
  var lastThemeSwitchAt = 0;
  function getAdminTheme() {
    var t = document.documentElement.dataset.theme;
    return THEMES.indexOf(t) >= 0 ? t : "yuzu";
  }
  function applyAdminTheme(th, persist) {
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
    var birdSrc = THEME_BIRDS[next];
    document.querySelectorAll(".title-mark-bird").forEach(function (img) { img.setAttribute("src", birdSrc); });
  }
  function toggleAdminThemeWithRipple(ev, el) {
    var now = Date.now();
    if (isThemeTransitioning || now - lastThemeSwitchAt < 720) return;
    lastThemeSwitchAt = now;
    var next = THEMES[(THEMES.indexOf(getAdminTheme()) + 1) % THEMES.length];
    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || typeof document.startViewTransition !== "function") {
      applyAdminTheme(next, true);
      return;
    }
    var rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    var cx = (ev && typeof ev.clientX === "number" && ev.clientX > 0) ? ev.clientX : (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
    var cy = (ev && typeof ev.clientY === "number" && ev.clientY > 0) ? ev.clientY : (rect ? rect.top + rect.height / 2 : 48);
    var endR = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
    isThemeTransitioning = true;
    var safetyTimer = setTimeout(function () { isThemeTransitioning = false; }, 900);
    var vt = document.startViewTransition(function () { applyAdminTheme(next, true); });
    vt.ready.then(function () {
      document.documentElement.animate(
        { clipPath: ["circle(0px at " + cx + "px " + cy + "px)", "circle(" + endR + "px at " + cx + "px " + cy + "px)"] },
        { duration: 640, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(function () {});
    vt.finished.finally(function () { clearTimeout(safetyTimer); isThemeTransitioning = false; });
  }
  applyAdminTheme(getAdminTheme(), false);
  window.addEventListener("storage", function (ev) {
    if (ev.key === THEME_KEY) {
      applyAdminTheme(ev.newValue === "coral" ? "coral" : "yuzu", false);
    } else if (ev.key === LANG_KEY && (ev.newValue === "ja" || ev.newValue === "cn" || ev.newValue === "en")) {
      applyAdminLang(ev.newValue, false);
    }
  });

  function triText(arr) {
    if (!Array.isArray(arr)) return String(arr || "");
    var idx = savedLang === "cn" ? 1 : (savedLang === "en" ? 2 : 0);
    return arr[idx] != null ? arr[idx] : arr[0];
  }

  /* ---------- Toast + Inline Status Feedback ---------- */
  var toastTimer = null;
  function showToast(arr, kind) {
    var t = $("admin-toast");
    if (!t || !arr) return;
    t.textContent = triText(arr);
    t.className = "admin-toast is-show" + (kind === "ok" ? " is-ok" : (kind === "err" ? " is-err" : ""));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-show"); }, 2800);
  }
  function st(el, arr, isErr) {
    if (el) {
      el.innerHTML = arr ? tri(arr) : "";
      el.className = "status " + (arr ? (isErr ? "err" : "ok") : "");
    }
    if (arr) showToast(arr, isErr ? "err" : "ok");
  }

  var PH = {
    ja: { notice: "お知らせ文を入力…", recDate: "日付 (例: 2026-11-23)", recTitle: "タイトル（任意・120字まで）", recBody: "非公開メモを入力（5,000字まで）…", otherBody: "具体的な箇所やご要望があればご記入ください（空欄のままでも送信できます）…", msDate: "日付（毎年: 10-21 / 一度きり: 2026-12-10）", almSearch: "年鑑をキーワード・月日（例: 04-01）で検索…" },
    cn: { notice: "输入公告文字…", recDate: "日期（如 2026-11-23）", recTitle: "标题（可选，120 字内）", recBody: "输入私密便签（5,000 字内）…", otherBody: "如有具体位置或补充说明请在此填写（留空也可直接发送）…", msDate: "日期（每年: 10-21 / 仅一次: 2026-12-10）", almSearch: "按关键词或日期（如 04-01）检索年鉴故事…" },
    en: { notice: "Type a notice…", recDate: "Date (e.g. 2026-11-23)", recTitle: "Title (optional, up to 120 chars)", recBody: "Write a private note (up to 5,000 chars)…", otherBody: "Write any specific details here (or leave blank to send as-is)…", msDate: "Date (yearly: 10-21 / one-off: 2026-12-10)", almSearch: "Filter almanac by keyword or MM-DD…" }
  };
  function applyPlaceholders() {
    var p = PH[savedLang] || PH.ja;
    if ($("notice-input")) $("notice-input").placeholder = p.notice;
    if ($("rec-date")) $("rec-date").placeholder = p.recDate;
    if ($("rec-title")) $("rec-title").placeholder = p.recTitle;
    if ($("rec-body")) $("rec-body").placeholder = p.recBody;
    if ($("msg-other-input")) $("msg-other-input").placeholder = p.otherBody;
    if ($("ms-date")) $("ms-date").placeholder = p.msDate;
    if ($("alm-search")) $("alm-search").placeholder = p.almSearch;
  }
  applyPlaceholders();

  /* ---------- Strings ---------- */
  var S = {
    failed: ["操作に失敗しました", "操作失败", "Operation failed"],
    connErr: ["通信エラーが発生しました。", "通讯出错了。", "Connection error."],
    applied: ["反映しました。", "已应用。", "Applied."],
    closed: ["サイトを閉じました。すべてのページが公式サイトへ転送されます。", "网站已关闭，所有页面将跳转到官方网站。", "The site is closed. Every page now redirects to the official site."],
    opened: ["サイトを再開しました。", "网站已重新打开。", "The site is open again."],
    armClose: ["もう一度押すとサイト全体が閉じます。", "再按一次将关闭整个网站。", "Press once more to close the whole site."],
    armOpen: ["もう一度押すとサイトが再開します。", "再按一次将重新打开网站。", "Press once more to reopen the site."],
    r18Hidden: ["現在：R18は非表示です（年齢確認も無効）", "当前：R18 已隐藏（年龄确认也已禁用）", "Now: R18 is hidden (age gate disabled)"],
    r18Shown: ["現在：R18は年齢確認のうえ表示できます", "当前：R18 通过年龄确认后可显示", "Now: R18 can be shown after age confirmation"],
    r18HideBtn: ["R18を隠す", "隐藏 R18", "Hide R18"],
    r18ShowBtn: ["R18の表示を許可する", "允许显示 R18", "Allow R18"],
    preparing: ["ソースZIPを準備しています…", "正在准备源码 ZIP…", "Preparing the source ZIP…"],
    downloaded: ["ソースZIPをダウンロードしました。", "源码 ZIP 已下载。", "Source ZIP downloaded."],
    dlFailed: ["ダウンロードに失敗しました。再ログインをお試しください。", "下载失败，请重新登录后再试。", "Download failed. Please sign in again."],
    emptyRecords: ["まだメモはありません。", "还没有便签。", "No notes yet."],
    emptyMessages: ["まだメッセージはありません。", "还没有消息。", "No messages yet."],
    msEmpty: ["記念日はまだ登録されていません。", "尚未登记纪念日。", "No milestones registered yet."],
    msSaved: ["記念日を保存しました。", "纪念日已保存。", "Milestone saved."],
    msUpdated: ["記念日を更新しました。", "纪念日已更新。", "Milestone updated."],
    msDeleted: ["記念日を削除しました。", "纪念日已删除。", "Milestone deleted."],
    msResetArm: ["もう一度「初期の記念日に戻す」を押すと、すべての記念日が初期値に戻ります。", "再按一次「恢复默认纪念日」，所有纪念日将重置为默认值。", "Press once more to reset all milestones to the defaults."],
    msResetDone: ["初期の記念日に戻しました。", "已恢复默认纪念日。", "Milestones reset to the defaults."],
    msJaReq: ["日本語のラベルと本文を入力してください。", "请填写日语标签与正文。", "Please fill in the Japanese label and body."],
    msDateReq: ["日付は「10-21」または「2026-12-10」の形式で入力してください。", "日期请用「10-21」或「2026-12-10」格式。", "Use a date like “10-21” or “2026-12-10”."],
    msYearly: ["毎年", "每年", "Yearly"],
    msOnce: ["一度きり", "仅一次", "One-off"],
    msDefaultsNote: ["現在は初期の記念日が表示されています（保存すると上書きされます）。", "当前显示的是默认纪念日（保存后将被覆盖）。", "Showing the default milestones (saving replaces them)."],
    edit: ["編集", "编辑", "Edit"],
    del: ["消去", "删除", "Delete"],
    delArm: ["もう一度押すと完全削除", "再按一次彻底删除", "Press again to delete"],
    recBodyReq: ["メモの本文を入力してください。", "请输入便签正文。", "Please write the note."],
    recUpdated: ["メモを更新しました。", "便签已更新。", "Note updated."],
    recSaved: ["新しいメモを保存しました。", "新便签已保存。", "New note saved."],
    recDeleted: ["メモを完全消去しました。", "便签已彻底删除。", "Note permanently deleted."],
    recNone: ["消去するメモはありません。", "没有可清空的便签。", "There are no notes to delete."],
    recAllArm: ["もう一度「全件を完全消去」を押すと、全メモが控えを残さず完全削除されます。", "再按一次「彻底清空全部」，所有便签将被彻底删除，不留副本。", "Press Destroy All once more to permanently delete every note, leaving no copies."],
    recAllDone: ["すべての非公開メモを完全消去しました。", "全部私密便签已彻底删除。", "All private notes permanently deleted."],
    editing: ["編集中です。変更後に保存を押してください。", "正在编辑，改好后请按保存。", "Editing — press Save when done."],
    msgBodyReq: ["ご用件の分類と内容を選択してください。", "请先选择事项分类与具体内容。", "Please choose a category and message first."],
    sending: ["送信中…", "发送中…", "Sending…"],
    msgSentCreator: ["送りました。", "已发送。", "Sent."],
    msgReceived: ["受付しました。", "已受理。", "Received."],
    msgSendFailed: ["送信に失敗しました", "发送失败", "Sending failed"],
    msgDeleted: ["メッセージを消去しました。", "消息已删除。", "Message deleted."],
    msgDelArm: ["もう一度「消去」を押すとこのメッセージを完全削除します。", "再按一次「删除」，这条消息将被彻底删除。", "Press Delete once more to permanently delete this message."],
    fromTsubame: ["アーティスト", "[アーティスト名]", "Artist"],
    fromCreator: ["管理者", "管理者", "Maintainer"],
    roleOwner: ["ご本人", "本人", "Artist"],
    pubLive: ["現在：公開中", "当前：公开访问中", "Status: Publicly Live"],
    pubClosed: ["現在：非公開（公式へ転送中）", "当前：已关闭（正跳转官方页）", "Status: Closed (Redirecting)"],
    catPlaceholder: ["分類を選択してください…", "请选择事项分类…", "Choose a category…"],
    textDisabledPlaceholder: ["分類を先に選択してください", "请先选择事项分类", "Select a category first"],
    textReadyPlaceholder: ["内容を選択してください…", "请选择具体内容…", "Choose a message…"],
    draftReq: ["日付（MM-DD）と日本語の本文を入力してください。", "请填写日期（MM-DD）与日语正文。", "Please enter MM-DD and Japanese text."],
    draftAdded: ["候補ドラフトを追加しました。", "已添加候选草稿。", "Candidate draft added."],
    draftApproved: ["承認済みにマークしました。", "已标记为已批准。", "Marked as approved."],
    draftDismissed: ["候補を削除しました。", "已移除候选草稿。", "Draft dismissed."],
    draftEmpty: ["現在、承認待ちの候補ドラフトはありません。", "当前没有待审核的候选草稿。", "No candidate drafts in the queue."],
    approve: ["承認する", "批准入册", "Approve"],
    approved: ["承認済み", "已批准", "Approved"],
    pending: ["確認待ち", "待审核", "Pending"],
    upEmpty: ["現在、発売予定作品はありません。", "当前暂无预定发售作品。", "No upcoming releases right now."],
    almEmpty: ["条件に合う年鑑エントリがありません。", "没有匹配的年鉴条目。", "No matching almanac entries."]
  };
  var KIND = { warning: ["⚠️ 警告", "⚠️ 警告", "⚠️ Warning"], request: ["削除・修正のお願い", "删除・修正请求", "Removal / Fix Request"], other: ["連絡", "留言", "Message"] };

  /* ---------- App-Shell Client-Side Router (Registry Driven) ---------- */
  var __CANON = window.__TSUBAME_ADMIN_DATA__ || { paradigms: [], standingReply: { label: ["", "", ""], kind: "other", text: "" }, modules: [] };
  var validModules = (__CANON.modules || []).map(function (m) { return m.id; });
  if (!validModules.length) validModules = ["publication", "messages", "site-controls", "milestones", "overview", "upcoming", "catalog-archive"];
  var currentModule = "publication";

  function closeMobileDrawer() {
    var sb = $("admin-sidebar"), bd = $("drawer-backdrop");
    if (sb) sb.classList.remove("is-open");
    if (bd) bd.hidden = true;
  }

  function switchModule(id, pushHash) {
    if (validModules.indexOf(id) === -1) id = "publication";
    currentModule = id;
    document.querySelectorAll(".admin-panel").forEach(function (sec) {
      sec.hidden = sec.getAttribute("data-module") !== id;
    });
    document.querySelectorAll("[data-nav-id]").forEach(function (btn) {
      var active = btn.getAttribute("data-nav-id") === id;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    if (pushHash !== false && window.location.hash !== "#" + id) {
      try { history.replaceState(null, "", "#" + id); } catch (_) {}
    }
    closeMobileDrawer();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  document.querySelectorAll("[data-nav-id]").forEach(function (btn) {
    btn.addEventListener("click", function () { switchModule(btn.getAttribute("data-nav-id"), true); });
  });
  document.querySelectorAll("[data-nav-jump]").forEach(function (btn) {
    btn.addEventListener("click", function () { switchModule(btn.getAttribute("data-nav-jump"), true); });
  });
  if ($("mob-menu-btn")) {
    $("mob-menu-btn").addEventListener("click", function () {
      var sb = $("admin-sidebar"), bd = $("drawer-backdrop");
      if (!sb) return;
      var willOpen = !sb.classList.contains("is-open");
      sb.classList.toggle("is-open", willOpen);
      if (bd) bd.hidden = !willOpen;
    });
  }
  if ($("drawer-backdrop")) $("drawer-backdrop").addEventListener("click", closeMobileDrawer);
  window.addEventListener("hashchange", function () {
    var h = (window.location.hash || "").replace(/^#/, "");
    if (validModules.indexOf(h) !== -1 && h !== currentModule) switchModule(h, false);
  });

  function setBadge(id, n) {
    var el = $(id);
    if (el) el.textContent = String(n);
  }

  /* ---------- Session ---------- */
  var me = null;
  function showLogin(expired) {
    if ($("auth-shell")) $("auth-shell").hidden = false;
    if ($("view-loading")) $("view-loading").hidden = true;
    if ($("view-main")) $("view-main").hidden = true;
    if ($("view-login")) $("view-login").hidden = false;
    if ($("login-note")) $("login-note").hidden = !expired;
  }
  async function api(path, opts) {
    var r = await fetch(path, opts || {});
    if (r.status === 401) { showLogin(true); throw new Error("unauthorized"); }
    return r;
  }
  async function postAction(payload) {
    return api("/api/owner/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }

  async function init() {
    var r;
    try { r = await fetch("/api/owner/me", { cache: "no-store" }); } catch (e) { showLogin(false); return; }
    if (!r.ok) { showLogin(false); return; }
    me = await r.json();
    if (!me.ok) { showLogin(false); return; }
    $("who-name").textContent = me.username ? "@" + me.username : me.uid;
    $("who-role").innerHTML = me.is_creator ? "" : " · " + tri(S.roleOwner);
    if ($("nav-who-pill")) $("nav-who-pill").hidden = false;
    $("direct-card").hidden = false;
    if ($("auth-shell")) $("auth-shell").hidden = true;
    $("view-main").hidden = false;
    siteClosed = !!me.kill_switch;
    paintPub();

    var initHash = (window.location.hash || "").replace(/^#/, "");
    switchModule(validModules.indexOf(initHash) !== -1 ? initHash : "publication", false);

    loadOverviewAndHealth();
    loadControlsAndFlags();
    loadMessages();
    loadMilestones();
    loadAlmanac();
    loadDrafts();
    renderPresets();
  }

  /* ---------- Module 1: Overview & Data Health + Upcoming ---------- */
  var upcomingCache = [];
  function fmtHeaderDate(r) {
    var lm = r && r.headers ? r.headers.get("last-modified") : null;
    if (!lm) return "OK";
    var d = new Date(lm);
    if (isNaN(d.getTime())) return "OK";
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  async function loadOverviewAndHealth() {
    try {
      var rs = await Promise.all([
        fetch("/data/stats.json", { cache: "no-store" }),
        fetch("/data/upcoming.json", { cache: "no-store" }),
        fetch("/data/on-this-day.json", { cache: "no-store" }).catch(function () { return null; })
      ]);
      if (rs[0] && rs[0].ok) {
        var stats = await rs[0].json();
        $("ov-works").textContent = fmt(stats.works_total);
        $("ov-sales").textContent = fmt(stats.total_sales);
        var ab = stats.age_breakdown || {};
        $("ov-r18").textContent = fmt(ab["R18"]) + " / " + fmt(ab["R-15"]) + " / " + fmt(ab["全年齢"]);
        if ($("hl-stats")) $("hl-stats").textContent = fmt(stats.works_total) + " works · " + (stats.generated_at || stats.updated_at || fmtHeaderDate(rs[0]));
      }
      if (rs[1] && rs[1].ok) {
        upcomingCache = await rs[1].json();
        if (!Array.isArray(upcomingCache)) upcomingCache = [];
        $("ov-upcoming").textContent = fmt(upcomingCache.length);
        setBadge("nav-badge-upcoming", upcomingCache.length);
        if ($("up-count")) $("up-count").textContent = String(upcomingCache.length);
        if ($("hl-upcoming")) $("hl-upcoming").textContent = upcomingCache.length + " items · " + fmtHeaderDate(rs[1]);
        renderUpcoming();
      }
      if (rs[2] && rs[2].ok) {
        var otd = await rs[2].json();
        var daysObj = (otd && otd.days && typeof otd.days === "object") ? otd.days : otd;
        var dayCount = daysObj && typeof daysObj === "object" ? Object.keys(daysObj).length : 0;
        if ($("hl-otd")) $("hl-otd").textContent = dayCount + " days · " + ((otd && (otd.generated_at || otd.generated)) || fmtHeaderDate(rs[2]));
      } else if ($("hl-otd")) {
        $("hl-otd").textContent = "—";
      }
    } catch (e) {}
  }
  if ($("btn-refresh-health")) $("btn-refresh-health").addEventListener("click", function () {
    loadOverviewAndHealth();
    loadAlmanac();
    showToast(S.applied, "ok");
  });

  function renderUpcoming() {
    var el = $("up-list");
    if (!el) return;
    if (!upcomingCache.length) {
      el.innerHTML = '<p class="note" style="margin:0">' + tri(S.upEmpty) + "</p>";
      return;
    }
    var AGE_MAP = { 0: "全年齢", 1: "R-15", 2: "R18" };
    el.innerHTML = upcomingCache.map(function (row) {
      var rj = row[0] || "", title = row[1] || "", dateStr = row[2] || "", circle = row[3] || "", url = row[10] || "", age = AGE_MAP[row[11]] || "";
      return '<div class="item"><div class="meta">' +
        '<span class="tag-pill is-yuzu">' + esc(dateStr) + '</span>' +
        (age ? '<span class="tag-pill">' + esc(age) + '</span>' : '') +
        '<span>' + esc(rj) + '</span><span>·</span><span>' + esc(circle) + '</span></div>' +
        '<div class="ttl">' + esc(title) + '</div>' +
        (url ? '<div class="acts"><a class="btn mini" href="' + esc(url) + '" target="_blank" rel="noopener">DLsite ↗</a></div>' : '') +
        '</div>';
    }).join("");
  }

  /* ---------- Module 2: Site Controls & Feature Switches ---------- */
  var siteClosed = false;
  var hideR18 = false;
  var flagsState = {};
  function paintPub() {
    var pill = $("pub-status-pill");
    if (pill) {
      pill.innerHTML = tri(siteClosed ? S.pubClosed : S.pubLive);
      pill.className = "tag-pill " + (siteClosed ? "is-warn" : "is-mint");
    }
  }
  var FLAG_DEFS = [
    { key: "show_upcoming_public", label: ["発売予定セクションを公開", "在首页公开「发售预定」区", "Show Upcoming section publicly"] },
    { key: "hide_almanac", defaultOn: false, label: ["公開ページの「今日の記録（年鑑）」を非表示にする", "隐藏公开页的「今日记录（年鉴）」区块", "Hide the On-This-Day almanac section on the public site"] },
    { key: "show_data_health_badge", label: ["データ更新日バッジを表示", "显示数据更新日期徽章", "Show data updated-date badge"] },
    { key: "external_youtube_only", defaultOn: true, label: ["公式動画はYouTubeへ直接移動（サイト内再生をオフ）", "官方视频仅跳转 YouTube（关闭站内播放弹窗）", "Open official videos on YouTube only (disable inline player)"] }
  ];

  async function loadControlsAndFlags() {
    try {
      var r = await fetch("/api/state", { cache: "no-store" });
      if (r.ok) {
        var s = await r.json();
        hideR18 = !!s.hide_r18;
        if (typeof s.kill_switch === "boolean") {
          siteClosed = s.kill_switch;
          paintPub();
        }
        $("notice-input").value = s.custom_notice || "";
        flagsState = (s.flags && typeof s.flags === "object") ? s.flags : {};
        paintR18();
        renderFlags();
      }
    } catch (e) {}
    try {
      var rf = await api("/api/owner/flags", { cache: "no-store" });
      if (rf.ok) {
        var jf = await rf.json();
        if (jf && jf.flags) { flagsState = jf.flags; renderFlags(); }
      }
    } catch (_) { renderFlags(); }
  }

  function renderFlags() {
    var el = $("flag-list");
    if (!el) return;
    el.innerHTML = FLAG_DEFS.map(function (f) {
      var on = (typeof flagsState[f.key] === "boolean") ? flagsState[f.key] : !!f.defaultOn;
      return '<div class="flag-item"><div><strong>' + tri(f.label) + '</strong><span class="flag-key">' + esc(f.key) + '</span></div>' +
        '<button type="button" class="toggle-switch" role="switch" aria-checked="' + (on ? "true" : "false") + '" data-flag-key="' + esc(f.key) + '"></button></div>';
    }).join("");
    el.querySelectorAll("[data-flag-key]").forEach(function (sw) {
      sw.addEventListener("click", async function () {
        var key = sw.getAttribute("data-flag-key");
        var nextOn = sw.getAttribute("aria-checked") !== "true";
        sw.disabled = true;
        try {
          var r = await api("/api/owner/flags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set", key: key, on: nextOn }) });
          if (r.ok) {
            flagsState[key] = nextOn;
            sw.setAttribute("aria-checked", nextOn ? "true" : "false");
            st($("status-flags"), S.applied, false);
          } else {
            st($("status-flags"), S.failed, true);
          }
        } catch (e) { if (String(e.message) !== "unauthorized") st($("status-flags"), S.connErr, true); }
        sw.disabled = false;
      });
    });
  }

  function paintR18() {
    $("r18-state").innerHTML = tri(hideR18 ? S.r18Hidden : S.r18Shown);
    $("r18-toggle").innerHTML = tri(hideR18 ? S.r18ShowBtn : S.r18HideBtn);
  }
  $("r18-toggle").addEventListener("click", async function () {
    var btn = this; btn.disabled = true;
    try {
      var r = await postAction({ action: "hide_r18", on: !hideR18 });
      if (r.ok) { hideR18 = !hideR18; paintR18(); st($("status-controls"), S.applied, false); }
      else st($("status-controls"), S.failed, true);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-controls"), S.connErr, true); }
    btn.disabled = false;
  });
  async function saveNotice(text) {
    try {
      var r = await postAction({ action: "set_notice", text: text });
      if (r.ok) { $("notice-input").value = text; st($("status-controls"), S.applied, false); }
      else st($("status-controls"), S.failed, true);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-controls"), S.connErr, true); }
  }
  $("notice-save").addEventListener("click", function () { saveNotice($("notice-input").value.trim().slice(0, 160)); });
  $("notice-clear").addEventListener("click", function () { saveNotice(""); });

  $("btn-download").addEventListener("click", async function () {
    var btn = this; btn.disabled = true;
    st($("status-controls"), S.preparing, false);
    try {
      var r = await postAction({ action: "download_source" });
      if (!r.ok) { st($("status-controls"), S.dlFailed, true); btn.disabled = false; return; }
      var blob = await r.blob();
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "tsubame-fansite-source.zip";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      st($("status-controls"), S.downloaded, false);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-controls"), S.connErr, true); }
    btn.disabled = false;
  });

  /* ---------- Kill switch (two-press arm) + Logout -> "/" ---------- */
  function armable(btn, armText, fn) {
    var armed = false, timer = null;
    btn.addEventListener("click", async function () {
      if (!armed) {
        armed = true; btn.classList.add("btn-armed");
        st($("status-site"), armText, true);
        timer = setTimeout(function () { armed = false; btn.classList.remove("btn-armed"); }, 6000);
        return;
      }
      clearTimeout(timer); armed = false; btn.classList.remove("btn-armed");
      btn.disabled = true;
      await fn();
      btn.disabled = false;
    });
  }
  armable($("btn-close-site"), S.armClose, async function () {
    try {
      var r = await postAction({ action: "kill_switch", on: true });
      if (r.ok) { siteClosed = true; paintPub(); }
      st($("status-site"), r.ok ? S.closed : S.failed, !r.ok);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-site"), S.connErr, true); }
  });
  armable($("btn-open-site"), S.armOpen, async function () {
    try {
      var r = await postAction({ action: "kill_switch", on: false });
      if (r.ok) { siteClosed = false; paintPub(); }
      st($("status-site"), r.ok ? S.opened : S.failed, !r.ok);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-site"), S.connErr, true); }
  });
  $("btn-logout").addEventListener("click", async function () {
    this.disabled = true;
    try { await postAction({ action: "logout" }); } catch (e) {}
    window.location.href = "/";
  });

  /* ---------- Module 4: Messages (1:2 Custom Picker + Universal Supplement + Standing Reply Popup) ---------- */
  var messages = [], msgKind = "other", msgDelArmed = null, selectedParadigm = null;
  var PARADIGM_GROUPS = __CANON.paradigms || [];
  var PRESET_CREATOR = __CANON.standingReply || { text: "" };

  function getGroupLabel(g) { return triText(g.group || g.label || g.cat || g.title || ["—", "—", "—"]); }
  function getItemLabel(it) { return triText(it.label || it.title || [it.text || "", it.text || "", it.text || ""]); }
  function getItemText(it) { return String(it.text || it.body || ""); }
  function isOtherItem(it) { return !!(it && (it.isOther || getItemText(it).indexOf("その他") === 0)); }

  var activeCatIdx = -1, activeItemIdx = -1;
  function closeAllMenus() {
    ["cat", "text"].forEach(function (k) {
      var wrap = $("p-select-" + k), btn = k === "cat" ? $("msg-paradigm-cat") : $("msg-paradigm"), menu = $("p-menu-" + k);
      if (wrap) wrap.classList.remove("is-open");
      if (btn) btn.setAttribute("aria-expanded", "false");
      if (menu) menu.hidden = true;
    });
    if ($("card-messages")) $("card-messages").classList.remove("has-open-popover");
  }
  function toggleMenu(kind) {
    var wrap = $("p-select-" + kind), btn = kind === "cat" ? $("msg-paradigm-cat") : $("msg-paradigm"), menu = $("p-menu-" + kind);
    if (!wrap || !btn || !menu || btn.disabled) return;
    var willOpen = menu.hidden;
    closeAllMenus();
    if (willOpen) {
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      menu.hidden = false;
      if ($("card-messages")) $("card-messages").classList.add("has-open-popover");
    }
  }
  function updateOtherDrawer() {
    var drawer = $("msg-other-wrap"), input = $("msg-other-input");
    if (!drawer) return;
    if (selectedParadigm) {
      drawer.hidden = false;
      if (input && isOtherItem(selectedParadigm)) setTimeout(function () { input.focus(); }, 40);
    } else {
      drawer.hidden = true;
      if (input) input.value = "";
    }
  }
  function selectCategory(cIdx) {
    activeCatIdx = cIdx; activeItemIdx = -1; selectedParadigm = null; msgKind = "other";
    var catWrap = $("p-select-cat"), textWrap = $("p-select-text"), textBtn = $("msg-paradigm"), kindTag = $("p-selected-kind");
    if (kindTag) kindTag.hidden = true;
    if (cIdx < 0 || !PARADIGM_GROUPS[cIdx]) {
      if (catWrap) { catWrap.classList.add("is-placeholder"); catWrap.classList.remove("is-selected"); }
      if ($("p-cat-val")) $("p-cat-val").textContent = triText(S.catPlaceholder);
      if (textWrap) { textWrap.classList.add("is-disabled", "is-placeholder"); textWrap.classList.remove("is-selected"); }
      if (textBtn) textBtn.disabled = true;
      if ($("p-text-val")) $("p-text-val").textContent = triText(S.textDisabledPlaceholder);
      if ($("p-list-text")) $("p-list-text").innerHTML = "";
      if ($("p-text-count")) $("p-text-count").textContent = "0";
      updateOtherDrawer(); renderCatOptions(); return;
    }
    var grp = PARADIGM_GROUPS[cIdx], items = grp.items || [];
    if (catWrap) { catWrap.classList.remove("is-placeholder"); catWrap.classList.add("is-selected"); }
    if ($("p-cat-val")) $("p-cat-val").textContent = getGroupLabel(grp);
    if (textWrap) { textWrap.classList.remove("is-disabled", "is-selected"); textWrap.classList.add("is-placeholder"); }
    if (textBtn) textBtn.disabled = false;
    if ($("p-text-val")) $("p-text-val").textContent = triText(S.textReadyPlaceholder);
    if ($("p-text-count")) $("p-text-count").textContent = String(items.length);
    renderCatOptions(); renderTextOptions(); updateOtherDrawer();
  }
  function selectParadigmItem(iIdx) {
    if (activeCatIdx < 0 || !PARADIGM_GROUPS[activeCatIdx]) return;
    var it = (PARADIGM_GROUPS[activeCatIdx].items || [])[iIdx];
    if (!it) return;
    activeItemIdx = iIdx;
    selectedParadigm = { kind: it.kind || "other", text: getItemText(it), label: getItemLabel(it), isOther: isOtherItem(it) };
    msgKind = selectedParadigm.kind;
    var textWrap = $("p-select-text");
    if (textWrap) { textWrap.classList.remove("is-placeholder"); textWrap.classList.add("is-selected"); }
    if ($("p-text-val")) $("p-text-val").textContent = selectedParadigm.label;
    var kindTag = $("p-selected-kind");
    if (kindTag) {
      kindTag.textContent = triText(KIND[msgKind] || KIND.other);
      kindTag.className = "p-kind-tag" + (msgKind === "warning" ? " is-warn" : "");
      kindTag.hidden = false;
    }
    renderTextOptions(); updateOtherDrawer();
  }
  function renderCatOptions() {
    var listEl = $("p-list-cat");
    if (!listEl) return;
    if ($("p-cat-count")) $("p-cat-count").textContent = String(PARADIGM_GROUPS.length);
    listEl.innerHTML = PARADIGM_GROUPS.map(function (g, idx) {
      var num = idx < 9 ? "0" + (idx + 1) : String(idx + 1), sel = idx === activeCatIdx;
      return '<button type="button" class="p-opt' + (sel ? " is-selected" : "") + '" role="option" aria-selected="' + (sel ? "true" : "false") + '" data-cat-idx="' + idx + '">' +
        '<span class="p-opt-badge">' + num + '</span><span class="p-opt-text">' + esc(getGroupLabel(g)) + '</span><span class="p-opt-check" aria-hidden="true">✓</span></button>';
    }).join("");
    listEl.querySelectorAll("[data-cat-idx]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation(); selectCategory(Number(b.getAttribute("data-cat-idx"))); closeAllMenus();
        setTimeout(function () { toggleMenu("text"); }, 60);
      });
    });
  }
  function renderTextOptions() {
    var listEl = $("p-list-text");
    if (!listEl || activeCatIdx < 0 || !PARADIGM_GROUPS[activeCatIdx]) return;
    var items = PARADIGM_GROUPS[activeCatIdx].items || [];
    listEl.innerHTML = items.map(function (it, idx) {
      var sel = idx === activeItemIdx, k = it.kind || "other";
      var badgeCls = "p-opt-badge" + (k === "warning" ? " is-warn" : "");
      var badgeTxt = k === "warning" ? "⚠️" : (idx < 9 ? "0" + (idx + 1) : String(idx + 1));
      return '<button type="button" class="p-opt' + (sel ? " is-selected" : "") + '" role="option" aria-selected="' + (sel ? "true" : "false") + '" data-item-idx="' + idx + '">' +
        '<span class="' + badgeCls + '">' + esc(badgeTxt) + '</span><span class="p-opt-text">' + esc(getItemLabel(it)) + '</span><span class="p-opt-check" aria-hidden="true">✓</span></button>';
    }).join("");
    listEl.querySelectorAll("[data-item-idx]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); selectParadigmItem(Number(b.getAttribute("data-item-idx"))); closeAllMenus(); });
    });
  }
  function resetParadigmSelects() { closeAllMenus(); selectCategory(-1); }
  function renderPresets() { resetParadigmSelects(); }

  if ($("msg-paradigm-cat")) $("msg-paradigm-cat").addEventListener("click", function (e) { e.stopPropagation(); toggleMenu("cat"); });
  if ($("msg-paradigm")) $("msg-paradigm").addEventListener("click", function (e) { e.stopPropagation(); toggleMenu("text"); });
  document.addEventListener("click", function (e) { if (!e.target.closest("#msg-preset-row")) closeAllMenus(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAllMenus();
      closeAdminLangMenu();
      closeMobileDrawer();
      if ($("reply-popup") && !$("reply-popup").hidden) closeReplyPopup();
    }
  });

  function openReplyPopup() {
    var pop = $("reply-popup"), bdy = $("reply-popup-body");
    if (!pop || !bdy) return;
    bdy.textContent = PRESET_CREATOR.text;
    pop.hidden = false;
  }
  function closeReplyPopup() { if ($("reply-popup")) $("reply-popup").hidden = true; }
  if ($("reply-popup-close")) $("reply-popup-close").addEventListener("click", closeReplyPopup);
  if ($("reply-popup")) $("reply-popup").addEventListener("click", function (e) { if (e.target === $("reply-popup")) closeReplyPopup(); });

  function formatMsgTime(ts) {
    if (!ts) return "";
    if (typeof ts === "number" || /^\d{10,15}$/.test(String(ts))) {
      var d = new Date(Number(ts));
      if (!isNaN(d.getTime())) {
        var pad = function (n) { return n < 10 ? "0" + n : String(n); };
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
      }
    }
    return String(ts).slice(0, 16).replace("T", " ");
  }

  async function loadMessages() {
    try {
      var r = await api("/api/owner/message", { cache: "no-store" });
      if (!r.ok) return;
      var j = await r.json();
      messages = j.messages || [];
      renderMessages();
    } catch (e) {}
  }
  function renderMessages() {
    $("msg-count").textContent = String(messages.length);
    setBadge("nav-badge-messages", messages.length);
    var el = $("msg-list");
    if (!messages.length) { el.innerHTML = '<p class="note" style="margin:12px 0 0">' + tri(S.emptyMessages) + "</p>"; return; }
    el.innerHTML = messages.map(function (m) {
      var from = m.from === "creator" ? S.fromCreator : S.fromTsubame;
      return '<div class="item"><div class="meta"><span>' + tri(KIND[m.kind] || KIND.other) + '</span><span>·</span><span>' + tri(from) + '</span><span>·</span><span>' + esc(formatMsgTime(m.created_at)) + '</span></div>' +
        '<div class="bdy">' + esc(m.body) + '</div>' +
        '<div class="acts"><button type="button" class="btn mini" data-msg-del="' + esc(m.id) + '">' + tri(msgDelArmed === m.id ? S.delArm : S.del) + "</button></div></div>";
    }).join("");
    el.querySelectorAll("[data-msg-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var id = b.getAttribute("data-msg-del");
        if (msgDelArmed !== id) { msgDelArmed = id; renderMessages(); st($("status-messages"), S.msgDelArm, true); return; }
        msgDelArmed = null;
        try {
          var r = await api("/api/owner/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: id }) });
          if (r.ok) { st($("status-messages"), S.msgDeleted, false); loadMessages(); }
          else st($("status-messages"), S.failed, true);
        } catch (e) { if (String(e.message) !== "unauthorized") st($("status-messages"), S.connErr, true); }
      });
    });
  }
  $("msg-send").addEventListener("click", async function () {
    if (!selectedParadigm || !selectedParadigm.text) { st($("status-messages"), S.msgBodyReq, true); return; }
    var body = selectedParadigm.text;
    if ($("msg-other-input")) {
      var extra = $("msg-other-input").value.trim();
      if (extra) body = body + "\n" + extra;
    }
    var btn = this; btn.disabled = true;
    st($("status-messages"), S.sending, false);
    try {
      var r = await api("/api/owner/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", kind: selectedParadigm.kind || msgKind, body: body }) });
      if (r.ok) {
        resetParadigmSelects();
        st($("status-messages"), me && me.is_creator ? S.msgSentCreator : S.msgReceived, false);
        if (!(me && me.is_creator)) openReplyPopup();
        loadMessages();
      } else st($("status-messages"), S.msgSendFailed, true);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-messages"), S.connErr, true); }
    btn.disabled = false;
  });

  /* ---------- Module 5: Milestones ---------- */
  var milestones = [], msEditingId = null, msDelArmed = null, msResetArmed = false, msIsDefault = false;
  function msLangArr(o) { return [(o && o.ja) || "", (o && o.cn) || "", (o && o.en) || ""]; }
  function msChipsJoin(arr) { return Array.isArray(arr) ? arr.join(", ") : ""; }
  function msChipsSplit(s) { return String(s || "").split(/[,、，]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function msStripHtml(s) { return String(s || "").replace(/<[^>]*>/g, ""); }

  async function loadMilestones() {
    try {
      var r = await api("/api/owner/milestones", { cache: "no-store" });
      if (!r.ok) return;
      var j = await r.json();
      milestones = j.milestones || [];
      msIsDefault = !!j.is_default;
      renderMilestones();
    } catch (e) {}
  }
  function renderMilestones() {
    $("ms-count").textContent = String(milestones.length);
    setBadge("nav-badge-milestones", milestones.length);
    var el = $("ms-list");
    var html = msIsDefault ? '<p class="note" style="margin:12px 0 0">' + tri(S.msDefaultsNote) + "</p>" : "";
    if (!milestones.length) { el.innerHTML = html + '<p class="note" style="margin:12px 0 0">' + tri(S.msEmpty) + "</p>"; return; }
    el.innerHTML = html + milestones.map(function (m) {
      var when = m.date ? esc(m.date) + " · " + triText(S.msOnce) : esc(m.md || "") + " · " + triText(S.msYearly);
      var ttl = esc(triText(msLangArr(m.label))), bdy = esc(msStripHtml(triText(msLangArr(m.body))));
      return '<div class="item"><div class="meta">' + when + '</div>' +
        (ttl ? '<div class="ttl">' + ttl + "</div>" : "") +
        (bdy ? '<div class="bdy">' + bdy + "</div>" : "") +
        '<div class="acts"><button type="button" class="btn mini" data-ms-edit="' + esc(m.id) + '">' + tri(S.edit) + "</button>" +
        '<button type="button" class="btn mini" data-ms-del="' + esc(m.id) + '">' + tri(msDelArmed === m.id ? S.delArm : S.del) + "</button></div></div>";
    }).join("");
    el.querySelectorAll("[data-ms-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = milestones.find(function (x) { return x.id === b.getAttribute("data-ms-edit"); });
        if (!m) return;
        msEditingId = m.id;
        $("ms-date").value = m.date || m.md || "";
        $("ms-label-ja").value = (m.label || {}).ja || ""; $("ms-label-cn").value = (m.label || {}).cn || ""; $("ms-label-en").value = (m.label || {}).en || "";
        $("ms-body-ja").value = (m.body || {}).ja || ""; $("ms-body-cn").value = (m.body || {}).cn || ""; $("ms-body-en").value = (m.body || {}).en || "";
        $("ms-chips-ja").value = msChipsJoin((m.chips || {}).ja); $("ms-chips-cn").value = msChipsJoin((m.chips || {}).cn); $("ms-chips-en").value = msChipsJoin((m.chips || {}).en);
        $("ms-cancel").hidden = false;
        st($("status-milestones"), S.editing, false);
        $("ms-label-ja").focus();
      });
    });
    el.querySelectorAll("[data-ms-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var id = b.getAttribute("data-ms-del");
        if (msDelArmed !== id) { msDelArmed = id; renderMilestones(); return; }
        msDelArmed = null;
        try {
          var r = await api("/api/owner/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: id }) });
          if (r.ok) { st($("status-milestones"), S.msDeleted, false); loadMilestones(); }
          else st($("status-milestones"), S.failed, true);
        } catch (e) { if (String(e.message) !== "unauthorized") st($("status-milestones"), S.connErr, true); }
      });
    });
  }
  function msClearForm() {
    msEditingId = null;
    ["ms-date", "ms-label-ja", "ms-label-cn", "ms-label-en", "ms-body-ja", "ms-body-cn", "ms-body-en", "ms-chips-ja", "ms-chips-cn", "ms-chips-en"].forEach(function (id) { $(id).value = ""; });
    $("ms-cancel").hidden = true;
  }
  $("ms-cancel").addEventListener("click", function () { msClearForm(); st($("status-milestones"), null, false); });
  $("ms-save").addEventListener("click", async function () {
    var dateVal = $("ms-date").value.trim(), isFull = /^\d{4}-\d{2}-\d{2}$/.test(dateVal), isMd = /^\d{2}-\d{2}$/.test(dateVal);
    if (!isFull && !isMd) { st($("status-milestones"), S.msDateReq, true); return; }
    var label = { ja: $("ms-label-ja").value.trim(), cn: $("ms-label-cn").value.trim(), en: $("ms-label-en").value.trim() };
    var body = { ja: $("ms-body-ja").value.trim(), cn: $("ms-body-cn").value.trim(), en: $("ms-body-en").value.trim() };
    if (!label.ja || !body.ja) { st($("status-milestones"), S.msJaReq, true); return; }
    var payload = { action: msEditingId ? "update" : "create", label: label, body: body, chips: { ja: msChipsSplit($("ms-chips-ja").value), cn: msChipsSplit($("ms-chips-cn").value), en: msChipsSplit($("ms-chips-en").value) } };
    if (isFull) payload.date = dateVal; else payload.md = dateVal;
    if (msEditingId) payload.id = msEditingId;
    var btn = this; btn.disabled = true;
    try {
      var r = await api("/api/owner/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) { st($("status-milestones"), msEditingId ? S.msUpdated : S.msSaved, false); msClearForm(); loadMilestones(); }
      else st($("status-milestones"), S.failed, true);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-milestones"), S.connErr, true); }
    btn.disabled = false;
  });
  $("ms-reset").addEventListener("click", async function () {
    if (!msResetArmed) {
      msResetArmed = true; this.classList.add("btn-armed");
      st($("status-milestones"), S.msResetArm, true);
      var self = this; setTimeout(function () { msResetArmed = false; self.classList.remove("btn-armed"); }, 6000);
      return;
    }
    msResetArmed = false; this.classList.remove("btn-armed");
    try {
      var r = await api("/api/owner/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) });
      if (r.ok) { st($("status-milestones"), S.msResetDone, false); msClearForm(); loadMilestones(); }
      else st($("status-milestones"), S.failed, true);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-milestones"), S.connErr, true); }
  });

  /* ---------- Module 6: Almanac (Read-Only Browser + Drafts Review Queue §2.5.2) ---------- */
  var almanacEntries = [], drafts = [], draftDelArmed = null;
  document.querySelectorAll("[data-alm-tab]").forEach(function (tb) {
    tb.addEventListener("click", function () {
      var which = tb.getAttribute("data-alm-tab");
      document.querySelectorAll("[data-alm-tab]").forEach(function (b) {
        var on = b === tb; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", on ? "true" : "false");
      });
      if ($("alm-view-published")) $("alm-view-published").hidden = which !== "published";
      if ($("alm-view-drafts")) $("alm-view-drafts").hidden = which !== "drafts";
    });
  });

  async function loadAlmanac() {
    try {
      var r = await fetch("/data/almanac.json", { cache: "no-store" });
      if (!r.ok) return;
      var raw = await r.json();
      almanacEntries = [];
      Object.keys(raw || {}).sort().forEach(function (md) {
        (raw[md] || []).forEach(function (ev) {
          almanacEntries.push({ md: md, y: ev.y || "", emoji: ev.emoji || "✨", text: ev.text || {} });
        });
      });
      if ($("alm-count")) $("alm-count").textContent = String(almanacEntries.length);
      if ($("hl-almanac")) $("hl-almanac").textContent = almanacEntries.length + " stories · " + fmtHeaderDate(r);
      renderAlmanac();
    } catch (_) {}
  }
  function renderAlmanac() {
    var el = $("alm-list");
    if (!el) return;
    var q = ($("alm-search") ? $("alm-search").value : "").trim().toLowerCase();
    var list = !q ? almanacEntries : almanacEntries.filter(function (e) {
      var hay = (e.md + " " + e.y + " " + (e.text.ja || "") + " " + (e.text.cn || "") + " " + (e.text.en || "")).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    if (!list.length) { el.innerHTML = '<p class="note" style="margin:10px 0 0">' + tri(S.almEmpty) + "</p>"; return; }
    el.innerHTML = list.map(function (e) {
      var bodyTxt = (e.text && e.text[savedLang]) || (e.text && e.text.ja) || "";
      return '<div class="item"><div class="meta"><span class="tag-pill is-yuzu">' + esc(e.md) + '</span><span>' + esc(e.y) + '</span><span>' + esc(e.emoji) + '</span></div>' +
        '<div class="bdy">' + esc(bodyTxt) + '</div></div>';
    }).join("");
  }
  if ($("alm-search")) $("alm-search").addEventListener("input", renderAlmanac);

  async function loadDrafts() {
    try {
      var r = await api("/api/owner/drafts", { cache: "no-store" });
      if (!r.ok) return;
      var j = await r.json();
      drafts = j.drafts || [];
      renderDrafts();
    } catch (_) { renderDrafts(); }
  }
  function renderDrafts() {
    var pendingCount = drafts.filter(function (d) { return d.status !== "approved"; }).length;
    setBadge("nav-badge-drafts", pendingCount);
    if ($("drafts-count")) $("drafts-count").textContent = String(drafts.length);
    var el = $("drafts-list");
    if (!el) return;
    if (!drafts.length) { el.innerHTML = '<p class="note" style="margin:12px 0 0">' + tri(S.draftEmpty) + "</p>"; return; }
    el.innerHTML = drafts.map(function (d) {
      var isAppr = d.status === "approved";
      var txt = (d.text && d.text[savedLang]) || (d.text && d.text.ja) || "";
      return '<div class="item"><div class="meta"><span class="tag-pill is-yuzu">' + esc(d.md) + '</span><span>' + esc(d.y) + '</span><span>' + esc(d.emoji || "✨") + '</span>' +
        '<span class="tag-pill ' + (isAppr ? "is-mint" : "") + '">' + tri(isAppr ? S.approved : S.pending) + '</span></div>' +
        '<div class="bdy">' + esc(txt) + '</div><div class="acts">' +
        (!isAppr ? '<button type="button" class="btn btn-primary mini" data-draft-ok="' + esc(d.id) + '">' + tri(S.approve) + '</button>' : '') +
        '<button type="button" class="btn mini" data-draft-del="' + esc(d.id) + '">' + tri(draftDelArmed === d.id ? S.delArm : S.del) + '</button></div></div>';
    }).join("");
    el.querySelectorAll("[data-draft-ok]").forEach(function (b) {
      b.addEventListener("click", async function () {
        try {
          var r = await api("/api/owner/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", id: b.getAttribute("data-draft-ok") }) });
          if (r.ok) { st($("status-drafts"), S.draftApproved, false); loadDrafts(); }
        } catch (_) {}
      });
    });
    el.querySelectorAll("[data-draft-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var id = b.getAttribute("data-draft-del");
        if (draftDelArmed !== id) { draftDelArmed = id; renderDrafts(); return; }
        draftDelArmed = null;
        try {
          var r = await api("/api/owner/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss", id: id }) });
          if (r.ok) { st($("status-drafts"), S.draftDismissed, false); loadDrafts(); }
        } catch (_) {}
      });
    });
  }
  if ($("draft-add")) $("draft-add").addEventListener("click", async function () {
    var md = ($("draft-md").value || "").trim(), ja = ($("draft-ja").value || "").trim();
    if (!/^\d{2}-\d{2}$/.test(md) || !ja) { st($("status-drafts"), S.draftReq, true); return; }
    var btn = this; btn.disabled = true;
    try {
      var r = await api("/api/owner/drafts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", md: md, year: Number($("draft-year").value) || new Date().getFullYear(), emoji: ($("draft-emoji").value || "✨").trim(), text: { ja: ja } })
      });
      if (r.ok) { $("draft-md").value = ""; $("draft-ja").value = ""; st($("status-drafts"), S.draftAdded, false); loadDrafts(); }
      else st($("status-drafts"), S.failed, true);
    } catch (e) { if (String(e.message) !== "unauthorized") st($("status-drafts"), S.connErr, true); }
    btn.disabled = false;
  });

  function syncLangRenderedUI() {
    if ($("who-role") && me) $("who-role").innerHTML = me.is_creator ? "" : " · " + tri(S.roleOwner);
    paintPub();
    paintR18();
    renderFlags();
    renderMessages();
    renderMilestones();
    renderUpcoming();
    renderAlmanac();
    renderDrafts();
    if (activeCatIdx >= 0 && PARADIGM_GROUPS[activeCatIdx]) {
      if ($("p-cat-val")) $("p-cat-val").textContent = getGroupLabel(PARADIGM_GROUPS[activeCatIdx]);
      var items = PARADIGM_GROUPS[activeCatIdx].items || [];
      if (activeItemIdx >= 0 && items[activeItemIdx] && selectedParadigm) {
        selectedParadigm.label = getItemLabel(items[activeItemIdx]);
        if ($("p-text-val")) $("p-text-val").textContent = selectedParadigm.label;
        if ($("p-selected-kind")) $("p-selected-kind").textContent = triText(KIND[msgKind] || KIND.other);
      } else if ($("p-text-val")) {
        $("p-text-val").textContent = triText(S.textReadyPlaceholder);
      }
      renderCatOptions();
      renderTextOptions();
    } else {
      if ($("p-cat-val")) $("p-cat-val").textContent = triText(S.catPlaceholder);
      if ($("p-text-val")) $("p-text-val").textContent = triText(S.textDisabledPlaceholder);
      renderCatOptions();
    }
  }

  init();
})();
