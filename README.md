# Flux · v0.15.0

Jeu de gestion d’un centre de distribution, en français, inspiré du fonctionnement d’un entrepôt e-commerce. La vue 3D représente le stock, les agents, les robots, les postes d’emballage, les colis et les véhicules réellement présents dans la simulation.

## Boucle de jeu

Les commandes standard et express arrivent pendant la journée. Le joueur choisit son positionnement commercial (équilibré, spécialiste de l’express ou gros volume), la commande à préparer en premier et la fréquence des tournées ; l’onglet Commandes explique chaque choix. Les préparateurs ou robots réservent les articles disponibles, se rendent aux racks, prélèvent les différentes familles et déposent le panier à l’emballage. Un agent et un poste libre sont nécessaires pour emballer. Les colis attendent ensuite au quai ; une camionnette et un chauffeur les livrent. Le revenu est encaissé à la livraison ; un retard réduit le paiement et la note de service.

Le tableau de flux montre commandes à préparer, prélèvement, emballage, colis prêts et tournées. Les stocks manquants, retards et embouteillages d’emballage sont signalés. Le matin et la fin d’après-midi apportent des vagues de demandes. Des commandes clients pro facultatives ajoutent des lots de colis express et une prime si toutes sont livrées dans les délais.

## Stocks et réception

Six familles : accessoires tech, livres, maison, jeux et jouets, hygiène et beauté, vêtements. Les racks montrent les produits en vrac, reconnaissables par leur forme et leur couleur ; les préparateurs les transportent dans des bacs, et seuls les postes d’emballage les mettent en carton. Les marchandises sont commandées par cartons de 24, jusqu’à 960 articles. La livraison standard arrive à 6 h 30 (le jour même si la commande précède ce passage, sinon le lendemain), l’express après 45 minutes avec frais majorés. L’heure d’arrivée prévue s’affiche au moment de l’achat et dans Réception. Les marchandises payées restent valorisées pendant le transport.

Les réceptionnaires transportent jusqu’à 48 articles par trajet depuis le camion vers le rack. Les réservations de déchargement et la place disponible empêchent les doublons et les débordements. Un rack plein bloque le restant de sa livraison. Chaque famille commence avec 240 places, extensibles jusqu’à 960. Les réservations des commandes, les articles attendus et les articles présents sont distingués.

## Équipes, robots et équipements

Les équipes comprennent réceptionnaires, préparateurs, emballeurs et chauffeurs. Les effectifs se règlent directement. Un agent retiré termine sa mission avant de partir ; aucun chargement ne disparaît. Les postes d’emballage (maximum 3) coûtent 1 800 € ; les camionnettes (maximum 4, 12 colis par véhicule) coûtent 8 000 € et nécessitent un chauffeur.

Les robots de prélèvement sont autonomes et coopèrent avec les employés sur les mêmes réservations de stock. Ils coûtent 18 000 € à l’achat puis 160 € de maintenance et 20 € d’électricité par jour, sans salaire. Une flotte peut compter 8 robots. Un robot retiré termine son chargement et son dépôt avant d’être désactivé.

Agencer met le jeu en pause. Sélectionner un rack ou un poste, puis toucher sa nouvelle position ; Tourner change son orientation. Les positions occupées, sorties et accès bloqués sont refusés. Les chemins des missions en cours sont recalculés. Les repères et noms sont intégrés aux équipements du décor.

Les employés et les robots parcourent leurs trajets en continu entre les minutes de simulation, en suivant les angles des allées. Les personnages tournent progressivement et marchent avec des jambes articulées ; leurs chariots restent au sol. Les camionnettes et camions de livraison avancent eux aussi en continu et manœuvrent progressivement pour se garer ou quitter le quai. La pause fige aussi leur posture. Cette animation ne modifie ni le stock, ni les durées des missions, ni le format des sauvegardes.

## Livraison et finances

Les départs automatiques peuvent être espacés de 30, 60 ou 120 minutes. Expédier lance un départ immédiat si un chauffeur, un véhicule et des colis sont disponibles. Une tournée coûte 22 € plus 0,80 € par colis ; l’emballage coûte 0,60 € par colis. Regrouper par secteur réduit les trajets, prioriser les échéances ou les express protège les délais. Suspendre les commandes permet de résorber un retard sans supprimer le travail déjà accepté.

Les salaires sont provisionnés selon les minutes de présence des agents ; retirer un agent ne supprime pas le salaire déjà acquis. Les charges sont payées une fois à 22 h. La journée suivante reprend à 5 h, sans perdre les commandes, marchandises ou missions en cours. Le bilan distingue ventes, coût des articles vendus, marge, transport, emballages, primes, charges, trésorerie et valorisation du stock. Les achats de stock sont des actifs jusqu’à leur vente ; un investissement ne crée aucun revenu. Les journées clôturées restent consultables dans une fenêtre large.

## Anciennes parties et sauvegarde

Une ancienne partie du supermarché est convertie au premier chargement. Sa sauvegarde complète est conservée dans `state.legacyArchive`, y compris dans les sauvegardes D1 et les exports JSON. La trésorerie, la valeur du stock et les dettes fournisseurs déterminent le capital de reconversion ; un apport de lancement complète un capital inférieur à 25 000 €, et ce montant est indiqué dans Partie. Le nouveau centre est fourni avec son stock et ses équipements de départ. Une nouvelle partie conserve cette archive.

Les sauvegardes logistiques utilisent le schéma 2 ; le schéma 1 reste lisible. L’API authentifiée valide les deux formats et contrôle identité, révision, réservations, références, effectifs, quantités et chargements. Un conflit demande un choix explicite et conserve une copie de récupération.

Le jeu se sauvegarde sur l’appareil et sur le compte, toutes les cinq secondes et à la mise en arrière-plan. Partie permet export JSON, reprise, restauration précédente et nouveau centre après confirmation. Le mode « Préparer pour l’avion » vérifie tous les fichiers et la sauvegarde locale. Il persiste après fermeture complète du navigateur ; « Revenir en ligne » reprend la synchronisation. Sur iPad, préparer le vol depuis l’icône ajoutée à l’écran d’accueil, avec une première connexion Internet. Le temps absent n’est pas simulé.

## Développement

Node.js 22.13 ou supérieur et Three.js. Worker Sites et D1 pour les sauvegardes authentifiées. Le serveur local utilise un compte de test distinct ; les tests SQL et navigateur utilisent des bases isolées.

```sh
npm ci
npm run check
npm test
npm run build
npm run dev
```

`dist/engine.js` expose la simulation logistique de `dist/warehouse-engine.js`. `dist/warehouse-routing.js` calcule les chemins ; `dist/game.js` porte l’interface ; `dist/scene.js` expose `dist/warehouse-scene.js` pour la vue 3D. L’ancienne simulation reste disponible pour les archives et ses tests de non-régression. Le build embarque les fichiers publics dans le Worker, vérifie les données binaires et teste les API de sauvegarde v1 et v2 avec SQL isolé. Préserver `.openai/hosting.json`, D1 `DB`, le dépôt et l’audience privée.

Le scénario navigateur `scripts/test-offline-browser.mjs` reçoit le chemin du module Playwright installé. Il vérifie conversion de partie, achats, robots, opérations et reprise après fermeture complète en mode avion dans Chrome et WebKit. `test/warehouse.test.js` vérifie conservation des articles, paiements, stocks, effectifs, contrats, clôtures, migration, sauvegardes et synchronisation.
