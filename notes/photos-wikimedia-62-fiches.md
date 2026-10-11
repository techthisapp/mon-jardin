# Photographies Wikimedia, les 62 fiches sans Pl@ntNet

Sourçage des soixante-deux fiches que Pl@ntNet ne couvre pas. Collecte faite,
sélection produite, versement en attente d'arbitrage. **L'application sait
servir le fonds depuis le commit 86b2b41.**

## Résolution des catégories

Le nom latin de la fiche ne suffit pas à trouver la catégorie de Commons.
Wikidata fait le pont par le nom de taxon puis la catégorie déclarée : l'amandier
est rangé sous Prunus amygdalus. Onze fiches ne se résolvent ni par leur nom
latin ni par Wikidata, Commons les range sous un nom commun ou sous la variété
acceptée. La table de correspondance a été vérifiée à la main, sujet et volume :
poireau vers Leek (vegetable), blette vers Chard, bégonia des jardins vers
Begonia x semperflorens-cultorum, carex vers Carex oshimensis (cultivars),
mizuna vers Brassica rapa subsp. nipposinica, pois mange-tout vers Pisum sativum
var. macrocarpon, kiwi vers Actinidia chinensis var. deliciosa, fenouil bulbe
vers Fennel bulbs et Foeniculum vulgare (cultivated), artichaut vers Cynara
cardunculus Scolymus Group, maïs doux vers Zea mays.

Une seule fiche reste sans rien. Morus kagayamae n'a pas de catégorie sur
Commons et le nom ne rend qu'un fichier sur tout le fonds.

## Volumes

5052 candidates collectées, 4816 fichiers distincts, dans 61 arbres de
catégories. Cent deux portent le label Quality image, une le label Featured
picture, aucune le label Valued image. Mille trois cent trente-sept sont
affichées par au moins un article de Wikipédia.

Quatre cent trente-six lignes retenues, trois rangs par organe et par fiche,
soixante et une fiches couvertes. Organes au rang 1 : port 61, fleur 47, fruit
28, feuille 27, organe souterrain 8, écorce 4.

## Ce qui fonde le classement

Aucune mesure faite sur les pixels. Elles ont été essayées sur le lot Pl@ntNet
et classent à l'envers : la variance du laplacien récompense l'encombrement et
pénalise le gros plan sur fond fondu.

Le classement ne retient que des signes posés par des humains. Le label de
relecture de Commons d'abord, Featured picture puis Quality image puis Valued
image. Le nombre d'articles d'encyclopédie qui affichent l'image ensuite : une
image posée en tête d'un article a été choisie par des relecteurs. La définition
en dernier, et un point pour l'organe dit par une catégorie plutôt que deviné
dans le nom de fichier.

Les catégories de relecture de Commons sont masquées : une requête sur les
catégories visibles ne les rend pas, il faut les demander nommément.

## Le label Quality image ne suffisait pas

La décision initiale restreignait la recherche aux images portant ce label.
Mesure faite sur les soixante-deux fiches : vingt-cinq n'en ont aucune et
vingt-deux seulement en ont cinq ou plus. La restriction laissait donc quarante
pour cent des fiches vides. Le label est devenu le premier critère de classement
au lieu d'être un filtre.

## Deux règles du fonds que l'application ne tenait pas

Wikimedia ne sert plus qu'une échelle fixe de largeurs, cent vingt, deux cent
cinquante, cinq cents et mille deux cent quatre-vingts points. Toute autre
largeur rend une erreur 400. La bande demande deux cent cinquante, le plein
écran cinq cents. Le code demandait neuf cents points, et l'expression qui
construisait l'adresse laissait un fragment littéral faute d'un second groupe de
capture. Le défaut n'avait jamais paru, aucune image de ce fonds n'étant encore
versée.

Le chemin d'une vignette porte une empreinte du nom de fichier et ne se devine
pas : il vient de l'API.

Les licences changent d'une image à l'autre. Sur les quatre cent trente-six
lignes : CC BY-SA 4.0 pour 156, CC BY-SA 3.0 pour 127, CC0 pour 32, domaine
public pour 24, et onze autres formes. Quarante-cinq fiches sur soixante-deux
portent plusieurs licences au rang 1. L'attribution sous la bande annonçait
celle de la première image pour tout le lot, ce qui était faux pour les autres.
Chaque auteur est désormais suivi de la sienne quand le lot en mêle plusieurs,
et la forme courte est conservée quand la licence est unique, ce qui reste le
cas de tout le fonds Pl@ntNet.

## Qualité constatée sur les planches

La planche des fleurs est bonne, six erreurs environ sur quarante-sept : une
gravure ancienne pour le chou cabus, une inflorescence sèche pour le chou-fleur
et le romanesco, un bouquet en vase pour le népéta, un poireau en vitrine de
musée, un mur de fenouil.

La planche des ports est la plus faible, une vingtaine d'erreurs sur soixante et
une : des rangs de culture en plein champ pour la blette, le brocoli, la
carotte, la chicorée frisée, le rutabaga et la scarole, une récolte en cageot
pour le chou-rave et l'endive, une personne au travail pour le navet et
l'échalote, une fleur isolée pour le glaïeul et les dahlias.

La planche des fruits est peu utile au potager : elle rend surtout des graines
sur fond neutre, des sachets de semences et des étals de marché. Elle garde son
sens sur la casseille, le kiwi, le melon, l'amandier et le physalis.

La planche des organes souterrains compte huit fiches et quatre erreurs :
floraison au lieu du tubercule pour le bégonia, feuillage pour le crosne,
cossettes séchées pour l'endive, radis noir sur la fiche du radis rouge.

## Points en attente d'arbitrage

1. L'organe souterrain. La contrainte de la table n'autorise que fleur, feuille,
   fruit, port et écorce. Huit fiches montreraient une racine, un bulbe ou un
   tubercule, ce qui est la raison de cultiver la carotte ou de planter un
   glaïeul. Ajouter la valeur à la contrainte, à l'ordre des organes et aux
   libellés, ou renoncer à ces tuiles.
2. La tuile Fruit sur les fiches de potager. La restreindre aux fiches dont le
   fruit se mange, ou la garder telle quelle.
3. La tuile Port. Un repli attribue le port à une image rangée sous le taxon
   sans autre indication. Le retirer relèverait la justesse et retirerait le
   chou perpétuel, seule fiche qui n'existe que par ce repli.
4. Le versement. Verser tel quel comme pour Pl@ntNet, ou après relecture des
   planches.
5. Le mûrier platane, sans photographie possible sur ce fonds.

## Versement

Prévu par requête SQL sur la base, sans ouvrir l'écriture au rôle anonyme, comme
convenu après le versement Pl@ntNet.
