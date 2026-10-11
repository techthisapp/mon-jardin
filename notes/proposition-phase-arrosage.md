# Proposition pour l'arrosage

Note de conception du 29 juillet 2026, en réponse au manque relevé : aucune des dix phases du calendrier ne porte l'arrosage, alors que c'est la tâche la plus fréquente au jardin.

## État des données

`water_need` et `water_note` sont renseignés sur les 315 fiches actives. Répartition : régulier 136, modéré 88, faible 77, soutenu 14. L'information existe donc, elle n'a simplement pas de place dans le calendrier. Seuls 146 conseils sur 1 700 évoquent l'arrosage, au détour d'une phrase, pour 138 plantes.

## Règle de dérivation testée, et pourquoi elle échoue

La règle la plus naturelle consiste à croiser deux choses : une fenêtre de saison sèche modulée par le besoin en eau, et la période où la plante est réellement présente au jardin, déduite des phases existantes de semis, plantation, floraison et récolte.

Fenêtres retenues pour le test : soutenu de mai à septembre, régulier de juin à août, modéré de juillet à août, faible sans arrosage.

Résultat sur les 238 plantes concernées : l'intersection est non vide dans 236 cas, avec des durées moyennes cohérentes, environ cinq mois pour le besoin soutenu, trois mois pour le régulier, deux mois pour le modéré. Techniquement la règle fonctionne.

Le problème apparaît en regardant les valeurs produites. Sur un échantillon de quinze plantes aussi différentes que la Tomate, le Pommier, le Rosier, le Muguet, la Fraise, le Poireau et l'Hortensia, la période dérivée est identique pour toutes celles d'un même besoin en eau : juin à août pour les 136 plantes en régulier, mai à septembre pour les 14 en soutenu.

La raison est simple : la période d'activité de la plupart des plantes est plus large que la fenêtre de saison sèche, donc l'intersection se réduit à la fenêtre elle-même. Le croisement avec les phases existantes n'apporte presque rien.

Autrement dit, cette règle produirait une phase générique disant la même chose à 136 fiches. C'est exactement le défaut que le contrôle de cohérence vient de corriger sur la protection hivernale, où un texte unique couvrait 55 fiches sans égard à la plante. Ajouter l'arrosage de cette façon reviendrait à recréer le problème.

## Ce que la donnée ne peut pas savoir

Trois facteurs déterminent réellement l'arrosage et échappent au référentiel.

La pluie. Aucun calendrier ne peut dire s'il faut arroser cette quinzaine, cela dépend de la météo des jours précédents.

L'âge du sujet. Un arbuste planté ce printemps demande un suivi hebdomadaire la première année, le même arbuste établi depuis cinq ans n'en demande aucun. La différence est bien plus grande qu'entre deux espèces.

Le contenant. Une plante en pot demande de l'eau tout l'été quel que soit son besoin intrinsèque, une plante en pleine terre non.

## Proposition

Trois options, de la plus sobre à la plus large.

### Option A, sans nouvelle phase

Ne pas créer de phase, et traiter l'arrosage là où il porte du sens.

Sur la fiche de plante, mettre en avant `water_need` et `water_note`, qui sont déjà renseignés partout et souvent précis, du type « régulier, il craint la sécheresse ».

Dans le jardin de l'utilisateur, exploiter `garden_plants.added_at`, déjà présent, pour signaler les plantes installées depuis moins d'un an et rappeler l'arrosage de reprise. C'est la règle qui apporte le plus, parce qu'elle distingue deux situations réellement différentes pour une même plante.

Coût nul en données, aucun risque de générique.

### Option B, une phase restreinte aux cas à signal

Créer la phase `arrosage`, mais ne l'attribuer qu'aux fiches où le rappel est réellement actionnable :

les 14 plantes à besoin soutenu, de mai à septembre, avec un conseil propre à chacune ;
les 11 plantes dont l'usage comprend la potée ou la suspension, sur toute la belle saison, l'assèchement du contenant étant le vrai risque ;
plus la règle de reprise de l'option A pour les plantations récentes.

Environ 25 fiches concernées, chacune avec un texte qui lui est propre. Le calendrier reste lisible, et un rappel d'arrosage y signifie quelque chose.

À l'inverse, les 77 fiches à besoin faible mériteraient un conseil explicite de ne pas arroser, la lavande, le thym ou le romarin souffrant davantage de l'excès que du manque. C'est une information utile que la base ne dit nulle part aujourd'hui.

### Option C, la phase pour toutes

Créer la phase et l'attribuer aux 238 plantes de besoin modéré à soutenu, selon la règle testée. Couverture maximale, mais période quasi identique pour toutes les fiches d'un même besoin, et 136 conseils à rédiger qui se ressembleront nécessairement.

## Recommandation

L'option B, complétée par la règle de reprise et par le conseil de ne pas arroser sur les 77 fiches à besoin faible. Elle ajoute de l'information là où il y en a, et elle évite de reconstituer un modèle générique sur 136 fiches.

Si l'option C est retenue malgré tout, il faudrait au minimum que le texte du conseil soit rédigé par groupe de culture plutôt qu'unique, faute de quoi le contrôle de cohérence le remontera comme défaut au prochain passage.

## Points à trancher avant écriture

Le vocabulaire de la phase, son libellé et sa position dans l'ordre des dix phases existantes.
Le comportement climatique : la phase doit-elle recevoir des décalages dans `climate_phase_shifts`, une saison sèche étant plus longue au sud.
Le seuil de la règle de reprise, une saison ou deux selon le type de plante, un arbre mettant plus longtemps à s'établir qu'une vivace.
