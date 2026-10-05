import { S, save, exportJSON, importJSON } from './store.js';
import { CHARGE_EQUIP } from './data.js';
import { catalogue, equipNom } from './lib.js';
import { creerCourante } from './ui-seance.js';
import { APP_VERSION } from './version.js';
import { esc, icon, today, uid, fmt } from './util.js';
import { on, onChange, onInput, bus, toast, openSheet, closeSheet } from './bus.js';

const R = { sub: null, lieu: null, msg: '' };
let ask = null;
const CFG = { tempo: ['Temps par répétition (s)', 1, 1, 8], miseEnPlace: ['Mise en place par série (s)', 5, 0, 60], demo: ['Démo d\'un nouvel exercice (s)', 15, 0, 300], repos: ['Repos par défaut (s)', 15, 0, 180] };
export const checkUpdate = { fn: async () => 'ok' };

export function renderReglages() {
  if (R.sub === 'lieux') return renderLieux();
  const r = S.reglages, ex = 3 * (10 * r.tempo + r.miseEnPlace) + 2 * r.repos;
  let h = `<div class="hd"><h1>Réglages</h1></div><div class="lbl">Profil</div><div class="seg"><button class="${S.profil === 'adulte' ? 'on' : ''}" data-a="profil" data-p="adulte">Adulte</button><button class="${S.profil === 'ado' ? 'on' : ''}" data-a="profil" data-p="ado">Ado</button></div>`;
  h += `<div class="sub mt">${S.profil === 'adulte' ? 'Charges, niveaux et historique propres à ce téléphone.' : 'Même fonctionnement, sans les exercices réservés aux adultes et sans test de charge maximale.'}</div>`;
  h += `<div class="lbl">Calcul des durées</div>` + Object.keys(CFG).map(k => `<div class="row"><span>${CFG[k][0]}</span><div class="stp"><button data-a="reg-step" data-k="${k}" data-d="-1" aria-label="Moins : ${CFG[k][0]}">-</button><span class="val">${r[k]}</span><button data-a="reg-step" data-k="${k}" data-d="1" aria-label="Plus : ${CFG[k][0]}">+</button></div></div>`).join('');
  h += `<div class="row"><span class="sub">Exemple : 3 x 10, repos par défaut</span><span class="big">${fmt(ex)}</span></div>`;
  h += `<button class="row txt" data-a="r-lieux"><span>${icon('seance', 16)} Lieux et équipement</span>${icon('chevron', 16)}</button>`;
  h += `<div class="lbl">Données</div><div class="grid2"><button data-a="r-export">Exporter</button><button data-a="r-import">Importer</button></div><input type="file" id="fileIn" accept=".json,application/json" hidden data-c="r-file"><p class="msg" id="rMsg">${esc(R.msg)}</p>`;
  h += `<div class="row"><span>Version ${APP_VERSION}</span><button data-a="r-update">Chercher une mise à jour</button></div>`;
  h += `<p class="sub fine">Application de suivi sportif, pas un avis médical. Tes données restent sur ce téléphone. Les fiches d'exercices sont rédigées pour cette application.</p>`;
  return h;
}
const lieuEd = () => S.lieux.find(l => l.nom === R.lieu) || S.lieux[0];
function renderLieux() {
  const l = lieuEd(); R.lieu = l.nom;
  let h = `<button class="ib back" data-a="r-back">${icon('back', 16)} Réglages</button><h1>Lieux et équipement</h1><div class="chips">${S.lieux.map(x => `<button class="chip${x.nom === l.nom ? ' on' : ''}" data-a="lieu-edit" data-l="${esc(x.nom)}">${esc(x.nom)}</button>`).join('')}</div>`;
  h += `<div class="grid3"><button data-a="lieu-new">Nouveau</button><button data-a="lieu-ren">Renommer</button><button data-a="lieu-del">Supprimer</button></div>`;
  h += `<div class="lbl">Équipement de « ${esc(l.nom)} »</div><div class="sub">Le poids du corps et une chaise stable sont toujours disponibles.</div>`;
  h += catalogue(S).map(m => `<label class="chk row"><input type="checkbox" data-c="eq" data-id="${m.id}"${l.equipement.includes(m.id) ? ' checked' : ''}> ${esc(m.nom)}</label>`).join('');
  h += `<button class="row addrow" data-a="eq-add"><span>${icon('plus', 16)} Ajouter un équipement</span>${icon('chevron', 16)}</button>`;
  for (const k of CHARGE_EQUIP) {
    if (!l.equipement.includes(k)) continue;
    const list = [...(l.charges[k] || [])].sort((a, b) => a - b);
    h += `<div class="lbl">Charges disponibles : ${esc(equipNom(S, k))} (kg)</div><div>${list.length ? list.map((w, i) => `<span class="pill">${String(w).replace('.', ',')}<button class="ib" data-a="ch-del" data-k="${k}" data-i="${i}" aria-label="Retirer ${w} kg">${icon('x', 14)}</button></span>`).join('') : '<span class="sub">Aucune charge pour l\'instant.</span>'}</div>`;
    h += `<div class="addw"><input type="number" inputmode="decimal" min="0" step="0.5" id="w-${k}" placeholder="12,5" aria-label="Nouvelle charge"><button data-a="ch-add" data-k="${k}">Ajouter</button></div>`;
  }
  return h;
}
function sheetAsk() {
  return `<div class="sh"><h2>${esc(ask.titre)}</h2><button class="ib" data-a="sheet-close" aria-label="Fermer">${icon('x')}</button></div><input type="text" id="askIn" value="${esc(ask.valeur || '')}" placeholder="${esc(ask.label)}" aria-label="${esc(ask.label)}">${ask.copie ? `<label class="chk"><input type="checkbox" id="askCopy" checked> Copier l'équipement de « ${esc(R.lieu)} »</label>` : ''}<button class="primary full" data-a="ask-ok">Valider</button><p class="msg warn" id="askMsg"></p>`;
}
function demander(a) { ask = a; openSheet(sheetAsk); setTimeout(() => { const i = document.getElementById('askIn'); if (i) i.focus(); }, 50); }
function regen() { if (S.courante && S.courante.phase === 'compose') creerCourante(S.courante.type); }

