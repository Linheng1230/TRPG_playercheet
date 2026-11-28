import { describe, expect, it } from "vitest";
import {
  assertWowPrivateCanonicalHashes,
  sha256Text,
} from "../convex/lib/wowPrivateManifest";

describe("WoW private provider server-side SHA",()=>{
  it("uses standards-compatible SHA-256",async()=>{
    await expect(sha256Text("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("rejects noncanonical provider bytes even when a client could lie about hash strings",async()=>{
    await expect(assertWowPrivateCanonicalHashes("{}","{}"))
      .rejects.toThrow("MANIFEST_SHA_MISMATCH");
  });
});
