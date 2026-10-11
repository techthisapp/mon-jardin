# Jugement des photographies par les utilisateurs

Conception du 7 août 2026, avant réalisation. Le besoin : permettre à chacun de juger une photographie depuis l'application, de la remplacer par la suivante disponible, et de faire converger le catalogue par le nombre.

## Ce que le mécanisme doit faire

Trois verdicts par photographie et par personne : à supprimer, moyenne, bonne. Le verdict à supprimer retire la photographie de la fiche pour cette personne, immédiatement, et la suivante prend sa place. Au-delà d'un seuil, la photographie est retirée pour tout le monde.

## La contrainte qui commande le reste

Sur les 979 tuiles affichées, 462 n'ont aucune photographie de réserve, 351 en ont une, 166 en ont deux. Pour près d'une tuile sur deux, il n'y a pas de suivante : le verdict à supprimer laisse un trou.

Ce n'est pas un défaut du mécanisme, c'est un fait du catalogue, et il commande deux choses. La bande doit se comporter proprement quand une tuile disparaît, ce qu'elle sait déjà faire puisqu'elle raccourcit sans laisser de case vide. Et les verdicts doivent alimenter une file de recherche : une photographie jugée mauvaise sans remplaçante est une demande de sourçage, que `outils/photos/chercher.py` sait traiter par la clé GBIF de la fiche.

Le mécanisme prend donc tout son sens en boucle : les utilisateurs signalent, la recherche automatique propose, la relecture verse. Sans cette boucle, il ne fait que vider.

## Modèle de données

### Identité d'une photographie

`plant_images` reçoit une clé de substitution, `id uuid primary key default gen_random_uuid()`, la contrainte d'unicité restant sur `(plant_id, organe, rang)`. Aucun code existant ne change, tout lit encore par le triplet.

Deux raisons. Un verdict doit survivre au changement de rang d'une photographie, ce qui arrive à chaque promotion. Et la table `historique` référence ses lignes par `ligne_id uuid` : sans clé de ce type, `plant_images` ne peut pas être journalisée, ce qui est aujourd'hui le cas.

L'identité est bien celle de la ligne et non celle de l'adresse. Une même image sert parfois deux fiches, laitue et laitue d'hiver par exemple : « cette photographie ne va pas ici » est un jugement propre à la fiche.

### Table des verdicts

```sql
create table avis_photo (
  image_id uuid not null references plant_images(id) on delete cascade,
  auteur   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  avis     text not null check (avis in ('supprimer','moyenne','bonne')),
  at       timestamptz not null default now(),
  primary key (image_id, auteur)
);
```

Un verdict par personne et par photographie, la clé primaire y veille. Changer d'avis met la ligne à jour, ne l'ajoute pas.

### Compteurs

`plant_images` reçoit `n_supprimer`, `n_moyenne`, `n_bonne`, entiers à zéro par défaut, tenus par un déclencheur sur `avis_photo`. Ils sont dénormalisés pour que la lecture du catalogue reste ce qu'elle est, une seule requête par fiche, sans agrégat.

### Motif de retrait

`retenue` ne dit pas aujourd'hui qui a écarté une photographie. Une colonne `retrait_motif text` le dira : `relecture` pour les 204 lignes que j'ai écartées à la main, `avis` pour celles que le nombre écartera. Le déclencheur ne touche jamais une ligne portant `relecture`, sans quoi un vote pourrait ressusciter une image écartée pour une raison qu'il ignore.

## Règles de décision

### Ce que fait chaque verdict

**À supprimer.** La photographie disparaît de la fiche pour cette personne, tout de suite, et la suivante prend sa place. C'est le seul verdict qui change ce qui est affiché.

**Bonne.** Rien ne change à l'affichage. Le verdict compte en sens inverse du précédent dans le décompte global, et il vaut caution : une photographie qu'une personne a jugée bonne demande une voix de plus pour être retirée.

**Moyenne.** Rien ne change à l'affichage. Le verdict n'entre pas dans le décompte de retrait, il entre dans la file de recherche : une photographie tiède est une photographie à remplacer quand une meilleure se présentera.

Ce partage est délibéré. Un seul geste modifie la bande, et il est explicite. Faire remonter une photographie bien notée au-dessus d'une autre serait séduisant, mais avec peu de votes une seule opinion changerait l'affichage pour tout le monde. Le classement par les avis pourra venir plus tard, quand les votes se compteront par dizaines.

### Seuil de retrait général

```
retenue passe à faux quand  n_supprimer − n_bonne ≥ 3
```

