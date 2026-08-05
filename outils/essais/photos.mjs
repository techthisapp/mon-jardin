/* Photographies de la fiche. Les contrôles portent sur ce que le code ne
   vérifie pas seul : l'ordre des organes est le même d'une plante à l'autre,
   la bande raccourcit sans laisser de case vide, une image écartée à la
   relecture cède la place à la suivante, et l'attribution est portée sous la
   bande comme au plein écran. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, ongletAnnee, net } from "./commun.mjs";

const ORDRE = ["FLEUR", "FEUILLE", "FRUIT", "PORT", "ÉCORCE"];

export default async function essai(navigateur) {
  const j = journal("Photographies de la fiche");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);
  await ouvrirListeDesPlantes(pg);

  j.section("la bande suit un ordre d'organes fixe");
  await ouvrirFiche(pg, "Pommier");
  await ongletAnnee(pg);
  await pg.waitForTimeout(500);
  const org = await pg.locator(".ph-i span").allInnerTexts();
  j.controle("les cinq organes sont là, dans l'ordre",
    org.join(" ") === ORDRE.join(" "), org.join(" "));
  /* La section vit avec l'identité : c'est de la même nature, ce que la plante
     est, et non ce qu'il y a à en faire. */
  const place = await pg.evaluate(() => {
    const s = document.getElementById("fPhotos");
    const id = [...document.querySelectorAll(".f-bloc h3")]
      .find(h => h.textContent === "Identité");
    return s && id ? (s.compareDocumentPosition(id.closest(".f-bloc")) & 4) === 4 : null;
  });
  j.controle("elle est posée juste avant le bloc Identité", place === true);
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

  j.section("la bande raccourcit quand un organe manque");
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Basilic");
  await ongletAnnee(pg);
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
  await ongletAnnee(pg);
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

  j.section("une fiche sans photo n'ouvre pas de section vide");
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Tomate");
  await ongletAnnee(pg);
  await pg.waitForTimeout(500);
  j.controle("la section reste absente",
    await pg.locator("#fPhotos:not([hidden])").count() === 0);
  j.controle("aucun titre ni cadre vide", await pg.locator(".ph-rail").count() === 0);

  await ctx.close();
  return j.fin(erreurs);
}
