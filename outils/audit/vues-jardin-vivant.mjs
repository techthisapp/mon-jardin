/* Photographies du fond « Jardin vivant » dans l'application, aux quatre
   saisons, de jour et de nuit, sur les données figées des essais, pour chacun
   des trois styles.
   Emploi : node outils/audit/vues-jardin-vivant.mjs <dossier de sortie> [style]
   Rien n'est écrit dans le dépôt, rien ne sort sur le réseau. */
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { ICI, ouvrirContexte } from "../essais/commun.mjs";

const SORTIE = process.argv[2], STYLE = process.argv[3] || "moderne";
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
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM });
const MOMENTS = [
  ["ete-matin", "2026-08-02T09:00:00+02:00"], ["ete-nuit", "2026-08-02T23:30:00+02:00"],
  ["printemps", "2026-04-15T11:00:00+02:00"], ["automne-soir", "2026-10-15T19:00:00+02:00"],
  ["hiver", "2026-01-10T14:00:00+01:00"],
];
for (const [nom, quand] of MOMENTS) {
  const { ctx, pg, erreurs } = await ouvrirContexte(nav, { jour: new Date(quand).getTime(), style: STYLE });
  await pg.setViewportSize({ width: 393, height: 852 });
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path: join(SORTIE, `${STYLE}-${nom}.png`) });
  const etat = await pg.evaluate(() => { const z = document.getElementById("ambiance");
    return { fond: z.dataset.fond, ciel: z.dataset.ciel, saison: z.dataset.saison, meteo: z.dataset.meteo }; });
  console.log(nom, JSON.stringify(etat), "erreurs", erreurs.slice(0, 3));
  await ctx.close();
}
await nav.close(); serveur.close();
