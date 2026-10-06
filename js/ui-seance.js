import { S, save } from './store.js';
import { TYPES, dureeS, statutSeance, zoneMinutes, detail, typeLabel } from './calc.js';
import { BLOCS } from './data.js';
import { proposer, defaultInst, completer, candidats, totalBloc, totalSeance } from './gen.js';
import { allEx, exoById, lieuDe, estNouveau, manque, chargeActive, chargesDe, visibleProfil } from './lib.js';
import { esc, fmt, fmtMin, icon, today, uid } from './util.js';
import { on, onChange, onInput, bus, toast, openSheet, reSheet, closeSheet } from './bus.js';

let msg = { t: '', ok: false }, curUid = null, pickBloc = null, pickQ = '', pickReplace = null;
const typ = id => TYPES.find(t => t.id === id);
const profilNom = () => S.profil === 'ado' ? 'Ado' : 'Adulte';

export function creerCourante(type) {
  S.courante = { id: uid(), type, lieu: S.lieuActif, phase: 'compose', debutTs: null, blocs: proposer(S, type, S.lieuActif) };
  S.dernierType = type; msg = { t: '', ok: false }; save();
}
const instDuree = i => dureeS(exoById(S, i.exoId), i, S.reglages, estNouveau(S, i.exoId));
function trouver(u) { for (const b of S.courante.blocs) for (const e of b.exercices) if (e.uid === u) return [b, e]; return [null, null]; }
function memo(i) { S.etat[i.exoId] = { niveau: i.niveau, charge: i.charge, series: i.series, reps: i.reps, secondes: i.secondes, minutes: i.minutes, repos: i.repos }; }
export function problemes(c) {
  const T = typ(c.type), m = [], nom = id => BLOCS.find(x => x.id === id).nom;
  for (const id of ['echauffement', 'etirements']) {
    if (!T.budgets[id]) continue;
    const blk = c.blocs.find(x => x.bloc === id);
    if (!blk || !blk.exercices.length) m.push(`${nom(id)} : ajoute au moins un exercice`);
  }
  const nbExo = c.blocs.filter(b => b.bloc === 'corps' || b.bloc === 'cardio').reduce((n, b) => n + b.exercices.length, 0);
  if (!nbExo) m.push('Ajoute au moins un exercice de corps ou de cardio');
  else {
    const all = totalSeance(S, c), st = statutSeance(all, T), z = zoneMinutes(T);
    if (st.etat !== 'ok') m.push(`La séance dure ${Math.round(all / 60)} min : il en faut entre ${z.min} et ${z.max} pour une séance ${T.nom}`);
  }
  return m;
}
function nbDispo(lieu) { let n = 0; for (const b of BLOCS) n += candidats(S, b.id, lieu).length; return n; }
const barHtml = (t, bs, bad) => `<div class="bar"><i class="${bad ? 'over' : ''}" style="width:${Math.min(100, Math.round(t / bs * 100))}%"></i></div>`;

