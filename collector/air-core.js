/**
 * 🏭 공용 엔진 17호 — 대기질 코어 (`window.Air`)
 *
 * 열 엔진([[Heat]])이 "얼마나 뜨거운가"를 답한다면, 이 엔진은 **"숨쉬어도 되는가"**를 답한다.
 *
 *   usAqi(p)        오염물질 농도 → 미국 EPA AQI + **주(主) 오염물질**
 *   band(aqi)       6단계 구간 (Good … Hazardous)
 *   advice(aqi)     숫자를 사람 말로 — "민감군은 장시간 실외활동을 줄이세요"
 *
 * 🚨 **API 가 주는 `us_aqi` 를 그냥 쓰면 "무엇 때문에 나쁜지"를 모른다.**
 *    그래서 물질별 AQI 를 직접 계산해 최댓값(=주 오염물질)까지 낸다.
 *    UAE 에서는 이 답이 거의 항상 PM10 이고, 그게 곧 "모래"라는 뜻이다 — 앱의 핵심 단서다.
 *
 * 🚨 이 파일을 앱 폴더에서 고치지 말 것. `_shared/air/` 를 고치고 sync-all.sh 를 돌린다.
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';

  /* 문자열은 엔진이 ko/en 두 벌로 갖고, 화면에서 `L(ko,en)` 로 꺼낸다.
     ja/zh/ar 은 앱 사전(`I18N.addDict`)이 영어 문장을 키로 받아 답한다 — 엔진이 5개국어를 품지 않는다. */
  function L(ko, en) {
    try { if (typeof global.L === 'function') return global.L(ko, en); } catch (_) {}
    return en;
  }

  // ══════════════════════════════════════════════════════════════
  // 1. 미국 EPA AQI — 구간 선형보간
  //
  //   AQI = (Ihi-Ilo)/(Chi-Clo) × (C-Clo) + Ilo
  //
  //   🚨 기체(O3·NO2·SO2·CO)의 EPA 기준은 **ppb/ppm** 인데 Open-Meteo(CAMS)는 **µg/m³** 로 준다.
  //      그대로 넣으면 NO2 가 실제의 2배로 잡힌다. 25℃·1013hPa 기준으로 환산해서 넣는다.
  //          ppb = µg/m³ × 24.45 / 분자량
  // ══════════════════════════════════════════════════════════════

  /** AQI 구간 상한 (미국 EPA 공통) */
  var I_BP = [[0, 50], [51, 100], [101, 150], [151, 200], [201, 300], [301, 500]];

  /** 물질별 농도 구간 — 단위는 각 물질의 EPA 표준 단위 */
  var C_BP = {
    pm2_5: [[0, 9.0], [9.1, 35.4], [35.5, 55.4], [55.5, 125.4], [125.5, 225.4], [225.5, 325.4]],  // µg/m³ (2024 개정)
    pm10:  [[0, 54], [55, 154], [155, 254], [255, 354], [355, 424], [425, 604]],                   // µg/m³
    o3:    [[0, 54], [55, 70], [71, 85], [86, 105], [106, 200], [201, 300]],                       // ppb (8시간)
    no2:   [[0, 53], [54, 100], [101, 360], [361, 649], [650, 1249], [1250, 2049]],                // ppb (1시간)
    so2:   [[0, 35], [36, 75], [76, 185], [186, 304], [305, 604], [605, 1004]],                    // ppb (1시간)
    co:    [[0, 4.4], [4.5, 9.4], [9.5, 12.4], [12.5, 15.4], [15.5, 30.4], [30.5, 50.4]]           // ppm (8시간)
  };

  /** µg/m³ → ppb 환산 계수 (25℃·1013hPa) */
  var MOL = { o3: 48.0, no2: 46.01, so2: 64.07, co: 28.01 };
  function ugToPpb(ug, mw) { return ug * 24.45 / mw; }

  /** 물질 하나의 AQI. 범위를 벗어나면 null(모른다 — **0 으로 속이지 않는다**) */
  function aqiOf(key, conc) {
    /* 🚨 **음수 농도는 있을 수 없다.** 모델이 -0.1 같은 값을 줄 때가 있는데
       그대로 넣으면 첫 구간에 걸려 '좋음' 이 된다 — 이상한 값을 **안전하다고 말하는** 셈이다.
       모르는 값은 null 이어야 한다(2026-08-19 극단값 주입 검증에서 잡음). */
    if (conc == null || isNaN(conc) || conc < 0) return null;
    var bp = C_BP[key]; if (!bp) return null;
    for (var i = 0; i < bp.length; i++) {
      var c = bp[i];
      if (conc >= c[0] && conc <= c[1]) {
        var I = I_BP[i];
        return Math.round((I[1] - I[0]) / (c[1] - c[0]) * (conc - c[0]) + I[0]);
      }
    }
    return conc > bp[bp.length - 1][1] ? 500 : null;    // 표 밖(초고농도) = 최댓값
  }

  // ══════════════════════════════════════════════════════════════
  // 1-b. NowCast — 🚨 **순간 농도를 그대로 AQI 로 바꾸면 안 된다**
  //
  //   미국 EPA 의 PM 기준표는 **24시간 평균** 농도용이다. 지금 이 순간의 값을 그대로 넣으면
  //   AQI 가 부풀려진다. 실측(2026-08-18 두바이 모래 사건): 순간값으로 계산하면 **324**,
  //   같은 시각 CAMS 의 us_aqi 는 **158** — 두 배 차이였다.
  //   AirNow 가 실시간 AQI 에 쓰는 방법이 NowCast: **최근 12시간 가중평균**이다.
  //     w* = 최근12시간 최소/최대   ·   w = max(w*, 0.5)
  //     NowCast = Σ(wⁱ·cᵢ) / Σ(wⁱ)      (i=0 이 가장 최근)
  //   → 값이 급변할수록(모래폭풍) 가중치가 최근 쪽으로 쏠려 빠르게 따라간다.
  //
  //   🚨 최근 3시간 중 2개 이상이 있어야 계산한다. 없으면 **순간값으로 떨어지고 그렇다고 밝힌다**.
  // ══════════════════════════════════════════════════════════════
  /**
   * @param {Array<number|null>} series 최근 12시간, **0번이 가장 최근**
   * @returns {number|null}
   */
  function nowCast(series) {
    if (!series || !series.length) return null;
    var s = series.slice(0, 12);
    var recent = s.slice(0, 3).filter(function (v) { return v != null && !isNaN(v); });
    if (recent.length < 2) return null;                       // 최근 3시간 중 2개 미만 → 못 쓴다
    var vals = s.filter(function (v) { return v != null && !isNaN(v); });
    if (vals.length < 2) return null;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx <= 0) return 0;
    var w = Math.max(mn / mx, 0.5);
    var num = 0, den = 0;
    for (var i = 0; i < s.length; i++) {
      if (s[i] == null || isNaN(s[i])) continue;
      var wi = Math.pow(w, i);
      num += wi * s[i]; den += wi;
    }
    return den ? Math.round(num / den * 10) / 10 : null;
  }

  /**
   * 오염물질 묶음 → AQI + 주 오염물질.
   * @param {Object} p {pm2_5, pm10, ozone, nitrogen_dioxide, sulphur_dioxide, carbon_monoxide} (µg/m³)
   * @param {Object} [o] {pm25Series, pm10Series} 최근 12시간(0번이 최근) — 있으면 NowCast 로 계산한다
   * @returns {{aqi, dominant, per, method:'nowcast'|'instant'}}
   */
  function usAqi(p, o) {
    p = p || {}; o = o || {};
    var nc25 = nowCast(o.pm25Series), nc10 = nowCast(o.pm10Series);
    var method = (nc25 != null || nc10 != null) ? 'nowcast' : 'instant';
    var per = {
      pm2_5: aqiOf('pm2_5', nc25 != null ? nc25 : p.pm2_5),
      pm10:  aqiOf('pm10', nc10 != null ? nc10 : p.pm10),
      o3:    p.ozone != null ? aqiOf('o3', ugToPpb(p.ozone, MOL.o3)) : null,
      no2:   p.nitrogen_dioxide != null ? aqiOf('no2', ugToPpb(p.nitrogen_dioxide, MOL.no2)) : null,
      so2:   p.sulphur_dioxide != null ? aqiOf('so2', ugToPpb(p.sulphur_dioxide, MOL.so2)) : null,
      co:    p.carbon_monoxide != null ? aqiOf('co', ugToPpb(p.carbon_monoxide, MOL.co) / 1000) : null   // ppb → ppm
    };
    var best = null, who = null;
    Object.keys(per).forEach(function (k) {
      if (per[k] == null) return;
      if (best == null || per[k] > best) { best = per[k]; who = k; }
    });
    return { aqi: best, dominant: who, per: per, method: method };
  }

  // ══════════════════════════════════════════════════════════════
  // 2. 구간 — 색만으로 말하지 않는다. **아이콘 + 숫자 + 글자** 세 벌을 같이 준다.
  // ══════════════════════════════════════════════════════════════
  var BANDS = [
    { key: 'good',      max: 50,  icon: '🟢', color: '#3fb950', ko: '좋음',        en: 'Good' },
    { key: 'moderate',  max: 100, icon: '🟡', color: '#e5c04b', ko: '보통',        en: 'Moderate' },
    /* 🚨 '민감군' 은 관공서 말이다 — 화면에는 **누구를 말하는지**가 보이게 쓴다 */
    { key: 'usg',       max: 150, icon: '🟠', color: '#e58b3c', ko: '민감한 사람 주의', en: 'Unhealthy for sensitive people' },
    { key: 'unhealthy', max: 200, icon: '🔴', color: '#f85149', ko: '나쁨',        en: 'Unhealthy' },
    { key: 'very',      max: 300, icon: '🟣', color: '#9b4ddb', ko: '매우 나쁨',    en: 'Very Unhealthy' },
    { key: 'hazard',    max: 1e9, icon: '🟤', color: '#7d2f2f', ko: '위험',        en: 'Hazardous' }
  ];
  function band(aqi) {
    /* 🚨 음수 AQI 도 마찬가지다 — `band(-5)` 가 '좋음' 을 돌려주던 것을 막는다 */
    if (aqi == null || isNaN(aqi) || aqi < 0) return null;      // 🚨 모르면 null — 'Good' 으로 속이지 않는다
    for (var i = 0; i < BANDS.length; i++) if (aqi <= BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }
  /** 구간 이름 — 화면 언어로 */
  function bandText(b) { return b ? L(b.ko, b.en) : L('정보 없음', 'Unavailable'); }

  /** 주 오염물질 이름 */
  /* 🚨 화면에는 **쉬운 이름**이 먼저다. 기호(PM2.5)는 알약(pill) 목록에서 따로 보여 준다. */
  var POLL_NAME = {
    pm2_5: ['초미세먼지', 'fine dust (PM2.5)'], pm10: ['미세먼지', 'coarse dust (PM10)'],
    o3: ['오존', 'Ozone'], no2: ['이산화질소', 'NO₂'], so2: ['이산화황', 'SO₂'], co: ['일산화탄소', 'CO']
  };
  function pollName(k) { var n = POLL_NAME[k]; return n ? L(n[0], n[1]) : (k || ''); }

  // ══════════════════════════════════════════════════════════════
  // 3. 행동 문구 — 숫자가 아니라 **무엇을 하면 되는지**를 말한다(스펙 27번)
  // ══════════════════════════════════════════════════════════════
  /* 🚨 값이 들어가는 문장은 **먼저 번역하고 나중에 값을 꽂는다**(`{who}` 자리표).
     문장에 값을 먼저 붙이면 사전 열쇠가 매번 달라져 ja/zh/ar 이 영영 영어로 떨어진다
     — 다른 앱에서 실제로 겪은 누수 유형이다([[i18n-leaks-found-by-screen-sweep]]). */
  function advice(aqi, dominant) {
    var b = band(aqi);
    if (!b) return L('대기질 정보를 받지 못했습니다.', 'Air quality data is unavailable.');
    var who = dominant ? pollName(dominant) : '';
    var s;
    switch (b.key) {
      case 'good':
        s = L('공기가 깨끗합니다. 야외활동에 문제가 없습니다.',
              'Air quality is good. Outdoor activity is fine.'); break;
      case 'moderate':
        s = L('보통입니다. 아주 민감한 사람만 장시간 실외활동에 주의하세요.',
              'Acceptable. Unusually sensitive people should limit prolonged outdoor exertion.'); break;
      case 'usg':
        s = L('{who} 수치가 높습니다. 어린이·노약자·호흡기 질환자는 장시간 실외활동을 줄이세요.',
              '{who} is elevated. Children, older adults and people with respiratory conditions should reduce prolonged outdoor activity.'); break;
      case 'unhealthy':
        s = L('{who} 수치가 높습니다. 모두 장시간 실외활동을 줄이고 창문을 닫으세요.',
              '{who} is high. Everyone should reduce prolonged outdoor activity and keep windows closed.'); break;
      case 'very':
        s = L('공기가 매우 나쁩니다. 실외활동을 피하고 실내에 머무르세요.',
              'Air quality is very unhealthy. Avoid outdoor activity and stay indoors.'); break;
      default:
        s = L('위험 수준입니다. 외출을 피하고 마스크·공기청정기를 사용하세요.',
              'Hazardous. Avoid going outside; use a mask and an air purifier.'); break;
    }
    return s.replace('{who}', who);
  }

  // ══════════════════════════════════════════════════════════════
  // 4. 습도 — 구간은 **앱이 바꿀 수 있다**(스펙 4번: config 로 뺀다)
  //    기본값은 UAE 기준. 온대지방 기준을 그대로 쓰면 두바이는 1년 내내 "매우 습함"이 된다.
  // ══════════════════════════════════════════════════════════════
  var RH_BANDS = [
    { max: 30,  ko: '매우 건조', en: 'Very Dry' },
    { max: 50,  ko: '건조',     en: 'Dry' },
    { max: 65,  ko: '쾌적',     en: 'Comfortable' },
    { max: 75,  ko: '습함',     en: 'Humid' },
    { max: 1e9, ko: '매우 습함', en: 'Very Humid' }
  ];
  function humidityBand(rh, custom) {
    if (rh == null || isNaN(rh)) return null;
    var t = (custom && custom.length) ? custom : RH_BANDS;
    for (var i = 0; i < t.length; i++) if (rh <= t[i].max) return t[i];
    return t[t.length - 1];
  }

  /** 가시거리 구간 (m) */
  var VIS_BANDS = [
    { max: 1000,  ko: '매우 나쁨', en: 'Very Poor' },
    { max: 2000,  ko: '나쁨',     en: 'Poor' },
    { max: 5000,  ko: '저하',     en: 'Reduced' },
    { max: 10000, ko: '양호',     en: 'Good' },
    { max: 1e9,   ko: '매우 좋음', en: 'Excellent' }
  ];
  function visibilityBand(m) {
    if (m == null || isNaN(m)) return null;
    for (var i = 0; i < VIS_BANDS.length; i++) if (m <= VIS_BANDS[i].max) return VIS_BANDS[i];
    return VIS_BANDS[VIS_BANDS.length - 1];
  }

  // ══════════════════════════════════════════════════════════════
  // 5. 공급자가 안 주는 값을 **계산으로** 메운다
  //    🚨 관측을 흉내내는 게 아니라 **표준 근사식**이다. 화면은 이 값도 참고값으로 다룬다.
  // ══════════════════════════════════════════════════════════════

  /** 이슬점 — Magnus 식(−45~60℃ 유효). OpenWeather 2.5 는 이슬점을 안 준다. */
  function dewPoint(tC, rh) {
    if (tC == null || rh == null || isNaN(tC) || isNaN(rh) || rh <= 0) return null;
    var a = 17.62, b = 243.12;
    var g = Math.log(rh / 100) + (a * tC) / (b + tC);
    return Math.round((b * g) / (a - g) * 10) / 10;
  }

  /**
   * 태양 고도(도) — NOAA 근사. 자외선 지수를 직접 계산하려면 이게 필요하다
   * (무료 기상 API 는 대개 UV 를 안 준다 → `Heat.uvIndex(alt, {cloud})` 에 넣는다).
   * @param {number} lat @param {number} lon @param {Date} when @param {number} tzOffsetSec 현지 시간대(초)
   */
  function sunAltitude(lat, lon, when, tzOffsetSec) {
    try {
      var d = when || new Date();
      var ms = d.getTime();
      var jd = ms / 86400000 + 2440587.5;
      var n = jd - 2451545.0;
      var Lm = (280.460 + 0.9856474 * n) % 360;            // 평균 황경
      var g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
      var lam = (Lm + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
      var eps = (23.439 - 0.0000004 * n) * Math.PI / 180;
      var dec = Math.asin(Math.sin(eps) * Math.sin(lam));   // 적위
      /* 시간각 — 그리니치 항성시 기준 */
      var gmst = (18.697374558 + 24.06570982441908 * n) % 24;
      var lst = (gmst + lon / 15) * 15 * Math.PI / 180;
      var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
      var H = lst - ra;
      var phi = lat * Math.PI / 180;
      var alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
      return Math.round(alt * 180 / Math.PI * 10) / 10;
    } catch (_) { return null; }
  }

  global.Air = {
    version: VERSION, dewPoint: dewPoint, sunAltitude: sunAltitude,
    usAqi: usAqi, aqiOf: aqiOf, nowCast: nowCast, band: band, bandText: bandText, bands: BANDS,
    advice: advice, pollName: pollName,
    humidityBand: humidityBand, visibilityBand: visibilityBand,
    ugToPpb: ugToPpb
  };
})(typeof window !== 'undefined' ? window : globalThis);
