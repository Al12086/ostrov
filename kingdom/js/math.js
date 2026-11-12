/* Сад чисел: тексты, уровни и задания по математике. */
'use strict';

const MT = {
  count: 'Сколько здесь предметов?',
  findNum: 'Найди число',
  same: 'Найди, где столько же предметов',
  more: 'Где больше?',
  less: 'Где меньше?',
  after: 'Какое число идёт после числа',
  before: 'Какое число стоит перед числом',
  missing: 'Какое число потерялось?',
  sign: 'Какой знак поставить?',
  howMuch: 'Сколько будет',
  plus: 'плюс', minus: 'минус',
  number: 'Число', is: 'это', andMore: 'и ещё сколько?',
  was: 'Было', added: 'Добавили', removed: 'Убрали', became: 'Сколько стало?', left: 'Сколько осталось?',
  bigger: 'больше', smaller: 'меньше', equal: 'равно',
  demoSign: 'Смотри! Знак похож на клювик птички. Клювик всегда открыт к большему числу.',
  demoAdd: 'Смотри! Плюс — значит сложить вместе. Посчитай все предметы.',
  demoSub: 'Смотри! Минус — значит убрать. Посчитай, сколько осталось.',
  demoHouse: 'Смотри! На крыше живёт число. В двух окошках — его части. Вместе они дают число с крыши.'
};

const MSTORY = {
  intro: { e: '🌷', t: 'В Саду чисел случился переполох. Числа разбежались по клумбам, и цветы перестали цвести. Помоги принцессе вернуть числам порядок!' },
  4:  { e: '🐰', pet: 'bunny', t: 'Числа встали по порядку! Из-под куста выскочил зайчик. Он хочет считать вместе с тобой.' },
  9:  { e: '🦋', pet: 'butterfly', t: 'Теперь ты знаешь, где больше, а где меньше! К тебе прилетела бабочка. Она останется рядом.' },
  15: { e: '🐿️', pet: 'squirrel', t: 'Ты научилась складывать! Белочка принесла тебе орешков и хочет дружить.' },
  20: { e: '🦊', pet: 'fox', t: 'Сад снова цветёт! Ты умеешь складывать и вычитать. Рыжий лисёнок дарит тебе свою дружбу.' }
};
const MCHAPTER_END = [4, 9, 15, 20];

const MLEVELS = [
  { ch: 1, title: 'Считаем до 5',            mix: [['count', 8]], lo: 1, hi: 5 },
  { ch: 1, title: 'Считаем до 10',           mix: [['count', 8]], lo: 4, hi: 10 },
  { ch: 1, title: 'Цифры и количество',      mix: [['hearnum', 4], ['pickgroup', 4]], lo: 1, hi: 10 },
  { ch: 1, title: 'Числа до 20',             mix: [['hearnum', 8]], lo: 10, hi: 20 },
  { ch: 2, title: 'Больше и меньше',         mix: [['bigger', 8]] },
  { ch: 2, title: 'Соседи числа',            mix: [['next', 8]], lo: 1, hi: 10 },
  { ch: 2, title: 'Потерянное число',        mix: [['missrow', 8]], lo: 1, hi: 10 },
  { ch: 2, title: 'Знаки больше, меньше, равно', mix: [['demoSign', 1], ['sign', 8]] },
  { ch: 2, title: 'Числовой праздник',       mix: [['bigger', 2], ['next', 2], ['missrow', 2], ['sign', 2]], lo: 1, hi: 20 },
  { ch: 3, title: 'Складываем с картинками', mix: [['demoAdd', 1], ['addpic', 8]], lo: 2, hi: 5 },
  { ch: 3, title: 'Складываем до 10',        mix: [['addpic', 8]], lo: 6, hi: 10 },
  { ch: 3, title: 'Домики чисел до 5',       mix: [['demoHouse', 1], ['house', 8]], lo: 2, hi: 5 },
  { ch: 3, title: 'Домики чисел до 10',      mix: [['house', 8]], lo: 6, hi: 10 },
  { ch: 3, title: 'Складываем в уме',        mix: [['add', 8]], lo: 2, hi: 10 },
  { ch: 3, title: 'Праздник сложения',       mix: [['addpic', 2], ['house', 3], ['add', 3]], lo: 5, hi: 10 },
  { ch: 4, title: 'Вычитаем с картинками',   mix: [['demoSub', 1], ['subpic', 8]], lo: 3, hi: 10 },
  { ch: 4, title: 'Вычитаем в уме',          mix: [['sub', 8]], lo: 3, hi: 10 },
  { ch: 4, title: 'Плюс и минус',            mix: [['add', 4], ['sub', 4]], lo: 3, hi: 10 },
  { ch: 4, title: 'Маленькие задачи',        mix: [['tale', 8]], lo: 3, hi: 10 },
  { ch: 4, title: 'Числовой бал',            mix: [['sign', 1], ['missrow', 1], ['house', 2], ['add', 2], ['sub', 1], ['tale', 1]], lo: 5, hi: 10 }
];

