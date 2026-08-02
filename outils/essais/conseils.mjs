/* Justesse du conseil affiché sur l'écran du moment. Les trois plantes
   retenues sont celles dont un défaut a été relevé au fil du projet : la
   glycine recevait son texte d'hiver en août, la framboise employait le mot
   canne sans le gloser, la lavande devait avertir sur le vieux bois. */
import { ouvrirContexte, journal, net } from "./commun.mjs";

export default async function essai(navigateur) {
  const j = journal("Conseils de l'écran du moment");
  const { ctx, pg, erreurs } = await ouvrirContexte(navigateur);

  await pg.locator(".syn-ligne", { hasText: "Tailler" }).click();
  await pg.waitForTimeout(700);
  const lignes = await pg.locator("#maintenant .action").allInnerTexts();
  const dit = nom => {
    const t = lignes.find(x => new RegExp("^" + nom).test(x.trim()));
    return t ? net(t.split("\n").slice(1).join(" ")) : "";
  };

  j.section("glycine, taille d'août et non taille d'hiver");
  const glycine = dit("Glycine");
  j.controle("le conseil est celui de la période en cours",
    /Taille d'été/.test(glycine) && !/Taille d'hiver/.test(glycine), glycine.slice(0, 70));
  j.controle("il donne la longueur de rabattage",
    /cinq ou six feuilles/.test(glycine));

  j.section("framboise, le mot canne est glosé");
  const framboise = dit("Framboise");
  j.controle("le terme du métier est employé", /cannes/.test(framboise), framboise.slice(0, 70));
  j.controle("il est expliqué sur place", /tiges du framboisier/.test(framboise));

  j.section("lavande, avertissement sur le vieux bois");
  const lavande = dit("Lavande");
  j.controle("le conseil met en garde", /vieux bois/.test(lavande), lavande.slice(0, 70));

  await ctx.close();
  return j.fin(erreurs);
}
