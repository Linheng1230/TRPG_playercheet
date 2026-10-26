const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const PDFLib = require(path.resolve("assets/vendor/pdf-lib.min.js"));

const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";
const output = path.resolve("tmp/qa-2024-layout.pdf");

(async () => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.evaluate(() => {
    document.getElementById("rulesetModal")?.classList.remove("open");
    S.ruleset = "2024"; syncRulesetUI();
    S.cls = CLASSES.find(x => x.n === "戰士");
    S.level = 20; S.classLevels = { 戰士: 20 }; S.sub = 0;
    S.sp = SPECIES_2024.find(x => x.n === "人類");
    S.spChoices = { hFeat: "警覺", hSkill: "察覺" };
    S.languageChoices = { base1: "矮人語", base2: "精靈語" };
    S.bg = BACKGROUNDS_2024.find(x => x.n === "罪犯") || BACKGROUNDS_2024[0];
    S.base = { str: 15, dex: 14, con: 15, int: 10, wis: 12, cha: 8 };
    S.skills = new Set(["運動", "察覺", "隱匿", "威嚇"]);
    S.gear = {
      armor: "板甲", unarmored: "auto", shield: true,
      weapons: ["長劍", "匕首", "短弓", "戰鎬"],
      miscAC: 0, miscLabel: "",
      items: "治療藥水 × 2、攀爬工具、繩索、火把、口糧、旅行者服裝、紀念品、盜賊工具、骰子組、背包",
      gold: { pp: 0, gp: 85, sp: 2, cp: 4 }
    };
    S.bio.look = "85歲，銀白短髮、灰藍色眼睛，右眉有一道舊傷；身形精瘦但結實，總是穿著保養良好的深色旅行衣與皮革手套。";
    S.bio.story = "索倫出生於偏遠城鎮，年少時捲入地方幫派，後來因一次失敗的任務失去同伴，從此離開地下世界。多年來他遊歷各地，替商隊護衛、替村落清除怪物，也曾受雇於地方領主。".repeat(4);
    S.bio.traits = "做事之前總會先確認退路；不輕易相信陌生人，但一旦承諾就會做到；對工具與武器保養近乎偏執。".repeat(4);
    const c = document.createElement("canvas"); c.width = 300; c.height = 400;
    const x = c.getContext("2d"); x.fillRect(0, 0, 300, 400); x.clearRect(55, 60, 190, 280);
    S.portrait = c.toDataURL("image/jpeg", .85);
    document.getElementById("fName").value = "PDF壓力測試戰士";
    update();
  });

  const downloadPromise = page.waitForEvent("download");
  await page.evaluate(() => exportOfficialCharacterSheet());
  const download = await downloadPromise;
  await download.saveAs(output);

  const state = await page.evaluate(() => ({
    fit: window.__lastPdfFitReport,
    portrait: window.__lastPdfPortraitEmbedded
  }));
  await browser.close();

  if (!state.portrait) throw new Error("2024 portrait was not embedded");
  for (const [name, result] of Object.entries(state.fit || {})) {
    if (result?.overflow) throw new Error(`2024 PDF field overflow: ${name}`);
  }

  const doc = await PDFLib.PDFDocument.load(fs.readFileSync(output));
  const form = doc.getForm();
  const left = form.getTextField("class-a-1").getText() || "";
  const right = form.getTextField("class-a-2").getText() || "";
  if (!left || !right) throw new Error("2024 class features did not split across both columns");
  if (!(form.getTextField("BG_AND_PER").getText() || "")) throw new Error("2024 background/personality export missing");
  const languages=form.getTextField("Lang").getText()||"";
  if(!languages.includes("通用語")||!languages.includes("矮人語")||!languages.includes("精靈語"))throw new Error("2024 PDF languages missing or stale: "+languages);

  console.log(JSON.stringify({
    portrait: state.portrait,
    classFeatureSize: state.fit.classFeatures.size,
    backgroundSize: state.fit.background.size,
    equipmentSize: state.fit.equipment.size,
    classColumns: [left.length, right.length]
  }));
})().catch(error => { console.error(error); process.exit(1); });
