/* Ruban de l'année de la fiche. Les contrôles portent sur la géométrie du
   dessin, seul endroit où la fenêtre d'une tâche devient visible : une bande
   posée sur la mauvaise quinzaine ne lève aucune erreur et ne se voit qu'à
   l'oeil. Ils couvrent aussi le décalage climatique, qui déplace toutes les
   fenêtres du jardin sans que rien d'autre ne le signale. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, ongletAnnee, net } from "./commun.mjs";

/* Le ruban pose l'abscisse d'une quinzaine à 102 + (r - 1) / 24 * 242.
   La lecture inverse rend la quinzaine, de 1 à 24. */
const QUINZAINE = x => Math.round((x - 102) / 242 * 24) + 1;

/* Les bandes de tâche, rangées par voie. Les rectangles de fond et le repère
   du moment portent la teinte d'encre du gabarit, les bandes une couleur
   d'action : c'est ce qui les distingue. */
async function bandes(pg, nom) {
  await ouvrirFiche(pg, nom);
  await ongletAnnee(pg);
  const r = await pg.evaluate(() => {
    const svg = document.querySelector('.f-pan-annee .f-svg') || document.querySelector('.f-svg');
    if (!svg) return null;
    const rects = [...svg.querySelectorAll("rect")].map(e => ({
      x: parseFloat(e.getAttribute("x")), y: parseFloat(e.getAttribute("y")),
      w: parseFloat(e.getAttribute("width")), fill: e.getAttribute("fill"),
      opacite: e.getAttribute("opacity"),
    }));
    const voies = [...svg.querySelectorAll("text.f-lane")].map(e => ({
      y: parseFloat(e.getAttribute("y")), texte: e.textContent,
    }));
    return { rects, voies, etiquette: svg.getAttribute("aria-label") };
  });
  await fermerFiche(pg);
  return r;
}

/* Une voie du ruban, désignée par son libellé, avec ses fenêtres exprimées en
   quinzaines. Les voies font vingt-trois points de haut, ce qui suffit à
   rattacher un rectangle à son libellé. */
function voie(d, libelle) {
  const t = d.voies.find(v => net(v.texte).indexOf(libelle) === 0);
  if (!t) return null;
  return d.rects
    .filter(r => r.fill !== "#14140f" && Math.abs(r.y - (t.y - 11)) < 9)
    .sort((a, b) => a.x - b.x)
    .map(r => [QUINZAINE(r.x), QUINZAINE(r.x + r.w + 2) - 1]);
}

export default async function essai(navigateur) {
  const j = journal("Ruban de l'année et décalage climatique");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);
  await ouvrirListeDesPlantes(pg);

  const pommier = await bandes(pg, "Pommier");
  j.section("le ruban est dessiné");
  j.controle("il porte son étiquette de lecture",
    pommier && pommier.etiquette === "Calendrier annuel", pommier && pommier.etiquette);
  j.controle("il porte une voie par tâche de la fiche",
    pommier.voies.length >= 4, pommier.voies.map(v => net(v.texte)).join(", "));

  j.section("une fenêtre à cheval sur le premier janvier reste une seule tâche");
  const plant = voie(pommier, "Plantation");
  j.controle("la plantation du pommier est dessinée en deux morceaux",
    plant && plant.length === 2, JSON.stringify(plant));
  j.controle("le premier morceau va de la quinzaine 19 à la fin de l'année",
    plant && plant[1][0] === 19 && plant[1][1] === 24, JSON.stringify(plant && plant[1]));
  j.controle("le second part de la première quinzaine",
    plant && plant[0][0] === 1 && plant[0][1] === 5, JSON.stringify(plant && plant[0]));

  j.section("le repère du moment tombe sur la quinzaine du jour");
  const repere = pommier.rects.find(r => r.fill === "#14140f" && r.opacite === ".07");
  j.controle("le 2 août est la quinzaine 15",
    repere && QUINZAINE(repere.x) === 15, repere && QUINZAINE(repere.x));

  j.section("la règle des mois marque le mois en cours");
  const regle = await pg.evaluate(() => {
    const r = document.getElementById("regleAnnee");
    if (!r) return null;
    const t = [...r.children];
    return { total: t.length, ici: t.findIndex(e => e.classList.contains("ici")),
             passes: t.filter(e => e.classList.contains("passe")).length };
  });
  j.controle("douze mois", regle && regle.total === 12, regle && regle.total);
  j.controle("août est le mois marqué", regle && regle.ici === 7, regle && regle.ici);
  j.controle("les sept mois précédents sont passés", regle && regle.passes === 7, regle && regle.passes);

  const floRef = voie(pommier, "Floraison");
  await ctx.close();

  j.section("le décalage climatique déplace les fenêtres");
  for (const [climat, attendu, sens] of [
    ["montagnard", 2, "plus tard"],
    ["mediterraneen", -2, "plus tôt"],
  ]) {
    const c = await ouvrirContexte(navigateur, { climat });
    await ouvrirListeDesPlantes(c.pg);
    const d = await bandes(c.pg, "Pommier");
    const flo = voie(d, "Floraison");
    await c.ctx.close();
    const bon = floRef && flo && flo.length === floRef.length
      && flo.every((f, i) => f[0] === floRef[i][0] + attendu);
    j.controle(`en climat ${climat} la floraison est ${sens} de ${Math.abs(attendu)} quinzaines`,
      bon, `référence ${JSON.stringify(floRef)}, ${climat} ${JSON.stringify(flo)}`);
  }

  return j.fin(erreurs);
}
