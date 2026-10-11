# Écran du moment, feuille d'herbier

L'écran « En ce moment » est traité comme une page d'herbier : papier grené, les
onze autres mois de l'année imprimés en filigrane sur toute la hauteur, blocs
translucides qui les laissent deviner, planches botaniques sur les lignes de
gestes, bande de ce qui fleurit, dicton en pied. **En production depuis les
commits 3cd52d9, 3d29a7e et eb8dbbf.**

## Ce qui a motivé le chantier

Toute la matière de l'application vivait dans le bandeau sombre et mourait à la
pliure. En dessous : du texte gris sur beige, un pavé blanc, six lignes de même
poids et six pastilles pastel pour tout dessin. Les cent quatre-vingt-dix
planches botaniques et les douze dessins mensuels du dépôt n'apparaissaient
jamais sur cet écran. La page se lisait comme un carnet de corvées, avec deux
cent vingt-quatre gestes annoncés et rien qui récompense le jardinier.

La ligne de l'année en a été retirée au passage : cet écran parle de la
quinzaine, pas de l'année. Elle reste sur le calendrier, dont l'année est le
sujet.

## Le papier

Grain fin et fibres longues, obtenus par deux bruits `feTurbulence` posés en
ligne dans la feuille de style, sous forme de `data:image/svg+xml`. Environ un
kilo-octet, aucune requête. Ils sont fondus en `multiply` sur un lavis chaud
`rgba(206,193,152,.13)`, dans un pseudo-élément `::before` de `#ec-maintenant`.

## La prairie

`chargerPrairie()` va chercher les onze mois autres que le mois courant, dans
l'ordre du calendrier à partir du mois prochain. Ils sont déjà déclarés dans
l'agent de service : trente et un kilo-octets compressés, une seule fois, hors
du chemin critique. Le chargement part une fois le dessin du bandeau posé,
`poserMotifMois()` appelant `chargerPrairie().then(poserPrairie)`, pour que le
dessin qui se voit se serve le premier.

`poserPrairie()` mesure la hauteur de la section et pose un dessin tous les deux
cent trente pixels, quatorze au plus. Les valeurs de position, d'échelle et
d'opacité dérivent du rang : le fond est le même d'un rendu à l'autre. Un
`ResizeObserver` le recompose quand la page grandit.

Le fond est immobile. Les classes d'animation des SVG sont déclarées sous
`.motif-mois`, donc elles ne s'appliquent pas sous `.prairie` : cent
quarante-trois animations derrière le texte coûteraient cher et distrairaient.

## Rognage

Les dessins mordent volontairement sur les deux bords. Le rognage est doublé :
`overflow: clip` sur la section, qui rogne sans en faire une zone défilante, et
`clip-path: inset(0)` sur la prairie, que le compositeur respecte. Les dessins
ne portent aucune transformation CSS : une rotation aurait fait composer chaque
élément dans son propre calque, et un calque composé n'est pas toujours rogné
par l'ancêtre qui porte `overflow: hidden`.

## Translucidité

`#ec-maintenant` redéfinit `--papier-haut` à `rgba(251,250,247,.70)`. Tous les
blocs de cet écran qui s'appuyaient sur cette variable deviennent translucides
d'un coup, sans énumérer les sélecteurs. Le texte garde sa pleine encre, c'est
contrôlé.

Trois réglages avaient été maquettés, discret, moyen et affirmé, sur la double
échelle de l'opacité des dessins et de celle des blocs. Le moyen est retenu.

## Planches et bande de fleurs

Chaque ligne de geste porte la planche de la première plante nommée qui en
possède une, à la place de la pastille colorée. Le picto de la tâche reste en
repli quand aucune plante de la ligne n'a de planche.

Une carte « en fleur en ce moment » ouvre l'écran, huit planches au plus,
choisies parmi les plantes en fleur cette quinzaine, celles qui nourrissent les
butineurs d'abord. L'ordre alphabétique ne disait rien de ce qui vaut d'être
regardé. Chaque planche ouvre la fiche de sa plante. Le compte des plantes en
fleur disparaît du pied quand la bande est là.

Les planches sont posées à l'encre, par le masque déjà employé dans les listes.
La couleur a été écartée : une part notable des scans du fonds est en niveaux de
gris, la lavande et l'achillée par exemple, alors que le solidage et
l'hémérocalle sont en couleur. Une bande panachée aurait été bancale.

## Dictons

Un dicton d'almanach ferme la page. La version en production tourne à la
quinzaine, vingt-quatre entrées dans `app.js`. Le passage à un dicton par jour
est arbitré et en cours : deux cent onze jours portent un dicton propre à leur
date, cent cinquante-cinq sont servis par le repli de leur quinzaine, et le
tableau est en relecture chez Jérôme sous forme de classeur. Le fichier de
production fera quinze kilo-octets, chargé après le premier affichage et déclaré
dans l'agent de service.

La couverture par mois est inégale, et c'est la tradition qui le veut : juillet
dix jours et septembre onze, parce qu'on travaillait pendant la moisson et les
vendanges plutôt qu'on n'observait le ciel ; octobre vingt-trois et décembre
vingt-deux, parce que c'est là que se lisent les présages de l'hiver. Seuls les
dictons parlant du temps, de la terre, des semis, des récoltes, du gel, de la
sève, du bois et des abeilles sont retenus, ce qui écarte à peu près la moitié
du stock. Chaque dicton est un proverbe populaire ancien, libre de droits, relevé
sur le calendrier des saints de Nominis et sur les recueils de jardin en ligne.
Les éphémérides du commerce qui annoncent trois cent soixante-cinq dictons
comblent leurs trous par de la rédaction moderne, sous droits, et ne sont pas
reprises.

## Fausse piste, à ne pas refaire

Un trait vertical le long du bord droit a été pris pour une gouttière due à un
débordement horizontal, et corrigé comme tel. Mesure faite dans les pixels de la
capture : trois points de large, à trois points du bord, arrondi aux deux bouts,
sept cent treize points de haut, changeant de couleur selon ce qu'il recouvre.
C'est l'indicateur de défilement d'iOS, et il passe par-dessus le bandeau, que
la feuille de style de cet écran ne touche jamais. Avant de corriger un défaut
d'affichage rapporté par capture, mesurer la capture.

Le durcissement du rognage a néanmoins été conservé : il retire un vrai risque
de composition, même s'il ne réglait pas ce qui était rapporté.

## Contrôles automatisés

`outils/essais/herbier.mjs`, vingt-six contrôles : le grain et la prairie, le
rognage double et l'absence de transformation, l'absence de débordement de la
page et du corps, l'ordre des chargements et le retard sur la feuille de style,
l'immobilité du fond, la translucidité des blocs et l'encre du texte, la
vignette de chaque ligne, la bande de ce qui fleurit et l'ouverture d'une fiche
depuis une planche, le dicton. Deux cent trente-cinq contrôles au total sur
l'application.
