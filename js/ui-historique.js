import { S, save } from './store.js';
import { TYPES, detail, typeLabel } from './calc.js';
import { BLOCS } from './data.js';
import { exoById, lieuDe } from './lib.js';
import { esc, icon, dateLabel } from './util.js';
import { on, onChange, bus, toast, openSheet, reSheet, closeSheet } from './bus.js';

let open = null, draft = null;
const nomType = t => { const T = TYPES.find(x => x.id === t); return T ? `${T.nom} ${typeLabel(T)}` : t + ' min'; };
const minutes = s => Math.round(s.dureeReelleS / 60);

export function renderHistorique() {
  const tot = S.seances.reduce((t, s) => t + s.dureeReelleS, 0), mn = Math.round(tot / 60);
  let h = `<div class="hd"><h1>Historique</h1></div><div class="grid2"><div class="stat"><div class="sub">Séances</div><div class="big">${S.seances.length}</div></div><div class="stat"><div class="sub">Temps total</div><div class="big">${Math.floor(mn / 60)} h ${String(mn % 60).padStart(2, '0')}</div></div></div>`;
  if (!S.seances.length) return h + `<p class="sub mt">Aucune séance pour l'instant. Termine une séance pour la retrouver ici.</p>`;
  for (const s of [...S.seances].reverse()) {
    const o = open === s.id;
    h += `<button class="row txt" data-a="h-open" data-id="${s.id}"><span class="grow"><span class="nm">${esc(dateLabel(s.date))} · ${esc(nomType(s.type))}</span><span class="sub">${esc(s.lieu)} · ${minutes(s)} min réelles</span></span>${icon('chevron', 16)}</button>`;
    if (o) {
      const lieu = lieuDe(S, s.lieu);
      for (const b of s.blocs) for (const e of b.exercices) { if (!e.fait) continue; const x = exoById(S, e.exoId); h += `<div class="sub ind">${esc(x ? x.nom : e.exoId)}${x ? ' · ' + esc(detail(x, e, lieu)) : ''}</div>`; }
      h += `<button class="full" data-a="h-edit" data-id="${s.id}">Modifier cette séance</button>`;
    }
  }
  return h;
}
function sheetEdit() {
  const d = draft; let h = `<div class="sh"><h2>Modifier la séance</h2><button class="ib" data-a="sheet-close" aria-label="Fermer">${icon('x')}</button></div><div class="sub">${esc(dateLabel(d.date))} · ${esc(nomType(d.type))} · ${esc(d.lieu)}</div>`;
  d.blocs.forEach((b, bi) => {
    if (!b.exercices.length) return;
    h += `<div class="lbl">${esc(BLOCS.find(x => x.id === b.bloc).nom)}</div>`;
    b.exercices.forEach((e, ei) => { const x = exoById(S, e.exoId); h += `<div class="row"><input type="checkbox" class="cb" data-c="h-fait" data-b="${bi}" data-e="${ei}" aria-label="Fait"${e.fait ? ' checked' : ''}><span class="grow"><span class="nm">${esc(x ? x.nom : e.exoId)}</span><span class="sub">${x ? esc(detail(x, e, lieuDe(S, d.lieu))) : ''}</span></span><button class="ib" data-a="h-del-ex" data-b="${bi}" data-e="${ei}" aria-label="Retirer">${icon('trash')}</button></div>`; });
  });
  h += `<div class="row"><span>Durée réelle</span><div class="stp"><button data-a="h-dur" data-d="-1" aria-label="Moins">-</button><span class="val">${minutes(d)} min</span><button data-a="h-dur" data-d="1" aria-label="Plus">+</button></div></div>`;
  return h + `<button class="primary full" data-a="h-save">Enregistrer</button><button class="full ghost" data-a="h-del">Supprimer la séance</button><p class="msg warn" id="hMsg"></p>`;
}
on({
  'h-open': el => { open = open === el.dataset.id ? null : el.dataset.id; bus.refresh(); },
  'h-edit': el => { draft = JSON.parse(JSON.stringify(S.seances.find(s => s.id === el.dataset.id))); openSheet(sheetEdit); },
  'h-del-ex': el => { draft.blocs[el.dataset.b].exercices.splice(Number(el.dataset.e), 1); reSheet(); },
  'h-dur': el => { draft.dureeReelleS = Math.max(60, draft.dureeReelleS + Number(el.dataset.d) * 60); reSheet(); },
  'h-save': () => {
    if (!draft.blocs.some(b => b.exercices.some(e => e.fait))) { document.getElementById('hMsg').textContent = 'Coche au moins un exercice, ou supprime la séance.'; return; }
    const i = S.seances.findIndex(s => s.id === draft.id); S.seances[i] = draft; save(); closeSheet(); toast('Séance modifiée.'); bus.refresh();
  },
  'h-del': () => { if (!confirm('Supprimer cette séance de l\'historique ?')) return; S.seances = S.seances.filter(s => s.id !== draft.id); open = null; save(); closeSheet(); bus.refresh(); }
});
onChange({ 'h-fait': el => { draft.blocs[el.dataset.b].exercices[el.dataset.e].fait = el.checked; } });
