# Journal de sourçage du 30 juillet 2026

Suite du `claude/plan-finalisation.md`.

## Lot B, parfum

Source retenue, le Plant Finder du Missouri Botanical Garden, dont les fiches portent des lignes d'attributs `Flower` et `Leaf` où la mention `Fragrant` est cochée explicitement. La présence et l'organe se lisent donc directement, sans conversion.

Relevé mené sur 185 taxons, chaque fiche étant atteinte par résolution de l'identifiant de taxon puis lecture de la page de détail.

Résultat sur les 97 fiches portant une intensité de parfum affirmée et estimée :

| Cas | Fiches | Traitement |
|---|---|---|
| Présence confirmée, organe concordant | 53 | Présence et organe passés en valeur sourcée |
| Présence confirmée, organe divergent | 3 | Instruits un par un |
| Source muette sur le parfum | 27 | Laissés en estimation |
| Taxon absent du Plant Finder | 14 | Laissés en estimation |

Les trois divergences d'organe. L'Ail d'ornement était noté sur la fleur, la source coche le feuillage et précise que les feuilles et les hampes sentent l'oignon au froissement, la fleur n'étant pas notée odorante : corrigé en feuillage. L'Aneth était noté sur le feuillage, la source coche la fleur mais son texte décrit aussi des feuilles aromatiques : les deux organes sont odorants, la valeur du référentiel est conservée. La Valériane rouge était notée sur la fleur, la ligne d'attribut coche le feuillage mais le texte de la même page énonce que les fleurs sont odorantes : la valeur du référentiel est conservée, la phrase l'emportant sur l'attribut.

Le silence de la source n'est pas traité comme une contradiction. Le Plant Finder ne coche pas systématiquement l'attribut : il laisse le Buis, la Rue officinale, le Poireau, l'Oignon et la Tomate sans mention alors que leur caractère aromatique n'est pas discutable. Les 27 fiches concernées restent donc en estimation.

Écriture. Sur les 54 fiches traitées, la mention `parfum` de la liste d'estimation est remplacée par `intensité du parfum`, et un segment distinct porte la présence et l'organe avec l'identifiant de taxon. La colonne d'intensité n'est pas touchée : aucune base ne la cote, elle reste une estimation signalée.

## Lot F, feuillage

Même relevé, champ `Type` de la fiche du Plant Finder. Il n'énonce la persistance que pour les arbustes et arbrisseaux, sous la forme `Deciduous shrub` ou `Broadleaf evergreen`. Pour les catégories `Fruit`, `Tree`, `Vine`, `Ornamental grass` et `Herbaceous perennial`, la persistance n'est pas imprimée.

Vingt et une fiches sur soixante-trois passent en valeur sourcée. Trente-cinq restent sans réponse faute de mention, cinq n'ont pas été relevées, deux divergent.

Les deux divergences relèvent du climat et non de l'erreur. Le Chèvrefeuille grimpant est donné caduc par le Plant Finder, qui décrit le comportement à Saint-Louis, en climat continental ; le référentiel le donne semi-persistant, ce qui est la lecture juste en climat océanique. Le Thunbergia est donné persistant par la source, ce qui vaut dans son aire d'origine ; au jardin français il est détruit à la première gelée. Les deux valeurs du référentiel sont conservées.

Le champ `Foliage` des fiches d'espèce du Royal Horticultural Society a servi de seconde passe sur les quarante-deux fiches restantes. Le chantier est clos, voir `claude/pic-de-floraison-et-controles-croises.md`.

## Lot D, seuils de gel

### Voie de la zone de rusticité, testée et écartée

Le plan prévoyait de convertir la zone de rusticité du Plant Finder en degrés par la borne inférieure de la zone la plus froide annoncée. La règle a été mesurée sur trente et une fiches dont `frost_min_c` est déjà renseigné.

| Sous-ensemble | Fiches | Biais | Écart absolu moyen | Écart type |
|---|---|---|---|---|
| Annuelles et plantes gélives | 6 | moins 30,7 | 30,7 | 19,3 |
| Vivaces et ligneux | 25 | moins 11,2 | 11,5 | 6,3 |

Écartée. Sur les annuelles, la zone n'est pas un seuil de gel : elle indique où la plante peut être cultivée en saison, le Basilic étant donné de la zone 2 à la zone 11 alors qu'il est détruit à plus 4 degrés. Sur les vivaces, un décalage constant de onze degrés laisserait encore une erreur typique de six degrés, supérieure au pas de l'échelle du référentiel.