function rowsHtml(c, b, enc) {
  const lieu = lieuDe(S, c.lieu); let h = '';
  for (const e of b.exercices) {
    const exo = exoById(S, e.exoId); if (!exo) continue;
    const nv = estNouveau(S, e.exoId), mq = manque(exo, lieu);
    const sub = [exo.mode === 'fixe' ? '' : detail(exo, e, lieu), nv && exo.mode !== 'fixe' ? 'nouveau, démo incluse' : '', mq.length ? 'matériel absent ici' : ''].filter(Boolean).join(' · ');
    h += `<div class="row">`;
    if (enc) h += `<input type="checkbox" class="cb" data-c="cocher" data-u="${e.uid}" aria-label="Fait : ${esc(exo.nom)}"${e.fait ? ' checked' : ''}>`;
    h += `<button class="grow txt${e.fait ? ' done' : ''}" data-a="regler" data-u="${e.uid}"><span class="nm">${esc(exo.nom)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</button><span class="sub nw">${fmt(instDuree(e))}</span><button class="ib" data-a="retirer" data-u="${e.uid}" aria-label="Retirer ${esc(exo.nom)}">${icon('trash')}</button></div>`;
  }
  return h + `<button class="row addrow" data-a="ajouter" data-b="${b.bloc}"><span>${icon('plus', 16)} Ajouter un exercice</span>${icon('chevron', 16)}</button>`;
}
function blocSimple(c, b, enc) {
  const T = typ(c.type), meta = BLOCS.find(x => x.id === b.bloc), bud = T.budgets[b.bloc], t = totalBloc(S, b), vide = !b.exercices.length;
  return `<section class="bloc" data-bloc="${b.bloc}"><div class="bh"><span class="bt">${esc(meta.nom)}</span><span class="bm ${vide ? 'warn' : ''}">${Math.round(t / 60)} / ${bud} min</span></div><div class="sub">${meta.service}</div>${barHtml(t, bud * 60, vide)}${rowsHtml(c, b, enc)}${vide ? `<div class="warnrow"><span>Ajoute au moins un exercice</span><button data-a="completer" data-b="${b.bloc}">Compléter</button></div>` : ''}</section>`;
}
function sectionExercices(c, enc) {
  const T = typ(c.type), corps = c.blocs.find(b => b.bloc === 'corps'), cardio = c.blocs.find(b => b.bloc === 'cardio');
  const tc = corps ? totalBloc(S, corps) : 0, td = cardio ? totalBloc(S, cardio) : 0, bud = T.budgets.corps + T.budgets.cardio;
  const st = statutSeance(totalSeance(S, c), T), bad = st.etat !== 'ok';
  let h = `<div class="bloc exo-head"><div class="bh"><span class="bt">Exercices</span><span class="bm ${bad ? 'warn' : ''}">${Math.round((tc + td) / 60)} / ${bud} min</span></div><div class="sub">Corps ${Math.round(tc / 60)} min · cardio ${Math.round(td / 60)} min : répartition libre</div>${barHtml(tc + td, bud * 60, bad)}`;
  if (st.etat === 'bas') h += `<div class="warnrow"><span>Il reste ${st.manqueMin} min pour atteindre la durée de la séance</span><button data-a="completer" data-b="exercices">Compléter</button></div>`;
  if (st.etat === 'haut') h += `<div class="warnrow"><span>Dépasse de ${st.depasseMin} min : retire un exercice</span></div>`;
  h += `</div>`;
  for (const b of [corps, cardio]) {
    if (!b) continue;
    const meta = BLOCS.find(x => x.id === b.bloc);
    h += `<section class="bloc sub" data-bloc="${b.bloc}"><div class="bh"><span class="bt">${esc(meta.nom)}</span><span class="bm">${Math.round(totalBloc(S, b) / 60)} min</span></div><div class="sub">${meta.service}</div>${rowsHtml(c, b, enc)}</section>`;
  }
  return h;
}

