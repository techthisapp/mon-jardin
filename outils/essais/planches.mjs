/* Planches d'herbier et réglages de l'écran des plantes. Les contrôles portent sur ce qui ne se voit pas dans le
   rendu : la vignette n'apparaît que là où une planche existe, son masque n'est
   posé qu'à l'approche de la rangée, la planche remplace le motif décoratif
   dans l'entête, et la provenance est énoncée, planche du genre comprise. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, ongletIdentite, net } from "./commun.mjs";

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
  await ongletIdentite(pg);
  const ident = net(await pg.locator(".f-bloc", { hasText: "Identité" }).first().innerText());
  j.controle("la provenance est énoncée",
    /Planche\s+Vilmorin-Andrieux/.test(ident), (ident.match(/Planche[^\n]{0,60}/) || [""])[0]);
  j.controle("elle ne dit pas le genre pour une planche de l'espèce",
    !/planche du genre/.test(ident));
  await fermerFiche(pg);

  j.section("la planche du genre se signale");
  await ouvrirFiche(pg, "Rosier");
  await ongletIdentite(pg);
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

  j.section("la vignette suit la plante sur les autres écrans");
  const frise = await pg.evaluate(() => {
    const b = document.querySelector('.onglet[data-ecran="planning"]');
    if (b) b.click();
    const v = document.querySelectorAll("#rangees .v-planche");
    return { rangees: document.querySelectorAll("#rangees .rangee").length, vignettes: v.length };
  });
  j.controle("la frise annuelle en porte, sans en mettre partout",
    frise && frise.vignettes > 0 && frise.vignettes < frise.rangees,
    frise && `${frise.vignettes} vignettes sur ${frise.rangees} rangées`);
  await pg.evaluate(() => document.querySelector('.onglet[data-ecran="maintenant"]').click());
  await pg.waitForTimeout(500);
  const tache = await pg.evaluate(() => {
    const b = document.querySelector(".syn-ligne");
    if (!b) return null;
    b.click();
    return document.querySelectorAll("#maintenant .v-planche").length;
  });
  await pg.waitForTimeout(500);
  j.controle("la liste d'une tâche en porte", tache !== null && tache > 0, tache);
  await pg.evaluate(() => {
    const r = document.querySelector(".barre-niveau .pas, .barre-niveau button");
    if (r) r.click();
  });
  await pg.waitForTimeout(400);
  await ouvrirListeDesPlantes(pg);

  j.section("le bloc de filtres s'ouvre replié");
  const filtres = await pg.evaluate(() => {
    const b = document.getElementById("basculeFiltresS"), c = document.getElementById("corpsFiltresS");
    if (!b || !c) return null;
    const ferme = c.hidden;
    b.click();
    const ouvert = !c.hidden;
    b.click();
    return { ferme, ouvert, rendu: c.hidden };
  });
  j.controle("il est replié au premier affichage", filtres && filtres.ferme);
  j.controle("le bouton l'ouvre et le referme",
    filtres && filtres.ouvert && filtres.rendu);

  j.section("la jauge de climat porte quatre crans d'une seule encre");
  const crans = await pg.evaluate(() => {
    const g = document.querySelector(".legende-clim .jauge");
    if (!g) return null;
    const teintes = [...document.querySelectorAll(".legende-clim .jauge .cran.plein")]
      .map(e => getComputedStyle(e).backgroundColor);
    return { total: g.children.length, teintes: [...new Set(teintes)] };
  });
  j.controle("quatre crans", crans && crans.total === 4, crans && crans.total);
  j.controle("deux teintes au plus, le vert et son repli",
    crans && crans.teintes.length <= 2, crans && crans.teintes.join(" "));

  j.section("la légende tient sur une ligne, en tête du tableau");
  const leg = await pg.evaluate(() => {
    const e = document.getElementById("legendeClim");
    if (!e || e.hidden) return null;
    const st = getComputedStyle(e);
    return {
      tient: e.scrollWidth <= e.clientWidth + 1,
      haut: Math.round(e.getBoundingClientRect().height),
      cadre: st.borderTopWidth !== "0px" || st.boxShadow !== "none",
      avantListe: Boolean(e.compareDocumentPosition(document.getElementById("listes")) & 4),
      apresFiltres: Boolean(document.querySelector(".filtres")
        .compareDocumentPosition(e) & 4),
      titre: e.querySelectorAll(".leg-titre").length,
      etiquette: e.getAttribute("aria-label") || "",
    };
  });
  j.controle("elle ne déborde pas", leg && leg.tient, leg && leg.haut + " px de haut");
  j.controle("elle n'a plus de cadre", leg && !leg.cadre);
  j.controle("elle est posée après le filtre et avant la liste",
    leg && leg.apresFiltres && leg.avantListe);
  j.controle("le climat n'est plus répété à l'écran, il reste pour la lecture assistée",
    leg && leg.titre === 0 && /^Adaptation au climat /.test(leg.etiquette), leg && leg.etiquette);

  await ctx.close();
  return j.fin(erreurs);
}
