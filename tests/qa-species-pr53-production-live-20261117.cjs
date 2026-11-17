"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { chromium } = require("playwright");

const SITE = "https://linheng1230.github.io/TRPG_playercheet/";
const SHA = "7f6fed34a36339d257d3f17dd174fbd2bda3f044";
const OUTPUT = path.resolve("species-pr53-live-evidence");
fs.mkdirSync(OUTPUT, { recursive: true });
const report = { site: SITE, expectedCommit: SHA, checkedAt: new Date().toISOString(), checks: [], views: [], result: "RUNNING" };
const check = (name, cond) => { assert(cond, name); report.checks.push(name); };

async function welcome(page) {
  await page.waitForSelector("#fileInput", { state: "attached", timeout: 20000 });
  await page.waitForTimeout(450);
  if (await page.locator("#rulesetModal.open").count()) await page.locator("#closeRuleset").click();
}

async function seedOnPublishedSite(browser, marker) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 850 } });
  try {
    const page = await ctx.newPage();
    await page.goto(SITE + "index.html?seed=" + encodeURIComponent(marker), { waitUntil: "networkidle", timeout: 60000 });
    await welcome(page);
    const character = await page.evaluate(marker => {
      resetAll();
      S.ruleset = "2024";
      syncRulesetUI();
      S.cls = CLASSES.find(x => x.n === "德魯伊");
      S.sub = PROG_2024["德魯伊"].subs.findIndex(x => x.n === "星辰結社");
      S.sp = SPECIES_2024.find(x => x.n === "精靈");
      S.spChoices = { eLine: "卓爾", eCast: "wis" };
      S.level = 4;
      S.classLevels = { "德魯伊": 4 };
      S.base = { str: 12, dex: 14, con: 14, int: 10, wis: 18, cha: 12 };
      S.play = { hp: null, hpMax: null, thp: 0, hd: null, ds: { s: 0, f: 0 }, insp: false, res: {}, resMax: {}, custom: [], notes: "QA_" + marker };
      S.slotsUsed = { l1: 1, l2: 0 };
      S.id = marker;
      document.getElementById("fName").value = "QA_" + marker;
      renderFinal();
      const data = serialize();
      data.id = marker;
      return data;
    }, marker);
    check("Published-site seed uses 2024 edition", character.ruleset === "2024");
    check("Published-site fixture serializes Drow", JSON.stringify(character).includes("卓爾"));
    return character;
  } finally { await ctx.close(); }
}

async function openPlay(page) {
  const nav = page.locator("#stepNav .nav-primary button").filter({ hasText: "跑團狀態" });
  check("Visible play status navigation", await nav.count() === 1);
  await nav.click();
  await page.locator("#psResources").waitFor({ state: "visible", timeout: 12000 });
}

async function testWidth(browser, width) {
  const marker = "QA_PR53_LIVE_" + width + "_" + Date.now();
  const character = await seedOnPublishedSite(browser, marker);
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, acceptDownloads: true });
  try {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("dialog", d => d.accept());
    await page.goto(SITE + "index.html?pr53=" + encodeURIComponent(marker), { waitUntil: "domcontentloaded", timeout: 60000 });
    await welcome(page);
    await page.locator("#fileInput").setInputFiles({ name: marker + ".json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(character), "utf8") });
    await openPlay(page);

    const cantrip = page.locator("#psResources .ps-species-unlimited").filter({ hasText: "舞光術" });
    check(width + ": Dancing Lights at-will visible", await cantrip.count() === 1);
    check(width + ": Dancing Lights has no counter buttons", await cantrip.locator("button").count() === 0);

    const faerie = page.locator('#psResources [data-ps-resource^="species-cast:"]').filter({ hasText: "妖火" });
    const darkness = page.locator('#psResources [data-ps-resource^="species-cast:"]').filter({ hasText: "黑暗術" });
    check(width + ": Faerie Fire free cast visible exactly once", await faerie.count() === 1);
    check(width + ": Darkness remains gated at level 5", await darkness.count() === 0);
    check(width + ": Free cast initially unused", (await faerie.innerText()).includes("已使用 0 / 1"));
    check(width + ": Wild Shape unchanged", await page.locator('#psResources [data-ps-resource="ws"]').count() === 1);
    check(width + ": Stars Guiding Bolt unchanged", await page.locator('#psResources [data-ps-resource="stars-guiding-bolt"]').count() === 1);

    const slot = page.locator('#psSlots [data-ps-action="slot"][data-ps-key="l1"][data-ps-delta="1"]');
    check(width + ": First-level slot is interactive", await slot.isVisible());
    const slotCount = () => slot.locator("xpath=../..").locator(".ps-count").innerText();
    const startingSlots = await slotCount();

    const spend = () => faerie.locator('button[data-ps-action="res"][data-ps-delta="1"]').click();
    await spend();
    check(width + ": Clicking uses Faerie Fire free charge", (await faerie.innerText()).includes("已使用 1 / 1"));
    check(width + ": Spending free charge does not consume spell slots", (await slotCount()) === startingSlots);
    await page.locator('#playStatusBody [data-ps-action="undo"]').click();
    check(width + ": Undo returns the free charge", (await faerie.innerText()).includes("已使用 0 / 1"));

    await slot.click();
    check(width + ": Spending a spell slot does not spend free Faerie Fire", (await faerie.innerText()).includes("已使用 0 / 1"));
    await page.locator('#playStatusBody [data-ps-action="undo"]').click();
    check(width + ": Undo returns spell slot", (await slotCount()) === startingSlots);

    await spend();
    await page.locator('#playStatusBody [data-ps-action="rest-short"]').click();
    await page.locator('#psRestDialog [data-rest-submit]').click();
    check(width + ": Short rest does not recover free charge", (await faerie.innerText()).includes("已使用 1 / 1"));
    await page.locator('#psRestDialog [data-rest-close]').click();

    await page.waitForTimeout(1600);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await welcome(page);
    await openPlay(page);
    check(width + ": Fresh browser reload persists spent Faerie Fire", (await faerie.innerText()).includes("已使用 1 / 1"));

    await page.locator('#playStatusBody [data-ps-action="rest-long"]').click();
    check(width + ": Long rest recovers free charge", (await faerie.innerText()).includes("已使用 0 / 1"));
    await page.locator('#psRestDialog [data-rest-close]').click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(width + ": No horizontal overflow", overflow <= 2);
    check(width + ": No page JS errors", errors.length === 0);

    const screenshot = path.join(OUTPUT, "species-pr53-live-" + width + "-20261117.png");
    await page.locator("#psResources").screenshot({ path: screenshot, timeout: 20000 });
    report.views.push({ width, result: "PASS", overflow, screenshot, assertions: report.checks.filter(x => x.startsWith(width + ":")).length });
    console.log("PASS species free-cast LIVE UAT", width, "overflow", overflow, "screenshot", screenshot);
  } finally { await ctx.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await testWidth(browser, 390);
    await testWidth(browser, 1440);
    report.result = "PASS";
    console.log("LIVE_UAT_PASS", JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(e => {
  report.result = "FAIL";
  report.error = String(e.stack || e);
  console.error("LIVE_UAT_FAIL", report.error);
  process.exitCode = 1;
}).finally(() => {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUTPUT, "report.json"), JSON.stringify(report, null, 2));
});
