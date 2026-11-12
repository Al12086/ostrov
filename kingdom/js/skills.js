/* Тренажёр: навыки, ступени сложности, модель знаний ребёнка и новые задания.
   Каждый навык — лесенка ступеней от лёгкой к трудной. После каждого ответа уровень навыка
   пересчитывается: верно с первого раза — шаг вверх (быстро — шаг побольше), ошибка — шаг вниз.
   Цель — примерно 80% верных ответов: не скучно и не обидно. */
'use strict';

/* ---------- тексты (все попадают в список озвучки) ---------- */
const ST = {
  hidden: 'Какое число спряталось?',
  sticks: 'Сколько здесь палочек?',
  tensQ: 'Сколько десятков в числе', onesQ: 'Сколько единиц в числе',
  readTask: 'Прочитай задачу и найди ответ',
  clock: 'Сколько времени показывают часы?',
  coins: 'Сколько здесь рублей?',
  fillWord: 'Прочитай и найди слово, которое потерялось',
  readText: 'Прочитай рассказ. Послушай вопрос и найди ответ.',
  readTextQ: 'Прочитай рассказ и вопрос. Найди ответ.',
  instr: 'Прочитай и сделай',
  wpick: 'Найди, как пишется это слово',
  odd: 'Что здесь лишнее?',
  matrix: 'Какая фигура должна стоять на месте вопроса?',
  dict: 'Иди по стрелкам от звёздочки. Куда придёшь?',
  seqShow: 'Запомни, в каком порядке стоят картинки',
  seqAsk: 'Поставь картинки в том же порядке',
  schulte: 'Нажимай на числа по порядку, начиная с единицы',
  diff: 'Найди, что изменилось на правой картинке',
  findAll: 'Найди все такие же картинки, как эта',
  right: 'Что нарисовано справа от картинки в кружке?',
  left: 'Что нарисовано слева от картинки в кружке?',
  up: 'Что нарисовано над картинкой в кружке?',
  down: 'Что нарисовано под картинкой в кружке?',
  adv: 'Отправляемся в приключение!',
  advWin: 'Приключение пройдено! Ты большая молодец.',
  daily: 'Подарок дня! Ты пришла снова — держи звёздочки.',
  train: 'Потренируемся!',
  a: 'а'
};

/* ---------- слова посложнее: сочетания согласных и длинные слова ---------- */
const WL2 = mk([
  ['звезда','⭐','ЗВЕЗ-ДА'],['книга','📖','КНИ-ГА'],['слон','🐘','СЛОН'],['зонт','☂️','ЗОНТ'],['мост','🌉','МОСТ'],
  ['флаг','🚩','ФЛАГ'],['волк','🐺','ВОЛК'],['торт','🎂','ТОРТ'],['лампа','💡','ЛАМ-ПА'],['белка','🐿️','БЕЛ-КА'],
  ['ёлка','🎄','ЁЛ-КА'],['утка','🦆','УТ-КА'],['бабочка','🦋','БА-БОЧ-КА'],['пингвин','🐧','ПИН-ГВИН'],['черепаха','🐢','ЧЕ-РЕ-ПА-ХА'],
  ['крокодил','🐊','КРО-КО-ДИЛ'],['клубника','🍓','КЛУБ-НИ-КА'],['морковь','🥕','МОР-КОВЬ'],['яблоко','🍎','ЯБ-ЛО-КО'],['снеговик','⛄','СНЕ-ГО-ВИК'],
  ['самокат','🛴','СА-МО-КАТ'],['велосипед','🚲','ВЕ-ЛО-СИ-ПЕД'],['вертолёт','🚁','ВЕР-ТО-ЛЁТ'],['автобус','🚌','АВ-ТО-БУС'],['карандаш','✏️','КА-РАН-ДАШ'],
  ['колокольчик','🔔','КО-ЛО-КОЛЬ-ЧИК'],['кровать','🛏️','КРО-ВАТЬ'],['улитка','🐌','У-ЛИТ-КА'],['ананас','🍍','А-НА-НАС'],['тигр','🐯','ТИГР']
]);
const WL2S = WL2.filter(w => w.w.length <= 5);

/* ---------- предложения ---------- */
const SN_SUBJ = [['Кот', '🐱'], ['Пёс', '🐶'], ['Мама', '👩'], ['Папа', '👨'], ['Мишка', '🐻'], ['Зайка', '🐰'], ['Утка', '🦆'], ['Лиса', '🦊']];
const SN_ACT = [['спит', '💤'], ['поёт', '🎵'], ['читает', '📖'], ['рисует', '🎨'], ['ест суп', '🍲'], ['пьёт сок', '🧃'], ['играет в мяч', '⚽'], ['едет на машине', '🚗']];
const snText = (s, a) => SN_SUBJ[s][0] + ' ' + SN_ACT[a][0] + '.';

const FILL = [
  ['Мама варит ___.', 'суп', ['дом', 'луну']], ['Кот пьёт ___.', 'молоко', ['забор', 'книгу']], ['Птица сидит на ___.', 'ветке', ['супе', 'ложке']],
  ['Рыба живёт в ___.', 'воде', ['шкафу', 'машине']], ['Ночью светит ___.', 'луна', ['сок', 'шуба']], ['Зимой идёт ___.', 'снег', ['сыр', 'кот']],
  ['Папа читает ___.', 'книгу', ['ногу', 'лужу']], ['Пёс грызёт ___.', 'кость', ['окно', 'облако']], ['Летом ярко светит ___.', 'солнце', ['снег', 'шарф']],
  ['У принцессы на голове ___.', 'корона', ['кастрюля', 'рыба']], ['Корова даёт ___.', 'молоко', ['мёд', 'сок']], ['Пчела собирает ___.', 'мёд', ['камни', 'снег']],
  ['Мы пьём чай из ___.', 'чашки', ['шапки', 'ботинка']], ['Зубы чистят ___.', 'щёткой', ['ложкой', 'вилкой']], ['Самолёт летит по ___.', 'небу', ['морю', 'лесу']],
  ['Корабль плывёт по ___.', 'морю', ['небу', 'дороге']], ['В лесу растут ___.', 'грибы', ['тарелки', 'машины']], ['Под ёлкой лежат ___.', 'подарки', ['лужи', 'облака']],
  ['Кошка ловит ___.', 'мышку', ['тучу', 'ложку']], ['Ёжик несёт на спине ___.', 'яблоко', ['телевизор', 'лодку']], ['Девочка поливает ___.', 'цветы', ['книги', 'тучи']],
  ['Мальчик катается на ___.', 'санках', ['облаках', 'тарелках']], ['На ветке поёт ___.', 'птичка', ['рыбка', 'кастрюля']], ['Бабушка вяжет ___.', 'шарф', ['суп', 'дом']]
];
const fillText = f => f[0].replace('___', f[1]);

