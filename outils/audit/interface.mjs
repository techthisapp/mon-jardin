/* Audit de l'interface, préalable à sa simplification.
   Sert l'application sur le port des essais, l'ouvre sur les données figées
   avec un jardin peuplé, et parcourt chaque écran et les feuilles principales
   à la largeur d'un téléphone courant. Pour chacun, une capture pleine page et
   des mesures : hauteur, nombre de contrôles visibles, de blocs et de mots.

   Emploi : node outils/audit/interface.mjs <dossier de sortie>
   Rien n'est écrit dans le dépôt, rien ne sort sur le réseau. */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { ICI, ouvrirContexte, CATALOGUE } from "../essais/commun.mjs";

const SORTIE = process.argv[2];
if (!SORTIE) { console.error("Dossier de sortie attendu."); process.exit(1); }
await mkdir(SORTIE, { recursive: true });

const RACINE = join(ICI, "..", "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const serveur = createServer(async (req, res) => {
  const chemin = join(RACINE, normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""));
  try { res.writeHead(200, { "Content-Type": TYPES[extname(chemin)] || "application/octet-stream" });
        res.end(await readFile(chemin)); }
  catch { res.writeHead(404).end("absent"); }
});
await new Promise((r, e) => serveur.once("error", e).listen(8099, "127.0.0.1", r));

/* Un jardin plausible : trois espaces dont un à deux zones, vingt-quatre
   plantes dont dix-huit placées, deux entrées au carnet. */
const PLANTES = JSON.parse(CATALOGUE).plants;
const par = n => PLANTES.find(p => p.name === n);
const NOMS = ["Tomate", "Fraise", "Rhubarbe", "Courgette", "Laitue", "Carotte", "Haricot",
  "Pomme de terre", "Basilic", "Persil", "Ciboulette", "Thym", "Romarin", "Lavande",
  "Rosier", "Hortensia", "Pommier", "Poirier", "Framboisier", "Groseillier", "Dahlia",
  "Pivoine", "Sauge", "Menthe"];
const JARDIN = NOMS.map(par).filter(Boolean);
const ESPACES = [
  { id: "e1", name: "Potager", surface_m2: 40, exposition: "soleil" },
  { id: "z1", name: "Carré du fond", parent_id: "e1", surface_m2: 10 },
  { id: "z2", name: "Bordure", parent_id: "e1", surface_m2: 6 },
  { id: "e2", name: "Verger", surface_m2: 120 },
  { id: "e3", name: "Massif d'entrée", surface_m2: 15, exposition: "mi-ombre" },
];
const LIEUX = ["e1", "z1", "z2", "e2", "e3"];
const PLACEMENTS = JARDIN.slice(0, 18).map((p, i) => ({ plant_id: p.id, espace_id: LIEUX[i % 5], quantity: 1 + (i % 4) }));
const CARNET = [
  { id: "o1", garden_id: "g1", espace_id: "e1", plant_id: null, jour: "2026-07-28",
    geste: "traitement", texte: "Purin d'ortie sur tout le carré.", quantite: null, unite: null,
    created_at: "2026-07-28T08:00:00Z" },
  { id: "o2", garden_id: "g1", espace_id: "z1", plant_id: JARDIN[0].id, jour: "2026-08-01",
    geste: "recolte", texte: null, quantite: 2.4, unite: "kg", created_at: "2026-08-01T17:00:00Z" },
];

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM });
const { ctx, pg, erreurs } = await ouvrirContexte(nav,
  { jardin: JARDIN.map(p => p.id), espaces: ESPACES, placements: PLACEMENTS, carnet: CARNET });
await pg.setViewportSize({ width: 393, height: 852 });
await pg.waitForTimeout(900);

/* Mesures de la zone visible : l'écran ouvert, ou la feuille quand elle l'est. */
const mesurer = () => pg.evaluate(() => {
  const feuille = document.getElementById("feuille");
  const ouverte = feuille && !feuille.hidden;
  const racine = ouverte ? document.getElementById("feuille-corps")
    : document.querySelector("main > section:not([hidden])") || document.body;
  /* Le contenu d'un détail replié garde ses boîtes dans Chromium : seul
     `checkVisibility` l'écarte, avec ce que masquent l'opacité et la
     visibilité. Sans lui, les zones repliées d'un espace comptaient. */
  const vis = e => e.offsetParent !== null && e.getBoundingClientRect().height > 0
    && e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const ctrl = [...racine.querySelectorAll("button, a[href], input, select, summary, [role=button], [role=tab]")].filter(vis);
  const texte = (racine.innerText || "").replace(/\s+/g, " ").trim();
  return {
    racine: ouverte ? "feuille" : racine.id,
    hauteur: Math.round(ouverte ? racine.scrollHeight : document.documentElement.scrollHeight),
    controles: ctrl.length,
    // Le détail des contrôles, par classe, pour savoir ce qui pèse.
    parClasse: ctrl.reduce((a, e) => {
      const c = e.tagName.toLowerCase() + "." + (e.className || "").toString().split(" ")[0];
      a[c] = (a[c] || 0) + 1; return a;
    }, {}),
    mots: texte ? texte.split(" ").length : 0,
    titres: [...racine.querySelectorAll("h2, h3, .titre-bloc, .nom-niveau")].filter(vis)
      .map(h => h.innerText.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 30),
  };
});

