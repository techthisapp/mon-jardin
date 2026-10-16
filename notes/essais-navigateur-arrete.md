# Série d'essais interrompue par l'arrêt du navigateur

Note du 16 octobre 2026. Diagnostic et correctif du lanceur des essais de bout
en bout, `outils/essais/tous.mjs`.

## Constat

La série complète `npm run essais` s'est interrompue trois fois, les 13, 14 et
16 octobre 2026, sur une exception non rattrapée :

```
page.waitForTimeout: Target page, context or browser has been closed
```

L'exception était levée dans `ouvrirFiche`, de `outils/essais/commun.mjs`,
appelée deux fois depuis la suite `blocs` et une fois depuis la suite `ecarts`.
Aucun contrôle n'était en échec, et ces suites passaient quand on les jouait
seules. Une interruption est survenue sous une forte charge, avec une moyenne
supérieure à 50, une autre sans charge particulière.

## Reproduction

Le lanceur a été instrumenté le temps du diagnostic : écoute de
`browser.on("disconnected")` et de `page.on("crash")`, exception rattrapée
suite par suite, mémoire de l'arbre de processus du navigateur relevée après
chaque suite. Le port est devenu réglable, pour jouer plusieurs séries côte à
côte.

| Série | Port | Résultat |
|---|---|---|
| Première, en parallèle de la deuxième | 8111 | Interrompue dans `photos`, 22 h 17 min 18 s |
| Deuxième | 8112 | Interrompue dans `photos`, 22 h 17 min 18 s |
| Série d'une autre session sur le dépôt principal | 8099 | Interrompue dans `espaces`, 22 h 17 min 18 s |
| Troisième, avec le journal du protocole | 8113 | Passée, 1043 contrôles |
| `photos` seule, deux fois | 8111 | Passée |

Trois séries indépendantes, chacune avec son propre Chromium, à des suites
différentes, ont perdu leur navigateur à la même seconde. Plus tôt dans la
soirée, la même autre session avait été interrompue à 22 h 07 min 46 s, encore
dans `ouvrirFiche`. Aucun évènement `crash` n'a été relevé.

La mémoire des processus du navigateur reste stable sur toute une série, entre
280 et 440 Mo, sans accumulation d'une suite à l'autre. Le fond animé du
16 octobre ne fait pas monter cette courbe.

## Ce que dit Playwright selon ce qui meurt

L'épreuve consiste à tuer un processus du navigateur pendant une attente de la
page.

| Processus tué | Message reçu par la suite | Évènements |
|---|---|---|
| Moteur de rendu, par `TERM` ou `KILL` | `Page crashed` | `crash` puis `close` |
| Processus graphique | Aucun, la page survit | |
| Processus principal, par `TERM` | `Target page, context or browser has been closed` | `close`, puis `disconnected` après l'erreur |
| Processus principal, par `KILL` | Le même message | `close`, `disconnected` |

Le message relevé les 13, 14 et 16 octobre est donc celui de la mort du
processus principal du navigateur, et non d'un plantage du moteur de rendu.
Sous `TERM`, l'évènement `disconnected` n'arrive qu'après l'erreur de la
suite : une écoute qui ne laisse pas passer un court délai ne le voit pas.

## Cause

Le navigateur n'a pas planté de lui-même : la mort simultanée de trois
navigateurs indépendants désigne un arrêt venu de l'extérieur, envoyé à tous
les processus Chromium de la machine à la fois. Le lanceur, dont la ligne de
commande ne nomme pas Chromium, survit et reçoit l'exception.

L'émetteur a été identifié le même soir par une autre session de travail, qui
l'a constaté vers 23 h 57 : la session du projet « ma-meteo », qui joue ses
contrôles depuis une copie sous `/tmp/passe-8137` par `essais/passe.sh`, lance
avant chacun de ses jeux d'essais la commande suivante.

```
for p in $(pgrep -f ms-playwright); do kill $p; done
```

