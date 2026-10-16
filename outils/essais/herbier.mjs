/* Écran du moment. Les contrôles portent sur ce qui ne se voit pas au premier
   coup d'oeil : rien ne dépasse de la page, les blocs laissent deviner le fond
   sans perdre leur lisibilité, et chaque ligne de geste porte la planche d'une
   plante qu'elle nomme. Le papier tramé et la prairie qu'on contrôlait ici ont
   cédé la place au fond vivant le 16 octobre 2026 ; ses contrôles sont dans
   `ambiance.mjs`. */
import { ouvrirContexte, journal } from "./commun.mjs";

export default async function essai(navigateur) {
  const j = journal("Feuille d'herbier");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

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
  j.section("les blocs laissent deviner le fond");
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
      apres: z.compareDocumentPosition(document.getElementById("synthese"))
             & Node.DOCUMENT_POSITION_PRECEDING ? true : false,
      compte: (document.querySelector(".syn-pied") || {}).textContent || "" };
  });
  /* Elle suit le travail au lieu de le précéder depuis le 14 octobre 2026 :
     posée avant la synthèse, elle repoussait la première tâche aux deux
     tiers de l'écran. */
  j.controle("la bande est là, sous la synthèse des tâches", fleur.visible && fleur.apres);
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

  /* Deux cent onze jours de l'année portent un dicton propre à leur date, les
     autres prennent celui de leur quinzaine. Le repli est écrit tout de suite,
     le dicton daté le remplace quand le fichier arrive. */
  j.section("le dicton ferme la page");
  const dic = (await pg.locator("#dicton").innerText()).trim();
  j.controle("il est posé et cité", /^«.+»$/.test(dic), dic.slice(0, 60));
  const table = await pg.evaluate(async () => {
    const r = await fetch("./dictons.json");
    if (!r.ok) return null;
    const t = await r.json();
    const d = new Date();
    const cle = String(d.getMonth() + 1).padStart(2, "0")
      + "-" + String(d.getDate()).padStart(2, "0");
    return { nb: Object.keys(t).length, ici: t[cle] || null,
      quinz: d.getMonth() * 2 + (d.getDate() <= 15 ? 1 : 2),
      cles: Object.keys(t).every(k => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(k)) };
  });
  j.controle("le fichier des dictons est servi et complet",
    table && table.nb === 211, table && table.nb);
  j.controle("toutes ses clés sont des dates valides", table && table.cles);
  j.controle("le texte affiché est celui de la date, ou celui de la quinzaine",
    table && (table.ici ? dic === "« " + table.ici + " »" : /^«.+»$/.test(dic)),
    table && (table.ici ? "daté" : "repli de la quinzaine " + table.quinz));
  const declare = await pg.evaluate(async () =>
    (await (await fetch("./sw.js")).text()).includes('"./dictons.json"'));
  j.controle("l'agent de service le déclare, pour le hors réseau", declare);

  await ctx.close();
  return j.fin(erreurs);
}
