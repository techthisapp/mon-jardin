# Réserve photographique

## Contrainte levée

`plant_images` portait `check (rang between 1 and 3)`. Trois images par organe au
maximum. Un avis de mainteneur suffisant à en retirer une pour tout le monde, et
le contrôle automatique en ayant écarté d'autres à la relecture, un organe
pouvait se retrouver sans rien à montrer. C'est ce qui est arrivé à la fleur du
rosier.

La contrainte devient `check (rang between 1 and 12)`. La cible de travail est
six images par organe attendu.

## Offre disponible

L'offre n'est pas le facteur limitant chez Pl@ntNet. Relevé du 8 août sur
l'interface GBIF des deux jeux Pl@ntNet, observations et déterminations
automatiques.

| Taxon | Occurrences avec image | Fleurs lues sur les 1200 premières |
| --- | --- | --- |
| Rosa | 21 061 | 731 |
| Malus domestica | 1 417 | 512 |
| Lavandula angustifolia | 746 | 515 |

## Coût de la profondeur

Mesures avant campagne : 2 126 lignes, 928 ko de table, 461 octets par ligne en
JSON complet et 370 pour les seules colonnes utiles, 2,01 rangs par organe.

Après les trois campagnes : 5 443 lignes, 4,7 rangs par organe, rang maximal 6.
La fiche ouverte demande une trentaine de lignes au lieu d'une dizaine, soit
environ 11 ko bruts et 3,5 ko compressés contre 4,6 ko bruts et 1,5 ko
compressés. La requête du client nomme désormais ses onze colonnes au lieu de
l'étoile, ce qui rend un cinquième du volume et écarte les compteurs d'avis, la
note de sélection et le verrou, qui ne servent jamais à l'affichage.

## Profondeur atteinte au 10 août

Répartition des organes du catalogue par nombre d'images retenues.

| Images retenues | Organes | Part |
| --- | --- | --- |
| 6 | 696 | 60,4 % |
| 5 | 77 | 6,7 % |
| 4 | 41 | 3,6 % |
| 3 | 92 | 8,0 % |
| 2 | 45 | 3,9 % |
| 1 | 122 | 10,6 % |
| 0 | 79 | 6,9 % |

Les 79 organes sans image relèvent tous de la règle des organes sans objet
énoncée plus bas.

## Campagne Pl@ntNet

`outils/photos/reserve.py` mène la campagne. Pour chaque taxon, une seule
collecte GBIF sert toutes les fiches qui le partagent, rosier et rosier grimpant
par exemple. Le programme calcule le manque par organe attendu, écarte les
candidats dont le genre ne s'accorde pas avec le nom latin de la fiche, écarte
les empreintes déjà présentes en base quelle que soit la fiche, télécharge à la
taille du plein écran sous cadence, mesure, applique les contrôles, classe par
préférence propre à l'organe et rend les lignes à insérer dans un fichier JSON.
Il n'écrit rien en base.

Neuf candidats sur dix passent les contrôles. En examiner quatre de plus que le
manque suffit, ce qui divise la durée de la campagne par trois. La campagne du
8 août a parcouru 301 taxons en une heure quarante et proposé 3 195 lignes,
toutes chargées depuis.

La racine reste hors campagne : la nomenclature d'organes de Pl@ntNet n'en porte
pas.

## Lignes tenues à part, puis chargées

Une ligne qui prend le rang 1 remplit une tuile jusque là absente et change donc
une fiche visible. Les 4 fleurs, 2 feuilles et 23 ports de rang 1 ont été
chargés le 8 août. Les 57 fruits et 13 écorces de rang 1 ont été tenus de côté :
sur une aromatique ou une vivace, le fruit est une ombelle sèche, correcte
botaniquement et sans intérêt au jardin.

Ces 70 lignes ont été chargées le 10 août, l'arbitrage étant que l'utilisateur
peut désormais les écarter lui-même par un avis. Aucune ne dépassait cinq images
pour son organe, toutes ont donc pris le rang 1 qui leur était destiné.

## Campagne Wikimedia

`outils/photos/commons.py` prend le relais là où Pl@ntNet n'a rien. L'organe s'y
déduit d'une catégorie et non d'une déclaration d'observateur, d'où quatre
garde-fous.

Le premier, la catégorie d'organe. Les candidats viennent des sous-catégories du
taxon qui nomment l'organe, dans l'une ou l'autre des formes que Commons emploie,
« Aronia melanocarpa (flowers) », « Solanum melongena leaves », « Flowers of Rosa
canina ». La ponctuation est neutralisée avant la lecture du mot, faute de quoi
la forme parenthésée échappe au repérage. À défaut de sous-catégorie d'organe, le
repli lit l'organe dans le nom du fichier, ce qui est le cas le moins sûr.

Le deuxième, le titre. Le nom de fichier est une assertion d'identité : s'il
porte un binôme latin, ce binôme doit s'accorder au genre de la fiche.

Le troisième, la mémoire. Les titres que la relecture a écartés sont consignés
dans `outils/photos/commons-ecartes.json` avec leur motif et ne sont plus
proposés. Sans cette mémoire, une seconde passe remonte les mêmes graines sur
papier millimétré et les mêmes étals de marché : le classement les préfère, rien
ne les retient.

Le quatrième, l'oeil. Le programme n'écrit rien en base.

