> Note du 10 août 2026. Les taux de couverture de cette procédure sont ceux du
> 7 août. Trois fiches ont été ajoutées inactives depuis, phacélie, aubépine et
> céleri-branche, et la couverture des planches est passée de 190 à 309 fiches.
> Voir `claude/trois-plantes-inactives.md` et `claude/planches-fabrication.md`.

# Procédure d'ajout d'une plante au référentiel

Cette procédure décrit l'ordre des opérations, la source à mobiliser pour chaque champ, les croisements obligatoires et les contrôles à passer avant qu'une fiche ne soit rendue active. Elle s'appuie sur les mécanismes installés : vocabulaires contrôlés, journal avec motif, mention de provenance, vues de contrôle.

Révision du 7 août 2026, sixième. Les trois précédentes, toutes du 2 août, calaient la procédure sur l'inventaire des colonnes puis reprenaient le sourçage du nectar, du pollen et du parfum. La quatrième, du 7 août au matin, ajoutait deux étapes qui manquaient, l'adaptation par climat et les images, corrigeait le taux d'usages au jardin et complétait les contrôles d'affichage. La cinquième installait les contrôles automatiques sur les photographies et enregistrait l'audit du catalogue. Celle-ci ajoute l'organe racine, restreint la tuile fruit et verse le lot Wikimedia. Les taux de couverture donnés le sont sur les 315 plantes actives au 7 août 2026.

## Principe

Une fiche n'est jamais complétée par déduction personnelle. Chaque valeur est dans l'un des trois états suivants, et l'état est lisible dans `plants.source`.

Sourcée : la valeur vient d'une source nommée, avec sa date de consultation inscrite. C'est l'état visé.

Déduite : la valeur est calculée à partir d'autres colonnes de la même fiche par une règle écrite. La mention porte la règle, par exemple « hivernage déduit de la rusticité et du port ». Une déduction n'est acceptable que si la règle a été validée sur des fiches déjà sourcées.

Estimée : aucune source ne couvre le champ. La mention `estimation horticole non vérifiée` nomme le champ. Cet état ne subsiste sur aucune fiche depuis le 2 août 2026, et une valeur qu'aucune source n'établit est désormais laissée vide plutôt qu'estimée.

## Colonnes sans saisie

Vingt colonnes préfixées `dom_` sont générées et portent une constante, le nom du domaine de vocabulaire. Elles forment la moitié gauche d'une clé étrangère composite vers `vocabulaires(domaine, cle)` : c'est ce mécanisme qui interdit d'écrire une exposition dans la colonne du sol. Rien à saisir, rien à modifier, et surtout rien à supprimer.

`genus` est également générée, depuis le premier mot de `latin` : l'écrire lève une erreur.

Cinq colonnes sont tenues par la base ou par le cycle de vie de la fiche : `id`, `created_at`, `updated_at`, `is_active`, `replaced_by`.

## Étape 1, identité taxonomique

Renseigner `name`, `slug`, `latin`, `family`, `typology`, `category`, et `nom_article`, l'article défini du nom d'usage, qui sert aux phrases de l'application et n'accepte que le, la, l' ou les.

Interroger dans cet ordre : la BDTFX de Tela Botanica, GBIF, puis le WCVP de POWO. Écrire `tela_num_nom`, `tela_retenu`, `tela_accepted_name`, `tela_checked_at`, `gbif_usage_key`, `gbif_status`, `gbif_match_type`, `gbif_accepted_name`, `gbif_checked_at`, `powo_status`, `powo_accepted_name`, `powo_wcvp_key`, `powo_note`, `powo_checked_at`.

Règle d'arbitrage, identique à celle appliquée aux 41 fiches classées le 29 juillet. Quand Tela Botanica confirme le nom d'usage contre GBIF, le nom est conservé et la divergence est propre à GBIF. Quand GBIF et POWO convergent vers un autre nom, ce nom reste stocké dans sa colonne et le nom d'usage reste à l'affichage. Quand GBIF et POWO divergent entre eux et que la plante est un cultigène, la question est celle du rang botanique et non de l'identité : renseigner `groupe_cultivars` avec le nom de Groupe au sens du Code international de nomenclature des plantes cultivées, source horticole à l'appui. La colonne `latin` n'est jamais remplacée par un nom qu'aucun catalogue n'emploie.

Ces quatre colonnes de nom, `latin` plus les trois noms acceptés, servent ensuite à tout appariement avec une source externe. Les interroger toutes, dans cet ordre, avant de conclure qu'une plante est absente d'une base. La clé GBIF sert en outre au recensement des photographies, à l'étape 10.

Si l'espèce appartient à la flore de France, charger `baseflor` et sa date `baseflor_checked_at` : type biologique, chorologie, sexualité, pollinisation, floraison, valeurs indicatrices. Ce chargement alimente ensuite plusieurs champs sans appel externe. Couverture actuelle 173 sur 315, ce qui correspond au périmètre de la flore spontanée.

## Étape 2, colonnes structurées de culture

