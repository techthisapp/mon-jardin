/* Photographies de la fiche. Les contrôles portent sur ce que le code ne
   vérifie pas seul : l'ordre des organes est le même d'une plante à l'autre,
   la bande raccourcit sans laisser de case vide, une image écartée à la
   relecture cède la place à la suivante, et l'attribution est portée sous la
   bande comme au plein écran. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, ongletIdentite, net, CATALOGUE } from "./commun.mjs";

const ORDRE = ["FLEUR", "FEUILLE", "FRUIT", "RACINE", "PORT", "ÉCORCE"];

/* Un glissement du doigt, dispatché à la main : le contexte d'essai n'est pas
   tactile, et c'est le seul moyen d'éprouver le verrouillage d'axe. */
async function glisser(pg, cible, dx, dy, pas = 12) {
  await pg.evaluate(([sel, dx, dy, pas]) => {
    const e = document.querySelector(sel);
    const r = e.getBoundingClientRect();
    const x0 = Math.round(r.left + r.width / 2), y0 = Math.round(r.top + r.height / 2);
    const pt = (x, y) => new Touch({ identifier: 1, target: e, clientX: x, clientY: y });
    const jeter = (nom, x, y) => e.dispatchEvent(new TouchEvent(nom, {
      bubbles: true, cancelable: true,
      touches: nom === "touchend" ? [] : [pt(x, y)],
      changedTouches: [pt(x, y)],
    }));
    jeter("touchstart", x0, y0);
    for (let k = 1; k <= pas; k++) jeter("touchmove", x0 + dx * k / pas, y0 + dy * k / pas);
    jeter("touchend", x0 + dx, y0 + dy);
  }, [cible, dx, dy, pas]);
  await pg.waitForTimeout(520);
}

const organeVu = pg => pg.locator(".ph-org-n").innerText().then(net).catch(() => "fermé");

/* L'attribution ne tient plus quatre lignes sous la bande : elle est passée
   sous un mot, et se lit en l'ouvrant comme une définition du glossaire. */
async function lireCredits(pg) {
  await pg.locator(".ph-credits").click();
  await pg.waitForTimeout(250);
  const t = net(await pg.locator(".glose").innerText());
  await pg.keyboard.press("Escape");
  await pg.waitForTimeout(150);
  return t;
}

