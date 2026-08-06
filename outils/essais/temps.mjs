/* Feuille du temps. La pastille météo du bandeau ouvre sa propre feuille, qui
   porte les vingt-quatre heures à venir en trois écritures. Les contrôles
   portent sur ce que le code ne peut pas vérifier seul : la fenêtre part bien
   de l'heure en cours et traverse minuit, chaque écriture rend la même série,
   et le météogramme ne mélange pas deux unités dans une voie. */
import { ouvrirContexte, journal, net } from "./commun.mjs";

// L'horloge des essais est figée au 2 août 2026 à 9 h, heure de Paris.
const H0 = 9;

export default async function essai(navigateur) {
  const j = journal("Feuille du temps");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

  j.section("la pastille météo ouvre le temps, la date ouvre le jour");
  j.controle("le bandeau porte la lecture du moment",
    await pg.locator(".tm-temps").count() === 1);
  await pg.locator(".tm-temps").click();
  await pg.waitForTimeout(700);
  const titre = (await pg.locator("#feuille-titre").innerText()).split("\n")[0];
  j.controle("elle ouvre la feuille du temps", titre === "Le temps", titre);
  /* Le bandeau reste visible au-dessus de la feuille : elle ne redit ni le grand
     chiffre ni l'état du ciel, elle porte les mesures que le bandeau ne tient
     pas. La température et le ciel descendent dans le sous-titre, d'un rang qui
     ne rivalise pas et qui reste lisible quand la feuille défile. */
  const sousTitre = net((await pg.locator("#feuille-titre").innerText()).split("\n")[1] || "");
  j.controle("le sous-titre porte le lieu, la température et le ciel",
    /Fain-lès-Moutiers/.test(sousTitre) && /\d+°/.test(sousTitre)
    && /clair|éclaircie|couvert|nuage|pluie|orage/i.test(sousTitre), sousTitre);
  j.controle("le grand chiffre du bandeau n'est plus redit",
    await pg.locator(".tp-deg").count() === 0);
  const mesures = await pg.locator(".tp-m span").allInnerTexts();
  j.controle("quatre mesures que le bandeau ne peut pas tenir",
    mesures.map(t => net(t).toLowerCase()).join(", ")
      === "ressenti, vent, humidité, indice uv", mesures.join(", "));
  const damier = net(await pg.locator(".tp-mes").innerText());
  j.controle("l'état du ciel n'y paraît pas une seconde fois",
    !/clair|éclaircie|couvert/i.test(damier), damier);
  j.controle("chaque mesure porte un chiffre",
    await pg.locator(".tp-m b").count() === 4
    && (await pg.locator(".tp-m b").allInnerTexts()).every(t => /\d/.test(t)),
    (await pg.locator(".tp-m b").allInnerTexts()).join(" | "));
  /* Les vitesses sans unité et les prépositions doublées sont les deux fautes
     que ce damier a connues à l'écriture. */
  j.controle("les vitesses portent leur unité, sans préposition doublée",
    /rafales \d+ km\/h/.test(damier) && !/de de |d'de /.test(damier), damier);
  j.controle("la prévision à sept jours est descendue dans cette feuille",
    await pg.locator("#feuille-corps .mt-table").count() === 1);

  /* Le bloc de tête répond d'abord à la question qu'on se pose en ouvrant. La
     première ligne parle donc toujours de pluie, qu'il en tombe ou non. */
  j.section("ce que les heures demandent au jardin");
  const jd = await pg.locator(".jd-l").allInnerTexts();
  j.controle("trois lignes au plus", jd.length >= 1 && jd.length <= 3, jd.length + " lignes");
  j.controle("la première parle de la pluie", /pluie|lame/i.test(jd[0]), net(jd[0]));
  j.controle("aucune ligne ne se répète", new Set(jd).size === jd.length);

  j.section("le ruban empile une voie par grandeur");
  const voies = await pg.locator(".mg-v .mg-t").allInnerTexts();
  j.controle("sept voies, une par grandeur", voies.length === 7,
    voies.map(v => v.split("\n")[0]).join(", "));
  /* Le nom, le point d'interrogation quand une lecture est repliée, puis la
     valeur : trois lignes de texte au plus, dont deux qui disent quelque chose. */
  j.controle("chacune est nommée et chiffrée",
    voies.every(v => {
      const l = v.split("\n").map(x => x.trim()).filter(x => x && x !== "?");
      return l.length === 2 && l[1].length > 0;
    }), voies.map(v => net(v.replace(/\n/g, " : "))).join(" | "));

  /* Une bosse au milieu de la pile ne se rattachait à aucune heure : il fallait
     descendre jusqu'à l'axe et remonter à l'oeil. Un montant tous les six
     heures traverse chaque voie, aux abscisses mêmes des libellés. */
  j.section("les heures se lisent d'un bout à l'autre de la pile");
  const grille = await pg.evaluate(() => {
    // Le montant de lecture partage l'abscisse de départ des autres : il est écarté.
    const abs = e => [...e.querySelectorAll("line[y1='0']:not(.mg-cur)")]
      .map(l => Math.round(Number(l.getAttribute("x1"))));
    // L'axe est un dessin frère des voies, il n'est pas dans .mg-v.
    const voies = [...document.querySelectorAll(".mg-v .mg-s")];
    const axe = [...document.querySelectorAll(".mg-s text.mg-h:not(.mg-ici)")]
      .map(t => Math.round(Number(t.getAttribute("x"))));
    return { par: voies.map(abs), axe };
  });
  j.controle("chaque voie porte les mêmes montants",
    grille.par.length >= 6 && new Set(grille.par.map(a => a.join(","))).size === 1,
    grille.par.map(a => a.length).join(", "));
  j.controle("ils tombent sous les libellés de l'axe",
    JSON.stringify(grille.par[0]) === JSON.stringify(grille.axe),
    `${grille.par[0].join(", ")} contre ${grille.axe.join(", ")}`);
  // Un texte de dessin n'est pas un élément de page : il se lit par son contenu.
  const ici = net(await pg.locator(".mg-ici").evaluate(e => e.textContent));
  j.controle("le premier libellé est l'heure en cours, marquée",
    ici === String(H0).padStart(2, "0") + " h", ici);

  /* La lecture d'une voie apprend quelque chose la première fois et se lit en
     pure perte ensuite : elle est repliée derrière le titre. */
  j.section("la lecture d'une voie se déplie au toucher");
  j.controle("les lectures sont repliées",
    await pg.locator(".mg-l:not([hidden])").count() === 0);
  await pg.locator(".mg-b").first().click();
  await pg.waitForTimeout(300);
  j.controle("le titre touché déplie la sienne",
    await pg.locator(".mg-l:not([hidden])").count() === 1
    && await pg.locator(".mg-b").first().getAttribute("aria-expanded") === "true");
  j.controle("elle parle bien de cette voie",
    /point de rosée/.test(await pg.locator(".mg-l:not([hidden])").innerText()));
  await pg.locator(".mg-b").first().click();
  await pg.waitForTimeout(300);
  j.controle("un second toucher la replie",
    await pg.locator(".mg-l:not([hidden])").count() === 0);
  const larg = await pg.evaluate(() => [...document.querySelectorAll(".mg-s")]
    .map(e => Math.round(e.getBoundingClientRect().width)));
  j.controle("toutes les voies partagent la largeur de l'axe",
    new Set(larg).size === 1, larg.join(", "));
  /* Une voie vide occupait quarante points de haut et deux lignes de légende
     pour ne montrer qu'un filet : quand rien n'est attendu et que le risque
     reste bas, la ligne de titre le dit seule. Le jeu figé est sec. */
  const dessinees = await pg.locator(".mg-v .mg-s").count();
  j.controle("la voie de la pluie se replie quand il ne tombe rien",
    dessinees === 6 && /aucune/.test(voies.find(v => /PLUIE/i.test(v)) || ""),
    `${dessinees} voies dessinées sur ${voies.length}`);
  j.controle("elle garde son titre et sa lecture",
    (voies.find(v => /PLUIE/i.test(v)) || "").split("\n").length === 2);
  const legendes = await pg.locator(".mg-l").count();
  j.controle("les voies à plusieurs tracés portent leur lecture", legendes === 3, legendes);
  /* Les deux bandes de valeur portent le trait de minuit comme les courbes,
     sans quoi elles ne se lisent plus en regard des voies du dessus. */
  const traits = await pg.evaluate(() => [...document.querySelectorAll(".mg-v")]
    .filter(v => /CIEL|UV/i.test(v.textContent))
    .map(v => v.querySelectorAll("line[stroke-dasharray]").length));
  j.controle("le ciel et l'indice UV portent le repère de minuit",
    traits.length === 2 && traits.every(n => n === 1), traits.join(", "));

  /* Un doigt posé sur les courbes désigne une heure : un montant la marque dans
     toutes les voies, et chaque plage cède la place à la valeur de cette heure.
     Les sept grandeurs se lisent ainsi ensemble, ce qu'une bulle flottante ne
     permettrait pas sans recouvrir le dessin qu'on interroge. */
  j.section("un doigt sur les courbes lit une heure");
  // L'espace insécable des unités se lit autrement d'un côté et de l'autre.
  const plages = (await pg.locator(".mg-r").evaluateAll(l => l.map(e => e.dataset.plage)))
    .map(net);
  j.controle("chaque voie garde sa plage de côté",
    plages.length === 7 && plages.every(t => t && t.length), plages.filter(Boolean).length + " sur 7");
  const cadre = await pg.locator(".mg-v .mg-s").first().boundingBox();
  await pg.mouse.move(cadre.x + cadre.width * 0.62, cadre.y + cadre.height / 2);
  await pg.mouse.down();
  await pg.mouse.up();
  await pg.waitForTimeout(300);
  const heureLue = net(await pg.locator(".mg-sel span").innerText());
  j.controle("l'heure lue est annoncée", /^Valeurs à \d{2} h$/.test(heureLue), heureLue);
  const lues = await pg.locator(".mg-r").allInnerTexts();
  j.controle("les sept voies donnent leur valeur à cette heure",
    lues.length === 7 && lues.every((t, i) => net(t) !== plages[i] && /\d/.test(t)),
    lues.map(net).join(" | "));
  const curseurs = await pg.evaluate(() => [...document.querySelectorAll(".mg-cur")]
    .filter(l => !l.hasAttribute("hidden")).map(l => Math.round(Number(l.getAttribute("x1")))));
  j.controle("un montant marque l'heure dans chaque voie dessinée",
    curseurs.length === 6 && new Set(curseurs).size === 1, curseurs.join(", "));
  /* La lecture reste après le doigt levé : sur un téléphone, le doigt cache la
     zone qu'il désigne, et une valeur qui disparaît au relâchement ne se lit
     jamais. */
  j.controle("elle reste après le doigt levé",
    await pg.locator(".mg-sel:not([hidden])").count() === 1);
  await pg.locator("#mgRendre").click();
  await pg.waitForTimeout(300);
  j.controle("le retour rend les plages",
    (await pg.locator(".mg-r").allInnerTexts()).map(net).join("|") === plages.join("|"));
  j.controle("et retire les montants de lecture",
    await pg.evaluate(() => [...document.querySelectorAll(".mg-cur")]
      .every(l => l.hasAttribute("hidden")))
    && await pg.locator(".mg-sel[hidden]").count() === 1);
  // Un doigt reposé au même endroit rend les plages, sans passer par le lien.
  await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(250);
  await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(250);
  j.controle("un second appui au même endroit rend aussi les plages",
    await pg.locator(".mg-sel[hidden]").count() === 1);

  /* La fenêtre part de l'heure en cours et court sur vingt-quatre heures : elle
     traverse minuit, et la journée civile ne la borne pas. */
  j.section("la fenêtre part de l'heure en cours");
  await pg.locator('[data-mode="liste"]').click();
  await pg.waitForTimeout(600);
  const heures = await pg.locator(".hh th").allInnerTexts();
  j.controle("vingt-quatre heures", heures.length === 24, heures.length);
  j.controle("la première est l'heure en cours",
    heures[0].trim() === String(H0).padStart(2, "0") + " h", heures[0]);
  j.controle("la dernière est la même heure le lendemain, moins une",
    heures[23].trim() === String((H0 + 23) % 24).padStart(2, "0") + " h", heures[23]);
  j.controle("la coupure de minuit est annoncée par son jour",
    await pg.locator(".hh-jour").count() === 1,
    await pg.locator(".hh-jour").innerText().catch(() => "absente"));
  j.controle("l'heure en cours est marquée", await pg.locator(".hh-ici").count() === 1);

  /* La lame et le risque tenaient chacun une colonne, toutes deux muettes par
     temps sec : la moitié droite de la table restait vide. Une seule colonne
     les porte, et l'humidité de l'air occupe la place gagnée. */
  const colonnes = (await pg.locator(".hh-tete th").allInnerTexts()).map(t => net(t).toLowerCase());
  j.controle("la ligne de tête nomme les colonnes",
    colonnes.join(" ") === "heure  temp. vent pluie humidité", colonnes.join(" | "));
  j.controle("une seule colonne de pluie",
    await pg.locator(".hh-p").count() === 24 && await pg.locator(".hh-pb").count() === 0);
  const hu = await pg.locator(".hh-hu").allInnerTexts();
  j.controle("chaque heure porte son humidité",
    hu.length === 24 && hu.every(t => /^\d+\s*%$/.test(net(t))), net(hu[0] || ""));
  j.controle("la table occupe la largeur de la feuille",
    await pg.evaluate(() => {
      const t = document.querySelector(".hh-table").getBoundingClientRect();
      const d = [...document.querySelectorAll(".hh-hu")].pop().getBoundingClientRect();
      return t.right - d.right < 4;
    }));
  j.controle("un air moite est marqué",
    await pg.locator(".hh-moite").count() >= 1,
    String(await pg.locator(".hh-moite").count()));

  j.section("les moments suivent les bornes civiles");
  await pg.locator('[data-mode="moments"]').click();
  await pg.waitForTimeout(600);
  const mo = await pg.locator(".mo-h").allInnerTexts();
  j.controle("les tranches couvrent la fenêtre", mo.length >= 4 && mo.length <= 5,
    mo.length + " tranches");
  j.controle("aucune tranche ne dure plus de six heures",
    mo.every(t => { const m = t.match(/de (\d+) h à (\d+) h/);
      return m && ((Number(m[2]) - Number(m[1]) + 24) % 24 || 24) <= 6; }), mo.join(" | "));
  j.controle("la première part de l'heure en cours",
    mo[0].indexOf(String(H0).padStart(2, "0") + " h") !== -1, net(mo[0]));
  j.controle("les suivantes tombent sur six, douze, dix-huit ou zéro heure",
    mo.slice(1).every(t => /de (00|06|12|18) h/.test(t)), mo.join(" | "));
  j.controle("celles du lendemain le disent",
    mo.filter(t => t.indexOf("demain") === 0).length >= 2, mo.join(" | "));
  j.controle("chaque tranche est nommée",
    mo.every(t => /nuit|matinée|après-midi|soirée/.test(t)), mo.join(" | "));

  /* Les trois écritures lisent la même série : un écart entre elles serait une
     erreur de découpage, invisible à l'oeil. */
  j.section("les trois écritures s'accordent");
  const bornes = (await pg.locator(".mo-x > b").allInnerTexts())
    .map(t => t.match(/(-?\d+) à (-?\d+)/)).filter(Boolean)
    .map(m => [Number(m[1]), Number(m[2])]);
  await pg.locator('[data-mode="liste"]').click();
  await pg.waitForTimeout(500);
  const temps = (await pg.locator(".hh-t").allInnerTexts()).map(t => Number(t.replace("°", "")));
  j.controle("le minimum des moments est celui des heures",
    Math.min(...bornes.map(b => b[0])) === Math.min(...temps),
    Math.min(...bornes.map(b => b[0])) + " contre " + Math.min(...temps));
  j.controle("leur maximum aussi",
    Math.max(...bornes.map(b => b[1])) === Math.max(...temps),
    Math.max(...bornes.map(b => b[1])) + " contre " + Math.max(...temps));

  j.section("l'écriture retenue est conservée");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);
  await pg.locator(".tm-temps").click();
  await pg.waitForTimeout(700);
  j.controle("la liste est encore à l'affiche",
    await pg.locator('[data-mode="liste"]').getAttribute("aria-pressed") === "true");
  j.controle("le ruban n'est pas dessiné en même temps",
    await pg.locator(".mg-v").count() === 0);

  j.section("la feuille du jour ne garde que ses mesures");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);
  await pg.locator("#dateJour").click();
  await pg.waitForTimeout(700);
  const tj = (await pg.locator("#feuille-titre").innerText()).split("\n")[0];
  j.controle("la date ouvre le jour", tj === "Le jour", tj);
  j.controle("elle porte les trois mesures",
    await pg.locator("#feuille-corps .mesure").count() === 3);
  j.controle("la prévision n'y est plus",
    await pg.locator("#feuille-corps .mt-table").count() === 0);

  await ctx.close();
  return j.fin(erreurs);
}
