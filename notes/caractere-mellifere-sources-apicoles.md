# Ressources pour les pollinisateurs, nectar et pollen

Travaux des 28 et 30 juillet 2026, complément à `claude/enrichissement-baseflor-referentiel.md`.

## Modélisation en deux colonnes

Les sources notent le nectar et le pollen séparément, et ces deux ressources divergent fortement sur certaines espèces. Une seule colonne produisait des résultats faux : marquer le Coquelicot comme non mellifère aurait laissé croire qu'il est sans intérêt pour les pollinisateurs, alors qu'il est une source de pollen majeure.

La colonne `pollen` porte son propre domaine de vocabulaire, nul, faible, moyen et fort, libellés en pollinifère, avec clé étrangère vers `vocabulaires`. La colonne `nectar` conserve le sens strict de production de nectar, et une clé `nul` libellée Non mellifère y distingue le renseigné négatif du non renseigné.

## Sources retenues

Table des plantes d'intérêt apicole du Centre technique horticole de Gembloux, Clément Van Daele, 2011. Deux cent vingt-trois lignes, cent soixante-quinze binômes distincts extraits, notation séparée du pollen et du nectar sur une échelle de zéro à cinq. Source principale.

Catalogue Trachtpflanzen de Bienenroute. Cent cinquante-quatre espèces relevées, notation séparée du nectar et du pollen sur une échelle de zéro à quatre. Source complémentaire, orientée jardin d'ornement et potager, donc plus proche du référentiel que les listes apicoles classiques. La pagination du site plafonne au-delà de la sixième page, les pages suivantes renvoyant un contenu déjà servi.

Traité Rustica de l'apiculture, via la liste des plantes mellifères d'Europe de Wikipédia en français, contenu sous licence CC BY-SA. Environ cent trente-deux espèces notées sur une échelle de zéro à trois.

## Sources écartées et motif

Tew et al. 2023, jeu Dryad doi:10.5061/dryad.0rxwdbs4x, sucre nectarifère par fleur. Corrélation de rang avec le référentiel 0,107, concordance exacte 34 pour cent. Écartée.

AgriLand, Baude et al., volume de pollen par fleur. Corrélation de rang 0,168, concordance exacte 44 pour cent. Écartée.

Ces deux jeux mesurent une quantité par fleur, alors que la note du référentiel intègre le nombre de fleurs et la durée de floraison. Le Noisetier et le Châtaignier, derniers du classement AgriLand et pourtant notés forts à juste titre, illustrent l'écart. Les deux mesures restent chargées dans `nectar_ug_fleur` sur soixante-quatorze fiches et `pollen_um3_fleur` sur trente-six, comme donnée quantitative distincte de la note.

Bienenweiden de Hortipendium, deux cent vingt-six taxons exploitables, notation en quatre symboles. Corrélation de rang 0,370 en nectar et 0,441 en pollen. Écartée pour l'écriture. La colonne pollen y mesure le rendement pour la colonie d'abeilles domestiques et non l'offre de la plante : elle place la Courgette, la Digitale et la Pâquerette au niveau nul, ce qui est contredit sans discussion possible. Conservée comme avis d'arbitrage sur les fiches contestées.

## Méthode de validation

Toute règle de conversion est écrite avant d'être appliquée, puis mesurée sur les valeurs déjà sourcées du référentiel, valeurs qui n'ont pas servi à l'établir. Le jeu de contrôle est ensuite partagé en deux moitiés par ordre alphabétique : la conversion est choisie sur une moitié et mesurée sur l'autre, puis les rôles sont inversés. Une conversion n'est retenue que si le même choix ressort des deux moitiés.

| Source | Champ | Corrélation de rang | Concordance exacte | À une classe près |
|---|---|---|---|---|
| Gembloux | nectar | 0,953 | 95 % | 100 % |
| Gembloux | pollen | 0,964 | 100 % | 100 % |
| Bienenroute recalibré | nectar | 0,614 | 62 % | 96 % |
| Bienenroute recalibré | pollen | 0,496 | 45 % | 94 % |
| Hortipendium | nectar | 0,370 | 57 % | 93 % |
| Hortipendium | pollen | 0,441 | 50 % | 84 % |