La catégorie du taxon porte souvent un autre nom que la fiche, le signe multiplié
remplaçant la lettre x, ou le nom accepté ayant changé. Le programme essaie le
nom direct, ses deux variantes d'hybridité, puis une recherche de catégorie
restreinte aux noms d'au moins deux mots, et retombe enfin sur le nom d'origine :
une catégorie sans sous-catégorie n'est pas une catégorie absente, elle porte le
plus souvent ses fichiers en vrac. Ce dernier repli manquait au premier passage,
qui rendait vides soixante-neuf fiches portant pourtant des photographies.

Premier passage du 10 août : 142 fiches, 225 organes attendus sous trois images,
399 images à trouver. 128 lignes proposées sur 61 fiches, 110 retenues après
relecture. Second passage, une fois le repli corrigé : 39 lignes proposées sur
29 fiches, 19 retenues, 12 chargées, les autres doublant une adresse déjà en
place.

Les 39 lignes écartées à l'oeil disent ce que les mesures ne savent pas voir :
graines tenues à la main ou posées sur une peau, graines sur papier millimétré ou
épinglées sur planche, étal de marché avec son étiquette de prix, fruit portant
une étiquette de supermarché, panneau routier et lignes électriques, empreinte
d'épiderme au microscope, photographie en noir et blanc, arbuste nu sur une tuile
de fleur, tubercules sur une tuile de fruit.

## Organes sans objet

L'écorce demande un port ligneux, arbre, arbuste, liane ou sous-arbrisseau. Le
fruit demande une catégorie qui en porte un, donc hors Feuilles, Racines et
Bulbes. Ces organes ne sont pas remplis et leur tuile reste absente. La règle est
la même dans la vue, dans `outils/photos/coherence.py` et dans les deux
campagnes. Les 79 tuiles vides du catalogue relèvent toutes de cette règle.

## Réapprovisionnement, et sources épuisées

La vue `photos_a_reapprovisionner` liste les organes dont le compte d'images
retenues est tombé sous trois, avec la clé GBIF du taxon, le rang maximal atteint
et la mention de l'organe attendu. Elle est passée de 887 organes à 294 après la
campagne Pl@ntNet, puis à 246 après les deux passages Wikimedia, dont 163
attendus.

Elle ne voit que les organes qui portent déjà au moins une image : un organe
attendu et vide n'y figure pas, ce qui explique l'écart avec le tableau de
profondeur.

Une colonne `sources_epuisees` nomme les fonds déjà parcourus sans que le manque
soit comblé, lus dans la table `photos_source_epuisee`. Sur les 163 organes
attendus encore sous trois images, 128 portent la mention `commons`, dont 124
sans un seul candidat dans la catégorie du taxon. Un organe qui porte les deux
fonds ne relève plus d'une campagne : il attend une photographie du jardinier.
Les 35 autres restent à chercher.

Ce sont presque toutes des variétés de jardin que Pl@ntNet observe peu et que
Commons documente mal : abélia, ail d'ornement, amandier, anémone du Japon,
piéris, brocoli, chou kale, lentille.

## Verdict du contrôle automatique

`plant_images` porte `controle_motifs`, `controle_score` et `controle_le`. Un
relevé de fichier ne distinguait pas l'image jugée bonne de l'image jamais jugée,
et rien ne conservait ce que le contrôle avait vu.

`auditer.py --verdicts` rend le jugement de chaque tuile examinée, motifs compris
quand ils sont vides. L'audit du 10 août a jugé 1 078 tuiles sur 311 fiches et en
a signalé 59, une sur dix-huit, dont 19 pour un partage d'image entre fiches de
cultivars d'une même espèce.

Le plein écran montre ce relevé à qui peut juger, entre l'attribution et les
verdicts. Le contrôle est une suspicion et l'avis d'une personne est un verdict :
la ligne ne décide de rien, elle dit où regarder.

## Chargement

Le fichier de lignes est versé au dépôt au format compact, puis chargé par une
seule instruction SQL qui le lit à son adresse brute sur GitHub. La forme de
référence est dans `outils/photos/charger.sql`.

Trois pièges relevés au chargement du 10 août.

Le rang libre se calcule une fois par ligne sur l'état d'avant l'instruction :
deux lignes visant le même organe reçoivent alors le même rang et l'unicité
échoue. Il faut numéroter les lignes du lot par organe et prendre le n-ième rang
libre.

L'extension `http` doit être créée dans un schéma à part et non dans `public`.
Écrite `create extension http with schema public` puis suivie d'un `revoke all on
all functions in schema public`, l'instruction retire la permission d'exécution
de toutes les fonctions du schéma, dont `ensure_garden` et `create_garden` que
l'application appelle à la connexion. La permission par défaut a été rétablie
aussitôt. Un schéma de chargement, sur le chemin de recherche d'aucun rôle, puis
supprimé en fin de transaction, n'a rien à révoquer. La requête de contrôle qui
ferme `charger.sql` vérifie les trois points.

Une suite d'essais interrompue en cours de route laisse un agent de service qui
sert les fichiers de la version précédente. Le lot suivant échoue alors sur des
libellés qui n'existent plus dans le dépôt. Ne pas interrompre une suite, et si
elle l'a été, la rejouer sur un environnement propre avant de conclure à une
régression.
