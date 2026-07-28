# Document de reprise, projet Mon jardin

Établi le 25 juillet 2026, mis à jour le 28 juillet 2026.

## Objet

Application de calendrier de jardinage. Un référentiel de plantes est servi par une base de données Supabase, l'interface est un site statique publié par GitHub Pages. La personne connectée compose son jardin à partir du catalogue, le découpe en espaces, déclare son climat, et l'application en tire un calendrier annuel et une synthèse des actions du moment.

Adresse : `https://techthisapp.github.io/mon-jardin/`

## Architecture

| Composant | Rôle | Emplacement |
|---|---|---|
| Base de données | Référentiel, comptes, jardins, sélections | Projet Supabase `Garden Calendar`, référence `ocsjpojdddmltluzmmwv`, région eu-west-3, PostgreSQL 17 |
| Fonction de bord | Échange d'un code de reprise contre une session | Fonction Supabase `reprise` |
| Interface | Site statique | Dépôt GitHub `techthisapp/mon-jardin`, branche `main`, GitHub Pages |

L'interface lit la base à chaque chargement. Corriger le référentiel met à jour le site sans redéploiement. Modifier l'apparence ou le comportement demande de redéployer les fichiers du dépôt.

## Base de données

### Identifiants

Tableau de bord : `https://supabase.com/dashboard/project/ocsjpojdddmltluzmmwv`

URL du projet : `https://ocsjpojdddmltluzmmwv.supabase.co`

