/* Lanceur des essais de bout en bout.
   Sert l'application sur un port local, ouvre un navigateur, joue chaque suite
   dans son propre contexte, et rend un code de sortie non nul au premier
   contrôle en échec.

   Emploi : node outils/essais/tous.mjs [nom de suite]
   Le navigateur est celui de Playwright. La variable d'environnement
   CHROMIUM permet d'en désigner un autre, ce dont se sert l'atelier.
   PORT_ESSAIS remplace le port 8099, pour jouer deux copies côte à côte.

   Un navigateur qui disparaît en cours de suite sans que le lanceur l'ait
   fermé interrompait toute la série sur une exception non rattrapée. Le
   16 octobre 2026, trois séries indépendantes, chacune avec son Chromium, ont
   perdu le leur à la même seconde : l'arrêt venait de l'extérieur. La suite
   touchée est désormais rejouée une fois sur un navigateur neuf, et la cause
   est écrite dans le compte rendu. Une seconde perte, un plantage du moteur de
   rendu ou une exception de la suite elle-même comptent comme un échec, sans
   reprise : ceux-là peuvent venir de l'application ou de l'essai. */
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { ICI, PORT, INCIDENTS } from "./commun.mjs";

/* Playwright ne rend le code de sortie du navigateur que dans son journal de
   mise au point. Le journal est ouvert, ses lignes sont retenues hors de la
   sortie d'erreur, et seule la fin du processus est gardée pour le compte
   rendu. Un DEBUG posé par l'appelant passe tel quel. */
const FINS = [];
if (!process.env.DEBUG) {
  process.env.DEBUG = "pw:browser";
  const ecrire = process.stderr.write.bind(process.stderr);
  process.stderr.write = (morceau, ...reste) => {
    const t = String(morceau);
    if (!t.includes("pw:browser")) return ecrire(morceau, ...reste);
    const m = t.match(/\[pid=(\d+)\] <process did exit: exitCode=(\S+), signal=(\S+)>/);
    if (m) FINS.push({ pid: m[1], code: m[2], signal: m[3] });
    return true;
  };
}
const { chromium } = await import("playwright");

const RACINE = join(ICI, "..", "..");
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
  return new Promise((r, refus) => {
    s.once("error", refus);
    s.listen(PORT, "127.0.0.1", () => r(s));
  });
}

const SUITES = [
  ["bilan", () => import("./bilan.mjs")],
  ["navigation", () => import("./navigation.mjs")],
  ["conseils", () => import("./conseils.mjs")],
  ["eau", () => import("./eau.mjs")],
  ["station", () => import("./station.mjs")],
  ["vigilance", () => import("./vigilance.mjs")],
  ["temps", () => import("./temps.mjs")],
  ["photos", () => import("./photos.mjs")],
  ["glossaire", () => import("./glossaire.mjs")],
  ["ecarts", () => import("./ecarts.mjs")],
  ["blocs", () => import("./blocs.mjs")],
  ["taille", () => import("./taille.mjs")],
  ["reglages", () => import("./reglages.mjs")],
  ["espaces", () => import("./espaces.mjs")],
  ["journal", () => import("./journal.mjs")],
  ["rotation", () => import("./rotation.mjs")],
  ["feuille", () => import("./feuille.mjs")],
  ["calendrier", () => import("./calendrier.mjs")],
  ["planches", () => import("./planches.mjs")],
  ["ambiance", () => import("./ambiance.mjs")],
  ["herbier", () => import("./herbier.mjs")],
  ["largeurs", () => import("./largeurs.mjs")],
  ["saison", () => import("./saison.mjs")],
  ["quinzaine", () => import("./quinzaine.mjs")],
  ["regroupement", () => import("./regroupement.mjs")],
  ["retraits", () => import("./retraits.mjs")],
  ["frise", () => import("./frise.mjs")],
  ["annee", () => import("./annee.mjs")],
  ["fait", () => import("./fait.mjs")],
];

const demande = process.argv[2];
const choisies = demande ? SUITES.filter(([n]) => n === demande) : SUITES;
if (!choisies.length) {
  console.error("Suite inconnue. Disponibles : " + SUITES.map(([n]) => n).join(", "));
  process.exit(2);
}

/* Playwright vise un dossier de navigateur portant un numéro de version. Quand
   l'atelier en héberge un autre, la recherche évite d'avoir à le désigner à la
   main à chaque changement de version.

   L'ordre de préférence n'est pas indifférent. La coquille sans tête et le
   Chromium complet ne mesurent pas le texte de la même façon : le segment de
   bascule vaut cent vingt points sous la première et cent quatorze sous le
   second, si bien que les trois contrôles de largeur de la suite
   `regroupement` échouaient ou passaient selon le navigateur trouvé, sur le
   même dépôt. La recherche prend donc le Chromium complet partout où il
   existe, et ne retombe sur la coquille qu'à défaut. Le dossier des binaires
   s'appelle `chrome-linux` sur les anciennes révisions et `chrome-linux64` sur
   les récentes. */
