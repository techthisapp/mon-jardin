# Vigilance météorologique

Appliqué le 1er août 2026. Dépôt `techthisapp/mon-jardin`, commit `79b4d58`. Migrations Supabase `vigilance_meteorologique` et `collecte_vigilance_planifiee`. Fonction Edge `vigilance`.

## Source, sans compte ni clé

Le portail API de Météo-France propose une API Vigilance qui demande un compte. Le même contenu est publié dans le jeu « Vigilance météorologique archivée » sur data.gouv.fr, identifiant `69cb8c3efb376113fa42881a`.

Le jeu expose un seau objet compatible S3, `https://object.files.data.gouv.fr/meteofrance`, dont l'arborescence est `data/vigilance/metropole/AAAA/MM/JJ/HHMMSS/`. Plusieurs dépôts par jour, davantage en épisode actif. Le 1er août : 04 h 00, 04 h 05, 06 h 37, 08 h 03, 10 h 00, 14 h 00.

Le listage du préfixe du jour coûte moins d'un kilo-octet, la fonction prend donc le dernier répertoire disponible, en remontant jusqu'à trois jours en arrière si le jour courant est vide, puis lit deux fichiers.

`CDP_CARTE_EXTERNE.json`, environ 200 ko, porte la couleur maximale de chaque département et le détail par aléa, pour aujourd'hui et pour demain. `CDP_TEXTES_VIGILANCE.json`, environ 130 ko, porte le bulletin de suivi départemental.

## Vocabulaire

Identifiants d'aléa, du descriptif technique de Météo-France : 1 vent, 2 pluie et inondation, 3 orages, 4 crues, 5 neige et verglas, 6 canicule, 7 grand froid, 8 avalanches, 9 vagues et submersion.

Couleurs : 1 vert, 2 jaune, 3 orange, 4 rouge. Le vert n'est pas une alerte et ne s'affiche pas.

Les domaines de la carte mêlent départements et zones de défense. Seuls les codes à deux caractères désignent un département métropolitain, les autres sont écartés.

## Ce qui est affiché

Le bandeau porte le niveau le plus élevé des deux échéances. Une vigilance orange annoncée pour demain compte autant qu'une vigilance en cours, et le libellé le précise par « demain ».

Chaque aléa porte sa conséquence au jardin, table `VIGI_GESTE` : tuteurer et rentrer les potées pour le vent, arroser tôt et ombrer pour la canicule, rentrer ce qui peut voler pour les orages, protéger les souches pour le grand froid, et ainsi de suite.

Le détail s'ouvre en feuille : les deux échéances avec leur couleur et leurs aléas, le geste, le bulletin du département et l'heure d'émission.

Les alertes calculées ne répètent pas la vigilance. Table `VIGI_COUVRE` : une vigilance canicule couvre l'alerte de chaleur, une vigilance grand froid couvre l'alerte de froid, une vigilance vent couvre l'alerte de vent, une vigilance pluie couvre l'alerte de pluie. Sans cette règle, le bandeau affichait « Vigilance jaune, canicule, arroser tôt et ombrer » suivi immédiatement de « 33 °C demain, arroser tôt et ombrer les jeunes plants ».

## Contrôles

Collecte exécutée : 192 lignes, 96 départements sur deux échéances, 89 au-dessus du vert.

Trois cas rendus en navigateur : vigilance jaune en cours, vigilance orange annoncée pour demain avec deux aléas, et vigilance verte, où aucun bandeau ne s'affiche.

Comparé à l'application de Météo-France sur le département 21 le 1er août : vigilance jaune canicule des deux côtés, avec le même bulletin, « Épisode caniculaire sur le sud et l'est de la région Bourgogne-Franche-Comté ».
