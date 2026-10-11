# Audit du périmètre météorologique

Application « Mon jardin », 16 août 2026. Commits 51b4662 et 87a5486.

Quatre lectures indépendantes de l'intégralité du code météorologique, sur
quatre angles disjoints : les sources et les fenêtres de temps, les seuils et
les unités, les phrases rendues, le bilan hydrique. Chaque constat a ensuite été
vérifié dans le code. Vingt-trois défauts retenus, tous corrigés sauf sept
mineurs listés en fin de note.

## La règle qui sort de cet audit

Un même fait ne doit avoir qu'une source et qu'un seuil dans toute
l'application. La quasi-totalité des défauts trouvés sont des variations de
cette seule faute : deux fonctions calculent la même chose depuis deux endroits,
et l'écart devient visible à l'écran.

Corollaire de méthode : changer la source d'une écriture oblige à regarder
toutes celles qui parlent du même objet. La superposition d'AROME du 15 août au
soir a créé trois contradictions le lendemain matin, puis quatre autres que
l'audit a trouvées, faute d'avoir suivi cette règle du premier coup.

## Défauts de données, corrigés

**La date du jour se lisait en temps universel.** `iJour` composait sa clé avec
`toISOString`, `iHeure` en heure locale, alors que la charge est demandée en
`Europe/Paris`. Entre minuit et deux heures l'été, les deux séries ne
désignaient pas le même jour. Le bandeau donnait les extrêmes de la veille, la
table intitulait « aujourd'hui » la journée écoulée, le bilan s'arrêtait à hier.
Le plus grave n'était pas un affichage : la feuille de l'eau construit ses
lignes de saisie avec cette date, et cette date part en base. Un relevé de
pluviomètre saisi à minuit et demi s'enregistrait sur la veille. Une seule
fonction compose désormais la clé.

**Un trou dans la charge valait zéro.** Zéro est légitime pour presque toutes
ces grandeurs, si bien que rien ne distinguait « rien n'est attendu » de « le
modèle ne dit rien ». Deux heures sans température en août donnaient « Gel
probable, jusqu'à 0 degrés, voiler ce qui craint » ; un indice UV manquant
ouvrait un créneau d'arrosage « hors soleil » en plein soleil ; un jour marqué
nuit dessinait une lune à quatorze heures. Les grandeurs continues reprennent la
valeur connue la plus proche ; une lame garde zéro, interpoler y inventerait de
l'eau.

**Une évapotranspiration inconnue valait zéro dans le passé** et arrêtait la
projection dans le futur, deux lectures opposées de la même absence dans une
seule fonction. Même règle que les trous horaires : la valeur connue la plus
proche.

## Défauts de source, corrigés

**Le bandeau, les alertes et le bilan lisaient encore la charge quotidienne**
quand la feuille lit AROME. Le bandeau restant visible au-dessus de la feuille,
les deux étaient à l'écran ensemble avec quatre degrés d'écart pour le même
jour. Tous appliquent maintenant la règle de la table : les heures là où elles
couvrent la journée, la charge quotidienne au-delà.

**Le bilan comptait la pluie annoncée du jour comme déjà tombée.** À huit heures
du matin, avec vingt-cinq millimètres annoncés pour le soir, la feuille de l'eau
affirmait « Sur sept jours, 28 mm sont tombés » et la jauge les avait déjà
déduits. Corollaire plus grave : un relevé de pluviomètre saisi le matin
remplaçait le cumul du jour entier et effaçait la pluie restante, ce qui faisait
tomber la jauge à zéro et conseillait d'arroser un jour où vingt millimètres
allaient encore tomber. Le jour en cours ne compte que l'eau arrivée ; le reste
part dans la projection.

**« X mm attendus » portait la pluie déjà tombée.** L'alerte du bandeau lisait
le cumul de la journée civile et l'énonçait au futur, pendant que la feuille
disait « aucune pluie annoncée ». Elle ne parle plus que de ce qui reste.

## Défauts de seuil, corrigés

**Six seuils pour dire qu'il pleut.** Une heure à quinze centièmes de
millimètre donnait « 0,2 mm attendus » dans le conseil et « aucune lame » deux
centimètres plus bas. Le seuil de mention est unique, un dixième de millimètre.
Les seuils de décision gardent leurs valeurs propres : trois millimètres pour le
garde-fou du créneau, quinze pour l'alerte du bandeau, un pour la divergence.
Ils répondent à une autre question que celle de la mention, et le code le dit.

**Le seuil de la barre pâle était en points de dessin.** Elle valait un virgule
neuf pour cent repliée et zéro virgule sept agrandie : à un pour cent, la barre
paraissait en agrandissant et disparaissait en repliant, à donnée égale. Elle
est en pour cent, comme le reste.

**« Aucune pluie annoncée » s'écrivait jusqu'à trente-neuf pour cent de
risque**, la formulation qui le mentionne n'existant qu'à partir de quarante.
Une seule phrase désormais : la lame manque, et le risque est dit dès cinq pour
cent.

## Défauts de formulation, corrigés

