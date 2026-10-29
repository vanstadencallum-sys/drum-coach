/* Drum Coach progress: scores, stars, unlocked levels and settings, saved in this browser. */
(function () {
  'use strict';
  const DT = window.DT = window.DT || {};
  const KEY = 'drumcoach.v1';

  function defaults() {
    return {
      placed: false,
      placement: 1,
      settings: {
        kit: 'keys',
        volumes: { click: 0.7, drums: 0.7, backing: 0.6 },
        latency: {},
        midiMap: {},
        micDevice: '',
        micSens: 0.5,
        drumCal: null,
        unlockAll: false,
        demoWhilePlaying: true,
        hitSounds: true,
        // On-screen drum pads. Starts on for touch screens.
        tapPads: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches),
      },
      lessons: {},
      xp: 0,
      seconds: 0,
      streak: { last: null, count: 0 },
      history: [],
    };
  }

  function fromSaved(saved) {
    const d = defaults();
    if (saved && typeof saved === 'object') {
      Object.assign(d, saved);
      d.settings = Object.assign(defaults().settings, saved.settings || {});
      d.settings.volumes = Object.assign(defaults().settings.volumes, (saved.settings || {}).volumes || {});
    }
    return d;
  }
  function load() {
    try { return fromSaved(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return defaults(); /* storage blocked or corrupt: start fresh */ }
  }

  let data = load();
  const P = DT.Progress = {};
  Object.defineProperty(P, 'data', { get: () => data });

  // Progress is also kept off the device when there's somewhere to keep it: the page's private
  // per-person store on the hosted phone link, or a file on the computer when Drum Coach runs from
  // server.py. Either way it survives a cleared browser and a new phone link, and follows the
  // player between devices.
  let store = null, storeBusy = false, storeAgain = false, storeTimer = 0;
  // Where progress is kept besides this browser: 'computer' (server.py), 'account' (hosted link) or null.
  let syncedTo = null;
  P.syncedTo = () => syncedTo;
  function pushStore() {
    storeTimer = 0;
    if (!store) return;
    if (storeBusy) { storeAgain = true; return; }
    storeBusy = true; storeAgain = false;
    store.set(JSON.parse(JSON.stringify(data)))
      .catch(e => { if (store && store.fatal(e)) store = null; })
      .then(() => { storeBusy = false; if (storeAgain) pushStore(); });
  }

  // The kit, timing delays and taught drum sounds belong to the device they were set up on (a phone's
  // mic isn't the computer's), so phones and computers each keep their own copy in the shared progress.
  const DEVICE = window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'phone' : 'computer';
  const deviceSettings = s => ['kit', 'latency', 'micDevice', 'micSens', 'drumCal', 'tapPads'].reduce((o, k) => { o[k] = s[k]; return o; }, {});

  P.settings = () => data.settings;
  P.save = function () {
    data.devices = Object.assign({}, data.devices, { [DEVICE]: deviceSettings(data.settings) });
    data.savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private window: progress lasts until the tab closes */ }
    if (store) { clearTimeout(storeTimer); storeTimer = setTimeout(pushStore, 1500); }
  };

  const fresh = d => !d.placed && !d.xp && !Object.keys(d.lessons || {}).length;
  // Take the stored copy when it's newer (or this browser has nothing yet); send ours when it's newer.
  async function pull() {
    const remote = await store.get();
    if (remote && (fresh(data) || (remote.savedAt || 0) > (data.savedAt || 0))) {
      const mine = deviceSettings(data.settings);
      data = fromSaved(remote);
      Object.assign(data.settings, (remote.devices || {})[DEVICE] || mine);
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* fine: the store has it */ }
      document.dispatchEvent(new CustomEvent('dt:progress'));
    } else if (!fresh(data) && (!remote || (data.savedAt || 0) > (remote.savedAt || 0))) {
      pushStore();
    }
  }

  async function hostedStore() {
    const db = await window.claude.use('db');
    const user = db && await window.claude.use('user');
    const id = user && await user.id();
    if (!id) return null;
    const ref = db.collection('data/users/' + id).doc('progress');
    return {
      // Snapshots are frozen, so work on a copy.
      get: () => ref.get().then(snap => (snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null)),
      set: d => ref.set(d),
      fatal: e => !!e && e.code !== 'unavailable' && e.code !== 'resource_exhausted',
    };
  }
  const ok = r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r; };
  const serverStore = {
    get: () => fetch('api/progress', { cache: 'no-store' }).then(ok).then(r => r.json()),
    set: d => fetch('api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(ok),
    fatal: () => false, // the computer may just be asleep; try again on the next save
  };

  (async () => {
    if (window.DT_HOSTED) {
      if (window.claude && typeof window.claude.use === 'function') store = await hostedStore();
    } else if (/^https?:$/.test(location.protocol)) {
      await serverStore.get(); // a plain file server has no api/progress, so this throws and progress stays in this browser
      store = serverStore;
    }
    if (!store) return;
    syncedTo = store === serverStore ? 'computer' : 'account';
    document.dispatchEvent(new CustomEvent('dt:sync'));
    await pull();
    // Pick up practice done on another device while this tab sat in the background,
    // and send off a pending save before the tab is put away.
    document.addEventListener('visibilitychange', () => {
      if (!store) return;
      if (!document.hidden) pull().catch(() => {});
      else if (storeTimer) { clearTimeout(storeTimer); pushStore(); }
    });
  })().catch(() => { /* nowhere else to keep it: this browser only */ });

  P.lesson = id => data.lessons[id] || null;
  function entry(id) {
    return data.lessons[id] = data.lessons[id] || { best: 0, stars: 0, plays: 0, passed: false, tempo: 100, practiceBest: 0 };
  }
  P.setTempo = function (id, pct) { entry(id).tempo = pct; P.save(); };

  const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  function touchStreak() {
    const now = new Date(), today = dayKey(now);
    const y = new Date(now); y.setDate(now.getDate() - 1);
    const s = data.streak;
    if (s.last === today) return;
    s.count = s.last === dayKey(y) ? s.count + 1 : 1;
    s.last = today;
  }
  // Streak only counts if the last practice day was today or yesterday.
  P.streak = function () {
    const now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    const s = data.streak;
    return s.last === dayKey(now) || s.last === dayKey(y) ? s.count : 0;
  };

  // Stars and passes only count at full tempo. Slower runs are practice.
  P.record = function (item, res, tempoPct) {
    const L = entry(item.id);
    const full = tempoPct >= 100;
    L.plays++;
    let newBest = false, firstPass = false;
    if (full) {
      if (res.score > L.best) { L.best = res.score; newBest = true; }
      L.stars = Math.max(L.stars, res.stars);
      if (res.stars >= 1 && !L.passed) { L.passed = true; firstPass = true; }
    } else if (res.score > L.practiceBest) {
      L.practiceBest = res.score;
    }
    const xp = 5 + Math.round(res.score / 10) + (full ? res.stars * 5 : 0) + (firstPass ? 25 : 0);
    data.xp += xp;
    touchStreak();
    data.history.push({ id: item.id, score: res.score, stars: full ? res.stars : 0, tempo: tempoPct, at: Date.now() });
    if (data.history.length > 300) data.history.splice(0, data.history.length - 300);
    P.save();
    return { xp, newBest, firstPass };
  };

  // Practising one section of a song. Earns a little XP and remembers the best score per section,
  // but stars and passes only come from playing the whole song.
  // Full-speed scores ("learned" at 80+) are kept apart from slower practice, where the
  // run at the highest speed so far is kept.
  P.recordSection = function (item, section, res, tempoPct) {
    const L = entry(item.id);
    let newBest;
    if (tempoPct >= 100) {
      L.sections = L.sections || {};
      newBest = res.score > (L.sections[section] || 0);
      if (newBest) L.sections[section] = res.score;
    } else {
      L.sectionsSlow = L.sectionsSlow || {};
      const prev = L.sectionsSlow[section];
      if (!prev || tempoPct > prev.tempo || (tempoPct === prev.tempo && res.score > prev.score)) L.sectionsSlow[section] = { score: res.score, tempo: tempoPct };
      // Only call it a new best when it is at least as fast and as accurate, and better at one.
      newBest = !prev || (tempoPct >= prev.tempo && res.score >= prev.score && (tempoPct > prev.tempo || res.score > prev.score));
    }
    const xp = 2 + Math.round(res.score / 20);
    data.xp += xp;
    touchStreak();
    data.history.push({ id: item.id, section, score: res.score, stars: 0, tempo: tempoPct, at: Date.now() });
    if (data.history.length > 300) data.history.splice(0, data.history.length - 300);
    P.save();
    return { xp, newBest, firstPass: false };
  };
  P.sectionBest = (id, section) => ((P.lesson(id) || {}).sections || {})[section] || 0;
  P.sectionSlow = (id, section) => ((P.lesson(id) || {}).sectionsSlow || {})[section] || null;
  P.sectionTried = (id, section) => !!(P.sectionBest(id, section) || P.sectionSlow(id, section));
  P.markListened = function (id) { const L = entry(id); if (!L.listened) { L.listened = true; P.save(); } };

  P.addSeconds = function (s) { data.seconds += Math.max(0, s); P.save(); };

  // A level opens when every lesson (not song) in the level before it is passed.
  P.levelUnlocked = function (n) {
    if (n <= 1 || data.settings.unlockAll || n <= data.placement) return true;
    const prev = DT.Content.levels[n - 2];
    return !!prev && prev.items.filter(it => it.kind === 'lesson').every(it => (data.lessons[it.id] || {}).passed);
  };
  P.levelStats = function (lv) {
    const lessons = lv.items.filter(it => it.kind === 'lesson');
    return {
      passed: lv.items.filter(it => (data.lessons[it.id] || {}).passed).length,
      total: lv.items.length,
      lessonsPassed: lessons.filter(it => (data.lessons[it.id] || {}).passed).length,
      lessons: lessons.length,
      stars: lv.items.reduce((s, it) => s + ((data.lessons[it.id] || {}).stars || 0), 0),
      maxStars: lv.items.length * 3,
    };
  };

  P.reset = function () {
    const keep = data.settings;
    data = defaults();
    // Keep the kit setup (MIDI map, mic calibration, timing) so the player doesn't have to redo it.
    ['kit', 'volumes', 'latency', 'midiMap', 'micDevice', 'micSens', 'drumCal'].forEach(k => { data.settings[k] = keep[k]; });
    P.save();
  };
})();
