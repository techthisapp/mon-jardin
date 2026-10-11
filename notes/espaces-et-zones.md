# Espaces et zones du jardin

Les sept étapes sont en production, commits ad2cf83, 22c575a, 6ab8ee1 et
f07e018. La refonte visuelle de l'écran d'un espace suit, commit 31f999d, puis
le dégagement du fil de lecture et le journal atteint de partout, commit
c77b5dc, puis les quatre gestes du découpage, commits 30b8aed et d0d3d17, puis
les pastilles filtrantes et l'accord des comptes, commit 9648f92.

## État de départ mesuré

Deux jardins, onze espaces, cinquante-quatre plantes au jardin, cinquante-deux
placements. Le potager portait dix-neuf plantes et trois expositions
différentes, l'ornement dix-huit plantes et quatre : un espace mélangeait des
situations que rien ne permettait de distinguer.

Le champ `garden_plant_espaces.notes` n'était renseigné sur aucune ligne,
`garden_plants.contenant_litres` non plus. Seize placements portent une
quantité. La reprise de données a donc été gratuite pour ces deux champs.

Le catalogue actif compte trois cent quinze fiches, dont deux cent treize
vivaces, soixante et onze annuelles et trente et une bisannuelles au sens
botanique. Trente-cinq fiches déclarent en outre une conduite annuelle et
quatre une conduite bisannuelle, ce qui rattrape la tomate, le poivron et les
autres solanacées botaniquement vivaces mais replantées chaque année.

## Modèle

Une zone est un espace à l'intérieur d'un espace. La table `espaces` porte
`parent_id`, avec exactement deux niveaux : le parent d'une zone ne peut pas
lui-même avoir de parent. La règle tient sans déclencheur, par une clé étrangère
composite sur le couple identifiant et niveau, le niveau étant une colonne
calculée depuis `parent_id`. Une seconde clé composite sur le couple identifiant
et jardin interdit qu'une zone rejoigne le parent d'un autre jardin.

Le nom est unique parmi les frères et non plus dans tout le jardin.

Une plante ne peut pas occuper à la fois un espace et l'une de ses zones, elle y
compterait deux fois. Placer sur une zone retire le placement direct sur le
parent, placer sur l'espace retire les placements faits dans ses zones. Deux
zones du même espace restent possibles, un même légume pouvant tenir deux
planches. Le compte d'un espace est la somme de ses plantes propres et de celles
de ses zones.

Supprimer une zone rend ses plantes à son espace. Supprimer un espace emporte
ses zones et rend ses plantes non placées.

`garden_plant_espaces` porte une clé de substitution `id uuid` et n'a plus de
colonne `notes`.

## Attributs d'un espace et d'une zone

Quatre attributs, portés par les deux niveaux, une zone héritant de son parent
tout ce qu'elle ne renseigne pas, sauf la surface qui s'additionne au lieu de
s'hériter.

`surface_m2` convertit le besoin du catalogue, exprimé en litres par jour et par
mètre carré, en litres à porter. L'entête d'une zone annonce sa surface et ses
litres du jour, celui d'un espace y ajoute la part déjà prise par ses zones.

`support` parmi pleine terre, contenant, serre, balcon, en remplacement de
`espaces.kind` qui n'était renseignée nulle part.

`exposition` sur le vocabulaire à cinq valeurs du catalogue. Ce que le lieu
offre est un point sur cinq crans, ce que la plante demande est une plage,
soleil et mi-ombre acceptant tout ce qui va de l'un à l'autre. Seul l'écart se
signale, sur la ligne de la plante, avec ce que le lieu offre réellement.

`sol_texture` facultative, héritée du jardin quand elle n'est pas renseignée.

## Écran d'un espace

