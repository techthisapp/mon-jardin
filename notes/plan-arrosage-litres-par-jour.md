# Plan d'arrosage en litres par jour

Note de conception du 29 juillet 2026. Le plan d'arrosage est un affichage par plante dans « en ce moment », ajusté par quinzaine, sans phase dédiée dans le calendrier.

## Méthode de calcul

Le calcul suit le bulletin FAO 56 sur l'évapotranspiration des cultures.

Besoin en litres par jour égale l'évapotranspiration de référence en millimètres par jour, multipliée par le coefficient cultural, multipliée par la surface occupée en mètres carrés. Un millimètre d'eau sur un mètre carré vaut exactement un litre.

L'évapotranspiration de référence dépend du climat et de la période, pas de la plante. Le coefficient cultural est propre à la plante et varie selon son stade. La surface vaut `spacing_cm` multiplié par `row_cm`, divisé par dix mille. Elle est renseignée sur les 315 fiches actives.

## Évapotranspiration de référence

Source : Météo-France, fiches climatologiques, statistiques 1991-2020, ligne d'évapotranspiration potentielle Penman mensuelle. Une station de référence par climat.

| Climat | Station | Altitude | Total annuel | Pointe journalière |
|---|---|---|---|---|
| Océanique | RENNES-ST JACQUES (35) | 36 m | 836,9 mm | 4,72 mm au 1er juillet |
| Océanique dégradé | PARIS-MONTSOURIS (75) | 75 m | 890,5 mm | 5,02 mm au 1er juillet |
| Semi-continental | STRASBOURG-ENTZHEIM (67) | 150 m | 831,8 mm | 4,90 mm au 16 juin |
| Méditerranéen | MONTPELLIER-AEROPORT (34) | 1 m | 1 249,5 mm | 6,76 mm au 1er juillet |
| Montagnard | LE PUY-LOUDES (43) | 833 m | 792,4 mm | 4,61 mm au 1er juillet |

La période de référence de l'évapotranspiration de Montpellier est 2001-2020, les autres normales portent sur 1991-2020.

Passage du mois à la quinzaine : le total mensuel est converti en débit journalier rapporté au milieu du mois, une interpolation linéaire sur le jour de l'année produit une courbe journalière, chaque quinzaine prend la moyenne de la courbe sur ses jours. Un recalage par mois garantit que la somme des deux quinzaines reproduit le total mensuel publié. Les cent vingt valeurs recomposent les totaux annuels à moins de 0,2 millimètre près.

Le choix de la station montagnarde retient un site du Massif central. Les stations de montagne méridionale donnent des valeurs nettement plus fortes, 1 128,9 millimètres à Embrun et 1 062,3 millimètres à Millau, ce qui situe la marge d'incertitude de ce climat.

## Coefficients culturaux

Source : bulletin FAO 56, table 12 pour les trois coefficients de stade, table 11 pour les longueurs de stade.

Cent dix-huit fiches portent les trois coefficients d'une ligne nommée du bulletin, la ligne retenue étant inscrite dans `kc_source`. Exemples : Tomate 0,60 puis 1,15 puis 0,90 ; Pomme de terre 0,50 puis 1,15 puis 0,75 ; Courgette 0,50 puis 0,95 puis 0,75 ; Pommier, Poirier et Cerisier 0,45 puis 0,95 puis 0,70 sur la ligne sans couvert végétal avec gelées hivernales ; petits fruits 0,30 puis 1,05 puis 0,50 ; Olivier 0,65 puis 0,70 puis 0,70.

Cent quatre-vingt-dix-sept fiches ornementales absentes du bulletin conservent le coefficient de pleine saison déduit du besoin en eau selon la logique WUCOLS. Leurs coefficients de début et de fin sont dérivés du rapport observé dans le bulletin selon le feuillage : caduc 0,40 et 0,60 du coefficient de pleine saison, semi-persistant et marcescent 0,65 et 0,80, persistant 0,90 et 0,95, herbacée sans feuillage renseigné 0,50 et 0,85 pour une vivace, 0,50 et 0,70 pour un cycle annuel.

Dix-sept fiches ont vu leur coefficient de pleine saison corrigé au passage, l'ancienne valeur étant une approximation et la nouvelle provenant d'une ligne nommée : Menthe de 1,00 à 1,15, Navet et Rutabaga de 1,05 à 1,10, Haricot à écosser de 1,05 à 1,15, Topinambour, Crosne, Oca du Pérou et Poire de terre à 1,15, Blette et Raifort de 1,00 à 1,05, Physalis de 1,00 à 1,05, Pourpier et Ficoïde glaciale de 0,90 à 1,00, Chou chinois, Mizuna et Tatsoi de 1,05 à 1,00.

