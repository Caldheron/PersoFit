import { S, save } from './store.js';
import { detail } from './calc.js';
import { BLOCS } from './data.js';
import { allEx, exoById, lieuDe, manque, equipNom, catalogue, visibleProfil, derniere, medianNiveau } from './lib.js';
import { defaultInst } from './gen.js';
import { creerCourante } from './ui-seance.js';
import { esc, icon, uid, dateLabel, fmtMin } from './util.js';
import { on, onChange, onInput, bus, toast, openSheet, reSheet, closeSheet } from './bus.js';

const X = { q: '', f: 'tous', only: true, fiche: null };
let F = null;
const nomBloc = id => (BLOCS.find(b => b.id === id) || {}).nom;

function listHtml() {
  const lieu = lieuDe(S, S.lieuActif), q = X.q.trim().toLowerCase();
  const l = allEx(S).filter(e => visibleProfil(S, e) && (X.f === 'tous' || e.bloc === X.f) && (!q || e.nom.toLowerCase().includes(q)) && (!X.only || !manque(e, lieu).length));
  if (!l.length) return `<div class="sub pad">Aucun exercice ne correspond.</div>`;
  return l.map(e => {
    const mq = manque(e, lieu);
    return `<div class="row${mq.length ? ' dim' : ''}"><button class="grow txt" data-a="fiche" data-e="${e.id}"><span class="nm">${esc(e.nom)}</span><span class="sub">${esc(nomBloc(e.bloc))} · ${esc(e.muscles.join(', '))}</span>${mq.length ? `<span class="sub warn">Il te faut : ${esc(mq.map(m => equipNom(S, m)).join(', '))}</span>` : ''}</button>${mq.length ? `<button data-a="jai" data-e="${e.id}">Je l'ai</button>` : icon('chevron', 16)}</div>`;
  }).join('');
}
function renderListe() {
  const lieu = lieuDe(S, S.lieuActif);
  return `<div class="hd"><h1>Exercices</h1></div><input type="text" id="exQ" data-i="ex-q" placeholder="Rechercher un exercice" value="${esc(X.q)}"><div class="chips">${[['tous', 'Tous']].concat(BLOCS.map(b => [b.id, b.nom])).map(c => `<button class="chip${X.f === c[0] ? ' on' : ''}" data-a="ex-f" data-f="${c[0]}">${esc(c[1])}</button>`).join('')}</div>
<label class="chk"><input type="checkbox" data-c="ex-only"${X.only ? ' checked' : ''}> Seulement ce que je peux faire ici (${esc(lieu.nom)})</label><div id="exList">${listHtml()}</div>
<button class="row addrow" data-a="ex-new"><span>${icon('plus', 16)} Créer mon exercice</span>${icon('chevron', 16)}</button>`;
}
function renderFiche() {
  const e = exoById(S, X.fiche); if (!e) { X.fiche = null; return renderListe(); }
  const lieu = lieuDe(S, S.lieuActif), mq = manque(e, lieu), lv = S.etat[e.id]?.niveau ?? medianNiveau(e), d = derniere(S, e.id);
  let h = `<button class="ib back" data-a="fiche-retour">${icon('back', 16)} Retour</button><h1>${esc(e.nom)}</h1><div class="sub">${esc(nomBloc(e.bloc))} · ${esc(e.muscles.join(', '))} · Matériel : ${e.materiel.length ? esc(e.materiel.map(m => equipNom(S, m)).join(', ')) : 'aucun'}</div>`;
  if (mq.length) h += `<div class="warnrow"><span>Il te faut : ${esc(mq.map(m => equipNom(S, m)).join(', '))}</span><button data-a="jai" data-e="${e.id}">Je l'ai</button></div>`;
  if (e.description) h += `<p class="desc">${esc(e.description)}</p>`;
  if (e.niveaux.length > 1) h += `<div class="lbl">Niveau du profil ${S.profil === 'ado' ? 'Ado' : 'Adulte'} (touche pour changer)</div>` + e.niveaux.map((n, i) => `<button class="row txt lvl${i === lv ? ' sel' : ''}" data-a="fiche-niveau" data-n="${i}"><span>${i + 1}. ${esc(n)}</span>${i === lv ? icon('check', 16) : ''}</button>`).join('');
  h += `<div class="row"><span class="sub">Dernière fois</span><span>${d ? esc(detail(e, d.inst, lieu) + ' · ' + dateLabel(d.date)) : 'Jamais fait'}</span></div>`;
  h += `<button class="primary full" data-a="fiche-ajouter">Ajouter à la séance du jour</button>`;
  if (e.perso) h += `<div class="grid2"><button data-a="ex-edit" data-e="${e.id}">Modifier</button><button data-a="ex-del" data-e="${e.id}">Supprimer</button></div>`;
  return h;
}
export const renderExercices = () => X.fiche ? renderFiche() : renderListe();