Le contrôle prévu au plan est également revu. Contrôler la valeur produite contre la classe `hardiness` ne discrimine pas, les classes se recouvrant de moins 35 à moins 15 pour très rustique et de moins 25 à moins 12 pour rustique. Le contrôle retenu ne porte donc que sur la borne chaude : une valeur plus chaude que la borne haute de la classe est une contradiction, une valeur plus froide que toutes les valeurs déjà enregistrées n'en est pas une.

### Voie retenue pour les cultures potagères

Source : Winter-Kill Temperatures of Cold-Hardy Vegetables, relevé de terrain de Pam Dawling, Twin Oaks Community, Virginie centrale, révision 2025. Température de destruction publiée culture par culture et variété par variété.

Règle de conversion : médiane des températures publiées pour la culture, convertie en degrés Celsius et arrondie à l'unité.

Validation sur les fiches potagères dont `frost_min_c` est déjà renseigné :

| Cycle | Fiches | Biais | Écart absolu moyen | Écart type |
|---|---|---|---|---|
| Annuelle | 16 | moins 0,88 | 1,00 | 1,93 |
| Bisannuelle | 3 | moins 0,33 | 3,67 | 3,86 |
| Vivace | 10 | plus 2,50 | 2,90 | 4,30 |

La règle passe sur les annuelles et échoue sur les vivaces, et le mécanisme est lisible. La Ciboulette, le Raifort et le Topinambour portent les trois plus grands écarts, de plus 7 à plus 12 degrés : la source mesure la destruction du feuillage, le référentiel enregistre la survie de la souche ou du tubercule. La règle n'est donc appliquée qu'aux cultures dont la vie utile s'arrête avec le feuillage.

L'Ail et l'Échalote sont inclus bien que le référentiel les classe en vivaces : plantés à l'automne et récoltés l'été suivant, leur seuil pertinent est la tolérance du feuillage hivernant, qui est ce que la source mesure.

Résultat. Trente et une valeurs produites, vingt écrites, onze retenues parce qu'elles sont plus chaudes que la borne haute de la classe portée par la fiche : Cerfeuil, Chou cabus, Chou de Bruxelles, Chou rouge, Endive, Fève, Mizuna, Poireau, Radis, Roquette et Rutabaga. Sur ces onze, la source et la classe se contredisent sans qu'il soit possible de dire laquelle est en défaut, l'examen faisant plutôt apparaître des classes trop généreuses. Elles demandent une seconde source avant écriture.

Le nombre de fiches sans seuil de gel passe de cinquante à trente. La contradiction apparente entre source et classe a été instruite ensuite et s'explique par une confusion d'échelle, voir `claude/pic-de-floraison-et-controles-croises.md`.

## Lot A, nectar et pollen, rouvert et clos

Le lot avait été clos le 29 juillet sur un échec, deux jeux de mesures par fleur ne s'accordant pas avec les classes du référentiel. La reprise a porté sur des sources de même nature que la colonne, c'est-à-dire des notations apicoles.

Résultat principal. La table du Centre technique horticole de Gembloux reproduit les valeurs sourcées du référentiel à 95 pour cent en nectar et 100 pour cent en pollen, pour une corrélation de rang de 0,953 et 0,964. La convention du référentiel sur ces deux colonnes est celle de Gembloux, avec la correspondance zéro donne nul, un et deux donnent faible, trois donne moyen, quatre et cinq donnent fort.

Le catalogue Trachtpflanzen de Bienenroute a été recalibré, sa note trois donnant moyen et non fort. La table Bienenweiden de Hortipendium a été écartée pour l'écriture, sa colonne pollen mesurant le rendement pour la colonie et plaçant la Courgette, la Digitale et la Pâquerette au niveau nul.

Cinquante-deux valeurs écrites sur trente-quatre fiches. Le nectar est à 146 fiches sourcées, le pollen à 86. Les trois tables sont épuisées.

Ces deux nombres corrigent une mesure erronée publiée dans une version antérieure de ce journal, qui annonçait 125 et 54. Le décompte reposait sur un motif de recherche large qui traversait les segments de `plants.source` et comptait comme estimée toute fiche dont la liste d'estimations contenait un mot commençant par la même racine. Le prédicat exact borne désormais la recherche à l'intérieur du seul segment d'estimation.

Le détail est dans `claude/caractere-mellifere-sources-apicoles.md`.

### Incident d'extraction, et contrôle qui en découle

La table de Gembloux imprime ses colonnes dans l'ordre Pollinifère puis Nectarifère. Une réextraction du 30 juillet les a lues dans l'ordre inverse, ce qui produisait une absence de correspondance interprétée comme une incompatibilité entre la table et la base.

