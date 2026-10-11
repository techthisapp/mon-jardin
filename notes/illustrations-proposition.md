# Illustrations dans l'application : planche et photos

Proposition du 3 août 2026, révisée deux fois le même jour. Parti retenu :
Masclef en premier, Vilmorin ensuite, Köhler pour ce qu'aucun des deux ne
possède, Thomé en dernier. La vignette de liste est un masque teinté par la
feuille de style, l'entête de fiche porte la planche en couleur sur fond blanc.
Une maquette accompagne ce document.

## Ordre des fonds

Le critère est la facture de la planche. Le dessin doit reposer sur un fond
blanc, sans cartouche ni fond coloré, pour que des planches de recueils
différents se ressemblent une fois posées dans la même tuile. Thomé descend en
dernier parce que ses numérisations portent une ombre de bord de page, corrigée
depuis mais suffisante pour le placer derrière les autres.

| Fonds | Volume | Facture | Espèce | Genre |
|---|---|---|---|---|
| Masclef 1891, Atlas des plantes de France | 413 planches, 379 espèces | chromolithographie sur fond blanc, plante entière et détails | 44 | 54 |
| Vilmorin 1883 et 1904, Les plantes potagères | 976 planches | gravure au trait sur fond blanc, une variété par planche | 85 | néant |
| Köhler 1887, Medizinal-Pflanzen | 608 planches, 288 espèces | chromolithographie sur fond blanc, médicinales et aromatiques | 18 | néant |
| Thomé 1885, Flora von Deutschland | 1 212 planches, 586 espèces | chromolithographie, numérisation ombrée | 14 | 15 |

L'affectation suit quatre passes à l'espèce, Masclef, Vilmorin par le nom
français, Köhler, Thomé. Le genre n'est retenu qu'ensuite, chez Masclef puis
Thomé.

Une espèce exacte chez un fonds de recours vaut mieux qu'un genre chez un fonds
préféré. Le coquelicot le montre : Masclef et Thomé n'ont que *Papaver
somniferum*, le pavot somnifère, quand Köhler a *Papaver rhoeas*.

Couverture : 161 fiches avec la planche de leur espèce, 69 avec une planche de
leur genre, 85 sans planche. Retirer aussi Thomé du repli au genre coûterait
quinze fiches, qui n'auraient plus de planche du tout.

## Rendu retenu

Vignette de liste, masque teinté. Le fichier ne porte que la forme, la couleur
vient de la feuille de style : encre du texte à quatre-vingts pour cent, teinte
de sélection quand la plante est retenue. Une gravure au trait de Vilmorin, une
chromolithographie de Masclef et une planche de Köhler sortent dans la même
encre. Trente-quatre pixels de côté, entre la coche et le nom, aucune rangée ne
s'allonge. Le thème sombre ne demande qu'un changement de teinte.

Entête de fiche, planche en couleur sur fond blanc. Elle remplace le motif
décoratif par typologie, même position en haut à droite. Le blanc du papier
disparaît par `mix-blend-mode: multiply`, un dégradé linéaire dégage le côté du
titre, l'opacité est ramenée à cinquante-cinq pour cent.

La tuile tramée a été fabriquée et écartée. Elle reste accessible sans refaire
les fichiers, la trame n'étant qu'une propriété de fond dans la feuille de style.

## Chaîne de production

Un script hors application, relancé à chaque plante ajoutée.

Le liseré mort de la numérisation est retiré par mesure de l'écart au papier.

Le papier est ensuite redressé point par point. Son niveau est relevé par blocs
sur toute la planche, les blocs entièrement couverts d'encre sont comblés par
leur plus proche voisin valide, le champ obtenu est lissé puis divisé canal par
canal. Teinte crème, ombre de reliure et vignettage partent ensemble, le dessin
garde ses couleurs. Une tranche de volume teintée, qui n'est pas du papier
sous-exposé et qu'aucune division ne blanchirait, est coupée séparément : le
critère est la médiane de la ligne ou de la colonne, une rangée de bord
entièrement teintée s'écarte du blanc quand une rangée traversée par le dessin
reste claire.

Les mentions portées sur la planche sont effacées, titre de planche, légende du
bas et étiquettes ajoutées par le contributeur. Le critère est typographique et
non sémantique : un amas d'encre peu saturée, de taille de caractère, aligné
avec au moins deux autres de hauteur voisine, et reposant sur du papier vide.
Cette dernière condition distingue une légende d'un détail du dessin, toujours
cerné d'encre. Elle est vérifiée de deux manières, densité d'encre étrangère
dans le voisinage et bandes vides au-dessus et au-dessous.

Le cadre vient de la plus grande masse d'encre connexe, mesurée sur une image
réduite d'un facteur six puis fermée morphologiquement. Les numéros de planche
et les marges tombent hors du cadre.

Le dessin est enfin centré dans un carré. Deux sorties, le masque de liste en
WebP sans perte à huit niveaux d'opacité, et la planche de fiche en WebP à fond
blanc incorporé.

Une planche de contact relue à l'œil précède le versement. Les étiquettes de
Masclef ne partent pas toutes, celles qui touchent le dessin restent, et elles
se lisent comme une texture à la taille d'affichage.

## Le poids, mesuré

Mesures prises sur vingt planches des quatre fonds, moyenne rapportée aux 315
fiches.