Le niveau atteint par Gembloux ne relève pas de la concordance entre deux avis indépendants. Il établit que la convention du référentiel sur ces deux colonnes est celle de Gembloux, avec la correspondance ci-dessous. Les mentions de sources horticoles générales portées par `plants.source` sont celles de la fiche entière, pas la provenance de ces deux champs.

## Conversion des échelles

Échelle de Gembloux, de zéro à cinq : zéro donne nul, un et deux donnent faible, trois donne moyen, quatre et cinq donnent fort.

Échelle de Bienenroute, de zéro à quatre : zéro donne nul, un donne faible, deux et trois donnent moyen, quatre donne fort. La conversion initiale envoyait la note trois vers fort. Mesurée sur les cinquante et une espèces communes aux deux catalogues, elle portait un biais de plus 0,43 classe. La correction de la note trois ramène le biais à plus 0,08 en nectar et plus 0,06 en pollen, et améliore la concordance sur les deux champs.

Échelle de Rustica, de zéro à trois : correspondance directe.

## Incident d'extraction et contrôle mis en place

La table de Gembloux imprime ses colonnes dans l'ordre Pollinifère puis Nectarifère. Une réextraction du 30 juillet les a lues dans l'ordre inverse. L'erreur ne se voyait pas au regard du référentiel : elle produisait une absence de correspondance, interprétée à tort comme une incompatibilité entre la table et la base.

Elle a été détectée en comparant les deux catalogues entre eux et non à la base. Deux tables apicoles ne peuvent pas être décorrélées : la mesure donnait 0,018 en nectar et moins 0,103 en pollen. Après remise des colonnes dans l'ordre, 0,489 et 0,440.

Contrôle désormais appliqué avant tout usage d'une table nouvelle ou réextraite, sur cinq espèces dont le comportement n'est pas discutable : Saule marsault, nectar et pollen abondants ; Noisetier et Coquelicot, sans nectar et riches en pollen ; Thym et Lavande, riches en nectar et pauvres en pollen. Une table qui échoue sur ces cinq lignes n'est pas exploitée.

L'extraction du 28 juillet, elle, respectait l'ordre des colonnes : les onze valeurs citées dans les arbitrages de cette date se retrouvent à l'identique dans le fichier corrigé. Les écritures antérieures ne sont pas affectées.

Cet incident a produit une conclusion fausse aujourd'hui écartée. Le référentiel paraissait noter les légumes récoltés avant floraison deux classes en dessous des catalogues, ce qui suggérait une notation de la plante telle qu'elle est cultivée. L'écart venait de la conversion non calibrée de Bienenroute. Après recalibrage, plus aucune valeur sourcée du référentiel n'est contredite de deux classes ou plus.

## Résultat

Cinquante-deux valeurs écrites le 30 juillet sur trente-quatre fiches, cinquante et une depuis Bienenroute et une depuis Gembloux.

Colonne `nectar` : 146 fiches sourcées sur 315 actives.
Colonne `pollen` : 86 fiches sourcées sur 315 actives.

Le recouvrement reste partiel parce que ces listes sont orientées apiculture, donc arbres, arbustes et grandes cultures, alors que le référentiel est majoritairement potager et ornemental. Les trois tables sont désormais épuisées : aucune fiche encore estimée ne correspond à une de leurs lignes.

### Correction de décompte

Une version antérieure de ce document annonçait 125 fiches sourcées en nectar et 54 en pollen. Ces deux nombres étaient faux. Le décompte s'appuyait sur un motif de recherche large appliqué à `plants.source`, qui traversait les séparateurs de segments et comptait comme estimée toute fiche dont la chaîne contenait le mot recherché à n'importe quel endroit, y compris dans un segment de source nommée. Le prédicat de comptage borne désormais la recherche à l'intérieur du seul segment d'estimation, en extrayant ce segment puis en cherchant le champ délimité par ses virgules :

    ', ' || trim(coalesce((regexp_match(source,
      'estimation horticole non vérifiée : ([^|]*)'))[1],'')) || ', ' like '%, nectar, %'

