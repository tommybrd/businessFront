# Market Front · v0.10.0

Jeu de gestion de supermarché en français, en vue 3D. Le joueur dirige le magasin, ses équipes, ses commandes et sa trésorerie.

## Partie et démarrage

Le chargement reprend automatiquement à vitesse ×1, sans simuler le temps passé hors du jeu. Une nouvelle partie commence dans un petit local avec deux rayons de 200 articles, une caisse, trois employés, 240 articles en rayon et 96 en réserve. Une partie existante garde ses stocks et ses équipements. Chaque caisse installée inclut désormais un employé et son salaire.

Sauvegarde automatique liée au compte Sites, toutes les cinq secondes et à la mise en arrière-plan. Le menu Partie permet sauvegarde manuelle, rechargement, reprise de la version précédente (en pause) et nouvelle partie après confirmation. Un conflit entre fenêtres arrête la simulation jusqu’au rechargement. Les journées s’enchaînent, sauf faillite. Une seconde représente une minute à ×1.

## Local et aménagement

Finances propose petit, moyen ou grand magasin, avec surface, coût de changement de local et charges estimées. Loyer, électricité, assurance et entretien suivent la surface ; les équipements augmentent la consommation. Les extensions ajoutent du sol et des emplacements, à équiper séparément. Les charges sont facturées une fois à la fermeture, avec un détail conservé dans l’historique. Réduire le local demande de retirer les équipements en trop et de terminer les opérations en cours.

Aménager ouvre un plan et met la partie en pause. Sélectionner un équipement puis le glisser, ou toucher sa destination ; Tourner le pivote de 90°. Rayons, caisses, caisse automatique, racks et poste de préparation sont déplaçables. Les chevauchements, sorties bloquées et passages coupés sont refusés. Un équipement en cours d’utilisation attend la fin de son opération. La simulation, les chemins autour des obstacles et la scène 3D utilisent les positions sauvegardées.

Les repères de la scène sont les portillons, barrières, voyants et meubles. Aucun panneau Entrée, Sortie, Caisse 1, Auto, Module libre, Quai ou Drive ne flotte dans le magasin. Les plaques des produits font partie du mobilier. Le montant du paiement reste près du poste et un bip unique accompagne le paiement (après autorisation audio du navigateur), sans option de désactivation.

## Stocks, clients et livraisons

Un module de rayon contient 200 articles, avec cinq niveaux de 40. Installation 120 €, retrait 30 €, maintenance 1 € par jour. La réserve dispose de racks par produit, avec capacité augmentable. Les jauges affichent stocks et capacité en rayon et en réserve. Les commandes se font directement depuis la réserve : quantités visibles et boutons Express (livraison après 30 minutes, paiement immédiat) ou Ce soir (envoi à 20 h, 10 € mutualisés par fournisseur).

Une palette complète contient **240 articles : vingt cartons de douze empilés sur cinq niveaux**. Camions, palettes extérieures et transpalettes montrent les cartons restant réellement à transporter. Une palette partielle contient uniquement la quantité commandée. Les anciens chargements sauvegardés restent valides. Chaque camion transporte dix palettes au maximum et utilise un quai réel, avec alignement, recul, déchargement et départ. La réserve pleine peut bloquer un produit ou déposer sa palette dans le tampon extérieur. Le chariot moyen de 24 articles est disponible dès le départ ; le petit modèle n’est plus proposé. Un chargement peut réunir trois familles, avec réservations distinctes, collecte successive en réserve et dépôt dans chacun de leurs rayons. Le grand chariot porte 48 articles. Les employés transportent puis rangent les cartons ; les arrêts devant les racks gardent une distance suffisante pour le nez du transpalette.

Les clients viennent avec un sac (jusqu’à six articles prévus), un mini-chariot (jusqu’à quinze) ou un caddie. Le contenu visible suit les produits pris en rayon. Les caisses attendent l’arrivée du client avant déchargement, scan, récupération et paiement. La caisse automatique accepte **dix articles maximum**, avec supervision par un employé des caisses.

Les alertes de stock restent visibles dans la vue principale : rayons vides, seuil bas à 15 % (ou douze articles), réserves épuisées ou réduites à douze articles. Une nouvelle rupture déclenche un avertissement et chaque alerte mène au produit ou à sa commande. Les familles sans rayon installé ne génèrent aucune fausse alerte.

Satisfaction détaille articles demandés/trouvés, ruptures par famille, attente moyenne et maximale, file actuelle, départs sans achat et effets sur le score. Chaque chiffre provient de la simulation. La mesure d’une ancienne partie commence à la mise à jour, sans inventer son historique.

Le vol affecte le paiement des articles réellement sortis du stock : 1 % par article aux caisses classiques, 4 % à la caisse automatique en surveillance simple. Les caméras divisent ces taux par deux (600 € à installer, 25 €/jour) ; caméras et contrôle les divisent par cinq (1 400 €, 60 €/jour). Finances suit articles volés, ventes perdues et valeur d’achat, sans déduire deux fois la perte. Le tirage aléatoire et les compteurs sont sauvegardés.

Drive et e-commerce partagent le stock du magasin. Les paniers sont réservés puis prélevés par des préparateurs, emballés et remis au client drive ou au transporteur. L’encaissement attend la remise ou l’expédition. Stocks, commandes, équipes, TVA, impôt, salaire du directeur et réinvestissement personnel se poursuivent d’un jour à l’autre.

## Développement et publication

Node.js **22.13 ou supérieur**, Three.js pour la scène, Worker Sites et D1 pour les sauvegardes. Le serveur local utilise `.sites-runtime/game-saves.sqlite` avec un compte de test distinct (`local-playtest`). Aucun état local de test ne part en production.

```sh
npm ci
npm run check
npm test
npm run build
npm run dev
```

La simulation est dans `dist/engine.js` ; les coordonnées dans `dist/store-layout.js` ; les chemins dans `dist/walking-route.js` et `dist/customer-motion.js`. L’interface est dans `dist/game.js` et `dist/layout-editor.js`, la scène dans `dist/scene.js`. Satisfaction et vol ont leurs modules indépendants. La sauvegarde passe par `dist/save-format.js`, `dist/save-manager.js`, `worker/index.js` et `worker/save-db.js`.

Le build rassemble les fichiers publics dans le Worker et vérifie chaque fichier embarqué. L’identité provient exclusivement de Sites ; les écritures protègent les révisions concurrentes et conservent une version précédente. `db/schema.ts` et les migrations Drizzle décrivent D1 ; les migrations déjà appliquées restent immuables. Le dépôt et le Site indiqués dans `.openai/hosting.json` doivent être conservés, avec leur audience privée.

## Pistes restantes

Gestion RH détaillée, négociation et contrats fournisseurs, réglage des prix et marges, prévisions de gestion et produits périssables.