export function renderSeance() {
  if (!S.courante) creerCourante(S.dernierType || 70);
  const c = S.courante, T = typ(c.type), lieu = lieuDe(S, c.lieu), enc = c.phase === 'encours';
  const all = totalSeance(S, c), st = statutSeance(all, T), bad = st.etat !== 'ok', z = zoneMinutes(T);
  let h = `<div class="hd"><h1>${enc ? 'Séance en cours' : 'Nouvelle séance'}</h1><span class="sub">${icon('user', 14)} ${profilNom()}</span></div>`;
  if (!enc) {
    h += `<div class="lbl">Type de séance</div><div class="grid2">${TYPES.map(t => `<button class="tile${t.id === c.type ? ' on' : ''}" data-a="type" data-t="${t.id}"><span class="tt">${t.nom} · ${typeLabel(t)}</span><span class="ts">${t.note}</span></button>`).join('')}</div>`;
    h += `<div class="sub mt">Lieu : <strong>${esc(c.lieu)}</strong> · ${nbDispo(lieu)} exercices disponibles (le lieu se change dans l'onglet Exercices)</div>`;
    if (c.lieu !== S.lieuActif && S.lieux.some(l => l.nom === S.lieuActif)) h += `<div class="warnrow note"><span>Le lieu actif est maintenant « ${esc(S.lieuActif)} ».</span><button data-a="recomposer">Recomposer pour ${esc(S.lieuActif)}</button></div>`;
  } else h += `<div class="sub">${T.nom} · ${typeLabel(T)} · ${esc(c.lieu)}</div>`;
  if (lieu.equipement.includes('halteres') && !chargesDe(lieu, 'halteres').length) h += `<div class="note">Renseigne tes charges d'haltères dans Réglages, Lieux et équipement, pour que l'app propose des poids.</div>`;
  if (c.type === 15) h += `<div class="note">Séance sans échauffement : fais la première série de chaque exercice à charge légère.</div>`;
  if (enc) { let dn = 0, nn = 0; c.blocs.forEach(b => b.exercices.forEach(e => { nn++; if (e.fait) dn++; })); h += `<div class="sub mt">${dn} sur ${nn} exercices faits</div>`; }
  h += `<div class="tot"><span class="sub">Durée prévue (zone ${z.min} à ${z.max} min)</span><span class="big ${bad ? 'warn' : ''}">${Math.round(all / 60)} / ${T.id} min</span></div>${barHtml(all, T.id * 60, bad)}`;
  if (!enc) h += `<div class="sub mt">Séance proposée par l'application, modifiable.</div>`;
  for (const id of ['echauffement']) { const b = c.blocs.find(x => x.bloc === id); if (b) h += blocSimple(c, b, enc); }
  h += sectionExercices(c, enc);
  { const b = c.blocs.find(x => x.bloc === 'etirements'); if (b) h += blocSimple(c, b, enc); }
  if (!enc) h += `<button class="primary full" id="go" data-a="demarrer">Démarrer la séance</button>`;
  else h += `<button class="primary full" id="fin" data-a="terminer">Terminer la séance</button><button class="full ghost" data-a="abandonner">Abandonner la séance</button>`;
  h += `<p class="msg ${msg.ok ? 'okc' : 'warn'}" id="msgSeance">${esc(msg.t)}</p>`;
  return h;
}

/* Feuille de réglage d'un exercice */
const CFG = { series: ['Séries', 1, 1, 8], reps: ['Répétitions', 1, 1, 50], secondes: ['Secondes', 5, 5, 300], repos: ['Repos (s)', 15, 0, 300] };
function stepper(l, k, v, disp) {
  return `<div class="row"><span>${l}</span><div class="stp"><button data-a="step" data-k="${k}" data-d="-1" aria-label="Moins : ${l}">-</button><span class="val">${disp ?? v}</span><button data-a="step" data-k="${k}" data-d="1" aria-label="Plus : ${l}">+</button></div></div>`;
}
function sheetRegler() {
  const [, i] = trouver(curUid); if (!i) return '';
  const exo = exoById(S, i.exoId), lieu = lieuDe(S, S.courante.lieu), nv = estNouveau(S, i.exoId);
  let h = `<div class="sh"><h2>${esc(exo.nom)}</h2><button class="ib" data-a="sheet-close" aria-label="Fermer">${icon('x')}</button></div><div class="sub">${esc(exo.muscles.join(', '))}</div>`;
  const lv = exo.niveaux.length > 1, ch = chargeActive(exo, lieu), list = ch ? chargesDe(lieu, exo.chargeAvec) : [];
  if (lv) h += `<div class="lbl">Niveau ${i.niveau + 1} sur ${exo.niveaux.length}</div><div class="nm">${esc(exo.niveaux[i.niveau])}</div>`;
  if (lv || list.length) h += `<div class="grid2 mt"><button data-a="niveau" data-d="1">${icon('up', 16)} Trop facile</button><button data-a="niveau" data-d="-1">${icon('down', 16)} Trop dur</button></div>`;
  if (exo.mode === 'reps') h += stepper('Séries', 'series', i.series) + stepper('Répétitions', 'reps', i.reps);
  if (exo.mode === 'chrono') h += stepper('Séries', 'series', i.series) + stepper('Secondes', 'secondes', i.secondes);
  if (exo.mode === 'fixe') h += stepper('Durée', 'minutes', i.minutes, fmtMin(i.minutes));
  if (ch) h += stepper('Charge (kg)', 'charge', i.charge, i.charge == null ? '-' : String(i.charge).replace('.', ',')) + (list.length ? '' : `<div class="sub">Aucune charge définie pour ce lieu : réglage libre. Ajoute tes charges dans Réglages.</div>`);
  if (exo.mode !== 'fixe') h += stepper('Repos (s)', 'repos', i.repos ?? S.reglages.repos);
  h += `<div class="row"><span class="sub">Durée estimée</span><span class="big">${fmt(instDuree(i))}</span></div>`;
  if (nv && exo.mode !== 'fixe') h += `<div class="sub">Exercice nouveau pour ce profil : ${fmt(S.reglages.demo)} de démonstration incluses.</div>`;
  if (exo.description) h += `<p class="desc">${esc(exo.description)}</p>`;
  return h + `<button class="full" data-a="remplacer">Remplacer cet exercice</button><button class="primary full" data-a="sheet-close">Terminé</button>`;
}
function stepCharge(exo, i, lieu, d) {
  const l = chargesDe(lieu, exo.chargeAvec);
  if (!l.length) { i.charge = Math.max(0, (i.charge || 0) + d); return; }
  const c = i.charge; if (c == null) { i.charge = l[0]; return; }
  let k = l.indexOf(c);
  if (k < 0) { k = d > 0 ? l.findIndex(x => x > c) : l.map(x => x < c).lastIndexOf(true); if (k < 0) k = d > 0 ? l.length - 1 : 0; } else k = Math.max(0, Math.min(l.length - 1, k + d));
  i.charge = l[k];
}
function apres() { memo(trouver(curUid)[1]); save(); bus.refresh(); reSheet(); }

