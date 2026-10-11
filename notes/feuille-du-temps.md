# Feuille du temps, vingt-quatre heures glissantes

La pastille météo du bandeau ouvre sa propre feuille. **En production depuis le
commit f338b61**, revue par les commits c3ef1ec, 369098a et 863e25d.

## Partage avec la feuille du jour

La date et la pastille météo ouvraient la même feuille, qui portait à la fois
les trois mesures et la prévision. Le partage suit la nature de ce qui est dit :
la date ouvre « Le jour », qui garde l'eau, la lumière et la saison, trois
mesures d'état. La pastille ouvre « Le temps », qui porte la prévision, horaire
puis hebdomadaire. La table des sept jours a suivi le temps.

## Fenêtre retenue

Vingt-quatre heures à partir de l'heure en cours, et non la journée civile. Au
jardin la nuit qui vient pèse autant que la fin de l'après-midi, et à vingt
heures la journée écoulée n'apprend plus rien. La fenêtre traverse donc minuit :
la nuit est lavée dans toutes les voies, minuit porte un trait vertical, et
l'axe nomme le jour suivant à cet endroit.

La charge horaire demande deux jours de prévision, ce qui suffit dans tous les
cas puisque la fenêtre part au plus tard de vingt-trois heures.

## Ce que ces heures demandent au jardin

Le bloc est en tête, avant le détail : la feuille répond d'abord à la question
qu'on se pose en l'ouvrant. Trois lignes au plus, dont la première parle
toujours de pluie, qu'il en tombe ou non. Les deux suivantes sont les plus
graves parmi celles qui ont un objet ce jour-là.

Les règles, par gravité décroissante : le gel sous un degré, les rafales à
quarante kilomètres par heure ou le vent moyen à vingt-cinq, la chaleur à trente
degrés, l'air saturé au-dessus de quatre-vingt-dix pour cent pendant plus de
quatre heures sous une température douce, le créneau d'arrosage le plus long qui
soit sec, sans vent et hors soleil, et l'indice UV au-dessus de sept.

Chaque règle lit la série et rend une ligne ou rien. Aucune n'est saisie : le
texte se recalcule, et une incohérence entre le conseil et la donnée se voit.

## Trois écritures, au choix et conservé

Le ruban, la liste et les moments. Le choix est gardé dans le stockage local et
retrouvé à la réouverture. La bascule ne redessine que la section, la feuille ne
se recompose pas.

### Le ruban

Sept voies empilées sur le même axe des heures, chacune nommée à gauche et
chiffrée à droite : la température, la pluie, le vent, la couverture du ciel,
l'indice UV, l'humidité de l'air, la pression.

Deux tracés ne partagent une voie que s'ils partagent l'unité et se lisent l'un
par rapport à l'autre. La température porte le ressenti et le point de rosée,
tous trois en degrés, et l'écart entre la courbe et le point de rosée dit
l'humidité mieux qu'un pourcentage. Le vent porte ses rafales. Superposer la
pluie en millimètres et le vent en kilomètres par heure aurait mis deux échelles
sous une seule graduation.

La couverture du ciel et l'indice UV sont des bandes et non des courbes : ce
sont des taux d'occultation et d'intensité, une courbe leur donnerait une
précision qu'ils n'ont pas.

### Agrandissement d'une voie

Sept voies tiennent dans un écran de téléphone au prix d'une hauteur qui
n'excède pas quatre-vingt-six points. Une courbe y garde peu de relief, et le
dessin n'a la place ni des valeurs heure par heure, ni d'une graduation serrée.

Le titre d'une voie dessinée est la commande qui l'agrandit, d'un facteur deux
et demi. Elle seule grandit, les autres gardant leur taille : le quadrillage des
heures reste commun à toute la pile, et une voie plus étroite ou plus large que
les autres ne se lirait plus en regard d'elles. Un second toucher la referme, et
ouvrir une autre voie referme la première. Le signe porté par le titre dit dans
quel sens la commande agit.

Agrandie, chaque voie porte ce qu'elle ne pouvait pas montrer repliée :

La température chiffre une heure sur trois au-dessus de sa courbe et resserre sa
graduation de dix à cinq degrés, ou de cinq à deux. Ses extrêmes gardent leur
étiquette pleine, un jalon au même endroit l'aurait doublée.

La pluie donne la lame de chaque heure arrosée et le risque une heure sur trois
en tête de sa barre pâle. Le cumul, que le titre porte déjà, s'efface alors, et
les barres perdent dix points de hauteur pour que leur chiffre tienne au-dessus
d'elles.

Le vent chiffre sa moyenne une heure sur trois, marque sa plus forte rafale et
pose ses flèches toutes les deux heures au lieu de trois. Deux séries complètes
de jalons se seraient croisées là où les rafales approchent la moyenne.

La couverture du ciel et l'indice UV écrivent leur valeur dans la bande, ce que
la teinte seule ne dit qu'approximativement.