## Application du coefficient selon le stade

Deux modèles, portés par la colonne `kc_modele`.

Cinquante fiches en modèle de cycle. Ce sont les cultures pour lesquelles la table 11 publie des longueurs de stade. Le coefficient se lit sur la courbe FAO à quatre segments à partir du nombre de jours écoulés depuis la date de plantation réelle, portée par `garden_plants.added_at` : plateau initial, montée linéaire, plateau de pleine saison, descente linéaire. Les longueurs sont stockées dans `cycle_ini_j`, `cycle_dev_j`, `cycle_mid_j` et `cycle_late_j`.

Deux cent soixante-cinq fiches en modèle saisonnier. Ce sont les vivaces, les ligneux, les ornementales et les légumes à récolte étalée. Le coefficient se lit sur la même courbe, calée cette fois sur la saison de végétation du climat. Les plantes à feuillage persistant conservent leur coefficient de fin pendant l'hiver au lieu de sortir de la courbe.

Repères de saison de végétation, en quinzaines, obtenus par seuils de 10 et 16 degrés sur les normales mensuelles de température moyenne des mêmes stations.

| Climat | Départ | Plein feuillage | Sénescence | Fin |
|---|---|---|---|---|
| Océanique | 1er avril | 1er juin | 16 septembre | 1er novembre |
| Océanique dégradé | 16 mars | 16 mai | 16 septembre | 1er novembre |
| Semi-continental | 1er avril | 16 mai | 16 septembre | 16 octobre |
| Méditerranéen | 1er mars | 1er mai | 16 octobre | 16 novembre |
| Montagnard | 1er mai | 16 juin | 16 août | 16 octobre |

Pour l'affichage par espèce, indépendant de toute date de plantation, la courbe de cycle est calée sur la fenêtre de semis du référentiel et son plateau de pleine saison est prolongé jusqu'à la fin de la période de récolte, ce qui correspond aux semis échelonnés. Au 16 juillet en climat océanique dégradé, 166 des 170 fiches en litrage calculé portent une valeur, les quatre autres ayant terminé leur cycle à cette date.

## Fenêtres de semis

Quarante-cinq fiches actives portaient une période de récolte sans période de semis ni de plantation, ce qui privait aussi le calendrier de son rappel de semis. Cinquante lignes ont été ajoutées à `plant_phases`, certaines espèces recevant deux fenêtres, semis de printemps et semis de fin d'été.

La fenêtre est déduite de la période de récolte diminuée de la durée semis-récolte, avec un départ repoussé à la mi-mai pour les espèces gélives. Pour vingt et une espèces, la durée provient des tables 11 et 12 du bulletin FAO 56. Pour les vingt-quatre autres, absentes du bulletin, la durée est estimée. La colonne `source` de `plant_phases` distingue les deux cas.

Espèces à durée FAO : Oignon blanc hâtif, Chou chinois, Cresson alénois, Épinard, Mâche, Roquette, Cornichon, Maïs doux, Claytone de Cuba, Haricot d'Espagne, Mizuna, Tatsoi, Fève, Haricot à écosser, Haricot à rames, Haricot vert nain, Pois, Pois mange-tout, Betterave, Carotte, Radis.

Espèces à durée estimée : Aneth, Anis vert, Bourrache, Carvi, Cerfeuil, Cerfeuil tubéreux, Coriandre, Cumin, Ortie, Persil, Sarriette, Endive, Pourpier, Immortelle, Souci officinal, Arroche, Lentille, Fenouil bulbe, Navet, Panais, Radis noir d'hiver, Rutabaga, Salsifis, Scorsonère.

Quatre cas relèvent d'une conduite particulière et ont reçu une fenêtre directe plutôt que déduite : le Carvi, bisannuel dont les graines se récoltent la seconde année, le Cerfeuil tubéreux, semé en automne parce qu'il lui faut du froid, l'Endive, dont la racine se cultive en été avant forçage hivernal, et l'Ortie, plantée au printemps.

## Modes d'arrosage

La colonne `plants.irrigation_mode` porte la règle d'affichage, avec un vocabulaire contrôlé de quatre valeurs.

Litrage calculé, 170 fiches. Herbacées, bulbeuses et graminées de besoin modéré à soutenu. Le calcul par surface s'applique directement, le système racinaire restant dans l'horizon travaillé.

Sans arrosage, 77 fiches. Toutes les plantes de besoin faible. Lavande, thym, romarin, sauge officinale et sédums souffrent davantage de l'excès d'eau que du manque. L'affichage porte une consigne de ne pas arroser plutôt qu'un chiffre proche de zéro.