/* Короткие рассказы с вопросом. s — короткий (для первой ступени) */
const TEXTS = [
  { s: 1, t: 'У Оли есть кошка. Кошку зовут Мурка.', q: 'Как зовут кошку?', a: 'Мурка', d: ['Оля', 'Шарик'] },
  { s: 1, t: 'Петя пошёл в лес. В лесу он нашёл гриб.', q: 'Что нашёл Петя?', a: 'гриб', d: ['мяч', 'ёжика'] },
  { s: 1, t: 'Мама купила яблоки. Яблоки были красные.', q: 'Какие были яблоки?', a: 'красные', d: ['зелёные', 'жёлтые'] },
  { s: 1, t: 'У Кати живёт попугай. Его зовут Кеша.', q: 'Кто такой Кеша?', a: 'попугай', d: ['кот', 'щенок'] },
  { s: 1, t: 'Таня рисовала радугу. Радуга вышла яркая.', q: 'Что рисовала Таня?', a: 'радугу', d: ['солнце', 'дом'] },
  { s: 1, t: 'Белка нашла орехи. Она спрятала их в дупло.', q: 'Куда белка спрятала орехи?', a: 'в дупло', d: ['в нору', 'в гнездо'] },
  { t: 'Зимой Маша лепила снеговика. У снеговика был нос из морковки.', q: 'Из чего был нос у снеговика?', a: 'из морковки', d: ['из шишки', 'из яблока'] },
  { t: 'Зайка сидел под ёлкой. Вдруг пришла лиса. Зайка убежал.', q: 'Кто пришёл к зайке?', a: 'лиса', d: ['волк', 'медведь'] },
  { t: 'У Вовы день рождения. Ему исполнилось семь лет. Друзья подарили ему велосипед.', q: 'Что подарили Вове?', a: 'велосипед', d: ['машинку', 'книгу'] },
  { t: 'Утром Аня пила чай с мёдом. Потом она пошла в школу.', q: 'Куда пошла Аня?', a: 'в школу', d: ['в лес', 'в магазин'] },
  { t: 'Принцесса Лиза жила в замке. У неё был белый пони.', q: 'Какого цвета был пони?', a: 'белый', d: ['чёрный', 'рыжий'] },
  { t: 'Миша играл в футбол. Мяч улетел в кусты. Миша достал его палкой.', q: 'Куда улетел мяч?', a: 'в кусты', d: ['в окно', 'в реку'] },
  { t: 'Летом мы ездили на море. Там мы купались и строили замки из песка.', q: 'Из чего строили замки?', a: 'из песка', d: ['из снега', 'из кубиков'] },
  { t: 'Ночью на небе светила луна. Совы летали над лесом.', q: 'Кто летал над лесом?', a: 'совы', d: ['утки', 'бабочки'] },
  { t: 'Бабушка испекла пирог с вишней. Внуки съели весь пирог.', q: 'С чем был пирог?', a: 'с вишней', d: ['с капустой', 'с яблоком'] },
  { t: 'Осенью листья стали жёлтыми. Птицы улетели на юг.', q: 'Куда улетели птицы?', a: 'на юг', d: ['на север', 'в лес'] },
  { t: 'В пруду жила лягушка. Она ловила комаров и громко квакала.', q: 'Кого ловила лягушка?', a: 'комаров', d: ['рыбок', 'бабочек'] },
  { t: 'Папа и Саша пошли на рыбалку. Саша поймал большую рыбу, а папа — маленькую.', q: 'Кто поймал большую рыбу?', a: 'Саша', d: ['папа', 'мама'] },
  { t: 'Утром шёл дождь. Днём выглянуло солнце, и на небе появилась радуга.', q: 'Что появилось на небе?', a: 'радуга', d: ['туча', 'звезда'] },
  { t: 'Лена занимается гимнастикой. Она умеет делать мостик и шпагат.', q: 'Чем занимается Лена?', a: 'гимнастикой', d: ['плаванием', 'танцами'] },
  { t: 'Дима взял ракетку и мяч. Он пошёл играть в теннис с папой.', q: 'С кем Дима играл в теннис?', a: 'с папой', d: ['с мамой', 'с другом'] },
  { t: 'Соня поёт в хоре. Перед концертом она надела розовое платье.', q: 'Какое платье надела Соня?', a: 'розовое', d: ['голубое', 'белое'] }
];

/* Прочитай и сделай */
const INSTR_FIND = [['кота', '🐱'], ['рыбу', '🐟'], ['собаку', '🐶'], ['машину', '🚗'], ['луну', '🌙'], ['розу', '🌹'], ['сову', '🦉'], ['лису', '🦊'],
  ['мяч', '⚽'], ['дом', '🏠'], ['сыр', '🧀'], ['кита', '🐋'], ['торт', '🎂'], ['шар', '🎈'], ['ракету', '🚀'], ['гитару', '🎸'], ['корону', '👑'], ['банан', '🍌']];
const INSTR_CNT = [['звезды', '⭐', 1], ['мяча', '⚽', 0], ['яблока', '🍎', 0], ['цветка', '🌸', 0], ['шарика', '🎈', 0], ['рыбки', '🐟', 1], ['машинки', '🚗', 1], ['кота', '🐱', 0]];
const INSTR_PROP = [
  ['Найди то, что летает', '✈️', ['🚗', '🏠', '🐟']], ['Найди то, что плавает', '🐟', ['🐘', '🚲', '🌳']], ['Найди то, что можно съесть', '🍎', ['🧦', '🔑', '🪑']],
  ['Найди то, что светит', '💡', ['📕', '🧸', '🥄']], ['Найди то, что растёт', '🌳', ['🚗', '⚽', '📱']], ['Найди того, кто мяукает', '🐱', ['🐶', '🐮', '🐸']],
  ['Найди то, что надевают на голову', '🎩', ['🧤', '👟', '🧦']], ['Найди то, что холодное', '🧊', ['🔥', '☕', '🌞']], ['Найди того, кто живёт в воде', '🐬', ['🐻', '🦁', '🐔']],
  ['Найди то, чем рисуют', '🖍️', ['🍴', '🔨', '🧹']], ['Найди то, на чём ездят', '🚲', ['🛏️', '🪑', '📺']], ['Найди то, что звенит', '🔔', ['🧸', '🍞', '🧦']]
];
const NUMW = { 2: ['два', 'две'], 3: ['три', 'три'], 4: ['четыре', 'четыре'] };
const FIG_SHAPES = { circle: 'круг', square: 'квадрат', triangle: 'треугольник', rhomb: 'ромб', oval: 'овал' };
const FIG_COLORS = { red: ['#E53935', 'красный'], blue: ['#1E88E5', 'синий'], yellow: ['#FDD835', 'жёлтый'], green: ['#43A047', 'зелёный'] };
const fig = (s, c, small) => `<svg class="wfig ${small ? 'sm' : ''}" viewBox="0 0 100 100" style="fill:${FIG_COLORS[c][0]}">${T_SHAPES[s][1]}</svg>`;

/* Мир вокруг: календарь */
const DAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const DAYS_G = ['понедельника', 'вторника', 'среды', 'четверга', 'пятницы', 'субботы', 'воскресенья'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const SEASONS = ['зима', 'весна', 'лето', 'осень'], SEASONS_G = ['зимы', 'весны', 'лета', 'осени'];
const DAYS_I = ['понедельником', 'вторником', 'средой', 'четвергом', 'пятницей', 'субботой', 'воскресеньем'];
const qDayB = i => `Какой день недели идёт перед ${DAYS_I[i]}?`;
const qDayA = i => `Какой день недели идёт после ${DAYS_G[i]}?`;
const qMonth = i => `Какой месяц идёт после ${MONTHS_G[i]}?`;
const qSeason = i => `Какое время года наступает после ${SEASONS_G[i]}?`;

/* Текстовые задачи */
const TX_OBJ = [['яблоко', 'яблока', 'яблок', '🍎'], ['конфета', 'конфеты', 'конфет', '🍬'], ['шарик', 'шарика', 'шариков', '🎈'], ['цветок', 'цветка', 'цветов', '🌸'],
  ['звёздочка', 'звёздочки', 'звёздочек', '⭐'], ['машинка', 'машинки', 'машинок', '🚗'], ['бусинка', 'бусинки', 'бусинок', '📿'], ['ракушка', 'ракушки', 'ракушек', '🐚']];
const TX_NAMES = [['Маша', 'Маши', 'Ей', 1], ['Оля', 'Оли', 'Ей', 1], ['Аня', 'Ани', 'Ей', 1], ['Соня', 'Сони', 'Ей', 1], ['Петя', 'Пети', 'Ему', 0], ['Миша', 'Миши', 'Ему', 0], ['Дима', 'Димы', 'Ему', 0]];
const plural = (n, f) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]; };

