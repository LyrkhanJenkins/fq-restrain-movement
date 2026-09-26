import { describe, it, expect, beforeEach } from "vitest";
import {
  clearSystemAdapters,
  getSystemAdapter,
  registerSystemAdapter,
  resolveSystemAdapter,
  setFallbackAdapter,
} from "../../src/systems/registry.js";

/** Adaptateur minimal conforme au contrat. */
function makeAdapter(id, systems = []) {
  return { id, systems, readSpeeds: () => null, getMovementTypes: () => ({}) };
}

describe("systems / registerSystemAdapter", () => {
  beforeEach(() => clearSystemAdapters());

  it("refuse un adaptateur sans id", () => {
    expect(() => registerSystemAdapter({ readSpeeds: () => null })).toThrow(/adapter\.id/);
  });

  it("refuse un adaptateur sans readSpeeds()", () => {
    expect(() => registerSystemAdapter({ id: "x" })).toThrow(/readSpeeds/);
  });
});

describe("systems / resolveSystemAdapter", () => {
  it("retient l'adaptateur qui déclare le système courant", () => {
    const dnd5e = makeAdapter("dnd5e", ["dnd5e"]);
    const pf2e = makeAdapter("pf2e", ["pf2e"]);

    expect(resolveSystemAdapter("pf2e", [dnd5e, pf2e])).toBe(pf2e);
  });

  it("retient le dernier enregistré quand plusieurs déclarent le système (surcharge tierce)", () => {
    const embarque = makeAdapter("dnd5e", ["dnd5e"]);
    const tiers = makeAdapter("dnd5e-maison", ["dnd5e"]);

    expect(resolveSystemAdapter("dnd5e", [embarque, tiers])).toBe(tiers);
  });

  it("retombe sur le repli pour un système inconnu", () => {
    const generic = makeAdapter("generic");

    expect(resolveSystemAdapter("un-systeme-exotique", [makeAdapter("dnd5e", ["dnd5e"])], generic))
      .toBe(generic);
  });

  it("retourne null quand il n'y a ni correspondance ni repli", () => {
    expect(resolveSystemAdapter("dnd5e", [])).toBeNull();
  });
});

describe("systems / getSystemAdapter", () => {
  beforeEach(() => clearSystemAdapters());

  it("résout selon l'identifiant de système injecté", () => {
    const pf2e = makeAdapter("pf2e", ["pf2e"]);
    registerSystemAdapter(makeAdapter("dnd5e", ["dnd5e"]));
    registerSystemAdapter(pf2e);
    setFallbackAdapter(makeAdapter("generic"));

    expect(getSystemAdapter({ getSystemId: () => "pf2e" })).toBe(pf2e);
    expect(getSystemAdapter({ getSystemId: () => "swade" }).id).toBe("generic");
  });

  it("ne casse pas hors runtime Foundry (aucun game global)", () => {
    expect(getSystemAdapter()).toBeNull();
  });
});