| Champ | Source de premier rang | Croisement |
|---|---|---|
| `life_cycle`, `habit`, `conduite` | Flore de France ou fiche d'espèce du Royal Horticultural Society | Cohérence avec `type_bio` de baseflor |
| `exposure`, `soil`, `water_need` | Plant Finder du Missouri, champs Sun, Water, Soil | Fiche du Royal Horticultural Society |
| `spacing_cm`, `row_cm`, `depth_cm` | Catalogue de semences ou guide potager d'un service d'extension universitaire | Lecture du dessin de taille à maturité, voir ci-dessous |
| `height_min_cm`, `height_max_cm` | Plant Finder du Missouri, champ Height | Fiche du Royal Horticultural Society |
| `fertility_need` | Guide potager d'extension | Cohérence avec le conseil de fertilisation |
| `propagation`, `planting_mode` | Fiche de culture | Cohérence avec la phase de multiplication |
| `toxicity`, `toxicity_note` | ANSES, centres antipoison, Agence européenne des médicaments | Deux sources exigées pour toute mention de toxicité |
| `first_harvest_year` | Catalogue de pépinière | Périmètre des pérennes comestibles seulement, 72 fiches |
| `hardiness`, `frost_min_c`, `frost_note` | Voir étape 4 | |

Contrôle de l'écartement par le dessin. Depuis le 5 août, la fiche dessine la hauteur et l'écartement à la même échelle, avec une silhouette humaine d'un mètre soixante-dix pour témoin et une rangée de pieds voisins en gris. Un écartement faux se voit immédiatement : une haie continue là où les pieds devraient être séparés, ou du sol nu sous un arbre qui devrait fermer. Ouvrir la fiche et regarder le dessin est un meilleur contrôle que la comparaison aux fiches voisines du même genre. Les deux nombres sont renseignés sur les 315 fiches, il n'existe donc aucun cas où le dessin manque.

Quatre colonnes de note accompagnent les colonnes structurées et portent la nuance que la clé ne peut pas porter : `soil_note` et `water_note` sur les 315 fiches, `exposure_note` sur 47, `foliage_note` sur 47. Elles sont libres mais restent courtes, un membre de phrase, et ne redisent jamais le libellé de la clé. Elles ne portent pas non plus la discussion des sources, qui va dans `source`.

Deux colonnes de texte doublent des colonnes numériques et sont conservées parce que l'application les affiche telles quelles : `spacing` reprend `spacing_cm` et `row_cm` sous la forme « 40 x 50 cm », `depth` reprend `depth_cm` quand la profondeur est un nombre et porte sinon une mention de conduite, « greffe hors sol », « arbuste ». Les écrire cohérentes avec les nombres.

## Étape 3, calendrier et conseils

Créer les lignes de `plant_phases` sur l'axe des vingt-quatre quinzaines, une ligne par période continue. La colonne `climates` ne sert qu'aux périodes qui diffèrent d'un climat à l'autre, une ligne par climat concerné. Une période valable partout laisse `climates` à vide.

Attention au décompte : une tâche déclinée sur cinq climats occupe cinq lignes pour une seule période réelle. Tout contrôle de périodes multiples doit neutraliser cette déclinaison, sans quoi il compte cinq fois la même fenêtre.

Phases attendues selon le type de plante. Un légume porte au minimum `plant`, `recolte` et `terre`. Un ligneux porte `plant`, `taille`, `floraison` et, s'il produit, `recolte`. Une ornementale porte `plant` et `floraison`.

Chaque phase créée reçoit son conseil dans `plant_advice`, et réciproquement aucun conseil ne porte sur une phase absente du calendrier. La vue `controle_coherence` vérifie les deux sens.

Une tâche à plusieurs périodes réelles reçoit un conseil par période, écrit dans `plant_advice` avec `phase_id` renseigné. Un texte unique servant deux saisons est un défaut : c'est lui qui faisait afficher la taille d'hiver de la glycine au mois d'août.

`advice` porte le caractère général de la plante, une à deux phrases, ce qui n'appartient à aucune tâche : « Cultivé pour son feuillage, surveiller les limaces au démarrage des pousses. » Il paraît en tête de fiche. Renseigné sur les 315 fiches.

Les conseils sont dérivés des colonnes structurées de la fiche et non rédigés librement : espacement et profondeur pour la plantation, niveau de besoin pour la fertilisation, nature de sol pour la préparation, ressource offerte aux butineurs pour la floraison, délai avant première récolte pour la récolte. Un conseil qui ne reprend pas la donnée que la fiche porte déjà est incomplet.

Corollaire, découvert le 2 août. Une phrase dérivée d'une colonne est une assertion au même titre que la colonne : vider la colonne sans retirer la phrase laisse l'affirmation dans le texte. Toute reprise d'une colonne dérivée doit s'accompagner du recalcul des conseils qui la citent. Les phrases concernées à ce jour sont les quatre formules de ressource pour les butineurs et la mention « Fleurs parfumées », cette dernière se plaçant en fin de conseil.

Durée entre semis et récolte. Elle se contrôle en appliquant la durée publiée par le catalogue ou le service d'extension à la période de récolte : le semis obtenu doit retomber dans une fenêtre praticable. Un semis qui tombe en plein hiver ou après la récolte invalide la durée retenue.

Une borne de période publiée par une source américaine se relit contre le climat français avant d'être reprise. La récolte du céleri-branche s'arrête à novembre et non à décembre, le seuil de gel n'étant tenu que sous voile ; l'écart à la source est écrit dans `source`.

Le vocabulaire employé dans les conseils est celui du métier. Un terme qui n'est pas d'usage courant est repris dans la table `glossaire`, avec ses formes fléchies dans `variantes` et une définition d'une à deux phrases, plutôt que glosé dans chaque texte.

## Étape 4, rusticité, gel et hivernage

`hardiness` reçoit la classe parmi cinq valeurs contrôlées, `frost_min_c` le seuil en degrés Celsius, `frost_note` la précision quand elle existe.

