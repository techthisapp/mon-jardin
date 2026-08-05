/* Le dessin de la taille à maturité. Il porte deux grandeurs, la hauteur de la
   plante et l'écartement entre deux pieds, et son intérêt tient à ce qu'elles
   soient à la même échelle : un framboisier de deux mètres planté tous les
   cinquante centimètres se lit comme une haie, un pommier de six mètres tous
   les quatre mètres laisse voir le sol entre les pieds. Les contrôles portent
   sur cette échelle commune, sur ce que le cadre peut contenir, et sur les cas
   où une cote deviendrait illisible. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, ongletIdentite, net, cacheAncien } from "./commun.mjs";

const BANDE = [104, 294];   // la bande où la rangée est dessinée, dans le repère

/* Les grandeurs dessinées, relevées dans le rendu. La transformation de chaque
   pied porte sa position et son échelle : tout se déduit de là. */
async function releve(pg, nom) {
  await ouvrirFiche(pg, nom);
  await ongletIdentite(pg);
  await pg.waitForTimeout(350);
  const r = await pg.evaluate(() => {
    const svg = [...document.querySelectorAll('.f-pan[data-pan="identite"] svg')]
      .find(s => (s.getAttribute("aria-label") || "").startsWith("Taille"));
    if (!svg) return null;
    const lire = n => {
      const m = /translate\(([-\d.]+),([-\d.]+)\) scale\(([\d.]+)\)/.exec(n.getAttribute("transform"));
      return m ? { x: Number(m[1]), y: Number(m[2]), k: Number(m[3]) } : null;
    };
    const pied = svg.querySelector(".tm-pied");
    const voisins = [...svg.querySelectorAll(".tm-voisin")].map(lire);
    const cote = svg.querySelector(".tm-cote");
    const t = s => { const e = svg.querySelector(s); return e ? e.textContent : ""; };
    return {
      etiquette: svg.getAttribute("aria-label"),
      pied: lire(pied), voisins,
      humain: lire(svg.querySelector(".tm-humain")),
      cote: cote ? [...cote.querySelectorAll("line")].map(l => Number(l.getAttribute("x1"))) : null,
      coupe: !!svg.querySelector("[clip-path]"),
      motifs: svg.querySelectorAll("defs > g").length,
      balises: svg.outerHTML.length,
      ecart: net(t(".tm-ecart")), plage: net(t(".tm-plage")),
      // Les cotes de hauteur sont les seules calées sur le bord droit de la bande.
      cotes: [...svg.querySelectorAll("text.f-cote")]
        .filter(e => e.getAttribute("x") === "304").map(e => e.textContent.trim()),
      hauteur: svg.viewBox.baseVal.height,
    };
    function net(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  });
  await fermerFiche(pg);
  return r;
}

/* L'écart dessiné entre deux pieds voisins. Les pieds sont posés du plus
   éloigné au plus proche : c'est le plus petit intervalle qui vaut écartement. */
function pas(r) {
  const xs = [...r.voisins.map(v => v.x), r.pied.x].sort((a, b) => a - b);
  return xs.length < 2 ? 0 : Math.min(...xs.slice(1).map((x, i) => x - xs[i]));
}

export default async function essai(navigateur) {
  const j = journal("Taille à maturité et écartement");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);
  await ouvrirListeDesPlantes(pg);

  /* La silhouette humaine mesure 1,70 m et son dessin fait cent points à son
     échelle : elle sert de témoin pour vérifier que l'écartement est tracé avec
     la même règle que les hauteurs. */
  j.section("l'écartement est à l'échelle des hauteurs");
  for (const [nom, cm] of [["Framboise", 50], ["Pommier", 400], ["Rosier", 60]]) {
    const r = await releve(pg, nom);
    const attendu = (100 * r.humain.k) * cm / 170;
    j.controle(`${nom}, ${cm} cm mesurés à la règle de la silhouette`,
      Math.abs(pas(r) - attendu) < 0.6, `${pas(r).toFixed(1)} contre ${attendu.toFixed(1)}`);
  }

  /* La rangée occupe toute la bande, avec autant de pieds que l'écartement en
     demande : trois arbres, une haie de framboisiers, un ruban de radis. */
  j.section("la rangée remplit la bande");
  const fra = await releve(pg, "Framboise");
  const pom = await releve(pg, "Pommier");
  const rad = await releve(pg, "Radis");
  j.controle("le nombre de pieds suit l'écartement",
    pom.voisins.length < fra.voisins.length && fra.voisins.length < rad.voisins.length,
    `pommier ${pom.voisins.length + 1}, framboise ${fra.voisins.length + 1}, `
    + `radis ${rad.voisins.length + 1}`);
  for (const [nom, r] of [["framboise", fra], ["pommier", pom], ["radis", rad]]) {
    const xs = [...r.voisins.map(v => v.x), r.pied.x].sort((a, b) => a - b);
    const ecarts = xs.slice(1).map((x, i) => x - xs[i]);
    j.controle(`${nom}, le pas est constant d'un pied à l'autre`,
      Math.max(...ecarts) - Math.min(...ecarts) < 0.02, ecarts.length + " intervalles");
    j.controle(`${nom}, la rangée est centrée sur le pied de la plante`,
      Math.abs((r.pied.x - xs[0]) - (xs[xs.length - 1] - r.pied.x)) < 0.2);
    j.controle(`${nom}, elle couvre la bande d'un bord à l'autre`,
      xs[0] + 200 * r.pied.k > BANDE[0] && xs[xs.length - 1] < BANDE[1],
      `${xs[0].toFixed(0)}..${(xs[xs.length - 1] + 200 * r.pied.k).toFixed(0)}`);
    j.controle(`${nom}, les pieds des bords sont coupés par le cadre`, r.coupe);
    j.controle(`${nom}, tous les pieds portent la même échelle`,
      r.voisins.every(v => Math.abs(v.k - r.pied.k) < 1e-6));
  }
  /* Cent quarante et un dessins de radis recopiés en clair pèseraient plus de
     quatre-vingts kilo-octets : le motif est décrit deux fois, en gris et en
     couleur, et rappelé à chaque position. */
  j.controle("le motif n'est décrit que deux fois, quel que soit le nombre de pieds",
    rad.motifs === 2 && rad.balises < 30000,
    `${rad.motifs} motifs, ${(rad.balises / 1024).toFixed(1)} Ko pour `
    + `${rad.voisins.length + 1} pieds`);

  j.section("la cote dit la distance, et le rang quand il diffère");
  j.controle("framboise, l'écartement et le rang sont énoncés",
    fra.ecart === "50 cm entre deux pieds, rangs à 1,5 m", fra.ecart);
  j.controle("pommier, les mètres remplacent les centimètres",
    pom.ecart === "4 m entre deux pieds, rangs à 5 m", pom.ecart);
  const lai = await releve(pg, "Laitue");
  j.controle("laitue, le rang égal à l'écartement n'est pas répété",
    lai.ecart === "30 cm entre deux pieds", lai.ecart);
  j.controle("la cote est tracée d'un pied à l'autre",
    fra.cote !== null && Math.abs((Math.max(...fra.cote) - Math.min(...fra.cote)) - pas(fra)) < 0.2,
    String(fra.cote));
  j.controle("l'étiquette de lecture d'écran porte l'écartement et le nombre de pieds",
    new RegExp(`écartement de 50 cm, ${fra.voisins.length + 1} pieds`).test(fra.etiquette),
    fra.etiquette);

  /* Huit centimètres sous une plante de quarante de large : la cote se réduit à
     deux crans collés, que l'oeil lit comme un défaut. */
  j.section("une cote trop courte cède la place au seul chiffre");
  const har = await releve(pg, "Haricot vert nain");
  j.controle("aucun trait de cote", har.cote === null);
  j.controle("le chiffre reste, exact",
    har.ecart === "8 cm entre deux pieds, rangs à 40 cm", har.ecart);
  j.controle("la rangée est tout de même posée", har.voisins.length > 20,
    String(har.voisins.length + 1));

  /* Vingt à trente centimètres : les deux cotes de hauteur se recouvriraient. */
  j.section("une plage de hauteur étroite n'écrit qu'une cote");
  j.controle("laitue, une seule mention de plage", lai.plage === "20 à 30 cm", lai.plage);
  j.controle("l'unité n'est écrite qu'une fois", !/cm à/.test(lai.plage), lai.plage);
  j.controle("aucune cote de hauteur séparée", lai.cotes.length === 0, lai.cotes.join(" | "));
  j.controle("framboise garde ses deux cotes distinctes",
    fra.plage === "" && fra.cotes.indexOf("2 m") !== -1 && fra.cotes.indexOf("1,5 m") !== -1,
    fra.cotes.join(" | "));

  j.section("le dessin s'allonge pour porter la cote");
  const thym = await releve(pg, "Thym");
  j.controle("le cadre laisse la place sous le sol", fra.hauteur === 136, String(fra.hauteur));
  j.controle("thym, l'écartement est là aussi",
    thym.ecart === "30 cm entre deux pieds", thym.ecart);

  /* Le catalogue est gardé en mémoire locale et la clé de fraîcheur ne porte que
     le nombre de plantes et la date de la base : ajouter une colonne à la requête
     ne la change pas. Sans autre garde, une installation qui avait déjà un
     catalogue continuait de servir des lignes sans écartement, et le dessin
     restait celui d'un pied seul. */
  j.section("un catalogue mis en cache par une version antérieure est écarté");
  const v = await ouvrirContexte(navigateur, { cache: cacheAncien() });
  await ouvrirListeDesPlantes(v.pg);
  const vieux = await releve(v.pg, "Framboise");
  j.controle("la rangée est bien là", vieux.voisins.length > 2,
    `${vieux.voisins.length + 1} pieds`);
  j.controle("la cote aussi", vieux.ecart === "50 cm entre deux pieds, rangs à 1,5 m",
    vieux.ecart);
  await v.ctx.close();

  await ctx.close();
  return j.fin(erreurs.concat(v.erreurs));
}
