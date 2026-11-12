/* Звук: эффекты и музыка (синтез), голос (синтез речи планшета или свои записи). */
'use strict';

const Sfx = (() => {
  let ctx = null, master = null, music = null, timer = null, step = 0, nextT = 0;
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      music = ctx.createGain(); music.gain.value = 0.0; music.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, at, dur, type, vol, dest, abs) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    const t = abs ? at : c.currentTime + at;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.25, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const bell = (f, at, vol) => { tone(f, at, 0.5, 'sine', vol || 0.22); tone(f * 2, at, 0.25, 'sine', (vol || 0.22) * 0.35); };
  const api = {
    unlock: ac,
    tap()   { tone(620, 0, 0.08, 'triangle', 0.16); },
    place() { tone(520, 0, 0.1, 'triangle', 0.2); tone(780, 0.06, 0.12, 'triangle', 0.16); },
    ok()    { bell(784, 0); bell(1047, 0.1); bell(1319, 0.2); },
    bad()   { tone(260, 0, 0.18, 'sine', 0.16); tone(220, 0.12, 0.22, 'sine', 0.14); },
    star()  { bell(1047, 0, 0.2); bell(1568, 0.08, 0.18); },
    win()   { [523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, i * 0.12, 0.24)); [523, 659, 784].forEach(f => tone(f, 0.75, 1.1, 'triangle', 0.1)); },
    buy()   { [659, 880, 1175].forEach((f, i) => bell(f, i * 0.09, 0.2)); },
    /* Тихая «музыкальная шкатулка» */
    music(on) {
      const c = ac(); if (!c) return;
      if (!on) { music.gain.setTargetAtTime(0, c.currentTime, 0.2); clearInterval(timer); timer = null; return; }
      if (timer) return;
      music.gain.setTargetAtTime(0.5, c.currentTime, 0.5);
      const N = { C: 523.25, D: 587.33, E: 659.25, G: 783.99, A: 880, c: 1046.5, d: 1174.7, e: 1318.5 };
      const mel = 'E G c G A G E - D E G E D C D - E G c d e c A - G A c G E D C -'.split(' ');
      const bass = [130.8, 196, 174.6, 196, 130.8, 220, 174.6, 196];
      const beat = 0.36; nextT = c.currentTime + 0.1; step = 0;
      timer = setInterval(() => {
        while (nextT < c.currentTime + 0.4) {
          const n = mel[step % mel.length];
          if (n !== '-') tone(N[n], nextT, 0.9, 'sine', 0.06, music, true);
          if (step % 4 === 0) tone(bass[(step / 4) % bass.length], nextT, 1.3, 'triangle', 0.045, music, true);
          nextT += beat; step++;
        }
      }, 120);
    },
    duck(on) { if (ctx && music && timer) music.gain.setTargetAtTime(on ? 0.15 : 0.5, ctx.currentTime, 0.15); }
  };
  return api;
})();

