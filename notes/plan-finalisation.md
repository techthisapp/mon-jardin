# Plan de finalisation de la fiabilisation

Chaque lot est adossé à une source dont l'accès a été testé avant d'être inscrit ici. Quand la source ne donne pas directement la grandeur portée par la base, la règle de conversion est écrite et un test de validation est prévu. Ce qui n'a pas de source accessible reste déclaré comme tel.

## Sources retenues, accès testé

| Source | Ce qu'elle donne | Accès |
|---|---|---|
| Tew et al. 2023, Dryad, jeu de données de production de sucre nectarifère | 225 taxons de jardins britanniques, dont 94 pour cent d'ornementales non indigènes, production journalière de sucre | Dépôt ouvert, fichier tableur de 52 kilooctets |
| Production de pollen des plantes britanniques communes, EIDC du NERC | 168 espèces, production de pollen | Dépôt institutionnel ouvert, également sur data.gov.uk |
| Plant Finder du Missouri Botanical Garden | Groupe de cultivars, famille, zone de rusticité, mention descriptive du parfum, période de floraison, exigence de drainage | Vérifié, adresse par identifiant de taxon, retrouvable par recherche |
| Notations de rusticité du Royal Horticultural Society | Échelle H1a à H7 en degrés Celsius | Vérifié, table publiée |
| Fiches de culture du Royal Horticultural Society | Périodes de semis et de récolte en climat océanique | Vérifié, une page par espèce |
| Guide de semis potager de Penn State Extension | Durée jusqu'à maturité par culture, en jours | Vérifié, panais 110, salsifis 115, rutabaga 90, navet 55, endive 90 |
| Table des zones de rusticité | Bornes de chaque zone en degrés Celsius | Vérifié |
| Baseflor, déjà chargé dans la base | Sexualité, chorologie, floraison des populations spontanées | Interne |
| BDTFX de Tela Botanica, GBIF, WCVP de POWO | Noms acceptés, déjà chargés | Interne |
| Fiches climatologiques de Météo-France | Évapotranspiration et températures normales par station | Vérifié, déjà exploité |
| Bulletin FAO 56, tables 11 et 12 | Coefficients culturaux et longueurs de stade | Vérifié, déjà exploité |

## Sources écartées après test

La base Mansfeld des plantes cultivées de l'institut Leibniz IPK, qui aurait été l'autorité de référence pour les groupes de cultivars potagers, interdit l'accès automatisé par son fichier d'exclusion. Le Plant Finder du Missouri la remplace, ayant été vérifié sur l'Artichaut qu'il nomme Cynara cardunculus, groupe Scolymus.

World Flora Online est inaccessible, échec de certificat sur son fichier d'exclusion. Aucun autre arbitre indépendant de GBIF et de POWO n'a été trouvé pour le cas du Cléome.

Les éditeurs Wiley et ResearchGate refusent l'accès. Les jeux de données eux-mêmes sont atteignables par leurs dépôts, ce qui rend le refus sans conséquence.

La table potagère de l'extension de Géorgie a été testée et écartée : elle ne couvre que le navet et le radis parmi les vingt-quatre espèces recherchées.

## Règles de conversion et tests de validation

Trois lots reposent sur une source qui ne donne pas la grandeur portée par la base. Chacun reçoit une règle écrite et un test.

### Du quantitatif à l'ordinal, pour le nectar et le pollen

Les deux jeux de données donnent une production mesurée, en masse de sucre ou de pollen. La base porte une échelle de quatre classes, nulle, faible, moyenne et forte. La conversion se fait par quantiles de la distribution restreinte aux taxons communs à la base et au jeu de données, ce qui donne à chaque classe une définition empirique explicite.

Test de validation, et c'est le point décisif. Le nectar est déjà sourcé sur 126 fiches et le pollen sur 52, valeurs qui n'ont pas servi à établir les seuils. La règle de découpage est appliquée à ces fiches et le résultat est comparé à la valeur existante. Un taux de concordance élevé valide les seuils, un désaccord systématique les fait déplacer. Sans ce test, le découpage serait arbitraire.

Transférabilité climatique. La production absolue de nectar varie avec le climat, la latitude et l'année. Le classement relatif entre espèces est en revanche largement intrinsèque. Comme la base porte une échelle ordinale et que les seuils sont pris sur les quantiles internes au jeu de données, le résultat est invariant à un facteur d'échelle climatique uniforme. C'est cette propriété qui autorise l'emploi de mesures britanniques.

