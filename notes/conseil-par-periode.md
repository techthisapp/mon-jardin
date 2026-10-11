# Conseil propre à chaque période

Chantier terminé le 1er août 2026. Migrations Supabase `conseil_par_periode_plantation`, `conseil_par_periode_autres_taches`, `conseil_par_periode_deux_correctifs`. Document de reprise mis à jour, commit `3e38b52`.

## Le périmètre réel

Le document annonçait 122 tâches à conseil unique. Le chiffre confondait deux choses. Une tâche dont la période est déclinée par climat apparaît plusieurs fois dans `plant_phases`, mais un jardinier donné n'en voit qu'une : le Pétunia porte quatre lignes de protection, une par climat, avec le même texte, et il n'y a rien à spécifier.

Le périmètre est donc celui d'un jardinier d'un climat donné : 125 tâches, 250 périodes, identiques pour les cinq climats. Seize conseils propres à une période existaient déjà, quatorze tailles et deux fertilisations de la Tomate.

Répartition : plantation 65 fiches, fertilisation 27, multiplication 10, semis en pleine terre 10, taille 7, floraison 3, récolte 3.

## Méthode

Rédaction dérivée, conformément à la décision 2 sur la vérifiabilité, et non 234 textes écrits à la main. Tout tient dans deux migrations SQL rejouables.

Chaque conseil de période est fait d'une phrase dérivée, suivie du conseil général dont la mention d'alternative est résolue en faveur de la période. La phrase dérivée se construit à partir de la position de la fenêtre dans l'année, du port, du seuil de gel et de la sensibilité à l'humidité hivernale.

La fonction `saison_de_fenetre(d, f)` donne la saison d'une fenêtre par son milieu, et rend nul pour une fenêtre à cheval sur le changement d'année.

La résolution de l'alternative porte sur un ensemble fermé et inventorié de tournures : « au printemps ou en automne » sur 23 fiches, « en automne de préférence » sur 9, et quatre cas isolés traités nommément.

## Règles retenues, par tâche

Plantation. Pour un ligneux : l'automne est la période de référence, le sol encore chaud installe les racines avant l'hiver ; la fin d'hiver est la dernière fenêtre pour un sujet à racines nues, mention réservée aux fiches dont le conseil général la mentionne ; le printemps ne convient qu'à un sujet vendu en conteneur. Pour une vivace : l'arrière-saison enracine la touffe avant l'hiver, le printemps demande un arrosage suivi la première année. Pour un bulbe : l'automne avance et allonge la floraison. Les fiches sensibles à l'humidité hivernale portent la réserve correspondante, les fiches gélives la consigne de paillage.

Fertilisation. Apport de fond avant ou à la plantation pour la fenêtre de printemps, apport d'entretien fractionné pour la fenêtre d'été, en pleine production.

Multiplication. Division de printemps à reprise immédiate, division d'automne qui s'enracine avant l'hiver et repart tôt.

Semis en pleine terre. Printemps après ressuyage, fin d'été pour l'arrière-saison, automne pour les annuelles rustiques qui passent l'hiver au stade jeune et fleurissent plus tôt.

Floraison et récolte. Première et seconde vague, la seconde sur les pousses de l'année.

## Exceptions relevées à la relecture

La seconde floraison d'un fruitier ne demande pas de suppression des fleurs fanées : elle porte la récolte d'arrière-saison. Détecté par la présence d'une phase de récolte sur la fiche.

Le conseil général de la Fraise décrit l'apport de compost de juillet, après la récolte. Il ne convient pas à sa fenêtre de fin d'hiver, qui reçoit un texte propre.

## Contrôles

255 conseils de période en base. Aucune période sans texte parmi celles qu'un jardinier peut voir.

Contrôles de forme sur l'ensemble : aucun tiret cadratin ni demi-cadratin, aucune flèche, aucune mention d'alternative restante, aucune élision manquée du type « de automne », longueur de 109 à 446 caractères, toutes les phrases commençant par une majuscule.

Quatre périodes restent sans texte propre, sur les fiches inactives Mélisse et Souci, remplacées au catalogue par Mélisse citronnelle et Souci officinal.

## Ce qui reste discutable

Les textes sont marqués `source = 'derive_periode'` et `verification = 'aucune'`. La dérivation garantit la cohérence avec les colonnes structurées, pas l'exactitude horticole de chaque énoncé sur chaque espèce. Une relecture par échantillon reste utile, en priorité sur les cas où la règle générale peut mal tomber : bulbes, plantes sensibles à l'humidité hivernale, semis d'automne d'annuelles.
