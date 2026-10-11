# Pic de floraison et contrôles croisés

Travaux du 30 juillet 2026, faisant suite au `claude/journal-sourcage-30-juillet.md`.

## Définition du pic de floraison

Le pic de floraison est le stade BBCH 65, pleine floraison, défini comme le moment où environ la moitié des fleurs sont épanouies. Cette définition est celle du protocole de l'Observatoire des Saisons, qui enregistre le stade sous le nom Milieu de floraison et le formule ainsi : notez la date à laquelle 50 pour cent des fleurs sont épanouies ou libèrent leur pollen. Le protocole distingue explicitement ce stade du début de floraison, fixé à environ 10 pour cent des fleurs épanouies.

La définition a été arrêtée avant tout relevé. Elle est portée par la colonne `plants.floraison_pic_q`, exprimée en quinzaine sur l'axe de 24, avec une contrainte de bornes en base. Aucune valeur n'y est écrite sans source. La règle du milieu de période, qui aurait produit une valeur sur les 217 fiches à floraison, n'est pas appliquée : elle produirait une donnée d'apparence mesurée sans mesure derrière.

## Sources phénologiques examinées

TEMPO, `tempo.pheno.fr`, est l'infrastructure nationale de phénologie pilotée par INRAE. Le portail institutionnel ne porte aucune donnée, il porte les protocoles et les licences. Les données sont sur `data.pheno.fr`, qui agrège dix sources distantes sans stockage intermédiaire, dont l'Observatoire des Saisons, Phenoclim, PHETEC et AgroClim Pheno.

Point déterminant pour la reproductibilité : les services web REST de `data.pheno.fr` sont ouverts sans authentification, la page de documentation énonçant que seules les données publiques sont accessibles et qu'aucun jeton n'est requis. Le stade recherché existe sous deux identifiants, 103 sur l'échelle BBCH et 195 sur l'échelle BBCH Tela Botanica, tous deux décrits comme environ 50 pour cent des fleurs épanouies. Les deux appels suivants rapatrient l'intégralité du stade 65, soit 13 528 observations :

    https://data.pheno.fr/api/pheno/cache?stage=103&pagesize=200000
    https://data.pheno.fr/api/pheno/cache?stage=195&pagesize=200000

Le référentiel taxonomique de `data.pheno.fr` est arborescent. Le rattachement doit se faire sur le sous-arbre complet de chaque espèce, cultivars et variétés inclus, faute de quoi une part importante des observations est perdue : Prunus persica compte 894 descendants. Le choix du sous-arbre déplace la médiane d'au plus trois jours sur les quatre taxons concernés.

Le dépôt Recherche Data Gouv portant le DOI 10.57745/NQ9HRV identifie le portail et ne contient qu'un fichier de description. Il ne porte pas de données.

PEP725, base européenne opérée par GeoSphere Austria, code bien le stade 65 et moissonne les données françaises via l'API TEMPO depuis mai 2025. Son téléchargement direct est suspendu pendant la refonte du site et passe par une demande par courriel. Environ 90 pour cent de ses enregistrements viennent du réseau allemand. Elle n'apporte donc rien que TEMPO ne donne déjà pour la France.

Le réseau phénologique du Deutscher Wetterdienst est en accès libre sous licence CC BY 4.0. Il relève la Vollblüte, annotée BBCH 65 dans son manuel d'observation, mais seulement pour les arbres fruitiers cultivés : le lilas n'y porte que le stade de début de floraison. Ses données sont allemandes et ne renseignent pas la France.

## Résultats du sourçage

Douze fiches sourcées. La médiane est calculée sur les observations françaises, en retenant la fenêtre postérieure à 2000 lorsque l'effectif le permet, afin que la valeur décrive le climat actuel.

