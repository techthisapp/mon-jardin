# Feuilles du temps et de l'eau allégées

Note du 13 octobre 2026. Sixième et dernier lot du chantier de simplification
ouvert par l'audit de `annee-a-la-quinzaine.md`.

## Constat

La feuille du temps empilait, dans l'onglet des heures, sept grandeurs en
courbes ou en bandes : température, pluie, vent, couverture du ciel, indice
UV, humidité et pression. Les quatre tuiles de tête donnent déjà le ressenti,
le vent, l'humidité et l'UV de l'heure.

La feuille de l'eau mêlait la décision d'arroser, le poste de mesure, six
champs de relevés sous un paragraphe d'explication, et le choix de la texture
du sol, qui est un réglage du jardin.

## Décisions

Jérôme a retenu :

1. de garder la température, la pluie et le vent, qui décident d'un geste, et
   de replier les quatre autres grandeurs derrière un lien ;
2. de garder les trois modes d'affichage des heures, ruban, liste et moments ;
3. de mettre la texture du sol dans les réglages du jardin, chaque espace ou
   zone pouvant la redéfinir quand on y met une autre terre, dans un carré ou
   un pot par exemple ;
4. de ne laisser ouverte que la ligne de relevé du jour.

## Réalisation

Dans le ruban, un lien « Autres mesures : ciel, UV, humidité, pression » déplie
les quatre voies repliées, puis « Replier les autres mesures » les replie. Une
voie agrandie parmi elles les garde ouvertes. Le choix tient le temps de la
session. Le lien est écarté de la lecture au doigt : le toucher lisait l'heure
qui se trouvait sous lui, et les plages cédaient la place aux valeurs de cette
heure.

Les relevés d'hier et d'avant-hier se replient derrière « Jours précédents ».
Un jour déjà renseigné les garde ouverts, pour qu'une valeur saisie ne
disparaisse pas. L'explication tient en une phrase.

La texture du sol se règle dans la feuille du jardin, sous le climat, par une
liste : non renseigné, sableux, limoneux ou argileux, avec la réserve par mètre
de chacun. Non renseignée, l'aide dit que le calcul la compte limoneuse. La
feuille de l'eau la rappelle en une ligne, avec la réserve retenue sur
quarante centimètres, et un lien « Changer la texture » qui ouvre les réglages
du jardin.

## Texture par lieu

La redéfinition par espace ou par zone existait déjà : le volet « Réglages du
lieu » d'un espace porte une liste « Sol », qui hérite de la valeur du jardin
quand elle est laissée vide. L'aide du réglage du jardin le dit désormais.

Le bilan hydrique, lui, ne lit que la texture du jardin : il calcule une seule
réserve pour tout le jardin. Faire jouer la texture d'un carré ou d'un pot
demande un bilan par lieu, qui est un chantier à part, non engagé.

## Contrôles

`outils/essais/temps.mjs` contrôle les trois voies visibles à l'ouverture, le
libellé du lien et le dépliage des quatre autres. `outils/essais/eau.mjs`
contrôle la seule ligne du jour ouverte, le dépliage des jours précédents,
l'absence du choix de texture dans la feuille, son rappel, le lien vers le
réglage, l'enregistrement de la texture sur le jardin depuis les réglages, et
la réserve recalculée.
