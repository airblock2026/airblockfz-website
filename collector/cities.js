/**
 * data/cities.js — 이 앱의 **데이터 전부**.
 *
 * 🔑 역지오코딩 API 를 쓰지 않는 이유가 이 표에 있다(엔진 21호 `GeoCity` 참조):
 *    라이선스가 하나 줄고, 오프라인에서도 도시 이름이 나오고, **좌표가 밖으로 안 나간다**.
 *    대신 "가장 가까운 도시"일 뿐이므로 화면은 정확한 주소인 척하지 않는다.
 *
 * 🚨 좌표는 도시 중심 근사값이다. 기상·대기질 모델 격자(약 10~25km)보다 촘촘할 필요가 없다.
 * 🚨 이름은 5개국어 전부 채운다 — 비면 i18n 엔진이 영어로 떨어뜨리는데,
 *    지명은 그게 오히려 나을 때가 있어 **조용히 지나간다**(그래서 여기서 채워 둔다).
 */
window.APP_DATA = {
  cities: [
    { id: 'dubai',      lat: 25.2048, lon: 55.2708, en: 'Dubai',              ko: '두바이',        ar: 'دبي',            ja: 'ドバイ',            zh: '迪拜' },
    { id: 'abudhabi',   lat: 24.4539, lon: 54.3773, en: 'Abu Dhabi',          ko: '아부다비',      ar: 'أبوظبي',         ja: 'アブダビ',          zh: '阿布扎比' },
    { id: 'sharjah',    lat: 25.3463, lon: 55.4209, en: 'Sharjah',            ko: '샤르자',        ar: 'الشارقة',        ja: 'シャルジャ',        zh: '沙迦' },
    { id: 'ajman',      lat: 25.4052, lon: 55.5136, en: 'Ajman',              ko: '아지만',        ar: 'عجمان',          ja: 'アジュマン',        zh: '阿治曼' },
    { id: 'uaq',        lat: 25.5647, lon: 55.5534, en: 'Umm Al Quwain',      ko: '움알쿠와인',    ar: 'أم القيوين',     ja: 'ウンム・アル・カイワイン', zh: '乌姆盖万' },
    { id: 'rak',        lat: 25.7895, lon: 55.9432, en: 'Ras Al Khaimah',     ko: '라스알카이마',  ar: 'رأس الخيمة',     ja: 'ラアス・アル・ハイマ',   zh: '哈伊马角' },
    { id: 'fujairah',   lat: 25.1288, lon: 56.3265, en: 'Fujairah',           ko: '푸자이라',      ar: 'الفجيرة',        ja: 'フジャイラ',        zh: '富查伊拉' },
    { id: 'alain',      lat: 24.2075, lon: 55.7447, en: 'Al Ain',             ko: '알아인',        ar: 'العين',          ja: 'アル・アイン',      zh: '艾因' },
    { id: 'khorfakkan', lat: 25.3392, lon: 56.3419, en: 'Khor Fakkan',        ko: '호르파칸',      ar: 'خورفكان',        ja: 'ホール・ファッカーン',   zh: '豪尔费坎' },
    { id: 'kalba',      lat: 25.0745, lon: 56.3499, en: 'Kalba',              ko: '칼바',          ar: 'كلباء',          ja: 'カルバ',            zh: '卡尔巴' },
    { id: 'dibba',      lat: 25.5926, lon: 56.2617, en: 'Dibba Al-Fujairah',  ko: '디바',          ar: 'دبا الفجيرة',    ja: 'ディバ',            zh: '迪巴' },
    { id: 'hatta',      lat: 24.8010, lon: 56.1180, en: 'Hatta',              ko: '하타',          ar: 'حتا',            ja: 'ハッタ',            zh: '哈达' },
    { id: 'dhaid',      lat: 25.2871, lon: 55.8814, en: 'Al Dhaid',           ko: '다이드',        ar: 'الذيد',          ja: 'ザイド',            zh: '扎伊德' },
    { id: 'madinatzayed', lat: 23.6540, lon: 53.7050, en: 'Madinat Zayed',    ko: '마디낫자예드',  ar: 'مدينة زايد',     ja: 'マディーナ・ザーイド',   zh: '扎耶德城' },
    { id: 'ruwais',     lat: 24.1103, lon: 52.7306, en: 'Ruwais',             ko: '루와이스',      ar: 'الرويس',         ja: 'ルワイス',          zh: '鲁韦斯' },
    { id: 'liwa',       lat: 23.1300, lon: 53.7800, en: 'Liwa Oasis',         ko: '리와',          ar: 'ليوا',           ja: 'リワ',              zh: '利瓦' },
    { id: 'jebelali',   lat: 25.0125, lon: 55.1360, en: 'Jebel Ali',          ko: '제벨알리',      ar: 'جبل علي',        ja: 'ジェベル・アリ',    zh: '杰贝阿里' },
    { id: 'ghayathi',   lat: 23.8400, lon: 52.8100, en: 'Ghayathi',           ko: '가야티',        ar: 'الغياثي',        ja: 'ガヤティ',          zh: '盖亚西' }
  ]
};
