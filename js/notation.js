/* Drum Coach notation: the scrolling note highway, the static pattern chart and the timing plot. */
(function () {
  'use strict';
  const DT = window.DT = window.DT || {};
  const E = DT.Engine, V = E.VOICES;
  const N = DT.Notation = {};

  const JC = { perfect: '#3ddc84', good: '#c6e04a', ok: '#ffb347', wrong: '#ff5ca8', miss: '#ff4d4d', extra: '#ff4d4d' };
  N.JUDGE_COLOR = JC;
  const SUBLABEL = { 1: [''], 2: ['', '&'], 3: ['', 'trip', 'let'], 4: ['', 'e', '&', 'a'], 6: ['', 'la', 'li', '&', 'la', 'li'] };
  const CYMBAL = { cr: 1, rd: 1, hh: 1, ho: 1 };
  const LABEL_W = 46, TOP = 36;

  function lanesOf(tl) {
    const used = new Set(tl.notes.map(n => n.lane));
    return E.LANES.filter(l => used.has(l));
  }
  function hasSticking(tl) { return tl.bars.some(b => b.stick && /[^-]/.test(b.stick)); }
  function laneH(lanes) { return lanes.length > 6 ? 28 : lanes.length > 4 ? 32 : 38; }
  function heightFor(tl) {
    const lanes = lanesOf(tl);
    return TOP + lanes.length * laneH(lanes) + (hasSticking(tl) ? 22 : 6);
  }
  N.heightFor = heightFor;

  function prep(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600, h = canvas.clientHeight || 200;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    return { g, w, h };
  }

  function shape(g, voice, x, y, r, fill, stroke, lw) {
    g.beginPath();
    if (voice === 'hp') {
      g.moveTo(x - r, y - r); g.lineTo(x + r, y + r);
      g.moveTo(x + r, y - r); g.lineTo(x - r, y + r);
      g.strokeStyle = stroke || fill; g.lineWidth = lw || 3; g.stroke();
      return;
    }
    if (CYMBAL[voice]) { g.moveTo(x, y - r * 1.15); g.lineTo(x + r * 1.15, y); g.lineTo(x, y + r * 1.15); g.lineTo(x - r * 1.15, y); g.closePath(); }
    else g.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); }
  }

  // Draws everything between times t0 and t1. geo.xOf maps a time to an x position.
  function paint(g, w, h, tl, lanes, geo, run, now) {
    const lh = laneH(lanes), stick = hasSticking(tl);
    const laneY = {};
    lanes.forEach((l, i) => { laneY[l] = TOP + i * lh + lh / 2; });
    const { xOf, t0, t1, pps } = geo;

    // lane backgrounds and labels
    lanes.forEach((l, i) => {
      g.fillStyle = i % 2 ? 'rgba(120,190,255,0.035)' : 'rgba(120,190,255,0.07)';
      g.fillRect(LABEL_W, TOP + i * lh, w - LABEL_W, lh);
    });

    // bar, beat and subdivision lines, counts and section names
    g.textBaseline = 'middle';
    let prevSection = -1;
    tl.bars.forEach(bar => {
      const isNewSection = bar.sectionName && bar.section !== prevSection;
      prevSection = bar.section;
      if (bar.t > t1 || bar.t + bar.dur < t0) return;
      const steps = bar.beats * bar.sub;
      const subSpace = bar.stepDur * pps;
      for (let k = 0; k < steps; k++) {
        const t = bar.t + k * bar.stepDur, x = xOf(t);
        if (x < LABEL_W - 1 || x > w + 1) continue;
        const isBeat = k % bar.sub === 0, beat = Math.floor(k / bar.sub), j = k % bar.sub;
        if (k === 0) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x - 1, TOP - 4, 2, h - TOP + 4); }
        else if (isBeat) { g.fillStyle = (bar.clicks && bar.clicks.indexOf(beat) >= 0) ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)'; g.fillRect(x - 0.5, TOP, 1, h - TOP); }
        else if (subSpace >= 7) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x - 0.5, TOP, 1, h - TOP); }
        if (isBeat) {
          const lbl = bar.countLabels ? bar.countLabels[beat] : String(beat + 1);
          g.font = '600 12px system-ui, sans-serif';
          g.fillStyle = bar.accents.indexOf(beat) >= 0 ? '#ffffff' : '#b4cbe4';
          g.textAlign = 'center';
          g.fillText(lbl, x, TOP - 9);
        } else if (subSpace >= 17 && SUBLABEL[bar.sub]) {
          g.font = '11px system-ui, sans-serif';
          g.fillStyle = '#7b94b2';
          g.textAlign = 'center';
          g.fillText(SUBLABEL[bar.sub][j], x, TOP - 9);
        }
      }
      const bx = xOf(bar.t);
      if (bx > LABEL_W - 2 && bx < w - 20) {
        g.font = isNewSection ? '700 12px system-ui, sans-serif' : '11px system-ui, sans-serif';
        g.fillStyle = isNewSection ? '#ffd166' : '#5f7a9c';
        g.textAlign = 'left';
        g.fillText(isNewSection ? bar.sectionName : 'Bar ' + (bar.index + 1), bx + 5, 10);
      }
    });

    // notes
    const r = Math.min(lh * 0.3, 10);
    tl.notes.forEach(n => {
      if (n.t < t0 - 0.2 || n.t > t1 + 0.2) return;
      const x = xOf(n.t), y = laneY[n.lane];
      if (x < LABEL_W - r || y == null) return;
      const col = V[n.voice].color;
      let rr = n.accent ? r * 1.25 : n.ghost ? r * 0.8 : r;
      const missed = run && now != null && !n.judge && !n.ignored && n.t + (n.win || 0.1) < now;
      g.globalAlpha = n.ignored ? 0.25 : 1;
      if (n.ghost) shape(g, n.voice, x, y, rr, null, col, 2);
      else shape(g, n.voice, x, y, rr, col);
      if (n.voice === 'ho') {
        g.font = '700 10px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#04122a';
        g.fillText('o', x, y + 0.5);
      }
      if (n.accent) {
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath();
        g.moveTo(x - 4, y - rr - 9); g.lineTo(x + 4, y - rr - 6); g.lineTo(x - 4, y - rr - 3); g.stroke();
      }
      if (run && n.judge && n.judge !== 'wrong') shape(g, n.voice, x, y, rr + 3.5, null, JC[n.judge], 3);
      else if (run && n.judge === 'wrong') shape(g, n.voice, x, y, rr + 3.5, null, JC.wrong, 3);
      else if (missed) shape(g, n.voice, x, y, rr + 3.5, null, n.optional ? '#5f7a9c' : JC.miss, 2.5);
      g.globalAlpha = 1;
    });

    // what you actually played
    if (run) {
      run.hits.forEach(hit => {
        if (hit.t < t0 || hit.t > t1) return;
        const x = xOf(hit.t);
        if (x < LABEL_W) return;
        let lane = null;
        if (hit.target) {
          const ls = hit.target.lanes;
          lane = ls.find(l => (hit.voice && E.laneOf(hit.voice) === l) || (hit.cls && E.CLASS_OF[l] === hit.cls)) || ls[0];
        } else if (hit.voice && laneY[E.laneOf(hit.voice)] != null) lane = E.laneOf(hit.voice);
        else if (hit.cls && laneY[E.CLASS_LANE[hit.cls]] != null) lane = E.CLASS_LANE[hit.cls];
        const y = lane ? laneY[lane] : TOP + (lanes.length * lh) / 2;
        g.fillStyle = JC[hit.judge] || '#fff';
        if (hit.judge === 'extra') {
          g.strokeStyle = JC.extra; g.lineWidth = 2.5; g.beginPath();
          g.moveTo(x - 5, y - 5); g.lineTo(x + 5, y + 5); g.moveTo(x + 5, y - 5); g.lineTo(x - 5, y + 5); g.stroke();
        } else {
          g.fillRect(x - 1.5, y - lh * 0.42, 3, lh * 0.84);
        }
      });
    }

    // sticking
    if (stick) {
      const y = h - 11;
      g.font = '700 12px system-ui, sans-serif'; g.textAlign = 'center';
      tl.bars.forEach(bar => {
        if (!bar.stick || bar.t > t1 || bar.t + bar.dur < t0) return;
        for (let k = 0; k < bar.stick.length; k++) {
          const ch = bar.stick[k];
          if (ch === '-') continue;
          const x = xOf(bar.t + k * bar.stepDur);
          if (x < LABEL_W || x > w) continue;
          g.fillStyle = ch === 'R' ? '#9fd3ff' : ch === 'L' ? '#ffb3c7' : '#ffcf8a';
          g.fillText(ch, x, y);
        }
      });
    }

    // label column on top so notes scroll underneath it
    g.fillStyle = '#071d3c';
    g.fillRect(0, 0, LABEL_W, h);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(LABEL_W - 1, 0, 1, h);
    lanes.forEach(l => {
      g.font = '700 11px system-ui, sans-serif'; g.textAlign = 'left';
      shape(g, l, 11, laneY[l], 4.5, V[l].color, null);
      g.fillStyle = '#d6e6f8';
      g.fillText(V[l].short, 20, laneY[l] + 0.5);
    });
    if (stick) { g.fillStyle = '#7b94b2'; g.font = '10px system-ui, sans-serif'; g.fillText('Hand', 8, h - 11); }
  }

  // The scrolling view you play along to. The playhead sits a quarter of the way in.
  N.Highway = function (canvas, tl, run) {
    this.canvas = canvas;
    this.set(tl, run);
  };
  N.Highway.prototype.set = function (tl, run) {
    this.tl = tl;
    this.run = run || null;
    this.lanes = lanesOf(tl);
    const durs = tl.bars.map(b => b.dur).sort((a, b) => a - b);
    this.barDur = durs[durs.length >> 1] || 2;
    this.canvas.style.height = heightFor(tl) + 'px';
  };
  N.Highway.prototype.draw = function (now, live) {
    const { g, w, h } = prep(this.canvas);
    const playX = LABEL_W + (w - LABEL_W) * 0.25;
    const pps = (w - LABEL_W) * 0.72 / Math.max(1.25 * this.barDur, 2.4);
    const geo = { pps, xOf: t => playX + (t - now) * pps, t0: now - (playX - LABEL_W) / pps, t1: now + (w - playX) / pps };
    paint(g, w, h, this.tl, this.lanes, geo, this.run, live ? now : null);
    g.fillStyle = live ? 'rgba(110,220,255,0.95)' : 'rgba(110,220,255,0.5)';
    g.fillRect(playX - 1, TOP - 4, 2, h - TOP + 4);
  };

  // A still picture of the first few bars, sized to fit.
  N.drawStatic = function (canvas, tl, opts) {
    const nb = Math.min((opts && opts.bars) || 2, tl.bars.length);
    canvas.style.height = heightFor(tl) + 'px';
    const { g, w, h } = prep(canvas);
    const t1 = tl.bars[nb - 1].t + tl.bars[nb - 1].dur;
    const pps = (w - LABEL_W - 16) / t1;
    paint(g, w, h, tl, lanesOf(tl), { pps, xOf: t => LABEL_W + 10 + t * pps, t0: -0.01, t1: t1 - 0.001 }, null, null);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillRect(LABEL_W + 10 + t1 * pps - 1, TOP - 4, 2, h - TOP + 4);
  };

  // Results chart: how early or late each note was, across the whole run.
  N.drawOffsets = function (canvas, res) {
    const { g, w, h } = prep(canvas);
    const padL = 54, padR = 12, padT = 12, padB = 22;
    const range = res.windows[2];
    const cy = padT + (h - padT - padB) / 2;
    const yOf = ms => cy - (ms / range) * ((h - padT - padB) / 2);
    const xOf = t => padL + (t / Math.max(0.1, res.duration)) * (w - padL - padR);
    g.fillStyle = 'rgba(61,220,132,0.10)';
    g.fillRect(padL, yOf(res.windows[1]), w - padL - padR, yOf(-res.windows[1]) - yOf(res.windows[1]));
    g.fillStyle = 'rgba(61,220,132,0.14)';
    g.fillRect(padL, yOf(res.windows[0]), w - padL - padR, yOf(-res.windows[0]) - yOf(res.windows[0]));
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(padL, cy - 0.5, w - padL - padR, 1);
    g.font = '11px system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'right';
    g.fillStyle = '#b4cbe4';
    g.fillText('late', padL - 8, padT + 6);
    g.fillText('on time', padL - 8, cy);
    g.fillText('early', padL - 8, h - padB - 6);
    g.textAlign = 'center'; g.fillStyle = '#7b94b2';
    g.fillText('start', padL + 12, h - 8);
    g.fillText('end', w - padR - 10, h - 8);
    if (res.timing.n >= 3) {
      g.setLineDash([5, 4]); g.strokeStyle = 'rgba(255,209,102,0.7)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(padL, yOf(res.timing.mean)); g.lineTo(w - padR, yOf(res.timing.mean)); g.stroke();
      g.setLineDash([]);
    }
    res.points.forEach(p => {
      const x = xOf(p.t);
      if (p.off != null) {
        const y = yOf(Math.max(-range, Math.min(range, p.off)));
        g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2);
        g.fillStyle = p.lane ? V[p.lane].color : '#fff'; g.fill();
      } else if (p.judge === 'miss' || p.judge === 'wrong') {
        g.fillStyle = JC[p.judge];
        g.fillRect(x - 1, h - padB - 2, 2, 8);
      } else if (p.judge === 'extra') {
        g.strokeStyle = JC.extra; g.lineWidth = 1.5; g.beginPath();
        g.moveTo(x - 3, padT - 3); g.lineTo(x + 3, padT + 3); g.moveTo(x + 3, padT - 3); g.lineTo(x - 3, padT + 3); g.stroke();
      }
    });
  };
})();
