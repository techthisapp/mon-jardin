# Unification des fiches du référentiel

État mesuré le 28 juillet 2026 sur les 315 fiches actives.

## Inventaire des attributs

### Colonnes de la table `plants`

| Champ | Nature | Renseigné | Valeurs distinctes |
|---|---|---|---|
| `slug`, `name` | Identifiant et libellé | 315 | 315 |
| `latin`, `family`, `genus` | Nomenclature | 315 | 84 familles |
| `typology` | Vocabulaire fermé | 315 | 4 |
| `category` | Vocabulaire fermé | 315 | 18 |
| `exposure` | Vocabulaire contrôlé | 315 | 5 |
| `exposure_note` | Texte libre complémentaire | 47 | 12 |
| `hardiness` | Vocabulaire fermé | 315 | 5 |
| `spacing_cm` | Entier, centimètres | 313 | |
| `row_cm` | Entier, centimètres | 311 | |
| `height_min_cm`, `height_max_cm` | Entier, centimètres | 227 | |
| `spacing` | Texte, redondant avec `spacing_cm` | 315 | 76 |
| `depth` | Texte, deux notions confondues | 315 | 138 mesures, 177 modes de plantation |
| `companions` | Texte libre | 312 | |
| `advice` | Texte libre | 315 | |
| `source`, `verified_at` | Traçabilité | 315 | |

### Attributs de la colonne `attributes`

| Attribut | Renseigné | Formulations | Ornement | Légumes | Aromatiques | Fruits |
|---|---|---|---|---|---|---|
| `rusticite` | 315 | 61 | 161 | 77 | 42 | 35 |
| `type` | 315 | 44 | 161 | 77 | 42 | 35 |
| `multiplication` | 315 | 40 | 161 | 77 | 42 | 35 |
| `taille` | 315 | 181 | 161 | 77 | 42 | 35 |
| `exposition` | 315 | 24 | 161 | 77 | 42 | 35 |
| `famille` | 315 | 84 | 161 | 77 | 42 | 35 |
| `fertilisation` | 315 | 95 | 161 | 77 | 42 | 35 |
| `arrosage` | 315 | 98 | 161 | 77 | 42 | 35 |
| `hauteur` | 228 | 61 | 161 | 12 | 28 | 27 |
| `couleur` | 150 | 101 | 140 | 4 | 5 | 1 |
| `toxicite` | 110 | 69 | 80 | 13 | 8 | 9 |
| `usage` | 91 | 80 | 68 | 3 | 12 | 8 |
| `mellifere` | 87 | 25 | 75 | 1 | 8 | 3 |
| `feuillage` | 73 | 41 | 60 | 2 | 4 | 7 |
| `parfum` | 41 | 19 | 36 | 0 | 5 | 0 |

### Informations structurables absentes

| Information | Où elle se trouve aujourd'hui | Ce qu'elle permettrait |
|---|---|---|
| Température de gel | Nulle part, une fiche sur 315 | Vérifier les 1580 niveaux d'adaptation climatique |
| Pollinisation | Prose du conseil de plantation | Signaler qu'un second sujet est nécessaire |
| Délai avant première récolte | Prose, de façon inégale | Situer l'engagement d'une plantation pérenne |
| Nature du sol | Absente, la case Sol affiche la fertilisation | Filtrer les plantes de terre acide |
| Mode de plantation | Confondu avec la profondeur | Distinguer semis, plant, bouture, greffe |
| Organe consommé | Implicite dans le nom et les conseils | Lever les ambiguïtés de comestibilité |

## Analyse d'homogénéité

L'homogénéité se mesure sur deux axes indépendants. La **couverture** est le nombre de fiches qui portent l'attribut. La **discipline** est le nombre de formulations différentes employées pour une même notion. Un attribut renseigné partout mais rédigé de 181 façons n'est pas structuré, il est seulement présent.

| | Discipline forte | Discipline faible |
|---|---|---|
| **Couverture forte** | `exposure`, `hardiness`, `typology`, `category`, `spacing_cm` | `taille` 181, `arrosage` 98, `fertilisation` 95, `famille` 84, `rusticite` 61, `type` 44, `multiplication` 40 |
| **Couverture faible** | `mellifere` 25, `parfum` 19 | `couleur` 101, `usage` 80, `toxicite` 69, `feuillage` 41 |

