/* Recette du fond vivant et de l'interface de verre.
   Sert l'application sur le port des essais, sur les données figées, et pour
   chaque saison, à trois largeurs de téléphone, mesure ce qui tombe et s'il
   bouge vraiment, la place de la branche, la cadence d'affichage, le
   débordement de côté, la tenue des titres collés et le contraste des textes
   sur le verre. Photographie ensuite chaque écran en été.

   Emploi : node outils/audit/recette-ambiance.mjs <dossier de sortie>
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
const JARDIN = PLANTES.slice(0, 17).map(p => p.id);
const ESPACES = [{ id: "e1", name: "Potager", surface_m2: 40 }, { id: "z1", name: "Carré du fond", parent_id: "e1" }];
const PLACEMENTS = PLANTES.slice(0, 10).map((p, i) => ({ plant_id: p.id, espace_id: i % 2 ? "e1" : "z1" }));
const SAISONS = [
  ["printemps", "2026-04-15T09:00:00+02:00"], ["ete", "2026-08-02T13:00:00+02:00"],
  ["automne", "2026-10-15T19:00:00+02:00"], ["hiver", "2026-01-10T22:00:00+01:00"],
];
const LARGEURS = [320, 393, 430];

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM });
const rapport = [];

const mesurer = pg => pg.evaluate(async () => {
  const z = document.getElementById("ambiance");
  const chute = [...z.querySelectorAll(".am-feuille, .am-flocon")];
  const pos = () => chute.map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top]; });
  const avant = pos();
  // Cadence : images comptées pendant une seconde et demie.
  let images = 0;
  const t0 = performance.now();
  await new Promise(r => { const pas = () => { images++; performance.now() - t0 < 1500 ? requestAnimationFrame(pas) : r(); }; requestAnimationFrame(pas); });
  const apres = pos();
  const bouge = apres.filter((p, i) => Math.hypot(p[0] - avant[i][0], p[1] - avant[i][1]) > 2).length;
  const b = z.querySelector(".am-branche").getBoundingClientRect();
  const W = innerWidth, H = innerHeight;
  // Contraste du texte de la synthèse sur son verre, posé sur le ton du fond.
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, bl]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(bl); };
  const base = rgb(getComputedStyle(z).backgroundColor);
  const contraste = sel => {
    const e = document.querySelector(sel);
    if (!e) return null;
    let bloc = e; while (bloc && !/rgba/.test(getComputedStyle(bloc).backgroundColor)) bloc = bloc.parentElement;
    const f = bloc ? rgb(getComputedStyle(bloc).backgroundColor) : [251, 250, 247, 1];
    const a = f[3] ?? 1;
    const mix = [0, 1, 2].map(i => f[i] * a + base[i] * (1 - a));
    const t = rgb(getComputedStyle(e).color);
    const L1 = lum(t), L2 = lum(mix);
    return +((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05)).toFixed(2);
  };
  return {
    saison: z.dataset.saison, heure: z.dataset.heure, meteo: z.dataset.meteo,
    chute: chute.length, bouge, opacites: chute.map(e => +getComputedStyle(e).opacity).slice(0, 4),
    tailles: chute.map(e => Math.round(e.getBoundingClientRect().width)).slice(0, 4),
    branche: { gauche: Math.round(b.left), haut: Math.round(b.top), large: Math.round(b.width),
      // Une branche entièrement hors de l'écran passait ce contrôle : sa
      // partie visible doit commencer en haut et descendre d'au moins 150 points.
      enHautADroite: b.left + b.width / 2 > W * .6 && b.top < H * .1 && b.bottom > 150
        && b.right > W - 20 },
    images: Math.round(images / 1.5),
    debord: document.documentElement.scrollWidth > W + 1,
    contrastes: { phrase: contraste(".syn-tete"), ligne: contraste(".syn-ligne .l"),
      titre: contraste(".synthese .bloc-titre"), date: contraste("#dateJour") },
  };
});

for (const [nom, quand] of SAISONS) {
  for (const L of LARGEURS) {
    const { ctx, pg, erreurs } = await ouvrirContexte(nav, { jardin: JARDIN, espaces: ESPACES,
      placements: PLACEMENTS, jour: new Date(quand).getTime() });
    await pg.setViewportSize({ width: L, height: L < 360 ? 640 : 852 });
    await pg.waitForTimeout(1200);
    const m = await mesurer(pg);
    if (L === 393) await pg.screenshot({ path: join(SORTIE, `jour-${nom}.png`) });
    // Titre collé : la synthèse défilée de 120 points sous le haut de l'écran.
    const colle = await pg.evaluate(async () => {
      const s = document.querySelector(".synthese"), t = s && s.querySelector(".bloc-titre");
      if (!t) return null;
      window.scrollTo(0, s.getBoundingClientRect().top + scrollY + 120);
      await new Promise(r => setTimeout(r, 200));
      return Math.round(t.getBoundingClientRect().top);
    });
    if (L === 393) await pg.screenshot({ path: join(SORTIE, `jour-${nom}-defile.png`) });
    rapport.push({ saison: nom, largeur: L, ...m, titreColleA: colle, erreurs: erreurs.slice(0, 3) });
    console.log(nom.padEnd(10), L, JSON.stringify({ chute: m.chute, bouge: m.bouge, op: m.opacites[0],
      branche: m.branche.enHautADroite, images: m.images, debord: m.debord, colle, c: m.contrastes }));
    await ctx.close();
  }
}

// Les écrans, en été.
const { ctx, pg, erreurs } = await ouvrirContexte(nav, { jardin: JARDIN, espaces: ESPACES, placements: PLACEMENTS });
await pg.setViewportSize({ width: 393, height: 852 });
await pg.waitForTimeout(1000);
const ecrans = [["annee", '.onglet[data-ecran="planning"]'], ["jardin", '.onglet[data-ecran="selection"]'],
  ["plantes", '.onglet[data-ecran="plantes"]'], ["catalogue", "#btnCatalogue"]];
for (const [n, sel] of ecrans) {
  await pg.locator(sel).first().dispatchEvent("click");
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: join(SORTIE, `ecran-${n}.png`) });
  await pg.evaluate(() => window.scrollTo(0, 700));
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: join(SORTIE, `ecran-${n}-defile.png`) });
  await pg.evaluate(() => window.scrollTo(0, 0));
}
await pg.locator('.onglet[data-ecran="plantes"]').dispatchEvent("click");
await pg.waitForTimeout(600);
await pg.locator("#listes .item").first().click();
await pg.waitForTimeout(900);
await pg.screenshot({ path: join(SORTIE, "fiche.png") });
const fiche = await pg.evaluate(() => getComputedStyle(document.getElementById("feuille")).backgroundColor);
rapport.push({ fiche, erreursEcrans: erreurs.slice(0, 3) });
console.log("fond de la fiche", fiche, "erreurs", erreurs.length);
await ctx.close();

await writeFile(join(SORTIE, "recette.json"), JSON.stringify(rapport, null, 2));
await nav.close(); serveur.close();
