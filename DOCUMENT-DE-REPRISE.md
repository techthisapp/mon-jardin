# Document de reprise, projet Mon jardin

Établi le 25 juillet 2026, mis à jour le 31 juillet 2026.

Les chiffres de ce document sont recomptés en base à la date de mise à jour. Une valeur reprise d'une note antérieure sans recomptage est signalée comme telle.

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

Les seize tables ont RLS activée. Celles du référentiel autorisent la lecture sans condition, ce qui est voulu. Les tables personnelles n'autorisent que des opérations conditionnées à la propriété du jardin. `reprises`, `tentatives` et `historique` n'ont aucune politique et restent inaccessibles à tout rôle autre que celui de service. Aucune table n'autorise d'écriture sans condition.

Ce que la clé permet malgré tout, et qui relève de la nuisance plutôt que de la faille :

**Copier l'intégralité du catalogue.** Plantes, périodes, conseils et adaptations climatiques. Question de propriété du contenu, pas de sécurité.

**Solliciter des envois de courriels.** L'API d'authentification accepte une demande de lien vers une adresse arbitraire. Supabase plafonne le débit, deux par heure sur l'expéditeur par défaut, trente avec un SMTP personnalisé.

**Appeler la fonction de bord `reprise`.** La clé anon est un jeton valide, un attaquant peut donc tenter des codes. Neuf caractères sur trente-deux valeurs représentent environ 45 bits, hors de portée d'une recherche exhaustive. Le plafonnement des tentatives, posé le 28 juillet 2026, ferme la voie : dix échecs par origine sur quinze minutes, trois cents toutes origines confondues sur la même fenêtre, dix créations de code par compte et par heure, réponse 429 assortie d'un en-tête `Retry-After`. Une reprise réussie efface les échecs de son origine.

Les secrets véritables sont ailleurs : la clé `service_role`, qui contourne toutes les règles RLS et n'est accessible qu'à la fonction de bord par variable d'environnement, et le jeton d'accès GitHub, qui autorise l'écriture sur le dépôt.

### Accès par API

Le projet est joignable par le connecteur Supabase, qui permet lecture, migrations et déploiement de fonctions de bord. Les lectures passent sans confirmation, les écritures demandent une approbation.

### Schéma, référentiel en lecture publique

| Table ou vue | Contenu |
|---|---|
| `phases` | Les dix tâches du calendrier. Clé, libellé, couleur, position |
| `plants` | Une ligne par plante. Identité, nomenclature, classement, associations, conseil général, source et date de vérification. Colonnes normalisées listées plus bas. `attributes` ne porte plus que les notes libres non modélisées |
| `vocabulaires` | Vocabulaire contrôlé de tout le référentiel. Une ligne par valeur admise, groupée par domaine |
| `plant_phases` | Périodes par plante et par tâche, en demi-mois de 1 pour le début janvier à 24 pour la fin décembre, avec une liste de climats facultative |
| `plant_advice` | Conseil rédigé par couple plante et tâche, avec `source`, `verified_at` et `verification` à quatre états |
| `plant_climates` | Niveau d'adaptation de chaque plante à chaque climat, avec note et indicateur de dérivation |
| `climates` | Les cinq climats français, avec décalage saisonnier |
| `climate_phase_shifts` | Décalage fin par climat et par tâche |
| `historique` | Journal des modifications du référentiel, alimenté par déclencheur |
| `plants_full` | Vue lue par le site, assemble plante, périodes et conseils |
| `catalog_meta` | Vue calculée, empreinte du catalogue pour le cache |
| `controle_detail`, `controle_bilan` | Contrôles de cohérence des conseils et des périodes |
| `controle_modele`, `controle_modele_bilan` | Contrôles de cohérence du modèle normalisé |
| `controle_anomalies` | Détection d'écarts par comparaison entre plantes voisines |
| `controle_coherence` | Confrontation de la fiche à une source externe déjà chargée, baseflor, et contenance du pic de floraison dans sa période |
| `relecture_bilan` | Avancement de la relecture des conseils par tâche |
| `historique_lisible` | Vue du journal, un enregistrement par champ modifié |
| `conseil_par_periode` | Conseil résolu pour chaque période, le conseil propre à la période l'emportant sur celui de la tâche |
| `et0_reference` | Évapotranspiration de référence par climat et par quinzaine, fiches climatologiques de Météo-France |
| `saison_vegetation` | Bornes de la saison de végétation par climat |
| `plant_kc_quinzaine` | Coefficient cultural par plante, climat et quinzaine, dérivé des stades du bulletin FAO 56 |
| `arrosage_plante_quinzaine` | Besoin en eau restitué, litres par jour et par mètre carré, dose et intervalle de reprise |

### Schéma, données personnelles

| Table | Contenu |
|---|---|
| `gardens` | Plusieurs jardins par compte. Nom, climat, altitude, date de dernière ouverture, code postal et position, texture du sol |
| `releves_eau` | Mesures du jardinier, une ligne par jardin et par jour : pluie relevée au pluviomètre et arrosage apporté, en millimètres |
| `stations_meteo` | Catalogue des postes de mesure de Météo-France. Lecture ouverte, écriture réservée à la collecte |
| `pluie_station` | Lame d'eau quotidienne mesurée au poste, avec son code qualité. Fenêtre glissante de 120 jours |
| `vigilance` | Vigilance météorologique par département et par échéance, aujourd'hui et demain. Couleur, aléas, bulletin |
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

Les tables `reprises`, `tentatives` et `historique` n'ont aucune politique, elles sont donc inaccessibles aux rôles `anon` et `authenticated`. Seules la fonction de bord et les migrations y accèdent.

Le retrait d'une plante du référentiel se fait par `is_active` à faux, avec `replaced_by` pour renvoyer vers la fiche conservée.

### Modèle normalisé

Chaque notion se lit sur une clé de vocabulaire contrôlé, la nuance restant dans une note libre facultative. La table `vocabulaires` porte les 68 valeurs admises, groupées en 16 domaines. L'intégrité est assurée par des clés étrangères composites vers `vocabulaires(domaine, cle)`, le domaine étant porté par une colonne générée constante. Cette construction évite une table de référence par notion tout en gardant une contrainte vérifiée par la base.

Un `null` signifie que la question ne se pose pas. Il n'est jamais remplacé par une valeur par défaut, ce qui évite de classer une annuelle comme rustique.

| Colonne | Domaine | Renseigné |
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
| `wintering` | hivernage | 209 |
| `nectar` | nectar | 99, toutes sourcées |
| `nectar_season` | nectar_saison | 0, aucune source ne l'établit |
| `pollen` | pollen | 99, toutes sourcées |
| `fragrance` | parfum | 0, aucune base ne cote l'intensité |
| `fragrance_organ` | parfum_organe | 68, toutes sourcées |
| `foliage`, `foliage_note` | feuillage | 117 hors annuelles |
| `pollination` | pollinisation | 42 fruitiers |
| `pollination_vector` | pollinisation_vecteur | 168 |
| `uses` | usage | 91 |
| `irrigation_mode` | irrigation | 315, dont 170 calculées, 68 à la reprise seule, 77 sans arrosage |
| `kc_modele` | kc_modele | 315 |

Colonnes ajoutées depuis le 28 juillet, hors vocabulaire contrôlé.

| Colonne | Type | Rôle | Renseigné |
|---|---|---|---|
| `flower_colors`, `flower_color_note` | text[], text | Couleurs de floraison et libellé d'origine | 257 |
| `floraison_pic_q`, `floraison_pic_note` | smallint, text | Quinzaine du maximum de floraison, écrite seulement quand elle est sourcée, jamais déduite du milieu de la période | 12 |
| `frost_note` | text | Nuance de la limite de rusticité, variétés comprises | 10 |
| `humidite_hivernale` | boolean | Craint l'excès d'eau hivernal plutôt que le froid | 14 |
| `nectar_ug_fleur`, `pollen_um3_fleur` | numeric | Mesures citées, par fleur, distinctes de l'appréciation apicole | 74 et 36 |
| `groupe_cultivars` | text | Groupe de cultivars quand le rang botanique est en litige | 3 |
| `kc_ini`, `kc_mid`, `kc_end`, `cycle_*_j`, `contenant_litres_defaut` | numeric, int | Paramètres du calcul d'arrosage | 315 |

| Colonne numérique | Unité | Renseigné |
|---|---|---|
| `spacing_cm`, `row_cm` | centimètres | 313, 311 |
| `height_min_cm`, `height_max_cm` | centimètres | 315 |
| `depth_cm` | centimètres, profondeur de mise en place quel que soit le mode, 0 pour un semis en surface | 177 |
| `frost_min_c` | degrés Celsius, température où les dégâts commencent | 265 |
| `first_harvest_year` | années après plantation, 0 pour une récolte la première année | 72 pérennes comestibles |

La vue `plants_full` reconstruit l'objet `attributes` attendu par l'application à partir de ces colonnes et des libellés du vocabulaire. Le contrat de lecture est donc stable : la normalisation du stockage n'a rien cassé côté application.

Le 31 juillet, cinq colonnes ont été ajoutées en fin de vue, pour la fiche détaillée : `pollen`, `flower_colors`, `flower_color_note`, `floraison_pic_q`, `floraison_pic_note`. L'ajout se fait en queue de liste, aucune colonne existante n'est déplacée, et l'application lit la vue par `select *`.

### Contenu

| Élément | Valeur |
|---|---|
| Plantes actives | 315 |
| Plantes retirées | 5 |
| Familles botaniques | 84 |
| Tâches | 10 |
| Périodes | 2009, dont 446 conditionnées au climat |
| Conseils rédigés | 1761, dont 1281 relus un à un, 385 couverts au niveau de la fiche et 16 rattachés à une période précise |
| Adaptations climatiques | 1580, dont 56 posées à la main |
| Climats | 5 |
| Vocabulaire contrôlé | 131 valeurs, 24 domaines |
| Journal du référentiel | 3652 enregistrements |

Le nombre de périodes a baissé de 2052 à 2009 sans perte de contenu : 82 paires de lignes décrivant une même fenêtre à cheval sur le 1er janvier, l'une finissant à la quinzaine 24 et l'autre commençant à la 1, ont été fusionnées en une seule ligne dont la borne de début dépasse la borne de fin. Quatre-vingts fenêtres sont aujourd'hui dans ce cas.

## Le calendrier

Dix tâches : semis à l'abri, semis en pleine terre, plantation et repiquage, floraison, récolte, taille et entretien, multiplication et division, fertilisation et amendement, protection hivernale, protection estivale.

Les périodes s'expriment en demi-mois. Une fenêtre sans liste de climats vaut partout, une fenêtre restreinte ne s'applique qu'aux climats cités. Le décalage saisonnier propre au climat du jardin s'applique ensuite, différent pour les fenêtres ancrées au premier et au second semestre.

Une fenêtre peut être à cheval sur le 1er janvier, et s'écrit alors sur une seule ligne dont la borne de début dépasse la borne de fin, par exemple 19 à 6 pour une plantation d'octobre à mars. Tout code qui lit `plant_phases` doit traiter ce cas : un test d'appartenance s'écrit `début <= fin ? q entre début et fin : q >= début ou q <= fin`. C'est l'écriture retenue depuis la fusion des quatre-vingt-deux paires qui décrivaient une même fenêtre en deux lignes.

## Le climat

Cinq climats : océanique, océanique dégradé qui sert de référence de calage, semi-continental, montagnard, méditerranéen.

Chacun porte un décalage en demi-mois pour les fenêtres de printemps et pour celles d'automne, affinable par tâche. La taille et la multiplication suivent moins fortement le climat que les semis.

