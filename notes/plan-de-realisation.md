# Plan de réalisation

État des chantiers ouverts au 29 juillet 2026 et ordre de traitement. Les volumes sont recomptés en base, ils ne reprennent pas les chiffres des notes antérieures.

## Inventaire

| Chantier | Volume | Nature du travail |
|---|---|---|
| Protection hivernale et hivernage | 33 fiches corrigées, 2 à sourcer, 13 modèles à documenter | Traité le 29 juillet 2026, voir le lot 1 |
| Protection estivale | 14 fiches, un seul texte pour toutes | Cas par cas |
| Fertilisation | 184 conseils sur 18 modèles, le plus large couvre 28 fiches | Regroupement puis rédaction |
| Floraison | 153 conseils sur 10 modèles, le plus large couvre 40 fiches | Regroupement puis rédaction |
| Plantation | 116 conseils sur 11 modèles, le plus large couvre 35 fiches | Regroupement puis rédaction |
| Taille, préparation du sol, récolte, abri | 102 conseils sur 17 modèles | Regroupement puis rédaction |
| Dette d'estimation | parfum 285 fiches, pollen 263, nectar 189, feuillage 63 | Recherche de sources |
| Nomenclature contestée | 39 synonymes GBIF, 2 noms douteux, 6 taxonomies en litige | Décision nom par nom |
| Écarts de floraison face à baseflor | 36 fiches | Décision fiche par fiche |
| Écarts de nectar | 4 fiches conservées en l'état | Décision fiche par fiche |
| Portée de la pollinisation | 7 dioïques à renseigner, 280 fiches vides | Une décision de modèle puis saisie |
| Finition de l'arrosage | 24 durées semis-récolte estimées | Recherche de sources |

Sur les 1 700 conseils actifs, 666 partagent leur texte avec au moins une autre fiche, soit 39 pour cent. La phase de multiplication donne la mesure de ce qui est atteignable : 312 textes distincts pour 315 fiches, aucun modèle.

## Sources et compatibilité climatique

Le périmètre des sources est étendu aux références anglophones, plus riches que les françaises sur la plupart des champs. Royal Horticultural Society et Kew pour le Royaume-Uni, Missouri Botanical Garden pour le référencement des espèces cultivées, services d'extension universitaire américains pour les légumes, University of California pour les espèces méditerranéennes.

La transférabilité dépend de la nature de la donnée, et se juge champ par champ.

Données intrinsèques à l'espèce, transférables sans condition : parfum, production de nectar et de pollen, toxicité, couleur de floraison, dioécie, port et taille adulte, coefficient cultural. Une lavande sent la lavande en Californie comme en Provence. Ces champs représentent l'essentiel de la dette d'estimation, parfum 285 fiches, pollen 263, nectar 189, soit 737 des 800 champs estimés.

Données dépendantes du climat, non transférables telles quelles : dates de semis, périodes de floraison et de récolte, durées de cycle, consignes de protection, persistance du feuillage. Une source anglophone sert alors à établir le mécanisme, jamais la date. La date vient d'une source française ou des décalages par climat que porte déjà la base.

Cas intermédiaire, le feuillage. La persistance est une propriété de l'espèce mais son expression bascule avec le climat : un arbuste persistant en Cornouailles est caduc en Alsace. Les 63 fiches à feuillage estimé demandent donc la vérification climatique, contrairement aux trois autres champs.

Pont entre les référentiels : la colonne `frost_min_c`, en degrés Celsius, se convertit directement en zone de rusticité, ce qui rend les indications de rusticité anglophones utilisables sans interprétation. Les notations RHS de H1a à H7 et les zones USDA de 5 à 10 se lisent toutes deux en degrés.

Correspondance retenue entre les cinq climats du référentiel et les minima hivernaux, la France s'étendant des zones 6 à 10.

