"use strict";
/**
 * Workstream 90: independent, READ-ONLY new-player-academy release intake.
 * This is NOT approval to deploy. A passing filename or design spec is never a QA PASS.
 * Run: node tests/qa-new-player-academy-intake.js
 */
const fs = require("fs");
const path = require("path");
const child = require("child_process");
const crypto = require("crypto");
const root = path.resolve(__dirname, "..");
const docsDir = path.join(root, "docs");
const assetsDir = path.join(root, "assets");
const testsDir = path.join(root, "tests");
const fixturePath = path.join(testsDir, "fixtures", "new-player-academy-qa-cases.json");

function git(...args) {
  try { return child.execFileSync("git", args, {cwd: root, encoding:"utf8", timeout:10000}).trim(); }
  catch (e) { return "ERROR: " + String(e.message); }
}
function files(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(n => pattern.test(n)).sort();
}
function hash(file) {
  return fs.existsSync(file) ? crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") : null;
}
function stage(id, sourceCandidates, testCandidates, explanation) {
  return {id, status:"PENDING", sourceCandidates, testCandidates, explanation,
    note:"File presence is not implementation or passing behavioral evidence"};
}
const quizSpec = path.join(docsDir, "NEW_PLAYER_CLASS_FIT_QUIZ_SPEC_20261116.md");
const quizText = fs.existsSync(quizSpec) ? fs.readFileSync(quizSpec, "utf8") : "";
const docCandidates = files(docsDir,/ACADEMY|NEW_PLAYER|BEGINNER|新手/i);
const contractCandidates = docCandidates.filter(n => /CONTRACT|契約|_00|ARCHITECTURE/i.test(n));
const codeCandidates = files(assetsDir,/ACADEMY|NEW.?PLAYER|BEGINNER|QUIZ|TUTORIAL|LESSON|ONBOARD|LEARN/i);
const qaCandidates = files(testsDir,/ACADEMY|NEW.?PLAYER|BEGINNER|QUIZ|TUTORIAL|LESSON|ONBOARD|ROUNDTRIP/i)
  .filter(n => !["qa-new-player-academy-intake.js","qa-new-player-academy-quiz-corpus.js","qa-new-player-academy-pdf-visibility.py"].includes(n)); // 90 verifiers are NOT producer QA
const status = git("status","--short","--branch");
const head = git("rev-parse","HEAD");
const branchStatus = status.split(/\r?\n/)[0];
const changes = status.split(/\r?\n/).slice(1).filter(Boolean);
const knownDirtyShared = changes.filter(s => /(?:^|\s)(?:index\.html|assets\/ability-lookup\.js|assets\/character-sheet-export\.js)$/.test(s));
const academyFile = path.join(root,"academy.html");
const academyText = fs.existsSync(academyFile) ? fs.readFileSync(academyFile,"utf8") : "";
const academyResources = [...academyText.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)]
  .map(m => m[1].split("?")[0]);
const academyEntry = {
  present:fs.existsSync(academyFile),sha256:hash(academyFile),
  referencedAssets:academyResources.map(resource=>({
    resource,exists:fs.existsSync(path.join(root,resource))
  }))
};
academyEntry.missingAssets = academyEntry.referencedAssets.filter(x=>!x.exists).map(x=>x.resource);
let fixture = {present:fs.existsSync(fixturePath),cases:0,valid:false,problems:[]};
if (fixture.present) {
  try {
    const parsed = JSON.parse(fs.readFileSync(fixturePath,"utf8"));
    const cases = parsed.cases;
    fixture.cases = Array.isArray(cases) ? cases.length : 0;
    const ids = new Set();
    for (const c of cases || []) {
      if (!c.id || ids.has(c.id)) fixture.problems.push("duplicate/missing id");
      ids.add(c.id);
      if (!Array.isArray(c.answers) || c.answers.length !== 10 ||
          c.answers.some(x => !["A","B","C","D"].includes(x))) fixture.problems.push("bad answers: "+c.id);
    }
    if (fixture.cases < 12) fixture.problems.push("needs >=12 distinct behavioral cases");
    fixture.valid = fixture.problems.length === 0;
  } catch(e) { fixture.problems.push(String(e.message)); }
}
const out = {
  schema:"new-player-90-intake-v1",
  observedAt:new Date().toISOString(),
  repository:root, head, branchStatus, dirtyCount:changes.length,
  dirtyPaths:changes, knownDirtyShared,
  artifactInventory:{
    docs:docCandidates, contractCandidates, codeCandidates, qaCandidates, academyEntry,
    quizSpec:{present:fs.existsSync(quizSpec),sha256:hash(quizSpec),
      explicitlyNotImplemented:/NOT IMPLEMENTED|NOT DEPLOYED/i.test(quizText)}
  },
  fixture,
  stages:[
    stage("00",contractCandidates,[],contractCandidates.length ? "Contract candidate requires independent content and ownership review" : "No repository 00 contract was found"),
    stage("10",codeCandidates.filter(n => /LESSON|TUTORIAL|BEGINNER|NEW.?PLAYER|ACADEMY/i.test(n)),
      qaCandidates.filter(n => /LESSON|TUTORIAL|BEGINNER/i.test(n)),"Beginner character creation not evidenced by runnable tests"),
    stage("20",codeCandidates.filter(n => /QUIZ|CLASS.?FIT/i.test(n)),
      qaCandidates.filter(n => /QUIZ|CLASS.?FIT/i.test(n)),
      /NOT IMPLEMENTED/i.test(quizText) ? "Design spec explicitly states NOT IMPLEMENTED" : "Need executable 12-class/48-subclass outcome coverage"),
    stage("30",codeCandidates.filter(n => /ACADEMY|ONBOARD|NAV/i.test(n)),
      qaCandidates.filter(n => /ROUNDTRIP|NAV|ACADEMY/i.test(n)),"Need actual creator<->lesson step roundtrip and state read-back"),
    stage("40",codeCandidates.filter(n => /LESSON|TUTORIAL|BEGINNER|ACADEMY/i.test(n)),
      qaCandidates.filter(n => /LESSON|TUTORIAL|BEGINNER/i.test(n)),"First-session lesson behavior not independently verified")
  ],
  gates:{
    contracts:"PENDING",producerQA:"PENDING",coverage12and48:"PENDING",
    creatorRoundtrip:"PENDING",saveJsonPdf2014:"PENDING",
    visual1440and390:"PENDING",liveFreshReload:"PENDING",humanNoviceUAT:"PENDING"
  },
  release:"BLOCKED",
  blockers:[
    "Actual 00 contract and owner handoffs require content verification",
    "10/20/30/40 feature implementations and independent executable evidence are not verified",
    "Shared dirty worktree is not isolated for an attributable release",
    "Required integration/regression/visual/live gates have not been executed"
  ],
  note:"FAIL-CLOSED intake only: this program cannot authorize any deployment."
};
process.stdout.write(JSON.stringify(out,null,2)+"\n");
process.exitCode = 2;
