# État du référentiel et de l'application au 2 août 2026

Journée consacrée à la dette de contenu, puis aux défauts que les vues de
contrôle signalaient encore, puis au plus gros angle mort des essais.

## Ce qui est fait

Le nectar et le pollen reposent sur la *Liste de plantes attractives pour les
abeilles* de Val'hor et FranceAgriMer, 91 et 90 fiches, toutes sourcées, indice
de confiance reporté et employé de façon dissymétrique. Le parfum est ramené à
l'organe que le Plant Finder du Missouri établit, 68 fiches. Aucune fiche ne
porte plus la mention `estimation horticole non vérifiée`, pour aucun champ.

L'exposition, la hauteur et la famille ont été confrontées au Plant Finder sur
les 237 fiches qu'il couvre : aucune contradiction, et le résultat du contrôle
est écrit dans la provenance de chaque fiche.

Les six conseils dont la phrase de tête citait un mois hors de leur fenêtre sont
corrigés, dont trois erreurs de fond. Le recouvrement entre la taille et la
multiplication de l'aster d'automne est levé.

Les vues `controle_coherence`, `controle_detail` et `controle_modele` ne
signalent plus aucun défaut de gravité haute ni moyenne.

Les essais passent de 119 à 138 contrôles, répartis en neuf suites.

## Ce qui reste, par ordre d'intérêt

### Le besoin en eau

Seule colonne culturale à n'avoir été ni sourcée ni confrontée. Le Plant Finder
la publie sur une échelle de cinq degrés, de Dry à Wet, contre quatre au
vocabulaire du référentiel : la correspondance demande des seuils, donc une
validation, et la colonne alimente le calcul d'arrosage en litres par jour
affiché au jardinier. Sujet à traiter pour lui-même, avec son protocole.

Piste possible : le référentiel porte déjà des coefficients culturaux sourcés de
la FAO sur cinquante fiches. Le besoin en eau pourrait s'y rattacher plutôt que
d'être sourcé à part, la classe étant alors une lecture du modèle d'arrosage et
non une donnée indépendante.

### La relecture des conseils

Deux cent trente-neuf conseils sont encore dans leur rédaction d'origine, dont
135 sur la plantation et 52 sur la fertilisation. Gravité basse : ce n'est pas
une question de justesse, les conseils sont dérivés des colonnes structurées,
mais de qualité de rédaction. C'est une campagne éditoriale, pas une correction.

Un texte identique sert à vingt-cinq plantes pour la floraison, « Période de
floraison principale, à ne pas tailler sous peine de supprimer les fleurs de
l'année ». Générique et juste, mais sans rien de propre à la plante.

### Le semis d'automne du pois

Le conseil de protection du pois décrit les variétés à grains ronds semées à
l'automne, mais aucune fenêtre de semis d'automne n'existe dans le calendrier :
la seule fenêtre de plantation va de la mi-mars à la mi-mai. Soit la fenêtre
d'automne manque, ce qui demande une source, soit la fenêtre de protection de
septembre et octobre n'a pas d'objet. À trancher.

### Les zones du référentiel que rien ne couvre

L'espacement, la profondeur, la fertilité, la multiplication et le cycle
reposent sur l'accord de plusieurs éditeurs horticoles. C'est recevable pour des
faits consensuels, mais aucune source de premier rang ne les a confirmés un à
un, et le Plant Finder ne les publie pas.

### Les essais manquants

Restent sans couverture l'écran des espaces, que les données figées ne
renseignent pas, la connexion et la reprise de session, et la roue, seconde
lecture du calendrier annuel.

## Deux règles générales dégagées aujourd'hui

Une phrase dérivée d'une colonne est une assertion au même titre que la colonne.
Vider la colonne sans retirer la phrase laisse l'affirmation dans le texte. La
reprise du nectar a demandé de recalculer 221 phrases de conseil.

Une valeur positive et une valeur nulle publiées par la même source n'ont pas la
même force. La première suppose une observation, la seconde peut naître de
l'absence de documentation. Quand la source publie un indice de fiabilité, il
s'emploie de façon dissymétrique.

## Un garde-fou installé

La table `controle_exceptions` enregistre les divergences arbitrées avec le
motif de l'arbitrage, et les vues de contrôle les retirent. Une divergence
acceptée cesse d'être un signal permanent sans être oubliée. Première entrée, la
floraison de la baie de mai, Baseflor décrivant la sous-espèce sauvage de
montagne quand le référentiel décrit le camérisier cultivé.