| Climat | Zone de rusticité | Minimum annuel typique |
|---|---|---|
| Méditerranéen | 9b à 10a | moins 4 degrés |
| Océanique | 9a à 9b | moins 7 degrés |
| Océanique dégradé | 8a à 8b | moins 12 degrés |
| Semi-continental | 7a à 7b | moins 18 degrés |
| Montagnard | 6a à 7a | moins 23 degrés |

Une plante a besoin d'une protection hivernale dans un climat donné lorsque son `frost_min_c` est plus élevé que le minimum de ce climat. Cette règle rend la colonne exploitable et sert de contrôle à tout conseil de protection.

## Lot 1, protection hivernale et hivernage

Objet : supprimer les conseils de protection qui ne s'appliquent pas, et rédiger ceux qui s'appliquent en fonction de la plante.

Volume examiné : 172 fiches portent un conseil de protection, réparties sur 14 modèles couvrant 91 conseils.

Constat après examen des 14 modèles, qui révise l'estimation initiale à la baisse. Treize modèles couvrent des ensembles réellement homogènes et se conservent : la récolte avant les fortes gelées pour vingt légumes-feuilles tous rustiques à moins cinq degrés, la fin de culture à la première gelée pour les annuelles gélives, l'arrachage et la conservation hors gel pour les bulbes et rhizomes, l'absence de protection pour un arbre installé, la crainte de l'humidité plutôt que du froid pour les méditerranéennes. Un seul modèle était abusif, et c'était le plus large.

Le modèle en cause, 35 fiches, prescrivait de pailler la souche sur quinze centimètres et de couvrir le feuillage persistant d'un voile. Trois défauts. Il s'appliquait à des plantes rustiques de moins vingt-cinq à moins dix degrés, or aucun climat français ne descend sous moins vingt-trois, ce qui rendait la consigne inutile pour la moitié du groupe. Il évoquait le feuillage persistant sur des plantes caduques, Hortensia, Caryoptéris, Imperata, et sur treize fiches dont le feuillage n'est pas renseigné. Il traitait la Fraise comme une plante à protéger du froid alors que son paillage sert à tenir les fruits hors de la boue.

Correction appliquée le 29 juillet 2026 sur les 33 fiches à `frost_min_c` renseigné. Le texte est dérivé de trois colonnes, `frost_min_c` pour la bande de rusticité et donc les climats concernés, `habit` pour le geste, paillage de la souche ou de la zone racinaire, et `foliage` pour la mention du voile, présente seulement sur les persistants et les semi-persistants réellement exposés. La Fraise a reçu un texte propre. Le plus large groupe de la phase protection est passé de 32 à 20 fiches, et le nombre de textes distincts de 95 à 105.

Reste sur ce lot : renseigner `frost_min_c` sur le Muflier et le Persil, seules fiches du modèle sans valeur, à partir des notations de rusticité anglophones ; documenter la raison de conservation des treize modèles légitimes ; traiter la protection estivale, quatorze fiches partageant un texte unique, en distinguant l'ombrage des méditerranéennes de la protection contre la montée à graine des légumes-feuilles.

Point écarté. Les soixante annuelles portant un conseil de protection ne constituent pas un défaut : aucune ne reçoit de consigne de protection hivernale. Leur conseil énonce la fin de culture à la première gelée, ce qui est exact, et les trois qui mentionnent un voile, Fève, Pois et Pois mange-tout, précisent que les semis d'automne passent le froid sans protection. L'alerte portée dans les notes antérieures était infondée.

Défaut de modélisation relevé au passage. La colonne `plant_climates.level` confond deux risques distincts, le froid et l'excès d'eau hivernal, que seule la colonne `note` sépare. C'est ce qui explique les 23 fiches dont le niveau n'est pas monotone avec la rigueur du climat, notées en protection sur la façade atlantique et adaptées dans le bassin parisien pourtant plus froid. Le cas est légitime, Thym, Lavande, Romarin, Sauge officinale et Fétuque bleue craignent l'humidité bretonne et non le gel parisien, mais il n'est pas lisible sans lire la note.

## Lot 2, finition de l'arrosage

