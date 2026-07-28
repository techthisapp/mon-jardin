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
| `plants` | Une ligne par plante. Identité, nomenclature, classement, associations, conseil général, source et date de vérification. Champs normalisés listés plus bas. `attributes` ne porte plus que les notes libres non modélisées |
| `vocabulaires` | Vocabulaire contrôlé de tout le référentiel. Une ligne par valeur admise, groupée par domaine |
| `plant_phases` | Périodes par plante et par tâche, en demi-mois de 1 pour le début janvier à 24 pour la fin décembre, avec une liste de climats facultative |
| `plant_advice` | Conseil rédigé par couple plante et tâche, avec `source`, `verified_at` et `verification` à quatre états |
| `expositions` | Vocabulaire contrôlé de l'exposition, cinq valeurs |
| `plant_climates` | Niveau d'adaptation de chaque plante à chaque climat, avec note et indicateur de dérivation |
| `climates` | Les cinq climats français, avec décalage saisonnier |
| `climate_phase_shifts` | Décalage fin par climat et par tâche |
| `plants_full` | Vue lue par le site, assemble plante, périodes et conseils |
| `catalog_meta` | Vue calculée, empreinte du catalogue pour le cache |
| `controle_detail`, `controle_bilan` | Vues de contrôle de cohérence des conseils et des périodes |
| `controle_modele`, `controle_modele_bilan` | Vues de contrôle de cohérence du modèle normalisé |
| `controle_anomalies` | Vue de détection d'écarts par comparaison entre plantes voisines |
| `historique` | Journal des modifications du référentiel, alimenté par déclencheur |
| `historique_lisible` | Vue du journal, un enregistrement par champ modifié |
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
| Plantes actives | 315 |
| Plantes désactivées | 5 |
| Familles botaniques | 84 |
| Tâches | 10 |
| Périodes | 2052, dont 459 conditionnées au climat |
| Conseils rédigés | 1691 sur fiches actives : 1311 relus un à un, 380 couverts au niveau de la fiche, aucun laissé dans sa rédaction d'origine |
| Adaptations climatiques | 1580 |
| Climats | 5 |
| Exposition normalisée | 315 sur 315 |
| Espacement normalisé | 313 sur 315 |
| Hauteur normalisée | 227 sur 315 |

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

L'opération inverse a été menée le même jour sur les groseilles. `groseille` et `groseille-blanche` portaient toutes deux Ribes rubrum, soit deux couleurs d'une même espèce. `groseille` devient « Groseille à grappes », enrichie de la floraison et de la taille que seule l'autre fiche portait, et `groseille-blanche` passe à `is_active` faux avec `replaced_by` vers elle.

## Ce que dit un conseil de floraison

La floraison est un constat plus qu'une action, ce qui rend la tâche particulière à rédiger. Les 215 conseils suivent cinq registres, et un texte qui n'entre dans aucun n'a probablement rien à dire.

**Ce que la floraison déclenche ailleurs.** La pomme de terre en fleur signale que les primeurs sont bonnes à arracher. La première fleur nouée de la tomate marque le passage à un apport riche en potasse. Le thym et la lavande sont à leur maximum de parfum juste avant l'épanouissement.

**Ce qu'elle interdit pendant sa durée.** Ne pas tailler sous peine de supprimer la fructification, ne pas traiter pour préserver les pollinisateurs.

**Ce qu'elle révèle.** La couleur de l'hortensia donne le pH du sol. La période de floraison d'une clématite indique son groupe de taille. Une reprise de floraison désigne un rosier ou une framboise remontants, ce qui décide de la taille.

**Ce qui peut mal tourner.** Une gelée sur les fleurs de fraisier noircit le cœur et supprime le fruit. Le pollen de tomate devient stérile au-dessus de trente-cinq degrés. La courgette avorte ses fruits faute de pollinisateurs.

**L'alerte de montaison.** Pour le basilic, la laitue ou la rhubarbe, la floraison annonce la fin de la production et appelle une correction immédiate.

## Modèle normalisé du référentiel

Chaque notion se lit sur une clé de vocabulaire contrôlé, la nuance restant dans une note libre facultative. La table `vocabulaires` porte toutes les valeurs admises, groupées par domaine, et l'intégrité est assurée par des clés étrangères composites vers `vocabulaires(domaine, cle)`. Le domaine est porté par une colonne générée constante, ce qui évite une table de référence par notion tout en gardant une contrainte vérifiée par la base.

