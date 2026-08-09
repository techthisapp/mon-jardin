/* Rotation des cultures. La trace de ce qui a poussé où est tenue sans saisie,
   par un déclencheur au placement, et n'accueille que les plantes conduites en
   annuelle ou en bisannuelle. Les contrôles portent sur le panneau qui en rend
   compte, sur l'avertissement au moment de poser une plante, et sur les deux
   échappatoires : la saisie des années antérieures et la sourdine. */
import { ouvrirContexte, journal, net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const par = n => PLANTES.find(p => p.name === n);
const TOMATE = par("Tomate"), RADIS = par("Radis"), RHUBARBE = par("Rhubarbe");

const AU_JARDIN = [TOMATE.id, RADIS.id, RHUBARBE.id];
const ESPACES = [
  { id: "e1", name: "Potager" },
  { id: "z1", name: "Carré du fond", parent_id: "e1" },
  { id: "z2", name: "Planche neuve", parent_id: "e1" },
];
/* Trois familles sur la même planche : l'une encore sous délai, l'une revenue
   libre, l'une sans règle de retour établie. L'année 2024 est saisie à la main,
   les autres viennent du déclencheur. */
const CULTURES = [
  { id: "c1", garden_id: "g1", espace_id: "z1", plant_id: null,
    famille: "Solanaceae", annee: 2024, saisi: true },
  { id: "c2", garden_id: "g1", espace_id: "z1", plant_id: TOMATE.id,
    famille: "Solanaceae", annee: 2026, saisi: false },
  { id: "c3", garden_id: "g1", espace_id: "z1", plant_id: null,
    famille: "Cucurbitaceae", annee: 2022, saisi: true },
  { id: "c4", garden_id: "g1", espace_id: "z1", plant_id: null,
    famille: "Lamiaceae", annee: 2026, saisi: false },
];

const zone = (pg, id) => pg.locator(`#detailEspace details.zone-espace[data-zone="${id}"]`);
const rotation = (pg, id) => zone(pg, id).locator(".rotation-lieu");
const ligne = (pg, id, f) => rotation(pg, id).locator(`.ro-l[data-famille="${f}"]`);
/* La croix de retrait fait partie de la pastille : la lire avec l'année
   mêlerait le geste au fait. */
const lireLigne = (pg, id, f) => ligne(pg, id, f).evaluate(e => [
  e.querySelector(".ro-f").textContent,
  [...e.querySelectorAll(".ro-a")].map(a => a.firstChild.textContent.trim()).join(" "),
  e.querySelector(".ro-etat").textContent,
].join(" "));

async function ouvrirEspace(pg) {
  await pg.locator('.onglet[data-ecran="selection"]').dispatchEvent("click");
  await pg.waitForTimeout(500);
  await pg.locator('.tuile-espace[data-espace="e1"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
}

async function deplier(pg, id) {
  if (!await zone(pg, id).evaluate(d => d.open)) {
    await zone(pg, id).locator("summary").click();
    await pg.waitForTimeout(250);
  }
}

async function poser(pg, id, nom) {
  await zone(pg, id).locator(".rech-lieu").fill(nom.slice(0, 5).toLowerCase());
  await pg.waitForTimeout(350);
  await zone(pg, id).locator(".prop-lieu").first().click();
  await pg.waitForTimeout(700);
}

export default async function essai(navigateur) {
  const j = journal("Rotation des cultures");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { jardin: AU_JARDIN, espaces: ESPACES, cultures: CULTURES });
  let vus = [];
  let reponse = "accepter";
  pg.on("dialog", d => {
    vus.push(d.message());
    if (reponse === "refuser") d.dismiss(); else d.accept();
  });

  await ouvrirEspace(pg);
  await deplier(pg, "z1");

  j.section("le panneau ne paraît que là où quelque chose a poussé");
  j.controle("la planche cultivée le porte", await rotation(pg, "z1").count() === 1);
  await deplier(pg, "z2");
  j.controle("la planche neuve n'en a pas", await rotation(pg, "z2").count() === 0);
  j.controle("l'espace lui-même non plus, rien n'y est placé",
    await pg.locator("#detailEspace > .rotation-lieu").count() === 0);
  const familles = await rotation(pg, "z1").locator(".ro-f")
    .evaluateAll(l => l.map(e => e.textContent));
  j.controle("les familles sont rangées par leur nom français",
    JSON.stringify(familles) === JSON.stringify(["Cucurbitacées", "Lamiaceae", "Solanacées"]),
    familles.join(" "));

  j.section("chaque famille dit ses années et son délai");
  const sola = net(await lireLigne(pg, "z1", "Solanaceae"));
  j.controle("deux passages et le retour repoussé",
    sola === "Solanacées 2024 2026 pas avant 2030", sola);
  j.controle("une famille revenue libre le dit",
    net(await ligne(pg, "z1", "Cucurbitaceae").locator(".ro-etat").textContent()) === "libre");
  j.controle("une famille sans règle ne promet rien",
    net(await ligne(pg, "z1", "Lamiaceae").locator(".ro-etat").textContent())
      === "sans règle de retour");
  j.controle("seule l'année saisie à la main se retire",
    await ligne(pg, "z1", "Solanaceae").locator(".ro-saisi").count() === 1
    && await ligne(pg, "z1", "Solanaceae").locator(".ro-a").count() === 2);

  j.section("l'avertissement au moment de poser la plante");
  vus = []; reponse = "refuser";
  await poser(pg, "z1", "Tomate");
  j.controle("il nomme la famille, les années et l'année de retour",
    vus.length === 1 && vus[0] === "Des solanacées ont poussé ici en 2024 et 2026."
      + " Attendre 2030. Placer Tomate ici quand même ?", vus[0] || "aucun");
  j.controle("refuser ne place pas la plante",
    await zone(pg, "z1").locator(`.ligne-espace[data-plante="${TOMATE.id}"]`).count() === 0);
  vus = []; reponse = "accepter";
  await poser(pg, "z1", "Tomate");
  j.controle("accepter la place quand même",
    await zone(pg, "z1").locator(`.ligne-espace[data-plante="${TOMATE.id}"]`).count() === 1);

  j.section("le placement écrit la trace");
  vus = [];
  await poser(pg, "z1", "Radis");
  j.controle("une famille encore absente ne fait pas d'avertissement",
    vus.length === 0, vus.join(" "));
  j.controle("la famille du radis rejoint le panneau",
    await ligne(pg, "z1", "Brassicaceae").count() === 1);
  j.controle("avec l'année en cours et son délai de retour",
    net(await lireLigne(pg, "z1", "Brassicaceae")) === "Brassicacées 2026 pas avant 2030",
    net(await lireLigne(pg, "z1", "Brassicaceae")));
  await poser(pg, "z2", "Rhubarbe");
  j.controle("une vivace n'entre pas dans la trace",
    await zone(pg, "z2").locator(`.ligne-espace[data-plante="${RHUBARBE.id}"]`).count() === 1
    && await rotation(pg, "z2").count() === 0);

  j.section("saisir une année antérieure");
  await zone(pg, "z2").locator(".rech-lieu").fill("");
  await deplier(pg, "z1");
  await rotation(pg, "z1").locator(".ro-famille").selectOption("Asteraceae");
  await rotation(pg, "z1").locator(".ro-annee").fill("2025");
  await rotation(pg, "z1").locator('.ro-ajout button[type="submit"]').click();
  await pg.waitForTimeout(600);
  j.controle("la famille saisie rejoint le panneau",
    net(await lireLigne(pg, "z1", "Asteraceae")) === "Astéracées 2025 pas avant 2027",
    net(await lireLigne(pg, "z1", "Asteraceae")));
  await ligne(pg, "z1", "Asteraceae").locator(".ro-oter").click();
  await pg.waitForTimeout(600);
  j.controle("elle se retire aussi bien", await ligne(pg, "z1", "Asteraceae").count() === 0);

  j.section("la sourdine, et le retour en arrière");
  await rotation(pg, "z1").locator(".ro-taire").click();
  await pg.waitForTimeout(600);
  j.controle("le panneau cède la place à un rappel discret",
    await rotation(pg, "z1").locator(".ro-rendre").count() === 1
    && await rotation(pg, "z1").locator(".ro-l").count() === 0);
  vus = [];
  await zone(pg, "z1").locator(`.ligne-espace[data-plante="${TOMATE.id}"] .retirer-lieu`).click();
  await pg.waitForTimeout(500);
  await poser(pg, "z1", "Tomate");
  j.controle("la planche mise en sourdine n'avertit plus",
    vus.length === 0, vus.join(" "));
  await rotation(pg, "z1").locator(".ro-rendre").click();
  await pg.waitForTimeout(600);
  j.controle("réafficher rend le panneau entier",
    await ligne(pg, "z1", "Solanaceae").count() === 1);

  await ctx.close();
  return j.fin(erreurs);
}
