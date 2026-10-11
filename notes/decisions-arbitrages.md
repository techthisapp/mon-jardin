# Décisions sur les sept points d'arbitrage

Chaque décision est adossée soit à une source nommée, soit à un croisement entre référentiels, soit à une vérification menée sur les données de la base. Les décisions qui n'ont pu être fondées ainsi ne sont pas prises et restent listées comme telles.

## 1. Fenêtres de semis par climat

Décision : aucune ligne par climat à créer. Le mécanisme existe déjà.

Vérification. La table `climate_phase_shifts` porte un décalage pour la phase de semis sur les cinq climats : moins deux et plus deux quinzaines en méditerranéen, moins une et plus une en océanique, aucun décalage sur le climat de référence, plus une et moins une en semi-continental, plus deux et moins deux en montagnard. Les cinquante lignes ajoutées, sans climat, reçoivent donc le décalage par ce mécanisme.

Second contrôle, sur la nature des 446 lignes climat-spécifiques. Cinq fiches portent à la fois une ligne neutre et des lignes par climat pour la même phase. L'Abricotier passe de janvier à mars en neutre, à octobre-décembre en climat doux et à mars-avril en climat froid. Aucun décalage de quinzaines ne produit ce résultat : ces lignes expriment une saison de plantation différente, pas un décalage. Elles sont des exceptions au mécanisme, non son application.

Créer des lignes par climat pour les cinquante fenêtres aurait donc dupliqué un mécanisme en place et inventé des dates qu'aucune source ne donne.

## 2. Rédaction des conseils

Décision : gabarit dérivé des colonnes structurées par défaut, texte propre par exception documentée.

Vérification. La correction du modèle de protection a été menée par dérivation de `frost_min_c`, `habit` et `foliage`. Elle a fait apparaître trois défauts qu'un texte rédigé à la main portait sans que rien ne les signale : une consigne de protection sur des plantes rustiques à moins vingt-cinq degrés, une mention de feuillage persistant sur des plantes caduques, et un paillage présenté comme une protection contre le froid sur la Fraise alors qu'il sert à tenir les fruits hors de la boue.

Le critère retenu est la vérifiabilité. Un texte dérivé se recalcule et se compare, un texte libre ne se contrôle qu'à la lecture. Le premier permet de détecter une incohérence entre le conseil et la donnée, le second l'enterre.

L'exception reste ouverte quand la situation ne se lit dans aucune colonne, cas de la Fraise, et elle est alors inscrite comme telle.

## 3. Séparation des risques hivernaux

Décision : scinder. Appliqué.

Vérification par contradiction interne. Vingt-trois fiches présentent un niveau d'adaptation non monotone avec la rigueur du climat, notées en protection sur la façade atlantique et adaptées dans le bassin parisien pourtant plus froid. Si `plant_climates.level` était une échelle de résistance au froid, cette configuration serait impossible. Elle est pourtant correcte : les notes de ces fiches disent explicitement que Thym, Lavande, Romarin, Sauge officinale et Fétuque bleue craignent l'humidité hivernale et non le gel. La colonne portait donc deux grandeurs incompatibles dans une seule échelle.

Application. Nouvelle colonne `plants.humidite_hivernale`, propriété de l'espèce et non du climat. Neuf fiches à vrai, extraites des notes déjà présentes dans la base : Céanothe, Fétuque bleue, Hysope, Lavande, Romarin, Sarriette vivace, Sauge officinale, Stipa cheveux d'ange, Thym. Le niveau d'adaptation redevient une appréciation du froid seul, dérivable de `frost_min_c` et des minima par climat.

Candidates. Trente-sept fiches réunissent besoin en eau faible et sol pauvre drainé, dont dix-huit vivaces sans statut au moment de la décision. Leur traitement est décrit plus bas, à la section de résolution : la chorologie de baseflor en tranche neuf, cinq en sensibles et quatre en non sensibles, et neuf restent à sourcer.

## 4. Portée de la colonne de pollinisation

Décision : renseigner la dioécie, qui est sourcée dans la base. Ne pas étendre à l'autofertilité. Appliqué pour la partie sourcée.

Source. Le champ `sexualite` de baseflor est présent sur 169 fiches actives, sous la plume de Philippe Julve. Il donne 149 hermaphrodites, huit dioïques, sept monoïques, trois gynodioïques, une androdioïque et une polygame.