### Cause commune

Chaque attribut mal discipliné empile plusieurs axes orthogonaux dans une seule chaîne de caractères.

`type` porte quatre axes : le cycle de vie, annuelle, bisannuelle ou vivace ; le port, arbre, arbuste, sous-arbrisseau, liane, graminée, tubéreuse ; la conduite, cultivée en annuelle ; la rusticité, gélive. D'où « Vivace tubéreuse gélive » et « Vivace gélive, cultivée en annuelle » comme deux valeurs distinctes.

`rusticite` porte six axes : la résistance au froid, la condition d'établissement avec « rustique une fois établi », la condition de conduite avec « rustique sous voile », la variabilité variétale avec « rustique pour les variétés d'hiver », une sensibilité qui n'est pas le froid avec « craint l'humidité », et la non-pertinence avec « cycle court, peu concerné ». Ce dernier cas classe en `rustique` des plantes pour lesquelles la question ne se pose pas, ce qui interdit tout calcul fondé sur ce champ.

`mellifere` porte quatre axes : l'intensité, la période de ressource, le pollinisateur visé, la variabilité variétale.

`parfum` porte quatre axes : l'intensité, l'organe parfumé, la note aromatique, la variabilité variétale.

`depth` porte deux notions : une profondeur de semis pour 138 fiches, un mode de plantation pour 177.

### Biais de typologie

La couverture suit l'ordre dans lequel le référentiel a été construit. L'ornement a été documenté en premier et en profondeur, le potager plus tard.

| Typologie | Fiches | Hauteur | Couleur | Toxicité | Mellifère |
|---|---|---|---|---|---|
| Ornement | 161 | 161 | 140 | 80 | 75 |
| Légumes | 77 | 12 | 4 | 13 | 1 |
| Aromatiques | 42 | 28 | 5 | 8 | 8 |
| Fruits | 35 | 27 | 1 | 9 | 3 |

La hauteur manque pour 65 des 77 légumes, alors qu'elle décide de l'ombre portée et du tuteurage.

### Défauts d'affichage

Trois écarts entre ce que la base contient et ce que la feuille de détail montre.

La case **Sol** rend l'attribut `fertilisation`. Aucun champ ne décrit la nature du sol.

La case **Profondeur** rend `depth`, qui vaut « greffe hors sol » ou « plants à racines nues » pour 177 fiches.

Trois attributs renseignés n'atteignent jamais l'écran : `mellifere` sur 87 fiches, `usage` sur 91, `feuillage` sur 73.

## Modèle cible

### Colonnes ajoutées à `plants`

| Champ | Type | Règle |
|---|---|---|
| `life_cycle` | Clé de référence | annuelle, bisannuelle, vivace |
| `habit` | Clé de référence | arbre, arbuste, sous_arbrisseau, liane, graminee, herbacee, bulbe |
| `conduite` | Clé de référence, nulle si sans objet | annuelle, bisannuelle |
| `frost_min_c` | Entier signé, nul si sans objet | Température en dessous de laquelle les dégâts commencent |
| `depth_cm` | Entier, nul si sans objet | Profondeur de semis |
| `planting_mode` | Clé de référence | semis, plant, bulbe, tubercule, rhizome, bouture, greffe, marcotte |
| `soil` | Clé de référence | ordinaire, acide, calcaire, drainant, frais, riche |
| `pollination` | Clé de référence, nulle si sans objet | autofertile, partenaire_requis, dioique |
| `first_harvest_year` | Entier, nul si sans objet | Années avant la première récolte |
| `nectar` | Clé de référence, nulle si non mellifère | faible, moyen, fort |
| `nectar_season` | Clé de référence, nulle | precoce, saison, tardive, hivernale |
| `fragrance` | Clé de référence, nulle si non parfumé | leger, marque, fort |
| `fragrance_organ` | Clé de référence, nulle | fleur, feuillage |
| `toxicity` | Clé de référence | aucune, parties_toxiques, toxique, mortel |

### Règle générale