**Une plage pouvait finir avant d'avoir commencé.** La borne de fin ne posait
« demain » que si l'heure valait vingt-trois, alors que la fenêtre est glissante
sur vingt-quatre heures. D'où « Créneau d'arrosage de 16 h à 14 h », et « de
10 h à 10 h » pour une fenêtre de vingt-quatre heures. C'est le jour de l'heure
suivante qui décide.

**Les moments présentaient un maximum comme la valeur de la tranche.**
L'humidité est un état, non un extrême : elle prend la moyenne, et « feuillage
mouillé » demande la majorité des heures au-dessus de quatre-vingt-dix plutôt
qu'une seule. Le vent garde son maximum, qui est le bon chiffre pour décider
d'un traitement, et le dit.

**Le créneau d'arrosage ne consultait pas le bilan** : la feuille en proposait
un le lendemain de trente-cinq millimètres pendant que l'accueil disait « la
réserve tient six jours ». Le bilan décide s'il faut arroser, le créneau dit
quand : il se tait quand le sol n'a rien demandé. Sa règle ne regardait que la
moyenne du vent, alors qu'une rafale emporte l'eau et le produit ; la rafale y
entre. « Hors soleil » nommait un test d'indice UV toujours vrai en décembre :
la phrase dit ce qu'elle teste.

**Deux écritures des millimètres**, la table gardant une décimale que le ruban
arrondissait. Une seule partout.

**« Relecture toutes les heures » était faux.** Rien ne relisait la charge : une
application posée sur l'écran d'accueil affichait indéfiniment celle de son
démarrage pendant que la fenêtre glissante avançait sur des données figées. Le
retour au premier plan la relit quand l'heure a changé.

## Défauts de méthode, corrigés

**La divergence entre modèles ne reconnaissait qu'un motif**, l'un annonce et
l'autre pas : quarante-deux millimètres contre trois dixièmes ne déclenchait
rien, le plus sec dépassant deux dixièmes. Un rapport de un à cent quarante est
pourtant plus incertain qu'un millimètre contre zéro. C'est le rapport qui
décide, un contre quatre, avec un plancher pour que des dixièmes ne parlent pas.

**L'origine des colonnes n'était pas connue.** AROME ne publie pas toujours la
probabilité de précipitation : la barre pleine et la barre pâle de la voie de
pluie pouvaient venir de deux modèles sans que rien ne le dise. La question
n'était pas vérifiable de l'extérieur, le chemin de l'API d'Open-Meteo étant
fermé aux robots. L'application la tranche donc elle-même à chaque charge, en
notant quelles colonnes viennent d'AROME, et la lecture de la voie le dit quand
les deux barres ne sont pas du même modèle.

## Défauts mineurs, non corrigés

1. Les accords sont faux sous deux : « 0,1 mm attendus », « jusqu'à 1,0
   degrés », « dont 0,4 tombés », « 1° mesurés ».
2. Les plages de gel et de rafales prennent le début de la première et la fin de
   la dernière sans le « par intervalles » que la ligne de pluie sait dire :
   « Gel probable de 23 h à 07 h » pour cinq heures réelles avec six degrés au
   milieu.
3. La pression dit « stable » sur la seule différence entre le premier et le
   dernier point : une chute de treize hectopascals suivie d'une remontée est
   « stable » au-dessus d'un dessin qui montre le V.
4. Le pic d'indice UV est daté « 14 h » dans l'en-tête de la feuille et « demain
   14 h » dans le conseil, sur le même écran ; et « au plus haut » s'écrit quand
   le pic dépasse la valeur du moment de moins de quatre dixièmes.
5. Les moments écrivent « demain, la nuit » pour la nuit qui commence dans
   quatre heures, la tranche de nuit portant toujours la date du lendemain.
6. Trois graphies coexistent pour la température, et l'espace insécable devant
   les unités n'existe qu'à huit endroits sur une quarantaine.
7. La carte de vigilance fond aujourd'hui et demain en une seule phrase sans
   date : une vigilance orange pour demain fait taire une alerte de chaleur
   d'aujourd'hui que l'application avait pourtant calculée. Les barres de la
   feuille de l'eau ont une échelle par colonne, dans une carte qui se lit comme
   une comparaison. Le jour du changement d'heure de printemps compte
   vingt-trois heures : la table retombera silencieusement sur l'autre modèle ce
   jour-là.

## Contrôles

Quatorze contrôles ajoutés à `outils/essais/temps.mjs`, qui en porte cent huit.
Neuf cent cinquante-deux joués en tout par `npm run essais`.

Les plus utiles portent sur ce qui ne se voit pas : l'horloge posée à minuit et
demi vérifie que la ligne de saisie du jour porte la date locale et non celle de
la veille ; un jeu creuse deux heures de température pour vérifier qu'aucune
gelée d'août n'apparaît ; un autre oppose une charge quotidienne à une série
horaire contradictoire pour vérifier que la table suit les heures et que le
maximum affiché est celui des heures.

Trois jeux d'essai existants ont dû être corrigés : ils posaient la pluie et les
extrêmes dans la seule charge quotidienne, que l'application ne lit plus pour
les jours couverts par les heures.
