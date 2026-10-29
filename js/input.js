/* Drum Coach input: electronic kits over MIDI, acoustic kits and practice pads through the
   microphone, and the computer keyboard. Everything ends up as a hit: { t, raw, voice | cls, vel, src }. */
(function () {
  'use strict';
  const DT = window.DT = window.DT || {};
  const I = DT.Input = {};
  const A = DT.Audio, P = DT.Progress;
  const hitFns = new Set(), rawFns = new Set();

  I.onHit = fn => { hitFns.add(fn); return () => hitFns.delete(fn); };
  // Raw events for the Setup screen (MIDI notes, mic onsets with features, mic level).
  I.onRaw = fn => { rawFns.add(fn); return () => rawFns.delete(fn); };
  const emit = h => hitFns.forEach(f => { try { f(h); } catch (e) { console.error(e); } });
  const raw = e => rawFns.forEach(f => { try { f(e); } catch (err) { console.error(err); } });

  // How much later than the click a perfectly-timed hit arrives, per input type (seconds).
  I.latency = function (src) {
    const L = P.settings().latency || {};
    if (L[src] != null) return L[src];
    if (src === 'mic' && A.ctx) return (A.ctx.outputLatency || 0) + (A.ctx.baseLatency || 0) + 0.01;
    return 0;
  };
  I.latencyCalibrated = src => (P.settings().latency || {})[src] != null;

  // ---------- MIDI (electronic kits) ----------

  const GM = {
    35: 'bd', 36: 'bd',
    37: 'sn', 38: 'sn', 39: 'sn', 40: 'sn',
    42: 'hh', 22: 'hh', 44: 'hp', 46: 'ho', 26: 'ho',
    49: 'cr', 52: 'cr', 55: 'cr', 57: 'cr',
    51: 'rd', 53: 'rd', 59: 'rd',
    48: 't1', 50: 't1', 45: 't2', 47: 't2', 41: 'ft', 43: 'ft', 58: 'ft',
  };
  I.GM = GM;
  I.midi = { status: 'off', inputs: [], access: null, learn: null, lastNote: null };

  I.voiceForNote = function (note) {
    const m = P.settings().midiMap || {};
    return m[note] !== undefined ? m[note] : GM[note] || null;
  };
  I.notesForVoice = function (voice) {
    const m = P.settings().midiMap || {};
    const out = [];
    for (let n = 0; n < 128; n++) if ((m[n] !== undefined ? m[n] : GM[n]) === voice) out.push(n);
    return out;
  };

  function onMidi(e) {
    const d = e.data;
    if (!d || d.length < 3) return;
    const st = d[0] & 0xf0;
    if (st !== 0x90 || d[2] === 0) return;
    const note = d[1], vel = d[2] / 127;
    A.init();
    I.midi.lastNote = note;
    if (I.midi.learn) { const f = I.midi.learn; I.midi.learn = null; f(note); return; }
    const voice = I.voiceForNote(note);
    const rawT = A.perfToCtx(e.timeStamp || performance.now());
    raw({ type: 'midi', note, vel, voice });
    emit({ t: rawT - I.latency('midi'), raw: rawT, voice, vel, src: 'midi', note });
  }
  function bindMidi() {
    const acc = I.midi.access;
    I.midi.inputs = [];
    acc.inputs.forEach(inp => {
      inp.onmidimessage = onMidi;
      I.midi.inputs.push(inp.name || 'MIDI device');
    });
    I.midi.status = I.midi.inputs.length ? 'on' : 'nodevice';
    raw({ type: 'midi-status' });
  }
  I.startMidi = async function () {
    if (!navigator.requestMIDIAccess) { I.midi.status = 'unsupported'; raw({ type: 'midi-status' }); return; }
    if (I.midi.access) { bindMidi(); return; }
    try {
      I.midi.access = await navigator.requestMIDIAccess({ sysex: false });
      I.midi.access.onstatechange = bindMidi;
      bindMidi();
    } catch (err) {
      I.midi.status = 'denied';
      raw({ type: 'midi-status' });
      throw err;
    }
  };

  // ---------- microphone (acoustic kits and practice pads) ----------

  // Runs on the audio thread. Finds the start of each hit and measures the sound in
  // three frequency bands so we can tell drums apart.
  const WORKLET = `
class DrumOnsets extends AudioWorkletProcessor {
  constructor() {
    super();
    this.thr = 0.02; this.gate = 0; this.hold = 0;
    this.refr = Math.round(sampleRate * 0.03);
    this.gateDecay = Math.exp(-1 / (sampleRate * 0.05));
    this.early = Math.round(sampleRate * 0.025);
    this.total = Math.round(sampleRate * 0.1);
    this.cur = null; this.lvl = 0; this.lvlN = 0; this.lvlEvery = Math.round(sampleRate * 0.05);
    this.port.onmessage = e => { if (e.data.thr != null) this.thr = e.data.thr; };
  }
  flush() {
    const c = this.cur;
    if (!c) return;
    this.port.postMessage({ type: 'onset', time: c.time, peak: c.peak, e: c.e, l: c.l, n1: c.n1, n2: c.n2, sr: sampleRate });
    this.cur = null;
  }
  process(inputs) {
    const ch = inputs[0];
    if (!ch || !ch.length) return true;
    const full = ch[0], lo = ch[1] || full, mid = ch[2] || full, hi = ch[3] || full;
    for (let i = 0; i < full.length; i++) {
      const x = full[i], a = x < 0 ? -x : x;
      if (a > this.lvl) this.lvl = a;
      this.gate *= this.gateDecay;
      const c = this.cur;
      if (c) {
        if (c.n1 < this.early) {
          c.e[0] += lo[i] * lo[i]; c.e[1] += mid[i] * mid[i]; c.e[2] += hi[i] * hi[i]; c.e[3] += x * x; c.n1++;
          if (a > c.peak) c.peak = a;
        } else { c.l[0] += x * x; c.l[1] += hi[i] * hi[i]; c.n2++; }
        if (c.n1 + c.n2 >= this.total) this.flush();
      }
      if (this.hold > 0) { this.hold--; }
      else if (a > this.thr && a > this.gate) {
        this.flush();
        this.cur = { time: currentTime + i / sampleRate, peak: a, e: [0, 0, 0, 0], l: [0, 0], n1: 0, n2: 0 };
        this.hold = this.refr;
      }
      if (this.cur && a * 0.5 > this.gate) this.gate = a * 0.5;
    }
    this.lvlN += full.length;
    if (this.lvlN >= this.lvlEvery) { this.port.postMessage({ type: 'level', peak: this.lvl }); this.lvl = 0; this.lvlN = 0; }
    return true;
  }
}
registerProcessor('drum-onsets', DrumOnsets);
`;

  I.mic = { on: false, status: 'off', level: 0, stream: null, node: null, nodes: [], workletReady: false };

  // Sensitivity 0..1 → onset threshold. Higher sensitivity hears quieter hits.
  I.threshold = s => Math.pow(10, (-14 - s * 40) / 20);

  I.listMics = async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter(d => d.kind === 'audioinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
  };

  I.startMic = async function (deviceId) {
    const ctx = A.init();
    I.stopMic();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser cannot use the microphone.');
    I.mic.status = 'starting';
    const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    if (deviceId) audio.deviceId = { exact: deviceId };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (err) {
      if (deviceId && err.name === 'OverconstrainedError') stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      else { I.mic.status = 'denied'; raw({ type: 'mic-status' }); throw err; }
    }
    if (!I.mic.workletReady) {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(url);
      I.mic.workletReady = true;
    }
    const src = ctx.createMediaStreamSource(stream);
    const merger = ctx.createChannelMerger(4);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1000; bp.Q.value = 0.9;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    src.connect(merger, 0, 0);
    src.connect(lp).connect(merger, 0, 1);
    src.connect(bp).connect(merger, 0, 2);
    src.connect(hp).connect(merger, 0, 3);
    const node = new AudioWorkletNode(ctx, 'drum-onsets', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 4, channelCountMode: 'explicit', channelInterpretation: 'discrete' });
    const sink = ctx.createGain(); sink.gain.value = 0;
    merger.connect(node).connect(sink).connect(ctx.destination);
    node.port.onmessage = e => onMicMsg(e.data);
    node.port.postMessage({ thr: I.threshold(P.settings().micSens) });
    Object.assign(I.mic, { on: true, status: 'on', stream, node, nodes: [src, merger, lp, bp, hp, node, sink] });
    const track = stream.getAudioTracks()[0];
    I.mic.label = track ? track.label : '';
    raw({ type: 'mic-status' });
  };

  I.stopMic = function () {
    if (I.mic.stream) I.mic.stream.getTracks().forEach(t => t.stop());
    I.mic.nodes.forEach(n => { try { n.disconnect(); } catch (e) { /* already gone */ } });
    Object.assign(I.mic, { on: false, status: 'off', stream: null, node: null, nodes: [], level: 0 });
  };

  I.setSensitivity = function (s) {
    if (I.mic.node) I.mic.node.port.postMessage({ thr: I.threshold(s) });
  };

  // Band shape of a hit: how much is low (kick), mid (snare, toms), high (hats, cymbals), and how long it rings.
  function features(d) {
    const eps = 1e-10, F = d.e[3] + eps;
    const f = [Math.log10((d.e[0] + eps) / F), Math.log10((d.e[1] + eps) / F), Math.log10((d.e[2] + eps) / F)];
    if (d.n2 >= d.sr * 0.03) {
      f.push(Math.log10((d.l[0] / d.n2 + eps) / (d.e[3] / Math.max(1, d.n1) + eps)));
      f.push(Math.log10((d.l[1] + eps) / (d.l[0] + eps)));
    }
    return f;
  }
  const velOf = peak => Math.max(0, Math.min(1, (20 * Math.log10(peak + 1e-9) + 50) / 50));

  function onMicMsg(d) {
    if (d.type === 'level') { I.mic.level = d.peak; return; }
    if (d.type !== 'onset') return;
    const f = features(d), vel = velOf(d.peak);
    if (I.cal.target) { calSample(f); raw({ type: 'onset', vel, cls: null, calibrating: true }); return; }
    const kit = P.settings().kit;
    const c = kit === 'acoustic' ? I.classify(f) : null;
    raw({ type: 'onset', vel, cls: c && c.cls, conf: c && c.conf });
    emit({ t: d.time - I.latency('mic'), raw: d.time, cls: c ? c.cls : null, vel, src: 'mic' });
  }

  // ---------- teaching the app your acoustic drums ----------

  I.CLASSES = ['kick', 'snare', 'hat', 'tom', 'cym'];
  I.cal = { target: null };

  function cal() { return P.settings().drumCal || { classes: {}, scale: null }; }
  I.knownClasses = () => new Set(Object.keys(cal().classes || {}));

  function recomputeScale(dc) {
    const keys = Object.keys(dc.classes);
    const dims = 5, sum = new Array(dims).fill(0), cnt = new Array(dims).fill(0);
    keys.forEach(k => {
      const c = dc.classes[k];
      c.samples.forEach(s => s.forEach((x, i) => { if (c.mean[i] != null) { sum[i] += (x - c.mean[i]) ** 2; cnt[i]++; } }));
    });
    dc.scale = sum.map((s, i) => Math.max(0.06, cnt[i] ? Math.sqrt(s / cnt[i]) : 0.2));
  }

  function calSample(f) {
    const T = I.cal.target;
    T.samples.push(f);
    if (T.onProgress) T.onProgress(T.samples.length, T.n);
    if (T.samples.length < T.n) return;
    I.cal.target = null;
    const dims = Math.min.apply(null, T.samples.map(s => s.length));
    const mean = [];
    for (let i = 0; i < dims; i++) mean.push(T.samples.reduce((s, x) => s + x[i], 0) / T.samples.length);
    const s = P.settings();
    const dc = s.drumCal || { classes: {}, scale: null };
    dc.classes[T.cls] = { mean, samples: T.samples.map(x => x.slice(0, dims)) };
    recomputeScale(dc);
    s.drumCal = dc;
    P.save();
    T.resolve(mean);
  }

  I.teach = function (cls, n, onProgress) {
    if (I.cal.target) I.cal.target.reject(new Error('cancelled'));
    return new Promise((resolve, reject) => { I.cal.target = { cls, n: n || 4, samples: [], onProgress, resolve, reject }; });
  };
  I.cancelTeach = function () {
    if (I.cal.target) { const t = I.cal.target; I.cal.target = null; t.reject(new Error('cancelled')); }
  };
  I.forget = function (cls) {
    const s = P.settings();
    if (!s.drumCal) return;
    if (cls) delete s.drumCal.classes[cls]; else s.drumCal = null;
    if (s.drumCal) recomputeScale(s.drumCal);
    P.save();
  };

  I.classify = function (f) {
    const dc = cal(), keys = Object.keys(dc.classes || {});
    if (keys.length < 2 || !dc.scale) return null;
    const ranked = keys.map(k => {
      const m = dc.classes[k].mean, n = Math.min(m.length, f.length);
      let d = 0;
      for (let i = 0; i < n; i++) d += ((f[i] - m[i]) / dc.scale[i]) ** 2;
      return { cls: k, d: d / n };
    }).sort((a, b) => a.d - b.d);
    const conf = ranked.length > 1 ? Math.max(0, Math.min(1, 1 - ranked[0].d / (ranked[1].d + 1e-6))) : 1;
    return { cls: ranked[0].cls, conf };
  };

  // ---------- computer keyboard ----------

  I.KEYS = {
    ' ': 'bd', b: 'bd',
    f: 'sn', j: 'sn',
    d: 'hh', k: 'hh',
    e: 'ho', i: 'ho',
    a: 'hp',
    w: 'cr', o: 'cr',
    s: 'rd', l: 'rd',
    g: 't1', h: 't2', n: 'ft',
  };
  I.keysFor = voice => Object.keys(I.KEYS).filter(k => I.KEYS[k] === voice).map(k => (k === ' ' ? 'Space' : k.toUpperCase()));
  I.keysEnabled = true;

  window.addEventListener('keydown', e => {
    if (!I.keysEnabled || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    const voice = I.KEYS[e.key.toLowerCase()];
    if (!voice) return;
    e.preventDefault();
    I.tap(voice, e.timeStamp);
  });

  // ---------- on-screen tap pads (phones and tablets) ----------
  // Counts as the 'keys' input, so it shares the keyboard's timing setting.
  I.tap = function (voice, ts) {
    A.init();
    const rawT = A.perfToCtx(ts || performance.now());
    raw({ type: 'key', voice });
    emit({ t: rawT - I.latency('keys'), raw: rawT, voice, vel: 0.8, src: 'keys' });
  };
})();