Application. Les huit espèces dioïques portent maintenant la valeur correspondante, source baseflor : Argousier, Asperge, Épinard, Houblon doré, If, Laurier-sauce, Ortie, Oseille. La colonne n'est plus limitée aux fruitiers, et l'extension n'ajoute aucune donnée nouvelle, elle exploite une source déjà présente sur la fiche.

Ce qui n'est pas fait, et pourquoi. Les 149 hermaphrodites de baseflor ne peuvent pas être versées en autofertile. L'hermaphrodisme décrit la structure de la fleur, l'autofertilité décrit la compatibilité du pollen avec son propre pistil. Les deux sont indépendants : les cultivars de pommier et de poirier sont hermaphrodites et pour la plupart auto-incompatibles, ce qui est précisément la raison d'être de la colonne. Les verser en autofertile aurait produit une erreur de masse sur les fruitiers.

Les trois gynodioïques, Achillée, Origan et Pâquerette, et l'androdioïque, Panais, ne demandent pas de second sujet, leurs populations comportant des individus hermaphrodites. Elles restent sans valeur.

## 5. Écarts de floraison face à baseflor

Décision : ne pas aligner. Les deux valeurs coexistent déjà et décrivent deux objets différents.

Vérification. Baseflor décrit la floraison des populations spontanées de France. Le référentiel décrit le comportement au jardin de plantes le plus souvent cultivées, sélectionnées, parfois hors de leur aire naturelle. Ce ne sont pas deux mesures de la même grandeur, un écart n'est donc pas une erreur, et l'alignement serait une erreur de catégorie.

La valeur baseflor est déjà stockée dans la charge jsonb `baseflor`, champ `floraison`, sur 87 fiches actives. Les deux périodes sont donc conservées sans travail supplémentaire, et rien n'est perdu.

Ce qui reste à contrôler. Les dix écarts larges, où la période de la base et celle de baseflor ne se recouvrent presque pas : Goji, Pâquerette, Baie de mai, Luzule, Laurier-tin, Digitale, Houblon doré, Pomme de terre, Statice, Argousier. Un écart de cinq mois relève plus probablement d'une erreur de la base que d'un effet de sélection horticole, ce qui justifie un contrôle fiche par fiche sur une source horticole. Les vingt-six écarts d'un ou deux mois sont dans la marge attendue entre plante sauvage et plante cultivée.

## 6. Champ parfum

Décision : pas de campagne sur les 285 fiches. Sourcer les 97 affirmations positives estimées, laisser les négations en estimation signalée.

Test de faisabilité de la source. Le Plant Finder du Missouri Botanical Garden est accessible et énonce le parfum espèce par espèce, ainsi que la zone de rusticité. Le test sur Artemisia Powis Castle rend la mention du feuillage aromatique et la zone 6 à 9. Deux limites relevées. La mention est descriptive, elle soutient la présence du parfum et l'organe porteur, pas une intensité sur quatre niveaux. Et l'accès à une fiche demande un code interne, la recherche par nom n'ayant pas répondu, ce qui impose une étape de résolution par espèce.

Test de cohérence interne. Aucune contradiction. Les huit fiches à parfum nul dont la catégorie ou l'usage laissait attendre le contraire sont toutes défendables : la bourrache, la consoude, l'ortie, le stévia, le raifort, la capucine tubéreuse, la ficoïde et le physalis ne sont pas des plantes odorantes, la catégorie Aromatiques du référentiel désignant les plantes condimentaires et non les plantes parfumées. Les 188 valeurs nulles ne sont donc pas démontrablement fausses.

Raisonnement sur le coût d'erreur. Une intensité affirmée à tort trompe le choix de la plante par le jardinier. Une absence de parfum affirmée à tort masque une qualité sans induire en erreur sur ce qui est annoncé. La priorité va donc aux 127 fiches portant une intensité, dont 97 sont des estimations, et non aux 188 négations.

Conséquence sur le modèle. L'échelle à quatre niveaux n'est pas sourçable en l'état, aucune base ne cotant l'intensité. Elle est conservée, et l'application doit afficher la provenance de la valeur plutôt que la présenter comme un fait établi.

## 7. Nomenclature

Décision : ne pas modifier la colonne `latin`. Classer les 41 fiches non acceptées par GBIF selon l'accord des trois référentiels. Appliqué.

Règle appliquée, fondée sur le croisement et non sur une préférence.

Quand Tela Botanica confirme le nom de la base contre GBIF, le nom est conservé et la divergence est propre à GBIF. Vingt-deux fiches, dont treize taxons infraspécifiques cultivés que GBIF rabat sur l'espèce, les variétés de Brassica oleracea, de Brassica rapa, de Cichorium endivia, d'Apium graveolens, d'Allium cepa et de Raphanus sativus, et neuf noms d'espèce confirmés par la flore de France, dont l'Abélia, le Néflier du Japon, l'Œillet d'Inde et le Mûrier platane.

