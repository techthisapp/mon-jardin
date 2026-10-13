# Audit par personas

Note du 13 octobre 2026, après les six lots de simplification de l'interface.

## Méthode

Le script `outils/audit/parcours.mjs` rejoue des parcours réels sur les données
figées des essais et laisse, pour chaque étape, la capture de ce que l'écran
montre et son texte visible : première ouverture sans compte, jardin vide qui
se compose, jardin établi de dix-sept plantes au 2 août parcouru écran par
écran, feuilles du temps et de l'eau, journée d'hiver, et largeur de 320
points. Quarante-cinq étapes, aucune erreur de page.

Quatre relecteurs indépendants ont lu ces parcours et le code, chacun dans la
peau d'un persona :

| Persona | Profil | Ce qu'il attend |
|---|---|---|
| Claire, 34 ans | Débutante, balcon et carré partagé, aucun vocabulaire horticole | Savoir en trente secondes quoi faire cette semaine |
| Marcel, 71 ans | Potager de 200 m² depuis quarante ans, presbyte, doigt peu précis | Vérifier que l'application dit juste, noter ses récoltes |
| Sophie, 45 ans | Jardin ornemental de 600 m², espaces et zones, carnet avec photos | Planifier le mois suivant, retrouver plante, lieu ou note en deux gestes |
| Karim, 29 ans | Potager de 50 m², usage de trente secondes le matin, daltonien | Savoir d'un coup d'œil s'il faut arroser et ce qui presse |

Les constats ci-dessous sont recoupés entre les quatre rapports. Ceux marqués
vérifiés l'ont été dans les captures ou dans le code ; les autres restent des
hypothèses à mesurer.

## Défaut corrigé pendant l'audit

Après « Tout voir » sur l'écran du jour, un changement d'onglet puis la
fermeture d'une feuille, par la croix comme par le retour du téléphone,
rouvrait la liste complète. Changer d'écran remettait l'écran du jour sur sa
vue d'ensemble sans ramener l'entrée d'historique, que la fermeture de la
feuille retrouvait. `afficher` ramène désormais l'entrée courante à la vue
d'ensemble. Contrôle ajouté à `outils/essais/navigation.mjs`.

## Constats, par ordre de priorité

### Effort faible, plusieurs personas touchés

1. **La tuile de l'eau ne dit pas la décision.** Vérifié. Elle affiche
   « 26 L/m² », « 4 mm » ou « 3 jours » selon l'état, sans verbe, alors que
   `mesureEau` calcule la décision. « 4 mm » d'attente de pluie se lit comme un
   petit arrosage. L'état « à arroser » ne se distingue que par un fond dont le
   contraste avec le papier vaut 1,0. Karim, Marcel, Claire. Proposition : la
   valeur porte le verbe, « Arroser 26 L/m² », « Attendre la pluie »,
   « Réserve 3 jours », avec une icône par état et un fond franc pour l'état
   qui demande un geste.

2. **Les pastilles « 1ère quinzaine » et « dernière quinzaine » se lisent
   comme des dates.** Vérifié. Les quatre personas l'ont relevé. Sous le titre
   « Seconde quinzaine d'août », « 1ère quinzaine » semble contradictoire ; sur
   l'écran du jour, les deux mentions ont le même rendu, et la marque vaut pour
   toute une ligne alors qu'elle ne concerne que certaines plantes.
   Proposition : « vient de s'ouvrir » et « se ferme », ou « dernière chance ».
   Libellé à arbitrer par Jérôme.

3. **Un même geste porte plusieurs noms.** Vérifié. « Amender » sur le jour et
   l'année, « fertilisation » sur les pastilles d'un espace, « Fertilisation »
   sur le ruban de la fiche ; de même « taille » et « Tailler », « plantation »
   et « Planter ». Les gestes du carnet n'ont ni « Amender » ni « Multiplier ».
   Claire, Sophie. Proposition : le verbe de `VERBE` partout où un geste est
   nommé comme une action.

4. **La saisie au carnet impose un lieu et filtre les plantes par ce lieu.**
   Vérifié. Ouverte depuis le jour, elle présélectionne le premier espace,
   « Potager », et ne propose que les plantes posées sur lui, sans celles de
   ses zones : la tomate du « Carré du fond » n'y est pas. « Enregistrer » et
   « Annuler » sont deux liens de 12,5 px côte à côte. Sophie, Marcel.
   Proposition : choisir la plante d'abord, parmi tout le jardin, et en
   déduire le lieu ; « Tout le jardin » comme lieu possible ; « Enregistrer »
   en bouton plein de 44 points.

5. **Les textes secondaires sont sous le seuil de contraste.** Vérifié :
   `--f-ink3` (`#8A9089`) vaut 2,9 sur le papier et 3,1 sur les cartes. Il porte
   les bornes de période, les sources et les notes, c'est-à-dire ce qui fonde
   la confiance. Marcel. Proposition : une teinte d'au moins 4,5, par exemple
   légèrement plus sombre que `#67736B`, qui vaut 4,46.

6. **Des commandes essentielles n'ont pas de mot.** Vérifié. Le rond de saisie
   n'a pas de libellé, le livre du catalogue non plus, et à 320 points trois
   des quatre onglets perdent leur nom. Claire, Marcel, Karim. Proposition :
   « Noter » sous le rond, « Catalogue » sous le livre, des libellés réduits
   plutôt que retirés.

