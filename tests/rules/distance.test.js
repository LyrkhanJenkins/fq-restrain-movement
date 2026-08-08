import { describe, it, expect, vi } from "vitest";
import { makeDistanceRule } from "../../src/rules/distance.js";
import { makeContext, makeGrid } from "../fixtures/movement.js";
import { RULE_IDS, SETTINGS } from "../../src/constants.js";

/**
 * Fabrique un `deps.getSetting` mockable pour la règle de distance speed-aware.
 * Seul `distanceEnabled` est consommé (le réglage numérique « N cases » n'est
 * plus utilisé).
 */
function makeDeps({ distanceEnabled = true } = {}) {
  return {
    getSetting: (key) => {
      if (key === SETTINGS.distanceEnabled) return distanceEnabled;
      throw new Error(`getSetting: clé inattendue "${key}"`);
    },
  };
}

/** Contexte « en combat, à son tour, vitesse 30 » surchargeable. */
function combatCtx(overrides = {}) {
  return makeContext({ inCombat: true, isYourTurn: true, speed: 30, ...overrides });
}

describe("makeDistanceRule (limite de vitesse de combat)", () => {
  it("expose id/isEnabled/evaluate conformes au contrat du registre", () => {
    const rule = makeDistanceRule(makeDeps({ distanceEnabled: true }));

    expect(rule.id).toBe(RULE_IDS.distance);
    expect(typeof rule.isEnabled).toBe("function");
    expect(typeof rule.evaluate).toBe("function");
    expect(rule.isEnabled()).toBe(true);
  });

  it("isEnabled() reflète le réglage distanceEnabled injecté", () => {
    const rule = makeDistanceRule(makeDeps({ distanceEnabled: false }));
    expect(rule.isEnabled()).toBe(false);
  });

  it("bloque en combat, à son tour, un cumul de 35 pieds avec vitesse 30", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ grid: makeGrid({ cost: 35 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toEqual({
      key: "FQRESTRAIN.notifications.distanceBlocked",
      data: { speed: 30 },
    });
  });

  it("autorise un cumul de 30 pieds avec vitesse 30 (limite inclusive)", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ grid: makeGrid({ cost: 30 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op hors combat, quel que soit le cumul", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ inCombat: false, grid: makeGrid({ cost: 999 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op hors du tour du token (la règle turn gère ce cas)", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ isYourTurn: false, grid: makeGrid({ cost: 999 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op sur scène gridless", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({
      grid: { isGridless: true, measurePath: () => ({ spaces: 0, distance: 999, cost: 999 }) },
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op quand la vitesse est absente (défensif)", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ speed: undefined, grid: makeGrid({ cost: 999 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op quand la vitesse n'est pas positive (défensif)", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ speed: 0, grid: makeGrid({ cost: 999 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("compare en pieds (cost) et non en cases (spaces) : spaces bas mais pieds hauts → bloqué", () => {
    const rule = makeDistanceRule(makeDeps());
    // spaces sous une hypothétique limite de cases, mais pieds au-dessus de la vitesse.
    const context = combatCtx({ grid: makeGrid({ spaces: 1, cost: 35 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(false);
    expect(context.distance).toBe(35);
  });

  it("mesure le trajet (path multi-points) via measurePath quand exposé — cumul souris", () => {
    const measurePath = vi.fn(() => ({ spaces: 0, distance: 0, cost: 35 }));
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ grid: { isGridless: false, measurePath }, path });

    const result = rule.evaluate(context);

    expect(measurePath).toHaveBeenCalledWith(path);
    expect(result.allowed).toBe(false);
  });

  it("mesure origine→destination via measurePath quand aucun path n'est exposé", () => {
    const measurePath = vi.fn(() => ({ spaces: 0, distance: 0, cost: 10 }));
    const from = { x: 0, y: 0 };
    const to = { x: 2, y: 0 };
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ grid: { isGridless: false, measurePath }, path: null, from, to });

    const result = rule.evaluate(context);

    expect(measurePath).toHaveBeenCalledWith([from, to]);
    expect(result.allowed).toBe(true);
  });

  it("expose context.distance = pieds mesurés (repli sur distance si cost absent)", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({
      grid: { isGridless: false, measurePath: () => ({ spaces: 5, distance: 25 }) },
    });

    rule.evaluate(context);

    expect(context.distance).toBe(25);
  });
});