Quand GBIF et POWO convergent vers un autre nom accepté, ce nom est déjà stocké dans `powo_accepted_name` et le nom d'usage reste à l'affichage. Treize fiches, dont l'Anémone du Japon vers Eriocapitella hupehensis, le Pois vers Lathyrus oleraceus, la Lentille vers Vicia lens, la Scorsonère vers Pseudopodospermum hispanicum, le Pennisetum vers Cenchrus alopecuroides et la Potentille arbustive vers Dasiphora fruticosa.

Quand la divergence porte sur la seule marque d'hybride, il n'y a pas de divergence de nom. Deux fiches, le Dahlia et le Dahlia cactus, où GBIF et POWO donnent tous deux Dahlia hortensis.

Quand GBIF et POWO divergent entre eux, le cas est marqué à vérifier. Quatre fiches seulement : l'Artichaut, où GBIF donne Cynara scolymus et POWO Cynara cardunculus subsp. cardunculus ; le Cléome, Tarenaya houtteana contre Cleome houtteana ; le Poireau, Allium ampeloprasum contre Allium porrum ; le Pois mange-tout, Pisum sativum subsp. macrocarpon contre Lathyrus oleraceus.

Le classement est inscrit dans `powo_note`. Le travail restant passe de trente-neuf noms à quatre.

Motif du maintien de `latin`. Le nom accepté est déjà stocké dans trois colonnes distinctes selon le référentiel. Remplacer le nom d'usage n'ajouterait aucune information, casserait la continuité des identifiants et présenterait au jardinier un nom qu'aucun catalogue horticole n'emploie.

## Récapitulatif des applications

| Point | Décision | État |
|---|---|---|
| 1 | Aucune ligne par climat, le mécanisme de décalage existe | Vérifié, rien à écrire |
| 2 | Gabarit dérivé par défaut | Retenu, appliqué au lot 1 |
| 3 | Colonne distincte pour l'humidité hivernale | Appliqué, 9 fiches renseignées |
| 4 | Dioécie depuis baseflor, pas d'extension à l'autofertilité | Appliqué, 8 fiches |
| 5 | Pas d'alignement sur baseflor | Retenu, 10 écarts larges à contrôler |
| 6 | Sourcer les 97 intensités affirmées, pas les 188 négations | Retenu, campagne à mener |
| 7 | Classement par accord des référentiels, `latin` inchangé | Appliqué, 41 fiches classées |

## Résolution des points non fondés

Deux des cinq points se règlent sans source externe, par croisement à l'intérieur de la base. Les trois autres demandent une source nommée, et la voie d'accès a été testée pour chacun.

### Sensibilité à l'humidité hivernale, résolue pour la moitié des candidates

Le champ `chorologie` de baseflor donne l'aire de répartition de chaque espèce. Croisé avec le besoin en eau faible et l'exigence de sol drainé, il discrimine les candidates. Une espèce de répartition méditerranéenne ou méridionale cultivée en climat océanique subit un hiver plus humide que celui de son aire ; une espèce eurasiatique ou atlantique non.

Appliqué. Cinq candidates reçoivent la valeur vraie sur ce critère : Euphorbe des jardins et Stachys laineux, méditerranéens, Marjolaine, méditerranéen oriental, Népéta, orophyte méridional, Rue officinale, européen méridional. Le total passe de neuf à quatorze fiches.

Écartées par le même critère : Absinthe, Achillée et Origan, eurasiatiques, et Camomille romaine, atlantique, dont l'aire naturelle inclut déjà des hivers humides.

Restent neuf candidates sans chorologie renseignée, toutes exotiques cultivées absentes de la flore de France, donc absentes de baseflor : Ail d'ornement, Caryoptéris, Coréopsis, Iris des jardins, Nérine, Pavot d'Orient, Sauge des bois, Sedum d'automne. Pour elles, la source est la fiche d'espèce du Royal Horticultural Society ou du Missouri Botanical Garden, qui énonce l'exigence de drainage hivernal.

### Écarts larges de floraison, résolus pour six sur dix

La cohérence interne suffit quand la fiche porte une période de récolte : la floraison doit précéder la récolte d'un intervalle plausible. Ce contrôle tranche six cas sans recours à une source externe.

