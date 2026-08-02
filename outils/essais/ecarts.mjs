/* Écarts entre la base et l'affichage, corrigés le 2 août. Le conseil général
   de la plante, le conseil de multiplication des plantes sans période de
   multiplication, la couleur de fleur dominante et le conseil propre à la
   période en cours. Les lignes servies sont celles de production. */
import { ouvrirContexte, journal, catalogueAvecProduction, PRODUCTION,
         ouvrirListeDesPlantes, ouvrirFiche, fermerFiche, ongletAnnee, net } from "./commun.mjs";

const ACTIVES = PRODUCTION.filter(p => p.is_active);

export default async function essai(navigateur) {
  const j = journal("Écarts entre la base et l'affichage");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { catalogue: catalogueAvecProduction() });
  await ouvrirListeDesPlantes(pg);

  j.section("conseil général de la plante, en tête de fiche");
  for (const p of ACTIVES) {
    await ouvrirFiche(pg, p.name);
    const intro = net(await pg.locator(".f-intro").first().innerText().catch(() => ""));
    j.controle(p.name, intro === net(p.advice || ""), intro.slice(0, 55));
    await fermerFiche(pg);
  }

  j.section("conseil de multiplication dans le bloc Culture");
  for (const nom of ["Chou rouge", "Lierre", "Glycine"]) {
    const p = ACTIVES.find(x => x.name === nom);
    await ouvrirFiche(pg, nom);
    await ongletAnnee(pg);
    const note = net(await pg.locator(".f-kv dd.avec-note .kv-note").first().innerText().catch(() => ""));
    j.controle(nom, note === net(p.guide.multiplication || ""), note.slice(0, 55));
    await fermerFiche(pg);
  }

  j.section("couleur de fleur, la dominante en tête");
  const attendu = {
    "Glycine": "Fleurs mauves et blanches",
    "Aster d'automne": "Fleurs mauves et roses",
    "Airelle rouge": "Fleurs blanches et roses",
    "Lierre": "Fleurs jaunes",
  };
  for (const nom of Object.keys(attendu)) {
    await ouvrirFiche(pg, nom);
    await ongletAnnee(pg);
    const leg = net(await pg.locator(".f-legende").first().innerText().catch(() => ""));
    const pastilles = await pg.locator(".f-legende i").count();
    const n = (ACTIVES.find(x => x.name === nom).flower_colors || []).slice(0, 2).length;
    j.controle(nom, leg.startsWith(attendu[nom]) && pastilles === n,
      leg.slice(0, 50) + ", " + pastilles + " pastilles");
    await fermerFiche(pg);
  }

  j.section("conseil propre à la période en cours");
  await ouvrirFiche(pg, "Glycine");
  const vu = net(await pg.locator(".f-pan-moment").innerText());
  j.controle("glycine, taille d'été et non taille d'hiver",
    vu.includes("Taille d'été") && !/Taille d'hiver/.test(vu),
    (vu.match(/Taille d'[^.]*\./) || [""])[0]);
  await ongletAnnee(pg);
  const marques = await pg.locator(".kv-note .terme").allInnerTexts();
  j.controle("le glossaire marque les termes du conseil de multiplication",
    marques.length > 0, JSON.stringify(marques));

  await ctx.close();
  return j.fin(erreurs);
}
