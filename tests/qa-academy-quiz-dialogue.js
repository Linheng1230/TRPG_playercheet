"use strict";
/* Verify UI-only dialogue parity with 20 questionnaire: no second scoring/catalog. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"assets/academy-quiz-journey.js"),"utf8");
const quiz=require("../assets/class-fit-quiz-5r.js");
const prefix="const DIALOGUE = Object.freeze(";
const start=source.indexOf(prefix),end=source.indexOf(");\nconst main=",start);
assert.ok(start>=0&&end>start,"Missing presentation text");
const copy=vm.runInNewContext("("+source.slice(start+prefix.length,end)+")",{}, {timeout:1000});
const questions=quiz.questions();
assert.equal(questions.length,10);
assert.equal(copy.length,10);
const seen=new Set();
for(let i=0;i<questions.length;i++){
 assert.equal(copy[i].q,questions[i].id,"Preserve canonical Q id");
 assert.equal(copy[i].lines.length,questions[i].options.length,"Preserve 4 choices");
 assert.ok(copy[i].prompt.length>=12);
 for(let j=0;j<4;j++){
  assert.equal(questions[i].options[j].id,"ABCD"[j],"Preserve answer ID");
  assert.ok(copy[i].lines[j].length>=10&&copy[i].lines[j].length<=50);
  seen.add(copy[i].q+questions[i].options[j].id);
 }
}
assert.equal(seen.size,40);
assert.ok(source.includes("state.answers[q.id]=opt.id"),"No remapping of scoring inputs");
assert.ok(source.includes("quiz.evaluate(state.answers,catalog)"),"No evaluator replacement");
assert.ok(source.includes('"玩法偏好："+opt.text'),"Display canonical meaning below quote");
assert.ok(!/\bS\.(cls|bg|sp|sub)\s*=/.test(source),"No character changes");
const css=fs.readFileSync(path.join(root,"assets/new-player-academy.css"),"utf8");
assert.ok(css.includes(".academy-quiz-meaning"));
assert.equal(JSON.stringify(quiz.weights),JSON.stringify([9,9,9,8,7,7,7,7,4,2]));
console.log("PASS 30 quiz dialogue: 10 prompts, 40 playful labels; 20 score/answer IDs preserved");
