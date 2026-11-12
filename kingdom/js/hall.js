/* Музыкальный зал: слух и ритм. Все звуки синтезируются прямо в браузере. */
'use strict';

const HT = {
  high: 'Послушай: этот звук высокий или низкий?',
  long: 'Послушай: этот звук долгий или короткий?',
  count: 'Сколько раз прозвенел звоночек?',
  louder: 'Какой звук громче — первый или второй?',
  higher: 'Какой звук выше — первый или второй?',
  updown: 'Мелодия идёт вверх или вниз?',
  same: 'Мелодии одинаковые или разные?',
  simon: 'Послушай колокольчики и повтори',
  rhythm: 'Какой ритм прозвучал?',
  instr: 'Какой инструмент играет?',
  highest: 'Какой звук был самым высоким?',
  yourTurn: 'Теперь ты!'
};
const HA = { high: 'высокий', low: 'низкий', long: 'долгий', short: 'короткий', first: 'первый', second: 'второй', third: 'третий',
  up: 'вверх', down: 'вниз', same: 'одинаковые', diff: 'разные' };

const HSTORY = {
  intro: { e: '🎻', t: 'В Музыкальном зале уснули все инструменты. Разбуди их: слушай внимательно и отгадывай звуки!' },
  5:  { e: '🐤', pet: 'chick', t: 'Инструменты просыпаются! Звонкий цыплёнок так обрадовался, что запел. Он хочет петь вместе с тобой.' },
  10: { e: '🐸', pet: 'frog', t: 'Колокольчики снова звенят! Весёлая лягушка-певунья прискакала к тебе в гости и осталась дружить.' },
  15: { e: '🐨', pet: 'koala', t: 'Ты отлично слышишь ритм! Коала принесла тебе маленький барабан и стала твоим другом.' },
  20: { e: '🦩', pet: 'flamingo', t: 'Большой концерт удался! Все инструменты играют снова. Розовый фламинго танцует для тебя и дарит свою дружбу.' }
};
const HCHAPTER_END = [5, 10, 15, 20];

const HLEVELS = [
  { ch: 1, title: 'Высокий и низкий',          mix: [['hHigh', 8]] },
  { ch: 1, title: 'Громче или тише',           mix: [['hLouder', 8]] },
  { ch: 1, title: 'Долгий и короткий',         mix: [['hLong', 8]] },
  { ch: 1, title: 'Сколько звоночков',         mix: [['hCount', 8]], max: 5 },
  { ch: 1, title: 'Весёлые звуки',             mix: [['hHigh', 2], ['hLouder', 2], ['hLong', 2], ['hCount', 2]], max: 5 },
  { ch: 2, title: 'Какой звук выше',           mix: [['hHigher', 8]] },
  { ch: 2, title: 'Вверх или вниз',            mix: [['hUpDown', 8]] },
  { ch: 2, title: 'Одинаковые или разные',     mix: [['hSame', 8]] },
  { ch: 2, title: 'Волшебные колокольчики',    mix: [['hSimon', 8]], seq: [2, 3] },
  { ch: 2, title: 'Праздник звуков',           mix: [['hHigher', 2], ['hUpDown', 2], ['hSame', 2], ['hSimon', 2]], seq: [2, 3] },
  { ch: 3, title: 'Узнай ритм',                mix: [['hRhythm', 8]], beats: 3 },
  { ch: 3, title: 'Узнай инструмент',          mix: [['hInstr', 8]], instr: ['drum', 'bell', 'guitar'] },
  { ch: 3, title: 'Колокольчики посложнее',    mix: [['hSimon', 8]], seq: [3, 4] },
  { ch: 3, title: 'Быстрые звоночки',          mix: [['hCount', 8]], max: 7, fast: true },
  { ch: 3, title: 'Музыкальная разминка',      mix: [['hRhythm', 2], ['hInstr', 2], ['hSimon', 2], ['hCount', 2]], beats: 3, instr: ['drum', 'bell', 'guitar'], seq: [3, 4], max: 7, fast: true },
  { ch: 4, title: 'Все инструменты',           mix: [['hInstr', 8]], instr: ['drum', 'bell', 'guitar', 'trumpet', 'piano'] },
  { ch: 4, title: 'Длинные ритмы',             mix: [['hRhythm', 8]], beats: 4 },
  { ch: 4, title: 'Колокольчики-мастера',      mix: [['hSimon', 8]], seq: [4, 5] },
  { ch: 4, title: 'Самый высокий звук',        mix: [['hHighest', 8]] },
  { ch: 4, title: 'Большой концерт',           mix: [['hHighest', 1], ['hRhythm', 1], ['hInstr', 1], ['hSimon', 2], ['hSame', 1], ['hUpDown', 1], ['hCount', 1]],
    beats: 4, instr: ['drum', 'bell', 'guitar', 'trumpet', 'piano'], seq: [3, 4], max: 6 }
];

