'use strict';
/*
 * «Остров» — сервер игры. Без внешних библиотек: нужен только Node.js.
 * Что делает: отдаёт страницу игры, держит комнаты-острова, пересылает шаги игроков,
 * звёздочки и служебные сообщения для голосовой связи (сам голос идёт между планшетами).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT, 10) || 3210;
const HOST = process.env.HOST || '127.0.0.1';
const DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data');
const TURN_HOST = process.env.TURN_HOST || '';
const TURN_SECRET = process.env.TURN_SECRET || '';

const MAX_PLAYERS = 4;
const MAX_MSG = 64 * 1024;
const STARS_ISLAND = 26;          // звёздочек на острове
const GEMS_CAVE = 9;              // самоцветов в пещере
const STAR_RESPAWN_MS = 7000;
const ROOM_KEEP_DAYS = 365;
const N_CHESTS = 6, N_ALBUM = 12;
const CHEST_REFILL_MS = 2 * 3600000;   // сундуки снова полные через 2 часа
const EVENT_FIRST_MS = parseInt(process.env.EVENT_FIRST_MS, 10) || 100000;
const EVENT_EVERY_MS = parseInt(process.env.EVENT_EVERY_MS, 10) || 240000;  // звездопад раз в 4 минуты
const EVENT_SEC = 45;
const WORLD_W = 5200, WORLD_H = 3900;
const MAX_FURN = 80;
const TAG_SEC = parseInt(process.env.TAG_SEC, 10) || 120, HIDE_SEC = parseInt(process.env.HIDE_SEC, 10) || 150, HIDE_COUNT_SEC = parseInt(process.env.HIDE_COUNT_SEC, 10) || 15, GAME_REWARD = 5; // игры вдвоём
/* цены нарядов и питомцев — берутся из списка в игре */
const WPRICE = {"d6":30,"d7":30,"d8":40,"h4":15,"h5":15,"h6":15,"s2":10,"a4":20,"a5":25,"a6":20,"a7":20,"w1":40,"w2":50,"w3":60};
const N_PETS = 6, EGG_PRICE = 50, FEED_PRICE = 3, PET_MAX = 30;
/* ---------- живой мир: дела на день, почта, товар дня ---------- */
const DAY_REWARD = 25, N_LETTERS = 12;
/* огород, рыбы, жуки — берутся из списков в игре */
const CROPC = [2,3,4,5,8,6], CROPG = [20,45,90,180,360,240], FISHR = [1,1,1,1,1,2,2,3,3,2,2,2,1,2,3,1,1,1,2,3], BUGR = [1,1,2,3,1,1,1,2,3,1,1,2,2,2,1,1,1,2,2,3], RSTARS = [0, 2, 4, 8];
const BUILD_SPEED = parseFloat(process.env.BUILD_SPEED) || 1;
const PLAY_MIN = parseInt(process.env.PLAY_MIN, 10) || 0, BREAK_MIN = parseInt(process.env.BREAK_MIN, 10) || 60;
function dayKey() { return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); }
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function newDay(code, key, hasPets, rc) {
  const R = seeded(hashStr(code + ':' + key));
  const pick = function (a) { return a[Math.floor(R() * a.length)]; };
  const fun = hasPets ? ['feed', 'pet', 'buy', 'tag', 'hide', 'plant', 'harvest'] : ['buy', 'tag', 'hide', 'plant', 'harvest'];
  fun.push('npc', 'npc', 'quiz', 'quiz', 'school');
  if (rc && [0, 1, 2].some(function (i) { return !isBuilt(rc, i); })) fun.push('build');
  if (rc && isBuilt(rc, 1)) fun.push('cook');
  const act = ['swing', 'tramp', 'slide', 'swim', 'dance'];
  if (rc && isBuilt(rc, 2)) act.push('sing');
  const ks = [pick(['stars', 'gems', 'fish', 'bug', 'wood', 'shell']), pick(act), pick(['dig', 'chest', 'bay', 'cave', 'fish']), pick(fun)];
  if (ks[2] === ks[0]) ks[2] = 'dig';
  if (ks[3] === ks[1]) ks[3] = 'buy';
  const need = { stars: 15 + Math.floor(R() * 3) * 5, gems: 3, fish: 2, bug: 2, wood: 3, shell: 3, quiz: 5 };
  const deals = [];
  for (let n = 0; deals.length < 3 && n < 100; n++) { const i = Math.floor(R() * PRICES.length); if (deals.indexOf(i) < 0 && PRICES[i] >= 12) deals.push(i); }
  return { key: key, tasks: ks.map(function (k) { return { k: k, need: need[k] || 1, have: 0 }; }), done: false, deals: deals };
}
function ensureDay(r) {
  const rc = rec(r.code), key = dayKey();
  if (rc.day && rc.day.key === key) return rc.day;
  rc.day = newDay(r.code, key, Object.keys(rc.pets).length > 0, rc);
  saveSoon();
  broadcast(r, { t: 'dy', day: rc.day });
  return rc.day;
}
function prog(r, k, n) {
  const rc0 = rec(r.code), key0 = dayKey();
  Object.keys(rc0.npc).forEach(function (i) {
    const s = rc0.npc[i], q = s.q;
    if (!q || q.d !== key0 || s.ok === key0 || CONSUME[q.k] || q.k !== k || q.have >= q.need) return;
    q.have = Math.min(q.need, q.have + (n || 1)); saveSoon();
    broadcast(r, { t: 'nu', id: +i, s: s });
  });
  const d = ensureDay(r);
  let changed = false;
  d.tasks.forEach(function (t, i) {
    if (changed || t.k !== k || t.have >= t.need) return;
    t.have = Math.min(t.need, t.have + (n || 1)); changed = true;
    broadcast(r, { t: 'dt', i: i, have: t.have, done: t.have >= t.need });
  });
  if (!changed) return;
  saveSoon();
  if (!d.done && d.tasks.every(function (t) { return t.have >= t.need; })) {
    d.done = true;
    const rc = rec(r.code);
    rc.total = (rc.total || 0) + DAY_REWARD;
    broadcast(r, { t: 'dd', total: rc.total });
  }
}
function dealPrice(r, i) { const d = ensureDay(r); return d.deals.indexOf(i) >= 0 ? Math.ceil(PRICES[i] / 2) : PRICES[i]; }
const NPC_KS = [["bug","wood","shell"],["food","wood","harvest"],["fish","bug","swing"],["food","dance","tramp"],["harvest","food","tramp"],["shell","fish","dance"]];
const QNEED = {"fish":2,"bug":1,"food":1,"wood":3,"shell":3};
const PROJN = [{"s":60,"w":40,"r":20,"h":0},{"s":100,"w":30,"r":15,"h":20},{"s":120,"w":25,"r":10,"h":30}], PROJM = [30,60,90];
const N_TREES = 72, N_ROCKS = 17, N_SHELLS = 48, N_DISHES = 6;
const CONSUME = { food: 1, wood: 1, shell: 1 };
function npcQuest(i) { const ks = NPC_KS[i]; return ks[hashStr(dayKey() + ':' + i) % ks.length]; }
function isBuilt(rc, i) { const p = rc.proj[i]; return !!(p && p.done && Date.now() >= p.done); }
const PKIND = { swing: 'swing', tramp: 'tramp', slide: 'slide', swim: 'swim', skate: 'swim', dance: 'dance', sing: 'sing' };

