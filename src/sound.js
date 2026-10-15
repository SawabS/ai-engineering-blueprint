/* ================= sound (Web Audio, synthesized, no files) =================
   Soft, low, rounded sounds: wooden "tocks", bubble pops and marimba notes, all through a
   gentle low-pass so nothing is sharp or high-pitched. Every sound follows a user action. */
const SFX = (() => {
  let ctx = null, out = null, noiseBuf = null, lastTick = 0, lastTap = 0;

  function ensure() {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        ctx = new AC();
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.5;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
        out = ctx.createGain(); out.gain.value = 0.6;
        out.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function env(g, s, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(peak, s + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
  }
  function osc(f, t, dur, { type = 'sine', gain = 0.12, attack = 0.004, to = null, lp = null } = {}) {
    const c = ensure(); if (!c) return;
    const s = c.currentTime + t; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, s); if (to) o.frequency.exponentialRampToValueAtTime(to, s + dur * 0.8);
    env(g, s, gain, attack, dur);
    let n = o; if (lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp; o.connect(f2); n = f2; }
    n.connect(g); g.connect(out); o.start(s); o.stop(s + dur + 0.03);
  }
  function noise(t, dur, { gain = 0.04, freq = 600, q = 0.7, to = null, type = 'lowpass' } = {}) {
    const c = ensure(); if (!c) return;
    const s = c.currentTime + t; const src = c.createBufferSource(); src.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, s); f.Q.value = q; if (to) f.frequency.exponentialRampToValueAtTime(to, s + dur);
    const g = c.createGain(); env(g, s, gain, 0.008, dur);
    src.connect(f); f.connect(g); g.connect(out); src.start(s); src.stop(s + dur + 0.03);
  }
  // marimba-like mallet: warm fundamental, quick wooden overtone, soft knock
  function mallet(f, t = 0, dur = 0.5, gain = 0.13) {
    osc(f, t, dur, { gain, attack: 0.003 });
    osc(f * 3.98, t, 0.07, { gain: gain * 0.18, attack: 0.002 });
    osc(f * 2, t, dur * 0.35, { gain: gain * 0.12, attack: 0.003 });
  }
  // C major pentatonic, C3 to E5: warm, mid-range
  const PENTA = [130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  const note = i => PENTA[Math.max(0, Math.min(PENTA.length - 1, i))];

  const S = {
    // a soft wooden "tok": the default press
    tap() { const n = performance.now(); if (n - lastTap < 50) return; lastTap = n; osc(560, 0, 0.075, { gain: 0.22, to: 340 }); noise(0, 0.03, { gain: 0.05, freq: 1400 }); },
    // a rounder, quieter tok for switches
    toggle() { osc(470, 0, 0.065, { gain: 0.17, to: 300 }); },
    // a bubble pop for choosing an answer
    select() { osc(380, 0, 0.11, { gain: 0.22, to: 640, attack: 0.002 }); },
    // slider detent: barely there
    tick(frac = 0.5) { const n = performance.now(); if (n - lastTick < 60) return; lastTick = n; osc(320 + frac * 260, 0, 0.03, { gain: 0.07, to: 260 }); },
    // reading on: a soft page-turn breath plus a mallet note
    reveal() { noise(0, 0.15, { gain: 0.05, freq: 500, to: 1200, type: 'bandpass', q: 0.6 }); mallet(523.25, 0.02, 0.3, 0.1); },
    next() { noise(0, 0.16, { gain: 0.045, freq: 450, to: 1100, type: 'bandpass', q: 0.6 }); osc(330, 0, 0.13, { gain: 0.13, to: 440 }); },
    back() { noise(0, 0.15, { gain: 0.04, freq: 1100, to: 450, type: 'bandpass', q: 0.6 }); osc(440, 0, 0.12, { gain: 0.12, to: 330 }); },
    // correct: three warm mallet notes rising (C5 E5 G5)
    correct() { mallet(523.25, 0, 0.5, 0.16); mallet(659.25, 0.1, 0.5, 0.16); mallet(783.99, 0.2, 0.8, 0.17); },
    // not quite: a low, muffled double knock, never harsh
    wrong() { osc(294, 0, 0.15, { type: 'triangle', gain: 0.2, lp: 800 }); osc(220, 0.12, 0.26, { type: 'triangle', gain: 0.18, lp: 650, to: 196 }); },
    // the Continue button just unlocked
    unlock() { mallet(659.25, 0, 0.55, 0.12); },
    // each produced token climbs the pentatonic scale
    token(i = 0) { mallet(note(6 + (i % 7)), 0, 0.35, 0.14); },
    // a run of samples: likely tokens high, rare tokens low
    burst(ranks) { ranks.forEach((k, j) => mallet(note(12 - Math.min(7, k)), j * 0.055, 0.22, 0.08)); },
    open() { noise(0, 0.26, { gain: 0.05, freq: 350, to: 1100, type: 'bandpass', q: 0.5 }); mallet(392.0, 0.05, 0.4, 0.1); },
    close() { noise(0, 0.22, { gain: 0.045, freq: 1100, to: 350, type: 'bandpass', q: 0.5 }); },
    // a block lands on the blueprint: soft thud with a wooden knock on top
    block() { osc(150, 0, 0.22, { gain: 0.24, to: 75 }); osc(340, 0, 0.06, { gain: 0.1, to: 240 }); noise(0, 0.07, { gain: 0.05, freq: 500 }); },
    // lesson complete: rising arpeggio, the block lands, a warm chord
    complete() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => mallet(f, k * 0.11, 0.6, 0.13));
      setTimeout(() => S.block(), 470);
      [261.63, 329.63, 392.0, 523.25].forEach(f => osc(f, 0.55, 1.1, { gain: 0.05, attack: 0.05 }));
    },
    error() { osc(220, 0, 0.12, { type: 'triangle', gain: 0.12, lp: 600 }); }
  };
  return S;
})();

/* Delegated sounds for generic controls; specific moments call SFX directly. */
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button, [role="button"], .bp-n, summary');
  if (!t || t.disabled) return;
  if (t.closest('#p-foot') || t.dataset.sfx === 'none' || t.classList.contains('opt')) return;
  if (t.closest('.seg') || t.tagName === 'SUMMARY') { SFX.toggle(); return; }
  if (t.classList.contains('bp-n') || t.closest('.bp-n')) { SFX.block(); return; }
  if (t.classList.contains('cell')) { SFX.tick(0.6); return; }
  SFX.tap();
}, true);
document.addEventListener('input', e => {
  const r = e.target;
  if (r && r.type === 'range') { const min = +r.min || 0, max = +r.max || 1; SFX.tick((+r.value - min) / ((max - min) || 1)); }
}, true);