Arrosage de reprise seule, 68 fiches. Tous les ligneux de besoin modéré à soutenu.

Calcul au volume du contenant. Mode déclaré par le jardinier, la culture en pot étant un fait du jardin et non une propriété de l'espèce.

## Arrosage de reprise des ligneux

Le calcul par surface du sujet établi donne soixante-dix-neuf litres par jour pour un pommier d'une emprise de vingt mètres carrés. Ce chiffre est la demande évapotranspiratoire de la parcelle, couvert herbacé compris, et non le volume à apporter à l'arbre.

Ce que le jardinier attend n'est pas non plus une simple consigne de fréquence, mais un volume par apport. La sortie retenue est donc une dose et un intervalle, calculés sur l'emprise du jeune sujet.

Emprise de départ : un demi mètre carré pour un arbre, trois dixièmes pour un arbuste, une liane ou un sous-arbrisseau, sans jamais dépasser l'emprise du sujet établi. Cette emprise double au terme de la période d'installation. La durée d'installation, deux à trois saisons, est bien plus courte que le temps de mise en place du houppier, l'emprise adulte n'entre donc pas dans ce calcul.

Dose cible : vingt litres pour un arbre, douze pour un arbuste ou une liane, huit pour un sous-arbrisseau. L'intervalle vaut la dose cible divisée par la demande journalière, borné entre deux et dix jours. La dose affichée vaut la demande multipliée par l'intervalle retenu.

Durée de la période de reprise : trois ans pour un arbre, deux pour un arbuste et une liane, un pour un sous-arbrisseau. Au terme, la fonction renvoie un indicateur de reprise terminée et l'affichage s'arrête. Hors saison de végétation, le coefficient cultural étant nul, aucune dose n'est produite.

Trajectoire d'un pommier planté le 15 novembre, en climat océanique dégradé.

| Date | Années | Emprise | Besoin | Consigne |
|---|---|---|---|---|
| 20 janvier | 0,18 | 0,53 m² | néant | repos, pas d'arrosage |
| 10 avril | 0,40 | 0,57 m² | 0,94 L/jour | 9 litres tous les 10 jours |
| 20 juillet | 0,68 | 0,61 m² | 2,83 L/jour | 20 litres tous les 7 jours |
| 5 octobre | 0,89 | 0,65 m² | 0,89 L/jour | 9 litres tous les 10 jours |
| 20 juillet suivant | 1,68 | 0,78 m² | 3,60 L/jour | 22 litres tous les 6 jours |
| troisième été | 3,68 | 1,00 m² | 4,62 L/jour | reprise terminée |

Autres valeurs au 20 juillet pour un sujet planté l'automne précédent : Cassis 12 litres tous les 6 jours, Framboise 12 litres tous les 6 jours, Rosier 12 litres tous les 10 jours, Clématite 12 litres tous les 10 jours, Airelle rouge 6 litres tous les 10 jours.

Le déclenchement d'un arrosage de sécheresse exceptionnelle après la période de reprise supposerait un cumul d'évapotranspiration sans pluie, donc des données météo en temps réel, ce qui sort du périmètre actuel.

## Culture en contenant

Le volume de substrat est porté par `garden_plants.contenant_litres`. Une valeur proposée par défaut figure sur chaque fiche dans `contenant_litres_defaut`, graduée selon le port et la hauteur : cinq litres pour une petite herbacée ou un bulbe, dix pour une herbacée moyenne, vingt pour une herbacée haute, quinze pour une graminée, vingt-cinq pour un sous-arbrisseau, quarante pour une liane, cinquante à soixante-dix pour un arbuste, quatre-vingt-dix pour un arbre.

La réserve utile vaut le volume de substrat multiplié par 0,30, capacité de rétention d'un terreau horticole. La demande journalière est majorée de 25 pour cent par rapport à la pleine terre, un contenant exposé s'asséchant plus vite qu'un même volume enterré. La sortie est une dose et un intervalle, l'intervalle étant borné à sept jours.

Exemple pour une tomate en pot de trente litres au 20 juillet en climat océanique dégradé : 8,4 litres tous les trois jours.

Deux points à traduire dans le conseil : l'arrosage lessive les éléments nutritifs, ce qui lie l'arrosage à la fertilisation sur ce mode de culture, et un apport supérieur à la réserve utile ruisselle sans profiter à la plante.

## Objets de la base

Table `et0_reference`, cent vingt lignes, clé sur climat et quinzaine, avec la source par ligne.

Table `saison_vegetation`, cinq lignes, quatre repères de quinzaine par climat.

