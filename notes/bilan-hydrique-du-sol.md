# Bilan hydrique du sol, relevés du jardinier et pluie mesurée

Chantier de la pluie, terminé le 1er août 2026. Dépôt `techthisapp/mon-jardin`, commits `76ccdaf`, `cf2b5c1` et `eb3878d`. Migrations Supabase `releves_eau_et_texture_du_sol`, `stations_meteo_et_pluie_mesuree`, `collecte_pluie_planifiee`.

## Ce qui était en place

Le conseil d'arrosage comparait la pluie tombée et l'évapotranspiration de référence sur sept jours, et annonçait l'écart. Deux défauts. Le sol n'intervenait pas, alors qu'il garde plusieurs semaines de consommation en réserve. Et la pluie venait du modèle Météo-France servi par Open-Meteo, qui est une analyse et non une mesure.

## Modèle retenu

Le sol est un réservoir. L'épuisement du jour vaut celui de la veille, moins la pluie et l'arrosage, plus la consommation des cultures, borné entre zéro et la capacité au champ. C'est le bilan du chapitre 8 du bulletin FAO 56.

La consommation vaut l'évapotranspiration de référence du point du jardin, multipliée par le coefficient cultural moyen des plantes retenues, lu quinzaine par quinzaine dans `plant_kc_quinzaine`.

Trois constantes, toutes sourcées.

La réserve utile vient de la texture du sol : sableux 80, limoneux 155, argileux 165 millimètres par mètre de profondeur. Ce sont les milieux des fourchettes du tableau 19 du bulletin, sable 55 à 105, limon 130 à 180, argile 130 à 200, recoupées par les capacités de rétention publiées par l'université de Californie, de 0,75 à 2,50 pouces par pied selon la texture.

La zone racinaire de référence vaut 40 cm. Le tableau 22 place les légumes de plein champ entre 0,3 et 0,6 mètre : laitue 0,3 à 0,5, carotte 0,5 à 1,0, pomme de terre 0,4 à 0,6.

Le seuil de confort vaut 40 pour cent de la réserve, valeur du tableau 22 pour la tomate, entre la laitue à 0,30 et le concombre à 0,50. Il est ajusté chaque jour à la demande par la formule du bulletin, `p = 0,40 + 0,04 (5 − ETc)`, bornée entre 0,1 et 0,8.

Sur un sol limoneux, cela donne une réserve de 62 mm et un seuil de 24,8 mm d'épuisement.

## Trois sources pour la lame d'eau

Par ordre de confiance décroissante : le relevé du pluviomètre du jardinier, le poste de mesure rattaché au jardin, la sortie du modèle.

Table `releves_eau`, une ligne par jardin et par jour, portant `pluie_mm` et `arrosage_mm`. La saisie couvre les trois derniers jours depuis la feuille de l'eau, avec l'estimation du modèle rappelée sous chaque jour.

Tables `stations_meteo` et `pluie_station`, en lecture ouverte comme le catalogue des plantes. Elles sont alimentées par la fonction Edge `pluie-stations`, appelée à 6 h 40 UTC par la tâche `cron` nommée `collecte-pluie`. Un déclencheur sur `gardens` rattache le jardin au poste le plus proche à moins de quarante kilomètres, à la création comme au changement de commune.

## La clé Météo-France s'est révélée inutile

Le portail `portail-api.meteofrance.fr` demande la création d'un compte. Le même contenu est publié en fichiers ouverts sur data.gouv.fr, jeu « Données climatologiques de base, quotidiennes », identifiant `6569b51ae64326786e4e8e1a`. Un fichier par département, deux ans d'antériorité, environ 230 ko compressés, déposé chaque matin vers 6 h, sans compte ni clé.

La fonction résout l'adresse du fichier par l'interface de data.gouv plutôt que de la coder en dur : le nom porte la période courante, `Q_21_latest-2025-2026_RR-T-Vent.csv.gz`, et change d'année en année.

Le poste publie avec deux jours de retard. Le modèle couvre donc toujours les journées les plus récentes, et la feuille de l'eau le dit.

## Ce que la mesure change

Contrôlé sur le jardin de Fain-lès-Moutiers et le poste de Montbard, à 10,1 km. Sur juillet 2026, le total est presque identique, 38,6 mm mesurés contre 37,3 mm modélisés. Le jour ne l'est pas : le poste a mesuré 9,2 mm le 13 juillet, dont le modèle ne voit rien, et le modèle place 4,7 mm le 16 juillet, où le poste n'a rien mesuré. Pour un réservoir, la date d'un remplissage compte autant que son volume.

Un contrôle antérieur, mené sur Nantes-Ville, montrait un écart bien plus large : 1,4 mm mesurés contre 5,3 mm modélisés sur le même mois.

## Décisions prises en cours de route

La dose recommandée est plafonnée à la fraction facilement utilisable. Sur un sol vidé par un mois sec, l'épuisement atteint 62 mm, mais apporter 62 mm en une fois envoie l'eau sous les racines.

Aucun arrosage n'est supposé. Le calcul ne connaît que ce qui est enregistré, il surestime donc le déficit chez qui arrose sans le noter. La feuille l'énonce plutôt que de simuler une conduite d'arrosage, qui aurait fait taire le conseil un jour d'oubli.

Les valeurs de code qualité supérieur à 1 sont écartées, le poste marquant ainsi ses valeurs douteuses ou filtrées.

La fenêtre météo passe de sept à trente jours. L'état initial du réservoir est posé à la moitié de la capacité, et le contrôle vérifie qu'après trente jours le résultat est identique quel que soit ce point de départ.

Le litrage par plante de la fiche reste calé sur la normale de saison. Il sert de référence stable pour choisir une plante, là où le bilan répond à la question du jour.

## Contrôles

Treize contrôles d'arithmétique sur des cas construits : réserve utile par texture, seuil ajusté et ses bornes, trente jours secs, trente jours pluvieux, plafonnement de l'épuisement à la capacité, effet d'un arrosage saisi, priorité du relevé sur le modèle, effacement de l'état initial après trente jours.

Essais en navigateur : saisie d'un relevé, effacement, changement de texture, rattachement du poste, distinction des trois provenances dans le graphique, deux scénarios climatiques.

Collecte exécutée sur la Côte-d'Or : 25 postes, 2 856 jours de pluie, dernier jour disponible le 30 juillet.

## Reste ouvert

La vigilance météorologique de Météo-France n'est pas affichée, alors qu'elle l'est dans leur application. Flux séparé, à brancher si le besoin se confirme.