| Fichier | Côté | Moyenne | 315 planches | Chargement |
|---|---|---|---|---|
| Masque de liste, huit niveaux | 128 pixels | 2,5 kilo-octets | 0,81 méga-octet | à l'affichage de la rangée |
| Planche de fiche, fond blanc | 320 pixels | 12,7 kilo-octets | 4,10 méga-octets | à l'ouverture de la fiche, une seule |

La transparence en couleur coûte quatre fois le fichier à taille égale,
vingt-quatre kilo-octets contre six à deux cent vingt-quatre pixels. C'est ce
qui écarte un fichier unique en couleur à fond transparent et impose ces deux
sorties, un masque sans couleur d'un côté, une planche à blanc incorporé de
l'autre.

Le masque de liste part avec l'application et tient dans le cache du service
worker, la planche de fiche est appelée à l'ouverture et mise en cache ensuite.

## Ce qui est stocké, et où

La planche ne demande aucune colonne. Les fichiers `planches/<slug>.webp` et
`planches/fiche/<slug>.webp` existent ou n'existent pas, et un manifeste
`planches.json` de quatre kilo-octets part avec l'application pour que le code
sache s'il doit réserver la place. Rien ne transite par la base.

Les photos demandent une table, parce qu'elles portent une adresse, un auteur et
une licence à citer.

```sql
create table plant_images (
  plant_id  uuid references plants(id) on delete cascade,
  organe    text,          -- fleur, feuille, port, fruit, detail
  position  smallint not null,
  url       text not null,
  auteur    text, licence text, lien text,
  primary key (plant_id, organe, position)
);
```

Quatre à cinq lignes par plante, deux cents octets chacune, soit trois cent
mille octets pour le référentiel entier. Trop pour le catalogue de démarrage : la
table est interrogée à l'ouverture d'une fiche, jamais avant.

## La section photos de la fiche

Une bande de tuiles carrées, dans un ordre fixe d'une plante à l'autre : fleur,
feuille, port, fruit, détail. Cet ordre imposé et le carré identique tiennent
lieu d'homogénéité, puisque les photographes changent d'une image à l'autre. Une
tuile manque quand la source ne couvre pas cet organe, la bande raccourcit,
aucune case vide.

Sur téléphone la bande défile horizontalement, cent douze pixels par tuile. Le
toucher ouvre la photo en plein écran avec son auteur, sa licence et le lien vers
la source. Le crédit collectif reste sous la bande.

## Les licences, et ce qu'elles interdisent

Les planches sont dans le domaine public. Les retoucher et les recadrer ne pose
aucune question et les fichiers peuvent vivre dans le dépôt.

Les photos sont sous CC BY-SA. Les afficher à côté d'un autre contenu ne
contamine pas l'application, il s'agit d'une juxtaposition. Recadrer une image
produit en revanche une œuvre dérivée, qui devrait être rediffusée sous la même
licence. La conséquence est concrète : le carré des tuiles se fait par
`object-fit: cover` au moment de l'affichage, jamais en fabriquant un fichier
recadré, et les photos ne sont pas réhébergées.

L'attribution est obligatoire dans les deux cas, auteur, licence et lien vers la
source. GBIF rend ces trois champs pour chaque image de Pl@ntNet.

## Ce qui se passe quand il n'y a rien

Sans planche, la vignette de liste ne laisse pas de trou : l'élément disparaît et
la rangée se referme. L'entête garde le motif décoratif par typologie qui s'y
trouve déjà, ce qui est la raison de ne pas le retirer du code. Sans photo, la
section entière est absente, sans titre ni cadre vide.

Une planche du genre plutôt que de l'espèce se signale au plein écran, au même
titre qu'une photo de cultivar montre l'espèce et non la variété.

## Le chantier

La fabrique des 315 planches, ses deux sorties et son manifeste, hors
application.

La vignette de liste et le filigrane d'entête, qui ne touchent que `carteItem`,
l'entête de fiche, et une règle de style chacun.

La table des photos, son chargement à l'ouverture de la fiche, le plein écran et
les crédits.

Les contrôles automatisés : la vignette apparaît quand la planche existe et
disparaît sinon, la bande respecte l'ordre des organes, le crédit est présent dès
qu'une photo l'est.

## Ce qui reste à trancher

Le sort des 69 planches de genre. Elles sont justes au genre et fausses à
l'espèce dans un nombre de cas inconnu, à mesurer par relecture avant versement.

Le potager. Dix-huit fiches que Vilmorin couvre partent chez Masclef, qui montre
l'espèce botanique et non la forme cultivée : la carotte sauvage plutôt que la
carotte, la betterave sauvage plutôt que la betterave. La liste complète est
Absinthe, Asperge, Betterave, Carotte, Cerfeuil, Concombre, Cornichon,
Céleri-rave, Mélisse citronnelle, Panais, Pois, Pois mange-tout, Pomme de terre,
Pourpier, Radis, Radis noir d'hiver, Rutabaga, Tanaisie.

Le sort des 85 plantes sans planche, ornementales d'origine non européenne pour
la plupart. Curtis's Botanical Magazine et Gartenflora les couvrent, sur fond
blanc également, mais s'étendent sur un siècle et demi et sur des dizaines de
dessinateurs.
