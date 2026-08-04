/* Pluie mesurée au poste de Météo-France. Le poste rattaché au jardin fournit
   la lame d'eau à la place du modèle, et les valeurs douteuses sont écartées. */
import { ouvrirContexte, journal, net, nombre } from "./commun.mjs";

// Relevés réels du poste de Montbard, tels que collectés en base. La ligne du
// 20 juillet porte un indicateur de qualité de 2 : elle ne doit pas être retenue.
const PLUIES = [
  { num: "21425001", jour: "2026-07-13", rr_mm: 9.2, qualite: 1 },
  { num: "21425001", jour: "2026-07-15", rr_mm: 3.0, qualite: 1 },
  { num: "21425001", jour: "2026-07-16", rr_mm: 0.0, qualite: 1 },
  { num: "21425001", jour: "2026-07-17", rr_mm: 24.8, qualite: 1 },
  { num: "21425001", jour: "2026-07-20", rr_mm: 0.0, qualite: 2 },
  { num: "21425001", jour: "2026-07-29", rr_mm: 0.0, qualite: 1 },
  { num: "21425001", jour: "2026-07-30", rr_mm: 1.0, qualite: 1 },
  ...["24", "25", "26", "27", "28", "31"].map(d =>
    ({ num: "21425001", jour: "2026-07-" + d, rr_mm: 0.0, qualite: 1 })),
];

export default async function essai(navigateur) {
  const j = journal("Poste de mesure et pluie relevée");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur, { pluies: PLUIES });

  // Les trois mesures du jour vivent dans la feuille du jour, ouverte par la date.
  await pg.locator("#dateJour").click();
  await pg.waitForTimeout(500);
  await pg.locator('.tm-puce[data-vue="eau"]').click();
  await pg.waitForTimeout(800);
  const corps = net(await pg.locator("#feuille-corps").innerText());

  j.section("identité du poste");
  j.controle("le poste est nommé en clair", corps.includes("Montbard"),
    (corps.match(/Poste de mesure.{0,60}/) || [""])[0]);
  const km = nombre((corps.match(/à ([\d,]+) km/) || [, "0"])[1]);
  j.controle("sa distance est plausible", km > 0 && km < 40, km + " km");

  j.section("part des jours mesurés");
  const mesures = Number((corps.match(/(\d+) des trente derniers jours/) || [, "0"])[1]);
  j.controle("le compte des jours mesurés vaut celui des relevés retenus",
    mesures === PLUIES.filter(p => p.qualite <= 1).length, mesures + " jours");
  j.controle("la valeur douteuse est écartée", mesures === PLUIES.length - 1,
    PLUIES.length + " relevés fournis, " + mesures + " retenus");

  j.section("lecture du graphique");
  j.controle("la légende distingue les quatre origines",
    (await pg.locator(".mt-leg i").count()) === 4);
  const barres = await pg.locator(".mt-bp.poste").count();
  j.controle("des barres viennent du poste", barres > 0, barres + " barres");
  j.controle("aucune barre de relevé personnel sans saisie",
    (await pg.locator(".mt-bp.mesure").count()) === 0);

  await ctx.close();
  return j.fin(erreurs);
}
