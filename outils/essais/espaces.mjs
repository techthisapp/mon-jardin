/* Zones à l'intérieur des espaces. La table n'en connaît que deux niveaux : un
   espace, et des zones dedans. Les contrôles portent sur ce que ce second
   niveau change ailleurs, là où l'application comptait jusqu'ici
   l'appartenance directe : le compte des tuiles, les filtres, la pastille de
   la rangée. Ils portent aussi sur la règle de placement, une plante ne
   pouvant occuper à la fois un espace et l'une de ses zones. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirMenuEspace,
         entrerEnEdition, net, CATALOGUE, PHOTOS } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const par = n => PLANTES.find(p => p.name === n);
const RHUBARBE = par("Rhubarbe"), FRAISE = par("Fraise"), RADIS = par("Radis");
const FIGUIER = par("Figuier");
/* La courgette n'a pas de planche d'herbier : c'est elle qui éprouve le
   troisième étage de la règle d'image, la photographie du fonds. */
const COURGETTE = par("Courgette"), HORTENSIA = par("Hortensia");

const AU_JARDIN = [RHUBARBE.id, FRAISE.id, RADIS.id, COURGETTE.id, HORTENSIA.id];
/* Un espace mesuré et exposé, deux zones dedans dont une seule renseigne son
   exposition : c'est le cas qui éprouve l'héritage. Le verger reste sans zone
   pour que le rendu d'origine reste contrôlé lui aussi. */
const ESPACES = [
  { id: "e1", name: "Potager", color: "#7BA05B", surface_m2: 40, exposition: "soleil" },
  { id: "e2", name: "Verger" },
  { id: "z1", name: "Carré du fond", parent_id: "e1", surface_m2: 10 },
  { id: "z2", name: "Serre", parent_id: "e1", support: "serre", exposition: "mi_ombre" },
];
const PLACEMENTS = [
  { plant_id: RHUBARBE.id, espace_id: "z1", quantity: 2 },
  { plant_id: FRAISE.id, espace_id: "e1" },
  { plant_id: COURGETTE.id, espace_id: "e1", quantity: 3 },
  { plant_id: HORTENSIA.id, espace_id: "e1" },
  { plant_id: RADIS.id, espace_id: "e2" },
];

/* La courgette n'a pas de planche : lui donner une photographie de fonds est
   le seul moyen d'éprouver le troisième étage de la règle d'image. */
const PHOTOS_LOT = JSON.stringify(JSON.parse(PHOTOS).concat([
  { id: "img-cg", plant_id: COURGETTE.id, organe: "fruit", rang: 1, score: 0,
    url: "https://bs.plantnet.org/image/s/courgette", auteur: "", licence: "CC BY-SA",
    fonds: "plantnet", source: "", retenue: true, retrait_motif: null },
]));

const zone = (pg, id) => pg.locator(`#detailEspace details.zone-espace[data-zone="${id}"]`);
const sommaireZone = (pg, id) =>
  pg.locator(`#detailEspace details.zone-espace[data-zone="${id}"] > summary`);
const reglagesEspace = pg => pg.locator("#detailEspace .menu-lieu .reglages-lieu");
const reglagesZone = (pg, id) =>
  pg.locator(`#detailEspace details.zone-espace[data-zone="${id}"] .reglages-lieu`);
const sansZone = (pg, p) => pg.locator(`#detailEspace > .corps-espace .ligne-espace[data-plante="${p}"]`);
const dansZone = (pg, z, p) => pg.locator(`#detailEspace details[data-zone="${z}"] .ligne-espace[data-plante="${p}"]`);
const partout = (pg, p) => pg.locator(`#detailEspace .ligne-espace[data-plante="${p}"]`);
// Le nombre de plantes ouvre la ligne de mesure, sous le nom, dans la bannière.
const compteDuTitre = pg => pg.evaluate(() =>
  document.querySelector("#detailEspace .bl-mesure").textContent.trim().split(" ")[0]);

async function auxEspaces(pg) {
  await pg.locator('.onglet[data-ecran="selection"]').dispatchEvent("click");
  await pg.locator('.onglet-j[data-panneau="jardin"]').dispatchEvent("click");
  await pg.waitForTimeout(500);
  if (await pg.locator("#retourEspace").count()) {
    await pg.locator("#retourEspace").dispatchEvent("click");
    await pg.waitForTimeout(300);
  }
}

