import { describe, it, expect } from "vitest";
import { makeTurnRule } from "../../src/rules/turn.js";
import { makeContext } from "../fixtures/movement.js";
import { RULE_IDS, SETTINGS } from "../../src/constants.js";

/**
 * Fabrique un `deps.getSetting` mockable pour la règle turn. Seul
 * `turnEnabled` est consommé.
 */
function makeDeps({ turnEnabled = true } = {}) {
  return {
    getSetting: (key) => {
      if (key === SETTINGS.turnEnabled) return turnEnabled;
      throw new Error(`getSetting: clé inattendue "${key}"`);
    },
  };
}

describe("makeTurnRule (blocage hors de son tour)", () => {
  it("expose id/isEnabled/evaluate conformes au contrat du registre", () => {
    const rule = makeTurnRule(makeDeps({ turnEnabled: true }));

    expect(rule.id).toBe(RULE_IDS.turn);
    expect(typeof rule.isEnabled).toBe("function");
    expect(typeof rule.evaluate).toBe("function");
    expect(rule.isEnabled()).toBe(true);
  });

  it("isEnabled() reflète le réglage turnEnabled injecté", () => {
    const rule = makeTurnRule(makeDeps({ turnEnabled: false }));
    expect(rule.isEnabled()).toBe(false);
  });

  it("bloque en combat, hors du tour du token", () => {
    const rule = makeTurnRule(makeDeps());
    const context = makeContext({ inCombat: true, isYourTurn: false });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toEqual({
      key: "FQRESTRAIN.notifications.turnBlocked",
      data: {},
    });
  });

  it("autorise en combat, à son tour", () => {
    const rule = makeTurnRule(makeDeps());
    const context = makeContext({ inCombat: true, isYourTurn: true });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op hors combat, quel que soit isYourTurn", () => {
    const rule = makeTurnRule(makeDeps());

    for (const isYourTurn of [true, false]) {
      const context = makeContext({ inCombat: false, isYourTurn });
      const result = rule.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeFalsy();
    }
  });
});
