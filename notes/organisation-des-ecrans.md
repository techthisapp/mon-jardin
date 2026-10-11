# Organisation des écrans

Note de conception et suivi des livraisons. Les six sont en production, commits
0b5b39b, c62cdbd, a3133a3, 2cfe5ce et 60035fb, la quatrième ayant été absorbée
par la troisième.

## État de départ

Sept destinations de premier rang, dont quatre n'étaient pas déclarées.

La barre du bas en portait trois : « En ce moment », le bouton rond central qui
menait au jardin, et « Calendrier ». L'en-tête en cachait quatre autres derrière
du texte : le nom du jardin ouvre ses réglages, la date ouvre la feuille « Le
jour », la pastille météo ouvre « Le temps », le bouton de coin ouvre le compte.
Rien dans leur forme ne disait qu'il s'agissait de boutons.

Le bouton « Noter » flottait au-dessus du contenu, au coin bas droit, et
recouvrait la dernière rangée de toutes les listes.

Le catalogue de 315 fiches demandait trois appuis. Le journal du jardin n'avait
pas d'adresse : il se rattrapait depuis la feuille des réglages du jardin,
depuis le pied d'un espace, depuis l'onglet d'une fiche et depuis le formulaire
de note.

L'en-tête occupait 160 points sur les quatre écrans, dont un bloc météo de
70 points qui n'était actionnable que sur un seul.

## Principes retenus

La barre déclare les destinations et l'acte. Le rond central revient à l'acte,
selon la convention des barres mobiles, et cesse d'être une destination.

Une information se lit là où elle sert. Le temps qu'il fait appartient à ce
qu'il y a à faire aujourd'hui, non à un en-tête permanent.

Un contrôle se tient au niveau où il agit. Un réglage posé sur un écran et lu
sur un autre ne se rattache à rien de visible.

La barre du bas ne porte que ce qui appartient au jardinier. Ce qui appartient à
l'application se tient dans l'en-tête : le catalogue de référence y rejoint le
compte et les réglages du jardin.

Un acte qui produit une trace ouvre la trace derrière lui. Écrire au journal,
c'est aussi le relire : la saisie se pose en feuille sur le carnet, qui reste à
l'écran quand la feuille se baisse.

Deux corpus distincts, deux adresses : les plantes du jardin dans la barre, le
catalogue dans l'en-tête. Le sélecteur de portée disparaît avec cette
séparation.

## Barre de navigation

Cinq fentes : quatre destinations et un acte.

Dans l'ordre, Jour, Année, le rond « Noter », Jardin, Plantes. Les deux échelles
de temps se tiennent à gauche, le jardin et ses plantes à droite, l'acte au
centre, sous le pouce.

Chaque fente porte une icône de 20 points surmontant son mot, en capitales
condensées de 10,5 points. La barre mesure 62 points de haut, plus la zone sûre.

Le premier libellé devait être « Aujourd'hui ». Mesuré sur quatre largeurs, il
déborde de sa fente à 320, 360 et 393 points, et ne tient qu'à 430 : les fentes
font respectivement 52, 62, 70 et 80 points. C'est donc « Jour », qui répond à
« Année ». Sous 340 points de large, seule la fente ouverte garde son mot.

Le rond central mesure 52 points, dépasse de dix points par le haut, jamais par
le bas, et porte un crayon. Tant que le carnet est à l'écran, il porte un anneau
vert : c'est la seule marque de la barre, aucune fente ne répondant du carnet.

La marque de l'application, la tige à deux feuilles, a quitté la barre pour
l'en-tête, à gauche du nom du jardin.

Le bouton flottant « Noter » a disparu.

## En-tête

Sur tous les écrans : la marque, le nom du jardin qui ouvre ses réglages, la
date, le livre du catalogue, le bouton de compte. Mesuré à 87 points contre 160
auparavant.

La date ne porte plus de geste, la feuille « Le jour » étant supprimée. Le nom
du jardin est la seule destination non déclarée qui reste.

Le livre mesure 32 points et s'enfonce tant que le catalogue est ouvert. Son
ajout a resserré le haut de l'en-tête : espacement de 9 points, titre de 21,
bouton de compte de 34, faute de quoi le nom du jardin se rognait.

Le motif du mois est passé de 202 sur 179 points à 111 sur 98 : à sa taille
d'avant, la ligne de coupe du bandeau ne laissait voir que 117 de ses 220 unités
de hauteur, et les deux tiers des animations se jouaient dessous.

## Écran Jour