Pour une culture potagère annuelle ou bisannuelle, la source validée est le relevé des températures de destruction hivernale de Pam Dawling, révision 2025, dont la règle est la médiane des températures publiées pour la culture. Validation mesurée sur seize fiches déjà sourcées : biais de moins 0,88 degré, écart absolu moyen de 1,00.

Pour une vivace ou un ligneux, cette source ne convient pas : elle mesure la destruction du feuillage quand la colonne enregistre la survie de la souche. La voie de la zone de rusticité américaine a été testée et écartée, avec un biais de moins 11,2 degrés et un écart type de 6,3. La notation du Royal Horticultural Society, dont les bandes font cinq degrés, reste à valider sur le même protocole avant emploi.

Contrôle. La valeur produite ne doit pas être plus chaude que la borne haute de la classe portée par la fiche. Une valeur plus froide que toutes les valeurs déjà enregistrées n'est pas une contradiction.

`wintering` dit ce que devient la plante à l'hiver, périmètre des non-annuelles, 209 fiches. `humidite_hivernale` marque les 14 plantes qui craignent l'eau de l'hiver plus que le froid, et sert à la dérivation des conseils de plantation d'automne.

La colonne JSON `attributes` ne porte plus que deux clés, `rusticite` et `taille`, héritées d'avant la structuration. `rusticite` est un libellé composé de la classe suivie parfois d'une nuance, séparée par une virgule : « Rustique, craint l'humidité ». L'application n'affiche que la nuance, la jauge donnant déjà le seuil en degrés. Écrire la classe en tête, la nuance après la virgule, jamais l'inverse.

## Étape 5, adaptation par climat

Étape ajoutée le 7 août. Elle manquait à la procédure alors que la table est renseignée sans exception : `plant_climates` porte 1595 lignes, soit cinq lignes pour chacune des fiches du catalogue, une par climat. Une fiche à laquelle il manquerait une ligne se comporterait comme une plante sans avis pour ce climat, sans que rien ne le signale.

Cinq climats, clés de la table `climates`. Quatre niveaux dans `level` : `adapte`, `protection`, `abri`, `deconseille`.

La colonne `derived` sépare deux régimes, et la convention est stricte. Un niveau dérivé des colonnes de la fiche, en pratique de la rusticité et du seuil de gel confrontés au climat, porte `derived` à vrai et laisse `note` vide. Un niveau établi autrement porte `derived` à faux et sa `note` est obligatoire, elle dit pourquoi le niveau s'écarte de ce que la dérivation aurait donné. Aucune ligne dérivée ne porte de note, aucune ligne non dérivée n'en est dépourvue.

Marche à suivre. Produire les cinq lignes par dérivation, puis relire les climats où la plante est connue pour se comporter autrement que sa rusticité ne le laisse attendre, et n'écrire à la main que ceux-là, avec leur note.

Point ouvert, et bloquant pour toute fiche nouvelle. La règle de dérivation elle-même n'est écrite nulle part, ni ici ni dans une fonction de la base : les 1524 premières lignes ont été produites par un script de campagne. Une tentative de reconstitution par régression sur le corpus a échoué le 10 août : la règle ne se réduit pas à une comparaison du seuil de gel à une température de référence par climat, le basilic étant donné adapté en méditerranéen avec un seuil de plus quatre degrés. Elle mêle donc le cycle de vie et la longueur de saison. Tant qu'elle n'est pas reconstituée, les cinq lignes d'une fiche nouvelle se posent par analogie avec une fiche voisine, `derived` à faux et la note disant l'analogie.

## Étape 6, intérêt pour les pollinisateurs

`nectar` et `pollen` sur quatre classes. Renseignés sur 91 et 90 fiches, celles que la source de premier rang cote. Les autres restent vides.

Source de premier rang, la *Liste de plantes attractives pour les abeilles, plantes nectarifères et pollinifères à semer et à planter*, Val'hor, FranceAgriMer, Société nationale d'horticulture de France, Institut de l'Abeille, ASTREDHOR, CNPMAI et INRA, juin 2017, 200 espèces. Elle cote l'intérêt nectar et l'intérêt pollen par un nombre de pictogrammes allant de zéro à trois, et publie pour chaque espèce un indice de confiance sur trois degrés, calculé sur le nombre de sources bibliographiques et de dires d'experts recensés.

Conversion. Zéro donne `nul`, un donne `faible`, deux donnent `moyen`, trois donnent `fort`. C'est un réétiquetage entre deux échelles ordinales à quatre degrés, non une déduction : aucun seuil n'est à choisir. L'indice de confiance est reporté dans `source`.

Emploi de l'indice de confiance. Une cotation positive est conservée quel que soit l'indice ; une cotation nulle n'est conservée qu'à partir de l'indice 2. La raison est que les deux n'ont pas le même statut logique : une cotation positive suppose une observation affirmative, qu'une documentation mince ne peut pas produire, tandis qu'une cotation nulle est une négation, dont la valeur ne dépasse pas la complétude de la documentation qui la porte. La source porte la signature de ce biais, la part de nectars nuls tombant de 23 pour cent à l'indice 1 à 8 pour cent à l'indice 3 pendant que la cotation moyenne monte de 1,57 à 1,98. Lues une à une, les cotations nulles de l'indice 1 contiennent des erreurs franches, l'achillée et l'aneth sans pollen, l'abélia et le muflier sans nectar, quand celles de l'indice 2 sont défendables et comprennent deux cas d'école, le noisetier et l'argousier sans nectar, tous deux anémophiles.

