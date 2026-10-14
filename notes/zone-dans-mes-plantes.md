# La zone d'une plante dans « Mes plantes »

Note du 14 octobre 2026. Point 17 de `audit-personas.md`.

## Constat

La rangée d'une plante dans « Mes plantes » ne nommait que l'espace,
« Potager », jamais la zone. Retrouver où pousse une tomate demandait d'ouvrir
sa fiche puis l'onglet « Au jardin ».

## Réalisation

La rangée nomme la zone après l'espace, entre parenthèses : « Potager (Carré du
fond) ». Une plante posée sur l'espace même n'en porte que le nom, et plusieurs
lieux restent séparés par une virgule : « Potager (Serre), Verger ».

Une liaison par « et » avait d'abord été retenue. L'essai des largeurs l'a
écartée : un espace nommé « Terrasse et balcon » se confondait alors avec deux
lieux. Les parenthèses lèvent l'ambiguïté.

Le regroupement par espace de « Mes plantes », que Sophie demandait aussi,
n'est pas fait : il reste ouvert.

## Contrôles

`outils/essais/espaces.mjs` contrôle l'espace suivi de la zone pour deux
plantes en zone, et le nom seul pour une plante posée sur l'espace.
`outils/essais/largeurs.mjs` garde son contrôle des quatre lieux séparés par
une virgule.
