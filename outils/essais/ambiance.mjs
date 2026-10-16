/* Le fond vivant.

   Le papier tramé, la prairie de l'écran du jour et le motif du mois de
   l'en-tête ont cédé la place, le 16 octobre 2026, à un calque fixé derrière
   tout l'écran : des taches de couleur floues qui dérivent, deux branches qui
   se balancent, des feuilles qui tombent. La saison en donne les couleurs et
   ce qui tombe, l'heure une lumière, la météo du jour un voile. L'en-tête
   sombre a disparu, et chaque bloc porte son titre en tête, collé en haut de
   l'écran tant qu'il y est.

   Les contrôles portent sur la place du calque, sur ce que chaque saison y
   pose, sur la lumière du matin, sur le voile de la pluie, sur l'arrêt du
   mouvement quand le système le demande, et sur les titres des blocs. */
import { ouvrirContexte, journal, METEO } from "./commun.mjs";

const lire = pg => pg.evaluate(() => {
  const z = document.getElementById("ambiance");
  const cs = getComputedStyle(z);
  const r = z.getBoundingClientRect();
  return {
    position: cs.position, plan: cs.zIndex, couvre: r.width >= innerWidth && r.height >= innerHeight,
    saison: z.dataset.saison, heure: z.dataset.heure, meteo: z.dataset.meteo,
    base: cs.backgroundColor,
    taches: [...z.querySelectorAll(".am-tache")].map(t => getComputedStyle(t).backgroundColor),
    feuilles: z.querySelectorAll(".am-feuille").length,
    flocons: z.querySelectorAll(".am-flocon").length,
    couleurChute: (z.querySelector(".am-feuille, .am-flocon") || {}).style?.color || "",
    lumiere: getComputedStyle(z.querySelector(".am-lumiere")).backgroundColor,
    opacites: [...z.querySelectorAll(".am-feuille")].map(e => Number(getComputedStyle(e).opacity)),
    branches: z.querySelectorAll(".am-branche").length,
    branche: (() => { const b = z.querySelector(".am-branche").getBoundingClientRect();
      return { centre: b.left + b.width / 2, haut: b.top, bas: b.bottom, droite: b.right }; })(),
    voile: getComputedStyle(z.querySelector(".am-meteo")).backgroundColor,
    animees: document.getAnimations().filter(a => a.animationName && a.effect && a.effect.target
      && a.effect.target.closest && a.effect.target.closest("#ambiance")).length,
  };
});

