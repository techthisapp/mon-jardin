#!/usr/bin/env python3
"""Recherche de photographies de remplacement pour un taxon et un organe.

Usage :
    python3 outils/photos/chercher.py --taxon 3003683 --organes fleur,feuille,port \\
        [--examiner 150] [--garder 6] [--dossier /tmp/photos] [--sortie /tmp/choix.json]

Le numéro de taxon est la clé GBIF de l'espèce ou du genre, celle que porte
déjà la colonne gbif_usage_key de la table plants.

Les candidats viennent des deux jeux Pl@ntNet publiés sur GBIF, observations
et déterminations automatiques. L'organe est lu dans le titre du média, après
les deux points : "Rosa palustris Marshall: fruit".

Chaque candidat est téléchargé à la taille du plein écran, mesuré, puis soumis
aux contrôles. Ceux qui passent sont classés par une préférence propre à
l'organe. Le classement propose, il ne choisit pas : la tête de liste demande
toujours un oeil, une image peut être irréprochable et montrer autre chose que
ce que la fiche raconte.

Dépendances : opencv-python-headless, numpy.
"""
import argparse, collections, json, os, random, sys, time
import urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mesures, controles

JEUX = ["7a3679ef-5582-4aaa-81f0-8c2545cafc81",   # Pl@ntNet observations
        "14d5676a-2c54-4f94-9023-1e8dcd822aa0"]   # déterminations automatiques
ORGANES = {"flower": "fleur", "leaf": "feuille", "fruit": "fruit",
           "habit": "port", "bark": "ecorce"}

def _lire(url, entetes=None):
    r = urllib.request.Request(url, headers=entetes or {"User-Agent": "mon-jardin/1.0"})
    with urllib.request.urlopen(r, timeout=40) as f:
        return f.read()

def candidats(taxon, limite=300):
    vus, sortie = set(), []
    for jeu in JEUX:
        for offset in range(0, limite, 100):
            u = ("https://api.gbif.org/v1/occurrence/search?"
                 + urllib.parse.urlencode({"taxonKey": taxon, "datasetKey": jeu,
                                           "mediaType": "StillImage",
                                           "limit": 100, "offset": offset}))
            try:
                d = json.loads(_lire(u))
            except Exception as e:
                print("échec de la requête GBIF :", e, file=sys.stderr)
                break
            for o in d.get("results", []):
                for m in o.get("media", []):
                    ident = m.get("identifier") or ""
                    if "/image/" not in ident or ident in vus:
                        continue
                    vus.add(ident)
                    brut = m.get("title") or m.get("description") or ""
                    sortie.append({
                        "url": ident,
                        "organe": ORGANES.get(brut.rsplit(":", 1)[-1].strip().lower()),
                        "auteur": m.get("creator") or o.get("recordedBy") or "",
                        "licence": m.get("license") or o.get("license") or "",
                        "source": o.get("references") or o.get("occurrenceID") or "",
                        "espece": o.get("species") or o.get("scientificName") or "",
                        "date": o.get("eventDate") or ""})
            if d.get("endOfRecords"):
                break
    return sortie

def tirer(url, dossier):
    """Télécharge la taille du plein écran et rend le chemin local."""
    grande = url.replace("/image/o/", "/image/m/").replace("/image/s/", "/image/m/")
    os.makedirs(dossier, exist_ok=True)
    c = os.path.join(dossier, grande.rsplit("/", 1)[-1] + ".jpg")
    if not (os.path.exists(c) and os.path.getsize(c) > 1000):
        with open(c, "wb") as g:
            g.write(_lire(grande, {"User-Agent": "mon-jardin/1.0"}))
    return c, grande

# Préférence par organe, appliquée aux seuls candidats qui ont passé les
# contrôles. Elle traduit ce qui fait une bonne tuile plutôt que ce qui fait
# une image acceptable : une corolle large et franche, un feuillage sain qui
# occupe le cadre, un port bien éclairé où la plante se lit entière.
def preference(organe, m):
    lumiere = 1 - abs(m["l_med_centre"] - 140) / 140
    nettete = min(m["net_max"], 12000) / 12000
    if organe == "fleur":
        return (2.5 * min(m["tache"], 0.35) + 1.5 * min(m["p_corolle"], 0.5)
                + m["sat_hv"] / 400 + 0.5 * lumiere + 0.5 * nettete)
    if organe == "feuille":
        return (1.5 * min(m["p_feuillage"], 0.8) - 2 * m["p_taches"]
                + 0.5 * lumiere + 0.5 * nettete)
    if organe == "fruit":
        return (2.0 * min(m["tache"], 0.35) + 1.5 * min(m["p_corolle"], 0.5)
                + m["sat_hv"] / 400 + 0.5 * lumiere)
    if organe == "port":
        cadrage = 1 - abs(m["p_feuillage"] - 0.45) / 0.45
        return lumiere + 0.7 * cadrage + min(m["finesse"], 3) / 6 + m["etendue"] / 400
    if organe == "ecorce":
        return (1 - m["p_vert"]) + 0.7 * nettete + 0.5 * lumiere
    return nettete

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--taxon", required=True, type=int, help="clé GBIF, colonne gbif_usage_key")
    a.add_argument("--organes", default="fleur,feuille,fruit,port,ecorce")
    a.add_argument("--examiner", type=int, default=150, help="candidats examinés par organe")
    a.add_argument("--garder", type=int, default=6)
    a.add_argument("--dossier", default="/tmp/mon-jardin-candidats")
    a.add_argument("--sortie", default="/tmp/mon-jardin-candidats/choix.json")
    a.add_argument("--couleurs", default="", help="couleurs de fleur du référentiel, séparées par des virgules")
    a.add_argument("--graine", type=int, default=11)
    o = a.parse_args()

    tous = candidats(o.taxon)
    print(len(tous), "candidats |", dict(collections.Counter(x["organe"] for x in tous)))
    par = collections.defaultdict(list)
    for c in tous:
        if c["organe"]:
            par[c["organe"]].append(c)

    couleurs = [x.strip() for x in o.couleurs.split(",") if x.strip()]
    random.seed(o.graine)
    choix = {}
    for organe in [x.strip() for x in o.organes.split(",") if x.strip()]:
        lot = par.get(organe, [])
        random.shuffle(lot)
        lot = lot[:o.examiner]
        bons = []
        for c in lot:
            try:
                chemin, grande = tirer(c["url"], o.dossier)
            except Exception:
                continue
            time.sleep(0.3)
            m = mesures.mesurer(chemin)
            if m is None or controles.controler(m, organe, couleurs):
                continue
            bons.append({**c, "grande": grande, "mesures": m,
                         "preference": round(preference(organe, m), 4)})
        bons.sort(key=lambda x: -x["preference"])
        choix[organe] = bons[:o.garder]
        print(f"{organe} : {len(bons)} retenues sur {len(lot)} examinées")
    os.makedirs(os.path.dirname(o.sortie), exist_ok=True)
    json.dump(choix, open(o.sortie, "w"), ensure_ascii=False, indent=1)
    print("propositions :", o.sortie)

if __name__ == "__main__":
    main()
