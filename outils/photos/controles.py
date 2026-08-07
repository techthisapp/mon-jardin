"""Contrôles automatiques sur une photographie de fiche.

Trois familles.

Les contrôles généraux valent pour toute tuile, quel que soit l'organe : ils
écartent une image que personne ne voudrait voir, trop sombre, brûlée, floue,
au format inexploitable.

Les contrôles de sujet disent si l'image montre bien ce que l'étiquette
annonce : une corolle sur une tuile fleur, du feuillage sur une tuile feuille.

Les contrôles de cohérence, dans coherence.py, comparent les lignes entre
elles et non les pixels.

Chaque contrôle rend un motif de rejet lisible, jamais un simple booléen : le
motif est ce qui permet de relire une décision et de régler un seuil.

Seuils arrêtés sur les 933 images du catalogue, planche contact à l'appui pour
chaque mesure : le seuil est posé là où le jugement bascule, en acceptant de
laisser passer des cas douteux plutôt que d'écarter des images correctes. Un
contrôle qui écarte une bonne image ne sert à rien, puisqu'il sera désactivé.

Deux mesures ont été essayées et retirées, elles sont contraires à la qualité :
la variance globale du laplacien, qui récompense un fond encombré et punit un
sujet propre sur fond doux, et le rapport de netteté du centre sur le bord, qui
est au plus bas sur les meilleurs gros plans. La netteté est donc mesurée par
le meilleur carré du cadre, la netteté maximale locale.
"""

# Contrôles généraux, appliqués à toutes les tuiles.
def generaux(m):
    r = []
    if m["p_sombre"] > 0.55 or (m["l_med"] < 50 and m["l_med_centre"] < 100):
        r.append(f"sous-exposée, luminance médiane {m['l_med']:.0f} sur 255, "
                 f"{m['p_sombre'] * 100:.0f} pour cent de pixels presque noirs")
    if m["p_brule"] > 0.15:
        r.append(f"surexposée, {m['p_brule'] * 100:.0f} pour cent de blancs brûlés")
    if m["etendue"] < 45:
        r.append(f"sans contraste, étendue de luminance {m['etendue']:.0f}")
    if m["net_max"] < 250:
        r.append(f"floue, le carré le plus net du cadre ne dépasse pas {m['net_max']:.0f}")
    if not 0.5 <= m["rapport"] <= 2.0:
        r.append(f"format {m['rapport']:.2f}, le recadrage carré perdrait le sujet")
    return r

# L'absence de sujet végétal ne vaut pas pour l'écorce, dont le cadre est par
# nature sans feuillage et sans couleur.
def sans_sujet(m, organe):
    if organe == "ecorce":
        return []
    if m["p_feuillage"] < 0.12 and m["tache"] < 0.05 and m["p_corolle"] < 0.12:
        return ["cadre sans sujet végétal, ni feuillage ni masse colorée, "
                "sol nu, bois sec ou litière"]
    return []

# Contrôles de sujet. Chacun répond à une seule question : l'image montre-t-elle
# l'organe annoncé, et sous une forme reconnaissable.
def fleur(m, couleurs=None):
    r = []
    if m["tache"] < 0.02 and m["p_corolle"] < 0.06:
        r.append(f"pas de fleur lisible, la plus grande masse colorée occupe "
                 f"{m['tache'] * 100:.1f} pour cent du cadre et l'ensemble du "
                 f"non-vert {m['p_corolle'] * 100:.1f} pour cent, ce qui est un "
                 f"bouton, une fleur trop lointaine ou une fleur absente")
    if m["p_vert_centre"] > 0.80:
        r.append(f"centre occupé par le feuillage à {m['p_vert_centre'] * 100:.0f} pour cent")
    if couleurs and m["teinte"] is not None and m["tache"] > 0.05 \
            and not _teinte_compatible(m["teinte"], couleurs):
        r.append(f"teinte dominante {m['teinte']:.0f} degrés, incompatible avec "
                 f"les couleurs du référentiel : {', '.join(couleurs)}")
    return r

