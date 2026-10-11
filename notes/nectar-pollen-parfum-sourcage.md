# Nectar, pollen et parfum : sortie de l'estimation

## État avant l'opération

Sur 315 fiches actives, trois colonnes portaient une valeur sans qu'une source
l'établisse.

Le nectar était renseigné partout. Dix-huit valeurs seulement citaient une
source, 169 étaient déclarées estimations horticoles, et 128 ne déclaraient
rien du tout, ni source ni estimation. Le pollen suivait le même partage : 34
sourcées, 229 estimations, 52 muettes. Le parfum était coté sur les 315 fiches,
dont 285 en estimation déclarée ; l'intensité n'était établie nulle part, aucune
base ne la cotant, et 188 fiches affirmaient « Sans parfum notable » sans qu'un
document l'énonce.

La dette débordait des colonnes. Deux cent vingt et une phrases de conseil,
réparties sur 215 fiches, reprenaient ces valeurs en toutes lettres : « Floraison
mellifère, elle offre à la fois du nectar et du pollen », « Les butineurs y
trouvent du nectar, peu de pollen », « Fleurs parfumées ».

## État après l'opération

Quatre-vingt-onze fiches portent un nectar sourcé, quatre-vingt-dix un pollen
sourcé, soixante-huit un organe parfumé sourcé. L'intensité du parfum et la
saison de la ressource nectarifère ne sont plus renseignées nulle part. Aucune
fiche du référentiel ne porte plus la mention `estimation horticole non
vérifiée`, pour aucun champ.

## Source retenue pour le nectar et le pollen

*Liste de plantes attractives pour les abeilles, plantes nectarifères et
pollinifères à semer et à planter*, Val'hor, FranceAgriMer, Société nationale
d'horticulture de France, Institut de l'Abeille, ASTREDHOR, CNPMAI et INRA,
juin 2017, 200 espèces.

Trois tentatives antérieures avaient échoué sur des jeux quantitatifs, dont deux
avec des médianes inversées : ces bases mesurent le nectar par fleur, alors que
la colonne du référentiel intègre le nombre de fleurs et la durée de floraison.
La liste Val'hor est construite sur la même assiette : sa page de méthodologie
énonce que la production de nectar dépend de l'espèce, de la position de la
fleur sur la plante, de la durée de floraison et de l'âge du végétal.

Elle cote deux colonnes, intérêt nectar et intérêt pollen, par un nombre de
pictogrammes allant de zéro à trois, et publie pour chaque espèce un indice de
confiance sur trois degrés, calculé sur le nombre de sources bibliographiques
et de dires d'experts recensés.

## Règle de conversion

L'échelle de la source compte quatre degrés, le vocabulaire du référentiel
quatre classes. La conversion est un réétiquetage, non une déduction : aucun
seuil n'est à choisir, les deux extrémités se correspondent.

Zéro pictogramme donne `nul`, un donne `faible`, deux donnent `moyen`, trois
donnent `fort`.

C'est ce qui distingue cette opération des trois précédentes. Convertir une
mesure quantitative en classes obligeait à fixer des seuils, et un seuil doit
être validé avant usage. Ici la source publie déjà une échelle ordinale à quatre
degrés dont la sémantique est celle du vocabulaire.

## Emploi de l'indice de confiance

L'indice est employé de façon dissymétrique, et la dissymétrie est mesurée.

Une cotation positive suppose une observation affirmative, qu'une documentation
mince ne peut pas produire. Une cotation nulle est une négation, dont la valeur
ne dépasse pas la complétude de la documentation qui la porte.

La source montre la signature de ce biais. La part de nectars nuls tombe de 23
pour cent à l'indice 1 à 21 pour cent à l'indice 2 et 8 pour cent à l'indice 3,
tandis que la cotation moyenne monte de 1,57 à 1,98. La part de pollens nuls
suit le même mouvement, de 40 à 32 puis 26 pour cent.

Lues une à une, les cotations nulles de l'indice 1 contiennent des erreurs
franches : l'achillée et l'aneth sans pollen, l'abélia et le muflier sans
nectar, la pastèque sans pollen, la navette sans nectar alors que les trois
autres brassicacées de la liste, cotées à l'indice 3, portent un nectar de 2 ou
3. Les cotations nulles de l'indice 2 sont défendables et comprennent deux cas
d'école, le noisetier et l'argousier sans nectar, tous deux anémophiles.

