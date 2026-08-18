/**
 * collect.mjs — 🔐 **키를 앱에서 완전히 떼어내는 수집기.**
 *
 *   GitHub Actions 가 매시 이걸 돌린다. 결과는 도시별 JSON 한 장씩.
 *   앱은 그 JSON 만 읽는다 → 앱 안에 키도, 프록시 주소도, 계정도 없다.
 *
 * 🚨 앱이 쓰는 **모양 그대로** 만들어 준다(`EnvFeed` 의 wx/aq 구조). 앱에서 다시 가공하지 않는다.
 * 🚨 지난 24시간은 **여기서 쌓는다** — 기존 파일을 읽어 이어 붙인다(설치 첫날부터 그래프가 찬다).
 * 🚨 OpenWeather 데이터는 ODbL 이다 → 결과 파일에 **표기를 같이 실어** 배포한다(라이선스 조건).
 * 🚨 실패한 도시는 **이전 파일을 그대로 남긴다.** 빈 파일로 덮으면 앱이 그 도시에서 통째로 죽는다.
 *
 * 사용: OW_KEY=xxx node collect.mjs <출력폴더> [<도시표.js>]
 */
import fs from 'fs';
import path from 'path';

const KEY = process.env.OW_KEY;
if (!KEY) { console.error('OW_KEY 없음'); process.exit(2); }
const OUT = process.argv[2] || 'dist/uaeair';
const CITIES_JS = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname), '../www/data/cities.js');

/* 도시표는 앱과 **같은 파일**을 쓴다 — 두 벌이 되면 언젠가 갈라진다 */
const src = fs.readFileSync(CITIES_JS, 'utf8');
const APP_DATA = {};
new Function('window', src)({ get APP_DATA () { return APP_DATA }, set APP_DATA (v) { Object.assign(APP_DATA, v) } });
const CITIES = APP_DATA.cities || [];
if (!CITIES.length) { console.error('도시표가 비었다'); process.exit(2); }

const OW = 'https://api.openweathermap.org';
const j = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + ' ' + u.replace(KEY, '***')); return r.json(); };
const msLocal = (ms, off) => new Date(ms + off * 1000).toISOString().slice(0, 16);
const owToWmo = (id) => id == null ? null
  : id === 800 ? 0 : id === 801 ? 1 : id === 802 ? 2 : (id === 803 || id === 804) ? 3
  : id >= 200 && id < 300 ? 95 : id >= 300 && id < 400 ? 51
  : id >= 500 && id < 505 ? 61 : (id === 511 || (id >= 520 && id < 532)) ? 80
  : id >= 600 && id < 700 ? 71 : id >= 700 && id < 800 ? 45 : null;

/** 이슬점 — Magnus (앱의 `Air.dewPoint` 와 같은 식) */
function dewPoint (t, rh) {
  if (t == null || rh == null || rh <= 0) return null;
  const a = 17.62, b = 243.12, g = Math.log(rh / 100) + (a * t) / (b + t);
  return Math.round((b * g) / (a - g) * 10) / 10;
}

async function city (c) {
  const q = `?lat=${c.lat.toFixed(4)}&lon=${c.lon.toFixed(4)}&units=metric&appid=${KEY}`;
  const [w, a, f] = await Promise.all([
    j(OW + '/data/2.5/weather' + q), j(OW + '/data/2.5/air_pollution' + q), j(OW + '/data/2.5/forecast' + q)
  ]);
  const off = w.timezone || 0, ms = (w.dt || Date.now() / 1000) * 1000;

  const weather = {
    source: 'openweather', attribution: 'Weather data provided by OpenWeather',
    measuredAt: ms, measuredLocal: msLocal(ms, off), utcOffset: off,
    temperature: w.main?.temp ?? null, feelsLike: w.main?.feels_like ?? null,
    humidity: w.main?.humidity ?? null, dewPoint: dewPoint(w.main?.temp, w.main?.humidity),
    windSpeed: w.wind?.speed != null ? Math.round(w.wind.speed * 36) / 10 : null,
    windGust: w.wind?.gust != null ? Math.round(w.wind.gust * 36) / 10 : null,
    windDirection: w.wind?.deg ?? null,
    visibility: w.visibility ?? null, pressure: w.main?.pressure ?? null,
    weatherCode: owToWmo(w.weather?.[0]?.id),
    isDay: (w.sys && w.dt) ? (w.dt >= w.sys.sunrise && w.dt <= w.sys.sunset) : null,
    sunrise: w.sys?.sunrise ? msLocal(w.sys.sunrise * 1000, off) : null,
    sunset: w.sys?.sunset ? msLocal(w.sys.sunset * 1000, off) : null,
    cloud: w.clouds?.all != null ? w.clouds.all / 100 : null,
    hourly: null, daily: daily(f, off, w)
  };
  const it = a.list?.[0], comp = it?.components || {};
  const aMs = (it?.dt || Date.now() / 1000) * 1000;
  const air = {
    source: 'openweather-air', attribution: 'Air quality data provided by OpenWeather',
    measuredAt: aMs, measuredLocal: msLocal(aMs, off), utcOffset: off,
    pm10: comp.pm10 ?? null, pm2_5: comp.pm2_5 ?? null, dust: null, aod: null,
    ozone: comp.o3 ?? null, nitrogen_dioxide: comp.no2 ?? null,
    sulphur_dioxide: comp.so2 ?? null, carbon_monoxide: comp.co ?? null,
    usAqiApi: null, euAqi: null, hourly: null
  };
  return { weather, air };
}