/* ---------- звуки ---------- */
const Hz = semi => 440 * Math.pow(2, semi / 12);      // 0 = ля первой октавы
let hOut = null;
function hctx() {
  const c = Sfx.unlock();
  if (c && !hOut) { hOut = c.createGain(); hOut.gain.value = 0.9; hOut.connect(c.destination); }
  return c;
}
function hTone(f, at, dur, vol, type) {
  const c = hctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
  o.type = type || 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.setValueAtTime(vol, t + Math.max(0.03, dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(hOut); o.start(t); o.stop(t + dur + 0.05);
}
const H_INSTR = {
  drum(at) {
    const c = hctx(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.25);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(hOut); o.start(t); o.stop(t + 0.4);
    const len = Math.floor(c.sampleRate * 0.12), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), ng = c.createGain(); s.buffer = buf; ng.gain.value = 0.25; s.connect(ng); ng.connect(hOut); s.start(t);
  },
  bell(at, f) {         // мягкий колокольчик: чистый тон, чуть «живой» призвук и плавное затухание
    f = f || 784;
    const c = hctx(); if (!c) return;
    [[1, 0.16, 1.6, 0], [1, 0.07, 1.6, 3], [2, 0.035, 0.9, 0], [3, 0.012, 0.5, 0]].forEach(([m, v, d, det]) => {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
      o.type = 'sine'; o.frequency.value = f * m; o.detune.value = det;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + (FAST ? 0.03 : d));
      o.connect(g); g.connect(hOut); o.start(t); o.stop(t + d + 0.05);
    });
  },
  guitar(at, f) {
    const c = hctx(); if (!c) return;
    f = f || 196; const sr = c.sampleRate, n = Math.round(sr / f), len = Math.floor(sr * 1.6);
    const buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (let i = n; i < len; i++) d[i] = 0.996 * 0.5 * (d[i - n] + d[i - n + 1]);
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = 0.7; s.connect(g); g.connect(hOut); s.start(c.currentTime + at);
  },
  trumpet(at, f) {
    const c = hctx(); if (!c) return;
    f = f || 392; const t = c.currentTime + at, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(600, t); fl.frequency.linearRampToValueAtTime(2600, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28, t + 0.08); g.gain.setValueAtTime(0.28, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o.connect(fl); fl.connect(g); g.connect(hOut); o.start(t); o.stop(t + 1.05);
  },
  piano(at, f) { f = f || 523; hTone(f, at, 1.4, 0.3, 'triangle'); hTone(f * 2, at, 0.6, 0.08, 'sine'); }
};
const H_INSTR_EMOJI = { drum: ['🥁', 'барабан'], bell: ['🔔', 'колокольчик'], guitar: ['🎸', 'гитара'], trumpet: ['🎺', 'труба'], piano: ['🎹', 'пианино'] };
const H_BELLS = [[Hz(3), '#FF6FA5'], [Hz(7), '#FFC94D'], [Hz(10), '#7ED6BE'], [Hz(15), '#8C7CF0']];   // до, ми, соль, до
const hGap = s => FAST ? 0.02 : s;
const hLen = s => FAST ? 0.02 : s;

/* ---------- варианты ответа ---------- */
const hNum = (n, ok) => ({ t: String(n), cls: 'letter', ok, html: `<i class="c">${n}</i>` });
const hEmo = (e, ok) => ({ t: e, cls: 'emoji', ok });
const hRh = beats => `<span class="hrh">${beats.map(b => `<i class="${b ? 'l' : 's'}"></i>`).join('')}</span>`;
/* «высокий» — нота наверху лесенки и стрелка вверх, «низкий» — нота внизу и стрелка вниз */
const hPitch = high => `<svg class="hpitch" viewBox="0 0 160 120">${[24, 44, 64, 84, 104].map(y => `<line x1="8" y1="${y}" x2="112" y2="${y}"/>`).join('')}
  <g class="${high ? 'hi' : 'lo'}"><ellipse cx="60" cy="${high ? 24 : 104}" rx="15" ry="11" transform="rotate(-20 60 ${high ? 24 : 104})"/><line class="stem" x1="74" y1="${high ? 22 : 102}" x2="74" y2="${high ? -14 : 62}"/></g>
  <path class="arr ${high ? 'hi' : 'lo'}" d="${high ? 'M138 96 V24 M124 40 L138 22 L152 40' : 'M138 24 V96 M124 80 L138 98 L152 80'}"/></svg>`;
const hPairIcon = same => `<span class="hpair"><i></i><i class="${same ? '' : 'other'}"></i></span>`;

const HALL_MAKE = {
  hHigh(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const hi = Math.random() < 0.5, f = hi ? Hz(15 + Math.floor(Math.random() * 7)) : Hz(-21 + Math.floor(Math.random() * 6));
      out.push({ kind: 'choose', key: 'e:высоко-низко', speech: [HT.high], stim: { listen: true }, play: () => hTone(f, 0, hLen(0.9), 0.35),
        options: [{ t: 'high', cls: 'emoji pitch', ok: hi, html: hPitch(true) }, { t: 'low', cls: 'emoji pitch', ok: !hi, html: hPitch(false) }], after: [hi ? HA.high : HA.low] });
    }
    return out;
  },
  hLouder(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const first = Math.random() < 0.5, f = Hz(Math.floor(Math.random() * 8));
      out.push({ kind: 'choose', key: 'e:громче', speech: [HT.louder], stim: { listen: true },
        play: () => { hTone(f, 0, hLen(0.6), first ? 0.5 : 0.05); hTone(f, hGap(1.0), hLen(0.6), first ? 0.05 : 0.5); },
        options: [hNum(1, first), hNum(2, !first)], after: [first ? HA.first : HA.second] });
    }
    return out;
  },
  hLong(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const lg = Math.random() < 0.5;
      out.push({ kind: 'choose', key: 'e:долго-коротко', speech: [HT.long], stim: { listen: true }, play: () => hTone(Hz(3), 0, hLen(lg ? 1.6 : 0.15), 0.35),
        options: [{ t: 'long', cls: 'emoji', ok: lg, html: hRh([1]) }, { t: 'short', cls: 'emoji', ok: !lg, html: hRh([0]) }], after: [lg ? HA.long : HA.short] });
    }
    return out;
  },
  hCount(lv, n) {
    return weightPick(mRange(1, lv.max), n, v => 'e:звоночки ' + v).map(v => ({ kind: 'choose', key: 'e:звоночки ' + v, speech: [HT.count], stim: { listen: true },
      play: () => { const pent = [0, 2, 4, 7, 9, 12, 14].map(s => Hz(3 + s)); for (let i = 0; i < v; i++) H_INSTR.bell(hGap(lv.fast ? 0.36 : 0.58) * i, pent[i % pent.length]); },
      options: numOpts(v, 1, lv.max + 1).map(o => hNum(+o.t, o.ok)), after: [String(v)] }));
  },
  hHigher(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = Math.floor(Math.random() * 12) - 5, b = a + (Math.random() < 0.5 ? 1 : -1) * (5 + Math.floor(Math.random() * 4));
      out.push({ kind: 'choose', key: 'e:выше', speech: [HT.higher], stim: { listen: true },
        play: () => { hTone(Hz(a), 0, hLen(0.6), 0.32); hTone(Hz(b), hGap(0.95), hLen(0.6), 0.32); },
        options: [hNum(1, a > b), hNum(2, b > a)], after: [a > b ? HA.first : HA.second] });
    }
    return out;
  },
  hUpDown(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const up = Math.random() < 0.5, base = Math.floor(Math.random() * 6) - 2, steps = [0, 2, 4, 5, 7];
      const notes = (up ? steps : steps.slice().reverse()).map(s => Hz(base + s));
      out.push({ kind: 'choose', key: 'e:вверх-вниз', speech: [HT.updown], stim: { listen: true },
        play: () => notes.forEach((f, i) => hTone(f, hGap(0.32) * i, hLen(0.3), 0.3)),
        options: [hEmo('⬆️', up), hEmo('⬇️', !up)], after: [up ? HA.up : HA.down] });
    }
    return out;
  },
  hSame(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const same = Math.random() < 0.5, a = sample([0, 2, 4, 5, 7, 9, 12], 3);
      const b = a.slice(); if (!same) { const i = Math.floor(Math.random() * 3); b[i] = a[i] + (a[i] > 6 ? -5 : 5); }
      out.push({ kind: 'choose', key: 'e:одинаковые', speech: [HT.same], stim: { listen: true },
        play: () => { a.forEach((s, i) => hTone(Hz(s), hGap(0.32) * i, hLen(0.28), 0.3)); b.forEach((s, i) => hTone(Hz(s), hGap(1.5) + hGap(0.32) * i, hLen(0.28), 0.3)); },
        options: [{ t: 'same', cls: 'emoji', ok: same, html: hPairIcon(true) }, { t: 'diff', cls: 'emoji', ok: !same, html: hPairIcon(false) }], after: [same ? HA.same : HA.diff] });
    }
    return out;
  },
  hRhythm(lv, n) {
    const all = [];
    for (let m = 0; m < (1 << lv.beats); m++) { const p = Array.from({ length: lv.beats }, (_, i) => (m >> i) & 1); if (p.some(x => x) && p.some(x => !x)) all.push(p); }
    return weightPick(all, n, p => 'e:ритм ' + p.join('')).map(p => {
      const others = sample(all.filter(x => x.join() !== p.join()), 2);
      return { kind: 'choose', key: 'e:ритм ' + p.join(''), speech: [HT.rhythm], stim: { listen: true },
        play: () => { let t = 0; p.forEach(b => { if (b) hTone(Hz(3), t, hLen(0.7), 0.32); else H_INSTR.drum(t); t += hGap(b ? 0.95 : 0.45); }); },
        options: shuffle([p].concat(others)).map(x => ({ t: x.join(''), cls: 'emoji rhy', ok: x === p, html: hRh(x) })), after: [] };
    });
  },
  hInstr(lv, n) {
    return weightPick(lv.instr, n, x => 'e:инструмент ' + x).map(id => ({ kind: 'choose', key: 'e:инструмент ' + id, speech: [HT.instr], stim: { listen: true },
      play: () => { H_INSTR[id](0); if (id !== 'trumpet' && id !== 'piano') H_INSTR[id](hGap(0.7)); },
      options: shuffle(lv.instr.length > 4 ? [id].concat(sample(lv.instr.filter(x => x !== id), 3)) : lv.instr.slice()).map(x => hEmo(H_INSTR_EMOJI[x][0], x === id)),
      after: [H_INSTR_EMOJI[id][1]] }));
  },
  hHighest(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const top = Math.floor(Math.random() * 3), base = Math.floor(Math.random() * 5) - 4;
      const notes = [0, 1, 2].map(i => Hz(i === top ? base + 9 + Math.floor(Math.random() * 3) : base + Math.floor(Math.random() * 4)));
      out.push({ kind: 'choose', key: 'e:самый высокий', speech: [HT.highest], stim: { listen: true },
        play: () => notes.forEach((f, i) => hTone(f, hGap(0.9) * i, hLen(0.55), 0.32)),
        options: [1, 2, 3].map(i => hNum(i, i - 1 === top)), after: [[HA.first, HA.second, HA.third][top]] });
    }
    return out;
  },
  hSimon(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const len = lv.seq[0] + (k >= n / 2 ? lv.seq[1] - lv.seq[0] : 0);
      const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
      out.push({ kind: 'simon', key: 'e:колокольчики ' + len, speech: [HT.simon], seq, after: [] });
    }
    return out;
  }
};

/* колокольчик «Саймона»: звук и подсветка */
function hBell(i, at) { H_INSTR.bell(at || 0, H_BELLS[i][0]); }

function hallPhrases() {
  return [
    { g: 'Музыкальный зал: задания', items: Object.values(HT) },
    { g: 'Музыкальный зал: ответы', items: Object.values(HA).concat(Object.values(H_INSTR_EMOJI).map(x => x[1])) },
    { g: 'Музыкальный зал: сказка', items: Object.values(HSTORY).map(s => s.t) }
  ];
}