Règle retenue. Une cotation positive est conservée quel que soit l'indice. Une
cotation nulle n'est conservée qu'à partir de l'indice 2. Dix-sept cotations
nulles ont été retirées à ce titre, et la provenance le dit sous la forme
`cotation nulle non retenue, la source ne l'énonce qu'à son plus faible indice
de confiance`.

Aucune espèce de la liste n'étant nulle dans les deux colonnes, la liste étant
par construction une liste de plantes attractives, chaque fiche conserve au
moins une cotation.

Cette règle est la même que celle appliquée au parfum : le silence d'une source
n'est pas une preuve d'absence.

## Extraction de la liste

Les deux colonnes utiles sont des pictogrammes vectoriels : `pdftotext` restitue
les carrés de floraison et les points de l'indice de confiance, mais rend les
colonnes nectar et pollen vides.

La méthode qui fonctionne convertit chaque page en SVG par `pdftocairo -svg`,
puis identifie les glyphes par le début de leur tracé. La goutte de nectar
commence par `M 10.953125 -4.65625 C 10.546875 -6.25`, le symbole de pollen par
`M 6.734375 -3.359375 L 6.734375 -6`, le point plein de l'indice par
`M 8.453125 -3 C 8.460938 -2.476562`. Les éléments `use` portent la position de
chaque occurrence. Les pictogrammes se regroupent en rangées par leur ordonnée,
à trois points près, et les noms se lisent par `pdftotext -bbox` dans le même
repère, les lignes de texte étant séparées par le bas de leur boîte.

Les trois points de l'indice de confiance sont présents sur toutes les lignes :
ils garantissent qu'aucune rangée n'échappe au repérage, y compris celles sans
nectar ni pollen. Cent quatre-vingt-dix-neuf espèces ont été lues, contrôlées
visuellement sur trois pages rendues en image, dont celle de la navette,
relue après que sa cotation eut paru douteuse : l'extraction était exacte, le
doute portait bien sur la source.

## Appariement au référentiel

L'appariement se fait sur le binôme latin, en confrontant le nom porté par la
fiche et les noms acceptés déjà enregistrés par GBIF, POWO et Tela Botanica.
Deux synonymes nomenclaturaux absents de ces colonnes ont été ajoutés
explicitement : `Salvia rosmarinus` pour `Rosmarinus officinalis`, et
`Centaurea cyanus` pour `Cyanus segetum`.

Une entrée cotée au genre par la source, écrite `spp.`, s'applique aux fiches du
genre lorsque le libellé français désigne le genre en général, comme
« campanules », « Menthes » ou « Sauges ». Elle est refusée lorsque le libellé
nomme des plantes particulières qui ne sont pas la fiche traitée. Deux entrées
tombent sous cette réserve : « Ail des ours, ciboulette » ne vaut que pour la
ciboulette, et non pour l'ail, l'oignon, l'oignon blanc hâtif, le poireau,
l'échalote ni l'ail d'ornement ; « cassissier, Groseiller » ne vaut que pour le
cassis et la groseille à grappes, et non pour la groseille à maquereau, le
groseillier à fleurs ni la casseille.

Une entrée cotée à l'espèce s'applique en revanche à toutes les fiches de cette
espèce, y compris à ses formes cultivées : la fleur est la même. Le rutabaga
reçoit ainsi la cotation du colza, *Brassica napus*, indice 3, forte pour les
deux ressources ; le navet, le pak-choï, le mizuna et le tatsoi reçoivent celle
de la navette, *Brassica rapa*, dont le pollen est retenu et le nectar nul
écarté par la règle de l'indice.

Quatre-vingt-dix-neuf fiches sont couvertes. Quarante-quatre reposent sur un
indice de confiance de trois sur trois, vingt-sept sur deux, vingt-huit sur un.

## Décision sur les fiches non couvertes

Deux cent seize fiches sortent de la liste. Leurs valeurs de nectar et de pollen
étaient des estimations ou des valeurs sans provenance déclarée. Elles ont été
vidées.

La liste Val'hor retient les espèces les plus communes et cultivées en France du
point de vue de l'apiculture. Un référentiel de jardin contient nécessairement
des plantes qui en sortent, en particulier des légumes récoltés avant floraison,
pour lesquels la question de la ressource pour les butineurs ne se pose pas.

## Parfum

