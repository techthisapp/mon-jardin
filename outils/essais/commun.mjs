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

/* Un catalogue tel qu'une version antérieure l'avait gardé en mémoire locale :
   les lignes n'y portent ni l'écartement chiffré ni le nom accepté, et la clé de
   fraîcheur est celle que la base rendra, si bien que rien ne pousse à relire.
   Seule la signature de forme peut faire écarter ce cache. */
export function cacheAncien() {
  const c = JSON.parse(CATALOGUE);
  const phases = {};
  c.phases.forEach(p => phases[p.key] = { label: p.label, color: p.color });
  const climats = {};
  (c.climates || []).forEach(x => climats[x.key] = x);
  const plantes = c.plants.map(p => ({
    id: p.id, slug: p.slug, nom: p.name, cat: p.category, typo: p.typology,
    espacement: p.spacing, prof: p.depth, assoc: p.companions, phases: p.phases || {},
    conseil: "", attr: {}, guide: {}, guide_periode: {},
    latin: p.latin || "", famille: p.family || "",
    port: p.habit || "", expo: p.exposure || "", eauNiv: p.water_need || "",
    nectar: p.nectar || "", pollen: p.pollen || "", gel: p.frost_min_c,
    hmin: p.height_min_cm, hmax: p.height_max_cm,
    couleurs: p.flower_colors || [], pic: p.floraison_pic_q,
    picNote: p.floraison_pic_note || "", article: p.nom_article || "",
    propagation: p.propagation || "",
  })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return JSON.stringify({ phases, plantes, climats, shifts: {}, saison: {},
                          empreinte: `${c.plants.length}|2026-07-31` });
}

export async function ouvrirContexte(navigateur, options = {}) {
  const {
    catalogue = CATALOGUE, releves = [], pluies = [], vigilance = [],
    glossaire = GLOSSAIRE, meteo = METEO, climat = null, photos = PHOTOS, jardin = null,
    session = true, cache = null, versionSite = null, espaces = null, placements = null,
    avis = null, sourdines = null, carnet = null, photosCarnet = null, cultures = null,
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
    /* Le jardin figé n'a pas d'espace : une suite qui contrôle le découpage en
       demande, sans quoi les autres verraient paraître des filtres d'espace
       qu'elles ne mesurent pas. */
    + (espaces ? `window.__ESPACES__ = ${JSON.stringify(espaces)};` : "")
    + (placements ? `window.__PLACEMENTS__ = ${JSON.stringify(placements)};` : "")
    + (avis ? `window.__AVIS__ = ${JSON.stringify(avis)};` : "")
    + (sourdines ? `window.__SOURDINES__ = ${JSON.stringify(sourdines)};` : "")
    + (carnet ? `window.__CARNET__ = ${JSON.stringify(carnet)};` : "")
    + (photosCarnet ? `window.__PHOTOS_CARNET__ = ${JSON.stringify(photosCarnet)};` : "")
    + (cultures ? `window.__CULTURES__ = ${JSON.stringify(cultures)};` : "")
    + (session ? "" : "window.__SANS_SESSION__ = 1;")
    // La clé est celle d'app.js : un cache posé ici imite une installation ancienne.
    + (cache ? `try { localStorage.setItem("monjardin.catalogue.v6", ${JSON.stringify(cache)}); } catch (e) {}` : "")
    + (climat ? `window.__CLIMAT__ = ${JSON.stringify(climat)};` : ""));
  await ctx.route(/vendor\/supabase\.js/, r => r.fulfill({ status: 200, contentType: "text/javascript", body: DOUBLURE }));
  /* Le numéro que le site sert est celui de l'agent de service. En donner un
     autre revient à mettre en ligne une version plus récente que la copie
     ouverte, ce qu'aucun autre moyen ne permet d'imiter dans un essai. */
  if (versionSite) {
    await ctx.route(/\/sw\.js(\?|$)/, r => r.fulfill({ status: 200,
      contentType: "text/javascript", body: `const VERSION = "${versionSite}";\n` }));
  }
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

/* Le catalogue est une bibliothèque à consulter : il se tient dans l'en-tête,
   sous le livre, quand la barre du bas ne porte que ce qui appartient au
   jardinier. Les suites qui parcourent le référentiel l'ouvrent là. */
export async function ouvrirListeDesPlantes(pg) {
  await pg.locator("#btnCatalogue").click();
  await pg.waitForTimeout(700);
}

/* Les plantes du jardin, quatrième fente de la barre. */
export async function ouvrirMesPlantes(pg) {
  await pg.locator('.onglet[data-ecran="plantes"]').dispatchEvent("click");
  await pg.waitForTimeout(700);
}

/* Les trois mesures du jour se lisent sur l'écran du jour, en trois colonnes,
   chacune ouvrant sa feuille. La feuille « Le jour » qui les réunissait a
   disparu, ses mesures étant descendues dans l'écran. */
export async function ouvrirMesure(pg, vue) {
  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(350);
  await pg.locator(`#blocTemps .mesure-j[data-vue="${vue}"]`).click();
  await pg.waitForTimeout(700);
}

/* La fente voisine, sur la même section : les espaces du jardin. */
export async function ouvrirMonJardin(pg) {
  await pg.locator('.onglet[data-ecran="selection"]').dispatchEvent("click");
  await pg.waitForTimeout(700);
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

/* Un geste tactile joué à la main, image par image. Playwright ne sait pas
   composer un glissement d'un doigt sur un élément précis : les évènements sont
   fabriqués et distribués sur la cible, comme le ferait un doigt réel. */
export async function glisserSurFeuille(pg, x, yDepart, yArrivee, pas = 8, delai = 16) {
  await pg.evaluate(([x, y]) => {
    const c = document.elementFromPoint(x, y);
    window.__cible__ = c;
    const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
    c.dispatchEvent(new TouchEvent("touchstart", { touches: [t], targetTouches: [t],
      changedTouches: [t], bubbles: true, cancelable: true }));
  }, [x, yDepart]);
  const sens = yArrivee >= yDepart ? 1 : -1;
  for (let y = yDepart; sens > 0 ? y <= yArrivee : y >= yArrivee; y += sens * pas) {
    await pg.evaluate(([x, y]) => {
      const c = window.__cible__;
      const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
      c.dispatchEvent(new TouchEvent("touchmove", { touches: [t], targetTouches: [t],
        changedTouches: [t], bubbles: true, cancelable: true }));
    }, [x, y]);
    await pg.waitForTimeout(delai);
  }
  await pg.evaluate(([x, y]) => {
    const c = window.__cible__;
    const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
    c.dispatchEvent(new TouchEvent("touchend", { touches: [], targetTouches: [],
      changedTouches: [t], bubbles: true, cancelable: true }));
  }, [x, yArrivee]);
  await pg.waitForTimeout(450);
}

/* L'écran d'un espace ne montre que ce qui se regarde : les gestes sur chaque
   plante attendent derrière le bouton de coin, dans Modifier les plantes. */
export async function ouvrirMenuEspace(pg) {
  if (!await pg.locator("#detailEspace .menu-lieu").count()) {
    await pg.locator("#menuEspace").click();
    await pg.waitForTimeout(300);
  }
}

export async function entrerEnEdition(pg) {
  if (await pg.locator("#detailEspace .ligne-editee").count()) return;
  await ouvrirMenuEspace(pg);
  await pg.locator('.menu-lieu [data-act="editer"]').click();
  await pg.waitForTimeout(400);
}

export async function ongletIdentite(pg) {
  await pg.locator('.f-onglets button[data-pan="identite"]').dispatchEvent("click");
  await pg.waitForTimeout(350);
}
