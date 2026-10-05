import { EX, EQUIP } from './data.js';
export const allEx = S => EX.concat(S.exercicesPerso);
export const exoById = (S, id) => allEx(S).find(e => e.id === id);
export const lieuDe = (S, nom) => S.lieux.find(l => l.nom === nom) || S.lieux[0];
export const equipNom = (S, id) => (EQUIP.find(e => e[0] === id) || [])[1] || (S.equipementPerso.find(e => e.id === id) || {}).nom || id;
export const catalogue = S => EQUIP.map(e => ({ id: e[0], nom: e[1] })).concat(S.equipementPerso);
export const manque = (exo, lieu) => exo.materiel.filter(m => !lieu.equipement.includes(m));
export const visibleProfil = (S, exo) => !(S.profil === 'ado' && exo.adulteSeulement);
export const chargeActive = (exo, lieu) => !!(exo.chargeAvec && lieu.equipement.includes(exo.chargeAvec));
export const chargesDe = (lieu, k) => [...((lieu.charges || {})[k] || [])].sort((a, b) => a - b);
export const medianNiveau = exo => Math.floor(exo.niveaux.length / 2);
export const estNouveau = (S, id) => !S.seances.some(s => s.blocs.some(b => b.exercices.some(e => e.exoId === id && e.fait)));
export function derniere(S, id) {
  let best = null;
  for (const s of S.seances) for (const b of s.blocs) for (const e of b.exercices) if (e.exoId === id && e.fait && (!best || s.date >= best.date)) best = { date: s.date, inst: e };
  return best;
}
