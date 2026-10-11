# Planches de plantes libres de droit

Recherche du 3 août 2026, en réponse à la question d'un herbier dessiné et
homogène. Les volumes et les couvertures sont mesurés contre les 315 fiches
actives, par appariement sur le binôme latin et les trois noms acceptés déjà
enregistrés, plus le nom français pour Vilmorin.

## Le principe d'homogénéité

Un fonds homogène est un ouvrage unique, dessiné par une même main pour un même
projet éditorial. Les grandes banques d'images agrègent au contraire des
sources multiples et n'ont aucune unité graphique. Les quatre premiers fonds
ci-dessous sont des ouvrages, le cinquième est un type de document.

Tous les ouvrages du dix-neuvième siècle cités sont dans le domaine public, ce
qui a été vérifié fichier par fichier sur Wikimedia Commons.

## Vilmorin-Andrieux, Les plantes potagères, 1883 et 1904

Neuf cent soixante-seize planches sur Wikimedia Commons, réparties en deux
catégories, une par édition. Gravure au trait, un légume ou une variété par
planche, sobre, lisible en vignette. Les fichiers portent le nom français de la
variété, ce qui permet un appariement direct sur la colonne `name`.

Couvre au moins 82 fiches du référentiel, c'est-à-dire l'essentiel du potager et
des aromatiques : ail, artichaut, arroche, asperge, aubergine, basilic,
betterave, brocoli, cardon, céleri-rave, cerfeuil, chou-fleur, concombre,
cresson alénois, lavande, mâche, melon, panais, piment, radis, romarin,
sarriette, sauge.

C'est le seul fonds qui couvre le potager, et il est français.

Catégories : `Category:Vilmorin-Andrieux, Les plantes potagères 1883` et `1904`.

## Otto Wilhelm Thomé, Flora von Deutschland, Österreich und der Schweiz, 1885

Mille deux cent quarante-quatre fichiers, 583 espèces distinctes.
Chromolithographie couleur, plante entière avec le détail de la fleur et du
fruit. Le plus homogène et le plus complet des floras du siècle.

Couvre 82 fiches à l'espèce et 102 de plus au genre. Flore d'Europe centrale, ce
qui exclut les ornementales d'origine exotique.

Nommage régulier, `File:Illustration <Genre> <espèce>0.jpg`, appariement
immédiat.

Catégorie : `Category:Thomé, Flora von Deutschland`.

## Amédée Masclef, Atlas des plantes de France, 1891

Quatre cent vingt-sept planches, 381 espèces. Chromolithographie couleur, flore
de France. Couvre 44 fiches à l'espèce et 111 de plus au genre. Recoupe Thomé
sans le doubler entièrement.

Catégorie : `Category:Atlas des plantes de France`.

## Franz Eugen Köhler, Köhler's Medizinal-Pflanzen, 1887

Quatre cent trente-trois fichiers, 290 espèces. Chromolithographie couleur,
plantes médicinales, donc l'essentiel des aromatiques. Couvre 45 fiches à
l'espèce et 49 de plus au genre.

Catégorie : `Category:Köhlers Medizinal-Pflanzen`.

## Planches d'herbier numérisées

L'herbier au sens propre : un spécimen pressé sur une feuille, avec son
étiquette. Homogène par nature, austère par nature, et il montre une plante
brunie plutôt qu'une plante vivante.

GBIF agrège les numérisations des institutions et expose les licences fichier
par fichier. Comptages relevés : 2503 planches pour la lavande, 2433 pour la
tomate, 1982 pour le buddleia, 1416 pour la courgette, 582 pour le dahlia. La
couverture est totale, cultivars compris.

Licences mêlées, à filtrer : CC0 et CC BY sont réutilisables, CC BY-NC-SA ne
l'est pas pour un usage non strictement personnel. Le filtrage se fait sur le
champ `license` de chaque média.

Accès : `api.gbif.org/v1/occurrence/search?taxonKey=<clé>&mediaType=StillImage&basisOfRecord=PRESERVED_SPECIMEN`.
Le référentiel porte déjà `gbif_usage_key` sur ses fiches.

## Couverture totale des quatre ouvrages

Cent quarante-quatre fiches ont une planche de leur espèce. Quatre-vingt-quatorze
de plus ont une planche de leur genre. Soixante-dix-sept n'ont rien.

Le comptage est prudent : appariement strict sur le binôme et sous-ensemble
strict des mots du nom français. La couverture réelle est supérieure.

Les 77 sans planche sont presque toutes des ornementales d'origine non
européenne, abélia, aster d'automne, bignone, coréopsis, cosmos, dahlia,
échinacée, glycine, hortensia, kaki, lilas, mahonia, passiflore, pétunia,
phlox, pyracantha, rudbeckie, weigela, zinnia, plus quelques cultivars potagers.

## Pour les 77 restantes

Les planches existent, dans le domaine public, chez Curtis's Botanical Magazine,
Addisonia, Gartenflora, Flore des serres et des jardins de l'Europe et la Revue
horticole. Vérifié par sondage sur douze de ces espèces, toutes trouvées.

Mais ces recueils s'étendent sur un siècle et demi et sur des dizaines de
dessinateurs. La couverture y gagne, l'homogénéité s'y perd. Le choix est entre
une couverture partielle et unifiée, et une couverture complète et disparate.

## Piste intermédiaire

Rien n'oblige à un seul fonds. Deux paliers se tiennent : le trait de Vilmorin
pour le potager et les aromatiques, la couleur de Thomé complétée par Masclef et
Köhler pour tout ce qui relève de la flore d'Europe. Deux styles, mais chacun
cohérent sur son domaine, et la frontière entre les deux recoupe une frontière
que l'application affiche déjà, celle du potager et de l'ornement.

## Accès technique

L'API de Wikimedia Commons répond depuis l'atelier sans authentification :
`commons.wikimedia.org/w/api.php?action=query&list=categorymembers` pour lister
un fonds, `prop=imageinfo&iiurlwidth=<largeur>` pour obtenir une vignette
redimensionnée et la licence. Prévoir un en-tête `User-Agent` explicite et un
délai entre les appels, l'API limite le débit.

Les vignettes redimensionnées sont servies par `upload.wikimedia.org` et
peuvent être appelées directement, ce qui évite d'héberger les images.
