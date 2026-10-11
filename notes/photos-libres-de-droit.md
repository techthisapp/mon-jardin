# Photos de plantes libres de droit

Recherche du 3 août 2026, en suite de celle sur les planches dessinées. Toutes
les couvertures sont mesurées contre les 315 fiches actives, par appariement sur
le binôme latin et les trois noms acceptés déjà enregistrés.

## Le problème d'homogénéité, autrement résolu

Une photo n'est jamais homogène au sens d'un herbier dessiné : chaque cliché a
son photographe, sa lumière, son cadrage. Aucun fonds photographique libre
n'offre l'unité graphique d'un ouvrage du dix-neuvième siècle.

Pl@ntNet substitue à cette homogénéité une autre régularité : chaque photo est
étiquetée par l'organe qu'elle montre. Le vocabulaire relevé sur un échantillon
de 519 images est `leaf`, `flower`, `fruit`, `bark`, `habit`, `other`. Demander
la fleur d'une plante rend un gros plan de fleur, systématiquement. La
régularité porte sur le sujet cadré plutôt que sur le style.

## Pl@ntNet, le fonds à retenir

Porté par l'Inria, le Cirad, l'INRAE et l'IRD. Les observations validées par la
communauté sont publiées avec leurs images sous CC BY-SA, le nom de l'auteur
devant être cité.

Le jeu est exposé par GBIF, clé de jeu de données
`7a3679ef-5582-4aaa-81f0-8c2545cafc81`, soit 2 592 699 occurrences avec image.
Accès sans clé d'API :
`api.gbif.org/v1/occurrence/search?taxonKey=<clé>&datasetKey=<jeu>&mediaType=StillImage`.
Le titre de chaque média porte le binôme suivi de l'organe, par exemple
`Cistus creticus L.: leaf`. Les images sont servies par `bs.plantnet.org`.

Couverture mesurée : 296 fiches sur 315 ont au moins une photo, 271 en ont au
moins dix, 231 en ont plus de cent. Total disponible, 494 320 photos.

## Wikimedia Commons, le complément indispensable

Licences mêlées, domaine public, CC0, CC BY et CC BY-SA selon le fichier,
lisibles fichier par fichier dans `extmetadata`.

Ce qu'il apporte que Pl@ntNet n'a pas : les cultivars et les variétés de jardin.

La question de la qualité y trouve une réponse : le label **Quality image** est
attribué par revue des pairs sur des critères techniques, et forme une catégorie
interrogeable. Sur les 315 fiches, 278 ont une catégorie d'espèce fournie,
275 comptent au moins dix fichiers, 231 au moins cinquante, et **209 ont au
moins une image portant le label Quality image**. C'est ce label qui permet de
choisir sans passer les catégories en revue une par une.

## iNaturalist par GBIF

Comptages relevés par espèce, en licences réutilisables : 3639 photos CC0 et
6462 CC BY pour le buddleia, 512 et 1649 pour la tomate, 64 et 1072 pour la
lavande. Les photos sont servies par `inaturalist-open-data.s3.amazonaws.com`.

Le CC BY-NC y est majoritaire et doit être écarté, 27 234 photos contre 10 101
réutilisables pour le buddleia. Double Pl@ntNet sans l'améliorer sur le jardin.

## Openverse

Agrégateur de contenus sous licence libre, filtrable sur l'usage commercial.
240 résultats pour la lavande. Utile en dépannage, insuffisant comme fonds
principal.

## Les banques généralistes

Unsplash, Pexels et leurs semblables indexent par mot-clé et non par taxon. Ils
ne distinguent pas deux espèces d'un même genre, ce qui les rend inutilisables
pour un référentiel de 315 plantes nommées.

## Couverture totale

Trois cent une fiches sur 315 ont au moins une photo réutilisable.

Les quatorze restantes sont des hybrides horticoles dont le binôme n'existe pas
comme taxon : airelle rouge, bégonia tubéreux, carex, caryoptéris, casseille,
dahlia, dahlia cactus, forsythia, glaïeul, népéta, pensée, photinia, pétunia,
viorne d'hiver. Leur genre est bien fourni, 1243 fichiers sur Commons pour ces
treize genres, mais au niveau du genre seulement.

## Le vrai obstacle

Ce n'est ni la licence ni le volume, c'est l'identification.

Une photo de terrain porte le nom que l'observateur lui a donné. Pour une espèce
sauvage la communauté corrige, et le niveau research grade d'iNaturalist ou la
validation communautaire de Pl@ntNet donnent une garantie raisonnable. Pour un
cultivar de jardin elle ne le peut pas : rien ne distingue à l'œil deux variétés
d'hortensia ou deux dahlias.

Conséquence pour le référentiel : sur les fiches de cultivar, une photo montre
l'espèce et non la variété, et la fiche doit l'énoncer. C'est le même principe
que pour le reste du contenu, la provenance dit ce que la source établit.

## Ce que cela suggère pour l'application

Deux fonds complémentaires, avec une règle de choix écrite :

Pl@ntNet en premier, filtré sur l'organe, pour les espèces botaniques. La
vignette de liste appelle `flower`, la fiche peut appeler `habit` ou `leaf`
selon ce qu'elle veut montrer.

Wikimedia Commons en second, restreint aux images portant le label Quality
image, pour les cultivars et les variétés que Pl@ntNet ne couvre pas.

Dans les deux cas la mention d'auteur est obligatoire, CC BY-SA pour Pl@ntNet,
variable pour Commons. Une colonne de crédit par image est donc nécessaire, au
même titre que la colonne de provenance des données.
