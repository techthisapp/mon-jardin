#!/usr/bin/env python3
"""Campagne de sourçage sur Wikimedia Commons, pour les organes que Pl@ntNet
ne couvre pas.

Usage :
    python3 outils/photos/commons.py --etat /tmp/manques.json \\
        [--examiner 14] [--fils 6] [--sortie /tmp/commons.json] [--reprendre]

Pl@ntNet observe peu les variétés de jardin : maïs doux, pois, piéris, abélia,
artichaut, brocoli, chou kale, lentille. La seconde source est Commons, avec la
réserve que l'organe s'y déduit d'une catégorie et non d'une déclaration
d'observateur. Trois garde-fous en découlent.

Le premier, la catégorie d'organe. Les candidats viennent des sous-catégories du
taxon qui nomment l'organe, « Flowers of Rosa canina », « Rosa canina leaves »,
et non de la catégorie du taxon en vrac.

Le deuxième, le titre. Le nom de fichier est une assertion d'identité : s'il
porte un binôme latin, ce binôme doit s'accorder au genre de la fiche. C'est ce
contrôle qui avait démasqué une fleur de poireau sur la fiche carotte.

Le troisième, l'oeil. Le programme n'écrit rien en base : il rend un fichier
JSON, relu sur planche de contact avant chargement.

Dépendances : opencv-python-headless, numpy.
"""
import argparse, collections, json, os, re, sys, threading, time
import urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mesures, controles, reserve

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "mon-jardin/1.0 (jerome.prunis@gmail.com)"}
# Échelle fixe de Commons. La tuile demande 250 points, le plein écran 1280 ;
# le chemin porte une empreinte que l'on ne construit pas à la main.
LARGEUR_TUILE = 250
LARGEUR_MESURE = 1024

# Les mots que les catégories de Commons emploient pour nommer un organe. Une
# catégorie qui n'en porte aucun ne sert pas : elle mêlerait les organes.
MOTS = {
    "fleur": ["flowers", "flower", "fleurs", "blüten", "inflorescences"],
    "feuille": ["leaves", "leaf", "feuilles", "blätter", "foliage"],
    "fruit": ["fruit", "fruits", "früchte", "berries", "seeds", "cones"],
    "ecorce": ["bark", "trunk", "stems", "écorce", "rinde"],
    "port": ["habit", "habitus", "plants", "trees", "shrubs"],
}
# Ce qui n'est pas une prise de vue de terrain de la plante vivante.
REJETS = re.compile(
    r"herbarium|herbier|specimen|naturalis|botanical illustration|"
    r"illustration|drawing|engraving|plate |lithograph|painting|"
    r"stamp|coin|logo|map |diagram|micrograph|microscop|"
    r"\.pdf$|\.svg$|\.tif$|\.tiff$|\.webm$|\.ogv$|\.gif$", re.I)

verrou = threading.Lock()


def _lire(url, essais=3, entetes=None):
    dernier = None
    for k in range(essais):
        try:
            r = urllib.request.Request(url, headers=entetes or UA)
            with urllib.request.urlopen(r, timeout=45) as f:
                return f.read()
        except Exception as e:
            dernier = e
            time.sleep(1.5 * (k + 1))
    raise dernier


def api(**p):
    p.setdefault("format", "json")
    p.setdefault("action", "query")
    return json.loads(_lire(API + "?" + urllib.parse.urlencode(p)))


def sous_categories(taxon):
    d = api(list="categorymembers", cmtitle="Category:" + taxon,
            cmnamespace=14, cmlimit=200)
    return [x["title"][9:] for x in d.get("query", {}).get("categorymembers", [])]


def fichiers(categorie, limite=120):
    d = api(list="categorymembers", cmtitle="Category:" + categorie,
            cmnamespace=6, cmlimit=limite)
    return [x["title"][5:] for x in d.get("query", {}).get("categorymembers", [])]


