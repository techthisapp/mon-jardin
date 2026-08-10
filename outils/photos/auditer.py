#!/usr/bin/env python3
"""Audit des photographies affichées par les fiches.

Usage :
    python3 outils/photos/auditer.py --cle <clé anonyme Supabase> [--dossier /tmp/photos]

Lit la table plant_images, reconstitue les tuiles que l'application affiche,
télécharge chaque image à la taille du plein écran, applique les contrôles de
outils/photos/controles.py et de outils/photos/coherence.py, puis écrit un
relevé JSON et un résumé lisible.

L'option --verdicts rend en outre le jugement porté sur chaque tuile examinée,
motifs compris quand ils sont vides, sous une forme chargeable en base dans les
colonnes controle_motifs, controle_score et controle_le. Un relevé qui ne porte
que les tuiles fautives ne permettrait pas de distinguer l'image jugée bonne de
l'image jamais jugée.

Ce script n'est pas dans la chaîne de contrôle avant dépôt : il dépend
d'OpenCV et du réseau, et n'a de sens qu'après un ajout ou un remplacement de
photographies. Il ne modifie rien, il signale.

Dépendances : opencv-python-headless, numpy.
"""
import argparse, collections, json, os, queue, sys, threading, time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mesures, controles, coherence

BASE = "https://ocsjpojdddmltluzmmwv.supabase.co/rest/v1"
ORDRE = ["fleur", "feuille", "fruit", "racine", "port", "ecorce"]

def lire_table(nom, colonnes, cle):
    lignes, offset = [], 0
    while True:
        u = f"{BASE}/{nom}?select={colonnes}&limit=1000&offset={offset}"
        r = urllib.request.Request(u, headers={"apikey": cle, "Authorization": "Bearer " + cle})
        with urllib.request.urlopen(r, timeout=60) as f:
            lot = json.loads(f.read())
        lignes += lot
        if len(lot) < 1000:
            return lignes
        offset += 1000

def grande(url, fonds):
    """L'adresse servie par le plein écran, seule taille qu'il faut juger."""
    if fonds == "plantnet":
        return url.replace("/image/s/", "/image/m/")
    import re
    return re.sub(r"(/thumb/.+/)\d+px-", r"\g<1>500px-", url or "")

def tuiles_affichees(images, plantes):
    """Le plus petit rang retenu de chaque organe, règle reprise de app.js."""
    par = collections.defaultdict(dict)
    for x in images:
        if x["retenue"] is False:
            continue
        c = par[x["plant_id"]].get(x["organe"])
        if c is None or x["rang"] < c["rang"]:
            par[x["plant_id"]][x["organe"]] = x
    out = []
    for pid, d in par.items():
        p = plantes.get(pid)
        if not p:
            continue
        for o in ORDRE:
            if o in d:
                x = d[o]
                out.append({"slug": p["slug"], "nom": p["name"], "organe": o,
                            "id": x.get("id"),
                            "rang": x["rang"], "url": x["url"], "auteur": x["auteur"],
                            "source": x["source"], "fonds": x["fonds"],
                            "port": p.get("habit"), "categorie": p.get("category"),
                            "couleurs": p.get("flower_colors") or [],
                            "grande": grande(x["url"], x["fonds"])})
    out.sort(key=lambda t: (t["slug"], ORDRE.index(t["organe"])))
    return out

# Wikimedia refuse les rafales et rend alors une erreur : deux fils et une demi
# seconde d'attente, contre six fils chez Pl@ntNet qui les accepte. Trois
# tentatives dans les deux cas, un refus passager ne devant pas se lire ensuite
# comme une image illisible.
CADENCES = {"upload.wikimedia.org": (2, 0.5)}

