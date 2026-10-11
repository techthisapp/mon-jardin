# Photographies de la fiche

## Bande d'organes

Une tuile par organe, dans l'ordre fleur, feuille, fruit, racine, port, écorce.
La tuile montre la première image du groupe de cet organe. Les tailles viennent
du fonds, rien n'est recadré ni réhébergé.

## Groupes par organe

`chargerPhotos` rend un tableau par organe, trié par rang, et non plus une seule
image. La bande montre le premier de chaque groupe, le plein écran parcourt les
autres.

Le groupe est fait des images retenues, `retenue` vrai ou nul, triées par rang.
Une image que la personne connectée a jugée « à supprimer » n'y figure pas, pour
elle seule. Quand aucune image n'est retenue pour un organe attendu, le groupe
est fait de celles que le contrôle automatique avait écartées, `retrait_motif`
égal à `relecture` : le contrôle est une suspicion, l'avis d'une personne est un
verdict, et une image dont le `retrait_motif` vaut `avis` n'est jamais reprise.

## Deux axes au plein écran

L'horizontale passe d'un organe à l'autre. La verticale parcourt la réserve de
l'organe regardé, jusqu'à six images.

Les trois gestes tiennent sur deux axes sans se disputer. Au premier rang il n'y
a rien au dessus : un tirage vers le bas ne peut vouloir dire que fermer. Au delà
du premier rang, il ramène le rang précédent. Aux deux bouts de chaque axe, la
course ne garde qu'un tiers de son amplitude et l'image revient à sa place.

L'axe est verrouillé au premier mouvement franc, dix points de course, et ne se
relâche plus jusqu'au relâchement du doigt. Tant qu'aucun des deux axes ne
dépasse l'autre d'un tiers, rien ne bouge. Le changement est acquis au cinquième
de la largeur ou au sixième de la hauteur, ou à un demi point par milliseconde.

Un geste né sur un verdict ou sur la croix leur appartient et ne fait rien
glisser. Changer d'organe rouvre au premier rang de sa réserve.

Les flèches de gauche et de droite parcourent les organes, celles du haut et du
bas la réserve. L'échappement referme le plein écran avant la fiche.

## Ce qui dit qu'il y a une réserve

Le nom de l'organe est suivi du compte, « 2 sur 6 », dès que le groupe porte plus
d'une image. Une colonne de repères se pose au bord droit, en regard de la ligne
de repères des organes au bas de l'écran.

## Organes sans objet

L'écorce n'a pas d'objet chez une plante dont le port n'est pas ligneux, hors
arbre, arbuste, liane et sous-arbrisseau. Le fruit n'en a pas davantage chez un
légume-feuille, une racine ou un bulbe. Ces organes ne reçoivent pas le repli et
leur tuile reste absente. Les 79 tuiles vides du catalogue relèvent toutes de
cette règle.

## Poids d'un avis

`recalculer_avis_photo` pondère chaque avis. Un compte ordinaire pèse 1, un
compte inscrit dans `mainteneurs` pèse `seuil_retrait_photo()`, soit 3. Le retrait
est prononcé quand la somme des « à supprimer » moins celle des « bonne » atteint
le seuil. Un avis de mainteneur suffit donc à retirer une image pour tout le
monde, ce qui explique un `n_supprimer` de 3 pour un seul avis posé.

## Titres de l'onglet

Les quatre titres de l'onglet de l'identité portent la même forme : famille du
corps de texte, 13 points, graisse 700, casse normale, sans interlettrage. Cela
vaut pour le titre de la bande, pour les titres de bloc et pour les entêtes de
carte. Le titre de la bande laisse 10 points avant les tuiles.

## Attribution

L'attribution et la portée de la photographie sont portées par le mot « Crédits »
sous la bande, qui ouvre le même volet que les termes du glossaire. Le pied de
bande mesure 18 points au lieu des 66 qu'occupaient les quatre lignes de texte.
Elle nomme les auteurs des images de tête, celles que la bande montre.

La licence reste satisfaite : la mention est à un appui, et le plein écran nomme
l'auteur de chaque image avec sa licence et le lien vers sa source, quel que soit
son rang.

Un lot Pl@ntNet est sous licence unique, la phrase la nomme une fois puis énumère
les auteurs. Un lot Wikimedia mêle les licences, 45 fiches sur 62 en portent
plusieurs : chaque auteur y est suivi de la sienne.

## Volet de note

`ouvrirGlose` sert deux emplois. Un bouton portant `data-terme` affiche la
définition du référentiel de glossaire. Un bouton portant `data-titre` et
`data-note` affiche le texte qu'il porte lui-même, ce dont se sert l'attribution.
Les deux se ferment par l'échappement ou par un appui à côté.
