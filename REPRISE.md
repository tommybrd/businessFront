# Reprise du projet — Flux Arcade (dépôt businessFront)

Document de passation rédigé le 11 novembre 2026 pour reprendre le projet dans une nouvelle session Claude. Il décrit l'état réel du dépôt à cette date (dernier commit `49bf9da`).

> **Mise à jour du 11 novembre 2026 (nouvelle session).** L'ancien dossier de travail (`~/Documents/Codex/2026-10-04/li/work`) n'existe pas sur ce Mac. Le dépôt a été recloné depuis GitHub dans `/Users/tommy.bourdin/claude/businessfront` (branche locale `main` qui suit `github/flux-arcade`, même commit `49bf9da`). Ce qui n'était pas suivi par Git n'a pas été récupéré : les scripts `scripts/arcade-bots/` (roadmap, mp, diag, bench) et les prototypes `dist/ville.html`, `dist/city*.js`, `dist/proto-chaines.html`. Ce fichier a été recréé à partir du texte de passation.

> **Marque (11 novembre) :** la marque est **MarketFront**, jamais « Flux ». Les jeux s'appellent **BurgerFront** (dist/arcade*, anciennement « Flux Arcade ») et **CampingFront** (dist/camping*, in-game : Camping du Paradis). Les clés de sauvegarde `flux-arcade-v1` / `flux-camping-v1` et les préfixes de salle `flux-arcade-` / `flux-camping-` gardent l'ancien nom pour ne pas casser les parties. Les noms de fichiers et de commits plus bas utilisent encore « Flux Arcade » : lire BurgerFront.

Le dépôt s'appelle `businessfront` sur GitHub et `market-front` dans `package.json`. Le jeu sur lequel on travaille est **Flux Arcade**.

## 1. En deux phrases

Flux Arcade est un jeu de gestion « idle-arcade » sans fin, en français : on dirige un personnage dans une ferme-restaurant de burgers en 3D, on porte les marchandises à la main, on sert, on encaisse et on achète des améliorations. Il tourne entièrement dans le navigateur (aucun serveur), sur ordinateur et téléphone, seul ou jusqu'à 4 joueurs.

## 2. Où se trouve quoi

