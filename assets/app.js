// 5개국어 토글 (기본 English). 영어 폴백 — 해당 언어 스팬이 없으면 English 표시.
(function () {
  var KEY = "abfz-lang";
  var LANGS = [
    { c: "en", label: "English" },
    { c: "ko", label: "한국어" },
    { c: "ja", label: "日本語" },
    { c: "zh", label: "中文" },
    { c: "ar", label: "العربية" }
  ];
  var DEFAULT = "en";
  function valid(l) { return LANGS.some(function (x) { return x.c === l; }); }

  // [data-lang] 형제 그룹별로 현재 언어 표시, 없으면 en, 그것도 없으면 첫 번째
  function applyVisibility(lang) {
    var map = new Map(), groups = [];
    document.querySelectorAll("[data-lang]").forEach(function (el) {
      var p = el.parentNode, g = map.get(p);
      if (!g) { g = []; map.set(p, g); groups.push(g); }
      g.push(el);
    });
    groups.forEach(function (els) {
      var pick = null, en = null;
      els.forEach(function (e) {
        var c = e.getAttribute("data-lang");
        if (c === lang) pick = e;
        if (c === "en") en = e;
      });
      pick = pick || en || els[0];
      els.forEach(function (e) { e.style.display = (e === pick) ? "" : "none"; });
    });
  }

  function setLang(lang) {
    if (!valid(lang)) lang = DEFAULT;
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyVisibility(lang);
    document.querySelectorAll(".lang-select").forEach(function (s) { if (s.value !== lang) s.value = lang; });
    document.dispatchEvent(new CustomEvent("abfz:lang", { detail: lang }));   // 동적 콘텐츠(카탈로그/모달) 갱신용
  }
  // 동적으로 추가되는 콘텐츠를 위한 외부 API
  window.AbfzLang = {
    apply: applyVisibility,
    get: function () { return document.documentElement.getAttribute("lang") || DEFAULT; }
  };

  var saved = DEFAULT;
  try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (e) {}
  if (!valid(saved)) saved = DEFAULT;
  // 페인트 전 적용 (영어 기본이라 깜빡임 없음)
  document.documentElement.setAttribute("lang", saved);
  document.documentElement.setAttribute("dir", saved === "ar" ? "rtl" : "ltr");

  function build() {
    // 기존 .lang-toggle 버튼을 5개국어 <select>로 교체 (모든 페이지 공통)
    document.querySelectorAll(".lang-toggle").forEach(function (btn) {
      var sel = document.createElement("select");
      sel.className = "lang-select"; sel.setAttribute("aria-label", "Language");
      LANGS.forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.c; o.textContent = x.label; sel.appendChild(o);
      });
      sel.value = saved;
      sel.addEventListener("change", function () { setLang(sel.value); });
      btn.parentNode.replaceChild(sel, btn);
    });
    setLang(saved);
    document.documentElement.classList.add("lang-ready");   // CSS 가드 해제 → 이후 인라인 display로 제어
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState !== "loading") build();
  else document.addEventListener("DOMContentLoaded", build);
})();