Clé publique anon, intégrée dans `config.js` :

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc2pwb2pkZGRtbHRsdXptbXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDUzOTksImV4cCI6MjEwMDQ4MTM5OX0.s6im4aTShDe_xNkcQAIUw7gmWV3msNFtEPLnyQBnPx4
```

Elle porte le rôle `anon`, expire en 2036, et est envoyée au navigateur de chaque visiteur. La protection repose sur les règles RLS, pas sur son secret. Le mot de passe de la base et la clé `service_role` n'ont jamais été communiqués.

### Périmètre réel de la clé publique

Audit mené le 28 juillet 2026 en exécutant des lectures sous le rôle `anon` : le catalogue lisible, zéro jardin, zéro sélection, zéro espace, zéro masquage.

Les quinze tables ont RLS activée. Six tables du référentiel autorisent la lecture sans condition, ce qui est voulu. Cinq tables personnelles n'autorisent que des opérations conditionnées à la propriété du jardin. `reprises` et `tentatives` n'ont aucune politique et restent inaccessibles à tout rôle autre que celui de service. Aucune table n'autorise d'écriture sans condition.

Ce que la clé permet malgré tout, et qui relève de la nuisance plutôt que de la faille :

**Copier l'intégralité du catalogue.** 317 plantes, périodes, conseils et adaptations climatiques. Question de propriété du contenu, pas de sécurité.

**Solliciter des envois de courriels.** L'API d'authentification accepte une demande de lien vers une adresse arbitraire. Supabase plafonne le débit, deux par heure sur l'expéditeur par défaut, trente avec un SMTP personnalisé.

**Appeler la fonction de bord `reprise`.** La clé anon est un jeton valide, un attaquant peut donc tenter des codes. Neuf caractères sur trente-deux valeurs représentent environ 45 bits, hors de portée d'une recherche exhaustive. Le plafonnement des tentatives, posé le 28 juillet 2026, ferme la voie : dix échecs par origine sur quinze minutes, trois cents toutes origines confondues sur la même fenêtre, réponse 429 assortie d'un en-tête `Retry-After`.

Les secrets véritables sont ailleurs : la clé `service_role`, qui contourne toutes les règles RLS et n'est accessible qu'à la fonction de bord par variable d'environnement, et le jeton d'accès GitHub, qui autorise l'écriture sur le dépôt.

### Accès par API

Le projet est joignable par le connecteur Supabase, qui permet lecture, migrations et déploiement de fonctions de bord. Les lectures passent sans confirmation, les écritures demandent une approbation.

### Schéma, référentiel en lecture publique

| Table ou vue | Contenu |
|---|---|
| `phases` | Les dix tâches du calendrier. Clé, libellé, couleur, position |
| `plants` | Une ligne par plante. `slug` stable, nom, nom latin, famille, genre calculé, catégorie, typologie, espacement, profondeur, associations, conseil général, attributs `jsonb`, rusticité normalisée, source, date de vérification, `is_active`, `replaced_by`. Champs normalisés : `exposure`, `exposure_note`, `spacing_cm`, `row_cm`, `height_min_cm`, `height_max_cm` |
| `plant_phases` | Périodes par plante et par tâche, en demi-mois de 1 pour le début janvier à 24 pour la fin décembre, avec une liste de climats facultative |
| `plant_advice` | Conseil rédigé par couple plante et tâche, avec `source`, `verified_at` et `verification` |
| `expositions` | Vocabulaire contrôlé de l'exposition, cinq valeurs |
| `plant_climates` | Niveau d'adaptation de chaque plante à chaque climat, avec note et indicateur de dérivation |
| `climates` | Les cinq climats français, avec décalage saisonnier |
| `climate_phase_shifts` | Décalage fin par climat et par tâche |
| `plants_full` | Vue lue par le site, assemble plante, périodes et conseils |
| `catalog_meta` | Vue calculée, empreinte du catalogue pour le cache |
| `controle_detail`, `controle_bilan` | Vues de contrôle de cohérence du référentiel |
| `relecture_bilan` | Vue calculée, avancement de la relecture des conseils par tâche |

### Schéma, données personnelles

| Table | Contenu |
|---|---|
| `gardens` | Plusieurs jardins par compte. Nom, climat, altitude, date de dernière ouverture |
| `espaces` | Découpage d'un jardin. Nom, type, couleur, position |
| `garden_plants` | Plantes retenues dans un jardin |
| `garden_plant_espaces` | Affectation d'une plante à un ou plusieurs espaces, avec quantité et note |
| `sourdines` | Masquage d'un couple plante et tâche, par quinzaine, par période ou définitif |
| `reprises` | Empreinte des codes de reprise de session, sans le code lui-même |
| `tentatives` | Journal des tentatives d'échange de code, pour le plafonnement. Empreinte salée de l'adresse d'origine, jamais l'adresse elle-même. Purge à vingt-quatre heures |

### Sécurité

RLS activée sur toutes les tables. Le référentiel se lit sans connexion et ne s'écrit jamais depuis le site.

Les tables personnelles ne sont accessibles qu'à leur propriétaire, par jointure sur `gardens.owner`. Un compte ne peut ni lire ni modifier le jardin d'un autre, même en connaissant son identifiant.

`garden_plant_espaces` porte une clé étrangère composite vers `garden_plants` : une plante ne peut être affectée à un espace que si elle appartient au jardin. La suppression d'un espace ne retire pas la plante du jardin.

Les tables `reprises` et `tentatives` n'ont aucune politique, elles sont donc inaccessibles aux rôles `anon` et `authenticated`. Seule la fonction de bord y accède, avec la clé de service.

Le retrait d'une plante du référentiel se fait par `is_active` à faux, avec `replaced_by` pour renvoyer vers la fiche conservée.

### Contenu

| Élément | Valeur |
|---|---|
| Plantes actives | 316 |
| Plantes désactivées | 4 |
| Familles botaniques | 84 |
| Tâches | 10 |
| Périodes | 2050, dont 459 conditionnées au climat |
| Conseils rédigés | 1683, dont 359 relus un à un |
| Adaptations climatiques | 1580 |
| Climats | 5 |
| Exposition normalisée | 316 sur 316 |
| Espacement normalisé | 314 sur 316 |
| Hauteur normalisée | 228 sur 316 |

## Le calendrier

Dix tâches : semis à l'abri, semis en pleine terre, plantation et repiquage, floraison, récolte, taille et entretien, multiplication et division, fertilisation et amendement, protection hivernale, protection estivale.

Les périodes s'expriment en demi-mois. Une fenêtre sans liste de climats vaut partout, une fenêtre restreinte ne s'applique qu'aux climats cités. Le décalage saisonnier propre au climat du jardin s'applique ensuite, différent pour les fenêtres ancrées au premier et au second semestre.

## Le climat

Cinq climats : océanique, océanique dégradé qui sert de référence de calage, semi-continental, montagnard, méditerranéen.

Chacun porte un décalage en demi-mois pour les fenêtres de printemps et pour celles d'automne, affinable par tâche. La taille et la multiplication suivent moins fortement le climat que les semis.

Chaque plante porte un niveau d'adaptation par climat : adaptée, à protéger, à hiverner, déconseillée. Les niveaux sont dérivés de la rusticité normalisée puis corrigés à la main sur 33 cas où la rusticité seule induit en erreur. La colonne `derived` distingue les deux origines.

Sous climat méditerranéen, un niveau dégradé traduit la sécheresse estivale et non le froid, ce qui explique l'absence de protection hivernale et la présence d'une protection estivale.

## Campagne de vérification

L'intégralité du référentiel a été reprise en lots vérifiés auprès de sources horticoles et toxicologiques, avec renseignement de `source` et `verified_at`.

Sources utilisées : Gerbeaud, PagesJaunes Jardinage, Centre antipoison de Lille, ANSES et EMA, Truffaut, Gamm vert, Lubera, Domaine de Merval, SEMAE, Jardiner Malin, Curiosités Florales.

Corrections majeures : le fusain d'Europe toxique dans toutes ses parties et non seulement ses fruits, l'usage interne de la consoude interdit en France, les feuilles de rhubarbe, la solanine des tubercules verdis, la toxicité des haricots crus, le favisme de la fève, la toxicité du cyclamen, de la fritillaire et de la renoncule, l'avertissement de confusion entre crocus et colchique. Le nombre de plantes portant une mention de toxicité est passé de 49 à 111.

Corrections de périodes : la clématite dont les trois groupes de taille étaient confondus, le pyracantha dont la taille supprimait les baies, l'asperge dont la fertilisation est automnale, l'iris dont le conseil de plantation contredisait sa propre fenêtre.

## Séparation des fiches à deux espèces

Trois fiches groupaient deux espèces sous un seul binôme. Elles ont été séparées le 28 juillet 2026. Dans chaque cas la fiche existante conserve son identifiant et devient l'espèce principale, ce qui préserve les sélections des jardins qui l'avaient retenue. La seconde espèce arrive en fiche neuve.

| Fiche d'origine | Devient | Fiche créée |
|---|---|---|
| `origan-marjolaine` | `origan`, Origanum vulgare | `marjolaine`, Origanum majorana, gélive, conduite en annuelle |
| `salsifis-scorsonere` | `salsifis`, Tragopogon porrifolius, racine blanche | `scorsonere`, Scorzonera hispanica, racine noire, vivace |
| `chicoree-frisee-scarole` | `chicoree-frisee`, Cichorium endivia var. crispum | `scarole`, Cichorium endivia var. latifolium, plus tardive et plus rustique |

Les `slug` des trois fiches d'origine ont donc changé. Rien dans l'application ne dépend du `slug`, les jardins référencent l'identifiant technique.

## Les contrôles permanents

`select * from controle_bilan` donne le nombre de cas par contrôle et par gravité. `controle_detail` liste chaque cas.

Douze contrôles : conseil incohérent avec sa période, fenêtre sans conseil, fenêtre aberrante, plante sans aucune tâche, nomenclature absente, exposition hors vocabulaire, recouvrement entre tâches, espacement non normalisé, hauteur absente ou non normalisée, texte trop répété, conseil orphelin, conseil jamais relu.

Les contrôles agrégés, texte répété, hauteur et conseil jamais relu, remontent une ligne de synthèse plutôt qu'une ligne par plante.

La détection d'incohérence de date ne porte que sur la première phrase du conseil, celle qui contient la consigne. Les mentions de saison qui suivent renvoient à d'autres opérations et produiraient des faux positifs.

Au 28 juillet 2026, aucun défaut de gravité haute ou moyenne. En gravité basse subsistent dix textes partagés par plus de vingt plantes, justifiés par une identité réelle de besoin, deux espacements non normalisables, le cresson alénois semé à la volée et l'ortie sans espacement, une hauteur non chiffrable, et sept tâches dont les conseils n'ont pas encore été relus un à un.

`select * from relecture_bilan` donne l'avancement de la relecture par tâche.

## Application web

### Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des quatre écrans, barre de navigation, feuille de détail |
| `styles.css` | Typographies IBM Plex, palette de pierre froide |
| `app.js` | Lecture du catalogue, authentification, filtres, rendu |
| `config.js` | URL du projet et clé anon |
| `manifest.webmanifest`, icônes | Installation sur écran d'accueil |
| `outils/verification.mjs` | Contrôle avant dépôt, sans dépendance |
| `.githooks/pre-commit` | Enchaîne la correction des empreintes puis le contrôle |

L'application est pilotée par la base. Les couleurs des tâches viennent de `phases.color`. Ajouter une tâche demande de l'insérer dans `phases` et de l'ajouter aux constantes `ORDRE` et `ORDRE_MAINTENANT` de `app.js`.

L'empreinte de version des balises `app.js?v=` et `styles.css?v=` de `index.html` porte les dix premiers caractères de l'empreinte SHA-256 du fichier. Elle n'est plus tenue à la main : `node outils/verification.mjs --corriger` la recalcule, et le crochet `pre-commit` l'applique à chaque dépôt.

### Contrôle avant dépôt

`node outils/verification.mjs` vérifie cinq points, sans aucune dépendance externe :

**Syntaxe du module.** Une erreur de syntaxe n'apparaît qu'au chargement de la page, et le module s'interrompt sans un mot dans l'interface.

**Identifiants HTML.** Tout identifiant passé à `$()`, à `sur()` ou à `querySelector` doit exister dans `index.html` ou dans un gabarit du script.

**Déclaration avant usage.** Aucune déclaration `const` ou `let` de niveau module ne doit apparaître après son premier usage dans le fichier.

**Cohérence des tâches.** `ORDRE`, `ORDRE_MAINTENANT` et `PICTOS` doivent porter les mêmes clés.

**Empreintes de version.** Les balises doivent correspondre au contenu des fichiers.

L'installation se fait une fois par clone : `git config core.hooksPath .githooks`.

### Registre visuel

L'identité repose sur trois familles IBM Plex, Sans, Sans Condensed et Mono, et sur une palette de pierre froide. Trois principes ont été posés lors de la reprise graphique.

**La chasse fixe est réservée aux dates.** Ligne de date, règle des mois, code de reprise. Partout ailleurs elle donnait un air de terminal.

**Chaque tâche porte sa couleur.** Bandeau de titre teinté à 10 pour cent, filet vertical de 3 pixels en pleine couleur, pictogramme au trait dans la même couleur. Dans la vue par espace, la couleur vient de `espaces.color`, avec le vert de l'application en repli.

**Le fond suit la saison.** Cinq paliers calculés à partir de la quinzaine en cours, de saturation très faible, appliqués à la variable `--papier`.

Le bandeau haut est construit autour de la pousse en filigrane, à 236 pixels, débordant de 72 pixels à gauche et coupée par le bord de l'écran, à 8,5 pour cent d'opacité. Il porte un dégradé, une lumière rasante radiale depuis le coin haut gauche, et un filet en pied. Le titre affiche le nom du jardin actif.

Les cartes entrent en fondu montant décalé de 45 millisecondes, plafonné à huit, désactivé si le système demande une réduction des animations.

### Écrans

Deux écrans principaux, accessibles par une barre flottante translucide en bas d'écran.

**En ce moment** affiche les actions de la quinzaine sur les plantes retenues. Bilan en tête, bascule entre organisation par tâche et par espace, filtres repliables sur l'espace puis la tâche, bouton d'affichage des actions masquées. Les sections se replient au clic sur leur en-tête. Les actions sont classées par coût de l'oubli, du plus irréversible au plus tolérant, et triées par échéance à l'intérieur de chaque bloc. Un glissement vers la gauche masque pour la quinzaine ou pour la période, vers la droite définitivement.

**Calendrier** présente la frise annuelle. Les périodes sont empilées par remplissage, une voie accueillant plusieurs tâches tant qu'elles ne se chevauchent pas. Filtres sur l'espace, la tâche, le type et la catégorie. Mon jardin seulement est actif par défaut.

Deux écrans de réglage, derrière le bouton de l'en-tête.

**Jardin et espaces** contient le jardin actif, sa création et son renommage, le climat, les espaces avec leurs plantes, le compte et le code de reprise.

**Mes plantes** liste le catalogue groupé par type puis par catégorie, avec recherche sur le nom commun, le nom latin et la famille, et une jauge d'adaptation au climat à quatre crans. Le bouton Adaptées à mon climat restreint la liste aux plantes de niveau adaptée sous le climat du jardin actif. Il n'apparaît que si un jardin déclare son climat.

### Authentification

Connexion par lien reçu par courrier électronique, sans mot de passe.

Le lien s'ouvre toujours dans le navigateur, jamais dans l'application ajoutée à l'écran d'accueil, qui dispose de son propre stockage sous iOS. Deux solutions coexistent : coller le lien dans le champ prévu, ou générer un code de reprise depuis une session déjà ouverte. Le code vaut quinze minutes et un seul usage, sur un alphabet sans caractères ambigus.

Le jardin actif est mémorisé en base par `last_opened_at`, et non en stockage local, précisément à cause de cette isolation.

### Robustesse

Les lectures passent par une reprise automatique, jusqu'à trois tentatives espacées de 400 puis 800 millisecondes, uniquement pour les erreurs transitoires. Le décalage d'horloge entre l'appareil et le serveur, qui provoque un rejet du jeton, se résorbe ainsi sans message d'erreur.

Les enregistrements d'événements passent par une fonction qui ignore un élément absent du document, pour qu'un identifiant manquant n'interrompe pas le chargement du module.

## Pièges rencontrés, à ne pas reproduire

**La version des actifs.** Une omission a fait servir par Safari un `app.js` en cache avec un `index.html` récent : le script cherchait un élément renommé, recevait `null`, et l'exception interrompait le module avant le chargement du catalogue. Les onglets répondaient encore, ce qui rendait le diagnostic trompeur. Le contrôle avant dépôt referme ce piège, à condition que le crochet soit installé sur le clone utilisé.

**L'ordre de déclaration des constantes.** Une constante n'est pas remontée en tête de module comme l'est une déclaration de fonction. Le rendu étant déclenché par l'événement d'authentification, enregistré avant la fin de l'évaluation du module, toute constante utilisée par le rendu doit être déclarée en tête de fichier. Un bloc dédié les regroupe, précédé d'un commentaire.

**Le survol sur écran tactile.** Un état de survol qui remplace une couleur de fond persiste après l'appui et fait disparaître cette couleur. Utiliser une ombre intérieure qui se superpose, et réserver le survol aux appareils qui en disposent par `@media (hover:hover)`.

**Les marges sur un conteneur à positionnement absolu.** Une marge horizontale posée sur la rangée d'un tiroir de glissement décale la glissière et découvre le tiroir en permanence. La marge doit aller sur l'élément qui glisse.

**Les règles de zone sûre.** `padding-left: env(safe-area-inset-left)` écrase la marge définie plus haut et vaut zéro en portrait. Utiliser `calc(16px + env(...))`.

**GitHub Pages.** La reconstruction prend parfois plusieurs minutes. Vérifier que le statut de la dernière publication vaut `built` sur le bon commit avant d'annoncer un déploiement.

## Points de vigilance

Le dépôt GitHub contient l'interface et ce document. Le schéma de base et les données du référentiel n'y figurent pas, ils vivent dans Supabase.

Les scripts Python d'origine, qui avaient servi à générer le référentiel, sont désynchronisés de la base depuis la campagne de vérification. Toute reprise de cette voie exigerait de les réaligner.

La colonne `verification` de `plant_advice` vaut `aucune` pour tous les conseils non encore relus un à un, y compris ceux que la campagne de vérification du 26 juillet 2026 a pu couvrir au niveau de la fiche. Le sens sûr a été retenu : mieux vaut relire deux fois que tenir pour vérifié un texte qui ne l'est pas. La valeur `fiche` reste disponible pour les tâches dont la couverture par la campagne serait confirmée.

Un jeton d'accès personnel GitHub reste actif tant qu'il n'est pas révoqué, depuis `https://github.com/settings/tokens?type=beta`.