const POSES = ['skate', 'sit', 'swing', 'tramp', 'slide', 'swim', 'sleep', 'dance', 'piano', 'sing'];
/* цены и вид мебели — берутся из списка в игре */
const PRICES = [8,8,12,18,15,25,40,45,35,15,12,20,50,70,30,20];
const FKIND = ["rug","floor","floor","floor","floor","floor","floor","floor","floor","wall","wall","floor","floor","floor","floor","rug"];

/* Точки, где могут появляться звёздочки и клады (заранее проверены по карте). */
const SPAWN0 = [[2187,501],[2348,483],[2459,492],[2801,472],[2946,494],[3084,496],[3187,490],[3321,473],[1820,582],[2175,616],[2354,595],[2446,581],[2831,593],[2963,590],[3347,584],[3438,591],[3600,615],[965,1300],[1197,1302],[1302,1340],[1429,1307],[1591,1337],[1712,1333],[1835,1308],[2441,1315],[2727,1344],[2819,1335],[3063,1314],[3304,1320],[3678,1324],[3846,1330],[3929,1335],[4048,1330],[4313,1301],[675,1462],[949,1447],[1218,1428],[1299,1452],[1457,1463],[1551,1417],[1715,1430],[1840,1428],[1928,1435],[2058,1455],[2204,1426],[2326,1452],[2426,1440],[2729,1462],[2849,1458],[2954,1442],[3070,1439],[3199,1445],[3307,1436],[3433,1430],[3802,1457],[3962,1416],[4070,1453],[4190,1439],[4328,1447],[4439,1463],[4557,1417],[958,1542],[1203,1565],[1316,1564],[1447,1557],[1587,1555],[1676,1574],[1838,1537],[1978,1578],[2097,1556],[2187,1566],[2454,1556],[2829,1580],[2955,1556],[3095,1535],[3178,1569],[3308,1565],[3453,1556],[3583,1550],[3707,1538],[4047,1569],[4194,1549],[4347,1565],[4546,1565],[817,1668],[1197,1679],[1300,1693],[1429,1705],[1603,1677],[1700,1664],[1813,1666],[1952,1670],[2208,1687],[2351,1694],[2599,1678],[2730,1666],[2825,1679],[2965,1704],[3058,1697],[3174,1687],[3305,1664],[3599,1671],[3704,1696],[3845,1662],[3952,1700],[4230,1673],[4430,1669],[4552,1673],[4708,1661],[604,1797],[1223,1802],[1329,1806],[1452,1811],[1594,1809],[1696,1786],[1807,1782],[1927,1818],[2083,1823],[2203,1781],[2477,1780],[2572,1817],[2711,1825],[2816,1815],[2924,1824],[3083,1778],[3202,1813],[3295,1809],[3430,1818],[3556,1798],[4090,1825],[4314,1819],[4445,1814],[4689,1797],[4808,1793],[1222,1899],[1473,1919],[1707,1933],[1821,1918],[2226,1940],[2337,1926],[2425,1933],[2846,1910],[2921,1923],[3061,1912],[3191,1920],[3302,1910],[3603,1899],[3674,1925],[3829,1920],[3973,1925],[4197,1916],[4315,1898],[4420,1932],[4557,1945],[796,2054],[1056,2063],[1310,2054],[1460,2045],[1566,2037],[1680,2021],[1812,2058],[2229,2016],[3342,2045],[3461,2018],[3821,2028],[3944,2037],[4050,2018],[4193,2022],[4334,2028],[4435,2051],[678,2174],[1070,2141],[1225,2167],[1337,2172],[1477,2165],[1572,2167],[1842,2145],[1970,2168],[2205,2154],[2573,2164],[2729,2136],[2842,2171],[2974,2154],[3054,2182],[3309,2183],[3450,2145],[3574,2151],[3816,2183],[3980,2145],[4096,2170],[4175,2162],[4453,2158],[4673,2142],[812,2298],[1103,2290],[1216,2293],[1311,2268],[1438,2298],[1571,2298],[1713,2302],[1826,2263],[1963,2276],[2066,2280],[2174,2272],[2464,2270],[2563,2258],[2692,2279],[2949,2289],[3101,2270],[3174,2290],[3334,2264],[3446,2298],[3573,2267],[3698,2255],[3852,2260],[3958,2293],[4084,2275],[4205,2287],[4318,2269],[725,2384],[841,2410],[1581,2385],[1687,2420],[1812,2403],[2343,2423],[2458,2420],[2595,2383],[2685,2380],[2854,2398],[2976,2399],[3068,2389],[3220,2409],[3331,2386],[3425,2391],[3593,2376],[3722,2391],[3838,2413],[3922,2412],[4190,2412],[4318,2415],[4567,2389],[721,2545],[1354,2516],[1552,2501],[1678,2530],[1795,2528],[2353,2499],[2426,2531],[2576,2515],[2711,2502],[2839,2506],[3307,2530],[3446,2496],[3587,2511],[3705,2500],[3795,2508],[3966,2496],[4094,2532],[4183,2516],[4345,2514],[4449,2539],[923,2654],[1055,2649],[1220,2620],[1430,2648],[1549,2629],[1705,2641],[1847,2649],[1970,2627],[2354,2653],[2581,2625],[2728,2631],[2840,2661],[2937,2653],[3080,2664],[3605,2622],[3674,2652],[3833,2650],[3979,2649],[4092,2620],[4198,2652],[4298,2639],[4455,2640],[1463,2773],[1585,2747],[1681,2760],[1810,2751],[1952,2783],[2227,2742],[2314,2761],[2439,2778],[2574,2740],[3077,2739],[3207,2776],[3297,2751],[3430,2742],[3597,2747],[3711,2740],[3851,2772],[3961,2762],[4083,2761],[4172,2746],[4328,2768],[836,2872],[1588,2888],[1927,2879],[2103,2899],[2194,2883],[2302,2864],[2422,2898],[2559,2876],[2678,2871],[2844,2868],[2925,2864],[3050,2863],[3175,2862],[3302,2881],[3436,2876],[3557,2868],[3672,2884],[3922,2890],[4086,2882],[950,3018],[1318,3008],[1574,2993],[1671,3015],[1852,2999],[1928,3009],[2095,2976],[2192,2992],[2336,2993],[2427,3010],[2601,3017],[2712,3024],[2834,2986],[2963,3014],[3069,3017],[3214,3009],[3311,2979],[3478,2984],[3552,3022],[3711,2978],[3854,2991],[1422,3110],[1560,3130],[1693,3122],[1853,3117],[1960,3144],[2203,3131],[2334,3142],[2553,3131],[2701,3142],[2947,3110],[3099,3096],[3179,3118],[3298,3108],[3477,3130],[3602,3106],[2198,3225],[2592,3251],[2701,3256],[2956,3262],[3081,3221],[3218,3251],[3306,3249]];
const SPAWN1 = [[2478,371],[2732,372],[1362,437],[1430,431],[1483,434],[2470,437],[2549,430],[2591,436],[2660,424],[2722,434],[1536,491],[2423,481],[2470,482],[2539,504],[2591,490],[2662,491],[1360,556],[1474,555],[1556,543],[1601,554],[2353,551],[2414,553],[1356,624],[1428,611],[1481,604],[1544,607],[1609,605],[1680,612],[1729,615],[1788,608],[1856,626],[2094,618],[2158,613],[2232,625],[2294,620],[2342,613],[1787,681],[1867,672],[1907,686],[1990,675],[2041,677],[2093,683],[2176,687],[2221,685],[2299,671],[1986,750],[2046,741],[2100,735],[2154,752],[2227,751],[2296,747],[2032,809],[2109,811],[2174,793],[2219,807],[2300,812],[1978,868],[2037,871],[2115,871],[2161,867],[2236,868],[1909,920],[1975,917],[796,978],[1542,993],[1617,985],[1662,983],[1720,999],[1795,996],[1853,992],[1929,982],[615,1045],[804,1058],[1482,1056],[1553,1044],[1600,1044],[1721,1039],[1790,1040],[614,1110],[673,1119],[744,1117],[798,1120],[1493,1106],[1798,1110],[731,1165],[810,1184],[869,1173],[1491,1176],[1802,1163],[863,1245],[918,1246],[1487,1231],[1550,1235],[1805,1232],[1849,1233],[936,1305],[993,1300],[1055,1300],[1122,1297],[1173,1293],[1305,1304],[1349,1304],[1424,1296],[1546,1299],[1618,1304],[1668,1294],[1740,1293],[1803,1291],[1846,1297],[1909,1305],[1977,1306],[995,1359],[1041,1357],[1119,1349],[1184,1359],[1246,1369],[1298,1371],[1917,1356],[1982,1358],[2050,1351],[936,1423],[994,1413],[1061,1432],[1106,1429],[1180,1426],[1228,1421],[2051,1433],[2102,1414],[2235,1411],[2291,1429],[2364,1428],[929,1480],[981,1488],[1055,1481],[1111,1492],[1179,1496],[1229,1479],[2105,1482],[2157,1493],[2364,1494],[808,1558],[857,1551],[935,1544],[996,1542],[1039,1556],[1101,1536],[1180,1540],[1226,1548],[2164,1544],[486,1599],[549,1614],[622,1597],[687,1602],[734,1614],[793,1610],[862,1613],[1054,1617],[1111,1609],[1177,1608],[2174,1607],[2228,1618],[2280,1598],[2352,1607],[484,1668],[553,1680],[626,1661],[675,1659],[734,1679],[481,1730],[739,1740]];
const SPAWN0_MAIN = SPAWN0.filter(function (p) { return p[1] > 1250; }); // без тайной бухты

