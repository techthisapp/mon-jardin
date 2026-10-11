# Adaptation par climat, règle de dérivation

Reconstitution du 10 août 2026. La table `plant_climates` porte cinq lignes par
fiche, une par climat, et distingue deux régimes par la colonne `derived`. Les
1524 lignes dérivées avaient été produites par un script de campagne dont la
règle n'a jamais été écrite, ce qui interdisait d'ajouter une fiche dans les
mêmes termes que les précédentes.

## Méthode

Celle que le référentiel impose à toute règle de conversion. Les plantes sont
partagées en deux moitiés au hasard, la règle est cherchée sur l'une et mesurée
sur l'autre, puis l'opération est refaite en inversant les moitiés. Le choix
doit être le même dans les deux sens.

## Forme retenue

Deux branches, selon que la fiche porte ou non un seuil de gel.

Sans seuil de gel, la classe de rusticité décide seule. La correspondance est
exacte sur les 95 lignes concernées, dix-neuf fiches, sans une exception.

| Classe | Méditerranéen | Océanique | Océanique dégradé | Semi-continental | Montagnard |
|---|---|---|---|---|---|
| Très rustique | adapté | adapté | adapté | adapté | adapté |
| Rustique | adapté | adapté | adapté | adapté | protection |
| Assez rustique | adapté | adapté | adapté | protection | protection |

Avec seuil de gel, l'écart entre ce que la plante supporte et ce que le climat
impose se lit sur une grille de seuils. Une plante conduite en annuelle ou en
bisannuelle ne passe pas l'hiver au jardin : ce qui la limite n'est pas la
survie de la souche, et elle porte son propre jeu de paramètres.

| | Méditerranéen | Océanique | Océanique dégradé | Semi-continental | Montagnard |
|---|---|---|---|---|---|
| Pérennes | moins 2 | moins 5 | moins 12 | moins 15 | moins 20 |
| Annuelles et bisannuelles | moins 3 | moins 5 | moins 12 | moins 14 | moins 20 |

L'écart vaut le seuil de gel de la fiche moins la température de référence du
climat. Adapté jusqu'à 2 degrés pour une pérenne et 3 pour une annuelle,
protection jusqu'à 10 et 11, abri jusqu'à 18 et 19, déconseillé au-delà.

## Fidélité mesurée

| Branche | Retrouvées | Lignes | Part |
|---|---|---|---|
| Classe de rusticité | 95 | 95 | 100 % |
| Pérennes | 900 | 940 | 95,7 % |
| Annuelles et bisannuelles | 458 | 489 | 93,7 % |
| Ensemble | 1453 | 1524 | 95,3 % |

Les 71 écarts valent tous un seul cran, et se concentrent sur le montagnard, 42,
puis le semi-continental, 13.

## Ce que la mesure établit, et ce qu'elle n'établit pas

La forme de la règle est établie : elle généralise, 95,3 pour cent sur la moitié
d'apprentissage comme sur la moitié de mesure, sans écart entre les deux.

Les paramètres ne le sont qu'au grain de la grille grossière. Un balayage plus
fin, température propre à chaque climat, monte les pérennes de 95,7 à 97,0 pour
cent en généralisant encore, mais désigne des paramètres différents selon la
moitié d'apprentissage, et fait chuter les annuelles de 94,7 à 90,6 pour cent
d'une moitié à l'autre. La fonction d'objectif est plate : plusieurs jeux
rendent le même score. Les paramètres retenus sont ceux que les deux moitiés
désignent ensemble à un demi-point près.

Ce que la reconstitution ne dit pas : d'où viennent les 71 écarts. Trois
hypothèses restent ouvertes, la règle d'origine portait une entrée de plus, la
campagne a corrigé quelques lignes à la main sans les marquer, ou ses seuils
étaient plus fins que la grille ne les retrouve.

## Emploi

La fonction `public.niveau_climat(frost_min_c, hardiness, life_cycle, conduite,
climat)` porte la règle. Elle ne sert qu'aux fiches nouvelles.

Les 1524 lignes en place ne sont pas recalculées. Une reconstitution mesurée à
95,3 pour cent n'a pas autorité pour renverser soixante et onze verdicts
publiés, et le référentiel écarte les corrections qui remplacent une valeur
existante par une valeur d'un rang de confiance inférieur.

Les quinze lignes des trois fiches ajoutées le 10 août ont été reprises sur
cette règle. Treize concordaient avec l'analogie qui les avait posées. Deux ont
changé : la phacélie passe d'adaptée à protection en océanique dégradé, et le
céleri-branche garde en montagnard le niveau abri contre le protection de la
règle, avec sa note, la saison y étant trop courte pour cent vingt jours de
culture, ce que la règle ne porte pas.

## Reproduction

`outils/base/regle-climat.py` mène la recherche, `outils/base/regle-climat-retenue.py`
porte la règle retenue et mesure sa fidélité. Les deux lisent un corpus extrait
par l'interface de lecture publique et déposé dans `/tmp/corpus-climat.json`.