### Du descriptif à l'ordinal, pour le parfum

Le Plant Finder énonce le parfum en clair, par exemple un feuillage aromatique, sans le coter. La source soutient donc la présence du parfum et l'organe qui le porte, pas son intensité.

Règle. La source sert à contrôler la présence, jamais le niveau. L'intensité reste une estimation et doit être affichée comme telle dans l'application.

Test. Les 97 fiches portant une intensité estimée sont confrontées à la source. Une fiche annoncée à parfum fort sur laquelle la source ne mentionne aucune odeur est une contradiction à traiter. Une fiche à parfum nul sur laquelle la source mentionne une odeur également.

### De la zone de rusticité au seuil de gel

Le Plant Finder donne une zone, par exemple 7 à 10 pour l'Artichaut. La base porte un seuil unique en degrés.

Règle. Retenir la borne inférieure de la zone la plus froide annoncée, lecture conservatrice puisque la plante est déclarée rustique dans cette zone et supporte donc son minimum.

Test. La colonne `hardiness` est renseignée sur les 315 fiches et donne une classe large. Toute valeur produite doit tomber dans la classe déjà portée par la fiche. Une valeur qui en sort signale soit une erreur de conversion, soit une erreur de la classe, et le cas est instruit avant écriture.

## Lot A, nectar et pollen

Volume : 189 fiches pour le nectar, 263 pour le pollen.

Marche à suivre. Récupérer les deux fichiers de données, apparier les taxons sur le nom latin en réutilisant la fonction de normalisation déjà écrite pour la confrontation à GBIF, qui neutralise les marques de rang et d'hybridité. Établir les seuils par quantiles, valider sur les 126 valeurs de nectar et 52 de pollen déjà sourcées, puis écrire les valeurs appariées avec la référence complète et la date.

Attendu et limite. Les jeux de données couvrent 225 et 168 taxons quand la base en compte 315. Le recouvrement sera partiel, en particulier sur les potagères et les fruitiers qui ne sont pas la cible de ces travaux. Les fiches non appariées restent en estimation signalée, et leur nombre sera compté.

Ce lot est le plus rentable du plan : deux sources et une règle de conversion traitent jusqu'à 452 champs estimés.

## Lot B, parfum

Volume : 97 intensités estimées à contrôler, 188 valeurs nulles laissées en estimation.

Marche à suivre. Résolution de l'adresse de la fiche espèce par recherche, lecture de la mention de parfum, comparaison à la valeur portée. Les contradictions sont corrigées, les concordances font passer la présence en valeur sourcée sans changer l'intensité.

Motif de ne pas traiter les 188 négations. Le contrôle de cohérence interne mené sur les fiches à parfum nul dont la catégorie laissait attendre le contraire n'a produit aucune contradiction. Les négations ne sont donc pas démontrablement fausses, et une intensité affirmée à tort trompe davantage le jardinier qu'une absence affirmée à tort.

## Lot C, conseils sur modèle générique

Volume : 659 conseils sur 1 700, soit 39 pour cent. Fertilisation 184, floraison 153, plantation 116, protection 90, taille 35, préparation du sol 24, récolte 23, abri 20, protection estivale 14 sur un texte unique.

Aucune source externe. La méthode est la dérivation depuis les colonnes structurées, validée sur la phase de protection où elle a fait apparaître trois défauts qu'un texte libre portait sans les signaler.

Marche à suivre par phase. Extraire les groupes partageant un texte. Qualifier chaque groupe : légitime quand l'ensemble est réellement homogène, et la raison de conservation est alors inscrite ; abusif quand une colonne structurée différencie les fiches, et le texte est scindé selon cette colonne. Les colonnes discriminantes sont connues, `fertility_need` pour la fertilisation, `planting_mode` et `depth_cm` pour la plantation, `habit` et `conduite` pour la taille, `flower_colors` et la période de floraison pour la floraison.

Ordre. Protection estivale d'abord, quatorze fiches sur un texte unique, en séparant l'ombrage des méditerranéennes de la protection contre la montée à graine des légumes-feuilles. Puis plantation, dont la consigne est la plus actionnable. Puis fertilisation, le plus gros volume mais le regroupement le plus solide. Puis les petits lots. Floraison en dernier, le conseil y étant descriptif.