/* ---------- раздача файлов ---------- */
const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/manifest.json': ['manifest.json', 'application/manifest+json; charset=utf-8'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png']
};

const server = http.createServer(function (req, res) {
  const url = (req.url || '/').split('?')[0];
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: conns.size }));
    return;
  }
  const f = FILES[url];
  if (!f || (req.method !== 'GET' && req.method !== 'HEAD')) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Не найдено');
    return;
  }
  fs.readFile(path.join(DIR, f[0]), function (err, buf) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Не найдено');
      return;
    }
    res.writeHead(200, {
      'Content-Type': f[1],
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
});

/* ---------- хранилище островов (коды и общая копилка) ---------- */
let store = { rooms: {} };
const STORE_FILE = path.join(DATA_DIR, 'rooms.json');
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  if (raw && raw.rooms) store = raw;
} catch (e) { /* файла ещё нет — это нормально */ }

let saveTimer = null;
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () { saveTimer = null; saveNow(); }, 1500);
}
function saveNow() {
  try {
    const tmp = STORE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, STORE_FILE);
  } catch (e) { console.error('Не смог сохранить острова:', e.message); }
}
function cleanupStore() {
  const limit = Date.now() - ROOM_KEEP_DAYS * 86400000;
  let changed = false;
  Object.keys(store.rooms).forEach(function (code) {
    if (store.rooms[code].last < limit && !rooms.has(code)) { delete store.rooms[code]; changed = true; }
  });
  if (changed) saveSoon();
}

/* ---------- защита от перебора кодов ---------- */
const strikes = new Map(); // ip -> {fails, creates, reset}
function strike(ip) {
  let s = strikes.get(ip);
  const now = Date.now();
  if (!s || s.reset < now) { s = { fails: 0, creates: 0, reset: now + 10 * 60000 }; strikes.set(ip, s); }
  return s;
}

/* ---------- комнаты ---------- */
const rooms = new Map(); // код -> живая комната
const conns = new Set();

function newCode() {
  for (let i = 0; i < 200; i++) {
    const code = String(crypto.randomInt(100000, 1000000));
    if (!store.rooms[code]) return code;
  }
  return null;
}

function rec(code) {
  const r = store.rooms[code];
  if (!r.album) r.album = [];
  if (!r.chests) r.chests = {};
  if (!r.digs) r.digs = 0;
  if (!r.mail) r.mail = {};
  if (!r.fish) r.fish = [];
  if (!r.bugs) r.bugs = [];
  if (!r.crops) r.crops = [];
  if (!r.garden) r.garden = [null, null, null, null, null, null];
  if (!r.food) r.food = 0;
  if (!r.petDay) r.petDay = {};
  if (!r.ward) r.ward = [];
  if (!r.pets) r.pets = {};
  if (!r.mat) r.mat = { w: 0, r: 0, h: 0 };
  if (!r.got || r.got.d !== dayKey()) r.got = { d: dayKey(), t: [], r: [], s: [] };
  if (!r.npc) r.npc = {};
  if (!r.proj) r.proj = {};
  if (!r.cafe) r.cafe = [-1, -1];
  if (!r.furn) { r.furn = []; r.inv = { 0: 1, 1: 1 }; r.nextF = 1; } // на новоселье — коврик и цветок
  return r;
}

function liveRoom(code) {
  let r = rooms.get(code);
  if (r) return r;
  r = { code: code, players: new Map(), stars: [], nextStar: 1, timers: new Set(), tr: null, game: null };
  for (let i = 0; i < STARS_ISLAND; i++) addStar(r, 0, true);
  for (let i = 0; i < GEMS_CAVE; i++) addStar(r, 1, true);
  r.tr = pickTreasure(r, null);
  later(r, EVENT_FIRST_MS, function () { starfall(r); });
  rooms.set(code, r);
  return r;
}

function later(r, ms, fn) {
  const tm = setTimeout(function () { r.timers.delete(tm); if (rooms.get(r.code) === r) fn(); }, ms);
  r.timers.add(tm);
}

