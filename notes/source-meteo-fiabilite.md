# Source météorologique et fiabilité de la pluie

En production, commits eeae879, 20407ae et cbf9d6e.

## Le constat

Le 15 août 2026 à 23 h 37, sous vigilance orange, l'application ne portait
aucune pluie à vingt-trois heures : lame vide, risque sous cinq pour cent,
sous-titre « 26° et couvert ». Au même moment et sur la même commune, Météo
France annonçait de la pluie dans l'heure, et Pleinchamp donnait deux virgule
cinq millimètres à minuit puis trois virgule six à une heure.

Les valeurs de Pleinchamp sont horaires, du même type que celles de
l'application. L'écart ne vient donc pas de la différence entre un nowcast radar
et une prévision numérique : celle-là explique le produit « Précipitations dans
l'heure » de Météo France, qui extrapole l'écho radar par pas de cinq minutes et
qu'aucune sortie horaire ne peut reproduire, mais elle n'explique pas deux
millimètres et demi annoncés pour l'heure pleine suivante.

## La cause

La charge horaire ne forçait aucun modèle. Open-Meteo dit retenir « le modèle
applicable de plus haute résolution » pour chaque point, sans garantir AROME sur
la France ; un ticket de son dépôt signale ICON-D2, le modèle allemand, retenu
pour Paris de préférence à AROME France HD.

Les mailles en présence : AROME France HD, 1,5 km, deux jours d'échéance ;
ARPEGE Europe, 11 km ; ICON-D2, 2,2 km sur l'Europe centrale. Une situation
d'averses convectives d'août est exactement le cas où une maille large place la
cellule à côté et où la maille fine la place dessus. Météo France travaille sur
AROME.

Cette cause n'a pas pu être vérifiée par mesure directe : le fichier robots
d'Open-Meteo interdit son chemin `/v1/forecast`, et l'atelier s'y tient plutôt
que de le contourner. Le correctif retenu est donc conçu pour être juste sous
les deux hypothèses : si la sélection automatique prenait déjà AROME, la
superposition ne change rien ; sinon, elle apporte le modèle français.

## Le correctif

### AROME posé sur la série

Un troisième appel demande explicitement `meteofrance_arome_france_hd` sur la
même fenêtre de deux jours que la charge horaire, et sa série est posée
par-dessus celle de la sélection automatique.

Posée, non substituée. Toutes les grandeurs ne sont pas connues d'AROME :
l'indice UV est une grandeur dérivée et peut revenir vide, et une colonne vide
aurait laissé une voie muette dans le ruban sans que rien ne le signale. La
fusion se fait donc en deux temps : une colonne entièrement vide est ignorée et
la série de secours reste seule ; dans une colonne renseignée, une heure vide se
replie à son tour sur la valeur de secours. AROME absent, en panne ou muet,
l'application rend exactement ce qu'elle rendait avant.

L'appel quotidien à sept jours garde la sélection automatique : AROME s'arrête à
deux jours et rendrait des valeurs vides ensuite.

Le cache tombe aussi au changement d'heure, et non plus seulement au bout d'une
heure glissante. Une charge prise à 23 h 55 tenait jusqu'à 0 h 55, et un run
arrivé entre-temps ne se voyait pas. Son nom passe de `v4` à `v5` : une charge
enregistrée par la version précédente n'a pas la superposition et l'aurait
retardée d'une heure.

### Un seul seuil de mention

Le ruban se taisait sur la pluie sous vingt pour cent de risque quand la table
la mentionnait dès cinq. Une journée à quinze pour cent n'avait donc pas de voie
de pluie du tout, et le lecteur ne pouvait pas distinguer « rien n'est attendu »
de « l'application ne le montre pas ». Le seuil passe à cinq pour cent partout.
Au-dessous, rien n'est dit nulle part ; au-dessus, la voie paraît.

Les seuils par cellule sont conservés : une lame sous un dixième de millimètre
et un risque sous cinq pour cent restent du bruit, et la ligne de titre porte de
toute façon le chiffre de la journée.

### L'incertitude dite quand les modèles divergent

La série de secours est gardée entière à côté de la série fondue. Quand un
modèle annonce au moins un millimètre sur les vingt-quatre heures et que l'autre
en donne moins de deux dixièmes, la première ligne du bloc de conseils le dit et
nomme les deux sources.

