# Notes de chantier

Ces notes ont été rédigées au fil des chantiers, du 28 juillet au 19 août 2026, dans le Project claude.ai « Mon Jardin ». Elles consignent les décisions, les mesures et les sources de chaque lot de travail. Elles se citent entre elles sous la forme `claude/<nom>`, qui correspond ici à `notes/<nom>`.

Chaque note décrit l'état à sa date. En cas de divergence entre deux notes, la plus récente l'emporte. La date indiquée est celle que porte la note ou, à défaut, celle de son dépôt.

## Procédures

| Note | Date | Contenu | État |
|---|---|---|---|
| `procedure-ajout-d-une-plante.md` | 7 août, note d'entête du 10 août | Ordre des opérations pour ajouter une fiche : source par champ, croisements, contrôles avant activation, sources retenues et écartées | En vigueur, sixième révision, étape 5 remplacée par `adaptation-par-climat.md` |
| `procedure-de-publication.md` | 19 août | Clone, contrôle avant dépôt, essais, poussée et publication sur GitHub Pages | En vigueur, hors passages propres aux sessions claude.ai |

## Plans et arbitrages du référentiel

| Note | Date | Contenu | État |
|---|---|---|---|
| `plan-de-realisation.md` | 29 juillet | Inventaire des chantiers ouverts, règles de transférabilité climatique des sources, six lots, sept points à arbitrer | Lot 1 traité, points tranchés dans `decisions-arbitrages.md` |
| `decisions-arbitrages.md` | 29 juillet | Décisions motivées sur les sept points d'arbitrage du plan de réalisation, tableau d'application | Points 3, 4 et 7 appliqués |
| `plan-finalisation.md` | 29 juillet | Plan en sept lots pour achever la fiabilisation, sources testées, règles de conversion, journal d'exécution | Lot E terminé, lot A clos sur résultat négatif, lot C partiel |
| `plan-suite-sourcage.md` | 30 juillet | Plan en six étapes pour sourcer nectar, pollen, parfum et feuillage | Dépassé pour le nectar et le pollen, Bienenroute et la table de Gembloux ayant été retirés le 2 août |
| `fiabilisation-referentiel-etat-et-reste-a-faire.md` | 30 juillet | Taux de renseignement champ par champ et seize actions, dont la première faite | Point d'étape |
| `etat-au-2-aout-et-reste-a-faire.md` | 2 août | Travaux faits, restes à faire classés, règles générales | Point d'étape |

## Campagnes de sourçage et contrôles du référentiel

| Note | Date | Contenu | État |
|---|---|---|---|
| `confrontation-gbif-referentiel.md` | 28 juillet | Confrontation des noms latins à GBIF, POWO et Tela Botanica : méthode d'accès, colonnes, résultats, décisions de nommage | Réalisé |
| `enrichissement-baseflor-referentiel.md` | 28 juillet | Chargement de baseflor, colonnes et vocabulaires créés, migration des attributs libres vers des colonnes structurées | Réalisé |
| `ecarts-floraison-baseflor.md` | 28 juillet | Tableaux des écarts de période de floraison entre le référentiel et baseflor | Relevé |
| `estimations-et-points-a-verifier.md` | 28 juillet | Complétion par estimation du nectar, du pollen et du parfum, abandon de la piste PictureThis, fiches à vérifier | Dépassé, les estimations ayant été retirées le 2 août |
| `coherence-conseils-et-correctif-journal.md` | 29 juillet | Correctif du déclencheur de journal, conseils dupliqués par phase, complétion du feuillage | Réalisé |
| `journal-sourcage-30-juillet.md` | 30 juillet | Lots de sourçage du jour : parfum, feuillage, seuils de gel, nectar et pollen, groupes de cultivars, floraison, hivernage | Réalisé |
| `caractere-mellifere-sources-apicoles.md` | 28 et 30 juillet | Modélisation du nectar et du pollen en deux colonnes, sources retenues et écartées, conversions d'échelles | Sources et valeurs remplacées le 2 août par la liste Val'hor, modélisation en deux colonnes en vigueur |
| `pic-de-floraison-et-controles-croises.md` | 30 juillet | Pic de floraison sourcé sur TEMPO, règle de dérivation écartée, contrôle croisé avec baseflor, seuils de gel potagers | Réalisé |
| `conseil-par-periode.md` | 1er août | Conseils propres à chaque période : périmètre, rédaction dérivée par migrations, règles par tâche, contrôles | Réalisé |
| `ecarts-base-et-affichage.md` | 1er et 2 août | Audit des données présentes en base et absentes ou fausses à l'écran, défauts corrigés | Réalisé |
| `nectar-pollen-parfum-sourcage.md` | 2 août | Remplacement des estimations par les cotations Val'hor et par l'organe parfumé du Plant Finder : extraction, appariement | Réalisé |
| `relecture-des-associations.md` | 2 août | Relecture sourcée des associations et des antagonismes, ligne de la fiche renommée Voisinage | Réalisé |
| `campagne-usages-au-jardin.md` | 2 août | Sourçage de la colonne des usages, règle de dérivation écartée, répartition des sources | Réalisé |
| `audit-provenance-colonnes-affichees.md` | 2 août | Confrontation de l'exposition, de la hauteur et de la famille au Plant Finder, exceptions de contrôle | Réalisé |
| `conseils-par-periode-sourcage.md` | 3 août | Relecture sourcée des préambules des conseils par période, semis d'automne du pois | Réalisé |
| `adaptation-par-climat.md` | 10 août | Règle de dérivation de `plant_climates` reconstituée et mesurée, fonction `niveau_climat` | Réalisé, réservé aux fiches nouvelles |
| `trois-plantes-inactives.md` | 10 août | Insertion inactive de la phacélie, de l'aubépine et du céleri-branche, étapes restantes avant activation | En cours au 10 août |

