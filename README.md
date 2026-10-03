# Market Front

Nom de travail d'un jeu de gestion de supermarché. Le joueur est le directeur et pilote le magasin depuis une vue d'ensemble.

## Première version

- Six rayons et une réserve à capacité limitée.
- Vue 3D simplifiée, rayons en volume, clients avec chariots, employés et camions animés. Rotation et zoom de la caméra.
- Clients, paniers, attente en caisse et abandons.
- Huit employés à répartir entre caisses, préparation en réserve, mise en rayon et réception.
- Réserve organisée par produit, avec emplacements 3D et détail des stocks et des unités réservées aux chargements.
- Réapprovisionnement par chargements : petit chariot (8 unités), grand chariot (24 unités), puis lève-palette (48 unités), toujours avec un employé.
- Deux fournisseurs avec prix et délais différents, réception des palettes.
- Remises par quantité, frais de livraison par commande et déclenchements automatiques configurables par produit.
- Trésorerie, ventes, charges quotidiennes et investissement en caisse automatique.
- Journées calmes, rush de midi, week-end, Black Friday et fêtes.
- Journées en continu, vitesse conservée et bilans consultables sans arrêter le magasin.

Cette version constitue une première boucle jouable. Le placement libre des rayons, le recrutement, les produits périssables et les contrats fournisseurs restent à développer. Les parties ne sont pas encore sauvegardées entre deux rechargements.

## Pistes pour approfondir la chaîne

Priorités de déchargement et de mise en rayon, emplacements de réserve, quais limités, fiabilité des fournisseurs et anticipation des invendus. Ces pistes ont été discutées pour une prochaine version et ne font pas partie de la première boucle.

## Réapprovisionnement

Dans **Équipes → Réserve → rayons**, le directeur choisit le matériel de l’équipe. Le petit chariot est inclus. Les grands chariots coûtent 1 200 € pour équiper l’équipe ; les lève-palettes se débloquent ensuite pour 3 600 €. Le matériel acheté reste disponible les jours suivants et peut être sélectionné sans être payé à nouveau.

Les préparateurs en réserve chargent les lots, avec un chargement préparé à la fois par préparateur. Les employés de mise en rayon les transportent par les allées, remplissent le rayon, puis reviennent. Les grandes capacités réduisent les allers-retours, avec un chargement et un déplacement plus longs. Les achats s’appliquent aux prochains chargements ; les trajets en cours conservent leur matériel. Sans préparateur, les équipements restent en attente. Sans employé de mise en rayon, ils ne fonctionnent pas.

Les unités transportées sont suivies séparément : elles ne sont pas encore vendables en rayon. Les chargements coordonnent les places disponibles pour éviter de remplir plusieurs fois le même rayon. Réaffecter un employé ou fermer le magasin ramène son éventuel chargement restant en réserve. La réception préserve la place nécessaire à ces retours.

Dans l’onglet **Réserve**, chaque produit affiche son stock physique et la part affectée à des chargements. Le stock quitte la réserve uniquement lorsque la préparation du chargement est terminée.

## Commandes fournisseurs

L’onglet **Livraisons** compare les quantités de 12, 48, 120 et 240 unités, avec le prix après remise et le coût livré par article. Centrale Nord facture 35 € de livraison et applique 4 %, 8 % puis 12 % de remise à partir de 48, 120 et 240 unités. Express Marché facture 75 € et applique 2 %, 5 % puis 8 %. Les prix unitaires sont arrondis au centime avant le calcul de la commande. Les frais sont facturés une fois par commande mono-produit.

Le directeur peut activer un seuil et définir une quantité et un fournisseur pour chaque produit. Le stock suivi comprend les rayons, la réserve, les marchandises sur les équipements et les livraisons en cours. Une commande en attente empêche les commandes automatiques supplémentaires pour le même produit. Si la trésorerie ne couvre pas les produits et les frais, le jeu signale le blocage et réessaie pendant l’ouverture. L’automatisme est désactivé au début d’une nouvelle partie.

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

Le serveur local affiche son adresse, par défaut http://localhost:3000. Les fichiers publics sont dans `dist/`. `dist/engine.js` contient la simulation indépendamment de l'interface ; `dist/game.js` contient l'interface ; `dist/scene.js` gère la scène 3D et ses animations. Un navigateur avec WebGL est nécessaire. Les déplacements sont une représentation simplifiée de la simulation, avec des parcours d’allée prédéfinis.

## Git et publication

Le dépôt est indépendant d'Emergency Front. La branche principale est `main`. Les fichiers de `dist/` sont suivis dans Git et constituent directement la version publiée.

La destination Sites est enregistrée dans `.openai/hosting.json`. Une publication doit correspondre à un commit poussé, puis à une version déployée avec succès. Aucun identifiant secret ne doit être enregistré dans Git.
