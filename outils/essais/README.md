# Essais de bout en bout

Ces essais ouvrent l'application dans un navigateur, sur des données figées, et
vérifient ce qui est réellement affiché. Ils complètent `outils/verification.mjs`,
qui ne contrôle que la cohérence statique des fichiers avant dépôt.

## Emploi

```
npm install          # la première fois
npx playwright install chromium
npm run essais       # toutes les suites
npm run essais -- glossaire   # une seule
```

Le lanceur sert le dépôt sur le port 8099, ouvre un navigateur, joue chaque
suite dans son propre contexte, et rend un code de sortie non nul au premier
contrôle en échec. Rien n'est écrit sur le disque, rien ne sort sur le réseau.

## Ce qui est simulé

Le client Supabase est remplacé par `doublure.mjs`, qui sert les données de
`donnees/` au lieu d'interroger la base. Les appels à Open-Meteo sont détournés
vers `donnees/meteo.json`. Les polices distantes sont neutralisées.

L'horloge du navigateur est décalée sur le 2 août 2026, par un écart constant
qui laisse tourner les minuteries de l'interface. Sans cela, les contrôles qui
portent sur la tâche du moment changeraient de résultat selon la saison.

## Données figées

| Fichier | Contenu |
|---|---|
| `catalogue.json` | Instantané complet du référentiel, toutes plantes, phases et conseils |
| `plantes-production.json` | Onze lignes réelles de `plants_full`, seules à porter les usages, les notes de couleur et les conseils par période |
| `meteo.json` | Trente jours passés et sept jours de prévision au point du jardin, plus les valeurs horaires |
| `glossaire.json` | Les quarante-quatre termes du glossaire avec leurs formes fléchies |

Ces fichiers sont des instantanés. Les régénérer quand le référentiel change
assez pour que les contrôles portent à faux, en relisant `plants_full` par
l'interface REST avec la clé publique.

## Suites

| Suite | Ce qu'elle contrôle |
|---|---|
| `bilan` | Arithmétique du bilan hydrique, sans navigateur |
| `navigation` | Les deux niveaux de l'écran du moment, le retour, la liste complète |
| `conseils` | Le conseil affiché est celui de la période en cours |
| `eau` | Relevé de pluie, texture du sol, effacement, décision d'arrosage |
| `station` | Poste de mesure, jours mesurés, valeurs douteuses écartées |
| `vigilance` | Bandeau selon la couleur et l'échéance, geste au jardin |
| `glossaire` | Repérage des termes, ouverture et placement de la définition |
| `ecarts` | Les quatre écarts entre la base et l'affichage corrigés le 2 août |
| `blocs` | Usage, feuillage, rusticité et associations dans les blocs de la fiche |

## Règle

Un essai qui n'affirme rien ne sert à rien. Chaque suite compte ses contrôles,
et un contrôle est une affirmation vérifiable, non un affichage à relire. Les
erreurs de page relevées par le navigateur comptent comme des échecs.
