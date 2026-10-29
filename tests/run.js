/* Checks every lesson and song is well formed, and that grading behaves. Run: node tests/run.js */
'use strict';
require('../js/engine.js');
require('../js/content.js');
const { Engine: E, Content: C } = globalThis.DT;

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('FAIL', msg); } }
const len = s => E.clean(s).length;

// 1. Every part fills whole bars, and sticking lines up with the notes.
for (const it of C.all) {
  const check = (parts, m, where) => {
    const bar = (m.beats || 4) * (m.sub || 4);
    for (const v in parts) {
      ok(E.VOICES[v], `${it.id} ${where}: unknown voice ${v}`);
      ok(len(parts[v]) % bar === 0, `${it.id} ${where}: ${v} is ${len(parts[v])} steps, not a multiple of ${bar}`);
    }
  };
  if (it.sections) {
    it.sections.forEach(s => {
      const m = Object.assign({}, it, s);
      check(s.parts, m, s.name);
      if (s.first) check(s.first, m, s.name + ' first');
      if (s.fill) check(s.fill, m, s.name + ' fill');
    });
  } else {
    check(it.parts, it, 'parts');
    if (it.stick) {
      const longest = Math.max(...Object.values(it.parts).map(len));
      ok(len(it.stick) === longest, `${it.id}: stick is ${len(it.stick)} steps, notes are ${longest}`);
    }
  }
  const bars = E.buildChart(it), tl = E.buildTimeline(bars, it.bpm);
  ok(tl.notes.length > 0 && tl.duration > 0, `${it.id}: empty timeline`);
  ok(tl.duration < 300, `${it.id}: ${Math.round(tl.duration)}s is too long`);
}

// 2. Play every item perfectly in every mode: it should score 100 with 3 stars.
function play(it, mode, offsetMs, jitterMs) {
  const tl = E.buildTimeline(E.buildChart(it), it.bpm);
  const run = new E.Run(tl, { mode, start: 10, level: C.levelOf(it.id).n, knownClasses: new Set(['kick', 'snare', 'hat', 'tom', 'cym']) });
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  run.targets.forEach(tg => {
    const v = tg.voices[0];
    run.addHit({ t: 10 + tg.t + (offsetMs + rnd() * (jitterMs || 0)) / 1000, voice: v, cls: E.CLASS_OF[v], vel: 0.8, src: mode === 'exact' ? 'keys' : 'mic' });
  });
  return E.analyze(run, { level: C.levelOf(it.id).n, tempoPct: 100, bpm: tl.bpm, src: 'keys', sections: it.sections ? it.sections.map(s => s.name) : null, barNames: it.barNames || null });
}
for (const it of C.all) {
  for (const mode of ['exact', 'class', 'timing']) {
    const r = play(it, mode, 0, 0);
    ok(r.score === 100 && r.stars === 3, `${it.id} ${mode}: perfect run scored ${r.score} (${r.stars} stars)`);
  }
}

// 3. Rushing by 40ms is noticed and explained.
for (const id of ['l1-hihat-count', 'l1-rock8']) {
  const it = C.byId[id];
  const r = play(it, 'exact', -40, 4);
  ok(r.findings.some(f => f.id === 'rush'), `${it.id}: 40ms early should give a 'rush' finding, got ${r.findings.map(f => f.id).join(', ') || 'none'}`);
  ok(r.timing.mean < -30, `${it.id}: mean should be about -40ms, got ${Math.round(r.timing.mean)}`);
}

// 4. Dragging and missed notes are noticed too.
{
  const it = C.levels[1].items[0];
  const late = play(it, 'exact', 40, 4);
  ok(late.findings.some(f => f.id === 'drag'), `${it.id}: 40ms late should give 'drag', got ${late.findings.map(f => f.id).join(', ')}`);
  const tl = E.buildTimeline(E.buildChart(it), it.bpm);
  const run = new E.Run(tl, { mode: 'exact', start: 0, level: 2 });
  run.targets.forEach((tg, i) => { if (i % 3) run.addHit({ t: tg.t, voice: tg.voices[0], vel: 0.8, src: 'keys' }); });
  const r = E.analyze(run, { level: 2, tempoPct: 100, bpm: tl.bpm, src: 'keys' });
  ok(r.counts.miss > 0 && r.score < 85 && r.findings.length > 0, `${it.id}: skipping a third of the notes should cost points (score ${r.score})`);
  ok(r.next.type === 'slower' || r.next.type === 'again', `${it.id}: a weak run should suggest slowing down, got ${r.next.type}`);
}

// 5. Every lesson and song has a teaching video, and every video id looks like a real YouTube id.
for (const id of C.VIDEO_IDS) ok(/^[A-Za-z0-9_-]{11}$/.test(id), `video ${id}: not an 11-character YouTube id`);
for (const it of C.all) {
  const v = C.videoFor(it.id);
  ok(v && v.title && v.channel, `${it.id}: no teaching video`);
}
for (const id in C.ITEM_VIDEO) ok(C.byId[id], `video list names ${id}, which isn't a lesson or song`);
ok(C.startVideos.length >= 3 && C.startVideos.every(v => v.title && v.topic), 'the "Start here" videos are missing or incomplete');

console.log(`${C.levels.length} levels, ${C.all.length} lessons and songs, ${C.VIDEO_IDS.length} videos, ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