| Fiche | Quinzaine | Médiane | Premier quartile | Troisième quartile | Observations | Années |
|---|---|---|---|---|---|---|
| Noisetier | 3 | 6 février | 22 janvier | 19 février | 551 | 2007-2026 |
| Amandier | 4 | 26 février | 16 février | 9 mars | 324 | 2008-2026 |
| Laurier-tin | 5 | 5 mars | 14 février | 22 mars | 174 | 2008-2026 |
| Abricotier | 5 | 13 mars | 1 mars | 24 mars | 61 | 2000-2026 |
| Forsythia | 6 | 17 mars | 10 mars | 26 mars | 666 | 2007-2026 |
| Prunier | 6 | 31 mars | 21 mars | 9 avril | 366 | 2000-2026 |
| Cerisier | 7 | 7 avril | 2 avril | 13 avril | 984 | 2000-2026 |
| Poirier | 7 | 7 avril | 30 mars | 16 avril | 306 | 2000-2026 |
| Pommier | 8 | 18 avril | 13 avril | 28 avril | 89 | 2001-2026 |
| Lilas | 8 | 20 avril | 13 avril | 29 avril | 597 | 2007-2026 |
| Noyer | 9 | 1 mai | 25 avril | 8 mai | 43 | 2019-2026 |
| Sureau noir | 9 | 14 mai | 9 mai | 24 mai | 105 | 2019-2026 |

La totalité des sites porteurs de ces observations est en France.

Trois taxons ont été écartés. Le Pêcher ne porte aucune observation postérieure à 1999, ses 136 relevés couvrant 1884 à 1999 : une médiane sur ce corpus décrirait un climat révolu. Le Châtaignier et le Cognassier comptent cinq observations chacun, sous le seuil d'exploitabilité fixé à vingt.

Le Laurier-tin fleurissant à cheval sur le premier janvier, sa médiane est calculée avec une correction d'année glissante, sans laquelle la discontinuité du jour de l'année la fausse de cinq jours.

## Corrections induites sur les périodes de floraison

Le contrôle de contenance du pic dans la période de floraison enregistrée a été passé sur les douze fiches. Dix sont contenues. Deux ne l'étaient pas, et dans le même sens, le pic observé précédant la période enregistrée.

Le Lilas était enregistré du premier mai au 15 juin, alors que le premier quartile des observations de pleine floraison tombe le 13 avril. Début avancé à la première quinzaine d'avril.

Le Sureau noir était enregistré du premier juin au 15 juillet, alors que la médiane de pleine floraison tombe le 14 mai. Début avancé à la première quinzaine de mai.

Les deux corrections élargissent la période sans en déplacer la fin, ce qui est le geste conservateur : l'observation établit que la floraison a commencé avant la date enregistrée, elle n'établit rien sur la fin.

## Régime de floraison, règle testée et écartée

L'hypothèse était qu'une plante fleurissant sur une longue période ne présente pas de pic, sa floraison étant remontante ou continue, et qu'une colonne `regime_floraison` dérivée de la largeur de la période permettrait de savoir où afficher un pic et où s'en abstenir.

Mesure de la population : sur 217 fiches à floraison, 79 fleurissent sur quatre quinzaines ou moins, 77 sur sept quinzaines ou plus. Les deux populations sont disjointes par catégorie. Aucun des 19 arbres fruitiers ne dépasse six quinzaines. En regard, 26 des 28 fleurs annuelles dépassent sept quinzaines, et douze dépassent dix, dont le Souci, le Géranium des balcons, l'Alysse odorante, le Bégonia des jardins, le Pétunia, le Lobélia, l'Impatiens et le Muflier. Même profil sur les arbustes d'ornement et les grimpantes.

La donnée phénologique observée existe donc exactement là où la période est déjà étroite et où le pic n'apporte presque rien, et elle est absente là où le pic porterait une information.

La règle de dérivation a ensuite été mesurée contre Baseflor, qui donne une période de floraison en mois pour la flore de France et constitue une seconde mesure indépendante de la même grandeur. Soixante fiches portent les deux. Pour comparer à granularité identique, la période de la base a été convertie en nombre de mois touchés.

| Seuil de bascule | Accord de classement |
|---|---|
| 2 mois | 95,0 pour cent |
| 3 mois | 66,7 pour cent |
| 4 mois | 70,0 pour cent |
| 5 mois | 93,3 pour cent |
| 6 mois | 95,0 pour cent |

Les accords élevés aux seuils extrêmes sont un artefact de fréquence de base : à deux mois presque toutes les fiches basculent du même côté, à six mois presque aucune. La zone où le seuil discrimine réellement se situe entre trois et cinq mois, et l'accord y tombe entre 67 et 70 pour cent. La validation en deux moitiés ne converge pas non plus, le seuil optimal ressortant à deux mois sur une moitié et à six sur l'autre.

Conclusion : deux sources sérieuses décrivant la même espèce donnent une classe différente une fois sur trois dans la zone qui compte. La règle n'est pas assez stable pour être écrite, et la colonne n'est pas créée. Le comportement d'affichage retenu est plus simple : le pic n'est représenté que sur les fiches où `floraison_pic_q` est renseignée, et nulle part ailleurs. L'absence de pic sur une fiche signifie que le pic n'est pas connu, ce qui est exact.

