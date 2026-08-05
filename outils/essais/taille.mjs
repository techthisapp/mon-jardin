/* Le dessin de la taille à maturité. Il porte deux grandeurs, la hauteur de la
   plante et l'écartement entre deux pieds, et son intérêt tient à ce qu'elles
   soient à la même échelle : un framboisier de deux mètres planté tous les
   cinquante centimètres se lit comme une haie, un pommier de six mètres tous
   les quatre mètres laisse voir le sol entre les pieds. Les contrôles portent
   sur cette échelle commune, sur ce que le cadre peut contenir, et sur les cas
   où une cote deviendrait illisible. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirFiche,
         fermerFiche, ongletIdentite, net } from "./commun.mjs";

const LARGEUR = 344;   // largeur du repère du dessin

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

// L'écart dessiné entre deux pieds, en points du repère.
const pas = r => r.voisins.length ? Math.abs(r.voisins[0].x - r.pied.x) : 0;

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

  j.section("les voisins encadrent le pied sans sortir du cadre");
  const fra = await releve(pg, "Framboise");
  j.controle("deux voisins, un de chaque côté", fra.voisins.length === 2
    && fra.voisins.some(v => v.x < fra.pied.x) && fra.voisins.some(v => v.x > fra.pied.x),
    String(fra.voisins.length));
  j.controle("ils sont à égale distance du pied",
    Math.abs((fra.pied.x - Math.min(...fra.voisins.map(v => v.x)))
      - (Math.max(...fra.voisins.map(v => v.x)) - fra.pied.x)) < 0.2);
  j.controle("ils portent la même échelle que le pied",
    fra.voisins.every(v => Math.abs(v.k - fra.pied.k) < 1e-6));
  const pom = await releve(pg, "Pommier");
  /* Le motif est dessiné dans une boîte de deux cents points ; le pommier est
     la fiche dont l'écartement occupe la plus grande part du cadre. */
  for (const [nom, r] of [["framboise", fra], ["pommier", pom]]) {
    const bords = [...r.voisins, r.pied].map(v => [v.x, v.x + 200 * v.k]);
    j.controle(`${nom}, la rangée tient dans le cadre`,
      Math.min(...bords.map(b => b[0])) > -2
      && Math.max(...bords.map(b => b[1])) < LARGEUR + 2,
      bords.map(b => `${b[0].toFixed(0)}..${b[1].toFixed(0)}`).join(" "));
  }

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
  j.controle("l'étiquette de lecture d'écran porte l'écartement",
    /écartement de 50 cm/.test(fra.etiquette), fra.etiquette);

  /* Huit centimètres sous une plante de quarante de large : la cote se réduit à
     deux crans collés, que l'oeil lit comme un défaut. */
  j.section("une cote trop courte cède la place au seul chiffre");
  const har = await releve(pg, "Haricot vert nain");
  j.controle("aucun trait de cote", har.cote === null);
  j.controle("le chiffre reste, exact",
    har.ecart === "8 cm entre deux pieds, rangs à 40 cm", har.ecart);
  j.controle("les voisins sont tout de même posés", har.voisins.length === 2);

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

  await ctx.close();
  return j.fin(erreurs);
}
