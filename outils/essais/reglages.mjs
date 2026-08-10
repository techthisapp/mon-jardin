/* La navigation rénovée. Trois destinations de même rang dans la barre du bas,
   les plantes au centre sur un bouton rond. Ce qui restait des réglages devient
   deux feuilles, celle du jardin ouverte par son nom, celle du compte ouverte
   par le bouton du coin.

   Les panneaux ne sont pas reconstruits à chaque ouverture, ils sont déplacés
   depuis une réserve hors écran : les contrôles portent surtout sur ce
   déplacement, seul endroit où un champ pourrait perdre son écouteur ou une
   ouverture suivante effacer le panneau. */
import { ouvrirContexte, journal, ouvrirListeDesPlantes, ouvrirMonJardin,
         ouvrirFiche, fermerFiche, entrerEnEdition, net, CATALOGUE } from "./commun.mjs";

/* Le jardin figé porte tout le catalogue et aucun espace : cette suite lui en
   donne deux et n'y met qu'une partie des plantes, seul moyen de contrôler à la
   fois le compte des tuiles et l'écart entre le jardin et le catalogue. */
const PLANTES = JSON.parse(CATALOGUE).plants;
const AU_JARDIN = PLANTES.slice(0, 20).map(p => p.id);
const ESPACES = [{ id: "e1", name: "Potager", color: "#7BA05B" },
                 { id: "e2", name: "Verger" }];
const PLACEMENTS = [
  { plant_id: PLANTES[0].id, espace_id: "e1", quantity: 3 },
  { plant_id: PLANTES[1].id, espace_id: "e1" },
  { plant_id: PLANTES[2].id, espace_id: "e2", quantity: 1 },
];
/* Une tâche masquée sur la première plante : son rappel a quitté la rangée du
   catalogue pour l'onglet du moment de la fiche. */
const SOURDINES = [{ garden_id: "g1", plant_id: PLANTES[0].id, phase: "taille",
                     portee: "toujours", annee: null }];

const ouAilleurs = pg => pg.evaluate(() => {
  const r = document.getElementById("reserve-reglages");
  return ["bloc-jardin", "bloc-compte"].map(id => {
    const b = document.getElementById(id);
    return !b ? "absent" : b.parentNode === r ? "réserve"
      : b.closest("#feuille-corps") ? "feuille" : "ailleurs";
  });
});

