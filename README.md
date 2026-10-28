# Flux Burger · v1.1.0

Jeu de gestion d’un restaurant de burgers, en français. La vue 3D montre la cuisine, le comptoir, les bornes, la salle et les clients réellement présents dans la simulation : steaks sur le grill, paniers de frites, commandes prêtes sur la passe, tables occupées ou sales, camion de livraison à la porte de service.

## Service

Le restaurant ouvre de 11 h à 23 h, avec un coup de feu à midi et le soir ; la mise en place commence à 9 h. Les clients arrivent par groupes de 1 à 4, sur place ou à emporter. Ils font la queue, commandent à une caisse (un caissier par caisse ouverte) ou à une borne (sans caissier, un peu plus lente) et paient à la commande. Trop d’attente dans la file les fait repartir.

Les steaks suivent un vrai circuit : chambre froide, bacs crus à côté des grills (24 bœuf, 24 poulet) que le grillardin va remplir quand ils sont presque vides, grill (8 steaks à la fois, 4 minutes, on peut en ajouter pendant la cuisson), puis meuble de maintien où ils attendent 20 minutes au plus avant de partir en déchet. La cuisson d’avance (à la commande, réserve normale, grosse réserve) arbitre entre attente et déchets ; à la fermeture les steaks cuits sont jetés et les bacs crus retournent en chambre froide. Le grillardin se déplace réellement : il va prendre les steaks crus au bac, revient les poser sur le grill, puis porte la fournée cuite au meuble de maintien ; son trajet de chaque minute est rejoué dans la vue 3D, plateau en main. Une fumée légère monte des steaks en cuisson. Chaque poste de cuisson a sa hotte, et les postes grill, friteuse et assemblage ont un écran des demandes (à cuire, en cuisson, ticket en assemblage). En cuisine, chaque ticket prend ses steaks au maintien, puis passe par la friteuse (6 portions, 3 minutes) et un poste d’assemblage qui monte les burgers, sert les boissons et emballe. Un poste sans équipier ne sert à rien. La commande prête attend sur la passe ; le client la récupère, s’installe à une table de 4 s’il mange sur place, puis la laisse sale : l’équipe de salle la nettoie. Une commande servie en moins de 8 minutes est dans les temps ; au-delà, une alarme sonne et la réputation baisse. À la fermeture, les commandes non servies sont remboursées.

Le bandeau de droite suit les tickets en cours, la file et la salle ; ⏫ priorise un ticket en cuisine. Chaque nouvelle commande s’annonce par une carte et un carillon (bouton Son). Les commandes de groupe (anniversaire, club de foot) sont payées à l’acceptation, retirées à une heure précise et donnent une prime si elles sont prêtes à temps.

## Ingrédients et emballages

Sept ingrédients : pains, bœuf, poulet, cheddar, légumes, frites, boissons. Chaque lot a une date limite : les lots sont utilisés dans l’ordre et les périmés sont jetés à la fermeture. Le camion du matin livre à 9 h toute commande passée avant 8 h 30, sinon le lendemain ; l’express arrive en une heure, plus cher. Le réassort automatique, activé par défaut, commande dès que stock + attendus passent sous un seuil réglable, et bascule en express si le stock devient critique. Boîtes, gobelets, cornets et sacs sont consommés à l’assemblage, avec leur propre réassort. Les jauges permanentes montrent ingrédients et emballages ; un clic ouvre l’article dans Stock.

## Ventes, équipes et finances

Le concept (équilibré, restauration rapide, gourmet) règle l’affluence, la part à emporter et la patience. La barre de marge brute fixe tous les prix (la carte au prix du marché correspond à la marge de départ) ; prix bas, publicité, promotions et réputation attirent du monde. Un calendrier de 28 jours (soirée de match, festival, début de mois, vacances, journée du burger) fait varier la demande et s’annonce deux jours avant.

Équipes : caisse, grill, friteuse, assemblage, salle, jusqu’à 12 par rôle. Équipements : jusqu’à 4 grills, 4 friteuses, 3 postes d’assemblage, 3 caisses, 4 bornes et 12 tables. Les charges (salaires à la minute de présence, loyer, énergie, assurance, intérêts) sont payées à la fermeture. Le bilan distingue ventes, remboursements, coût des ingrédients, périmés, livraisons, emballages, publicité et primes. Les emprunts de 5 000 à 50 000 € se remboursent chaque soir. L’onglet Stats trace clients, attente, marge, résultat et service dans les temps.

## Anciennes parties et sauvegarde

Une partie du centre logistique (schéma 2), elle-même issue du supermarché (schéma 1), est convertie au premier chargement : sa trésorerie plus son stock, moins sa dette, devient le capital du restaurant (au moins 30 000 €). La partie d’origine est conservée telle quelle dans `state.legacyArchive`, y compris dans les sauvegardes D1 et les exports JSON. Le restaurant utilise le schéma 3 ; l’API authentifiée valide les trois schémas.

Le jeu se sauvegarde sur l’appareil et sur le compte, toutes les cinq secondes et à la mise en arrière-plan. Partie permet export JSON, reprise, restauration précédente et nouveau restaurant après confirmation. Le mode « Préparer pour l’avion » vérifie tous les fichiers et la sauvegarde locale ; « Revenir en ligne » reprend la synchronisation.

## Développement

Node.js 22.13 ou supérieur et Three.js. Worker Sites et D1 pour les sauvegardes authentifiées.

```sh
npm ci
npm run check
npm test
npm run build
npm run dev
```

`dist/restaurant-engine.js` porte la simulation du restaurant, `dist/restaurant-scene.js` la vue 3D, `dist/game.js` l’interface et `dist/restaurant-save.js` la validation des sauvegardes. Le moteur du centre logistique (`dist/warehouse-engine.js`) et celui du supermarché restent présents pour convertir les anciennes parties et pour leurs tests de non-régression. `test/restaurant.test.js` vérifie service, cuisine, file, tables, péremption, réassort, prix, groupes, emprunts, conversion et calendrier. Le scénario navigateur `scripts/test-offline-browser.mjs` reçoit le chemin du module Playwright installé. Préserver `.openai/hosting.json`, D1 `DB`, le dépôt et l’audience privée.
