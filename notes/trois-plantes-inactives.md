# Phacélie, aubépine et céleri-branche, insérées inactives

Ajout du 10 août 2026. Les trois fiches manquaient au catalogue depuis la
première revue. Elles sont insérées avec `is_active` à faux : ce qu'aucune
source n'établit reste vide.

## Ce qui est renseigné

| | Phacélie | Aubépine | Céleri-branche |
|---|---|---|---|
| Latin | Phacelia tanacetifolia | Crataegus monogyna | Apium graveolens var. dulce |
| Clé GBIF | 2928226 | 9220780 | 8381154 |
| Famille | Boraginaceae | Rosaceae | Apiaceae |
| Catégorie | Fleurs annuelles | Arbustes d'ornement | Légumes |
| Cycle et port | annuelle, herbacée | vivace, arbuste | bisannuelle conduite en annuelle, herbacée |
| Exposition | soleil | soleil ou mi-ombre | soleil |
| Sol | pauvre et drainé | ordinaire | riche |
| Eau | faible | modéré | soutenu |
| Hauteur | 50 cm à 1 m | 4 à 8 m | 60 à 76 cm |
| Seuil de gel | moins 7,8 degrés | moins 20 degrés | moins 9,5 degrés |
| Feuillage | sans objet | caduc | sans objet |
| Fleur | bleu, mauve | blanc, parfumée | blanc verdâtre |
| Usages | faune | haie, écran, faune, littoral, culinaire | culinaire, plante compagne |

Le calendrier porte treize périodes et dix conseils. La phacélie se sème en
pleine terre de mars à mai puis en septembre, et fleurit de juillet à septembre.
L'aubépine se plante d'octobre à février, fleurit en mai et juin, se récolte de
septembre à novembre et se taille de juin à septembre, après la nidification. Le
céleri se sème à l'abri en mars et avril, se repique en mai et juin, se fertilise
avant plantation puis en cours de culture, et se récolte de juillet à novembre.

## Ce que les sources n'établissent pas

La toxicité des trois fiches reste vide, faute de deux sources concordantes. Le
Royal Horticultural Society signale un allergène de contact pour la phacélie et
des pépins toxiques pour l'aubépine, quand Plants For A Future n'énonce aucun
danger pour l'une ni pour l'autre. Aucune troisième source ne tranche. Les deux
positions sont écrites dans `source`.

L'écartement de la phacélie reste vide, la plante se semant à la volée. La
profondeur de plantation de l'aubépine aussi, la plantation se faisant en
racines nues.

## Un écart assumé à la source

La récolte du céleri-branche s'arrête à novembre. NC State Extension et Penn
State Extension donnent une fenêtre qui va jusqu'en décembre, mais le seuil de
gel de moins 9,5 degrés relevé par Pam Dawling ne vaut que sous voile, et sa
liste ne publie aucune valeur à découvert. L'écart à la source est écrit dans
`source`.

## Adaptation par climat

Les quinze lignes de `plant_climates` avaient été posées par analogie, la règle
de dérivation du référentiel n'étant écrite nulle part. Elle a été reconstituée
depuis, mesurée à 95,3 pour cent sur les 1524 lignes dérivées du corpus, et
portée par la fonction `niveau_climat`. Le détail est dans
`claude/adaptation-par-climat.md`.

Les quinze lignes ont été reprises sur cette règle. Treize concordaient avec
l'analogie. Deux ont changé de statut. La phacélie passe d'adaptée à protection
en océanique dégradé, la règle étant plus prudente que l'analogie. Le
céleri-branche garde en montagnard le niveau abri contre le protection de la
règle, avec `derived` à faux et sa note : la saison y est trop courte pour cent
vingt jours de culture, ce que la règle ne porte pas.

Quatorze lignes sont donc dérivées et sans note, une est posée à la main et
notée, ce qui est la convention du référentiel.

## Ce qui reste avant l'activation

La vue `controle_coherence` ne porte que sur les fiches actives : elle ne remonte
rien pour ces trois fiches, ce qui ne prouve rien. Elle ne vaut qu'au moment du
basculement.

Les contrôles d'affichage de l'étape 12 restent à passer, ainsi que le versement
des photographies et des planches, qu'aucune des trois ne porte encore. L'aubépine
et la phacélie sont bien documentées chez Pl@ntNet, le céleri-branche moins.
