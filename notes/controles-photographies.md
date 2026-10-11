# Contrôles automatiques sur les photographies

Travail du 7 août 2026. Point de départ : la fiche du rosier montrait un bouton en guise de fleur, un feuillage malade en guise de feuille et un port illisible tant l'image était sombre. La question posée était de trouver des contrôles automatiques capables d'éviter ces cas et d'en révéler d'autres.

## Vue d'ensemble

Les contrôles sont installés dans le dépôt sous `outils/photos`, en quatre fichiers. Ils ne sont pas dans la chaîne de contrôle avant dépôt : ils demandent OpenCV et le réseau, et ne servent qu'après un ajout ou un remplacement de photographies.

`mesures.py` rend des mesures objectives, sans seuil ni jugement. `controles.py` porte les seuils et rend des motifs de rejet lisibles. `coherence.py` compare les lignes entre elles plutôt que les pixels. `auditer.py` relit le catalogue entier, `chercher.py` propose des remplaçantes à partir des observations Pl@ntNet publiées sur GBIF.

## Mesures retenues

Lumière : luminance médiane du cadre, luminance médiane du centre, part de pixels presque noirs sur le cadre et sur le centre, part de blancs brûlés, étendue de luminance entre les déciles.

Netteté : netteté du carré le plus net du cadre, sur un pavage de trente-deux points de côté.

Couleur et matière : part de vert franc, part de feuillage au sens large qui inclut les feuillages glauques et argentés, part totale de non-vert, plus grande masse colorée d'un seul tenant, nombre de masses colorées distinctes, saturation moyenne du non-vert, teinte dominante du non-vert.

État du feuillage : part de taches jaunes ou brunes mesurée dans le voisinage dilaté du vert, et non sur tout le cadre, sans quoi une terre brune en fond compte pour une rouille.

Cadrage : format, part de la couronne extérieure qui est à la fois peu colorée et sans relief, finesse de texture par le rapport entre le relief à pleine résolution et le relief après réduction au quart, part de ciel dans le tiers supérieur.

## Contrôles

Généraux, valables pour toute tuile : sous-exposée, surexposée, sans contraste, floue, format inexploitable, cadre sans sujet végétal.

De sujet, propres à l'organe annoncé. Fleur : pas de fleur lisible, centre occupé par le feuillage, teinte incompatible avec `flower_colors`. Feuille : le feuillage n'est pas le sujet, feuillage abîmé ou sénescent. Fruit : pas de fruit lisible. Écorce : feuillage dominant. Port : végétation absente du cadre.

De cohérence, sans regarder l'image. Image partagée par deux fiches. Image répétée sur deux organes de la même fiche. Plusieurs organes tirés de la même observation. Organe sans objet, une plante herbacée, un bulbe ou une graminée n'ayant pas d'écorce.

## Calibrage

Les seuils sont posés sur les 933 images du catalogue, planche contact à l'appui pour chaque mesure : la planche est ordonnée par la mesure, le seuil est placé là où le jugement bascule. Un premier jeu de seuils, calé sur les seules huit photographies du rosier, écartait 72 pour cent du catalogue, ce qui était du surapprentissage sur huit cas.

Le principe retenu est la précision plutôt que le rappel. Un contrôle qui écarte une image correcte ne sert à rien, puisqu'il sera désactivé au premier faux positif visible.

Deux régimes d'emploi, qu'il ne faut pas confondre. Au versement d'une photographie nouvelle, les contrôles sont une barrière : les candidats se comptent par centaines, écarter à tort ne coûte rien. Sur le catalogue déjà en place, ils sont un tri : écarter à tort coûte le retrait d'une image correcte, et la tête de liste est relue à l'oeil.

## Mesures essayées et retirées

La variance globale du laplacien classe à l'envers : elle récompense un fond encombré et pénalise un gros plan propre sur fond fondu, qui est pourtant la meilleure prise de vue. Le rapport de netteté du centre sur le bord classe à l'envers pour la même raison, et les plus belles images du catalogue, pivoine, iris, hellébore, fraisier, sont au bas de ce classement. La part de pixels de carnation, essayée pour repérer une main tenant le rameau, se déclenche autant sur une terre brune et un bois sec.

Un défaut de mesure mérite d'être retenu. La masse colorée était cherchée dans les seuls pixels saturés, ce qui rendait le contrôle aveugle au blanc, couleur de fleur la plus répandue du catalogue : achillée, sureau, cornouiller, pavot et cerisier étaient tous jugés sans fleur. Une seconde bande recueille désormais le clair peu coloré, le ciel en étant retiré par sa forme, une plage large touchant le haut du cadre.

