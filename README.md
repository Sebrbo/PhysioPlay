# PhysioPlay V0.1.5

Bouger · Jouer · Progresser. Prototype de jeu de cibles avec caméra frontale, sans serveur applicatif.

## Architecture

- React + TypeScript + Vite : interface responsive en français.
- MediaPipe Hand Landmarker : deux mains au maximum, mode VIDEO, calcul local sur CPU ; inférence plafonnée à 20 Hz pour privilégier la réactivité de l’affichage. Le jeu de cibles utilise le modèle dédié aux mains ; les futurs jeux corporels pourront réintroduire Pose. L'inférence synchrone reste sur le fil principal dans cette V0.1 : mesurer la fluidité sur chaque appareil avant utilisation.
- Vidéo et Canvas 2D : même repère normalisé, image et paumes en miroir. Affichage sans recadrage pendant la préparation ; recadrage cover partagé entre vidéo et cibles en plein écran. Le contact est le centre des cinq repères de paume 0, 5, 9, 13 et 17, pas le seul poignet.
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
5. Commencer. Thérapeutique : contact de la paume pendant 250 ms, sans délai par cible. Réactivité : contact pendant 80 ms avant expiration du délai réglé.
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
5. Vérifier l'adresse retournée par le déploiement. Adresse attendue pour ce nom de dépôt : `https://sebrbo.github.io/PhysioPlay/` ; elle n'est valide qu'après publication réussie.
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

Références : [MediaPipe Hands Web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js), [Vite et GitHub Pages](https://vite.dev/guide/static-deploy#github-pages).

## Mise à jour 0.1.2 — espace de jeu

- Bouton « Plein écran » dans la barre de jeu : utilise le plein écran natif quand disponible, sinon occupe toute la fenêtre. Quitter par le bouton ou Échap. Sur iPad, l'affichage exact et le masquage des barres Safari restent à vérifier ; le lancement depuis l'écran d'accueil est également à tester.
- Les réglages restent dans la préparation ; les compteurs, Pause et Terminer restent visibles en plein écran.
- La vidéo conserve ses proportions, avec des bandes si nécessaire : aucun étirement ni recadrage. Le Canvas et les pointeurs utilisent le même rectangle d'image en mode normal et plein écran.
- Largeur et hauteur des cibles réglables séparément de 50 à 150 % de la zone calibrée. À 100 %, la calibration reste la référence. L'agrandissement dépasse volontairement cette enveloppe ; le thérapeute doit vérifier le confort et l'accessibilité des mouvements.
- Les réglages sont verrouillés pendant la séance. Un bouton rétablit 100 %. La zone en pointillés montre les limites des centres de cibles ; une marge conserve les cercles entiers dans l'image.

## Suite proposée, non implémentée

1. Affiner le suivi des mains et le confort de jeu : point d'interaction main/poignet, filtrage, retour de validation et compte à rebours.
2. Ajouter des séquences de plusieurs cibles numérotées et le jeu vert/rouge pour coordination et inhibition.
3. Ajouter des réglages de maintien et des zones de travail ciblées, avec des profils de séance.
4. Enrichir le bilan et proposer un export volontaire des résultats sans vidéo, après définition des données utiles.

## Mise à jour 0.1.3 — préparation et affichage compact

- Largeur et hauteur de zone à 150 % par défaut au lancement. Le bouton « Zone calibrée · 100 % » reste disponible.
- Chaque nouvelle séance et chaque « Rejouer » commence par cinq secondes de préparation. Les cibles et le chronomètre de séance commencent seulement après le décompte. Le bouton plein écran reste disponible pendant le départ ; celui-ci peut être annulé.
- Une interruption de visibilité pendant le départ l'annule ; un changement d'orientation demande de recalibrer. Le temps de préparation ne consomme pas la durée choisie.
- Un bouton Réglages ouvre un dialogue avec trois onglets : Séance, Zone des cibles, À propos. Il est verrouillé pendant calibration, départ, jeu ou pause. Pour modifier après une pause, revenir à la préparation.
- L'écran principal occupe la hauteur disponible (dvh), sans défilement de page : caméra et Canvas se redimensionnent ensemble dans l'espace restant. Les réglages, instructions longues et informations de confidentialité sont dans le dialogue. Un défilement interne de secours reste possible dans le dialogue sur une fenêtre exceptionnellement petite ou à fort zoom, pour préserver l'accès aux réglages.
- Vérification visuelle et géométrique aux dimensions 1194×834, 834×1194, 390×640 et 844×390 dans le navigateur de test. La caméra réelle et les barres Safari doivent être vérifiées sur l'appareil.

## Mise à jour 0.1.4 — vidéo immersive

- En plein écran, suppression des barres de titre, de préparation, de statistiques et de statut. La vidéo et son Canvas occupent toute la surface.
- Vidéo en mode cover : conserve ses proportions et recadre les bords pour éviter les bandes. Le repère des poignets, des cibles et du pointeur de démonstration suit exactement ce même recadrage.
- Seuls le chrono et le nombre de cibles sont incrustés, avec deux boutons flottants pendant le jeu : Pause et Retour. Le temps moyen reste au bilan final.
- Retour arrête la séance en cours et ramène à la préparation en gardant la caméra active. Revenir à la préparation depuis la pause ou le bilan quitte aussi le plein écran.
- Le cadre de zone est masqué pendant le jeu immersif. Les cibles restent dans la portion visible du flux, hors de la bande de commandes du haut. Le décompte de cinq secondes et les commandes de préparation restent disponibles avant le jeu.
- La perte de suivi affiche une petite indication discrète, sans masquer l'image sous un panneau opaque. Le système d'exploitation peut conserver ses propres indicateurs caméra et sa barre de statut.

## Mise à jour 0.1.5 — départ automatique et mains

- Cliquer sur Commencer ou Rejouer déclenche immédiatement le mode immersif et demande le plein écran natif dans le geste utilisateur, puis lance le décompte de cinq secondes. Si le navigateur refuse le plein écran natif, l'affichage immersif dans toute la fenêtre reste actif.
- La calibration reste au format de préparation. Si elle est demandée depuis le plein écran, elle revient d'abord à ce format.
- PhysioTargets charge désormais le modèle Hand Landmarker officiel version 1 (21 repères par main) à la place de Pose. La vidéo reste traitée en mémoire sur l'appareil, sans enregistrement ni envoi.
- Centre de paume : moyenne du poignet et des bases des quatre doigts (0, 5, 9, 13, 17). Les doigts sont détectés mais le jeu ne demande pas un geste de pince ou un contact précis du bout d'un doigt.
- Sélection gauche/droite sur la vidéo non inversée, puis miroir seulement pour l'affichage. Classification peu fiable rejetée, doublons de côté éliminés. Léger lissage par main ; aucune interpolation après disparition ou grand déplacement.
- Inférence limitée à 20 Hz ; la disparition efface les positions plutôt que de revenir silencieusement aux poignets. Le temps de séance continue à dépendre du temps réel.
- Tests : 20 tests de logique ; chargement réel du moteur WASM et du modèle CPU dans le navigateur ; détection d'une main à 21 repères sur une image fournie, choisie via un sélecteur et traitée uniquement en mémoire locale. L'image n'est pas incluse dans le projet ou la publication.
- À valider sur iPad : fluidité en vidéo, distances d'utilisation, mains ouvertes/fermées, sélection anatomique gauche/droite et mains qui se croisent. Refaire la calibration après cette mise à jour, le point de contact ayant changé.
