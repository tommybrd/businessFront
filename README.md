# Market Front

Nom de travail d'un jeu de gestion de supermarché. Le joueur est le directeur et pilote le magasin depuis une vue d'ensemble.

## Première version

- Magasin en plein écran, commandes en surimpression et panneaux contextuels au clic sur les rayons, emplacements de réserve, caisses, employés et quai.
- Six familles de produits, avec allées élargies, étals en bois pour les fruits et légumes et articles individuels serrés sur cinq niveaux pour les autres produits, 24 articles en façade et cinq rangées en profondeur et jauges intégrées aux meubles ; chiffres de stock accessibles au clic, sans grandes étiquettes flottantes ; réserve organisée par produit avec une capacité propre à chaque famille.
- Parking clients extérieur relié à la route principale, rues périphériques, trottoirs, passages piétons, accès de livraison, arbres et commerces voisins autour du magasin. Le cadrage initial montre les abords et les voitures suivent les voies d’accès et l’allée centrale du parking. Les voitures et piétons représentent les clients de la simulation, sans gestion des places pour le moment.
- Vue 3D simplifiée, clients avec caddies vides puis remplis des articles réellement pris en rayon, employés et camions animés. Rotation, déplacement et zoom de la caméra.
- Clients, paniers, attente en caisse et abandons. Chaque caisse traite un seul client à la fois, avec un temps d’encaissement lié au panier. Les articles quittent le caddie un par un, avancent sur le tapis, passent au scanner avec un signal vert et un bip désactivable dans Caisses, puis reviennent dans le caddie. Le montant réellement encaissé apparaît brièvement au-dessus du caddie au paiement. Les files avancent directement à leur poste, sans repartir parcourir le magasin. Les caisses sont tournées de 90° ; après paiement les clients passent devant le comptoir puis rejoignent la sortie.
- Effectifs sans plafond, choisis par équipe : encaissement, mise en rayon et déchargement des livraisons. Les salaires suivent les effectifs présents à la fermeture (85 € par employé et par jour, plus 160 € de fonctionnement et les frais quotidiens des caisses). Tenues vertes distinctes par métier ; les employés non affectés ne sont pas montrés.
- Réserve organisée par produit sur des racks à trois niveaux au départ, puis quatre et cinq après agrandissement, avec cartons correspondant au stock réel, emplacements 3D et détail des stocks et des unités réservées aux chargements.
- Réapprovisionnement par chargements : petit chariot (8 unités), chariot moyen (24 unités), puis grand chariot (48 unités), toujours avec un employé.
- Deux fournisseurs avec prix et délais différents. Tampon extérieur limité à 30 palettes et trois quais avec file d’attente, alignement, marche arrière et départ des camions. Chaque palette quitte le camion entière sur un transpalette et se vide progressivement pendant le rangement dans son emplacement de réserve. La dernière palette d’une commande peut être partielle.
- Commandes fournisseurs manuelles, remises par quantité et frais de livraison mutualisés pour le groupage du soir.
- Trésorerie du magasin, compte personnel du directeur, salaire quotidien réglable, TVA et impôt avec paiement automatique ou manuel.
- Agrandissements séparés des rayons, de la réserve et de la zone de paiement ; possibilité de jeter du stock non engagé pour libérer l’emplacement d’un produit.
- Journées calmes, rush de midi, week-end, Black Friday et fêtes.
- Journées en continu, vitesse conservée et bilans consultables sans arrêter le magasin.

Les rayons commencent avec 480 articles chacun ; chaque article visible correspond à une unité de stock. Le panneau flottant « Réserve » a été retiré, les emplacements restent accessibles au clic ou depuis le menu.

Cette version constitue une boucle jouable. Le placement libre des rayons, la gestion RH, les produits périssables et les contrats fournisseurs restent à développer. Les caddies des clients ayant abandonné leurs achats redeviennent vides quand les produits sont remis en stock. Les parties ne sont pas encore sauvegardées entre deux rechargements.

## Disposition v0.6.2

Le magasin commence avec quatre meubles au lieu de six : un étal fruits et légumes, un meuble boulangerie et deux gondoles à double face. Produits frais / épicerie et boissons / maison partagent des faces opposées. Les six familles gardent chacune leurs 600 places, leurs 480 articles initiaux et la même densité de présentation (cinq niveaux, 24 articles en façade, cinq en profondeur). Les clients et employés rejoignent la face correspondant au produit. Les boutons d’affectation comptent les faces ; les agrandissements ajoutent six meubles simples.

## Équilibrage v0.6.1

Les capacités restent de 600 articles par meuble et 500 en réserve par famille (750 puis 1 000 après agrandissement). Les clients font maintenant des courses plus importantes : 20 % de petites visites de 2–3 lignes de 1–2 articles, et 80 % de paniers de 4–6 lignes de 3–6 articles. Une ligne représente une famille, qui peut apparaître plusieurs fois. Les pics horaires et événements multiplient la fréquentation existante.