Chaque plante porte un niveau d'adaptation par climat : adaptée, à protéger, à hiverner, déconseillée. Les niveaux sont dérivés de la rusticité normalisée puis corrigés à la main là où la rusticité seule induit en erreur. La colonne `derived` distingue les deux origines.

Sous climat méditerranéen, un niveau dégradé traduit la sécheresse estivale et non le froid, ce qui explique l'absence de protection hivernale et la présence d'une protection estivale.

Depuis l'introduction de `frost_min_c`, ces 1580 lignes sont vérifiables : un contrôle croise la limite de rusticité de la plante avec le minimum habituel du climat où elle est déclarée adaptée.

## Le référentiel

### Campagne de vérification du 26 juillet

L'intégralité du référentiel a été reprise en neuf lots vérifiés auprès de sources horticoles et toxicologiques, avec renseignement de `source` et `verified_at`.

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

Sources : Gerbeaud et PagesJaunes Jardinage pour l'horticulture générale, Centre antipoison de Lille et ANSES pour les toxicités, Domaine de Merval pour le calendrier de greffe, Lubera pour la division des graminées, Jardiner Malin et Curiosités Florales pour la taille, SEMAE pour les semences potagères, Truffaut et Gamm vert en recoupement.

Corrections majeures : le fusain d'Europe toxique dans toutes ses parties et non seulement ses fruits, l'usage interne de la consoude interdit en France, les feuilles de rhubarbe, la solanine des tubercules verdis, la toxicité des haricots crus, le favisme de la fève, la toxicité du cyclamen, de la fritillaire et de la renoncule, l'avertissement de confusion entre crocus et colchique.

Corrections de périodes : la clématite dont les trois groupes de taille étaient confondus, le pyracantha dont la taille supprimait les baies, l'asperge dont la fertilisation est automnale, l'iris dont le conseil de plantation contredisait sa propre fenêtre.

Chaque lot a porté sur des champs précis et non sur la fiche entière, alors que `plants.verified_at` vaut pour la fiche entière. Cette portée réelle a été reportée dans `plant_advice.verification` le 28 juillet : la multiplication passe à `fiche` pour les 310 fiches, la taille passe à `fiche` pour les arbustes d'ornement, les arbres fruitiers et les grimpantes.

### Relecture des conseils du 28 juillet

Les dix tâches ont été passées. Plus aucun conseil n'est dans sa rédaction générée d'origine. 1311 conseils sont relus un à un avec source et date propres, les 380 restants sont couverts au niveau de la fiche par la campagne précédente.

La relecture porte sur le texte distinct, pas sur la ligne : douze textes couvraient les 191 conseils de floraison, sept textes en couvraient 142 sur les 259 de la plantation.

Les erreurs trouvées relevaient de six familles.

**Un texte générique appliqué à des plantes qu'il dessert.** « Couper les hampes pour prolonger la production » posé sur l'anis, le carvi et le cumin, qui se récoltent en graines. « Repiquer sans enterrer le collet » posé sur des rhizomes et des tubercules qui se plantent à cinq ou dix centimètres. « Installer le support avant la plantation » posé sur le lierre, la vigne vierge et l'hortensia grimpant, qui s'accrochent seuls. « Repiquer en sol réchauffé » posé sur des bisannuelles rustiques qui se mettent en place avant la saison froide.

**Une séquence inversée.** « Laisser le feuillage jaunir après la floraison » posé sur le colchique, le cyclamen de Naples et la nérine, dont le feuillage suit la fleur au lieu de la précéder.

**Une donnée chiffrée fausse.** L'artichaut et le cardon semés « en surface » au lieu d'un centimètre en godet, la mâche à un centimètre alors que son propre conseil demandait de ne pas enterrer.

**Un fait manquant qui prime sur le conseil donné.** Le sol acide du camélia, du rhododendron, de l'azalée, du piéris et de l'airelle. La profondeur des yeux de la pivoine, qui décide de la floraison. Le statut réglementaire de l'herbe de la pampa.

**Un conseil actif nuisible.** Le paillage du collet sur quinze centimètres, posé sur la lavande, le romarin, le thym, la sauge officinale, la sarriette et l'hysope. Ces sous-arbrisseaux méditerranéens meurent d'humidité hivernale et non de froid : le paillage du collet les fait pourrir. Seul cas trouvé où suivre le conseil abîmait la plante.

**Une protection posée sur des plantes qui n'en ont pas besoin.** Buttage, paillage sur trente centimètres et voile d'hivernage double prescrits à des annuelles comme le zinnia ou le cosmos. Récolte avant les fortes gelées prescrite à l'ail et à l'échalote, plantés à l'automne et rustiques en terre.

Trois avertissements de comestibilité manquaient : l'olive fraîche, immangeable sans désamérisation, le coing qui ne se consomme que cuit, le kaki astringent immangeable tant qu'il n'est pas blet. S'y ajoutent le risque de douve du cresson issu d'eau non contrôlée et la sève photosensibilisante de l'angélique.

### Ce que dit un conseil de floraison

La floraison est un constat plus qu'une action, ce qui rend la tâche particulière à rédiger. Les 215 conseils suivent cinq registres, et un texte qui n'entre dans aucun n'a probablement rien à dire.

**Ce que la floraison déclenche ailleurs.** La pomme de terre en fleur signale que les primeurs sont bonnes à arracher. La première fleur nouée de la tomate marque le passage à un apport riche en potasse. Le thym et la lavande sont à leur maximum de parfum juste avant l'épanouissement.

**Ce qu'elle interdit pendant sa durée.** Ne pas tailler sous peine de supprimer la fructification, ne pas traiter pour préserver les pollinisateurs.

**Ce qu'elle révèle.** La couleur de l'hortensia donne le pH du sol. La période de floraison d'une clématite indique son groupe de taille. Une reprise de floraison désigne un rosier ou une framboise remontants, ce qui décide de la taille.

**Ce qui peut mal tourner.** Une gelée sur les fleurs de fraisier noircit le cœur et supprime le fruit. Le pollen de tomate devient stérile au-dessus de trente-cinq degrés. La courgette avorte ses fruits faute de pollinisateurs.

**L'alerte de montaison.** Pour le basilic, la laitue ou la rhubarbe, la floraison annonce la fin de la production et appelle une correction immédiate.

### Séparations et fusion de fiches

Trois fiches groupaient deux espèces sous un seul binôme. Elles ont été séparées le 28 juillet. Dans chaque cas la fiche existante conserve son identifiant et devient l'espèce principale, ce qui préserve les sélections des jardins qui l'avaient retenue. La seconde espèce arrive en fiche neuve.

| Fiche d'origine | Devient | Fiche créée |
|---|---|---|
| `origan-marjolaine` | `origan`, Origanum vulgare | `marjolaine`, Origanum majorana, gélive |
| `salsifis-scorsonere` | `salsifis`, Tragopogon porrifolius, racine blanche | `scorsonere`, Scorzonera hispanica, racine noire |
| `chicoree-frisee-scarole` | `chicoree-frisee`, Cichorium endivia var. crispum | `scarole`, Cichorium endivia var. latifolium |

Les `slug` des trois fiches d'origine ont donc changé. Rien dans l'application ne dépend du `slug`, les jardins référencent l'identifiant technique.

L'opération inverse a été menée le même jour sur les groseilles. `groseille` et `groseille-blanche` portaient toutes deux Ribes rubrum, soit deux couleurs d'une même espèce. `groseille` devient « Groseille à grappes », enrichie de la floraison et de la taille que seule l'autre fiche portait, et `groseille-blanche` passe à `is_active` faux avec `replaced_by` vers elle.

### Corrections tirées des correspondances automatiques

La normalisation a produit ses propres erreurs, toutes détectées et corrigées le 28 juillet.

**Confusion entre « sans fumure fraîche » et « aucun apport ».** Neuf fiches de légumes racines et de salades portaient une exigence de fertilisation nulle alors que leur note ne proscrivait que le fumier frais. Le compost mûr leur convient. L'ail et l'échalote restent à `aucune`, c'est juste pour eux.

**Négation ignorée.** Le magnolia caduc était classé en sol calcaire alors que sa note dit « sol humifère, non calcaire ». La correspondance testait la présence du mot avant d'en tester la négation.

**Mode de mise en place.** Vingt-deux bulbes et tubercules étaient classés en semis, parce que la correspondance retenait « semis » dès que l'ancienne colonne `depth` portait une mesure, or la profondeur d'un bulbe est une profondeur de mise en place.

**Mode de multiplication.** Le glaïeul et le lis étaient donnés multipliables par semis. Le glaïeul se multiplie par caïeux, le lis par écailles ou bulbilles ; le semis demande trois à quatre ans avant floraison, ce n'est pas la méthode du jardinier. Le cyclamen de Naples se met en place par tubercule et se multiplie par semis spontané.

## Travaux du 28 au 31 juillet 2026

### Confrontation de la nomenclature, faite

Les 316 fiches portant un nom latin ont été confrontées à GBIF, à POWO par le jeu World Checklist of Vascular Plants de Kew, et à Tela Botanica par la base BDTFX. L'état de chaque confrontation est stocké dans les colonnes `gbif_*`, `powo_*` et `tela_*`, datées au 28 juillet 2026. Ces colonnes sont de la métadonnée technique et ne sont pas journalisées.

Résultat : 263 noms acceptés à la fois par GBIF et POWO, 37 synonymes pour les deux, 15 en divergence de statut entre les deux. Côté Tela Botanica, 265 noms retenus dans la flore de France, 18 non retenus, 32 absents, essentiellement des exotiques et des cultivars hors flore de France.

Une seule correction de contenu en est sortie, l'Estragon de Russie, dont le latin passe d'`Artemisia dracunculoides` à `Artemisia dracunculus`, aucune source ne retenant la première forme. Le libellé français est conservé.

Politique de nommage confirmée : le champ `latin` suit l'usage français et horticole quand Tela Botanica retient le nom, le nom accepté mondial étant stocké en parallèle. Les référentiels mondiaux fusionnent volontiers les taxons horticoles dans l'espèce sauvage, ce que la base ne suit pas. Les reclassements récents de genre, Pisum en Lathyrus, Anemone en Eriocapitella, Hyssopus en Dracocephalum et les autres, sont stockés sans être appliqués.

Accès aux référentiels, vérifié le 31 juillet 2026. `api.gbif.org` et `api.tela-botanica.org` répondent depuis le conteneur, le blocage décrit dans les versions antérieures de ce document n'existe plus. GBIF s'interroge par `species/match`, et POWO par `species/search?datasetKey=f382f0ce-323a-4091-bb9f-add557f3a9a2` faute d'accès direct au site de Kew. Tela Botanica n'accepte que le masque générique, `?masque=NOM&recherche=stricte` ; la variante `masque.nom` est ignorée et renvoie le catalogue entier, ce qui se lit comme une absence de correspondance si l'on n'y prend pas garde. Le `canonicalName` de GBIF supprime les marqueurs de rang, il faut les retirer des deux côtés avant comparaison.

### Arrosage, calcul FAO 56

Le besoin en eau n'est plus un libellé mais un calcul. Trois tables et une vue le portent.

`et0_reference` donne l'évapotranspiration de référence par climat et par quinzaine, 120 lignes, depuis les fiches climatologiques de Météo-France. `saison_vegetation` borne la saison par climat. `plant_kc_quinzaine` porte le coefficient cultural par plante, climat et quinzaine, 37 800 lignes, dérivé des longueurs de stade et des coefficients du bulletin FAO 56. La vue `arrosage_plante_quinzaine` restitue les litres par jour, les litres par jour et par mètre carré, l'unité d'affichage, le niveau, et pour les plantes qui ne s'arrosent qu'à l'installation, la dose et l'intervalle de reprise.

