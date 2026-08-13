/* La feuille de la saison. Elle alignait quatre dates de climat, vraies en
   janvier comme en août, et que le ruban portait déjà en position et en durée.
   Elle dit maintenant le temps qui reste et ce que ce temps change au jardin :
   les dernières récoltes avant la gelée, celles qui la passent, la marge quand
   elle tombe à une quinzaine, ce que la gelée déclenche, et le passage du jour
   sous dix heures, qui en est la cause.

   Rien de tout cela n'est stocké : ce sont des croisements entre les fenêtres
   de chaque fiche et la borne du climat, plus un calcul d'astronomie. Les
   contrôles portent donc sur le texte rendu, seul endroit où l'erreur se voit,
   et sur les quatre étapes de la végétation, qui ne s'observent pas toutes le
   même jour. */
import { ouvrirContexte, journal, catalogueAvecProduction, PRODUCTION,
         net } from "./commun.mjs";

const par = n => (PRODUCTION.find(p => p.name === n) || {}).id;
/* Quatre plantes choisies pour toucher chaque cas. La tomate gèle et se récolte
   jusqu'à la veille de la gelée, la capucine gèle sans rien donner à récolter,
   le chou rouge se récolte après elle, la framboise ne craint rien. */
const JARDIN = ["Tomate", "Capucine", "Chou rouge", "Framboise"].map(par);

// Bornes du climat océanique dégradé dans le référentiel figé : 6, 12, 19, 21.
const AOUT = new Date("2026-08-02T09:00:00+02:00").getTime();
const OCTOBRE = new Date("2026-10-05T09:00:00+02:00").getTime();
const DECEMBRE = new Date("2026-12-20T09:00:00+01:00").getTime();
const AVRIL = new Date("2026-04-10T09:00:00+02:00").getTime();

async function feuilleSaison(navigateur, jour) {
  const c = await ouvrirContexte(navigateur,
    { catalogue: catalogueAvecProduction(), jardin: JARDIN, jour });
  await c.pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await c.pg.waitForTimeout(350);
  await c.pg.locator('#blocTemps .mesure-j[data-vue="saison"]').click();
  await c.pg.waitForTimeout(700);
  c.lire = async sel => net(await c.pg.locator("#feuille-corps " + sel).allInnerTexts()
    .then(l => l.join(" ")));
  c.paras = (await c.pg.locator("#feuille-corps p:not(.rv-leg)").allInnerTexts()).map(net);
  c.texte = c.paras.join(" ");
  // La ligne où le propos se tient, pour que l'écart se lise sans la feuille entière.
  c.para = mot => c.paras.find(t => t.includes(mot)) || "ligne absente";
  return c;
}

