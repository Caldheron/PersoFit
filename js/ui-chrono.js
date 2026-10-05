import { S } from './store.js';
import { C, buildSteps, init, cur, remaining, toggle, next, reset, setNotify } from './chrono.js';
import { BLOCS } from './data.js';
import { esc, fmt, clock } from './util.js';
import { on, bus } from './bus.js';

const key = () => `${C.i}|${C.fin}|${C.run}|${C.started}`;
export function renderChrono() {
  const c = S.courante;
  if (!c) return `<div class="hd"><h1>Chrono</h1></div><p class="sub">Aucune séance en préparation. Ouvre l'onglet Séance pour en composer une.</p>`;
  if (C.sid !== c.id || !C.started) init(buildSteps(S, c), c.id);
  if (!C.steps.length) return `<div class="hd"><h1>Chrono</h1></div><p class="sub">La séance du jour ne contient aucune étape à chronométrer.</p>`;
  const s = cur(), n = C.steps.length;
  let h = `<div class="hd"><h1>Chrono</h1><span class="sub">Étapes de la séance du jour</span></div>`;
  if (C.fin) {
    h += `<div class="clkbox"><div class="sub">Terminé</div><div class="clk" id="clk" data-k="${key()}">00:00</div><div class="nm">Toutes les étapes sont faites</div></div><button class="primary full" data-a="chrono-toggle">Recommencer</button>`;
  } else {
    const meta = BLOCS.find(b => b.id === s.bloc);
    h += `<div class="clkbox"><div class="sub">${esc(meta.nom)} · étape ${C.i + 1} sur ${n}</div><div class="clk" id="clk" data-k="${key()}">${s.manuel ? 'Libre' : clock(remaining())}</div><div class="nm">${esc(s.nom)}</div><div class="sub">${esc(s.sous || '')}</div></div>`;
    h += `<div class="bar"><i id="clkbar" style="width:${s.manuel ? 0 : Math.round((1 - remaining() / s.s) * 100)}%"></i></div>`;
    if (s.manuel) h += `<p class="sub mt">Fais tes exercices de corps, puis passe à l'étape suivante. Le chrono attend.</p><button class="primary full" data-a="chrono-next">Étape suivante</button>`;
    else h += `<div class="grid2 mt"><button class="primary" data-a="chrono-toggle">${C.run ? 'Pause' : C.started ? 'Reprendre' : 'Démarrer'}</button><button data-a="chrono-next">Étape suivante</button></div>`;
    const sui = C.steps.slice(C.i + 1, C.i + 4);
    if (sui.length) h += `<div class="lbl">À suivre</div>` + sui.map(x => `<div class="row"><span class="grow"><span class="nm">${esc(x.nom)}</span><span class="sub">${esc(x.sous || '')}</span></span><span class="sub nw">${x.manuel ? 'à ton rythme' : fmt(x.s)}</span></div>`).join('');
  }
  h += `<button class="full ghost" data-a="chrono-reset">Revenir au début</button><p class="sub">Un bip signale chaque changement d'étape. L'écran reste allumé pendant le chrono quand le navigateur le permet.</p>`;
  return h;
}
setNotify(() => {
  if (bus.tab !== 'chrono') return;
  const el = document.getElementById('clk');
  if (!el || el.dataset.k !== key()) { bus.refresh(); return; }
  const s = cur();
  if (!C.fin && !s.manuel) {
    el.textContent = clock(remaining());
    const b = document.getElementById('clkbar'); if (b) b.style.width = Math.round((1 - remaining() / s.s) * 100) + '%';
  }
});
on({ 'chrono-toggle': () => { toggle(); bus.refresh(); }, 'chrono-next': () => { next(); bus.refresh(); }, 'chrono-reset': () => { reset(); bus.refresh(); } });
