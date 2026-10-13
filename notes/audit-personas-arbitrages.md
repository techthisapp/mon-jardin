# Arbitrages de l'audit par personas

Note du 14 octobre 2026. Applique les quatre points de `audit-personas.md` qui
attendaient la décision de Jérôme : 2, 8, 12 et 16.

## Pastilles « démarre » et « se termine »

Jérôme a retenu « démarre » et « se termine » à la place de « 1ère quinzaine »
et de « dernière quinzaine », que les quatre personas lisaient comme des dates.
Le changement vaut pour les pastilles des actions, celles de la lecture à la
quinzaine, et le titre du niveau qu'ouvre le lien de la phrase de tête, qui
devient « Ce qui se termine ». La phrase de tête garde « avant la fin de la
quinzaine », qui est une phrase et non une étiquette.

Sur les lignes de la synthèse, la marque dit aussi le nombre de plantes
qu'elle touche, « · 2 démarrent » ou « · 1 se termine » : elle ne valait
souvent que pour une partie de la ligne, et se lisait comme valant pour
toutes. Les deux marques avaient le même rendu ; ce qui se termine prend la
teinte chaude de l'échéance, ce qui démarre reste neutre.

## Ce qui fleurit après le travail

La carte « En fleur en ce moment » passe sous la synthèse et son pied, avant le
dicton qui ferme l'écran. Posée avant, elle repoussait la première tâche aux
deux tiers de l'écran à 393 points, et sous la ligne de flottaison à 320.

## L'année garde ce qu'on lisait

L'écran de l'année s'ouvre sur la quinzaine en cours au lancement, puis garde
la quinzaine lue et la lecture choisie, quinzaine ou frise, le temps de la
session. Il repartait d'août à chaque retour, ce qui défaisait la préparation
d'un autre mois dès qu'on allait vérifier une plante. Le lien « Revenir à la
quinzaine en cours » reste.

## Case « fait »

Chaque rangée de tâche, dans le détail d'une tâche et dans la liste complète du
jour, porte à droite une case de 44 points. La cocher :

1. écrit une entrée au carnet sous le geste qui répond à la tâche : taille,
   amendement, multiplication, semis pour les deux semis, plantation, récolte.
   La protection, d'hiver ou d'été, n'a pas de geste au carnet et s'écrit en
   toutes lettres, « Protéger : fait. » ou « Ombrer : fait. ». Le lieu est
   celui de la plante quand elle n'en occupe qu'un ;
2. retire la ligne par le masquage existant : pour la quinzaine quand le geste
   se répète, la récolte, et pour le reste de la fenêtre sinon ;
3. l'annonce dans le bandeau, « Tailler le basilic : noté au carnet », avec
   « Annuler », qui efface l'entrée et rend la ligne.

La floraison se constate et n'a pas de case. La case suppose un compte, le
carnet et le masquage étant enregistrés au jardin.

Le glissement latéral et ses trois portées de masquage restent, pour écarter
une tâche sans l'avoir faite.

## Contrôles

`outils/essais/quinzaine.mjs` contrôle les marques comptées et le titre du
niveau. `outils/essais/herbier.mjs` contrôle la carte des fleurs sous la
synthèse. `outils/essais/annee.mjs` contrôle la lecture et la quinzaine
gardées au retour. `outils/essais/fait.mjs`, nouvelle suite, contrôle la case
sur chaque rangée, sa taille, son nom, l'entrée de carnet et son geste, le
masquage pour la fenêtre puis pour la quinzaine d'une récolte, le bandeau,
l'annulation, et l'absence de case sur la floraison.