L'écran s'ouvre sur une bannière sur fond d'encre, portant le nom du lieu et une
ligne de mesures : le nombre de plantes, la surface, les litres du jour. Le
retour et le menu y tiennent dans deux ronds. L'image de la bannière est la
photographie du jardinier prise dans le journal du lieu quand il en existe une,
occupant toute la largeur sous un dégradé ; à défaut la planche d'herbier d'une
de ses plantes, posée à droite en encre sur le fond. Une photographie sourcée
n'y paraît jamais.

Les plantes se rangent par typologie, légumes, fruits, aromatiques, ornement,
chaque groupe portant sa pastille de couleur et son compte. La liste donne une
rangée par plante, la mosaïque deux tuiles par ligne. L'une comme l'autre porte
l'image de la plante, sa quantité et la tâche du moment. L'image d'une tuile
mesure quatre-vingts points, ce qui donne trois rangées de tuiles sur un
téléphone, le nom se lisant juste dessous.

L'image d'une plante suit trois rangs, dans cet ordre : ma photographie du
journal, la planche d'herbier, la photographie sourcée du catalogue. Une case
vide réservée reste possible quand les trois manquent. La vue `vignettes_plante`
sert le troisième rang, une image par plante et par organe, choisie selon
l'ordre d'organes propre à la typologie.

Le fil de lecture ne porte que ce qui se regarde : la bannière, les pastilles du
moment, les plantes. Le réglage des attributs, la rotation, la recherche au
catalogue et le formulaire de zone passent par le menu.

Le nombre de pieds fait exception et se corrige sur la rangée elle-même, sans
mode d'édition : c'est la valeur qui bouge le plus souvent, un semis complété ou
un plant perdu, et elle tenait déjà cette place. Le champ garde l'apparence du
texte qu'il remplace tant qu'on ne le touche pas, et la rangée garde sa hauteur.
La tuile de la mosaïque porte le même champ dans la pastille où le nombre se
lisait, une plante sans nombre en gardant une, effacée. La tuile est donc une
boîte et non un bouton, un champ ne pouvant pas tenir dans un bouton : le bouton
couvre l'image et le nom, le bandeau du haut garde ses propres gestes.

Le mode modification ne porte plus que la note, le retrait et le choix de zone.

## Pastilles du moment et accord des comptes

Une ligne de pastilles annonce ce qui se joue en ce moment : au plus trois
tâches, chacune avec son compte, son mot et sa teinte, les plus nombreuses en
tête. La ligne défile horizontalement, se termine par un fondu, et porte fixé à
sa droite le passage de la liste à la mosaïque, en icônes seules.

Un appui retient la tâche, un second la relâche. L'écran ne montre alors que les
plantes concernées, dans les zones comme hors zone. La tâche retenue ne survit
ni au retour aux espaces ni à sa propre disparition du tableau.

Tous les comptes de l'écran suivent ce qui est affiché. La bannière dit « 6
plantes sur 10 », les comptes des sections et ceux des groupes de typologie
s'accordent avec elle, et leur somme est le nombre porté par la pastille. Un
nombre qui annoncerait autre chose que ce qui est sous les yeux serait pire que
pas de nombre du tout.

Sous une tâche retenue, les cartes ne redisent plus la tâche que la pastille
nomme : une plante ayant souvent plusieurs tâches en cours et n'en montrant
qu'une, elles la portaient toutes à l'identique.

## Affichage des zones

Les zones sont des sections dépliables dans le détail de l'espace, sans
troisième niveau de navigation. Chaque section porte le nom de la zone, son
compte, sa surface et ses litres, puis ses attributs, sa rotation, sa recherche
au catalogue et ses plantes. Une zone dépliée le reste d'un rendu à l'autre.

Les zones nommées se lisent d'abord, la section « Sans zone » ferme la marche :
découper un espace, c'est ranger, et ce qui n'est pas encore rangé vient à la
fin. Le formulaire d'ajout la suit, il pose justement une plante hors zone.

## Déplacement d'une plante entre zones

