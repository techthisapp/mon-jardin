# Cohérence des conseils, correctif du journal et manque identifié sur l'arrosage

Travaux du 29 juillet 2026, déclenchés par la confrontation de la fiche Hortensia à la fiche PictureThis correspondante.

## Défaut bloquant corrigé dans le journal

Le déclencheur `tracer` est posé sur cinq tables : `plants`, `plant_phases`, `plant_advice`, `plant_climates` et `vocabulaires`. La fonction `tracer_modification` résolvait la ligne tracée par `coalesce((ap->>'id')::uuid, (av->>'id')::uuid)`, ce qui suppose un identifiant de type uuid sur toutes les tables tracées.

Or `plant_phases.id` est un `bigint`. Toute écriture sur la table du calendrier échouait donc avec une erreur de conversion, y compris les insertions et les suppressions. La table centrale du calendrier, 2 052 lignes, était en pratique impossible à modifier.

La fonction a été corrigée : elle retient l'`id` s'il a la forme d'un uuid, retombe sinon sur `plant_id`, présent et de type uuid sur les trois tables liées, et met la référence à nul en dernier recours. Le journal gagne au passage en lisibilité, une modification de calendrier ou de conseil étant désormais rattachée à sa plante. Les colonnes générées `dom_foliage` et `dom_pollen`, ajoutées ce jour, ont été ajoutées à la liste des colonnes ignorées.

Vérification : les écritures sur `plant_phases` et `plant_advice` sont journalisées, 13 et 25 entrées respectivement.

## Modèles de conseil dupliqués

Le déclencheur de l'enquête est un conseil de protection hivernale de l'Hortensia demandant de « protéger le feuillage persistant » alors que la plante est à feuillage caduc. Le contrôle systématique a montré que ce texte, mot pour mot, couvrait 55 fiches, soit près d'un tiers des 181 conseils de protection.

Mesure de la concentration des textes par phase, sur 1 700 conseils :

| Phase | Lignes | Textes distincts | Unicité | Plus gros modèle |
|---|---|---|---|---|
| multiplication | 320 | 312 | 98 pour cent | 2 |
| récolte | 160 | 140 | 88 pour cent | 9 |
| taille | 150 | 120 | 80 pour cent | 13 |
| semis en pleine terre | 92 | 74 | 80 pour cent | 9 |
| semis à l'abri | 62 | 44 | 71 pour cent | 17 |
| plantation | 262 | 156 | 60 pour cent | 35 |
| protection hivernale | 181 | 81 | 45 pour cent | 55 |
| floraison | 216 | 72 | 33 pour cent | 41 |
| fertilisation | 251 | 84 | 33 pour cent | 28 |
| protection estivale | 15 | 1 | 7 pour cent | 15 |

La multiplication, la récolte et la taille sont rédigées plante par plante. La protection hivernale, la floraison, la fertilisation et la protection estivale reposent largement sur des modèles génériques, la protection estivale étant un texte unique pour ses quinze fiches.

## Corrections appliquées

Neuf annuelles ornementales (Bleuet, Cerfeuil, Coquelicot, Coriandre, Godétia, Nigelle de Damas, Pavot de Californie, Pois de senteur, Souci officinal) recevaient un conseil de paillage de souche alors qu'elles achèvent leur cycle avant les gelées. La phase de protection et son conseil ont été supprimés pour ces plantes, calendrier compris.

Quatorze plantes à feuillage caduc recevaient l'instruction de protéger un feuillage persistant. Le conseil a été réécrit pour chacune selon son type biologique : Digitale, Imperata, Magnolia caduc, Rosier, Rudbeckie dans un premier temps, puis Caryoptéris, Fuchsia rustique, Goji, Hibiscus des marais, Pennisetum, Bignone, Clématite, Kiwi et Vigne de table après complétion du feuillage. Plus une incohérence sur l'Hortensia lui-même.

Contrôle final : aucune fiche à feuillage caduc ne porte plus de conseil mentionnant un feuillage persistant.

## Complétion du feuillage

Le contrôle butait sur 38 fiches dont le feuillage n'était pas renseigné. Le champ `foliage` a été complété sur les 63 plantes ligneuses et graminées qui en manquaient, par estimation horticole marquée dans `source` comme les autres estimations.

Le référentiel compte désormais 124 fiches avec feuillage renseigné. Les 191 restantes sont toutes herbacées ou bulbeuses, où la notion de feuillage caduc ou persistant perd son sens, la plante disparaissant ou se comportant en rosette selon les cas.

## Points restants

Modèle de protection hivernale, 32 fiches conservées en l'état. Onze sont réellement à feuillage persistant et le texte leur convient (Camélia, Céanothe, Laurier-tin, Oranger du Mexique, Photinia, Piéris, Fétuque bleue, Herbe de la pampa, Stipa, Rue officinale, Jasmin étoilé). Cinq sont semi-persistantes, le texte reste défendable. Seize sont herbacées sans feuillage renseigné, cas ambigu.

Soixante annuelles portent encore un conseil de protection hivernale sous d'autres formulations. Contrairement aux neuf traitées, beaucoup passent réellement l'hiver, la mâche, la fève ou la laitue d'hiver étant semées à l'automne. Un examen au cas par cas est nécessaire, la suppression systématique serait fausse.

Modèles génériques restants sur la floraison (41 fiches), la plantation (35), la fertilisation (28) et la protection estivale (15 sur 15). Ces textes ne sont pas nécessairement faux, un conseil de fertilisation pouvant légitimement se ressembler d'une plante à l'autre, mais ils méritent le même contrôle de cohérence que la protection hivernale.

## Manque structurel : l'arrosage

Le référentiel compte dix phases : semis à l'abri, semis en pleine terre, plantation, floraison, récolte, taille, multiplication, fertilisation, protection hivernale et protection estivale. Aucune ne porte l'arrosage, alors que c'est la tâche la plus fréquente au jardin.

L'information existe à l'état d'attribut de plante, `water_need` et `water_note` étant renseignés sur les 315 fiches actives, mais elle n'a pas de place dans le calendrier. Seuls 146 conseils sur 1 700 évoquent l'arrosage au détour d'une phrase, pour 138 plantes sur 315.

Ajouter une phase d'arrosage suppose de définir pour chaque plante la période où l'arrosage est déterminant, ce qui recoupe largement la saison de végétation mais varie selon le climat et selon le stade, un jeune plant demandant un suivi que le sujet établi ne demande plus. C'est une décision de conception, pas seulement un remplissage de données.
