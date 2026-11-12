/* Графика: принцесса, здания королевства, фоны. Всё рисуется вектором (SVG). */
'use strict';

const SKIN = ['#FFE3D0', '#F7CDAA', '#DDA77B', '#A9714B'];
const HAIR = ['#F2CE72', '#C98A3B', '#7A4A2B', '#2E2230', '#E2703A', '#F29BC0'];
const EYES = ['#4F86E8', '#5DA85D', '#8B5A2B', '#6E7B8B'];
const STYLE_NAMES = ['Длинные', 'Хвостики', 'Пучок'];

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
}

function crownSVG(kind) {
  const gold = '#FFC94D', gd = '#E09B1A';
  switch (kind) {
    case 'tiara': return `<path d="M76 62 Q110 36 144 62" fill="none" stroke="${gold}" stroke-width="6" stroke-linecap="round"/>
      <path d="M110 34 c-5-8-16-2-10 7 l10 11 10-11 c6-9-5-15-10-7z" fill="#FF5C8D" stroke="${gd}" stroke-width="1.5"/>
      <circle cx="88" cy="52" r="3.5" fill="#fff"/><circle cx="132" cy="52" r="3.5" fill="#fff"/>`;
    case 'wreath': return [[74, 66, '#FF8FB8'], [88, 54, '#FFD166'], [104, 48, '#B79CF0'], [120, 49, '#FF8FB8'], [134, 55, '#7ED6BE'], [147, 66, '#FFD166']]
      .map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle r="4.6" cx="0" cy="-5.5" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="3.2" fill="#fff6c9"/></g>`).join('');
    case 'bow': return `<g transform="translate(110 46)"><path d="M0 0 C-14-20-38-18-36 2 C-38 20-14 16 0 4z" fill="#FF6FA5" stroke="#D6336C" stroke-width="2"/>
      <path d="M0 0 C14-20 38-18 36 2 C38 20 14 16 0 4z" fill="#FF6FA5" stroke="#D6336C" stroke-width="2"/><circle r="8" cy="2" fill="#FF9CC0" stroke="#D6336C" stroke-width="2"/></g>`;
    case 'big': return `<path d="M78 60 L70 22 L90 40 L100 14 L110 38 L120 14 L130 40 L150 22 L142 60 Q110 52 78 60z" fill="${gold}" stroke="${gd}" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="70" cy="22" r="4.5" fill="#FF5C8D"/><circle cx="100" cy="14" r="4.5" fill="#7ED6BE"/><circle cx="120" cy="14" r="4.5" fill="#7ED6BE"/><circle cx="150" cy="22" r="4.5" fill="#FF5C8D"/>
      <circle cx="110" cy="48" r="5.5" fill="#FF5C8D" stroke="#fff" stroke-width="1.5"/><circle cx="92" cy="51" r="3" fill="#8CC8FF"/><circle cx="128" cy="51" r="3" fill="#8CC8FF"/>`;
    default: return `<path d="M86 60 L82 34 L97 46 L110 26 L123 46 L138 34 L134 60 Q110 54 86 60z" fill="${gold}" stroke="${gd}" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="110" cy="26" r="4" fill="#FF5C8D"/><circle cx="82" cy="34" r="3.2" fill="#fff"/><circle cx="138" cy="34" r="3.2" fill="#fff"/><circle cx="110" cy="50" r="4" fill="#FF5C8D"/>`;
  }
}

function accSVG(kind, hx, hy) {
  switch (kind) {
    case 'wand': return `<g transform="translate(${hx} ${hy})"><line x1="0" y1="6" x2="22" y2="-46" stroke="#B98A4A" stroke-width="5" stroke-linecap="round"/>
      <path transform="translate(24 -54) scale(1.25)" d="M0-13 L3.8-4.2 13-3.6 5.8 2.6 8 12 0 6.8 -8 12 -5.8 2.6 -13-3.6 -3.8-4.2z" fill="#FFD166" stroke="#E09B1A" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="42" cy="-70" r="2.5" fill="#fff"/><circle cx="6" cy="-66" r="2" fill="#fff"/></g>`;
    case 'ribbon': return `<g transform="translate(${hx} ${hy})"><line x1="0" y1="6" x2="14" y2="-36" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <path d="M14-36 C40-70 -6-80 22-104 C46-124 10-136 30-156" fill="none" stroke="#FF5C8D" stroke-width="7" stroke-linecap="round"/>
      <path d="M14-36 C40-70 -6-80 22-104 C46-124 10-136 30-156" fill="none" stroke="#FFC4DA" stroke-width="2.5" stroke-linecap="round"/></g>`;
    case 'racket': return `<g transform="translate(${hx} ${hy}) rotate(18)"><line x1="0" y1="8" x2="0" y2="-30" stroke="#7D5BD0" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="0" cy="-58" rx="22" ry="28" fill="#fff" fill-opacity=".55" stroke="#FF5C8D" stroke-width="5"/>
      <path d="M-14-76 V-40 M-5-84 V-32 M5-84 V-32 M14-76 V-40 M-20-66 H20 M-22-56 H22 M-20-46 H20" stroke="#D9A3BC" stroke-width="1.2"/>
      <circle cx="34" cy="-80" r="8" fill="#D6F25A" stroke="#A9C52F" stroke-width="1.5"/></g>`;
    case 'mic': return `<g transform="translate(${hx} ${hy}) rotate(-14)"><rect x="-5" y="-30" width="10" height="38" rx="5" fill="#5B4B9A"/>
      <circle cx="0" cy="-38" r="12" fill="#C9B6F2" stroke="#7D5BD0" stroke-width="2.5"/><path d="M-8-42 H8 M-10-36 H10" stroke="#7D5BD0" stroke-width="1.2"/>
      <path d="M22-60 v-16 l10-3 v16" fill="none" stroke="#FF5C8D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19" cy="-60" r="4" fill="#FF5C8D"/><circle cx="29" cy="-63" r="4" fill="#FF5C8D"/></g>`;
    default: return '';
  }
}

/* ---------- принцессы-картинки (мягкий 3D) ---------- */
const HERO_LOOKS = [
  { n: 'Злата' }, { n: 'Мила' }, { n: 'Амира' }, { n: 'Алиса' }, { n: 'Особая', special: true },
  { n: 'Особая', special: true, thumb: 't5.webp' }      // вторая особая — для игры племянницы (3 класс)
];
const HERO_ANCHOR = [[[50.5, 16.9], [58.2, 15.4], [49.0, 16.2], [55.8, 25.0]], [[50.7, 16.3], [52.3, 15.4], [48.7, 16.2], [53.0, 25.0]], [[49.5, 18.6], [49.7, 15.7], [47.5, 15.8], [39.0, 21.4]], [[50.3, 16.3], [52.7, 15.4], [49.3, 15.7], [54.3, 24.8]], [[45.8, 16.8], [49.3, 16.6], [43.3, 16.4], [55.2, 26.6]]];
HERO_ANCHOR[5] = HERO_ANCHOR[4];   // где макушка в каждой позе: [x%, y%]
const CROWN_W = { simple: 26, tiara: 28, wreath: 30, bow: 26, big: 27 };
const CROWN_DY = { simple: 4.3, tiara: 5.4, wreath: 5.8, bow: 5.4, big: 6.2 };
/* короны, нарисованные прямо на принцессе (лучший вид); для остальных — корона выглядывает из-за головы */
const HERO_BAKED = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };   // у всех пяти короны нарисованы   // насколько корона «садится» в волосы, % высоты
const HERO_MOODS = { happy: 0, cheer: 1, think: 2, sleep: 3 };
/* Цвет платья накладывается поверх розового: color сохраняет объём и складки */
const DRESS_TINT = {
  berry: { bg: '#E0457F' }, lav: { bg: '#B79CF0' }, mint: { bg: '#3FCBA0' }, sky: { bg: '#5AAEFF' }, sun: { bg: '#FFC233' },
  night: { bg: '#4B3A9A', dark: '#8C7FD6', stars: true },
  rainbow: { bg: 'linear-gradient(180deg,#FF6FA5 0%,#FFC94D 34%,#7ED6BE 58%,#8CC8FF 78%,#B79CF0 100%)' }
};
function heroLook(hero) {
  let l = hero && hero.look;
  if (l == null || !HERO_LOOKS[l]) l = 0;
  if (HERO_LOOKS[l].special && !(typeof S !== 'undefined' && S.set && +S.set.special === l && HERO_LOOKS[l].ready !== false)) l = 0;
  return l;
}
function heroArt(hero, wear, mood) {
  const L = heroLook(hero), k = HERO_MOODS[mood] || 0, c = wear.crown === 'none' ? 'none' : CROWN_W[wear.crown] ? wear.crown : 'simple';
  const baked = c !== 'none' && !!HERO_BAKED[L];
  const base = `img/hero/h${L}_${k}${baked ? '_' + c : ''}`;
  const t = DRESS_TINT[wear.dress], m = `-webkit-mask-image:url(${base}m.webp);mask-image:url(${base}m.webp)`;
  let dr = '';
  if (t) dr = `<i class="dr" style="background:${t.bg};${m}"></i>` + (t.dark ? `<i class="dr mul" style="background:${t.dark};${m}"></i>` : '') + (t.stars ? `<i class="dr stars" style="${m}"></i>` : '');
  const [ax, ay] = HERO_ANCHOR[L][k];
  const cr = baked || c === 'none' ? '' : `<img class="crown c-${c}" src="img/wear/crown_${c}.webp" alt="" draggable="false" style="left:${ax}%;top:${ay + CROWN_DY[c] * (k === 3 ? 0.7 : 1)}%;width:${CROWN_W[c]}%${k === 3 ? ';--r:16deg' : ''}">`;
  const acc = wear.acc && wear.acc !== 'none' ? `<img class="acc" src="img/wear/${wear.acc}.webp" alt="" draggable="false">` : '';
  return `<div class="hart m${k}">${cr}<img class="body" src="${base}.webp" alt="" draggable="false">${dr}${acc}</div>`;
}

/* hero: {skin,hair,style,eyes}; wear: {dress,crown,acc}; mood: happy | cheer | think | sleep */
function heroSVG(hero, wear, mood) {
  mood = mood || 'happy';
  const skin = SKIN[hero.skin] || SKIN[0], hair = HAIR[hero.hair] || HAIR[0], hairD = shade(hair, 0.82);
  const eye = EYES[hero.eyes] || EYES[0];
  const d = DRESS[wear.dress] || DRESS.rose;
  const skinD = shade(skin, 0.9);
  const cheer = mood === 'cheer';
  const lHand = cheer ? [50, 122] : [58, 216];
  const rHand = cheer && wear.acc === 'none' ? [170, 122] : [164, 214];

  let back = '';
  if (hero.style === 0) back = `<path d="M60 92 C42 150 46 206 62 226 Q110 240 158 226 C174 206 178 150 160 92 C160 56 60 56 60 92z" fill="${hair}"/>
    <path d="M70 150 C64 190 68 214 74 226 M150 150 C156 190 152 214 146 226" stroke="${hairD}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;
  else if (hero.style === 1) back = `<path d="M62 92 C30 96 22 140 34 176 C44 196 60 176 58 150 C56 130 64 112 70 104z" fill="${hair}"/>
    <path d="M158 92 C190 96 198 140 186 176 C176 196 160 176 162 150 C164 130 156 112 150 104z" fill="${hair}"/>
    <circle cx="60" cy="98" r="8" fill="#FF6FA5"/><circle cx="160" cy="98" r="8" fill="#FF6FA5"/>`;
  else back = `<circle cx="110" cy="40" r="25" fill="${hair}"/><path d="M96 30 Q110 22 124 30" stroke="${hairD}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;

  const eyeG = (x) => mood === 'sleep'
    ? `<path d="M${x - 9} 100 Q${x} 108 ${x + 9} 100" fill="none" stroke="#3A2536" stroke-width="3.2" stroke-linecap="round"/>`
    : `<ellipse cx="${x}" cy="99" rx="9" ry="11" fill="#3A2536"/><ellipse cx="${x}" cy="100.5" rx="6.4" ry="8" fill="${eye}"/>
       <ellipse cx="${x}" cy="101" rx="3.4" ry="4.6" fill="#241524"/><circle cx="${x - 3}" cy="95" r="3.1" fill="#fff"/><circle cx="${x + 3.4}" cy="104" r="1.5" fill="#fff" opacity=".9"/>
       <path d="M${x < 110 ? x - 9 : x + 9} 93 l${x < 110 ? -5 : 5}-4" stroke="#3A2536" stroke-width="2.4" stroke-linecap="round"/>`;
  const mouth = mood === 'cheer'
    ? `<path d="M98 117 Q110 136 122 117z" fill="#B8325F"/><path d="M103 125 Q110 131 117 125 Q110 121 103 125z" fill="#FF8FB8"/>`
    : mood === 'think' ? `<ellipse cx="111" cy="121" rx="4" ry="4.6" fill="#B8325F"/>`
    : mood === 'sleep' ? `<path d="M104 120 Q110 124 116 120" fill="none" stroke="#B8325F" stroke-width="2.8" stroke-linecap="round"/>`
    : `<path d="M99 117 Q110 128 121 117" fill="none" stroke="#B8325F" stroke-width="3.2" stroke-linecap="round"/>`;

  const stars = d.stars ? [[60, 250], [92, 228], [128, 262], [156, 240], [110, 286], [72, 288], [150, 284]]
    .map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.5)" d="M0-13 L3.8-4.2 13-3.6 5.8 2.6 8 12 0 6.8 -8 12 -5.8 2.6 -13-3.6 -3.8-4.2z" fill="#FFD166"/>`).join('') : '';

  return `<svg class="hero-svg" viewBox="0 0 220 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="rb" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#FF8FB8"/><stop offset=".25" stop-color="#FFD166"/><stop offset=".5" stop-color="#7ED6BE"/><stop offset=".75" stop-color="#8CC8FF"/><stop offset="1" stop-color="#B79CF0"/></linearGradient></defs>
  <ellipse cx="110" cy="308" rx="78" ry="9" fill="#4A2545" opacity=".13"/>
  ${back}
  <path d="M72 188 C42 228 30 276 26 300 Q110 318 194 300 C190 276 178 228 148 188z" fill="${d.a}"/>
  <path d="M97 190 C90 236 86 280 86 308 Q110 312 134 308 C134 280 130 236 123 190z" fill="${d.c}" opacity="${d.stars ? 0 : .75}"/>
  ${stars}
  <path d="M26 300 Q110 318 194 300 l-2-9 Q110 308 28 291z" fill="${d.b}" opacity=".55"/>
  <path d="M82 164 L${lHand[0]} ${lHand[1]}" stroke="${skin}" stroke-width="13" stroke-linecap="round"/>
  <path d="M138 164 L${rHand[0]} ${rHand[1]}" stroke="${skin}" stroke-width="13" stroke-linecap="round"/>
  <circle cx="${lHand[0]}" cy="${lHand[1]}" r="8.5" fill="${skin}"/><circle cx="${rHand[0]}" cy="${rHand[1]}" r="8.5" fill="${skin}"/>
  <path d="M84 152 Q110 145 136 152 L141 194 Q110 203 79 194z" fill="${d.b}"/>
  <circle cx="80" cy="162" r="15" fill="${d.a}"/><circle cx="140" cy="162" r="15" fill="${d.a}"/>
  <path d="M79 192 Q110 201 141 192" fill="none" stroke="#FFD166" stroke-width="5" stroke-linecap="round"/>
  <path d="M110 160 c-3-5-10-1-6 4 l6 7 6-7 c4-5-3-9-6-4z" fill="#fff" opacity=".9"/>
  <rect x="101" y="130" width="18" height="24" rx="8" fill="${skinD}"/>
  <ellipse cx="110" cy="96" rx="48" ry="46" fill="${skin}"/>
  <path d="M61 102 C56 60 84 45 110 45 C136 45 164 60 159 102 C152 84 140 73 125 69 C114 82 90 88 61 102z" fill="${hair}"/>
  <path d="M125 69 C114 82 90 88 61 102" fill="none" stroke="${hairD}" stroke-width="2" opacity=".5"/>
  <circle cx="76" cy="114" r="9" fill="#FF8FB8" opacity=".45"/><circle cx="144" cy="114" r="9" fill="#FF8FB8" opacity=".45"/>
  ${eyeG(90)}${eyeG(130)}
  <path d="M108 110 q2 3 4 0" fill="none" stroke="${shade(skin, 0.78)}" stroke-width="2" stroke-linecap="round"/>
  ${mouth}
  ${crownSVG(wear.crown)}
  ${accSVG(wear.acc, rHand[0], rHand[1])}
  ${mood === 'sleep' ? '<text x="168" y="62" font-size="30" font-weight="900" fill="#7D5BD0" font-family="sans-serif">z</text><text x="186" y="40" font-size="20" font-weight="900" fill="#B79CF0" font-family="sans-serif">z</text>' : ''}
  </svg>`;
}

