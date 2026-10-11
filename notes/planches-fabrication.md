# Planches d'herbier, fabrication et intégration

État au 10 août 2026. 309 fiches sur 315 portent une planche, 244 au niveau de
l'espèce et 65 au niveau du genre. Les fichiers sont dans le dépôt et
l'interface les affiche, commits `df20633`, `30a05e8` et `e2e9645`.

## Ordre des fonds retenu

Vilmorin d'abord pour le potager et les aromatiques, parce que les flores
sauvages montrent l'espèce botanique et non la forme cultivée : la carotte
sauvage plutôt que la carotte. Masclef ensuite pour tout le reste. Köhler puis
Thomé en recours à l'espèce, Thomé en dernier parce que ses numérisations
portent une ombre de bord de page. Le genre n'arrive qu'après, chez Masclef puis
Thomé.

| Fonds | Espèce | Genre | Total |
|---|---|---|---|
| Vilmorin 1883 et 1904 | 79 | néant | 79 |
| Masclef 1891 | 29 | 37 | 66 |
| Köhler 1887 | 22 | néant | 22 |
| Thomé 1885 | 15 | 8 | 23 |

## Deux règles d'appariement

**Une planche partagée est retirée des fiches servies au genre.** Cinq fiches
montraient la même groseille à maquereau, six le même colza, trois la même
myrtille. Une liste où la même image revient cinq fois se lit comme une panne.
Deux exceptions. Lorsqu'une fiche porte le nom de l'autre, la planche est
conservée : « Tulipe » et « Tulipe botanique » sont deux faces d'une même
plante, « Cassis » et « Groseille à maquereau » sont deux plantes que seule la
parenté de genre rapproche. Et une fiche appariée à l'espèce garde la sienne, le
framboisier étant bien *Rubus idaeus*, le concombre et le cornichon la même
espèce.

**L'appariement Vilmorin exige le nom entier.** La planche doit porter le nom de
la fiche, entier, en tête de son propre titre : « Chou rouge » accepte « Chou
rouge gros », refuse « Chou de Dax ». Sans cette exigence, un simple mot de tête
suffisait, et le pois de senteur recevait la planche du pois potager, l'ail
d'ornement celle de l'ail, la pastèque celle du melon.

Cinq planches de genre ont en outre été écartées à la relecture, le dessin
montrant une autre plante : oca du Pérou, mûre de ronce, pois de senteur, pois
de senteur vivace, renoncule des fleuristes.

## Chaîne de production

Hors dépôt, dans l'atelier : `vignette.py`, `texte.py` et `affecter.py`.

La marge morte de la numérisation est retirée par mesure de l'écart au papier.
Le papier est redressé point par point : son niveau est relevé par blocs, les
blocs entièrement couverts d'encre sont comblés par leur plus proche voisin
valide, le champ obtenu est lissé puis divisé canal par canal. Teinte crème,
ombre de reliure et vignettage partent ensemble. Une tranche de volume teintée,
qu'aucune division ne blanchirait, est coupée à part au critère de la médiane de
ligne. Les mentions portées sur la planche sont effacées au critère
typographique. Le cadre vient de la plus grande masse d'encre connexe. Le dessin
est enfin centré dans un carré.

Deux sorties par plante : `planches/liste/<slug>.webp`, masque alpha de 128
pixels à huit niveaux, et `planches/fiche/<slug>.webp`, planche en couleur de
320 pixels à fond blanc incorporé.

Le téléchargement depuis Commons demande trois secondes entre deux fichiers.
En deçà, le service renvoie des erreurs 429 sur la plus grande partie du lot.

## Seconde campagne, les cent vingt-cinq fiches restantes

Sondage du 10 août sur Wikimedia Commons, catégorie « <taxon> - botanical
illustrations », au binôme puis au genre, en essayant tour à tour le nom latin
de la fiche et les trois noms acceptés. 119 fiches sur 125 portent au moins une
planche disponible, 98 à l'espèce et 21 au genre.

Aucun ouvrage unique ne couvre l'ensemble. Curtis's Botanical Magazine touche 42
fiches, Edwards's Botanical Register 25, Flore des serres 17, et le reste se
disperse sur une longue traîne. Les périmètres mesurés étaient : les seuls
périodiques horticoles du dix-neuvième siècle, 73 planches ; ces périodiques
plus les flores dessinées, 83 ; toute source, 119. Le dernier périmètre a été
retenu, la liste restant homogène puisque le masque d'encre efface la couleur et
le style.

Le classement des candidats donne le gros du rang à l'ouvrage d'origine, lu dans
le titre, ajoute une prime au titre qui porte le taxon et écarte ce qui n'est pas
une planche dessinée : planche d'herbier numérisée, planche d'entomologie,
timbre, coupe au microscope, format non exploitable. Un titre de catalogue
horticole doit en outre porter le nom entier de la fiche, faute de quoi la
coloquinte plate rayée devient une courgette.

