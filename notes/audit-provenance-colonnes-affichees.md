# Provenance des colonnes affichées par la fiche

Audit conduit le 2 août 2026, après la sortie de l'estimation sur le nectar, le
pollen et le parfum, pour répondre à une question simple : que reste-t-il de
dette de contenu sur les autres colonnes.

## Point de départ

La fiche affiche dix-sept lignes réparties en trois blocs. Après le sourçage du
jour, quatre d'entre elles portent une provenance nommée par champ : le nectar,
le parfum, l'usage et le voisinage. Les treize autres reposent sur les sources
consultées à la construction de la fiche, listées en tête de `plants.source`, le
plus souvent des sites de jardinage généralistes.

Ce constat pouvait conduire à une conclusion mécanique et fausse : ces sites
sont de rang trois, donc les colonnes qu'ils portent sont de la dette, donc il
faut les vider. Cela aurait vidé le référentiel.

## Ce que la règle de rang recouvre réellement

La hiérarchie de rang a été écrite pour le compagnonnage, domaine où la
tradition se recopie de site en site sans jamais être démontrée, et où cinq
sites d'accord ne font pas cinq confirmations. Elle vise les affirmations
contestées.

Elle ne s'applique pas de la même façon aux données culturales de base. Qu'une
laitue demande un sol frais et riche n'est pas une affirmation contestée : c'est
un fait horticole consensuel, et l'accord de plusieurs éditeurs généralistes y
vaut ce qu'il prétend valoir.

La règle utile est donc celle-ci. Une source de rang trois ne prouve pas une
affirmation contestée. Elle suffit pour un fait consensuel, à condition qu'aucune
source de rang supérieur ne la contredise. Reste à vérifier ce dernier point,
ce qui est l'objet de cet audit.

## Méthode

La campagne du parfum avait rapporté 237 pages de taxon du Plant Finder du
Missouri Botanical Garden, source de premier rang. Ces pages portent, outre les
attributs de parfum, les champs Sun, Height, Spread, Family, Zone, Water et
Bloom Description. Elles ont servi à confronter trois colonnes du référentiel
sans un seul appel réseau supplémentaire.

Le test n'est pas l'égalité mais la non-contradiction : la valeur du référentiel
tombe-t-elle dans ce que la source admet.

## Exposition

Compatible sur les 236 fiches renseignées, sans une seule contradiction.

Le référentiel est souvent plus prescriptif que la source : cent dix fiches où
il dit plein soleil quand elle dit du plein soleil à la mi-ombre, seize où il
dit mi-ombre quand elle ouvre la même fourchette. Aucune valeur ne tombe hors de
la fourchette de la source.

L'écart s'explique et ne demande aucune correction : les deux colonnes ne
répondent pas à la même question. La source dit où la plante peut pousser, le
référentiel dit où la planter. Une tomate tolère la mi-ombre, on la met au
soleil.

Conséquence pour la procédure : le champ Sun du Plant Finder ne doit pas être
recopié dans `exposure`. Il sert à contrôler, non à renseigner.

## Hauteur

Compatible à trente-cinq pour cent près sur 228 fiches, neuf écarts.

Les neuf s'expliquent tous par l'objet mesuré, et aucun n'est une erreur du
référentiel. La source mesure la plante montée à fleur quand le référentiel
mesure la culture telle qu'on la récolte : radis 15 à 25 centimètres contre 61 à
91, mâche 10 à 15 contre 30 à 61, endive 15 à 20 contre 61 à 122. Ou bien elle
mesure la plante conduite au sol quand le référentiel la conduit sur support :
concombre 150 à 200 contre 23 à 46, cornichon, pois mange-tout, melon. Deux cas
tiennent au port cultivé contre le port spontané, le houx en arbuste de jardin
contre l'arbre forestier, et le chou perpétuel contre un chou générique, la
source partageant un seul taxon entre toutes les formes de *Brassica oleracea*.

## Famille

Identique sur 234 fiches, trois divergences.

Le laurier-tin, le sureau noir et la viorne obier sont placés en Adoxaceae par
la source quand le référentiel retient Viburnaceae. La question relève de
l'étape taxonomique, arbitrée par Tela Botanica, GBIF et POWO, et non du Plant
Finder. Le référentiel est maintenu.

## Besoin en eau, écarté

Non repris. L'échelle de la source compte cinq degrés, de Dry à Wet, contre
quatre au vocabulaire du référentiel. La correspondance demande donc des seuils,
et un seuil doit être validé avant usage. La colonne alimente en outre le calcul
d'arrosage en litres par jour : la modifier déplace un résultat chiffré affiché
au jardinier. Sujet à traiter pour lui-même, avec son protocole.

## Écriture du résultat

Le contrôle est écrit dans la provenance de chaque fiche concernée, à la suite
du taxon consulté, sous la forme `Plant Finder du Missouri Botanical Garden,
taxon N, consulté le 2 août 2026 : fleurs parfumées, exposition compatible,
hauteur compatible, famille identique`, avec la mention de l'écart quand il y en
a un.

Une colonne contrôlée et non contredite n'est pas au même état qu'une colonne
jamais confrontée. La provenance dit maintenant lequel des deux.

## Exceptions de contrôle

L'audit a laissé une divergence légitime que la vue `controle_coherence`
signalait en permanence : la floraison de la baie de mai, mars et avril au
référentiel contre mai à juillet chez Baseflor. Baseflor décrit la sous-espèce
sauvage de montagne, le référentiel décrit le camérisier cultivé, dont la
floraison précoce fait tout l'intérêt.

Plutôt que de corriger une donnée juste ou de laisser un signal permanent, une
table `controle_exceptions` enregistre désormais les divergences arbitrées avec
le motif de l'arbitrage, et la vue les retire de son résultat. Une divergence
acceptée cesse d'être un bruit sans être oubliée.

## Contrôles ajoutés

Trois contrôles gardent les acquis de la journée : un organe parfumé sans
provenance, une intensité de parfum réapparue, une cotation apicole sans
provenance. Le contrôle `parfum_incoherent`, qui croisait l'intensité et
l'organe, est devenu sans objet et a été retiré.

`controle_coherence` ne rend plus aucune ligne.

## Ce que l'audit laisse ouvert

Le besoin en eau, à confronter avec son propre protocole.

Six conseils dont le texte cite un mois hors de la fenêtre de leur tâche,
signalés par `controle_detail` sous « conseil incohérent avec sa période ».
Antérieurs à cette journée, sans rapport avec les colonnes reprises.

Les colonnes que le Plant Finder ne couvre pas et que la fiche affiche :
espacement, profondeur, fertilité, multiplication, cycle. Elles reposent sur
l'accord de plusieurs éditeurs horticoles, ce qui est recevable pour des faits
consensuels, mais aucune source de premier rang ne les a confirmées une à une.
