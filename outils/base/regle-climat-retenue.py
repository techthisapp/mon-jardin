#!/usr/bin/env python3
"""La règle de dérivation retenue, et sa fidélité mesurée sur le corpus.

Deux branches, selon que la fiche porte ou non un seuil de gel.

Sans seuil, la classe de rusticité décide seule, et la correspondance est exacte
sur les quatre-vingt-quinze lignes concernées.

Avec seuil, l'écart entre ce que la plante supporte et ce que le climat impose
se lit sur une grille de seuils, avec un jeu de paramètres pour les plantes
conduites en annuelle ou en bisannuelle et un autre pour les pérennes.

Les paramètres retenus sont ceux que les deux moitiés du catalogue désignent
ensemble, à un demi-point près. Un balayage plus fin monte la fidélité des
pérennes de 95,7 à 97,0 pour cent mais désigne des paramètres différents selon
la moitié d'apprentissage, et fait chuter les annuelles de 94,7 à 90,6 pour cent
d'une moitié à l'autre : la forme de la règle est établie, ses paramètres ne le
sont pas au-delà de ce que le jeu grossier retient.
"""
import collections, importlib.util, json

spec = importlib.util.spec_from_file_location("rc", "outils/base/regle-climat.py")
rc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rc)

# Sans seuil de gel : la classe de rusticité décide.
PAR_RUSTICITE = {
    "tres_rustique": dict.fromkeys(rc.CLIMATS, "adapte"),
    "rustique": {**dict.fromkeys(rc.CLIMATS, "adapte"), "montagnard": "protection"},
    "assez_rustique": {**dict.fromkeys(rc.CLIMATS, "adapte"),
                       "semi_continental": "protection", "montagnard": "protection"},
}
# Avec seuil de gel : température de référence par climat, seuils sur l'écart.
T_PERENNE = {"mediterraneen": -2, "oceanique": -5, "oceanique_degrade": -12,
             "semi_continental": -15, "montagnard": -20}
S_PERENNE = [2, 10, 18]
T_ANNUELLE = {"mediterraneen": -3, "oceanique": -5, "oceanique_degrade": -12,
              "semi_continental": -14, "montagnard": -20}
S_ANNUELLE = [3, 11, 19]


def niveau(plante, climat):
    g = plante.get("frost_min_c")
    if g is None:
        table = PAR_RUSTICITE.get(plante.get("hardiness"))
        return table.get(climat) if table else None
    annuelle = (plante.get("conduite") or plante.get("life_cycle")) in ("annuelle", "bisannuelle")
    t = (T_ANNUELLE if annuelle else T_PERENNE)[climat]
    seuils = S_ANNUELLE if annuelle else S_PERENNE
    e = g - t
    for i, borne in enumerate(seuils):
        if e <= borne:
            return rc.NIVEAUX[i]
    return rc.NIVEAUX[-1]


def main():
    L = rc.charger()
    branches = collections.defaultdict(lambda: [0, 0])
    ecarts = collections.Counter()
    for l in L:
        b = ("rusticité" if l["frost_min_c"] is None
             else "annuelles" if rc.annuelle(l) else "pérennes")
        r = niveau(l, l["climate_key"])
        branches[b][1] += 1
        if r == l["level"]:
            branches[b][0] += 1
        elif r:
            ecarts[abs(rc.NIVEAUX.index(r) - rc.NIVEAUX.index(l["level"]))] += 1
    tot = [sum(v[0] for v in branches.values()), sum(v[1] for v in branches.values())]
    print("fidélité de la règle sur les lignes dérivées du corpus\n")
    for b, (bon, n) in sorted(branches.items()):
        print(f"  {b:12s} {bon:5d} / {n:5d}   {100*bon/n:5.1f} %")
    print(f"  {'ensemble':12s} {tot[0]:5d} / {tot[1]:5d}   {100*tot[0]/tot[1]:5.1f} %")
    print(f"\n  écarts : {dict(ecarts)} (en nombre de crans)")

    plantes = json.load(open("/tmp/corpus-climat.json"))["plantes"]
    fautes = collections.Counter()
    for l in L:
        if niveau(l, l["climate_key"]) != l["level"]:
            fautes[l["climate_key"]] += 1
    print("  par climat :", dict(fautes))


if __name__ == "__main__":
    main()
