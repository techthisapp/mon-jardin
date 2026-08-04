/* Motif d'entête, un dessin par mois. Les contrôles portent sur ce qui ne se
   voit pas au premier coup d'oeil : le dessin appelé est celui du mois affiché,
   il arrive après le premier rendu et non pendant, les douze fichiers existent
   et sont mis en cache par l'agent de service, le texte du bandeau reste
   au-dessus du dessin, et le mouvement s'arrête quand le système le demande. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ouvrirContexte, journal, ICI } from "./commun.mjs";

const RACINE = join(ICI, "..", "..");
const lire = f => readFileSync(join(RACINE, f), "utf8");

export default async function essai(navigateur) {
  const j = journal("Motif d'entête");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

  j.section("le dessin du mois est posé dans le bandeau");
  const pose = await pg.evaluate(() => {
    const h = document.getElementById("motifMois");
    const svg = h && h.querySelector("svg");
    return { present: !!svg, boites: h ? h.querySelectorAll("path,circle,ellipse").length : 0 };
  });
  j.controle("le bandeau porte un dessin", pose.present);
  j.controle("le dessin est détaillé", pose.boites > 100, pose.boites + " tracés");

  const demandes = await pg.evaluate(() =>
    performance.getEntriesByType("resource").filter(e => /\/motifs\/\d+\.svg$/.test(e.name)).map(e => e.name));
  j.controle("un seul mois est demandé, pas les douze", demandes.length === 1, demandes.length);
  const mois = await pg.evaluate(() => new Date().getMonth() + 1);
  j.controle("c'est celui du mois affiché", demandes[0] && demandes[0].endsWith(`/motifs/${mois}.svg`),
    demandes[0] ? demandes[0].split("/").pop() : "aucun");

  j.section("le dessin n'est pas sur le chemin critique");
  const ordre = await pg.evaluate(() => {
    const r = performance.getEntriesByType("resource");
    const motif = r.find(e => /\/motifs\/\d+\.svg$/.test(e.name));
    const style = r.find(e => /styles\.css/.test(e.name));
    return motif && style ? Math.round(motif.startTime - style.startTime) : null;
  });
  j.controle("il est demandé après la feuille de style", ordre === null || ordre > 0, ordre + " ms après");

  j.section("les douze fichiers existent et sont mis en cache");
  const servis = await pg.evaluate(async () => {
    const codes = [];
    for (let m = 1; m <= 12; m++) codes.push((await fetch(`./motifs/${m}.svg`)).status);
    return codes;
  });
  j.controle("les douze sont servis", servis.every(c => c === 200), servis.filter(c => c === 200).length + " sur 12");
  const sw = lire("sw.js");
  const manquants = [];
  for (let m = 1; m <= 12; m++) if (!sw.includes(`"./motifs/${m}.svg"`)) manquants.push(m);
  j.controle("l'agent de service les déclare tous", manquants.length === 0,
    manquants.length ? "absents : " + manquants.join(", ") : "douze déclarés");

  j.section("le texte reste au premier plan");
  const plans = await pg.evaluate(() => {
    const m = getComputedStyle(document.getElementById("motifMois")).zIndex;
    const c = getComputedStyle(document.querySelector(".tete-corps")).zIndex;
    const h = document.querySelector(".tete h1").getBoundingClientRect();
    const dessus = document.elementFromPoint(h.left + 4, h.top + h.height / 2);
    return { m, c, titre: dessus ? dessus.closest("h1") !== null : false };
  });
  j.controle("le dessin est sous le corps du bandeau", Number(plans.m) < Number(plans.c),
    `motif ${plans.m}, corps ${plans.c}`);
  j.controle("le titre reste cliquable au-dessus du dessin", plans.titre);

  j.section("le mouvement respecte le réglage du système");
  const anime = await pg.evaluate(() =>
    document.getAnimations().filter(a => a.effect.target.closest && a.effect.target.closest(".motif-mois")).length);
  j.controle("le dessin est animé", anime >= 8, anime + " animations");
  await pg.emulateMedia({ reducedMotion: "reduce" });
  await pg.waitForTimeout(200);
  const calme = await pg.evaluate(() =>
    document.getAnimations().filter(a => a.effect.target.closest && a.effect.target.closest(".motif-mois")).length);
  j.controle("aucune animation quand le système demande moins de mouvement", calme === 0, calme);
  await ctx.close();

  return j.fin(erreurs);
}