Un `null` signifie que la question ne se pose pas. Il n'est jamais remplacé par une valeur par défaut, ce qui évite de classer une annuelle comme rustique.

| Colonne | Domaine de vocabulaire | Renseigné |
|---|---|---|
| `exposure`, `exposure_note` | exposition | 315 |
| `life_cycle` | cycle | 315 |
| `habit` | port | 315 |
| `conduite` | conduite | 39 |
| `soil`, `soil_note` | sol | 315 |
| `fertility_need` | fertilite | 315 |
| `water_need`, `water_note` | eau | 315 |
| `propagation` | multiplication | 315 |
| `planting_mode` | plantation | 315 |
| `toxicity`, `toxicity_note` | toxicite | 315 |
| `nectar`, `nectar_season` | nectar, nectar_saison | 87 |
| `fragrance`, `fragrance_organ` | parfum, parfum_organe | 30 |
| `pollination` | pollinisation | 35 fruitiers |
| `wintering` | hivernage | 202 |

| Colonne numérique | Unité | Renseigné |
|---|---|---|
| `spacing_cm`, `row_cm` | centimètres | 313, 311 |
| `height_min_cm`, `height_max_cm` | centimètres | 315 |
| `depth_cm` | centimètres, 0 pour un semis en surface | 179 |
| `frost_min_c` | degrés Celsius | 265, la totalité de celles qui restent en terre |
| `first_harvest_year` | années après plantation, 0 pour une récolte la première année | 72 pérennes comestibles |

La vue `plants_full` reconstruit l'objet `attributes` attendu par l'application à partir de ces colonnes et des libellés du vocabulaire. Le contrat de lecture reste donc stable, la normalisation n'a rien cassé côté application.

### Contrôles du modèle

`controle_modele` et `controle_modele_bilan` ajoutent cinq contrôles que la normalisation rend possibles.

Le plus utile croise `frost_min_c` avec le climat déclaré : une plante qui reste en terre et dont la limite de rusticité dépasse le minimum habituel de son climat ne peut pas être déclarée adaptée. Ce contrôle a fait apparaître cinq surestimations, laurier-tin, lavande, oranger du Mexique et camélia en semi-continental, nérine en océanique dégradé, toutes passées au niveau à protéger. Il rend vérifiables les 1580 lignes d'adaptation climatique jusque-là tenues à la main.

Les cinq autres portent sur la toxicité non statuée, la pollinisation absente sur un fruitier, le délai de première récolte absent sur une pérenne comestible, la température de gel absente et la profondeur de semis absente malgré une tâche de semis.

Les contrôles agrégés se taisent quand ils n'ont rien à signaler, au lieu de rendre une ligne à zéro cas.

## Historisation

Toute modification des tables `plants`, `plant_advice`, `plant_phases`, `plant_climates` et `vocabulaires` est enregistrée dans `historique` par un déclencheur : l'état avant, l'état après, la liste des champs réellement modifiés, l'auteur et l'horodatage. Une mise à jour qui ne change rien n'écrit rien.

Les tables personnelles ne sont pas historisées.

Un motif peut être attaché à une série de modifications par la variable de session `app.motif`, à poser en tête de migration.

```sql
set local app.motif = 'correction de la profondeur des bulbes';
```

`historique_lisible` déplie le journal à raison d'une ligne par champ modifié, avec le nom de la plante, l'ancienne et la nouvelle valeur.

Cette table existe parce qu'elle a manqué. Le 28 juillet 2026, la suppression d'une colonne source avant validation de la valeur dérivée a rendu 222 bornes de hauteur irrécupérables. Le journal aurait permis de les restituer.

## Détection d'anomalies

`controle_anomalies` signale une valeur qui s'écarte de plus de deux écarts-types de celles de son groupe. Ce contrôle ne connaît rien au jardinage, il ne compare que des nombres, et c'est ce qui fait son intérêt : il trouve des erreurs sans avoir besoin d'une source.

Le choix du groupe décide de tout. Croiser la famille botanique avec le mode de plantation évite de comparer un tubercule enterré à dix centimètres et une graine semée à un. L'espacement se compare rapporté à la hauteur, sans quoi toute grande plante est signalée. La température de gel se compare à cycle de vie égal.

