# Relecture des associations

Menée le 2 août 2026 sur les 312 fiches portant une valeur dans `plants.companions`, dernière zone de contenu du référentiel jamais contrôlée. Règle appliquée, décidée par Jérôme : uniquement des éléments vérifiés.

## Résultat

Sur 290 associations que le référentiel prêtait à ses plantes, **12 sont conservées et 24 antagonismes établis**. Les 276 fiches restantes n'affichent plus rien à cette ligne.

Le compagnonnage au potager est un domaine où la tradition se recopie sans jamais être démontrée. Le référentiel en portait la version courante, carotte et poireau, basilic et tomate, chou et betterave. Presque rien n'a résisté à l'exigence d'une source établissant un effet nommé.

## Méthode

Cinq lots de vingt-trois fiches, chacun relu par un relecteur distinct sur une consigne fermée. Une association n'est conservée que si une source de rang 1, recherche et autorités, ou de rang 2, éditeurs à comité de lecture, établit un mécanisme énonçable. Les sites généralistes de jardinage ne font pas preuve : cinq sites d'accord ne font pas cinq confirmations, ils se recopient. En cas de doute, refus.

Les antagonismes ont été cherchés au même titre que les associations, et se sont révélés plus nombreux et mieux établis : allélopathie mesurée, ravageur ou maladie partagés entre plantes d'une même famille, compétition racinaire chiffrée, plantes traçantes.

## Ce qui est conservé

**Associations, douze.** Le trio maïs, haricot grimpant et courge, dont la surproduction par complémentarité racinaire est mesurée (Annals of Botany 114:1719, 2014). L'ail intercalé dans les rangs de fraisiers, 44 à 65 pour cent de tétranyques en moins au champ et sous abri (Experimental and Applied Acarology, 2016). L'œillet d'Inde planté avec la tomate dès le stade jeune plant, dont le limonène ralentit l'installation de l'aleurode des serres (PLOS One, 2019). La bourrache auprès du fraisier, 35 pour cent de fruits en plus par attraction des pollinisateurs (Ecological Entomology, 2020). L'oignon blanc en ceinture autour de la laitue contre le ver gris. La baie de mai, auto-incompatible, qui exige une seconde variété à floraison simultanée.

**Antagonismes, vingt-quatre.** La hernie du chou et les altises partagées entre brassicacées, qui imposent de séparer chou, radis, navet, rutabaga, roquette et mizuna. Le mildiou partagé entre pomme de terre et tomate. La verticilliose entre framboise, solanacées et fraisier. Le virus de la chlorose entre physalis, poivron et tomate. L'allélopathie mesurée du fenouil, de l'artichaut, du cardon et du solidage. L'autotoxicité de l'asperge sur son propre emplacement. La perte de 54 à 61 pour cent de biomasse du poireau associé au céleri. Le persil hôte de la mouche de la carotte. Les traçantes, menthe, muguet, aspérule odorante, aster d'automne, scille de Sibérie.

## Ce qui est écarté, et pourquoi

**Carotte et oignon.** Le refus le plus contre-intuitif, et le mieux fondé. Uvah et Coaker mesurent bien en 1984 une baisse des dégâts de mouche de la carotte en culture mélangée avec l'oignon. Mais l'effet n'est pas propre à l'oignon : la même baisse s'obtient en sous-semant du trèfle, plante non hôte quelconque, ce qui rejoint la théorie des atterrissages appropriés de Finch et Collier. Le fait vérifié est qu'un couvert non hôte réduit les dégâts, non qu'il faille de l'oignon. Ce n'est donc pas une association entre deux plantes nommées.

**Tomate et basilic.** Deux relecteurs sur trois refusent, sur la lecture même de l'essai qui servait à conserver : la baisse de 15 à 17 pour cent d'aleurodes ne se traduit ni en rendement ni en qualité, et un autre essai mesure une perte de récolte commercialisable et une aggravation du mildiou.

**Chou et aromatiques.** Finch et Collier, Entomologia Experimentalis et Applicata 2003, établissent que les aromatiques ne détournent pas la mouche du chou mieux que des plantes non aromatiques. Toute la famille de recommandations tombe.

**Œillet d'Inde contre les nématodes.** L'effet est réel mais exige un couvert dense installé deux mois avant la culture, d'après UF/IFAS et NC State Extension. Quelques pieds intercalés dans une culture sensible sont sans effet. L'œillet d'Inde est donc conservé pour la tomate, sur son effet aleurode démontré en plantation associée, et refusé pour l'aubergine.

**Melon et maïs**, réfuté par Damicone et coll. 2007 dans Plant Disease. **Pastèque et maïs**, chute de 58 à 70 pour cent du rendement de la pastèque. **Capucine sur cucurbitacées**, classée par la RHS comme pratique de jardinier non confirmée, le seul plant-piège validé étant le potiron Blue Hubbard. **Haricot nain et maïs**, extrapolation fautive du système des trois sœurs, qui exige un haricot à rames.

## Arbitrages rendus après coup

Trois associations conservées par un lot ont été retirées à l'arbitrage, sur contradiction entre relecteurs ou preuve contraire produite par un autre lot : carotte et oignon, oignon blanc hâtif et carotte, tomate et basilic. La règle appliquée est celle de la consigne, le doute vaut refus.

Une association a été ajoutée hors du périmètre listé, bourrache et fraisier, parce qu'un essai de rang 1 l'établit alors que les trois mentions que le référentiel portait pour la bourrache étaient deux lieux et une association non démontrée.

## Effet sur la colonne et sur l'écran

La colonne mélangeait deux notions. Sur 199 fiches elle nommait un emplacement et pas un voisinage, « Massif de terre de bruyère » pour l'airelle, « Mur au sud » pour l'abricotier. Cette information est désormais tenue par les usages sourcés, elle a été retirée de `companions`. Sept fiches de légumes ne portaient qu'une mention vide de sens, « Potager », retirée aussi.

La ligne de la fiche s'appelle désormais Voisinage et non Associations, puisque les deux tiers de ce qu'elle porte sont des mises à distance. Elle n'apparaît que sur les 36 fiches où une source établit quelque chose.

Rien n'est perdu : le journal `historique` conserve la valeur précédente de chaque ligne avec son motif, et la provenance est inscrite dans `plants.source`, soit `associations vérifiées` avec l'adresse de la source, soit `associations écartées faute de source établie`.

## Reste ouvert

Le topinambour est réputé envahissant par ses tubercules. Il ne figurait pas au périmètre relu, sa colonne ne portant qu'un emplacement. C'est un antagonisme candidat, à établir avant de l'écrire.

La distinction entre un fait mesuré et une pratique traditionnelle n'a plus lieu d'être affichée : la tradition non démontrée a été retirée. Si elle revenait un jour au référentiel, il faudrait la marquer comme telle.
