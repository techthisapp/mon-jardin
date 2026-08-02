/* Blocs d'attributs de la fiche : usage lu dans sa colonne, feuillage lu dans
   la sienne, rusticité réduite à ce que la jauge de gel n'énonce pas, et
   associations débarrassées de l'écho de l'usage. */
import { ouvrirContexte, journal, catalogueAvecProduction, PRODUCTION,
         ouvrirListeDesPlantes, ouvrirFiche, fermerFiche, ongletAnnee, net } from "./commun.mjs";

/* Toutes les paires étiquette et valeur des trois blocs de l'onglet annuel. */
async function lireBlocs(pg, nom) {
  await ouvrirFiche(pg, nom);
  await ongletAnnee(pg);
  const paires = {};
  for (const titre of ["Identité", "Culture", "Au jardin"]) {
    const bloc = pg.locator(".f-bloc", { hasText: titre }).first();
    if (!await bloc.count()) continue;
    const dts = await bloc.locator("dt").allInnerTexts();
    const dds = await bloc.locator("dd").allInnerTexts();
    dts.forEach((d, i) => paires[net(d)] = net(dds[i] || ""));
  }
  await fermerFiche(pg);
  return paires;
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
