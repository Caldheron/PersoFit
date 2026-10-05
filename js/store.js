export const VERSION = 1;
const KEY = 'fitness.v1', BKEY = 'fitness.v1.backup';
export const S = {};
export function defaultState() {
  const ch = () => ({ halteres: [], kettlebell: [], barre: [] });
  return {
    schemaVersion: VERSION, profil: 'adulte',
    reglages: { tempo: 3, miseEnPlace: 20, demo: 90, repos: 60 },
    lieux: [
      { nom: 'Maison', equipement: ['halteres', 'barre', 'tractions', 'corde', 'velo', 'rameur'], charges: ch() },
      { nom: 'Salle', equipement: ['halteres', 'barre', 'tractions', 'banc', 'kettlebell', 'velo', 'rameur', 'tapis', 'machines'], charges: ch() },
      { nom: 'Vacances', equipement: ['corde', 'elastiques'], charges: ch() }
    ],
    lieuActif: 'Maison', equipementPerso: [], exercicesPerso: [], etat: {}, seances: [], dernierType: 70, courante: null
  };
}
export function replaceState(o) { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, o); }
export function migrate(o) {
  const d = defaultState();
  if (!o || typeof o !== 'object') return d;
  const m = Object.assign(d, o);
  m.reglages = Object.assign(defaultState().reglages, o.reglages || {});
  m.lieux.forEach(l => { l.charges = Object.assign({ halteres: [], kettlebell: [], barre: [] }, l.charges || {}); });
  m.schemaVersion = VERSION;
  return m;
}
export function load() {
  let st;
  try { const raw = localStorage.getItem(KEY); st = raw ? migrate(JSON.parse(raw)) : defaultState(); } catch (e) { st = defaultState(); }
  replaceState(st);
  return S;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('Sauvegarde impossible', e); } }
export function exportJSON() { const { courante, ...rest } = S; return JSON.stringify(rest, null, 1); }
export function validate(o) {
  const isArr = Array.isArray, isObj = x => x && typeof x === 'object' && !isArr(x);
  if (!isObj(o)) return 'Le fichier ne contient pas de données valides.';
  if (typeof o.schemaVersion !== 'number') return 'Version de données absente.';
  if (o.schemaVersion > VERSION) return 'Ce fichier vient d\'une version plus récente de l\'application.';
  if (!['adulte', 'ado'].includes(o.profil)) return 'Profil inconnu.';
  if (!isObj(o.reglages) || ['tempo', 'miseEnPlace', 'demo', 'repos'].some(k => typeof o.reglages[k] !== 'number')) return 'Réglages invalides.';
  if (!isArr(o.lieux) || !o.lieux.length || o.lieux.some(l => !isObj(l) || typeof l.nom !== 'string' || !isArr(l.equipement))) return 'Lieux invalides.';
  if (typeof o.lieuActif !== 'string' || !o.lieux.some(l => l.nom === o.lieuActif)) return 'Lieu actif introuvable.';
  if (!isArr(o.seances) || o.seances.some(s => !isObj(s) || typeof s.date !== 'string' || !isArr(s.blocs) || s.blocs.some(b => !isArr(b.exercices)))) return 'Historique invalide.';
  if (!isObj(o.etat)) return 'Niveaux invalides.';
  if (!isArr(o.exercicesPerso) || !isArr(o.equipementPerso)) return 'Exercices ou équipement personnalisés invalides.';
  return null;
}
export function importJSON(text) {
  let o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'Fichier illisible.' }; }
  const err = validate(o); if (err) return { ok: false, error: err };
  try { localStorage.setItem(BKEY, localStorage.getItem(KEY) || ''); } catch (e) { /* sauvegarde best effort */ }
  const m = migrate(o); m.courante = null;
  replaceState(m); save();
  return { ok: true };
}
