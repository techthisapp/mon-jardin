/* Journal du jardin. Une entrée datée porte sur un lieu, sur une plante, ou sur
   les deux. Les contrôles portent sur ce que la lecture seule ne montre pas :
   la réunion des entrées d'un espace et de ses zones, la saisie qui suit le
   lieu choisi, la règle qui refuse une entrée vide, et le passage des
   photographies par le compartiment privé, où rien ne s'atteint sans adresse
   signée. */
import { ouvrirContexte, journal, net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const par = n => PLANTES.find(p => p.name === n);
const RHUBARBE = par("Rhubarbe"), FRAISE = par("Fraise"), TOMATE = par("Tomate");

const AU_JARDIN = [RHUBARBE.id, FRAISE.id, TOMATE.id];
const ESPACES = [
  { id: "e1", name: "Potager", surface_m2: 40, exposition: "soleil" },
  { id: "z1", name: "Carré du fond", parent_id: "e1", surface_m2: 10 },
];
const PLACEMENTS = [
  { plant_id: FRAISE.id, espace_id: "e1", quantity: 12 },
  { plant_id: RHUBARBE.id, espace_id: "z1", quantity: 2 },
  { plant_id: TOMATE.id, espace_id: "z1", quantity: 6 },
];
/* Deux entrées posées d'avance : l'une sur l'espace avec une photographie,
   l'autre sur une zone et sur une plante, avec une récolte pesée. */
const CARNET = [
  { id: "o1", garden_id: "g1", espace_id: "e1", plant_id: null, jour: "2026-07-28",
    geste: "traitement", texte: "Purin d'ortie sur tout le carré.",
    quantite: null, unite: null, created_at: "2026-07-28T08:00:00Z" },
  { id: "o2", garden_id: "g1", espace_id: "z1", plant_id: TOMATE.id, jour: "2026-08-01",
    geste: "recolte", texte: null, quantite: 2.4, unite: "kg",
    created_at: "2026-08-01T17:00:00Z" },
];
const PHOTOS_CARNET = [
  { id: "p1", observation_id: "o1", chemin: "g1/o1/1-abcdef01.jpg",
    largeur: 1600, hauteur: 1200, poids: 302144, position: 1 },
];

// Une image verte de deux cent quarante pixels sur cent soixante-seize, seule
// photographie qu'un essai ait à porter.
const IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAPAAAACwCAIAAAC+b3SpAAABYUlEQVR42u3SQQ0AAAjEsFOHCDQhmi8aSJMqWJae"
  + "gjciAYYGQ4OhwdAYGgwNhgZDg6ExNBgaDA2GBkNjaDA0GBoMDYbG0GBoMDQYGgyNocHQYGgwNBgaQ4OhwdBgaDA0"
  + "hgZDg6HB0BgaDA2GBkODoTE0GBoMDYYGQ2NoMDQYGgwNhsbQYGgwNBgaDI2hwdBgaDA0GBpDg6HB0GBoMDSGBkOD"
  + "ocHQYGgMDYYGQ4OhMTQYGgwNhgZDY2gwNBgaDA2GxtBgaDA0GBoMjaHB0GBoMDQYGkODocHQYGgwNIYGQ4OhwdBg"
  + "aAwNhgZDg6ExtAoYGgwNhgZDY2gwNBgaDA2GxtBgaDA0GBoMjaHB0GBoMDQYGkODocHQYGgwNIYGQ4OhwdBgaAwN"
  + "hgZDg6HB0BgaDA2GBkNjaDA0GBoMDYbG0GBoMDQYGgyNocHQYGgwNBgaQ4OhwdBgaDA0hgZDg6HB0HAtFM9nUGHw"
  + "I84AAAAASUVORK5CYII=", "base64");

const journalLieu = pg => pg.locator("#journalLieu");
const entree = (pg, id) => pg.locator(`.entree-carnet[data-entree="${id}"]`);
const form = pg => pg.locator("#formEntree");

