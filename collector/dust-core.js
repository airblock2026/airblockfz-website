/**
 * 🏭 공용 엔진 18호 — 모래·먼지 위험 코어 (`window.Dust`)
 *
 *   "지금 모래바람이 부는가, 곧 불 것 같은가."
 *   UAE·사우디·쿠웨이트 계열 앱의 **차별점이 되는 판정**이다.
 *
 * 🚨 이건 관측이 아니라 **판정**이다. 그래서 결과에 항상 `estimated:true` 가 붙는다.
 *    공식 경보(NCM 등)를 받는 앱은 `official` 을 넘긴다 — 그때만 `estimated:false` 가 된다.
 *    화면은 이 값을 보고 "Estimated" 배지를 붙인다. 이 두 가지를 절대 섞지 말 것.
 *
 * 🔑 **PM10 에서 모래를 역산하지 않는다.** CAMS 는 `dust` 를 따로 준다(µg/m³).
 *    PM10 은 공사·매연으로도 오르지만 `dust` 는 모래만 오른다 — 주(主) 신호는 `dust` 다.
 *    PM10 은 보조로만 쓴다(모래 아닌 이유로 나빠도 밖은 여전히 나쁘니까).
 *
 * 🚨 임계값을 코드에 박지 말 것 — `APP_CFG.dust.thresholds` 로 앱이 덮어쓴다(도시마다 평상시 농도가 다르다).
 * 🚨 이 파일을 앱 폴더에서 고치지 말 것. `_shared/air/` 를 고치고 sync-all.sh 를 돌린다.
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';

  function L(ko, en) {
    try { if (typeof global.L === 'function') return global.L(ko, en); } catch (_) {}
    return en;
  }

  /* 단계 — 숫자가 클수록 위험. 색만으로 말하지 않으려고 아이콘·글자를 같이 갖는다. */
  var LEVELS = [
    { i: 0, key: 'LOW',      icon: '🟢', color: '#3fb950', ko: '낮음',      en: 'Low' },
    { i: 1, key: 'MODERATE', icon: '🟠', color: '#e58b3c', ko: '보통',      en: 'Moderate' },
    { i: 2, key: 'HIGH',     icon: '🔴', color: '#f85149', ko: '높음',      en: 'High' },
    { i: 3, key: 'EXTREME',  icon: '🟤', color: '#7d2f2f', ko: '매우 높음', en: 'Extreme' }
  ];

  /**
   * 기본 임계값 — 셋을 주면 [MODERATE 시작, HIGH 시작, EXTREME 시작] 이다.
   *
   * 🚨 잠정값이다. UAE 실데이터를 1주 쌓아 보정해야 한다.
   *    🧪 첫 판은 dust [25,60,150] 이었는데 **평범한 날이 '높음'으로 떴다** —
   *       2026-08-14 19:00 두바이 실측: dust 77 · 가시거리 15.8km · 돌풍 16km/h(= 맑고 조용한 날).
   *       온대지방 감각으로 잡으면 UAE 는 1년 내내 빨간불이 된다. 그래서 [60,120,250] 으로 올렸다.
   */
  var DEF = {
    dust:       [60, 120, 250],     // µg/m³ — 주 신호
    pm10:       [80, 150, 250],     // µg/m³ — 보조
    gust:       [30, 45, 60],       // km/h — 돌풍이 모래를 띄운다
    wind:       [20, 35, 50],       // km/h — 지속풍
    visLow:     [5000, 2000, 1000], // m — **낮을수록 위험**(방향이 반대다)
    surge:      30,                 // µg/m³ per hour — 이만큼 급증하면 한 단계 올린다
    aod:        [0.4, 0.8, 1.2]     // 에어로졸 광학두께 — dust 를 교차검증한다
  };

  function cfgThresholds() {
    var c = (global.APP_CFG && global.APP_CFG.dust && global.APP_CFG.dust.thresholds) || {};
    var out = {};
    Object.keys(DEF).forEach(function (k) { out[k] = (c[k] != null) ? c[k] : DEF[k]; });
    return out;
  }

  /** 값 → 단계(0~3). 값이 없으면 null(모른다) */
  function step(v, t) {
    /* 🚨 음수는 결측으로 친다 — 농도·풍속에 음수가 오면 그건 값이 아니라 오류다.
       그대로 두면 '낮음(안전)' 으로 읽혀 위험을 숨긴다. */
    if (v == null || isNaN(v) || v < 0) return null;
    if (v >= t[2]) return 3;
    if (v >= t[1]) return 2;
    if (v >= t[0]) return 1;
    return 0;
  }
  /** 낮을수록 위험한 값(가시거리) */
  function stepLow(v, t) {
    if (v == null || isNaN(v) || v < 0) return null;
    if (v <= t[2]) return 3;
    if (v <= t[1]) return 2;
    if (v <= t[0]) return 1;
    return 0;
  }

  /**
   * 모래·먼지 위험 판정.
   *
   * @param {Object} o
   *   dust        µg/m³   CAMS 모래먼지 (주 신호)
   *   dustPrev    µg/m³   1시간 전 값 — 급증 감지용
   *   pm10,pm2_5  µg/m³
   *   aod         무차원   에어로졸 광학두께
   *   windKmh, gustKmh
   *   visibilityM m
   *   official    {level:'HIGH', text:'…'} 공식 경보가 있으면 **그것이 이긴다**
   * @returns {{level:string, levelInfo:Object, score:number, estimated:boolean,
   *            reasons:Array<string>, main:string|null, missing:Array<string>}}
   */
  /**
   * 🧪 **조대입자 대체** — `dust` 를 안 주는 공급자(OpenWeather 등)를 위한 길.
   *
   *   모래는 굵은 입자다. PM10 에서 PM2.5 를 빼면 그 굵은 쪽(조대입자)만 남는다.
   *   UAE 실데이터로 재 봤다(2026-08-14 · 6개 도시 × 1,296시간, dust 18~938 µg/m³):
   *     상관 r = 0.954 ~ 0.973 · coarse/dust 중앙값 0.50~0.56 → **dust ≈ coarse × 1.8**
   *     위험 단계 일치 89.6% · 1단계 차 10.4% · **2단계 이상 차 0%**
   *
   * 🚨 어긋나도 항상 한 칸이고, 낮은 쪽을 높게 부르는 방향이 아니다.
   *    그래도 추정의 추정이므로 근거 문구에 **환산했다는 사실을 적는다**(화면이 속이면 안 된다).
   */
  var COARSE_K = 1.8;
  function coarseToDust(pm10, pm25, k) {
    if (pm10 == null || pm25 == null || isNaN(pm10) || isNaN(pm25)) return null;
    return Math.max(0, pm10 - pm25) * (k || COARSE_K);
  }

  function risk(o) {
    o = o || {};
    var T = cfgThresholds();

    /* 공급자가 `dust` 를 안 주면 조대입자에서 환산해 쓴다 — 없다고 판정을 포기하지 않는다 */
    var fromCoarse = false;
    if (o.dust == null) {
      var k = (global.APP_CFG && global.APP_CFG.dust && global.APP_CFG.dust.coarseK) || COARSE_K;
      var est = coarseToDust(o.pm10, o.pm2_5, k);
      if (est != null) { o = Object.assign({}, o, { dust: est }); fromCoarse = true; }
    }

    /* 🚨 공식 경보가 있으면 판정하지 않는다 — 받아 적는다. */
    if (o.official && o.official.level) {
      var oi = LEVELS.filter(function (x) { return x.key === String(o.official.level).toUpperCase(); })[0] || LEVELS[2];
      return {
        level: oi.key, levelInfo: oi, score: 25 + oi.i * 25, estimated: false,
        reasons: [o.official.text || L('공식 기상 경보', 'Official weather warning')],
        main: 'official', missing: []
      };
    }

    var parts = [
      { k: 'dust', s: step(o.dust, T.dust), v: o.dust, unit: 'µg/m³', est: fromCoarse,
        ko: fromCoarse ? '모래먼지(PM10−PM2.5 환산)' : '모래먼지',
        en: fromCoarse ? 'Dust (from PM10−PM2.5)' : 'Dust', w: 1.0 },
      { k: 'pm10', s: step(o.pm10, T.pm10), v: o.pm10, unit: 'µg/m³',
        ko: 'PM10', en: 'PM10', w: 0.9 },
      { k: 'gust', s: step(o.gustKmh, T.gust), v: o.gustKmh, unit: 'km/h',
        ko: '돌풍', en: 'Gusts', w: 0.8 },
      { k: 'wind', s: step(o.windKmh, T.wind), v: o.windKmh, unit: 'km/h',
        ko: '바람', en: 'Wind', w: 0.7 },
      { k: 'vis', s: stepLow(o.visibilityM, T.visLow), v: o.visibilityM, unit: 'm',
        ko: '가시거리', en: 'Visibility', w: 0.95 },
      { k: 'aod', s: step(o.aod, T.aod), v: o.aod, unit: '',
        ko: '대기 혼탁도', en: 'Aerosol depth', w: 0.6 }
    ];

    var known = parts.filter(function (p) { return p.s != null; });
    var missing = parts.filter(function (p) { return p.s == null; }).map(function (p) { return p.k; });

    /* 🚨 아무것도 못 받았으면 **판정하지 않는다.** 0(= 안전)으로 떨어뜨리면 거짓말이 된다. */
    if (!known.length) {
      return { level: null, levelInfo: null, score: null, estimated: true,
               reasons: [L('판정에 필요한 데이터를 받지 못했습니다.', 'Not enough data to assess dust risk.')],
               main: null, missing: missing };
    }

    /* 단계 = 각 신호의 **최댓값**. 평균을 내면 하나가 극단이어도 묻힌다(모래폭풍이 그렇게 온다). */
    var top = known.reduce(function (a, b) { return (b.s > a.s || (b.s === a.s && b.w > a.w)) ? b : a; });
    var lv = top.s;

    var reasons = [];
    reasons.push(fmt(top));

    /* 📈 급증 — 값 자체는 낮아도 **오르는 중**이면 한 단계 올린다(스펙 7번) */
    var surged = false;
    if (o.dust != null && o.dustPrev != null && (o.dust - o.dustPrev) >= T.surge) {
      surged = true;
      if (lv < 3) lv += 1;
      /* 🚨 값은 번역 **뒤에** 꽂는다 — 문장에 숫자를 먼저 붙이면 사전 열쇠가 매번 달라진다 */
      reasons.push(L('모래먼지가 1시간 만에 {n} µg/m³ 늘었습니다', 'Dust rose {n} µg/m³ in the last hour')
        .replace('{n}', Math.round(o.dust - o.dustPrev)));
    }

    /* 근거를 두 개까지 더 붙인다 — 화면은 최대 3줄만 보여 준다(스펙 28번) */
    known.filter(function (p) { return p !== top && p.s >= 1; })
      .sort(function (a, b) { return (b.s - a.s) || (b.w - a.w); })
      .slice(0, 2).forEach(function (p) { reasons.push(fmt(p)); });

    var info = LEVELS[lv];

    /* 점수(0~100) — 게이지용. 단계 안에서의 위치까지 반영해 같은 MODERATE 라도 눈금이 움직인다. */
    var score = Math.min(100, Math.round(lv * 25 + 25 * within(top, T) + (surged ? 8 : 0)));

    return { level: info.key, levelInfo: info, score: score, estimated: true,
             fromCoarse: fromCoarse, reasons: reasons, main: top.k, missing: missing };
  }

  /** 단계 안에서 얼마나 올라와 있는가 0~1 — 게이지가 계단으로 튀지 않게 */
  function within(p, T) {
    var t = (p.k === 'vis') ? T.visLow : T[p.k === 'aod' ? 'aod' : p.k];
    if (!t || p.v == null) return 0;
    var s = p.s;
    if (p.k === 'vis') {
      if (s >= 3) return 1;
      var loV = s === 0 ? Infinity : t[s - 1], hiV = t[s];
      if (!isFinite(loV)) loV = t[0] * 3;
      return clamp01((loV - p.v) / Math.max(1, loV - hiV));
    }
    if (s >= 3) return 1;
    var lo = s === 0 ? 0 : t[s - 1], hi = t[s];
    return clamp01((p.v - lo) / Math.max(1e-6, hi - lo));
  }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  /** 근거 한 줄 — "왜 그렇게 판정했는가"는 반드시 숫자로 말한다 */
  function fmt(p) {
    var v = p.v;
    /* 🌐 **이름만 번역하고 숫자는 뒤에 붙인다.** 문장째 번역하면 사전 열쇠가 값마다 달라진다. */
    if (p.k === 'vis') return L('가시거리', 'Visibility') + ' ' + (v / 1000).toFixed(1) + ' km';
    return L(p.ko, p.en) + ' ' + (Math.round(v * 10) / 10) + (p.unit ? ' ' + p.unit : '');
  }

  /** 단계 이름 — 화면 언어로 */
  function levelText(level) {
    var i = LEVELS.filter(function (x) { return x.key === level; })[0];
    return i ? L(i.ko, i.en) : L('정보 없음', 'Unavailable');
  }

  /** 행동 문구 */
  function advice(level) {
    switch (level) {
      case 'LOW':      return L('모래바람 걱정은 없습니다.', 'No significant dust expected.');
      case 'MODERATE': return L('먼지가 다소 있습니다. 민감한 사람은 마스크를 챙기세요.',
                                'Some airborne dust. Sensitive people may want a mask.');
      case 'HIGH':     return L('먼지가 많습니다. 가시거리가 나빠질 수 있으니 실외활동을 줄이세요.',
                                'Elevated dust. Visibility may drop — reduce outdoor activity.');
      case 'EXTREME':  return L('모래폭풍 수준입니다. 외출을 피하고 창문을 닫으세요.',
                                'Dust storm conditions. Stay indoors and keep windows closed.');
      default:         return L('모래 위험을 판정할 수 없습니다.', 'Dust risk cannot be assessed.');
    }
  }

  global.Dust = {
    version: VERSION, risk: risk, levels: LEVELS, levelText: levelText, advice: advice,
    defaults: DEF, thresholds: cfgThresholds, coarseToDust: coarseToDust, COARSE_K: COARSE_K
  };
})(typeof window !== 'undefined' ? window : globalThis);