function freeSpot(r, list) {
  for (let i = 0; i < 40; i++) {
    const c = list[crypto.randomInt(0, list.length)];
    let busy = false;
    for (let j = 0; j < r.stars.length; j++) if (r.stars[j].x === c[0] && r.stars[j].y === c[1]) busy = true;
    if (!busy) return c;
  }
  return null;
}

function addStar(r, m, silent) {
  const list = m ? SPAWN1 : SPAWN0;
  if (!list.length) return;
  const pt = freeSpot(r, list);
  if (!pt) return;
  const s = { id: r.nextStar++, x: pt[0], y: pt[1], m: m, k: m };
  r.stars.push(s);
  if (!silent) broadcast(r, { t: 'sn', s: s });
}

/* клад: первые три — на главной части острова, потом где угодно, в том числе в тайной бухте */
function pickTreasure(r, from) {
  const list = rec(r.code).digs < 3 ? SPAWN0_MAIN : SPAWN0;
  let best = list[crypto.randomInt(0, list.length)];
  for (let i = 0; i < 30 && from; i++) {
    const dx = best[0] - from.x, dy = best[1] - from.y;
    if (dx * dx + dy * dy > 900 * 900) break;
    best = list[crypto.randomInt(0, list.length)];
  }
  return { x: best[0], y: best[1] };
}

/* звездопад: на 45 секунд в одном месте высыпается куча звёзд */
function starfall(r) {
  later(r, EVENT_EVERY_MS, function () { starfall(r); });
  if (!r.players.size || !SPAWN0_MAIN.length) return;
  const c = SPAWN0_MAIN[crypto.randomInt(0, SPAWN0_MAIN.length)];
  const near = SPAWN0.filter(function (p) { const dx = p[0] - c[0], dy = p[1] - c[1]; return dx * dx + dy * dy < 430 * 430; });
  const ids = [];
  for (let i = 0; i < 14 && near.length; i++) {
    const p = near.splice(crypto.randomInt(0, near.length), 1)[0];
    if (r.stars.some(function (s) { return s.x === p[0] && s.y === p[1]; })) continue;
    const s = { id: r.nextStar++, x: p[0], y: p[1], m: 0, k: 0, e: 1 };
    r.stars.push(s); ids.push(s.id);
    broadcast(r, { t: 'sn', s: s });
  }
  broadcast(r, { t: 'ev', x: c[0], y: c[1], d: EVENT_SEC });
  later(r, EVENT_SEC * 1000, function () {
    const gone = [];
    r.stars = r.stars.filter(function (s) { if (ids.indexOf(s.id) >= 0) { gone.push(s.id); return false; } return true; });
    if (gone.length) broadcast(r, { t: 'sx', ids: gone });
  });
}

/* ---------- игры: догонялки и прятки ---------- */
function startGame(r, c, g) {
  if (r.game) return;
  if (r.players.size < 2) { c.send({ t: 'gn' }); return; }
  const ids = Array.from(r.players.keys());
  const hide = g === 'hide';
  const dur = hide ? HIDE_SEC + HIDE_COUNT_SEC : TAG_SEC;
  const now = Date.now();
  const gm = { g: hide ? 'hide' : 'tag', it: hide ? c.pid : ids[crypto.randomInt(0, ids.length)], until: now + dur * 1000, seekAt: now + (hide ? HIDE_COUNT_SEC * 1000 : 0), cool: now + 2000, found: [] };
  r.game = gm;
  broadcast(r, { t: 'gm', g: gm.g, it: gm.it, d: dur, c: hide ? HIDE_COUNT_SEC : 0 });
  later(r, dur * 1000, function () { if (r.game === gm) endGame(r, 'time'); });
}
function endGame(r, why) {
  const gm = r.game;
  if (!gm) return;
  r.game = null;
  let win = [], add = 0;
  if (why === 'time') {
    r.players.forEach(function (p, id) { if (id !== gm.it && gm.found.indexOf(id) < 0) win.push(id); });
    add = GAME_REWARD;
  } else if (why === 'found') { win = [gm.it]; add = GAME_REWARD; }
  const rc = rec(r.code);
  if (add) { rc.total = (rc.total || 0) + add; saveSoon(); }
  if (why !== 'stop') prog(r, gm.g);
  broadcast(r, { t: 'ge', g: gm.g, why: why, win: win, add: add, total: rc.total || 0 });
}
function near(a, b, d) { const dx = a.x - b.x, dy = a.y - b.y; return a.m === b.m && dx * dx + dy * dy < d * d; }

function broadcast(r, msg, except) {
  const data = JSON.stringify(msg);
  r.players.forEach(function (c) { if (c !== except) c.sendRaw(data); });
}

function pubPlayer(c) {
  return { id: c.pid, name: c.name, look: c.look, m: c.m, x: c.x, y: c.y, tx: c.tx, ty: c.ty, rd: c.rd ? 1 : 0, pose: c.pose || null };
}

function iceServers(pid) {
  if (!TURN_HOST || !TURN_SECRET) return [{ urls: 'stun:stun.l.google.com:19302' }];
  const user = (Math.floor(Date.now() / 1000) + 24 * 3600) + ':' + pid;
  const pass = crypto.createHmac('sha1', TURN_SECRET).update(user).digest('base64');
  return [
    { urls: 'stun:' + TURN_HOST + ':3478' },
    { urls: ['turn:' + TURN_HOST + ':3478?transport=udp', 'turn:' + TURN_HOST + ':3478?transport=tcp'], username: user, credential: pass }
  ];
}

function num(v, min, max, def) {
  return (typeof v === 'number' && isFinite(v)) ? Math.max(min, Math.min(max, v)) : def;
}
function cleanLook(v) {
  if (typeof v === 'number') return Math.floor(num(v, 0, 5, 0));
  if (!v || typeof v !== 'object') return 0;
  return { d: Math.floor(num(v.d, 0, 15, 0)), h: Math.floor(num(v.h, 0, 15, 0)), s: Math.floor(num(v.s, 0, 7, 0)), a: Math.floor(num(v.a, 0, 15, 0)), w: Math.floor(num(v.w, 0, 7, 0)), pt: Math.floor(num(v.pt, -1, N_PETS - 1, -1)) };
}
function cleanName(v) {
  if (typeof v !== 'string') return 'Гостья';
  const s = v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 14);
  return s || 'Гостья';
}

function leave(c) {
  const r = c.room;
  if (!r) return;
  c.room = null;
  if (r.players.get(c.pid) === c) {
    r.players.delete(c.pid);
    broadcast(r, { t: 'pl', id: c.pid });
    if (r.game && (r.players.size < 2 || c.pid === r.game.it)) endGame(r, 'stop');
  }
  if (r.players.size === 0) {
    r.timers.forEach(clearTimeout);
    rooms.delete(r.code);
  }
}