Première exécution, le 28 juillet 2026 : treize écarts, dont une erreur systématique réelle. Vingt-deux bulbes et tubercules étaient classés en `planting_mode` valant semis, parce que la correspondance depuis l'ancienne colonne `depth` retenait « semis » dès que le texte était une mesure, or la profondeur d'un bulbe est une profondeur de mise en place. Corrigé, et le commentaire de `depth_cm` précise désormais qu'il s'agit d'une profondeur de mise en place quel que soit le mode.

Après affinage des groupes, cinq écarts subsistent, tous légitimes et documentés comme tels : l'alysse odorante, couvre-sol basse et large ; le maïs doux et le tournesol, grosses graines parmi des semis de surface ; la marjolaine et la stévia, gélives au milieu de familles rustiques. Un détecteur qui ne signalerait plus rien serait suspect.

## Corrections du 28 juillet, seconde série

Douze corrections issues d'une relecture des correspondances automatiques, et non des contrôles.

**Confusion entre « sans fumure fraîche » et « aucun apport ».** Neuf fiches de légumes racines et de salades portaient une exigence de fertilisation nulle alors que leur note ne proscrivait que le fumier frais. Le compost mûr leur convient. Betterave, carotte, navet, panais, radis, salsifis, scorsonère et endive passent à faible, la scarole à moyenne. L'ail et l'échalote restent à aucune, c'est juste pour eux.

**Profondeur de l'artichaut.** Un centimètre, valeur du semis en godet, qui est la pratique portée par la fiche puisqu'elle a une tâche de semis à l'abri. Les deux à trois centimètres relevés dans les sources valent pour un semis en place.

**Multiplication des bulbes.** Le glaïeul et le lis étaient donnés multipliables par semis. Le glaïeul se multiplie par caïeux, le lis par écailles ou bulbilles ; le semis existe mais demande trois à quatre ans avant floraison, ce n'est pas la méthode du jardinier. Le cyclamen de Naples se met en place par tubercule et se multiplie par semis spontané.

Un contrôle nouveau ferme cette famille d'erreurs : une plante mise en place par bulbe, tubercule, rhizome ou griffe ne peut pas déclarer le semis comme mode de multiplication.

**Cas laissés en l'état.** L'hysope et la valériane rouge restent en sol calcaire : leur note dit « pauvre et calcaire », la clé n'en porte qu'une, et le calcaire est l'information qui décide d'une plantation.

## Portée réelle de la campagne du 26 juillet

La campagne a porté sur 310 fiches réparties en neuf lots, chaque lot vérifiant des champs précis et non la fiche entière. `plants.verified_at` vaut pourtant pour la fiche entière, ce qui a longtemps masqué cette limite.

| Lot | Périmètre | Fiches | Champs vérifiés |
|---|---|---|---|
| 1 | Arbustes d'ornement | 38 | Multiplication, toxicité, taille |
| 2 | Aromatiques | 40 | Multiplication, toxicité |
| 3 | Fleurs vivaces | 37 | Multiplication, toxicité |
| 4 et 5 | Fleurs annuelles, bulbes à fleurs | 51 | Multiplication, toxicité |
| 6 | Arbres fruitiers | 21 | Greffe et multiplication, taille, plantation |
| 6 | Petits fruits | 15 | Multiplication, toxicité |
| 7 | Grimpantes | 13 | Multiplication, taille |
| 7 | Graminées, fleurs bisannuelles | 22 | Multiplication |
| 8 | Légumes | 73 | Multiplication, production de semences, toxicité |

Sources par lot : Gerbeaud et PagesJaunes Jardinage pour l'horticulture générale, Centre antipoison de Lille et ANSES pour les toxicités, Domaine de Merval pour le calendrier de greffe, Lubera pour la division des graminées, Jardiner Malin et Curiosités Florales pour la taille, SEMAE pour les semences potagères, Truffaut et Gamm vert en recoupement.

Cette portée a été reportée dans `plant_advice.verification` le 28 juillet 2026 : la multiplication passe à `fiche` pour les 310 fiches, la taille passe à `fiche` pour les arbustes d'ornement, les arbres fruitiers et les grimpantes. Les conseils de fertilisation, refaits le 27 juillet sans vérification de source, passent à `reecrit`.

Le reste du référentiel a été relu un à un le 28 juillet 2026. Il ne subsiste plus aucun conseil à l'état `aucune`.

## Les contrôles permanents

`select * from controle_bilan` donne le nombre de cas par contrôle et par gravité. `controle_detail` liste chaque cas.

