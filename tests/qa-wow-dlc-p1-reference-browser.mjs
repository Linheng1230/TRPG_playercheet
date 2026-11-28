import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

/**
 * SYNTHETIC browser smoke only. Does not certify paid source entitlement,
 * actual production Pages, private GM data, Lv3 character Save or Native UAT.
 */
const base = (process.env.QA_BASE || "http://127.0.0.1:18777").replace(/\/$/, "");
const url = base + "/tests/fixtures/wow-dlc-p1-reference.html";
const screenshots = new URL("../tmp/", import.meta.url);
const browsers = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 480, height: 820 },
  { label: "phone", width: 390, height: 844 },
];
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let checks = 0;
try {
  for (const size of browsers) {
    const page = await browser.newPage({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
    });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(String(error)));
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded" });
      assert.equal(response?.status(), 200, size.label + " source fixture HTTP 200");
      // Browser responses must contain only the reduced public-safe snapshot.
      // Merely hiding raw V2 fields in the DOM would still leak them via HTML.
      const servedHtml = await response.text();
      assert.doesNotMatch(servedHtml,
        /proposedZhName|sourceBridgeSHA256|sourceNative78SHA256|rulebookTableReferenceGp|privateFullBody|licensedRulesText/,
        size.label + " no raw private V2 fields sent to browser");
      checks++;
      await page.waitForFunction(() => window.wowP1Mount?.ok === true);
      const items = page.locator(".wow-p1-reference__item");
      assert.equal(await items.count(), 118, size.label + " render 118");
      checks++;
      assert.equal(await page.locator(".wow-p1-reference__item-status")
        .filter({ hasText: "數值衝突" }).count(), 1);
      assert.equal(await page.getByText("私有候選譯名不可顯示").count(), 0);
      checks++;
      const conflict = items.filter({ hasText: "wowFish4RareReso" });
      assert.equal(await conflict.count(), 1);
      assert.match(await conflict.innerText(), /數值衝突/);
      assert.doesNotMatch(await conflict.innerText(), /參考值 0 GP/);
      checks++;
      const select = page.getByLabel("魔獸素材來源分類");
      await select.selectOption("archaeologyFragment");
      assert.equal(await items.count(), 34);
      assert.equal(await page.getByText("原生價格 0 GP｜不代表免費").count(), 34);
      checks++;
      const search = page.getByLabel("搜尋魔獸素材原文名稱");
      await search.fill("Synthetic archaeologyFragment 5");
      assert.equal(await items.count(), 1);
      await search.fill("does-not-exist");
      assert.match(await page.locator(".wow-p1-reference__empty").innerText(), /沒有符合/);
      await search.fill("");
      await select.selectOption("all");
      assert.equal(await items.count(), 118);
      checks++;
      assert.equal(await page.getByRole("button", { name: /購買|製作|領取|授予/ }).count(), 0);
      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth > window.innerWidth + 1), false,
      size.label + " no horizontal overflow");
      checks++;
      assert.deepEqual(pageErrors, [], size.label + " no uncaught browser exceptions");
      checks++;
      await page.screenshot({
        path: new URL("qa-wow-p1-" + size.label + ".png", screenshots).pathname,
        fullPage: false,
      });
      const revoked = await page.evaluate(() => window.wowP1Revoke());
      assert.equal(revoked.ok, false, size.label + " invalid source rejected");
      assert.equal(await items.count(), 0, size.label + " stale P1 entries cleared");
      assert.equal(await page.locator(".wow-p1-reference").count(), 0,
        size.label + " stale P1 panel removed after revocation");
      checks++;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
assert.equal(checks, 27);
console.log(JSON.stringify({
  status: "PASS_SYNTHETIC_P1_CHROMIUM_BROWSER_ONLY",
  viewports: browsers.map(x => x.label + ":" + x.width),
  assertions: checks,
  actualPlayerUI: "NOT_VERIFIED",
  privateSourceEntitlement: "NOT_VERIFIED",
  production: "HOLD",
}));
