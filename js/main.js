/* Drum Coach screens: home, levels, lessons with live grading and feedback, setup and free practice. */
(function () {
  'use strict';
  const DT = window.DT;
  const E = DT.Engine, C = DT.Content, P = DT.Progress, A = DT.Audio, I = DT.Input, N = DT.Notation;
  const V = E.VOICES;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const app = $('#app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // Phones and tablets get on-screen drum pads instead of keyboard hints.
  const touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  // The microphone and USB-MIDI only work on https or localhost, and not inside a shared web link.
  const HOSTED = !!window.DT_HOSTED;
  const devicesOk = !HOSTED && window.isSecureContext !== false;
  // No browser on iPhone or iPad can read USB-MIDI (iPads report themselves as Macs).
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const device = touch ? 'phone' : 'computer';

  const KITS = {
    electronic: { name: 'Electronic kit', icon: '🎛️', mode: 'exact', src: 'midi', play: 'your electronic kit', blurb: 'Connect your e-kit with USB or a MIDI interface. Every hit is read exactly.' },
    acoustic: { name: 'Acoustic kit', icon: '🥁', mode: 'class', src: 'mic', play: 'your acoustic kit', blurb: 'The microphone listens. Teach it your drums and it tells them apart.' },
    pad: { name: 'Practice pad', icon: '⭕', mode: 'timing', src: 'mic', play: 'your practice pad', blurb: 'The microphone listens to your hands and grades timing and evenness.' },
    keys: touch
      ? { name: 'On-screen pads', icon: '👆', mode: 'exact', src: 'keys', play: 'the on-screen drum pads', blurb: 'No drums nearby? Tap the drum pads on the screen to learn the patterns.' }
      : { name: 'Computer keyboard', icon: '⌨️', mode: 'exact', src: 'keys', play: 'your computer keyboard', blurb: 'No drums nearby? Tap keys or click the on-screen pads to learn the patterns.' },
  };
  const kitId = () => {
    const k = P.settings().kit;
    return KITS[k] && (k === 'keys' || (devicesOk && !(IOS && k === 'electronic'))) ? k : 'keys';
  };
  const kitOf = () => KITS[kitId()];

  // ---------- small helpers ----------

  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2800);
  }
  function modal(html) {
    const m = $('#modal');
    m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`;
    m.hidden = false;
    return m;
  }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
  // An in-page yes/no box (browser confirm() pop-ups are blocked in some places, and look out of place).
  function askConfirm(title, text, okLabel) {
    return new Promise(resolve => {
      const m = modal(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
        <div class="row" style="margin-top:16px"><span class="spacer"></span><button class="btn" id="cfNo">Cancel</button><button class="btn danger" id="cfYes">${esc(okLabel || 'OK')}</button></div>`);
      $('.box', m).classList.add('narrow');
      const done = ok => { closeModal(); resolve(ok); };
      $('#cfNo').onclick = () => done(false);
      $('#cfYes').onclick = () => done(true);
      $('#cfNo').focus();
    });
  }

  // ---------- on-screen tap pads ----------

  const PAD_ROWS = [['cr', 'rd', 'hh', 'ho'], ['t1', 't2', 'ft'], ['sn', 'hp', 'bd']];
  const CYMBALS = ['cr', 'rd', 'hh', 'ho'];
  // Big touch targets for the given drums, laid out like a kit: cymbals on top, toms, then snare and feet.
  function mountPads(el, voices) {
    const rows = PAD_ROWS.map(r => r.filter(v => voices.indexOf(v) >= 0)).filter(r => r.length);
    const h = [116, 92, 76][rows.length - 1] || 76;
    el.innerHTML = `<div class="pads" style="--padh:${h}px">${rows.map(r => `<div class="prow">${r.map(v => {
      const key = touch ? '' : I.keysFor(v)[0];
      return `<button type="button" class="pad ${CYMBALS.indexOf(v) >= 0 ? 'cym' : ''}" data-v="${v}" style="--c:${V[v].color}" aria-label="${esc(V[v].name)}">${esc(V[v].name)}${key ? `<small>${esc(key)}</small>` : ''}</button>`;
    }).join('')}</div>`).join('')}</div>`;
    $$('.pad', el).forEach(p => {
      p.addEventListener('pointerdown', e => {
        e.preventDefault();
        I.tap(p.dataset.v, e.timeStamp);
        p.classList.remove('hit');
        void p.offsetWidth;
        p.classList.add('hit');
        clearTimeout(p._hit);
        p._hit = setTimeout(() => p.classList.remove('hit'), 90);
      });
      p.addEventListener('contextmenu', e => e.preventDefault());
    });
  }

  function starsHtml(n, max) {
    max = max || 3;
    let s = '';
    for (let i = 0; i < max; i++) s += i < n ? '★' : '<span class="off">★</span>';
    return `<span class="stars" title="${n} of ${max} stars">${s}</span>`;
  }
  function fmtTime(sec) {
    const m = Math.round(sec / 60);
    return m < 60 ? m + ' min' : (m / 60).toFixed(1) + ' h';
  }
  const timeSig = it => `${it.beats || 4}/${(it.unit || 1) === 0.5 ? 8 : 4}`;
  const kbds = voice => I.keysFor(voice).map(k => `<kbd>${esc(k)}</kbd>`).join(' ');
  const SECTION_COLORS = ['#7fb4ff', '#41d6c3', '#ffd166', '#ff9f43', '#c49bff', '#ff6b6b', '#3ddc84', '#f6c445'];

  function midiMessage() {
    switch (I.midi.status) {
      case 'on': return `Connected: ${esc(I.midi.inputs.join(', '))}`;
      case 'nodevice': return touch
        ? 'No MIDI device found. Plug your kit\'s USB cable into the phone with a USB-OTG adapter, switch the module on, then press Connect.'
        : 'No MIDI device found. Plug in your kit\'s USB cable, switch the module on, then press Connect.';
      case 'unsupported': return IOS
        ? 'iPhones and iPads can\'t read USB drums in any browser. Use the Acoustic kit (microphone) instead, or open Drum Coach in Chrome on Android or a computer.'
        : 'This browser can\'t read MIDI. Use Chrome or Edge.';
      case 'denied': return 'MIDI access was blocked. Allow it in the browser\'s site settings (the icon left of the address), then press Connect.';
      default: return 'Your electronic kit isn\'t connected yet.';
    }
  }

  // ---------- header, router ----------

  function kitStatus() {
    const k = kitId();
    if (k === 'keys') return 'on';
    if (k === 'electronic') return I.midi.status === 'on' ? 'on' : I.midi.status === 'off' ? '' : 'warn';
    return I.mic.on ? 'on' : '';
  }
  function updateBadge() {
    const k = kitOf();
    $('#kitBadge').innerHTML = `<i class="dot ${kitStatus()}"></i>${esc(k.name)}`;
  }

  let cleanups = [];
  const onLeave = fn => cleanups.push(fn);

  function route() {
    cleanups.forEach(f => { try { f(); } catch (e) { console.error(e); } });
    cleanups = [];
    delete window.__drumTest;
    const [view, arg] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    const opened = view === 'lesson' && C.byId[decodeURIComponent(arg || '')];
    const navKey = opened && opened.kind === 'song' ? 'songs' : view === 'level' || view === 'lesson' ? 'home' : view;
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === navKey));
    if (view === 'level') viewLevel(+arg);
    else if (view === 'lesson') viewLesson(decodeURIComponent(arg || ''));
    else if (view === 'songs') viewSongs();
    else if (view === 'videos') viewVideos(arg);
    else if (view === 'setup') viewSetup(arg);
    else if (view === 'free') viewFree();
    else viewHome();
    if ((view !== 'setup' && view !== 'videos') || !arg) window.scrollTo(0, 0);
    updateBadge();
    if (!P.data.placed) onboarding();
  }
  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  // ---------- first run ----------

  const NO_DEVICES = HOSTED
    ? 'Needs the secure phone link from phone.bat on your computer. This link can\'t use the microphone or USB.'
    : 'Needs a secure (https) or localhost address to use the microphone or USB.';
  const kitCard = (k, on) => {
    const noUsb = devicesOk && IOS && k === 'electronic';
    const off = (!devicesOk && k !== 'keys') || noUsb;
    const note = noUsb ? 'iPhones and iPads can\'t read USB drums. Use the Acoustic kit (microphone) instead.' : off ? NO_DEVICES : KITS[k].blurb;
    return `<button class="kit ${on ? 'on' : ''}" data-kit="${k}" ${off ? 'disabled' : ''}><span class="ico">${KITS[k].icon}</span><b>${esc(KITS[k].name)}</b><span>${esc(note)}</span></button>`;
  };

  function onboarding() {
    if (!$('#modal').hidden) return;
    let kit = kitId();
    const step1 = () => {
      modal(`<h1>Welcome to Drum Coach</h1>
        <p class="muted">I listen while you play, show you what went wrong and how to fix it. First, what are you playing on?</p>
        <div class="grid kits">${Object.keys(KITS).map(k => kitCard(k, k === kit)).join('')}</div>
        <div class="row" style="margin-top:18px"><span class="muted small">You can change this any time in Setup.</span><span class="spacer"></span><button class="btn primary" id="obNext">Next</button></div>`);
      $$('#modal .kit').forEach(b => { b.onclick = () => { kit = b.dataset.kit; $$('#modal .kit').forEach(x => x.classList.toggle('on', x === b)); }; });
      $('#obNext').onclick = step2;
    };
    const step2 = () => {
      modal(`<h1>How much have you played?</h1>
        <p class="muted">Pick the closest one and I'll open the levels up to there. Earlier levels stay open too.</p>
        <div class="choices">${C.PLACEMENT.map(p => `<button class="choice" data-lv="${p.level}"><span class="lv">Level ${p.level}</span>${esc(p.text)}</button>`).join('')}</div>
        <div class="row"><button class="btn ghost" id="obBack">Back</button></div>`);
      $('#obBack').onclick = step1;
      $$('#modal .choice').forEach(b => {
        b.onclick = () => {
          P.settings().kit = kit;
          P.data.placed = true;
          P.data.placement = +b.dataset.lv;
          P.save();
          closeModal();
          if (kit === 'electronic') I.startMidi().catch(() => {});
          if (kit === 'keys') go('#/home');
          else { toast('Let\'s get your kit connected.'); go('#/setup'); }
        };
      });
    };
    step1();
  }

  // ---------- home ----------

  function continueItem() {
    const start = P.data.placement || 1;
    const order = C.levels.filter(lv => lv.n >= start).concat(C.levels.filter(lv => lv.n < start));
    for (const lv of order) {
      if (!P.levelUnlocked(lv.n)) continue;
      const it = lv.items.find(x => !(P.lesson(x.id) || {}).passed);
      if (it) return { item: it, lv };
    }
    return null;
  }

  function levelCard(lv) {
    const open = P.levelUnlocked(lv.n), s = P.levelStats(lv);
    return `<a class="level ${open ? '' : 'locked'}" href="#/level/${lv.n}">
      <span class="n">${open ? '' : '🔒 '}Level ${lv.n} · ${esc(lv.name)}</span>
      <h2>${esc(lv.title)}</h2>
      <p>${esc(lv.blurb)}</p>
      <div class="foot"><div class="bar"><i style="width:${Math.round(100 * s.passed / s.total)}%"></i></div><span>${s.passed}/${s.total}</span><span class="stars">★</span>${s.stars}</div>
    </a>`;
  }

  function viewHome() {
    const d = P.data, k = kitOf();
    const passed = Object.values(d.lessons).filter(l => l.passed).length;
    const next = continueItem();
    app.innerHTML = `
      <section class="hero">
        <div>
          <h1>Learn drums with a coach that listens.</h1>
          <p>Play along to lessons and songs on ${esc(k.play)}. After every take you get a score, a picture of your timing and clear advice on what to fix next.</p>
        </div>
        <div class="stats">
          <div class="stat"><b>${d.xp}</b><span>XP</span></div>
          <div class="stat"><b>${P.streak()}</b><span>day streak</span></div>
          <div class="stat"><b>${fmtTime(d.seconds)}</b><span>practised</span></div>
          <div class="stat"><b>${passed}</b><span>passed</span></div>
        </div>
      </section>
      ${next ? `<a class="card continue" href="#/lesson/${next.item.id}">
        <div><span class="tag gold">${next.item.kind === 'song' ? 'Song' : 'Lesson'} · Level ${next.lv.n}</span>
          <h2>${esc(next.item.title)}</h2><p class="muted" style="margin:0">${esc(next.item.desc)}</p></div>
        <span class="spacer"></span><span class="btn primary big">${(P.lesson(next.item.id) || {}).plays ? 'Continue' : 'Start'} ▶</span>
      </a>` : `<div class="card continue"><div><h2>Everything passed!</h2><p class="muted" style="margin:0">Go back for three stars on every lesson, or jam in Free practice.</p></div></div>`}
      <h3 style="margin-top:26px">Skill levels</h3>
      <div class="grid levels">${C.levels.map(levelCard).join('')}</div>`;
  }

  // ---------- level ----------

  function itemRow(it, num, open) {
    const L = P.lesson(it.id) || {};
    const bits = [esc(it.desc)];
    if (it.kind === 'song') bits.push(esc(it.style));
    bits.push(it.bpm + ' BPM');
    if (it.pad && kitId() === 'pad') bits.push('<span class="tag green">pad-friendly</span>');
    const best = L.best ? `Best ${L.best}%` : L.practiceBest ? `Practice best ${L.practiceBest}%` : 'Not played yet';
    return `<a class="item ${L.passed ? 'passed' : ''} ${open ? '' : 'locked'}" href="#/lesson/${it.id}">
      <span class="num">${L.passed ? '✓' : num}</span>
      <div><h4>${esc(it.title)}</h4><p>${bits.join(' · ')}</p></div>
      <div class="right">${starsHtml(L.stars || 0)}<div>${best}</div></div>
    </a>`;
  }

  function viewLevel(n) {
    const lv = C.levels[n - 1];
    if (!lv) { go('#/home'); return; }
    const open = P.levelUnlocked(n), s = P.levelStats(lv);
    const lessons = lv.items.filter(i => i.kind === 'lesson'), songs = lv.items.filter(i => i.kind === 'song');
    const prev = C.levels[n - 2], nextLv = C.levels[n];
    app.innerHTML = `
      <div class="crumbs"><a href="#/home">Levels</a> › Level ${n}</div>
      <div class="lesson-head">
        <div><span class="tag gold">Level ${n} · ${esc(lv.name)}</span>
          <h1 style="margin-top:8px">${esc(lv.title)}</h1><p class="muted">${esc(lv.blurb)}</p></div>
        <div class="best">${starsHtml(Math.round(3 * s.stars / s.maxStars))}<div class="muted small">${s.stars} of ${s.maxStars} stars · ${s.passed}/${s.total} passed</div></div>
      </div>
      ${open ? '' : `<div class="banner warn">🔒 Pass every lesson in Level ${n - 1} (${esc(prev.title)}) to open these lessons. The songs are always open. You can also switch on “Unlock all levels” in <a href="#/setup">Setup</a>.</div>`}
      <h3>Lessons</h3>
      <div class="items">${lessons.map((it, i) => itemRow(it, i + 1, open)).join('')}</div>
      <h3 style="margin-top:22px">Songs</h3>
      <div class="items">${songs.map(it => itemRow(it, '♪', true)).join('')}</div>
      <div class="row" style="margin-top:22px">
        ${prev ? `<a class="btn" href="#/level/${n - 1}">← Level ${n - 1}</a>` : ''}
        <span class="spacer"></span>
        <a class="btn" href="#/videos/${n}">🎬 Videos for this level</a>
        ${nextLv ? `<a class="btn" href="#/level/${n + 1}">Level ${n + 1} →</a>` : ''}
      </div>`;
  }

  // ---------- songs ----------

  const mmss = sec => { const t = Math.round(sec); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const songBars = it => it.sections.reduce((s, x) => s + x.bars, 0);
  const sectionsLearned = it => it.sections.filter((s, i) => P.sectionBest(it.id, i) >= 80).length;

  function songCard(it, lv) {
    const L = P.lesson(it.id) || {};
    const secs = E.buildTimeline(E.buildChart(it), it.bpm).duration;
    return `<a class="song" href="#/lesson/${it.id}">
      <div class="tags"><span class="tag gold">Level ${lv.n} · ${esc(lv.name)}</span><span class="tag aqua">${esc(it.style)}</span></div>
      <h2>${esc(it.title)}</h2>
      <p>${esc(it.desc)}</p>
      <div class="tags"><span class="tag">${it.bpm} BPM</span><span class="tag">${timeSig(it)}</span><span class="tag">${songBars(it)} bars</span><span class="tag">${mmss(secs)}</span></div>
      <div class="minimap" title="${esc(it.sections.map(s => s.name).join(' · '))}">${it.sections.map((s, i) => `<i style="flex:${s.bars};background:${SECTION_COLORS[i % SECTION_COLORS.length]}"></i>`).join('')}</div>
      <div class="foot">${starsHtml(L.stars || 0)}<span>${L.best ? `Best ${L.best}%` : 'Not played yet'}</span><span class="spacer"></span><span>${sectionsLearned(it)}/${it.sections.length} parts learned</span></div>
    </a>`;
  }

  function viewSongs() {
    app.innerHTML = `
      <div class="lesson-head">
        <div><span class="tag gold">Songs</span>
          <h1 style="margin-top:8px">Learn a whole song</h1>
          <p class="muted">Original practice songs written for Drum Coach, with a band to play along with. Every song is open. Each one has a step-by-step guide: listen first, learn it one part at a time, then play it all the way through.</p></div>
      </div>
      ${C.levels.map(lv => {
        const songs = lv.items.filter(it => it.kind === 'song');
        return songs.length ? `<h3 style="margin-top:20px">Level ${lv.n} · ${esc(lv.name)}</h3><div class="songs">${songs.map(it => songCard(it, lv)).join('')}</div>` : '';
      }).join('')}`;
  }

  // ---------- teaching videos ----------

  const ytLink = v => `<a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">Open on YouTube ↗</a>`;
  // A YouTube lesson shown as its thumbnail; nothing loads from YouTube until it's clicked (see the click
  // handler at the bottom). The shared web link can't show YouTube players or pictures, so there it's a link.
  function videoHtml(v) {
    const label = `${esc(v.title)} by ${esc(v.channel)}`;
    if (HOSTED) return `<a class="video" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener" aria-label="Watch ${label} on YouTube"><span class="vplay"></span><span class="vtext">Watch on YouTube</span></a>`;
    return `<button type="button" class="video" data-yt="${v.id}" aria-label="Play ${label}" style="background-image:url(https://i.ytimg.com/vi/${v.id}/hqdefault.jpg)"><span class="vplay"></span></button>`;
  }
  // Put any playing videos back to thumbnails, so they don't play over a lesson.
  function stopVideos() { $$('iframe.video', app).forEach(f => f.replaceWith(f._thumb)); }

  function videoCard(v, tags, foot) {
    return `<div class="vcard">${videoHtml(v)}
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      <h4>${esc(v.title)}</h4>
      <p>${esc(v.channel)}${HOSTED ? '' : ` · ${ytLink(v)}`}</p>
      ${foot ? `<p class="go">${foot}</p>` : ''}
    </div>`;
  }

  function viewVideos(focus) {
    app.innerHTML = `
      <div class="lesson-head">
        <div><span class="tag gold">Videos</span>
          <h1 style="margin-top:8px">Learn from drum teachers</h1>
          <p class="muted">Short lessons by drum teachers on YouTube, picked to go with each Drum Coach lesson. Watch one, then open the lesson and play it yourself so Drum Coach can check it.${HOSTED ? '' : ' Nothing loads from YouTube until you press play.'}</p></div>
      </div>
      <h3 class="vhead" style="margin-top:20px" id="vl-start">Start here</h3>
      <div class="videos">${C.startVideos.map(v => videoCard(v, `<span class="tag aqua">${esc(v.topic)}</span>`)).join('')}</div>
      ${C.levels.map(lv => {
        // A video that goes with several lessons and songs in this level gets one card that lists them all.
        const byVideo = new Map();
        lv.items.forEach(it => {
          const v = C.videoFor(it.id);
          if (!v) return;
          if (!byVideo.has(v.id)) byVideo.set(v.id, { v, items: [] });
          byVideo.get(v.id).items.push(it);
        });
        const lessonNo = it => lv.items.filter(x => x.kind === 'lesson').indexOf(it) + 1;
        return `<h3 class="vhead" style="margin-top:22px" id="vl-${lv.n}">Level ${lv.n} · ${esc(lv.name)}</h3>
          <div class="videos">${[...byVideo.values()].map(({ v, items }) => videoCard(v,
            `<span class="tag gold">Level ${lv.n}</span>${items.map(it => `<span class="tag${it.kind === 'song' ? ' aqua' : ''}">${it.kind === 'song' ? 'Song' : 'Lesson ' + lessonNo(it)}</span>`).join('')}`,
            'Play it: ' + items.map(it => `<a href="#/lesson/${it.id}">${esc(it.title)}</a>`).join(' · '))).join('')}</div>`;
      }).join('')}`;
    const target = focus && $('#vl-' + focus);
    if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  // ---------- lesson / song ----------

  const JUDGE_TEXT = { perfect: 'Perfect', good: 'Good', ok: 'OK', wrong: 'Wrong drum', extra: 'Extra note' };

  function viewLesson(id) {
    const item = C.byId[id], lv = C.levelOf(id);
    if (!item) { go('#/home'); return; }
    // Songs are always open; lessons wait for the level before to be passed.
    const isSong = item.kind === 'song';
    if (!P.levelUnlocked(lv.n) && !isSong) { go('#/level/' + lv.n); return; }
    const st = P.settings(), kid = kitId(), kit = KITS[kid], isMic = kit.src === 'mic';
    let tempo = (P.lesson(id) || {}).tempo || 100;
    const bars = E.buildChart(item);
    // Songs can be practised one section at a time, looped. part -1 is the whole song.
    let part = -1, reps = 1;
    function partBars() {
      if (!isSong || part < 0) return bars;
      const sec = bars.filter(b => b.section === part), out = [];
      for (let r = 0; r < reps; r++) sec.forEach(b => out.push(b));
      return out.map((b, i) => Object.assign({}, b, { index: i }));
    }
    let tl = E.buildTimeline(bars, item.bpm * tempo / 100);
    const idx = lv.items.indexOf(item);
    const allSongs = C.all.filter(x => x.kind === 'song');
    const nextItem = isSong ? allSongs[allSongs.indexOf(item) + 1] || null : lv.items[idx + 1] || (C.levels[lv.n] ? C.levels[lv.n].items[0] : null);
    const voices = E.LANES.concat(['ho']).filter(v => tl.notes.some(n => n.voice === v));
    const nPat = Math.min(4, Math.max.apply(null, bars.map(b => b.patBar)) + 1);
    const padsOk = kid === 'keys';
    const vid = C.videoFor(id);

    const legend = voices.map(v => {
      let how;
      if (kid === 'keys') how = touch ? '<span class="dim small">tap its pad</span>' : kbds(v);
      else if (kid === 'electronic') how = `<span class="dim small">MIDI ${I.notesForVoice(v).slice(0, 3).join(', ') || '–'}</span>`;
      else if (kid === 'pad') how = v === 'bd' || v === 'hp' ? '<span class="dim small">skipped on pad</span>' : '<span class="dim small">on the pad</span>';
      else how = `<span class="dim small">heard as ${esc(E.CLASS_NAME[E.CLASS_OF[v]])}</span>`;
      return `<div><i class="swatch" style="background:${V[v].color}"></i>${esc(V[v].name)} <span class="spacer"></span>${how}</div>`;
    }).join('');

    const songMap = () => {
      const total = item.sections.reduce((s, x) => s + x.bars, 0);
      return `<div class="songmap">${item.sections.map((s, i) => `<div style="flex:${s.bars / total};background:${SECTION_COLORS[i % SECTION_COLORS.length]}" title="${esc(s.name)}: ${s.bars} bars">${esc(s.name)}</div>`).join('')}</div>
        <div class="tablewrap"><table class="plain"><thead><tr><th>Section</th><th>Bars</th><th>Time</th><th>Chords</th></tr></thead><tbody>
        ${item.sections.map(s => `<tr><td>${esc(s.name)}</td><td>${s.bars}</td><td>${s.beats ? timeSig(Object.assign({}, item, s)) : timeSig(item)}</td><td class="muted">${esc(s.chords || '')}</td></tr>`).join('')}
        </tbody></table></div>`;
    };

    const partPicker = isSong ? `<div class="practice-part">
          <label>Practise <select id="part"><option value="-1">Whole song</option>${item.sections.map((s, i) => `<option value="${i}">${esc(s.name)} (${s.bars} bars)</option>`).join('')}</select></label>
          <label>Loop it <select id="reps" disabled><option value="1">×1</option><option value="2">×2</option><option value="4">×4</option></select></label>
        </div>` : '';

    app.innerHTML = `
      <div class="crumbs">${isSong
        ? `<a href="#/songs">Songs</a> › ${esc(item.title)}`
        : `<a href="#/home">Levels</a> › <a href="#/level/${lv.n}">Level ${lv.n} · ${esc(lv.title)}</a> › ${esc(item.title)}`}</div>
      <div class="lesson-head">
        <div>
          <h1>${esc(item.title)}</h1>
          <p class="muted">${esc(item.desc)}</p>
          <div class="tags">
            <span class="tag gold">${isSong ? 'Song · Level ' + lv.n : 'Lesson ' + (idx + 1)}</span>
            ${isSong ? `<span class="tag aqua">${esc(item.style)}</span>` : ''}
            <span class="tag">${item.bpm} BPM</span><span class="tag">${timeSig(item)}</span>
            ${isSong ? `<span class="tag">${bars.length} bars</span>` : ''}
            ${item.pad ? '<span class="tag green">pad-friendly</span>' : ''}
          </div>
        </div>
        <div class="best" id="best"></div>
      </div>
      <div id="banners"></div>
      <div class="card stage">
        <div class="stage-wrap"><canvas id="hw"></canvas><div class="countdown" id="cd"></div></div>
        <div class="hud">
          <div class="where" id="where">${touch ? 'Tap <b>Play</b> when you\'re ready.' : 'Press <b>Play</b> (or Enter) when you\'re ready.'}</div>
          <div class="judge" id="judge"></div>
          <div class="live" id="live"></div>
        </div>
        <div id="padsWrap"></div>
        <div class="controls">
          <button class="btn primary big" id="play">▶ Play</button>
          <button class="btn" id="listen" title="Hear the part played for you first">👂 Listen first</button>
          <button class="btn" id="stop" disabled>■ Stop</button>
          <span class="spacer"></span>
          <label class="tempo">Speed <input type="range" id="tempo" min="50" max="100" step="5" value="${tempo}"><output id="tempoOut"></output></label>
          <label class="tog"><input type="checkbox" id="optClick" checked> Click</label>
          ${isSong ? '<label class="tog"><input type="checkbox" id="optBand" checked> Band</label>' : ''}
          <label class="tog" title="${isMic ? 'Off for microphone kits, so the mic only hears you' : 'Play the drum part quietly along with you'}"><input type="checkbox" id="optDemo" ${!isMic && st.demoWhilePlaying ? 'checked' : ''} ${isMic ? 'disabled' : ''}> Play drums along</label>
          ${padsOk ? `<label class="tog"><input type="checkbox" id="optPads" ${st.tapPads ? 'checked' : ''}> Tap pads</label>` : ''}
        </div>
        ${partPicker}
        <p class="hint">You get a one-bar count-in. ${touch ? '' : '<kbd>Enter</kbd> plays, <kbd>Esc</kbd> stops. '}Stars and ${isSong ? 'song' : 'level'} progress count at 100% speed; slower runs are practice.</p>
      </div>
      <div id="results"></div>
      ${isSong ? '<div class="card" id="stepsCard" style="margin-top:16px"></div>' : ''}
      <div class="cols">
        <div class="card"><h2>How to play it</h2>${(item.intro || []).map(p => `<p>${esc(p)}</p>`).join('')}
          ${(item.tips || []).length ? `<h3>Tips</h3><ul>${item.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div>
        <div class="card"><h2>Your drums</h2><div class="legend">${legend}</div>
          ${kid === 'keys' && !touch ? '<p class="muted small" style="margin-top:12px">Left hand on <kbd>A</kbd>–<kbd>G</kbd>, right hand on <kbd>H</kbd>–<kbd>L</kbd>, thumb on <kbd>Space</kbd> for the kick.</p>' : ''}</div>
      </div>
      ${vid ? `<div class="card" style="margin-top:16px"><h2>Watch a teacher</h2>
        <div class="watch">${videoHtml(vid)}
          <div><h4>${esc(vid.title)}</h4>
            <p class="muted small">${esc(vid.channel)} on YouTube${HOSTED ? '' : ` · ${ytLink(vid)}`}</p>
            <p>${isSong ? 'This video teaches the main groove and fills in this song.' : 'This video teaches the same idea as this lesson.'} Watch it first, then press Play and try it yourself.${isMic ? ' Pause the video before you play, so the microphone only hears your drums.' : ''}</p>
            <p class="small"><a href="#/videos/${lv.n}">More videos for Level ${lv.n} →</a></p></div>
        </div></div>` : ''}
      <div class="card" style="margin-top:16px"><h2>${isSong ? 'Song map' : 'The pattern'}</h2>
        ${isSong ? songMap() : `<p class="muted small">${nPat > 1 ? `${nPat}-bar pattern` : 'One bar'}, played ${bars.length / nPat} times. Count along with the numbers on top.</p><canvas id="pat"></canvas>`}
      </div>`;

    const results = $('#results'), whereEl = $('#where'), judgeEl = $('#judge'), liveEl = $('#live'), cd = $('#cd');
    const highway = new N.Highway($('#hw'), tl, null);
    let player = null, run = null, startT = 0, raf = 0, playing = false, listening = false, unsubHit = null;
    let playStart = 0, lastRes = null, countIn = [], judgeTimer = 0, liveAt = 0, idleT = -0.6, endTimer = 0;

    const drawIdle = () => { highway.draw(idleT, false); if (!isSong) N.drawStatic($('#pat'), tl, { bars: nPat }); };
    drawIdle();

    function renderBest() {
      const L = P.lesson(id) || {};
      $('#best').innerHTML = `${starsHtml(L.stars || 0)}<div class="muted small">${L.best ? `Best ${L.best}%` : L.passed ? '' : '1 star (70%) at full speed passes'}</div>`;
    }
    renderBest();

    function renderBanners() {
      const out = [];
      const realDrums = devicesOk ? ' <a class="btn small" href="#/setup">Use real drums</a>' : '';
      if (kid === 'keys') out.push(touch
        ? `<div class="banner info">👆 Tap the drum pads under the note lane in time with the notes.${realDrums}</div>`
        : `<div class="banner info">⌨️ Playing on the computer keyboard. The keys for each drum are under “Your drums”, or click the on-screen pads.${realDrums}</div>`);
      if (kid === 'electronic' && I.midi.status !== 'on') out.push(`<div class="banner warn">🎛️ ${midiMessage()} You can use the keyboard meanwhile. <button class="btn small" data-act="midi">Connect kit</button></div>`);
      if (isMic) {
        out.push(`<div class="banner info">🎙️ The microphone turns on when you press Play. Wear ${touch ? 'wired ' : ''}headphones so it hears your drums, not the click.</div>`);
        if (kid === 'acoustic' && I.knownClasses().size < 2) out.push('<div class="banner warn">I don\'t know what your drums sound like yet, so I can only grade your timing, not which drum you hit. <a class="btn small" href="#/setup">Teach me your drums</a></div>');
        if (kid === 'pad' && tl.notes.some(n => n.lane === 'bd' || n.lane === 'hp')) out.push('<div class="banner info">⭕ On a practice pad the kick and hi-hat pedal notes are skipped. Play the hand parts, and tap your feet along if you can.</div>');
        if (!I.latencyCalibrated('mic')) out.push('<div class="banner">⏱️ For the most accurate timing, run the 20-second timing check once. <a class="btn small" href="#/setup/timing">Timing check</a></div>');
      }
      $('#banners').innerHTML = out.join('');
      const b = $('#banners [data-act=midi]');
      if (b) b.onclick = () => I.startMidi().catch(() => {}).then(renderBanners);
    }
    renderBanners();
    onLeave(I.onRaw(e => { if (e.type === 'midi-status') renderBanners(); }));

    function tempoText() { $('#tempoOut').textContent = `${tempo}% · ${Math.round(item.bpm * tempo / 100)} BPM`; }
    tempoText();
    function setTempo(pct) {
      tempo = clamp(pct, 50, 100);
      $('#tempo').value = tempo;
      tempoText();
      P.setTempo(id, tempo);
      if (!playing) { tl = E.buildTimeline(partBars(), item.bpm * tempo / 100); highway.set(tl, null); drawIdle(); }
    }
    $('#tempo').oninput = e => setTempo(+e.target.value);

    function setButtons() {
      $('#play').disabled = playing;
      $('#listen').disabled = playing;
      $('#stop').disabled = !playing;
      $('#tempo').disabled = playing;
      if (isSong) { $('#part').disabled = playing; $('#reps').disabled = playing || part < 0; }
    }

    // ----- section practice (songs) -----
    const partName = () => (part < 0 ? 'the whole song' : item.sections[part].name);
    function setPart(p, r) {
      part = p;
      if (r) reps = r;
      $('#part').value = part;
      $('#reps').value = reps;
      setButtons();
      if (!playing) { tl = E.buildTimeline(partBars(), item.bpm * tempo / 100); highway.set(tl, null); drawIdle(); }
    }
    function scrollToStage() { $('.stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (isSong) {
      $('#part').onchange = e => { setPart(+e.target.value); whereEl.innerHTML = `Ready to practise <b>${esc(partName())}</b>. ${touch ? 'Tap' : 'Press'} <b>Play</b>.`; };
      $('#reps').onchange = e => setPart(part, +e.target.value);
    }

    function renderSteps() {
      if (!isSong) return;
      const L = P.lesson(id) || {};
      const steps = [{
        title: 'Listen to the whole song',
        text: 'Hear the drums with the band once before you play. The section names along the top show where you are.',
        done: !!L.listened, act: '<button class="btn small" data-step="listen">👂 Listen</button>',
      }];
      item.sections.forEach((s, i) => {
        const best = P.sectionBest(id, i), slow = P.sectionSlow(id, i);
        const sofar = best ? ` Best at full speed: ${best}%.` : slow ? ` So far: ${slow.score}% at ${slow.tempo}% speed.` : '';
        steps.push({
          title: `Learn the ${s.name}`,
          text: `${s.bars} bar${s.bars > 1 ? 's' : ''}${s.chords ? ' · ' + s.chords : ''}. Loop it slowly, then work up to 100% speed and score 80%.${sofar}`,
          done: best >= 80, act: `<button class="btn small" data-step="part" data-part="${i}">Practise</button>`,
        });
      });
      steps.push({
        title: 'Play the whole song',
        text: 'Put it all together at full speed. 70% earns your first star.',
        done: !!L.passed, act: '<button class="btn small" data-step="whole">▶ Play it all</button>',
      });
      const cur = steps.findIndex(s => !s.done);
      $('#stepsCard').innerHTML = `<h2>Learn it step by step</h2>
        <p class="muted small">${cur < 0 ? 'You\'ve learned the whole song. Go for three stars!' : `Step ${cur + 1} of ${steps.length}. Each part is ticked off when you score 80% at full speed.`}</p>
        <ol class="steps">${steps.map((s, i) => `<li class="${i === cur ? 'current' : ''}"><span class="num ${s.done ? 'done' : ''}">${s.done ? '✓' : i + 1}</span>
          <div><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></div><div class="act">${s.act}</div></li>`).join('')}</ol>`;
      $$('[data-step]', $('#stepsCard')).forEach(b => {
        b.onclick = () => {
          if (playing) return;
          const kind = b.dataset.step;
          if (kind === 'listen') { setPart(-1); scrollToStage(); begin(true); return; }
          if (kind === 'whole') { setPart(-1); setTempo(100); whereEl.innerHTML = `The whole song at full speed. ${touch ? 'Tap' : 'Press'} <b>Play</b> when you're ready.`; }
          else {
            const p = +b.dataset.part;
            // Start a new part slower; once it has been tried, keep the speed the player chose.
            if (!P.sectionTried(id, p)) setTempo(Math.min(tempo, 70));
            setPart(p, 2);
            whereEl.innerHTML = `<b>${esc(partName())}</b>, looped twice at ${tempo}%. ${touch ? 'Tap' : 'Press'} <b>Play</b> when you're ready.`;
          }
          results.innerHTML = '';
          scrollToStage();
        };
      });
    }

    // ----- on-screen tap pads -----
    function renderPads() {
      const w = $('#padsWrap');
      if (padsOk && st.tapPads) mountPads(w, voices); else w.innerHTML = '';
    }
    if (padsOk) $('#optPads').onchange = e => { st.tapPads = e.target.checked; P.save(); renderPads(); };

    function showJudge(text, color) {
      judgeEl.textContent = text;
      judgeEl.style.color = color || '';
      judgeEl.style.opacity = 1;
      clearTimeout(judgeTimer);
      judgeTimer = setTimeout(() => { judgeEl.style.opacity = 0.3; }, 700);
    }

    function onHit(h) {
      if (!run) return;
      if (h.src === 'mic' && !isMic) return;
      const rt = h.t - startT;
      // Ignore hits during the count-in and after the end, so warming up isn't graded as extra notes.
      if (rt < -0.35 || rt > tl.duration + 0.35) return;
      if (kit.mode === 'exact' && !h.voice) { showJudge(`Unmapped pad${h.note != null ? ' (note ' + h.note + ')' : ''}`, '#ffb347'); return; }
      if (kit.mode === 'class' && !h.cls && h.voice) h = Object.assign({}, h, { cls: E.CLASS_OF[h.voice] });
      const r = run.addHit(h);
      let text = JUDGE_TEXT[r.judge];
      if (r.off != null && (r.judge === 'good' || r.judge === 'ok')) text += ' · ' + E.timingWords(r.off * 1000);
      showJudge(text, N.JUDGE_COLOR[r.judge]);
    }

    function updateLive(songT) {
      if (!run) { liveEl.innerHTML = listening ? 'Listening…' : ''; return; }
      const due = run.targets.filter(t => !t.optional && t.t + t.win < songT);
      const got = due.filter(t => t.hit && t.judge !== 'wrong').length;
      liveEl.innerHTML = `Notes <b>${got}</b> / ${due.length}`;
    }

    async function begin(listen) {
      if (playing) return;
      stopVideos();
      A.init();
      if (!listen && isMic && !I.mic.on) {
        whereEl.textContent = 'Turning on the microphone…';
        try { await I.startMic(st.micDevice); } catch (err) {
          whereEl.textContent = 'The microphone could not start.';
          toast('Microphone problem: ' + (err && err.message ? err.message : err), 6000);
          return;
        }
        updateBadge();
      }
      if (!listen && kid === 'electronic' && I.midi.status !== 'on') I.startMidi().catch(() => {});
      results.innerHTML = '';
      lastRes = null;
      tl = E.buildTimeline(partBars(), item.bpm * tempo / 100);
      // On a phone, bring the note lane and pads into view.
      if (innerWidth < 700) scrollToStage();
      const bar0 = tl.bars[0];
      startT = A.ctx.currentTime + 0.25 + bar0.dur;
      countIn = tl.clicks.filter(c => c.bar === 0).map(c => ({ t: startT - bar0.dur + c.t, accent: c.accent }));
      const demo = listen || (!isMic && $('#optDemo').checked);
      player = new A.Player(tl, {
        start: startT, countIn, demo,
        click: $('#optClick').checked,
        backing: isSong && $('#optBand').checked,
      });
      run = listen ? null : new E.Run(tl, { mode: kit.mode, start: startT, level: lv.n, knownClasses: I.knownClasses() });
      highway.set(tl, run);
      playing = true;
      listening = listen;
      playStart = performance.now();
      setButtons();
      judgeEl.textContent = '';
      if (!listen) unsubHit = I.onHit(onHit);
      raf = requestAnimationFrame(frame);
      // Browsers stop drawing frames in hidden tabs, so a timer makes sure the run still ends.
      endTimer = setTimeout(function check() {
        if (!playing) return;
        const left = startT + tl.duration + 0.6 - A.heardNow();
        if (left <= 0) finish(); else endTimer = setTimeout(check, left * 1000 + 50);
      }, (startT + tl.duration + 0.6 - A.heardNow()) * 1000);
    }

    function frame() {
      if (!playing) return;
      const heard = A.heardNow(), songT = heard - startT;
      highway.draw(songT, true);
      if (songT < 0) {
        const k = countIn.filter(c => c.t <= heard).length;
        cd.textContent = k ? k : '';
        whereEl.innerHTML = listening ? '<b>Listen</b> · count-in…' : '<b>Get ready</b> · count-in…';
      } else {
        cd.textContent = '';
        const bar = tl.bars.find(b => songT < b.t + b.dur) || tl.bars[tl.bars.length - 1];
        const where = bar.sectionName ? `<b>${esc(bar.sectionName)}</b> · ` : listening ? '<b>Listening</b> · ' : '';
        whereEl.innerHTML = `${where}Bar ${bar.index + 1} of ${tl.bars.length}`;
      }
      if (performance.now() - liveAt > 150) { liveAt = performance.now(); updateLive(songT); }
      if (songT > tl.duration + 0.5) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }

    function teardown() {
      playing = false;
      cancelAnimationFrame(raf);
      clearTimeout(endTimer);
      if (player) { player.stop(); player = null; }
      if (unsubHit) { unsubHit(); unsubHit = null; }
      cd.textContent = '';
      setButtons();
    }

    function stop() {
      if (!playing) return;
      teardown();
      run = null;
      highway.set(tl, null);
      drawIdle();
      whereEl.innerHTML = 'Stopped. Press <b>Play</b> to start again.';
      liveEl.textContent = '';
    }

    function mainSrc() {
      const n = {};
      run.hits.forEach(h => { n[h.src] = (n[h.src] || 0) + 1; });
      return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || kit.src;
    }

    function finish() {
      const wasListen = listening;
      const secs = (performance.now() - playStart) / 1000;
      teardown();
      highway.draw(tl.duration + 0.2, false);
      if (wasListen) {
        if (isSong && part < 0) { P.markListened(id); renderSteps(); }
        whereEl.innerHTML = `That's how it goes. ${touch ? 'Tap' : 'Press'} <b>Play</b> to try it yourself.`;
        liveEl.textContent = '';
        return;
      }
      P.addSeconds(secs);
      updateLive(tl.duration + 1);
      if (!run.hits.length) { whereEl.textContent = 'Finished.'; results.innerHTML = noHitsHelp(); return; }
      const res = E.analyze(run, {
        level: lv.n, tempoPct: tempo, bpm: tl.bpm, src: mainSrc(),
        sections: item.sections ? item.sections.map(s => s.name) : null,
        barNames: item.barNames || null,
      });
      const rec = part >= 0 ? P.recordSection(item, part, res, tempo) : P.record(item, res, tempo);
      lastRes = res;
      whereEl.innerHTML = 'Finished! Your results are below.';
      renderResults(res, rec);
      renderBest();
      renderSteps();
    }

    function noHitsHelp() {
      let tip;
      if (kid === 'keys' && touch) tip = 'Tap the coloured pads under the note lane while it plays. If you can\'t see them, tick “Tap pads” next to the Play button.';
      else if (kid === 'keys') tip = 'Click once on the page so it has keyboard focus, then use the keys shown under “Your drums”, or click the on-screen pads.';
      else if (kid === 'electronic') tip = `No hits came in from your kit. ${midiMessage()} If your module only has round 5-pin MIDI sockets you'll need a USB-MIDI interface. You can check each pad in <a href="#/setup">Setup</a>.`;
      else tip = 'The microphone didn\'t pick up any hits. In <a href="#/setup">Setup</a>, check the right microphone is chosen and raise the sensitivity until the meter jumps when you play.';
      return `<div class="card results"><h2>I didn't hear anything</h2><p class="muted">${tip}</p></div>`;
    }

    function headline(res) {
      if (part >= 0) {
        if (tempo >= 100 && res.score >= 80) return 'Part learned. On to the next one!';
        return res.score >= 85 ? 'Solid at this speed. Now speed it up!' : res.score >= 60 ? 'Getting there. Loop it a few more times.' : 'Slow it down and loop it.';
      }
      if (tempo < 100) return res.score >= 85 ? 'Solid at this speed. Time to speed up!' : res.score >= 60 ? 'Getting there. Keep going at this speed.' : 'Keep practising at this speed.';
      return ['Not passed yet. Keep at it!', 'Passed! Nice work.', 'Great playing!', 'Outstanding!'][res.stars];
    }

    function renderResults(res, rec) {
      const c = res.counts;
      const chip = (label, n, color) => `<span class="chip"><i style="background:${color}"></i>${label} ${n}</span>`;
      const chips = [chip('Perfect', c.perfect, N.JUDGE_COLOR.perfect)];
      if (c.good) chips.push(chip('Good', c.good, N.JUDGE_COLOR.good));
      if (c.ok) chips.push(chip('OK', c.ok, N.JUDGE_COLOR.ok));
      if (c.wrong) chips.push(chip('Wrong drum', c.wrong, N.JUDGE_COLOR.wrong));
      chips.push(chip('Missed', c.miss, N.JUDGE_COLOR.miss));
      if (c.extra) chips.push(chip('Extra', c.extra, N.JUDGE_COLOR.extra));
      const timing = res.timing.n >= 3
        ? `On average you were <b>${E.timingWords(res.timing.mean)}</b>, with a spread of about ±${Math.round(res.timing.sd)}ms. Dots above the line were late, below were early.`
        : 'Not enough notes to measure your timing.';
      const fixes = res.findings.length
        ? res.findings.map((f, i) => `<div class="finding ${i === 0 && f.sev >= 20 ? 'big' : ''}"><h4>${esc(f.title)}</h4><p>${esc(f.detail)}</p>${(f.tips || []).length ? `<ul>${f.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div>`).join('')
        : '<div class="positive">Nothing to fix. That was clean!</div>';
      const good = res.positives.length ? res.positives.map(p => `<div class="positive">${esc(p)}</div>`).join('') : '<p class="muted">Keep going. Every run builds the habit.</p>';
      const nx = res.next;
      let suggest = '';
      if (nx.type === 'slower') suggest = `<button class="btn primary" data-act="tempo" data-pct="${nx.pct}">Try it at ${nx.pct}% speed</button>`;
      else if (nx.type === 'faster') suggest = `<button class="btn primary" data-act="tempo" data-pct="${nx.pct}">Speed up to ${nx.pct}%</button>`;
      else if (part >= 0) {
        const np = part + 1 < item.sections.length ? part + 1 : -1;
        suggest = `<button class="btn primary" data-act="part" data-part="${np}">${np >= 0 ? `Next part: ${esc(item.sections[np].name)} →` : 'Play the whole song →'}</button>`;
      } else if (nx.type === 'next' && nextItem) suggest = `<a class="btn primary" href="#/lesson/${nextItem.id}">Next: ${esc(nextItem.title)} →</a>`;
      const sub = part >= 0
        ? (tempo < 100 ? 'Get this part to 80% at 100% speed to tick it off.' : res.score >= 80 ? 'Part learned and ticked off ✓' : 'Score 80% at full speed to tick this part off.')
        : tempo >= 100 ? (res.stars ? '' : 'You need 70% at full speed to pass.') : 'Stars and passes count at 100% speed.';
      results.innerHTML = `<div class="card results">
        <div class="score-row">
          <div class="score">${res.score}<small>%</small></div>
          ${part >= 0 ? `<span class="tag aqua">${esc(item.sections[part].name)}${reps > 1 ? ' ×' + reps : ''} · ${tempo}%</span>` : tempo >= 100 ? starsHtml(res.stars) : `<span class="tag">Practice · ${tempo}% speed</span>`}
          <div class="headline"><h2>${esc(headline(res))}</h2>
            <p class="muted small" style="margin:0">${sub}</p></div>
          <div class="xp"><b>+${rec.xp} XP</b><div class="small muted">${rec.firstPass ? 'Lesson passed! ' : ''}${rec.newBest ? 'New best score!' : ''}</div></div>
        </div>
        <div class="counts">${chips.join('')}</div>
        <p class="muted small">${timing}</p>
        <canvas class="offsets" id="offs"></canvas>
        <div class="feedback">
          <div><h3>What to work on</h3>${fixes}</div>
          <div><h3>What went well</h3>${good}</div>
        </div>
        <div class="actions">
          ${suggest}
          <button class="btn ${suggest ? '' : 'primary'}" data-act="again">↻ Play again</button>
          ${nextItem && part < 0 && nx.type !== 'next' && (P.lesson(id) || {}).passed ? `<a class="btn" href="#/lesson/${nextItem.id}">Next: ${esc(nextItem.title)} →</a>` : ''}
          <span class="spacer"></span>
          ${isSong ? '<a class="btn ghost" href="#/songs">All songs</a>' : `<a class="btn ghost" href="#/level/${lv.n}">Back to level ${lv.n}</a>`}
        </div>
      </div>`;
      N.drawOffsets($('#offs'), res);
      $$('[data-act=tempo]', results).forEach(b => { b.onclick = () => { setTempo(+b.dataset.pct); begin(false); }; });
      $$('[data-act=part]', results).forEach(b => {
        b.onclick = () => {
          const p = +b.dataset.part;
          if (p < 0) { setPart(-1); setTempo(100); }
          else { if (!P.sectionTried(id, p)) setTempo(Math.min(tempo, 70)); setPart(p, Math.max(reps, 2)); }
          begin(false);
        };
      });
      $$('[data-act=again]', results).forEach(b => { b.onclick = () => begin(false); });
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    $('#play').onclick = () => begin(false);
    $('#listen').onclick = () => begin(true);
    $('#stop').onclick = stop;
    renderPads();
    renderSteps();

    const onKey = e => {
      if (e.key === 'Enter' && !e.repeat) {
        const a = document.activeElement, tag = a ? a.tagName : '';
        if (/^(BUTTON|A|SELECT|TEXTAREA)$/.test(tag) || (tag === 'INPUT' && a.type !== 'range' && a.type !== 'checkbox')) return;
        e.preventDefault();
        if (!playing) begin(false);
      } else if (e.key === 'Escape' && playing) stop();
    };
    window.addEventListener('keydown', onKey);
    const onResize = () => { if (!playing) drawIdle(); else if (!isSong) N.drawStatic($('#pat'), tl, { bars: nPat }); };
    window.addEventListener('resize', onResize);
    onLeave(() => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      teardown();
      if (I.mic.on) I.stopMic();
    });

    // Test hook: lets automated checks play perfect or sloppy runs without real drums.
    window.__drumTest = {
      simulateHits(list) {
        list.forEach(h => onHit({ t: startT + h.t, raw: startT + h.t, voice: h.voice || null, cls: h.cls || null, vel: h.vel == null ? 0.8 : h.vel, src: h.src || kit.src }));
        return run ? run.hits.length : 0;
      },
      perfect(jitterMs) {
        if (!run) return 0;
        run.targets.forEach(tg => {
          const v = tg.voices[0], j = (Math.random() * 2 - 1) * (jitterMs || 0) / 1000;
          onHit({ t: startT + tg.t + j, raw: startT + tg.t + j, voice: v, cls: E.CLASS_OF[v], vel: 0.8, src: kit.src });
        });
        return run.hits.length;
      },
      finish() { if (playing) finish(); return lastRes; },
      state() {
        return {
          playing, listening, item: id, bpm: tl.bpm, tempo, mode: kit.mode, songTime: playing ? A.heardNow() - startT : null,
          part, reps, bars: tl.bars.length, pads: $$('#padsWrap .pad').length,
          hits: run ? run.hits.length : 0, targets: run ? run.targets.length : 0,
          last: lastRes && { score: lastRes.score, stars: lastRes.stars, counts: lastRes.counts, findings: lastRes.findings.map(f => f.id), next: lastRes.next },
        };
      },
    };
  }

  // ---------- setup ----------

  function viewSetup(focus) {
    const st = P.settings(), kid = kitId(), kit = KITS[kid], isMic = kit.src === 'mic';
    const allVoices = ['bd', 'sn', 'hh', 'ho', 'hp', 'cr', 'rd', 't1', 't2', 'ft'];
    const lat = src => (I.latencyCalibrated(src) ? Math.round(st.latency[src] * 1000) + 'ms (measured)' : 'not measured yet');

    let kitPanel = '';
    if (kid === 'electronic') {
      kitPanel = `<div class="card" style="margin-top:16px"><h2>Electronic kit</h2>
        <p class="muted">${touch
          ? 'Connect your drum module to the phone with its USB cable and a USB-OTG adapter, switch it on, then press Connect. This works in Chrome on Android.'
          : 'Connect your drum module to the computer with a USB cable (or a USB-MIDI interface), switch it on, then press Connect. This works in Chrome and Edge.'}</p>
        <div class="row"><button class="btn primary" id="midiConnect">Connect</button><span id="midiStatus" class="muted"></span></div>
        <div class="field"><label>Last hit</label><span class="heard" id="midiLast">Hit any pad…</span></div>
        <p class="muted small">Most kits use the standard General MIDI notes and work straight away. If a pad shows up as the wrong drum, press <b>Learn</b> next to the right drum and hit that pad.</p>
        <div class="tablewrap"><table class="plain"><thead><tr><th>Drum</th><th>MIDI notes</th><th></th></tr></thead><tbody id="midiMap"></tbody></table></div>
        <div class="row" style="margin-top:10px"><button class="btn small" id="midiReset">Reset to standard notes</button></div>
      </div>`;
    } else if (isMic) {
      kitPanel = `<div class="card" style="margin-top:16px"><h2>Microphone</h2>
        <p class="muted">${touch
          ? (kid === 'pad' ? 'Put your phone near the pad.' : 'Stand your phone a couple of metres in front of the kit.') + ' Wear wired headphones for the click and music (Bluetooth adds delay), so the mic only hears your drums.'
          : (kid === 'pad' ? 'Put the computer or a USB mic near the pad.' : 'Put the computer or a USB mic a couple of metres in front of the kit.') + ' Wear headphones for the click and music, so the mic only hears your drums.'}</p>
        <div class="field"><label>Microphone</label><select id="micSel"><option value="">Default microphone</option></select><button class="btn" id="micToggle"></button></div>
        <div class="field"><label>Input level</label><div class="meter" style="flex:1;min-width:200px"><i id="micLvl"></i><b id="micThr"></b></div></div>
        <div class="field"><label>Sensitivity</label><input type="range" id="micSens" min="0" max="1" step="0.05" value="${st.micSens}"><span class="muted small">Raise it until every hit shows below. Lower it if it hears hits you didn't play. The white line on the meter is the trigger level.</span></div>
        <div class="field"><label>Heard</label><span class="heard" id="micHeard">–</span></div>
      </div>
      ${kid === 'acoustic' ? `<div class="card"><h2>Teach me your drums</h2>
        <p class="muted">I tell your drums apart by how they sound. For each drum, press <b>Teach</b> and hit it 4 times at a normal volume, about a second apart, with nothing else ringing. Teach at least the kick, snare and hi-hat. Then hit around the kit and watch “Heard” above.</p>
        <div class="tablewrap"><table class="plain"><tbody id="teachRows"></tbody></table></div>
        <div class="row" style="margin-top:10px"><button class="btn small danger" id="forgetAll">Forget all</button></div>
      </div>` : ''}`;
    } else {
      kitPanel = `<div class="card" style="margin-top:16px"><h2>${touch ? 'On-screen drum pads' : 'Computer keyboard'}</h2>
        ${touch
          ? '<p class="muted">Each coloured pad is a drum, laid out like a kit: cymbals on top, toms in the middle, then snare, hi-hat pedal and kick. Use two thumbs or a few fingers, just like two hands and a foot.</p>'
          : `<p class="muted">Each key plays a drum. Your left hand sits on the left keys and your right hand on the right, like on a real kit. You can also click the on-screen pads.</p>
        <div class="tablewrap"><table class="plain"><thead><tr><th>Drum</th><th>Keys</th></tr></thead><tbody>
        ${allVoices.map(v => `<tr><td><i class="swatch" style="display:inline-block;background:${V[v].color}"></i> ${esc(V[v].name)}</td><td>${kbds(v)}</td></tr>`).join('')}
        </tbody></table></div>`}
        <div class="field" style="margin-top:12px"><label class="tog"><input type="checkbox" id="tapPads" ${st.tapPads ? 'checked' : ''}> Show on-screen tap pads</label></div>
        <div id="setupPads"></div>
      </div>`;
    }

    app.innerHTML = `
      <h1>Setup</h1>
      <div class="card"><h2>What are you playing on?</h2>
        ${devicesOk ? '' : `<div class="banner info" style="margin-top:10px">${HOSTED
          ? '📱 This link works with the on-screen pads. To use the microphone or USB drums, double-click phone.bat on your computer and scan the QR code on its Setup page.'
          : '🔒 The microphone and USB drums need a secure address (https or localhost). The on-screen pads work anywhere.'}</div>`}
        <div class="grid kits" style="margin-top:10px">${Object.keys(KITS).map(k => kitCard(k, k === kid)).join('')}</div>
      </div>
      ${kitPanel}
      <div class="card" id="timing"><h2>Timing check</h2>
        <p class="muted">Every setup has a small delay between hitting a drum and the ${device} hearing it. Play along with 10 clicks, hitting right on each one, and I'll measure the delay and take it out of your scores.</p>
        <div class="beats" id="calDots">${'<i></i>'.repeat(10)}</div>
        <div class="row" style="justify-content:center"><button class="btn primary" id="calStart">Start timing check</button><button class="btn small ghost" id="calReset">Reset</button></div>
        <p class="muted small" id="calOut" style="text-align:center;margin-top:10px">Current delay for ${esc(kit.name.toLowerCase())}: ${lat(kit.src)}.</p>
      </div>
      <div class="cols">
        <div class="card"><h2>Sound</h2>
          <div class="field"><label>Click</label><input type="range" min="0" max="1" step="0.05" data-vol="click" value="${st.volumes.click}"></div>
          <div class="field"><label>Demo drums</label><input type="range" min="0" max="1" step="0.05" data-vol="drums" value="${st.volumes.drums}"></div>
          <div class="field"><label>Backing band</label><input type="range" min="0" max="1" step="0.05" data-vol="backing" value="${st.volumes.backing}"></div>
          <div class="field"><label class="tog"><input type="checkbox" id="hitSounds" ${st.hitSounds ? 'checked' : ''}> Make drum sounds when I ${touch ? 'tap the pads' : 'press keys or click the pads'}</label></div>
          <div class="field"><label class="tog"><input type="checkbox" id="demoDefault" ${st.demoWhilePlaying ? 'checked' : ''}> Play the drum part along with me (keyboard and electronic kits)</label></div>
        </div>
        <div class="card"><h2>Progress</h2>
          <div class="field"><label>Starting level</label><select id="placement">${C.levels.map(lv => `<option value="${lv.n}" ${lv.n === P.data.placement ? 'selected' : ''}>Level ${lv.n} · ${esc(lv.name)}</option>`).join('')}</select></div>
          <div class="field"><label class="tog"><input type="checkbox" id="unlockAll" ${st.unlockAll ? 'checked' : ''}> Unlock all levels</label></div>
          <p class="muted small" id="saveNote">${esc(saveNote())}</p>
          <div class="field"><button class="btn danger" id="resetAll">Reset progress</button></div>
        </div>
      </div>`;

    // kit choice
    $$('.kit', app).forEach(b => {
      b.onclick = () => {
        const k = b.dataset.kit;
        if (k === kid || b.disabled) return;
        st.kit = k;
        P.save();
        if (KITS[k].src !== 'mic' && I.mic.on) I.stopMic();
        if (k === 'electronic') I.startMidi().catch(() => {});
        route();
      };
    });

    // electronic kit
    if (kid === 'electronic') {
      const status = () => { $('#midiStatus').textContent = midiMessage(); updateBadge(); };
      const rows = () => {
        $('#midiMap').innerHTML = allVoices.map(v => `<tr><td><i class="swatch" style="display:inline-block;background:${V[v].color}"></i> ${esc(V[v].name)}</td>
          <td class="muted">${I.notesForVoice(v).join(', ') || '–'}</td><td style="text-align:right"><button class="btn small" data-learn="${v}">Learn</button></td></tr>`).join('');
        $$('[data-learn]', app).forEach(b => {
          b.onclick = () => {
            const v = b.dataset.learn;
            $$('[data-learn]', app).forEach(x => { x.textContent = 'Learn'; x.classList.remove('on'); });
            b.textContent = 'Hit the pad…';
            b.classList.add('on');
            I.midi.learn = note => {
              st.midiMap[note] = v;
              P.save();
              rows();
              toast(`Note ${note} now plays ${V[v].name}.`);
            };
          };
        });
      };
      status();
      rows();
      $('#midiConnect').onclick = () => I.startMidi().catch(() => {}).then(status);
      $('#midiReset').onclick = () => { st.midiMap = {}; P.save(); rows(); toast('Back to the standard General MIDI notes.'); };
      if (I.midi.status === 'off') I.startMidi().catch(() => {}).then(status);
      onLeave(() => { I.midi.learn = null; });
      onLeave(I.onRaw(e => {
        if (e.type === 'midi-status') status();
        if (e.type === 'midi') {
          const el = $('#midiLast');
          el.innerHTML = `Note ${e.note} → ${e.voice ? `<span style="color:${V[e.voice].color}">${esc(V[e.voice].name)}</span>` : '<span class="muted">not mapped</span>'} <span class="muted small">(velocity ${Math.round(e.vel * 127)})</span>`;
          el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
        }
      }));
    }

    // microphone
    if (isMic) {
      const toggle = $('#micToggle');
      const sync = () => { toggle.textContent = I.mic.on ? 'Turn off' : 'Turn on'; toggle.classList.toggle('primary', !I.mic.on); updateBadge(); };
      const fillMics = async () => {
        const mics = await I.listMics().catch(() => []);
        $('#micSel').innerHTML = '<option value="">Default microphone</option>' + mics.filter(m => m.id && m.id !== 'default').map(m => `<option value="${esc(m.id)}" ${m.id === st.micDevice ? 'selected' : ''}>${esc(m.label)}</option>`).join('');
      };
      const start = async () => {
        try { await I.startMic(st.micDevice); } catch (err) { toast('Microphone problem: ' + (err && err.message ? err.message : err), 6000); }
        sync();
        fillMics();
      };
      sync();
      fillMics();
      toggle.onclick = () => { if (I.mic.on) { I.stopMic(); sync(); } else start(); };
      $('#micSel').onchange = e => { st.micDevice = e.target.value; P.save(); if (I.mic.on) start(); };
      const pct = db => clamp((db + 60) / 60, 0, 1) * 100;
      const thr = () => { $('#micThr').style.left = pct(20 * Math.log10(I.threshold(st.micSens))) + '%'; };
      thr();
      $('#micSens').oninput = e => { st.micSens = +e.target.value; I.setSensitivity(st.micSens); thr(); };
      $('#micSens').onchange = () => P.save();
      const meter = setInterval(() => { $('#micLvl').style.width = (I.mic.on ? pct(20 * Math.log10(I.mic.level + 1e-6)) : 0) + '%'; }, 50);
      onLeave(() => clearInterval(meter));
      onLeave(I.onRaw(e => {
        if (e.type !== 'onset') return;
        const el = $('#micHeard');
        const loud = `<span class="muted small">loudness ${Math.round(e.vel * 100)}%</span>`;
        if (e.calibrating) el.innerHTML = `Learning… ${loud}`;
        else if (e.cls) el.innerHTML = `${esc(E.CLASS_NAME[e.cls])} <span class="muted small">(${Math.round(e.conf * 100)}% sure)</span> ${loud}`;
        else el.innerHTML = `Hit! ${loud}`;
        el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
      }));
      onLeave(() => { I.cancelTeach(); if (I.mic.on) I.stopMic(); });

      if (kid === 'acoustic') {
        let teaching = null;
        const rows = () => {
          const known = I.knownClasses();
          $('#teachRows').innerHTML = I.CLASSES.map(c => `<tr>
            <td style="width:120px"><b>${esc(E.CLASS_NAME[c])}</b></td>
            <td><span class="pips" id="pips-${c}">${'<i></i>'.repeat(4).replace(/<i>/g, known.has(c) ? '<i class="on">' : '<i>')}</span></td>
            <td class="muted small" id="tstat-${c}">${teaching === c ? `Hit the ${esc(E.CLASS_NAME[c].toLowerCase())} 4 times…` : known.has(c) ? 'Learned' : 'Not taught yet'}</td>
            <td style="text-align:right"><button class="btn small ${teaching === c ? 'on' : ''}" data-teach="${c}">${teaching === c ? 'Cancel' : known.has(c) ? 'Teach again' : 'Teach'}</button>
            ${known.has(c) ? `<button class="btn small ghost" data-forget="${c}">Forget</button>` : ''}</td></tr>`).join('');
          $$('[data-teach]', app).forEach(b => {
            b.onclick = async () => {
              const c = b.dataset.teach;
              if (teaching === c) { I.cancelTeach(); return; }
              if (!I.mic.on) await start();
              if (!I.mic.on) return;
              teaching = c;
              rows();
              $$(`#pips-${c} i`).forEach(p => p.classList.remove('on'));
              I.teach(c, 4, k => { $$(`#pips-${c} i`).forEach((p, i) => p.classList.toggle('on', i < k)); })
                .then(() => { teaching = null; rows(); toast(`Got it. I know your ${E.CLASS_NAME[c].toLowerCase()} now.`); })
                .catch(() => { if (teaching === c) { teaching = null; rows(); } });
            };
          });
          $$('[data-forget]', app).forEach(b => { b.onclick = () => { I.forget(b.dataset.forget); rows(); }; });
        };
        rows();
        $('#forgetAll').onclick = () => askConfirm('Forget all drums?', 'I\'ll forget the sound of every drum you taught me. You can teach them again any time.', 'Forget all')
          .then(ok => { if (ok) { I.forget(); rows(); } });
      }
    }

    // timing check
    let cal = null;
    const calOut = $('#calOut'), dots = $$('#calDots i');
    const endCal = () => {
      if (!cal) return;
      cal.unsub();
      cal.timers.forEach(clearTimeout);
      cal = null;
      $('#calStart').disabled = false;
    };
    onLeave(endCal);
    $('#calStart').onclick = async () => {
      if (cal) return;
      if (isMic && !I.mic.on) {
        try { await I.startMic(st.micDevice); } catch (err) { toast('Microphone problem: ' + (err && err.message ? err.message : err), 6000); return; }
        if ($('#micToggle')) $('#micToggle').textContent = 'Turn off';
        updateBadge();
      }
      if (kid === 'electronic' && I.midi.status !== 'on') { toast('Connect your kit first.'); return; }
      A.init();
      const beat = 60 / 90, n = 10, t0 = A.ctx.currentTime + 0.5, clicks = [];
      for (let i = 0; i < n; i++) { const t = t0 + i * beat; clicks.push(t); A.click(t, i % 4 === 0 ? 'accent' : 'beat'); }
      dots.forEach(d => d.classList.remove('lit', 'mute'));
      const offs = {};
      cal = {
        timers: [],
        unsub: I.onHit(h => {
          const k = Math.round((h.raw - t0) / beat);
          if (k < 2 || k >= n) return;
          const d = h.raw - clicks[k];
          if (Math.abs(d) > beat * 0.45) return;
          const o = offs[h.src] = offs[h.src] || {};
          if (o[k] == null) { o[k] = d; dots[k].classList.add('mute'); }
        }),
      };
      $('#calStart').disabled = true;
      calOut.textContent = 'Listen to the first two clicks, then hit right on each click after that.';
      const lead = (t0 - A.heardNow()) * 1000;
      clicks.forEach((t, i) => cal.timers.push(setTimeout(() => {
        dots.forEach((d, j) => d.classList.toggle('lit', j === i));
      }, lead + (t - t0) * 1000)));
      cal.timers.push(setTimeout(() => {
        dots.forEach(d => d.classList.remove('lit'));
        const saved = [];
        Object.keys(offs).forEach(src => {
          const vals = Object.values(offs[src]);
          if (vals.length < 4) return;
          st.latency[src] = clamp(E.median(vals), -0.05, 0.4);
          saved.push(`${src === 'mic' ? 'microphone' : src === 'midi' ? 'electronic kit' : 'keyboard'} ${Math.round(st.latency[src] * 1000)}ms`);
        });
        endCal();
        if (saved.length) { P.save(); calOut.textContent = `Measured and saved: ${saved.join(', ')}. Your timing scores now take this into account.`; }
        else {
          const got = Math.max(0, ...Object.values(offs).map(o => Object.keys(o).length));
          calOut.textContent = `I only caught ${got} of your hits. Try again and hit right on each click from the third one on.`;
        }
      }, lead + (clicks[n - 1] - t0 + 0.6) * 1000));
    };
    $('#calReset').onclick = () => { st.latency = {}; P.save(); calOut.textContent = 'Timing delays reset to the defaults.'; };

    // sound & progress
    $$('[data-vol]', app).forEach(r => {
      r.oninput = () => { st.volumes[r.dataset.vol] = +r.value; A.setVolumes(st.volumes); };
      r.onchange = () => P.save();
    });
    $('#hitSounds').onchange = e => { st.hitSounds = e.target.checked; P.save(); };
    $('#demoDefault').onchange = e => { st.demoWhilePlaying = e.target.checked; P.save(); };
    $('#placement').onchange = e => { P.data.placement = +e.target.value; P.save(); toast('Starting level saved.'); };
    $('#unlockAll').onchange = e => { st.unlockAll = e.target.checked; P.save(); };
    $('#resetAll').onclick = () => askConfirm('Reset progress?', 'This clears all scores, stars, XP and your starting level. Your kit setup is kept.', 'Reset').then(ok => {
      if (!ok) return;
      P.reset();
      toast('Progress reset.');
      go('#/home');
    });

    // on-screen pads (keyboard / touch)
    const setupPads = () => { const w = $('#setupPads'); if (w) { if (st.tapPads) mountPads(w, allVoices); else w.innerHTML = ''; } };
    if ($('#tapPads')) { $('#tapPads').onchange = e => { st.tapPads = e.target.checked; P.save(); setupPads(); }; setupPads(); }

    phoneCard();
    if (focus === 'timing') setTimeout(() => $('#timing').scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  const saveNote = () => ({
    computer: 'Your progress is saved on the computer running Drum Coach, so it carries over between your devices and each new phone link.',
    account: 'Your progress is saved with your Claude sign-in, so it follows you to any device where you open this link.',
  }[P.syncedTo()] || `Your progress is saved in this browser on this ${touch ? 'device' : 'computer'}.`);

  // On the computer running phone.bat, show the secure phone link as a QR code to scan.
  let qrLib = null;
  const loadQr = () => qrLib = qrLib || new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    s.integrity = 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k';
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve(window.qrcode);
    s.onerror = () => { qrLib = null; reject(new Error('The QR code maker did not load.')); };
    document.head.appendChild(s);
  });
  function phoneCard() {
    if (HOSTED || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    const h1 = $('h1', app);
    let card = null, timer = 0;
    onLeave(() => clearTimeout(timer));
    const show = html => {
      if (!h1.isConnected) return null;
      if (!card) { card = document.createElement('div'); card.className = 'card'; card.id = 'phoneCard'; h1.after(card); }
      card.innerHTML = `<h2>📱 Play on your phone</h2>${html}`;
      return card;
    };
    const showLink = url => {
      const c = show(`<div class="phone-link">
          <div class="qr" id="qr"></div>
          <div>
            <p>Scan this with your phone's camera, or type the link into its browser:</p>
            <div class="row" style="margin-top:8px"><code id="phoneUrl">${esc(url)}</code><button class="btn small" id="copyUrl">Copy</button></div>
            <ul class="muted small">
              <li>The microphone works on any phone, for the Acoustic kit and Practice pad.</li>
              <li>USB drums work in Chrome on Android with a USB-OTG adapter. iPhones can't read USB drums.</li>
              <li>Keep this computer on and the black Drum Coach window open while you play. Anyone with the link can open Drum Coach until you close it.</li>
              <li>The link is new each time you start phone.bat, but your progress is saved here and carries over.</li>
            </ul>
          </div>
        </div>`);
      if (!c) return;
      $('#copyUrl', c).onclick = () => {
        const select = () => { const r = document.createRange(); r.selectNodeContents($('#phoneUrl', c)); getSelection().removeAllRanges(); getSelection().addRange(r); };
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
          .then(() => toast('Link copied.'), () => { select(); toast('Press Ctrl+C to copy the link.'); });
      };
      loadQr().then(qrcode => {
        const q = qrcode(0, 'M');
        q.addData(url);
        q.make();
        $('#qr', c).innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true, title: 'QR code for your phone link' });
      }).catch(() => { $('#qr', c).hidden = true; });
    };
    const check = async () => {
      // A plain file server has no api/phone, so there's nothing to show.
      const ph = await fetch('api/phone', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (!ph || !h1.isConnected) return;
      if (ph.url) showLink(ph.url);
      else if (ph.starting) { show('<p class="muted">Making your secure phone link…</p>'); timer = setTimeout(check, 2000); }
      else show('<p class="muted">To use your phone\'s microphone or USB drums, close the black Drum Coach window and double-click <b>phone.bat</b> instead of start.bat. A QR code to scan will show up here.</p>');
    };
    check();
  }

  // ---------- free practice ----------

  function viewFree() {
    const st = P.settings(), kit = kitOf(), isMic = kit.src === 'mic';
    const f = st.free = Object.assign({ bpm: 80, beats: 4, sub: 1, silent: '' }, st.free || {});
    const SILENT = { '': 'Off', '2,2': '2 bars on, 2 off', '3,1': '3 bars on, 1 off', '1,1': '1 bar on, 1 off' };
    app.innerHTML = `
      <h1>Free practice</h1>
      <p class="muted">A metronome that listens. Play anything along with it and the meter shows if you're early or late. Silent bars test whether you keep time on your own.</p>
      <div class="card metro">
        <div class="bpm">
          <button class="btn" data-d="-5">−5</button><button class="btn" data-d="-1">−1</button>
          <span class="val" id="bpmVal">${f.bpm}</span><span class="unit">BPM</span>
          <button class="btn" data-d="1">+1</button><button class="btn" data-d="5">+5</button>
        </div>
        <input type="range" id="bpmRange" min="40" max="220" value="${f.bpm}" style="width:min(520px,100%)">
        <div class="beats" id="dots"></div>
        <div class="row">
          <button class="btn primary big" id="mStart">▶ Start</button>
          <button class="btn" id="tap">Tap tempo</button>
        </div>
        <div class="row" style="margin-top:16px">
          <label class="tog">Beats <select id="mBeats">${[2, 3, 4, 5, 6, 7].map(b => `<option ${b === f.beats ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
          <label class="tog">Clicks per beat <select id="mSub">${[[1, 'Quarter notes'], [2, '8th notes'], [3, 'Triplets'], [4, '16th notes']].map(([v, l]) => `<option value="${v}" ${v === f.sub ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="tog">Silent bars <select id="mSilent">${Object.keys(SILENT).map(k => `<option value="${k}" ${k === f.silent ? 'selected' : ''}>${SILENT[k]}</option>`).join('')}</select></label>
        </div>
      </div>
      <div class="card"><h2>Your timing</h2>
        <p class="muted" id="tmText">${isMic ? 'The microphone turns on when you start.' : kitId() === 'keys' ? (touch ? 'Tap the pads along with the click.' : 'Tap any drum key along with the click.') : 'Hit any pad along with the click.'}</p>
        <canvas class="tmeter" id="tm"></canvas>
        <div id="padsWrap" style="margin-top:12px"></div>
      </div>`;
    if (kitId() === 'keys' && st.tapPads) mountPads($('#padsWrap'), ['cr', 'rd', 'hh', 'ho', 't1', 't2', 'ft', 'sn', 'hp', 'bd']);

    let metro = null, raf = 0, ticks = [], lit = [], offs = [], taps = [];
    const dotsEl = $('#dots');
    const drawDots = () => { dotsEl.innerHTML = Array.from({ length: f.beats }, (_, i) => `<i class="${i === 0 ? 'first' : ''}"></i>`).join(''); lit = []; };
    drawDots();
    const silentArr = () => (f.silent ? f.silent.split(',').map(Number) : null);
    const save = () => P.save();

    function setBpm(b) {
      f.bpm = clamp(Math.round(b), 40, 220);
      $('#bpmVal').textContent = f.bpm;
      $('#bpmRange').value = f.bpm;
      if (metro) metro.set({ bpm: f.bpm });
      offs = [];
      drawMeter();
    }
    $$('[data-d]', app).forEach(b => { b.onclick = () => { setBpm(f.bpm + +b.dataset.d); save(); }; });
    $('#bpmRange').oninput = e => setBpm(+e.target.value);
    $('#bpmRange').onchange = save;
    $('#tap').onclick = () => {
      const now = performance.now();
      taps = taps.filter(t => now - t < 2500);
      taps.push(now);
      if (taps.length >= 3) {
        const gaps = taps.slice(1).map((t, i) => t - taps[i]);
        setBpm(60000 / E.median(gaps));
        save();
      }
    };
    const restart = () => { if (metro) { metro.stop(); ticks = []; metro = mk(); metro.start(); } };
    $('#mBeats').onchange = e => { f.beats = +e.target.value; save(); drawDots(); restart(); };
    $('#mSub').onchange = e => { f.sub = +e.target.value; save(); offs = []; restart(); drawMeter(); };
    $('#mSilent').onchange = e => { f.silent = e.target.value; save(); if (metro) metro.set({ silent: silentArr() }); };

    const mk = () => new A.Metronome({ bpm: f.bpm, beats: f.beats, sub: f.sub, silent: silentArr(), onTick: tk => ticks.push(tk) });

    async function start() {
      A.init();
      if (isMic && !I.mic.on) {
        try { await I.startMic(st.micDevice); } catch (err) { toast('Microphone problem: ' + (err && err.message ? err.message : err), 6000); }
        updateBadge();
      }
      offs = [];
      ticks = [];
      metro = mk();
      metro.start();
      $('#mStart').textContent = '■ Stop';
      $('#mStart').classList.remove('primary');
      raf = requestAnimationFrame(frame);
      drawMeter();
    }
    function stop() {
      if (metro) metro.stop();
      metro = null;
      cancelAnimationFrame(raf);
      $$('i', dotsEl).forEach(d => d.classList.remove('lit', 'mute'));
      $('#mStart').textContent = '▶ Start';
      $('#mStart').classList.add('primary');
    }
    $('#mStart').onclick = () => (metro ? stop() : start());

    function frame() {
      const now = A.heardNow(), dots = $$('i', dotsEl);
      while (ticks.length && ticks[0].t <= now) {
        const tk = ticks.shift();
        if (!tk.isBeat || !dots[tk.beat]) continue;
        dots[tk.beat].classList.add('lit');
        dots[tk.beat].classList.toggle('mute', tk.silent);
        lit[tk.beat] = tk.t;
      }
      dots.forEach((d, i) => { if (lit[i] != null && now - lit[i] > 0.12) { d.classList.remove('lit'); lit[i] = null; } });
      raf = requestAnimationFrame(frame);
    }

    onLeave(I.onHit(h => {
      if (!metro) return;
      if (h.src === 'mic' && !isMic) return;
      const g = metro.nearest(h.t, f.sub), off = (h.t - g) * 1000;
      if (Math.abs(off) > 60000 / f.bpm / f.sub / 2) return;
      offs.push(off);
      if (offs.length > 40) offs.shift();
      drawMeter();
    }));

    function drawMeter() {
      const cv = $('#tm');
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const R = 80, pad = 30, xOf = ms => w / 2 + clamp(ms, -R, R) / R * (w / 2 - pad);
      g.fillStyle = 'rgba(61,220,132,0.10)'; g.fillRect(xOf(-30), 14, xOf(30) - xOf(-30), h - 40);
      g.fillStyle = 'rgba(61,220,132,0.16)'; g.fillRect(xOf(-12), 14, xOf(12) - xOf(-12), h - 40);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(w / 2 - 0.5, 8, 1, h - 28);
      g.font = '12px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#a9c3df';
      g.fillText('early', xOf(-R * 0.75), h - 8); g.fillText('on time', w / 2, h - 8); g.fillText('late', xOf(R * 0.75), h - 8);
      offs.forEach((o, i) => {
        const age = offs.length - 1 - i, last = age === 0;
        g.globalAlpha = last ? 1 : Math.max(0.12, 0.7 - age * 0.03);
        g.fillStyle = Math.abs(o) <= 12 ? N.JUDGE_COLOR.perfect : Math.abs(o) <= 30 ? N.JUDGE_COLOR.good : N.JUDGE_COLOR.ok;
        g.fillRect(xOf(o) - (last ? 2 : 1), last ? 10 : 20, last ? 4 : 2, last ? h - 36 : h - 52);
      });
      g.globalAlpha = 1;
      if (offs.length >= 4) {
        const m = E.mean(offs), x = xOf(m);
        g.fillStyle = '#ffd166';
        g.beginPath(); g.moveTo(x - 7, 4); g.lineTo(x + 7, 4); g.lineTo(x, 13); g.closePath(); g.fill();
        const words = Math.abs(m) < 5 ? 'right on the click' : E.timingWords(m) + ' on average';
        $('#tmText').innerHTML = `Last ${offs.length} hits: <b>${words}</b>, spread ±${Math.round(E.sd(offs))}ms. ${Math.abs(m) >= 15 ? (m < 0 ? 'You\'re rushing: relax and let the click come to you.' : 'You\'re dragging: lean slightly forward into each beat.') : E.sd(offs) > 25 ? 'Work on evenness: aim for the same spot every time.' : 'Nice and steady!'}`;
      }
    }
    drawMeter();
    const onResize = () => drawMeter();
    window.addEventListener('resize', onResize);
    onLeave(() => { window.removeEventListener('resize', onResize); stop(); if (I.mic.on) I.stopMic(); });
  }

  // ---------- boot ----------

  I.onHit(h => {
    if (h.src === 'keys' && P.settings().hitSounds) A.drum(h.voice, A.now(), h.vel, 'hits');
  });
  I.onRaw(e => { if (e.type === 'midi-status' || e.type === 'mic-status') updateBadge(); });

  // Space is the kick key, so don't let a clicked button keep focus and get pressed again by it.
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('button, a, input[type=checkbox]');
    if (el && e.detail > 0) setTimeout(() => el.blur(), 0);
  });
  document.addEventListener('pointerdown', () => { if (A.ctx) A.init(); }, { passive: true });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && P.data.placed) closeModal(); });
  // Clicking a video thumbnail swaps it for the YouTube player, and puts any other playing video back.
  app.addEventListener('click', e => {
    const thumb = e.target.closest('button.video[data-yt]');
    if (!thumb) return;
    stopVideos();
    const f = document.createElement('iframe');
    f.className = 'video';
    f.src = `https://www.youtube-nocookie.com/embed/${thumb.dataset.yt}?autoplay=1&rel=0`;
    f.title = thumb.getAttribute('aria-label').replace(/^Play /, '');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f._thumb = thumb;
    thumb.replaceWith(f);
  });

  window.addEventListener('hashchange', route);
  // Saved progress arrived from the hosted store. Redraw the overview pages; leave a lesson or
  // practice session alone so nothing playing gets cut off.
  document.addEventListener('dt:progress', () => {
    // The welcome steps are the only modal with kit cards or level buttons.
    if (P.data.placed && $('#modal .kits, #modal [data-lv]')) closeModal();
    const view = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
    if (['home', 'level', 'songs'].includes(view)) route(); else updateBadge();
  });
  document.addEventListener('dt:sync', () => { const n = $('#saveNote'); if (n) n.textContent = saveNote(); });
  if (kitId() === 'electronic') I.startMidi().catch(() => {});
  route();
})();
