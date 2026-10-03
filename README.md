# Market Front

Nom de travail d'un jeu de gestion de supermarché. Le joueur est le directeur et pilote le magasin depuis une vue d'ensemble.

## Première version

- Six rayons et une réserve à capacité limitée.
- Vue 3D simplifiée, rayons en volume, clients avec chariots, employés et camions animés. Rotation et zoom de la caméra.
- Clients, paniers, attente en caisse et abandons.
- Huit employés à répartir entre caisses, mise en rayon et réception.
- Deux fournisseurs avec prix et délais différents, réception des palettes.
- Trésorerie, ventes, charges quotidiennes et investissement en caisse automatique.
- Journées calmes, rush de midi, week-end, Black Friday et fêtes.

Cette version constitue une première boucle jouable. Le placement libre des rayons, le recrutement, les produits périssables et les contrats fournisseurs restent à développer. Les parties ne sont pas encore sauvegardées entre deux rechargements.

## Pistes pour approfondir la chaîne

Priorités de déchargement et de mise en rayon, emplacements de réserve, quais limités, fiabilité des fournisseurs et anticipation des invendus. Ces pistes ont été discutées pour une prochaine version et ne font pas partie de la première boucle.

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