Quatre modes d'arrosage sont portés par `irrigation_mode` : calculé pour 170 fiches, reprise seule pour 68, sans arrosage pour 77, contenant pour les cultures en pot. Le mode décide de ce que l'application affiche, un chiffre quotidien n'ayant aucun sens pour un arbre installé.

### Bilan hydrique du sol, 1er août 2026

Le conseil d'arrosage du jour ne vient plus d'un écart entre pluie et évaporation sur sept jours, qui ignorait ce que le sol garde en réserve. Le sol est traité comme un réservoir, selon le chapitre 8 du bulletin FAO 56.

L'épuisement du jour vaut celui de la veille, moins la pluie et l'arrosage, plus la consommation des cultures, borné entre zéro et la capacité au champ. La consommation est l'évapotranspiration de référence du point du jardin multipliée par le coefficient cultural moyen des plantes retenues, lu quinzaine par quinzaine.

Trois constantes portent le modèle, toutes sourcées. La réserve utile vient de la texture du sol, nouveau champ `gardens.sol_texture` : sableux 80, limoneux 155, argileux 165 millimètres par mètre de profondeur, milieux des fourchettes du tableau 19 du bulletin, recoupées par les capacités de rétention publiées par l'université de Californie. La zone racinaire de référence vaut 40 cm, le tableau 22 plaçant les légumes de plein champ entre 0,3 et 0,6 mètre. Le seuil de confort vaut 40 pour cent de la réserve, valeur du tableau 22 pour la tomate, ajusté chaque jour à la demande par la formule `p = 0,40 + 0,04 (5 − ETc)`, bornée entre 0,1 et 0,8.

La dose recommandée est plafonnée à la fraction facilement utilisable. Au-delà, l'eau traverse la zone racinaire sans profiter à la culture.

La table `releves_eau` porte ce que le jardinier mesure. Le relevé de pluviomètre prime sur la lame d'eau du modèle, jour par jour, et l'arrosage saisi entre dans le bilan. La saisie couvre les trois derniers jours, depuis la feuille de l'eau. Sans relevé, le calcul ignore les arrosages non enregistrés et surestime donc le déficit, ce que la feuille énonce.

La fenêtre météo passe de sept à trente jours pour que l'état initial du réservoir, posé à la moitié de la capacité, ne pèse plus sur le résultat. Contrôlé : après trente jours, le résultat est identique quel que soit l'état de départ.

### Pluie mesurée aux postes de Météo-France, 1er août 2026

La clé du portail API de Météo-France s'est révélée inutile. Le même contenu est publié en fichiers ouverts sur data.gouv.fr, jeu « Données climatologiques de base, quotidiennes », un fichier par département, deux ans d'antériorité, environ 230 ko compressés, déposé chaque matin vers 6 h. Aucun compte, aucune clé.

La fonction Edge `pluie-stations` résout l'adresse du fichier par l'interface de data.gouv, le nom portant la période courante et changeant d'année en année. Elle le décompresse, le lit, et met à jour `stations_meteo` et les 120 derniers jours de `pluie_station`. Les départements suivis sont déduits des codes postaux des jardins situés. Une tâche `cron` nommée `collecte-pluie` l'appelle à 6 h 40 UTC.

Un déclencheur sur `gardens` rattache le jardin au poste le plus proche à moins de quarante kilomètres, à la création comme au changement de commune. La fonction `station_la_plus_proche` porte le calcul.

La lame d'eau du jour se lit désormais dans trois sources, par ordre de confiance décroissante : le relevé du pluviomètre du jardinier, puis le poste rattaché, puis le modèle. Les valeurs de code qualité supérieur à 1 sont écartées. Le poste publiant avec deux jours de retard, le modèle couvre toujours les journées les plus récentes.

Ce que la mesure change, contrôlé sur le jardin de Fain-lès-Moutiers et le poste de Montbard, à 10,1 km. Sur juillet 2026, le total est presque identique, 38,6 mm mesurés contre 37,3 mm modélisés. Le jour ne l'est pas : le poste a mesuré 9,2 mm le 13 juillet, dont le modèle ne voit rien, et le modèle place 4,7 mm le 16 juillet, où le poste n'a rien mesuré. Pour un réservoir, la date d'un remplissage compte autant que son volume.

### Vigilance météorologique, 1er août 2026

Même voie que la pluie mesurée, sans compte ni clé. Le jeu « Vigilance météorologique archivée » de data.gouv.fr expose un seau objet dont l'arborescence est `data/vigilance/metropole/AAAA/MM/JJ/HHMMSS/`. Plusieurs dépôts par jour, davantage en épisode actif, le dernier fait foi. Le listage S3 du préfixe du jour coûte moins d'un kilo-octet, la fonction `vigilance` prend donc le dernier répertoire puis lit deux fichiers : `CDP_CARTE_EXTERNE.json` pour la couleur et les aléas de chaque département, `CDP_TEXTES_VIGILANCE.json` pour le bulletin départemental. Une tâche `cron` nommée `collecte-vigilance` l'appelle toutes les deux heures.

Identifiants d'aléa du descriptif technique : 1 vent, 2 pluie et inondation, 3 orages, 4 crues, 5 neige et verglas, 6 canicule, 7 grand froid, 8 avalanches, 9 vagues et submersion. Couleurs : 1 vert, 2 jaune, 3 orange, 4 rouge. Le vert n'est pas une alerte et ne s'affiche pas.

Le bandeau porte le niveau le plus élevé des deux échéances, une vigilance orange annoncée pour demain comptant autant qu'une vigilance en cours, et il le dit. Chaque aléa porte sa conséquence au jardin, table `VIGI_GESTE`. Le détail s'ouvre en feuille : les deux échéances, le geste, le bulletin du département et l'heure d'émission.

Les alertes calculées ne répètent pas la vigilance : une vigilance canicule couvre l'alerte de chaleur, une vigilance vent couvre l'alerte de vent, table `VIGI_COUVRE`.

### Trois correctifs météo, 1er août 2026

Le modèle n'est plus forcé dans l'appel à Open-Meteo. `models=meteofrance_seamless` s'arrête à quatre jours et rend des valeurs nulles ensuite, que l'affichage transformait en journées à zéro degré. La sélection automatique prend AROME sur les premiers jours puis prolonge, et couvre les sept jours sans trou. Les journées sans température sont de toute façon écartées de la liste, et la vue s'intitule d'après le nombre de jours réellement disponibles.

L'en-tête portait la température maximale du jour et le code météo quotidien, défini par Open-Meteo comme la condition la plus sévère des vingt-quatre heures. À 21 h, l'application annonçait 29 degrés et de la pluie alors qu'il en faisait 20 sous un ciel dégagé, le libellé venant d'un dixième de millimètre tombé à midi. La série horaire est lue dans un second appel limité à la journée, le grand chiffre et le libellé viennent de l'heure en cours, le maximum et le minimum passent en seconde ligne.

Le code postal ne suffit pas à situer un jardin : 21500 couvre huit communes, 21260 en couvre huit autres, et l'application retenait silencieusement la première. Le champ accepte maintenant un nom de commune ou un code postal, liste les communes correspondantes et laisse choisir. Une ligne Commune apparaît dans les réglages du jardin, seul chemin pour corriger un lieu déjà enregistré.

La pastille d'eau de l'en-tête et le pied de la synthèse portent la décision du jour, arroser tant de litres, attendre la pluie annoncée, ou ne rien faire pendant tant de jours. Le litrage par plante de la fiche reste calé sur la normale de saison, qui est une référence stable et non une prévision.

### Pic de floraison

Colonne `floraison_pic_q`, quinzaine du maximum de floraison, avec `floraison_pic_note` pour la source. Douze fiches sourcées, aucune dérivée.

La valeur vient des observations françaises de l'Observatoire des Saisons, moissonnées par l'API TEMPO de `data.pheno.fr`, stade BBCH 65, défini comme le moment où la moitié des fleurs sont épanouies. La médiane est calculée sur les observations postérieures à 2000 quand l'effectif le permet, afin de décrire le climat actuel. Noisetier, Amandier, Laurier-tin, Abricotier, Forsythia, Prunier, Cerisier, Poirier, Pommier, Lilas, Noyer, Sureau noir.

Le pic n'est jamais déduit du milieu de la période. La règle de dérivation a été écrite avant d'être mesurée, puis rejetée : l'accord avec les valeurs sourcées plafonne entre 67 et 70 pour cent dans la zone où la règle discrimine, et la validation en deux moitiés ne converge pas vers le même seuil. Une plante sans pic sourcé n'affiche donc rien, plutôt qu'une valeur fausse.

Deux périodes de floraison ont été corrigées à cette occasion, le pic observé précédant la période enregistrée : Lilas de 9-11 à 7-11, Sureau noir de 11-13 à 9-13.

### Conseil rattaché à une période

Une plante dont une tâche revient deux fois dans l'année recevait le même texte aux deux dates. `plant_advice` porte maintenant une clé propre, `id`, et une clé étrangère facultative `phase_id` vers `plant_phases`, avec unicité sur le triplet plante, tâche, période. Un conseil sans `phase_id` vaut pour toute la tâche, un conseil avec `phase_id` ne vaut que pour cette période et l'emporte sur le premier.

La vue `conseil_par_periode` résout la règle et donne, pour chaque période, le texte à afficher et sa portée.

Le chantier est terminé au 1er août 2026 : 255 conseils propres à une période, aucune période sans texte parmi celles qu'un jardinier peut voir. Le périmètre réel était de 125 tâches et 250 périodes, et non 122 : une même tâche déclinée par climat compte pour une seule occurrence, ce que le décompte initial confondait.

La rédaction est dérivée, conformément à la décision 2 sur la vérifiabilité, et tient dans deux migrations SQL rejouables. Une phrase est construite à partir de la position de la fenêtre dans l'année, du port, du seuil de gel et de la sensibilité à l'humidité hivernale, puis le conseil général la suit, sa mention d'alternative résolue en faveur de la période. La fonction `saison_de_fenetre` donne la saison d'une fenêtre par son milieu, et rend nul pour une fenêtre à cheval.

Règles retenues par tâche. Plantation : automne pour un ligneux, période de référence, fin d'hiver pour les racines nues, printemps pour un sujet en conteneur ; pour une vivace, l'arrière-saison enracine avant l'hiver et le printemps demande un arrosage suivi ; pour un bulbe, l'automne avance et allonge la floraison. Fertilisation : apport de fond au printemps, apport d'entretien fractionné en pleine production. Multiplication : division de printemps à reprise immédiate, division d'automne qui repart tôt. Semis en place : printemps, fin d'été pour l'arrière-saison, automne pour les annuelles rustiques qui passent l'hiver. Floraison et récolte : première et seconde vague.

Deux exceptions relevées à la relecture et corrigées : la seconde floraison d'un fruitier ne demande pas de suppression des fleurs fanées, et le conseil général de la Fraise décrit l'apport de juillet, ce qui ne convient pas à sa fenêtre de fin d'hiver.

**Le conseil de période n'arrivait pas jusqu'à l'écran.** La vue `plants_full` construisait `guide` par `jsonb_object_agg(a.phase, a.advice)` sur toutes les lignes de `plant_advice`, conseil général et conseils de période confondus. Avec plusieurs lignes pour la même tâche, l'agrégat en gardait une au hasard : la Glycine affichait sa taille d'hiver au mois d'août. Le défaut existait depuis l'écriture des seize premiers conseils de période et s'est étendu à toutes les fiches concernées.

