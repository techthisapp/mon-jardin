/* Lanceur des essais de bout en bout.
   Sert l'application sur un port local, ouvre un navigateur, joue chaque suite
   dans son propre contexte, et rend un code de sortie non nul au premier
   contrôle en échec.

   Emploi : node outils/essais/tous.mjs [nom de suite]
   Le navigateur est celui de Playwright. La variable d'environnement
   CHROMIUM permet d'en désigner un autre, ce dont se sert l'atelier. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { ICI } from "./commun.mjs";

const RACINE = join(ICI, "..", "..");
const PORT = 8099;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
};

function servir() {
  const s = createServer(async (req, res) => {
    const chemin = join(RACINE, normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""));
    try {
      const corps = await readFile(chemin);
      res.writeHead(200, { "Content-Type": TYPES[extname(chemin)] || "application/octet-stream" });
      res.end(corps);
    } catch {
      res.writeHead(404).end("absent");
    }
  });
  return new Promise(r => s.listen(PORT, "127.0.0.1", () => r(s)));
}

const SUITES = [
  ["bilan", () => import("./bilan.mjs")],
  ["navigation", () => import("./navigation.mjs")],
  ["conseils", () => import("./conseils.mjs")],
  ["eau", () => import("./eau.mjs")],
  ["station", () => import("./station.mjs")],
  ["vigilance", () => import("./vigilance.mjs")],
  ["glossaire", () => import("./glossaire.mjs")],
  ["ecarts", () => import("./ecarts.mjs")],
  ["blocs", () => import("./blocs.mjs")],
];

const demande = process.argv[2];
const choisies = demande ? SUITES.filter(([n]) => n === demande) : SUITES;
if (!choisies.length) {
  console.error("Suite inconnue. Disponibles : " + SUITES.map(([n]) => n).join(", "));
  process.exit(2);
}

const serveur = await servir();
const navigateur = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

let echecs = 0, controles = 0;
for (const [nom, charger] of choisies) {
  const mod = await charger();
  const r = nom === "bilan" ? mod.default() : await mod.default(navigateur);
  console.log("\n" + r.titre);
  r.lignes.forEach(l => console.log(l));
  echecs += r.echecs;
  controles += r.lignes.filter(l => /^\s{4}(ok|ECHEC)/.test(l)).length;
}

await navigateur.close();
serveur.close();

console.log("\n" + controles + " contrôles joués, "
  + (echecs ? echecs + " en échec." : "aucun échec."));
process.exit(echecs ? 1 : 0);