L'erreur a été détectée en comparant les deux catalogues entre eux et non à la base : deux tables apicoles ne peuvent pas être décorrélées, or la mesure donnait 0,018 en nectar et moins 0,103 en pollen. Après remise des colonnes dans l'ordre, 0,489 et 0,440.

Contrôle désormais appliqué avant tout usage d'une table nouvelle ou réextraite, sur cinq espèces dont le comportement n'est pas discutable : Saule marsault, nectar et pollen abondants ; Noisetier et Coquelicot, sans nectar et riches en pollen ; Thym et Lavande, riches en nectar et pauvres en pollen.

L'extraction du 28 juillet respectait l'ordre des colonnes, les onze valeurs citées dans les arbitrages de cette date se retrouvant à l'identique dans le fichier corrigé. Les écritures antérieures ne sont pas affectées.

## Lot F, compléments bornés

### Groupes de cultivars, trois fiches, traité

Colonne `plants.groupe_cultivars` ajoutée, portant le nom de Groupe au sens du Code international de nomenclature des plantes cultivées. La colonne `latin` reste inchangée.

| Fiche | Groupe retenu | Sources |
|---|---|---|
| Artichaut | Cynara cardunculus (Scolymus Group) | Royal Horticultural Society fiche 56390, Plant Finder du Missouri taxon 271486, Plant Toolbox de North Carolina State Extension |
| Poireau | Allium ampeloprasum (Porrum Group) | Plant Finder du Missouri taxon 358438, publication HS620 du service d'extension de l'université de Floride |
| Pois mange-tout | Pisum sativum (Macrocarpon Group) | Publications HS642 et HS643 du service d'extension de l'université de Floride |

Le Cléome reste ouvert, les limites entre Cleome et Tarenaya faisant toujours l'objet de réorganisations dans la littérature. Aucun arbitre indépendant de GBIF et de POWO n'est disponible.

### Périodes de floraison, quatre fiches, traité

Sourcées sur baseflor, seule source donnant des mois explicites pour la flore de France, puis contrôlées sur la fiche d'espèce du Royal Horticultural Society.

| Fiche | Avant | Après | Contrôle du Royal Horticultural Society |
|---|---|---|---|
| Pâquerette | février à juin | mars à novembre | Fin du printemps et été, compatible |
| Digitale | mai à juillet | mai à septembre | Été, compatible |
| Luzule | avril à mai | juin à août | Début et milieu de l'été, confirme |
| Laurier-tin | janvier à avril, plus octobre à décembre | janvier à juin, plus octobre à décembre | Fin de l'hiver et printemps, confirme |

La Luzule est la correction la plus nette, les deux sources externes plaçant la floraison en été quand la base la donnait au printemps. Le segment automnal du Laurier-tin est conservé et documenté comme propre aux formes cultivées.

### Hivernage, dix-huit vivaces, arbitrage à rendre

Le vocabulaire à trois valeurs, en terre, arraché et rentré, ne couvre pas le cas majoritaire. Huit fiches sont des légumes gélifs conduits en annuelle au jardin, Aubergine, Piment, Poivron, Tomate, Physalis, Fenouil bulbe, Haricot d'Espagne et Marjolaine, qui ne sont pas hivernés du tout ; pour elles l'absence de valeur est la représentation juste. Restent dix fiches où une valeur est dérivable, sous réserve d'une décision sur le sens de la colonne pour les bulbes de culture annuelle.

## Corrections de forme

Trois fiches, Anémone blanda, Anémone du Japon et Bégonia des jardins, portaient la citation de Tew et al. à l'intérieur de la liste des estimations au lieu d'un segment distinct. Corrigé.

Dix fiches portaient deux mentions de source apicole séparées, une par champ. Fusionnées.

## Outillage ajouté

`public.sans_estimation(source text, champ text)` retire un champ de la liste des estimations portée par `plants.source` et supprime le segment lorsque la liste devient vide.

`plants.groupe_cultivars`, nom de Groupe de cultivars pour les cultigènes.

## Suite

La suite de ces travaux, menée le même jour, est consignée dans `claude/pic-de-floraison-et-controles-croises.md` : sourçage du pic de floraison sur les observations TEMPO, clôture du chantier feuillage, écriture des seuils de gel restés en attente, et deux nouveaux contrôles de cohérence.

Reste ouvert à l'issue de ces travaux : vingt fiches sans seuil de gel, presque toutes des ornementales annuelles pour lesquelles aucune source ne publie de température de destruction ; l'intensité du parfum, hors de portée de toute source ; le Cléome et sa position générique.