/* ---------- помощники разметки ---------- */
const rWordOpt = (t, ok) => ({ t, cls: 'wordc', ok, html: `<span class="wtxt">${esc(t)}</span>` });
const rText = (t, cls) => `<div class="rtext ${cls || ''}">${esc(t).replace(/___/g, '<i class="blank" id="blank">?</i>')}</div>`;
const caps = (t, up) => up ? t.toUpperCase() : t;
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const emoGrid = (cells, cols, cls) => `<div class="egrid c${cols} ${cls || ''}">${cells.map(c => `<span>${c}</span>`).join('')}</div>`;
function sticks(n) {
  const t = Math.floor(n / 10), o = n % 10;
  return `<div class="sticks">${Array.from({ length: t }, () => '<span class="ten"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>').join('')}${Array.from({ length: o }, () => '<span class="one"></span>').join('')}</div>`;
}
function clockHM(h, m) {
  const nums = Array.from({ length: 12 }, (_, i) => { const n = i + 1, a = n * 30 * Math.PI / 180; return `<text x="${(100 + Math.sin(a) * 72).toFixed(1)}" y="${(100 - Math.cos(a) * 72 + 9).toFixed(1)}" text-anchor="middle">${n}</text>`; }).join('');
  const ticks = Array.from({ length: 12 }, (_, i) => `<line x1="100" y1="10" x2="100" y2="18" transform="rotate(${i * 30} 100 100)"/>`).join('');
  return `<svg class="tclock" viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" class="face"/>${ticks}${nums}
    <line x1="100" y1="100" x2="100" y2="34" class="min" transform="rotate(${m * 6} 100 100)"/><line x1="100" y1="100" x2="100" y2="58" class="hour" transform="rotate(${(h % 12) * 30 + m * 0.5} 100 100)"/><circle cx="100" cy="100" r="7" class="pin"/></svg>`;
}
const coin = v => `<span class="coin v${v}">${v}</span>`;
const hm = (h, m) => h + ':' + (m < 10 ? '0' : '') + m;

