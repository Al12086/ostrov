/* Синхронизация между устройствами: прогресс и записи голоса хранятся на сервере (api.php). */
'use strict';

const Sync = (() => {
  const CK = 'kingdom.sync';
  const blank = () => ({ code: '', vts: {}, dirty: {}, del: {} });
  let c = blank(), h = {}, timer = null, status = 'Не подключено', adm = '';
  try { adm = localStorage.getItem('kingdom.adm') || ''; } catch (e) {}      // пароль владельца озвучки (есть только на устройствах владельца)
  try { c = Object.assign(blank(), JSON.parse(localStorage.getItem(CK) || '{}')); } catch (e) {}
  const persist = () => { try { localStorage.setItem(CK, JSON.stringify(c)); } catch (e) {} };

  /* Смена или отключение кода посреди синхронизации: у каждой «эпохи» свой номер.
     Работа, начатая под старым кодом, замечает смену и молча останавливается — раньше она
     продолжала слать запросы уже без кода и смешивала озвучку разных кодов. */
  let epoch = 0, chain = Promise.resolve(), queued = false;
  const ABORT = new Error('abort');
  const chk = ep => { if (ep !== epoch) throw ABORT; };
  const lock = fn => (chain = chain.then(fn, fn));        // синхронизации идут строго по очереди

  const url = (a, k, code, extra) => 'api.php?a=' + a + '&code=' + encodeURIComponent(code || c.code) + (k != null ? '&k=' + encodeURIComponent(k) : '') + (adm ? '&adm=' + encodeURIComponent(adm) : '') + (extra || '');
  async function call(a, k, opt, code, extra) {
    if (!(code || c.code)) throw ABORT;
    const r = await fetch(url(a, k, code, extra), Object.assign({ cache: 'no-store' }, opt));
    if (!r.ok) {
      let more = '';
      try { const t = await r.text(); try { const j = JSON.parse(t); more = (j.msg || j.err || '') + (j.php ? ', PHP ' + j.php : ''); } catch (e) { more = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160); } } catch (e) {}
      throw new Error('сервер ответил ' + r.status + (more ? ': ' + more : ''));
    }
    return r;
  }
  function setStatus(s) { status = s; if (h.onStatus) h.onStatus(s); }
  function ok() { const d = new Date(); setStatus('Подключено. Последняя синхронизация: ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')); }
  const fail = e => { if (e !== ABORT && /отключена владельцем/.test(e && e.message || '')) return setStatus('Эта игра отключена владельцем: играть можно, но прогресс на сервере не сохраняется.'); if (e !== ABORT) setStatus('Нет связи с сервером (' + (e && e.message || 'ошибка') + '). Игра продолжит работать, данные отправятся позже.'); };

  /* Владелец удалил эту игру на сервере: отвязываем устройство и начинаем с чистого листа */
  function gone() {
    epoch++; clearTimeout(timer);
    c = Object.assign(blank(), { vts: c.vts, dirty: c.dirty, del: c.del }); persist();
    setStatus('Не подключено');
    if (h.onGone) h.onGone();
  }
  async function pushState(force) {
    const s = h.getState();
    const r = await (await call('put', null, { method: 'POST', body: JSON.stringify({ ts: s.ts || 0, state: s }) }, null, force ? '&force=1' : '')).json();
    if (r.gone) return gone();
    if (r.stale) await pullState();
  }
  async function pullState(force) {
    const ep = epoch, r = await (await call('get')).json(), s = h.getState();
    if (r.gone && ep === epoch) { gone(); throw ABORT; }
    chk(ep);
    if (r.state && (force || (r.ts || 0) > (s.ts || 0))) h.applyState(r.state);
    else if (!force && (s.ts || 0) > (r.ts || 0)) await pushState();
    return r;
  }
  async function upload(k, ep) {
    if (!adm) return;                      // общую озвучку меняет только владелец
    const b = await Voice.getBlob(k);
    if (!b) { delete c.dirty[k]; return; }
    chk(ep);
    const r = await (await call('vput', k, { method: 'POST', body: b, headers: { 'Content-Type': b.type || 'audio/webm' } })).json();
    chk(ep);
    c.vts[k] = r.ts; delete c.dirty[k]; persist();
  }
  async function flush(ep) {
    if (!adm) return;
    for (const k of Object.keys(c.del)) { chk(ep); await call('vdel', k, { method: 'POST' }); chk(ep); delete c.del[k]; delete c.vts[k]; persist(); }
    for (const k of Object.keys(c.dirty)) { chk(ep); await upload(k, ep); }
  }
  async function voiceSync(remote, ep) {
    let changed = false;
    for (const k of Object.keys(remote)) {
      chk(ep);
      if (c.del[k] || c.dirty[k]) continue;
      if ((c.vts[k] || 0) < remote[k].ts || !Voice.has(k)) {
        const b = await (await call('vget', k)).blob();
        chk(ep);
        await Voice.putBlob(k, b); c.vts[k] = remote[k].ts; persist(); changed = true;
      }
    }
    for (const k of Voice.keys()) {
      chk(ep);
      if (remote[k]) continue;
      if (c.vts[k]) { Voice.recDelete(k, true); delete c.vts[k]; persist(); changed = true; continue; }   // удалили на другом устройстве
      /* Фразы нет на сервере. Свою запись (с микрофона) отправляем. Автоматическую (mp3 от синтезатора)
         не переносим, а убираем: её место — на сервере текущего кода, иначе голоса разных кодов смешиваются. */
      const b = await Voice.getBlob(k);
      chk(ep);
      if (b && /^audio\/mpeg/.test(b.type || '')) { Voice.recDelete(k, true); changed = true; }
      else await upload(k, ep);
    }
    if (changed && h.onVoice) h.onVoice();
  }
  /* full = true: сверить всю озвучку с сервером заново, не доверяя тому, что устройство помнит */
  function run(full) {
    if (!c.code) return Promise.resolve();
    if (queued && full !== true) return chain;
    queued = true;
    return lock(async () => {
      queued = false;
      const ep = epoch;
      if (!c.code) return;
      try {
        if (full === true) { c.vts = {}; persist(); }
        await flush(ep); const r = await pullState(); chk(ep); await voiceSync(r.voice || {}, ep); ok();
      } catch (e) { if (ep === epoch) fail(e); }
    });
  }

  return {
    init(hooks) {
      h = hooks;
      Voice.onRec = k => { if (!c.code) return; c.dirty[k] = 1; delete c.del[k]; persist(); run(); };
      Voice.onDel = k => { if (!c.code) return; c.del[k] = 1; delete c.dirty[k]; persist(); run(); };
      addEventListener('online', () => run());
      if (c.code) { setStatus('Подключаюсь…'); run(); }
    },
    run: () => run(),
    resync: () => run(true),
    queue() { if (!c.code) return; clearTimeout(timer); const ep = epoch; timer = setTimeout(() => { if (ep === epoch) pushState().then(ok, e => { if (ep === epoch) fail(e); }); }, 1500); },
    /* посмотреть, что лежит на сервере по коду, ничего не меняя */
    async peek(code) { return (await call('get', null, null, code)).json(); },
    /* произвольный запрос к серверу от имени подключённого кода (для автоозвучки) */
    async req(a, k, data, extra) { return (await call(a, k, data ? { method: 'POST', body: JSON.stringify(data) } : null, null, extra)).json(); },
    /* подключить устройство: mode 'pull' — взять сохранение с сервера, 'push' — отправить своё */
    link(code, mode) {
      epoch++; clearTimeout(timer);
      c = Object.assign(blank(), { vts: c.vts, dirty: c.dirty, del: c.del, code: code.trim() }); persist();   // озвучка общая для всех кодов — её учёт при смене кода сохраняем
      const ep = epoch;
      setStatus('Подключаюсь…');
      return lock(async () => {
        try {
          chk(ep);
          if (mode === 'pull') await pullState(true); else await pushState(true);
          chk(ep);
          const r = await (await call('get')).json();
          await voiceSync(r.voice || {}, ep); ok();
        } catch (e) { if (ep === epoch) fail(e); throw e; }
      });
    },
    unlink() { epoch++; clearTimeout(timer); c = Object.assign(blank(), { vts: c.vts, dirty: c.dirty, del: c.del }); persist(); setStatus('Не подключено'); },
    /* пароль владельца: первый ввод задаёт его на сервере, следующие — проверяют */
    async owner(pass) {
      const r = await (await call('owner', null, { method: 'POST', body: JSON.stringify({ pass }) })).json();
      adm = pass; try { localStorage.setItem('kingdom.adm', adm); } catch (e) {}
      return r;
    },
    get isOwner() { return !!adm; },
    get code() { return c.code; },
    get status() { return status; }
  };
})();