Le jeton utilisé le 28 juillet 2026 ne porte pas la permission `Workflows`. Le fichier `.github/workflows/verification.yml`, qui rejouerait le contrôle avant dépôt à chaque poussée, a donc été refusé par GitHub. À reprendre avec un jeton élargi.

La fonction de bord accepte une variable d'environnement `SEL_TENTATIVES` pour saler les empreintes d'adresse. En son absence, la clé de service sert de sel. Poser cette variable rend le sel indépendant d'une éventuelle rotation de la clé.

Le SMTP personnalisé configuré sur Brevo n'est pas fonctionnel : l'adresse d'expéditeur est une adresse iCloud, domaine dont la politique DMARC interdit l'émission par un tiers, ce qui provoque un rejet systématique. Revenir au SMTP par défaut de Supabase, ou acheter un domaine et l'authentifier.

## Chantiers ouverts

### Justesse du référentiel

Les tâches Semis à l'abri, Semis en pleine terre et Floraison ont été relues un à un le 28 juillet 2026, soit 344 conseils. Restent 1324 conseils dans leur rédaction générée d'origine, sous sept tâches. La plus lourde est Plantation et repiquage, 259 conseils pour 126 textes distincts. C'est le seul chantier dont l'inaction laisse une erreur potentielle en place.