/* ---------- генераторы новых заданий: (параметры ступени, сколько) → задания ---------- */
const many = (n, f) => Array.from({ length: n }, f);
const SK_MAKE = {
  /* --- чтение --- */
  rWord: (p, n) => many(n, () => {
    const w = pick(p.pool), all = [WL2, W3, W2, WL].flat().filter(x => x.w.length === w.w.length && x.w !== w.w);
    const sim = x => x.w.split('').filter((ch, i) => ch === w.w[i]).length;
    let near = shuffle([...new Map(all.map(x => [x.w, x])).values()]).sort((a, b) => sim(b) - sim(a)).slice(0, 3);
    if (near.length < 3) {                 // для очень длинных слов берём слова близкой длины
      const more = [WL2, WL].flat().filter(x => x.w !== w.w && !near.includes(x)).sort((a, b) => Math.abs(a.w.length - w.w.length) - Math.abs(b.w.length - w.w.length));
      near = near.concat(more.slice(0, 3 - near.length));
    }
    return { kind: 'choose', key: 'wp:' + w.w, speech: [ST.wpick], stim: { emoji: w.e, small: true }, optsCls: 'grid2',
      options: shuffle([rWordOpt(caps(w.w, p.up), true)].concat(near.map(x => rWordOpt(caps(x.w, p.up), false)))), after: [w.w] };
  }),
  rSent: (p, n) => many(n, () => {
    const acts = p.short ? 4 : SN_ACT.length, sc = (s, a) => SN_SUBJ[s][1] + SN_ACT[a][1];
    const s = ri(0, SN_SUBJ.length - 1), a = ri(0, acts - 1);
    if (p.two) {
      let s2 = s, a2 = a; while (s2 === s) s2 = ri(0, SN_SUBJ.length - 1); while (a2 === a) a2 = ri(0, acts - 1);
      const t = SN_SUBJ[s][0] + ' ' + SN_ACT[a][0] + ', а ' + SN_SUBJ[s2][0].toLowerCase() + ' ' + SN_ACT[a2][0] + '.';
      let s3 = s; while (s3 === s || s3 === s2) s3 = ri(0, SN_SUBJ.length - 1);
      const two = (x, y) => ({ t: x + y, cls: 'scene two', html: `<span class="scn"><b>${x}</b><b>${y}</b></span>` });
      const o = [Object.assign(two(sc(s, a), sc(s2, a2)), { ok: true }), Object.assign(two(sc(s, a2), sc(s2, a)), { ok: false }), Object.assign(two(sc(s3, a), sc(s2, a2)), { ok: false })];
      return { kind: 'choose', key: 'sn2:' + s + a, speech: [T.pair], stim: { html: rText(caps(t, p.up), 'mid') }, options: shuffle(o), after: [snText(s, a), ST.a, snText(s2, a2)] };
    }
    let a2 = a; while (a2 === a) a2 = ri(0, acts - 1);
    let s2 = s; while (s2 === s) s2 = ri(0, SN_SUBJ.length - 1);
    const one = (x, ok) => ({ t: x, cls: 'scene', ok, html: `<span class="scn"><b>${x}</b></span>` });
    return { kind: 'choose', key: 'sn:' + s + '-' + a, speech: [T.pair], stim: { html: rText(caps(snText(s, a), p.up), 'big') },
      options: shuffle([one(sc(s, a), true), one(sc(s, a2), false), one(sc(s2, a), false)]), after: [snText(s, a)] };
  }),
  rFill: (p, n) => weightPick(p.easy ? FILL.slice(0, 12) : FILL, n, f => 'fl:' + f[1]).map(f => ({
    kind: 'choose', key: 'fl:' + f[1], speech: [ST.fillWord], stim: { html: rText(caps(f[0], p.up), 'mid') }, fill: true, fillHtml: true,
    options: shuffle([rWordOpt(caps(f[1], p.up), true)].concat(f[2].map(x => rWordOpt(caps(x, p.up), false)))), after: [fillText(f)] })),
  rText: (p, n) => weightPick(TEXTS.filter(x => !p.short || x.s), n, x => 'tx:' + x.q).map(x => ({
    kind: 'choose', key: 'tx:' + x.q, speech: p.qText ? [ST.readTextQ] : [ST.readText, x.q], side: true, optsCls: 'col',
    stim: { col: true, html: rText(caps(x.t, p.up), 'rstory') + (p.qText ? rText(x.q, 'q') : '') },
    options: shuffle([rWordOpt(x.a, true)].concat(x.d.map(d => rWordOpt(d, false)))), after: [] })),
  rInstr: (p, n) => many(n, () => {
    if (p.kind === 'find') {
      const [w, e] = pick(INSTR_FIND);
      const wrong = sample(INSTR_FIND.filter(x => x[1] !== e), 3);
      return { kind: 'choose', key: 'in:' + w, speech: [ST.instr], stim: { html: rText(caps('Найди ' + w, p.up), 'big') },
        options: shuffle([{ t: e, cls: 'emoji', ok: true }].concat(wrong.map(x => ({ t: x[1], cls: 'emoji', ok: false })))), after: [] };
    }
    if (p.kind === 'count') {
      const [w, e, fem] = pick(INSTR_CNT), k = ri(2, 4), e2 = pick(INSTR_CNT.filter(x => x[1] !== e))[1];
      const k2 = pick([2, 3, 4].filter(x => x !== k));
      const g = (em, c, ok) => ({ t: em + c, cls: 'grpc', ok, html: mGroup(em, c) });
      return { kind: 'choose', key: 'in:' + k + w, speech: [ST.instr], stim: { html: rText(caps('Найди, где ' + NUMW[k][fem] + ' ' + w, p.up), 'big') },
        options: shuffle([g(e, k, true), g(e, k2, false), g(e2, k, false)]), after: [] };
    }
    if (p.kind === 'fig') {
      const s = pick(Object.keys(FIG_SHAPES)), c = pick(Object.keys(FIG_COLORS));
      const s2 = pick(Object.keys(FIG_SHAPES).filter(x => x !== s)), c2 = pick(Object.keys(FIG_COLORS).filter(x => x !== c));
      const o = (ss, cc, ok) => ({ t: ss + cc, cls: 'emoji', ok, html: fig(ss, cc) });
      return { kind: 'choose', key: 'in:' + c + s, speech: [ST.instr], stim: { html: rText(caps('Найди ' + FIG_COLORS[c][1] + ' ' + FIG_SHAPES[s], p.up), 'big') },
        options: shuffle([o(s, c, true), o(s, c2, false), o(s2, c, false), o(s2, c2, false)]), after: [] };
    }
    const [q, e, d] = pick(INSTR_PROP);
    return { kind: 'choose', key: 'in:' + q, speech: [ST.instr], stim: { html: rText(caps(q, p.up), 'mid') },
      options: shuffle([{ t: e, cls: 'emoji', ok: true }].concat(d.map(x => ({ t: x, cls: 'emoji', ok: false })))), after: [] };
  }),

  /* --- математика --- */
  mAdd: (p, n) => many(n, () => {
    let a, b;
    if (p.k === 'n20no') { const x = ri(1, 7); a = 10 + x; b = ri(1, 9 - x); }
    else if (p.k === 'n20cross') { a = ri(6, 9); b = ri(11 - a, 9); }
    else if (p.k === 'tens') { a = ri(1, 8) * 10; b = ri(1, 9 - a / 10) * 10; }
    else if (p.k === 'td') { const u = ri(0, 7); a = ri(2, 8) * 10 + u; b = ri(1, 9 - u); }
    else { const u = ri(4, 9); a = ri(2, 8) * 10 + u; b = ri(10 - u, 9); }
    return { kind: 'choose', key: 'a:' + a + '+' + b, speech: [MT.howMuch, String(a), MT.plus, String(b)], tts: `Сколько будет ${a} плюс ${b}?`,
      stim: { html: mExpr([a, '+', b, '=', '?']) }, options: numOpts(a + b, 0, 100), after: [String(a + b)], fill: true };
  }),
  mSub: (p, n) => many(n, () => {
    let a, b;
    if (p.k === 'n20no') { a = ri(13, 19); b = ri(1, a - 10); }
    else if (p.k === 'n20cross') { a = ri(11, 17); b = ri(a - 9, 9); }
    else if (p.k === 'tens') { a = ri(3, 10) * 10; b = ri(1, a / 10 - 1) * 10; }
    else { const u = ri(2, 9); a = ri(2, 9) * 10 + u; b = ri(1, u); }
    return { kind: 'choose', key: 's:' + a + '-' + b, speech: [MT.howMuch, String(a), MT.minus, String(b)], tts: `Сколько будет ${a} минус ${b}?`,
      stim: { html: mExpr([a, '−', b, '=', '?']) }, options: numOpts(a - b, 0, 100), after: [String(a - b)], fill: true };
  }),
  mMiss: (p, n) => many(n, () => {
    const c = ri(4, p.hi), a = ri(1, c - 1), b = c - a, left = Math.random() < 0.5, ans = left ? a : b;
    return { kind: 'choose', key: 'ms:' + c + ':' + a, speech: [ST.hidden], stim: { html: mExpr(left ? ['?', '+', b, '=', c] : [a, '+', '?', '=', c]) },
      options: numOpts(ans, 0, p.hi), after: [String(ans)], fill: true };
  }),
  mSign: (p, n) => many(n, () => {
    const a = ri(p.lo, p.hi); let b;
    if (p.close && a > 12 && a % 11 && a % 10) b = +String(a).split('').reverse().join('');
    else { b = Math.random() < 0.15 ? a : ri(Math.max(p.lo, a - 6), Math.min(p.hi, a + 6)); }
    const ans = a > b ? '>' : a < b ? '<' : '=';
    return { kind: 'choose', key: 'sg:' + a + '?' + b, speech: [MT.sign], stim: { html: mExpr([a, '?', b]) },
      options: ['>', '<', '='].map(s => mOpt(s, s === ans)), after: [String(a), a > b ? MT.bigger : a < b ? MT.smaller : MT.equal, String(b)], fill: true };
  }),
  mSeq: (p, n) => many(n, () => {
    const st = p.step, len = 5;
    let s = st > 0 ? ri(p.lo, p.hi - st * (len - 1)) : ri(p.lo - st * (len - 1), p.hi);
    if (Math.abs(st) >= 5) s = Math.round(s / Math.abs(st)) * Math.abs(st) || Math.abs(st);
    const cells = Array.from({ length: len }, (_, i) => s + st * i), k = ri(1, len - 1), ans = cells[k];
    return { kind: 'choose', key: 'sq:' + st + ':' + s, speech: [MT.missing], stim: { html: mRow(cells.map((c, i) => i === k ? '?' : c)).replace('class="nrow"', 'class="nrow n5"') },
      options: Math.abs(st) > 1 ? [...new Set([ans, ans - 1, ans + 1, ans + Math.abs(st)])].filter(x => x >= 0).sort((a, b) => a - b).map(x => mOpt(x, x === ans)) : numOpts(ans, 0, 100),
      after: [String(ans)], fill: true };
  }),
  mTens: (p, n) => many(n, () => {
    const v = ri(p.lo, p.hi);
    if (p.q) {
      const tens = p.q === 'tens', ans = tens ? Math.floor(v / 10) : v % 10, other = tens ? v % 10 : Math.floor(v / 10);
      const set = [...new Set([ans, other, ans + 1, ans - 1, ans + 2].filter(x => x >= 0 && x <= 9))].slice(0, 3);
      return { kind: 'choose', key: 'tn:' + p.q + v, speech: [tens ? ST.tensQ : ST.onesQ, String(v)], tts: `${tens ? ST.tensQ : ST.onesQ} ${v}?`,
        stim: { html: mExpr([v]) }, options: set.sort((a, b) => a - b).map(x => mOpt(x, x === ans)), after: [String(ans)] };
    }
    return { kind: 'choose', key: 'tn:' + v, speech: [ST.sticks], stim: { html: sticks(v) }, options: numOpts(v, 0, 100, [v + 10, v - 10]), after: [String(v)] };
  }),
  mText: (p, n) => many(n, () => {
    const o = pick(TX_OBJ), [nm, gen, dat, fem] = pick(TX_NAMES), kind = pick(p.kinds);
    let a, b, ans, t;
    if (kind === 'plus') { a = ri(2, p.hi - 2); b = ri(1, p.hi - a); ans = a + b;
      t = `У ${gen} было ${a} ${plural(a, o)}. ${dat} подарили ещё ${b}. Сколько ${o[2]} стало у ${gen}?`; }
    else if (kind === 'minus') { a = ri(3, p.hi); b = ri(1, a - 1); ans = a - b;
      t = `У ${gen} было ${a} ${plural(a, o)}. ${nm} ${fem ? 'отдала' : 'отдал'} ${b} ${plural(b, o)} другу. Сколько ${o[2]} осталось?`; }
    else { const [nm2, gen2] = pick(TX_NAMES.filter(x => x[0] !== nm)); a = ri(3, p.hi); b = ri(1, a - 1); ans = a - b;
      t = `У ${gen} ${a} ${plural(a, o)}, а у ${gen2} — ${b}. На сколько у ${gen} больше?`; }
    const pic = p.pics ? (kind === 'minus' ? `<div class="grow">${mGroup(o[3], a, b)}</div>` : `<div class="grow">${mGroup(o[3], a)}<b class="opx">${kind === 'plus' ? '+' : '·'}</b>${mGroup(o[3], b)}</div>`) : '';
    return { kind: 'choose', key: 'tt:' + kind + a + b, speech: [ST.readTask], stim: { col: true, html: rText(t, 'task') + pic }, options: numOpts(ans, 0, p.hi + 2), after: [String(ans)] };
  }),
  mClock: (p, n) => many(n, () => {
    const h = ri(1, 12), m = p.half ? 30 : 0;
    const wrong = p.half ? [hm(h, 0), hm(h % 12 + 1, 30), hm((h + 10) % 12 + 1, 30)] : [];
    return { kind: 'choose', key: 'ck:' + h + ':' + m, speech: [ST.clock], stim: { html: clockHM(h, m) },
      options: shuffle([rWordOpt(hm(h, m), true)].concat(wrong.map(x => rWordOpt(x, false)))), after: [] };
  }),
  mCoins: (p, n) => many(n, () => {
    const k = ri(p.min, p.max), cs = Array.from({ length: k }, () => pick(p.vals)).sort((a, b) => b - a), sum = cs.reduce((a, b) => a + b, 0);
    return { kind: 'choose', key: 'cn:' + cs.join('+'), speech: [ST.coins], stim: { html: `<div class="coins">${cs.map(coin).join('')}</div>` },
      options: numOpts(sum, 1, 100, [sum + 1, sum - 1, sum + 5]), after: [String(sum)] };
  }),

  /* --- мир вокруг --- */
  wDays: (p, n) => many(n, () => {
    if (p.k === 'season') { const i = ri(0, 3), ans = SEASONS[(i + 1) % 4];
      return { kind: 'choose', key: 'dy:s' + i, speech: [qSeason(i)], stim: { ear: true, small: true }, options: shuffle(SEASONS.filter(x => x !== SEASONS[i]).map(x => rWordOpt(x, x === ans))), after: [ans] }; }
    if (p.k === 'month') { const i = ri(0, 11), ans = MONTHS[(i + 1) % 12];
      const wrong = sample(MONTHS.filter(x => x !== ans && x !== MONTHS[i]), 2);
      return { kind: 'choose', key: 'dy:m' + i, speech: [qMonth(i)], stim: { ear: true, small: true }, options: shuffle([rWordOpt(ans, true)].concat(wrong.map(x => rWordOpt(x, false)))), after: [ans] }; }
    const before = p.k === 'before' && Math.random() < 0.6, i = ri(0, 6), ans = DAYS[(i + (before ? 6 : 1)) % 7];
    const wrong = sample(DAYS.filter(x => x !== ans && x !== DAYS[i]), 2);
    return { kind: 'choose', key: 'dy:' + (before ? 'b' : 'a') + i, speech: [before ? qDayB(i) : qDayA(i)], stim: { ear: true, small: true },
      options: shuffle([rWordOpt(ans, true)].concat(wrong.map(x => rWordOpt(x, false)))), after: [ans] };
  }),
  wSpace: (p, n) => many(n, () => {
    const N = p.big ? 4 : 3, items = sample(W_ITEMS, N * N), dirs = p.dirs;
    const d = pick(dirs), dx = { right: 1, left: -1, up: 0, down: 0 }[d], dy = { right: 0, left: 0, up: -1, down: 1 }[d];
    let x, y; do { x = ri(0, N - 1); y = ri(0, N - 1); } while (x + dx < 0 || x + dx >= N || y + dy < 0 || y + dy >= N);
    const ri0 = y * N + x, ai = (y + dy) * N + x + dx, oi = (y - dy) * N + x - dx;
    const pool = [ai]; if (x - dx >= 0 && x - dx < N && y - dy >= 0 && y - dy < N) pool.push(oi);
    for (const j of shuffle(items.map((_, j) => j))) { if (pool.length >= 4) break; if (j !== ri0 && !pool.includes(j)) pool.push(j); }
    const cells = items.map((e, j) => j === ri0 ? `<b class="ref">${e}</b>` : e);
    return { kind: 'choose', key: 'sp:' + d, speech: [ST[d]], side: true, optsCls: 'grid2', stim: { html: emoGrid(cells, N, 'space') },
      options: shuffle(pool.map(j => ({ t: items[j], cls: 'emoji', ok: j === ai }))), after: [] };
  }),

  /* --- логика и память --- */
  lOdd: (p, n) => many(n, () => {
    const attrs = p.size ? ['color', 'shape', 'size'] : ['color', 'shape'], A = pick(attrs);
    const S0 = Object.keys(FIG_SHAPES), C0 = Object.keys(FIG_COLORS);
    const base = { shape: pick(S0), color: pick(C0), size: 0 };
    const vary = shuffle(attrs.filter(x => x !== A)).slice(0, p.vary);
    const same = [0, 1, 2].map(() => Object.assign({}, base)), odd = Object.assign({}, base);
    odd[A] = A === 'shape' ? pick(S0.filter(x => x !== base.shape)) : A === 'color' ? pick(C0.filter(x => x !== base.color)) : 1 - base.size;
    /* меняющиеся признаки раскладываем 2+2, чтобы лишней по ним не оказалась другая фигура */
    vary.forEach(v => { const [x, y] = v === 'shape' ? sample(S0, 2) : v === 'color' ? sample(C0, 2) : [0, 1]; same[0][v] = x; same[1][v] = y; same[2][v] = y; odd[v] = x; });
    const o = (f, ok) => ({ t: f.shape + f.color + f.size, cls: 'emoji', ok, html: fig(f.shape, f.color, f.size) });
    return { kind: 'choose', key: 'od:' + A + p.vary, speech: [ST.odd], stim: { ear: true, small: true }, options: shuffle(same.map(f => o(f, false)).concat([o(odd, true)])), after: [] };
  }),
  lMatrix: (p, n) => many(n, () => {
    const S3 = sample(['circle', 'square', 'triangle', 'rhomb', 'star'], 3), C3 = sample(Object.keys(FIG_COLORS), 3);
    const cell = (i, j) => p.latin ? [S3[(i + j) % 3], C3[i]] : [S3[i], C3[j]];
    const hi = p.last ? 8 : ri(0, 8), [as, ac] = cell(Math.floor(hi / 3), hi % 3);
    const f2 = (s, c) => `<svg class="wfig" viewBox="0 0 100 100" style="fill:${FIG_COLORS[c][0]}">${T_SHAPES[s][1]}</svg>`;
    const cells = Array.from({ length: 9 }, (_, k) => k === hi ? `<span class="q">${mBlank}</span>` : `<span>${f2(...cell(Math.floor(k / 3), k % 3))}</span>`).join('');
    const opts = [[as, ac], [as, pick(C3.filter(x => x !== ac))], [pick(S3.filter(x => x !== as)), ac], [pick(S3.filter(x => x !== as)), pick(C3.filter(x => x !== ac))]];
    const uniq = [...new Map(opts.map(o => [o.join(), o])).values()];
    return { kind: 'choose', key: 'mx:' + (p.latin ? 'l' : 'r'), speech: [ST.matrix], stim: { html: `<div class="wmagic">${cells}</div>` }, fill: true, fillHtml: true,
      options: shuffle(uniq.map(([s, c]) => ({ t: s + c, cls: 'emoji', ok: s === as && c === ac, html: f2(s, c) }))), after: [] };
  }),
  lDict: (p, n) => many(n, () => {
    const N = p.n, D = { '→': [1, 0], '←': [-1, 0], '↑': [0, -1], '↓': [0, 1] };
    let path, sx, sy, ex, ey;
    for (let tries = 0; tries < 200; tries++) {
      sx = ri(0, N - 1); sy = ri(0, N - 1); path = []; let x = sx, y = sy; const seen = new Set([x + ',' + y]);
      for (let k = 0; k < p.steps; k++) {
        const opts = Object.keys(D).filter(a => { const nx = x + D[a][0], ny = y + D[a][1]; return nx >= 0 && nx < N && ny >= 0 && ny < N && !seen.has(nx + ',' + ny); });
        if (!opts.length) break;
        const a = pick(opts); x += D[a][0]; y += D[a][1]; seen.add(x + ',' + y); path.push(a);
      }
      if (path.length === p.steps) { ex = x; ey = y; break; }
    }
    const walk = (fx, fy, list) => list.reduce(([x, y], a) => [x + D[a][0] * fx, y + D[a][1] * fy], [sx, sy]);
    const cand = [walk(-1, 1, path), walk(1, -1, path), walk(1, 1, path.slice(0, -1)), walk(-1, -1, path)]
      .filter(([x, y]) => x >= 0 && x < N && y >= 0 && y < N && !(x === ex && y === ey) && !(x === sx && y === sy));
    const spots = [[ex, ey]];
    for (const c of cand) if (!spots.some(s => s[0] === c[0] && s[1] === c[1])) spots.push(c);
    while (spots.length < 4) { const c = [ri(0, N - 1), ri(0, N - 1)]; if (!spots.some(s => s[0] === c[0] && s[1] === c[1]) && !(c[0] === sx && c[1] === sy)) spots.push(c); }
    const em = sample(W_ITEMS.filter(e => e !== '⭐'), 4), cells = Array(N * N).fill('');
    cells[sy * N + sx] = '<b class="start">⭐</b>';
    spots.slice(0, 4).forEach(([x, y], i) => { cells[y * N + x] = em[i]; });
    return { kind: 'choose', key: 'dc:' + p.steps, speech: [ST.dict], side: true, optsCls: 'grid2',
      stim: { col: true, html: emoGrid(cells, N, 'dict') + `<div class="arrows">${path.map(a => `<i>${a}</i>`).join('')}</div>` },
      options: shuffle(em.map((e, i) => ({ t: e, cls: 'emoji', ok: i === 0 }))), after: [] };
  }),
  lSeqMemo: (p, n) => many(n, () => {
    const seq = sample(W_ITEMS, p.len), extra = sample(W_ITEMS.filter(x => !seq.includes(x)), p.len > 4 ? 1 : 2);
    return { kind: 'assemble', raw: true, key: 'sm:' + p.len, memo: wRow(seq, 'memo'), memoSpeech: ST.seqShow, speech: [ST.seqAsk], stim: {},
      parts: seq, bank: shuffle(seq.concat(extra)), pcls: 'emo n' + p.len, after: [] };
  }),

  /* --- внимание --- */
  aSchulte: (p, n) => many(n, () => {
    const parts = Array.from({ length: p.n * p.n }, (_, i) => `<i class="c">${i + 1}</i>`);
    return { kind: 'assemble', grid: true, cols: p.n, raw: true, key: 'sh:' + p.n, speech: [ST.schulte], stim: {}, parts, bank: shuffle(parts), after: [] };
  }),
  aDiff: (p, n) => many(n, () => {
    const N = p.n, items = sample(W_ITEMS, N * N), k = ri(0, N * N - 1), right = items.slice();
    if (p.similar) {
      const g = pick(W_SIMILAR), [a, b] = sample(g, 2); items[k] = a; right[k] = b;
      for (let j = 0; j < items.length; j++) if (j !== k && g.includes(items[j])) { const rep = pick(W_ITEMS.filter(x => !items.includes(x) && !g.includes(x))); items[j] = right[j] = rep; }
    } else right[k] = pick(W_ITEMS.filter(x => !items.includes(x)));
    return { kind: 'choose', key: 'df:' + N + (p.similar ? 's' : ''), speech: [ST.diff], side: true, optsCls: 'cells c' + N,
      stim: { html: emoGrid(items, N, 'diff') }, options: right.map((e, j) => ({ t: e, cls: 'emoji cell', ok: j === k })), after: [] };
  }),
  aFind: (p, n) => many(n, () => {
    let target, pool;
    if (p.similar) { const g = pick(W_SIMILAR); target = pick(g); pool = g.filter(x => x !== target); }
    else { target = pick(W_ITEMS); pool = sample(W_ITEMS.filter(x => x !== target), 5); }
    const cells = shuffle(Array(p.k).fill(target).concat(Array.from({ length: p.cells - p.k }, () => pick(pool))));
    return { kind: 'assemble', grid: true, anyOrder: true, cols: p.cols, raw: true, key: 'fa:' + (p.similar ? 's' : '') + p.cells, speech: [ST.findAll],
      stim: { emoji: target, small: true }, parts: Array(p.k).fill(target), bank: cells, after: [] };
  })
};