## Lot D, seuils de gel

Volume : 50 fiches sans valeur, dont 6 vivaces où la colonne pilote le conseil de protection et la comparaison au climat, Ail, Échalote, Muflier, Pâquerette, Primevère et Scorsonère.

Marche à suivre. Zone de rusticité du Plant Finder, conversion par la borne inférieure, contrôle contre la classe `hardiness` déjà portée. Pour les 44 annuelles et bisannuelles, le seuil détermine la fin de culture et non la survie hivernale ; la notation du Royal Horticultural Society, plus fine dans la zone des faibles gelées, y est mieux adaptée.

## Lot E, durées semis-récolte

Volume : 25 lignes de calendrier sur 24 espèces.

Marche à suivre. Le guide de Penn State couvre déjà le panais à 110 jours, le salsifis à 115, le rutabaga à 90, le navet à 55 et l'endive à 90. Les fiches de culture du Royal Horticultural Society couvrent les espèces que la table omet, aromatiques et racines inhabituelles, et présentent l'avantage d'un climat océanique proche de la référence française.

Test. La durée retenue est appliquée à la période de récolte du référentiel et le semis obtenu doit retomber dans une fenêtre praticable, contrôle déjà employé pour les vingt et une espèces couvertes par le bulletin FAO 56. Un semis qui tombe en plein hiver ou après la récolte invalide la durée.

## Lot F, compléments bornés

Sensibilité à l'humidité hivernale, 13 candidates. Exotiques cultivées absentes de la flore de France, donc de baseflor. Le Plant Finder énonce l'exigence de drainage hivernal en clair.

Périodes de floraison, 4 fiches. Pâquerette, Luzule, Digitale et Laurier-tin, seules à ne porter aucune période de récolte, donc à échapper au contrôle de cohérence interne qui a tranché les six autres. Les fiches du Royal Horticultural Society donnent les mois de floraison en conditions océaniques. Le Laurier-tin n'est pas une contradiction mais un manque, sa floraison hivernale étant correcte et sa fin de floraison de mai et juin absente.

Groupes de cultivars, 3 fiches. Artichaut, Poireau et Pois mange-tout, où le désaccord entre GBIF et POWO porte sur le rang botanique d'un cultigène, question que la catégorie du groupe de cultivars rend sans objet. Le Plant Finder donne les noms de groupe, vérifié pour l'Artichaut et le Poireau.

Hivernage, 18 vivaces sans valeur. Dérivable de `foliage`, `frost_min_c` et `habit` pour les cas simples, une vivace herbacée rustique passant l'hiver en terre, avec contrôle sur la source pour les cas de mise à l'abri.

## Lot G, ce qui restera ouvert

Le Cléome. Le désaccord porte sur les limites du genre entre Cleome et Tarenaya, question botanique ouverte dans la littérature. Aucun arbitre indépendant de GBIF et de POWO n'est accessible. La fiche conserve son nom d'usage, les deux noms acceptés restent stockés, et le cas est déclaré non tranché plutôt que résolu par préférence.

L'intensité du parfum. Aucune base ne la cote systématiquement. Elle reste une estimation, et la seule action juste est de l'afficher comme telle.

Les fiches non appariées des lots A. Leur nombre sera connu après appariement et elles resteront en estimation signalée.

## Séquencement

| Ordre | Lot | Motif |
|---|---|---|
| 1 | E, durées semis-récolte | Referme le chantier de l'arrosage, 25 lignes, sources vérifiées |
| 2 | A, nectar et pollen | Meilleur rapport entre effort et volume, jusqu'à 452 champs |
| 3 | C, conseils génériques | Volume principal, le plus visible pour l'utilisateur, aucune dépendance |
| 4 | D, seuils de gel | Conditionne la justesse des conseils de protection restants |
| 5 | F, compléments bornés | Petits volumes, sources identifiées |
| 6 | B, parfum | Le plus long en appels par champ traité |

Les lots D et F peuvent avancer pendant le lot C, leurs colonnes étant disjointes.

## Journal d'exécution

### Lot E, durées semis-récolte, terminé le 29 juillet 2026

