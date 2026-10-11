# Notation des photographies

## Deux clés distinctes

Le rang est la place de naissance dans la réserve de l'organe, donnée par la
campagne de sourçage d'après les mesures automatiques. Il est immuable. Le
déplacer aurait demandé une réécriture en chaîne, la contrainte d'unicité
`(plant_id, organe, rang)` interdisant deux images au même rang, et aurait
effacé la trace de ce que les mesures avaient conclu.

Le score porte le jugement des personnes. C'est lui qui commande l'ordre
d'affichage.

## Barème

| Avis | Effet sur le score |
| --- | --- |
| bonne | plus 2 |
| moyenne | moins 3 |
| à supprimer | moins 6 |

Chaque avis pèse le poids de son auteur : 1 pour un compte ordinaire,
`seuil_retrait_photo()` soit 3 pour un compte inscrit dans `mainteneurs`. Les
compteurs `n_bonne`, `n_moyenne` et `n_supprimer` portent déjà ces sommes
pondérées.

Les rapports qui en découlent : trois bonnes annulent une demande de retrait,
deux bonnes rattrapent une moyenne, deux moyennes valent une demande de retrait.
Un dissident isolé ne renverse donc pas un consensus.

## Ordre d'affichage

Score décroissant, puis rang croissant à égalité. Le rang départage ce qu'aucune
personne n'a jugé, c'est à dire l'immense majorité des images, et l'ordre initial
reste celui des mesures.

Une demande de retrait envoie l'image en fin de série sans l'écarter. C'est la
troisième, poids compris, qui l'écarte pour tout le monde.

## Retrait et retour

Le retrait reste prononcé par `recalculer_avis_photo` quand la somme pondérée
des demandes de retrait moins celle des bonnes atteint le seuil de 3. La fonction
recalcule tout à chaque avis plutôt que d'incrémenter : le retrait est donc
réversible, assez de bonnes ramenant l'image dans la série. Une image écartée à
la relecture par le contrôle automatique et une image verrouillée ne sont pas
touchées.

## Colonne générée

```sql
alter table plant_images add column score int
  generated always as (2 * n_bonne - 3 * n_moyenne - 6 * n_supprimer) stored;
```

Une colonne générée ne peut lire que sa propre ligne, ce qui est exactement le
cas. Elle suit les compteurs que le déclencheur tient déjà, sans code
supplémentaire et sans divergence possible.

## Côté vue

La requête du client demande `score` avec les neuf autres colonnes utiles.
`chargerPhotos` trie chaque groupe d'organe par score puis par rang.

Après un avis, la photographie regardée est suivie à sa nouvelle place plutôt
que la position gardée, qui désignerait une autre image. Le déplacement est
annoncé par le bandeau d'état : passée en tête, remontée au rang n, descendue au
rang n, ou retirée de l'organe. Quand l'image quitte la série, le plein écran se
referme et la suivante prend la tuile.

La promesse de chargement est mise en cache plutôt que son résultat : la bande
et le plein écran, tous deux rafraîchis après un avis, ne lancent plus deux
requêtes.

## Doublure d'essai

`outils/essais/doublure.mjs` reproduit la règle du déclencheur : compteurs,
score, retrait et retour. Une ligne de `plant_images` peut porter un objet
`avis_ailleurs` comptant les avis d'autres comptes, seul moyen d'éprouver un
seuil de trois personnes avec un utilisateur figé.

## Ce qui n'a pas été retenu

Un intervalle de confiance, borne de Wilson ou moyenne bayésienne, corrigerait
le biais d'exposition : une image vue vingt fois et jugée bonne quinze fois est
plus sûrement bonne qu'une image jugée bonne une fois. À un seul votant, ces
formules ne rendent presque rien et le geste paraîtrait sans effet. La question
se reposera au delà d'une dizaine de comptes actifs.

Un amortissement dans le temps, qui ferait décroître les avis anciens, n'a pas
d'objet sur un fonds photographique qui ne se périme pas.