Correction en deux points. La vue distingue maintenant `guide`, qui ne porte que le conseil général, et `guide_periode`, ajouté en fin de vue pour ne pas déplacer les colonnes existantes, qui porte les conseils de période indexés par identifiant de fenêtre. Chaque segment de `phases` gagne son identifiant en quatrième position, et `segsDe` le conserve à travers le décalage climatique. Dans l'application, `conseilPeriode(p, k)` cherche la fenêtre active et rend son texte, `texteAction` retombant sur le conseil général en son absence.

Contrôle : sur les 125 tâches à périodes multiples, toutes ont désormais un texte différent par période, à l'exception des fiches inactives Mélisse et Souci.

Contrôles de forme sur les 255 textes : aucun tiret cadratin, aucune flèche, aucune mention d'alternative restante, aucune élision manquée, longueur de 109 à 446 caractères. Quatre périodes restent sans texte propre, sur les fiches inactives Mélisse et Souci, remplacées par Mélisse citronnelle et Souci officinal.

### Couleurs de fleur et seuils de gel

Vingt-deux couleurs de fleur écrites sur les vingt-trois fiches qui en manquaient, chacune confirmée par deux sources indépendantes. La Casseille reste vide, aucune seconde source ne renseignant la couleur florale de cet hybride. Trois pièges écartés, où la couleur annoncée désignait autre chose que la fleur : les rameaux du Cornouiller à bois rouge, les jeunes feuilles du Photinia, les pétioles de la Rhubarbe. Le périmètre passe à 257 fiches sur les 315.

Dix seuils de gel écrits. Le contrôle qui croisait le seuil avec la classe de rusticité signalait dix contradictions ; l'examen a montré une cause unique et non dix erreurs, deux échelles de rusticité coexistant dans la base, l'une pour les ligneux et l'autre pour les potagères, un chou rustique à moins dix degrés et un arbuste rustique à moins quinze n'ayant pas le même sens. Le contrôle est désormais scindé selon le port.

### Sourçage apicole du nectar et du pollen

Révisé le 2 août 2026. Les colonnes `nectar` et `pollen` ne sont plus renseignées que sur les 91 et 90 fiches qu'une source de premier rang cote, toutes sourcées. Elles l'étaient sur les 315, dont 18 seulement citaient une source, 169 se déclaraient estimations et 128 ne déclaraient rien.

La source est la *Liste de plantes attractives pour les abeilles*, Val'hor, FranceAgriMer, Société nationale d'horticulture de France, Institut de l'Abeille, ASTREDHOR, CNPMAI et INRA, juin 2017, 200 espèces. Elle cote l'intérêt nectar et l'intérêt pollen de zéro à trois pictogrammes et publie un indice de confiance sur trois degrés. La correspondance avec les quatre classes du vocabulaire est un réétiquetage, non une conversion : les deux échelles ont le même nombre de degrés et la même sémantique aux extrémités, aucun seuil n'est à choisir, il n'y a donc rien à valider.

L'indice de confiance est employé de façon dissymétrique, et cette dissymétrie est mesurée. Une cotation positive suppose une observation affirmative, qu'une documentation mince ne peut pas produire. Une cotation nulle est une négation, dont la valeur ne dépasse pas la complétude de la documentation. La source porte la signature de ce biais : la part de nectars nuls tombe de 23 pour cent à l'indice 1 à 8 pour cent à l'indice 3, et la part de pollens nuls de 40 à 26 pour cent. Lues une à une, les cotations nulles de l'indice 1 contiennent des erreurs franches, l'achillée et l'aneth sans pollen, l'abélia et le muflier sans nectar, la pastèque sans pollen, quand celles de l'indice 2 sont défendables et comprennent deux cas d'école, le noisetier et l'argousier sans nectar, tous deux à pollinisation anémophile. Les cotations nulles de l'indice 1 ne sont donc pas retenues, dix-sept en tout, et la provenance le dit. Aucune espèce de la liste n'étant nulle dans les deux colonnes, chaque fiche garde au moins une cotation.

C'est ce qui la distingue des trois tentatives précédentes. Deux jeux quantitatifs ont été essayés et écartés, la mesure de sucre nectarifère de Tew et coauteurs et la mesure de volume pollinique du jeu AgriLand. La règle de conversion, écrite avant d'être appliquée, échouait deux fois avec la même signature : corrélation de rang de 0,107 sur le nectar et de 0,168 sur le pollen, et inversion des médianes par classe. La cause est identifiée, ces jeux mesurent par fleur quand l'appréciation apicole intègre le nombre de fleurs portées et la durée de floraison. Le Noisetier le montre sans ambiguïté, dernier du classement mesuré et ressource pollinique majeure de février.

Les mesures sont conservées dans deux colonnes distinctes de l'appréciation, `nectar_ug_fleur` et `pollen_um3_fleur`, avec leur citation et leur DOI en commentaire de colonne.

Les catalogues employés jusque-là, Bienenroute et la table de Gembloux, ne sont plus la convention du référentiel et leurs valeurs ont été retirées. Le contrôle sur cinq espèces au comportement non discutable reste en vigueur avant tout usage d'une table apicole, Saule marsault, Noisetier, Coquelicot, Thym et Lavande : c'est lui qui a rattrapé une inversion de colonnes lors d'une réextraction.

Les deux colonnes utiles de la liste Val'hor sont des pictogrammes vectoriels que `pdftotext` ne rend pas. L'extraction convertit chaque page en SVG par `pdftocairo -svg` et reconnaît les glyphes au début de leur tracé, puis regroupe les positions en rangées. La méthode est décrite en détail dans la procédure d'ajout d'une plante.

### Parfum, l'organe et non l'intensité

L'intensité du parfum n'est cotée par aucune base. La colonne `fragrance` est vidée sur les 315 fiches et le vocabulaire à quatre classes reste en place pour le jour où une source graduée se présenterait.

Ce qu'une source établit, c'est l'organe parfumé. Le Plant Finder du Missouri Botanical Garden publie `Flower: Fragrant` et `Leaf: Fragrant`, qui peuvent être cochés ensemble. Les 315 fiches y ont été confrontées une à une : 237 sont présentes, 68 portent un organe établi, 169 sont présentes sans que la source coche l'attribut, ce que la provenance énonce désormais pour éviter de refaire le travail, et 78 n'ont pas de correspondance.

La fiche affiche l'organe à la ligne Parfum du bloc Au jardin, Fleurs, Feuillage ou Fleurs et feuillage.

### Confrontation des colonnes de culture au Plant Finder

Les 237 pages de taxon rapportées pour le parfum portent aussi Sun, Height et Family. Elles ont servi à confronter trois colonnes que la provenance ne nommait pas.

L'exposition est compatible sur les 236 fiches où elle est renseignée, sans une seule contradiction. Le référentiel est souvent plus prescriptif que la source, cent dix fiches où il dit plein soleil quand elle dit du plein soleil à la mi-ombre, mais jamais hors de sa fourchette. Les deux colonnes ne répondent d'ailleurs pas à la même question, la source dit où la plante pousse, le référentiel dit où la planter.

La hauteur est compatible à trente-cinq pour cent près sur 228 fiches. Les neuf écarts s'expliquent tous par l'objet mesuré et non par une erreur : la source mesure la plante montée à fleur quand le référentiel mesure la culture telle qu'on la récolte, radis, mâche, endive, ou la plante conduite au sol quand le référentiel la conduit sur support, concombre, cornichon, pois mange-tout, melon.

La famille est identique sur 234 fiches. Les trois divergences portent sur Viburnum et Sambucus, que la source place en Adoxaceae quand le référentiel retient Viburnaceae.

Le besoin en eau n'a pas été repris. L'échelle de la source compte cinq degrés contre quatre au vocabulaire, la correspondance demande donc des seuils et une validation, et la colonne alimente le calcul d'arrosage.

Le résultat du contrôle est écrit dans la provenance de chaque fiche concernée.

### Exceptions de contrôle

Une table `controle_exceptions`, clé sur le code du contrôle et la plante, enregistre les divergences arbitrées avec le motif de l'arbitrage, et la vue `controle_coherence` les retire de son résultat. Une divergence acceptée cesse ainsi d'être un signal permanent sans être oubliée.

Première entrée, la Baie de mai sur `floraison_hors_baseflor` : Baseflor décrit la sous-espèce sauvage de montagne, qui fleurit de mai à juillet, quand le référentiel décrit le camérisier cultivé, dont la floraison de mars et avril fait tout l'intérêt.

Trois contrôles ont été ajoutés à la vue, qui gardent les acquis du jour : un organe parfumé sans provenance, une intensité de parfum réapparue, une cotation apicole sans provenance. Le contrôle `parfum_incoherent`, devenu sans objet, a été retiré.

### Conseils remis d'accord avec leur fenêtre

Six conseils citaient en tête un mois hors de la période de leur tâche, seul défaut de gravité haute que les vues signalaient encore. Le contrôle lit la première phrase du conseil, y cherche les noms de mois et de saison, et demande qu'au moins un recoupe la fenêtre.

Trois portaient une erreur de fond, corrigée : l'arroche se ressème jusqu'en juillet et non jusqu'en septembre, le chou chinois se sème à partir de juillet, le fenouil bulbe à partir de juin et non d'avril, la source citée pour sa fenêtre disant précisément qu'un semis plus précoce monte à graine. Le pois voit son semis de grains ronds calé sur la mi-mars, début de sa fenêtre.

Deux tenaient à la place d'une proposition subordonnée : l'hibiscus des marais et le rosier renvoyaient à l'hiver et au printemps dans la phrase de tête, ce qui est juste au fond mais fait sortir le conseil de sa fenêtre. La mention est passée en seconde phrase.

Le recouvrement entre tâches de l'aster d'automne a été levé : la division de la touffe quitte le conseil de taille, où elle doublait celui de multiplication.

Les vues ne signalent plus aucun défaut de gravité haute ni moyenne.

### Essais du ruban de l'année

Une neuvième suite, `calendrier`, onze contrôles, couvre la géométrie du ruban annuel de la fiche et le décalage climatique. C'était le plus gros angle mort : une bande posée sur la mauvaise quinzaine ne lève aucune erreur et ne se voit qu'à l'oeil.

Elle contrôle que le ruban porte une voie par tâche, qu'une fenêtre à cheval sur le premier janvier est dessinée en deux morceaux qui se rejoignent aux bords, que le repère du moment tombe sur la quinzaine du jour, que la règle des mois marque le mois courant, et que le décalage climatique déplace bien la floraison de deux quinzaines vers l'avant en climat montagnard et de deux vers l'arrière en méditerranéen.

Le harnais accepte désormais un climat de jardin en paramètre, ce qui rend le décalage éprouvable sans toucher aux données figées.

### Conseils par période sourcés

Deux cent cinquante-deux conseils portaient la mention `derive_periode` et n'avaient jamais été relus. Leur examen a montré qu'ils ne sont pas deux cent cinquante-deux textes indépendants : chacun est composé d'un préambule pris dans une petite bibliothèque, qui explique pourquoi la période convient, suivi du conseil de fiche de la même tâche, parfois spécialisé à la saison. La bibliothèque compte trente-cinq préambules.

Chacun a été confronté un à un aux sources de premier et de second rang. Quinze sont confirmés, deux sont tirés du calendrier et des colonnes de la fiche, dix-huit portaient une erreur et ont été corrigés.