Vingt-trois espèces sur vingt-quatre sont passées de l'estimation à une source nommée, inscrite ligne par ligne dans `plant_phases.source`. Répartition : cinq depuis le guide de Penn State Extension, cinq depuis les fiches de culture du Royal Horticultural Society, treize depuis Plants For A Future.

Six fenêtres corrigées, la source contredisant la valeur déduite.

Le Fenouil bulbe est la correction la plus utile. La fenêtre déduite commençait en mai, alors que la source indique un semis en juin ou juillet seulement, une fois les températures réchauffées, un semis plus précoce provoquant la montée à graine. Fenêtre resserrée de mai à mi-juillet vers juin à mi-juillet.

Le Cerfeuil passait de février à mi-août, la source donnant un semis en pleine terre d'avril à août. Début reporté de février à avril, les semis plus précoces relevant de la phase sous abri.

La Bourrache passait de mi-mars à mi-août, la source donnant avril et mai. Fenêtre resserrée.

Le Souci passait de mi-mars à mi-août, la source donnant le printemps au début de l'été puis un second semis en septembre. Fenêtre resserrée et second semis ajouté.

Le Carvi passait d'avril à mai, la source donnant mars et avril, plus un semis de fin d'été à maturité des graines. Fenêtre décalée et second semis ajouté.

Le Pourpier gagne un mois, la source donnant un semis jusqu'à la fin de l'été.

Contrôle de praticabilité passé sur les six fenêtres corrigées : la durée de la source appliquée au semis retombe dans la période de récolte du référentiel.

Validation croisée obtenue au passage. Le guide de Penn State donne une durée jusqu'à maturité indépendante du bulletin FAO 56. Sur le Navet, la durée de 55 jours appliquée aux deux fenêtres de semis du référentiel replace exactement les deux périodes de récolte enregistrées, ce qui valide la méthode de déduction employée pour les vingt et une espèces couvertes par la FAO. Sur les cultures longues, la durée de Penn State est plus courte que la somme des stades FAO, écart attendu puisque la table 11 mesure jusqu'à la fin du plateau de pleine saison et non jusqu'à la première récolte, et puisque les durées de catalogue visent les variétés hâtives.

Reste une seule fenêtre estimée, celle de l'Immortelle. Plants For A Future n'a pas de contenu pour Xerochrysum bracteatum ni pour son synonyme Helichrysum bracteatum. La fiche reste déclarée en estimation.

Observation annexe à instruire. La période de récolte de l'Ortie court de mi-mars à septembre, alors que la source situe la cueillette des feuilles et jeunes pousses avant la floraison, du début à la fin du printemps. La phase de récolte de cette fiche est probablement trop large, mais elle sort du périmètre de ce lot.

### Lot C, conseils génériques, trois phases traitées le 29 juillet 2026

Constat général qui révise la lecture du chantier. La part de conseils partageant leur texte est passée de 39 à 37 pour cent, mais l'examen des modèles montre que cette mesure surestime le défaut. Un texte partagé entre des plantes réellement dans la même situation n'est pas un modèle abusif, c'est une consigne commune. Sur les quatorze modèles de protection, treize étaient légitimes. Sur les dix-huit de fertilisation, seize le sont. Sur les neuf de floraison, les neuf le sont.

Les défauts réels relèvent de deux formes seulement, et toutes deux sont détectables mécaniquement. Un texte qui nomme une espèce absente de son groupe ou qui se contredit pour celles qu'il nomme. Un texte qui omet une donnée que la fiche porte déjà.

#### Protection estivale, quatorze fiches, un texte unique remplacé par quatre

Le modèle prescrivait de pailler, d'ombrer aux heures chaudes et d'arroser au pied. Trois défauts. Il demandait d'ombrer des plantes déjà installées à mi-ombre ou à l'ombre, Hosta, Muguet, Fougère mâle et Hellébore. Il demandait d'ombrer des arbustes établis, ce qui n'est pas praticable. Il ne disait rien de la qualité de l'eau pour les plantes de sol acide, Myrtille, Airelle rouge et Canneberge, alors que le calcaire de l'eau du robinet remonte le pH et provoque une chlorose, cause la plus fréquente de leur échec au jardin.

Le texte est désormais dérivé de `soil`, `exposure` et `habit`, en quatre situations : sol acide, plante déjà à l'ombre, arbuste à racines superficielles, herbacée à grand feuillage. Aucune source externe n'a été nécessaire, les trois colonnes étaient renseignées.