def telecharger(urls, dossier):
    os.makedirs(dossier, exist_ok=True)
    par_hote = collections.defaultdict(list)
    for u in urls:
        par_hote[u.split("/")[2]].append(u)
    for hote, lot in par_hote.items():
        fils, delai = CADENCES.get(hote, (6, 0.25))
        q = queue.Queue()
        for u in lot:
            q.put(u)
        def travailler():
            while True:
                try:
                    u = q.get_nowait()
                except queue.Empty:
                    return
                c = os.path.join(dossier, u.rsplit("/", 1)[-1] + ".jpg")
                if not (os.path.exists(c) and os.path.getsize(c) > 1000):
                    for essai in range(3):
                        try:
                            r = urllib.request.Request(u, headers={"User-Agent":
                                "mon-jardin/audit (https://techthisapp.github.io/mon-jardin)"})
                            with urllib.request.urlopen(r, timeout=45) as f, open(c, "wb") as g:
                                g.write(f.read())
                            break
                        except Exception:
                            time.sleep(1.5)
                    time.sleep(delai)
                q.task_done()
        t = [threading.Thread(target=travailler) for _ in range(fils)]
        [x.start() for x in t]
        [x.join() for x in t]

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--cle", required=True, help="clé anonyme Supabase, celle de config.js")
    a.add_argument("--dossier", default="/tmp/mon-jardin-photos")
    a.add_argument("--releve", default="/tmp/mon-jardin-photos/releve.json")
    a.add_argument("--verdicts", default="", help="fichier de verdicts à charger en base")
    o = a.parse_args()

    images = lire_table("plant_images",
                        "id,plant_id,organe,rang,url,retenue,auteur,licence,source,fonds", o.cle)
    plantes = {p["id"]: p for p in lire_table(
        "plants", "id,slug,name,latin,flower_colors,category,habit", o.cle)}
    tuiles = tuiles_affichees(images, plantes)
    print(f"{len(tuiles)} tuiles affichées sur {len({t['slug'] for t in tuiles})} fiches")

    telecharger(sorted({t["grande"] for t in tuiles}), o.dossier)
    mes = {}
    for u in sorted({t["grande"] for t in tuiles}):
        c = os.path.join(o.dossier, u.rsplit("/", 1)[-1] + ".jpg")
        if os.path.exists(c):
            mes[u] = mesures.mesurer(c)

    ports = {t["slug"]: t["port"] for t in tuiles}
    cats = {t["slug"]: t["categorie"] for t in tuiles}
    coh = coherence.controler_lot(tuiles)
    inc = coherence.organe_compatible(tuiles, ports, cats)
    releve, compte, verdicts = [], collections.Counter(), []
    for t in tuiles:
        m = mes.get(t["grande"])
        motifs = controles.controler(m, t["organe"], t["couleurs"])
        motifs += coh.get((t["slug"], t["organe"]), [])
        motifs += inc.get((t["slug"], t["organe"]), [])
        if t.get("id") and m is not None:
            verdicts.append({"i": t["id"], "m": motifs,
                             "s": controles.suspicion(m, t["organe"])})
        if motifs:
            releve.append({**{k: t[k] for k in ("slug", "nom", "organe", "rang", "url", "port")},
                           "motifs": motifs, "score": controles.suspicion(m, t["organe"])})
            for x in motifs:
                compte[x.split(",")[0].split(" occupe")[0].split(" avec ")[0][:52]] += 1
    releve.sort(key=lambda r: -r["score"])
    os.makedirs(os.path.dirname(o.releve), exist_ok=True)
    json.dump(releve, open(o.releve, "w"), ensure_ascii=False, indent=1)

    print(f"{len(releve)} tuiles signalées sur {len(tuiles)}, "
          f"{len({r['slug'] for r in releve})} fiches touchées")
    for k, v in compte.most_common():
        print(f"{v:5d}  {k}")
    manque = coherence.manques(tuiles)
    if manque:
        print(f"\n{len(manque)} fiches sans un organe attendu")
    if o.verdicts:
        json.dump(verdicts, open(o.verdicts, "w"), ensure_ascii=False)
        print(f"{len(verdicts)} verdicts écrits dans {o.verdicts}")
    print(f"\nrelevé complet : {o.releve}")

if __name__ == "__main__":
    main()
