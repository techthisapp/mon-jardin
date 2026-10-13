# Fiche de plante allégée

Note du 13 octobre 2026. Quatrième lot du chantier de simplification ouvert par
l'audit de `annee-a-la-quinzaine.md`.

## Constat

L'audit relevait trois points. L'en-tête porte, avant les onglets, la pastille
du type, celle du climat, trois jauges, la toxicité et le conseil général. Le
besoin en eau paraît dans deux onglets. L'onglet « Au jardin » est un
formulaire toujours ouvert : pour un seul emplacement, une liste de zones, un
champ de quantité, un bouton de retrait, puis une liste de lieux et un bouton
de placement.

## Décisions

Jérôme a retenu :

1. de retirer de l'en-tête la seule pastille du type, que la liste d'où l'on
   vient dit déjà. Le climat, les jauges, la toxicité et le conseil général
   restent ;
2. de garder le besoin en eau aux deux endroits. Le chiffre du jour et la
   courbe de l'année ne répondent pas à la même question ; le constat de
   l'audit était une fausse redite ;
3. de faire lire l'onglet « Au jardin » avant de le faire modifier.

## Réalisation

L'en-tête ne porte plus de pastille de type. La rangée des pastilles ne paraît
que si la plante a un niveau d'adaptation au climat du jardin.

Chaque emplacement se lit en une ligne de 44 points : l'espace, la zone le cas
échéant, la quantité, par exemple « Potager, Carré du fond, quantité 6 », et le
mot « Modifier ». Toucher la ligne déplie la liste des zones, le champ de
quantité et « Retirer » ; la toucher de nouveau les replie. Changer de zone
garde la ligne dépliée sur le nouveau lieu.

Le choix d'un nouveau lieu se replie derrière le lien « Placer ailleurs », ou
« Placer dans un espace » pour une plante sans emplacement, avec « Annuler » une
fois déplié. L'état déplié tient à la plante : ouvrir une autre fiche le
remet à zéro.

La quantité n'a pas d'unité en base. La ligne dit donc « quantité 6 » et non un
nombre de pieds.

## Mesures

Fiche de la tomate, jardin de dix-sept plantes, au 2 août, à 393 points de
large, par `outils/audit/interface.mjs` :

| Onglet | Avant | Après |
|---|---|---|
| En ce moment | 935 points | 909 points |
| Toute l'année | 1 024 points | 998 points |
| Identité | 723 points | 697 points |
| Au jardin | 538 points, 11 contrôles | 509 points, 8 contrôles |

Les vingt-six points gagnés partout sont ceux de la pastille du type.

## Contrôles

`outils/essais/journal.mjs` contrôle la ligne de lecture, l'absence de toute
commande avant qu'on la demande, le dépliage de la zone, de la quantité et du
retrait, le repli, le déplacement vers Sans zone, le retrait et le choix d'un
lieu replié derrière son lien. `outils/essais/espaces.mjs` déplie la ligne
avant de changer de zone.