Objet : remplacer les vingt-quatre durées semis-récolte estimées par des valeurs sourcées, et trancher la variation climatique des fenêtres de semis.

Volume : 24 fiches pour les durées, 50 lignes de `plant_phases` pour la variation climatique.

Méthode : les vingt-quatre espèces absentes du bulletin FAO 56 sont pour l'essentiel des aromatiques et des racines. Les catalogues de semences professionnels publient une durée de cycle par variété, qui constitue une source nommée acceptable. La colonne `source` de `plant_phases` reçoit la référence.

Lot court, à traiter tôt pour clore le chantier de l'arrosage plutôt que de le laisser ouvert.

## Lot 3, nomenclature et écarts déjà listés

Objet : statuer sur les divergences relevées lors des confrontations aux référentiels externes, toutes déjà documentées et aucune appliquée.

Volume : 39 fiches en statut synonyme chez GBIF, 2 en statut douteux, 6 taxonomies en litige entre GBIF et POWO, 36 écarts de floraison face à baseflor, 4 écarts de nectar.

Méthode : pour la nomenclature, retenir le nom accepté par POWO quand GBIF et POWO convergent, et documenter le maintien du nom d'usage quand il diverge, le référentiel servant un public de jardiniers et non de botanistes. Pour les écarts de floraison, la question est de savoir si la base décrit la plante sauvage ou la plante au jardin, ce qui appelle une règle générale plutôt que trente-six décisions séparées.

Lot à décision dense et à volume faible. Il conditionne la crédibilité du référentiel et ne dépend de rien.

## Lot 4, portée de la pollinisation

Objet : décider si la colonne `pollination` reste limitée à la fertilité des fruitiers ou couvre toutes les espèces où la question du second sujet se pose.

Volume : 280 fiches vides aujourd'hui, dont 7 dioïques identifiées, Asperge, Épinard, Houblon doré, If, Laurier-sauce, Ortie et Oseille.

Méthode : une décision de modèle, puis la saisie. Si la portée est étendue, il faut aussi statuer sur la valeur à porter pour les espèces autofertiles sans enjeu, faute de quoi la colonne reste massivement vide et son sens ambigu.

## Lot 5, conseils des autres phases

Objet : sortir les conseils de plantation, de fertilisation, de floraison, de taille, de préparation du sol, de récolte et d'abri de leurs modèles génériques.

Volume : 575 conseils sur 61 modèles.

Méthode identique pour chaque phase. Extraire les groupes partageant un texte, examiner le groupe et le qualifier. Un modèle légitime couvre un ensemble réellement homogène et se conserve en le documentant comme tel. Un modèle abusif se scinde selon la colonne structurée qui différencie les fiches. Le reste se rédige fiche par fiche.

Ordre au sein du lot, par utilité décroissante pour le jardinier. Plantation, parce que la consigne est immédiatement actionnable et que l'erreur coûte la culture. Fertilisation, parce que `fertility_need` permet un regroupement solide et que le volume est le plus élevé. Préparation du sol, récolte et abri, de faible volume. Taille, où les 119 textes distincts sur 149 montrent que le travail est déjà largement fait. Floraison en dernier, le conseil y étant descriptif plus que prescriptif.

## Lot 6, dette d'estimation

Objet : remplacer par des valeurs sourcées les champs aujourd'hui portés par la mention d'estimation horticole non vérifiée.

Volume : parfum sur 285 fiches, pollen sur 263, nectar sur 189, feuillage sur 63. Trois cent quatorze des 315 fiches actives portent au moins un champ estimé.

Méthode : par champ et non par fiche, chaque champ ayant ses propres sources. Trois de ces quatre champs sont intrinsèques à l'espèce et se sourcent donc sans contrainte géographique, ce qui ouvre les références anglophones. Le nectar et le pollen relèvent des référentiels apicoles, déjà utilisés pour les corrections appliquées précédemment, complétés par les listes de plantes mellifères des sociétés d'apiculture britanniques et américaines. Le parfum, jamais coté systématiquement dans une base, se lit dans les descriptions du Royal Horticultural Society et du Missouri Botanical Garden, qui le mentionnent fiche par fiche. Le feuillage est le seul des quatre à demander la vérification climatique, la persistance basculant avec la rigueur de l'hiver.