Le temps et les trois mesures du jour, dans une seule carte : le grand chiffre,
l'état du ciel, les températures du jour et de la nuit, le vent, puis un filet,
puis l'eau, la lumière et la saison. Le haut ouvre la feuille « Le temps »,
chaque mesure ouvre la sienne.

Les mesures sont posées en trois colonnes et non en trois rangées. Empilées,
elles auraient repoussé la première tâche hors de l'écran. La tuile de l'eau
porte la décision en trois mots, la feuille garde la phrase entière.

Suivent la vigilance et les alertes du temps, ce qui est en fleur, la synthèse
avec ses lignes de tâche, le pied qui compte et mène à la liste complète, puis
le dicton, qui ferme l'écran.

Un bloc de filtres s'ouvrait après le dicton, à trois cents points du bouton qui
l'ouvrait. Il est retiré, ses trois contrôles étant traités à la section
suivante.

Mesuré à 390 sur 844 points : en-tête de 87 points, carte du jour de 159, et
deux lignes de tâche visibles sans défiler.

## Liste complète du jour

Elle s'ouvre par « Tout voir » et porte, dans sa barre collante, le chevron de
retour, le regroupement puis le rail des sections.

Le regroupement Tâche et Espace était posé sur la vue d'ensemble, où il ne
changeait rien : la synthèse reste ordonnée par tâche quel que soit le réglage,
la valeur n'étant lue qu'ici. Il est descendu au niveau où il agit, et commande
aussi les puces du rail. Le choix se garde d'une ouverture à l'autre.

Le regroupement mesure 114 points et ne se comprime pas ; le rail défile, lui
seul pouvant le faire. À 320 points de large il reste 126 points de rail.

Le filtre par tâche a disparu : il doublait la synthèse, qui donne déjà une
ligne par tâche avec son compte et son chevron, et son état ne survivait pas à
un rechargement.

Le filtre par espace a disparu du jour : la liste groupée par espace donne la
même lecture sans rien écarter. Sa valeur était partagée avec l'écran de
l'année, qui a sa propre rangée de pastilles, si bien que choisir un espace d'un
côté filtrait l'autre sans le dire. Elle appartient désormais au seul écran de
l'année et porte son nom.

## Écran Année

La frise annuelle et ses filtres, dont les pastilles d'espace, seules à porter
ce choix depuis la sixième livraison.

## Écran Jardin

Les tuiles d'espaces, puis le détail d'un espace avec ses zones. Aucun onglet :
la fente ouvre droit sur les espaces.

Le titre porte le nom de l'espace ouvert, jamais « Mon jardin », qui répétait
celui de la fente.

## Écran Mes plantes

Les plantes du jardin seulement, avec la recherche, les filtres et le
groupement. Un titre d'écran nomme la vue et compte les plantes.

Un lien au pied de la liste mène au catalogue, seul endroit d'où l'on ajoute.

## Écran Catalogue

Les 315 fiches, mêmes filtres, mêmes commandes. Il s'ouvre par le livre de
l'en-tête, non par la barre : aucune fente n'est marquée quand il est à
l'écran, le livre porte seul la marque.

Le segment « Au jardin, tout le catalogue » a disparu : la portée se règle avec
la destination. Le compte qu'il portait revient au bilan, qui annonce
« 34 plantes » au repos et « 12 sur 34 affichées » sous un filtre.

## Écran Carnet

Le journal du jardin, par mois, avec ses photographies. Il n'a pas de fente : il
s'ouvre derrière la feuille de saisie, quand l'acte est touché.

Il retient le contexte du moment où le rond a été touché : la plante depuis une
fiche, le lieu et ses zones depuis un espace, le jardin entier ailleurs. Un
titre d'écran nomme ce contexte et compte les entrées, un lien « Tout le
jardin » rend la vue au jardin entier.

Baisser la feuille laisse le carnet à l'écran. Retoucher le rond rappelle la
feuille. Les deux renvois qui menaient au journal, dans le formulaire de saisie
et dans les réglages du jardin, n'ont plus d'objet et sont supprimés.

## Feuilles

Restent en feuille, consultations ponctuelles : la fiche d'une plante, Le temps,
L'eau, La lumière, La saison, La vigilance, Le lieu, Le compte, Les
photographies écartées, la note, et les réglages du jardin.

« Le jour » et « Journal du jardin » ont disparu, leur contenu étant devenu un
bloc d'écran et un écran.

## Livraisons

**Première, commit 0b5b39b.** La barre : cinq fentes, icône sur mot, le rond
devient Noter, le bouton flottant disparaît, la marque monte dans l'en-tête. 763
contrôles, aucun échec.

