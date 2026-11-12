/* Мастерская загадок: внимание, логика и память. */
'use strict';

const WT = {
  same: 'Найди точно такую же картинку',
  shadow: 'Чья это тень?',
  pattern: 'Что будет дальше? Продолжи узор',
  numPattern: 'Какое число будет дальше?',
  memoShow: 'Посмотри внимательно и запомни картинки. Когда запомнишь, нажми кнопку.',
  memoWas: 'Какая картинка здесь была?',
  memoGone: 'Чего не стало?',
  memoNew: 'Что появилось новое?',
  size: 'Расставь от самого маленького к самому большому',
  magic: 'Чего не хватает в волшебном квадрате? В каждом ряду и в каждом столбике всё разное.'
};

const WSTORY = {
  intro: { e: '🧩', t: 'В Мастерской загадок спрятались хитрые головоломки. Мастер-гномик просит тебя помочь разгадать их все!' },
  5:  { e: '🐹', pet: 'hamster', t: 'Ты очень внимательная! За это хомячок из мастерской хочет с тобой дружить.' },
  10: { e: '🦝', pet: 'raccoon', t: 'У тебя отличная память! Из-за верстака выглянул енотик. Теперь он твой друг.' },
  15: { e: '🐢', pet: 'turtle', t: 'Ты разгадала столько загадок! Мудрая черепаха приползла поздравить тебя.' },
  20: { e: '🦚', pet: 'peacock', t: 'Все головоломки мастерской разгаданы! Красавец павлин раскрыл для тебя свой хвост и стал твоим другом.' }
};
const WCHAPTER_END = [5, 10, 15, 20];

const W_SIMILAR = [['🐶', '🐕', '🐩', '🐺'], ['🐱', '🐈', '🐯', '🦁'], ['🍎', '🍏', '🍅', '🍒'], ['🌸', '🌺', '🌷', '🌼'], ['🚗', '🚕', '🚙', '🚓'],
  ['⭐', '🌟', '✨', '💫'], ['🐞', '🐝', '🦋', '🐜'], ['🎈', '🎀', '🎁', '🎉'], ['🐟', '🐠', '🐡', '🦈'], ['🐔', '🐓', '🐤', '🐦'], ['🍓', '🍒', '🍇', '🍑']];
const W_SHADOW_EASY = ['🎈', '⚽', '🚗', '🏠', '🌳', '✂️', '🔑', '🎸', '☂️', '👑', '🐘', '🦒', '🐢', '🐇', '🍌', '🍐', '✈️', '⛵', '🦋', '🐌'];
const W_SHADOW_HARD = ['🐘', '🦒', '🐢', '🐇', '🐍', '🦀', '🐌', '🐬', '🦋', '🐓', '🐪', '🦔', '🐿️', '🦩', '🐧', '🦕'];
const W_ITEMS = ['🍎', '🚗', '🐱', '⚽', '🌸', '🎈', '🐟', '🍌', '⭐', '🏠', '🎁', '🐞', '☂️', '👑', '🍓', '🦋', '🎸', '🐻', '🍦', '🚀'];
const W_SIZE = ['🐻', '🌸', '🍎', '⭐', '🎈', '🐱', '🏠', '🌳', '🚗', '🐟'];
/* цветные фигуры для узоров и квадратов */
const W_FIG = {
  rc: ['#E53935', 'circle'], bs: ['#1E88E5', 'square'], yt: ['#FDD835', 'triangle'], gc: ['#43A047', 'circle'],
  vs: ['#8E24AA', 'star'], ot: ['#FB8C00', 'triangle'], ps: ['#FF8FB8', 'square'], bc: ['#1E88E5', 'circle']
};
const wFig = id => `<svg class="wfig" viewBox="0 0 100 100" style="fill:${W_FIG[id][0]}">${T_SHAPES[W_FIG[id][1]][1]}</svg>`;

