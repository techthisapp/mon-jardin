/* Réimplémentation isolée du bilan pour contrôler l'arithmétique sur des cas
   construits. Elle ne touche pas au navigateur : elle rejoue les formules du
   chapitre 8 du bulletin FAO 56 et vérifie que les nombres tombent juste. */
const RESERVE_SOL = { sableux: 80, limoneux: 155, argileux: 165 };
const ZR_M = 0.40, P_BASE = 0.40;

function bilan({ texture = "limoneux", jours, kc = 1, releves = {} }) {
  const taw = RESERVE_SOL[texture] * ZR_M;
  let dr = taw / 2;
  const serie = [];
  jours.forEach((j, k) => {
    const r = releves[k] || {};
    const pluie = r.pluie !== undefined ? r.pluie : j.p;
    const arros = r.arrosage || 0;
    const etc = j.e * kc;
    dr = Math.min(taw, Math.max(0, dr - pluie - arros + etc));
    serie.push({ k, pluie, etc, dr: Math.round(dr * 100) / 100 });
  });
  const etcJour = serie[serie.length - 1].etc;
  const p = Math.min(0.8, Math.max(0.1, P_BASE + 0.04 * (5 - etcJour)));
  const raw = p * taw;
  const dose = Math.min(dr, raw);
  return { taw, raw: Math.round(raw * 100) / 100, dr: Math.round(dr * 100) / 100,
           p: Math.round(p * 1000) / 1000, dose: Math.round(dose * 10) / 10,
           reserve: Math.round((1 - dr / taw) * 100), serie };
}
const sec = n => Array.from({ length: n }, () => ({ p: 0, e: 5 }));
const pluvieux = n => Array.from({ length: n }, () => ({ p: 8, e: 2 }));
const essais = [];
const ok = (nom, cond, detail) => essais.push({ nom, ok: cond, detail });

// 1. Réserve utile, tableau 19 du FAO 56 sur 40 cm
let b = bilan({ jours: sec(1) });
ok("TAW limoneux = 155 × 0,40 = 62 mm", b.taw === 62, b.taw);
b = bilan({ texture: "sableux", jours: sec(1) });
ok("TAW sableux = 80 × 0,40 = 32 mm", b.taw === 32, b.taw);

// 2. Seuil ajusté : p = 0,40 + 0,04 (5 − ETc), borné
b = bilan({ jours: sec(1), kc: 1 });         // ETc = 5
ok("p = 0,40 quand ETc vaut 5", b.p === 0.4, b.p);
b = bilan({ jours: [{ p: 0, e: 2 }], kc: 1 }); // ETc = 2
ok("p = 0,52 quand ETc vaut 2", Math.abs(b.p - 0.52) < 1e-9, b.p);
b = bilan({ jours: [{ p: 0, e: 20 }], kc: 1 }); // ETc = 20 -> borne basse
ok("p borné à 0,10 sur forte demande", b.p === 0.1, b.p);

// 3. Trente jours secs : le réservoir se vide et ne descend pas sous zéro
b = bilan({ jours: sec(30) });
ok("Trente jours secs vident la réserve", b.dr === 62 && b.reserve === 0, b.dr);
ok("La dose reste plafonnée à RAW", b.dose === Math.round(b.raw * 10) / 10, b.dose);

// 4. Trente jours pluvieux : le réservoir reste plein, l'excédent draine
b = bilan({ jours: pluvieux(30) });
ok("Trente jours pluvieux remplissent la réserve", b.dr === 0 && b.reserve === 100, b.dr);

// 5. Un arrosage saisi efface le déficit, hors saturation du réservoir
const cinq = sec(5);
b = bilan({ jours: cinq });
const avant = b.dr;
b = bilan({ jours: cinq, releves: { 4: { arrosage: 25 } } });
ok("Un arrosage de 25 mm réduit l'épuisement d'autant",
   Math.abs((avant - b.dr) - 25) < 1e-9, `${avant} puis ${b.dr}`);

// 5 bis. Le réservoir ne se creuse pas au-delà de sa capacité
b = bilan({ jours: sec(40) });
ok("L'épuisement plafonne à la capacité du réservoir", b.dr === 62, b.dr);

// 6. Un relevé de pluie prime sur le modèle
b = bilan({ jours: [{ p: 20, e: 5 }] });
const modele = b.dr;
b = bilan({ jours: [{ p: 20, e: 5 }], releves: { 0: { pluie: 0 } } });
ok("Un relevé nul annule les 20 mm du modèle", b.dr - modele === 20, `${modele} puis ${b.dr}`);

// 7. Mise en route : après trente jours l'état initial ne compte plus
const a1 = bilan({ jours: [...pluvieux(3), ...sec(27)] }).dr;
const a2 = (() => { const t = 62; let dr = t; // départ réservoir vide
  [...pluvieux(3), ...sec(27)].forEach(j => { dr = Math.min(t, Math.max(0, dr - j.p + j.e)); });
  return Math.round(dr * 100) / 100; })();
ok("L'état initial est effacé par la pluie du mois", a1 === a2, `${a1} et ${a2}`);

// 8. Cohérence FAO : RAW limoneux à ETc 5 vaut 24,8 mm
b = bilan({ jours: sec(30), kc: 1 });
ok("RAW = 0,40 × 62 = 24,8 mm", Math.abs(b.raw - 24.8) < 1e-9, b.raw);

export default function suite() {
  let echecs = 0;
  const lignes = essais.map(e => {
    if (!e.ok) echecs++;
    return (e.ok ? "    ok   " : "    ECHEC") + "  " + e.nom + "  [" + e.detail + "]";
  });
  return { titre: "Arithmétique du bilan hydrique", echecs, lignes };
}