La Baie de mai est le cas décisif. La base donne une floraison de mars à avril et une récolte de mai à juin. Baseflor donne une floraison de mai à juillet, ce qui placerait la floraison pendant et après la récolte. C'est impossible pour la plante cultivée : la base est juste, baseflor décrit les populations subalpines spontanées.

Quatre autres cas sont des envelopes et non des contradictions, la période de la base étant contenue dans celle de baseflor et cohérente avec sa propre récolte : Argousier, floraison en avril et fruits en septembre-octobre ; Goji, floraison de juin à août et fruits d'août à octobre ; Houblon doré, floraison d'août à septembre et cônes d'août à octobre ; Pomme de terre, floraison de juin à juillet et récolte de juillet à septembre. Le Statice porte une floraison et une récolte identiques, ce qui est correct pour une fleur à couper.

Restent quatre cas sans période de récolte, donc sans contrôle interne possible : Pâquerette, Luzule, Digitale et Laurier-tin. Ce dernier n'est pas une contradiction mais un manque, la base décrivant correctement la floraison hivernale du cultivar mais omettant la fin de floraison de mai et juin.

### Noms contestés, cadre de résolution établi

Trois des quatre cas ne sont pas des questions botaniques mais des questions de nomenclature horticole. L'Artichaut, le Poireau et le Pois mange-tout sont des cultigènes, plantes qui n'existent que sous culture. Le Code international de nomenclature des plantes cultivées prévoit pour eux la catégorie du Groupe de cultivars, et un Groupe s'inscrit à l'intérieur d'un taxon nommé selon le code botanique, sans le concurrencer.

Le désaccord entre GBIF et POWO porte donc sur le rang botanique à donner à un cultigène, question que la base n'a pas à trancher puisque l'identité de la plante est portée par le Groupe. La source à retenir pour les noms de Groupe est une autorité horticole, la base Mansfeld des plantes cultivées de l'institut Leibniz IPK étant la référence pour les espèces potagères.

Le Cléome est différent. Cleome hassleriana est une espèce spontanée d'Amérique du Sud, et le désaccord porte sur les limites du genre entre Cleome et Tarenaya. C'est une question botanique ouverte, à trancher sur une monographie de la famille et non sur un référentiel agrégateur.

### Rusticité du Muflier et du Persil

Le Plant Finder du Missouri Botanical Garden donne la zone de rusticité par espèce, testé et vérifié sur Artemisia Powis Castle qui rend la zone 6 à 9. La zone se convertit en degrés par la table de correspondance, la zone 6a valant moins 23,3 à moins 20,6 degrés et la zone 9a moins 6,7 à moins 3,9.

L'accès demande un code interne à la base : la recherche par nom ne répond pas, seule l'adresse d'une fiche connue fonctionne. Il faut donc passer par une résolution de code, ce qui double le nombre d'appels par espèce.

Voie alternative pour ces deux fiches, les notations de rusticité du Royal Horticultural Society, dont l'échelle est publiée en degrés : H4 de moins dix à moins cinq degrés, H5 de moins quinze à moins dix, H3 de moins cinq à un.

### Durées semis-récolte

Les vingt-quatre espèces sont des aromatiques et des racines. La durée entre semis et première récolte est la donnée standard des catalogues de semences et des guides potagers des services d'extension universitaire, publiée pour chaque espèce.

La transférabilité est acceptable pour cette donnée, qui mesure un temps thermique et non une date. La vérification consiste à contrôler que la durée retenue, appliquée à la période de récolte du référentiel, replace le semis dans une fenêtre praticable au jardin, ce qui est le contrôle déjà utilisé pour les vingt et une espèces couvertes par le bulletin FAO 56.

## État après résolution

| Point | Avant | Après |
|---|---|---|
| Humidité hivernale | 18 candidates sans statut | 5 établies par la chorologie, 4 écartées, 9 exotiques à sourcer |
| Écarts larges de floraison | 10 à contrôler | 6 tranchés par cohérence interne, 4 à sourcer |
| Noms contestés | 4 sans cadre | 3 relevant du Groupe de cultivars, 1 question botanique ouverte |
| Rusticité Muflier et Persil | sans voie d'accès | deux sources testées, une avec surcoût de résolution de code |
| Durées semis-récolte | 24 estimées | méthode et contrôle définis, sourçage à mener |

Le sourçage externe restant porte donc sur neuf espèces exotiques pour le drainage hivernal, quatre périodes de floraison, deux rusticités, vingt-quatre durées de culture et une monographie de famille pour le Cléome.