## Base de données

| Note | Date | Contenu | État |
|---|---|---|---|
| `structure-base-de-donnees.html` | 29 juillet | Page décrivant le schéma : diagramme des tables, colonnes de `plants`, vocabulaires contrôlés, fonctions d'arrosage | État au 29 juillet |

## Arrosage et météo

| Note | Date | Contenu | État |
|---|---|---|---|
| `proposition-phase-arrosage.md` | 29 juillet | Absence d'arrosage dans le calendrier, règle de dérivation rejetée, trois options | Proposition |
| `plan-arrosage-litres-par-jour.md` | 29 juillet | Calcul du besoin en litres par jour selon FAO 56 : évapotranspiration, coefficients culturaux, modes d'arrosage | Réalisé |
| `bilan-hydrique-du-sol.md` | 1er août | Bilan hydrique du sol selon FAO 56, trois sources de pluie, collecte des postes de Météo-France | Réalisé |
| `vigilance-meteorologique.md` | 1er août | Collecte de la vigilance par data.gouv.fr, aléas et couleurs, affichage au bandeau | Réalisé |
| `feuille-du-temps.md` | 14 août | Feuille météo sur vingt-quatre heures glissantes : conseils, ruban, liste, données horaires | Réalisé |
| `source-meteo-fiabilite.md` | 16 août | Écart de pluie constaté, superposition d'AROME sur la série horaire, seuil de mention unique | Réalisé |
| `feuilles-temps-et-eau.md` | 13 octobre | Quatre grandeurs du ruban repliées, relevés des jours précédents repliés, texture du sol déplacée dans les réglages du jardin, bilan par lieu non engagé | Réalisé |
| `audit-meteo.md` | 16 août | Défauts du code météorologique classés par famille, correctifs et contrôles ajoutés | Réalisé, défauts mineurs listés non corrigés |

## Écrans et navigation

