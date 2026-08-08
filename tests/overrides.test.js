import { describe, it, expect } from "vitest";
import { isExempt, isGmBypassed, computeOverride } from "../src/overrides.js";
import { FLAGS, MODULE_ID } from "../src/constants.js";
import { makeContext } from "./fixtures/movement.js";

function makeDeps(overrides = {}) {
  return {
    getSetting: () => false,
    isGM: false,
    isBypassHeld: () => false,
    ...overrides,
  };
}

describe("overrides / isExempt", () => {
  it("retourne true si le flag exempt est posé via getFlag()", () => {
    const tokenDocument = {
      getFlag: (moduleId, key) => moduleId === MODULE_ID && key === FLAGS.exempt,
    };

    expect(isExempt(tokenDocument, makeDeps())).toBe(true);
  });

  it("retourne true si le flag exempt est posé via l'accès direct flags", () => {
    const tokenDocument = { flags: { [MODULE_ID]: { [FLAGS.exempt]: true } } };

    expect(isExempt(tokenDocument, makeDeps())).toBe(true);
  });

  it("retourne false si aucun flag exempt n'est posé", () => {
    const tokenDocument = { flags: {} };

    expect(isExempt(tokenDocument, makeDeps())).toBe(false);
  });
});

describe("overrides / isGmBypassed", () => {
  it("retourne true si isGM et le réglage gmNotRestrained sont vrais", () => {
    const deps = makeDeps({ isGM: true, getSetting: () => true });

    expect(isGmBypassed(deps)).toBe(true);
  });

  it("retourne false si isGM est vrai mais gmNotRestrained est faux", () => {
    const deps = makeDeps({ isGM: true, getSetting: () => false });

    expect(isGmBypassed(deps)).toBe(false);
  });

  it("retourne false si isGM est faux, même si gmNotRestrained est vrai", () => {
    const deps = makeDeps({ isGM: false, getSetting: () => true });

    expect(isGmBypassed(deps)).toBe(false);
  });
});

describe("overrides / computeOverride", () => {
  it("retourne true si le token est exempté", () => {
    const context = makeContext({ tokenDocument: { flags: { [MODULE_ID]: { [FLAGS.exempt]: true } } } });
    const deps = makeDeps();

    expect(computeOverride(context, deps)).toBe(true);
  });

  it("retourne true si le MJ est bypassé", () => {
    const context = makeContext();
    const deps = makeDeps({ isGM: true, getSetting: () => true });

    expect(computeOverride(context, deps)).toBe(true);
  });

  it("retourne true si la touche de bypass est maintenue", () => {
    const context = makeContext();
    const deps = makeDeps({ isBypassHeld: () => true });

    expect(computeOverride(context, deps)).toBe(true);
  });

  it("retourne false si aucune source d'override n'est active", () => {
    const context = makeContext();
    const deps = makeDeps();

    expect(computeOverride(context, deps)).toBe(false);
  });
});
