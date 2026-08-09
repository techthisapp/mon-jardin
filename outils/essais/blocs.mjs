/* Blocs d'attributs de la fiche : usage lu dans sa colonne, feuillage lu dans
   la sienne, rusticité réduite à ce que la jauge de gel n'énonce pas,
   associations débarrassées de l'écho de l'usage, et ressource pour les
   butineurs limitée aux plantes que la liste Val'hor cote. */
import { ouvrirContexte, journal, catalogueAvecProduction, PRODUCTION,
         ouvrirListeDesPlantes, ouvrirFiche, fermerFiche, ongletAnnee, ongletIdentite, net } from "./commun.mjs";

/* Toutes les paires étiquette et valeur des blocs de la fiche. Culture est dans
   l'onglet de l'année, Intérêt et Identité dans celui de l'identité. Le bloc
   des caractères s'appelait Au jardin, nom passé à l'onglet du jardinier. */
const ONGLET_DU_BLOC = { "Culture": ongletAnnee, "Intérêt": ongletIdentite,
                         "Identité": ongletIdentite };
async function lireBlocs(pg, nom) {
  await ouvrirFiche(pg, nom);
  const paires = {};
  let ici = null;
  for (const titre of ["Culture", "Intérêt", "Identité"]) {
    const aller = ONGLET_DU_BLOC[titre];
    if (aller !== ici) { await aller(pg); ici = aller; }
    const bloc = pg.locator(".f-bloc", { hasText: titre }).first();
    if (!await bloc.count()) continue;
    const dts = await bloc.locator("dt").allInnerTexts();
    const dds = await bloc.locator("dd").allInnerTexts();
    dts.forEach((d, i) => paires[net(d)] = net(dds[i] || ""));
  }
  await fermerFiche(pg);
  return paires;
}

/* Les libellés des jauges de l'onglet du moment, dans leur ordre d'affichage. */
async function lireJauges(pg, nom) {
  await ouvrirFiche(pg, nom);
  const t = await pg.locator(".f-jauges .f-jt").allInnerTexts();
  await fermerFiche(pg);
  return t.map(net);
}