#### Plantation, de 153 à 197 textes distincts

Les onze modèles étaient diagnostiquement corrects mais informativement pauvres : aucun n'énonçait l'espacement ni la profondeur de mise en place, alors que les deux figurent sur la fiche et sont les deux nombres attendus au moment de planter. Le plus large modèle couvrait 35 fiches dont les espacements allaient de 15 à 60 centimètres.

Chaque conseil de plantation porte maintenant l'espacement de sa fiche, la formule variant selon le port, entre deux sujets pour un ligneux et entre plants pour une herbacée, ainsi que la profondeur quand elle est positive. La mention de l'écart entre rangs est réservée aux légumes et aux aromatiques herbacées, la plantation en lignes n'ayant pas de sens pour une ornementale ou un fruitier. Le plus large modèle est tombé de 35 à 11 fiches, et les onze restantes sont onze vivaces de même espacement, ce qui est une consigne commune justifiée.

#### Fertilisation, deux modèles sur dix-huit corrigés

Les seize autres sont conservés, chacun portant un point agronomique juste et propre à son groupe : pas d'apport aux graminées qui versent en sol enrichi, engrais pauvre en azote juste après la floraison pour les bulbes tant que le feuillage est vert, jamais de fumier frais sur les racines qui fourchent, pas d'azote sur l'ail et l'oignon qui pourrissent en sol fumé, excès d'azote favorisant la tavelure sur les fruitiers à pépins et la gommose sur ceux à noyau, engrais de terre de bruyère et proscription des cendres sur les acidophiles.

Le contrôle de contradiction entre le texte et `fertility_need` n'a relevé que trois cas apparents, tous trois défendables après examen, dont le Noyer dont le besoin nul est cohérent avec un apport limité aux premières années.

Deux modèles étaient en revanche fautifs, de la même forme que celui de l'Hortensia relevé le matin.

Le modèle des neuf grimpantes citait la glycine et la bignone dans un texte adressé à neuf espèces dont sept ne sont ni l'une ni l'autre, et prescrivait un apport de compost tout en indiquant que ces plantes fleurissent mieux en sol pauvre, contradiction qui portait notamment sur la Bignone elle-même. Le texte est dérivé de `fertility_need`, sans apport pour les grimpantes à besoin faible.

Le modèle des douze aromatiques à feuillage tendre portait une comparaison de groupe adressée à chaque fiche individuellement, s'appliquait à l'Oseille qui est un légume, et donnait la même consigne à l'Ortie dont le besoin est fort. Le texte est dérivé de `fertility_need`, l'Ortie recevant un texte propre à son caractère nitrophile.

#### Contrôle mécanique final

Test appliqué à l'ensemble des 627 conseils partagés : recherche des textes citant le nom d'une plante de la base absente de leur propre groupe. Un seul résultat, la mention de l'hortensia commun dans le conseil de l'Hortensia grimpant et de l'Hortensia paniculé, qui est une comparaison délibérée et juste, la couleur de leurs fleurs ne dépendant pas du pH. Aucun défaut de cette forme ne subsiste.

#### État de la phase de conseil

| Phase | Conseils | Textes | Sur modèle | Plus gros groupe |
|---|---|---|---|---|
| Multiplication | 315 | 312 | 6 | 2 |
| Protection estivale | 14 | 4 | 13 | 6 |
| Abri | 62 | 44 | 20 | 17 |
| Récolte | 156 | 137 | 23 | 9 |
| Préparation du sol | 91 | 73 | 24 | 9 |
| Taille | 149 | 119 | 35 | 13 |
| Plantation | 258 | 197 | 80 | 11 |
| Protection | 172 | 105 | 90 | 20 |
| Floraison | 215 | 72 | 153 | 40 |
| Fertilisation | 250 | 87 | 183 | 28 |

Les deux phases aux compteurs les plus élevés, floraison et fertilisation, sont celles dont les modèles ont été jugés légitimes. Leur mesure élevée traduit des consignes réellement communes, pas un défaut à corriger.

### Lot A, nectar, résultat négatif sur la conversion

Le fichier de Tew et al. 2023 a été apparié au référentiel. Soixante-quatorze fiches trouvent leur binôme dans le jeu de données, soixante autres n'ont qu'une correspondance de genre, jugée trop faible pour être retenue, et cent quatre-vingt-une sont absentes, le jeu portant sur la flore de jardin britannique.