export default async function essai(navigateur) {
  const j = journal("Photographies de la fiche");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);
  await ouvrirListeDesPlantes(pg);

  j.section("la bande suit un ordre d'organes fixe");
  await ouvrirFiche(pg, "Pommier");
  await ongletIdentite(pg);
  await pg.waitForTimeout(500);
  const org = await pg.locator(".ph-i span").allInnerTexts();
  j.controle("les cinq organes du pommier sont là, dans l'ordre",
    org.join(" ") === ORDRE.filter(o => o !== "RACINE").join(" "), org.join(" "));
  /* La section vit dans l'onglet de l'identité, en tête : c'est de la même
     nature, ce que la plante est, et non ce qu'il y a à en faire. */
  const place = await pg.evaluate(() => {
    const pan = document.querySelector('.f-pan[data-pan="identite"]');
    const s = document.getElementById("fPhotos");
    if (!pan || !s || s.closest(".f-pan") !== pan) return null;
    return pan.firstElementChild === s;
  });
  j.controle("elle ouvre l'onglet de l'identité", place === true);
  /* Ce que la plante apporte est un caractère et non un geste : « Au jardin »
     suit la bande, avant la taille à maturité et le bloc Identité. */
  j.controle("l'onglet enchaîne Au jardin puis Identité",
    JSON.stringify(await pg.evaluate(() =>
      [...document.querySelectorAll('.f-pan[data-pan="identite"] .f-bloc h3')]
        .map(h => h.textContent))) === JSON.stringify(["Au jardin", "Identité"]),
    JSON.stringify(await pg.evaluate(() =>
      [...document.querySelectorAll('.f-pan[data-pan="identite"] .f-bloc h3')]
        .map(h => h.textContent))));
  j.controle("Au jardin précède la taille à maturité",
    await pg.evaluate(() => {
      const pan = document.querySelector('.f-pan[data-pan="identite"]');
      const enfants = [...pan.children];
      const jardin = enfants.findIndex(e => e.querySelector("h3")
        && e.querySelector("h3").textContent === "Au jardin");
      const taille = enfants.findIndex(e => e.classList.contains("f-carte"));
      return jardin === 1 && taille === 2;
    }));
  j.controle("l'onglet de l'année ne porte plus que Culture",
    await pg.evaluate(() => {
      const a = document.querySelector('.f-pan[data-pan="annee"]');
      return !a.querySelector(".f-photos")
        && [...a.querySelectorAll(".f-bloc h3")].map(h => h.textContent).join() === "Culture";
    }));
  j.controle("les tuiles sont carrées",
    await pg.locator(".ph-i img").first().evaluate(e => {
      const r = e.getBoundingClientRect();
      return Math.abs(r.width - r.height) < 1;
    }));
  /* Le titre de la bande portait la capitale condensée des cartes quand ses
     voisins du même onglet portent la casse normale des blocs, et sa marge
     basse négative le collait aux tuiles. */
  j.section("le titre suit celui de ses voisins et respire");
  const titre = await pg.evaluate(() => {
    const h = document.querySelector("#fPhotos h3");
    const b = document.querySelector('.f-pan[data-pan="identite"] .f-bloc h3');
    const c = document.querySelector('.f-pan[data-pan="identite"] .f-carte-tete h3');
    const forme = e => { const s = getComputedStyle(e);
      return [s.fontFamily, s.fontSize, s.fontWeight, s.textTransform, s.letterSpacing].join("|"); };
    return { texte: h.textContent, meme: forme(h) === forme(b),
             memeCarte: !c || forme(h) === forme(c), forme: forme(h),
             ecart: Math.round(document.querySelector(".ph-rail").getBoundingClientRect().top
                             - h.getBoundingClientRect().bottom) };
  });
  j.controle("il porte la même forme que les titres de bloc",
    titre.meme, titre.forme);
  j.controle("l'entête de carte porte la même", titre.memeCarte);
  j.controle("il ne colle plus aux tuiles", titre.ecart >= 8, `${titre.ecart} px`);

  /* L'attribution tenait quatre lignes sous la bande. Elle passe sous un mot. */
  j.section("l'attribution tient sous un mot");
  const pied = await pg.evaluate(() => {
    const c = document.querySelector(".ph-credit");
    return { texte: c.textContent.trim(), haut: Math.round(c.getBoundingClientRect().height),
             lignes: c.querySelectorAll("br").length };
  });
  j.controle("le pied de bande ne porte qu'un mot",
    pied.texte === "Crédits" && !pied.lignes, pied.texte);
  j.controle("il tient sur une ligne", pied.haut <= 24, `${pied.haut} px de haut`);

  const credit = await lireCredits(pg);
  j.controle("le fonds et la licence sont nommés dans l'infobulle",
    /Pl@ntNet/.test(credit) && /CC BY-SA/.test(credit), credit);
  j.controle("chaque auteur est nommé",
    ["Lit Cu", "serafina.pal", "Lin Ferber", "KP Laer", "David Grant"]
      .every(a => credit.indexOf(a) !== -1), credit);
  /* Une photographie de terrain porte le nom que l'observateur a donné à la
     plante, au rang de la fiche : rien ne distingue à l'oeil deux variétés de
     jardin, et la fiche le dit plutôt que de laisser croire au portrait de la
     variété cultivée. */
  j.controle("la portée de la photographie est énoncée",
    /documente l'espèce, une variété de jardin peut en différer/.test(credit), credit);

  j.section("la bande raccourcit quand un organe manque");
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Basilic");
  await ongletIdentite(pg);
  await pg.waitForTimeout(500);
  const org2 = await pg.locator(".ph-i span").allInnerTexts();
  j.controle("trois tuiles, sans case vide",
    org2.join(" ") === "FLEUR FEUILLE PORT", org2.join(" "));
  j.controle("aucune tuile sans image",
    await pg.locator(".ph-i img[src]").count() === org2.length);

  /* La relecture sur planche de contact peut écarter une image : le rang
     suivant prend sa place, et la tuile ne disparaît pas. */
  j.section("une image écartée cède la place à la suivante");
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Lavande");
  await ongletIdentite(pg);
  await pg.waitForTimeout(500);
  const org3 = await pg.locator(".ph-i span").allInnerTexts();
  j.controle("le fruit est toujours montré",
    org3.indexOf("FRUIT") !== -1, org3.join(" "));
  j.controle("c'est l'auteur du second rang qui est crédité",
    (await lireCredits(pg)).indexOf("Lin Ferber") !== -1, await lireCredits(pg));

  j.section("le plein écran porte l'organe, l'auteur et la source");
  await pg.locator('.ph-i[data-photo="0"]').click();
  await pg.waitForTimeout(500);
  j.controle("il s'ouvre", await pg.locator("#photoPlein:not([hidden])").count() === 1);
  j.controle("l'organe est nommé",
    net(await pg.locator(".ph-org-n").innerText()) === "FLEUR",
    net(await pg.locator(".ph-org-n").innerText()));
  const bas = net(await pg.locator(".ph-bas").innerText());
  j.controle("l'auteur et la licence y sont repris",
    /Lit Cu/.test(bas) && /CC BY-SA/.test(bas), bas);
  j.controle("le lien vers la source est présent",
    await pg.locator(".ph-bas a").count() === 1,
    await pg.locator(".ph-bas a").getAttribute("href").catch(() => "absent"));
  j.controle("un repère par photo, celui de la première marqué",
    await pg.locator(".ph-pts:not(.ph-pts-v) i").count() === (await pg.locator(".ph-i").count())
    && await pg.locator(".ph-pts:not(.ph-pts-v) i.ici").count() === 1);
  await pg.locator("#fermerPhoto").click();
  await pg.waitForTimeout(400);
  j.controle("la croix referme la photo sans fermer la fiche",
    await pg.locator("#photoPlein[hidden]").count() === 1
    && await pg.locator("#feuille:not([hidden])").count() === 1);

  /* La photo n'est ni réhébergée ni recadrée : le carré vient de l'affichage,
     et le plein écran demande au fonds sa taille moyenne. */
  j.section("les deux tailles viennent du fonds");
  const iPort = org3.indexOf("PORT");
  const petite = await pg.locator(".ph-i img").nth(iPort).getAttribute("src");
  await pg.locator(`.ph-i[data-photo="${iPort}"]`).click();
  await pg.waitForTimeout(500);
  const grande = await pg.locator(".ph-plein img").getAttribute("src");
  j.controle("la tuile demande la vignette", /\/image\/s\//.test(petite), petite);
  j.controle("le plein écran demande la taille moyenne", /\/image\/m\//.test(grande), grande);
  j.controle("aucun fichier n'est fabriqué, seule la taille change",
    petite.replace("/image/s/", "/image/m/") === grande);
  await pg.locator("#fermerPhoto").click();
  await pg.waitForTimeout(300);

  /* La fiche s'ouvre sur ce qu'on est venu y chercher : le geste du moment
     pour une plante du jardin, ce qu'elle est pour une plante du catalogue. */
  j.section("l'onglet d'ouverture suit l'appartenance au jardin");
  await fermerFiche(pg);
  const ouvert = async nom => {
    await ouvrirFiche(pg, nom);
    const t = await pg.locator(".f-onglets button.actif").innerText();
    await fermerFiche(pg);
    return net(t);
  };
  j.controle("une plante du jardin ouvre sur le moment",
    await ouvert("Pommier") === "En ce moment");

  /* La branche inverse demande un jardin où la plante n'est pas plantée : la
     même fiche s'ouvre alors sur ce que la plante est. */
  const catalogue = JSON.parse(CATALOGUE);
  const dehors = catalogue.plants.find(p => p.name === "Pommier").id;
  const { ctx: ctx2, pg: pg2, erreurs: err2 } = await ouvrirContexte(navigateur, {
    jardin: catalogue.plants.map(p => p.id).filter(id => id !== dehors),
  });
  await ouvrirListeDesPlantes(pg2);
  /* Une plante absente du jardin ne se rencontre qu'en dépliant le catalogue,
     le chemin même par lequel on la découvre. */
  await pg2.locator("#filtreJardin").dispatchEvent("click");
  await pg2.waitForTimeout(500);
  await ouvrirFiche(pg2, "Pommier");
  j.controle("une plante hors du jardin ouvre sur l'identité",
    net(await pg2.locator(".f-onglets button.actif").innerText()) === "Identité",
    net(await pg2.locator(".f-onglets button.actif").innerText()));
  j.controle("le panneau du moment est replié, celui de l'identité déplié",
    await pg2.locator('.f-pan[data-pan="identite"]:not([hidden])').count() === 1
    && await pg2.locator('.f-pan[data-pan="moment"][hidden]').count() === 1);
  j.controle("l'onglet actif est le seul annoncé au lecteur d'écran",
    await pg2.locator('.f-onglets button[aria-selected="true"]').count() === 1
    && net(await pg2.locator('.f-onglets button[aria-selected="true"]').innerText()) === "Identité");
  await pg2.waitForTimeout(500);
  j.controle("la bande des photographies est posée sans autre geste",
    await pg2.locator(".ph-i img").count() === 5,
    String(await pg2.locator(".ph-i img").count()));
  await ctx2.close();

  /* Wikimedia ne sert qu'une échelle fixe de largeurs et mêle les licences d'une
     image à l'autre : l'attribution ne peut pas en nommer une seule pour tout
     le lot. */
  j.section("le fonds Wikimedia porte ses propres règles");
  await ouvrirFiche(pg, "Framboise");
  await ongletIdentite(pg);
  await pg.waitForTimeout(500);
  const cw = await lireCredits(pg);
  j.controle("le fonds est nommé", /Wikimedia Commons/.test(cw), cw);
  j.controle("chaque auteur porte sa licence",
    /Ivar Leidus \(CC BY-SA 4\.0\)/.test(cw) && /Kristian Peters \(CC BY-SA 3\.0\)/.test(cw), cw);
  j.controle("une image sans auteur le dit sans mentir sur sa licence",
    /auteur non renseigné \(CC0\)/.test(cw), cw);
  j.controle("aucune licence unique n'est annoncée pour tout le lot",
    !/sous licence/.test(cw), cw);
  /* La racine a rejoint les organes le 7 août : un légume-racine n'a d'image
     utile que d'elle, et elle se range après le fruit, les deux étant l'organe
     récolté. */
  const orgW = await pg.locator(".ph-i span").allInnerTexts();
  j.controle("la racine paraît, après le fruit et avant le port",
    orgW.join(" ") === "FLEUR FEUILLE FRUIT RACINE ÉCORCE", orgW.join(" "));

  /* Un organe attendu ne reste pas vide. Le contrôle automatique est une
     suspicion, l'avis d'une personne est un verdict : à défaut d'image retenue,
     la première que le contrôle avait écartée reprend la place, jamais celle
     qu'un avis a retirée. Et l'écorce n'a pas d'objet chez une plante qui n'est
     pas ligneuse, sa tuile reste vide. */
  j.section("un organe attendu ne reste pas vide");
  j.controle("l'écorce écartée au contrôle reprend la place chez la framboise",
    orgW.indexOf("ÉCORCE") !== -1 && cw.indexOf("repli du contrôle") !== -1, cw);
  j.controle("le port retiré par avis n'est pas repris",
    orgW.indexOf("PORT") === -1 && cw.indexOf("retiré par avis") === -1, cw);
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Basilic");
  await ongletIdentite(pg);
  await pg.waitForTimeout(500);
  const orgB = await pg.locator(".ph-i span").allInnerTexts();
  j.controle("l'écorce n'a pas d'objet chez le basilic, sa tuile reste vide",
    orgB.indexOf("ÉCORCE") === -1, orgB.join(" "));
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Framboise");
  await ongletIdentite(pg);
  await pg.waitForTimeout(500);
  const pw = await pg.locator(".ph-i img").first().getAttribute("src");
  await pg.locator('.ph-i[data-photo="0"]').click();
  await pg.waitForTimeout(400);
  const gw = await pg.locator(".ph-plein img").getAttribute("src");
  j.controle("la tuile demande deux cent cinquante points", /\/250px-/.test(pw), pw);
  j.controle("le plein écran demande cinq cents points, taille servie par le fonds",
    /\/500px-/.test(gw) && gw === pw.replace("/250px-", "/500px-"), gw);
  await pg.locator("#fermerPhoto").click();
  await pg.waitForTimeout(300);
  await fermerFiche(pg);

  j.section("une fiche sans photo n'ouvre pas de section vide");
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Tomate");
  await ongletIdentite(pg);
  await pg.waitForTimeout(500);
  j.controle("la section reste absente",
    await pg.locator("#fPhotos:not([hidden])").count() === 0);
  j.controle("aucun titre ni cadre vide", await pg.locator(".ph-rail").count() === 0);

  await fermerFiche(pg);

  /* Le jugement des photographies. Trois verdicts par personne : seul « à
     supprimer » change ce qui est affiché, il masque l'image pour cette
     personne et la suivante prend la place. */
  j.section("juger une photographie depuis le plein écran");
  await ouvrirFiche(pg, "Pommier");
  await ongletIdentite(pg);
  await pg.waitForTimeout(500);
  await pg.locator('.ph-i[data-photo="0"]').click();
  await pg.waitForTimeout(350);
  const avis = await pg.locator(".ph-avis .av-b").allInnerTexts();
  j.controle("les trois verdicts sont offerts",
    avis.join(" ") === "À supprimer Moyenne Bonne", avis.join(" "));
  j.controle("aucun n'est retenu au départ",
    await pg.locator('.ph-avis [aria-pressed="true"]').count() === 0);

  await pg.locator('[data-avis="bonne"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  j.controle("le verdict posé est marqué",
    await pg.locator('[data-avis="bonne"]').getAttribute("aria-pressed") === "true"
    && await pg.locator('.ph-avis [aria-pressed="true"]').count() === 1);
  j.controle("le plein écran reste ouvert, la bande ne bouge pas",
    await pg.locator("#photoPlein:not([hidden])").count() === 1);
  const ecrit = await pg.evaluate(() => (window.__ECRITS__ || [])
    .filter(e => e.table === "avis_photo").map(e => [e.op, e.v && e.v.avis]));
  j.controle("l'avis est écrit en base",
    JSON.stringify(ecrit) === JSON.stringify([["upsert", "bonne"]]), JSON.stringify(ecrit));

  const avantOrg = await pg.locator(".ph-i span").allInnerTexts();
  const src1 = await pg.locator(".ph-i img").first().getAttribute("src");
  await pg.locator('[data-avis="supprimer"]').dispatchEvent("click");
  await pg.waitForTimeout(600);
  j.controle("le retrait ferme le plein écran",
    await pg.locator("#photoPlein[hidden]").count() === 1);
  const apresOrg = await pg.locator(".ph-i span").allInnerTexts();
  j.controle("la bande garde ses organes, la suivante ayant pris la place",
    apresOrg.join(" ") === avantOrg.join(" "), apresOrg.join(" "));
  const src2 = await pg.locator(".ph-i img").first().getAttribute("src");
  j.controle("la tuile fleur montre bien une autre image", src2 !== src1, src2.slice(-24));
  j.controle("l'annulation est offerte",
    await pg.locator(".etat-action").count() === 1
    && net(await pg.locator(".etat-action").innerText()) === "Annuler");

  await pg.locator(".etat-action").dispatchEvent("click");
  await pg.waitForTimeout(600);
  const src3 = await pg.locator(".ph-i img").first().getAttribute("src");
  j.controle("l'annulation remet la photographie", src3 !== src2, src3.slice(-24));
  await fermerFiche(pg);

  /* Une image écartée à la relecture n'est pas la même chose qu'une image
     qu'on masque : la première ne revient jamais, la seconde se remet. */
  j.section("la liste des photographies écartées");
  await ouvrirFiche(pg, "Pommier");
  await ongletIdentite(pg);
  await pg.waitForTimeout(400);
  await pg.locator('.ph-i[data-photo="1"]').click();
  await pg.waitForTimeout(300);
  await pg.locator('[data-avis="supprimer"]').dispatchEvent("click");
  await pg.waitForTimeout(500);
  await fermerFiche(pg);
  await pg.locator("#btnConfig").dispatchEvent("click");
  await pg.waitForTimeout(500);
  await pg.locator("#voirEcartees").dispatchEvent("click");
  await pg.waitForTimeout(700);
  j.controle("la feuille porte le titre attendu",
    net(await pg.locator("#feuille-titre").innerText()) === "Photographies écartées",
    net(await pg.locator("#feuille-titre").innerText()));
  j.controle("la photographie écartée y figure, nommée par sa plante et son organe",
    await pg.locator(".ligne-ecartee").count() === 1
    && /Pommier/.test(await pg.locator(".ligne-ecartee .ec-nom").innerText()),
    net(await pg.locator("#listeEcartees").innerText()).slice(0, 60));
  await pg.locator(".ligne-ecartee button").dispatchEvent("click");
  await pg.waitForTimeout(600);
  j.controle("la remise vide la liste",
    await pg.locator(".ligne-ecartee").count() === 0);

  /* Le plein écran se parcourt au doigt. L'axe est verrouillé au premier
     mouvement franc : l'horizontale change d'image, la verticale referme, et
     une diagonale sans dominance ne fait ni l'un ni l'autre. */
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Pommier");
  await ongletIdentite(pg);
  await pg.waitForTimeout(600);

  j.section("le plein écran se parcourt au doigt");
  await pg.locator('.ph-i[data-photo="1"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  j.controle("il s'ouvre sur l'organe touché",
    await organeVu(pg) === "FEUILLE", await organeVu(pg));
  await glisser(pg, ".ph-plein img", -220, 0);
  j.controle("un glissement vers la gauche donne la suivante",
    await organeVu(pg) === "FRUIT", await organeVu(pg));
  await glisser(pg, ".ph-plein img", 220, 0);
  j.controle("un glissement vers la droite ramène la précédente",
    await organeVu(pg) === "FEUILLE", await organeVu(pg));
  const repere = await pg.evaluate(() => {
    const t = [...document.querySelectorAll(".ph-pts:not(.ph-pts-v) i")];
    return { total: t.length, ici: t.findIndex(e => e.classList.contains("ici")) };
  });
  j.controle("le repère suit la photographie regardée",
    repere.total === 5 && repere.ici === 1, JSON.stringify(repere));

  j.section("l'axe du geste est verrouillé, la diagonale ne tranche pas");
  await glisser(pg, ".ph-plein img", -200, -200);
  j.controle("une diagonale à quarante-cinq degrés ne change rien",
    await organeVu(pg) === "FEUILLE", await organeVu(pg));
  j.controle("et ne referme pas",
    await pg.locator("#photoPlein:not([hidden])").count() === 1);
  /* Une course franchement horizontale qui s'incurve reste horizontale : le
     verrou tient jusqu'au relâchement du doigt. */
  await glisser(pg, ".ph-plein img", -220, -140);
  j.controle("une horizontale qui s'incurve reste horizontale",
    await organeVu(pg) === "FRUIT", await organeVu(pg));

  j.section("les bords de la bande et les commandes");
  await pg.keyboard.press("ArrowLeft");
  await pg.waitForTimeout(500);
  await pg.keyboard.press("ArrowLeft");
  await pg.waitForTimeout(500);
  j.controle("les flèches du clavier parcourent aussi la bande",
    await organeVu(pg) === "FLEUR", await organeVu(pg));
  await glisser(pg, ".ph-plein img", 240, 0);
  j.controle("à la première, le glissement vers la droite ne sort pas de la bande",
    await organeVu(pg) === "FLEUR", await organeVu(pg));
  j.controle("l'image est revenue à sa place",
    await pg.evaluate(() => {
      const t = getComputedStyle(document.querySelector(".ph-plein img")).transform;
      return t === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(t);
    }));
  /* Un geste né sur un verdict lui appartient : juger ne doit pas faire défiler
     la bande sous le doigt. */
  await glisser(pg, ".av-b", -220, 0);
  j.controle("un geste parti d'un bouton ne fait pas glisser",
    await organeVu(pg) === "FLEUR", await organeVu(pg));

  /* La réserve compte jusqu'à six images par organe. Elle dormait en base et ne
     paraissait qu'après un avis : la verticale la parcourt. */
  j.section("la verticale parcourt la réserve de l'organe");
  const auteur = pg => pg.locator(".ph-bas b").innerText().then(net).catch(() => "");
  const compte = pg => pg.locator(".ph-nb").innerText().then(net).catch(() => "");
  j.controle("le compte dit qu'il y a autre chose à voir",
    await compte(pg) === "1 sur 2", await compte(pg));
  const premier = await auteur(pg);
  await glisser(pg, ".ph-plein img", 0, -260);
  j.controle("un glissement vers le haut donne le rang suivant",
    await compte(pg) === "2 sur 2" && await auteur(pg) !== premier,
    `${await compte(pg)} ${await auteur(pg)}`);
  j.controle("l'organe n'a pas changé", await organeVu(pg) === "FLEUR", await organeVu(pg));
  j.controle("le repère vertical suit",
    await pg.locator(".ph-pts-v i").count() === 2
    && await pg.locator(".ph-pts-v i.ici").count() === 1);
  await glisser(pg, ".ph-plein img", 0, -260);
  j.controle("au dernier rang, le haut ne sort pas de la réserve",
    await compte(pg) === "2 sur 2", await compte(pg));
  await glisser(pg, ".ph-plein img", 0, 260);
  j.controle("un glissement vers le bas ramène le rang précédent",
    await compte(pg) === "1 sur 2" && await auteur(pg) === premier,
    `${await compte(pg)} ${await auteur(pg)}`);
  j.controle("il n'a pas refermé", await pg.locator("#photoPlein:not([hidden])").count() === 1);

  j.section("les flèches parcourent aussi la réserve");
  await pg.keyboard.press("ArrowDown");
  await pg.waitForTimeout(500);
  j.controle("la flèche du bas descend d'un rang",
    await compte(pg) === "2 sur 2", await compte(pg));
  await pg.keyboard.press("ArrowUp");
  await pg.waitForTimeout(500);
  j.controle("celle du haut remonte", await compte(pg) === "1 sur 2", await compte(pg));

  /* Changer d'organe rouvre au premier rang de sa réserve : on ne garde pas la
     position d'un organe à l'autre, elle n'y voudrait rien dire. */
  await pg.keyboard.press("ArrowDown");
  await pg.waitForTimeout(500);
  await glisser(pg, ".ph-plein img", -220, 0);
  j.controle("changer d'organe rouvre au premier rang",
    await organeVu(pg) === "FEUILLE" && await compte(pg) === "1 sur 2",
    `${await organeVu(pg)} ${await compte(pg)}`);

  /* Au premier rang il n'y a rien au dessus : tirer vers le bas ne peut vouloir
     dire que fermer. C'est ce qui laisse les trois gestes tenir sur deux axes. */
  j.section("au premier rang, le geste vers le bas referme");
  await glisser(pg, ".ph-plein img", 0, 260);
  j.controle("le plein écran s'est refermé",
    await pg.locator("#photoPlein[hidden]").count() === 1);
  j.controle("la fiche est restée ouverte",
    await pg.locator("#feuille:not([hidden])").count() === 1);

  await ctx.close();
  return j.fin(erreurs.concat(err2));
}