def organe_de(nom):
    """Commons nomme ses sous-catégories de plusieurs façons, « Rosa canina
       (flowers) », « Rosa canina leaves », « Flowers of Rosa canina » : la
       ponctuation est neutralisée avant la lecture du mot."""
    n = " " + re.sub(r"[^A-Za-zÀ-ÿ]+", " ", nom).lower().strip() + " "
    for organe, mots in MOTS.items():
        if any(" " + m + " " in n for m in mots):
            return organe
    return None


def categorie_du_taxon(taxon):
    """La catégorie porte parfois un autre nom que la fiche : hybride écrit avec
       le signe multiplié, nom accepté différent. On la cherche quand le nom
       direct ne rend rien."""
    if sous_categories(taxon):
        return taxon
    variantes = [taxon.replace(" x ", " × "), taxon.replace(" × ", " x ")]
    for v in variantes:
        if v != taxon and sous_categories(v):
            return v
    try:
        d = api(list="search", srsearch=taxon, srnamespace=14, srlimit=3)
        for x in d.get("query", {}).get("search", []):
            nom = x["title"][9:]
            if (len(nom.split(" ")) >= 2
                    and nom.lower().startswith(taxon.split(" ")[0].lower())
                    and sous_categories(nom)):
                return nom
    except Exception:
        pass
    return None


def infos(titres):
    """Adresse de tuile, adresse de mesure, auteur, licence, page."""
    out = {}
    for i in range(0, len(titres), 20):
        lot = titres[i:i + 20]
        for largeur, cle in ((LARGEUR_TUILE, "tuile"), (LARGEUR_MESURE, "mesure")):
            d = api(titles="|".join("File:" + t for t in lot), prop="imageinfo",
                    iiprop="url|size|extmetadata", iiurlwidth=str(largeur))
            for p in d.get("query", {}).get("pages", {}).values():
                ii = (p.get("imageinfo") or [{}])[0]
                if not ii.get("thumburl"):
                    continue
                t = p["title"][5:]
                e = out.setdefault(t, {})
                e[cle] = ii["thumburl"]
                if cle == "tuile":
                    em = ii.get("extmetadata", {})
                    auteur = re.sub("<[^>]+>", " ", (em.get("Artist") or {}).get("value", "") or "")
                    e["auteur"] = re.sub(r"\s+", " ", auteur).strip()[:120]
                    e["licence"] = (em.get("LicenseShortName") or {}).get("value") or ""
                    e["page"] = ii.get("descriptionurl")
            time.sleep(0.25)
    return {k: v for k, v in out.items() if v.get("tuile") and v.get("mesure")}


LICENCES_REFUSEES = re.compile(r"fair use|non[- ]free|all rights", re.I)


def accord_de_genre(titre, genre):
    """Un titre qui porte un binôme latin doit s'accorder au genre de la fiche."""
    m = re.search(r"\b([A-Z][a-z]{3,})\s+([a-z]{3,})\b", titre)
    if not m:
        return True
    tete = m.group(1).lower()
    if tete in ("file", "image", "photo", "category"):
        return True
    return tete == (genre or "").lower()


def candidats(plante, organes):
    """Les fichiers des sous-catégories d'organe du taxon, par organe voulu."""
    voulus = collections.defaultdict(list)
    noms = [n for n in (plante.get("latin"), plante.get("gbif_accepted_name")) if n]
    vus = set()
    for taxon in noms:
        taxon = re.sub(r"\s+(var|subsp|f)\.\s+\S+$", "", taxon).strip()
        try:
            # Une catégorie sans sous-catégorie n'est pas une catégorie absente :
            # elle porte souvent ses fichiers en vrac, et c'est le cas de la
            # plupart des fiches. Le nom d'origine reste donc le repli.
            taxon = categorie_du_taxon(taxon) or taxon
            scs = sous_categories(taxon)
        except Exception:
            continue
        for sc in scs:
            o = organe_de(sc)
            if o not in organes:
                continue
            try:
                lot = fichiers(sc)
            except Exception:
                continue
            for t in lot:
                if t in vus or REJETS.search(t):
                    continue
                if not accord_de_genre(t, plante.get("genus")):
                    continue
                vus.add(t)
                voulus[o].append(t)
            time.sleep(0.15)
        # Repli sur la catégorie du taxon elle-même, l'organe se lisant alors
        # dans le nom du fichier. C'est le cas le moins sûr, celui que la
        # relecture à l'oeil doit rattraper.
        try:
            lot = fichiers(taxon)
        except Exception:
            lot = []
        for t in lot:
            if t in vus or REJETS.search(t):
                continue
            o = organe_de(os.path.splitext(t)[0])
            if o not in organes or not accord_de_genre(t, plante.get("genus")):
                continue
            vus.add(t)
            voulus[o].append(t)
        time.sleep(0.15)
    return voulus


