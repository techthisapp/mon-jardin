# Démarrage de l'application, mesures et traitement

Relevé du 3 août 2026, avant l'ajout des planches, suivi du traitement appliqué
le même jour. Poids et latences mesurés sur les adresses de production, calcul du
navigateur mesuré en local sur les 315 plantes réelles avec bridage du processeur
au quart.

## Le constat

Le calcul n'était pas en cause : premier rendu en 292 millisecondes sans réseau,
relecture du cache local de 721 kilo-octets en 5 millisecondes. La lenteur venait
entièrement du réseau, sur trois causes.

La profondeur du chemin. Dix allers-retours dépendants et cinq domaines avant que
les plantes s'affichent, dont quatre allers-retours pour le seul client Supabase
chargé depuis esm.sh en dix-sept modules répartis sur quatre niveaux d'imports.

Le volume. 643 kilo-octets, dont 219 de caractères et 82 de client de base, soit
301 qui n'appartenaient pas au site.

La requête du catalogue. `select("*")` sur 52 colonnes, 929 kilo-octets bruts,
266 compressés, 1 460 millisecondes, quand le premier écran a besoin de 26
kilo-octets et 370 millisecondes. Les colonnes `guide`, `attributes` et
`guide_periode` portaient 67 pour cent du volume.

Deux redondances s'y ajoutaient : `realtime-js`, `phoenix`, `buffer`, `events` et
`process` téléchargés sans qu'aucun appel n'existe dans le code, et
`rendreTout` appelé à chaque coche, reconstruisant les 315 rangées, le
calendrier, l'écran du moment et l'écran des espaces.

Aucun agent de service n'était enregistré. Le manifeste déclarait une application
installable mais rien n'était conservé entre deux sessions hormis le catalogue,
et GitHub Pages déclare les fichiers valides dix minutes.

## Ce qui a été fait

Trois dépôts, `fd3abd4`, `95e97e9` et `b79fcad`, contrôle avant dépôt vert et
138 contrôles de bout en bout au vert.

**Catalogue en deux requêtes parallèles.** `COL_LEGERES` porte ce que le premier
écran affiche, `COL_LONGUES` porte `attributes`, `guide`, `guide_periode` et
`advice`. Les deux partent en même temps, le premier rendu n'attend que la
première. Le cache local n'est écrit qu'une fois les deux arrivées, et les objets
de `plantes` portent ces champs vides jusque-là, jamais absents.

**Caractères servis par le site.** Les neuf fichiers sont dans `polices/`,
réduits au jeu français, déclarés en tête de `styles.css` avec
`font-display: swap`, deux graisses préchargées depuis `index.html`. Les deux
domaines de Google Fonts disparaissent.

**Client de la base groupé.** `vendor/supabase.js`, construit par
`node outils/paquet/construire.mjs` et versionné dans le dépôt puisque GitHub
Pages ne construit rien, préchargé par `modulepreload`. Le domaine esm.sh
disparaît.

**Agent de service.** `sw.js` met en cache le document, le script, la feuille de
style, le paquet, les caractères et les icônes. Document au réseau d'abord,
actifs versionnés au cache d'abord, appels à la base et au service
météorologique non interceptés. Vérifié hors ligne : la page se charge, le
catalogue de 315 plantes s'affiche, aucune erreur.

**Rendu ciblé à la coche.** Le filtre de l'écran des plantes ne porte jamais sur
la sélection, donc une coche n'ajoute ni ne retire de rangée. `majRangee`
remplace la seule rangée concernée, avec repli sur le rendu complet quand la
liste n'est pas encore construite.

## Résultat mesuré

| Mesure | Avant | Après |
|---|---|---|
| Chemin critique | 643 Ko | 229 Ko |
| Allers-retours dépendants | 10 | 4 |
| Domaines à résoudre | 5 | 2 |
| Requêtes du client de la base | 17 | 1 |
| Catalogue avant premier rendu | 266 Ko, 1 460 ms | 26 Ko, 370 ms |
| Catalogue complet | 1 460 ms | 820 ms |
| Caractères | 219 Ko, deux domaines tiers | 167 Ko, servis par le site |
| Coche d'une plante, processeur libre | 42 ms | 14 ms |
| Coche d'une plante, processeur bridé | 120 ms | 60 ms |
| Fonctionnement hors ligne | non | oui |

## Contrôles ajoutés

Le contrôle avant dépôt vérifie maintenant huit points au lieu de cinq. Trois
sont nouveaux : la version de l'agent de service et l'existence des actifs qu'il
déclare, l'empreinte du paquet du client dans `index.html` et dans l'import de
`app.js`, et l'absence de tout domaine autre que la base, le service
météorologique et le service d'adresses dans les fichiers servis par le site.
Ce dernier contrôle est ce qui empêche de replacer les caractères ou le client
sur un domaine extérieur.

Les essais de bout en bout s'exécutent avec `serviceWorkers: "block"`, faute de
quoi l'agent servirait les réponses de la doublure d'une page à l'autre.

## Ce qui n'a pas été fait, et pourquoi

La minification de `app.js` et de `styles.css` gagnerait 22 kilo-octets
compressés sur 66. Elle suppose que le fichier déployé soit un produit de
construction, ce qui déplace l'édition vers une source distincte et complique le
contrôle des empreintes. Le rapport entre le gain et la complexité ajoutée ne le
justifie pas tant que d'autres postes restent ouverts.

Le rendu ciblé n'a été appliqué qu'à la coche d'une plante, le seul geste qui
reconstruisait 315 rangées. Les autres appels à `rendreTout` suivent des
changements de jardin, d'espace ou de climat, où le rendu complet est le
comportement correct.

## Ce que les planches ajoutent maintenant

| Emploi | Par unité | Au premier écran | Au pire |
|---|---|---|---|
| Masque de liste, chargement paresseux | 2,5 Ko | 25 Ko, dix rangées | 810 Ko, liste entière parcourue |
| Planche de fiche, à l'ouverture | 12,7 Ko | néant | 12,7 Ko par fiche |
| Éléments ajoutés au document | 1 | 315 | 315 |

L'agent de service étant posé, ces fichiers ne sont demandés qu'une fois. Les
ajouter à la liste `ACTIFS` de `sw.js` les mettrait en cache dès l'installation ;
les laisser au cache d'exécution les ajoute au fil du parcours, ce qui convient
mieux à 810 kilo-octets dont l'utilisateur ne verra qu'une part.
