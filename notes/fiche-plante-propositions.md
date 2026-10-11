# Fiche plante en bottom sheet, propositions

Maquette jointe, données réelles du référentiel, climat océanique, quinzaine du 30 juillet. Cinq fiches, Tomate, Lavande, Pommier, Framboise et Thym, une par motif de typologie. Aucun script, les écrans sont pré-rendus et la bascule passe par des cases radio en CSS, contrainte imposée par le rendu qui n'exécute pas JavaScript.

## Quatre règles qui commandent tout le reste

Ce que la plante est va au-dessus des onglets, ce qu'il y a à en faire va dessous.

Ce qui a lieu et ce qu'il y a à faire ne se traitent pas pareil. La floraison est un état, la taille et la récolte sont des gestes. L'état tient sur une ligne entre deux filets, le geste prend une carte.

Une information n'est portée qu'une fois. La rusticité est dans la jauge froid, son seuil chiffré dans le bloc Culture. L'exposition est dans la jauge soleil. Le pic de floraison est dans sa carte. Les dates de floraison sont dans la légende du calendrier.

Une marque ne signale que l'exception. Les jauges sont grises sauf celle qui appelle un geste, la provenance ne marque que l'estimation, le silence vaut valeur sourcée.

## En-tête

Motif de typologie en fond, nom et nom latin, une pastille de typologie avec le cycle, la rangée de jauges, les mentions permanentes.

La rangée tient sur deux lignes de deux créneaux, glyphe, points de niveau et libellé alignés horizontalement. Quatre créneaux fixes et toujours dans le même ordre : exposition, eau, butineurs, froid. Son fond est translucide, le motif de typologie se devine dessous, ce qui l'ancre dans l'en-tête au lieu de la poser dessus.

Le niveau zéro se distingue d'une donnée absente par un tiret devant les points vides.

## Onglet « En ce moment »

Ordre : les alertes qui demandent un geste daté, le chiffre du besoin en eau, ce qui a lieu, ce qu'il y a à faire.

Ce qui a lieu tient sur une ligne entre deux filets, pictogramme, libellé suivi de « en cours », fenêtre en gris.

Ce qu'il y a à faire prend une carte par geste, séparée par un écart plus large. Chaque carte porte un bandeau de progression dans la fenêtre du geste, teinté de la couleur de sa famille, repère à la quinzaine en cours, bornes en dessous. Il remplace la ligne de dates et la ligne « se termine dans N semaines ».

Quand aucune phase n'est active, une carte Prochaines échéances remplace les cartes de geste.

## Onglet « Toute l'année »

Ordre : l'année de la plante, le besoin en eau, le pic de floraison s'il est sourcé, la taille à maturité, l'identité, les conditions de culture, ce que la plante apporte.

La carte blanche est réservée aux graphiques. Les blocs descriptifs sont des sections séparées par un filet, sans cadre.

## Le calendrier annuel, en ruban

Axe calendaire, de janvier à décembre, identique d'une fiche à l'autre. La quinzaine en cours est marquée par une bande grise doublée d'un filet vertical net.

L'ordre des voies est fixe : semis à l'abri, semis en pleine terre, plantation, multiplication, taille, fertilisation, protection hiver, protection été, floraison, récolte. Il suit les trois familles de gestes dans l'ordre.

Chaque voie repose sur une piste de fond très légère, sans laquelle une barre de floraison blanche était invisible sur carte blanche.

La colonne de libellés est resserrée, les libellés de plus de treize caractères passant sur deux lignes, centrées sur la barre comme le pictogramme.

La légende se limite à la couleur de fleur et à ses dates.

Une phase portant plusieurs périodes tient sur une seule voie.

## Le calendrier annuel, en roue

La roue a failli être retirée. Elle présentait trois défauts : la boîte du dessin était calculée pour un nombre d'anneaux fixe, si bien que les libellés de mois débordaient sur le titre et sur la légende dès sept anneaux ; aucun anneau n'était nommé, seulement des pictogrammes de onze pixels flottant à l'extérieur des arcs ; et elle n'avait reçu aucune des corrections apportées au ruban.

Elle est réparée plutôt que retirée. La boîte se calcule sur le nombre réel d'anneaux, plus rien ne déborde et une fiche à cinq phases produit une roue plus petite. Chaque anneau porte une piste de fond, donc un arc court se lit contre l'année entière. Le repère de quinzaine est un secteur gris bordé de deux rayons nets. Une légende posée à droite nomme chaque anneau, dans l'ordre, de l'extérieur au centre, avec sa pastille de couleur et son pictogramme. Les pictogrammes flottants ont disparu du dessin.

Une période couvrant l'année entière est tracée en cercle complet et non en arc, faute de quoi elle dégénérait en un point, cas visible sur la récolte du Thym.

