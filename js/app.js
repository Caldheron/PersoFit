import { S, load, save } from './store.js';
import { loadBase } from './data.js';
import { icon } from './util.js';
import { actions, changes, inputs, bus, closeSheet, toast } from './bus.js';
import { renderSeance } from './ui-seance.js';
import { renderChrono } from './ui-chrono.js';
import { renderExercices } from './ui-exercices.js';
import { renderHistorique } from './ui-historique.js';
import { renderReglages, checkUpdate } from './ui-reglages.js';
import { exportJSON, importJSON } from './store.js';

const TABS = [['seance', 'Séance', renderSeance], ['chrono', 'Chrono', renderChrono], ['exercices', 'Exercices', renderExercices], ['historique', 'Historique', renderHistorique], ['reglages', 'Réglages', renderReglages]];
bus.tab = sessionStorage.getItem('fitness.tab') || 'seance';

function render() {
  const main = document.getElementById('main'), y = main.scrollTop;
  const t = TABS.find(x => x[0] === bus.tab) || TABS[0];
  main.innerHTML = t[2]();
  document.getElementById('tabs').innerHTML = TABS.map(x => `<button data-a="tab" data-t="${x[0]}" class="${x[0] === bus.tab ? 'on' : ''}"${x[0] === bus.tab ? ' aria-current="page"' : ''}>${icon(x[0], 22)}<span>${x[1]}</span></button>`).join('');
  main.scrollTop = y;
}
bus.refresh = render;
Object.assign(actions, {
  tab: el => { bus.tab = el.dataset.t; sessionStorage.setItem('fitness.tab', bus.tab); document.getElementById('main').scrollTop = 0; render(); },
  'sheet-close': () => closeSheet()
});
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && actions[el.dataset.a]) actions[el.dataset.a](el, e); });
document.addEventListener('change', e => { const f = changes[e.target.dataset.c]; if (f) f(e.target, e); });
document.addEventListener('input', e => { const f = inputs[e.target.dataset.i]; if (f) f(e.target, e); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && bus.sheet) closeSheet(); });

function showUpdate(worker) {
  const b = document.getElementById('update'); b.hidden = false;
  document.getElementById('updBtn').onclick = () => { navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); worker.postMessage('SKIP_WAITING'); };
}
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w); }); });
    checkUpdate.fn = async () => {
      try { await reg.update(); } catch (e) { return 'offline'; }
      await new Promise(r => setTimeout(r, 1500));
      return !document.getElementById('update').hidden ? 'update' : 'ok';
    };
  } catch (e) { console.warn('Service worker indisponible', e); }
}
async function boot() {
  load();
  try { await loadBase(); } catch (e) { document.getElementById('main').innerHTML = '<p class="msg warn">Impossible de charger la bibliothèque d\'exercices. Recharge la page.</p>'; return; }
  if (!S.lieux.some(l => l.nom === S.lieuActif)) S.lieuActif = S.lieux[0].nom;
  render(); registerSW();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* facultatif */ }
  window.__fit = { S, save, exportJSON, importJSON, render };
}
boot();