Table `plant_kc_quinzaine`, trente-sept mille huit cents lignes, coefficient cultural par plante, climat et quinzaine, reconstruite par la fonction `recalculer_kc_quinzaine`.

Colonnes ajoutées à `plants` : `kc_ini`, `kc_mid`, `kc_end`, `kc_source`, `kc_modele`, `cycle_ini_j`, `cycle_dev_j`, `cycle_mid_j`, `cycle_late_j`, `irrigation_mode`, `contenant_litres_defaut`.

Colonne ajoutée à `garden_plants` : `contenant_litres`. Colonne ajoutée à `plant_phases` : `source`.

Fonctions : `quinzaine_de`, `kc_courbe`, `kc_a_date`, `litres_jour`, `arrosage_contenant`, `reprise_dose`, `arrosage_reprise`, `recalculer_kc_quinzaine`.

Vue `arrosage_plante_quinzaine` : coefficient, évapotranspiration, surface, litrage par plante, litrage par mètre carré, unité d'affichage, niveau, dose et intervalle de reprise pour un sujet de première saison.

Vocabulaires : `irrigation` à quatre valeurs, `kc_modele` à deux valeurs, `arrosage_niveau` à trois valeurs.

## Unité et niveau d'affichage

Le litrage par plante n'est lisible que si la plante occupe une surface significative. En dessous de cinq centièmes de mètre carré, cas des semis denses comme le radis, la carotte ou la mâche, la vue bascule sur le litrage par mètre carré, qui vaut exactement l'évapotranspiration multipliée par le coefficient cultural.

Seuils du niveau affiché. En unité par plante : faible en dessous de 0,3 litre par jour, intermédiaire jusqu'à 1,5 litre, soutenu au-delà. En unité par mètre carré : faible en dessous de 2 litres par jour, intermédiaire jusqu'à 4 litres, soutenu au-delà.

## Vérification

Valeurs produites au 16 juillet en climat océanique dégradé, comparées aux repères de terrain courants.

| Plante | Calcul | Repère usuel |
|---|---|---|
| Courge, potiron | 6,56 L/jour | 5 à 10 L/jour |
| Courgette | 3,32 L/jour | 3 à 5 L/jour |
| Tomate | 2,11 L/jour | 1,5 à 2,5 L/jour |
| Maïs doux | 1,01 L/jour | 1 à 1,5 L/jour |
| Fraise | 0,45 L/jour | 0,4 à 0,6 L/jour |
| Laitue | 0,39 L/jour | 0,3 à 0,5 L/jour |

Écart entre climats à la même date pour la tomate : 2,07 litres en montagnard, 2,25 en océanique dégradé, 3,06 en méditerranéen.

Pour la reprise, la dose d'un pommier de première année en juillet, vingt litres tous les sept jours, correspond au repère horticole courant de dix à vingt litres par semaine la première année.

## Limites

Le calcul donne la demande de la plante, non le volume à apporter. La pluie vient en déduction et le modèle ne la connaît pas, le chiffre est un besoin par temps sec.

La réserve du sol tamponne sur plusieurs jours. Sept litres tous les trois jours valent mieux que deux litres chaque jour, la valeur quotidienne étant une moyenne.

Les longueurs de stade de la table 11 sont données par région et par période de semis. Une seule ligne représentative a été retenue par culture.

Vingt-quatre fenêtres de semis reposent sur une durée semis-récolte estimée et non sourcée. Elles sont identifiables par la colonne `source` de `plant_phases`.

La station méditerranéenne est en bord de mer à un mètre d'altitude. L'arrière-pays et la basse vallée du Rhône sont plus ventés, donc plus demandeurs.

## État d'avancement

Fait : cent vingt valeurs d'évapotranspiration chargées et vérifiées ; espacement entre rangs complété sur les quatre fiches qui en manquaient ; trois coefficients culturaux et modèle d'application sur les 315 fiches actives ; longueurs de stade sur les cinquante cultures couvertes par la table 11 ; repères de saison de végétation par climat ; cinquante fenêtres de semis ajoutées sur les quarante-cinq fiches qui n'en avaient pas ; modèle de contenant avec volume par défaut, dose et intervalle ; modèle de reprise des ligneux avec dose, intervalle et fin de période d'installation ; table de coefficients par quinzaine et vue de restitution ; vérification sur six cultures, trois climats et six ligneux.

Reste à arbitrer : remplacer les vingt-quatre durées semis-récolte estimées par des valeurs sourcées ; décider si les fenêtres de semis doivent varier par climat, les cinquante lignes ajoutées valant aujourd'hui pour tous les climats.
