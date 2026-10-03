# Market Front

Nom de travail d'un jeu de gestion de supermarché. Le joueur est le directeur et pilote le magasin depuis une vue d'ensemble.

## Première version

- Magasin en plein écran, commandes en surimpression et panneaux contextuels au clic sur les rayons, emplacements de réserve, caisses, employés et quai.
- Six rayons avec articles individuels et jauges de stock ; réserve organisée par produit avec une capacité propre à chaque famille.
- Parking clients, passage piéton, routes, accès de livraison et arbres autour du magasin. Les voitures et piétons représentent les clients de la simulation, sans gestion des places pour le moment.
- Vue 3D simplifiée, clients avec chariots, employés et camions animés. Rotation, déplacement et zoom de la caméra.
- Clients, paniers, attente en caisse et abandons.
- Huit employés à répartir entre encaissement, préparation des chariots, mise en rayon et déchargement des livraisons. Tenues vertes distinctes par métier ; les employés non affectés ne sont pas montrés.
- Réserve organisée par produit, avec emplacements 3D et détail des stocks et des unités réservées aux chargements.
- Réapprovisionnement par chargements : petit chariot (8 unités), grand chariot (24 unités), puis lève-palette (48 unités), toujours avec un employé.
- Deux fournisseurs avec prix et délais différents. Les palettes du quai se vident pendant les chargements sur transpalette, puis les marchandises sont transportées et rangées par produit.
- Remises par quantité, frais de livraison par commande et déclenchements automatiques configurables par produit.
- Trésorerie du magasin, compte personnel du directeur, salaire quotidien réglable, TVA et impôt avec paiement automatique ou manuel.
- Agrandissements séparés des rayons, de la réserve et de la zone de paiement ; possibilité de jeter du stock non engagé pour libérer l’emplacement d’un produit.
- Journées calmes, rush de midi, week-end, Black Friday et fêtes.
- Journées en continu, vitesse conservée et bilans consultables sans arrêter le magasin.

Cette version constitue une boucle jouable. Le placement libre des rayons, le recrutement, les produits périssables et les contrats fournisseurs restent à développer. Les parties ne sont pas encore sauvegardées entre deux rechargements.

## Pistes pour approfondir la chaîne

Priorités de déchargement et de mise en rayon, emplacements de réserve, quais limités, fiabilité des fournisseurs et anticipation des invendus. Ces pistes ont été discutées pour une prochaine version et ne font pas partie de la première boucle.

## Réapprovisionnement

Dans **Équipes → Réserve → rayons**, le directeur choisit le matériel de l’équipe. Le petit chariot est inclus. Les grands chariots coûtent 1 200 € pour équiper l’équipe ; les lève-palettes se débloquent ensuite pour 3 600 €. Le matériel acheté reste disponible les jours suivants et peut être sélectionné sans être payé à nouveau.

Les préparateurs en réserve chargent les lots, avec un chargement préparé à la fois par préparateur. Les employés de mise en rayon les transportent par les allées, remplissent le rayon, puis reviennent. Les grandes capacités réduisent les allers-retours, avec un chargement et un déplacement plus longs. Les achats s’appliquent aux prochains chargements ; les trajets en cours conservent leur matériel. Sans préparateur, les équipements restent en attente. Sans employé de mise en rayon, ils ne fonctionnent pas.

Les unités transportées sont suivies séparément : elles ne sont pas encore vendables en rayon. Les chargements coordonnent les places disponibles pour éviter de remplir plusieurs fois le même rayon. Réaffecter un employé ou fermer le magasin ramène son éventuel chargement restant en réserve. Le déchargement préserve la place nécessaire à ces retours.

Le bouton **Remplir** d’un rayon demande un réapprovisionnement prioritaire depuis la réserve. Il conserve la préparation et le transport physiques, sans déplacer instantanément des articles. Le réapprovisionnement automatique continue pour les autres rayons. Le bouton **Voir la réserve** ouvre l’emplacement du produit ; c’est depuis cet emplacement que **Commander** mène aux fournisseurs.

Dans **Réserve**, chaque produit affiche son stock physique, sa propre capacité et la part affectée à des chargements. Le stock quitte la réserve uniquement lorsque la préparation du chargement est terminée. Chaque famille dispose initialement de 100 places ; la saturation d’une famille ne bloque pas le rangement d’une autre. Le déchargement protège aussi les places nécessaires aux marchandises sur les équipements et aux retours de paniers.

**Jeter du stock** retire uniquement des unités non réservées, sans remboursement. Les commandes automatiques restent actives si elles ont été configurées. Les transpalettes de déchargement déplacent jusqu’à 48 unités à la fois ; les produits en transport ne sont pas comptés deux fois dans les commandes en cours. Réaffecter le manutentionnaire ou terminer la journée ramène son chargement au quai.

## Agrandissements

