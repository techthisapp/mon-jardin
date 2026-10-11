# Mon jardin

Application web de calendrier de jardinage, en français. Un référentiel de plantes est servi par une base Supabase, l'interface est un site statique publié par GitHub Pages à l'adresse `https://techthisapp.github.io/mon-jardin/`. Jérôme en est le seul développeur et le responsable du contenu.

## Sources de référence

| Source | Contenu | Usage |
|---|---|---|
| `DOCUMENT-DE-REPRISE.md` | Architecture, modèle de données, contrôles, pièges rencontrés, chantiers ouverts | Avant tout travail sur la base, les contrôles ou le contenu du référentiel |
| `notes/README.md` | Index des notes de chantier, classées par thème | Pour retrouver la décision ou la mesure qui fonde un comportement existant |
| `notes/procedure-ajout-d-une-plante.md` | Ordre des opérations, source par champ, contrôles avant activation | Avant d'ajouter ou d'activer une fiche. Son étape 5 est remplacée par `notes/adaptation-par-climat.md` |
| `notes/procedure-de-publication.md` | Contrôle avant dépôt, essais, publication sur GitHub Pages | Avant une mise en ligne, avec les réserves de la section « Publication » |
| `outils/essais/README.md` | Fonctionnement des essais de bout en bout | Avant d'écrire ou de modifier une suite |
| `PLAN-UNIFICATION-DES-FICHES.md` | Inventaire des attributs au 28 juillet 2026 et plan de normalisation | Historique du modèle normalisé de `plants` |

En cas de divergence, le code et la base font foi, puis l'écrit le plus récent. Le document de reprise porte l'en-tête du 31 juillet 2026 et des ajouts jusqu'au 19 août. Ses sections de schéma et sa section « Écrans » décrivent un état antérieur : la base compte davantage de tables qu'il n'en décrit, et les écrans en production sont décrits par les notes du thème « Écrans et navigation ».

## Architecture

- Le site est statique et sans étape de construction : `index.html`, `app.js` qui porte toute l'application, `styles.css`, `config.js`, `sw.js`. GitHub Pages publie la branche `main` depuis la racine, toute poussée sur `main` est donc une mise en production.
- `vendor/supabase.js` est le client de la base, construit par `outils/paquet/construire.mjs` et versionné dans le dépôt.
- La base est le projet Supabase `Garden Calendar`, référence `ocsjpojdddmltluzmmwv`, région eu-west-3, PostgreSQL 17. Le schéma, les données, les migrations, les fonctions de bord `reprise`, `pluie-stations` et `vigilance` et les tâches `cron` de collecte vivent dans Supabase et ne figurent pas dans le dépôt.
- L'application garde le catalogue en mémoire locale et ne le relit que si `catalog_meta` change, soit le nombre de plantes ou la plus récente modification de `plants`. Une correction limitée à `plant_advice`, à `plant_phases` ou à une vue demande de toucher une ligne de `plants` pour atteindre les appareils déjà installés.
- Une modification de l'interface demande une poussée.
- La clé `anon` de `config.js` est publique par conception. La protection des données repose sur les règles RLS.

## Commandes

```
npm install                          # une fois par clone, installe Playwright
npx playwright install chromium      # une fois par machine dépourvue de Chromium
npm run verification                 # contrôle avant dépôt
npm run corriger                     # recalcule les empreintes de version
npm run essais -- <suite>            # une suite d'essais de bout en bout
npm run essais                       # toutes les suites, une dizaine de minutes
```

