# Bandeau du jour, feuilles du jour et repère du calendrier

La date ouvre les mesures du jour depuis le bandeau, sur tous les écrans. Le
calendrier porte son propre repère de mois. **En production depuis les commits
248d79d, 1453889, 71728f6, a02468d et 45646c7.**

## Ce que le bandeau porte

Le bandeau météo tenait trois pastilles de mesure : l'eau, la lumière et la
saison. Elles occupaient un tiers de sa hauteur pour un usage rare. Elles sont
passées dans la feuille du jour, ouverte par une pression sur la date, et le
bandeau a perdu trente-cinq pixels de hauteur.

La date est ensuite montée dans le bandeau lui-même, à la place du climat du
jardin. Ce climat ne change pas d'un jour à l'autre et n'apprenait rien à sa
lecture quotidienne : la pastille de climat ne paraît plus que lorsqu'il reste à
renseigner. La date reste un bouton, se lit en clair `#B9CBBE` sur le fond
sombre, et une pastille ronde de huit pixels l'ouvre à gauche, dans la teinte de
la saison en cours. La mention de quinzaine qui la suivait est retirée : elle ne
disait rien que la date ne dise déjà.

## Ligne de l'année, retirée des deux écrans

La ligne portait l'année réelle en jours, avec les quatre saisons civiles en
bandes de couleur, vingt-trois crans de quinzaine, les douze initiales des mois
et le point du jour. Elle a d'abord quitté « En ce moment », qui parle de la
quinzaine et non de l'année, puis le calendrier, qui porte déjà son axe des
douze mois : elle n'y ajoutait qu'une seconde échelle du même sujet, à une autre
graduation et à un autre endroit de l'écran.

Le dessin subsiste, mais dans la seule feuille de la saison, où il porte les
quatre étapes de la végétation sous le climat du jardin. `dessinRuban(bandes)`
produit les bandes posées en jours, les crans, les initiales, la part à venir
lavée de papier et le point du jour. L'option `fil`, qui ajoutait l'aplomb vers
la date écrite au-dessus, et la règle `.ra-fil` qui la dessinait, sont retirées :
la date n'est plus au-dessus de rien.

La pastille de saison de la date garde sa teinte, calculée sur les saisons
civiles et non sur le ruban de végétation : gris bleu `#AFBCC2` l'hiver, vert
tendre `#A5C596` le printemps, blé `#C7BE79` l'été, terre brûlée `#C9A277`
l'automne.

## Repère du mois en cours sur le calendrier

Trois choses remplacent la ligne, toutes à l'intérieur du tableau.

Une bande verte très pâle `rgba(76,140,63,.06)` couvre la colonne du mois en
cours sur toute la hauteur du tableau, sans bordure. La période retenue par le
filtre porte, elle, un fond plus soutenu et deux filets verticaux : les deux
marques ne se confondent pas.

La case d'en-tête du mois en cours prend un aplat pâle `rgba(76,140,63,.11)` et
son initiale passe en gras sur l'encre pleine. Sous l'initiale, un repère de
deux pixels de haut est coupé en deux segments, un par quinzaine, plein pour
celle du jour et à vingt-quatre pour cent pour l'autre. Le filet en travers de
la case, essayé d'abord, coupait l'initiale en deux.

Les douze cases d'en-tête sont des boutons qui filtrent le tableau sur leur
mois, ce qu'elles étaient déjà. Les moitiés de case ne sont pas cliquables : une
case fait de dix-neuf à vingt-deux pixels de large selon la largeur d'écran, sa
moitié ne se touche pas du doigt. La précision à la quinzaine passe donc par
deux jetons, « 1re quinzaine » et « 2de quinzaine », qui paraissent dans la
barre de filtres dès qu'un mois est retenu et disparaissent avec lui.

### Période retenue, en quinzaines

La variable `moisChoisi`, un indice de mois, est remplacée par `periode`, un
intervalle de quinzaines de 1 à 24 avec son nom écrit. Un mois en occupe deux,
une quinzaine une seule : le filtrage, le bilan et la bande se calculent sur la
même borne aux deux échelles, sans code séparé. `poserBande(id, a, b)` pose
n'importe quelle période sur le tableau, elle sert à la bande du mois en cours
comme à celle de la période retenue.

Le bilan nomme la période retenue avec l'élision correcte, « première quinzaine
d'août » et non « de août ».

## En-tête du calendrier passé au papier clair