Chaque zone a deux agrandissements payants. Les rayons passent de 64 à 96 puis 128 articles par rayon (3 000 € puis 5 000 €). La réserve passe de 100 à 150 puis 200 places **par famille** (2 500 € puis 4 500 €). La zone de paiement passe de quatre à six puis huit caisses (2 000 € puis 3 500 €). Les dimensions du bâtiment et les équipements changent en 3D. Les agrandissements ne créent aucun employé supplémentaire ; il faut réaffecter les huit employés existants.

## Commandes fournisseurs

L’onglet **Livraisons** compare les quantités de 12, 48, 120 et 240 unités, avec le prix après remise et le coût livré par article. Centrale Nord facture 35 € de livraison et applique 4 %, 8 % puis 12 % de remise à partir de 48, 120 et 240 unités. Express Marché facture 75 € et applique 2 %, 5 % puis 8 %. Les prix unitaires sont arrondis au centime avant le calcul de la commande. Les frais sont facturés une fois par commande mono-produit.

Les quantités se choisissent dans une liste de lots standards de 12, 24, 48, 120 ou 240 unités, pour les commandes manuelles comme automatiques. Un réglage d’une autre quantité valide reste affiché s’il a été enregistré par les actions partagées. Un accès en surimpression montre le nombre de livraisons en route ou au quai. Le suivi détaillé est placé avant le formulaire de commande, avec le délai, les articles restant sur les palettes et les articles en transport vers la réserve.

Le directeur peut activer un seuil et définir une quantité et un fournisseur pour chaque produit. Le stock suivi comprend les rayons, la réserve, les marchandises sur les équipements de réapprovisionnement et de déchargement, ainsi que les livraisons en cours. Une commande en attente empêche les commandes automatiques supplémentaires pour le même produit. Si la trésorerie ne couvre pas les produits et les frais, le jeu signale le blocage et réessaie pendant l’ouverture. L’automatisme est désactivé au début d’une nouvelle partie.

## Compte personnel et taxes

Le salaire du directeur est réglable dans **Finances**, de 0 à 1 000 € par jour ; il est désactivé au départ. Il est versé à la clôture depuis le magasin, dans la limite des liquidités restantes après les charges de fonctionnement. Le solde personnel et les mouvements sont suivis séparément. Le directeur peut réinvestir ce solde dans le magasin : cet apport n’est pas enregistré comme une vente.

Les prix de vente, commandes, frais de livraison et investissements sont TTC, avec 20 % de TVA incluse. La TVA est collectée lors de l’encaissement ; celle des achats et investissements est déductible, avec arrondi par transaction au centime. Un crédit négatif est reporté sur les jours suivants.

La fiscalité du jeu est simplifiée : l’impôt est de 20 % du résultat quotidien positif hors TVA, calculé après les achats, investissements, charges et salaire effectivement versé au directeur. Les achats de stock et investissements sont déduits immédiatement dans cette règle de jeu. Les dettes de TVA et d’impôt sont distinctes ; leur paiement automatique à la fermeture peut être désactivé pour les régler manuellement. Un paiement réduit la trésorerie une seule fois et reste retracé dans le bilan du jour concerné.

## Caméra et journées

**ZQSD** déplace la caméra par rapport à la vue, **A/E** la fait tourner, la molette zoome. La souris permet aussi de tourner et de déplacer la vue. **Recentrer** retrouve le cadrage initial. Les touches ne déplacent pas la caméra pendant la saisie dans un champ ou la consultation d’un bilan.

La première ouverture se déclenche manuellement. Ensuite, le jour suivant démarre automatiquement avec la même vitesse, les mêmes stocks, équipes, équipements et seuils. Les charges sont payées une fois par journée. Le bilan est accessible dans **Finances** pendant que le jeu continue. Seule la faillite termine la partie.

## Développement

Node.js 20 ou supérieur. Three.js est la seule dépendance et ses modules sont inclus dans les fichiers publiés.

```sh
npm ci
npm run build
npm run dev
npm run check
npm test
```

Le serveur local affiche son adresse, par défaut http://localhost:3000. Les fichiers publics sont dans `dist/`. `dist/engine.js` contient la simulation indépendamment de l'interface ; `dist/game.js` contient l'interface ; `dist/scene.js` gère la scène 3D et ses animations, avec les modèles d’articles, tenues et abords dans `dist/scene-details.js`. Un navigateur avec WebGL est nécessaire. Les déplacements sont une représentation simplifiée de la simulation, avec des parcours d’allée prédéfinis.

## Git et publication

Le dépôt est indépendant d'Emergency Front. La branche principale est `main`. Les fichiers de `dist/` sont suivis dans Git et constituent directement la version publiée.

La destination Sites est enregistrée dans `.openai/hosting.json`. Une publication doit correspondre à un commit poussé, puis à une version déployée avec succès. Aucun identifiant secret ne doit être enregistré dans Git.
