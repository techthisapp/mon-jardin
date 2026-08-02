/* Navigation à deux niveaux de l'écran du moment. Les contrôles portent sur des
   invariants de structure, non sur des effectifs : la vue d'ensemble et le
   niveau de détail ne sont jamais visibles ensemble, le geste de retour ramène
   au niveau précédent, et l'ouverture d'une fiche ne perd pas ce niveau. */
import { ouvrirContexte, journal } from "./commun.mjs";

export default async function essai(navigateur) {
  const j = journal("Navigation à deux niveaux");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);
  const visible = s => pg.locator(s + ":not([hidden])").count();
  const cache = s => pg.locator(s + "[hidden]").count();

  j.section("vue d'ensemble à l'ouverture");
  j.controle("ensemble visible", await visible("#vueEnsemble") === 1);
  j.controle("détail caché", await cache("#niveauDetail") === 1);
  const taches = await pg.locator(".syn-ligne").count();
  j.controle("la synthèse liste des tâches", taches > 0, taches + " tâches");

  j.section("ouverture d'une tâche");
  await pg.locator(".syn-ligne").first().click();
  await pg.waitForTimeout(600);
  j.controle("ensemble caché", await cache("#vueEnsemble") === 1);
  j.controle("détail visible", await visible("#niveauDetail") === 1);
  const actions = await pg.locator("#maintenant .action").count();
  j.controle("la tâche porte des actions", actions > 0, actions + " actions");
  j.controle("la barre de niveau nomme la tâche",
    (await pg.locator("#barreNiveau").innerText()).trim().length > 0);

  j.section("retour par le geste du téléphone");
  await pg.goBack();
  await pg.waitForTimeout(600);
  j.controle("ensemble revenu", await visible("#vueEnsemble") === 1);
  j.controle("détail refermé", await cache("#niveauDetail") === 1);

  j.section("liste complète");
  await pg.locator("#btnTout").click();
  await pg.waitForTimeout(700);
  const sections = await pg.locator(".section-liste").count();
  const puces = await pg.locator(".puce-rail").count();
  j.controle("une puce de rail par section", sections === puces && sections > 0,
    sections + " sections, " + puces + " puces");
  await pg.evaluate(() => window.scrollTo(0, 1500));
  await pg.waitForTimeout(900);
  j.controle("le rail suit le défilement",
    await pg.locator(".puce-rail.ici").count() === 1,
    await pg.locator(".puce-rail.ici").innerText().catch(() => "aucune"));

  j.section("fiche ouverte depuis la liste, puis refermée");
  await pg.locator("#maintenant .action").first().click();
  await pg.waitForTimeout(700);
  j.controle("feuille ouverte", await visible("#feuille") === 1,
    (await pg.locator("#feuille-titre").innerText().catch(() => "")).split("\n")[0]);
  await pg.goBack();
  await pg.waitForTimeout(700);
  j.controle("feuille refermée", await cache("#feuille") === 1);
  j.controle("le niveau de liste est conservé", await pg.locator(".puce-rail").count() === puces);
  await pg.goBack();
  await pg.waitForTimeout(700);
  j.controle("dernier retour, ensemble revenu", await visible("#vueEnsemble") === 1);

  await ctx.close();
  return j.fin(erreurs);
}