function onMessage(c, m) {
  if (!m || typeof m.t !== 'string') return;

  if (m.t === 'hello') {
    if (c.room) return;
    if (typeof m.id !== 'string' || !/^[a-z0-9]{8,32}$/i.test(m.id)) return c.fail('bad');
    const st = strike(c.ip);
    let code;
    if (m.create) {
      if (st.creates >= 6) return c.fail('slow');
      code = newCode();
      if (!code) return c.fail('bad');
      st.creates++;
      store.rooms[code] = { created: Date.now(), last: Date.now(), total: 0, album: [], chests: {}, digs: 0 };
      saveSoon();
    } else {
      if (st.fails >= 8) return c.fail('slow');
      code = String(m.room || '').replace(/\D/g, '');
      if (!store.rooms[code]) { st.fails++; return c.fail('noroom'); }
    }
    const r = liveRoom(code);
    const old = r.players.get(m.id);
    if (old) { old.room = null; old.close(4001); r.players.delete(m.id); broadcast(r, { t: 'pl', id: m.id }); }
    if (r.players.size >= MAX_PLAYERS) {
      if (r.players.size === 0) rooms.delete(code);
      return c.fail('full');
    }
    c.pid = m.id;
    c.name = cleanName(m.name);
    c.look = cleanLook(m.look);
    const k = r.players.size;
    c.m = 0; c.rd = 0; c.pose = null;
    c.x = c.tx = 2600 + (k - 1.5) * 70;
    c.y = c.ty = 2190 + (k % 2) * 40;
    c.room = r;
    const others = [];
    r.players.forEach(function (p) { others.push(pubPlayer(p)); });
    r.players.set(c.pid, c);
    const rc = rec(code);
    rc.last = Date.now();
    saveSoon();
    const now = Date.now();
    const open = Object.keys(rc.chests).filter(function (id) { return now - rc.chests[id] < CHEST_REFILL_MS; }).map(Number);
    c.send({
      t: 'in', room: code, you: pubPlayer(c), players: others,
      stars: r.stars, total: rc.total || 0, album: rc.album, chests: open, tr: r.tr, furn: rc.furn, inv: rc.inv, ward: rc.ward, pets: rc.pets,
      mat: rc.mat, got: rc.got, npc: rc.npc, proj: rc.proj, cafe: rc.cafe, garden: rc.garden, food: rc.food, fish: rc.fish, bugs: rc.bugs, crops: rc.crops, petDay: rc.petDay, now: Date.now(),
      day: ensureDay(r), mail: rc.mail[c.pid] !== dayKey(), lim: PLAY_MIN ? { p: PLAY_MIN, b: BREAK_MIN } : null,
      game: r.game ? { g: r.game.g, it: r.game.it, d: Math.max(1, Math.round((r.game.until - now) / 1000)), c: Math.max(0, Math.round((r.game.seekAt - now) / 1000)), found: r.game.found } : null, ice: iceServers(c.pid)
    });
    broadcast(r, { t: 'pj', p: pubPlayer(c) }, c);
    return;
  }

  const r = c.room;
  if (!r) return;

  if (m.t === 'mv') {
    c.m = m.m === 1 ? 1 : m.m === 2 ? 2 : 0;
    c.x = num(m.x, 0, WORLD_W, c.x); c.y = num(m.y, 0, WORLD_H, c.y);
    c.tx = num(m.tx, 0, WORLD_W, c.x); c.ty = num(m.ty, 0, WORLD_H, c.y);
    c.rd = m.rd ? 1 : 0;
    if (c.m === 1) prog(r, 'cave'); else if (c.m === 0 && c.y < 900) prog(r, 'bay');
    broadcast(r, { t: 'mv', id: c.pid, m: c.m, rd: c.rd, x: c.x, y: c.y, tx: c.tx, ty: c.ty }, c);
  } else if (m.t === 'em') {
    if (typeof m.e === 'number' && m.e >= 0 && m.e < 16) broadcast(r, { t: 'em', id: c.pid, e: Math.floor(m.e) }, c);
  } else if (m.t === 'tk') {
    broadcast(r, { t: 'tk', id: c.pid, on: !!m.on }, c);
  } else if (m.t === 'st') {
    const i = r.stars.findIndex(function (s) { return s.id === m.id; });
    if (i < 0) return;
    const s = r.stars.splice(i, 1)[0];
    const rc = rec(r.code);
    rc.total = (rc.total || 0) + (s.k ? 3 : 1);
    rc.last = Date.now();
    saveSoon();
    broadcast(r, { t: 'sg', id: s.id, by: c.pid, total: rc.total });
    prog(r, s.k ? 'gems' : 'stars');
    if (!s.e) later(r, STAR_RESPAWN_MS, function () { addStar(r, s.m, false); });
  } else if (m.t === 'dig') {
    if (!r.tr || c.m !== 0) return;
    const dx = c.x - r.tr.x, dy = c.y - r.tr.y;
    if (dx * dx + dy * dy > 220 * 220) return;
    const rc = rec(r.code);
    const miss = [];
    for (let i = 0; i < N_ALBUM; i++) if (rc.album.indexOf(i) < 0) miss.push(i);
    const item = miss.length ? miss[crypto.randomInt(0, miss.length)] : -1;
    const add = item < 0 ? 15 : 10;
    if (item >= 0) rc.album.push(item);
    rc.total = (rc.total || 0) + add;
    rc.digs++;
    rc.last = Date.now();
    saveSoon();
    const old = r.tr;
    r.tr = pickTreasure(r, c);
    prog(r, 'dig');
    broadcast(r, { t: 'dg', by: c.pid, x: old.x, y: old.y, item: item, add: add, total: rc.total, tr: r.tr });
  } else if (m.t === 'ch') {
    const id = Math.floor(num(m.id, 0, N_CHESTS - 1, -1));
    if (id < 0) return;
    const rc = rec(r.code);
    if (rc.chests[id] && Date.now() - rc.chests[id] < CHEST_REFILL_MS) return;
    rc.chests[id] = Date.now();
    rc.total = (rc.total || 0) + 5;
    saveSoon();
    broadcast(r, { t: 'co', id: id, by: c.pid, add: 5, total: rc.total });
    prog(r, 'chest');
  } else if (m.t === 'ps') {
    c.pose = POSES.indexOf(m.k) >= 0 ? { k: m.k, s: Math.floor(num(m.s, 0, 3, 0)), x: Math.round(num(m.x, 0, WORLD_W, c.x)), y: Math.round(num(m.y, 0, WORLD_H, c.y)), sy: Math.round(num(m.sy, 0, WORLD_H, c.y)) } : null;
    broadcast(r, { t: 'ps', id: c.pid, p: c.pose }, c);
    if (c.pose && PKIND[c.pose.k]) prog(r, PKIND[c.pose.k]);
  } else if (m.t === 'jp') {
    broadcast(r, { t: 'jp', id: c.pid }, c);
  } else if (m.t === 'gs') {
    startGame(r, c, m.g);
  } else if (m.t === 'gx') {
    endGame(r, 'stop');
  } else if (m.t === 'tg') {
    const gm = r.game, to = r.players.get(m.to), now = Date.now();
    if (!gm || gm.g !== 'tag' || gm.it !== c.pid || now < gm.cool || !to || to === c || !near(c, to, 280)) return;
    gm.it = to.pid; gm.cool = now + 3000;
    broadcast(r, { t: 'gt', it: to.pid, by: c.pid });
  } else if (m.t === 'gf') {
    const gm = r.game, to = r.players.get(m.id);
    if (!gm || gm.g !== 'hide' || gm.it !== c.pid || Date.now() < gm.seekAt || !to || to === c || gm.found.indexOf(to.pid) >= 0 || !near(c, to, 280)) return;
    gm.found.push(to.pid);
    broadcast(r, { t: 'gf', id: to.pid, by: c.pid });
    let all = true;
    r.players.forEach(function (p, id) { if (id !== gm.it && gm.found.indexOf(id) < 0) all = false; });
    if (all) endGame(r, 'found');
  } else if (m.t === 'ml') {
    const rc = rec(r.code), key = dayKey();
    if (rc.mail[c.pid] === key) return;
    rc.mail[c.pid] = key;
    const roll = crypto.randomInt(0, 100);
    let g = null, n;
    if (roll >= 50 && roll < 80) {
      const cheap = []; PRICES.forEach(function (p, i) { if (p <= 20) cheap.push(i); });
      const f = cheap[crypto.randomInt(0, cheap.length)];
      rc.inv[f] = (rc.inv[f] || 0) + 1; n = rc.inv[f]; g = { f: f };
    } else if (roll >= 80) {
      const opts = Object.keys(WPRICE).filter(function (k) { return WPRICE[k] <= 20 && rc.ward.indexOf(k) < 0; });
      if (opts.length) { const w = opts[crypto.randomInt(0, opts.length)]; rc.ward.push(w); g = { w: w }; }
    }
    if (!g) { g = { s: 5 + crypto.randomInt(0, 8) }; rc.total = (rc.total || 0) + g.s; }
    saveSoon();
    broadcast(r, { t: 'ml', by: c.pid, l: crypto.randomInt(0, N_LETTERS), g: g, n: n, total: rc.total || 0 });
  } else if (m.t === 'lk') {
    c.look = cleanLook(m.look);
    broadcast(r, { t: 'lk', id: c.pid, look: c.look }, c);
  } else if (m.t === 'wb') {
    const k = String(m.k || '');
    const rc = rec(r.code);
    if (!WPRICE[k] || rc.ward.indexOf(k) >= 0) return;
    if ((rc.total || 0) < WPRICE[k]) return c.send({ t: 'no' });
    rc.total -= WPRICE[k];
    rc.ward.push(k);
    saveSoon();
    broadcast(r, { t: 'wb', by: c.pid, k: k, total: rc.total });
    prog(r, 'buy');
  } else if (m.t === 'eg') {
    const rc = rec(r.code);
    const free = [];
    for (let i = 0; i < N_PETS; i++) if (rc.pets[i] === undefined) free.push(i);
    if (!free.length) return c.send({ t: 'nn' });
    if ((rc.total || 0) < EGG_PRICE) return c.send({ t: 'no' });
    const k = free[crypto.randomInt(0, free.length)];
    rc.total -= EGG_PRICE;
    rc.pets[k] = 0;
    saveSoon();
    broadcast(r, { t: 'eg', by: c.pid, k: k, total: rc.total });
  } else if (m.t === 'fd' || m.t === 'pc') {
    const k = Math.floor(num(m.k, 0, N_PETS - 1, -1));
    const rc = rec(r.code);
    const a = m.t === 'fd' ? 'f' : (m.a === 'p' || m.a === 'g' ? m.a : '');
    if (k < 0 || !a || rc.pets[k] === undefined || rc.pets[k] >= PET_MAX) return;
    const key = dayKey();
    if (!rc.petDay[k] || rc.petDay[k].d !== key) rc.petDay[k] = { d: key, f: 0, p: 0, g: 0 };
    const pdk = rc.petDay[k];
    if (pdk[a]) return c.send({ t: 'pn', k: k, a: a });
    if (a === 'f') {
      if (rc.food > 0) rc.food--;
      else if ((rc.total || 0) >= FEED_PRICE) rc.total -= FEED_PRICE;
      else return c.send({ t: 'no' });
    }
    pdk[a] = 1;
    rc.pets[k]++;
    saveSoon();
    broadcast(r, { t: 'fd', by: c.pid, k: k, a: a, h: rc.pets[k], pd: pdk, food: rc.food, total: rc.total || 0 });
    prog(r, a === 'f' ? 'feed' : 'pet');
  } else if (m.t === 'pl') {
    const b = Math.floor(num(m.b, 0, 5, -1)), sd = Math.floor(num(m.s, 0, CROPC.length - 1, -1));
    const rc = rec(r.code);
    if (b < 0 || sd < 0 || rc.garden[b]) return;
    if ((rc.total || 0) < CROPC[sd]) return c.send({ t: 'no' });
    rc.total -= CROPC[sd];
    rc.garden[b] = { s: sd, t: 0 };
    saveSoon();
    broadcast(r, { t: 'gd', garden: rc.garden, total: rc.total, by: c.pid, a: 'p', b: b });
    prog(r, 'plant');
  } else if (m.t === 'wa') {
    const b = Math.floor(num(m.b, 0, 5, -1));
    const rc = rec(r.code), g = b >= 0 ? rc.garden[b] : null;
    if (!g || g.t) return;
    g.t = Date.now();
    saveSoon();
    broadcast(r, { t: 'gd', garden: rc.garden, by: c.pid, a: 'w', b: b });
  } else if (m.t === 'hv') {
    const b = Math.floor(num(m.b, 0, 5, -1));
    const rc = rec(r.code), g = b >= 0 ? rc.garden[b] : null;
    if (!g || !g.t || Date.now() - g.t < CROPG[g.s] * 60000 - 5000) return;
    rc.garden[b] = null;
    const add = CROPC[g.s] * 3;
    rc.total = (rc.total || 0) + add;
    rc.food = (rc.food || 0) + 2;
    if (rc.crops.indexOf(g.s) < 0) rc.crops.push(g.s);
    saveSoon();
    broadcast(r, { t: 'hv', by: c.pid, b: b, s: g.s, garden: rc.garden, add: add, total: rc.total, food: rc.food });
    prog(r, 'harvest');
  } else if (m.t === 'qz' || m.t === 'qs') {
    const now = Date.now(), key = dayKey(), rc = rec(r.code);
    if (!rc.quiz || rc.quiz.d !== key) rc.quiz = { d: key };
    const q = rc.quiz[c.pid] || (rc.quiz[c.pid] = { n: 0, s: 0 });
    if (m.t === 'qz') {
      if (now - (c.lastQz || 0) < 2000) return;
      c.lastQz = now;
      prog(r, 'quiz');
      if (q.n >= 40) return; // за задачки не больше 80 звёзд в день
      q.n++; rc.total = (rc.total || 0) + 2;
      saveSoon();
      broadcast(r, { t: 'qr', by: c.pid, total: rc.total });
    } else {
      if (now - (c.lastQs || 0) < 20000) return;
      c.lastQs = now;
      prog(r, 'school');
      if (q.s >= 3) return;
      q.s++; rc.total = (rc.total || 0) + 5;
      saveSoon();
      broadcast(r, { t: 'qq', by: c.pid, add: 5, total: rc.total });
    }
  } else if (m.t === 'mt') {
    const o = m.o === 't' || m.o === 'r' || m.o === 's' ? m.o : '', lim = o === 't' ? N_TREES : o === 'r' ? N_ROCKS : N_SHELLS;
    const i = Math.floor(num(m.i, 0, lim - 1, -1));
    const now = Date.now();
    if (!o || i < 0 || now - (c.lastGt || 0) < 600) return;
    c.lastGt = now;
    const rc = rec(r.code), arr = rc.got[o];
    if (arr.indexOf(i) >= 0) return c.send({ t: 'mx', o: o, i: i });
    arr.push(i);
    const mk = o === 't' ? 'w' : o === 'r' ? 'r' : 'h';
    rc.mat[mk]++;
    const add = o === 't' && Math.random() < 0.25 ? 3 : 0;
    rc.total = (rc.total || 0) + add;
    saveSoon();
    broadcast(r, { t: 'mg', by: c.pid, o: o, i: i, mat: rc.mat, add: add, total: rc.total });
    if (o !== 'r') prog(r, o === 't' ? 'wood' : 'shell');
  } else if (m.t === 'nq') {
    const i = Math.floor(num(m.id, 0, NPC_KS.length - 1, -1));
    if (i < 0) return;
    const rc = rec(r.code), key = dayKey(), s = rc.npc[i] || (rc.npc[i] = { h: 0 });
    if (s.ok === key || (s.q && s.q.d === key)) return;
    const k = npcQuest(i);
    s.q = { k: k, need: QNEED[k] || 1, have: 0, d: key };
    saveSoon();
    broadcast(r, { t: 'nq', by: c.pid, id: i, s: s });
  } else if (m.t === 'nd') {
    const i = Math.floor(num(m.id, 0, NPC_KS.length - 1, -1));
    const rc = rec(r.code), key = dayKey(), s = i >= 0 ? rc.npc[i] : null;
    if (!s || !s.q || s.q.d !== key || s.ok === key) return;
    const q = s.q;
    if (q.k === 'food') { if (rc.food < q.need) return; rc.food -= q.need; }
    else if (q.k === 'wood') { if (rc.mat.w < q.need) return; rc.mat.w -= q.need; }
    else if (q.k === 'shell') { if (rc.mat.h < q.need) return; rc.mat.h -= q.need; }
    else if (q.have < q.need) return;
    s.ok = key; s.h = Math.min(10, (s.h || 0) + 1);
    rc.total = (rc.total || 0) + 10;
    let g = null, n = 0;
    if (s.h === 3 || s.h === 10) {
      let f = 0;
      if (s.h === 3) { const cheap = []; PRICES.forEach(function (p, j) { if (p <= 20) cheap.push(j); }); f = cheap[(i * 3 + 1) % cheap.length]; }
      else PRICES.forEach(function (p, j) { if (p > PRICES[f]) f = j; });
      rc.inv[f] = (rc.inv[f] || 0) + 1; g = { f: f }; n = rc.inv[f];
    } else if (s.h === 6) {
      const free = Object.keys(WPRICE).filter(function (k) { return rc.ward.indexOf(k) < 0; });
      if (free.length) { const w = free[i % free.length]; rc.ward.push(w); g = { w: w }; }
    }
    saveSoon();
    broadcast(r, { t: 'nd', by: c.pid, id: i, s: s, total: rc.total, mat: rc.mat, food: rc.food, g: g, n: n });
    prog(r, 'npc');
  } else if (m.t === 'pj') {
    const i = Math.floor(num(m.id, 0, PROJN.length - 1, -1));
    if (i < 0) return;
    const rc = rec(r.code), need = PROJN[i], pr = rc.proj[i] || (rc.proj[i] = { p: { s: 0, w: 0, r: 0, h: 0 }, done: 0 });
    if (pr.done) return;
    let took = 0;
    ['s', 'w', 'r', 'h'].forEach(function (k) {
      const left = need[k] - pr.p[k], have = k === 's' ? (rc.total || 0) : rc.mat[k], tk = Math.max(0, Math.min(left, have));
      if (!tk) return;
      took += tk; pr.p[k] += tk;
      if (k === 's') rc.total -= tk; else rc.mat[k] -= tk;
    });
    if (!took) return c.send({ t: 'pz' });
    if (['s', 'w', 'r', 'h'].every(function (k) { return pr.p[k] >= need[k]; })) pr.done = Date.now() + PROJM[i] * 60000 / BUILD_SPEED;
    saveSoon();
    broadcast(r, { t: 'pg', by: c.pid, id: i, pr: pr, mat: rc.mat, total: rc.total });
    prog(r, 'build');
  } else if (m.t === 'ck') {
    const t2 = Math.floor(num(m.t2, 0, 1, -1)), d = Math.floor(num(m.d, 0, N_DISHES - 1, -1));
    const rc = rec(r.code);
    if (t2 < 0 || d < 0 || !isBuilt(rc, 1) || rc.cafe[t2] >= 0) return;
    if (rc.food < 1) return c.send({ t: 'no' });
    rc.food--; rc.cafe[t2] = d;
    saveSoon();
    broadcast(r, { t: 'cf', by: c.pid, cafe: rc.cafe, food: rc.food, a: 'c', d: d });
    prog(r, 'cook');
  } else if (m.t === 'et') {
    const t2 = Math.floor(num(m.t2, 0, 1, -1));
    const rc = rec(r.code);
    if (t2 < 0 || rc.cafe[t2] < 0) return;
    const d = rc.cafe[t2]; rc.cafe[t2] = -1;
    rc.total = (rc.total || 0) + 2;
    saveSoon();
    broadcast(r, { t: 'cf', by: c.pid, cafe: rc.cafe, total: rc.total, a: 'e', d: d });
  } else if (m.t === 'fc' || m.t === 'bc') {
    const fishy = m.t === 'fc', list = fishy ? FISHR : BUGR, i = Math.floor(num(fishy ? m.f : m.b, 0, list.length - 1, -1));
    const now = Date.now();
    if (i < 0 || now - (c.lastCatch || 0) < 1500) return;
    c.lastCatch = now;
    const rc = rec(r.code), arr = fishy ? rc.fish : rc.bugs, isNew = arr.indexOf(i) < 0;
    if (isNew) arr.push(i);
    rc.total = (rc.total || 0) + RSTARS[list[i]];
    saveSoon();
    const out = { t: m.t, by: c.pid, new: isNew, total: rc.total };
    out[fishy ? 'f' : 'b'] = i;
    broadcast(r, out);
    prog(r, fishy ? 'fish' : 'bug');
  } else if (m.t === 'buy') {
    const i = Math.floor(num(m.i, 0, PRICES.length - 1, -1));
    if (i < 0) return;
    const rc = rec(r.code);
    const price = dealPrice(r, i);
    if ((rc.total || 0) < price) return c.send({ t: 'no' });
    rc.total -= price;
    rc.inv[i] = (rc.inv[i] || 0) + 1;
    saveSoon();
    broadcast(r, { t: 'by', by: c.pid, i: i, total: rc.total, n: rc.inv[i] });
    prog(r, 'buy');
  } else if (m.t === 'put') {
    const i = Math.floor(num(m.i, 0, PRICES.length - 1, -1));
    const rc = rec(r.code);
    if (i < 0 || !rc.inv[i] || rc.furn.length >= MAX_FURN) return;
    const f = { u: rc.nextF++, i: i, x: Math.round(num(m.x, 60, 1640, 850)), y: Math.round(num(m.y, FKIND[i] === 'wall' ? 100 : 340, 1080, 600)) };
    rc.furn.push(f);
    rc.inv[i]--;
    saveSoon();
    broadcast(r, { t: 'pu', f: f, n: rc.inv[i] });
  } else if (m.t === 'take') {
    const rc = rec(r.code);
    const k = rc.furn.findIndex(function (f) { return f.u === m.u; });
    if (k < 0) return;
    const f = rc.furn.splice(k, 1)[0];
    rc.inv[f.i] = (rc.inv[f.i] || 0) + 1;
    saveSoon();
    broadcast(r, { t: 'tf', u: f.u, i: f.i, n: rc.inv[f.i] });
  } else if (m.t === 'rtc') {
    const to = r.players.get(m.to);
    if (to && m.d && typeof m.d === 'object') to.send({ t: 'rtc', from: c.pid, d: m.d });
  }
}