Douze contrôles : conseil incohérent avec sa période, fenêtre sans conseil, fenêtre aberrante, plante sans aucune tâche, nomenclature absente, exposition hors vocabulaire, recouvrement entre tâches, espacement non normalisé, hauteur absente ou non normalisée, texte trop répété, conseil orphelin, conseil jamais relu.

Le contrôle « fenêtre sans conseil » excluait la floraison depuis l'origine. L'exclusion a été levée le 28 juillet 2026 : elle masquait 24 plantes, parmi les plus consultées du catalogue, dont la barre de floraison s'affichait sans rien à lire.

Les contrôles agrégés, texte répété, hauteur et conseil jamais relu, remontent une ligne de synthèse plutôt qu'une ligne par plante.

La détection d'incohérence de date ne porte que sur la première phrase du conseil, celle qui contient la consigne. Les mentions de saison qui suivent renvoient à d'autres opérations et produiraient des faux positifs.

Au 28 juillet 2026, aucun défaut de gravité haute ou moyenne. En gravité basse subsistent des textes partagés par plus de vingt plantes, justifiés par une identité réelle de besoin, deux espacements non normalisables, le cresson alénois semé à la volée et l'ortie sans espacement, et une hauteur non chiffrable.

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

L'herbe de la pampa, Cortaderia selloana, est interdite à la culture en France métropolitaine par l'arrêté ministériel du 2 mars 2023, qui en interdit aussi la détention, le transport, la vente et l'achat. La fiche est conservée volontairement, son conseil de plantation portant l'interdiction en toutes lettres. Le choix est de renseigner plutôt que de retirer.

La colonne `verification` de `plant_advice` porte quatre états, du plus faible au plus fort.

| État | Sens |
|---|---|
| `aucune` | Le texte n'a jamais été relu, il est dans sa rédaction générée d'origine |
| `reecrit` | Le texte a été refait, sans vérification de source |
| `fiche` | La campagne du 26 juillet 2026 a couvert ce champ au niveau de la fiche |
| `conseil` | Le texte a été relu pour lui-même, `source` et `verified_at` lui sont propres |

Un jeton d'accès personnel GitHub reste actif tant qu'il n'est pas révoqué, depuis `https://github.com/settings/tokens?type=beta`.

### Le contrôle en intégration continue

`.github/workflows/verification.yml` rejoue le contrôle avant dépôt à chaque poussée sur `main` et sur chaque demande de fusion, y compris depuis un clone où le crochet n'est pas installé. Posé le 28 juillet 2026, vérifié dans les deux sens : vert sur `b1634b7`, et rouge sur une demande de fusion portant volontairement la régression historique, l'identifiant `bilanMoment` renommé dans `index.html`. L'étape en échec est bien `Run node outils/verification.mjs`. La branche d'essai a été supprimée et la demande de fusion fermée sans fusionner.

Le fichier a été créé depuis l'interface GitHub, onglet Actions. GitHub refuse qu'un jeton sans la permission `Workflows` crée ou modifie un fichier sous `.github/workflows/`. Pour le modifier depuis un outil, il faut passer `Workflows` à Read and write sur `https://github.com/settings/tokens?type=beta`, section Repository permissions.

Le contrôle échoue si les empreintes de version ne correspondent pas au contenu. C'est voulu : sur la machine de travail, le crochet les corrige avant le dépôt. Une poussée directe sans crochet fait donc rougir l'intégration continue, ce qui est le comportement recherché.

La fonction de bord accepte une variable d'environnement `SEL_TENTATIVES` pour saler les empreintes d'adresse. En son absence, la clé de service sert de sel. Poser cette variable rend le sel indépendant d'une éventuelle rotation de la clé.

Le SMTP personnalisé configuré sur Brevo n'est pas fonctionnel : l'adresse d'expéditeur est une adresse iCloud, domaine dont la politique DMARC interdit l'émission par un tiers, ce qui provoque un rejet systématique. Revenir au SMTP par défaut de Supabase, ou acheter un domaine et l'authentifier.

## Chantiers ouverts

### Fiabilisation du référentiel

Par ordre d'intérêt décroissant, ce qui reste à faire pour rendre la base plus sûre.

**Confrontation de la nomenclature à une autorité.** Les 315 noms latins n'ont jamais été confrontés à GBIF, POWO ou Tela Botanica. L'audit interne du 28 juillet 2026 est propre : familles toutes en `-aceae`, aucun genre rattaché à deux familles, aucun doublon injustifié, les 21 formes signalées étant des hybrides et des fiches au niveau du genre parfaitement valides. Restent invisibles sans autorité externe l'épithète mal orthographiée mais plausible, le nom devenu synonyme, le genre déplacé par une révision récente.