Le décompte est net et non brut. Trois personnes qui écartent une photographie que personne n'a défendue la retirent ; trois qui l'écartent alors que deux l'ont jugée bonne ne la retirent pas, il en faudra cinq. C'est ce qui distingue un défaut réel d'un désaccord de goût, et cela ne coûte rien à expliquer.

Le seuil est une constante d'une fonction SQL, pas une valeur en dur : il monte quand la base d'utilisateurs monte.

Le retrait est réversible. Si le solde repasse sous le seuil, parce qu'une personne a changé d'avis ou qu'une autre a jugé l'image bonne, la photographie revient. Rien n'est jamais effacé, ni la ligne d'image, ni les verdicts.

### Poids du mainteneur

Une table `mainteneurs(auteur uuid primary key)` d'une ligne aujourd'hui. Le verdict d'un mainteneur pèse 3, ce qui lui permet de retirer seul une photographie fautive sans attendre trois utilisateurs. C'est le seul privilège, et il s'exerce par le même geste que tout le monde, depuis l'application.

### Verrou

Un booléen `verrou` sur `plant_images` exempte une photographie du retrait automatique. Il sert aux cas tranchés à la main dont on ne veut pas qu'un vote les défasse. Aucune ligne n'en porte au départ.

## Ce que voit l'utilisateur

### Où se juge une photographie

Au plein écran. C'est là qu'on la regarde en grand, qu'on lit l'organe, l'auteur et la licence : c'est là qu'on la juge. Trois boutons sous l'image, le choix courant marqué.

La bande, elle, ne porte aucun bouton. Y ajouter une pastille de vote sur chaque tuile encombrerait l'écran le plus regardé de la fiche pour un geste rare.

### Retour immédiat

Sur « à supprimer », le plein écran se ferme, la bande se refait sans la photographie, et une ligne brève propose d'annuler. Sans cette annulation, une erreur de doigt serait définitive du point de vue de la personne, ce qui n'est pas acceptable.

Sur « bonne » ou « moyenne », le bouton se marque et rien d'autre ne bouge.

### Revenir sur ses retraits

Une ligne dans la feuille du compte, « Photographies écartées », ouvrant la liste de ce que la personne a retiré, avec le nom de la plante, l'organe, la vignette et un bouton pour remettre. C'est la contrepartie nécessaire d'un geste qui masque du contenu.

### Découverte

La première ouverture d'une fiche portant des photographies affiche une fois, sous la bande, une phrase d'invite : « Appuyez sur une photographie pour la voir en grand et la juger. » Marquée dans le stockage local, comme la première venue l'est déjà.

## Sécurité

Le client n'écrit jamais dans `plant_images`. Il écrit dans `avis_photo`, et seulement ses propres lignes : la politique de sécurité au niveau des lignes filtre sur `auteur = auth.uid()` en lecture comme en écriture. Les compteurs, le seuil et `retenue` sont écrits par un déclencheur `security definer`, donc par la base et jamais par l'application.

C'est le point qui compte. L'écriture anonyme sur `plant_images` a été ouverte une fois par le passé et ne le sera plus : ce mécanisme n'en a pas besoin.

Le déclencheur pose son motif au journal, `avis utilisateurs : trois retraits contre zéro caution`, de sorte que l'`historique` porte la raison de chaque bascule.

Une personne ne peut pas voter plusieurs fois pour la même photographie, la clé primaire l'interdit. Elle peut créer plusieurs comptes ; le décompte net et le seuil qui monte avec la base sont la réponse proportionnée, une vérification d'identité ne l'étant pas pour un calendrier de jardinage.

## Hors réseau

L'application tourne sans réseau et un jardin n'a pas toujours de signal. Un verdict émis hors réseau est appliqué localement tout de suite et rangé dans une file du stockage local, vidée au prochain démarrage réseau. La photographie reste masquée entre les deux : la personne voit ce qu'elle a décidé, la base l'apprend plus tard.

## Ce que les avis apprennent aux contrôles automatiques

Les seuils de `outils/photos/controles.py` sont calés sur mon oeil, sur 933 images. Les verdicts les calent sur des jardiniers, en production, sans campagne.

Une vue `desaccords_controle_avis` listera les photographies que le contrôle écarte et que les gens jugent bonnes, et l'inverse. C'est le jeu de mesure qui manquait pour réviser un seuil autrement qu'à l'estime. Le contrôle qui se trompe le plus souvent contre les utilisateurs est celui qu'il faut relâcher.

## Ce que cela demande

