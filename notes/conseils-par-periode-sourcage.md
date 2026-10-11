# Conseils par période : sortie de la rédaction d'origine

## Ce que recouvraient les 252 conseils jamais relus

Ils portaient tous la mention de provenance `derive_periode` et l'état de
relecture `aucune`. À première vue, deux cent cinquante-deux textes à sourcer un
par un.

L'examen a montré autre chose. Chacun est composé de deux morceaux : un
préambule, qui explique pourquoi cette période convient à cette tâche, suivi du
conseil de fiche de la même tâche, déjà vérifié, parfois spécialisé à la saison.
La fiche de l'achillée dit « Planter au printemps ou en automne » ; le conseil
de la fenêtre de printemps dit « Planter au printemps », celui de la fenêtre
d'automne dit « Planter en automne ».

Les préambules viennent d'une bibliothèque de trente-cinq entrées. Le travail
n'était donc pas de sourcer deux cent cinquante-deux textes mais trente-cinq,
puis de contrôler la composition.

## Méthode

Les trente-cinq préambules ont été répartis en cinq lots confiés à des
relecteurs distincts, avec une consigne écrite : décomposer chaque texte en
affirmations, chercher pour chacune une source qui l'établisse ou la
contredise, et rendre un verdict parmi confirmé, à corriger, à retirer, avec la
citation de la source, quinze mots au plus.

La consigne imposait de choisir `a_corriger` en cas d'hésitation, au motif qu'un
préambule employé sur vingt-huit fiches propage son erreur vingt-huit fois.

Sources acceptées, rang 1 : Royal Horticultural Society, services d'extension
universitaires anglophones, INRAE, chambres d'agriculture, Missouri Botanical
Garden. Rang 2 : Terre Vivante, Société nationale d'horticulture de France.

## Résultat

Quinze préambules confirmés, deux tirés du calendrier et des colonnes de la
fiche, dix-huit corrigés.

## Les trois erreurs qui revenaient

**La reprise annoncée comme rapide après une plantation ou une division de
printemps.** Quarante-quatre fiches. Les sources disent l'inverse : le Royal
Horticultural Society note qu'un sujet planté à l'automne ou en hiver est plus
facile à suivre parce qu'il demande moins d'arrosage qu'une plantation de
printemps ; l'extension du Maryland compte environ trois ans avant qu'une vivace
soit bien installée ; Penn State compte un an d'installation par deux
centimètres et demi de diamètre de tronc ; Clemson signale que les vivaces
divisées au printemps fleurissent plus tard que d'habitude et que certaines
attendent trois ans. Le texte laissait croire qu'aucun suivi n'était nécessaire.

**La levée annoncée comme rapide en semis d'été et de fin d'été.** Neuf fiches.
Le texte se contredisait lui-même : les espèces qui montent à graine sous la
chaleur sont celles de saison fraîche, et ce sont justement celles dont la
germination est freinée ou bloquée en sol chaud. La table de l'extension
d'Oregon State donne zéro levée pour la laitue et l'épinard à trente-cinq
degrés. NC State demande de semer plus profond en fin d'été parce que la surface
est plus sèche et plus chaude.

**L'arrosage réduit au seul jour de la plantation.** Seize fiches. Le Royal
Horticultural Society impute les échecs d'installation au manque d'arrosage
pendant les deux premières années après plantation, et chiffre le besoin à
trente à cinquante litres par mètre carré et par semaine par temps sec.

## Deux corrections de fond sur les bulbes

Le bulbe ne s'enracine pas pendant l'hiver mais à l'automne, avant que le sol ne
gèle, ce qui change la date limite de plantation.

La plantation d'automne ne fait pas fleurir plus tôt : elle permet de fleurir,
le bulbe ayant besoin d'une période de froid pour lever sa dormance et engager
la formation de la fleur. Le préambule contenait donc un conseil de repli
impossible, envoyer planter au printemps en terre lourde. La réponse à une terre
lourde est le drainage, pas le report de six mois.

## Une correction proposée à tort, rattrapée

Deux relecteurs ont proposé de retirer les vingt-cinq centimètres
d'éclaircissage de deux préambules, au motif qu'aucune distance générale ne vaut
pour toutes les espèces. C'est juste en général et faux ici : ces deux
préambules ne servent qu'au souci, et les vingt-cinq centimètres viennent de
l'écartement porté par sa propre fiche. La correction n'a pas été appliquée, et
ces préambules sont classés comme tirés de la fiche.

C'est le cas d'école du relecteur qui ne voit que son lot. Une proposition de
correction se vérifie contre la base avant d'être appliquée.

## Une contradiction de composition

Trois fiches, l'abricotier, l'amandier et le pêcher, portaient un conseil de
plantation de printemps pour un sujet vendu en conteneur qui enchaînait sur
« Planter à racines nues en repos végétatif ». La phrase du conseil de fiche
n'avait pas été spécialisée à la période. Elle l'est désormais.

## État

Aucun conseil de plante active n'est plus dans sa rédaction d'origine. Les
quatre-vingt-dix-neuf mille caractères de conseils du référentiel se répartissent
entre vérifiés contre une source, tirés de la fiche, et réécrits après
vérification.

Reste un texte de floraison partagé par vingt-cinq plantes, « Période de
floraison principale, à ne pas tailler sous peine de supprimer les fleurs de
l'année ». Générique et juste, sans rien de propre à la plante. Enrichissement
éditorial possible, sans gain de justesse.

## Semis d'automne du pois

Traité dans le même mouvement. Terre Vivante documente le semis d'octobre et
novembre des variétés à grains ronds, variété Douce Provence, et le semis de
septembre à novembre du Carouby de Maussane en précisant « en climat doux ».

La colonne `climates` de `plant_phases` sait exprimer cette réserve. La fenêtre
est ouverte pour l'océanique et le méditerranéen seulement, les deux climats
dont le minimum habituel du référentiel reste au-dessus de moins sept degrés.

La fenêtre de protection existante portait sur le climat montagnard en septembre
et octobre et ne protégeait rien : sous ce climat le pois est semé en avril et
récolté en juillet. Elle suit désormais le semis d'automne, sur les deux mêmes
climats, de décembre à février.

Reste à établir la fenêtre de récolte de ce semis d'automne. Terre Vivante parle
d'une récolte de fin d'hiver pour le Carouby de Maussane, sans la dater pour la
Douce Provence. Le conseil l'énonce, le calendrier ne la porte pas encore.
