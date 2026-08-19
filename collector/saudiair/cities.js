/**
 * cities.js — 🇸🇦 사우디아라비아 도시표.
 *
 * 🚨 이 파일은 **앱과 수집기가 같이 읽는다.** 도시를 늘리면 수집 요청도 같이 는다
 *    (도시당 시간당 3콜 → 12개면 월 26K, OpenWeather 무료 100만의 2.6%).
 * 🚨 `id` 는 정적 JSON 파일명이 된다(`<base>/<id>.json`). **출시 후 바꾸지 말 것.**
 * 🌐 이름은 언어마다 둔다 — 화면 문장에 도시 이름을 박지 않고 여기서 꺼낸다.
 *
 * 📍 12개 선정 기준(유저 확정 2026-08-19): 인구 상위 + 13개 행정구역을 최대한 덮기.
 *    수도권(리야드)·홍해권(제다·메카·메디나·타이프)·동부(담맘·코바르)·
 *    남부(아브하·지잔)·중부(부라이다)·북부(타부크·하일).
 */
window.APP_DATA = window.APP_DATA || {};
window.APP_DATA.cities = [
  { id: 'riyadh',   lat: 24.7136, lon: 46.6753, en: 'Riyadh',      ko: '리야드',   ar: 'الرياض',   ja: 'リヤド',       zh: '利雅得' },
  { id: 'jeddah',   lat: 21.4858, lon: 39.1925, en: 'Jeddah',      ko: '제다',     ar: 'جدة',      ja: 'ジッダ',       zh: '吉达' },
  { id: 'mecca',    lat: 21.3891, lon: 39.8579, en: 'Mecca',       ko: '메카',     ar: 'مكة',      ja: 'メッカ',       zh: '麦加' },
  { id: 'medina',   lat: 24.5247, lon: 39.5692, en: 'Medina',      ko: '메디나',   ar: 'المدينة',  ja: 'メディナ',     zh: '麦地那' },
  { id: 'dammam',   lat: 26.4207, lon: 50.0888, en: 'Dammam',      ko: '담맘',     ar: 'الدمام',   ja: 'ダンマーム',   zh: '达曼' },
  { id: 'khobar',   lat: 26.2794, lon: 50.2083, en: 'Al Khobar',   ko: '코바르',   ar: 'الخبر',    ja: 'アルコバル',   zh: '胡拜尔' },
  { id: 'taif',     lat: 21.2854, lon: 40.4183, en: 'Taif',        ko: '타이프',   ar: 'الطائف',   ja: 'ターイフ',     zh: '塔伊夫' },
  { id: 'abha',     lat: 18.2164, lon: 42.5053, en: 'Abha',        ko: '아브하',   ar: 'أبها',     ja: 'アブハー',     zh: '艾卜哈' },
  { id: 'buraydah', lat: 26.3260, lon: 43.9750, en: 'Buraydah',    ko: '부라이다', ar: 'بريدة',    ja: 'ブライダ',     zh: '布赖代' },
  { id: 'tabuk',    lat: 28.3835, lon: 36.5662, en: 'Tabuk',       ko: '타부크',   ar: 'تبوك',     ja: 'タブーク',     zh: '塔布克' },
  { id: 'hail',     lat: 27.5114, lon: 41.7208, en: 'Hail',        ko: '하일',     ar: 'حائل',     ja: 'ハーイル',     zh: '哈伊勒' },
  { id: 'jazan',    lat: 16.8892, lon: 42.5511, en: 'Jazan',       ko: '지잔',     ar: 'جازان',    ja: 'ジーザーン',   zh: '吉赞' }
];
