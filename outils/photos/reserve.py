#!/usr/bin/env python3
"""Approfondissement de la réserve photographique du catalogue.

Usage :
    python3 outils/photos/reserve.py --profondeur 6 [--slugs rosier,tomate]
        [--examiner 30] [--fils 6] [--sortie /tmp/reserve.json] [--reprendre]

La table ne portait que trois rangs par organe. Un avis de mainteneur suffisant
à retirer une image, et le contrôle automatique en ayant déjà écarté d'autres,
un organe pouvait se retrouver sans rien à montrer. L'offre n'est pourtant pas
le problème : le genre Rosa compte à lui seul vingt et un mille observations
avec image chez Pl@ntNet.

Le programme lit ce que la base porte déjà, calcule ce qui manque pour atteindre
la profondeur demandée sur les seuls organes attendus, collecte les candidats
chez Pl@ntNet par l'interface GBIF, les télécharge à la taille du plein écran,
les mesure, leur applique les contrôles, écarte les doublons et les
incohérences de genre, puis rend les lignes à insérer.

Il n'écrit rien en base : la sortie est un fichier JSON, que l'on relit avant de
charger.

Dépendances : opencv-python-headless, numpy.
"""
import argparse, collections, json, os, random, sys, threading, time
import urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mesures, controles

JEUX = ["7a3679ef-5582-4aaa-81f0-8c2545cafc81",   # Pl@ntNet observations
        "14d5676a-2c54-4f94-9023-1e8dcd822aa0"]   # déterminations automatiques
ORGANES = {"flower": "fleur", "leaf": "feuille", "fruit": "fruit",
           "habit": "port", "bark": "ecorce"}

# Un organe sans objet ne se remplit pas. Mêmes règles que la vue et que
# outils/photos/coherence.py : l'écorce demande un port ligneux, le fruit une
# catégorie qui en porte un.
PORTS_LIGNEUX = {"arbre", "arbuste", "liane", "sous_arbrisseau"}
CATEGORIES_SANS_FRUIT = {"Feuilles", "Racines", "Bulbes"}
# La racine n'est jamais servie par Pl@ntNet, dont la nomenclature d'organes
# n'en porte pas : elle reste hors campagne.
A_REMPLIR = ["fleur", "feuille", "fruit", "port", "ecorce"]


def organe_attendu(plante, organe):
    if organe == "ecorce":
        return plante["habit"] in PORTS_LIGNEUX
    if organe == "fruit":
        return plante["category"] not in CATEGORIES_SANS_FRUIT
    return True


def _lire(url, entetes=None, essais=3):
    dernier = None
    for k in range(essais):
        try:
            r = urllib.request.Request(url, headers=entetes or {"User-Agent": "mon-jardin/1.0"})
            with urllib.request.urlopen(r, timeout=45) as f:
                return f.read()
        except Exception as e:                       # coupure, quota, 5xx
            dernier = e
            time.sleep(0.6 * (k + 1))
    raise dernier


def candidats(taxon, pages=6):
    """Les images publiées pour ce taxon, dédoublonnées, avec leur organe."""
    vus, sortie = set(), []
    for jeu in JEUX:
        for offset in range(0, pages * 300, 300):
            u = ("https://api.gbif.org/v1/occurrence/search?"
                 + urllib.parse.urlencode({"taxonKey": taxon, "datasetKey": jeu,
                                           "mediaType": "StillImage",
                                           "limit": 300, "offset": offset}))
            try:
                d = json.loads(_lire(u))
            except Exception as e:
                print(f"  requête GBIF en échec : {e}", file=sys.stderr)
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
                        "occurrence": o.get("key")})
            if d.get("endOfRecords"):
                break
    return sortie


def cle_image(url):
    """L'empreinte du fichier, indépendante de la taille demandée."""
    return url.rsplit("/", 1)[-1]


def petite(url):
    return url.replace("/image/o/", "/image/s/").replace("/image/m/", "/image/s/")


def grande(url):
    return url.replace("/image/o/", "/image/m/").replace("/image/s/", "/image/m/")


class Cadence:
    """Pl@ntNet refuse les rafales : un jeton toutes les tant de secondes."""

    def __init__(self, ecart):
        self.ecart = ecart
        self.verrou = threading.Lock()
        self.dernier = 0.0

    def attendre(self):
        with self.verrou:
            t = time.monotonic()
            if t - self.dernier < self.ecart:
                time.sleep(self.ecart - (t - self.dernier))
            self.dernier = time.monotonic()


def tirer(url, dossier, cadence):
    g = grande(url)
    c = os.path.join(dossier, cle_image(g) + ".jpg")
    if os.path.exists(c) and os.path.getsize(c) > 1500:
        return c
    cadence.attendre()
    o = _lire(g, {"User-Agent": "mon-jardin/1.0"})
    if len(o) < 1500:
        raise ValueError("fichier trop court")
    with open(c, "wb") as f:
        f.write(o)
    return c


def preference(organe, m):
    """Ce qui fait une bonne tuile, appliqué aux seuls candidats qui passent."""
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


def genre(latin):
    return (latin or "").strip().split(" ")[0].lower()


