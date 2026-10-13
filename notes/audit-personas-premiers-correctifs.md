# Premiers correctifs de l'audit par personas

Note du 13 octobre 2026. Traite les constats de `audit-personas.md` qui ne
demandaient pas d'arbitrage : les points 1, 3 à 7, 9 à 11. Les points 2, 8, 12
et 16 attendent la décision de Jérôme.

## Tuile de l'eau

La tuile porte d'abord la décision, puis la quantité : « Arroser » et
« 26 L/m² », « Attendre » et « pluie 4 mm », « Pas besoin » et « réserve
3 jours », avec une icône par décision, goutte, nuage de pluie ou coche.
L'état qui demande un geste prend un fond franc, bleu soutenu à texte clair :
l'ancien fond, à peine plus bleu que le papier, avait un contraste de 1,0.

## Un nom par geste

Les pastilles d'un espace comptent et nomment la tâche par son verbe, comme le
jour et l'année : « 7 à récolter », « 4 à amender », et « 3 en fleur » pour ce
qui n'est pas un geste. La ligne d'une plante porte le même verbe, et le
message d'un filtre vide devient « Rien à récolter ici en ce moment ».

Le carnet accepte deux gestes de plus, « Amendement » et « Multiplication ».
La contrainte `observations_geste` les refusait : la migration
`observations_gestes_amendement_multiplication` élargit la liste, sans rien
retirer, et les entrées existantes restent valides.

Les intitulés de période de la fiche, « Taille, entretien » ou « Fertilisation,
amendement », viennent de la table `phases` et ne sont pas touchés : ce sont
des noms de période, et leur libellé relève du contenu.

## Saisie au carnet

La plante se choisit avant le lieu. Hors de tout lieu, aucun espace n'est
présélectionné, l'option « Sans lieu précis » ouvre la liste, et toutes les
plantes du jardin sont offertes ; choisir une plante place la note là où elle
pousse. Depuis un espace, les plantes offertes sont celles de l'espace et de
ses zones, et non plus celles du seul lieu choisi. La table accepte une entrée
portée par la plante seule, la contrainte `observations_rattachee` demandant
une plante ou un lieu ; la saisie le vérifie avant l'envoi. Un jardin sans
espace peut désormais noter sur ses plantes.

« Enregistrer » est un bouton plein de 44 points, écarté d'« Annuler ».

Défaut corrigé au passage : le rond « Noter » lisait le contexte après être
passé au carnet, et ne voyait donc plus l'espace ouvert. La saisie retombait
sur le premier lieu du jardin, qui était souvent, par chance, celui de l'écran.
Le contexte se lit maintenant avant le changement d'écran.

## Lisibilité

Le troisième gris, qui porte les bornes, les sources et les notes, passe de
`#8A9089` à `#5F6A63` : 5,1 de contraste sur le papier au lieu de 2,9. Les
comptes des barres de niveau, le numéro de version et l'indication « qté »
suivent.

Sur un écran tactile, tout champ de saisie prend au moins seize pixels, seuil
sous lequel Safari agrandit la page au toucher.

La toxicité porte son mot, « toxique », à côté du losange, qui ne disait son
sens que par une bulle invisible au doigt.

## Libellés

Le rond porte le mot « Noter » sous lui, comme les fentes de la barre. Sous 340
points de large, les cinq mots se resserrent au lieu de disparaître.

Le livre du catalogue n'a pas reçu de libellé : l'en-tête n'a pas la place d'un
mot sans rogner le nom du jardin, et les états vides offrent désormais un
bouton qui ouvre le catalogue.

## Première prise en main

Les états vides portent leurs gestes. Sans compte : « Se connecter » et
« Parcourir le catalogue ». Connecté sans plante : « Ajouter mes plantes », et
« Indiquer ma commune » tant que le jardin n'est pas situé. « Mes plantes »
sans compte ne montre plus le catalogue entier sous « 0 plante au jardin ».

Cocher une plante au catalogue la confirme dans le bandeau d'état, « Tomate
rejoint le jardin, 3 plantes en tout », avec l'action « Voir mes plantes ».

La feuille du compte ne montre plus que l'adresse et son bouton ; le second
champ se replie derrière « J'ai un code de reprise ou un code reçu », et
s'ouvre de lui-même une fois le lien envoyé.

Le renvoi « à placer depuis l'onglet Mes plantes », qui nommait un onglet
disparu, devient « à placer depuis sa fiche ».

## Contrôles

`outils/essais/eau.mjs` contrôle les trois décisions de la tuile.
`outils/essais/espaces.mjs` contrôle les pastilles en verbe.
`outils/essais/journal.mjs` contrôle l'ordre plante puis lieu, les plantes de
l'espace et de ses zones, la note placée dans la zone de la plante, l'absence
de lieu présélectionné hors de tout espace, et le contexte de l'espace repris
par le rond. `outils/essais/annee.mjs` contrôle les gestes des états vides,
« Mes plantes » sans compte, l'ouverture du catalogue et la confirmation d'un
ajout.