def examiner(plante, organe, titre, meta, dossier):
    """Télécharge, mesure, contrôle. Les seuils sont ceux du versement : les
       candidats se comptent par dizaines, écarter à tort ne coûte rien."""
    chemin = os.path.join(dossier, re.sub(r"[^\w.-]", "_", titre)[-90:])
    try:
        with open(chemin, "wb") as f:
            f.write(_lire(meta["mesure"]))
    except Exception as e:
        return {"titre": titre, "rejet": "téléchargement : " + str(e)[:60]}
    m = mesures.mesurer(chemin)
    if m is None:
        return {"titre": titre, "rejet": "format inexploitable"}
    motifs = controles.controler(m, organe, plante.get("flower_colors"))
    if motifs:
        return {"titre": titre, "rejet": ", ".join(motifs)}
    return {"titre": titre, "chemin": chemin,
            "preference": round(reserve.preference(organe, m), 4)}


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--etat", required=True)
    a.add_argument("--examiner", type=int, default=14)
    a.add_argument("--fils", type=int, default=6)
    a.add_argument("--sortie", default="/tmp/commons.json")
    a.add_argument("--dossier", default="/tmp/commons-images")
    o = a.parse_args()

    os.makedirs(o.dossier, exist_ok=True)
    etat = json.load(open(o.etat))
    lignes, vus = [], set()
    for plante in etat:
        organes = set(plante["manques"])
        if not organes:
            continue
        pool = candidats(plante, organes)
        for organe in sorted(organes):
            titres = pool.get(organe, [])[: o.examiner]
            if not titres:
                print(f"{plante['slug']:26s} {organe:8s} aucun candidat", flush=True)
                continue
            meta = infos(titres)
            gardes = []
            with ThreadPoolExecutor(max_workers=o.fils) as ex:
                for r in ex.map(lambda t: examiner(plante, organe, t, meta[t], o.dossier),
                                [t for t in titres if t in meta]):
                    if "rejet" not in r:
                        gardes.append(r)
            gardes.sort(key=lambda x: -x["preference"])
            manque = plante["manques"][organe]
            for r in gardes[:manque]:
                m = meta[r["titre"]]
                if LICENCES_REFUSEES.search(m.get("licence") or ""):
                    continue
                if m["tuile"] in vus:
                    continue
                vus.add(m["tuile"])
                lignes.append({"plant_id": plante["id"], "slug": plante["slug"],
                               "organe": organe, "url": m["tuile"],
                               "auteur": m["auteur"] or "auteur non renseigné",
                               "licence": m["licence"] or "CC BY-SA",
                               "source": m["page"], "fonds": "commons",
                               "titre": r["titre"], "chemin": r["chemin"],
                               "preference": r["preference"]})
            print(f"{plante['slug']:26s} {organe:8s} {len(titres):3d} vus, "
                  f"{len(gardes):3d} passent, {min(len(gardes), manque)} retenus", flush=True)
        json.dump(lignes, open(o.sortie, "w"), ensure_ascii=False)
    print(f"\n{len(lignes)} lignes proposées, écrites dans {o.sortie}")


if __name__ == "__main__":
    main()