| Note | Date | Contenu | État |
|---|---|---|---|
| `fiche-plante-propositions.md` | 30 juillet | Propositions pour la fiche plante : en-tête, onglets, calendrier en ruban ou en roue, palette | Proposition |
| `navigation-ecran-du-moment.md` | 1er août | Lecture à deux niveaux de l'écran En ce moment, arbitrages retenus | Réalisé |
| `performance-demarrage.md` | 3 août | Mesures du démarrage, causes réseau, traitements appliqués, résultats avant et après | Réalisé |
| `bandeau-du-jour-et-ligne-annee.md` | 4 août | Bandeau du jour, feuilles de l'eau, de la lumière et de la saison, repère du mois, unités d'arrosage | Réalisé, feuille du jour supprimée depuis par `organisation-des-ecrans.md` |
| `ecran-du-moment-feuille-herbier.md` | 4 août | Écran En ce moment traité en page d'herbier : papier, planches, bande de fleurs, dictons | Papier et prairie retirés le 16 octobre par `fond-vivant-et-blocs-de-verre.md` |
| `motif-entete-mensuel.md` | 4 août | Motifs mensuels du bandeau : grammaire graphique, sujets, animations, contrôles | Retiré le 16 octobre par `fond-vivant-et-blocs-de-verre.md` |
| `navigation-trois-destinations.md` | 5 août | Barre basse à trois destinations, feuilles du jardin et du compte | Réalisé, repris par `organisation-des-ecrans.md` |
| `fiche-trois-onglets.md` | 5 août | Fiche plante en trois onglets, onglet d'ouverture, bloc Identité, nom accepté | Réalisé |
| `ecran-mes-plantes-densite.md` | 8 août | Densité de l'écran Mes plantes : mesures avant et après, compteurs par portée | Réalisé, segment de portée retiré depuis par `organisation-des-ecrans.md` |
| `tenue-en-largeur.md` | 10 août | Défauts de feuille de style et correctifs, contrôles de largeur | Réalisé |
| `espaces-et-zones.md` | 12 août | Modèle à deux niveaux espace et zone, écran d'un espace, journal d'observations, rotation des cultures | Réalisé |
| `organisation-des-ecrans.md` | 13 août | Refonte de la navigation en six livraisons : barre basse, en-tête, écrans Jour, Année, Jardin, Mes plantes, Catalogue et Carnet | Réalisé |
| `feuille-de-la-saison.md` | 13 août | Contenu calculé de la feuille de la saison : temps restant, récoltes, protections | Réalisé |
| `bords-de-la-quinzaine.md` | 15 août | Mentions de première et de dernière quinzaine à l'écran du jour, pastilles, contrôles | Réalisé, phrase et niveau des ouvertures retirés depuis par `ecran-jour-redites.md` |
| `annee-a-la-quinzaine.md` | 12 octobre | Audit des écrans avant simplification, écran de l'année ouvert sur la quinzaine résumée par geste, flèches de parcours, bascule vers la frise | Réalisé, autres lots de l'audit ouverts |
| `fond-vivant-et-blocs-de-verre.md` | 16 octobre | Fond animé selon la saison, l'heure et la météo, plus d'en-tête, blocs de verre aux titres intégrés et collants | Réalisé, remplace la prairie, le papier tramé et le motif du mois |
| `jardin-vivant.md` | 17 octobre | Fond « Jardin vivant » dans la veine des estampes : ciel au soleil réel, lune, temps de l'heure, décor de saison ; choix du fond dans les réglages | Réalisé, devenu le fond par défaut, le feuillage reste au choix |
| `zone-dans-mes-plantes.md` | 14 octobre | La rangée de « Mes plantes » nomme la zone après l'espace, entre parenthèses | Réalisé, regroupement par espace ouvert |
| `carnet-corriger-et-filtrer.md` | 14 octobre | Carnet : un seul nom, entrée corrigible dans la feuille de saisie, filtres par espace et par geste, recherche | Réalisé |
| `audit-personas-arbitrages.md` | 14 octobre | Pastilles « démarre » et « se termine », fleurs sous les tâches, année qui garde la quinzaine lue, case « fait » qui écrit au carnet | Réalisé |
| `audit-personas-premiers-correctifs.md` | 13 octobre | Tuile de l'eau qui dit la décision, un verbe par geste, saisie au carnet par la plante, contrastes, libellés, états vides avec leurs gestes, migration des gestes du carnet | Réalisé |
| `audit-personas.md` | 13 octobre | Audit par quatre personas sur quarante-cinq étapes de parcours : vingt constats classés par effort, défaut d'historique corrigé | Points 1 à 13, 16 et 17 traités, 14, 15 et 18 à 20 ouverts |
| `jardin-et-espaces-allege.md` | 13 octobre | Ajout d'un espace replié derrière son lien, tuile des non placées masquée à zéro, un seul niveau dans un espace découpé en zones, correction du comptage de l'audit | Réalisé |
| `fiche-allegee.md` | 13 octobre | Fiche : pastille du type retirée, onglet Au jardin lu en une ligne par emplacement et déplié à la demande, eau gardée aux deux onglets | Réalisé |
| `listes-de-plantes-un-niveau.md` | 13 octobre | Mes plantes et catalogue groupés sur le seul type, catégorie sous le nom, compte dit une fois | Réalisé |
| `ecran-jour-redites.md` | 13 octobre | Écran du jour : phrase des ouvertures et son niveau retirés, eau dite à la seule tuile, mesures avant et après | Réalisé |

## Planches et photographies

| Note | Date | Contenu | État |
|---|---|---|---|
| `illustrations-proposition.md` | 3 août | Illustration par planches botaniques et photographies : ordre des fonds, rendu, chaîne de production, licences | Proposition |
| `planches-libres-de-droit.md` | 3 août | Fonds de planches du domaine public et couverture mesurée des fiches | Recensement |
| `photos-libres-de-droit.md` | 3 août | Fonds de photographies réutilisables et couverture mesurée des fiches | Recensement |
| `photos-wikimedia-62-fiches.md` | 5 août | Sourçage Wikimedia Commons des fiches absentes de Pl@ntNet, critères de classement, licences | Suite dans `controles-photographies.md` |
| `avis-photos-conception.md` | 7 août | Jugement des photographies par les utilisateurs : modèle de données, règles de retrait, interface, sécurité | Réalisé |
| `controles-photographies.md` | 7 août | Contrôles automatiques des photographies : mesures, seuils, audit des tuiles, corrections | Réalisé, reste à faire listé |
| `reserve-photos-rang3.json` | 7 août | Photographies Pl@ntNet de rang 3 : plante, organe, adresse de l'image, auteur, observation source | Sélection du 7 août |
| `notation-des-photographies.md` | 8 août | Notation des photographies : rang, score dérivé des avis, ordre d'affichage, retrait réversible | En place |
| `photos-de-la-fiche.md` | 8 août | Bande de photographies de la fiche : groupes par organe, plein écran, attribution | En place |
| `planches-fabrication.md` | 10 août | Fabrication et intégration des planches : fonds, règles d'appariement, chaîne de production, manifeste | Réalisé |
| `reserve-photographique.md` | 10 août | Passage de trois à douze images par organe, campagnes Pl@ntNet et Wikimedia, sources épuisées | Réalisé |