L'humidité gradue aux vingtaines, ce qui passe à côté du seuil de
quatre-vingt-dix, lequel garde son propre filet et son propre chiffre. La
pression descend au pas de deux hectopascals, cinq n'ayant donné qu'un ou deux
repères sur une fenêtre qui en fait six.

Les jalons s'arrêtent trois heures avant la fin de la fenêtre : les dernières
heures se calent sur le bord droit, là même où les chiffres de la graduation et
des seuils sont posés.

La lecture des tracés, jusqu'ici sous une commande à elle, paraît avec
l'agrandissement : c'est le moment où l'on regarde la voie de près. Les trois
voies qui n'en avaient pas en ont reçu une.

L'agrandissement recompose le ruban entier, la hauteur d'un dessin ne se
changeant pas sans le redessiner. L'heure lue est reposée ensuite, et le
défilement rattrapé pour que la voie touchée garde sa place à l'écran : sans
quoi une voie ouverte en bas de pile emmènerait le doigt hors du champ.

### Hauteur des voies et graduation

La voie de la température tenait soixante-six points, dont quarante-six pour
l'amplitude : dix-sept degrés d'écart s'y écrasaient à moins de trois points par
degré, et une journée d'août rendait un relief plat. Elle tient quatre-vingt-six
points, dont soixante-six pour l'amplitude.

Aucune voie n'avait de graduation verticale : une bosse se lisait sans dire de
combien elle monte. La température porte des repères horizontaux chiffrés, au
pas de cinq degrés, ou de dix quand la journée en couvre plus de vingt-quatre.
Un pas fixe aurait donné un seul repère les jours calmes, et une graduation à un
trait ne gradue rien.

Les chiffres sont posés après les tracés, non avant, et portent un liseré de la
teinte du papier : un filet se laisse traverser par une courbe, un nombre coupé
par elle ne se lit plus.

### Échelles

L'humidité partait de zéro : une journée passant de cinquante-cinq à
quatre-vingt-onze pour cent tenait dans le tiers haut de la voie, les deux
autres tiers restant remplis sans rien dire. Elle part de la dizaine sous le
plancher du jour, sans jamais dépasser soixante pour cent, ce qui garde le seuil
de quatre-vingt-dix dans la voie. Le pied de la bande n'étant plus le zéro, il
porte son chiffre : sans lui, la hauteur remplie se lirait comme une part de
cent.

La pression épousait l'écart mesuré à huit dixièmes d'hectopascal près : une
journée sans mouvement rendait une courbe agitée, aussi ample qu'une vraie
chute. La fenêtre ne descend pas sous six hectopascals, et une graduation aux
cinq hectopascals dit lesquels. Un frémissement se lit à plat, une baisse se
voit tomber.

### Trait et teinte

Les tracés allaient de 1,1 à 1,8 point de large sous des opacités de 0,65 à
0,75, et le ressenti partageait la teinte et le trait plein de la température :
les deux courbes se confondaient là où elles se rapprochent, c'est-à-dire
presque partout. La courbe principale passe à 2,4 points, le point de rosée et
le ressenti prennent deux pointillés de motifs franchement distincts, sans
ajouter de couleur.

### Seuils d'action

Deux filets marquent des seuils d'action plutôt que des repères d'échelle :
vingt kilomètres par heure sur le vent, au-delà duquel un traitement dérive, et
quatre-vingt-dix pour cent d'humidité, au-delà desquels le feuillage ne sèche
pas. Ils n'étaient nommés que dans la lecture repliée derrière le titre, et se
lisaient donc comme une graduation sans savoir laquelle. Chacun porte son
chiffre sur le dessin, au bord droit.

### Lecture d'une heure

Un doigt posé sur les courbes désigne une heure : un montant la marque dans
toutes les voies, et chaque plage cède la place à la valeur de cette heure. La
lecture reste après le doigt levé, le doigt cachant sur un téléphone la zone
qu'il désigne.

L'heure retenue est annoncée deux fois, en tête de la pile et en pied. Le ruban
fait plus de quatre cents points de haut : une seule annonce, en pied, sortait
du champ dès que le doigt lisait les premières voies, et rien ne disait alors de
quelle heure venaient les valeurs affichées. La lecture ne s'engage que sur le
dessin, toucher l'annonce ayant sans cela lu l'heure qui se trouve sous ce mot.

### La liste

Une ligne par heure, vingt-quatre lignes, et douze colonnes : température,
ressenti, vent, rafales, lame, risque, humidité, point de rosée, couverture
nuageuse, indice UV et pression, l'état du ciel tenant dans une icône. Les
unités montent dans l'entête, ce qui rend à chaque cellule la place de son
chiffre. Douze colonnes ne tiennent pas dans la largeur d'un téléphone : la
table défile de côté dans son cadre, l'heure restant collée au bord gauche, sans
quoi une valeur lue au milieu du défilement ne se rattacherait plus à rien. Le
ressenti se tait quand il vaut le thermomètre.

