/* Drum Coach audio: the click, synthesized drums and a simple backing band, all made with Web Audio. */
(function () {
  'use strict';
  const DT = window.DT = window.DT || {};
  const A = DT.Audio = { ctx: null };
  let ctx = null, master = null, noiseBuf = null;
  const bus = {};

  A.init = function () {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = A.ctx = new AC({ latencyHint: 'interactive' });
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      ['click', 'drums', 'backing', 'hits'].forEach(k => { bus[k] = ctx.createGain(); bus[k].connect(master); });
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      A.setVolumes(DT.Progress.settings().volumes);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  A.setVolumes = function (v) {
    if (!ctx) return;
    const g = x => (x == null ? 0.7 : x) * (x == null ? 0.7 : x) * 1.3;
    bus.click.gain.value = g(v.click);
    bus.drums.gain.value = g(v.drums);
    bus.hits.gain.value = g(v.drums);
    bus.backing.gain.value = g(v.backing);
  };

  // Converts a performance.now() timestamp (MIDI, keyboard) to the audio clock,
  // measured as "what was coming out of the speakers at that moment".
  A.perfToCtx = function (perfMs) {
    if (!ctx) return 0;
    if (ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.performanceTime > 0) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    }
    return ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0) + (perfMs - performance.now()) / 1000;
  };
  A.heardNow = () => A.perfToCtx(performance.now());
  A.now = () => (ctx ? ctx.currentTime : 0);

  // ---------- synth drums ----------

  function gainEnv(t, peak, decay, attack) {
    const g = ctx.createGain();
    attack = attack || 0.001;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + attack + decay);
    return g;
  }
  function noise(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.start(t, Math.random() * 1.2, dur + 0.05);
    return s;
  }
  function osc(type, f, t, dur) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }
  function filter(type, f, q) {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    if (q != null) b.Q.value = q;
    return b;
  }
  function tom(out, t, v, f, decay) {
    const o = osc('sine', f * 1.6, t, decay);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    o.connect(gainEnv(t, 0.8 * v, decay)).connect(out);
    noise(t, 0.04).connect(filter('lowpass', 3000)).connect(gainEnv(t, 0.12 * v, 0.03)).connect(out);
  }

  const SYN = {
    bd(out, t, v) {
      const o = osc('sine', 150, t, 0.5);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
      o.connect(gainEnv(t, 1.1 * v, 0.42)).connect(out);
      noise(t, 0.02).connect(filter('highpass', 1800)).connect(gainEnv(t, 0.2 * v, 0.012)).connect(out);
    },
    sn(out, t, v) {
      const o = osc('triangle', 195, t, 0.15);
      o.frequency.exponentialRampToValueAtTime(165, t + 0.05);
      o.connect(gainEnv(t, 0.45 * v, 0.1)).connect(out);
      noise(t, 0.25).connect(filter('highpass', 1400)).connect(gainEnv(t, 0.55 * v, 0.17)).connect(out);
    },
    hh(out, t, v) { noise(t, 0.08).connect(filter('highpass', 7500)).connect(gainEnv(t, 0.32 * v, 0.045)).connect(out); },
    ho(out, t, v) { noise(t, 0.5).connect(filter('highpass', 6500)).connect(gainEnv(t, 0.3 * v, 0.34)).connect(out); },
    hp(out, t, v) { noise(t, 0.05).connect(filter('bandpass', 5000, 1.5)).connect(gainEnv(t, 0.25 * v, 0.03)).connect(out); },
    cr(out, t, v) {
      noise(t, 1.8).connect(filter('highpass', 3200)).connect(gainEnv(t, 0.42 * v, 1.5, 0.003)).connect(out);
      noise(t, 0.4).connect(filter('bandpass', 5500, 0.8)).connect(gainEnv(t, 0.2 * v, 0.3)).connect(out);
    },
    rd(out, t, v) {
      noise(t, 0.8).connect(filter('bandpass', 7200, 1.2)).connect(gainEnv(t, 0.14 * v, 0.6)).connect(out);
      const hp = filter('highpass', 2500);
      const g = gainEnv(t, 0.05 * v, 0.8);
      [3150, 4730, 5380].forEach(f => osc('square', f, t, 0.9).connect(hp));
      hp.connect(g).connect(out);
    },
    t1(out, t, v) { tom(out, t, v, 210, 0.32); },
    t2(out, t, v) { tom(out, t, v, 155, 0.4); },
    ft(out, t, v) { tom(out, t, v, 105, 0.55); },
  };

  A.drum = function (voice, t, vel, busName) {
    if (!ctx || !SYN[voice]) return;
    SYN[voice](bus[busName || 'drums'], Math.max(t, ctx.currentTime), vel == null ? 0.8 : vel);
  };

  function click(out, t, kind) {
    const f = kind === 'accent' ? 1600 : kind === 'sub' ? 800 : 1100;
    const peak = kind === 'accent' ? 0.6 : kind === 'sub' ? 0.22 : 0.42;
    osc('sine', f, t, 0.06).connect(gainEnv(t, peak, 0.035)).connect(out);
  }
  A.click = (t, kind) => ctx && click(bus.click, t, kind);

  // ---------- backing band ----------

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function parseChord(name) {
    const m = /^([A-G])([#b]?)(.*)$/.exec(name || '');
    if (!m) return null;
    const pc = (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
    const q = m[3];
    let iv;
    if (q === '5') iv = [0, 7, 12];
    else if (/^m(?!aj)/.test(q)) iv = /7/.test(q) ? [0, 3, 7, 10] : [0, 3, 7];
    else if (/sus4/.test(q)) iv = [0, 5, 7];
    else if (/sus2/.test(q)) iv = [0, 2, 7];
    else if (/dim/.test(q)) iv = [0, 3, 6];
    else if (/maj7/.test(q)) iv = [0, 4, 7, 11];
    else if (/7|9/.test(q)) iv = [0, 4, 7, 10];
    else iv = [0, 4, 7];
    return { pc, iv };
  }
  A.parseChord = parseChord;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function bassNote(out, t, midi, dur) {
    const o = osc('sawtooth', mtof(midi), t, dur + 0.1);
    const lp = filter('lowpass', 650, 2);
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.006);
    g.gain.setTargetAtTime(0.2, t + 0.02, 0.15);
    g.gain.setTargetAtTime(0, t + Math.max(0.03, dur - 0.03), 0.02);
    o.connect(lp).connect(g).connect(out);
  }
  function padChord(out, t, ch, dur) {
    const base = 52 + ((ch.pc - 4 + 12) % 12);
    const lp = filter('lowpass', 1300, 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.08);
    g.gain.setTargetAtTime(0, t + dur - 0.1, 0.06);
    ch.iv.forEach(i => {
      [-6, 6].forEach(cents => {
        const o = osc('sawtooth', mtof(base + i), t, dur + 0.3);
        o.detune.value = cents;
        o.connect(lp);
      });
    });
    lp.connect(g).connect(out);
  }

  // Plays a timeline: click, demo drums and backing, scheduled a little ahead of time.
  // o: { start (audio-clock time of bar 1), click, demo, backing, countIn: [{t, accent}] }
  A.Player = function (tl, o) {
    A.init();
    this.start = o.start;
    this.g = {};
    ['click', 'drums', 'backing'].forEach(k => { this.g[k] = ctx.createGain(); this.g[k].connect(bus[k]); });
    const ev = [];
    (o.countIn || []).forEach(c => ev.push({ t: c.t, k: 'click', kind: c.accent ? 'accent' : 'beat' }));
    if (o.click !== false) tl.clicks.forEach(c => ev.push({ t: o.start + c.t, k: 'click', kind: c.accent ? 'accent' : 'beat' }));
    if (o.demo) tl.notes.forEach(n => ev.push({ t: o.start + n.t, k: 'drum', voice: n.voice, vel: n.vel }));
    if (o.backing) {
      tl.bars.forEach(bar => {
        const ch = parseChord(bar.chord);
        if (!ch) return;
        ev.push({ t: o.start + bar.t, k: 'pad', ch, dur: bar.dur });
        const grid = bar.bass;
        if (!grid) return;
        const steps = bar.beats * bar.sub;
        const root = 33 + ((ch.pc - 9 + 12) % 12);
        const marks = [];
        for (let i = 0; i < steps; i++) {
          const c = grid[i % grid.length];
          if (c === 'x' || c === 'o' || c === '5') marks.push({ i, m: root + (c === 'o' ? 12 : c === '5' ? 7 : 0) });
        }
        marks.forEach((mk, j) => {
          const nextI = j + 1 < marks.length ? marks[j + 1].i : steps;
          const dur = Math.min((nextI - mk.i) * bar.stepDur, bar.beatDur) * 0.92;
          ev.push({ t: o.start + bar.t + mk.i * bar.stepDur, k: 'bass', m: mk.m, dur });
        });
      });
    }
    ev.sort((a, b) => a.t - b.t);
    this.ev = ev;
    this.i = 0;
    this.timer = setInterval(() => this.pump(), 25);
    this.pump();
  };
  A.Player.prototype.pump = function () {
    const now = ctx.currentTime, horizon = now + 0.2;
    while (this.i < this.ev.length && this.ev[this.i].t < horizon) {
      const e = this.ev[this.i++];
      if (e.t < now - 0.01) continue;
      if (e.k === 'click') click(this.g.click, e.t, e.kind);
      else if (e.k === 'drum') SYN[e.voice] && SYN[e.voice](this.g.drums, e.t, e.vel);
      else if (e.k === 'bass') bassNote(this.g.backing, e.t, e.m, e.dur);
      else if (e.k === 'pad') padChord(this.g.backing, e.t, e.ch, e.dur);
    }
    if (this.i >= this.ev.length && this.timer) { clearInterval(this.timer); this.timer = null; }
  };
  A.Player.prototype.stop = function () {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const t = ctx.currentTime;
    Object.values(this.g).forEach(g => {
      g.gain.setTargetAtTime(0, t, 0.015);
      setTimeout(() => g.disconnect(), 300);
    });
  };

  // Free-practice metronome. o: { bpm, beats, sub, silent: [playBars, muteBars] | null, onTick(tick) }
  A.Metronome = function (o) {
    A.init();
    this.o = Object.assign({ bpm: 80, beats: 4, sub: 1, silent: null }, o);
    this.g = ctx.createGain();
    this.g.connect(bus.click);
    this.timer = null;
  };
  A.Metronome.prototype.start = function () {
    this.stop();
    this.anchor = ctx.currentTime + 0.15;
    this.tick = 0;
    this.next = this.anchor;
    this.timer = setInterval(() => this.pump(), 25);
    this.pump();
  };
  A.Metronome.prototype.set = function (o) {
    const changedTempo = o.bpm != null && o.bpm !== this.o.bpm;
    Object.assign(this.o, o);
    if (this.timer && changedTempo) {
      // restart the grid from the next tick so the timing meter stays correct
      this.anchor = this.next;
      this.tick = 0;
    }
  };
  A.Metronome.prototype.pump = function () {
    const o = this.o, horizon = ctx.currentTime + 0.2;
    while (this.next < horizon) {
      const perBar = o.beats * o.sub, step = this.tick % perBar, bar = Math.floor(this.tick / perBar);
      const isBeat = step % o.sub === 0;
      const silent = !!(o.silent && bar % (o.silent[0] + o.silent[1]) >= o.silent[0]);
      if (!silent) click(this.g, this.next, step === 0 ? 'accent' : isBeat ? 'beat' : 'sub');
      if (o.onTick) o.onTick({ t: this.next, beat: Math.floor(step / o.sub), isBeat, bar, silent });
      this.tick++;
      this.next = this.anchor + this.tick * 60 / o.bpm / o.sub;
    }
  };
  // Nearest grid point to t, with `grid` notes per beat.
  A.Metronome.prototype.nearest = function (t, grid) {
    const step = 60 / this.o.bpm / grid;
    return this.anchor + Math.round((t - this.anchor) / step) * step;
  };
  A.Metronome.prototype.stop = function () {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  };
  A.Metronome.prototype.running = function () { return !!this.timer; };
})();
