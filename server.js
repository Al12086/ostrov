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
const STARS_ON_MAP = 12;
const STAR_RESPAWN_MS = 7000;
const ROOM_KEEP_DAYS = 365;

/* Точки, где могут появляться звёздочки (заранее проверены: суша, не в пруду и не в домике). */
const SPAWN = [[897,234],[1082,238],[1226,236],[1313,207],[1418,210],[1542,233],[693,319],[876,306],[1092,330],[1228,303],[1329,318],[675,396],[898,430],[991,420],[1097,392],[1184,423],[1334,422],[1398,405],[1509,410],[1642,427],[1715,403],[457,500],[911,486],[983,507],[1623,516],[1754,487],[377,616],[600,619],[1410,604],[1498,586],[1948,604],[2038,608],[373,705],[474,686],[557,684],[660,689],[782,706],[897,708],[985,703],[1096,689],[1217,696],[1323,702],[1404,707],[1543,707],[1845,675],[2144,714],[346,790],[474,807],[798,775],[1013,805],[1118,774],[1214,807],[1316,793],[1435,800],[1639,780],[1936,776],[2060,797],[2136,779],[901,877],[982,903],[1113,867],[1223,872],[1300,878],[1436,897],[1639,882],[1845,869],[1952,876],[2033,899],[352,989],[1003,1000],[1087,975],[1224,983],[1438,986],[1527,1000],[1617,968],[1743,982],[1814,963],[2052,991],[359,1075],[459,1064],[997,1090],[1188,1076],[1295,1074],[1403,1095],[1830,1091],[2047,1067],[380,1190],[473,1177],[675,1164],[899,1162],[1001,1156],[1217,1158],[1325,1169],[1422,1178],[1501,1152],[1628,1179],[478,1260],[553,1247],[699,1266],[783,1281],[885,1279],[1099,1253],[1225,1257],[1335,1259],[1498,1277],[1606,1280],[1211,1363],[1406,1343],[1207,1555]];

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

function liveRoom(code) {
  let r = rooms.get(code);
  if (r) return r;
  r = { code: code, players: new Map(), stars: [], nextStar: 1, timers: new Set() };
  for (let i = 0; i < STARS_ON_MAP; i++) addStar(r, true);
  rooms.set(code, r);
  return r;
}

function addStar(r, silent) {
  if (!SPAWN.length || r.stars.length >= STARS_ON_MAP) return;
  let pt = null;
  for (let i = 0; i < 30 && !pt; i++) {
    const c = SPAWN[crypto.randomInt(0, SPAWN.length)];
    let busy = false;
    for (let j = 0; j < r.stars.length; j++) if (r.stars[j].x === c[0] && r.stars[j].y === c[1]) busy = true;
    if (!busy) pt = c;
  }
  if (!pt) return;
  const s = { id: r.nextStar++, x: pt[0], y: pt[1] };
  r.stars.push(s);
  if (!silent) broadcast(r, { t: 'sn', s: s });
}

function broadcast(r, msg, except) {
  const data = JSON.stringify(msg);
  r.players.forEach(function (c) { if (c !== except) c.sendRaw(data); });
}

function pubPlayer(c) {
  return { id: c.pid, name: c.name, look: c.look, x: c.x, y: c.y, tx: c.tx, ty: c.ty };
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
      store.rooms[code] = { created: Date.now(), last: Date.now(), total: 0 };
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
    c.look = Math.floor(num(m.look, 0, 5, 0));
    const k = r.players.size;
    c.x = c.tx = 1200 + (k - 1.5) * 70;
    c.y = c.ty = 720 + (k % 2) * 40;
    c.room = r;
    const others = [];
    r.players.forEach(function (p) { others.push(pubPlayer(p)); });
    r.players.set(c.pid, c);
    store.rooms[code].last = Date.now();
    saveSoon();
    c.send({
      t: 'in', room: code, you: pubPlayer(c), players: others,
      stars: r.stars, total: store.rooms[code].total || 0, ice: iceServers(c.pid)
    });
    broadcast(r, { t: 'pj', p: pubPlayer(c) }, c);
    return;
  }

  const r = c.room;
  if (!r) return;

  if (m.t === 'mv') {
    c.x = num(m.x, 0, 2400, c.x); c.y = num(m.y, 0, 1750, c.y);
    c.tx = num(m.tx, 0, 2400, c.x); c.ty = num(m.ty, 0, 1750, c.y);
    broadcast(r, { t: 'mv', id: c.pid, x: c.x, y: c.y, tx: c.tx, ty: c.ty }, c);
  } else if (m.t === 'em') {
    if (typeof m.e === 'number' && m.e >= 0 && m.e < 16) broadcast(r, { t: 'em', id: c.pid, e: Math.floor(m.e) }, c);
  } else if (m.t === 'tk') {
    broadcast(r, { t: 'tk', id: c.pid, on: !!m.on }, c);
  } else if (m.t === 'st') {
    const i = r.stars.findIndex(function (s) { return s.id === m.id; });
    if (i < 0) return;
    r.stars.splice(i, 1);
    const rec = store.rooms[r.code];
    rec.total = (rec.total || 0) + 1;
    rec.last = Date.now();
    saveSoon();
    broadcast(r, { t: 'sg', id: m.id, by: c.pid, total: rec.total });
    const tm = setTimeout(function () { r.timers.delete(tm); if (rooms.get(r.code) === r) addStar(r, false); }, STAR_RESPAWN_MS);
    r.timers.add(tm);
  } else if (m.t === 'rtc') {
    const to = r.players.get(m.to);
    if (to && m.d && typeof m.d === 'object') to.send({ t: 'rtc', from: c.pid, d: m.d });
  }
}

/* ---------- WebSocket (свой минимальный, без библиотек) ---------- */
function Conn(socket, ip) {
  this.s = socket; this.ip = ip; this.buf = Buffer.alloc(0);
  this.parts = []; this.partsLen = 0; this.alive = true; this.closed = false;
  this.room = null; this.pid = null; this.tokens = 120; this.tokTime = Date.now();
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