export default async function essai(navigateur) {
  const j = journal("Blocs d'attributs de la fiche");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { catalogue: catalogueAvecProduction() });
  await ouvrirListeDesPlantes(pg);

  j.section("usage, une seule ligne, la note sourcée en tête");
  for (const nom of ["Angélique", "Buddleia", "Lavande", "Hortensia"]) {
    const p = PRODUCTION.find(x => x.name === nom);
    const v = await lireBlocs(pg, nom);
    j.controle(nom, v["Usage"] === net(p.attributes.usage_note), v["Usage"]);
  }

  const glycine = await lireBlocs(pg, "Glycine");
  j.section("la couleur de fleur n'a pas de ligne, la légende la porte");
  j.controle("aucune ligne Fleurs", !("Fleurs" in glycine), Object.keys(glycine).join(", "));

  j.section("feuillage");
  j.controle("glycine, feuillage caduc", glycine["Feuillage"] === "Caduc", glycine["Feuillage"]);

  j.section("voisinage, seulement ce qu'une source établit");
  const lavande = await lireBlocs(pg, "Lavande");
  j.controle("lavande, aucune ligne, ses associations étaient de tradition",
    !("Voisinage" in lavande), lavande["Voisinage"]);
  const tomate = await lireBlocs(pg, "Tomate");
  j.controle("tomate, l'œillet d'Inde est conservé avec son effet",
    tomate["Voisinage"] === "Œillet d'Inde, ralentit l'installation de l'aleurode des serres",
    tomate["Voisinage"]);
  const framboise = await lireBlocs(pg, "Framboise");
  j.controle("framboise, l'antagonisme est énoncé",
    framboise["Voisinage"] === "À isoler des solanacées et du fraisier, verticilliose partagée",
    framboise["Voisinage"]);
  const menthe = await lireBlocs(pg, "Menthe");
  j.controle("menthe, la plante traçante est signalée",
    /^À isoler/.test(menthe["Voisinage"] || ""), menthe["Voisinage"]);

  j.section("le voisinage arrive au moment de choisir la place");
  await ouvrirFiche(pg, "Fraise");
  const fraise = net(await pg.locator(".f-pan-moment").innerText());
  j.controle("fraise, le voisinage suit le geste de plantation",
    /Voisinage\s*Ail, réduit les acariens/.test(fraise),
    (fraise.match(/Voisinage[^.]{0,60}/) || [""])[0]);
  const sousPlantation = await pg.evaluate(() => {
    const v = document.querySelector(".f-vois");
    if (!v) return null;
    return v.closest(".f-acte").querySelector("h4").textContent;
  });
  j.controle("il est rattaché à la plantation et non à une autre tâche",
    /Plantation|Semis/.test(sousPlantation || ""), sousPlantation);
  await fermerFiche(pg);
  await ouvrirFiche(pg, "Buddleia");
  j.controle("aucune note de voisinage sur une plante qui n'en porte pas",
    await pg.locator(".f-vois").count() === 0);
  await fermerFiche(pg);

  j.section("nectar et pollen, seulement là où une source cote la plante");
  j.controle("lavande, la ligne Nectar porte le libellé du vocabulaire",
    lavande["Nectar"] === "Mellifère", lavande["Nectar"]);
  j.controle("tomate, aucune ligne Nectar, la liste ne la cote pas",
    !("Nectar" in tomate), tomate["Nectar"]);
  const jauges = await lireJauges(pg, "Lavande");
  j.controle("lavande, la jauge annonce le nectar seul",
    jauges.indexOf("Surtout du nectar") !== -1, jauges.join(", "));
  const lierre = await lireJauges(pg, "Lierre");
  j.controle("lierre, la jauge annonce les deux ressources",
    lierre.indexOf("Nectar et pollen") !== -1, lierre.join(", "));
  const jTomate = await lireJauges(pg, "Tomate");
  j.controle("tomate, aucune jauge de butineurs",
    !jTomate.some(t => /nectar|pollen|butineur/i.test(t)), jTomate.join(", "));

  j.section("parfum, l'organe et non l'intensité");
  j.controle("lavande, la fleur et le feuillage",
    lavande["Parfum"] === "Fleurs et feuillage", lavande["Parfum"]);
  j.controle("glycine, la fleur seule", glycine["Parfum"] === "Fleurs", glycine["Parfum"]);
  j.controle("tomate, aucune ligne Parfum, la source ne l'établit pas",
    !("Parfum" in tomate), tomate["Parfum"]);

  /* Le nom accepté n'est énoncé que lorsqu'il apprend quelque chose. Un
     rabattement de rang et une marque d'hybride ne sont pas des divergences. */
  j.section("le nom accepté, seulement quand il diverge vraiment");
  const prim = await lireBlocs(pg, "Primevère");
  j.controle("primevère, le nom accepté est écrit",
    prim["Nom accepté"] === "Primula acaulis", prim["Nom accepté"]);
  const radis = await lireBlocs(pg, "Radis");
  j.controle("radis, le rabattement de rang ne dit rien",
    !("Nom accepté" in radis), radis["Nom accepté"]);
  const fra = await lireBlocs(pg, "Fraise");
  j.controle("fraise, la marque d'hybride seule ne dit rien",
    !("Nom accepté" in fra), fra["Nom accepté"]);
  const hort = await lireBlocs(pg, "Hortensia");
  j.controle("hortensia, l'épithète répétée n'est écrite qu'une fois",
    hort["Nom accepté"] === "Hydrangea serrata", hort["Nom accepté"]);

  /* L'entête écrit le nom latin suivi de la famille : le bloc ne la reprend
     pas. Le contrôle porte sur les deux moitiés de la règle, l'absence dans le
     bloc et la présence dans l'entête, faute de quoi la famille pourrait
     disparaître de la fiche sans que rien ne le signale. */
  j.section("la famille est écrite une fois, dans l'entête");
  j.controle("le bloc ne la reprend pas", !("Famille" in prim), prim["Famille"]);
  await ouvrirFiche(pg, "Primevère");
  const entete = net(await pg.locator(".feuille-latin").innerText());
  j.controle("l'entête porte le nom latin et la famille",
    /Primula vulgaris/.test(entete) && /Primulaceae/.test(entete), entete);
  await fermerFiche(pg);

  j.section("rusticité, la nuance seule quand le seuil est connu");
  j.controle("lavande, la nuance sans la classe",
    lavande["Rusticité"] === "Craint l'humidité", lavande["Rusticité"]);
  j.controle("glycine, classe muette car la jauge donne le seuil",
    !("Rusticité" in glycine), glycine["Rusticité"]);
  const chou = await lireBlocs(pg, "Chou rouge");
  j.controle("chou rouge, classe affichée faute de seuil",
    chou["Rusticité"] === "Rustique", chou["Rusticité"]);

  await ctx.close();
  return j.fin(erreurs);
}