La relecture porte sur le texte distinct, pas sur la ligne : douze textes couvraient les 191 conseils de floraison. Les erreurs trouvées étaient de trois natures. Un texte générique appliqué à des plantes qu'il dessert, par exemple « couper les hampes pour prolonger la production » posé sur l'anis, le carvi et le cumin, qui se récoltent en graines. Une séquence inversée, par exemple « laisser le feuillage jaunir après la floraison » posé sur le colchique et le cyclamen de Naples, dont le feuillage suit la fleur au lieu de la précéder. Une donnée chiffrée fausse, par exemple l'artichaut semé « en surface » au lieu de deux centimètres.

Les contrôles automatiques ne détectent que les incohérences de date. Une profondeur de semis ou un espacement erronés leur échappent, seule la relecture les trouve.

### Fonctionnalités

Le journal des actions réalisées. Le masquage sert aujourd'hui de substitut à « c'est fait », ce qui est un détournement. Une table d'historique permettrait de dater la dernière taille, d'exploiter enfin les familles botaniques pour la rotation des cultures, et de se passer de mémoire.

Les rappels. L'application ne peut pas joindre son utilisateur, il faut penser à l'ouvrir.

Le filtre adaptées à mon climat dans Mes plantes, proposé et jamais fait. C'est l'usage réellement actionnable de la jauge.

