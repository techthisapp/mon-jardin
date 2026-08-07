/* Photographies de la fiche. Les contrôles portent sur ce que le code ne
   vérifie pas seul : l'ordre des organes est le même d'une plante à l'autre,
   la bande raccourcit sans laisser de case vide, une image écartée à la
   relecture cède la place à la suivante, et l'attribution est portée sous la
   bande comme au plein écran. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, ongletIdentite, net, CATALOGUE } from "./commun.mjs";

const ORDRE = ["FLEUR", "FEUILLE", "FRUIT", "RACINE", "PORT", "ÉCORCE"];

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
  const credit = net(await pg.locator(".ph-credit").innerText());
  j.controle("le fonds et la licence sont nommés sous la bande",
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
    (await pg.locator(".ph-credit").innerText()).indexOf("écartée") === -1
    && (await pg.locator(".ph-credit").innerText()).indexOf("Lin Ferber") !== -1,
    net(await pg.locator(".ph-credit").innerText()));

  j.section("le plein écran porte l'organe, l'auteur et la source");
  await pg.locator('.ph-i[data-photo="0"]').click();
  await pg.waitForTimeout(500);
  j.controle("il s'ouvre", await pg.locator("#photoPlein:not([hidden])").count() === 1);
  j.controle("l'organe est nommé",
    net(await pg.locator(".ph-org").innerText()) === "FLEUR",
    net(await pg.locator(".ph-org").innerText()));
  const bas = net(await pg.locator(".ph-bas").innerText());
  j.controle("l'auteur et la licence y sont repris",
    /Lit Cu/.test(bas) && /CC BY-SA/.test(bas), bas);
  j.controle("le lien vers la source est présent",
    await pg.locator(".ph-bas a").count() === 1,
    await pg.locator(".ph-bas a").getAttribute("href").catch(() => "absent"));
  j.controle("un repère par photo, celui de la première marqué",
    await pg.locator(".ph-pts i").count() === (await pg.locator(".ph-i").count())
    && await pg.locator(".ph-pts i.ici").count() === 1);
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
  const cw = net(await pg.locator(".ph-credit").innerText());
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
    orgW.join(" ") === "FLEUR FEUILLE FRUIT RACINE", orgW.join(" "));
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

  await ctx.close();
  return j.fin(erreurs.concat(err2));
}