/* --- Здания королевства (viewBox 0 0 300 280) --- */
const BUILD = {
  castle: `<svg viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="150" cy="262" rx="140" ry="16" fill="#6FBF8F" opacity=".5"/>
    <rect x="40" y="110" width="60" height="150" rx="6" fill="#FFD0E2"/><rect x="200" y="110" width="60" height="150" rx="6" fill="#FFD0E2"/>
    <path d="M32 114 L70 44 L108 114z" fill="#E85A92"/><path d="M192 114 L230 44 L268 114z" fill="#E85A92"/>
    <rect x="92" y="140" width="116" height="120" fill="#FFE6F0"/>
    <path d="M92 140 v-16 h16 v10 h14 v-10 h16 v10 h24 v-10 h16 v10 h14 v-10 h16 v16z" fill="#FFE6F0"/>
    <rect x="124" y="70" width="52" height="64" rx="4" fill="#FFDCEA"/><path d="M114 76 L150 8 L186 76z" fill="#C73B78"/>
    <line x1="150" y1="8" x2="150" y2="-8" stroke="#A61E4D" stroke-width="3"/><path d="M150-8 l22 7 -22 8z" fill="#FFD166"/>
    <line x1="70" y1="44" x2="70" y2="28" stroke="#A61E4D" stroke-width="3"/><path d="M70 28 l16 5 -16 6z" fill="#FFD166"/>
    <line x1="230" y1="44" x2="230" y2="28" stroke="#A61E4D" stroke-width="3"/><path d="M230 28 l16 5 -16 6z" fill="#FFD166"/>
    <path d="M128 260 v-46 a22 22 0 0 1 44 0 v46z" fill="#A61E4D"/><path d="M134 260 v-44 a16 16 0 0 1 32 0 v44z" fill="#D6336C"/><circle cx="160" cy="232" r="3" fill="#FFD166"/>
    <path d="M60 150 a10 10 0 0 1 20 0 v22 h-20z" fill="#B79CF0"/><path d="M220 150 a10 10 0 0 1 20 0 v22 h-20z" fill="#B79CF0"/>
    <path d="M140 96 a10 10 0 0 1 20 0 v20 h-20z" fill="#B79CF0"/>
    <text x="108" y="196" font-size="30" font-weight="900" fill="#D6336C" font-family="Inter,sans-serif">А</text>
    <text x="172" y="196" font-size="30" font-weight="900" fill="#7D5BD0" font-family="Inter,sans-serif">Я</text>
    <path d="M40 232 h60 M200 232 h60" stroke="#F5B5CE" stroke-width="3"/></svg>`,
  garden: `<svg viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="150" cy="262" rx="140" ry="16" fill="#6FBF8F" opacity=".5"/>
    <path d="M60 262 V130 a90 90 0 0 1 180 0 V262 h-26 V132 a64 64 0 0 0 -128 0 V262z" fill="#7CC79A"/>
    <path d="M60 262 V130 a90 90 0 0 1 180 0 V262" fill="none" stroke="#57A97B" stroke-width="4"/>
    ${[[66, 200, '#FF8FB8'], [72, 140, '#FFD166'], [100, 76, '#FF8FB8'], [150, 50, '#B79CF0'], [200, 76, '#FFD166'], [228, 140, '#FF8FB8'], [234, 200, '#B79CF0']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle r="9" cy="-11" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="7" fill="#FFF3C4"/></g>`).join('')}
    <g font-family="Inter,sans-serif" font-weight="900" font-size="52"><text x="96" y="220" fill="#D6336C">1</text><text x="134" y="190" fill="#3FA98D">2</text><text x="172" y="220" fill="#7D5BD0">3</text></g>
    <path d="M86 262 q20-18 40 0 q24-22 48 0 q20-18 40 0z" fill="#57A97B"/></svg>`,
  tower: `<svg viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="150" cy="262" rx="120" ry="16" fill="#6FBF8F" opacity=".5"/>
    <path d="M108 262 L116 96 H184 L192 262z" fill="#D9CCF7"/><path d="M150 96 H184 L192 262 H150z" fill="#C9B6F2" opacity=".7"/>
    <path d="M100 100 L150 10 L200 100z" fill="#7D5BD0"/><path d="M150 10 L200 100 H150z" fill="#6A4BC0"/>
    <rect x="104" y="92" width="92" height="14" rx="7" fill="#B79CF0"/>
    <circle cx="150" cy="140" r="18" fill="#FFF3C4" stroke="#7D5BD0" stroke-width="4"/><path d="M150 128 v12 l8 6" stroke="#7D5BD0" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M138 262 v-40 a12 12 0 0 1 24 0 v40z" fill="#5B4B9A"/>
    <path d="M140 176 a10 10 0 0 1 20 0 v18 h-20z" fill="#8CC8FF"/>
    <path transform="translate(150 -6) scale(1.3)" d="M0-13 L3.8-4.2 13-3.6 5.8 2.6 8 12 0 6.8 -8 12 -5.8 2.6 -13-3.6 -3.8-4.2z" fill="#FFD166" stroke="#E09B1A" stroke-width="1.2"/>
    <g transform="translate(222 150)"><line x1="0" y1="40" x2="0" y2="112" stroke="#8A6A45" stroke-width="5"/><circle r="34" fill="#8CC8FF" stroke="#4A90E2" stroke-width="4"/><path d="M-20-10 q10-14 22-6 q12-6 16 8 q-6 12 -20 6 q-12 8 -18-8z" fill="#7CC79A"/><path d="M2 14 q10-4 16 6 q-8 8 -16-6z" fill="#7CC79A"/></g></svg>`,
  workshop: `<svg viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="150" cy="262" rx="130" ry="16" fill="#6FBF8F" opacity=".5"/>
    <rect x="66" y="130" width="168" height="130" rx="8" fill="#FFE9C7"/><path d="M48 138 L150 56 L252 138z" fill="#FF9D5C"/><path d="M150 56 L252 138 H150z" fill="#F0823C"/>
    <rect x="196" y="70" width="22" height="44" fill="#F0823C"/>
    <path d="M132 260 v-52 a18 18 0 0 1 36 0 v52z" fill="#B8642B"/>
    <g transform="translate(100 176)"><circle r="20" fill="#7ED6BE" stroke="#3FA98D" stroke-width="4"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="-5" y="-29" width="10" height="11" rx="2" fill="#3FA98D" transform="rotate(${a})"/>`).join('')}<circle r="7" fill="#FFE9C7"/></g>
    <path transform="translate(182 154)" d="M0 0 h14 a7 7 0 1 1 12 0 h14 v14 a7 7 0 1 0 0 12 v14 h-40z" fill="#B79CF0" stroke="#7D5BD0" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="150" cy="104" r="12" fill="#FFF3C4" stroke="#F0823C" stroke-width="3"/></svg>`,
  music: `<svg viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="150" cy="262" rx="130" ry="16" fill="#6FBF8F" opacity=".5"/>
    <path d="M60 130 a90 78 0 0 1 180 0z" fill="#8CC8FF"/><path d="M150 52 a90 78 0 0 1 90 78 H150z" fill="#6FB3F2"/>
    <circle cx="150" cy="46" r="10" fill="#FFD166"/>
    <rect x="52" y="126" width="196" height="16" rx="8" fill="#D6ECFF"/>
    ${[72, 116, 172, 216].map(x => `<rect x="${x}" y="142" width="14" height="106" rx="5" fill="#fff"/>`).join('')}
    <rect x="48" y="246" width="204" height="16" rx="6" fill="#D6ECFF"/>
    <g fill="#D6336C"><ellipse cx="134" cy="216" rx="12" ry="9" transform="rotate(-18 134 216)"/><rect x="143" y="166" width="5" height="50"/><ellipse cx="166" cy="206" rx="12" ry="9" transform="rotate(-18 166 206)"/><rect x="175" y="156" width="5" height="50"/><path d="M143 166 l37-10 v12 l-37 10z"/></g></svg>`
};