Le test de validation prévu au plan a été exécuté sur les cinquante-trois fiches appariées dont la valeur de nectar était déjà sourcée, valeurs qui n'ont pas servi à établir les seuils. **Il échoue.** Corrélation de rang de Spearman de 0,107, soit une absence de relation. Concordance exacte d'un découpage par quartiles de 34 pour cent, à peine au-dessus du hasard pour quatre classes. Et surtout, les médianes mesurées par classe du référentiel sont inversées : les plantes notées fort mesurent 423 microgrammes contre 530 pour celles notées moyen.

La cause est identifiée et se lit dans les métadonnées du jeu de données. L'unité florale retenue est la fleur seule pour la quasi-totalité des taxons, la variable mesure donc du sucre par fleur et par vingt-quatre heures. La colonne du référentiel, issue de références apicoles, est une appréciation qui intègre le nombre de fleurs portées et la durée de floraison. Ce sont deux grandeurs différentes, comme la floraison de baseflor et celle du jardin. Les désaccords le confirment : Menthe, Hysope, Sauge des bois, Népéta, Véronique en épis, Solidage et Romarin sont toutes notées fort par les apiculteurs et mesurent bas par fleur, ce qui est le profil d'une Lamiacée à nombreuses petites fleurs sur une longue saison.

Décision. La colonne `nectar` n'est pas convertie. La mesure est stockée dans sa propre colonne, `plants.nectar_ug_fleur`, dont le commentaire porte la citation complète et le DOI. Soixante-quatorze valeurs chargées, de zéro pour l'Anémone et le Bégonia à 8 249 microgrammes pour le Fuchsia rustique.

Trois corrections en revanche sont fondées. L'Anémone du Japon, l'Anémone blanda et le Bégonia des jardins sont mesurés à zéro sur dix fleurs chacun, ce qui est un fait et non une appréciation, et concorde avec la biologie florale de ces genres, dépourvus de nectaires et à récompense uniquement pollinique. Leur nectar passe de moyen à nul, leur saison nectarifère est effacée, et leur pollen reste à moyen, ce qui est correct. La citation est portée dans `source`.

Huit autres cas de mesure basse ne sont pas corrigés, la mesure étant faible mais non nulle et ne suffisant pas à conclure : Hortensia à 0,71, Pois de senteur à 6,6, Menthe à 9,3, Viorne d'hiver à 14,7, Kerria à 30,6, Hortensia paniculé à 34,3, Jacinthe à 36,7, Perce-neige à 40,5. Le cas de l'Hortensia commun mérite un examen, la note du jeu de données signalant que le rapport entre fleurs stériles et fertiles est déterminant, et les fleurs de tête d'hortensia étant stériles.

### Lot A, pollen, même résultat négatif, et le lot est clos

Le jeu AgriLand de Baude et ses coauteurs, 168 espèces avec un volume de pollen mesuré, a subi la même validation. Elle échoue de la même façon. Corrélation de rang de Spearman de 0,168. Et l'inversion des médianes est encore plus marquée que sur le nectar : les fiches notées faible mesurent 1,03 milliard de micromètres cubes par fleur, contre 831 millions pour celles notées fort.

Le mécanisme se lit dans un cas qui ne laisse aucun doute. Le Noisetier et le Châtaignier occupent les deux dernières places du classement mesuré, et sont notés fort par le référentiel. C'est le référentiel qui a raison : ce sont des espèces à chatons, anémogames, portant des milliers de fleurs minuscules, et le noisetier est la ressource pollinique majeure de février quand rien d'autre ne fleurit. Par fleur ils ne valent rien, par arbre ils constituent une masse. Une mesure par fleur ne peut pas rendre cela.

Aucune correction n'est possible ici, à la différence du nectar. Aucun taxon apparié n'est mesuré à zéro, la valeur la plus basse étant l'Aspérule odorante à 1,3 million. Une valeur basse ne réfute rien, le cas du Noisetier le démontre.

La couverture est de surcroît faible : 36 fiches appariées seulement, et aucun recouvrement avec les 74 fiches du jeu nectar. Les deux jeux portent sur des flores disjointes, ornementales de jardin britanniques d'un côté, flore sauvage britannique de l'autre.