Les erreurs suivent trois motifs. Le premier est la reprise annoncée comme rapide après une plantation ou une division de printemps, quarante-quatre fiches : toutes les sources disent l'inverse, l'enracinement prend la saison et une plantation de printemps demande plus d'eau qu'une plantation d'automne. Le deuxième est la levée annoncée comme rapide en semis d'été et de fin d'été, neuf fiches : la chaleur du sol freine ou bloque la germination des espèces de saison fraîche, qui sont justement celles semées à ces périodes. Le troisième est l'arrosage réduit au seul jour de la plantation, seize fiches, alors que le Royal Horticultural Society impute les échecs d'installation au manque d'eau des deux premières années.

Deux corrections de fond concernent les bulbes : ils s'enracinent avant que le sol ne gèle et non pendant l'hiver, et la plantation d'automne ne les fait pas fleurir plus tôt, elle leur donne le froid dont ils ont besoin pour former leur fleur. Le conseil de repli qui envoyait planter au printemps en terre lourde était donc faux.

Trois conseils de plantation de printemps en conteneur demandaient de planter à racines nues en repos végétatif, contradiction levée.

Un contrôle a rattrapé une correction proposée à tort : les vingt-cinq centimètres d'éclaircissage du souci ne sont pas un chiffre général inventé, ils viennent de l'écartement de sa propre fiche.

Aucun conseil de plante active n'est plus dans sa rédaction d'origine.

### Semis d'automne du pois

Terre Vivante documente le semis d'octobre et novembre des variétés à grains ronds et le réserve au climat doux. La colonne `climates` de `plant_phases` sait exprimer cette réserve : la fenêtre a été ouverte pour l'océanique et le méditerranéen seulement, les deux climats dont le minimum habituel reste au-dessus de moins sept degrés.

La fenêtre de protection, qui portait sur le climat montagnard en septembre et octobre, ne protégeait rien : le pois y est semé en avril et récolté en juillet. Elle suit désormais le semis d'automne, sur les mêmes deux climats, de décembre à février.

La colonne `nectar_season`, qui disait à quelle saison la ressource est offerte, a été vidée dans le même mouvement. Aucune source ne l'établissait, elle n'était affichée nulle part, et elle contredisait la fiche sur cinquante-six lignes où la ressource elle-même n'est plus affirmée. Le jour où un calendrier apicole la demandera, elle se déduira de la fenêtre de floraison, qui est sourcée, selon une convention à écrire.

## Les contrôles

### Essais de bout en bout

`npm run essais` sert le dépôt sur un port local, ouvre un navigateur et joue neuf suites, cent neuf contrôles, en rendant un code de sortie non nul au premier échec. Une seule suite se joue par `npm run essais -- glossaire`. Le détail est dans `outils/essais/README.md`.

Le client Supabase est remplacé par une doublure qui sert des instantanés figés, les appels météo sont détournés vers un jeu de trente jours passés et sept jours de prévision, et l'horloge du navigateur est décalée sur le 2 août 2026 par un écart constant, de sorte que les contrôles portant sur la tâche du moment ne changent pas de résultat au fil des saisons. Les minuteries de l'interface continuent de tourner, seule la date de départ change.

Ces essais ont vécu dans un répertoire de travail hors dépôt pendant deux jours, ce qui les exposait à disparaître avec la session. Un essai qui n'est pas versionné n'existe pas. Ils sont désormais dans `outils/essais/` avec leurs données figées.

Un essai qui n'affirme rien ne sert à rien non plus : cinq des huit harnais d'origine se contentaient d'imprimer un résultat à relire, ils ont été convertis en affirmations vérifiables. Les erreurs de page relevées par le navigateur comptent comme des échecs.

### Contrôles de contenu

`select * from controle_bilan` donne le nombre de cas par contrôle et par gravité, `controle_detail` liste chaque cas.

Douze contrôles : conseil incohérent avec sa période, fenêtre sans conseil, fenêtre aberrante, plante sans aucune tâche, nomenclature absente, exposition hors vocabulaire, recouvrement entre tâches, espacement non normalisé, hauteur absente, texte trop répété, conseil orphelin, conseil jamais relu.

Le contrôle « fenêtre sans conseil » excluait la floraison depuis l'origine. L'exclusion a été levée le 28 juillet : elle masquait 24 plantes, parmi les plus consultées du catalogue, dont la barre de floraison s'affichait sans rien à lire.

La détection d'incohérence de date ne porte que sur la première phrase du conseil, celle qui contient la consigne. Les mentions de saison qui suivent renvoient à d'autres opérations et produiraient des faux positifs.

Les contrôles agrégés se taisent quand ils n'ont rien à signaler, au lieu de rendre une ligne à zéro cas.

`select * from relecture_bilan` donne l'avancement de la relecture par tâche.

### Contrôles du modèle

`controle_modele` et `controle_modele_bilan` portent six contrôles que la normalisation rend possibles.

Le plus utile croise `frost_min_c` avec le climat déclaré : une plante qui reste en terre et dont la limite de rusticité dépasse le minimum habituel de son climat ne peut pas être déclarée adaptée. Il rend vérifiables les 1580 lignes d'adaptation climatique jusque-là tenues à la main, et a fait apparaître neuf surestimations, toutes arbitrées.

Les cinq autres : multiplication par semis sur une plante mise en place par bulbe ou tubercule, toxicité non statuée, pollinisation absente sur un fruitier, délai de première récolte absent sur une pérenne comestible, profondeur de mise en place absente malgré une tâche de semis.

### Détection d'anomalies

`controle_anomalies` signale une valeur qui s'écarte de plus de deux écarts-types de celles de son groupe. Ce contrôle ne connaît rien au jardinage, il ne compare que des nombres, et c'est ce qui fait son intérêt : il trouve des erreurs sans avoir besoin d'une source.

Le choix du groupe décide de tout. Croiser la famille botanique avec le mode de plantation évite de comparer un tubercule enterré à dix centimètres et une graine semée à un. L'espacement se compare rapporté à la hauteur, sans quoi toute grande plante est signalée. La température de gel se compare à cycle de vie égal.

Première exécution, treize écarts dont une erreur systématique réelle, les vingt-deux bulbes classés en semis. Après affinage des groupes, cinq écarts subsistent, tous légitimes et documentés : l'alysse odorante, couvre-sol basse et large ; le maïs doux et le tournesol, grosses graines parmi des semis de surface ; la marjolaine et la stévia, gélives au milieu de familles rustiques. Un détecteur qui ne signalerait plus rien serait suspect.

### Historisation

Toute modification des tables `plants`, `plant_advice`, `plant_phases`, `plant_climates` et `vocabulaires` est enregistrée dans `historique` par un déclencheur : l'état avant, l'état après, la liste des champs réellement modifiés, l'auteur et l'horodatage. Une mise à jour qui ne change rien n'écrit rien. Les tables personnelles ne sont pas historisées.

Un motif peut être attaché à une série de modifications par la variable de session `app.motif`, à poser en tête de migration.

```sql
set local app.motif = 'correction de la profondeur des bulbes';
```

`historique_lisible` déplie le journal à raison d'une ligne par champ modifié, avec le nom de la plante, l'ancienne et la nouvelle valeur.

Cette table existe parce qu'elle a manqué. Le 28 juillet, la suppression d'une colonne source avant validation de la valeur dérivée a rendu 222 bornes de hauteur irrécupérables. Le journal aurait permis de les restituer.

### Confrontation à une source externe

`controle_coherence` confronte la fiche à baseflor, déjà chargé dans la base, et vérifie la contenance du pic de floraison dans la période enregistrée. Elle ne renvoie plus qu'un cas, documenté : la Baie de mai, dont la floraison de février est correcte en plaine et décalée dans la chorologie montagnarde de baseflor.

Le contrôle qui compare la période de floraison de la base à celle de baseflor porte sur la position, jamais sur la largeur. Baseflor décrit une enveloppe territoriale, la somme des floraisons observées sur toute la France, et non la floraison d'un pied au jardin. Un écart de largeur n'est donc pas un défaut.

### Correction des contrôles après la fusion des fenêtres à cheval, 31 juillet 2026

La fusion des 82 paires de périodes a rendu légitime une fenêtre dont la borne de début dépasse la borne de fin. Deux contrôles la lisaient encore comme un défaut et produisaient 119 faux positifs de gravité haute.

`fenêtre aberrante` testait `start_half > end_half`. La condition est retirée, le contrôle ne teste plus que le dépassement des bornes 1 et 24. Soixante-dix-sept cas éteints.

`conseil incohérent avec sa période` compare la saison citée dans la première phrase du conseil à la fenêtre. Son test de recouvrement supposait un intervalle croissant. Il devient circulaire : sur une fenêtre à cheval, une mention recouvre la fenêtre si elle touche le début ou la fin. Quarante-deux cas ramenés à six.

Enseignement à retenir : une écriture nouvelle dans les données oblige à relire les contrôles qui la lisent. Le défaut ne s'est pas vu au moment de la fusion parce que les contrôles ne sont pas rejoués automatiquement.

### État au 31 juillet 2026

Sept cas subsistent sur les quatre jeux de contrôles, tous instruits.

Six conseils sont signalés incohérents avec leur période. Trois sont des conseils de semis portés par la tâche de plantation, Arroche, Chou chinois et Fenouil bulbe, dont le texte cite le mois de semis alors que la fenêtre est celle de la mise en place. Le Pois cite février dans une fenêtre qui commence en mars pour les variétés à grains ridés. L'Hibiscus des marais et le Rosier citent la période des fortes gelées dans une consigne de protection dont la fenêtre commence plus tôt. Aucun n'est une erreur de contenu, tous relèvent de la même limite du contrôle, qui lit une saison citée sans savoir à quoi elle se rapporte.

Un recouvrement entre tâches subsiste, la division de l'Aster d'automne mentionnée dans son conseil de taille.

En gravité basse subsistent les textes partagés par plus de vingt plantes, justifiés par une identité réelle de besoin, et deux espacements non chiffrables, le cresson alénois semé à la volée et l'ortie.

## Application web

### Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des quatre écrans, barre de navigation, feuille de détail |
| `styles.css` | Typographies IBM Plex, palette de pierre froide, déclarations `@font-face` |
| `app.js` | Lecture du catalogue, authentification, filtres, rendu |
| `config.js` | URL du projet et clé anon |
| `vendor/supabase.js` | Client de la base groupé, construit et versionné dans le dépôt |
| `planches/liste/*.webp` | Masques alpha de 128 pixels, vignette de la liste |
| `planches/fiche/*.webp` | Planches en couleur de 320 pixels, entête de fiche |
| `planches.json` | Manifeste, une lettre de fonds par plante |
| `planches-provenance.json` | Fichier d'origine et page de Commons, hors application |
| `polices/*.woff2` | Neuf graisses IBM Plex réduites au jeu français |
| `sw.js` | Agent de service, cache des actifs et fonctionnement hors ligne |
| `manifest.webmanifest`, icônes | Installation sur écran d'accueil |
| `outils/paquet/construire.mjs` | Reconstruit `vendor/supabase.js` avec esbuild |
| `outils/verification.mjs` | Contrôle avant dépôt, sans dépendance |
| `.githooks/pre-commit` | Enchaîne la correction des empreintes puis le contrôle |
| `.github/workflows/verification.yml` | Rejoue le contrôle en intégration continue |

L'application est pilotée par la base. La couleur d'une tâche vient en revanche de la table `TEINTE` de `app.js`, palette validée en CIEDE2000, exposée par l'assistant `teinteK(k)` et employée partout : synthèse, listes, filtres, frise, fiche. `phases.color` ne sert plus que de repli. Ajouter une tâche demande de l'insérer dans `phases`, de l'ajouter aux constantes `ORDRE` et `ORDRE_MAINTENANT`, de lui donner un pictogramme dans `PICTOS`, une teinte dans `TEINTE` et un verbe dans `VERBE`.