Aucune valeur écrite n'était affectée, seul le décompte l'était.

## Arbitrages des divergences avec les valeurs préexistantes

Corrections retenues le 28 juillet, en faveur des sources.

| Plante | Nom latin | Avant | Après | Motif |
|---|---|---|---|---|
| Coquelicot | Papaver rhoeas | moyen | nul | Ne produit pas de nectar, pollen noté fort |
| Noisetier | Corylus avellana | moyen | nul | Anémogame, sans nectar, pollen noté fort |
| Sureau noir | Sambucus nigra | fort | nul | Visité pour le pollen, production nectarifère nulle |
| Lierre | Hedera helix | moyen | fort | Ressource nectarifère tardive majeure, notée 4 sur 5 |
| Pyracantha | Pyracantha coccinea | moyen | fort | Noté 4 sur 5 en nectar et 5 sur 5 en pollen |

Valeurs conservées le 28 juillet.

| Plante | Nom latin | En base | Source | Motif de conservation |
|---|---|---|---|---|
| Althéa | Hibiscus syriacus | moyen | faible | Un cran d'écart, source unique |
| Bleuet | Centaurea cyanus | fort | moyen | Un cran d'écart, plante mellifère classique |
| Hysope | Hyssopus officinalis | fort | moyen | Un cran d'écart, réputation apicole solide |
| Buddleia | Buddleja davidii | fort | faible | Les notes de Gembloux mesurent le rendement pour l'abeille domestique, or les fleurs à long tube du Buddleia sont surtout exploitées par les papillons et les insectes à longue langue |

Candidates à correction relevées le 30 juillet puis abandonnées, la valeur du référentiel étant confirmée après recalibrage et lecture correcte des colonnes : le Pommier et le Pêcher en nectar, le Noyer et la Lavande en pollen, l'Achillée en nectar, le Buis, le Noisetier et le Pyracantha en pollen.

## Points ouverts

169 fiches conservent une valeur de nectar estimée, 229 une valeur de pollen estimée. Aucune des trois tables retenues ne les couvre. Une extension suppose une source d'un autre type, orientée jardin plutôt qu'apiculture, et soumise au même protocole de validation.

Vingt-quatre binômes de la table de Gembloux n'ont pas pu être relus de façon fiable, la restitution du document renvoyant des valeurs instables sur ces lignes. Un seul concernait une fiche encore estimée, la Glycine, dont la valeur a été confirmée par deux lectures concordantes avant écriture.

## Reprise ultérieure

Le document de Gembloux se lit par le miroir Yumpu, la version PDF d'origine renvoyant une boucle de redirection. Demander une restitution exhaustive sans résumé, et vérifier l'ordre des colonnes imprimé en tête de tableau avant tout usage.

La liste Wikipédia s'obtient par l'API MediaWiki, action `parse`, propriété `wikitext`, sur la page `Liste de plantes mellifères en Europe`, les notes étant encodées dans le modèle `Étoiles` sous la forme valeur sur trois.

Le catalogue de Bienenroute se parcourt par une table paginée par trente espèces, l'adresse acceptant un paramètre de page, avec le plafonnement signalé plus haut.

Le rapprochement avec le référentiel se fait sur le binôme latin réduit aux deux premiers termes, sur `latin`, `gbif_accepted_name` et `powo_accepted_name` successivement, ce qui rattache les variétés et sous-espèces à l'espèce notée. Les écritures sur `nectar` et `pollen` sont journalisées dans `historique` avec motif.

La fonction `sans_estimation(source, champ)` retire un champ de la liste des estimations portée par `plants.source` et supprime le segment lorsque la liste devient vide.
