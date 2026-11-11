# PhysioPlay V0.1

Bouger · Jouer · Progresser. Prototype de jeu de cibles avec caméra frontale, sans serveur applicatif.

## Architecture

- React + TypeScript + Vite : interface responsive en français.
- MediaPipe Pose Landmarker Lite : une personne, mode VIDEO, calcul local sur CPU pour privilégier la compatibilité. L'inférence synchrone reste sur le fil principal dans cette V0.1 : mesurer la fluidité sur chaque appareil avant utilisation.
- Vidéo et Canvas 2D : même repère normalisé, image et poignets en miroir, sans recadrage. Les points 15 et 16 représentent les poignets, pas les doigts.
- `src/game.ts` : géométrie, calibration et génération des cibles ; tests indépendants de la caméra.
- `src/App.tsx` : acquisition vidéo, cycle de séance et affichage. États : préparation, calibration, jeu, pause, bilan.
- `scripts/prepare-assets.mjs` : copie le moteur WASM du paquet épinglé et télécharge le modèle officiel version 1 au premier lancement/build. Les fichiers sont servis depuis le site, pas depuis un CDN pendant une séance.
- PWA : manifeste et service worker générés au build, cache de l'interface, du moteur et du modèle. Aucune mise à jour forcée pendant une séance. Fermer puis rouvrir l'application pour appliquer une version en attente.
- GitHub Actions : tests, construction et publication statique sur GitHub Pages. Chemins relatifs compatibles avec `/physioplay/`.

## Premier lancement local

Node.js 22 recommandé.

```sh
npm ci
npm test
npm run dev
```

Ouvrir l'adresse locale indiquée. La caméra fonctionne sur `localhost` ou en HTTPS. Ouvrir une adresse HTTP du Mac depuis un iPad ne suffit pas pour autoriser la caméra : utiliser GitHub Pages en HTTPS pour le test iPad.

```sh
npm run build
npm run preview
```

Le service worker et le hors connexion se vérifient sur la version construite, pas sur le serveur de développement. Le premier chargement doit être connecté ; le stockage peut être évincé par le navigateur. Ne pas promettre un accès hors connexion permanent.

## Jouer

1. Fixer l'appareil, cadrer le haut du corps et les mains ; une seule personne dans le cadre.
2. Choisir mode, main anatomique (gauche/droite du patient), durée et taille.
3. Autoriser puis activer la caméra. Aucune permission microphone demandée.
4. Calibrer : balayer lentement l'espace confortable pendant huit secondes de suivi valide. La zone observée est réduite de 12 % par bord. Un suivi insuffisant est rejeté. Recalibrer après déplacement, changement de main ou rotation.
5. Commencer. Thérapeutique : contact du poignet pendant 250 ms, sans délai par cible. Réactivité : contact pendant 80 ms avant expiration du délai réglé.
6. Le chronomètre de séance continue même si les mains sélectionnées sortent du cadre. Seul le délai de cible est suspendu pendant la perte de suivi. La durée est mesurée en temps réel, indépendamment de la cadence vidéo. Le bouton Pause suspend explicitement la séance. Masquer l'application déclenche une pause explicite. Arrêter la caméra libère ses pistes.

La calibration est une enveloppe rectangulaire en deux dimensions ; elle ne garantit pas que chaque position soit atteignable, et ne mesure ni angle, ni compensation, ni amplitude clinique. Régler la séance avec le thérapeute. Le temps moyen affiché est le temps d'atteinte des cibles réussies, incluant le maintien demandé ; ce n'est pas un temps de réaction clinique.

La démonstration utilise un pointeur/doigt, une zone prédéfinie et aucun suivi corporel. Elle permet de vérifier l'interface et les règles.

## Confidentialité

Aucune vidéo enregistrée ou transmise. Images et coordonnées restent en mémoire dans le navigateur. Aucun compte, analytics, cookie applicatif, base patient, stockage des scores ou export automatique. Les résultats disparaissent au rechargement. Le cache PWA stocke seulement les fichiers de l'application et du modèle. L'hébergeur reçoit les requêtes ordinaires nécessaires au chargement des fichiers, avec les métadonnées réseau habituelles ; le premier build télécharge le modèle depuis Google. Le code n'envoie pas les images au modèle distant.

## Publication sur le compte sebrbo

1. Créer le dépôt `physioplay` sur le compte **sebrbo**. Un dépôt public convient à GitHub Pages gratuit ; ne pas ajouter de données patient.
2. Mettre les fichiers de ce dossier à la racine du dépôt, y compris `package-lock.json` et `.github/workflows/deploy.yml`. Ne pas envoyer `node_modules`, `dist` ou `public/mediapipe` : le build prépare les ressources.
3. Dans **Settings → Pages → Source**, sélectionner **GitHub Actions**.
4. Envoyer sur la branche `main` (ou lancer le workflow manuellement). Suivre l'exécution jusqu'à succès.
5. Vérifier l'adresse retournée par le déploiement. Adresse attendue pour ce nom de dépôt : `https://sebrbo.github.io/physioplay/` ; elle n'est valide qu'après publication réussie.
6. iPad : ouvrir dans Safari, puis Partager → Sur l'écran d'accueil. Tester d'abord en ligne puis en mode avion après mise en cache complète.

## Recette avant utilisation

- iPad Pro 11 pouces 4e génération, Safari : permission, refus puis nouvel essai, portrait/paysage, vraie main gauche/droite, calibration et collision dans les coins.
- Android Chrome, Mac Safari/Chrome et Windows Edge/Chrome : caméra et fluidité. Ces compatibilités restent à valider sur appareils physiques.
- Vérifier la pause lorsque les mains disparaissent, en changeant d'onglet et en verrouillant l'appareil ; vérifier l'extinction de la caméra après arrêt.
- Vérifier modes 30/60/90/120 s, expirations, bilan, nouvelle séance, retour préparation, cibles de chaque taille.
- PWA : installation, rechargement sans réseau, démarrage du modèle sans réseau, mise à jour après fermeture/réouverture.
- Contrôler qu'aucune requête ne contient d'image ou de coordonnée.

## Limites V0.1

Prototype à évaluer, sans validation clinique ni mesure goniométrique. Une cible numérotée à la fois ; pas encore de séquence multicible, cibles rouges d'inhibition, progression automatique, historique patient ou connexion professionnelle. Pas de garantie de performance avant essais sur appareils réels. Le moteur synchrone pourra être déplacé dans un Worker après mesure des performances.

Références : [MediaPipe Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js), [Vite et GitHub Pages](https://vite.dev/guide/static-deploy#github-pages).
