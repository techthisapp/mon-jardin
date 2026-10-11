# Fiabilisation du référentiel des plantes, confrontation multi-référentiels

## Périmètre
Table `plants`, 320 lignes, dont 316 avec un nom latin et 315 fiches actives avec latin. Les 4 lignes sans latin (Livèche, Mélisse, Raisin de table, Souci) sont des doublons désactivés (`is_active=false`) rattachés par `replaced_by` à leur fiche complète (Livèche officinale, Mélisse citronnelle, Vigne de table, Souci officinal), l'absence de latin est volontaire.

Sources de vérité confrontées : GBIF (backbone), POWO de Kew via son jeu de données World Checklist of Vascular Plants (WCVP), et Tela Botanica (base BDTFX, référence de la flore de France). PictureThis a servi de contrôle d'usage courant sur le cas de l'estragon.

## Méthode d'accès aux référentiels
GBIF backbone : endpoint `species/match`, en `curl` (WebFetch met en cache par chemin d'URL et ne convient pas aux requêtes multiples).
POWO/WCVP : le site powo.science.kew.org et World Flora Online sont bloqués en accès direct (Cloudflare, robots). Le verdict de Kew s'obtient par GBIF `species/search?q=NOM&datasetKey=f382f0ce-323a-4091-bb9f-add557f3a9a2` (jeu WCVP), en filtrant les résultats dont le `canonicalName` normalisé égale le nom cherché, puis en résolvant `acceptedKey` pour le nom accepté. Attention : le `canonicalName` de GBIF supprime les marqueurs de rang (var., subsp., f.), il faut donc les retirer des deux côtés avant comparaison.
Tela Botanica BDTFX : `api.tela-botanica.org/service:eflore:0.1/bdtfx/noms?masque=NOM&recherche=stricte`. Le masque générique fonctionne, la variante `masque.nom_sci` est ignorée par le service. Le champ `retenu` indique si le nom est retenu dans la flore de France.

Le script de confrontation et ses résultats sont reproductibles ; homonymes et espèces noyées sous leurs synonymes infraspécifiques demandent un contrôle manuel (voir Reprise ultérieure).

## Colonnes de la table plants
Colonnes GBIF : `gbif_usage_key`, `gbif_status` (ACCEPTED, SYNONYM, DOUBTFUL), `gbif_match_type` (EXACT, FUZZY, HIGHERRANK), `gbif_accepted_name`, `gbif_checked_at`.
Colonnes POWO (ajoutées le 28 juillet 2026) : `powo_status`, `powo_accepted_name`, `powo_wcvp_key`, `powo_note`, `powo_checked_at`.
Colonnes Tela Botanica : `tela_num_nom` (identifiant BDTFX, nul si absent de la flore de France), `tela_retenu` (vrai si nom retenu), `tela_accepted_name`, `tela_checked_at`.
Ces colonnes sont traitées en métadonnée technique et n'alimentent pas le journal `historique`. Pendant le remplissage, les déclencheurs `tracer` et `plants_touch` sont suspendus, puis réactivés. Intégrité du remplissage vérifiée par empreinte md5 croisée entre la base et le fichier local (identiques).

## Résultat d'ensemble
Sur les 315 fiches actives avec latin : 263 acceptées à la fois par GBIF et POWO, 37 synonymes pour les deux, 15 en divergence de statut entre GBIF et POWO. Côté Tela Botanica : 265 noms retenus dans la flore de France, 18 non retenus, 32 absents (essentiellement des exotiques et cultivars hors flore de France).

Lecture d'ensemble : les référentiels mondiaux (GBIF et POWO) fusionnent volontiers les taxons horticoles et cultivés dans l'espèce sauvage, tandis que Tela Botanica et l'usage horticole conservent les noms familiers. Le référentiel de l'appli est volontairement aligné sur l'usage français et horticole, avec les noms acceptés mondiaux stockés en parallèle.

## Décisions appliquées
Estragon de Russie : correction du latin, `Artemisia dracunculoides` remplacé par `Artemisia dracunculus`. Aucune source ne retient dracunculoides (synonyme chez GBIF et POWO, non retenu chez Tela Botanica, PictureThis donne Artemisia dracunculus). Le libellé français Estragon de Russie est conservé, la distinction horticole avec l'Estragon reste visible. Colonnes de référence alignées sur le nom accepté. Changement journalisé dans `historique` avec motif (entrée 49).

Politique de nommage confirmée : le champ `latin` suit l'usage français et horticole quand Tela Botanica retient le nom, le nom accepté mondial est stocké dans `gbif_accepted_name` et `powo_accepted_name`. Les variétés et sous-espèces potagères gardent leur nom précis, la base restant volontairement plus fine que l'espèce sauvage.

Reclassements de genre récents : nomenclature classique conservée dans `latin` et `genus`, nom accepté conservé en parallèle (Pisum en Lathyrus, Potentilla en Dasiphora, Anemone en Eriocapitella, Lens en Vicia, Scorzonera en Pseudopodospermum, Cleome en Tarenaya ou Cleome houtteana selon la source, Pennisetum en Cenchrus).

## Divergences GBIF et POWO à connaître (15 fiches)
Deux cas où POWO réhabilite le nom de base contre GBIF, à considérer comme résolus en faveur du nom conservé :
1/ Abélia (Abelia x grandiflora) : GBIF le donne synonyme d'Abelia chinensis, POWO l'accepte, Tela le retient.
2/ Néflier du Japon (Eriobotrya japonica) : GBIF le donne synonyme de Rhaphiolepis bibas, POWO l'accepte, Tela le retient.

Un cas de doute levé :
3/ Dahlia et Dahlia cactus (Dahlia x hortensis) : douteux chez GBIF, accepté chez POWO.

Onze cas où POWO fusionne plus que GBIF (reclassements récents adoptés par Kew, pas encore par le backbone GBIF). Noms de base conservés, souvent retenus par Tela Botanica :
Bégonia des jardins (Begonia semperflorens, POWO vers Begonia cucullata) ; Endive chicorée witloof (Cichorium intybus var. foliosum, POWO vers l'espèce) ; Fenouil bulbe (Foeniculum vulgare var. azoricum, POWO vers l'espèce) ; Glaïeul (Gladiolus x hortulanus, douteux chez POWO) ; Hibiscus des marais (Hibiscus moscheutos, POWO vers Muenchhusia moscheutos) ; Hysope (Hyssopus officinalis, POWO vers Dracocephalum officinale) ; Mâche (Valerianella locusta, POWO vers Valeriana locusta) ; Mahonia (Mahonia aquifolium, POWO vers Berberis aquifolium, Tela également) ; Radis (Raphanus sativus, POWO vers Raphanus raphanistrum subsp. sativus) ; Rutabaga (Brassica napus subsp. rapifera, POWO vers l'espèce) ; Valériane rouge (Centranthus ruber, POWO vers Valeriana rubra).

## Cas particuliers conservés
Synonymes d'espèce laissés en nom de base, nom accepté stocké en parallèle : Amandier (Prunus dulcis, accepté Prunus amygdalus chez GBIF et POWO, mais Prunus dulcis retenu par Tela) ; Azalée japonaise (Rhododendron obtusum, groupe horticole hybride, accepté Rhododendron indicum, absent de Tela) ; Bergénia (Bergenia cordifolia, accepté Bergenia crassifolia, retenu par Tela) ; Œillet d'Inde (Tagetes patula, accepté Tagetes erecta, retenu par Tela, distinction horticole avec la Rose d'Inde Tagetes erecta) ; Mûrier platane (Morus kagayamae, cible différente selon la source, Morus indica chez GBIF et Morus acidosa chez POWO, retenu par Tela).

Résolution GBIF à ne pas suivre au pied de la lettre : Chou-fleur et Romanesco (Brassica oleracea var. botrytis) rattachés à Brassica cretica. Ce n'est pas une erreur GBIF, POWO fait le même rattachement, mais la variété cultivée est conservée par choix.

Homonymes tranchés manuellement lors de la confrontation POWO : Prunus dulcis vers Prunus amygdalus, Rhododendron obtusum vers Rhododendron indicum, Pennisetum alopecuroides vers Cenchrus alopecuroides, Begonia semperflorens vers Begonia cucullata. Pyrus communis rétabli en accepté (l'espèce était noyée sous ses synonymes infraspécifiques dans la recherche).

## Reprise ultérieure
Les colonnes `gbif_*`, `powo_*` et `tela_*` portent l'état des dernières confrontations, datées par les champs `*_checked_at` (28 juillet 2026). Pour rejouer une confrontation, interroger GBIF `species/match` et `species/search` (jeu WCVP) et Tela Botanica BDTFX en `curl`, retirer les marqueurs de rang avant comparaison des noms canoniques, résoudre les homonymes et les espèces noyées sous synonymes à la main. Suspendre `tracer` et `plants_touch` pour un remplissage de métadonnée, les réactiver ensuite, et vérifier l'intégrité par empreinte md5 croisée. Toute correction de nom (champ `latin`) se fait déclencheurs actifs, avec la variable de session `app.motif` renseignée pour le journal.