/* Formulaire d'exercice personnalisé */
function formHtml() {
  const f = F, corps = f.bloc === 'corps';
  const num = (l, k, st = 1) => `<div class="row"><label for="f-${k}">${l}</label><input type="number" id="f-${k}" data-i="f-${k}" min="1" step="${st}" value="${f[k]}" class="num"></div>`;
  let h = `<div class="sh"><h2>${f.id ? 'Modifier' : 'Créer'} mon exercice</h2><button class="ib" data-a="sheet-close" aria-label="Fermer">${icon('x')}</button></div>`;
  h += `<label class="lbl" for="f-nom">Nom</label><input type="text" id="f-nom" data-i="f-nom" value="${esc(f.nom)}" placeholder="Nom de l'exercice">`;
  h += `<label class="lbl" for="f-bloc">Bloc</label><select id="f-bloc" data-c="f-bloc">${BLOCS.map(b => `<option value="${b.id}"${f.bloc === b.id ? ' selected' : ''}>${b.nom}</option>`).join('')}</select>`;
  h += `<label class="lbl" for="f-mode">Mode de durée</label><select id="f-mode" data-c="f-mode">${[['reps', 'Répétitions'], ['chrono', 'Chronométré'], ['fixe', 'Durée fixe']].filter(m => corps || m[0] === 'fixe').map(m => `<option value="${m[0]}"${f.mode === m[0] ? ' selected' : ''}>${m[1]}</option>`).join('')}</select>`;
  if (f.mode === 'reps') h += num('Séries', 'series') + num('Répétitions', 'reps');
  if (f.mode === 'chrono') h += num('Séries', 'series') + num('Secondes', 'secondes', 5);
  if (f.mode === 'fixe') h += num('Minutes', 'minutes', 0.5);
  if (f.mode === 'reps') h += `<label class="lbl" for="f-ch">Charge</label><select id="f-ch" data-c="f-ch"><option value="">Sans charge</option><option value="halteres"${f.chargeAvec === 'halteres' ? ' selected' : ''}>Haltères</option><option value="kettlebell"${f.chargeAvec === 'kettlebell' ? ' selected' : ''}>Kettlebell</option><option value="barre"${f.chargeAvec === 'barre' ? ' selected' : ''}>Barre et disques</option></select>`;
  h += `<div class="lbl">Matériel nécessaire</div>` + catalogue(S).map(m => `<label class="chk"><input type="checkbox" data-c="f-mat" data-m="${m.id}"${f.materiel.includes(m.id) ? ' checked' : ''}> ${esc(m.nom)}</label>`).join('');
  h += `<label class="lbl" for="f-desc">Description (facultative)</label><textarea id="f-desc" data-i="f-desc" rows="3">${esc(f.description)}</textarea>`;
  return h + `<button class="primary full" data-a="f-save">Enregistrer</button><p class="msg warn" id="fMsg"></p>`;
}
const nouveauForm = () => ({ id: null, nom: '', bloc: 'corps', mode: 'reps', series: 3, reps: 10, secondes: 30, minutes: 5, chargeAvec: '', materiel: [], description: '' });

