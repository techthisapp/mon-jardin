/* Socle commun des essais de bout en bout.
   Chaque suite reçoit un contexte de navigateur déjà câblé : la doublure
   Supabase à la place du client réel, les données figées à la place du réseau,
   et une horloge calée sur une date fixe pour que les contrôles qui dépendent
   de la saison ne changent pas de résultat au fil de l'année. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ICI = dirname(fileURLToPath(import.meta.url));
export const ADRESSE = "http://127.0.0.1:8099/index.html";

// Le 2 août 2026 à neuf heures. Toutes les fenêtres de tâches, les relevés de
// pluie et les bulletins de vigilance des données figées sont calés sur ce jour.
export const JOUR_FIGE = new Date("2026-08-02T09:00:00+02:00").getTime();

const lire = nom => readFileSync(join(ICI, "donnees", nom), "utf8");
export const CATALOGUE = lire("catalogue.json");
export const METEO = lire("meteo.json");
export const GLOSSAIRE = lire("glossaire.json");
export const PHOTOS = lire("photos.json");
export const PRODUCTION = JSON.parse(lire("plantes-production.json"));
const DOUBLURE = readFileSync(join(ICI, "doublure.mjs"), "utf8");

/* Le catalogue figé porte l'ensemble des plantes. Les suites qui contrôlent le
   rendu d'une fiche lui substituent les lignes réelles de production, seules à
   porter les usages, les notes de couleur et les conseils par période. */
export function catalogueAvecProduction() {
  const c = JSON.parse(CATALOGUE);
  c.plants = PRODUCTION;
  return JSON.stringify(c);
}

/* Décalage constant plutôt qu'horloge arrêtée : les minuteries de l'interface
   continuent de tourner, seule la date de départ change. */
const scriptHorloge = `(() => {
  const Vrai = Date, ecart = ${JOUR_FIGE} - Vrai.now();
  function Fige(...a) { return a.length ? new Vrai(...a) : new Vrai(Vrai.now() + ecart); }
  Fige.now = () => Vrai.now() + ecart;
  Fige.parse = Vrai.parse; Fige.UTC = Vrai.UTC; Fige.prototype = Vrai.prototype;
  window.Date = Fige;
})();`;

export async function ouvrirContexte(navigateur, options = {}) {
  const {
    catalogue = CATALOGUE, releves = [], pluies = [], vigilance = [],
    glossaire = GLOSSAIRE, meteo = METEO, climat = null, photos = PHOTOS, jardin = null,
    session = true,
  } = options;
  // L'agent de service intercepterait les réponses de la doublure d'une page à
  // l'autre : les essais s'exécutent sans lui.
  const ctx = await navigateur.newContext({ viewport: { width: 430, height: 940 },
                                            deviceScaleFactor: 2, serviceWorkers: "block",
                                            timezoneId: "Europe/Paris", locale: "fr-FR" });
  await ctx.addInitScript(scriptHorloge);
  await ctx.addInitScript(`window.__FIXTURES__ = ${catalogue};`
    + `window.__RELEVES__ = ${JSON.stringify(releves)};`
    + `window.__PLUIES__ = ${JSON.stringify(pluies)};`
    + `window.__VIGILANCE__ = ${JSON.stringify(vigilance)};`
    + `window.__GLOSSAIRE__ = ${glossaire};`
    + `window.__PHOTOS__ = ${photos};`
    + (jardin ? `window.__JARDIN__ = ${JSON.stringify(jardin)};` : "")
    + (session ? "" : "window.__SANS_SESSION__ = 1;")
    + (climat ? `window.__CLIMAT__ = ${JSON.stringify(climat)};` : ""));
  await ctx.route(/vendor\/supabase\.js/, r => r.fulfill({ status: 200, contentType: "text/javascript", body: DOUBLURE }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  /* Les photographies vivent chez leur fonds : la doublure en sert une, d'un
     seul point, pour que la fiche ne parte pas sur le réseau. */
  await ctx.route(/bs\.plantnet\.org|upload\.wikimedia\.org/, r => r.fulfill({
    status: 200, contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=", "base64"),
  }));
  await ctx.route(/api\.open-meteo\.com/, route => {
    const d = JSON.parse(meteo);
    if (route.request().url().includes("hourly=")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hourly: d.hourly }) });
    }
    delete d.hourly;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(d) });
  });
  const pg = await ctx.newPage();
  const erreurs = [];
  pg.on("pageerror", e => erreurs.push("exception : " + e.message));
  pg.on("console", m => { if (m.type() === "error") erreurs.push(m.text().slice(0, 170)); });
  await pg.goto(ADRESSE);
  await pg.waitForTimeout(2800);
  return { ctx, pg, erreurs };
}

/* Un journal par suite. Les contrôles s'écrivent au fil de l'exécution, le
   décompte des échecs remonte au lanceur. */
export function journal(titre) {
  const lignes = [];
  let echecs = 0;
  return {
    titre,
    section(nom) { lignes.push("  " + nom); },
    controle(nom, vrai, detail) {
      if (!vrai) echecs++;
      lignes.push((vrai ? "    ok   " : "    ECHEC") + "  " + nom + (detail ? "  " + detail : ""));
    },
    fin(erreurs = []) {
      erreurs.slice(0, 3).forEach(e => { echecs++; lignes.push("    ECHEC  erreur de page  " + e); });
      return { titre, echecs, lignes };
    },
  };
}

export const net = s => String(s || "").replace(/\s+/g, " ").trim();
export const nombre = s => Number(String(s).replace(",", ".").replace(/[^0-9.-]/g, ""));

/* Les rangées de plantes sont une destination de plein droit : le bouton rond
   au milieu de la barre du bas y mène. */
export async function ouvrirListeDesPlantes(pg) {
  await pg.locator('.onglet[data-ecran="selection"]').dispatchEvent("click");
  await pg.waitForTimeout(900);
}

export async function ouvrirFiche(pg, nom) {
  const motif = new RegExp("^" + nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  await pg.locator(".nom-plante", { hasText: motif }).first().dispatchEvent("click");
  await pg.waitForTimeout(700);
}

export async function fermerFiche(pg) {
  await pg.locator("#fermerFeuille").dispatchEvent("click");
  await pg.waitForTimeout(350);
}

export async function ongletAnnee(pg) {
  await pg.locator('.f-onglets button[data-pan="annee"]').dispatchEvent("click");
  await pg.waitForTimeout(350);
}

export async function ongletIdentite(pg) {
  await pg.locator('.f-onglets button[data-pan="identite"]').dispatchEvent("click");
  await pg.waitForTimeout(350);
}
