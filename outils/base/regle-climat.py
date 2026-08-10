#!/usr/bin/env python3
"""Reconstitution de la règle de dérivation de plant_climates.

Les 1524 lignes dérivées ont été produites par un script de campagne dont la
règle n'a été écrite nulle part. On la cherche sur une moitié du catalogue et on
la mesure sur l'autre, dans les deux sens, comme le référentiel l'exige de toute
règle de conversion.

La forme cherchée est la plus simple qui puisse rendre compte du corpus : un
écart entre ce que la plante supporte et ce que le climat impose, lu sur une
grille de seuils. La difficulté est que le basilic, dont le seuil de gel vaut
plus quatre degrés, est donné adapté en méditerranéen : une comparaison du seul
seuil de gel à une température de référence ne peut donc pas suffire, et la
règle traite les annuelles autrement que les pérennes.
"""
import collections, itertools, json, random

NIVEAUX = ["adapte", "protection", "abri", "deconseille"]
CLIMATS = ["mediterraneen", "oceanique", "oceanique_degrade", "semi_continental", "montagnard"]


def charger():
    d = json.load(open("/tmp/corpus-climat.json"))
    par_id = {p["id"]: p for p in d["plantes"]}
    lignes = []
    for c in d["climats"]:
        p = par_id.get(c["plant_id"])
        if not p or not c["derived"]:
            continue
        lignes.append({**c, **{k: p.get(k) for k in
                               ("slug", "life_cycle", "habit", "conduite", "hardiness",
                                "frost_min_c", "category", "typology", "wintering")}})
    return lignes


def annuelle(l):
    """Une plante conduite en annuelle ne passe pas l'hiver au jardin : ce qui la
       limite est la longueur de la saison, non la survie de la souche."""
    return (l.get("conduite") or l.get("life_cycle")) in ("annuelle", "bisannuelle")


def rendre(l, tref, seuils, tref_ann, seuils_ann):
    t = (tref_ann if annuelle(l) else tref)[l["climate_key"]]
    s = seuils_ann if annuelle(l) else seuils
    g = l["frost_min_c"]
    if g is None:
        return None
    e = g - t
    for i, borne in enumerate(s):
        if e <= borne:
            return NIVEAUX[i]
    return NIVEAUX[-1]


def score(lignes, *params):
    bons = sum(1 for l in lignes if rendre(l, *params) == l["level"])
    return bons / max(1, len(lignes))


def chercher(lignes, grille_t, grille_s):
    """Balayage exhaustif sur la grille proposée, deux jeux de paramètres."""
    peres = [l for l in lignes if not annuelle(l)]
    ann = [l for l in lignes if annuelle(l)]
    meilleur = (0, None, None)
    for tref in grille_t:
        for s in grille_s:
            b = sum(1 for l in peres
                    if rendre(l, tref, s, tref, s) == l["level"]) / max(1, len(peres))
            if b > meilleur[0]:
                meilleur = (b, tref, s)
    _, tref, s = meilleur
    meilleur_a = (0, None, None)
    for tref_a in grille_t:
        for s_a in grille_s:
            b = sum(1 for l in ann
                    if rendre(l, tref, s, tref_a, s_a) == l["level"]) / max(1, len(ann))
            if b > meilleur_a[0]:
                meilleur_a = (b, tref_a, s_a)
    return tref, s, meilleur_a[1], meilleur_a[2], meilleur[0], meilleur_a[0]


def grilles():
    t = []
    for med in (-2, -3, -5):
        for oce in (-5, -7, -8):
            for od in (-9, -10, -12):
                for sc in (-12, -14, -15):
                    for mo in (-15, -18, -20):
                        t.append({"mediterraneen": med, "oceanique": oce,
                                  "oceanique_degrade": od, "semi_continental": sc,
                                  "montagnard": mo})
    s = []
    for a in (0, 2, 3, 5):
        for b in (a + 3, a + 5, a + 8):
            for c in (b + 3, b + 5, b + 8):
                s.append([a, b, c])
    return t, s


def main():
    lignes = charger()
    print(f"{len(lignes)} lignes dérivées, "
          f"{len({l['slug'] for l in lignes})} plantes")
    gt, gs = grilles()
    print(f"grille : {len(gt)} jeux de températures, {len(gs)} jeux de seuils")

    plantes = sorted({l["slug"] for l in lignes})
    alea = random.Random(20260810)
    alea.shuffle(plantes)
    moitie = set(plantes[:len(plantes) // 2])
    a = [l for l in lignes if l["slug"] in moitie]
    b = [l for l in lignes if l["slug"] not in moitie]

    for nom, app, mes in (("A puis B", a, b), ("B puis A", b, a)):
        tref, s, tref_a, s_a, ba, bb = chercher(app, gt, gs)
        p = (tref, s, tref_a, s_a)
        print(f"\n{nom}")
        print(f"  pérennes    {tref}  seuils {s}")
        print(f"  annuelles   {tref_a}  seuils {s_a}")
        print(f"  sur la moitié d'apprentissage : {score(app, *p):.3f}")
        print(f"  sur la moitié de mesure       : {score(mes, *p):.3f}")
        print(f"  sur tout le corpus            : {score(lignes, *p):.3f}")


if __name__ == "__main__":
    main()
