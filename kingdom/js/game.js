/* Королевство принцессы — игровой движок. */
'use strict';

/* ---------- утилиты ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sample = (a, n) => shuffle(a).slice(0, n);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const APP_VER = 32;   // номер версии виден в разделе «Для родителей»
const FAST = /[?&]fast\b/.test(location.search);   // режим автопроверки: без голоса и пауз

/* ---------- состояние ---------- */
const KEY = 'kingdom.v1';
const DEF = () => ({
  v: 1, ts: 0, created: false, name: '',
  hero: { skin: 0, hair: 1, style: 0, eyes: 0 },
  wear: { dress: 'rose', crown: 'simple', acc: 'none', pet: 'none' },
  owned: ['rose', 'simple', 'none'],
  stars: {}, wallet: 0, stats: {}, seen: {},
  set: { limit: 20, pause: 60, music: true, rate: 0.9, voiceName: '', special: 0, pin: '' },
  grade: 0,                                // 0 — дошкольник, 3 — третий класс
  day: { d: '', ms: 0 },
  sk: {},                                  // навыки тренажёра: уровень, сколько решено, последние ответы
  adv: { d: '', n: 0, streak: 0 },         // приключения: последний день, сколько сегодня, дней подряд
  sess: { ms: 0, last: 0, until: 0 }      // игра подряд: сколько наиграно, когда играли, до какого времени перерыв
});
let S = DEF();
function adopt(raw) {
  if (!raw || raw.v !== 1) return false;
  S = Object.assign(DEF(), raw);
  S.set = Object.assign(DEF().set, raw.set || {});
  S.hero = Object.assign(DEF().hero, raw.hero || {});
  S.wear = Object.assign(DEF().wear, raw.wear || {});
  S.sess = Object.assign(DEF().sess, raw.sess || {});
  S.adv = Object.assign(DEF().adv, raw.adv || {});
  if (S.hero.look == null) S.hero.look = [0, 1, 1, 2, 3, 0][S.hero.hair] != null ? (S.hero.skin >= 3 ? 2 : [0, 1, 1, 1, 3, 0][S.hero.hair]) : 0;   // прежняя нарисованная — ближайшая похожая
  /* Сервер (PHP) возвращает пустые {} как []. В массиве ключи вроде «g1» или «intro» терялись бы при сохранении. */
  ['stars', 'stats', 'seen', 'sk'].forEach(k => {
    const v = S[k], o = {};
    if (v && typeof v === 'object') Object.keys(v).forEach(i => { if (v[i] != null) o[i] = v[i]; });
    S[k] = o;
  });
  if (!Array.isArray(S.owned)) S.owned = Object.values(S.owned || {});
  if (S.set.special === true) S.set.special = 4; else if (!S.set.special) S.set.special = 0;   // раньше было «да/нет»
  if (typeof gradeSync === 'function') try { gradeSync(); } catch (e) {}
  return true;
}
function load() {
  try { adopt(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { /* хранилище недоступно — играем без сохранения */ }
}
function store() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function save() { S.ts = Date.now(); store(); Sync.queue(); }
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function dayCheck() { if (S.day.d !== today()) S.day = { d: today(), ms: 0 }; }
const pauseMs = () => (S.set.pause || 60) * 60000;
function addTime(ms) {
  dayCheck(); ms = Math.min(ms, 10 * 60000); S.day.ms += ms;
  const now = Date.now();
  if (now - (S.sess.last || 0) > pauseMs()) S.sess.ms = 0;            // давно не играла — отсчёт с начала
  S.sess.ms += ms; S.sess.last = now;
  if (S.set.limit > 0 && S.sess.ms >= S.set.limit * 60000) { S.sess.until = now + pauseMs(); S.sess.ms = 0; }   // наигралась — перерыв
  save();
}
function restNeeded() { return S.set.limit > 0 && Date.now() < (S.sess.until || 0); }
/* Миры королевства. Звёзды замка хранятся под номерами уровней (1…20), сада — с приставкой g (g1…g20). */
const WORLDS = {
  castle: { name: 'Буквенный замок', levels: LEVELS, pre: '', ends: CHAPTER_END, bg: 'lav', lbg: 'rose' },
  garden: { name: 'Сад чисел', levels: MLEVELS, pre: 'g', ends: MCHAPTER_END, bg: 'mint', lbg: 'mint' },
  tower: { name: 'Башня мудреца', levels: TLEVELS, pre: 't', ends: TCHAPTER_END, bg: 'sky', lbg: 'sky' },
  workshop: { name: 'Мастерская загадок', levels: WLEVELS, pre: 'w', ends: WCHAPTER_END, bg: 'peach', lbg: 'peach' },
  music: { name: 'Музыкальный зал', levels: HLEVELS, pre: 'h', ends: HCHAPTER_END, bg: 'lilac', lbg: 'lilac' }
};
const STORIES = { intro: STORY.intro, gintro: MSTORY.intro };
Object.keys(STORY).forEach(k => { if (k !== 'intro') STORIES['s' + k] = STORY[k]; });
Object.keys(MSTORY).forEach(k => { if (k !== 'intro') STORIES['gs' + k] = MSTORY[k]; });
STORIES.tintro = TSTORY.intro;
Object.keys(TSTORY).forEach(k => { if (k !== 'intro') STORIES['ts' + k] = TSTORY[k]; });
[['w', WSTORY], ['h', HSTORY]].forEach(([p, st]) => Object.keys(st).forEach(k => { STORIES[k === 'intro' ? p + 'intro' : p + 's' + k] = st[k]; }));
let W = 'castle';                                   // мир, в котором сейчас игрок
const sk = (n, w) => WORLDS[w || W].pre + n;         // ключ уровня в сохранении
const storyKey = n => (WORLDS[W].sp != null ? WORLDS[W].sp : WORLDS[W].pre) + 's' + n;   // сказки у обоих классов общие
/* Третий класс: те же миры и сказки, но свои уровни и звёзды (приставка 3c, 3g …) */
const WORLDS0 = {}; Object.keys(WORLDS).forEach(w => { WORLDS0[w] = Object.assign({}, WORLDS[w]); });
const WORLDS3 = {};
let gradeNow = 0;
function gradeSync() {
  const g = S.grade === 3 && typeof G3_WORLD !== 'undefined' ? 3 : 0;
  if (g === gradeNow) return;
  gradeNow = g;
  Object.keys(WORLDS).forEach(w => {
    if (g === 3 && !WORLDS3[w]) WORLDS3[w] = Object.assign({}, WORLDS0[w], { name: G3_WORLD[w].name, sub: G3_WORLD[w].sub, pre: '3' + (WORLDS0[w].pre || 'c'), sp: WORLDS0[w].pre, levels: g3Levels(w, WORLDS0[w].ends) });
    Object.keys(WORLDS[w]).forEach(k => delete WORLDS[w][k]);
    Object.assign(WORLDS[w], g === 3 ? WORLDS3[w] : WORLDS0[w]);
  });
}
const worldStars = w => WORLDS[w].levels.reduce((a, _, i) => a + (S.stars[sk(i + 1, w)] || 0), 0);
const totalStars = () => Object.values(S.stars).reduce((a, b) => a + b, 0);
const unlocked = n => n === 1 || (S.stars[sk(n - 1)] || 0) > 0;
const nextLevel = () => { const N = WORLDS[W].levels.length; for (let n = 1; n <= N; n++) if (!S.stars[sk(n)]) return n; return N; };
function stat(key, ok) { if (!key) return; const s = S.stats[key] || (S.stats[key] = { ok: 0, bad: 0 }); if (ok) s.ok++; else s.bad++; }

/* ---------- сцена ---------- */
const stage = $('#stage'), screenEl = $('#screen'), fx = $('#fx'), modal = $('#modal');
let scale = 1, scr = '';
function fit() {
  scale = Math.min(innerWidth / 1280, innerHeight / 800);
  stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
  $('#rotate').hidden = !(innerHeight > innerWidth * 1.15);
}
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 200));

function show(name, html) {
  scr = name; Voice.stop();
  screenEl.className = 'scr scr-' + name;
  screenEl.innerHTML = html;
  modal.innerHTML = ''; modal.className = '';
}
/* ---------- волшебные частицы: звёздочки, сердечки, конфетти (canvas поверх сцены) ---------- */
const FX = (() => {
  let cv = null, cx = null, parts = [], raf = 0, k = 1;
  const COLORS = ['#FFD166', '#FF8FB8', '#FF5C8D', '#7ED6BE', '#B79CF0', '#8CC8FF', '#FFFFFF'];
  function ensure() {
    if (cv && cv.isConnected) return true;
    cv = document.createElement('canvas'); cv.className = 'fxcv'; fx.appendChild(cv); cx = cv.getContext('2d');
    k = Math.min(2, (devicePixelRatio || 1) * scale) || 1; cv.width = 1280 * k; cv.height = 800 * k;
    return !!cx;
  }
  function star(c, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function heart(c, r) { c.beginPath(); c.moveTo(0, r * 0.35); c.bezierCurveTo(-r * 1.1, -r * 0.4, -r * 0.4, -r * 1.1, 0, -r * 0.45); c.bezierCurveTo(r * 0.4, -r * 1.1, r * 1.1, -r * 0.4, 0, r * 0.35); c.fill(); }
  function tick() {
    cx.setTransform(k, 0, 0, k, 0, 0); cx.clearRect(0, 0, 1280, 800);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      const a = Math.min(1, p.life / 18);
      cx.save(); cx.globalAlpha = a; cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c;
      if (p.t === 'star') { cx.shadowColor = p.c; cx.shadowBlur = 8; star(cx, p.r); }
      else if (p.t === 'heart') heart(cx, p.r);
      else if (p.t === 'conf') { cx.scale(1, Math.cos(p.rot * 2)); cx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); }
      else { cx.shadowColor = '#fff'; cx.shadowBlur = 10; cx.beginPath(); cx.arc(0, 0, p.r, 0, 7); cx.fill(); }
      cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) cx.clearRect(0, 0, 1280, 800);
  }
  function add(list) { if (FAST || !ensure()) return; parts.push(...list); if (parts.length > 400) parts.splice(0, parts.length - 400); if (!raf) raf = requestAnimationFrame(tick); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  return {
    burst(x, y, n, kinds) {
      kinds = kinds || ['star', 'star', 'dot', 'heart'];
      add(Array.from({ length: n || 18 }, () => { const a = rnd(0, Math.PI * 2), v = rnd(4, 11);
        return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, g: 0.32, drag: 0.95, r: rnd(7, 15), rot: rnd(0, 6), vr: rnd(-0.2, 0.2), life: rnd(40, 70), c: pick(COLORS), t: pick(kinds) }; }));
    },
    sparkle(x, y) {
      add(Array.from({ length: 7 }, () => { const a = rnd(0, Math.PI * 2), v = rnd(1.5, 4);
        return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.05, drag: 0.93, r: rnd(4, 8), rot: 0, vr: 0.1, life: rnd(22, 34), c: pick(COLORS), t: Math.random() < 0.5 ? 'star' : 'dot' }; }));
    },
    confetti(n) {
      add(Array.from({ length: n || 120 }, () => ({ x: rnd(0, 1280), y: rnd(-300, -10), vx: rnd(-1.5, 1.5), vy: rnd(2, 5), g: 0.06, drag: 0.995, r: rnd(6, 11), rot: rnd(0, 6), vr: rnd(-0.15, 0.15),
        life: rnd(150, 230), c: pick(COLORS.slice(0, 6)), t: Math.random() < 0.7 ? 'conf' : 'star' })));
    }
  };
})();
function stageXY(cX, cY) { const sr = stage.getBoundingClientRect(); return [(cX - sr.left) / scale, (cY - sr.top) / scale]; }
function burst(el, n) {
  if (!el) return;
  const r = el.getBoundingClientRect(), [x, y] = stageXY(r.left + r.width / 2, r.top + r.height / 2);
  FX.burst(x, y, n || 18);
}
function heroHTML(mood, cls) {
  const pet = PET[S.wear.pet] && PET[S.wear.pet].e ? `<img class="pet" src="img/pet/${S.wear.pet}.webp" alt="" draggable="false">` : '';
  return `<div class="hero ${cls || ''}" id="hero">${heroArt(S.hero, S.wear, mood)}${pet}</div>`;
}
function heroMood(m) {
  const h = $('#hero'), a = h && h.querySelector('.hart'); if (!a) return;
  a.outerHTML = heroArt(S.hero, S.wear, m);
  const n = h.querySelector('.hart'); if (n && m !== 'happy') n.classList.add('go');      // прыжок от радости, покачивание в раздумьях
}
const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="3" fill="currentColor"/><circle cx="17.5" cy="16" r="3" fill="currentColor"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.5 3.5l-2-.6-.5-1.3 1-1.9-1.6-1.6-1.9 1-1.3-.5-.6-2h-2.3l-.6 2-1.3.5-1.9-1L5.5 6.6l1 1.9-.5 1.3-2 .6v2.3l2 .6.5 1.3-1 1.9 1.6 1.6 1.9-1 1.3.5.6 2h2.3l.6-2 1.3-.5 1.9 1 1.6-1.6-1-1.9.5-1.3 2-.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  dress: '<svg viewBox="0 0 24 24"><path d="M9 3l1.5 4L7 21h10L13.5 7 15 3l-3 2z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  again: '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.2-5.1M19 4v4h-4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'
};
const wallet = () => `<div class="wallet" id="wallet">${starSVG(true)}<b>${S.wallet}</b></div>`;
const topbar = (back, title, extra) => `<div class="top">
  <button class="rbtn" data-act="${back}" aria-label="Назад">${ICON.back}</button>
  <h1>${title || ''}</h1>${extra || ''}${wallet()}</div>`;

