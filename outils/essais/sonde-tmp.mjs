import { chromium } from "playwright";
import { ouvrirContexte, CATALOGUE } from "./commun.mjs";
const PL = JSON.parse(CATALOGUE).plants;
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM });
const { ctx, pg, erreurs } = await ouvrirContexte(nav, { jardin: PL.slice(0, 8).map(p => p.id) });
await pg.setViewportSize({ width: 393, height: 852 });
await pg.waitForTimeout(800);
await pg.locator("#blocTemps .tm-temps").click();
await pg.waitForTimeout(800);
await pg.locator('[data-mode="liste"]').click();
await pg.waitForTimeout(600);
await pg.screenshot({ path: "/tmp/u-liste1.png" });
await pg.evaluate(() => { document.querySelector(".hh-defile").scrollLeft = 400; });
await pg.waitForTimeout(400);
await pg.screenshot({ path: "/tmp/u-liste2.png" });
for (const L of [320, 430]) {
  await pg.setViewportSize({ width: L, height: 852 });
  await pg.waitForTimeout(400);
  console.log(L + " pt :", JSON.stringify(await pg.evaluate(() => ({
    deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    cadre: Math.round(document.querySelector(".hh-defile").clientWidth),
    table: Math.round(document.querySelector(".hh-table").scrollWidth),
  }))));
}
console.log("erreurs :", erreurs.length, erreurs.slice(0, 3));
await ctx.close(); await nav.close();
