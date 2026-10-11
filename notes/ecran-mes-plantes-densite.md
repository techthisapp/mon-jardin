# Écran des plantes : densité et signaux

## Constat

Mesure de l'onglet « Mes plantes » sur un écran de 390 points de large et 940 de
haut, jardin de 28 plantes réparties dans 3 espaces, un placement par plante.

| Mesure | Avant | Après |
| --- | --- | --- |
| Hauteur avant la première plante | 570 | 413 |
| Part de l'écran occupée par le chrome | 61 % | 44 % |
| Carte de filtres | 229 | 104 |
| Hauteur d'une rangée | 105 | 53 |
| Rangées entières visibles | 2 | 6 |
| Pastilles d'espace posées au repos | 84 | 0 |
| Hauteur totale des 28 rangées | 2875 | 1482 |

La carte de filtres est de 104 points à toutes les largeurs contrôlées, 360, 390
et 430, sans débordement du segment de portée.

## Contrôles visibles et contrôles repliés

Restent dépliés : la recherche sur sa ligne, puis le segment de portée et le
bouton des filtres sur la suivante.

Sont passés dans le panneau replié : le regroupement, sous l'étiquette
« Grouper », par symétrie avec l'écran du moment qui range là le sien ; le filtre
climatique et la légende de la jauge, réunis sous l'étiquette « Climat » ; le
compte des plantes retenues et le bouton « Tout décocher ».

Sous 420 points de large, le bouton des filtres perd son étiquette et ne garde
que son pictogramme, l'étiquette passant dans le nom accessible. Sans cela il
descendait à la ligne et la carte reprenait 45 points.

## Deux niveaux de navigation distingués

Les onglets « Mon jardin » et « Mes plantes » gardent le trait souligné sous
l'onglet actif. Le segment de portée prend le rail creusé du bandeau segmenté,
fond gris et pastille blanche sur la moitié retenue : la forme dit lequel des
deux change d'écran et lequel change le contenu de la liste.

## Compteurs raccordés à la portée

Chaque moitié du segment porte son propre nombre, celui du jardin à gauche,
celui du catalogue à droite. Le bilan « x sur y affichées » ne paraît que
lorsqu'un filtre ou une recherche écarte quelque chose, et son dénominateur est
celui de la portée courante, non celui du catalogue entier.

Les compteurs de groupe et de sous-groupe portent la même écriture, au même
bord.

## Un seul signal de retenue

En portée jardin toutes les rangées sont cochées par construction : la teinte
verte n'y distinguait rien et peignait la liste entière. Le rond porte seul le
signal, la teinte reprend son office en portée catalogue, où elle sépare ce que
l'on cultive de ce que l'on découvre. La règle est portée par
`#listes[data-portee="jardin"]`.

## Espaces d'une rangée

Le lieu occupé passe sous le nom de la plante, à la place du sous-titre, ce qui
n'allonge pas la rangée : le nom et le lieu tiennent dans les 34 points de la
vignette. Une plante sans espace affiche « Placer ».

Un appui sur le lieu déplie le choix complet sur cette seule rangée, sous forme
de pastilles, avec un bouton « Terminé » pour refermer. Ouvrir le choix d'une
autre plante referme le précédent. La cible tactile des pastilles atteint 44
points par une zone étendue en pseudo-élément, la pastille elle-même restant à
32 points.

Un jardin de 8 espaces garde des rangées de 53 points, là où l'ancienne
disposition en aurait posé 8 par rangée, sur deux ou trois lignes.

## Bord gauche de la liste

125 plantes sur 315 n'ont pas de planche. La boîte de vignette est désormais
réservée dans tous les cas, en aplat neutre, pour que les noms démarrent tous à
la même abscisse.

## Mise en sourdine

Le rappel « n tâches masquées, réafficher » a quitté la rangée du catalogue,
où le masquage n'a pas d'objet, pour le pied de l'onglet « En ce moment » de la
fiche. Le panneau étant réécrit par le calcul de l'eau, le geste passe par une
délégation sur `document`, portée par l'attribut `data-lever`.

## Dégagement du bas

La réserve de défilement passe de 112 à 128 points, plus la zone sûre du bas.
Au bas de la liste, la dernière rangée s'arrête 50 points au-dessus du voile qui
porte la barre flottante.

## Contrôles automatiques

La suite compte 495 contrôles, dont 20 nouveaux sur cet écran : hauteur du
chrome, rangement du décochage, compte par portée, bilan conditionnel, teinte
par portée, lieu unique par rangée, absence de pastille au repos, dépli du
choix, cible tactile, sourdine passée dans la fiche, boîte de vignette réservée
et alignement des noms. La doublure d'essai accepte désormais une option
`sourdines`.
