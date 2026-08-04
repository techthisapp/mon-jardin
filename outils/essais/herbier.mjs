/* Feuille d'herbier de l'écran du moment. Les contrôles portent sur ce qui ne
   se voit pas au premier coup d'oeil : le fond arrive après le contenu et ne
   coûte rien au démarrage, il se recompose quand la page grandit, il ne bouge
   jamais, les blocs le laissent deviner sans perdre leur lisibilité, et chaque
   ligne de geste porte la planche d'une plante qu'elle nomme. */
import { ouvrirContexte, journal } from "./commun.mjs";

export default async function essai(navigateur) {
  const j = journal("Feuille d'herbier");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

  j.section("le papier porte son grain et sa prairie");
  const fond = await pg.evaluate(() => {
    const sec = document.getElementById("ec-maintenant");
    const av = getComputedStyle(document.body);
    const z = document.getElementById("prairie");
    const cadre = z.getBoundingClientRect();
    return {
      grain: (av.backgroundImage.match(/url\(/g) || []).length,
      pleine: Math.round(cadre.left) <= 0 && Math.round(cadre.right) >= window.innerWidth,
      items: z ? z.childElementCount : 0,
      traces: z ? z.querySelectorAll("path,circle,ellipse").length : 0,
      hauteur: sec.offsetHeight,
      dessous: Number(getComputedStyle(z).zIndex) < Number(getComputedStyle(document.getElementById("vueEnsemble")).zIndex),
    };
  });
  /* Le grain est sur le fond de la page, non sur une section : posé sur la
     section, il s'arrêtait à ses marges et laissait un cadre blanc de seize
     points sur trois côtés. */
  j.controle("le papier de la page porte deux bruits, sans image à charger",
    fond.grain === 2, fond.grain);
  j.controle("la prairie va d'un bord à l'autre de l'écran", fond.pleine);
  j.controle("la prairie est posée", fond.items > 0, fond.items + " dessins");
  j.controle("elle tient la hauteur de la page",
    fond.items >= Math.floor((fond.hauteur - 200) / 230), fond.hauteur + " px");
  j.controle("elle est détaillée", fond.traces > 200, fond.traces + " tracés");
  j.controle("elle passe sous le contenu", fond.dessous);

  /* Un dessin qui mord sur le bord droit ne doit jamais rendre la page
     glissante de côté : une gouttière apparaîtrait à droite, sur tous les
     écrans, y compris le bandeau. */
  j.section("rien ne dépasse de la page");
  const debord = await pg.evaluate(() => {
    const doc = document.documentElement;
    const sortis = [];
    // Un élément qui dépasse n'est un défaut que si rien ne le rogne : le rail
    // des fleurs déborde par construction, il défile dans son propre cadre.
    const rogne = e => {
      for (let p = e.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (/auto|scroll|hidden|clip/.test(o.overflowX)) return true;
      }
      return false;
    };
    document.querySelectorAll("#vueEnsemble *, .tete *").forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width && (r.right > window.innerWidth + 1 || r.left < -1) && !rogne(e)) {
        sortis.push((e.tagName + "." + (e.getAttribute("class") || "")).slice(0, 30));
      }
    });
    return { large: doc.scrollWidth, vue: window.innerWidth,
      corps: document.body.scrollWidth, sortis: sortis.slice(0, 4) };
  });
  j.controle("la page n'est pas plus large que la vue",
    debord.large <= debord.vue, debord.large + " px sur " + debord.vue);
  j.controle("le corps non plus", debord.corps <= debord.vue, debord.corps + " px");
  j.controle("aucun élément du contenu ne sort du cadre", debord.sortis.length === 0,
    debord.sortis.join(" | "));
  const rogne = await pg.evaluate(() => {
    const p = getComputedStyle(document.getElementById("prairie"));
    const sec = getComputedStyle(document.getElementById("ec-maintenant"));
    return { chemin: p.clipPath, deborde: p.overflow, section: sec.overflow };
  });
  j.controle("la prairie est rognée deux fois",
    rogne.chemin !== "none" && /hidden|clip/.test(rogne.deborde),
    rogne.deborde + ", " + rogne.chemin);
  j.controle("la section, elle, ne rogne rien", rogne.section === "visible", rogne.section);
  const tourne = await pg.evaluate(() => {
    const e = document.querySelector(".pr-i");
    return e ? getComputedStyle(e).transform : "aucun";
  });
  j.controle("aucun dessin du fond n'est composé par une transformation",
    tourne === "none" || tourne === "aucun", tourne);

  j.section("le fond ne coûte rien au démarrage");
  const appels = await pg.evaluate(() =>
    performance.getEntriesByType("resource")
      .filter(e => /\/motifs\/\d+\.svg$/.test(e.name))
      .sort((a, b) => a.startTime - b.startTime)
      .map(e => e.name.split("/").pop()));
  const mois = await pg.evaluate(() => new Date().getMonth() + 1);
  j.controle("le mois affiché est demandé le premier", appels[0] === `${mois}.svg`, appels[0]);
  j.controle("les onze autres suivent, pour le fond", appels.length === 12, appels.length);
  const retard = await pg.evaluate(() => {
    const r = performance.getEntriesByType("resource");
    const style = r.find(e => /styles\.css/.test(e.name));
    const fonds = r.filter(e => /\/motifs\/\d+\.svg$/.test(e.name));
    if (!style || !fonds.length) return null;
    return Math.round(Math.min(...fonds.map(e => e.startTime)) - style.startTime);
  });
  j.controle("aucun n'est demandé avant la feuille de style", retard === null || retard > 0,
    retard + " ms après");

  j.section("le fond ne bouge pas");
  const anime = await pg.evaluate(() => document.getAnimations()
    .filter(a => a.effect && a.effect.target && a.effect.target.closest
      && a.effect.target.closest("#prairie")).length);
  j.controle("aucune animation dans la prairie", anime === 0, anime);

  j.section("les blocs laissent deviner ce qui est imprimé dessous");
  const blocs = await pg.evaluate(() => {
    const f = getComputedStyle(document.querySelector(".synthese")).backgroundColor;
    const a = f.match(/rgba?\([^)]*?([\d.]+)\)/);
    const t = getComputedStyle(document.querySelector(".syn-tete")).color;
    return { fond: f, alpha: a && f.startsWith("rgba") ? Number(a[1]) : 1, encre: t };
  });
  j.controle("la synthèse est translucide", blocs.alpha > .55 && blocs.alpha < .85, blocs.fond);
  j.controle("son texte reste à pleine encre", blocs.encre === "rgb(22, 36, 30)", blocs.encre);

  j.section("chaque ligne de geste porte une plante");
  const lignes = await pg.evaluate(() => {
    const l = [...document.querySelectorAll(".syn-ligne:not(.syn-plus)")];
    return { total: l.length,
      planches: l.filter(e => e.querySelector(".v-planche")).length,
      pictos: l.filter(e => e.querySelector(".syn-pt")).length };
  });
  j.controle("toutes portent une vignette ou un picto",
    lignes.planches + lignes.pictos === lignes.total,
    lignes.planches + " planches, " + lignes.pictos + " pictos sur " + lignes.total);
  j.controle("la planche l'emporte quand la plante en a une", lignes.planches >= 4,
    lignes.planches);

  j.section("ce qui fleurit se montre");
  const fleur = await pg.evaluate(() => {
    const z = document.getElementById("carteFleur");
    return { visible: !z.hidden, nb: z.querySelectorAll(".fl-i").length,
      planches: z.querySelectorAll(".fl-i .v-planche").length,
      avant: z.compareDocumentPosition(document.getElementById("synthese"))
             & Node.DOCUMENT_POSITION_FOLLOWING ? true : false,
      compte: (document.querySelector(".syn-pied") || {}).textContent || "" };
  });
  j.controle("la bande est là, en tête de l'écran", fleur.visible && fleur.avant);
  j.controle("elle montre huit planches au plus", fleur.nb > 0 && fleur.nb <= 8, fleur.nb);
  j.controle("chacune porte sa planche", fleur.planches === fleur.nb, fleur.planches);
  j.controle("le compte des fleurs ne se répète pas sous la bande",
    !/plantes? (sont|est) en fleur/.test(fleur.compte), fleur.compte.slice(0, 60));
  await pg.locator("#carteFleur .fl-i").first().click();
  await pg.waitForTimeout(700);
  const titre = (await pg.locator("#feuille-titre").innerText()).split("\n")[0];
  j.controle("une planche ouvre la fiche de sa plante", titre.length > 2, titre);
  await pg.goBack();
  await pg.waitForTimeout(500);

  j.section("le dicton ferme la page");
  const dic = await pg.locator("#dicton").innerText();
  j.controle("il est posé et cité", /^«.+»$/.test(dic.trim()), dic.slice(0, 60));
  const quinz = await pg.evaluate(() => {
    const d = new Date();
    return d.getMonth() * 2 + (d.getDate() <= 15 ? 1 : 2);
  });
  j.controle("il change à chaque quinzaine", quinz >= 1 && quinz <= 24, "quinzaine " + quinz);

  await ctx.close();
  return j.fin(erreurs);
}