const M_THINGS = ['🍎', '🌸', '⭐', '🦋', '🍓', '🎈', '🐞', '🍬', '💎', '🌷', '🍒', '👑'];

/* --- картинки заданий --- */
const mGroup = (e, n, cross, cls) => `<div class="grp ${cls || ''} ${n > 5 ? 'two' : ''}">${Array.from({ length: n }, (_, i) => `<span class="${cross && i >= n - cross ? 'x' : ''}"><em>${e}</em></span>`).join('')}</div>`;
const mBlank = '<i class="blank" id="blank">?</i>';
const mExpr = toks => `<div class="word num">${toks.map(t => t === '?' ? mBlank : /^\d+$/.test(String(t)) ? `<i class="c">${t}</i>` : `<i class="v op">${t}</i>`).join('')}</div>`;
const mRow = cells => `<div class="nrow">${cells.map(c => c === '?' ? `<span class="q">${mBlank}</span>` : `<span>${c}</span>`).join('')}</div>`;
const mHouse = (n, a, b) => `<div class="house"><div class="roof"><b>${n}</b></div><div class="floor"><span>${a}</span><span>${b === '?' ? mBlank : b}</span></div></div>`;

/* --- варианты ответа --- */
const mOpt = (t, ok) => ({ t: String(t), cls: 'letter', ok, html: `<i class="${/^\d+$/.test(String(t)) ? 'c' : 'v'}">${String(t).replace('<', '&lt;').replace('>', '&gt;')}</i>` });
function numOpts(ans, lo, hi, extra) {
  const pool = new Set(extra || []);
  for (let d = 1; pool.size < 6 && d < 12; d++) { if (ans - d >= lo) pool.add(ans - d); if (ans + d <= hi) pool.add(ans + d); }
  pool.delete(ans);
  const near = [...pool].sort((a, b) => Math.abs(a - ans) - Math.abs(b - ans)).slice(0, 4);
  return sample(near, 3).concat([ans]).sort((a, b) => a - b).map(v => mOpt(v, v === ans));
}
const mRange = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
function mPairs(lo, hi, minus) {      // все примеры a+b (сумма lo..hi) или a−b (a из lo..hi)
  const out = [];
  if (!minus) { for (let a = 1; a < hi; a++) for (let b = 1; a + b <= hi; b++) if (a + b >= lo) out.push([a, b]); }
  else { for (let a = lo; a <= hi; a++) for (let b = 1; b <= a; b++) out.push([a, b]); }
  return out;
}
const mDemo = (text, html) => [{ kind: 'demo', html, speech: [text] }];