/* ---------- области и навыки ---------- */
const AREAS = {
  read: { n: 'Чтение', e: '📖', bg: 'rose', w: 'castle' },
  math: { n: 'Математика', e: '🔢', bg: 'mint', w: 'garden' },
  world: { n: 'Мир вокруг', e: '🌍', bg: 'sky', w: 'tower' },
  logic: { n: 'Логика и память', e: '🧩', bg: 'peach', w: 'workshop' },
  att: { n: 'Внимание', e: '🎯', bg: 'lav', w: '' },
  music: { n: 'Слух и ритм', e: '🎵', bg: 'lilac', w: 'music' }
};
const AREA_OF_WORLD = { castle: 'read', garden: 'math', tower: 'world', workshop: 'logic', music: 'music' };
const t_ = (m, p) => ({ m, p: p || {} });
const SKILLS = [
  /* чтение */
  { id: 'r_sound', a: 'read', n: 'Звуки и буквы', tiers: [t_('first', { first: FIRST_VOWEL }), t_('first', { first: FIRST_CONS1 }), t_('first', { first: FIRST_CONS2 }),
    t_('missing', { words: W2 }), t_('missing', { words: W3 }), t_('missing', { words: WL }), t_('missing', { words: WL2 })] },
  { id: 'r_syl', a: 'read', n: 'Слоги', tiers: [t_('hear', { syl: SYL.all }), t_('merge', { syl: SYL.all }), t_('sylpic', { syl: SYL.all, pics: SYLPIC.all })] },
  { id: 'r_words', a: 'read', n: 'Чтение слов', tiers: [t_('read', { words: W2A }), t_('read', { words: W2B }), t_('read', { words: W3 }), t_('read', { words: WL }), t_('read', { words: WL2 })] },
  { id: 'r_wpick', a: 'read', n: 'Узнай слово', tiers: [t_('rWord', { pool: W3, up: 1 }), t_('rWord', { pool: W2, up: 1 }), t_('rWord', { pool: WL, up: 1 }), t_('rWord', { pool: W2 }), t_('rWord', { pool: WL2 })] },
  { id: 'r_build', a: 'read', n: 'Составь слово', tiers: [t_('build', { words: W2A }), t_('spell', { words: W3 }), t_('build', { words: WL }), t_('spell', { words: W2 }), t_('spell', { words: WL2S })] },
  { id: 'r_sent', a: 'read', n: 'Предложения', tiers: [t_('rSent', { short: 1, up: 1 }), t_('rSent', { up: 1 }), t_('rSent', {}), t_('rSent', { two: 1 })] },
  { id: 'r_fill', a: 'read', n: 'Вставь слово', tiers: [t_('rFill', { easy: 1, up: 1 }), t_('rFill', { easy: 1 }), t_('rFill', {})] },
  { id: 'r_text', a: 'read', n: 'Понимание текста', tiers: [t_('rText', { short: 1, up: 1 }), t_('rText', { short: 1 }), t_('rText', {}), t_('rText', { qText: 1 })] },
  { id: 'r_instr', a: 'read', n: 'Прочитай и сделай', tiers: [t_('rInstr', { kind: 'find', up: 1 }), t_('rInstr', { kind: 'find' }), t_('rInstr', { kind: 'count' }), t_('rInstr', { kind: 'fig' }), t_('rInstr', { kind: 'prop' })] },
  /* математика */
  { id: 'm_count', a: 'math', n: 'Числа', tiers: [t_('count', { lo: 1, hi: 10 }), t_('hearnum', { lo: 10, hi: 20 }), t_('hearnum', { lo: 20, hi: 50 }), t_('hearnum', { lo: 50, hi: 100 })] },
  { id: 'm_tens', a: 'math', n: 'Десятки и единицы', tiers: [t_('mTens', { lo: 11, hi: 30 }), t_('mTens', { lo: 21, hi: 59 }), t_('mTens', { lo: 11, hi: 99, q: 'tens' }), t_('mTens', { lo: 11, hi: 99, q: 'ones' })] },
  { id: 'm_cmp', a: 'math', n: 'Сравнение чисел', tiers: [t_('bigger'), t_('mSign', { lo: 1, hi: 10 }), t_('mSign', { lo: 5, hi: 20 }), t_('mSign', { lo: 10, hi: 100 }), t_('mSign', { lo: 12, hi: 98, close: 1 })] },
  { id: 'm_seq', a: 'math', n: 'Числовой ряд', tiers: [t_('next', { lo: 1, hi: 10 }), t_('missrow', { lo: 1, hi: 20 }), t_('mSeq', { step: 1, lo: 20, hi: 100 }), t_('mSeq', { step: -1, lo: 1, hi: 30 }),
    t_('mSeq', { step: 2, lo: 2, hi: 30 }), t_('mSeq', { step: 10, lo: 10, hi: 100 }), t_('mSeq', { step: 5, lo: 5, hi: 60 })] },
  { id: 'm_add', a: 'math', n: 'Сложение', tiers: [t_('addpic', { lo: 2, hi: 6 }), t_('add', { lo: 2, hi: 10 }), t_('mAdd', { k: 'n20no' }), t_('mAdd', { k: 'n20cross' }), t_('mAdd', { k: 'tens' }), t_('mAdd', { k: 'td' }), t_('mAdd', { k: 'tdc' })] },
  { id: 'm_sub', a: 'math', n: 'Вычитание', tiers: [t_('subpic', { lo: 3, hi: 8 }), t_('sub', { lo: 3, hi: 10 }), t_('mSub', { k: 'n20no' }), t_('mSub', { k: 'n20cross' }), t_('mSub', { k: 'tens' }), t_('mSub', { k: 'td' })] },
  { id: 'm_comp', a: 'math', n: 'Состав числа', tiers: [t_('house', { lo: 2, hi: 6 }), t_('house', { lo: 6, hi: 10 }), t_('mMiss', { hi: 10 }), t_('mMiss', { hi: 20 })] },
  { id: 'm_task', a: 'math', n: 'Задачи', tiers: [t_('tale', { lo: 3, hi: 8 }), t_('mText', { pics: 1, hi: 8, kinds: ['plus', 'minus'] }), t_('mText', { hi: 10, kinds: ['plus', 'minus'] }), t_('mText', { hi: 15, kinds: ['plus', 'minus', 'cmp'] })] },
  { id: 'm_time', a: 'math', n: 'Часы и монеты', tiers: [t_('tClock'), t_('mCoins', { vals: [1, 2, 5], min: 2, max: 3 }), t_('mClock', { half: 1 }), t_('mCoins', { vals: [1, 2, 5, 10], min: 3, max: 4 })] },
  /* мир вокруг */
  { id: 'w_nature', a: 'world', n: 'Природа и животные', tiers: [t_('tHome'), t_('tSound'), t_('tClass'), t_('tFood'), t_('tOdd1'), t_('tCmp')] },
  { id: 'w_things', a: 'world', n: 'Вещи и люди', tiers: [t_('tColor'), t_('tShape'), t_('tTrans'), t_('tJob'), t_('tOdd2'), t_('tWear'), t_('tFrom'), t_('tSafe')] },
  { id: 'w_time', a: 'world', n: 'Время и календарь', tiers: [t_('tDay'), t_('tSeason'), t_('tOrder'), t_('wDays', { k: 'season' }), t_('wDays', { k: 'after' }), t_('wDays', { k: 'before' }), t_('wDays', { k: 'month' })] },
  { id: 'w_space', a: 'world', n: 'Право, лево, верх, низ', tiers: [t_('wSpace', { dirs: ['up', 'down'] }), t_('wSpace', { dirs: ['left', 'right'] }), t_('wSpace', { dirs: ['left', 'right', 'up', 'down'], big: 1 })] },
  /* логика и память */
  { id: 'l_pattern', a: 'logic', n: 'Закономерности', tiers: [t_('wPattern', { kinds: ['ABAB'] }), t_('wPattern', { kinds: ['AAB', 'ABB', 'ABC'] }), t_('wMagic'), t_('wPattern', { kinds: ['ABC', 'AABB'], figs: true }),
    t_('wNum'), t_('lMatrix', { last: 1 }), t_('lMatrix', {}), t_('lMatrix', { latin: 1 })] },
  { id: 'l_memo', a: 'logic', n: 'Память', tiers: [t_('wMemoWas', { memo: 3 }), t_('wMemoGone', { memo: 4 }), t_('lSeqMemo', { len: 3 }), t_('wMemoWas', { memo: 5 }), t_('wMemoNew', { memo: 5 }),
    t_('lSeqMemo', { len: 4 }), t_('wMemoGone', { memo: 6 }), t_('lSeqMemo', { len: 5 })] },
  { id: 'l_visual', a: 'logic', n: 'Внимательный глаз', tiers: [t_('wSame'), t_('wShadow', { shadow: W_SHADOW_EASY }), t_('wSize', { sizes: 3 }), t_('lOdd', { vary: 0 }), t_('wShadow', { shadow: W_SHADOW_HARD }),
    t_('lOdd', { vary: 1 }), t_('wSize', { sizes: 4 }), t_('lOdd', { vary: 2, size: 1 })] },
  { id: 'l_dict', a: 'logic', n: 'Графический диктант', tiers: [t_('lDict', { n: 4, steps: 2 }), t_('lDict', { n: 4, steps: 3 }), t_('lDict', { n: 5, steps: 4 }), t_('lDict', { n: 5, steps: 6 })] },
  /* внимание */
  { id: 'a_schulte', a: 'att', n: 'Числа по порядку', tiers: [t_('aSchulte', { n: 3 }), t_('aSchulte', { n: 4 }), t_('aSchulte', { n: 5 })] },
  { id: 'a_diff', a: 'att', n: 'Найди отличие', tiers: [t_('aDiff', { n: 3 }), t_('aDiff', { n: 3, similar: 1 }), t_('aDiff', { n: 4 }), t_('aDiff', { n: 4, similar: 1 })] },
  { id: 'a_find', a: 'att', n: 'Найди все', tiers: [t_('aFind', { cells: 9, cols: 3, k: 3 }), t_('aFind', { cells: 12, cols: 4, k: 4, similar: 1 }), t_('aFind', { cells: 16, cols: 4, k: 5, similar: 1 })] },
  /* слух */
  { id: 'h_pitch', a: 'music', n: 'Высота звука', tiers: [t_('hHigh'), t_('hHigher'), t_('hUpDown'), t_('hHighest')] },
  { id: 'h_rhythm', a: 'music', n: 'Ритм', tiers: [t_('hLong'), t_('hCount', { max: 5 }), t_('hRhythm', { beats: 3 }), t_('hCount', { max: 7, fast: true }), t_('hRhythm', { beats: 4 })] },
  { id: 'h_mem', a: 'music', n: 'Музыкальная память', tiers: [t_('hSimon', { seq: [2, 3] }), t_('hSimon', { seq: [3, 4] }), t_('hSimon', { seq: [4, 5] }), t_('hSimon', { seq: [5, 6] })] },
  { id: 'h_timbre', a: 'music', n: 'Тембр и громкость', tiers: [t_('hLouder'), t_('hSame'), t_('hInstr', { instr: ['drum', 'bell', 'guitar'] }), t_('hInstr', { instr: ['drum', 'bell', 'guitar', 'trumpet', 'piano'] })] }
];
const SK = {}; SKILLS.forEach(s => { SK[s.id] = s; });