**Deuxième, commit c62cdbd.** L'en-tête et l'écran du jour. La météo et les
trois mesures descendent dans une carte unique, la feuille « Le jour » est
supprimée, la date devient du texte, le motif du mois est mis à la nouvelle
mesure de l'en-tête. 760 contrôles, aucun échec.

**Troisième et quatrième, commit a3133a3.** Le jardin à trois onglets, le carnet
adressable, et le retrait du segment de portée. Les deux étaient les deux
moitiés du même partage : séparer les corpus retire le segment, et le retirer
oblige à nommer les deux destinations. 762 contrôles, aucun échec.

**Cinquième, commit 2cfe5ce.** Le carnet passe derrière l'acte, le catalogue
monte dans l'en-tête, Mes plantes prend la fente libérée, le jardin perd ses
onglets. 775 contrôles, aucun échec.

**Sixième, commit 60035fb.** Le bloc de filtres quitte l'écran du jour. Le
regroupement descend dans la barre de la liste complète, les deux filtres sont
retirés, le choix d'espace revient au seul écran de l'année. 833 contrôles,
aucun échec.

## Conséquences mesurées

Destinations déclarées : de trois à quatre, plus l'acte et le livre.
Destinations cachées : de quatre à une.

Catalogue : de trois appuis à un.

Carnet : une adresse stable, prise du contexte, au lieu de quatre chemins
d'accès et aucune adresse.

Jardin : de trois appuis à un pour atteindre un espace, la rangée d'onglets
ayant disparu.

En-tête : 73 points rendus au contenu sur tous les écrans.

Écran du jour : le dicton le ferme, plus rien ne le suit.

La dernière rangée de toute liste cesse d'être recouverte.

## Défaut corrigé au passage

La puce active du rail se cherchait par `offsetLeft`, compté depuis la barre
collante et non depuis le rail. Tout ce qui précède le rail s'ajoutait à la
position, si bien que l'ajout du regroupement le faisait défiler de 134 points
au delà de la puce à montrer. L'écart se mesure maintenant d'une boîte à
l'autre.

## Reste ouvert

Le carnet sans fente est un pari sur l'usage : il ne se trouve qu'en touchant
l'acte. À revoir après quelques semaines d'usage réel.

Le nom du jardin est la dernière destination non déclarée. Sa forme de bouton
mériterait d'être plus visible.

## Contrôles

`outils/essais/reglages.mjs` porte la barre et l'en-tête : l'ordre des cinq
fentes, le dessin et le mot de chacune, l'acte qui n'est pas une destination,
l'absence de bouton flottant, le dépassement du rond, la marge basse du contenu,
aucun mot rogné, le livre qui ouvre le catalogue et s'enfonce, l'absence de
fente marquée sur le catalogue, le jardin sans onglet, le titre des deux écrans
de plantes, l'absence du segment de portée et le bilan qui porte le compte.

`outils/essais/navigation.mjs` porte l'en-tête et l'écran du jour : la date qui
n'est plus un bouton, l'en-tête sans météo, le bloc du jour en tête d'écran, ses
trois mesures nommées et sur une seule ligne, la première tâche visible sans
défiler, la disparition de la feuille du jour, et le fait que le bloc ne suit
pas sur les autres écrans.

`outils/essais/journal.mjs` porte l'acte et le carnet : le carnet ouvert
derrière la feuille, la feuille baissée qui laisse le carnet à l'écran, l'anneau
du rond qui la rappelle, le contexte retenu et son lien de retour au jardin
entier, et la disparition du renvoi au journal dans le formulaire.

`outils/essais/quinzaine.mjs` porte les deux bords de la quinzaine : la phrase
des ouvertures, le partage avec les marques de ligne, les deux liens et le
contenu des deux niveaux qu'ils ouvrent.

`outils/essais/regroupement.mjs` porte le retrait du bloc de filtres et le
regroupement descendu : le pied réduit au compte et à la liste, le dicton qui
ferme l'écran, l'ordre des trois éléments de la barre, le découpage par tâche
puis par espace, le rail qui montre sa première puce, la tenue à 320, 360 et
430 points, le choix retenu d'une ouverture à l'autre, et le filtre d'espace de
l'année qui ne touche plus au jour.

`outils/essais/largeurs.mjs` porte la tenue en largeur des quatre écrans de la
barre, à 320, 360, 390 et 430 points.

Les raccourcis de `commun.mjs` : `ouvrirListeDesPlantes` passe par le livre de
l'en-tête, `ouvrirMesPlantes` par la quatrième fente, `ouvrirMonJardin` par
celle du jardin, `ouvrirMesure` ouvre une mesure depuis l'écran du jour. Une
suite peut aussi demander une autre date, la météo figée étant déplacée
d'autant.