Le motif `ms-playwright` figure dans le chemin de tous les navigateurs que
Playwright installe, si bien que la commande arrête aussi ceux de mon-jardin,
au milieu de n'importe quelle suite. Un `kill` sans option envoie le signal
`TERM`, ce qui donne le code de sortie 143 et le message relevé, comme
l'épreuve l'a reproduit. La commande ne figure pas dans les scripts copiés sous
`/tmp/passe-8137` : elle est lancée par la session elle-même. Ce constat est
celui de l'autre session ; il n'a pas été observé directement depuis celle-ci,
le processus ayant disparu au moment de la vérification.

La lourdeur du rendu n'est pas en cause, l'interruption existant avant le fond
animé et la mémoire ne montant pas.

## Correctif

Le comportement de l'application n'est pas touché. Le correctif porte sur le
lanceur et le socle commun.

- Chaque suite est jouée sous une garde. Une exception n'interrompt plus la
  série : elle est attribuée à sa suite, avec son message et la ligne de
  l'essai où elle a été levée.
- Le lanceur distingue trois causes. Le navigateur a disparu sans que le
  lanceur l'ait fermé, constaté après un délai de trois secondes. Le moteur de
  rendu de la page a planté, relevé par `page.on("crash")` dans
  `ouvrirContexte`. La suite a levé une exception de son propre fait.
- Seule la disparition du navigateur donne lieu à une reprise : un navigateur
  neuf est lancé et la suite est rejouée une fois, depuis le début, son journal
  repartant de zéro. Une seconde disparition, un plantage du moteur de rendu ou
  une exception de la suite comptent comme un échec, sans reprise, car ceux-là
  peuvent venir de l'application ou de l'essai.
- La cause est écrite dans le compte rendu au moment de la perte, puis
  récapitulée en fin de série avec la mention « suite rejouée ». Le code de
  sortie du navigateur y figure : 143 ou 137, ou un signal `TERM` ou `KILL`,
  désignent un arrêt demandé par un autre processus. Playwright ne donnant ce
  code que dans son journal de mise au point, le lanceur ouvre ce journal et en
  retient la seule ligne de fin du processus, sans rien en afficher.
- Après une exception de suite, les contextes qu'elle a laissés ouverts sont
  fermés, pour ne pas peser sur les suivantes.
- Une promesse non attendue qui échoue compte comme un échec de la suite en
  cours, au lieu d'arrêter le processus sans dire où.
- Le port se règle par `PORT_ESSAIS`, 8099 par défaut, et un port occupé est
  signalé en clair au lieu d'une exception.

Un navigateur neuf par suite n'a pas été retenu : la mémoire ne s'accumule pas,
et la mesure ne justifie pas le coût d'un lancement par suite.

## Épreuve du correctif

`node outils/essais/epreuve-arret.mjs [suite]` joue une suite par le lanceur,
sur le port 8098, et tue son navigateur en cours de route. Elle vérifie qu'un
arrêt donne une suite rejouée qui passe, avec une cause qui nomme l'arrêt par
un autre processus, que deux arrêts donnent un échec, et qu'un plantage du
moteur de rendu donne un échec sans reprise. Les quatre contrôles passent sur
la suite `photos`.

## Vérification

Trois séries complètes avec le lanceur corrigé, le soir du 16 octobre : deux
jouées en parallèle sur les ports 8121 et 8122, sous charge, puis une seule sur
le 8123. Toutes trois passent, 1043 contrôles sans échec, sans perte de
navigateur ni reprise. Le contrôle avant dépôt ne relève aucun défaut.

Aucun arrêt extérieur n'est survenu pendant ces trois séries : la reprise
elle-même est établie par l'épreuve, qui provoque l'arrêt, et par un essai à la
main sur la suite `glossaire`, où le navigateur tué par `KILL` a été remplacé et
la suite rejouée, 15 contrôles sans échec, avec la mention du processus, du
signal et de l'arrêt par un autre processus.

## Reste à faire

Le remède est du côté de « ma-meteo », et la décision revient à Jérôme : le
nettoyage de ses navigateurs doit viser ses propres processus, par exemple les
descendants de son lanceur, et jamais un motif qui couvre tous les Chromium de
la machine. Tant qu'il n'est pas corrigé, une série de mon-jardin jouée en même
temps verra des suites rejouées, et une suite échouera si deux nettoyages
tombent pendant elle.