7. **La première prise en main manque de chemins.** Vérifié. L'écran du jour
   vide renvoie au « livre de l'en-tête » sans bouton. Sans compte, « Mes
   plantes » annonce « 0 plante au jardin » au-dessus de tout le catalogue.
   Cocher une plante au catalogue ne confirme rien. La feuille du compte
   présente deux champs et deux boutons verts de même poids. Claire.
   Proposition : « Ajouter mes plantes » et « Indiquer ma commune » en boutons
   dans l'état vide ; un état vide propre à « Mes plantes » sans compte ; un
   bandeau « 3 plantes ajoutées, voir mon jardin » ; le code de reprise replié
   derrière « J'ai un code ».

8. **Les tâches arrivent tard sur l'écran du jour.** Vérifié. À 393 points, la
   première ligne de tâche commence vers 70 % de la hauteur, après la météo,
   l'alerte et « En fleur en ce moment » ; à 320 points, aucune n'est visible.
   Claire, Karim. Proposition : la carte des fleurs sous la synthèse. Elle a
   été placée là à dessein, « seul endroit de l'écran qui regarde le jardin
   plutôt que le travail » : arbitrage de Jérôme.

9. **La toxicité tient en un losange de 8 px.** Vérifié. Son sens n'est porté
   que par un `title`, invisible au toucher. Trois personas. Proposition : un
   mot, « toxique », à côté du losange agrandi.

10. **Un renvoi nomme un onglet qui n'existe plus.** Vérifié : « à placer
    depuis l'onglet Mes plantes », alors que l'onglet s'appelle « Plantes ».

11. **Les champs de saisie font moins de 16 px.** Établi. Safari agrandit la
    page au toucher d'un tel champ. Marcel. Proposition : 16 px pour tous les
    champs.

### Effort moyen

12. **Aucun moyen de dire qu'une tâche est faite, et le masquage est caché.**
    Vérifié. Seul un glissement latéral, sans indice, ouvre « Cette
    quinzaine », « Cette période » et « Ne plus afficher ». Le compte ne baisse
    jamais. Claire, Marcel. Proposition : une case « Fait » qui écrit une
    entrée de carnet préremplie et retire la ligne, et un bouton visible pour
    masquer. Rejoint le chantier ouvert du journal des actions réalisées, au
    document de reprise.

13. **Une entrée du carnet ne se corrige pas.** Vérifié : l'application
    n'écrit jamais de mise à jour sur `observations`. Le carnet n'a ni
    recherche ni filtre, et porte deux noms, « Carnet » et « Journal ». Sophie,
    Marcel. Proposition : « Modifier » rouvre la saisie préremplie ; des
    filtres par espace et par geste ; un seul nom.

14. **La frise de l'année repose sur la couleur seule.** Vérifié pour le code.
    Dix teintes, des barres de 8 px, une légende derrière un bouton. En
    simulation de deutéranopie, plusieurs paires se confondent, abri et
    récolte, taille et fertilisation, plantation et floraison. Karim, Marcel,
    Claire. Proposition : pictogramme en tête de barre, légende visible,
    voies de 12 px, palette revue sur l'axe bleu et jaune.

15. **Les chiffres d'eau ne se relient pas entre eux.** Vérifié : « 26 L/m² » à
    apporter, « 70 L par jour » pour un espace, « 4,6 L par jour et par m² » sur
    une fiche, « confort 58 % », « 6 % de la réserve », « 87 % du pic de
    l'année ». Karim, Marcel, Claire. Proposition : préfixer « À apporter » et
    « Besoin quotidien », donner le total pour les surfaces renseignées,
    expliquer ou retirer le pourcentage du pic.

16. **La lecture à la quinzaine ne se filtre pas par espace et ne garde pas sa
    position.** Vérifié. Sophie. Proposition : bascule « Tâche » et « Espace »
    comme sur la liste du jour ; garder la quinzaine lue pendant la session.
    La réouverture sur la quinzaine en cours est une demande de Jérôme du
    12 octobre : arbitrage. Karim ajoute un glissement horizontal pour changer
    de quinzaine, les flèches étant hors de portée du pouce.

17. **La zone d'une plante n'est lisible que dans sa fiche.** Vérifié : « Mes
    plantes » dit « Potager », jamais « Carré du fond ». Sophie. Proposition :
    nommer la zone sur la rangée, offrir le regroupement par espace.

18. **Les conseils ne disent ni leur source ni leur date.** Vérifié : la vue
    `plants_full` ne porte pas `source` ni `verified_at` des conseils. Marcel.
    Proposition : une ligne de source sous chaque conseil de période, ce qui
    suppose d'ajouter ces colonnes en fin de vue.

19. **Le démarrage dépend du réseau.** Hypothèse à mesurer. Seul le catalogue
    est en cache ; le jardin et l'eau du jour sont relus en série, et la météo
    arrive après le premier rendu. Karim. Proposition : cache local du dernier
    jardin et du dernier bilan, affiché aussitôt puis rafraîchi.

### Effort fort

20. Tailles de texte en pixels fixes, que le réglage du téléphone n'agrandit
    pas ; mise en page de tablette identique à celle du téléphone ; galerie des
    photographies par lieu et par plante.

## Ce qui fonctionne

Les quatre rapports s'accordent sur la phrase de tête de l'écran du jour,
« En ce moment, planter la carotte avant la fin de la quinzaine », qui donne
l'urgence en une ligne et sans couleur. Ils saluent l'alerte de chaleur
actionnable, les sources citées de la météo et de l'eau, l'écran d'un espace
découpé en zones, la lecture à la quinzaine et ses flèches, la fiche en
quatre onglets avec ses jauges, et l'architecture à quatre destinations et un
acte central.

## Artefact d'essai

Sur le parcours d'hiver, la météo du 2 août paraît sous la saison de repos :
la doublure décale les dates de la série sans en changer les valeurs. Ce
n'est pas un défaut de l'application.