Extraction. Les deux colonnes utiles sont des pictogrammes vectoriels que `pdftotext` ne rend pas, alors qu'il restitue les carrés de floraison et les points de l'indice. Convertir chaque page en SVG par `pdftocairo -svg`, reconnaître les glyphes au début de leur tracé, la goutte de nectar par `M 10.953125 -4.65625 C 10.546875 -6.25`, le pollen par `M 6.734375 -3.359375 L 6.734375 -6`, le point plein de l'indice par `M 8.453125 -3 C 8.460938 -2.476562`, regrouper les éléments `use` en rangées par leur ordonnée à trois points près, et lire les noms par `pdftotext -bbox` dans le même repère. Les trois points de l'indice figurent sur toutes les lignes et garantissent qu'aucune rangée n'échappe au repérage.

Appariement. Sur le binôme latin, confronté aux quatre colonnes de nom de l'étape 1. Une entrée cotée à l'espèce s'applique à toutes les fiches de cette espèce, y compris à ses formes cultivées, la fleur étant la même : le rutabaga reçoit ainsi la cotation du colza, et le navet celle de la navette. Une entrée cotée au genre, écrite `spp.`, ne s'applique que si son libellé français désigne le genre en général, comme « campanules » ou « Sauges ». Un libellé qui nomme des plantes particulières ne vaut que pour celles-là : « Ail des ours, ciboulette » ne couvre ni l'ail, ni l'oignon, ni le poireau, ni l'échalote.

Ce que la liste ne couvre pas reste vide. Les deux catalogues employés auparavant, la table du Centre technique horticole de Gembloux et le catalogue Trachtpflanzen de Bienenroute, ne sont plus la convention du référentiel, et leurs valeurs ont été retirées.

`nectar_season` n'est plus renseignée. Aucune source n'établissait à quelle saison la ressource est offerte. La colonne se déduira de la fenêtre de floraison, qui est sourcée, le jour où un calendrier apicole la demandera, selon une convention de bornes à écrire et à soumettre.

`pollination` dit le régime de fécondation, 42 fiches où la question se pose. `pollination_vector` dit par quoi la fleur est pollinisée, tableau de clés contrôlées, 168 fiches.

Aucune mesure quantitative par fleur ne convient. Les colonnes `nectar_ug_fleur` et `pollen_um3_fleur` conservent la trace de deux jeux testés et écartés, sur 74 et 36 fiches. Elles ne sont ni affichées ni employées dans un calcul, et ne doivent pas être reprises pour renseigner `nectar` ou `pollen` : la colonne du référentiel intègre le nombre de fleurs portées et la durée de floraison, grandeurs qu'une mesure par fleur ne contient pas.

## Étape 7, floraison, parfum et feuillage

`flower_colors` porte les couleurs en clés contrôlées, 257 fiches, rangées par dominance décroissante : c'est la première qui donne la teinte de la bande de floraison et l'ouverture de la légende. `flower_color_note` porte la formulation sourcée, 169 fiches, dont le qualificatif que la clé ne rend pas, « Bleu violacé », « Pourpre chocolat ». L'ordre du tableau se cale sur l'ordre d'apparition dans la note.

`floraison_pic_q` porte la quinzaine de pic de floraison et `floraison_pic_note` sa précision, 12 fiches issues des relevés TEMPO.

`fragrance_organ` porte l'organe parfumé, 68 fiches. Le Plant Finder du Missouri publie les attributs `Flower: Fragrant` et `Leaf: Fragrant`, qui donnent la présence et l'organe sans conversion, et qui peuvent être cochés ensemble. Chercher le taxon par `PlantFinderProfileResults.aspx?basic=<binôme>`, retenir le résultat dont le nom scientifique correspond exactement au binôme et qui n'est pas un cultivar, puis lire les attributs sur `PlantFinderDetails.aspx?taxonid=<identifiant>`.

Le silence de la source n'est pas une preuve d'absence : elle ne coche pas systématiquement l'attribut. Une plante présente au Plant Finder sans attribut de parfum reçoit la mention `parfum : non établi par le Plant Finder`, qui distingue le champ vérifié et non établi du champ jamais consulté.

`fragrance` n'est plus renseignée. L'intensité du parfum n'est cotée par aucune base. Le vocabulaire à quatre classes reste en place pour le jour où une source graduée se présenterait.

`foliage`, périmètre des ligneux, lianes et graminées, 117 fiches sur un périmètre de 107 plus les cinq lianes restantes. Le Plant Finder ne l'énonce que pour les arbustes, sous la forme `Deciduous shrub` ou `Broadleaf evergreen`. Pour les fruitiers, les arbres et les lianes, employer le champ `Foliage` des fiches du Royal Horticultural Society, dont le climat océanique est proche de la référence française. C'est le seul champ des quatre à demander une vérification climatique, la persistance basculant avec la rigueur de l'hiver.

## Étape 8, usage au jardin et voisinage

`uses` porte les emplois en clés contrôlées contre le vocabulaire `usage`, vingt-quatre clés, du couvre-sol à la fleur à couper. `uses_note` porte la formulation lisible, qui est ce que la fiche affiche. Couverture actuelle 241 sur 315 après la campagne du 2 août, 74 fiches restent à traiter.