| Élément | Emplacement |
|---|---|
| Dossier de travail | `/Users/tommy.bourdin/claude/businessfront` (recloné le 11 novembre ; l'ancien était `/Users/tommy.bourdin/Documents/Codex/2026-10-04/li/work`) |
| Dépôt GitHub | https://github.com/tommybrd/businessfront.git (remote nommé `github`) |
| Branche de code | `main` en local, poussée vers la branche distante `flux-arcade` (il n'y a pas de `main` distant) |
| Site public | https://tommybrd.github.io/businessFront/ (branche `gh-pages`) |
| Artifact du jeu | Flux Arcade (version 19, privé) |
| Page d'idées / roadmap | Idées Flux Arcade (base de données, collection `ideas`) |
| Consignes du projet | `AGENTS.md` (à respecter, voir §8) |

## 3. Les jeux présents dans le dépôt

Le dépôt contient plusieurs générations de jeux. Seul Flux Arcade est en développement actif.

| Jeu | Fichiers | État |
|---|---|---|
| Flux Arcade | `dist/arcade.html`, `dist/arcade.js`, `dist/arcade-engine.js`, `dist/arcade-scene.js`, `dist/arcade-net.js` | Actif, en ligne |
| **Flux Camping** (ajouté le 11 novembre) | `dist/camping.html`, `dist/camping.js`, `dist/camping-engine.js`, `dist/camping-scene.js`, `dist/companies.js` | Actif, en ligne sur `…/camping.html` |
| Flux Burger (restaurant, v1.3.1) | `dist/index.html`, `dist/game.js`, `dist/restaurant-engine.js`, `dist/restaurant-scene.js`, `worker/`, `db/` | Jeu précédent, décrit par le `README.md` et `AGENTS.md` ; non modifié récemment |
| Centre logistique, supermarché | `dist/warehouse-*.js`, `dist/engine.js`, `dist/scene.js`… | Archives, gardées pour convertir les anciennes sauvegardes et pour les tests |
| Flux Groupe (ville) | `dist/ville.html`, `dist/city.js`, `dist/city-engine.js`, `dist/city-scene.js` | Prototype non suivi par Git, daté du 1er novembre — **absent de ce clone** |
| Flux Chaînes | `dist/proto-chaines.html` | Prototype non suivi par Git — **absent de ce clone** |

Les deux prototypes non suivis n'ont jamais été commités ni déployés : ne pas les supprimer, ne pas les inclure dans un commit sans demande explicite.

## 4. Architecture de Flux Arcade

Modules ES sans framework ni bundler, Three.js ^0.180. La séparation est stricte :

- `dist/arcade-engine.js` — la simulation. Aucun accès au DOM ni à Three.js, donc testable dans Node. Tout l'état du jeu est un objet JSON simple (`createArcade()`), avancé par `stepArcade(state, dt, input)` en secondes réelles. `loadArcade()` relit une sauvegarde (`SAVE_SCHEMA = 2`). Les achats sont décrits par `UNLOCKS` (achats uniques) et `LEVELS` (améliorations à niveaux, sans fin).
- `dist/arcade-scene.js` — la vue 3D. `createArcadeScene()` ne fait que dessiner l'état : aucune règle de jeu. Les piles d'objets sont des maillages instanciés (un seul dessin par type d'objet).
- `dist/arcade.js` + `dist/arcade.html` — l'interface. Boucle d'affichage, clavier (ZQSD, WASD, flèches, X pour vider les mains), manette tactile, panneaux (Mains, Équipe, Banque, Multi), sauvegarde locale (`localStorage`, clé `flux-arcade-v1`, prénom sous `flux-arcade-v1-name`).
- `dist/arcade-net.js` — le transport réseau. Enveloppe de PeerJS (WebRTC), chargée seulement quand on ouvre ou rejoint une partie.
- `dist/vendor/` — Three.js et PeerJS 1.5.4 copiés depuis `node_modules` par `npm run build`.

### Contenu du jeu

- **Chaînes de production** : champ → pommes de terre → friteuse → frites ; livraison ou ferme (vaches, boucherie) → steak → grill → poste burger ; gobelets → machine à soda ; lait → glaces. Jusqu'à 3 machines de chaque type.
- **Vente** : 2 caisses avec caissiers, terminaux carte (frais de 5 %), bornes de commande, drive, terrasse avec tables à débarrasser.
- **Argent** : espèces en piles à ramasser, coffre-fort, convoyeur de fonds, tubes à billets, banque (épargne, crédit, actions FritCo / BurgerCorp / SodaTech).
- **Équipe** : employés et robots affectés à des missions réglables ; un nouvel employé va là où l'étagère manque le plus.
- **Rythme** : journée avec horaires d'ouverture, bilan du jour, factures, imprévus, réputation en étoiles, mégaphone (rush), publicité, pourboire de 10 % si le client est servi en moins de 15 s.

### Jeu à plusieurs (ajouté le 10–11 novembre)

- L'hôte fait autorité : son état contient `state.guests[]` (les personnages invités). Il diffuse l'état complet en JSON au plus toutes les 100 ms.
- L'invité marque l'état reçu `replica = true` et le fait avancer localement entre deux images (une réplique ne tire aucun dé : pas d'arrivée de clients ni d'imprévus). Il garde la main sur la position de son propre personnage et l'envoie toutes les 80 ms.
- Messages invité → hôte : `in` (déplacement), `pick`, `empty`, `mission`. Hôte → invité : `hi`, `no`, `s` (état).
- 4 joueurs maximum (`MAX_GUESTS = 3`). Code de partie à 5 caractères, identifiant PeerJS `flux-arcade-<CODE>`, lien d'invitation `?join=CODE`.
- L'invité ne sauvegarde pas, n'a pas accès à la banque ni à la remise à zéro ; son restaurant solo est mis de côté puis rendu quand il quitte.
- Si l'onglet de l'hôte est masqué ou ralenti, un minuteur fait avancer la simulation à la place de l'affichage. Un invité muet depuis 15 s est retiré.

### Jeu à plusieurs, version du 12-13 novembre (remplace la description du §4 sur ce point)

Une seule partie pour toutes les entreprises, code dans `dist/room.js` (partagé par BurgerFront et CampingFront). Le code de partie donne accès à la partie de l'hôte : **chacun, hôte compris, passe d'une entreprise à l'autre avec 🏢** (la page se recharge ; l'hôte rouvre le même code, les invités se reconnectent seuls ; reprise mémorisée dans `sessionStorage`, valable 40 s). L'hôte fait tourner l'autre entreprise (depuis sa sauvegarde locale) tant qu'un invité s'y trouve. **Mêmes droits pour tous** : banque, recommencer, missions, achats. Salle PeerJS `marketfront-<CODE>`. Testé à deux onglets sur le site public (invité dans le restaurant pendant que l'hôte est dans le camping, passages dans les deux sens, banque et remise à zéro par l'invité). Jamais essayé entre deux appareils.

**Achats** : il faut rester 1,2 s (`BUY_DELAY`) sur une case avant que le premier dollar parte ; une jauge « Restez pour acheter… » se remplit sur la case.

### Entreprises : le camping (11 novembre)

Thème « **Camping du Paradis** » (clin d'œil à la série TV, sans ses noms ni ses personnages) : palmiers, flamants roses, enseignes turquoise ; chaque jour est un **épisode** titré d'après ce qui s'y est passé (`episodeTitle` dans le moteur, affiché dans le bilan) ; campeurs « beau-frère qui sait tout » et « mamie et les petits-enfants » ; petites phrases du directeur à chaque imprévu. À garder dans ce ton pour les ajouts.

Un deuxième commerce, sur sa propre page avec sa propre sauvegarde (`flux-camping-v1`). Même découpage que les burgers : `camping-engine.js` (simulation JSON, aucun DOM), `camping-scene.js` (vue 3D), `camping.js` + `camping.html` (interface). Le menu **🏢 Entreprises** (`companies.js`, un seul tableau `COMPANIES`) est monté dans les deux jeux : pour ajouter une entreprise, créer sa page et ajouter une ligne.

- Le joueur est le directeur : il enregistre les campeurs à l'accueil (carré bleu), encaisse, ramasse les sacs-poubelle des emplacements libérés (un emplacement sale bloque l'arrivée suivante), réapprovisionne papier et chlore, paie les factures au bureau.
- Contenu : tentes, caravanes (bornes électriques), mobil-homes ; sanitaires (papier, saleté, files) ; épicerie (pain livré à l'aube par le boulanger, jeté à 22 h ; glaces) ; piscine (chlore, canards) ; scène et soirée (karaoké, loto…) ; benne et éboueurs ; fêtards après l'extinction des feux ; imprévus (disjoncteur, WC bouchés, guêpes, canards, coup de vent, sanglier).
- Les campeurs ont une humeur ; en repartant ils laissent un avis (livre d'or, bouton 📖) qui fait bouger la réputation. Personnel réglable comme les employés des burgers (réceptionniste, épicier et animateur tiennent un poste fixe).
- Jeu à plusieurs : même mécanique, code de salle propre (`flux-camping-<CODE>`, paramètre `game` de `arcade-net.js`).
- Test : `scripts/arcade-bots/camping.mjs` (dans `npm test`) : début de partie à la main, 10 jours en autonomie, sauvegarde, invités.
- Site public : `gh-pages` contient aussi `arcade.html` (copie de `index.html`), `camping.html`, `camping*.js`, `companies.js`.
- Pas encore fait : équilibrage fin (la partie à la main démarre lentement : environ 2 à 3 arrivées par jour), banque et actions (burgers seulement), version artifact claude.ai du camping.

## 5. Lancer et vérifier

Node.js 22.13 ou plus.

> **Consigne de Tommy (11 novembre) :** on ne lance pas le jeu en local. Chaque changement validé est déployé directement sur GitHub (voir §6) et vérifié sur le site public. Les vérifications Node sans navigateur restent d'usage.

```bash
npm install
npm run dev        # http://localhost:3000/arcade.html
npm run check      # syntaxe des modules (attention : la liste n'inclut pas les fichiers arcade*.js)
npm test           # 22 fichiers de tests (jeux précédents surtout)
npm run build      # recopie Three.js et PeerJS dans dist/vendor
```

**Depuis le 11 novembre**, `scripts/arcade-bots/` est suivi par Git et contient `robots.mjs` (contrôle des robots sodas et glaces, lancé par `npm test`) et `diag.mjs` (diagnostic de fin de partie, `npm run arcade:diag`). `npm run check` vérifie aussi les fichiers `arcade*.js`. Les anciens scripts ci-dessous n'ont pas été récupérés (seul `diag.mjs` a été réécrit) :

| Script | Rôle |
|---|---|
| `roadmap.mjs` | Parcourt toutes les fonctionnalités et finit par « save/load ok » |
| `mp.mjs` | Jeu à plusieurs côté moteur (invités, réplique, limites) |
| `diag.mjs` | Simule une fin de partie : étagères vides, clients perdus, $/min |
| `bench.mjs` | Mesure de vitesse de la simulation |

Dans le navigateur, `window.__arcade` expose `{ state, net, scene, step }` pour inspecter ou piloter le jeu depuis la console. Pour tester sans écraser la sauvegarde : `Storage.prototype.setItem = () => {}`.

## 6. Mettre en ligne

Habitude prise avec Tommy : après chaque changement validé, commit, puis les trois destinations.

1. **Code** — commit sur `main` (auteur Tommy Bourdin, message en français préfixé « Flux Arcade : », dernière ligne `Co-Authored-By: Claude <noreply@anthropic.com>`), puis `git push github main:flux-arcade`.
2. **Site public** — la branche `gh-pages` contient une copie à plat : `index.html` (= `dist/arcade.html`), les quatre `arcade*.js`, `icon-180.png`, `vendor/` (Three.js, PeerJS et leurs licences). Copier les fichiers modifiés, commiter, pousser vers `gh-pages`. Le site se met à jour en une à deux minutes.
3. **Artifact** — republier sur l'URL de l'artifact du jeu. La page y est dérivée de `dist/arcade.html` : on garde `<title>`, la balise `theme-color`, puis tout de `<style>` jusqu'avant `</body>`, en remplaçant `./vendor/three.module.js` par `https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js`. Les fichiers `arcade.js`, `arcade-engine.js`, `arcade-scene.js`, `arcade-net.js` et `vendor/peerjs.min.js` sont publiés à côté.

Points d'attention :

- La copie de travail `gh-pages` était un worktree Git dans un dossier temporaire de l'ancienne session ; il a sans doute disparu. Le recréer : `git worktree prune`, `git fetch github`, puis `git worktree add <dossier> github/gh-pages`.
- Identifiants : la poussée vers `gh-pages` passait par le magasin d'identifiants Git présent sur l'ancienne machine. Il n'est pas sur ce Mac : il faudra que Tommy configure l'accès en écriture lui-même. Ne jamais afficher, copier ni commiter d'identifiants.
- Tommy a autorisé explicitement la publication sur `gh-pages` dans l'ancienne session ; une nouvelle session doit redemander avant de pousser.
- `.openai/hosting.json` désigne l'hébergement du jeu précédent (Flux Burger, Worker + D1). `AGENTS.md` demande de préserver son identifiant ; Flux Arcade ne s'en sert pas.

## 7. Idées et roadmap

La page d'idées est la référence : Tommy y marque chaque idée (go / plus tard / non). Une idée implémentée est supprimée de la page. État au 11 novembre :

**Sans décision**

- Produit en rupture retiré du menu (S)
- Menus et formules (S)
- Nouveaux produits : nuggets, salade, café (M)
- Former les employés (M)
- Réglage de qualité graphique (S)
- Fusionner le décor fixe (M) — reste environ 560 dessins par image
- Premiers pas guidés (S)

**Plus tard**

- Ouvrir un deuxième commerce, boulangerie (L) — l'envie de départ de Tommy
- Approvisionnement sans fin (S)
- Revendre et recommencer, prestige (M)
- Sons et musique (S)
- Décoration et personnalisation (M)
- Écran de statistiques (S)
- Partie partagée entre téléphone et ordinateur, sauvegarde en ligne (M)

**Refusées par Tommy** : gains pendant l'absence, objectifs et missions, clients VIP pressés.

## 8. Règles de travail

Tirées de `AGENTS.md` et des habitudes prises :

- Répondre à Tommy en français.
- Garder la séparation simulation / interface / scène 3D.
- Les animations montrent l'état réel de la simulation ; pas d'indicateur fictif.
- L'interface doit rester utilisable sur téléphone comme sur ordinateur.
- `npm run check` et `npm test` après toute modification de la simulation ; `npm run build` si les modules 3D ou les dépendances changent.
- Jamais de jeton, de mot de passe ni de fichier `.env` dans Git.
- Le `README.md` décrit surtout Flux Burger ; Flux Arcade n'y a qu'un paragraphe d'introduction, qui ne mentionne pas encore le jeu à plusieurs.

## 9. Limites connues

- Jeu à plusieurs testé seulement à deux onglets sur un même ordinateur (y compris sur le site public). Jamais essayé entre deux appareils ou deux réseaux ; certains réseaux mobiles ou d'entreprise bloquent les connexions directes, et il n'y a pas de relais de secours (TURN).
- La mise en relation dépend du service public gratuit de PeerJS. Elle est probablement bloquée à l'intérieur de l'artifact claude.ai : le jeu à plusieurs est prévu pour le site public.
- L'hôte envoie l'état complet à chaque fois (environ 5 Ko en début de partie, 16 Ko mesurés avec 18 employés). Pas de compression ni d'envoi différentiel.
- L'hôte fait confiance à la position annoncée par chaque invité (bornée, mais sans contrôle de vitesse) : suffisant entre amis, pas contre la triche.
- Quand l'hôte arrête la partie, l'invité voit « Connexion perdue. » plutôt qu'un message dédié.
- La sauvegarde est locale au navigateur : pas de partie partagée entre appareils.

## 10. Pour démarrer la nouvelle session

Message à donner à Claude :

> Lis REPRISE.md et AGENTS.md à la racine du projet, puis lance npm install et npm run dev. On travaille sur Flux Arcade (dist/arcade*.js, dist/arcade.html).

### CampingFront : boulangerie, épicerie et nuit (14 novembre)

- **Pain** : le boulanger livre des **pâtons** à 6 h 30 (`SOURCES.bread`, item `dough`) ; on les porte au **four** (`OVEN`, achat « Boulangerie : four + stand », 180 $), qui cuit 6 pâtons en 4 s ; le pain cuit se prend sur le carré vert du four et se pose sur le **stand** (`SHELVES.bread`). Tout est jeté à 22 h. Sans la boulangerie, les campeurs ne demandent pas de pain.
- **Épicerie** : un rayon commun (`RACK_KINDS` : boissons, crème solaire, gaz — pour caravanes et mobil-homes —, souvenirs, ce dernier après l'achat « Rayon souvenirs »), une livraison par produit (caisses au sud du comptoir), et un employé « Épicerie » qui gère four, stand, glaces et rayon (`shopJob`).
- **Papier toilette** : le stock restait bloqué à 9/10 (consommation de 0,34 par visite, mais réappro seulement si stock ≤ capacité − 1). Le réappro complète maintenant jusqu'au plein.
- **Nuit** : après l'extinction des feux, les campeurs qui ne font pas la fête vont dormir (`c.sleep`) : ils disparaissent dans la tente, la fenêtre s'allume et un 💤 apparaît ; ils se lèvent à 7 h.
- Employé de l'épicerie : un employé seul tient le pain à 15–19 % de rayon vide ; un deuxième est utile en haute fréquentation.

### Roadmap du 14 novembre : compte commun et publication

- **Compte commun (holding)** : `dist/holding.js`. BurgerFront et CampingFront jouent avec le même argent : toutes les 500 ms et à la fermeture, le jeu ajoute au compte du groupe (`localStorage` `marketfront-holding`) ce qu'il a gagné ou dépensé depuis la dernière synchro, puis reprend le solde. Les espèces restent dans leur caisse jusqu'à être encaissées. Premier compte = somme des deux anciens comptes. Test : `scripts/arcade-bots/holding.mjs`.
- **Publier** : `scripts/publish.sh "message" fichier1.js …` pousse `main` sur `flux-arcade`, copie les fichiers de `dist/` sur `gh-pages` (autorisation permanente de Tommy de pousser sans redemander) et versionne tous les modules (import map + `?v=<commit>`), car GitHub Pages garde les fichiers 10 minutes : sans ça, un joueur reçoit un mélange d'anciens et de nouveaux fichiers.
- Les idées marquées « Go » sur la page d'idées sont la roadmap en cours ; une idée réalisée est supprimée de la page.

## 11. Revue du code du 14 novembre

Mesuré ce jour-là (voir aussi les 30 idées ajoutées à la page d'idées, catégories « Camping · … », « Groupe MarketFront », « Technique ») :

- Code actif : 267 Ko pour les deux jeux, hors Three.js. Moteurs purs et rapides (8 jours de camping complet simulés en 0,2 s).
- Lignes très longues (jusqu'à 1 160 caractères dans `arcade.js`) : diffs Git illisibles.
- Doublons : `camping.js` est une copie adaptée de `arcade.js`, les deux scènes partagent leurs briques 3D par copie.
- Tests : moteurs seulement (`robots.mjs`, `camping.mjs`). Rien pour l'affichage, l'interface ni le réseau.
- Publication à la main sur `gh-pages` ; cache de 10 min sans numéro de version (versions mélangées possibles juste après une mise en ligne).
- `dist/` contient 45 fichiers des anciens jeux sur 59 ; `README.md`, `AGENTS.md` et `package.json` décrivent encore l'ancien jeu.
- Réseau : état complet envoyé 10 fois par seconde (14,7 Ko pour un camping complet).
- Défaut corrigé le 14 novembre : des sorties commencées tard le soir (file des glaces, baignade) se prolongeaient après 23 h. La piscine ferme maintenant à 20 h et l'épicerie à 21 h (`POOL_CLOSE`, `SHOP_CLOSE`) ; le test vérifie que personne n'y est après l'extinction des feux.
- Plafond du camping : 22 emplacements sur 32 × 30 m, tout s'achète pour environ 9 700 $ (574 $/min en fin de partie).

## Feuille de route « go » terminée (14/11/2026)
- Décor fixe fusionné (`dist/static-bake.js`, `bakeGroup`) dans camping-scene et arcade-scene.
- Groupe MarketFront : compte partagé (`holding.js`) + échanges lus dans l'autre sauvegarde (`groupReport`, `s.syn`) :
  camping ≥3★ → affluence BurgerFront (+5 %/étoile au-dessus de 2), BurgerFront jour ≥3 → repas du resto camping (+3 %/jour, max +25 %).
- Non testé : 2 appareils réels en réseau ; la boucle de jeu ne tourne pas dans le panneau navigateur masqué (rAF).
- Restent les idées marquées « plus tard » sur la page des idées.

## Équipe BurgerFront (15/11/2026)
- Le personnel (employés, robots, caissiers) ne s'achète plus en case : panneau « 👷 Équipe » (`hirebar`), API `manage(s,'hire'|'fire',…)` dans `arcade-engine.js` (réutilise le message réseau `manage`).
- Prix croissants (`HIRE`), remboursement 40 %, 12 robots max, drapeaux `unlocked.helper/helper2…/cashier/robotPotato` posés à l'embauche pour garder les enchaînements de cases.
- `STAFF_IDS` : anciens ids de cases de personnel, rejoués uniquement par les vieilles sauvegardes schéma 1 et les tests.
- Pas encore fait : même principe pour le personnel du camping (cases réceptionniste, agent d'entretien, etc.).