De même, le vert franc laissait de côté les feuillages glauques et argentés, lavande, immortelle, absinthe, euphorbe. Une bande basse en saturation les recueille sans ramasser la pierre, dont la teinte n'est pas verte, ni l'herbe sèche, qui est plus jaune.

## Résultat de l'audit

Sur les 949 tuiles affichées, 196 signalées, réparties sur 133 fiches des 254 qui portent des photographies.

| Motif | Tuiles |
|---|---|
| organe sans objet, plante non ligneuse | 66 |
| le feuillage n'est pas le sujet | 57 |
| image partagée entre deux fiches | 32 |
| pas de fruit lisible | 25 |
| végétation absente du cadre | 19 |
| pas de fleur lisible | 16 |
| cadre sans sujet végétal | 11 |
| trois organes tirés de la même observation | 9 |
| centre occupé par le feuillage | 24 |
| floue, surexposée, sous-exposée, feuillage abîmé | 14 |

Le défaut le plus nombreux n'avait pas été vu : plus de la moitié des tuiles d'écorce portaient sur des plantes qui n'ont pas d'écorce. Le persil, l'oignon, la fétuque et la giroflée montraient une tige, une souche voisine ou le sol.

## Corrections appliquées

127 corrections en base, en une transaction portant son motif au journal.

61 photographies remplacées par une meilleure déjà présente en base à un rang supérieur. La table garde jusqu'à trois rangs par organe et l'application n'en montre qu'un : une tuile fautive a souvent une remplaçante à portée. La correction marque la ligne fautive non retenue plutôt que de la supprimer, et se défait d'une seule mise à jour.

66 tuiles d'écorce retirées de fiches herbacées, de bulbes et de graminées.

Le classement proposait 83 remplacements, la relecture à l'oeil en a écarté 22. Dans onze cas la photographie en place était en réalité correcte et le signalement était un faux positif, sureau, laitue, houx, goji, prunier, châtaignier, aster. Dans onze autres, la remplaçante n'apportait rien ou montrait un autre organe.

Après correction, 115 tuiles restent signalées sur 883, sur 83 fiches.

## Recherche de remplaçantes chez Pl@ntNet

Les 99 tuiles sans alternative en base ont donné lieu à une recherche par la clé GBIF de chaque fiche, sur les deux jeux Pl@ntNet publiés sur GBIF. 82 taxons interrogés, environ 250 candidats par taxon, 70 examinés par organe après tirage au sort, soit 3100 images téléchargées, mesurées et soumises aux contrôles.

83 tuiles ont reçu au moins une proposition, 16 n'en ont reçu aucune. La relecture des trois planches contact a retenu 59 propositions et en a écarté 24 : dans quatorze cas la photographie en place était meilleure, dans dix la proposition montrait un autre organe, une bractée pour une fleur, une bogue pour une fleur, un bulbe pour un fruit.

Deux fiches de cultivars d'une même espèce recevaient la même proposition, la tête de classement étant commune. La seconde a pris le rang suivant, pour que les deux bandes diffèrent.

Un contrôle d'identité a été passé sur les 59 : le genre de l'observation Pl@ntNet correspond au genre de la fiche dans tous les cas. Ce contrôle importe, la tuile fleur de l'alchémille montrait jusque-là une véronique.

## Bilan

| État | Tuiles affichées | Signalées | Fiches touchées |
|---|---|---|---|
| avant | 949 | 196 | 133 |
| après promotion et retrait | 883 | 115 | 83 |
| après remplacement | 883 | 59 | 43 |

186 tuiles corrigées au total, soit une sur cinq.

## Versement du lot Wikimedia Commons

Les 62 fiches sans aucune photographie avaient une sélection de 436 images Wikimedia constituée le 5 août, jamais versée. Elle est passée aux contrôles le 7 août, puis relue deux fois.

Trois filtres jouent avant l'image : l'écorce n'a d'objet que chez un ligneux, le fruit n'en a pas chez un légume-feuille, racine ou bulbe, et l'organe annoncé doit exister. 16 lignes écartées à ce titre. Les mesures en ont écarté 105 de plus, surexposition, végétation absente du cadre, sujet illisible. 315 images sont passées, sur 61 fiches, dont 149 en tête de classement.

La relecture des quatre planches contact a écarté 41 de ces 149, la relecture des titres de fichier huit autres. Restent 109 tuiles sur 55 fiches, versées.

Ce que la campagne a appris. L'organe déclaré par Pl@ntNet vient de l'observateur et se trompe rarement ; celui que l'on déduit d'une catégorie Wikimedia se trompe souvent. Les refus tiennent en cinq familles : gravure ancienne, étal de marché, coupe au microscope, semences sur papier millimétré, main ou personne au premier plan. Et surtout un organe autre que celui annoncé, un chou-fleur donné pour une feuille, une bogue de châtaigne pour une fleur, un bulbe pour un fruit.

