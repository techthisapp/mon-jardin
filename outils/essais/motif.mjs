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

  /* Le fond de l'écran du moment demande les onze autres mois, après le rendu.
     Le contrôle porte donc sur l'ordre : le mois affiché passe le premier, seul
     à compter pour le premier affichage. */
  const demandes = await pg.evaluate(() =>
    performance.getEntriesByType("resource").filter(e => /\/motifs\/\d+\.svg$/.test(e.name))
      .sort((a, b) => a.startTime - b.startTime).map(e => e.name));
  const mois = await pg.evaluate(() => new Date().getMonth() + 1);
  j.controle("le mois affiché est demandé le premier",
    demandes[0] && demandes[0].endsWith(`/motifs/${mois}.svg`),
    demandes[0] ? demandes[0].split("/").pop() : "aucun");
  j.controle("les autres viennent après, pour le fond", demandes.length === 12, demandes.length);

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

  /* Un mouvement joué sous la ligne de coupe du bandeau ne se voit pas : le
     bandeau masque tout ce qui dépasse. Chaque élément animé doit donc être
     visible pour l'essentiel de sa hauteur, sans quoi l'animation est perdue. */
  j.section("les animations se jouent dans la partie visible");
  const champ = await pg.evaluate(async () => {
    const h = document.getElementById("motifMois");
    const classes = ["vent", "souffle", "respire", "eclot", "ouvre", "spirale",
                     "pollen", "chute", "envol"];
    const bilan = { coupe: 0, total: 0, perdus: [] };
    for (let m = 1; m <= 12; m++) {
      h.innerHTML = await (await fetch(`./motifs/${m}.svg`)).text();
      const svg = h.querySelector("svg");
      const g = svg.querySelector("g");
      const dy = Number((g.getAttribute("transform").match(/-?\d+/g) || [0, 0])[1]);
      const cadre = h.getBoundingClientRect();
      const tete = document.querySelector(".tete").getBoundingClientRect();
      const parUnite = cadre.height / 220;
      // Le contrôle se fait sur la coupe la plus basse, celle d'un écran de
      // trois cent soixante points, pour ne pas valider un cas favorable.
      bilan.coupe = Math.min(200, Math.round((tete.bottom - cadre.top) / parUnite));
      svg.querySelectorAll(classes.map(c => "." + c).join(",")).forEach(e => {
        bilan.total++;
        const b = e.getBBox();
        const haut = b.y + dy, bas = b.y + b.height + dy;
        const vu = Math.max(0, Math.min(bilan.coupe, bas) - haut);
        if (b.height > 0 && vu / b.height < .70) {
          bilan.perdus.push(m + " " + (e.getAttribute("class") || "").split(" ")[0]
            + " " + Math.round(haut) + ".." + Math.round(bas));
        }
      });
    }
    return bilan;
  });
  j.controle("la ligne de coupe laisse voir presque toute la vue",
    champ.coupe >= 200, champ.coupe + " unités sur 220");
  j.controle("aucune animation des douze mois ne se joue hors champ", champ.perdus.length === 0,
    champ.perdus.length ? champ.perdus.join(" | ") : champ.total + " éléments animés, tous visibles");

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