Source de premier rang pour l'emplacement, le champ Garden Uses du Plant Finder du Missouri : massif, bordure, rocaille, haie, potée, couvre-sol, talus, naturalisation. Source de premier rang pour l'emploi de la récolte, Plants For A Future : usage culinaire, infusion, purin. Les deux se complètent sans se recouvrir.

`companions` porte le compagnonnage, c'est-à-dire les plantes à installer à côté, et rien d'autre. Sur les ornementales, cette colonne a longtemps servi à noter l'emplacement, ce qui la fait redire l'usage : la lavande y portait « Bordure, rocaille, pied de rosier » quand son usage dit déjà bordure et rocaille. À l'ajout d'une plante, l'emplacement va dans `uses` et seul le voisinage reste dans `companions`.

Une association n'est conservée que si une source de rang un ou deux établit un effet nommé. « Se plaisent ensemble » n'est pas un effet. Les antagonismes établis valent autant que les associations et ouvrent le texte quand ils existent. L'application affiche le voisinage à deux endroits, la ligne Voisinage du bloc Au jardin et le geste de plantation ou de semis de l'onglet du moment.

## Étape 9, arrosage

`irrigation_mode` fixe le mode : calculé, reprise seule, contenant, ou sans arrosage.

Pour le mode calculé, renseigner `kc_ini`, `kc_mid`, `kc_end` depuis la table 12 du bulletin FAO 56, et `cycle_ini_j`, `cycle_dev_j`, `cycle_mid_j`, `cycle_late_j` depuis la table 11, périmètre des cultures à cycle, 50 fiches. Écrire `kc_source`. Choisir `kc_modele` : `cycle` pour une culture dont le coefficient suit la date de plantation, `saison` pour une plante pérenne dont il suit la saison de végétation. Pour une ornementale non couverte par la FAO, employer les coefficients paysagers WUCOLS.

Pour le mode contenant, renseigner `contenant_litres_defaut`.

Lancer ensuite `recalculer_kc_quinzaine()` pour produire la courbe.

## Étape 10, planche botanique et photographies

Étape ajoutée le 7 août. Les deux jeux d'images sont indépendants l'un de l'autre et n'ont ni la même source, ni le même rôle, ni le même support.

### Planche dessinée

La planche est la vignette qui identifie la plante partout où elle est nommée dans une liste : écran des plantes, liste d'une tâche, frise annuelle, espace, bande « En fleur en ce moment ». Elle donne aussi l'entête de la fiche. Sans planche, la plante paraît sans vignette dans tous ces écrans.

Le manifeste `planches.json`, servi par le site, associe le `slug` à une clé de fonds, suivie d'un `g` quand la planche est celle du genre. Les clés sont listées dans la table `FONDS` d'`app.js`, que le contrôle avant dépôt confronte au manifeste. Trente-sept ouvrages y figurent, tous du domaine public, depuis la seconde campagne du 10 août.

Deux images par plante, `planches/liste/<slug>.webp` pour le masque de liste et `planches/fiche/<slug>.webp` pour l'entête. La provenance de chaque planche est consignée dans `planches-provenance.json` : fichier Commons, fonds, niveau, adresse de la page.

Couverture actuelle 309 sur 315, dont 65 planches du genre. Une plante ajoutée sans entrée dans le manifeste n'a pas de vignette, ce qui n'est pas une erreur d'affichage mais un manque à combler. Le détail de la fabrication est dans `claude/planches-fabrication.md`.

### Photographies

La table `plant_images` porte les photographies de la bande qui ouvre l'onglet Identité de la fiche. Clé primaire `plant_id, organe, rang`. Six organes contrôlés, dans l'ordre d'affichage : `fleur`, `feuille`, `fruit`, `racine`, `port`, `ecorce`. Rang de 1 à 12, la cible de travail étant six images par organe attendu. Deux fonds, `plantnet` et `commons`. Colonnes d'attribution obligatoires : `auteur`, `licence`, `source`. `retenue` à faux écarte une image sans la supprimer, et le rang suivant prend la place.

Règles de licence, qui ne sont pas négociables. Les images ne sont ni réhébergées ni recadrées, la table porte l'adresse chez le fonds et le carré de la tuile se fait à l'affichage. L'attribution paraît deux fois, sous la bande avec tous les auteurs, et au plein écran avec l'auteur de l'image regardée. Chez Pl@ntNet, la tuile demande la taille `s` et le plein écran la taille `m`, en changeant une lettre dans l'adresse. Chez Commons, l'échelle est fixe, 120, 250, 500 et 1280 points, et le chemin d'une vignette porte un répertoire dérivé d'une empreinte qui ne se construit pas à la main : il vient de la réponse de l'interface de programmation.

Marche à suivre pour une plante nouvelle. Chercher d'abord chez Pl@ntNet par la clé GBIF de l'étape 1, avec `outils/photos/reserve.py`. Si le taxon n'a pas d'observation, ce qui est le cas des variétés potagères dont l'espèce parente ne montre que la forme sauvage, passer à `outils/photos/commons.py`. Verser au moins la fleur et la feuille, les autres organes selon ce que la source offre. Sans photographie, la section est absente de la fiche, sans titre ni cadre vide, ce qui est un état acceptable mais visible.

L'organe `ecorce` ne vaut que pour un port ligneux, arbre, arbuste, liane ou sous-arbrisseau. Une plante herbacée, un bulbe et une graminée n'ont pas d'écorce : la tuile montre alors forcément autre chose, une tige, une souche voisine, le sol. L'audit du 7 août en a retiré 66, plus de la moitié des tuiles d'écorce du catalogue.

