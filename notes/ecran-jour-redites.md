# Écran du jour, les redites retirées

Note du 13 octobre 2026. Deuxième lot du chantier de simplification ouvert par
l'audit de `annee-a-la-quinzaine.md`.

## Constat

L'écran du jour disait trois fois la tâche du moment : la phrase de tête, la
phrase « Première quinzaine pour… », puis les lignes de tâche, qui portaient
déjà la marque « · 1ère quinzaine » pour les tâches que la seconde phrase ne
nommait pas. Il disait aussi trois fois l'eau : la tuile « 26 L/m² », l'alerte
de chaleur « arroser tôt », et la ligne du pied de la synthèse « Arroser
environ 26 litres par m² ».

## Décisions

Jérôme a retenu de garder la phrase de tête et les lignes, et de garder l'eau
dans sa seule tuile.

La phrase de tête reste parce qu'elle dit ce qui presse : seule, elle nomme
les plantes dont la fenêtre se ferme, et son lien « avant la fin de la
quinzaine » ouvre le niveau de ce qui se ferme.

L'alerte de chaleur reste : elle dit quand arroser, non combien.

## Réalisation

La phrase « Première quinzaine pour… » est retirée, avec le niveau qu'elle
ouvrait, qui réunissait toutes les actions entrées dans leur fenêtre. Sa marque
passe sur chaque ligne concernée : la condition qui la refusait aux tâches
nommées par la phrase tombe. Une ligne garde une seule marque, ce qui se ferme
primant sur ce qui s'ouvre. Le détail d'une tâche garde ses pastilles de
première quinzaine.

La ligne d'eau du pied de la synthèse est retirée quand la météo est chargée,
la tuile la portant alors. Sans météo, la tuile manque et le pied garde le
besoin moyen de la normale de saison, seule mention de l'eau dans ce cas.

Les règles de style de la phrase retirée sont supprimées.

## Message du jardin vide

Jérôme a relevé en production que l'écran du jour, sans connexion, renvoyait au
« bouton rond au milieu de la barre du bas » pour ouvrir ses plantes. Ce bouton
n'ouvre plus les plantes depuis la refonte du 13 août, il sert à noter, et il
est caché tant qu'on n'est pas connecté. La frise de l'année portait le même
texte, la lecture à la quinzaine une variante.

Les trois messages passent par `messageSansPlante`. Sans session : « Connectez-vous
pour retrouver votre jardin. Le bouton du compte est en haut à droite de
l'écran. » Connecté sans plante : « Aucune plante au jardin. Le livre de
l'en-tête ouvre le catalogue, d'où l'on ajoute ses plantes. » La suite `annee`
contrôle les deux cas sur les trois écrans.

## Mesures

Jardin de dix-sept plantes, au 2 août, à 393 points de large, par
`outils/audit/interface.mjs` : 1 160 points de haut, 19 contrôles visibles et
136 mots, contre 1 269 points, 23 contrôles et 144 mots avant.

## Contrôles

`outils/essais/quinzaine.mjs` est réécrite, vingt contrôles : la tête garde
son échéance, la phrase des ouvertures a disparu, les lignes suivent la tête,
les trois tâches que la phrase nommait portent la marque, aucune ligne ne porte
les deux marques, un seul lien de bord, le niveau de ce qui se ferme et son
contenu, sa fermeture par le chevron et par le retour du téléphone, l'absence
de lien sans échéance, et l'eau dite à la seule tuile.

Le cas sans météo n'est pas joué par les essais : la doublure sert toujours
une série.
