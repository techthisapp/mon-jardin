# Carnet : un nom, des corrections, des filtres

Note du 14 octobre 2026. Point 13 de `audit-personas.md`, devenu plus pressant
depuis que la case « fait » remplit le carnet d'elle-même.

## Constat

Une entrée ne se corrigeait pas : l'application ne faisait qu'insérer et
supprimer, et une faute sur un poids obligeait à tout ressaisir, photographies
comprises. Le carnet n'avait ni filtre ni recherche ; relire celui d'un massif
passait par l'écran du jardin, l'espace, puis son volet. Le même objet portait
deux noms, « Carnet » sur son écran, « Journal » dans un espace et dans la
fiche.

## Réalisation

**Un nom.** « Carnet » partout : le volet d'un espace, le bloc de la fiche, la
confirmation de suppression et le message d'une saisie sans compte.

**Corriger.** Chaque entrée porte « Modifier » à côté de « Supprimer ». La
feuille de saisie s'ouvre sous le titre « Corriger l'entrée », préremplie du
jour, de la plante, du lieu, du geste, de la quantité et du texte ; tout s'y
rechoisit, plante comprise, et l'option « Sans lieu précis » y est offerte.
L'enregistrement met à jour la ligne existante, qui garde son identifiant et
ses photographies ; celles qu'on ajoute se rangent après. La règle d'accès
`observations_update` existait déjà en base, réservée au propriétaire du
jardin : aucune migration.

**Filtrer.** Sous le titre du carnet, une rangée de pastilles « Tout le
jardin » et une par espace, puis une rangée des gestes présents dans ce qu'on
regarde, et un champ « Chercher dans le carnet » qui cherche dans le texte, le
nom de la plante, celui du lieu et le geste. La recherche ne redessine que la
liste, pour garder la frappe. Un filtre qui ne laisse rien le dit : « Aucune
entrée ne correspond à ce filtre. »

Une quantité ronde se dit sans décimale, « 3 kg » et non « 3,0 kg ».

## Défaut latent corrigé

La feuille de saisie ouverte avec une fiche recevait la valeur « vrai » au
lieu de la plante, et la note se serait enregistrée sans elle. Le cas ne se
présente pas au doigt, la fiche recouvrant la barre et son rond ; il est
corrigé et joué par un clic programmé.

## Contrôles

`outils/essais/journal.mjs`, quatre-vingt-six contrôles : le nom « Carnet »
dans l'espace, les pastilles de lieu, le filtre par geste, la recherche qui
retrouve une note et garde la frappe, la feuille de correction préremplie, la
mise à jour au lieu d'une insertion, la valeur corrigée affichée, et la plante
gardée par une note prise fiche ouverte.
