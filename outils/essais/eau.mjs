/* Bilan hydrique du sol. Le relevé du jardinier remplace la lame d'eau du
   modèle, la texture du sol fixe la réserve utile, et l'effacement d'un relevé
   ramène le bilan à son état d'origine. */
import { ouvrirContexte, journal, nombre, net, METEO } from "./commun.mjs";

const pleine = async pg => nombre((await pg.locator(".js-leg b").innerText()));
const reserve = async pg => nombre((await pg.locator("#sol-note").innerText()).match(/retient ([\d,]+) mm/)[1]);

export default async function essai(navigateur) {
  const j = journal("Bilan hydrique du sol");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

  j.section("ouverture de la feuille de l'eau");
  await pg.locator('[data-vue="eau"]').click();
  await pg.waitForTimeout(700);
  j.controle("la jauge affiche un remplissage", (await pg.locator(".jauge-sol").count()) === 1);
  const avant = await pleine(pg);
  const solLimoneux = await reserve(pg);
  j.controle("réserve utile du sol limoneux sur 40 cm", solLimoneux === 62, solLimoneux + " mm");
  j.controle("trois jours de relevés proposés", await pg.locator(".rel-ligne").count() === 3);

  j.section("saisie d'un relevé de pluie");
  await pg.locator(".rel-ligne").first().locator(".rel-pluie").fill("35");
  await pg.locator("#feuille-titre").click();
  await pg.waitForTimeout(800);
  const apres = await pleine(pg);
  j.controle("la réserve monte après 35 mm relevés", apres > avant, avant + " % puis " + apres + " %");
  const ecrits = await pg.evaluate(() => (window.__ECRITS__ || []).filter(x => x.table === "releves_eau"));
  j.controle("le relevé est enregistré une seule fois",
    ecrits.length === 1 && ecrits[0].op === "upsert", JSON.stringify(ecrits.map(x => x.op)));
  j.controle("la valeur enregistrée est celle saisie",
    ecrits[0] && Number(ecrits[0].v.pluie_mm) === 35, JSON.stringify(ecrits[0] && ecrits[0].v.pluie_mm));

  j.section("changement de texture du sol");
  await pg.locator('.sol-opt[data-sol="sableux"]').click();
  await pg.waitForTimeout(800);
  const solSableux = await reserve(pg);
  j.controle("le sol sableux retient moins", solSableux < solLimoneux, solSableux + " mm");
  j.controle("la réserve se remplit d'autant plus vite", await pleine(pg) > apres);

  j.section("effacement du relevé");
  await pg.locator('.sol-opt[data-sol="limoneux"]').click();
  await pg.waitForTimeout(700);
  await pg.locator(".rel-ligne").first().locator(".rel-pluie").fill("");
  await pg.locator("#feuille-titre").click();
  await pg.waitForTimeout(800);
  const ops = await pg.evaluate(() =>
    (window.__ECRITS__ || []).filter(x => x.table === "releves_eau").map(x => x.op));
  j.controle("l'effacement supprime la ligne", ops.includes("delete"), JSON.stringify(ops));
  j.controle("le bilan revient à son état d'origine", await pleine(pg) === avant,
    avant + " % attendus, " + await pleine(pg) + " % obtenus");

  j.section("décision d'arrosage");
  const conseil = net(await pg.locator(".f-txt").first().innerText());
  j.controle("la feuille conclut sur un geste",
    /apporter|réserve tient|seuil de confort/i.test(conseil), conseil.slice(0, 70));

  await ctx.close();

  /* Une seule autorité sur l'arrosage. L'alerte de pluie ne conseille rien que
     le bilan du sol ne dise déjà : elle énonce le fait quand le sol reste en
     dette malgré l'averse, se tait quand la pastille annonce la pluie à venir,
     et ne dissuade d'arroser que lorsque le bilan est au confort. */
  j.section("la pluie du jour ne contredit pas le bilan");
  const scene = async retouche => {
    const d = JSON.parse(METEO);
    d.daily.temperature_2m_max = d.daily.temperature_2m_max.map(() => 26);
    retouche(d);
    const { ctx: c, pg: p } = await ouvrirContexte(navigateur, { meteo: JSON.stringify(d) });
    const r = await p.evaluate(() => ({
      eau: (document.querySelector('.tm-puce[data-vue="eau"]') || {}).textContent
             ? document.querySelector('.tm-puce[data-vue="eau"]').textContent.replace(/\s+/g, " ").trim() : "",
      alertes: [...document.querySelectorAll(".bd-alerte")].map(e => e.textContent.replace(/\s+/g, " ").trim()),
    }));
    await c.close();
    return r;
  };
  const IJOUR = 31;   // 2026-08-02 dans la série du jeu d'essai

  const dette = await scene(d => {
    d.daily.precipitation_sum = d.daily.precipitation_sum.map((v, k) => k === IJOUR ? 19 : 0);
    d.daily.et0_fao_evapotranspiration = d.daily.et0_fao_evapotranspiration.map(() => 6);
  });
  j.controle("sol en dette : la pastille demande un apport",
    /à apporter/.test(dette.eau), dette.eau);
  j.controle("l'alerte énonce la lame sans dissuader d'arroser",
    dette.alertes.some(a => a === "19 mm attendus aujourd'hui"), JSON.stringify(dette.alertes));

  const confort = await scene(d => {
    d.daily.precipitation_sum = d.daily.precipitation_sum.map(() => 19);
    d.daily.et0_fao_evapotranspiration = d.daily.et0_fao_evapotranspiration.map(() => 1);
  });
  j.controle("sol au confort : l'alerte peut dissuader d'arroser",
    confort.alertes.some(a => a === "19 mm attendus, inutile d'arroser"), JSON.stringify(confort.alertes));

  const attente = await scene(d => {
    d.daily.precipitation_sum = d.daily.precipitation_sum.map((v, k) =>
      k === IJOUR + 1 ? 30 : k === IJOUR ? 16 : 0);
    d.daily.et0_fao_evapotranspiration = d.daily.et0_fao_evapotranspiration.map(() => 6);
  });
  j.controle("pluie annoncée : la pastille dit d'attendre",
    /attendre/.test(attente.eau), attente.eau);
  j.controle("et l'alerte se tait, pour ne pas répéter la pastille",
    !attente.alertes.some(a => /mm attendus/.test(a)), JSON.stringify(attente.alertes));

  return j.fin(erreurs);
}
