# Enrichissement du référentiel des plantes par baseflor et structuration des attributs

Travaux du 28 juillet 2026, à la suite de la confrontation nomenclaturale décrite dans `claude/confrontation-gbif-referentiel.md`.

## Évaluation de PictureThis

Les fiches de `picturethisai.com` chargent leur contenu détaillé en JavaScript. Une récupération automatisée ne renvoie que le paragraphe d'introduction et les métadonnées, sans arrosage, sol, toxicité ni rusticité. Il s'agit par ailleurs d'une base commerciale propriétaire. Ce site reste utile en contrôle ponctuel sur une plante donnée, il n'est pas retenu comme source d'alimentation systématique du référentiel.

## Source retenue : baseflor

Baseflor est la base écologique et biologique de Tela Botanica, établie par Philippe Julve. Elle est ouverte, scientifique, française, et se joint directement au référentiel par la colonne `tela_num_nom` renseignée lors de la confrontation nomenclaturale.

Accès : `https://api.tela-botanica.org/service:eflore:0.1/baseflor/informations/bdtfx.nn:IDENTIFIANT`. Les paramètres de masque documentés ailleurs ne fonctionnent pas sur ce service, l'interrogation se fait par identifiant BDTFX dans le chemin.

Couverture mesurée : 168 identifiants BDTFX sur 274 interrogés, soit 173 fiches actives du référentiel. Taux de remplissage sur les fiches trouvées : type biologique et chorologie 100 pour cent, pollinisation 97 pour cent, sexualité 97 pour cent, fruit 94 pour cent, dissémination 92 pour cent, inflorescence 91 pour cent, couleur de fleur 86 pour cent, période de floraison 51 pour cent, valeurs écologiques indicatrices 42 pour cent.

## Colonnes ajoutées

Couche de référence baseflor : `baseflor` (jsonb, charge source non arbitrée : chorologie, inflorescence, sexualité, pollinisation, fruit, dissémination, couleur de fleur, floraison, type ligneux, hauteur végétative, type biologique, caractérisation écologique, valeurs indicatrices de lumière, humidité, réaction du sol, nutriments et salinité) et `baseflor_checked_at`.

Notions structurées, tirées du champ `attributes` et complétées par baseflor : `foliage` et `foliage_note` (feuillage), `flower_colors` (tableau) et `flower_color_note`, `uses` (tableau) et `uses_note`, `pollination_vector` (tableau).

Point de vigilance : `pollination_vector` porte le vecteur de pollinisation au sens botanique (entomogame, anémogame, autogame, hydrogame, apogame). Il ne faut pas le confondre avec la colonne `pollination` préexistante, qui porte la fertilité des fruitiers (autofertile, partenaire requis, dioïque). Les deux notions sont distinctes et cohabitent.

## Vocabulaires créés

Quatre domaines ajoutés à la table `vocabulaires` : `feuillage` (caduc, semi_persistant, persistant, marcescent), `couleur` (15 clés, de blanc à multicolore), `usage` (24 clés, de massif à intérêt hivernal), `pollinisation_vecteur` (5 clés). Les 48 insertions sont journalisées dans `historique`.

Intégrité : la colonne `foliage` porte une clé étrangère vers `vocabulaires` sur le modèle des autres notions à valeur unique. Les colonnes en tableau sont validées par le déclencheur `valider_vocabulaire`, qui refuse toute valeur hors vocabulaire à l'insertion comme à la mise à jour. Deux index GIN couvrent `flower_colors` et `uses` pour le filtrage.

## Migration des attributs

Les valeurs libres de `attributes` ont été mappées vers le vocabulaire contrôlé, le libellé d'origine étant conservé dans la colonne de note correspondante. Cette conservation est volontaire : « Bleu, rose ou blanc selon le sol » pour l'hortensia ou « Purin azoté, soupe, refuge pour papillons » pour l'ortie sont plus informatifs à l'affichage que les clés seules.

Résultat sur les fiches actives : feuillage 61 fiches typées et 43 nuances conservées, couleurs 235 fiches dont 85 apportées par baseflor, usages 91 fiches. Les clés `couleur`, `usage` et `feuillage` ont été retirées de `attributes`, qui ne conserve plus que `rusticite` et `taille`. Contrôle de non-perte vérifié : aucune fiche ne porte de valeur structurée sans son libellé d'origine.

Cas non tranchés à dessein : les libellés ambigus du type « Caduc ou persistant selon l'espèce » ou « Persistant ou caduc » laissent `foliage` nul, seule la note est conservée. Les descriptions sans mention du comportement, du type « Gris argenté » ou « Charnu bleuté », laissent également `foliage` nul plutôt que d'inventer une valeur.

## Journalisation

Le remplissage des colonnes de référence et la migration structurelle des attributs ont été réalisés déclencheurs `tracer` et `plants_touch` suspendus, puis réactivés. Ces opérations déplacent ou complètent de la métadonnée sans modifier le contenu arbitré des fiches. Seules les insertions de vocabulaire, qui sont de vraies évolutions du référentiel, figurent au journal.

## Points ouverts

Écarts de floraison : 36 écarts entre le référentiel et baseflor sur 96 plantes comparables, détaillés dans `claude/ecarts-floraison-baseflor.md`. Aucune modification appliquée, la floraison au jardin diffère légitimement de la floraison spontanée.

Dioécie non renseignée : baseflor donne 7 plantes dioïques dont la colonne `pollination` est vide, Asperge, Épinard, Houblon doré, If, Laurier-sauce, Ortie et Oseille. La question est pratique pour le jardinier sur au moins quatre d'entre elles, le Houblon et l'If ne fructifiant que sur pied femelle, l'Asperge étant plus productive en pied mâle. La colonne `pollination` étant documentée comme réservée aux fruitiers, l'extension de son périmètre reste à arbitrer.

Champs non couverts par les sources mobilisées : le caractère mellifère (`nectar`, vide sur 228 fiches) et le parfum (`fragrance`, vide sur 285 fiches). Baseflor n'apporte pas ces notions directement, la pollinisation entomogame n'en est qu'un indice indirect. Une source dédiée reste à identifier.

## Reprise ultérieure

Interroger baseflor par identifiant BDTFX à partir de `tela_num_nom`. Le vecteur de pollinisation et la couleur de fleur se dérivent des champs `pollinisation` et `couleur_fleur` après suppression des accents et découpage sur la virgule. Pour toute écriture de métadonnée en masse, suspendre `tracer` et `plants_touch`, les réactiver ensuite, et contrôler l'intégrité par empreinte croisée. Le déclencheur `valider_vocabulaire` impose que toute nouvelle valeur de tableau soit préalablement déclarée dans `vocabulaires`.
