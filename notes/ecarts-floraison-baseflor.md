# Écarts de floraison, référentiel jardin et baseflor

Confrontation des périodes de floraison de la table `plant_phases` (phase floraison, climat tempéré de référence) aux périodes de baseflor (Tela Botanica, Philippe Julve). Périmètre : 96 plantes actives disposant d'une période de floraison dans les deux sources. 60 plantes sans écart, 36 écarts listés ci-dessous.

Baseflor décrit la floraison des populations spontanées en France. Le référentiel décrit le comportement au jardin, pour des plantes souvent cultivées, sélectionnées ou hors de leur aire naturelle. Un écart n'est donc pas une erreur en soi. Les mois sont numérotés de 1 à 12.

## Écarts larges, à examiner en priorité

| Plante | Nom latin | Base | Baseflor | Mois absents de la base | Mois en plus dans la base |
|---|---|---|---|---|---|
| Goji | Lycium barbarum | 6 à 8 | 3 à 10 | 3, 4, 5, 9, 10 | |
| Pâquerette | Bellis perennis | 2 à 6 | 3 à 11 | 7, 8, 9, 10, 11 | 2 |
| Baie de mai | Lonicera caerulea | 3 à 4 | 5 à 7 | 5, 6, 7 | 3, 4 |
| Luzule | Luzula nivea | 4 à 5 | 6 à 8 | 6, 7, 8 | 4, 5 |
| Laurier-tin | Viburnum tinus | 10 à 4 | 2 à 6 | 5, 6 | 1, 10, 11, 12 |
| Digitale | Digitalis purpurea | 5 à 7 | 5 à 9 | 8, 9 | |
| Houblon doré | Humulus lupulus | 8 à 9 | 6 à 9 | 6, 7 | |
| Pomme de terre | Solanum tuberosum | 6 à 7 | 6 à 9 | 8, 9 | |
| Statice | Limonium sinuatum | 7 à 10 | 5 à 9 | 5, 6 | 10 |
| Argousier | Hippophae rhamnoides | 4 | 3 à 5 | 3, 5 | |

Trois cas de cette liste s'expliquent probablement par la culture. La Baie de mai fleurit très tôt en verger, bien avant les populations subalpines décrites par baseflor. Le Laurier-tin cultivé fleurit en hiver, ce que la base traduit correctement, mais la fin de floraison de mai et juin manque. La Pâquerette sauvage fleurit presque toute l'année, la base retient la période utile au jardin.

## Écarts d'un ou deux mois

| Plante | Nom latin | Base | Baseflor | Mois absents de la base | Mois en plus dans la base |
|---|---|---|---|---|---|
| Abricotier | Prunus armeniaca | 3 à 4 | 2 à 4 | 2 | |
| Alysse odorante | Lobularia maritima | 5 à 11 | 4 à 9 | 4 | 10, 11 |
| Bourrache | Borago officinalis | 5 à 10 | 4 à 9 | 4 | 10 |
| Campanule à grosses fleurs | Campanula medium | 6 à 7 | 5 à 7 | 5 | |
| Carvi | Carum carvi | 5 à 6 | 5 à 7 | 7 | |
| Colchique | Colchicum autumnale | 9 à 10 | 8 à 10 | 8 | |
| Crocus | Crocus vernus | 2 à 4 | 2 à 5 | 5 | |
| Cyclamen de Naples | Cyclamen hederifolium | 8 à 10 | 8 à 11 | 11 | |
| Delphinium | Delphinium elatum | 6, 7, 9, 10 | 7 à 8 | 8 | 6, 9, 10 |
| Fenouil aromatique | Foeniculum vulgare | 7 à 9 | 7 à 10 | 10 | |
| Fusain d'Europe | Euonymus europaeus | 5 à 6 | 4 à 5 | 4 | 6 |
| Jacinthe | Hyacinthus orientalis | 3 à 5 | 2 à 3 | 2 | 4, 5 |
| Lilas | Syringa vulgaris | 5 à 6 | 4 à 5 | 4 | 6 |
| Lis | Lilium candidum | 6 à 9 | 5 à 7 | 5 | 8, 9 |
| Livèche officinale | Levisticum officinale | 6 à 7 | 7 à 8 | 8 | 6 |
| Marguerite | Leucanthemum vulgare | 6 à 8 | 5 à 8 | 5 | |
| Muflier | Antirrhinum majus | 6 à 10 | 5 à 9 | 5 | 10 |
| Muguet | Convallaria majalis | 4 à 5 | 4 à 6 | 6 | |
| Noisetier | Corylus avellana | 1 à 2 | 1 à 3 | 3 | |
| Noyer | Juglans regia | 5 | 4 à 5 | 4 | |
| Œillet de poète | Dianthus barbatus | 5 à 7 | 7 à 8 | 8 | 5, 6 |
| Pervenche | Vinca minor | 3 à 6 | 2 à 5 | 2 | 6 |
| Poirier | Pyrus communis | 4 | 4 à 5 | 5 | |
| Rue officinale | Ruta graveolens | 6 à 8 | 5 à 8 | 5 | |
| Sauge sclarée | Salvia sclarea | 6 à 8 | 6 à 9 | 9 | |
| Tulipe botanique | Tulipa clusiana | 3 à 4 | 3 à 5 | 5 | |

## Écarts de sens inverse

Le Delphinium porte dans la base deux périodes disjointes, juin à juillet puis septembre à octobre, ce qui correspond à la remontée après taille pratiquée au jardin. Baseflor ne décrit que la floraison principale de juillet à août. L'écart est cohérent avec la conduite horticole.

Le Laurier-tin, l'Alysse odorante, le Muflier et le Lis présentent une floraison plus longue dans la base que dans la nature, ce qui correspond aux cultivars horticoles et aux conditions de jardin.

## Méthode

Les périodes de la base sont stockées en demi-mois de 1 à 24 dans `plant_phases`, converties en mois par la formule partie entière de la demi-période plus un, divisée par deux. Seules les lignes du climat tempéré de référence sont retenues. Les périodes de baseflor proviennent du champ `floraison` de la colonne `baseflor`, alimenté le 28 juillet 2026.