La mise en rayon automatique démarre à 75 % de remplissage ou moins ; elle privilégie les chargements complets quand il reste assez de stock. Le bouton Réapprovisionner permet de remplir avant ce seuil et donne la priorité au produit. Les trajets sont légèrement plus rapides, les capacités des trois chariots restent 8, 24 et 48. Une caisse garde un seul client et scanne toujours les articles un par un : 3 minutes de base plus une minute par tranche de 8 articles, pour que les grands paniers ne bloquent pas artificiellement toute la chaîne.

`npm run balance` compare des journées complètes sur trois graines identiques, avec 480 articles au départ en rayon, 500 en réserve, quatre caisses et aucune livraison. En moyenne, une journée normale demande environ 3 540 articles : sans mise en rayon, environ 660 manquent ; cinq employés avec des chariots moyens évitent ces ruptures. Un samedi demande environ 5 650 articles : les petits, moyens et grands chariots laissent respectivement environ 2 050, 820 et 30 articles manquants. Black Friday exige aussi des livraisons ciblées pour Maison & entretien ; une réserve pleine et de grands chariots ne suffisent pas seuls. Ces scénarios contrôlent la conservation des articles à chaque minute. Les résultats correspondent à ces conditions de test, pas à une garantie pour toutes les configurations.

## Pistes pour approfondir la chaîne

Priorités de déchargement et de mise en rayon, emplacements de réserve personnalisables, fiabilité des fournisseurs et anticipation des invendus. Ces pistes ont été discutées pour une prochaine version et ne font pas partie de la première boucle.

## Réapprovisionnement

Dans **Équipes → Réserve → rayons**, le directeur choisit le matériel de l’équipe. Le petit chariot est inclus. Les chariots moyens coûtent 1 200 € pour équiper l’équipe ; les grands chariots se débloquent ensuite pour 3 600 €. Le transpalette est réservé au déchargement des livraisons. Le matériel acheté reste disponible les jours suivants et peut être sélectionné sans être payé à nouveau.

Les employés de mise en rayon prennent eux-mêmes les articles dans l’emplacement de réserve du produit, chargent leur chariot, le transportent par les allées et remplissent le rayon avant de revenir. Les chargements sont simultanés et ne dépendent pas d’une équipe de préparation séparée. Les grandes capacités réduisent les allers-retours, avec un chargement et un déplacement plus longs. Les trajets en cours conservent leur matériel. Sans employé de mise en rayon, les chariots ne fonctionnent pas.

Les unités transportées sont suivies séparément : elles ne sont pas encore vendables en rayon. Les chargements coordonnent les places disponibles pour éviter de remplir plusieurs fois le même rayon. Réaffecter un employé ou fermer le magasin ramène son éventuel chargement restant en réserve. Le déchargement préserve la place nécessaire à ces retours.

Le bouton **Réapprovisionner** d’un rayon demande un réapprovisionnement prioritaire depuis la réserve. Il conserve la préparation et le transport physiques, sans déplacer instantanément des articles. Le réapprovisionnement automatique continue pour les autres rayons. Le bouton **Voir la réserve** ouvre l’emplacement du produit ; c’est depuis cet emplacement que **Commander** mène aux fournisseurs.

Dans **Réserve**, des quantités standards et un bouton permettent d’ajouter directement un lot Centrale Nord au groupage du soir, avec son prix TTC et les 10 € de port mutualisés explicités. Le choix remplace le lot déjà prévu pour ce produit, sans achat immédiat ni récurrence. Chaque produit affiche les unités envoyées aux rayons et les unités effectivement vendues lors de la dernière journée clôturée. Chaque produit affiche son stock physique, sa propre capacité et la part affectée à des chargements. Le stock quitte la réserve uniquement lorsque la préparation du chargement est terminée. Chaque famille dispose initialement de 500 places ; la saturation d’une famille ne bloque pas le rangement d’une autre. Le déchargement protège aussi les places nécessaires aux marchandises sur les équipements et aux retours de paniers.

**Jeter du stock** retire uniquement des unités non réservées, sans remboursement. Les transpalettes de déchargement déplacent une palette entière de 48 unités au maximum ; ils déposent la palette dehors si la réserve du produit ne peut pas accueillir tout son contenu, dans la limite des 30 emplacements du tampon extérieur. Si le tampon est plein, les palettes de produits pouvant être rangées restent déchargeables. Les cartons gardent les mêmes dimensions dans le camion, sur le transpalette, dehors et dans les racks (12 unités par carton ; une palette complète contient quatre cartons). Ils sont rangés progressivement dans les racks ; les produits en transport ne sont pas comptés deux fois dans les commandes en cours. Réaffecter le manutentionnaire ou terminer la journée ramène le chargement restant dans sa palette d’origine, dans le camion ou dans le tampon extérieur.