const MATH_MAKE = {
  demoSign: () => mDemo(MT.demoSign, `${mExpr([5, '>', 3])}<div class="birds">🐦</div>${mExpr([2, '<', 6])}`),
  demoAdd: () => mDemo(MT.demoAdd, `<div class="grow">${mGroup('🍎', 2)}<b class="opx">+</b>${mGroup('🍎', 1)}</div>${mExpr([2, '+', 1, '=', 3])}`),
  demoSub: () => mDemo(MT.demoSub, `<div class="grow">${mGroup('🎈', 5, 2)}</div>${mExpr([5, '−', 2, '=', 3])}`),
  demoHouse: () => mDemo(MT.demoHouse, `<div class="grow">${mHouse(5, 2, 3)}${mGroup('⭐', 2)}<b class="opx">+</b>${mGroup('⭐', 3)}</div>`),

  count(lv, n) {
    return weightPick(mRange(lv.lo, lv.hi), n, v => 'c:' + v).map(v => ({ kind: 'choose', key: 'c:' + v, speech: [MT.count],
      stim: { html: mGroup(pick(M_THINGS), v, 0, 'big') }, options: numOpts(v, 1, lv.hi + 1), after: [String(v)] }));
  },
  hearnum(lv, n) {
    return weightPick(mRange(lv.lo, lv.hi), n, v => 'hn:' + v).map(v => {
      const swap = v > 12 && v < 20 ? [+String(v).split('').reverse().join('')].filter(x => x <= 99 && x !== v) : [];
      const opts = numOpts(v, Math.max(0, lv.lo - 2), lv.hi, []);
      if (swap.length && !opts.some(o => o.t === String(swap[0]))) { const i = opts.findIndex(o => !o.ok); opts[i] = mOpt(swap[0], false); }
      return { kind: 'choose', key: 'hn:' + v, speech: [MT.findNum, String(v)], tts: `Найди число ${v}.`, stim: { ear: true }, options: opts, after: [String(v)] };
    });
  },
  pickgroup(lv, n) {
    return weightPick(mRange(Math.max(1, lv.lo), Math.min(10, lv.hi)), n, v => 'pg:' + v).map(v => {
      const e = pick(M_THINGS);
      const others = sample(mRange(1, 10).filter(x => x !== v && Math.abs(x - v) <= 3), 2);
      return { kind: 'choose', key: 'pg:' + v, speech: [MT.same], stim: { html: mExpr([v]) },
        options: shuffle([v].concat(others)).map(x => ({ t: String(x), cls: 'grpc', ok: x === v, html: mGroup(e, x) })), after: [String(v)] };
    });
  },
  bigger(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = 1 + Math.floor(Math.random() * 10); let b = a;
      while (b === a || Math.abs(b - a) > 4) b = 1 + Math.floor(Math.random() * 10);
      const more = Math.random() < 0.6, e = pick(M_THINGS), ans = more ? Math.max(a, b) : Math.min(a, b);
      out.push({ kind: 'choose', key: 'cmp:' + Math.min(a, b) + '-' + Math.max(a, b), speech: [more ? MT.more : MT.less], stim: { ear: true, small: true },
        options: [a, b].map(x => ({ t: String(x), cls: 'grpc wide', ok: x === ans, html: mGroup(e, x) })), after: [String(ans)] });
    }
    return out;
  },
  next(lv, n) {
    return weightPick(mRange(lv.lo, lv.hi - 1), n, v => 'nx:' + v).map(v => {
      const before = Math.random() < 0.4 && v > 0;
      const ans = before ? v - 1 : v + 1;
      return { kind: 'choose', key: (before ? 'pv:' : 'nx:') + v, speech: [before ? MT.before : MT.after, String(v)], tts: `${before ? MT.before : MT.after} ${v}?`,
        stim: { html: mRow(before ? ['?', v] : [v, '?']) }, options: numOpts(ans, 0, lv.hi + 1), after: [String(ans)], fill: true };
    });
  },
  missrow(lv, n) {
    return weightPick(mRange(lv.lo, lv.hi - 3), n, v => 'mr:' + v).map(s => {
      let cells = [s, s + 1, s + 2, s + 3];
      if (Math.random() < 0.35) cells.reverse();
      const i = Math.floor(Math.random() * 4), ans = cells[i];
      cells = cells.map((c, j) => j === i ? '?' : c);
      return { kind: 'choose', key: 'mr:' + s, speech: [MT.missing], stim: { html: mRow(cells) }, options: numOpts(ans, 0, lv.hi + 1), after: [String(ans)], fill: true };
    });
  },
  sign(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = 1 + Math.floor(Math.random() * 10), b = Math.random() < 0.2 ? a : 1 + Math.floor(Math.random() * 10);
      const ans = a > b ? '>' : a < b ? '<' : '=';
      out.push({ kind: 'choose', key: 'sg:' + a + '?' + b, speech: [MT.sign], stim: { html: mExpr([a, '?', b]) },
        options: ['>', '<', '='].map(s => mOpt(s, s === ans)), after: [String(a), a > b ? MT.bigger : a < b ? MT.smaller : MT.equal, String(b)], fill: true });
    }
    return out;
  },
  addpic(lv, n) {
    return weightPick(mPairs(lv.lo, lv.hi), n, p => 'a:' + p[0] + '+' + p[1]).map(([a, b]) => {
      const e = pick(M_THINGS);
      return { kind: 'choose', key: 'a:' + a + '+' + b, speech: [MT.howMuch, String(a), MT.plus, String(b)], tts: `Сколько будет ${a} плюс ${b}?`,
        stim: { col: true, html: `<div class="grow">${mGroup(e, a)}<b class="opx">+</b>${mGroup(e, b)}</div>${mExpr([a, '+', b, '=', '?'])}` },
        options: numOpts(a + b, 1, lv.hi + 1), after: [String(a + b)], fill: true };
    });
  },
  add(lv, n) {
    return weightPick(mPairs(lv.lo, lv.hi), n, p => 'a:' + p[0] + '+' + p[1]).map(([a, b]) => ({ kind: 'choose', key: 'a:' + a + '+' + b,
      speech: [MT.howMuch, String(a), MT.plus, String(b)], tts: `Сколько будет ${a} плюс ${b}?`, stim: { html: mExpr([a, '+', b, '=', '?']) },
      options: numOpts(a + b, 1, lv.hi + 1), after: [String(a + b)], fill: true }));
  },
  subpic(lv, n) {
    return weightPick(mPairs(lv.lo, lv.hi, true), n, p => 's:' + p[0] + '-' + p[1]).map(([a, b]) => ({ kind: 'choose', key: 's:' + a + '-' + b,
      speech: [MT.howMuch, String(a), MT.minus, String(b)], tts: `Сколько будет ${a} минус ${b}?`,
      stim: { col: true, html: `<div class="grow">${mGroup(pick(M_THINGS), a, b)}</div>${mExpr([a, '−', b, '=', '?'])}` },
      options: numOpts(a - b, 0, lv.hi), after: [String(a - b)], fill: true }));
  },
  sub(lv, n) {
    return weightPick(mPairs(lv.lo, lv.hi, true), n, p => 's:' + p[0] + '-' + p[1]).map(([a, b]) => ({ kind: 'choose', key: 's:' + a + '-' + b,
      speech: [MT.howMuch, String(a), MT.minus, String(b)], tts: `Сколько будет ${a} минус ${b}?`, stim: { html: mExpr([a, '−', b, '=', '?']) },
      options: numOpts(a - b, 0, lv.hi), after: [String(a - b)], fill: true }));
  },
  house(lv, n) {
    const all = [];
    for (let N = lv.lo; N <= lv.hi; N++) for (let a = (N > 2 ? 1 : 0); a <= N - (N > 2 ? 1 : 0); a++) all.push([N, a]);
    return weightPick(all, n, p => 'h:' + p[0] + ':' + p[1]).map(([N, a]) => ({ kind: 'choose', key: 'h:' + N + ':' + a,
      speech: [MT.number, String(N), MT.is, String(a), MT.andMore], tts: `Число ${N} — это ${a} и ещё сколько?`,
      stim: { html: mHouse(N, a, '?') }, options: numOpts(N - a, 0, N), after: [String(N - a)], fill: true }));
  },
  tale(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const plus = Math.random() < 0.5, e = pick(M_THINGS);
      const [a, b] = pick(mPairs(lv.lo, lv.hi, !plus));
      const ans = plus ? a + b : a - b;
      out.push({ kind: 'choose', key: 't:' + a + (plus ? '+' : '-') + b,
        speech: plus ? [MT.was, String(a), MT.added, String(b), MT.became] : [MT.was, String(a), MT.removed, String(b), MT.left],
        tts: plus ? `Было ${a}. Добавили ещё ${b}. Сколько стало?` : `Было ${a}. Убрали ${b}. Сколько осталось?`,
        stim: { col: true, html: plus ? `<div class="grow">${mGroup(e, a)}<b class="opx">+</b>${mGroup(e, b)}</div>` : `<div class="grow">${mGroup(e, a, b)}</div>` },
        options: numOpts(ans, 0, lv.hi + 1), after: [String(ans)] });
    }
    return out;
  }
};

/* Фразы Сада чисел для записи своим голосом */
function mathPhrases() {
  return [
    { g: 'Сад чисел: задания', items: Object.values(MT) },
    { g: 'Сад чисел: сказка', items: Object.values(MSTORY).map(s => s.t) },
    { g: 'Числа (произнесите число словом)', items: mRange(0, 20).map(String) }
  ];
}