/** 5일/3시간 → 일별. 🚨 끝 날짜에 오후(12~17시)가 없으면 버린다(오전만 보고 '하루 최고'라 하면 거짓말) */
function daily (f, off, w) {
  if (!f?.list?.length) return null;
  const by = {}, order = [];
  for (const it of f.list) {
    const d = msLocal(it.dt * 1000, off), day = d.slice(0, 10), hh = +d.slice(11, 13);
    if (!by[day]) { by[day] = { max: -999, min: 999, wind: 0, pop: 0, ids: {}, pm: false }; order.push(day); }
    const b = by[day];
    if (it.main?.temp_max != null) b.max = Math.max(b.max, it.main.temp_max);
    if (it.main?.temp_min != null) b.min = Math.min(b.min, it.main.temp_min);
    if (it.wind?.speed != null) b.wind = Math.max(b.wind, it.wind.speed * 3.6);
    if (it.pop != null) b.pop = Math.max(b.pop, it.pop * 100);
    if (hh >= 12 && hh <= 17) b.pm = true;
    const id = it.weather?.[0]?.id; if (id != null) b.ids[id] = (b.ids[id] || 0) + 1;
  }
  while (order.length > 1 && !by[order[order.length - 1]].pm) order.pop();
  const out = { time: [], temperature_2m_max: [], temperature_2m_min: [],
    precipitation_probability_max: [], wind_speed_10m_max: [], weather_code: [], sunrise: [], sunset: [] };
  order.forEach((day, i) => {
    const b = by[day];
    const top = Object.keys(b.ids).sort((x, y) => b.ids[y] - b.ids[x])[0];
    out.time.push(day);
    out.temperature_2m_max.push(b.max > -999 ? Math.round(b.max * 10) / 10 : null);
    out.temperature_2m_min.push(b.min < 999 ? Math.round(b.min * 10) / 10 : null);
    out.precipitation_probability_max.push(Math.round(b.pop));
    out.wind_speed_10m_max.push(Math.round(b.wind * 10) / 10);
    out.weather_code.push(owToWmo(top != null ? +top : null));
    out.sunrise.push(i === 0 ? (w.sys?.sunrise ? msLocal(w.sys.sunrise * 1000, off) : null) : null);
    out.sunset.push(i === 0 ? (w.sys?.sunset ? msLocal(w.sys.sunset * 1000, off) : null) : null);
  });
  return out;
}

/** 📼 지난 24시간 — 기존 파일에 이어 붙인다(같은 시각은 한 칸) */
function roll (prev, weather, air) {
  const rows = Array.isArray(prev?.air?.hourly?._rows) ? prev.air.hourly._rows : [];
  const t = Math.floor((air.measuredAt || weather.measuredAt) / 3600000) * 3600000;
  const next = rows.filter(r => r.t !== t);
  next.push({ t, temperature_2m: weather.temperature, relative_humidity_2m: weather.humidity,
    wind_speed_10m: weather.windSpeed, pm10: air.pm10, pm2_5: air.pm2_5 });
  next.sort((a, b) => a.t - b.t);
  const keep = next.slice(-25);
  const off = air.utcOffset || 0;
  const hourly = { _rows: keep, time: keep.map(r => msLocal(r.t, off)) };
  for (const k of ['pm10', 'pm2_5']) hourly[k] = keep.map(r => r[k]);
  const wHourly = { time: hourly.time };
  for (const k of ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m']) wHourly[k] = keep.map(r => r[k]);
  return { hourly, wHourly };
}

fs.mkdirSync(OUT, { recursive: true });
let ok = 0, fail = 0;
for (const c of CITIES) {
  const file = path.join(OUT, c.id + '.json');
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
  try {
    const { weather, air } = await city(c);
    const { hourly, wHourly } = roll(prev, weather, air);
    air.hourly = hourly; weather.hourly = wHourly;
    fs.writeFileSync(file, JSON.stringify({
      city: c.id, collectedAt: Date.now(),
      license: 'ODbL — Weather and air quality data provided by OpenWeather (https://openweathermap.org/)',
      weather, air
    }));
    ok++;
  } catch (e) {
    /* 🚨 실패하면 이전 파일을 **그대로 둔다**. 빈 파일로 덮으면 그 도시가 통째로 죽는다. */
    console.error('  ✕ ' + c.id + ' — ' + e.message);
    fail++;
  }
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({
  updatedAt: Date.now(), cities: CITIES.map(c => c.id),
  attribution: 'Weather and air quality data provided by OpenWeather (ODbL)'
}));
console.log(`수집 완료 · 성공 ${ok} · 실패 ${fail} · ${OUT}`);
process.exit(fail === CITIES.length ? 1 : 0);