const releves = [];
async function relever(nom) {
  await pg.waitForTimeout(700);
  const m = await mesurer();
  const feuille = m.racine === "feuille";
  if (feuille) {
    // La feuille défile dans son propre corps : on la déroule pour la capture.
    await pg.evaluate(() => {
      const f = document.getElementById("feuille");
      f.style.maxHeight = "none"; f.style.height = "auto";
      const c = document.getElementById("feuille-corps");
      c.style.maxHeight = "none"; c.style.overflow = "visible";
    });
  }
  await pg.screenshot({ path: join(SORTIE, nom + ".png"), fullPage: true });
  releves.push({ nom, ...m });
  console.log(nom.padEnd(22), JSON.stringify({ h: m.hauteur, ctrl: m.controles, mots: m.mots }));
}
const fermer = async () => {
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(500);
  await pg.evaluate(() => { const f = document.getElementById("feuille"); if (f) { f.style.cssText = ""; } });
  await pg.reload(); await pg.waitForTimeout(2500);
};
const onglet = async e => { await pg.locator(`.onglet[data-ecran="${e}"]`).dispatchEvent("click"); };

const etapes = [
  ["01-jour", async () => onglet("maintenant")],
  ["02-jour-liste", async () => { await onglet("maintenant"); await pg.waitForTimeout(400); await pg.locator("#btnTout").click(); }],
  ["03-annee", async () => onglet("planning")],
  ["04-jardin", async () => onglet("selection")],
  ["05-espace", async () => { await onglet("selection"); await pg.waitForTimeout(500);
    await pg.locator("#ec-selection").getByText("Potager", { exact: true }).first().click(); }],
  ["06-mes-plantes", async () => onglet("plantes")],
  ["07-catalogue", async () => pg.locator("#btnCatalogue").click()],
  ["08-carnet", async () => { await pg.locator("#btnNoter").click(); await pg.waitForTimeout(600);
    await pg.keyboard.press("Escape"); }],
  ["10-feuille-temps", async () => { await onglet("maintenant"); await pg.waitForTimeout(400);
    await pg.locator("#blocTemps .tm-temps").click(); }],
  ["11-feuille-eau", async () => { await onglet("maintenant"); await pg.waitForTimeout(400);
    await pg.locator('#blocTemps .mesure-j[data-vue="eau"]').click(); }],
  ["12-feuille-lumiere", async () => { await onglet("maintenant"); await pg.waitForTimeout(400);
    await pg.locator('#blocTemps .mesure-j').nth(1).click(); }],
  ["13-feuille-saison", async () => { await onglet("maintenant"); await pg.waitForTimeout(400);
    await pg.locator('#blocTemps .mesure-j').nth(2).click(); }],
  ["14-reglages-jardin", async () => pg.locator("#btnJardin").click()],
  ["15-compte", async () => pg.locator("#btnConfig").click()],
  ["16-noter", async () => pg.locator("#btnNoter").click()],
];
for (const [nom, aller] of etapes) {
  try { await aller(); await relever(nom); }
  catch (e) { console.log(nom.padEnd(22), "inaccessible :", e.message.split("\n")[0]); }
  await fermer();
}

/* La fiche d'une plante, onglet par onglet. */
try {
  await onglet("plantes"); await pg.waitForTimeout(600);
  await pg.locator("#ec-plantes").getByText("Tomate", { exact: true }).first().click();
  await pg.waitForTimeout(800);
  const onglets = await pg.locator("#feuille-corps [role=tab]").allInnerTexts();
  for (let i = 0; i < Math.max(1, onglets.length); i++) {
    if (onglets.length) await pg.locator("#feuille-corps [role=tab]").nth(i).click();
    await relever("20-fiche-" + (onglets[i] || "unique").replace(/\W+/g, "-").toLowerCase());
  }
} catch (e) { console.log("fiche".padEnd(22), "inaccessible :", e.message.split("\n")[0]); }

await writeFile(join(SORTIE, "releves.json"), JSON.stringify(releves, null, 2));
console.log("erreurs de page :", erreurs.length, erreurs.slice(0, 3));
await ctx.close(); await nav.close(); serveur.close();