L'analyse des désaccords éclaire leur origine. Baseflor est plus large que la base sur le Crocus, le Cyclamen de Naples, le Fenouil, la Sauge sclarée, la Marguerite, le Houblon doré et la Pomme de terre ; la base est plus large sur le Géranium vivace, le Delphinium, la Nigelle, le Lis et l'Hémérocalle. Le premier groupe s'explique par l'étendue territoriale : Baseflor décrit l'enveloppe de floraison de l'espèce sur toute la France, altitude comprise, non la période d'un pied au jardin. Le second groupe s'explique par les cultivars, remontants là où l'espèce sauvage ne l'est pas.

## Contrôle croisé Baseflor

De la mesure précédente ressort un usage légitime de Baseflor, que la largeur ne permettait pas mais que la position permet. Sur les 60 fiches portant les deux périodes, 59 ont une intersection non vide, et 53 ont un centre distant de moins de 1,5 mois. La position concorde, ce qui fait de Baseflor un arbitre utilisable sur la localisation de la floraison.

Le contrôle `floraison_hors_baseflor` a été ajouté à la vue `public.controle_coherence`. Il signale toute fiche dont la période de floraison n'intersecte pas l'enveloppe Baseflor.

Il ne remonte qu'une fiche, la Baie de mai. La base donne mars et avril, Baseflor donne mai à juillet. L'écart est altitudinal : Lonicera caerulea est montagnarde dans la flore sauvage française et fleurit tard en altitude, alors que la floraison en culture de plaine est précoce. L'exception est documentée dans la fiche et n'appelle pas de correction.

Un second contrôle a été ajouté, `pic_hors_floraison`, qui signale un pic renseigné hors de la période de floraison de la fiche.

## Seuils de gel, deux échelles de rusticité

Dix seuils sourcés sur la liste de Pam Dawling, révision 2025, ont été écrits : Cerfeuil moins 4, Chou cabus moins 11, Chou de Bruxelles moins 11, Endive moins 4, Fève moins 9, Mizuna moins 4, Poireau moins 11, Radis moins 7, Roquette moins 6, Rutabaga moins 9.

Ces dix valeurs sortaient toutes des bornes de leur classe de rusticité, ce qui avait été lu le matin même comme dix contradictions à instruire. Dix sur dix n'est pas un jeu d'erreurs, c'est un défaut de contrôle. L'explication est une confusion d'échelle : les bornes en usage, moins 15 pour très rustique jusqu'à plus 5 pour gélif, sont les bandes classiques des ligneux et des vivaces ornementales. Un poireau détruit à moins 11 degrés est un légume très rustique ; un arbuste détruit à moins 11 degrés est moyennement rustique. La classe est relative à la catégorie.

Le contrôle a donc été dédoublé. Les annuelles et bisannuelles sont mesurées contre un barème potager, moins 10 pour très rustique, moins 7 pour rustique, moins 4 pour assez rustique, moins 2 pour peu rustique. Les ligneux et les vivaces conservent le barème d'origine.

Après dédoublement, trois fiches sur dix restaient signalées, et ces trois-là étaient de vraies divergences.

Le Chou cabus et le Chou de Bruxelles relevaient d'une différence de portée entre la classe et la valeur. La source échelonne les variétés sur près de dix degrés, de moins 3 pour les choux d'été à moins 12 pour Deadon. La classe de la fiche annonçait sa portée, rustique pour les variétés d'hiver dans un cas, très rustique et amélioré par le gel dans l'autre. La valeur écrite a été alignée sur cette portée, moins 11 degrés pour les deux, la fourchette variétale étant portée par la nouvelle colonne `frost_note`.

L'Endive relevait d'une classe trop généreuse. Le seuil de moins 4 degrés porte sur les racines laissées au champ avant arrachage pour le forçage, ce qui est bien l'usage de la fiche, et une racine détruite à moins 4 degrés n'est rustique sur aucune échelle. La classe est passée de rustique à assez rustique.

Règle retenue et applicable aux prochaines écritures : lorsqu'une source échelonne un seuil selon les variétés, la valeur retenue est celle du type effectivement cultivé en France pour l'usage que décrit la fiche, et l'étendue de la fourchette est consignée dans `frost_note`.

