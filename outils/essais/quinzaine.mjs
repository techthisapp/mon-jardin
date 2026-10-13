/* Les deux bords de la quinzaine. La synthèse dit ce qui se ferme par sa
   phrase de tête, « avant la fin de la quinzaine », et par la marque
   « · dernière quinzaine » sur les lignes. Ce qui vient de s'ouvrir se dit par
   la marque « · 1ère quinzaine » sur chaque ligne concernée.

   Une seconde phrase, « Première quinzaine pour… », redisait jusqu'au
   12 octobre 2026 ce que portaient les lignes, et ouvrait un niveau propre.
   Elle a disparu avec ce niveau. Le bord qui se ferme reste un lien : il ouvre
   son niveau, toutes tâches confondues, qui ne montre que les actions de ce
   bord. Les contrôles portent sur les phrases rendues, sur les marques de
   ligne, et sur le contenu du niveau, qui doit se recouper avec ce que la
   synthèse annonce. */
import { ouvrirContexte, journal, net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
/* Soixante plantes au deux août : la quinzaine ouvre cinq tâches et en ferme
   deux, de quoi éprouver la phrase de tête comme les marques de ligne. */
const LARGE = PLANTES.slice(0, 60).map(p => p.id);
// Douze plantes : rien ne se ferme, la phrase de tête perd son échéance.
const ETROIT = PLANTES.slice(0, 12).map(p => p.id);

const lignes = pg => pg.locator(".syn-ligne").allInnerTexts().then(l => l.map(net));

export default async function essai(navigateur) {
  const j = journal("Bords de la quinzaine");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur, { jardin: LARGE });
  await pg.waitForTimeout(700);

  j.section("une seule phrase, celle des échéances");
  const tete = net(await pg.locator(".syn-tete").innerText());
  j.controle("la tête garde son échéance",
    tete.endsWith("avant la fin de la quinzaine."), tete);
  j.controle("la phrase des ouvertures a disparu",
    await pg.locator(".syn-neuf").count() === 0);
  j.controle("les lignes suivent directement la tête",
    await pg.evaluate(() => {
      const t = document.querySelector(".syn-tete");
      const l = document.querySelector(".syn-lignes");
      return t.nextElementSibling === l;
    }));

  /* L'eau du jour se lisait trois fois : la tuile, l'alerte de chaleur et le
     pied de la synthèse. La tuile la garde, le pied ne la redit plus quand la
     météo est là. */
  j.section("l'eau ne se dit qu'à sa tuile");
  const tuileEau = net(await pg.locator('#blocTemps .mesure-j[data-vue="eau"]').innerText());
  j.controle("la tuile porte la quantité", /L\/m²/.test(tuileEau), tuileEau);
  const pied = net(await pg.locator(".synthese").innerText());
  j.controle("la synthèse ne la redit pas", !/arroser|litres par m²/i.test(pied), pied.slice(-120));

  /* Chaque ligne dont une plante entre dans sa fenêtre en porte la marque : la
     phrase ne la nomme plus à sa place. Ce qui se ferme prime, une ligne n'a
     qu'une marque. */
  j.section("les marques de ligne disent ce qui s'ouvre");
  const l = await lignes(pg);
  const marquees = l.filter(t => t.includes("1ère quinzaine"));
  j.controle("les trois tâches que la phrase nommait portent la marque",
    ["Tailler", "Multiplier", "Semer"].every(v =>
      marquees.some(t => t.startsWith(v))), marquees.join(" | "));
  j.controle("aucune ligne ne porte les deux marques",
    !l.some(t => t.includes("1ère quinzaine") && t.includes("dernière quinzaine")),
    l.join(" | "));

  j.section("le bord qui se ferme reste un lien");
  const bords = await pg.locator("button.fin[data-bord]").evaluateAll(
    n => n.map(b => [b.tagName, b.dataset.bord, getComputedStyle(b).cursor,
                     getComputedStyle(b).boxShadow]));
  j.controle("il n'y en a plus qu'un, celui des échéances",
    JSON.stringify(bords.map(b => b[1])) === '["derniere"]',
    JSON.stringify(bords.map(b => b[1])));
  j.controle("c'est un bouton, au doigt levé, souligné de son filet",
    bords.every(b => b[0] === "BUTTON" && b[2] === "pointer" && b[3] && b[3] !== "none"),
    bords.map(b => b[0] + " " + b[2]).join(" | "));
  /* Le verbe de la phrase pressée ne nomme que les plantes dont la fenêtre se
     ferme : il mène au bord restreint à sa tâche, non à la tâche entière. */
  const teteV = await pg.locator(".syn-tete .syn-verbe").evaluateAll(
    n => n.map(b => [b.textContent.trim(), b.dataset.tache, b.dataset.bord]));
  j.controle("le verbe de la tête pressée mène au bord de sa tâche",
    teteV.length > 0 && teteV.every(v => v[1] && v[2] === "derniere"),
    JSON.stringify(teteV));

  /* Le bord chassait la borne : une ligne de dernière quinzaine ne disait plus
     jusqu'à quand. Les deux paraissent. */
  j.section("le bord des échéances n'ouvre que ce qui se ferme");
  await pg.locator('button.fin[data-bord="derniere"]').click();
  await pg.waitForTimeout(700);
  const bd = await pg.evaluate(() => ({
    titre: document.querySelector("#barreNiveau .nom-niveau").textContent,
    compte: document.querySelector("#barreNiveau .nb-niveau").textContent,
    rail: document.querySelectorAll("#barreNiveau .rail").length,
    sections: [...document.querySelectorAll(".section-liste .tete-liste")]
      .map(e => e.querySelector(".nom-niveau").textContent + " "
        + e.querySelector(".nb-niveau").textContent),
    actions: [...document.querySelectorAll("#maintenant .action")].map(a => ({
      urgente: a.classList.contains("a-derniere"),
      pastille: (a.querySelector(".echeance.urgente") || {}).textContent || "",
      borne: [...a.querySelectorAll(".ech-g .echeance")]
        .filter(e => !e.classList.contains("urgente")).map(e => e.textContent)[0] || "",
    })),
  }));
  j.controle("le niveau porte le nom du bord et son compte",
    bd.titre === "Dernière quinzaine" && bd.compte === "2 actions",
    bd.titre + " " + bd.compte);
  // Le rail cède la place au titre : c'est la quinzaine qui est le sujet.
  j.controle("le rail des sections cède la place au titre", bd.rail === 0);
  j.controle("les sections restent celles des tâches",
    JSON.stringify(bd.sections) === '["Planter 1","Récolter 1"]',
    JSON.stringify(bd.sections));
  j.controle("toutes les actions montrées se ferment",
    bd.actions.length === 2 && bd.actions.every(a => a.urgente),
    `${bd.actions.filter(a => a.urgente).length} sur ${bd.actions.length}`);
  j.controle("chacune porte sa pastille et sa borne",
    bd.actions.every(a => a.pastille === "dernière quinzaine" && /^jusqu'à /.test(a.borne)),
    JSON.stringify(bd.actions.map(a => [a.pastille, a.borne])));

  /* Le niveau se referme comme une tâche : par le chevron de la barre et par le
     geste du téléphone. */
  j.section("le bord se referme comme une tâche");
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);
  j.controle("le chevron rend la vue d'ensemble",
    await pg.locator("#vueEnsemble:not([hidden])").count() === 1);
  await pg.locator('button.fin[data-bord="derniere"]').click();
  await pg.waitForTimeout(600);
  await pg.goBack();
  await pg.waitForTimeout(600);
  j.controle("le retour du téléphone aussi",
    await pg.locator("#vueEnsemble:not([hidden])").count() === 1
    && await pg.locator(".syn-tete").count() === 1);
  await ctx.close();

  /* Sans rien qui se ferme, la phrase de tête perd son échéance et le lien qui
     la portait : il n'y aurait aucune action derrière. Les ouvertures restent
     lisibles sur les lignes. */
  j.section("un bord sans action n'est pas offert");
  const e = await ouvrirContexte(navigateur, { jardin: ETROIT });
  await e.pg.waitForTimeout(700);
  const teteE = net(await e.pg.locator(".syn-tete").innerText());
  j.controle("la tête se tait sur l'échéance",
    !teteE.includes("avant la fin de la quinzaine"), teteE);
  j.controle("aucun lien de bord n'est offert",
    await e.pg.locator("button.fin[data-bord]").count() === 0);
  const lE = await lignes(e.pg);
  j.controle("les ouvertures restent marquées sur les lignes",
    lE.some(t => t.includes("1ère quinzaine")), lE.join(" | "));
  await e.ctx.close();

  return j.fin(erreurs.concat(e.erreurs));
}
