# Navigation de l'écran du moment

Décision du 1er août 2026, appliquée dans le dépôt `techthisapp/mon-jardin`, commit `a4d175f`.

## Constat

L'écran En ce moment mesurait 6 920 pixels de haut à 430 pixels de large, soit sept écrans de téléphone, pour 64 actions réparties en 7 sections. Cinq défauts documentés.

Deux langages visuels cohabitaient. La partie haute, refaite le 1er août, était sans bordure, avec ombre douce et carrés de couleur. La partie basse restait en panneaux bordés, bandeau teinté, capitales condensées et rail coloré à gauche.

La synthèse et la liste portaient la même information. La ligne « Tailler le basilic, la courgette, la fraise et 5 autres » était suivie d'une carte reprenant les mêmes huit plantes avec trois fois plus de poids visuel.

Aucun repère de position ni retour. Les en-têtes de section n'étaient pas collants, et revenir à la synthèse demandait de remonter sept écrans.

Quatre rangs d'interface séparaient la synthèse de la première action : puce Filtres, bascule Tâche et Espace, œil des masquées, bilan chiffré.

Chaque rangée portait deux lignes de conseil tronquées, soit environ 100 pixels par action, alors que le texte entier figure dans la fiche de plante.

## Décision

Deux niveaux de lecture au lieu d'un déroulé unique.

Le premier niveau s'arrête à la carte de synthèse. Chaque ligne de verbe porte le compte de sa tâche et un chevron. Une ligne discrète sous la carte donne le décompte total, l'accès à la liste complète et l'accès aux filtres. L'écran passe à 1 039 pixels.

Le second niveau est la liste, ouverte au clic sur une ligne de verbe ou sur le verbe de la phrase de tête. Barre de retour collante portant le carré de couleur, le verbe et le compte. Rangées à plat séparées par un filet, sans panneau ni bandeau teinté. Les plantes dont la fenêtre se ferme passent en tête sur fond rosé. En bas de liste, retour à la vue d'ensemble et pas vers la tâche suivante.

Le bouton Tout voir conserve le déroulé complet, avec un rail de sections collant dont la puce suit la section lue.

## Arbitrages retenus

Le second niveau s'affiche en place et non en feuille du bas. Une liste de vingt et une récoltes tient mal dans une feuille, et la feuille reste réservée à la plante, ouverte depuis la liste.

Le déroulé complet est conservé, en accès discret sous la synthèse.

Le conseil se lit en entier au niveau d'une tâche, où la liste est courte. Il reste tronqué à deux lignes dans le déroulé complet.

Les plantes en dernière quinzaine passent en tête de leur tâche, sur fond rosé, plutôt que de rester à leur rang alphabétique.

L'œil des actions masquées se pose au pied de la liste ouverte, avec le compte de ce que l'on regarde.

## Effets de bord traités

L'état de lecture voyage dans `history.state`. Le geste de retour du téléphone ramène à la vue d'ensemble. La feuille de plante pose son entrée par-dessus le niveau courant, qu'elle restitue en se fermant.

La bascule Tâche et Espace descend dans le panneau de filtres et ne s'applique qu'au déroulé complet.

La couleur des tâches vient désormais partout de la table `TEINTE`, palette validée en CIEDE2000, par l'assistant `teinteK(k)`. Les chips de filtre et la frise du calendrier, qui lisaient encore `phases.color`, sont alignées.

Le décompte du pied ne mentionne plus les actions en dernière quinzaine : l'urgence est déjà portée par la phrase de tête et par chaque ligne.