async function ouvrirEspace(pg, id) {
  await pg.locator(`.tuile-espace[data-espace="${id}"]`).dispatchEvent("click");
  await pg.waitForTimeout(350);
}

async function deplier(pg, id) {
  if (!await zone(pg, id).evaluate(d => d.open)) {
    await sommaireZone(pg, id).click();
    await pg.waitForTimeout(250);
  }
}

/* Les réglages d'un lieu et les gestes d'une plante se déplient à la demande :
   l'essai fait le même geste que le doigt. */
async function ouvrirReglages(pg, r) {
  if (!await r.evaluate(d => d.open)) {
    await r.locator("> summary").click();
    await pg.waitForTimeout(250);
  }
}

async function ouvrirLigne(pg) { await entrerEnEdition(pg); }

export default async function essai(navigateur) {
  const j = journal("Espaces et zones");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { jardin: AU_JARDIN, espaces: ESPACES, placements: PLACEMENTS, photos: PHOTOS_LOT });
  pg.on("dialog", d => d.accept());

  await auxEspaces(pg);

  j.section("le premier niveau ne montre que les espaces");
  const cles = await pg.locator(".tuile-espace").evaluateAll(l => l.map(b => b.dataset.espace));
  j.controle("une tuile par espace, plus les plantes non placées",
    JSON.stringify(cles) === JSON.stringify(["e1", "e2", "0"]), cles.join(" "));
  const nbE1 = net(await pg.locator('.tuile-espace[data-espace="e1"] .tuile-nb').textContent());
  j.controle("le compte d'un espace descend dans ses zones", nbE1 === "4", nbE1);
  const uniteE1 = net(await pg.locator('.tuile-espace[data-espace="e1"] .tuile-unite').textContent());
  j.controle("la tuile annonce ses zones", uniteE1 === "plantes, 2 zones", uniteE1);
  const uniteE2 = net(await pg.locator('.tuile-espace[data-espace="e2"] .tuile-unite').textContent());
  j.controle("un espace sans zone n'en annonce aucune", uniteE2 === "plante", uniteE2);

  j.section("le détail de l'espace déplie ses zones");
  await ouvrirEspace(pg, "e1");
  const enTete = await pg.locator("#detailEspace .tete-section-zone")
    .evaluate(e => [e.querySelector("b").textContent, e.querySelector(".nb").textContent].join(" "));
  j.controle("les plantes posées sur l'espace même sont annoncées sans zone",
    net(enTete) === "Sans zone 3", net(enTete));
  j.controle("chaque zone forme une section",
    await pg.locator("#detailEspace details.zone-espace").count() === 2);
  j.controle("elles sont repliées à l'ouverture",
    await pg.locator("#detailEspace details.zone-espace[open]").count() === 0);
  const sommaire = await sommaireZone(pg, "z1")
    .evaluate(e => [e.querySelector(".zone-nom").textContent, e.querySelector(".nb").textContent].join(" "));
  j.controle("la zone porte son nom et son compte",
    net(sommaire) === "Carré du fond 1", net(sommaire));
  j.controle("la plante de la zone n'est pas lisible tant qu'elle est repliée",
    !await dansZone(pg, "z1", RHUBARBE.id).isVisible());
  j.controle("celle qui est posée sur l'espace se lit au premier coup d'oeil",
    await sansZone(pg, FRAISE.id).isVisible());
  await deplier(pg, "z1");
  j.controle("la zone se déplie à l'appui",
    await dansZone(pg, "z1", RHUBARBE.id).isVisible());

  j.section("les attributs du lieu");
  j.controle("l'écran n'ouvre sur aucun réglage",
    await pg.locator("#detailEspace .menu-lieu").count() === 0);
  await ouvrirMenuEspace(pg);
  const resume = net(await reglagesEspace(pg).locator("> summary").textContent());
  j.controle("le bouton de coin les tient, résumés par leur mesure",
    resume === "40 m², 163 L par jour, 10 m² en zones", resume);
  await ouvrirReglages(pg, reglagesEspace(pg));
  const commandes = pg.locator("#detailEspace .menu-lieu .attributs-lieu");
  j.controle("l'espace porte sa surface et ses trois listes",
    await commandes.locator(".att-surface").count() === 1
    && await commandes.locator("select.att").count() === 3);
  const surface = await commandes.locator(".att-surface").inputValue();
  j.controle("la surface lue est celle de la base", Number(surface) === 40, surface);
  const heriteZ1 = net(await zone(pg, "z1")
    .locator('select.att[data-att="exposition"] option[value=""]').textContent());
  j.controle("une zone sans exposition annonce celle de son espace",
    heriteZ1 === "comme l'espace, soleil", heriteZ1);
  const heriteZ2 = net(await zone(pg, "z2")
    .locator('select.att[data-att="exposition"] option[value=""]').textContent());
  j.controle("l'annonce vaut aussi pour une zone repliée",
    heriteZ2 === "comme l'espace, soleil", heriteZ2);
  const solE1 = net(await commandes
    .locator('select.att[data-att="sol_texture"] option[value=""]').textContent());
  j.controle("un espace sans texture de sol ne prétend rien", solE1 === "non précisé", solE1);
  await deplier(pg, "z2");
  await ouvrirReglages(pg, reglagesZone(pg, "z2"));
  const choixZ2 = await zone(pg, "z2").locator('select.att[data-att="exposition"]').inputValue();
  j.controle("la zone qui porte la sienne l'affiche", choixZ2 === "mi_ombre", choixZ2);
  const supportZ2 = await zone(pg, "z2").locator('select.att[data-att="support"]').inputValue();
  j.controle("son support aussi", supportZ2 === "serre", supportZ2);

  j.section("la surface donne les litres du jour");
  const mesureZ1 = net(await sommaireZone(pg, "z1").locator(".zone-mesure").textContent());
  j.controle("la zone convertit le besoin du catalogue en litres à porter",
    mesureZ1 === "10 m², 44 L par jour", mesureZ1);
  j.controle("l'espace compte les litres de toutes ses plantes",
    resume.startsWith("40 m², 163 L par jour"), resume);
  j.controle("il annonce la part de surface déjà prise par ses zones",
    resume.includes("10 m² en zones"), resume);

  await zone(pg, "z2").locator(".att-surface").fill("12");
  await zone(pg, "z2").locator(".att-surface").dispatchEvent("change");
  await pg.waitForTimeout(400);
  const ecrit = await pg.evaluate(() => (window.__ECRITS__ || [])
    .filter(e => e.table === "espaces" && e.op === "update").pop());
  j.controle("changer la surface d'une zone l'enregistre",
    !!ecrit && Number(ecrit.v.surface_m2) === 12, JSON.stringify(ecrit && ecrit.v));
  await ouvrirMenuEspace(pg);
  const resumeB = net(await reglagesEspace(pg).locator("> summary").textContent());
  j.controle("la somme des zones suit", resumeB.includes("22 m² en zones"), resumeB);
  const mesureZ2 = net(await sommaireZone(pg, "z2").locator(".zone-mesure").textContent());
  j.controle("une zone sans plante n'affiche aucun litre", mesureZ2 === "12 m²", mesureZ2);

  j.section("une plante n'occupe pas à la fois l'espace et sa zone");
  await ouvrirLigne(pg);
  await sansZone(pg, FRAISE.id).locator(".sel-zone").selectOption("z1");
  await pg.waitForTimeout(500);
  j.controle("la fraise a quitté les plantes sans zone",
    await sansZone(pg, FRAISE.id).count() === 0);
  j.controle("elle paraît dans le carré du fond",
    await dansZone(pg, "z1", FRAISE.id).count() === 1);
  j.controle("elle n'est plus placée qu'à un seul endroit",
    await partout(pg, FRAISE.id).count() === 1);
  j.controle("le compte de l'espace ne bouge pas, la plante y est toujours",
    await compteDuTitre(pg) === "4", await compteDuTitre(pg));
  await ouvrirLigne(pg);
  await dansZone(pg, "z1", FRAISE.id).locator(".sel-zone").selectOption("e1");
  await pg.waitForTimeout(500);
  j.controle("le retour hors zone la ramène sous Sans zone",
    await sansZone(pg, FRAISE.id).count() === 1);
  j.controle("et ne la laisse pas dans la zone",
    await dansZone(pg, "z1", FRAISE.id).count() === 0);

  j.section("ajouter une plante depuis la zone");
  await zone(pg, "z1").locator(".rech-lieu").fill("figu");
  await pg.waitForTimeout(350);
  const props = zone(pg, "z1").locator(".prop-lieu");
  j.controle("le catalogue répond dès deux lettres", await props.count() === 1);
  j.controle("une plante hors jardin est annoncée comme telle",
    net(await props.first().locator(".prop-neuf").textContent()) === "entre au jardin");
  await props.first().click();
  await pg.waitForTimeout(700);
  j.controle("elle est placée dans la zone",
    await dansZone(pg, "z1", FIGUIER.id).count() === 1);
  j.controle("et entrée au jardin du même geste",
    await pg.evaluate(() => (window.__ECRITS__ || [])
      .some(e => e.table === "garden_plants" && e.op === "insert")));
  j.controle("le compte de l'espace la prend", await compteDuTitre(pg) === "5",
    await compteDuTitre(pg));
  await zone(pg, "z1").locator(".rech-lieu").fill("figu");
  await pg.waitForTimeout(350);
  j.controle("elle n'est plus proposée une fois placée",
    await zone(pg, "z1").locator(".prop-lieu").count() === 0);
  await zone(pg, "z1").locator(".rech-lieu").fill("");

  j.section("l'exposition du lieu confrontée à ce que la plante demande");
  j.controle("une zone sans exposition prend celle de l'espace, le figuier y est au soleil",
    await dansZone(pg, "z1", FIGUIER.id).locator(".mal-expose").count() === 0);
  await ouvrirLigne(pg);
  await dansZone(pg, "z1", FIGUIER.id).locator(".sel-zone").selectOption("z2");
  await pg.waitForTimeout(500);
  const marque = dansZone(pg, "z2", FIGUIER.id).locator(".mal-expose");
  j.controle("sous la serre en mi-ombre, l'écart est signalé", await marque.count() === 1);
  j.controle("la marque dit ce que le lieu offre et ce que la plante demande",
    net(await marque.textContent()) === "mi-ombre ici, Figuier demande soleil",
    net(await marque.textContent()));
  j.controle("la rhubarbe, qui accepte la mi-ombre, n'est pas signalée au soleil",
    await dansZone(pg, "z1", RHUBARBE.id).locator(".mal-expose").count() === 0);
  await ouvrirLigne(pg);
  await dansZone(pg, "z2", FIGUIER.id).locator(".sel-zone").selectOption("z1");
  await pg.waitForTimeout(500);

  j.section("la pastille de la rangée porte l'espace, jamais la zone");
  await ouvrirListeDesPlantes(pg);
  const rangee = pg.locator(".item-bloc", { hasText: "Rhubarbe" }).first();
  await rangee.locator(".lieu-item").dispatchEvent("click");
  await pg.waitForTimeout(350);
  const pastilles = await rangee.locator(".mini-chip:not(.chip-replier)")
    .evaluateAll(l => l.map(b => b.textContent + ":" + b.getAttribute("aria-pressed")));
  j.controle("les zones n'y paraissent pas",
    JSON.stringify(pastilles) === JSON.stringify(["Potager:true", "Verger:false"]),
    pastilles.join(" "));
  await rangee.locator(".mini-chip").first().dispatchEvent("click");
  await pg.waitForTimeout(600);
  await auxEspaces(pg);
  const nbApres = net(await pg.locator('.tuile-espace[data-espace="e1"] .tuile-nb').textContent());
  j.controle("décocher l'espace retire aussi le placement fait dans sa zone",
    nbApres === "4", nbApres);
  const nonPlacees = net(await pg.locator('.tuile-espace[data-espace="0"] .tuile-nb').textContent());
  j.controle("la plante reste au jardin, sans lieu", nonPlacees === "1", nonPlacees);

  j.section("supprimer une zone rend ses plantes à l'espace");
  await ouvrirEspace(pg, "e1");
  await deplier(pg, "z1");
  await zone(pg, "z1").locator('.pied-zone [data-act="supprimer"]').click();
  await pg.waitForTimeout(700);
  j.controle("la zone a disparu", await zone(pg, "z1").count() === 0);
  j.controle("le figuier est revenu sous Sans zone",
    await sansZone(pg, FIGUIER.id).count() === 1);
  j.controle("l'espace garde le même compte", await compteDuTitre(pg) === "4",
    await compteDuTitre(pg));

  j.section("les filtres ne proposent que les espaces");
  const chips = await pg.locator("#chipsEspaceM .chip")
    .evaluateAll(l => l.map(b => b.textContent.replace(/\s+/g, " ").trim()));
  j.controle("aucune zone dans le filtre de l'écran du moment",
    chips.length === 4 && chips.some(c => c.startsWith("Potager"))
    && !chips.some(c => c.startsWith("Serre")), chips.join(" | "));

  j.section("la bannière, le moment et la bascule d'affichage");
  await auxEspaces(pg);
  await ouvrirEspace(pg, "e1");
  j.controle("la bannière porte le nom du lieu",
    net(await pg.locator("#detailEspace .banniere-lieu .titre-detail").textContent()) === "Potager");
  const mes = net(await pg.locator("#detailEspace .bl-mesure").textContent());
  j.controle("et sa mesure, du nombre aux litres",
    /^4 plantes, 40 m², \d+ L par jour$/.test(mes), mes);
  j.controle("elle prend une planche d'herbier, jamais une photographie du fonds",
    await pg.locator("#detailEspace .banniere-lieu .bl-planche[data-pl]").count() === 1
    && await pg.locator("#detailEspace .banniere-lieu img").count() === 0);
  const taches = await pg.locator("#detailEspace .ml-c").evaluateAll(
    l => l.map(e => e.textContent.replace(/\s+/g, " ").trim()));
  j.controle("le moment du lieu tient en trois pastilles d'un mot",
    taches.length > 0 && taches.length <= 3
    && taches.every(t => t.split(" ").length === 2), taches.join(" | "));

  j.section("ma photographie, la planche, la photographie du fonds");
  j.controle("la fraise, qui a une planche, la montre",
    await sansZone(pg, FRAISE.id).locator(".im-masque[data-pl]").count() === 1);
  j.controle("la courgette, qui n'en a pas, montre une photographie du fonds",
    await sansZone(pg, COURGETTE.id).locator("img.im-fonds").count() === 1);
  j.controle("l'hortensia, sans planche ni photographie, garde sa boîte",
    await sansZone(pg, HORTENSIA.id).locator(".im-vide").count() === 1);

  j.section("les plantes se groupent par typologie");
  const groupes = await pg.locator("#detailEspace > .corps-espace .groupe-typo")
    .evaluateAll(l => l.map(e => e.querySelector("h3").textContent));
  j.controle("un groupe par typologie présente, dans l'ordre de l'application",
    JSON.stringify(groupes) === JSON.stringify(["Légumes", "Fruits", "Ornement"]),
    groupes.join(" | "));

  j.section("liste ou mosaïque, au choix");
  j.controle("la liste est la vue d'ouverture",
    await pg.locator('#detailEspace .ml-b[data-vue="liste"][aria-pressed="true"]').count() === 1
    && await pg.locator("#detailEspace .rangs-lieu").count() > 0);
  await pg.locator('#detailEspace .ml-b[data-vue="mosaique"]').click();
  await pg.waitForTimeout(400);
  j.controle("la mosaïque pose une tuile par plante",
    await pg.locator("#detailEspace .mosaique-lieu").count() > 0
    && await pg.locator(`#detailEspace .tuile-plante[data-plante="${FRAISE.id}"]`).count() === 1
    && await pg.locator("#detailEspace .rangs-lieu").count() === 0);
  j.controle("le choix est retenu d'un écran à l'autre",
    await pg.evaluate(() => localStorage.getItem("monjardin.vue-espace")) === "mosaique");
  await pg.locator('#detailEspace .ml-b[data-vue="liste"]').click();
  await pg.waitForTimeout(400);
  j.controle("le retour à la liste se fait du même geste",
    await pg.locator("#detailEspace .rangs-lieu").count() > 0);

  await ctx.close();
  return j.fin(erreurs);
}