on({
  'ex-f': el => { X.f = el.dataset.f; bus.refresh(); },
  fiche: el => { X.fiche = el.dataset.e; bus.refresh(); },
  'fiche-retour': () => { X.fiche = null; bus.refresh(); },
  jai: el => { const e = exoById(S, el.dataset.e), l = lieuDe(S, S.lieuActif); manque(e, l).forEach(m => l.equipement.push(m)); save(); bus.refresh(); },
  'fiche-niveau': el => { const id = X.fiche; S.etat[id] = Object.assign({}, S.etat[id], { niveau: Number(el.dataset.n) }); save(); bus.refresh(); },
  'fiche-ajouter': () => {
    const exo = exoById(S, X.fiche); if (!S.courante) creerCourante(S.dernierType || 70);
    const c = S.courante, blk = c.blocs.find(b => b.bloc === exo.bloc), lieu = lieuDe(S, c.lieu);
    if (!blk) { toast(`Cette séance n'a pas de bloc « ${nomBloc(exo.bloc)} ».`); return; }
    if (blk.exercices.some(x => x.exoId === exo.id)) { toast('Cet exercice est déjà dans la séance.'); return; }
    const mq = manque(exo, lieu); if (mq.length) { toast('Il te faut : ' + mq.map(m => equipNom(S, m)).join(', ')); return; }
    blk.exercices.push({ uid: uid(), exoId: exo.id, ...defaultInst(S, exo, lieu), fait: false }); save();
    toast(`Ajouté au bloc « ${nomBloc(exo.bloc)} ».`);
  },
  'ex-new': () => { F = nouveauForm(); openSheet(formHtml); },
  'ex-edit': el => { const e = exoById(S, el.dataset.e); F = { id: e.id, nom: e.nom, bloc: e.bloc, mode: e.mode, series: e.series ?? 3, reps: e.reps ?? 10, secondes: e.secondes ?? 30, minutes: e.minutes ?? 5, chargeAvec: e.chargeAvec || '', materiel: [...e.materiel], description: e.description || '' }; openSheet(formHtml); },
  'ex-del': el => {
    if (!confirm('Supprimer cet exercice ? Les séances déjà enregistrées sont conservées.')) return;
    S.exercicesPerso = S.exercicesPerso.filter(e => e.id !== el.dataset.e);
    if (S.courante) S.courante.blocs.forEach(b => { b.exercices = b.exercices.filter(x => x.exoId !== el.dataset.e); });
    X.fiche = null; save(); bus.refresh();
  },
  'f-save': () => {
    const f = F, msg = document.getElementById('fMsg');
    if (!f.nom.trim()) { msg.textContent = 'Donne un nom à ton exercice.'; return; }
    const num = v => Math.max(0.5, Number(v) || 1);
    const exo = { id: f.id || 'perso-' + uid(), nom: f.nom.trim(), bloc: f.bloc, muscles: [], materiel: f.materiel, mode: f.mode, niveaux: ['Standard'], adulteSeulement: false, description: f.description.trim(), perso: true };
    if (f.mode === 'reps') { exo.series = Math.round(num(f.series)); exo.reps = Math.round(num(f.reps)); if (f.chargeAvec) exo.chargeAvec = f.chargeAvec; }
    if (f.mode === 'chrono') { exo.series = Math.round(num(f.series)); exo.secondes = Math.round(num(f.secondes)); }
    if (f.mode === 'fixe') exo.minutes = num(f.minutes);
    const i = S.exercicesPerso.findIndex(e => e.id === exo.id);
    if (i >= 0) S.exercicesPerso[i] = exo; else S.exercicesPerso.push(exo);
    save(); closeSheet(); toast('Exercice enregistré.'); bus.refresh();
  }
});
onChange({
  'ex-only': el => { X.only = el.checked; bus.refresh(); },
  'f-bloc': el => { F.bloc = el.value; if (F.bloc !== 'corps') F.mode = 'fixe'; reSheet(); },
  'f-mode': el => { F.mode = el.value; reSheet(); },
  'f-ch': el => { F.chargeAvec = el.value; },
  'f-mat': el => { const m = el.dataset.m; F.materiel = F.materiel.filter(x => x !== m); if (el.checked) F.materiel.push(m); }
});
onInput({
  'ex-q': el => { X.q = el.value; document.getElementById('exList').innerHTML = listHtml(); },
  'f-nom': el => { F.nom = el.value; }, 'f-desc': el => { F.description = el.value; },
  'f-series': el => { F.series = el.value; }, 'f-reps': el => { F.reps = el.value; }, 'f-secondes': el => { F.secondes = el.value; }, 'f-minutes': el => { F.minutes = el.value; }
});
