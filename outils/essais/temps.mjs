/* Feuille du temps. La pastille météo du bandeau ouvre sa propre feuille, qui
   porte les vingt-quatre heures à venir en trois écritures. Les contrôles
   portent sur ce que le code ne peut pas vérifier seul : la fenêtre part bien
   de l'heure en cours et traverse minuit, chaque écriture rend la même série,
   et le météogramme ne mélange pas deux unités dans une voie. */
import { ouvrirContexte, journal, net, METEO, JOUR_FIGE } from "./commun.mjs";

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
      const l = v.split("\n").map(x => x.trim()).filter(x => x && !/^[+\u2212]$/.test(x));
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
    voie(/VENT/i).chiffres.includes("20 km/h"), voie(/VENT/i).chiffres.join(", "));
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

  /* Sept voies tiennent dans un écran au prix d'une hauteur contenue. Le titre
     d'une voie l'agrandit alors seule, d'un facteur deux et demi : sa courbe
     reprend du relief, et le dessin porte ce qu'il ne pouvait pas montrer
     replié, les valeurs heure par heure et la lecture de ses tracés. */
  j.section("le titre agrandit sa voie et découvre ce qu'elle cachait");
  const mesure = async () => pg.evaluate(() => {
    const v = [...document.querySelectorAll(".mg-v")];
    return {
      hauts: v.map(e => { const s = e.querySelector(".mg-s");
        return s ? Number(s.getAttribute("viewBox").split(" ")[3]) : 0; }),
      grandes: v.filter(e => e.classList.contains("mg-grand")).length,
      signes: v.map(e => { const i = e.querySelector(".mg-n i");
        return i ? i.textContent : ""; }).filter(Boolean),
      jalons: [...document.querySelectorAll("text.mg-p")].length,
      lectures: [...document.querySelectorAll(".mg-l:not([hidden])")].length,
      larg: [...new Set([...document.querySelectorAll(".mg-s")]
        .map(e => Math.round(e.getBoundingClientRect().width)))],
    };
  });
  const replie = await mesure();
  j.controle("au repos, aucune voie agrandie, aucune lecture, aucun jalon",
    replie.grandes === 0 && replie.lectures === 0 && replie.jalons === 0,
    JSON.stringify(replie));
  /* Une voie sans dessin n'a rien à agrandir : la pluie, repliée faute de lame,
     garde un titre ordinaire. */
  j.controle("chaque voie dessinée porte le signe de sa commande",
    replie.signes.length === 6 && replie.signes.every(c => c === "+"),
    replie.signes.join(""));

  await pg.locator('.mg-b[data-voie="temp"]').click();
  await pg.waitForTimeout(500);
  const ouverte = await mesure();
  j.controle("la voie touchée est deux fois et demie plus haute",
    ouverte.hauts[0] === Math.round(replie.hauts[0] * 2.5),
    `${replie.hauts[0]} points repliée, ${ouverte.hauts[0]} agrandie`);
  j.controle("les autres gardent leur taille",
    JSON.stringify(ouverte.hauts.slice(1)) === JSON.stringify(replie.hauts.slice(1)),
    JSON.stringify(ouverte.hauts));
  /* Le quadrillage des heures traverse la pile : une voie plus étroite que les
     autres ne se lirait plus en regard d'elles. */
  j.controle("toutes les voies gardent la largeur de l'axe",
    ouverte.larg.length === 1, ouverte.larg.join(", "));
  j.controle("une seule voie est agrandie, et son signe s'inverse",
    ouverte.grandes === 1 && ouverte.signes[0] === "−"
    && ouverte.signes.slice(1).every(c => c === "+"), ouverte.signes.join(""));
  j.controle("elle découvre ses valeurs heure par heure",
    ouverte.jalons >= 5, ouverte.jalons + " jalons");
  j.controle("et la lecture de ses tracés, seule dépliée",
    ouverte.lectures === 1
    && /point de rosée/.test(await pg.locator(".mg-l:not([hidden])").innerText()));
  /* Sa graduation se resserre : la hauteur gagnée sert aussi à situer les
     valeurs, non seulement à les étaler. */
  const pasDe = async () => pg.evaluate(() => {
    const c = [...document.querySelectorAll(".mg-v")][0]
      .querySelectorAll("text.mg-g");
    return [...c].map(t => parseInt(t.textContent));
  });
  const pasOuvert = await pasDe();
  const ecart = t => parseInt(t[1]) - parseInt(t[0]);
  j.controle("sa graduation se resserre",
    pasOuvert.length > degres.length && ecart(pasOuvert) < ecart(degres),
    `${ecart(degres)} degrés entre repères repliée, ${ecart(pasOuvert)} agrandie`);

  /* Une seule voie est ouverte à la fois : deux agrandissements simultanés
     auraient rendu la pile plus longue que ce qu'on peut parcourir. */
  await pg.locator('.mg-b[data-voie="vent"]').click();
  await pg.waitForTimeout(500);
  const seconde = await mesure();
  j.controle("ouvrir une autre voie referme la première",
    seconde.grandes === 1 && seconde.hauts[0] === replie.hauts[0]
    && seconde.hauts[1] === Math.round(replie.hauts[1] * 2.5),
    JSON.stringify(seconde.hauts));
  await pg.locator('.mg-b[data-voie="vent"]').click();
  await pg.waitForTimeout(500);
  const refermee = await mesure();
  j.controle("un second toucher la referme",
    JSON.stringify(refermee.hauts) === JSON.stringify(replie.hauts)
    && refermee.grandes === 0 && refermee.jalons === 0 && refermee.lectures === 0,
    JSON.stringify(refermee.hauts));

  /* Une voie vide occupait quarante points de haut et deux lignes de légende
     pour ne montrer qu'un filet : quand rien n'est attendu et que le risque
     reste bas, la ligne de titre le dit seule. Le jeu figé est sec. */
  const dessinees = await pg.locator(".mg-v .mg-s").count();
  j.controle("la voie de la pluie se replie quand il ne tombe rien",
    dessinees === 6 && /aucune/.test(voies.find(v => /PLUIE/i.test(v)) || ""),
    `${dessinees} voies dessinées sur ${voies.length}`);
  j.controle("elle garde son titre, sans commande à ouvrir",
    (voies.find(v => /PLUIE/i.test(v)) || "").split("\n").length === 2
    && await pg.locator('.mg-b[data-voie="pluie"]').count() === 0);
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
  /* Trois lignes de fragments séparés par des virgules ne se comparaient pas
     d'une carte à l'autre : « averses, sec » se contredisait, « rafales 41 »
     perdait son unité, et une grandeur cherchée se lisait à chaque fois à une
     place différente. Chaque carte porte les mêmes trois mesures, dans le même
     ordre et à la même place. */
  j.section("chaque moment porte les mêmes mesures, à la même place");
  const cartes = await pg.evaluate(() => [...document.querySelectorAll(".mo-c")].map(c => ({
    tete: c.querySelector(".mo-h").textContent.trim(),
    ciel: c.querySelector(".mo-l > span").textContent.trim(),
    ico: c.querySelectorAll(".mo-l > svg.mo-ic").length,
    noms: [...c.querySelectorAll(".mo-m .tp-m > span")].map(e => e.textContent.trim()),
    vals: [...c.querySelectorAll(".mo-m .tp-m > b")].map(e => e.textContent.trim()),
  })));
  j.controle("trois mesures nommées, dans le même ordre partout",
    cartes.length >= 4 && cartes.every(c =>
      JSON.stringify(c.noms) === '["Pluie","Vent","Humidité"]'),
    JSON.stringify(cartes[0].noms));
  j.controle("chacune porte un chiffre, ou dit qu'il n'y a rien",
    cartes.every(c => c.vals.length === 3
      && /^(aucune|\d)/.test(c.vals[0]) && /km\/h$/.test(c.vals[1]) && /%$/.test(c.vals[2])),
    JSON.stringify(cartes[0].vals));
  /* Le ciel se nomme à côté de la température, non collé à la pluie : « averses,
     sec » mettait sur la même ligne un état et une absence de lame. */
  j.controle("le ciel est nommé en tête, séparé de la pluie",
    cartes.every(c => c.ciel.length > 0 && !/mm|risque|sec/.test(c.ciel)),
    cartes.map(c => c.ciel).join(" | "));
  j.controle("et dessiné, comme partout ailleurs",
    cartes.every(c => c.ico === 1), cartes.map(c => c.ico).join(", "));

  /* L'état du ciel était nommé sans être dessiné à deux endroits : le grand
     chiffre du bandeau et le sous-titre de la feuille. La liste, les moments et
     la semaine le dessinaient tous. */
  j.section("le ciel est dessiné partout où il est nommé");
  j.controle("le sous-titre de la feuille porte son icône",
    await pg.locator("#feuille-titre .feuille-latin svg.f-sous-ic").count() === 1);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(500);
  j.controle("le bandeau du jour aussi, devant son grand chiffre",
    await pg.evaluate(() => {
      const b = document.querySelector(".tm-temps");
      return b.firstElementChild.tagName === "svg"
        && b.firstElementChild.classList.contains("tm-ic")
        && b.children[1].classList.contains("tm-deg");
    }));
  await pg.locator(".tm-temps").click();
  await pg.waitForTimeout(700);
  await pg.locator('[data-mode="moments"]').click();
  await pg.waitForTimeout(500);

  j.section("les trois écritures s'accordent");
  const bornes = (await pg.locator(".mo-l > b").allInnerTexts())
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
  /* Un soir d'août orageux, l'application ne portait aucune pluie quand Météo
     France et Pleinchamp en donnaient deux à trois millimètres dans l'heure qui
     suivait. La sélection automatique d'Open-Meteo ne garantit pas AROME sur la
     France : le modèle français à 1,5 km est demandé et posé par-dessus, sans
     remplacer la série de secours là où il se tait. */
  j.section("AROME se pose sur la série, et se replie là où il se tait");
  const lit = async (c, n) => c.pg.evaluate(nb =>
    [...document.querySelectorAll("tr.hh")].slice(0, nb).map(r => ({
      p: r.querySelector(".hh-p").textContent.trim(),
      uv: r.querySelector(".hh-uv").textContent.trim(),
      t: r.querySelector(".hh-t").textContent.trim(),
    })), n);
  const versListe = async c => {
    await c.pg.locator(".tm-temps").click();
    await c.pg.waitForTimeout(700);
    await c.pg.locator('[data-mode="liste"]').click();
    await c.pg.waitForTimeout(500);
  };
  /* AROME donne la pluie et se tait sur l'indice UV, qui est une grandeur
     dérivée : c'est exactement le cas qui aurait vidé une voie du ruban si le
     modèle avait remplacé la série entière. */
  const cA = await ouvrirContexte(navigateur, { arome: h => ({
    ...h, precipitation: h.precipitation.map(() => 2.5),
    uv_index: h.uv_index.map(() => null),
    temperature_2m: h.temperature_2m.map(() => null),
  }) });
  await cA.pg.waitForTimeout(700);
  await versListe(cA);
  const avec = await lit(cA, 3);
  j.controle("la pluie d'AROME passe devant",
    avec.every(l => l.p === "2,5"), JSON.stringify(avec.map(l => l.p)));
  j.controle("une colonne entièrement vide laisse la série de secours",
    avec.every(l => /\d/.test(l.uv)), JSON.stringify(avec.map(l => l.uv)));
  j.controle("une heure vide se replie aussi, sans trouer la colonne",
    avec.every(l => /^\d+$/.test(l.t)), JSON.stringify(avec.map(l => l.t)));
  await cA.ctx.close();

  /* Deux modèles chargés, un seul qui annonce la pluie : la prévision est
     incertaine, et le dire vaut mieux que trancher en silence. C'est le cas du
     15 août, où la source automatique donnait zéro et AROME plusieurs
     millimètres. Un écart de quelques dixièmes ne dit rien et ne paraît pas. */
  j.section("deux modèles qui ne s'accordent pas le disent");
  const cD = await ouvrirContexte(navigateur, { arome: h => ({
    ...h, precipitation: h.precipitation.map((_, i) => (i % 24 === 3 ? 3.4 : 0)) }) });
  await cD.pg.waitForTimeout(700);
  await cD.pg.locator(".tm-temps").click();
  await cD.pg.waitForTimeout(700);
  const dv = (await cD.pg.locator(".jd-l").allInnerTexts()).map(net);
  j.controle("la première ligne dit l'incertitude et nomme les deux sources",
    /^Prévision incertaine/.test(dv[0]) && /AROME/.test(dv[0])
    && /seconde source/.test(dv[0]), dv[0]);
  j.controle("elle ne double pas la ligne de pluie ordinaire",
    dv.filter(t => /^Pluie /.test(t)).length === 0, dv.join(" | "));
  await cD.ctx.close();

  /* Un écart de quelques dixièmes ne change aucune décision au jardin : la
     mention ne paraît pas, et la ligne de pluie ordinaire reprend sa place. */
  const cE = await ouvrirContexte(navigateur, { arome: h => ({
    ...h, precipitation: h.precipitation.map((_, i) => (i % 24 === 3 ? 0.3 : 0)) }) });
  await cE.pg.waitForTimeout(700);
  await cE.pg.locator(".tm-temps").click();
  await cE.pg.waitForTimeout(700);
  const dvE = (await cE.pg.locator(".jd-l").allInnerTexts()).map(net);
  j.controle("un écart faible ne se signale pas",
    !/incertaine/.test(dvE.join(" ")), dvE[0]);
  await cE.ctx.close();

  /* AROME muet, en panne ou hors de portée : l'application rend ce qu'elle
     rendait avant, sans voie vide ni ligne trouée. */
  const cB = await ouvrirContexte(navigateur, { arome: false });
  await cB.pg.waitForTimeout(700);
  await versListe(cB);
  const sans = await lit(cB, 3);
  j.controle("sans AROME, la série de secours tient seule",
    sans.every(l => /\d/.test(l.t) && /\d/.test(l.uv))
    && sans.some(l => l.p !== "2,5"), JSON.stringify(sans));

  /* La charge est gardée une heure, et tombe aussi au changement d'heure : une
     charge prise à 23 h 55 tenait sinon jusqu'à 0 h 55. */
  const cle = await cB.pg.evaluate(() => Object.keys(localStorage)
    .filter(k => k.startsWith("monjardin.meteo")));
  j.controle("le cache porte l'heure de sa prise et son numéro de version",
    cle.length === 1 && cle[0] === "monjardin.meteo.v5"
    && await cB.pg.evaluate(() => {
      const c = JSON.parse(localStorage.getItem("monjardin.meteo.v5"));
      return typeof c.h === "string" && c.h.length === 13;
    }), cle.join(", "));
  await cB.ctx.close();

  /* La table de la semaine lisait la charge quotidienne, qui vient de la
     sélection automatique, quand les heures viennent d'AROME. Le même dimanche
     y portait vingt-neuf degrés et trente-deux, « orage » et « couvert », trois
     millimètres et six dixièmes et rien du tout. Deux sources pour un seul jour
     font trois contradictions dans une même feuille. */
  j.section("la semaine et les heures ne se contredisent plus");
  const md = JSON.parse(METEO);
  md.daily.precipitation_sum = md.daily.precipitation_sum.map(() => 9.9);
  md.daily.weather_code = md.daily.weather_code.map(() => 95);
  md.daily.temperature_2m_max = md.daily.temperature_2m_max.map(() => 9);
  md.daily.temperature_2m_min = md.daily.temperature_2m_min.map(() => 8);
  // Deux millimètres et quatre dixièmes à trois heures du matin, rien ensuite.
  md.hourly.precipitation = md.hourly.time.map(t => (Number(t.slice(11, 13)) === 3 ? 2.4 : 0));
  const cS = await ouvrirContexte(navigateur, { meteo: JSON.stringify(md) });
  await cS.pg.waitForTimeout(700);
  await cS.pg.locator(".tm-temps").click();
  await cS.pg.waitForTimeout(700);
  const sem = await cS.pg.evaluate(() => [...document.querySelectorAll(".mt-table tr")].map(r => ({
    jour: r.querySelector("th").textContent.trim(),
    max: parseInt(r.querySelector(".mt-t b").textContent),
    mm: (r.querySelector(".mt-p").firstChild || {}).textContent || "",
    note: (r.querySelector(".mt-p small") || {}).textContent || "",
  })));
  /* Les deux premières lignes se résument des heures, les suivantes gardent la
     charge quotidienne : la série horaire ne couvre que deux jours. */
  j.controle("aujourd'hui et demain suivent les heures, non le quotidien",
    sem[0].max !== 9 && sem[1].max !== 9 && sem[2].max === 9,
    sem.slice(0, 3).map(l => `${l.jour} ${l.max}°`).join(" | "));
  j.controle("leur lame est celle des heures",
    sem[0].mm.startsWith("2,4") && sem[1].mm.startsWith("2,4") && sem[2].mm.startsWith("9,9"),
    sem.slice(0, 3).map(l => `${l.jour} ${l.mm}`).join(" | "));
  /* La table donne la journée civile, les heures partent de maintenant : ce qui
     est tombé avant l'heure manquait à l'appel sans que rien ne le dise. */
  j.controle("la journée en cours dit ce qui est déjà tombé",
    /^dont 2,4 tombés$/.test(sem[0].note), sem[0].note);
  j.controle("les autres jours n'ont rien à dire de tel",
    sem.slice(1).every(l => l.note === ""), sem.slice(1).map(l => l.note).join("|"));
  /* Le recoupement qui vaut : le maximum de la table est celui des heures. Sans
     lui, deux sources cohérentes entre elles mais fausses passeraient. */
  await cS.pg.locator('[data-mode="liste"]').click();
  await cS.pg.waitForTimeout(500);
  const tj = await cS.pg.evaluate(() => {
    const jour = document.querySelector("tr.hh .hh-h, tr.hh th");
    void jour;
    return [...document.querySelectorAll("tr.hh")]
      .filter(r => !r.previousElementSibling
        || !r.previousElementSibling.classList.contains("hh-jour"))
      .map(r => Number(r.querySelector(".hh-t").textContent));
  });
  j.controle("le maximum de la table est celui des heures du jour",
    sem[0].max === Math.max(...tj.slice(0, 24).filter(Number.isFinite)),
    `${sem[0].max}° dans la table, ${Math.max(...tj)}° dans les heures`);
  await cS.ctx.close();

  /* Audit du 16 août. Trois défauts capables de poser deux chiffres
     contradictoires sur le même écran, ou d'écrire une saisie sur le mauvais
     jour. Les contrôles portent sur ce qui se voit, non sur le calcul. */
  j.section("l'audit : un trou de charge n'est pas une valeur nulle");
  const mt = JSON.parse(METEO);
  const creuser = (c, hh) => mt.hourly[c].forEach((v, k) => {
    if (hh.includes(Number(mt.hourly.time[k].slice(11, 13)))) mt.hourly[c][k] = null;
  });
  creuser("temperature_2m", [14, 15]);
  creuser("uv_index", [12, 13, 14]);
  const cT = await ouvrirContexte(navigateur, { meteo: JSON.stringify(mt), arome: false });
  await cT.pg.waitForTimeout(700);
  await cT.pg.locator(".tm-temps").click();
  await cT.pg.waitForTimeout(700);
  const avis = (await cT.pg.locator(".jd-l").allInnerTexts()).map(net);
  /* Zéro degré en août déclenchait « Gel probable, voiler ce qui craint », et un
     indice UV nul l'après-midi ouvrait un créneau d'arrosage en plein soleil. */
  j.controle("un trou de température ne fabrique pas une gelée d'août",
    !avis.some(t => /[Gg]el probable/.test(t)), avis.join(" | "));
  const creux = await cT.pg.evaluate(() => {
    const l = [...document.querySelectorAll("tr.hh")].map(r => ({
      h: r.querySelector(".hh-h") ? r.querySelector(".hh-h").textContent.trim() : "",
      t: parseInt(r.querySelector(".hh-t").textContent),
      uv: r.querySelector(".hh-uv").textContent.trim(),
    }));
    return { bas: l.filter(x => x.t < 5).length,
             uvVide: l.filter(x => x.uv === "0" || x.uv === "0,0").length };
  });
  j.controle("aucune heure d'août ne tombe sous cinq degrés",
    creux.bas === 0, creux.bas + " heures sous 5°");
  await cT.ctx.close();

  /* La borne de fin est l'heure qui suit la plage, et c'est son jour qui décide
     du mot « demain ». Le test portait sur la seule heure vingt-trois : une
     plage finissant à quatorze heures le lendemain s'écrivait « de 16 h à
     14 h », une fin avant son début. */
  j.section("l'audit : une plage qui franchit minuit le dit");
  const bornees = [];
  [avis, (await pg.locator(".jd-l").allInnerTexts()).map(net)].forEach(l =>
    l.forEach(t => {
      const m = t.match(/de (demain )?(\d{2}) h à (demain )?(\d{2}) h/);
      if (m) bornees.push({ t, a: parseInt(m[2]), b: parseInt(m[4]),
                            da: Boolean(m[1]), db: Boolean(m[3]) });
    }));
  j.controle("aucune plage ne finit avant d'avoir commencé",
    bornees.length > 0 && bornees.every(x => x.db || x.da || x.b > x.a),
    bornees.map(x => x.t).join(" | "));

  /* Le quotidien lisait la date en temps universel, l'horaire en heure locale :
     entre minuit et deux heures l'été, les deux séries ne désignaient pas le
     même jour. La table intitulait « aujourd'hui » la journée écoulée, et un
     relevé de pluviomètre saisi à minuit et demi s'enregistrait sur la veille. */
  j.section("l'audit : à minuit et demi, le jour est le bon des deux côtés");
  const nuit = JOUR_FIGE + 15.5 * 3600e3;   // 3 août, 00 h 30, heure de Paris
  const cN = await ouvrirContexte(navigateur, { jour: nuit });
  await cN.pg.waitForTimeout(800);
  const dates = await cN.pg.evaluate(() => {
    const d = new Date();
    return { local: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
      + "-" + String(d.getDate()).padStart(2, "0"), utc: d.toISOString().slice(0, 10) };
  });
  j.controle("l'horloge est bien posée dans la fenêtre du défaut",
    dates.local !== dates.utc, `${dates.local} en local, ${dates.utc} en universel`);
  await cN.pg.locator(".tm-temps").click();
  await cN.pg.waitForTimeout(700);
  await cN.pg.locator('[data-mode="liste"]').click();
  await cN.pg.waitForTimeout(500);
  const prem = await cN.pg.evaluate(() => {
    const r = document.querySelector("tr.hh");
    return r ? r.firstElementChild.textContent : "(aucune ligne)";
  });
  j.controle("la première heure de la liste est minuit", net(prem) === "00 h", net(prem));
  await cN.pg.locator("#fermerFeuille").click();
  await cN.pg.waitForTimeout(400);
  /* Le chemin qui corrompt : la ligne de saisie « aujourd'hui » de la feuille de
     l'eau porte la date écrite en base. */
  await cN.pg.locator('[data-vue="eau"]').first().click();
  await cN.pg.waitForTimeout(700);
  const saisie = await cN.pg.evaluate(() => {
    const l = document.querySelector(".rel-ligne");
    return l ? l.dataset.jour : "";
  });
  j.controle("la ligne de saisie du jour porte la date locale, non celle d'hier",
    saisie === dates.local, `${saisie} pour un ${dates.local}`);
  await cN.ctx.close();

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
