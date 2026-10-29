# 🥁 Drum Coach

A drum teacher that listens while you play. It tells you which hits were early, late or missed, explains how to fix them, and moves you from complete beginner to master through 6 levels of lessons and songs.

**Play it now:** https://drum-coach-9a46fb3c.netlify.app (also on GitHub Pages: https://vanstadencallum-sys.github.io/drum-coach/)

Works on a computer or a phone, with:

| Kit | How Drum Coach hears it |
|---|---|
| Keyboard / on-screen pads | Key presses or taps |
| Practice pad | The microphone, grading your timing and evenness |
| Acoustic kit | The microphone, after you teach it what each drum sounds like |
| Electronic kit | USB-MIDI, so every hit is read exactly |

USB drums work in Chrome or Edge on a computer, and in Chrome on Android with a USB-OTG adapter. iPhones and iPads can't read USB drums in any browser, so use the microphone there.

Every lesson and song also has a short YouTube video by a real drum teacher (Drumeo and others) that teaches the same thing, and the **Videos** page lists them all by level, with a few to watch before you start. Videos load only when you press play.

## On the live site

Everything runs in your browser. What the microphone hears is never sent anywhere, and your progress is saved in that browser on that device. Run the timing check in Setup on each device you play on, and use wired headphones, since Bluetooth adds a delay that throws off your scores.

## On your own computer

Needs [Python 3](https://www.python.org/downloads/).

- **start.bat** runs Drum Coach at http://localhost:8765.
- **phone.bat** does the same and also makes a private https link for your phone, shown as a QR code on the Setup page. Progress is saved on the computer, so it's shared between the computer and your phone. The first run downloads Cloudflare's free `cloudflared` tool into `tools/`.

On a Mac or Linux, run `python3 server.py` or `python3 server.py --phone` instead.

## Checks

```
node tests/run.js
```