Le marquage du mois en cours était écrit pour le bandeau d'en-tête sombre, avec
des aplats blanc cassé à dix pour cent. L'en-tête est passé au papier clair
depuis, dans un bloc de règles postérieur qui l'emporte : les aplats y étaient
invisibles. Le survol, le contour de focus et le marquage du mois en cours sont
donc redéfinis en vert et en encre, à côté des autres règles de l'en-tête clair
plutôt que dans le bloc d'origine.

Deux pièges de spécificité relevés au passage. `.mois-case.en-cours.q1` compte
trois classes et l'emportait sur `.mois-case[aria-pressed="true"]` qui en compte
deux : le mois en cours perdait son aplat de sélection. Et `.bande-courante`,
posée avant `.bande-mois` à égalité de spécificité, se faisait rendre les
bordures qu'elle voulait retirer.

## Bascule des filtres lisible

`#basculeFiltres[aria-pressed="true"]` posait une encre verte pendant que
`.mini[aria-pressed="true"]`, plus bas dans la feuille, posait un fond vert. Le
sélecteur d'identifiant l'emportait sur la couleur seule : le pictogramme, le
mot « Filtres » et le compteur s'écrivaient en vert sur vert. Le défaut
préexistait, il est devenu visible en permanence quand retenir un mois s'est mis
à incrémenter le compteur de filtres.

Une bascule signale qu'un filtre est posé, elle ne retient pas un choix : elle
garde un fond clair `rgba(76,140,63,.12)` et prend l'encre verte, quand un jeton
prend l'aplat plein. Le compteur repasse en pastille verte à chiffre blanc. La
correction vaut pour les trois bascules, sur le calendrier, sur « En ce moment »
et sur la sélection.

## Feuille du jour

Les trois mesures déplacées avaient gardé le style des pastilles du bandeau,
taillé pour un fond vert foncé. Sur le papier de la feuille elles se lisaient en
gris pâle, se repliaient sur deux lignes, et ne portaient que leur valeur :
« pleine » ou « 14 h 49 » ne disent pas de quoi il s'agit.

Chaque mesure est maintenant une carte nommée sur fond de papier, arrondie à
douze pixels. Le nom en tête, en condensé capitale espacée, l'eau, la lumière,
la saison, puis la valeur en gras sur une ligne, suivie de sa précision en encre
douce. Un chevron ferme la carte à droite, et la carte ouvre sa propre feuille.

Trois écritures avaient été maquettées : trois lignes séparées de filets, trois
colonnes en tête de feuille, trois cartes. Les lignes se confondaient avec la
table de prévision qui suit, les colonnes repliaient les libellés longs sur
quatre lignes. La carte est retenue.

La feuille ayant la place que le bandeau n'avait pas, les libellés s'écrivent en
entier : « trois minutes de moins qu'hier » plutôt que « moins trois minutes »,
« gelée début novembre » plutôt que « début nov », « pleine saison » plutôt que
« pleine ».

Une marque ne signale que l'exception : seule la mesure d'eau qui demande un
apport aujourd'hui prend un fond bleuté `#EDF2F7` et une goutte teintée
`#48708F`. Les deux autres restent sur le papier. Un titre de section, « La
semaine », annonce la prévision à sept jours, qui n'était séparée des mesures
par rien.

Les quatre tuiles du bandeau et les pastilles, sans emploi depuis le
déplacement, sont retirées du script et de la feuille de style.

## Chemin du retour

Une feuille appelée depuis une autre n'avait qu'une croix, qui fermait tout.
Elle porte maintenant, au-dessus de son titre, le nom de la feuille qu'elle
recouvre, précédé d'un chevron. Le retour remonte d'un cran, la croix ferme
toujours tout.

La pile est tenue dans le script, pas dans l'historique : `ouvrirVue` empile la
vue quittée quand la feuille est déjà ouverte, `retourFeuille` dépile et
réaffiche, `fermerFeuille` vide la pile. L'historique du téléphone garde son
entrée unique, son geste de retour continue donc de fermer la feuille d'un coup.

## Habillage des trois feuilles

Les cartes des feuilles quittent le cadre blanc bordé d'un filet pour le papier
sans bordure, et leurs titres prennent la casse des sections, en condensé
capitale espacée. Le fond clair portait jusqu'à quatre rectangles empilés par
écran.

L'eau : la jauge, le pourcentage et la conclusion tiennent dans un seul bloc,
c'est une seule lecture. Le seuil de confort se nomme sous son trait plutôt qu'à
l'autre bout de la ligne. Le bleu de la jauge est ramené de `#6BA3DE, #3F7FD0` à
`#7FA9CD, #4A7CA8`, plus proche du papier. Le graphique porte son titre, sa
légende tient sur une ligne en quatre groupes, et le poste de mesure se dit
correctement quand il n'a fourni aucun jour.

