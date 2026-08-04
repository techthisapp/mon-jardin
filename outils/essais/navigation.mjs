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

  /* Le point du jour doit tomber sur la ligne, et l'aplomb monter à son aplomb
     vers la date : c'est tout le lien entre la date écrite et l'année. */
  j.section("la ligne de l'année relie le point à la date");
  const ligne = await pg.evaluate(() => {
    const r = document.getElementById("regleAnnee");
    const b = e => r.querySelector(e).getBoundingClientRect();
    const pt = b(".ra-pt"), fond = b(".ra-fond"), fil = b(".ra-fil");
    const date = document.getElementById("dateJour").getBoundingClientRect();
    return {
      surLaLigne: pt.left >= fond.left - 5 && pt.right <= fond.right + 5,
      centre: Math.round((pt.left + pt.width / 2) - (fil.left + fil.width / 2)),
      sousLaDate: Math.round(fil.top - date.bottom),
      touche: Math.round(pt.top - fil.bottom),
      pastille: Math.round(document.querySelector("#dateJour .dj-saison").getBoundingClientRect().width),
    };
  });
  j.controle("le point reste dans les bornes de la ligne", ligne.surLaLigne);
  j.controle("l'aplomb est exactement au-dessus du point", Math.abs(ligne.centre) <= 1,
    ligne.centre + " px");
  j.controle("il monte jusqu'à la date sans la toucher",
    ligne.sousLaDate >= 0 && ligne.sousLaDate <= 6 && ligne.touche <= 0,
    ligne.sousLaDate + " px sous la date");
  j.controle("la date est ouverte par sa pastille de saison", ligne.pastille === 8, ligne.pastille);

  j.section("la date ouvre le jour, sur les deux écrans");
  const mesuresEnTete = await pg.locator(".tete .mesure").count();
  j.controle("le bandeau ne porte plus les trois mesures", mesuresEnTete === 0, mesuresEnTete);
  await pg.locator("#dateJour").click();
  await pg.waitForTimeout(600);
  const titreJour = (await pg.locator("#feuille-titre").innerText()).split("\n")[0];
  j.controle("la pression sur la date ouvre la feuille du jour", titreJour === "Le jour", titreJour);
  const mesures = await pg.locator("#feuille-corps .mesure").count();
  j.controle("elle porte l'eau, la lumière et la saison", mesures === 3, mesures);
  /* Chaque mesure se nomme : « pleine » ou « 14 h 49 » ne disaient pas de quoi
     il s'agissait, la valeur seule ne suffit pas à porter la mesure. */
  const noms = await pg.locator("#feuille-corps .mesure-nom").allInnerTexts();
  j.controle("chacune est nommée",
    noms.join(" | ") === "L'EAU | LA LUMIÈRE | LA SAISON", noms.join(" | "));
  const section = await pg.locator("#feuille-corps .f-sect").innerText().catch(() => "absente");
  j.controle("la prévision est annoncée par son titre", section === "LA SEMAINE", section);
  await pg.locator('#feuille-corps .mesure[data-vue="lumiere"]').click();
  await pg.waitForTimeout(500);
  j.controle("chaque mesure ouvre encore sa propre feuille",
    /jour|lumière|soleil/i.test(await pg.locator("#feuille-titre").innerText()),
    (await pg.locator("#feuille-titre").innerText()).split("\n")[0]);
  await pg.goBack();
  await pg.waitForTimeout(600);
  await pg.locator('.onglet[data-ecran="planning"]').click();
  await pg.waitForTimeout(900);
  j.controle("le calendrier porte la même date", await visible("#dateJourP") === 1,
    await pg.locator("#dateJourP").innerText().catch(() => "absente"));
  await pg.locator("#dateJourP").click();
  await pg.waitForTimeout(600);
  j.controle("et la même feuille du jour",
    (await pg.locator("#feuille-titre").innerText()).split("\n")[0] === "Le jour");

  await ctx.close();
  return j.fin(erreurs);
}
