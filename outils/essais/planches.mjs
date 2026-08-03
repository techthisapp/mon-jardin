/* Planches d'herbier. Les contrôles portent sur ce qui ne se voit pas dans le
   rendu : la vignette n'apparaît que là où une planche existe, son masque n'est
   posé qu'à l'approche de la rangée, la planche remplace le motif décoratif
   dans l'entête, et la provenance est énoncée, planche du genre comprise. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, ongletAnnee, net } from "./commun.mjs";

const rangee = (pg, nom) => pg.locator(".item-bloc", { hasText: nom }).first();

export default async function essai(navigateur) {
  const j = journal("Planches d'herbier");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

  j.section("le manifeste est lu au démarrage");
  const m = await pg.evaluate(async () => {
    const r = await fetch("./planches.json");
    return r.ok ? Object.keys(await r.json()).length : 0;
  });
  j.controle("il porte au moins cent quatre-vingts plantes", m >= 180, m);

  await ouvrirListeDesPlantes(pg);

  j.section("la vignette suit l'existence de la planche");
  j.controle("le thym porte une vignette",
    await rangee(pg, "Thym").locator(".v-planche").count() === 1);
  j.controle("l'hortensia n'en porte pas, aucun fonds ne le couvre",
    await rangee(pg, "Hortensia").locator(".v-planche").count() === 0);
  const large = await pg.evaluate(() => {
    const e = document.querySelector('.item-bloc .v-planche');
    return e ? Math.round(e.getBoundingClientRect().width) : 0;
  });
  j.controle("elle occupe trente-quatre pixels", large === 34, large);

  j.section("le masque n'est posé qu'à l'approche de la rangée");
  const pose = await pg.evaluate(() => {
    const t = [...document.querySelectorAll(".v-planche")];
    return { total: t.length, poses: t.filter(e => e.style.getPropertyValue("--pl")).length };
  });
  j.controle("toutes les vignettes ne sont pas chargées d'un coup",
    pose.poses < pose.total, `${pose.poses} posées sur ${pose.total}`);
  j.controle("celles du haut de la liste le sont",
    pose.poses > 0, `${pose.poses} posées`);

  j.section("la planche remplace le motif dans l'entête de fiche");
  await ouvrirFiche(pg, "Thym");
  j.controle("l'entête porte la planche", await pg.locator(".f-entete .f-planche img").count() === 1);
  j.controle("le motif décoratif a cédé la place", await pg.locator(".f-entete .f-motif").count() === 0);
  const chargee = await pg.evaluate(() => {
    const i = document.querySelector(".f-planche img");
    return i ? i.naturalWidth : 0;
  });
  j.controle("le fichier est bien servi", chargee === 320, chargee);
  await ongletAnnee(pg);
  const ident = net(await pg.locator(".f-bloc", { hasText: "Identité" }).first().innerText());
  j.controle("la provenance est énoncée",
    /Planche\s+Vilmorin-Andrieux/.test(ident), (ident.match(/Planche[^\n]{0,60}/) || [""])[0]);
  j.controle("elle ne dit pas le genre pour une planche de l'espèce",
    !/planche du genre/.test(ident));
  await fermerFiche(pg);

  j.section("la planche du genre se signale");
  await ouvrirFiche(pg, "Rosier");
  await ongletAnnee(pg);
  const rosier = net(await pg.locator(".f-bloc", { hasText: "Identité" }).first().innerText());
  j.controle("le rosier annonce une planche du genre",
    /Planche\s+Masclef.*planche du genre/.test(rosier),
    (rosier.match(/Planche[^\n]{0,70}/) || [""])[0]);
  await fermerFiche(pg);

  j.section("sans planche, l'entête garde son motif");
  await ouvrirFiche(pg, "Hortensia");
  j.controle("aucune planche", await pg.locator(".f-entete .f-planche").count() === 0);
  j.controle("le motif décoratif est là", await pg.locator(".f-entete .f-motif").count() === 1);
  const sans = net(await pg.locator(".f-pan-annee").innerText());
  j.controle("aucune ligne de provenance", !/Planche/.test(sans));
  await fermerFiche(pg);

  await ctx.close();
  return j.fin(erreurs);
}