function starSVG(on) {
  return `<svg viewBox="-16 -16 32 32" class="st ${on ? 'on' : ''}" aria-hidden="true"><path d="M0-13 L3.8-4.2 13-3.6 5.8 2.6 8 12 0 6.8 -8 12 -5.8 2.6 -13-3.6 -3.8-4.2z" stroke-linejoin="round"/></svg>`;
}

/* Фон карты королевства: небо, холмы, тропинки */
function mapBG() {
  return `<svg class="bg" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD9FF"/><stop offset=".55" stop-color="#FFD9EA"/><stop offset="1" stop-color="#FFEBD6"/></linearGradient></defs>
    <rect width="1280" height="800" fill="url(#sky)"/>
    <circle cx="1120" cy="110" r="56" fill="#FFF3C4"/><circle cx="1120" cy="110" r="80" fill="#FFF3C4" opacity=".35"/>
    <g fill="#fff" opacity=".85"><path d="M150 120 a34 34 0 0 1 62-16 a26 26 0 0 1 44 20 a22 22 0 0 1 -6 42 h-96 a24 24 0 0 1 -4-46z"/><path d="M620 70 a26 26 0 0 1 48-12 a20 20 0 0 1 34 16 a17 17 0 0 1 -5 32 h-74 a18 18 0 0 1 -3-36z"/><path d="M900 190 a22 22 0 0 1 40-10 a17 17 0 0 1 29 13 a14 14 0 0 1 -4 27 h-62 a15 15 0 0 1 -3-30z"/></g>
    <path d="M0 420 Q200 330 420 400 T860 380 T1280 410 V800 H0z" fill="#CDEBC9"/>
    <path d="M0 520 Q260 440 520 510 T1000 500 T1280 520 V800 H0z" fill="#A8DDB0"/>
    <path d="M0 660 Q300 590 640 650 T1280 640 V800 H0z" fill="#8FD0A0"/>
    <path d="M330 470 C460 380 620 420 760 380 C900 350 980 470 1050 520 C1000 620 900 640 820 680 C700 720 560 700 440 720" fill="none" stroke="#FFF3DC" stroke-width="26" stroke-linecap="round" opacity=".9"/>
    <path d="M330 470 C460 380 620 420 760 380 C900 350 980 470 1050 520 C1000 620 900 640 820 680 C700 720 560 700 440 720" fill="none" stroke="#F2D9A8" stroke-width="4" stroke-dasharray="2 22" stroke-linecap="round"/>
    </svg>`;
}

