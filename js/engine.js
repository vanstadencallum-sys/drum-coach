/* Drum Coach engine: turns lessons and songs into timed notes, grades what you play,
   and works out what to tell you about it. No browser APIs in here, so it runs in Node too. */
(function (root) {
  'use strict';
  const DT = root.DT = root.DT || {};

  const VOICES = {
    cr: { name: 'Crash', short: 'CR', color: '#f6c445' },
    rd: { name: 'Ride', short: 'RD', color: '#ef9a4a' },
    hh: { name: 'Hi-hat', short: 'HH', color: '#41d6c3' },
    ho: { name: 'Open hi-hat', short: 'OH', color: '#41d6c3' },
    hp: { name: 'Hi-hat pedal', short: 'HP', color: '#7fb4ff' },
    t1: { name: 'High tom', short: 'T1', color: '#c49bff' },
    sn: { name: 'Snare', short: 'SN', color: '#ff6b6b' },
    t2: { name: 'Mid tom', short: 'T2', color: '#a283ff' },
    ft: { name: 'Floor tom', short: 'FT', color: '#7f72ff' },
    bd: { name: 'Kick', short: 'BD', color: '#ff9f43' },
  };
  const LANES = ['cr', 'rd', 'hh', 't1', 'sn', 't2', 'ft', 'bd', 'hp'];
  const laneOf = v => (v === 'ho' ? 'hh' : v);

  // What a microphone can tell apart (after the player teaches it their kit).
  const CLASS_OF = { bd: 'kick', sn: 'snare', hh: 'hat', ho: 'hat', hp: 'hat', t1: 'tom', t2: 'tom', ft: 'tom', cr: 'cym', rd: 'cym' };
  const CLASS_LANE = { kick: 'bd', snare: 'sn', hat: 'hh', tom: 't2', cym: 'cr' };
  const CLASS_NAME = { kick: 'Kick', snare: 'Snare', hat: 'Hi-hat', tom: 'Tom', cym: 'Cymbal' };

  // Timing windows in ms per skill level: [perfect, good, ok]. Master is much stricter than beginner.
  const WINDOWS = { 1: [40, 75, 125], 2: [35, 65, 115], 3: [30, 58, 105], 4: [26, 50, 95], 5: [22, 44, 85], 6: [18, 36, 75] };
  // How far off is acceptable on average (mean) and in spread (sd), per level, before we say something.
  const TOLERANCE = { 1: [18, 38], 2: [16, 34], 3: [14, 30], 4: [12, 26], 5: [10, 22], 6: [8, 18] };

  const POS_NAME = {
    beat: 'on the beat',
    and: 'on the "&"',
    ea: 'on the "e" and "a"',
    trip: 'between the beats (triplets)',
    sub: 'between the beats',
  };

  const clean = s => String(s || '').replace(/[\s|]/g, '');

  function parseNote(voice, ch) {
    switch (ch) {
      case 'x': return { voice, vel: 0.8, accent: false, ghost: false };
      case 'X': return { voice, vel: 1, accent: true, ghost: false };
      case 'g': return { voice, vel: 0.35, accent: false, ghost: true };
      case 'o': return { voice: voice === 'hh' ? 'ho' : voice, vel: 0.8, accent: false, ghost: false };
      case 'O': return { voice: voice === 'hh' ? 'ho' : voice, vel: 1, accent: true, ghost: false };
      default: return null;
    }
  }

  function posCat(i, sub) {
    const j = i % sub;
    if (j === 0) return 'beat';
    if (sub === 2) return 'and';
    if (sub === 4) return j === 2 ? 'and' : 'ea';
    if (sub === 3 || sub === 6) return 'trip';
    return 'sub';
  }

  // Splits {voice: 'grid string'} into one object per bar. Shorter parts repeat.
  function splitBars(parts, len) {
    const c = {};
    let n = 1;
    for (const v in parts) { c[v] = clean(parts[v]); n = Math.max(n, Math.round(c[v].length / len) || 1); }
    const bars = [];
    for (let b = 0; b < n; b++) {
      const bar = {};
      for (const v in c) {
        const k = Math.max(1, Math.round(c[v].length / len));
        const i = b % k;
        bar[v] = c[v].slice(i * len, i * len + len).padEnd(len, '-');
      }
      bars.push(bar);
    }
    return bars;
  }

  function splitStr(s, len) {
    s = clean(s);
    const out = [];
    for (let i = 0; i < s.length; i += len) out.push(s.slice(i, i + len).padEnd(len, '-'));
    return out.length ? out : null;
  }

  const META_KEYS = ['beats', 'sub', 'unit', 'clicks', 'accents', 'countLabels'];

  // Turns a lesson or a song into a flat list of bars.
  function buildChart(item) {
    const base = { beats: item.beats || 4, sub: item.sub || 4, unit: item.unit || 1, clicks: item.clicks || null, accents: item.accents || [0], countLabels: item.countLabels || null };
    const bars = [];
    if (item.sections) {
      item.sections.forEach((sec, si) => {
        const m = Object.assign({}, base);
        META_KEYS.forEach(k => { if (sec[k] != null) m[k] = sec[k]; });
        const len = m.beats * m.sub;
        const main = splitBars(sec.parts, len);
        const first = sec.first ? splitBars(sec.first, len)[0] : null;
        const fill = sec.fill ? splitBars(sec.fill, len)[0] : null;
        const chords = String(sec.chords || '').trim().split(/\s+/).filter(Boolean);
        for (let b = 0; b < sec.bars; b++) {
          let parts = main[b % main.length], kind = 'groove';
          if (b === 0 && first) { parts = first; kind = 'first'; }
          if (b === sec.bars - 1 && fill) { parts = fill; kind = 'fill'; }
          bars.push(Object.assign({}, m, {
            parts, kind, section: si, sectionName: sec.name, patBar: b % main.length, stick: null,
            chord: chords.length ? chords[b % chords.length] : null,
            bass: sec.bass ? clean(sec.bass) : null,
          }));
        }
      });
    } else {
      const len = base.beats * base.sub;
      const pat = splitBars(item.parts, len);
      const stick = item.stick ? splitStr(item.stick, len) : null;
      const reps = item.repeat || 4;
      for (let r = 0; r < reps; r++) {
        pat.forEach((parts, pi) => bars.push(Object.assign({}, base, {
          parts, kind: 'groove', section: 0, sectionName: null, patBar: pi,
          stick: stick ? stick[pi % stick.length] : null, chord: null, bass: null,
        })));
      }
    }
    bars.forEach((b, i) => { b.index = i; });
    return bars;
  }

  // Lays the bars out in time (seconds from the start of bar 1).
  function buildTimeline(bars, bpm) {
    const notes = [], clicks = [], barInfo = [];
    let t = 0;
    for (const bar of bars) {
      const beatDur = 60 / bpm * bar.unit, stepDur = beatDur / bar.sub, dur = beatDur * bar.beats;
      barInfo.push(Object.assign({}, bar, { t, dur, beatDur, stepDur }));
      for (let b = 0; b < bar.beats; b++) {
        if (!bar.clicks || bar.clicks.indexOf(b) >= 0) clicks.push({ t: t + b * beatDur, accent: bar.accents.indexOf(b) >= 0, bar: bar.index, beat: b });
      }
      for (const v in bar.parts) {
        const s = bar.parts[v];
        for (let i = 0; i < s.length; i++) {
          const n = parseNote(v, s[i]);
          if (!n) continue;
          notes.push({
            t: t + i * stepDur, voice: n.voice, lane: laneOf(n.voice), vel: n.vel, accent: n.accent, ghost: n.ghost,
            bar: bar.index, step: i, pos: posCat(i, bar.sub), section: bar.section, patBar: bar.patBar, kind: bar.kind,
          });
        }
      }
      t += dur;
    }
    notes.sort((a, b) => a.t - b.t || LANES.indexOf(a.lane) - LANES.indexOf(b.lane));
    notes.forEach((n, i) => { n.id = i; });
    return { notes, clicks, bars: barInfo, duration: t, bpm };
  }

  function mkTarget(notes) {
    const n0 = notes[0];
    return {
      t: n0.t, notes, lanes: notes.map(n => n.lane), voices: notes.map(n => n.voice),
      hit: null, judge: null, off: null, wrong: [], optional: false,
      accent: notes.some(n => n.accent), ghost: notes.every(n => n.ghost),
      bar: n0.bar, section: n0.section, patBar: n0.patBar, pos: n0.pos, kind: n0.kind,
    };
  }

  /* One graded play-through.
     mode 'exact'  – we know which drum was hit (electronic kit, keyboard)
     mode 'class'  – microphone on an acoustic kit; notes at the same moment merge into one target
     mode 'timing' – practice pad; only hand timing counts */
  function Run(tl, opts) {
    opts = opts || {};
    this.tl = tl;
    this.mode = opts.mode || 'exact';
    this.start = opts.start || 0;
    this.known = opts.knownClasses && opts.knownClasses.size >= 2 ? opts.knownClasses : null;
    const w = WINDOWS[opts.level || 1] || WINDOWS[1];
    this.win = { perfect: w[0] / 1000, good: w[1] / 1000, ok: w[2] / 1000 };
    tl.notes.forEach(n => { n.judge = null; n.off = null; n.ignored = false; n.optional = false; n.vmiss = false; });

    const targets = [];
    if (this.mode === 'exact') {
      tl.notes.forEach(n => targets.push(mkTarget([n])));
    } else {
      let group = [];
      tl.notes.forEach(n => {
        if (this.mode === 'timing' && (n.lane === 'bd' || n.lane === 'hp')) { n.ignored = true; return; }
        if (group.length && Math.abs(n.t - group[0].t) < 0.003) group.push(n);
        else { if (group.length) targets.push(mkTarget(group)); group = [n]; }
      });
      if (group.length) targets.push(mkTarget(group));
      // Ghost notes and the hi-hat pedal are often too quiet for a mic, so they're a bonus, not required.
      targets.forEach(tg => {
        tg.optional = tg.notes.every(n => n.ghost || n.lane === 'hp');
        tg.notes.forEach(n => { n.optional = tg.optional; });
      });
    }

    // Each note's window can't be wider than half the gap to its neighbours.
    const keyOf = this.mode === 'exact' ? (tg => tg.lanes[0]) : (() => 'all');
    const last = {};
    targets.forEach(tg => {
      const k = keyOf(tg), p = last[k];
      if (p) { const g = tg.t - p.t; p.gapNext = g; tg.gapPrev = g; }
      last[k] = tg;
    });
    targets.forEach(tg => {
      const g = Math.min(tg.gapPrev || 1, tg.gapNext || 1);
      tg.win = Math.min(this.win.ok, g * 0.5);
      tg.perfect = Math.min(this.win.perfect, tg.win * 0.45);
      tg.good = Math.min(this.win.good, tg.win * 0.75);
      tg.notes.forEach(n => { n.win = tg.win; });
    });

    this.targets = targets;
    this.hits = [];
    this.lo = 0;
  }

  // true = right drum, false = wrong drum, null = can't tell (so only timing counts).
  Run.prototype.identity = function (hit, tg) {
    if (this.mode === 'timing') return null;
    if (this.mode === 'class') {
      if (!hit.cls || !this.known) return null;
      const cls = tg.voices.map(v => CLASS_OF[v]);
      if (cls.some(c => !this.known.has(c))) return null;
      return cls.indexOf(hit.cls) >= 0;
    }
    if (!hit.voice) return null;
    return tg.lanes.indexOf(laneOf(hit.voice)) >= 0;
  };

  // h: { t: audio-clock seconds, voice | cls, vel, src }
  Run.prototype.addHit = function (h) {
    const rt = h.t - this.start;
    const hit = { t: rt, voice: h.voice || null, cls: h.cls || null, vel: h.vel == null ? null : h.vel, src: h.src, judge: 'extra', off: null, target: null };
    const T = this.targets;
    while (this.lo < T.length && T[this.lo].t + 0.3 < rt) this.lo++;
    let best = null, bestD = 1e9, wrong = null, wrongD = 1e9;
    for (let i = this.lo; i < T.length; i++) {
      const tg = T[i];
      if (tg.t - 0.3 > rt) break;
      if (tg.hit) continue;
      const d = Math.abs(rt - tg.t);
      if (d > tg.win) continue;
      const id = this.identity(hit, tg);
      if (id === false) { if (d < wrongD) { wrong = tg; wrongD = d; } }
      else if (d < bestD) { best = tg; bestD = d; }
    }
    if (best) this._judge(hit, best, false);
    else if (wrong) {
      if (this.mode === 'class') this._judge(hit, wrong, true);
      else {
        // Wrong drum at the right time. Leave the note open in case the right drum follows.
        hit.judge = 'wrong'; hit.target = wrong; hit.off = rt - wrong.t;
        wrong.wrong.push(hit);
        wrong.notes.forEach(n => { if (!n.judge) n.judge = 'wrong'; });
      }
    }
    this.hits.push(hit);
    return hit;
  };

  Run.prototype._judge = function (hit, tg, wrongDrum) {
    const off = hit.t - tg.t, a = Math.abs(off);
    hit.target = tg; hit.off = off;
    hit.judge = wrongDrum ? 'wrong' : a <= tg.perfect ? 'perfect' : a <= tg.good ? 'good' : 'ok';
    tg.hit = hit; tg.judge = hit.judge; tg.off = off;
    tg.notes.forEach(n => { n.judge = hit.judge; n.off = off; });
  };

  // ---------- feedback ----------

  const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) * (x - m)))); };
  const median = a => {
    if (!a.length) return 0;
    const b = a.slice().sort((x, y) => x - y), k = b.length >> 1;
    return b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2;
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pct = x => Math.round(x * 100) + '%';
  const tally = (list, key) => list.reduce((m, x) => { const k = key(x); m[k] = (m[k] || 0) + 1; return m; }, {});
  const group = (list, key) => list.reduce((m, x) => { const k = key(x); (m[k] = m[k] || []).push(x); return m; }, {});
  const laneName = l => VOICES[l].name.toLowerCase();

  function starsFor(score) { return score >= 95 ? 3 : score >= 85 ? 2 : score >= 70 ? 1 : 0; }
  function timingWords(ms) {
    const a = Math.round(Math.abs(ms));
    return a < 1 ? 'dead on' : a + 'ms ' + (ms < 0 ? 'early' : 'late');
  }

  const TIPS = {
    rush: [
      'Relax your arms and shoulders. Rushing usually comes from tension or excitement.',
      'Try to "bury" the click: when you\'re right on it, the click almost disappears under your notes.',
      'Count out loud and sit back on each beat. Let the beat come to you.',
    ],
    drag: [
      'Start each stroke a little earlier. Have the stick up and ready before the beat arrives.',
      'Use a lower stick height so the stick reaches the drum sooner.',
      'If every note feels on time to you, run the Timing check in Setup. Your setup may have a delay.',
    ],
    spread: [
      'Slow down 10 to 15 BPM until every note lines up with the click, then build back up.',
      'Keep every stroke the same height and motion. The same motion gives the same timing.',
      'Use Free practice with "Silent bars" turned on to strengthen your inner clock.',
    ],
    speedup: [
      'Notice where you start to speed up. It\'s often a fill or a busy part. Breathe and stay steady there.',
      'Practice longer runs at a slightly slower tempo to build control.',
    ],
    slowdown: [
      'You may be getting tired. Stay loose, use your wrists and let the stick bounce back up.',
      'Build stamina with longer runs at a comfortable tempo.',
    ],
    missLane: lane => [
      `Play just the ${lane} part along with the click for a minute, then add the other parts back one at a time.`,
      'Say the pattern out loud as you play, for example "kick, hat, snare, hat".',
      'Drop the tempo until you can play every note, then speed up 5 BPM at a time.',
    ],
    missPos: {
      and: [
        'Count "1 & 2 & 3 & 4 &" out loud. The "&" is exactly halfway between the clicks.',
        'Play only the "&" notes with the click, then put the whole pattern back together.',
      ],
      ea: [
        'Count every 16th note out loud: "1 e & a". Slow down until you can say and play it at the same time.',
        'Practice the part as 16th-note single strokes on one drum first.',
      ],
      trip: [
        'Count "1-trip-let, 2-trip-let" for every beat and keep the three notes perfectly even.',
        'Triplets shouldn\'t sound like eighth notes. Keep them round and rolling.',
      ],
      sub: [
        'Count every subdivision out loud and slow down until you can play each one.',
      ],
    },
    miss: [
      'Slow the tempo down until you can play every note, then speed up 5 BPM at a time.',
      'Watch the notes coming up on the screen and look one beat ahead.',
      'Learn the pattern one bar at a time.',
    ],
    flam: (a, b) => [
      `Play the ${a} and ${b} together on their own, slowly, and listen for one sound rather than two.`,
      'Start both strokes at the same moment: lift the stick and the foot together.',
    ],
    kickTiming: [
      'Try playing heel-up for a quicker, more direct kick stroke.',
      'Keep your foot resting ready on the pedal, not hovering above it.',
      'Play kick and hi-hat together slowly and listen for a single sound.',
    ],
    laneTiming: lane => [
      `Play just the ${lane} part with the click until it lines up, then add the rest.`,
      `Watch your ${lane} stroke height. A bigger motion takes longer to land.`,
    ],
    wrong: [
      'Look ahead at the next drum before you need to play it.',
      'Learn the pattern slowly and say the drum names out loud.',
      'If the same drum is always wrong, check your kit setup in Setup.',
    ],
    extraMidi: [
      'Keep the hand or foot that isn\'t playing still and relaxed.',
      'If you didn\'t play these notes, your pads may be setting each other off (crosstalk). Check your drum module settings.',
    ],
    extraMic: [
      'Keep the limbs that aren\'t playing still.',
      'If you didn\'t play these, the app may be hearing the click or backing track. Use headphones, or lower the microphone sensitivity in Setup.',
    ],
    extraKeys: [
      'Only press keys for the notes that are written. Rest your fingers lightly on the others.',
    ],
    accents: [
      'Play accents from high up (about 30 cm / 12 in) and soft notes from low (about 5 cm / 2 in).',
      'Exaggerate the difference at first. You can tone it down later.',
      'Stop each accent low so you\'re ready for the soft notes that follow.',
    ],
    ghosts: [
      'Keep the stick about 2 to 3 cm (an inch) above the drum for ghost notes and just let it drop.',
      'Ghost notes should be felt more than heard. Let the backbeat do the talking.',
    ],
    even: lane => [
      `Use the same stick height for every ${lane} note.`,
      'Play the part a bit quieter. Control is easier when you aren\'t hitting hard.',
      'Listen closely: each note should sound like a copy of the one before.',
    ],
    section: name => [
      `Play the whole song at a slower tempo until the ${name} feels as comfortable as the rest.`,
      'Find the lesson that teaches this groove and practice it on its own.',
    ],
    bar: name => [
      `Practice the ${name} on its own, slowly, then add the bar before it.`,
      'Keep counting all the way through. Most mistakes happen when the counting stops.',
    ],
    fills: [
      'Practice the fill on its own slowly, then play the bar before it plus the fill.',
      'Keep counting through the fill. Fills often rush because the counting stops.',
      'Landing the next "1" on time matters more than playing every note of the fill.',
    ],
  };

  /* Grades a finished run and works out what to say about it.
     meta: { level, tempoPct, bpm, src, sections: [names], barNames: [names] } */
  function analyze(run, meta) {
    meta = meta || {};
    const lvl = clamp(meta.level || 1, 1, 6);
    const tol = { mean: TOLERANCE[lvl][0], sd: TOLERANCE[lvl][1] };
    const exact = run.mode === 'exact';
    const T = run.targets.filter(t => !t.optional || t.hit);
    const n = Math.max(1, T.length);
    const CREDIT = { perfect: 1, good: 0.85, ok: 0.6, wrong: 0.35 };
    const creditOf = t => (t.hit ? CREDIT[t.judge] : t.wrong.length ? 0.2 : 0);
    const c = { total: T.length, hit: 0, perfect: 0, good: 0, ok: 0, wrong: 0, miss: 0, extra: 0 };
    let credit = 0;
    T.forEach(t => {
      if (t.hit) { c[t.judge]++; if (t.judge !== 'wrong') c.hit++; }
      else if (t.wrong.length) c.wrong++;
      else c.miss++;
      credit += creditOf(t);
    });
    // Extra notes: hits that matched nothing, plus wrong-drum hits on notes that were then played correctly.
    c.extra = run.hits.filter(h => h.judge === 'extra' || (h.judge === 'wrong' && h.target && h.target.hit && h.target.hit !== h)).length;
    const score = T.length ? clamp(Math.round(100 * (credit - 0.5 * c.extra) / n), 0, 100) : 0;
    const stars = starsFor(score);

    const good = T.filter(t => t.hit && t.judge !== 'wrong');
    const offs = good.map(t => t.off * 1000);
    const timing = { n: offs.length, mean: mean(offs), sd: sd(offs), median: median(offs) };
    const acc = list => (list.length ? list.reduce((s, t) => s + creditOf(t), 0) / list.length : 1);

    const F = [], P = [];

    // Missed notes: which drum, or which part of the beat?
    const missed = T.filter(t => !t.hit && !t.wrong.length);
    const missRate = missed.length / n;
    if (missed.length >= 2 && missRate > 0.06) {
      let done = false;
      if (exact) {
        const all = tally(T, t => t.lanes[0]), m = tally(missed, t => t.lanes[0]);
        let worst = null;
        for (const l in m) {
          const r = m[l] / all[l];
          if (m[l] >= 3 && r > 0.2 && m[l] / missed.length >= 0.4 && (!worst || r > worst.r)) worst = { l, r };
        }
        if (worst) {
          F.push({ id: 'miss-lane', sev: 90 * m[worst.l] / n + 4, title: `Missing ${laneName(worst.l)} notes`, detail: `You missed ${m[worst.l]} of ${all[worst.l]} ${laneName(worst.l)} notes.`, tips: TIPS.missLane(laneName(worst.l)) });
          done = true;
        }
      }
      if (!done) {
        const all = tally(T, t => t.pos), m = tally(missed, t => t.pos);
        let worst = null;
        for (const p in m) {
          const r = m[p] / all[p];
          if (p !== 'beat' && m[p] >= 3 && r > missRate * 1.5 && (!worst || r > worst.r)) worst = { p, r };
        }
        if (worst) {
          F.push({ id: 'miss-pos', sev: 90 * m[worst.p] / n + 4, title: `Notes ${POS_NAME[worst.p]} are slipping`, detail: `You missed ${m[worst.p]} of the ${all[worst.p]} notes ${POS_NAME[worst.p]}.`, tips: TIPS.missPos[worst.p] || TIPS.miss });
          done = true;
        }
      }
      if (!done) F.push({ id: 'miss', sev: 90 * missRate + 4, title: 'Missed notes', detail: `${missed.length} of ${T.length} notes weren't played, or were too far from the beat to count.`, tips: TIPS.miss });
    }

    // Weak spots: a song section, a bar of the lesson pattern, or the fills.
    const overall = acc(T);
    if (meta.sections && meta.sections.length > 1) {
      const by = group(T, t => meta.sections[t.section]);
      let worst = null;
      for (const name in by) {
        if (by[name].length < 8) continue;
        const a = acc(by[name]), rest = acc(T.filter(t => meta.sections[t.section] !== name));
        if (a < rest - 0.15 && (!worst || a - rest < worst.d)) worst = { name, a, rest, d: a - rest };
      }
      if (worst) {
        const nm = worst.name.toLowerCase();
        F.push({ id: 'section', sev: (worst.rest - worst.a) * 45, title: `The ${nm} is your weak spot`, detail: `${pct(worst.a)} accuracy in the ${nm}, compared with ${pct(worst.rest)} in the rest of the song.`, tips: TIPS.section(nm) });
      }
    }
    const fills = T.filter(t => t.kind === 'fill');
    if (fills.length >= 6) {
      const a = acc(fills), rest = acc(T.filter(t => t.kind !== 'fill'));
      if (a < rest - 0.15) F.push({ id: 'fills', sev: (rest - a) * 40, title: 'Your fills need work', detail: `${pct(a)} accuracy in the fills, compared with ${pct(rest)} in the grooves.`, tips: TIPS.fills });
    }
    if (meta.barNames && meta.barNames.length > 1) {
      const by = group(T, t => t.patBar);
      let worst = null;
      for (const b in by) {
        if (by[b].length < 4) continue;
        const a = acc(by[b]), rest = acc(T.filter(t => String(t.patBar) !== b));
        if (a < rest - 0.15 && (!worst || a - rest < worst.d)) worst = { b, a, rest, d: a - rest };
      }
      if (worst) {
        const nm = meta.barNames[worst.b] || `bar ${+worst.b + 1}`;
        F.push({ id: 'bar', sev: (worst.rest - worst.a) * 40, title: `The ${nm} is tripping you up`, detail: `${pct(worst.a)} accuracy on the ${nm}, compared with ${pct(worst.rest)} on the rest.`, tips: TIPS.bar(nm) });
      }
    }

    // Timing: ahead or behind, how spread out, and drifting over time.
    if (offs.length >= 6 && Math.abs(timing.mean) > tol.mean) {
      const early = timing.mean < 0, a = Math.round(Math.abs(timing.mean));
      F.push({ id: early ? 'rush' : 'drag', sev: (a - tol.mean) * 0.9 + 6, title: early ? "You're rushing" : "You're dragging", detail: `On average your notes land ${a}ms ${early ? 'early, ahead of' : 'late, behind'} the beat.`, tips: early ? TIPS.rush : TIPS.drag });
    }
    if (offs.length >= 8 && timing.sd > tol.sd) {
      F.push({ id: 'spread', sev: (timing.sd - tol.sd) * 0.7 + 5, title: 'Your timing wanders', detail: `Your notes are spread about ±${Math.round(timing.sd)}ms around the beat. At this level, aim for under ±${tol.sd}ms.`, tips: TIPS.spread });
    }
    if (good.length >= 12) {
      const sorted = good.slice().sort((a, b) => a.t - b.t), k = Math.floor(sorted.length / 3);
      const d = mean(sorted.slice(-k).map(t => t.off * 1000)) - mean(sorted.slice(0, k).map(t => t.off * 1000));
      if (Math.abs(d) > Math.max(14, tol.mean)) {
        F.push({ id: d < 0 ? 'speedup' : 'slowdown', sev: Math.abs(d) * 0.6, title: d < 0 ? 'You speed up as you go' : 'You slow down as you go', detail: `By the end you were landing ${Math.round(Math.abs(d))}ms ${d < 0 ? 'earlier' : 'later'} than at the start.`, tips: d < 0 ? TIPS.speedup : TIPS.slowdown });
      }
    }

    // Coordination: limbs that should land together, and one drum that's consistently off.
    if (exact) {
      const byT = {};
      good.forEach(t => { const k = Math.round(t.t * 1000); (byT[k] = byT[k] || []).push(t); });
      const PAIRS = [['bd', 'hh'], ['sn', 'hh'], ['bd', 'cr'], ['bd', 'rd'], ['sn', 'rd'], ['bd', 'sn']];
      let worst = null;
      PAIRS.forEach(([a, b]) => {
        const diffs = [];
        for (const k in byT) {
          const x = byT[k].find(t => t.lanes[0] === a), y = byT[k].find(t => t.lanes[0] === b);
          if (x && y) diffs.push((x.off - y.off) * 1000);
        }
        if (diffs.length >= 4) {
          const m = mean(diffs);
          if (Math.abs(m) > 15 && (!worst || Math.abs(m) > Math.abs(worst.m))) worst = { a, b, m };
        }
      });
      const used = new Set();
      if (worst) {
        const a = Math.round(Math.abs(worst.m));
        F.push({ id: 'flam', sev: a * 0.55, title: `Your ${laneName(worst.a)} and ${laneName(worst.b)} aren't landing together`, detail: `When they play at the same time, your ${laneName(worst.a)} lands about ${a}ms ${worst.m > 0 ? 'after' : 'before'} your ${laneName(worst.b)}. That makes two sounds (a "flam") instead of one.`, tips: TIPS.flam(laneName(worst.a), laneName(worst.b)) });
        used.add(worst.a); used.add(worst.b);
      }
      const byLane = group(good, t => t.lanes[0]);
      let wl = null;
      for (const l in byLane) {
        if (byLane[l].length < 6 || used.has(l)) continue;
        const others = good.filter(t => t.lanes[0] !== l);
        if (others.length < 6) continue;
        const d = mean(byLane[l].map(t => t.off * 1000)) - mean(others.map(t => t.off * 1000));
        if (Math.abs(d) > tol.mean + 4 && (!wl || Math.abs(d) > Math.abs(wl.d))) wl = { l, d };
      }
      if (wl) {
        F.push({ id: 'lane-timing', sev: Math.abs(wl.d) * 0.5, title: `Your ${laneName(wl.l)} is ${wl.d > 0 ? 'late' : 'early'}`, detail: `Your ${laneName(wl.l)} lands about ${Math.round(Math.abs(wl.d))}ms ${wl.d > 0 ? 'later' : 'earlier'} than your other notes.`, tips: wl.l === 'bd' ? TIPS.kickTiming : TIPS.laneTiming(laneName(wl.l)) });
      }
    }

    // Wrong drums and extra notes.
    const wrongHits = run.hits.filter(h => h.judge === 'wrong');
    if (wrongHits.length >= 3 && wrongHits.length / n > 0.05) {
      const tl = tally(wrongHits, h => h.target.lanes[0] + '>' + (exact ? laneOf(h.voice) : h.cls));
      const top = Object.keys(tl).sort((a, b) => tl[b] - tl[a])[0];
      const [exp, got] = top.split('>');
      const gotName = exact ? laneName(got) : (CLASS_NAME[got] || 'other drum').toLowerCase();
      F.push({ id: 'wrong', sev: 60 * wrongHits.length / n + 4, title: 'Wrong drums', detail: `${wrongHits.length} notes were played on the wrong drum. Most often you played the ${gotName} where the ${laneName(exp)} was written (${tl[top]} times).`, tips: TIPS.wrong });
    }
    if (c.extra >= 3 && c.extra / n > 0.06) {
      F.push({ id: 'extra', sev: 45 * c.extra / n + 3, title: 'Extra notes', detail: `You played ${c.extra} notes that aren't in the pattern.`, tips: !exact ? TIPS.extraMic : meta.src === 'keys' ? TIPS.extraKeys : TIPS.extraMidi });
    }

    // Dynamics, when we know how hard each note was played.
    const velHits = good.filter(t => t.hit.vel != null && t.hit.src !== 'keys');
    if (velHits.length >= 8) {
      const mic = !exact;
      const V = t => t.hit.vel;
      const accs = velHits.filter(t => t.accent && !t.ghost), norm = velHits.filter(t => !t.accent && !t.ghost), gh = velHits.filter(t => t.ghost);
      if (accs.length >= 4 && norm.length >= 4) {
        const r = mean(accs.map(V)) / Math.max(1e-6, mean(norm.map(V)));
        if (r < (mic ? 1.3 : 1.15)) F.push({ id: 'accents', sev: 10, title: "Your accents don't stand out", detail: r <= 1 ? 'Your accented notes are no louder than the rest.' : `Your accented notes are only ${Math.round((r - 1) * 100)}% louder than the rest.`, tips: TIPS.accents });
      }
      const loud = velHits.filter(t => t.lanes.indexOf('sn') >= 0 && !t.ghost);
      if (gh.length >= 4 && loud.length >= 2) {
        const r = mean(gh.map(V)) / Math.max(1e-6, mean(loud.map(V)));
        if (r > (mic ? 0.55 : 0.65)) F.push({ id: 'ghosts', sev: 10, title: 'Ghost notes are too loud', detail: `Your ghost notes are about ${Math.round(r * 100)}% as loud as your backbeats. Aim for well under half.`, tips: TIPS.ghosts });
      }
      const limit = mic ? 0.35 : 0.18;
      const groups = mic ? { all: norm } : group(norm, t => t.lanes[0]);
      let worst = null;
      for (const l in groups) {
        const v = groups[l].map(V);
        if (v.length < 8) continue;
        const cv = sd(v) / Math.max(1e-6, mean(v));
        if (cv > limit && (!worst || cv > worst.cv)) worst = { l, cv };
      }
      if (worst) {
        const nm = worst.l === 'all' ? 'drum' : laneName(worst.l);
        F.push({ id: 'even', sev: (worst.cv - limit) * 60 + 5, title: worst.l === 'all' ? 'Uneven volume' : `Uneven volume on the ${nm}`, detail: `Some of your ${nm === 'drum' ? '' : nm + ' '}notes are much louder than others.`, tips: TIPS.even(nm) });
      }
    }

    // What went well.
    if (offs.length >= 6) {
      if (Math.abs(timing.mean) <= tol.mean / 2) P.push(`Right on the beat: on average you were within ${Math.max(1, Math.round(Math.abs(timing.mean)))}ms.`);
      if (timing.sd <= tol.sd * 0.6) P.push(`Very consistent: your notes stayed within about ±${Math.round(timing.sd)}ms.`);
    }
    if (c.perfect / n >= 0.6) P.push(`${pct(c.perfect / n)} of your notes were perfect.`);
    if (T.length >= 8 && c.miss === 0) P.push("You didn't miss a single note.");
    else if (T.length >= 8 && missRate < 0.04) P.push('Hardly any missed notes.');
    if (!P.length && overall > 0.5) P.push(`You got ${pct(c.hit / n)} of the notes. Keep at it!`);

    const tp = meta.tempoPct || 100;
    let next;
    if (score < 60 && tp > 50) next = { type: 'slower', pct: Math.max(50, Math.floor((tp - 15) / 5) * 5) };
    else if (tp < 100 && score >= 85) next = { type: 'faster', pct: Math.min(100, tp + 10) };
    else if (stars >= 2 && tp >= 100) next = { type: 'next' };
    else next = { type: 'again' };

    F.sort((a, b) => b.sev - a.sev);
    const points = T.map(t => ({ t: t.t, off: t.hit && t.judge !== 'wrong' ? t.off * 1000 : null, lane: t.lanes[0], judge: t.hit ? t.judge : t.wrong.length ? 'wrong' : 'miss' }));
    run.hits.filter(h => h.judge === 'extra').forEach(h => points.push({ t: h.t, off: null, lane: null, judge: 'extra' }));

    return {
      score, stars, counts: c, timing, findings: F.slice(0, 4), positives: P.slice(0, 3), next, points,
      duration: run.tl.duration, mode: run.mode, level: lvl, tol, windows: WINDOWS[lvl],
    };
  }

  DT.Engine = {
    VOICES, LANES, laneOf, CLASS_OF, CLASS_LANE, CLASS_NAME, WINDOWS, POS_NAME,
    clean, posCat, buildChart, buildTimeline, Run, analyze, starsFor, timingWords, median, mean, sd,
  };
})(typeof window !== 'undefined' ? window : globalThis);