L'heure en cours est surlignée, la coupure de minuit est annoncée par le jour
qui commence. Les flèches pointent dans le sens où le vent souffle,
l'abréviation dit d'où il vient.

### Les moments

Les tranches suivent les bornes civiles de six heures, la matinée, l'après-midi,
la soirée et la nuit. Six heures comptées depuis l'heure courante n'auraient rien
dit, alors que ces noms se comprennent seuls. Les deux bouts de la fenêtre sont
donc rognés, et une tranche d'une heure en fin de fenêtre est un reste et non un
moment : elle est retirée.

## Données ajoutées

La charge horaire passait de trois grandeurs à quatorze : température, ressenti,
point de rosée, humidité relative, lame de pluie, risque de pluie, code de
temps, couverture nuageuse, pression au niveau de la mer, vent moyen, rafales,
orientation du vent, indice UV, et jour ou nuit. Une seule requête, environ neuf
kilo-octets, mise en cache une heure comme le reste.

Le nom du cache de météo est passé à `v4`. Une charge enregistrée par la version
précédente n'a ni les rafales ni le risque de pluie, et aurait rendu une feuille
muette pendant une heure. La série se refuse aussi à s'ouvrir si les rafales
manquent, ce qui couvre le cas d'un cache d'une autre origine.

## Doublure des essais

La série horaire de la doublure ne portait qu'une journée, celle de la veille de
l'horloge figée, et trois variables. Elle porte maintenant quarante-huit heures
et les quatorze grandeurs, en une seule série continue.

La continuité a demandé de générer les deux jours ensemble plutôt que l'un après
l'autre. Chaque journée générée pour elle-même repartait de son minimum à minuit,
ce qui posait une marche de cinq degrés au changement de jour, lisible à l'écran
comme un défaut de l'affichage et non comme un défaut de la doublure. La
température passe donc par deux repères quotidiens, son minimum au lever et son
maximum trois heures et demie avant le coucher, avec une demi-cosinusoïde entre
deux repères, la veille et le lendemain donnant les repères qui débordent.

L'horloge des essais est désormais posée à l'heure de Paris. Le fuseau du
conteneur décalait l'heure en cours de deux heures, ce qui ne se voyait nulle
part avant que la série horaire ne s'en serve.

## Contrôles automatisés

Neuf cent douze contrôles sont joués par `npm run essais`, dont soixante-seize
dans la suite `outils/essais/temps.mjs`.

Elle vérifie le partage des deux feuilles, la composition du bloc de tête, les
sept voies du ruban avec leur nom, leur valeur et leur largeur commune, le départ
de la fenêtre à l'heure en cours et sa traversée de minuit, les douze colonnes de
la table et son défilement latéral, l'alignement des tranches sur les bornes
civiles, et la conservation de l'écriture retenue d'une ouverture à l'autre.

Huit contrôles portent sur la graduation : la température porte au moins deux
repères en degrés d'un pas constant, sa voie tient quatre-vingt-six points, les
seuils du vent et de l'humidité disent leur chiffre, le pied de la bande
d'humidité passe sous la plus basse valeur du jour, la pression porte un repère
en hectopascals, et dans chaque voie les chiffres sont posés après les tracés
dans l'ordre du dessin.

Sept contrôles portent sur l'agrandissement : au repos aucune voie n'est
agrandie et aucun jalon n'est écrit, chaque voie dessinée porte le signe de sa
commande, la voie touchée devient deux fois et demie plus haute pendant que les
autres gardent leur taille et que toutes gardent la largeur de l'axe, elle
découvre ses valeurs heure par heure et la lecture de ses tracés, sa graduation
se resserre, ouvrir une autre voie referme la première, et un second toucher
rend la pile à son état de départ.

Deux contrôles portent sur l'accord des trois écritures : le minimum et le
maximum de température lus sur les moments doivent être ceux lus sur les heures.
Un écart signalerait une erreur de découpage, qui ne se verrait pas à l'oeil.

## Points ouverts

1. L'humidité et la pression restent les deux voies les moins actionnables du
   ruban. Elles ont été demandées explicitement ; si le bloc paraît long à
   l'usage, les retirer tient en deux lignes.
2. Le créneau d'arrosage ne consulte pas encore le bilan hydrique du sol, qui
   décide pourtant s'il faut arroser. Il ne dit que le moment favorable, pas la
   nécessité.
3. La voie du vent garde une échelle partant de zéro, plancher à trente
   kilomètres par heure. Un jour sans vent y rend une courbe collée au bas de la
   voie, ce qui est honnête mais peu lisible ; le traitement retenu pour
   l'humidité s'y transposerait.
4. L'agrandissement ne se garde pas d'une ouverture de la feuille à l'autre. Une
   voie que l'on consulte toujours agrandie demande de la rouvrir à chaque fois ;
   la conserver dans le stockage local tient en deux lignes, si l'usage le
   demande.