async function navigateurInstalle() {
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!racine || !existsSync(racine)) return null;
  const dossiers = (await readdir(racine)).filter(d => d.startsWith("chromium")).sort().reverse();
  const chercher = nom => {
    for (const d of dossiers) {
      for (const toit of ["chrome-linux", "chrome-linux64"]) {
        const chemin = join(racine, d, toit, nom);
        if (existsSync(chemin)) return chemin;
      }
    }
    return null;
  };
  return chercher("chrome") || chercher("headless_shell");
}

const serveur = await servir().catch(e => {
  if (e.code !== "EADDRINUSE") throw e;
  console.error(`Le port ${PORT} est occupé, sans doute par une série encore en cours.`
    + " Attendre sa fin, ou choisir un autre port par PORT_ESSAIS.");
  process.exit(2);
});

async function lancer() {
  if (process.env.CHROMIUM) return chromium.launch({ executablePath: process.env.CHROMIUM });
  try { return await chromium.launch(); }
  catch (e) {
    const chemin = await navigateurInstalle();
    if (!chemin) throw e;
    return chromium.launch({ executablePath: chemin });
  }
}

/* L'erreur de la suite précède l'évènement de déconnexion quand le navigateur
   reçoit un signal d'arrêt : la perte se constate donc après un court délai. */
function perdu(nav, delai = 3000) {
  if (!nav.isConnected()) return Promise.resolve(true);
  return new Promise(r => {
    const t = setTimeout(() => r(!nav.isConnected()), delai);
    nav.once("disconnected", () => { clearTimeout(t); r(true); });
  });
}

/* Un code 143 ou 137, ou un signal TERM ou KILL, désigne un arrêt demandé par
   un autre processus. Les autres fins sont celles d'un navigateur qui plante. */
function direFin(fin) {
  if (!fin) return "fin du processus non relevée";
  const ext = ["143", "137"].includes(fin.code) || ["SIGTERM", "SIGKILL"].includes(fin.signal);
  return `processus ${fin.pid}, code ${fin.code}, signal ${fin.signal}, `
    + (ext ? "arrêté par un autre processus" : "plantage du navigateur");
}

let navigateur = await lancer();
let suiteEnCours = "";
let echecs = 0, controles = 0;
const reprises = [];

/* Une promesse qu'une suite n'attend pas et qui échoue arrêtait le processus
   sans dire où. Elle compte comme un échec de la suite en cours. */
process.on("unhandledRejection", e => {
  echecs++;
  console.log(`    ECHEC  promesse non attendue dans ${suiteEnCours}  `
    + String(e && e.message || e).split("\n")[0]);
});

for (const [nom, charger] of choisies) {
  const mod = await charger();
  suiteEnCours = nom;
  let r = null;
  for (let tour = 1; !r; tour++) {
    const incidents = INCIDENTS.length, fins = FINS.length;
    try {
      r = nom === "bilan" ? mod.default() : await mod.default(navigateur);
    } catch (e) {
      const message = String(e && e.message || e).split("\n")[0];
      const lieu = (String(e && e.stack || "").split("\n").find(l => /outils\/essais\/(?!tous)/.test(l)) || "").trim();
      if (await perdu(navigateur)) {
        await new Promise(r => setTimeout(r, 500));
        const cause = "navigateur arrêté pendant la suite, " + direFin(FINS[fins]);
        navigateur = await lancer();
        if (tour === 1) {
          reprises.push(`${nom} : ${cause} (${message}, ${lieu})`);
          console.log(`\n[${nom}] ${cause}. Suite rejouée sur un navigateur neuf.`);
          continue;
        }
        r = { titre: nom, echecs: 1, lignes: [`    ECHEC  suite interrompue deux fois  ${cause}`, `           ${message}, ${lieu}`] };
      } else {
        const plantage = INCIDENTS.slice(incidents).find(i => i.quoi === "plantage du moteur de rendu");
        const cause = plantage ? `plantage du moteur de rendu, ${plantage.url}` : "exception de la suite";
        r = { titre: nom, echecs: 1, lignes: [`    ECHEC  suite interrompue  ${cause}`, `           ${message}, ${lieu}`] };
        // Les contextes laissés ouverts par la suite ne doivent pas peser sur les suivantes.
        await Promise.all(navigateur.contexts().map(c => c.close().catch(() => {})));
      }
    }
  }
  console.log("\n" + r.titre);
  r.lignes.forEach(l => console.log(l));
  echecs += r.echecs;
  controles += r.lignes.filter(l => /^\s{4}(ok|ECHEC)/.test(l)).length;
}

await navigateur.close();
serveur.close();

if (reprises.length) {
  console.log("\nSuites rejouées après la perte du navigateur :");
  reprises.forEach(l => console.log("  " + l));
}
console.log("\n" + controles + " contrôles joués, "
  + (echecs ? echecs + " en échec." : "aucun échec.")
  + (reprises.length ? ` ${reprises.length} ${reprises.length > 1 ? "suites rejouées" : "suite rejouée"}.` : ""));
process.exit(echecs ? 1 : 0);