L'appel à `api.gbif.org` est refusé par le bac à sable, réponse 403 et `x-deny-reason: host_not_allowed`. Ajouter `api.gbif.org` et `api.tela-botanica.org` aux domaines autorisés dans les paramètres réseau débloque une passe automatique sur les 315 noms, qui rend pour chacun le statut accepté ou synonyme et le nom accepté correspondant. Seuls les synonymes demanderaient un arbitrage entre révision taxonomique et nom d'usage.

**Les associations n'ont jamais été relues.** 312 fiches, 267 formulations, aucun contrôle. C'est la dernière zone de contenu intacte, et le compagnonnage mêle des faits établis à des affirmations qui ne résistent pas à l'examen.

**La traçabilité est nominale.** 1700 conseils portent une source, mais seulement trente sources distinctes, sous forme de listes du type « Gerbeaud, Terre Vivante, Au Jardin, SNHF ». C'est une liste de ce qui a été consulté, pas une attestation vérifiable. Pour les affirmations chiffrées, profondeur, espacement, température, délai, une URL par affirmation et sa date de consultation changeraient la nature de la garantie. Ne jamais stocker le texte de la source, seulement le fait et le lien.

**Aucun niveau de confiance par champ.** Rien ne distingue une température issue d'une référence d'une température déduite de la bande de rusticité, ni une hauteur mesurée d'une des 222 reconstruites. Une provenance par valeur, mesurée, déduite ou reconstruite, dirait où porter l'effort suivant.

**Aucun retour du terrain.** L'application sait quand une tâche est cochée. Un écart systématique entre la date réelle et la fenêtre annoncée est le seul signal qui ne vienne pas d'une source écrite.

**Aucun test de bout en bout.** Le contrôle avant dépôt est purement statique. Rien ne vérifie qu'une fiche s'affiche, que le calendrier rend des segments cohérents, qu'un décalage climatique produit des dates plausibles.

**Aucun audit tournant.** Rien ne se dégrade seul, mais rien ne se re-vérifie non plus. Dix fiches par mois reconfrontées aux sources maintiennent la qualité sans campagne.

**Le point de faiblesse de fond.** Tout le référentiel a été relu en une journée, par un seul relecteur, avec une seule méthode. Les contrôles automatiques attrapent les incohérences internes, pas les erreurs partagées : une erreur portant sur une famille entière ne serait signalée par rien. Un second regard sur un échantillon vaut plus que le dixième contrôle automatique.

**Sur la qualité des sources.** La majorité du contenu jardinage francophone en ligne se recopie. Cinq sites d'accord ne font pas cinq confirmations. La hiérarchie retenue : autorités d'abord, ANSES et centres antipoison pour la toxicité, SEMAE pour les semences, GBIF, POWO et Tela Botanica pour la nomenclature, INRAE et chambres d'agriculture pour la conduite ; éditeurs à comité ensuite, Terre Vivante et SNHF ; sites généralistes en recoupement seulement ; marchands et blogs comme indices, jamais comme preuves.

### Homogénéité des fiches

La normalisation a été menée le 28 juillet 2026. L'inventaire de départ et l'analyse figurent dans `PLAN-UNIFICATION-DES-FICHES.md`. Les neuf lots du plan sont traités.

Les bornes basses de hauteur de 222 fiches ont été reconstruites à partir des références horticoles et non des données d'origine. Le premier analyseur ne captait que le nombre porteur de l'unité : « 5 à 10 m » donnait 1000 et 1000. Le défaut est passé inaperçu jusqu'à la suppression du texte source, qui a rendu la valeur d'origine irrécupérable. Les bornes hautes n'ont jamais été touchées.

### Justesse du référentiel

Les dix tâches ont été passées le 28 juillet 2026. Plus aucun conseil n'est dans sa rédaction générée d'origine.

1311 conseils sont relus un à un, avec source et date propres. Les 380 restants sont à l'état `fiche` : la multiplication, couverte par les neuf lots de la campagne du 26 juillet, et la taille des ligneuses, couverte par les lots arbustes d'ornement, arbres fruitiers et grimpantes. Ce sont les champs les mieux vérifiés de la base, leur granularité seule reste plus grossière.

La relecture porte sur le texte distinct, pas sur la ligne : douze textes couvraient les 191 conseils de floraison, sept textes en couvraient 142 sur les 259 de la plantation. Les erreurs trouvées étaient de quatre natures.

