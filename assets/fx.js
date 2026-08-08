/* fx.js — 프리미엄 인터랙션(데스크톱 fine-pointer 한정): 커스텀 글로우 커서 · 스크롤 등장 · 마그네틱 호버.
   터치/모션축소 사용자는 자동 비활성. JS 실패 시 네이티브 커서 유지(안전). */
(function () {
  var fine = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ── 1) 스크롤 등장 (모든 기기) ──
  function setupReveal() {
    var sel = '.app-card, .cat-label, .bridge h2, .bridge p, .bridge .kicker, #about h2, #about p, #about .box, .contact-band, .section-sub, .disclaimer, .built-with';
    var els = [].slice.call(document.querySelectorAll(sel)).filter(function (e) { return !e.classList.contains('reveal') && !e.closest('.appmodal'); });
    els.forEach(function (e) { e.classList.add('reveal'); });
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('reveal-in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.style.transitionDelay = ((en.target._d || 0)) + 'ms'; en.target.classList.add('reveal-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    // 같은 그리드 내 카드는 stagger
    var grids = {};
    els.forEach(function (e) {
      var g = e.closest('.grid'); if (g) { grids[g._i = (grids[g._i] != null ? g._i : Object.keys(grids).length)] = g; var n = (g._n = (g._n || 0)); e._d = Math.min(n, 6) * 55; g._n = n + 1; }
      io.observe(e);
    });
  }

  // ── 2) 마그네틱 호버 (fine pointer) ──
  function setupMagnetic() {
    if (!fine || reduce) return;
    var sel = '.app-card, .cta, .store-btn, .cb-mail, .partner-chip, .lang-select, .snd-toggle';
    document.addEventListener('pointermove', function (ev) {
      var t = ev.target.closest ? ev.target.closest(sel) : null;
      if (!t || t.closest('.appmodal')) return;
      var r = t.getBoundingClientRect();
      var mx = (ev.clientX - (r.left + r.width / 2)) / r.width;
      var my = (ev.clientY - (r.top + r.height / 2)) / r.height;
      var pull = t.classList.contains('app-card') ? 10 : 6;
      t.style.transform = 'translate(' + (mx * pull).toFixed(1) + 'px,' + (my * pull).toFixed(1) + 'px)';
      t.classList.add('magnetic');
    }, { passive: true });
    document.addEventListener('pointerout', function (ev) {
      var t = ev.target.closest ? ev.target.closest(sel) : null;
      if (t && t.classList.contains('magnetic')) { t.style.transform = ''; t.classList.remove('magnetic'); }
    }, { passive: true });
  }

  // ── 3) 커스텀 글로우 커서 (fine pointer) ──
  function setupCursor() {
    if (!fine || reduce) return;
    var dot = document.createElement('div'); dot.className = 'cur-dot';
    var ring = document.createElement('div'); ring.className = 'cur-ring';
    document.body.appendChild(ring); document.body.appendChild(dot);
    document.documentElement.classList.add('has-cursor');   // 네이티브 숨김(여기서만)
    var rx = innerWidth / 2, ry = innerHeight / 2, dx = rx, dy = ry, raf;
    function move(e) { dx = e.clientX; dy = e.clientY; dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; if (!raf) raf = requestAnimationFrame(loop); }
    function loop() { rx += (dx - rx) * 0.18; ry += (dy - ry) * 0.18; ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; if (Math.abs(dx - rx) > 0.3 || Math.abs(dy - ry) > 0.3) raf = requestAnimationFrame(loop); else raf = null; }
    document.addEventListener('pointermove', move, { passive: true });
    var hot = 'a, button, .app-card, [role=button], .store-btn, select, .cb-mail, .partner-chip, summary';
    document.addEventListener('pointerover', function (e) { if (e.target.closest && e.target.closest(hot)) document.documentElement.classList.add('cur-hot'); });
    document.addEventListener('pointerout', function (e) { if (e.target.closest && e.target.closest(hot)) document.documentElement.classList.remove('cur-hot'); });
    document.addEventListener('pointerdown', function () { document.documentElement.classList.add('cur-down'); });
    document.addEventListener('pointerup', function () { document.documentElement.classList.remove('cur-down'); });
  }

  function init() { setupReveal(); setupMagnetic(); setupCursor(); }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
  // 언어 변경으로 그리드 재렌더되면 등장효과 재적용
  document.addEventListener('abfz:lang', function () { setTimeout(setupReveal, 40); });
})();