async function ouvrirEspace(pg) {
  await pg.locator('.onglet[data-ecran="selection"]').dispatchEvent("click");
  await pg.waitForTimeout(500);
  await pg.locator('.tuile-espace[data-espace="e1"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
}

async function deplierJournal(pg) {
  if (!await journalLieu(pg).evaluate(d => d.open)) {
    await journalLieu(pg).locator("summary").click();
    await pg.waitForTimeout(300);
  }
}

export default async function essai(navigateur) {
  const j = journal("Journal du jardin");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { jardin: AU_JARDIN, espaces: ESPACES, placements: PLACEMENTS,
      carnet: CARNET, photosCarnet: PHOTOS_CARNET });
  pg.on("dialog", d => d.accept());

  await ouvrirEspace(pg);

  j.section("le journal réunit l'espace et ses zones");
  j.controle("il ferme l'écran de l'espace", await journalLieu(pg).count() === 1);
  j.controle("il est replié à l'ouverture",
    !await journalLieu(pg).evaluate(d => d.open));
  const somm = await journalLieu(pg).locator("summary").evaluate(e =>
    [e.querySelector(".zone-nom").textContent, e.querySelector(".nb").textContent,
     e.querySelector(".zone-mesure").textContent].join(" "));
  j.controle("son entête compte les deux entrées et date la dernière",
    net(somm) === "Journal 2 dernière le 1 août", net(somm));

  await deplierJournal(pg);
  const ordre = await pg.locator(".entree-carnet").evaluateAll(l => l.map(e => e.dataset.entree));
  j.controle("la plus récente vient en tête",
    JSON.stringify(ordre) === JSON.stringify(["o2", "o1"]), ordre.join(" "));

  j.section("ce qu'une entrée montre");
  const haut2 = await entree(pg, "o2").locator(".ec-haut").evaluate(e =>
    [...e.children].filter(x => x.tagName !== "BUTTON").map(x => x.textContent).join(" "));
  j.controle("le jour, le geste, la quantité, la plante et la zone",
    net(haut2) === "1 août Récolte 2,4 kg Tomate Carré du fond", net(haut2));
  const haut1 = net(await entree(pg, "o1").locator(".ec-haut").textContent());
  j.controle("une entrée posée sur l'espace ne répète pas son nom",
    !haut1.includes("Potager"), haut1);
  j.controle("le texte est rendu",
    net(await entree(pg, "o1").locator(".ec-texte").textContent())
      === "Purin d'ortie sur tout le carré.");
  j.controle("une entrée sans texte n'en montre pas",
    await entree(pg, "o2").locator(".ec-texte").count() === 0);

  j.section("les photographies passent par une adresse signée");
  const vign = entree(pg, "o1").locator(".ec-vign img");
  j.controle("la vignette est là", await vign.count() === 1);
  const src = await vign.getAttribute("src");
  j.controle("son adresse a été demandée après le rendu",
    !!src && src.startsWith("data:image/"), String(src).slice(0, 24));
  await entree(pg, "o1").locator(".ec-vign").click();
  await pg.waitForTimeout(200);
  j.controle("l'appui l'agrandit sur place",
    await entree(pg, "o1").locator(".ec-vign.ec-grande").count() === 1);

  j.section("la saisie suit le lieu choisi");
  await journalLieu(pg).locator(".ouvrir-saisie").click();
  await pg.waitForTimeout(300);
  j.controle("le formulaire s'ouvre", await form(pg).count() === 1);
  const lieux = await form(pg).locator(".ec-lieu option")
    .evaluateAll(l => l.map(o => o.textContent));
  j.controle("il propose l'espace et ses zones",
    JSON.stringify(lieux) === JSON.stringify(["Potager", "Carré du fond"]), lieux.join(" "));
  const plantesE1 = await form(pg).locator(".ec-plantes option")
    .evaluateAll(l => l.map(o => o.textContent));
  j.controle("les plantes sont celles du lieu choisi",
    JSON.stringify(plantesE1) === JSON.stringify(["Sans plante", "Fraise"]), plantesE1.join(" "));
  await form(pg).locator(".ec-lieu").selectOption("z1");
  await pg.waitForTimeout(250);
  const plantesZ1 = await form(pg).locator(".ec-plantes option")
    .evaluateAll(l => l.map(o => o.textContent));
  j.controle("changer de lieu change la liste des plantes",
    JSON.stringify(plantesZ1) === JSON.stringify(["Sans plante", "Rhubarbe", "Tomate"]),
    plantesZ1.join(" "));
  j.controle("la quantité ne paraît pas hors récolte",
    await form(pg).locator(".fe-recolte").isHidden());
  await form(pg).locator(".ec-geste").selectOption("recolte");
  await pg.waitForTimeout(200);
  j.controle("elle paraît dès que le geste est une récolte",
    await form(pg).locator(".fe-recolte").isVisible());

  j.section("une entrée vide est refusée");
  await form(pg).locator(".ec-geste").selectOption("");
  await form(pg).locator(".ec-valider").click();
  await pg.waitForTimeout(350);
  j.controle("rien n'est enregistré", await pg.locator(".entree-carnet").count() === 2);
  j.controle("le refus est dit",
    net(await pg.locator("#etat").textContent())
      === "Une entrée demande au moins un geste, un mot ou une photographie.",
    net(await pg.locator("#etat").textContent()));

  j.section("enregistrer une entrée avec sa photographie");
  await form(pg).locator(".ec-plantes").selectOption(TOMATE.id);
  await form(pg).locator(".ec-texte-c").fill("Premier fruit mûr.");
  await form(pg).locator(".ec-fichiers").setInputFiles(
    { name: "essai.png", mimeType: "image/png", buffer: IMAGE });
  await pg.waitForTimeout(250);
  j.controle("le nombre de fichiers choisis est repris au bouton",
    net(await form(pg).locator(".ec-fichiers-t").textContent()) === "1 photographie",
    net(await form(pg).locator(".ec-fichiers-t").textContent()));
  await form(pg).locator(".ec-valider").click();
  await pg.waitForTimeout(1200);
  const neuve = pg.locator(".entree-carnet", { hasText: "Premier fruit mûr." });
  j.controle("l'entrée paraît dans le journal", await neuve.count() === 1);
  j.controle("le formulaire s'est refermé", await form(pg).count() === 0);
  const depots = await pg.evaluate(() => Object.entries(window.__STOCKAGE__ || {})
    .map(([c, v]) => [c, v.type, v.poids]));
  const depot = depots[0] || ["", "", 0];
  j.controle("une seule photographie est déposée", depots.length === 1, JSON.stringify(depots));
  j.controle("son chemin commence par le jardin puis l'entrée",
    /^g1\/[^/]+\/1-[0-9a-z]{8}\.jpg$/.test(depot[0]), depot[0]);
  j.controle("elle est convertie en jpeg avant l'envoi", depot[1] === "image/jpeg", depot[1]);
  j.controle("elle pèse moins que la limite du compartiment",
    depot[2] > 0 && depot[2] < 3000000, String(depot[2]));
  const rattachee = await pg.evaluate(() => (window.__ECRITS__ || [])
    .some(e => e.table === "observation_photos" && e.op === "insert"));
  j.controle("la ligne de rattachement est écrite", rattachee);
  const dim = await neuve.locator(".ec-vign img").count()
    ? await neuve.locator(".ec-vign img").first().evaluate(i =>
        [Number(i.getAttribute("width")), Number(i.getAttribute("height"))])
    : [0, 0];
  j.controle("l'image n'est pas agrandie au-delà de sa taille d'origine",
    dim[0] === 240 && dim[1] === 176, dim.join(" par "));

  j.section("noter depuis la ligne d'une plante");
  await pg.locator(`.ligne-espace[data-plante="${FRAISE.id}"] .noter-lieu`).first().click();
  await pg.waitForTimeout(400);
  j.controle("le formulaire s'ouvre sur le lieu de la plante",
    await form(pg).locator(".ec-lieu").inputValue() === "e1");
  j.controle("la plante y est déjà choisie",
    await form(pg).locator(".ec-plantes").inputValue() === FRAISE.id);
  await form(pg).locator(".ec-annuler").click();
  await pg.waitForTimeout(300);
  j.controle("annuler referme sans rien écrire",
    await form(pg).count() === 0 && await pg.locator(".entree-carnet").count() === 3);

  j.section("supprimer une entrée emporte ses photographies");
  await neuve.locator(".ec-oter").click();
  await pg.waitForTimeout(600);
  j.controle("l'entrée a disparu", await pg.locator(".entree-carnet").count() === 2);
  j.controle("le compartiment est vidé de son image",
    await pg.evaluate(() => Object.keys(window.__STOCKAGE__ || {}).length) === 0);

  j.section("une photographie d'appareil est réduite avant l'envoi");
  await journalLieu(pg).locator(".ouvrir-saisie").click();
  await pg.waitForTimeout(300);
  await form(pg).locator(".ec-texte-c").fill("Vue d'ensemble.");
  /* L'image est fabriquée dans la page plutôt que portée par l'essai : deux
     mille quatre cents pixels de large pèsent trop pour un fichier source. */
  await pg.evaluate(() => new Promise(fini => {
    const c = document.createElement("canvas");
    c.width = 2400; c.height = 1800;
    const d = c.getContext("2d");
    d.fillStyle = "#C85A3C";
    d.fillRect(0, 0, c.width, c.height);
    c.toBlob(b => {
      const t = new DataTransfer();
      t.items.add(new File([b], "appareil.png", { type: "image/png" }));
      const e = document.querySelector("#formEntree .ec-fichiers");
      e.files = t.files;
      e.dispatchEvent(new Event("change", { bubbles: true }));
      fini(true);
    }, "image/png");
  }));
  await pg.waitForTimeout(250);
  await form(pg).locator(".ec-valider").click();
  await pg.waitForTimeout(1600);
  const grande = pg.locator(".entree-carnet", { hasText: "Vue d'ensemble." });
  j.controle("l'entrée est enregistrée", await grande.count() === 1);
  const taille = await grande.locator(".ec-vign img").first().evaluate(i =>
    [Number(i.getAttribute("width")), Number(i.getAttribute("height"))]);
  j.controle("le grand côté est ramené à mille six cents pixels",
    taille[0] === 1600 && taille[1] === 1200, taille.join(" par "));
  const poids = await pg.evaluate(() =>
    Object.values(window.__STOCKAGE__ || {}).map(v => v.poids)[0] || 0);
  j.controle("le fichier envoyé pèse moins de trois cents kilo-octets",
    poids > 0 && poids < 300000, poids + " octets");

  await ctx.close();
  return j.fin(erreurs);
}
