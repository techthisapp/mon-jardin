# Fond vivant et blocs de verre

Note du 16 octobre 2026. Refonte visuelle demandée par Jérôme, après deux
maquettes sur un canevas de conception.

## Demande et décisions

Jérôme a demandé un fond uni, des titres de section collants et une animation
derrière tout l'écran, puis, sur la seconde maquette :

- plus d'en-tête ;
- toute la page fondue dans un fond aux visuels qui évoluent ;
- le fond qui change avec la saison, et selon les trois, saison, heure et
  météo ;
- des feuilles qui tombent sur tous les écrans ;
- les titres de section intégrés aux blocs eux-mêmes ;
- des blocs plus modernes, en transparence.

## Le fond vivant

Un calque `#ambiance`, fixé derrière tout l'écran, remplace le papier tramé, la
prairie de l'écran du jour et le motif du mois de l'en-tête. Il porte cinq
grandes taches de couleur floues qui dérivent et respirent sur des cycles de
34 à 62 secondes, deux silhouettes de branches qui se balancent, et ce qui
tombe : douze éléments, en chute lente de 24 à 40 secondes.

`appliquerAmbiance` le règle à partir de trois choses :

| Élément | Source | Effet |
|---|---|---|
| Saison | la quinzaine : mars à mai, juin à août, septembre à novembre, décembre à février | ton du fond, couleurs des taches, de la branche et de ce qui tombe : feuilles tendres et pétales au printemps, feuilles vertes en été, rousses en automne, flocons en hiver |
| Heure | l'horloge de l'appareil : matin de 5 à 10 h, jour, soir de 17 à 21 h, nuit | une lumière posée sur le fond, dorée, nulle, rosée ou bleutée |
| Météo | le ciel de l'heure en cours, celui de la carte du jour | un voile gris par pluie, blanc par gel ou neige, léger par temps couvert ; la pluie fait tomber moins de feuilles, plus lentement, et la neige des flocons en toute saison |

La fonction s'applique au chargement, à l'arrivée de la météo et tous les
quarts d'heure. Les couleurs changent en fondu, sur trois à quatre secondes.
Quand le système demande moins de mouvement, le fond reste peint et rien ne
bouge ni ne tombe.

Les dessins mensuels de `motifs/` ne sont plus appelés par l'application. Ils
restent dans le dépôt, l'agent de service les déclarant encore.

## Plus d'en-tête

La bande sombre disparaît. Le nom du jardin, la date, le catalogue et le compte
ouvrent la page et défilent avec elle : le nom passe en 23 pixels et à la
ligne plutôt que de se rogner, les deux boutons prennent 44 points et le verre
des blocs. La bande qui protège la barre d'état prend le ton du fond, dépoli.

## Blocs de verre et titres intégrés

Les blocs principaux sont en verre dépoli : fond clair à 72 % d'opacité, flou
de 18 pixels, liseré blanc, coins de 22 pixels. Cela vaut pour le temps du
jour, la synthèse, ce qui fleurit, les gestes de la quinzaine, les types de
« Mes plantes », les filtres, les tuiles et zones d'un espace, la frise et les
cartes d'action.

Le titre de chaque bloc en fait la tête : « Le temps du jour », « À faire cette
quinzaine » avec son compte, « En fleur en ce moment », chaque geste de la
quinzaine, chaque type de plantes, qui devient un bloc à part entière. La tête
est collée en haut de l'écran tant que son bloc y est, puis part avec lui.

## Contrôles

`outils/essais/ambiance.mjs` remplace `motif.mjs` : calque fixe sous le
contenu, disparition du papier, de la prairie, du motif et de la bande sombre,
été au matin par temps clair, hiver et ses flocons, automne et ses feuilles
rousses au soir, voile et chute ralentie par la pluie, arrêt du mouvement, et
titre de la synthèse collé tant que le bloc est à l'écran.

`outils/essais/herbier.mjs` perd ses contrôles de la prairie.
`outils/essais/navigation.mjs` et `outils/essais/reglages.mjs` mesurent le
verre au lieu du papier opaque et de la bande verte.

## Retouches et recette du 16 octobre

Jérôme a trouvé les feuilles trop discrètes et demandé la branche en haut à
droite. Les feuilles passent de 12 à 26 pixels à 18 à 32, et d'une opacité de
20 à 35 % à une opacité de 55 à 79 %, avec une ombre légère. Les deux branches
cèdent la place à une seule, plus grande, qui retombe du coin haut droit et se
balance autour de sa base ; leur teinte passe de 16 à 20 % à 24 à 30 %.

La recette, `outils/audit/recette-ambiance.mjs`, joue les quatre saisons à 320,
393 et 430 points. Elle a relevé un défaut : la branche, retournée autour de
son bord haut, sortait entièrement de l'écran, et la mesure de sa place ne le
voyait pas. Le dessin est maintenant retourné dans son propre cadre, et la
mesure exige une partie visible.

Résultats après correction, à chaque saison et à chaque largeur :

- tout ce qui tombe bouge, douze éléments, sept par temps de pluie ;
- la cadence d'affichage reste à 61 images par seconde ;
- rien ne déborde de côté ;
- le contraste des textes sur le verre va de 6,2 à 14,3, au-dessus du seuil de
  4,5 ;
- la fiche reste opaque ;
- le titre de la synthèse se colle en haut de l'écran dès que la page est assez
  longue pour que le bloc passe dessous ; sur une page courte, il reste à sa
  place, le bloc ne défilant pas jusque-là.

## Têtes de bloc unifiées

Jérôme a relevé que les têtes des zones n'étaient pas unifiées : petites
capitales condensées sur l'écran du jour, casse normale sur l'année et les
plantes, compte collé au nom dans les zones d'un espace, « Sans zone » et les
types d'un espace posés hors de leur bloc, titre de chaque tâche flottant dans
la liste complète.

Toutes suivent maintenant un seul modèle : la pastille ou le pictogramme, le
nom en casse normale, en gras de 15,5 pixels, le compte à droite en chiffres à
chasse fixe, sur la même bande de verre, avec le même retrait de quatorze
points. « Sans zone » et chaque type d'un espace sans zone deviennent des
blocs dont le titre fait la tête. Les sommaires repliables des zones et du
carnet d'un espace prennent la même bande, le chevron suivant le compte. Dans
la liste complète, les cartes d'action restent séparées et la tête de chaque
tâche devient une bande arrondie au-dessus d'elles ; la barre collée de la
liste prend le verre du fond.

`outils/essais/espaces.mjs` lit les plantes sans zone dans leur nouveau bloc.

## Chute ralentie

Jérôme a trouvé que les feuilles tombaient trop vite. Une feuille mettait de 24
à 39 secondes à traverser l'écran, de 34 à 49 par temps de pluie ; elle en met
désormais de 44 à 67, et de 60 à 83 par temps de pluie, soit à peu près deux
fois moins vite. `outils/essais/ambiance.mjs` contrôle ces durées.
