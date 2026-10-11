# Motif d'entête, un dessin par mois

Le bandeau d'accueil porte un dessin d'inspiration herbier, posé derrière le
texte, qui change avec le mois affiché. Douze motifs, un par mois, dans la même
grammaire graphique. **En production depuis le commit 4a92716, cadre revu au
commit e626c09.**

## Ce qui est en place

`motifs/1.svg` à `motifs/12.svg` dans le dépôt, le mois courant appelé par
`poserMotifMois()` dans app.js après le premier rendu, la feuille de style
portant le cadre et les neuf familles d'animation sous `.motif-mois`, et les
douze fichiers déclarés dans les actifs de l'agent de service. La pousse
décorative unique qui tenait le bandeau depuis l'origine est retirée, avec ses
règles de style.

```js
async function poserMotifMois() {
  const hote = $("motifMois");
  if (!hote) return;
  try {
    const r = await fetch(`./motifs/${new Date().getMonth() + 1}.svg`);
    if (r.ok) hote.innerHTML = await r.text();
  } catch (e) { /* motif indisponible, le bandeau reste nu */ }
}
```

## Grammaire graphique

Quatre niveaux de valeur, du plus léger au plus appuyé. Le halo vert à sept pour
cent d'opacité porte la masse générale et le centre de gravité. L'aplat de fond,
blanc à cinq pour cent, passe sous les organes pleins. L'aplat d'organe remplit
les formes qui se répètent et feraient texture si elles étaient détaillées :
épillets de la graminée, feuilles rubanées, limbes dentés, fleurons de lavande,
baies, noix des glands, grains de raisin. Le dessin au trait blanc à vingt-six
pour cent, épaisseur 1,1, les détails secondaires à 0,62 d'épaisseur, reste
réservé à la structure et au sujet principal de chaque mois.

Deux usages de l'aplat. L'aplat d'appui accompagne un contour qui reste tracé,
la forme garde son dessin et gagne du corps. L'aplat de remplacement supprime le
trait là où il devenait illisible à force de répétition : c'est le cas des têtes
d'akènes de la clématite, réduites à deux masses concentriques à contour ondulé
et neuf plumes seulement.

Point technique à retenir : le groupe `.trait` porte une opacité de vingt-six
pour cent qui se multiplie avec le remplissage de ses enfants. Un aplat qui doit
se lire à huit pour cent demande donc un `fill-opacity` de trente pour cent. Les
valeurs retenues sont trente et vingt pour l'aplat d'appui, quarante-deux et
vingt-six pour la forme pleine sans contour.

## Dessin des fleurs doubles

Une fleur à nombreux pétales ne se dessine pas en empilant des pétales fermés
partant du centre : leurs bases se croisent, rien ne masque rien, et la corolle
se lit comme un papier froissé. La règle de la gravure est retenue : chaque rang
n'est dessiné que par son bord extérieur, un arc bombé par pétale séparé du
suivant par un creux, et chaque rang couvre la base du précédent. Les rangs sont
légèrement décentrés les uns des autres pour éviter l'effet de rosace, et un pli
court n'est tracé qu'à l'intérieur des pétales du rang extérieur. C'est la
construction de la rose de juin, cinq rangs de cinq, cinq, quatre, quatre puis
trois pétales, avec un cœur enroulé en spirale.

## Cadre et calage

Le cadre de dessin fait 260 sur 220 unités, affiché sur 202 pixels de large et
179 de haut, calé à `max(6px, calc(50% - 524px))` du bord droit pour suivre la
colonne de contenu sur écran large, et remontant de six pixels au-dessus du
bandeau.

Le cadre a d'abord été posé à 306 sur 271 pixels, avec deux règles de largeur
pour compenser un bandeau plus court sur grand écran. Le départ des trois
pastilles de mesure vers la feuille du jour a ramené le bandeau à cent
soixante et un pixels sur toutes les largeurs, ce qui a permis de réduire le
cadre et de supprimer les deux règles. La ligne de coupe est passée de cent
trente unités à 202 sur un écran de trois cent soixante points, et 205 au-delà :
la vue est visible presque entièrement, plus aucun sujet n'est tronqué et toutes
les animations se jouent dans le champ. C'est la solution retenue contre
l'alternative, qui consistait à remonter chaque motif individuellement.

Quatre contraintes gouvernent le décalage propre à chaque mois : le bord droit du
dessin reste en deçà de 250, le rond de réglages occupe le rectangle x 217 à 251
et y 31 à 63 et ne doit masquer aucun organe principal, la barre d'onglets couvre
tout ce qui descend sous y 170 où seules des tiges et des feuilles peuvent
passer, et la trajectoire des éléments qui s'envolent doit rester dans la carte.

| Mois | Décalage |
|---|---|
| Janvier | 12, -8 |
| Février | 8, 0 |
| Mars | 20, -4 |
| Avril | -8, 6 |
| Mai | 16, -8 |
| Juin | 20, -6 |
| Juillet | 14, 0 |
| Août | 6, -10 |
| Septembre | 10, -16 |
| Octobre | -4, 6 |
| Novembre | 12, 2 |
| Décembre | -2, 4 |

