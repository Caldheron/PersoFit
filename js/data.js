export const BLOCS = [
  { id: 'echauffement', nom: 'Échauffement', service: 'Entrée' },
  { id: 'corps', nom: 'Exercices de corps', service: 'Plat 1' },
  { id: 'cardio', nom: 'Cardio', service: 'Plat 2' },
  { id: 'etirements', nom: 'Étirements', service: 'Dessert' }
];
export const EQUIP = [['halteres', 'Haltères'], ['barre', 'Barre et disques'], ['tractions', 'Barre de tractions'], ['banc', 'Banc'], ['kettlebell', 'Kettlebell'], ['elastiques', 'Élastiques'], ['corde', 'Corde à sauter'], ['velo', 'Vélo'], ['rameur', 'Rameur'], ['tapis', 'Tapis de course'], ['machines', 'Machines guidées']];
export const CHARGE_EQUIP = ['halteres', 'kettlebell', 'barre'];
export const EX = [];
export async function loadBase() {
  const r = await fetch('./data/exercices.json');
  const j = await r.json();
  EX.length = 0; EX.push(...j.exercices);
  return EX;
}