## Agrandissements

Chaque zone a deux agrandissements payants. La zone des rayons passe de 6 à 12 puis 18 emplacements de mobilier (3 000 € puis 5 000 €). Les six nouveaux meubles sont visibles et attendent une affectation. Dans Rayons, le directeur choisit le nombre de meubles par famille avec les boutons − et + : chaque étagère ou étal occupe un emplacement et offre 600 articles de capacité. Une famille peut occuper plusieurs meubles ; le stock affiché est réparti sans duplication. Retirer un meuble est refusé si les articles présents, en transport ou dans les paniers ne tiennent plus dans les meubles restants. La réserve passe de 500 à 750 puis 1 000 places **par famille** (2 500 € puis 4 500 €). La zone de paiement passe de quatre à six puis huit caisses (2 000 € puis 3 500 €). Les dimensions du bâtiment et les équipements changent en 3D. Les effectifs se choisissent librement dans Équipes, indépendamment des agrandissements. Chaque caisse installée coûte aussi 5 € de fonctionnement par jour, même fermée ; une caisse automatique ajoute 8 € par jour, indépendamment de son achat. Ces coûts et les salaires sont détaillés séparément dans Finances et payés une seule fois à la clôture. Les caisses physiques limitent toujours le nombre de postes d’encaissement actifs ; les caissiers supplémentaires attendent un poste disponible.

Les files sont affectées aux postes ouverts. Fermer un poste remet son client en attente sans le facturer. À la fermeture du magasin, seul le client déjà servi à chaque poste termine son paiement ; les paniers non servis sont remis en stock.

## Commandes fournisseurs

L’onglet **Livraisons** compare les quantités de 12, 24, 48, 120, 240, 480, 720 et 1 000 unités, avec le prix après remise et le coût livré par article. Centrale Nord facture 35 € de livraison et applique 4 %, 8 % puis 12 % de remise à partir de 48, 120 et 240 unités. Express Marché facture 150 € pour une livraison flash et applique 2 %, 5 % puis 8 %. Le bandeau des livraisons montre les palettes et quantités par produit encore dans les camions. Les commandes acceptent des quantités entières de 12 à 1 000 par produit : le dernier carton et la dernière palette peuvent être partiels. Les prix unitaires sont arrondis au centime avant le calcul de la commande. Les remises sont calculées par lot de produit. Une livraison flash est facturée immédiatement ; le groupage du soir facture seulement 10 € une fois par fournisseur, quel que soit le nombre de produits ou de camions.

Les quantités se choisissent directement dans huit carrés : **12, 24, 48, 120, 240, 480, 720 ou 1 000 unités**. Le prix, la remise et le coût livré se mettent à jour dès le choix du lot ou du fournisseur. Un accès en surimpression montre les livraisons en route ou au quai. Le suivi détaillé précède le formulaire et affiche chaque camion, son contenu par produit et quantité, le détail de chaque palette (articles, cartons pleins, carton partiel et état), son délai, sa manœuvre et ses palettes restantes. **Voir les quais** cadre la caméra sur les trois accès de livraison.

Depuis un rayon, **Réapprovisionner** demande le remplissage depuis la réserve. Depuis la réserve, **Commander** propose deux achats :

- **Flash** : livraison spécifique Express Marché, frais de port 150 €, paiement immédiat, arrivée après 30 minutes de jeu puis manœuvre au quai.
- **Groupée ce soir** : livraison 10 € par fournisseur, panier modifiable sans paiement immédiat, un lot par produit. À 20 h, les lignes sont regroupées par fournisseur et facturées avec des frais de livraison partagés. L’envoi se fait une seule fois à la clôture ; l’arrivée a lieu le jour de jeu suivant après le délai fournisseur. Sans trésorerie suffisante, le panier est conservé jusqu’à la clôture suivante. Les produits peuvent être retirés avant l’envoi.

Chaque camion transporte au plus dix palettes. Il attend un quai libre, s’aligne, recule, ouvre ses portes et reste accosté jusqu’à la sortie de toutes ses palettes et au retour des manutentionnaires. Si la réserve du produit est pleine, les palettes sont déposées entières dans une zone extérieure de 30 emplacements ; les autres palettes peuvent être déchargées et le camion repart. Les employés reprennent ensuite les palettes extérieures dès qu’une palette entière tient dans son emplacement. Les places engagées par des transports restent réservées pour empêcher un dépassement. Les transpalettes entrent dans le camion par le quai, enlèvent une palette entière et la transportent jusqu’à l’emplacement du produit ; les cartons se vident pendant le rangement. Une palette inaccessible derrière une autre attend le dégagement de son passage.

