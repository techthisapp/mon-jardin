/* La navigation rénovée. Trois destinations de même rang dans la barre du bas,
   les plantes au centre sur un bouton rond. Ce qui restait des réglages devient
   deux feuilles, celle du jardin ouverte par son nom, celle du compte ouverte
   par le bouton du coin.

   Les panneaux ne sont pas reconstruits à chaque ouverture, ils sont déplacés
   depuis une réserve hors écran : les contrôles portent surtout sur ce
   déplacement, seul endroit où un champ pourrait perdre son écouteur ou une
   ouverture suivante effacer le panneau. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, net } from "./commun.mjs";

const ouAilleurs = pg => pg.evaluate(() => {
  const r = document.getElementById("reserve-reglages");
  return ["bloc-jardin", "bloc-compte"].map(id => {
    const b = document.getElementById(id);
    return !b ? "absent" : b.parentNode === r ? "réserve"
      : b.closest("#feuille-corps") ? "feuille" : "ailleurs";
  });
});

export default async function essai(navigateur) {
  const j = journal("Navigation et réglages");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

  j.section("trois destinations, dont les plantes au centre");
  const barre = await pg.locator(".barre-basse .onglet").evaluateAll(
    l => l.map(b => [b.dataset.ecran, b.classList.contains("onglet-rond")]));
  j.controle("l'ordre est le moment, les plantes, le calendrier",
    JSON.stringify(barre) === JSON.stringify([["maintenant", false],
      ["selection", true], ["planning", false]]), JSON.stringify(barre));
  j.controle("la sous-navigation des réglages a disparu",
    await pg.locator(".sous-onglet, #sousOnglets, #fermerConfig").count() === 0);
  /* Le rond dépasse vers le haut : la marge basse du contenu doit le dégager,
     faute de quoi la dernière ligne de la page se cache dessous. */
  const debord = await pg.evaluate(() => {
    const r = document.querySelector(".onglet-rond").getBoundingClientRect();
    const b = document.querySelector(".barre-basse").getBoundingClientRect();
    const m = getComputedStyle(document.querySelector("main")).paddingBottom;
    return { haut: b.top - r.top, bas: r.bottom - b.bottom, marge: parseFloat(m),
             hauteurBarre: b.height };
  });
  j.controle("le bouton rond dépasse par le haut, jamais par le bas",
    debord.haut > 8 && debord.bas <= 0, `${debord.haut.toFixed(1)} au-dessus, `
    + `${debord.bas.toFixed(1)} en dessous`);
  j.controle("le contenu laisse la place à la barre et au rond",
    debord.marge > debord.hauteurBarre + debord.haut,
    `${debord.marge} de marge pour ${(debord.hauteurBarre + debord.haut).toFixed(1)}`);

  j.section("le bouton rond mène aux plantes");
  await ouvrirListeDesPlantes(pg);
  j.controle("l'écran des plantes est affiché",
    await pg.locator("#ec-selection:not([hidden])").count() === 1);
  j.controle("le rond est le seul onglet marqué",
    await pg.locator('.onglet[aria-selected="true"]').count() === 1
    && await pg.locator('.onglet-rond[aria-selected="true"]').count() === 1);
  j.controle("il ouvre sur le jardin et non sur le catalogue entier",
    await pg.locator("#filtreJardin").getAttribute("aria-pressed") === "true");
  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(400);

  j.section("le nom du jardin ouvre le jardin");
  j.controle("les deux blocs attendent dans la réserve",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["réserve", "réserve"]));
  await pg.locator("#btnJardin").click();
  await pg.waitForTimeout(600);
  j.controle("la feuille porte le nom du jardin",
    net(await pg.locator("#feuille-titre").innerText()).startsWith("Le jardin de Jérôme"),
    net(await pg.locator("#feuille-titre").innerText()));
  j.controle("le bloc du jardin est passé dans la feuille",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["feuille", "réserve"]));
  // Les titres de panneau sont mis en capitales par la feuille de style.
  const titres = (await pg.locator("#feuille-corps .titre-panneau").allInnerTexts())
    .map(t => net(t).toLowerCase());
  j.controle("elle porte le jardin et les espaces",
    titres.join(" ") === "jardin espaces", titres.join(" "));
  j.controle("le sélecteur de jardin a gardé sa valeur",
    await pg.locator("#feuille-corps #selJardin option").count() > 0
    && await pg.locator("#feuille-corps #selJardin").inputValue() !== "");

  /* La commune s'ouvre par-dessus, avec le retour : c'est la pile de feuilles
     qui existait déjà, le bloc du jardin doit regagner la réserve au passage. */
  j.section("la commune s'enchaîne et le bloc regagne sa réserve");
  await pg.locator("#feuille-corps #btnCommune").click();
  await pg.waitForTimeout(600);
  j.controle("la feuille du lieu a pris la place",
    net(await pg.locator("#feuille-titre").innerText()).length > 0
    && await pg.locator("#feuille-corps #selJardin").count() === 0);
  j.controle("le bloc est rangé, non détruit",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["réserve", "réserve"]));
  j.controle("le retour est offert",
    await pg.locator("#retourFeuille:not([hidden])").count() === 1);
  await pg.locator("#retourFeuille").click();
  await pg.waitForTimeout(600);
  j.controle("le retour ramène le bloc du jardin, intact",
    await pg.locator("#feuille-corps #selJardin option").count() > 0);

  j.section("le bouton du coin ouvre le compte");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  await pg.locator("#btnConfig").click();
  await pg.waitForTimeout(600);
  j.controle("la feuille s'intitule Compte",
    net(await pg.locator("#feuille-titre").innerText()) === "Compte");
  j.controle("le bloc du compte est dans la feuille, celui du jardin rangé",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["réserve", "feuille"]));
  j.controle("l'adresse de la personne connectée est écrite",
    net(await pg.locator("#feuille-corps #utilisateur").innerText()) === "jerome@exemple.fr");
  j.controle("le formulaire de connexion se tait quand on est connecté",
    await pg.locator("#feuille-corps #zone-connexion[hidden]").count() === 1);

  /* Une fiche de plante écrase le corps de la feuille : si le bloc y était
     resté, il serait perdu et le réglage suivant ouvrirait une feuille vide. */
  j.section("ouvrir une fiche ne détruit pas les panneaux");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  await ouvrirListeDesPlantes(pg);
  await ouvrirFiche(pg, "Pommier");
  await fermerFiche(pg);
  j.controle("les deux blocs sont revenus en réserve",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["réserve", "réserve"]));
  await pg.locator("#btnConfig").click();
  await pg.waitForTimeout(600);
  j.controle("le compte s'ouvre encore, complet",
    await pg.locator("#feuille-corps #genererReprise").count() === 1);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  await ctx.close();

  /* Sans compte il n'y a pas de jardin à nommer : le titre porte la seule
     action qui vaille et la feuille s'ouvre d'elle-même à la première venue. */
  j.section("sans compte, l'entrée ne se cherche pas");
  const b = await ouvrirContexte(navigateur, { session: false });
  j.controle("le titre annonce la connexion",
    net(await b.pg.locator("#titreJardin").innerText()) === "Se connecter",
    net(await b.pg.locator("#titreJardin").innerText()));
  j.controle("la feuille du compte est déjà ouverte",
    await b.pg.locator("#feuille:not([hidden])").count() === 1
    && net(await b.pg.locator("#feuille-titre").innerText()) === "Compte");
  j.controle("elle porte le formulaire de connexion",
    await b.pg.locator("#feuille-corps #form-connexion").count() === 1);
  j.controle("le panneau du compte se tait, il n'a rien à dire",
    await b.pg.locator("#feuille-corps #panneau-compte[hidden]").count() === 1);
  await b.pg.locator("#fermerFeuille").click();
  await b.pg.waitForTimeout(400);
  await b.pg.locator("#btnJardin").click();
  await b.pg.waitForTimeout(600);
  j.controle("le titre rouvre le compte, jamais un jardin qui n'existe pas",
    net(await b.pg.locator("#feuille-titre").innerText()) === "Compte");
  await b.ctx.close();

  return j.fin(erreurs.concat(b.erreurs));
}