### Contrôles automatiques sur les images

Installés le 7 août sous `outils/photos`, après le constat que la fiche du rosier montrait un bouton en guise de fleur, un feuillage malade en guise de feuille et un port illisible tant l'image était sombre. Quatre modules et trois commandes.

`mesures.py` rend des mesures objectives et sans seuil : lumière médiane du cadre et du centre, part de pixels presque noirs, part de blancs brûlés, étendue de luminance, netteté du carré le plus net, part de feuillage, plus grande masse colorée, part totale de non-vert, taches jaunes ou brunes dans le voisinage du vert, fond uni sur la couronne, finesse de texture, teinte dominante.

`controles.py` porte les seuils et rend des motifs de rejet lisibles. Contrôles généraux : sous-exposée, surexposée, sans contraste, floue, format inexploitable, cadre sans sujet végétal. Contrôles de sujet : pas de fleur lisible, centre occupé par le feuillage, teinte incompatible avec `flower_colors`, feuillage absent du cadre, feuillage abîmé, pas de fruit lisible, feuillage dominant sur une tuile d'écorce, végétation absente d'un port.

`coherence.py` compare les lignes entre elles, ce que l'analyse d'image ne peut pas voir puisque chaque image prise seule est irréprochable : image partagée par deux fiches, image répétée sur deux organes de la même fiche, plusieurs organes tirés de la même observation, organe sans objet chez une plante non ligneuse.

`auditer.py` relit le catalogue entier. `chercher.py` propose des remplaçantes pour un taxon et un organe chez Pl@ntNet. `reserve.py` mène la campagne d'approfondissement chez Pl@ntNet, `commons.py` la campagne de repli chez Wikimedia. Aucune n'est dans la chaîne de contrôle avant dépôt : elles demandent OpenCV et le réseau.

Deux régimes d'emploi, et les confondre serait une erreur. Au versement d'une photographie nouvelle, les contrôles sont une barrière : les candidats se comptent par centaines, écarter à tort ne coûte rien, et seul ce qui passe tout est examiné. Sur le catalogue déjà en place, ils sont un tri : écarter à tort coûte le retrait d'une image correcte, les seuils sont donc posés en précision et la tête de liste est relue à l'oeil sur planche de contact.

Ce que les mesures savent et ne savent pas. Elles écartent de façon fiable ce qui est franchement mauvais. Elles ne distinguent pas une coloration d'automne d'une maladie, un rameau mort d'un rameau nu en hiver, ni un feuillage glauque d'un sol gris. Elles ne savent surtout pas si l'image montre bien l'espèce annoncée. La relecture à l'oeil reste obligatoire, et c'est elle qui a écarté 22 des 83 remplacements que le classement proposait le 7 août.

Deux mesures ont été essayées et retirées parce qu'elles classent à l'envers. La variance globale du laplacien récompense un fond encombré et pénalise un gros plan propre sur fond fondu, qui est pourtant la meilleure prise de vue. Le rapport de netteté du centre sur le bord est au plus bas sur les plus belles images. La netteté se mesure par le meilleur carré du cadre.

Un défaut de mesure a coûté cher et mérite d'être retenu : la masse colorée était cherchée dans les seuls pixels saturés, ce qui rendait le contrôle aveugle au blanc, couleur de fleur la plus répandue du catalogue. Achillée, sureau, cornouiller, pavot et cerisier étaient tous jugés sans fleur. Une seconde bande recueille désormais le clair peu coloré, le ciel en étant retiré par sa forme, une plage large touchant le haut du cadre.

## Étape 11, provenance

`source` porte, dans l'ordre, les sources consultées séparées par des virgules, puis les mentions particulières séparées par des barres verticales : `taille vérifiée : ...` pour un champ relu pour lui-même, `nectar et pollen : ...` et `parfum : ...` pour les champs sourcés un à un. `verified_at` porte la date du dernier contrôle.

Une mention nomme la source, son édition ou sa date, l'entrée retenue, et la date de consultation. Quand la source publie un indice de fiabilité, le reporter.

La forme négative est utile et doit être employée. Deux cas se présentent. Le champ a été cherché et la source ne l'établit pas : `parfum : non établi par le Plant Finder du Missouri, taxon N, consulté le ...`. La source énonce une valeur que la règle d'emploi de son indice écarte : `nectar : cotation nulle non retenue, la source ne l'énonce qu'à son plus faible indice de confiance`. Un champ vide seul ne dit ni l'un ni l'autre.

Un troisième cas s'est présenté le 10 août avec la phacélie, l'aubépine et le céleri : deux sources de premier rang se contredisent sur la toxicité, l'une signalant un allergène de contact quand l'autre n'énonce aucun danger. La règle des deux sources concordantes s'applique, le champ reste vide, et `source` porte les deux positions et le fait qu'aucune troisième source ne tranche.

La fonction `sans_estimation(source, champ)` retire un champ de la liste des estimations et supprime le segment lorsque la liste devient vide.

La provenance des images ne passe pas par cette colonne. Celle des photographies est portée ligne à ligne dans `plant_images`, celle des planches dans `planches-provenance.json`.

## Étape 12, contrôles avant activation

Exécuter `select * from controle_coherence where plant_id = <id>`. Aucune ligne ne doit subsister. Attention, la vue ne porte que sur les fiches actives : elle ne dit rien d'une fiche insérée inactive, et le contrôle ne vaut qu'au moment du basculement.

