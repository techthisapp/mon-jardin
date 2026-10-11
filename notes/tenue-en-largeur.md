# Tenue en largeur

## Deux fautes de même famille

Une piste de grille déclarée `1fr` vaut `minmax(auto,1fr)` : son minimum est la
largeur de contenu de l'élément posé dedans. Un enfant plus large que l'écran
n'est donc pas rogné, il étire la piste, et tout ce qui partage la piste part
avec lui.

Une classe portée par deux composants sans rapport se règle par l'ordre du
fichier : la déclaration la plus tardive gagne, sur toutes les propriétés
qu'elle redéclare, et le composant écrit en premier se retrouve habillé par le
second.

## Rangées de l'onglet des plantes

Une plante posée dans plusieurs espaces nomme ses lieux sous son nom, séparés
par des virgules. Quatre espaces aux noms courants font une ligne de 484 points
là où l'écran en offre 390. La ligne portait pourtant déjà `overflow:hidden` et
des points de suspension, mais la piste s'élargissait avant que le rognage n'ait
lieu : toutes les rangées du groupe dépassaient le bord droit, chevron compris,
et la page défilait de côté.

Correctif : `.liste` passe à `grid-template-columns:minmax(0,1fr)` sous 620
points, et `.item-bloc` reçoit `min-width:0`. La même borne est posée sur la
mosaïque d'un espace, `repeat(2,minmax(0,1fr))`, et sur le damier de la feuille
du temps.

## Mesures de la feuille du temps

La pastille du moment des tuiles d'un espace portait `tp-m`, nom déjà tenu par
les quatre mesures de la feuille du temps, déclarées huit cents lignes plus
haut. Les mesures prenaient donc le rayon de gélule, le bourrage de deux points
et le `margin-left:auto` de la pastille : quatre boîtes de largeurs inégales,
calées à droite de leur colonne.

La pastille se nomme désormais `tp-moment`. Les deux composants partagent le
préfixe `tp-`, l'un pour la tuile de plante, l'autre pour la feuille du temps :
c'est le point à surveiller lors d'un prochain ajout.

## Contrôles

Suite `outils/essais/largeurs.mjs`, dix-sept contrôles sur un jardin de quatre
espaces aux noms longs dont une plante occupe les quatre.

La rangée reste dans sa piste, la ligne des lieux se rogne au lieu de pousser,
le chevron reste dans la rangée. Aucune vue ne dépasse le bord de l'écran, à 320,
360, 390 et 430 points de large, sur les trois écrans de la barre du bas. Les
quatre mesures gardent leur damier : même largeur, deux colonnes, aucun calage à
droite, rayon de douze points.

Ces contrôles rendent onze échecs sur la feuille de style d'avant le correctif.

Suite complète : 723 contrôles, aucun échec.