on({
  profil: el => { S.profil = el.dataset.p; regen(); save(); bus.refresh(); },
  'reg-step': el => { const k = el.dataset.k, c = CFG[k]; S.reglages[k] = Math.max(c[2], Math.min(c[3], S.reglages[k] + Number(el.dataset.d) * c[1])); save(); bus.refresh(); },
  'r-lieux': () => { R.sub = 'lieux'; R.lieu = S.lieuActif; bus.refresh(); },
  'r-back': () => { R.sub = null; bus.refresh(); },
  'lieu-edit': el => { R.lieu = el.dataset.l; bus.refresh(); },
  'lieu-new': () => demander({ titre: 'Nouveau lieu', label: 'Nom du lieu', copie: true, ok: nom => { const src = lieuEd(); S.lieux.push({ nom, equipement: document.getElementById('askCopy')?.checked ? [...src.equipement] : [], charges: JSON.parse(JSON.stringify(document.getElementById('askCopy')?.checked ? src.charges : { halteres: [], kettlebell: [], barre: [] })) }); R.lieu = nom; } }),
  'lieu-ren': () => demander({ titre: 'Renommer le lieu', label: 'Nom du lieu', valeur: R.lieu, ok: nom => { const l = lieuEd(), old = l.nom; l.nom = nom; if (S.lieuActif === old) S.lieuActif = nom; if (S.courante && S.courante.lieu === old) S.courante.lieu = nom; R.lieu = nom; } }),
  'lieu-del': () => {
    if (S.lieux.length < 2) { toast('Il faut garder au moins un lieu.'); return; }
    const l = lieuEd(); if (!confirm(`Supprimer le lieu « ${l.nom} » ?`)) return;
    S.lieux = S.lieux.filter(x => x !== l); R.lieu = S.lieux[0].nom;
    if (S.lieuActif === l.nom) { S.lieuActif = S.lieux[0].nom; if (S.courante) { S.courante.lieu = S.lieuActif; regen(); } }
    save(); bus.refresh();
  },
  'eq-add': () => demander({ titre: 'Nouvel équipement', label: 'Nom de l\'équipement', ok: nom => { const id = 'perso-' + uid(); S.equipementPerso.push({ id, nom }); lieuEd().equipement.push(id); } }),
  'ask-ok': () => {
    const v = document.getElementById('askIn').value.trim(), m = document.getElementById('askMsg');
    if (!v) { m.textContent = 'Saisis un nom.'; return; }
    if (ask.titre.includes('lieu') && S.lieux.some(l => l.nom.toLowerCase() === v.toLowerCase() && l.nom !== R.lieu)) { m.textContent = 'Ce nom existe déjà.'; return; }
    ask.ok(v); save(); closeSheet(); bus.refresh();
  },
  'ch-add': el => {
    const k = el.dataset.k, inp = document.getElementById('w-' + k), v = parseFloat(String(inp.value).replace(',', '.'));
    if (!(v > 0)) { inp.classList.add('bad'); return; }
    const l = lieuEd(); l.charges[k] = l.charges[k] || []; if (!l.charges[k].includes(v)) l.charges[k].push(v); l.charges[k].sort((a, b) => a - b);
    save(); bus.refresh();
  },
  'ch-del': el => { lieuEd().charges[el.dataset.k].splice(Number(el.dataset.i) , 1); save(); bus.refresh(); },
  'r-export': async () => {
    const name = `fitness-${S.profil}-${today()}.json`, blob = new Blob([exportJSON()], { type: 'application/json' });
    try {
      const f = new File([blob], name, { type: 'application/json' });
      if (matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); R.msg = 'Fichier partagé : ' + name; bus.refresh(); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    R.msg = 'Fichier prêt : ' + name; bus.refresh();
  },
  'r-import': () => document.getElementById('fileIn').click(),
  'r-update': async () => { toast('Recherche en cours…'); const r = await checkUpdate.fn(); toast(r === 'update' ? 'Une nouvelle version est disponible.' : r === 'offline' ? 'Impossible de vérifier sans connexion.' : 'Tu as la dernière version.'); }
});
onChange({
  eq: el => { const l = lieuEd(), id = el.dataset.id; l.equipement = l.equipement.filter(x => x !== id); if (el.checked) l.equipement.push(id); save(); bus.refresh(); },
  'r-file': async el => {
    const f = el.files[0]; el.value = ''; if (!f) return;
    if (!confirm('Remplacer toutes les données de ce téléphone par celles du fichier ? Une sauvegarde automatique est conservée.')) return;
    const r = importJSON(await f.text());
    R.msg = r.ok ? 'Import réussi.' : 'Import refusé : ' + r.error; if (r.ok) toast('Import réussi.'); bus.refresh();
  }
});