- Le crochet `.githooks/pre-commit` corrige les empreintes puis rejoue le contrôle. Il demande le réglage `git config core.hooksPath .githooks` sur chaque clone. Le crochet de session déclaré dans `.claude/settings.json` pose ce réglage à l'ouverture.
- La série complète d'essais dépasse le délai d'une commande au premier plan. Elle se lance en arrière-plan et se relit dans sa sortie.
- Le lanceur sert le dépôt sur le port 8099. Un port occupé signale une exécution encore en cours, dont il faut attendre la fin. La commande `pkill -f 8099` est interdite : son motif correspond aussi au shell appelant.
- Plusieurs libellés portent une espace insécable avant l'unité, et les essais comparent les chaînes octet pour octet.
- La reconstruction de `vendor/supabase.js` demande `npm install --no-save esbuild @supabase/supabase-js` puis `node outils/paquet/construire.mjs`. Elle est suivie de deux passages de `npm run corriger`, la version de `sw.js` ne convergeant qu'au second.

## Règles de code

- Toute déclaration `const`, `let` ou `var` de niveau module précède son premier usage dans le texte de `app.js`, corps de fonction compris. Le contrôle avant dépôt refuse une déclaration tardive.
- Tout identifiant passé à `$()`, à `sur()` ou à `querySelector` existe dans `index.html` ou dans un gabarit du script.
- Les empreintes `?v=` de `index.html` et de `app.js`, la constante `VERSION` de `sw.js` et la balise `version-appli` sont calculées par le contrôle. Elles ne s'écrivent pas à la main.
- Les fichiers servis ne nomment en dur que la base, `api.open-meteo.com` et `api-adresse.data.gouv.fr`. Les caractères et le client de la base restent servis par le site.
- Une fenêtre de `plant_phases` peut être à cheval sur le 1er janvier, sa borne de début dépasse alors sa borne de fin. Le test d'appartenance s'écrit `début <= fin ? q entre début et fin : q >= début ou q <= fin`.
- L'ajout d'une tâche au calendrier touche la table `phases` et les constantes `ORDRE`, `ORDRE_MAINTENANT`, `ORDRE_FICHE`, `PICTOS`, `TEINTE`, `PHF` et `VERBE`. Le contrôle avant dépôt ne couvre que `ORDRE`, `ORDRE_MAINTENANT` et `PICTOS`.
- Une colonne à afficher s'ajoute en fin de la vue `plants_full`, puis à `COL_LEGERES` ou à `COL_LONGUES` dans `app.js`.
- Une plante s'ajoute au catalogue d'essai `outils/essais/donnees/catalogue.json` en fin de tableau, plusieurs suites désignant une plante par sa position.
- Les seuils du bandeau et ceux de la feuille du temps diffèrent à dessein, dans les tables `SEUILS_BANDEAU` et `SEUILS_FEUILLE`. Le contrôle refuse une inversion de leur sens.
- La section « Pièges rencontrés » du document de reprise recense les défauts déjà commis sur le survol tactile, les zones sûres et les marges des tiroirs de glissement.

## Base de données

- L'accès passe par le serveur MCP Supabase déclaré dans `.mcp.json`, limité à ce projet. Claude Code demande d'approuver ce serveur à sa première rencontre, puis l'authentification se fait par OAuth depuis la commande `/mcp`. Ce serveur écrit sur la base de production.
- Toute modification de schéma passe par `apply_migration`, avec un nom unique par appel et un SQL idempotent : `if not exists`, `on conflict do nothing`, `create or replace`.
- Une correction de contenu porte son motif pour le journal, par `set local app.motif = '...'` placé dans le même bloc SQL que l'écriture qu'il annote.
- Un `create or replace view` conserve les droits de la vue et n'admet de colonne nouvelle qu'en fin de liste. Sa clause `with (...)` se répète à chaque remplacement. Les droits se redonnent après un `drop view` suivi d'un `create view`.
- Une vue qui construit un objet JSON se contrôle en comparant ses clés, par `jsonb_object_keys`, à celles que l'application lit.
- Un `null` signifie que la question ne se pose pas. Il n'est jamais remplacé par une valeur par défaut.
- Une valeur dérivée est validée avant la suppression de sa source.
- Une écriture d'une forme nouvelle dans les données oblige à relire les vues de contrôle qui la lisent : `controle_bilan`, `controle_modele_bilan`, `controle_anomalies`, `controle_coherence`.
- Un comptage de périodes neutralise la déclinaison par climat, une même fenêtre pouvant occuper une ligne par climat dans `plant_phases`.
- La table `plant_images` reste fermée à l'écriture anonyme.