Les commandes récurrentes automatiques ont été retirées : seuls les achats explicitement demandés au fournisseur sont exécutés. Les employés continuent à réapprovisionner les rayons à partir du stock disponible.

## Compte personnel et taxes

Le bandeau affiche le résultat net estimé du jour : ventes HT moins achats et investissements HT, toutes les charges prévues de la journée, salaire estimé du directeur et impôt. Les apports personnels et les remboursements de taxes des jours précédents n’y sont pas comptés comme des gains ou pertes du jour. Dans Finances, un tableau conserve chaque journée clôturée : ventes HT, achats HT, charges et salaire, impôt, résultat net, TVA exigible et variation de trésorerie. Cette dernière inclut les apports et les paiements effectifs de taxes.

Le salaire du directeur est réglable dans **Finances**, de 0 à 1 000 € par jour ; il est désactivé au départ. Il est versé à la clôture depuis le magasin, dans la limite des liquidités restantes après les charges de fonctionnement. Le solde personnel et les mouvements sont suivis séparément. Le directeur peut réinvestir ce solde dans le magasin : cet apport n’est pas enregistré comme une vente.

Les prix de vente, commandes, frais de livraison et investissements sont TTC, avec 20 % de TVA incluse. La TVA est collectée lors de l’encaissement ; celle des achats et investissements est déductible, avec arrondi par transaction au centime. Un crédit négatif est reporté sur les jours suivants.

La fiscalité du jeu est simplifiée : l’impôt est de 20 % du résultat quotidien positif hors TVA, calculé après les achats, investissements, charges et salaire effectivement versé au directeur. Les achats de stock et investissements sont déduits immédiatement dans cette règle de jeu. Les dettes de TVA et d’impôt sont distinctes ; leur paiement automatique à la fermeture peut être désactivé pour les régler manuellement. Un paiement réduit la trésorerie une seule fois et reste retracé dans le bilan du jour concerné.

## Caméra et journées

**ZQSD** déplace la caméra par rapport à la vue, **A/E** la fait tourner, la molette zoome. La souris permet aussi de tourner et de déplacer la vue. **Recentrer** retrouve le cadrage initial. Les touches ne déplacent pas la caméra pendant la saisie dans un champ ou la consultation d’un bilan.

La première ouverture se déclenche manuellement. Ensuite, le jour suivant démarre automatiquement avec la même vitesse, les mêmes stocks, équipes et équipements. Les charges sont payées une fois par journée. Le bilan est accessible dans **Finances** pendant que le jeu continue. Seule la faillite termine la partie.

## Développement

Node.js 20 ou supérieur. Three.js est la seule dépendance et ses modules sont inclus dans les fichiers publiés.

```sh
npm ci
npm run build
npm run dev
npm run check
npm test
```

Le serveur local affiche son adresse, par défaut http://localhost:3000. Les fichiers publics sont dans `dist/`. `dist/engine.js` contient la simulation indépendamment de l'interface ; `dist/checkout-flow.js` suit les files et l’encaissement par poste ; `dist/game.js` contient l'interface ; `dist/scene.js` gère la scène 3D et ses animations, `dist/checkout-visuals.js` anime les articles, le scanner et le paiement, avec les modèles d’articles, tenues et abords dans `dist/scene-details.js`. `dist/delivery-logistics.js` suit les manœuvres et les quais ; `dist/delivery-scene.js` représente les camions et leurs palettes réelles. Un navigateur avec WebGL est nécessaire. Les déplacements sont une représentation simplifiée de la simulation, avec des parcours d’allée prédéfinis.

## Git et publication

Le dépôt est indépendant d'Emergency Front. La branche principale est `main`. Les fichiers de `dist/` sont suivis dans Git et constituent directement la version publiée.

La destination Sites est enregistrée dans `.openai/hosting.json`. Une publication doit correspondre à un commit poussé, puis à une version déployée avec succès. Aucun identifiant secret ne doit être enregistré dans Git.


## To-do : fonctions support et compétitivité

Idées demandées pour de prochaines versions, non implémentées :

- [ ] Direction RH / DRH : aide au recrutement, à l’organisation et au dimensionnement des équipes, avec une progression à définir. Pour l’instant, aucun plafond d’effectif.
- [ ] Achats et négociation fournisseurs : comparer les offres, négocier les contrats et obtenir des prix d’achat plus compétitifs.
- [ ] Analyse des prix et marges : aider le directeur à choisir des prix de vente compétitifs et à suivre la rentabilité par produit.
- [ ] Autres fonctions support : assistance à la gestion des stocks, aux prévisions de demande et à la trésorerie.
