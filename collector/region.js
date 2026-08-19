/**
 * region.js — 🏭 **이 앱이 다루는 "나라" 하나가 갖는 모든 것.**
 *
 *   대기·모래 계열(UAE·사우디·쿠웨이트·…)에서 **나라마다 달라지는 값은 전부 여기 한 곳**에 있다.
 *   공용 엔진(`_shared/air/*`)에는 나라 이름도, 행정구역 이름도, 기관 이름도 적지 않는다.
 *
 * 🚨 왜 파일을 따로 뒀나 — 그늘지도 계열에서 배운 것과 같은 이유다([[sharjah-shade-app-and-region-factory]]).
 *    같은 값이 두 곳에 있으면 **어긋나는 순간 조용히 틀린다.**
 *    실제로 공용 엔진 안에 이런 것들이 박혀 있었다(2026-08-19 공장화 때 걷어냄):
 *      · `env-map.js` — 에미리트 7곳 이름 → 도시 id 매핑
 *      · `env-map.js` — "줌 2배 미만이면 아부다비만" 같은 **라벨 노출 규칙**
 *      · `env-dash.js` — 출처 카드의 `UAE NCM` 공식 경보 기관
 *    사우디판을 만들 때 이걸 엔진에서 고치게 되면 그건 공용 엔진이 아니다.
 *
 * 🔁 브라우저와 Node 양쪽에서 읽는다:
 *      브라우저 — `<script src="region.js">` 가 `window.REGION` 을 채운다(**app-config.js 보다 먼저**)
 *      Node     — 수집기가 `require` 로 읽을 수 있다
 *    그래서 **ESM 문법을 쓰면 안 된다.**
 *
 * 🚨 도시표(`data/cities.js`)와 지도 윤곽(`data/outline.js`)은 **크기 때문에** 따로 둔다.
 *    이 파일은 "그 둘을 어떻게 쓸지"를 정하는 곳이다.
 */
(function (root) {
  'use strict';

  var REGION = {
    /* 표시·식별용. 저장키는 app-config 의 `keys.*` 가 갖는다(출시 후 변경 금지). */
    id: 'uae',

    /* 🌐 나라 이름 — 언어마다. 화면 문장에 나라 이름을 박지 않고 이 값을 꽂는다. */
    name: {
      en: 'UAE', ko: '아랍에미리트', ar: 'الإمارات', ja: 'UAE', zh: '阿联酋'
    },

    /* 📍 위치를 못 잡았을 때 떨어질 도시. `data/cities.js` 의 id 여야 한다. */
    defaultCityId: 'dubai',

    /* 🌐 수집기가 올려 둔 정적 JSON 의 뿌리. `<base>/<cityId>.json` 을 읽는다. */
    staticBase: 'https://airblockfz.com/uaeair',

    /* 🏛 공식 경보 기관 — 출처 카드에 링크로 걸린다.
       🚨 나라마다 다르다. **모르면 null 로 두고 그 줄을 빼는 게 맞다.**
          남의 나라 기관을 적는 것보다 안 적는 게 낫다. */
    official: {
      name: 'UAE NCM',
      url: 'https://airquality.ncm.gov.ae/'
    },

    /* ══════════ 🗺 지도 ══════════ */
    map: {
      /* 행정구역 이름(윤곽 데이터의 `regions[].name`) → 도시표 id.
         이름 사전을 두 벌 만들지 않으려고 도시 이름을 재사용한다. */
      regionCity: {
        'Abu Dhabi': 'abudhabi', 'Dubai': 'dubai', 'Sharjah': 'sharjah',
        'Ajman': 'ajman', 'Umm Al Quwain': 'uaq',
        'Ras Al Khaimah': 'rak', 'Fujairah': 'fujairah'
      },

      /* 🏷 라벨이 **몇 배 확대부터** 보이나. 표에 없으면 2배.
         🚨 축소 상태에서 작은 행정구역 라벨은 도시 점과 겹쳐 둘 다 안 읽힌다
            (프리뷰 실측: '두바이' 라벨이 두바이 점 위에 겹쳤다).
            그래서 넓은 아부다비만 처음부터 보이고, 북동부 작은 곳은 더 확대해야 나온다. */
      labelZoom: {
        'Abu Dhabi': 0,
        'Ajman': 3.2, 'Umm Al Quwain': 3.2
      }
    },

    /* ══════════ 🏜 모래·먼지 임계값 ══════════
       🚨 **나라마다 평상시 농도가 다르다.** 온대지방 감각으로 잡으면 걸프는 1년 내내 빨간불이 된다.
       🧪 첫 판 [25,60,150] 은 **맑고 조용한 날을 '높음'으로 판정했다**
          (2026-08-14 19:00 두바이 실측: dust 77 · 가시거리 15.8km · 돌풍 16km/h).
       🚨 여전히 잠정값이다. 실데이터를 1주 쌓아 다시 보정할 것. */
    dust: {
      thresholds: {
        dust:   [60, 120, 250],     // µg/m³ — 주 신호
        pm10:   [80, 150, 250],
        gust:   [30, 45, 60],       // km/h
        wind:   [20, 35, 50],
        visLow: [5000, 2000, 1000], // m — 낮을수록 위험
        surge:  30,                 // µg/m³/h — 급증하면 한 단계 올린다
        aod:    [0.4, 0.8, 1.2]
      }
    },

    /* ══════════ 🚶 외출 판정 임계값 ══════════
       체감 45℃ 는 걸프 여름 한낮에 흔하다 — 온대 기준을 쓰면 여름 내내 "나가지 마세요"가 된다. */
    outdoor: {
      thresholds: {
        feels: [38, 45], temp: [40, 46],
        aqi: [100, 150], pm10: [150, 250], pm25: [55, 125],
        gust: [40, 60], uv: [8, 11]
      }
    }
  };

  root.REGION = REGION;
  if (typeof module !== 'undefined' && module.exports) module.exports = REGION;
})(typeof window !== 'undefined' ? window : globalThis);
