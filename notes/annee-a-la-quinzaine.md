# L'année lue à la quinzaine

Note du 12 octobre 2026. Premier lot du chantier de simplification de
l'interface, ouvert par un audit des écrans.

## Audit de départ

Le script `outils/audit/interface.mjs` sert l'application sur les données
figées des essais, avec un jardin de dix-sept plantes réparties en trois
espaces, et parcourt dix-neuf vues à 393 points de large. Il rend pour chacune
une capture pleine page, la hauteur, le nombre de contrôles visibles et le
nombre de mots. Il se relance après chaque livraison pour mesurer l'écart.

Les constats, par ordre de gain attendu :

1. L'écran du jour dit trois fois la tâche du moment (phrase de tête, phrase
   des ouvertures, lignes de tâche) et trois fois l'eau (tuile, alerte, ligne
   de la synthèse).
2. Mes plantes, le catalogue et l'écran d'un espace groupent sur deux niveaux,
   catégorie puis typologie : onze titres pour dix-sept plantes, dont cinq
   sur une seule plante.
3. L'écran de l'année porte quatre commandes en tête et rétablit, par « Mon
   jardin seulement », la portée que la refonte du 13 août avait retirée
   partout ailleurs.
4. La fiche porte quatre onglets, et non trois. Le besoin en eau paraît dans
   deux d'entre eux. L'onglet « Au jardin » est un formulaire brut.
5. L'écran d'un espace compte cinquante contrôles visibles.
6. Les feuilles du temps et de l'eau tiennent du tableau de bord : sept
   courbes et trois modes pour l'une, un réglage du sol pour l'autre.
7. L'écran du jardin garde en permanence le champ d'ajout et la tuile des
   plantes non placées, même vide.
8. La liste complète du jour mesure 3 698 points pour dix-sept plantes.

## Décision

Jérôme a retenu de traiter d'abord l'écran de l'année : il s'ouvre sur la
quinzaine, résumée par geste avec les plantes concernées, se parcourt de
quinzaine en quinzaine par deux flèches, et rebascule sur le planning complet.

## Réalisation

Une bascule en tête de l'écran porte deux lectures, « Quinzaine » et « Toute
l'année ». La seconde est la frise d'avant, avec ses filtres, son regroupement
et sa légende, inchangés.

La lecture à la quinzaine porte un titre entre deux flèches de 44 points, par
exemple « Première quinzaine d'août », et un sous-titre qui en donne les jours
et la dit en cours le cas échéant. Hors de la quinzaine en cours, un lien
ramène à celle-ci. Le parcours boucle : la flèche suivante mène de fin
décembre à début janvier.

Sous le titre, le compte des actions et des plantes, puis une carte par geste,
dans l'ordre de l'écran du jour. Chaque carte porte le carré de la tâche, son
verbe et son compte, puis une rangée par plante, avec la vignette, le nom, le
mode propre à la plante sous le verbe générique de la multiplication, et la
pastille de dernière ou de première quinzaine. Une rangée ouvre la fiche.

Le périmètre est celui du jardin, sans filtre. Le décalage climatique
s'applique, par `segsDe`. Les masquages définitifs s'appliquent ; ceux de la
quinzaine ou de la période ne valent que pour la quinzaine en cours et pour
l'écran du jour, ils ne s'appliquent pas ici. Sur la quinzaine en cours sans
masquage, le compte est donc celui de l'écran du jour, ce que l'essai vérifie.

L'écran s'ouvre toujours sur la quinzaine en cours : quitter l'année et y
revenir rend cette lecture, même après un passage par la frise. Basculer d'une
lecture à l'autre garde la quinzaine lue.

## Mesures

Écran de l'année, jardin de dix-sept plantes, au 2 août : 2 389 points de haut
et 40 contrôles visibles, contre 1 215 points et 143 contrôles pour la frise.
L'écran est plus long mais se lit sans légende ; la longueur vient d'une rangée
de 44 points par plante et par geste.

## Défaut relevé au passage

Le filtre par mois de la frise, `dansMois`, et le tracé filtré, `segs`, testent
le chevauchement par `v[0] <= b && v[1] >= a`, sans le cas d'une fenêtre à
cheval sur le 1er janvier. Une multiplication de fin novembre à début février
disparaît donc de la frise filtrée sur janvier. Corrigé le 14 octobre 2026 par
`chevauche`, qui teste chaque quinzaine de la période avec `dansFenetre` ;
contrôle ajouté à `outils/essais/frise.mjs`.

## Contrôles

`outils/essais/annee.mjs`, trente-quatre contrôles : ouverture sur la quinzaine
en cours, accord du compte avec l'écran du jour, ordre des gestes, compte de
chaque carte, parcours avant et arrière, passage d'une année à l'autre, fenêtre
du figuier à cheval sur le 1er janvier, ouverture de la fiche, bascule vers la
frise et retour, réouverture sur la quinzaine en cours, tenue à 320, 360 et 430
points.

`ouvrirFrise`, ajoutée à `outils/essais/commun.mjs`, ouvre la frise derrière la
bascule. Les suites `frise`, `navigation` et `regroupement` l'emploient.
