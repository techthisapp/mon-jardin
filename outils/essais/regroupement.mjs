/* Le regroupement de la liste complète, et ce qui a quitté l'écran du jour.

   Un bloc de filtres s'ouvrait sous le dicton, à trois cents points du bouton
   qui l'ouvrait. Il portait trois contrôles : un regroupement qui n'agissait
   que sur la liste complète, un filtre par tâche qui doublait la synthèse et
   dont l'état ne survivait pas à un rechargement, et un filtre par espace qui
   partageait sa valeur avec l'écran de l'année et le filtrait sans le dire.

   Le regroupement est descendu dans la barre de la liste complète, les deux
   filtres sont partis, et le choix d'espace appartient au seul écran de
   l'année. Les contrôles portent sur ces trois points, et sur la tenue de la
   barre, qui porte maintenant trois éléments au lieu de deux. */
import { ouvrirContexte, journal, net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const ESPACES = [
  { id: "e1", name: "Jardin potager", color: "#7BA05B" },
  { id: "e2", name: "Jardin d'ornement" },
  { id: "e3", name: "Jardin verger" },
];
const JARDIN = PLANTES.slice(0, 40);
// Trente plantes placées, dix laissées dehors : la section « Non placées » existe.
const PLACEMENTS = JARDIN.slice(0, 30)
  .map((p, i) => ({ plant_id: p.id, espace_id: ESPACES[i % 3].id }));

const LARGEURS = [320, 360, 430];

export default async function essai(navigateur) {
  const j = journal("Regroupement de la liste");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { jardin: JARDIN.map(p => p.id), espaces: ESPACES, placements: PLACEMENTS });
  await pg.waitForTimeout(900);

  j.section("l'écran du jour a rendu son bloc de filtres");
  j.controle("le pied ne porte que le compte et la liste",
    net(await pg.locator("#piedVue").innerText()) === "66 actions sur 34 plantes Tout voir",
    net(await pg.locator("#piedVue").innerText()));
  j.controle("le bouton des filtres a disparu",
    await pg.locator("#basculeFiltresM").count() === 0);
  j.controle("le bloc qu'il ouvrait aussi",
    await pg.locator("#corpsFiltresM, .filtres-moment").count() === 0);
  /* Le dicton fermait l'écran, et le bloc s'ouvrait après lui. Rien ne le suit
     plus, hors la barre du bas. */
  j.controle("le dicton ferme l'écran",
    await pg.evaluate(() => {
      const d = document.getElementById("dicton");
      const apres = [...d.parentElement.children].slice(
        [...d.parentElement.children].indexOf(d) + 1);
      return apres.filter(e => e.offsetParent !== null).length === 0;
    }));

  j.section("le regroupement se tient dans la barre de la liste");
  await pg.locator("#btnTout").click();
  await pg.waitForTimeout(800);
  const barre = await pg.evaluate(() => {
    const b = document.getElementById("barreNiveau");
    return [...b.children].map(e => e.className.split(" ")[0]);
  });
  j.controle("elle porte le retour, le regroupement puis le rail",
    JSON.stringify(barre) === '["retour","bascule-vue","rail"]', JSON.stringify(barre));
  const seg = await pg.locator("#barreNiveau .bascule-vue .vue")
    .evaluateAll(l => l.map(b => b.textContent + (b.classList.contains("active") ? "*" : "")));
  j.controle("deux segments, la tâche retenue au départ",
    JSON.stringify(seg) === '["Tâche*","Espace"]', JSON.stringify(seg));
  j.controle("les sections sont celles des tâches",
    (await pg.locator(".section-liste .nom-niveau").allInnerTexts())[0] === "Tailler",
    (await pg.locator(".section-liste .nom-niveau").allInnerTexts()).join(" | "));

  j.section("il change le découpage de la liste");
  await pg.locator('#barreNiveau .bascule-vue .vue:not(.active)').click();
  await pg.waitForTimeout(800);
  const parEspace = (await pg.locator(".section-liste .nom-niveau").allInnerTexts()).map(net);
  j.controle("une section par espace, les non placées à la fin",
    JSON.stringify(parEspace) === JSON.stringify(["Jardin potager", "Jardin d'ornement",
      "Jardin verger", "Non placées"]), JSON.stringify(parEspace));
  j.controle("le rail suit le découpage",
    JSON.stringify((await pg.locator(".puce-rail").allInnerTexts()).map(net))
      === JSON.stringify(parEspace));
  /* La position se comptait depuis la barre collante : le chevron puis le
     regroupement s'ajoutaient à l'écart et le rail défilait au delà de la puce
     à montrer. */
  j.controle("le rail montre bien sa première puce",
    await pg.evaluate(() => Math.round(document.querySelector(".rail").scrollLeft)) === 0
    && await pg.locator(".puce-rail.ici").first().innerText()
      .then(t => net(t)) === "Jardin potager");

  j.section("la barre tient sur les écrans étroits");
  for (const L of LARGEURS) {
    await pg.setViewportSize({ width: L, height: 900 });
    await pg.waitForTimeout(400);
    const m = await pg.evaluate(() => {
      const b = document.getElementById("barreNiveau"), r = b.querySelector(".rail");
      return { bascule: Math.round(b.querySelector(".bascule-vue").getBoundingClientRect().width),
               rail: Math.round(r.getBoundingClientRect().width),
               large: document.documentElement.scrollWidth,
               vue: document.documentElement.clientWidth };
    });
    // Le regroupement ne se comprime pas, c'est le rail qui défile.
    j.controle(`à ${L} points, la page ne déborde pas`,
      m.large <= m.vue + 1 && m.bascule === 114 && m.rail > 40,
      `regroupement ${m.bascule} px, rail ${m.rail} px`);
  }
  await pg.setViewportSize({ width: 430, height: 940 });
  await pg.waitForTimeout(300);

  /* Le choix se garde d'une ouverture à l'autre, c'est une préférence de
     lecture. Il ne rouvre pas la liste pour autant. */
  j.section("le regroupement se retient");
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);
  await pg.locator("#btnTout").click();
  await pg.waitForTimeout(700);
  j.controle("l'espace est encore retenu à la réouverture",
    net(await pg.locator("#barreNiveau .bascule-vue .vue.active").innerText()) === "Espace");
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);

  /* Le filtre d'espace appartient au seul écran de l'année. Il portait un nom
     général et une valeur partagée : choisir un espace d'un côté filtrait
     l'autre sans le dire. */
  j.section("le filtre d'espace ne sort plus de l'écran de l'année");
  const avant = net(await pg.locator("#bilanMoment").innerText());
  await pg.locator('.onglet[data-ecran="planning"]').dispatchEvent("click");
  await pg.waitForTimeout(700);
  await pg.locator("#basculeFiltres").click();
  await pg.waitForTimeout(400);
  await pg.locator("#chipsEspaceP .chip").nth(1).click();
  await pg.waitForTimeout(700);
  j.controle("l'année se filtre bien",
    net(await pg.locator("#bilanPlan").innerText()) === "10 sur 34 affichées",
    net(await pg.locator("#bilanPlan").innerText()));
  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(800);
  j.controle("le jour n'en sait rien",
    net(await pg.locator("#bilanMoment").innerText()) === avant,
    `${avant} puis ${net(await pg.locator("#bilanMoment").innerText())}`);

  await ctx.close();
  return j.fin(erreurs);
}
