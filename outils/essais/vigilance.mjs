/* Vigilance météorologique. Le bandeau ne paraît qu'à partir du jaune, il
   annonce l'échéance quand l'alerte est pour demain, et il porte le geste au
   jardin qui correspond à l'aléa. */
import { ouvrirContexte, journal, net, METEO } from "./commun.mjs";

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

  /* Tout ce que le temps demande au jardin tient dans une seule carte, et cette
     carte prend la teinte de la ligne la plus grave. Deux cartes empilées
     faisaient lire deux sujets là où il n'y a qu'un ciel. */
  j.section("une seule carte pour le temps, teintée par le plus grave");
  const scene = async (vigilance, retouche) => {
    const d = JSON.parse(METEO);
    retouche(d);
    const c = await ouvrirContexte(navigateur, { vigilance, meteo: JSON.stringify(d) });
    erreurs.push(...c.erreurs);
    const r = await c.pg.evaluate(() => {
      const cartes = document.querySelectorAll(".bd-carte");
      const k = cartes[0];
      return { cartes: cartes.length,
        ton: k ? (k.className.match(/t-[a-z0-9]+/) || [""])[0] : "",
        lignes: k ? [...k.querySelectorAll(".bd-alerte")].map(e => e.textContent.replace(/\s+/g, " ").trim()) : [] };
    });
    await c.ctx.close();
    return r;
  };
  const IJOUR = 31;   // 2026-08-02 dans la série du jeu d'essai
  const pluie = d => {
    d.daily.precipitation_sum = d.daily.precipitation_sum.map((v, k) => k === IJOUR ? 19 : 0);
    d.daily.et0_fao_evapotranspiration = d.daily.et0_fao_evapotranspiration.map(() => 6);
  };

  const jauneEau = await scene(CAS.jaune, d => {
    d.daily.temperature_2m_max = d.daily.temperature_2m_max.map(() => 26);
    pluie(d);
  });
  j.controle("la vigilance et la lame d'eau tiennent dans une seule carte",
    jauneEau.cartes === 1 && jauneEau.lignes.length === 2,
    jauneEau.cartes + " carte, " + jauneEau.lignes.length + " lignes");
  j.controle("la carte prend le jaune de la vigilance", jauneEau.ton === "t-v2", jauneEau.ton);
  j.controle("la vigilance passe avant la lame d'eau",
    /Vigilance/.test(jauneEau.lignes[0]) && /mm attendus/.test(jauneEau.lignes[1]),
    jauneEau.lignes.join(" | ").slice(0, 70));

  const eauSeule = await scene([], d => {
    d.daily.temperature_2m_max = d.daily.temperature_2m_max.map(() => 26);
    pluie(d);
  });
  j.controle("sans vigilance, la carte prend le bleu de l'eau",
    eauSeule.cartes === 1 && eauSeule.ton === "t-eau", eauSeule.ton);

  /* Le jaune du cas de tête est une canicule, qui couvre déjà l'alerte de
     chaleur et la fait taire. Pour voir la chaleur et la vigilance ensemble, il
     faut un aléa qui ne la couvre pas : l'orage. */
  const ORAGE_JAUNE = [
    { departement: "21", echeance: "J", couleur: 2, phenomenes: [{ id: 3, couleur: 2 }],
      texte: "Situation générale : orages en soirée.", emis_le: EMIS },
  ];
  const chaudEau = await scene(ORAGE_JAUNE, d => {
    d.daily.temperature_2m_max = d.daily.temperature_2m_max.map(() => 34);
    pluie(d);
  });
  j.controle("la chaleur passe devant la vigilance jaune, et la carte rougit",
    chaudEau.ton === "t-chaud" && /°C/.test(chaudEau.lignes[0]),
    chaudEau.ton + ", " + chaudEau.lignes[0].slice(0, 40));
  j.controle("les trois lignes restent dans la même carte",
    chaudEau.cartes === 1 && chaudEau.lignes.length === 3,
    chaudEau.cartes + " carte, " + chaudEau.lignes.length + " lignes");

  return j.fin(erreurs);
}
