# Market Front · v0.11.6

Jeu de gestion de supermarché en français, en vue 3D. Le joueur dirige le magasin, ses équipes, ses commandes et sa trésorerie.

## Partie et démarrage

Le chargement reprend automatiquement à vitesse ×1, sans simuler le temps passé hors du jeu. Une nouvelle partie commence dans un petit local avec deux rayons de 200 articles, une caisse, trois employés, 240 articles en rayon et 96 en réserve. Une partie existante garde ses stocks et ses équipements. Chaque caisse installée inclut désormais un employé et son salaire.

Sauvegarde automatique liée au compte Sites, toutes les cinq secondes et à la mise en arrière-plan. Le menu Partie permet sauvegarde manuelle, rechargement, reprise de la version précédente (en pause) et nouvelle partie après confirmation. Un conflit entre fenêtres arrête la simulation jusqu’au rechargement. Les journées s’enchaînent, sauf faillite. Une seconde représente une minute à ×1.

## Local et aménagement

Finances propose petit, moyen ou grand magasin, avec surface, coût de changement de local et charges estimées. Loyer, électricité, assurance et entretien suivent la surface ; les équipements augmentent la consommation. Les extensions ajoutent du sol et des emplacements, à équiper séparément. Les charges sont facturées une fois à la fermeture, avec un détail conservé dans l’historique. Réduire le local demande de retirer les équipements en trop et de terminer les opérations en cours.

Aménager ouvre un plan et met la partie en pause. Sélectionner un équipement puis le glisser, ou toucher sa destination ; Tourner le pivote de 90°. Rayons, caisses, caisse automatique, racks et poste de préparation sont déplaçables. Les chevauchements, sorties bloquées et passages coupés sont refusés. Un équipement en cours d’utilisation attend la fin de son opération. La simulation, les chemins autour des obstacles et la scène 3D utilisent les positions sauvegardées.

Les repères de la scène sont les portillons, barrières, voyants et meubles. Le pain est présenté dans un meuble en bois à quatre niveaux compartimentés, avec baguettes debout en bas et petits pains emballés en haut ; le frais utilise des bacs réfrigérés bas et ouverts sur le dessus, avec éclairage et ventilation. Les articles sont disposés à plat pour rendre le remplissage visible depuis la vue du magasin. Chaque meuble montre son stock réel et conserve ses emplacements, sa capacité et ses accès sauvegardés. Aucun panneau Entrée, Sortie, Caisse 1, Auto, Module libre, Quai ou Drive ne flotte dans le magasin. Les plaques des produits font partie du mobilier. Le montant du paiement reste près du poste et un bip unique accompagne le paiement (après autorisation audio du navigateur), sans option de désactivation.

## Stocks, clients et livraisons

Un module de rayon contient 200 articles, avec cinq niveaux de 40. Installation 120 €, retrait 30 €, maintenance 1 € par jour. La réserve dispose de racks par produit, avec capacité augmentable. Les jauges affichent stocks et capacité en rayon et en réserve. Les commandes se font directement depuis la réserve : quantités visibles et boutons Express (livraison après 30 minutes, facturation immédiate) ou Ce soir (envoi à 20 h, 10 € mutualisés par fournisseur).

Une palette complète contient **240 articles : vingt cartons de douze empilés sur cinq niveaux**. Camions, palettes extérieures et transpalettes montrent les cartons restant réellement à transporter. Une palette partielle contient uniquement la quantité commandée. Les anciens chargements sauvegardés restent valides. Les livraisons standard arrivent en gros porteur le matin, avec dix palettes au maximum par véhicule. Une commande standard passée en journée rejoint la tournée du lendemain à 6 h 30. Les urgences Express arrivent après trente minutes : camionnette jusqu’à deux palettes, petit porteur jusqu’à quatre. Une grosse urgence se répartit sur plusieurs véhicules, avec une seule facture et les mêmes frais de commande. Les anciens véhicules déjà en route terminent leur trajet sans changement. Chaque véhicule utilise un quai réel, avec alignement, recul, déchargement et départ. La réserve pleine peut bloquer un produit ou déposer sa palette dans le tampon extérieur. Le chariot moyen de 24 articles est disponible dès le départ ; le petit modèle n’est plus proposé. Un chargement peut réunir trois familles, avec réservations distinctes, collecte successive en réserve et dépôt dans chacun de leurs rayons. Le grand chariot porte 48 articles et l’hyper chariot 96 articles, après déblocage du grand modèle pour 7 200 €. Les employés transportent puis rangent les cartons ; les arrêts devant les racks gardent une distance suffisante pour le nez du transpalette.

Les clients viennent avec un sac (jusqu’à six articles prévus), un mini-chariot (jusqu’à quinze) ou un caddie. Le contenu visible suit les produits pris en rayon. Les caisses attendent l’arrivée du client avant déchargement, scan, récupération et paiement. La caisse automatique accepte **dix articles maximum**, avec supervision par un employé des caisses.

Les alertes de stock restent visibles dans la vue principale : rayons vides, seuil bas à 15 % (ou douze articles), réserves épuisées ou réduites à douze articles. Une nouvelle rupture déclenche un avertissement et chaque alerte mène au produit ou à sa commande. Les familles sans rayon installé ne génèrent aucune fausse alerte.

