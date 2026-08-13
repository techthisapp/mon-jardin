/* La frise de l'année : sa légende et ses barres.

   Les dix couleurs n'étaient nommées que dans le panneau des filtres, replié :
   les barres se lisaient sans qu'on sache de quelle tâche elles parlent. Un
   rond d'information ouvre la légende, à côté des filtres et sans les toucher.

   Une barre ne portait qu'une infobulle de survol, sans effet au doigt. Elle
   devient un bouton qui ouvre ses bornes et le conseil propre à cette fenêtre,
   qui n'est pas celui de la fenêtre en cours : sur la frise on touche une barre
   de mars au mois d'août. */
import { ouvrirContexte, journal, net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const AU_JARDIN = PLANTES.slice(0, 14).map(p => p.id);
/* Deux espaces et dix plantes placées : de quoi éprouver les trois lectures,
   la section des non placées comprise. */
const ESPACES = [{ id: "e1", name: "Potager", color: "#7BA05B" },
                 { id: "e2", name: "Verger" }];
const PLACEMENTS = PLANTES.slice(0, 10)
  .map((p, i) => ({ plant_id: p.id, espace_id: i % 2 ? "e2" : "e1" }));

const groupe = async pg => pg.evaluate(() => ({
  titres: [...document.querySelectorAll("#rangees .tete-frise")].map(e =>
    e.querySelector("b").textContent + " " + e.querySelector(".nb").textContent),
  rangees: document.querySelectorAll("#rangees .rangee").length,
  blocs: document.querySelectorAll("#rangees .bloc-frise").length,
  actif: document.querySelector("#basculeAnnee .vue.active").textContent,
}));

async function versAnnee(pg) {
  await pg.locator('.onglet[data-ecran="planning"]').dispatchEvent("click");
  await pg.waitForTimeout(800);
}

export default async function essai(navigateur) {
  const j = journal("Frise de l'année");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { jardin: AU_JARDIN, espaces: ESPACES, placements: PLACEMENTS });
  await pg.setViewportSize({ width: 393, height: 852 });
  await pg.waitForTimeout(800);
  await versAnnee(pg);

  j.section("un rond d'information ouvre la légende");
  j.controle("il se tient dans la barre des filtres",
    await pg.locator(".barre-filtres #btnLegende").count() === 1);
  /* Il ne déplie pas les filtres : la légende se lit sans changer ce qui est
     affiché. */
  await pg.locator("#btnLegende").click();
  await pg.waitForTimeout(700);
  j.controle("le panneau des filtres reste replié",
    await pg.locator("#corpsFiltres[hidden]").count() === 1);
  j.controle("la feuille s'intitule des couleurs de l'année",
    net(await pg.locator("#feuille-titre").innerText()) === "Les couleurs de l'année",
    net(await pg.locator("#feuille-titre").innerText()));
  const lignes = (await pg.locator("#feuille-corps .lg-ligne").allInnerTexts()).map(net);
  const phases10 = lignes;
  j.controle("les dix tâches sont nommées, dans l'ordre du référentiel",
    lignes.length === 10 && lignes[0] === "Semis à l'abri" && lignes[9] === "Protection hivernale",
    lignes.length + " : " + lignes.slice(0, 2).join(", ") + "…");
  /* Chaque ligne porte la teinte de sa tâche, celle-là même que la frise
     dessine : une légende qui ne les partagerait pas n'expliquerait rien. */
  const memes = await pg.evaluate(() => {
    const leg = [...document.querySelectorAll("#feuille-corps .lg-ligne i")]
      .map(n => getComputedStyle(n).backgroundColor);
    const barres = [...document.querySelectorAll("#rangees .seg")]
      .map(n => getComputedStyle(n).backgroundColor);
    return { leg, inconnues: barres.filter(c => !leg.includes(c)).length };
  });
  j.controle("les teintes de la frise sont toutes dans la légende",
    memes.inconnues === 0 && new Set(memes.leg).size === 10,
    `${memes.inconnues} teintes hors légende, ${new Set(memes.leg).size} teintes déclarées`);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);

  /* Sept points de haut ne se touchent pas du doigt : la barre étend sa cible
     au-dessus et au-dessous, sans grandir à l'œil. */
  j.section("une barre se touche et s'annonce");
  const cible = await pg.evaluate(() => {
    const s = document.querySelector("#rangees .seg");
    const r = s.getBoundingClientRect();
    const a = getComputedStyle(s, "::after");
    return { haut: Math.round(r.height), role: s.getAttribute("role"),
             tab: s.getAttribute("tabindex"), debord: a.top };
  });
  j.controle("elle porte un rôle de bouton et prend le clavier",
    cible.role === "button" && cible.tab === "0", `${cible.role} ${cible.tab}`);
  j.controle("sa cible dépasse le trait de sept points",
    cible.debord === "-7px", `trait de ${cible.haut} px, cible étendue de ${cible.debord}`);
  const lu = await pg.locator("#rangees .seg").first().getAttribute("aria-label");
  /* « Plantation, repiquage » porte une virgule : la coupure se fait sur la
     borne, non sur la première virgule venue. */
  const couper = t => {
    const m = String(t).match(/^(.*), (de .+|toute l'année)$/);
    return m ? { tache: m[1], bornes: m[2] } : { tache: t, bornes: "" };
  };
  j.controle("elle nomme sa tâche et ses bornes",
    Boolean(couper(lu).bornes) && phases10.includes(couper(lu).tache),
    lu);

  /* Le conseil est celui de la fenêtre touchée. Une plante taillée deux fois
     dans l'année ne rend pas le texte d'hiver quand on touche la barre d'été. */
  j.section("la barre ouvre ses bornes et son conseil");
  const barre = pg.locator("#rangees .seg").nth(3);
  const attendu = couper(await barre.getAttribute("aria-label"));
  await barre.click();
  await pg.waitForTimeout(700);
  const titre = net(await pg.locator("#feuille-titre").innerText());
  j.controle("la feuille prend la tâche pour titre et la plante pour sous-titre",
    titre.startsWith(attendu.tache) && titre.length > attendu.tache.length, titre);
  const bornes = net(await pg.locator("#feuille-corps .pe-bornes").innerText());
  j.controle("les bornes sont dites en toutes lettres",
    bornes.toLowerCase() === attendu.bornes.toLowerCase(),
    `${bornes} pour ${attendu.bornes}`);
  j.controle("la teinte de la barre est reprise",
    await pg.evaluate(() => getComputedStyle(
      document.querySelector("#feuille-corps .pe-bornes i")).backgroundColor)
      === await barre.evaluate(n => getComputedStyle(n).backgroundColor));
  const corps = net(await pg.locator("#feuille-corps").innerText());
  j.controle("la feuille situe la quinzaine en cours",
    /quinzaine/.test(corps), corps.slice(0, 90));
  j.controle("elle dit d'où viennent les périodes",
    /Période du référentiel, décalée par le climat/.test(corps));

  /* La fiche ouverte depuis une feuille garde le chemin de celle qu'elle
     recouvre, comme une feuille ouverte depuis une autre. */
  j.section("la fiche s'ouvre depuis la période, et le retour tient");
  await pg.locator("#feuille-corps .pe-fiche").click();
  await pg.waitForTimeout(700);
  j.controle("la fiche est à l'écran",
    net(await pg.locator("#feuille-titre").innerText()).length > 0
    && await pg.locator("#feuille-corps .f-onglets").count() === 1);
  j.controle("le retour ramène à la période",
    await pg.locator("#retourFeuille:not([hidden])").count() === 1
    && net(await pg.locator("#retourNom").innerText()) === attendu.tache,
    net(await pg.locator("#retourNom").innerText().catch(() => "aucun")));
  await pg.locator("#retourFeuille").click();
  await pg.waitForTimeout(600);
  j.controle("et la période est bien revenue",
    net(await pg.locator("#feuille-corps .pe-bornes").innerText()) === bornes);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);

  /* Ouverte depuis un écran, une feuille n'a pas de chemin de retour : le
     chemin ne se fabrique que d'une feuille à l'autre. */
  j.section("ouverte depuis l'écran, la fiche n'a pas de retour");
  await pg.locator("#rangees .nom-plante").first().click();
  await pg.waitForTimeout(700);
  j.controle("aucun chemin de retour",
    await pg.locator("#retourFeuille").isVisible() === false);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);

  /* Le même regroupement que la liste complète du jour, appliqué aux rangées de
     la frise. Trois lectures : l'ordre alphabétique de départ, la typologie du
     référentiel, et le découpage du jardin. */
  j.section("les rangées se regroupent en trois lectures");
  const segments = (await pg.locator("#basculeAnnee .vue").allInnerTexts()).map(net);
  j.controle("trois segments, l'alphabet retenu au départ",
    JSON.stringify(segments) === '["A à Z","Type","Espace"]', JSON.stringify(segments));
  const plat = await groupe(pg);
  j.controle("à plat, aucune section et un seul bloc",
    plat.actif === "A à Z" && plat.titres.length === 0 && plat.blocs === 1,
    JSON.stringify(plat));

  const choisir = async v => {
    await pg.locator(`#basculeAnnee .vue[data-vue="${v}"]`).click();
    await pg.waitForTimeout(600);
    return groupe(pg);
  };
  const parType = await choisir("typo");
  j.controle("par type, une section par typologie du référentiel",
    JSON.stringify(parType.titres) === '["Légumes 5","Fruits 4","Aromatiques 2","Ornement 3"]',
    JSON.stringify(parType.titres));
  j.controle("aucune rangée perdue en chemin",
    parType.rangees === plat.rangees, `${plat.rangees} à plat, ${parType.rangees} par type`);
  /* Les rangées vivent dans leur bloc : la rayure une ligne sur deux se compte
     par section, un titre inséré dans le flux l'aurait décalée à chaque fois. */
  j.controle("chaque section enferme ses rangées",
    parType.blocs === parType.titres.length, `${parType.blocs} blocs`);

  const parEspace = await choisir("espace");
  j.controle("par espace, les non placées ferment la liste",
    JSON.stringify(parEspace.titres) === '["Potager 5","Verger 5","Non placées 4"]',
    JSON.stringify(parEspace.titres));
  /* Les barres restent les mêmes, quel que soit le regroupement : il range les
     rangées, il ne touche pas à ce qu'elles disent. */
  j.controle("les barres ne changent pas avec le regroupement",
    await pg.locator("#rangees .seg").count()
      === await (async () => { await choisir("alpha");
        return pg.locator("#rangees .seg").count(); })(),
    await pg.locator("#rangees .seg").count() + " barres");

  /* Un jardin sans espace n'a pas de découpage à proposer : le segment ne
     paraît pas, et un choix devenu impossible retombe sur l'alphabet. */
  j.section("sans espace, le regroupement par espace n'est pas offert");
  const c = await ouvrirContexte(navigateur, { jardin: AU_JARDIN });
  await c.pg.waitForTimeout(800);
  await versAnnee(c.pg);
  j.controle("deux segments seulement",
    JSON.stringify((await c.pg.locator("#basculeAnnee .vue").allInnerTexts()).map(net))
      === '["A à Z","Type"]',
    JSON.stringify((await c.pg.locator("#basculeAnnee .vue").allInnerTexts()).map(net)));
  await c.ctx.close();

  await ctx.close();
  return j.fin(erreurs.concat(c.erreurs));
}