L'empreinte de version des balises `app.js?v=` et `styles.css?v=` de `index.html` porte les dix premiers caractères de l'empreinte SHA-256 du fichier. Elle n'est plus tenue à la main : `node outils/verification.mjs --corriger` la recalcule, et le crochet `pre-commit` l'applique à chaque dépôt. La même règle vaut pour `vendor/supabase.js?v=`, présent à la fois dans `index.html` et dans l'import de `app.js`, et pour la constante `VERSION` de `sw.js`, calculée sur les empreintes de tous les actifs qu'il met en cache.

### Démarrage

Relevé du 3 août 2026, avant traitement : 643 kilo-octets, trente-cinq requêtes, cinq domaines et dix allers-retours dépendants avant le premier affichage. Le calcul n'était pas en cause, le premier rendu prenant 292 millisecondes sans réseau et la relecture du cache local 5. Quatre changements ramènent le chemin critique à 229 kilo-octets, deux domaines et quatre allers-retours.

**Catalogue en deux requêtes parallèles.** `COL_LEGERES` porte ce que le premier écran affiche, 26 kilo-octets et 370 millisecondes. `COL_LONGUES` porte `attributes`, `guide`, `guide_periode` et `advice`, 162 kilo-octets, qui ne servent qu'au libellé de l'action en cours et à la fiche. Les deux partent en même temps, le premier rendu n'attend que la première, et le catalogue complet arrive plus tôt qu'avec l'ancienne requête unique de 266 kilo-octets et 1 460 millisecondes. Le cache local n'est écrit qu'une fois les deux arrivées. Les objets de `plantes` portent `attr`, `guide`, `guide_periode` et `conseil` vides jusqu'à l'arrivée de la seconde, jamais absents.

**Caractères servis par le site.** Les neuf fichiers étaient chargés depuis Google Fonts, deux domaines et 219 kilo-octets. Ils sont maintenant dans `polices/`, réduits au jeu français, 167 kilo-octets, déclarés en tête de `styles.css` avec `font-display: swap`, et deux graisses sont préchargées depuis `index.html`.

**Client de la base groupé.** Il était chargé depuis esm.sh en dix-sept modules répartis sur quatre niveaux d'imports, avant lesquels aucune requête vers la base ne pouvait partir. `vendor/supabase.js` est construit par `node outils/paquet/construire.mjs`, 55 kilo-octets compressés en une requête, et préchargé par `modulepreload`. Le fichier construit est versionné dans le dépôt parce que GitHub Pages ne construit rien.

**Agent de service.** `sw.js` met en cache le document, le script, la feuille de style, le paquet, les caractères et les icônes. Le document est demandé au réseau d'abord, les actifs versionnés sont servis du cache d'abord, les appels à la base et au service météorologique ne sont pas interceptés. L'application fonctionne hors ligne. C'est aussi le préalable des planches, qui seraient sinon redemandées à chaque session.

**Rendu ciblé à la coche.** Le filtre de l'écran des plantes porte sur le type, la catégorie, le climat et la recherche, jamais sur la sélection : cocher une plante n'ajoute ni ne retire de rangée. `majRangee` remplace la seule rangée concernée. Quatorze millisecondes contre quarante-deux, soixante contre cent vingt avec le processeur bridé au quart.

Les essais de bout en bout s'exécutent avec `serviceWorkers: "block"`, faute de quoi l'agent servirait les réponses de la doublure d'une page à l'autre.

### Planches d'herbier

190 fiches sur 315 portent une planche, 145 au niveau de l'espèce et 45 au niveau du genre. Quatre fonds du domaine public, dans cet ordre : Vilmorin pour le potager et les aromatiques, parce que les flores sauvages montrent l'espèce botanique et non la forme cultivée ; Masclef pour tout le reste ; Köhler puis Thomé en recours à l'espèce ; le genre en dernier, chez Masclef puis Thomé.

Deux règles ont écarté des planches et c'est le résultat recherché. Une planche partagée par plusieurs fiches est retirée des fiches servies au genre, sauf lorsqu'une fiche porte le nom de l'autre : cinq fiches montraient la même groseille à maquereau, six le même colza. Une fiche appariée à l'espèce garde la sienne, le framboisier étant bien *Rubus idaeus*. Et l'appariement Vilmorin exige que la planche porte le nom entier de la fiche en tête de son titre, faute de quoi le pois de senteur recevait la planche du pois potager.

`planches.json` porte une lettre de fonds par plante, `v` Vilmorin, `m` Masclef, `k` Köhler, `t` Thomé, suivie d'un `g` quand la planche est celle du genre. Trois kilo-octets, lus au démarrage en parallèle du catalogue et précachés par l'agent de service.

La vignette de liste est un masque alpha : le fichier ne porte que la forme, la couleur vient de la feuille de style. Son adresse n'est posée qu'à l'approche de la rangée, par un observateur d'intersection, une image de fond n'ayant pas de chargement paresseux. Sans cela, ouvrir l'écran des plantes demanderait les 190 fichiers d'un coup.

La planche de fiche remplace le motif décoratif par typologie quand elle existe. Le blanc de son papier disparaît par `mix-blend-mode: multiply`, un fondu circulaire l'éteint de tous les côtés, l'opacité est ramenée à quarante-deux pour cent. Le motif reste pour les 125 fiches sans planche.

La provenance est énoncée dans le bloc Identité, avec la mention « planche du genre » quand le dessin montre une plante voisine et non celle de la fiche.

La fabrique est hors dépôt, dans l'atelier : `vignette.py`, `texte.py` et `affecter.py`. Le téléchargement depuis Commons demande trois secondes entre deux fichiers, en deçà le service renvoie des erreurs 429 sur la plus grande partie du lot.

### Contrôle avant dépôt

`node outils/verification.mjs` vérifie neuf points, sans aucune dépendance externe.

**Syntaxe du module.** Une erreur de syntaxe n'apparaît qu'au chargement de la page, et le module s'interrompt sans un mot dans l'interface.

**Identifiants HTML.** Tout identifiant passé à `$()`, à `sur()` ou à `querySelector` doit exister dans `index.html` ou dans un gabarit du script.

**Déclaration avant usage.** Aucune déclaration `const` ou `let` de niveau module ne doit apparaître après son premier usage dans le fichier.

**Cohérence des tâches.** `ORDRE`, `ORDRE_MAINTENANT` et `PICTOS` doivent porter les mêmes clés.

**Empreintes de version.** Les balises de `index.html` et l'import de `vendor/supabase.js` dans `app.js` doivent correspondre au contenu des fichiers.

**Domaines tiers.** Aucun fichier servi par le site ne doit appeler un domaine autre que la base, le service météorologique et le service d'adresses. C'est ce qui empêche de replacer les caractères ou le client de la base sur un domaine extérieur.

**Planches.** Chaque entrée de `planches.json` doit avoir ses deux fichiers, chaque fichier doit avoir son entrée, et le code de fonds doit être connu. Une entrée sans fichier laisse une vignette vide dans la liste, un fichier sans entrée est du poids mort dans le dépôt.

**Agent de service.** Chaque actif déclaré dans `sw.js` doit exister, et la constante `VERSION` doit correspondre à leurs empreintes. Sans ce contrôle, un navigateur garderait l'ancienne copie après une mise en ligne. `index.html` est écarté du calcul, il ne change que pour porter les empreintes des autres actifs et le document est demandé au réseau d'abord.

L'installation se fait une fois par clone : `git config core.hooksPath .githooks`.

### Intégration continue

`.github/workflows/verification.yml` rejoue le contrôle à chaque poussée sur `main` et sur chaque demande de fusion, y compris depuis un clone où le crochet n'est pas installé. Posé le 28 juillet, vérifié dans les deux sens : vert sur un dépôt propre, rouge sur une demande de fusion portant volontairement la régression historique, l'identifiant `bilanMoment` renommé dans `index.html`. L'étape en échec est bien `Run node outils/verification.mjs`.

Le fichier a été créé depuis l'interface GitHub, onglet Actions. GitHub refuse qu'un jeton sans la permission `Workflows` crée ou modifie un fichier sous `.github/workflows/`.

Le contrôle échoue si les empreintes de version ne correspondent pas au contenu. C'est voulu : sur la machine de travail, le crochet les corrige avant le dépôt. Une poussée directe sans crochet fait donc rougir l'intégration continue, ce qui est le comportement recherché.

### Vocabulaire du métier

Les termes horticoles précis sont conservés, ils sont ceux de la littérature. Ils sont glosés à leur première apparition quand ils ne sont pas d'usage courant : « les cannes, les tiges du framboisier ». Le mot canne est bien le terme du métier, employé notamment par Gerbeaud qui le glose de la même façon.

Le reste du vocabulaire passe par un glossaire plutôt que par une glose répétée dans chaque conseil. La table `glossaire` porte quarante-quatre entrées, chacune avec ses formes fléchies dans `variantes` et une définition d'une à deux phrases. Le vocabulaire a été relevé dans le corpus des deux mille conseils, par comptage des candidats, et non deviné : compost mûr apparaît cent quatre-vingt-neuf fois, collet cent soixante-deux, rabattre cent quatre.

Le repérage se fait à l'affichage, dans la fiche de plante seulement, sur le conseil de la tâche en cours et sur les blocs d'attributs. Une seule expression régulière porte les cent trente-cinq formes, les plus longues en tête pour que porte-greffe l'emporte sur greffe. Le mot est borné par des caractères qui ne sont ni lettre ni trait d'union, la limite de mot des expressions régulières ignorant les lettres accentuées : sans cela œilleton serait marqué comme œil.

Les rangées de l'écran du moment ne portent pas le repérage. Ce sont des boutons, un bouton ne peut pas en contenir un autre, et la rangée entière sert déjà de cible pour ouvrir la fiche. Le lecteur y accède en une touche.

La définition s'ouvre sous le mot, dans le repère du corps de la feuille pour qu'elle suive le défilement, bornée à la largeur de la feuille et basculée au-dessus du mot quand le bas est trop proche. Elle porte le terme canonique, non la forme rencontrée : toucher « Marcotter » affiche l'entrée marcottage.

### Écarts entre la base et l'affichage

Un audit du 2 août a cherché les données présentes en base mais fausses, tronquées ou invisibles à l'écran, dans la famille du défaut de la glycine. Cinq familles ont été passées par requête, puis les cas retenus confirmés en rendant de vraies lignes de production dans la fiche et en lisant le texte effectivement affiché. Quatre défauts en sont sortis, tous corrigés.

**Le conseil général de la plante n'était affiché nulle part.** La colonne `plants.advice` est renseignée sur les 315 plantes, quatre-vingt-un caractères en moyenne. Elle était chargée dans `p.conseil` et utilisée par aucun rendu. Elle paraît désormais en tête de fiche, sous les jauges et sous l'avertissement de toxicité, visible depuis les deux onglets puisqu'elle vaut toute l'année.

**Cent douze conseils de multiplication étaient inatteignables.** Ces plantes portent un conseil rattaché à la tâche multiplication sans avoir de période de multiplication, et l'écran ne parcourt que les tâches ayant une période. Le contenu porte sur la production de semences. Le conseil paraît désormais dans le bloc Culture de la fiche, sous la valeur de la ligne Multiplication, pour toutes les plantes et non seulement pour les cent douze : la règle est plus simple et le texte reste consultable hors de sa fenêtre.

