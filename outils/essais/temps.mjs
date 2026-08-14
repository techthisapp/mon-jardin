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

  /* Les courbes dessinaient un relief sans dire de combien il monte : la pile
     n'avait aucune graduation verticale, et la voie de la température écrasait
     dix-sept degrés dans quarante-six points. Chaque voie chiffrée porte
     maintenant ses repères, et le chiffre passe par-dessus les tracés : un filet
     se laisse traverser par une courbe, un nombre coupé par elle ne se lit plus. */
  j.section("les voies portent une graduation chiffrée");
  const grad = await pg.evaluate(() => {
    const par = [...document.querySelectorAll(".mg-v")].map(v => {
      const t = v.textContent.replace(/\s+/g, " ").trim();
      const svg = v.querySelector(".mg-s");
      const enfants = svg ? [...svg.children] : [];
      const g = enfants.filter(e => e.classList.contains("mg-g"));
      const dernierTrace = enfants.map(e => e.tagName).lastIndexOf("polyline");
      const premierChiffre = g.length ? enfants.indexOf(g[0]) : -1;
      return {
        nom: t.split(" ")[0] + " " + (t.split(" ")[1] || ""),
        plage: (v.querySelector(".mg-r") || {}).textContent || "",
        haut: svg ? Number(svg.getAttribute("viewBox").split(" ")[3]) : 0,
        chiffres: g.map(e => e.textContent),
        dessus: premierChiffre < 0 || dernierTrace < 0 || premierChiffre > dernierTrace,
      };
    });
    return par;
  });
  const voie = re => grad.find(v => re.test(v.nom)) || { chiffres: [], haut: 0, plage: "" };
  const degres = voie(/TEMP/i).chiffres;
  j.controle("la température porte au moins deux repères en degrés",
    degres.length >= 2 && degres.every(c => /^-?\d+°$/.test(c)), degres.join(", "));
  /* Les repères se suivent d'un pas constant : une graduation dont les crans ne
     sont pas également espacés ne se lit pas d'un coup d'oeil. */
  const pas = degres.slice(1).map((c, i) => parseInt(c) - parseInt(degres[i]));
  j.controle("d'un pas constant", new Set(pas).size === 1 && pas[0] > 0, pas.join(", "));
  j.controle("la voie de la température tient quatre-vingt-six points",
    voie(/TEMP/i).haut === 86, voie(/TEMP/i).haut + " points");
  j.controle("le seuil du vent dit ses vingt kilomètres par heure",
    voie(/VENT/i).chiffres.includes("20 km/h"), voie(/VENT/i).chiffres.join(", "));
  /* L'échelle de l'humidité partait de zéro, et la journée tenait dans le tiers
     haut de la voie : elle part du plancher du jour, que le pied de la bande
     nomme, sans quoi la hauteur remplie se lirait comme une part de cent. */
  const humG = voie(/HUMIDIT/i).chiffres;
  const bas = parseInt(humG.filter(c => c !== "90 %")[0]);
  const minJour = parseInt(voie(/HUMIDIT/i).plage);
  j.controle("l'humidité nomme son seuil et le pied de sa bande",
    humG.length === 2 && humG.includes("90 %") && bas % 10 === 0,
    humG.join(", "));
  /* Le pied passe sous la plus basse valeur du jour : au-dessus, la courbe
     sortirait de la voie par le bas. */
  j.controle("le pied passe sous la plus basse valeur du jour",
    bas < minJour, `${bas} % pour une journée à ${voie(/HUMIDIT/i).plage}`);
  j.controle("la pression porte un repère en hectopascals",
    voie(/PRESSION/i).chiffres.some(c => /^\d{4} hPa$/.test(c)),
    voie(/PRESSION/i).chiffres.join(", "));
  j.controle("dans chaque voie, les chiffres sont posés par-dessus les tracés",
    grad.every(v => v.dessus), grad.filter(v => !v.dessus).map(v => v.nom).join(", "));

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
  /* Le ruban fait plus de quatre cents points de haut : une seule annonce, en
     pied, sortait du champ dès que le doigt lisait les premières voies. Elle est
     doublée en tête, adossée au titre de la section, et les deux disent la même
     heure. */
  const annonces = (await pg.locator(".mg-sel span").allInnerTexts()).map(net);
  j.controle("l'heure lue est annoncée en tête et en pied",
    annonces.length === 2 && annonces[0] === annonces[1]
    && /^Valeurs à \d{2} h$/.test(annonces[0]), annonces.join(" | "));
  const heureLue = annonces[0];
  j.controle("celle de tête précède les voies, celle de pied les suit",
    await pg.evaluate(() => {
      const e = [...document.querySelector(".mg").children];
      const sel = e.filter(n => n.classList.contains("mg-sel")).map(n => e.indexOf(n));
      const v = e.filter(n => n.classList.contains("mg-v")).map(n => e.indexOf(n));
      return sel.length === 2 && sel[0] < Math.min(...v) && sel[1] > Math.max(...v);
    }));
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
    await pg.locator(".mg-sel:not([hidden])").count() === 2);
  await pg.locator(".mg-rendre").first().click();
  await pg.waitForTimeout(300);
  j.controle("le retour rend les plages",
    (await pg.locator(".mg-r").allInnerTexts()).map(net).join("|") === plages.join("|"));
  j.controle("et retire les montants de lecture",
    await pg.evaluate(() => [...document.querySelectorAll(".mg-cur")]
      .every(l => l.hasAttribute("hidden")))
    && await pg.locator(".mg-sel[hidden]").count() === 2);
  // Un doigt reposé au même endroit rend les plages, sans passer par le lien.
  await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(250);
  await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(250);
  j.controle("un second appui au même endroit rend aussi les plages",
    await pg.locator(".mg-sel[hidden]").count() === 2);
  /* L'annonce de tête est un texte, non une abscisse : la toucher lisait
     jusqu'ici l'heure qui se trouve sous ce mot. */
  await pg.mouse.move(cadre.x + cadre.width * 0.62, cadre.y + cadre.height / 2);
  await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(250);
  const enTete = pg.locator(".mg-sel").first();
  const b = await enTete.boundingBox();
  await pg.mouse.move(b.x + 30, b.y + b.height / 2);
  await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(250);
  j.controle("toucher l'annonce ne change pas l'heure lue",
    net(await enTete.locator("span").innerText()) === heureLue,
    net(await enTete.locator("span").innerText()) + " pour " + heureLue);
  await pg.locator(".mg-rendre").last().click();
  await pg.waitForTimeout(250);

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

  /* La table portait cinq des grandeurs que le service rend à l'heure. Elle les
     porte toutes : le ruban en dessine sept, les moments en résument quatre, la
     table est l'écriture qui ne choisit pas. */
  const colonnes = await pg.locator(".hh-tete th").evaluateAll(l =>
    l.map(e => ((e.childNodes[0] || {}).textContent || "").trim()));
  j.controle("la ligne de tête nomme les douze colonnes et l'heure",
    colonnes.join(" ") === "heure  temp. ressenti vent rafales pluie risque "
      + "humidité rosée nuages uv pression", colonnes.join(" | "));
  const unites = await pg.locator(".hh-tete th small").allInnerTexts();
  j.controle("chacune porte son unité",
    unites.map(net).join(" ") === "° ° km/h km/h mm % % ° % hPa",
    unites.map(net).join(" | "));
  /* Les nombres se lisent nus, l'unité étant portée par l'entête : elle se
     répétait vingt-quatre fois par colonne. */
  const hu = (await pg.locator("tr.hh .hh-hu").allInnerTexts()).map(net);
  j.controle("chaque heure porte son humidité, sans unité répétée",
    hu.length === 24 && hu.every(t => /^\d+$/.test(t)), hu[0]);
  const pres = (await pg.locator("tr.hh .hh-pres").allInnerTexts()).map(net);
  j.controle("et sa pression, en hectopascals entiers",
    pres.length === 24 && pres.every(t => /^\d{3,4}$/.test(t)), pres[0]);
  const ros = (await pg.locator("tr.hh .hh-ros").allInnerTexts()).map(net);
  j.controle("et son point de rosée", ros.length === 24 && ros.every(t => /^-?\d+$/.test(t)),
    ros[0]);
  const nu = (await pg.locator("tr.hh .hh-nu").allInnerTexts()).map(net);
  j.controle("et sa couverture nuageuse",
    nu.length === 24 && nu.every(t => /^\d+$/.test(t)), nu[0]);
  /* Le ressenti ne se répète que lorsqu'il s'écarte du thermomètre : redit à
     l'identique vingt-quatre fois, il ferait une colonne de doublons. */
  const res = await pg.evaluate(() => [...document.querySelectorAll("tr.hh")].map(r => ({
    t: r.querySelector(".hh-t").textContent.trim(),
    res: r.querySelector(".hh-res").textContent.trim() })));
  j.controle("le ressenti se tait quand il vaut le thermomètre",
    res.every(x => x.res === "" || x.res !== x.t) && res.some(x => x.res !== ""),
    res.slice(0, 3).map(x => `${x.t}/${x.res || "—"}`).join(" "));
  /* Douze colonnes ne tiennent pas dans un téléphone : la table défile de côté,
     l'heure restant collée au bord gauche. */
  const tenue = await pg.evaluate(() => {
    const d = document.querySelector(".hh-defile");
    const t = document.querySelector(".hh-table");
    const th = document.querySelector("tr.hh th");
    d.scrollLeft = 400;
    const bord = Math.round(th.getBoundingClientRect().left - d.getBoundingClientRect().left);
    d.scrollLeft = 0;
    return { defile: t.scrollWidth > d.clientWidth, collee: getComputedStyle(th).position,
             bord, page: document.documentElement.scrollWidth
               <= document.documentElement.clientWidth + 1 };
  });
  j.controle("la table défile de côté sans emporter la page",
    tenue.defile && tenue.page, JSON.stringify(tenue));
  j.controle("l'heure reste collée au bord, sans rien laisser passer",
    tenue.collee === "sticky" && tenue.bord === 0, `${tenue.collee}, ${tenue.bord} px du bord`);
  j.controle("un air moite est marqué",
    await pg.locator("tr.hh .hh-moite").count() >= 1,
    String(await pg.locator("tr.hh .hh-moite").count()));

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
  const temps = (await pg.locator("tr.hh .hh-t").allInnerTexts()).map(t => Number(t.replace("°", "")));
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

  /* Les trois mesures du jour ont quitté leur feuille pour l'écran, sous le
     temps qu'il fait : elles parlent du même jour et s'y lisent sans détour. */
  j.section("les trois mesures se lisent sur l'écran du jour");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);
  j.controle("le bloc du jour porte le temps et les trois mesures",
    await pg.locator("#blocTemps .tm-temps").count() === 1
    && await pg.locator("#blocTemps .mesure-j").count() === 3);
  j.controle("la prévision à sept jours reste dans la feuille du temps",
    await pg.locator("#blocTemps .mt-table").count() === 0);

  await ctx.close();
  return j.fin(erreurs);
}