def examiner(lot, organe, couleurs, dossier, cadence, fils):
    """Télécharge, mesure et contrôle un lot. Rend les candidats qui passent."""
    bons = []

    def un(c):
        try:
            chemin = tirer(c["url"], dossier, cadence)
        except Exception:
            return None
        m = mesures.mesurer(chemin)
        if m is None or controles.controler(m, organe, couleurs):
            return None
        return {**c, "preference": round(preference(organe, m), 4)}

    with ThreadPoolExecutor(max_workers=fils) as pool:
        for r in pool.map(un, lot):
            if r:
                bons.append(r)
    bons.sort(key=lambda x: -x["preference"])
    return bons


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--etat", default="/tmp/reserve-etat.json",
                   help="export de plants et plant_images, produit par --preparer")
    a.add_argument("--profondeur", type=int, default=6)
    a.add_argument("--examiner", type=int, default=30,
                   help="candidats examinés au plus par organe")
    a.add_argument("--fils", type=int, default=6)
    a.add_argument("--cadence", type=float, default=0.25)
    a.add_argument("--slugs", default="", help="restreint la campagne, séparés par des virgules")
    a.add_argument("--dossier", default="/tmp/mon-jardin-reserve")
    a.add_argument("--sortie", default="/tmp/reserve-lignes.json")
    a.add_argument("--graine", type=int, default=17)
    o = a.parse_args()

    etat = json.load(open(o.etat, encoding="utf-8"))
    plantes = etat["plantes"]
    if o.slugs:
        garder = {x.strip() for x in o.slugs.split(",") if x.strip()}
        plantes = [p for p in plantes if p["slug"] in garder]

    os.makedirs(o.dossier, exist_ok=True)
    cadence = Cadence(o.cadence)
    random.seed(o.graine)

    # Les empreintes déjà en base, tous rangs et toutes plantes confondus : une
    # même photographie ne doit pas servir deux fiches ni deux rangs.
    prises = {cle_image(x) for x in etat["urls"]}
    # Les fiches partagent parfois un taxon, rosier et rosier grimpant par
    # exemple : la collecte GBIF se fait une fois par taxon.
    par_taxon = collections.defaultdict(list)
    for p in plantes:
        if p.get("gbif_usage_key"):
            par_taxon[p["gbif_usage_key"]].append(p)

    lignes, bilan = [], collections.Counter()
    total = len(par_taxon)
    for n, (taxon, groupe) in enumerate(sorted(par_taxon.items()), 1):
        besoins = []
        for p in groupe:
            for organe in A_REMPLIR:
                if not organe_attendu(p, organe):
                    continue
                deja = p["rangs"].get(organe, [])
                manque = o.profondeur - len(deja)
                if manque > 0:
                    besoins.append((p, organe, manque, max(deja) if deja else 0))
        if not besoins:
            continue
        noms = ", ".join(sorted({p["slug"] for p, *_ in besoins}))
        print(f"[{n}/{total}] taxon {taxon} : {noms}", flush=True)
        try:
            tous = candidats(taxon)
        except Exception as e:
            print(f"  collecte impossible : {e}", file=sys.stderr)
            continue
        # Le nom porté par l'observation doit s'accorder avec celui de la fiche.
        attendu = genre(groupe[0]["latin"])
        tous = [c for c in tous if not c["espece"] or genre(c["espece"]) == attendu]
        par_organe = collections.defaultdict(list)
        for c in tous:
            if c["organe"] and cle_image(c["url"]) not in prises:
                par_organe[c["organe"]].append(c)

        for p, organe, manque, rang_max in besoins:
            lot = [c for c in par_organe.get(organe, []) if cle_image(c["url"]) not in prises]
            random.shuffle(lot)
            # Neuf candidats sur dix passent les contrôles : en examiner quatre
            # de plus que le manque suffit, et divise la campagne par trois.
            lot = lot[:min(o.examiner, manque + 4)]
            if not lot:
                bilan["organe sans candidat"] += 1
                continue
            bons = examiner(lot, organe, p.get("couleurs") or [], o.dossier, cadence, o.fils)
            pris = 0
            for c in bons:
                if pris >= manque or rang_max + pris + 1 > 12:
                    break
                k = cle_image(c["url"])
                if k in prises:
                    continue
                prises.add(k)
                pris += 1
                lignes.append({
                    "plant_id": p["id"], "slug": p["slug"], "organe": organe,
                    "rang": rang_max + pris, "fonds": "plantnet",
                    "url": petite(c["url"]), "auteur": c["auteur"] or None,
                    "licence": "CC BY-SA", "source": c["source"] or None,
                    "preference": c["preference"]})
            bilan["images ajoutées"] += pris
            bilan["organes complétés" if pris >= manque else "organes incomplets"] += 1
            print(f"    {p['slug']} {organe} : {pris} sur {manque} demandées"
                  f" ({len(bons)} bonnes sur {len(lot)} examinées)", flush=True)
        json.dump(lignes, open(o.sortie, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print("\n".join(f"{k} : {v}" for k, v in bilan.most_common()))
    print(len(lignes), "lignes proposées dans", o.sortie)


if __name__ == "__main__":
    main()