Aucune base ne cote l'intensité du parfum. La colonne `fragrance` est vidée sur
les 315 fiches, et le vocabulaire à quatre classes reste en place pour le jour
où une source graduée se présenterait.

Ce qu'une source établit, c'est l'organe parfumé. Le Plant Finder du Missouri
Botanical Garden publie deux attributs, `Flower: Fragrant` et `Leaf: Fragrant`,
qui peuvent être cochés ensemble. Le vocabulaire `parfum_organe` accueille
désormais ce troisième cas.

Les 315 fiches ont été confrontées une à une à cette source. La recherche passe
par `PlantFinderProfileResults.aspx?basic=<binôme>`, qui rend une liste de
taxons avec leur nom scientifique ; le résultat retenu est celui dont le nom
correspond exactement au binôme et qui n'est pas un cultivar ; les attributs se
lisent ensuite sur `PlantFinderDetails.aspx?taxonid=<identifiant>`. La recherche
est tentée successivement sur le nom porté par la fiche puis sur les noms
acceptés de POWO, GBIF et Tela Botanica.

Deux cent trente-sept fiches sont présentes au Plant Finder. Soixante-huit
portent un organe parfumé établi, trente-trois par la fleur, vingt-six par le
feuillage, neuf par les deux. Cent soixante-neuf sont présentes sans que la
source coche l'attribut : la provenance l'énonce, sous la forme `parfum : non
établi par le Plant Finder`, pour qu'une campagne ultérieure ne refasse pas le
travail. Soixante-dix-huit fiches n'ont pas de correspondance.

Le silence de la source n'est pas une absence de parfum. Une fiche que la source
ne mentionne pas, ou qu'elle mentionne sans cocher l'attribut, n'affiche rien.

Quatre organes déjà en base ont été corrigés par cette relecture : la valériane
rouge, la camomille romaine et la marjolaine portaient la fleur là où la source
coche le feuillage, l'aneth portait le feuillage là où la source coche la fleur.

## Saison de la ressource nectarifère

La colonne `nectar_season` disait à quelle saison la ressource est offerte,
précoce, de saison, tardive ou hivernale, sur 86 fiches. Aucune ne citait de
source. Elle n'était affichée nulle part et n'était lue par aucune vue. Après le
vidage des cotations, elle contredisait la fiche sur cinquante-six lignes, où
elle annonçait la saison d'une ressource que la fiche n'affirme plus.

Elle a été vidée. Le jour où un calendrier apicole la demandera, elle se déduira
de la fenêtre de floraison, qui est sourcée, selon une convention à écrire et à
soumettre : la classe dépend alors de la position de la fenêtre sur l'axe des
vingt-quatre quinzaines, et le choix des bornes est une convention, non une
mesure.

## Conseils

Les phrases de conseil dérivées de ces colonnes ont été retirées puis
recalculées sur les nouvelles valeurs, pour les seules fiches qui portent une
cotation sourcée et une phase de floraison. La règle est la suivante : nectar et
pollen tous deux à `moyen` ou `fort` donnent « Floraison mellifère, elle offre à
la fois du nectar et du pollen » ; le nectar seul donne « Les butineurs y
trouvent du nectar, peu de pollen » ; le pollen seul donne « Les butineurs y
trouvent du pollen, peu ou pas de nectar » ; aucun des deux donne « Peu de
ressource pour les butineurs ». La mention « Fleurs parfumées » ne subsiste que
sur les 40 fiches dont la source établit une fleur parfumée, et se place en fin
de conseil.

Cette reprise a mis au jour une règle générale, écrite depuis dans la procédure :
une phrase dérivée d'une colonne est une assertion au même titre que la colonne.
Vider la colonne sans retirer la phrase laisse l'affirmation dans le texte.

## Affichage

La ligne Nectar du bloc Au jardin garde le libellé du vocabulaire et disparaît
là où la colonne est vide. La jauge des butineurs de l'onglet du moment suit la
même règle. La ligne Parfum donne désormais l'organe, Fleurs, Feuillage ou
Fleurs et feuillage, et non plus une intensité.

Sept contrôles automatisés ont été ajoutés à la suite `blocs`, qui en compte
maintenant vingt-huit sur un total de 127.

## Réversibilité

Chaque écriture est passée par une transaction portant son motif, et le
déclencheur `tracer_modification` a conservé l'image avant et après de chaque
ligne dans `historique`. Aucune valeur retirée n'est perdue.