export default async function essai(navigateur) {
  const j = journal("Feuille de la saison");

  /* Le deux août, en pleine saison, la feuille porte tout ce qu'elle sait dire.
     C'est le seul jour où les huit lignes coexistent. */
  const a = await feuilleSaison(navigateur, AOUT);

  j.section("le ruban reste, la liste des quatre dates est partie");
  j.controle("le ruban porte ses cinq bandes",
    await a.pg.locator("#feuille-corps .ra-s").count() === 5);
  j.controle("les quatre étapes sont nommées en légende",
    await a.lire(".rv-leg") === "repos reprise pleine saison ralentissement",
    await a.lire(".rv-leg"));
  /* Le ruban dit déjà les quatre bornes, en place et en longueur. Les répéter
     en liste, c'était la seule part de la feuille qui ne bougeait jamais. */
  j.controle("aucune liste de dates ne double le ruban",
    await a.pg.locator("#feuille-corps dl").count() === 0);

  j.section("le temps qui reste ouvre la feuille");
  const reste = await a.lire(".sa-reste");
  /* Du deux août au premier octobre, soixante jours : neuf semaines. Le compte
     se dit en semaines, les bornes du référentiel étant des quinzaines. */
  j.controle("l'étape en cours et ce qui lui reste",
    reste.startsWith("Pleine saison encore 9 semaines, ralentissement début octobre."),
    reste);
  j.controle("la gelée suit, avec son propre délai",
    /Première gelée attendue début novembre, dans 13 semaines\.$/.test(reste), reste);
  j.controle("le sous-titre nomme l'étape",
    net(await a.pg.locator("#feuille-titre").innerText()).endsWith("pleine saison"),
    net(await a.pg.locator("#feuille-titre").innerText()));

  /* La tomate se récolte jusqu'à fin octobre, la gelée est attendue début
     novembre : une quinzaine d'écart, et la fin de récolte se joue sur la date
     d'une gelée. C'est le seul énoncé de la feuille qui ne soit ni une date ni
     une liste. */
  j.section("la marge se dit quand elle tombe à une quinzaine");
  j.controle("elle nomme la plante, la date et la conséquence",
    a.para("se récolte jusqu'à") === "La tomate se récolte jusqu'à fin octobre, à une "
      + "quinzaine de la première gelée : une gelée précoce coupe la fin de la récolte.",
    a.para("se récolte jusqu'à"));
  /* La ligne des dernières récoltes tombe quand la marge les nomme toutes :
     elle porterait les mêmes noms et la même date. */
  j.controle("elle remplace la ligne des dernières récoltes",
    !a.texte.includes("Dernières récoltes"), a.para("Dernières récoltes"));

  j.section("la gelée ferme la saison sans fermer le jardin");
  j.controle("ce qui se récolte après elle est nommé",
    a.para("après la gelée") === "Récoltes après la gelée : le chou rouge début décembre.",
    a.para("après la gelée"));
  /* La framboise se récolte jusqu'à fin octobre elle aussi, mais elle tient à
     moins vingt-cinq : la gelée ne l'arrête pas, elle n'a rien à faire dans ces
     lignes. */
  j.controle("une plante rustique n'y paraît pas",
    !a.texte.includes("framboise"), a.para("framboise"));

  j.section("la gelée déclenche les protections");
  j.controle("elles sont nommées et datées",
    a.para("protection") === "La tomate et la capucine demandent une protection à "
      + "partir de début octobre.", a.para("protection"));
  /* La capucine gèle et ne se récolte pas : la ligne des récoltes ne peut pas
     la nommer, celle des exposées la rattrape. */
  j.controle("une gélive sans récolte est rattrapée",
    a.para("exposée") === "Également exposée à la première gelée : la capucine.",
    a.para("exposée"));

  /* Sous dix heures de jour la végétation se conserve sans plus pousser : c'est
     la cause de la fin de saison, quand les bornes n'en donnent que la date.
     Calcul d'astronomie à la latitude du jardin, 47,58 nord. */
  j.section("le passage sous dix heures explique la fin de saison");
  j.controle("il est daté et sa portée est dite",
    a.para("dix heures") === "Le jour passe sous dix heures le 2 novembre. En deçà, "
      + "la végétation se conserve sans plus pousser.", a.para("dix heures"));
  j.controle("la note ne cite que les sources de ce qui est à l'écran",
    await a.lire(".f-note") === "Bornes de saison par climat, table du référentiel. "
      + "Fenêtres de récolte et de protection, seuil de gel : fiche de chaque plante. "
      + "Passage sous dix heures calculé au point du jardin.", await a.lire(".f-note"));
  await a.ctx.close();

  /* Le cinq octobre, la gelée est la borne suivante : la feuille ne l'annonce
     qu'une fois. */
  j.section("au ralentissement, la gelée ne se dit pas deux fois");
  const o = await feuilleSaison(navigateur, OCTOBRE);
  const rO = await o.lire(".sa-reste");
  j.controle("elle est la borne suivante, et rien de plus",
    rO === "Ralentissement encore 4 semaines, première gelée début novembre.", rO);
  j.controle("les conséquences sont toujours là",
    o.texte.includes("Récoltes après la gelée")
    && o.texte.includes("demandent une protection"), o.paras.length + " lignes");
  await o.ctx.close();

  /* Le vingt décembre, la gelée est passée. Annoncer celle de l'automne suivant,
     à dix mois de là, et les récoltes qui l'entourent, encombrerait la feuille
     de dates qui ne commandent rien. */
  j.section("au repos, la feuille se tait sur l'automne");
  const d = await feuilleSaison(navigateur, DECEMBRE);
  const rD = await d.lire(".sa-reste");
  j.controle("elle compte vers la reprise",
    rD === "Repos végétatif encore 12 semaines, reprise fin mars.", rD);
  j.controle("aucune gelée, aucune récolte, aucune protection",
    !d.paras.filter(t => !t.startsWith("Bornes de saison"))
      .some(t => /gelée|récolte|protection/i.test(t)), d.texte);
  /* Le seuil se lit à l'envers : c'est le retour au-dessus de dix heures qui
     approche, et lui seul intéresse en décembre. */
  j.controle("le seuil de dix heures se lit dans l'autre sens",
    d.para("dix heures") === "Le jour repasse au-dessus de dix heures le 11 février. "
      + "Au-delà, la végétation peut repartir.", d.para("dix heures"));
  await d.ctx.close();

  /* Le dix avril, la gelée est à sept mois : la feuille ne parle que de ce qui
     vient. Le seuil de dix heures est logé à la même enseigne, son prochain
     passage étant celui de novembre. */
  j.section("à la reprise, la feuille ne parle que de ce qui vient");
  const v = await feuilleSaison(navigateur, AVRIL);
  const rV = await v.lire(".sa-reste");
  j.controle("elle compte vers la pleine saison",
    rV === "Reprise de végétation encore 10 semaines, pleine saison fin juin.", rV);
  j.controle("elle ne dit rien de novembre",
    !/novembre|décembre/.test(v.texte), v.texte);
  j.controle("il ne reste que le ruban, le compte et la source",
    await v.pg.locator("#feuille-corps p:not(.rv-leg)").count() === 2,
    await v.pg.locator("#feuille-corps p:not(.rv-leg)").count());
  await v.ctx.close();

  return j.fin(a.erreurs.concat(o.erreurs, d.erreurs, v.erreurs));
}