### Fiabilité du travail

Le contrôle avant dépôt et le versionnage automatique des actifs sont en place. Le plafonnement des tentatives sur la fonction `reprise` est déployé.

Reste à poser le filet d'intégration continue, qui rejouerait le contrôle à chaque poussée, y compris depuis un clone où le crochet n'est pas installé. Il demande un jeton portant la permission `Workflows`.

Le contrôle ne couvre que le statique. Rien ne vérifie qu'une requête vers la base rend bien les colonnes attendues, ni qu'un enchaînement d'écrans se déroule sans exception.

## Historique des décisions principales

Le projet est parti d'un calendrier statique au format HTML, sans base de données.

Une phase de sélection a introduit le jardin personnel, d'abord en stockage local, puis synchronisé par compte une fois Supabase en place. La séparation entre référentiel et jardins a été posée dès la conception du schéma.

Le référentiel a été étendu en trois temps jusqu'à 317 plantes, puis intégralement vérifié, doté d'une nomenclature latine, de niveaux d'adaptation climatique et de quatre tâches supplémentaires. La séparation des fiches groupant deux espèces l'a porté à 320 fiches, dont 316 actives.

L'interface a été reprise plusieurs fois : filtrage par catégorie fine, tri alphabétique, identité visuelle, filtrage par mois, espaces, multi-jardins, feuille de détail modale, barre de navigation flottante, masquage par glissement, jauge d'adaptation climatique, filtre par adaptation au climat.

Le 28 juillet 2026, une session a posé le contrôle avant dépôt et le versionnage par empreinte, plafonné les tentatives de reprise, ouvert la traçabilité au niveau du conseil, séparé les trois fiches à deux espèces, normalisé l'exposition, la hauteur et l'espacement, et relu les conseils de semis et de floraison.