Vingt fiches restent sans seuil de gel. La recherche a été menée sur les trente et n'a rien produit pour les vingt autres : ni Pam Dawling, ni les services d'extension universitaires, ni les références européennes ne publient de température de destruction pour le Bleuet, le Coquelicot, le Pavot de Californie, la Nigelle, le Godétia, le Muflier, le Myosotis, la Pâquerette, la Primevère, le Souci officinal, le Pois de senteur, le Cerfeuil tubéreux, le Cresson alénois, la Scorsonère, la Lentille, le Pois, le Pois mange-tout, l'Arroche et le Chou rouge. Les sources trouvées énoncent des optima de culture ou des consignes de protection, non un seuil létal.

Deux pièges de transposition ont été évités et méritent d'être notés. Le winter cress donné à moins 9,5 degrés par Dawling est Barbarea verna et non Lepidium sativum. Le salsify donné à moins 18 degrés est Tragopogon porrifolius et non Scorzonera hispanica.

## Clôture du chantier feuillage

Aucune fiche ne porte plus le feuillage en estimation.

Les sept annuelles qui portaient une valeur de feuillage ont été vidées, Capucine, Cosmos, Ipomée, Pois de senteur, Souci, Thunbergia et Tournesol. La colonne décrit le comportement du feuillage en hiver, question qui ne se pose pas pour une plante dont le cycle s'achève avant l'hiver. C'est la même règle que celle retenue pour l'hivernage.

Cinq valeurs écrites. Le Calamagrostis est caduc, sur les fiches de cultivar du Royal Horticultural Society croisées avec le programme Master Gardener de l'université de Californie ; la note précise que la touffe sèche sur pied et reste dressée tout l'hiver, sans quoi la fiche contredirait ce que l'utilisateur voit en janvier. Le Rosier grimpant est caduc en valeur de groupe, les exceptions persistantes étant nommées dans la note. Le Fuchsia rustique est caduc, avec mention du littoral doux où il reste semi-persistant. Le Pennisetum est caduc, la fiche du Royal Horticultural Society portant un champ structuré Evergreen en contradiction avec sa propre description, qui décrit un feuillage virant au brun pâle en hiver et un retrait du feuillage mort au printemps ; en cas de contradiction interne à une source, sa description l'emporte sur son champ structuré. Le Stipa cheveux d'ange est semi-persistant, valeur dérivée et non sourcée.

La règle appliquée au Stipa est écrite : lorsque deux sources de qualité comparable divergent entre persistant et caduc et que leur divergence suit la douceur de l'hiver de la région d'observation, le référentiel enregistre semi-persistant, en valeur dérivée. Ici le Royal Horticultural Society observe au Royaume-Uni et donne caduc, Arizona State University observe en climat désertique de Phoenix et donne persistant.

La Clématite est le seul cas laissé vide volontairement. Le genre mélange les deux états et l'offre française courante comprend des persistantes largement diffusées, Clematis armandii et Clematis cirrhosa. Une valeur unique au niveau du genre serait fausse pour une part réelle des plantes concernées. La note de la fiche porte la répartition.

Signalement pour arbitrage commercial ou éditorial : Nassella tenuissima, le Stipa cheveux d'ange, est classée espèce exotique envahissante réglementée dans plusieurs pays.

## État du référentiel

| Champ | Sourcé | Estimé ou absent |
|---|---|---|
| Nectar | 146 | 169 |
| Pollen | 86 | 229 |
| Feuillage | 117 | 0 |
| Seuil de gel | 295 | 20 |
| Pic de floraison | 12 | 205 |

La vue `public.controle_coherence` porte désormais seize contrôles et ne remonte qu'une ligne, l'exception documentée de la Baie de mai.

## Points restés ouverts

1. Vingt fiches sans seuil de gel, toutes des ornementales annuelles ou bisannuelles pour lesquelles aucune source consultée ne publie de température de destruction. La question est de savoir si la colonne doit rester vide ou si une classe qualitative suffit pour ces plantes.

2. Deux cent cinq fiches sans pic de floraison. Le réseau d'observation français ne couvre que des arbres et arbustes, et il ne s'étendra pas aux annuelles ornementales. L'affichage doit donc fonctionner sans pic sur la grande majorité des fiches.

3. Intensité du parfum, 54 fiches, hors de portée de toute source cotée.

4. Position générique du Cléome, sans arbitre indépendant de GBIF et de POWO.
