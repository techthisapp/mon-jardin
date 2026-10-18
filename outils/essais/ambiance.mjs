/* Le fond vivant.

   Le papier tramé, la prairie de l'écran du jour et le motif du mois de
   l'en-tête ont cédé la place, le 16 octobre 2026, à un calque fixé derrière
   tout l'écran : des taches de couleur floues qui dérivent, deux branches qui
   se balancent, des feuilles qui tombent. La saison en donne les couleurs et
   ce qui tombe, l'heure une lumière, la météo du jour un voile. L'en-tête
   sombre a disparu, et chaque bloc porte son titre en tête, collé en haut de
   l'écran tant qu'il y est.

   Depuis le 17 octobre 2026, le fond par défaut est le jardin vivant, une
   toile peinte ; le feuillage et un fond uni restent au choix dans les
   réglages du compte. Les premières sections jouent le feuillage, choisi
   d'avance sur l'appareil.

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
    durees: [...z.querySelectorAll(".am-feuille, .am-flocon")].map(e => parseFloat(e.style.animationDuration)),
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
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur, { fond: "feuillage" });
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
  /* Elles tombaient trop vite à 24 secondes : chacune met au moins 44
     secondes à traverser l'écran. Relevé par Jérôme le 16 octobre 2026. */
  j.controle("elles tombent lentement, en trois quarts de minute au moins",
    a.durees.length && a.durees.every(d => d >= 44 && d <= 67), a.durees.join(", "));
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
  const hiver = await ouvrirContexte(navigateur, { fond: "feuillage", jour: new Date("2026-01-10T15:00:00+01:00").getTime() });
  a = await lire(hiver.pg);
  j.controle("en janvier, l'hiver, et des flocons au lieu des feuilles",
    a.saison === "hiver" && a.flocons === 12 && a.feuilles === 0, `${a.saison}, ${a.flocons} flocons`);
  j.controle("le fond prend le ton bleuté de l'hiver", a.base === "rgb(234, 239, 242)", a.base);
  j.controle("quinze heures est le jour, sans lumière ajoutée",
    a.heure === "jour" && /, 0\)$/.test(a.lumiere), `${a.heure}, ${a.lumiere}`);
  await hiver.ctx.close();
  const automne = await ouvrirContexte(navigateur, { fond: "feuillage", jour: new Date("2026-10-15T19:00:00+02:00").getTime() });
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
  const pluie = await ouvrirContexte(navigateur, { fond: "feuillage", meteo: JSON.stringify(d) });
  await pluie.pg.waitForTimeout(400);
  a = await lire(pluie.pg);
  j.controle("le temps du jour est la pluie", a.meteo === "pluie", a.meteo);
  j.controle("un voile gris passe sur le fond", /120, 140, 160/.test(a.voile), a.voile);
  j.controle("moins de feuilles tombent, plus lentement encore",
    a.feuilles === 7 && a.durees.every(d => d >= 60), `${a.feuilles}, ${a.durees.join(", ")}`);
  await pluie.ctx.close();

  j.section("le système demande moins de mouvement");
  const calme = await ouvrirContexte(navigateur, { fond: "feuillage" });
  await calme.pg.emulateMedia({ reducedMotion: "reduce" });
  await calme.pg.waitForTimeout(400);
  a = await lire(calme.pg);
  j.controle("le fond reste peint, rien ne bouge ni ne tombe",
    a.animees === 0 && await calme.pg.evaluate(() =>
      getComputedStyle(document.getElementById("amChute")).display === "none"), a.animees + " animations");
  await calme.ctx.close();

  j.section("le jardin vivant, fond par défaut");
  const toile = pg2 => pg2.evaluate(async () => {
    const z = document.getElementById("ambiance"), c = document.getElementById("amToile");
    const r = c.getBoundingClientRect();
    const img = () => c.toDataURL();
    const avant = img();
    await new Promise(f => setTimeout(f, 400));
    const x = c.getContext("2d");
    const px = (u, v) => [...x.getImageData(Math.round(c.width * u), Math.round(c.height * v), 1, 1).data];
    return { fond: z.dataset.fond, ciel: z.dataset.ciel, style: z.dataset.style, decor: z.dataset.decor, affichee: getComputedStyle(c).display,
      cielHaut: px(0.08, 0.12), image: img().length,
      couvre: r.width >= innerWidth && r.height >= innerHeight,
      nette: c.width === Math.round(innerWidth * Math.min(2, devicePixelRatio)),
      taches: getComputedStyle(z.querySelector(".am-tache")).display,
      chute: getComputedStyle(document.getElementById("amChute")).display,
      ciel0: px(0.02, 0.48), sol: px(0.5, 0.97), bouge: avant !== img(),
      titre: getComputedStyle(document.querySelector(".tete h1")).color,
      memoire: localStorage.getItem("monjardin.fond") };
  });
  const vivant = await ouvrirContexte(navigateur);
  await vivant.pg.setViewportSize({ width: 393, height: 852 });
  await vivant.pg.waitForTimeout(700);
  let v = await toile(vivant.pg);
  j.controle("sans choix sur l'appareil, le fond est le jardin vivant",
    v.fond === "jardin" && v.affichee === "block" && v.memoire === null, `${v.fond}, ${v.affichee}`);
  j.controle("la toile couvre l'écran, à la finesse de l'écran", v.couvre && v.nette);
  j.controle("les taches et les feuilles du feuillage s'effacent", v.taches === "none" && v.chute === "none");
  j.controle("le style par défaut est le moderne", v.style === "moderne", v.style);
  j.controle("un ciel bleuté en haut, à neuf heures en été", v.cielHaut[2] > v.cielHaut[0], v.cielHaut.slice(0, 3).join(","));
  j.controle("le jardin bouge", v.bouge);
  j.controle("de jour, le ciel est dit clair", v.ciel === "jour", v.ciel);

  j.section("tous les styles publiés, dans une seule liste");
  const regler = (id, val) => vivant.pg.evaluate(([i, f]) => {
    const s = document.getElementById(i); s.value = f; s.dispatchEvent(new Event("change"));
    return { options: [...s.options].map(o => o.textContent), aide: document.getElementById("aideFond").textContent,
      style: !document.getElementById("ligneStyle").hidden };
  }, [id, val]);
  let st = await regler("selStyle", "brutaliste|");
  j.controle("moderne, brutaliste, méditerranéen, l'estampe selon le climat et ses six décors",
    st.options.length === 10 && st.options[1] === "Brutaliste" && st.options[2] === "Méditerranéen"
    && st.options[3] === "Estampe, selon le climat du jardin" && st.options[9] === "Estampe, jardin de ville"
    && !st.options.includes("Estampe, jardin méditerranéen"), st.options.join(", "));
  j.controle("la liste se règle avec le jardin vivant", st.style);
  j.controle("chaque style est décrit", /Béton brut/.test(st.aide), st.aide);
  await vivant.pg.waitForTimeout(300);
  const vb = await toile(vivant.pg);
  j.controle("le brutaliste se peint, différent du moderne", vb.style === "brutaliste" && vb.bouge && vb.image !== v.image, vb.style);
  j.controle("le style est gardé sur l'appareil", await vivant.pg.evaluate(() => localStorage.getItem("monjardin.style")) === "brutaliste");
  await regler("selStyle", "estampe|climat");
  await vivant.pg.waitForTimeout(300);
  const ve = await toile(vivant.pg);
  j.controle("l'estampe suit le climat du jardin", ve.style === "estampe" && !!ve.decor, `${ve.style}, ${ve.decor}`);
  j.controle("en été, au matin, un ciel bleuté et un sol vert",
    ve.ciel0[2] > ve.ciel0[0] && ve.sol[1] > ve.sol[0] && ve.sol[1] > ve.sol[2], `ciel ${ve.ciel0.slice(0, 3)}, sol ${ve.sol.slice(0, 3)}`);
  await regler("selStyle", "mediterraneen|");
  await vivant.pg.waitForTimeout(300);
  const vme = await toile(vivant.pg);
  j.controle("le méditerranéen se peint", vme.style === "mediterraneen" && vme.bouge && vme.image !== vb.image, vme.style);
  await regler("selStyle", "estampe|montagne");
  await vivant.pg.waitForTimeout(200);
  const vm = await toile(vivant.pg);
  j.controle("un décor de l'estampe se choisit directement", vm.style === "estampe" && vm.decor === "montagne", `${vm.style}, ${vm.decor}`);
  await regler("selStyle", "moderne|");

  j.section("le choix du fond dans les réglages du compte");
  const choisir = val => vivant.pg.evaluate(f => {
    const s = document.getElementById("selFond");
    s.value = f; s.dispatchEvent(new Event("change"));
    return { options: [...s.options].map(o => o.textContent), aide: document.getElementById("aideFond").textContent };
  }, val);
  const o = await choisir("feuillage");
  j.controle("trois fonds au choix", o.options.join(", ") === "Jardin vivant, Feuillage, Uni", o.options.join(", "));
  j.controle("chacun est décrit", /taches de couleur/.test(o.aide), o.aide);
  await vivant.pg.waitForTimeout(300);
  a = await lire(vivant.pg);
  v = await toile(vivant.pg);
  j.controle("le feuillage revient, la toile s'efface",
    v.fond === "feuillage" && v.affichee === "none" && a.animees >= 18, `${v.affichee}, ${a.animees} animations`);
  j.controle("le choix est gardé sur l'appareil", v.memoire === "feuillage");
  await vivant.pg.reload();
  await vivant.pg.waitForTimeout(600);
  v = await toile(vivant.pg);
  j.controle("il survit au rechargement", v.fond === "feuillage", v.fond);
  await choisir("uni");
  await vivant.pg.waitForTimeout(300);
  a = await lire(vivant.pg);
  j.controle("le fond uni ne bouge plus et ne garde que le ton de la saison",
    a.animees === 0 && a.base === "rgb(238, 241, 227)", `${a.animees} animations, ${a.base}`);
  await vivant.ctx.close();

  j.section("la nuit sous la lune");
  const nuit = await ouvrirContexte(navigateur, { jour: new Date("2026-08-02T23:30:00+02:00").getTime() });
  await nuit.pg.setViewportSize({ width: 393, height: 852 });
  await nuit.pg.waitForTimeout(700);
  v = await toile(nuit.pg);
  const fonce = p => p[0] + p[1] + p[2] < 300;
  j.controle("à minuit moins le quart, le ciel est sombre", v.ciel === "nuit" && fonce(v.ciel0), `${v.ciel}, ${v.ciel0.slice(0, 3)}`);
  j.controle("le nom du jardin passe en clair", v.titre === "rgb(242, 240, 234)", v.titre);
  await nuit.ctx.close();
  const crepuscule = await ouvrirContexte(navigateur, { jour: new Date("2026-10-15T19:00:00+02:00").getTime() });
  await crepuscule.pg.setViewportSize({ width: 393, height: 852 });
  await crepuscule.pg.waitForTimeout(700);
  v = await toile(crepuscule.pg);
  j.controle("au crépuscule d'octobre, le ciel déjà sombre fait passer le titre en clair",
    v.ciel === "nuit" && v.titre === "rgb(242, 240, 234)", `${v.ciel}, ${v.titre}`);
  await crepuscule.ctx.close();

  j.section("moins de mouvement, une seule image");
  const immobile = await ouvrirContexte(navigateur);
  await immobile.pg.emulateMedia({ reducedMotion: "reduce" });
  await immobile.pg.reload();
  await immobile.pg.waitForTimeout(700);
  v = await toile(immobile.pg);
  j.controle("le jardin est peint et ne bouge pas", !v.bouge && v.sol[3] === 255, v.sol.join(","));
  await immobile.ctx.close();

  return j.fin(erreurs.concat(hiver.erreurs, automne.erreurs, pluie.erreurs, calme.erreurs,
    vivant.erreurs, nuit.erreurs, crepuscule.erreurs, immobile.erreurs));
}