Une migration : une clé de substitution, trois compteurs, deux colonnes, une table, une politique, un déclencheur, deux vues. Environ cent vingt lignes de SQL.

Dans l'application : le chargement des verdicts de la personne au démarrage, le masque à l'affichage de la bande, les trois boutons du plein écran, la file hors réseau, la liste des retraits dans la feuille du compte. Environ cent cinquante lignes.

Une quinzaine de contrôles d'essai : le masque personnel, le retour de la suivante, l'annulation, le seuil, l'exemption des lignes écartées à la relecture, le comportement sans réserve, la file hors réseau.

## Arbitrages retenus

Les cinq points ont été tranchés dans le sens proposé, et le mécanisme est en ligne.

**Le seuil est net.** Trois retraits contre zéro caution retirent une photographie, trois contre deux ne la retirent pas. C'est ce qui sépare un défaut réel d'un désaccord de goût, et le brut ne coûtait pas moins cher à écrire.

**Bonne et moyenne ne déplacent pas la bande.** Un seul geste change l'affichage, et il est explicite. Faire remonter une photographie bien notée aurait laissé une ou deux opinions décider pour tout le monde tant que les votes se comptent sur une main.

**Le mainteneur pèse le seuil.** Sans cela le mécanisme resterait dormant : avec un seul compte, aucun décompte n'atteint jamais trois. Le privilège s'exerce par le même geste que tout le monde, depuis l'application, et il est inscrit dans une table d'une ligne.

**La tuile sans réserve disparaît**, comme le fait déjà une fiche sans photographie. Une case grise annonçant une recherche ajouterait un élément d'interface pour un cas que le sourçage de réserve rend rare, et la personne trouve l'information là où elle peut agir, dans la liste de ses retraits.

**Le jugement se pose au plein écran seulement.** L'appui long sur une image ouvre le menu du système sur iOS : le geste aurait été pris deux fois sur trois.

## Ce qui est en ligne

Base : une clé de substitution sur `plant_images`, trois compteurs, `retrait_motif`, `verrou`, la table `avis_photo` et sa politique de sécurité, la table `mainteneurs`, la fonction de seuil, le recalcul et son déclencheur, la vue `photos_a_ameliorer`.

Application : le chargement des avis au démarrage, le masque à l'affichage de la bande, les trois boutons du plein écran, l'annulation depuis le bandeau d'état, la file hors réseau, et la liste des photographies écartées dans la feuille du compte.

Treize contrôles d'essai, sur les trois verdicts, le marquage, l'écriture en base, le passage à la suivante, l'annulation, et la liste des retraits avec sa remise.

## Le sourçage de réserve

La contrainte de départ a été levée en partie le même jour. Les 454 tuiles sans réserve dont la fiche porte une clé GBIF ont donné lieu à une campagne : 211 taxons interrogés sur les deux jeux Pl@ntNet publiés par GBIF, 24 658 candidats recueillis, 5 147 images tirées, mesurées et soumises aux contrôles.

259 lignes de rang 2 ont été versées. La réserve passe de 517 tuiles pourvues à 776 sur 979 : trois tuiles sur quatre ont désormais une suivante.

Ces lignes n'ont pas été relues à l'oeil, à la différence des tuiles affichées. C'est délibéré et c'est le régime de barrière décrit plus haut : une ligne de réserve ne paraît que si la première est écartée, et à ce moment-là ce sont les avis qui la jugent. Trois garde-fous exacts remplacent la relecture : le rang reste dans les bornes de la contrainte, une adresse déjà portée par la fiche n'est pas réintroduite, et le genre de l'observation doit être celui de la fiche.

258 lignes de rang 3 sont sélectionnées et non versées, gardées dans le projet sous `claude/reserve-photos-rang3.json`. Elles se chargeront le jour où le rang 2 aura commencé à s'user, ce que la vue `photos_a_ameliorer` dira.

Restent 203 tuiles sans réserve, sur des taxons que Pl@ntNet n'observe pas ou peu : variétés potagères dont l'espèce parente ne montre que la forme sauvage, cultivars d'ornement. Wikimedia Commons est la source à interroger pour celles-là.

## Ce qui reste ouvert

La vue des désaccords entre le contrôle automatique et les avis demande que le verdict du contrôle soit stocké en base, ce qu'`auditer.py` ne fait pas encore : il écrit un relevé sur disque. Une colonne `controle_motifs` sur `plant_images`, écrite par l'outil, rendrait la comparaison possible en SQL et donnerait le jeu de mesure qui manque pour réviser un seuil autrement qu'à l'estime.