/* ---------- экраны ---------- */
function title() {
  if (!S.created) return creator(true);
  show('title', `${bgImg('title')}
    ${heroHTML('happy', 'big')}
    <div class="t-text"><p>${S.name ? 'Принцесса ' + esc(S.name) : 'Добро пожаловать'}</p><h1>Сказочное королевство</h1></div>
    <button class="btn play" data-act="start">${ICON.play}<span>Играть</span></button>
    <button class="rbtn small parent" data-act="gate" aria-label="Для родителей">${ICON.gear}</button>`);
}

let crWord = '';
/* Код игры складывается из имени и волшебного слова: «маша радуга» */
const heroCode = (name, word) => (name + ' ' + word).toLowerCase().replace(/\s+/g, ' ').trim();
function creator(first) {
  const sw = (prop, arr) => arr.map((c, i) => `<button class="sw ${S.hero[prop] === i ? 'on' : ''}" data-act="cr" data-p="${prop}" data-v="${i}" style="--c:${c}" aria-label="${prop} ${i + 1}"></button>`).join('');
  show('creator', `${softBG('rose')}
    <div class="cr-left">${heroHTML('happy', 'big')}</div>
    <div class="panel cr-panel">
      <h2>Выбери свою принцессу</h2>
      <div class="looks">${HERO_LOOKS.map((l, i) => l.special && (+S.set.special !== i || l.ready === false) ? '' : `<button class="look ${heroLook(S.hero) === i ? 'on' : ''}" data-act="cr" data-p="look" data-v="${i}" aria-label="${l.n}"><img src="img/hero/h${i}_0.webp" alt=""><span>${l.n}</span></button>`).join('')}</div>
      <div class="cr-row"><span>Класс</span><div class="grade">${[[0, 'Дошкольник'], [3, '3 класс']].map(([g, n]) => `<button class="chip ${(S.grade === 3 ? 3 : 0) === g ? 'on' : ''}" data-act="crg" data-v="${g}">${n}</button>`).join('')}</div></div>
      <div class="cr-row"><span>Имя</span><div><input id="nm" maxlength="14" placeholder="Имя принцессы" value="${esc(S.name)}" autocomplete="off"></div></div>
      ${first && !Sync.code ? `<div class="cr-row"><span>Слово</span><div><input id="mw" maxlength="20" placeholder="Волшебное слово" value="${esc(crWord)}" autocomplete="off" autocapitalize="off"></div></div>
      <p class="cr-hint">С именем и волшебным словом игра откроется на любом устройстве.</p>` : ''}
      <div class="cr-end">${first ? '<button class="chip" data-act="crSync">У меня уже есть принцесса</button>' : ''}<button class="btn" data-act="crDone" data-first="${first ? 1 : ''}">${ICON.play}<span>Готово</span></button></div>
    </div>`);
}

const PLACES = [
  { id: 'castle', n: 'Буквенный замок', sub: 'Учимся читать' },
  { id: 'garden', n: 'Сад чисел', sub: 'Математика' },
  { id: 'tower', n: 'Башня мудреца', sub: 'Мир вокруг' },
  { id: 'workshop', n: 'Мастерская загадок', sub: 'Логика и память' },
  { id: 'music', n: 'Музыкальный зал', sub: 'Ритм и слух' }
];
function map() {
  if (!S.seen.intro) return story('intro', map);
  show('map', `${bgImg('map')}
    ${PLACES.map(p => WORLDS[p.id]
      ? `<button class="place open p-${p.id}" data-act="world" data-w="${p.id}">${buildArt(p.id)}<span class="plaque">${p.n}<small>${starSVG(true)} ${worldStars(p.id)} из ${WORLDS[p.id].levels.length * 3}</small></span></button>`
      : `<button class="place locked p-${p.id}" data-act="soon">${BUILD[p.id]}<span class="plaque">${p.n}<small>скоро откроется</small></span><span class="lockb">${ICON.lock}</span></button>`).join('')}
    ${heroHTML('happy', 'onmap').replace('<div class="hero onmap"', `<div class="hero onmap" style="left:${(MAP_SPOT[W] || MAP_SPOT.castle)[0]}px;top:${(MAP_SPOT[W] || MAP_SPOT.castle)[1]}px"`)}
    <button class="advbtn" data-act="adv"><img class="advic" src="img/ui/scroll.webp" alt=""><span><b>Приключение</b><small>${advSub()}</small></span></button>
    <div class="top">
      <button class="rbtn" data-act="title" aria-label="Назад">${ICON.back}</button><h1></h1>
      <button class="rbtn pink" data-act="wardrobe" aria-label="Гардероб">${ICON.dress}</button>${wallet()}
    </div>`);
  if (!FAST) Sfx.music(S.set.music);
}

/* принцесса стоит у мира, где играла последний раз */
const MAP_SPOT = { castle: [455, 130], garden: [475, 20], tower: [880, 170], workshop: [462, 400], music: [415, 360] };
function advSub() {
  dayCheck();
  if (S.adv.d === today()) return S.adv.streak > 1 ? 'дней подряд: ' + S.adv.streak + ' 🔥' : 'сегодня: ' + S.adv.n;
  return 'подарок дня ждёт 🎁';
}
function nodeXY(i) { const r = Math.floor(i / 5), c = i % 5; return [170 + (r % 2 ? 4 - c : c) * 235, 205 + r * 150]; }
function world() {
  if (!FAST) Sfx.music(S.set.music);
  const cur = nextLevel(), LV = WORLDS[W].levels;
  const pts = LV.map((_, i) => nodeXY(i));
  const [hx, hy] = pts[cur - 1];
  show('world', `${worldBG(W, WORLDS[W].bg)}
    <svg class="path" viewBox="0 0 1280 800" aria-hidden="true"><path d="M${pts.map(p => p.join(' ')).join(' L')}" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
      <path d="M${pts.map(p => p.join(' ')).join(' L')}" fill="none" stroke="#C9B6F2" stroke-width="4" stroke-dasharray="2 20" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ${LV.map((lv, i) => {
      const n = i + 1, st = S.stars[sk(n)] || 0, open = unlocked(n), [x, y] = pts[i];
      const gift = WORLDS[W].ends.includes(n) && !S.seen[storyKey(n)];
      return `<button class="node ch${lv.ch} ${open ? '' : 'closed'} ${n === cur && open ? 'cur' : ''}" style="left:${x}px;top:${y}px" data-act="level" data-n="${n}" aria-label="Уровень ${n}: ${lv.title}">
        <b>${open ? n : ICON.lock}</b>${gift ? '<i class="gift">🎁</i>' : ''}
        <span class="stars">${[1, 2, 3].map(k => starSVG(st >= k)).join('')}</span></button>`;
    }).join('')}
    <div class="hero mini" id="hero" style="left:${hx + 34}px;top:${hy - 128}px">${heroArt(S.hero, S.wear, 'happy')}</div>
    ${topbar('map', WORLDS[W].name, '<button class="trainbtn" data-act="train"><span>✨</span>Тренировка</button>')}`);
}

function story(id, then) {
  const st = STORIES[id];
  show('story', `${bgImg('night')}
    <div class="panel story"><div class="st-emoji">${st.pet ? `<img class="st-pet" src="img/pet/${st.pet}.webp" alt="">` : st.e}</div><p>${st.t}</p>
      <button class="btn" data-act="storyNext">${ICON.play}<span>Дальше</span></button></div>
    ${heroHTML('cheer', 'big')}`);
  story.then = () => {
    S.seen[id] = 1;
    if (st.pet && !S.owned.includes(st.pet)) { S.owned.push(st.pet); S.wear.pet = st.pet; }
    save(); then();
  };
  Sfx.star(); Voice.say(st.t);
}

