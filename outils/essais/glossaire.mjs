/* Glossaire du métier. Les termes sont repérés dans les textes de la fiche et
   leur définition s'ouvre au toucher. La plante d'essai porte un texte qui
   réunit les cas difficiles : mot composé contenant un mot du glossaire, forme
   fléchie, majuscule de début de phrase, et mot plus long qui ne doit pas être
   pris pour un terme. */
import { ouvrirContexte, journal, CATALOGUE, net } from "./commun.mjs";

const ESSAI = "Rabattre les cannes au ras du collet. Le porte-greffe décide de la "
  + "vigueur, une greffe reprend mal. Compost mi-mûr au fond, compost mûr en "
  + "surface. Un œil suffit, les yeux se comptent, l'œilleton non. Marcotter en août.";
const ATTENDU = ["Rabattre", "cannes", "collet", "porte-greffe", "greffe",
  "Compost mi-mûr", "compost mûr", "œil", "yeux", "Marcotter"];

/* La plante d'essai est une copie de la glycine, dont la taille est ouverte en
   août : son conseil de période porte le texte à contrôler. */
function catalogueAvecPlanteDEssai() {
  const c = JSON.parse(CATALOGUE);
  const g = c.plants.find(p => /Glycine/i.test(p.name));
  const e = JSON.parse(JSON.stringify(g));
  e.id = 999001; e.slug = "plante-essai"; e.name = "Plante essai";
  e.guide_periode = Object.assign({}, e.guide_periode, { 575: ESSAI });
  c.plants.push(e);
  return JSON.stringify(c);
}

export default async function essai(navigateur) {
  const j = journal("Glossaire du métier");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { catalogue: catalogueAvecPlanteDEssai() });

  await pg.locator(".syn-ligne", { hasText: "Tailler" }).click();
  await pg.waitForTimeout(600);
  await pg.locator("#maintenant .nom-action", { hasText: "Plante essai" }).first().click();
  await pg.waitForTimeout(800);

  j.section("repérage des termes");
  const marques = await pg.locator(".f-acte .terme").allInnerTexts();
  j.controle("les termes attendus, dans l'ordre",
    JSON.stringify(marques) === JSON.stringify(ATTENDU), JSON.stringify(marques));
  j.controle("œilleton n'est pas pris pour œil",
    (await pg.locator(".f-acte p").first().innerText()).includes("l'œilleton non"));
  j.controle("porte-greffe compte pour un seul terme",
    await pg.locator('.f-acte .terme[data-terme="porte-greffe"]').count() === 1);

  j.section("ouverture de la définition");
  await pg.locator(".f-acte .terme", { hasText: "cannes" }).first().click();
  await pg.waitForTimeout(200);
  j.controle("la définition paraît", await pg.locator(".glose").count() === 1);
  const txt = net(await pg.locator(".glose").innerText());
  j.controle("elle porte le terme canonique et sa définition",
    txt.startsWith("canne") && txt.includes("Elle vit deux ans"), txt.slice(0, 55));
  const bornes = await pg.evaluate(() => {
    const c = document.getElementById("feuille-corps");
    const rc = c.getBoundingClientRect();
    const rg = document.querySelector(".glose").getBoundingClientRect();
    const rb = document.querySelector(".terme.ouvert").getBoundingClientRect();
    return { dedans: rg.left >= rc.left - 1 && rg.right <= rc.right + 1, sous: rg.top >= rb.bottom - 1 };
  });
  j.controle("elle reste dans la largeur de la feuille", bornes.dedans);
  j.controle("elle se pose sous le mot", bornes.sous);

  j.section("une seule définition à la fois");
  await pg.locator(".f-acte .terme", { hasText: "collet" }).first().click();
  await pg.waitForTimeout(200);
  j.controle("la précédente est remplacée", await pg.locator(".glose").count() === 1);
  j.controle("la nouvelle est la bonne",
    net(await pg.locator(".glose").innerText()).startsWith("collet"));

  j.section("fermeture");
  await pg.keyboard.press("Escape");
  await pg.waitForTimeout(200);
  j.controle("l'échappement referme la définition", await pg.locator(".glose").count() === 0);
  j.controle("la fiche reste ouverte", await pg.locator("#feuille").isVisible());
  await pg.locator(".f-acte .terme", { hasText: "collet" }).first().click();
  await pg.waitForTimeout(150);
  await pg.locator("#feuille-titre").click();
  await pg.waitForTimeout(200);
  j.controle("un toucher à côté referme aussi", await pg.locator(".glose").count() === 0);

  j.section("bascule quand le bas de la feuille est proche");
  await pg.evaluate(() => {
    const c = document.getElementById("feuille-corps");
    const t = [...c.querySelectorAll(".f-acte .terme")].pop();
    c.scrollTop = t.offsetTop - c.clientHeight + t.offsetHeight + 4;
  });
  await pg.waitForTimeout(200);
  await pg.locator(".f-acte .terme").last().click();
  await pg.waitForTimeout(250);
  const bascule = await pg.evaluate(() => {
    const rg = document.querySelector(".glose").getBoundingClientRect();
    const rb = document.querySelector(".terme.ouvert").getBoundingClientRect();
    const rc = document.getElementById("feuille-corps").getBoundingClientRect();
    return { dessus: rg.bottom <= rb.top + 1, visible: rg.top >= rc.top - 1 };
  });
  j.controle("la définition bascule au-dessus du mot", bascule.dessus);
  j.controle("elle reste visible", bascule.visible);

  j.section("repérage dans les blocs d'attributs");
  await pg.keyboard.press("Escape");
  await pg.locator('.f-onglets button[data-pan="annee"]').click();
  await pg.waitForTimeout(300);
  const dansBlocs = await pg.locator(".f-kv dd .terme").count();
  j.controle("les blocs portent le même repérage", dansBlocs > 0, dansBlocs + " termes");

  await ctx.close();
  return j.fin(erreurs);
}