Trois chemins mènent au même geste, `deplacer`, qui pose sur la nouvelle zone
puis retire de l'ancienne.

Le choix de zone de la ligne du lieu occupé, dans l'onglet Au jardin de la
fiche, offre les zones de l'espace et « Sans zone ». C'est le chemin principal,
atteint d'un appui sur la plante depuis l'écran de l'espace.

Le mode modification de l'écran d'un espace porte la même liste sur la rangée.
C'est le chemin des réorganisations, où l'on déplace plusieurs plantes à la
suite sans quitter l'écran.

L'ajout d'un lieu, dans le même onglet, n'offre plus l'espace dont une zone est
déjà prise : le poser là aurait retiré la zone sans le dire, puisque la règle
interdit de tenir l'espace et sa zone. Il ne sert donc qu'à ajouter un lieu
nouveau.

## Ajout d'une plante depuis un espace

Une recherche dans le catalogue depuis l'écran d'un espace ou d'une zone fait
les deux gestes d'un coup : ajout au jardin et placement. Une plante encore
absente du jardin est annoncée comme telle avant l'appui.

## Journal d'observations

Une entrée d'`observations` porte le jardin, l'espace ou la zone, la plante
quand elle est concernée, le jour, un geste facultatif pris dans une liste
courte, un texte, et une quantité quand le geste est une récolte. Le lieu ou la
plante suffit : un apport de compost concerne la zone et non une plante en
particulier. L'arrosage ne figure pas dans la liste des gestes, le bilan
hydrique se tenant au niveau du jardin.

Les photographies forment une table `observation_photos` rattachée à l'entrée,
six au plus. Une entrée vaut pour un moment au jardin, qui produit souvent
plusieurs vues. Les fichiers vont dans un compartiment privé nommé `jardin`,
limité au jpeg et au webp et à trois mégaoctets, dont le chemin commence par
l'identifiant du jardin, seul porteur du droit. L'image est ramenée à mille six
cents pixels sur le grand côté à qualité 0,82 avant l'envoi, ce qui la met sous
les trois cents kilo-octets. Rien ne s'affiche sans adresse signée, demandée
après le rendu et gardée une heure. Supprimer une entrée efface aussi ses
fichiers.

### Trois portes d'entrée

Noter est un geste et non une destination : le bouton se pose au-dessus de la
barre des trois écrans, à droite, sur tous les écrans, et disparaît dès qu'une
feuille est ouverte, celle-ci couvrant l'écran.

Ce qu'il porte vient de ce qui est à l'écran. Depuis un espace, le lieu est déjà
celui que l'on regarde. Depuis une fiche, la plante est imposée et nommée, et le
lieu se choisit parmi ceux qu'elle occupe ; une plante placée nulle part reçoit
le jardin entier plutôt qu'une impasse. Depuis n'importe où ailleurs, tous les
lieux du jardin sont offerts, l'espace puis ses zones.

La lecture a trois échelles. Le journal d'un espace réunit ses entrées et celles
de ses zones, replié en pied d'écran. L'onglet Au jardin d'une fiche porte celui
de la plante, tous espaces confondus. Le journal du jardin entier se lit depuis
la feuille du jardin ou depuis la saisie, dans l'ordre du temps et rangé par
mois : rien ne donnait à relire une saison.

## Rotation des cultures

Un déclencheur écrit une ligne de `cultures` à chaque placement, portant le
lieu, la plante, sa famille et l'année. N'y entrent que les plantes conduites en
annuelle ou en bisannuelle : c'est la colonne `conduite` qui tranche, sans quoi
la tomate s'exclurait elle-même de la rotation. Les placements déjà faits ont
été repris depuis leur année d'ajout.

Le panneau ne paraît que là où quelque chose a poussé, une ligne par famille
avec ses années. Dix familles portent un délai de retour, de deux ans pour les
astéracées et les poacées à quatre pour les brassicacées, les amaryllidacées et
les solanacées. Les autres sont notées sans alerte, faute de règle établie.