function rest() {
  show('rest', `${bgImg('night')}
    <div class="panel story"><div class="st-emoji">🌙</div><p>Принцесса устала и отдыхает.<br>Приходи через <b id="restleft"></b></p>
      <button class="btn ghost" data-act="gate">${ICON.gear}<span>Для родителей</span></button></div>
    ${heroHTML('sleep', 'big')}`);
  const tick = () => {
    const el = $('#restleft');
    if (scr !== 'rest' || !el) return clearInterval(rest.tm);
    const left = (S.sess.until || 0) - Date.now();
    if (left <= 0) { clearInterval(rest.tm); return title(); }
    const m = Math.ceil(left / 60000);
    el.textContent = m >= 60 ? Math.floor(m / 60) + ' ч' + (m % 60 ? ' ' + (m % 60) + ' мин' : '') : m + ' мин';
  };
  clearInterval(rest.tm); rest.tm = setInterval(tick, 5000); tick();
  Sfx.music(false); Voice.say(T.rest);
}

/* ---------- гардероб ---------- */
let wTab = 'dress';
function wardrobe() {
  const tabs = [['dress', 'Платья'], ['crown', 'Короны'], ['acc', 'Вещицы'], ['pet', 'Друзья']];
  const src = { dress: DRESS, crown: CROWN, acc: ACC, pet: PET }[wTab];
  const prev = (id) => {
    if (wTab === 'pet') return src[id].e ? `<img class="pv-pet" src="img/pet/${id}.webp" alt="">` : '<span class="pv-emoji">✖️</span>';
    const w = Object.assign({}, S.wear, { [wTab]: id });
    return heroArt(S.hero, w, 'happy');
  };
  const cards = Object.keys(src).map(id => {
    const it = src[id], own = S.owned.includes(id), on = S.wear[wTab] === id;
    const lockedPet = wTab === 'pet' && !own;
    return `<button class="item ${on ? 'on' : ''} ${own ? '' : 'buy'} ${lockedPet ? 'mystery' : ''} t-${wTab}" data-act="wear" data-id="${id}" aria-label="${it.n}">
      <span class="pv">${lockedPet ? '<span class="pv-emoji">🎁</span>' : prev(id)}</span>
      <span class="tag">${on ? 'надето' : own ? it.n : lockedPet ? 'подарок в игре' : starSVG(true) + ' ' + it.p}</span></button>`;
  }).join('');
  show('wardrobe', `${softBG('rose')}
    <div class="w-left">${heroHTML('happy', 'big')}</div>
    <div class="panel w-panel">
      <div class="tabs">${tabs.map(([id, n]) => `<button class="chip ${wTab === id ? 'on' : ''}" data-act="wtab" data-id="${id}">${n}</button>`).join('')}</div>
      <div class="items">${cards}</div>
    </div>
    ${topbar('map', 'Гардероб')}`);
}

/* ---------- уровень: генерация заданий ---------- */
function weightPick(items, n, keyFn) {
  const scored = items.map(it => {
    const st = S.stats[keyFn(it)] || { ok: 0, bad: 0 };
    const w = Math.max(0.3, 1 + st.bad * 2 + (st.ok === 0 ? 1 : 0) - Math.min(st.ok, 4) * 0.2);
    return { it, r: Math.random() * w };
  }).sort((a, b) => b.r - a.r).map(x => x.it);
  const out = [];
  while (out.length < n) out.push(...scored.slice(0, n - out.length));
  return out;
}
function sylDistract(ans, pool, n) {
  const rest = shuffle(pool.filter(s => s !== ans));
  const out = [];
  const take = f => { const i = rest.findIndex(f); if (i >= 0) out.push(rest.splice(i, 1)[0]); };
  take(s => s[0] === ans[0]); take(s => s.slice(1) === ans.slice(1));
  while (out.length < n && rest.length) out.push(rest.shift());
  return out.slice(0, n);
}
const opt = (t, cls, ok) => ({ t, cls, ok });
function wordsDistract(w, pool, n) {
  const used = new Set([w.e]), out = [];
  const rest = shuffle(pool.filter(x => x.w !== w.w));
  const same = rest.find(x => x.w[0] === w.w[0] && !used.has(x.e));
  if (same) { out.push(same); used.add(same.e); }
  for (const x of rest) { if (out.length >= n) break; if (!used.has(x.e)) { out.push(x); used.add(x.e); } }
  return out;
}

const MAKE = {
  demoSyl: () => [{ kind: 'demo', a: 'М', b: 'А', res: ['МА'], speech: [T.demoSyl, 'ма'] }],
  demoWord: () => [{ kind: 'demo', a: 'МА', b: 'МА', res: ['МА', 'МА'], speech: [T.demoWord, 'мама'] }],
  first(lv, n) {
    const letters = [...new Set(lv.first.map(x => x[0][0].toUpperCase()))];
    return weightPick(lv.first, n, x => 'f:' + x[0]).map(([w, e]) => {
      const ans = w[0].toUpperCase();
      return { kind: 'choose', key: 'f:' + w, speech: [T.first, w], stim: { emoji: e },
        options: shuffle([opt(ans, 'letter', true)].concat(sample(letters.filter(l => l !== ans), 3).map(l => opt(l, 'letter', false)))), after: [] };
    });
  },
  hear(lv, n) {
    return weightPick(lv.syl, n, s => 's:' + s).map(s => ({ kind: 'choose', key: 's:' + s, speech: [T.hear, s.toLowerCase()], stim: { ear: true },
      options: shuffle([opt(s, 'syl', true)].concat(sylDistract(s, lv.syl, 3).map(x => opt(x, 'syl', false)))), after: [s.toLowerCase()] }));
  },
  merge(lv, n) {
    const cons = [...new Set(lv.syl.map(s => s[0]))], vows = [...new Set(lv.syl.map(s => s[1]))];
    return weightPick(lv.syl, n, s => 's:' + s).map(s => ({ kind: 'assemble', key: 's:' + s, speech: [T.merge, s.toLowerCase()], stim: { ear: true },
      parts: [s[0], s[1]], bank: shuffle([s[0], s[1], pick(cons.filter(c => c !== s[0])), pick(vows.filter(v => v !== s[1]))]), pcls: 'letter', after: [s.toLowerCase()] }));
  },
  sylpic(lv, n) {
    return weightPick(lv.pics, n, x => 'p:' + x[0]).map(([w, e, s]) => ({ kind: 'choose', key: 'p:' + w, speech: [T.sylpic, w], stim: { emoji: e },
      options: shuffle([opt(s, 'syl', true)].concat(sylDistract(s, lv.syl, 3).map(x => opt(x, 'syl', false)))), after: [w] }));
  },
  build(lv, n) {
    const pool = lv.buildWords || lv.words;
    const allSyl = [...new Set(pool.flatMap(w => w.s))];
    return weightPick(pool, n, w => 'b:' + w.w).map(w => ({ kind: 'assemble', key: 'b:' + w.w, speech: [T.build, w.w], stim: { emoji: w.e },
      parts: w.s, bank: shuffle(w.s.concat(sample(allSyl.filter(s => !w.s.includes(s)), w.s.length > 2 ? 2 : 2))), pcls: 'syl', after: [w.w] }));
  },
  spell(lv, n) {
    const pool = lv.spellWords || lv.words;
    const V = 'АОУЫИЕ'.split(''), C = 'МСЛНРКТПДБГВЗШ'.split('');
    return weightPick(pool, n, w => 'sp:' + w.w).map(w => {
      const parts = w.w.toUpperCase().split('');
      return { kind: 'assemble', key: 'sp:' + w.w, speech: [T.spell, w.w], stim: { emoji: w.e },
        parts, bank: shuffle(parts.concat([pick(V.filter(x => !parts.includes(x))), pick(C.filter(x => !parts.includes(x)))])), pcls: 'letter', after: [w.w] };
    });
  },
  read(lv, n) {
    return weightPick(lv.words, n, w => 'r:' + w.w).map(w => ({ kind: 'choose', key: 'r:' + w.w, speech: [T.read], stim: { word: w.s },
      options: shuffle([opt(w.e, 'emoji', true)].concat(wordsDistract(w, lv.words, 3).map(x => opt(x.e, 'emoji', false)))), after: [w.w] }));
  },
  missing(lv, n) {
    const V = 'АОУЫИЕ'.split(''), C = 'МСЛНРКТПДБГВЗШ'.split('');
    return weightPick(lv.words, n, w => 'm:' + w.w).map(w => {
      const up = w.w.toUpperCase(), i = Math.floor(Math.random() * up.length), ans = up[i];
      const set = (isVowel(ans) ? V : C).filter(x => x !== ans);
      return { kind: 'choose', key: 'm:' + w.w, speech: [T.missing, w.w], stim: { emoji: w.e, word: w.s, blank: i, small: true },
        options: shuffle([opt(ans, 'letter', true)].concat(sample(set, 3).map(x => opt(x, 'letter', false)))), after: [w.w], fill: true };
    });
  },
  pair(lv, n) {
    const pool = lv.pairWords, out = [];
    for (let k = 0; k < n; k++) {
      const [a, b, c, d] = sample(pool, 4);
      out.push({ kind: 'choose', key: 'pr:' + a.w, speech: [T.pair], stim: { phrase: [a.s, b.s] },
        options: shuffle([opt(a.e + b.e, 'pair', true), opt(a.e + c.e, 'pair', false), opt(d.e + b.e, 'pair', false)]), after: [a.w, 'и', b.w] });
    }
    return out;
  }
};
Object.assign(MAKE, MATH_MAKE, TOWER_MAKE, WORK_MAKE, HALL_MAKE, SK_MAKE, typeof G3_MAKE !== 'undefined' ? G3_MAKE : {});
function buildRounds(n, w) {
  const lv = WORLDS[w || W].levels[n - 1];
  if (lv.parts) return g3Rounds(lv);
  return lv.mix.flatMap(([type, count]) => MAKE[type](lv, count).map(r => (r.type = type, r)));
}

/* ---------- уровень: игра ---------- */
let L = null;
function wordHTML(syls, blank) {
  let i = 0;
  return syls.map(s => `<span class="sy">${s.split('').map(ch => {
    const b = i++ === blank;
    return b ? '<i class="blank" id="blank">?</i>' : `<i class="${isVowel(ch) ? 'v' : 'c'}">${ch}</i>`;
  }).join('')}</span>`).join('');
}
const lettersHTML = t => t.split('').map(ch => `<i class="${isVowel(ch) ? 'v' : 'c'}">${ch}</i>`).join('');