/* ---------- WebSocket (свой минимальный, без библиотек) ---------- */
function Conn(socket, ip) {
  this.s = socket; this.ip = ip; this.buf = Buffer.alloc(0);
  this.parts = []; this.partsLen = 0; this.alive = true; this.closed = false;
  this.room = null; this.pid = null; this.m = 0; this.rd = 0; this.pose = null; this.tokens = 120; this.tokTime = Date.now();
  const self = this;
  socket.setNoDelay(true);
  socket.on('data', function (d) { self.onData(d); });
  socket.on('close', function () { self.drop(); });
  socket.on('error', function () { self.drop(); });
  conns.add(this);
}
Conn.prototype.drop = function () {
  if (this.closed) return;
  this.closed = true;
  conns.delete(this);
  leave(this);
  try { this.s.destroy(); } catch (e) { /* уже закрыт */ }
};
Conn.prototype.frame = function (op, payload) {
  if (this.closed) return;
  const n = payload.length;
  let head;
  if (n < 126) { head = Buffer.from([0x80 | op, n]); }
  else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(n, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeUInt32BE(0, 2); head.writeUInt32BE(n, 6); }
  try { this.s.write(Buffer.concat([head, payload])); } catch (e) { this.drop(); }
};
Conn.prototype.sendRaw = function (str) { this.frame(1, Buffer.from(str, 'utf8')); };
Conn.prototype.send = function (obj) { this.sendRaw(JSON.stringify(obj)); };
Conn.prototype.fail = function (code) { this.send({ t: 'err', code: code }); };
Conn.prototype.close = function (code) {
  if (this.closed) return;
  const b = Buffer.alloc(2); b.writeUInt16BE(code || 1000, 0);
  this.frame(8, b);
  const self = this;
  try { this.s.end(); } catch (e) { /* уже закрыт */ }
  setTimeout(function () { self.drop(); }, 500);
};
Conn.prototype.onData = function (d) {
  this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
  for (;;) {
    const buf = this.buf;
    if (buf.length < 2) return;
    const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
    let len = buf[1] & 0x7f, off = 2;
    if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
    else if (len === 127) {
      if (buf.length < 10) return;
      if (buf.readUInt32BE(2) !== 0) return this.close(1009);
      len = buf.readUInt32BE(6); off = 10;
    }
    if (!masked) return this.close(1002);
    if (len > MAX_MSG) return this.close(1009);
    if (buf.length < off + 4 + len) return;
    const payload = Buffer.allocUnsafe(len);
    for (let i = 0; i < len; i++) payload[i] = buf[off + 4 + i] ^ buf[off + (i & 3)];
    this.buf = buf.slice(off + 4 + len);

    if (op === 8) { this.close(1000); return; }
    if (op === 9) { this.frame(10, payload); continue; }
    if (op === 10) { this.alive = true; continue; }
    if (op === 2) { this.close(1003); return; }
    if (op === 1 || op === 0) {
      this.parts.push(payload); this.partsLen += len;
      if (this.partsLen > MAX_MSG) return this.close(1009);
      if (!fin) continue;
      const text = Buffer.concat(this.parts).toString('utf8');
      this.parts = []; this.partsLen = 0;
      this.alive = true;
      // простая защита от флуда
      const now = Date.now();
      this.tokens = Math.min(120, this.tokens + (now - this.tokTime) / 1000 * 60);
      this.tokTime = now;
      if (this.tokens < 1) continue;
      this.tokens -= 1;
      let msg = null;
      try { msg = JSON.parse(text); } catch (e) { continue; }
      try { onMessage(this, msg); } catch (e) { console.error('Ошибка в сообщении:', e); }
    }
  }
};