Il tenait six lignes en tête de l'écran d'un espace, en permanence, alors qu'il
ne sert qu'au moment de poser une plante, où l'avertissement se déclenche de
lui-même. Il est rangé dans le menu, et une pastille sur le bouton de coin dit
qu'une famille n'est pas encore libre de revenir. Dans une zone, il reste sous
les attributs, la section entière étant déjà repliée.

Au moment de poser une plante sur une planche qui a porté sa famille trop
récemment, un avertissement dit les années et l'année de retour, et laisse
décider. Le panneau accepte la saisie d'une année antérieure, qui se retire
d'une croix. Une planche peut mettre la rotation en sourdine, ce qui tait le
panneau, la pastille et l'avertissement, avec un rappel discret pour revenir en
arrière.

## Onglet Au jardin de la fiche

Le bloc botanique qui portait ce nom, nectar, parfum, feuillage, usage et
voisinage, s'appelle Intérêt et reste dans l'identité. L'onglet ne paraît que
pour une plante cultivée, et la rangée des quatre onglets glisse plutôt que de
se replier.

Il montre où la plante est, avec son espace, son choix de zone et sa quantité,
et son journal tous espaces confondus. La saisie y est le miroir de celle d'un
espace : le même formulaire, la plante étant déjà connue et le lieu se
choisissant parmi ceux qu'elle occupe. Le placement se fait aussi depuis là,
avec le même avertissement de rotation.

C'est l'onglet d'ouverture quand la plante est ouverte depuis un espace ou une
zone : on regardait déjà où les choses sont. Depuis la liste des plantes, où
l'on vient lire ce qu'il y a à faire, l'ouverture reste sur le moment.

Le rappel des tâches mises en sourdine reste dans l'onglet du moment, où sont
les tâches : il avait déjà quitté la rangée du catalogue.

## Descente d'un niveau dans le reste de l'application

Les compteurs de tuiles, `plantesDeLEspace`, le groupement de l'écran du moment
et les filtres par espace remontent à la racine, une plante placée dans une zone
appartenant à son espace.

La rangée de pastilles de l'onglet Mes plantes porte les espaces et jamais les
zones. Décocher un espace y retire aussi les placements faits dans ses zones.
L'affectation à une zone se fait depuis l'écran de l'espace ou depuis la fiche.

Les filtres par espace de l'écran du moment et du calendrier n'offrent que les
espaces.

## Couverture des planches d'herbier

Trois cent neuf fiches sur trois cent quinze portent une planche depuis la
seconde campagne du 10 août. Le détail est dans `claude/planches-fabrication.md`.

## Contrôles automatisés

Sept cent quarante-six contrôles, aucun échec. Trois suites portent ce
chapitre : `outils/essais/espaces.mjs` pour les deux niveaux, l'héritage
d'attributs, la conversion en litres, la règle de placement unique, l'écart
d'exposition, la bannière, les trois rangs d'image, les groupes de typologie, le
passage d'une vue à l'autre, l'ordre des sections, la saisie du nombre de pieds
sur la rangée et sur la tuile, l'onglet d'ouverture depuis un lieu, la pastille
qui retient sa tâche et l'accord de tous les comptes de l'écran ;
`outils/essais/journal.mjs` pour le journal, les photographies, l'onglet de la
fiche, le déplacement de zone, le bouton Noter et sa saisie prise du contexte,
et le journal du jardin entier ; `outils/essais/rotation.mjs` pour la trace, le
panneau rangé dans le menu, la pastille du bouton de coin, l'avertissement et la
sourdine.

La doublure d'essai a été reprise à cette occasion : les écritures ne
s'appliquaient qu'à la première ligne de la table, les filtres arrivant après le
verbe dans la chaîne du client. Elle sert désormais le compartiment de stockage,
rejoue le déclencheur des cultures et dérive la vue `vignettes_plante`.