/* ---------- модель знаний ---------- */
const Skills = (() => {
  const top = s => s.tiers.length - 1;
  const g3 = () => S.grade === 3 && typeof SKILLS3 !== 'undefined';
  const pool = () => g3() ? SKILLS3 : SKILLS;
  function start(s) {
    /* стартовая ступень — по тому, сколько уровней мира уже пройдено */
    const w = AREAS[s.a].w; let f = 0;
    if (w && WORLDS[w]) { const lv = WORLDS[w].levels; f = lv.filter((_, i) => S.stars[sk(i + 1, w)]).length / lv.length; }
    return { r: Math.round(f * top(s) * 0.6 * 10) / 10, n: 0, h: '', t: 0 };
  }
  const st = id => S.sk[id] || (S.sk[id] = start(SK[id]));
  const mastery = id => { const s = SK[id], x = st(id); return top(s) ? Math.min(1, x.r / top(s)) : 1; };
  const acc = id => { const h = st(id).h; return h.length ? h.split('').filter(c => c === '1').length / h.length : null; };
  const areaM = a => { const l = pool().filter(s => s.a === a); return l.reduce((x, s) => x + mastery(s.id), 0) / l.length; };

  /* План приключения: сколько заданий из каждой области. Отстающим областям — больше. */
  const BASE0 = { read: 3.2, math: 3, logic: 2, world: 1.6, att: 1.4, music: 1 };
  const BASE3 = { math: 3, rus: 3, read: 1.6, world: 1.6, eng: 1.4, logic: 1.4, att: 1, music: 0.8 };
  const base = () => g3() ? BASE3 : BASE0;
  function plan(area, N) {
    N = N || 12;
    if (area) return Array(N).fill(area);
    const BASE = base(), ids = Object.keys(BASE), m = {}; ids.forEach(a => { m[a] = areaM(a); });
    const mean = ids.reduce((x, a) => x + m[a], 0) / ids.length;
    const w = {}; ids.forEach(a => { w[a] = BASE[a] * (1 + 2.5 * Math.max(0, mean - m[a])); });
    const W = ids.reduce((x, a) => x + w[a], 0), cnt = {};
    ids.forEach(a => { cnt[a] = Math.max(1, Math.floor(N * w[a] / W)); });
    if (g3()) { cnt.rus = Math.max(cnt.rus, 2); cnt.math = Math.max(cnt.math, 2); }
    else cnt.read = Math.max(cnt.read, 3);                              // чтение — каждый раз, но вперемешку
    let left = N - ids.reduce((x, a) => x + cnt[a], 0);
    const byRest = ids.slice().sort((a, b) => (N * w[b] / W % 1) - (N * w[a] / W % 1));
    for (let i = 0; left > 0; i++, left--) cnt[byRest[i % ids.length]]++;
    for (let i = 0; left < 0; i++) { const a = ids.slice().sort((x, y) => cnt[y] - cnt[x])[0]; cnt[a]--; left++; }
    const out = []; let prev = '';
    for (let k = 0; k < N; k++) {
      const can = ids.filter(a => cnt[a] > 0 && a !== prev), from = can.length ? can : ids.filter(a => cnt[a] > 0);
      const a = from.sort((x, y) => (cnt[y] + Math.random() * 1.5) - (cnt[x] + Math.random() * 1.5))[0];
      out.push(a); cnt[a]--; prev = a;
    }
    return out;
  }

  /* Следующее задание из области: навык выбираем по слабости, давности и разнообразию */
  function next(area, done) {
    const list = pool().filter(s => s.a === area), now = Date.now();
    const mean = list.reduce((x, s) => x + mastery(s.id), 0) / list.length;
    const score = list.map(s => {
      const x = st(s.id), a = acc(s.id), used = done.filter(d => d.skill === s.id);
      let w = 1;
      if (x.n === 0) w += 1.2;
      if (a !== null && x.h.length >= 3) w += (1 - a) * 2.5;
      w += Math.max(0, mean - mastery(s.id)) * 3;
      w += Math.min(2, (now - (x.t || 0)) / 864e5);                     // давно не тренировали — пора вспомнить
      if (used.length) w *= used[used.length - 1].ok ? 0.25 / used.length : 1.4;
      if (done.length && done[done.length - 1].skill === s.id) w *= 0.05;
      return { s, w: w * (0.6 + Math.random() * 0.8) };
    }).sort((a, b) => b.w - a.w);
    const s = score[0].s, x = st(s.id);
    let tier = Math.floor(x.r + 1e-9);
    const u = Math.random();
    if (u < 0.15 && tier < top(s)) tier++;                               // иногда — на ступеньку выше: проверить, готова ли
    else if (u > 0.9 && tier > 0) tier--;                                // иногда — полегче: для уверенности
    const T = s.tiers[tier];
    let r = null;
    for (let k = 0; k < 5 && !r; k++) {
      const c = MAKE[T.m](T.p, 1)[0];
      if (c && (!done.some(d => d.key === c.key) || k === 4)) r = c;
    }
    r.skill = s.id; r.tier = tier; r.area = area;
    return r;
  }

  /* Результат задания: ok — с первой попытки, ms — сколько думала */
  function record(r, ok, ms) {
    if (!r || !r.skill) return 0;
    const s = SK[r.skill], x = st(r.skill), base = Math.floor(x.r + 1e-9), warm = x.n < 6;
    const before = x.r;
    if (ok) x.r += (warm ? 0.6 : ms < 7000 ? 0.18 : 0.12) * (r.tier >= base ? 1 : 0.3);
    else x.r -= (warm ? 0.45 : 0.6) * (r.tier <= base ? 1 : 0.4);
    x.r = Math.round(Math.max(0, Math.min(top(s) + 0.99, x.r)) * 100) / 100;
    x.n++; x.t = Date.now(); x.h = (x.h + (ok ? '1' : '0')).slice(-12);
    return x.r - before;
  }

  function report() {
    return Object.keys(base()).map(a => ({ a, n: AREAS[a].n, e: AREAS[a].e, m: areaM(a),
      skills: pool().filter(s => s.a === a).map(s => { const x = st(s.id); return { id: s.id, n: s.n, tier: Math.min(top(s), Math.floor(x.r)) + 1, tiers: s.tiers.length, m: mastery(s.id), acc: acc(s.id), cnt: x.n, t: x.t }; }) }));
  }
  return { plan, next, record, report, mastery, areaM, st, areas: () => Object.keys(base()), g3 };
})();

/* Фразы тренажёра для озвучки */
function skillPhrases() {
  const uniq = a => [...new Set(a)];
  const sents = []; SN_SUBJ.forEach((_, s) => SN_ACT.forEach((__, a) => sents.push(snText(s, a))));
  return [
    { g: 'Тренажёр: задания', items: Object.values(ST) },
    { g: 'Тренажёр: вопросы к рассказам', items: TEXTS.map(x => x.q) },
    { g: 'Тренажёр: календарь', items: DAYS.map((_, i) => qDayA(i)).concat(DAYS.map((_, i) => qDayB(i)), MONTHS.map((_, i) => qMonth(i)), SEASONS.map((_, i) => qSeason(i)), DAYS, MONTHS, SEASONS) },
    { g: 'Тренажёр: предложения', items: sents.concat(FILL.map(fillText)) },
    { g: 'Тренажёр: новые слова', items: uniq(WL2.map(w => w.w)) },
    { g: 'Числа от 21 до 100', items: mRange(21, 100).map(String) }
  ];
}
