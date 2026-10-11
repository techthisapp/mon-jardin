# Navigation, trois destinations et deux feuilles

La barre du bas porte trois destinations de même rang, les plantes au centre sur
un bouton rond. Ce qui restait des réglages devient deux feuilles, celle du
jardin et celle du compte. **En production depuis le commit 2f810c3.**

## Ce qui a motivé le chantier

Les réglages mêlaient trois objets de nature différente derrière une roue
dentée : le compte, le jardin avec ses espaces, et la liste des plantes. La
liste des plantes n'est pas un réglage, c'est là qu'on décide ce qu'on cultive,
et elle était le second écran le plus utilisé rangé au troisième niveau de
navigation.

## Répartition retenue

La barre du bas porte En ce moment, Mes plantes, Calendrier. Les deux pastilles
restent allongées et gardent leur libellé, le bouton du milieu est rond et
remonte au-dessus de la barre.

Le nom du jardin ouvre une feuille qui porte le jardin actif, le climat, la
commune et les espaces. L'entête se comporte ainsi de façon uniforme : la date
ouvrait déjà la feuille du jour, la météo celle du temps.

Le bouton du coin ne porte plus que le compte, la connexion et le code de
reprise. Il prend une silhouette de personne au lieu d'une roue dentée, et son
libellé devient Compte plutôt que Réglages ou Profil, puisque c'est ce que la
section contient et qu'il n'y a ni nom ni photographie à afficher.

La barre de sous-onglets et son lien de retour disparaissent.

## Le bouton rond

Il porte la marque de l'application, une tige à deux feuilles reprise du fichier
d'icône, à deux tons : le dessin dit les plantes et l'application d'un même
trait. Cinquante-six points de diamètre, remonté de dix-huit, entouré d'une
couronne du ton du papier qui le détache de la barre translucide comme du
contenu qui défile dessous. Sélectionné, il prend un second anneau de la couleur
d'accent.

Le rond dépasse vers le haut et jamais vers le bas : la barre reste à sa place,
seule la marge basse du contenu passe de 96 à 112 points. Un contrôle d'essai
mesure ce dépassement et cette marge, pour que la dernière ligne d'une page ne
puisse pas se cacher sous le bouton.

Réserve faite au moment de la décision : un rond central est ailleurs un
emplacement d'action et non de destination, et le geste attendu au premier appui
sera « ajouter une plante ». L'écart est faible ici, l'écran servant surtout à
cocher ce qu'on cultive.

## Les panneaux ne sont pas réécrits

Les deux panneaux de réglage vivent dans une réserve hors écran,
`#reserve-reglages`, et sont déplacés dans le corps de la feuille à l'ouverture,
puis rangés. Leurs champs, leurs sélecteurs et leurs écouteurs survivent ainsi
intacts, ce qu'une reconstruction en chaîne de caractères aurait perdu.

Le rangement est appelé à trois endroits : à l'ouverture d'une vue, à l'ouverture
d'une fiche de plante, et à la fermeture de la feuille. C'est nécessaire parce
que ces trois moments écrasent le corps de la feuille : un panneau resté dedans
serait détruit et le réglage suivant ouvrirait une feuille vide.

Conséquence heureuse, la chaîne vers la commune fonctionne sans rien de neuf. La
feuille du jardin s'enchaîne sur la feuille du lieu qui existait déjà, avec sa
flèche de retour, par la pile de feuilles du code.

## Sans compte

Le titre affiche « Se connecter » et ouvre la feuille du compte, qui s'ouvre
aussi d'elle-même à la première venue, une seule fois par appareil, marquée dans
le stockage local sous `monjardin.venue`. L'écran du moment était vide et rien
n'indiquait par où commencer, ce que la disparition de l'écran de réglages
aurait aggravé.

Le panneau du compte est masqué tant que personne n'est connecté : il n'aurait
affiché qu'une adresse vide et un code de reprise inutilisable.

## Contrôles automatisés

Trois cent quatre-vingt-treize contrôles sont joués par `npm run essais`, dont
vingt-sept dans la suite `outils/essais/reglages.mjs`. Ils portent sur l'ordre
et la forme des trois destinations, la géométrie du bouton rond, l'ouverture des
deux feuilles, et surtout sur le déplacement des panneaux : le bloc est bien
dans la feuille à l'ouverture, de retour en réserve après la commune, après une
fiche de plante et après la fermeture, et le sélecteur de jardin a conservé sa
valeur au retour. La doublure d'essai sait rendre une session absente, ce qui
permet de contrôler l'état déconnecté.

## Ce qui reste

1. Les invites d'écran vide citaient l'ancien chemin, elles nomment maintenant le
   bouton rond. À relire si la barre change encore.
2. Le libellé du bouton rond n'existe qu'en infobulle et en étiquette de lecture
   d'écran. À surveiller si des personnes ne devinent pas ce qu'il ouvre.
