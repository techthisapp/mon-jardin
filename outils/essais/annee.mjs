/* L'année lue à la quinzaine.

   L'écran de l'année s'ouvrait sur la frise entière, trente-quatre rangées de
   barres colorées sous quatre commandes. Il s'ouvre maintenant sur la
   quinzaine en cours, résumée par geste : chaque geste nomme les plantes du
   jardin qu'il concerne. Deux flèches parcourent les vingt-quatre quinzaines,
   une bascule rend la frise.

   Les contrôles portent sur l'ouverture, sur l'accord du compte avec celui de
   l'écran du jour, sur le parcours et son passage d'une année à l'autre, sur
   une fenêtre à cheval sur le 1er janvier, sur la fiche ouverte depuis une
   plante, et sur la bascule. */
import { ouvrirContexte, journal, net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const par = n => PLANTES.find(p => p.name === n);
// Le figuier se multiplie de fin novembre à début février : sa fenêtre
// enjambe le 1er janvier.
const FIGUIER = par("Figuier");
const JARDIN = [FIGUIER, ...PLANTES.filter(p => p !== FIGUIER).slice(0, 15)];

const etat = pg => pg.evaluate(() => ({
  titre: document.getElementById("titreQuinz").textContent,
  sous: document.getElementById("sousQuinz").textContent,
  retour: !document.getElementById("quinzEnCours").hidden,
  gestes: [...document.querySelectorAll("#gestesQuinz .geste-quinz")].map(c => ({
    k: c.dataset.tache,
    nom: c.querySelector(".nom-geste").textContent,
    nb: Number(c.querySelector(".nb").textContent),
    rangees: c.querySelectorAll(".plante-quinz").length,
    plantes: [...c.querySelectorAll(".plante-quinz .nom-pq")].map(e => e.firstChild.textContent),
  })),
  bilan: (document.querySelector("#gestesQuinz .bilan-quinz") || {}).textContent || "",
}));
const clic = async (pg, id, n = 1) => {
  for (let i = 0; i < n; i++) { await pg.locator("#" + id).click(); await pg.waitForTimeout(120); }
};
const multiplie = (e, nom) => (e.gestes.find(g => g.k === "multiplication") || { plantes: [] })
  .plantes.includes(nom);

export default async function essai(navigateur) {
  const j = journal("Année à la quinzaine");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur, { jardin: JARDIN.map(p => p.id) });
  await pg.setViewportSize({ width: 393, height: 852 });
  await pg.waitForTimeout(800);
  const bilanJour = net(await pg.locator("#bilanMoment").innerText());

  await pg.locator('.onglet[data-ecran="planning"]').dispatchEvent("click");
  await pg.waitForTimeout(700);

  j.section("l'année s'ouvre sur la quinzaine en cours");
  j.controle("la quinzaine est à l'écran, la frise derrière la bascule",
    await pg.locator("#vueQuinzaine").isVisible() && !(await pg.locator("#vueFrise").isVisible()));
  const seg = await pg.locator("#lectureAnnee .vue")
    .evaluateAll(l => l.map(b => b.textContent + (b.classList.contains("active") ? "*" : "")));
  j.controle("la bascule porte les deux lectures, la quinzaine retenue",
    JSON.stringify(seg) === '["Quinzaine*","Toute l\'année"]', JSON.stringify(seg));
  let e = await etat(pg);
  j.controle("le titre nomme la quinzaine", e.titre === "Première quinzaine d'août", e.titre);
  j.controle("le sous-titre en donne les jours et la dit en cours",
    e.sous === "du 1er au 15 août, en cours", e.sous);
  j.controle("aucun lien de retour sur la quinzaine en cours", !e.retour);
  j.controle("le compte est celui de l'écran du jour",
    net(e.bilan) === bilanJour, `${net(e.bilan)} contre ${bilanJour}`);

  j.section("un geste par carte, ses plantes en rangées");
  const ordre = ["taille", "fertilisation", "multiplication", "protection_ete",
    "protection", "abri", "terre", "plant", "recolte", "floraison"];
  const cles = e.gestes.map(g => g.k);
  j.controle("les gestes suivent l'ordre de l'écran du jour",
    cles.length > 2 && cles.every((k, i) => i === 0 || ordre.indexOf(k) > ordre.indexOf(cles[i - 1])),
    cles.join(", "));
  j.controle("chaque carte compte ses rangées",
    e.gestes.every(g => g.nb === g.rangees && g.nb > 0),
    e.gestes.map(g => `${g.nom} ${g.nb}/${g.rangees}`).join(", "));
  j.controle("les plantes s'y rangent par ordre alphabétique",
    e.gestes.every(g => g.plantes.every((n, i) => !i || g.plantes[i - 1].localeCompare(n, "fr") <= 0)));
  j.controle("seules les plantes du jardin y paraissent",
    e.gestes.every(g => g.plantes.every(n => JARDIN.some(p => p.name === n))));

  j.section("les flèches parcourent les quinzaines");
  await clic(pg, "quinzSuiv");
  e = await etat(pg);
  j.controle("la suivante est la seconde d'août", e.titre === "Seconde quinzaine d'août", e.titre);
  j.controle("ses jours vont jusqu'au 31", e.sous === "du 16 au 31 août", e.sous);
  j.controle("le lien de retour paraît", e.retour);
  await clic(pg, "quinzPrec", 2);
  e = await etat(pg);
  j.controle("deux pas en arrière mènent à la seconde de juillet",
    e.titre === "Seconde quinzaine de juillet", e.titre);
  await clic(pg, "quinzEnCours");
  e = await etat(pg);
  j.controle("le lien ramène à la quinzaine en cours",
    e.titre === "Première quinzaine d'août" && !e.retour, e.titre);

  j.section("le parcours passe d'une année à l'autre");
  await clic(pg, "quinzPrec", 14);
  e = await etat(pg);
  j.controle("quatorze pas en arrière mènent à début janvier",
    e.titre === "Première quinzaine de janvier", e.titre);
  j.controle("le figuier s'y multiplie, sa fenêtre ayant enjambé l'année", multiplie(e, "Figuier"));
  await clic(pg, "quinzPrec");
  e = await etat(pg);
  j.controle("un pas de plus mène à fin décembre", e.titre === "Seconde quinzaine de décembre", e.titre);
  j.controle("décembre compte ses trente et un jours", e.sous === "du 16 au 31 décembre", e.sous);
  j.controle("le figuier s'y multiplie aussi", multiplie(e, "Figuier"));
  await clic(pg, "quinzSuiv");
  e = await etat(pg);
  j.controle("la flèche suivante repasse en janvier", e.titre === "Première quinzaine de janvier", e.titre);
  await clic(pg, "quinzSuiv", 10);
  e = await etat(pg);
  j.controle("en juin, hors de sa fenêtre, il n'est plus nommé",
    e.titre === "Première quinzaine de juin" && !multiplie(e, "Figuier"), e.titre);
  await clic(pg, "quinzEnCours");

  j.section("une plante ouvre sa fiche");
  const premiere = pg.locator("#gestesQuinz .plante-quinz").first();
  const nom = await premiere.locator(".nom-pq").evaluate(x => x.firstChild.textContent);
  await premiere.click();
  await pg.waitForTimeout(700);
  j.controle("la fiche est celle de la plante touchée",
    await pg.locator("#feuille").isVisible()
      && net(await pg.locator("#feuille-titre").innerText()).startsWith(nom), nom);
  await pg.keyboard.press("Escape");
  await pg.waitForTimeout(500);
  j.controle("la fiche refermée rend la quinzaine", await pg.locator("#vueQuinzaine").isVisible());

  j.section("la bascule rend la frise entière");
  await clic(pg, "quinzSuiv", 3);
  await pg.locator('#lectureAnnee .vue[data-lecture="frise"]').click();
  await pg.waitForTimeout(500);
  j.controle("la frise est à l'écran, la quinzaine cachée",
    await pg.locator("#vueFrise").isVisible() && !(await pg.locator("#vueQuinzaine").isVisible()));
  const rangees = await pg.locator("#rangees .rangee").count();
  j.controle("la frise porte ses rangées", rangees > 0, rangees + " rangées");
  j.controle("ses filtres l'accompagnent", await pg.locator("#basculeFiltres").isVisible());
  j.controle("le repère du jour est posé", await pg.locator("#marqueurJour").isVisible());
  await pg.locator('#lectureAnnee .vue[data-lecture="quinzaine"]').click();
  await pg.waitForTimeout(400);
  e = await etat(pg);
  j.controle("revenir à la quinzaine garde celle qu'on lisait",
    e.titre === "Seconde quinzaine de septembre", e.titre);

  j.section("l'écran rouvert repart de la quinzaine en cours");
  await pg.locator('#lectureAnnee .vue[data-lecture="frise"]').click();
  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  await pg.locator('.onglet[data-ecran="planning"]').dispatchEvent("click");
  await pg.waitForTimeout(500);
  e = await etat(pg);
  j.controle("la quinzaine est rouverte, non la frise",
    await pg.locator("#vueQuinzaine").isVisible() && !(await pg.locator("#vueFrise").isVisible()));
  j.controle("sur la quinzaine en cours", e.titre === "Première quinzaine d'août", e.titre);

  j.section("la quinzaine tient dans l'écran");
  for (const L of [320, 360, 430]) {
    await pg.setViewportSize({ width: L, height: 852 });
    await pg.waitForTimeout(300);
    const d = await pg.evaluate(() => ({
      large: document.documentElement.scrollWidth, vue: document.documentElement.clientWidth,
      titre: (() => { const t = document.getElementById("titreQuinz"); return t.scrollWidth <= t.clientWidth + 1; })(),
    }));
    j.controle(`à ${L} points, rien ne déborde`, d.large <= d.vue + 1 && d.titre,
      `${d.large} px pour ${d.vue} px`);
  }

  await ctx.close();

  /* Le jardin vide renvoyait au bouton rond, qui n'ouvre plus les plantes
     depuis le 13 août et reste caché sans connexion. Les trois écrans disent
     maintenant ce qui manque : la connexion, ou des plantes à prendre au
     catalogue. */
  j.section("un jardin vide dit ce qui manque");
  const vides = async pg => {
    // Sans session, la feuille du compte s'ouvre d'elle-même au démarrage.
    if (await pg.locator("#feuille").isVisible()) {
      await pg.locator("#fermerFeuille").click();
      await pg.waitForTimeout(500);
    }
    const lire = async sel => net(await pg.locator(sel).innerText());
    const jour = await lire("#videMoment");
    await pg.locator('.onglet[data-ecran="planning"]').dispatchEvent("click");
    await pg.waitForTimeout(500);
    const quinz = await lire("#gestesQuinz");
    await pg.locator('#lectureAnnee .vue[data-lecture="frise"]').click();
    await pg.waitForTimeout(400);
    const frise = await lire("#videPlanning");
    return [jour, quinz, frise];
  };
  const sans = await ouvrirContexte(navigateur, { session: false });
  const m1 = await vides(sans.pg);
  j.controle("sans connexion, les trois écrans invitent à se connecter",
    m1.every(t => t.startsWith("Connectez-vous pour retrouver votre jardin, ou en créer un.")), m1.join(" | "));
  j.controle("aucun ne parle plus du bouton rond", !m1.some(t => /bouton rond/.test(t)));
  /* L'état vide porte les gestes qui le font cesser, et « Mes plantes » sans
     compte ne montre plus le catalogue entier sous « 0 plante au jardin ». */
  await sans.pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await sans.pg.waitForTimeout(400);
  const gestesSans = await sans.pg.locator("#videMoment [data-va]").evaluateAll(l => l.map(b => b.textContent));
  j.controle("sans connexion, l'écran du jour offre de se connecter ou de parcourir le catalogue",
    JSON.stringify(gestesSans) === '["Se connecter","Parcourir le catalogue"]', JSON.stringify(gestesSans));
  await sans.pg.locator('.onglet[data-ecran="plantes"]').dispatchEvent("click");
  await sans.pg.waitForTimeout(500);
  j.controle("« Mes plantes » sans compte dit ce qui manque au lieu de montrer le catalogue",
    await sans.pg.locator("#listes .item-bloc").count() === 0
    && /^Connectez-vous/.test(net(await sans.pg.locator("#videSel").innerText())),
    net(await sans.pg.locator("#videSel").innerText()).slice(0, 60));
  await sans.ctx.close();
  const vide = await ouvrirContexte(navigateur, { jardin: [] });
  const m2 = await vides(vide.pg);
  j.controle("connecté sans plante, ils renvoient au catalogue",
    m2.every(t => t.startsWith("Aucune plante au jardin pour l'instant.")), m2.join(" | "));
  await vide.pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await vide.pg.waitForTimeout(400);
  await vide.pg.locator('#videMoment [data-va="catalogue"]').click();
  await vide.pg.waitForTimeout(600);
  j.controle("« Ajouter mes plantes » ouvre le catalogue",
    await vide.pg.locator("#btnCatalogue[aria-pressed=\"true\"]").count() === 1);
  /* Cocher une plante au catalogue confirme l'ajout et offre le retour au
     jardin. */
  await vide.pg.locator("#listes .rond").first().click();
  await vide.pg.waitForTimeout(500);
  const bandeau = net(await vide.pg.locator("#etat").innerText());
  j.controle("l'ajout se confirme et mène à ses plantes",
    /rejoint le jardin, 1 plante en tout\.\s*Voir mes plantes$/.test(bandeau), bandeau);
  await vide.ctx.close();

  return j.fin(erreurs.concat(sans.erreurs, vide.erreurs));
}
