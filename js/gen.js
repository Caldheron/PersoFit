import { BLOCS } from './data.js';
import { TYPES, GEN, dureeS } from './calc.js';
import { allEx, lieuDe, manque, visibleProfil, chargeActive, chargesDe, medianNiveau, estNouveau } from './lib.js';
import { uid } from './util.js';

export function defaultInst(S, exo, lieu) {
  const e = S.etat[exo.id] || {};
  const i = {
    series: e.series ?? exo.series ?? 3, reps: e.reps ?? exo.reps, secondes: e.secondes ?? exo.secondes, minutes: e.minutes ?? exo.minutes,
    repos: e.repos ?? S.reglages.repos, charge: null, niveau: Math.min(e.niveau ?? medianNiveau(exo), exo.niveaux.length - 1)
  };
  if (chargeActive(exo, lieu)) {
    if (e.charge != null) i.charge = e.charge;
    else { const l = chargesDe(lieu, exo.chargeAvec); i.charge = l.length ? l[0] : null; }
  }
  return i;
}
export function candidats(S, blocId, lieu) {
  const last = {};
  for (const s of S.seances) for (const b of s.blocs) for (const e of b.exercices) if (e.fait && (!last[e.exoId] || s.date > last[e.exoId])) last[e.exoId] = s.date;
  return allEx(S).filter(e => e.bloc === blocId && !manque(e, lieu).length && visibleProfil(S, e))
    .map((e, i) => ({ e, i, d: last[e.id] || '' })).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : a.i - b.i).map(x => x.e);
}
const totalBloc = (S, b) => b.exercices.reduce((t, x) => { const e = allEx(S).find(y => y.id === x.exoId); return e ? t + dureeS(e, x, S.reglages, estNouveau(S, x.exoId)) : t; }, 0);
export { totalBloc };
export function proposer(S, typeId, lieuNom) {
  const T = TYPES.find(t => t.id === typeId), lieu = lieuDe(S, lieuNom), blocs = [];
  for (const b of BLOCS) {
    const bud = T.budgets[b.id]; if (!bud) continue;
    const bs = bud * 60, list = [], fams = new Set(); let t = 0;
    for (const exo of candidats(S, b.id, lieu)) {
      if (t >= bs * GEN.cible) break;
      if (exo.famille && fams.has(exo.famille)) continue;
      const inst = defaultInst(S, exo, lieu); const nv = estNouveau(S, exo.id);
      let d = dureeS(exo, inst, S.reglages, nv);
      if (t + d > bs * GEN.max) {
        if (exo.mode !== 'fixe') continue;
        const m = Math.round(((bs - t) / 60) * 2) / 2; if (m < 1) continue;
        inst.minutes = m; d = dureeS(exo, inst, S.reglages, nv);
        if (t + d > bs * GEN.max) continue;
      }
      list.push({ uid: uid(), exoId: exo.id, ...inst, fait: false }); t += d;
      if (exo.famille) fams.add(exo.famille);
    }
    t = grow(S, list, bs, t);
    blocs.push({ bloc: b.id, exercices: list });
  }
  return blocs;
}
function grow(S, list, bs, t) {
  const dur = i => dureeS(allEx(S).find(e => e.id === i.exoId), i, S.reglages, estNouveau(S, i.exoId));
  for (let guard = 0; guard < 60 && t < bs * GEN.cible; guard++) {
    let moved = false;
    for (const inst of list) {
      const exo = allEx(S).find(e => e.id === inst.exoId), before = dur(inst), keep = { s: inst.series, m: inst.minutes };
      if (exo.mode === 'fixe') inst.minutes += exo.bloc === 'etirements' ? 0.5 : 1;
      else if (inst.series < 5) inst.series++;
      else continue;
      const after = dur(inst);
      if (t - before + after > bs * GEN.max) { inst.series = keep.s; inst.minutes = keep.m; continue; }
      t += after - before; moved = true;
      if (t >= bs * GEN.cible) break;
    }
    if (!moved) break;
  }
  return t;
}
export const totalSeance = (S, c) => c.blocs.reduce((t, b) => t + totalBloc(S, b), 0);
export function completer(S, c, cible) {
  const T = TYPES.find(t => t.id === c.type), lieu = lieuDe(S, c.lieu), tot = totalSeance(S, c);
  const sum = id => { const b = c.blocs.find(x => x.bloc === id); return b ? totalBloc(S, b) : 0; };
  const ordre = cible === 'exercices' ? (sum('cardio') > sum('corps') ? ['cardio', 'corps'] : ['corps', 'cardio']) : [cible];
  for (const id of ordre) {
    const blk = c.blocs.find(b => b.bloc === id); if (!blk) continue;
    const vide = id === 'echauffement' || id === 'etirements';
    const missing = vide ? T.budgets[id] * 60 : T.id * 60 - tot; if (missing <= 0) continue;
    const present = new Set(blk.exercices.map(x => x.exoId));
    const fams = new Set(blk.exercices.map(x => (allEx(S).find(e => e.id === x.exoId) || {}).famille).filter(Boolean));
    let best = null;
    for (const exo of candidats(S, id, lieu)) {
      if (present.has(exo.id) || (exo.famille && fams.has(exo.famille))) continue;
      const inst = defaultInst(S, exo, lieu), nv = estNouveau(S, exo.id);
      if (exo.mode === 'fixe' && !vide) inst.minutes = Math.max(1, Math.round((missing / 60) * 2) / 2);
      const d = dureeS(exo, inst, S.reglages, nv);
      if (!vide && tot + d > T.id * 60 * GEN.max) continue;
      const gap = Math.abs(missing - d);
      if (!best || gap < best.gap) best = { gap, inst: { uid: uid(), exoId: exo.id, ...inst, fait: false } };
    }
    if (best) return { bloc: id, inst: best.inst };
  }
  return null;
}
