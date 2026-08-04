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

  /* La ligne de l'année situe le jour : quatre saisons en couleur, un cran par
     quinzaine, l'initiale de chaque mois, et un point relié à la date écrite
     au-dessus, dont la pastille porte la teinte de la saison traversée. */
  j.section("la ligne de l'année situe le deux août");
  const regle = await pg.evaluate(() => {
    const r = document.getElementById("regleAnneeP");
    if (!r) return null;
    const pc = v => parseFloat(v);
    const pt = r.querySelector(".ra-pt");
    const ici = pc(pt.style.left);
    const bandes = [...r.querySelectorAll(".ra-s")];
    const sous = bandes.find(b => ici >= pc(b.style.left)
      && ici < pc(b.style.left) + pc(b.style.width));
    const mois = [...r.querySelectorAll(".ra-mois b")];
    const av = r.querySelector(".ra-avenir");
    const past = document.querySelector("#dateJour .dj-saison");
    return {
      bandes: bandes.length,
      crans: r.querySelectorAll("u").length,
      forts: r.querySelectorAll("u.fort").length,
      mois: mois.length,
      ici: mois.findIndex(e => e.classList.contains("ici")),
      lettres: mois.map(e => e.textContent).join(""),
      point: pt.style.left,
      teinte: sous ? getComputedStyle(sous).getPropertyValue("--t").trim() : null,
      pastille: past ? getComputedStyle(past).getPropertyValue("--t").trim() : null,
      avenir: av.style.left,
    };
  });
  j.controle("les quatre saisons sont posées, l'hiver aux deux bouts",
    regle && regle.bandes === 5, regle && regle.bandes);
  j.controle("vingt-trois crans, onze pour les premiers du mois",
    regle && regle.crans === 23 && regle.forts === 11,
    regle && regle.crans + " crans, " + regle.forts + " forts");
  j.controle("les douze initiales sont là", regle && regle.lettres === "JFMAMJJASOND",
    regle && regle.lettres);
  j.controle("août est l'initiale marquée", regle && regle.ici === 7, regle && regle.ici);
  j.controle("le point tombe au deux août, soit 58,49 % de l'année",
    regle && regle.point === "58.49%", regle && regle.point);
  j.controle("il se pose sur la bande de l'été", regle && regle.teinte === "#C7BE79",
    regle && regle.teinte);
  j.controle("la pastille de la date porte la même teinte",
    regle && regle.pastille === regle.teinte, regle && regle.pastille);
  j.controle("la part à venir commence au point",
    regle && regle.avenir === regle.point, regle && regle.avenir);

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
