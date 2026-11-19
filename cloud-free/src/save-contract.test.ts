import { describe, expect, it } from "vitest";
import { validateCharacterJson, MAX_CHARACTER_BYTES } from "../convex/lib/characterPayload";

describe("D&D 5R canonical JSON upload contract", () => {
  const save = (v:9|10, ruleset:"2014"|"2024", id="c12345") => ({v,ruleset,id,meta:{name:"奈瑟琳"},spellByClass:{druid:["Guiding Bolt"]},play:{hp:18},classLevels:{druid:4}});
  it("accepts native 2024 Save v10 and stable id",()=>expect(validateCharacterJson(JSON.stringify(save(10,"2024")))).toEqual({characterId:"c12345",saveVersion:10,ruleset:"2024"}));
  it("accepts native 2014 Save v9",()=>expect(validateCharacterJson(JSON.stringify(save(9,"2014")))).toEqual({characterId:"c12345",saveVersion:9,ruleset:"2014"}));
  it("accepts native 2014 Save v10 without remapping",()=>expect(validateCharacterJson(JSON.stringify(save(10,"2014"))).ruleset).toBe("2014"));
  it("preserves original opaque JSON payload unchanged",()=>{const original=JSON.stringify({...save(10,"2024"),nonCanonicalFutureField:{"unknown":"keep"},gear:[1,2]});validateCharacterJson(original);expect(JSON.parse(original).nonCanonicalFutureField.unknown).toBe("keep");});
  it("rejects older alias version/characterId keys which real serializer never uses",()=>expect(()=>validateCharacterJson(JSON.stringify({version:10,ruleset:"2024",characterId:"test"}))).toThrow("UNSUPPORTED_SAVE_VERSION"));
  it("rejects unsupported ruleset, never guesses 2014/2024",()=>expect(()=>validateCharacterJson(JSON.stringify({...save(10,"2024"),ruleset:"2013"}))).toThrow("UNSUPPORTED_RULESET"));
  it("rejects malformed id",()=>expect(()=>validateCharacterJson(JSON.stringify({...save(10,"2024"),id:"../evil"}))).toThrow("INVALID_CHARACTER_ID"));
  it("rejects invalid JSON and arrays",()=>{expect(()=>validateCharacterJson("{")).toThrow("INVALID_JSON");expect(()=>validateCharacterJson("[]")).toThrow("INVALID_SAVE");});
  it("rejects oversized payload before parse",()=>expect(()=>validateCharacterJson("x".repeat(MAX_CHARACTER_BYTES+1))).toThrow("CHARACTER_TOO_LARGE"));
});