## Sujets retenus

| Mois | Sujet | Éléments animés | Poids compressé |
|---|---|---|---|
| Janvier | Graminée sèche | 15 | 3,5 Ko |
| Février | Perce-neige | 12 | 1,3 Ko |
| Mars | Jonquille | 10 | 1,7 Ko |
| Avril | Pommier en fleurs | 17 | 5,6 Ko |
| Mai | Muguet | 19 | 2,4 Ko |
| Juin | Rose ancienne | 9 | 1,6 Ko |
| Juillet | Lavande | 10 | 3,6 Ko |
| Août | Tournesol | 8 | 3,8 Ko |
| Septembre | Ombelle de carotte sauvage | 16 | 4,4 Ko |
| Octobre | Chêne | 8 | 4,4 Ko |
| Novembre | Aigrettes de clématite | 9 | 3,5 Ko |
| Décembre | Houx | 10 | 1,7 Ko |

Le choix privilégie ce qui se voit réellement au jardin le mois dit sous climat
français, et ce qui reste reconnaissable au trait à cette échelle. Le perce-neige
est en février, sa vraie période de floraison, et non en janvier.

## Animations

Neuf familles, toutes de longue période et de faible amplitude : respiration par
mise à l'échelle de trois pour cent, balancement au vent par rotation de un à 1,3
degré, éclosion combinant rotation et échelle, ouverture d'une corolle par
rotation autour de son point d'attache, enroulement d'une vrille, envol de pollen
ou d'akène, envol d'un organe entier, chute d'un pétale, d'un épillet, d'un
flocon ou d'une feuille.

Cent quarante-sept animations pour l'ensemble, de huit à dix-neuf par dessin.
Aucune période n'est inférieure à dix-neuf secondes, et deux éléments voisins ne
partagent jamais la même phase.

Le placement et l'animation sont séparés dans deux groupes emboîtés : une
animation CSS de transformation remplace l'attribut `transform` de l'élément
qu'elle vise, un dessin placé par cet attribut et animé par cette propriété se
replierait sur l'origine du repère. Le groupe extérieur porte la position, le
groupe intérieur porte le mouvement. La vérification se fait en figeant toutes
les animations à un pourcentage donné de leur cycle et en comparant la vue au
repos.

`prefers-reduced-motion: reduce` masque les particules et retire les animations,
pas seulement leur affichage : une animation posée sur un élément en `display:
none` reste inscrite dans la page et ressort de `getAnimations()`.

## Poids et chargement

Trente-cinq kilo-octets compressés pour les douze, de 1,3 à 5,6 kilo-octets par
mois. C'est trop pour le chemin critique de démarrage, ramené à 229 kilo-octets
lors du chantier de performance. Seul le mois courant est demandé, après le
premier rendu, et l'agent de service met les douze en cache à l'installation, ce
qui garde l'application utilisable sans réseau et laisse le démarrage inchangé.

## Contrôles automatisés

La suite `outils/essais/motif.mjs`, treize contrôles joués par `npm run essais` :
le bandeau porte un dessin détaillé, un seul mois est demandé et c'est celui de
la date affichée, il arrive après la feuille de style, les douze fichiers sont
servis et déclarés dans l'agent de service, le dessin reste sous le corps du
bandeau dont le titre demeure atteignable, le dessin est animé, et plus aucune
animation ne subsiste quand le système demande moins de mouvement.

Deux contrôles portent sur le champ visible. Le premier mesure la ligne de coupe
et exige qu'elle laisse voir au moins deux cents unités sur les deux cent vingt
de la vue. Le second charge les douze fichiers dans le bandeau réel, relève la
boîte de chaque élément animé, la corrige du décalage du mois et vérifie qu'elle
est visible sur au moins soixante-dix pour cent de sa hauteur au-dessus d'une
coupe prudente de deux cents unités. Cent quarante-trois éléments animés sont
ainsi couverts.

## Motifs en réserve

La vigne pour septembre, la pivoine de face, la pivoine de trois quarts et le
coquelicot pour juin sont dessinés et conservés dans les fichiers de travail.
Quatre motifs des propositions animées ne sont repris par aucun mois : la
digitale, la fronde de fougère, la touffe et la rosette. Trois sujets ont été
écartés en cours de route : l'églantier et ses cynorhodons, le noisetier en
chatons, et l'iris, qui se lisait comme un lotus.

## Points ouverts

1. La bascule au premier du mois pour un utilisateur qui garde l'application
   ouverte plusieurs jours, à traiter avec le rafraîchissement du bandeau météo
   ou à laisser au prochain chargement.
2. Le comportement en thème sombre, le trait blanc à vingt-six pour cent étant
   calé sur le dégradé vert foncé actuel.
