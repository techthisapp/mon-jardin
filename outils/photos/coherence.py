"""Contrôles de cohérence sur un lot de photographies.

Ces contrôles ne regardent pas les pixels : ils comparent les lignes entre
elles. Une même photographie servant deux fiches différentes, ou deux organes
de la même fiche, est une erreur d'affectation que l'analyse d'image ne peut
pas voir, puisque chaque image prise seule est irréprochable.
"""
import collections

def controler_lot(tuiles):
    """Rend un dictionnaire, clé (slug, organe), valeur liste de motifs.

    Chaque tuile porte au moins slug, organe, url et source.
    """
    motifs = collections.defaultdict(list)

    # Une même image sur deux fiches différentes.
    par_url = collections.defaultdict(set)
    for t in tuiles:
        par_url[t["url"]].add(t["slug"])
    for t in tuiles:
        autres = sorted(par_url[t["url"]] - {t["slug"]})
        if autres:
            motifs[(t["slug"], t["organe"])].append(
                "image partagée avec " + ", ".join(autres))

    # Une même image sur deux organes de la même fiche.
    par_fiche = collections.defaultdict(lambda: collections.defaultdict(list))
    for t in tuiles:
        par_fiche[t["slug"]][t["url"]].append(t["organe"])
    for slug, d in par_fiche.items():
        for url, organes in d.items():
            if len(organes) > 1:
                for o in organes:
                    motifs[(slug, o)].append(
                        "image répétée pour les organes " + ", ".join(sorted(organes)))

    # Plusieurs organes tirés de la même observation : les prises de vue sont
    # souvent quasi identiques, la bande perd alors son intérêt.
    par_obs = collections.defaultdict(lambda: collections.defaultdict(list))
    for t in tuiles:
        if t.get("source"):
            par_obs[t["slug"]][t["source"]].append(t["organe"])
    for slug, d in par_obs.items():
        for src, organes in d.items():
            if len(organes) > 2:
                for o in organes:
                    motifs[(slug, o)].append(
                        f"{len(organes)} organes tirés de la même observation")

    # Un organe manquant sur une fiche où il est attendu.
    return motifs

# Ports qui portent une écorce lisible. Une plante herbacée, un bulbe et une
# graminée n'en ont pas : la tuile écorce d'une de ces fiches montre forcément
# autre chose, une tige, une souche voisine, le sol. Le sous-arbrisseau, thym,
# lavande, sauge, garde une base ligneuse et reste admis.
PORTS_LIGNEUX = {"arbre", "arbuste", "liane", "sous_arbrisseau"}

# Catégories de légumes dont le fruit n'est jamais vu. Le fruit y est celui du
# porte-graine, monté après la récolte : la silique de la laitue, l'ombelle de
# la carotte, la fleur montée de l'oignon. Le jardinier ne les reconnaît pas et
# la tuile ne lui apprend rien. Les fruits d'été, les légumineuses et les choux
# ne sont pas concernés, leur fruit est ce qu'on récolte ou ce qu'on sème.
CATEGORIES_SANS_FRUIT = {"Feuilles", "Racines", "Bulbes"}

def organe_compatible(tuiles, ports, categories=None):
    """Signale une tuile dont l'organe n'existe pas ou n'a pas d'objet."""
    categories = categories or {}
    motifs = {}
    for t in tuiles:
        p = ports.get(t["slug"])
        if t["organe"] == "ecorce" and p and p not in PORTS_LIGNEUX:
            motifs[(t["slug"], t["organe"])] = [
                f"organe sans objet, une plante de port {p.replace('_', ' ')} "
                f"n'a pas d'écorce"]
        c = categories.get(t["slug"])
        if t["organe"] == "fruit" and c in CATEGORIES_SANS_FRUIT:
            motifs[(t["slug"], t["organe"])] = [
                f"organe sans objet, le fruit d'un légume de la catégorie "
                f"{c.lower()} est celui du porte-graine"]
    return motifs

# Organes attendus selon le port et la typologie, pour signaler un manque.
def organes_attendus(port, typologie):
    a = {"fleur", "feuille", "port"}
    if port in PORTS_LIGNEUX:
        a.add("ecorce")
    return a

def manques(tuiles):
    """Rend, par fiche, la liste des organes attendus et absents."""
    par = collections.defaultdict(set)
    info = {}
    for t in tuiles:
        par[t["slug"]].add(t["organe"])
        info[t["slug"]] = (t.get("port"), t.get("categorie"))
    r = {}
    for slug, presents in par.items():
        p, c = info[slug]
        absents = sorted(organes_attendus(p, c) - presents)
        if absents:
            r[slug] = absents
    return r
