# Estimations horticoles et liste des points à vérifier

Travaux du 28 juillet 2026.

## Complétion des champs nectar, pollen et parfum

Les sources apicoles mobilisées ne couvrent que 52 plantes sur 315, faute de source publique traitant le potager et l'ornement. Les champs restants ont été complétés par estimation horticole, à partir des connaissances courantes sur la biologie florale des espèces concernées.

Résultat : `nectar`, `pollen`, `fragrance` et `fragrance_organ` sont renseignés sur les 315 fiches actives. Une clé `nul`, libellée Sans parfum notable, a été ajoutée au domaine `parfum` pour la même raison que sur le nectar, distinguer le renseigné négatif du non renseigné.

Traçabilité. Chaque fiche concernée porte dans sa colonne `source` la mention `estimation horticole non vérifiée` suivie de la liste exacte des champs estimés pour cette fiche. Les valeurs déjà sourcées n'ont pas été touchées, et la mention ne les couvre pas. 314 fiches sur 315 portent au moins un champ estimé, seule la Lavande était entièrement renseignée par les sources apicoles. Le champ `verified_at` n'a pas été modifié, il continue de dater la vérification des champs antérieurs.

Ces valeurs sont explicitement de moindre confiance que le reste du référentiel. Elles sont repérables par requête sur `source`, donc reprenables fiche par fiche quand une source sérieuse devient disponible.

Principes appliqués. Les plantes anémogames (graminées, Noisetier, Ortie, Oseille, Épinard, Rhubarbe, Betterave, Blette, Maïs, Vigne, Olivier, Mûrier, Artemisia) sont notées `nectar = nul`, avec un pollen généralement moyen à fort. Les Papaveraceae (Coquelicot, Pavot d'Orient, Pavot de Californie) sont notées sans nectar et à pollen fort. Le Figuier et la Fougère mâle sont notés nuls sur les trois champs, la pollinisation du figuier se faisant à l'intérieur de la sycone et la fougère n'ayant pas de fleurs.

## Épuisement de la piste PictureThis

Un test de confrontation a été mené sur les cas ouverts. Il est concluant dans le sens négatif.

La fiche `Morus_kagayamae.html` renvoie une erreur 404, l'espèce est absente de leur encyclopédie. La fiche `Lonicera_caerulea.html` ne restitue que le paragraphe d'introduction, sans période de floraison, sans synonyme et sans donnée de culture exploitable, ces éléments étant chargés en JavaScript.

Le cas de l'estragon avait fonctionné parce que la question posée était de savoir quel nom latin correspond à l'estragon, ce à quoi le titre de la page suffit à répondre. Aucun des points ouverts listés ci-dessous n'a cette forme. La piste est close.

## Liste des points à vérifier

Vingt fiches où un doute réel subsiste, groupées par nature de la question et par source qui permettrait de trancher.

Taxonomie contestée entre référentiels. Une monographie ou l'avis d'un taxonomiste trancherait, les référentiels étant déjà confrontés.

| Plante | Nom latin | Nature du doute |
|---|---|---|
| Mûrier platane | Morus kagayamae | GBIF renvoie à Morus indica, POWO à Morus acidosa, les deux cibles diffèrent |
| Azalée japonaise | Rhododendron obtusum | Groupe horticole hybride, absent de Tela Botanica, homonyme tranché à la main |
| Bégonia des jardins | Begonia semperflorens | Accepté par GBIF, synonyme de Begonia cucullata pour POWO, homonyme tranché à la main |
| Glaïeul | Gladiolus x hortulanus | Accepté par GBIF, douteux pour POWO |
| Hibiscus des marais | Hibiscus moscheutos | POWO le reclasse en Muenchhusia moscheutos |
| Abélia | Abelia x grandiflora | Synonyme d'Abelia chinensis pour GBIF, accepté par POWO et retenu par Tela |

Floraison au jardin. Un catalogue de pépiniériste ou l'observation directe trancherait, baseflor décrivant la flore spontanée.

| Plante | Nom latin | Base | Baseflor |
|---|---|---|---|
| Baie de mai | Lonicera caerulea | 3 à 4 | 5 à 7 |
| Goji | Lycium barbarum | 6 à 8 | 3 à 10 |
| Luzule | Luzula nivea | 4 à 5 | 6 à 8 |
| Laurier-tin | Viburnum tinus | 10 à 4 | 2 à 6 |
| Digitale | Digitalis purpurea | 5 à 7 | 5 à 9 |

Intérêt nectarifère divergent. Une source apicole complémentaire trancherait.

| Plante | Nom latin | Base | Source apicole |
|---|---|---|---|
| Buddleia | Buddleja davidii | fort | faible |
| Hysope | Hyssopus officinalis | fort | moyen |
| Bleuet | Centaurea cyanus | fort | moyen |
| Althéa | Hibiscus syriacus | moyen | faible |

Dioécie non renseignée dans la colonne `pollination`, dont le périmètre documenté se limite aux fruitiers. La question est pratique au jardin sur ces quatre espèces.

| Plante | Nom latin | Enjeu |
|---|---|---|
| Asperge | Asparagus officinalis | Les pieds mâles sont plus productifs |
| Houblon doré | Humulus lupulus | Seul le pied femelle produit des cônes |
| If | Taxus baccata | Seul le pied femelle fructifie, et les arilles concernent la toxicité |
| Laurier-sauce | Laurus nobilis | Seul le pied femelle fructifie |

Estimation à confirmer. Le Kiwi (Actinidia deliciosa) est dioïque et demande un partenaire de pollinisation, son pollen a été estimé fort sans source.

## Reprise ultérieure

Les fiches portant au moins une estimation se retrouvent par `source LIKE '%estimation horticole%'`, et le détail des champs concernés est dans la même chaîne. Pour reprendre une fiche, remplacer la valeur, retirer le champ correspondant de la mention et renseigner `verified_at`.