**La couleur de fleur affichée n'était pas la dominante.** Cent vingt-trois plantes portent plusieurs couleurs. Le tableau `flower_colors` était rangé dans l'ordre de la palette, la dominance n'étant portée que par `flower_color_note`, jamais lue. L'application n'affichant que la première couleur, une glycine « Mauve, blanc » sortait en fleurs blanches. Le tableau a été réordonné sur la note par la migration `couleurs_de_fleur_par_dominance`, soixante-quinze lignes touchées dont soixante-dix changent de couleur de tête, et la légende nomme maintenant les deux premières couleurs avec leurs deux pastilles.

**Deux entrées archivées gardaient un texte unique pour deux fenêtres.** La mélisse et le souci, remplacés au catalogue par la mélisse citronnelle et le souci officinal, avaient encore deux périodes réelles servies par un texte mentionnant les deux saisons. Quatre conseils propres ont été écrits. Le catalogue visible était déjà correct sur ce point.

**Trois lignes du bloc « Au jardin » ne paraissaient jamais.** Cet audit avait comparé les colonnes de la base, pas les clés du bloc d'attributs que la vue fabrique. Or la vue construisait `feuillage`, `usage` et `couleur` depuis l'ancienne colonne JSON `plants.attributes`, qui ne porte plus que `rusticite` et `taille` depuis la campagne de structuration. Les trois lignes étaient donc vides sur les 315 plantes.

Le feuillage est lu dans `plants.foliage` et traduit par la table des vocabulaires, comme les autres attributs : 117 plantes retrouvent leur ligne, soit tout le périmètre où la notion s'applique, ligneux, lianes et graminées. L'usage est lu dans `plants.uses`, tableau de clés validé contre le vocabulaire des vingt-quatre usages, avec `uses_note` pour la formulation lisible. La couleur n'a pas de ligne : la légende du ruban la nomme déjà avec sa fenêtre de floraison et ses pastilles, une seconde mention serait une répétition.

**La rusticité paraît sans redoubler la jauge de gel.** Le libellé de `attributes.rusticite` se compose d'une classe, cinq valeurs, suivie parfois d'une nuance. La jauge donnant déjà le seuil en degrés sur 295 plantes, la ligne du bloc Identité ne garde que la nuance, « Craint l'humidité », « À rentrer », « Jeune plant à protéger », et ne reprend la classe entière que pour les vingt plantes dont le seuil n'est pas renseigné.

**Sourçage des usages, campagne du 2 août.** La colonne `uses` passe de 91 à 241 fiches, périmètre complet sur les ornementales, les aromatiques et les fruitiers. Un légume n'en reçoit que si son emploi dépasse la consommation, jardin littoral pour la ficoïde, bord de bassin pour le cresson, clôture décorative pour le haricot d'Espagne : les 74 légumes restants sont hors périmètre et non en attente.

Une règle de dérivation depuis la colonne des associations a été écrite et mesurée avant tout appel externe. Elle échoue, 68 pour cent de précision sur les 91 fiches déjà sourcées, et elle est écartée : `uses` est une sélection éditoriale des emplois qui distinguent la plante, non un relevé des mentions. Les 150 fiches ont donc été consultées une par une, 125 sur le champ Garden Uses du Plant Finder du Missouri, 17 au Royal Horticultural Society, 8 sur Plants For A Future. Détail dans la note de projet `campagne-usages-au-jardin`.

**Les associations ne redisent plus l'usage.** La colonne `companions` a servi, sur les ornementales, à noter l'emplacement plutôt que le compagnonnage : la lavande y porte « Bordure, rocaille, pied de rosier » quand son usage dit déjà bordure et rocaille. À l'affichage, un segment déjà porté par la ligne Usage est retiré de la ligne Associations. Les deux colonnes restent intactes en base ; la campagne de sourçage des usages remettra chaque information dans sa colonne.

Sont passées sans défaut : plus aucun conseil général en double, aucun conseil de période orphelin, aucune clé de vocabulaire introuvable, aucune valeur d'énumération inconnue de l'application pour les tâches, typologies, catégories, niveaux climatiques et couleurs, aucune perte entre `spacing` et `spacing_cm` ni entre `depth` et `depth_cm`.

Une fausse alerte mérite d'être notée : trois cent cinquante-deux périodes de protection paraissaient dépourvues de conseil propre alors qu'il s'agit de déclinaisons par climat d'une même fenêtre, `plant_phases.climates` portant un climat par ligne. Tout comptage de périodes doit neutraliser cette déclinaison, faute de quoi il compte cinq fois la même fenêtre.

### Registre visuel

L'identité repose sur trois familles IBM Plex, Sans, Sans Condensed et Mono, et sur une palette de pierre froide. Trois principes ont été posés lors de la reprise graphique.

**La chasse fixe est réservée aux dates.** Ligne de date, règle des mois, code de reprise. Partout ailleurs elle donnait un air de terminal.

**Chaque tâche porte sa couleur.** Carré de 27 pixels à angles arrondis, en pleine couleur, pictogramme blanc au trait à l'intérieur. Le carré identifie la tâche dans la synthèse, dans la barre de niveau, dans les en-têtes de section et dans le pas vers la tâche suivante. Les rangées d'action ne portent plus de filet coloré. Dans le regroupement par espace, la couleur du rail vient de `espaces.color`, avec le vert de l'application en repli.

**Le fond suit la saison.** Cinq paliers calculés à partir de la quinzaine en cours, de saturation très faible, appliqués à la variable `--papier`.

Le bandeau haut est construit autour de la pousse en filigrane, à 236 pixels, débordant de 72 pixels à gauche et coupée par le bord de l'écran, à 8,5 pour cent d'opacité. Il porte un dégradé, une lumière rasante radiale depuis le coin haut gauche, et un filet en pied. Le titre affiche le nom du jardin actif.

Les cartes entrent en fondu montant décalé de 45 millisecondes, plafonné à huit, désactivé si le système demande une réduction des animations.

### Écrans

Deux écrans principaux, accessibles par une barre flottante translucide en bas d'écran.

**En ce moment** se lit sur deux niveaux depuis le 1er août 2026.

Le premier niveau est la vue d'ensemble : en-tête météo, ligne de date et règle des mois, alertes du jour, carte de synthèse. La carte porte une phrase de tête qui ne nomme que ce dont la fenêtre se ferme, puis une ligne par verbe avec son carré de couleur, quatre plantes nommées au plus, le compte de la tâche et un chevron. Le pied de la carte donne les plantes en fleur et le besoin en eau moyen. Sous la carte, une ligne discrète porte le décompte total, l'accès à la liste complète et l'accès aux filtres. L'écran mesure environ 1 040 pixels de haut, contre 6 920 pour la liste déroulante qu'il remplace.

Le second niveau est la liste. Un clic sur une ligne de verbe, ou sur le verbe de la phrase de tête, ouvre cette tâche seule : barre de retour collante portant le carré, le verbe et le compte, rangées à plat séparées par un filet, conseil lu en entier. Les plantes dont la fenêtre se ferme passent en tête sur fond rosé. En bas de liste, un retour à la vue d'ensemble et un pas vers la tâche suivante, qui permet de parcourir les six ou sept tâches sans jamais remonter. Le bouton Tout voir ouvre la liste complète : un rail de sections collant en haut, dont la puce suit la section lue par un `IntersectionObserver`, des en-têtes de section restés dans le flux, et le conseil tronqué à deux lignes.

L'état de lecture voyage dans `history.state` : le geste de retour du téléphone ramène à la vue d'ensemble, et la feuille de plante pose son entrée par-dessus le niveau courant, qu'elle restitue en se fermant. Changer d'écran principal rend toujours la vue d'ensemble.

Le regroupement par tâche ou par espace se choisit dans le panneau de filtres et ne s'applique qu'à la liste complète. L'œil des actions masquées se pose au pied de la liste ouverte, avec le compte de ce que l'on regarde. Les actions restent classées par coût de l'oubli, du plus irréversible au plus tolérant, et triées par échéance à l'intérieur de chaque tâche. Un glissement vers la gauche masque pour la quinzaine ou pour la période, vers la droite définitivement.

**Calendrier** présente la frise annuelle. Les périodes sont empilées par remplissage, une voie accueillant plusieurs tâches tant qu'elles ne se chevauchent pas. Filtres sur l'espace, la tâche, le type et la catégorie. Mon jardin seulement est actif par défaut.

Deux écrans de réglage, derrière le bouton de l'en-tête.

**Jardin et espaces** contient le jardin actif, sa création et son renommage, le climat, les espaces avec leurs plantes, le compte et le code de reprise.

**Mes plantes** liste le catalogue groupé par type puis par catégorie, avec recherche sur le nom commun, le nom latin et la famille, et une jauge d'adaptation au climat à quatre crans. Le bouton Adaptées à mon climat restreint la liste aux plantes de niveau adaptée sous le climat du jardin actif. Il n'apparaît que si un jardin déclare son climat.

La feuille de détail affiche hauteur, espacement, profondeur, arrosage, sol, fertilisation, couleur, feuillage, résistance au gel, organe parfumé, caractère mellifère, première récolte, pollinisation, multiplication, usage et voisinage.

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

**Supprimer une source avant d'avoir validé ce qu'on en a tiré.** Le premier analyseur de hauteur ne captait que le nombre porteur de l'unité : « 5 à 10 m » donnait 1000 et 1000. Le défaut n'est apparu qu'après la suppression du texte d'origine, devenu irrécupérable. Valider la valeur dérivée, puis seulement supprimer la source. L'historisation limite désormais la portée de ce genre d'erreur.

**Le survol sur écran tactile.** Un état de survol qui remplace une couleur de fond persiste après l'appui et fait disparaître cette couleur. Utiliser une ombre intérieure qui se superpose, et réserver le survol aux appareils qui en disposent par `@media (hover:hover)`.

**Les marges sur un conteneur à positionnement absolu.** Une marge horizontale posée sur la rangée d'un tiroir de glissement décale la glissière et découvre le tiroir en permanence. La marge doit aller sur l'élément qui glisse.

**Les règles de zone sûre.** `padding-left: env(safe-area-inset-left)` écrase la marge définie plus haut et vaut zéro en portrait. Utiliser `calc(16px + env(...))`.

**Comparer les colonnes sans comparer les clés construites.** Une vue qui fabrique un objet JSON à partir de colonnes disparues laisse des clés vides que rien ne signale : ni erreur, ni valeur nulle visible, la clé est simplement absente et la ligne ne s'affiche pas. Le premier audit avait vérifié les colonnes de `plants` une par une et manqué les trois lignes du bloc « Au jardin ». Le contrôle juste consiste à comparer les clés que l'application lit dans `attributes` à celles que la vue produit réellement, requête `jsonb_object_keys` à l'appui.

**Vérifier la base sans vérifier l'écran.** Une donnée juste en base peut n'arriver nulle part, ou arriver fausse. Trois cas l'ont montré : le conseil général chargé et jamais rendu, le conseil de multiplication rattaché à une tâche sans période donc jamais parcourue, la couleur de fleur rangée dans l'ordre de la palette alors que l'écran n'en montre qu'une. Un contrôle de contenu doit lire le texte effectivement affiché, pas seulement la ligne qui l'alimente. Le fichier d'essai `ecarts.js` sert des lignes de production à la doublure et compare l'affiché à l'attendu.

**GitHub Pages.** La reconstruction prend parfois plusieurs minutes, et la file peut se bloquer : une poussée est restée sans reconstruction pendant plus de quinze minutes, débloquée par un commit vide. Vérifier que le statut de la dernière publication vaut `built` sur le bon commit avant d'annoncer un déploiement.

## Points de vigilance

Le dépôt GitHub contient l'interface et ce document. Le schéma de base et les données du référentiel n'y figurent pas, ils vivent dans Supabase.

