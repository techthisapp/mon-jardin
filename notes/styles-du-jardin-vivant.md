# Les styles du jardin vivant

Note du 18 octobre 2026. Le jardin vivant se peint désormais en trois styles,
chacun avec son propre décor, au choix dans les réglages du compte.

## Demande et étapes

Après le jardin vivant dans la veine des estampes, note `jardin-vivant`,
Jérôme a demandé des thèmes à régler. Le parcours a compté quatre étapes :

1. **Sept décors par climat.** Ils ont été dessinés dans la veine des
   estampes et reliés aux cinq climats de la base.
2. **Styles appliqués par filtre.** Neuf styles ont été posés comme un filtre
   sur le même décor : minimaliste, brutaliste, moderne, gravure, aquarelle et
   d'autres. Jérôme a écarté l'approche : un style doit avoir son propre décor.
3. **Minimaliste.** Il a été dessiné comme un décor à part entière, et jugé
   laid.
4. **Planches de Jérôme.** Après connexion de Figma, Jérôme a fourni deux
   planches illustrées, moderne et brutaliste, chacune en quatre saisons. Il a
   demandé un rendu vectoriel plutôt que les images elles-mêmes, trop petites
   pour l'écran, d'environ 465 sur 830 pixels par scène.

Les deux planches ont été redessinées en vectoriel, comparées scène par scène
aux originaux, puis affinées en plusieurs passes. Jérôme a validé
l'intégration.

## Les trois styles

| Style | Décor |
|---|---|
| Moderne, par défaut | villa blanche au bardage de bois, mur, haies taillées, terrasses et bandes de gazon, bassin miroir et trois marches flottantes, monts et cyprès |
| Brutaliste | béton brut piqueté, grand mur d'où retombe une grimpante, murets étagés et escalier, bassin sombre en perspective, grands bacs plantés, nuage de buis, mont et cyprès |
| Estampe | le décor du 17 octobre, dans sept variantes : jardin japonais, potager de campagne, bord de mer, méditerranéen, montagne, verger de l'Est, jardin de ville |

Les deux premiers styles changent avec la saison :

| Saison | Moderne | Brutaliste |
|---|---|---|
| Printemps | branche de cerisier, arbre en fleur, iris blancs | bacs fleuris de blanc et de rose |
| Été | branche d'érable verte, pin parasol, agapanthes, lavande | lavande dans les bacs, grimpante fleurie |
| Automne | érable roux, grand érable rouge, pampas | buissons rouges, graminées, grimpante rousse |
| Hiver | branche nue enneigée, bassin gelé | neige sur les blocs et les bacs, baies rouges, bassin gelé |

Les deux styles partagent le reste :
- le ciel au soleil réel, la lune et sa clarté ;
- les nuages, la pluie, la neige, le brouillard et les éclairs de l'heure ;
- le vent ;
- la branche du coin haut droit ;
- ce qui tombe.

La nuit, le bardage de la villa et les murets s'éclairent. Le bassin reflète
la scène et ondule au vent.

Pour l'estampe, le décor suit par défaut le climat du jardin actif :

| Climat | Décor |
|---|---|
| Océanique | bord de mer |
| Océanique dégradé | campagne |
| Semi-continental | Est |
| Méditerranéen | méditerranéen |
| Montagnard | montagne |

Le japonais et la ville se choisissent seulement à la main.

## Réglages

Le bloc du compte porte deux lignes :

| Ligne | Choix | Quand elle paraît |
|---|---|---|
| Fond | Jardin vivant, Feuillage, Uni | toujours |
| Style | Moderne, Brutaliste, « Estampe, selon le climat du jardin », puis chacun des sept décors de l'estampe | avec le jardin vivant |

Les choix valent pour l'appareil, sous les clés `monjardin.fond`,
`monjardin.style` et `monjardin.decor`.

Une première version, publiée le 18 octobre, séparait le style et le décor en
deux listes. Jérôme ne parvenait pas à choisir le style voulu : les décors de
l'estampe n'apparaissaient qu'après avoir choisi l'estampe, dans une seconde
ligne. À sa demande, tous les styles publiés tiennent dans une seule liste,
où chacun se choisit directement.

## Deux couches pour tenir la cadence

Une scène moderne ou brutaliste entière prenait de 30 à 43 millisecondes par
image dans Chromium sur ordinateur, au-dessus des 33 millisecondes d'une
cadence de 30 images par seconde. Un téléphone est plus lent encore.

Chaque scène se peint donc en deux couches :
- **Le fond immobile.** Il comprend le ciel, les monts, l'architecture, le
  bassin et son reflet. Il est peint dans une image gardée en mémoire, et
  repeint seulement quand la clé de `peindreEnCouches` change : style, saison,
  temps, gel, hauteur du soleil au degré près, course du soleil ou de la lune,
  taille de l'écran.
- **Ce qui vit.** Il comprend les nuages, les scintillements, les ronds et le
  reflet de lune sur l'eau, les plantes du premier plan, la branche, la chute
  et le temps. Cette couche est repeinte à chaque image.

Le temps par image tombe de 8 à 14 millisecondes. L'estampe reste peinte en
une seule couche, à 16 millisecondes. Les arbres et les massifs du fond restent
immobiles entre deux repeints ; la branche, le premier plan et l'eau bougent.

## Pièges rencontrés

**Le feuillage qui scintille.** Une masse de feuillage tirait la place de ses
feuilles d'une graine calculée sur sa position. Portée par une branche qui se
balance, elle redistribuait toutes ses feuilles à chaque image : l'arbre de
gauche semblait s'agiter très vite. La graine est désormais fixe, transmise
par le rameau.

**Le balancement qui s'additionne.** L'écart de chaque rameau s'ajoutait à
celui de son parent. Par grand vent, les pointes pivotaient de plusieurs
radians. L'écart est divisé par cinq et le vent plafonné à 60 km/h.

**Le reflet par copie de la toile.** Le bassin reflète la scène en recopiant
sur elle-même une bande de la toile, retournée et découpée en bandes
ondulantes. La copie se fait dans l'espace des pixels, d'après la
transformation courante. Elle doit donc avoir lieu avant que les marches et le
premier plan ne soient peints.

## Réalisation

`app.js`, section « Le jardin vivant » :
- le moteur commun : ciel, temps, outils de dessin, branche ;
- les sept décors de l'estampe ;
- `peindreModerne` et `peindreBrutaliste` ;
- `peindreEnCouches` et `peindreJardin` ;
- `soleilAuJardin` et `etatDuJardin` pour les données ;
- `brancherFond` pour les deux lignes de réglage.

Le minimaliste et l'infrastructure des styles par filtre ne sont pas entrés
dans l'application.

## Contrôles

`outils/essais/ambiance.mjs` contrôle :
- le moderne par défaut, son ciel bleuté au matin d'été et son mouvement ;
- les dix styles de la liste unique et leur description ;
- un brutaliste qui se peint autrement que le moderne, et sa mémoire sur
  l'appareil ;
- l'estampe qui suit le climat, son ciel bleuté et son sol vert ;
- un décor de l'estampe choisi directement dans la liste.

`ouvrirContexte` gagne l'option `style`.

`outils/audit/vues-jardin-vivant.mjs` photographie chaque style aux quatre
saisons, de jour et de nuit.