function startLevel(n) {
  if (restNeeded()) return rest();
  Sfx.unlock();
  if (W === 'music') Sfx.music(false);       // в Музыкальном зале фоновая мелодия мешает слушать
  const rounds = buildRounds(n);
  L = { n, rounds, i: -1, mistakes: 0, t0: Date.now(), done: 0, total: rounds.filter(r => r.kind !== 'demo').length, r: null, rm: 0, lock: false };
  show('level', `${worldBG(W, WORLDS[W].lbg)}
    <div class="top">
      <button class="rbtn" data-act="quit" aria-label="Выйти">${ICON.back}</button>
      <div class="gems" id="gems">${Array.from({ length: L.total }, () => '<i></i>').join('')}</div>
      <button class="rbtn pink big" data-act="repeat" aria-label="Послушать ещё раз">${ICON.sound}</button>
    </div>
    ${heroHTML('happy', 'side')}
    <div class="panel board" id="task"></div>`);
  nextRound();
}
/* ---------- приключение: задания вперемешку, следующее подбирается по ходу игры ---------- */
function startAdventure(area, from) {
  if (restNeeded()) return rest();
  Sfx.unlock();
  const plan = Skills.plan(area, 12);
  L = { adv: true, area: area || '', from: from || 'map', plan, rounds: [], hist: [], i: -1, mistakes: 0, t0: Date.now(), done: 0, total: plan.length, r: null, rm: 0, lock: false };
  show('level', `<div id="advbg">${worldBG(AREAS[plan[0]].w || plan[0], AREAS[plan[0]].bg)}</div>
    <div class="top">
      <button class="rbtn" data-act="quit" aria-label="Выйти">${ICON.back}</button>
      <div class="gems" id="gems">${Array.from({ length: L.total }, () => '<i></i>').join('')}</div>
      <button class="rbtn pink big" data-act="repeat" aria-label="Послушать ещё раз">${ICON.sound}</button>
    </div>
    <div class="abadge" id="abadge"></div>
    ${heroHTML('happy', 'side')}
    <div class="panel board" id="task"></div>`);
  nextRound();
}
function advArea(a) {
  const b = $('#abadge'); if (b) b.innerHTML = `<span>${AREAS[a].e}</span>${AREAS[a].n}`;
  if (L.bgA !== a) { L.bgA = a; const bg = $('#advbg'); if (bg) bg.innerHTML = worldBG(AREAS[a].w || a, AREAS[a].bg); }
  if (!FAST) Sfx.music(a !== 'music' && S.set.music);       // слушать звуки удобнее без фоновой мелодии
}
function advNext() {
  const want = L.plan[L.rounds.length];
  for (const a of [want].concat(Skills.areas().filter(x => x !== want))) {
    try { return Skills.next(a, L.hist); } catch (e) { console.error('задание не собралось', a, e); }
  }
  return null;
}
function nextRound() {
  L.i++;
  if (L.adv && L.i >= L.rounds.length && L.rounds.length < L.total) { const nr = advNext(); if (nr) L.rounds.push(nr); }
  if (L.i >= L.rounds.length) return finishLevel();
  const r = L.r = L.rounds[L.i]; L.rm = 0; L.lock = false; L.pos = 0; L.sbusy = false; L.rt0 = Date.now();
  const task = $('#task');
  task.classList.toggle('g3', /^g3_/.test(r.skill || ''));     // задания 3 класса: мельче шрифт, больше текста
  if (L.adv) advArea(r.area);
  if (r.memo && !r.memoSeen) {          // задание на память: сначала показываем, что запомнить
    task.innerHTML = `<div class="stim demo col">${r.memo}</div><div class="bank"><button class="btn" data-act="memoGo">${ICON.play}<span>Запомнила!</span></button></div>`;
    task.classList.remove('in'); void task.offsetWidth; task.classList.add('in');
    Voice.say(r.memoSpeech || WT.memoShow);
    return;
  }
  let stim = '';
  if (r.kind !== 'demo' && r.stim) {
    const s = r.stim;
    if (s.emoji) stim += `<div class="pic ${s.small ? 'small' : ''}">${s.emoji}</div>`;
    if (s.ear) stim += `<button class="earbtn ${s.small ? 'small' : ''}" data-act="repeat" aria-label="Послушать">${ICON.sound}</button>`;
    if (s.listen) stim += `<button class="earbtn listen" data-act="listen" aria-label="Послушать ещё раз">${ICON.note}</button>`;
    if (s.html) stim += s.html;
    if (s.word) { const n = s.word.join('').length, room = s.emoji ? 2 : 0;
      stim += `<div class="word ${n + room > 9 ? 'xlong' : n + room > 7 ? 'long' : ''}">${wordHTML(s.word, s.blank)}</div>`; }
    if (s.phrase) stim += `<div class="word phrase">${wordHTML(s.phrase[0])}<span class="and"><i class="v">И</i></span>${wordHTML(s.phrase[1])}</div>`;
  }
  if (r.kind === 'choose') {
    const opts = `<div class="opts n${r.options.length} ${r.optsCls || ''}">${r.options.map((o, i) =>
      `<button class="card ${o.cls}" data-act="opt" data-i="${i}">${o.html || (/emoji|pair/.test(o.cls) ? o.t : lettersHTML(o.t))}</button>`).join('')}</div>`;
    task.innerHTML = r.side ? `<div class="stim side"><div class="sidel ${r.stim.col ? 'col' : ''}">${stim}</div>${opts}</div>` : `<div class="stim ${r.stim.col ? 'col' : ''}">${stim}</div>${opts}`;
  } else if (r.kind === 'assemble' && r.grid) {
    task.innerHTML = `<div class="stim gridwrap">${stim}<div class="tgrid c${r.cols}">${r.bank.map((t, i) => `<button class="card tile cell" data-act="tile" data-i="${i}">${t}</button>`).join('')}</div></div>`;
  } else if (r.kind === 'assemble') {
    task.innerHTML = `<div class="stim row">${stim}<div class="slots ${r.pcls} n${r.parts.length}" id="slots">${r.parts.map(() => '<span class="slot"></span>').join('')}</div></div>
      <div class="bank ${r.bank.length >= 5 ? "many" : ""}">${r.bank.map((t, i) => `<button class="card tile ${r.pcls}" data-act="tile" data-i="${i}">${r.raw ? t : lettersHTML(t)}</button>`).join('')}</div>`;
  } else if (r.kind === 'simon') {
    task.innerHTML = `<div class="stim col"><div class="bells" id="bells">${H_BELLS.map((b, i) => `<button class="bell" data-act="bell" data-i="${i}" style="--c:${b[1]}" aria-label="Колокольчик ${i + 1}">🔔</button>`).join('')}</div></div>`;
    L.sbusy = true;
  } else if (r.html) {
    task.innerHTML = `<div class="stim demo col">${r.html}</div>
      <div class="bank"><button class="btn" data-act="demoNext">${ICON.play}<span>Попробую!</span></button></div>`;
  } else {
    task.innerHTML = `<div class="stim demo"><div class="demo-row" id="demo"><span class="card tile static ${r.a.length > 1 ? 'syl' : 'letter'}">${lettersHTML(r.a)}</span><span class="plus">+</span><span class="card tile static ${r.b.length > 1 ? 'syl' : 'letter'}">${lettersHTML(r.b)}</span></div>
      <div class="word demo-res" id="demoRes">${wordHTML(r.res)}</div></div>
      <div class="bank"><button class="btn" data-act="demoNext">${ICON.play}<span>Попробую!</span></button></div>`;
    setTimeout(() => { const d = $('#demo'); if (d) d.classList.add('go'); }, FAST ? 0 : 1400);
  }
  task.classList.remove('in'); void task.offsetWidth; task.classList.add('in');
  Voice.say(r.speech, true, r.tts).then(() => { if (L && L.r === r && !L.lock && !L.rm) L.rt0 = Date.now(); roundSound(r); });
}
/* звук задания (Музыкальный зал) — после того как прозвучал вопрос */
function roundSound(r) {
  if (!L || L.r !== r) return;
  if (r.play) r.play();
  if (r.kind === 'simon') simonPlay();
}
async function simonPlay() {
  const run = L, r = L.r;
  L.sbusy = true; L.pos = 0;
  await sleep(FAST ? 10 : 450);
  for (const i of r.seq) {
    if (L !== run || L.r !== r) return;
    const b = $$('#bells .bell')[i]; if (!b) return;
    hBell(i); b.classList.add('lit'); await sleep(FAST ? 20 : 480); b.classList.remove('lit'); await sleep(FAST ? 10 : 200);
  }
  if (L === run && L.r === r) L.sbusy = false;
}
function gems() { $$('#gems i').forEach((g, i) => g.classList.toggle('on', i < L.done)); }

async function roundWon(el) {
  const run = L, r = L.r, first = L.rm === 0;
  L.lock = true; if (first) stat(r.key, true); L.done++; gems();
  if (L.adv) L.hist.push({ skill: r.skill, key: r.key, area: r.area, ok: first });
  if (L.adv || r.skill) Skills.record(r, first, Date.now() - (L.rt0 || Date.now()));
  Sfx.ok(); heroMood('cheer'); burst(el);
  const parts = (first && Math.random() < 0.35 ? [pick(PRAISE)] : []).concat(r.after || []);
  const t = Date.now();
  await Voice.say(parts);
  if (!FAST) await sleep(Math.max(0, 1000 - (Date.now() - t)));
  if (L !== run || scr !== 'level' || L.r !== r) return;
  heroMood('happy'); nextRound();
}
function roundMiss(el) {
  L.rm++; L.mistakes++; stat(L.r.key, false);
  Sfx.bad(); heroMood('think');
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  if (L.rm === 1) Voice.say(pick(RETRY)); else Voice.say(L.r.speech, true, L.r.tts);
}
function finishAdventure() {
  const area = L.area, from = L.from, hist = L.hist;
  const stars = L.mistakes <= 2 ? 3 : L.mistakes <= 5 ? 2 : 1;
  addTime(Date.now() - L.t0);
  let bonus = 0;
  if (!area) {                                   // большое приключение: подарок дня и дни подряд
    const td = today(), y = new Date(Date.now() - 864e5), yd = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    if (S.adv.d !== td) { S.adv.streak = S.adv.d === yd ? S.adv.streak + 1 : 1; S.adv.d = td; S.adv.n = 0; bonus = 2 + Math.min(3, S.adv.streak - 1); }
    S.adv.n++;
  }
  S.wallet += stars + bonus; save();
  const per = {};
  hist.forEach(h => { const p = per[h.area] || (per[h.area] = { ok: 0, n: 0 }); p.n++; if (h.ok) p.ok++; });
  L = null;
  show('result', `${softBG('lav')}
    <div class="panel result">
      <h2>${area ? 'Тренировка пройдена!' : 'Приключение пройдено!'}</h2>
      <div class="bigstars">${[1, 2, 3].map(k => `<span class="${stars >= k ? 'on' : ''}" style="animation-delay:${k * 0.25}s">${starSVG(stars >= k)}</span>`).join('')}</div>
      <p class="gain">+${stars + bonus} ${starSVG(true)} в копилку${bonus ? ` <small>(подарок дня +${bonus})</small>` : ''}</p>
      ${bonus ? '<img class="chest" src="img/ui/chest.webp" alt="">' : ''}
      <div class="advsum">${Object.keys(per).map(a => `<span>${AREAS[a].e}<b>${per[a].ok} из ${per[a].n}</b></span>`).join('')}</div>
      ${!area && S.adv.streak > 1 ? `<p class="streak">🔥 Дней подряд: ${S.adv.streak}</p>` : ''}
      <div class="rbtns">
        <button class="rbtn" data-act="advAgain" data-a="${area}" data-from="${from}" aria-label="Ещё раз">${ICON.again}</button>
        <button class="btn" data-act="advDone" data-from="${from}">${ICON.play}<span>Дальше</span></button>
      </div>
    </div>
    ${heroHTML('cheer', 'big')}`);
  Sfx.win(); setTimeout(() => { burst($('.bigstars'), 30); FX.confetti(140); }, 500);
  Voice.say(bonus ? [ST.advWin, ST.daily] : [ST.advWin]);
}
function finishLevel() {
  if (L.adv) return finishAdventure();
  const n = L.n, stars = L.mistakes <= 1 ? 3 : L.mistakes <= 4 ? 2 : 1;
  addTime(Date.now() - L.t0);
  S.stars[sk(n)] = Math.max(S.stars[sk(n)] || 0, stars); S.wallet += stars; save();
  const pending = WORLDS[W].ends.includes(n) && !S.seen[storyKey(n)];
  L = null;
  show('result', `${softBG('lav')}
    <div class="panel result">
      <h2>Уровень пройден!</h2>
      <div class="bigstars">${[1, 2, 3].map(k => `<span class="${stars >= k ? 'on' : ''}" style="animation-delay:${k * 0.25}s">${starSVG(stars >= k)}</span>`).join('')}</div>
      <p class="gain">+${stars} ${starSVG(true)} в копилку</p>
      <div class="rbtns">
        <button class="rbtn" data-act="level" data-n="${n}" aria-label="Ещё раз">${ICON.again}</button>
        <button class="btn" data-act="afterLevel" data-n="${n}" data-story="${pending ? 1 : ''}">${ICON.play}<span>${pending ? 'Сюрприз!' : 'Дальше'}</span></button>
      </div>
    </div>
    ${heroHTML('cheer', 'big')}`);
  Sfx.win(); setTimeout(() => { burst($('.bigstars'), 30); FX.confetti(140); }, 500);
  Voice.say(T.win);
}

