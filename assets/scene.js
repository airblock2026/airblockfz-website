/* scene.js — 사막→오아시스 스크롤 시네마틱.
   .journey(긴 스크롤 컨테이너) 안에서 진행도 p(0~1)를 계산해
   - CSS 변수 --p (패럴랙스/낙타 이동/하늘)
   - data-phase 0~4 (단계별 하늘·캡션)
   - [data-show] 요소 .show (마일스톤 등장: 야자/호리병/부르즈/오아시스)
   를 갱신. JS 없어도 콘텐츠는 그대로 보임(점진적 향상). */
(function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function init() {
    var journey = document.querySelector('.journey');
    var stage = document.querySelector('.journey .stage');
    if (!journey || !stage) return;
    // 성능: 좁은 화면·모션감소 환경에서 파티클 수 감소
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var smallScreen = window.innerWidth < 560;
    var RAIN_N = reduceMotion ? 0 : (smallScreen ? 48 : 90);
    var SAND_N = reduceMotion ? 0 : (smallScreen ? 64 : 130);
    var STAR_N = smallScreen ? 28 : 40;
    var caps = [].slice.call(document.querySelectorAll('.journey .cap'));
    var marks = [].slice.call(document.querySelectorAll('.journey [data-show]'));
    var hint = document.querySelector('.scroll-hint');
    var ticking = false;

    function apply() {
      ticking = false;
      var total = journey.offsetHeight - window.innerHeight;
      var top = journey.getBoundingClientRect().top;
      var p = clamp((-top) / (total || 1), 0, 1);
      stage.style.setProperty('--p', p.toFixed(4));
      var phase = clamp(Math.floor(p * 5), 0, 4);
      if (stage.getAttribute('data-phase') !== String(phase)) stage.setAttribute('data-phase', String(phase));
      caps.forEach(function (c) { c.classList.toggle('on', +c.getAttribute('data-cap') === phase); });
      marks.forEach(function (m) { m.classList.toggle('show', p >= +m.getAttribute('data-show')); });
      // 엔딩: 오아시스 도착 → 나그네 풍덩 다이빙 + 수영
      var end = p >= 0.9 ? '1' : '0';
      if (stage.getAttribute('data-end') !== end) stage.setAttribute('data-end', end);
      // 청룡 승천 (다이빙·수영 후 마지막)
      var asc = p >= 0.955 ? '1' : '0';
      if (stage.getAttribute('data-ascend') !== asc) {
        stage.setAttribute('data-ascend', asc);
        if (asc === '1') {   // 진입할 때마다 승천 애니메이션 깨끗이 재시작
          var dr = document.querySelector('.dragon');
          if (dr) { dr.style.animation = 'none'; void dr.offsetWidth; dr.style.animation = ''; }
        }
      }
      if (hint) hint.style.opacity = p > 0.04 ? '0' : '';
    }
    function onScroll() { if (!ticking) { ticking = true; (window.requestAnimationFrame || function (f) { setTimeout(f, 16); })(apply); } }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();

    // 별 반짝임(오아시스 야경) — 동적 생성, 과하지 않게
    var sky = document.querySelector('.journey .stars');
    if (sky && !sky.childNodes.length) {
      var html = '';
      for (var i = 0; i < STAR_N; i++) {
        var x = (i * 47 % 100), y = (i * 29 % 60), d = (i % 5) * 0.4, s = 1 + (i % 3) * 0.6;
        html += '<i style="left:' + x + '%;top:' + y + '%;width:' + s + 'px;height:' + s + 'px;animation-delay:' + d + 's"></i>';
      }
      sky.innerHTML = html;
    }

    // 빗방울 — 개별 물방울 90개(깊이감: 가까운 비는 굵고 빠르고 진하게, 먼 비는 가늘고 느리고 흐리게)
    var rain = document.querySelector('.journey .rain');
    if (rain && !rain.childNodes.length) {
      var rh = '';
      for (var r = 0; r < RAIN_N; r++) {
        var rx = (r * 1.117 * 53 % 100).toFixed(2);          // 가로 분포(의사난수)
        var depth = (r % 7) / 6;                               // 0(먼)~1(가까운)
        var len = (10 + depth * 20).toFixed(1);               // 길이 10~30px
        var w = (0.9 + depth * 1.6).toFixed(2);               // 굵기
        var dur = (1.5 - depth * 0.85).toFixed(2);            // 0.65~1.5s (가까울수록 빠름)
        var delay = ((r * 0.137) % 1.5).toFixed(2);
        var op = (0.35 + depth * 0.55).toFixed(2);
        rh += '<i class="drop" style="left:' + rx + '%;height:' + len + 'px;width:' + w + 'px;opacity:' + op +
              ';animation-duration:' + dur + 's;animation-delay:-' + delay + 's"></i>';
      }
      // 바닥 튀김 링 14개
      for (var k = 0; k < (RAIN_N ? 14 : 0); k++) {
        var kx = (k * 7.3 + 4) % 96;
        var kd = (k * 0.21 % 1.6).toFixed(2);
        rh += '<i class="ripple" style="left:' + kx.toFixed(1) + '%;animation-delay:-' + kd + 's"></i>';
      }
      rain.innerHTML = rh;
    }

    // 모래폭풍 파티클 — 모래알 130개(바람 따라 수평 이동 + 사인 흔들림 = 유체 느낌, 깊이감 2층)
    var grains = document.querySelector('.journey .sandstorm .grains');
    if (grains && !grains.childNodes.length) {
      var gh = '';
      for (var g = 0; g < SAND_N; g++) {
        var gy = (g * 2.317 * 41 % 100).toFixed(2);        // 세로 분포
        var dep = ((g * 13) % 9) / 8;                       // 0(먼)~1(가까운)
        var sz = (1.4 + dep * 5).toFixed(1);               // 알갱이 1.4~6.4px
        var gdur = (4.6 - dep * 2.6).toFixed(2);           // 가까울수록 빠름 2.0~4.6s
        var gdel = ((g * 0.173) % 4.6).toFixed(2);
        var gop = (0.28 + dep * 0.55).toFixed(2);
        var sway = (6 + (g % 7) * 4).toFixed(0);           // 상하 흔들림 진폭 6~30px
        gh += '<i class="grain" style="top:' + gy + '%;width:' + sz + 'px;height:' + sz + 'px;opacity:' + gop +
              ';--sy:' + sway + 'px;animation-duration:' + gdur + 's;animation-delay:-' + gdel + 's"></i>';
      }
      grains.innerHTML = gh;
    }
  }
  // 인트로 캡션 글자별 등장 — 현재 보이는 언어 스팬의 글자를 span으로 쪼개 stagger 애니
  function animateIntro() {
    var cap0 = document.querySelector('.journey .caps .cap[data-cap="0"]');
    if (!cap0) return;
    ['h2', 'p'].forEach(function (tag) {
      var host = cap0.querySelector(tag);
      if (!host) return;
      var spans = [].slice.call(host.querySelectorAll('[data-lang]'));
      var vis = spans.filter(function (s) { return getComputedStyle(s).display !== 'none'; });
      var target = vis[0] || host;
      if (target.getAttribute('data-split') === '1') return;
      var text = target.textContent;
      target.setAttribute('data-split', '1');
      target.textContent = '';
      var base = (tag === 'p') ? 0.35 : 0;   // 부제는 제목 뒤에 이어서
      text.split('').forEach(function (ch, i) {
        var s = document.createElement('span');
        s.className = 'ltr';
        s.textContent = (ch === ' ') ? ' ' : ch;
        s.style.animationDelay = (base + i * 0.045).toFixed(3) + 's';
        target.appendChild(s);
      });
    });
  }

  function start() {
    init();
    // app.js의 언어 가시성 적용 후 실행
    setTimeout(animateIntro, 60);
    document.addEventListener('abfz:lang', function () {
      var cap0 = document.querySelector('.journey .caps .cap[data-cap="0"]');
      if (cap0) cap0.querySelectorAll('[data-split]').forEach(function (e) { e.removeAttribute('data-split'); });
      setTimeout(animateIntro, 30);
    });
  }
  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
