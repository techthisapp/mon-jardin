/* Vigilance météorologique. Le bandeau ne paraît qu'à partir du jaune, il
   annonce l'échéance quand l'alerte est pour demain, et il porte le geste au
   jardin qui correspond à l'aléa. */
import { ouvrirContexte, journal, net } from "./commun.mjs";

const EMIS = "2026-08-02T04:00:31Z";
const CAS = {
  jaune: [
    { departement: "21", echeance: "J", couleur: 2, phenomenes: [{ id: 6, couleur: 2 }],
      texte: "Faits nouveaux : Prévisions confirmées. Situation générale : Épisode caniculaire sur le sud et l'est de la région.",
      emis_le: EMIS },
    { departement: "21", echeance: "J1", couleur: 2, phenomenes: [{ id: 6, couleur: 2 }], texte: null, emis_le: EMIS },
  ],
  orangeDemain: [
    { departement: "21", echeance: "J", couleur: 2, phenomenes: [{ id: 6, couleur: 2 }], texte: null, emis_le: EMIS },
    { departement: "21", echeance: "J1", couleur: 3, phenomenes: [{ id: 3, couleur: 3 }, { id: 1, couleur: 2 }],
      texte: "Situation générale : Orages violents attendus en soirée.", emis_le: EMIS },
  ],
  vert: [
    { departement: "21", echeance: "J", couleur: 1, phenomenes: [], texte: null, emis_le: EMIS },
  ],
};

export default async function essai(navigateur) {
  const j = journal("Vigilance météorologique");
  const erreurs = [];

  for (const [nom, vigilance] of Object.entries(CAS)) {
    const c = await ouvrirContexte(navigateur, { vigilance });
    erreurs.push(...c.erreurs);
    const n = await c.pg.locator(".bd-vigi").count();
    const texte = n ? net(await c.pg.locator(".bd-vigi").innerText()) : "";

    j.section("cas " + nom);
    if (nom === "vert") {
      j.controle("aucun bandeau au niveau vert", n === 0, texte);
    } else {
      j.controle("un bandeau paraît", n === 1);
    }

    if (nom === "jaune") {
      j.controle("la couleur et l'aléa sont nommés",
        /Vigilance jaune/.test(texte) && /canicule/.test(texte), texte.slice(0, 60));
      j.controle("le geste au jardin suit", /arroser tôt|ombrer|pailler/.test(texte));
      j.controle("aucune mention d'échéance pour aujourd'hui", !/demain/.test(texte));
      await c.pg.locator(".bd-vigi").click();
      await c.pg.waitForTimeout(700);
      const feuille = net(await c.pg.locator("#feuille-corps").innerText());
      j.controle("la feuille détaille les deux échéances",
        /aujourd'hui/.test(feuille) && /demain/.test(feuille));
      j.controle("le bulletin du département est repris",
        /Épisode caniculaire/.test(feuille));
      j.controle("la source et la date d'émission sont portées",
        /Météo-France/.test(feuille) && /émise le/.test(feuille));
    }

    if (nom === "orangeDemain") {
      j.controle("l'orange de demain l'emporte sur le jaune du jour",
        /Vigilance orange/.test(texte), texte.slice(0, 60));
      j.controle("l'échéance est annoncée", /demain/.test(texte));
      j.controle("le geste correspond à l'orage",
        /rentrer ce qui peut voler|grêle/.test(texte));
    }

    await c.ctx.close();
  }

  return j.fin(erreurs);
}
