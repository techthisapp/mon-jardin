/* Tenue en largeur. Deux fautes de mise en page ont la même origine : une piste
   de grille en `1fr`, qui vaut `minmax(auto,1fr)` et se laisse étirer par le
   contenu le plus long, et une classe portée par deux composants sans rapport,
   la règle la plus tardive l'emportant sur l'autre.

   Les contrôles portent donc sur ce que le rendu seul ne dit pas : aucune vue
   ne dépasse le bord de l'écran, une rangée reste dans sa piste quelle que soit
   la longueur de la ligne des lieux, et les quatre mesures de la feuille du
   temps gardent leur damier. */
import { ouvrirContexte, journal, CATALOGUE } from "./commun.mjs";

const PLANTES = JSON.parse(CATALOGUE).plants;
const par = n => PLANTES.find(p => p.name === n);
const RHUBARBE = par("Rhubarbe"), FRAISE = par("Fraise"), RADIS = par("Radis");

/* Quatre espaces aux noms longs, et une plante posée dans tous : c'est le cas
   qui étirait la liste hors de l'écran, la ligne des lieux nommant les quatre
   à la suite. */
const ESPACES = [
  { id: "e1", name: "Potager du bas", color: "#7BA05B" },
  { id: "e2", name: "Verger de la côte" },
  { id: "e3", name: "Terrasse et balcon" },
  { id: "e4", name: "Massif d'ornement" },
];
const PLACEMENTS = [
  { plant_id: FRAISE.id, espace_id: "e1" }, { plant_id: FRAISE.id, espace_id: "e2" },
  { plant_id: FRAISE.id, espace_id: "e3" }, { plant_id: FRAISE.id, espace_id: "e4" },
  { plant_id: RHUBARBE.id, espace_id: "e1" }, { plant_id: RADIS.id, espace_id: "e2" },
];

const LARGEURS = [320, 360, 390, 430];

async function allerAuxPlantes(pg) {
  await pg.locator('.onglet[data-ecran="selection"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  await pg.locator('.onglet-j[data-panneau="plantes"]').dispatchEvent("click");
  await pg.waitForTimeout(600);
}

export default async function essai(navigateur) {
  const j = journal("Tenue en largeur");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { espaces: ESPACES, placements: PLACEMENTS });
  await pg.waitForTimeout(900);

  j.section("la rangée reste dans sa piste, la ligne des lieux se rogne");
  await allerAuxPlantes(pg);
  const rangee = await pg.evaluate(() => {
    const bloc = [...document.querySelectorAll("#listes .item-bloc")]
      .find(n => (n.querySelector(".lieu-item") || {}).textContent?.includes(","));
    const lieu = bloc.querySelector(".lieu-item");
    const l = n => n.getBoundingClientRect().width;
    return {
      texte: lieu.textContent,
      piste: Math.round(l(bloc.parentElement)), bloc: Math.round(l(bloc)),
      rangee: Math.round(l(bloc.querySelector(".item"))),
      rogne: lieu.scrollWidth > lieu.clientWidth + 1,
      chevron: Math.round(bloc.querySelector(".voir-fiche").getBoundingClientRect().right),
      bord: Math.round(bloc.getBoundingClientRect().right),
    };
  });
  j.controle("la ligne nomme bien les quatre espaces",
    rangee.texte.split(",").length === 4, rangee.texte);
  j.controle("le bloc ne dépasse pas sa piste",
    rangee.bloc <= rangee.piste, `${rangee.bloc} px pour ${rangee.piste} px de piste`);
  j.controle("la rangée non plus",
    rangee.rangee <= rangee.piste, `${rangee.rangee} px`);
  j.controle("la ligne des lieux se rogne au lieu de pousser", rangee.rogne);
  j.controle("le chevron reste dans la rangée",
    rangee.chevron <= rangee.bord, `${rangee.chevron} contre ${rangee.bord}`);

  /* Une piste étirée emportait la liste entière : la page se mettait à défiler
     de côté, ce qui se lit d'un seul nombre. */
  j.section("aucune vue ne dépasse le bord de l'écran");
  for (const L of LARGEURS) {
    await pg.setViewportSize({ width: L, height: 900 });
    await pg.waitForTimeout(400);
    const d = await pg.evaluate(() => ({
      large: document.documentElement.scrollWidth,
      vue: document.documentElement.clientWidth,
    }));
    j.controle(`la liste des plantes tient dans ${L} points`,
      d.large <= d.vue + 1, `${d.large} px pour ${d.vue} px`);
  }
  await pg.setViewportSize({ width: 430, height: 940 });
  await pg.waitForTimeout(300);
  for (const [nom, ecran] of [["le moment", "maintenant"], ["le calendrier", "planning"],
                              ["le jardin", "selection"]]) {
    await pg.locator(`.onglet[data-ecran="${ecran}"]`).dispatchEvent("click");
    await pg.waitForTimeout(500);
    const d = await pg.evaluate(() => ({
      large: document.documentElement.scrollWidth,
      vue: document.documentElement.clientWidth,
    }));
    j.controle(`${nom} tient dans l'écran`, d.large <= d.vue + 1,
      `${d.large} px pour ${d.vue} px`);
  }

  /* Les quatre mesures partageaient le nom `tp-m` avec la pastille du moment
     des tuiles d'un espace. La règle la plus tardive gagnait : rayon de gélule,
     bourrage réduit et calage à droite de la colonne. */
  j.section("les quatre mesures du temps gardent leur damier");
  await pg.locator(".tm-temps").click();
  await pg.waitForTimeout(700);
  const mes = await pg.evaluate(() => [...document.querySelectorAll(".tp-m")].map(n => {
    const r = n.getBoundingClientRect(), s = getComputedStyle(n);
    return { x: Math.round(r.x), w: Math.round(r.width), rayon: s.borderRadius,
             marge: s.marginLeft };
  }));
  j.controle("quatre tuiles", mes.length === 4, mes.length);
  j.controle("toutes de même largeur",
    new Set(mes.map(m => m.w)).size === 1, mes.map(m => m.w).join(" | "));
  j.controle("rangées en deux colonnes",
    mes[0].x === mes[2].x && mes[1].x === mes[3].x && mes[1].x > mes[0].x,
    mes.map(m => m.x).join(" | "));
  j.controle("aucune n'est calée à droite de sa colonne",
    mes.every(m => m.marge === "0px"), mes.map(m => m.marge).join(" | "));
  j.controle("le coin n'est pas celui d'une gélule",
    mes.every(m => m.rayon === "12px"), mes[0].rayon);

  await ctx.close();
  return j.fin(erreurs);
}
