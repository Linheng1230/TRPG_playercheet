"use strict";
/* Real-player UI regression for 30's humorous quiz. Keeps 20's option IDs and real Creator separate. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = (process.env.QA_BASE || "http://127.0.0.1:18766/").replace(/\/?$/, "/");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 480, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(base + "academy.html", { waitUntil: "networkidle" });
      const questions = await page.evaluate(() => ZIZI_CLASS_FIT_5R.questions());
      assert.equal(questions.length, 10);
      const chosen = {}; const artSeen=new Set();
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const heading = page.locator(".academy-panel h3");
        assert.equal(await heading.count(), 1, "one question heading");
        const headingText = await heading.innerText();
        assert.notEqual(headingText, q.prompt, "fun question text must replace flat prompt");
        assert(headingText.length >= 12, "shortest mobile heading is still readable");
        assert((await page.locator(".academy-caption").allTextContents()).some(s => s.includes("原題意：" + q.prompt)));
        const art=page.locator(".academy-question-art");
        await art.evaluate(async img=>{await img.decode();if(!img.naturalWidth)throw Error("question art not decoded")});
        artSeen.add(await art.getAttribute("src"));
        assert(await page.locator(".academy-choice-list").evaluate(e=>e.scrollWidth<=e.clientWidth+2),"choice grid overflow");
        const choices = page.locator(".academy-choice-list .academy-choice");
        assert.equal(await choices.count(), 4, "exactly four options at Q" + (i + 1));
        for (let j = 0; j < 4; j++) {
          const option = choices.nth(j);
          assert.match(await option.innerText(), new RegExp("^" + "ABCD"[j] + "．"));
          assert.equal(await option.locator(".academy-quiz-meaning").innerText(), "玩法偏好：" + q.options[j].text);
          assert.equal(await option.locator(".academy-quiz-meaning").isVisible(), true, "meaning visible without hover");
          const box = await option.boundingBox();
          assert(box && box.height >= 44, "touch target height under 44px");
        }
        const pick = i % 4;
        chosen[q.id] = "ABCD"[pick];
        await choices.nth(pick).click();
        assert.equal(await choices.nth(pick).getAttribute("aria-pressed"), "true");
        const next = page.locator(".academy-nav button").last();
        assert.equal(await next.isEnabled(), true);
        await next.click();
        if (i === 4) {
          await page.reload({ waitUntil: "networkidle" });
          assert.match(await page.locator(".academy-progress").innerText(), /6\s*\/\s*10/);
        }
      }
      assert.equal(artSeen.size,10);
      const expected = await page.evaluate(answers => ZIZI_CLASS_FIT_5R.evaluate(answers, DND5RAcademyCatalog2024), chosen);
      assert.equal(expected.status, "READY");
      const visibleNames = await page.locator("#academyResult1 h3,#academyResult2 h3,#academyResult3 h3").allTextContents();
      assert.deepEqual(visibleNames, expected.recommendations.map(r => r.className), "UI result unchanged");
      assert.equal(new Set(visibleNames).size, 3);
      const icons=page.locator(".academy-result-card .academy-class-art");
      assert.equal(await icons.count(),3);
      await icons.evaluateAll(async imgs=>{await Promise.all(imgs.map(async img=>{await img.decode();if(!img.naturalWidth)throw Error("class art not decoded")}))});
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(overflow <= 2, "horizontal overflow " + overflow + " at " + width);
      assert.deepEqual(errors, [], "browser page errors");
      results.push({ width, promptCount: 10, options: 40, resultCount: 3, overflow, pageErrors: 0 });
      await ctx.close();
    }
    console.log("PASS ACADEMY_QUIZ_DIALOGUE_BROWSER " + JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error("FAIL ACADEMY_QUIZ_DIALOGUE_BROWSER", e.stack); process.exit(1); });
