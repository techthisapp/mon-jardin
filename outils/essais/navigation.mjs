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

  /* La date oriente sur les quatre écrans. Elle ouvrait une feuille dont les
     trois mesures sont descendues dans l'écran du jour : elle n'a plus rien à
     ouvrir et redevient du texte. */
  j.section("la date oriente, elle n'ouvre plus rien");
  j.controle("elle est dans l'en-tête", await pg.locator(".tete #dateJour").count() === 1);
  j.controle("il n'y en a pas d'autre ailleurs", await pg.locator(".date-jour").count() === 1);
  j.controle("elle porte sa pastille de saison",
    Math.round(await pg.locator("#dateJour .dj-saison").evaluate(
      e => e.getBoundingClientRect().width)) === 8);
  j.controle("ce n'est plus un bouton",
    await pg.locator("#dateJour").evaluate(e => e.tagName) === "SPAN");
  const txt = await pg.locator("#dateJour").innerText();
  j.controle("la quinzaine n'y est plus", !/quinzaine/.test(txt), txt);
  j.controle("le climat du jardin ne paraît plus quand il est renseigné",
    await pg.locator("#puceClimat").isVisible() === false);
  j.controle("l'écran du moment ne porte plus la ligne de l'année",
    await pg.locator("#vueEnsemble .regle-annee").count() === 0);

  /* Le temps qu'il fait et les trois mesures du jour tenaient l'en-tête des
     quatre écrans, où ils n'étaient actionnables que sur celui-ci. */
  j.section("le temps et les trois mesures ouvrent l'écran du jour");
  j.controle("l'en-tête ne porte plus la météo",
    await pg.locator(".tete .tm-temps, .tete .tete-meteo").count() === 0);
  j.controle("le bloc du jour est en tête de l'écran",
    await pg.locator("#vueEnsemble > *").first().evaluate(e => e.id) === "blocTemps");
  const noms = await pg.locator("#blocTemps .mj-nom").allInnerTexts();
  j.controle("il porte l'eau, la lumière et la saison, nommées",
    noms.join(" | ") === "L'EAU | LA LUMIÈRE | LA SAISON", noms.join(" | "));
  const colonnes = await pg.locator("#blocTemps .mesure-j").evaluateAll(
    l => l.map(e => Math.round(e.getBoundingClientRect().top)));
  j.controle("les trois sont sur une seule ligne",
    new Set(colonnes).size === 1, colonnes.join(" | "));
  /* Le seul but de la descente : garder une tâche à l'écran sans défiler. */
  const tenue = await pg.evaluate(() => {
    const l = document.querySelector("#synthese .syn-ligne");
    return l ? { haut: Math.round(l.getBoundingClientRect().top), vue: innerHeight } : null;
  });
  j.controle("la première tâche reste visible sans défiler",
    tenue && tenue.haut < tenue.vue - 60, JSON.stringify(tenue));
  j.controle("la feuille du jour n'existe plus",
    await pg.locator("#feuille-corps .mesure").count() === 0);

  await pg.locator('#blocTemps .mesure-j[data-vue="lumiere"]').click();
  await pg.waitForTimeout(600);
  j.controle("chaque mesure ouvre sa propre feuille",
    /jour|lumière|soleil/i.test(await pg.locator("#feuille-titre").innerText()),
    (await pg.locator("#feuille-titre").innerText()).split("\n")[0]);
  j.controle("ouverte depuis l'écran, elle n'a pas de chemin de retour",
    await pg.locator("#retourFeuille").isVisible() === false);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);

  /* Une feuille ouverte depuis une autre garde le chemin de celle qu'elle
     recouvre : sans lui, la croix était la seule sortie et faisait tout fermer. */
  j.section("le retour remonte d'un cran, la croix ferme tout");
  await pg.locator("#blocTemps .tm-temps").click();
  await pg.waitForTimeout(600);
  await pg.locator('#feuille-corps [data-vue="vigilance"], #feuille-corps .mt-jour').first()
    .click().catch(() => {});
  await pg.waitForTimeout(500);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  await pg.locator('#blocTemps .mesure-j[data-vue="saison"]').click();
  await pg.waitForTimeout(600);
  const ruban = await pg.locator("#feuille-corps .ra-s").count();
  j.controle("la saison porte le ruban de l'année", ruban === 5, ruban + " bandes");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);
  j.controle("la croix ferme tout d'un coup", await cache("#feuille") === 1);

  await pg.locator('.onglet[data-ecran="planning"]').click();
  await pg.waitForTimeout(900);
  j.controle("l'en-tête garde la date sur l'année", await visible("#dateJour") === 1,
    await pg.locator("#dateJour").innerText().catch(() => "absente"));
  j.controle("le bloc du jour ne suit pas, il appartient à son écran",
    await pg.locator("#blocTemps").isVisible() === false);
  /* Le calendrier porte déjà l'axe des douze mois. Le repère du jour y est une
     bande posée sur toute la hauteur du tableau, à l'aplomb de la case du mois
     en cours, et le filtre s'affine à la quinzaine. La mesure se fait ici, seul
     écran où le tableau est affiché. */
  j.section("le calendrier situe le mois en cours");
  j.controle("la ligne de l'année a quitté le calendrier",
    await pg.locator("#regleAnneeP").count() === 0);
  const pose = await pg.evaluate(() => {
    const b = document.getElementById("bandeCourante");
    const zone = document.getElementById("zoneRangees");
    const cases = [...document.getElementById("grilleMois").children];
    const rb = b.getBoundingClientRect(), rz = zone.getBoundingClientRect();
    const ra = cases[7].getBoundingClientRect();
    return {
      montre: !b.hidden,
      centre: Math.round((rb.left + rb.width / 2) - (ra.left + ra.width / 2)),
      largeur: Math.round(rb.width - ra.width),
      hauteur: Math.round(rb.height - rz.height),
      etat: cases[7].className,
    };
  });
  j.controle("la bande du mois en cours est posée", pose.montre);
  j.controle("elle tombe à l'aplomb de la case d'août", Math.abs(pose.centre) <= 1,
    pose.centre + " px");
  j.controle("elle a la largeur d'un mois", Math.abs(pose.largeur) <= 1, pose.largeur + " px");
  j.controle("elle couvre toute la hauteur du tableau", Math.abs(pose.hauteur) <= 1,
    pose.hauteur + " px");
  j.controle("la case d'août marque la première quinzaine",
    pose.etat.includes("en-cours") && pose.etat.includes("q1"), pose.etat);

  j.section("le filtre du calendrier s'affine à la quinzaine");
  j.controle("les jetons de quinzaine attendent qu'un mois soit retenu",
    await cache("#jeuQuinz") === 1);
  await pg.locator("#grilleMois > *").nth(7).click();
  await pg.waitForTimeout(700);
  j.controle("la case d'août retient le filtre",
    await pg.locator("#grilleMois > *").nth(7).getAttribute("aria-pressed") === "true");
  const fondAout = await pg.locator("#grilleMois > *").nth(7)
    .evaluate(e => getComputedStyle(e).backgroundColor);
  j.controle("elle prend l'aplat de sélection, non le dégradé de quinzaine",
    fondAout === "rgb(76, 140, 63)", fondAout);
  j.controle("le bilan nomme le mois retenu",
    (await pg.locator("#bilanPlan").innerText()).includes("août"),
    await pg.locator("#bilanPlan").innerText());
  j.controle("les jetons de quinzaine paraissent", await visible("#jeuQuinz") === 1);
  const bascule = await pg.locator("#basculeFiltres")
    .evaluate(e => { const s = getComputedStyle(e); return [s.backgroundColor, s.color]; });
  j.controle("la bascule des filtres garde son encre lisible sur son fond",
    bascule[0] !== bascule[1], bascule.join(" sur "));

  await pg.locator("#quinz1").click();
  await pg.waitForTimeout(700);
  const demi = await pg.evaluate(() => {
    const b = document.getElementById("bandeMois").getBoundingClientRect();
    const a = document.getElementById("grilleMois").children[7].getBoundingClientRect();
    return { part: b.width / a.width, gauche: Math.round(b.left - a.left) };
  });
  j.controle("la bande retenue se réduit à une demi-case",
    Math.abs(demi.part - 0.5) < 0.05, demi.part.toFixed(2));
  j.controle("et se cale sur la première moitié du mois", Math.abs(demi.gauche) <= 1,
    demi.gauche + " px");
  j.controle("le bilan nomme la quinzaine",
    (await pg.locator("#bilanPlan").innerText()).includes("première quinzaine d'août"),
    await pg.locator("#bilanPlan").innerText());
  await pg.locator("#razMois").click();
  await pg.waitForTimeout(600);
  j.controle("tous les mois relâche le filtre et remise les jetons",
    await cache("#jeuQuinz") === 1 && await cache("#bandeMois") === 1);


  await ctx.close();
  return j.fin(erreurs);
}