export default async function essai(navigateur) {
  const j = journal("Fond vivant");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);
  await pg.setViewportSize({ width: 393, height: 852 });
  await pg.waitForTimeout(600);

  j.section("un calque fixé derrière tout l'écran");
  let a = await lire(pg);
  j.controle("il est fixe et couvre l'écran", a.position === "fixed" && a.couvre);
  j.controle("il passe sous le contenu", a.plan === "-1", a.plan);
  j.controle("le papier tramé, la prairie et le motif du mois ont disparu",
    await pg.evaluate(() => !document.getElementById("prairie") && !document.getElementById("motifMois")
      && getComputedStyle(document.body).backgroundImage === "none"));
  j.controle("l'en-tête n'a plus de bande sombre",
    await pg.evaluate(() => getComputedStyle(document.querySelector(".tete")).backgroundImage === "none"
      && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(document.querySelector(".tete")).backgroundColor)));

  j.section("l'été, au matin, par temps clair");
  j.controle("le 2 août est l'été", a.saison === "ete", a.saison);
  j.controle("le fond prend le ton de l'été", a.base === "rgb(238, 241, 227)", a.base);
  j.controle("cinq taches aux couleurs de l'été",
    a.taches.length === 5 && a.taches[0] === "rgb(215, 230, 169)", a.taches.join(" | "));
  j.controle("douze feuilles vertes tombent", a.feuilles === 12 && a.flocons === 0
    && /rgb\(123, 160, 91\)|#7ba05b/i.test(a.couleurChute), `${a.feuilles}, ${a.couleurChute}`);
  j.controle("neuf heures est le matin, d'une lumière dorée",
    a.heure === "matin" && /255, 214, 140/.test(a.lumiere), `${a.heure}, ${a.lumiere}`);
  j.controle("le ciel clair ne pose aucun voile", a.meteo === "clair", a.meteo);
  /* Les feuilles étaient trop discrètes à 20 % : elles tombent entre 55 et
     79 %, plus grandes. Relevé par Jérôme le 16 octobre 2026. */
  j.controle("les feuilles se voient", a.opacites.every(o => o >= .55), a.opacites.join(", "));
  /* Une seule branche, qui retombe du coin haut droit. Retournée autour de
     son bord haut, elle sortait de l'écran sans qu'aucun contrôle le voie. */
  j.controle("une seule branche, qui retombe du coin haut droit",
    a.branches === 1 && a.branche.centre > 393 * .6 && a.branche.haut < 0
    && a.branche.bas > 150 && a.branche.droite > 373, JSON.stringify(a.branche));
  j.controle("tout y bouge", a.animees >= 18, a.animees + " animations");

  j.section("les titres font la tête des blocs");
  const tete = await pg.evaluate(async () => {
    const s = document.querySelector(".synthese");
    const t = s.querySelector(".bloc-titre");
    const premier = s.firstElementChild === t;
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + 120);
    await new Promise(r => setTimeout(r, 200));
    const rt = t.getBoundingClientRect(), rs = s.getBoundingClientRect();
    return { premier, texte: t.textContent, position: getComputedStyle(t).position,
             colle: Math.abs(rt.top) <= 1, dedans: rs.top < 0 && rs.bottom > rt.bottom };
  });
  j.controle("la synthèse s'ouvre sur son titre", tete.premier
    && /^À faire cette quinzaine\d+ actions?$/.test(tete.texte), tete.texte);
  j.controle("il reste collé en haut de l'écran tant que le bloc y est",
    tete.position === "sticky" && tete.colle && tete.dedans, JSON.stringify(tete));
  await pg.evaluate(() => window.scrollTo(0, 0));
  j.controle("le temps du jour et ce qui fleurit portent aussi le leur",
    await pg.evaluate(() => !!document.querySelector("#blocTemps .bloc-titre")
      && !!document.querySelector("#carteFleur .bloc-titre")));
  await ctx.close();

  j.section("chaque saison a ses couleurs et ce qui tombe");
  const hiver = await ouvrirContexte(navigateur, { jour: new Date("2026-01-10T15:00:00+01:00").getTime() });
  a = await lire(hiver.pg);
  j.controle("en janvier, l'hiver, et des flocons au lieu des feuilles",
    a.saison === "hiver" && a.flocons === 12 && a.feuilles === 0, `${a.saison}, ${a.flocons} flocons`);
  j.controle("le fond prend le ton bleuté de l'hiver", a.base === "rgb(234, 239, 242)", a.base);
  j.controle("quinze heures est le jour, sans lumière ajoutée",
    a.heure === "jour" && /, 0\)$/.test(a.lumiere), `${a.heure}, ${a.lumiere}`);
  await hiver.ctx.close();
  const automne = await ouvrirContexte(navigateur, { jour: new Date("2026-10-15T19:00:00+02:00").getTime() });
  a = await lire(automne.pg);
  j.controle("en octobre, l'automne et ses feuilles rousses",
    a.saison === "automne" && a.feuilles === 12 && /217, 130, 43|#d9822b/i.test(a.couleurChute),
    `${a.saison}, ${a.couleurChute}`);
  j.controle("dix-neuf heures est le soir, d'une lumière rosée",
    a.heure === "soir" && /240, 150, 120/.test(a.lumiere), `${a.heure}, ${a.lumiere}`);
  await automne.ctx.close();

  j.section("la pluie pose un voile et ralentit la chute");
  const d = JSON.parse(METEO);
  d.daily.weather_code = d.daily.weather_code.map(() => 63);
  d.hourly.weather_code = d.hourly.weather_code.map(() => 63);
  const pluie = await ouvrirContexte(navigateur, { meteo: JSON.stringify(d) });
  await pluie.pg.waitForTimeout(400);
  a = await lire(pluie.pg);
  j.controle("le temps du jour est la pluie", a.meteo === "pluie", a.meteo);
  j.controle("un voile gris passe sur le fond", /120, 140, 160/.test(a.voile), a.voile);
  j.controle("moins de feuilles tombent", a.feuilles === 7, String(a.feuilles));
  await pluie.ctx.close();

  j.section("le système demande moins de mouvement");
  const calme = await ouvrirContexte(navigateur);
  await calme.pg.emulateMedia({ reducedMotion: "reduce" });
  await calme.pg.waitForTimeout(400);
  a = await lire(calme.pg);
  j.controle("le fond reste peint, rien ne bouge ni ne tombe",
    a.animees === 0 && await calme.pg.evaluate(() =>
      getComputedStyle(document.getElementById("amChute")).display === "none"), a.animees + " animations");
  await calme.ctx.close();

  return j.fin(erreurs.concat(hiver.erreurs, automne.erreurs, pluie.erreurs, calme.erreurs));
}