/* Фон для уровней и остальных экранов */
function softBG(tone) {
  const t = { rose: ['#FFD9EA', '#FFEFE2'], lav: ['#DCD0FA', '#FFE3F0'], night: ['#3A2D6E', '#7D5BD0'], mint: ['#CDEFE0', '#FFF4D9'], sky: ['#CFE0FF', '#FFE9F3'], peach: ['#FFE0C7', '#FFF4E8'], lilac: ['#E4D8FF', '#D8EEFF'] }[tone || 'rose'];
  const dots = []; let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) dots.push(`<path transform="translate(${Math.round(rnd() * 1280)} ${Math.round(rnd() * 800)}) scale(${(0.5 + rnd() * 0.9).toFixed(2)}) rotate(${Math.round(rnd() * 40)})" d="M0-13 L3.8-4.2 13-3.6 5.8 2.6 8 12 0 6.8 -8 12 -5.8 2.6 -13-3.6 -3.8-4.2z" fill="#fff" opacity="${(0.25 + rnd() * 0.4).toFixed(2)}"/>`);
  return `<svg class="bg" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="sg${tone}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient></defs>
    <rect width="1280" height="800" fill="url(#sg${tone})"/>${dots.join('')}</svg>`;
}

/* ---------- нарисованные фоны и здания ---------- */
const BG_IMG = { title: 'img/bg/title.webp', map: 'img/bg/map.webp', workshop: 'img/bg/workshop.webp', castle: 'img/bg/castle.webp', garden: 'img/bg/garden.webp',
  tower: 'img/bg/tower.webp', music: 'img/bg/music.webp', att: 'img/bg/att.webp', night: 'img/bg/night.webp' };
const MAP_ART = { castle: 'img/map/castle.webp', garden: 'img/map/garden.webp', tower: 'img/map/tower.webp', music: 'img/map/music.webp', workshop: 'img/map/workshop.webp' };
/* картинка во весь экран: размытая копия заполняет поля на экранах другой формы */
const bgImg = k => `<div class="bgi"><img class="far" src="${BG_IMG[k]}" alt=""><img class="near" src="${BG_IMG[k]}" alt=""></div>`;
const worldBG = (w, tone) => BG_IMG[w] ? bgImg(w) : softBG(tone);
const buildArt = id => MAP_ART[id] ? `<img class="bimg" src="${MAP_ART[id]}" alt="" draggable="false">` : BUILD[id];
