/* Dire qu'une tâche est faite.

   La liste du jour ne baissait jamais : rien ne permettait de dire qu'une
   tâche était faite, et le masquage, seul recours, ne s'ouvrait que d'un
   glissement que rien n'annonçait. Chaque rangée porte maintenant une case.
   La cocher écrit une entrée au carnet sous le geste qui répond à la tâche,
   puis retire la ligne : pour la quinzaine quand le geste se répète, la
   récolte, pour le reste de sa fenêtre sinon. Le bandeau offre de revenir en
   arrière, ce qui efface l'entrée et rend la ligne.

   Décision du 14 octobre 2026, sur l'audit par personas. */
import { ouvrirContexte, journal, net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const JARDIN = PLANTES.slice(0, 20).map(p => p.id);

const ecrits = (pg, table) => pg.evaluate(t =>
  (window.__ECRITS__ || []).filter(x => x.table === t), table);

async function ouvrirTache(pg, k) {
  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  await pg.locator(`.syn-ligne[data-tache="${k}"]`).click();
  await pg.waitForTimeout(600);
}

export default async function essai(navigateur) {
  const j = journal("Tâche faite");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur, { jardin: JARDIN });
  await pg.setViewportSize({ width: 393, height: 852 });
  await pg.waitForTimeout(800);

  j.section("chaque rangée porte sa case");
  await ouvrirTache(pg, "taille");
  const rangees = await pg.locator("#maintenant .rangee-tache").count();
  const cases = await pg.locator("#maintenant .rangee-tache .fait").count();
  j.controle("une case par rangée de tâche", rangees > 1 && cases === rangees, `${cases} pour ${rangees}`);
  const taille = await pg.locator("#maintenant .fait").first().evaluate(b => {
    const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)];
  });
  j.controle("elle se touche du doigt, quarante-quatre points au moins",
    taille[0] >= 44 && taille[1] >= 44, taille.join(" sur "));
  const nom = await pg.locator("#maintenant .fait").first().getAttribute("aria-label");
  j.controle("elle se nomme par la tâche et la plante", /^Tailler .+ : fait$/.test(nom || ""), nom);

  j.section("la cocher l'écrit au carnet et retire la ligne");
  await pg.locator("#maintenant .fait").first().click();
  await pg.waitForTimeout(800);
  const obs = (await ecrits(pg, "observations")).filter(x => x.op === "insert");
  j.controle("une entrée de carnet est écrite, sous le geste de la tâche",
    obs.length === 1 && obs[0].v.geste === "taille" && obs[0].v.plant_id, JSON.stringify(obs.map(x => x.v)));
  const sou = (await ecrits(pg, "sourdines")).filter(x => x.op === "upsert");
  j.controle("la ligne se retire pour le reste de sa fenêtre",
    sou.length === 1 && sou[0].v.portee === "periode" && sou[0].v.phase === "taille",
    JSON.stringify(sou.map(x => x.v)));
  const apres = await pg.locator("#maintenant .rangee-tache:not(.en-sourdine)").count();
  j.controle("la tâche compte une ligne de moins", apres === rangees - 1, `${apres} après ${rangees}`);
  const bandeau = net(await pg.locator("#etat").innerText());
  j.controle("le bandeau le dit et offre de revenir en arrière",
    /^Tailler .+ : noté au carnet\.\s*Annuler$/.test(bandeau), bandeau);

  j.section("annuler défait les deux");
  await pg.locator("#etat .etat-action").click();
  await pg.waitForTimeout(800);
  const efface = (await ecrits(pg, "observations")).filter(x => x.op === "delete");
  const leve = (await ecrits(pg, "sourdines")).filter(x => x.op === "delete");
  j.controle("l'entrée est effacée et la ligne rendue", efface.length === 1 && leve.length === 1);
  j.controle("la tâche retrouve toutes ses lignes",
    await pg.locator("#maintenant .rangee-tache:not(.en-sourdine)").count() === rangees);

  j.section("la récolte se retire pour la quinzaine seulement");
  await ouvrirTache(pg, "recolte");
  await pg.locator("#maintenant .fait").first().click();
  await pg.waitForTimeout(800);
  const souR = (await ecrits(pg, "sourdines")).filter(x => x.op === "upsert").pop();
  const obsR = (await ecrits(pg, "observations")).filter(x => x.op === "insert").pop();
  j.controle("une récolte se répète : la ligne revient à la quinzaine suivante",
    souR && souR.v.portee === "quinzaine" && obsR && obsR.v.geste === "recolte",
    JSON.stringify(souR && souR.v));

  j.section("ce qui ne se fait pas n'a pas de case");
  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  await pg.locator("#btnTout").click();
  await pg.waitForTimeout(700);
  const fleur = await pg.evaluate(() => {
    const s = [...document.querySelectorAll(".section-liste")].find(x =>
      /Floraison|En fleur/i.test((x.querySelector(".nom-niveau") || {}).textContent || ""));
    return s ? s.querySelectorAll(".fait").length : -1;
  });
  j.controle("la floraison se constate, elle ne se coche pas", fleur === 0 || fleur === -1, String(fleur));

  await ctx.close();
  return j.fin(erreurs);
}