def feuille(m):
    r = []
    if m["p_feuillage"] < 0.22:
        r.append(f"le feuillage n'est pas le sujet, {m['p_feuillage'] * 100:.0f} pour "
                 f"cent de feuillage dans le cadre")
    elif m["p_taches"] > 0.35:
        r.append(f"feuillage abîmé ou sénescent, {m['p_taches'] * 100:.0f} pour cent "
                 f"de taches jaunes ou brunes dans le voisinage du vert")
    return r

def fruit(m):
    r = []
    if m["tache"] < 0.02 and m["p_corolle"] < 0.06:
        r.append(f"pas de fruit lisible, la plus grande masse colorée occupe "
                 f"{m['tache'] * 100:.1f} pour cent du cadre")
    return r

def ecorce(m):
    r = []
    if m["p_vert"] > 0.75:
        r.append(f"feuillage dominant à {m['p_vert'] * 100:.0f} pour cent, "
                 f"l'écorce n'est pas le sujet")
    return r

def port(m):
    r = []
    if m["p_feuillage"] < 0.12:
        r.append(f"végétation absente du cadre, {m['p_feuillage'] * 100:.0f} pour cent de feuillage")
    return r

PAR_ORGANE = {"fleur": fleur, "feuille": feuille, "fruit": fruit,
              "ecorce": ecorce, "port": port}

# Teintes de référence en degrés, pour confronter la couleur mesurée aux clés
# de flower_colors. Les clés larges ne contraignent rien.
TEINTES = {
    "blanc": None, "multicolore": None, "vert": None,
    "jaune": (40, 70), "orange": (15, 45), "rouge": (330, 20),
    "rose": (300, 355), "violet": (260, 320), "bleu": (200, 265),
    "pourpre": (280, 340), "brun": (10, 40),
}

def _teinte_compatible(t, couleurs, marge=25):
    bornes = [TEINTES.get(c) for c in couleurs]
    if any(b is None for b in bornes) or not bornes:
        return True
    for a, z in bornes:
        a, z = (a - marge) % 360, (z + marge) % 360
        if (a <= z and a <= t <= z) or (a > z and (t >= a or t <= z)):
            return True
    return False

def controler(m, organe, couleurs=None):
    """Rend la liste des motifs de rejet. Vide, l'image passe."""
    if m is None:
        return ["image illisible"]
    motifs = generaux(m) + sans_sujet(m, organe)
    f = PAR_ORGANE.get(organe)
    if f:
        motifs += f(m, couleurs) if organe == "fleur" else f(m)
    return motifs

# Score de suspicion, pour trier un catalogue déjà en place plutôt que pour
# décider. Les contrôles sont calés en précision : ils ne signalent que le cas
# franc. Le score, lui, ordonne le doute, ce qui permet de relire à l'oeil la
# tête de liste sans relire les mille tuiles.
def suspicion(m, organe):
    if m is None:
        return 100.0
    s = 0.0
    s += max(0.0, (110 - m["l_med_centre"]) / 110) * 2.0
    s += max(0.0, (m["p_sombre"] - 0.30)) * 3.0
    s += max(0.0, (1500 - m["net_max"]) / 1500) * 2.5
    s += max(0.0, (m["p_brule"] - 0.05)) * 4.0
    if organe in ("fleur", "fruit"):
        s += max(0.0, (0.12 - m["tache"]) / 0.12) * 2.0
        s += max(0.0, (0.20 - m["p_corolle"]) / 0.20) * 1.5
    if organe in ("feuille", "port"):
        s += max(0.0, (0.35 - m["p_feuillage"]) / 0.35) * 2.0
    if organe == "feuille":
        s += max(0.0, (m["p_taches"] - 0.20)) * 3.0
    if organe == "ecorce":
        s += max(0.0, (m["p_vert"] - 0.50)) * 2.0
    return round(s, 3)
