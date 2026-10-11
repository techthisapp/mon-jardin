# Fiche plante, trois onglets

La fiche est répartie en trois onglets : « En ce moment », « Toute l'année » et
« Identité ». **En production depuis les commits 5ac4baf, 9e2ca73, 13e85bc et
47d8db5.**

## Règle de répartition

Un onglet par question posée à la fiche. Ce qu'il y a à faire cette quinzaine,
ce qui se déroule au fil de l'année, et ce que la plante est. La répartition
antérieure en deux onglets mêlait les deux dernières : le calendrier annuel, les
conditions de culture, la famille et la hauteur cohabitaient dans « Toute
l'année », alors que seule la première moitié se déroule dans le temps.

L'entête reste commun aux trois : nom, nom latin suivi de la famille, pastille
de typologie, rangée de jauges, avertissement de toxicité, conseil général.

## Contenu de chaque onglet

« En ce moment » ne change pas : les alertes datées, le besoin en eau du jour,
ce qui a lieu, ce qu'il y a à faire, ou la carte des prochaines échéances quand
aucune phase n'est active.

« Toute l'année » porte le ruban ou la roue de l'année, le besoin en eau, le pic
de floraison quand il est sourcé, et le bloc Culture.

« Identité » porte la bande de photographies, le bloc Au jardin, la taille à
maturité et le bloc Identité.

Le bloc Au jardin réunit le nectar, le parfum, le feuillage, l'usage et le
voisinage. Ce sont des caractères de la plante et non des gestes datés : il a
suivi l'identité, où il ouvre la partie écrite, sous les photographies.

## Onglet d'ouverture

La fiche s'ouvre sur « En ce moment » pour une plante du jardin, sur « Identité »
pour une plante du catalogue qui n'y est pas. Une plante qu'on cultive appelle
le geste de la quinzaine, une plante qu'on découvre appelle ce qu'elle est. La
règle tient dans une ligne, `sel.has(p.id) ? "moment" : "identite"`, qui commande
à la fois l'onglet marqué et le panneau déplié.

## Bloc Identité

Le bloc porte le nom accepté quand il diverge, le cycle, la hauteur,
l'écartement, la première récolte, la rusticité et le crédit de la planche.

Pas de ligne Famille : l'entête l'écrit déjà après le nom latin. Les quatre
fiches sans nom latin, Livèche, Mélisse, Raisin de table et Souci, sont
désactivées et remplacées par une fiche nommée, l'application ne les charge pas.
Les 316 fiches actives portent toutes un nom latin et une famille. Un contrôle
d'essai porte sur les deux moitiés de la règle, l'absence dans le bloc et la
présence dans l'entête, pour que la famille ne puisse pas disparaître de la
fiche sans que rien ne le signale.

## Nom accepté

La vue `plants_full` porte une colonne `nom_accepte`, calculée par la fonction
`nom_normalise(text)`. Elle ne rend un nom que lorsque POWO et GBIF convergent
vers le même, différent de celui d'usage. Quand les deux référentiels divergent,
le cas est ouvert et rien n'est affirmé. Trente fiches reçoivent une valeur.

L'application écarte ensuite deux cas qui n'apprennent rien au jardinier. Le
rabattement de rang, où le nom rendu n'est que la forme moins précise du nôtre :
« Brassica oleracea » face à « Brassica oleracea var. capitata ». Et l'épithète
répétée que rendent certains référentiels, écrite une seule fois : « Hydrangea
serrata serrata » devient « Hydrangea serrata ».

Quinze fiches affichent donc une ligne Nom accepté : Amandier, Anémone du Japon,
Azalée japonaise, Bergénia, Chou-fleur, Hortensia grimpant, Kiwi, Lentille,
Melon d'eau à confire, Œillet d'Inde, Pennisetum, Pois, Potentille arbustive,
Romanesco et Scorsonère.

La règle du préfixe et le nettoyage de l'épithète vivent dans l'application et
non dans la vue. Une seconde migration aurait dû remplacer la colonne déjà
définie, ce que `create or replace view` ne permet pas.

## Contrôles automatisés

Trois cent vingt-six contrôles sont joués par `npm run essais`. La suite
`outils/essais/blocs.mjs` en porte trente, dont quatre sur le nom accepté et deux
sur la famille. La suite `outils/essais/photos.mjs` en porte vingt-neuf, dont
quatre sur l'onglet d'ouverture et trois sur la répartition des blocs entre les
deux onglets. La doublure sert un jardin réglable par `window.__JARDIN__`, ce qui
permet d'ouvrir la fiche d'une plante absente du jardin.