Le seuil est décidé par ce qui change une décision au jardin : un millimètre
d'un côté et rien de l'autre font arroser ou non, un écart de quelques dixièmes
ne fait ni l'un ni l'autre et ferait paraître la mention presque tous les soirs
d'été.

Cette ligne remplace la ligne de pluie ordinaire plutôt que de s'y ajouter :
deux lignes de pluie, l'une affirmative et l'autre dubitative, se
contrediraient à la lecture.

## La suite du correctif : la semaine contre les heures

Poser AROME sur les heures a créé un défaut nouveau, que le lendemain matin a
révélé. La table de la semaine lisait la charge quotidienne, qui vient de la
sélection automatique ; les heures venaient désormais d'AROME. Le même dimanche
portait vingt-neuf degrés dans la table et trente-deux à quinze heures dans la
liste, « orage » dans l'une et « couvert » dans l'autre, trois millimètres et
six dixièmes d'un côté et rien du tout de l'autre.

Deux sources pour un seul jour font trois contradictions dans une seule feuille.
La leçon vaut au-delà de ce cas : changer la source d'une écriture oblige à
regarder toutes celles qui parlent du même objet.

La série horaire part de zéro heure du jour en cours et couvre deux jours. La
table résume donc aujourd'hui et demain de ces heures-là, température maximale,
minimale, code du ciel et lame comprises. Les jours suivants gardent la charge
quotidienne, seule à porter la semaine entière. Une journée dont la série
horaire ne porte pas les vingt-quatre heures, ou dont une température manque, ne
se résume pas et rend la main.

Reste un écart qui n'est pas une affaire de modèle : la table donne la journée
civile quand les heures partent de maintenant. À sept heures du matin, trois
millimètres tombés à trois heures appartiennent à la journée et non à la fenêtre
horaire, et manquaient à l'appel sans que rien ne le dise. La journée en cours
porte donc, sous sa lame, ce qui en est déjà tombé.

## Contrôles

Quinze contrôles dans `outils/essais/temps.mjs`. La doublure sert trois appels
et reconnaît celui d'AROME à son paramètre de modèle. Par défaut elle lui fait
redire la même série, ce qui laisse toutes les autres suites inchangées.

Un jeu règle AROME sur une pluie constante, un indice UV entièrement vide et une
température vide heure par heure : les trois cas de la fusion sont ainsi
éprouvés ensemble. Un autre jeu fait répondre AROME sans série, ce qui éprouve
le repli complet sans poser d'erreur de réseau dans la console. Deux jeux
éprouvent la divergence par ses deux côtés.

Un dernier jeu oppose une charge quotidienne à neuf degrés et neuf virgule neuf
millimètres à une série horaire qui dit tout autre chose : les deux premières
lignes de la table doivent suivre les heures, la troisième la charge
quotidienne, et la journée en cours doit dire ce qui est déjà tombé. Le
recoupement qui vaut est le dernier : le maximum de la table doit être celui des
heures du jour. Sans lui, deux sources cohérentes entre elles mais fausses
passeraient.

## Arbitrages écartés, et pourquoi

**Le pas de quinze minutes.** Open-Meteo expose `minutely_15`, et la France est
couverte. Mais les variantes à quinze minutes d'AROME portent un identifiant de
modèle distinct de celui demandé ici, et la documentation précise que hors des
régions couvertes les valeurs sont interpolées depuis l'heure. Impossible de
vérifier laquelle des deux serait servie, le chemin de l'API étant fermé aux
robots. Une série interpolée aurait l'apparence d'un nowcast sans en être un,
c'est-à-dire exactement le défaut que ce travail corrige. À reprendre le jour où
la réponse réelle peut être observée.

**Le nowcast radar de Météo France.** Il demande une clé, donc une fonction de
bord Supabase pour la porter, l'application étant statique. Coût élevé, et
l'apport marginal est le plus faible des quatre pour une décision de jardin :
savoir s'il pleuvra dans vingt minutes se lit par la fenêtre, et le jardinier a
déjà l'application de Météo France sur son téléphone.

**Forcer AROME sur la charge quotidienne.** Il s'arrêterait à deux jours et
laisserait cinq lignes vides dans la table de la semaine. Le résumé des heures,
qui ne porte que sur les jours réellement couverts, atteint le même but sans
perdre la semaine.
