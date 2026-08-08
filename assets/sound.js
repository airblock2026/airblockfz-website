/* sound.js — 홈페이지 클릭/터치 효과음 (앱 제작에 쓴 mainmenu01.mp3 재사용).
   버튼·카드·링크·셀렉트 탭 시 재생. 우하단 음소거 토글(localStorage abfz-muted). */
(function () {
  var SRC = 'assets/sound/mainmenu01.mp3';
  var KEY = 'abfz-muted';
  var muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  // 빠른 연타 안정: 오디오 풀
  var POOL = 3, pool = [], idx = 0, ready = false;
  function buildPool() {
    if (ready) return;
    for (var i = 0; i < POOL; i++) { var a = new Audio(SRC); a.preload = 'auto'; a.volume = 0.32; pool.push(a); }
    ready = true;
  }
  function play() {
    if (muted) return;
    buildPool();
    var a = pool[idx]; idx = (idx + 1) % POOL;
    try { a.currentTime = 0; var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  // 클릭 위임 (캡처 단계) — 인터랙티브 요소만
  var SEL = 'button, a, .app-card, select, [role="button"], .store-btn, summary';
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest(SEL) : null;
    if (!t) return;
    if (t.hasAttribute('data-no-sound')) return;
    play();
  }, true);

  // 음소거 토글 버튼
  function buildToggle() {
    var btn = document.createElement('button');
    btn.id = 'sndToggle'; btn.className = 'snd-toggle'; btn.setAttribute('data-no-sound', '1');
    btn.setAttribute('aria-label', 'Toggle sound');
    function paint() { btn.textContent = muted ? '🔇' : '🔊'; btn.classList.toggle('off', muted); btn.setAttribute('aria-pressed', String(muted)); }
    paint();
    btn.addEventListener('click', function () {
      muted = !muted; try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
      paint(); if (!muted) play();
    });
    document.body.appendChild(btn);
  }
  if (document.readyState !== 'loading') buildToggle();
  else document.addEventListener('DOMContentLoaded', buildToggle);
})();
