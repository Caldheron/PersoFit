import { exoById } from './lib.js';
import { dureeS } from './calc.js';

export const C = { steps: [], i: 0, run: false, started: false, endTs: 0, remMs: 0, fin: false, sid: null };
let timer = null, ctx = null, lock = null, notify = () => {};
export const setNotify = f => { notify = f; };

export function buildSteps(S, c) {
  const steps = [];
  for (const b of c.blocs) {
    if (!b.exercices.length) continue;
    if (b.bloc === 'corps') { steps.push({ nom: 'Exercices de corps', sous: 'À ton rythme', bloc: 'corps', manuel: true }); continue; }
    for (const e of b.exercices) {
      const exo = exoById(S, e.exoId); if (!exo) continue;
      if (exo.intervalles && exo.mode === 'fixe') {
        const [v, f, lv, lf] = exo.intervalles, tot = Math.round(e.minutes * 60), n = Math.floor(tot / (v + f));
        if (n === 0) { steps.push({ nom: exo.nom, sous: '', bloc: b.bloc, s: tot }); continue; }
        for (let k = 1; k <= n; k++) { steps.push({ nom: exo.nom, sous: `${lv} (${k} sur ${n})`, bloc: b.bloc, s: v }); steps.push({ nom: exo.nom, sous: lf, bloc: b.bloc, s: f }); }
        const rest = tot - n * (v + f); if (rest >= 10) steps.push({ nom: exo.nom, sous: lf, bloc: b.bloc, s: rest });
      } else steps.push({ nom: exo.nom, sous: '', bloc: b.bloc, s: exo.mode === 'fixe' ? Math.round(e.minutes * 60) : dureeS(exo, e, S.reglages, false) });
    }
  }
  return steps;
}
export function init(steps, sid) {
  stop(); release();
  Object.assign(C, { steps, i: 0, run: false, started: false, endTs: 0, fin: false, sid, remMs: steps[0] && !steps[0].manuel ? steps[0].s * 1000 : 0 });
}
export const cur = () => C.steps[C.i];
export function remaining(now = Date.now()) {
  const s = cur(); if (!s || s.manuel || C.fin) return 0;
  return C.run ? Math.max(0, (C.endTs - now) / 1000) : C.remMs / 1000;
}
function beep() {
  try {
    if (!ctx) return;
    [0, 0.22].forEach(d => { const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.2; o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.15); });
  } catch (e) { /* son indisponible */ }
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* vibration indisponible */ }
}
export function signal() { beep(); }
async function acquire() { try { if ('wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) { lock = null; } }
function release() { try { if (lock) lock.release(); } catch (e) { /* rien */ } lock = null; }
function stop() { clearInterval(timer); timer = null; }
function startTimer() { stop(); timer = setInterval(tick, 250); }
export function tick() {
  if (!C.run || C.fin) { notify(); return; }
  const now = Date.now(); let changed = false;
  while (C.run && !C.fin) {
    const s = cur(); if (s.manuel || now < C.endTs) break;
    changed = true;
    if (C.i >= C.steps.length - 1) { finish(); break; }
    C.i++; const n = cur();
    if (n.manuel) break;
    C.remMs = n.s * 1000; C.endTs += n.s * 1000;
  }
  if (changed) signal();
  notify();
}
function finish() { C.fin = true; C.run = false; stop(); release(); }
export function toggle() {
  try { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { ctx = null; }
  if (C.fin) { init(C.steps, C.sid); }
  if (!C.run) {
    C.run = true; C.started = true;
    if (!cur().manuel) C.endTs = Date.now() + C.remMs;
    startTimer(); acquire();
  } else {
    if (!cur().manuel) C.remMs = Math.max(0, C.endTs - Date.now());
    C.run = false; stop(); release();
  }
  notify();
}
export function next() {
  if (C.fin) return;
  if (C.i >= C.steps.length - 1) { finish(); signal(); notify(); return; }
  C.i++; const n = cur();
  if (!n.manuel) { C.remMs = n.s * 1000; if (C.run) C.endTs = Date.now() + C.remMs; }
  if (C.started && !C.run) { /* en pause : le temps de l'étape est prêt */ }
  notify();
}
export function reset() { init(C.steps, C.sid); notify(); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); if (C.run) acquire(); } });
