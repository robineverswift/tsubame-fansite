(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tri(arr) { return '<span class="t-ja">' + esc(arr[0]) + '</span><span class="t-cn">' + esc(arr[1]) + '</span><span class="t-en">' + esc(arr[2]) + '</span>'; }

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
    yuzu: "/assets/brand/admin-red-bird-124179e7.png",
    coral: "/assets/brand/admin-red-bird-124179e7.png"
  };
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
    ja: { notice: "お知らせ文を入力…", otherBody: "作品名・RJ番号・対象箇所などがあればご記入ください（空欄のままでも送信できます）…" },
    cn: { notice: "输入公告文字…", otherBody: "如有具体作品名、RJ 编号或补充说明请在此填写（留空也可直接发送）…" },
    en: { notice: "Type a notice…", otherBody: "Include any work title, RJ code, or details here (or leave blank to send as-is)…" }
  };
  function applyPlaceholders() {
    var p = PH[savedLang] || PH.ja;
    if ($("notice-input")) $("notice-input").placeholder = p.notice;
    if ($("msg-other-input")) $("msg-other-input").placeholder = p.otherBody;
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
    emptyMessages: ["まだメッセージはありません。", "还没有消息。", "No messages yet."],
    del: ["消去", "删除", "Delete"],
    delArm: ["もう一度押すと完全削除", "再按一次彻底删除", "Press again to delete"],
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
    textReadyPlaceholder: ["内容を選択してください…", "请选择具体内容…", "Choose a message…"]
  };
  var KIND = { warning: ["⚠️ 警告", "⚠️ 警告", "⚠️ Warning"], request: ["削除・修正のお願い", "删除・修正请求", "Removal / Fix Request"], other: ["連絡", "留言", "Message"] };

  /* ---------- App-Shell Client-Side Router (Registry Driven) ---------- */
  var __CANON = window.__TSUBAME_ADMIN_DATA__ || { paradigms: [], standingReply: { label: ["", "", ""], kind: "other", text: "" }, modules: [] };
  var validModules = (__CANON.modules || []).map(function (m) { return m.id; });
  if (!validModules.length) validModules = ["publication", "messages", "site-controls", "catalog-archive"];
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

    loadControlsAndFlags();
    loadMessages();
    renderPresets();
  }

  /* ---------- Module: Site Controls & Feature Switches ---------- */
  var siteClosed = false;
  var hideR18 = false;
  var flagsState = {};
  function paintPub() {
    var pill = $("pub-status-pill");
    if (pill) {
      pill.innerHTML = tri(siteClosed ? S.pubClosed : S.pubLive);
      pill.className = "tag-pill " + (siteClosed ? "is-warn" : "is-mint");
    }
    if ($("btn-close-site")) $("btn-close-site").disabled = siteClosed;
    if ($("btn-open-site")) $("btn-open-site").disabled = !siteClosed;
  }
  var FLAG_DEFS = [
    { key: "hide_almanac", defaultOn: false, label: ["公開ページの「今日の記録（年鑑）」を非表示にする", "隐藏公开页的「今日记录（年鉴）」区块", "Hide the On-This-Day almanac section on the public site"] },
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
      return '<div class="flag-item"><div><strong>' + tri(f.label) + '</strong></div>' +
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

  function syncLangRenderedUI() {
    if ($("who-role") && me) $("who-role").innerHTML = me.is_creator ? "" : " · " + tri(S.roleOwner);
    paintPub();
    paintR18();
    renderFlags();
    renderMessages();
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
