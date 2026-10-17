# Le jardin vivant

Note du 17 octobre 2026. Nouveau fond de l'application, mis au point sur le
canevas de maquettes, puis intégré avec le choix du fond dans les réglages.

## Demande et étapes

Jérôme a demandé un fond aussi riche que celui de l'application ma-meteo, en
affichage comme en adaptation, mais propre au jardin. La maquette a connu
quatre états :

1. une première version, jugée dans la bonne direction mais trop enfantine ;
2. une veine japonaise, à la manière des estampes : lavis, monts dans la
   brume, nuages en bandes, branche à l'encre ;
3. des couleurs plus franches au printemps et en été ;
4. un décor plus fourni et la lune qui éclaire la nuit.

Jérôme a validé ce dernier état et demandé que l'on puisse changer de fond
dans les réglages.

## Ce qui est repris de ma-meteo

- Le ciel suit en continu la hauteur du soleil, sans tranches d'heures, entre
  quatre couples de couleurs : nuit, aube, jour, soir.
- Les nuages dérivent avec le vent ; un voile couvert, la pluie inclinée par
  le vent, la neige, le brouillard en bandes et les éclairs suivent le temps
  de l'heure.
- La toile est peinte à trente images par seconde au plus, à une finesse de
  deux points par pixel au plus, et se suspend quand l'onglet est caché.
- Quand le système demande moins de mouvement, une seule image est peinte.

## Ce qui est propre au jardin

| Élément | Ce qui le change |
|---|---|
| Ciel, soleil, lune, étoiles | hauteur du soleil calculée au point du jardin, à l'heure de l'appareil ; sans commune, le centre de la France |
| Nuages, pluie, neige, brouillard, éclairs | code du temps de l'heure en cours ; la quantité de pluie de l'heure serre les traits |
| Balancement de la végétation, dérive des nuages, pente de la pluie | vent de l'heure, borné à 60 km/h |
| Sol givré | minimum du jour à zéro ou au-dessous |
| Arbre du verger, branche, massifs, potager, bassin, ce qui tombe | saison de la quinzaine, comme le feuillage |

Le décor comprend :
- des monts étagés dans la brume, enneigés l'hiver ;
- un pin taillé en plateaux ;
- un arbre du verger, en fleur au printemps, en feuilles et en fruits l'été,
  roux à l'automne, nu l'hiver ;
- trois massifs taillés, couverts d'azalées au printemps ;
- les tuteurs du potager et deux carrés : salades, courges en fleur, potirons
  ou paillage selon la saison ;
- des tournesols l'été ;
- un bassin qui reflète le ciel, avec ses carpes, ses nénuphars, ses ronds
  sous la pluie, gelé l'hiver ;
- une lanterne de pierre, allumée au crépuscule ;
- des graminées, en épis à l'automne, et des petites fleurs semées au premier
  plan, au printemps et en été ;
- une branche à l'encre qui retombe du coin haut droit, en fleur, en feuilles
  vertes ou rouges, ou portant la neige.

Y vivent des papillons et des libellules le jour, des oiseaux de passage au
printemps et à l'automne, des lucioles les nuits d'été. Tombent des pétales au
printemps, des feuilles d'érable à l'automne, des flocons quand il neige. La
rosée brille deux heures après le lever par ciel dégagé.

La nuit, la lune traverse le ciel du coucher au lever. Elle porte un halo,
argente le bord des nuages proches, pose sa clarté sur le paysage et se
reflète dans le bassin.

## Lisibilité

Les blocs de verre restent posés par-dessus. Le nom du jardin et la date,
posés à même le ciel, prennent un halo clair le jour et passent en clair la
nuit, comme les titres du carnet et du catalogue. Le passage en clair se
règle sur la clarté du haut du ciel, non sur la seule nuit : au crépuscule
d'automne, le ciel déjà sombre rendait la date foncée illisible.

La branche a d'abord été raccourcie d'un sixième par rapport à la maquette,
pour laisser la date lisible. Sur l'application en ligne, ses feuilles
passaient encore derrière « Se connecter » et le titre du catalogue : à la
demande de Jérôme, elle a été raccourcie d'un cinquième de plus, et le halo
clair du jour s'étend aux titres d'écran du carnet et du catalogue, à leur
compte et à leur lien.

## Choix du fond

Les réglages du compte portent une ligne « Fond », visible avec ou sans
connexion. Le choix vaut pour l'appareil et se garde sous la clé
`monjardin.fond`.

| Fond | Effet |
|---|---|
| Jardin vivant | par défaut, la toile décrite ici |
| Feuillage | le fond du 16 octobre : taches de couleur, branche, feuilles qui tombent |
| Uni | le ton de la saison, sa lumière et son voile, sans mouvement |

Hors du jardin vivant, la boucle de la toile est arrêtée.

## Réalisation

- `app.js`, section « Le jardin vivant », placée avant `meteoDuMoment` :
  - `soleilAuJardin` calcule la hauteur du soleil, la course du jour et celle
    de la nuit ;
  - `etatDuJardin` lit le temps de l'heure ;
  - `dessinerJardin` peint une image ;
  - `animerJardin` tient la boucle ;
  - `brancherFond` branche le réglage.
- `appliquerAmbiance` relit l'état au chargement, à l'arrivée de la météo et
  tous les quarts d'heure. Elle pose `data-fond` et `data-ciel` sur le calque
  et sur la racine du document.
- Le décor est pensé pour un écran de 390 points sur 844. La toile est mise à
  l'échelle sur la plus petite des deux mesures, et le décor s'étend en
  largeur sur une tablette ou un écran couché.
- `index.html` : la toile `#amToile` en dernier enfant du calque, la section
  `#panneau-affichage` dans le bloc du compte.

## Contrôles

`outils/essais/ambiance.mjs` joue d'abord le feuillage, choisi d'avance sur
l'appareil par la nouvelle option `fond` d'`ouvrirContexte`. Il contrôle
ensuite le jardin vivant :
- le fond par défaut, la toile qui couvre l'écran à sa finesse ;
- un ciel bleuté et un sol vert un matin d'été ;
- le mouvement ;
- les trois choix et leur description, le retour du feuillage et sa mémoire
  après rechargement, le fond uni immobile ;
- le ciel sombre et le titre en clair la nuit ;
- l'image unique quand le système demande moins de mouvement.

`outils/audit/vues-jardin-vivant.mjs` photographie le fond aux quatre saisons,
de jour et de nuit.

## Piège rencontré

La toile, d'abord posée en premier enfant du calque, décalait les sélecteurs
`.am-tache:nth-child(n)` du feuillage, et la cinquième tache perdait sa
couleur. Elle se place après les taches.
