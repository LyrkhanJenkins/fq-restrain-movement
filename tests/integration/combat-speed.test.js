import { describe, it, expect, beforeEach } from "vitest";
import { evaluate } from "../../src/engine/decision.js";
import { registerRule, clearRules } from "../../src/engine/registry.js";
import { makeDistanceRule } from "../../src/rules/distance.js";
import { makeContext, makeGrid } from "../fixtures/movement.js";
import { RULE_IDS } from "../../src/constants.js";

/**
 * Vérifie de bout en bout le chemin complet « limite de vitesse de combat » via
 * evaluate() (registre + décision + règle distance speed-aware + contexte de
 * combat inCombat/isYourTurn/speed). Toute la logique reste pure et pilotée par
 * fixtures — aucun runtime Foundry.
 */
describe("intégration — limite de vitesse en combat", () => {
  beforeEach(() => {
    clearRules();
    registerRule(makeDistanceRule({ getSetting: () => true }));
  });

  const NOOP = { hooks: { callAll() {} } };

  it("bloque en combat, à son tour, quand le cumul en pieds dépasse la vitesse", () => {
    const ctx = makeContext({
      inCombat: true,
      isYourTurn: true,
      speed: 30,
      grid: makeGrid({ cost: 35 }),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(false);
    expect(decision.reason.key).toBe("FQRESTRAIN.notifications.distanceBlocked");
    expect(decision.reason.data.speed).toBe(30);
    expect(decision.rule).toBe(RULE_IDS.distance);
  });

  it("autorise en combat, à son tour, quand le cumul en pieds est dans la limite", () => {
    const ctx = makeContext({
      inCombat: true,
      isYourTurn: true,
      speed: 30,
      grid: makeGrid({ cost: 30 }),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
  });

  it("est un no-op hors combat, quel que soit le cumul", () => {
    const ctx = makeContext({
      inCombat: false,
      isYourTurn: true,
      speed: 30,
      grid: makeGrid({ cost: 999 }),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
  });
});