Vérifier en outre, à la main, les points que la vue ne couvre pas encore. La floraison précède la récolte d'un intervalle plausible. La période de semis, augmentée de la durée jusqu'à maturité, retombe dans la période de récolte. Les conseils ne citent pas une plante absente de leur propre groupe. Aucune valeur n'est écrite sans que `source` porte sa provenance. La plante porte ses cinq lignes de `plant_climates`.

Contrôle d'affichage, ajouté après l'audit du 2 août et complété le 7. Une donnée juste en base peut n'arriver nulle part. Ouvrir la fiche de la plante et vérifier que chaque champ renseigné y paraît. En particulier, comparer les clés que la vue `plants_full` produit dans `attributes` à celles que l'application lit : une vue qui construit une clé depuis une colonne vidée laisse un trou silencieux, sans erreur ni valeur nulle visible. La requête de contrôle est `select jsonb_object_keys(attributes) from plants_full where id = <id>`.

Trois points d'affichage s'y ajoutent. Le dessin de taille à maturité montre une rangée plausible. La vignette de planche paraît dans la liste des plantes et dans la frise. La bande de photographies ouvre l'onglet Identité, ou en est absente sans laisser de cadre vide.

Ne passer `is_active` à vrai qu'après ces contrôles.

## Règles permanentes

Toute écriture passe par le journal avec son motif, au moyen de `set local app.motif`.

Toute règle de conversion est écrite avant d'être appliquée, puis mesurée sur un jeu de valeurs déjà sourcées qui n'a pas servi à l'établir. Quand le choix de la règle se fait sur les données, le jeu est partagé en deux moitiés, la règle est choisie sur l'une et mesurée sur l'autre, et le choix doit être le même dans les deux sens.

Exception à cette règle, et seule exception admise. Quand la source publie déjà une échelle ordinale ayant le même nombre de degrés que le vocabulaire du référentiel et la même sémantique aux deux extrémités, la correspondance est un réétiquetage et non une conversion. Aucun seuil n'étant choisi, il n'y a rien à valider. C'est le cas de la liste Val'hor. Ce n'est pas le cas d'une mesure quantitative, ni d'une échelle à cinq ou six degrés, qui l'une comme l'autre exigent des seuils et donc une validation.

Une valeur positive et une valeur nulle publiées par la même source n'ont pas la même force. La première suppose une observation, la seconde peut naître de l'absence de documentation. Quand la source publie un indice de fiabilité, l'employer de façon dissymétrique : retenir les valeurs positives à tous les indices, et les valeurs nulles à partir du deuxième. Le seuil se fixe en mesurant la part de valeurs nulles par indice et en relisant les valeurs nulles du plus faible indice une à une.

Toute table nouvelle ou réextraite passe d'abord un contrôle sur cinq espèces dont le comportement n'est pas discutable : Saule marsault, nectar et pollen abondants ; Noisetier et Coquelicot, sans nectar et riches en pollen ; Thym et Lavande, riches en nectar et pauvres en pollen. Ce contrôle a détecté une inversion de colonnes qu'aucune comparaison au référentiel n'avait révélée.

Toute extraction d'un tableau imprimé se contrôle en rendant une page en image et en lisant les valeurs à l'oeil, avant de confronter au référentiel. Une colonne perdue par l'extraction ne se voit pas dans le résultat. Quand une valeur extraite paraît douteuse, relire sa page en image avant de conclure : c'est ce qui a séparé une erreur d'extraction d'une faiblesse de la source sur la cotation de la navette.

Tout jugement porté sur un rendu se fait à la taille réelle de l'appareil. Une relecture faite à trois fois la définition du téléphone a laissé passer une rangée de pieds voisins invisible en usage, le gris ayant été calé sur l'image agrandie.

Tout appariement de noms latins passe par la normalisation qui neutralise les marques de rang et d'hybridité, appliquée successivement à `latin`, `gbif_accepted_name`, `powo_accepted_name` et `tela_accepted_name`. Un synonyme nomenclatural absent de ces quatre colonnes est ajouté explicitement et documenté. La même règle vaut pour les catégories de Wikimedia Commons, où le signe multiplié remplace parfois la lettre x et où le nom accepté a souvent changé.

Une source n'est jamais supprimée avant que ce qui en a été tiré ait été validé. Une colonne devenue redondante à l'affichage est retirée de l'affichage, non de la base.

Une valeur qu'aucune source n'établit est laissée vide. Elle n'est ni estimée, ni déduite par analogie, ni reprise d'un site généraliste. Un champ vide se lit comme un manque, une valeur fausse se lit comme un fait.

Modifier une ligne de `plants` déplace l'empreinte du catalogue, `catalog_meta` valant le nombre de plantes et la plus récente date de modification. Une correction portée à la seule vue ne déplace pas cette empreinte : les clients servent alors leur cache. Toucher une ligne pour forcer le rafraîchissement.

Ajouter une colonne à ce que l'application lit demande de la porter dans `COL_LEGERES` ou `COL_LONGUES` d'`app.js`. La signature `FORME_CACHE` est construite sur ces deux listes et écarte d'elle-même le catalogue gardé en mémoire locale par une version antérieure. Sans cette signature, une colonne nouvelle restait invisible sur les appareils déjà installés, l'empreinte du catalogue ne bougeant pas.