La lumière : la course du soleil se dessine en arc au-dessus de l'horizon, la
part écoulée depuis le lever remplie d'un lavis de blé, le disque à l'heure
qu'il est, relié à l'horizon par un fil. Le lever, la durée et le coucher se
lisent sous l'arc, et la tendance donne l'écart avec hier et avec la semaine
passée. Le tableau de quatre lignes qui répétait ces valeurs disparaît.

La saison : les quatre étapes de la végétation sous ce climat sont posées en
ruban d'année, avec le point du jour à sa place, suivi d'une légende nommant les
étapes. Les teintes vont du gris vert du repos `#C3C9C0` au vert franc de la
pleine saison `#6FA35A`, en passant par le vert tendre de la reprise `#A5C596`,
puis la terre du ralentissement `#C9A277`. Le point est en encre, les bandes
vertes n'auraient pas laissé voir un point vert.

## Unités de l'eau

La consigne d'arrosage se dit en litres par mètre carré, l'unité de l'arrosoir,
à la fois sur la carte de la feuille du jour et au pied de l'écran « En ce
moment ». Le millimètre reste à ce qui se mesure : la pluie annoncée, la lame
relevée, le bilan du sol. Un millimètre vaut un litre par mètre carré, et
l'équivalence est enseignée dans la feuille de l'eau.

## Autorité sur l'arrosage

L'alerte de pluie donnait un conseil d'arrosage sans consulter le bilan
hydrique du sol, qui décide pourtant et qui a déjà déduit cette même lame. Elle
est maintenant subordonnée au bilan : elle énonce le fait quand le sol reste en
dette malgré la pluie, se tait quand la mesure d'eau annonce déjà la pluie à
venir, et ne conseille de ne pas arroser que lorsque le bilan le dit.

## Contrôles automatisés

Deux cent soixante-deux contrôles sont joués par `npm run essais`.

La géométrie du ruban a suivi le dessin dans la feuille de la saison.
`outils/essais/calendrier.mjs` l'y mesure en dix contrôles : cinq bandes pour
les quatre étapes, le point dans les bornes du fond, vingt-trois crans dont onze
forts, les douze initiales dans l'ordre, l'initiale d'août marquée, le point à
58,49 pour cent de l'année au deux août, la pleine saison sous le point en
climat océanique dégradé, la teinte d'été sur la pastille de la date, et le
départ de la part à venir au point.

`outils/essais/navigation.mjs` couvre le calendrier là où il est à l'affiche, en
dix-huit contrôles : la ligne de l'année n'y est plus, la bande du mois en cours
tombe à l'aplomb de la case d'août, à sa largeur exacte et sur toute la hauteur
du tableau, la case porte la marque de la première quinzaine, les jetons de
quinzaine attendent qu'un mois soit retenu puis paraissent, la case retenue
prend bien l'aplat de sélection et non le dégradé de quinzaine, la bascule des
filtres garde une encre différente de son fond, la bande se réduit à une
demi-case calée sur la première moitié du mois, le bilan nomme la quinzaine avec
son élision, et « Tous les mois » relâche tout. La suite couvre par ailleurs la
feuille du jour et le chemin du retour.

`outils/essais/eau.mjs` compte dix-huit contrôles, dont les trois scènes de
l'alerte de pluie, dette, confort et attente, et la marque du geste, présente
sur la mesure d'eau quand le sol est en dette, absente quand la pluie est
annoncée. `outils/essais/station.mjs` lit la part des jours mesurés dans la
nouvelle phrase du poste.

## Deux règles dégagées

Une règle écrite pour un fond ne survit pas au changement de ce fond. Les aplats
blanc cassé du marquage de mois étaient corrects tant que l'en-tête était
sombre, et sont devenus invisibles sans qu'aucun contrôle ne le signale : une
couleur juste ne lève pas d'erreur quand elle cesse d'être visible. Les
contrôles de couleur ajoutés mesurent désormais le fond calculé et l'encre
calculée, pas la présence de la classe.

Deux marques de même nature sur le même objet doivent différer par autre chose
que leur intensité. La bande du mois en cours et celle de la période retenue se
distinguent par la bordure, présente sur l'une et absente sur l'autre, et non
par deux niveaux de vert que rien ne permet de comparer à l'oeil.
