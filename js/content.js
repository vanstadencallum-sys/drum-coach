/* Drum Coach content: six skill levels of lessons and original practice songs.
   Patterns are grids: one character per step, '-' rest, 'x' note, 'X' accent, 'g' ghost, 'o' open hi-hat.
   Spaces and '|' are only there to make the grids easier to read. */
(function (root) {
  'use strict';
  const DT = root.DT = root.DT || {};

  const rep = (s, n) => s.repeat(n);
  // A grid of `len` steps with a note at each position.
  const at = (len, pos, ch) => { const a = new Array(len).fill('-'); pos.forEach(p => { a[p] = ch || 'x'; }); return a.join(''); };
  const range = (a, b) => { const r = []; for (let i = a; i < b; i++) r.push(i); return r; };

  // ---------------- Level 1 ----------------
  const L1 = [
    {
      id: 'l1-first-notes', kind: 'lesson', title: 'Your first notes', desc: 'Quarter notes on the snare, alternating hands.',
      bpm: 60, sub: 1, repeat: 8, pad: true,
      parts: { sn: 'xxxx' }, stick: 'RLRL',
      intro: [
        'Welcome! Hold each stick about a third of the way up from the bottom end, pinched between your thumb and the first joint of your index finger. Wrap your other fingers loosely around it.',
        'Play one note on every click, alternating hands: right, left, right, left. Let the stick bounce back up after each note, like dribbling a ball.',
      ],
      tips: [
        'Grip just tight enough that the stick won\'t fly out of your hand. A tight grip makes you tired and slow.',
        'Hit the middle of the drum or pad for the clearest sound.',
        'Count out loud: "1, 2, 3, 4". Counting is the most important habit you\'ll build.',
      ],
    },
    {
      id: 'l1-hihat-count', kind: 'lesson', title: 'Counting on the hi-hat', desc: 'Keep a steady pulse with your right hand.',
      bpm: 65, sub: 1, repeat: 8, pad: true,
      parts: { hh: 'xxxx' }, stick: 'RRRR',
      intro: [
        'The hi-hat is the timekeeper of most beats. Keep your left foot pressing the hi-hat pedal down so the two cymbals stay closed and make a short "tick".',
        'Play the hi-hat with your right hand on every click and count "1, 2, 3, 4" out loud. If you play left-handed, swap hands throughout these lessons.',
      ],
      tips: [
        'Hit the top of the hi-hat with the tip of the stick, about halfway between the edge and the middle.',
        'Try to make every note sound the same: same height, same motion.',
      ],
    },
    {
      id: 'l1-kick', kind: 'lesson', title: 'Adding the kick drum', desc: 'Your right foot joins in on beats 1 and 3.',
      bpm: 60, sub: 1, repeat: 8,
      parts: { hh: 'xxxx', bd: 'x-x-' },
      intro: [
        'Rest your right foot on the kick pedal with your heel down. Press with the ball of your foot and let the beater come straight back off the drum.',
        'Keep the hi-hat going on every beat and add the kick on beats 1 and 3, at exactly the same moment as the hi-hat.',
      ],
      tips: [
        'Hand and foot should sound like one note, not two. Listen for a single "thump-tick".',
        'Don\'t bury the beater in the drum. Let it bounce off.',
      ],
    },
    {
      id: 'l1-backbeat', kind: 'lesson', title: 'The backbeat', desc: 'Snare on beats 2 and 4, the heartbeat of rock and pop.',
      bpm: 65, sub: 1, repeat: 8, pad: true,
      parts: { hh: 'xxxx', sn: '-x-x' }, stick: 'RBRB',
      intro: [
        'The snare on beats 2 and 4 is called the backbeat. Almost every rock, pop and funk song has it.',
        'Right hand plays the hi-hat on every beat. Left hand plays the snare on 2 and 4, at the same time as the hi-hat. The "B" in the sticking line means both hands.',
      ],
      tips: [
        'Cross your right hand over your left so the right plays the hi-hat and the left reaches the snare.',
        'Play the snare a little louder than the hi-hat. The backbeat should feel strong.',
      ],
    },
    {
      id: 'l1-rock1', kind: 'lesson', title: 'Your first rock beat', desc: 'Hi-hat, kick and snare together.',
      bpm: 70, sub: 1, repeat: 8,
      parts: { hh: 'xxxx', sn: '-x-x', bd: 'x-x-' },
      intro: [
        'Put it all together: hi-hat on every beat, kick on 1 and 3, snare on 2 and 4.',
        'Say it as you play: "kick, snare, kick, snare", with the hi-hat on every one.',
      ],
      tips: [
        'If it falls apart, play just hi-hat and kick, then add the snare back.',
        'Every note lines up with a click. Nothing goes in between yet.',
      ],
    },
    {
      id: 'l1-eighth-hats', kind: 'lesson', title: 'Eighth notes on the hi-hat', desc: 'Two hi-hat notes per click: "1 & 2 &".',
      bpm: 70, sub: 2, repeat: 4, pad: true,
      parts: { hh: 'xxxxxxxx', bd: 'x---x---' },
      intro: [
        'Now play two hi-hat notes for every click. Count "1 & 2 & 3 & 4 &". The "&" lands exactly halfway between the clicks.',
        'Keep the kick on 1 and 3 to anchor you.',
      ],
      tips: [
        'Keep the motion small and even. Each "&" should sound exactly like the number before it.',
        'If you start to rush, count louder and slower.',
      ],
    },
    {
      id: 'l1-rock8', kind: 'lesson', title: 'The 8th-note rock beat', desc: 'The most-played drum beat in the world.',
      bpm: 75, sub: 2, repeat: 4,
      parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x---' },
      intro: [
        'This is the beat behind thousands of songs. Eighth notes on the hi-hat, kick on 1 and 3, snare on 2 and 4.',
        'Once it feels comfortable, try playing it with your eyes off the screen and just listen.',
      ],
      tips: [
        'The hand on the hi-hat never stops. Everything else fits under it.',
        'Practice at 60% speed until you can play four bars without a mistake, then speed up.',
      ],
    },
    {
      id: 's1-first-steps', kind: 'song', title: 'First Steps', desc: 'A gentle pop tune built on the rock beat.', style: 'Pop',
      bpm: 75, sub: 2,
      intro: [
        'Your first full song. It uses the 8th-note rock beat with a crash cymbal at the start of the chorus and at the very end.',
        'The coloured section names along the top of the note lane tell you where you are in the song.',
      ],
      tips: [
        'The crash replaces the first hi-hat note of the chorus. Hit it together with the kick.',
        'Look ahead: the next section name appears before you get there.',
      ],
      sections: [
        { name: 'Intro', bars: 2, chords: 'C G', bass: 'x-------', parts: { hh: 'xxxxxxxx', bd: 'x---x---' } },
        { name: 'Verse', bars: 8, chords: 'C G Am F', bass: 'x---x---', parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x---' } },
        {
          name: 'Chorus', bars: 8, chords: 'F G C Am', bass: 'x-x-x-x-',
          parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x---' },
          first: { cr: 'x-------', hh: '-xxxxxxx', sn: '--x---x-', bd: 'x---x---' },
        },
        {
          name: 'Outro', bars: 2, chords: 'C', bass: 'x---x---',
          parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x---' },
          fill: { cr: 'x-------', bd: 'x-------' },
        },
      ],
    },
  ];

  // ---------------- Level 2 ----------------
  const L2 = [
    {
      id: 'l2-singles', kind: 'lesson', title: '16th-note single strokes', desc: 'Four even notes per beat, hand to hand.',
      bpm: 60, sub: 4, repeat: 4, pad: true,
      parts: { sn: 'XxxxXxxxXxxxXxxx' }, stick: rep('RL', 8),
      intro: [
        'Sixteenth notes split each beat into four: count "1 e & a, 2 e & a". Alternate hands on every note.',
        'Accent the first note of each beat (the big ">" mark) by lifting the stick higher. Play the other three low and soft.',
      ],
      tips: [
        'Accents come from stick height, not from squeezing harder.',
        'Both hands should sound the same. If one hand is weaker, practice it alone.',
      ],
    },
    {
      id: 'l2-kick-and', kind: 'lesson', title: 'Kick on the "&"', desc: 'Your first syncopated kick note.',
      bpm: 80, sub: 2, repeat: 4,
      parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x-x-' },
      intro: [
        'Add a kick on the "&" of beat 3 (between beats 3 and 4). It plays together with a hi-hat note.',
        'Notes between the clicks are called syncopation. They make a beat feel like it\'s moving forward.',
      ],
      tips: [
        'Count "1 & 2 & 3 & 4 &" and press the kick on "3 &".',
        'Keep the hi-hat steady while your foot does something different.',
      ],
    },
    {
      id: 'l2-kick-and2', kind: 'lesson', title: 'Two-bar kick pattern', desc: 'Kick on the "&" of 2, then on the "&" of 3.',
      bpm: 80, sub: 2, repeat: 4,
      parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x--xx---|x---x-x-' },
      barNames: ['first bar', 'second bar'],
      intro: [
        'This kick pattern changes from bar to bar. In the first bar the kick plays on 1, the "&" of 2 and on 3. In the second bar it plays on 1, 3 and the "&" of 3.',
        'Many grooves are two bars long. Learn the first bar, then the second, then join them.',
      ],
      tips: [
        'The kick on the "&" of 2 comes just before the snare is due. Don\'t let it pull the snare early.',
        'If you lose your place, the snare on 2 and 4 never changes. Use it to find your way back.',
      ],
    },
    {
      id: 'l2-crash', kind: 'lesson', title: 'Starting with a crash', desc: 'Kick and crash together to mark a new section.',
      bpm: 80, sub: 2, repeat: 4,
      parts: { cr: 'x-------|--------', hh: '-xxxxxxx|xxxxxxxx', sn: '--x---x-', bd: 'x---x---' },
      barNames: ['crash bar', 'groove bar'],
      intro: [
        'Drummers hit a crash cymbal together with the kick to mark the start of a new section.',
        'Your right hand moves from the hi-hat to the crash for one note, then straight back to the hi-hat.',
      ],
      tips: [
        'Hit the crash with a glancing blow on the edge, not straight down.',
        'Don\'t wait for the crash to ring out. Get your hand back to the hi-hat for the "&".',
      ],
    },
    {
      id: 'l2-first-fill', kind: 'lesson', title: 'Your first fill', desc: 'Four snare notes leading back to the crash.',
      bpm: 75, sub: 2, repeat: 4,
      parts: {
        cr: 'x-------|--------', hh: '-xxxxxxx|xxxx----',
        sn: '--x---x-|--x-xxxx', bd: 'x---x---|x-------',
      },
      stick: '--------|----RLRL',
      barNames: ['groove bar', 'fill bar'],
      intro: [
        'A fill is a short break from the beat that leads into the next section. This one replaces beats 3 and 4 with four snare notes: "3 & 4 &".',
        'The fill always ends by landing on the crash on beat 1. Landing on time is the most important part.',
      ],
      tips: [
        'Keep counting through the fill. Fills rush when the counting stops.',
        'Play the fill at the same volume as your backbeat, not louder.',
      ],
    },
    {
      id: 'l2-tom-fill', kind: 'lesson', title: 'Around the toms', desc: 'A fill that travels from the snare down the toms.',
      bpm: 75, sub: 2, repeat: 4,
      parts: {
        cr: 'x-------|--------', hh: '-xxxxxxx|xxxx----',
        sn: '--x---x-|--x-x---', t1: '--------|-----x--', t2: '--------|------x-', ft: '--------|-------x',
        bd: 'x---x---|x-------',
      },
      stick: '--------|----RLRL',
      barNames: ['groove bar', 'fill bar'],
      intro: [
        'The same fill as before, but now it moves around the kit: snare, high tom, mid tom, floor tom.',
        'Let your arms travel in a smooth arc from left to right. Don\'t reach. Turn your body a little.',
      ],
      tips: [
        'Practice moving between the drums slowly, looking at where you\'re going next.',
        'The floor tom note on "4 &" leads straight into the crash. Don\'t leave a gap.',
      ],
    },
    {
      id: 'l2-open-hat', kind: 'lesson', title: 'The open hi-hat', desc: 'Lift your foot on the "&" of 4 for a splashy accent.',
      bpm: 85, sub: 2, repeat: 4,
      parts: { hh: 'xxxxxxxo', sn: '--x---x-', bd: 'x---x---' },
      intro: [
        'Lift your left foot off the hi-hat pedal just as you play the "&" of 4, so the cymbals ring. Press it down again on beat 1 to close it.',
        'The "o" inside the note means open hi-hat.',
      ],
      tips: [
        'Close the hi-hat exactly on beat 1, together with the kick. It should sound like a "tssst-chick".',
        'Lift your foot only a little. A slightly open hat sounds better than a wide-open one.',
      ],
    },
    {
      id: 's2-garage', kind: 'song', title: 'Garage Anthem', desc: 'Loud, simple and fun. Fills, crashes and an open hat.', style: 'Rock',
      bpm: 100, sub: 2,
      intro: [
        'A punchy rock tune. The verse uses the kick on the "&" of 3; the chorus switches to the two-bar kick idea and opens the hi-hat.',
        'There\'s a snare fill at the end of the verse and a tom fill at the end of the chorus.',
      ],
      tips: [
        'Practice the two fills on their own in the Level 2 lessons before playing the whole song.',
        'Slow the song down with the tempo slider until you can play the fills cleanly.',
      ],
      sections: [
        {
          name: 'Intro', bars: 4, chords: 'E5 E5 D5 A5', bass: 'xxxxxxxx',
          parts: { hh: 'xxxxxxxx', bd: 'x---x-x-' },
          first: { cr: 'x-------', hh: '-xxxxxxx', bd: 'x---x-x-' },
        },
        {
          name: 'Verse', bars: 8, chords: 'E5 E5 D5 A5', bass: 'xxxxxxxx',
          parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x-x-' },
          first: { cr: 'x-------', hh: '-xxxxxxx', sn: '--x---x-', bd: 'x---x-x-' },
          fill: { hh: 'xxxx----', sn: '--x-xxxx', bd: 'x-------' },
        },
        {
          name: 'Chorus', bars: 8, chords: 'A5 D5 E5 E5', bass: 'xxxxxxxx',
          parts: { hh: 'xxxxxxxo', sn: '--x---x-', bd: 'x--xx---' },
          first: { cr: 'x-------', hh: '-xxxxxxo', sn: '--x---x-', bd: 'x--xx---' },
          fill: { hh: 'xxxx----', sn: '--x-x---', t1: '-----x--', t2: '------x-', ft: '-------x', bd: 'x-------' },
        },
        {
          name: 'Outro', bars: 2, chords: 'E5', bass: 'xxxxxxxx',
          parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x-x-' },
          first: { cr: 'x-------', hh: '-xxxxxxx', sn: '--x---x-', bd: 'x---x-x-' },
          fill: { cr: 'x-------', bd: 'x-------' },
        },
      ],
    },
    {
      id: 's2-sunday', kind: 'song', title: 'Sunday Drive', desc: 'A laid-back groove that ends on the ride cymbal.', style: 'Pop rock',
      bpm: 88, sub: 2,
      intro: [
        'An easy-going song. Keep it relaxed and steady. For the outro, your right hand moves from the hi-hat to the ride cymbal.',
      ],
      tips: [
        'Play the ride with the tip of the stick, about halfway between the bell and the edge.',
        'This song is about feel. Aim for every note on time rather than loud.',
      ],
      sections: [
        { name: 'Intro', bars: 2, chords: 'C Am', bass: 'x---x-5-', parts: { hh: 'x-x-x-x-', bd: 'x---x---' } },
        {
          name: 'Verse', bars: 8, chords: 'C Am F G', bass: 'x---x-5-',
          parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x---' },
          fill: { hh: 'xxxxxx--', sn: '--x---xx', bd: 'x---x---' },
        },
        {
          name: 'Chorus', bars: 8, chords: 'F G C Am', bass: 'x-x-x-5-',
          parts: { hh: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x-x-' },
          first: { cr: 'x-------', hh: '-xxxxxxx', sn: '--x---x-', bd: 'x---x-x-' },
          fill: { hh: 'xxxx----', sn: '--x-x---', t1: '-----x--', t2: '------x-', ft: '-------x', bd: 'x-------' },
        },
        {
          name: 'Outro', bars: 4, chords: 'C Am F C', bass: 'x---x-5-',
          parts: { rd: 'xxxxxxxx', sn: '--x---x-', bd: 'x---x---' },
          first: { cr: 'x-------', rd: '-xxxxxxx', sn: '--x---x-', bd: 'x---x---' },
          fill: { cr: 'x-------', bd: 'x-------' },
        },
      ],
    },
  ];

  // ---------------- Level 3 ----------------
  const L3 = [
    {
      id: 'l3-doubles', kind: 'lesson', title: 'Double strokes', desc: 'Two notes per hand: RRLL.',
      bpm: 65, sub: 4, repeat: 4, pad: true,
      parts: { sn: rep('x', 16) }, stick: rep('RRLL', 4),
      intro: [
        'Play two notes with each hand: right, right, left, left. This is the double-stroke roll, one of the most important rudiments.',
        'The second note of each pair is usually weaker. Make both notes sound the same.',
      ],
      tips: [
        'At slow tempos, play both notes with your wrist. As you speed up, let the stick bounce for the second note and add a little finger push.',
        'Listen for "da-da-da-da", four even notes, not "DA-da DA-da".',
      ],
    },
    {
      id: 'l3-paradiddle', kind: 'lesson', title: 'The paradiddle', desc: 'RLRR LRLL: singles and doubles combined.',
      bpm: 65, sub: 4, repeat: 4, pad: true,
      parts: { sn: rep('Xxxx', 4) }, stick: rep('RLRRLRLL', 2),
      intro: [
        'Say it as you play: "pa-ra-did-dle". Right, left, right-right, then left, right, left-left. The lead hand switches each time.',
        'Accent the first note of each paradiddle. That accent swaps between hands.',
      ],
      tips: [
        'Learn the sticking very slowly first. Speed comes later.',
        'Drummers use paradiddles to move around the kit and to make interesting hi-hat patterns.',
      ],
    },
    {
      id: 'l3-16-hats', kind: 'lesson', title: '16th-note hi-hat groove', desc: 'Both hands on the hi-hat, alternating.',
      bpm: 70, sub: 4, repeat: 4,
      parts: { hh: 'xxxx-xxxxxxx-xxx', sn: '----x-------x---', bd: 'x-------x-x-----' },
      stick: 'RLRL' + 'RLRL' + 'RLRL' + 'RLRL',
      intro: [
        'Play 16th notes on the hi-hat with both hands, alternating. On beats 2 and 4, your right hand moves to the snare for the backbeat instead of the hi-hat.',
        'The kick plays on 1, 3 and the "&" of 3.',
      ],
      tips: [
        'Keep the hi-hat notes soft and the backbeat strong.',
        'Practice the hands alone first, then add the kick.',
      ],
    },
    {
      id: 'l3-ghosts', kind: 'lesson', title: 'Ghost notes', desc: 'Very quiet snare notes that make a beat groove.',
      bpm: 75, sub: 4, repeat: 4,
      parts: { hh: rep('x-', 8), sn: '----X--g-g--X--g', bd: 'x-------x-x-----' },
      intro: [
        'Ghost notes are tiny, quiet snare notes played between the main beats. They\'re drawn as hollow notes. You feel them more than hear them.',
        'Play your backbeats loud (accents) and the ghost notes from just 2 to 3 cm (an inch) above the drum.',
      ],
      tips: [
        'The difference in volume is the whole point. Big backbeat, tiny ghosts.',
        'On an acoustic kit the microphone may not hear soft ghost notes. They\'re a bonus, not a requirement.',
      ],
    },
    {
      id: 'l3-16-fill', kind: 'lesson', title: '16th-note fill', desc: 'Snare 16ths then down the toms.',
      bpm: 70, sub: 4, repeat: 4,
      parts: {
        cr: 'x---------------|----------------', hh: '--x-x-x-x-x-x-x-|x-x-x-x---------',
        sn: '----x-------x---|----x---xxxx----', t2: '----------------|------------xx--', ft: '----------------|--------------xx',
        bd: 'x-------x-x-----|x---------------',
      },
      stick: rep('-', 16) + '|--------RLRLRLRL',
      barNames: ['groove bar', 'fill bar'],
      intro: [
        'A two-beat fill in 16th notes: four on the snare, two on the mid tom, two on the floor tom, then the crash.',
        'Count "3 e & a 4 e & a" through the fill.',
      ],
      tips: [
        'Keep the 16ths even when moving between drums. Practice the move slowly.',
        'Land the crash and kick together on beat 1.',
      ],
    },
    {
      id: 'l3-disco', kind: 'lesson', title: 'Disco groove', desc: 'Four on the floor with an open hi-hat on every "&".',
      bpm: 105, sub: 4, repeat: 4,
      parts: { hh: rep('x-o-', 4), sn: '----x-------x---', bd: 'x---x---x---x---' },
      intro: [
        'Kick on every beat ("four on the floor"), closed hi-hat on the beat, open hi-hat on every "&".',
        'Your left foot works hard here: open on the "&", closed on the beat, at the same time as the kick.',
      ],
      tips: [
        'Your feet move opposite each other: right foot down on the beat, left foot up on the "&".',
        'Keep it light and bouncy. Disco is a dance beat.',
      ],
    },
    {
      id: 'l3-accents', kind: 'lesson', title: 'Moving accents', desc: 'An accent that moves through the beat.',
      bpm: 65, sub: 4, repeat: 4, pad: true,
      parts: { sn: 'Xxxx xXxx xxXx xxxX' }, stick: rep('RL', 8),
      intro: [
        'Play 16th notes with an accent that moves one place later each beat: on "1", then "e", then "&", then "a".',
        'This builds control: playing a loud note anywhere you want while the soft notes stay soft.',
      ],
      tips: [
        'Prepare for the accent by raising the stick on the note before it.',
        'Stop the accent stroke low so the next soft note isn\'t loud too.',
      ],
    },
    {
      id: 's3-neon', kind: 'song', title: 'Neon Disco', desc: 'Four on the floor, open hats and 16th-note fills.', style: 'Disco',
      bpm: 112, sub: 4,
      intro: [
        'A dancefloor track. The verse keeps the kick on every beat with straight 8th-note hats. The chorus brings in the open hi-hats.',
      ],
      tips: [
        'Keep the kick rock steady. On a dance track the kick is the one thing that must never move.',
        'The verse fill is eight snare 16ths. The chorus fill rolls down all three toms.',
      ],
      sections: [
        {
          name: 'Intro', bars: 4, chords: 'Am7 D7 Gmaj7 Cmaj7', bass: rep('x-o-', 4),
          parts: { hh: rep('x-o-', 4), bd: 'x---x---x---x---' },
        },
        {
          name: 'Verse', bars: 8, chords: 'Am7 D7 Gmaj7 Cmaj7', bass: rep('x-o-', 4),
          parts: { hh: rep('x-', 8), sn: '----x-------x---', bd: 'x---x---x---x---' },
          fill: { hh: 'x-x-x-x---------', sn: '----x---xxxxxxxx', bd: 'x---x-----------' },
        },
        {
          name: 'Chorus', bars: 8, chords: 'Am7 D7 Gmaj7 Cmaj7', bass: rep('x-o-', 4),
          parts: { hh: rep('x-o-', 4), sn: '----x-------x---', bd: 'x---x---x---x---' },
          first: { cr: 'x---------------', hh: '--o-x-o-x-o-x-o-', sn: '----x-------x---', bd: 'x---x---x---x---' },
          fill: { hh: 'x-o-x-o---------', sn: '----x---xx------', t1: '----------xx----', t2: '------------xx--', ft: '--------------xx', bd: 'x---x-----------' },
        },
        {
          name: 'Outro', bars: 2, chords: 'Am7', bass: rep('x-o-', 4),
          parts: { hh: rep('x-o-', 4), sn: '----x-------x---', bd: 'x---x---x---x---' },
          first: { cr: 'x---------------', hh: '--o-x-o-x-o-x-o-', sn: '----x-------x---', bd: 'x---x---x---x---' },
          fill: { cr: 'x---------------', bd: 'x---------------' },
        },
      ],
    },
    {
      id: 's3-pocket', kind: 'song', title: 'Pocket Change', desc: 'A funky groove full of ghost notes.', style: 'Funk',
      bpm: 90, sub: 4,
      intro: [
        'Funk is all about the "pocket": a groove that feels so good it makes people move. The verse uses ghost notes; the chorus switches to 16th-note hi-hats.',
      ],
      tips: [
        'Keep the ghost notes really quiet. The backbeat should jump out.',
        'Lock your kick with the bass line. They play almost the same rhythm.',
      ],
      sections: [
        {
          name: 'Intro', bars: 2, chords: 'E7', bass: 'x-------x-x-----',
          parts: { hh: rep('x-', 8), bd: 'x-------x-x-----' },
        },
        {
          name: 'Verse', bars: 8, chords: 'E7 E7 A7 E7', bass: 'x-------x-x---o-',
          parts: { hh: rep('x-', 8), sn: '----X--g-g--X--g', bd: 'x-------x-x-----' },
          fill: { hh: 'x-x-x-x---------', sn: '----x---xxxx----', t2: '------------xx--', ft: '--------------xx', bd: 'x---------------' },
        },
        {
          name: 'Chorus', bars: 8, chords: 'A7 A7 E7 E7', bass: 'x-------x-x---o-',
          parts: { hh: 'xxxx-xxxxxxx-xxx', sn: '----x-------x---', bd: 'x-------x-x-----' },
          first: { cr: 'x---------------', hh: '-xxx-xxxxxxx-xxx', sn: '----x-------x---', bd: 'x-------x-x-----' },
          fill: { hh: 'x-x-x-x---------', sn: '----x---xx------', t1: '----------xx----', t2: '------------xx--', ft: '--------------xx', bd: 'x---------------' },
        },
        {
          name: 'Outro', bars: 4, chords: 'E7', bass: 'x-------x-x---o-',
          parts: { hh: rep('x-', 8), sn: '----X--g-g--X--g', bd: 'x-------x-x-----' },
          first: { cr: 'x---------------', hh: '--x-x-x-x-x-x-x-', sn: '----X--g-g--X--g', bd: 'x-------x-x-----' },
          fill: { cr: 'x---------------', bd: 'x---------------' },
        },
      ],
    },
  ];

  // ---------------- Level 4 ----------------
  const SHUF = { hh: 'x-xx-xx-xx-x', sn: '---x-----x--', bd: 'x-----x-----' };
  const L4 = [
    {
      id: 'l4-shuffle', kind: 'lesson', title: 'The shuffle', desc: 'Triplet swing: "1 - let, 2 - let".',
      bpm: 80, sub: 3, repeat: 4,
      parts: SHUF,
      intro: [
        'A shuffle splits each beat into three (a triplet) and plays the first and third: "1-trip-LET, 2-trip-LET". It gives a swinging, bouncing feel.',
        'Count all three triplet notes out loud, but only play on the number and the "let".',
      ],
      tips: [
        'The "let" is closer to the next beat than an ordinary "&". Don\'t let it turn back into straight 8ths.',
        'Swing your hi-hat hand like a pendulum: long-short, long-short.',
      ],
    },
    {
      id: 'l4-trip-fill', kind: 'lesson', title: 'Triplet fill', desc: 'A rolling fill in triplets, down the toms.',
      bpm: 80, sub: 3, repeat: 4,
      parts: {
        cr: 'x-----------|------------', hh: '--xx-xx-xx-x|x-xx-x------',
        sn: '---x-----x--|---x--xxx---', t1: '------------|---------x--', t2: '------------|----------x-', ft: '------------|-----------x',
        bd: 'x-----x-----|x-----------',
      },
      stick: '------------|------RLRLRL',
      barNames: ['groove bar', 'fill bar'],
      intro: [
        'Triplet fills roll smoothly around the kit. This one plays three snare notes on beat 3, then high tom, mid tom and floor tom on beat 4.',
      ],
      tips: [
        'Count "3-trip-let 4-trip-let" out loud through the fill.',
        'Keep all six fill notes perfectly even. Triplets should sound round, not lumpy.',
      ],
    },
    {
      id: 'l4-linear', kind: 'lesson', title: 'Linear groove', desc: 'No two drums ever play at the same time.',
      bpm: 80, sub: 4, repeat: 4,
      parts: { bd: 'x--x---xx--x----', hh: '-xx--xx--xx--x-x', sn: '----x-------x-x-' },
      intro: [
        'In a linear groove, only one drum plays at any moment. Every 16th note is played by exactly one limb.',
        'This makes a busy but very clean-sounding groove, common in funk and gospel.',
      ],
      tips: [
        'Learn it very slowly and say which limb plays each note.',
        'Keep the hi-hat notes soft so the kick and snare pattern comes through.',
      ],
    },
    {
      id: 'l4-sync-kick', kind: 'lesson', title: 'Syncopated kick', desc: 'Kick notes on the "a" and the "&".',
      bpm: 85, sub: 4, repeat: 4,
      parts: { hh: rep('x-', 8), sn: '----x-------x---', bd: 'x--x--x---x--x--' },
      intro: [
        'The kick plays a syncopated rhythm against steady 8th-note hi-hats: on 1, the "a" of 1, the "&" of 2, the "&" of 3 and the "a" of 3.',
      ],
      tips: [
        'The kick notes on the "a" fall between hi-hat notes. Count every 16th to place them.',
        'Practice just hi-hat and kick until it feels natural, then add the snare.',
      ],
    },
    {
      id: 'l4-jazz', kind: 'lesson', title: 'Jazz ride pattern', desc: 'Swinging time on the ride with the hi-hat foot on 2 and 4.',
      bpm: 120, sub: 3, repeat: 4,
      parts: { rd: 'x--x-xx--x-x', hp: '---x-----x--' },
      intro: [
        'The classic jazz time: "ding, ding-a ding, ding-a ding". The ride plays every beat, with an extra note on the "let" of beats 2 and 4.',
        'Your left foot closes the hi-hat with the pedal on 2 and 4 (the × notes).',
      ],
      tips: [
        'Let the ride ring. Play it lightly, using the tip of the stick.',
        'The "let" notes are short and light. Beats 2 and 4 are the strongest.',
      ],
    },
    {
      id: 'l4-six-stroke', kind: 'lesson', title: 'Six-stroke roll', desc: 'R LL RR L with accents at both ends.',
      bpm: 60, sub: 6, repeat: 4, pad: true,
      parts: { sn: rep('XxxxxX', 4) }, stick: rep('RLLRRL', 4),
      intro: [
        'The six-stroke roll: an accented single, two doubles, and another accented single. R LL RR L, with the first and last notes loud.',
        'Each beat is split into six even notes here.',
      ],
      tips: [
        'The doubles in the middle should be soft and even, like the double-stroke lesson.',
        'This rudiment sounds great split between snare and toms once you know it.',
      ],
    },
    {
      id: 's4-shuffle', kind: 'song', title: 'Midnight Shuffle', desc: 'A 12-bar blues with a rolling shuffle.', style: 'Blues',
      bpm: 100, sub: 3,
      intro: [
        'A 12-bar blues: a song form that repeats every twelve bars. The verse is a hi-hat shuffle; the chorus moves to the ride and gets bigger.',
      ],
      tips: [
        'Keep the shuffle relaxed. Blues should feel easy, never stiff.',
        'Each section ends with a triplet fill down the toms.',
      ],
      sections: [
        {
          name: 'Intro', bars: 4, chords: 'A7 D7 A7 E7', bass: 'x-x5-5o-o5-5',
          parts: { hh: 'x-xx-xx-xx-x', bd: 'x-----x-----' },
        },
        {
          name: 'Verse', bars: 12, chords: 'A7 A7 A7 A7 D7 D7 A7 A7 E7 D7 A7 E7', bass: 'x-x5-5o-o5-5',
          parts: SHUF,
          first: { cr: 'x-----------', hh: '--xx-xx-xx-x', sn: '---x-----x--', bd: 'x-----x-----' },
          fill: { hh: 'x-xx-x------', sn: '---x--xxx---', t1: '---------x--', t2: '----------x-', ft: '-----------x', bd: 'x-----------' },
        },
        {
          name: 'Chorus', bars: 12, chords: 'A7 A7 A7 A7 D7 D7 A7 A7 E7 D7 A7 E7', bass: 'x-x5-5o-o5-5',
          parts: { rd: 'x-xx-xx-xx-x', sn: '---x-----x--', bd: 'x-----x-----' },
          first: { cr: 'x-----------', rd: '--xx-xx-xx-x', sn: '---x-----x--', bd: 'x-----x-----' },
          fill: { rd: 'x-xx-x------', sn: '---x--xxx---', t1: '---------x--', t2: '----------x-', ft: '-----------x', bd: 'x-----------' },
        },
        {
          name: 'Outro', bars: 2, chords: 'A7', bass: 'x-x5-5o-o5-5',
          parts: SHUF,
          first: { cr: 'x-----------', hh: '--xx-xx-xx-x', sn: '---x-----x--', bd: 'x-----x-----' },
          fill: { cr: 'x-----------', bd: 'x-----------' },
        },
      ],
    },
    {
      id: 's4-bayou', kind: 'song', title: 'Bayou Funk', desc: 'Syncopated kicks, ghost notes and a linear chorus.', style: 'Funk',
      bpm: 96, sub: 4,
      intro: [
        'A swampy funk tune. The verse combines the syncopated kick with ghost notes. The chorus switches to the linear groove.',
      ],
      tips: [
        'Practice the linear groove lesson first. Switching into it is the hardest part.',
        'Stay relaxed at the change from verse to chorus. Count the fill and land the crash.',
      ],
      sections: [
        {
          name: 'Intro', bars: 2, chords: 'D7', bass: 'x--x--x---x--x--',
          parts: { hh: rep('x-', 8), bd: 'x--x--x---x--x--' },
        },
        {
          name: 'Verse', bars: 8, chords: 'D7 D7 G7 D7', bass: 'x--x--x---x--x--',
          parts: { hh: rep('x-', 8), sn: '----X--g-g--X--g', bd: 'x--x--x---x--x--' },
          fill: { hh: 'x-x-x-x---------', sn: '----x---xxxx----', t2: '------------xx--', ft: '--------------xx', bd: 'x---------------' },
        },
        {
          name: 'Chorus', bars: 8, chords: 'G7 G7 D7 D7', bass: 'x--x---xx--x----',
          parts: { bd: 'x--x---xx--x----', hh: '-xx--xx--xx--x-x', sn: '----x-------x-x-' },
          first: { cr: 'x---------------', bd: 'x--x---xx--x----', hh: '-xx--xx--xx--x-x', sn: '----x-------x-x-' },
          fill: { hh: 'x-x-x-x---------', sn: '----x---xx------', t1: '----------xx----', t2: '------------xx--', ft: '--------------xx', bd: 'x---------------' },
        },
        {
          name: 'Outro', bars: 2, chords: 'D7', bass: 'x--x--x---x--x--',
          parts: { hh: rep('x-', 8), sn: '----X--g-g--X--g', bd: 'x--x--x---x--x--' },
          first: { cr: 'x---------------', hh: '--x-x-x-x-x-x-x-', sn: '----X--g-g--X--g', bd: 'x--x--x---x--x--' },
          fill: { cr: 'x---------------', bd: 'x---------------' },
        },
      ],
    },
  ];

  // ---------------- Level 5 ----------------
  const SEVEN = { beats: 7, sub: 2, unit: 0.5, clicks: [0, 2, 4], accents: [0] };
  const SEVEN_GROOVE = { hh: 'x-x-x-x-x-x-x-', sn: '----x-------x-', bd: 'x-------x-----' };
  const sext2 = (() => {
    const len = 24;
    return {
      cr: at(len, [0]) + '|' + at(len, []),
      hh: at(len, [3, 6, 9, 12, 15, 18, 21]) + '|' + at(len, [0, 3, 6, 9]),
      sn: at(len, [6, 18]) + '|' + at(len, [6, 12, 13]),
      t1: at(len, []) + '|' + at(len, [15, 16]),
      t2: at(len, []) + '|' + at(len, [18, 19]),
      ft: at(len, []) + '|' + at(len, [21, 22]),
      bd: at(len, [0, 12]) + '|' + at(len, [0, 14, 17, 20, 23]),
    };
  })();
  const L5 = [
    Object.assign({
      id: 'l5-seven', kind: 'lesson', title: 'Groove in 7/8', desc: 'Seven eighth notes per bar, grouped 2 + 2 + 3.',
      bpm: 110, repeat: 4,
      parts: SEVEN_GROOVE,
      countLabels: ['1', '2', '3', '4', '5', '6', '7'],
      intro: [
        'A bar of 7/8 has seven eighth notes. Here they\'re grouped 2 + 2 + 3: count "1 2, 1 2, 1 2 3". The click marks the start of each group.',
        'The hi-hat plays every eighth note. The kick and snare follow the groups.',
      ],
      tips: [
        'Don\'t try to feel it as 4/4 with a missing note. Feel the three groups: short, short, long.',
        'Say the count out loud the first few times through.',
      ],
    }, SEVEN),
    {
      id: 'l5-five', kind: 'lesson', title: 'Groove in 5/4', desc: 'Five beats per bar, felt as 3 + 2.',
      bpm: 90, beats: 5, sub: 2, accents: [0, 3], repeat: 4,
      parts: { hh: rep('x', 10), bd: 'x-----x---', sn: '----x---x-' },
      intro: [
        'A bar of 5/4 has five beats. Feel it as 3 + 2: "1 2 3, 4 5". The louder clicks mark beats 1 and 4.',
      ],
      tips: [
        'The kick marks the start of each group, on beats 1 and 4.',
        'Keep the 8th-note hi-hat going and let the snare fall on 3 and 5.',
      ],
    },
    {
      id: 'l5-double-kick', kind: 'lesson', title: 'Double kick 16ths', desc: 'Continuous 16th notes with both feet.',
      bpm: 80, sub: 4, repeat: 4,
      parts: { rd: 'x---x---x---x---', sn: '----x-------x---', bd: rep('x', 16) },
      intro: [
        'Play 16th notes on the kick with alternating feet, using a double pedal (or two kick drums). Your hands keep quarter notes on the ride and a backbeat on the snare.',
        'Keyboard players: alternate Space and B.',
      ],
      tips: [
        'Keep your ankles loose. The power comes from the ankle, not the whole leg.',
        'Start slower than you think and make every note even before speeding up.',
      ],
    },
    {
      id: 'l5-sextuplets', kind: 'lesson', title: 'Hand-hand-foot sextuplets', desc: 'A powerful fill pattern: R L K.',
      bpm: 70, sub: 6, repeat: 4,
      parts: sext2,
      stick: rep('-', 24) + '|' + rep('-', 12) + rep('RLK', 4),
      barNames: ['groove bar', 'fill bar'],
      intro: [
        'Sextuplets are six notes per beat. This fill uses the pattern right hand, left hand, kick (RLK), moving down the toms over beats 3 and 4.',
      ],
      tips: [
        'Learn RLK on the snare first, then move the hands around the toms.',
        'The kick notes make the fill sound huge. Keep them just as even as the hands.',
      ],
    },
    {
      id: 'l5-pdd', kind: 'lesson', title: 'Paradiddle-diddle', desc: 'RLRRLL in sextuplets.',
      bpm: 70, sub: 6, repeat: 4, pad: true,
      parts: { sn: rep('Xxxxxx', 4) }, stick: rep('RLRRLL', 4),
      intro: [
        'The paradiddle-diddle: two singles then two doubles, R L RR LL. It fits perfectly into six notes per beat and always starts on the right hand.',
      ],
      tips: [
        'This rudiment sounds great split between a tom and the snare, or the hi-hat and the snare.',
        'Keep the doubles even with the singles.',
      ],
    },
    {
      id: 'l5-blast', kind: 'lesson', title: 'Speed: the skank beat', desc: 'Fast alternating kick and snare 16ths.',
      bpm: 100, sub: 4, repeat: 4,
      parts: { rd: rep('x-', 8), sn: rep('-x', 8), bd: rep('x-', 8) },
      intro: [
        'A fast punk and metal beat. The kick and cymbal play together on every 8th note, and the snare plays on each 16th between them.',
      ],
      tips: [
        'Stay loose. Tension is the enemy of speed.',
        'Use the tempo slider: start at 60% and add 5% each time you get two stars.',
      ],
    },
    Object.assign({
      id: 's5-odd', kind: 'song', title: 'Odd Signals', desc: 'A moody prog tune in 7/8.', style: 'Prog',
      bpm: 110,
      countLabels: ['1', '2', '3', '4', '5', '6', '7'],
      intro: [
        'The whole song is in 7/8, grouped 2 + 2 + 3. The verse uses the hi-hat groove from the 7/8 lesson; the chorus moves to the ride with a busier kick.',
      ],
      tips: [
        'Learn the 7/8 lesson first.',
        'The fills use the last group of three, beats 5 to 7.',
      ],
      sections: [
        { name: 'Intro', bars: 2, chords: 'Dm', bass: 'x---x---x-x-x-', parts: { hh: 'x-x-x-x-x-x-x-', bd: 'x---x---x-----' } },
        {
          name: 'Verse', bars: 8, chords: 'Dm C Bb A', bass: 'x---x---x-x-x-',
          parts: SEVEN_GROOVE,
          fill: { hh: 'x-x-x-x-------', sn: '----x---xxxxxx', bd: 'x-------------' },
        },
        {
          name: 'Chorus', bars: 8, chords: 'Bb C Dm Dm', bass: 'x-x-----x-x---',
          parts: { rd: 'x-x-x-x-x-x-x-', sn: '----x-------x-', bd: 'x-x-----x-x---' },
          first: { cr: 'x-------------', rd: '--x-x-x-x-x-x-', sn: '----x-------x-', bd: 'x-x-----x-x---' },
          fill: { rd: 'x-x-x-x-------', sn: '----x---xx----', t2: '----------xx--', ft: '------------xx', bd: 'x-------------' },
        },
        {
          name: 'Outro', bars: 2, chords: 'Dm', bass: 'x---x---x-x-x-',
          parts: SEVEN_GROOVE,
          first: { cr: 'x-------------', hh: '--x-x-x-x-x-x-', sn: '----x-------x-', bd: 'x-------x-----' },
          fill: { cr: 'x-------------', bd: 'x-------------' },
        },
      ],
    }, SEVEN),
    {
      id: 's5-iron', kind: 'song', title: 'Iron Thunder', desc: 'Metal: a skank-beat verse and a double-kick chorus.', style: 'Metal',
      bpm: 120, sub: 4,
      intro: [
        'Heavy and fast. The verse is a driving skank beat in 8th notes; the chorus brings in 16th-note double kick under crash cymbals.',
      ],
      tips: [
        'Practice the double-kick lesson first and build up speed slowly.',
        'Slow the song to 70% and add speed in 5% steps.',
      ],
      sections: [
        {
          name: 'Intro', bars: 4, chords: 'E5 G5 F#5 E5', bass: 'x-x-x-x-x-x-x-x-',
          parts: { cr: 'x-------x-------', sn: '----x-------x---', bd: 'x-x-x-x-x-x-x-x-' },
        },
        {
          name: 'Verse', bars: 8, sub: 2, chords: 'E5 E5 G5 F#5', bass: 'x-x-x-x-',
          parts: { hh: 'xxxxxxxx', sn: '-x-x-x-x', bd: 'x-x-x-x-' },
          fill: { hh: 'xxxx----', sn: '-x-xxxxx', bd: 'x-x-----' },
        },
        {
          name: 'Chorus', bars: 8, chords: 'E5 G5 F#5 E5', bass: 'x-x-x-x-x-x-x-x-',
          parts: { cr: 'x-------x-------', sn: '----x-------x---', bd: rep('x', 16) },
          fill: { sn: 'xxxx------------', t1: '----xxxx--------', t2: '--------xxxx----', ft: '------------xxxx', bd: 'x---------------' },
        },
        {
          name: 'Outro', bars: 2, chords: 'E5', bass: 'x-x-x-x-x-x-x-x-',
          parts: { cr: 'x-------x-------', sn: '----x-------x---', bd: rep('x', 16) },
          fill: { cr: 'x---------------', bd: 'x---------------' },
        },
      ],
    },
  ];

  // ---------------- Level 6 ----------------
  const G3 = (() => {
    const sn = [], bd = [], acc = [];
    for (let i = 0; i < 48; i++) {
      if (i % 3 === 2) bd.push(i); else if (i % 3 === 0) acc.push(i); else sn.push(i);
    }
    const a = new Array(48).fill('-');
    sn.forEach(i => { a[i] = 'x'; });
    acc.forEach(i => { a[i] = 'X'; });
    return { sn: a.join(''), bd: at(48, bd) };
  })();
  const L6 = [
    {
      id: 'l6-poly', kind: 'lesson', title: 'Three over four', desc: 'A polyrhythm: hands play three, feet play four.',
      bpm: 70, sub: 12, repeat: 4,
      parts: { sn: at(48, [0, 16, 32]), bd: at(48, [0, 12, 24, 36]) },
      stick: at(48, [0, 16, 32], 'R'),
      intro: [
        'A polyrhythm plays two different pulses at once. Your kick plays four even notes per bar (with the click) while the snare plays three even notes across the same bar.',
        'Both start together on beat 1, then drift apart and meet again at the next bar.',
      ],
      tips: [
        'Say "pass the gol-den but-ter" evenly. The snare plays on "pass", "gol" and "but"; the kick plays on "pass", "the", "den" and "ter".',
        'Learn each pulse alone against the click first.',
      ],
    },
    {
      id: 'l6-displaced', kind: 'lesson', title: 'Displaced backbeat', desc: 'Move the snare off 2 and 4 and keep your balance.',
      bpm: 85, sub: 4, repeat: 4,
      parts: { hh: rep('x-', 8), sn: '------x------x--', bd: 'x-------x-x-----' },
      intro: [
        'The snare moves off its usual home on 2 and 4: to the "&" of 2 and the "e" of 4. This makes the groove feel like it\'s tripping forward, on purpose.',
      ],
      tips: [
        'Keep the hi-hat dead steady. It\'s your anchor while everything else moves.',
        'Count every 16th out loud the first few times.',
      ],
    },
    {
      id: 'l6-groups3', kind: 'lesson', title: 'Groups of three', desc: 'RLK in 16ths: a three-bar cycle.',
      bpm: 75, sub: 4, repeat: 2,
      parts: G3,
      stick: rep('RLK', 16),
      intro: [
        'Play the pattern right, left, kick (RLK) in 16th notes. Because three doesn\'t divide into four, the accent lands on a different part of the beat each time. It takes three bars to come back to the start.',
        'This "over the bar line" feel is a favourite trick in rock and fusion.',
      ],
      tips: [
        'Keep counting the beat ("1 e & a") while you play the groups of three. Don\'t lose the pulse.',
        'Play the accent slightly louder so you can hear the pattern cycling.',
      ],
    },
    {
      id: 'l6-fast-fill', kind: 'lesson', title: 'Fast tom run', desc: 'A full bar of 16ths around the kit at 130 BPM.',
      bpm: 130, sub: 4, repeat: 4,
      parts: {
        cr: 'x---------------|----------------', hh: '--x-x-x-x-x-x-x-|----------------',
        sn: '----x-------x---|xxxx------------', t1: '----------------|----xxxx--------', t2: '----------------|--------xxxx----', ft: '----------------|------------xxxx',
        bd: 'x-------x-------|x---------------',
      },
      stick: rep('-', 16) + '|' + rep('RL', 8),
      barNames: ['groove bar', 'fill bar'],
      intro: [
        'A full bar of 16th notes, one beat on each drum: snare, high tom, mid tom, floor tom. Then land the crash.',
      ],
      tips: [
        'Lead with your right hand when moving to each new drum.',
        'Use the tempo slider. Build up from 70% and keep the notes even.',
      ],
    },
    {
      id: 'l6-halftime-shuffle', kind: 'lesson', title: 'Half-time shuffle', desc: 'Triplet ghost notes and a big backbeat on 3.',
      bpm: 80, sub: 3, repeat: 4,
      parts: { hh: 'x-xx-xx-xx-x', sn: '-g--g-X---g-', bd: 'x----x------' },
      intro: [
        'One of the hardest grooves to make feel good. The hi-hat plays a shuffle; ghost notes fill the gaps in the middle of each triplet; the backbeat lands only on beat 3, which gives the half-time feel.',
      ],
      tips: [
        'The ghost notes are tiny. Most of the sound is the hi-hat and the big snare on 3.',
        'Practice the hands alone, slowly, until the shuffle feels smooth.',
      ],
    },
    {
      id: 'l6-quintuplets', kind: 'lesson', title: 'Quintuplets', desc: 'Five even notes per beat.',
      bpm: 60, sub: 5, repeat: 4, pad: true,
      parts: { sn: rep('Xxxxx', 4) }, stick: rep('RL', 10),
      intro: [
        'Five even notes per beat. Because five is odd, the lead hand swaps each beat: R L R L R, then L R L R L.',
      ],
      tips: [
        'Say "un-i-ver-si-ty" for each beat, keeping all five syllables even.',
        'Accent the first note of every beat to stay locked to the click.',
      ],
    },
    {
      id: 'l6-ghost-16', kind: 'lesson', title: '16th-note ghost groove', desc: 'Ghost notes on nearly every 16th between the hi-hats.',
      bpm: 85, sub: 4, repeat: 4,
      parts: { hh: 'x-x---x-x-x---x-', sn: '-g-gXg-g-g-gXg-g', bd: 'x-------x-x-----' },
      intro: [
        'An advanced funk groove. The hi-hat and ghost notes interlock so there\'s something on almost every 16th, with big backbeats on 2 and 4.',
      ],
      tips: [
        'Make the ghost notes really small. If they\'re too loud, the groove sounds cluttered.',
        'Practice the hands without the kick until the interlocking feels natural.',
      ],
    },
    {
      id: 's6-boss', kind: 'song', title: 'Final Boss', desc: 'Everything you\'ve learned: toms, ghosts, 7/8, double kick and a half-time shuffle.', style: 'Prog metal',
      bpm: 120, sub: 4,
      intro: [
        'The final exam. Thirty-eight bars that move through tribal toms, a ghost-note verse, a 7/8 bridge, a double-kick chorus and a half-time shuffle breakdown.',
      ],
      tips: [
        'Learn each section in the matching lesson first.',
        'Play the song at 70% until you know every change, then build up.',
      ],
      sections: [
        {
          name: 'Intro', bars: 4, chords: 'Em', bass: 'x-------x-------',
          parts: { ft: rep('x-', 8), sn: '----x-------x---', bd: 'x-------x-------' },
          first: { cr: 'x---------------', ft: '--x-x-x-x-x-x-x-', sn: '----x-------x---', bd: 'x-------x-------' },
          fill: { sn: 'xxxx------------', t1: '----xxxx--------', t2: '--------xxxx----', ft: '------------xxxx', bd: 'x---------------' },
        },
        {
          name: 'Verse', bars: 8, chords: 'Em C D Em', bass: 'x-------x-x-----',
          parts: { hh: 'x-x---x-x-x---x-', sn: '-g-gXg-g-g-gXg-g', bd: 'x-------x-x-----' },
          first: { cr: 'x---------------', hh: '--x---x-x-x---x-', sn: '-g-gXg-g-g-gXg-g', bd: 'x-------x-x-----' },
          fill: { hh: 'x-x-x-x---------', sn: '----x---xxxx----', t2: '------------xx--', ft: '--------------xx', bd: 'x---------------' },
        },
        Object.assign({
          name: 'Bridge', bars: 4, chords: 'C D', bass: 'x---x---x-x-x-',
          parts: { rd: 'x-x-x-x-x-x-x-', sn: '----x-------x-', bd: 'x-------x-----' },
          first: { cr: 'x-------------', rd: '--x-x-x-x-x-x-', sn: '----x-------x-', bd: 'x-------x-----' },
          fill: { rd: 'x-x-x-x-------', sn: '----x---xx----', t2: '----------xx--', ft: '------------xx', bd: 'x-------------' },
          countLabels: ['1', '2', '3', '4', '5', '6', '7'],
        }, SEVEN),
        {
          name: 'Chorus', bars: 8, chords: 'Em C G D', bass: 'x-x-x-x-x-x-x-x-',
          parts: { cr: 'x-------x-------', sn: '----x-------x---', bd: rep('x', 16) },
          fill: { hh: 'x-x-x-x---------', sn: '----x---xx------', t1: '----------xx----', t2: '------------xx--', ft: '--------------xx', bd: 'x---------------' },
        },
        {
          name: 'Breakdown', bars: 4, sub: 3, chords: 'Em Em C B7', bass: 'x----x------',
          parts: { hh: 'x-xx-xx-xx-x', sn: '-g--g-X---g-', bd: 'x----x------' },
          first: { cr: 'x-----------', hh: '--xx-xx-xx-x', sn: '-g--g-X---g-', bd: 'x----x------' },
          fill: { hh: 'x-xx-x------', sn: '---x--xxx---', t1: '---------x--', t2: '----------x-', ft: '-----------x', bd: 'x-----------' },
        },
        {
          name: 'Final chorus', bars: 8, chords: 'Em C G D', bass: 'x-x-x-x-x-x-x-x-',
          parts: { cr: 'x-------x-------', sn: '----x-------x---', bd: rep('x', 16) },
          fill: { sn: 'xxxx------------', t1: '----xxxx--------', t2: '--------xxxx----', ft: '------------xxxx', bd: 'x---------------' },
        },
        {
          name: 'Outro', bars: 2, chords: 'Em', bass: 'x---------------',
          parts: { ft: rep('x-', 8), sn: '----x-------x---', bd: 'x-------x-------' },
          first: { cr: 'x---------------', ft: '--x-x-x-x-x-x-x-', sn: '----x-------x---', bd: 'x-------x-------' },
          fill: { cr: 'x---------------', bd: 'x---------------' },
        },
      ],
    },
  ];

  const levels = [
    { n: 1, name: 'Complete Beginner', title: 'First Beats', blurb: 'Hold the sticks, count, and play your first rock beat.', items: L1 },
    { n: 2, name: 'Beginner', title: 'Steady Grooves', blurb: 'Kick variations, crash cymbals, your first fills and the open hi-hat.', items: L2 },
    { n: 3, name: 'Intermediate', title: 'Sixteenths & Ghosts', blurb: 'Rudiments, 16th-note grooves, ghost notes and disco.', items: L3 },
    { n: 4, name: 'Advanced', title: 'Syncopation & Feel', blurb: 'Shuffles, linear grooves, syncopated kicks and jazz time.', items: L4 },
    { n: 5, name: 'Expert', title: 'Odd Times & Speed', blurb: '7/8, 5/4, double kick, sextuplets and speed.', items: L5 },
    { n: 6, name: 'Master', title: 'Mastery', blurb: 'Polyrhythms, displacement, groupings and blazing fills.', items: L6 },
  ];

  const byId = {}, all = [], lvOf = {};
  levels.forEach(lv => lv.items.forEach(it => { byId[it.id] = it; all.push(it); lvOf[it.id] = lv; }));

  // Shown once when you first open the app, to pick a starting level.
  const PLACEMENT = [
    { level: 1, text: 'I\'ve never played drums' },
    { level: 2, text: 'I can play a basic rock beat' },
    { level: 3, text: 'I\'m comfortable with 8th-note grooves and simple fills' },
    { level: 4, text: 'I can play 16th notes, ghost notes and paradiddles' },
    { level: 5, text: 'I can play shuffles, linear grooves and syncopation' },
    { level: 6, text: 'I play odd time signatures and double kick' },
  ];

  DT.Content = { levels, byId, all, levelOf: id => lvOf[id] || null, PLACEMENT };
})(typeof window !== 'undefined' ? window : globalThis);