/* Feuille d'ajout et de remplacement */
function pickRow(e, lieu) {
  const i = defaultInst(S, e, lieu);
  return `<button class="row txt" data-a="pick" data-e="${e.id}"><span class="grow"><span class="nm">${esc(e.nom)}</span><span class="sub">${esc(detail(e, i, lieu))}</span></span><span class="sub nw">${fmt(dureeS(e, i, S.reglages, estNouveau(S, e.id)))}</span></button>`;
}
function pickList() {
  const c = S.courante, lieu = lieuDe(S, c.lieu), blk = c.blocs.find(b => b.bloc === pickBloc), present = new Set(blk.exercices.map(x => x.exoId));
  const q = pickQ.trim().toLowerCase(), ref = pickReplace ? exoById(S, (trouver(pickReplace)[1] || {}).exoId) : null;
  const l = candidats(S, pickBloc, lieu).filter(e => !present.has(e.id) && (!q || e.nom.toLowerCase().includes(q)));
  if (!l.length) return `<div class="sub pad">Aucun exercice disponible.</div>`;
  if (!ref) return l.map(e => pickRow(e, lieu)).join('');
  const meme = l.filter(e => ref.famille && e.famille === ref.famille), reste = l.filter(e => !meme.includes(e));
  const proche = reste.filter(e => e.muscles.some(m => ref.muscles.includes(m))), autres = reste.filter(e => !proche.includes(e));
  const grp = (t, a) => a.length ? `<div class="lbl">${t}</div>` + a.map(e => pickRow(e, lieu)).join('') : '';
  return grp('Variantes du même exercice', meme) + grp('Exercices proches', proche) + grp('Autres exercices', autres);
}
function sheetPick() {
  const m = BLOCS.find(b => b.id === pickBloc), ref = pickReplace ? exoById(S, (trouver(pickReplace)[1] || {}).exoId) : null;
  return `<div class="sh"><h2>${ref ? 'Remplacer : ' + esc(ref.nom) : 'Ajouter : ' + esc(m.nom)}</h2><button class="ib" data-a="sheet-close" aria-label="Fermer">${icon('x')}</button></div><input type="text" id="pickQ" data-i="pick-q" placeholder="Rechercher" value="${esc(pickQ)}"><div id="pickList">${pickList()}</div>`;
}

