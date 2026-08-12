/* Journal du jardin. Une entrée datée porte sur un lieu, sur une plante, ou sur
   les deux. Les contrôles portent sur ce que la lecture seule ne montre pas :
   la réunion des entrées d'un espace et de ses zones, la saisie qui suit le
   lieu choisi, la règle qui refuse une entrée vide, et le passage des
   photographies par le compartiment privé, où rien ne s'atteint sans adresse
   signée. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, entrerEnEdition,
         fermerFiche, ongletIdentite, net, CATALOGUE } from "./commun.mjs";

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

/* La fiche s'ouvre depuis la liste des plantes et non depuis le calendrier :
   celui-ci ne montre par défaut que le jardin, et l'essai a besoin d'une fiche
   de catalogue. */
async function ouvrirDepuisLaListe(pg, nom) {
  await pg.locator(`.item-bloc:has(.nom-l:text-is("${nom}")) .item`).first()
    .dispatchEvent("click");
  await pg.waitForTimeout(800);
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
  await entrerEnEdition(pg);
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

  j.section("le quatrième onglet de la fiche");
  await ouvrirListeDesPlantes(pg);
  await ouvrirDepuisLaListe(pg, "Tomate");
  const onglets = await pg.locator("#feuille-corps .f-onglets button")
    .evaluateAll(l => l.map(b => b.dataset.pan));
  j.controle("une plante du jardin en porte quatre",
    JSON.stringify(onglets) === JSON.stringify(["moment", "annee", "identite", "jardin"]),
    onglets.join(" "));
  await ongletIdentite(pg);
  const blocs = await pg.locator("#feuille-corps .f-pan-identite .f-bloc h3")
    .evaluateAll(l => l.map(h => h.textContent));
  j.controle("le bloc botanique s'appelle désormais Intérêt",
    blocs.includes("Intérêt") && !blocs.includes("Au jardin"), blocs.join(" | "));
  await fermerFiche(pg);
  await ouvrirDepuisLaListe(pg, "Figuier");
  j.controle("une plante hors jardin n'en porte que trois",
    await pg.locator("#feuille-corps .f-onglets button").count() === 3);
  await fermerFiche(pg);

  j.section("ce que l'onglet montre de la plante");
  await ouvrirDepuisLaListe(pg, "Tomate");
  await pg.locator('#feuille-corps .f-onglets button[data-pan="jardin"]').dispatchEvent("click");
  await pg.waitForTimeout(350);
  /* La zone se nomme par la liste qui permet d'en changer, quand l'espace en
     porte, et par un simple libellé sinon. */
  const lieu = await pg.locator("#feuille-corps .fj-lieu").first().evaluate(e => {
    const z = e.querySelector(".sel-zone");
    return [e.querySelector(".fj-nom").textContent,
      z ? z.options[z.selectedIndex].textContent
        : ((e.querySelector(".fj-zone") || {}).textContent || ""),
      e.querySelector(".qte").value].join(" ");
  });
  j.controle("le placement nomme l'espace, la zone et la quantité",
    net(lieu) === "Potager Carré du fond 6", net(lieu));
  const entrees = await pg.locator("#feuille-corps .f-journal-plante .entree-carnet")
    .evaluateAll(l => l.map(e => e.dataset.entree));
  j.controle("le journal ne garde que les entrées de cette plante",
    JSON.stringify(entrees) === JSON.stringify(["o2"]), entrees.join(" "));
  const dits = await pg.locator("#feuille-corps .entree-carnet .ec-lieu")
    .evaluateAll(l => l.map(e => e.textContent));
  j.controle("elles nomment l'espace et la zone, non la plante",
    JSON.stringify(dits) === JSON.stringify(["Potager", "Carré du fond"])
    && await pg.locator("#feuille-corps .entree-carnet .ec-plante").count() === 0,
    dits.join(" | "));

  j.section("la saisie en miroir");
  await pg.locator("#feuille-corps .f-journal-plante .ouvrir-saisie").click();
  await pg.waitForTimeout(300);
  j.controle("la plante n'est plus à choisir, elle est connue",
    await pg.locator("#feuille-corps #formEntree .ec-plantes").count() === 0);
  const ou = await pg.locator("#feuille-corps #formEntree .ec-lieu option")
    .evaluateAll(l => l.map(o => o.textContent));
  j.controle("le lieu se choisit parmi ceux qu'elle occupe",
    JSON.stringify(ou) === JSON.stringify(["Potager, Carré du fond"]), ou.join(" | "));
  await pg.locator("#feuille-corps #formEntree .ec-geste").selectOption("taille");
  await pg.locator("#feuille-corps #formEntree .ec-texte-c").fill("Gourmands ôtés.");
  await pg.locator("#feuille-corps #formEntree .ec-valider").click();
  await pg.waitForTimeout(800);
  j.controle("l'entrée rejoint le journal de la plante",
    await pg.locator("#feuille-corps .f-journal-plante .entree-carnet").count() === 2);
  const ecrite = await pg.evaluate(() => (window.__ECRITS__ || [])
    .filter(e => e.table === "observations" && e.op === "insert").pop());
  j.controle("elle porte la plante et son lieu",
    !!ecrite && ecrite.v.plant_id && ecrite.v.espace_id === "z1" && ecrite.v.geste === "taille",
    JSON.stringify(ecrite && ecrite.v));

  j.section("déplacer et retirer depuis la fiche");
  /* Le déplacement entre zones se fait sur la ligne du lieu occupé, Sans zone
     comprise : l'ajout n'offre plus l'espace dont une zone est déjà prise, le
     poser là aurait retiré la zone sans le dire. */
  await pg.locator("#feuille-corps .fj-lieu .sel-zone").selectOption("e1");
  await pg.waitForTimeout(800);
  j.controle("Sans zone ramène la plante à l'espace, et à ce seul lieu",
    await pg.locator("#feuille-corps .fj-lieu").count() === 1
    && await pg.locator('#feuille-corps .fj-lieu[data-lieu="e1"]').count() === 1,
    String(await pg.locator("#feuille-corps .fj-lieu").count()));
  await pg.locator("#feuille-corps .fj-lieu .fj-oter").click();
  await pg.waitForTimeout(700);
  j.controle("le retrait laisse la plante au jardin, sans lieu",
    await pg.locator("#feuille-corps .fj-lieu").count() === 0
    && net(await pg.locator("#feuille-corps .f-lieux .f-vide").textContent())
       === "Pas encore placée dans un espace.");
  const aPlacer = await pg.locator("#feuille-corps .fj-ou option")
    .evaluateAll(l => l.map(o => o.textContent));
  j.controle("sans lieu, l'ajout offre de nouveau le jardin entier",
    JSON.stringify(aPlacer) === JSON.stringify(["Potager", "Potager, Carré du fond"]),
    aPlacer.join(" | "));
  await fermerFiche(pg);

  /* Noter est un geste et non une destination : il tient le rond central de la
     barre, sur tous les écrans, et ce qu'il porte vient de ce qui est à
     l'écran. Il flottait au coin bas droit, où il recouvrait la dernière rangée
     de toutes les listes. */
  j.section("noter depuis n'importe quel écran");
  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  j.controle("l'acte est là sur l'écran du moment",
    await pg.locator("#btnNoter:not([hidden])").count() === 1);
  const place = await pg.evaluate(() => {
    const b = document.getElementById("btnNoter");
    const n = document.querySelector(".barre-basse");
    if (!b || !n) return null;
    const rb = b.getBoundingClientRect(), rn = n.getBoundingClientRect();
    return { dansLaBarre: b.parentNode === n, centre: Math.round(rb.left + rb.width / 2
               - (rn.left + rn.width / 2)), dansLaVue: rb.bottom <= window.innerHeight };
  });
  j.controle("il tient le centre de la barre, dans la vue",
    place && place.dansLaBarre && Math.abs(place.centre) <= 2 && place.dansLaVue,
    JSON.stringify(place));
  await pg.locator("#btnNoter").dispatchEvent("click");
  await pg.waitForTimeout(500);
  j.controle("il ouvre la saisie",
    net(await pg.locator("#feuille-titre").textContent()) === "Noter"
    && await pg.locator("#corpsNote .form-entree").count() === 1);
  const offerts = await pg.locator("#corpsNote .ec-lieu option")
    .evaluateAll(l => l.map(o => o.textContent));
  j.controle("hors d'un espace, tous les lieux du jardin sont offerts",
    JSON.stringify(offerts) === JSON.stringify(["Potager", "Potager, Carré du fond"]),
    offerts.join(" | "));
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);

  j.section("la saisie vient de ce qui est à l'écran");
  await ouvrirEspace(pg);
  await pg.locator("#btnNoter").dispatchEvent("click");
  await pg.waitForTimeout(500);
  j.controle("depuis un espace, le lieu est déjà celui de l'écran",
    await pg.locator("#corpsNote .ec-lieu").inputValue() === "e1",
    await pg.locator("#corpsNote .ec-lieu").inputValue());
  j.controle("la plante reste à choisir",
    await pg.locator("#corpsNote .ec-plantes").count() === 1);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  await ouvrirDepuisLaListe(pg, "Fraise");
  await pg.locator("#btnNoter").dispatchEvent("click");
  await pg.waitForTimeout(500);
  j.controle("depuis une fiche, la plante est imposée et nommée",
    net(await pg.locator("#corpsNote .note-sujet").textContent()) === "Fraise"
    && await pg.locator("#corpsNote .ec-plantes").count() === 0);
  j.controle("le lieu se choisit parmi ceux qu'elle occupe",
    await pg.locator("#corpsNote .ec-lieu option").count() === 1,
    String(await pg.locator("#corpsNote .ec-lieu option").count()));
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  /* La tomate a été retirée de son lieu plus haut : une plante placée nulle
     part ne doit pas rendre la saisie impossible. */
  await ouvrirDepuisLaListe(pg, "Tomate");
  await pg.locator("#btnNoter").dispatchEvent("click");
  await pg.waitForTimeout(500);
  j.controle("une plante sans lieu reçoit le jardin entier",
    await pg.locator("#corpsNote .ec-lieu option").count() === 2,
    String(await pg.locator("#corpsNote .ec-lieu option").count()));

  /* Le carnet du jardin entier n'avait aucune adresse : il se rattrapait depuis
     la feuille des réglages, le pied d'un espace, l'onglet d'une fiche et le
     formulaire de saisie. Il est devenu le troisième onglet du jardin, et les
     renvois y mènent au lieu d'ouvrir une feuille. */
  j.section("le carnet du jardin, dans l'ordre du temps");
  await pg.locator("#corpsNote .note-vers-journal").click();
  await pg.waitForTimeout(700);
  j.controle("le renvoi ferme la feuille et ouvre l'onglet",
    await pg.locator("#feuille[hidden]").count() === 1
    && await pg.locator('.onglet-j[data-panneau="carnet"][aria-selected="true"]').count() === 1
    && await pg.locator("#pan-carnet:not([hidden])").count() === 1);
  j.controle("la fente du jardin est celle qui est enfoncée",
    await pg.locator('.onglet[data-ecran="selection"][aria-selected="true"]').count() === 1);
  const combien = await pg.locator("#corpsJournal .entree-carnet").count();
  j.controle("il porte toutes les entrées du jardin", combien >= 2, String(combien));
  const dates = await pg.locator("#corpsJournal .ec-jour")
    .evaluateAll(l => l.map(e => e.textContent.trim()));
  j.controle("la plus récente vient en tête",
    dates.length > 1 && dates[0] !== dates[dates.length - 1], dates.join(" | "));
  const parMois = await pg.locator("#corpsJournal .jo-mois")
    .evaluateAll(l => l.map(e => e.textContent.trim()));
  j.controle("les entrées se rangent par mois", parMois.length >= 1, parMois.join(" | "));
  j.controle("chaque entrée dit sa plante et son lieu",
    await pg.locator("#corpsJournal .ec-lieu").count() >= 1);
  /* Le second renvoi, dans la feuille des réglages du jardin, mène au même
     onglet. */
  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  await pg.locator("#btnJardin").click();
  await pg.waitForTimeout(600);
  await pg.locator("#voirJournal").click();
  await pg.waitForTimeout(700);
  j.controle("le renvoi des réglages mène au même onglet",
    await pg.locator("#feuille[hidden]").count() === 1
    && await pg.locator("#pan-carnet:not([hidden])").count() === 1);

  await ctx.close();
  return j.fin(erreurs);
}
