# Campagne de sourçage des usages au jardin

Menée le 2 août 2026. Elle porte la colonne `plants.uses` de 91 à 241 fiches et referme le chantier ouvert par l'audit des écarts entre la base et l'affichage.

## Périmètre retenu

L'usage distingue une plante quand il dit où elle se met ou à quoi elle sert. Pour un légume, la réponse est contenue dans sa catégorie : on le cultive pour le manger, et une ligne « Usage culinaire » sur une carotte n'apprend rien. Le périmètre est donc les ornementales, les aromatiques et les fruitiers, plus les légumes dont l'emploi dépasse la consommation.

Couverture obtenue : 161 ornementales sur 161, 42 aromatiques sur 42, 35 fruitiers sur 35, et 3 légumes sur 77, la ficoïde glaciale pour le jardin littoral, le cresson de fontaine pour le bord de bassin et le haricot d'Espagne pour la clôture décorative. Les 74 légumes restants sont hors périmètre, non en attente.

## Règle de dérivation écrite, mesurée et écartée

La colonne `companions` nomme déjà l'emplacement pour beaucoup d'ornementales. Une règle de dérivation a donc été écrite avant tout appel externe : dix-huit motifs de reconnaissance, du massif au bord d'eau, produisant les clés du vocabulaire.

Mesure sur les 91 fiches déjà sourcées, qui n'avaient pas servi à établir la règle : 157 clés produites, 106 justes, soit 68 pour cent de précision et 67 pour cent de rappel. Trente-cinq fiches sur quatre-vingt-quatre recevaient un jeu de clés entièrement juste.

La règle est écartée. Le protocole du référentiel exige qu'une déduction soit validée avant d'être appliquée, et une clé fausse sur trois n'est pas une validation. L'analyse des désaccords montre d'ailleurs que `uses` est une sélection éditoriale des deux ou trois emplois qui distinguent la plante, non un relevé exhaustif des mentions : le bégonia des jardins porte « Bordure, potée, massif » dans ses associations et retient massif et bordure. Une extraction mécanique ne peut pas reproduire ce choix.

## Sourçage effectif

Cent cinquante fiches réparties en six lots de vingt-cinq, chacune consultée individuellement sur sa fiche d'espèce.

Répartition des sources : 125 fiches par le champ Garden Uses du Plant Finder du Missouri Botanical Garden, 17 par le Royal Horticultural Society quand le Plant Finder ne porte que le genre ou un cultivar, 8 par Plants For A Future pour les aromatiques absentes des deux autres. Aucune fiche laissée sans usage.

Le Plant Finder répond sur `plantfinder.mobot.org`, l'adresse `www.missouribotanicalgarden.org` redirigeant. La recherche par nom latin passe par `PlantFinderProfileResults.aspx?basic=Genre+espece`, qui donne l'identifiant de taxon exact et évite de tomber sur un cultivar.

## Contrôles passés

Contrôle mécanique sur les 150 entrées : identifiants et noms alignés sur les lots d'origine, aucune clé hors du vocabulaire des vingt-quatre usages, une à trois clés par fiche sans répétition, note de trois à six mots sans signe interdit, adresse de source appartenant à l'un des trois domaines autorisés. Zéro défaut.

Contrôle contradictoire par relecture directe de la source sur un échantillon : aster d'automne, giroflée ravenelle, cerfeuil et passiflore. Les quatre pages disent bien ce que les lots en ont tiré. La giroflée est le cas le plus instructif : sa clé `pied_de_mur` ne vient pas du champ Garden Uses mais de la phrase décrivant sa pousse dans les interstices des murs de pierre, ce que la fiche de lot signalait explicitement.

Écarts documentés avec le champ `companions` du référentiel, non confirmés par les sources et donc non repris : la haie défensive du mahonia, la rocaille du narcisse botanique, la haie fruitière de la groseille à maquereau, le mur au sud de l'amandier, la bordure de l'estragon.

## Effet sur l'affichage

La ligne Usage du bloc « Au jardin » de la fiche affiche `uses_note`, avec les libellés du vocabulaire en repli. La ligne Associations retire les segments que la ligne Usage porte déjà, ce qui fait passer la lavande de « Bordure, rocaille, pied de rosier » à « Pied de rosier ».

Les notes ont été uniformisées avec une capitale initiale, les 91 fiches antérieures en portant une et les 150 nouvelles ayant été rédigées sans.

## Reste ouvert

La colonne `companions` porte encore, sur les ornementales, des mentions d'emplacement qui relèvent de l'usage. Rien n'est perdu, l'affichage neutralise l'écho, mais un nettoyage de contenu remettrait chaque information dans sa colonne. Il demande une relecture fiche par fiche et n'a pas été fait.
