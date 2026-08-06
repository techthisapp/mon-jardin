/* Le glissement qui ferme une feuille. C'est le geste de toutes les feuilles de
   téléphone, et sa règle tient en une phrase : il part de n'importe quel point,
   à condition que le corps soit déjà en haut de son défilement, sinon c'est le
   contenu qui glisse.

   Les contrôles portent sur les quatre cas où la règle se décide : la course
   longue qui ferme, le corps défilé qui garde la main, la course courte qui
   revient en place, et le geste vif et court qui ferme quand même. */
import { ouvrirContexte, journal, glisserSurFeuille, net } from "./commun.mjs";

const ouverte = pg => pg.locator("#feuille:not([hidden])").count().then(n => n === 1);

async function ouvrirTemps(pg) {
  await pg.locator(".tm-temps").click();
  await pg.waitForTimeout(700);
}

export default async function essai(navigateur) {
  const j = journal("Fermeture d'une feuille au glissement");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

  await ouvrirTemps(pg);
  const cadre = await pg.locator("#feuille").boundingBox();
  const haut = Math.round(cadre.y);

  j.section("une course longue vers le bas ferme la feuille");
  j.controle("la feuille est ouverte", await ouverte(pg));
  await glisserSurFeuille(pg, 195, haut + 220, haut + 420);
  j.controle("elle s'est fermée", !await ouverte(pg));
  j.controle("le voile est retiré avec elle",
    await pg.locator("#voile[hidden]").count() === 1
    || await pg.locator("#voile:not(.visible)").count() === 1);
  j.controle("la course du doigt ne reste pas dans la transformation",
    await pg.locator("#feuille").evaluate(e => !e.style.getPropertyValue("--tirer")));

  /* Le geste part de n'importe où, sauf quand le contenu peut encore descendre :
     il appartient alors au défilement. */
  j.section("un corps déjà défilé garde la main");
  await ouvrirTemps(pg);
  await pg.locator("#feuille-corps").evaluate(e => { e.scrollTop = 400; });
  await pg.waitForTimeout(200);
  await glisserSurFeuille(pg, 195, haut + 220, haut + 420);
  j.controle("la feuille est restée", await ouverte(pg));
  j.controle("c'est le contenu qui a glissé",
    await pg.locator("#feuille-corps").evaluate(e => e.scrollTop) > 0);

  j.section("une course courte ramène la feuille en place");
  await pg.locator("#feuille-corps").evaluate(e => { e.scrollTop = 0; });
  await pg.waitForTimeout(250);
  await glisserSurFeuille(pg, 195, haut + 220, haut + 260);
  j.controle("la feuille est restée", await ouverte(pg));
  j.controle("elle est revenue à sa place",
    await pg.locator("#feuille").evaluate(e => {
      const v = e.style.getPropertyValue("--tirer");
      return !v || parseFloat(v) === 0;
    }));

  /* Un geste vif et court est une intention de fermeture aussi nette qu'une
     longue course : la vitesse compte autant que la distance. */
  j.section("un geste vif et court ferme aussi");
  await glisserSurFeuille(pg, 195, haut + 220, haut + 292, 24, 4);
  j.controle("la feuille s'est fermée", !await ouverte(pg));

  /* Le ruban lit une heure au doigt : un glissement vers le bas qui part des
     courbes est un geste de fermeture, il ne doit pas laisser une heure lue. */
  j.section("un glissement sur les courbes ne laisse pas de lecture");
  await ouvrirTemps(pg);
  const ruban = await pg.locator(".mg-v .mg-s").first().boundingBox();
  await glisserSurFeuille(pg, Math.round(ruban.x + ruban.width * 0.5),
    Math.round(ruban.y + ruban.height / 2), Math.round(ruban.y + ruban.height / 2) + 200);
  j.controle("la feuille s'est fermée", !await ouverte(pg));
  await ouvrirTemps(pg);
  j.controle("aucune heure n'est restée lue",
    await pg.locator(".mg-sel:not([hidden])").count() === 0
    && await pg.locator(".mg-lu").count() === 0);
  const plages = (await pg.locator(".mg-r").allInnerTexts()).map(net);
  const gardees = (await pg.locator(".mg-r").evaluateAll(l => l.map(e => e.dataset.plage)))
    .map(net);
  j.controle("les voies portent bien leurs plages", plages.join("|") === gardees.join("|"),
    plages.join(" | "));

  await ctx.close();
  return j.fin(erreurs);
}
