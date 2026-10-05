import { fmtMin } from './util.js';
export const TYPES = [
  { id: 15, nom: 'Mini', note: 'Corps et cardio seulement', budgets: { echauffement: 0, corps: 9, cardio: 6, etirements: 0 } },
  { id: 35, nom: 'Courte', note: 'Les 4 blocs', budgets: { echauffement: 5, corps: 17, cardio: 8, etirements: 5 } },
  { id: 70, nom: 'Longue', note: 'Les 4 blocs', budgets: { echauffement: 10, corps: 30, cardio: 25, etirements: 5 } },
  { id: 120, nom: 'Maxi', note: '2 heures, les 4 blocs', budgets: { echauffement: 10, corps: 55, cardio: 40, etirements: 15 } }
];
export const ZONE = { min: 0.75, max: 1.25 };
export const GEN = { cible: 0.9, max: 1.1 };
export const typeLabel = t => t.id === 120 ? '2 h' : t.id + ' min';
export function dureeS(exo, inst, reg, nouveau) {
  if (exo.mode === 'fixe') return Math.round(inst.minutes * 60);
  const w = exo.mode === 'chrono' ? inst.secondes : inst.reps * reg.tempo;
  const rest = inst.repos ?? reg.repos;
  return Math.round(inst.series * (w + reg.miseEnPlace) + (inst.series - 1) * rest + (nouveau ? reg.demo : 0));
}
export function statut(totS, budMin) {
  const bs = budMin * 60, pct = totS / bs;
  const etat = pct < ZONE.min ? 'bas' : pct > ZONE.max ? 'haut' : 'ok';
  return { pct, etat, manqueMin: Math.max(1, Math.round((bs - totS) / 60)), depasseMin: Math.max(1, Math.round((totS - bs) / 60)) };
}
export function detail(exo, i, lieu) {
  const p = [];
  if (exo.mode === 'reps') p.push(`${i.series} x ${i.reps}`);
  else if (exo.mode === 'chrono') p.push(`${i.series} x ${i.secondes} s`);
  else p.push(fmtMin(i.minutes));
  if (exo.chargeAvec) {
    if (i.charge != null) p.push(`${String(i.charge).replace('.', ',')} kg`);
    else if (lieu && lieu.equipement.includes(exo.chargeAvec)) p.push('charge à régler');
  }
  if (exo.niveaux.length > 1) p.push(`niveau ${i.niveau + 1}/${exo.niveaux.length}`);
  return p.join(' · ');
}