Les 36 valeurs sont chargées dans `plants.pollen_um3_fleur`, avec la citation et le DOI dans le commentaire de colonne.

### Conséquence sur le plan

Le lot A est clos, et il ne referme pas la dette d'estimation qu'il devait traiter. Deux jeux de données indépendants, deux mesures indépendantes, le même échec de validation avec la même inversion des médianes : la répétition écarte l'accident et établit le diagnostic. Les colonnes `nectar` et `pollen` du référentiel sont des appréciations apicoles qui intègrent le nombre de fleurs portées et la période de floraison, grandeurs qu'aucune mesure par fleur ne contient.

Les 452 champs estimés sur le nectar et le pollen ne seront donc pas sourcés par des jeux quantitatifs. Il leur faut une source qui note les plantes sur la même base, c'est-à-dire une référence apicole, listes de plantes mellifères et pollinifères des associations et des instituts apicoles. C'est une recherche différente de celle menée jusqu'ici, à inscrire au plan.

Le gain du lot n'est pas nul pour autant. Cent dix fiches portent désormais une mesure citée qu'elles n'avaient pas, dans deux colonnes distinctes de l'appréciation. Trois erreurs de nectar ont été corrigées sur la foi d'un zéro mesuré. Et la méthode de validation a fait son travail, deux fois, en empêchant deux conversions fausses.

### Lot C, suite, enrichissement des conseils par les données de la fiche

Méthode validée sur la plantation et étendue à quatre autres phases. Le principe est le même : le conseil est correct mais il omet une donnée que la fiche porte déjà, et l'ajouter le rend à la fois plus utile et plus distinct.

Floraison, l'apport le plus important. Deux cent quinze conseils décrivaient la floraison sans jamais dire ce qu'elle vaut pour les butineurs, alors que les colonnes `nectar`, `pollen`, `nectar_season` et `fragrance` sont renseignées sur la totalité des fiches concernées. Chaque conseil porte désormais la ressource offerte, nectar seul, pollen seul, les deux ou aucune, complétée de la saison quand elle est précoce, tardive ou hivernale, et de la mention du parfum. Le Noisetier en est le meilleur exemple : son conseil dit maintenant qu'il offre du pollen et pas de nectar, et que la ressource est précoce, utile à la sortie de l'hiver quand les colonies redémarrent. C'est exactement ce que la mesure quantitative ne savait pas voir le matin même.

Un rattrapage a été nécessaire. Le premier passage écartait les conseils contenant le mot pollinisation, ce qui a exclu à tort les espèces anémogames dont le texte décrit le vecteur et non l'intérêt pour les butineurs. Le Noisetier en faisait partie.

Fertilisation, ajout du niveau de besoin et de sa conséquence pratique, repris de `fertility_need`, sur les conseils qui ne le mentionnaient pas.

Préparation du sol, ajout de la nature de sol attendue, reprise de `soil`, sur les soixante-dix-huit conseils qui ne la donnaient pas.

Récolte, ajout du délai avant la première récolte pour les trente-deux fiches dont `first_harvest_year` dépasse un an. Le Noyer indique maintenant six années après la plantation, information que le conseil ne portait nulle part.

Phase écartée après vérification. La phase `abri` désigne le semis sous abri et non la mise à l'abri hivernale, ce que la lecture des textes a confirmé. Le seuil de gel n'y a donc pas sa place, et l'enrichissement envisagé aurait posé une affirmation fausse sur cinquante et une fiches.

Bilan de la phase de conseil sur la journée. Textes distincts de 1 150 à 1 208, conseils partageant leur texte de 39 à 35 pour cent, et surtout le plus large modèle de la base de 40 à 20 fiches, ce dernier étant le groupe des légumes-feuilles rustiques à moins cinq degrés, jugé légitime.

## Règles de travail

Toute écriture de contenu passe par le journal avec son motif.

Toute valeur produite porte sa référence et sa date, ou la mention explicite d'estimation. Aucune valeur intermédiaire.

Toute règle de conversion est écrite avant d'être appliquée, et validée sur un jeu de valeurs déjà sourcées qui n'a pas servi à l'établir.

Tout appariement de noms passe par la fonction de normalisation déjà utilisée pour la confrontation à GBIF, qui neutralise les marques de rang et d'hybridité.

Chaque lot se termine par un recomptage en base et la mise à jour de la note de projet correspondante.