Poser la légende à côté du dessin plutôt qu'en dessous ramène la hauteur de la carte d'environ trois cent cinquante à deux cent cinquante pixels. Une roue ne peut pas égaler la compacité d'un ruban, c'est le prix de sa forme.

## Le besoin en eau

Même axe calendaire, même repère de quinzaine. L'étiquette du pic s'écarte de ce repère quand elle le croise.

La courbe commence et finit par un point marqué, extrémités arrondies, au lieu d'un trait vertical qui se lisait comme un axe.

La bande de floraison sous la courbe permet de lire le pic d'eau contre la floraison. Son libellé a été retiré, la voie Floraison du calendrier étant trente pixels plus haut avec la même couleur et sa légende.

## Climat du jardin, règle générale d'affichage

Toute période est filtrée sur le climat du jardin avant d'être dessinée. Une période sans climat vaut partout, une période portant un ou plusieurs climats n'apparaît que dans ceux-là. Le climat est nommé en sous-titre de la carte annuelle.

Sans ce filtre, 108 fiches affichaient jusqu'à quatre barres de protection hivernale là où une seule concerne le jardin.

## Vocabulaire d'affichage

Les clés de la base et les libellés affichés sont deux choses distinctes. Nectar et pollen suivent une même échelle lisible : ne produit pas de nectar, peu de nectar, nectar moyen, riche en nectar, et de même pour le pollen.

## Motifs de typologie

Un motif par typologie : arbre, fruit, ornement, légume, aromatique. Cinq dessins couvrent les 315 fiches. Le motif arbre est réservé aux arbres fruitiers.

Aplats superposés, aucun contour, aucune couleur propre, trois à quatre valeurs d'opacité. Chaque motif est un contour unique par masse. Le motif représente le pied entier, jamais son produit.

Le motif émerge du coin haut droit de l'en-tête, déborde hors du cadre et se dissout par un masque radial. Dispositif temporaire, remplaçable fiche à fiche sans rien changer à la mise en page.

## Taille à maturité

Silhouette humaine d'un mètre soixante-dix, tracée dans un repère normalisé de hauteur cent puis mise à l'échelle. Le motif de la plante est placé dans la plage à la même échelle, base au sol, sommet au milieu de la plage.

## Provenance

Rien sur une valeur sourcée, un petit cercle creux neutre sur une estimation, une ligne de légende présente seulement si la fiche porte au moins une estimation. La marque n'est pas verte, le vert appartenant à la famille mettre en place.

## Système de pictogrammes

Neuf glyphes dessinés, jamais d'emoji, même boîte de seize pixels, même graisse, même géométrie. Les glyphes portent le trait, les motifs portent l'aplat.

## Palette des familles de gestes

| Famille | Phases | Teinte |
|---|---|---|
| Mettre en place | semis à l'abri, semis en pleine terre, plantation, multiplication | `#1baf7a` |
| Entretenir | taille, fertilisation, protection hivernale, protection estivale | `#2a78d6` |
| Profiter | floraison, récolte | `#eb6834` |

Trois teintes au lieu des dix de la table `phases`, laquelle échoue à cinq contrôles d'accessibilité.

## Conseil rattaché à la période

La colonne `plant_advice.phase_id` a été ajoutée, nullable. Un conseil sans période vaut pour toute la phase, un conseil portant une période l'emporte. La vue `public.conseil_par_periode` résout la règle.

Quatre-vingt-deux couples de périodes n'étaient qu'une seule période à cheval sur le nouvel an. Fusionnées, le nombre de phases réellement multi-périodes tombe de 202 à 122.

Seize conseils réécrits par période. Quatorze de taille sur sept fiches, et deux de fertilisation sur la Tomate.

Correction de contenu au passage : le conseil de floraison de la Tomate portait une consigne d'engrais. Elle est revenue à la fertilisation.

## Pic de floraison

Stade BBCH 65, environ la moitié des fleurs épanouies. Douze fiches le portent en valeur sourcée, calculée sur les observations françaises du portail TEMPO. Détail dans `claude/pic-de-floraison-et-controles-croises.md`.

## Points restant à trancher

1. Aucune action n'est possible depuis la fiche, ni « c'est fait », ni « me le rappeler », ni « retirer de mon jardin ».

2. Le chiffre d'eau est générique, 4,4 litres par jour et par mètre carré, alors que le jardin est concret. Relier la fiche au jardin le transformerait en litres à sortir ce soir.

3. Les cinq motifs de typologie, à valider avant d'être posés sur les 315 fiches.

4. Suite du rattachement des conseils à la période sur les 122 phases multi-périodes restantes.

5. Sélection du climat du jardin dans l'application, réglage global ou par jardin.