Satisfaction présente les grands indicateurs : disponibilité globale, attente aux caisses et départs sans achat, avec leurs effets sur le score. Aucun détail par famille ni bouton de gestion des rayons. Chaque chiffre provient de la simulation. La mesure d’une ancienne partie commence à la mise à jour, sans inventer son historique.

Le vol affecte le paiement des articles réellement sortis du stock : 1 % par article aux caisses classiques, 4 % à la caisse automatique en surveillance simple. Les caméras divisent ces taux par deux (600 € à installer, 25 €/jour) ; caméras et contrôle les divisent par cinq (1 400 €, 60 €/jour). Finances suit articles volés, ventes perdues et valeur d’achat, sans déduire deux fois la perte. Le tirage aléatoire et les compteurs sont sauvegardés.

Drive et e-commerce partagent le stock du magasin. Les paniers sont réservés puis prélevés par des préparateurs, emballés et remis au client drive ou au transporteur. L’encaissement attend la remise ou l’expédition. Stocks, commandes, équipes, TVA, impôt, salaire du directeur et réinvestissement personnel se poursuivent d’un jour à l’autre.

Le magasin se prépare dès 5 h : réception des livraisons et remplissage des rayons sans clients, puis ouverture automatique à 8 h. La fermeture à 20 h enchaîne sur la préparation du lendemain ; les commandes groupées sont reçues le matin suivant. Les anciennes journées clôturées sont conservées.

Le résultat utilise le coût moyen d’achat HT des articles vendus ou perdus. Les marchandises invendues restent valorisées, en rayon, réserve, chargement, panier non payé, commandes clients préparées et livraisons facturées. Les remises modifient ce coût moyen. Le stock initial est valorisé au prix de référence ; le passage d’une ancienne sauvegarde utilise les stocks, ventes et commandes disponibles sans refaire ses anciens bilans.

Les factures fournisseurs sont enregistrées à la commande, avec paiement comptant, à J+7 (défaut du jeu) ou J+30. Le délai choisi concerne les prochaines factures. Les factures échues sont réglées à la clôture dans la limite de la trésorerie ; un paiement partiel conserve le solde dû. Un règlement anticipé est possible dans Finances. La TVA du jeu reste comptabilisée à la facturation ; les factures anciennes déjà payées ne sont pas recréées. Résultat, variation de trésorerie et dette fournisseur sont séparés.

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

Le suivi des journées affiche la marge brute (ventes HT moins coût des articles vendus) et la marge après charges communes (marge brute moins charges quotidiennes et salaire du directeur), en euros et en pourcentage des ventes HT. Les autres frais, pertes et impôts restent pris en compte dans le résultat net. Les alertes de stock sont intégrées à l’onglet Rayons, placé en premier, et chaque raccourci vers la réserve indique sa quantité.

Le salaire du directeur se définit en brut annuel ; le montant journalier est calculé sur 365 jours et payé à la fermeture, dans la limite de la trésorerie disponible. Les anciennes sauvegardes conservent leur montant journalier et affichent son équivalent annuel.

La section Mon argent rassemble le salaire brut annuel, un pourcentage du bénéfice positif avant impôt (après charges et salaire fixe), les versements, le solde et les réinvestissements. La prime est payée une seule fois à la fermeture, limitée par la trésorerie et déduite avant calcul de l’impôt. Les anciennes sauvegardes démarrent sans prime. Les nouvelles commandes accessibles au joueur commencent à 240 articles ; les anciennes commandes restent livrables. Les équipements en service peuvent être déplacés pendant la pause, avec trajets et points de travail recalculés sans perdre les articles transportés.

La Poste collecte tous les colis web prêts une seule fois par jour à 17 h ; les colis prêts après ce passage attendent le lendemain sans être annulés. Le montant encaissé apparaît près du véhicule au drive et à la collecte web (total du chargement), sans rejouer les anciennes ventes au chargement de la sauvegarde.

Les horaires se règlent dans Finances, entre 05:00 et 23:00 (au moins une heure). En préparation ils s’appliquent aujourd’hui ; une fois ouvert, le changement prend effet demain. La préparation commence à 05:00. Le groupage part à la fermeture. La Poste collecte une fois à 17:00, ou vingt minutes avant une fermeture plus tôt.
La satisfaction affiche des notes A à E pour la disponibilité, l’attente et les achats aboutis. La note globale pondère ces trois scores (50 %, 30 %, 20 %). Seuils : A ≥95, B ≥85, C ≥70, D ≥50, E en dessous. La disponibilité suit les demandes servies (avant les premières demandes : rayons approvisionnés) ; l’attente utilise le maximum entre la moyenne du jour et l’attente actuelle, avec 7 points retirés par minute ; les achats aboutis mesurent les départs sans achat parmi les visites terminées. Les mesures détaillées sont conservées en sauvegarde.

Les jauges de réserve distinguent le stock présent, les commandes fournisseurs en cours (bleu) et les lots prévus pour le soir (bleu hachuré). Les articles déchargés restent en commande jusqu’au rangement en réserve ; le volume attendu et les dépassements de capacité sont affichés.

L’échelle des surfaces est multipliée par cinq : 1 085 m², 1 585 m² et 2 060 m² avant agrandissements. Le loyer, l’électricité liée à la surface, l’assurance et l’entretien suivent cette surface ; les salaires et frais fixes des équipements restent séparés. Les bilans clôturés conservent leurs charges historiques.