Ajouter une plante au catalogue d'essai `outils/essais/donnees/catalogue.json` se fait en fin de tableau et jamais par un tri : plusieurs suites d'essais désignent une plante par sa position, et un tri par nom fait échouer la moitié du lot.

## Couverture des champs à périmètre partiel

Ces champs ne s'appliquent pas à toutes les plantes. Un vide n'y est pas un manque.

| Champ | Périmètre | Renseigné |
|---|---|---|
| `nectar` | espèces cotées par la liste Val'hor | 91 |
| `pollen` | espèces cotées par la liste Val'hor | 90 |
| `fragrance_organ` | espèces dont le Plant Finder coche le parfum | 68 |
| `uses`, `uses_note` | toutes | 241 |
| `foliage` | ligneux, lianes, graminées | 117 sur 107 du périmètre strict, plus les lianes |
| `first_harvest_year` | pérennes comestibles | 72 sur 86 |
| `wintering` | hors annuelles | 209 sur 244 |
| `pollination_vector` | flore documentée | 168 |
| `flower_colors` | plantes à floraison notable | 257 sur 258 |
| `frost_min_c` | toutes | 295 |
| `pollination` | espèces où la question se pose | 42 |
| `conduite` | fruitiers conduits | 39 |
| `floraison_pic_q` | relevés TEMPO | 12 |
| `fragrance` | aucune source ne cote l'intensité | 0 |
| `nectar_season` | aucune source ne l'établit | 0 |
| `plant_climates` | toutes, cinq lignes chacune | 318 |
| `plant_images` | toutes | 309 fiches |
| entrée de `planches.json` | toutes | 309 |

## Sources vérifiées et retenues

| Source | Langue | Ce qu'elle donne | Accès |
|---|---|---|---|
| BDTFX de Tela Botanica | français | Nom retenu pour la flore de France | Vérifié |
| GBIF | anglais | Nom accepté, clé d'usage | Vérifié |
| WCVP de POWO | anglais | Nom accepté, statut | Vérifié |
| Baseflor, Julve | français | Type biologique, chorologie, sexualité, floraison spontanée | Chargé en base |
| Liste de plantes attractives pour les abeilles, Val'hor et FranceAgriMer, 2017 | français | Intérêt nectar et intérêt pollen sur quatre degrés, indice de confiance, 200 espèces | Vérifié, extraction par SVG |
| Plant Finder du Missouri Botanical Garden | anglais | Organe parfumé, type, zone, exposition, sol, hauteur, groupe de cultivars, usages au jardin | Vérifié, deux appels par espèce |
| Fiches d'espèce du Royal Horticultural Society | anglais | Persistance du feuillage, notation de rusticité, mois de floraison en climat océanique | Vérifié |
| Winter-Kill Temperatures of Cold-Hardy Vegetables, Pam Dawling | anglais | Température de destruction par culture et par variété | Vérifié |
| Guide de semis potager, Penn State Extension | anglais | Durée jusqu'à maturité par culture | Vérifié |
| Plants For A Future | anglais | Port, persistance, usages culinaires et domestiques | Vérifié, une adresse constructible par espèce |
| Bulletin FAO 56, tables 11 et 12 | anglais | Coefficients culturaux et longueurs de stade | Vérifié |
| Fiches climatologiques de Météo-France | français | Évapotranspiration et températures normales | Vérifié |
| ANSES, centres antipoison, Agence européenne des médicaments | français | Toxicité | Vérifié |
| Pl@ntNet, par l'export GBIF | français | Photographies de terrain par organe, auteur et licence | Vérifié, aucun signal de qualité publié |
| Wikimedia Commons | multilingue | Photographies des taxons absents de Pl@ntNet, planches du domaine public | Vérifié, échelle de vignettes fixe |
| Vilmorin-Andrieux 1883, Masclef 1891, Köhler 1887, Thomé 1885 et trente-trois autres ouvrages | français, anglais, allemand, néerlandais, latin | Planches botaniques du domaine public | Vérifié, versées dans le dépôt |

## Sources testées et écartées

Tew et al. 2023 et AgriLand, mesures de sucre et de pollen par fleur : mesurent une quantité par fleur, sans relation avec la note du référentiel. Leur trace subsiste dans `nectar_ug_fleur` et `pollen_um3_fleur`, colonnes non employées.

Table des plantes d'intérêt apicole du Centre technique horticole de Gembloux, et catalogue Trachtpflanzen de Bienenroute : employées jusqu'au 2 août 2026, remplacées par la liste Val'hor, de rang supérieur, française, et graduée sur le même nombre de degrés que le vocabulaire. Leurs valeurs ont été retirées du référentiel.

Bienenweiden de Hortipendium, allemand : la colonne pollen mesure le rendement pour la colonie d'abeilles domestiques, elle place la Courgette et la Digitale au niveau nul.

Zones de rusticité américaines comme seuil de gel : sans relation utilisable, la zone décrivant où la plante peut être cultivée en saison.

Base Mansfeld des plantes cultivées, institut Leibniz IPK : accès automatisé interdit par son fichier d'exclusion.

World Flora Online : inaccessible, échec de certificat.

Poids, définition et variance globale du laplacien comme mesures de qualité d'une photographie : les deux premières mesurent l'appareil, la troisième classe à l'envers, récompensant l'encombrement et pénalisant le gros plan sur fond fondu. Le rapport de netteté du centre sur le bord classe à l'envers pour la même raison. La part de pixels de carnation, essayée pour repérer une main tenant le rameau, se déclenche autant sur une terre brune et un bois sec.
