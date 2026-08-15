/* Les deux bords de la quinzaine. La synthèse ne disait que ce qui se ferme :
   « avant la fin de la quinzaine », puis « · dernière quinzaine » sur les
   lignes. Ce qui venait de s'ouvrir se lisait comme le reste, alors que c'est
   le moment où le geste devient possible.

   Une phrase le dit maintenant, et les deux bords sont des liens : chacun ouvre
   son propre niveau, toutes tâches confondues, qui ne montre que les actions de
   ce bord. Les contrôles portent sur les phrases rendues, sur le partage entre
   la phrase et les marques de ligne, et sur le contenu des deux niveaux, qui
   doit se recouper avec ce que la synthèse annonce. */
import { ouvrirContexte, journal, net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
/* Soixante plantes au deux août : la quinzaine ouvre cinq tâches et en ferme
   deux, de quoi éprouver la phrase tronquée comme les marques de ligne. */
const LARGE = PLANTES.slice(0, 60).map(p => p.id);
// Douze plantes : rien ne se ferme, la phrase de tête perd son échéance.
const ETROIT = PLANTES.slice(0, 12).map(p => p.id);

const lignes = pg => pg.locator(".syn-ligne").allInnerTexts().then(l => l.map(net));

export default async function essai(navigateur) {
  const j = journal("Bords de la quinzaine");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur, { jardin: LARGE });
  await pg.waitForTimeout(700);

  j.section("la phrase des ouvertures suit celle des échéances");
  const tete = net(await pg.locator(".syn-tete").innerText());
  const neuf = net(await pg.locator(".syn-neuf").innerText());
  j.controle("la tête garde son échéance",
    tete.endsWith("avant la fin de la quinzaine."), tete);
  /* Trois tâches nommées au plus : au delà la phrase redeviendrait une liste,
     et le compte renvoie aux marques de ligne. */
  j.controle("les ouvertures nomment leurs tâches et comptent le reste",
    neuf === "Première quinzaine pour tailler, multiplier, semer et 2 autres tâches.",
    neuf);
  j.controle("elle se place entre la tête et les lignes",
    await pg.evaluate(() => {
      const p = document.querySelector(".syn-neuf");
      const t = document.querySelector(".syn-tete");
      const l = document.querySelector(".syn-lignes");
      return t.compareDocumentPosition(p) === 4 && p.compareDocumentPosition(l) === 4;
    }));

  /* Une tâche que la phrase a nommée ne reprend pas la marque sur sa ligne : la
     marque sert à retrouver celles que le compte laissait dans l'ombre. */
  j.section("les marques de ligne complètent la phrase sans la répéter");
  const l = await lignes(pg);
  const marquees = l.filter(t => t.includes("1ère quinzaine"));
  j.controle("seules les tâches hors phrase portent la marque",
    marquees.length === 2
    && marquees.every(t => /^(Planter|Récolter)/.test(t)), marquees.join(" | "));
  j.controle("aucune des trois nommées ne la porte",
    !l.some(t => /^(Tailler|Multiplier|Semer)/.test(t) && t.includes("1ère quinzaine")),
    l.join(" | "));

  /* Les deux bords sont des liens. Les verbes qui les entourent en sont aussi,
     mais restreints à leur tâche : les pastilles seules mènent au bord entier. */
  j.section("les deux bords sont des liens");
  const bords = await pg.locator("button.fin[data-bord]").evaluateAll(
    n => n.map(b => [b.tagName, b.dataset.bord, b.textContent.trim(),
                     getComputedStyle(b).cursor]));
  j.controle("il y en a deux, une pastille par bord",
    JSON.stringify(bords.map(b => b[1])) === '["derniere","premiere"]',
    JSON.stringify(bords.map(b => b[1])));
  j.controle("ce sont des boutons, au doigt levé",
    bords.every(b => b[0] === "BUTTON" && b[3] === "pointer"),
    bords.map(b => b[0] + " " + b[3]).join(" | "));
  /* Le filet sous le mot est la seule marque du lien : la couleur chaude reste
     à l'échéance, le vert de la végétation va à l'ouverture. */
  const filets = await pg.locator("button.fin[data-bord]").evaluateAll(
    n => n.map(b => getComputedStyle(b).boxShadow));
  j.controle("chacun porte son filet, et les deux diffèrent",
    filets.every(f => f && f !== "none") && filets[0] !== filets[1],
    filets.join(" | "));

  /* « Première quinzaine pour tailler » menait à toutes les tailles du moment,
     celles ouvertes depuis des mois comprises : le mot promettait un filtre
     qu'il ne posait pas. Il mène au bord restreint à sa tâche. */
  j.section("un verbe posé près d'un bord mène au bord restreint à sa tâche");
  const verbes = await pg.locator(".syn-neuf .syn-verbe").evaluateAll(
    n => n.map(b => [b.textContent.trim(), b.dataset.tache, b.dataset.bord]));
  j.controle("les verbes des ouvertures portent leur tâche et leur bord",
    verbes.length === 3 && verbes.every(v => v[1] && v[2] === "premiere"),
    JSON.stringify(verbes));
  /* Le verbe de la phrase de tête suit la même règle quand la phrase est
     pressée : elle ne nomme alors que les plantes dont la fenêtre se ferme. */
  const teteV = await pg.locator(".syn-tete .syn-verbe").evaluateAll(
    n => n.map(b => [b.textContent.trim(), b.dataset.tache, b.dataset.bord]));
  j.controle("celui de la tête pressée aussi, sur l'autre bord",
    teteV.length > 0 && teteV.every(v => v[1] && v[2] === "derniere"),
    JSON.stringify(teteV));

  await pg.locator('.syn-neuf .syn-verbe[data-tache="taille"]').click();
  await pg.waitForTimeout(700);
  const filtre = await pg.evaluate(() => ({
    titre: document.querySelector("#barreNiveau .nom-niveau").textContent,
    sous: (document.querySelector("#barreNiveau .sous-niveau") || {}).textContent || "",
    compte: document.querySelector("#barreNiveau .nb-niveau").textContent,
    sections: [...document.querySelectorAll(".section-liste .tete-liste")]
      .map(e => e.querySelector(".nom-niveau").textContent),
    actions: document.querySelectorAll("#maintenant .action").length,
    ouvertes: document.querySelectorAll("#maintenant .action.a-ouverture").length,
  }));
  j.controle("le niveau nomme la quinzaine et la tâche qui la restreint",
    filtre.titre === "Première quinzaine" && filtre.sous === "Tailler",
    filtre.titre + " " + filtre.sous);
  j.controle("il ne montre qu'une tâche, et rien qui ne s'ouvre",
    JSON.stringify(filtre.sections) === '["Tailler"]'
    && filtre.actions > 0 && filtre.ouvertes === filtre.actions,
    `${JSON.stringify(filtre.sections)}, ${filtre.ouvertes} sur ${filtre.actions}`);
  /* Le filtre retranche : la taille du moment porte plus d'actions que celles
     qui viennent de s'ouvrir, sans quoi le contrôle ne prouverait rien. */
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);
  await pg.locator('.syn-ligne[data-tache="taille"]').click().catch(() => {});
  await pg.waitForTimeout(700);
  const entiere = await pg.locator("#maintenant .action").count();
  j.controle("la tâche entière en porte davantage",
    entiere > filtre.actions, `${filtre.actions} au bord, ${entiere} en tout`);
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);

  /* Le bord chassait la borne : une ligne de dernière quinzaine ne disait plus
     jusqu'à quand, et une ligne de première quinzaine ne disait pas qu'elle
     venait de s'ouvrir. Les deux paraissent. */
  j.section("chaque action dit son bord et jusqu'à quand elle court");
  await pg.locator('button.fin[data-bord="premiere"]').click();
  await pg.waitForTimeout(700);
  const dits = await pg.evaluate(() => [...document.querySelectorAll("#maintenant .action")]
    .map(a => ({
      etat: a.classList.contains("a-derniere") ? "derniere"
        : a.classList.contains("a-ouverture") ? "ouverture" : "",
      pastille: (a.querySelector(".echeance.neuve, .echeance.urgente") || {}).textContent || "",
      borne: [...a.querySelectorAll(".ech-g .echeance")]
        .filter(e => !e.classList.contains("neuve") && !e.classList.contains("urgente"))
        .map(e => e.textContent)[0] || "",
    })));
  j.controle("chacune porte la pastille de son bord",
    dits.length > 0 && dits.every(d => d.pastille === "1ère quinzaine"),
    dits.length + " actions, " + [...new Set(dits.map(d => d.pastille))].join(" | "));
  j.controle("et sa borne, que la pastille ne chasse plus",
    dits.every(d => /^jusqu'à (mi-|fin )/.test(d.borne)),
    [...new Set(dits.map(d => d.borne))].slice(0, 3).join(" | "));
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);
  await pg.locator('button.fin[data-bord="derniere"]').click();
  await pg.waitForTimeout(700);
  const ditsD = await pg.evaluate(() => [...document.querySelectorAll("#maintenant .action")]
    .map(a => [(a.querySelector(".echeance.urgente") || {}).textContent || "",
               [...a.querySelectorAll(".ech-g .echeance")]
                 .filter(e => !e.classList.contains("urgente"))
                 .map(e => e.textContent)[0] || ""]));
  j.controle("l'autre bord porte la sienne, et sa borne aussi",
    ditsD.length > 0 && ditsD.every(d => d[0] === "dernière quinzaine"
      && /^jusqu'à /.test(d[1])),
    JSON.stringify(ditsD));
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);

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
    actions: document.querySelectorAll("#maintenant .action").length,
    urgentes: document.querySelectorAll("#maintenant .action.a-derniere").length,
  }));
  j.controle("le niveau porte le nom du bord et son compte",
    bd.titre === "Dernière quinzaine" && bd.compte === "2 actions",
    bd.titre + " " + bd.compte);
  /* Le rail cède la place au titre : c'est la quinzaine qui est le sujet, non
     la tâche où l'on se trouve. */
  j.controle("le rail des sections cède la place au titre", bd.rail === 0);
  j.controle("les sections restent celles des tâches",
    JSON.stringify(bd.sections) === '["Planter 1","Récolter 1"]',
    JSON.stringify(bd.sections));
  j.controle("toutes les actions montrées se ferment",
    bd.actions === 2 && bd.urgentes === 2, `${bd.urgentes} sur ${bd.actions}`);

  j.section("le bord des ouvertures n'ouvre que ce qui commence");
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);
  await pg.locator('button.fin[data-bord="premiere"]').click();
  await pg.waitForTimeout(700);
  const bp = await pg.evaluate(() => ({
    titre: document.querySelector("#barreNiveau .nom-niveau").textContent,
    compte: document.querySelector("#barreNiveau .nb-niveau").textContent,
    sections: [...document.querySelectorAll(".section-liste .tete-liste")]
      .map(e => e.querySelector(".nom-niveau").textContent),
    actions: document.querySelectorAll("#maintenant .action").length,
    urgentes: document.querySelectorAll("#maintenant .action.a-derniere").length,
    ouvertes: document.querySelectorAll("#maintenant .action.a-ouverture").length,
  }));
  j.controle("le niveau porte son nom et son compte",
    bp.titre === "Première quinzaine" && bp.compte === "15 actions",
    bp.titre + " " + bp.compte);
  /* Les cinq tâches de la phrase et des marques se retrouvent ici : c'est le
     recoupement qui vaut, un compte annoncé et un contenu qui s'y tient. */
  j.controle("les cinq tâches annoncées y sont",
    JSON.stringify(bp.sections)
      === '["Tailler","Multiplier","Semer","Planter","Récolter"]',
    JSON.stringify(bp.sections));
  j.controle("toutes les actions montrées s'ouvrent, aucune ne se ferme",
    bp.ouvertes === bp.actions && bp.urgentes === 0,
    `${bp.ouvertes} ouvertes, ${bp.urgentes} fermantes, ${bp.actions} en tout`);

  /* Le niveau se referme comme une tâche : par le chevron de la barre et par le
     geste du téléphone. */
  j.section("le bord se referme comme une tâche");
  await pg.locator("#barreNiveau .retour").click();
  await pg.waitForTimeout(400);
  j.controle("le chevron rend la vue d'ensemble",
    await pg.locator("#vueEnsemble:not([hidden])").count() === 1);
  await pg.locator('button.fin[data-bord="premiere"]').click();
  await pg.waitForTimeout(600);
  await pg.goBack();
  await pg.waitForTimeout(600);
  j.controle("le retour du téléphone aussi",
    await pg.locator("#vueEnsemble:not([hidden])").count() === 1
    && await pg.locator(".syn-neuf").count() === 1);
  await ctx.close();

  /* Sans rien qui se ferme, la phrase de tête perd son échéance et le lien qui
     la portait : il n'y aurait aucune action derrière. */
  j.section("un bord sans action n'est pas offert");
  const e = await ouvrirContexte(navigateur, { jardin: ETROIT });
  await e.pg.waitForTimeout(700);
  const teteE = net(await e.pg.locator(".syn-tete").innerText());
  j.controle("la tête se tait sur l'échéance",
    !teteE.includes("avant la fin de la quinzaine"), teteE);
  j.controle("le lien des échéances n'est pas là",
    await e.pg.locator('button.fin[data-bord="derniere"]').count() === 0);
  j.controle("celui des ouvertures reste",
    await e.pg.locator('button.fin[data-bord="premiere"]').count() === 1,
    net(await e.pg.locator(".syn-neuf").innerText()));
  await e.ctx.close();

  return j.fin(erreurs.concat(e.erreurs));
}