Une planche trop pâle ne donne pas de vignette lisible. La plus pâle des cent
quatre-vingt-dix planches déjà en place couvre 6,7 pour cent du carré. En deçà de
10 pour cent, le candidat suivant est essayé, ce qui a joué dix fois.

La relecture à l'oeil, sur planche de contact, a écarté dix-huit premiers choix :
mauvaise plante, page de catalogue de semences avec sa réclame, planche
composite montrant douze espèces, dessin illisible, plante d'une autre espèce du
même genre. Trois fiches ont demandé un choix à la main hors classement, les
choux et la courgette étant mieux servis par Vilmorin.

Deux partages fautifs ont été corrigés à cette occasion : l'oeillet d'Inde et la
rose d'Inde recevaient la même planche de *Tagetes erecta* alors que le premier
est *Tagetes patula* ; le pak-choï, le mizuna et le tatsoi recevaient la même
planche de *Brassica rapa*.

| Fonds | Fiches |
|---|---|
| Curtis's Botanical Magazine | 39 |
| Edwards's Botanical Register | 11 |
| Addisonia | 8 |
| Favourite flowers of garden and greenhouse | 6 |
| Flora Batava | 5 |
| Vilmorin-Andrieux | 5 |
| Flore des serres | 4 |
| Autres ouvrages, un à trois chacun | 34 |
| Wikimedia Commons sans ouvrage identifié | 7 |

Six fiches restent sans planche, aucune catégorie d'illustration ne les
couvrant : caryoptéris, jasmin étoilé, oranger du Mexique, pennisetum, poire de
terre, stachys laineux.

## Manifeste et nommage des fonds

`planches.json` associe le `slug` à une clé de fonds, suivie d'un `g` quand la
planche est celle du genre. La clé tenait sur une lettre tant que les fonds
étaient quatre ; elle en porte plusieurs depuis la seconde campagne, et aucune
ne se termine par un `g`, faute de quoi le marqueur de genre ne se lirait plus.
Le contrôle avant dépôt lit les clés dans la table `FONDS` d'`app.js` et refuse
un code du manifeste qu'elle ignore, comme une clé finissant par `g`.

`planches-provenance.json` porte le fichier d'origine et la page de Commons pour
chaque plante, et ne part pas avec l'application.

## Ce que l'interface affiche

La vignette de liste est un masque alpha de trente-quatre pixels, posé entre la
coche et le nom. Le fichier ne porte que la forme, la couleur vient de la
feuille de style : encre du texte à soixante-dix-huit pour cent, teinte de
sélection quand la plante est retenue. Une gravure au trait de Vilmorin, une
chromolithographie de Masclef et une planche de Köhler sortent dans la même
encre, et la liste reste homogène quel que soit le fonds d'origine.

Son adresse n'est posée qu'à l'approche de la rangée, par un observateur
d'intersection avec une marge de quatre cents pixels. Une image de fond n'a pas
de chargement paresseux : sans cela, ouvrir l'écran des plantes demanderait les
309 fichiers d'un coup.

La planche en couleur remplace le motif décoratif par typologie dans l'entête de
fiche. Le blanc de son papier disparaît par `mix-blend-mode: multiply`, un fondu
circulaire l'éteint de tous les côtés, l'opacité est à quarante-deux pour cent.
Le motif décoratif reste pour les six fiches sans planche.

La provenance est énoncée dans le bloc Identité, avec la mention « planche du
genre » quand le dessin montre une plante voisine et non celle de la fiche.

## Contrôles

Le contrôle avant dépôt vérifie que chaque entrée du manifeste a ses deux
fichiers, que chaque fichier a son entrée, que le code de fonds est connu de la
table `FONDS` et qu'aucune clé de fonds ne finit par un `g`.

La suite d'essais `planches` joue seize contrôles : lecture du manifeste,
apparition de la vignette là où une planche existe et nulle part ailleurs,
report du chargement du masque, remplacement du motif dans l'entête, service
effectif du fichier de 320 pixels, énoncé de la provenance, nom d'ouvrage
au-delà des quatre lettres d'origine, mention du genre pour le rosier, et
conservation du motif décoratif pour une fiche sans planche. Le stachys laineux
et le caryoptéris ont été ajoutés au catalogue d'essai pour tenir le cas de la
fiche sans planche.

## Ce qui reste

Quelques planches Vilmorin sont des numérisations de faible définition ou des
gravures en aplat noir, l'aubergine et la betterave notamment. Le rendu est
fidèle au fonds, il n'y a rien à corriger dans la chaîne. Choisir une autre
variété de la même plante donnerait parfois une meilleure image.

Les deux planches les plus pâles du catalogue, l'imperata à 6,1 pour cent de
couverture et le stipa cheveux d'ange à 8,3, sont des graminées dont le trait
tient mal au format de la vignette.