Toute notion se sépare en une clé de vocabulaire contrôlé et une note libre facultative, sur le modèle de `exposure` et `exposure_note` déjà en place. La clé sert au filtrage et aux contrôles, la note porte la nuance.

Le `null` signifie que la question ne se pose pas. Il n'est jamais remplacé par une valeur par défaut, ce qui évite de classer une annuelle comme rustique.

## Plan d'action

### Lot 1. Corrections d'affichage

Renommer la case Sol en Fertilisation. Ajouter Mellifère, Usage et Feuillage à la grille. Aucune écriture en base, seulement `app.js`.

Volume : 251 fiches gagnent au moins une ligne visible. Dépendance : aucune.

### Lot 2. Séparation de la profondeur et du mode de plantation

Créer `depth_cm` et `planting_mode`, alimenter depuis `depth`, conserver `depth` en note.

Volume : 315 fiches, dont 177 à requalifier. Dépendance : aucune. Contrôle ajouté : profondeur de semis absente sur une fiche dont une tâche de semis existe.

### Lot 3. Décomposition de `type`

Créer `life_cycle`, `habit` et `conduite`, alimenter depuis les 44 formulations existantes, retirer `type`.

Volume : 315 fiches, mécanisable par table de correspondance. Dépendance : aucune. Contrôle ajouté : cycle de vie absent.

### Lot 4. Température de gel

Créer `frost_min_c`. Remplir par lots, en commençant par les 59 gélives et les 18 peu rustiques, où le chiffre change une décision.

Volume : 315 fiches, dont environ la moitié relève de valeurs de référence groupables par famille. Dépendance : lot 3, le `null` des annuelles se déduit de `life_cycle`. Contrôle ajouté : contradiction entre la température de la plante et le minimum du climat où elle est déclarée adaptée.

### Lot 5. Nettoyage de `rusticite`

Ce qui relève du froid part dans `frost_min_c`. Ce qui relève de la conduite, de la variabilité variétale ou d'une sensibilité à l'humidité devient une note. Ce qui relève de la non-pertinence devient un `null`.

Volume : 61 formulations à trier, 315 fiches à réaffecter. Dépendance : lot 4.

### Lot 6. Hauteur des comestibles

Renseigner `height_min_cm` et `height_max_cm` pour les 88 fiches sans hauteur, dont 65 légumes.

Volume : 88 fiches. Dépendance : aucune. Contrôle ajouté : hauteur absente, déjà en place et aujourd'hui agrégé.

### Lot 7. Vocabulaires d'agrément

Créer `nectar`, `nectar_season`, `fragrance`, `fragrance_organ`. Alimenter depuis `mellifere` et `parfum`, puis compléter les fiches muettes.

Volume : 128 fiches déjà renseignées à convertir, le reste à qualifier. Dépendance : lot 1, sans quoi l'information reste invisible.

### Lot 8. Toxicité

Créer `toxicity` en quatre niveaux, la mention détaillée restant en note. Le `null` actuel se lit aujourd'hui comme une absence de toxicité sans que rien ne l'atteste.

Volume : 110 fiches renseignées à convertir, 205 à statuer. Dépendance : aucune. Contrôle ajouté : statut de toxicité absent.

### Lot 9. Champs absents

Créer `soil`, `pollination` et `first_harvest_year`. La pollinisation ne concerne que les 35 fruits et quelques petits fruits dioïques. Le délai de première récolte ne concerne que les pérennes.

Volume : `soil` sur 315 fiches, `pollination` sur environ 50, `first_harvest_year` sur environ 120. Dépendance : lot 3 pour identifier les pérennes. Contrôle ajouté : pollinisation absente sur un fruitier.

## Ordre retenu

Les lots 1, 2, 3 et 6 sont indépendants et peuvent avancer en parallèle. Le lot 4 attend le lot 3, le lot 5 attend le lot 4, le lot 7 attend le lot 1, le lot 9 attend le lot 3.

Le chemin le plus court vers une valeur visible passe par les lots 1 et 6. Le chemin le plus court vers un référentiel vérifiable passe par les lots 3 et 4, qui rendent contrôlables les 1580 lignes d'adaptation climatique aujourd'hui tenues à la main.