export default async function essai(navigateur) {
  const j = journal("Navigation et réglages");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur,
    { jardin: AU_JARDIN, espaces: ESPACES, placements: PLACEMENTS,
      sourdines: SOURDINES });

  j.section("trois destinations, dont les plantes au centre");
  const barre = await pg.locator(".barre-basse .onglet").evaluateAll(
    l => l.map(b => [b.dataset.ecran, b.classList.contains("onglet-rond")]));
  j.controle("l'ordre est le moment, les plantes, le calendrier",
    JSON.stringify(barre) === JSON.stringify([["maintenant", false],
      ["selection", true], ["planning", false]]), JSON.stringify(barre));
  j.controle("la sous-navigation des réglages a disparu",
    await pg.locator(".sous-onglet, #sousOnglets, #fermerConfig").count() === 0);
  /* Le rond dépasse vers le haut : la marge basse du contenu doit le dégager,
     faute de quoi la dernière ligne de la page se cache dessous. */
  const debord = await pg.evaluate(() => {
    const r = document.querySelector(".onglet-rond").getBoundingClientRect();
    const b = document.querySelector(".barre-basse").getBoundingClientRect();
    const m = getComputedStyle(document.querySelector("main")).paddingBottom;
    return { haut: b.top - r.top, bas: r.bottom - b.bottom, marge: parseFloat(m),
             hauteurBarre: b.height };
  });
  j.controle("le bouton rond dépasse par le haut, jamais par le bas",
    debord.haut > 8 && debord.bas <= 0, `${debord.haut.toFixed(1)} au-dessus, `
    + `${debord.bas.toFixed(1)} en dessous`);
  j.controle("le contenu laisse la place à la barre et au rond",
    debord.marge > debord.hauteurBarre + debord.haut,
    `${debord.marge} de marge pour ${(debord.hauteurBarre + debord.haut).toFixed(1)}`);

  j.section("le bouton rond mène au jardin");
  await ouvrirMonJardin(pg);
  j.controle("l'écran est affiché",
    await pg.locator("#ec-selection:not([hidden])").count() === 1);
  j.controle("le rond est le seul onglet marqué",
    await pg.locator('.onglet[aria-selected="true"]').count() === 1
    && await pg.locator('.onglet-rond[aria-selected="true"]').count() === 1);
  j.controle("il ouvre sur mon jardin et non sur les plantes",
    await pg.locator('.onglet-j[aria-selected="true"]').getAttribute("data-panneau") === "jardin"
    && await pg.locator("#pan-jardin:not([hidden])").count() === 1
    && await pg.locator("#pan-plantes[hidden]").count() === 1);

  j.section("le premier niveau pose une tuile par espace");
  const tuiles = await pg.locator(".tuile-espace").evaluateAll(l => l.map(b => [
    b.querySelector(".tuile-nom").textContent, b.querySelector(".tuile-nb").textContent]));
  j.controle("chaque espace a la sienne, plus celle des non placées",
    JSON.stringify(tuiles.map(t => t[0])) === '["Potager","Verger","Non placées"]',
    JSON.stringify(tuiles));
  j.controle("la tuile porte un nombre de plantes",
    tuiles.every(t => /^\d+$/.test(t[1])), JSON.stringify(tuiles.map(t => t[1])));
  j.controle("le compte est celui des plantes rattachées",
    JSON.stringify(tuiles.map(t => t[1])) === '["2","1","17"]', JSON.stringify(tuiles));

  j.section("la tuile ouvre le détail de son espace");
  const nomTuile = "Potager";
  await pg.locator(".tuile-espace", { hasText: nomTuile }).first().dispatchEvent("click");
  await pg.waitForTimeout(300);
  j.controle("le premier niveau a cédé la place",
    await pg.locator("#niveauEspaces[hidden]").count() === 1
    && await pg.locator("#detailEspace:not([hidden])").count() === 1);
  j.controle("le détail porte le nom de l'espace",
    net(await pg.locator(".titre-detail").innerText()) === nomTuile,
    net(await pg.locator(".titre-detail").innerText()));
  /* Une plante par ligne : la quantité se lit, les gestes attendent le mode
     d'édition. La note du placement a été reprise par le journal daté. */
  j.controle("chaque plante tient sur une ligne, sa quantité lisible",
    await pg.locator("#detailEspace .ligne-espace").count() > 0
    && await pg.locator("#detailEspace .ligne-espace .qte-l").count()
       === await pg.locator("#detailEspace .ligne-espace").count()
    && await pg.locator("#detailEspace .ligne-espace .notes").count() === 0
    && await pg.locator("#detailEspace .outils-ligne").count() === 0);
  await entrerEnEdition(pg);
  /* La quantité a quitté ces gestes pour la rangée, où elle se lit : il ne
     reste ici que ce qui touche au placement lui-même. */
  j.controle("les gestes paraissent en mode Modifier les plantes",
    await pg.locator("#detailEspace .outils-ligne").count()
      === await pg.locator("#detailEspace .ligne-espace").count()
    && await pg.locator("#detailEspace .outils-ligne .retirer-lieu").count() > 0
    && await pg.locator("#detailEspace .outils-ligne .qte").count() === 0);
  await pg.locator("#retourEspace").dispatchEvent("click");
  await pg.waitForTimeout(250);
  j.controle("le retour ramène aux tuiles",
    await pg.locator("#niveauEspaces:not([hidden])").count() === 1
    && await pg.locator("#detailEspace[hidden]").count() === 1);

  j.section("l'onglet des plantes ouvre sur celles du jardin");
  await pg.locator('.onglet-j[data-panneau="plantes"]').dispatchEvent("click");
  await pg.waitForTimeout(400);
  j.controle("la portée retenue est mes plantes",
    await pg.locator("#porteeJardin").getAttribute("aria-pressed") === "true");
  const auJardin = await pg.locator(".item-bloc").count();
  const coches = await pg.locator('.item[aria-pressed="true"]').count();
  j.controle("toutes les rangées affichées sont cochées",
    auJardin === 20 && coches === 20, `${coches} cochées sur ${auJardin}`);
  /* Le haut de l'écran occupait cinquante-six pour cent de la hauteur avant la
     première plante. Ce qui reste déplié se compte ici. */
  j.section("le haut de l'écran laisse la place à la liste");
  const haut = await pg.evaluate(() => {
    const f = document.querySelector("#pan-plantes .filtres").getBoundingClientRect();
    const r = document.querySelector("#listes .item-bloc").getBoundingClientRect();
    return {
      filtres: Math.round(f.height),
      lignes: [...document.querySelectorAll("#pan-plantes .filtres > *")]
        .filter(e => !e.hidden).length,
      avant: Math.round(r.top),
      ecran: window.innerHeight,
      rangee: Math.round(r.height),
    };
  });
  j.controle("deux lignes de contrôle restent visibles, le reste est replié",
    haut.lignes === 2, `${haut.lignes} lignes, ${haut.filtres} px de carte`);
  j.controle("le chrome tient sous la moitié de l'écran",
    haut.avant < haut.ecran / 2,
    `${haut.avant} px avant la première plante sur ${haut.ecran}`);
  j.controle("le décochage général est rangé sous les filtres",
    await pg.locator("#corpsFiltresS #vider").count() === 1
    && await pg.locator("#corpsFiltresS #compte").count() === 1);

  j.section("chaque portée porte son propre compte");
  const comptes = await pg.evaluate(() => ({
    jardin: (document.getElementById("nbAuJardin") || {}).textContent,
    tout: (document.getElementById("nbCatalogue") || {}).textContent,
    bilan: document.getElementById("bilanSel").hidden,
  }));
  j.controle("le segment annonce le jardin et le catalogue",
    comptes.jardin === String(auJardin) && Number(comptes.tout) > auJardin,
    `${comptes.jardin} au jardin, ${comptes.tout} au catalogue`);
  j.controle("le bilan se tait tant que rien n'est écarté", comptes.bilan);
  await pg.fill("#rech", "zzz");
  await pg.waitForTimeout(300);
  const filtre = await pg.evaluate(() => ({
    cache: document.getElementById("bilanSel").hidden,
    texte: document.getElementById("bilanSel").textContent,
  }));
  j.controle("il paraît dès qu'un filtre écarte, et compte sur la portée",
    !filtre.cache && / sur 20 affichées$/.test(filtre.texte), filtre.texte);
  await pg.fill("#rech", "");
  await pg.waitForTimeout(300);

  /* Toutes les rangées sont cochées en portée jardin : la teinte verte n'y
     distingue rien et peignait la liste entière. Le rond porte seul le signal,
     la teinte reprend son office au catalogue entier. */
  j.section("un seul signal de retenue selon la portée");
  const teintes = await pg.evaluate(() => {
    const fond = () => getComputedStyle(document.querySelector(
      '#listes .item[aria-pressed="true"]')).backgroundColor;
    const auJardin = fond();
    document.querySelector('.segment[data-portee="tout"]').click();
    return { auJardin };
  });
  await pg.waitForTimeout(500);
  const teinteTout = await pg.evaluate(() => getComputedStyle(
    document.querySelector('#listes .item[aria-pressed="true"]')).backgroundColor);
  j.controle("au jardin, la rangée retenue n'est pas teintée",
    teintes.auJardin === "rgb(255, 255, 255)", teintes.auJardin);
  j.controle("au catalogue entier, elle l'est",
    teinteTout !== teintes.auJardin, teinteTout);

  const tout = await pg.locator(".item-bloc").count();
  j.controle("le catalogue entier en offre davantage, et c'est de là qu'on ajoute",
    tout > auJardin, `${tout} au catalogue pour ${auJardin} au jardin`);

  /* Deux espaces posaient deux pastilles sous chacune des rangées du jardin.
     Le lieu occupé passe sous le nom, le choix complet ne se déplie que sur la
     rangée touchée. */
  j.section("la rangée ne nomme que les espaces occupés");
  await pg.locator("#porteeJardin").dispatchEvent("click");
  await pg.waitForTimeout(500);
  const lieux = await pg.evaluate(() => {
    const blocs = [...document.querySelectorAll("#listes .item-bloc")];
    return {
      rangees: blocs.length,
      lieux: blocs.map(b => (b.querySelector(".lieu-item") || {}).textContent || "")
        .filter(Boolean),
      places: blocs.filter(b => b.querySelector(".lieu-item:not(.lieu-vide)")).length,
      pastilles: document.querySelectorAll("#listes .mini-chip").length,
      hauteur: Math.round(blocs[0].getBoundingClientRect().height),
      hauteurRangee: Math.round(blocs[0].querySelector(".item").getBoundingClientRect().height),
    };
  });
  j.controle("chaque rangée du jardin porte son lieu, une seule fois",
    lieux.lieux.length === lieux.rangees, `${lieux.lieux.length} sur ${lieux.rangees}`);
  j.controle("trois plantes sont placées, les autres restent à placer",
    lieux.places === 3, `${lieux.places} placées`);
  j.controle("aucune pastille n'est posée au repos",
    lieux.pastilles === 0, `${lieux.pastilles} pastilles`);
  j.controle("le lieu n'allonge pas la rangée",
    lieux.hauteur === lieux.hauteurRangee,
    `${lieux.hauteur} px de bloc pour ${lieux.hauteurRangee} px de rangée`);

  j.section("le lieu déplie le choix des espaces");
  await pg.locator("#listes .item-bloc .lieu-item").first().dispatchEvent("click");
  await pg.waitForTimeout(300);
  const deplie = await pg.evaluate(() => {
    const b = document.querySelector("#listes .espaces-item").parentElement;
    const puces = [...b.querySelectorAll(".mini-chip")];
    return {
      ouvertes: document.querySelectorAll("#listes .espaces-item").length,
      noms: puces.map(e => e.textContent),
      cible: Math.round(puces[0].getBoundingClientRect().height
        - 2 * parseFloat(getComputedStyle(puces[0], "::after").top)),
      lieu: b.querySelectorAll(".lieu-item").length,
    };
  });
  j.controle("une seule rangée s'ouvre", deplie.ouvertes === 1, deplie.ouvertes);
  j.controle("elle offre tous les espaces et de quoi refermer",
    JSON.stringify(deplie.noms) === JSON.stringify(["Potager", "Verger", "Terminé"]),
    deplie.noms.join(" "));
  j.controle("le lieu cède la place au choix", deplie.lieu === 0);
  j.controle("la cible tactile atteint quarante-quatre points",
    deplie.cible >= 44, `${deplie.cible} points`);
  await pg.locator("#listes .chip-replier").first().dispatchEvent("click");
  await pg.waitForTimeout(300);
  j.controle("le bouton referme et rend le lieu",
    await pg.locator("#listes .espaces-item").count() === 0
    && await pg.locator("#listes .lieu-item").count() > 0);

  /* La mise en sourdine est une notion de calendrier : son rappel a quitté la
     rangée du catalogue pour l'onglet du moment de la fiche, où l'on regarde
     ce qu'il y a à faire sur la plante. */
  j.section("la sourdine a quitté le catalogue pour la fiche");
  j.controle("aucune rangée ne porte de rappel de tâche masquée",
    await pg.locator("#listes .chip-sourdine, #listes .zones-item").count() === 0);
  const nomMuet = PLANTES[0].name;
  await ouvrirFiche(pg, nomMuet);
  const rappel = await pg.evaluate(() => {
    const b = document.querySelector(".f-pan-moment .bascule-sourdine");
    return b ? { texte: b.textContent.replace(/\s+/g, " ").trim(),
                 visible: !b.closest("[hidden]") } : null;
  });
  j.controle("la fiche de la plante masquée le rappelle",
    rappel && rappel.visible && /1 tâche masquée, réafficher$/.test(rappel.texte),
    rappel && rappel.texte);
  await pg.locator(".f-pan-moment .bascule-sourdine").dispatchEvent("click");
  await pg.waitForTimeout(400);
  j.controle("le rappel lève la sourdine et disparaît",
    await pg.locator(".f-pan-moment .bascule-sourdine").count() === 0);
  await fermerFiche(pg);

  await pg.locator('.onglet[data-ecran="maintenant"]').dispatchEvent("click");
  await pg.waitForTimeout(400);

  j.section("le nom du jardin ouvre le jardin");
  j.controle("les deux blocs attendent dans la réserve",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["réserve", "réserve"]));
  await pg.locator("#btnJardin").click();
  await pg.waitForTimeout(600);
  j.controle("la feuille porte le nom du jardin",
    net(await pg.locator("#feuille-titre").innerText()).startsWith("Le jardin de Jérôme"),
    net(await pg.locator("#feuille-titre").innerText()));
  j.controle("le bloc du jardin est passé dans la feuille",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["feuille", "réserve"]));
  // Les titres de panneau sont mis en capitales par la feuille de style.
  const titres = (await pg.locator("#feuille-corps .titre-panneau").allInnerTexts())
    .map(t => net(t).toLowerCase());
  /* Les espaces ont quitté cette feuille pour l'onglet Mon jardin : elle ne
     porte plus que le jardin actif, son climat et sa commune. */
  j.controle("elle ne porte plus que le jardin, les espaces sont ailleurs",
    titres.join(" ") === "jardin", titres.join(" "));
  j.controle("le sélecteur de jardin a gardé sa valeur",
    await pg.locator("#feuille-corps #selJardin option").count() > 0
    && await pg.locator("#feuille-corps #selJardin").inputValue() !== "");

  /* La commune s'ouvre par-dessus, avec le retour : c'est la pile de feuilles
     qui existait déjà, le bloc du jardin doit regagner la réserve au passage. */
  j.section("la commune s'enchaîne et le bloc regagne sa réserve");
  await pg.locator("#feuille-corps #btnCommune").click();
  await pg.waitForTimeout(600);
  j.controle("la feuille du lieu a pris la place",
    net(await pg.locator("#feuille-titre").innerText()).length > 0
    && await pg.locator("#feuille-corps #selJardin").count() === 0);
  j.controle("le bloc est rangé, non détruit",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["réserve", "réserve"]));
  j.controle("le retour est offert",
    await pg.locator("#retourFeuille:not([hidden])").count() === 1);
  await pg.locator("#retourFeuille").click();
  await pg.waitForTimeout(600);
  j.controle("le retour ramène le bloc du jardin, intact",
    await pg.locator("#feuille-corps #selJardin option").count() > 0);

  j.section("le bouton du coin ouvre le compte");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  await pg.locator("#btnConfig").click();
  await pg.waitForTimeout(600);
  j.controle("la feuille s'intitule Compte",
    net(await pg.locator("#feuille-titre").innerText()) === "Compte");
  j.controle("le bloc du compte est dans la feuille, celui du jardin rangé",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["réserve", "feuille"]));
  j.controle("l'adresse de la personne connectée est écrite",
    net(await pg.locator("#feuille-corps #utilisateur").innerText()) === "jerome@exemple.fr");
  j.controle("le formulaire de connexion se tait quand on est connecté",
    await pg.locator("#feuille-corps #zone-connexion[hidden]").count() === 1);

  /* Le numéro de la copie installée est celui de l'agent de service : c'est lui
     qui identifie ce qui tourne réellement, et il change dès qu'un actif
     change. */
  j.section("le numéro de version est au bas de la feuille");
  const v = net(await pg.locator("#feuille-corps #versionAppli").innerText());
  j.controle("il est écrit", /^Version [a-z0-9]{10}$/.test(v), v);
  j.controle("il reprend celui de la balise du document",
    v === "Version " + await pg.evaluate(() =>
      document.querySelector('meta[name="version-appli"]').content), v);
  j.controle("il est écrit petit et discret",
    await pg.locator("#feuille-corps #versionAppli").evaluate(e => {
      const s = getComputedStyle(e);
      return parseFloat(s.fontSize) <= 12 && s.textAlign === "center";
    }));

  /* Posée sur l'écran d'accueil, l'application est réveillée sans être
     rechargée : elle peut tourner des semaines sur la copie du jour de son
     installation. Le numéro affiché était alors juste et pourtant introuvable,
     puisque la copie installée était antérieure à son ajout. */
  j.section("la copie récente se cherche depuis la feuille");
  j.controle("aucun bandeau quand le site sert la même version",
    await pg.locator("#bandeauMaj[hidden]").count() === 1);
  await pg.locator("#feuille-corps #chercherMaj").click();
  await pg.waitForTimeout(700);
  j.controle("la recherche le dit",
    net(await pg.locator("#feuille-corps #noteMaj").innerText())
      === "Cette copie est déjà la plus récente.",
    net(await pg.locator("#feuille-corps #noteMaj").innerText()));
  j.controle("la feuille est restée ouverte",
    await pg.locator("#feuille:not([hidden])").count() === 1);

  /* Une fiche de plante écrase le corps de la feuille : si le bloc y était
     resté, il serait perdu et le réglage suivant ouvrirait une feuille vide. */
  j.section("ouvrir une fiche ne détruit pas les panneaux");
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  await ouvrirListeDesPlantes(pg);
  await ouvrirFiche(pg, "Pommier");
  await fermerFiche(pg);
  j.controle("les deux blocs sont revenus en réserve",
    JSON.stringify(await ouAilleurs(pg)) === JSON.stringify(["réserve", "réserve"]));
  await pg.locator("#btnConfig").click();
  await pg.waitForTimeout(600);
  j.controle("le compte s'ouvre encore, complet",
    await pg.locator("#feuille-corps #genererReprise").count() === 1);
  await pg.locator("#fermerFeuille").click();
  await pg.waitForTimeout(400);
  await ctx.close();

  /* Sans compte il n'y a pas de jardin à nommer : le titre porte la seule
     action qui vaille et la feuille s'ouvre d'elle-même à la première venue. */
  j.section("sans compte, l'entrée ne se cherche pas");
  const b = await ouvrirContexte(navigateur, { session: false });
  j.controle("le titre annonce la connexion",
    net(await b.pg.locator("#titreJardin").innerText()) === "Se connecter",
    net(await b.pg.locator("#titreJardin").innerText()));
  j.controle("la feuille du compte est déjà ouverte",
    await b.pg.locator("#feuille:not([hidden])").count() === 1
    && net(await b.pg.locator("#feuille-titre").innerText()) === "Compte");
  j.controle("elle porte le formulaire de connexion",
    await b.pg.locator("#feuille-corps #form-connexion").count() === 1);
  j.controle("le panneau du compte se tait, il n'a rien à dire",
    await b.pg.locator("#feuille-corps #panneau-compte[hidden]").count() === 1);
  /* Le numéro de version est hors du panneau : c'est quand rien ne marche qu'on
     le cherche, et il ne faut pas être connecté pour le lire. */
  j.controle("le numéro de version reste lisible sans compte",
    /^Version [a-z0-9]{10}$/.test(net(await b.pg.locator("#feuille-corps #versionAppli").innerText())),
    net(await b.pg.locator("#feuille-corps #versionAppli").innerText()));
  await b.pg.locator("#fermerFeuille").click();
  await b.pg.waitForTimeout(400);
  await b.pg.locator("#btnJardin").click();
  await b.pg.waitForTimeout(600);
  j.controle("le titre rouvre le compte, jamais un jardin qui n'existe pas",
    net(await b.pg.locator("#feuille-titre").innerText()) === "Compte");
  await b.ctx.close();

  /* Le site sert un numéro que la copie ouverte ne porte pas : c'est ce que voit
     une application restée des semaines sur l'écran d'accueil. */
  j.section("une version plus récente en ligne s'annonce et s'applique");
  const c = await ouvrirContexte(navigateur, { versionSite: "0123456789" });
  await c.pg.waitForSelector("#bandeauMaj:not([hidden])", { timeout: 6000 });
  j.controle("le bandeau paraît de lui-même",
    await c.pg.locator("#bandeauMaj:not([hidden])").count() === 1);
  /* Il se pose au-dessus de la barre : posé dessous, il couvrirait les onglets
     et le bouton rond. */
  const place = await c.pg.evaluate(() => {
    const m = document.getElementById("bandeauMaj").getBoundingClientRect();
    const r = document.querySelector(".onglet-rond").getBoundingClientRect();
    return { sous: m.bottom - r.top, dedans: m.top, ecran: innerHeight };
  });
  j.controle("il ne recouvre ni la barre ni le bouton rond",
    place.sous <= 0 && place.dedans > 0 && place.dedans < place.ecran,
    `${place.sous.toFixed(1)} de recouvrement`);
  // La feuille de style met l'action en capitales : le texte rendu l'est aussi.
  j.controle("il porte l'action de reprise",
    net(await c.pg.locator("#appliquerMaj").innerText()).toLowerCase()
      .includes("actualiser"),
    net(await c.pg.locator("#appliquerMaj").innerText()));
  await c.pg.locator("#ecarterMaj").click();
  await c.pg.waitForTimeout(200);
  j.controle("il s'écarte", await c.pg.locator("#bandeauMaj[hidden]").count() === 1);
  /* Le contrôle est repris à chaque retour au premier plan : écarté une fois,
     le bandeau ne doit pas revenir à la mise en veille suivante. */
  await c.pg.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await c.pg.waitForTimeout(500);
  j.controle("il ne revient pas au réveil suivant",
    await c.pg.locator("#bandeauMaj[hidden]").count() === 1);

  await c.pg.locator("#btnConfig").click();
  await c.pg.waitForTimeout(600);
  await c.pg.evaluate(() => { window.__avantMaj = 1; });
  await c.pg.locator("#feuille-corps #chercherMaj").click();
  await c.pg.waitForTimeout(300);
  j.controle("la recherche annonce le redémarrage",
    net(await c.pg.locator("#feuille-corps #noteMaj").innerText())
      === "Nouvelle version trouvée, redémarrage.",
    net(await c.pg.locator("#feuille-corps #noteMaj").innerText()));
  await c.pg.waitForTimeout(2500);
  j.controle("le document est bien rechargé",
    await c.pg.evaluate(() => window.__avantMaj === undefined));
  await c.ctx.close();

  /* Hors ligne, le numéro en ligne est hors d'atteinte : la recherche le dit et
     ne laisse pas croire que la copie est à jour. */
  j.section("hors réseau, la recherche ne conclut pas");
  const h = await ouvrirContexte(navigateur);
  await h.ctx.route(/\/sw\.js(\?|$)/, r => r.abort());
  await h.pg.locator("#btnConfig").click();
  await h.pg.waitForTimeout(600);
  await h.pg.locator("#feuille-corps #chercherMaj").click();
  await h.pg.waitForTimeout(700);
  j.controle("elle le dit sans conclure",
    net(await h.pg.locator("#feuille-corps #noteMaj").innerText())
      === "Vérification impossible sans réseau.",
    net(await h.pg.locator("#feuille-corps #noteMaj").innerText()));
  j.controle("le bouton reste offert",
    await h.pg.locator("#feuille-corps #chercherMaj:not([disabled])").count() === 1);
  await h.ctx.close();

  /* La requête refusée est le propos de la section : le navigateur la porte au
     journal, ce que le contrôle ne doit pas compter comme une panne. */
  return j.fin(erreurs.concat(b.erreurs, c.erreurs,
    h.erreurs.filter(e => !/Failed to load resource/.test(e))));
}
