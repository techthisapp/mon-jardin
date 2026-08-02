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

  j.section("associations sans écho de l'usage");
  const lavande = await lireBlocs(pg, "Lavande");
  j.controle("lavande, bordure et rocaille retirées",
    lavande["Associations"] === "Pied de rosier", lavande["Associations"]);
  const angelique = await lireBlocs(pg, "Angélique");
  j.controle("angélique, associations intactes faute de recoupement",
    angelique["Associations"] === "Fond de massif, bord d'eau", angelique["Associations"]);

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