**Un texte générique appliqué à des plantes qu'il dessert.** « Couper les hampes pour prolonger la production » posé sur l'anis, le carvi et le cumin, qui se récoltent en graines. « Repiquer sans enterrer le collet » posé sur des rhizomes et des tubercules qui se plantent à cinq ou dix centimètres. « Installer le support avant la plantation » posé sur le lierre, la vigne vierge et l'hortensia grimpant, qui s'accrochent seuls. « Repiquer en sol réchauffé » posé sur des bisannuelles rustiques qui se mettent en place avant la saison froide.

**Une séquence inversée.** « Laisser le feuillage jaunir après la floraison » posé sur le colchique, le cyclamen de Naples et la nérine, dont le feuillage suit la fleur au lieu de la précéder.

**Une donnée chiffrée fausse.** L'artichaut et le cardon semés « en surface » au lieu de deux centimètres, la mâche à un centimètre alors que son propre conseil demandait de ne pas enterrer.

**Un fait manquant qui prime sur le conseil donné.** Le sol acide du camélia, du rhododendron, de l'azalée, du piéris et de l'airelle, plus décisif que la technique de plantation. La profondeur des yeux de la pivoine, qui décide de la floraison. Le statut réglementaire de l'herbe de la pampa.

**Un conseil actif nuisible.** Le paillage du collet sur quinze centimètres, posé sur la lavande, le romarin, le thym, la sauge officinale, la sarriette et l'hysope. Ces sous-arbrisseaux méditerranéens meurent d'humidité hivernale et non de froid : le paillage du collet les fait pourrir. C'est le seul cas trouvé où suivre le conseil abîmait la plante.

**Une protection posée sur des plantes qui n'en ont pas besoin.** Buttage, paillage sur trente centimètres et voile d'hivernage double prescrits à des annuelles comme le zinnia ou le cosmos. Récolte avant les fortes gelées prescrite à l'ail et à l'échalote, plantés à l'automne et rustiques en terre.

Les contrôles automatiques ne détectent que les incohérences de date. Une profondeur de semis ou un espacement erronés leur échappent, seule la relecture les trouve.

### Fonctionnalités

Le journal des actions réalisées. Le masquage sert aujourd'hui de substitut à « c'est fait », ce qui est un détournement. Une table d'historique permettrait de dater la dernière taille, d'exploiter enfin les familles botaniques pour la rotation des cultures, et de se passer de mémoire.

Les rappels. L'application ne peut pas joindre son utilisateur, il faut penser à l'ouvrir.

Le filtre adaptées à mon climat dans Mes plantes, proposé et jamais fait. C'est l'usage réellement actionnable de la jauge.

### Fiabilité du travail

Le contrôle avant dépôt et le versionnage automatique des actifs sont en place. Le plafonnement des tentatives sur la fonction `reprise` est déployé.

Le contrôle ne couvre que le statique. Rien ne vérifie qu'une requête vers la base rend bien les colonnes attendues, ni qu'un enchaînement d'écrans se déroule sans exception.

## Historique des décisions principales

Le projet est parti d'un calendrier statique au format HTML, sans base de données.

Une phase de sélection a introduit le jardin personnel, d'abord en stockage local, puis synchronisé par compte une fois Supabase en place. La séparation entre référentiel et jardins a été posée dès la conception du schéma.

Le référentiel a été étendu en trois temps jusqu'à 317 plantes, puis intégralement vérifié, doté d'une nomenclature latine, de niveaux d'adaptation climatique et de quatre tâches supplémentaires. La séparation des fiches groupant deux espèces l'a porté à 320 fiches, dont 316 actives.

L'interface a été reprise plusieurs fois : filtrage par catégorie fine, tri alphabétique, identité visuelle, filtrage par mois, espaces, multi-jardins, feuille de détail modale, barre de navigation flottante, masquage par glissement, jauge d'adaptation climatique, filtre par adaptation au climat.

Le 28 juillet 2026, une session a posé le contrôle avant dépôt et le versionnage par empreinte, plafonné les tentatives de reprise, ouvert la traçabilité au niveau du conseil, séparé les trois fiches à deux espèces, fusionné les deux fiches de groseille, normalisé l'exposition, la hauteur et l'espacement, ajouté le filtre par adaptation au climat, posé le contrôle en intégration continue, et relu la totalité des conseils du référentiel.
