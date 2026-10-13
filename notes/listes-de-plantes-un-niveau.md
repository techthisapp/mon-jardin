# Listes de plantes, un seul niveau

Note du 13 octobre 2026. Troisième lot du chantier de simplification ouvert par
l'audit de `annee-a-la-quinzaine.md`.

## Constat

Mes plantes et le catalogue groupaient sur deux niveaux, le type puis la
catégorie. Pour un jardin de dix-sept plantes, onze titres, dont cinq ne
couvraient qu'une plante. Le compte se disait deux fois : « 17 plantes au
jardin » dans le titre de l'écran, « 17 plantes » sous la recherche.

L'écran d'un espace groupait déjà sur le seul type. Il n'est pas touché.

## Réalisation

Un seul niveau, le type, dans l'ordre du référentiel : légumes, fruits,
aromatiques, ornement. Les plantes s'y suivent dans l'ordre alphabétique. Le
regroupement s'appelle « Par type » et non plus « Par catégorie » ; l'ordre « A
à Z » est inchangé.

La catégorie se lit sous le nom de chaque plante, dans les deux regroupements.
Sous le titre d'un type qui porte son nom, celui des aromatiques, elle se tait.

Le titre de l'écran porte seul le compte. Le bilan sous la recherche ne parle
que lorsqu'un filtre écarte quelque chose : « 12 sur 17 affichées ».

Les règles de style du second niveau sont supprimées.

## Mesures

Jardin de dix-sept plantes, au 2 août, à 393 points de large, par
`outils/audit/interface.mjs` :

| Écran | Avant | Après |
|---|---|---|
| Mes plantes | 1 870 points, 76 mots | 1 618 points, 73 mots |
| Catalogue de l'essai, 34 fiches | 2 912 points, 107 mots | 2 566 points, 123 mots |

Les titres de catégorie retirés sont remplacés par la catégorie écrite sous chaque nom : le nombre de mots baisse au jardin et monte au catalogue.

Le script d'audit mesurait la première `section` non masquée. Depuis le premier
lot, les cartes de geste de l'écran de l'année sont des `section` et passaient
devant l'écran ouvert. Le sélecteur ne prend plus que les écrans, enfants
directs de `main`. Les mesures des deux premiers lots n'en étaient pas
affectées, leurs écrans précédant ces cartes dans le document.

## Contrôles

`outils/essais/reglages.mjs` contrôle l'absence de titre de catégorie, un bloc
par type dans l'ordre du référentiel, la catégorie sous chaque nom sauf à
redire son type, le compte porté par le titre et le bilan muet au repos, puis
parlant sous un filtre.