/* ---------- для родителей ---------- */
let gate = null, pTab = 'progress';
/* Вход для взрослых. Дошкольнику хватает примера на умножение. Третьеклассница его решит,
   поэтому в 3 классе — ПИН-код, который взрослые придумывают сами; забыли — длинный пример. */
function gateScreen(mode) {
  const g3 = S.grade === 3;
  mode = mode || (!g3 ? 'math' : S.set.pin ? 'pin' : 'new');
  let q, ans = '';
  if (mode === 'math' || mode === 'hard') {
    const hard = mode === 'hard', a = hard ? 23 + Math.floor(Math.random() * 60) : 6 + Math.floor(Math.random() * 4), b = hard ? 13 + Math.floor(Math.random() * 7) : 6 + Math.floor(Math.random() * 4);
    q = `Сколько будет ${a} × ${b}?`; ans = String(a * b);
  } else if (mode === 'pin') q = 'Введите ПИН-код для взрослых';
  else if (mode === 'new') q = 'Придумайте ПИН-код из 4 цифр.<br><small>Его будут знать только взрослые: он закрывает настройки от ребёнка.</small>';
  else q = 'Повторите ПИН-код';
  gate = { mode, ans, val: '', first: gate && gate.mode === 'new' ? gate.val : '' };
  modal.className = 'open';
  modal.innerHTML = `<div class="panel gate"><h2>Для взрослых</h2><p>${q}</p>
    <div class="g-val" id="gval">&nbsp;</div>
    <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button data-act="gk" data-d="${d}">${d}</button>`).join('')}</div>
    <div class="g-row">${mode === 'pin' ? '<button class="chip" data-act="gforgot">Забыли ПИН?</button>' : ''}<button class="chip" data-act="closeModal">Закрыть</button></div></div>`;
}
function parents() {
  Sfx.music(false);
  const done = Object.keys(S.stars).length;
  let body = '';
  if (pTab === 'games') {
    body = `<p class="note">Все игры, сохранённые на вашем сервере. Эту вкладку видит только владелец.</p><div id="glist"><p class="note">Загружаю…</p></div>`;
  } else if (pTab === 'skills') {
    const rep = Skills.report(), pct = x => Math.round(x * 100);
    const ago = t => { if (!t) return 'ещё не было'; const d = (Date.now() - t) / 864e5; return d < 1 ? 'сегодня' : d < 2 ? 'вчера' : Math.floor(d) + ' дн. назад'; };
    const all = rep.flatMap(a => a.skills.map(s => Object.assign({ an: a.n }, s)));
    const weak = all.filter(s => s.cnt >= 3).sort((x, y) => (x.m + (x.acc == null ? 1 : x.acc)) - (y.m + (y.acc == null ? 1 : y.acc))).slice(0, 4);
    body = `<p class="note">«Приключение» подбирает задания по ходу игры: чаще даёт то, что пока трудно, и поднимает сложность, когда получается легко. Ступень — уровень сложности навыка.</p>
      <div class="kpis"><div><b>${S.adv.streak || 0}</b><small>дней подряд</small></div><div><b>${all.reduce((x, s) => x + s.cnt, 0)}</b><small>заданий в тренажёре</small></div><div><b>${pct(rep.reduce((x, a) => x + a.m, 0) / rep.length)}%</b><small>общий уровень</small></div></div>
      ${weak.length ? `<h3>Над чем поработать</h3><div class="hard">${weak.map(s => `<span>${s.n} <small>${s.an} · ступень ${s.tier} из ${s.tiers}${s.acc != null ? ' · верно ' + pct(s.acc) + '%' : ''}</small></span>`).join('')}</div>` : ''}
      ${rep.map(a => `<h3>${a.e} ${a.n} <small class="am">${pct(a.m)}%</small></h3><div class="sklist">${a.skills.map(s => `<div class="skrow"><span class="skn">${s.n}</span><span class="bar"><i style="width:${Math.max(4, pct(s.m))}%"></i></span><span class="skd">ступень ${s.tier} из ${s.tiers}${s.cnt ? ' · решено ' + s.cnt + (s.acc != null ? ' · верно ' + pct(s.acc) + '%' : '') : ''} · ${ago(s.t)}</span></div>`).join('')}</div>`).join('')}`;
  } else if (pTab === 'progress') {
    const hard = Object.entries(S.stats).filter(([, v]) => v.bad > 0).sort((a, b) => (b[1].bad - b[1].ok * 0.3) - (a[1].bad - a[1].ok * 0.3)).slice(0, 12);
    const kind = { f: 'первый звук', s: 'слог', p: 'первый слог', b: 'собрать', sp: 'по буквам', r: 'чтение', m: 'буква', pr: 'пара слов',
      e: 'мир вокруг', c: 'счёт', hn: 'число на слух', pg: 'количество', cmp: 'больше-меньше', nx: 'следующее число', pv: 'предыдущее число', mr: 'числовой ряд', sg: 'знак', a: 'сложение', h: 'состав числа', t: 'задача' };
    const allLv = Object.keys(WORLDS).reduce((a, w) => a + WORLDS[w].levels.length, 0);
    dayCheck();
    body = `<div class="kpis"><div><b>${done}</b> из ${allLv}<small>уровней пройдено</small></div><div><b>${totalStars()}</b> из ${allLv * 3}<small>звёзд собрано</small></div><div><b>${Math.round(S.day.ms / 60000)}</b> мин<small>сегодня в игре</small></div></div>
      <h3>Что пока даётся труднее</h3>
      ${hard.length ? `<div class="hard">${hard.map(([k, v]) => { const [t, w] = k.split(':'); return `<span>${esc(w.toUpperCase())} <small>${t === 's' && /\d/.test(w) ? 'вычитание' : kind[t] || ''} · ошибок ${v.bad}</small></span>`; }).join('')}</div><p class="note">Игра сама чаще возвращает эти задания. Можно и вместе потренироваться вслух.</p>` : '<p class="note">Пока ошибок нет или игра ещё не начата.</p>'}
      ${Object.keys(WORLDS).map(w => `<h3>${WORLDS[w].name}</h3><div class="lvlist">${WORLDS[w].levels.map((lv, i) => `<span class="${S.stars[sk(i + 1, w)] ? 'ok' : ''}">${i + 1}. ${lv.title} ${'★'.repeat(S.stars[sk(i + 1, w)] || 0)}</span>`).join('')}</div>`).join('')}`;
  } else if (pTab === 'settings') {
    const vs = Voice.voices();
    body = `<label>Имя принцессы <input id="pname" maxlength="14" value="${esc(S.name)}"></label>
      <label>Сколько играть подряд <select id="plimit">${[[10, '10 минут'], [15, '15 минут'], [20, '20 минут'], [30, '30 минут'], [0, 'без ограничения']].map(([v, n]) => `<option value="${v}" ${S.set.limit === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Перерыв после игры <select id="ppause">${[[30, '30 минут'], [60, '1 час'], [120, '2 часа'], [180, '3 часа']].map(([v, n]) => `<option value="${v}" ${(S.set.pause || 60) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${S.grade === 3 ? `<label>ПИН для взрослых <button class="chip" data-act="pinReset">${S.set.pin ? 'Сбросить — придумать новый' : 'Не задан — спросим при входе'}</button></label>` : ''}
      <label>Класс <select id="pgrade"><option value="0" ${S.grade === 3 ? '' : 'selected'}>дошкольник</option><option value="3" ${S.grade === 3 ? 'selected' : ''}>3 класс</option></select></label>
      ${Sync.isOwner ? `<label>Особая принцесса <select id="pspecial"><option value="0" ${S.set.special ? '' : 'selected'}>скрыта</option>${HERO_LOOKS.map((l, i) => l.special && l.ready !== false ? `<option value="${i}" ${+S.set.special === i ? 'selected' : ''}>${i === 4 ? 'первая (как дочка)' : 'вторая (как племянница)'} — в этой игре</option>` : '').join('')}</select></label>` : ''}
      <label>Музыка <select id="pmusic"><option value="1" ${S.set.music ? 'selected' : ''}>включена</option><option value="0" ${S.set.music ? '' : 'selected'}>выключена</option></select></label>
      <label>Скорость речи <input id="prate" type="range" min="0.6" max="1.1" step="0.05" value="${S.set.rate}"></label>
      <label>Голос планшета <select id="pvoice">${vs.length ? vs.map(v => `<option ${v.name === S.set.voiceName ? 'selected' : ''}>${esc(v.name)}</option>`).join('') : '<option value="">русский голос не найден</option>'}</select></label>
      ${vs.length ? '' : '<p class="note warn">На этом устройстве нет русского голоса. Установите его: Настройки Android → Специальные возможности → Синтез речи → языковой пакет «Русский». Или запишите фразы своим голосом на вкладке «Голос».</p>'}
      <div class="prow"><button class="chip on" data-act="pTest">Проверить голос</button><button class="chip" data-act="pExtra">Ещё 10 минут сейчас</button><button class="chip" data-act="pHero">Изменить принцессу</button><button class="chip danger" data-act="pReset">Сбросить прогресс</button></div>
      <h3>Одна игра на всех устройствах</h3>
      <p class="note">Код игры — это имя принцессы и волшебное слово через пробел, например «маша радуга». По нему игра открывается на любом устройстве. Другой код — другая игра со своим прогрессом. Кто знает код, тот может открыть игру.</p>
      <label>Код игры <input id="psync" maxlength="40" placeholder="от 6 символов, например роза-луна-2026" value="${esc(Sync.code)}" autocomplete="off"></label>
      <p class="note" id="syncst">${esc(Sync.status)}</p>
      <div class="prow"><button class="chip on" data-act="pSync">${Sync.code ? 'Синхронизировать сейчас' : 'Подключить'}</button>${Sync.code ? '<button class="chip" data-act="pUnsync">Отключить это устройство</button>' : ''}</div>`;
  } else {
    const groups = allPhrases(), total = groups.reduce((a, g) => a + g.items.length, 0);
    if (!Sync.code || !Sync.isOwner) {
      body = `<div class="ttsbox"><h3>Озвучка</h3>${!Sync.code
        ? '<p class="note">Озвучка хранится на сервере. Чтобы управлять ею, сначала сохраните игру: вкладка «Настройки» → код игры.</p>'
        : `<p class="note" id="ownnote">Проверяю…</p><div class="prow" id="ownui"></div><p class="note warn" id="ownmsg"></p>`}</div>`;
    } else
    body = `<div class="ttsbox"><h3>Автоматическая озвучка</h3>
      ${!Sync.code ? '<p class="note">Сначала подключите код синхронизации на вкладке «Настройки»: озвученные фразы хранятся на сервере и раздаются всем устройствам.</p>'
      : `<p class="note">Фразы озвучит Yandex SpeechKit и разошлёт на все устройства. Озвучка общая для всех кодов. Ваши собственные записи останутся и будут главнее.</p>
        <div id="ttsui" class="prow">${TTS.busy ? '' : '<span class="note">Проверяю…</span>'}</div><p class="note" id="ttsmsg">${esc(TTS.msg)}</p>`}</div>
      <p class="note">${Voice.canRecord() ? `Запишите фразы своим голосом — игра будет говорить ими вместо синтезатора. Записано <b id="rcount">${Voice.count()}</b> из ${total}. Начните с «Заданий» и «Слогов»: слоги синтезатор произносит хуже всего.` : 'Запись недоступна: откройте игру по адресу с https и разрешите доступ к микрофону.'}</p>
      ${groups.map(g => `<h3>${g.g}</h3><div class="phr">${g.items.map(t => `<div class="ph ${Voice.has(t) ? 'has' : ''} ${t.length > 34 ? 'long' : ''}" data-t="${esc(t)}"><span>${esc(t)}</span>
        <button data-act="rRec" aria-label="Записать">●</button><button data-act="rPlay" aria-label="Послушать">▶</button><button data-act="rDel" aria-label="Удалить запись">✕</button></div>`).join('')}</div>`).join('')}`;
  }
  show('parents', `<div class="pwrap"><div class="ptop"><button class="chip" data-act="pClose">← В игру</button>
    ${[['progress', 'Успехи'], ['skills', 'Навыки'], ['settings', 'Настройки'], ['voice', 'Голос']].concat(Sync.isOwner && Sync.code ? [['games', 'Игры']] : []).map(([id, n]) => `<button class="chip ${pTab === id ? 'on' : ''}" data-act="ptab" data-id="${id}">${n}</button>`).join('')}</div>
    <div class="pbody">${body}<p class="note ver">Версия игры: ${APP_VER}</p></div></div>`);
  if (pTab === 'voice') { ttsUI(); if (!TTS.busy) ttsCheck(); }
  if (pTab === 'games') gamesLoad();
}
function readSettings() {
  const g = id => $('#' + id);
  if (!g('plimit')) return;
  S.name = g('pname').value.trim(); S.set.limit = +g('plimit').value; S.set.pause = +g('ppause').value; S.set.music = g('pmusic').value === '1';
  if (g('pspecial')) S.set.special = +g('pspecial').value;
  if (g('pgrade')) { S.grade = +g('pgrade').value; gradeSync(); }
  S.set.rate = +g('prate').value; S.set.voiceName = g('pvoice').value || '';
  Voice.set({ rate: S.set.rate, voiceName: S.set.voiceName }); save();
}
let recBusy = null;

/* ---------- список игр (только для владельца) ---------- */
async function gamesLoad() {
  const box = $('#glist'); if (!box) return;
  let r;
  try { r = await Sync.req('games'); } catch (e) { box.innerHTML = `<p class="note warn">Не получилось загрузить список: ${esc(e.message)}</p>`; return; }
  if (!$('#glist')) return;
  const all = Object.keys(WORLDS).reduce((a, w) => a + WORLDS[w].levels.length, 0);
  const when = ts => ts ? new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const list = (r.games || []).sort((a, b) => (b.me - a.me) || (b.ts - a.ts));
  box.innerHTML = list.length ? list.map(g => `<div class="grow2 ${g.blocked ? 'off' : ''}" data-id="${g.id}" data-n="${esc(g.name || 'без имени')}">
      <div class="gi"><b>${esc(g.name || 'без имени')}</b>${g.me ? '<i class="gme">эта игра</i>' : ''}${g.blocked ? '<i class="goff">отключена</i>' : ''}
        <small>${g.code ? 'код: ' + esc(g.code) : 'код появится после следующего сохранения'} · звёзд ${g.stars} · уровней ${g.levels} из ${all} · ${when(g.ts)}</small></div>
      <button class="chip" data-act="gReset">Обнулить</button><button class="chip" data-act="gBlock" data-on="${g.blocked ? 0 : 1}">${g.blocked ? 'Включить' : 'Отключить'}</button><button class="chip danger" data-act="gDel">Удалить</button>
    </div>`).join('') + `<p class="note">«Обнулить» — стереть звёзды и покупки, имя и внешность останутся. «Отключить» — игра перестанет сохраняться на сервере и открываться на других устройствах, пока не включите. «Удалить» — убрать совсем: устройство с этой игрой вернётся на экран создания принцессы.</p>`
    : '<p class="note">Сохранённых игр пока нет.</p>';
}
async function gameAct(el, a, extra, ask) {
  const row = el.closest('.grow2');
  if (ask && !confirm(ask.replace('%', row.dataset.n))) return;
  try { await Sync.req(a, null, {}, '&id=' + row.dataset.id + (extra || '')); } catch (e) { alert('Не получилось: ' + e.message); }
  gamesLoad();
}

/* ---------- автоматическая озвучка (Yandex SpeechKit через api.php) ---------- */
const TTS = { has: null, busy: false, stop: false, msg: '', voice: 'marina', gen: {} };
try { TTS.voice = localStorage.getItem('kingdom.ttsvoice') || 'marina'; } catch (e) {}
const TTS_VOICES = [['marina', 'Марина — дружелюбная'], ['jane', 'Джейн — радостная'], ['omazh', 'Омаж'], ['zahar', 'Захар — мужской'], ['ermil', 'Ермил — мужской'], ['filipp', 'Филипп — мужской']];
const ttsAll = () => [...new Set(allPhrases().flatMap(g => g.items))];
/* что озвучивать: redo=false — всё, у чего нет никакой записи; redo=true — всё, что уже озвучено автоматически */
const TTS_SYL = new Set(SYL.all.map(s => s.toLowerCase()));
/* Слог отправляем со знаком ударения («п+о»), иначе синтезатор читает его как предлог («па») или по буквам */
const ttsText = t => TTS_SYL.has(t) ? t[0] + '+' + t.slice(1) : t;
/* что озвучивать: false — всё, у чего нет никакой записи; true — всё автоматическое; 'syl' — только автоматические слоги */
const ttsTodo = redo => ttsAll().filter(t => { const k = t.trim().toLowerCase(); return redo === 'syl' ? TTS.gen[k] && TTS_SYL.has(k) : redo ? TTS.gen[k] : !Voice.has(t); });
function ttsUI() {
  const box = $('#ttsui'), msg = $('#ttsmsg');
  if (msg) msg.textContent = TTS.msg;
  if (!box) return;
  if (TTS.busy) { box.innerHTML = '<button class="chip danger" data-act="ttsStop">Остановить</button>'; return; }
  if (TTS.has === null) { box.innerHTML = '<span class="note">Проверяю…</span>'; return; }
  if (!TTS.has) {
    box.innerHTML = '<input id="ttskey" placeholder="API-ключ Yandex Cloud (начинается с AQVN…)" autocomplete="off" spellcheck="false"><button class="chip on" data-act="ttsKey">Сохранить ключ</button>';
    return;
  }
  const n = ttsTodo(false).length, g = Object.keys(TTS.gen).length;
  box.innerHTML = `<select id="ttsvoice" onchange="ACT.ttsVoice(this)">${TTS_VOICES.map(([id, nm]) => `<option value="${id}" ${id === TTS.voice ? 'selected' : ''}>${nm}</option>`).join('')}</select>
    <button class="chip on" data-act="ttsRun">${n ? 'Озвучить всё, что не записано: ' + n : 'Всё озвучено'}</button>
    ${g ? `<button class="chip" data-act="ttsRedo">Переозвучить автоматические: ${g}</button>` : ''}${ttsTodo('syl').length ? `<button class="chip" data-act="ttsSyl">Переозвучить слоги: ${ttsTodo('syl').length}</button>` : ''}<button class="chip" data-act="ttsKeyDel">Удалить ключ</button>`;
}
async function ttsCheck() {
  if (!Sync.code) return;
  try {
    const r = await Sync.peek(Sync.code);
    TTS.has = !!r.tts; TTS.gen = {};
    const on = $('#ownnote'), ou = $('#ownui');
    if (on && ou) {                // это устройство ещё не подтвердило, что оно владельца
      on.textContent = r.owner
        ? 'Озвучка в игре общая для всех, кто играет по этой ссылке, поэтому менять её может только владелец игры. Если это вы — введите пароль владельца.'
        : 'Озвучка в игре общая для всех, кто играет по этой ссылке. Придумайте пароль владельца — тогда менять озвучку и тратить ключ Яндекса сможете только вы.';
      ou.innerHTML = `<input id="ownpass" type="password" placeholder="${r.owner ? 'Пароль владельца' : 'Придумайте пароль (от 4 символов)'}" autocomplete="off"><button class="chip on" data-act="ownerSet">${r.owner ? 'Войти' : 'Сохранить пароль'}</button>`;
    }
    Object.keys(r.voice || {}).forEach(k => { if (r.voice[k].gen || /^audio\/mpeg/.test(r.voice[k].type || '')) TTS.gen[k] = 1; });
  } catch (e) { TTS.msg = 'Нет связи с сервером: ' + e.message; }
  ttsUI();
  $$('.ph').forEach(row => row.classList.toggle('auto', !!TTS.gen[row.dataset.t.trim().toLowerCase()]));
}
async function ttsRun(redo) {
  if (TTS.busy) return;
  const list = ttsTodo(redo);
  if (!list.length) { TTS.msg = 'Озвучивать нечего: у всех фраз уже есть запись.'; ttsUI(); return; }
  TTS.busy = true; TTS.stop = false; ttsUI();
  let done = 0, fail = '';
  for (const t of list) {
    if (TTS.stop) break;
    TTS.msg = `Озвучиваю ${done + 1} из ${list.length}: «${t.length > 40 ? t.slice(0, 40) + '…' : t}»`; ttsUI();
    try { await Sync.req('tts', t.trim().toLowerCase(), { text: ttsText(t), voice: TTS.voice, redo: !!redo }); done++; }
    catch (e) { fail = e.message; break; }
  }
  TTS.msg = (fail ? `Остановилось на фразе ${done + 1} из ${list.length}. ${fail}` : TTS.stop ? `Остановлено. Озвучено ${done} из ${list.length}.` : `Готово: озвучено ${done}.`) + (done ? ' Загружаю на это устройство…' : '');
  ttsUI();
  if (done) { await Sync.run(); TTS.msg = TTS.msg.replace(' Загружаю на это устройство…', ' Фразы загружены.'); }
  TTS.busy = false;
  if (scr === 'parents' && pTab === 'voice') { parents(); } else ttsUI();
}
/* Подключение устройства к общему сохранению. create — можно ли завести новый код. */
/* Новый код, а на устройстве уже есть игра: сохранить её под этим кодом или начать с нуля */
function askNewCode(code) {
  return new Promise(res => {
    askNewCode.res = v => { modal.innerHTML = ''; modal.className = ''; askNewCode.res = null; res(v); };
    modal.className = 'open';
    modal.innerHTML = `<div class="panel gate newcode"><h2>Новый код</h2>
      <p>По коду «${esc(code)}» ещё нет игры. Что сделать?</p>
      ${Sync.code
        ? '<button class="chip on" data-act="ncNew">Начать новую игру с нуля</button><button class="chip" data-act="ncKeep">Сохранить под этим кодом текущую игру</button>'
        : '<button class="chip on" data-act="ncKeep">Сохранить под этим кодом текущую игру</button><button class="chip" data-act="ncNew">Начать новую игру с нуля</button>'}
      ${Sync.code ? '<p class="note">Текущая игра останется под прежним кодом «' + esc(Sync.code) + '».</p>' : '<p class="note warn">Текущая игра пока нигде не сохранена. Если начать с нуля, она пропадёт.</p>'}
      <button class="chip" data-act="ncCancel">Отмена</button></div>`;
  });
}
async function linkDevice(code, create) {
  let r;
  try { r = await Sync.peek(code); } catch (e) { alert('Не получилось связаться с сервером. Проверьте интернет и что файл api.php загружен на сайт.\n\n' + e.message); return false; }
  try {
    if (r.state) {
      const stars = Object.values(r.state.stars || {}).reduce((a, b) => a + b, 0);
      if (!confirm('По этому коду уже есть игра: принцесса ' + (r.state.name || 'без имени') + ', звёзд — ' + stars + '.\n\nОткрыть её на этом устройстве?' + (Sync.code ? '' : ' Игра, которая сейчас здесь, нигде не сохранена и заменится.'))) return false;
      await Sync.link(code, 'pull');
    } else {
      if (!create) { alert('По этому коду сохранений нет. Проверьте код или создайте принцессу здесь и подключите код в разделе «Для родителей».'); return false; }
      const has = Object.keys(S.stars).length > 0;
      const how = has ? await askNewCode(code) : 'keep';      // на устройстве уже есть прогресс — спросим, что с ним делать
      if (!how) return false;
      if (how === 'new') { S = Object.assign(DEF(), { set: S.set }); S.ts = Date.now(); store(); }
      await Sync.link(code, 'push');
      if (how === 'new') { title(); Voice.say(T.create); }
    }
  } catch (e) { alert('Не получилось синхронизировать: ' + e.message); return false; }
  return true;
}

/* ---------- действия ---------- */
const ACT = {
  start() { Sfx.unlock(); if (restNeeded()) return rest(); Voice.say(T.hello); map(); },
  title() { title(); },
  map() { if (restNeeded()) return rest(); map(); },
  world(el) {
    if (el && el.dataset.w) W = el.dataset.w;
    const intro = (WORLDS[W].sp != null ? WORLDS[W].sp : WORLDS[W].pre) + 'intro';
    if (W !== 'castle' && !S.seen[intro]) return story(intro, world);
    world();
  },
  soon(el) { Sfx.bad(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); Voice.say(T.soon); },
  wardrobe() { wardrobe(); },
  wtab(el) { wTab = el.dataset.id; wardrobe(); },
  wear(el) {
    const id = el.dataset.id, src = { dress: DRESS, crown: CROWN, acc: ACC, pet: PET }[wTab], it = src[id];
    if (!S.owned.includes(id)) {
      if (wTab === 'pet') { Sfx.bad(); el.classList.add('shake'); return; }
      if (S.wallet < it.p) { Sfx.bad(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); Voice.say(T.needStars); return; }
      S.wallet -= it.p; S.owned.push(id); Sfx.buy(); Voice.say(T.bought);
    } else Sfx.place();
    S.wear[wTab] = id; save(); wardrobe(); burst($('#hero'), 16);
  },
  cr(el) { S.hero[el.dataset.p] = +el.dataset.v; const nm = $('#nm'); if (nm) S.name = nm.value.trim(); const mw = $('#mw'); if (mw) crWord = mw.value.trim(); Sfx.tap(); creator(!S.created); },
  crg(el) { S.grade = +el.dataset.v; gradeSync(); const nm = $('#nm'); if (nm) S.name = nm.value.trim(); const mw = $('#mw'); if (mw) crWord = mw.value.trim(); Sfx.tap(); creator(!S.created); },
  async crDone(el) {
    const name = $('#nm').value.trim(), first = !S.created, mw = $('#mw');
    Sfx.unlock();
    if (mw) {                                   // первая игра на устройстве: имя + волшебное слово создают или открывают игру
      const word = mw.value.trim(); crWord = word;
      if (!name) { alert('Напишите имя принцессы.'); return; }
      if (word.length < 4) { alert('Придумайте волшебное слово — не короче 4 букв. Например: радуга.'); return; }
      const code = heroCode(name, word);
      if (el) el.disabled = true;
      let r = null;
      try { r = await Sync.peek(code); } catch (e) { /* нет связи — играем на устройстве, сохранится позже */ }
      if (r && r.state) {
        if (el) el.disabled = false;
        if (!confirm('Принцесса «' + name + '» с таким волшебным словом уже есть.\n\nОК — открыть её игру на этом устройстве.\nОтмена — придумать другое слово.')) return;
        try { await Sync.link(code, 'pull'); } catch (e) { alert('Не получилось открыть игру: ' + e.message); return; }
        crWord = ''; Sfx.star(); title(); return;
      }
      S.name = name; S.created = true; S.ts = Date.now(); store(); crWord = '';
      Sync.link(code, 'push').catch(() => {});
      Sfx.star(); title(); return;
    }
    S.name = name; S.created = true; save(); Sfx.star(); first ? title() : parents();
  },
  storyNext() { const f = story.then; story.then = null; if (f) f(); },
  level(el) {
    const n = +el.dataset.n;
    if (!unlocked(n)) { Sfx.bad(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
    startLevel(n);
  },
  afterLevel(el) {
    const n = +el.dataset.n, go = () => restNeeded() ? rest() : world();
    if (el.dataset.story) story(storyKey(n), go); else go();
  },
  quit() {
    const from = L && L.adv ? L.from : 'world';
    if (L) { addTime(Date.now() - L.t0); L = null; }
    if (from === 'map') map(); else world();
  },
  adv() { startAdventure('', 'map'); },
  train() { startAdventure(AREA_OF_WORLD[W], 'world'); },
  advAgain(el) { startAdventure(el.dataset.a || '', el.dataset.from); },
  advDone(el) { if (restNeeded()) return rest(); if (el.dataset.from === 'world') world(); else map(); },
  repeat() { if (L && L.r && !L.sbusy) { const r = L.r; Sfx.tap(); Voice.say(r.speech, true, r.tts).then(() => roundSound(r)); } },
  listen() { if (L && L.r && L.r.play) L.r.play(); },
  memoGo() { if (L && L.r) { Sfx.place(); L.r.memoSeen = true; L.i--; nextRound(); } },
  bell(el) {
    if (!L || L.lock || L.sbusy || L.r.kind !== 'simon') return;
    const i = +el.dataset.i, r = L.r;
    hBell(i); el.classList.remove('lit'); void el.offsetWidth; el.classList.add('lit'); setTimeout(() => el.classList.remove('lit'), 300);
    if (i === r.seq[L.pos]) { L.pos++; if (L.pos >= r.seq.length) roundWon($('#bells')); }
    else { roundMiss(el); L.sbusy = true; setTimeout(() => { if (L && L.r === r) simonPlay(); }, FAST ? 10 : 1300); }
  },
  demoNext() { if (L) { Sfx.place(); Voice.say(T.trySelf); nextRound(); } },
  opt(el) {
    if (!L || L.lock || el.classList.contains('out')) return;
    const o = L.r.options[+el.dataset.i];
    if (o.ok) {
      el.classList.add('right'); $$('#task .card').forEach(c => c !== el && c.classList.add('dim'));
      const b = $('#blank'); if (b && L.r.fill) { if (L.r.fillHtml && o.html) { b.innerHTML = o.fillAs != null ? o.fillAs : o.html; b.className = 'filled'; } else { b.textContent = o.t; b.className = (isVowel(o.t) ? 'v' : 'c') + ' filled'; } }
      roundWon(el);
    } else { roundMiss(el); el.classList.add('out'); }
  },
  tile(el) {
    if (!L || L.lock || el.classList.contains('used') || el.classList.contains('done')) return;
    const r = L.r, t = r.bank[+el.dataset.i], want = () => r.anyOrder ? r.parts[0] : r.parts[L.pos];
    if (t === want()) {
      if (r.grid) {                      // сетка: нажимать по порядку или найти все
        el.classList.add('done'); L.pos++; L.rm2 = 0; $$('#task .glow').forEach(g => g.classList.remove('glow'));
        if (L.pos >= r.parts.length) { $$('#task .tile:not(.done)').forEach(c => c.classList.add('dim')); roundWon(el); } else Sfx.place();
        return;
      }
      const slot = $$('#slots .slot')[L.pos];
      slot.innerHTML = r.raw ? t : lettersHTML(t); slot.classList.add('full');
      el.classList.add('used'); $$('#task .glow').forEach(g => g.classList.remove('glow'));
      L.pos++; L.rm2 = 0;
      if (L.pos >= r.parts.length) { $('#slots').classList.add('joined'); $$('#task .tile').forEach(c => c.classList.add('dim')); roundWon($('#slots')); }
      else Sfx.place();
    } else {
      roundMiss(el);
      L.rm2 = (L.rm2 || 0) + 1;
      if (L.rm2 >= 2) { const g = $$('#task .tile').find(c => !c.classList.contains('used') && !c.classList.contains('done') && r.bank[+c.dataset.i] === want()); if (g) g.classList.add('glow'); }
    }
  },
  gate() { gateScreen(); },
  closeModal() { modal.innerHTML = ''; modal.className = ''; },
  gReset(el) { gameAct(el, 'greset', '', 'Обнулить прогресс игры «%»? Звёзды и покупки пропадут, имя и внешность останутся.'); },
  gBlock(el) { gameAct(el, 'gblock', '&on=' + el.dataset.on, el.dataset.on === '1' ? 'Отключить игру «%»? Она перестанет сохраняться на сервере, пока вы её не включите.' : ''); },
  gDel(el) { gameAct(el, 'gdel', '', 'Удалить игру «%» совсем? Вернуть её будет нельзя.'); },
  ncNew() { if (askNewCode.res) askNewCode.res('new'); },
  ncKeep() { if (askNewCode.res) askNewCode.res('keep'); },
  ncCancel() { if (askNewCode.res) askNewCode.res(null); },
  gk(el) {
    const pinish = gate.mode === 'pin' || gate.mode === 'new' || gate.mode === 'again';
    gate.val += el.dataset.d; $('#gval').textContent = pinish ? '•'.repeat(gate.val.length) : gate.val;
    const need = pinish ? 4 : gate.ans.length;
    if (gate.val.length < need) return;
    const open = () => { pTab = 'progress'; parents(); };
    const wrong = () => { Sfx.bad(); gate.val = ''; setTimeout(() => { const g = $('#gval'); if (g) g.innerHTML = '&nbsp;'; }, 400); };
    if (gate.mode === 'new') return gateScreen('again');
    if (gate.mode === 'again') { if (gate.val === gate.first) { S.set.pin = gate.val; save(); return open(); } Sfx.bad(); gate = null; return gateScreen('new'); }
    if (gate.mode === 'pin') return gate.val === S.set.pin ? open() : wrong();
    if (gate.val === gate.ans) { if (gate.mode === 'hard') S.set.pin = ''; return open(); }   // забыли ПИН: решили пример — ПИН сброшен, придумаете новый
    wrong();
  },
  gforgot() { gateScreen('hard'); },
  pinReset() { S.set.pin = ''; save(); Sfx.tap(); parents(); },
  ptab(el) { readSettings(); pTab = el.dataset.id; parents(); },
  pClose() { readSettings(); title(); },
  pTest() { readSettings(); Voice.say(['Найди слог', 'ма'], true); },
  async pSync() {
    readSettings();
    const code = $('#psync').value.trim();
    if (code.length < 6) { alert('Код должен быть не короче 6 символов.'); return; }
    if (code === Sync.code) { $('#syncst').textContent = 'Синхронизирую, сверяю всю озвучку с сервером…'; await Sync.resync(); if (scr === 'parents') parents(); return; }
    await linkDevice(code, true);
    if (scr === 'parents') parents();
  },
  pUnsync() { readSettings(); Sync.unlink(); parents(); },
  crSync() {
    modal.className = 'open';
    modal.innerHTML = `<div class="panel gate newcode"><h2>Открыть свою принцессу</h2>
      <p>Напишите её имя и волшебное слово</p>
      <input id="oname" maxlength="14" placeholder="Имя принцессы" autocomplete="off">
      <input id="oword" maxlength="40" placeholder="Волшебное слово" autocomplete="off" autocapitalize="off">
      <button class="chip on" data-act="crOpen">Открыть</button><button class="chip" data-act="closeModal">Отмена</button></div>`;
  },
  async crOpen() {
    const name = $('#oname').value.trim(), word = $('#oword').value.trim();
    if (!name || !word) { alert('Напишите имя и волшебное слово.'); return; }
    const code = heroCode(name, word);
    let r;
    try { r = await Sync.peek(code); } catch (e) { alert('Не получилось связаться с сервером. Проверьте интернет.\n\n' + e.message); return; }
    if (!r.state) { alert('Такая принцесса не нашлась. Проверьте имя и волшебное слово — они должны быть написаны так же, как при создании.'); return; }
    try { await Sync.link(code, 'pull'); } catch (e) { alert('Не получилось открыть игру: ' + e.message); return; }
    title();
  },
  async ownerSet() {
    const p = ($('#ownpass') ? $('#ownpass').value : '').trim();
    if (p.length < 4) { alert('Пароль должен быть не короче 4 символов.'); return; }
    try { await Sync.owner(p); TTS.msg = ''; parents(); }
    catch (e) { const m = $('#ownmsg'); if (m) m.textContent = e.message.replace(/^сервер ответил \d+: /, ''); }
  },
  pExtra(el) { S.sess.until = 0; S.sess.ms = Math.max(0, S.set.limit * 60000 - 10 * 60000); S.sess.last = Date.now(); save(); el.textContent = 'Добавлено 10 минут'; },
  pHero() { readSettings(); creator(false); },
  pReset() {
    if (!confirm('Сбросить весь прогресс и покупки? Записи голоса останутся.')) return;
    const keep = { name: S.name, hero: S.hero, set: S.set, created: true };
    S = Object.assign(DEF(), keep); save(); parents();
  },
  async rRec(el) {
    const row = el.closest('.ph'), t = row.dataset.t;
    if (recBusy && recBusy !== row) return;
    if (recBusy === row) {
      clearTimeout(row._tm); await Voice.recStop(t); recBusy = null;
      row.classList.remove('rec'); row.classList.add('has'); el.textContent = '●';
      const c = $('#rcount'); if (c) c.textContent = Voice.count();
      return;
    }
    try { await Voice.recStart(); } catch (e) {
      const n = (e && e.name) || '';
      const why = !window.isSecureContext ? 'Страница открыта не по https. Откройте адрес, начиная с https://'
        : n === 'NotAllowedError' || n === 'SecurityError' ? 'Доступ к микрофону запрещён. Нажмите на значок слева от адреса сайта → «Микрофон» → «Разрешить» и обновите страницу. Если значка «Микрофон» там нет — проверьте, что микрофон разрешён браузеру в настройках устройства.'
        : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'Браузер не нашёл микрофон на этом устройстве. Подключите микрофон или запишите фразы с планшета либо телефона.'
        : n === 'NotReadableError' || n === 'AbortError' ? 'Микрофон занят другой программой (звонок, диктофон, другая вкладка). Закройте её и попробуйте снова.'
        : 'Браузер не смог начать запись.';
      alert('Не получилось включить микрофон.\n\n' + why + '\n\nКод ошибки: ' + (n || 'нет') + (e && e.message ? ' — ' + e.message : ''));
      return;
    }
    recBusy = row; row.classList.add('rec'); el.textContent = '■';
    row._tm = setTimeout(() => ACT.rRec(el), 45000);   // длинные фразы сказки читаются секунд 15–20
  },
  rPlay(el) { Voice.say(el.closest('.ph').dataset.t); },
  async ttsKey() {
    const key = ($('#ttskey') ? $('#ttskey').value : '').trim();
    if (!key) { alert('Вставьте API-ключ в поле.'); return; }
    try { await Sync.req('tts_key', null, { key }); TTS.has = true; TTS.msg = 'Ключ сохранён.'; }
    catch (e) { TTS.msg = 'Не получилось сохранить ключ: ' + e.message; }
    ttsUI();
  },
  async ttsKeyDel() { if (!confirm('Удалить API-ключ с сервера?')) return; try { await Sync.req('tts_key', null, { key: '' }); TTS.has = false; TTS.msg = 'Ключ удалён.'; } catch (e) { TTS.msg = e.message; } ttsUI(); },
  ttsVoice(el) { TTS.voice = el.value; try { localStorage.setItem('kingdom.ttsvoice', TTS.voice); } catch (e) {} },
  ttsRun() { ttsRun(false); },
  ttsRedo() { if (confirm('Переозвучить все автоматические фразы выбранным голосом? Ваши собственные записи не изменятся.')) ttsRun(true); },
  ttsSyl() { ttsRun('syl'); },
  ttsStop() { TTS.stop = true; },
  rDel(el) { const row = el.closest('.ph'); Voice.recDelete(row.dataset.t); row.classList.remove('has'); const c = $('#rcount'); if (c) c.textContent = Voice.count(); }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const f = ACT[el.dataset.act];
  if (!f) return;
  if (!/^(opt|tile|gk|cr|wear|soon|level|rRec|rPlay|rDel)$/.test(el.dataset.act)) Sfx.tap();
  f(el);
});
document.addEventListener('pointerdown', e => {            // искорки под пальцем
  if (!/^(level|map|world|title|wardrobe|result)$/.test(scr)) return;
  const [x, y] = stageXY(e.clientX, e.clientY); FX.sparkle(x, y);
}, { passive: true });
document.addEventListener('contextmenu', e => { if (scr !== 'parents') e.preventDefault(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { Voice.stop(); Sfx.music(false); return; }
  if (S.set.music && /^(map|world|level|wardrobe)$/.test(scr) && !FAST) Sfx.music(true);
  if (scr !== 'level') Sync.run();
});

/* ---------- запуск ---------- */
(async function boot() {
  load(); fit();
  if (FAST) Voice.say = async () => {};
  try { await Voice.init({ rate: S.set.rate, voiceName: S.set.voiceName }); } catch (e) {}
  title();
  Sync.init({
    getState: () => S,
    applyState(raw) {
      if (scr === 'level' || !adopt(raw)) return;      // посреди уровня ничего не подменяем
      store(); Voice.set({ rate: S.set.rate, voiceName: S.set.voiceName });
      const again = { title, map, world, wardrobe, parents }[scr];
      if (again) again(); else if (scr === 'creator' && S.created) title();
    },
    onStatus(s) { const el = $('#syncst'); if (el) el.textContent = s; },
    onVoice() { if (scr === 'parents' && pTab === 'voice' && !recBusy) parents(); },
    onGone() { S = Object.assign(DEF(), { set: S.set }); store(); L = null; title(); }      // игру удалил владелец — начинаем заново
  });
  if (!S.created && !FAST) Voice.say(T.create);
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

/* для автопроверки */
window.__game = { get S() { return S; }, get L() { return L; }, get scr() { return scr; }, get W() { return W; }, LEVELS, WORLDS, buildRounds };