on({
  type: el => { creerCourante(Number(el.dataset.t)); bus.refresh(); },
  recomposer: () => { creerCourante(S.courante.type); bus.refresh(); },
  retirer: el => { const [b, e] = trouver(el.dataset.u); if (b) { b.exercices.splice(b.exercices.indexOf(e), 1); msg = { t: '', ok: false }; save(); bus.refresh(); } },
  regler: el => { curUid = el.dataset.u; openSheet(sheetRegler); },
  step: el => {
    const [, i] = trouver(curUid), exo = exoById(S, i.exoId), k = el.dataset.k, d = Number(el.dataset.d);
    if (k === 'charge') stepCharge(exo, i, lieuDe(S, S.courante.lieu), d);
    else if (k === 'minutes') { const st = exo.bloc === 'etirements' ? 0.5 : 1; i.minutes = Math.max(st, Math.min(120, i.minutes + d * st)); }
    else { const c = CFG[k]; i[k] = Math.max(c[2], Math.min(c[3], (i[k] ?? S.reglages.repos) + d * c[1])); }
    apres();
  },
  niveau: el => {
    const [, i] = trouver(curUid), exo = exoById(S, i.exoId), d = Number(el.dataset.d);
    i.niveau = Math.max(0, Math.min(exo.niveaux.length - 1, i.niveau + d));
    const lieu = lieuDe(S, S.courante.lieu);
    if (chargeActive(exo, lieu) && chargesDe(lieu, exo.chargeAvec).length) stepCharge(exo, i, lieu, d);
    apres();
  },
  completer: el => {
    const r = completer(S, S.courante, el.dataset.b);
    if (!r) { toast('Aucun exercice disponible pour compléter.'); return; }
    S.courante.blocs.find(b => b.bloc === r.bloc).exercices.push(r.inst); save(); bus.refresh();
  },
  ajouter: el => { pickBloc = el.dataset.b; pickQ = ''; pickReplace = null; openSheet(sheetPick); },
  remplacer: () => { const [b] = trouver(curUid); pickBloc = b.bloc; pickQ = ''; pickReplace = curUid; openSheet(sheetPick); },
  pick: el => {
    const exo = exoById(S, el.dataset.e), lieu = lieuDe(S, S.courante.lieu), blk = S.courante.blocs.find(b => b.bloc === pickBloc);
    const nouveau = { uid: uid(), exoId: exo.id, ...defaultInst(S, exo, lieu), fait: false };
    if (pickReplace) { const [, e] = trouver(pickReplace), k = blk.exercices.indexOf(e); if (k >= 0) blk.exercices[k] = nouveau; else blk.exercices.push(nouveau); pickReplace = null; } else blk.exercices.push(nouveau);
    save(); closeSheet(); bus.refresh();
  },
  demarrer: () => {
    const m = problemes(S.courante);
    if (m.length) { msg = { t: m.join('. ') + '.', ok: false }; bus.refresh(); return; }
    S.courante.phase = 'encours'; S.courante.debutTs = Date.now(); msg = { t: '', ok: false }; save(); bus.refresh();
  },
  terminer: () => {
    const c = S.courante; let faits = 0;
    c.blocs.forEach(b => b.exercices.forEach(e => { if (e.fait) faits++; }));
    if (!faits) { msg = { t: 'Coche au moins un exercice avant de terminer.', ok: false }; bus.refresh(); return; }
    const blocs = c.blocs.map(b => ({ bloc: b.bloc, exercices: b.exercices.map(e => ({ exoId: e.exoId, series: e.series, reps: e.reps, secondes: e.secondes, minutes: e.minutes, charge: e.charge, niveau: e.niveau, repos: e.repos, dureeS: instDuree(e), fait: !!e.fait })) }));
    let prevue = 0; c.blocs.forEach(b => { prevue += totalBloc(S, b); });
    c.blocs.forEach(b => b.exercices.forEach(e => { if (e.fait) memo(e); }));
    S.seances.push({ id: today() + '-' + uid(), date: today(), type: c.type, lieu: c.lieu, dureePrevueS: prevue, dureeReelleS: Math.max(60, Math.round((Date.now() - c.debutTs) / 1000)), blocs });
    S.courante = null; msg = { t: '', ok: false }; save(); toast('Séance enregistrée dans l\'historique.'); bus.refresh();
  },
  abandonner: () => { if (confirm('Abandonner la séance en cours ? Rien ne sera enregistré.')) { S.courante = null; save(); bus.refresh(); } },
  pick_dummy: () => {}
});
onChange({ cocher: el => { const [, e] = trouver(el.dataset.u); if (e) { e.fait = el.checked; msg = { t: '', ok: false }; save(); bus.refresh(); } } });
onInput({ 'pick-q': el => { pickQ = el.value; document.getElementById('pickList').innerHTML = pickList(); } });
