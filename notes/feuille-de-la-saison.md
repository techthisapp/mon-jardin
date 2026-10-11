# Feuille de la saison

Note de conception. En production, commit 77a48ff.

## État de départ

La feuille portait le ruban de l'année, sa légende, une liste de quatre dates
et une phrase nommant les plantes les plus exposées à la gelée.

Trois défauts. La liste répétait le ruban, qui porte déjà les quatre bornes en
place et en longueur, sous les initiales des mois. Elle était ambiguë :
« Pleine saison fin mai » se lit comme une date de pleine saison, alors que
c'est une date d'entrée. Et rien n'y bougeait : les quatre dates viennent du
climat, jamais du jardin, si bien que la feuille disait la même chose en
janvier et au mois d'août. Seul le point du ruban se déplaçait.

## Principe retenu

La feuille dit le temps qui reste et ce que ce temps change au jardin. Les
énoncés sont calculés au moment de l'ouverture, par croisement des fenêtres de
chaque fiche avec la borne de gel du climat. Aucun n'est stocké.

## Contenu

**Le temps restant.** L'étape en cours, ce qui lui reste, la borne suivante et
sa date. Puis la gelée quand elle n'est pas cette borne. Le compte se dit en
semaines, en mois au delà de quatorze : les bornes du référentiel sont des
quinzaines, un compte en jours promettrait une précision qu'elles n'ont pas.

**Les dernières récoltes.** Les plantes du jardin dont le seuil de gel atteint
moins deux degrés, avec la quinzaine où leur récolte s'achève, groupées par
date. La ligne tombe quand la phrase de marge nomme les mêmes plantes.

**La marge.** Quand une fin de récolte tombe à une quinzaine ou moins de la
gelée, la feuille le dit et en tire la conséquence : une gelée précoce coupe la
fin de la récolte. C'est le seul énoncé qui ne soit ni une date ni une liste.

**Les récoltes d'après.** Les plantes dont la fenêtre de récolte dépasse la
borne de gel. Les cueillettes de toute l'année sont écartées, une fenêtre de
plus de douze quinzaines ne disant rien de la saison.

**Les protections.** Le nombre de plantes portant une fenêtre de protection
sous ce climat, et la quinzaine où la première s'ouvre. Les plantes sont
nommées quand elles sont trois ou moins.

**Les exposées restantes.** Les gélives qu'aucune ligne de récolte n'a nommées,
plante d'ornement ou récolte déjà close.

**Le seuil de dix heures.** La date où la durée du jour franchit dix heures, à
la latitude du jardin. En deçà la végétation se conserve sans plus pousser :
c'est la cause de la fin de saison, quand les bornes n'en donnaient que la
date. En hiver, l'énoncé se lit dans l'autre sens, le retour au-dessus du seuil
étant ce qui approche.

**La note de source.** Elle ne cite que les sources de ce qui est à l'écran.

## Horizon des énoncés

Tout ce qui touche à la gelée ne paraît qu'à cent vingt jours d'elle, les
quatre derniers mois de la saison. Plus tôt, une date d'octobre n'apprend rien
et encombre la feuille. Le seuil de dix heures suit le même horizon.

Au repos et à la reprise, la feuille se réduit donc au ruban, au compte vers la
borne suivante et à la source. C'est le contenu juste : le référentiel ne porte
pas la dernière gelée de printemps, qui serait l'énoncé symétrique.

## Calcul de la durée du jour

Déclinaison solaire par la série courte de Spencer, hauteur de référence de
moins zéro virgule huit cent trente-trois degré, disque solaire et réfraction
compris. Écart à la valeur du service météorologique : deux minutes environ,
les conventions d'horizon différant, ce qui déplace la date d'un jour au plus.
La feuille de la lumière ne portant aucune date, les deux ne peuvent pas se
contredire à l'écran.

Le calcul est écarté au delà de soixante-six degrés de latitude, le jour ne
franchissant plus le seuil.

## Idée écartée

Comparer l'année en cours à la normale, du type « les seize degrés ont été
atteints douze jours plus tôt qu'à l'ordinaire ». Les bornes viennent des
normales 1991-2020 de Météo-France, mais l'application ne garde aucun
historique de température de la commune : elle lit trente jours d'antériorité,
pas une saison. Il faudrait une nouvelle source.

## Exemple

Le jardin bucolique, climat océanique dégradé, 42 plantes actives, le 13 août.

Pleine saison encore 5 semaines, ralentissement fin septembre. Première gelée
attendue début novembre, dans 11 semaines. Dernières récoltes avant la gelée :
le basilic fin septembre, le poivron début octobre, la tomate, la courgette et
la courge fin octobre. La tomate, la courgette et la courge se récoltent
jusqu'à fin octobre, à une quinzaine de la première gelée : une gelée précoce
coupe la fin de la récolte. Récoltes après la gelée : l'olivier et le kiwi
début décembre. 8 de vos plantes demandent une protection à partir de début
octobre. Le jour passe sous dix heures le 2 novembre.

## Socle des essais

`ouvrirContexte` accepte une date : les quatre étapes de la végétation ne
s'observent pas le même jour, et rien d'autre ne permet de porter l'application
en décembre. La météo figée est déplacée d'autant, sans quoi l'application ne
trouve pas le jour courant dans la série et le bloc du temps reste muet. Les
valeurs ne sont pas retouchées : une suite qui voyage ne mesure ni le temps
qu'il fait, ni la pluie, ni la vigilance, toutes datées elles aussi.

## Contrôles

`outils/essais/saison.mjs`, 22 contrôles sur quatre dates. Le jardin d'essai
porte quatre plantes choisies pour toucher chaque cas : la tomate gèle et se
récolte jusqu'à la veille de la gelée, la capucine gèle sans rien donner à
récolter, le chou rouge se récolte après elle, la framboise ne craint rien.

Le 2 août, en pleine saison, les huit lignes coexistent et sont comparées mot à
mot. Le 5 octobre, la gelée est la borne suivante et ne se dit qu'une fois. Le
20 décembre, la feuille se tait sur l'automne et lit le seuil à l'envers. Le
10 avril, il ne reste que le ruban, le compte et la source.
