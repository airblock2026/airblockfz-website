/* catalog.js — window.APPS(apps.js)로 앱 그리드 + 상세 모달 렌더.
   앱 추가 = 설명/*.md + screenshots/ 추가 후 build_catalog.js 재실행만 하면 자동 반영. */
(function () {
  if (!window.APPS) return;

  function lang() { return (window.AbfzLang ? window.AbfzLang.get() : (document.documentElement.getAttribute('lang') || 'en')); }
  function L(o) { if (!o) return ''; var l = lang(); return o[l] || o.en || o.ko || ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  // 이스케이프 후 **굵게** 마크다운만 <strong>으로(안전: 내부는 이미 이스케이프됨)
  function fmt(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }

  // 카테고리 메타 (5개국어 라벨 + 표시 순서)
  var CATS = [
    { key: 'markets',  label: { en: 'Investing & Markets AI', ko: '투자 · 시장 AI', ja: '投資・市場 AI', zh: '投资 · 市场 AI', ar: 'الاستثمار والأسواق · AI' } },
    { key: 'property', label: { en: 'Real Estate AI',         ko: '부동산 AI',      ja: '不動産 AI',     zh: '房地产 AI',     ar: 'العقارات · AI' } },
    { key: 'lifestyle',label: { en: 'Lifestyle',              ko: '생활',           ja: '生活',          zh: '生活',          ar: 'نمط الحياة' } },
    { key: 'health',   label: { en: 'Health & Self-care',     ko: '건강 · 셀프케어', ja: '健康・セルフケア', zh: '健康 · 自我护理', ar: 'الصحة والعناية' } }
  ];
  var TXT = {
    detail:   { en: 'View details', ko: '자세히 보기', ja: '詳細を見る', zh: '查看详情', ar: 'عرض التفاصيل' },
    more:     { en: 'Details ›', ko: '자세히 ›', ja: '詳細 ›', zh: '详情 ›', ar: 'التفاصيل ›' },
    why:      { en: 'Why ', ko: '왜 ', ja: 'なぜ', zh: '为什么选 ', ar: 'لماذا ' },
    whyQ:     { en: '?', ko: '인가요?', ja: 'なのか', zh: '？', ar: '؟' },
    features: { en: 'Key features', ko: '주요 기능', ja: '主な機能', zh: '主要功能', ar: 'الميزات الرئيسية' },
    who:      { en: "Who it's for", ko: '이런 분께 좋아요', ja: 'こんな方に', zh: '适合人群', ar: 'لمن هذا التطبيق' },
    soon:     { en: 'Coming soon', ko: '곧 출시', ja: '近日公開', zh: '即将上线', ar: 'قريبًا' },
    cross:    { en: 'Android · iOS', ko: 'Android · iOS', ja: 'Android · iOS', zh: 'Android · iOS', ar: 'Android · iOS' },
    premTitle:{ en: 'Unlock with a subscription', ko: '구독하면 열리는 핵심 기능', ja: 'サブスクで解放される主要機能', zh: '订阅后解锁的核心功能', ar: 'تُفتح مع الاشتراك' },
    freeTitle:{ en: 'Completely free', ko: '완전 무료', ja: '完全無料', zh: '完全免费', ar: 'مجاني تمامًا' },
    trial:    { en: '5-day free trial, then auto-renews · cancel anytime', ko: '5일 무료 체험 후 자동 갱신 · 언제든 해지', ja: '5日間無料体験後に自動更新 · いつでも解約', zh: '5 天免费试用后自动续订 · 可随时取消', ar: 'تجربة مجانية 5 أيام ثم تجديد تلقائي · إلغاء في أي وقت' }
  };

  // 캡처 종류별 캡션(구독 유도) — 파일명 premium_NN_<kind>.png 의 <kind>로 매칭
  var CAPS = {
    ai: { title: { en: '🤖 AI Analysis — Buy & Sell in one view', ko: '🤖 AI 분석 — 매수·매도를 한 화면에', ja: '🤖 AI分析 — 買い・売りを一画面で', zh: '🤖 AI 分析 — 买卖一屏掌握', ar: '🤖 تحليل AI — شراء وبيع في شاشة واحدة' },
      desc: { en: 'The core Pro feature. AI analyzes every ticker daily and splits them into Buy candidates (left) and Sell candidates (right) — so you never wonder "what do I buy today?"',
              ko: '구독하면 열리는 핵심 기능. 전 종목을 AI가 매일 자동 분석해 왼쪽엔 매수 후보, 오른쪽엔 매도 후보로 정리합니다. 매일 "뭘 살까" 고민하는 시간을 없애줍니다.',
              ja: 'サブスクの中核機能。AIが全銘柄を毎日分析し、左に買い候補・右に売り候補へ整理します。「今日は何を買う？」と悩む時間をなくします。',
              zh: '订阅的核心功能。AI 每天分析全部标的，左侧为买入候选、右侧为卖出候选——不再纠结"今天买什么"。',
              ar: 'الميزة الأساسية للاشتراك. يحلّل الذكاء الاصطناعي كل الرموز يوميًا ويقسّمها إلى مرشحات شراء (يسار) وبيع (يمين).' } },
    ind: { title: { en: '📊 Momentum & Pain indicators on candles — daily · weekly · monthly', ko: '📊 모멘텀·인간지표 + 캔들로 매수 타이밍 (일·주·월)', ja: '📊 モメンタム・人間指標×ローソク足 — 日・週・月', zh: '📊 动量·人间指标 + K线把握买点（日·周·月）', ar: '📊 مؤشرات الزخم والألم على الشموع — يومي · أسبوعي · شهري' },
      desc: { en: 'Subscription-only indicators. Read the Momentum Index and Pain Meter right on the candle chart across daily, weekly and monthly — to spot bottoms and the best buy timing at a glance.',
              ko: '구독 전용 보조지표. 모멘텀지표와 인간지표(고점 대비 손실)를 캔들 차트와 함께 보며 일봉·주봉·월봉 어디서 바닥을 다지는지, 지금이 매수 타이밍인지 한눈에 잡습니다.',
              ja: 'サブスク専用の補助指標。モメンタム指標と人間指標（高値からの下落）をローソク足と重ねて、日・週・月で底打ちと買いタイミングを一目で。',
              zh: '订阅专属辅助指标。将动量指标与人间指标（距高点回撤）叠加在 K 线上，于日/周/月一眼判断筑底与最佳买点。',
              ar: 'مؤشرات حصرية للمشتركين. اقرأ مؤشر الزخم ومقياس الألم على الشموع عبر اليومي والأسبوعي والشهري لاكتشاف القيعان وأفضل توقيت للشراء.' } },
    macro: { title: { en: '🌐 Macro indicators — the big picture', ko: '🌐 매크로 지표까지 — 시장의 큰 흐름', ja: '🌐 マクロ指標まで — 市場の大きな流れ', zh: '🌐 还能看宏观指标 — 把握大势', ar: '🌐 حتى المؤشرات الكلية — الصورة الأكبر' },
      desc: { en: 'Beyond single tickers — see the whole market. Check the Fed balance sheet, reverse repo and other liquidity/rate macro indicators right inside the app.',
              ko: '개별 종목을 넘어 시장 전체를 봅니다. 연준 총자산·역레포 등 유동성·금리 매크로 지표를 앱 안에서 바로 확인해 큰 흐름을 읽습니다.',
              ja: '個別銘柄を超えて市場全体を。FRB総資産・リバースレポなど流動性・金利のマクロ指標をアプリ内で確認。',
              zh: '超越个股，纵览全市场。在应用内直接查看美联储总资产、逆回购等流动性与利率宏观指标。',
              ar: 'تجاوز الأسهم الفردية — انظر إلى السوق كله. تابع ميزانية الفيدرالي والريبو العكسي ومؤشرات السيولة داخل التطبيق.' } }
  };
  function shotKind(src) { var m = src.match(/premium_\d+_([a-z]+)\.png/i); return m ? m[1].toLowerCase() : ''; }

  var byId = {};
  window.APPS.forEach(function (a) { byId[a.id] = a; });

  // ── 그리드 ──
  function renderGrid() {
    var host = document.getElementById('appCatalog');
    if (!host) return;
    var html = '';
    CATS.forEach(function (c) {
      var list = window.APPS.filter(function (a) { return a.cat === c.key; });
      if (!list.length) return;
      html += '<div class="cat-label">' + esc(L(c.label)) + '</div><div class="grid">';
      list.forEach(function (a) {
        html += '<button class="app-card" data-id="' + esc(a.id) + '" aria-label="' + esc(a.name) + ' — ' + esc(L(TXT.detail)) + '">' +
          '<div class="ico">' + esc(a.icon) + '</div>' +
          '<h3>' + esc(a.name) + '</h3>' +
          '<p>' + esc(L(a.short)) + '</p>' +
          '<span class="more">' + esc(L(TXT.more)) + '</span>' +
          '</button>';
      });
      html += '</div>';
    });
    host.innerHTML = html;
    host.querySelectorAll('.app-card').forEach(function (btn) {
      btn.addEventListener('click', function () { openDetail(btn.getAttribute('data-id')); });
    });
    var n = window.APPS.length;
    document.querySelectorAll('.app-count').forEach(function (el) { el.textContent = n; });
  }

  // ── 상세 모달 ──
  var modal = document.getElementById('appModal');
  var curId = null;

  function detailHTML(a) {
    var whyTitle = (lang() === 'ko') ? (L(TXT.why) + a.name + L(TXT.whyQ)) :
                   (lang() === 'zh') ? (L(TXT.why) + a.name + L(TXT.whyQ)) :
                   (L(TXT.why) + a.name + L(TXT.whyQ));
    // 세로 피처 섹션: 큰 이미지 + 그 아래 설명. 프리미엄 캡처(ai/ind/macro)는 구독 캡션, 없으면 일반 스샷.
    var pShots = (a.shots || []).filter(function (s) { return CAPS[shotKind(s)]; });
    var gShots = (a.shots || []).filter(function (s) { return !CAPS[shotKind(s)]; });
    var feature = function (src, capHTML) {
      return '<figure class="ad-feature"><div class="ad-phone-lg"><img src="' + esc(src) + '" alt="' + esc(a.name) + '"/></div>' + (capHTML || '') + '</figure>';
    };
    var featuresHTML = '';
    if (pShots.length) {
      featuresHTML = pShots.map(function (src) { var c = CAPS[shotKind(src)];
        return feature(src, '<figcaption><h4>' + esc(L(c.title)) + '</h4><p>' + fmt(L(c.desc)) + '</p></figcaption>'); }).join('');
    } else {
      featuresHTML = gShots.map(function (src, i) {
        var cap = (i === 0 && a.premium) ? '<figcaption><p>' + fmt(L(a.premium.hook)) + '</p></figcaption>' : '';
        return feature(src, cap); }).join('');
    }
    var feats = (L(a.features) || []).map(function (f) { return '<li>' + fmt(f) + '</li>'; }).join('');
    var whos = (L(a.who) || []).map(function (w) { return '<li>' + fmt(w) + '</li>'; }).join('');

    // 프리미엄(구독) 강조 블록 — 대폭 강조해 구독 유도
    var premHTML = '';
    if (a.premium) {
      var pItems = (L(a.premium.items) || []).map(function (it) { return '<li>' + fmt(it) + '</li>'; }).join('');
      if (a.premium.free) {
        premHTML = '<div class="ad-premium free">' +
          '<div class="ad-prem-head"><span class="ad-prem-tag">🆓 ' + esc(L(TXT.freeTitle)) + '</span></div>' +
          '<p class="ad-prem-hook">' + fmt(L(a.premium.hook)) + '</p>' +
          '<ul class="ad-prem-list">' + pItems + '</ul></div>';
      } else {
        premHTML = '<div class="ad-premium">' +
          '<div class="ad-prem-head"><span class="ad-prem-tag">🔒 ' + esc(L(TXT.premTitle)) + '</span></div>' +
          '<p class="ad-prem-hook">' + fmt(L(a.premium.hook)) + '</p>' +
          '<ul class="ad-prem-list">' + pItems + '</ul>' +
          '<div class="ad-prem-trial">' + esc(L(TXT.trial)) + '</div></div>';
      }
    }

    return '' +
      '<div class="ad-head">' +
        '<div class="ad-ico">' + esc(a.icon) + '</div>' +
        '<div class="ad-meta">' +
          '<h3 class="ad-name">' + esc(a.name) + '</h3>' +
          '<div class="ad-sub">' + esc(L(a.short)) + '</div>' +
          '<div class="ad-badges"><span class="ad-badge">' + esc(L(TXT.cross)) + '</span></div>' +
        '</div>' +
      '</div>' +
      premHTML +
      (featuresHTML ? '<div class="ad-features">' + featuresHTML + '</div>' : '') +
      '<p class="ad-intro">' + fmt(L(a.intro)) + '</p>' +
      (L(a.why) ? '<div class="ad-why"><span class="ad-why-t">' + esc(whyTitle) + '</span> ' + fmt(L(a.why)) + '</div>' : '') +
      (whos ? '<div class="ad-block"><h4>' + esc(L(TXT.who)) + '</h4><ul class="ad-who">' + whos + '</ul></div>' : '') +
      (feats ? '<div class="ad-block"><h4>' + esc(L(TXT.features)) + '</h4><ul class="ad-feat">' + feats + '</ul></div>' : '') +
      '<div class="ad-cta">' +
        '<span class="store-btn disabled"><span class="store-ico"></span> Google Play · ' + esc(L(TXT.soon)) + '</span>' +
        '<span class="store-btn disabled"><span class="store-ico apple"></span> App Store · ' + esc(L(TXT.soon)) + '</span>' +
      '</div>';
      // 면책은 앱별로 달지 않음 — 홈페이지 최하단 총괄 면책으로 일원화
  }

  // 3D 레이어 인터랙션: ①텍스트 레이어는 스크롤 진입 시 떠오름 ②피처(스크린샷)는 스크롤이 곧 깊이이동
  //   — 다음 이미지는 깊은 곳에서 다가오고, 본 이미지는 앞으로 스쳐 지나간다.
  var _box = null, _onscroll = null;
  function enhance3D() {
    var box = modal.querySelector('.appmodal-box');
    var body = modal.querySelector('.appmodal-body');
    if (!box || !body) return;
    var textLayers = [].slice.call(body.querySelectorAll('.ad-premium, .ad-why, .ad-block, .ad-cta'));
    textLayers.forEach(function (el) { el.classList.add('layer3d'); });
    var feats = [].slice.call(body.querySelectorAll('.ad-feature'));
    feats.forEach(function (el) { el.classList.add('depth3d'); });

    function update() {
      var br = box.getBoundingClientRect();
      // 텍스트 레이어: 뷰포트 들어오면 등장
      textLayers.forEach(function (el) {
        if (!el.classList.contains('in')) { var r = el.getBoundingClientRect(); if (r.top < br.bottom - br.height * 0.05) el.classList.add('in'); }
      });
      // 피처(스크린샷): 초점선(박스 상단에서 42%) 기준 깊이 변환
      var focus = br.top + br.height * 0.42;
      feats.forEach(function (fig) {
        var r = fig.getBoundingClientRect();
        var center = r.top + r.height / 2;
        var d = (center - focus) / br.height;   // >0 = 아직 아래(다가올 것), <0 = 위로 지나감
        var ad = Math.min(Math.abs(d), 1.2);
        var tz, ty, sc, rx, op;
        if (d >= 0) {                            // 깊은 곳에서 다가옴(back→focus) — 블러·축소된 채 올라옴
          var a = Math.min(d, 1.2);
          tz = -a * 470; ty = a * 28; sc = 1.07 - Math.min(a, 1) * 0.44; rx = Math.min(a, 1) * 15;
          op = 1 - Math.max(a - 0.62, 0) * 1.5;   // 멀어도 보이되(스택 깊이감), 아주 멀면 사라짐
        } else {                                 // 초점을 지나 위·뒤로 물러나며 사라짐(focus→away)
          var b = Math.min(-d, 1.2);
          tz = -b * 230; ty = -b * 80; sc = 1.07 - Math.min(b, 1) * 0.32; rx = -b * 22;
          op = 1 - Math.max(b - 0.04, 0) * 1.9;   // 본 것은 빠르게 페이드(본문 겹침 방지)
        }
        // Z-depth 포커스: 초점=최대·밝게, 멀수록 작고 어둡게 (블러는 사용 안 함)
        var bright = (1 - ad * 0.34).toFixed(2);
        fig.style.transform = 'translateY(' + ty.toFixed(0) + 'px) translateZ(' + tz.toFixed(0) + 'px) scale(' + sc.toFixed(3) + ') rotateX(' + rx.toFixed(1) + 'deg)';
        fig.style.filter = 'brightness(' + bright + ')';
        fig.style.opacity = Math.max(0, Math.min(1, op)).toFixed(2);
        fig.style.zIndex = String(Math.round(20 - ad * 16));   // 초점이 맨 앞
        fig.style.pointerEvents = (ad > 0.25) ? 'none' : '';
      });
    }
    if (_box && _onscroll) _box.removeEventListener('scroll', _onscroll);
    _box = box; _onscroll = update;
    box.addEventListener('scroll', update, { passive: true });
    requestAnimationFrame(update);
    [60, 240, 500].forEach(function (t) { setTimeout(update, t); });
    // 이미지 로드되면 레이아웃 확정 → 깊이 재계산
    body.querySelectorAll('.ad-feature img').forEach(function (img) {
      if (!img.complete) img.addEventListener('load', function () { update(); }, { once: true });
    });
  }

  function openDetail(id) {
    var a = byId[id]; if (!a || !modal) return;
    curId = id;
    modal.querySelector('.appmodal-body').innerHTML = detailHTML(a);
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.scrollTop = 0;
    var box = modal.querySelector('.appmodal-box'); if (box) box.scrollTop = 0;
    enhance3D();
    var closeBtn = modal.querySelector('.appmodal-close'); if (closeBtn) closeBtn.focus();
  }
  function closeDetail() {
    if (!modal) return;
    modal.hidden = true; curId = null;
    document.body.classList.remove('modal-open');
  }

  if (modal) {
    modal.querySelectorAll('[data-close]').forEach(function (el) { el.addEventListener('click', closeDetail); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeDetail(); });
  }

  // 언어 변경 → 그리드/모달 재렌더
  document.addEventListener('abfz:lang', function () {
    renderGrid();
    if (curId && modal && !modal.hidden) { modal.querySelector('.appmodal-body').innerHTML = detailHTML(byId[curId]); enhance3D(); }
  });

  function init() { renderGrid(); }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
