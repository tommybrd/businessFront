# Market Front

Jeu de gestion de supermarché en français. Le joueur est le directeur, avec une vue 3D simplifiée du magasin.

- Préserver la séparation entre simulation (`dist/engine.js`), interface (`dist/game.js`) et scène 3D (`dist/scene.js`).
- Les animations représentent les stocks, clients et affectations de la simulation ; éviter des indicateurs fictifs.
- Garder l’interface utilisable sur ordinateur et téléphone, avec les stocks accessibles sans sélectionner un objet 3D.
- Exécuter `npm run check` et `npm test` après une modification de la simulation. Exécuter `npm run build` si les modules 3D ou les dépendances changent.
- La destination de déploiement est celle de `.openai/hosting.json`. Préserver son identifiant et le dépôt Git existant.
- Ne jamais enregistrer de jetons, de mots de passe ou de fichiers `.env` dans Git.

Les fonctionnalités annoncées comme pistes dans le README ne sont pas encore implémentées.
