"""Mesures objectives sur une photographie de fiche.

Chaque mesure est un nombre lisible seul. Les seuils et la décision sont
ailleurs, dans controles.py : on sépare ce que l'image dit de ce qu'on en
conclut, pour pouvoir régler les seuils sans retoucher les mesures.

Repère de teinte d'OpenCV : H de 0 à 179, S et V de 0 à 255.
"""
import cv2, numpy as np

# Bandes de teinte, en degrés OpenCV.
VERT = (33, 88)          # feuillage, du vert jaune au vert bleuté
JAUNE_BRUN = (10, 32)    # jaunissement, rouille, taches sèches
PEAU = (0, 25)           # bande des carnations, à croiser avec S et V

def _bande(h, bornes):
    return (h >= bornes[0]) & (h <= bornes[1])

def mesurer(chemin):
    img = cv2.imread(chemin, cv2.IMREAD_COLOR)
    if img is None:
        return None
    hauteur, largeur = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    n = hauteur * largeur

    # Centre carré valant 40 pour cent du côté, là où le sujet est attendu.
    cy, cx = hauteur // 2, largeur // 2
    dy, dx = int(hauteur * 0.2), int(largeur * 0.2)
    centre = (slice(cy - dy, cy + dy), slice(cx - dx, cx + dx))
    masque_centre = np.zeros((hauteur, largeur), bool)
    masque_centre[centre] = True

    # Lumière. La médiane du cadre entier dit peu : une corolle blanche sur un
    # sous-bois noir donne une médiane basse alors que le sujet se lit très
    # bien. La lumière est donc mesurée aussi au centre, là où le sujet est.
    l_med = float(np.median(v))
    l_med_centre = float(np.median(v[centre]))
    p_sombre = float((v < 45).mean())
    p_sombre_centre = float((v[centre] < 45).mean())
    p_brule = float((v > 250).mean())
    q1, q3 = np.percentile(v, [10, 90])
    etendue = float(q3 - q1)

    # Netteté. Le laplacien mesure la variation locale : élevé au net, bas au
    # flou. Pris globalement il récompense l'encombrement, d'où le rapport
    # centre sur bord, qui dit si le sujet se détache du fond.
    lap = cv2.Laplacian(gris, cv2.CV_64F)
    net_global = float(lap.var())
    net_centre = float(lap[centre].var())
    bord = lap[~masque_centre]
    net_bord = float(bord.var()) if bord.size else 0.0
    rapport_net = net_centre / net_bord if net_bord > 1 else 0.0

    # Netteté du point le plus net du cadre. La variance globale récompense le
    # fond encombré et punit un sujet propre sur fond doux, qui est pourtant la
    # meilleure prise de vue. La netteté maximale locale dit l'inverse : si
    # même le meilleur carré du cadre est mou, l'image entière est floue.
    b = 32
    hb, wb = hauteur // b, largeur // b
    if hb > 0 and wb > 0:
        blocs = lap[:hb * b, :wb * b].reshape(hb, b, wb, b)
        net_blocs = blocs.var(axis=(1, 3))
        net_max = float(np.percentile(net_blocs, 98))
    else:
        net_max = net_global

    # Couleurs. Le seuil de saturation écarte les gris colorés du feuillage
    # à contre-jour, qui ne sont pas une couleur de fleur.
    sature = (s > 80) & (v > 60)
    vert = _bande(h, VERT) & (s > 55)
    hors_vert = sature & ~_bande(h, VERT)
    p_vert = float(vert.mean())

    # Feuillage au sens large. Le vert franc laisse de côté les feuillages
    # glauques et argentés, lavande, immortelle, absinthe, euphorbe, oeillet,
    # qui sont dans la bande verte mais peu saturés. La bande basse les
    # recueille sans ramasser la pierre, dont la teinte n'est pas verte, ni
    # l'herbe sèche, qui est plus jaune.
    glauque = _bande(h, VERT) & (s > 15) & (s <= 55) & (v > 60) & (v < 215)
    feuillage = vert | glauque
    p_feuillage = float(feuillage.mean())
    p_feuillage_centre = float(feuillage[centre].mean())
    p_hors_vert = float(hors_vert.mean())
    p_vert_centre = float(vert[centre].mean())
    p_hors_vert_centre = float(hors_vert[centre].mean())

    # Masque de corolle. Le seul critère de saturation rend aveugle au blanc,
    # qui est la couleur de fleur la plus répandue du catalogue : achillée,
    # sureau, cornouiller, pavot, cerisier. Une seconde bande recueille donc le
    # clair peu coloré. Le ciel et un fond brûlé tombent dans la même bande :
    # ils en sont retirés par leur forme, une plage large touchant le haut du
    # cadre, ce qu'une corolle ne fait presque jamais.
    blanc = (s < 50) & (v > 195)
    mb = (blanc.astype(np.uint8)) * 255
    if mb.any():
        nbb, lab, st, _ = cv2.connectedComponentsWithStats(
            cv2.morphologyEx(mb, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), 8)
        for i in range(1, nbb):
            if st[i, cv2.CC_STAT_TOP] <= 2 and st[i, cv2.CC_STAT_WIDTH] > largeur * 0.6:
                blanc[lab == i] = False
    corolle = hors_vert | (blanc & ~_bande(h, VERT))
    p_corolle = float(corolle.mean())

    # Plus grande tache de couleur non verte : un bouton isolé fait quelques
    # pour cent, une corolle ouverte en occupe beaucoup plus.
    tache = 0.0
    m = (corolle.astype(np.uint8)) * 255
    if m.any():
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        nb, _, stats, _ = cv2.connectedComponentsWithStats(m, 8)
        if nb > 1:
            tache = float(stats[1:, cv2.CC_STAT_AREA].max()) / n

    # Taches sur le feuillage. Mesurées dans le voisinage du vert et non sur
    # tout le cadre, sans quoi une terre brune en fond compte pour une rouille.
    # Le masque vert est dilaté puis les pixels jaune-brun qui y tombent sont
    # rapportés à ce voisinage.
    mv = (vert.astype(np.uint8)) * 255
    voisinage = cv2.dilate(mv, np.ones((15, 15), np.uint8)) > 0
    jb = _bande(h, JAUNE_BRUN) & (s > 60) & (v > 40) & voisinage
    p_taches = float(jb.sum() / voisinage.sum()) if voisinage.sum() > n * 0.05 else 0.0

    # Nombre de taches de couleur distinctes et leur saturation : une grappe de
    # fruits fait plusieurs petites taches vives, une corolle en fait une grande.
    n_taches = 0
    if m.any():
        for a in stats[1:, cv2.CC_STAT_AREA]:
            if a / n > 0.003:
                n_taches += 1
    sat_hors_vert = float(s[hors_vert].mean()) if hors_vert.sum() > n * 0.002 else 0.0

    # Carnation, pour repérer une main tenant le rameau. Mesure conservée pour
    # mémoire : elle se déclenche aussi sur une terre brune et un bois sec, et
    # ne sert donc aucun contrôle.
    peau = _bande(h, PEAU) & (s > 45) & (s < 175) & (v > 90)
    p_peau = float(peau.mean())

    # Fond artificiel. La couronne extérieure du cadre est examinée : un sujet
    # posé sur une table, une feuille de papier ou un mur y laisse une zone à la
    # fois peu colorée et sans relief. Le relief est pris sur un flou léger,
    # pour ne pas compter le bruit du capteur.
    couronne = ~np.zeros((hauteur, largeur), bool)
    my, mx = int(hauteur * 0.2), int(largeur * 0.2)
    couronne[my:hauteur - my, mx:largeur - mx] = False
    relief = cv2.Laplacian(cv2.GaussianBlur(gris, (5, 5), 0), cv2.CV_64F)
    plat = np.abs(relief) < 4
    p_fond_uni = float((couronne & (s < 45) & plat).sum() / couronne.sum())

    # Échelle de la texture. Le rapport entre le relief à pleine résolution et
    # le relief après réduction au quart sépare une texture fine et répétée,
    # houppier, prairie, massif, d'un gros plan aux grandes plages lisses.
    petit = cv2.resize(gris, (max(largeur // 4, 8), max(hauteur // 4, 8)),
                       interpolation=cv2.INTER_AREA)
    net_petit = float(cv2.Laplacian(petit, cv2.CV_64F).var())
    finesse = net_global / net_petit if net_petit > 1 else 0.0

    # Ciel dans le tiers supérieur, indice qu'une plante est vue de loin.
    haut = slice(0, max(hauteur // 3, 1))
    ciel = (_bande(h[haut], (90, 130)) & (s[haut] > 20) & (v[haut] > 140)) | \
           ((s[haut] < 30) & (v[haut] > 200))
    p_ciel = float(ciel.mean())

    # Teinte dominante de la couleur non verte, pour confronter aux couleurs
    # de fleur du référentiel.
    teinte = None
    if hors_vert.sum() > n * 0.005:
        teinte = float(np.median(h[hors_vert]) * 2)  # ramené en degrés

    return {
        "largeur": largeur, "hauteur": hauteur,
        "rapport": round(largeur / hauteur, 3),
        "l_med": round(l_med, 1), "l_med_centre": round(l_med_centre, 1),
        "p_sombre": round(p_sombre, 4),
        "p_sombre_centre": round(p_sombre_centre, 4),
        "p_brule": round(p_brule, 4), "etendue": round(etendue, 1),
        "net_global": round(net_global, 1), "net_centre": round(net_centre, 1),
        "net_max": round(net_max, 1), "rapport_net": round(rapport_net, 2),
        "p_corolle": round(p_corolle, 4),
        "p_vert": round(p_vert, 4), "p_feuillage": round(p_feuillage, 4),
        "p_feuillage_centre": round(p_feuillage_centre, 4),
        "p_hors_vert": round(p_hors_vert, 4),
        "p_vert_centre": round(p_vert_centre, 4),
        "p_hors_vert_centre": round(p_hors_vert_centre, 4),
        "tache": round(tache, 4), "n_taches": n_taches,
        "p_taches": round(p_taches, 4), "sat_hv": round(sat_hors_vert, 1),
        "p_peau": round(p_peau, 4),
        "p_fond_uni": round(p_fond_uni, 4), "finesse": round(finesse, 2),
        "p_ciel": round(p_ciel, 4),
        "teinte": round(teinte, 1) if teinte is not None else None,
    }