server.on('upgrade', function (req, socket) {
  const url = (req.url || '').split('?')[0];
  const key = req.headers['sec-websocket-key'];
  if (url !== '/ws' || !key || String(req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
  // пускаем только со своей же страницы
  const origin = req.headers.origin;
  if (origin) {
    let oh = '';
    try { oh = new URL(origin).host; } catch (e) { oh = ''; }
    if (oh !== req.headers.host) { socket.destroy(); return; }
  }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const ip = String(req.headers['x-real-ip'] || socket.remoteAddress || '');
  new Conn(socket, ip);
});

/* проверка «жив ли планшет» */
setInterval(function () {
  conns.forEach(function (c) {
    if (!c.alive) { c.drop(); return; }
    c.alive = false;
    c.frame(9, Buffer.alloc(0));
  });
}, 25000);
setInterval(function () { // сундуки наполняются заново, в полночь — новые дела
  const now = Date.now();
  rooms.forEach(function (r) {
    ensureDay(r);
    const rc = rec(r.code);
    Object.keys(rc.chests).forEach(function (id) {
      if (now - rc.chests[id] >= CHEST_REFILL_MS) { delete rc.chests[id]; saveSoon(); broadcast(r, { t: 'cc', id: Number(id) }); }
    });
  });
}, 60000);
setInterval(function () {
  const now = Date.now();
  strikes.forEach(function (s, ip) { if (s.reset < now) strikes.delete(ip); });
  cleanupStore();
}, 3600000);

function shutdown() { saveNow(); process.exit(0); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(PORT, HOST, function () {
  console.log('Остров запущен: http://' + HOST + ':' + PORT + (TURN_HOST ? ' (голос через ' + TURN_HOST + ')' : ' (без своего TURN)'));
});