Lot le plus lourd et le moins bloquant. À traiter en dernier, champ par champ, en commençant par le feuillage qui est le plus court, puis le parfum qui est le plus volumineux mais dont la source est désormais identifiée.

## Séquencement

| Ordre | Lot | Motif de la position |
|---|---|---|
| 1 | Protection hivernale et hivernage | Seul lot où un conseil erroné fait agir à contretemps |
| 2 | Finition de l'arrosage | Court, et referme un chantier en cours |
| 3 | Nomenclature et écarts déjà listés | Décisions en attente, volume faible, aucune dépendance |
| 4 | Portée de la pollinisation | Une décision de modèle débloque une saisie courte |
| 5 | Conseils des autres phases | Volume principal, aucune dépendance mais long |
| 6 | Dette d'estimation | Le plus lourd, le moins bloquant, dépend de sources externes |

Les lots 3 et 4 peuvent avancer en parallèle du lot 5, leurs décisions ne portant pas sur les mêmes colonnes.

## Règles de travail communes

Toute écriture de contenu passe par le journal avec son motif dans `app.motif`. Les remplissages de métadonnée technique se font déclencheurs suspendus, comme aujourd'hui.

Toute valeur produite est soit sourcée par une référence nommée avec sa date, soit portée comme estimation explicite. Aucune valeur ne quitte un lot dans un état intermédiaire.

Tout modèle conservé porte la raison de sa conservation, de façon qu'un modèle légitime ne soit pas relu à chaque passage.

Chaque lot se termine par un recomptage en base et une mise à jour de la note de projet correspondante.

## Points à arbitrer

1. Fenêtres de semis par climat. Les cinquante lignes ajoutées valent aujourd'hui pour les cinq climats. Faut-il les décaler par climat, comme le sont déjà 446 des 2 089 lignes de `plant_phases`, ou la fenêtre large suffit-elle.

2. Rédaction des conseils. La correction du lot 1 a été menée en dérivant le texte de `frost_min_c`, `habit` et `foliage`, ce qui a rendu les trois défauts visibles et vérifiables. La voie mixte est retenue par défaut pour la suite, gabarit dérivé pour la consigne et texte propre pour les espèces dont la situation ne se lit pas dans les colonnes, comme la Fraise. Reste à confirmer que ce parti convient, sachant qu'il produit des textes identiques pour des fiches réellement dans la même situation, ce qui n'est plus un modèle abusif mais une consigne partagée.

3. Séparation des risques hivernaux. Faut-il scinder `plant_climates.level` en deux appréciations, résistance au froid et tolérance à l'humidité hivernale, ou garder une valeur unique documentée par sa note.

4. Portée de la colonne `pollination`. Fruitiers seulement, ce qui laisse 280 fiches vides mais garde un sens net, ou toutes les espèces où la question du second sujet se pose, ce qui impose de statuer sur la valeur des autofertiles sans enjeu.

5. Écarts de floraison face à baseflor. Aligner sur baseflor, qui décrit les populations spontanées, garder le comportement observé au jardin, qui est ce que voit l'utilisateur, ou porter les deux périodes dans des colonnes distinctes.

6. Champ parfum. Les descriptions du Royal Horticultural Society et du Missouri Botanical Garden le mentionnent fiche par fiche, ce qui rend le sourçage possible sur les 285 fiches concernées mais long. Le mener, ou assumer l'estimation et l'afficher comme telle dans l'application.

7. Nomenclature. Afficher le nom d'usage du jardinier et garder le nom accepté en second, ce qui est l'état actuel, ou basculer l'affichage sur le nom accepté par POWO pour les 39 fiches en statut synonyme.
