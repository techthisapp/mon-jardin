# Écarts entre la base et l'affichage

Audit du 1er août 2026, mené après la correction du conseil de taille de la glycine, pour chercher les cas de la même famille : une donnée présente en base que l'écran ne montre pas, ou qu'il montre faussement. Les quatre défauts confirmés ont été corrigés le 2 août.

## Méthode

Cinq familles de défaut ont été recherchées par requête sur la base, puis les cas retenus ont été confirmés par rendu réel de la fiche : lignes de production extraites de `plants_full`, servies à l'application par la doublure de test, et lecture du texte effectivement affiché.

Les familles recherchées sont l'agrégation qui perd des lignes, la donnée rattachée à une clé que l'écran ne parcourt jamais, la valeur d'énumération absente des tables de correspondance de l'application, la colonne renseignée mais jamais lue, et la période multiple servie par un texte unique.

## Défauts confirmés et corrigés

### Conseil général de la plante, jamais affiché

La colonne `plants.advice` est renseignée sur les 315 plantes actives, quatre-vingt-un caractères en moyenne. Elle était chargée par l'application sous le nom `conseil` et utilisée nulle part. Contrôle sur six fiches de production, aucune phrase du conseil général ne se retrouvait à l'écran.

Exemples perdus : « Exige un sol acide et frais, comme la myrtille. Bonne plante couvre-sol à mi-ombre » pour l'airelle rouge, « Fleurit très tard en automne, ressource majeure pour les abeilles avant l'hiver » pour le lierre, « Cultivé pour son feuillage. Surveiller les limaces au démarrage des pousses » pour le hosta.

Correction : le conseil paraît en tête de fiche, sous les jauges et sous l'avertissement de toxicité, dans l'en-tête commun aux deux onglets puisqu'il vaut toute l'année. Les termes du glossaire y sont repérés.

### Conseil de multiplication sans période correspondante

Cent douze plantes actives portent un conseil rattaché à la tâche `multiplication` sans avoir de période de multiplication dans `plant_phases`. L'écran du moment et la fiche ne parcourent que les tâches ayant une période : le texte n'était jamais atteint.

Il s'agit pour l'essentiel d'annuelles et de légumes, et le contenu porte sur la production de semences : « Bisannuelle et allogame anémophile, elle se croise avec la blette » pour la betterave, « Se croise avec tous les choux européens, une seule variété porte-graine par jardin » pour le chou rouge, « Se ressème spontanément, les descendants perdent les couleurs des variétés améliorées » pour le cosmos.

Répartition par catégorie : fleurs annuelles 23, racines 12, fruits d'été 12, aromatiques 12, feuilles 12, choux 9, légumes 7, fleurs bisannuelles 7, légumineuses 7, bulbes 5, le reste par unités.

Correction : le conseil paraît dans le bloc Culture de la fiche, sous la valeur de la ligne Multiplication, pour toutes les plantes et non seulement pour les cent douze. La règle est plus simple et le texte reste consultable hors de sa fenêtre.

### Couleur de floraison, la dominante n'était pas celle qui s'affichait

Cent vingt-trois plantes portent plusieurs couleurs dans `flower_colors`. La légende de la fiche n'en montrait qu'une, la première du tableau. Or ce tableau était rangé dans l'ordre de la palette, pas par dominance. La dominance est portée par `flower_color_note`, qui n'était jamais affichée.

Sur les cent plantes où la comparaison est possible, soixante-cinq voyaient s'afficher une couleur qui n'était pas la dominante annoncée par la base. La glycine en est l'exemple net : le tableau valait blanc puis mauve, la note dit « Mauve, blanc », l'écran affichait « Fleurs blanches ». Autres cas : anémone du Japon, note « Rose, blanc », écran blanc ; aster d'automne, note « Mauve, rose, bleu », écran rose ; achillée, note « Jaune, rose, blanc, rouge », écran blanc.

Correction en deux temps. En base, la migration `couleurs_de_fleur_par_dominance` réordonne `flower_colors` sur l'ordre d'apparition des couleurs dans la note, les couleurs que la note ne nomme pas passant en queue dans leur ordre d'origine : soixante-quinze lignes touchées, dont soixante-dix changent de couleur de tête. Dans l'application, la légende nomme les deux premières couleurs et affiche deux pastilles. La bande de floraison du ruban et de la roue, qui prend aussi la première couleur, devient juste par la même occasion.

Le motif de reconnaissance est accent-tolérant : « pourpré », « violacé », « orangé » sont rattachés à leur couleur, et la recherche est ancrée en début de mot pour qu'aucune couleur ne soit reconnue à l'intérieur d'un autre mot.

### Deux périodes réelles servies par un texte unique

Deux entrées restaient dans le cas de la glycine : la mélisse, dont la multiplication a une fenêtre de printemps et une d'automne, et le souci, dont le semis en pleine terre a une fenêtre de printemps et une de fin d'été. Les deux sont archivées, remplacées au catalogue par la mélisse citronnelle et le souci officinal, donc invisibles pour l'utilisateur. Le catalogue actif était déjà correct sur ce point.

Correction : quatre conseils propres écrits par la migration `conseil_par_periode_melisse_et_souci`. Le contrôle des périodes réelles sans conseil propre retourne désormais zéro, sur le catalogue actif comme sur les archives.

## Contrôles passés sans défaut

Aucun conseil général en double sur une même tâche, l'agrégation de la vue n'en perd plus aucun. Aucun conseil de période orphelin ou rattaché à une autre plante. Aucune clé de vocabulaire introuvable dans `vocabulaires`. Aucune valeur d'énumération inconnue de l'application, ni pour les tâches, ni pour les typologies, ni pour les catégories, ni pour les niveaux d'adaptation climatique, ni pour les couleurs de fleur. Aucune perte entre `spacing` et `spacing_cm`, ni entre `depth` et `depth_cm`.

## Fausse alerte à connaître

Les trois cent cinquante-deux périodes de `protection` sans conseil propre ne sont pas un défaut : ce sont des déclinaisons climatiques d'une même fenêtre, une ligne par climat dans `plant_phases.climates`, et le texte unique leur convient à toutes. Tout comptage de périodes doit neutraliser cette déclinaison, faute de quoi il compte cinq fois la même fenêtre. C'est le même piège que celui qui avait gonflé le décompte des « 122 phases à conseil ».

## Colonnes renseignées et non lues

Restent renseignées sans arriver à l'écran, sans jugement de valeur sur leur utilité : `soil_note` et `water_note` sur 315 plantes, `rusticite` sur 315, `wintering` sur 209, `flower_color_note` sur 169 (désormais utilisée indirectement, puisqu'elle a servi à ordonner les couleurs), `fragrance_organ` sur 127, `nectar_season` sur 86, `exposure_note` sur 47, `conduite` sur 39.

## Contrôle automatisé

Le fichier d'essai `ecarts.js` sert des lignes de production à la doublure et compare l'affiché à l'attendu, en quatorze contrôles : le conseil général de cinq plantes, le conseil de multiplication de trois plantes dont deux sans période, la légende de couleur de quatre plantes avec le nombre de pastilles, et le conseil propre à la période en cours sur la glycine.