## Contenu horticole

- Une valeur qu'aucune source n'établit reste vide. Le référentiel ne porte aucune estimation.
- Les autorités priment : ANSES, centres antipoison, SEMAE, GBIF, POWO, Tela Botanica, INRAE. Viennent ensuite les éditeurs à comité, Terre Vivante et la SNHF, puis les sites généralistes en recoupement seulement. Les marchands et les blogs servent d'indices.
- Une règle de dérivation est écrite, puis mesurée sur les valeurs déjà sourcées, avant toute application.
- Le texte d'une source n'est jamais stocké. La base garde le fait et le lien.
- Un conseil corrigé met à jour `source`, `verified_at` et `verification`, colonne à quatre états décrite dans les « Points de vigilance » du document de reprise.
- Un contrôle de contenu lit le texte affiché à l'écran en plus de la ligne en base.
- Les questions horticoles et les arbitrages de contenu reviennent à Jérôme, dont les corrections de domaine priment.

## Publication

1. Jouer les suites d'essais touchées, puis la série complète avant une poussée qui change le comportement.
2. Lancer `npm run corriger`, indexer les fichiers modifiés, `sw.js` et `index.html` compris, puis valider par `git commit`. Le crochet ne réindexe que `index.html` : un `git status` vide après le commit confirme que `sw.js` est parti avec lui.
3. Pousser sur `main`.
4. Contrôler l'exécution « Controle avant depot » et la construction Pages avant toute annonce de mise en ligne. La commande `gh api repos/techthisapp/mon-jardin/pages/builds/latest --jq '{status,commit}'` doit rendre `built` sur l'empreinte poussée. Quand l'API est hors d'atteinte, la constante `VERSION` du `sw.js` publié se compare à celle du dépôt, contrôle valable pour une poussée qui change un actif.

Une file Pages bloquée se relance par `gh api -X POST repos/techthisapp/mon-jardin/pages/builds` ou par un commit vide. La modification d'un fichier sous `.github/workflows/` demande un jeton portant la permission `Workflows`.

La procédure de publication a été écrite pour les sessions claude.ai. Elle en porte le chemin de clone, le jeton personnel échu le 17 septembre 2026, la neutralisation du mandataire réseau et l'identité des commits. En session locale, git et `gh` emploient les identifiants de la machine et ces passages sont sans objet. En session distante, la poussée demande un dépôt attaché en écriture et le mandataire peut refuser l'API Pages.

Les messages de commit sont en français et disent ce qui change en une phrase, précédée du domaine quand il éclaire, par exemple « Météo : un seul seuil de mention ».

## Façon de travailler

- Jérôme délègue et attend un enchaînement autonome des lots. « Continuer », « Go », « Ok » et « Aller » valent accord pour poursuivre sans validation intermédiaire.
- Une question se justifie quand elle relève du domaine horticole ou d'une décision de projet.
- Chaque chantier laisse une note dans `notes/`, ajoutée à l'index, et met à jour `DOCUMENT-DE-REPRISE.md`.
- Un décompte se recompte dans la base ou dans le code avant d'être cité.
- Les essais et les scripts de travail sont versionnés dans le dépôt, sous `outils/`.

## Rédaction

Ces règles valent pour les conseils, les libellés, les notes et les messages de commit.

- Le texte est en français professionnel, en phrases pleines, sous des titres nominaux et sobres.
- Il ne porte ni tiret cadratin, ni tiret demi-cadratin, ni flèche, ni symbole mis à la place d'un mot.
- Les mesures sont en unités métriques.
- Un terme horticole précis est conservé. Il est glosé à sa première apparition ou porté par la table `glossaire`.
