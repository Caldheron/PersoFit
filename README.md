# Fitness : application de séances (version 1.0.0)

PWA personnelle de composition et de suivi de séances, utilisable sur téléphone, hors connexion.
JavaScript classique (modules ES), sans framework, sans dépendance, sans étape de compilation.
Conçue d'après le document de gel v1 (zone de validité 75 à 125 %).

## Mettre en ligne (GitHub Pages)
1. Déposer le contenu de ce dossier à la racine du dépôt (ou d'un sous-dossier).
2. Activer GitHub Pages sur la branche du dépôt.
3. Ouvrir l'adresse sur le téléphone, puis « Ajouter à l'écran d'accueil ».

Le dépôt est public : il ne contient que du contenu générique. Les données personnelles restent dans le navigateur du téléphone (clé `fitness.v1`).

## Premier lancement
- Réglages, Profil : choisir Adulte ou Ado (un téléphone = un profil).
- Réglages, Lieux et équipement : renseigner les **charges d'haltères** de chaque lieu. Sans elles, l'app ne propose pas de poids (« charge à régler »).
- La séance de départ se compose dans l'onglet Séance.

## Fichiers
- `index.html`, `css/style.css`, `manifest.webmanifest`, `sw.js`, `icons/`
- `data/exercices.json` : bibliothèque de départ (59 exercices, descriptions rédigées pour l'app)
- `js/` : `store` (données, export, import), `calc` (budgets, durées, validité), `gen` (séance proposée, Compléter), `chrono`, `ui-*` (écrans), `app` (démarrage, mise à jour)

## Ajouter ou modifier des exercices de base
Éditer `data/exercices.json` (champs : `id`, `nom`, `bloc`, `muscles`, `materiel`, `mode` = `reps`, `chrono` ou `fixe`, `niveaux`, `adulteSeulement`, `chargeAvec`, `intervalles`, `description`). Dans l'app, « Créer mon exercice » ajoute des exercices personnels, modifiables et supprimables.

## Publier une mise à jour
1. Changer `VERSION` dans `sw.js` (par exemple `fitness-1.0.1`) et `APP_VERSION` dans `js/version.js`.
2. Si un fichier est ajouté, l'ajouter à la liste `FILES` de `sw.js`.
3. Déposer sur GitHub. Sur le téléphone, le bandeau « Nouvelle version disponible » apparaît ; **les données ne sont jamais effacées** par une mise à jour.

## Sauvegarde
Réglages, Données : **Exporter** (fichier JSON) et **Importer** (le fichier est vérifié avant tout remplacement, et une copie de sauvegarde automatique est conservée).

## Choix d'implémentation à connaître
- La démo d'un exercice nouveau (+1 min 30 par défaut) s'applique aux exercices en répétitions ou chronométrés, pas aux blocs à durée fixe (échauffement, cardio, étirements).
- Chrono : l'étape « Exercices de corps » est une étape libre, sans compte à rebours. Le chrono attend votre « Étape suivante » avant d'enchaîner sur le cardio.
- La séance proposée vise au moins 90 % du budget de chaque bloc (jamais plus de 110 %), pour laisser de la marge dans la zone 75 à 125 %.
- Historique : les exercices non cochés sont conservés dans la séance enregistrée, afin de pouvoir les cocher en cas d'erreur. Ils ne comptent ni dans les totaux ni dans « nouveau ».
- Les exercices de la bibliothèque de base ne sont pas modifiables ; ceux que tu crées le sont.
- Un nouvel exercice démarre au niveau médian et à la charge la plus légère du lieu.

## Limites connues
- Vibration indisponible sur iPhone (le bip fonctionne après le premier appui sur Démarrer).
- L'écran reste allumé pendant le chrono si le navigateur gère l'API Wake Lock.
- Testé dans Chromium headless (48 vérifications de bout en bout et 6 sur le service worker) ; pas encore essayé sur un vrai téléphone.

## Mentions
Application de suivi sportif, pas un avis médical. Les fiches d'exercices sont rédigées pour cette application ; aucune image ni aucun texte tiers n'est reproduit.
