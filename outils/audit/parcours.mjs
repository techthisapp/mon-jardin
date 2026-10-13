/* Parcours de l'audit par personas.
   Sert l'application sur le port des essais, sur les données figées, et rejoue
   des parcours d'utilisateur réels : la première ouverture sans compte, le
   jardin vide qui se compose, le jardin établi parcouru écran par écran, une
   journée d'hiver, et la largeur la plus étroite. Chaque étape laisse une
   capture de ce que l'écran montre, sans défilement forcé, et le texte visible
   de la vue, pour que la lecture se fasse comme celle d'un utilisateur.

   Emploi : node outils/audit/parcours.mjs <dossier de sortie>
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

const PLANTES = JSON.parse(CATALOGUE).plants;
const par = n => PLANTES.find(p => p.name === n);
const NOMS = ["Tomate", "Fraise", "Rhubarbe", "Courgette", "Laitue", "Carotte", "Basilic",
  "Persil", "Ciboulette", "Thym", "Romarin", "Lavande", "Rosier", "Hortensia", "Poirier",
  "Pommier", "Menthe"];
const JARDIN = NOMS.map(par).filter(Boolean);
const ESPACES = [
  { id: "e1", name: "Potager", surface_m2: 40, exposition: "soleil" },
  { id: "z1", name: "Carré du fond", parent_id: "e1", surface_m2: 10 },
  { id: "z2", name: "Bordure", parent_id: "e1", surface_m2: 6 },
  { id: "e2", name: "Verger", surface_m2: 120 },
  { id: "e3", name: "Massif d'entrée", surface_m2: 15, exposition: "mi_ombre" },
];
const LIEUX = { Tomate: "z1", Fraise: "z1", Rhubarbe: "z2", Courgette: "e1", Laitue: "z2",
  Carotte: "e1", Basilic: "z1", Persil: "e1", Ciboulette: "z2", Poirier: "e2", Pommier: "e2",
  Lavande: "e3", Rosier: "e3", Hortensia: "e3", Thym: "e3" };
const PLACEMENTS = JARDIN.filter(p => LIEUX[p.name])
  .map(p => ({ plant_id: p.id, espace_id: LIEUX[p.name], quantity: p.name === "Tomate" ? 6 : null }));
const CARNET = [
  { id: "o1", garden_id: "g1", espace_id: "e1", plant_id: null, jour: "2026-07-28",
    geste: "traitement", texte: "Purin d'ortie sur tout le carré.", quantite: null, unite: null,
    created_at: "2026-07-28T08:00:00Z" },
  { id: "o2", garden_id: "g1", espace_id: "z1", plant_id: par("Tomate").id, jour: "2026-08-01",
    geste: "recolte", texte: null, quantite: 2.4, unite: "kg", created_at: "2026-08-01T17:00:00Z" },
];

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM });
const index = [];
const erreursTout = [];

async function scene(nom, options, largeur, etapes) {
  const { ctx, pg, erreurs } = await ouvrirContexte(nav, options);
  await pg.setViewportSize({ width: largeur, height: largeur < 360 ? 640 : 852 });
  await pg.waitForTimeout(900);
  let n = 0;
  const capter = async titre => {
    await pg.waitForTimeout(600);
    const fichier = `${nom}-${String(++n).padStart(2, "0")}.png`;
    await pg.screenshot({ path: join(SORTIE, fichier) });
    const texte = await pg.evaluate(() => {
      const f = document.getElementById("feuille");
      const zone = f && !f.hidden ? f : document.body;
      return (zone.innerText || "").replace(/\n{2,}/g, "\n").trim().slice(0, 3000);
    });
    index.push({ parcours: nom, etape: n, titre, largeur, fichier, texte });
    console.log(fichier.padEnd(24), titre);
  };
  const faire = async (geste) => { try { await geste(); } catch (e) {
    index.push({ parcours: nom, etape: n + 1, titre: "geste impossible : " + e.message.split("\n")[0] }); } };
  for (const [titre, geste] of etapes) {
    if (geste) await faire(() => geste(pg));
    await capter(titre);
  }
  erreursTout.push(...erreurs.map(e => nom + " : " + e));
  await ctx.close();
}

const onglet = e => pg => pg.locator(`.onglet[data-ecran="${e}"]`).dispatchEvent("click");
const clic = sel => pg => pg.locator(sel).first().click();
const fermer = async pg => { await pg.keyboard.press("Escape"); await pg.waitForTimeout(400); };
const defiler = y => pg => pg.evaluate(v => window.scrollBy(0, v), y);
const defilerFeuille = y => pg => pg.evaluate(v => {
  const c = document.getElementById("feuille-corps");
  const f = document.getElementById("feuille");
  (c && c.scrollHeight > c.clientHeight ? c : f).scrollBy(0, v);
}, y);

// 1. Première ouverture, sans compte.
await scene("a-decouverte", { session: false }, 393, [
  ["Première ouverture, sans compte"],
  ["Feuille du compte refermée", fermer],
  ["Écran Année sans compte", onglet("planning")],
  ["Plantes sans compte", onglet("plantes")],
  ["Catalogue depuis le livre", clic("#btnCatalogue")],
  ["Fiche ouverte depuis le catalogue", pg => pg.locator("#listes .item").first().click()],
]);

// 2. Connecté, jardin vide qui se compose.
await scene("b-premiers-pas", { jardin: [] }, 393, [
  ["Jour, jardin vide"],
  ["Jardin, aucun espace", onglet("selection")],
  ["Catalogue", clic("#btnCatalogue")],
  ["Une plante cochée au catalogue", pg => pg.locator("#listes .rond").first().click()],
  ["Trois plantes cochées", async pg => {
    await pg.locator("#listes .rond").nth(1).click(); await pg.waitForTimeout(300);
    await pg.locator("#listes .rond").nth(2).click(); }],
  ["Mes plantes", onglet("plantes")],
  ["Jour avec trois plantes", onglet("maintenant")],
]);

// 3. Jardin établi, au 2 août.
const etabli = { jardin: JARDIN.map(p => p.id), espaces: ESPACES, placements: PLACEMENTS, carnet: CARNET };
const parcoursEtabli = [
  ["Jour, haut de l'écran"],
  ["Jour, bas de l'écran", defiler(700)],
  ["Une tâche ouverte depuis la synthèse", async pg => {
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.locator(".syn-ligne").first().click(); }],
  ["Liste complète du jour", async pg => {
    await pg.locator("#barreNiveau .retour").click(); await pg.waitForTimeout(400);
    await pg.locator("#btnTout").click(); }],
  ["Année, quinzaine en cours", onglet("planning")],
  ["Année, quinzaine suivante", clic("#quinzSuiv")],
  ["Année, toute l'année", clic('#lectureAnnee .vue[data-lecture="frise"]')],
  ["Jardin, les espaces", onglet("selection")],
  ["Un espace découpé en zones", pg => pg.locator('.tuile-espace[data-espace="e1"]').dispatchEvent("click")],
  ["Une zone dépliée", clic("#detailEspace details.zone-espace summary")],
  ["Mes plantes", onglet("plantes")],
  ["Fiche, onglet du moment", pg => pg.locator("#listes .item").first().click()],
  ["Fiche, toute l'année", clic('#feuille-corps .f-onglets button[data-pan="annee"]')],
  ["Fiche, identité", clic('#feuille-corps .f-onglets button[data-pan="identite"]')],
  ["Fiche, au jardin", clic('#feuille-corps .f-onglets button[data-pan="jardin"]')],
  ["Noter, la feuille de saisie", async pg => { await fermer(pg); await pg.waitForTimeout(300);
    await onglet("maintenant")(pg); await pg.waitForTimeout(300); await pg.locator("#btnNoter").click(); }],
  ["Le carnet derrière la saisie", fermer],
];
// Les feuilles se lisent dans une scène propre : l'historique des niveaux du
// jour ouverts plus haut se rejouerait à leur fermeture.
const feuilles = [
  ["Feuille du temps", clic("#blocTemps .tm-temps")],
  ["Feuille du temps, plus bas", defilerFeuille(700)],
  ["Feuille de l'eau", async pg => { await fermer(pg); await pg.waitForTimeout(300);
    await pg.locator('#blocTemps .mesure-j[data-vue="eau"]').click(); }],
  ["Feuille de l'eau, plus bas", defilerFeuille(700)],
  ["Réglages du jardin", async pg => { await fermer(pg); await pg.waitForTimeout(300);
    await pg.locator("#btnJardin").click(); }],
];
await scene("c-jardin-etabli", etabli, 393, parcoursEtabli);
await scene("f-feuilles", etabli, 393, feuilles);

// 4. Le même jardin un 10 janvier.
await scene("d-hiver", { ...etabli, jour: new Date("2026-01-10T09:00:00+01:00").getTime() }, 393, [
  ["Jour en hiver"],
  ["Année en hiver", onglet("planning")],
]);

// 5. Le plus petit téléphone courant.
await scene("e-etroit", etabli, 320, [
  ["Jour à 320 points"],
  ["Année à 320 points", onglet("planning")],
  ["Fiche à 320 points", async pg => { await onglet("plantes")(pg); await pg.waitForTimeout(400);
    await pg.locator("#listes .item").first().click(); }],
]);

await writeFile(join(SORTIE, "parcours.json"), JSON.stringify(index, null, 2));
console.log("erreurs de page :", erreursTout.length, erreursTout.slice(0, 5));
await nav.close(); serveur.close();
