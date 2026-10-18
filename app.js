// Client servi par le site. Il était chargé depuis esm.sh en dix-sept modules
// répartis sur quatre niveaux d'imports, avant lesquels aucune requête vers la
// base ne pouvait partir. Reconstruction : node outils/paquet/construire.mjs
import { createClient } from "./vendor/supabase.js?v=e1ae1f6cea";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ORDRE = ["abri", "terre", "plant", "floraison", "recolte", "taille", "multiplication", "fertilisation", "protection_ete", "protection"];
// L'écran En ce moment suit l'ordre du geste au jardin : ce qu'on observe,
// puis ce qu'on taille, ce qu'on met en terre, ce qu'on reproduit, ce qu'on récolte.
// Classement par coût de l'oubli, du plus irréversible au plus tolérant.
// Récolte et floraison se constatent d'un coup d'oeil au jardin, elles ferment la liste.
const ORDRE_MAINTENANT = ["taille", "fertilisation", "multiplication", "protection_ete",
  "protection", "abri", "terre", "plant", "recolte", "floraison"];
const REPLIES_PAR_DEFAUT = ["recolte", "floraison"];
const ORDRE_TYPO = ["Légumes", "Fruits", "Aromatiques", "Ornement"];
const COUL_TYPO = { "Légumes":"#4C8C3F", "Fruits":"#A23E4E", "Aromatiques":"#3E7C6B", "Ornement":"#B0559A" };
// Ordre de lecture des catégories : par typologie, puis du plus courant au plus rare.
const ORDRE_CAT = [
  "Feuilles","Racines","Choux","Bulbes","Légumineuses","Fruits d'été","Légumes","Vivaces",
  "Arbres fruitiers","Petits fruits",
  "Aromatiques",
  "Fleurs annuelles","Fleurs bisannuelles","Fleurs vivaces","Bulbes à fleurs",
  "Grimpantes","Arbustes d'ornement","Graminées",
];
const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const ABR  = ["Jan","Fév","Mar","Avr","Mai","Jui","Jul","Aoû","Sep","Oct","Nov","Déc"];
const CHECK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const CACHE = "monjardin.catalogue.v6";

let phases = {};
let plantes = [];
let saison = {};
let climats = {};
let shifts = {};
let jardins = [];
let espaces = [];
let aff = new Map();
let adapt = {};
/* Le filtre d'espace appartient au seul écran de l'année. Il portait un nom
   général et une valeur partagée avec l'écran du jour, qui avait sa propre
   rangée de pastilles : choisir un espace d'un côté filtrait l'autre sans le
   dire. */
let espacePlan = null;
/* Les avis de la personne sur les photographies, chargés une fois au
   démarrage : masquer une image ne demande pas d'aller le redemander à chaque
   fiche. Clé l'identifiant de la ligne d'image, valeur supprimer, moyenne ou
   bonne. La file garde ce qui n'a pas pu partir, le jardin n'ayant pas toujours
   de réseau. */
let avisPhoto = new Map();
const FILE_AVIS = "monjardin.avis";

/* L'ordre d'affichage de la bande. La racine vient après le fruit : chez un
   légume-racine, c'est l'organe récolté et le seul que le jardinier
   reconnaisse, la fleur et le fruit du porte-graine ne lui disant rien. */
const PH_ORDRE = ["fleur", "feuille", "fruit", "racine", "port", "ecorce"];
const PH_NOM = { fleur: "fleur", feuille: "feuille", fruit: "fruit",
                 racine: "racine", port: "port", ecorce: "écorce" };
const nomPlante = id => (plantes.find(p => p.id === id) || {}).nom;
const photosPlante = new Map();   // les fiches déjà ouvertes ne redemandent pas
/* Une vignette par plante et par organe, la meilleure retenue. L'organe montré
   suit la typologie : le fruit pour un légume, la fleur pour un ornement. */
let vignettes = new Map();
const ORGANE_TYPO = {
  "Légumes": ["fruit", "feuille", "fleur", "port"],
  "Fruits": ["fruit", "fleur", "port", "feuille"],
  "Aromatiques": ["feuille", "fleur", "port", "fruit"],
  "Ornement": ["fleur", "port", "feuille", "fruit"],
};
/* Le journal du jardin. Les entrées sont chargées avec le reste du jardin,
   leurs photographies vivent dans un compartiment privé et ne s'atteignent que
   par une adresse signée, demandée au moment de l'affichage. */
let carnet = [];
const photosCarnet = new Map();
const urlsPhoto = new Map();
let carnetOuvert = false;
let saisieCarnet = null;
let saisieFiche = null;
/* La plante dont la fiche est ouverte, et la saisie que le bouton Noter porte.
   Le bouton est partout, et ce qu'il pré-remplit vient de ce qui est à
   l'écran : l'espace depuis un espace, la plante depuis sa fiche. */
let planteFeuille = null;
// La fenêtre de frise touchée : plante, tâche, bornes et identité de période.
let periodeFeuille = null;
let saisiePartout = null;
/* Ce qui a poussé où, tenu sans saisie par un déclencheur au placement. Seules
   les plantes conduites en annuelle ou en bisannuelle y entrent. */
let cultures = [];
let photosVues = [];              // la bande à l'affiche, pour le plein écran
let photoIndex = 0;               // organe regardé en grand
let photoRang = 0;                // position dans la réserve de cet organe
/* Un seul des trois verdicts change ce qui est affiché. Les deux autres sont une
   note de qualité, qui vaut caution pour l'un et demande de remplacement pour
   l'autre. */
const AVIS_NOM = { supprimer: "À supprimer", moyenne: "Moyenne", bonne: "Bonne" };
let sourdines = new Map();
let voirSourdines = false;
/* Les plantes dont la rangée montre le choix complet des espaces. Au repos la
   rangée n'affiche que les espaces occupés : répéter tous les espaces sous
   chacune des trois cent quinze rangées ajoutait une ligne à chacune. */
let choixEspace = new Set();
let vueMoment = (() => {
  try { return localStorage.getItem("monjardin.vue") || "tache"; } catch (e) { return "tache"; }
})();
/* Le regroupement de la frise, retenu comme celui de la liste du jour : c'est
   une préférence de lecture, elle ne se repose pas à chaque ouverture. */
let vueAnnee = (() => {
  try { return localStorage.getItem("monjardin.annee") || "alpha"; } catch (e) { return "alpha"; }
})();
// Position de lecture de l'écran du moment : null pour la vue d'ensemble,
// { t:"tache", k } pour une tâche ouverte, { t:"tout" } pour la liste complète.
// L'état voyage dans l'historique, le geste de retour du téléphone ramène donc
// à la vue d'ensemble.
let vueDetail = null;
let scrollEnsemble = 0;
let obsSections = null;
/* Vigilance météorologique. Les identifiants d'aléa et les couleurs suivent le
   descriptif technique de Météo-France. Le vert n'est pas une alerte, il ne
   s'affiche pas. */
const ALEA = { 1: "vent violent", 2: "pluie et inondation", 3: "orages", 4: "crues",
  5: "neige et verglas", 6: "canicule", 7: "grand froid", 8: "avalanches",
  9: "vagues et submersion" };
const VIGI_NOM = { 2: "jaune", 3: "orange", 4: "rouge" };
/* Gravité de ce qui peut paraître sur la carte du temps. Elle range les lignes
   et décide de la teinte de la carte, qui est celle de la plus grave. Le gel
   passe devant la vigilance jaune : un avis d'orage dérange, une nuit à moins
   deux tue. La vigilance orange et la rouge passent devant tout. */
const GRAVITE = { "v-4": 6, "v-3": 5, froid: 4, chaud: 3, "v-2": 2, vent: 1, eau: 0 };
// L'icône dit la nature de la ligne : un avertissement, ou de l'eau annoncée.
const ICONE_TON = { eau: "goutte" };
// Ce que chaque aléa demande au jardin, dit en une consigne.
const VIGI_GESTE = {
  1: "tuteurer, rentrer les potées et les voiles",
  2: "dégager les écoulements, surélever les semis en godets",
  3: "rentrer ce qui peut voler, la grêle abîme le feuillage",
  4: "ne pas travailler les parcelles basses",
  5: "voiler les cultures fragiles, secouer la neige des branches",
  6: "arroser tôt, ombrer les jeunes plants, pailler",
  7: "protéger les souches et les potées, l'eau du sol gèle",
  8: "",
  9: "rentrer le mobilier, l'embrun brûle le feuillage",
};
let vigilance = [];

/* Département d'un code postal. Outre-mer sur trois chiffres. La vigilance
   nomme la Corse 2A et 2B quand son code postal commence par 20 : les deux
   premiers caractères rendaient « 20 », que la table ne porte pas, et la requête
   revenait vide sans qu'aucun message ne signale l'exclusion. La borne suit
   l'usage, Corse-du-Sud sous 20200 et Haute-Corse au-delà. Quelques communes de
   Haute-Corse portent un code en 201xx et sont rangées en 2A ; le code INSEE de
   la commune les trancherait, il n'est pas enregistré. */
const departementDe = cp => {
  const v = String(cp || "");
  if (v.length < 2) return null;
  if (v.startsWith("97") || v.startsWith("98")) return v.slice(0, 3);
  if (v.startsWith("20")) return Number(v.padEnd(5, "0")) < 20200 ? "2A" : "2B";
  return v.slice(0, 2);
};

// Coefficient cultural moyen du jardin par quinzaine, et mesures du jardinier.
let kcParQuinzaine = {};
let releves = new Map();
// Pluie mesurée au poste rattaché au jardin, et signalement du poste.
let pluieStation = new Map();
let station = null;

/* Réserve utile du sol, en millimètres par mètre de profondeur. Milieux des
   fourchettes du tableau 19 du bulletin FAO 56, recoupées par les capacités de
   rétention publiées par l'université de Californie : sableux 55 à 105,
   limoneux 130 à 180, argileux 130 à 200. */
const RESERVE_SOL = { sableux: 80, limoneux: 155, argileux: 165 };
const SOL_LIBELLE = { sableux: "Sableux", limoneux: "Limoneux", argileux: "Argileux" };
// Profondeur de référence de la zone racinaire du potager, en mètres. Le tableau
// 22 du même bulletin place les légumes de plein champ entre 0,3 et 0,6 mètre.
const ZR_M = 0.40;
// Fraction de la réserve épuisable sans contrainte, valeur du tableau 22 pour la
// tomate, entre la laitue à 0,30 et le concombre à 0,50.
const P_BASE = 0.40;
let categories = [];
let sel = new Set();
let jardinId = null;
let session = null;
let tri = "type";
let jardinSeul = true;   // le jardin de la personne prime sur le catalogue
let climatSeul = false;  // Mes plantes, restreint aux plantes adaptées au climat du jardin
/* L'écran du bouton rond porte deux onglets. Le premier montre le jardin tel
   qu'il est découpé, une tuile par espace puis le détail d'un espace. Le second
   montre les plantes, d'abord celles du jardin, le catalogue entier ensuite. */
let espaceOuvert = null;       // null au premier niveau, sinon l'espace lu, "0" pour les non placées
let porteeSel = "jardin";      // jardin ou tout
let ecranCourant = "maintenant";  // la destination ouverte, catalogue compris
let carnetContexte = null;     // le lieu ou la plante sur lequel le carnet est ouvert
/* Les filtres du carnet : un geste et un mot cherché dans le texte, la plante
   ou le lieu. Ils s'ajoutent au contexte, qu'ils ne remplacent pas. */
let gesteCarnet = null;
let rechCarnet = "";
/* La période retenue sur le calendrier, en quinzaines de 1 à 24. Un mois en
   occupe deux, une quinzaine une seule : la même borne sert aux deux échelles,
   et le filtre s'affine sans code séparé. */
let periode = null;

const etatPhase = {}, etatTypo = {}, etatCat = {};      // écran Mes plantes
const etatTypoP = {}, etatCatP = {};                     // écran Calendrier
ORDRE.forEach(k => { etatPhase[k] = true; });

const $ = id => document.getElementById(id);

const attendre = ms => new Promise(r => setTimeout(r, ms));
const TRANSITOIRE = /issued at future|clock|jwt expired|fetch|network|timeout/i;

async function avecReprise(faire, essais = 3) {
  let dernier = null;
  for (let i = 0; i < essais; i++) {
    const r = await faire();
    if (!r.error) return r;
    dernier = r;
    if (!TRANSITOIRE.test(r.error.message || "")) return r;
    await attendre(400 * (i + 1));
  }
  return dernier;
}

// Un élément absent ne doit jamais interrompre le chargement du module.
const sur = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); else console.warn("élément absent :", id); };

const NIVEAUX = {
  adapte:      { court: "adaptée",      crans: 4, long: "Adaptée à ce climat, aucune précaution particulière" },
  protection:  { court: "à protéger",   crans: 3, long: "Reste en place, moyennant une précaution : paillage, voile, ombrage ou arrosage selon le climat" },
  abri:        { court: "à hiverner",   crans: 2, long: "Ne passe pas l'hiver en pleine terre sous ce climat, à rentrer ou à traiter en annuelle" },
  deconseille: { court: "déconseillée", crans: 1, long: "Déconseillée sous ce climat" },
};

const auj = new Date();
const demi = auj.getMonth() * 2 + (auj.getDate() <= 15 ? 1 : 2);
/* L'écran de l'année se lit à la quinzaine ou d'un bloc. Il s'ouvre sur la
   quinzaine en cours au lancement, les flèches en parcourent les vingt-quatre,
   et la quinzaine lue tient le temps de la session. */
let lectureAnnee = "quinzaine";
let quinzLue = demi;

/* Repères de l'année, pour la ligne du bandeau et pour la pastille de la date.
   Les quatre saisons civiles sont bornées aux équinoxes et aux solstices,
   calculées sur l'année en cours pour suivre les années bissextiles. Les
   teintes sont celles du papier de saison, soutenues juste assez pour tenir sur
   quatre points de haut : gris bleu l'hiver, vert tendre le printemps, blé
   l'été, terre brûlée l'automne. */
const TEINTE_SAISON = { hiver:"#AFBCC2", printemps:"#A5C596", ete:"#C7BE79", automne:"#C9A277" };
const jourDeLAn = (an, m, d) => Math.round((Date.UTC(an, m, d) - Date.UTC(an, 0, 1)) / 864e5);
const AN_EN_COURS = auj.getFullYear();
const JOURS_AN = jourDeLAn(AN_EN_COURS, 11, 31) + 1;
const SAISONS_AN = [
  { nom:"hiver",     a:0,                                b:jourDeLAn(AN_EN_COURS, 2, 20) },
  { nom:"printemps", a:jourDeLAn(AN_EN_COURS, 2, 20),    b:jourDeLAn(AN_EN_COURS, 5, 21) },
  { nom:"ete",       a:jourDeLAn(AN_EN_COURS, 5, 21),    b:jourDeLAn(AN_EN_COURS, 8, 22) },
  { nom:"automne",   a:jourDeLAn(AN_EN_COURS, 8, 22),    b:jourDeLAn(AN_EN_COURS, 11, 21) },
  { nom:"hiver",     a:jourDeLAn(AN_EN_COURS, 11, 21),   b:JOURS_AN },
];
const JOUR_AN = jourDeLAn(AN_EN_COURS, auj.getMonth(), auj.getDate());
// Le point se pose au milieu du jour, non à sa charnière.
const POS_AN = 100 * (JOUR_AN + .5) / JOURS_AN;
const SAISON_DU_JOUR =
  (SAISONS_AN.find(s => JOUR_AN >= s.a && JOUR_AN < s.b) || SAISONS_AN[0]).nom;

/* Constantes partagées, déclarées avant tout rendu : une constante n'est pas
   remontée en tête de module comme l'est une déclaration de fonction. */
const OEIL_BARRE = '<svg viewBox="0 0 24 24" aria-hidden="true">'
  + '<path d="M2 12s3.6-6 10-6c2 0 3.7.6 5.1 1.4M22 12s-3.6 6-10 6c-2 0-3.7-.6-5.1-1.4"/>'
  + '<circle cx="12" cy="12" r="2.6"/><path d="M3 21 21 3"/></svg>';

/* Tracés repris de la maquette, sans retouche. */

const GLF = {
  "abri": "<path d=\"M2.6 16.4h14.8\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M4.4 16.4a5.6 5.6 0 0 1 11.2 0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M10 16.4v-3.8\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M10 13.6c0-1.7-1.3-3-3-3 0 1.7 1.3 3 3 3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/>",
  "semis": "<path d=\"M2.4 15.2h15.2\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><ellipse cx=\"6.2\" cy=\"8.6\" rx=\"1.8\" ry=\"2.4\" transform=\"rotate(-22 6.2 8.6)\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.35\"/><ellipse cx=\"10\" cy=\"5.2\" rx=\"1.8\" ry=\"2.4\" transform=\"rotate(8 10 5.2)\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.35\"/><ellipse cx=\"13.8\" cy=\"9\" rx=\"1.8\" ry=\"2.4\" transform=\"rotate(26 13.8 9)\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.35\"/>",
  "plant": "<path d=\"M2.4 16.4h15.2\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M10 16.4V7.4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M10 9.6C10 6.8 8 4.8 5.2 4.8c0 2.8 2 4.8 4.8 4.8z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/><path d=\"M10 11.4c0-2.4 1.8-4.2 4.2-4.2 0 2.4-1.8 4.2-4.2 4.2z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/>",
  "bouture": "<path d=\"M1.4 17.0h6.6M12.0 17.0h6.6\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M4.8 17.0V8.6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M4.8 11.0C4.8 8.8 3.0 7.0 0.8 7.0c0 2.2 1.8 4.0 4.0 4.0z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/><path d=\"M4.8 9.0c0-1.6 1.3-2.9 2.9-2.9 0 1.6-1.3 2.9-2.9 2.9z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linejoin=\"round\"/><path d=\"M15.2 17.0V8.6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M15.2 11.0c0-2.2 1.8-4.0 4.0-4.0 0 2.2-1.8 4.0-4.0 4.0z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/><path d=\"M15.2 9.0c0-1.6-1.3-2.9-2.9-2.9 0 1.6 1.3 2.9 2.9 2.9z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linejoin=\"round\"/>",
  "secateur": "<path d=\"M4.4 0.5C6.4 2.1 8.0 4.2 9.2 6.6L5.6 6.7C5.2 4.6 4.7 2.5 4.4 0.5Z\" fill=\"currentColor\"/><path d=\"M0.2 2.4C1.4 4.8 3.2 6.9 5.5 8.4L4.2 10.5C1.9 8.8 0.6 5.9 0.2 2.4Z\" fill=\"currentColor\"/><path d=\"M4.6 6.5L10.5 6.1L10.5 10.5L5.6 10.6Z M5.6 9.8L8.6 9.8L9.0 12.4L6.2 12.8Z M6.65 8.2a0.95 0.95 0 1 0 1.9 0a0.95 0.95 0 1 0 -1.9 0Z\" fill=\"currentColor\" fill-rule=\"evenodd\"/><path d=\"M10.5 5.8h1.8v5.0h-1.8z\" fill=\"currentColor\"/><path d=\"M12.6 7.6C15.4 7.8 17.6 8.6 18.9 10.0\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" fill=\"none\"/><path d=\"M7.4 12.0C8.4 14.4 9.5 16.6 10.6 18.6\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" fill=\"none\"/>",
  "engrais": "<path d=\"M2.6 16.6h14.8\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M4.6 16.6c0-3 2.4-5.4 5.4-5.4s5.4 2.4 5.4 5.4z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><circle cx=\"6.3\" cy=\"6.6\" r=\"1.15\" fill=\"currentColor\"/><circle cx=\"10\" cy=\"4.3\" r=\"1.15\" fill=\"currentColor\"/><circle cx=\"13.7\" cy=\"7\" r=\"1.15\" fill=\"currentColor\"/>",
  "flocon": "<path d=\"M10 1.8v16.4M2.9 5.9l14.2 8.2M17.1 5.9 2.9 14.1\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M10 5.4 8.1 3.5M10 5.4l1.9-1.9M10 14.6l-1.9 1.9M10 14.6l1.9 1.9\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M5.2 7.2 4.5 4.6M5.2 7.2 2.6 7.9M14.8 12.8l.7 2.6M14.8 12.8l2.6.7\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M14.8 7.2l.7-2.6M14.8 7.2l2.6.7M5.2 12.8l-.7 2.6M5.2 12.8l-2.6.7\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/>",
  "ombrage": "<circle cx=\"10\" cy=\"7.4\" r=\"3.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M10 1.6v1.8M4.6 2.6l1.3 1.3M15.4 2.6l-1.3 1.3M2 7.4h1.8M16.2 7.4H18\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M2.8 14.4h14.4\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M5.6 17.4l1.6-2.4M10 17.4l1.6-2.4M14.4 17.4l1.6-2.4\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linecap=\"round\"/>",
  "fleur": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.35\"><ellipse cx=\"10\" cy=\"5.1\" rx=\"1.9\" ry=\"3\"/><ellipse cx=\"14.66\" cy=\"8.49\" rx=\"1.9\" ry=\"3\" transform=\"rotate(72 14.66 8.49)\"/><ellipse cx=\"12.88\" cy=\"13.96\" rx=\"1.9\" ry=\"3\" transform=\"rotate(144 12.88 13.96)\"/><ellipse cx=\"7.12\" cy=\"13.96\" rx=\"1.9\" ry=\"3\" transform=\"rotate(216 7.12 13.96)\"/><ellipse cx=\"5.34\" cy=\"8.49\" rx=\"1.9\" ry=\"3\" transform=\"rotate(288 5.34 8.49)\"/></g><circle cx=\"10\" cy=\"10\" r=\"1.9\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/>",
  "panier": "<path d=\"M2.8 8h14.4l-1.5 8.2a1.8 1.8 0 0 1-1.8 1.5H6.1a1.8 1.8 0 0 1-1.8-1.5z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.55\" stroke-linejoin=\"round\"/><path d=\"M6.6 8a3.4 3.4 0 0 1 6.8 0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M7.6 11.2v3.4M10 11.2v3.4M12.4 11.2v3.4\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>",
};

const MOTIF = {
  "arbre": "<path d=\"M100 22c23 0 42 12 48 29 17 4 28 19 28 36 0 23-19 40-44 40H68c-25 0-44-17-44-40 0-17 11-32 28-36 6-17 25-29 48-29z\" opacity=\".13\"/><path d=\"M100 40c16 0 30 9 34 21 12 3 20 13 20 26 0 16-14 28-32 28H78c-18 0-32-12-32-28 0-13 8-23 20-26 4-12 18-21 34-21z\" opacity=\".07\"/><path d=\"M93 120h14v70a7 7 0 0 1-14 0z\" opacity=\".22\"/><path d=\"M100 152l-24-18 5-7 19 15 19-15 5 7z\" opacity=\".18\"/>",
  "fruit": "<path d=\"M100 34c35 0 61 25 61 56 0 33-27 58-61 58s-61-25-61-58c0-31 26-56 61-56z\" opacity=\".12\"/><path d=\"M100 52c22 0 39 17 39 39 0 23-17 40-39 40s-39-17-39-40c0-22 17-39 39-39z\" opacity=\".07\"/><path d=\"M96 138h9v52h-9z\" opacity=\".20\"/><path d=\"M100 168l-20-16 4-6 16 13 16-13 4 6z\" opacity=\".16\"/><circle cx=\"76\" cy=\"126\" r=\"9.5\" opacity=\".23\"/><circle cx=\"126\" cy=\"104\" r=\"9.5\" opacity=\".23\"/><circle cx=\"103\" cy=\"146\" r=\"8\" opacity=\".21\"/>",
  "ornement": "<g opacity=\".12\"><ellipse cx=\"104\" cy=\"42\" rx=\"17\" ry=\"30\"/><ellipse cx=\"139\" cy=\"61\" rx=\"17\" ry=\"30\" transform=\"rotate(60 139 61)\"/><ellipse cx=\"139\" cy=\"99\" rx=\"17\" ry=\"30\" transform=\"rotate(120 139 99)\"/><ellipse cx=\"104\" cy=\"118\" rx=\"17\" ry=\"30\"/><ellipse cx=\"69\" cy=\"99\" rx=\"17\" ry=\"30\" transform=\"rotate(60 69 99)\"/><ellipse cx=\"69\" cy=\"61\" rx=\"17\" ry=\"30\" transform=\"rotate(120 69 61)\"/></g><circle cx=\"104\" cy=\"80\" r=\"19\" opacity=\".23\"/><path d=\"M99 98h10v92H99z\" opacity=\".17\"/><path d=\"M104 158c-33-6-51-29-51-53 33 2 51 25 51 53z\" opacity=\".11\"/>",
  "legume": "<path d=\"M100 192c-40-8-64-40-64-78 0-22 10-40 24-50 0 34 8 76 40 128z\" opacity=\".10\"/><path d=\"M100 192c40-8 64-40 64-78 0-22-10-40-24-50 0 34-8 76-40 128z\" opacity=\".10\"/><path d=\"M100 192c-18-26-28-60-28-92 0-24 10-44 28-56 18 12 28 32 28 56 0 32-10 66-28 92z\" opacity=\".17\"/><path d=\"M96 34h9v22h-9z\" opacity=\".23\"/>",
  "aromatique": "<path d=\"M96 44h9v146h-9z\" opacity=\".19\"/><g opacity=\".12\"><ellipse cx=\"60\" cy=\"84\" rx=\"34\" ry=\"16\" transform=\"rotate(-24 60 84)\"/><ellipse cx=\"141\" cy=\"106\" rx=\"34\" ry=\"16\" transform=\"rotate(24 141 106)\"/><ellipse cx=\"62\" cy=\"134\" rx=\"30\" ry=\"14\" transform=\"rotate(-24 62 134)\"/><ellipse cx=\"139\" cy=\"154\" rx=\"30\" ry=\"14\" transform=\"rotate(24 139 154)\"/></g>",
};

const MOTIF_SPAN = {
  "arbre": [22, 190],
  "fruit": [34, 190],
  "ornement": [12, 190],
  "legume": [34, 192],
  "aromatique": [44, 190],
};

/* Largeur réellement occupée par chaque motif dans son repère de deux cents
   points. Elle sert à poser les pieds voisins : la boîte est la même pour tous,
   le dessin qu'elle contient non, et deux arbres se toucheraient là où deux
   touffes d'aromatique laisseraient un vide. */
const MOTIF_LARGE = {
  "arbre": [24, 176],
  "fruit": [39, 161],
  "ornement": [50, 158],
  "legume": [36, 164],
  "aromatique": [26, 175],
};

const FLEUR = {
  "blanc": ["#ffffff", "#a8a498"],
  "creme": ["#fdf6e3", "#b5ac8c"],
  "beige": ["#e8dcc0", "#c3b48c"],
  "jaune": ["#f2c018", "#c99a00"],
  "orange": ["#ee8b2b", "#c56a12"],
  "rouge": ["#d33d3d", "#a52a2a"],
  "rose": ["#e88bb0", "#c4638a"],
  "mauve": ["#b58ad4", "#8f66ae"],
  "violet": ["#7a5cc4", "#5b3fa0"],
  "pourpre": ["#8c3f6b", "#6d2d52"],
  "bleu": ["#4f8fd8", "#2f6cb0"],
  "vert": ["#6aa84f", "#4d7f38"],
  "brun": ["#8a6a4a", "#6b5037"],
  "noir": ["#3a3a38", "#1c1c1a"],
  "multicolore": ["#d9a6c9", "#a97a9a"],
};

const TEINTE = {
  "abri": "#9cbf3a",
  "terre": "#22a352",
  "plant": "#0f9187",
  "multiplication": "#1f6b46",
  "taille": "#3f7fd0",
  "fertilisation": "#7d5ad4",
  "protection": "#59b4d8",
  "protection_ete": "#1f4f8f",
  "floraison": "#d96aa8",
  "recolte": "#eb6834",
};

// La couleur d'une tâche vient de la palette validée, non de la base : elle est
// la même dans la synthèse, la liste, les filtres et la frise.
const teinteK = k => TEINTE[k] || ((phases[k] || {}).color) || "#4C8C3F";

const GJ = {
  "soleil": "<circle cx=\"10\" cy=\"10\" r=\"4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2 16 16M16 4l-1.8 1.8M5.8 14.2 4 16\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/>",
  "goutte": "<path d=\"M10 2.4c3.5 4 5.5 6.8 5.5 9.3a5.5 5.5 0 0 1-11 0c0-2.5 2-5.3 5.5-9.3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/>",
  "butineur": "<ellipse cx=\"10\" cy=\"12.2\" rx=\"3.6\" ry=\"4.4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M6.6 11.2h6.8M7 14h6\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M7.5 8.2C5.1 5.6 2.3 6.4 2.8 8.7c.4 1.9 2.8 2.5 4.7 1.3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><path d=\"M12.5 8.2c2.4-2.6 5.2-1.8 4.7.5-.4 1.9-2.8 2.5-4.7 1.3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><path d=\"M8.8 7.4 8 5.3M11.2 7.4 12 5.3\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>",
  "flocon": "<path d=\"M10 1.8v16.4M2.9 5.9l14.2 8.2M17.1 5.9 2.9 14.1\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M10 5.4 8.1 3.5M10 5.4l1.9-1.9M10 14.6l-1.9 1.9M10 14.6l1.9 1.9\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M5.2 7.2 4.5 4.6M5.2 7.2 2.6 7.9M14.8 12.8l.7 2.6M14.8 12.8l2.6.7\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M14.8 7.2l.7-2.6M14.8 7.2l2.6.7M5.2 12.8l-.7 2.6M5.2 12.8l-2.6.7\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>",
};

const ADJ = {
  "blanc": "blanches",
  "creme": "crème",
  "beige": "beiges",
  "jaune": "jaunes",
  "orange": "orange",
  "rouge": "rouges",
  "rose": "roses",
  "mauve": "mauves",
  "violet": "violettes",
  "pourpre": "pourpres",
  "bleu": "bleues",
  "vert": "vertes",
  "brun": "brunes",
  "noir": "noires",
  "multicolore": "multicolores",
};

const PHF = {
  "abri": ["Semis à l'abri", "place", "abri"],
  "terre": ["Semis en pleine terre", "place", "semis"],
  "plant": ["Plantation", "place", "plant"],
  "multiplication": ["Multiplication", "place", "bouture"],
  "taille": ["Taille", "tend", "secateur"],
  "fertilisation": ["Fertilisation", "tend", "engrais"],
  "protection": ["Protection hiver", "tend", "flocon"],
  "protection_ete": ["Protection été", "tend", "ombrage"],
  "floraison": ["Floraison", "yield", "fleur"],
  "recolte": ["Récolte", "yield", "panier"],
};

const ORDRE_FICHE = ["abri", "terre", "plant", "multiplication", "taille",
  "fertilisation", "protection", "protection_ete", "floraison", "recolte"];
const ETATS_FICHE = ["floraison"];
/* Un dicton ferme la page sans rien demander. La tradition en attache un à
   deux cent onze jours de l'année, rattaché à un saint ou à un repère du
   calendrier ; les cent cinquante-cinq autres jours prennent celui de leur
   quinzaine. Les vingt-quatre replis restent dans le script, pour que le pied
   de page n'attende rien pour s'écrire, et les dictons datés arrivent ensuite
   dans un fichier à part. */
const DICTONS = [
  "Janvier sec et beau remplit caves et tonneaux.",
  "Neige de janvier vaut fumier.",
  "Février le court, le pire de tous.",
  "Quand février commence en lion, il finit comme un mouton.",
  "Mars venteux, verger pommeux.",
  "Taille tôt, taille tard, rien ne vaut la taille de mars.",
  "Avril fait la fleur, mai en a l'honneur.",
  "En avril ne te découvre pas d'un fil.",
  "Bourgeon qui pousse en avril met peu de vin au baril.",
  "Mai frais et venteux fait l'an plantureux.",
  "Juin bien fleuri, vrai bonheur au logis.",
  "Beau temps à la Saint-Médard, la récolte se prépare.",
  "Juillet sans orage, famine au village.",
  "En juillet, la faucille au poignet.",
  "Quand août est bon, abondance à la maison.",
  "Ce que l'été mûrit, l'automne le cueille.",
  "Septembre est le mai de l'automne.",
  "En septembre, si tu es prudent, achète grains et vêtements.",
  "En octobre, qui n'a pas de vêtements doit en trouver.",
  "Quand l'automne est beau, l'hiver est méchant.",
  "À la Toussaint, le froid revient et met l'hiver en train.",
  "Novembre, mois des brumes, tient le jardinier en chambre.",
  "Décembre aux pieds blancs s'en vient, an de neige et de bon grain.",
  "Noël au balcon, Pâques aux tisons.",
];
const MOIS_ABR = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
// « de avril » ne se dit pas : avril, août et octobre demandent l'élision.
const deMois = m => (/^[aeiouyâàéèêîôû]/i.test(MOIS[m]) ? "d'" : "de ") + MOIS[m].toLowerCase();
const MOIS_PLEIN = ["janvier","février","mars","avril","mai","juin","juillet","août",
  "septembre","octobre","novembre","décembre"];

// Les deux tâches où l'on choisit la place de la plante.
const VOISINAGE_AU_GESTE = ["plant", "terre"];
const PIPS_EXPO = { soleil: 3, soleil_mi_ombre: 3, mi_ombre: 2, mi_ombre_ombre: 2, ombre: 1 };
const PIPS_EAU  = { faible: 1, modere: 2, regulier: 3, soutenu: 3 };
const PIPS_BUT  = { nul: 0, faible: 1, moyen: 2, fort: 3 };
const MOTIF_TYPO = { "Ornement": "ornement", "Aromatiques": "aromatique", "Légumes": "legume" };

// Une fenêtre peut être à cheval sur le 1er janvier, sa borne de début dépasse
// alors sa borne de fin. Tout test d'appartenance passe par ici.
const dansFenetre = (q, s, e) => (s <= e ? (q >= s && q <= e) : (q >= s || q <= e));
/* Une fenêtre touche une période de quinzaines si l'une d'elles y tombe. Le
   test par bornes, `s <= b && e >= a`, perdait les fenêtres à cheval sur le
   1er janvier : la multiplication du figuier, de fin novembre à début février,
   disparaissait de la frise filtrée sur janvier. */
const chevauche = (s, e, a, b) => {
  for (let q = a; q <= b; q++) if (dansFenetre(q, s, e)) return true;
  return false;
};

const demiTexte = q => (q % 2 ? "début " : "fin ") + MOIS_PLEIN[Math.ceil(q / 2) - 1];

// Motif de typologie, agrandi puis fondu : il tient lieu d'illustration sans
// prétendre représenter l'espèce.

// Un verbe par tâche, pour écrire la synthèse d'accueil en phrases.
// La multiplication prend le verbe exact du mode porté par la fiche.
const VERBE = {
  taille: "Tailler", fertilisation: "Amender", recolte: "Récolter",
  abri: "Semer à l'abri", terre: "Semer", plant: "Planter",
  protection: "Protéger", protection_ete: "Ombrer", multiplication: "Multiplier",
};
/* Les gestes du carnet suivent ceux du calendrier : amender et multiplier y
   manquaient, et ce qu'on venait de faire ne se notait pas sous le nom de la
   tâche annoncée. La contrainte `observations_geste` les accepte depuis le
   13 octobre 2026. */
const GESTE_NOM = { semis: "Semis", plantation: "Plantation", taille: "Taille",
                    amendement: "Amendement", multiplication: "Multiplication",
                    recolte: "Récolte", traitement: "Traitement", floraison: "Floraison",
                    maladie: "Maladie", note: "Note" };
const VERBE_MULTI = {
  division: "Diviser", tubercule: "Diviser", bouture: "Bouturer",
  marcotte: "Marcotter", greffe: "Greffer", semis: "Semer",
  spontanee: "Laisser se ressemer",
};
const verbeDe = (p, k) => k === "multiplication"
  ? (VERBE_MULTI[p.propagation] || VERBE.multiplication) : VERBE[k];

// Une énumération qui ouvre une phrase prend la capitale de la phrase.
const majuscule = t => String(t || "").charAt(0).toUpperCase() + String(t || "").slice(1);

// « la glycine », « l'ail », « le pommier ». Sans article connu, le nom seul.
function nomAvecArticle(p) {
  const nom = p.nom.split(",")[0].toLowerCase();
  if (!p.article) return nom;
  return p.article === "l'" ? "l'" + nom : p.article + " " + nom;
}

// Trois plantes nommées, puis le compte : au delà, la synthèse redevient une liste.
function enumerer(noms, max, muet) {
  const n = max || 3;
  const vus = noms.slice(0, n), reste = noms.length - vus.length;
  let t = vus.length > 1 ? vus.slice(0, -1).join(", ") + " et " + vus[vus.length - 1] : vus[0];
  // Là où le compte de la tâche est déjà porté à côté, le dire une seconde fois
  // en fin de phrase encombre la ligne sans rien apprendre.
  if (reste && !muet) t = vus.join(", ") + " et " + reste + " autre" + (reste > 1 ? "s" : "");
  else if (reste) t = vus.join(", ");
  return t;
}

// Une teinte très pâle de la couleur, posée sur le papier.
function teinte(hex, a) {
  const h = (hex || "#000000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Le fond de page suit la saison, à saturation très faible.
// Un pictogramme au trait par tâche, dessiné dans la couleur de la tâche.
const PICTOS = {
  abri:            '<path d="M4 19.5h16"/><path d="M6 19.5a6 6 0 0 1 12 0"/><path d="M12 14V9.5"/><circle cx="12" cy="7.6" r="1.7"/>',
  terre:           '<path d="M3 18.5h18"/><circle cx="8" cy="7" r="1.2"/><circle cx="12.6" cy="5.2" r="1.2"/><circle cx="16.6" cy="8" r="1.2"/><path d="M8 9.5v3.5M12.6 7.5v5.5M16.6 10.5v2.5"/>',
  plant:           '<path d="M6 12.5h12l-1.4 8H7.4z"/><path d="M12 12.5V8"/><path d="M12 9.2c2.4 0 3.9-1.5 3.9-3.9-2.4 0-3.9 1.5-3.9 3.9z"/>',
  floraison:       '<circle cx="12" cy="11" r="2"/><ellipse cx="12" cy="6.4" rx="1.8" ry="2.5"/><ellipse cx="12" cy="15.6" rx="1.8" ry="2.5"/><ellipse cx="7.4" cy="11" rx="2.5" ry="1.8"/><ellipse cx="16.6" cy="11" rx="2.5" ry="1.8"/>',
  recolte:         '<path d="M4 10.5h16l-2 9.5H6z"/><path d="M8 10.5a4 4 0 0 1 8 0"/>',
  taille:          '<path d="M7 3.5 14.5 13M17 3.5 9.5 13"/><circle cx="7.6" cy="17.4" r="2.6"/><circle cx="16.4" cy="17.4" r="2.6"/>',
  multiplication:  '<path d="M12 20.5v-6"/><path d="M12 14.5 7.6 9.4M12 14.5l4.4-5.1"/><circle cx="6.8" cy="7.8" r="2.2"/><circle cx="17.2" cy="7.8" r="2.2"/>',
  fertilisation:   '<path d="M3 18.5h18"/><path d="M6 18.5c0-3.2 2.6-5.4 6-5.4s6 2.2 6 5.4"/><circle cx="9" cy="8" r="1.1"/><circle cx="13" cy="5.6" r="1.1"/><circle cx="15.6" cy="9.4" r="1.1"/>',
  protection:      '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
  protection_ete:  '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.4v2M12 18.6v2M3.4 12h2M18.6 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
};

const picto = k => PICTOS[k]
  ? `<span class="picto-tache" aria-hidden="true"><svg viewBox="0 0 24 24">${PICTOS[k]}</svg></span>`
  : `<span class="pastille"></span>`;

const cleSourdine = (p, k) => p.id + "|" + k;

const anneeCourante = () => new Date().getFullYear();

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

/* ================== Glossaire du métier ==================
   Le référentiel emploie des mots précis, canne, collet, éclat, praliner. Les
   gloser dans chaque texte alourdirait la lecture. Ils sont repérés dans les
   textes de la fiche, leur définition s'ouvre au toucher. */
const LETTRE_FR = "A-Za-zÀ-ÖØ-öø-ÿŒœ";
let glossaire = [];
let regGloss = null;
let gloseOuverte = null;
const formeGloss = new Map();
const defGloss = new Map();

/* Une seule expression pour tout le vocabulaire, les formes les plus longues en
   tête pour que « porte-greffe » l'emporte sur « greffe ». Le mot est borné par
   des caractères qui ne sont ni lettre ni trait d'union, la limite de mot des
   expressions régulières ignorant les lettres accentuées. */
function compilerGlossaire() {
  formeGloss.clear(); defGloss.clear();
  const formes = [];
  glossaire.forEach(g => {
    defGloss.set(g.terme, g.definition);
    [g.terme].concat(g.variantes || []).forEach(f => {
      formeGloss.set(String(f).toLowerCase(), g.terme);
      formes.push(String(f));
    });
  });
  formes.sort((a, b) => b.length - a.length);
  const motif = formes.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  regGloss = formes.length
    ? new RegExp(`(^|[^${LETTRE_FR}-])(${motif})(?![${LETTRE_FR}-])`, "gi")
    : null;
}

// Texte échappé, dont les termes du glossaire deviennent touchables.
function marquerTermes(txt) {
  const t = esc(txt);
  if (!regGloss || !t) return t;
  return t.replace(regGloss, (m, avant, mot) => {
    const terme = formeGloss.get(mot.toLowerCase());
    return terme
      ? `${avant}<button type="button" class="terme" data-terme="${esc(terme)}">${mot}</button>`
      : m;
  });
}

/* Le bandeau d'état. L'action facultative sert au geste qu'on peut regretter :
   elle paraît à côté du message et s'efface avec lui. */
let minuteurEtat = null;
let minuteurMot = null;   // le mot posé dans le plein écran des photographies

function info(msg, erreur = false, action = null) {
  const e = $("etat");
  if (minuteurEtat) { clearTimeout(minuteurEtat); minuteurEtat = null; }
  if (!msg) { e.hidden = true; e.textContent = ""; return; }
  e.textContent = msg;
  e.className = "etat" + (erreur ? " erreur" : "");
  if (action) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "etat-action"; b.textContent = action.libelle;
    b.addEventListener("click", () => { info(""); action.faire(); });
    e.appendChild(b);
  }
  /* Le bandeau s'efface toujours de lui-même : il ne portait de minuteur que
     lorsqu'il offrait une action, et les autres messages restaient à l'écran
     jusqu'au suivant. Une erreur tient plus longtemps qu'une nouvelle. */
  minuteurEtat = setTimeout(() => info(""), action ? 12000 : erreur ? 10000 : 5000);
  e.hidden = false;
}

/* ================== Planches ================== */

/* Le manifeste porte une lettre de fonds par plante, et un g quand la planche
   est celle du genre plutôt que de l'espèce. Trois kilo-octets, servis par le
   site et mis en cache par l'agent de service. Son absence n'est pas une panne :
   aucune vignette n'apparaît, les rangées se referment. */
let planches = {};
/* Quatre ouvrages couvraient cent quatre-vingt-dix fiches. Les cent vingt-cinq
   restantes, ornementales d'origine non européenne pour la plupart, ne sont
   couvertes par aucun ouvrage unique : le fonds se nomme désormais par une clé
   de plusieurs lettres, dont aucune ne se termine par un `g`, le `g` final
   marquant la planche du genre. */
const FONDS = {
  k: "Köhler, Medizinal-Pflanzen, 1887",
  m: "Masclef, Atlas des plantes de France, 1891",
  t: "Thomé, Flora von Deutschland, 1885",
  v: "Vilmorin-Andrieux, Les plantes potagères, 1883",
  addis: "Addisonia",
  afbee: "Afbeeldingen der fraaiste, meest uitheemsche boomen en heesters",
  anbue: "Anales del Museo Nacional de Historia Natural de Buenos Aires",
  antil: "Flore médicale des Antilles",
  autre: "Wikimedia Commons, planche du domaine public",
  batav: "Flora Batava",
  beaut: "Beautiful Flowering Trees and Shrubs for British and Irish Gardens, 1903",
  belgi: "La Belgique horticole",
  besle: "Besler, Hortus Eystettensis, 1613",
  blanc: "Blanco, Flora de Filipinas",
  botgd: "The Botanic Garden, Maund, 1825",
  bulbs: "Bulbs and tuberous-rooted plants, 1893",
  canho: "The Canadian Horticulturist, 1893",
  consp: "Flora Conspicua, 1826",
  curtis: "Curtis's Botanical Magazine",
  edwards: "Edwards's Botanical Register",
  favo: "Favourite flowers of garden and greenhouse",
  fragm: "Fragmenta botanica, figuris coloratis illustrata",
  gand: "Annales de la Société royale d'agriculture et de botanique de Gand",
  gramin: "Contribución al conocimiento de las Gramináceas argentinas",
  grose: "Monographie du genre groseillier",
  herna: "Hernández, Rerum medicarum Novae Hispaniae thesaurus, 1651",
  indbo: "Illustrations of Indian Botany, 1840",
  lindm: "Lindman, Bilder ur Nordens Flora",
  millo: "Adolphe Millot, planches du Larousse",
  natfl: "The Native Flowers and Ferns of the United States, 1879",
  nypl: "New York Public Library, planche ancienne",
  paxton: "Paxton's Magazine of Botany",
  rosec: "The New Guide to Rose Culture, 1884",
  serres: "Flore des serres et des jardins de l'Europe",
  sieb: "Siebold et Zuccarini, Flora Japonica",
  sturm: "Sturm, Deutschlands Flora in Abbildungen",
  witte: "Witte, Flora, afbeeldingen",
};
const aPlanche = p => Boolean(planches[p.slug]);
/* Vignette de planche, partout où une plante est nommée dans une liste. Elle
   n'est pas réservée à l'écran des plantes : la même plante se reconnaît de la
   même façon dans la liste d'une tâche, dans la frise annuelle et dans un
   espace. L'adresse du masque est posée par l'observateur d'intersection. */
const vignettePlanche = (p, classe) => aPlanche(p)
  ? `<span class="v-planche${classe ? " " + classe : ""}" data-pl="${esc(p.slug)}" aria-hidden="true"></span>`
  : "";
/* La boîte reste réservée sans planche : six plantes sur trois cent quinze n'en
   ont pas, et leur nom démarrait à une autre abscisse que celui de leurs
   voisines. */
const vignetteOuVide = (p, classe) => aPlanche(p) ? vignettePlanche(p, classe)
  : `<span class="v-planche v-vide${classe ? " " + classe : ""}" aria-hidden="true"></span>`;
const plancheDuGenre = p => (planches[p.slug] || "").endsWith("g");
const creditPlanche = p => {
  const c = planches[p.slug];
  if (!c) return "";
  const genre = c.endsWith("g");
  return (FONDS[genre ? c.slice(0, -1) : c] || FONDS.autre)
    + (genre ? ", planche du genre" : "");
};

async function lirePlanches() {
  try {
    const r = await fetch("./planches.json");
    if (!r.ok) return;
    planches = await r.json();
    // Quatre écrans nomment des plantes et tous portent la vignette : celui qui a
    // été rendu avant l'arrivée du manifeste doit l'être à nouveau.
    if (plantes.length) rendreTout();
  } catch (e) { /* manifeste indisponible, aucune vignette */ }
}

function poserDicton(texte) {
  const d = $("dicton");
  if (d) d.textContent = "« " + texte + " »";
}

/* Le dicton du jour remplace celui de la quinzaine quand la date en porte un.
   Le fichier est déclaré dans l'agent de service : cinq kilo-octets compressés,
   une seule fois, et l'application reste juste hors réseau. */
async function chargerDictons() {
  try {
    const r = await fetch("./dictons.json");
    if (!r.ok) return;
    const t = await r.json();
    const cle = String(auj.getMonth() + 1).padStart(2, "0")
      + "-" + String(auj.getDate()).padStart(2, "0");
    if (t[cle]) poserDicton(t[cle]);
  } catch (e) { /* le repli de quinzaine reste en place */ }
}

/* Les masques ne sont posés qu'à l'approche de la rangée. Sans cela, ouvrir
   l'écran des plantes demanderait les 184 fichiers d'un coup, une image de
   fond n'ayant pas de chargement paresseux. */
let obsPlanches = null;
function poserPlanches(racine) {
  if (!racine || !window.IntersectionObserver) return;
  // Un seul observateur pour toute l'application : quatre écrans posent des
  // vignettes, et le remettre à zéro à chaque rendu laisserait les précédents
  // sans surveillance. Les éléments détachés du document ne croisent jamais
  // rien, ils s'éteignent d'eux-mêmes.
  if (!obsPlanches) {
    obsPlanches = new IntersectionObserver(entrees => {
      entrees.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.setProperty("--pl", `url("./planches/liste/${e.target.dataset.pl}.webp")`);
        obsPlanches.unobserve(e.target);
      });
    }, { rootMargin: "400px" });
  }
  racine.querySelectorAll(".v-planche[data-pl]").forEach(e => obsPlanches.observe(e));
}

/* ================== Catalogue ================== */

/* Le catalogue est lu en deux requêtes parallèles. La première porte ce que le
   premier écran affiche, 26 kilo-octets ; la seconde les quatre colonnes de
   texte long, 162 kilo-octets, qui ne servent qu'au libellé de l'action en cours
   et à la fiche. Le premier rendu n'attend plus que la première, et les deux
   partent en même temps : le catalogue complet arrive plus tôt qu'en une seule
   requête. */
const COL_LEGERES = "id,slug,name,category,typology,phases,spacing,spacing_cm,row_cm,depth,companions,"
  + "latin,family,habit,exposure,water_need,nectar,pollen,frost_min_c,height_min_cm,"
  + "height_max_cm,flower_colors,floraison_pic_q,floraison_pic_note,nom_article,propagation,"
  + "nom_accepte,life_cycle,conduite";
const COL_LONGUES = "id,attributes,guide,guide_periode,advice";
/* Signature de la forme des lignes gardées en cache. La clé de fraîcheur ne
   porte que le nombre de plantes et la date de la base : ajouter une colonne à
   la requête ne la change pas, et une installation qui a déjà un catalogue
   continuerait de servir des lignes sans cette colonne. La signature suit les
   colonnes demandées, elle change donc d'elle-même. Le nombre en tête se relève
   à la main quand la forme change sans qu'aucune colonne bouge. */
const FORME_CACHE = "1|" + COL_LEGERES + "|" + COL_LONGUES;

async function chargerCatalogue() {
  try {
    const brut = localStorage.getItem(CACHE);
    const c0 = brut ? JSON.parse(brut) : null;
    if (c0 && c0.forme === FORME_CACHE) {
      const c = c0;
      phases = c.phases; plantes = c.plantes; climats = c.climats || {}; shifts = c.shifts || {};
      saison = c.saison || {};
      apresCatalogue();
      verifierFraicheur(c.empreinte);
      return;
    }
  } catch (e) { /* cache indisponible */ }
  await lireCatalogue();
}



async function lireCatalogue() {
  const promesseLongues = avecReprise(() =>
    db.from("plants_full").select(COL_LONGUES).eq("is_active", true));
  const [rp, rl, rm, rc, rs, rv] = await Promise.all([
    avecReprise(() => db.from("phases").select("*").order("position")),
    avecReprise(() => db.from("plants_full").select(COL_LEGERES).eq("is_active", true)),
    avecReprise(() => db.from("catalog_meta").select("*").single()),
    avecReprise(() => db.from("climates").select("*").order("position")),
    avecReprise(() => db.from("climate_phase_shifts").select("*")),
    avecReprise(() => db.from("saison_vegetation").select("*")),
  ]);
  climats = {}; shifts = {}; saison = {};
  (rv.data || []).forEach(v => saison[v.climate_key] = v);
  (rc.data || []).forEach(c => climats[c.key] = c);
  (rs.data || []).forEach(r => {
    (shifts[r.climate_key] = shifts[r.climate_key] || {})[r.phase] = { s: r.shift_spring, a: r.shift_autumn };
  });
  if (rp.error || rl.error) { info("Catalogue indisponible. Vérifiez la connexion.", true); return; }
  phases = {};
  rp.data.forEach(p => phases[p.key] = { label: p.label, color: p.color });
  plantes = rl.data.map(p => ({
    id: p.id, slug: p.slug, nom: p.name, cat: p.category, typo: p.typology,
    espacement: p.spacing, ecart: p.spacing_cm, rang: p.row_cm,
    prof: p.depth, assoc: p.companions,
    phases: p.phases || {},
    // remplis par la seconde requête, jamais absents pour le code qui les lit
    conseil: "", attr: {}, guide: {}, guide_periode: {},
    latin: p.latin || "", famille: p.family || "", nomAccepte: p.nom_accepte || "",
    // colonnes lues par la fiche détaillée
    port: p.habit || "", expo: p.exposure || "", eauNiv: p.water_need || "",
    nectar: p.nectar || "", pollen: p.pollen || "", gel: p.frost_min_c,
    hmin: p.height_min_cm, hmax: p.height_max_cm,
    couleurs: p.flower_colors || [], pic: p.floraison_pic_q, picNote: p.floraison_pic_note || "",
    article: p.nom_article || "", propagation: p.propagation || "",
    /* La rotation ne concerne que ce qui se replante : la tomate est
       botaniquement vivace mais conduite en annuelle, et c'est la conduite qui
       tranche, ici comme dans le déclencheur qui tient la trace. */
    annuelle: ["annuelle", "bisannuelle"].includes(p.conduite || p.life_cycle || ""),
  })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  apresCatalogue();

  const rt = await promesseLongues;
  if (rt.error) { info("Conseils indisponibles : " + rt.error.message, true); return; }
  const parId = new Map(plantes.map(p => [p.id, p]));
  (rt.data || []).forEach(t => {
    const p = parId.get(t.id);
    if (!p) return;
    p.attr = t.attributes || {}; p.guide = t.guide || {};
    p.guide_periode = t.guide_periode || {}; p.conseil = t.advice || "";
  });
  // Seul l'écran du moment lit ces colonnes avant l'ouverture d'une fiche.
  rendreMaintenant();
  try {
    localStorage.setItem(CACHE, JSON.stringify({
      phases, plantes, climats, shifts, saison, forme: FORME_CACHE,
      empreinte: rm.data ? `${rm.data.plant_count}|${rm.data.updated_at}` : "",
    }));
  } catch (e) { /* stockage indisponible */ }
}

async function verifierFraicheur(empreinte) {
  const { data } = await db.from("catalog_meta").select("*").single();
  if (data && `${data.plant_count}|${data.updated_at}` !== empreinte) await lireCatalogue();
}

function apresCatalogue() {
  categories = ORDRE_CAT.filter(c => plantes.some(p => p.cat === c))
    .concat([...new Set(plantes.map(p => p.cat))].filter(c => !ORDRE_CAT.includes(c)).sort());
  ORDRE_TYPO.forEach(t => { etatTypo[t] = true; etatTypoP[t] = true; });
  categories.forEach(c => { etatCat[c] = true; etatCatP[c] = true; });
  $("tete-total").textContent = `${plantes.length} plantes au catalogue`;
  construireChips();
  construireMois();
  poserDicton(DICTONS[demi - 1]);
  chargerDictons();
  rendreTout();
}

const typoDe = cat => (plantes.find(p => p.cat === cat) || {}).typo;
const compte = f => plantes.filter(f).length;

/* ================== Jardin ================== */

const COL_JARDIN = "id,name,climate_key,altitude,last_opened_at,code_postal,commune,lat,lon,sol_texture,station_num";
const jardinActif = () => jardins.find(g => g.id === jardinId) || null;
// iOS isole le stockage local de l'application ajoutée à l'écran d'accueil de celui
// de Safari. Le jardin actif est donc mémorisé en base, où il suit le compte.
function memoriserOuverture(id) {
  const g = jardins.find(x => x.id === id);
  if (g) g.last_opened_at = new Date().toISOString();
  db.from("gardens").update({ last_opened_at: new Date().toISOString() }).eq("id", id)
    .then(({ error }) => { if (error) console.warn("dernier jardin non mémorisé :", error.message); });
}

// Un décalage d'horloge de quelques secondes entre l'appareil et le serveur fait
// rejeter le jeton avec « JWT issued at future ». C'est transitoire, une seconde
// tentative après une courte attente suffit.
async function listerJardins() {
  const { data, error } = await avecReprise(() => db.from("gardens").select(COL_JARDIN)
    .order("last_opened_at", { ascending: false, nullsFirst: false })
    .order("created_at"));
  if (error) { info("Jardins inaccessibles : " + error.message, true); return false; }
  jardins = data || [];
  info("");
  return true;
}

async function chargerJardin() {
  if (!session) {
    jardins = []; jardinId = null; espaces = []; aff = new Map(); adapt = {};
    sel = new Set(); espacePlan = null; avisPhoto = new Map(); photosPlante.clear();
    carnet = []; photosCarnet.clear(); urlsPhoto.clear(); saisieCarnet = null;
    saisieFiche = null; cultures = []; vignettes = new Map();
    majCompte(); majJardinUI(); construireChips(); rendreTout(); return;
  }
  /* Les avis de la personne masquent des photographies : ils sont chargés avant
     que la première fiche puisse s'ouvrir, et le cache des bandes est vidé. */
  photosPlante.clear();
  await chargerAvisPhoto();
  if (!await listerJardins()) return;
  if (!jardins.length) {
    const { error } = await db.rpc("ensure_garden");
    if (error) { info("Jardin inaccessible : " + error.message, true); return; }
    if (!await listerJardins()) return;
  }
  jardinId = jardins[0].id;
  await chargerContenuJardin();
}

async function chargerContenuJardin() {
  memoriserOuverture(jardinId);
  // Le climat est déjà connu, la table d'adaptation part donc dans le même lot
  // que le reste : quatre allers-retours au lieu de cinq en série.
  const cle = (jardinActif() || {}).climate_key || null;
  const [rp, rz, ra, rs, rc] = await Promise.all([
    avecReprise(() => db.from("garden_plants").select("plant_id").eq("garden_id", jardinId)),
    avecReprise(() => db.from("espaces").select("*").eq("garden_id", jardinId).order("position").order("name")),
    avecReprise(() => db.from("garden_plant_espaces").select("plant_id,espace_id,quantity").eq("garden_id", jardinId)),
    avecReprise(() => db.from("sourdines").select("*").eq("garden_id", jardinId)),
    cle ? avecReprise(() => db.from("plant_climates").select("plant_id,level,note").eq("climate_key", cle))
        : Promise.resolve({ data: [] }),
    chargerCarnet(),
    chargerCultures(),
  ]);
  adapt = {};
  (rc.data || []).forEach(r => adapt[r.plant_id] = r);
  sourdines = new Map();
  (rs.data || []).forEach(r => sourdines.set(r.plant_id + "|" + r.phase, r));
  if (rp.error) { info("Sélection illisible : " + rp.error.message, true); return; }
  info("");
  sel = new Set((rp.data || []).map(r => r.plant_id));
  espaces = rz.data || [];
  aff = new Map();
  (ra.data || []).forEach(r => {
    if (!aff.has(r.plant_id)) aff.set(r.plant_id, []);
    aff.get(r.plant_id).push(r);
  });
  if (espacePlan !== null && espacePlan !== "0" && !espaces.some(z => z.id === espacePlan)) espacePlan = null;
  chargerVignettes();
  await lireEauDuJour(cle);
  await Promise.all([lireReleves(), lireStation(), lireVigilance()]);
  majCompte(); majJardinUI(); construireChips(); rendreTout();
  // La météo arrive après le premier rendu : la synthèse doit être refaite,
  // son pied porte la décision d'arrosage tirée du bilan du sol.
  lireMeteo(jardinActif()).then(() => rendreMaintenant());
}

async function chargerAdaptations() {
  adapt = {};
  const g = jardinActif();
  if (!g || !g.climate_key) return;
  const { data } = await avecReprise(() =>
    db.from("plant_climates").select("plant_id,level,note").eq("climate_key", g.climate_key));
  (data || []).forEach(r => adapt[r.plant_id] = r);
}

async function basculer(plantId) {
  if (!session) { info("Connectez-vous pour enregistrer votre jardin."); $("email")?.focus(); return; }
  const present = sel.has(plantId);
  /* Retirer une plante défait aussi ses placements, faits un à un dans les
     espaces et les zones : le geste qui l'annule ne peut pas être muet. */
  if (present && !confirmerRetrait(plantId)) return;
  present ? sel.delete(plantId) : sel.add(plantId);
  majCompte(); rendreApresBascule(plantId);
  const req = present
    ? db.from("garden_plants").delete().eq("garden_id", jardinId).eq("plant_id", plantId)
    : db.from("garden_plants").insert({ garden_id: jardinId, plant_id: plantId });
  const { error } = await req;
  if (error) {
    present ? sel.add(plantId) : sel.delete(plantId);
    majCompte(); rendreApresBascule(plantId);
    info("Modification non enregistrée : " + error.message, true);
    return;
  }
  if (present) { aff.delete(plantId); construireChips(); rendreTout(); }
  /* Cocher une plante au catalogue ne disait rien : on ne savait ni que
     l'ajout était fait, ni comment revenir à son jardin. */
  if (!present && ecranCourant === "catalogue") {
    const p = plantes.find(x => x.id === plantId);
    const n = sel.size;
    info(`${p ? p.nom : "La plante"} rejoint le jardin, ${n} ${n > 1 ? "plantes" : "plante"} en tout.`,
      false, { libelle: "Voir mes plantes", faire: () => afficher("plantes") });
  }
}

function majCompte() {
  const n = sel.size;
  const t = n ? (n > 1 ? `${n} plantes retenues` : "1 plante retenue") : "aucune plante retenue";
  $("compte").textContent = t;
}

/* ================== Filtres ================== */

function groupeChips(conteneur, cles, etat, opts) {
  conteneur.innerHTML = "";
  cles.forEach(k => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", String(etat[k]));
    const couleur = opts.couleur ? opts.couleur(k) : null;
    b.innerHTML = (couleur ? `<i class="pastille" style="background:${couleur}"></i>` : "")
      + esc(opts.libelle ? opts.libelle(k) : k)
      + (opts.nb ? `<span class="nb">${opts.nb(k)}</span>` : "");
    b.addEventListener("click", () => {
      if (etat[k]) cles.forEach(x => etat[x] = (x === k));   // valeur active : on l'isole
      else etat[k] = true;                                    // valeur inactive : on l'ajoute
      opts.apres();
    });
    conteneur.appendChild(b);
  });
  const r = document.createElement("button");
  r.type = "button"; r.className = "lien"; r.textContent = "Tout";
  r.disabled = cles.every(k => etat[k]);
  r.addEventListener("click", () => { cles.forEach(x => etat[x] = true); opts.apres(); });
  conteneur.appendChild(r);
}

function catsVisibles(etatT) { return categories.filter(c => etatT[typoDe(c)]); }

function construireChips() {
  // Écran Mes plantes
  groupeChips($("chipsTypo"), ORDRE_TYPO, etatTypo, {
    couleur: t => COUL_TYPO[t],
    nb: t => compte(p => p.typo === t),
    apres: () => { catsVisibles(etatTypo).forEach(c => etatCat[c] = true); construireChips(); rendreSelection(); },
  });
  groupeChips($("chipsCat"), catsVisibles(etatTypo), etatCat, {
    nb: c => compte(p => p.cat === c),
    apres: () => { construireChips(); rendreSelection(); },
  });
  // Écran Planning
  groupeChips($("chipsPhase"), ORDRE.filter(k => phases[k]), etatPhase, {
    couleur: k => teinteK(k),
    libelle: k => phases[k].label,
    apres: () => { construireChips(); rendrePlanning(); },
  });
  groupeChips($("chipsTypoP"), ORDRE_TYPO, etatTypoP, {
    couleur: t => COUL_TYPO[t],
    nb: t => compte(p => p.typo === t),
    apres: () => { catsVisibles(etatTypoP).forEach(c => etatCatP[c] = true); construireChips(); rendrePlanning(); },
  });
  groupeChips($("chipsCatP"), catsVisibles(etatTypoP), etatCatP, {
    nb: c => compte(p => p.cat === c),
    apres: () => { construireChips(); rendrePlanning(); },
  });
  chipsEspaces($("chipsEspaceP"), $("ligneEspaceP"), rendrePlanning);
  majNbFiltres();
}

// Filtre d'espace : sélection unique, avec une valeur pour les plantes non classées.
function chipsEspaces(conteneur, ligne, apres) {
  if (!conteneur || !ligne) return;
  const lieux = racines();
  ligne.hidden = !lieux.length;
  conteneur.innerHTML = "";
  if (!lieux.length) return;
  const valeurs = [{ id: null, nom: "Tous" }]
    .concat(lieux.map(z => ({ id: z.id, nom: z.name, couleur: z.color })))
    .concat([{ id: "0", nom: "Non placées" }]);
  valeurs.forEach(v => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", String(espacePlan === v.id));
    const n = v.id === null ? sel.size
      : v.id === "0" ? [...sel].filter(id => !espacesDe(id).length).length
      : [...sel].filter(id => racinesDe(id).includes(v.id)).length;
    b.innerHTML = (v.couleur ? `<i class="pastille" style="background:${v.couleur}"></i>` : "")
      + esc(v.nom) + `<span class="nb">${n}</span>`;
    b.addEventListener("click", () => {
      espacePlan = espacePlan === v.id ? null : v.id;
      construireChips(); apres();
    });
    conteneur.appendChild(b);
  });
}

/* ================== Onglets ================== */

/* Quatre destinations de même rang, et un acte au centre. Le jardin et le
   catalogue partagent une section, l'un ouvert sur les espaces, l'autre sur le
   catalogue entier : ce sont deux corpus distincts, le jardin tel qu'il est et
   ce que l'application connaît. Ce qui reste des réglages n'est pas un écran
   mais deux feuilles, celle du jardin et celle du compte. */
const ECRANS = ["maintenant", "planning", "selection", "plantes", "carnet"];
const SECTION = { maintenant: "maintenant", planning: "planning",
                  selection: "selection", plantes: "plantes",
                  catalogue: "plantes", carnet: "carnet" };
const onglets = [...document.querySelectorAll(".onglet")];

function marquerOnglets() {
  onglets.forEach(x => x.setAttribute("aria-selected",
    String(x.dataset.ecran === ecranCourant)));
}

function afficher(dest) {
  ecranCourant = dest;
  const section = SECTION[dest] || dest;
  // Changer d'écran principal rend la vue d'ensemble, jamais une tâche ouverte.
  if (vueDetail !== null) { vueDetail = null; rendreMaintenant(); }
  /* L'entrée d'historique du niveau quitté le portait encore : la fermeture
     d'une feuille, qui revient d'un pas, rouvrait alors la liste complète sur
     l'écran du jour. L'entrée courante est ramenée à la vue d'ensemble. */
  if (history.state && history.state.detail) {
    try { history.replaceState({ ...history.state, detail: null }, ""); }
    catch (e) { /* historique indisponible */ }
  }
  ECRANS.forEach(n => { $("ec-" + n).hidden = (n !== section); });
  document.body.classList.toggle("sur-carnet", section === "carnet");
  marquerOnglets();
  marquerLivre();
  window.scrollTo(0, 0);
  /* L'année s'ouvre sur la quinzaine en cours au lancement, puis garde la
     quinzaine lue et la lecture choisie le temps de la session : on préparait
     septembre, on allait vérifier une plante, et l'on retrouvait août.
     Décision du 14 octobre 2026, sur l'audit par personas. */
  if (section === "planning") {
    majLectureAnnee();
    rendreQuinzaine();
  }
  if (section === "selection") { espaceOuvert = null; rendreEspaces(); }
  if (section === "plantes") {
    /* La même liste à deux étendues : celle du jardin depuis la barre, les
       trois cent quinze fiches depuis le livre de l'en-tête. La portée se règle
       avec la destination, le titre dit laquelle est ouverte. */
    /* Sans compte, « Mes plantes » montrait le catalogue entier sous le titre
       « 0 plante au jardin » : il dit maintenant ce qui manque. */
    porteeSel = dest === "catalogue" ? "tout" : "jardin";
    rendreSelection();
  }
  if (section === "carnet") rendreJournal();
}

/* Les deux écrans que la barre ne marque pas se nomment en tête : le carnet,
   atteint par le rond, et le catalogue, atteint par le livre. */
function majTeteCarnet() {
  const t = $("teteEcranCarnet");
  if (!t) return;
  const n = entreesDuCarnet().length, ou = nomDuContexte();
  t.innerHTML = `<b class="te-nom">Carnet</b>`
    + `<span class="te-sous">${ou ? esc(ou) + ", " : ""}`
    + `${n} ${n > 1 ? "entrées" : "entrée"}</span>`
    + (ou ? `<button type="button" class="lien te-tout">Tout le jardin</button>` : "");
  const b = t.querySelector(".te-tout");
  if (b) b.addEventListener("click", () => { carnetContexte = null; rendreJournal(); });
}

function majTetePlantes() {
  const t = $("teteEcranPlantes");
  if (!t) return;
  const cat = ecranCourant === "catalogue";
  const n = cat ? plantes.length : sel.size;
  t.innerHTML = `<b class="te-nom">${cat ? "Catalogue" : "Mes plantes"}</b>`
    + `<span class="te-sous">${n} ${n > 1 ? "plantes" : "plante"}`
    + `${cat ? " au catalogue" : " au jardin"}</span>`;
}

/* Le livre de l'en-tête s'enfonce tant que le catalogue est ouvert, aucune
   fente de la barre ne lui répondant. */
function marquerLivre() {
  const b = $("btnCatalogue");
  if (b) b.setAttribute("aria-pressed", String(ecranCourant === "catalogue"));
}

onglets.forEach(o => o.addEventListener("click", () => afficher(o.dataset.ecran)));

/* Le carnet se rafraîchit avec le reste quand une entrée est écrite ou
   effacée. */
function majCarnet() {
  if (ecranCourant === "carnet") rendreJournal();
}

/* Sans compte il n'y a ni jardin ni carnet : la liste des plantes se réduit au
   catalogue entier, qui reste consultable. */
function majAccesJardin(connecte) {
  majBoutonNoter();
  if (!connecte && SECTION[ecranCourant] !== "plantes") afficher("catalogue");
  else if (!connecte) { porteeSel = "tout"; rendreSelection(); }
}
/* Le titre ouvre le jardin quand il y en a un. Sans compte, il annonce la
   connexion et ouvre la feuille qui la porte : c'est la seule chose à faire. */
sur("btnJardin", "click", () => ouvrirVue(session ? "jardin" : "compte"));
sur("btnConfig", "click", () => ouvrirVue("compte"));
sur("btnCatalogue", "click", () => afficher("catalogue"));
/* Mes plantes ne sait que retirer : le catalogue est le seul endroit d'où une
   plante entre au jardin, et la liste y renvoie. */
sur("versCatalogue", "click", () => afficher("catalogue"));
/* Noter n'a de sens qu'avec un jardin où poser la note : le bouton ne paraît
   pas sans compte. */
/* Le rond ouvre le carnet et pose la feuille de saisie dessus. Baisser la
   feuille découvre ce qui est déjà noté, le rond la rappelle : écrire et relire
   sont le même endroit. */
sur("btnNoter", "click", () => {
  /* Le contexte se lit avant de passer au carnet : relu ensuite, il ne voyait
     plus l'espace ouvert, et la saisie retombait sur le premier lieu du jardin
     qui, par chance, était souvent celui de l'écran. */
  carnetContexte = contexteNote();
  saisiePartout = { ...carnetContexte };
  afficher("carnet");
  ouvrirVue("note");
});
function majBoutonNoter() {
  const b = $("btnNoter");
  if (b) b.hidden = !session;
}

/* Ce que disent les écrans du jour et de l'année quand le jardin est vide.
   Ils renvoyaient au bouton rond, qui ouvrait les plantes avant le 13 août et
   ne sert plus qu'à noter ; il est caché tant qu'on n'est pas connecté. Sans
   session, c'est la connexion qui manque ; avec, c'est le catalogue, seul
   endroit d'où l'on ajoute. */
function messageSansPlante() {
  return session
    ? "Aucune plante au jardin pour l'instant. Le catalogue, que le livre de l'en-tête ouvre aussi, les propose toutes."
    : "Connectez-vous pour retrouver votre jardin, ou en créer un.";
}

/* L'état vide renvoyait à une icône sans libellé : il porte maintenant les
   gestes qui le font cesser, se connecter, ajouter ses plantes, situer le
   jardin pour que la météo et l'arrosage le concernent. */
function videJardinHTML() {
  const g = jardinActif() || {};
  const actions = session
    ? `<button type="button" class="bouton" data-va="catalogue">Ajouter mes plantes</button>`
      + (g.code_postal ? "" : `<button type="button" class="lien" data-va="lieu">Indiquer ma commune</button>`)
    : `<button type="button" class="bouton" data-va="compte">Se connecter</button>`
      + `<button type="button" class="lien" data-va="catalogue">Parcourir le catalogue</button>`;
  return `<div class="vide vide-actions"><p>${esc(messageSansPlante())}</p>`
    + `<div class="va-boutons">${actions}</div></div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-va]");
  if (!b) return;
  const va = b.dataset.va;
  if (va === "catalogue") afficher("catalogue");
  else if (va === "compte") ouvrirVue("compte");
  else if (va === "lieu") ouvrirVue("lieu");
});

document.querySelectorAll(".segment[data-tri]").forEach(s => s.addEventListener("click", () => {
  tri = s.dataset.tri;
  document.querySelectorAll(".segment[data-tri]").forEach(x => x.setAttribute("aria-pressed", String(x === s)));
  rendreSelection();
}));


/* ================== Écran 1 : ma sélection ================== */

function filtrerSel() {
  const q = $("rech").value.trim().toLowerCase();
  return plantes.filter(p =>
    (porteeSel === "tout" || sel.has(p.id))
    && etatTypo[p.typo] && etatCat[p.cat]
    && (!climatSeul || (adapt[p.id] || {}).level === "adapte")
    && (!q || p.nom.toLowerCase().includes(q)
           || p.latin.toLowerCase().includes(q)
           || p.famille.toLowerCase().includes(q)));
}

function carteItem(p) {
  const bloc = document.createElement("div");
  bloc.className = "item-bloc";
  bloc.dataset.plante = p.id;
  const b = document.createElement("button");
  b.type = "button"; b.className = "item";
  b.setAttribute("aria-pressed", String(sel.has(p.id)));
  const ad = adapt[p.id];
  /* La catégorie n'a plus de titre de section depuis le 13 octobre : elle se
     lit sous le nom, dans les deux regroupements. Sous le titre d'un type qui
     porte son nom, celui des aromatiques, elle se tait. */
  const sousTitre = tri === "alpha" || p.cat !== typoDe(p.cat)
    ? `<span class="cat-mini">${esc(p.cat)}</span>` : "";
  const lieu = lieuHTML(p);
  /* La boîte de vignette est réservée même sans planche : cent vingt-cinq
     plantes sur trois cent quinze n'en ont pas, et leur nom démarrait alors à
     une autre abscisse, ce qui hachait le bord gauche de la liste. */
  /* Au jardin, toutes les rangées sont cochées : le rond n'y distinguait rien
     et une seule touche retirait la plante du jardin et de tous ses
     emplacements. La composition du jardin se règle au catalogue, seul endroit
     où le rond apprend quelque chose. */
  b.innerHTML = (porteeSel === "jardin" ? "" : `<span class="rond">${CHECK}</span>`)
    + (aPlanche(p)
        ? `<span class="v-planche" data-pl="${esc(p.slug)}" aria-hidden="true"></span>`
        : `<span class="v-planche v-vide" aria-hidden="true"></span>`)
    + `<span class="nom-item"><span class="nom-l">${esc(p.nom)}</span>`
    + (sousTitre || lieu ? `<span class="sous-item">${sousTitre}${lieu}</span>` : "")
    + `</span>`
    + (ad ? jaugeClim(ad.level, ad.note) : "")
    + `<span class="voir-fiche" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></span>`;
  /* Trois gestes sur la même rangée : le rond coche, le lieu ouvre le choix des
     espaces, le reste ouvre la fiche. */
  b.addEventListener("click", ev => {
    if (ev.target.closest(".rond")) { basculer(p.id); return; }
    if (ev.target.closest(".lieu-item")) { basculerChoixEspace(p.id); return; }
    ouvrirFeuille(p);
  });
  bloc.appendChild(b);
  /* La mise en sourdine est une notion de calendrier : son rappel a rejoint
     l'onglet du moment de la fiche, où l'on voit ce qui est masqué. */
  if (choixEspace.has(p.id) && sel.has(p.id) && racines().length) bloc.appendChild(choixEspaces(p));
  return bloc;
}

/* La rangée nomme les espaces occupés, sous le nom de la plante, là où le sous
   titre trouve sa place sans allonger la rangée. Répéter les huit espaces d'un
   jardin sous chacune des rangées ajoutait une ligne à toutes. */
function lieuHTML(p) {
  if (!sel.has(p.id) || !racines().length || choixEspace.has(p.id)) return "";
  /* La rangée nomme la zone après l'espace, « Potager (Carré du fond) » : la
     zone ne se lisait que dans la fiche, à trois gestes de la liste. Les lieux
     restent séparés par une virgule, la zone entre parenthèses : un lien par
     « et » se confondait avec un nom comme « Terrasse et balcon ». */
  const prises = racinesDe(p.id);
  const occupes = espacesDe(p.id);
  const noms = racines().filter(z => prises.includes(z.id)).map(z => {
    const zones = zonesDe(z.id).filter(x => occupes.includes(x.id)).map(x => x.name);
    return zones.length ? `${z.name} (${zones.join(", ")})` : z.name;
  });
  return noms.length
    ? `<span class="lieu-item">${esc(noms.join(", "))}</span>`
    : `<span class="lieu-item lieu-vide">Placer</span>`;
}

function basculerChoixEspace(plantId) {
  const ouvert = choixEspace.has(plantId);
  const autres = [...choixEspace].filter(id => id !== plantId);
  choixEspace.clear();
  if (!ouvert) choixEspace.add(plantId);
  autres.forEach(majRangee);
  majRangee(plantId);
}

/* Le choix complet ne se déplie que sur la rangée touchée, et se referme de
   lui-même dès qu'on ouvre celui d'une autre plante. */
function choixEspaces(p) {
  const r = document.createElement("div");
  r.className = "espaces-item";
  const prises = racinesDe(p.id);
  racines().forEach(z => {
    const c = document.createElement("button");
    c.type = "button"; c.className = "mini-chip";
    c.setAttribute("aria-pressed", String(prises.includes(z.id)));
    c.textContent = z.name;
    c.addEventListener("click", () => basculerEspace(p.id, z.id));
    r.appendChild(c);
  });
  const f = document.createElement("button");
  f.type = "button"; f.className = "mini-chip chip-replier";
  f.textContent = "Terminé";
  f.addEventListener("click", () => basculerChoixEspace(p.id));
  r.appendChild(f);
  return r;
}

/* Ce qu'une plante emporte en quittant le jardin : ses places dans les espaces
   et les zones. La question les compte, un placement ne se refait pas d'une
   touche. */
function confirmerRetrait(plantId) {
  const p = plantes.find(x => x.id === plantId);
  const n = (aff.get(plantId) || []).length;
  return confirm(`Retirer ${p ? nomAvecArticle(p) : "cette plante"} du jardin ?`
    + (n ? ` ${n > 1 ? `Ses ${n} emplacements sont perdus` : "Son emplacement est perdu"}.` : ""));
}

/* Trois gestes partagent les mêmes règles de placement : la pastille de la
   rangée, le choix de zone dans un espace, et l'ajout depuis le catalogue. */
async function retirerDe(plantId, lieux) {
  const liste = aff.get(plantId) || [];
  const ids = [].concat(lieux).filter(id => liste.some(r => r.espace_id === id));
  if (!ids.length) return true;
  const { error } = await db.from("garden_plant_espaces").delete()
    .eq("garden_id", jardinId).eq("plant_id", plantId).in("espace_id", ids);
  if (error) { info("Placement non retiré : " + error.message, true); return false; }
  aff.set(plantId, liste.filter(r => !ids.includes(r.espace_id)));
  return true;
}

/* Une plante ne peut pas occuper à la fois un espace et l'une de ses zones,
   elle y compterait deux fois. Deux zones du même espace restent possibles, un
   même légume pouvant tenir deux planches. */
async function placerSur(plantId, lieu, avertir = false) {
  const liste = aff.get(plantId) || [];
  if (liste.some(r => r.espace_id === lieu)) return true;
  if (avertir) {
    const p = plantes.find(x => x.id === plantId);
    const m = p ? alerteRotation(p, lieu) : "";
    if (m && !confirm(`${m} Placer ${p.nom} ici quand même ?`)) return false;
  }
  const souche = racineDe(lieu);
  const sortants = liste
    .filter(r => racineDe(r.espace_id) === souche && (lieu === souche || r.espace_id === souche))
    .map(r => r.espace_id);
  if (sortants.length && !await retirerDe(plantId, sortants)) return false;
  const { error } = await db.from("garden_plant_espaces")
    .insert({ garden_id: jardinId, plant_id: plantId, espace_id: lieu });
  if (error) { info("Espace non enregistré : " + error.message, true); return false; }
  aff.set(plantId, (aff.get(plantId) || [])
    .concat([{ plant_id: plantId, espace_id: lieu, quantity: null }]));
  // La trace de culture est écrite en base par un déclencheur : elle se relit.
  await chargerCultures();
  return true;
}

async function deplacer(plantId, de, vers) {
  if (de === vers || !session || !jardinId) return;
  if (!await placerSur(plantId, vers, true)) return;
  await retirerDe(plantId, de);
  construireChips(); rendreTout();
}

/* La rangée de l'onglet Mes plantes porte les espaces et jamais les zones :
   décocher un espace retire aussi ce qui est placé dans ses zones. */
async function basculerEspace(plantId, espaceId) {
  if (!session || !jardinId) return;
  const dedans = (aff.get(plantId) || [])
    .filter(r => racineDe(r.espace_id) === espaceId).map(r => r.espace_id);
  const ok = dedans.length ? await retirerDe(plantId, dedans)
    : await placerSur(plantId, espaceId, true);
  if (ok) { construireChips(); rendreTout(); }
}

function majLegendeClim() {
  const e = $("legendeClim");
  if (!e) return;
  const g = jardinActif();
  const c = g && g.climate_key ? climats[g.climate_key] : null;
  // Le filtre climatique n'a de sens que si un jardin déclare son climat.
  const b = $("filtreClimat");
  if (b) {
    if (!c) climatSeul = false;
    b.hidden = !c;
    b.setAttribute("aria-pressed", String(climatSeul));
  }
  /* Le filtre et sa légende ont rejoint le panneau replié : la ligne entière
     disparaît quand le jardin ne déclare pas de climat. */
  const l = $("ligneClimS");
  if (l) l.hidden = !c;
  if (!c) { e.hidden = true; return; }
  e.hidden = false;
  /* Le climat est déjà nommé dans l'entête : la légende n'a pas à le répéter et
     tient sur une ligne, en tête du tableau, sans cadre. Le titre reste, pour
     les lecteurs d'écran. */
  e.setAttribute("aria-label", `Adaptation au climat ${c.label.toLowerCase()}`);
  e.innerHTML = ["adapte", "protection", "abri", "deconseille"]
    .map(n => `<span class="leg-item">${jaugeClim(n)}${esc(NIVEAUX[n].court)}</span>`).join("");
}

/* Cocher une plante ne modifie qu'une rangée de la liste : le filtre de l'écran
   porte sur le type, la catégorie, le climat et la recherche, jamais sur la
   sélection. Reconstruire les 315 rangées à chaque coche coûtait vingt-trois à
   trente-trois millisecondes, jusqu'à quatre-vingt-treize sur un téléphone.
   Le repli sur le rendu complet couvre le cas où la liste n'est pas encore
   construite, à la première coche depuis un autre écran. */
function majRangee(plantId) {
  const ancien = document.querySelector(`.item-bloc[data-plante="${plantId}"]`);
  const p = plantes.find(x => x.id === plantId);
  if (!ancien || !p) return false;
  const neuf = carteItem(p);
  ancien.replaceWith(neuf);
  const v = neuf.querySelector(".v-planche[data-pl]");
  if (v) v.style.setProperty("--pl", `url("./planches/liste/${v.dataset.pl}.webp")`);
  return true;
}

/* Décocher une plante alors que la liste ne montre que le jardin la fait sortir
   du lot : sa rangée ne peut pas être remplacée, elle doit disparaître. Le
   rendu partiel ne vaut donc que pour le catalogue entier. */
function rendreApresBascule(plantId) {
  if (porteeSel === "jardin" || !majRangee(plantId)) { rendreTout(); return; }
  rendreMaintenant();
  rendrePlanning();
  rendreEspaces();
}

function rendreSelection() {
  majLegendeClim();
  majTetePlantes();
  const pied = $("piedPlantes");
  if (pied) pied.hidden = ecranCourant === "catalogue" || !session;
  /* « Tout décocher » n'a plus de case à décocher au jardin, et il y viderait le
     jardin entier d'une touche depuis un écran de consultation. */
  const vider = $("vider");
  if (vider) vider.hidden = porteeSel === "jardin";
  const zone = $("listes");
  zone.innerHTML = "";
  /* La teinte de rangée ne dit rien là où toutes les plantes sont retenues :
     en portée jardin, le rond porte seul le signal. */
  zone.dataset.portee = porteeSel;
  const lot = filtrerSel();
  /* Le dénominateur suit la portée. Annoncer « sur 315 » alors que l'on ne
     regarde que le jardin ne se raccordait à rien de visible. */
  const total = porteeSel === "jardin" ? sel.size : plantes.length;
  const bs = $("bilanSel");
  /* Le compte de la portée était porté par le segment qui la choisissait : il
     revient au bilan, qui le disait déjà quand un filtre écartait quelque
     chose et se taisait le reste du temps. */
  /* Au repos, le titre de l'écran porte le compte : le bilan ne le redit pas
     et ne parle que lorsqu'un filtre écarte quelque chose. */
  bs.hidden = lot.length === total;
  bs.textContent = lot.length === total ? "" : `${lot.length} sur ${total} affichées`;

  if (!lot.length) {
    const vs = $("videSel");
    vs.hidden = false;
    vs.innerHTML = porteeSel === "jardin" && !sel.size ? videJardinHTML()
      : "Aucune plante ne correspond. Élargissez les filtres ou effacez la recherche.";
    return;
  }
  $("videSel").hidden = true;

  if (tri === "alpha") {
    const g = document.createElement("div");
    g.className = "liste";
    lot.forEach(p => g.appendChild(carteItem(p)));
    zone.appendChild(g);
    poserPlanches(zone);
    return;
  }
  /* Un seul niveau, le type, comme sur l'écran d'un espace. Les catégories
     faisaient un second rang de titres, dont la plupart ne couvraient qu'une
     plante au jardin : elles se lisent sous le nom de chaque plante. */
  ORDRE_TYPO.forEach(t => {
    const dansType = lot.filter(p => typoDe(p.cat) === t);
    if (!dansType.length) return;
    // Le type est un bloc dont le nom fait la tête, collée en haut de l'écran.
    const bloc = document.createElement("section");
    bloc.className = "bloc-type";
    const tete = document.createElement("h2");
    tete.className = "groupe-type bloc-titre";
    tete.innerHTML = `<i class="pastille" style="background:${COUL_TYPO[t]}"></i>`
      + `<b>${esc(t)}</b><span class="nb">${dansType.length}</span>`;
    bloc.appendChild(tete);
    const g = document.createElement("div");
    g.className = "liste";
    dansType.forEach(p => g.appendChild(carteItem(p)));
    bloc.appendChild(g);
    zone.appendChild(bloc);
  });
  poserPlanches(zone);
}

sur("rech", "input", rendreSelection);
sur("filtreClimat", "click", () => { climatSeul = !climatSeul; majNbFiltres(); rendreSelection(); });
sur("vider", "click", async () => {
  if (!sel.size || !session) return;
  if (!confirm(`Retirer les ${sel.size} plantes du jardin ? `
    + `Leurs emplacements dans les espaces partent avec elles.`)) return;
  const copie = new Set(sel), copieAff = new Map(aff);
  sel = new Set(); aff = new Map(); majCompte(); construireChips(); rendreTout();
  const { error } = await db.from("garden_plants").delete().eq("garden_id", jardinId);
  if (error) {
    sel = copie; aff = copieAff; majCompte(); construireChips(); rendreTout();
    info("Suppression refusée : " + error.message, true);
  }
});

/* ================== Écran 2 : en ce moment ================== */

/* La date nomme le jour et l'ouvre : une pression donne la météo, l'eau, la
   lumière et la saison. Elle est dans le bandeau, à la place du climat du
   jardin, qui ne change pas d'un jour à l'autre et n'avait rien à faire sur un
   écran qui parle du moment. La quinzaine n'y est plus : elle se déduit de la
   date, et le calendrier la porte déjà sur sa ligne de l'année. */
const TEXTE_JOUR =
  auj.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
(() => {
  const b = $("dateJour");
  if (!b) return;
  /* La pastille porte la teinte de la saison en cours : elle dit la saison sans
     un mot, et c'est elle qui relie la date à la bande que le point traverse sur
     la ligne de l'année, côté calendrier. */
  b.innerHTML = `<i class="dj-saison" style="--t:${TEINTE_SAISON[SAISON_DU_JOUR]}"></i>`
    + `<span>${esc(TEXTE_JOUR)}</span>`;
})();

/* Le ruban de l'année : des bandes posées en jours, un cran par quinzaine, les
   initiales des mois, un point pour aujourd'hui. La feuille de la saison s'en
   sert pour poser les quatre étapes de la végétation. */
function dessinRuban(bandes) {
  const pc = j => (100 * j / JOURS_AN).toFixed(2);
  const debutMois = m => jourDeLAn(AN_EN_COURS, m, 1);
  const ici = POS_AN.toFixed(2);

  const bd = bandes.map(s =>
    `<i class="ra-s" style="left:${pc(s.a)}%;width:${pc(s.b - s.a)}%;--t:${s.t}"></i>`).join("");
  let crans = "";
  for (let m = 0; m < 12; m++) {
    // Le cran du premier du mois est un peu plus marqué que celui du seize :
    // le mois se lit d'abord, la quinzaine le divise.
    if (m) crans += `<u class="fort" style="left:${pc(debutMois(m))}%"></u>`;
    crans += `<u style="left:${pc(debutMois(m) + 15)}%"></u>`;
  }
  const initiales = MOIS.map((nom, m) => {
    const milieu = (debutMois(m) + (m === 11 ? JOURS_AN : debutMois(m + 1))) / 2;
    return `<b class="${m === auj.getMonth() ? "ici" : ""}" style="left:${pc(milieu)}%">`
      + nom[0] + `</b>`;
  }).join("");

  /* Les bandes sont enfermées dans le fond, qui les rogne à ses coins arrondis.
     La part à venir n'est pas grisée mais lavée de papier : les bandes se
     lisent d'un bout à l'autre, et l'année déjà passée est la plus franche. */
  return `<span class="ra-ligne">`
    + `<i class="ra-fond">${bd}<i class="ra-avenir" style="left:${ici}%"></i></i>`
    + crans
    + `<i class="ra-pt" style="left:${ici}%"></i></span>`
    + `<span class="ra-mois">${initiales}</span>`;
}

function shiftPour(k) {
  const g = jardinActif();
  if (!g || !g.climate_key) return { s: 0, a: 0 };
  const f = (shifts[g.climate_key] || {})[k];
  if (f) return f;
  const c = climats[g.climate_key];
  return c ? { s: c.shift_spring, a: c.shift_autumn } : { s: 0, a: 0 };
}

const borne = v => Math.min(24, Math.max(1, v));

// Un segment ancré au premier semestre suit le décalage de printemps, sinon celui d'automne.
function segsDe(p, k) {
  const brut = p.phases[k];
  if (!brut) return null;
  const g = jardinActif();
  const cle = g && g.climate_key ? g.climate_key : null;
  // Une fenêtre sans liste de climats vaut partout. Une fenêtre restreinte ne
  // s'affiche que si le jardin est calé sur l'un des climats concernés.
  const base = brut.filter(v => !v[2] || (cle && v[2].indexOf(cle) !== -1));
  if (!base.length) return null;
  const sh = shiftPour(k);
  if (!sh.s && !sh.a) return base;
  return base.map(v => {
    const d = v[0] <= 12 ? sh.s : sh.a;
    // L'identifiant de la fenêtre suit le décalage : c'est lui qui rattache
    // la période à son conseil propre.
    return [borne(v[0] + d), borne(v[1] + d), v[2], v[3]];
  });
}


// Jauge à quatre crans, toujours à la même place pour être lisible en balayage.
function jaugeClim(niveau, titre) {
  const n = NIVEAUX[niveau];
  if (!n) return "";
  const crans = [1, 2, 3, 4].map(i =>
    `<i class="cran${i <= n.crans ? " plein" : ""}"></i>`).join("");
  return `<span class="jauge niv-${niveau}" title="${esc(titre || n.long)}" `
    + `role="img" aria-label="${esc(n.court)}">${crans}</span>`;
}

function espacesDe(id) { return (aff.get(id) || []).map(r => r.espace_id); }

/* Une zone est un espace portant un parent, et la table n'en connaît que deux
   niveaux. Partout où l'application comptait, filtrait ou groupait par espace,
   elle raisonne sur la racine : une plante placée dans une zone appartient à
   l'espace qui la contient. */
function racines() { return espaces.filter(z => !z.parent_id); }
function zonesDe(id) { return espaces.filter(z => z.parent_id === id); }
function noeud(id) { return espaces.find(z => z.id === id) || null; }
function racineDe(id) { const z = noeud(id); return z ? (z.parent_id || z.id) : id; }
function racinesDe(id) { return [...new Set(espacesDe(id).map(racineDe))]; }

/* Un attribut non renseigné sur une zone est celui de son espace. La chaîne
   s'arrête là : le jardin ne porte que la texture du sol. */
function attribut(z, cle) {
  if (!z) return null;
  if (z[cle] !== null && z[cle] !== undefined && z[cle] !== "") return z[cle];
  const p = z.parent_id ? noeud(z.parent_id) : null;
  if (p && p[cle] !== null && p[cle] !== undefined && p[cle] !== "") return p[cle];
  return cle === "sol_texture" ? ((jardinActif() || {}).sol_texture || null) : null;
}

function passeEspace(p) {
  if (espacePlan === null) return true;
  const z = racinesDe(p.id);
  return espacePlan === "0" ? z.length === 0 : z.includes(espacePlan);
}

const actif = (p, k) => (segsDe(p, k) || []).some(v => dansFenetre(demi, v[0], v[1]));
/* Le conseil de la période en cours l'emporte sur celui de la tâche entière.
   Une plante taillée deux fois dans l'année ne reçoit pas le texte d'hiver au
   mois d'août. */
const conseilPeriode = (p, k) => {
  const g = p.guide_periode;
  if (!g) return "";
  const seg = (segsDe(p, k) || []).find(v => dansFenetre(demi, v[0], v[1]));
  return seg && seg[3] !== undefined && seg[3] !== null ? (g[seg[3]] || "") : "";
};

const texteAction = (p, k) => conseilPeriode(p, k)
  || (k === "taille" ? (p.guide.taille || p.attr.taille || "")
    : k === "multiplication" ? (p.guide.multiplication || p.attr.multiplication || "")
    : (p.guide[k] || ""));

/* Le bloc du temps est dans la vue d'ensemble : il se cache avec elle quand une
   tâche s'ouvre, sans qu'on ait à le lui dire. */
function majNiveau() {
  const ouvert = vueDetail !== null;
  $("vueEnsemble").hidden = ouvert;
  $("niveauDetail").hidden = !ouvert;
}

function ouvrirDetail(d) {
  if (vueDetail === null) scrollEnsemble = window.scrollY;
  vueDetail = d;
  try { history.pushState({ detail: d }, ""); } catch (e) { /* historique indisponible */ }
  rendreMaintenant();
  window.scrollTo(0, 0);
}

function revenirEnsemble() {
  if (history.state && history.state.detail) { history.back(); return; }
  vueDetail = null;
  rendreMaintenant();
  window.scrollTo(0, scrollEnsemble);
}

// La feuille pose son entrée d'historique par-dessus le niveau courant, qu'elle
// conserve : refermer la feuille rend la tâche ouverte, non la vue d'ensemble.
function poserEtatFeuille() {
  if (history.state && history.state.feuille) return;
  try { history.pushState({ detail: vueDetail, feuille: true }, ""); }
  catch (e) { /* historique indisponible */ }
}

// L'historique fait foi : l'affichage se remet dans l'état de l'entrée courante.
window.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("photoPlein").hidden) { e.stopPropagation(); fermerPhoto(); }
}, true);

window.addEventListener("popstate", () => {
  const e = history.state || {};
  if (!e.feuille) fermerFeuille();
  const avant = vueDetail;
  vueDetail = e.detail || null;
  if (avant === vueDetail) return;
  rendreMaintenant();
  window.scrollTo(0, vueDetail ? 0 : scrollEnsemble);
});

function rendreMaintenant() {
  appliquerAmbiance();
  const zone = $("maintenant");
  zone.innerHTML = "";
  $("barreNiveau").innerHTML = "";
  $("pagerTache").innerHTML = "";
  $("zoneMasquees").innerHTML = "";
  $("videMoment").innerHTML = "";
  if (obsSections) { obsSections.disconnect(); obsSections = null; }

  if (!sel.size) {
    vueDetail = null; majNiveau();
    $("synthese").hidden = true;
    $("piedVue").hidden = true;
    $("videMoment").innerHTML = videJardinHTML();
    return;
  }
  const mien = plantes.filter(p => sel.has(p.id));

  const MOIS_LONGS = ["janvier","février","mars","avril","mai","juin",
    "juillet","août","septembre","octobre","novembre","décembre"];
  const bornePrint = h => (h % 2 ? "mi-" : "fin ") + MOIS_LONGS[Math.ceil(h / 2) - 1];

  const finFenetre = (p, k) => {
    const seg = (segsDe(p, k) || []).find(v => dansFenetre(demi, v[0], v[1]));
    return seg ? seg[1] : 99;
  };
  const etatFenetre = (p, k) => {
    if (k === "floraison") return "";
    const seg = (segsDe(p, k) || []).find(v => dansFenetre(demi, v[0], v[1]));
    if (!seg) return "";
    if (seg[1] === demi) return "derniere";
    if (seg[0] === demi) return "ouverture";
    return "";
  };
  const losange = p => (p.attr.toxicite && !/^non toxique/i.test(p.attr.toxicite))
    /* Le losange seul, de huit pixels, ne disait son sens que par une bulle
       que le doigt ne fait jamais paraître : il porte le mot. */
    ? `<span class="losange-tox" title="${esc(p.attr.toxicite)}">`
      + `<span aria-hidden="true">&#9670;</span> toxique</span>` : "";
  const nomAvecMarque = p => `${esc(p.nom)}${losange(p)}`;

  const bouton = (classe, libelle, fn, picto) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "opt " + classe;
    b.innerHTML = (picto || "") + `<span>${esc(libelle)}</span>`;
    b.addEventListener("click", e => { e.stopPropagation(); fermerTiroirs(); fn(); });
    return b;
  };

  const poserRangee = (contenu, p, k, muet) => {
    const rangee = document.createElement("div");
    rangee.className = "rangee-tache" + (muet ? " en-sourdine" : "");
    const glissiere = document.createElement("div");
    glissiere.className = "glissiere";
    glissiere.appendChild(contenu);
    let gauche = null, droite = null;
    if (muet) {
      gauche = document.createElement("div");
      gauche.className = "tiroir tiroir-gauche";
      gauche.appendChild(bouton("opt-lever", "Réafficher", () => leverSourdine(p, k)));
    } else {
      gauche = document.createElement("div");
      gauche.className = "tiroir tiroir-gauche";
      gauche.appendChild(bouton("opt-quinzaine", "Cette quinzaine", () => mettreEnSourdine(p, k, "quinzaine"), OEIL_BARRE));
      gauche.appendChild(bouton("opt-periode", "Cette période", () => mettreEnSourdine(p, k, "periode", finFenetre(p, k)), OEIL_BARRE));
      droite = document.createElement("div");
      droite.className = "tiroir tiroir-droite";
      droite.appendChild(bouton("opt-toujours", "Ne plus afficher", () => mettreEnSourdine(p, k, "toujours"), OEIL_BARRE));
    }
    if (droite) rangee.appendChild(droite);
    rangee.appendChild(glissiere);
    rangee.appendChild(gauche);
    brancherGlissement(rangee, glissiere, gauche, droite);
    return rangee;
  };

  // Une ligne d'action, en tête soit le nom de la plante, soit le nom de la tâche.
  const ligneAction = (p, k, mode) => {
    const muet = Boolean(sourdineActive(p, k));
    const e = etatFenetre(p, k);
    const fin = finFenetre(p, k);
    /* Le bord de la fenêtre chassait la borne : une ligne de dernière quinzaine
       ne disait plus jusqu'à quand, et une ligne de première quinzaine ne disait
       pas qu'elle venait de s'ouvrir. Les deux paraissent, la pastille du bord
       devant la borne, qui reste dans tous les cas.

       « Démarre » et « se termine » depuis le 14 octobre 2026 : « 1ère
       quinzaine » et « dernière quinzaine » se lisaient comme des dates, sous
       un écran titré « Seconde quinzaine d'août ». Relevé par les quatre
       personas de l'audit, libellés retenus par Jérôme. */
    const pastille = e === "derniere"
      ? '<span class="echeance urgente">se termine</span>'
      : e === "ouverture" ? '<span class="echeance neuve">démarre</span>' : "";
    const borne = fin <= 24 && !muet
      ? `<span class="echeance">jusqu'à ${esc(bornePrint(fin))}</span>` : "";
    /* Pastille et borne forment un seul bloc : elles passent ensemble à la
       ligne quand le nom prend toute la largeur, plutôt que de le rogner. */
    const echeance = pastille || borne
      ? `<span class="ech-g">${pastille}${borne}</span>` : "";
    const tete = mode === "espace"
      ? `<span class="pt" style="background:${teinteK(k)}"></span>${esc(phases[k].label)}`
      : nomAvecMarque(p);
    const texte = texteAction(p, k);
    const d = document.createElement("button");
    d.type = "button";
    d.className = "action nom-action" + (e && !muet ? " a-" + e : "") + (texte ? "" : " sans-texte");
    d.innerHTML = `<span class="ligne-nom">`
      + (mode === "espace" ? "" : vignettePlanche(p, "v-pl-s"))
      + `<b>${tete}</b>${echeance}</span>`
      + (texte ? `<span class="dit-action">${esc(texte)}</span>` : "");
    d.addEventListener("click", ev => {
      if (ev.currentTarget.closest(".glissiere").dataset.glisse) return;
      ouvrirFeuille(p);
    });
    /* Une case dit que la tâche est faite : elle l'écrit au carnet et retire
       la ligne. La liste ne baissait jamais, faute de pouvoir le dire, et le
       masquage, seul recours, ne s'ouvrait que d'un glissement que rien
       n'annonçait. La floraison se constate, elle ne se fait pas. */
    if (muet || k === "floraison" || !session) return poserRangee(d, p, k, muet);
    const ligne = document.createElement("div");
    ligne.className = "ligne-fait";
    const f = document.createElement("button");
    f.type = "button";
    f.className = "fait";
    f.setAttribute("aria-label", `${VERBE[k] || phases[k].label} ${p.nom} : fait`);
    f.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/>'
      + '<path d="M8 12.4l2.8 2.8L16.2 9.6"/></svg>';
    f.addEventListener("click", ev => {
      ev.stopPropagation();
      if (ev.currentTarget.closest(".glissiere").dataset.glisse) return;
      marquerFait(p, k, fin);
    });
    ligne.append(d, f);
    return poserRangee(ligne, p, k, muet);
  };

  // Toutes les actions du moment, filtrées des masquées.
  const paires = [];
  let muettes = 0;
  const muettesPar = {};
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k]) return;
    mien.filter(p => actif(p, k)).forEach(p => {
      const muet = Boolean(sourdineActive(p, k));
      if (muet) { muettes++; muettesPar[k] = (muettesPar[k] || 0) + 1; }
      if (!muet || voirSourdines) paires.push({ p, k, muet });
    });
  });

  if (!paires.length) {
    vueDetail = null; majNiveau();
    $("bilanMoment").innerHTML = "";
    $("synthese").hidden = true;
    $("piedVue").hidden = true;
    $("videMoment").innerHTML = '<div class="vide-soigne">'
      + '<svg viewBox="0 0 1024 1024" aria-hidden="true">'
      + '<path d="M 512 824 C 512 720 512 660 512 470" fill="none" stroke="currentColor" stroke-width="52" stroke-linecap="round"/>'
      + '<path d="M 512 620 C 466 522 372 448 268 452 C 300 560 386 632 512 620 Z" fill="currentColor" opacity=".55"/>'
      + '<path d="M 512 512 C 560 404 656 340 764 336 C 736 452 644 528 512 512 Z" fill="currentColor"/></svg>'
      + '<p><b>Rien à faire cette quinzaine</b>Le jardin travaille sans vous. Période de repos ou de simple surveillance.</p></div>';
    return;
  }

  rendreBandeau();
  rendreSynthese(paires);

  const audibles = paires.filter(x => !x.muet);
  // L'urgence est déjà portée par la phrase de tête et par chaque ligne, le
  // décompte du pied ne mesure donc que la longueur de la liste.
  $("bilanMoment").innerHTML =
    `<b>${audibles.length}</b> action${audibles.length > 1 ? "s" : ""} sur `
    + `<b>${new Set(audibles.map(x => x.p.id)).size}</b> plantes`;
  $("piedVue").hidden = false;

  // Un filtre qui vide la tâche ouverte ramène à la vue d'ensemble.
  if (vueDetail && vueDetail.t === "tache" && !paires.some(x => x.k === vueDetail.k)) vueDetail = null;
  majNiveau();
  if (!vueDetail) return;

  const carreTache = k => `<span class="pt-tache" style="--t:${teinteK(k)}">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true">${PICTOS[k] || ""}</svg></span>`;
  const titreTache = k => VERBE[k] || phases[k].label;

  const boutonRetour = () => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "retour"; b.setAttribute("aria-label", "Vue d'ensemble");
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>';
    b.addEventListener("click", revenirEnsemble);
    return b;
  };

  // L'œil des masquées se pose au pied de la liste, là où le manque se constate.
  // Le compte porte sur ce que l'on regarde : la tâche ouverte, ou la liste entière.
  const poserMasquees = n => {
    if (!n && !voirSourdines) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bascule-sourdine" + (voirSourdines ? " active" : "");
    b.innerHTML = OEIL_BARRE + `<span>${voirSourdines ? "Cacher les actions masquées"
      : n + " action" + (n > 1 ? "s" : "") + " masquée" + (n > 1 ? "s" : "")}</span>`;
    b.addEventListener("click", () => { voirSourdines = !voirSourdines; rendreMaintenant(); });
    $("zoneMasquees").appendChild(b);
  };

  /* Un niveau de bord : ce qui se ferme, toutes tâches confondues. Il emprunte
     le rendu de la liste complète sur un lot restreint, ses sections restant
     celles des tâches. Vidé par un filtre, il ramène à la vue d'ensemble comme
     le ferait une tâche vidée. Le bord de ce qui s'ouvre a disparu avec sa
     phrase, le 13 octobre. */
  const estBord = vueDetail.t === "bord";
  const ETAT_BORD = { derniere: "derniere" };
  /* Le bord se restreint à une tâche quand on y vient par le verbe de la phrase
     de tête : il promet les plantes dont la fenêtre se ferme, non la tâche
     entière. */
  const vues = estBord
    ? paires.filter(x => etatFenetre(x.p, x.k) === ETAT_BORD[vueDetail.bord]
        && (!vueDetail.k || x.k === vueDetail.k)) : paires;
  if (!vues.length) { vueDetail = null; majNiveau(); return; }
  const clesPresentes = ORDRE_MAINTENANT.filter(k => vues.some(x => x.k === k));

  if (vueDetail.t === "tache") {
    const k = vueDetail.k;
    const lot = paires.filter(x => x.k === k);
    const barre = $("barreNiveau");
    barre.className = "barre-niveau";
    $("niveauDetail").classList.remove("mode-tout");
    barre.appendChild(boutonRetour());
    const t = document.createElement("span");
    t.className = "titre-niveau";
    t.innerHTML = carreTache(k) + `<span class="nom-niveau">${esc(titreTache(k))}</span>`;
    barre.appendChild(t);
    const n = document.createElement("span");
    n.className = "nb-niveau";
    n.textContent = lot.length + (lot.length > 1 ? " plantes" : " plante");
    barre.appendChild(n);

    if (k === "floraison") {
      const bloc = document.createElement("div");
      bloc.className = "bloc-puces";
      lot.forEach(x => {
        const d = document.createElement("div");
        d.className = "enveloppe-puce";
        d.innerHTML = `<button class="puce nom-action">`
          + vignettePlanche(x.p, "v-pl-s") + `${nomAvecMarque(x.p)}</button>`;
        d.querySelector(".nom-action").addEventListener("click", () => ouvrirFeuille(x.p));
        bloc.appendChild(d);
      });
      zone.appendChild(bloc);
    } else {
      // Ce qui se termine passe en tête, le reste suit la date de fin puis l'alphabet.
      lot.slice()
        .sort((a, b) => (etatFenetre(b.p, k) === "derniere") - (etatFenetre(a.p, k) === "derniere")
          || finFenetre(a.p, k) - finFenetre(b.p, k)
          || a.p.nom.localeCompare(b.p.nom, "fr"))
        .forEach(x => zone.appendChild(ligneAction(x.p, k, "tache")));
    }
    poserMasquees(muettesPar[k] || 0);
    poserPlanches(zone);

    const pager = $("pagerTache");
    const retour = document.createElement("button");
    retour.type = "button"; retour.className = "pas";
    retour.innerHTML = '<svg class="fl" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>'
      + "<span>Vue d'ensemble</span>";
    retour.addEventListener("click", revenirEnsemble);
    pager.appendChild(retour);
    const i = clesPresentes.indexOf(k);
    const suivant = clesPresentes[(i + 1) % clesPresentes.length];
    if (suivant && suivant !== k) {
      const s = document.createElement("button");
      s.type = "button"; s.className = "pas";
      s.innerHTML = carreTache(suivant) + `<span>${esc(titreTache(suivant))}</span>`
        + '<svg class="fl" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      s.addEventListener("click", () => {
        vueDetail = { t: "tache", k: suivant };
        try { history.replaceState({ detail: vueDetail }, ""); } catch (e) { /* historique indisponible */ }
        rendreMaintenant();
        window.scrollTo(0, 0);
      });
      pager.appendChild(s);
    }
    return;
  }

  // ---- Liste complète, rail de sections collant ----
  const barre = $("barreNiveau");
  barre.className = "barre-niveau" + (estBord ? "" : " barre-rail");
  $("niveauDetail").classList.add("mode-tout");
  barre.appendChild(boutonRetour());
  /* Le bord porte un titre plutôt qu'un rail : ses sections sont peu nombreuses
     et c'est la quinzaine qui est le sujet, non la tâche où l'on se trouve. */
  let rail = null;
  if (estBord) {
    const t = document.createElement("span");
    t.className = "titre-niveau";
    t.innerHTML = (vueDetail.k ? carreTache(vueDetail.k) : "")
      + `<span class="nom-niveau">Ce qui se termine</span>`
      + (vueDetail.k ? `<span class="sous-niveau">${esc(titreTache(vueDetail.k))}</span>` : "");
    barre.appendChild(t);
    const n = document.createElement("span");
    n.className = "nb-niveau";
    n.textContent = vues.length + (vues.length > 1 ? " actions" : " action");
    barre.appendChild(n);
  } else {
    /* Le regroupement est descendu ici, seul niveau où il agit : posé sur la
       vue d'ensemble, il ne changeait rien à la synthèse, toujours ordonnée par
       tâche. Il précède le rail, dont il commande les puces. */
    const bascule = document.createElement("div");
    bascule.className = "bascule-vue";
    [["tache", "Tâche"], ["espace", "Espace"]].forEach(([v, lib]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "vue" + (vueMoment === v ? " active" : "");
      b.textContent = lib;
      b.addEventListener("click", () => {
        vueMoment = v;
        try { localStorage.setItem("monjardin.vue", v); } catch (err) { /* stockage indisponible */ }
        rendreMaintenant();
        window.scrollTo(0, 0);
      });
      bascule.appendChild(b);
    });
    barre.appendChild(bascule);
    rail = document.createElement("div");
    rail.className = "rail";
    barre.appendChild(rail);
  }

  const sections = [];
  if (vueMoment === "espace") {
    const tous = racines().map(z => ({ cle: z.id, nom: z.name }))
      .concat([{ cle: "0", nom: "Non placées" }]);
    tous.forEach(g => {
      const dedans = p => g.cle === "0" ? !espacesDe(p.id).length : racinesDe(p.id).indexOf(g.cle) !== -1;
      const lot = vues.filter(x => dedans(x.p));
      if (!lot.length) return;
      const ids = [...new Set(lot.map(x => x.p.id))];
      const corps = document.createElement("div");
      corps.className = "corps-section";
      ids.map(id => plantes.find(p => p.id === id))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
        .forEach(p => {
          const bloc = document.createElement("div");
          bloc.className = "plante-groupe";
          const t = document.createElement("button");
          t.type = "button"; t.className = "tete-plante";
          t.innerHTML = vignettePlanche(p, "v-pl-s") + `<b>${nomAvecMarque(p)}</b>`
            + `<span class="voir-fiche" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></span>`;
          t.addEventListener("click", () => ouvrirFeuille(p));
          bloc.appendChild(t);
          lot.filter(x => x.p.id === p.id).forEach(x => bloc.appendChild(ligneAction(p, x.k, "espace")));
          corps.appendChild(bloc);
        });
      sections.push({ nom: g.nom, teinte: (espaces.find(z => z.id === g.cle) || {}).color || "#4C8C3F",
        compte: `${ids.length} plantes, ${lot.length} actions`, corps });
    });
  } else {
    clesPresentes.forEach(k => {
      const lot = vues.filter(x => x.k === k);
      const corps = document.createElement("div");
      corps.className = "corps-section";
      if (k === "floraison") {
        corps.classList.add("bloc-puces");
        lot.forEach(x => {
          const d = document.createElement("div");
          d.className = "enveloppe-puce";
          d.innerHTML = `<button class="puce nom-action">`
          + vignettePlanche(x.p, "v-pl-s") + `${nomAvecMarque(x.p)}</button>`;
          d.querySelector(".nom-action").addEventListener("click", () => ouvrirFeuille(x.p));
          corps.appendChild(d);
        });
      } else {
        lot.slice()
          .sort((a, b) => (etatFenetre(b.p, k) === "derniere") - (etatFenetre(a.p, k) === "derniere")
            || finFenetre(a.p, k) - finFenetre(b.p, k)
            || a.p.nom.localeCompare(b.p.nom, "fr"))
          .forEach(x => corps.appendChild(ligneAction(x.p, k, "tache")));
      }
      sections.push({ cle: k, nom: titreTache(k), teinte: teinteK(k),
        compte: String(lot.length), corps });
    });
  }

  const puces = [];
  sections.forEach((s, i) => {
    const bloc = document.createElement("section");
    bloc.className = "section-liste";
    const tete = document.createElement("div");
    tete.className = "tete-liste bloc-titre";
    tete.innerHTML = (s.cle ? carreTache(s.cle)
      : `<span class="pt-tache" style="background:${s.teinte}"></span>`)
      + `<span class="nom-niveau">${esc(s.nom)}</span>`
      + `<span class="nb-niveau">${esc(s.compte)}</span>`;
    bloc.appendChild(tete);
    bloc.appendChild(s.corps);
    zone.appendChild(bloc);

    if (!rail) return;
    const puce = document.createElement("button");
    puce.type = "button";
    puce.className = "puce-rail" + (i === 0 ? " ici" : "");
    puce.innerHTML = `<i style="background:${s.teinte}"></i>${esc(s.nom)}`;
    puce.addEventListener("click", () => {
      const y = bloc.getBoundingClientRect().top + window.scrollY - barre.offsetHeight - 6;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
    rail.appendChild(puce);
    puces.push({ puce, bloc });
  });
  /* Le bord où il reste à défiler s'éteint en fondu. Sans cela une puce se
     trouve tranchée net au bord du rail, ce qui se lit comme un défaut. */
  if (rail) {
    const majBords = () => {
      rail.toggleAttribute("data-gauche", rail.scrollLeft > 2);
      rail.toggleAttribute("data-droite",
        rail.scrollWidth - rail.clientWidth - rail.scrollLeft > 2);
    };
    rail.addEventListener("scroll", majBords, { passive: true });
    majBords();
  }
  // Le bord ne compte pas les masquées de la liste entière : il n'en montre pas.
  if (!estBord) poserMasquees(muettes);
  poserPlanches(zone);

  // La puce du rail suit la section lue, et le rail la ramène à sa vue.
  if (rail && window.IntersectionObserver) {
    obsSections = new IntersectionObserver(entrees => {
      entrees.forEach(e => {
        const t = puces.find(x => x.bloc === e.target);
        if (!t || !e.isIntersecting) return;
        puces.forEach(x => x.puce.classList.toggle("ici", x === t));
        /* Écart mesuré d'une boîte à l'autre et non par `offsetLeft`, qui se
           compte depuis la barre collante : tout ce qui précède le rail, le
           chevron de retour puis le regroupement, s'ajoutait à la position et
           faisait défiler le rail au delà de la puce à montrer. */
        const dx = t.puce.getBoundingClientRect().left - rail.getBoundingClientRect().left;
        rail.scrollTo({ left: Math.max(0, rail.scrollLeft + dx - 44), behavior: "smooth" });
      });
    }, { rootMargin: "-92px 0px -72% 0px", threshold: 0 });
    puces.forEach(x => obsSections.observe(x.bloc));
  }
}

/* ================== Écran 3 : planning ================== */

function construireMois() {
  const gm = $("grilleMois");
  if (gm.childElementCount) { majMois(); return; }
  MOIS.forEach((m, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mois-case" + (i === auj.getMonth() ? " en-cours" : "");
    b.dataset.court = m[0];
    b.textContent = ABR[i].toUpperCase();
    b.title = `N'afficher que les plantes ayant une tâche en ${m.toLowerCase()}`;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      // Second clic sur le même mois : on relâche le filtre.
      const meme = periode && periode.a === i * 2 + 1 && periode.b === i * 2 + 2;
      periode = meme ? null : { a: i * 2 + 1, b: i * 2 + 2, nom: MOIS[i].toLowerCase() };
      majMois();
      rendrePlanning();
    });
    gm.appendChild(b);
  });
  majMois();
  /* La case du mois en cours porte sous son initiale un repère en deux
     segments, un par quinzaine, plein pour celle du jour. Ces moitiés ne sont
     pas des boutons : une case fait vingt points de large, sa moitié ne se
     touche pas du doigt. Ce sont les jetons de la barre de filtres qui
     affinent. */
  const encours = gm.children[auj.getMonth()];
  if (encours) encours.classList.add("q" + (demi % 2 === 1 ? 1 : 2));

  ["quinz1", "quinz2"].forEach((id, k) => {
    const b = $(id);
    if (!b) return;
    b.addEventListener("click", () => {
      const m = periode ? Math.floor((periode.a - 1) / 2) : auj.getMonth();
      const q = m * 2 + 1 + k;
      const meme = periode && periode.a === q && periode.b === q;
      periode = meme ? { a: m * 2 + 1, b: m * 2 + 2, nom: MOIS[m].toLowerCase() }
        : { a: q, b: q, nom: (k ? "seconde" : "première") + " quinzaine " + deMois(m) };
      majMois();
      rendrePlanning();
    });
  });
}

// Une bande couvre une période donnée en quinzaines, sur toute la hauteur.
function poserBande(id, a, b) {
  const bande = $(id);
  if (!bande) return;
  if (a === null) { bande.hidden = true; return; }
  const col = getComputedStyle(document.documentElement).getPropertyValue("--col-nom").trim();
  bande.style.left = `calc(${col} + (100% - ${col}) * ${(a - 1) / 24})`;
  bande.style.width = `calc((100% - ${col}) * ${(b - a + 1) / 24})`;
  bande.hidden = false;
}

function majMois() {
  const mois = periode ? Math.floor((periode.a - 1) / 2) : null;
  [...$("grilleMois").children].forEach((b, i) =>
    b.setAttribute("aria-pressed", String(i === mois)));
  // Le mois en cours est marqué en permanence, la période retenue par-dessus.
  poserBande("bandeCourante", auj.getMonth() * 2 + 1, auj.getMonth() * 2 + 2);
  poserBande("bandeMois", periode ? periode.a : null, periode ? periode.b : 0);

  const jeu = $("jeuQuinz");
  if (jeu) {
    jeu.hidden = periode === null;
    ["quinz1", "quinz2"].forEach((id, k) => {
      const b = $(id);
      if (!b || mois === null) return;
      const q = mois * 2 + 1 + k;
      b.setAttribute("aria-pressed", String(periode.a === q && periode.b === q));
    });
  }
}

// Une plante entre dans la période si l'une de ses tâches encore filtrées y tombe.
function dansMois(p) {
  if (periode === null) return true;
  return ORDRE.some(k => etatPhase[k]
    && (segsDe(p, k) || []).some(v => chevauche(v[0], v[1], periode.a, periode.b)));
}

/* Les bornes d'une fenêtre, dites en quinzaines comme partout ailleurs. Une
   fenêtre qui couvre l'année entière n'a pas de bornes à énoncer. */
function bornesTexte(a, b) {
  if (a === 1 && b === 24) return "toute l'année";
  return `de ${demiTexte(a)} à ${demiTexte(b)}`;
}

/* Le conseil attaché à une fenêtre précise, et non à la fenêtre en cours : sur
   la frise on touche une barre de mars au mois d'août. */
function conseilDeFenetre(p, k, id) {
  const g = p.guide_periode || {};
  const propre = id === undefined || id === null || id === "" ? "" : (g[id] || "");
  return propre || (k === "taille" ? (p.guide.taille || p.attr.taille || "")
    : k === "multiplication" ? (p.guide.multiplication || p.attr.multiplication || "")
    : (p.guide[k] || ""));
}

function segs(p) {
  // Les périodes sont empilées sur le minimum de voies possible : une voie accueille
  // plusieurs tâches tant qu'elles ne se chevauchent pas. Une plante à dix tâches
  // tient ainsi sur deux ou trois lignes au lieu de dix.
  const h1 = periode === null ? 0 : periode.a;
  const h2 = periode === null ? 0 : periode.b;
  const items = [];
  ORDRE.forEach(k => {
    const seg = segsDe(p, k);
    if (!seg || !etatPhase[k] || !phases[k]) return;
    seg.forEach(v => {
      if (periode !== null && !chevauche(v[0], v[1], h1, h2)) return;
      items.push({ k, s: v[0], e: v[1], id: v[3] });
    });
  });
  if (!items.length) return '<div class="voie"></div>';

  items.sort((a, b) => a.s - b.s || a.e - b.e);
  const voies = [];
  items.forEach(it => {
    let v = voies.find(L => L[L.length - 1].e < it.s);
    if (!v) { v = []; voies.push(v); }
    v.push(it);
  });

  return voies.map(L => `<div class="voie">` + L.map(it => {
    // Une fenêtre à cheval sur le 1er janvier se dessine en deux morceaux.
    const morceaux = it.s <= it.e ? [[it.s, it.e]] : [[it.s, 24], [1, it.e]];
    return morceaux.map(([a, b]) => {
      const g = (a - 1) / 24 * 100, w = (b - a + 1) / 24 * 100;
      return `<span class="seg" style="left:${g}%;width:${w}%;background:${teinteK(it.k)}"`
        + ` role="button" tabindex="0" data-plante="${esc(p.id)}" data-tache="${esc(it.k)}"`
        + ` data-a="${it.s}" data-b="${it.e}"`
        + (it.id === undefined || it.id === null ? "" : ` data-periode="${esc(it.id)}"`)
        + ` aria-label="${esc(phases[it.k].label)}, ${esc(bornesTexte(it.s, it.e))}"`
        + ` title="${esc(phases[it.k].label)}"></span>`;
    }).join("");
  }).join("") + `</div>`).join("");
}

/* ================== Fiche de plante, rendu détaillé ==================
   Repris de la maquette validée : motif de typologie fondu dans l'en-tête,
   jauges normalisées, calendrier annuel en ruban ou en roue avec une teinte
   par action, besoin en eau, taille à maturité rapportée à une silhouette. */

function cleMotif(p) {
  if (p.typo === "Fruits") return p.port === "arbre" ? "arbre" : "fruit";
  return MOTIF_TYPO[p.typo] || "ornement";
}

/* La planche remplace le motif décoratif par typologie quand elle existe. Le
   blanc de son papier disparaît par fusion multiplicative, un dégradé dégage le
   côté du titre. Le motif reste pour les 131 fiches sans planche. */
function motifFiche(p) {
  if (aPlanche(p)) {
    return `<span class="f-planche" aria-hidden="true">`
      + `<img src="./planches/fiche/${esc(p.slug)}.webp" alt="" decoding="async"></span>`;
  }
  const m = MOTIF[cleMotif(p)];
  if (!m) return "";
  return `<span class="f-motif" aria-hidden="true"><svg viewBox="0 0 200 200">${m}</svg></span>`;
}

function pips(n, max) {
  let s = "";
  for (let i = 1; i <= (max || 3); i++) s += `<i class="${i <= n ? "plein" : ""}"></i>`;
  return `<span class="f-pips${n === 0 ? " zero" : ""}">${s}</span>`;
}

function jaugesFiche(p) {
  const g = [];
  const ligne = (icone, n, texte) => `<div class="f-jauge">`
    + `<span class="f-ji" aria-hidden="true"><svg viewBox="0 0 20 20">${GJ[icone]}</svg></span>`
    + pips(n) + `<span class="f-jt">${esc(texte)}</span></div>`;

  if (p.expo) g.push(ligne("soleil", PIPS_EXPO[p.expo] || 2, p.attr.exposition || ""));
  if (p.eauNiv) {
    const t = { faible: "Arrosage faible", modere: "Besoin modéré",
      regulier: "Arrosage régulier", soutenu: "Arrosage soutenu" }[p.eauNiv] || "";
    g.push(ligne("goutte", PIPS_EAU[p.eauNiv] || 2, t));
  }
  if (p.nectar || p.pollen) {
    const n = PIPS_BUT[p.nectar] || 0, po = PIPS_BUT[p.pollen] || 0;
    const t = (n && po) ? "Nectar et pollen" : n ? "Surtout du nectar"
      : po ? "Surtout du pollen" : "Rien pour les butineurs";
    g.push(ligne("butineur", Math.max(n, po), t));
  }
  if (p.gel !== null && p.gel !== undefined) {
    const v = Number(p.gel);
    const t = v >= 0 ? "Gèle dès " + v.toString().replace(".", ",") + " °C"
      : "Tient " + ("−" + Math.abs(v).toString().replace(".", ",")) + " °C";
    g.push(ligne("flocon", v <= -15 ? 3 : v <= -7 ? 2 : 1, t));
  }
  return g.length ? `<div class="f-jauges">${g.join("")}</div>` : "";
}

// Une voie par action, dans un ordre fixe d'une fiche à l'autre, pour que deux
// plantes se comparent d'un coup d'oeil.
function voiesFiche(p) {
  const out = [];
  ORDRE_FICHE.forEach(k => {
    if (!phases[k]) return;
    const seg = segsDe(p, k);
    if (seg && seg.length) out.push({ k, seg });
  });
  return out;
}

const couleurAction = (p, k) => k === "floraison"
  ? (FLEUR[(p.couleurs || [])[0]] || FLEUR.rose) : [TEINTE[k], TEINTE[k]];

function rubanSVG(p) {
  const V = voiesFiche(p);
  if (!V.length) return "";
  const G = 102, W = 242, LH = 23, H = V.length * LH + 20;
  const x = r => G + (r - 1) / 24 * W;
  const s = [`<svg class="f-svg" viewBox="0 0 ${G + W} ${H + 14}" role="img" aria-label="Calendrier annuel">`];
  for (let m = 0; m < 12; m++) {
    const r = m * 2 + 1;
    s.push(`<line x1="${x(r).toFixed(1)}" y1="0" x2="${x(r).toFixed(1)}" y2="${H - 6}" stroke="var(--f-grille)"/>`);
    if (m % 2 === 0) s.push(`<text class="f-tk" x="${(x(r) + W / 24).toFixed(1)}" y="${H + 8}" text-anchor="middle">${MOIS_ABR[m]}</text>`);
  }
  s.push(`<rect x="${x(demi).toFixed(1)}" y="-3" width="${(W / 24).toFixed(1)}" height="${H}" fill="#14140f" opacity=".07"/>`);
  [x(demi), x(demi) + W / 24].forEach(xb =>
    s.push(`<line x1="${xb.toFixed(1)}" y1="-4" x2="${xb.toFixed(1)}" y2="${H - 2}" stroke="var(--f-ink3)" stroke-width="1.2"/>`));

  V.forEach((v, i) => {
    const y = i * LH + 4, gl = PHF[v.k][2];
    const on = v.seg.some(t => dansFenetre(demi, t[0], t[1]));
    const flo = v.k === "floraison";
    const [col, cerne] = couleurAction(p, v.k);
    s.push(`<rect x="${G}" y="${y}" width="${W}" height="14" rx="4" fill="#14140f" opacity=".035"/>`);
    v.seg.forEach(t => {
      const parts = t[0] <= t[1] ? [[t[0], t[1]]] : [[t[0], 24], [1, t[1]]];
      parts.forEach(q => {
        const X = x(q[0]), Wd = x(q[1] + 1) - x(q[0]);
        s.push(`<rect x="${X.toFixed(1)}" y="${y}" width="${Math.max(Wd - 2, 5).toFixed(1)}" height="14" rx="4"`
          + ` fill="${col}" stroke="${cerne}" stroke-width="${flo ? 1 : 0}" opacity="${on ? 1 : .82}"/>`);
      });
    });
    if (flo && p.pic) s.push(`<circle cx="${(x(p.pic) + W / 48).toFixed(1)}" cy="${y + 7}" r="3.4" fill="${cerne}"/>`);
    s.push(`<g transform="translate(2,${y + 1}) scale(0.62)" class="f-ic">${GLF[gl]}</g>`);
    // Le libellé de la tâche porte parfois deux mots séparés par une virgule,
    // la voie n'en garde que le premier, la légende de la roue les garde tous.
    const lbl = phases[v.k].label.split(",")[0];
    const gras = on ? ' style="fill:var(--f-ink);font-weight:600"' : "";
    if (lbl.length <= 13 || lbl.indexOf(" ") === -1) {
      s.push(`<text class="f-lane" x="${G - 8}" y="${y + 11}" text-anchor="end"${gras}>${esc(lbl)}</text>`);
    } else {
      const c = lbl.indexOf(" ");
      s.push(`<text class="f-lane" x="${G - 8}" y="${y + 3.5}" text-anchor="end"${gras}>${esc(lbl.slice(0, c))}`
        + `<tspan x="${G - 8}" dy="9.2">${esc(lbl.slice(c + 1))}</tspan></text>`);
    }
  });
  return s.join("") + "</svg>";
}

function roueSVG(p) {
  const V = voiesFiche(p);
  if (!V.length) return "";
  const n = V.length, R0 = 44, anneau = 11, ecart = 3.4, LEG = 132;
  const Rmax = R0 + n * (anneau + ecart), S = 2 * (Rmax + 24), C = S / 2;
  const ang = q => (q - 1) / 24 * 2 * Math.PI - Math.PI / 2;
  const pt = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
  const f = v => v.toFixed(1);
  const s = [`<svg class="f-svg" viewBox="0 0 ${(S + LEG).toFixed(0)} ${S.toFixed(0)}" role="img" aria-label="Année en roue">`];

  const a1 = ang(demi), a2 = ang(demi + 1);
  const [p1, p2, p3, p4] = [pt(R0 - 8, a1), pt(Rmax + 7, a1), pt(Rmax + 7, a2), pt(R0 - 8, a2)];
  s.push(`<path d="M ${f(p1[0])} ${f(p1[1])} L ${f(p2[0])} ${f(p2[1])} A ${f(Rmax + 7)} ${f(Rmax + 7)} 0 0 1 `
    + `${f(p3[0])} ${f(p3[1])} L ${f(p4[0])} ${f(p4[1])} Z" fill="#14140f" opacity=".09"/>`);
  for (let m = 0; m < 12; m++) {
    const a = ang(m * 2 + 1), q1 = pt(R0 - 8, a), q2 = pt(Rmax + 7, a);
    s.push(`<line x1="${f(q1[0])}" y1="${f(q1[1])}" x2="${f(q2[0])}" y2="${f(q2[1])}" stroke="var(--f-grille)"/>`);
    const t = pt(Rmax + 18, ang(m * 2 + 2));
    s.push(`<text class="f-tk" x="${f(t[0])}" y="${f(t[1] + 3)}" text-anchor="middle">${MOIS_ABR[m]}</text>`);
  }
  [a1, a2].forEach(a => {
    const q1 = pt(R0 - 8, a), q2 = pt(Rmax + 7, a);
    s.push(`<line x1="${f(q1[0])}" y1="${f(q1[1])}" x2="${f(q2[0])}" y2="${f(q2[1])}" stroke="var(--f-ink3)" stroke-width="1.2"/>`);
  });

  V.forEach((v, i) => {
    const r = Rmax - i * (anneau + ecart), gl = PHF[v.k][2];
    const on = v.seg.some(t => dansFenetre(demi, t[0], t[1]));
    const flo = v.k === "floraison";
    const [col, cerne] = couleurAction(p, v.k);
    const op = on ? 1 : .82;
    s.push(`<circle cx="${f(C)}" cy="${f(C)}" r="${f(r)}" fill="none" stroke="#14140f" stroke-width="${anneau}" opacity=".05"/>`);
    v.seg.forEach(t => {
      const b = t[0] <= t[1] ? t[1] : 24 + t[1];
      if (b + 1 - t[0] >= 24) {
        if (flo) s.push(`<circle cx="${f(C)}" cy="${f(C)}" r="${f(r)}" fill="none" stroke="${cerne}" stroke-width="${anneau + 2}" opacity="${op}"/>`);
        s.push(`<circle cx="${f(C)}" cy="${f(C)}" r="${f(r)}" fill="none" stroke="${col}" stroke-width="${anneau}" opacity="${op}"/>`);
        return;
      }
      const A1 = ang(t[0]), A2 = ang(b + 1);
      const s1 = pt(r, A1), s2 = pt(r, A2), big = (A2 - A1) > Math.PI ? 1 : 0;
      if (flo) s.push(`<path d="M ${f(s1[0])} ${f(s1[1])} A ${f(r)} ${f(r)} 0 ${big} 1 ${f(s2[0])} ${f(s2[1])}" `
        + `fill="none" stroke="${cerne}" stroke-width="${anneau + 2}" stroke-linecap="round" opacity="${op}"/>`);
      s.push(`<path d="M ${f(s1[0])} ${f(s1[1])} A ${f(r)} ${f(r)} 0 ${big} 1 ${f(s2[0])} ${f(s2[1])}" `
        + `fill="none" stroke="${col}" stroke-width="${anneau}" stroke-linecap="round" opacity="${op}"/>`);
    });
    if (flo && p.pic) {
      const mp = pt(r, ang(p.pic) + 2 * Math.PI / 48);
      s.push(`<circle cx="${f(mp[0])}" cy="${f(mp[1])}" r="3.2" fill="${cerne}" stroke="var(--f-carte)" stroke-width="1.2"/>`);
    }
    const mk = pt(r, ang(1)), rr = anneau / 2 + 1.6;
    s.push(`<circle cx="${f(mk[0])}" cy="${f(mk[1])}" r="${f(rr)}" fill="var(--f-carte)" stroke="${cerne}" stroke-width="1.1"/>`);
    s.push(`<g transform="translate(${f(mk[0] - 5.2)},${f(mk[1] - 5.2)}) scale(0.52)" style="color:${cerne}">${GLF[gl]}</g>`);
  });

  const y0 = C - (n * 19) / 2 + 9;
  s.push(`<text class="f-tk" x="${(S + 6).toFixed(0)}" y="${f(y0 - 15)}">de l'extérieur au centre</text>`);
  V.forEach((v, i) => {
    const [, cerne] = couleurAction(p, v.k), yy = y0 + i * 19, gl = PHF[v.k][2];
    s.push(`<circle cx="${(S + 12).toFixed(0)}" cy="${f(yy - 2)}" r="7.6" fill="var(--f-carte)" stroke="${cerne}" stroke-width="1.1"/>`);
    s.push(`<g transform="translate(${f(S + 6.8)},${f(yy - 7.2)}) scale(0.52)" style="color:${cerne}">${GLF[gl]}</g>`);
    s.push(`<text class="f-lane" x="${(S + 24).toFixed(0)}" y="${f(yy + 2)}">${esc(phases[v.k].label)}</text>`);
  });

  const ra = R0 - 1, e1 = ang(1) - 1.28, e2 = ang(1) + 1.14;
  const q1 = pt(ra, e1), q2 = pt(ra, e2);
  s.push(`<path d="M ${f(q1[0])} ${f(q1[1])} A ${f(ra)} ${f(ra)} 0 0 1 ${f(q2[0])} ${f(q2[1])}" `
    + `fill="none" stroke="var(--f-ink3)" stroke-width="1.6" opacity=".5"/>`);
  const h1 = pt(ra - 3.6, e2), h2 = pt(ra + 3.6, e2), h3 = pt(ra, e2 + 0.145);
  s.push(`<path d="M ${f(h1[0])} ${f(h1[1])} L ${f(h2[0])} ${f(h2[1])} L ${f(h3[0])} ${f(h3[1])} Z" fill="var(--f-ink3)" opacity=".5"/>`);
  s.push(`<circle cx="${f(C)}" cy="${f(C)}" r="${f(R0 - 12)}" fill="var(--f-plan)"/>`);
  s.push(`<text x="${f(C)}" y="${f(C - 3)}" text-anchor="middle" class="f-tk">quinzaine</text>`);
  s.push(`<text x="${f(C)}" y="${f(C + 12)}" text-anchor="middle" class="f-centre">${demiTexte(demi)}</text>`);
  return s.join("") + "</svg>";
}

// Silhouette d'une seule pièce, tracée dans un repère de hauteur 100.
const CORPS_HUMAIN = "M-1.6 0.6C2.4 -0.6 5.6 2.4 5.8 7.2C6.0 11.0 5.0 14.4 3.4 17.0"
  + "C3.6 19.0 3.9 20.6 4.6 21.6C8.8 22.8 11.4 25.8 12.0 30.6"
  + "C12.6 35.4 12.2 42.0 11.4 48.4C11.0 52.0 10.4 55.4 10.0 58.6"
  + "C10.4 66.0 9.8 75.4 9.0 83.6C8.5 89.4 8.0 94.8 7.6 99.4L2.8 99.6"
  + "C2.4 92.0 2.0 84.2 1.4 76.8C1.2 73.6 0.6 71.8 0.2 70.6"
  + "C-0.3 71.8 -0.9 73.6 -1.2 76.8C-1.8 84.2 -2.4 92.0 -2.8 99.6L-7.6 99.4"
  + "C-8.0 94.8 -8.5 89.4 -9.0 83.6C-9.8 75.4 -10.4 66.0 -10.0 58.6"
  + "C-10.4 55.4 -11.0 52.0 -11.4 48.4C-12.2 42.0 -12.6 35.4 -12.0 30.6"
  + "C-11.4 25.8 -8.8 22.8 -4.6 21.6C-3.9 20.6 -3.6 19.0 -3.4 17.0"
  + "C-5.0 14.4 -6.0 11.0 -5.8 7.2C-5.6 2.4 -4.0 0.0 -1.6 0.6Z";

/* Le motif est densifié : fondu dans l'écran il disparaîtrait à cette taille.

   Le paramètre des couches sert la rangée de pieds voisins. Là où l'écartement
   est plus étroit que la plante, plusieurs dessins se recouvrent et leurs
   opacités s'additionnent : une rangée de radis tous les trois centimètres
   virerait au noir. L'opacité de chaque dessin est donc abaissée pour que leur
   superposition reste lisible. La compensation n'est que partielle, en racine
   du nombre de couches : une rangée dense est réellement plus opaque qu'un pied
   seul, un rang de radis fait un ruban de feuillage continu. */
function densifie(m, k, couches) {
  return m.replace(/opacity="\.(\d+)"/g, (t, d) => {
    const o = Math.min(0.85, Number("0." + d) * k);
    const c = couches && couches > 1 ? 1 - Math.pow(1 - o, 1 / Math.sqrt(couches)) : o;
    return `opacity="${c.toFixed(3)}"`;
  });
}

// Une distance de jardin s'écrit en centimètres sous le mètre, en mètres au-delà.
function distance(cm) {
  if (!cm) return "";
  if (cm < 100) return `${cm} cm`;
  const m = cm / 100;
  return `${(m % 1 ? m.toFixed(1) : m.toFixed(0)).replace(".", ",")} m`;
}

/* Hauteur et écartement dans le même dessin. Les deux se mesurent à la même
   échelle : c'est ce qui rend la comparaison juste, un framboisier de deux
   mètres planté tous les cinquante centimètres se lit comme une haie, un
   pommier de six mètres tous les quatre mètres laisse voir le sol entre les
   pieds.

   La rangée occupe toute la largeur de la bande, avec autant de pieds que
   l'écartement en demande : trois pour un pommier, sept pour un framboisier,
   plus de cent pour un radis. Le pied du milieu porte la couleur de la plante,
   les autres restent en gris clair derrière, ils disent la densité sans
   disputer la lecture de la hauteur. */
function matureSVG(p) {
  if (!p.hmin || !p.hmax) return "";
  const W = 344, H = 104, G = 102, ZG = 104, ZD = 294;
  const hautMax = Math.max(p.hmax, 180) * 1.12;
  const y = cm => H - Math.min(H - 6, (cm / hautMax) * (H - 6));
  const cle = cleMotif(p), sp = MOTIF_SPAN[cle] || [20, 190];
  const lar = MOTIF_LARGE[cle] || [20, 180];
  const milieu = (p.hmin + p.hmax) / 2;
  const k = (H - y(milieu)) / (sp[1] - sp[0]);
  const aGauche = (100 - lar[0]) * k, aDroite = (lar[1] - 100) * k;
  const d = p.ecart ? p.ecart * (H - 6) / hautMax : 0;
  const cx = (ZG + ZD) / 2;
  /* Le nombre de voisins de chaque côté est celui qui remplit la bande jusqu'aux
     bords, un pied de plus que ce qu'elle contient en entier. Les deux pieds des
     extrémités sont coupés par le cadre, ce qui se lit comme une rangée qui
     continue, et c'est le cas. Le garde-fou de quatre-vingts ne sert qu'à borner
     le dessin si une donnée d'écartement devenait absurde : la fiche la plus
     dense du référentiel, le pois semé tous les trois centimètres, en demande
     soixante-seize. */
  const n = d > 0
    ? Math.min(80, Math.floor(((ZD - ZG) / 2 + Math.min(aGauche, aDroite)) / d)) : 0;
  // Nombre de dessins qui se recouvrent en un point, pour l'opacité de chacun.
  const couches = d > 0 ? Math.max(1, Math.round((aGauche + aDroite) / d)) : 1;
  const bas = n ? 32 : 16;
  const cote = distance(p.ecart);
  const s = [`<svg class="f-svg" viewBox="0 0 ${W} ${H + bas}" role="img" aria-label="Taille à maturité`
    + (n ? ` et écartement de ${cote}, ${2 * n + 1} pieds` : "") + `">`];
  /* Le motif n'est décrit qu'une fois et rappelé à chaque position : une rangée
     de radis pèserait sinon quatre-vingts kilo-octets de balises. */
  const idg = `tm-gris-${cle}`, idp = `tm-plante-${cle}`;
  const idc = `tm-cadre-${cle}`;
  s.push(`<defs><g id="${idg}">${densifie(MOTIF[cle], 1.8, couches)}</g>`
    + `<g id="${idp}">${densifie(MOTIF[cle], 2.8)}</g>`
    + `<clipPath id="${idc}"><rect x="${ZG}" y="0" width="${ZD - ZG}" height="${H}"/></clipPath>`
    + `</defs>`);
  const pied = (x, gris) =>
    `<use href="#${gris ? idg : idp}" class="${gris ? "tm-voisin" : "tm-pied"}" `
    + `transform="translate(${(x - 100 * k).toFixed(2)},${(H - sp[1] * k).toFixed(2)}) `
    + `scale(${k.toFixed(4)})" fill="${gris ? "var(--f-ink3)" : TEINTE.plant}"/>`;

  s.push(`<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="var(--f-ink3)" opacity=".45"/>`);
  const rangee = () => {
    if (!n) return;
    s.push(`<g clip-path="url(#${idc})">`);
    for (let i = n; i >= 1; i--) { s.push(pied(cx - i * d, true)); s.push(pied(cx + i * d, true)); }
    s.push(`</g>`);
  };

  /* Une plage étroite rapproche les deux cotes au point qu'elles se recouvrent :
     sur une laitue, dix centimètres séparent le bas du haut. Les deux traits
     restent, la cote devient une seule mention de la plage, calée sur le bord
     droit puisqu'elle est plus longue. */
  const yh = y(p.hmax), yb = y(p.hmin);
  const plage = p.hmin !== p.hmax && yb - yh < 13;
  const XD = plage ? 286 : 296;
  s.push(`<rect x="${G}" y="${yh.toFixed(1)}" width="${XD - G}" height="${(yb - yh).toFixed(1)}" fill="${TEINTE.plant}" opacity=".12"/>`);
  s.push(`<line x1="${G}" y1="${yh.toFixed(1)}" x2="${XD}" y2="${yh.toFixed(1)}" stroke="${TEINTE.plant}" stroke-width="2"/>`);
  if (p.hmin !== p.hmax) {
    s.push(`<line x1="${G}" y1="${yb.toFixed(1)}" x2="${XD}" y2="${yb.toFixed(1)}" stroke="${TEINTE.plant}" stroke-width="2" stroke-dasharray="4 3"/>`);
  }
  if (plage) {
    // L'unité n'est écrite qu'une fois quand les deux bornes la partagent.
    const bas1 = p.hmin < 100 === p.hmax < 100
      ? distance(p.hmin).replace(/ (cm|m)$/, "") : distance(p.hmin);
    s.push(`<text class="f-cote fort tm-plage" x="${W - 2}" y="${((yh + yb) / 2 + 4).toFixed(1)}" `
      + `text-anchor="end">${bas1} à ${distance(p.hmax)}</text>`);
  } else {
    s.push(`<text class="f-cote fort" x="304" y="${(yh + 4).toFixed(1)}">${distance(p.hmax)}</text>`);
    if (p.hmin !== p.hmax) {
      s.push(`<text class="f-cote" x="304" y="${(yb + 4).toFixed(1)}">${distance(p.hmin)}</text>`);
    }
  }
  /* La rangée passe après la bande de hauteur : sous elle, le lavis vert de la
     bande l'effaçait presque, et une rangée qu'on ne voit pas ne dit rien. */
  rangee();
  // silhouette humaine à l'échelle, 1,70 m
  const kh = (H - y(170)) / 100;
  s.push(`<g class="tm-humain" transform="translate(46,${(H - (H - y(170))).toFixed(2)}) scale(${kh.toFixed(4)})" fill="var(--f-ink3)"><path d="${CORPS_HUMAIN}"/></g>`);
  s.push(`<text class="f-cote" x="46" y="${(y(170) - 6).toFixed(1)}" text-anchor="middle">1,70 m</text>`);
  // motif de la plante, sommet calé sur le milieu de la plage
  s.push(pied(cx, false));

  if (n) {
    /* La cote se prend d'un pied à l'autre, sous le sol pour ne rien recouvrir.
       Sous douze points elle n'est plus qu'un trait entre deux crans collés,
       que l'oeil lit comme un défaut : la mention chiffrée la remplace, seule
       et centrée sous les pieds. */
    const yc = H + 12;
    if (d >= 12) {
      s.push(`<g class="tm-cote" stroke="var(--f-ink3)" opacity=".6">`
        + `<line x1="${cx.toFixed(1)}" y1="${yc}" x2="${(cx + d).toFixed(1)}" y2="${yc}"/>`
        + `<line x1="${cx.toFixed(1)}" y1="${yc - 3.5}" x2="${cx.toFixed(1)}" y2="${yc + 3.5}"/>`
        + `<line x1="${(cx + d).toFixed(1)}" y1="${yc - 3.5}" x2="${(cx + d).toFixed(1)}" y2="${yc + 3.5}"/></g>`);
    }
    const txt = `${cote} entre deux pieds`
      + (p.rang && p.rang !== p.ecart ? `, rangs à ${distance(p.rang)}` : "");
    const xt = Math.min(Math.max(cx + d / 2, 100), W - 100);
    s.push(`<text class="f-cote tm-ecart" x="${xt.toFixed(1)}" y="${yc + 15}" text-anchor="middle">${esc(txt)}</text>`);
  }
  return s.join("") + "</svg>";
}

function eauSVG(p, lignes) {
  const G = 102, W = 242, H = 92, hm = 72;
  const vals = [];
  for (let q = 1; q <= 24; q++) {
    const r = lignes.find(l => l.quinzaine === q);
    vals.push(r && r.litres_jour_m2 !== null ? Number(r.litres_jour_m2) : null);
  }
  const dispo = vals.filter(v => v !== null);
  if (!dispo.length) return "";
  const mx = Math.max(...dispo);
  const x = q => G + (q - 1) / 24 * W + W / 48;
  const y = v => H - (v / mx) * hm;
  const s = [`<svg class="f-svg" viewBox="0 0 ${G + W} ${H + 26}" role="img" aria-label="Besoin en eau">`];
  for (let m = 0; m < 12; m++) {
    const q = m * 2 + 1;
    s.push(`<line x1="${(G + (q - 1) / 24 * W).toFixed(1)}" y1="0" x2="${(G + (q - 1) / 24 * W).toFixed(1)}" y2="${H}" stroke="var(--f-grille)"/>`);
    if (m % 2 === 0) s.push(`<text class="f-tk" x="${x(q + 1).toFixed(1)}" y="${H + 14}" text-anchor="middle">${MOIS_ABR[m]}</text>`);
  }
  s.push(`<rect x="${(G + (demi - 1) / 24 * W).toFixed(1)}" y="0" width="${(W / 24).toFixed(1)}" height="${H}" fill="#14140f" opacity=".07"/>`);
  [G + (demi - 1) / 24 * W, G + demi / 24 * W].forEach(xb =>
    s.push(`<line x1="${xb.toFixed(1)}" y1="0" x2="${xb.toFixed(1)}" y2="${H}" stroke="var(--f-ink3)" stroke-width="1.2"/>`));
  s.push(`<line x1="0" y1="${H}" x2="${G + W}" y2="${H}" stroke="var(--f-ink3)" opacity=".45"/>`);

  let d = "", aire = "", debut = null, fin = null;
  vals.forEach((v, i) => {
    if (v === null) return;
    const q = i + 1;
    d += (d ? " L " : "M ") + x(q).toFixed(1) + " " + y(v).toFixed(1);
    if (debut === null) debut = q;
    fin = q;
  });
  if (debut !== null) {
    aire = `M ${x(debut).toFixed(1)} ${H} L ` + d.slice(2) + ` L ${x(fin).toFixed(1)} ${H} Z`;
    s.push(`<path d="${aire}" fill="${TEINTE.taille}" opacity=".14"/>`);
    s.push(`<path d="${d}" fill="none" stroke="${TEINTE.taille}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`);
  }
  const qp = vals.indexOf(mx) + 1;
  s.push(`<circle cx="${x(qp).toFixed(1)}" cy="${y(mx).toFixed(1)}" r="3.4" fill="${TEINTE.taille}"/>`);
  s.push(`<text class="f-tk" x="${G - 8}" y="${(H - hm - 9).toFixed(1)}" text-anchor="end">pic</text>`);
  s.push(`<text class="f-pic" x="${G - 8}" y="${(H - hm + 8).toFixed(1)}" text-anchor="end">`
    + `${mx.toFixed(1).replace(".", ",")} L</text>`);
  s.push(`<text class="f-tk" x="${G - 8}" y="${(H - hm + 22).toFixed(1)}" text-anchor="end">${demiTexte(qp)}</text>`);
  return s.join("") + "</svg>";
}

// Barre d'avancement dans la fenêtre du geste, repère à la quinzaine en cours.
function avancement(seg, teinte) {
  const [d, f] = seg;
  const total = ((f - d) % 24 + 24) % 24 + 1;
  const fait = ((demi - d) % 24 + 24) % 24 + 1;
  const pct = Math.max(4, Math.min(100, Math.round(fait / total * 100)));
  return `<div class="f-prog" style="color:${teinte}"><div class="f-track"><i style="width:${pct}%"></i>`
    + `<b style="left:${pct}%"></b></div>`
    + `<div class="f-bornes"><span>${demiTexte(d)}</span><span>${demiTexte(f)}</span></div></div>`;
}

function ficheMoment(p) {
  const h = [];
  const actives = [];
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k]) return;
    (segsDe(p, k) || []).forEach(t => { if (dansFenetre(demi, t[0], t[1])) actives.push({ k, t }); });
  });
  if (p.eauMode === "sans_arrosage" || (p.eauLignes && !p.eauLignes.length)) {
    h.push(`<div class="f-hero"><div class="f-lbl">Besoin en eau</div>`
      + `<div class="f-val"><span class="f-num">0</span><span class="f-unit">arrosage à prévoir</span></div>`
      + `<p class="f-note">Plante installée, aucun arrosage prévu</p></div>`);
  } else if (p.eauLignes && p.eauLignes.length) {
    const r = p.eauLignes.find(l => l.quinzaine === demi);
    const vals = p.eauLignes.map(l => Number(l.litres_jour_m2 || 0));
    const mx = Math.max(...vals, 0);
    if (r && r.litres_jour_m2) {
      const v = Number(r.litres_jour_m2);
      h.push(`<div class="f-hero"><div class="f-lbl">Besoin en eau aujourd'hui</div>`
        + `<div class="f-val"><span class="f-num">${v.toFixed(1).replace(".", ",")}</span>`
        + `<span class="f-unit">L par jour et par m²</span></div>`
        + `<p class="f-note">${mx ? Math.round(v / mx * 100) + " % du pic de l'année" : ""}</p></div>`);
    } else if (r && r.reprise_dose_litres) {
      h.push(`<div class="f-hero"><div class="f-lbl">Besoin en eau</div>`
        + `<div class="f-val"><span class="f-num">${Number(r.reprise_dose_litres).toFixed(0)}</span>`
        + `<span class="f-unit">L à la plantation</span></div>`
        + `<p class="f-note">Arrosage à la reprise seulement, tous les ${r.reprise_intervalle_jours || 10} jours la première saison</p></div>`);
    } else {
      h.push(`<div class="f-hero"><div class="f-lbl">Besoin en eau</div>`
        + `<div class="f-val"><span class="f-num">0</span><span class="f-unit">arrosage à prévoir</span></div>`
        + `<p class="f-note">Hors de la période où la plante demande de l'eau</p></div>`);
    }
  }

  actives.filter(a => ETATS_FICHE.indexOf(a.k) !== -1).forEach(a => {
    const [, cerne] = couleurAction(p, a.k);
    h.push(`<div class="f-etat"><span class="f-ai" style="color:${cerne}"><svg viewBox="0 0 20 20">${GLF[PHF[a.k][2]]}</svg></span>`
      + `<span class="f-et">${esc(phases[a.k].label)} en cours</span>`
      + `<span class="f-ed">${demiTexte(a.t[0])} à ${demiTexte(a.t[1])}</span></div>`);
  });

  const gestes = actives.filter(a => ETATS_FICHE.indexOf(a.k) === -1);
  if (gestes.length) {
    h.push('<div class="f-gestes">');
    gestes.forEach(a => {
      const t = texteAction(p, a.k), c = TEINTE[a.k];
      /* Le voisinage se décide au moment où l'on choisit la place, donc à la
         plantation et au semis en pleine terre. Il arrive là plutôt que de
         rester dans la liste d'attributs, que l'on ne consulte pas la bêche
         à la main. */
      const vois = VOISINAGE_AU_GESTE.indexOf(a.k) !== -1 && p.assoc ? p.assoc : "";
      h.push(`<div class="f-acte"><div class="f-ai" style="color:${c}"><svg viewBox="0 0 20 20">${GLF[PHF[a.k][2]]}</svg></div><div>`
        + `<h4>${esc(phases[a.k].label)}</h4>${avancement(a.t, c)}${t ? `<p>${marquerTermes(t)}</p>` : ""}`
        + (vois ? `<p class="f-vois"><span>Voisinage</span>${marquerTermes(vois)}</p>` : "")
        + `</div></div>`);
    });
    h.push("</div>");
  }
  if (!actives.length) h.push('<p class="f-vide">Rien à faire sur cette plante en ce moment.</p>');
  /* Ce qui a été masqué depuis le calendrier se rappelle ici, sur l'onglet qui
     dit ce qu'il y a à faire. Le rappel occupait une ligne sous la rangée du
     catalogue, où la mise en sourdine n'a pas d'objet. */
  const muettes = [...sourdines.keys()].filter(c => c.startsWith(p.id + "|")).length;
  if (muettes) h.push(`<button type="button" class="bascule-sourdine" data-lever="${esc(p.id)}">`
    + OEIL_BARRE + `<span>${muettes} tâche${muettes > 1 ? "s" : ""} masquée`
    + `${muettes > 1 ? "s" : ""}, réafficher</span></button>`);
  return h.join("");
}

function ficheAnnee(p) {
  const h = [];
  const seg = `<div class="f-seg"><button type="button" class="actif" data-forme="ruban">Ruban</button>`
    + `<button type="button" data-forme="roue">Roue</button></div>`;
  const clim = (climats[(jardinActif() || {}).climate_key] || {}).label;
  h.push(`<div class="f-carte"><div class="f-carte-tete"><h3>L'année de la plante`
    + (clim ? `<span class="f-sub">climat ${esc(clim.toLowerCase())}</span>` : "") + `</h3>${seg}</div>`
    + `<div class="f-forme f-ruban">${rubanSVG(p)}</div>`
    + `<div class="f-forme f-roue" hidden>${roueSVG(p)}</div>`);
  /* Le tableau des couleurs est rangé par dominance. Les deux premières sont
     nommées, une seule laissait croire à une glycine blanche. */
  const cs = (p.couleurs || []).slice(0, 2);
  const flo = (segsDe(p, "floraison") || [])[0];
  if (cs.length && flo) {
    const pastille = c => {
      const [rempli, cerne] = FLEUR[c] || FLEUR.rose;
      return `<i style="background:${rempli};border-color:${cerne}"></i>`;
    };
    h.push(`<p class="f-legende">${cs.map(pastille).join("")}<span>`
      + `Fleurs ${cs.map(c => esc(ADJ[c] || c)).join(" et ")}, `
      + `de ${demiTexte(flo[0])} à ${demiTexte(flo[1])}</span></p>`);
  }
  h.push("</div>");

  h.push(`<div class="f-carte f-eau"><div class="f-carte-tete"><h3>Besoin en eau`
    + `<span class="f-sub">L par jour et par m²</span></h3></div>`
    + `<div class="f-eau-corps"><p class="f-note">Lecture en cours.</p></div></div>`);

  if (p.pic) {
    h.push(`<div class="f-carte"><div class="f-carte-tete"><h3>Pic de floraison</h3></div>`
      + `<p class="f-txt">Le point marque le pic, ${demiTexte(p.pic)}.`
      + (p.picNote ? " " + esc(p.picNote) : "") + `</p></div>`);
  }
  return h.join("");
}

/* La taille à maturité dit ce que la plante est, non ce qu'elle fait au fil de
   l'année : elle a suivi l'identité. */
function ficheTaille(p) {
  const mat = matureSVG(p);
  return mat ? `<div class="f-carte"><div class="f-carte-tete"><h3>Taille à maturité</h3></div>${mat}</div>` : "";
}

/* Deux référentiels de nomenclature accompagnent chaque fiche. La vue ne rend
   un nom accepté que lorsque POWO et GBIF convergent vers le même, différent de
   celui d'usage : quand ils divergent, le cas est ouvert et rien n'est affirmé.
   Reste à écarter ici les rabattements de rang, où le nom rendu n'est que la
   forme moins précise de celui de la fiche. « Brassica oleracea » face à
   « Brassica oleracea var. capitata » ne dit rien qu'un jardinier veuille lire. */
const motsNom = n => String(n || "").toLowerCase()
  .replace(/\s+[×x]\s+/g, " ")
  .replace(/\b(var|subsp|ssp|f|cv)\.\s*/g, "")
  .trim().split(/\s+/).filter((m, i, t) => m && m !== t[i - 1]);

function nomAccepte(p) {
  const a = motsNom(p.nomAccepte), ici = motsNom(p.latin);
  if (!a.length || !ici.length) return "";
  // Le nom rendu est un préfixe du nôtre : le référentiel a rabattu le rang.
  if (a.every((m, i) => m === ici[i])) return "";
  // L'épithète répétée que rendent certains référentiels ne s'écrit qu'une fois.
  return String(p.nomAccepte).trim().split(/\s+/)
    .filter((m, i, t) => i === 0 || m.toLowerCase() !== t[i - 1].toLowerCase()).join(" ");
}

/* La jauge de gel donne déjà le seuil en degrés. La ligne de rusticité ne
   répète pas la classe : elle ne garde que la nuance qui suit, et ne reprend la
   classe entière que pour les plantes dont le seuil n'est pas renseigné. */
const CLASSES_RUSTICITE = ["Très rustique", "Moyennement rustique", "Assez rustique",
  "Peu rustique", "Rustique", "Très gélive", "Gélive", "Gélif"];

function nuanceRusticite(p) {
  const t = String((p.attr || {}).rusticite || "").trim();
  if (!t) return "";
  const c = CLASSES_RUSTICITE.find(x => t === x || t.startsWith(x + ","));
  if (!c) return t;
  const reste = t.slice(c.length).replace(/^,\s*/, "");
  if (reste) return reste.charAt(0).toUpperCase() + reste.slice(1);
  return (p.gel === null || p.gel === undefined) ? t : "";
}

/* Un bloc de couples clé et valeur. Un troisième élément porte le texte du
   conseil : il tient sous la valeur, à gauche comme elle, un paragraphe aligné
   à droite se lisant mal. Un bloc dont toutes les lignes sont vides ne paraît
   pas du tout. */
function blocFiche(titre, rows) {
  const c = rows.filter(r => r[1] || r[2]).map(r =>
    `<dt>${esc(r[0])}</dt><dd${r[2] ? ' class="avec-note"' : ""}>`
    + (r[1] ? marquerTermes(r[1]) : "")
    + (r[2] ? `<small class="kv-note">${marquerTermes(r[2])}</small>` : "")
    + `</dd>`).join("");
  return c ? `<section class="f-bloc"><h3>${esc(titre)}</h3><dl class="f-kv">${c}</dl></section>` : "";
}

function blocIdentite(p) {
  const a = p.attr || {};
  return blocFiche("Identité", [
    /* Pas de ligne Famille : l'entête écrit le nom latin suivi de la famille,
       et les 316 fiches actives portent toutes un nom latin. Les quatre sans
       nom latin sont désactivées et remplacées, l'application ne les charge
       pas. */
    ["Nom accepté", nomAccepte(p)],
    ["Cycle", a.type], ["Hauteur", a.hauteur],
    ["Écartement", p.espacement], ["Première récolte", a.recolte],
    ["Rusticité", nuanceRusticite(p)],
    // La planche du genre montre une plante voisine, pas celle de la fiche : la
    // provenance le dit plutôt que de laisser croire au portrait de l'espèce.
    ["Planche", creditPlanche(p)],
  ]);
}

function blocCulture(p) {
  const a = p.attr || {};
  return blocFiche("Culture", [
    ["Sol", a.sol], ["Eau", a.arrosage], ["Fertilité", a.fertilisation],
    ["Profondeur", p.prof], ["Pollinisation", a.pollinisation],
    // Cent douze plantes portent un conseil de multiplication sans période de
    // multiplication : sans cette ligne il ne serait affiché nulle part.
    ["Multiplication", a.multiplication, p.guide.multiplication || ""],
  ]);
}

/* Ce que la plante apporte : nectar, parfum, feuillage, usage, voisinage. Ce
   sont des caractères et non des gestes, le bloc ouvre donc l'onglet de
   l'identité, juste sous les photographies. Il s'appelait Au jardin, nom repris
   par l'onglet qui porte ce que le jardinier a saisi sur sa propre plante. */
function blocInteret(p) {
  const a = p.attr || {};
  // La couleur de fleur n'a pas de ligne ici : la légende du ruban la nomme
  // déjà, avec sa fenêtre de floraison et ses pastilles.
  return blocFiche("Intérêt", [
    ["Nectar", a.mellifere], ["Parfum", a.parfum],
    ["Feuillage", a.feuillage],
    /* Une seule ligne d'usage. La note sourcée est la formulation lisible,
       « Tiges confites, liqueur » là où la clé ne dit que culinaire ; les
       libellés du vocabulaire servent de repli quand elle manque. Les deux
       ensemble ne feraient que se répéter. */
    ["Usage", a.usage_note || a.usage],
    /* Le voisinage ne porte plus que ce qu'une source établit, association
       comme antagonisme. Les mentions d'emplacement ont rejoint l'usage et
       les associations de tradition ont été retirées. */
    ["Voisinage", p.assoc],
  ]);
}

function ficheHTML(p, voulu) {
  const ad = adapt[p.id];
  const tox = p.attr.toxicite && !/^non toxique/i.test(p.attr.toxicite);
  /* La fiche s'ouvre sur ce qu'on est venu y chercher. Pour une plante du
     jardin, ce qu'il y a à faire cette quinzaine. Pour une plante du catalogue
     qu'on découvre, ce qu'elle est. Ouverte depuis un espace ou une zone, elle
     s'ouvre sur son placement : on regardait déjà où les choses sont. */
  const defaut = sel.has(p.id) ? "moment" : "identite";
  const ouvre = voulu === "jardin" && !sel.has(p.id) ? defaut : (voulu || defaut);
  return `<div class="fiche-v2">
    <div class="f-entete">${motifFiche(p)}
      ${/* Le type n'a plus de pastille : la liste d'où l'on vient le dit. */
        ad ? `<div class="f-chips"><span class="f-chip">${esc(NIVEAUX[ad.level].court)} sous ce climat</span></div>` : ""}
      ${jaugesFiche(p)}
      ${tox ? `<p class="f-tox"><span aria-hidden="true">&#9670;</span>${esc(p.attr.toxicite)}</p>` : ""}
      ${p.conseil ? `<p class="f-intro">${marquerTermes(p.conseil)}</p>` : ""}
    </div>
    <div class="f-onglets" role="tablist">${
      /* Quatre onglets tiennent mal sur un téléphone : celui du jardin ne
         paraît que pour une plante cultivée, la seule qui ait des placements
         et un journal. */
      ["moment,En ce moment", "annee,Toute l'année", "identite,Identité"]
        .concat(sel.has(p.id) ? ["jardin,Au jardin"] : []).map(x => {
        const [cle, nom] = x.split(",");
        return `<button type="button" role="tab" class="${cle === ouvre ? "actif" : ""}" `
          + `aria-selected="${cle === ouvre}" data-pan="${cle}">${nom}</button>`;
      }).join("")}
    </div>
    <div class="f-pan f-pan-moment" role="tabpanel" data-pan="moment"${
      ouvre === "moment" ? "" : " hidden"}>${ficheMoment(p)}</div>
    <div class="f-pan f-pan-annee" role="tabpanel" data-pan="annee"${
      ouvre === "annee" ? "" : " hidden"}>${ficheAnnee(p)}${blocCulture(p)}</div>
    <div class="f-pan f-pan-identite" role="tabpanel" data-pan="identite"${
      ouvre === "identite" ? "" : " hidden"}>${
      `<section class="f-photos" id="fPhotos" data-plante="${esc(p.id)}" hidden></section>`
      }${blocInteret(p)}${ficheTaille(p)}${blocIdentite(p)}</div>
    ${sel.has(p.id) ? `<div class="f-pan f-pan-jardin" role="tabpanel" data-pan="jardin"${
      ouvre === "jardin" ? "" : " hidden"}></div>` : ""}
  </div>`;
}

/* ================== Bandeau du jour ==================
   La pastille météo et trois tuiles, l'eau, la lumière et la saison, chacune
   ouvrant une feuille de détail. La météo vient des modèles de Météo-France servis par Open-Meteo,
   le lieu de la Base Adresse Nationale, l'évapotranspiration est celle du
   bulletin FAO 56 calculée au point du jardin. */

const METEO_CACHE = "monjardin.meteo.v5";
const METEO_TTL = 3600 * 1000;   // une heure, la prévision ne bouge pas plus vite
/* Le cache tombe aussi au changement d'heure, sans attendre que l'heure pleine
   soit écoulée. Une charge prise à 23 h 55 tenait sinon jusqu'à 0 h 55, et un
   run arrivé entre-temps ne se voyait pas. */
const heureCle = () => new Date().toISOString().slice(0, 13);

/* AROME par-dessus la sélection automatique. Le modèle n'est pas choisi de la
   même façon par tous : Open-Meteo dit retenir « le modèle applicable de plus
   haute résolution », sans garantir AROME sur la France, et un ticket de son
   dépôt signale ICON-D2, le modèle allemand, retenu pour Paris. Un soir d'août
   orageux, l'application ne portait aucune pluie quand Météo France et
   Pleinchamp en donnaient deux à trois millimètres dans l'heure qui suivait.

   AROME France HD tient la France à 1,5 km de maille sur deux jours, ce que
   demande exactement la charge horaire. Il ne remplace pas la série de
   secours, il se pose dessus : toutes les grandeurs ne lui sont pas connues,
   l'indice UV est dérivé et peut revenir vide, et une colonne entièrement vide
   laisserait une voie muette. Le repli se fait donc grandeur par grandeur, puis
   heure par heure. */
function fondreHoraire(fond, dessus) {
  if (!fond || !fond.time || !dessus || !Array.isArray(dessus.time)) return fond;
  const rang = new Map(dessus.time.map((t, i) => [t, i]));
  /* Quelles colonnes viennent d'AROME. La question n'était pas vérifiable de
     l'extérieur, le chemin de l'API étant fermé aux robots : l'application la
     tranche donc elle-même, à chaque charge, et le dit là où deux tracés d'une
     même voie n'auraient pas la même origine. */
  const venues = [];
  const out = { time: fond.time, aromeColonnes: venues };
  Object.keys(fond).forEach(c => {
    const src = dessus[c];
    if (c === "time" || c === "aromeColonnes" || !Array.isArray(fond[c])) {
      out[c] = fond[c]; return;
    }
    if (!Array.isArray(src) || src.every(v => v === null || v === undefined)) {
      out[c] = fond[c];
      return;
    }
    venues.push(c);
    out[c] = fond[c].map((v, i) => {
      const j = rang.get(fond.time[i]);
      const w = j === undefined ? null : src[j];
      return w === null || w === undefined ? v : w;
    });
  });
  return out;
}

// Codes de temps sensible de l'Organisation météorologique mondiale.
const TEMPS = [
  [[0], "Ciel clair", "soleil"], [[1, 2], "Éclaircies", "soleil_nuage"],
  [[3], "Couvert", "nuage"], [[45, 48], "Brouillard", "brume"],
  [[51, 53, 55, 56, 57], "Bruine", "pluie"], [[61, 63, 65, 66, 67], "Pluie", "pluie"],
  [[71, 73, 75, 77, 85, 86], "Neige", "neige"], [[80, 81, 82], "Averses", "averse"],
  [[95, 96, 99], "Orage", "orage"],
];
const tempsDe = c => (TEMPS.find(t => t[0].indexOf(c) !== -1) || [[], "Temps variable", "nuage"]);

const GM = {
  soleil: '<circle cx="12" cy="12" r="4.6"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22'
    + 'M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M19.1 4.9l-1.9 1.9M6.8 17.2l-1.9 1.9"/>',
  soleil_nuage: '<circle cx="9" cy="9" r="3.4"/><path d="M9 2.6v1.8M2.6 9h1.8M4.8 4.8l1.3 1.3M13.2 4.8l-1.3 1.3"/>'
    + '<path d="M8.4 19.4h9.2a3.6 3.6 0 0 0 .3-7.2 5 5 0 0 0-9.6 1.2 3 3 0 0 0 .1 6z"/>',
  nuage: '<path d="M7.4 19.4h9.2a3.8 3.8 0 0 0 .3-7.6 5.3 5.3 0 0 0-10.1 1.3 3.2 3.2 0 0 0 .6 6.3z"/>',
  brume: '<path d="M7.4 15.4h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 9.1a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M4 18.6h16M6.5 21.4h11"/>',
  pluie: '<path d="M7.4 15h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 8.7a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M9 18.4l-.9 2.6M13 18.4l-.9 2.6M17 18.4l-.9 2.6"/>',
  averse: '<path d="M7.4 14.2h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 7.9a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M9.4 17.4l-1.2 3.4M13.4 17.4l-1.2 3.4"/><path d="M17.4 17.4l-2.6 2.4h2.6l-2.6 2"/>',
  orage: '<path d="M7.4 13.6h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 7.3a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M13.4 16l-3.4 4.2h3l-2 3.4" stroke-linejoin="round"/>',
  neige: '<path d="M7.4 14.6h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 8.3a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M9 18v3.4M7.4 18.9l3.2 1.6M10.6 18.9l-3.2 1.6M16 18v3.4M14.4 18.9l3.2 1.6M17.6 18.9l-3.2 1.6"/>',
  goutte: '<path d="M12 3.4c4.2 4.8 6.6 8.2 6.6 11.2a6.6 6.6 0 0 1-13.2 0c0-3 2.4-6.4 6.6-11.2z"/>',
  coche: '<path d="M4.6 12.6l4.6 4.6L19.4 7" stroke-linejoin="round"/>',
  arc: '<path d="M3 18h18"/><path d="M6.2 18a5.8 5.8 0 0 1 11.6 0"/><path d="M12 6.4V4M5.2 9.2L3.6 7.6M18.8 9.2l1.6-1.6"/>',
  feuille: '<path d="M20 4c0 9-5.4 14-12 14-1.4 0-2.6-.2-3.6-.6C5.6 9.6 11.4 4.6 20 4z"/>'
    + '<path d="M4 21c1.6-4.6 4.4-8.2 8.4-10.8"/>',
  alerte: '<path d="M12 3.6 21.4 20H2.6z" stroke-linejoin="round"/><path d="M12 9.6v4.6M12 17.2v.1"/>',
  vent: '<path d="M3 8.4h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17.6h8"/>',
  lune: '<path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8z"/>',
  lune_nuage: '<path d="M12.9 9.1A5 5 0 0 1 6.5 2.7a5 5 0 1 0 6.4 6.4z"/>'
    + '<path d="M8.4 19.4h9.2a3.6 3.6 0 0 0 .3-7.2 5 5 0 0 0-9.6 1.2 3 3 0 0 0 .1 6z"/>',
};
/* Le ciel clair et les éclaircies ne se dessinent pas de la même façon selon
   l'heure : un soleil sur une nuit se lit comme une erreur. */
const icoCiel = (code, jour) => {
  const n = tempsDe(code)[2];
  if (jour) return n;
  return n === "soleil" ? "lune" : n === "soleil_nuage" ? "lune_nuage" : n;
};
const icoM = (n, cls) => `<svg class="${cls || "bd-ic"}" viewBox="0 0 24 24" aria-hidden="true" `
  + `fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${GM[n] || ""}</svg>`;

let meteo = null;      // charge brute, telle que rendue par le service

/* L'heure de la charge en mémoire. La feuille promet une relecture toutes les
   heures : le cache la permettait, rien ne la déclenchait. */
let heureCharge = null;

/* Une réponse à plusieurs modèles porte ses colonnes suffixées du nom du
   modèle, une réponse à un seul les porte nues. Les modèles sont demandés du
   plus fin au plus grossier ; la fonction rend les séries dans l'ordre inverse
   de celui de la demande, du plus grossier au plus fin. La superposition les
   applique ensuite dans l'ordre reçu, si bien que le plus fin passe en dernier
   et l'emporte. */
function separerModeles(brut, modeles) {
  const suffixes = modeles.map(m => "_" + m);
  const nu = Object.keys(brut).some(c => c !== "time"
    && !suffixes.some(x => c.endsWith(x)));
  if (nu) return [brut];
  const series = modeles.map(m => {
    const suf = "_" + m;
    const out = { time: brut.time };
    let porte = false;
    Object.keys(brut).forEach(c => {
      if (c === "time" || !c.endsWith(suf)) return;
      out[c.slice(0, -suf.length)] = brut[c];
      porte = true;
    });
    return porte ? out : null;
  }).filter(Boolean);
  return series.reverse();
}

/* La dernière série horaire connue, reprise du cache quand la requête échoue.
   Elle ne sert que si elle couvre encore l'heure en cours : une série de la
   veille rendrait une fenêtre entièrement passée. */
function horaireRepris(cle) {
  try {
    const c = JSON.parse(localStorage.getItem(METEO_CACHE) || "null");
    if (!c || c.cle !== cle || !c.d || !c.d.hourly) return null;
    const d = new Date();
    const heure = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
      + "-" + String(d.getDate()).padStart(2, "0")
      + "T" + String(d.getHours()).padStart(2, "0") + ":00";
    return c.d.hourly.time.indexOf(heure) >= 0 ? c.d.hourly : null;
  } catch (e) { return null; }
}

async function lireMeteo(g) {
  if (!g || g.lat === null || g.lat === undefined) { meteo = null; return; }
  const cle = `${g.lat},${g.lon}`;
  try {
    const c = JSON.parse(localStorage.getItem(METEO_CACHE) || "null");
    if (c && c.cle === cle && c.h === heureCle() && Date.now() - c.t < METEO_TTL) {
      meteo = c.d; heureCharge = c.h; return;
    }
  } catch (e) { /* cache indisponible */ }
  // Le quotidien garde la sélection automatique : elle seule couvre les sept
  // jours, là où AROME s'arrête à deux.
  const base = "https://api.open-meteo.com/v1/forecast?latitude=" + g.lat + "&longitude=" + g.lon
    + "&timezone=Europe%2FParis";
  // Trente jours d'antériorité : le bilan hydrique a besoin d'une mise en route
  // assez longue pour que l'état initial du réservoir ne pèse plus sur le résultat.
  const u = base
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,"
    + "precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,"
    + "sunrise,sunset,daylight_duration"
    + "&past_days=30&forecast_days=7";
  // L'heure en cours dans un appel séparé : le quotidien porte le maximum du jour,
  // qui n'est pas ce qu'il fait dehors quand on ouvre l'application le soir.
  /* Deux jours d'horaire : la feuille du temps lit vingt-quatre heures à partir
     de l'heure en cours, elle traverse donc minuit. Quatorze grandeurs pour une
     seule requête, environ neuf kilo-octets, mise en cache une heure comme le
     reste. */
  const uh = base + "&hourly=temperature_2m,apparent_temperature,dew_point_2m,"
    + "relative_humidity_2m,precipitation,precipitation_probability,weather_code,"
    + "cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,"
    + "uv_index,is_day&forecast_days=2";
  /* Deux modèles de Météo-France, non un seul. AROME France HD tient la maille
     la plus fine, 1,5 km, mais sa documentation le dit : « AROME France HD a la
     même zone, à plus haute résolution, avec une sélection réduite de variables
     météorologiques ». Les grandeurs qu'il ne porte pas retombaient donc sur la
     sélection automatique, c'est-à-dire possiblement sur un modèle allemand ou
     sur ARPEGE à onze kilomètres, alors qu'AROME France les publie à 2,5 km.

     Les deux sont demandés dans un seul appel, ce qui ne coûte pas de requête de
     plus : la superposition se fait du plus fin au plus grossier, HD d'abord,
     AROME France ensuite, la sélection automatique en dernier ressort. Hors de
     la zone française les deux se taisent et la sélection automatique porte
     tout, sans rien de particulier à prévoir. */
  const AROME = ["meteofrance_arome_france_hd", "meteofrance_arome_france"];
  const ua = uh + "&models=" + AROME.join(",");
  /* Trois requêtes partaient de front. Sur un réseau à une barre, une seule qui
     échoue suffisait à vider la feuille : le quotidien arrivait, l'horaire non,
     et l'application annonçait « la prévision heure par heure n'est pas
     disponible pour ce jardin », ce qui accusait le jardin d'un incident de
     réseau. Depuis que le bandeau, la table, les alertes et le bilan lisent tous
     la série horaire, cette perte se voit partout.

     L'horaire est donc réessayé une fois, AROME part après le premier couple
     plutôt qu'avec lui, et une série qui manque est reprise de la dernière
     charge connue tant qu'elle couvre l'heure en cours. */
  const prendre = async (url, essais) => {
    for (let k = 0; k <= essais; k++) {
      try {
        const r = await fetch(url);
        if (r.ok) return await r.json();
      } catch (e) { /* réseau indisponible, on retente */ }
    }
    return null;
  };
  try {
    const [r, h] = await Promise.all([fetch(u), prendre(uh, 1)]);
    if (!r.ok) throw new Error(r.status);
    meteo = await r.json();
    if (h && h.hourly) meteo.hourly = h.hourly;
    else meteo.hourly = horaireRepris(cle);
    /* La série de secours est gardée entière à côté de la série fondue : c'est
       elle qui permet de dire, plus tard, que les deux modèles ne s'accordent
       pas sur la pluie. */
    meteo.horaireSecours = meteo.hourly || null;
    /* AROME absent, en panne ou muet : la série de secours reste seule, et
       l'application rend ce qu'elle rendait avant. */
    if (meteo.hourly) {
      const av = h && h.hourly ? await prendre(ua, 0) : null;
      if (av && av.hourly) {
        /* Le service suffixe les colonnes du nom du modèle quand plusieurs sont
           demandés, et les laisse nues quand un seul répond. Les deux formes
           sont acceptées : la réponse réelle n'est pas observable d'ici, le
           chemin de l'API étant fermé aux robots. */
        separerModeles(av.hourly, AROME).forEach(serie => {
          meteo.hourly = fondreHoraire(meteo.hourly, serie);
        });
      }
    }
    heureCharge = heureCle();
    localStorage.setItem(METEO_CACHE,
      JSON.stringify({ cle, t: Date.now(), h: heureCle(), d: meteo }));
  } catch (e) { meteo = null; }
}

/* La date du jour, en heure locale. Le quotidien la lisait en temps universel
   quand l'horaire la lisait en heure locale : entre minuit et deux heures l'été,
   les deux séries ne désignaient pas le même jour. Toute la journée reculait
   alors d'un cran, le bandeau donnait les extrêmes de la veille, la table de la
   semaine intitulait « aujourd'hui » la journée écoulée, et un relevé de
   pluviomètre saisi à minuit et demi s'enregistrait sur la veille. */
const cleJour = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
  + "-" + String(d.getDate()).padStart(2, "0");

// Index du jour dans la série, trente jours de passé précèdent aujourd'hui.
const iJour = () => (meteo ? meteo.daily.time.indexOf(cleJour(new Date())) : -1);


// Index de l'heure en cours dans la série horaire, quand elle est disponible.
const iHeure = () => {
  if (!meteo || !meteo.hourly) return -1;
  const d = new Date();
  return meteo.hourly.time.indexOf(
    cleJour(d) + "T" + String(d.getHours()).padStart(2, "0") + ":00");
};

/* ---------- Le fond vivant ----------
   Trois choses le règlent. La saison donne les couleurs des taches qui
   dérivent, le ton du fond et ce qui tombe : des feuilles tendres et des
   pétales au printemps, des feuilles vertes en été, rousses en automne, des
   flocons en hiver. L'heure pose une lumière, dorée le matin, rosée le soir,
   bleutée la nuit. La météo du jour pose un voile, gris par temps de pluie,
   blanc par gel, et la neige fait tomber des flocons en toute saison. */
const AMBIANCES = {
  printemps: { base: "#EEF3E6", taches: ["#CFE6B0", "#F5D3DF", "#F3E8A6", "#BFDCCF", "#E3EFC9"],
               chute: ["#9CC77A", "#F2B8CC", "#B9D98F"], branche: "rgba(76,140,63,.28)" },
  ete:       { base: "#EEF1E3", taches: ["#D7E6A9", "#F4DD95", "#B6D7C6", "#E9E2A8", "#A9CBA9"],
               chute: ["#7BA05B", "#9DBB7A", "#5E8A4A"], branche: "rgba(76,140,63,.30)" },
  automne:   { base: "#F3ECE1", taches: ["#F2C28E", "#E7A98C", "#E9D49A", "#C9B58E", "#DDB7A0"],
               chute: ["#D9822B", "#B5542E", "#C99A35", "#8E5B2F"], branche: "rgba(120,80,50,.28)" },
  hiver:     { base: "#EAEFF2", taches: ["#CCD9E3", "#E1E8EC", "#BFD0CC", "#E3E0EC", "#D3DFE3"],
               chute: ["#FFFFFF", "#E8F0F5"], branche: "rgba(70,90,100,.24)", flocons: true },
};
// Mars à mai, juin à août, septembre à novembre, décembre à février.
const saisonDe = q => (q >= 5 && q <= 10 ? "printemps" : q >= 11 && q <= 16 ? "ete"
  : q >= 17 && q <= 22 ? "automne" : "hiver");
const LUMIERES = { matin: "rgba(255,214,140,.16)", jour: "rgba(255,255,255,0)",
                   soir: "rgba(240,150,120,.16)", nuit: "rgba(40,60,90,.18)" };
const VOILES = { pluie: "rgba(120,140,160,.16)", gel: "rgba(232,240,248,.30)",
                 neige: "rgba(240,244,248,.30)", couvert: "rgba(150,160,165,.08)", clair: "rgba(255,255,255,0)" };
let ambianceDite = "";

/* ---------- Le jardin vivant ----------
   Fond par défaut depuis le 17 octobre 2026 : un paysage de jardin peint sur
   une toile. Le ciel suit la hauteur réelle du soleil au point du jardin, la
   lune traverse la nuit et éclaire le décor, la prévision de l'heure pose les
   nuages, la pluie, la neige ou le brouillard, et son vent balance la
   végétation. La saison change les arbres, les massifs, l'eau et ce qui tombe.

   Depuis le 18 octobre, il se peint en trois styles, chacun avec son propre
   décor : le moderne et le brutaliste, redessinés d'après les planches de
   Jérôme, et l'estampe, dont le décor suit le climat du jardin ou se choisit
   parmi sept. Le fond « Feuillage », celui des taches et des feuilles, et un
   fond uni restent au choix dans les réglages du compte. */
const FOND = "monjardin.fond";
const FONDS_ECRAN = {
  jardin: ["Jardin vivant", "Un paysage de jardin qui suit le soleil et la lune, le temps de l'heure et la saison."],
  feuillage: ["Feuillage", "Des taches de couleur et des feuilles qui tombent, aux teintes de la saison."],
  uni: ["Uni", "Un fond sans mouvement, au ton de la saison."],
};
let choixFond = (() => {
  try { const v = localStorage.getItem(FOND); return FONDS_ECRAN[v] ? v : "jardin"; }
  catch (e) { return "jardin"; }
})();
const STYLE_JARDIN = "monjardin.style";
const DECOR_JARDIN = "monjardin.decor";
const STYLES_JARDIN = ["moderne", "brutaliste", "estampe"];
let choixStyle = (() => {
  try { const v = localStorage.getItem(STYLE_JARDIN); return STYLES_JARDIN.indexOf(v) !== -1 ? v : "moderne"; }
  catch (e) { return "moderne"; }
})();
let choixDecor = (() => {
  try { return localStorage.getItem(DECOR_JARDIN) || "climat"; }
  catch (e) { return "climat"; }
})();

const jvHex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const jvMel = (a, b, t) => {
  const x = jvHex(a), y = jvHex(b);
  return "#" + x.map((v, i) => Math.round(Math.max(0, Math.min(255, v + (y[i] - v) * t)))
    .toString(16).padStart(2, "0")).join("");
};
const jvBorne = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));
const jvAlea = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const jvRgba = (c, a) => { const [r, g, b] = jvHex(c); return `rgba(${r},${g},${b},${Math.max(0, a).toFixed(3)})`; };
// Lavis sourds, comme un papier teinté : indigo la nuit, kaki à l'aube, papier clair le jour.
const JV_CIELS = { nuit: ["#151B2A", "#28304A"], aube: ["#56607A", "#E6C6A2"],
  jour: ["#BFCBCC", "#ECE7DA"], soir: ["#474A66", "#DDA184"] };
// Ce que chaque ciel de l'heure pose : nuages en bandes, voile couvert, pluie, neige, brume, éclairs.
const JV_TEMPS = {
  clair:      { cumulus: 0.2, nappe: 0, pluie: 0, neige: 0, brume: 0.15, orage: 0 },
  nuageux:    { cumulus: 0.9, nappe: 0.15, pluie: 0, neige: 0, brume: 0.25, orage: 0 },
  couvert:    { cumulus: 0.6, nappe: 0.9, pluie: 0, neige: 0, brume: 0.35, orage: 0 },
  pluie:      { cumulus: 0.5, nappe: 0.85, pluie: 1, neige: 0, brume: 0.4, orage: 0 },
  orage:      { cumulus: 0.6, nappe: 1, pluie: 1.6, neige: 0, brume: 0.2, orage: 1 },
  neige:      { cumulus: 0.3, nappe: 0.8, pluie: 0, neige: 1, brume: 0.45, orage: 0 },
  brouillard: { cumulus: 0, nappe: 0.35, pluie: 0, neige: 0, brume: 1, orage: 0 },
};

function cielDuJardin(h, montant) {
  const C = JV_CIELS, lever = montant ? C.aube : C.soir;
  let p;
  if (h <= -12) p = C.nuit;
  else if (h < 2) { const t = (h + 12) / 14; p = [jvMel(C.nuit[0], lever[0], t), jvMel(C.nuit[1], lever[1], t)]; }
  else if (h < 20) { const t = (h - 2) / 18; p = [jvMel(lever[0], C.jour[0], t), jvMel(lever[1], C.jour[1], t)]; }
  else p = C.jour;
  return { haut: p[0], bas: p[1], nuit: jvBorne(-h, 2, 12), jour: jvBorne(h, -4, 6),
           chaud: jvBorne(25 - h, 0, 25) * jvBorne(h, -6, 2) };
}

// Une branche, tracée une fois, qui retombe du coin haut droit.
function genBranche(W) {
  const segs = [];
  const pousse = (x, y, ang, len, ep, d, g) => {
    const a = ang + (jvAlea(g) - 0.5) * 0.3;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const pli = (jvAlea(g + 1) - 0.5) * len * 0.25;
    segs.push({ x, y, x2, y2, cx: (x + x2) / 2 - Math.sin(a) * pli, cy: (y + y2) / 2 + Math.cos(a) * pli, ep, d, g });
    if (d >= 5) return;
    pousse(x2, y2, a - 0.3 + (jvAlea(g + 2) - 0.5) * 0.3, len * 0.74, ep * 0.66, d + 1, g * 2 + 1);
    if (d < 3 || jvAlea(g + 3) > 0.3) {
      pousse(x2, y2, a + 0.5 + (jvAlea(g + 4) - 0.5) * 0.4, len * (0.5 + jvAlea(g + 5) * 0.2), ep * 0.55, d + 1, g * 2 + 2);
    }
  };
  // Assez courte pour laisser lisibles le nom du jardin, la date et les titres d'écran.
  pousse(W + 8, 22, Math.PI * 0.87, 60, 10, 0, 1);
  pousse(W + 8, 90, Math.PI * 0.97, 42, 5.5, 1, 61);
  return segs;
}

function jvCapsule(x, x0, y0, w, h) {
  const r = h / 2;
  x.beginPath(); x.moveTo(x0 + r, y0); x.lineTo(x0 + w - r, y0);
  x.arc(x0 + w - r, y0 + r, r, -Math.PI / 2, Math.PI / 2); x.lineTo(x0 + r, y0 + h);
  x.arc(x0 + r, y0 + r, r, Math.PI / 2, Math.PI * 1.5); x.fill();
}
function jvMomiji(x, cx, cy, r, rot) {
  x.beginPath();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? r * 0.42 : r, a = rot + k * Math.PI / 5 - Math.PI / 2;
    x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  x.closePath(); x.fill();
}
const jvRond = (x, cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
const jvOvale = (x, cx, cy, rx, ry, rot) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, 7); x.fill(); };
const jvTrait = (x, a, b, c, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
function jvFleur(x, cx, cy, r, couleur, coeur) {
  x.fillStyle = couleur;
  for (let p = 0; p < 5; p++) jvRond(x, cx + Math.cos(p * 1.257) * r * 1.2, cy + Math.sin(p * 1.257) * r * 1.2, r);
  if (coeur) { x.fillStyle = coeur; jvRond(x, cx, cy, r * 0.45); }
}

/* ---------- Pièces de décor communes aux thèmes ---------- */
function jvBrume(x, e, y, ep, a) {
  const bg = x.createLinearGradient(0, y - ep, 0, y + ep);
  bg.addColorStop(0, jvRgba(e.bas, 0)); bg.addColorStop(0.5, jvRgba(e.bas, a)); bg.addColorStop(1, jvRgba(e.bas, 0));
  x.fillStyle = bg; x.fillRect(0, y - ep, e.W, ep * 2);
}
// Une ligne de crête ondulée, remplie jusqu'au bas de l'écran.
function jvCrete(x, e, y, amp, f, ph, couleur) {
  x.fillStyle = couleur;
  x.beginPath(); x.moveTo(0, e.H);
  for (let i = 0; i <= 40; i++) {
    const xn = i / 40;
    x.lineTo(xn * e.W, y - Math.sin(xn * f + ph) * amp - Math.sin(xn * f * 2.3 + ph * 2) * amp * 0.3);
  }
  x.lineTo(e.W, e.H); x.fill();
}
// Le sol du jardin, givré par gel, enneigé l'hiver.
function jvSol(x, e, terre, y) {
  const t0 = e.gel && !e.neigeux ? jvMel(terre, "#E4E8EA", 0.35) : terre;
  const gs = x.createLinearGradient(0, y, 0, e.H);
  gs.addColorStop(0, e.ombre(t0)); gs.addColorStop(1, e.ombre(jvMel(t0, "#283028", 0.4)));
  x.fillStyle = gs; x.fillRect(0, y, e.W, e.H - y);
  if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, e.m.neige ? 0.8 : 0.5); x.fillRect(0, y, e.W, 18); }
}
// Une fenêtre, allumée à la tombée du jour pour une part des maisons.
function jvFenetre(x, e, fx, fy, w, h, k) {
  const allume = e.allume * (jvAlea(k * 7.3) > 0.3 ? 1 : 0);
  x.fillStyle = allume > 0.05 ? jvMel(e.ombre("#4E5862"), "#F4C46A", allume) : e.ombre("#4E5862");
  x.fillRect(fx, fy, w, h);
  if (allume > 0.3) {
    const g = x.createRadialGradient(fx + w / 2, fy + h / 2, 1, fx + w / 2, fy + h / 2, w * 2.4);
    g.addColorStop(0, `rgba(246,196,106,${(0.3 * allume).toFixed(2)})`); g.addColorStop(1, "rgba(246,196,106,0)");
    x.fillStyle = g; x.fillRect(fx - w * 2, fy - w * 2, w * 5, h + w * 4);
  }
}
// La fumée d'une cheminée, par temps frais ou le soir, poussée par le vent.
function jvFumee(x, e, cx, cy) {
  if (e.nomS === "ete" && e.c.nuit < 0.3) return;
  for (let i = 0; i < 7; i++) {
    const ph = (e.t * 0.1 + i / 7) % 1;
    const px = cx + ph * (20 + e.vent * 1.6) + Math.sin(e.t * 0.8 + i) * 3, py = cy - ph * 70;
    x.fillStyle = jvRgba(e.c.nuit > 0.5 ? "#8E96A8" : "#E6E4DE", 0.38 * (1 - ph));
    jvRond(x, px, py, 3 + ph * 11);
  }
}
// Un arbre à couronne ronde : en fleur, en feuilles, en fruits, ou nu.
function jvArbre(x, e, px, py, k, couleurs, fruit, sol) {
  const bal = Math.sin(e.t * e.souffle * 0.6 + px) * e.vent * 0.05 * k;
  x.strokeStyle = e.ombre("#4E3E30"); x.lineCap = "round"; x.lineWidth = 6 * k;
  x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px - 4 * k, py - 40 * k, px + bal * 0.5, py - 66 * k); x.stroke();
  x.lineWidth = 2.6 * k;
  const br = [[-34, -96], [30, -100], [-6, -118], [40, -78], [-40, -74]];
  br.forEach(([dx, dy]) => {
    x.beginPath(); x.moveTo(px + bal * 0.5, py - 62 * k);
    x.quadraticCurveTo(px + dx * 0.4 * k, py + dy * 0.75 * k, px + dx * k + bal, py + dy * k); x.stroke();
  });
  if (couleurs) {
    for (let i = 0; i < 16; i++) {
      const a = jvAlea(i * 5 + 3 + px) * Math.PI * 2, d = 0.3 + jvAlea(i * 7 + px) * 0.7;
      x.fillStyle = e.ombre(couleurs[i % couleurs.length]);
      jvRond(x, px + bal + (Math.cos(a) * 42 * d + Math.sin(e.t * e.souffle + i) * e.vent * 0.03) * k,
        py + (-96 + Math.sin(a) * 26 * d) * k, (13 + (i % 3) * 3) * k);
    }
    if (fruit) {
      x.fillStyle = e.ombre(fruit);
      for (let i = 0; i < 7; i++) jvRond(x, px + bal + (-30 + jvAlea(i + 40 + px) * 60) * k, py + (-112 + jvAlea(i + 50) * 40) * k, 3.2 * k);
      if (sol) for (let i = 0; i < 4; i++) jvRond(x, px + (-26 + jvAlea(i + 60) * 52) * k, py + 4 + jvAlea(i + 70) * 6, 2.8 * k);
    }
  } else if (e.neigeux || e.gel) {
    x.strokeStyle = jvRgba(e.blanc, 0.9); x.lineWidth = 1.6 * k;
    br.slice(0, 3).forEach(([dx, dy]) => jvTrait(x, px + dx * 0.5 * k, py - 84 * k, px + dx * k + bal, py + (dy - 2) * k));
  }
}
// Des graminées qui ploient au vent ; en épis à l'automne.
function jvHerbes(x, e, bx, sens, j, couleur, epis) {
  for (let i = 0; i < 10; i++) {
    const base = bx + i * 2.6, L = 60 + jvAlea(j * 10 + i) * 50;
    const b = Math.sin(e.t * e.souffle * 1.2 + i * 0.4 + j) * (3 + e.vent * 0.18) + e.vent * 0.35;
    const tx = base + sens * (i - 5) * 4 + b, ty = e.H - 30 - L;
    x.strokeStyle = e.ombre(couleur); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(base, e.H - 30); x.quadraticCurveTo(base + b * 0.2, e.H - 30 - L * 0.6, tx, ty); x.stroke();
    if (epis && i % 2 === 0) {
      x.strokeStyle = jvRgba(e.ombre(epis), 0.85); x.lineWidth = 2.6;
      x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx + 4 + b * 0.1, ty - 8, tx + 10 + b * 0.2, ty - 12); x.stroke();
    }
  }
}
// De petites fleurs semées dans l'herbe, qui se balancent.
function jvSemis(x, e, couleurs, y0, y1, n, tige) {
  for (let i = 0; i < n * e.W / 390; i++) {
    const fx = jvAlea(i * 13 + 1) * e.W, fy = y0 + jvAlea(i * 7 + 2) * (y1 - y0);
    const b = Math.sin(e.t * e.souffle * 1.4 + i) * (0.6 + e.vent * 0.05);
    const r = 1.6 + (fy - e.HZ) / (e.H - e.HZ) * 2.4;
    x.strokeStyle = e.ombre(tige); x.lineWidth = 0.9;
    jvTrait(x, fx, fy + r * 3, fx + b, fy);
    x.fillStyle = e.ombre(couleurs[i % couleurs.length]); jvRond(x, fx + b, fy, r);
  }
}
// Rosée du matin, deux heures après le lever, par ciel dégagé.
function jvRosee(x, e) {
  if (e.sol.depuisLever < -0.5 || e.sol.depuisLever > 2.5 || e.m.nappe >= 0.5 || e.nomS === "hiver") return;
  for (let i = 0; i < 22; i++) {
    x.fillStyle = `rgba(255,253,245,${(0.6 * Math.max(0, Math.sin(e.t * 1.6 + i * 2.3))).toFixed(2)})`;
    x.fillRect(jvAlea(i * 7) * e.W, e.HZ + 24 + jvAlea(i * 11) * (e.H - e.HZ - 60), 1.6, 1.6);
  }
}
function jvOiseaux(x, e, y) {
  x.strokeStyle = jvRgba(e.ombre("#24282A"), 0.6); x.lineWidth = 1.1;
  for (let i = 0; i < 5; i++) {
    const bx = ((e.t * 11 + i * 17) % (e.W + 140)) - 70, by = y + i * 7 + (i % 2) * 5 + Math.sin(e.t * 0.8 + i) * 3;
    const ai = 2 + Math.sin(e.t * 5 + i) * 2;
    x.beginPath(); x.moveTo(bx - 5, by - ai); x.quadraticCurveTo(bx - 2, by - 2, bx, by);
    x.quadraticCurveTo(bx + 2, by - 2, bx + 5, by - ai); x.stroke();
  }
}
// Martinets ou hirondelles d'été : vol rapide en croissants.
function jvMartinets(x, e, y) {
  x.fillStyle = jvRgba(e.ombre("#22262A"), 0.75);
  for (let i = 0; i < 4; i++) {
    const u = e.t * 0.35 + i * 1.7;
    const bx = (e.W * 0.5 + Math.sin(u) * e.W * 0.45 + i * 30) % e.W, by = y + Math.sin(u * 1.7 + i) * 40;
    const a = Math.cos(u) > 0 ? 1 : -1;
    x.beginPath(); x.moveTo(bx - 7 * a, by - 2); x.quadraticCurveTo(bx, by + 1, bx + 7 * a, by - 4);
    x.quadraticCurveTo(bx, by - 1, bx - 7 * a, by - 2); x.fill();
  }
}
function jvLucioles(x, e) {
  for (let i = 0; i < 14; i++) {
    const fx = jvAlea(i * 5) * e.W + Math.sin(e.t * 0.35 + i) * 18, fy = e.HZ + jvAlea(i * 9) * 160 + Math.cos(e.t * 0.45 + i) * 10;
    const a = Math.max(0, Math.sin(e.t * 1.2 + i * 1.9)) * 0.8;
    const r = x.createRadialGradient(fx, fy, 0, fx, fy, 7);
    r.addColorStop(0, `rgba(226,240,160,${a.toFixed(2)})`); r.addColorStop(1, "rgba(226,240,160,0)");
    x.fillStyle = r; x.fillRect(fx - 7, fy - 7, 14, 14);
  }
}
function jvPapillons(x, e) {
  ["#FFFFFF", "#F4D35E", "#EC8A3E", "#AFCBEF"].forEach((pc, i) => {
    const u = e.t * 0.05 + i * 0.27;
    const px = e.W * (0.08 + 0.84 * (0.5 + 0.5 * Math.sin(u * 2.3 + i)));
    const py = e.HZ + 40 + Math.sin(u * 3.1 + i * 2) * 70 + Math.sin(e.t * 2.2 + i) * 6;
    const ai = 0.25 + Math.abs(Math.sin(e.t * 9 + i * 1.3)) * 0.75;
    x.fillStyle = pc;
    [[-3.6, -1.5, 4.2, 3.4, -0.5], [3.6, -1.5, 4.2, 3.4, 0.5], [-2.6, 2.4, 2.6, 2.2, -0.3], [2.6, 2.4, 2.6, 2.2, 0.3]]
      .forEach(([dx, dy, rx, ry, a]) => jvOvale(x, px + dx * ai, py + dy, rx * ai, ry, a));
    x.fillStyle = "rgba(40,36,30,.7)"; x.fillRect(px - 0.5, py - 3, 1, 7);
  });
}
// Les petites maisons d'un village lointain, et son clocher.
function jvVillage(x, e, cx, y, couleur, clocher) {
  x.fillStyle = couleur;
  for (let i = 0; i < 7; i++) {
    const hx = cx - 60 + i * 17 + jvAlea(i) * 6, w = 12 + jvAlea(i + 3) * 6, h = 8 + jvAlea(i + 5) * 6;
    x.fillRect(hx, y - h, w, h);
    x.beginPath(); x.moveTo(hx - 2, y - h); x.lineTo(hx + w / 2, y - h - 7); x.lineTo(hx + w + 2, y - h); x.fill();
  }
  if (clocher) {
    x.fillRect(cx - 3, y - 30, 8, 30);
    x.beginPath(); x.moveTo(cx - 4, y - 30); x.lineTo(cx + 1, y - 50); x.lineTo(cx + 6, y - 30); x.fill();
  }
}

/* ---------- Les thèmes ----------
   Chaque thème porte ses couleurs de saison, sa branche, ce qui tombe, et
   peint son décor ; le ciel, le temps, la lune, la branche, la chute, la
   pluie et le grain sont communs. */
const JV_PETALES = c => ({ forme: "petale", couleurs: c });
const JV_FEUILLES = c => ({ forme: "ovale", couleurs: c });

function decorJaponais(x, e) {
  const { W, H, HZ, s, nomS, t, ombre, vent, souffle } = e;
  const pied = HZ - 28;
  const MONTS = [{ p: 0.1, h: 92, w: 0.32 }, { p: 0.47, h: 140, w: 0.38 }, { p: 0.88, h: 104, w: 0.3 }];
  const mont = () => {
    x.beginPath(); x.moveTo(0, pied + 30);
    for (let i = 0; i <= 48; i++) {
      const xn = i / 48;
      let y = 0;
      MONTS.forEach(p => { y = Math.max(y, p.h * Math.pow(Math.max(0, 1 - Math.abs(xn - p.p) / (p.w / 2)), 1.3)); });
      x.lineTo(xn * W, pied - y + jvAlea(i) * 3);
    }
    x.lineTo(W, pied + 30); x.closePath();
  };
  x.fillStyle = ombre(jvMel(e.bas, s.mont, s.ciel ? 0.45 : 0.3)); mont(); x.fill();
  if (e.neigeux) { x.save(); mont(); x.clip(); x.fillStyle = jvRgba(e.blanc, 0.85); x.fillRect(0, 0, W, pied - 108); x.restore(); }
  jvBrume(x, e, pied - 10, 40, s.ciel ? 0.55 : 0.75);
  jvCrete(x, e, HZ - 16, 13, 5, 1, ombre(jvMel(e.bas, jvMel(s.terre, "#2D3833", s.ciel ? 0.25 : 0.45), s.ciel ? 0.72 : 0.6)));
  jvBrume(x, e, HZ - 4, 22, 0.6 + e.m.brume * 0.3);
  jvSol(x, e, s.terre, HZ + 4);
  // Pin taillé en plateaux
  {
    const px = 62, py = HZ + 10, bal = Math.sin(t * souffle * 0.5) * vent * 0.03;
    x.strokeStyle = ombre("#4A3A2E"); x.lineCap = "round"; x.lineWidth = 6;
    x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + 16, py - 32, px - 20, py - 58, px + 6 + bal, py - 96); x.stroke();
    x.lineWidth = 2.6;
    const plateaux = [[-30, -42, 30, 9], [26, -64, 27, 8], [-10, -90, 23, 8], [6 + bal, -108, 14, 6]];
    plateaux.forEach(([dx, dy]) => jvTrait(x, px + 2, py + dy + 10, px + dx, py + dy + 2));
    plateaux.forEach(([dx, dy, rx, ry]) => {
      const cx = px + dx + bal * 0.5;
      x.fillStyle = ombre(s.pin); jvOvale(x, cx, py + dy, rx, ry);
      x.fillStyle = ombre(jvMel(s.pin, "#B9D08A", 0.25)); jvOvale(x, cx, py + dy - ry * 0.35, rx * 0.8, ry * 0.45);
      if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.92); x.beginPath(); x.ellipse(cx, py + dy - ry * 0.5, rx * 0.85, ry * 0.42, 0, Math.PI, 0); x.fill(); }
    });
  }
  jvArbre(x, e, W * 0.8, HZ + 12, 1, s.houppier, nomS === "ete" ? "#D8452F" : null);
  // Massifs taillés en boule, couverts d'azalées au printemps
  [[0.07, 44, 48], [0.29, 36, 30], [0.62, 52, 36]].forEach(([px, dy, r], j) => {
    const mx = W * px, my = HZ + dy;
    x.fillStyle = ombre(s.buisson); x.beginPath(); x.ellipse(mx, my, r, r * 0.58, 0, Math.PI, 0); x.fill();
    x.strokeStyle = jvRgba(ombre(jvMel(s.buisson, "#E8E4D4", 0.25)), 0.5); x.lineWidth = 1.2;
    x.beginPath(); x.ellipse(mx, my, r * 0.8, r * 0.42, 0, Math.PI * 1.15, Math.PI * 1.75); x.stroke();
    if (s.azalee) {
      for (let i = 0; i < 26; i++) {
        const a = Math.PI * (1.05 + jvAlea(j * 31 + i) * 0.9), d = 0.25 + jvAlea(i * 3 + j) * 0.7;
        x.fillStyle = ombre(i % 4 ? s.azalee : "#F6D0DC"); jvRond(x, mx + Math.cos(a) * r * d, my + Math.sin(a) * r * 0.55 * d, 2);
      }
    }
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.9); x.beginPath(); x.ellipse(mx, my - r * 0.38, r * 0.72, r * 0.22, 0, Math.PI, 0); x.fill(); }
  });
  // Tuteurs du potager, liés en tête, garnis l'été
  if (nomS !== "hiver") {
    const grand = nomS === "ete" ? 46 : 32;
    for (let i = 0; i < 6; i++) {
      const px = W * 0.74 + i * 14, b = Math.sin(t * souffle + i) * vent * 0.012;
      x.strokeStyle = ombre("#6A5A44"); x.lineWidth = 1.3;
      jvTrait(x, px, HZ + 72, px + b + (i % 2 ? 3 : -3), HZ + 72 - grand);
      if (nomS === "ete") {
        for (let j = 0; j < 4; j++) { x.fillStyle = ombre(j % 2 ? "#3F8236" : "#5DA044"); jvOvale(x, px + (j % 2 ? 3 : -3), HZ + 66 - j * 10, 4, 2.4, j); }
        if (i % 2 === 0) { x.fillStyle = ombre("#D2402E"); jvRond(x, px + 2, HZ + 50 - (i % 3) * 6, 2.6); }
      }
    }
    x.strokeStyle = ombre("#6A5A44"); jvTrait(x, W * 0.74 - 6, HZ + 78 - grand, W * 0.74 + 76, HZ + 78 - grand);
  }
  if (s.touches) jvSemis(x, e, s.touches, HZ + 70, H - 40, 70, s.herbe);
  // Bassin : reflet du ciel, carpes, nénuphars, ronds dans l'eau, reflet de la lune
  {
    const ex = W * 0.44, ey = HZ + 116, rx = 80, ry = 19, gele = e.neigeux && nomS === "hiver";
    x.fillStyle = ombre("#666A63"); jvOvale(x, ex, ey + 1, rx + 7, ry + 5);
    x.save(); x.beginPath(); x.ellipse(ex, ey, rx, ry, 0, 0, 7); x.clip();
    const eau = x.createLinearGradient(0, ey - ry, 0, ey + ry);
    eau.addColorStop(0, gele ? "#DCE2E3" : jvMel(e.bas, "#2E4A52", 0.25));
    eau.addColorStop(1, gele ? "#BFC9CC" : jvMel(e.haut, "#1E3640", 0.35));
    x.fillStyle = eau; x.fillRect(ex - rx, ey - ry, rx * 2, ry * 2);
    if (!gele) {
      if (nomS !== "hiver") {
        ["#E8742E", "#F4F1EA", "#D9482B"].forEach((kc, i) => {
          const a = t * 0.22 * (i % 2 ? -1 : 1) + i * 2.1;
          x.fillStyle = jvRgba(kc, 0.75 * (1 - e.c.nuit * 0.6));
          jvOvale(x, ex + Math.cos(a) * rx * 0.58, ey + Math.sin(a) * ry * 0.5, 7, 2.6,
            Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx) * (i % 2 ? -1 : 1));
        });
      }
      if (nomS === "ete" || nomS === "printemps") {
        [[-44, -4], [-30, 6], [38, -2], [52, 7], [12, 9]].forEach(([dx, dy], i) => {
          x.fillStyle = ombre(i % 2 ? "#4C8A3E" : "#3E7634");
          x.beginPath(); x.ellipse(ex + dx, ey + dy, 8, 3, 0, 0.3, Math.PI * 2); x.fill();
          if (nomS === "ete" && i % 2 === 0) { x.fillStyle = ombre("#F2A9C0"); jvOvale(x, ex + dx + 1, ey + dy - 2, 3.2, 2.2); }
        });
      }
      jvRonds(x, e, ex, ey, rx, ry);
      jvReflet(x, e, ex, ey - ry + 3, 7);
    }
    x.restore();
    x.fillStyle = ombre("#7A7C75");
    [[-rx - 2, 2, 9], [rx - 6, -6, 7], [-20, ry + 2, 8], [34, ry, 6]].forEach(([dx, dy, r]) => jvOvale(x, ex + dx, ey + dy, r, r * 0.55));
  }
  // Lanterne de pierre, allumée à la tombée du jour
  {
    const tx = W * 0.15, ty = HZ + 132, pierre = ombre("#8D8C84");
    x.fillStyle = pierre;
    x.fillRect(tx - 9, ty - 5, 18, 5); x.fillRect(tx - 3, ty - 26, 6, 21); x.fillRect(tx - 11, ty - 30, 22, 4); x.fillRect(tx - 8, ty - 44, 16, 14);
    x.fillStyle = e.allume > 0.05 ? jvMel(ombre("#3A3A36"), "#F4C46A", e.allume) : ombre("#3A3A36");
    x.fillRect(tx - 4, ty - 41, 8, 8);
    if (e.allume > 0.05) {
      const gl = x.createRadialGradient(tx, ty - 37, 2, tx, ty - 37, 46);
      gl.addColorStop(0, `rgba(246,196,106,${(0.45 * e.allume).toFixed(2)})`); gl.addColorStop(1, "rgba(246,196,106,0)");
      x.fillStyle = gl; x.fillRect(tx - 46, ty - 83, 92, 92);
    }
    x.fillStyle = pierre;
    x.beginPath(); x.moveTo(tx - 17, ty - 44); x.quadraticCurveTo(tx, ty - 50, tx + 17, ty - 44);
    x.lineTo(tx + 8, ty - 54); x.lineTo(tx - 8, ty - 54); x.closePath(); x.fill();
    jvRond(x, tx, ty - 57, 3.2);
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.95); x.beginPath(); x.ellipse(tx, ty - 52, 13, 3, 0, Math.PI, 0); x.fill(); }
  }
  if (nomS === "ete") jvTournesols(x, e, [[W * 0.9, 112], [W * 0.96, 96], [W * 0.84, 84]], HZ + 150);
  // Carrés du potager et ce qui y pousse
  [W * 0.66, W * 0.84].forEach((bx, j) => {
    const by = HZ + 158, bw = 58;
    x.fillStyle = ombre("#7A5A3B"); x.fillRect(bx - bw / 2, by - 10, bw, 13);
    x.fillStyle = ombre("#946F49"); x.fillRect(bx - bw / 2, by - 10, bw, 2.4);
    x.fillStyle = ombre("#4A382A"); x.fillRect(bx - bw / 2 + 3, by - 12, bw - 6, 3);
    for (let i = 0; i < 4; i++) jvLegume(x, e, s.potager, bx - bw / 2 + 9 + i * 13.5, by - 14, i + j, 1);
  });
  jvHerbes(x, e, 18, 1, 0, s.herbe, nomS === "automne" ? "#E6DAC0" : null);
  jvHerbes(x, e, W - 34, -1, 1, s.herbe, nomS === "automne" ? "#E6DAC0" : null);
  jvHerbes(x, e, W * 0.4, 1, 2, s.herbe, nomS === "automne" ? "#E6DAC0" : null);
  jvRosee(x, e);
  // Libellules d'été au-dessus du bassin
  if (e.c.jour > 0.6 && nomS === "ete" && !e.m.pluie) {
    for (let i = 0; i < 2; i++) {
      const u = t / 2.5 + i * 0.5, sauts = Math.floor(u), e2 = Math.min(1, (u % 1) * 4);
      const ax = W * 0.44 + (jvAlea(sauts * 3 + i) - 0.5) * 160, ay = HZ + 70 + jvAlea(sauts * 5 + i) * 40;
      const bx = W * 0.44 + (jvAlea(sauts * 3 + i + 3) - 0.5) * 160, by = HZ + 70 + jvAlea(sauts * 5 + i + 3) * 40;
      const dx = ax + (bx - ax) * e2, dy = ay + (by - ay) * e2;
      x.fillStyle = "rgba(235,242,250,.6)"; jvOvale(x, dx - 2, dy - 4, 1.8, 6, 0.3); jvOvale(x, dx + 2, dy - 4, 1.8, 6, -0.3);
      x.strokeStyle = "#2F6FA6"; x.lineWidth = 1.6; jvTrait(x, dx - 6, dy, dx + 8, dy);
    }
  }
}
// Ronds dans l'eau, nombreux sous la pluie.
function jvRonds(x, e, ex, ey, rx, ry) {
  const nr = e.m.pluie ? 14 : 2, cadence = e.m.pluie ? 1.4 : 0.35;
  x.lineWidth = 0.9;
  for (let i = 0; i < nr; i++) {
    const u = e.t * cadence + jvAlea(i * 3), ph = u % 1, cyc = Math.floor(u);
    x.strokeStyle = `rgba(240,244,248,${(0.5 * (1 - ph)).toFixed(2)})`;
    x.beginPath(); x.ellipse(ex + (jvAlea(i + cyc * 7) - 0.5) * rx * 1.4, ey + (jvAlea(i * 2 + cyc) - 0.5) * ry, 2 + ph * 12, 0.6 + ph * 3, 0, 0, 7); x.stroke();
  }
}
// Reflet de la lune, ou éclat du soleil, sur une eau.
function jvReflet(x, e, cx, y0, n) {
  if (e.lune > 0.05) {
    const rfx = cx + (e.lx - e.W / 2) * 0.35;
    for (let i = 0; i < n; i++) {
      const w = 14 - i * 1.4 + Math.sin(e.t * 2 + i) * 3;
      x.fillStyle = `rgba(236,238,246,${(0.55 * e.lune * (1 - i / (n + 1))).toFixed(3)})`;
      x.fillRect(rfx - w / 2 + Math.sin(e.t * 1.3 + i * 2) * 2, y0 + i * 5, w, 1.6);
    }
  } else if (e.hs > 0 && e.voile < 0.6) {
    x.fillStyle = "rgba(255,250,235,.35)"; x.fillRect(cx - 30 + Math.sin(e.t) * 4, y0 + 10, 22, 1.4);
  }
}
function jvTournesols(x, e, liste, base) {
  liste.forEach(([fx, L], i) => {
    const b = Math.sin(e.t * e.souffle + i) * (2 + e.vent * 0.12);
    x.strokeStyle = e.ombre("#4E7A34"); x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(fx, base); x.quadraticCurveTo(fx + b * 0.3, base - L * 0.6, fx + b, base - L); x.stroke();
    x.fillStyle = e.ombre("#4E8A3A"); jvOvale(x, fx + b * 0.4 - 7, base - L * 0.5, 7, 3, -0.5);
    x.fillStyle = e.ombre("#F2BE2C");
    for (let p = 0; p < 12; p++) { const a = p * Math.PI / 6; jvOvale(x, fx + b + Math.cos(a) * 8, base - L + Math.sin(a) * 8, 4.2, 1.8, a); }
    x.fillStyle = e.ombre("#5E3B1F"); jvRond(x, fx + b, base - L, 5);
  });
}
// Un légume du potager, selon ce que porte la saison.
function jvLegume(x, e, sorte, cx, cy, i, k) {
  const b = Math.sin(e.t * e.souffle * 1.3 + i) * e.vent * 0.03, o = e.ombre;
  if (sorte === "salades") {
    x.fillStyle = o(i % 2 ? "#9CCB64" : "#7DB252");
    for (let p = 0; p < 5; p++) jvOvale(x, cx + b + Math.cos(p * 1.25) * 3 * k, cy - 3 * k + Math.sin(p * 1.25) * 2 * k, 4 * k, 3 * k, p);
  } else if (sorte === "courges") {
    x.fillStyle = o("#3F7F36"); jvOvale(x, cx + b, cy - 4 * k, 6.5 * k, 4.5 * k);
    if (i % 2 === 0) { x.fillStyle = o("#F2C83A"); jvRond(x, cx + b + 3 * k, cy - 7 * k, 2.4 * k); }
  } else if (sorte === "potirons") {
    x.fillStyle = o("#5E7A3A"); jvOvale(x, cx - 3 * k, cy - 2 * k, 5 * k, 2.4 * k, 0.4);
    if (i % 2 === 0) { x.fillStyle = o("#E07A24"); jvOvale(x, cx + 3 * k, cy - 3 * k, 6 * k, 4.6 * k); }
  } else if (sorte === "choux") {
    x.fillStyle = o("#6E8F86"); jvRond(x, cx + b * 0.3, cy - 5 * k, 6 * k);
    x.fillStyle = o("#9DB8AE"); jvRond(x, cx + b * 0.3, cy - 6 * k, 3 * k);
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.85); jvOvale(x, cx, cy - 9 * k, 4 * k, 1.6 * k); }
  } else if (sorte === "poireaux") {
    x.strokeStyle = o("#5F8A78"); x.lineWidth = 1.6 * k;
    [-3, 0, 3].forEach(d => jvTrait(x, cx + d * k * 0.4, cy, cx + d * k + b, cy - 13 * k));
    x.strokeStyle = o("#E6E3D2"); jvTrait(x, cx, cy, cx, cy - 4 * k);
  } else {
    x.fillStyle = o(e.neigeux ? "#F1F0EA" : "#C9B47C"); x.fillRect(cx - 6 * k, cy, 12 * k, 2.5 * k);
  }
}

function decorCampagne(x, e) {
  const { W, H, HZ, s, nomS, t, ombre } = e;
  // Champs en damier sur trois plans, bordés de haies
  const CHAMPS = { printemps: ["#9DBF6A", "#E3D158", "#7FA65A", "#B5CC7E"], ete: ["#D9BE6A", "#B9A65A", "#8DAA5E", "#E2CB7A"],
    automne: ["#9A7B55", "#B79B6A", "#7E8A5A", "#A68A62"], hiver: ["#B9BBB0", "#A9AD9F", "#C4C3B8", "#B0B4A8"] }[nomS];
  [[HZ - 58, 0.62, 10], [HZ - 34, 0.42, 16], [HZ - 10, 0.22, 22]].forEach(([y, fond, amp], k) => {
    const crete = xn => y - Math.sin(xn * 4 + k * 1.7) * amp;
    x.save();
    x.beginPath(); x.moveTo(0, H);
    for (let i = 0; i <= 40; i++) x.lineTo(i / 40 * W, crete(i / 40));
    x.lineTo(W, H); x.clip();
    let px = -20;
    for (let i = 0; px < W; i++) {
      const w = 40 + jvAlea(i + k * 20) * 60;
      x.fillStyle = ombre(jvMel(CHAMPS[(i + k) % 4], e.bas, fond));
      x.beginPath(); x.moveTo(px, H); x.lineTo(px + 26, y - 40); x.lineTo(px + w + 26, y - 40); x.lineTo(px + w, H); x.fill();
      px += w;
    }
    x.restore();
    x.fillStyle = ombre(jvMel(s.haie, e.bas, fond * 0.8));
    for (let i = 0; i < 60; i++) { const xn = i / 60; jvRond(x, xn * W, crete(xn) - 1, 3 + jvAlea(i + k) * 2); }
    jvBrume(x, e, y + 4, 10, 0.35);
  });
  jvSol(x, e, s.terre, HZ + 10);
  // Longère de pierre, toit d'ardoise, fumée
  {
    const x0 = W * 0.5, w = W * 0.42, y = HZ + 44, hm = 34, ht = 26;
    x.fillStyle = ombre("#D9CDB4"); x.fillRect(x0, y - hm, w, hm);
    x.fillStyle = ombre("#4E5763");
    x.beginPath(); x.moveTo(x0 - 6, y - hm); x.lineTo(x0 + 14, y - hm - ht); x.lineTo(x0 + w - 14, y - hm - ht); x.lineTo(x0 + w + 6, y - hm); x.fill();
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.9); x.beginPath(); x.moveTo(x0 + 2, y - hm - 6); x.lineTo(x0 + 14, y - hm - ht); x.lineTo(x0 + w - 14, y - hm - ht); x.lineTo(x0 + w - 2, y - hm - 6); x.fill(); }
    x.fillStyle = ombre("#BDB19A"); x.fillRect(x0 + w * 0.78, y - hm - ht - 12, 9, 16);
    jvFumee(x, e, x0 + w * 0.78 + 4, y - hm - ht - 14);
    [0.12, 0.3, 0.62, 0.82].forEach((f, i) => jvFenetre(x, e, x0 + w * f, y - hm + 9, 9, 11, i + 3));
    x.fillStyle = ombre("#5E7A8A"); x.fillRect(x0 + w * 0.46, y - 22, 11, 22);
  }
  // Poulailler et ses poules, le jour
  {
    const px = W * 0.33, py = HZ + 60;
    x.fillStyle = ombre("#9A7650"); x.fillRect(px, py - 18, 30, 18);
    x.fillStyle = ombre("#A8452E"); x.beginPath(); x.moveTo(px - 4, py - 18); x.lineTo(px + 15, py - 30); x.lineTo(px + 34, py - 18); x.fill();
    x.fillStyle = ombre("#3A2E24"); x.fillRect(px + 11, py - 10, 8, 10);
    if (e.c.jour > 0.5 && !e.m.pluie) {
      ["#F4EFE4", "#B5703A", "#F4EFE4"].forEach((pc, i) => {
        const cx = px + 44 + i * 16 + Math.sin(e.t * 0.3 + i) * 6, cy = py + 4 + i * 3, bec = Math.abs(Math.sin(e.t * 2 + i * 2)) > 0.8 ? 3 : 0;
        x.fillStyle = ombre(pc); jvOvale(x, cx, cy, 5, 3.6); jvRond(x, cx + 4, cy - 3 + bec, 2.2);
        x.fillStyle = ombre("#C83A2E"); jvRond(x, cx + 4, cy - 5.4 + bec, 1);
      });
    }
  }
  jvArbre(x, e, W * 0.16, HZ + 34, 0.95, s.houppier, s.fruit, nomS === "automne");
  // Clôture de châtaignier
  {
    const y = HZ + 82;
    x.strokeStyle = ombre("#8C7656"); x.lineWidth = 1.6;
    for (let px = 4; px < W; px += 7) jvTrait(x, px, y, px + (jvAlea(px) - 0.5) * 1.5, y - 15 - jvAlea(px + 1) * 3);
    x.lineWidth = 0.8; x.strokeStyle = ombre("#5C5650");
    jvTrait(x, 0, y - 4, W, y - 4); jvTrait(x, 0, y - 11, W, y - 11);
  }
  // Potager en planches
  const RANGS = { printemps: ["salades", "poireaux", "salades", "choux"], ete: ["salades", "courges", "poireaux", "choux"],
    automne: ["potirons", "poireaux", "choux", "salades"], hiver: ["poireaux", "choux", "paille", "poireaux"] }[nomS];
  RANGS.forEach((sorte, r) => {
    const y = HZ + 104 + r * 24, k = 0.8 + r * 0.12;
    x.fillStyle = ombre(jvMel(s.terre, "#5A4632", 0.35)); x.fillRect(0, y - 2, W, 5 * k);
    for (let i = 0; i < W / (20 * k); i++) jvLegume(x, e, sorte, 10 + i * 20 * k + (r % 2) * 8, y, i + r, k);
  });
  // Épouvantail
  {
    const px = W * 0.8, py = HZ + 150, b = Math.sin(e.t * e.souffle * 0.8) * (1 + e.vent * 0.08);
    x.strokeStyle = ombre("#6B5536"); x.lineWidth = 2.4;
    jvTrait(x, px, py, px + b * 0.3, py - 56); jvTrait(x, px - 20 + b, py - 40, px + 20 + b, py - 42);
    x.fillStyle = ombre("#B5523A"); x.fillRect(px - 9 + b * 0.6, py - 44, 18, 20);
    x.fillStyle = ombre("#E7D3AE"); jvRond(x, px + b * 0.6, py - 52, 6);
    x.fillStyle = ombre("#7A5A30"); x.fillRect(px - 10 + b * 0.6, py - 58, 20, 3); x.fillRect(px - 5 + b * 0.6, py - 66, 10, 8);
  }
  jvHerbes(x, e, 10, 1, 0, s.herbe, nomS === "automne" ? "#D9C79A" : null);
  jvHerbes(x, e, W - 30, -1, 1, s.herbe, null);
  jvRosee(x, e);
}

function decorMer(x, e) {
  const { W, H, HZ, s, nomS, t, ombre } = e;
  const yMer = HZ - 74, yRive = HZ - 14;
  // La mer, qui reflète le ciel, et ses scintillements
  const mer = x.createLinearGradient(0, yMer, 0, yRive);
  mer.addColorStop(0, ombre(jvMel(e.bas, s.mer, 0.55))); mer.addColorStop(1, ombre(jvMel(e.bas, s.mer, 0.75)));
  x.fillStyle = mer; x.fillRect(0, yMer, W, yRive - yMer + 12);
  for (let i = 0; i < 46 * W / 390; i++) {
    const py = yMer + 3 + jvAlea(i) * (yRive - yMer - 6), px = (jvAlea(i + 9) * W + t * (4 + i % 5)) % W;
    x.fillStyle = `rgba(255,255,255,${(0.18 + 0.2 * Math.sin(e.t * 2 + i)).toFixed(2)})`;
    x.fillRect(px, py, 6 + (py - yMer) / 6, 1);
  }
  // Le chemin du soleil ou de la lune sur l'eau
  const astre = e.lune > 0.05 ? [e.lx, e.lune, "236,238,246"] : (e.hs > 0 && e.voile < 0.7 ? [e.sx, 1 - e.voile, "255,240,210"] : null);
  if (astre) {
    for (let i = 0; i < 12; i++) {
      const py = yMer + 3 + i * 5, w = 8 + i * 2 + Math.sin(t * 2 + i) * 4;
      x.fillStyle = `rgba(${astre[2]},${(0.5 * astre[1] * (1 - i / 14)).toFixed(3)})`;
      x.fillRect(astre[0] - w / 2 + Math.sin(t * 1.3 + i) * 3, py, w, 1.4);
    }
  }
  // Un voilier l'été, le jour
  if (nomS === "ete" && e.c.jour > 0.6 && e.vent < 45) {
    const bx = ((t * 3) % (W + 80)) - 40, by = yMer + 16;
    x.fillStyle = ombre("#3C3A38"); x.beginPath(); x.moveTo(bx - 9, by); x.lineTo(bx + 9, by); x.lineTo(bx + 6, by + 3); x.lineTo(bx - 6, by + 3); x.fill();
    x.fillStyle = ombre("#F6F3EA"); x.beginPath(); x.moveTo(bx, by - 1); x.lineTo(bx, by - 18); x.lineTo(bx + 9, by - 1); x.fill();
  }
  // La pointe et son phare, dont le faisceau tourne la nuit
  {
    x.fillStyle = ombre(jvMel(e.bas, "#4A5148", 0.6));
    x.beginPath(); x.moveTo(W * 0.66, yRive); x.quadraticCurveTo(W * 0.78, yMer - 8, W * 0.9, yMer - 12); x.lineTo(W, yMer - 6); x.lineTo(W, yRive); x.fill();
    const fx = W * 0.86, fy = yMer - 11;
    x.fillStyle = ombre("#F2EFE6"); x.beginPath(); x.moveTo(fx - 5, fy); x.lineTo(fx - 3, fy - 40); x.lineTo(fx + 3, fy - 40); x.lineTo(fx + 5, fy); x.fill();
    x.fillStyle = ombre("#B8403A"); x.fillRect(fx - 4.4, fy - 16, 8.8, 6); x.fillRect(fx - 3.4, fy - 32, 6.8, 5);
    x.fillStyle = ombre("#2E3436"); x.fillRect(fx - 4, fy - 46, 8, 6);
    if (e.allume > 0.1) {
      x.fillStyle = jvMel("#2E3436", "#FFE7A8", e.allume); x.fillRect(fx - 2.5, fy - 45, 5, 4);
      const a = t * 0.9;
      [a, a + Math.PI].forEach(r => {
        const g = x.createLinearGradient(fx, fy - 43, fx + Math.cos(r) * 160, fy - 43 + Math.sin(r) * 18);
        g.addColorStop(0, `rgba(255,236,180,${(0.4 * e.allume * Math.abs(Math.cos(r))).toFixed(3)})`); g.addColorStop(1, "rgba(255,236,180,0)");
        x.fillStyle = g; x.beginPath(); x.moveTo(fx, fy - 43);
        x.lineTo(fx + Math.cos(r) * 160, fy - 43 + Math.sin(r) * 18 - 9); x.lineTo(fx + Math.cos(r) * 160, fy - 43 + Math.sin(r) * 18 + 9); x.fill();
      });
    }
  }
  // Les vagues sur le sable, plus fortes au vent, et les embruns
  const houle = 2 + e.vent * 0.08;
  for (let k = 0; k < 3; k++) {
    x.strokeStyle = `rgba(250,250,246,${(0.7 - k * 0.18).toFixed(2)})`; x.lineWidth = 1.4 - k * 0.3;
    x.beginPath();
    const y = yRive - 4 + k * 4 + Math.sin(t * 0.7 + k) * houle;
    for (let i = 0; i <= 40; i++) { const xn = i / 40; x.lineTo(xn * W * 0.7, y + Math.sin(xn * 18 + t * 1.5 + k) * 1.4); }
    x.stroke();
  }
  if (e.vent > 30) {
    for (let i = 0; i < 30; i++) {
      const ph = (t * 0.6 + jvAlea(i)) % 1;
      x.fillStyle = `rgba(255,255,255,${(0.5 * (1 - ph)).toFixed(2)})`;
      jvRond(x, (jvAlea(i + 3) * W * 0.7 + ph * e.vent * 2) % W, yRive - ph * 30, 1.2);
    }
  }
  // Les dunes et leurs oyats
  jvCrete(x, e, HZ + 6, 12, 6, 0.4, ombre(jvMel(s.sable, e.bas, 0.15)));
  x.strokeStyle = ombre("#9FA66A"); x.lineWidth = 1;
  for (let i = 0; i < 50 * W / 390; i++) {
    const ox = jvAlea(i * 3) * W, oy = HZ + 2 + jvAlea(i * 5) * 20, b = Math.sin(t * e.souffle + i) * (1 + e.vent * 0.1) + e.vent * 0.12;
    jvTrait(x, ox, oy, ox + b + 3, oy - 10); jvTrait(x, ox + 2, oy, ox + b - 2, oy - 8);
  }
  jvSol(x, e, s.terre, HZ + 30);
  // Le tamaris, penché par le vent du large
  {
    const px = W * 0.14, py = HZ + 60, bal = Math.sin(t * e.souffle * 0.5) * e.vent * 0.05;
    x.strokeStyle = ombre("#5C4A3C"); x.lineWidth = 5; x.lineCap = "round";
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 10, py - 40, px + 22 + bal, py - 78); x.stroke();
    for (let i = 0; i < 90; i++) {
      const a = jvAlea(i * 3) * Math.PI * 2, d = jvAlea(i * 5) * 46;
      const cx = px + 22 + bal * 1.3 + Math.cos(a) * d, cy = py - 92 + Math.sin(a) * d * 0.55;
      x.fillStyle = ombre(s.tamaris[i % s.tamaris.length]);
      jvOvale(x, cx + Math.sin(t * e.souffle + i) * e.vent * 0.04, cy, 4, 2, a);
    }
  }
  // Le muret de granit et les hortensias devant
  {
    const y = HZ + 74;
    for (let r = 0; r < 2; r++) {
      for (let px = -10 + r * 12; px < W; px += 26) {
        const w = 18 + jvAlea(px + r) * 10;
        x.fillStyle = ombre(jvAlea(px * 3 + r) > 0.5 ? "#8E9091" : "#A3A39C");
        x.beginPath(); x.roundRect ? x.roundRect(px, y - 22 + r * 11, w, 10, 3) : x.rect(px, y - 22 + r * 11, w, 10); x.fill();
      }
    }
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.85); x.fillRect(0, y - 24, W, 3); }
    for (let i = 0; i < 6; i++) {
      const hx = W * (0.08 + i * 0.17), hy = y + 26 + (i % 2) * 8, r = 20 + (i % 3) * 4;
      x.fillStyle = ombre(s.hortensia ? "#3F6E3E" : "#7A6A56");
      x.beginPath(); x.ellipse(hx, hy, r, r * 0.6, 0, Math.PI, 0); x.fill();
      if (s.hortensia) {
        const teinte = s.hortensia[i % s.hortensia.length];
        for (let b = 0; b < 3; b++) {
          const bx = hx - r * 0.55 + b * r * 0.55, by = hy - r * 0.42 - (b % 2) * 4;
          for (let p = 0; p < 9; p++) {
            x.fillStyle = ombre(p % 3 ? teinte : jvMel(teinte, "#FFFFFF", 0.3));
            jvRond(x, bx + Math.cos(p * 0.7) * 4.5 * jvAlea(p + b), by + Math.sin(p * 0.7) * 4 * jvAlea(p + b + 1), 2.2);
          }
        }
      }
    }
  }
  jvHerbes(x, e, 6, 1, 0, s.herbe, null);
  jvHerbes(x, e, W - 30, -1, 1, s.herbe, null);
  // Mouettes, en toute saison
  if (e.c.jour > 0.4) {
    for (let i = 0; i < 4; i++) {
      const u = t * 0.06 + i * 0.25, bx = ((u % 1) * (W + 120)) - 60 + Math.sin(t * 0.3 + i) * 20;
      const by = HZ * 0.42 + Math.sin(t * 0.5 + i * 2) * 26 + i * 12, ai = Math.sin(t * 2.4 + i) * 3;
      x.strokeStyle = ombre("#F6F6F2"); x.lineWidth = 1.8;
      x.beginPath(); x.moveTo(bx - 9, by - 2 - ai); x.quadraticCurveTo(bx - 4, by - 5, bx, by); x.quadraticCurveTo(bx + 4, by - 5, bx + 9, by - 2 - ai); x.stroke();
      x.strokeStyle = ombre("#5A5E62"); x.lineWidth = 1.2; jvTrait(x, bx - 9, by - 2 - ai, bx - 7, by - 3.4 - ai); jvTrait(x, bx + 9, by - 2 - ai, bx + 7, by - 3.4 - ai);
    }
  }
}

function decorMediterraneen(x, e) {
  const { W, H, HZ, s, nomS, t, ombre } = e;
  // Collines de garrigue et cyprès sur la crête
  jvCrete(x, e, HZ - 60, 16, 3, 0.6, ombre(jvMel(e.bas, "#8C8E62", 0.42)));
  x.fillStyle = ombre(jvMel(e.bas, "#3E4C38", 0.45));
  for (let i = 0; i < 9; i++) {
    const xn = 0.05 + i * 0.11 + jvAlea(i) * 0.03, cy = HZ - 60 - Math.sin(xn * 3 + 0.6) * 16 - Math.sin(xn * 6.9 + 1.2) * 4.8;
    jvOvale(x, xn * W, cy - 8, 2.4, 10);
  }
  jvBrume(x, e, HZ - 50, 18, 0.4);
  jvCrete(x, e, HZ - 22, 12, 4, 2, ombre(jvMel(e.bas, "#6F7A4E", 0.6)));
  jvBrume(x, e, HZ - 10, 14, 0.35);
  jvSol(x, e, s.terre, HZ + 4);
  // Le mas, crépi ocre, tuiles rondes, volets bleus
  {
    const x0 = W * 0.55, w = W * 0.38, y = HZ + 42, hm = 38;
    x.fillStyle = ombre("#E3C08E"); x.fillRect(x0, y - hm, w, hm);
    x.fillStyle = ombre("#B5603C");
    x.beginPath(); x.moveTo(x0 - 8, y - hm); x.lineTo(x0 + w * 0.5, y - hm - 16); x.lineTo(x0 + w + 8, y - hm); x.fill();
    x.strokeStyle = ombre("#93492D"); x.lineWidth = 0.8;
    for (let i = 1; i < 4; i++) jvTrait(x, x0 - 8 + i * 4, y - hm - i * 4 + 1, x0 + w + 8 - i * 4, y - hm - i * 4 + 1);
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.85); x.beginPath(); x.moveTo(x0, y - hm - 2); x.lineTo(x0 + w * 0.5, y - hm - 16); x.lineTo(x0 + w, y - hm - 2); x.fill(); }
    [0.14, 0.4, 0.72].forEach((f, i) => {
      jvFenetre(x, e, x0 + w * f, y - hm + 10, 8, 12, i + 11);
      x.fillStyle = ombre("#6B8DA6"); x.fillRect(x0 + w * f - 5, y - hm + 10, 4, 12); x.fillRect(x0 + w * f + 9, y - hm + 10, 4, 12);
    });
    x.fillStyle = ombre("#7A5236"); x.beginPath(); x.moveTo(x0 + w * 0.56, y); x.lineTo(x0 + w * 0.56, y - 15); x.arc(x0 + w * 0.56 + 6, y - 15, 6, Math.PI, 0); x.lineTo(x0 + w * 0.56 + 12, y); x.fill();
  }
  // Cyprès en flammes sombres
  [[W * 0.48, 110], [W * 0.97, 96], [W * 0.04, 84]].forEach(([cx, L], i) => {
    const b = Math.sin(t * e.souffle * 0.7 + i) * e.vent * 0.06, base = HZ + 50;
    x.fillStyle = ombre("#2F4A33");
    x.beginPath(); x.moveTo(cx - 9, base);
    x.quadraticCurveTo(cx - 12, base - L * 0.5, cx + b, base - L); x.quadraticCurveTo(cx + 12, base - L * 0.5, cx + 9, base); x.fill();
    x.fillStyle = ombre("#3E5E40"); x.beginPath(); x.moveTo(cx - 2, base - 4); x.quadraticCurveTo(cx - 5, base - L * 0.5, cx + b, base - L + 6); x.quadraticCurveTo(cx + 2, base - L * 0.5, cx + 3, base - 4); x.fill();
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.7); jvOvale(x, cx + b * 0.5, base - L * 0.6, 4, 2); }
  });
  // Oliviers argentés, ou mimosa en fleur l'hiver
  [[W * 0.2, HZ + 64, 1], [W * 0.38, HZ + 52, 0.75]].forEach(([px, py, k], j) => {
    const mimosa = nomS === "hiver" && j === 1;
    const bal = Math.sin(t * e.souffle * 0.6 + j) * e.vent * 0.04;
    x.strokeStyle = ombre("#6E665A"); x.lineWidth = 7 * k; x.lineCap = "round";
    x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + 12 * k, py - 20 * k, px - 14 * k, py - 34 * k, px + 4 * k + bal, py - 54 * k); x.stroke();
    x.lineWidth = 3 * k; jvTrait(x, px + 2 * k, py - 30 * k, px - 26 * k + bal, py - 52 * k);
    const teintes = mimosa ? ["#F2D23A", "#E8C230", "#F6E06A"] : ["#93A07A", "#A9B48F", "#7E8C66"];
    for (let i = 0; i < 22; i++) {
      const a = jvAlea(i * 3 + j) * Math.PI * 2, d = 0.3 + jvAlea(i * 5 + j) * 0.7;
      x.fillStyle = ombre(teintes[i % 3]);
      jvOvale(x, px - 8 * k + bal + Math.cos(a) * 46 * d * k + Math.sin(t * e.souffle + i) * e.vent * 0.03, py - 66 * k + Math.sin(a) * 22 * d * k, (11 + (i % 3) * 3) * k, (7 + (i % 2) * 2) * k, a * 0.2);
    }
    if (!mimosa && (nomS === "automne" || nomS === "hiver")) {
      x.fillStyle = ombre("#3A2F3A");
      for (let i = 0; i < 10; i++) jvRond(x, px - 40 * k + jvAlea(i + j * 9) * 70 * k, py - 80 * k + jvAlea(i + 30) * 34 * k, 1.8 * k);
    }
  });
  // Restanques de pierre sèche, rangs de lavande
  [HZ + 96, HZ + 156].forEach((y, r) => {
    for (let px = -8 + r * 9; px < W; px += 16) {
      x.fillStyle = ombre(jvAlea(px + r * 3) > 0.5 ? "#BBA98A" : "#A8957A");
      jvOvale(x, px + 8, y + 8, 8, 5);
      jvOvale(x, px + 16, y + 15, 7, 4.5);
    }
    for (let i = 0; i < W / 26; i++) {
      const lx = 13 + i * 26 + r * 9, ly = y, b = Math.sin(t * e.souffle * 1.2 + i + r) * (0.6 + e.vent * 0.05);
      x.fillStyle = ombre(s.lavande[1]); x.beginPath(); x.ellipse(lx, ly, 11, 9, 0, Math.PI, 0); x.fill();
      if (nomS === "ete" || nomS === "printemps") {
        x.strokeStyle = ombre(s.lavande[0]); x.lineWidth = nomS === "ete" ? 2.4 : 1.4;
        for (let k = -4; k <= 4; k += 2) jvTrait(x, lx + k, ly - 5, lx + k * 1.6 + b, ly - (nomS === "ete" ? 15 : 11) + Math.abs(k));
      }
      if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.85); x.beginPath(); x.ellipse(lx, ly - 4, 8, 3, 0, Math.PI, 0); x.fill(); }
    }
  });
  jvHerbes(x, e, 8, 1, 0, s.herbe, nomS === "automne" ? "#E1D2A8" : null);
  jvHerbes(x, e, W - 30, -1, 1, s.herbe, null);
  if (nomS === "ete" && e.c.jour > 0.6) jvMartinets(x, e, HZ * 0.4);
}

function decorMontagne(x, e) {
  const { W, H, HZ, s, nomS, t, ombre } = e;
  // Sommets en pics, une face à l'ombre, enneigés selon la saison
  const base = HZ - 40;
  const PICS = [{ p: 0.1, h: 140, w: 0.34 }, { p: 0.38, h: 196, w: 0.38 }, { p: 0.68, h: 166, w: 0.32 }, { p: 0.94, h: 132, w: 0.28 }];
  const sommet = xn => {
    let y = 0;
    PICS.forEach(k => { y = Math.max(y, k.h * Math.pow(Math.max(0, 1 - Math.abs(xn - k.p) / (k.w / 2)), 0.95)); });
    return base - 20 - y - Math.abs(Math.sin(xn * 47)) * 5;
  };
  const cimes = () => { x.beginPath(); x.moveTo(0, base + 20); for (let i = 0; i <= 80; i++) x.lineTo(i / 80 * W, sommet(i / 80)); x.lineTo(W, base + 20); x.closePath(); };
  x.fillStyle = ombre(jvMel(e.bas, "#6D7C8C", 0.5)); cimes(); x.fill();
  const limite = e.m.neige ? base - 40 : { hiver: base - 50, printemps: base - 110, ete: base - 160, automne: base - 140 }[nomS];
  x.save(); cimes(); x.clip();
  x.fillStyle = jvRgba(e.blanc, 0.92);
  x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0);
  for (let i = 60; i >= 0; i--) x.lineTo(i / 60 * W, limite + Math.sin(i * 1.7) * 9 + Math.sin(i * 4.3) * 5);
  x.fill();
  x.fillStyle = jvRgba("#1E2A3A", 0.22);
  PICS.forEach(k => {
    const px = k.p * W, py = base - 20 - k.h;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + k.w * W * 0.5, base + 20); x.lineTo(px + k.w * W * 0.12, base + 20); x.closePath(); x.fill();
  });
  x.restore();
  jvBrume(x, e, base, 26, 0.6);
  // Versant de forêt et ses sapins
  const crete = xn => HZ - 20 - Math.sin(xn * 3.4 + 1) * 14;
  x.fillStyle = ombre(jvMel(e.bas, "#2F4A3A", 0.62));
  x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= 40; i++) x.lineTo(i / 40 * W, crete(i / 40)); x.lineTo(W, H); x.fill();
  for (let i = 0; i < 46 * W / 390; i++) {
    const xn = jvAlea(i * 7), cx = xn * W, cy = crete(xn) + 4, h = 12 + jvAlea(i) * 8;
    x.fillStyle = ombre(jvMel(e.bas, "#2A4434", 0.68));
    x.beginPath(); x.moveTo(cx - h * 0.35, cy); x.lineTo(cx, cy - h); x.lineTo(cx + h * 0.35, cy); x.fill();
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.75); x.beginPath(); x.moveTo(cx - 2, cy - h + 4); x.lineTo(cx, cy - h); x.lineTo(cx + 2, cy - h + 4); x.fill(); }
  }
  jvBrume(x, e, HZ - 4, 16, 0.4 + e.m.brume * 0.3);
  jvSol(x, e, e.neigeux ? "#E9ECEC" : s.terre, HZ + 6);
  // Le chalet, son balcon fleuri et sa fumée
  {
    const x0 = W * 0.56, w = 118, y = HZ + 54, hm = 34;
    x.fillStyle = ombre("#8E8A82"); x.fillRect(x0, y - 10, w, 10);
    x.fillStyle = ombre("#8A5A36"); x.fillRect(x0, y - hm, w, hm - 10);
    x.strokeStyle = ombre("#6E4628"); x.lineWidth = 0.8;
    for (let k = 1; k < 5; k++) jvTrait(x, x0, y - hm + k * 5, x0 + w, y - hm + k * 5);
    x.fillStyle = ombre("#5A4636");
    x.beginPath(); x.moveTo(x0 - 14, y - hm + 2); x.lineTo(x0 + w / 2, y - hm - 30); x.lineTo(x0 + w + 14, y - hm + 2); x.fill();
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.95); x.beginPath(); x.moveTo(x0 - 14, y - hm); x.lineTo(x0 + w / 2, y - hm - 31); x.lineTo(x0 + w + 14, y - hm); x.lineTo(x0 + w / 2, y - hm - 25); x.fill(); }
    x.fillStyle = ombre("#7A7470"); x.fillRect(x0 + w * 0.72, y - hm - 30, 8, 14);
    jvFumee(x, e, x0 + w * 0.72 + 4, y - hm - 32);
    [0.18, 0.44, 0.7].forEach((f, i) => jvFenetre(x, e, x0 + w * f, y - hm + 5, 10, 10, i + 21));
    x.strokeStyle = ombre("#4A3222"); x.lineWidth = 1.2; jvTrait(x, x0 + 4, y - hm + 18, x0 + w - 4, y - hm + 18);
    if (nomS === "ete" || nomS === "printemps") {
      for (let i = 0; i < 16; i++) { x.fillStyle = ombre(i % 3 ? "#D2382E" : "#4E7A34"); jvRond(x, x0 + 6 + i * 7, y - hm + 16 - (i % 2), 2.2); }
    }
  }
  // Clôture de perches en biais
  x.strokeStyle = ombre("#7C6448"); x.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const px = i * W * 0.06, py = HZ + 72 + i * 5;
    jvTrait(x, px, py, px, py - 16);
    if (i) { jvTrait(x, px - W * 0.06, py - 5 - 13, px, py - 13); jvTrait(x, px - W * 0.06, py - 5 - 6, px, py - 6); }
  }
  // Prairie alpine, rocaille et ses coussins fleuris
  if (s.touches && !e.neigeux) jvSemis(x, e, s.touches, HZ + 90, H - 40, 60, s.herbe);
  [[W * 0.4, HZ + 128, 16], [W * 0.46, HZ + 134, 11], [W * 0.34, HZ + 136, 9]].forEach(([rx, ry, r], i) => {
    x.fillStyle = ombre(i % 2 ? "#8F918C" : "#A2A39C"); x.beginPath(); x.ellipse(rx, ry, r, r * 0.7, 0, Math.PI, 0); x.fill();
    if (s.coussin) { x.fillStyle = ombre(s.coussin); for (let k = 0; k < 6; k++) jvRond(x, rx - r + 4 + k * r / 3, ry + 1, 2); }
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.9); x.beginPath(); x.ellipse(rx, ry - r * 0.45, r * 0.8, r * 0.28, 0, Math.PI, 0); x.fill(); }
  });
  // Deux grands sapins au premier plan
  [[W * 0.1, HZ + 160, 140], [W * 0.93, HZ + 150, 110]].forEach(([cx, base, L], j) => {
    const b = Math.sin(t * e.souffle * 0.6 + j) * e.vent * 0.05;
    x.fillStyle = ombre("#4A3A2E"); x.fillRect(cx - 3, base - 12, 6, 12);
    for (let k = 0; k < 6; k++) {
      const yb = base - 10 - k * L / 7, w = (L * 0.32) * (1 - k / 7), sw = b * k / 6;
      x.fillStyle = ombre(k % 2 ? "#2C4A36" : "#335640");
      x.beginPath(); x.moveTo(cx - w + sw, yb); x.lineTo(cx + sw, yb - L / 4); x.lineTo(cx + w + sw, yb); x.fill();
      if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.9); x.beginPath(); x.moveTo(cx - w * 0.7 + sw, yb - 2); x.lineTo(cx + sw, yb - L / 5); x.lineTo(cx + w * 0.7 + sw, yb - 2); x.lineTo(cx + sw, yb - L / 8); x.fill(); }
    }
  });
  jvHerbes(x, e, W * 0.3, 1, 2, s.herbe, null);
  jvRosee(x, e);
}

function decorEst(x, e) {
  const { W, H, HZ, s, nomS, t, ombre } = e;
  // La plaine, un village et son clocher au loin
  jvCrete(x, e, HZ - 34, 3, 2, 0.3, ombre(jvMel(e.bas, "#7A8466", 0.4)));
  jvVillage(x, e, W * 0.28, HZ - 34, ombre(jvMel(e.bas, "#6D7480", 0.45)), true);
  jvVillage(x, e, W * 0.86, HZ - 32, ombre(jvMel(e.bas, "#6D7480", 0.4)), false);
  jvBrume(x, e, HZ - 30, 14, 0.5);
  jvCrete(x, e, HZ - 12, 4, 3, 1, ombre(jvMel(e.bas, s.terre, 0.6)));
  jvSol(x, e, s.terre, HZ);
  // Maison à colombages, toit raide, nid de cigognes
  {
    const x0 = W * 0.62, w = W * 0.3, y = HZ + 36, hm = 40;
    x.fillStyle = ombre("#EDE3CF"); x.fillRect(x0, y - hm, w, hm);
    x.strokeStyle = ombre("#6B4A32"); x.lineWidth = 2;
    x.strokeRect(x0, y - hm, w, hm); jvTrait(x, x0, y - hm / 2, x0 + w, y - hm / 2);
    for (let k = 1; k < 4; k++) jvTrait(x, x0 + w * k / 4, y - hm, x0 + w * k / 4, y);
    jvTrait(x, x0, y - hm / 2, x0 + w / 4, y - hm); jvTrait(x, x0 + w * 3 / 4, y - hm, x0 + w, y - hm / 2);
    jvTrait(x, x0 + w / 4, y, x0 + w / 2, y - hm / 2); jvTrait(x, x0 + w / 2, y - hm / 2, x0 + w * 3 / 4, y);
    x.fillStyle = ombre("#9C4E36"); x.beginPath(); x.moveTo(x0 - 6, y - hm); x.lineTo(x0 + w / 2, y - hm - 44); x.lineTo(x0 + w + 6, y - hm); x.fill();
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.92); x.beginPath(); x.moveTo(x0 - 6, y - hm); x.lineTo(x0 + w / 2, y - hm - 44); x.lineTo(x0 + w + 6, y - hm); x.lineTo(x0 + w / 2, y - hm - 36); x.fill(); }
    [[0.1, 0.62], [0.58, 0.62], [0.1, 0.12], [0.58, 0.12]].forEach(([fx, fy], i) => jvFenetre(x, e, x0 + w * fx + 4, y - hm + hm * fy + 2, 9, 9, i + 31));
    const cx = x0 + w * 0.7, cy = y - hm - 30;
    x.fillStyle = ombre("#A04A34"); x.fillRect(cx, cy, 8, 16);
    if (nomS === "printemps" || nomS === "ete") {
      x.fillStyle = ombre("#6E5638"); jvOvale(x, cx + 4, cy, 12, 4);
      x.fillStyle = ombre("#F4F2EC"); jvOvale(x, cx + 4, cy - 8, 6, 4); jvRond(x, cx + 9, cy - 15, 2.4);
      x.strokeStyle = ombre("#F4F2EC"); x.lineWidth = 1.6; jvTrait(x, cx + 8, cy - 9, cx + 9, cy - 14);
      x.fillStyle = ombre("#24282A"); jvOvale(x, cx + 1, cy - 8, 4, 2.6);
      x.strokeStyle = ombre("#D2502E"); x.lineWidth = 1.4; jvTrait(x, cx + 11, cy - 15, cx + 16, cy - 13);
    }
  }
  // Le verger de mirabelliers, en rangs
  [[HZ + 30, 0.5, 8, 0.02, 0.56], [HZ + 74, 0.7, 5, 0.06, 0.55], [HZ + 140, 0.95, 3, 0.1, 0.9]].forEach(([y, k, n, x0, l]) => {
    for (let i = 0; i < n; i++) jvArbre(x, e, W * (x0 + i * l / Math.max(1, n - 1)) + (jvAlea(i + y) - 0.5) * 8, y, k, s.houppier, s.fruit, nomS === "ete");
    x.fillStyle = ombre(jvMel(s.terre, s.herbe, 0.4)); x.fillRect(0, y + 2, W, 3);
  });
  // Échelle et panier de mirabelles, l'été
  if (nomS === "ete") {
    x.strokeStyle = ombre("#8A6E4A"); x.lineWidth = 1.8;
    const ex = W * 0.34, ey = HZ + 140;
    jvTrait(x, ex, ey, ex + 16, ey - 70); jvTrait(x, ex + 10, ey, ex + 26, ey - 70);
    for (let k = 1; k < 7; k++) jvTrait(x, ex + k * 16 / 7, ey - k * 10, ex + 10 + k * 16 / 7, ey - k * 10);
    x.fillStyle = ombre("#9A7448"); x.beginPath(); x.ellipse(W * 0.58, H - 70, 16, 9, 0, 0, Math.PI); x.fill();
    x.fillStyle = ombre("#E8C03A"); for (let k = 0; k < 9; k++) jvRond(x, W * 0.58 - 12 + k * 3, H - 71 - (k % 2) * 2, 2.6);
  }
  if (s.touches) jvSemis(x, e, s.touches, HZ + 150, H - 40, 40, s.herbe);
  jvHerbes(x, e, 8, 1, 0, s.herbe, null);
  jvHerbes(x, e, W - 30, -1, 1, s.herbe, nomS === "automne" ? "#D9C79A" : null);
  // Une cigogne qui passe, au printemps et l'été
  if ((nomS === "printemps" || nomS === "ete") && e.c.jour > 0.6 && !e.m.pluie) {
    const bx = ((t * 7) % (W + 160)) - 80, by = HZ * 0.34 + Math.sin(t * 0.4) * 10, ai = Math.sin(t * 1.6) * 5;
    x.strokeStyle = ombre("#F4F2EC"); x.lineWidth = 3;
    x.beginPath(); x.moveTo(bx - 16, by - ai); x.quadraticCurveTo(bx - 6, by - 4, bx, by); x.quadraticCurveTo(bx + 6, by - 4, bx + 16, by - ai); x.stroke();
    x.strokeStyle = ombre("#24282A"); x.lineWidth = 3; jvTrait(x, bx - 16, by - ai, bx - 11, by - 3 - ai * 0.5); jvTrait(x, bx + 16, by - ai, bx + 11, by - 3 - ai * 0.5);
    x.strokeStyle = ombre("#F4F2EC"); x.lineWidth = 2; jvTrait(x, bx, by, bx + 12, by + 1);
    x.strokeStyle = ombre("#D2502E"); x.lineWidth = 1.2; jvTrait(x, bx + 12, by + 1, bx + 18, by + 2); jvTrait(x, bx - 2, by, bx - 14, by + 2);
  }
  jvRosee(x, e);
}

function decorVille(x, e) {
  const { W, H, HZ, s, nomS, t, ombre } = e;
  // Les toits de la ville au loin
  x.fillStyle = ombre(jvMel(e.bas, "#7D8794", 0.45));
  for (let px = -10, i = 0; px < W; i++) {
    const w = 26 + jvAlea(i) * 30, h = 40 + jvAlea(i + 3) * 70;
    x.fillRect(px, HZ - 40 - h, w, h + 40);
    px += w + 2;
  }
  jvBrume(x, e, HZ - 60, 30, 0.4);
  // Les immeubles d'en face : façades, toits de zinc, cheminées, fenêtres
  for (let px = -20, i = 0; px < W; i++) {
    const w = 70 + jvAlea(i + 9) * 40, h = 60 + jvAlea(i + 13) * 30, y = HZ + 40;
    x.fillStyle = ombre(i % 2 ? "#D9CFBE" : "#E2D8C6"); x.fillRect(px, y - h, w, h);
    x.fillStyle = ombre("#6D7A88");
    x.beginPath(); x.moveTo(px - 2, y - h); x.lineTo(px + 8, y - h - 20); x.lineTo(px + w - 8, y - h - 20); x.lineTo(px + w + 2, y - h); x.fill();
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.85); x.fillRect(px + 8, y - h - 22, w - 16, 3); }
    for (let k = 0; k < 3; k++) { x.fillStyle = ombre("#B86A4A"); x.fillRect(px + 14 + k * (w - 28) / 2, y - h - 28, 4, 8); }
    for (let r = 0; r < 3; r++) for (let c = 0; c < Math.floor(w / 18); c++) {
      jvFenetre(x, e, px + 6 + c * 18, y - h + 8 + r * 20, 8, 12, i * 31 + r * 7 + c + Math.floor(t / 23) * (c === 1 ? 1 : 0));
    }
    if (e.c.jour > 0.5) {
      for (let k = 0; k < 2; k++) { x.fillStyle = ombre("#8A8E94"); jvOvale(x, px + 20 + k * 22 + Math.sin(t * 0.2 + i) * 3, y - h - 21, 3.4, 2.4); }
    }
    px += w + 10;
  }
  // Le sol du balcon, puis la rambarde de fer forgé
  const yR = HZ + 104;
  x.fillStyle = ombre("#B9A894"); x.fillRect(0, yR, W, H - yR);
  x.strokeStyle = ombre("#A3927E"); x.lineWidth = 0.8;
  for (let k = 0; k < 8; k++) jvTrait(x, 0, yR + 14 + k * k * 4, W, yR + 14 + k * k * 4);
  x.strokeStyle = ombre("#2E3236"); x.lineWidth = 1.6;
  jvTrait(x, 0, HZ + 40, W, HZ + 40); jvTrait(x, 0, yR, W, yR);
  for (let px = 4; px < W; px += 9) jvTrait(x, px, HZ + 40, px, yR);
  x.lineWidth = 1;
  for (let px = 9; px < W; px += 36) { x.beginPath(); x.arc(px + 4, HZ + 56, 5, 0, 7); x.stroke(); }
  // Jardinières accrochées à la rambarde
  for (let i = 0; i < 3; i++) {
    const jx = W * (0.06 + i * 0.34), jy = HZ + 46, jw = W * 0.24;
    x.fillStyle = ombre("#B5643E"); x.fillRect(jx, jy, jw, 14);
    x.fillStyle = ombre("#9A5232"); x.fillRect(jx, jy, jw, 3);
    for (let k = 0; k < 6; k++) {
      const fx = jx + 6 + k * (jw - 12) / 5, b = Math.sin(t * e.souffle * 1.3 + k + i) * (0.8 + e.vent * 0.05);
      x.fillStyle = ombre(s.jardiniere ? "#4E7A3A" : "#5A6A4E"); jvOvale(x, fx, jy - 3, 6, 4);
      if (s.jardiniere) { jvFleur(x, fx + b, jy - 9 - (k % 2) * 3, 2, ombre(s.jardiniere[(k + i) % s.jardiniere.length]), ombre("#F2D05A")); }
    }
    if (e.neigeux) { x.fillStyle = jvRgba(e.blanc, 0.9); x.fillRect(jx, jy - 3, jw, 3); }
  }
  // Pots sur le sol du balcon
  [[W * 0.16, 1], [W * 0.5, 0.8], [W * 0.86, 1.1]].forEach(([px, k], i) => {
    const py = yR + 70;
    x.fillStyle = ombre("#B86A44"); x.beginPath(); x.moveTo(px - 14 * k, py - 26 * k); x.lineTo(px + 14 * k, py - 26 * k); x.lineTo(px + 10 * k, py); x.lineTo(px - 10 * k, py); x.fill();
    const b = Math.sin(t * e.souffle + i) * (1 + e.vent * 0.06);
    if (i === 0) { // un tomate l'été, sinon un aromate
      x.strokeStyle = ombre("#7A6A50"); x.lineWidth = 1.4; jvTrait(x, px, py - 26 * k, px + b * 0.3, py - 76 * k);
      x.fillStyle = ombre(nomS === "hiver" ? "#7A8A6A" : "#4E8A3A");
      for (let j = 0; j < 7; j++) jvOvale(x, px + (j % 2 ? 6 : -6) + b * 0.4, py - 32 * k - j * 6 * k, 5, 3, j);
      if (nomS === "ete") { x.fillStyle = ombre("#D2402E"); [[4, -40], [-5, -52], [5, -60]].forEach(([dx, dy]) => jvRond(x, px + dx + b * 0.4, py + dy * k, 3.2)); }
    } else if (i === 1) { // un olivier en pot
      x.strokeStyle = ombre("#6E665A"); x.lineWidth = 2.4; jvTrait(x, px, py - 26 * k, px + b * 0.2, py - 56 * k);
      for (let j = 0; j < 12; j++) { x.fillStyle = ombre(j % 2 ? "#93A07A" : "#A9B48F"); jvOvale(x, px + b * 0.4 + Math.cos(j) * 14, py - 64 * k + Math.sin(j * 1.7) * 8, 5, 2.4, j); }
    } else { // des herbes
      for (let j = 0; j < 14; j++) { x.strokeStyle = ombre("#5E8A4A"); x.lineWidth = 1.2; jvTrait(x, px - 8 + j, py - 26 * k, px - 12 + j * 1.6 + b, py - 44 * k - (j % 3) * 4); }
    }
  });
  // Guirlande lumineuse sur la rambarde, les nuits d'hiver
  if (nomS === "hiver" && e.allume > 0.2) {
    for (let i = 0; i < W / 14; i++) {
      const gx = 6 + i * 14, gy = HZ + 40 + Math.sin(i * 0.9) * 3 + 3, a = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3);
      const g = x.createRadialGradient(gx, gy, 0, gx, gy, 6);
      g.addColorStop(0, `rgba(255,220,140,${(e.allume * a).toFixed(2)})`); g.addColorStop(1, "rgba(255,220,140,0)");
      x.fillStyle = g; x.fillRect(gx - 6, gy - 6, 12, 12);
    }
  }
  if (nomS === "ete" && e.c.jour > 0.6) jvMartinets(x, e, HZ * 0.4);
}

/* Les couleurs de saison de chaque thème, et ce que portent sa branche et sa
   chute. Les champs communs : ciel, le bleu du jour par beau temps ; chute,
   ce qui tombe ; branche, l'essence de la branche du coin haut droit. */
const JV_THEMES = {
  japonais: { nom: "Jardin japonais", climat: null, branche: "erable", decor: decorJaponais,
    oiseaux: ["printemps", "automne"], papillons: true, lucioles: true,
    saisons: {
      printemps: { terre: "#8AAE68", buisson: "#4A7D44", herbe: "#6B9A4C", ciel: ["#9CC3DC", "#EEF0E4"], mont: "#6E93A6",
        azalee: "#E2668E", touches: ["#F4B6C6", "#F2CF4A", "#FFFFFF", "#AE96DA", "#F08A9E"], pin: "#3E7246",
        houppier: ["#F3BCCA", "#F8D6DF", "#EAA0B4"], potager: "salades", chute: JV_PETALES(["#F4B6C6", "#FBE3EA"]),
        rameau: { fleur: "#F4B6C6", coeur: "#C8406A" } },
      ete: { terre: "#6FA04A", buisson: "#2E6E36", herbe: "#4E9038", ciel: ["#7FB2D8", "#E6EEE6"], mont: "#5E879C",
        touches: ["#EAB02E", "#D9507A", "#7B62C0", "#EC7F32", "#FFFFFF"], pin: "#2F6538",
        houppier: ["#4E9440", "#6BAD50", "#3E7E36"], potager: "courges", rameau: { feuille: ["#3E7D34", "#5DA044", "#7DB653"] } },
      automne: { terre: "#8D7C5A", buisson: "#7B4B30", herbe: "#A18B5E", mont: "#3C4752", pin: "#3B5C3D",
        houppier: ["#D66A2E", "#E8A23C", "#B8452C"], potager: "potirons", chute: { forme: "momiji", couleurs: ["#B2402C", "#C7783A", "#9C3326"] },
        rameau: { feuille: ["#B2402C", "#C7783A", "#9C3326"] } },
      hiver: { terre: "#B5B8B0", buisson: "#4A5550", herbe: "#998E77", mont: "#3C4752", pin: "#34493F", potager: "paille", rameau: {} },
    } },
  campagne: { nom: "Potager de campagne", climat: "oceanique_degrade", branche: "pommier", decor: decorCampagne,
    oiseaux: ["printemps", "automne", "hiver"], papillons: true, lucioles: true, martinets: true,
    saisons: {
      printemps: { terre: "#86A862", herbe: "#6B9A4C", haie: "#4E7A40", ciel: ["#9EC2D8", "#EEF0E4"],
        houppier: ["#F6E3E6", "#FFFFFF", "#EBC4CC"], chute: JV_PETALES(["#F8E8EC", "#FFFFFF"]), rameau: { fleur: "#FBF0F2", coeur: "#D98A9A" } },
      ete: { terre: "#7FA052", herbe: "#5E8E40", haie: "#3E6A34", ciel: ["#86B6D8", "#E8EEE4"],
        houppier: ["#5E9444", "#77AD55", "#4A7E38"], fruit: "#C8372D", rameau: { feuille: ["#5E9444", "#77AD55"], fruit: "#C8372D" } },
      automne: { terre: "#8E7C56", herbe: "#9A8A5A", haie: "#6E5A34",
        houppier: ["#D9A23A", "#C9842E", "#A8B04A"], fruit: "#C8372D", chute: JV_FEUILLES(["#D9A23A", "#C9842E", "#B5662E"]),
        rameau: { feuille: ["#D9A23A", "#C9842E"], fruit: "#C8372D" } },
      hiver: { terre: "#AEB2A6", herbe: "#9A927A", haie: "#4E5A4C", rameau: {} },
    } },
  mer: { nom: "Jardin de bord de mer", climat: "oceanique", branche: "tamaris", decor: decorMer,
    oiseaux: [], papillons: true, lucioles: false,
    saisons: {
      printemps: { terre: "#8EAE6E", herbe: "#7E9E5A", sable: "#E3D3A8", mer: "#4F8BA6", ciel: ["#9AC6E0", "#EEF2EC"],
        tamaris: ["#E7A9C2", "#F2C4D6", "#7C9A6A"], hortensia: null, chute: JV_PETALES(["#EDB5CB"]), rameau: { plume: "#E7A9C2" } },
      ete: { terre: "#7EA05A", herbe: "#8EA05E", sable: "#E8D7A8", mer: "#3E86A8", ciel: ["#7DB6DC", "#EAF0EC"],
        tamaris: ["#E7A9C2", "#7C9A6A", "#8EAA78"], hortensia: ["#6F8FD0", "#E79BB8", "#8FA8E0"], rameau: { plume: "#E7A9C2" } },
      automne: { terre: "#8A8A5E", herbe: "#A09A66", sable: "#D9CBA2", mer: "#4A7488",
        tamaris: ["#8EA06E", "#A8A870", "#7C8A60"], hortensia: ["#B9A2A8", "#9BA0B8", "#A8908A"], chute: JV_FEUILLES(["#B8A55A", "#9C8A4A"]), rameau: { plume: null } },
      hiver: { terre: "#A6ACA2", herbe: "#9A9478", sable: "#CFC6AE", mer: "#4C6676",
        tamaris: ["#8A7E70", "#9A8E7E", "#7E7468"], hortensia: null, rameau: {} },
    } },
  mediterraneen: { nom: "Jardin méditerranéen", climat: "mediterraneen", branche: "olivier", decor: decorMediterraneen,
    oiseaux: ["printemps", "automne"], papillons: true, lucioles: true,
    saisons: {
      printemps: { terre: "#B3A578", herbe: "#8E9A5E", ciel: ["#8EC0E2", "#F0EEE2"], lavande: ["#9C9AC0", "#8E9A7A"],
        chute: JV_PETALES(["#F6E6EA", "#FFFFFF"]), rameau: {} },
      ete: { terre: "#C2AE78", herbe: "#B5A46A", ciel: ["#6FAEDC", "#F2ECDC"], lavande: ["#7C5CB0", "#7E8A6A"], rameau: {} },
      automne: { terre: "#B09A6E", herbe: "#A8996A", ciel: ["#9CC0D8", "#EEE8DA"], lavande: ["#8F86A0", "#7E8670"],
        chute: JV_FEUILLES(["#9AA57E", "#B7B08A"]), rameau: { olive: true } },
      hiver: { terre: "#A9A286", herbe: "#9A9474", lavande: ["#9A9C92", "#8A8E80"], rameau: { olive: true } },
    } },
  montagne: { nom: "Jardin de montagne", climat: "montagnard", branche: "sapin", decor: decorMontagne,
    oiseaux: ["printemps", "ete", "automne"], papillons: true, lucioles: false,
    saisons: {
      printemps: { terre: "#86A866", herbe: "#6E9A4E", ciel: ["#94C0E0", "#EEF2EE"], touches: ["#3F5FC8", "#F2D04A", "#FFFFFF", "#E7A9C2"],
        coussin: "#F2B8CC", rameau: {} },
      ete: { terre: "#78A04E", herbe: "#5E9040", ciel: ["#78B2DE", "#EAF0EC"], touches: ["#F2C230", "#C64B7A", "#FFFFFF", "#7A6CC8", "#3F5FC8"],
        coussin: "#FFFFFF", rameau: { cone: true } },
      automne: { terre: "#9C8656", herbe: "#B09A5E", coussin: null,
        chute: { forme: "aiguille", couleurs: ["#D9A93A", "#E2BC4E", "#C8922E"] }, rameau: { cone: true } },
      hiver: { terre: "#E9ECEC", herbe: "#9A927A", coussin: null, rameau: {} },
    } },
  est: { nom: "Verger de l'Est", climat: "semi_continental", branche: "mirabellier", decor: decorEst,
    oiseaux: ["automne", "hiver"], papillons: true, lucioles: true,
    saisons: {
      printemps: { terre: "#8AAA64", herbe: "#6E9A4C", ciel: ["#9CC2DC", "#EEF0E6"], houppier: ["#FFFFFF", "#F3EEE6", "#E4ECD4"],
        touches: ["#F2D04A", "#FFFFFF", "#AE96DA"], chute: JV_PETALES(["#FFFFFF", "#F3EEE6"]), rameau: { fleur: "#FFFFFF", coeur: "#C9B04A" } },
      ete: { terre: "#86A456", herbe: "#6A9444", ciel: ["#84B4D8", "#ECEEE2"], houppier: ["#5E8E44", "#6FA052", "#4E7E3A"],
        fruit: "#E8C03A", touches: ["#F2D04A", "#D9507A", "#FFFFFF"], rameau: { feuille: ["#5E8E44", "#6FA052"], fruit: "#E8C03A" } },
      automne: { terre: "#948058", herbe: "#9E8E5C", houppier: ["#E3B23C", "#D58A2E", "#C9A03E"],
        chute: JV_FEUILLES(["#E3B23C", "#D58A2E"]), rameau: { feuille: ["#E3B23C", "#D58A2E"] } },
      hiver: { terre: "#B3B6AE", herbe: "#9C947C", rameau: {} },
    } },
  ville: { nom: "Jardin de ville", climat: null, branche: "glycine", decor: decorVille,
    oiseaux: [], papillons: false, lucioles: false,
    saisons: {
      printemps: { ciel: ["#9EC2D8", "#EEEEE6"], jardiniere: ["#D9382E", "#F2C83A", "#F4B6C6"],
        chute: JV_PETALES(["#B7A4E0", "#9C86D0"]), rameau: { grappe: true } },
      ete: { ciel: ["#88B6D8", "#ECECE4"], jardiniere: ["#D2382E", "#E8586E", "#FFFFFF"], rameau: { feuille: ["#5E8E44", "#77A552"] } },
      automne: { jardiniere: ["#C86A2E", "#8E5AA8", "#E3A43A"], chute: JV_FEUILLES(["#C9A04A", "#A8783A"]),
        rameau: { feuille: ["#D9B03A", "#C9963A"] } },
      hiver: { jardiniere: null, rameau: {} },
    } },
};
// Le thème qui répond au climat du jardin, quand le fond suit le climat.
const JV_THEME_DU_CLIMAT = { oceanique: "mer", oceanique_degrade: "campagne", semi_continental: "est",
  mediterraneen: "mediterraneen", montagnard: "montagne" };

/* La branche du coin haut droit, selon son essence et la saison. */
function jvRameau(x, e, segs, essence) {
  const { t, souffle, vent, ombre, neigeux } = e, r = e.s.rameau || {};
  const W = e.W;
  const rot = Math.sin(t * souffle * 0.55) * (0.006 + vent * 0.0007);
  x.save(); x.translate(W + 8, 30); x.rotate(rot); x.translate(-W - 8, -30);
  x.lineCap = "round";
  const encre = ombre(essence === "olivier" ? "#4E463C" : essence === "tamaris" ? "#4A3A30" : "#24282A");
  segs.forEach(sg => {
    x.strokeStyle = jvRgba(encre, 0.9); x.lineWidth = sg.ep;
    x.beginPath(); x.moveTo(sg.x, sg.y); x.quadraticCurveTo(sg.cx, sg.cy, sg.x2, sg.y2); x.stroke();
    x.strokeStyle = jvRgba(encre, 0.35); x.lineWidth = sg.ep * 0.5;
    x.beginPath(); x.moveTo(sg.x, sg.y + sg.ep * 0.4); x.quadraticCurveTo(sg.cx, sg.cy + sg.ep * 0.5, sg.x2, sg.y2 + sg.ep * 0.3); x.stroke();
  });
  // Le sapin porte ses aiguilles le long des rameaux, en un seul tracé.
  if (essence === "sapin") {
    x.strokeStyle = ombre("#2E5238"); x.lineWidth = 1.2; x.beginPath();
    segs.forEach(sg => {
      if (sg.d < 1) return;
      const L = Math.hypot(sg.x2 - sg.x, sg.y2 - sg.y), ux = (sg.x2 - sg.x) / L, uy = (sg.y2 - sg.y) / L;
      for (let k = 2; k < L; k += 3) {
        const px = sg.x + ux * k, py = sg.y + uy * k, n = 6 + (sg.d < 3 ? 2 : 0);
        x.moveTo(px, py); x.lineTo(px - uy * n + ux * 3, py + ux * n + uy * 3);
        x.moveTo(px, py); x.lineTo(px + uy * n + ux * 3, py - ux * n + uy * 3);
      }
    });
    x.stroke();
  }
  if (neigeux) {
    segs.forEach(sg => {
      if (sg.d > 3) return;
      x.strokeStyle = jvRgba(e.blanc, 0.92); x.lineWidth = Math.max(1.4, sg.ep * (essence === "sapin" ? 0.9 : 0.45));
      x.beginPath(); x.moveTo(sg.x, sg.y - sg.ep * 0.45); x.quadraticCurveTo(sg.cx, sg.cy - sg.ep * 0.5, sg.x2, sg.y2 - sg.ep * 0.3); x.stroke();
    });
  }
  segs.forEach((sg, i) => {
    if (sg.d < 3) return;
    const fl = Math.sin(t * souffle * 1.8 + i) * vent * 0.025;
    for (let j = 0; j < 6; j++) {
      const fx = sg.x2 + (jvAlea(sg.g + j) - 0.5) * 18 + fl, fy = sg.y2 + (jvAlea(sg.g + j + 7) - 0.5) * 12, a = jvAlea(sg.g + j) * 6;
      if (essence === "olivier") {
        x.fillStyle = ombre(j % 2 ? "#8E9C74" : "#C3CBB0"); jvOvale(x, fx, fy, 6, 1.6, a);
        if (r.olive && j % 3 === 0) { x.fillStyle = ombre("#3A2F3A"); jvRond(x, fx + 2, fy + 3, 2); }
        continue;
      }
      if (essence === "tamaris") {
        x.strokeStyle = ombre(r.plume === undefined ? "#8A7E70" : "#7C9A6A"); x.lineWidth = 0.8;
        jvTrait(x, fx, fy, fx + Math.cos(a) * 8, fy + 6 + Math.sin(a) * 3);
        if (r.plume) { x.fillStyle = ombre(r.plume); jvRond(x, fx + Math.cos(a) * 8, fy + 6 + Math.sin(a) * 3, 1.6); }
        continue;
      }
      if (essence === "sapin") {
        if (r.cone && j === 0 && sg.d === 4) { x.fillStyle = ombre("#7A5634"); jvOvale(x, fx, fy + 6, 2.6, 5); }
        continue;
      }
      if (essence === "glycine" && r.grappe) {
        if (j > 2) continue;
        for (let k = 0; k < 7; k++) { x.fillStyle = ombre(k % 2 ? "#9C86D0" : "#B7A4E0"); jvRond(x, fx + Math.sin(t + k) * 0.6, fy + k * 3.4, 3.2 - k * 0.35); }
        continue;
      }
      if (r.fleur && j < 5) { jvFleur(x, fx, fy, 2.1, ombre(j % 3 ? r.fleur : jvMel(r.fleur, "#FFFFFF", 0.5)), ombre(r.coeur)); continue; }
      if (r.feuille && j < 4) {
        x.fillStyle = ombre(r.feuille[(i + j) % r.feuille.length]);
        if (essence === "erable") jvMomiji(x, fx, fy, 5.5, a); else jvOvale(x, fx, fy, 5, 2.8, a);
        if (r.fruit && j === 0) { x.fillStyle = ombre(r.fruit); jvRond(x, fx + 3, fy + 5, essence === "pommier" ? 4 : 2.6); }
      }
    }
  });
  x.restore();
}

/* ---------- Le style moderne ----------
   D'après la planche de Jérôme : une villa blanche au bardage de bois, un
   bassin miroir et ses marches flottantes, des terrasses et des haies
   taillées, des cyprès devant les monts, une branche qui retombe du coin
   haut droit. La scène est dessinée dans le cadre de la planche, 465 sur 830,
   mise à l'échelle sur la hauteur de l'écran ; le ciel, les monts, l'eau et
   le sol s'étendent sur toute la largeur. */
const JMO = {
  printemps: { ciel: ["#A9CBE8", "#E8EEEC"], mont: ["#8D9FBE", "#A5B5C8"], bosquet: ["#86AE5A", "#A9C878", "#6E9A4C"],
    haie: ["#3F6E3A", "#5E8E4A"], gazon: "#8DB25E", eau: ["#6C9CC4", "#A2C6DE"], sol: "#ECE4D6",
    rameau: "sakura", chute: ["#F6C6D2", "#FBE3EA"] },
  ete: { ciel: ["#78B0E0", "#DCEAF0"], mont: ["#7F94B6", "#98ABC0"], bosquet: ["#6F9A50", "#94B862", "#5E8A44"],
    haie: ["#3A6A36", "#568A44"], gazon: "#86AE58", eau: ["#5A92BE", "#8CBCDA"], sol: "#EAE2D3",
    rameau: "erable", feuille: ["#9DBB3A", "#6E9A2E", "#3E6A2E", "#C2D45A", "#557E2A"] },
  automne: { ciel: ["#F2D3B0", "#F6E6CF"], mont: ["#A39AA8", "#BDB0AE"], bosquet: ["#C9853A", "#D9A24A", "#A8642E"],
    haie: ["#46653A", "#5E7A44"], gazon: "#A9A462", eau: ["#C9B596", "#E2CDAE"], sol: "#EDE3D3",
    rameau: "erable", feuille: ["#E0621E", "#F08A2A", "#C8401E"], chute: ["#E0621E", "#F08A2A", "#C8401E"] },
  hiver: { ciel: ["#B9C8DA", "#E3E8EE"], mont: ["#9AA6BC", "#B6C0CE"], bosquet: ["#8E9C9A", "#A9B4B2"],
    haie: ["#3E5A44", "#4E6A52"], gazon: "#F4F5F3", eau: ["#9EB2C2", "#C6D3DC"], sol: "#F2F3F2", rameau: "nu" },
};
// Une feuille d'érable : cinq lobes dentés autour du pétiole.
function jvErable(x, cx, cy, r, rot) {
  x.beginPath();
  for (let i = 0; i <= 60; i++) {
    const th = i / 60 * Math.PI * 2, lobe = Math.pow(Math.abs(Math.cos(th * 2.5)), 0.7);
    const dent = (i % 3 === 0 ? 0.08 : 0), bas = th > Math.PI * 0.35 && th < Math.PI * 0.65 ? 0.35 : 1;
    const rr = r * (0.42 + 0.58 * lobe * bas + dent);
    const a = th + rot - Math.PI / 2;
    x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  x.closePath(); x.fill();
}
/* Les outils de dessin partagés par les décors illustrés : aplats, feuillages,
   arbres ramifiés, touffes, feuilles rubanées et graminées. */
function jvOutils(x, t, souffle, vent, o, neige, blanc) {
  const rect = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); };
  // Le tirage des feuilles suit une graine fixe : tiré sur la position, il changeait à chaque balancement.
  const couronne = (cx, cy, rx, ry, cols, n, r0, graine) => {
    const gr = graine === undefined ? Math.round(cx) * 13 + Math.round(cy) : graine * 17.3;
    const b0 = Math.sin(t * souffle * 0.5 + gr * 0.01) * vent * 0.02;
    x.fillStyle = o(jvMel(cols[0], "#10241A", 0.35));
    for (let i = 0; i < 9; i++) jvOvale(x, cx + b0 + (jvAlea(i + gr) - 0.5) * rx * 1.2, cy + (jvAlea(i + gr + 0.5) - 0.5) * ry * 1.1, rx * 0.55, ry * 0.55);
    for (let i = 0; i < n * 2; i++) {
      const a = jvAlea(i * 3 + gr) * Math.PI * 2, d = Math.sqrt(jvAlea(i * 7 + gr + 0.25));
      const px = cx + Math.cos(a) * rx * d, py = cy + Math.sin(a) * ry * d;
      const lum = (cy - py) / ry * 0.5 + (cx - px) / rx * 0.3;
      const b = b0 + Math.sin(t * souffle * 0.9 + i * 0.3) * vent * 0.008;
      x.fillStyle = o(jvMel(cols[i % cols.length], lum > 0 ? "#F4F2C8" : "#10241A", Math.min(0.45, Math.abs(lum) * 0.5)));
      jvOvale(x, px + b, py, r0 * (0.55 + jvAlea(i + 5) * 0.45), r0 * (0.32 + jvAlea(i + 9) * 0.2), a + jvAlea(i) * 2);
    }
  };
  // Un arbre ramifié : une charpente qui se divise, et au bout de chaque rameau son bouquet.
  const arbre = (cx, base, h, ep, ouverture, bouquet, graine, prof = 4) => {
    const rameaux = [];
    const pousse = (px, py, ang, len, e2, d, g) => {
      // L'écart s'ajoute de rameau en rameau : il reste faible, même par grand vent.
      const b = Math.sin(t * souffle * 0.45 + d * 0.35) * Math.min(vent, 60) * 0.0008 * d;
      const a = ang + (jvAlea(g) - 0.5) * 0.5 + b, x2 = px + Math.cos(a) * len, y2 = py + Math.sin(a) * len;
      x.strokeStyle = o(d < 2 ? "#4E3A2C" : "#5E4636"); x.lineWidth = e2; x.lineCap = "round";
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo((px + x2) / 2 + (jvAlea(g + 1) - 0.5) * len * 0.3, (py + y2) / 2, x2, y2); x.stroke();
      if (d >= 2) rameaux.push([x2, y2, a, g, d]);
      if (d >= prof) return;
      const n = d === 0 ? 3 : 2;
      for (let k2 = 0; k2 < n; k2++) pousse(x2, y2, a + (k2 - (n - 1) / 2) * ouverture + (jvAlea(g + k2 + 3) - 0.5) * 0.3, len * (0.68 + jvAlea(g + k2) * 0.12), e2 * 0.62, d + 1, g * 3 + k2 + 1);
    };
    pousse(cx, base, -Math.PI / 2, h * 0.24, ep, 0, graine);
    rameaux.forEach(r => bouquet(...r));
  };
  const tronc = (pts, ep) => { x.strokeStyle = o("#5E4636"); x.lineCap = "round"; x.lineWidth = ep; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); };
  const fan = (cx, base, L0, n, col, ep) => {
    x.strokeStyle = o(col); x.lineWidth = ep;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.9, Ln = L0 * (0.7 + jvAlea(i + cx) * 0.4);
      const b = Math.sin(t * souffle * 1.2 + i * 0.3 + cx) * (1.5 + vent * 0.12);
      x.beginPath(); x.moveTo(cx, base); x.quadraticCurveTo(cx + Math.cos(a) * Ln * 0.5, base + Math.sin(a) * Ln * 0.6, cx + Math.cos(a) * Ln + b, base + Math.sin(a) * Ln); x.stroke();
    }
  };
  // Feuilles rubanées : un ruban effilé, courbé, qui ploie au vent.
  const rubans = (cx, base, L0, n, cols, larg) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2, Ln = L0 * (0.6 + jvAlea(i + cx) * 0.5);
      const b = Math.sin(t * souffle * 1.2 + i * 0.4 + cx) * (1.5 + vent * 0.14);
      const tx = cx + Math.cos(a) * Ln + b, ty = base + Math.sin(a) * Ln * 0.85 + Ln * 0.18 * Math.abs(Math.cos(a));
      const mx = cx + Math.cos(a) * Ln * 0.45, my = base + Math.sin(a) * Ln * 0.7;
      x.fillStyle = o(cols[i % cols.length]);
      x.beginPath(); x.moveTo(cx - larg, base); x.quadraticCurveTo(mx - larg, my, tx, ty); x.quadraticCurveTo(mx + larg, my, cx + larg, base); x.fill();
    }
  };
  // Une touffe de graminées : des centaines de brins courbes, des épis duveteux en tête.
  const plumets = (cx, base, L0, n) => {
    const N = n * 6, cols = neige ? ["#B89A6A", "#A88A5A", "#C9AE80"] : ["#C9A46A", "#B58E54", "#DDBE86", "#A07A44"];
    // La masse de la touffe, peinte d'abord, que les brins viennent animer
    const bm = Math.sin(t * souffle * 1.1 + cx) * (2 + vent * 0.16);
    const fond = x.createLinearGradient(0, base - L0, 0, base);
    fond.addColorStop(0, jvRgba(o(neige ? "#EDE9E0" : "#E6CC96"), 0.95)); fond.addColorStop(1, o(neige ? "#8E7650" : "#9A7442"));
    x.fillStyle = fond; x.beginPath(); x.moveTo(cx - 16, base);
    for (let k2 = 0; k2 <= 16; k2++) { const u = k2 / 16 - 0.5, a2 = -Math.PI / 2 + u * 1.6, l2 = L0 * 0.86 * (1 - Math.abs(u) * 0.4); x.lineTo(cx + Math.cos(a2) * l2 + bm, base + Math.sin(a2) * l2); }
    x.lineTo(cx + 16, base); x.closePath(); x.fill();
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1) - 0.5, a = -Math.PI / 2 + u * 1.7 + (jvAlea(i + cx) - 0.5) * 0.2, Ln = L0 * (0.55 + jvAlea(i * 3 + cx) * 0.5) * (1 - Math.abs(u) * 0.35);
      const b = Math.sin(t * souffle * 1.1 + i * 0.05 + cx) * (2 + vent * 0.16) * (Ln / L0);
      // Le brin s'arque puis retombe en tête, d'autant plus qu'il penche.
      const tomb = Math.abs(Math.cos(a)) * Ln * 0.28;
      const tx = cx + Math.cos(a) * Ln * 1.05 + b + u * 10, ty = base + Math.sin(a) * Ln * 0.9 + tomb;
      const kx = cx + Math.cos(a) * Ln * 0.75 + u * 12 + b * 0.5, ky = base + Math.sin(a) * Ln * 1.02;
      x.strokeStyle = o(cols[i % cols.length]); x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(cx + u * 14, base); x.quadraticCurveTo(kx, ky, tx, ty); x.stroke();
      if (i % 2 === 0) {
        // L'épi plumeux : de courts filaments de part et d'autre de la tête du brin
        const dx = tx - kx, dy = ty - ky, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
        x.strokeStyle = jvRgba(o(neige ? "#F6F4EE" : "#EFDDB4"), 0.85); x.lineWidth = 1.1;
        x.beginPath();
        for (let k2 = 0; k2 < 9; k2++) {
          const px = tx - ux * k2 * 2.6, py = ty - uy * k2 * 2.6, l = 4.5 - k2 * 0.3;
          x.moveTo(px, py); x.lineTo(px - uy * l + ux * 2, py + ux * l + uy * 2);
          x.moveTo(px, py); x.lineTo(px + uy * l + ux * 2, py - ux * l + uy * 2);
        }
        x.stroke();
        if (neige && i % 4 === 0) { x.fillStyle = jvRgba(blanc, 0.95); jvOvale(x, tx - ux * 8, ty - uy * 8 - 2, 6, 2.6, Math.atan2(uy, ux)); }
      }
    }
  };
  return { rect, poly, couronne, arbre, tronc, fan, rubans, plumets };
}

/* Le ciel vivant des décors illustrés, dans le cadre de la planche, 465 sur
   830 : couleur de la saison, soleil, lune, étoiles, nuages et voile du temps.
   Renvoie tout ce que le décor doit connaître pour se peindre. */
function jvScene(x, W, H, t, etat, P) {
  const nomS = etat.saison, sol = etat.sol, hs = sol.hs, c = cielDuJardin(hs, sol.montant);
  const m = Object.assign({}, JV_TEMPS[etat.temps] || JV_TEMPS.clair), vent = etat.vent, souffle = 0.35 + vent / 30;
  const nuit = c.nuit, gris = m.nappe * 0.6 + m.pluie * 0.15;
  const neige = nomS === "hiver" || m.neige > 0;
  const o = col => jvMel(col, "#141B2A", nuit * 0.62 + gris * 0.14);
  const allume = Math.max(nuit, jvBorne(-hs, -2, 4) * 0.8);
  const k = H / 830, ox = (W - 465 * k) / 2, L = -ox / k - 2, R = (W - ox) / k + 2;
  // Deux couches : le fond immobile, peint de loin en loin, et ce qui vit, peint à chaque image.
  const F = etat.couche !== "dessus", D = etat.couche !== "fond";
  x.save(); x.translate(ox, 0); x.scale(k, k);
  const blanc = o("#F7F8F8");
  const { rect, poly, couronne, arbre, tronc, fan, rubans, plumets } = jvOutils(x, t, souffle, vent, o, neige, blanc);

  // Ciel : la couleur de la saison le jour, l'heure et le temps par-dessus
  const vif = c.jour * (1 - gris);
  const haut = jvMel(jvMel(c.haut, P.ciel[0], vif * 0.9), "#9AA2A8", gris * c.jour);
  const bas = jvMel(jvMel(c.bas, P.ciel[1], vif * 0.9), "#C9CCCB", gris * c.jour);
  const gc = x.createLinearGradient(0, 0, 0, 330);
  gc.addColorStop(0, haut); gc.addColorStop(1, bas);
  if (F) { x.fillStyle = gc; x.fillRect(L, 0, R - L, 400); }
  if (F && nuit > 0.1 && m.nappe < 0.8) {
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(240,238,228,${(nuit * (1 - m.nappe) * (0.3 + 0.5 * Math.abs(Math.sin(t * 0.6 + i * 1.7)))).toFixed(2)})`;
      x.fillRect(L + jvAlea(i) * (R - L), jvAlea(i + 9) * 260, 1.2, 1.2);
    }
  }
  const voile = Math.min(1, m.nappe * 1.1 + m.brume * 0.3);
  if (F && hs > -4) {
    const sx = L + (R - L) * (0.14 + 0.6 * Math.min(1, Math.max(0, sol.fr))), sy = 285 - (hs / 70) * 220;
    const coul = jvMel("#FBE3B0", "#F4A07E", c.chaud);
    const hg = x.createRadialGradient(sx, sy, 20, sx, sy, 70);
    hg.addColorStop(0, jvRgba(coul, 0.35 * (1 - voile))); hg.addColorStop(1, jvRgba(coul, 0));
    x.fillStyle = hg; x.fillRect(sx - 70, sy - 70, 140, 140);
    x.globalAlpha = (1 - voile * 0.8) * jvBorne(hs, -4, 1); x.fillStyle = coul; jvRond(x, sx, sy, 24); x.globalAlpha = 1;
  }
  const fn = Math.min(1, sol.fn);
  const lune = sol.fn <= 1 ? (1 - m.nappe * 0.75) * jvBorne(Math.sin(Math.PI * fn), 0, 0.25) * nuit : 0;
  const lx = L + (R - L) * (0.82 - 0.64 * fn), ly = 250 - Math.sin(Math.PI * fn) * 150;
  if (F && lune > 0.02) {
    const hl = x.createRadialGradient(lx, ly, 8, lx, ly, 140);
    hl.addColorStop(0, `rgba(226,232,246,${(0.38 * lune).toFixed(3)})`); hl.addColorStop(1, "rgba(200,212,236,0)");
    x.fillStyle = hl; x.fillRect(lx - 140, ly - 140, 280, 280);
    x.globalAlpha = lune; x.fillStyle = "#F3F0E6"; jvRond(x, lx, ly, 20); x.globalAlpha = 1;
  }
  // Nuages plats et doux, poussés par le vent
  const nn = D ? Math.max(0, Math.round(6 * m.cumulus) - 1) : 0;
  for (let i = 0; i < nn; i++) {
    const w = 90 + jvAlea(i + 3) * 120, v = 0.5 + jvAlea(i + 8) * 0.6;
    const nx = L + ((jvAlea(i) * (R - L + w) + t * (2 + vent * 0.5) * v) % (R - L + w)) - w, ny = 40 + jvAlea(i + 1) * 170;
    x.fillStyle = jvRgba(nuit > 0.6 ? "#4A546C" : jvMel("#FFFFFF", "#B4B8BA", gris), 0.55);
    jvOvale(x, nx + w / 2, ny, w / 2, 9); jvOvale(x, nx + w * 0.62, ny - 7, w * 0.28, 9);
  }
  if (F && m.nappe > 0) {
    const ng = x.createLinearGradient(0, 0, 0, 320);
    const tn = nuit > 0.6 ? "#2E3446" : "#A9AEB2";
    ng.addColorStop(0, jvRgba(tn, 0.85 * m.nappe)); ng.addColorStop(1, jvRgba(tn, 0.15 * m.nappe));
    x.fillStyle = ng; x.fillRect(L, 0, R - L, 330);
  }

  return { nomS, P, sol, hs, c, m, vent, souffle, nuit, gris, neige, o, allume, L, R, blanc, haut, bas, voile, lune, lx, ly, t, F, D,
    outils: { rect, poly, couronne, arbre, tronc, fan, rubans, plumets } };
}

// Ce qui tombe et le temps posés sur le décor, puis le cadre rendu.
function jvFinScene(x, Z, feuille) {
  const { nomS, P, m, vent, nuit, o, L, R, bas, lune, lx, ly, t } = Z;
  // Ce qui tombe, la pluie, la neige, le brouillard
  const pente = Math.max(-0.5, Math.min(0.5, vent / 95));
  if (m.pluie) {
    x.strokeStyle = nuit > 0.5 ? "rgba(200,208,222,.3)" : "rgba(70,80,92,.28)"; x.lineWidth = 0.9;
    for (let i = 0; i < 110 * m.pluie; i++) {
      const py = (jvAlea(i + 3) * 830 + t * (560 + jvAlea(i) * 240)) % 830, px = L + (jvAlea(i + 7) * (R - L) + py * pente + (R - L)) % (R - L);
      jvTrait(x, px, py, px + 30 * pente, py + 30);
    }
  } else {
    const chute = m.neige ? ["#FFFFFF"] : P.chute;
    if (chute) {
      const n = m.neige ? 70 : 12;
      for (let i = 0; i < n; i++) {
        const v = m.neige ? 20 + jvAlea(i) * 16 : 12 + jvAlea(i) * 8;
        const py = (jvAlea(i + 1) * 860 + t * v) % 860 - 20;
        const px = L + (jvAlea(i + 2) * (R - L) * 0.8 + (R - L) * 0.2 + Math.sin(t * 0.6 + i) * 24 - t * vent * 0.35 + (R - L) * 8) % (R - L);
        if (m.neige) { x.fillStyle = "rgba(250,250,246,.9)"; jvRond(x, px, py, 1.4 + jvAlea(i) * 1.6); continue; }
        x.save(); x.translate(px, py); x.rotate(t * (0.5 + jvAlea(i)) + i);
        x.fillStyle = o(chute[i % chute.length]);
        if (nomS === "automne") (feuille || jvErable)(x, 0, 0, 7, 0); else jvOvale(x, 0, 0, 3.4, 2);
        x.restore();
      }
    }
  }
  if (m.brume > 0.4) {
    const bg = x.createLinearGradient(0, 260, 0, 560);
    bg.addColorStop(0, jvRgba(bas, 0)); bg.addColorStop(0.5, jvRgba(bas, 0.7 * m.brume)); bg.addColorStop(1, jvRgba(bas, 0.2 * m.brume));
    x.fillStyle = bg; x.fillRect(L, 260, R - L, 300);
  }
  if (m.orage) {
    const cy = t % 7.5, f = cy < 0.24 ? 1 - cy / 0.24 : 0;
    if (f > 0) { x.fillStyle = `rgba(230,232,240,${(0.5 * f).toFixed(2)})`; x.fillRect(L, 0, R - L, 830); }
  }
  // Clarté de la lune
  if (lune > 0.05) {
    const cl = x.createRadialGradient(lx, ly, 40, lx, ly, 560);
    cl.addColorStop(0, `rgba(190,206,236,${(0.18 * lune).toFixed(3)})`); cl.addColorStop(1, "rgba(190,206,236,0)");
    x.fillStyle = cl; x.fillRect(L, 0, R - L, 830);
  }
  x.restore();
}

// La branche qui retombe du coin haut droit : bois, puis fleurs, feuilles ou neige selon la saison.
function jvBrancheIllustree(x, Z, segs) {
  const { P, t, souffle, vent, o, blanc } = Z;
  const px = segs[0].x, py = segs[0].y + 10;
  const rot = Math.sin(t * souffle * 0.55) * (0.006 + vent * 0.0007);
  x.save(); x.translate(px, py); x.rotate(rot); x.translate(-px, -py);
  x.lineCap = "round";
  segs.forEach(sg => {
    x.strokeStyle = o("#4A3226"); x.lineWidth = sg.ep;
    x.beginPath(); x.moveTo(sg.x, sg.y); x.quadraticCurveTo(sg.cx, sg.cy, sg.x2, sg.y2); x.stroke();
    if (P.rameau === "nu" && sg.d <= 4) { x.strokeStyle = jvRgba(blanc, 0.95); x.lineWidth = Math.max(1.2, sg.ep * 0.5); x.beginPath(); x.moveTo(sg.x, sg.y - sg.ep * 0.45); x.quadraticCurveTo(sg.cx, sg.cy - sg.ep * 0.5, sg.x2, sg.y2 - sg.ep * 0.4); x.stroke(); }
  });
  segs.forEach((sg, i) => {
    if (sg.d < 2 || P.rameau === "nu") return;
    const fl = Math.sin(t * souffle * 1.8 + i) * vent * 0.03;
    if (P.rameau === "sakura" && sg.d < 3) return;
    if (P.rameau !== "sakura" && sg.d < 3) return;
    for (let j = 0; j < (P.rameau === "sakura" ? 5 : 3); j++) {
      const fx = sg.x2 + (jvAlea(sg.g + j) - 0.5) * (P.rameau === "sakura" ? 20 : 44) + fl, fy = sg.y2 + (jvAlea(sg.g + j + 7) - 0.5) * (P.rameau === "sakura" ? 14 : 22) + (P.rameau === "sakura" ? 4 : 14), a = jvAlea(sg.g + j) * 6;
      if (P.rameau === "sakura") {
        x.strokeStyle = o("#5A3A2C"); x.lineWidth = 0.7; jvTrait(x, sg.x2, sg.y2, fx, fy);
        if (j === 4) { x.fillStyle = o("#E88AA4"); jvOvale(x, fx, fy, 2, 2.8, a); continue; }
        x.fillStyle = o(j % 2 ? "#F7CFDA" : "#FCE6EC");
        for (let p2 = 0; p2 < 5; p2++) { const ap = a + p2 * 1.257; jvOvale(x, fx + Math.cos(ap) * 3.4, fy + Math.sin(ap) * 3.4, 3.1, 2.3, ap); }
        x.fillStyle = o("#D2607E"); jvRond(x, fx, fy, 1.1);
      }
      else {
        const r = 14 + jvAlea(sg.g + j) * 7, col = P.feuille[(i + j) % P.feuille.length];
        x.strokeStyle = o("#5A4630"); x.lineWidth = 0.8; jvTrait(x, sg.x2, sg.y2, fx, fy - r * 0.6);
        x.fillStyle = o(jvMel(col, "#10241A", (j % 3) * 0.12)); jvErable(x, fx, fy, r, a * 0.5 - 0.25 + Math.PI);
        x.strokeStyle = jvRgba(o(jvMel(col, "#10241A", 0.4)), 0.6); x.lineWidth = 0.6;
        for (let v = 0; v < 5; v++) { const av = a * 0.5 - 0.25 + Math.PI - Math.PI / 2 + (v - 2) * 0.62; jvTrait(x, fx, fy, fx + Math.cos(av) * r * 0.8, fy + Math.sin(av) * r * 0.8); }
      }
    }
  });
  x.restore();

}

function peindreModerne(x, W, H, t, etat, cache) {
  const Z = jvScene(x, W, H, t, etat, JMO[etat.saison]);
  const { nomS, P, sol, hs, c, m, vent, souffle, nuit, gris, neige, o, allume, L, R, blanc, haut, bas, voile, lune, lx, ly } = Z;
  const { rect, poly, couronne, arbre, tronc, fan, rubans, plumets } = Z.outils;
  const gel = nomS === "hiver";
  if (Z.F) {

  // Une masse de feuillage : un fond sombre, puis des feuilles en trois tons, plus claires en haut à gauche.
  // Les monts, l'hiver enneigés
  const mont1 = [[L, 300], [40, 288], [110, 266], [170, 250], [215, 262], [262, 272], [320, 262], [372, 276], [420, 268], [R, 284], [R, 360], [L, 360]];
  poly(mont1, o(jvMel(P.mont[0], bas, 0.25)));
  if (neige) poly([[150, 262], [170, 250], [192, 258], [206, 268], [186, 266], [172, 272], [160, 266]], jvRgba(blanc, 0.9));
  const mont2 = [[L, 318], [60, 300], [130, 312], [200, 296], [270, 306], [340, 292], [410, 304], [R, 300], [R, 370], [L, 370]];
  poly(mont2, o(jvMel(P.mont[1], bas, 0.3)));
  const hz = x.createLinearGradient(0, 300, 0, 360);
  hz.addColorStop(0, jvRgba(bas, 0)); hz.addColorStop(1, jvRgba(bas, 0.55));
  x.fillStyle = hz; x.fillRect(L, 300, R - L, 60);
  // Le bosquet du fond : des masses d'arbres texturées, plus pâles au loin
  rect(L, 372, R - L, 100, o(jvMel(P.bosquet[0], "#24402A", 0.45)));
  const nb = Math.ceil((R - L) / 46);
  for (let i = 0; i < nb; i++) {
    const bx = L + i * 46 + jvAlea(i) * 20, by = 350 + jvAlea(i + 3) * 16;
    couronne(bx, by, 26 + jvAlea(i + 1) * 12, 22 + jvAlea(i + 2) * 8, P.bosquet.map(cc => jvMel(cc, bas, 0.18)), 22, 6);
    if (neige) { x.fillStyle = jvRgba(blanc, 0.8); jvOvale(x, bx, by - 16, 16, 5); }
  }
  for (let i = 0; i < nb; i++) couronne(L + i * 46 + 23 + jvAlea(i + 5) * 14, 392 + jvAlea(i + 8) * 18, 30, 20, P.bosquet, 24, 6);
  rect(L, 466, R - L, 84, o("#EEE7DB"));
  // Les cyprès
  const cypres = (cx, top, base, w, i) => {
    const b = Math.sin(t * souffle * 0.8 + i) * vent * 0.05;
    x.fillStyle = o("#2C5536");
    x.beginPath(); x.moveTo(cx - w, base); x.quadraticCurveTo(cx - w * 1.15, (top + base) / 2, cx + b, top); x.quadraticCurveTo(cx + w * 1.15, (top + base) / 2, cx + w, base); x.fill();
    x.fillStyle = o("#426E44");
    x.beginPath(); x.moveTo(cx - w * 0.9, base); x.quadraticCurveTo(cx - w, (top + base) / 2, cx + b, top + 4); x.quadraticCurveTo(cx - w * 0.15, (top + base) / 2, cx - w * 0.1, base); x.fill();
    if (neige) { x.fillStyle = jvRgba(blanc, 0.8); for (let k2 = 0; k2 < 4; k2++) jvOvale(x, cx - w * 0.3 + (k2 % 2) * w * 0.5, top + 20 + k2 * (base - top) / 5, w * 0.35, 2.2); }
  };
  [[210, 312, 372, 6], [226, 320, 372, 5], [283, 290, 372, 8], [330, 244, 372, 10], [354, 276, 372, 8]].forEach((a, i) => cypres(...a, i));
  if (nomS !== "ete") [[38, 214, 352, 9], [60, 226, 352, 8], [84, 242, 352, 7]].forEach((a, i) => cypres(...a, i + 5));

  // L'arbre de gauche, selon la saison
  if (nomS === "ete") {
    // Pin parasol : tronc fin, couronne étagée et plate
    tronc([[50, 440], [56, 380], [62, 340], [52, 300], [40, 278]], 6); tronc([[60, 345], [96, 300], [122, 280]], 4.5);
    tronc([[96, 300], [150, 292], [176, 300]], 3); tronc([[54, 300], [20, 286]], 3); tronc([[120, 282], [96, 258]], 2.5);
    [[34, 276, 46, 15], [96, 250, 56, 17], [150, 286, 44, 13], [16, 300, 30, 10], [70, 262, 40, 12]].forEach(([cx, cy, rx, ry]) => {
      couronne(cx, cy, rx, ry, ["#3A6634", "#4E7C40", "#2E5430", "#6C9A4C"], 70, 8);
    });
  } else if (nomS === "printemps") {
    arbre(56, 448, 130, 5, 0.8, (bx, by, a, g, d) => couronne(bx, by, 17, 12, ["#F6D3DE", "#FBE8EE", "#EBB8C8", "#FFFFFF"], 16, 4.4, g), 11);
  } else if (nomS === "automne") {
    arbre(72, 470, 300, 10, 0.78, (bx, by, a, g, d) => couronne(bx, by, 30 - d * 3, 22 - d * 2, ["#D9541E", "#E8742A", "#C8401E", "#F09A3A", "#B5321E"], 16, 6.5, g), 5, 5);
  } else {
    arbre(64, 452, 190, 6, 0.8, (bx, by, a, g, d) => {
      x.strokeStyle = o("#5E4636"); x.lineWidth = 0.9;
      for (let k2 = 0; k2 < 5; k2++) { const a2 = a + (k2 - 2) * 0.42, l2 = 9 + jvAlea(g + k2) * 8; jvTrait(x, bx, by, bx + Math.cos(a2) * l2, by + Math.sin(a2) * l2);
        x.fillStyle = jvRgba(blanc, 0.95); jvOvale(x, bx + Math.cos(a2) * l2 * 0.7, by + Math.sin(a2) * l2 * 0.7 - 1.5, 4, 2.2, a2); }
      x.fillStyle = jvRgba(blanc, 0.92); jvOvale(x, bx, by - 2, 7, 3.4);
    }, 8, 5);
  }

  // Les murs et la villa, au bardage de bois qui s'éclaire le soir
  // Un mur éclairé par le côté : dégradé de face, arête claire, flanc d'ombre, ombre portée au pied.
  const mur = (a, b, w, h) => {
    const gm = x.createLinearGradient(a, 0, a + w, 0);
    gm.addColorStop(0, o("#F2EDE4")); gm.addColorStop(1, o("#DED7C9"));
    x.fillStyle = gm; x.fillRect(a, b, w, h);
    rect(a, b, w, 3, o("#F8F5EE")); rect(a + w - 7, b, 7, h, o("#CFC6B6"));
    x.fillStyle = jvRgba(o("#6E6252"), 0.18 * (1 - voile)); x.beginPath(); x.moveTo(a + w, b + h); x.lineTo(a + w + 22, b + h); x.lineTo(a + w + 8, b + h - 14); x.lineTo(a + w, b + h - 14); x.fill();
    if (neige) { x.fillStyle = blanc; x.beginPath(); x.ellipse(a + w / 2, b, w / 2 + 2, 5, 0, Math.PI, 0); x.fill(); }
  };
  mur(255, 352, 135, 64); mur(118, 414, 60, 54);
  { const gv = x.createLinearGradient(390, 0, 470, 0); gv.addColorStop(0, o("#F4EFE6")); gv.addColorStop(1, o("#E2DBCD")); x.fillStyle = gv; x.fillRect(390, 268, 80, 205); }
  rect(380, 250, 92, 18, o("#F4EFE6")); rect(380, 268, 92, 5, o("#CFC6B6"));
  if (neige) rect(380, 246, 92, 5, blanc);
  rect(404, 298, 66, 140, o("#D6CEC0"));
  rect(408, 314, 62, 120, o("#9C5A34"));
  x.strokeStyle = o("#74401F"); x.lineWidth = 1.4;
  for (let sx = 411; sx < 470; sx += 4.4) jvTrait(x, sx, 314, sx, 434);
  if (allume > 0.08) {
    x.fillStyle = `rgba(255,206,120,${(0.55 * allume).toFixed(2)})`;
    for (let sx = 413; sx < 470; sx += 4.4) x.fillRect(sx, 316, 1.6, 116);
    const gl = x.createRadialGradient(438, 440, 6, 438, 440, 110);
    gl.addColorStop(0, `rgba(255,200,120,${(0.35 * allume).toFixed(2)})`); gl.addColorStop(1, "rgba(255,200,120,0)");
    x.fillStyle = gl; x.fillRect(330, 330, 220, 220);
  }
  // Haies taillées
  const haie = (a, b, w, h) => {
    rect(a, b, w, h, o(P.haie[0])); rect(a, b, w, 5, o(P.haie[1]));
    x.fillStyle = o(jvMel(P.haie[0], "#1E3A22", 0.3));
    for (let i = 0; i < w * h / 40; i++) jvRond(x, a + jvAlea(i + a) * w, b + 5 + jvAlea(i * 3 + b) * (h - 5), 1.4);
    if (neige) { x.fillStyle = blanc; x.beginPath(); x.ellipse(a + w / 2, b, w / 2 + 2, 7, 0, Math.PI, 0); x.fill(); rect(a - 2, b - 1, w + 4, 3, blanc); }
  };
  haie(172, 414, 128, 54); haie(236, 446, 120, 34);
  if (nomS === "automne") { x.fillStyle = o("#B5381E"); [[300, 448, 22], [335, 440, 18], [190, 465, 16]].forEach(([a, b, r]) => couronne(a, b, r, r * 0.6, ["#B5381E", "#D0502A", "#8E2A18"], 22, 5)); }
  // Massifs du milieu et de droite
  if (nomS === "ete") {
    couronne(395, 446, 26, 14, ["#3E6A34", "#557E40"], 30, 6);
    x.fillStyle = o("#9FB2A2"); x.beginPath(); x.ellipse(320, 492, 42, 30, 0, Math.PI, 0); x.fill();
    fan(320, 494, 52, 60, "#B9C8B8", 1.3); fan(320, 494, 44, 40, "#8EA494", 1.1);
    rubans(420, 500, 40, 18, ["#4E7A3E", "#5E8A48"], 2.2);
    for (let i = 0; i < 46; i++) {
      const lx = 370 + jvAlea(i) * 96, ly = 470 + jvAlea(i + 3) * 26, h = 22 + jvAlea(i + 7) * 18, b = Math.sin(t * souffle * 1.3 + i) * (1 + vent * 0.08);
      x.strokeStyle = o("#6E8A5A"); x.lineWidth = 1; jvTrait(x, lx, ly + 10, lx + b * 0.5, ly - h * 0.4);
      for (let k2 = 0; k2 < 6; k2++) { x.fillStyle = o(k2 % 2 ? "#9A86D6" : "#B6A4E8"); jvOvale(x, lx + b * (0.5 + k2 * 0.1), ly - h * 0.4 - k2 * 3.4, 1.9, 2.6); }
    }
    rubans(46, 482, 96, 38, ["#3E6E34", "#4E7E3A", "#2E5A2A", "#5E8E44"], 3.4);
    [[20, 410], [62, 418], [96, 440], [8, 448], [40, 400]].forEach(([a, b], i) => {
      const bb = Math.sin(t * souffle + i) * (1 + vent * 0.08);
      x.strokeStyle = o("#5E8A44"); x.lineWidth = 1.3; jvTrait(x, 46 + (a - 46) * 0.3, 478, a + bb, b);
      for (let k2 = 0; k2 < 16; k2++) { const an = k2 * 2.4; x.fillStyle = o(k2 % 3 ? "#FFFFFF" : "#E6E8F2"); jvOvale(x, a + bb + Math.cos(an) * 7 * jvAlea(k2 + i), b + Math.sin(an) * 7 * jvAlea(k2 + i + 1), 2.4, 1.3, an); }
    });
  } else if (nomS === "printemps") {
    couronne(345, 430, 30, 18, ["#F4F2EA", "#FFFFFF", "#7FA85A"], 40, 4);
    couronne(430, 470, 40, 26, ["#F4F2EA", "#FFFFFF", "#5E8E44"], 50, 5);
    couronne(130, 458, 30, 12, ["#E8EDE0", "#FFFFFF", "#7FA85A"], 26, 5);
    couronne(38, 495, 44, 22, ["#6E9A4C", "#86AE5A"], 30, 8);
  } else if (nomS === "automne") {
    plumets(360, 492, 56, 24); plumets(40, 488, 62, 26);
    couronne(430, 480, 36, 22, ["#B5381E", "#D0502A"], 30, 6);
  } else {
    couronne(345, 428, 28, 14, ["#E6ECEE", "#FFFFFF"], 30, 4);
    couronne(440, 452, 34, 24, ["#3E5A44", "#FFFFFF", "#F2F4F4"], 40, 6);
    couronne(40, 478, 46, 18, ["#FFFFFF", "#ECF0F0", "#3E5A44"], 40, 7);
    couronne(120, 438, 30, 10, ["#FFFFFF", "#3E5A44"], 20, 5);
  }
  // Un massif bas à gauche des terrasses
  {
    const cols = { printemps: ["#6E9A4C", "#86AE5A", "#F4F2EA"], ete: ["#4E7E3A", "#6E9A4C", "#3E6A30"], automne: ["#9A5A2E", "#B5381E", "#7E6A3A"], hiver: ["#3E5A44", "#FFFFFF", "#F2F4F4"] }[nomS];
    couronne(30, 512, 62, 22, cols, 60, 7, 901);
    if (neige) { x.fillStyle = blanc; x.beginPath(); x.ellipse(30, 500, 64, 14, 0, Math.PI, 0); x.fill(); }
  }
  // Terrasses, gazons et bac de droite
  const dalle = (a, b, w, h, f) => {
    const gd = x.createLinearGradient(0, b, 0, b + h); gd.addColorStop(0, o("#F3EDE3")); gd.addColorStop(1, o("#E6DFD1"));
    x.fillStyle = gd; x.fillRect(a, b, w, h); rect(a, b + h, w, f, o("#CEC4B3"));
    rect(a, b + h + f, w, 3, jvRgba(o("#6E6252"), 0.16 * (1 - voile)));
    if (neige) { rect(a, b - 2, w, 4, blanc); }
  };
  dalle(96, 468, 266, 9, 5); rect(110, 486, 246, 9, o(P.gazon));
  dalle(86, 496, 272, 12, 5); rect(128, 514, 228, 6, o(P.gazon));
  dalle(L, 522, 362 - L, 20, 7);
  rect(355, 494, R - 355, 82, o("#E9E2D5")); rect(355, 494, R - 355, 5, o("#F3EEE5"));
  if (neige) rect(355, 491, R - 355, 5, blanc);

  // Le bassin miroir
  rect(L, 548, R - L, 8, o("#EEE7DB"));
  const ge = x.createLinearGradient(0, 556, 0, 732);
  ge.addColorStop(0, o(jvMel(P.eau[0], haut, 0.25))); ge.addColorStop(1, o(jvMel(P.eau[1], bas, 0.2)));
  x.fillStyle = ge; x.fillRect(L, 556, R - L, 176);
  rect(L, 556, R - L, 3, jvRgba(o("#2E4A60"), 0.45));
  x.save(); x.beginPath(); x.rect(L, 559, R - L, 173); x.clip();
  // Reflet miroir de la scène, découpé en bandes que le vent fait onduler
  {
    // On reflète la bande des arbres, des cyprès et de la villa, tassée dans le bassin.
    const T = x.getTransform(), p0 = T.transformPoint({ x: L, y: 250 }), p1 = T.transformPoint({ x: R, y: 470 }), q = T.transformPoint({ x: L, y: 559 }), q1 = T.transformPoint({ x: L, y: 732 });
    const sx = Math.max(0, p0.x), sw = Math.min(x.canvas.width, p1.x) - sx, sh = p1.y - p0.y, bandes = 22, hb = sh / bandes, hd = (q1.y - q.y) / bandes;
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = gel ? 0.4 : 0.5;
    for (let i = 0; i < bandes; i++) {
      const dx = Math.sin(t * 1.4 + i * 0.8) * (0.6 + vent * 0.06) * (i / bandes + 0.3) * T.a;
      // La bande i, comptée depuis la ligne d'eau, reçoit la bande symétrique au-dessus.
      const syS = p1.y - (i + 1) * hb;
      x.save(); x.translate(0, q.y + (i + 1) * hd); x.scale(1, -1);
      x.drawImage(x.canvas, sx, syS, sw, hb, sx + dx, 0, sw, hd + 0.5);
      x.restore();
    }
    x.restore();
    const vt = x.createLinearGradient(0, 559, 0, 732);
    vt.addColorStop(0, jvRgba(o(P.eau[0]), 0.55)); vt.addColorStop(1, jvRgba(o(P.eau[1]), 0.62));
    x.fillStyle = vt; x.fillRect(L, 559, R - L, 173);
  }
  if (gel) {
    x.fillStyle = jvRgba(blanc, 0.25); x.fillRect(L, 559, R - L, 173);
    x.strokeStyle = jvRgba(blanc, 0.6); x.lineWidth = 0.8;
    [[20, 640, 120, 652, 180, 646], [200, 690, 300, 700, 360, 694], [60, 712, 140, 706, 220, 716]].forEach(([a, b, c2, d, e2, f]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.lineTo(e2, f); x.stroke(); });
  }
  x.restore();
  // Les marches flottantes et leur ombre sur l'eau
  [[287, 540, 140, 22], [315, 584, R - 315, 22], [340, 624, R - 340, 26]].forEach(([a, b, w, h]) => {
    rect(a + 4, b + h + 8, w, 10, jvRgba(o("#1E3448"), 0.35));
    const gd = x.createLinearGradient(0, b, 0, b + h); gd.addColorStop(0, o("#F4EEE4")); gd.addColorStop(1, o("#E4DCCD"));
    x.fillStyle = gd; x.fillRect(a, b, w, h); rect(a, b, w, 1.5, o("#FBF8F2")); rect(a, b + h, w, 9, o("#CBC1AF"));
    if (neige) { x.fillStyle = blanc; x.fillRect(a, b - 3, w, 5); jvOvale(x, a + w * 0.4, b - 2, w * 0.35, 3); }
  });
  rect(L, 728, R - L, 8, o("#EAE3D6")); rect(L, 736, R - L, 4, o("#D3CABA"));
  rect(L, 682, 135 - L, 46, o("#EEE7DA")); rect(L, 728, 135 - L, 8, o("#D6CDBD"));
  // Le dallage du premier plan et ses ombres de feuillage
  rect(L, 740, R - L, 100, o(P.sol));
  if (hs > 0 && voile < 0.6) {
    for (let i = 0; i < 18; i++) {
      x.fillStyle = jvRgba(o("#C9BEA8"), 0.45);
      jvOvale(x, 240 + jvAlea(i) * 230 + Math.sin(t * souffle * 0.6 + i) * 3, 760 + jvAlea(i + 5) * 60, 9 + jvAlea(i + 2) * 10, 3.5, 0.3);
    }
  }
  // Lumières de jardin au bord de la terrasse, la nuit
  if (allume > 0.2) [[120, 520], [250, 520], [360, 492], [180, 736], [330, 736]].forEach(([a, b]) => {
    const g = x.createRadialGradient(a, b, 1, a, b, 26); g.addColorStop(0, `rgba(255,214,140,${(0.6 * allume).toFixed(2)})`); g.addColorStop(1, "rgba(255,214,140,0)");
    x.fillStyle = g; x.fillRect(a - 26, b - 26, 52, 52);
  });
  }
  if (Z.D) {
  // Ce qui bouge sur l'eau, hors des marches
  x.save(); x.beginPath(); x.rect(L, 559, R - L, 173);
  [[287, 540, 140, 31], [315, 584, R - 315, 31], [340, 624, R - 340, 35]].forEach(([a, b, w, h]) => x.rect(a, b, w, h));
  x.clip("evenodd");
  // Scintillements, ronds de pluie, glace
  for (let i = 0; i < 26; i++) {
    const sx = L + ((jvAlea(i) * (R - L) + t * (3 + (i % 4))) % (R - L)), sy = 566 + jvAlea(i + 3) * 160;
    x.fillStyle = `rgba(255,255,255,${(0.16 + 0.18 * Math.sin(t * 1.6 + i)).toFixed(2)})`; x.fillRect(sx, sy, 10 + jvAlea(i) * 16, 1.2);
  }
  if (lune > 0.05) for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(236,238,246,${(0.5 * lune * (1 - i / 10)).toFixed(2)})`; const w = 18 - i * 1.5 + Math.sin(t * 2 + i) * 3; x.fillRect(lx - w / 2 + Math.sin(t * 1.3 + i) * 2, 566 + i * 7, w, 1.6); }
  if (m.pluie && !gel) jvRonds(x, { m, t }, 230, 650, 230, 70);
  // Ce qui flotte : pétales au printemps, feuilles à l'automne
  if (P.chute && !gel) {
    for (let i = 0; i < 16; i++) {
      x.fillStyle = o(P.chute[i % P.chute.length]);
      const fx = 20 + jvAlea(i * 5) * 420 + Math.sin(t * 0.2 + i) * 6, fy = 600 + jvAlea(i * 3) * 120;
      if (nomS === "automne") jvErable(x, fx, fy, 5, i); else jvOvale(x, fx, fy, 3.2, 1.6, i);
    }
  }
  x.restore();
  // Le premier plan, selon la saison
  if (nomS === "ete") {
    x.fillStyle = o("#24401C"); jvOvale(x, 110, 800, 150, 90);
    couronne(90, 790, 120, 70, ["#3E6A2E", "#557E36", "#2E5422", "#6E9A44"], 260, 9);
    couronne(220, 810, 60, 40, ["#3E6A2E", "#557E36", "#6E9A44"], 80, 8);
  } else if (nomS === "printemps") {
    rubans(60, 850, 230, 54, ["#3E7A2E", "#4E8A36", "#6EA048", "#2E6224"], 3.2); rubans(170, 850, 160, 30, ["#5E9440", "#6EA048"], 2.6);
    for (let i = 0; i < 13; i++) {
      const a = -Math.PI / 2 + (i / 12 - 0.5) * 1.8, Ln = 110 + jvAlea(i) * 110, b = Math.sin(t * souffle * 1.2 + i) * (1.5 + vent * 0.12);
      jvFleur(x, 60 + Math.cos(a) * Ln + b, 850 + Math.sin(a) * Ln, 6.2, o(i % 3 ? "#FFFFFF" : "#FBEFF2"), o("#E9A3B5"));
    }
  } else if (nomS === "automne") {
    plumets(60, 840, 190, 40); plumets(190, 840, 130, 28);
  } else {
    plumets(80, 800, 170, 22);
    x.fillStyle = blanc; jvOvale(x, 300, 850, 220, 60);
    couronne(70, 800, 90, 40, ["#2E4A36", "#3E5A44"], 60, 8);
    x.fillStyle = blanc; x.beginPath(); x.ellipse(70, 790, 96, 34, 0, Math.PI, 0); x.fill(); jvOvale(x, 70, 790, 96, 10);
  }
  // Rosée du matin sur les dalles
  if (sol.depuisLever > -0.5 && sol.depuisLever < 2.5 && m.nappe < 0.5 && !neige) {
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(255,253,245,${(0.6 * Math.max(0, Math.sin(t * 1.6 + i * 2.3))).toFixed(2)})`; x.fillRect(150 + jvAlea(i * 7) * 300, 745 + jvAlea(i * 11) * 80, 1.6, 1.6); }
  }

  // La branche du coin haut droit
  // La branche est tracée pour la largeur de l'écran : elle se retrace si celle-ci change.
  if (!cache.brancheMo || cache.brancheMoR !== R) {
    const segs = [];
    const pousse = (px, py, ang, len, ep, d, g) => {
      const a = ang + (jvAlea(g) - 0.5) * 0.35, x2 = px + Math.cos(a) * len, y2 = py + Math.sin(a) * len, pli = (jvAlea(g + 1) - 0.5) * len * 0.25;
      segs.push({ x: px, y: py, x2, y2, cx: (px + x2) / 2 - Math.sin(a) * pli, cy: (py + y2) / 2 + Math.cos(a) * pli, ep, d, g });
      if (d >= 5) return;
      pousse(x2, y2, a - 0.32 + (jvAlea(g + 2) - 0.5) * 0.3, len * 0.74, ep * 0.66, d + 1, g * 2 + 1);
      if (d < 3 || jvAlea(g + 3) > 0.3) pousse(x2, y2, a + 0.5 + (jvAlea(g + 4) - 0.5) * 0.4, len * (0.5 + jvAlea(g + 5) * 0.2), ep * 0.55, d + 1, g * 2 + 2);
    };
    pousse(R + 30, 30, Math.PI * 0.9, 92, 10, 0, 3); pousse(R + 30, 110, Math.PI * 0.98, 60, 6, 1, 77);
    cache.brancheMo = segs; cache.brancheMoR = R;
  }
  jvBrancheIllustree(x, Z, cache.brancheMo);
  jvFinScene(x, Z);
  } else x.restore();
  return c;
}

/* ---------- Le style brutaliste ----------
   D'après la seconde planche de Jérôme : du béton brut piqueté, un grand mur
   à droite d'où retombe une grimpante, des murets étagés et un escalier, un
   bassin sombre en perspective, de grands bacs plantés au premier plan, des
   nuages de buis taillés et des cyprès devant un mont. */
const JBR = {
  printemps: { ciel: ["#B4CDE2", "#ECEEE8"], mont: ["#9CA6BC", "#AFC0B8"], bosquet: ["#8EB262", "#A9C878", "#F1C6D2", "#7EA458"],
    nuage: ["#5E8E44", "#7EA854"], eau: ["#5E7E86", "#86A2A8"], beton: "#BDB8AE", sol: "#DAD5CB",
    rameau: "sakura", chute: ["#F6C6D2", "#FBE3EA"], bac: "fleurs", grimpe: ["#4E7A3A", "#6E9A4C"], grimpeFleur: "#FFFFFF" },
  ete: { ciel: ["#8FB8DC", "#E2E8E6"], mont: ["#8E9AAE", "#9AAE9E"], bosquet: ["#6E9A44", "#94BC5A", "#5A8A3A"],
    nuage: ["#4E7E36", "#6E9E48"], eau: ["#4E6E78", "#7898A2"], beton: "#B8B3A9", sol: "#DED8CD",
    rameau: "erable", feuille: ["#7FA83A", "#5E8A2E", "#9DBB3A", "#3E6A2E"], bac: "lavande", grimpe: ["#3E6A30", "#557E3A"], grimpeFleur: "#F4F2EA" },
  automne: { ciel: ["#E8D2B6", "#F2E6D4"], mont: ["#A49CA6", "#B8A898"], bosquet: ["#D08A3A", "#E2A848", "#B5542A", "#C9A050"],
    nuage: ["#B5381E", "#D0502A"], eau: ["#6E747A", "#9A9690"], beton: "#BAB4AA", sol: "#DCD6CB",
    rameau: "erable", feuille: ["#E0621E", "#F08A2A", "#C8401E"], chute: ["#E0621E", "#F08A2A", "#C8401E"], bac: "graminees", grimpe: ["#B5481E", "#D0682A"] },
  hiver: { ciel: ["#BCC8D6", "#E6E9EC"], mont: ["#A6AEC0", "#BAC2CC"], bosquet: ["#A9B0B2", "#C4CACC", "#8E9698"],
    nuage: ["#3E5A44", "#4E6A52"], eau: ["#55646C", "#7E8C94"], beton: "#BFBBB3", sol: "#F2F2F0",
    rameau: "nu", bac: "baies", grimpe: ["#6E6A60", "#8A857A"] },
};
function peindreBrutaliste(x, W, H, t, etat, cache) {
  const Z = jvScene(x, W, H, t, etat, JBR[etat.saison]);
  const { nomS, P, sol, hs, c, m, vent, souffle, neige, o, allume, L, R, blanc, haut, bas, voile, lune, lx } = Z;
  const { rect, poly, couronne, arbre, fan, rubans, plumets } = Z.outils;
  const gel = nomS === "hiver";
  const bassin = [[L, 452], [248, 450], [450, 508], [450, 522], [L, 524]];
  // Le béton : un aplat, puis son piqueté, un motif tiré une fois.
  if (!cache.beton) {
    const cb = document.createElement("canvas"); cb.width = cb.height = 96;
    const g = cb.getContext("2d");
    for (let i = 0; i < 700; i++) {
      g.fillStyle = jvAlea(i * 3.1) > 0.5 ? "rgba(70,66,60,.55)" : "rgba(255,255,255,.5)";
      g.beginPath(); g.arc(jvAlea(i) * 96, jvAlea(i + 0.5) * 96, 0.35 + jvAlea(i * 7) * 0.9, 0, 7); g.fill();
    }
    cache.beton = cb;
  }
  const pique = x.createPattern(cache.beton, "repeat");
  const beton = (pts, ton, eclat) => {
    poly(pts, o(jvMel(P.beton, ton > 0 ? "#FFFFFF" : "#3A3832", Math.abs(ton))));
    x.save(); x.globalAlpha = 0.35 * (1 - Z.nuit * 0.6); x.fillStyle = pique;
    x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); x.restore();
    if (eclat) { x.strokeStyle = jvRgba(o("#FFFFFF"), 0.35); x.lineWidth = 1; jvTrait(x, pts[0][0], pts[0][1], pts[1][0], pts[1][1]); }
  };
  const boite = (a, b, w, h, dessus) => {
    beton([[a, b + dessus], [a + w, b + dessus], [a + w, b + h], [a, b + h]], -0.16, false);
    beton([[a, b], [a + w, b], [a + w, b + dessus], [a, b + dessus]], 0.3, true);
    rect(a, b + dessus, w, 2, jvRgba(o("#3A3832"), 0.25));
    rect(a, b + h, w, 5, jvRgba(o("#3A3832"), 0.2 * (1 - voile)));
    if (neige) { x.fillStyle = blanc; x.beginPath(); x.moveTo(a - 1, b + dessus * 0.6); x.lineTo(a - 1, b - 4); x.quadraticCurveTo(a + w / 2, b - 9, a + w + 1, b - 4); x.lineTo(a + w + 1, b + dessus * 0.6); x.fill(); }
  };

  if (Z.F) {
  // Le mont et les collines
  poly([[L, 286], [60, 276], [120, 258], [175, 236], [206, 222], [240, 238], [290, 262], [340, 270], [R, 280], [R, 360], [L, 360]], o(jvMel(P.mont[0], bas, 0.28)));
  if (neige) poly([[178, 236], [206, 222], [232, 236], [220, 242], [206, 236], [192, 244]], jvRgba(blanc, 0.92));
  poly([[L, 300], [80, 290], [160, 300], [240, 288], [320, 296], [R, 290], [R, 380], [L, 380]], o(jvMel(P.mont[1], bas, 0.35)));
  { const hz = x.createLinearGradient(0, 280, 0, 340); hz.addColorStop(0, jvRgba(bas, 0)); hz.addColorStop(1, jvRgba(bas, 0.5)); x.fillStyle = hz; x.fillRect(L, 280, R - L, 60); }
  // Arbres du fond, masses texturées
  rect(L, 330, R - L, 120, o(jvMel(P.bosquet[0], "#24402A", 0.45)));
  for (let i = 0; i < Math.ceil((R - L) / 40); i++) {
    const bx = L + i * 40 + jvAlea(i + 2) * 16, by = 318 + jvAlea(i + 6) * 20;
    couronne(bx, by, 24 + jvAlea(i) * 12, 20 + jvAlea(i + 1) * 8, P.bosquet.map(cc => jvMel(cc, bas, 0.15)), 20, 6, 300 + i);
    if (neige) { x.fillStyle = jvRgba(blanc, 0.85); jvOvale(x, bx, by - 15, 15, 5); }
  }
  // Grands arbres derrière le mur de droite
  [[330, 210, 46, 60], [420, 140, 60, 70], [460, 230, 40, 50]].forEach(([cx, cy, rx, ry], i) => {
    if (nomS === "hiver") { arbre(cx, cy + ry * 1.6, ry * 2.2, 4, 0.75, (bx, by, a, g) => { x.fillStyle = jvRgba(blanc, 0.9); jvOvale(x, bx, by - 2, 5, 2.4, a); }, 40 + i, 4); return; }
    couronne(cx, cy, rx, ry, P.bosquet, 50, 7, 500 + i);
  });
  // Les cyprès
  [[236, 262, 336, 7], [254, 258, 336, 7], [278, 230, 336, 8]].forEach(([cx, top, base, w], i) => {
    const b = Math.sin(t * souffle * 0.8 + i) * Math.min(vent, 60) * 0.04;
    x.fillStyle = o("#2C4A38");
    x.beginPath(); x.moveTo(cx - w, base); x.quadraticCurveTo(cx - w * 1.15, (top + base) / 2, cx + b, top); x.quadraticCurveTo(cx + w * 1.15, (top + base) / 2, cx + w, base); x.fill();
    x.fillStyle = o("#406A48"); x.beginPath(); x.moveTo(cx - w * 0.9, base); x.quadraticCurveTo(cx - w, (top + base) / 2, cx + b, top + 4); x.quadraticCurveTo(cx - w * 0.15, (top + base) / 2, cx - w * 0.1, base); x.fill();
    if (neige) { x.fillStyle = jvRgba(blanc, 0.8); for (let k2 = 0; k2 < 4; k2++) jvOvale(x, cx - 2 + (k2 % 2) * 4, top + 18 + k2 * 18, w * 0.4, 2); }
  });
  // Les nuages de buis : un tronc torse, des plateaux taillés
  {
    const bal = Math.sin(t * souffle * 0.4) * Math.min(vent, 60) * 0.015;
    x.strokeStyle = o("#5A4232"); x.lineCap = "round";
    x.lineWidth = 6; x.beginPath(); x.moveTo(78, 392); x.bezierCurveTo(70, 360, 96, 340, 84, 300); x.bezierCurveTo(78, 286, 62, 280, 52, 270); x.stroke();
    x.lineWidth = 3.5; jvTrait(x, 86, 330, 100, 312); jvTrait(x, 82, 356, 98, 352); jvTrait(x, 80, 340, 30, 318);
    [[50, 268, 46, 14], [100, 312, 44, 13], [96, 352, 38, 12], [26, 318, 26, 10]].forEach(([cx, cy, rx, ry], i) => {
      const col = P.nuage;
      x.fillStyle = o(jvMel(col[0], "#10241A", 0.3)); jvOvale(x, cx + bal, cy + 2, rx, ry);
      couronne(cx + bal, cy - 1, rx * 0.92, ry * 0.8, [col[0], col[1], jvMel(col[1], "#F4F2C8", 0.25)], 40, 5, 700 + i);
      if (neige) { x.fillStyle = blanc; x.beginPath(); x.ellipse(cx + bal, cy - ry * 0.35, rx * 0.95, ry * 0.7, 0, Math.PI, 0); x.fill(); }
    });
  }
  // Le grand mur de droite et la grimpante qui en retombe
  beton([[365, 196], [R, 196], [R, 356], [365, 356]], -0.02, true);
  beton([[358, 196], [365, 196], [365, 356], [358, 356]], -0.18, false);
  if (neige) rect(358, 191, R - 358, 6, blanc);
  // Les murets étagés, l'escalier du fond
  boite(L, 368, 75 - L, 72, 8);
  boite(186, 340, 100, 56, 7); boite(216, 368, 70, 30, 5);
  boite(298, 386, 80, 66, 8);
  for (let i = 0; i < 4; i++) boite(92 + i * 4, 392 + i * 11, 180 - i * 4, 12, 4);
  couronne(132, 384, 30, 10, P.bosquet.slice(0, 2), 16, 4, 801);
  // La grimpante : une masse en tête du mur, puis des lianes feuillues qui retombent en courbes
  couronne(392, 250, 40, 24, P.grimpe, 50, 5, 950);
  couronne(440, 270, 36, 26, P.grimpe, 46, 5, 951);
  for (let i = 0; i < 11; i++) {
    const gx = 366 + i * 9.5 + jvAlea(i) * 6, l = 60 + jvAlea(i + 3) * 170, ph = jvAlea(i + 9) * 6;
    const b0 = Math.sin(t * souffle * 0.7 + i * 0.5) * (1 + Math.min(vent, 60) * 0.07);
    for (let k2 = 0; k2 < l / 5; k2++) {
      const u = k2 * 5 / l, px = gx + Math.sin(u * 4 + ph) * 6 + b0 * u * 1.6, py = 262 + k2 * 5;
      x.fillStyle = o(P.grimpe[(k2 + i) % 2]);
      jvOvale(x, px - 3, py, 3.6, 2.2, 0.6 + Math.sin(k2 + i)); jvOvale(x, px + 3, py + 2, 3.6, 2.2, -0.6 + Math.cos(k2 + i));
      if (P.grimpeFleur && (k2 + i) % 5 === 0) { x.fillStyle = o(P.grimpeFleur); jvRond(x, px, py + 1, 1.8); }
    }
  }

  // Le bassin sombre, en perspective, et sa margelle
  beton([[L, 436], [R, 436], [R, 545], [L, 545]], 0.3, false);
  beton([[L, 440], [250, 438], [R, 500], [R, 512], [L, 452]], 0.28, true);
  {
    const ge = x.createLinearGradient(0, 450, 0, 524);
    ge.addColorStop(0, o(jvMel(P.eau[0], haut, 0.2))); ge.addColorStop(1, o(jvMel(P.eau[1], bas, 0.15)));
    x.fillStyle = ge; x.beginPath(); bassin.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill();
    x.save(); x.beginPath(); bassin.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.clip();
    // Reflet du fond : arbres, cyprès, murets, tassé dans le bassin
    const T = x.getTransform(), p0 = T.transformPoint({ x: L, y: 230 }), p1 = T.transformPoint({ x: R, y: 440 }), q = T.transformPoint({ x: L, y: 452 }), q1 = T.transformPoint({ x: L, y: 524 });
    const sx = Math.max(0, p0.x), sw = Math.min(x.canvas.width, p1.x) - sx, sh = p1.y - p0.y, n = 16, hb = sh / n, hd = (q1.y - q.y) / n;
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = gel ? 0.35 : 0.5;
    for (let i = 0; i < n; i++) {
      const dx = Math.sin(t * 1.4 + i * 0.8) * (0.6 + Math.min(vent, 60) * 0.06) * (i / n + 0.3) * T.a;
      x.save(); x.translate(0, q.y + (i + 1) * hd); x.scale(1, -1);
      x.drawImage(x.canvas, sx, p1.y - (i + 1) * hb, sw, hb, sx + dx, 0, sw, hd + 0.5); x.restore();
    }
    x.restore();
    x.fillStyle = jvRgba(o(P.eau[0]), 0.5); x.fillRect(L, 450, R - L, 75);
    if (gel) {
      x.fillStyle = jvRgba(blanc, 0.22); x.fillRect(L, 450, R - L, 75);
      x.strokeStyle = jvRgba(blanc, 0.6); x.lineWidth = 0.8;
      [[10, 480, 120, 492, 200, 486], [150, 506, 260, 512, 330, 506]].forEach(([a, b, c2, d, e2, f]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.lineTo(e2, f); x.stroke(); });
    }
    x.restore();
  }
  beton([[L, 522], [450, 520], [R, 528], [R, 540], [L, 542]], 0.3, true);
  // Le dallage et les marches du premier plan
  beton([[L, 540], [R, 540], [R, 830], [L, 830]], 0.32, false);
  x.strokeStyle = jvRgba(o("#9A948A"), 0.5); x.lineWidth = 0.8;
  for (let k2 = 0; k2 < 5; k2++) jvTrait(x, 190, 660 + k2 * 36, R, 660 + k2 * 36);
  for (let k2 = 0; k2 < 4; k2++) jvTrait(x, 240 + k2 * 70, 650, 230 + k2 * 80, 830);
  if (neige) { x.fillStyle = blanc; x.fillRect(L, 540, R - L, 290); }
  [[185, 548, 30], [190, 584, 30], [196, 620, 30]].forEach(([a, b, h], i) => {
    beton([[a, b], [R, b], [R, b + 8], [a, b + 8]], 0.3, true);
    beton([[a, b + 8], [R, b + 8], [R, b + h], [a, b + h]], -0.3, false);
    { const gs = x.createLinearGradient(0, b + 8, 0, b + h); gs.addColorStop(0, jvRgba(o("#2E2C28"), 0.18)); gs.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gs; x.fillRect(a, b + 8, R - a, h - 8); }
    rect(a, b + h, R - a, 4, jvRgba(o("#4A463E"), 0.18 * (1 - voile)));
    if (neige) rect(a, b - 3, R - a, 6, blanc);
  });
  boite(268, 690, 122, 54, 10);
  // Feuilles et pétales tombés sur le dallage et les marches
  if (P.chute && !neige) for (let i = 0; i < 26; i++) {
    x.fillStyle = o(P.chute[i % P.chute.length]);
    const fx = 200 + jvAlea(i * 7 + 1) * 260, fy = 552 + jvAlea(i * 5 + 2) * 270;
    if (nomS === "automne") jvErable(x, fx, fy, 4 + jvAlea(i) * 2.5, i); else jvOvale(x, fx, fy, 3, 1.6, i);
  }
  // Ombres de feuillage sur le dallage, par beau temps
  if (hs > 0 && voile < 0.6) {
    for (let i = 0; i < 40; i++) {
      x.fillStyle = jvRgba(o("#7A7468"), 0.34);
      jvOvale(x, 200 + jvAlea(i) * 270 + Math.sin(t * souffle * 0.6 + i) * 3, 650 + jvAlea(i + 5) * 170, 10 + jvAlea(i + 2) * 14, 4, -0.4);
    }
  }
  }
  if (Z.D) {
  // Ce qui bouge sur le bassin
  x.save(); x.beginPath(); bassin.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.clip();
    for (let i = 0; i < 16; i++) {
      const px = L + ((jvAlea(i) * (R - L) + t * (3 + (i % 4))) % (R - L)), py = 456 + jvAlea(i + 3) * 64;
      x.fillStyle = `rgba(255,255,255,${(0.14 + 0.16 * Math.sin(t * 1.6 + i)).toFixed(2)})`; x.fillRect(px, py, 8 + jvAlea(i) * 14, 1.1);
    }
    if (lune > 0.05) for (let i = 0; i < 7; i++) { x.fillStyle = `rgba(236,238,246,${(0.5 * lune * (1 - i / 8)).toFixed(2)})`; const w = 14 - i * 1.4; x.fillRect(lx - w / 2 + Math.sin(t * 1.3 + i) * 2, 458 + i * 8, w, 1.5); }
    if (m.pluie && !gel) jvRonds(x, { m, t }, 220, 488, 200, 30);
    if (P.chute && !gel) for (let i = 0; i < 10; i++) { x.fillStyle = o(P.chute[i % P.chute.length]); const fx = 20 + jvAlea(i * 5) * 380 + Math.sin(t * 0.2 + i) * 5, fy = 462 + jvAlea(i * 3) * 54; if (nomS === "automne") jvErable(x, fx, fy, 4.5, i); else jvOvale(x, fx, fy, 3, 1.5, i); }
  x.restore();
  // Les grands bacs plantés
  const bac = (a, b, w, h, cx, base) => {
    // Face du bac : plus sombre que le dallage, et qui fonce vers le pied
    beton([[a, b + 18], [a + w, b + 18], [a + w, b + h], [a, b + h]], -0.26, false);
    const gf = x.createLinearGradient(0, b + 18, 0, b + h);
    gf.addColorStop(0, "rgba(255,255,255,0)"); gf.addColorStop(1, jvRgba(o("#2E2C28"), 0.22));
    x.fillStyle = gf; x.fillRect(a, b + 18, w, h - 18);
    rect(a + w - 8, b + 18, 8, h - 18, jvRgba(o("#2E2C28"), 0.16));
    // Margelle : une arête claire et épaisse, son ombre sous elle
    beton([[a, b], [a + w, b], [a + w, b + 18], [a, b + 18]], 0.42, true);
    rect(a, b + 18, w, 3, jvRgba(o("#2E2C28"), 0.3));
    rect(a, b + h, w, 6, jvRgba(o("#2E2C28"), 0.22 * (1 - voile)));
    if (neige) { x.fillStyle = blanc; x.beginPath(); x.moveTo(a - 1, b + 10); x.lineTo(a - 1, b - 4); x.quadraticCurveTo(a + w / 2, b - 10, a + w + 1, b - 4); x.lineTo(a + w + 1, b + 10); x.fill(); }
    const masse = { lavande: ["#4E7A34", "#6E9A48", "#3E6A2E"], fleurs: ["#5E8A3E", "#7EA44E"], graminees: ["#8E6A3A", "#A07A44"], baies: ["#5E5A50", "#7A746A"] }[P.bac];
    for (let i = 0; i < 6; i++) couronne(a + w * (0.08 + i * 0.17), base - 10 - (i % 2) * 6, w * 0.13, 20, masse, 26, 6.5, a * 3 + i);
    // Ce qui déborde par-dessus la margelle
    if (P.bac !== "baies") rubans(a + 26, b + 14, 70, 16, masse, 2.4);
    if (P.bac === "lavande") {
      rubans(cx - 40, base, 70, 22, ["#5E8A3E", "#7EA44E", "#4E7A34"], 2.2);
      for (let i = 0; i < 80; i++) {
        const lx2 = a + 10 + jvAlea(i + a) * (w - 24), ly2 = base - 4 - jvAlea(i + 3) * 22, h2 = 34 + jvAlea(i + 7) * 40, bb = Math.sin(t * souffle * 1.3 + i) * (1 + Math.min(vent, 60) * 0.08);
        x.strokeStyle = o("#6E8A5A"); x.lineWidth = 1; jvTrait(x, lx2, ly2 + 8, lx2 + bb * 0.5, ly2 - h2 * 0.4);
        for (let k2 = 0; k2 < 7; k2++) { x.fillStyle = o(k2 % 2 ? "#6E58B8" : "#8C76CE"); jvOvale(x, lx2 + bb * (0.5 + k2 * 0.1), ly2 - h2 * 0.4 - k2 * 3.4, 1.9, 2.6); }
      }
    } else if (P.bac === "fleurs") {
      rubans(cx - 40, base, 70, 20, ["#5E8A3E", "#7EA44E"], 2.2);
      couronne(cx, base - 10, w * 0.4, 18, ["#5E8A3E", "#7EA44E"], 30, 6, a + 1);
      for (let i = 0; i < 26; i++) jvFleur(x, a + 14 + jvAlea(i + a) * (w - 30) + Math.sin(t * souffle + i) * 1.2, base - 8 - jvAlea(i + 4) * 30, 3.2, o(i % 3 ? "#FFFFFF" : "#F4B6C6"), o("#E8C84A"));
    } else if (P.bac === "graminees") {
      couronne(a + w * 0.72, base - 16, w * 0.24, 26, ["#B5381E", "#8E2A18", "#D0502A", "#7A2416"], 40, 5.5, a + 77);
      plumets(cx - 30, base, 90, 14);
      for (let i = 0; i < 14; i++) { x.fillStyle = o(i % 2 ? "#B5381E" : "#D0502A"); jvRond(x, a + w - 50 + jvAlea(i) * 40, base - 10 - jvAlea(i + 2) * 30, 2.4); }
    } else {
      plumets(cx - 40, base, 70, 10);
      x.strokeStyle = o("#7A3A2A"); x.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) { const bx = cx + 10 + i * 6, h2 = 40 + jvAlea(i) * 30; jvTrait(x, bx, base, bx + (i - 4) * 3, base - h2); x.fillStyle = o("#C8302A"); for (let k2 = 0; k2 < 4; k2++) jvRond(x, bx + (i - 4) * 3 * (k2 / 4), base - h2 * (0.6 + k2 * 0.1), 2); }
      x.fillStyle = blanc; x.beginPath(); x.ellipse(cx, base - 2, w * 0.45, 10, 0, Math.PI, 0); x.fill();
    }
  };
  bac(L, 560, 190 - L, 140, 90, 576);
  bac(L, 720, 290 - L, 120, 110, 736);
  // Rosée du matin sur le dallage
  if (sol.depuisLever > -0.5 && sol.depuisLever < 2.5 && m.nappe < 0.5 && !neige) {
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(255,253,245,${(0.6 * Math.max(0, Math.sin(t * 1.6 + i * 2.3))).toFixed(2)})`; x.fillRect(200 + jvAlea(i * 7) * 260, 660 + jvAlea(i * 11) * 160, 1.6, 1.6); }
  }
  // Lumières encastrées dans les murets, la nuit
  if (allume > 0.2) [[40, 430], [236, 392], [338, 446], [300, 736], [150, 700]].forEach(([a, b]) => {
    const g = x.createRadialGradient(a, b, 1, a, b, 30); g.addColorStop(0, `rgba(255,214,140,${(0.6 * allume).toFixed(2)})`); g.addColorStop(1, "rgba(255,214,140,0)");
    x.fillStyle = g; x.fillRect(a - 30, b - 30, 60, 60);
  });

  // La branche du coin haut droit
  // La branche est tracée pour la largeur de l'écran : elle se retrace si celle-ci change.
  if (!cache.brancheBr || cache.brancheBrR !== R) {
    const segs = [];
    const pousse = (px, py, ang, len, ep, d, g) => {
      const a = ang + (jvAlea(g) - 0.5) * 0.35, x2 = px + Math.cos(a) * len, y2 = py + Math.sin(a) * len, pli = (jvAlea(g + 1) - 0.5) * len * 0.25;
      segs.push({ x: px, y: py, x2, y2, cx: (px + x2) / 2 - Math.sin(a) * pli, cy: (py + y2) / 2 + Math.cos(a) * pli, ep, d, g });
      if (d >= 5) return;
      pousse(x2, y2, a - 0.32 + (jvAlea(g + 2) - 0.5) * 0.3, len * 0.74, ep * 0.66, d + 1, g * 2 + 1);
      if (d < 3 || jvAlea(g + 3) > 0.3) pousse(x2, y2, a + 0.5 + (jvAlea(g + 4) - 0.5) * 0.4, len * (0.5 + jvAlea(g + 5) * 0.2), ep * 0.55, d + 1, g * 2 + 2);
    };
    pousse(R + 30, 20, Math.PI * 0.88, 90, 10, 0, 5); pousse(R + 30, 90, Math.PI * 0.97, 56, 6, 1, 91);
    cache.brancheBr = segs; cache.brancheBrR = R;
  }
  jvBrancheIllustree(x, Z, cache.brancheBr);
  jvFinScene(x, Z);
  } else x.restore();
  return c;
}

/* Une scène illustrée en deux couches. Le fond immobile est peint dans une
   image gardée en mémoire, et repeint seulement quand le soleil, la lune, le
   temps ou la taille changent ; ce qui vit est peint par-dessus à chaque
   image. Une scène entière coûtait de 30 à 43 millisecondes par image. */
function peindreEnCouches(peintre, x, W, H, t, etat, cache) {
  const T = x.getTransform(), cv = x.canvas, s = etat.sol;
  const cle = [etat.style, etat.saison, etat.temps, etat.gel, Math.round(s.hs), Math.round(s.fr * 40), Math.round(Math.min(2, s.fn) * 20),
    cv.width, cv.height, T.a.toFixed(3), T.e.toFixed(1)].join("|");
  if (!cache.fond || cache.cleFond !== cle) {
    if (!cache.fond) cache.fond = document.createElement("canvas");
    if (cache.fond.width !== cv.width || cache.fond.height !== cv.height) { cache.fond.width = cv.width; cache.fond.height = cv.height; }
    const f = cache.fond.getContext("2d");
    f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, cv.width, cv.height); f.setTransform(T);
    peintre(f, W, H, t, Object.assign({}, etat, { couche: "fond" }), cache);
    cache.cleFond = cle;
  }
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(cache.fond, 0, 0); x.restore();
  return peintre(x, W, H, t, Object.assign({}, etat, { couche: "dessus" }), cache);
}

const JV_STYLES = {
  estampe: { nom: "Estampe", texte: "Lavis sourds, grain de papier, monts dans la brume, branche à l'encre ; un décor par climat." },
  moderne: { nom: "Moderne", texte: "Villa blanche, bassin miroir et marches flottantes, terrasses, haies taillées, cyprès devant les monts.",
    peindre: (x, W, H, t, e, c) => peindreEnCouches(peindreModerne, x, W, H, t, e, c) },
  brutaliste: { nom: "Brutaliste", texte: "Béton brut, grand mur et grimpante, murets étagés, bassin sombre, grands bacs plantés, nuages de buis.",
    peindre: (x, W, H, t, e, c) => peindreEnCouches(peindreBrutaliste, x, W, H, t, e, c) },
};
/* Une image du jardin.
   etat : { theme, saison, temps, vent, gel, sol: { hs, fr, fn, montant, depuisLever } }
   cache : un objet gardé d'une image à l'autre, pour la branche et le grain. */
function peindreJardin(x, W, H, t, etat, cache) {
  const st = JV_STYLES[etat.style] || JV_STYLES.estampe;
  if (st.peindre) return st.peindre(x, W, H, t, etat, cache);
  const th = JV_THEMES[etat.theme] || JV_THEMES.japonais, nomS = etat.saison, s = th.saisons[nomS];
  const m = Object.assign({}, JV_TEMPS[etat.temps] || JV_TEMPS.clair, etat.pluie ? { pluie: etat.pluie } : {});
  const sol = etat.sol, hs = sol.hs, c = cielDuJardin(hs, sol.montant), vent = etat.vent;
  const gris = m.nappe * 0.65 + m.pluie * 0.15;
  const vif = s.ciel ? c.jour * (1 - gris) * 0.85 : 0;
  const haut = jvMel(s.ciel ? jvMel(c.haut, s.ciel[0], vif) : c.haut, "#848B90", gris * c.jour);
  const bas = jvMel(s.ciel ? jvMel(c.bas, s.ciel[1], vif) : c.bas, "#C3C6C3", gris * c.jour);
  const ombre = coul => jvMel(coul, "#141B2A", c.nuit * 0.6 + gris * 0.12);
  const HZ = H * 0.7, voile = Math.min(1, m.nappe * 1.1 + m.brume * 0.3);
  const fn = Math.min(1, sol.fn);
  const lune = sol.fn <= 1 ? (1 - m.nappe * 0.75) * jvBorne(Math.sin(Math.PI * fn), 0, 0.25) * c.nuit : 0;
  const e = { W, H, HZ, t, nomS, s, m, c, sol, hs, vent, souffle: 0.35 + vent / 30, haut, bas, ombre, gris, voile, gel: etat.gel,
    neigeux: nomS === "hiver" && etat.theme !== "mediterraneen" || m.neige > 0, blanc: ombre("#F4F3EE"), lune,
    lx: W * (0.86 - 0.72 * fn), ly: HZ - 110 - Math.sin(Math.PI * fn) * 170,
    sx: W * (0.14 + 0.62 * Math.min(1, Math.max(0, sol.fr))), allume: Math.max(c.nuit, jvBorne(-hs, -2, 4) * 0.8) };

  // Ciel en lavis et étoiles
  const g = x.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, haut); g.addColorStop(1, bas);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  if (c.nuit > 0.05 && m.nappe < 0.8) {
    for (let i = 0; i < 46 * W / 390; i++) {
      const a = c.nuit * (1 - m.nappe) * (0.35 + 0.45 * Math.abs(Math.sin(t * 0.6 + i * 1.7)));
      x.fillStyle = `rgba(240,236,224,${a.toFixed(3)})`;
      x.fillRect(jvAlea(i) * W, jvAlea(i + 99) * HZ * 0.6, 1.3, 1.3);
    }
  }
  // Disque plat du soleil, vermillon près de l'horizon
  if (hs > -4) {
    const sy = HZ - 90 - (hs / 70) * HZ * 0.7, teinte = jvMel("#F3ECD8", "#C4442E", c.chaud);
    const r = x.createRadialGradient(e.sx, sy, 20, e.sx, sy, 60);
    r.addColorStop(0, jvRgba(teinte, 0.28)); r.addColorStop(1, jvRgba(teinte, 0));
    x.globalAlpha = 1 - voile * 0.7; x.fillStyle = r; x.fillRect(e.sx - 60, sy - 60, 120, 120);
    x.globalAlpha = (1 - voile * 0.8) * jvBorne(hs, -4, 1); x.fillStyle = teinte; jvRond(x, e.sx, sy, 21);
    x.globalAlpha = 1;
  }
  // La lune, qui traverse le ciel du coucher au lever, et son halo
  if (lune > 0.01) {
    const hl = x.createRadialGradient(e.lx, e.ly, 10, e.lx, e.ly, 170);
    hl.addColorStop(0, `rgba(226,232,246,${(0.42 * lune).toFixed(3)})`);
    hl.addColorStop(0.35, `rgba(200,212,236,${(0.14 * lune).toFixed(3)})`);
    hl.addColorStop(1, "rgba(200,212,236,0)");
    x.fillStyle = hl; x.fillRect(e.lx - 170, e.ly - 170, 340, 340);
    x.globalAlpha = lune; x.fillStyle = "#F1EEE2"; jvRond(x, e.lx, e.ly, 19);
    x.fillStyle = "rgba(170,170,160,.28)";
    [[-6, -4, 4.5], [5, 3, 3.4], [-2, 8, 2.6], [7, -7, 2]].forEach(([dx, dy, rr]) => jvRond(x, e.lx + dx, e.ly + dy, rr));
    x.globalAlpha = 1;
  }
  // Bandes de nuages poussées par le vent, au bord argenté près de la lune
  const teinte = c.nuit > 0.6 ? jvMel("#363D52", "#525C72", m.nappe)
    : jvMel(jvMel("#F6F2E8", "#E8BFA2", c.chaud * 0.6), "#9A9D9C", gris * 0.6);
  const nb = Math.round((2 + 6 * m.cumulus) * W / 390);
  for (let i = 0; i < nb; i++) {
    const w = 110 + jvAlea(i + 3) * 180, hh = 9 + jvAlea(i + 5) * 6, v = 0.5 + jvAlea(i + 8) * 0.7;
    const nx = ((jvAlea(i) * (W + w) + t * (3 + vent * 0.7) * v) % (W + w)) - w, ny = HZ * (0.12 + jvAlea(i + 1) * 0.5);
    const proche = lune * jvBorne(160 - Math.hypot(nx + w / 2 - e.lx, ny - e.ly), 0, 160);
    x.fillStyle = jvRgba(jvMel(teinte, "#C9D2E6", proche * 0.8), 0.78);
    jvCapsule(x, nx, ny, w, hh); jvCapsule(x, nx + w * 0.22, ny + hh + 3, w * 0.62, hh * 0.8);
  }
  if (m.nappe > 0) {
    const ng = x.createLinearGradient(0, 0, 0, HZ * 0.8);
    ng.addColorStop(0, jvRgba(teinte, 0.9)); ng.addColorStop(1, jvRgba(teinte, 0));
    x.globalAlpha = m.nappe; x.fillStyle = ng; x.fillRect(0, 0, W, HZ * 0.8); x.globalAlpha = 1;
  }
  if (m.orage) {
    const cy = t % 7.5, f = cy < 0.24 ? 1 - cy / 0.24 : (cy > 0.45 && cy < 0.6 ? 0.5 * (1 - (cy - 0.45) / 0.15) : 0);
    if (f > 0) { x.fillStyle = `rgba(230,232,240,${(0.5 * f).toFixed(3)})`; x.fillRect(0, 0, W, H); }
  }

  th.decor(x, e);

  // La vie commune aux thèmes
  if (c.jour > 0.6 && th.oiseaux.indexOf(nomS) !== -1 && !m.pluie) jvOiseaux(x, e, HZ * 0.36);
  if (th.lucioles && c.nuit > 0.5 && nomS === "ete" && !m.pluie) jvLucioles(x, e);
  if (th.papillons && c.jour > 0.6 && (nomS === "printemps" || nomS === "ete") && !m.pluie && vent < 35) jvPapillons(x, e);
  if (th.martinets && nomS === "ete" && c.jour > 0.6) jvMartinets(x, e, HZ * 0.4);
  // Clarté de la lune posée sur le paysage
  if (lune > 0.05) {
    const cl = x.createRadialGradient(e.lx, e.ly, 40, e.lx, e.ly, 520);
    cl.addColorStop(0, `rgba(190,206,236,${(0.2 * lune).toFixed(3)})`); cl.addColorStop(1, "rgba(190,206,236,0)");
    x.fillStyle = cl; x.fillRect(0, 0, W, H);
  }
  if (cache.largeur !== W) { cache.branche = genBranche(W); cache.largeur = W; }
  jvRameau(x, e, cache.branche, th.branche);

  // Ce qui tombe : pétales, feuilles, aiguilles, flocons ; la pluie en traits fins
  const pente = Math.max(-0.5, Math.min(0.5, vent / 95));
  const chute = m.neige ? { forme: "flocon" } : s.chute;
  if (chute && !m.pluie) {
    const n = (chute.forme === "flocon" ? 70 : 12) * W / 390;
    for (let i = 0; i < n; i++) {
      const v = chute.forme === "flocon" ? 20 + jvAlea(i) * 16 : 12 + jvAlea(i) * 8;
      const py = (jvAlea(i + 1) * H + t * v) % (H + 20) - 10;
      const px = (jvAlea(i + 2) * W * 0.8 + W * 0.2 + Math.sin(t * 0.6 + i) * 24 - t * vent * 0.35 + W * 8) % W;
      if (chute.forme === "flocon") { x.fillStyle = "rgba(250,250,246,.85)"; jvRond(x, px, py, 1.3 + jvAlea(i) * 1.6); continue; }
      x.save(); x.translate(px, py); x.rotate(t * (0.5 + jvAlea(i)) + i);
      const coul = ombre(chute.couleurs[i % chute.couleurs.length]);
      if (chute.forme === "petale") { x.fillStyle = jvRgba(coul, 0.9); jvOvale(x, 0, 0, 3, 1.8); }
      else if (chute.forme === "momiji") { x.fillStyle = coul; jvMomiji(x, 0, 0, 5.5, 0); }
      else if (chute.forme === "aiguille") { x.strokeStyle = coul; x.lineWidth = 1; jvTrait(x, -4, 0, 4, 0); }
      else { x.fillStyle = coul; jvOvale(x, 0, 0, 5, 2.6); }
      x.restore();
    }
  }
  if (m.pluie) {
    x.strokeStyle = c.nuit > 0.5 ? "rgba(200,208,222,.3)" : "rgba(56,64,74,.28)"; x.lineWidth = 0.8;
    const n = Math.round(110 * m.pluie * W / 390);
    for (let i = 0; i < n; i++) {
      const v = 560 + jvAlea(i) * 240, py = (jvAlea(i + 3) * H + t * v) % H, px = (jvAlea(i + 7) * W + py * pente + W) % W;
      jvTrait(x, px, py, px + 30 * pente, py + 30);
    }
  }
  if (m.brume > 0.5) {
    for (let i = 0; i < 3; i++) {
      x.fillStyle = jvRgba(bas, 0.35 * m.brume);
      jvCapsule(x, -120 + (t * (5 + i * 3)) % 120 + i * 40, HZ - 60 + i * 60, W * 0.9, 26);
    }
    x.fillStyle = jvRgba(bas, 0.32 * m.brume); x.fillRect(0, 0, W, H);
  }
  // Grain du papier
  {
    if (!cache.grain) {
      const gc = document.createElement("canvas"); gc.width = gc.height = 160;
      const gx = gc.getContext("2d"), d = gx.createImageData(160, 160);
      for (let i = 0; i < 160 * 160; i++) {
        const v = jvAlea(i + 0.5) * 255;
        d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255;
      }
      gx.putImageData(d, 0, 0);
      cache.grain = x.createPattern(gc, "repeat");
    }
    x.globalAlpha = 0.035; x.fillStyle = cache.grain; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  }
  return c;
}

// Le temps de l'heure, dit par l'application, et le ciel que chaque décor en tire.
const JV_DE_TEMPS = { soleil: "clair", soleil_nuage: "nuageux", nuage: "couvert", brume: "brouillard",
  pluie: "pluie", averse: "pluie", orage: "orage", neige: "neige" };
// La toile, ce que les décors gardent d'une image à l'autre, la boucle et l'état du ciel relu au quart d'heure.
const jv = { toile: null, cache: {}, boucle: 0, derniere: 0, etat: null };

/* La hauteur du soleil, sa course dans le jour et celle de la lune dans la
   nuit, au point du jardin. Déclinaison par la série de Spencer, équation du
   temps comprise. Sans commune, le centre de la France. */
function soleilAuJardin(d, lat, lon) {
  const r = Math.PI / 180;
  const debut = Date.UTC(d.getUTCFullYear(), 0, 1);
  const hu = d.getUTCHours() + d.getUTCMinutes() / 60;
  const g = 2 * Math.PI / 365.24 * ((d.getTime() - debut) / 864e5 - 0.5);
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.001480 * Math.sin(3 * g);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const solaire = (((hu + lon / 15 + eqt / 60) % 24) + 24) % 24;
  const ha = (solaire - 12) * 15 * r;
  const hs = Math.asin(Math.sin(lat * r) * Math.sin(dec) + Math.cos(lat * r) * Math.cos(dec) * Math.cos(ha)) / r;
  const c = (Math.sin(-0.833 * r) - Math.sin(lat * r) * Math.sin(dec)) / (Math.cos(lat * r) * Math.cos(dec));
  const jour = c >= 1 ? 0 : c <= -1 ? 24 : 2 * Math.acos(c) / r / 15;
  const lever = 12 - jour / 2;
  return { hs, montant: solaire < 12, depuisLever: solaire - lever,
    fr: jour ? (solaire - lever) / jour : 0,
    fn: jour < 24 ? (((solaire - (12 + jour / 2)) % 24) + 24) % 24 / (24 - jour) : 2 };
}

// L'état du ciel de l'heure : relu par appliquerAmbiance, la toile le lit à chaque image.
function etatDuJardin(saison) {
  const g = jardinActif();
  const lat = g && g.lat !== null && g.lat !== undefined ? Number(g.lat) : 46.6;
  const lon = g && g.lon !== null && g.lon !== undefined ? Number(g.lon) : 2.4;
  const sol = soleilAuJardin(new Date(), lat, lon);
  let temps = "clair", vent = 8, mm = 0, gel = false;
  if (meteo && meteo.daily && iJour() >= 0) {
    const ih = iHeure(), h = meteo.hourly, i = iJour();
    temps = JV_DE_TEMPS[tempsDe(ih >= 0 ? h.weather_code[ih] : meteo.daily.weather_code[i])[2]] || "couvert";
    if (ih >= 0 && h.wind_speed_10m) vent = h.wind_speed_10m[ih] || 0;
    if (ih >= 0 && h.precipitation) mm = h.precipitation[ih] || 0;
    gel = !!(meteo.daily.temperature_2m_min && meteo.daily.temperature_2m_min[i] <= 0);
  }
  // Le décor de l'estampe suit le climat du jardin, sauf choix contraire.
  const theme = JV_THEMES[choixDecor] ? choixDecor : (JV_THEME_DU_CLIMAT[g && g.climate_key] || "japonais");
  // La pluie forte serre ses traits : de la moitié à une fois et demie la densité de base.
  const pluie = temps === "pluie" ? Math.max(0.5, Math.min(1.5, 0.6 + mm / 4)) : 0;
  return { style: choixStyle, theme, saison, temps, pluie, vent: Math.min(60, vent), gel, sol,
    c: cielDuJardin(sol.hs, sol.montant) };
}

/* Une image du jardin. Le décor est pensé pour un écran de 390 points sur
   844 : la toile est mise à l'échelle sur la plus petite des deux mesures, et
   le décor s'étend en largeur sur une tablette ou un écran couché. */
function dessinerJardin(t) {
  const cv = jv.toile, e = jv.etat;
  if (!cv || !e) return;
  const LW = innerWidth, LH = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  const k = Math.min(LW / 390, LH / 844), W = LW / k, H = LH / k;
  if (cv.width !== Math.round(LW * dpr) || cv.height !== Math.round(LH * dpr)) {
    cv.width = Math.round(LW * dpr); cv.height = Math.round(LH * dpr);
  }
  const x = cv.getContext("2d");
  x.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  peindreJardin(x, W, H, t, e, jv.cache);
}

const JV_CALME = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
function animerJardin(actif) {
  cancelAnimationFrame(jv.boucle);
  jv.boucle = 0;
  if (!actif) return;
  if (!jv.toile) jv.toile = document.getElementById("amToile");
  if (!jv.toile) return;
  if (JV_CALME && JV_CALME.matches) { dessinerJardin(20); return; }
  const pas = ms => {
    jv.boucle = requestAnimationFrame(pas);
    if (document.hidden || ms - jv.derniere < 33) return;
    jv.derniere = ms;
    dessinerJardin(ms / 1000);
  };
  jv.boucle = requestAnimationFrame(pas);
}

// Le choix du fond, dans les réglages du compte, vaut pour cet appareil.
function brancherFond() {
  const sel = $("selFond"), selS = $("selStyle"), selD = $("selDecor");
  if (!sel || !selS || !selD) return;
  const options = paires => paires.map(([v, nom]) => `<option value="${v}">${nom}</option>`).join("");
  sel.innerHTML = options(Object.entries(FONDS_ECRAN).map(([v, [nom]]) => [v, nom]));
  selS.innerHTML = options(STYLES_JARDIN.map(v => [v, JV_STYLES[v].nom]));
  selD.innerHTML = options([["climat", "Selon le climat du jardin"]].concat(Object.entries(JV_THEMES).map(([v, th]) => [v, th.nom])));
  sel.value = choixFond; selS.value = choixStyle; selD.value = JV_THEMES[choixDecor] ? choixDecor : "climat";
  // Le style ne vaut que pour le jardin vivant, le décor que pour l'estampe.
  const majLignes = () => {
    $("ligneStyle").hidden = choixFond !== "jardin";
    $("ligneDecor").hidden = choixFond !== "jardin" || choixStyle !== "estampe";
    $("aideFond").textContent = choixFond === "jardin" ? JV_STYLES[choixStyle].texte : FONDS_ECRAN[choixFond][1];
  };
  majLignes();
  const garder = (cle, v) => { try { localStorage.setItem(cle, v); } catch (e) { /* stockage indisponible */ } };
  sel.addEventListener("change", () => {
    choixFond = FONDS_ECRAN[sel.value] ? sel.value : "jardin";
    garder(FOND, choixFond); majLignes(); appliquerAmbiance();
  });
  selS.addEventListener("change", () => {
    choixStyle = STYLES_JARDIN.indexOf(selS.value) !== -1 ? selS.value : "moderne";
    garder(STYLE_JARDIN, choixStyle); majLignes(); appliquerAmbiance();
  });
  selD.addEventListener("change", () => {
    choixDecor = selD.value;
    garder(DECOR_JARDIN, choixDecor); appliquerAmbiance();
  });
}
// Une rotation ou un changement de taille repeint aussitôt la toile immobile.
window.addEventListener("resize", () => { if (choixFond === "jardin" && JV_CALME && JV_CALME.matches) dessinerJardin(20); });
if (JV_CALME && JV_CALME.addEventListener) {
  JV_CALME.addEventListener("change", () => { if (choixFond === "jardin") { animerJardin(false); animerJardin(true); } });
}

function meteoDuMoment() {
  if (!meteo || !meteo.daily || iJour() < 0) return "clair";
  /* Le ciel de l'heure, comme la carte du jour : le code quotidien est celui
     de la condition la plus sévère des vingt-quatre heures. */
  const i = iJour(), d = meteo.daily, ih = iHeure();
  const n = tempsDe(ih >= 0 ? meteo.hourly.weather_code[ih] : d.weather_code[i])[2];
  if (n === "neige") return "neige";
  if (n === "pluie" || n === "averse" || n === "orage") return "pluie";
  if (d.temperature_2m_min && d.temperature_2m_min[i] <= 0) return "gel";
  return n === "soleil" || n === "soleil_nuage" ? "clair" : "couvert";
}

function appliquerAmbiance() {
  const z = document.getElementById("ambiance");
  if (!z) return;
  const saison = saisonDe(demi), a = AMBIANCES[saison];
  const h = new Date().getHours();
  const heure = h >= 5 && h < 10 ? "matin" : h < 17 && h >= 10 ? "jour" : h >= 17 && h < 21 ? "soir" : "nuit";
  const temps = meteoDuMoment();
  const r = document.documentElement.style;
  r.setProperty("--am-base", a.base);
  r.setProperty("--papier", a.base);
  a.taches.forEach((c, k) => r.setProperty("--am-t" + (k + 1), c));
  r.setProperty("--am-branche", a.branche);
  r.setProperty("--am-lumiere", LUMIERES[heure]);
  r.setProperty("--am-voile", VOILES[temps]);
  z.dataset.saison = saison; z.dataset.heure = heure; z.dataset.meteo = temps;
  // Le fond choisi : la toile du jardin ne tourne que quand elle se voit.
  z.dataset.fond = choixFond;
  const racine = document.documentElement;
  racine.dataset.fond = choixFond;
  if (choixFond === "jardin") {
    jv.etat = etatDuJardin(saison);
    /* Le texte posé à même le ciel passe en clair dès que le haut du ciel
       est sombre : au crépuscule, bien avant la nuit, une date foncée ne se
       lisait plus. */
    const [cr, cg, cb] = jvHex(jv.etat.c.haut);
    const nuit = (0.2126 * cr + 0.7152 * cg + 0.0722 * cb) / 255 < 0.45;
    z.dataset.ciel = nuit ? "nuit" : "jour";
    z.dataset.style = choixStyle; z.dataset.decor = jv.etat.theme;
    racine.dataset.ciel = z.dataset.ciel;
    r.setProperty("--am-ciel", jv.etat.c.haut);
    if (!jv.boucle) animerJardin(true);
  } else {
    animerJardin(false);
    delete z.dataset.ciel; delete racine.dataset.ciel; delete z.dataset.style; delete z.dataset.decor;
  }
  // Ce qui tombe ne se redessine que si la saison ou le temps l'ont changé.
  const flocons = a.flocons || temps === "neige";
  const cle = saison + (flocons ? "|f" : "") + (temps === "pluie" ? "|p" : "");
  if (cle === ambianceDite) return;
  ambianceDite = cle;
  const chute = document.getElementById("amChute");
  if (!chute) return;
  const couleurs = flocons ? AMBIANCES.hiver.chute : a.chute;
  // Par temps de pluie, moins de feuilles et plus lentes.
  const n = temps === "pluie" ? 7 : 12;
  const o = [];
  for (let k = 0; k < n; k++) {
    const x = (k * 37 + 7) % 96, t = (flocons ? 6 : 18) + (k * 7) % (flocons ? 6 : 14);
    /* Une feuille met de 44 à 67 secondes à traverser l'écran, de 60 à 83 par
       temps de pluie : à 24 secondes, Jérôme les trouvait trop rapides. */
    const d = (temps === "pluie" ? 60 : 44) + (k * 7) % 24, r0 = ((k * 3.7) % d).toFixed(1);
    // Assez présentes pour se voir sans gêner la lecture : de 55 à 79 %.
    const op = flocons ? (0.55 + (k % 3) * 0.12) : (0.55 + (k % 4) * 0.08);
    const style = `left:${x}%;width:${t}px;height:${t}px;animation-duration:${d}s;`
      + `animation-delay:-${r0}s;opacity:${op.toFixed(2)};color:${couleurs[k % couleurs.length]}`;
    o.push(flocons
      ? `<i class="am-flocon" style="${style}"></i>`
      : `<svg class="am-feuille" viewBox="0 0 24 24" style="${style}">`
        + `<path d="M20 4c0 9-5.4 14-12 14-1.4 0-2.6-.2-3.6-.6C5.6 9.6 11.4 4.6 20 4z"/></svg>`);
  }
  chute.innerHTML = o.join("");
}

// Les nombres s'écrivent avec la virgule, et sans décimale au delà de dix.
const nombreFr = v => (Math.abs(v) >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(".", ","));

const hhmm = s => {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h + " h " + String(m).padStart(2, "0");
};

// Bilan des sept derniers jours : ce qui est tombé face à ce que l'air a pris.
// Quinzaine d'une date de la série météo.
function quinzaineDe(iso) {
  const j = new Date(iso + "T12:00");
  return j.getMonth() * 2 + (j.getDate() <= 15 ? 1 : 2);
}

/* Lame d'eau du jour, par ordre de confiance décroissante : ce que le jardinier
   a lu dans son pluviomètre, puis ce qu'a mesuré le poste rattaché, puis la
   sortie du modèle. Le poste publie avec deux jours de retard, le modèle couvre
   donc toujours les journées les plus récentes. */
function lameDuJour(iso, modele) {
  const r = releves.get(iso);
  const perso = r && r.pluie_mm !== null && r.pluie_mm !== undefined ? Number(r.pluie_mm) : null;
  const poste = pluieStation.has(iso) ? pluieStation.get(iso) : null;
  const source = perso !== null ? "pluviometre" : poste !== null ? "station" : "modele";
  const pluie = perso !== null ? perso : poste !== null ? poste : (modele || 0);
  return { pluie, source, mesuree: source !== "modele",
           arrosage: r && r.arrosage_mm !== null && r.arrosage_mm !== undefined ? Number(r.arrosage_mm) : 0 };
}

/* Bilan hydrique du bulletin FAO 56, chapitre 8. Le sol est un réservoir dont on
   suit l'épuisement jour après jour : Dr = Dr veille moins la pluie et l'arrosage,
   plus la consommation de la culture. L'excédent au-dessus de la capacité au champ
   draine, l'épuisement ne descend pas sous zéro. Le calcul démarre trente jours en
   arrière, à la moitié de la réserve, valeur que la pluie du mois efface. */
function bilanHydrique() {
  const i = iJour();
  if (i < 1) return null;
  const g = jardinActif() || {};
  const texture = RESERVE_SOL[g.sol_texture] ? g.sol_texture : "limoneux";
  const taw = RESERVE_SOL[texture] * ZR_M;
  const d = meteo.daily;
  const kcDe = iso => kcParQuinzaine[quinzaineDe(iso)]
    || kcParQuinzaine[demi] || 0.85;

  /* La lame d'un jour se lit dans la série horaire là où elle le couvre, comme
     partout ailleurs depuis l'audit : le bilan prenait encore la charge
     quotidienne, si bien que la feuille du temps pouvait annoncer six
     millimètres cet après-midi pendant que le bilan continuait de sécher. */
  const lameModele = k => {
    const h = jourHoraire(d.time[k]);
    return h ? h.mm : d.precipitation_sum[k];
  };
  /* Une évapotranspiration inconnue ne veut pas dire que le sol n'a pas séché.
     La valeur nulle passait pour une demande nulle dans le passé et arrêtait la
     projection dans le futur : deux lectures opposées de la même absence. Elle
     reprend la valeur connue la plus proche, comme les trous de la série
     horaire. */
  const et0Connu = d.et0_fao_evapotranspiration
    .map(v => (v === null || v === undefined ? null : Number(v)));
  /* Sans aucune valeur connue, la plus proche n'existe pas et la reprise
     retomberait sur zéro, c'est-à-dire sur une demande nulle : le sol ne
     sécherait jamais et la feuille annoncerait une réserve pleine. Le bilan se
     déclare inconnu, comme il le fait déjà sans jour de référence. */
  if (et0Connu.every(v => v === null)) return null;
  const et0De = k => {
    if (et0Connu[k] !== null) return et0Connu[k];
    for (let e = 1; e < et0Connu.length; e++) {
      if (et0Connu[k - e] !== null && k - e >= 0) return et0Connu[k - e];
      if (et0Connu[k + e] !== null && k + e < et0Connu.length) return et0Connu[k + e];
    }
    return 0;
  };

  /* Le jour en cours ne compte que l'eau déjà arrivée. La boucle prenait le
     cumul de la journée civile entière, orage du soir compris : à huit heures
     du matin la feuille de l'eau affirmait « Sur sept jours, 28 mm sont
     tombés », la jauge les avait déjà déduits, et la même eau était « attendue »
     dans le bandeau. Ce qui reste à tomber part dans la projection. */
  const jourJ = jourHoraire(d.time[i]);
  const tombeJ = jourJ ? jourJ.passe : null;
  const resteJ = jourJ ? Math.max(0, jourJ.mm - jourJ.passe) : 0;

  let dr = taw / 2;
  const serie = [];
  for (let k = 0; k <= i; k++) {
    const brut = k === i && tombeJ !== null ? tombeJ : lameModele(k);
    const l = lameDuJour(d.time[k], brut);
    const et0 = et0De(k);
    const etc = et0 * kcDe(d.time[k]);
    dr = Math.min(taw, Math.max(0, dr - l.pluie - l.arrosage + etc));
    serie.push({ jour: d.time[k], pluie: l.pluie, mesuree: l.mesuree, source: l.source,
                 arrosage: l.arrosage, et0, etc, dr, reste: k === i ? resteJ : 0 });
  }

  // Seuil de confort, ajusté à la demande du jour comme le prévoit le bulletin.
  const etcJour = serie[serie.length - 1].etc;
  const p = Math.min(0.8, Math.max(0.1, P_BASE + 0.04 * (5 - etcJour)));
  const raw = p * taw;

  // Projection sur la prévision : combien de jours avant d'atteindre le seuil,
  // et quelle pluie est annoncée d'ici là.
  /* La projection part de ce qui reste à tomber aujourd'hui, que la boucle du
     passé ne compte plus. */
  let sec = 0, cumulPluie = resteJ, drProj = Math.min(taw, Math.max(0, dr - resteJ));
  for (let k = i + 1; k < d.time.length; k++) {
    const pl = lameModele(k) || 0;
    cumulPluie += pl;
    /* La garde arrêtait ici la boucle au premier jour sans évapotranspiration,
       si bien que « la réserve tient N jours » se tronquait en silence et que
       la feuille de l'eau annonçait une échéance plus proche que la réalité.
       La correction du passé, la valeur connue la plus proche, n'était donc
       appliquée qu'au passé. `et0De` la rend aussi pour les jours annoncés. */
    drProj = Math.min(taw, Math.max(0, drProj - pl + et0De(k) * kcDe(d.time[k])));
    if (drProj < raw) sec++; else break;
  }
  const prevue2 = resteJ + (lameModele(i + 1) || 0) + (lameModele(i + 2) || 0);

  /* Les jours annoncés, lus comme le passé. La feuille de l'eau dessinait ses
     barres en relisant la charge quotidienne et l'évapotranspiration brutes,
     sans la règle de source ni la reprise de la valeur connue la plus proche :
     la jauge et les barres d'une même carte portaient deux lames et deux
     évapotranspirations pour le même jour. */
  const proj = [];
  for (let k = i + 1; k < Math.min(i + 4, d.time.length); k++) {
    const et0 = et0De(k);
    proj.push({ jour: d.time[k], pluie: lameModele(k) || 0, arrosage: 0, mesuree: 0,
                source: "modele", et0, etc: et0 * kcDe(d.time[k]) });
  }

  // Cumuls de la semaine écoulée, pour la lecture d'ensemble.
  let pluie7 = 0, demande7 = 0, apporte7 = 0;
  serie.slice(-7).forEach(x => { pluie7 += x.pluie; demande7 += x.etc; apporte7 += x.arrosage; });

  // La dose ne dépasse pas la fraction facilement utilisable : au-delà, l'eau
  // traverse la zone racinaire sans profiter à la culture.
  const dose = Math.min(dr, raw);
  const arroser = dr >= raw;
  const attendre = arroser && prevue2 >= dose * 0.8;
  return {
    texture, taw, raw, dr, p, etcJour, serie, proj,
    reserve: Math.max(0, 1 - dr / taw),
    jours: arroser ? 0 : Math.max(1, sec),
    apport: Math.round(dose * 10) / 10,
    epuise: dr >= taw - 0.5,
    prevue: Math.round(prevue2 * 10) / 10,
    pluie7: Math.round(pluie7 * 10) / 10,
    demande7: Math.round(demande7 * 10) / 10,
    apporte7: Math.round(apporte7 * 10) / 10,
    etat: attendre ? "attendre" : arroser ? "arroser" : "confort",
  };
}

/* Deux jeux de seuils, et la règle qui les sépare.

   Le bandeau interrompt : ses seuils sont des seuils de décision, il ne parle
   que du grave. La feuille du temps détaille : les siens sont des seuils de
   mention, plus bas, et elle annonce donc plus tôt. L'audit du 16 août pose
   qu'un même fait n'a qu'un seuil de mention dans toute l'application, et que
   les seuils de décision gardent leurs valeurs propres à condition que le code
   le dise. Il le dit ici.

   La règle est que le bandeau ne dise jamais l'inverse de la feuille, non qu'il
   dise tout ce qu'elle dit. Elle impose un sens à chacun des trois écarts. Le
   seuil de gel du bandeau est le plus large des deux : une gelée blanche se
   forme au ras du sol pendant que le thermomètre sous abri lit deux degrés, et
   le bandeau perdrait cette marge en descendant à un degré. Ses seuils de
   chaleur et de vent sont les plus étroits : trente degrés et une rafale de
   quarante kilomètres par heure sont courants et n'ont pas à interrompre.

   `outils/verification.mjs` refuse un dépôt qui inverse l'un de ces trois sens. */
const SEUILS_BANDEAU = { gel: 2, chaleur: 32, vent: 60 };
const SEUILS_FEUILLE = { gel: 1, chaleur: 30, rafale: 40, vent: 25 };

// Alertes du jour et des deux jours suivants, croisées avec le jardin.
/* Les alertes calculées ne répètent pas ce que la vigilance annonce déjà : une
   vigilance canicule couvre l'alerte de chaleur, et ainsi de suite. */
const VIGI_COUVRE = { 1: "vent", 2: "eau", 6: "chaud", 7: "froid" };

function alertesMeteo() {
  const i = iJour();
  if (i < 0) return [];
  const vg = vigilanceDuJour();
  const couverts = vg ? vg.ids.map(x => VIGI_COUVRE[x]).filter(Boolean) : [];
  const d = meteo.daily, out = [];
  /* Les extrêmes et la lame d'un jour se lisent dans la série horaire là où elle
     le couvre, comme la table de la semaine : le bandeau et la feuille étaient
     sinon à l'écran ensemble avec deux couples de valeurs pour le même jour. */
  const jh = k => jourHoraire(d.time[k]);
  const tMin = k => { const j = jh(k); return j ? j.tn : d.temperature_2m_min[k]; };
  const tMax = k => { const j = jh(k); return j ? j.tx : d.temperature_2m_max[k]; };
  const quand = k => k === i ? "aujourd'hui" : k === i + 1 ? "demain"
    : new Date(d.time[k] + "T12:00").toLocaleDateString("fr-FR", { weekday: "long" });
  for (let k = i; k <= Math.min(i + 2, d.time.length - 1); k++) {
    const tmin = tMin(k), tmax = tMax(k);
    if (tmin !== null && tmin <= SEUILS_BANDEAU.gel) {
      const risque = [...sel].map(id => plantes.find(p => p.id === id)).filter(Boolean)
        .filter(p => p.gel !== null && p.gel !== undefined && Number(p.gel) > tmin)
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      out.push({ ton: "froid", texte: `${Math.round(tmin)} °C ${quand(k)}`
        + (risque.length ? `, ${enumerer(risque.map(nomAvecArticle))} ne passe`
            + (risque.length > 1 ? "nt" : "") + " pas" : ", protéger les plus fragiles") });
      break;
    }
    if (tmax !== null && tmax >= SEUILS_BANDEAU.chaleur) {
      out.push({ ton: "chaud", texte: `${Math.round(tmax)} °C ${quand(k)}, arroser tôt et ombrer les jeunes plants` });
      break;
    }
  }
  const v = d.wind_speed_10m_max[i];
  if (v !== null && v >= SEUILS_BANDEAU.vent) out.push({ ton: "vent", texte: `Vent à ${Math.round(v)} km/h, tuteurer et rentrer les potées` });
  /* La pluie du jour ne décide pas de l'arrosage : le bilan du sol le fait, et
     il a déjà déduit cette lame. L'alerte énonce donc le fait quand le sol reste
     en dette malgré elle, se tait quand la pastille d'eau annonce déjà la pluie
     à venir, et ne conseille de ne pas arroser que lorsque le bilan le dit. */
  /* « X mm attendus » portait le cumul de la journée civile, passé compris : à
     dix-neuf heures, dix-huit millimètres tombés le matin s'annonçaient encore
     au futur, pendant que la feuille du temps disait « aucune pluie annoncée ».
     L'alerte ne parle plus que de ce qui reste à tomber. */
  const jour = jourHoraire(d.time[i]);
  const p = jour ? jour.mm - jour.passe : d.precipitation_sum[i];
  if (p !== null && p >= 15) {
    const b = meteo ? bilanHydrique() : null;
    /* Le bilan du sol a seul autorité sur l'arrosage. Quand il ne rend rien,
       faute de jour de référence ou d'évapotranspiration, la lame s'énonce sans
       conclure : « inutile d'arroser » s'écrivait ici sans qu'il ait parlé. */
    if (!b) out.push({ ton: "eau", texte: `${Math.round(p)} mm attendus` });
    else if (b.etat === "arroser") out.push({ ton: "eau", texte: `${Math.round(p)} mm attendus aujourd'hui` });
    else if (b.etat === "confort") out.push({ ton: "eau", texte: `${Math.round(p)} mm attendus, inutile d'arroser` });
  }
  return out.filter(x => couverts.indexOf(x.ton) === -1).slice(0, 2);
}

/* Le niveau retenu est le plus élevé des deux échéances : une vigilance orange
   annoncée pour demain compte autant qu'une vigilance en cours. */
function vigilanceDuJour() {
  const lot = vigilance.filter(v => v.couleur > 1);
  if (!lot.length) return null;
  const couleur = Math.max(...lot.map(v => v.couleur));
  const ids = [];
  lot.forEach(v => (v.phenomenes || []).forEach(p => {
    if (p.couleur === couleur && ids.indexOf(p.id) === -1) ids.push(p.id);
  }));
  if (!ids.length) return null;
  const demainSeul = !lot.some(v => v.echeance === "J" && v.couleur === couleur);
  return {
    couleur, ids,
    libelle: enumerer(ids.map(i => ALEA[i] || "phénomène " + i)) + (demainSeul ? ", demain" : ""),
    geste: ids.map(i => VIGI_GESTE[i]).filter(Boolean)[0] || "",
  };
}

/* La même décision, en deux lignes : la tuile du jour a le tiers de la
   largeur, la feuille de l'eau porte la phrase entière. La tuile ne portait
   que le chiffre : « 4 mm » de pluie attendue se lisait comme un petit
   arrosage, et rien ne disait s'il fallait agir. Elle porte d'abord le verbe,
   puis la quantité, et une icône par décision. */
function eauCourte(b) {
  if (!b) return { verbe: "Inconnue", detail: "", icone: "goutte" };
  if (b.etat === "arroser") {
    return { verbe: "Arroser", detail: nombreFr(b.apport) + " L/m²", icone: "goutte" };
  }
  if (b.etat === "attendre") {
    return { verbe: "Attendre", detail: "pluie " + nombreFr(b.prevue) + " mm", icone: "pluie" };
  }
  return { verbe: "Pas besoin", detail: "réserve " + b.jours + (b.jours > 1 ? " jours" : " jour"),
           icone: "coche" };
}

// La pastille d'eau porte la décision du jour, non un écart à combler.
function mesureEau(b) {
  if (!b) return ["Réserve inconnue", ""];
  if (b.etat === "arroser") return [nombreFr(b.apport) + " litres par m²", "à apporter aujourd'hui", "agir"];
  if (b.etat === "attendre") return [nombreFr(b.prevue) + " mm annoncés", "attendre la pluie"];
  return [b.jours + (b.jours > 1 ? " jours" : " jour") + " de réserve", "sans arroser"];
}

function rendreBandeau() {
  // La météo arrive après le premier rendu : le voile du fond la suit.
  appliquerAmbiance();
  const z = $("bandeau");
  if (!z) return;
  const g = jardinActif();
  if (!g) { z.hidden = true; return; }
  const tm = $("blocTemps");
  if (tm) { tm.hidden = true; tm.innerHTML = ""; }
  if (!meteo || iJour() < 0) {
    // Sans position, la tuile de lumière et celle de saison restent calculables.
    z.innerHTML = g.code_postal ? "" : `<button type="button" class="bd-invite" data-vue="lieu">`
      + icoM("arc") + `<span>Situer le jardin pour la météo et l'arrosage réel</span></button>`;
    z.hidden = !z.innerHTML;
    brancherBandeau();
    return;
  }
  const d = meteo.daily, i = iJour();
  const [, lib, ico] = tempsDe(d.weather_code[i]);
  const b = bilanHydrique();
  const dur = d.daylight_duration[i], veille = d.daylight_duration[i - 1];
  const delta = Math.round((dur - veille) / 60);
  const sais = positionSaison();

  /* Le temps qu'il fait et les trois mesures du jour ouvrent l'écran, dans une
     seule carte : ils parlent tous du même jour, et ils tenaient l'en-tête des
     quatre écrans où ils n'étaient actionnables que sur celui-ci. Les mesures
     sont posées en trois colonnes : empilées, elles repoussaient la première
     tâche hors de l'écran. */
  const t = $("blocTemps");
  // Grand chiffre : la température de l'heure. Le code du jour est celui de la
  // condition la plus sévère des vingt-quatre heures, il annoncerait de la pluie
  // pour un dixième de millimètre tombé à midi.
  const ih = iHeure();
  /* Les extrêmes du jour viennent des heures là où elles couvrent la journée,
     comme la table de la semaine : le bandeau reste visible au-dessus de la
     feuille, et les deux donnaient quatre degrés d'écart pour le même jour. */
  const jourJ = jourHoraire(d.time[i]);
  const maintenant = ih >= 0
    ? { deg: meteo.hourly.temperature_2m[ih], lib: tempsDe(meteo.hourly.weather_code[ih])[1],
        vent: meteo.hourly.wind_speed_10m[ih] }
    : { deg: d.temperature_2m_max[i], lib, vent: d.wind_speed_10m_max[i] };
  const eau = mesureEau(b);
  const tuile = (vue, icone, nom, val, ton) =>
    `<button type="button" class="mesure-j${ton ? " mesure-agir" : ""}" data-vue="${vue}">`
    + icoM(icone, "mj-ic") + `<span class="mj-nom">${nom}</span>`
    + `<b>${esc(val)}</b></button>`;
  const tuileEau = (e, ton) =>
    `<button type="button" class="mesure-j mj-eau${ton ? " mesure-agir" : ""}" data-vue="eau">`
    + icoM(e.icone, "mj-ic") + `<span class="mj-nom">L'eau</span>`
    + `<b>${esc(e.verbe)}</b>` + (e.detail ? `<i class="mj-detail">${esc(e.detail)}</i>` : "")
    + `</button>`;
  /* Le bandeau nommait le ciel sans le dessiner, quand la liste, les moments et
     la semaine le dessinent tous. L'icône de l'heure en cours ouvre la ligne,
     du même dessin et à la même échelle que partout ailleurs. */
  const cielIci = ih >= 0
    ? icoCiel(meteo.hourly.weather_code[ih], meteo.hourly.is_day[ih])
    : ico;
  t.innerHTML = `<h2 class="bloc-titre">Le temps du jour`
    + (g.commune ? `<span class="nb">${esc(g.commune)}</span>` : "") + `</h2>`
    + `<button type="button" class="tm-temps" data-vue="temps">`
    + icoM(cielIci, "tm-ic")
    + `<span class="tm-deg">${Math.round(maintenant.deg)}°</span>`
    + `<span class="tm-etat">${esc(maintenant.lib)}<small>`
    + `${Math.round(jourJ ? jourJ.tx : d.temperature_2m_max[i])}° le jour, `
    + `${Math.round(jourJ ? jourJ.tn : d.temperature_2m_min[i])}° la nuit, `
    + `vent ${Math.round(maintenant.vent)} km/h</small></span></button>`
    + `<div class="mesures-jour">`
    + tuileEau(eauCourte(b), eau[2])
    + tuile("lumiere", "arc", "La lumière", hhmm(dur))
    + tuile("saison", "feuille", "La saison",
            sais.court[0].toUpperCase() + sais.court.slice(1))
    + `</div>`;
  t.hidden = false;
  t.querySelectorAll("[data-vue]").forEach(x =>
    x.addEventListener("click", () => ouvrirVue(x.dataset.vue)));

  /* Tout ce que le temps demande au jardin tient dans une seule carte : un avis
     de vigilance et une lame d'eau annoncée parlent du même ciel, deux cartes
     les faisaient lire comme deux sujets. Les lignes vont de la plus grave à la
     moins grave, et la carte prend la teinte de la première. */
  const lignes = [];
  const vg = vigilanceDuJour();
  if (vg) lignes.push({ ton: "v-" + vg.couleur, vue: "vigilance",
    corps: `<b>Vigilance ${esc(VIGI_NOM[vg.couleur])}</b>, ${esc(vg.libelle)}`
      + (vg.geste ? `<small>${esc(vg.geste)}</small>` : "") });
  alertesMeteo().forEach(a => lignes.push({ ton: a.ton, corps: esc(a.texte) }));
  lignes.sort((a, b) => (GRAVITE[b.ton] || 0) - (GRAVITE[a.ton] || 0));

  if (lignes.length) {
    const CHEV = '<svg class="bd-chev" viewBox="0 0 24 24" aria-hidden="true">'
      + '<path d="M9 5l7 7-7 7"/></svg>';
    z.innerHTML = `<div class="bd-carte t-${lignes[0].ton.replace("-", "")}">`
      + lignes.map(l => l.vue
        ? `<button type="button" class="bd-alerte bd-vigi a-${l.ton}" data-vue="${l.vue}">`
          + icoM("alerte", "bd-ia") + `<span>${l.corps}</span>${CHEV}</button>`
        : `<p class="bd-alerte a-${l.ton}">${icoM(ICONE_TON[l.ton] || "alerte", "bd-ia")}`
          + `<span>${l.corps}</span></p>`).join("")
      + `</div>`;
  } else {
    z.innerHTML = "";
  }
  z.hidden = !lignes.length;
  brancherBandeau();
}

function brancherBandeau() {
  const z = $("bandeau");
  z.querySelectorAll("[data-vue]").forEach(b =>
    b.addEventListener("click", () => ouvrirVue(b.dataset.vue)));
}

// Position dans la saison de végétation et compte à rebours de la première gelée.
function positionSaison() {
  const s = saison[(jardinActif() || {}).climate_key];
  if (!s) return { court: "quinzaine " + demi, sous: "sur 24" };
  const etape = demi < s.debut_q ? "Repos" : demi < s.pleine_q ? "Reprise"
    : demi < s.senescence_q ? "Pleine" : demi <= s.fin_q ? "Déclin" : "Repos";
  const long = { Repos: "repos végétatif", Reprise: "reprise de végétation",
    Pleine: "pleine saison", "Déclin": "ralentissement" }[etape];
  const reste = ((s.fin_q - demi) % 24 + 24) % 24;
  return { court: etape, long,
    sous: reste ? "gelée " + demiTexte(s.fin_q) : "gelée imminente" };
}

/* ---------- Deuxième profondeur, en feuille ---------- */

/* Une feuille ouverte depuis une autre garde le chemin de celle qu'elle
   recouvre : la croix ferme tout, le retour remonte d'un cran. L'historique du
   téléphone n'est pas touché, il continue de fermer la feuille d'un geste. */
let pileFeuille = [];
let vueCourante = null;

function poserRetour() {
  const b = $("retourFeuille");
  if (!b) return;
  const n = pileFeuille[pileFeuille.length - 1];
  b.hidden = !n;
  if (!n) return;
  $("retourNom").textContent = n.titre;
  b.setAttribute("aria-label", "Retour à " + n.titre);
}

function retourFeuille() {
  const p = pileFeuille.pop();
  if (!p) { sortirFeuille(); return; }
  ouvrirVue(p.vue, true);
}

/* Les deux panneaux de réglage ne sont pas reconstruits à chaque ouverture :
   ils vivent dans une réserve hors écran et sont déplacés dans la feuille, puis
   rangés. Leurs champs, leurs sélecteurs et leurs écouteurs survivent ainsi
   intacts, ce qu'une reconstruction en chaîne de caractères perdrait. */
function rangerBlocs() {
  const r = $("reserve-reglages");
  if (!r) return;
  ["bloc-jardin", "bloc-compte"].forEach(id => {
    const b = $(id);
    if (b && b.parentNode !== r) r.appendChild(b);
  });
}

function poserBloc(id) {
  const b = $(id);
  if (b) $("feuille-corps").appendChild(b);
}

function vueJardin() {
  const g = jardinActif();
  return { titre: g && g.name ? g.name : "Mon jardin",
           sous: "Climat et commune", corps: "",
           brancher: () => poserBloc("bloc-jardin") };
}

/* Le bouton Noter est le même partout, ce qu'il porte vient de l'écran. Une
   note prise devant la plante ne devrait pas demander de la renommer, ni une
   note prise dans un carré de redire le carré. */
/* Le contexte se prend au moment de l'appui : le rond mène au carnet avant
   d'ouvrir la feuille, et l'écran d'où l'on vient n'est alors plus lisible. */
function contexteNote() {
  if (planteFeuille) {
    const lieux = (aff.get(planteFeuille.id) || []).map(r => r.espace_id);
    return { plant_id: planteFeuille.id, espace_id: lieux.length === 1 ? lieux[0] : "" };
  }
  if (ecranCourant === "selection" && espaceOuvert && espaceOuvert !== "0") {
    return { espace_id: espaceOuvert, plant_id: "" };
  }
  return { espace_id: "", plant_id: "" };
}

/* Le carnet montre ce qui a déjà été noté là où l'on écrit : depuis un espace,
   ses entrées et celles de ses zones ; depuis une fiche, celles de la plante. */
function entreesDuCarnet(sansFiltres) {
  const c = carnetContexte;
  let lot = carnet;
  if (c && c.plant_id) lot = lot.filter(e => e.plant_id === c.plant_id);
  else if (c && c.espace_id) {
    const sous = [c.espace_id].concat(zonesDe(c.espace_id).map(z => z.id));
    lot = lot.filter(e => sous.includes(e.espace_id));
  }
  if (!sansFiltres && gesteCarnet) lot = lot.filter(e => e.geste === gesteCarnet);
  if (!sansFiltres && rechCarnet) {
    // Le mot se cherche dans le texte, le nom de la plante et celui du lieu.
    const q = rechCarnet.toLowerCase();
    lot = lot.filter(e => {
      const p = e.plant_id ? plantes.find(x => x.id === e.plant_id) : null;
      const l = noeud(e.espace_id);
      return [e.texte, p && p.nom, l && l.name, GESTE_NOM[e.geste]]
        .some(t => t && String(t).toLowerCase().includes(q));
    });
  }
  return lot.slice().sort((a, b) => (a.jour < b.jour ? 1 : a.jour > b.jour ? -1 : 0));
}

/* Les pastilles du carnet : le jardin entier ou l'un de ses espaces, puis les
   gestes qui y sont notés, et une recherche. Un espace choisi remplace le
   contexte ; une plante ouverte depuis sa fiche le reste tant qu'on ne choisit
   pas un lieu. */
function rendreFiltresCarnet() {
  const z = $("filtresCarnet");
  if (!z) return;
  const c = carnetContexte || {};
  const ici = c.espace_id ? racineDe(c.espace_id) : (c.plant_id ? null : "");
  const lieux = racines();
  const gestes = [...new Set(entreesDuCarnet(true).map(e => e.geste).filter(Boolean))]
    .sort((a, b) => Object.keys(GESTE_NOM).indexOf(a) - Object.keys(GESTE_NOM).indexOf(b));
  if (gesteCarnet && !gestes.includes(gesteCarnet)) gesteCarnet = null;
  const pastille = (attr, val, lib, on) => `<button type="button" class="chip" ${attr}="${esc(val)}"`
    + ` aria-pressed="${on}">${esc(lib)}</button>`;
  z.innerHTML = (lieux.length ? `<div class="jeu-chips fc-lieux">`
      + pastille("data-fc-lieu", "", "Tout le jardin", ici === "")
      + lieux.map(r => pastille("data-fc-lieu", r.id, r.name, ici === r.id)).join("") + `</div>` : "")
    + (gestes.length > 1 ? `<div class="jeu-chips fc-gestes">`
      + gestes.map(g => pastille("data-fc-geste", g, GESTE_NOM[g] || g, gesteCarnet === g)).join("")
      + `</div>` : "")
    + `<input type="search" id="rechCarnetIn" class="fc-rech" placeholder="Chercher dans le carnet"`
    + ` aria-label="Chercher dans le carnet" value="${esc(rechCarnet)}">`;
  z.querySelectorAll("[data-fc-lieu]").forEach(b => b.addEventListener("click", () => {
    carnetContexte = b.dataset.fcLieu ? { espace_id: b.dataset.fcLieu, plant_id: "" } : null;
    rendreJournal();
  }));
  z.querySelectorAll("[data-fc-geste]").forEach(b => b.addEventListener("click", () => {
    gesteCarnet = gesteCarnet === b.dataset.fcGeste ? null : b.dataset.fcGeste;
    rendreJournal();
  }));
  // La recherche ne redessine que la liste : redessiner le champ perdrait la frappe.
  z.querySelector("#rechCarnetIn").addEventListener("input", ev => {
    rechCarnet = ev.target.value.trim();
    rendreJournal(true);
  });
}

function nomDuContexte() {
  const c = carnetContexte;
  if (c && c.plant_id) {
    const p = plantes.find(x => x.id === c.plant_id);
    return p ? p.nom : "";
  }
  if (c && c.espace_id) {
    const n = noeud(c.espace_id);
    return n ? n.name : "";
  }
  return "";
}

/* Tous les lieux du jardin, l'espace puis ses zones, pour la note prise hors
   d'un espace. La liste garde l'ordre de l'écran des espaces. */
function tousLesLieux() {
  const o = [];
  racines().forEach(r => {
    o.push({ id: r.id, nom: r.name });
    zonesDe(r.id).forEach(z => o.push({ id: z.id, nom: r.name + ", " + z.name }));
  });
  return o;
}

function vueNote() {
  return {
    titre: (saisiePartout && saisiePartout.entree) ? "Corriger l'entrée" : "Noter",
    sous: "", corps: `<div id="corpsNote"></div>`,
    brancher: () => {
      const z = $("corpsNote");
      if (!z) return;
      const etat = saisiePartout || contexteNote();
      saisiePartout = etat;
      // Une entrée corrigée laisse tout se rechoisir, plante comprise.
      const p = !etat.entree && etat.plant_id ? plantes.find(x => x.id === etat.plant_id) : null;
      /* Le lieu se choisit parmi ceux que la plante occupe. Une plante encore
         placée nulle part n'interdit pas d'en noter quelque chose : le jardin
         entier est alors offert, faute de quoi la saisie serait une impasse. */
      const places = p ? (aff.get(p.id) || []).map(r => noeud(r.espace_id))
                           .filter(Boolean).map(x => ({ id: x.id, nom: x.name })) : [];
      const lieux = places.length ? places : tousLesLieux();
      if (p) {
        const t = document.createElement("p");
        t.className = "note-sujet";
        t.textContent = p.nom;
        z.appendChild(t);
      }
      /* Un jardin sans espace se note par ses plantes : la saisie n'est une
         impasse que s'il n'a ni lieu ni plante. */
      if (!lieux.length && !sel.size) {
        const v = document.createElement("p");
        v.className = "vide";
        v.textContent = "Aucune plante ni aucun lieu au jardin. Le livre de l'en-tête ouvre le catalogue.";
        z.appendChild(v);
        return;
      }
      /* La feuille se ferme sur le carnet, qui l'attend derrière : l'entrée
         écrite s'y lit aussitôt. */
      z.appendChild(formulaireEntree(etat, lieux, p || null, () => {
        saisiePartout = null;
        fermerFeuille();
        rendreJournal();
        rendreEspaces();
      }));
    },
  };
}

function rendreJournal(listeSeule) {
  const z = $("corpsJournal");
  if (!z) return;
  majTeteCarnet();
  if (listeSeule !== true) rendreFiltresCarnet();
  z.innerHTML = "";
  const lot = entreesDuCarnet();
  if (!lot.length) {
    z.innerHTML = gesteCarnet || rechCarnet
      ? `<p class="vide">Aucune entrée ne correspond à ce filtre.</p>`
      : `<p class="vide">Rien de noté ${nomDuContexte() ? "ici" : "au jardin"} pour l'instant.</p>`;
    return;
  }
  /* Les entrées se rangent par mois : une saison se relit par ses mois, non par
     une suite de jours qui se ressemblent. */
  let mois = "";
  lot.forEach(e => {
    const m = new Date(e.jour + "T12:00")
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (m !== mois) {
      mois = m;
      const t = document.createElement("b");
      t.className = "jo-mois";
      t.textContent = m.charAt(0).toUpperCase() + m.slice(1);
      z.appendChild(t);
    }
    z.appendChild(ligneEntree(e, { plante: true, apres: rendreJournal }));
  });
  poserPhotosCarnet(z);
}

function vueCompte() {
  return { titre: "Compte", corps: "", brancher: () => poserBloc("bloc-compte") };
}

/* Les dix couleurs de la frise n'étaient nommées que dans le panneau des
   filtres, replié : les barres se lisaient sans qu'on sache de quelle tâche
   elles parlent. La légende se lit à part, sans toucher aux filtres. */
function vueLegende() {
  const cles = ORDRE.filter(k => phases[k]);
  return { titre: "Les couleurs de l'année",
    corps: `<div class="lg-liste">` + cles.map(k =>
        `<div class="lg-ligne"><i style="background:${teinteK(k)}"></i>`
        + `<span>${esc(phases[k].label)}</span></div>`).join("") + `</div>`
      + `<p class="f-txt">Une barre couvre la période où la tâche se fait sous le `
      + `climat du jardin. La toucher en donne les dates et le conseil.</p>`
      + `<p class="f-note">Périodes du référentiel, décalées par le climat de la `
      + `commune. La colonne teintée marque la quinzaine en cours.</p>` };
}

/* Ce qu'une barre de la frise a de plus que sa couleur : ses bornes et le
   conseil propre à cette fenêtre, quand la fiche en porte un par période. */
function vuePeriode() {
  const d = periodeFeuille;
  if (!d || !phases[d.k]) return { titre: "Période", corps: "" };
  const conseil = conseilDeFenetre(d.p, d.k, d.id);
  const ici = dansFenetre(demi, d.a, d.b);
  return { titre: phases[d.k].label, sous: d.p.nom,
    corps: `<p class="pe-bornes"><i style="background:${teinteK(d.k)}"></i>`
      + `<b>${esc(majuscule(bornesTexte(d.a, d.b)))}</b></p>`
      + `<p class="f-txt">${ici ? "La période court cette quinzaine."
          : `La quinzaine en cours, ${esc(demiTexte(demi))}, est hors de cette période.`}</p>`
      + (conseil ? `<p class="f-txt">${esc(conseil)}</p>` : "")
      + `<button type="button" class="lien pe-fiche">Ouvrir la fiche de `
      + `${esc(d.p.nom.toLowerCase())}</button>`
      + `<p class="f-note">Période du référentiel, décalée par le climat de la commune.</p>`,
    brancher: () => {
      const b = document.querySelector(".pe-fiche");
      if (b) b.addEventListener("click", () => ouvrirFeuille(d.p, "annee"));
    } };
}

/* Ce que la personne a écarté de ses fiches, et de quoi le remettre. Masquer du
   contenu sans offrir de revenir en arrière ferait d'une erreur de doigt une
   décision définitive. */
function vuePhotosEcartees() {
  return { titre: "Photographies écartées", corps: '<div id="listeEcartees"></div>',
           brancher: rendreEcartees };
}

async function rendreEcartees() {
  const z = $("listeEcartees");
  if (!z) return;
  const ids = [...avisPhoto].filter(([, a]) => a === "supprimer").map(([i]) => i);
  if (!ids.length) {
    z.innerHTML = '<p class="vide">Vous n\'avez écarté aucune photographie.</p>';
    return;
  }
  z.innerHTML = '<p class="vide">Chargement.</p>';
  let lot = [];
  try {
    const { data } = await db.from("plant_images")
      .select("id,plant_id,organe,url,auteur").in("id", ids);
    lot = data || [];
  } catch (e) {
    z.innerHTML = '<p class="vide">Liste indisponible sans réseau.</p>'; return;
  }
  lot.sort((a, b) => (nomPlante(a.plant_id) || "").localeCompare(nomPlante(b.plant_id) || "", "fr"));
  z.innerHTML = "";
  lot.forEach(x => {
    const l = document.createElement("div");
    l.className = "ligne-ecartee";
    l.innerHTML = `<img src="${esc(x.url)}" alt="" loading="lazy">`
      + `<span class="ec-nom">${esc(nomPlante(x.plant_id) || "plante retirée")}`
      + `<small>${esc(PH_NOM[x.organe] || x.organe)}</small></span>`
      + `<button class="lien" type="button">Remettre</button>`;
    l.querySelector("button").addEventListener("click", async () => {
      await retirerAvisPhoto(x.id);
      rendreEcartees();
      rafraichirPhotos();
    });
    z.appendChild(l);
  });
}


function ouvrirVue(vue, enRetour) {
  fermerGlose();
  rangerBlocs();
  /* « Le jour » a disparu : ses trois mesures se lisent sur l'écran du jour, et
     chacune ouvre encore la sienne. */
  const rendus = { temps: vueTemps, eau: vueEau, lumiere: vueLumiere,
                   saison: vueSaison, lieu: vueLieu, vigilance: vueVigilance,
                   jardin: vueJardin, compte: vueCompte, note: vueNote,
                   legende: vueLegende, periode: vuePeriode,
                   photosEcartees: vuePhotosEcartees };
  const f = (rendus[vue] || vueLieu)();
  if (!enRetour && vueCourante && !$("feuille").hidden) pileFeuille.push(vueCourante);
  if (vue !== "note" && vue !== "journal") planteFeuille = null;
  vueCourante = { vue, titre: f.titre };
  poserRetour();
  /* Un sous-titre peut porter une icône devant lui : la feuille du temps y
     nomme le ciel, et le nommer sans le dessiner était le seul endroit de
     l'application où l'état du ciel n'avait pas son dessin. */
  $("feuille-titre").innerHTML = esc(f.titre)
    + (f.sous ? `<span class="feuille-latin">`
      + (f.icoSous ? icoM(f.icoSous, "f-sous-ic") : "") + esc(f.sous) + `</span>` : "");
  $("feuille-corps").innerHTML = `<div class="fiche-v2">${f.corps}</div>`;
  $("feuille-corps").scrollTop = 0;
  poserEtatFeuille();
  $("voile").hidden = false;
  $("feuille").hidden = false;
  document.body.classList.add("fige");
  requestAnimationFrame(() => {
    $("voile").classList.add("visible");
    $("feuille").classList.add("ouverte");
    $("feuille").focus();
  });
  if (typeof f.brancher === "function") f.brancher();
  if (vue === "lieu") brancherLieu();
}

const jourCourt = t => new Date(t + "T12:00")
  .toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
const jourLong = t => new Date(t + "T12:00")
  .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
// Sévérité d'un code de temps, pour retenir le ciel dominant d'une tranche.
const GRAVITE_CIEL = c => (c >= 95 ? 100 : c >= 80 ? 90 : c >= 71 ? 80 : c >= 51 ? 70 : c);

/* ---------------------------------------------------------------------------
   La feuille du temps. Elle s'ouvre par la pastille météo du bandeau, quand la
   date ouvre la feuille du jour : l'une porte la prévision, l'autre les mesures.
   --------------------------------------------------------------------------- */

/* Les vingt-quatre heures à venir, à partir de l'heure en cours. La fenêtre
   traverse minuit : au jardin la nuit qui vient pèse autant que la fin de
   l'après-midi, et le soir la journée écoulée n'apprend plus rien. */
function serieHoraire() {
  const i = iHeure();
  if (i < 0 || !meteo.hourly || !meteo.hourly.wind_gusts_10m) return null;
  const h = meteo.hourly;
  const n = Math.min(24, h.time.length - i);
  if (n < 8) return null;
  /* Un trou dans la charge n'est pas une valeur nulle. Zéro degré en août
     déclenchait « gel probable, voiler ce qui craint », un indice UV nul à midi
     ouvrait un créneau d'arrosage en plein soleil, un jour marqué nuit dessinait
     une lune à quatorze heures. Les grandeurs continues reprennent donc la
     valeur connue la plus proche, avant ou après. Une lame de pluie, elle, vaut
     bien zéro quand rien n'est annoncé : interpoler y inventerait de l'eau. */
  const p = (c, cumul) => {
    const b = (h[c] || []).slice(i, i + n)
      .map(v => (v === null || v === undefined ? null : v));
    if (cumul) return b.map(v => (v === null ? 0 : v));
    let der = null;
    const out = b.map(v => (v === null ? der : (der = v)));
    let suiv = null;
    for (let k = n - 1; k >= 0; k--) {
      if (b[k] !== null) suiv = b[k];
      else if (out[k] === null) out[k] = suiv;
    }
    return out.map(v => (v === null ? 0 : v));
  };
  return { n,
    heure: h.time.slice(i, i + n).map(t => Number(t.slice(11, 13))),
    jour: h.time.slice(i, i + n).map(t => t.slice(0, 10)),
    t: p("temperature_2m"), res: p("apparent_temperature"), ros: p("dew_point_2m"),
    hum: p("relative_humidity_2m"), mm: p("precipitation", true), pb: p("precipitation_probability"),
    code: p("weather_code"), nua: p("cloud_cover"), pres: p("pressure_msl"),
    v: p("wind_speed_10m"), raf: p("wind_gusts_10m"), dir: p("wind_direction_10m"),
    uv: p("uv_index"), clair: p("is_day"),
    /* La lame de la série de secours sur la même fenêtre, pour la comparer à
       celle qu'AROME a posée. Absente si la charge n'en porte pas. */
    mmS: (() => {
      const b = meteo.horaireSecours;
      if (!b || !Array.isArray(b.precipitation) || !Array.isArray(b.time)) return null;
      const r = new Map(b.time.map((t, k) => [t, k]));
      return h.time.slice(i, i + n).map(t => {
        const k = r.get(t);
        const v = k === undefined ? null : b.precipitation[k];
        return v === null || v === undefined ? 0 : v;
      });
    })() };
}

/* Deux modèles chargés, un seul qui annonce la pluie : la prévision est alors
   incertaine, et le dire vaut mieux que trancher en silence. Le seuil est
   décidé par ce qui change une décision au jardin : un millimètre d'un côté et
   rien de l'autre font arroser ou non. Un écart de quelques dixièmes ne dit
   rien et ferait paraître la mention presque tous les soirs d'été. */
function divergencePluie(s) {
  if (!s.mmS) return null;
  const a = s.mm.reduce((x, y) => x + y, 0);
  const b = s.mmS.reduce((x, y) => x + y, 0);
  const haut = Math.max(a, b), bas = Math.min(a, b);
  /* La règle ne reconnaissait qu'un motif, l'un annonce et l'autre pas :
     quarante-deux millimètres contre trois dixièmes ne déclenchait rien, le
     plus sec dépassant deux dixièmes. Un rapport de un à cent quarante est
     pourtant plus incertain qu'un millimètre contre zéro. C'est donc le rapport
     qui décide, avec un plancher pour que des dixièmes ne parlent pas. */
  if (haut < 1 || bas > haut / 4) return null;
  return { haut, bas, arome: a > b };
}

/* Ce qu'une journée civile vaut d'après la série horaire.

   La table de la semaine lisait la charge quotidienne, qui vient de la sélection
   automatique, quand les heures viennent d'AROME. Le même dimanche y portait
   vingt-neuf degrés et trente-deux, « orage » et « couvert », trois millimètres
   et six dixièmes et rien du tout : deux sources pour un seul jour font trois
   contradictions dans une même feuille. La table prend donc les heures là où
   elles couvrent la journée entière, et la charge quotidienne au-delà.

   La série horaire part de zéro heure du jour en cours et couvre deux jours :
   aujourd'hui et demain se calculent, le reste de la semaine non. */
function jourHoraire(date) {
  const h = meteo && meteo.hourly;
  if (!h || !Array.isArray(h.time)) return null;
  const k = [];
  h.time.forEach((t, j) => { if (t.slice(0, 10) === date) k.push(j); });
  if (k.length < 24) return null;
  const val = (c, j) => {
    const v = (h[c] || [])[j];
    return v === null || v === undefined ? null : v;
  };
  const t = k.map(j => val("temperature_2m", j)).filter(v => v !== null);
  // Une journée trouée ne se résume pas : la charge quotidienne reprend la main.
  if (t.length < k.length) return null;
  const ih = iHeure();
  return {
    tx: Math.max(...t), tn: Math.min(...t),
    mm: k.reduce((a, j) => a + (val("precipitation", j) || 0), 0),
    /* Ce qui est déjà tombé dans la journée en cours. La table donne la journée
       civile, les heures partent de maintenant : trois millimètres tombés à
       trois heures du matin manquaient à l'appel sans que rien ne le dise. */
    passe: ih < 0 ? 0
      : k.filter(j => j < ih).reduce((a, j) => a + (val("precipitation", j) || 0), 0),
    code: k.reduce((a, j) => {
      const c = val("weather_code", j);
      return c !== null && GRAVITE_CIEL(c) > GRAVITE_CIEL(a) ? c : a;
    }, 0),
  };
}

// Les plages d'heures consécutives qui vérifient une condition.
function plagesDe(n, test) {
  const out = [];
  for (let k = 0; k < n;) {
    if (!test(k)) { k++; continue; }
    let j = k;
    while (j < n && test(j)) j++;
    out.push([k, j - 1]);
    k = j;
  }
  return out;
}

const CARDINAUX = ["nord", "nord-est", "est", "sud-est", "sud",
                   "sud-ouest", "ouest", "nord-ouest"];
const CARD_ABR = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
const iCard = d => Math.round((((d % 360) + 360) % 360) / 45) % 8;
const cardinal = d => CARDINAUX[iCard(d)];
// « de est » et « de ouest » ne se disent pas.
const dCardinal = d => {
  const c = cardinal(d);
  return (c[0] === "e" || c[0] === "o" ? "d'" : "de ") + c;
};

/* ---------- Le météogramme ----------
   Une voie par grandeur, empilées sur le même axe des heures. Deux tracés ne
   partagent une voie que s'ils partagent l'unité et se lisent l'un par rapport
   à l'autre : la température avec le ressenti et le point de rosée, le vent
   avec ses rafales. Superposer la pluie en millimètres et le vent en kilomètres
   par heure aurait mis deux échelles sous une seule graduation. */
const MG_L = 358, MG_M = 5, MG_P = MG_L - 2 * MG_M;

/* Ce que le ruban en cours de rendu sait dire d'une heure. Une seule variable
   suffit : un seul ruban est à l'écran à la fois. */
let mgLecture = null;

/* Sept voies tiennent dans un écran de téléphone au prix d'une hauteur qui
   n'excède pas quatre-vingt-six points. Une voie touchée s'agrandit alors seule,
   d'un facteur deux et demi : sa courbe reprend du relief, et le dessin porte ce
   qu'il ne pouvait pas montrer replié, les valeurs heure par heure, une
   graduation plus fine et la lecture de ses tracés. Les autres voies gardent
   leur taille, la pile restant lisible d'un bout à l'autre.

   La série et l'heure lue sont gardées de côté : l'agrandissement recompose le
   ruban, et une heure lue avant lui doit se retrouver après. */
const MG_Z = 2.5;
let mgZoom = null, mgSerie = null, mgLu = -1;
/* La température, la pluie et le vent décident d'un geste au jardin ; le ciel,
   l'indice UV, l'humidité et la pression le précisent. Les quatre derniers se
   replient derrière un lien, le choix tenant le temps de la session. */
let mgAutres = false;

/* Une hauteur nulle réduit la voie à sa ligne de titre, sans dessin ni commande.
   Le titre d'une voie dessinée est le bouton qui l'agrandit, et le signe qu'il
   porte dit dans quel sens il agit. La lecture des tracés, qui apprend quelque
   chose la première fois et se lit en pure perte ensuite, paraît avec
   l'agrandissement plutôt que sous une commande à elle. */
let nVoie = 0;
function mgVoie(nom, droite, haut, dedans, legende, cle) {
  // La plage est gardée sur la balise : la lecture d'une heure la remplace.
  const val = `<span class="mg-r" data-plage="${esc(droite)}">${esc(droite)}</span>`;
  if (!haut) {
    return `<div class="mg-v"><p class="mg-t">${esc(nom)}` + val + `</p></div>`;
  }
  /* Le montant de lecture est posé dès le dessin, replié : le faire naître au
     toucher obligerait à recomposer un dessin à chaque déplacement du doigt. */
  const dessin = `<svg class="mg-s" viewBox="0 0 ${MG_L} ${haut}" aria-hidden="true">${dedans}`
    + `<line class="mg-cur" x1="0" y1="0" x2="0" y2="${haut}" hidden/></svg>`;
  const grand = mgZoom === cle;
  const id = `mgl${++nVoie}`;
  const leg = legende
    ? `<p class="mg-l" id="${id}"${grand ? "" : " hidden"}>${esc(legende)}</p>` : "";
  return `<div class="mg-v${grand ? " mg-grand" : ""}">`
    + `<button type="button" class="mg-t mg-b" data-voie="${esc(cle)}" `
    + `aria-expanded="${grand}"${legende ? ` aria-controls="${id}"` : ""}>`
    + `<span class="mg-n">${esc(nom)}<i aria-hidden="true">${grand ? "−" : "+"}</i></span>`
    + val + `</button>` + dessin + leg + `</div>`;
}

function dessinMeteogramme(s) {
  mgSerie = s;
  const X = k => MG_M + k / s.n * MG_P;
  const LA = MG_P / s.n;
  const u = v => v.toFixed(1);
  const bornes = t => `${Math.round(Math.min(...t))} à ${Math.round(Math.max(...t))}`;

  /* Les montants et les libellés de l'axe sont décidés ensemble : un montant
     sans libellé laisserait une graduation muette. Le premier libellé est
     l'heure en cours, en vert comme dans la liste ; les suivants tombent sur
     les six heures, et l'un d'eux est écarté s'il vient se coller au premier.
     La chasse est fixe, six points par signe. */
  const CHASSE = 6;
  const ICI = String(s.heure[0]).padStart(2, "0") + " h";
  const finIci = MG_M + ICI.length * CHASSE + 7;
  const montants = [];
  for (let k = 1; k < s.n; k++) {
    if (s.heure[k] % 6 !== 0) continue;
    const lib = s.heure[k] === 0 ? jourCourt(s.jour[k]) : String(s.heure[k]).padStart(2, "0") + " h";
    if (X(k) - lib.length * CHASSE / 2 < finIci) continue;
    montants.push([k, lib]);
  }

  /* La nuit est lavée dans toutes les voies, et un montant marque chaque tranche
     de six heures, aux abscisses mêmes où l'axe pose ses libellés. Sans ces
     montants, une bosse au milieu de la pile ne se rattachait à aucune heure :
     il fallait descendre jusqu'à l'axe et remonter à l'oeil. Minuit garde son
     pointillé plus marqué, c'est une frontière de journée et non une graduation.
     Le lavis de nuit est facultatif : sur les bandes de valeur il se confondrait
     avec ce qu'elles montrent. */
  const fond = (h, lavis) => {
    let o = "";
    if (lavis !== false) plagesDe(s.n, k => !s.clair[k]).forEach(([a, b]) => {
      o += `<rect x="${u(X(a))}" y="0" width="${u(X(b + 1) - X(a))}" height="${h}" `
        + `fill="#16241E" opacity=".045"/>`;
    });
    montants.forEach(([k]) => {
      const nuit = s.heure[k] === 0;
      o += `<line x1="${u(X(k))}" y1="0" x2="${u(X(k))}" y2="${h}" stroke="#16241E" `
        + `opacity="${nuit ? ".22" : ".10"}"${nuit ? ' stroke-dasharray="2 3"' : ""}/>`;
    });
    return o;
  };
  const pts = (vals, y0, y1, mn, mx) => vals.map((v, k) =>
    `${u(X(k + .5))},${u(y1 - (v - mn) / ((mx - mn) || 1) * (y1 - y0))}`).join(" ");
  const aire = (vals, y0, y1, mn, mx) => `M${u(X(.5))},${u(y1)} L`
    + pts(vals, y0, y1, mn, mx).replace(/ /g, " L") + ` L${u(X(s.n - .5))},${u(y1)} Z`;
  const fil = (y, h, teinte, op) => `<line x1="${MG_M}" y1="${u(y)}" x2="${MG_L - MG_M}" `
    + `y2="${u(y)}" stroke="${teinte}" opacity="${op}" stroke-dasharray="2 3"/>` + h;
  /* Le chiffre d'un repère se pose au bord droit, et par-dessus les tracés : un
     filet passe sous une courbe sans dommage, un nombre coupé par elle ne se lit
     plus. Le liseré de papier de la classe fait le reste. */
  const chiffre = (y, txt) => `<text class="mg-g" x="${MG_L - MG_M}" y="${u(y)}" `
    + `text-anchor="end">${esc(txt)}</text>`;
  /* Une graduation horizontale au pas donné, sur les seules valeurs couvertes.
     Sans elle, l'amplitude d'une bosse ne se rattachait à rien : une voie
     dessinait un relief sans dire de combien il monte. Les filets et les
     chiffres reviennent séparés, les uns allant sous le dessin et les autres
     dessus. */
  const graduation = (y0, y1, mn, mx, pas, ecrire) => {
    let traits = "", chiffres = "";
    for (let d = Math.ceil(mn / pas) * pas; d < mx; d += pas) {
      const yd = y1 - (d - mn) / (mx - mn) * (y1 - y0);
      traits += `<line x1="${MG_M}" y1="${u(yd)}" x2="${MG_L - MG_M}" y2="${u(yd)}" `
        + `stroke="#16241E" opacity=".08"/>`;
      chiffres += chiffre(yd - 2.5, ecrire(d));
    }
    return [traits, chiffres];
  };
  // Une étiquette près d'un bord se cale sur ce bord plutôt que de le dépasser.
  const etiq = (k, y, txt, cls) => {
    const anc = k < 2 ? "start" : k > s.n - 3 ? "end" : "middle";
    const x = k < 2 ? MG_M + 1 : k > s.n - 3 ? MG_L - MG_M - 1 : X(k + .5);
    return `<text class="${cls}" x="${u(x)}" y="${u(y)}" text-anchor="${anc}">${esc(txt)}</text>`;
  };
  /* La hauteur d'une voie : celle du repli, ou celle de l'agrandissement quand
     c'est elle qui est ouverte. Une seule voie l'est à la fois. */
  const grand = cle => mgZoom === cle;
  const H = (cle, base) => (grand(cle) ? Math.round(base * MG_Z) : base);
  /* Les valeurs heure par heure, écrites au-dessus de leur point. Elles ne
     paraissent qu'agrandies : à hauteur repliée elles se toucheraient, et un
     chiffre sur trois se lirait. Une heure sur trois suffit à donner l'échelle
     sans doubler la courbe d'une ligne de chiffres. */
  const jalons = (vals, y0, y1, mn, mx, ecrire, dy, sauf) => {
    let o = "";
    /* Les dernières heures se calent sur le bord droit, là même où les chiffres
       de la graduation et des seuils sont posés : un jalon y viendrait par-dessus
       eux. La série s'arrête avant. */
    for (let k = 1; k < s.n - 2; k += 3) {
      if (sauf && sauf.includes(k)) continue;
      o += etiq(k, y1 - (vals[k] - mn) / ((mx - mn) || 1) * (y1 - y0) + (dy || -7),
        ecrire(vals[k]), "mg-p");
    }
    return o;
  };
  const voies = [];

  // La température, avec le ressenti et le point de rosée : même unité, et
  // l'écart entre la courbe et le point de rosée dit l'humidité de l'air.
  const tt = s.t.concat(s.res, s.ros);
  const tn = Math.min(...tt) - 1, tx = Math.max(...tt) + 1;
  const ressenti = s.res.some((v, k) => Math.abs(v - s.t[k]) >= 1.5);
  /* La voie tenait soixante-six points, dont quarante-six pour l'amplitude :
     dix-sept degrés d'écart s'y écrasaient à moins de trois points par degré, et
     la courbe rendait un relief plat. Elle en tient quatre-vingt-six, dont
     soixante-six pour l'amplitude.

     Le pas de la graduation suit cette amplitude : dix degrés sur une journée
     qui en couvre quinze n'auraient donné qu'un seul repère, et une graduation
     à un trait ne gradue rien. Agrandie, la voie porte deux fois plus de
     repères, ce que la hauteur repliée ne permettait pas. */
  const hT = H("temp", 86), yT = hT - 10;
  const pasT = tx - tn > 24 ? (grand("temp") ? 5 : 10) : (grand("temp") ? 2 : 5);
  const [gradT, chiffresT] = graduation(10, yT, tn, tx, pasT, d => d + "°");
  let temp = fond(hT) + gradT;
  temp += `<path d="${aire(s.t, 10, yT, tn, tx)}" fill="#C7BE79" opacity=".26"/>`;
  temp += `<polyline points="${pts(s.ros, 10, yT, tn, tx)}" fill="none" stroke="#3C6E99" `
    + `stroke-width="1.5" stroke-dasharray="5 3.5" stroke-linecap="round" opacity=".85"/>`;
  /* Le ressenti partageait la teinte et le trait plein de la température : les
     deux courbes se confondaient là où elles se rapprochent, c'est-à-dire
     presque partout. Le pointillé les sépare sans ajouter de couleur, et son
     motif diffère franchement de celui du point de rosée. */
  if (ressenti)
    temp += `<polyline points="${pts(s.res, 10, yT, tn, tx)}" fill="none" stroke="#7A6820" `
      + `stroke-width="1.6" stroke-dasharray="0.5 3.4" stroke-linecap="round" opacity=".9"/>`;
  temp += `<polyline points="${pts(s.t, 10, yT, tn, tx)}" fill="none" stroke="#6F5E14" `
    + `stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  temp += chiffresT;
  const kx = s.t.indexOf(Math.max(...s.t)), kn = s.t.indexOf(Math.min(...s.t));
  // Les extrêmes gardent leur étiquette pleine : un jalon au même endroit la doublerait.
  if (grand("temp"))
    temp += jalons(s.t, 10, yT, tn, tx, v => Math.round(v) + "°", -7, [kx, kn]);
  [[kx, -7], [kn, 14]].forEach(([k, dy]) => {
    temp += etiq(k, yT - (s.t[k] - tn) / (tx - tn) * (yT - 10) + dy,
      Math.round(s.t[k]) + "°", "mg-c");
  });
  voies.push(mgVoie("La température", `${bornes(s.t)} degrés`, hT, temp,
    "Pointillé bleu, le point de rosée : plus il est proche de la courbe, plus l'air est humide."
    + (ressenti ? " Pointillé serré, le ressenti." : ""), "temp"));

  // La pluie : le risque en barre pâle derrière, la lame en barre pleine devant.
  const mmx = Math.max(2, ...s.mm), tot = s.mm.reduce((a, b) => a + b, 0);
  /* Agrandie, la voie garde du ciel au-dessus des barres : leur chiffre s'y
     pose, et une barre pleine hauteur l'aurait rejeté hors du dessin. */
  const hP = H("pluie", 42), yP = hP - 6, aP = hP - (grand("pluie") ? 20 : 10);
  let pluie = fond(hP);
  for (let k = 0; k < s.n; k++) {
    const hp = s.pb[k] / 100 * aP;
    // Le seuil de mention est en pour cent, non en points de dessin : la barre
    // paraissait en agrandissant et disparaissait en repliant, à donnée égale.
    if (s.pb[k] >= 5) pluie += `<rect x="${u(X(k) + 1)}" y="${u(yP - hp)}" width="${u(LA - 2)}" `
      + `height="${u(hp)}" rx="1.5" fill="#4A7CA8" opacity=".18"/>`;
    if (s.mm[k] > 0) {
      const hb = Math.max(2, s.mm[k] / mmx * aP);
      pluie += `<rect x="${u(X(k) + 2.2)}" y="${u(yP - hb)}" width="${u(LA - 4.4)}" `
        + `height="${u(hb)}" rx="1.5" fill="#4A7CA8"/>`;
    }
  }
  /* Repliée, la voie ne porte que le cumul, faute de place. Agrandie, chaque
     heure arrosée dit sa lame, et le risque se lit en tête de sa barre pâle
     une heure sur trois : le cumul, que le titre donne déjà, s'efface alors. */
  if (grand("pluie")) {
    for (let k = 0; k < s.n; k++) {
      if (s.mm[k] < 0.1) continue;
      pluie += etiq(k, yP - Math.max(2, s.mm[k] / mmx * aP) - 4, nombreFr(s.mm[k]), "mg-mm");
    }
    for (let k = 1; k < s.n; k += 3) {
      if (s.pb[k] < 5) continue;
      pluie += etiq(k, yP - s.pb[k] / 100 * aP - 4, Math.round(s.pb[k]) + " %", "mg-p");
    }
  } else if (tot >= 0.1) {
    pluie += etiq(s.mm.indexOf(Math.max(...s.mm)),
      yP - Math.max(2, Math.max(...s.mm) / mmx * aP) - 4, nombreFr(tot) + " mm", "mg-mm");
  }
  pluie += `<line x1="${MG_M}" y1="${u(yP + .5)}" x2="${MG_L - MG_M}" y2="${u(yP + .5)}" `
    + `stroke="#16241E" opacity=".13"/>`;
  /* Un seul seuil de mention dans toute l'application : cinq pour cent, celui
     de la colonne du risque dans la table. Le ruban se taisait sous vingt, si
     bien qu'une journée à quinze pour cent de risque n'avait pas de voie de
     pluie du tout, et le lecteur ne pouvait pas distinguer « rien n'est
     attendu » de « l'application ne le montre pas ». */
  const dPluie = tot >= 0.1 ? `${nombreFr(tot)} mm attendus`
    : Math.max(...s.pb) >= 5 ? `aucune lame, risque ${Math.round(Math.max(...s.pb))} %` : "aucune";
  /* Une voie vide occupait quarante points de haut et deux lignes de légende
     pour ne montrer qu'un filet horizontal. Quand rien n'est attendu et que le
     risque reste bas, la ligne de titre le dit déjà, et elle seule paraît. */
  const pluieVide = tot < 0.1 && Math.max(...s.pb) < 5;
  /* AROME ne publie pas toujours la probabilité de précipitation. Quand la lame
     vient de lui et le risque de la seconde source, la voie superpose deux
     modèles : la lecture le dit plutôt que de laisser croire à une seule
     prévision. */
  const col = (meteo.hourly && meteo.hourly.aromeColonnes) || [];
  const melange = col.indexOf("precipitation") !== -1
    && col.indexOf("precipitation_probability") === -1;
  voies.push(pluieVide ? mgVoie("La pluie", dPluie, 0, "")
    : mgVoie("La pluie", dPluie, hP, pluie,
      "Barre pleine, la lame attendue en millimètres. Barre pâle, le risque de pluie."
      + (melange ? " La lame vient d'AROME, le risque de la seconde source : "
          + "les deux barres ne sont pas du même modèle." : ""),
      "pluie"));

  // Le vent : la moyenne en aire, les rafales en pointillé, l'orientation en
  // flèches, dans le sens où il souffle.
  const vmx = Math.max(30, ...s.raf);
  const hV = H("vent", 66), yV = hV - 20;
  let vent = fond(hV);
  vent += `<path d="${aire(s.v, 4, yV, 0, vmx)}" fill="#7E8C81" opacity=".26"/>`;
  vent += `<polyline points="${pts(s.raf, 4, yV, 0, vmx)}" fill="none" stroke="#8A4A10" `
    + `stroke-width="1.5" stroke-dasharray="4.5 3" stroke-linecap="round" opacity=".8"/>`;
  vent += `<polyline points="${pts(s.v, 4, yV, 0, vmx)}" fill="none" stroke="#46554A" `
    + `stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  /* Agrandie, la voie chiffre la moyenne une heure sur trois, et la plus forte
     rafale de la fenêtre : deux séries complètes de jalons se seraient
     croisées là où les rafales approchent la moyenne. */
  if (grand("vent")) {
    vent += jalons(s.v, 4, yV, 0, vmx, v => Math.round(v), -6);
    const kr = s.raf.indexOf(Math.max(...s.raf));
    vent += etiq(kr, yV - s.raf[kr] / vmx * (yV - 4) - 6,
      Math.round(s.raf[kr]) + " km/h", "mg-c");
  }
  const yS = yV - 20 / vmx * (yV - 4);
  vent = fil(yS, vent, "#8A4A10", ".38") + chiffre(yS - 3, "20 km/h");
  vent += `<line x1="${MG_M}" y1="${u(yV + .5)}" x2="${MG_L - MG_M}" y2="${u(yV + .5)}" `
    + `stroke="#16241E" opacity=".13"/>`;
  /* Les flèches accompagnent la courbe, elles ne la commentent pas : plus
     courtes, plus fines et plus pâles, sauf là où le vent passe le seuil.
     Agrandie, la voie les pose toutes les deux heures, la place le permettant. */
  for (let k = 1; k < s.n; k += (grand("vent") ? 2 : 3)) {
    const fort = s.v[k] >= 20;
    vent += `<g transform="translate(${u(X(k + .5))},${u(hV - 8)}) `
      + `rotate(${Math.round(s.dir[k] + 180)})" `
      + `fill="none" stroke="${fort ? "#8A4A10" : "#5F6E63"}" stroke-width="1.1" `
      + `opacity="${fort ? ".85" : ".55"}" stroke-linecap="round" stroke-linejoin="round">`
      + `<path d="M0,-4.6 L0,4.6 M-2.2,-2.2 L0,-4.6 L2.2,-2.2"/></g>`;
  }
  const kv = s.v.indexOf(Math.max(...s.v));
  voies.push(mgVoie("Le vent", `${Math.round(Math.max(...s.v))} km/h `
    + `${dCardinal(s.dir[kv])}, rafales à ${Math.round(Math.max(...s.raf))} km/h`, hV, vent,
    "Pointillé brun, les rafales. Le filet marque vingt kilomètres par heure, "
    + "au-delà un traitement dérive. Les flèches montrent le sens où il souffle.",
    "vent"));

  /* La couverture du ciel et l'indice UV, en bandes : ce sont des taux
     d'occultation et d'intensité, une courbe leur donnerait une précision
     qu'ils n'ont pas. Agrandies, elles écrivent leur valeur dans la bande une
     heure sur trois, ce que la teinte seule ne dit qu'approximativement. */
  const hC = H("ciel", 14), hU = H("uv", 14);
  const bande = (h, teinte, op) => `<rect x="${MG_M}" y="1" width="${MG_P}" `
    + `height="${h - 2}" rx="2" fill="${teinte}" opacity="${op}"/>`;
  let ciel = bande(hC, "#4A5A52", ".06"), uvb = bande(hU, "#C8892F", ".07");
  for (let k = 0; k < s.n; k++) {
    ciel += `<rect x="${u(X(k))}" y="1" width="${u(LA + 1)}" height="${hC - 2}" `
      + `fill="#4A5A52" opacity="${(s.nua[k] / 100 * .5).toFixed(3)}"/>`;
    const q = Math.min(1, s.uv[k] / 9);
    if (q > .02) uvb += `<rect x="${u(X(k))}" y="1" width="${u(LA + 1)}" height="${hU - 2}" `
      + `fill="#C8892F" opacity="${(q * .85).toFixed(3)}"/>`;
  }
  ciel += fond(hC, false);
  uvb += fond(hU, false);
  for (let k = 1; k < s.n; k += 3) {
    if (grand("ciel")) ciel += etiq(k, hC / 2 + 3, Math.round(s.nua[k]) + " %", "mg-p");
    if (grand("uv")) uvb += etiq(k, hU / 2 + 3, nombreFr(s.uv[k]), "mg-p");
  }
  voies.push(mgVoie("La couverture du ciel", `${bornes(s.nua)} %`, hC, ciel,
    "Plus la bande est sombre, plus le ciel est couvert.", "ciel"));
  voies.push(mgVoie("L'indice UV", `jusqu'à ${nombreFr(Math.max(...s.uv))}`, hU, uvb,
    "Plus la bande est chaude, plus le soleil brûle. Au-dessus de sept, "
    + "les jeunes plants marquent.", "uv"));

  /* L'humidité de l'air, avec le seuil de quatre-vingt-dix pour cent au-delà
     duquel le feuillage reste mouillé et les maladies s'installent.

     L'échelle partait de zéro : une journée passant de cinquante-cinq à
     quatre-vingt-onze pour cent tenait dans le tiers haut de la voie, les deux
     autres tiers restant remplis sans rien dire. Elle part de la dizaine sous le
     plancher du jour, sans jamais dépasser soixante pour cent, ce qui garde le
     seuil de quatre-vingt-dix dans la voie. Le pied de la bande n'est plus le
     zéro : il porte son chiffre, faute de quoi la hauteur remplie se lirait
     comme une part de cent. */
  const hn = Math.max(0, Math.min(60, Math.floor((Math.min(...s.hum) - 4) / 10) * 10));
  const hH = H("hum", 40), yH = hH - 4;
  /* Agrandie, la voie porte une graduation aux vingtaines : elle passe à côté
     du seuil, qui garde son propre filet et son propre chiffre. */
  const [gradH, chiffresH] = grand("hum")
    ? graduation(4, yH, hn, 100, 20, d => d + " %") : ["", ""];
  let hum = fond(hH) + gradH;
  hum += `<path d="${aire(s.hum, 4, yH, hn, 100)}" fill="#8FA5B5" opacity=".30"/>`;
  hum += `<polyline points="${pts(s.hum, 4, yH, hn, 100)}" fill="none" stroke="#456579" `
    + `stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (grand("hum")) hum += jalons(s.hum, 4, yH, hn, 100, v => Math.round(v), -6);
  hum += `<line x1="${MG_M}" y1="${u(yH + .5)}" x2="${MG_L - MG_M}" y2="${u(yH + .5)}" `
    + `stroke="#16241E" opacity=".13"/>`;
  /* Le chiffre du seuil passe sous le filet : au-dessus il ne restait que trois
     points de voie, et la courbe s'y tient dès que l'air est humide. */
  const yh90 = yH - (90 - hn) / (100 - hn) * (yH - 4);
  hum = fil(yh90, hum, "#456579", ".45") + chiffresH
    + chiffre(yh90 + 10.5, "90 %") + chiffre(yH - 2, hn + " %");
  voies.push(mgVoie("L'humidité de l'air", `${bornes(s.hum)} %`, hH, hum,
    "Le filet marque quatre-vingt-dix pour cent, au-delà le feuillage ne sèche pas. "
    + "Le pied de la bande n'est pas le zéro : il porte son chiffre.", "hum"));

  /* La pression : sa valeur importe moins que sa pente, une baisse annonce.
     L'échelle épousait l'écart mesuré, à huit dixièmes d'hectopascal près : une
     journée sans mouvement rendait une courbe agitée, aussi ample qu'une vraie
     chute. La fenêtre ne descend pas sous six hectopascals, et la graduation
     dit lesquels : un frémissement se lit à plat, une baisse se voit tomber. */
  const pmil = (Math.min(...s.pres) + Math.max(...s.pres)) / 2;
  const pamp = Math.max(6, Math.max(...s.pres) - Math.min(...s.pres) + 1.6);
  const pn = pmil - pamp / 2, px = pmil + pamp / 2;
  /* Agrandie, la voie descend au pas de deux hectopascals : cinq n'aurait donné
     qu'un ou deux repères sur une fenêtre qui en fait six. */
  const hR = H("pres", 40), yR = hR - 4;
  const [gradP, chiffresP] = graduation(4, yR, pn, px, grand("pres") ? 2 : 5,
    d => d + " hPa");
  let pres = fond(hR) + gradP;
  pres += `<polyline points="${pts(s.pres, 4, yR, pn, px)}" fill="none" stroke="#4E5C52" `
    + `stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (grand("pres")) pres += jalons(s.pres, 4, yR, pn, px, v => Math.round(v), -6);
  pres += chiffresP;
  const dp = s.pres[s.n - 1] - s.pres[0];
  voies.push(mgVoie("La pression", `${Math.round(s.pres[0])} hPa, `
    + (dp <= -2 ? "en baisse" : dp >= 2 ? "en hausse" : "stable"), hR, pres,
    "Sa valeur importe moins que sa pente : une baisse annonce une dégradation, "
    + "une hausse le retour du beau.", "pres"));

  /* L'axe des heures, commun aux voies. Le premier libellé est l'heure en cours,
     marquée de la même teinte que la ligne du moment dans la liste : le mot
     « maintenant » occupait la place de deux graduations et en faisait sauter
     une. Les autres sont exactement les montants du quadrillage. */
  let axe = `<text class="mg-h mg-ici" x="${MG_M}" y="11" text-anchor="start">${esc(ICI)}</text>`;
  montants.forEach(([k, lib]) => {
    axe += `<text class="mg-h" x="${u(X(k))}" y="11" text-anchor="middle">${esc(lib)}</text>`;
  });
  /* Ce que chaque voie sait dire d'une heure, dans l'ordre où elles sont
     empilées. La lecture au doigt s'en sert pour remplacer les plages. */
  mgLecture = {
    n: s.n, x: k => X(k + .5),
    heure: k => (s.jour[k] !== s.jour[0] ? "demain " : "")
      + String(s.heure[k]).padStart(2, "0") + " h",
    voies: [
      k => `${Math.round(s.t[k])}°`
        + (Math.abs(s.res[k] - s.t[k]) >= 1 ? `, ressenti ${Math.round(s.res[k])}°` : ""),
      k => s.mm[k] >= 0.1 ? `${nombreFr(s.mm[k])} mm` : `risque ${Math.round(s.pb[k])} %`,
      k => `${Math.round(s.v[k])} km/h ${dCardinal(s.dir[k])}, `
        + `rafales ${Math.round(s.raf[k])} km/h`,
      k => `${Math.round(s.nua[k])} %`,
      k => nombreFr(s.uv[k]),
      k => `${Math.round(s.hum[k])} %`,
      k => `${Math.round(s.pres[k])} hPa`,
    ],
  };
  /* L'heure lue est annoncée deux fois, au-dessus de la pile et au-dessous. Le
     ruban fait plus de quatre cents points de haut : une seule ligne, en pied,
     sortait du champ dès que le doigt lisait les premières voies, et rien ne
     disait alors de quelle heure venaient les valeurs affichées. */
  const dit = `<p class="mg-sel" hidden><span></span>`
    + `<button type="button" class="mg-rendre">Revenir aux plages</button></p>`;
  // Une voie agrandie parmi les quatre repliées les garde ouvertes.
  const ouvertes = mgAutres || ["ciel", "uv", "hum", "pres"].includes(mgZoom);
  return `<div class="mg">${dit}${voies.slice(0, 3).join("")}`
    + `<button type="button" class="lien mg-plus" aria-expanded="${ouvertes}">`
    + `${ouvertes ? "Replier les autres mesures" : "Autres mesures : ciel, UV, humidité, pression"}</button>`
    + `<div class="mg-autres"${ouvertes ? "" : " hidden"}>${voies.slice(3).join("")}</div>`
    + `<svg class="mg-s" viewBox="0 0 ${MG_L} 14" aria-hidden="true">${axe}</svg>`
    + dit + `</div>`;
}

/* ---------- La liste ---------- */
/* La table portait cinq des quinze grandeurs que le service rend à l'heure.
   Elle les porte toutes : le ruban en dessine sept, les moments en résument
   quatre, la table est l'écriture qui ne choisit pas.

   Treize colonnes ne tiennent pas dans la largeur d'un téléphone. La table
   défile de côté, l'heure restant collée au bord gauche : sans elle, une valeur
   lue au milieu du défilement ne se rattache plus à rien. Les unités montent
   dans l'entête, ce qui rend à chaque cellule la place de son chiffre. */
const COLONNES_H = [
  ["hh-ic", "", ""], ["hh-t", "temp.", "°"], ["hh-res", "ressenti", "°"],
  ["hh-v", "vent", "km/h"], ["hh-raf", "rafales", "km/h"],
  ["hh-p", "pluie", "mm"], ["hh-pb", "risque", "%"],
  ["hh-hu", "humidité", "%"], ["hh-ros", "rosée", "°"],
  ["hh-nu", "nuages", "%"], ["hh-uv", "uv", ""], ["hh-pres", "pression", "hPa"],
];

function listeHoraire(s) {
  const r = [];
  const fleche = d => `<i style="transform:rotate(${Math.round(d + 180)}deg)">`
    + `<svg viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" `
    + `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="M7,1.5 L7,12.5 M4.2,4.3 L7,1.5 L9.8,4.3"/></svg></i>`;
  for (let k = 0; k < s.n; k++) {
    if (k && s.jour[k] !== s.jour[k - 1]) {
      r.push(`<tr class="hh-jour"><th colspan="${COLONNES_H.length + 1}">`
        + `<span>${esc(jourLong(s.jour[k]))}</span></th></tr>`);
    }
    const ic = icoCiel(s.code[k], s.clair[k]);
    /* Le ressenti ne se répète que lorsqu'il s'écarte du thermomètre : redit à
       l'identique vingt-quatre fois, il ferait une colonne de doublons. */
    const dt = Math.round(s.res[k]) - Math.round(s.t[k]);
    r.push(`<tr class="hh${k === 0 ? " hh-ici" : ""}">`
      + `<th>${String(s.heure[k]).padStart(2, "0")} h</th>`
      + `<td class="hh-ic">${icoM(ic, "hh-svg")}</td>`
      + `<td class="hh-t">${Math.round(s.t[k])}</td>`
      + `<td class="hh-res${Math.abs(dt) >= 3 ? " hh-ecart" : ""}">`
      + `${dt ? Math.round(s.res[k]) : ""}</td>`
      + `<td class="hh-v${s.v[k] >= 20 ? " hh-fort" : ""}">${fleche(s.dir[k])}`
      + `${Math.round(s.v[k])}<small>${CARD_ABR[iCard(s.dir[k])]}</small></td>`
      + `<td class="hh-raf${s.raf[k] >= 40 ? " hh-fort" : ""}">${Math.round(s.raf[k])}</td>`
      + `<td class="hh-p">${s.mm[k] >= 0.1 ? `<b>${nombreFr(s.mm[k])}</b>` : ""}</td>`
      + `<td class="hh-pb">${s.pb[k] >= 5 ? Math.round(s.pb[k]) : ""}</td>`
      + `<td class="hh-hu${s.hum[k] >= 90 ? " hh-moite" : ""}">${Math.round(s.hum[k])}</td>`
      + `<td class="hh-ros">${Math.round(s.ros[k])}</td>`
      + `<td class="hh-nu">${Math.round(s.nua[k])}</td>`
      + `<td class="hh-uv${s.uv[k] >= 6 ? " hh-fort" : ""}">`
      + `${s.uv[k] >= 0.1 ? nombreFr(Math.round(s.uv[k] * 10) / 10) : ""}</td>`
      + `<td class="hh-pres">${Math.round(s.pres[k])}</td></tr>`);
  }
  /* Sans entête, six colonnes de nombres nus ne se distingueraient pas. La
     ligne de tête les nomme et porte leur unité, ce qu'attend aussi un lecteur
     d'écran d'une table. */
  const tete = `<thead><tr class="hh-tete"><th>heure</th>`
    + COLONNES_H.map(([c, nom, u]) => `<th class="${c}">${esc(nom)}`
        + (u ? `<small>${esc(u)}</small>` : "") + `</th>`).join("")
    + `</tr></thead>`;
  return `<div class="hh-defile"><table class="hh-table">${tete}`
    + `<tbody>${r.join("")}</tbody></table></div>`;
}

/* ---------- Les moments ----------
   Les tranches suivent les bornes civiles de six heures : la matinée et la
   soirée disent quelque chose, six heures comptées depuis l'heure courante ne
   diraient rien. Les bouts de la fenêtre sont donc rognés. */
const NOM_TRANCHE = ["la nuit", "la matinée", "l'après-midi", "la soirée"];

function momentsHoraires(s) {
  const tr = [];
  for (let k = 0; k < s.n;) {
    const b = Math.floor(s.heure[k] / 6);
    let j = k;
    while (j < s.n && Math.floor(s.heure[j] / 6) === b && s.jour[j] === s.jour[k]) j++;
    tr.push({ a: k, b: j - 1, nom: NOM_TRANCHE[b], demain: s.jour[k] !== s.jour[0] });
    k = j;
  }
  // Une tranche d'une heure en bout de fenêtre est un reste, pas un moment.
  if (tr.length > 1 && tr[tr.length - 1].b - tr[tr.length - 1].a < 1) tr.pop();

  /* Trois lignes de fragments séparés par des virgules se lisaient mal :
     « averses, sec » se contredisait à la lecture, « rafales 41 » perdait son
     unité, et rien ne se comparait d'une carte à l'autre puisque les grandeurs
     n'occupaient pas la même place. La carte prend donc une tête, où le ciel se
     nomme à côté de la température, et trois mesures en colonnes, les mêmes
     dans le même ordre partout. Les trois cellules reprennent le damier de
     l'en-tête de la feuille : une seule écriture pour une seule chose. */
  return `<div class="mo">` + tr.map(x => {
    const q = c => s[c].slice(x.a, x.b + 1);
    const mm = q("mm").reduce((p, n) => p + n, 0);
    const code = q("code").reduce((p, n) => (GRAVITE_CIEL(n) > GRAVITE_CIEL(p) ? n : p), 0);
    const clair = q("clair").some(Boolean);
    const pb = Math.max(...q("pb")), raf = Math.max(...q("raf"));
    const dir = s.dir[Math.floor((x.a + x.b) / 2)];
    /* L'humidité est un état, non un extrême : la carte prenait le maximum, et
       une seule heure à quatre-vingt-onze pour cent faisait écrire « feuillage
       mouillé » sur six heures entières, quand la règle du conseil exige cinq
       heures consécutives et se tait. Moyenne pour la valeur, majorité des
       heures pour la note. */
    const hs = q("hum");
    const hum = Math.round(hs.reduce((p2, n2) => p2 + n2, 0) / hs.length);
    const mouille = hs.filter(v2 => v2 >= 90).length > hs.length / 2;
    const ros = Math.round(q("ros").reduce((p, n) => p + n, 0) / (x.b - x.a + 1));
    const mes = (nom, val, sous) => `<div class="tp-m"><span>${esc(nom)}</span>`
      + `<b>${esc(val)}</b>${sous ? `<i>${esc(sous)}</i>` : ""}</div>`;
    /* La lame et le risque ne disent pas la même chose : la première est un
       chiffre attendu, le second une chance. Ils cessent de se suivre sur la
       même ligne, séparés par une virgule qui les mettait sur le même rang. */
    const lame = mm >= 0.1 ? `${nombreFr(mm)} mm` : "aucune";
    return `<div class="mo-c${x.a === 0 ? " mo-ici" : ""}">`
      + `<p class="mo-h">${esc(x.demain ? "demain, " : "")}${esc(x.nom)}, `
      + `de ${String(s.heure[x.a]).padStart(2, "0")} h à `
      + `${String((s.heure[x.b] + 1) % 24).padStart(2, "0")} h</p>`
      + `<p class="mo-l">${icoM(icoCiel(code, clair), "mo-ic")}`
      + `<b>${Math.round(Math.min(...q("t")))} à ${Math.round(Math.max(...q("t")))}°</b>`
      + `<span>${esc(tempsDe(code)[1].toLowerCase())}</span></p>`
      + `<div class="mo-m">`
      + mes("Pluie", lame, pb >= 5 ? `risque jusqu'à ${Math.round(pb)} %` : "")
      + mes("Vent", `${Math.round(Math.max(...q("v")))} km/h`,
            `au plus fort, ${cardinal(dir)}`
            + (raf >= 30 ? `, rafales ${Math.round(raf)} km/h` : ""))
      + mes("Humidité", `${hum} %`,
            mouille ? "feuillage mouillé" : `rosée à ${ros}°`)
      + `</div></div>`;
  }).join("") + `</div>`;
}

/* ---------- Ce que ces heures demandent au jardin ----------
   Chaque règle lit la série et rend une ligne ou rien. La pluie passe toujours
   en tête, c'est la question qu'on se pose en ouvrant, et les deux plus graves
   des autres la suivent. */
function jardinDuJour(s) {
  const H = k => String(s.heure[k]).padStart(2, "0") + " h";
  const dem = k => (s.jour[k] !== s.jour[0] ? "demain " : "") + H(k);
  /* La borne de fin est l'heure qui suit la dernière heure de la plage, et
     c'est son jour qui décide du mot « demain ». Le test portait sur la seule
     heure vingt-trois : une plage finissant à quatorze heures le lendemain
     s'écrivait « de 16 h à 14 h », une fin avant son début. */
  const fin = k => {
    const change = k + 1 < s.n ? s.jour[k + 1] !== s.jour[0]
      : s.jour[k] !== s.jour[0] || s.heure[k] === 23;
    return (change ? "demain " : "") + String((s.heure[k] + 1) % 24).padStart(2, "0") + " h";
  };
  const lignes = [];

  const pl = plagesDe(s.n, k => s.mm[k] >= 0.1);
  const tot = s.mm.reduce((a, b) => a + b, 0);
  /* La première ligne parle toujours de pluie. Quand les deux modèles ne
     s'accordent pas, c'est elle qui le dit : deux lignes de pluie, l'une
     affirmative et l'autre dubitative, se contrediraient à la lecture. */
  const div = divergencePluie(s);
  if (div) {
    lignes.push({ i: "goutte", g: 9,
      t: `Prévision incertaine : ${nombreFr(div.haut)} mm annoncés par `
        + `${div.arome ? "AROME" : "la seconde source"}, `
        + `${div.bas < 0.1 ? "aucune lame" : nombreFr(div.bas) + " mm"} par `
        + `${div.arome ? "la seconde source" : "AROME"}. `
        + `Attendre avant d'arroser, et voir le ciel.` });
  } else if (pl.length) {
    lignes.push({ i: "goutte", g: 9,
      t: `Pluie ${pl.length > 1 ? "par intervalles " : ""}de ${dem(pl[0][0])} à `
        + `${fin(pl[pl.length - 1][1])}, ${nombreFr(tot)} mm attendus.` });
  } else {
    /* « Aucune pluie annoncée » s'écrivait jusqu'à trente-neuf pour cent de
       risque, la formulation qui le mentionne n'existant qu'à partir de
       quarante. Une seule phrase désormais : la lame manque, et le risque est
       dit dès qu'il atteint le seuil de mention de l'application. */
    const rx = Math.round(Math.max(...s.pb));
    lignes.push({ i: "goutte", g: 9,
      t: `Aucune lame annoncée d'ici ${fin(s.n - 1)}.`
        + (rx >= 5 ? ` Risque de pluie jusqu'à ${rx} % vers `
            + `${dem(s.pb.indexOf(Math.max(...s.pb)))}.` : "") });
  }

  const gel = plagesDe(s.n, k => s.t[k] <= SEUILS_FEUILLE.gel);
  if (gel.length) lignes.push({ i: "alerte", g: 6, t: `Gel probable de ${dem(gel[0][0])} `
    + `à ${fin(gel[gel.length - 1][1])}, jusqu'à ${nombreFr(Math.min(...s.t))} degrés. `
    + `Voiler ce qui craint.` });

  const gv = plagesDe(s.n, k => s.raf[k] >= SEUILS_FEUILLE.rafale
      || s.v[k] >= SEUILS_FEUILLE.vent);
  if (gv.length) lignes.push({ i: "vent", g: 5, t: `Rafales à `
    + `${Math.round(Math.max(...s.raf))} km/h de ${dem(gv[0][0])} à ${fin(gv[gv.length - 1][1])}. `
    + `Pas de traitement, ni voile ni tuteur léger à poser.` });

  const tmax = Math.max(...s.t);
  if (tmax >= SEUILS_FEUILLE.chaleur) lignes.push({ i: "soleil", g: 4, t: `Jusqu'à ${Math.round(tmax)} degrés vers `
    + `${dem(s.t.indexOf(tmax))}. Arroser au petit matin ou à la nuit, jamais en plein soleil.` });

  const mal = plagesDe(s.n, k => s.hum[k] >= 90 && s.t[k] >= 10 && s.t[k] <= 26)
    .filter(([a, b]) => b - a >= 4);
  if (mal.length) lignes.push({ i: "goutte", g: 3, t: `Air saturé de ${dem(mal[0][0])} à `
    + `${fin(mal[0][1])} sous une température douce. Le feuillage reste mouillé, aérer les `
    + `abris et arroser au pied.` });

  /* Le créneau dit quand arroser, le bilan du sol dit s'il faut : la feuille
     proposait un créneau le lendemain de trente-cinq millimètres de pluie
     pendant que l'accueil disait « la réserve tient six jours ». Il se tait
     quand le sol n'a rien demandé.

     Ses critères disaient « sans vent » sur la seule moyenne, alors qu'une
     rafale de quarante emporte l'eau et le produit : la rafale entre dans la
     règle. Et « hors soleil » nommait un test d'indice UV, toujours vrai en
     décembre : la phrase dit maintenant ce qu'elle teste. */
  const arr = plagesDe(s.n, k => s.mm[k] < 0.1 && s.pb[k] < 40
      && s.v[k] < 15 && s.raf[k] < 30 && s.uv[k] < 2)
    .filter(([a, b]) => b - a >= 1).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0];
  const solDemande = (() => { const b = bilanHydrique(); return !b || b.etat === "arroser"; })();
  if (arr && tot < 3 && solDemande) lignes.push({ i: "arc", g: 2,
    t: `Créneau d'arrosage de ${dem(arr[0])} à ${fin(arr[1])} : sec, sans vent `
      + `et l'évaporation y est faible.` });

  const uvx = Math.max(...s.uv);
  if (uvx >= 7) lignes.push({ i: "soleil", g: 1, t: `Indice UV ${nombreFr(uvx)} vers `
    + `${dem(s.uv.indexOf(uvx))}. Ombrer les repiquages du jour.` });

  const rangees = [lignes[0]].concat(lignes.slice(1).sort((a, b) => b.g - a.g).slice(0, 2));
  return `<div class="jd">` + rangees.map(l =>
    `<p class="jd-l">${icoM(l.i, "jd-ic")}<span>${esc(l.t)}</span></p>`).join("") + `</div>`;
}

/* ---------- La feuille ---------- */
const MODE_TEMPS = "monjardin.temps.mode";
const CLE_VENUE = "monjardin.venue";
const MODES_TEMPS = [["ruban", "Ruban"], ["liste", "Liste"], ["moments", "Moments"]];

function modeTemps() {
  try {
    const v = localStorage.getItem(MODE_TEMPS);
    if (MODES_TEMPS.some(m => m[0] === v)) return v;
  } catch (e) { /* stockage indisponible */ }
  return "ruban";
}

const ecritureTemps = (s, m) => {
  mgLecture = null;
  mgZoom = null;
  mgLu = -1;
  return m === "liste" ? listeHoraire(s)
    : m === "moments" ? momentsHoraires(s) : dessinMeteogramme(s);
};

/* Agrandir une voie recompose le ruban : la hauteur d'un dessin ne se change
   pas sans le redessiner, et les jalons qui paraissent alors n'existaient pas
   avant. L'heure lue est reposée après coup, et le défilement rattrapé pour que
   la voie touchée garde sa place à l'écran : sans quoi une voie ouverte en bas
   de pile emmènerait le doigt hors du champ. */
function basculerVoie(cle) {
  if (!mgSerie) return;
  const corps = $("feuille-corps");
  const ou = () => {
    const b = corps.querySelector(`.mg-b[data-voie="${cle}"]`);
    return b ? b.getBoundingClientRect().top : 0;
  };
  const avant = ou();
  mgZoom = mgZoom === cle ? null : cle;
  $("tempsCorps").innerHTML = dessinMeteogramme(mgSerie);
  brancherLectures();
  corps.scrollTop += ou() - avant;
}

/* Lire une heure sur les courbes. Un doigt posé désigne une heure, un montant
   la marque dans toutes les voies, et chaque plage cède la place à la valeur de
   cette heure. Les sept grandeurs se lisent ainsi ensemble, ce qu'une bulle
   flottante ne permettrait pas sans recouvrir le dessin qu'on interroge.

   La lecture reste après le doigt levé : sur un téléphone, le doigt cache la
   zone qu'il désigne, et une valeur qui disparaît au relâchement ne se lit
   jamais. Une ligne sous le ruban dit l'heure retenue et la rend. */
function brancherRuban() {
  const bloc = $("feuille-corps").querySelector(".mg");
  if (!bloc || !mgLecture) return;
  const L = mgLecture;
  const lignes = [...bloc.querySelectorAll(".mg-v")].map((v, i) => ({
    val: v.querySelector(".mg-r"), cur: v.querySelector(".mg-cur"), dit: L.voies[i],
  }));
  // Les deux annonces, en tête et en pied, disent la même heure.
  const dits = [...bloc.querySelectorAll(".mg-sel")];
  let lu = -1;

  const rendre = () => {
    lu = -1;
    mgLu = -1;
    bloc.classList.remove("mg-lu");
    dits.forEach(d => { d.hidden = true; });
    lignes.forEach(l => {
      if (l.val) l.val.textContent = l.val.dataset.plage;
      if (l.cur) l.cur.setAttribute("hidden", "");
    });
  };

  const lire = k => {
    if (k === lu) { rendre(); return; }
    lu = k;
    mgLu = k;
    bloc.classList.add("mg-lu");
    dits.forEach(d => {
      d.querySelector("span").textContent = `Valeurs à ${L.heure(k)}`;
      d.hidden = false;
    });
    const x = L.x(k).toFixed(1);
    lignes.forEach(l => {
      if (l.val && l.dit) l.val.textContent = l.dit(k);
      if (l.cur) {
        l.cur.setAttribute("x1", x); l.cur.setAttribute("x2", x);
        l.cur.removeAttribute("hidden");
      }
    });
  };

  // L'abscisse est ramenée au repère du dessin, commun à toutes les voies.
  const indice = ev => {
    const s = bloc.querySelector(".mg-s");
    if (!s) return -1;
    const r = s.getBoundingClientRect();
    const xv = (ev.clientX - r.left) / r.width * MG_L;
    return Math.max(0, Math.min(L.n - 1, Math.floor((xv - MG_M) / MG_P * L.n)));
  };

  /* La lecture ne s'engage pas au poser du doigt : un glissement vers le bas
     sur les courbes est un geste de fermeture de la feuille, et il ne doit pas
     laisser une heure lue derrière lui. Elle s'engage au premier déplacement
     horizontal, ou au relâchement si le doigt n'a pas bougé. */
  let glisse = false, depart = -1, x0 = 0, y0 = 0, bouge = false;
  bloc.addEventListener("pointerdown", ev => {
    /* La lecture s'engage sur le dessin. Les commandes et les textes qui
       l'entourent ne sont pas une abscisse : toucher l'annonce en tête aurait
       lu l'heure qui se trouve sous ce mot. */
    if (ev.target.closest(".mg-b, .mg-sel, .mg-l, .mg-plus")) return;
    glisse = true; bouge = false;
    x0 = ev.clientX; y0 = ev.clientY; depart = indice(ev);
  });
  bloc.addEventListener("pointermove", ev => {
    if (!glisse) return;
    const dx = Math.abs(ev.clientX - x0), dy = Math.abs(ev.clientY - y0);
    if (!bouge) {
      if (dy > 8 && dy > dx) { glisse = false; return; }   // la feuille se ferme
      if (dx <= 6) return;
      bouge = true;
    }
    const k = indice(ev);
    if (k >= 0 && k !== lu) { lu = -1; lire(k); }
  });
  const fini = () => {
    // Un doigt posé sans déplacement lit l'heure, et la rend s'il la relit.
    if (glisse && !bouge && depart >= 0) lire(depart);
    glisse = false;
  };
  bloc.addEventListener("pointerup", fini);
  bloc.addEventListener("pointercancel", () => { glisse = false; });
  bloc.addEventListener("pointerleave", () => { glisse = false; });
  bloc.querySelectorAll(".mg-rendre").forEach(b => b.addEventListener("click", rendre));
  // L'heure lue survit à l'agrandissement d'une voie, qui recompose le ruban.
  if (mgLu >= 0 && mgLu < L.n) lire(mgLu);
}

// Le titre d'une voie l'agrandit, et la replie.
function brancherLectures() {
  brancherRuban();
  $("feuille-corps").querySelectorAll(".mg-b").forEach(b =>
    b.addEventListener("click", () => basculerVoie(b.dataset.voie)));
  const plus = $("feuille-corps").querySelector(".mg-plus");
  if (plus) plus.addEventListener("click", () => {
    const ouvertes = plus.getAttribute("aria-expanded") === "true";
    mgAutres = !ouvertes;
    if (ouvertes && ["ciel", "uv", "hum", "pres"].includes(mgZoom)) mgZoom = null;
    $("tempsCorps").innerHTML = dessinMeteogramme(mgSerie);
    brancherLectures();
  });
}

function vueTemps() {
  const s = serieHoraire();
  const g = jardinActif() || {};
  /* Le bandeau reste visible au-dessus de la feuille : il porte déjà le grand
     chiffre, l'état du ciel et la vitesse du vent. La feuille ne les redit pas.
     Elle porte les quatre mesures du moment que le bandeau ne peut pas tenir,
     et que le jardinier lit avant d'agir : ce qu'il fait vraiment, d'où vient
     le vent et jusqu'où il monte, ce que l'air a d'humide, ce que le soleil
     brûle. */
  const mes = (nom, val, sous) => `<div class="tp-m"><span>${esc(nom)}</span>`
    + `<b>${esc(val)}</b>${sous ? `<i>${esc(sous)}</i>` : ""}</div>`;
  let tete = "";
  if (s) {
    const dt = s.res[0] - s.t[0];
    const uvx = Math.max(...s.uv), kuv = s.uv.indexOf(uvx);
    const H = k => String(s.heure[k]).padStart(2, "0") + " h";
    tete = `<div class="tp-mes">`
      + mes("Ressenti", `${Math.round(s.res[0])}°`,
            Math.abs(dt) >= 1 ? `${Math.round(s.t[0])}° mesurés` : "")
      + mes("Vent", `${Math.round(s.v[0])} km/h`,
            `${cardinal(s.dir[0])}, rafales ${Math.round(s.raf[0])} km/h`)
      + mes("Humidité", `${Math.round(s.hum[0])} %`, `rosée à ${Math.round(s.ros[0])}°`)
      + mes("Indice UV", nombreFr(s.uv[0]),
            uvx > s.uv[0] + 0.4 ? `jusqu'à ${nombreFr(uvx)} vers ${H(kuv)}` : "au plus haut")
      + `</div>`;
  }
  const m = modeTemps();
  const seg = `<div class="f-seg" role="group" aria-label="Écriture des heures">`
    + MODES_TEMPS.map(([c, nom]) => `<button type="button" data-mode="${c}" `
      + `class="${c === m ? "actif" : ""}" aria-pressed="${c === m}">${nom}</button>`).join("")
    + `</div>`;
  const heures = s ? jardinDuJour(s)
      + `<div class="f-carte-tete"><h3>Heure par heure</h3>${seg}</div>`
      + `<div id="tempsCorps">${ecritureTemps(s, m)}</div>`
    /* La phrase accusait le jardin d'un incident de réseau. Elle dit ce qui
       s'est passé, et donne le moyen d'y revenir sans quitter la feuille. */
    : `<p class="f-vide">Les heures n'ont pas pu être chargées. La prévision du `
      + `jour et de la semaine, elle, est à jour.</p>`
      + `<p class="f-vide"><button type="button" class="lien-relire" id="relireMeteo">`
      + `Réessayer</button></p>`;

  /* La température et le ciel descendent dans le sous-titre : la feuille reste
     ainsi lisible seule quand elle défile et couvre le bandeau, sans lui faire
     concurrence quand les deux sont à l'écran. */
  const sous = [g.commune, s ? `${Math.round(s.t[0])}° et ${tempsDe(s.code[0])[1].toLowerCase()}` : ""]
    .filter(Boolean).join(", ");
  /* Deux horizons, deux onglets. La semaine vivait sous les heures, au bout d'un
     défilement qui traverse le ruban entier : on n'y arrivait qu'en la
     cherchant. Le choix des trois écritures reste à l'intérieur des heures,
     c'est une façon de lire les mêmes vingt-quatre heures, non un autre
     horizon. */
  const ong = `<div class="f-onglets" role="tablist">`
    + [["heures", "Les heures"], ["semaine", "La semaine"]].map(([c, nom], k) =>
      `<button type="button" role="tab" class="${k ? "" : "actif"}" `
      + `aria-selected="${k ? "false" : "true"}" data-pan="${c}">${nom}</button>`).join("")
    + `</div>`;
  return { titre: "Le temps", sous, icoSous: s ? icoCiel(s.code[0], s.clair[0]) : null,
    corps: tete + ong
      + `<div class="f-pan" role="tabpanel" data-pan="heures">${heures}</div>`
      + `<div class="f-pan" role="tabpanel" data-pan="semaine" hidden>`
      + tableSemaine() + `</div>`
      + `<p class="f-note">Prévision Open-Meteo. Les heures viennent d'AROME, le `
      + `modèle de Météo-France à 1,5 km, complété par la sélection automatique là `
      + `où il se tait. Aujourd'hui et demain se résument de ces heures ; les jours `
      + `suivants viennent de la sélection automatique. Relecture toutes les `
      + `heures.</p>`,
    brancher() {
      const corps = $("feuille-corps");
      const ongs = [...corps.querySelectorAll(".f-onglets button")];
      ongs.forEach(b => b.addEventListener("click", () => {
        ongs.forEach(x => {
          x.classList.toggle("actif", x === b);
          x.setAttribute("aria-selected", String(x === b));
        });
        corps.querySelectorAll(".f-pan").forEach(z => {
          z.hidden = z.dataset.pan !== b.dataset.pan;
        });
        corps.scrollTop = 0;
      }));
      sur("relireMeteo", "click", async () => {
        const b = $("relireMeteo");
        if (b) { b.disabled = true; b.textContent = "Relecture…"; }
        await lireMeteo(jardinActif());
        rendreMaintenant();
        ouvrirVue("temps");
      });
      if (!s) return;
      brancherLectures();
      $("feuille-corps").querySelectorAll("[data-mode]").forEach(b =>
        b.addEventListener("click", () => {
          const c = b.dataset.mode;
          try { localStorage.setItem(MODE_TEMPS, c); } catch (e) { /* stockage indisponible */ }
          $("tempsCorps").innerHTML = ecritureTemps(s, c);
          /* Les trois écritures n'ont pas la même hauteur : garder la position
             de défilement laissait la barre des écritures à moitié cachée sous
             l'entête de la feuille. Le titre de la section reprend la tête. */
          const tete = b.closest(".f-carte-tete");
          if (tete) $("feuille-corps").scrollTop = Math.max(0, tete.offsetTop - 8);
          brancherLectures();
          $("feuille-corps").querySelectorAll("[data-mode]").forEach(x => {
            x.classList.toggle("actif", x.dataset.mode === c);
            x.setAttribute("aria-pressed", String(x.dataset.mode === c));
          });
        }));
    } };
}

// La prévision à sept jours, en table.
function tableSemaine() {
  const d = meteo.daily, i = iJour();
  const lignes = [];
  for (let k = i; k <= Math.min(i + 6, d.time.length - 1); k++) {
    // Les heures d'abord, la charge quotidienne au-delà de leur portée.
    const hj = jourHoraire(d.time[k]);
    const tx = hj ? hj.tx : d.temperature_2m_max[k];
    const tn = hj ? hj.tn : d.temperature_2m_min[k];
    // Une journée sans température n'est pas une journée à zéro degré : au-delà
    // de son horizon le modèle ne rend rien, et la ligne ne doit pas exister.
    if (tx === null || tx === undefined) continue;
    const [, lib, ico] = tempsDe(hj ? hj.code : d.weather_code[k]);
    const p = hj ? hj.mm : d.precipitation_sum[k];
    const tombe = k === i && hj && hj.passe >= 0.1 ? hj.passe : 0;
    /* Le risque de pluie du jour était demandé au service et n'était affiché
       nulle part, alors que les trois écritures des heures le portent. Il tient
       dans la cellule de la lame, sous elle : les deux disent la même chose du
       même jour. Le vent se pose sous l'état du ciel, et seulement quand il
       compte pour le jardin. */
    const rq = d.precipitation_probability_max[k];
    const vt = d.wind_speed_10m_max[k];
    lignes.push(`<tr><th>${k === i ? "aujourd'hui" : esc(jourCourt(d.time[k]))}</th>`
      + `<td class="mt-ic">${icoM(ico)}</td><td class="mt-lib">${esc(lib)}`
      + (vt !== null && vt !== undefined && vt >= 30
          ? `<small>vent ${Math.round(vt)} km/h</small>` : "") + `</td>`
      + `<td class="mt-t"><b>${Math.round(tx)}°</b> `
      + `<span>${tn === null || tn === undefined ? "" : Math.round(tn) + "°"}</span></td>`
      + `<td class="mt-p">${p >= 0.1 ? nombreFr(p) + " mm" : ""}`
      + (tombe ? `<small>dont ${nombreFr(tombe)} tombés</small>`
         : rq !== null && rq !== undefined && rq >= 5
           ? `<small>risque ${Math.round(rq)} %</small>` : "") + `</td></tr>`);
  }
  return `<table class="mt-table">${lignes.join("")}</table>`;
}
/* Les relevés d'hier et d'avant-hier se replient derrière un lien : on note
   d'abord ce qui tombe le jour même. Un jour déjà renseigné les garde ouverts,
   pour qu'une valeur saisie ne disparaisse pas de la vue. */
let relevesDeplies = false;

function vueEau() {
  const b = bilanHydrique(), d = meteo.daily, i = iJour();
  if (!b) return { titre: "L'eau", corps: "" };

  /* Huit jours passés et trois annoncés, la pluie mesurée se distingue de la
     pluie du modèle par un aplat plein.

     Les barres relisent la série que le bilan a construite. Elles la
     recalculaient depuis la charge quotidienne : la règle de source y était
     perdue, l'évapotranspiration inconnue y valait zéro, et le jour en cours y
     portait la journée civile entière, orage du soir compris, que la jauge deux
     cartes plus haut n'avait pas déduit. */
  const passe = b.serie.slice(-8).map(x => ({ ...x, futur: false }));
  const jours = passe.concat(b.proj.map(x => ({ ...x, futur: true })));
  const barres = [];
  jours.forEach(x => {
    const pl = x.pluie + x.arrosage;
    const e = x.etc;
    const m = Math.max(8, pl, e);
    const ton = x.futur ? "" : x.source === "pluviometre" ? " mesure"
      : x.source === "station" ? " poste" : "";
    barres.push(`<div class="mt-col${x.jour === d.time[i] ? " ce-jour" : ""}${x.futur ? " a-venir" : ""}">`
      + `<span class="mt-duo">`
      + `<i class="mt-bp${ton}" style="height:${(pl / m * 46).toFixed(0)}px" `
      + `title="${nombreFr(pl)} mm"></i>`
      + `<i class="mt-be" style="height:${(e / m * 46).toFixed(0)}px" title="${nombreFr(e)} mm repris"></i>`
      + `</span><span class="mt-j">${esc(jourCourt(x.jour))}</span></div>`);
  });

  const nbMesures = b.serie.slice(-30).filter(x => x.source === "station").length;
  const pleine = Math.round(b.reserve * 100);
  const seuil = Math.round((1 - b.raw / b.taw) * 100);
  const conseil = b.etat === "arroser"
    ? `Le sol est sous son seuil de confort. Apporter `
      + `<b>${nombreFr(b.apport)} litres par mètre carré</b>, soit ${nombreFr(b.apport)} mm. `
      + `Au-delà, l'eau passe sous les racines.`
    : b.etat === "attendre"
      ? `Le seuil est atteint, mais il est annoncé <b>${nombreFr(b.prevue)} mm</b> dans les deux jours. Attendre.`
      : `La réserve tient encore <b>${b.jours}</b> jour${b.jours > 1 ? "s" : ""} `
        + `avant d'atteindre le seuil. Rien à apporter.`;

  const lignes = [];
  const renseigne = k => {
    const r = releves.get(d.time[k]);
    return Boolean(r && ((r.pluie_mm !== null && r.pluie_mm !== undefined)
      || (r.arrosage_mm !== null && r.arrosage_mm !== undefined)));
  };
  const precedentsOuverts = relevesDeplies
    || [i - 1, i - 2].some(k => k >= 0 && renseigne(k));
  for (let k = i; k >= Math.max(0, i - 2); k--) {
    const iso = d.time[k], r = releves.get(iso) || {};
    const nom = k === i ? "aujourd'hui" : k === i - 1 ? "hier" : "avant-hier";
    if (k === i - 1 && !precedentsOuverts) {
      lignes.push(`<button type="button" class="lien rel-precedents">Jours précédents</button>`);
      break;
    }
    lignes.push(`<div class="rel-ligne" data-jour="${esc(iso)}">`
      + `<span class="rel-j">${esc(nom)}<small>modèle ${nombreFr(d.precipitation_sum[k] || 0)} mm</small></span>`
      + `<label class="rel-ch"><input type="number" step="0.5" min="0" max="400" `
      + `inputmode="decimal" class="rel-pluie" aria-label="Pluie relevée ${esc(nom)}" `
      + `value="${r.pluie_mm === null || r.pluie_mm === undefined ? "" : r.pluie_mm}"><span>pluie</span></label>`
      + `<label class="rel-ch"><input type="number" step="0.5" min="0" max="200" `
      + `inputmode="decimal" class="rel-arros" aria-label="Arrosage apporté ${esc(nom)}" `
      + `value="${r.arrosage_mm === null || r.arrosage_mm === undefined ? "" : r.arrosage_mm}"><span>arrosage</span></label>`
      + `</div>`);
  }

  /* La texture du sol est un réglage du jardin : elle s'y règle, avec le
     climat et la commune, et chaque espace ou zone peut la redéfinir dans ses
     réglages du lieu. La feuille ne fait que la rappeler. */
  const g = jardinActif() || {};
  const dite = RESERVE_SOL[g.sol_texture]
    ? `Sol ${SOL_LIBELLE[g.sol_texture].toLowerCase()}`
    : `Sol non renseigné, compté limoneux`;

  /* La jauge, le chiffre et la conclusion tiennent dans un seul bloc : c'est une
     seule et même lecture, elle n'a pas à traverser trois cadres. */
  return { titre: "L'eau", sous: "réserve du sol",
    corps: `<div class="f-carte js-bloc">`
      + `<div class="jauge-cadre">`
      + `<div class="jauge-sol" style="--pleine:${pleine}%;--seuil:${seuil}%">`
      + `<i class="js-eau"></i><i class="js-seuil"></i></div>`
      + `<span class="js-etiq" style="left:${seuil}%">confort ${seuil} %</span></div>`
      + `<p class="js-leg"><b>${pleine} %</b> de la réserve</p>`
      + `<p class="f-txt">${conseil}</p>`
      + `</div>`
      + `<div class="f-carte"><div class="f-carte-tete"><h3>Huit jours passés, trois annoncés</h3></div>`
      + `<div class="mt-barres">${barres.join("")}</div>`
      + `<p class="mt-leg"><span><i class="p"></i>modèle</span><span><i class="s"></i>poste</span>`
      + `<span><i class="m"></i>votre relevé</span><span><i class="e"></i>repris</span></p>`
      + `<p class="f-txt mt-bilan">Sur sept jours, <b>${nombreFr(b.pluie7)} mm</b> sont tombés`
      + (b.apporte7 ? ` et <b>${nombreFr(b.apporte7)} mm</b> ont été apportés` : "")
      + `, les cultures en ont repris <b>${nombreFr(b.demande7)} mm</b>.</p></div>`
      + (station
        ? `<div class="f-carte"><div class="f-carte-tete"><h3>Poste de mesure</h3></div>`
          + `<p class="f-txt"><b>${esc(station.libelle)}</b>, à ${nombreFr(station.km)} km. `
          + (nbMesures === 0
              ? `Aucun des trente derniers jours ne vient de ses relevés, le poste publiant `
                + `avec deux jours de retard.`
              : `${nbMesures} jour${nbMesures > 1 ? "s" : ""} sur les trente derniers `
                + `vien${nbMesures > 1 ? "nent" : "t"} de ses relevés, le reste du modèle, `
                + `le poste publiant avec deux jours de retard.`)
          + `</p>`
          + `<p class="f-note">Fichiers ouverts de Météo-France publiés sur data.gouv.fr, `
          + `relevés chaque matin. Les valeurs douteuses sont écartées.</p></div>`
        : `<p class="f-note">Aucun poste de mesure rattaché à ce jardin, la pluie vient du modèle. `
          + `Renseignez la commune pour rattacher le poste le plus proche.</p>`)
      + `<div class="f-carte"><div class="f-carte-tete"><h3>Vos relevés</h3></div>`
      + `<p class="f-note">En millimètres, soit en litres par mètre carré : ce que vous `
      + `mesurez remplace le modèle, et vos arrosages gardent le calcul juste.</p>`
      + `<div class="rel-table">${lignes.join("")}</div>`
      + `<p class="f-note" id="rel-note"></p></div>`
      + `<p class="f-note sol-rappel">${esc(dite)} : sur ${esc(ZR_M * 100)} cm de profondeur, `
      + `il retient ${nombreFr(b.taw)} mm. `
      + `<button type="button" class="lien" id="eauVersSol">Changer la texture</button></p>`
      + `<p class="f-note">Bilan hydrique du bulletin FAO 56, chapitre 8. Évapotranspiration de `
      + `référence calculée au point du jardin, coefficient cultural moyen des plantes retenues, `
      + `seuil de confort ajusté à la demande du jour. Le litrage par plante de la fiche reste `
      + `calé sur la normale de saison.</p>`,
    brancher: brancherEau };
}

// Saisie des relevés dans la feuille de l'eau, et renvoi au réglage du sol.
function brancherEau() {
  const note = $("rel-note");
  const enregistrer = async ligne => {
    const jour = ligne.dataset.jour;
    const lire = s => {
      const v = ligne.querySelector(s).value.trim();
      if (v === "") return null;
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null;
    };
    const r = await ecrireReleve(jour, lire(".rel-pluie"), lire(".rel-arros"));
    if (r && r.error) { note.textContent = "Enregistrement refusé : " + r.error.message; return; }
    note.textContent = "Relevé enregistré.";
    rendreBandeau();
  };
  // La saisie enregistre au fil de l'eau, la feuille ne se redessine qu'une fois
  // le tableau quitté : redessiner à chaque champ ferait perdre la frappe suivante.
  const table = document.querySelector(".rel-table");
  if (table) {
    table.querySelectorAll("input").forEach(c =>
      c.addEventListener("change", () => enregistrer(c.closest(".rel-ligne"))));
    table.addEventListener("focusout", e => {
      if (table.contains(e.relatedTarget)) return;
      setTimeout(() => { if (!$("feuille").hidden && document.querySelector(".rel-table")) ouvrirVue("eau"); }, 0);
    });
  }
  const plus = document.querySelector(".rel-precedents");
  if (plus) plus.addEventListener("click", () => { relevesDeplies = true; ouvrirVue("eau"); });
  const sol = $("eauVersSol");
  if (sol) sol.addEventListener("click", () => ouvrirVue(session ? "jardin" : "compte"));
}

/* La course du soleil, en arc au-dessus de l'horizon. La part parcourue depuis
   le lever est remplie, le disque marque l'heure qu'il est. Un tableau de
   quatre lignes ne disait pas où l'on en était dans la journée. */
function arcDuJour(leverMin, coucherMin, oursMin) {
  const W = 300, x0 = 24, x1 = 276, sol = 96, ht = 68;
  const f = Math.min(1, Math.max(0, (oursMin - leverMin) / Math.max(1, coucherMin - leverMin)));
  const pt = t => [x0 + (x1 - x0) * t, sol - Math.sin(Math.PI * t) * ht];
  const dit = p => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const pas = [];
  for (let k = 0; k <= 48; k++) pas.push(pt(k / 48));
  const arc = "M" + pas.map(dit).join(" L");
  const n = Math.max(1, Math.round(f * 48));
  const plein = `M${x0} ${sol} L` + pas.slice(0, n + 1).map(dit).join(" L")
    + ` L${dit(pt(f))} L${pt(f)[0].toFixed(1)} ${sol} Z`;
  const s = pt(f), sx = s[0].toFixed(1), sy = s[1].toFixed(1);
  // La vue est bornée au dessin : l'arc culmine à vingt-huit, l'horizon est à
  // quatre-vingt-seize, tout le reste était du vide.
  return `<svg class="f-svg arc-jour" viewBox="0 22 ${W} 82" role="img"`
    + ` aria-label="Course du soleil, du lever au coucher">`
    + `<path class="aj-plein" d="${plein}"/>`
    + `<path class="aj-arc" d="${arc}"/>`
    + `<line class="aj-sol" x1="8" y1="${sol}" x2="${W - 8}" y2="${sol}"/>`
    + `<line class="aj-fil" x1="${sx}" y1="${sy}" x2="${sx}" y2="${sol}"/>`
    + `<circle class="aj-astre" cx="${sx}" cy="${sy}" r="6"/>`
    + `</svg>`;
}

function vueLumiere() {
  const d = meteo.daily, i = iJour();
  const dur = d.daylight_duration[i];
  const delta = Math.round((dur - d.daylight_duration[i - 1]) / 60);
  const enMin = t => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));
  const lever = d.sunrise[i].slice(11, 16).replace(":", " h ");
  const coucher = d.sunset[i].slice(11, 16).replace(":", " h ");
  /* L'arc dit le lever, la durée et le coucher : le tableau qui les reprenait
     ligne à ligne ne disait rien de plus. Reste la tendance, que le dessin ne
     peut pas porter. */
  const veille = delta === 0 ? "autant qu'hier"
    : Math.abs(delta) + " minute" + (Math.abs(delta) > 1 ? "s" : "")
      + (delta > 0 ? " de plus" : " de moins") + " qu'hier";
  const sem = d.daylight_duration[i - 7];
  const eSem = sem ? Math.round((dur - sem) / 60) : 0;
  const semaine = eSem ? ", " + Math.abs(eSem) + " minute" + (Math.abs(eSem) > 1 ? "s" : "")
    + (eSem > 0 ? " de plus" : " de moins") + " qu'il y a une semaine" : "";
  return { titre: "La lumière", sous: hhmm(dur) + " de jour",
    corps: `<div class="f-carte aj-bloc">`
      + arcDuJour(enMin(d.sunrise[i]), enMin(d.sunset[i]), auj.getHours() * 60 + auj.getMinutes())
      + `<p class="aj-bornes"><span>${esc(lever)}</span><b>${esc(hhmm(dur))} de jour</b>`
      + `<span>${esc(coucher)}</span></p>`
      + `<p class="aj-tendance">${esc(veille + semaine)}</p></div>`
      + `<p class="f-txt">La lumière décide de la montée à graine des salades et des `
      + `épinards, et de la date à partir de laquelle un semis sous abri ne rattrape `
      + `plus son retard.</p>`
      + `<p class="f-note">Lever et coucher calculés au point du jardin.</p>` };
}

/* ---------- La saison ----------
   La feuille disait l'année : quatre dates de climat, vraies en janvier comme
   en août, et que le ruban portait déjà. Elle dit maintenant le temps qui
   reste et ce que ce temps change au jardin. */

// Le premier jour de la quinzaine q, dans l'année en cours.
const jourDeQ = q => jourDeLAn(AN_EN_COURS, Math.floor((q - 1) / 2), q % 2 ? 1 : 16);
// Jours d'ici à cette quinzaine. Une borne déjà passée est celle de l'an prochain.
const joursVers = q => {
  const d = jourDeQ(q) - JOUR_AN;
  return d >= 0 ? d : d + JOURS_AN;
};

/* Le compte à rebours se dit en semaines. Les bornes du référentiel sont des
   quinzaines : un compte en jours promettrait une précision qu'elles n'ont pas. */
function delaiTexte(jours) {
  if (jours < 4) return "moins d'une semaine";
  const sem = Math.round(jours / 7);
  if (sem <= 1) return "une semaine";
  if (sem < 14) return sem + " semaines";
  return Math.round(jours / 30.4) + " mois";
}

/* « le basilic fin septembre, la tomate et la courge fin octobre ». Les plantes
   qui finissent la même quinzaine sont nommées ensemble : une date par nom
   aurait répété la moitié de la ligne. */
function listeParQuinzaine(couples, max) {
  const parQ = new Map();
  couples.forEach(([p, q]) => {
    if (!parQ.has(q)) parQ.set(q, []);
    parQ.get(q).push(p);
  });
  return [...parQ.keys()].sort((a, b) => a - b).slice(0, max || 3)
    .map(q => enumerer(parQ.get(q).map(nomAvecArticle), 4) + " " + demiTexte(q))
    .join(", ");
}

/* La fenêtre de récolte la plus tardive de celles qui courent encore. Une
   fenêtre qui passe l'hiver, écrite à l'envers, est rendue telle quelle : son
   propre appelant la reconnaît à sa fin plus petite que son début. */
function recolteTardive(p) {
  const segs = segsDe(p, "recolte");
  if (!segs) return null;
  const encore = segs.filter(v => v[1] >= v[0] && v[1] >= demi);
  if (!encore.length) return null;
  return encore.reduce((a, v) => (v[1] > a[1] ? v : a));
}

const RAD = Math.PI / 180;
/* Durée du jour à une latitude, disque solaire et réfraction compris, pour le
   n-ième jour de l'année. Déclinaison par la série courte de Spencer, à un
   dixième de degré près, ce qui vaut moins d'une minute de jour. */
function dureeDuJour(lat, n) {
  const g = 2 * Math.PI / 365.24 * (n + 0.5);
  const d = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.001480 * Math.sin(3 * g);
  const c = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(d))
    / (Math.cos(lat * RAD) * Math.cos(d));
  if (c >= 1) return 0;
  if (c <= -1) return 24;
  return 2 * Math.acos(c) / RAD / 15;
}

/* Le prochain passage du jour au travers de dix heures. Sous ce seuil la
   végétation se conserve sans plus pousser : c'est la cause de la fin de
   saison, quand les bornes du référentiel n'en donnent que la date.

   Le calcul et le service météorologique s'écartent de deux minutes environ,
   leurs conventions d'horizon différant. Cela déplace la date d'un jour au
   plus, et la feuille de la lumière ne portant aucune date, les deux ne
   peuvent pas se contredire à l'écran. */
function passageDixHeures() {
  const g = jardinActif();
  const lat = g && g.lat !== null && g.lat !== undefined ? Number(g.lat) : null;
  // Sous le cercle polaire seulement : au delà le jour ne franchit plus le seuil.
  if (lat === null || !isFinite(lat) || Math.abs(lat) > 66) return null;
  const h = n => dureeDuJour(lat, ((n % JOURS_AN) + JOURS_AN) % JOURS_AN);
  const sous = h(JOUR_AN) < 10;
  for (let k = 1; k <= JOURS_AN; k++) {
    if ((h(JOUR_AN + k) < 10) === sous) continue;
    const d = new Date(Date.UTC(AN_EN_COURS, 0, 1 + JOUR_AN + k));
    return { sous, dans: k, jour: (d.getUTCDate() === 1 ? "1er" : d.getUTCDate())
      + " " + MOIS_PLEIN[d.getUTCMonth()] };
  }
  return null;
}

function vueSaison() {
  const s = saison[(jardinActif() || {}).climate_key];
  const p = positionSaison();
  const auJardin = [...sel].map(id => plantes.find(x => x.id === id)).filter(Boolean);
  /* Le ruban de la saison est celui du bandeau, avec d'autres bandes : les
     quatre étapes de la végétation sous ce climat, et le point du jour à sa
     place dans l'année. Quatre dates alignées ne le disaient pas. */
  const ETAPES = [["Repos", "#C3C9C0"], ["Reprise", "#A5C596"],
                  ["Pleine saison", "#6FA35A"], ["Ralentissement", "#C9A277"]];
  const ruban = s ? `<div class="ruban-veget">`
    + `<div class="regle-annee" aria-hidden="true">` + dessinRuban([
        { a: 0, t: ETAPES[0][1], b: jourDeQ(s.debut_q) },
        { a: jourDeQ(s.debut_q), t: ETAPES[1][1], b: jourDeQ(s.pleine_q) },
        { a: jourDeQ(s.pleine_q), t: ETAPES[2][1], b: jourDeQ(s.senescence_q) },
        { a: jourDeQ(s.senescence_q), t: ETAPES[3][1], b: jourDeQ(s.fin_q) },
        { a: jourDeQ(s.fin_q), t: ETAPES[0][1], b: JOURS_AN },
      ]) + `</div>`
    + `<p class="rv-leg">` + ETAPES.map(([nom, t]) =>
        `<span><i style="--t:${t}"></i>${nom.toLowerCase()}</span>`).join("") + `</p></div>` : "";

  /* Ce que la gelée fait au jardin ne se dit qu'à son approche, les quatre
     derniers mois de la saison, quand le jardinier commence à compter. Plus
     tôt, une date d'octobre n'apprend rien et encombre la feuille. */
  const approche = s && joursVers(s.fin_q) <= 120;

  /* L'étape en cours, ce qui lui reste, et ce qui vient après. Le gel se dit à
     part tant qu'il n'est pas la borne suivante, pour que la feuille porte
     toujours l'échéance qui commande le jardin. */
  const SUITE = s ? { Repos: [s.debut_q, "reprise"], Reprise: [s.pleine_q, "pleine saison"],
                      Pleine: [s.senescence_q, "ralentissement"],
                      "Déclin": [s.fin_q, "première gelée"] }[p.court] : null;
  const reste = SUITE ? `<p class="sa-reste"><b>${esc(majuscule(p.long || p.court))}`
    + ` encore ${esc(delaiTexte(joursVers(SUITE[0])))}</b>, `
    + `${esc(SUITE[1])} ${esc(demiTexte(SUITE[0]))}.`
    + (approche && SUITE[0] !== s.fin_q
      ? ` Première gelée attendue ${esc(demiTexte(s.fin_q))}, `
        + `dans ${esc(delaiTexte(joursVers(s.fin_q)))}.` : "") + `</p>` : "";

  /* Les plantes que la gelée arrête, et la date où leur récolte s'achève : le
     croisement des fenêtres du référentiel avec la borne du climat. */
  const gelives = approche ? auJardin.filter(x => x.gel !== null && x.gel !== undefined
    && Number(x.gel) >= -2) : [];
  const derniers = gelives.map(x => [x, recolteTardive(x)]).filter(x => x[1])
    .map(x => [x[0], x[1][1]]);

  /* La marge, quand elle tombe à une quinzaine ou moins : c'est là que la fin
     de récolte se joue sur la date d'une gelée, non sur le calendrier. */
  const serres = s ? derniers.filter(x => x[1] <= s.fin_q && s.fin_q - x[1] <= 1) : [];
  const qServre = serres.length ? Math.max(...serres.map(x => x[1])) : null;
  const courts = serres.filter(x => x[1] === qServre);
  /* La ligne des dernières récoltes tombe quand la marge les nomme toutes : la
     phrase qui suit porte alors les mêmes noms et la même date. */
  const recoltes = derniers.length > courts.length
    ? `<p class="f-txt">Dernières récoltes avant la gelée : `
      + `${esc(listeParQuinzaine(derniers, 3))}.</p>` : "";
  const marge = courts.length ? `<p class="f-txt">`
    + `${esc(majuscule(enumerer(courts.map(x => nomAvecArticle(x[0])), 4)))} se `
    + `récolte${courts.length > 1 ? "nt" : ""} jusqu'à ${esc(demiTexte(qServre))}, `
    + (s.fin_q === qServre ? "jusqu'à la première gelée"
        : "à une quinzaine de la première gelée")
    + ` : une gelée précoce coupe la fin de la récolte.</p>` : "";

  /* La gelée ferme la saison de croissance sans fermer le jardin. Les cueillettes
     de toute l'année sont écartées : elles ne disent rien de la saison. */
  const tardifs = approche ? auJardin.map(x => [x, recolteTardive(x)])
    .filter(x => x[1] && x[1][1] > s.fin_q && x[1][1] - x[1][0] <= 12)
    .map(x => [x[0], x[1][1]]) : [];
  const apres = tardifs.length ? `<p class="f-txt">Récoltes après la gelée : `
    + `${esc(listeParQuinzaine(tardifs, 2))}.</p>` : "";

  /* Le pendant de la liste des plus exposées, qui nommait celles qui souffrent
     sans dire quoi faire ni quand. */
  const proteges = approche
    ? auJardin.map(x => [x, segsDe(x, "protection")]).filter(x => x[1]) : [];
  const qProt = proteges.length
    ? Math.min(...proteges.map(x => Math.min(...x[1].map(v => v[0])))) : null;
  const protection = qProt ? `<p class="f-txt">`
    + (proteges.length <= 3
        ? majuscule(enumerer(proteges.map(x => nomAvecArticle(x[0])), 3)) + " demande"
          + (proteges.length > 1 ? "nt" : "")
        : proteges.length + " de vos plantes demandent")
    + ` une protection à partir de ${esc(demiTexte(qProt))}.</p>` : "";

  /* Les exposées que la ligne des récoltes n'a pas nommées : une plante d'ornement
     gèle aussi, sans que rien ne se récolte. */
  const nommees = new Set(derniers.map(x => x[0].id));
  const muets = gelives.filter(x => !nommees.has(x.id))
    .sort((a, b) => Number(b.gel) - Number(a.gel));
  const exposees = muets.length ? `<p class="f-txt">Également exposé${muets.length > 1 ? "es" : "e"} `
    + `à la première gelée : ${esc(enumerer(muets.map(nomAvecArticle), 6))}.</p>` : "";

  /* Le seuil se dit à la même échéance que la gelée : en avril, un passage de
     novembre n'apprend rien de plus qu'une date de récolte de novembre. */
  const d10 = passageDixHeures();
  const dix = d10 && d10.dans <= 120 ? d10 : null;
  const lumiere = dix ? `<p class="f-txt sa-lum">Le jour ${dix.sous
      ? "repasse au-dessus de dix heures le " + esc(dix.jour)
        + ". Au-delà, la végétation peut repartir."
      : "passe sous dix heures le " + esc(dix.jour)
        + ". En deçà, la végétation se conserve sans plus pousser."}</p>` : "";

  return { titre: "La saison", sous: p.long || p.court,
    corps: ruban + reste + recoltes + marge + apres + protection + exposees + lumiere
      // La note ne cite que les sources de ce qui est à l'écran.
      + `<p class="f-note">Bornes de saison par climat, table du référentiel.`
      + (approche ? ` Fenêtres de récolte et de protection, seuil de gel : fiche `
        + `de chaque plante.` : "")
      + (dix ? ` Passage sous dix heures calculé au point du jardin.` : "") + `</p>` };
}

function vueVigilance() {
  const vg = vigilanceDuJour();
  const g = jardinActif() || {};
  if (!vg) return { titre: "Vigilance", corps: `<p class="f-txt">Aucune vigilance en cours.</p>` };
  const quand = e => e === "J" ? "aujourd'hui" : "demain";
  const lignes = vigilance.filter(v => v.couleur > 1).map(v =>
    `<div class="vg-ligne v-${v.couleur}"><span class="vg-pastille"></span>`
    + `<span class="vg-txt"><b>${esc(quand(v.echeance))}</b>, vigilance ${esc(VIGI_NOM[v.couleur])} `
    + `${esc(enumerer((v.phenomenes || []).map(p => ALEA[p.id] || "phénomène " + p.id)))}</span></div>`).join("");
  const bulletin = (vigilance.find(v => v.texte) || {}).texte;
  const emis = (vigilance.find(v => v.emis_le) || {}).emis_le;
  const gestes = vg.ids.map(i => VIGI_GESTE[i]).filter(Boolean);
  return { titre: "Vigilance " + VIGI_NOM[vg.couleur], sous: g.commune || "",
    corps: `<div class="f-carte">${lignes}</div>`
      + (gestes.length ? `<p class="f-txt"><b>Au jardin</b> : ${esc(gestes.join(". "))}.</p>` : "")
      + (bulletin ? `<div class="f-carte"><div class="f-carte-tete"><h3>Bulletin du département</h3></div>`
          + `<p class="f-txt">${esc(bulletin)}</p></div>` : "")
      + `<p class="f-note">Vigilance météorologique de Météo-France pour le département `
      + `${esc(departementDe(g.code_postal) || "")}`
      + (emis ? `, émise le ${esc(new Date(emis).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))}` : "")
      + `. Fichiers ouverts publiés sur data.gouv.fr, relus toutes les deux heures.</p>` };
}

function vueLieu() {
  const g = jardinActif() || {};
  return { titre: "Situer le jardin", sous: g.commune || "",
    corps: `<p class="f-txt">La commune sert à lire la météo du lieu plutôt que la `
      + `normale du climat, et à corriger l'arrosage de la pluie tombée.</p>`
      + `<form class="mt-form" id="form-lieu"><input id="cp" type="text" `
      + `placeholder="Nom de commune ou code postal" value="${esc(g.commune || g.code_postal || "")}" `
      + `aria-label="Commune ou code postal"><button class="bouton" type="submit">Chercher</button></form>`
      + `<div id="cp-liste"></div>`
      + `<p class="f-note" id="cp-note">Un code postal couvre souvent plusieurs communes, `
      + `il faut donc choisir la vôtre. Recherche par la Base Adresse Nationale, `
      + `api-adresse.data.gouv.fr. Aucune position précise n'est demandée.</p>` };
}

function brancherLieu() {
  const f = $("form-lieu");
  if (!f) return;
  const note = $("cp-note"), liste = $("cp-liste");

  const retenir = async t => {
    const [lon, lat] = t.geometry.coordinates;
    const g = jardinActif();
    const val = { code_postal: t.properties.postcode || null,
      commune: t.properties.city || t.properties.name || t.properties.label,
      lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) };
    const { error } = await db.from("gardens").update(val).eq("id", g.id);
    if (error) { note.textContent = "Enregistrement refusé : " + error.message; return; }
    Object.assign(g, val);
    liste.innerHTML = "";
    note.textContent = val.commune + ", position enregistrée.";
    await lireMeteo(g);
    rendreMaintenant();
    majJardinUI();
    setTimeout(sortirFeuille, 700);
  };

  f.addEventListener("submit", async e => {
    e.preventDefault();
    const v = ($("cp").value || "").trim();
    if (v.length < 2) { note.textContent = "Saisissez un nom de commune ou un code postal."; return; }
    note.textContent = "Recherche...";
    liste.innerHTML = "";
    try {
      const r = await fetch("https://api-adresse.data.gouv.fr/search/?type=municipality&limit=10&q="
        + encodeURIComponent(v));
      const j = await r.json();
      const lot = j.features || [];
      if (!lot.length) { note.textContent = "Aucune commune trouvée."; return; }
      if (lot.length === 1) { await retenir(lot[0]); return; }
      // Plusieurs communes partagent le code : le choix revient au jardinier.
      note.textContent = lot.length + " communes correspondent, choisissez la vôtre.";
      lot.forEach(t => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "cp-choix";
        b.innerHTML = `<b>${esc(t.properties.city || t.properties.name)}</b>`
          + `<span>${esc(t.properties.postcode || "")}</span>`;
        b.addEventListener("click", () => retenir(t));
        liste.appendChild(b);
      });
    } catch (err) { note.textContent = "Service indisponible, réessayez plus tard."; }
  });
}

/* ================== Synthèse d'accueil ==================
   Ce qu'il y a à faire, en phrases. Une action qui se termine cette quinzaine
   ouvre la synthèse, le reste suit en lignes de verbe. La floraison n'est pas
   un geste, elle passe en pied. L'eau est un chiffre, elle a sa ligne. */

function rendreSynthese(paires) {
  const z = $("synthese");
  if (!z) return;
  const audibles = paires.filter(x => !x.muet);
  if (!audibles.length) { z.hidden = true; z.innerHTML = ""; return; }

  // Une entrée par verbe et non par tâche : la multiplication porte le mode de
  // chaque fiche, on ne divise pas un pêcher qui se greffe.
  const ferme = (p, k) => (segsDe(p, k) || [])
    .some(t => dansFenetre(demi, t[0], t[1]) && t[1] === demi);
  /* Le pendant de la fenêtre qui se ferme : celle qui vient de s'ouvrir, le
     geste étant possible depuis cette quinzaine et non avant. Une fenêtre d'une
     seule quinzaine s'ouvre et se ferme ensemble : elle compte pour ce qui se
     ferme, qui est le plus pressant des deux. */
  const ouvre = (p, k) => (segsDe(p, k) || [])
    .some(t => dansFenetre(demi, t[0], t[1]) && t[0] === demi && t[1] !== demi);
  const groupes = [];
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k]) return;
    const parVerbe = new Map();
    audibles.filter(x => x.k === k).forEach(x => {
      const v = verbeDe(x.p, k);
      if (!parVerbe.has(v)) parVerbe.set(v, new Map());
      parVerbe.get(v).set(x.p.id, x.p);
    });
    parVerbe.forEach((m, v) => {
      const plantes = [...m.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      groupes.push({ k, verbe: v, plantes, presse: plantes.filter(p => ferme(p, k)),
                     neuves: plantes.filter(p => ouvre(p, k)) });
    });
  });
  const gestes = groupes.filter(g => ETATS_FICHE.indexOf(g.k) === -1);
  const etats = groupes.filter(g => ETATS_FICHE.indexOf(g.k) !== -1);
  if (!gestes.length && !etats.length) { z.hidden = true; z.innerHTML = ""; return; }

  // La phrase de tête ne porte que ce qui se termine, et ne nomme que ces
  // plantes-là. Sans rien qui presse, elle prend la tâche la moins rattrapable.
  const urgents = gestes.filter(g => g.presse.length);
  const tete = (urgents.length ? urgents : gestes).slice(0, 2)
    .map(g => ({ g, plantes: urgents.length ? g.presse : g.plantes, presse: Boolean(urgents.length) }));

  const bout = liste => enumerer(liste.map(nomAvecArticle));
  // Quatre plantes nommées par ligne au total, quel que soit le nombre de verbes.
  // Le reste n'est pas énoncé : le compte de la tâche est affiché au bout de la
  // ligne et ouvre le détail complet.
  const texteLigne = l => {
    if (l.parts.length === 1) return enumerer(l.parts[0].plantes.map(nomAvecArticle), 3, true);
    let budget = 4, dits = [];
    l.parts.forEach(pa => {
      const pris = pa.plantes.slice(0, Math.max(0, budget));
      budget -= pris.length;
      if (pris.length) dits.push(pa.verbe.toLowerCase() + " " + enumerer(pris.map(nomAvecArticle), 4, true));
    });
    return dits.join(", ");
  };
  /* Le bord de la quinzaine qui se ferme mène à ses actions, toutes tâches
     confondues : c'est la seule façon de voir d'un coup ce qui se ferme. */
  const bord = (b, texte) => `<button type="button" class="fin" data-bord="${b}">`
    + `${esc(texte)}</button>`;
  /* Un verbe posé à côté d'un bord de quinzaine mène au bord restreint à sa
     tâche, non à la tâche entière : « première quinzaine pour tailler » promet
     les tailles qui viennent de s'ouvrir, non les huit tailles du moment. */
  const verbeOuvrant = (k, mot, b) => `<button type="button" class="syn-verbe" `
    + `data-tache="${esc(k)}"${b ? ` data-bord="${b}"` : ""}>${esc(mot.toLowerCase())}</button>`;

  const h = [];
  if (tete.length) {
    // Le verbe de la phrase de tête ouvre lui aussi sa tâche : une tâche dont
    // toutes les plantes sont citées ici n'a pas de ligne en dessous.
    /* La phrase pressée ne nomme que les plantes dont la fenêtre se ferme : son
       verbe mène donc au même lot, et non à la tâche entière. */
    const phrases = tete.map(t =>
      `${verbeOuvrant(t.g.k, t.g.verbe, t.presse ? "derniere" : "")} ${esc(bout(t.plantes))}`);
    h.push(`<p class="syn-tete">En ce moment, ${phrases.join(" et ")}`
      + (tete[0].presse ? " " + bord("derniere", "avant la fin de la quinzaine") : "") + ".</p>");
  }

  // Les lignes reprennent le reste, la plante déjà nommée en tête n'y revient pas.
  // Une ligne par tâche. Quand la tâche porte plusieurs verbes, cas de la
  // multiplication, la ligne prend le verbe générique et chaque verbe exact
  // reste devant ses plantes : on ne divise pas un pêcher qui se greffe.
  let lignes = [];
  gestes.forEach(g => {
    const dit = tete.find(t => t.g === g);
    let reste = dit ? g.plantes.filter(p => dit.plantes.indexOf(p) === -1) : g.plantes;
    if (!reste.length) return;
    const presse = !dit && g.presse.length > 0;
    // Le nombre de plantes que la marque concerne : elle ne vaut souvent que
    // pour une partie de la ligne.
    const nPresse = presse ? reste.filter(p => g.presse.indexOf(p) !== -1).length : 0;
    /* Ce qui se ferme prime sur ce qui s'ouvre : la ligne ne porte qu'une
       marque. Ce qui s'ouvre n'a plus de phrase propre depuis le 13 octobre :
       elle redisait les lignes, la marque suffit. */
    const neuve = !presse && g.neuves.length > 0;
    const nNeuve = neuve ? reste.filter(p => g.neuves.indexOf(p) !== -1).length : 0;
    if (presse) reste = g.presse.concat(reste.filter(p => g.presse.indexOf(p) === -1));
    const deja = lignes.find(l => l.k === g.k);
    if (deja) {
      deja.parts.push({ verbe: g.verbe, plantes: reste });
      deja.total += reste.length;
      deja.presse = deja.presse || presse;
      deja.neuve = deja.neuve || neuve;
      deja.nPresse += nPresse; deja.nNeuve += nNeuve;
    } else {
      lignes.push({ k: g.k, verbe: VERBE[g.k], parts: [{ verbe: g.verbe, plantes: reste }],
                    total: reste.length, presse, neuve, nPresse, nNeuve });
    }
  });
  // Au delà de six lignes la synthèse redevient la liste. Ce qui saute est le
  // geste qui porte le moins de plantes, jamais celui dont la fenêtre se ferme,
  // sans quoi la récolte d'août tomberait la première pour être en fin d'ordre.
  const MAX_LIGNES = 6;
  let trop = [];
  if (lignes.length > MAX_LIGNES) {
    const gardees = lignes.slice()
      .sort((a, b) => (Number(b.presse) - Number(a.presse)) || (b.total - a.total))
      .slice(0, MAX_LIGNES);
    trop = lignes.filter(l => gardees.indexOf(l) === -1);
    lignes = lignes.filter(l => gardees.indexOf(l) !== -1);
  }
  // Le compte porté par la ligne est celui de la tâche entière, il annonce donc
  // exactement ce que le niveau de détail affichera.
  const compteK = {};
  audibles.forEach(x => { compteK[x.k] = (compteK[x.k] || 0) + 1; });
  const CHEVRON = '<svg class="syn-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  if (lignes.length) {
    h.push('<div class="syn-lignes">' + lignes.map(l =>
      // La planche de la première plante nommée tient lieu de vignette : la ligne
      // dit alors de quoi il s'agit avant même d'être lue. Le picto de la tâche
      // reste quand la plante n'a pas de planche.
      `<button type="button" class="syn-ligne" data-tache="${esc(l.k)}">`
      + ((pl => pl
          ? vignettePlanche(pl, "syn-pl")
          : `<span class="syn-pt" style="--t:${teinteK(l.k)}">`
            + `<svg viewBox="0 0 24 24" aria-hidden="true">${PICTOS[l.k] || ""}</svg></span>`
        )(l.parts.reduce((a, pa) => a || pa.plantes.find(aPlanche), null)))
      + `<span class="syn-txt"><span class="v">${esc(l.parts.length > 1 ? l.verbe : l.parts[0].verbe)}</span> `
      + `<span class="l">${esc(texteLigne(l))}`
      + (l.presse && l.nPresse ? ` <span class="fin fin-termine">· ${l.nPresse} `
          + `${l.nPresse > 1 ? "se terminent" : "se termine"}</span>`
        : l.neuve && l.nNeuve ? ` <span class="fin fin-demarre">· ${l.nNeuve} `
          + `${l.nNeuve > 1 ? "démarrent" : "démarre"}</span>` : "")
      + `</span></span><span class="syn-nb">${compteK[l.k] || l.total}</span>${CHEVRON}</button>`).join("")
      + (trop.length ? `<button type="button" class="syn-ligne syn-plus" data-tache="">`
        + `<span class="syn-pt syn-pt-vide"></span>`
        + `<span class="syn-txt"><span class="l">et ${trop.length} autre${trop.length > 1 ? "s" : ""} geste`
        + `${trop.length > 1 ? "s" : ""} : ${esc(trop.map(l => (l.parts.length > 1 ? l.verbe : l.parts[0].verbe).toLowerCase()).join(", "))}`
        + `</span></span><span class="syn-nb">${trop.reduce((a, l) => a + (compteK[l.k] || 0), 0)}</span>${CHEVRON}</button>` : "")
      + "</div>");
  }

  /* Ce qui fleurit se montre au lieu de se compter. Huit planches au plus, celles
     du jardin, choisies parmi les plantes en fleur cette quinzaine. C'est le seul
     endroit de l'écran qui regarde le jardin plutôt que le travail. Les plantes
     qui nourrissent les butineurs passent devant : l'ordre alphabétique ne dit
     rien de ce qui vaut d'être regardé. */
  const enFleur = etats.reduce((a, g) => a.concat(g.plantes), []).filter(aPlanche);
  const note = p => (PIPS_BUT[p.nectar] || 0) + (PIPS_BUT[p.pollen] || 0);
  const vusFleur = enFleur.slice().sort((a, b) =>
    (note(b) - note(a)) || a.nom.localeCompare(b.nom, "fr")).slice(0, 8);
  const zf = $("carteFleur");
  if (zf) {
    zf.hidden = vusFleur.length === 0;
    zf.innerHTML = vusFleur.length
      ? `<h3 class="syn-sect bloc-titre">En fleur en ce moment</h3><div class="fl-rail">`
        + vusFleur.map(p => `<button type="button" class="fl-i" data-plante="${esc(p.id)}">`
            + vignettePlanche(p, "fl-pl") + `<span>${esc(p.nom)}</span></button>`).join("")
        + `</div>`
      : "";
    poserPlanches(zf);
    zf.querySelectorAll(".fl-i[data-plante]").forEach(b => b.addEventListener("click", () => {
      const p = plantes.find(x => String(x.id) === b.dataset.plante);
      if (p) ouvrirFeuille(p);
    }));
  }

  const pied = [];
  // La bande les montre : le compte ne se répète que lorsqu'elle est absente.
  if (!vusFleur.length) etats.forEach(g => {
    const n = g.plantes.length;
    // Au delà de quatre, nommer les plantes en fleur devient une liste.
    pied.push(n > 4 ? n + " plantes sont en fleur"
      : bout(g.plantes) + (n > 1 ? " sont en fleur" : " est en fleur"));
  });
  /* L'eau ne se dit plus ici quand la tuile de l'eau la porte en tête d'écran,
     sa feuille gardant la décision entière : la redire au pied de la synthèse
     faisait trois mentions de l'eau sur le même écran, l'alerte de chaleur
     comprise. Sans météo, la tuile manque, et le pied garde le besoin moyen de
     la normale de saison. */
  if (!meteo) {
    const eau = besoinEauDuJour();
    if (eau) pied.push(`compter <b>${esc(eau)}</b> et par jour sur les cultures arrosées`);
  }
  if (pied.length) {
    const t = pied.join(", ");
    h.push(`<p class="syn-pied">${t.charAt(0).toUpperCase() + t.slice(1)}.</p>`);
  }

  /* Le titre fait la tête du bloc, collée en haut de l'écran tant qu'on lit
     la synthèse. */
  const nAud = audibles.length;
  z.innerHTML = `<h2 class="bloc-titre">À faire cette quinzaine`
    + `<span class="nb">${nAud} action${nAud > 1 ? "s" : ""}</span></h2>` + h.join("");
  z.hidden = false;
  poserPlanches(z);
  z.querySelectorAll(".fl-i[data-plante]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const p = plantes.find(x => String(x.id) === b.dataset.plante);
    if (p) ouvrirFeuille(p);
  }));
  /* Un clic sur une ligne ouvre la tâche, la ligne de reste ouvre la liste
     complète. Un bord de quinzaine ouvre son propre niveau, restreint à la tâche
     quand le mot touché en portait une, toutes tâches confondues sinon. Un seul
     branchement pour les trois : un verbe porte les deux attributs, et deux
     écouteurs se seraient succédé sur lui. */
  z.querySelectorAll(".syn-ligne,.syn-verbe,[data-bord]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      const k = b.dataset.tache, bo = b.dataset.bord;
      ouvrirDetail(bo ? { t: "bord", bord: bo, k: k || null }
        : k ? { t: "tache", k } : { t: "tout" });
    }));
}

// Besoin en eau de la quinzaine, une seule ligne par plante retenue.
let eauJour = [];

async function lireEauDuJour(cle) {
  eauJour = [];
  kcParQuinzaine = {};
  if (!cle || !sel.size) return;
  // Le bilan hydrique remonte à trente jours et se projette sur une semaine, il
  // traverse donc jusqu'à trois quinzaines.
  const qs = [-2, -1, 0, 1].map(d => ((demi - 1 + d + 24) % 24) + 1);
  const { data } = await avecReprise(() => db.from("arrosage_plante_quinzaine")
    .select("plant_id,quinzaine,kc,litres_jour_m2").eq("climate_key", cle)
    .in("quinzaine", qs).in("plant_id", [...sel]));
  const lot = data || [];
  eauJour = lot.filter(r => r.quinzaine === demi && r.litres_jour_m2 !== null);
  // Coefficient cultural moyen du jardin, quinzaine par quinzaine. Les plantes
  // sans calcul, contenants et cultures sans arrosage, ne comptent pas.
  qs.forEach(q => {
    const v = lot.filter(r => r.quinzaine === q && r.kc !== null).map(r => Number(r.kc));
    if (v.length) kcParQuinzaine[q] = v.reduce((s, x) => s + x, 0) / v.length;
  });
}

// Vocabulaire horticole, lu une fois au démarrage et indépendant du jardin.
async function lireGlossaire() {
  const { data } = await avecReprise(() => db.from("glossaire")
    .select("terme,variantes,definition").order("terme"));
  glossaire = data || [];
  compilerGlossaire();
}

async function lireVigilance() {
  vigilance = [];
  const g = jardinActif();
  const dep = g && departementDe(g.code_postal);
  if (!dep) return;
  const { data } = await avecReprise(() => db.from("vigilance")
    .select("echeance,couleur,phenomenes,debut,fin,texte,emis_le").eq("departement", dep));
  vigilance = (data || []).sort((a, b) => a.echeance.localeCompare(b.echeance));
}

// Distance à vol d'oiseau entre deux points, en kilomètres.
const distanceKm = (la, lo, lb, ob) => {
  const r = Math.PI / 180;
  return 6371 * Math.acos(Math.min(1,
    Math.sin(la * r) * Math.sin(lb * r) +
    Math.cos(la * r) * Math.cos(lb * r) * Math.cos((ob - lo) * r)));
};

// Poste de mesure du jardin et sa pluie sur la fenêtre du bilan. Le poste est
// rattaché en base au plus proche de la commune, à moins de quarante kilomètres.
async function lireStation() {
  pluieStation = new Map(); station = null;
  const g = jardinActif();
  if (!g || !g.station_num) return;
  const depuis = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
  const [rs, rp] = await Promise.all([
    avecReprise(() => db.from("stations_meteo")
      .select("num,nom,lat,lon,dernier_jour").eq("num", g.station_num).single()),
    avecReprise(() => db.from("pluie_station")
      .select("jour,rr_mm,qualite").eq("num", g.station_num).gte("jour", depuis)),
  ]);
  if (rs && rs.data) {
    station = rs.data;
    station.km = Math.round(distanceKm(g.lat, g.lon, station.lat, station.lon) * 10) / 10;
    // Le nom du poste est écrit en capitales dans la source, avec des suffixes
    // de réseau qui n'apprennent rien au jardinier.
    station.libelle = String(station.nom).replace(/_[A-Z]+$/, "")
      .toLowerCase().replace(/(^|[\s-])([a-zà-ÿ])/g, (m, s, c) => s + c.toUpperCase());
  }
  // Une valeur douteuse ou filtrée n'entre pas dans le bilan.
  (rp && rp.data ? rp.data : []).forEach(r => {
    if (r.rr_mm !== null && (r.qualite === null || r.qualite <= 1)) pluieStation.set(r.jour, Number(r.rr_mm));
  });
}

// Relevés du jardinier sur la fenêtre du bilan, indexés par jour.
async function lireReleves() {
  releves = new Map();
  const g = jardinActif();
  if (!g || !session) return;
  const depuis = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
  const { data } = await avecReprise(() => db.from("releves_eau")
    .select("jour,pluie_mm,arrosage_mm").eq("garden_id", g.id).gte("jour", depuis));
  (data || []).forEach(r => releves.set(r.jour, r));
}

// Une saisie efface sa ligne quand les deux mesures sont vides.
async function ecrireReleve(jour, pluie, arrosage) {
  const g = jardinActif();
  if (!g || !session) return { error: { message: "Connectez-vous pour enregistrer un relevé." } };
  if (pluie === null && arrosage === null) {
    releves.delete(jour);
    return await db.from("releves_eau").delete().eq("garden_id", g.id).eq("jour", jour);
  }
  const ligne = { garden_id: g.id, jour, pluie_mm: pluie, arrosage_mm: arrosage };
  const r = await db.from("releves_eau").upsert(ligne, { onConflict: "garden_id,jour" });
  if (!r.error) releves.set(jour, ligne);
  return r;
}

// Moyenne des besoins calculés, les plantes sans calcul ne comptent pas.
function besoinEauDuJour() {
  if (!eauJour.length) return "";
  const m = eauJour.reduce((a, r) => a + Number(r.litres_jour_m2), 0) / eauJour.length;
  return m.toFixed(1).replace(".", ",") + " L par m²";
}

/* Les trois lectures de la frise. L'ordre alphabétique est celui de départ, il
   ne suppose rien du jardin ; le type range par typologie du référentiel ;
   l'espace n'est offert qu'à un jardin découpé. Une plante placée dans deux
   espaces paraît dans les deux, comme dans la liste complète du jour. */
const VUES_ANNEE = [["alpha", "A à Z"], ["typo", "Type"], ["espace", "Espace"]];

function majBasculeAnnee() {
  const b = $("basculeAnnee");
  if (!b) return;
  const avecEspaces = racines().length > 0;
  if (vueAnnee === "espace" && !avecEspaces) vueAnnee = "alpha";
  b.innerHTML = "";
  VUES_ANNEE.forEach(([v, lib]) => {
    if (v === "espace" && !avecEspaces) return;
    const t = document.createElement("button");
    t.type = "button"; t.className = "vue" + (vueAnnee === v ? " active" : "");
    t.dataset.vue = v;
    t.setAttribute("aria-pressed", String(vueAnnee === v));
    t.textContent = lib;
    t.addEventListener("click", () => {
      vueAnnee = v;
      try { localStorage.setItem("monjardin.annee", v); } catch (e) { /* stockage indisponible */ }
      majBasculeAnnee();
      rendrePlanning();
    });
    b.appendChild(t);
  });
}

// Les sections de la frise, dans l'ordre de lecture du regroupement retenu.
function sectionsAnnee(lot) {
  if (vueAnnee === "typo") {
    return ORDRE_TYPO.map(t => ({ nom: t, teinte: COUL_TYPO[t],
                                  lot: lot.filter(p => p.typo === t) }))
      .filter(s => s.lot.length);
  }
  if (vueAnnee === "espace") {
    const dedans = (p, cle) => cle === "0"
      ? !espacesDe(p.id).length : racinesDe(p.id).indexOf(cle) !== -1;
    return racines().map(z => ({ nom: z.name, teinte: z.color || "#4C8C3F", cle: z.id }))
      .concat([{ nom: "Non placées", teinte: "#9AA39B", cle: "0" }])
      .map(s => ({ ...s, lot: lot.filter(p => dedans(p, s.cle)) }))
      .filter(s => s.lot.length);
  }
  return [{ nom: "", lot }];
}

function rendrePlanning() {
  const zone = $("rangees");
  zone.innerHTML = "";
  majBasculeAnnee();
  const lot = plantes.filter(p => {
    if (jardinSeul && !sel.has(p.id)) return false;
    if (espacePlan !== null && (!sel.has(p.id) || !passeEspace(p))) return false;
    if (!etatTypoP[p.typo] || !etatCatP[p.cat]) return false;
    if (!dansMois(p)) return false;
    return ORDRE.some(k => etatPhase[k] && p.phases[k]);
  });
  $("bilanPlan").textContent = `${lot.length} sur ${plantes.length} affichées`
    + (periode === null ? "" : ` · ${periode.nom}`);
  $("razMois").hidden = periode === null;
  majCompteurFiltres();

  /* Les rangées d'une section sont enfermées dans leur bloc : la rayure une
     ligne sur deux se compte par section, un en-tête inséré dans le flux
     l'aurait décalée d'une rangée à chaque titre. */
  sectionsAnnee(lot).forEach(s => {
    if (s.nom) {
      const t = document.createElement("div");
      t.className = "tete-frise";
      t.innerHTML = `<i style="background:${s.teinte}"></i><b>${esc(s.nom)}</b>`
        + `<span class="nb">${s.lot.length}</span>`;
      zone.appendChild(t);
    }
    const bloc = document.createElement("div");
    bloc.className = "bloc-frise";
    s.lot.forEach(p => {
      const r = document.createElement("div");
      // Le liseré ne marque l'appartenance au jardin que si le catalogue entier est affiché.
      r.className = "rangee" + (sel.has(p.id) && !jardinSeul ? " retenue" : "");
      r.innerHTML =
        `<button class="nom-plante">${vignettePlanche(p, "v-pl-s")}`
        + `<span class="nom-plante-txt">${esc(p.nom)}`
        + `<small>${p.latin ? `<i>${esc(p.latin)}</i>` : esc(p.cat)}</small></span></button>`
        + `<div class="piste">${segs(p)}</div>`;
      r.querySelector(".nom-plante").addEventListener("click", () => ouvrirFeuille(p));
      bloc.appendChild(r);
    });
    zone.appendChild(bloc);
  });

  poserPlanches(zone);
  const v = $("videPlanning");
  v.hidden = lot.length > 0;
  v.textContent = (jardinSeul && !sel.size)
    ? messageSansPlante()
    : (periode === null
        ? "Aucune plante ne correspond à ces filtres."
        : `Aucune tâche en ${periode.nom} parmi les plantes filtrées.`);
  placerMarqueur();
  rendreQuinzaine();
}

/* ---------- L'année lue à la quinzaine ----------
   Les plantes du jardin, rangées par geste dans l'ordre de l'écran du jour. La
   frise et ses filtres restent derrière la bascule : la quinzaine ne lit que le
   jardin, sans filtre, et ne connaît que les masquages définitifs, les autres
   portant sur la quinzaine ou la période en cours. */
function majLectureAnnee() {
  const frise = lectureAnnee === "frise";
  $("vueQuinzaine").hidden = frise;
  $("vueFrise").hidden = !frise;
  $("lectureAnnee").querySelectorAll(".vue").forEach(b => {
    const actif = b.dataset.lecture === lectureAnnee;
    b.classList.toggle("active", actif);
    b.setAttribute("aria-pressed", String(actif));
  });
  // Le repère du jour se mesure sur un tableau affiché.
  if (frise) placerMarqueur();
}

function rendreQuinzaine() {
  const z = $("gestesQuinz");
  if (!z) return;
  const q = quinzLue, m = Math.ceil(q / 2) - 1;
  const finMois = new Date(auj.getFullYear(), m + 1, 0).getDate();
  $("titreQuinz").textContent = (q % 2 ? "Première" : "Seconde") + " quinzaine " + deMois(m);
  $("sousQuinz").textContent = (q % 2 ? `du 1er au 15 ${MOIS[m].toLowerCase()}`
    : `du 16 au ${finMois} ${MOIS[m].toLowerCase()}`) + (q === demi ? ", en cours" : "");
  $("quinzEnCours").hidden = q === demi;
  z.innerHTML = "";

  const mien = plantes.filter(p => sel.has(p.id));
  if (!mien.length) {
    z.innerHTML = videJardinHTML();
    return;
  }
  const masquee = (p, k) => {
    const r = sourdines.get(cleSourdine(p, k));
    return Boolean(r && r.portee === "toujours");
  };
  const fenetre = (p, k) => (segsDe(p, k) || []).find(v => dansFenetre(q, v[0], v[1]));

  let total = 0;
  const concernees = new Set();
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k]) return;
    const lot = mien.filter(p => fenetre(p, k) && !masquee(p, k))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    if (!lot.length) return;
    total += lot.length;
    lot.forEach(p => concernees.add(p.id));
    const carte = document.createElement("section");
    carte.className = "geste-quinz";
    carte.dataset.tache = k;
    carte.innerHTML = `<h3 class="bloc-titre"><span class="pt-tache" style="background:${teinteK(k)}">`
      + `<svg viewBox="0 0 24 24" aria-hidden="true">${PICTOS[k] || ""}</svg></span>`
      + `<span class="nom-geste">${esc(VERBE[k] || phases[k].label)}</span>`
      + `<span class="nb">${lot.length}</span></h3>`;
    const liste = document.createElement("div");
    liste.className = "plantes-quinz";
    lot.forEach(p => {
      const v = fenetre(p, k);
      /* Les deux bords d'une fenêtre se disent comme sur l'écran du jour. Une
         fenêtre d'une seule quinzaine compte pour celle qui se ferme. */
      const bord = k === "floraison" ? ""
        : v[1] === q ? '<span class="echeance urgente">se termine</span>'
        : v[0] === q ? '<span class="echeance neuve">démarre</span>' : "";
      // La multiplication dit le mode propre à la plante sous le verbe générique.
      const mode = k === "multiplication" && verbeDe(p, k) !== VERBE[k]
        ? `<small>${esc(verbeDe(p, k).toLowerCase())}</small>` : "";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "plante-quinz";
      b.innerHTML = vignettePlanche(p, "v-pl-s")
        + `<span class="nom-pq">${esc(p.nom)}${mode}</span>${bord}`;
      b.addEventListener("click", () => ouvrirFeuille(p));
      liste.appendChild(b);
    });
    carte.appendChild(liste);
    z.appendChild(carte);
  });

  if (!total) {
    z.innerHTML = '<p class="vide">Rien à faire au jardin cette quinzaine.</p>';
    return;
  }
  const bilan = document.createElement("p");
  bilan.className = "bilan-quinz";
  bilan.innerHTML = `<b>${total}</b> action${total > 1 ? "s" : ""} sur `
    + `<b>${concernees.size}</b> plante${concernees.size > 1 ? "s" : ""}`;
  z.prepend(bilan);
  poserPlanches(z);
}

function allerQuinzaine(pas) {
  quinzLue = (quinzLue - 1 + pas + 24) % 24 + 1;
  rendreQuinzaine();
}

sur("quinzPrec", "click", () => allerQuinzaine(-1));
sur("quinzSuiv", "click", () => allerQuinzaine(1));
sur("quinzEnCours", "click", () => { quinzLue = demi; rendreQuinzaine(); });
sur("lectureAnnee", "click", e => {
  const b = e.target.closest(".vue");
  if (!b || b.dataset.lecture === lectureAnnee) return;
  lectureAnnee = b.dataset.lecture;
  majLectureAnnee();
  window.scrollTo(0, 0);
});

function placerMarqueur() {
  const m = $("marqueurJour");
  if (!$("rangees").childElementCount) { m.hidden = true; return; }
  const debut = new Date(auj.getFullYear(), 0, 1), fin = new Date(auj.getFullYear() + 1, 0, 1);
  const f = (auj - debut) / (fin - debut);
  const col = getComputedStyle(document.documentElement).getPropertyValue("--col-nom").trim();
  m.style.left = `calc(${col} + (100% - ${col}) * ${f})`;
  m.hidden = false;
}

function nbFiltresActifs() {
  let n = 0;
  const cles = ORDRE.filter(k => phases[k]);
  if (cles.length && cles.some(k => !etatPhase[k])) n++;
  if (ORDRE_TYPO.some(t => !etatTypoP[t])) n++;
  const cats = catsVisibles(etatTypoP);
  if (cats.length && cats.some(c => !etatCatP[c])) n++;
  if (espacePlan !== null) n++;
  if (periode !== null) n++;
  return n;
}

function majCompteurFiltres() {
  const n = nbFiltresActifs(), e = $("nbFiltres");
  if (!e) return;
  e.textContent = n;
  e.hidden = n === 0;
  $("basculeFiltres").setAttribute("aria-pressed", String(n > 0));
}

sur("basculeFiltres", "click", function () {
  const ouvert = $("corpsFiltres").hidden;
  $("corpsFiltres").hidden = !ouvert;
  this.setAttribute("aria-expanded", String(ouvert));
});

sur("btnLegende", "click", () => ouvrirVue("legende"));

/* Une barre de la frise s'ouvre au doigt comme au clavier : elle porte un rôle
   de bouton, elle en prend les touches. */
sur("rangees", "click", e => {
  const seg = e.target.closest(".seg");
  if (seg) ouvrirPeriode(seg);
});
sur("rangees", "keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const seg = e.target.closest(".seg");
  if (!seg) return;
  e.preventDefault();
  ouvrirPeriode(seg);
});

function ouvrirPeriode(seg) {
  const p = plantes.find(x => String(x.id) === seg.dataset.plante);
  if (!p) return;
  periodeFeuille = { p, k: seg.dataset.tache, a: Number(seg.dataset.a),
                     b: Number(seg.dataset.b), id: seg.dataset.periode };
  ouvrirVue("periode");
}

sur("razMois", "click", () => {
  periode = null; majMois(); rendrePlanning();
});

sur("filtreJardin", "click", function () {
  jardinSeul = !jardinSeul;
  this.setAttribute("aria-pressed", String(jardinSeul));
  rendrePlanning();
});

/* ================== Authentification ================== */

sur("form-connexion", "submit", async e => {
  e.preventDefault();
  const email = $("email").value.trim();
  if (!email) return;
  const { error } = await db.auth.signInWithOtp({
    email, options: { emailRedirectTo: window.location.href.split("#")[0] },
  });
  if (!error) {
    $("form-code").hidden = false; $("ouvrirCode").hidden = true;
    $("aide-code").hidden = false; $("code").focus();
  }
  const note = $("note-connexion");
  note.hidden = false;
  note.classList.toggle("erreur", Boolean(error));
  note.textContent = error ? "Envoi impossible : " + error.message
                           : "Message envoyé. Ouvrez le lien depuis un navigateur, ou saisissez ici le code reçu.";
});

sur("deconnexion", "click", () => db.auth.signOut());
sur("ouvrirCode", "click", () => {
  $("form-code").hidden = false; $("ouvrirCode").hidden = true; $("code").focus();
});
sur("voirEcartees", "click", () => ouvrirVue("photosEcartees"));

db.auth.onAuthStateChange((_e, s) => {
  session = s;
  const connecte = Boolean(s);
  $("zone-connexion").hidden = connecte;
  $("panneau-compte").hidden = !connecte;
  $("videSelection").hidden = connecte;
  majAccesJardin(connecte);
  if (connecte) { $("aide-code").hidden = true; $("code").value = ""; $("codeReprise").hidden = true; }
  $("deconnexion").hidden = !connecte;
  $("utilisateur").textContent = connecte ? s.user.email : "";
  if (!$("etat").classList.contains("erreur")) info("");
  chargerJardin();
});


/* ================== Version installée et mise à jour ================== */

/* Le numéro de la copie installée paraît au bas de la feuille du compte, hors
   du panneau : c'est quand rien ne marche qu'on le cherche, et il ne faut pas
   être connecté pour le lire.

   Le numéro seul ne suffisait pas. Posée sur l'écran d'accueil, l'application
   est réveillée sans être rechargée : le document reste celui du jour de
   l'installation, parfois pendant des semaines, alors que le site en sert un
   autre. Le numéro affiché était donc juste, et pourtant introuvable, puisque
   la copie qui tournait avait été installée avant qu'il existe. D'où deux
   ajouts : un contrôle au réveil, et une recherche à la demande.

   Le point de comparaison est l'agent de service. Sa version est calculée sur
   les empreintes de tous les actifs, elle change dès que l'un d'eux change, et
   le document en porte une copie dans une balise meta. Deux numéros différents
   disent qu'une copie plus récente attend. */
const VERSION_DOC = (document.querySelector('meta[name="version-appli"]') || {}).content || "";
const DELAI_CONTROLE = 600000;   // dix minutes entre deux contrôles automatiques
let agentMaj = null;             // l'inscription de l'agent de service
let dernierControleMaj = 0;
let majPrete = false;    // une copie plus récente attend en ligne
let majEcartee = false;  // le bandeau a été écarté, il ne revient pas de lui-même

if ($("versionAppli") && VERSION_DOC) $("versionAppli").textContent = "Version " + VERSION_DOC;

/* L'agent de service n'est pas interrogé par son cache : il est écarté de
   l'interception, sans quoi la première réponse serait servie indéfiniment et
   le numéro en ligne resterait figé. */
async function versionEnLigne() {
  const r = await fetch("./sw.js", { cache: "no-store" });
  if (!r.ok) throw new Error("agent de service indisponible");
  const m = (await r.text()).match(/const VERSION = "([A-Za-z0-9.]+)"/);
  if (!m) throw new Error("numéro illisible");
  return m[1];
}

/* Rend vrai quand le site sert une copie plus récente. Le contrôle automatique
   est espacé, celui demandé par une personne ne l'est pas. */
async function controlerMaj(force) {
  const t = Date.now();
  if (!force && t - dernierControleMaj < DELAI_CONTROLE) return majPrete;
  dernierControleMaj = t;
  const v = await versionEnLigne();
  if (!VERSION_DOC || v === VERSION_DOC) return false;
  /* La copie neuve est mise en cache avant le redémarrage : le rechargement
     part alors du disque et non du réseau. */
  if (agentMaj) agentMaj.update().catch(() => { /* sans effet sur la suite */ });
  return true;
}

/* Écarté, le bandeau ne revient pas au réveil suivant : la recherche reste
   offerte au bas de la feuille du compte. */
function annoncerMaj() {
  majPrete = true;
  const b = $("bandeauMaj");
  if (b && !majEcartee) b.hidden = false;
}

function controlerEtAnnoncer() {
  controlerMaj(false).then(n => { if (n) annoncerMaj(); })
    .catch(() => { /* hors ligne : le contrôle reprendra au réveil suivant */ });
}

/* Le navigateur ne va voir de lui-même s'il existe une copie neuve qu'à la
   navigation, qui n'a jamais lieu dans une application posée sur l'écran
   d'accueil. Le retour au premier plan en tient lieu. */
/* Une application posée sur l'écran d'accueil est reprise, non rechargée : elle
   affichait indéfiniment la charge de son démarrage pendant que la fenêtre
   glissante avançait sur des données figées, et la note de la feuille promettait
   pourtant une relecture toutes les heures. Le retour au premier plan la relit
   quand l'heure a changé, et pas plus souvent. */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  controlerEtAnnoncer();
  if (heureCharge === null || heureCharge === heureCle()) return;
  const g = jardinActif();
  if (g) lireMeteo(g).then(() => rendreMaintenant());
});
/* Un lancement hors ligne sert le document mis en cache : le contrôle est repris
   une fois la page en place, sans retarder l'affichage. */
setTimeout(controlerEtAnnoncer, 4000);

sur("appliquerMaj", "click", () => location.reload());
sur("ecarterMaj", "click", () => { majEcartee = true; $("bandeauMaj").hidden = true; });

sur("chercherMaj", "click", async () => {
  const bouton = $("chercherMaj"), note = $("noteMaj");
  note.hidden = false;
  note.textContent = "Recherche en cours.";
  bouton.disabled = true;
  try {
    if (await controlerMaj(true)) {
      note.textContent = "Nouvelle version trouvée, redémarrage.";
      setTimeout(() => location.reload(), 500);
      return;
    }
    note.textContent = "Cette copie est déjà la plus récente.";
  } catch {
    note.textContent = "Vérification impossible sans réseau.";
  }
  bouton.disabled = false;
});

/* ================== Écran 4 : jardin ================== */

function majJardinUI() {
  const connecte = Boolean(session);
  $("bloc-jardin").hidden = !connecte;
  const g = jardinActif();
  const c = g && g.climate_key ? climats[g.climate_key] : null;
  /* Sans compte il n'y a pas de jardin à nommer : le titre porte alors la seule
     action qui vaille, et le chevron ouvre la feuille du compte. */
  $("titreJardin").textContent = g && g.name ? g.name : (connecte ? "Mon jardin" : "Se connecter");
  $("btnJardin").setAttribute("aria-label", connecte
    ? "Le jardin : climat et commune" : "Se connecter");
  /* Le climat du jardin ne paraît plus que lorsqu'il manque : une marque ne
     signale que l'exception, et sa mention quotidienne n'apprenait rien. Il
     reste lisible et modifiable sur l'écran du jardin. */
  const puce = $("puceClimat");
  puce.textContent = "Choisir un climat";
  puce.classList.toggle("a-renseigner", !c);
  puce.hidden = !connecte || Boolean(c);

  const vc = $("valCommune");
  if (vc) vc.textContent = g && g.commune
    ? g.commune + (g.code_postal ? ", " + g.code_postal : "") : "non renseignée";

  const sj = $("selJardin");
  sj.innerHTML = jardins.map(j => `<option value="${j.id}">${esc(j.name)}</option>`).join("");
  if (g) sj.value = g.id;

  const sc = $("selClimat");
  sc.innerHTML = '<option value="">Non renseigné</option>'
    + Object.values(climats).sort((a, b) => a.position - b.position)
        .map(x => `<option value="${x.key}">${esc(x.label)}</option>`).join("");
  sc.value = g && g.climate_key ? g.climate_key : "";
  $("descClimat").textContent = c ? c.description : "";
  const ss = $("selSol");
  ss.innerHTML = '<option value="">Non renseigné</option>'
    + Object.keys(RESERVE_SOL).map(t =>
        `<option value="${t}">${esc(SOL_LIBELLE[t])}, ${RESERVE_SOL[t]} mm par mètre</option>`).join("");
  ss.value = g && RESERVE_SOL[g.sol_texture] ? g.sol_texture : "";
  $("aideSol").textContent = (g && RESERVE_SOL[g.sol_texture] ? "" : "Le calcul de l'eau le compte limoneux. ")
    + "La texture fixe la réserve d'eau du sol. Un espace ou une zone dont la terre "
    + "diffère, un carré rempli de terreau ou un pot, se règle dans ses réglages du lieu.";
  $("decalClimat").textContent = c && (c.shift_spring || c.shift_autumn)
    ? `Décalage appliqué au calendrier : ${demiEnTexte(c.shift_spring)} au premier semestre, ${demiEnTexte(c.shift_autumn)} au second.`
    : "";
  rendreEspaces();
}

function demiEnTexte(d) {
  if (d === 0) return "aucun";
  return (d > 0 ? "plus tard de " : "plus tôt de ")
    + Math.abs(d) + (Math.abs(d) > 1 ? " quinzaines" : " quinzaine");
}

/* Les plantes du jardin rattachées à un espace ou à l'une de ses zones, ou
   celles qui ne le sont à aucun quand la clé vaut "0". Rangées par nom, comme
   partout ailleurs. */
function parNom(ids) {
  return ids.map(id => plantes.find(p => p.id === id)).filter(Boolean)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

function plantesDeLEspace(cle) {
  return parNom([...sel]
    .filter(id => cle === "0" ? !espacesDe(id).length : racinesDe(id).includes(cle)));
}

// Les plantes placées sur ce lieu précis, sans descendre dans ses zones.
function plantesDuNoeud(cle) {
  return parNom([...sel].filter(id => espacesDe(id).includes(cle)));
}

// Les zones dépliées, retenues d'un rendu à l'autre.
const zonesOuvertes = new Set();
// Les réglages d'un lieu et les gestes d'une plante, dépliés à la demande.
const reglagesOuverts = new Set();
const lignesOuvertes = new Set();
let menuEspace = false;          // le panneau du bouton de coin
let modeEdition = false;         // les gestes sur chaque plante
let filtreMoment = null;         // la tâche retenue parmi les pastilles du moment
let modeZones = false;           // l'éditeur des zones : nom sur place, cases à cocher
const zonesCochees = new Set();  // les zones retenues pour une suppression groupée
const ajoutsOuverts = new Set(); // les champs d'ajout dépliés, par lieu
const VUE_ESPACE = "monjardin.vue-espace";
let vueEspace = "liste";
try { vueEspace = localStorage.getItem(VUE_ESPACE) === "mosaique" ? "mosaique" : "liste"; }
catch (e) { /* stockage indisponible */ }
const UNITES = ["kg", "g", "pièces", "bottes", "litres"];
const PHOTOS_PAR_ENTREE = 6;
const SUPPORT_NOM = { pleine_terre: "Pleine terre", contenant: "Contenant",
                      serre: "Serre", balcon: "Balcon" };
const EXPO_NOM = { soleil: "Soleil", soleil_mi_ombre: "Soleil et mi-ombre",
                   mi_ombre: "Mi-ombre", mi_ombre_ombre: "Mi-ombre et ombre", ombre: "Ombre" };
/* Ce qu'un lieu offre est un point sur cinq crans, ce qu'une plante demande
   est une plage : soleil et mi-ombre accepte tout ce qui va de l'un à
   l'autre. La confrontation n'a lieu que lorsque le lieu est renseigné. */
const EXPO_RANG = { soleil: 0, soleil_mi_ombre: 1, mi_ombre: 2, mi_ombre_ombre: 3, ombre: 4 };
const EXPO_PLAGE = { soleil: [0, 0], soleil_mi_ombre: [0, 2], mi_ombre: [2, 2],
                     mi_ombre_ombre: [2, 4], ombre: [4, 4] };

/* Deux niveaux dans le même panneau. Le premier pose une tuile par espace, plus
   celle des plantes non placées, qui existe toujours : sans elle, une plante
   ajoutée au jardin et rattachée à rien ne paraîtrait nulle part ici. Le second
   ouvre un espace et montre ses plantes avec leur quantité et leur note. */
function rendreEspaces() {
  const tuiles = $("tuilesEspaces");
  const detail = $("detailEspace");
  if (!tuiles || !detail) return;
  const niveau = $("niveauEspaces");
  const dansUnEspace = espaceOuvert !== null
    && (espaceOuvert === "0" || racines().some(z => z.id === espaceOuvert));
  if (!dansUnEspace) espaceOuvert = null;
  niveau.hidden = dansUnEspace;
  detail.hidden = !dansUnEspace;
  if (dansUnEspace) rendreDetailEspace(detail);
  else rendreTuilesEspaces(tuiles);
}

function rendreTuilesEspaces(z) {
  z.innerHTML = "";
  /* La tuile des plantes non placées ne paraît que lorsqu'il y en a : vide,
     elle n'ouvrait qu'un message disant que tout est rangé. */
  const cases = racines().map(zo => ({ cle: zo.id, nom: zo.name, couleur: zo.color }))
    .concat(plantesDeLEspace("0").length ? [{ cle: "0", nom: "Non placées", sansCouleur: true }] : []);
  cases.forEach(v => {
    const n = plantesDeLEspace(v.cle).length;
    const nz = v.cle === "0" ? 0 : zonesDe(v.cle).length;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tuile-espace" + (v.cle === "0" ? " tuile-hors" : "");
    b.dataset.espace = v.cle;
    b.innerHTML = (v.couleur ? `<i class="pastille" style="background:${v.couleur}"></i>` : "")
      + `<span class="tuile-nom">${esc(v.nom)}</span>`
      + `<span class="tuile-nb">${n}</span>`
      + `<span class="tuile-unite">${n > 1 ? "plantes" : "plante"}`
      + (nz ? `, ${nz} ${nz > 1 ? "zones" : "zone"}` : "") + `</span>`;
    b.addEventListener("click", () => {
      espaceOuvert = v.cle; saisieCarnet = null; filtreMoment = null;
      modeZones = false; zonesCochees.clear(); ajoutsOuverts.clear();
      rendreEspaces();
    });
    z.appendChild(b);
  });
  if (!racines().length) {
    const p = document.createElement("p");
    p.className = "vide";
    p.textContent = "Aucun espace. Ajoutez-en un pour découper ce jardin.";
    z.appendChild(p);
  }
  majAjoutEspace(false);
}

/* Le formulaire d'un nouvel espace et son aide ne restent ouverts que pour un
   jardin qui n'a encore aucun espace, ou quand le lien les a demandés. */
function majAjoutEspace(demande) {
  const vide = !racines().length;
  const ouvert = vide || demande;
  if ($("form-espace")) $("form-espace").hidden = !ouvert;
  if ($("ouvrirAjoutEspace")) $("ouvrirAjoutEspace").hidden = ouvert;
  const aide = document.querySelector(".aide-espaces");
  if (aide) aide.hidden = !vide;
}

/* ---------------------------------------------------------------------------
   L'écran d'un espace. Une bannière qui le nomme, ce qui s'y passe aujourd'hui,
   puis ses plantes en liste ou en mosaïque. Les réglages et les gestes rares
   attendent derrière le bouton de coin : on vient d'abord voir son jardin.
   --------------------------------------------------------------------------- */

async function chargerVignettes() {
  const ids = [...sel];
  if (!ids.length) { vignettes = new Map(); return; }
  const { data } = await avecReprise(() => db.from("vignettes_plante")
    .select("plant_id,organe,url").in("plant_id", ids));
  const m = new Map();
  (data || []).forEach(r => {
    if (!m.has(r.plant_id)) m.set(r.plant_id, {});
    m.get(r.plant_id)[r.organe] = r.url;
  });
  vignettes = m;
  if (espaceOuvert !== null) rendreEspaces();
}

// La plus récente de mes photographies portant sur cette plante.
function photoPerso(plantId) {
  for (const e of carnet) {
    if (e.plant_id !== plantId) continue;
    const ph = photosCarnet.get(e.id);
    if (ph && ph.length) return ph[0].chemin;
  }
  return null;
}

/* Ma photographie d'abord, la planche d'herbier ensuite, la photographie du
   fonds en dernier. L'écran montre mon jardin, pas celui des autres, et ne cède
   au fonds que faute de planche : cent vingt-cinq fiches n'en ont pas encore. */
function imagePlante(p) {
  const c = photoPerso(p.id);
  if (c) return { genre: "perso", chemin: c };
  if (aPlanche(p)) return { genre: "planche", slug: p.slug };
  const v = vignettes.get(p.id) || {};
  const ordre = ORGANE_TYPO[p.typo] || ORGANE_TYPO["Ornement"];
  const o = ordre.find(x => v[x]) || Object.keys(v)[0];
  return o ? { genre: "fonds", url: v[o] } : { genre: "vide" };
}

function imageHTML(p, classe) {
  const i = imagePlante(p);
  if (i.genre === "perso")
    return `<img class="${classe} im-perso" data-chemin="${esc(i.chemin)}" alt="" loading="lazy">`;
  if (i.genre === "planche" && classe === "im-t")
    return `<img class="${classe} im-planche" src="./planches/fiche/${esc(i.slug)}.webp" alt="" loading="lazy">`;
  if (i.genre === "planche")
    return `<span class="${classe} im-masque v-planche" data-pl="${esc(i.slug)}" aria-hidden="true"></span>`;
  if (i.genre === "fonds")
    return `<img class="${classe} im-fonds" src="${esc(i.url)}" alt="" loading="lazy">`;
  return `<span class="${classe} im-vide" aria-hidden="true"></span>`;
}

/* Ce qui se passe ici aujourd'hui, tiré du même calcul que l'écran du moment.
   Les trois tâches les plus nombreuses suffisent à donner une raison d'ouvrir
   l'écran un matin d'août. */
/* Une tâche se nomme par son verbe, comme sur l'écran du jour et sur l'année :
   les pastilles d'un espace disaient « fertilisation » là où le reste de
   l'application dit « Amender ». La floraison n'est pas un geste, elle se dit
   « en fleur ». */
function motDeLaTache(k) {
  if (k === "floraison") return "en fleur";
  return String(VERBE[k] || (phases[k] || {}).label || k).split(",")[0].trim().toLowerCase();
}
// La pastille d'un espace compte : « 7 à récolter », « 4 en fleur ».
const motCompte = k => (k === "floraison" ? "" : "à ") + motDeLaTache(k);

function momentDuLieu(cle) {
  const lot = plantesDeLEspace(cle);
  const par = [];
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k]) return;
    const n = lot.filter(p => actif(p, k) && !sourdineActive(p, k)).length;
    if (n) par.push({ k, n, nom: motDeLaTache(k), couleur: teinteK(k) });
  });
  return par.sort((a, b) => b.n - a.n).slice(0, 3);
}

/* Le filtre du moment ne change pas ce que le lieu contient, seulement ce qu'on
   en montre. Tous les comptes de l'écran passent par là, pour qu'aucun nombre
   n'annonce autre chose que ce qui est sous les yeux. */
function filtrerMoment(lot) {
  if (!filtreMoment) return lot;
  return lot.filter(p => actif(p, filtreMoment) && !sourdineActive(p, filtreMoment));
}

/* Sous une tâche retenue, toutes les plantes montrées portent la même : la
   pastille du haut la nomme une fois, les cartes n'ont pas à la redire. */
function momentDeLaPlante(p) {
  if (filtreMoment) return null;
  const k = ORDRE_MAINTENANT.find(x => phases[x] && actif(p, x) && !sourdineActive(p, x));
  return k ? { nom: motDeLaTache(k), couleur: teinteK(k) } : null;
}

/* Sous le nom d'une plante, la dernière chose que j'en ai notée. Rien plutôt
   qu'un remplissage quand le journal est muet. */
function sousLaPlante(p) {
  const e = carnet.find(x => x.plant_id === p.id);
  if (!e) return "";
  if (e.geste === "recolte" && e.quantite)
    return `${nombreFr(Number(e.quantite))} ${e.unite || ""} le ${jourEnClair(e.jour)}`.trim();
  return `${GESTE_NOM[e.geste] || "notée"} le ${jourEnClair(e.jour)}`;
}

/* La bannière porte ma photographie du lieu dès qu'il en existe une, sinon la
   planche d'herbier de la plante la plus présente. Jamais une photographie
   sourcée : elle prétendrait montrer mon jardin. */
function banniereDuLieu(zo, compte, total) {
  const b = document.createElement("div");
  b.className = "banniere-lieu";
  const sous = [zo.id].concat(zonesDe(zo.id).map(x => x.id));
  const entree = carnet.find(e => sous.includes(e.espace_id) && (photosCarnet.get(e.id) || []).length);
  const photo = entree ? photosCarnet.get(entree.id)[0].chemin : null;
  const avec = plantesDeLEspace(zo.id).filter(aPlanche);
  /* Trois mesures suffisent sous le nom : le nombre, la surface, les litres.
     L'exposition et le reste attendent derrière le bouton de coin. Sous une
     tâche retenue, le nombre dit ce qui est montré et sur combien : c'est la
     seule façon que le compte du haut et ceux des sections s'accordent. */
  const mesure = [compte + (compte > 1 ? " plantes" : " plante")
    + (total != null && total !== compte ? ` sur ${total}` : ""),
    zo.surface_m2 ? nombreFr(Number(zo.surface_m2)) + " m²" : "",
    litresDuJour(zo) ? nombreFr(litresDuJour(zo)) + " L par jour" : ""]
    .filter(Boolean).join(", ");
  b.innerHTML = (photo ? `<img class="bl-photo" data-chemin="${esc(photo)}" alt="">`
      : avec.length ? `<span class="bl-planche v-planche" data-pl="${esc(avec[0].slug)}" aria-hidden="true"></span>` : "")
    + `<button type="button" class="bl-rond bl-g" id="retourEspace" aria-label="Revenir aux espaces">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>`
    + `<button type="button" class="bl-rond bl-d${rotationBloquee(zo.id) ? " bl-pastille" : ""}"`
    + ` id="menuEspace" aria-label="Réglages de l'espace${rotationBloquee(zo.id)
        ? ", une famille attend son tour de rotation" : ""}"`
    + ` aria-expanded="${menuEspace}"><svg viewBox="0 0 24 24" aria-hidden="true">`
    + `<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>`
    + `</svg></button>`
    + `<div class="bl-texte"><h2 class="titre-detail">${esc(zo.name)}</h2>`
    + `<p class="bl-mesure">${esc(mesure)}</p></div>`;
  b.querySelector("#retourEspace").addEventListener("click", () => {
    espaceOuvert = null; saisieCarnet = null; menuEspace = false; modeEdition = false;
    filtreMoment = null; modeZones = false; zonesCochees.clear(); ajoutsOuverts.clear();
    rendreEspaces();
  });
  b.querySelector("#menuEspace").addEventListener("click", () => {
    menuEspace = !menuEspace; rendreEspaces();
  });
  return b;
}

function menuDuLieu(zo) {
  const d = document.createElement("div");
  d.className = "menu-lieu";
  const zones = zonesDe(zo.id);
  d.innerHTML = `<div class="ml-gestes">`
    + `<button type="button" class="lien" data-act="editer">`
    + (modeEdition ? "Terminer" : "Modifier les plantes") + `</button>`
    + (zones.length ? `<button type="button" class="lien" data-act="zones">`
      + (modeZones ? "Terminer" : "Modifier les zones") + `</button>` : "")
    + `<button type="button" class="lien" data-act="renommer">Renommer</button>`
    + `<button type="button" class="lien" data-act="supprimer">Supprimer</button></div>`;
  d.querySelector('[data-act="editer"]').addEventListener("click", () => {
    modeEdition = !modeEdition; menuEspace = false; rendreEspaces();
  });
  const bz = d.querySelector('[data-act="zones"]');
  if (bz) bz.addEventListener("click", () => {
    modeZones = !modeZones;
    if (!modeZones) zonesCochees.clear();
    menuEspace = false;
    rendreEspaces();
  });
  d.querySelector('[data-act="renommer"]').addEventListener("click", () => renommerEspace(zo));
  d.querySelector('[data-act="supprimer"]').addEventListener("click", () => supprimerEspace(zo));
  /* La rotation tenait six lignes en tête d'écran, en permanence, alors qu'elle
     ne sert qu'au moment de poser une plante, où l'avertissement se déclenche
     de lui-même. Elle est rangée dans les réglages du lieu, et une pastille sur
     le bouton de coin dit qu'une famille est encore bloquée. */
  d.appendChild(attributsDuLieu(zo));
  return d;
}

/* Vrai quand une famille cultivée sur ce lieu n'est pas encore libre de
   revenir. C'est la seule chose que la rotation ait à dire sans qu'on la
   demande. */
function rotationBloquee(cle) {
  const lieu = noeud(cle);
  if (!lieu || lieu.rotation_muette) return false;
  return rotationDuLieu(cle).some(x => x.attendre);
}

function ligneDuMoment(cle) {
  const d = document.createElement("div");
  d.className = "moment-lieu";
  const lot = momentDuLieu(cle);
  /* Les pastilles annonçaient ce qui se joue sans donner à le voir : elles
     retiennent maintenant leur tâche, et un second appui la relâche. */
  d.innerHTML = `<div class="ml-chips">`
    + lot.map(x => `<button type="button" class="ml-c${filtreMoment === x.k ? " on" : ""}"`
      + ` data-tache="${x.k}" aria-pressed="${filtreMoment === x.k}">`
      + `<i style="background:${x.couleur}"></i>`
      + `<b>${x.n}</b> ${esc(motCompte(x.k))}</button>`).join("")
    + `</div><span class="ml-vue" role="group" aria-label="Affichage des plantes">`
    + boutonVue("liste", `<path d="M4 7h16M4 12h16M4 17h16"/>`)
    + boutonVue("mosaique", `<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/>`
      + `<rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>`)
    + `</span>`;
  d.querySelectorAll(".ml-b").forEach(b => b.addEventListener("click", () => {
    vueEspace = b.dataset.vue;
    try { localStorage.setItem(VUE_ESPACE, vueEspace); } catch (e) { /* sans effet */ }
    rendreEspaces();
  }));
  d.querySelectorAll(".ml-c").forEach(b => b.addEventListener("click", () => {
    filtreMoment = filtreMoment === b.dataset.tache ? null : b.dataset.tache;
    rendreEspaces();
  }));
  return d;
}

/* L'éditeur des zones dit ce qu'il permet et ce qu'il a retenu. Il tient une
   seule ligne, au-dessus des zones qu'il modifie. */
function barreZones(zo) {
  const b = document.createElement("div");
  b.className = "barre-zones";
  const n = zonesCochees.size;
  b.innerHTML = `<span class="bz-t">${n
    ? `${n} ${n > 1 ? "zones retenues" : "zone retenue"}`
    : "Corrigez les noms sur place, cochez pour supprimer"}</span>`
    + (n ? `<button type="button" class="lien bz-suppr">Supprimer</button>` : "")
    + `<button type="button" class="lien bz-fin">Terminer</button>`;
  const s = b.querySelector(".bz-suppr");
  if (s) s.addEventListener("click", () => supprimerZonesRetenues(zo));
  b.querySelector(".bz-fin").addEventListener("click", () => {
    modeZones = false; zonesCochees.clear(); rendreEspaces();
  });
  return b;
}

function boutonVue(vue, dessin) {
  return `<button type="button" class="ml-b${vueEspace === vue ? " on" : ""}" data-vue="${vue}"`
    + ` aria-pressed="${vueEspace === vue}" aria-label="${vue === "liste" ? "Liste" : "Mosaïque"}">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true">${dessin}</svg></button>`;
}

function rendreDetailEspace(z) {
  const zo = racines().find(x => x.id === espaceOuvert) || null;
  const membres = plantesDeLEspace(espaceOuvert);
  z.innerHTML = "";
  if (!zo) {
    filtreMoment = null;
    z.appendChild(teteDuLieu(null, "Non placées", membres.length));
    z.appendChild(corpsDuLieu("0"));
    poserPlanches(z);
    return;
  }
  /* Une tâche retenue qui n'est plus au tableau se relâche d'elle-même : le
     filtre ne doit pas survivre à ce qui l'a fait naître. */
  if (filtreMoment && !momentDuLieu(zo.id).some(x => x.k === filtreMoment)) filtreMoment = null;
  z.appendChild(banniereDuLieu(zo, filtrerMoment(membres).length, membres.length));
  z.appendChild(banniereCompacte(zo));
  if (menuEspace) z.appendChild(menuDuLieu(zo));
  z.appendChild(ligneDuMoment(zo.id));
  const zones = zonesDe(zo.id);
  if (modeZones && zones.length) z.appendChild(barreZones(zo));
  /* Les zones nommées viennent d'abord, le reste ensuite : découper un espace,
     c'est ranger, et ce qui n'est pas encore rangé se lit à la fin. Le
     formulaire d'ajout suit, il pose justement une plante hors zone. */
  zones.forEach(x => z.appendChild(sectionZone(x)));
  /* Un espace entièrement rangé n'a rien à dire de ses plantes sans zone : la
     section entière s'efface plutôt que d'occuper cent cinquante points à
     conseiller de chercher au catalogue ce qui ne manque pas. */
  const horsZone = filtrerMoment(plantesDuNoeud(zo.id));
  if (!zones.length || horsZone.length) {
    if (zones.length) {
      /* Les plantes sans zone forment un bloc comme les zones, dont le titre
         fait la tête : il était posé à part, au-dessus d'une carte blanche. */
      const bloc = document.createElement("section");
      bloc.className = "bloc-zone";
      const t = document.createElement("h2");
      t.className = "tete-section-zone bloc-titre";
      t.innerHTML = `<b>Sans zone</b><span class="nb">${horsZone.length}</span>`;
      bloc.appendChild(t);
      bloc.appendChild(corpsDuLieu(zo.id));
      z.appendChild(bloc);
    } else {
      z.appendChild(corpsDuLieu(zo.id));
    }
  }
  z.appendChild(piedDuLieu(zo));
  z.appendChild(sectionCarnet(zo));
  poserPlanches(z);
  poserPhotosCarnet(z);
  veillerBanniere(z);
}

/* Deux gestes occasionnels tenaient deux cents points en permanence au pied de
   l'écran. Ils se replient derrière leur nom et ne s'ouvrent qu'appelés. */
function piedDuLieu(zo) {
  const d = document.createElement("div");
  d.className = "pied-lieu";
  const ouvertPlante = ajoutsOuverts.has(zo.id);
  const ouvertZone = ajoutsOuverts.has("z:" + zo.id);
  const l = document.createElement("div");
  l.className = "pl-liens";
  l.innerHTML = `<button type="button" class="lien" data-ouvre="${esc(zo.id)}">`
    + `${ouvertPlante ? "Fermer" : "Ajouter une plante"}</button>`
    + `<button type="button" class="lien" data-ouvre="z:${esc(zo.id)}">`
    + `${ouvertZone ? "Fermer" : "Ajouter une zone"}</button>`;
  l.querySelectorAll("[data-ouvre]").forEach(b => b.addEventListener("click", () => {
    const c = b.dataset.ouvre;
    if (ajoutsOuverts.has(c)) ajoutsOuverts.delete(c); else ajoutsOuverts.add(c);
    rendreEspaces();
  }));
  d.appendChild(l);
  if (ouvertPlante) d.appendChild(ajoutAuLieu(zo.id));
  if (ouvertZone) d.appendChild(formulaireZone(zo));
  return d;
}

/* Le retour et le nom du lieu vivaient dans la bannière, qui défile : sur un
   espace à six zones, revenir aux tuiles demandait de remonter toute la page.
   Une barre compacte prend le relais dès que la bannière quitte l'écran. */
function banniereCompacte(zo) {
  const b = document.createElement("div");
  b.className = "banniere-compacte";
  b.innerHTML = `<button type="button" class="bc-retour" aria-label="Revenir aux espaces">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>`
    + `<b class="bc-nom">${esc(zo.name)}</b>`;
  b.querySelector(".bc-retour").addEventListener("click", () => {
    espaceOuvert = null; saisieCarnet = null; menuEspace = false;
    modeEdition = false; modeZones = false; filtreMoment = null;
    rendreEspaces();
  });
  return b;
}

let obsBanniere = null;
function veillerBanniere(z) {
  if (obsBanniere) { obsBanniere.disconnect(); obsBanniere = null; }
  const grande = z.querySelector(".banniere-lieu");
  const petite = z.querySelector(".banniere-compacte");
  if (!grande || !petite || !window.IntersectionObserver) return;
  obsBanniere = new IntersectionObserver(
    ([e]) => petite.classList.toggle("visible", !e.isIntersecting),
    { threshold: 0 });
  obsBanniere.observe(grande);
}

// L'entête sans bannière, pour les plantes qui ne sont placées nulle part.
function teteDuLieu(zo, nom, compte) {
  const tete = document.createElement("div");
  tete.className = "tete-detail";
  tete.innerHTML = `<button class="retour-espace" id="retourEspace" type="button" aria-label="Revenir aux espaces">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>`
    + `<b class="titre-detail">${esc(nom)}</b><span class="nb">${compte}</span>`;
  tete.querySelector("#retourEspace").addEventListener("click",
    () => { espaceOuvert = null; saisieCarnet = null; rendreEspaces(); });
  return tete;
}

/* Une zone se déplie sous son espace, sans troisième niveau de navigation. */
function sectionZone(x) {
  const d = document.createElement("details");
  d.className = "zone-espace" + (modeZones ? " zone-editee" : "");
  d.dataset.zone = x.id;
  const lot = filtrerMoment(plantesDuNoeud(x.id));
  const n = lot.length;
  /* Sous une tâche retenue, une zone qui en porte s'ouvre d'elle-même : repliée,
     elle n'aurait montré qu'un nombre changé. */
  d.open = filtreMoment ? n > 0 : zonesOuvertes.has(x.id);
  const s = document.createElement("summary");
  const mesure = mesureDuLieu(x);
  /* Deux lignes dans le sommaire : l'identité de la zone, puis ce qu'elle
     contient et ce qu'elle mesure. Six zones repliées ne montraient rien du
     jardin, la bande de vignettes le rend lisible sans déplier. */
  s.innerHTML = `<span class="zo-haut">`
    + (modeZones ? `<input type="checkbox" class="zo-coche"`
        + `${zonesCochees.has(x.id) ? " checked" : ""}`
        + ` aria-label="Retenir ${esc(x.name)}">` : "")
    + (modeZones
        ? `<input class="zo-nom" type="text" maxlength="40" value="${esc(x.name)}"`
          + ` aria-label="Nom de la zone">`
        : `<b class="zone-nom">${esc(x.name)}</b>`)
    + `<span class="nb">${n}</span></span>`
    + `<span class="zo-bas">`
    + `<span class="zo-vign">`
    + lot.slice(0, 5).map(p => imageHTML(p, "zo-v")).join("")
    + (n > 5 ? `<span class="zo-plus">+${n - 5}</span>` : "")
    + `</span>`
    /* Une zone sans surface laissait un vide à droite et ne pesait rien dans
       les litres de l'espace : le trou devient l'appel à la renseigner. */
    + (mesure ? `<span class="zone-mesure">${esc(mesure)}</span>`
              : `<button type="button" class="zo-surface">surface à préciser</button>`)
    + `</span>`;
  d.appendChild(s);
  /* Un appui sur une case, sur le nom ou sur l'appel de surface ne doit pas
     déplier la section. Le dépliage est le comportement d'activation du
     sommaire lui-même : il se retire à la capture, avant que l'événement
     n'atteigne la commande. */
  s.addEventListener("click", ev => {
    const coche = ev.target.closest(".zo-coche");
    const nom = ev.target.closest(".zo-nom");
    const surface = ev.target.closest(".zo-surface");
    // Rien de tout cela : le sommaire bascule comme il le fait de lui-même.
    if (!coche && !nom && !surface) return;
    ev.preventDefault();
    if (nom) return;
    if (coche) {
      if (zonesCochees.has(x.id)) zonesCochees.delete(x.id); else zonesCochees.add(x.id);
      rendreEspaces();
      return;
    }
    zonesOuvertes.add(x.id);
    reglagesOuverts.add(x.id);
    rendreEspaces();
  });
  const champ = s.querySelector(".zo-nom");
  if (champ) champ.addEventListener("change", () => renommerZoneSurPlace(x, champ.value));
  d.addEventListener("toggle", () => {
    if (filtreMoment) return;
    d.open ? zonesOuvertes.add(x.id) : zonesOuvertes.delete(x.id);
  });
  const corps = document.createElement("div");
  corps.className = "corps-zone";
  corps.appendChild(attributsDuLieu(x));
  corps.appendChild(ajoutAuLieu(x.id));
  corps.appendChild(corpsDuLieu(x.id));
  d.appendChild(corps);
  return d;
}

/* Les plantes du lieu, groupées par typologie et rendues selon la vue choisie.
   Un potager mêle un figuier, un rosier et des courgettes : les séparer rend la
   liste lisible d'un coup d'oeil. */
function corpsDuLieu(cle) {
  const corps = document.createElement("div");
  corps.className = "corps-espace";
  const membres = filtrerMoment(cle === "0" ? plantesDeLEspace("0") : plantesDuNoeud(cle));
  if (!membres.length) {
    corps.innerHTML = filtreMoment
      ? `<p class="vide">Rien ${esc(motCompte(filtreMoment))} ici en ce moment.</p>`
      : cle === "0"
      ? '<p class="vide">Toutes vos plantes sont placées dans un espace.</p>'
      : '<p class="vide">Aucune plante ici. Cherchez-la dans le catalogue, plus bas.</p>';
    return corps;
  }
  const mosaique = vueEspace === "mosaique" && cle !== "0";
  /* Dans un espace découpé en zones, la zone est le seul niveau de lecture :
     les titres de type repris sous « Sans zone » en faisaient un second, comme
     les catégories des listes de plantes avant le 13 octobre. Un espace sans
     zone garde ses titres de type, qui sont alors son seul niveau. */
  if (cle !== "0" && zonesDe(racineDe(cle)).length) {
    const b = document.createElement("div");
    b.className = mosaique ? "mosaique-lieu" : "rangs-lieu";
    membres.slice().sort((x, y) => x.nom.localeCompare(y.nom, "fr"))
      .forEach(p => b.appendChild(mosaique ? tuileDuLieu(p, cle) : ligneDuLieu(p, cle)));
    corps.appendChild(b);
    return corps;
  }
  ORDRE_TYPO.forEach(typo => {
    const lot = membres.filter(p => p.typo === typo);
    if (!lot.length) return;
    // Chaque type est un bloc dont le nom fait la tête, comme dans « Mes plantes ».
    const bloc = document.createElement("section");
    bloc.className = "bloc-zone";
    const t = document.createElement("div");
    t.className = "groupe-typo bloc-titre";
    t.innerHTML = `<i style="background:${COUL_TYPO[typo]}"></i><h3>${esc(typo)}</h3>`
      + `<span class="nb">${lot.length}</span>`;
    bloc.appendChild(t);
    const b = document.createElement("div");
    b.className = mosaique ? "mosaique-lieu" : "rangs-lieu";
    lot.forEach(p => b.appendChild(mosaique ? tuileDuLieu(p, cle) : ligneDuLieu(p, cle)));
    bloc.appendChild(b);
    corps.appendChild(bloc);
  });
  const reste = membres.filter(p => ORDRE_TYPO.indexOf(p.typo) === -1);
  if (reste.length) {
    const b = document.createElement("div");
    b.className = mosaique ? "mosaique-lieu" : "rangs-lieu";
    reste.forEach(p => b.appendChild(mosaique ? tuileDuLieu(p, cle) : ligneDuLieu(p, cle)));
    corps.appendChild(b);
  }
  return corps;
}

/* L'exposition du lieu, confrontée à ce que la plante demande. Rien n'est dit
   quand elles s'accordent, ni quand le lieu ne déclare pas la sienne. */
function ecartExposition(p, cle) {
  const lieu = noeud(cle);
  const e = lieu ? attribut(lieu, "exposition") : null;
  const plage = EXPO_PLAGE[p.expo];
  if (!e || !plage) return "";
  const r = EXPO_RANG[e];
  if (r >= plage[0] && r <= plage[1]) return "";
  return `${(EXPO_NOM[e] || "").toLowerCase()} ici, `
    + `${p.nom} demande ${(EXPO_NOM[p.expo] || "").toLowerCase()}`;
}

/* La tuile porte deux gestes et non un seul : ouvrir la fiche, et corriger le
   nombre de pieds comme la rangée le permet. Un champ ne pouvant pas tenir dans
   un bouton, la tuile est une boîte, le bouton couvre l'image et le nom, et le
   nombre se pose par-dessus, dans le bandeau déjà en place. */
function tuileDuLieu(p, cle) {
  const r = cle === "0" ? null : ((aff.get(p.id) || []).find(x => x.espace_id === cle) || {});
  const m = momentDeLaPlante(p);
  const t = document.createElement("div");
  t.className = "tuile-plante";
  t.dataset.plante = p.id;
  t.innerHTML = `<button type="button" class="tpl-ouvre">` + imageHTML(p, "im-t")
    + `<span class="tpl-nom">${esc(p.nom)}</span></button>`
    + `<span class="tpl-haut">`
    + (r ? `<input class="tpl-q" type="number" min="0" max="32000" step="1"`
         + ` value="${r.quantity == null ? "" : r.quantity}" placeholder="qté"`
         + ` aria-label="Nombre de pieds de ${esc(p.nom)}">` : "")
    + (m ? `<i class="tpl-moment" style="background:${m.couleur}">${esc(m.nom)}</i>` : "")
    + `</span>`;
  t.querySelector(".tpl-ouvre").addEventListener("click", () => ouvrirFeuille(p, "jardin"));
  const q = t.querySelector("input.tpl-q");
  if (q) q.addEventListener("change", ev => majAffectation(p.id, cle, ev.target.value));
  return t;
}

function ligneDuLieu(p, cle) {
  const r = cle === "0" ? null : ((aff.get(p.id) || []).find(x => x.espace_id === cle) || {});
  const gene = r ? ecartExposition(p, cle) : "";
  const m = momentDeLaPlante(p);
  const sous = gene || sousLaPlante(p);
  const l = document.createElement("div");
  l.className = "ligne-espace" + (modeEdition ? " ligne-editee" : "");
  l.dataset.plante = p.id;
  l.innerHTML = `<button type="button" class="nom-espace">` + imageHTML(p, "im-r")
    + `<span class="ne-t"><span class="ne-n">${esc(p.nom)}</span>`
    + (sous ? `<span class="ne-s${gene ? " mal-expose" : ""}">${esc(sous)}</span>` : "")
    + `</span></button>`
    + (r ? (m ? `<span class="lp-m" style="background:${m.couleur}">${esc(m.nom)}</span>` : "")
         /* Le nombre de pieds se corrige là où il se lit. Il n'attend plus le
            mode d'édition : c'est la valeur qui bouge le plus souvent, un semis
            complété ou un plant perdu, et elle tenait déjà cette place. */
         + `<input class="qte-l" type="number" min="0" max="32000" step="1"`
         + ` value="${r.quantity == null ? "" : r.quantity}" placeholder="qté"`
         + ` aria-label="Nombre de pieds de ${esc(p.nom)}">`
         + `<span class="chev-l" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></span>`
         : `<span class="hors-espace">à placer depuis sa fiche</span>`);
  l.querySelector(".nom-espace").addEventListener("click", () => ouvrirFeuille(p, "jardin"));
  const q = l.querySelector("input.qte-l");
  if (q) q.addEventListener("change", ev => majAffectation(p.id, cle, ev.target.value));
  if (r && modeEdition) l.appendChild(outilsDeLaLigne(p, cle, r));
  return l;
}

function outilsDeLaLigne(p, cle, r) {
  const o = document.createElement("div");
  o.className = "outils-ligne";
  /* La quantité se saisit désormais sur la rangée elle-même, à toute heure. Le
     choix de zone reste ici, où l'on réorganise plusieurs plantes à la suite
     sans quitter l'écran, et se nomme maintenant qu'il y est seul de son
     espèce. La fiche porte le même choix pour une plante prise à part. */
  const zones = choixZoneHTML(cle);
  o.innerHTML = (zones ? `<label class="ol-z"><span>Zone</span>${zones}</label>` : "")
    + `<button type="button" class="lien noter-lieu">Noter</button>`
    + `<button type="button" class="lien retirer-lieu">Retirer</button>`;
  const sz = o.querySelector(".sel-zone");
  if (sz) sz.addEventListener("change", () => deplacer(p.id, cle, sz.value));
  /* Noter ouvre le journal du lieu, le formulaire déjà rempli de la plante :
     c'est le chemin le plus court entre voir une plante et écrire dessus. */
  o.querySelector(".noter-lieu").addEventListener("click", () => {
    saisieCarnet = { espace_id: cle, plant_id: p.id };
    carnetOuvert = true;
    rendreEspaces();
    const f = $("formEntree");
    if (f) f.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  o.querySelector(".retirer-lieu").addEventListener("click", async () => {
    if (!await retirerDe(p.id, cle)) return;
    construireChips(); rendreTout();
  });
  return o;
}

/* La zone se change sur la ligne de la plante, là où l'on voit déjà sa
   quantité : c'est le seul endroit où les zones de l'espace sont sous les
   yeux. La liste ne paraît pas tant qu'aucune zone n'existe. */
function choixZoneHTML(cle) {
  const souche = racineDe(cle);
  const zones = zonesDe(souche);
  if (!zones.length) return "";
  const opts = [{ id: souche, nom: "Sans zone" }]
    .concat(zones.map(x => ({ id: x.id, nom: x.name })))
    .map(o => `<option value="${o.id}"${o.id === cle ? " selected" : ""}>${esc(o.nom)}</option>`)
    .join("");
  return `<select class="sel-zone" aria-label="Zone">${opts}</select>`;
}

/* Un attribut non renseigné sur une zone est celui de son espace, et la
   texture du sol d'un espace est celle du jardin : l'option vide le dit
   plutôt que de laisser croire à une absence. */
function libelleHerite(zo, cle, noms) {
  const p = zo.parent_id ? noeud(zo.parent_id) : null;
  const v = p ? attribut(p, cle)
    : (cle === "sol_texture" ? ((jardinActif() || {}).sol_texture || null) : null);
  return v ? `comme ${p ? "l'espace" : "le jardin"}, ${(noms[v] || v).toLowerCase()}` : "non précisé";
}

function selectAttribut(zo, cle, noms, etiquette) {
  const val = zo[cle] || "";
  const opts = [`<option value=""${val ? "" : " selected"}>${esc(libelleHerite(zo, cle, noms))}</option>`]
    .concat(Object.keys(noms).map(k =>
      `<option value="${k}"${k === val ? " selected" : ""}>${esc(noms[k])}</option>`)).join("");
  return `<select class="att" data-att="${cle}" aria-label="${esc(etiquette)}">${opts}</select>`;
}

/* Les quatre réglages d'un lieu se replient sous ce qu'ils produisent : la
   surface, les litres du jour, la part prise par les zones. */
function attributsDuLieu(zo) {
  const d = document.createElement("details");
  d.className = "reglages-lieu";
  d.open = reglagesOuverts.has(zo.id);
  d.addEventListener("toggle", () =>
    d.open ? reglagesOuverts.add(zo.id) : reglagesOuverts.delete(zo.id));
  const mesure = mesureDuLieu(zo);
  const s = document.createElement("summary");
  /* L'entête d'une zone porte déjà sa mesure : la répéter ici ne dirait rien.
     Une famille qui n'est pas encore libre de revenir se dit par une pastille,
     le panneau de rotation étant rangé dans ce bloc et fermé la plupart du
     temps. */
  s.innerHTML = `<span class="rl-resume">${esc(!mesure ? "Préciser la surface et l'exposition"
    : zo.parent_id ? "Réglages du lieu" : mesure)}</span>`
    + (rotationBloquee(zo.id) ? `<span class="rl-attend" aria-label="Une famille attend son`
      + ` tour de rotation"></span>` : "");
  d.appendChild(s);
  const corps = document.createElement("div");
  corps.className = "attributs-lieu";
  corps.innerHTML = `<label class="att-l"><span class="att-e">Surface</span>`
    + `<input class="att att-surface" type="number" min="0" step="0.5" inputmode="decimal"`
    + ` value="${zo.surface_m2 ?? ""}" aria-label="Surface en mètres carrés"><span class="att-u">m²</span></label>`
    + selectAttribut(zo, "support", SUPPORT_NOM, "Support")
    + selectAttribut(zo, "exposition", EXPO_NOM, "Exposition")
    + selectAttribut(zo, "sol_texture", SOL_LIBELLE, "Sol");
  corps.querySelectorAll("select.att").forEach(x =>
    x.addEventListener("change", () => majLieu(zo, { [x.dataset.att]: x.value || null })));
  const su = corps.querySelector(".att-surface");
  su.addEventListener("change", () => {
    const v = su.value.trim() === "" ? null : Number(su.value.replace(",", "."));
    majLieu(zo, { surface_m2: v && v > 0 ? v : null });
  });
  d.appendChild(corps);
  /* La rotation est un réglage du lieu : elle vit dans ce bloc, replié comme
     lui, et non dans le fil de lecture des plantes. */
  const rot = panneauRotation(zo);
  if (rot) d.appendChild(rot);
  return d;
}

/* La surface transforme le besoin du catalogue, exprimé en litres par jour et
   par mètre carré, en litres à porter. Les plantes sans calcul ne comptent
   pas. La surface ne s'hérite pas : elle s'additionne. */
/* Un espace découpé en zones ne s'arrose pas sur toute son emprise : ses litres
   sont la somme de ceux de ses zones. La surface déclarée d'un tel espace est
   celle du terrain, quatre cents mètres carrés pour six carrés de trois, et la
   multiplier par le besoin moyen des plantes annonçait mille huit cents litres
   par jour pour quatorze pieds. Les plantes posées hors zone n'ont pas de
   surface propre : elles ne sont pas comptées, et la zone sans surface le dit
   sur sa ligne. */
function litresDuJour(zo) {
  if (!zo.parent_id) {
    const zones = zonesDe(zo.id);
    if (zones.length) {
      const somme = zones.reduce((a, z) => a + (litresDuJour(z) || 0), 0);
      return somme || null;
    }
  }
  const s = Number(zo.surface_m2 || 0);
  if (!s) return null;
  const ids = (zo.parent_id ? plantesDuNoeud(zo.id) : plantesDeLEspace(zo.id)).map(p => p.id);
  const vals = (eauJour || []).filter(r => ids.includes(r.plant_id))
    .map(r => Number(r.litres_jour_m2)).filter(v => v > 0);
  if (!vals.length) return null;
  return s * vals.reduce((a, b) => a + b, 0) / vals.length;
}

function mesureDuLieu(zo) {
  const bouts = [];
  if (zo.surface_m2) bouts.push(nombreFr(Number(zo.surface_m2)) + " m²");
  const l = litresDuJour(zo);
  if (l) bouts.push(nombreFr(l) + " L par jour");
  if (!zo.parent_id) {
    const somme = zonesDe(zo.id).reduce((a, x) => a + Number(x.surface_m2 || 0), 0);
    if (somme) bouts.push(nombreFr(somme) + " m² en zones");
  }
  return bouts.join(", ");
}

async function majLieu(zo, champs) {
  const { error } = await db.from("espaces").update(champs).eq("id", zo.id);
  if (error) { info("Enregistrement refusé : " + error.message, true); return; }
  Object.assign(zo, champs);
  info("");
  rendreEspaces();
}

/* Chercher au catalogue depuis le lieu fait les deux gestes d'un coup : la
   plante entre au jardin si elle n'y est pas, et elle se place ici. */
function ajoutAuLieu(cle) {
  const d = document.createElement("div");
  d.className = "ajout-plante";
  d.innerHTML = `<input class="rech-lieu" type="search" placeholder="Ajouter une plante"`
    + ` aria-label="Chercher une plante au catalogue"><div class="props-lieu" hidden></div>`;
  const ch = d.querySelector(".rech-lieu");
  const liste = d.querySelector(".props-lieu");
  ch.addEventListener("input", () => {
    const q = ch.value.trim().toLowerCase();
    liste.innerHTML = "";
    liste.hidden = q.length < 2;
    if (q.length < 2) return;
    const deja = plantesDuNoeud(cle).map(p => p.id);
    const lot = plantes.filter(p => !deja.includes(p.id)
      && (p.nom.toLowerCase().includes(q) || p.latin.toLowerCase().includes(q))).slice(0, 8);
    if (!lot.length) { liste.innerHTML = '<p class="vide">Aucune plante de ce nom.</p>'; return; }
    lot.forEach(p => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "prop-lieu"; b.dataset.plante = p.id;
      b.innerHTML = vignetteOuVide(p, "v-pl-s") + `<span class="prop-nom">${esc(p.nom)}</span>`
        + (sel.has(p.id) ? "" : `<span class="prop-neuf">entre au jardin</span>`);
      b.addEventListener("click", () => {
        ch.value = ""; liste.hidden = true; liste.innerHTML = "";
        ajouterAuLieu(p.id, cle);
      });
      liste.appendChild(b);
    });
    poserPlanches(liste);
  });
  return d;
}

async function ajouterAuLieu(plantId, cle) {
  if (!session || !jardinId) { info("Connectez-vous pour enregistrer votre jardin."); return; }
  if (!sel.has(plantId)) {
    const { error } = await db.from("garden_plants").insert({ garden_id: jardinId, plant_id: plantId });
    if (error) { info("Plante non ajoutée : " + error.message, true); return; }
    sel.add(plantId);
    majCompte();
    chargerVignettes();
  }
  if (!await placerSur(plantId, cle, true)) return;
  construireChips(); rendreTout();
}

/* ================== Rotation des cultures ==================
   Le délai de retour d'une famille sur la même planche, en années. Les familles
   absentes n'ont pas de règle établie : leur passage est noté, sans alerte. */
const RETOUR_FAMILLE = { Brassicaceae: 4, Amaryllidaceae: 4, Solanaceae: 4,
                         Apiaceae: 3, Cucurbitaceae: 3, Fabaceae: 3, Amaranthaceae: 3,
                         Asteraceae: 2, Poaceae: 2, Polygonaceae: 2 };
const FAMILLE_FR = { Brassicaceae: "Brassicacées", Amaryllidaceae: "Amaryllidacées",
                     Solanaceae: "Solanacées", Apiaceae: "Apiacées",
                     Cucurbitaceae: "Cucurbitacées", Fabaceae: "Fabacées",
                     Amaranthaceae: "Amaranthacées", Asteraceae: "Astéracées",
                     Poaceae: "Poacées", Polygonaceae: "Polygonacées" };

function nomFamille(f) { return FAMILLE_FR[f] || f; }

function listeEtAnnees(a) {
  return a.length < 2 ? String(a[0] || "")
    : a.slice(0, -1).join(", ") + " et " + a[a.length - 1];
}

async function chargerCultures() {
  const { data } = await avecReprise(() => db.from("cultures")
    .select("*").eq("garden_id", jardinId));
  cultures = data || [];
}

function rotationDuLieu(cle) {
  const par = new Map();
  cultures.filter(c => c.espace_id === cle).forEach(c => {
    if (!par.has(c.famille)) par.set(c.famille, []);
    par.get(c.famille).push(c);
  });
  const cette = new Date().getFullYear();
  return [...par.entries()].map(([famille, lignes]) => {
    const annees = [...new Set(lignes.map(l => l.annee))].sort();
    const delai = RETOUR_FAMILLE[famille] || 0;
    const libre = delai ? Math.max(...annees) + delai : 0;
    return { famille, lignes, annees, delai, libre, attendre: libre > cette };
  }).sort((a, b) => nomFamille(a.famille).localeCompare(nomFamille(b.famille), "fr"));
}

/* L'avertissement au moment où il sert : juste avant de poser la plante. Il
   n'arrête rien, il rappelle ce que la planche a déjà porté. */
function alerteRotation(p, cle) {
  const lieu = noeud(cle);
  if (!lieu || lieu.rotation_muette || !p.annuelle) return "";
  const delai = RETOUR_FAMILLE[p.famille];
  if (!delai) return "";
  const annees = [...new Set(cultures
    .filter(c => c.espace_id === cle && c.famille === p.famille).map(c => c.annee))].sort();
  if (!annees.length) return "";
  const libre = Math.max(...annees) + delai;
  if (new Date().getFullYear() >= libre) return "";
  return `Des ${nomFamille(p.famille).toLowerCase()} ont poussé ici en `
    + `${listeEtAnnees(annees)}. Attendre ${libre}.`;
}

function panneauRotation(zo) {
  const lot = rotationDuLieu(zo.id);
  if (!lot.length) return null;
  const d = document.createElement("div");
  d.className = "rotation-lieu";
  if (zo.rotation_muette) {
    d.classList.add("rotation-tue");
    d.innerHTML = `<button type="button" class="lien ro-rendre">Rotation masquée, réafficher</button>`;
    d.querySelector(".ro-rendre").addEventListener("click",
      () => majLieu(zo, { rotation_muette: false }));
    return d;
  }
  const familles = Object.keys(RETOUR_FAMILLE)
    .sort((a, b) => nomFamille(a).localeCompare(nomFamille(b), "fr"));
  d.innerHTML = `<b class="ro-titre">Rotation</b>`
    + lot.map(x => `<p class="ro-l" data-famille="${esc(x.famille)}">`
      + `<span class="ro-f">${esc(nomFamille(x.famille))}</span>`
      /* Toute année se retire, celle qu'un déclencheur a écrite comme celle
         qu'on a saisie. Une plante arrachée le lendemain de sa plantation a
         laissé une trace qui n'apprend rien, et rien ne permettait de
         l'effacer. Le retrait emporte les lignes de la famille pour cette
         année, plusieurs plantes d'une même famille en écrivant une chacune. */
      + x.annees.map(a => `<span class="ro-a${x.lignes.some(l => l.annee === a && l.saisi)
            ? " ro-saisi" : ""}">${a}`
          + `<button type="button" class="ro-oter" data-famille="${esc(x.famille)}"`
          + ` data-annee="${a}" aria-label="Retirer ${nomFamille(x.famille)} en ${a}">×</button>`
          + `</span>`).join("")
      + (x.attendre ? `<span class="ro-etat ro-attendre">pas avant ${x.libre}</span>`
        : x.delai ? `<span class="ro-etat">libre</span>`
        : `<span class="ro-etat">sans règle de retour</span>`)
      + `</p>`).join("")
    /* Ajouter une année passée et taire le panneau sont deux gestes rares :
       ils se déplient plutôt que d'occuper une ligne sous chaque planche. */
    + `<details class="ro-plus"><summary>Corriger</summary>`
    + `<form class="ro-ajout"><select class="ro-famille" aria-label="Famille cultivée">`
    + familles.map(f => `<option value="${f}">${esc(nomFamille(f))}</option>`).join("")
    + `</select><input class="ro-annee" type="number" min="2000" max="2100" `
    + `value="${new Date().getFullYear() - 1}" aria-label="Année">`
    + `<button class="lien" type="submit">Ajouter</button>`
    + `<button type="button" class="lien ro-taire">Ne plus afficher</button></form></details>`;
  d.querySelectorAll(".ro-oter").forEach(b =>
    b.addEventListener("click", () => retirerCulture(zo.id, b.dataset.famille,
      Number(b.dataset.annee))));
  d.querySelector(".ro-taire").addEventListener("click",
    () => majLieu(zo, { rotation_muette: true }));
  d.querySelector(".ro-ajout").addEventListener("submit", ev => {
    ev.preventDefault();
    ajouterCulture(zo, d.querySelector(".ro-famille").value,
      Number(d.querySelector(".ro-annee").value));
  });
  return d;
}

async function ajouterCulture(zo, famille, annee) {
  if (!session || !jardinId || !famille || !annee) return;
  const { error } = await db.from("cultures").insert({
    garden_id: jardinId, espace_id: zo.id, plant_id: null, famille, annee, saisi: true });
  if (error) { info("Année non ajoutée : " + error.message, true); return; }
  await chargerCultures();
  info("");
  rendreEspaces();
}

/* Le retrait porte sur la famille et l'année, non sur une ligne : deux tomates
   posées la même année en écrivent deux, et n'en effacer qu'une laisserait
   l'année en place sans que rien ne le dise. */
async function retirerCulture(cle, famille, annee) {
  if (!confirm(`Effacer ${nomFamille(famille).toLowerCase()} de l'année ${annee} ? `
    + `Cette trace sert à la rotation des cultures.`)) return;
  const { error } = await db.from("cultures").delete()
    .eq("espace_id", cle).eq("famille", famille).eq("annee", annee);
  if (error) { info("Suppression refusée : " + error.message, true); return; }
  cultures = cultures.filter(c =>
    !(c.espace_id === cle && c.famille === famille && c.annee === annee));
  rendreEspaces();
}

/* ================== Journal du jardin ==================
   Une entrée datée porte sur un lieu, sur une plante, ou sur les deux : un
   apport de compost concerne la zone et non une plante en particulier. Le
   journal d'un espace réunit ses entrées et celles de ses zones. */

function entreesDuLieu(id) {
  const sous = [id].concat(zonesDe(id).map(z => z.id));
  return carnet.filter(e => sous.includes(e.espace_id));
}

function jourEnClair(iso) {
  if (!iso) return "";
  const [a, m, j] = iso.split("-").map(Number);
  const cette = new Date().getFullYear();
  return Number(j) + " " + (MOIS_PLEIN[m - 1] || "") + (a === cette ? "" : " " + a);
}

function jourDuJour() { return new Date().toISOString().slice(0, 10); }

function cleCourte() {
  return crypto.randomUUID ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

async function chargerCarnet() {
  const { data } = await avecReprise(() => db.from("observations")
    .select("*").eq("garden_id", jardinId).order("jour", { ascending: false }).limit(500));
  carnet = (data || []).slice().sort((a, b) =>
    String(b.jour).localeCompare(String(a.jour))
    || String(b.created_at || "").localeCompare(String(a.created_at || "")));
  photosCarnet.clear();
  if (!carnet.length) return;
  const { data: ph } = await avecReprise(() => db.from("observation_photos")
    .select("*").in("observation_id", carnet.map(e => e.id)));
  (ph || []).slice().sort((a, b) => a.position - b.position).forEach(p => {
    if (!photosCarnet.has(p.observation_id)) photosCarnet.set(p.observation_id, []);
    photosCarnet.get(p.observation_id).push(p);
  });
}

function sectionCarnet(zo) {
  const d = document.createElement("details");
  d.className = "journal-lieu";
  d.id = "journalLieu";
  d.open = carnetOuvert;
  const lot = entreesDuLieu(zo.id);
  const s = document.createElement("summary");
  s.innerHTML = `<b class="zone-nom">Carnet</b><span class="nb">${lot.length}</span>`
    + `<span class="zone-mesure">${lot.length ? "dernière le " + esc(jourEnClair(lot[0].jour)) : ""}</span>`;
  d.appendChild(s);
  d.addEventListener("toggle", () => { carnetOuvert = d.open; });
  const corps = document.createElement("div");
  corps.className = "corps-zone corps-journal";
  const fermer = () => { saisieCarnet = null; rendreEspaces(); };
  if (saisieCarnet) {
    corps.appendChild(formulaireEntree(saisieCarnet, lieuxSousLEspace(zo), null, fermer));
  } else {
    const b = document.createElement("button");
    b.type = "button"; b.className = "lien ouvrir-saisie";
    b.textContent = "Ajouter une note";
    b.addEventListener("click", () => {
      saisieCarnet = { espace_id: zo.id, plant_id: "" };
      rendreEspaces();
    });
    corps.appendChild(b);
  }
  lot.forEach(e => corps.appendChild(ligneEntree(e, { plante: true, apres: rendreEspaces })));
  if (!lot.length && !saisieCarnet) {
    const p = document.createElement("p");
    p.className = "vide";
    p.textContent = "Rien de noté ici pour l'instant.";
    corps.appendChild(p);
  }
  d.appendChild(corps);
  return d;
}

/* La même ligne sert le journal d'un lieu et celui d'une plante. Le lieu ne
   s'écrit que là où il apprend quelque chose : la zone dans le journal d'un
   espace, l'espace entier dans celui d'une plante. */
function ligneEntree(e, opts) {
  const l = document.createElement("div");
  l.className = "entree-carnet";
  l.dataset.entree = e.id;
  const p = e.plant_id ? plantes.find(x => x.id === e.plant_id) : null;
  const lieu = noeud(e.espace_id);
  const ph = photosCarnet.get(e.id) || [];
  const quantite = e.quantite
    // Une quantité ronde se dit sans décimale : « 3 kg » et non « 3,0 kg ».
    ? ` <span class="ec-qtte">${esc(nombreFr(Number(e.quantite)).replace(/,0$/, ""))}`
      + `${e.unite ? " " + esc(e.unite) : ""}</span>` : "";
  l.innerHTML = `<div class="ec-haut"><span class="ec-jour">${esc(jourEnClair(e.jour))}</span>`
    + (e.geste ? `<span class="ec-geste">${esc(GESTE_NOM[e.geste] || e.geste)}</span>` : "")
    + quantite
    + (p && opts.plante ? `<span class="ec-plante">${esc(p.nom)}</span>` : "")
    + (lieu && !opts.plante && lieu.parent_id
        ? `<span class="ec-lieu">${esc((noeud(lieu.parent_id) || {}).name || "")}</span>` : "")
    + (lieu && (opts.plante ? lieu.parent_id : true)
        ? `<span class="ec-lieu">${esc(lieu.name)}</span>` : "")
    + `<span class="ec-actions"><button type="button" class="lien ec-modif">Modifier</button>`
    + `<button type="button" class="lien ec-oter">Supprimer</button></span></div>`
    + (e.texte ? `<p class="ec-texte">${esc(e.texte)}</p>` : "")
    + (ph.length ? `<div class="ec-photos">` + ph.map(x =>
        `<button type="button" class="ec-vign"><img data-chemin="${esc(x.chemin)}" alt=""`
        + `${x.largeur ? ` width="${x.largeur}" height="${x.hauteur}"` : ""}></button>`).join("")
      + `</div>` : "");
  l.querySelector(".ec-oter").addEventListener("click", () => supprimerEntree(e, opts.apres));
  /* Une entrée se corrige dans la feuille de saisie, préremplie : une faute
     sur un poids obligeait à supprimer puis à tout ressaisir, photographies
     comprises. */
  l.querySelector(".ec-modif").addEventListener("click", () => {
    saisiePartout = { entree: e, espace_id: e.espace_id || "", plant_id: e.plant_id || "" };
    ouvrirVue("note");
  });
  l.querySelectorAll(".ec-vign").forEach(b =>
    b.addEventListener("click", () => b.classList.toggle("ec-grande")));
  return l;
}

function lieuxSousLEspace(zo) {
  return [{ id: zo.id, nom: zo.name }]
    .concat(zonesDe(zo.id).map(z => ({ id: z.id, nom: z.name })));
}

/* Le même formulaire des deux côtés : depuis un lieu, où la plante se choisit
   dans ce qui y pousse, et depuis la fiche, où elle est imposée et où le lieu
   se choisit parmi ceux qu'elle occupe. */
function formulaireEntree(etat, lieux, fige, fermer) {
  const f = document.createElement("form");
  f.className = "form-entree";
  f.id = "formEntree";
  /* Ouverte hors de tout lieu, la saisie ne présélectionne plus le premier
     espace : une note sur le rosier du massif se rangeait dans le potager si
     l'on oubliait de changer le lieu. La plante se choisit d'abord, et le lieu
     la suit. La table accepte une entrée portée par la plante seule. */
  const edite = etat.entree || null;
  const horsLieu = !fige && (!etat.espace_id || Boolean(edite));
  const choisi = lieux.some(x => x.id === etat.espace_id)
    ? etat.espace_id : horsLieu ? "" : (lieux[0] || {}).id;
  f.innerHTML = `<div class="fe-ligne">`
    + `<input class="ec-jour-c" type="date" value="${edite ? esc(edite.jour) : jourDuJour()}" aria-label="Jour">`
    + (fige ? "" : `<select class="ec-plantes" aria-label="Plante"></select>`)
    + `<select class="ec-lieu" aria-label="Lieu">`
    + (horsLieu ? `<option value="">Sans lieu précis</option>` : "")
    + lieux.map(x =>
        `<option value="${x.id}"${x.id === choisi ? " selected" : ""}>${esc(x.nom)}</option>`).join("")
    + `</select>`
    + `<select class="ec-geste" aria-label="Geste"><option value="">Sans geste</option>`
    + Object.keys(GESTE_NOM).map(k => `<option value="${k}">${esc(GESTE_NOM[k])}</option>`).join("")
    + `</select></div>`
    + `<div class="fe-ligne fe-recolte" hidden>`
    + `<input class="ec-qte" type="number" min="0" step="0.1" inputmode="decimal" placeholder="quantité" aria-label="Quantité récoltée">`
    + `<select class="ec-unite" aria-label="Unité">`
    + UNITES.map(u => `<option value="${u}">${esc(u)}</option>`).join("") + `</select></div>`
    + `<textarea class="ec-texte-c" rows="2" maxlength="2000" placeholder="Ce que vous avez vu ou fait"></textarea>`
    + `<div class="fe-ligne fe-pied">`
    + `<label class="ec-fichiers-l"><input class="ec-fichiers" type="file" accept="image/*" multiple>`
    + `<span class="ec-fichiers-t">Photographies</span></label>`
    + `<button type="button" class="lien ec-annuler">Annuler</button>`
    + `<button type="submit" class="bouton ec-valider">Enregistrer</button></div>`;

  const selLieu = f.querySelector(".ec-lieu");
  const selPlante = f.querySelector(".ec-plantes");
  /* Les plantes offertes sont celles du jardin entier hors de tout lieu, et
     celles du lieu et de ses zones depuis un espace : la tomate du carré du
     fond manquait quand le potager seul était choisi. */
  const ids = new Set(lieux.map(x => x.id));
  const offertes = plantes.filter(p => (sel.has(p.id)
    && (horsLieu || espacesDe(p.id).some(id => ids.has(id))))
    || (edite && p.id === edite.plant_id));
  if (selPlante) {
    selPlante.innerHTML = `<option value="">Sans plante</option>`
      + offertes.map(p => `<option value="${p.id}"${p.id === etat.plant_id ? " selected" : ""}>`
        + `${esc(p.nom)}</option>`).join("");
    // Choisir une plante place la note là où elle pousse, parmi les lieux offerts.
    selPlante.addEventListener("change", () => {
      etat.plant_id = selPlante.value;
      const ou = selPlante.value ? espacesDe(selPlante.value).filter(id => ids.has(id)) : [];
      if (ou.length && !ou.includes(selLieu.value)) selLieu.value = ou[0];
      etat.espace_id = selLieu.value || null;
    });
  }
  selLieu.addEventListener("change", () => { etat.espace_id = selLieu.value || null; });
  const selGeste = f.querySelector(".ec-geste");
  const recolte = f.querySelector(".fe-recolte");
  selGeste.addEventListener("change", () => { recolte.hidden = selGeste.value !== "recolte"; });
  if (edite) {
    selGeste.value = edite.geste || "";
    recolte.hidden = selGeste.value !== "recolte";
    if (edite.quantite) f.querySelector(".ec-qte").value = edite.quantite;
    if (edite.unite) f.querySelector(".ec-unite").value = edite.unite;
    f.querySelector(".ec-texte-c").value = edite.texte || "";
  }
  const fichiers = f.querySelector(".ec-fichiers");
  fichiers.addEventListener("change", () => {
    const n = (fichiers.files || []).length;
    f.querySelector(".ec-fichiers-t").textContent = n
      ? n + (n > 1 ? " photographies" : " photographie") : "Photographies";
  });
  f.querySelector(".ec-annuler").addEventListener("click", fermer);
  f.addEventListener("submit", ev => {
    ev.preventDefault(); enregistrerEntree(f, fige, fermer, edite);
  });
  return f;
}

async function enregistrerEntree(f, fige, fermer, edite) {
  if (!session || !jardinId) { info("Connectez-vous pour tenir le carnet."); return; }
  const geste = f.querySelector(".ec-geste").value || null;
  const texte = f.querySelector(".ec-texte-c").value.trim() || null;
  const lot = [...(f.querySelector(".ec-fichiers").files || [])].slice(0, PHOTOS_PAR_ENTREE);
  const dejaPhotos = edite ? (photosCarnet.get(edite.id) || []).length : 0;
  if (!geste && !texte && !lot.length && !dejaPhotos) {
    info("Une entrée demande au moins un geste, un mot ou une photographie."); return;
  }
  const lieu = f.querySelector(".ec-lieu").value || null;
  const plante = fige ? fige.id : (f.querySelector(".ec-plantes").value || null);
  if (!lieu && !plante) { info("Choisissez une plante ou un lieu."); return; }
  const q = f.querySelector(".ec-qte").value.trim();
  const quantite = geste === "recolte" && q !== "" ? Number(q.replace(",", ".")) : null;
  const bouton = f.querySelector(".ec-valider");
  bouton.disabled = true;
  const ligne = {
    espace_id: lieu,
    plant_id: plante,
    jour: f.querySelector(".ec-jour-c").value || jourDuJour(),
    geste, texte, quantite,
    unite: quantite ? f.querySelector(".ec-unite").value : null,
  };
  // Une entrée corrigée garde son identifiant et ses photographies.
  const { data, error } = edite
    ? await db.from("observations").update(ligne).eq("id", edite.id).select().single()
    : await db.from("observations").insert({ garden_id: jardinId, ...ligne }).select().single();
  if (error) {
    bouton.disabled = false;
    info("Entrée non enregistrée : " + error.message, true);
    return;
  }
  const posees = lot.length ? await deposerPhotos(data.id, lot, dejaPhotos) : 0;
  await chargerCarnet();
  const dit = edite ? "Entrée corrigée" : "Entrée enregistrée";
  info(posees ? `${dit}, ${posees} ${posees > 1 ? "photographies" : "photographie"}.` : dit + ".");
  fermer();
}

/* L'appareil d'un téléphone rend des fichiers de plusieurs mégaoctets. Ils sont
   réduits avant l'envoi : mille six cents pixels sur le grand côté suffisent au
   plein écran, et pèsent environ trois cents kilo-octets. */
async function reduireImage(fichier, cote = 1600, qualite = 0.82) {
  const image = await createImageBitmap(fichier);
  const r = Math.min(1, cote / Math.max(image.width, image.height));
  const largeur = Math.max(1, Math.round(image.width * r));
  const hauteur = Math.max(1, Math.round(image.height * r));
  const toile = document.createElement("canvas");
  toile.width = largeur; toile.height = hauteur;
  toile.getContext("2d").drawImage(image, 0, 0, largeur, hauteur);
  image.close && image.close();
  const blob = await new Promise(res => toile.toBlob(res, "image/jpeg", qualite));
  if (!blob) throw new Error("image non convertie");
  return { blob, largeur, hauteur };
}

// Les photographies ajoutées à une entrée corrigée se rangent après les siennes.
async function deposerPhotos(entree, fichiers, deja = 0) {
  const lignes = [];
  for (let i = 0; i < fichiers.length; i++) {
    let image;
    try { image = await reduireImage(fichiers[i]); }
    catch { info("Image illisible : " + fichiers[i].name, true); continue; }
    const chemin = `${jardinId}/${entree}/${deja + i + 1}-${cleCourte()}.jpg`;
    const { error } = await db.storage.from("jardin")
      .upload(chemin, image.blob, { contentType: "image/jpeg" });
    if (error) { info("Photographie non envoyée : " + error.message, true); continue; }
    lignes.push({ observation_id: entree, chemin, largeur: image.largeur,
                  hauteur: image.hauteur, poids: image.blob.size, position: deja + i + 1 });
  }
  if (lignes.length) {
    const { error } = await db.from("observation_photos").insert(lignes);
    if (error) { info("Photographies non rattachées : " + error.message, true); return 0; }
  }
  return lignes.length;
}

/* Le compartiment est privé : chaque vignette demande une adresse signée, une
   seule fois par chemin et par heure. */
async function poserPhotosCarnet(racine) {
  const cibles = [...racine.querySelectorAll("img[data-chemin]")].filter(i => !i.getAttribute("src"));
  if (!cibles.length) return;
  const manquants = [...new Set(cibles.map(i => i.dataset.chemin))].filter(c => !urlsPhoto.has(c));
  if (manquants.length) {
    const { data } = await db.storage.from("jardin").createSignedUrls(manquants, 3600);
    (data || []).forEach(x => { if (x.signedUrl) urlsPhoto.set(x.path, x.signedUrl); });
  }
  cibles.forEach(i => {
    const u = urlsPhoto.get(i.dataset.chemin);
    if (u) i.setAttribute("src", u);
  });
}

/* ---------------------------------------------------------------------------
   Onglet Au jardin de la fiche. Ce que le jardinier a saisi sur sa propre
   plante : où elle est, et ce qu'il en a noté. La saisie y est la même que
   depuis un espace, la plante étant déjà connue.
   --------------------------------------------------------------------------- */

function lieuxDuJardin() {
  const l = [];
  racines().forEach(r => {
    l.push({ id: r.id, nom: r.name });
    zonesDe(r.id).forEach(z => l.push({ id: z.id, nom: r.name + ", " + z.name }));
  });
  return l;
}

/* La saisie depuis la fiche se pose là où la plante est déjà. Une plante
   placée nulle part se voit offrir le jardin entier. */
function lieuxDeLaPlante(p) {
  const pris = espacesDe(p.id);
  const l = lieuxDuJardin().filter(x => pris.includes(x.id));
  return l.length ? l : lieuxDuJardin();
}

function rendrePanJardin(p) {
  const z = document.querySelector("#feuille-corps .f-pan-jardin");
  if (!z) return;
  z.innerHTML = "";
  z.appendChild(carteLieuxDeLaPlante(p));
  z.appendChild(carteCarnetDeLaPlante(p));
  poserPhotosCarnet(z);
}

/* L'onglet du jardin se lit d'abord : une ligne par emplacement, l'espace, la
   zone et la quantité. Toucher la ligne déplie ce qui la modifie, la zone, la
   quantité et le retrait ; le lien « Placer ailleurs » déplie le choix d'un
   lieu. Tout était déplié en permanence, deux listes, un champ et deux boutons
   pour un seul emplacement. L'état déplié ne survit pas au changement de
   plante. */
let ouvertsFiche = { plante: null, lieu: null, ajout: false };

function carteLieuxDeLaPlante(p) {
  if (ouvertsFiche.plante !== p.id) ouvertsFiche = { plante: p.id, lieu: null, ajout: false };
  const c = document.createElement("section");
  c.className = "f-bloc f-lieux";
  c.innerHTML = `<h3>Où elle est</h3><div class="fj-corps"></div>`;
  const corps = c.querySelector(".fj-corps");
  const pris = espacesDe(p.id);
  pris.map(id => noeud(id)).filter(Boolean).forEach(n => {
    const r = (aff.get(p.id) || []).find(x => x.espace_id === n.id) || {};
    const souche = noeud(racineDe(n.id));
    const ouvert = ouvertsFiche.lieu === n.id;
    const d = document.createElement("div");
    d.className = "fj-lieu" + (ouvert ? " ouvert" : "");
    d.dataset.lieu = n.id;
    const dit = [souche ? souche.name : n.name]
      .concat(n.parent_id ? [n.name] : [])
      .concat(r.quantity != null && r.quantity !== "" ? ["quantité " + r.quantity] : []);
    d.innerHTML = `<button type="button" class="fj-ligne" aria-expanded="${ouvert}">`
      + `<span class="fj-dit">${esc(dit.join(", "))}</span>`
      + `<span class="fj-modif">${ouvert ? "Fermer" : "Modifier"}</span></button>`;
    d.querySelector(".fj-ligne").addEventListener("click", () => {
      ouvertsFiche.lieu = ouvert ? null : n.id;
      rendrePanJardin(p);
    });
    if (ouvert) {
      /* La zone se change ici, Sans zone comprise : il fallait jusque-là
         retirer la plante puis la reposer ailleurs. La liste ne paraît pas
         tant que l'espace n'a aucune zone. */
      const e = document.createElement("div");
      e.className = "fj-edition";
      e.innerHTML = choixZoneHTML(n.id)
        + `<input class="qte" type="number" min="0" max="32000" placeholder="qté"`
        + ` value="${r.quantity ?? ""}" aria-label="Quantité">`
        + `<button type="button" class="lien fj-oter">Retirer</button>`;
      e.querySelector(".qte").addEventListener("change", async ev => {
        await majAffectation(p.id, n.id, ev.target.value);
        rendrePanJardin(p);
      });
      const sz = e.querySelector(".sel-zone");
      if (sz) sz.addEventListener("change", async () => {
        await deplacer(p.id, n.id, sz.value);
        ouvertsFiche.lieu = sz.value;
        rendrePanJardin(p);
      });
      e.querySelector(".fj-oter").addEventListener("click", async () => {
        if (!await retirerDe(p.id, n.id)) return;
        ouvertsFiche.lieu = null;
        construireChips(); rendreTout(); rendrePanJardin(p);
      });
      d.appendChild(e);
    }
    corps.appendChild(d);
  });
  if (!pris.length) {
    const v = document.createElement("p");
    v.className = "f-vide";
    v.textContent = "Pas encore placée dans un espace.";
    corps.appendChild(v);
  }
  /* Un espace dont une zone est déjà occupée ne s'ajoute pas : la règle veut
     qu'une plante ne tienne pas à la fois l'espace et sa zone, et le poser ici
     aurait retiré la zone sans le dire. C'est le choix de zone de la ligne qui
     fait ce déplacement, Sans zone comprise. */
  const parZone = new Set(pris.map(id => noeud(id))
    .filter(n => n && n.parent_id).map(n => n.parent_id));
  const libres = lieuxDuJardin().filter(x => !pris.includes(x.id) && !parZone.has(x.id));
  if (libres.length) {
    const a = document.createElement("div");
    a.className = "fj-ajout";
    if (!ouvertsFiche.ajout) {
      a.innerHTML = `<button type="button" class="lien fj-ailleurs">`
        + `${pris.length ? "Placer ailleurs" : "Placer dans un espace"}</button>`;
      a.querySelector(".fj-ailleurs").addEventListener("click", () => {
        ouvertsFiche.ajout = true;
        rendrePanJardin(p);
      });
    } else {
      a.innerHTML = `<select class="fj-ou" aria-label="Espace ou zone">`
        + libres.map(x => `<option value="${x.id}">${esc(x.nom)}</option>`).join("")
        + `</select><button type="button" class="lien fj-placer">Placer</button>`
        + `<button type="button" class="lien fj-annuler">Annuler</button>`;
      a.querySelector(".fj-placer").addEventListener("click", async () => {
        if (!await placerSur(p.id, a.querySelector(".fj-ou").value, true)) return;
        ouvertsFiche.ajout = false;
        construireChips(); rendreTout(); rendrePanJardin(p);
      });
      a.querySelector(".fj-annuler").addEventListener("click", () => {
        ouvertsFiche.ajout = false;
        rendrePanJardin(p);
      });
    }
    corps.appendChild(a);
  }
  return c;
}

function carteCarnetDeLaPlante(p) {
  const c = document.createElement("section");
  c.className = "f-bloc f-journal-plante";
  const lot = carnet.filter(e => e.plant_id === p.id);
  c.innerHTML = `<h3>Carnet</h3><div class="fj-corps corps-journal"></div>`;
  const corps = c.querySelector(".fj-corps");
  const fermer = () => { saisieFiche = null; rendrePanJardin(p); };
  if (saisieFiche) {
    corps.appendChild(formulaireEntree(saisieFiche, lieuxDeLaPlante(p), p, fermer));
  } else {
    const b = document.createElement("button");
    b.type = "button"; b.className = "lien ouvrir-saisie";
    b.textContent = "Ajouter une note";
    b.addEventListener("click", () => {
      saisieFiche = { espace_id: (lieuxDeLaPlante(p)[0] || {}).id || null, plant_id: p.id };
      rendrePanJardin(p);
    });
    corps.appendChild(b);
  }
  lot.forEach(e => corps.appendChild(
    ligneEntree(e, { plante: false, apres: () => rendrePanJardin(p) })));
  if (!lot.length && !saisieFiche) {
    const v = document.createElement("p");
    v.className = "f-vide";
    v.textContent = "Rien de noté sur cette plante pour l'instant.";
    corps.appendChild(v);
  }
  return c;
}

async function supprimerEntree(e, apres) {
  if (!confirm("Supprimer cette entrée du carnet ?")) return;
  const ph = photosCarnet.get(e.id) || [];
  if (ph.length) await db.storage.from("jardin").remove(ph.map(x => x.chemin));
  const { error } = await db.from("observations").delete().eq("id", e.id);
  if (error) { info("Suppression refusée : " + error.message, true); return; }
  carnet = carnet.filter(x => x.id !== e.id);
  photosCarnet.delete(e.id);
  ph.forEach(x => urlsPhoto.delete(x.chemin));
  info("");
  (apres || rendreEspaces)();
}

function formulaireZone(zo) {
  const f = document.createElement("form");
  f.className = "ajout-espace ajout-zone";
  f.id = "form-zone";
  f.innerHTML = `<label class="etiq-filtre" for="nomZone">Nouvelle zone</label>`
    + `<input id="nomZone" type="text" maxlength="40" placeholder="Carré du fond, serre, bordure">`
    + `<button class="lien" type="submit">Ajouter</button>`;
  f.addEventListener("submit", e => {
    e.preventDefault();
    const c = f.querySelector("#nomZone");
    const n = c.value.trim();
    if (!n) return;
    c.value = "";
    creerEspace(n, zo.id);
  });
  return f;
}

async function majAffectation(plantId, espaceId, qte) {
  const q = qte === "" ? null : Number(qte);
  const { error } = await db.from("garden_plant_espaces").update({ quantity: q })
    .eq("garden_id", jardinId).eq("plant_id", plantId).eq("espace_id", espaceId);
  if (error) { info("Enregistrement refusé : " + error.message, true); return; }
  const r = (aff.get(plantId) || []).find(x => x.espace_id === espaceId);
  if (r) r.quantity = q;
  info("");
}

async function creerEspace(nom, parent = null) {
  const freres = parent ? zonesDe(parent) : racines();
  const { data, error } = await db.from("espaces")
    .insert({ garden_id: jardinId, name: nom, position: freres.length, parent_id: parent })
    .select().single();
  if (error) { info((parent ? "Zone non créée : " : "Espace non créé : ") + error.message, true); return; }
  espaces.push(data);
  if (parent) zonesOuvertes.add(data.id);
  construireChips(); majJardinUI(); rendreTout();
}

/* Dans l'éditeur, le nom se corrige sur place : la boîte de dialogue du
   navigateur n'a plus lieu d'être quand le champ est déjà sous les yeux. */
async function renommerZoneSurPlace(x, valeur) {
  const nom = String(valeur || "").trim();
  if (!nom || nom === x.name) { rendreEspaces(); return; }
  const { error } = await db.from("espaces").update({ name: nom }).eq("id", x.id);
  if (error) { info("Renommage refusé : " + error.message, true); rendreEspaces(); return; }
  x.name = nom;
  construireChips(); majJardinUI(); rendreTout();
}

/* Supprimer six zones une à une demandait six confirmations. L'éditeur les
   retient par des cases et n'en demande qu'une. */
async function supprimerZonesRetenues(zo) {
  const ids = [...zonesCochees];
  const lot = zonesDe(zo.id).filter(x => ids.includes(x.id));
  if (!lot.length) return;
  const plur = lot.length > 1;
  if (!confirm(`Supprimer ${plur ? "les zones" : "la zone"} ${lot.map(x => x.name).join(", ")} ? `
    + `${plur ? "Leurs plantes restent" : "Ses plantes restent"} dans l'espace.`)) return;
  for (const x of lot) {
    for (const p of plantesDuNoeud(x.id)) {
      if (!await placerSur(p.id, zo.id)) return;
    }
  }
  const { error } = await db.from("espaces").delete().in("id", ids);
  if (error) { info("Suppression refusée : " + error.message, true); return; }
  espaces = espaces.filter(x => !ids.includes(x.id));
  aff.forEach((v, k) => aff.set(k, v.filter(r => !ids.includes(r.espace_id))));
  ids.forEach(id => { zonesOuvertes.delete(id); reglagesOuverts.delete(id); });
  zonesCochees.clear();
  construireChips(); majJardinUI(); rendreTout();
}

async function renommerEspace(zo) {
  const nom = prompt(zo.parent_id ? "Nouveau nom de la zone" : "Nouveau nom de l'espace", zo.name);
  if (!nom || nom.trim() === "" || nom.trim() === zo.name) return;
  const { error } = await db.from("espaces").update({ name: nom.trim() }).eq("id", zo.id);
  if (error) { info("Renommage refusé : " + error.message, true); return; }
  zo.name = nom.trim();
  construireChips(); majJardinUI(); rendreTout();
}

async function supprimerEspace(zo) {
  const filles = zonesDe(zo.id);
  const texte = zo.parent_id
    ? `Supprimer la zone ${zo.name} ? Ses plantes restent dans l'espace.`
    : `Supprimer l'espace ${zo.name} ?`
      + (filles.length ? ` Ses ${filles.length > 1 ? "zones partent" : "zone part"} avec lui.` : "")
      + ` Les plantes restent dans le jardin, elles deviennent non placées.`;
  if (!confirm(texte)) return;
  /* Une zone qui disparaît rend ses plantes à son espace : les laisser partir
     avec elle les sortirait du jardin sans que rien ne le dise. */
  if (zo.parent_id) {
    for (const p of plantesDuNoeud(zo.id)) {
      if (!await placerSur(p.id, zo.parent_id)) return;
    }
  }
  const { error } = await db.from("espaces").delete().eq("id", zo.id);
  if (error) { info("Suppression refusée : " + error.message, true); return; }
  const partis = [zo.id].concat(filles.map(x => x.id));
  espaces = espaces.filter(x => !partis.includes(x.id));
  aff.forEach((v, k) => aff.set(k, v.filter(r => !partis.includes(r.espace_id))));
  partis.forEach(id => zonesOuvertes.delete(id));
  if (partis.includes(espacePlan)) espacePlan = null;
  if (partis.includes(espaceOuvert)) espaceOuvert = null;
  construireChips(); majJardinUI(); rendreTout();
}

sur("form-espace", "submit", e => {
  e.preventDefault();
  const n = $("nomEspace").value.trim();
  if (!n || !jardinId) return;
  $("nomEspace").value = "";
  creerEspace(n);
});
sur("ouvrirAjoutEspace", "click", () => {
  majAjoutEspace(true);
  $("nomEspace").focus();
});

sur("selJardin", "change", async function () {
  jardinId = this.value;
  espacePlan = null;
  await chargerContenuJardin();
});

sur("selClimat", "change", async function () {
  const g = jardinActif();
  if (!g) return;
  const v = this.value || null;
  const { error } = await db.from("gardens").update({ climate_key: v }).eq("id", g.id);
  if (error) { info("Climat non enregistré : " + error.message, true); return; }
  g.climate_key = v;
  await chargerAdaptations();
  majJardinUI(); rendreTout();
});

sur("selSol", "change", async function () {
  const g = jardinActif();
  if (!g) return;
  const v = this.value || null;
  const { error } = await db.from("gardens").update({ sol_texture: v }).eq("id", g.id);
  if (error) { info("Texture non enregistrée : " + error.message, true); return; }
  g.sol_texture = v;
  majJardinUI(); rendreBandeau();
});

sur("nouveauJardin", "click", async () => {
  const nom = prompt("Nom du nouveau jardin");
  if (!nom || !nom.trim()) return;
  const { data, error } = await db.rpc("create_garden", { p_name: nom.trim() });
  if (error) { info("Jardin non créé : " + error.message, true); return; }
  await listerJardins();
  jardinId = data;
  espacePlan = null;
  await chargerContenuJardin();
});

sur("renommerJardin", "click", async () => {
  const g = jardinActif();
  if (!g) return;
  const nom = prompt("Nouveau nom du jardin", g.name);
  if (!nom || !nom.trim() || nom.trim() === g.name) return;
  const { error } = await db.from("gardens").update({ name: nom.trim() }).eq("id", g.id);
  if (error) { info("Renommage refusé : " + error.message, true); return; }
  g.name = nom.trim();
  majJardinUI();
});

/* ================== Amorçage ================== */

function rendreTout() {
  if (!plantes.length) return;
  rendreSelection();
  rendreMaintenant();
  rendrePlanning();
  rendreEspaces();
  majCarnet();
}

/* L'agent de service met en cache le script, la feuille de style et les
   caractères, et rend l'application utilisable sans réseau. Son absence n'est
   pas une panne : le site fonctionne, il repart simplement du réseau. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => { agentMaj = reg; })
      .catch(() => { /* contexte non sécurisé */ });
  });
  /* Une copie neuve prend la main sans attendre : le document qui tourne n'est
     alors plus celui du site, et le bandeau le dit. Le contrôle n'a lieu que si
     une copie tenait déjà la main, faute de quoi la première installation
     l'annoncerait elle-même. */
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener("controllerchange", annoncerMaj);
  }
}

window.addEventListener("resize", () => { placerMarqueur(); majMois(); });
majCompte();
try { await chargerCatalogue(); }
catch (e) { info("Catalogue indisponible : " + e.message, true); }
lireGlossaire().catch(() => { /* glossaire indisponible, les textes restent bruts */ });
lirePlanches();
brancherFond();
appliquerAmbiance();
// L'heure change la lumière du fond : elle est relue tous les quarts d'heure.
setInterval(appliquerAmbiance, 900000);
const { data: { session: s0 } } = await db.auth.getSession();
if (!s0) {
  $("zone-connexion").hidden = false;
  /* Sans compte, l'écran du moment est vide et rien n'indique par où commencer.
     La feuille du compte s'ouvre donc d'elle-même, une seule fois par appareil.
     Ensuite le titre suffit, il annonce « Se connecter ». */
  try {
    if (!localStorage.getItem(CLE_VENUE)) {
      localStorage.setItem(CLE_VENUE, "1");
      ouvrirVue("compte");
    }
  } catch (e) { /* stockage indisponible, la feuille ne s'ouvre pas seule */ }
}

// Le lien reçu par courrier électronique s'ouvre dans le navigateur, jamais dans
// l'application ajoutée à l'écran d'accueil, qui dispose de son propre stockage.
// La saisie du code ouvre la session dans le contexte où elle est saisie.
// Le lien reçu s'ouvre toujours dans le navigateur, jamais dans l'application ajoutée
// à l'écran d'accueil, qui dispose de son propre stockage. Coller le lien, ou saisir le
// code quand le modèle de courriel en fournit un, ouvre la session dans ce contexte.
const CODE_REPRISE = /^[A-Z2-9]{9}$/;
const nettoyerCode = v => (v || "").toUpperCase().replace(/[^A-Z2-9]/g, "");

// Un code de reprise est échangé contre un jeton par la fonction de bord, qui seule
// détient la clé de service. Aucun courriel n'intervient.
async function reprendreParCode(code) {
  const { data, error } = await db.functions.invoke("reprise", {
    body: { action: "utiliser", code },
  });
  if (error) {
    let detail = error.message;
    try { detail = (await error.context.json()).error || detail; } catch (e) { /* corps illisible */ }
    return { error: { message: detail } };
  }
  if (!data || !data.token_hash) return { error: { message: "réponse inattendue" } };
  return db.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
}

function validerEntree(valeur, email) {
  const v = valeur.trim();
  if (!/^https?:\/\//i.test(v)) {
    const propre = nettoyerCode(v);
    if (CODE_REPRISE.test(propre) && !/^\d{6}$/.test(v.replace(/\s+/g, ""))) {
      return reprendreParCode(propre);
    }
    if (!email) return Promise.resolve({ error: { message: "adresse électronique manquante" } });
    return db.auth.verifyOtp({ email, token: v.replace(/\s+/g, ""), type: "email" });
  }
  let u;
  try { u = new URL(v); } catch (err) { return Promise.resolve({ error: { message: "lien illisible" } }); }
  const frag = new URLSearchParams((u.hash || "").replace(/^#/, ""));
  if (frag.get("access_token") && frag.get("refresh_token")) {
    return db.auth.setSession({
      access_token: frag.get("access_token"),
      refresh_token: frag.get("refresh_token"),
    });
  }
  const jeton = u.searchParams.get("token_hash") || u.searchParams.get("token");
  if (!jeton) return Promise.resolve({ error: { message: "aucun jeton dans ce lien" } });
  return db.auth.verifyOtp({ token_hash: jeton, type: u.searchParams.get("type") || "magiclink" });
}

sur("form-code", "submit", async e => {
  e.preventDefault();
  const saisie = $("code").value;
  if (!saisie.trim()) return;
  const n = $("note-connexion");
  n.hidden = false; n.classList.remove("erreur"); n.textContent = "Vérification en cours.";
  const { error } = await validerEntree(saisie, $("email").value.trim());
  if (error) {
    n.classList.add("erreur");
    n.textContent = "Connexion refusée : " + error.message;
    return;
  }
  n.hidden = true; n.textContent = "";
});

sur("genererReprise", "click", async () => {
  const z = $("codeReprise");
  z.hidden = false; z.classList.remove("erreur"); z.textContent = "Génération en cours.";
  const { data, error } = await db.functions.invoke("reprise", { body: { action: "creer" } });
  if (error || !data || !data.code) {
    z.classList.add("erreur");
    z.textContent = "Code non généré : " + ((error && error.message) || "réponse inattendue");
    return;
  }
  const c = data.code;
  z.innerHTML = `Code de reprise : <b class="code-reprise">${esc(c.slice(0, 3))} ${esc(c.slice(3, 6))} ${esc(c.slice(6))}</b>`
    + `<br>Valable ${data.validite_minutes} minutes, une seule fois. Saisissez-le dans le champ de connexion de l'autre appareil.`;
});

sur("puceClimat", "click", () => afficher("jardin"));
sur("btnCommune", "click", () => ouvrirVue("lieu"));

/* ================== Feuille de détail ================== */

// Le besoin en eau se lit à l'ouverture, une requête par plante et par climat.
async function chargerEau(p) {
  const g = jardinActif();
  const cle = (g && g.climate_key) || "oceanique_degrade";
  if (p.eauCle === cle) return;
  const { data } = await avecReprise(() => db.from("arrosage_plante_quinzaine")
    .select("quinzaine,litres_jour_m2,unite,niveau,irrigation_mode,reprise_dose_litres,reprise_intervalle_jours")
    .eq("plant_id", p.id).eq("climate_key", cle).order("quinzaine"));
  p.eauCle = cle;
  p.eauLignes = data || [];
  p.eauMode = p.eauLignes.length ? p.eauLignes[0].irrigation_mode : null;
}

function brancherFiche(p) {
  const c = $("feuille-corps");
  saisieFiche = null;
  if (c.querySelector(".f-pan-jardin")) rendrePanJardin(p);
  const onglets = [...c.querySelectorAll(".f-onglets button")];
  onglets.forEach(b => b.addEventListener("click", () => {
    fermerGlose();
    onglets.forEach(x => {
      x.classList.toggle("actif", x === b);
      x.setAttribute("aria-selected", String(x === b));
    });
    c.querySelectorAll(".f-pan").forEach(z => { z.hidden = z.dataset.pan !== b.dataset.pan; });
    c.scrollTop = 0;
  }));
  const formes = [...c.querySelectorAll(".f-seg button")];
  formes.forEach(b => b.addEventListener("click", () => {
    formes.forEach(x => x.classList.toggle("actif", x === b));
    c.querySelector(".f-ruban").hidden = b.dataset.forme !== "ruban";
    c.querySelector(".f-roue").hidden = b.dataset.forme !== "roue";
  }));
}

// Le besoin en eau arrive après le premier rendu, seules deux zones changent.
function majEau(p) {
  const c = $("feuille-corps");
  if (!c) return;
  fermerGlose();
  const carte = c.querySelector(".f-eau");
  const svg = p.eauLignes && p.eauLignes.length ? eauSVG(p, p.eauLignes) : "";
  if (carte) {
    if (svg) carte.querySelector(".f-eau-corps").innerHTML = svg
      + '<p class="f-note">Calcul FAO 56, évapotranspiration Météo-France.</p>';
    else carte.hidden = true;
  }
  const m = c.querySelector(".f-pan-moment");
  if (m) m.innerHTML = ficheMoment(p);
}

/* ---------------------------------------------------------------------------
   Photographies de la fiche. Les images ne sont pas réhébergées : la table
   porte l'adresse du fonds, l'auteur et la licence, et le carré de la tuile se
   fait à l'affichage. Recadrer un fichier produirait une oeuvre dérivée, que la
   licence obligerait à rediffuser sous les mêmes termes.
   --------------------------------------------------------------------------- */

/* L'ordre est le même d'une plante à l'autre. Cet ordre imposé et le carré
   identique tiennent lieu d'homogénéité, puisque les photographes changent
   d'une image à l'autre. Une tuile manque quand la source ne couvre pas
   l'organe, la bande raccourcit, aucune case vide. */

function lireFileAvis() {
  try { return JSON.parse(localStorage.getItem(FILE_AVIS) || "[]"); }
  catch (e) { return []; }
}

function ecrireFileAvis(f) {
  try { localStorage.setItem(FILE_AVIS, JSON.stringify(f)); } catch (e) { /* sans effet */ }
}

async function chargerAvisPhoto() {
  avisPhoto = new Map();
  if (!session) return;
  try {
    const { data } = await db.from("avis_photo").select("image_id,avis");
    (data || []).forEach(r => avisPhoto.set(r.image_id, r.avis));
  } catch (e) { /* sans réseau les avis locaux suffisent */ }
  lireFileAvis().forEach(r => avisPhoto.set(r.image_id, r.avis));
  viderFileAvis();
}

/* La file part en une seule fois, dans l'ordre où les avis ont été émis. Ce qui
   échoue reste dans la file et repartira au prochain démarrage. */
async function viderFileAvis() {
  const f = lireFileAvis();
  if (!f.length || !session) return;
  const reste = [];
  for (const r of f) {
    try {
      const { error } = await db.from("avis_photo")
        .upsert({ image_id: r.image_id, avis: r.avis }, { onConflict: "image_id,auteur" });
      if (error) reste.push(r);
    } catch (e) { reste.push(r); }
  }
  ecrireFileAvis(reste);
}

/* Un avis est d'abord local, ensuite écrit. L'inverse ferait attendre la
   personne sur un réseau qu'elle n'a pas toujours. */
async function poserAvisPhoto(image_id, avis) {
  avisPhoto.set(image_id, avis);
  photosPlante.clear();
  if (!session) return;
  try {
    const { error } = await db.from("avis_photo")
      .upsert({ image_id, avis }, { onConflict: "image_id,auteur" });
    if (error) throw error;
  } catch (e) {
    const f = lireFileAvis().filter(r => r.image_id !== image_id);
    f.push({ image_id, avis });
    ecrireFileAvis(f);
  }
}

async function retirerAvisPhoto(image_id) {
  avisPhoto.delete(image_id);
  photosPlante.clear();
  if (!session) return;
  try { await db.from("avis_photo").delete().eq("image_id", image_id); }
  catch (e) { /* la ligne repartira au prochain démarrage */ }
  ecrireFileAvis(lireFileAvis().filter(r => r.image_id !== image_id));
}

/* La bande demande la petite taille, le plein écran la moyenne. Les deux
   existent chez le fonds, rien n'est fabriqué ici.

   Pl@ntNet sert trois tailles au même identifiant, une lettre les sépare.
   Wikimedia ne sert plus qu'une échelle fixe de largeurs, cent vingt, deux cent
   cinquante, cinq cents et mille deux cent quatre-vingts points : toute autre
   largeur rend une erreur. La bande demande deux cent cinquante, le plein écran
   cinq cents. */
function photoGrande(ph) {
  if (ph.fonds === "plantnet") return ph.url.replace("/image/s/", "/image/m/");
  return (ph.url || "").replace(/(\/thumb\/.+\/)\d+px-/, "$1500px-");
}

/* L'attribution portée sous la bande. Un lot Pl@ntNet est sous une licence
   unique et la phrase la nomme une fois. Un lot Wikimedia mêle les licences,
   quarante-cinq fiches sur soixante-deux en portent plusieurs : chaque auteur
   est alors suivi de la sienne, faute de quoi la mention serait fausse pour
   toutes les images sauf la première. */
function creditPhotos(lot) {
  const fonds = lot[0].fonds === "commons" ? "Wikimedia Commons" : "Pl@ntNet";
  const licences = [...new Set(lot.map(x => x.licence || "CC BY-SA"))];
  if (licences.length === 1) {
    const auteurs = [...new Set(lot.map(x => x.auteur).filter(Boolean))];
    return `${fonds}, sous licence ${licences[0]}`
      + (auteurs.length ? ` : ${enumerer(auteurs, auteurs.length)}` : "") + ".";
  }
  const paires = [];
  lot.forEach(x => {
    const t = `${x.auteur || "auteur non renseigné"} (${x.licence || "CC BY-SA"})`;
    if (paires.indexOf(t) === -1) paires.push(t);
  });
  return `${fonds} : ${enumerer(paires, paires.length)}.`;
}

/* L'écorce n'a pas d'objet chez une plante qui n'est pas ligneuse, le fruit pas
   davantage chez un légume-feuille, une racine ou un bulbe. Quatre-vingts des
   mille cinquante-huit organes du catalogue sont dans ce cas : leur tuile vide
   est leur état juste, et rien ne doit venir la remplir. */
const PORTS_LIGNEUX = ["arbre", "arbuste", "liane", "sous_arbrisseau"];
const CATEGORIES_SANS_FRUIT = ["Feuilles", "Racines", "Bulbes"];
const organeAttendu = (p, organe) => {
  if (organe === "ecorce") return PORTS_LIGNEUX.indexOf(p.port) !== -1;
  if (organe === "fruit") return CATEGORIES_SANS_FRUIT.indexOf(p.cat) === -1;
  return true;
};

async function chargerPhotos(id) {
  /* La promesse est mise en cache, non son résultat : deux appels rapprochés,
     celui de la bande et celui du plein écran après un avis, ne doivent pas
     lancer deux requêtes. */
  if (photosPlante.has(id)) return photosPlante.get(id);
  const promesse = photosDe(id);
  photosPlante.set(id, promesse);
  return promesse;
}

async function photosDe(id) {
  let lot = [];
  try {
    /* Les colonnes nommées plutôt que l'étoile : la réserve compte jusqu'à six
       images par organe, et les compteurs d'avis, la note de sélection et le
       verrou ne servent jamais à l'affichage. */
    const { data } = await db.from("plant_images")
      .select("id,organe,rang,score,url,auteur,licence,fonds,source,retenue,retrait_motif,controle_motifs")
      .eq("plant_id", id);
    lot = data || [];
  } catch (e) { /* sans réseau la section reste absente */ }
  /* Le plus petit rang retenu de chaque organe, dans l'ordre d'affichage. Une
     photographie que la personne a jugée à supprimer est masquée pour elle
     seule : la suivante prend la place, exactement comme si elle avait été
     écartée pour tout le monde.

     Un organe attendu ne reste pas vide pour autant. Quand plus rien n'est
     retenu, la plus haute des images que le contrôle automatique avait écartées
     reprend la place : le contrôle est une suspicion, l'avis d'une personne est
     un verdict, et une image retirée par avis n'est jamais reprise. */
  const p = plantes.find(x => x.id === id) || {};
  const par = {}, repli = {};
  lot.forEach(x => {
    if (avisPhoto.get(x.id) === "supprimer") return;
    const c = x.retenue !== false ? par
      : x.retrait_motif === "relecture" ? repli : null;
    if (!c) return;
    (c[x.organe] = c[x.organe] || []).push(x);
  });
  /* L'ordre d'affichage suit le jugement des personnes avant la place de
     naissance : le score d'abord, le rang pour départager. Une bonne remonte de
     deux, une moyenne descend de trois, une demande de retrait descend de six,
     et chaque avis pèse le poids de son auteur. */
  const ordre = (a, b) => (b.score || 0) - (a.score || 0) || a.rang - b.rang;
  const suite = PH_ORDRE
    .map(o => (par[o] || []).length ? par[o].sort(ordre)
      : organeAttendu(p, o) && (repli[o] || []).length ? repli[o].sort(ordre) : null)
    .filter(Boolean);
  return suite;
}

function poserPhotos(p) {
  const z = $("fPhotos");
  if (!z) return;
  chargerPhotos(p.id).then(lot => {
    // La fiche a pu changer pendant la requête.
    const zz = $("fPhotos");
    if (!zz || zz.dataset.plante !== String(p.id)) return;
    if (!lot.length) { zz.hidden = true; return; }
    photosVues = lot;
    const tete = lot.map(g => g[0]);
    /* L'attribution et la portée de la photographie tenaient quatre lignes sous
       la bande, lues une fois et relues jamais. Elles passent sous un mot, que
       l'on ouvre comme une définition du glossaire. La licence reste satisfaite :
       la mention est à un appui, et le plein écran nomme l'auteur de chaque
       image avec sa licence et le lien vers la source.

       Une photographie de terrain porte le nom que l'observateur a donné à la
       plante, au rang de la fiche. Rien ne distingue à l'oeil deux variétés
       d'hortensia : la fiche le dit plutôt que de laisser croire au portrait de
       la variété cultivée. C'est le principe de la provenance, la mention dit ce
       que la source établit. */
    const note = creditPhotos(tete) + " La photographie documente "
      + (p.latin && p.latin.indexOf(" ") === -1 ? "le genre" : "l'espèce")
      + ", une variété de jardin peut en différer.";
    zz.innerHTML = `<h3>Photographies</h3><div class="ph-rail">`
      + tete.map((x, i) => `<button type="button" class="ph-i" data-photo="${i}">`
          + `<img src="${esc(x.url)}" alt="" loading="lazy" decoding="async">`
          + `<span>${esc(PH_NOM[x.organe] || x.organe)}</span></button>`).join("")
      + `</div><p class="ph-credit"><button type="button" class="terme ph-credits"`
      + ` data-titre="Crédits" data-note="${esc(note)}">Crédits</button></p>`;
    zz.hidden = false;
    zz.querySelectorAll("[data-photo]").forEach(b =>
      b.addEventListener("click", () => ouvrirPhoto(Number(b.dataset.photo))));
  });
}

/* Le plein écran nomme l'organe, l'auteur et la licence, et renvoie à la
   source. L'attribution est une obligation de la licence, elle est portée aux
   deux endroits, sous la bande et ici. */
/* Deux axes. L'horizontale parcourt les organes, la verticale la réserve de
   l'organe regardé : six images par organe dorment en base, elles n'étaient
   visibles qu'après un avis, elles se parcourent maintenant. */
function ouvrirPhoto(i, r) {
  const groupe = photosVues[i];
  if (!groupe || !groupe.length) return;
  photoIndex = i;
  photoRang = Math.max(0, Math.min(r || 0, groupe.length - 1));
  const x = groupe[photoRang];
  const z = $("photoPlein");
  const fonds = x.fonds === "commons" ? "Wikimedia Commons" : "Pl@ntNet";
  z.innerHTML = `<button type="button" class="ph-fx" id="fermerPhoto" aria-label="Fermer">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`
    + `<p class="ph-org"><span class="ph-org-n">${esc(PH_NOM[x.organe] || x.organe)}</span>`
    /* Le compte dit qu'il y a autre chose à voir : sans lui, personne ne
       devinerait que la verticale porte quelque chose. */
    + (groupe.length > 1
        ? `<span class="ph-nb">${photoRang + 1} sur ${groupe.length}</span>` : "")
    + `</p>`
    + `<img class="ph-grande" src="${esc(photoGrande(x))}" alt="${esc(PH_NOM[x.organe] || x.organe)}">`
    + `<p class="ph-bas"><b>${esc(x.auteur || "auteur non renseigné")}</b><br>`
    + `${esc(fonds)}, sous licence ${esc(x.licence || "CC BY-SA")}`
    + (x.source ? `. <a href="${esc(x.source)}" target="_blank" rel="noopener">Voir la source</a>` : "")
    + `</p>` + motifsControle(x) + boutonsAvis(x)
    /* La série de l'organe, en vignettes : on parcourt les autres fleurs d'un
       appui, sans avoir à deviner qu'un glissement vertical existe, et on juge
       celle qu'on regarde. Une pastille marque celles déjà jugées. */
    + (groupe.length > 1
        ? `<div class="ph-serie" role="group" aria-label="Photographies de `
          + `${esc(PH_NOM[x.organe] || x.organe)}">`
          + groupe.map((y, k) => {
              const mien = avisPhoto.get(y.id) || "";
              return `<button type="button" class="ps-i${mien ? " ps-" + mien : ""}"`
                + ` data-rang="${k}" aria-current="${k === photoRang}"`
                + ` aria-label="Photographie ${k + 1} sur ${groupe.length}`
                + `${mien ? ", jugée " + esc(AVIS_NOM[mien].toLowerCase()) : ""}">`
                + `<img src="${esc(y.url)}" alt="" loading="lazy" decoding="async"></button>`;
            }).join("")
          + `</div>` : "")
    + `<p class="ph-pts">`
    + photosVues.map((_, k) => `<i class="${k === i ? "ici" : ""}"></i>`).join("") + `</p>`;
  z.hidden = false;
  document.body.classList.add("fige");
  sur("fermerPhoto", "click", fermerPhoto);
  brancherAvis(x);
  z.querySelectorAll("[data-rang]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const k = Number(b.dataset.rang);
    if (k !== photoRang) allerRang(k, k > photoRang ? -1 : 1);
  }));
}

const groupeVu = () => photosVues[photoIndex] || [];

/* Le fond referme, sauf au sortir d'un glissement : le doigt qui a fini sa
   course sur le fond ne voulait pas fermer. L'écouteur est posé une fois pour
   toutes, le contenu du plein écran étant réécrit à chaque photographie. */
sur("photoPlein", "click", e => {
  if (e.target !== e.currentTarget || e.currentTarget.dataset.glisse) return;
  fermerPhoto();
});

/* Le plein écran se parcourt au doigt, sur deux axes.

   L'horizontale passe d'un organe à l'autre. La verticale parcourt la réserve
   de l'organe regardé, jusqu'à six images, et referme quand on tire vers le bas
   depuis la première : au premier rang il n'y a rien au dessus, un tirage vers
   le bas ne peut donc vouloir dire que fermer.

   L'axe est verrouillé au premier mouvement franc et ne se relâche plus : une
   horizontale qui s'incurve reste horizontale. Tant qu'aucun des deux axes ne
   dépasse l'autre d'un tiers, rien ne bouge, un geste hésitant ne déclenchant
   rien plutôt que de trancher au hasard. */
const PH_COURSE = 10;      // course minimale avant de trancher l'axe, en points
const PH_DOMINANCE = 1.3;  // rapport exigé entre les deux axes pour trancher
const PH_VITESSE = 0.5;    // points par milliseconde, seuil du geste vif
const PH_RESIST = 0.32;    // ce qui reste de la course au delà de la dernière
const PH_FERMER = 96;      // course verticale qui referme, comme pour la feuille

function brancherGlissementPhoto() {
  const z = $("photoPlein");
  if (!z) return;
  let x0 = 0, y0 = 0, xs = 0, ys = 0, ts = 0;
  let dx = 0, dy = 0, vx = 0, vy = 0, axe = null, suit = false;
  const img = () => z.querySelector(".ph-grande");
  const horsBande = k => k < 0 || k >= photosVues.length;
  // Tirer vers le bas au premier rang ne parcourt rien : c'est le geste de
  // fermeture, il ne rencontre donc pas de butée.
  const horsReserve = k => k < 0 ? photoRang > 0 : k >= groupeVu().length;

  const poser = () => {
    const e = img();
    if (!e) return;
    if (axe === "x") e.style.transform = `translateX(${dx.toFixed(1)}px)`;
    else {
      e.style.transform = `translateY(${dy.toFixed(1)}px)`;
      // Le fond ne s'efface que si le geste referme, non s'il change de rang.
      if (dy > 0 && photoRang === 0) {
        z.style.opacity = String(Math.max(0.15, 1 - dy / 420));
      } else z.style.removeProperty("opacity");
    }
  };
  const rendre = () => {
    const e = img();
    z.style.removeProperty("opacity");
    if (!e) return;
    e.style.transition = "transform .22s cubic-bezier(.22,.61,.36,1)";
    e.style.transform = "";
    setTimeout(() => e.style.removeProperty("transition"), 240);
  };

  z.addEventListener("touchstart", e => {
    /* Un geste né sur une commande lui appartient : les trois verdicts et la
       croix ne doivent pas faire glisser la bande sous le doigt. */
    suit = !z.hidden && e.touches.length === 1 && !e.target.closest("button, a");
    if (!suit) return;
    const t = e.touches[0];
    x0 = xs = t.clientX; y0 = ys = t.clientY; ts = e.timeStamp;
    dx = dy = vx = vy = 0; axe = null;
    const i = img();
    if (i) i.style.transition = "none";
  }, { passive: true });

  z.addEventListener("touchmove", e => {
    if (!suit || e.touches.length !== 1) return;
    const t = e.touches[0], ex = t.clientX - x0, ey = t.clientY - y0;
    if (!axe) {
      const ax = Math.abs(ex), ay = Math.abs(ey);
      if (Math.max(ax, ay) < PH_COURSE) return;
      if (ax > ay * PH_DOMINANCE) axe = "x";
      else if (ay > ax * PH_DOMINANCE) axe = "y";
      else return;
    }
    const dt = e.timeStamp - ts;
    if (dt > 0) {
      vx = (t.clientX - xs) / dt; vy = (t.clientY - ys) / dt;
      xs = t.clientX; ys = t.clientY; ts = e.timeStamp;
    }
    /* Aux deux bouts, la course résiste au lieu de céder : la bande dit qu'elle
       est finie sans rien faire de brutal. */
    if (axe === "x") dx = horsBande(photoIndex - Math.sign(ex)) ? ex * PH_RESIST : ex;
    else dy = horsReserve(photoRang - Math.sign(ey)) ? ey * PH_RESIST : ey;
    e.preventDefault();
    poser();
  }, { passive: false });

  const fini = () => {
    if (!suit || !axe) { suit = false; axe = null; return; }
    const axeFini = axe;
    suit = false; axe = null;
    if (axeFini === "x") {
      const k = photoIndex - Math.sign(dx);
      const assez = Math.abs(dx) > z.clientWidth / 5 || Math.abs(vx) > PH_VITESSE;
      if (assez && !horsBande(k)) { marquerGlisse(z); allerPhoto(k, Math.sign(dx)); return; }
      rendre();
      return;
    }
    const assez = Math.abs(dy) > z.clientHeight / 6 || Math.abs(vy) > PH_VITESSE;
    const k = photoRang - Math.sign(dy);
    // Vers le bas depuis le premier rang : c'est une fermeture.
    if (assez && dy > 0 && photoRang === 0) {
      if (Math.abs(dy) > PH_FERMER || Math.abs(vy) > PH_VITESSE) {
        marquerGlisse(z);
        z.style.removeProperty("opacity");
        fermerPhoto();
        return;
      }
    } else if (assez && !horsReserve(k)) {
      marquerGlisse(z);
      allerRang(k, Math.sign(dy));
      return;
    }
    rendre();
  };
  z.addEventListener("touchend", fini);
  z.addEventListener("touchcancel", fini);
}

// Un glissement ne doit pas valoir pour un appui sur le fond.
function marquerGlisse(z) {
  z.dataset.glisse = "1";
  setTimeout(() => { delete z.dataset.glisse; }, 320);
}

/* La photographie sortante achève la course du doigt, la suivante entre du côté
   d'où elle vient : le mouvement ne s'interrompt pas au milieu. */
function glisserVers(rendu, sens, axe) {
  const z = $("photoPlein");
  if (!z) return;
  const course = axe === "x" ? z.clientWidth : z.clientHeight;
  const nom = axe === "x" ? "translateX" : "translateY";
  const sortante = z.querySelector(".ph-grande");
  if (sortante) {
    sortante.style.transition = "transform .16s ease-out, opacity .16s ease-out";
    sortante.style.transform = `${nom}(${sens * course}px)`;
    sortante.style.opacity = "0";
  }
  setTimeout(() => {
    rendu();
    const e = z.querySelector(".ph-grande");
    if (!e) return;
    e.style.transition = "none";
    e.style.transform = `${nom}(${-sens * course}px)`;
    e.style.opacity = "0";
    requestAnimationFrame(() => {
      e.style.transition = "transform .2s cubic-bezier(.22,.61,.36,1), opacity .2s";
      e.style.transform = "";
      e.style.opacity = "";
      setTimeout(() => {
        e.style.removeProperty("transition");
        e.style.removeProperty("transform");
        e.style.removeProperty("opacity");
      }, 220);
    });
  }, sortante ? 160 : 0);
}

// Changer d'organe rouvre au premier rang de sa réserve.
function allerPhoto(k, sens) {
  if (k < 0 || k >= photosVues.length) return;
  glisserVers(() => ouvrirPhoto(k, 0), sens, "x");
}

// Changer de rang garde l'organe.
function allerRang(k, sens) {
  if (k < 0 || k >= groupeVu().length) return;
  glisserVers(() => ouvrirPhoto(photoIndex, k), sens, "y");
}

brancherGlissementPhoto();

/* Le jugement se pose ici, au plein écran, là où l'on regarde la photographie
   en grand. La bande ne porte aucun bouton : y ajouter une pastille sur chaque
   tuile encombrerait l'écran le plus regardé de la fiche pour un geste rare.

   Un seul des trois verdicts change ce qui est affiché. Les deux autres sont
   une note de qualité, qui vaut caution pour l'un et demande de remplacement
   pour l'autre. */

/* Ce que le contrôle automatique a relevé au dernier audit, posé devant la
   personne qui juge. Le contrôle est une suspicion et l'avis un verdict : il
   ne décide de rien, il dit où regarder. La ligne ne paraît qu'à qui peut
   juger, et seulement quand il y a quelque chose à dire. */
function motifsControle(x) {
  if (!session || !x.controle_motifs || !x.controle_motifs.length) return "";
  return `<p class="ph-controle">Le contrôle signale : `
    + esc(enumerer(x.controle_motifs, x.controle_motifs.length)) + `.</p>`;
}

function boutonsAvis(x) {
  if (!session || !x.id) return "";
  const mien = avisPhoto.get(x.id) || "";
  return `<div class="ph-avis" role="group" aria-label="Juger cette photographie">`
    + Object.keys(AVIS_NOM).map(a =>
        `<button type="button" class="av-b av-${a}" data-avis="${a}"`
        + ` aria-pressed="${a === mien}">${esc(AVIS_NOM[a])}</button>`).join("")
    + `</div>`;
}

function brancherAvis(x) {
  const z = $("photoPlein");
  if (!z) return;
  z.querySelectorAll("[data-avis]").forEach(b => b.addEventListener("click", async e => {
    e.stopPropagation();
    const a = b.dataset.avis;
    const ancien = avisPhoto.get(x.id) || "";
    if (a === ancien) { await retirerAvisPhoto(x.id); }
    else { await poserAvisPhoto(x.id, a); }
    const annuler = avisPhoto.get(x.id) === "supprimer" ? {
      libelle: "Annuler", faire: async () => {
        const rang = photoRang, org = x.organe;
        await retirerAvisPhoto(x.id);
        await rejugerPhoto(x.id, rang, org);
      } } : null;
    await rejugerPhoto(x.id, photoRang, x.organe, annuler);
  }));
}

/* Le mot qui suit un avis se pose dans l'écran noir, non dans le bandeau de la
   page, qui est derrière et qu'on ne voit pas. Il s'efface de lui-même. */
function motPhoto(texte, action) {
  const z = $("photoPlein");
  if (!z || z.hidden) { info(texte, false, action); return; }
  if (minuteurMot) { clearTimeout(minuteurMot); minuteurMot = null; }
  z.querySelectorAll(".ph-mot").forEach(e => e.remove());
  const m = document.createElement("p");
  m.className = "ph-mot";
  m.setAttribute("role", "status");
  m.textContent = texte;
  if (action) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pm-action"; b.textContent = action.libelle;
    b.addEventListener("click", e => { e.stopPropagation(); m.remove(); action.faire(); });
    m.appendChild(b);
  }
  z.appendChild(m);
  minuteurMot = setTimeout(() => m.remove(), action ? 12000 : 4500);
}

/* Un avis change l'ordre : la photographie regardée peut monter, descendre, ou
   quitter la série. On reste dans l'organe et on suit ce qui prend sa place,
   plutôt que de renvoyer à la fiche. L'écran ne se referme que si l'organe n'a
   plus rien à montrer. */
async function rejugerPhoto(image_id, avant, organe, action) {
  const z = $("fPhotos");
  const p = z && z.dataset.plante
    ? plantes.find(y => String(y.id) === z.dataset.plante) : null;
  if (!p) return;
  poserPhotos(p);
  const groupes = await chargerPhotos(p.id);
  photosVues = groupes;
  const i = groupes.findIndex(g => g.length && g[0].organe === organe);
  if (i === -1) {
    fermerPhoto();
    info("Plus aucune photographie pour cet organe.", false, action);
    return;
  }
  const g = groupes[i];
  const r = g.findIndex(y => y.id === image_id);
  if (r === -1) {
    ouvrirPhoto(i, Math.min(avant, g.length - 1));
    motPhoto(`Écartée. ${g.length} photographie${g.length > 1 ? "s" : ""} `
      + `pour cet organe.`, action);
    return;
  }
  ouvrirPhoto(i, r);
  if (r !== avant) {
    motPhoto(r === 0 ? "Passée en tête pour cet organe."
      : r > avant ? `Descendue au rang ${r + 1} sur ${g.length}.`
      : `Remontée au rang ${r + 1} sur ${g.length}.`, action);
  } else if (action) motPhoto("Écartée de votre fiche.", action);
}

/* La bande de la fiche ouverte se refait, la fiche pouvant être fermée entre
   temps. */
function rafraichirPhotos() {
  const z = $("fPhotos");
  if (!z || !z.dataset.plante) return;
  const p = plantes.find(x => String(x.id) === z.dataset.plante);
  if (p) poserPhotos(p);
}

function fermerPhoto() {
  const z = $("photoPlein");
  if (!z || z.hidden) return;
  z.hidden = true;
  // Un geste interrompu peut avoir laissé le fond à demi effacé.
  z.style.removeProperty("opacity");
  z.innerHTML = "";
  if ($("feuille").hidden) document.body.classList.remove("fige");
}

function ouvrirFeuille(p, onglet) {
  fermerGlose();
  rangerBlocs();
  /* Une fiche ouverte depuis une feuille garde le chemin de celle qu'elle
     recouvre, comme une feuille ouverte depuis une autre. Ouverte depuis un
     écran, elle n'a pas de chemin de retour. */
  if (vueCourante && !$("feuille").hidden) pileFeuille.push(vueCourante);
  vueCourante = null;
  planteFeuille = p;
  $("feuille-titre").innerHTML = esc(p.nom)
    + (p.latin ? `<span class="feuille-latin"><i>${esc(p.latin)}</i>${p.famille ? ` · ${esc(p.famille)}` : ""}</span>` : "");
  $("feuille-corps").innerHTML = ficheHTML(p, onglet);
  brancherFiche(p);
  poserPhotos(p);
  chargerEau(p).then(() => majEau(p)).catch(() => {});
  $("feuille-corps").scrollTop = 0;
  poserRetour();
  poserEtatFeuille();
  $("voile").hidden = false;
  $("feuille").hidden = false;
  document.body.classList.add("fige");
  requestAnimationFrame(() => {
    $("voile").classList.add("visible");
    $("feuille").classList.add("ouverte");
    $("feuille").focus();
  });
}

/* Glisser la feuille vers le bas la ferme. Le geste part de n'importe quel
   point, à une condition : que le corps soit déjà en haut de son défilement,
   sinon c'est le contenu qui glisse. C'est la règle de toutes les feuilles de
   téléphone, et elle évite d'avoir à viser la croix ou la poignée.

   Le seuil seul ne suffit pas : un geste vif et court est une intention de
   fermeture aussi nette qu'une longue course, la vitesse est donc mesurée. */
const TIRER_SEUIL = 96, TIRER_VITESSE = 0.55;

function brancherGlissementFeuille() {
  const f = $("feuille"), corps = $("feuille-corps"), voile = $("voile");
  if (!f || !corps || !voile) return;
  let y0 = 0, t0 = 0, dy = 0, vy = 0, yv = 0, tv = 0, suit = false, pris = false;

  const poser = v => {
    f.style.setProperty("--tirer", v.toFixed(1) + "px");
    voile.style.opacity = String(Math.max(0.06, 1 - v / 300));
  };
  const relacher = () => {
    f.classList.remove("tire");
    voile.style.removeProperty("opacity");
  };

  f.addEventListener("touchstart", e => {
    if (e.touches.length !== 1 || f.hidden) { suit = false; return; }
    const t = e.touches[0];
    y0 = yv = t.clientY; t0 = tv = e.timeStamp; dy = 0; vy = 0; pris = false;
    /* Le geste n'appartient à la feuille que si le contenu ne peut plus
       descendre. Un geste né hors du corps, sur la poignée ou l'entête, lui
       appartient toujours. */
    suit = !corps.contains(e.target) || corps.scrollTop <= 0;
  }, { passive: true });

  f.addEventListener("touchmove", e => {
    if (!suit || e.touches.length !== 1) return;
    const t = e.touches[0], d = t.clientY - y0;
    if (!pris) {
      // Un geste qui monte appartient au contenu, il ne sera pas repris.
      if (d < -4) { suit = false; return; }
      if (d < 8) return;
      pris = true;
      f.classList.add("tire");
    }
    const dt = e.timeStamp - tv;
    if (dt > 0) { vy = (t.clientY - yv) / dt; yv = t.clientY; tv = e.timeStamp; }
    dy = Math.max(0, d);
    e.preventDefault();
    poser(dy);
  }, { passive: false });

  const fini = () => {
    if (!pris) { suit = false; return; }
    suit = pris = false;
    if (dy >= TIRER_SEUIL || vy >= TIRER_VITESSE) {
      /* La transition reprend la main au même instant : elle part de la
         position atteinte par le doigt et va jusqu'en bas, d'un seul trait. */
      relacher();
      f.style.removeProperty("--tirer");
      fermerFeuille();
      return;
    }
    relacher();
    f.style.setProperty("--tirer", "0px");
    setTimeout(() => f.style.removeProperty("--tirer"), 260);
  };
  f.addEventListener("touchend", fini);
  f.addEventListener("touchcancel", fini);
}
brancherGlissementFeuille();

function fermerFeuille() {
  fermerPhoto();
  if ($("feuille").hidden) return;
  rangerBlocs();
  pileFeuille = [];
  vueCourante = null;
  planteFeuille = null;
  saisiePartout = null;
  poserRetour();
  fermerGlose();
  $("voile").classList.remove("visible");
  $("feuille").classList.remove("ouverte");
  document.body.classList.remove("fige");
  setTimeout(() => { $("feuille").hidden = true; $("voile").hidden = true; }, 220);
}

// La fermeture passe par l'historique quand la feuille y a posé son entrée,
// pour que le geste de retour du téléphone et la croix aient le même effet.
function sortirFeuille() {
  if ($("feuille").hidden) return;
  if (history.state && history.state.feuille) { history.back(); return; }
  fermerFeuille();
}

/* La définition se pose sous le mot touché, dans le repère du corps de la
   feuille : elle suit donc le défilement sans calcul supplémentaire. Sa largeur
   est bornée à celle du corps pour qu'elle ne déborde jamais de l'écran. */
function ouvrirGlose(bouton) {
  fermerGlose();
  const corps = $("feuille-corps");
  /* Deux emplois du même volet : un terme du glossaire, dont la définition vient
     du référentiel, et une note portée par le bouton lui-même, ce dont se sert
     l'attribution des photographies. */
  const terme = bouton.dataset.terme;
  const titre = terme || bouton.dataset.titre || "";
  const def = terme ? defGloss.get(terme) : bouton.dataset.note;
  if (!corps || !def) return;
  const g = document.createElement("div");
  g.className = "glose";
  g.setAttribute("role", "note");
  g.innerHTML = `<b>${esc(titre)}</b><p>${esc(def)}</p>`;
  corps.appendChild(g);
  const rb = bouton.getBoundingClientRect(), rc = corps.getBoundingClientRect();
  const x = rb.left - rc.left + corps.scrollLeft;
  g.style.left = Math.round(Math.max(8, Math.min(x, corps.clientWidth - g.offsetWidth - 8))) + "px";
  // Sous le mot, au-dessus quand le bas de la feuille est trop proche.
  const dessous = rb.bottom + 6 + g.offsetHeight <= rc.bottom
    || rb.top - 6 - g.offsetHeight < rc.top;
  const y = dessous ? rb.bottom - rc.top + 6 : rb.top - rc.top - 6 - g.offsetHeight;
  g.style.top = Math.round(y + corps.scrollTop) + "px";
  bouton.classList.add("ouvert");
  gloseOuverte = g;
}

function fermerGlose() {
  if (!gloseOuverte) return;
  gloseOuverte.remove();
  gloseOuverte = null;
  document.querySelectorAll(".terme.ouvert").forEach(b => b.classList.remove("ouvert"));
}

document.addEventListener("click", e => {
  const b = e.target.closest ? e.target.closest(".terme") : null;
  if (b) { ouvrirGlose(b); return; }
  if (gloseOuverte && !(e.target.closest && e.target.closest(".glose"))) fermerGlose();
});

sur("voile", "click", sortirFeuille);
sur("fermerFeuille", "click", sortirFeuille);
sur("retourFeuille", "click", retourFeuille);
// La touche d'échappement referme d'abord la définition, ensuite la feuille.
document.addEventListener("keydown", e => {
  /* Le plein écran se parcourt aussi aux flèches : le geste tactile ne doit pas
     être le seul chemin d'une photographie à l'autre. */
  const plein = $("photoPlein");
  if (plein && !plein.hidden) {
    if (e.key === "Escape") { fermerPhoto(); return; }
    if (e.key === "ArrowLeft") { allerPhoto(photoIndex - 1, 1); return; }
    if (e.key === "ArrowRight") { allerPhoto(photoIndex + 1, -1); return; }
    if (e.key === "ArrowUp") { allerRang(photoRang - 1, 1); return; }
    if (e.key === "ArrowDown") { allerRang(photoRang + 1, -1); return; }
    return;
  }
  if (e.key !== "Escape") return;
  if (gloseOuverte) { fermerGlose(); return; }
  sortirFeuille();
});

/* ================== Mise en sourdine ================== */





// Une sourdine de quinzaine tombe au changement de quinzaine, une sourdine de
// période tient jusqu'à la fin de la fenêtre, une sourdine définitive ne tombe jamais.
function sourdineActive(p, k) {
  const r = sourdines.get(cleSourdine(p, k));
  if (!r) return null;
  if (r.portee === "toujours") return r;
  if (r.annee !== anneeCourante()) return null;
  if (r.portee === "quinzaine") return r.demi === demi ? r : null;
  if (r.portee === "periode") return demi <= r.fin ? r : null;
  return null;
}

async function mettreEnSourdine(p, k, portee, fin) {
  if (!jardinId) return;
  const ligne = {
    garden_id: jardinId, plant_id: p.id, phase: k, portee,
    demi: portee === "quinzaine" ? demi : null,
    fin: portee === "periode" ? fin : null,
    annee: portee === "toujours" ? null : anneeCourante(),
  };
  sourdines.set(cleSourdine(p, k), ligne);
  rendreTout();
  const { error } = await db.from("sourdines").upsert(ligne, { onConflict: "garden_id,plant_id,phase" });
  if (error) { sourdines.delete(cleSourdine(p, k)); rendreTout(); info("Masquage non enregistré : " + error.message, true); }
}

/* La tâche faite s'écrit au carnet sous le geste qui lui répond, puis se
   retire de la liste : pour la quinzaine quand le geste se répète, la
   récolte, pour le reste de sa fenêtre sinon. La protection n'a pas de geste
   au carnet, elle s'écrit en toutes lettres. Le bandeau offre de revenir en
   arrière, ce qui efface l'entrée et rend la ligne. */
const GESTE_DE_TACHE = { taille: "taille", fertilisation: "amendement",
  multiplication: "multiplication", abri: "semis", terre: "semis",
  plant: "plantation", recolte: "recolte" };

async function marquerFait(p, k, fin) {
  if (!session || !jardinId) { info("Connectez-vous pour tenir le carnet."); return; }
  const lieux = espacesDe(p.id);
  const geste = GESTE_DE_TACHE[k] || null;
  const { data, error } = await db.from("observations").insert({
    garden_id: jardinId, plant_id: p.id, espace_id: lieux.length === 1 ? lieux[0] : null,
    jour: jourDuJour(), geste,
    texte: geste ? null : `${VERBE[k] || phases[k].label} : fait.`,
  }).select().single();
  if (error) { info("Non enregistré : " + error.message, true); return; }
  await mettreEnSourdine(p, k, k === "recolte" ? "quinzaine" : "periode", fin);
  await chargerCarnet();
  info(`${VERBE[k] || phases[k].label} ${nomAvecArticle(p)} : noté au carnet.`, false, {
    libelle: "Annuler",
    faire: async () => {
      await db.from("observations").delete().eq("id", data.id);
      await leverSourdine(p, k);
      await chargerCarnet();
    },
  });
}

async function leverSourdine(p, k) {
  const memo = sourdines.get(cleSourdine(p, k));
  sourdines.delete(cleSourdine(p, k));
  rendreTout();
  const { error } = await db.from("sourdines").delete()
    .eq("garden_id", jardinId).eq("plant_id", p.id).eq("phase", k);
  if (error && memo) { sourdines.set(cleSourdine(p, k), memo); rendreTout(); info("Réaffichage refusé : " + error.message, true); }
}

async function leverToutesSourdines(p) {
  const cles = [...sourdines.keys()].filter(c => c.startsWith(p.id + "|"));
  cles.forEach(c => sourdines.delete(c));
  rendreTout();
  const { error } = await db.from("sourdines").delete().eq("garden_id", jardinId).eq("plant_id", p.id);
  if (error) info("Réaffichage refusé : " + error.message, true);
}

/* Le rappel des tâches masquées vit dans un panneau que le calcul de l'eau
   réécrit : la délégation lui survit, un écouteur posé sur le bouton non. */
document.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-lever]");
  if (!b) return;
  const p = plantes.find(x => x.id === b.dataset.lever);
  if (!p) return;
  await leverToutesSourdines(p);
  const m = document.querySelector("#feuille-corps .f-pan-moment");
  if (m) m.innerHTML = ficheMoment(p);
});

/* ================== Glissement latéral ================== */

let glissiereOuverte = null;

function fermerTiroirs() {
  if (!glissiereOuverte) return;
  glissiereOuverte.style.transform = "";
  glissiereOuverte.parentElement.classList.remove("tiroir-ouvert");
  glissiereOuverte = null;
}

// Tolérance volontairement large : le geste est reconnu dès que l'horizontale
// domine, même de peu, pour rester praticable sur une liste qui défile.
function brancherGlissement(rangee, glissiere, gauche, droite) {
  let x0 = 0, y0 = 0, dx = 0, actif = false, verrouVertical = false;
  const lg = () => gauche ? gauche.offsetWidth : 0;
  const ld = () => droite ? droite.offsetWidth : 0;

  const debut = e => {
    if (glissiereOuverte && glissiereOuverte !== glissiere) fermerTiroirs();
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    dx = 0; actif = false; verrouVertical = false;
    glissiere.style.transition = "none";
  };

  const bouge = e => {
    if (verrouVertical) return;
    const ex = e.touches[0].clientX - x0, ey = e.touches[0].clientY - y0;
    if (!actif) {
      if (Math.abs(ey) > 16 && Math.abs(ey) > Math.abs(ex) * 1.5) { verrouVertical = true; return; }
      if (Math.abs(ex) < 8) return;
      actif = true;
      rangee.classList.add("en-glissement");
    }
    const base = glissiereOuverte === glissiere ? (dx < 0 ? -lg() : ld()) : 0;
    dx = Math.max(-lg(), Math.min(ld(), base + ex));
    glissiere.style.transform = `translateX(${dx}px)`;
  };

  const fin = () => {
    glissiere.style.transition = "";
    rangee.classList.remove("en-glissement");
    if (!actif) return;
    if (dx < -lg() / 2 && gauche) {
      glissiere.style.transform = `translateX(${-lg()}px)`; glissiereOuverte = glissiere;
    } else if (dx > ld() / 2 && droite) {
      glissiere.style.transform = `translateX(${ld()}px)`; glissiereOuverte = glissiere;
    } else {
      glissiere.style.transform = "";
      if (glissiereOuverte === glissiere) glissiereOuverte = null;
    }
    /* Le tiroir se cache au repos : sous une rangée dont le fond laisse voir le
       papier, il se lisait au travers, et ses trois boutons restaient
       atteignables sans avoir été appelés. */
    rangee.classList.toggle("tiroir-ouvert", glissiereOuverte === glissiere);
    // Un glissement ne doit pas déclencher l'ouverture de la feuille.
    glissiere.dataset.glisse = "1";
    setTimeout(() => { delete glissiere.dataset.glisse; }, 320);
  };

  glissiere.addEventListener("touchstart", debut, { passive: true });
  glissiere.addEventListener("touchmove", bouge, { passive: true });
  glissiere.addEventListener("touchend", fin);
  glissiere.addEventListener("touchcancel", fin);
}

document.addEventListener("click", e => {
  if (glissiereOuverte && !glissiereOuverte.parentElement.contains(e.target)) fermerTiroirs();
}, true);

/* Le bloc de filtres de l'écran des plantes s'ouvrait sur quinze catégories et
   occupait la hauteur de l'écran avant la première plante. Il est replié, et la
   pastille dit combien de filtres écartent quelque chose. */
function majNbFiltres() {
  const e = $("nbFiltresS");
  if (!e) return;
  let n = 0;
  if (ORDRE_TYPO.some(t => !etatTypo[t])) n++;
  if (catsVisibles(etatTypo).some(c => !etatCat[c])) n++;
  if (climatSeul) n++;
  e.textContent = n;
  e.hidden = n === 0;
  $("basculeFiltresS").setAttribute("aria-pressed", String(n > 0));
}

sur("basculeFiltresS", "click", function () {
  const ouvert = $("corpsFiltresS").hidden;
  $("corpsFiltresS").hidden = !ouvert;
  this.setAttribute("aria-expanded", String(ouvert));
});

sur("btnTout", "click", () => ouvrirDetail({ t: "tout" }));