Un contrôle nouveau en est sorti : le titre du fichier est une assertion d'identité et se confronte au nom latin de la fiche. Sur 116 lignes, 50 ne nomment pas le genre, presque toutes parce qu'elles portent un nom vernaculaire dans une autre langue, jostaberry, Sellerie, brukwi, Гейхера. Les autres ont démasqué une fleur de poireau sur la fiche carotte, une julienne des dames sur la fiche navet, un rudbeckia sur la fiche glaïeul, et un fichier dont l'auteur écrit lui-même « arbuste inconnu ».

Aucun rang supérieur n'est versé pour ce fonds : les rangs 2 et 3 viennent de la même catégorie mal étiquetée, et mettre en réserve ce qu'on n'accepterait pas d'afficher n'a pas de sens.

## Deux organes revus

L'organe `racine` est ajouté. Un légume-racine n'a d'image utile que de sa racine : la fleur et le fruit sont ceux du porte-graine, montés après la récolte. Il se range après le fruit dans l'ordre d'affichage, les deux étant l'organe récolté. Il ne vaut que pour une racine ou un tubercule véritable, le bulbe de fenouil et le corme de glaïeul en ont été écartés plutôt que rangés sous un mot faux.

La tuile `fruit` est retirée des légumes-feuilles, légumes-racines et bulbes, comme la tuile `ecorce` l'avait été des plantes non ligneuses. La règle porte sur la catégorie du référentiel : elle est exacte et vaut pour les fiches à venir. Vingt tuiles retirées.

## Bilan au 7 août au soir

| État | Tuiles affichées | Signalées | Fiches couvertes |
|---|---|---|---|
| avant l'audit | 949 | 196 | 254 |
| après promotion, retrait et remplacement | 883 | 59 | 254 |
| après retrait des fruits sans objet et versement Wikimedia | 979 | 54 | 309 |

309 fiches sur 315 portent une bande de photographies. Sept restent sans image : crosne, dahlia cactus, glaïeul, mûrier platane, nérine, poireau, romanesco. Pour chacune, aucun des deux fonds n'offre une image qui montre l'organe qu'elle annoncerait.

## Jugement par les utilisateurs

Installé le 7 août au soir. Trois verdicts par personne et par photographie, posés au plein écran : à supprimer, moyenne, bonne. Seul le premier change ce qui est affiché, il masque l'image pour cette personne et la suivante prend la place. Au-delà d'un solde de trois retraits sur les cautions, l'image est retirée pour tout le monde. La conception est dans `claude/avis-photos-conception.md`.

Ce que cela apporte aux contrôles automatiques : leurs seuils sont calés sur mon oeil, sur 933 images. Les verdicts les caleront sur des jardiniers, en production, sans campagne. Il manque pour cela que le verdict du contrôle soit stocké en base, `auditer.py` n'écrivant aujourd'hui qu'un relevé sur disque.

## La réserve

Une tuile ne peut céder la place à la suivante que s'il y en a une. Au moment d'installer le jugement, 462 tuiles sur 979 n'avaient aucune réserve.

Une campagne de sourçage a interrogé 211 taxons, recueilli 24 658 candidats, tiré et mesuré 5 147 images. 259 lignes de rang 2 ont été versées, gardées par les contrôles seuls : une ligne de réserve ne paraît que si la première est écartée, et à ce moment-là ce sont les avis qui la jugent. Trois garde-fous exacts remplacent la relecture à l'oeil : le rang dans les bornes, aucune adresse déjà portée par la fiche, et le genre de l'observation égal à celui de la fiche.

La réserve passe de 517 tuiles pourvues à 776 sur 979. 258 lignes de rang 3 sont sélectionnées et gardées dans le projet, prêtes à verser. Restent 203 tuiles sans réserve, sur des taxons que Pl@ntNet observe peu.

## Reste à faire

19 tuiles relèvent d'un partage d'image entre fiches de cultivars d'une même espèce : concombre et cornichon, les trois haricots communs, laitue et laitue d'hiver, oignon et oignon blanc hâtif, rosier et rosier grimpant. Le partage est botaniquement juste, mais donne des bandes identiques sur des fiches voisines. Trancher entre garder et différencier.

Les 35 autres tuiles signalées sont pour un tiers des faux positifs assumés, la photographie en place étant meilleure que tout ce que la recherche a rendu, pour un tiers des fruits verts que le contrôle ne sait pas lire, graines de coriandre, sores de fougère, silique de cresson, et pour le reste des cas sans meilleur candidat.

123 fiches n'ont pas tous les organes attendus. L'audit les recense sans les traiter.