Les scripts Python d'origine, qui avaient servi à générer le référentiel, sont désynchronisés de la base depuis la campagne de vérification. Toute reprise de cette voie exigerait de les réaligner.

L'herbe de la pampa, Cortaderia selloana, est interdite à la culture en France métropolitaine par l'arrêté ministériel du 2 mars 2023, qui en interdit aussi la détention, le transport, la vente et l'achat. La fiche est conservée volontairement, son conseil de plantation portant l'interdiction en toutes lettres. Le choix est de renseigner plutôt que de retirer.

La colonne `verification` de `plant_advice` porte quatre états, du plus faible au plus fort.

| État | Sens |
|---|---|
| `aucune` | Le texte n'a jamais été relu, il est dans sa rédaction générée d'origine |
| `reecrit` | Le texte a été refait, sans vérification de source |
| `fiche` | La campagne du 26 juillet a couvert ce champ au niveau de la fiche |
| `conseil` | Le texte a été relu pour lui-même, `source` et `verified_at` lui sont propres |

Un jeton d'accès personnel GitHub reste actif tant qu'il n'est pas révoqué, depuis `https://github.com/settings/tokens?type=beta`.

La fonction de bord accepte une variable d'environnement `SEL_TENTATIVES` pour saler les empreintes d'adresse. En son absence, la clé de service sert de sel. Poser cette variable rend le sel indépendant d'une éventuelle rotation de la clé.

Le SMTP personnalisé configuré sur Brevo n'est pas fonctionnel : l'adresse d'expéditeur est une adresse iCloud, domaine dont la politique DMARC interdit l'émission par un tiers, ce qui provoque un rejet systématique. Revenir au SMTP par défaut de Supabase, ou acheter un domaine et l'authentifier.

## Chantiers ouverts

### Fiabilisation du référentiel

Couverture au 2 août 2026, dans le périmètre où le champ s'applique. Un vide n'est pas une valeur douteuse. Depuis le 2 août, aucune fiche ne porte plus de mention d'estimation, pour aucun champ : une valeur qu'aucune source n'établit est laissée vide.

| Champ | Périmètre | Renseigné | Taux |
|---|---|---|---|
| Toxicité, exposition, sol, eau, fertilité, multiplication, plantation, port, cycle | 315 | 315 | 100 % |
| Seuil de gel | 315 | 295 | 94 % |
| Hivernage, hors annuelles | 244 | 209 | 86 % |
| Couleur de fleur | 258 | 257 | 99,6 % |
| Première récolte, pérennes comestibles | 86 | 72 | 84 % |
| Organe du parfum, espèces dont le Plant Finder coche l'attribut | 68 | 68 | 100 % |
| Profondeur de mise en place | 315 | 177 | 56 % |
| Vecteur de pollinisation | 315 | 168 | 53 % |
| Feuillage, hors annuelles | 244 | 117 | 48 % |
| Nectar sourcé, espèces cotées par la liste Val'hor | 91 | 91 | 100 % |
| Pollen sourcé, espèces cotées par la liste Val'hor | 90 | 90 | 100 % |
| Usages | 315 | 91 | 29 % |
| Pollinisation, fiches à récolte | 156 | 42 | 27 % |
| Pic de floraison | 215 | 12 | 6 % |

Actions ouvertes dont la source est identifiée : le feuillage sur 127 fiches hors annuelles, la profondeur sur 138, la pollinisation sur 115 fiches à récolte, la première récolte sur 15 pérennes, l'hivernage sur 35. Actions sans source identifiée à ce jour : le pic de floraison sur 203 fiches, faute d'observations suffisantes hors des espèces suivies par les réseaux phénologiques, et le vecteur de pollinisation sur 147.

Le reste par ordre d'intérêt décroissant.

**Les associations sont relues.** Passage du 2 août sur les 312 fiches, avec une règle décidée par Jérôme : uniquement des éléments vérifiés. Sur les 290 associations que le référentiel prêtait à ses plantes, douze sont conservées et vingt-quatre antagonismes établis. Les autres fiches n'affichent plus rien à cette ligne. Cinq relecteurs distincts sur consigne fermée, une association n'étant retenue que si une source de recherche, d'autorité ou d'éditeur à comité établit un mécanisme énonçable. Trois conservations ont été retirées à l'arbitrage sur contradiction entre relecteurs, dont carotte et oignon : l'effet mesuré en 1984 s'obtient avec n'importe quel couvert non hôte, il n'est pas propre à l'oignon. La colonne ne portait par ailleurs qu'un emplacement sur 199 fiches, information désormais tenue par les usages sourcés et retirée d'ici. La ligne de la fiche s'appelle Voisinage et non Associations, les deux tiers de ce qu'elle porte étant des mises à distance. Détail dans la note de projet `relecture-des-associations`.

Le voisinage paraît à deux endroits, pour deux usages. Il suit le geste de plantation et le semis en pleine terre dans l'onglet du moment, parce que c'est là qu'on choisit la place, bêche à la main. Il figure aussi en ligne du bloc « Au jardin » de l'onglet annuel, la mise à distance des brassicacées entre elles se décidant à l'échelle de la rotation, des mois avant le semis. Les deux onglets ne se voient jamais ensemble, il n'y a donc pas de répétition à l'écran.

**La traçabilité est nominale.** Les conseils portent une source, mais seulement trente sources distinctes, sous forme de listes du type « Gerbeaud, Terre Vivante, Au Jardin, SNHF ». C'est une liste de ce qui a été consulté, pas une attestation vérifiable. Pour les affirmations chiffrées, une URL par affirmation et sa date de consultation changeraient la nature de la garantie. Ne jamais stocker le texte de la source, seulement le fait et le lien.

**Aucun niveau de confiance par champ.** Rien ne distingue une valeur issue d'une référence d'une valeur déduite. Concrètement : 85 températures de gel viennent de la bande de rusticité et non d'une référence propre, 222 bornes basses de hauteur ont été reconstruites après l'incident décrit plus haut, 213 statuts de toxicité `aucune` sont déduits de l'absence de mention lors de la campagne du 26 juillet.

**Aucun retour du terrain.** L'application sait quand une tâche est cochée. Un écart systématique entre la date réelle et la fenêtre annoncée est le seul signal qui ne vienne pas d'une source écrite.

**Les essais de bout en bout ne couvrent pas tout.** Ils existent depuis le 2 août, `npm run essais`, cent neuf contrôles sur neuf suites, décrits dans `outils/essais/README.md`. Restent hors couverture : le calendrier annuel et ses segments, le décalage climatique et les dates qu'il produit, l'écran des espaces, la connexion et la reprise par code.

**Aucun audit tournant.** Rien ne se dégrade seul, mais rien ne se re-vérifie non plus. Dix fiches par mois reconfrontées aux sources maintiennent la qualité sans campagne.

**Le point de faiblesse de fond.** Tout le référentiel a été relu en une journée, par un seul relecteur, avec une seule méthode. Les contrôles automatiques attrapent les incohérences internes, pas les erreurs partagées : une erreur portant sur une famille entière ne serait signalée par rien. Un second regard sur un échantillon vaut plus que le dixième contrôle automatique.

### Sur la qualité des sources

La majorité du contenu jardinage francophone en ligne se recopie. Cinq sites d'accord ne font pas cinq confirmations. La hiérarchie retenue : autorités d'abord, ANSES et centres antipoison pour la toxicité, SEMAE pour les semences, GBIF, POWO et Tela Botanica pour la nomenclature, INRAE et chambres d'agriculture pour la conduite ; éditeurs à comité ensuite, Terre Vivante et SNHF ; sites généralistes en recoupement seulement ; marchands et blogs comme indices, jamais comme preuves.

Sur les référentiels ouverts : la taxonomie est bien couverte par TAXREF, la BDTFX de Tela Botanica, GBIF et POWO. Les données de culture ne le sont pas. OpenFarm, qui s'en approchait, a fermé ses serveurs en avril 2025. EcoCrop, base de la FAO en accès ouvert, couvre 133 des 288 espèces du référentiel, mais sa température létale répond à une autre question que `frost_min_c` : elle vaut en végétation, pas pour une plante dormante. Ses fourchettes de pH et ses optimums thermiques sont en revanche utilisables en recoupement.

### Limites du modèle connues

L'hysope et la valériane rouge portent une note qui dit « pauvre et calcaire », alors que la clé `soil` n'en porte qu'une. Le calcaire a été retenu, c'est l'information qui décide d'une plantation.

`depth_cm` ne porte qu'une valeur alors que la profondeur peut dépendre du mode de semis. Le cas de l'artichaut a été tranché en retenant la pratique portée par la fiche, le semis en godet.

### Fonctionnalités

**Le journal des actions réalisées.** Le masquage sert aujourd'hui de substitut à « c'est fait », ce qui est un détournement. Une table d'historique côté jardin, distincte de `historique` qui ne couvre que le référentiel, permettrait de dater la dernière taille, d'exploiter enfin les familles botaniques pour la rotation des cultures, et de se passer de mémoire.

**Les rappels.** L'application ne peut pas joindre son utilisateur, il faut penser à l'ouvrir.

## Historique des décisions principales

Le projet est parti d'un calendrier statique au format HTML, sans base de données.

Une phase de sélection a introduit le jardin personnel, d'abord en stockage local, puis synchronisé par compte une fois Supabase en place. La séparation entre référentiel et jardins a été posée dès la conception du schéma.

Le référentiel a été étendu en trois temps jusqu'à 317 plantes, puis intégralement vérifié, doté d'une nomenclature latine, de niveaux d'adaptation climatique et de quatre tâches supplémentaires. Les séparations et la fusion du 28 juillet l'ont porté à 320 fiches, dont 315 actives.

L'interface a été reprise plusieurs fois : filtrage par catégorie fine, tri alphabétique, identité visuelle, filtrage par mois, espaces, multi-jardins, feuille de détail modale, barre de navigation flottante, masquage par glissement, jauge d'adaptation climatique, filtre par adaptation au climat.

Le 28 juillet 2026, une session a posé le contrôle avant dépôt, le versionnage par empreinte et l'intégration continue, plafonné les tentatives de reprise, ouvert la traçabilité au niveau du conseil, relu la totalité des conseils du référentiel, séparé les trois fiches à deux espèces et fusionné les deux fiches de groseille, normalisé seize notions en vocabulaire contrôlé, ajouté le filtre par adaptation au climat, et mis en place l'historisation et la détection d'anomalies.

Du 28 au 31 juillet 2026, la base a reçu la confrontation de la nomenclature à GBIF, POWO et Tela Botanica, le calcul d'arrosage par la méthode FAO 56 avec ses trois tables et sa vue de restitution, le pic de floraison sourcé sur douze fiches et démontré non dérivable, le rattachement d'un conseil à une période précise, le sourçage apicole du nectar et du pollen après l'échec documenté de deux jeux quantitatifs, la fusion des quatre-vingt-deux paires de fenêtres à cheval sur le 1er janvier, la confrontation à baseflor par la vue `controle_coherence`, et la correction des deux contrôles que la fusion des fenêtres avait rendus faux. Le 2 août, elle a reçu le glossaire horticole, la relecture des associations sur pièces, et la sortie de l'estimation pour le nectar, le pollen et le parfum, après quoi aucune fiche ne porte plus de valeur qu'une source n'établisse.

Le design de la fiche de plante a été repris en parallèle, hors dépôt, sous forme de maquette : rangée de jauges normalisées, calendrier annuel en ruban ou en roue avec une teinte par action, courbe de besoin en eau, taille à maturité rapportée à une silhouette humaine, motif par typologie. L'intégration dans l'application est le chantier en cours au 31 juillet.
