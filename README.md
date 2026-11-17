# PhysioPlay — V0.3.1

**Bouger · Jouer · Progresser.** Application web React/TypeScript avec caméra frontale et jeux pilotés par les poignets, utilisable sur GitHub Pages et installable en PWA.

[Ouvrir PhysioPlay](https://sebrbo.github.io/PhysioPlay/) · [Dépôt GitHub](https://github.com/Sebrbo/PhysioPlay)

## Démarrer une séance

Installer l’appareil de façon stable et cadrer le haut du corps et les poignets. Une seule personne doit être présente dans le cadre.

1. **Étape 1 — Caméra :** appuyer sur **Activer la caméra**, puis sur **Autoriser** si le navigateur le demande. Aucune permission microphone n’est demandée. Les points blancs représentent les poignets détectés.
2. **Étape 2 — Zone :** choisir **Adapter ma zone · 8 secondes** pour personnaliser l’espace de jeu, ou **Utiliser la zone standard sans calibration** pour démarrer avec une zone prédéfinie. La calibration est facultative : elle adapte le placement des cibles, pas la détection.
3. **Étape 3 — Jouer :** choisir le mode dans **Choisis ton jeu**, juste au-dessus de **Commencer le jeu**. Les autres paramètres sont dans **Réglages → Séance**. Le choix du mode est synchronisé entre les deux emplacements et conserve la caméra et la zone.
4. Appuyer sur **Commencer le jeu** : le plein écran s’ouvre automatiquement, puis un décompte sonore et visuel de **5 secondes** permet de se placer. La durée de séance commence après ce décompte.

Si le navigateur ne permet pas le plein écran natif, l’application utilise toute la fenêtre. La calibration reste dans l’affichage de préparation.

**Essayer sans caméra** permet de tester les jeux avec le pointeur ou le doigt, sans suivi corporel et avec une zone prédéfinie.

## Les cinq modes de jeu

Le point de contact est le **poignet**, même si les consignes parlent des mains. Les doigts, la préhension et la force ne sont pas mesurés. Avec « Les deux mains », un seul des deux poignets suffit pour toucher une cible ; les contacts STOP concernent également les poignets sélectionnés.

### Cibles libres

Atteindre une cible et garder le point du poignet dessus pendant **250 ms**. Une réussite fait apparaître la cible suivante.

- Aucun délai maximum par cible ; la séance garde toutefois sa durée totale.
- Score : nombre de cibles atteintes.
- Son bref à chaque réussite.

### Cibles chronométrées

Atteindre la cible avant la fin du délai réglé et rester dessus pendant **80 ms** pour valider le contact.

- Délai réglable : **2, 3, 4, 6 ou 8 secondes** ; **4 secondes par défaut**.
- Une réussite fait apparaître immédiatement la cible suivante. Sans réussite, elle est remplacée à expiration du délai et une cible manquée est comptée.
- Le cercle extérieur indique le temps disponible pour la cible.
- Score : cibles atteintes ; bilan des cibles expirées. Sons distincts pour réussite et expiration.

Le délai est donc le temps maximum disponible pour chaque cible, et non une attente fixe entre deux apparitions.

### Le papillon

Accompagner le papillon en gardant le point du poignet dans son halo pendant qu’il se déplace dans la zone choisie.

- Chaque **seconde complète de contact continu** rapporte un point. Une sortie du halo ou une perte de suivi annule la fraction de seconde en cours ; les points déjà obtenus restent acquis.
- Vitesse réglable : **Très lente ×0,25**, **Lente ×0,5**, **Normale ×1**, **Rapide ×1,5**, **Très rapide ×2**. La vitesse normale est sélectionnée par défaut.
- La taille des cibles règle aussi la taille du halo.
- Score affiché en **secondes suivies** : somme des secondes complètes validées, pas une mesure précise de tout le temps passé dans le halo.
- Aucun son de contact ni de point pendant la poursuite. Les sons de départ, pause/reprise et fin de séance restent actifs.

### Feu vert / rouge

**Touche GO, évite STOP.** Le jeu commence par une cible verte ; les suivantes sont vertes ou rouges, avec environ **35 % de probabilité de rouge** à chaque nouvelle cible. Les mots GO/STOP complètent les couleurs.

- **Verte GO :** toucher pendant **80 ms** avant expiration. Le délai des vertes est réglable de **2 à 8 secondes** avec les valeurs proposées, **4 secondes par défaut**. Une verte atteinte compte une réussite ; une verte expirée compte une erreur.
- **Rouge STOP :** garder les poignets sélectionnés hors du cercle jusqu’à sa disparition. Un contact détecté, même bref, compte immédiatement **une erreur par cible rouge**. Une croix et un son distinct confirment l’erreur. Rester dessus ou la retoucher ne multiplie pas les erreurs pour cette même cible.
- Durée des rouges indépendante du délai des vertes : **0,4 / 0,6 / 0,8 / 1 / 1,5 seconde**, **0,8 seconde par défaut**. Une rouge touchée reste jusqu’à la fin de cette courte durée.
- Une rouge évitée jusqu’à expiration compte une réussite, sans son de touche.
- Score : **consignes réussies** (vertes atteintes + rouges évitées). Le bilan distingue **rouges touchées**, **vertes manquées** et **total des erreurs**.

### Accélération

Atteindre les cibles avant expiration, avec un contact de **80 ms**. Après une série de réussites consécutives, le délai disponible diminue.

| Réglage | Valeurs proposées | Par défaut |
| --- | --- | --- |
| Délai initial | 2 / 3 / 4 / 6 / 8 s | 4 s |
| Réussites par palier | 2 / 3 / 5 / 10 cibles | 5 |
| Réduction par palier | 0,1 / 0,25 / 0,5 / 1 s | 0,5 s |
| Délai minimum | 0,3 / 0,5 / 0,75 / 1 s | 0,5 s |

Exemple par défaut : cinq réussites à 4 s font passer à 3,5 s ; cinq nouvelles réussites font passer à 3 s, et ainsi de suite jusqu’à 0,5 s. La série repart à zéro à chaque palier. Au minimum, le jeu continue avec ce même délai.

**Une cible expirée remet immédiatement le délai à sa valeur initiale et la série à zéro.** Elle compte aussi comme une cible manquée. Un geste hors de la cible ne provoque pas de remise à zéro avant expiration.

Le délai actuel et la progression de la série sont affichés pendant le jeu. Sons de réussite, de passage à un palier plus rapide et de retour au délai initial. Bilan : cibles atteintes et expirées.

## Réglages, temps et bilan

- **Séance :** mode, poignet gauche/droit du patient ou les deux, durée **30 / 60 / 90 / 120 s** (60 s par défaut), taille des cibles grande/moyenne/petite et paramètres du mode choisi.
- **Zone des cibles :** largeur et hauteur réglables séparément de **50 à 150 %**, **150 % par défaut**, appliquées à la zone standard ou personnalisée. 100 % reprend la zone de référence. Au-delà de 100 %, l’espace est élargi : vérifier que les cibles restent confortablement accessibles.
- **Sons :** activés par défaut à **40 %**, volume réglable et option muet. Boutons pour essayer les signaux de réussite et d’erreur STOP. Les sons s’activent au clic sur Commencer, Tester ou lors de la calibration/reprise. Vérifier aussi le volume et le mode silencieux de l’appareil.
- Les réglages sont verrouillés pendant la calibration, le décompte, le jeu et la pause. Revenir à la préparation pour les modifier.

**Le chronomètre de séance et les délais des cibles continuent si les poignets sortent du cadre.** Il n’y a pas de pause automatique pour simple perte de détection. Le bouton **Pause** fige la séance et le jeu. Masquer l’application pendant le jeu déclenche une pause ; la masquer pendant le décompte annule le départ.

En plein écran, le chrono, le score et les boutons **Pause** et **Retour** sont incrustés dans la vidéo. **Retour** interrompt la séance en cours et ramène à la préparation en gardant la caméra active ; il n’ouvre pas le bilan. La fin du temps prévu ouvre le bilan ; hors plein écran, **Terminer** permet aussi de le consulter avant cette échéance. **Rejouer** remet les compteurs à zéro et lance un nouveau décompte de cinq secondes.

Le **temps moyen d’atteinte**, affiché au bilan sauf pour le papillon, porte seulement sur les cibles touchées avec succès, maintien inclus. Pour Feu vert / rouge, seules les vertes atteintes entrent dans cette moyenne. Ce n’est pas un temps de réaction clinique.

Les autres sons signalent le départ, l’expiration d’une cible, la calibration réussie, la pause/reprise et la fin de séance. Les sons en cours sont arrêtés lors d’un retour ou d’une interruption de visibilité ; aucun rattrapage sonore n’est empilé pendant une suspension audio.

## Calibration et suivi

La calibration demande **8 secondes de suivi valide** : balayer lentement son espace confortable, sans forcer. La zone est calculée à partir de l’enveloppe des positions observées, en écartant les extrêmes puis en ajoutant une marge intérieure de 12 % par bord. Une exploration trop petite ou un suivi insuffisant peuvent être rejetés. Après un changement de poignet sélectionné ou d’orientation, choisir à nouveau une zone. Après un déplacement du patient ou de l’appareil, adapter de nouveau la zone personnalisée.

Cette enveloppe rectangulaire en 2D ne garantit pas l’accessibilité de chaque cible et ne mesure ni angle articulaire, ni compensation, ni amplitude clinique. L’application reste un prototype sans validation clinique ; adapter la séance au patient avec le thérapeute.

Le suivi actif utilise **MediaPipe Pose Landmarker Lite**, repères 15 et 16 (poignets), avec miroir d’affichage. Le modèle dédié aux mains a été essayé en V0.1.5 puis retiré en V0.1.6 après des pertes de détection sur iPad. Le code expérimental `src/hands.ts` reste présent, mais n’est pas utilisé par l’application.

## Confidentialité

Aucune vidéo n’est enregistrée ou transmise. Images, coordonnées et résultats de séance restent en mémoire dans le navigateur. Aucun compte patient, analytics, cookie applicatif, base patient, stockage des scores ou export automatique. Les résultats disparaissent au rechargement ; les réglages ne sont pas conservés entre les rechargements.

Le cache PWA stocke les fichiers de l’application, du moteur et du modèle. L’hébergeur reçoit les requêtes ordinaires de chargement avec les métadonnées réseau habituelles. Le premier lancement local ou build télécharge le modèle officiel depuis Google ; le site construit sert ensuite ce modèle depuis son propre hébergement. Les sons sont synthétisés localement, sans fichier audio distant ni microphone.

## Installation et mises à jour

Sur iPad : ouvrir [PhysioPlay](https://sebrbo.github.io/PhysioPlay/) dans Safari, puis utiliser **Partager → Sur l’écran d’accueil** pour l’installer.

Le premier chargement doit être connecté. Le hors connexion dépend de la mise en cache complète et de la conservation du stockage par le navigateur ; ce n’est pas une garantie d’accès permanent. Aucune mise à jour n’est forcée pendant une séance. Fermer toutes les fenêtres de l’application puis la rouvrir pour appliquer une version en attente ; vérifier le numéro en haut de l’écran.

## Développement local et architecture

Node.js 22 recommandé.

```sh
npm ci
npm test
npm run dev
```

Ouvrir l’adresse locale indiquée. La caméra nécessite `localhost` ou HTTPS. Une adresse HTTP du Mac ouverte depuis l’iPad ne suffit pas : utiliser le site GitHub Pages en HTTPS pour le test iPad.

```sh
npm run build
npm run preview
```

Le service worker et le hors connexion se vérifient sur la version construite, pas sur le serveur de développement.

| Élément | Rôle |
| --- | --- |
| React + TypeScript + Vite | Interface responsive en français |
| `src/App.tsx` | Caméra, choix du jeu, cycle de séance, affichage Canvas et collisions |
| `src/game.ts` | Géométrie, calibration, horloges, paliers d’accélération et contacts STOP |
| `src/sound.ts` | Synthèse Web Audio, volume, activation par geste et arrêt des sons |
| `src/*.test.ts` | Tests de logique de jeu, audio et helpers expérimentaux de mains |
| `scripts/prepare-assets.mjs` | Copie du WASM épinglé et préparation du modèle officiel |
| `.github/workflows/deploy.yml` | Tests, construction et déploiement GitHub Pages |

Pose est exécuté localement sur CPU à chaque nouvelle image vidéo, pour une personne. Vidéo et Canvas partagent le même cadrage miroir : image entière en préparation, recadrage proportionnel en plein écran pour éviter les bandes. Les cibles restent dans la portion visible et hors de la bande de commandes du haut.

## Publication

Le dépôt existant est **Sebrbo/PhysioPlay**, branche **main**. Dans **Settings → Pages → Source**, sélectionner **GitHub Actions**.

Publier les sources à la racine du dépôt, avec `package-lock.json` et `.github/workflows/deploy.yml`. Ne pas envoyer `node_modules`, `dist` ou `public/mediapipe` : le build prépare ces ressources. Un envoi sur `main` déclenche les tests, le build et le déploiement ; le workflow peut aussi être lancé manuellement. Attendre le succès du déploiement avant de vérifier [le site](https://sebrbo.github.io/PhysioPlay/). Respecter la casse du chemin **/PhysioPlay/**.

## Vérifications avant utilisation

- Caméra : autorisation, refus et nouvel essai, une personne, vraie gauche/droite du patient, coins de la zone et arrêt effectif de la caméra.
- Préparation : zone standard, calibration facultative, changement de main, rotation, choix du mode à l’étape 3 et synchronisation avec les réglages.
- Cibles libres : contact maintenu et remplacement après réussite seulement ; Cibles chronométrées : réussite, expiration et bilan.
- Papillon : cinq vitesses, sortie/rentrée dans le halo, perte de suivi, score en secondes complètes et absence de son de touche.
- Feu vert / rouge : contact STOP bref, maintien et second contact sur le même STOP sans double erreur, durée rouge indépendante, rouge évitée, bilan séparant les erreurs.
- Accélération : série complète, passage de palier, minimum, expiration et remise à zéro du délai et de la série.
- Temps : 30/60/90/120 s, perte de suivi sans gel des délais, pause/reprise, masquage, verrouillage, fin automatique et nouvelle séance.
- Sons : décompte, départ, réussite, erreur rouge, expiration, palier/reset, fin, muet, volume, reprise après interruption sur iPad réel.
- Affichage : portrait/paysage, petits écrans, plein écran automatique et maintien de l’alignement vidéo/poignets/cibles.
- PWA : installation, fonctionnement après mise en cache sans réseau, mise à jour après fermeture/réouverture ; aucune requête contenant des images ou coordonnées.

Le fonctionnement des jeux avec caméra a été confirmé par l’utilisateur sur iPad. Les dernières évolutions d’interface et de sons nécessitent leur propre essai sur l’appareil. Android, Mac et Windows restent à vérifier selon le navigateur et le matériel ; aucune compatibilité universelle n’est garantie.

## Historique résumé

Ces lignes décrivent l’évolution du projet ; les sections précédentes documentent le fonctionnement actuel.

| Version | Évolution |
| --- | --- |
| V0.1.1 | Correction du chronomètre en temps réel |
| V0.1.2–V0.1.4 | Zone réglable, 150 % par défaut, départ différé, réglages séparés et vidéo immersive |
| V0.1.5 | Plein écran automatique et essai du suivi des paumes |
| V0.1.6 | Retour au suivi des poignets avec Pose |
| V0.1.7 | Parcours caméra → zone facultative → jeu |
| V0.2.0 | Papillon, Feu vert / rouge et Accélération |
| V0.2.1 | Noms Cibles libres/chronométrées, STOP court, bilan des erreurs et vitesse du papillon |
| V0.3.0 | Repères sonores et onglet Sons |
| V0.3.1 | Choix direct du jeu près de Commencer à l’étape 3 |

Pistes futures : séquences de plusieurs cibles, réglages de maintien, zones ciblées, profils de séance et bilan enrichi avec export volontaire. Ces fonctions ne sont pas encore implémentées.

Références techniques : [MediaPipe Pose Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js), [Vite et GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).
