/* Ce qui sort du jardin se demande avant de partir.

   La rangée de Mes plantes portait un rond toujours coché, qui ne distinguait
   donc rien, et dont une seule touche retirait la plante du jardin et de tous
   ses emplacements, sans un mot. Le rond reste au catalogue, seul endroit où il
   apprend quelque chose et où l'on compose le jardin.

   Les suppressions d'un espace, d'une zone et d'une entrée du journal
   demandaient déjà confirmation. Manquaient le retrait d'une plante, le vidage
   du jardin entier et l'effacement d'une année de culture. Les contrôles
   portent sur la question posée, sur ce qu'elle nomme, et sur le fait qu'un
   refus ne change rien. */
import { ouvrirContexte, journal, ouvrirMesPlantes, ouvrirListeDesPlantes,
         net, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const AU_JARDIN = PLANTES.slice(0, 12).map(p => p.id);
const ESPACES = [{ id: "e1", name: "Potager", color: "#7BA05B" },
                 { id: "e2", name: "Verger" }];
/* La première plante occupe deux lieux, la deuxième un seul, la sixième aucun :
   les trois formes de la question se mesurent sur le même jardin. */
const PLACEMENTS = [
  { plant_id: PLANTES[0].id, espace_id: "e1" },
  { plant_id: PLANTES[0].id, espace_id: "e2" },
  { plant_id: PLANTES[1].id, espace_id: "e1" },
];

const coches = pg => pg.locator('#listes .item[aria-pressed="true"]').count();

export default async function essai(navigateur) {
  const j = journal("Retraits du jardin");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { jardin: AU_JARDIN, espaces: ESPACES, placements: PLACEMENTS });
  await pg.waitForTimeout(800);

  let question = null, reponse = "refuser";
  pg.on("dialog", d => {
    question = d.message();
    if (reponse === "refuser") d.dismiss(); else d.accept();
  });

  /* Au jardin toutes les rangées sont cochées : le rond n'y disait rien et
     portait pourtant le geste le plus lourd de l'écran. */
  j.section("le rond a quitté Mes plantes");
  await ouvrirMesPlantes(pg);
  j.controle("aucune rangée ne porte de rond",
    await pg.locator("#listes .rond").count() === 0
    && await pg.locator("#listes .item-bloc").count() > 0,
    await pg.locator("#listes .item-bloc").count() + " rangées");
  /* « Tout décocher » n'a plus de case à décocher ici, et il y viderait le
     jardin entier depuis un écran de consultation. */
  j.controle("tout décocher n'est pas offert",
    await pg.locator("#vider[hidden]").count() === 1);
  j.controle("le pied mène au catalogue, où le jardin se compose",
    await pg.locator("#piedPlantes:not([hidden]) #versCatalogue").count() === 1);

  j.section("le rond reste au catalogue");
  await ouvrirListeDesPlantes(pg);
  j.controle("chaque rangée le porte",
    await pg.locator("#listes .rond").count()
      === await pg.locator("#listes .item-bloc").count(),
    await pg.locator("#listes .rond").count() + " ronds");
  j.controle("tout décocher y est offert",
    await pg.locator("#vider:not([hidden])").count() === 1);

  /* La question compte les emplacements : un placement se fait un à un dans les
     espaces et les zones, il ne se refait pas d'une touche. */
  j.section("le retrait d'une plante se demande, et nomme ce qui part avec elle");
  const avant = await coches(pg);
  const oter = async p => {
    await pg.locator(`.item-bloc[data-plante="${p.id}"] .rond`).click();
    await pg.waitForTimeout(450);
    return question;
  };
  j.controle("deux emplacements sont comptés",
    await oter(PLANTES[0]) === "Retirer le figuier du jardin ? Ses 2 emplacements sont perdus.",
    question);
  j.controle("un seul se dit au singulier",
    await oter(PLANTES[1]) === "Retirer la fraise du jardin ? Son emplacement est perdu.",
    question);
  j.controle("sans emplacement, la question s'arrête là",
    await oter(PLANTES[5]) === "Retirer le pommier du jardin ?", question);
  j.controle("trois refus, et le jardin est intact",
    await coches(pg) === avant, `${avant} avant, ${await coches(pg)} après`);

  j.section("accepté, le retrait se fait");
  reponse = "accepter";
  await oter(PLANTES[0]);
  await pg.waitForTimeout(400);
  j.controle("la plante a quitté le jardin", await coches(pg) === avant - 1,
    `${avant} puis ${await coches(pg)}`);
  j.controle("sa rangée n'est plus cochée",
    await pg.locator(`.item-bloc[data-plante="${PLANTES[0].id}"] .item`)
      .getAttribute("aria-pressed") === "false");

  /* L'ajout ne demande rien : il ne défait aucun geste. */
  j.section("l'ajout ne demande rien");
  question = null;
  await pg.locator(`.item-bloc[data-plante="${PLANTES[0].id}"] .rond`).click();
  await pg.waitForTimeout(500);
  j.controle("cocher une plante ne pose aucune question", question === null, question);
  j.controle("elle est revenue au jardin", await coches(pg) === avant);

  /* Vider le jardin entier était la suppression la plus large de
     l'application, et elle tenait sur un lien nommé « Tout décocher ». */
  j.section("vider le jardin se demande, et se compte");
  reponse = "refuser";
  await pg.locator("#basculeFiltresS").click();
  await pg.waitForTimeout(300);
  await pg.locator("#vider").click();
  await pg.waitForTimeout(500);
  j.controle("la question compte les plantes et nomme leurs emplacements",
    question === `Retirer les ${avant} plantes du jardin ? `
      + "Leurs emplacements dans les espaces partent avec elles.", question);
  j.controle("refusée, le jardin est intact", await coches(pg) === avant);
  reponse = "accepter";
  await pg.locator("#vider").click();
  await pg.waitForTimeout(700);
  j.controle("acceptée, le jardin est vide", await coches(pg) === 0,
    await coches(pg) + " restantes");

  await ctx.close();
  return j.fin(erreurs);
}
