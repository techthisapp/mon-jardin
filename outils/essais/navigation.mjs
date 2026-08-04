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

  /* La date est montée dans le bandeau, à la place du climat du jardin, qui ne
     change pas d'un jour à l'autre. Elle y est unique et suit les deux écrans. */
  j.section("la date est dans le bandeau, une seule fois");
  j.controle("elle est dans le bandeau", await pg.locator(".tete #dateJour").count() === 1);
  j.controle("il n'y en a pas d'autre ailleurs", await pg.locator(".date-jour").count() === 1);
  j.controle("elle est ouverte par sa pastille de saison",
    Math.round(await pg.locator("#dateJour .dj-saison").evaluate(
      e => e.getBoundingClientRect().width)) === 8);
  const txt = await pg.locator("#dateJour").innerText();
  j.controle("la quinzaine n'y est plus", !/quinzaine/.test(txt), txt);
  j.controle("le climat du jardin ne paraît plus quand il est renseigné",
    await pg.locator("#puceClimat").isVisible() === false);
  j.controle("l'écran du moment ne porte plus la ligne de l'année",
    await pg.locator("#vueEnsemble .regle-annee").count() === 0);

  j.section("la date ouvre le jour");
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
  j.controle("la feuille du jour n'a pas de retour, elle vient de l'écran",
    await pg.locator("#retourFeuille").isVisible() === false);
  await pg.locator('#feuille-corps .mesure[data-vue="lumiere"]').click();
  await pg.waitForTimeout(500);
  j.controle("chaque mesure ouvre encore sa propre feuille",
    /jour|lumière|soleil/i.test(await pg.locator("#feuille-titre").innerText()),
    (await pg.locator("#feuille-titre").innerText()).split("\n")[0]);

  /* Une feuille ouverte depuis une autre garde le chemin de celle qu'elle
     recouvre : sans lui, la croix était la seule sortie et faisait tout fermer. */
  j.section("le retour remonte d'un cran, la croix ferme tout");
  j.controle("le chemin du retour nomme la feuille recouverte",
    await pg.locator("#retourFeuille").isVisible() === true,
    await pg.locator("#retourNom").textContent().catch(() => "absent"));
  j.controle("il nomme la feuille du jour",
    (await pg.locator("#retourNom").textContent()) === "Le jour");
  await pg.locator("#retourFeuille").click();
  await pg.waitForTimeout(500);
  j.controle("le retour ramène à la feuille du jour",
    (await pg.locator("#feuille-titre").innerText()).split("\n")[0] === "Le jour");
  j.controle("et le chemin disparaît, il n'y a plus de cran au-dessus",
    await pg.locator("#retourFeuille").isVisible() === false);
  await pg.locator('#feuille-corps .mesure[data-vue="saison"]').click();
  await pg.waitForTimeout(500);
  const ruban = await pg.locator("#feuille-corps .ra-s").count();
  j.controle("la saison porte le ruban de l'année", ruban === 5, ruban + " bandes");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);
  j.controle("la croix ferme tout d'un coup", await cache("#feuille") === 1);

  await pg.locator('.onglet[data-ecran="planning"]').click();
  await pg.waitForTimeout(900);
  j.controle("le bandeau garde la date sur le calendrier", await visible("#dateJour") === 1,
    await pg.locator("#dateJour").innerText().catch(() => "absente"));
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

  await pg.locator("#dateJour").click();
  await pg.waitForTimeout(600);
  j.controle("et la même feuille du jour",
    (await pg.locator("#feuille-titre").innerText()).split("\n")[0] === "Le jour");

  await ctx.close();
  return j.fin(erreurs);
}