const WLEVELS = [
  { ch: 1, title: 'Найди такую же',            mix: [['wSame', 8]] },
  { ch: 1, title: 'Чья это тень',              mix: [['wShadow', 8]], shadow: W_SHADOW_EASY },
  { ch: 1, title: 'Продолжи узор',             mix: [['wPattern', 8]], kinds: ['ABAB'] },
  { ch: 1, title: 'Запомни картинки',          mix: [['wMemoWas', 8]], memo: 3 },
  { ch: 1, title: 'Весёлая мастерская',        mix: [['wSame', 2], ['wShadow', 2], ['wPattern', 2], ['wMemoWas', 2]], shadow: W_SHADOW_EASY, kinds: ['ABAB'], memo: 3 },
  { ch: 2, title: 'Узоры посложнее',           mix: [['wPattern', 8]], kinds: ['AAB', 'ABB', 'ABC'] },
  { ch: 2, title: 'Чего не стало',             mix: [['wMemoGone', 8]], memo: 4 },
  { ch: 2, title: 'От маленького к большому',  mix: [['wSize', 8]], sizes: 3 },
  { ch: 2, title: 'Волшебный квадрат',         mix: [['wMagic', 8]] },
  { ch: 2, title: 'Праздник загадок',          mix: [['wPattern', 2], ['wMemoGone', 2], ['wSize', 2], ['wMagic', 2]], kinds: ['AAB', 'ABB', 'ABC'], memo: 4, sizes: 3 },
  { ch: 3, title: 'Тени посложнее',            mix: [['wShadow', 8]], shadow: W_SHADOW_HARD },
  { ch: 3, title: 'Запомни пять картинок',     mix: [['wMemoWas', 8]], memo: 5 },
  { ch: 3, title: 'Квадрат из фигур',          mix: [['wMagic', 8]], figs: true },
  { ch: 3, title: 'Узоры из фигур',            mix: [['wPattern', 8]], kinds: ['ABAB', 'ABC', 'AABB'], figs: true },
  { ch: 3, title: 'Большая головоломка',       mix: [['wShadow', 2], ['wMemoWas', 2], ['wMagic', 2], ['wPattern', 2]], shadow: W_SHADOW_HARD, memo: 5, figs: true, kinds: ['ABC', 'AABB'] },
  { ch: 4, title: 'Что появилось новое',       mix: [['wMemoNew', 8]], memo: 4 },
  { ch: 4, title: 'Числовые узоры',            mix: [['wNum', 8]] },
  { ch: 4, title: 'Четыре по росту',           mix: [['wSize', 8]], sizes: 4 },
  { ch: 4, title: 'Запомни и найди',           mix: [['wMemoGone', 4], ['wMemoNew', 4]], memo: 5 },
  { ch: 4, title: 'Праздник мастеров',         mix: [['wSame', 1], ['wShadow', 1], ['wPattern', 1], ['wMemoGone', 1], ['wSize', 1], ['wMagic', 1], ['wNum', 1], ['wMemoNew', 1]],
    shadow: W_SHADOW_HARD, kinds: ['AAB', 'ABC'], memo: 4, sizes: 4, figs: true }
];

const W_PAT = { ABAB: [0, 1, 0, 1, 0, 1], AAB: [0, 0, 1, 0, 0, 1], ABB: [0, 1, 1, 0, 1, 1], ABC: [0, 1, 2, 0, 1, 2], AABB: [0, 0, 1, 1, 0, 0] };
const wRow = (cells, cls) => `<div class="wrow ${cls || ''}">${cells.map(c => c === '?' ? `<span class="q">${mBlank}</span>` : `<span>${c}</span>`).join('')}</div>`;
const wEmo = (e, ok) => ({ t: e, cls: 'emoji', ok });