const Voice = (() => {
  const rec = new Map();            // ключ фразы -> objectURL записи
  let db = null, token = 0, voice = null, player = null;
  const cfg = { rate: 0.9, voiceName: '' };
  const key = t => String(t).trim().toLowerCase();

  function openDB() {
    return new Promise(res => {
      if (!window.indexedDB) return res(null);
      let rq;
      try { rq = indexedDB.open('kingdom-voice', 1); } catch (e) { return res(null); }
      rq.onupgradeneeded = () => rq.result.createObjectStore('rec');
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
    });
  }
  function tx(mode) { return db.transaction('rec', mode).objectStore('rec'); }

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang));
    voice = vs.find(v => v.name === cfg.voiceName) || vs.find(v => /google/i.test(v.name)) || vs[0] || null;
  }

  async function init(set) {
    Object.assign(cfg, set || {});
    if ('speechSynthesis' in window) {
      pickVoice();
      speechSynthesis.onvoiceschanged = pickVoice;
    }
    db = await openDB();
    if (db) await new Promise(res => {
      const rq = tx('readonly').openCursor();
      rq.onsuccess = () => {
        const c = rq.result;
        if (!c) return res();
        rec.set(c.key, URL.createObjectURL(c.value)); c.continue();
      };
      rq.onerror = () => res();
    });
  }

  function stop() {
    token++;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (player) { player.pause(); player = null; }
  }

  function tts(text, my) {
    return new Promise(res => {
      if (!('speechSynthesis' in window) || !text) return res();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU'; if (voice) u.voice = voice;
      u.rate = cfg.rate; u.pitch = 1.15;
      let done = false;
      const fin = () => { if (!done) { done = true; clearTimeout(tm); res(); } };
      const tm = setTimeout(fin, 1200 + text.length * 120);
      u.onend = fin; u.onerror = fin;
      setTimeout(() => { if (my !== token) return fin(); speechSynthesis.speak(u); }, 70);   // пауза после cancel() — иначе Chrome на Android может проглотить фразу
    });
  }
  function playRec(k, my) {
    return new Promise(res => {
      if (my !== token) return res();
      const a = new Audio(rec.get(k)); player = a;
      const tm = setTimeout(res, 15000);
      a.onended = a.onerror = () => { clearTimeout(tm); res(); };
      a.play().catch(() => { clearTimeout(tm); res(); });
    });
  }

  /* parts: строка или массив фраз. Если какая-то часть записана голосом — играем запись. */
  async function say(parts, colon, ttsText) {
    if (!parts) return;
    if (typeof parts === 'string') parts = [parts];
    parts = parts.filter(Boolean);
    if (!parts.length) return;
    stop();
    const my = token;
    Sfx.duck(true);
    if (!parts.some(p => rec.has(key(p)))) {
      const text = ttsText ? ttsText : colon && parts.length > 1 ? parts[0] + ': ' + parts.slice(1).join(' ') + '.' : parts.join(' ');
      await tts(text, my);
    } else {
      for (const p of parts) {
        if (my !== token) break;
        if (rec.has(key(p))) await playRec(key(p), my); else await tts(p, my);
      }
    }
    if (my === token) Sfx.duck(false);
  }

  /* --- запись своим голосом --- */
  let mr = null, chunks = [], stream = null;
  async function recStart() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    mr = new MediaRecorder(stream);
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.start();
  }
  function recStop(k) {
    return new Promise(res => {
      if (!mr) return res(false);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        mr = null;
        k = key(k);
        if (rec.has(k)) URL.revokeObjectURL(rec.get(k));
        rec.set(k, URL.createObjectURL(blob));
        const done = () => { res(true); if (api.onRec) api.onRec(k); };
        if (db) { const r = tx('readwrite').put(blob, k); r.onsuccess = done; r.onerror = done; }
        else done();
      };
      mr.stop();
    });
  }
  function recDelete(k, silent) {
    k = key(k);
    if (rec.has(k)) { URL.revokeObjectURL(rec.get(k)); rec.delete(k); }
    if (db) tx('readwrite').delete(k);
    if (!silent && api.onDel) api.onDel(k);
  }
  /* для синхронизации между устройствами */
  function getBlob(k) {
    return new Promise(res => {
      if (!db) return res(null);
      const r = tx('readonly').get(key(k));
      r.onsuccess = () => res(r.result || null); r.onerror = () => res(null);
    });
  }
  function putBlob(k, blob) {
    return new Promise(res => {
      k = key(k);
      if (rec.has(k)) URL.revokeObjectURL(rec.get(k));
      rec.set(k, URL.createObjectURL(blob));
      if (!db) return res();
      const r = tx('readwrite').put(blob, k);
      r.onsuccess = () => res(); r.onerror = () => res();
    });
  }

  /* английские слова — английским голосом планшета (если он есть) */
  const enVoice = () => ('speechSynthesis' in window) ? speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => /en-US/i.test(b.lang) - /en-US/i.test(a.lang) || /google/i.test(b.name) - /google/i.test(a.name))[0] || null : null;
  function sayEn(text) {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    stop();
    const my = token;
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(text), v = enVoice();
      u.lang = 'en-US'; if (v) u.voice = v; u.rate = 0.8;
      const tm = setTimeout(res, 1500 + text.length * 150);
      u.onend = u.onerror = () => { clearTimeout(tm); res(); };
      setTimeout(() => { if (my === token) speechSynthesis.speak(u); else res(); }, 70);
    });
  }
  const api = {
    init, say, stop, sayEn, hasEn: () => !!enVoice(), recStart, recStop, recDelete, getBlob, putBlob,
    keys: () => [...rec.keys()], onRec: null, onDel: null,
    has: k => rec.has(key(k)),
    count: () => rec.size,
    canRecord: () => !!(navigator.mediaDevices && window.MediaRecorder),
    voices: () => ('speechSynthesis' in window) ? speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang)) : [],
    set(o) { Object.assign(cfg, o); pickVoice(); }
  };
  return api;
})();
