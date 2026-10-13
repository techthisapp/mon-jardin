# Écrans du jardin et d'un espace allégés

Note du 13 octobre 2026. Cinquième lot du chantier de simplification ouvert par
l'audit de `annee-a-la-quinzaine.md`.

## Correction de l'audit

L'audit annonçait cinquante contrôles visibles sur l'écran d'un espace. Le
script comptait le contenu des zones repliées : dans Chromium, ce qui se tient
dans un `details` fermé garde ses boîtes, et seul `checkVisibility` l'écarte.
Le filtre de visibilité de `outils/audit/interface.mjs` l'emploie désormais.
Mesuré ainsi, l'écran d'un espace porte vingt contrôles, la liste complète du
jour quarante-six et non cent trente-six.

Les mesures des lots précédents comparaient des écrans sans `details` replié,
ou deux états mesurés de la même façon ; elles restent valables.

## Constat

Sur l'écran du jardin, le champ « Nouvel espace » et son paragraphe d'aide
restaient affichés en permanence, et la tuile « Non placées » paraissait même
vide.

Dans un espace découpé en zones, les plantes sans zone se groupaient encore
par type sous le titre « Sans zone » : deux niveaux de titres, ceux que le lot
des listes de plantes avait retirés ailleurs.

## Réalisation

Le formulaire d'un nouvel espace se replie derrière le lien « Ajouter un
espace », comme l'ajout d'une plante et d'une zone sur l'écran d'un espace. Le
lien l'ouvre et place le curseur dans le champ ; une création le referme. Un
jardin sans espace l'a ouvert d'emblée, avec son paragraphe d'aide, qui ne
paraît que dans ce cas.

La tuile « Non placées » ne paraît que lorsqu'une plante n'est placée nulle
part.

Dans un espace découpé en zones, la zone est le seul niveau de lecture : les
plantes sans zone, comme celles d'une zone, se suivent dans l'ordre
alphabétique, sans titre de type. Un espace sans zone garde ses titres de type,
qui sont alors son seul niveau.

La bascule entre liste et mosaïque reste : la retirer ôterait une fonction.

## Mesures

Jardin de dix-sept plantes, au 2 août, à 393 points de large :

| Écran | Avant | Après |
|---|---|---|
| Jardin | 6 contrôles, 45 mots | 4 contrôles, 15 mots |
| Potager, deux zones | 1 046 points, 68 mots | 929 points, 62 mots |

## Contrôles

`outils/essais/espaces.mjs` contrôle l'absence de tuile pour des non placées
absentes, le formulaire replié derrière son lien et son ouverture, l'absence de
titre de type dans un espace découpé en zones, l'ordre alphabétique de ses
plantes sans zone, les titres de type gardés dans un espace sans zone, et
l'absence de titre de type sous un filtre de tâche.