const WORK_MAKE = {
  wSame(lv, n) {
    return weightPick(W_SIMILAR, n, g => 'e:такая же ' + g[0]).map(g => {
      const ok = pick(g);
      return { kind: 'choose', key: 'e:такая же ' + g[0], speech: [WT.same], stim: { emoji: ok }, options: shuffle(g.map(x => wEmo(x, x === ok))), after: [] };
    });
  },
  wShadow(lv, n) {
    return weightPick(lv.shadow, n, x => 'e:тень ' + x).map(ok => ({ kind: 'choose', key: 'e:тень ' + ok, speech: [WT.shadow], stim: { html: `<span class="wshadow">${ok}</span>` },
      options: shuffle([wEmo(ok, true)].concat(sample(lv.shadow.filter(x => x !== ok), 3).map(x => wEmo(x, false)))), after: [] }));
  },
  wPattern(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const kind = pick(lv.kinds), pat = W_PAT[kind], m = Math.max(...pat) + 1;
      const pool = lv.figs ? Object.keys(W_FIG) : W_ITEMS;
      const items = sample(pool, m), extra = pick(pool.filter(x => !items.includes(x)));
      const show = x => lv.figs ? wFig(x) : x;
      const ans = items[pat[5]];
      const opts = shuffle([...new Set(items.concat([extra]))]).slice(0, 4);
      if (!opts.includes(ans)) opts[0] = ans;
      out.push({ kind: 'choose', key: 'e:узор ' + kind, speech: [WT.pattern], stim: { html: wRow(pat.slice(0, 5).map(i => show(items[i])).concat(['?'])) },
        options: shuffle(opts).map(x => ({ t: x, cls: 'emoji', ok: x === ans, html: show(x) })), after: [], fill: true, fillHtml: true });
    }
    return out;
  },
  wNum(lv, n) {
    const seqs = [];
    for (let s = 1; s <= 6; s++) seqs.push([[s, s + 1, s + 2, s + 3, s + 4], '+1']);
    for (let s = 10; s >= 6; s--) seqs.push([[s, s - 1, s - 2, s - 3, s - 4], '-1']);
    seqs.push([[2, 4, 6, 8, 10], '+2'], [[1, 3, 5, 7, 9], '+2'], [[1, 2, 1, 2, 1, 2], 'ab'], [[1, 2, 3, 1, 2, 3], 'abc'], [[5, 5, 1, 5, 5, 1], 'aab']);
    return weightPick(seqs, n, s => 'e:числа ' + s[0].join(' ')).map(([s]) => {
      const ans = s[s.length - 1];
      return { kind: 'choose', key: 'e:числа ' + s.join(' '), speech: [WT.numPattern], stim: { html: wRow(s.slice(0, -1).concat(['?']), 'num') },
        options: numOpts(ans, 1, 12), after: [String(ans)], fill: true };
    });
  },
  wMemoWas(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const set = sample(W_ITEMS, lv.memo), ok = pick(set);
      out.push({ kind: 'choose', key: 'e:запомни ' + lv.memo, memo: wRow(set, 'memo'), speech: [WT.memoWas], stim: { ear: true, small: true },
        options: shuffle([wEmo(ok, true)].concat(sample(W_ITEMS.filter(x => !set.includes(x)), 3).map(x => wEmo(x, false)))), after: [] });
    }
    return out;
  },
  wMemoGone(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const set = sample(W_ITEMS, lv.memo), gone = pick(set), left = shuffle(set.filter(x => x !== gone));
      const opts = [gone].concat(sample(left, 2), sample(W_ITEMS.filter(x => !set.includes(x)), 1));
      out.push({ kind: 'choose', key: 'e:чего не стало ' + lv.memo, memo: wRow(set, 'memo'), speech: [WT.memoGone], stim: { html: wRow(left, 'memo') },
        options: shuffle(opts.map(x => wEmo(x, x === gone))), after: [] });
    }
    return out;
  },
  wMemoNew(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const set = sample(W_ITEMS, lv.memo), nw = pick(W_ITEMS.filter(x => !set.includes(x)));
      const shown = shuffle(set.concat([nw]));
      out.push({ kind: 'choose', key: 'e:что нового ' + lv.memo, memo: wRow(set, 'memo'), speech: [WT.memoNew], stim: { html: wRow(shown, 'memo') },
        options: shuffle([wEmo(nw, true)].concat(sample(set, 3).map(x => wEmo(x, false)))), after: [] });
    }
    return out;
  },
  wSize(lv, n) {
    return weightPick(W_SIZE, n, e => 'e:по росту ' + e).map(e => {
      const parts = Array.from({ length: lv.sizes }, (_, i) => `<span class="wsz z${i + (lv.sizes === 3 ? 1 : 0)}">${e}</span>`);
      let bank = shuffle(parts);
      while (bank.join() === parts.join()) bank = shuffle(parts);
      return { kind: 'assemble', raw: true, key: 'e:по росту ' + e, speech: [WT.size], stim: {}, parts, bank, pcls: 'emo', after: [] };
    });
  },
  wMagic(lv, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const pool = lv.figs ? Object.keys(W_FIG) : W_ITEMS;
      const items = sample(pool, 3), show = x => lv.figs ? wFig(x) : x;
      const rows = shuffle([[0, 1, 2], [1, 2, 0], [2, 0, 1]]), cols = shuffle([0, 1, 2]);
      const grid = rows.map(r => cols.map(c => items[r[c]]));
      const hi = Math.floor(Math.random() * 9), ans = grid[Math.floor(hi / 3)][hi % 3];
      const cells = grid.flat().map((x, i) => i === hi ? `<span class="q">${mBlank}</span>` : `<span>${show(x)}</span>`).join('');
      const extra = pick(pool.filter(x => !items.includes(x)));
      out.push({ kind: 'choose', key: 'e:квадрат' + (lv.figs ? ' фигуры' : ''), speech: [WT.magic], stim: { html: `<div class="wmagic">${cells}</div>` },
        options: shuffle(items.concat([extra])).map(x => ({ t: x, cls: 'emoji', ok: x === ans, html: show(x) })), after: [], fill: true, fillHtml: true });
    }
    return out;
  }
};

function workshopPhrases() {
  return [
    { g: 'Мастерская загадок: задания', items: Object.values(WT) },
    { g: 'Мастерская загадок: сказка', items: Object.values(WSTORY).map(s => s.t) }
  ];
}
