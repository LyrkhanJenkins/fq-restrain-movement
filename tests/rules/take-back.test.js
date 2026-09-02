import { describe, it, expect } from "vitest";
import { makeTakeBackRule } from "../../src/rules/take-back.js";
import { makeContext, makeMeasuringGrid } from "../fixtures/movement.js";
import { RULE_IDS, SETTINGS } from "../../src/constants.js";

/**
 * Fabrique un `deps.getSetting` mockable pour la règle take-back. Seul
 * `takeBackEnabled` est consommé.
 */
function makeDeps({ takeBackEnabled = true } = {}) {
  return {
    getSetting: (key) => {
      if (key === SETTINGS.takeBackEnabled) return takeBackEnabled;
      throw new Error(`getSetting: clé inattendue "${key}"`);
    },
  };
}

describe("makeTakeBackRule (veto du retour en arrière)", () => {
  it("expose id/isEnabled/evaluate conformes au contrat du registre", () => {
    const rule = makeTakeBackRule(makeDeps({ takeBackEnabled: true }));

    expect(rule.id).toBe(RULE_IDS.takeBack);
    expect(typeof rule.isEnabled).toBe("function");
    expect(typeof rule.evaluate).toBe("function");
    expect(rule.isEnabled()).toBe(true);
  });

  it("isEnabled() reflète le réglage takeBackEnabled injecté", () => {
    const rule = makeTakeBackRule(makeDeps({ takeBackEnabled: false }));
    expect(rule.isEnabled()).toBe(false);
  });

  it("bloque un déplacement qui réduit strictement la distance à la position engagée", () => {
    const rule = makeTakeBackRule(makeDeps());
    const context = makeContext({
      inCombat: true,
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 40, y: 0 },
      grid: makeMeasuringGrid(),
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toEqual({
      key: "FQRESTRAIN.notifications.takeBackBlocked",
      data: {},
    });
  });

  it("autorise un déplacement qui éloigne de la position engagée", () => {
    const rule = makeTakeBackRule(makeDeps());
    const context = makeContext({
      inCombat: true,
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 160, y: 0 },
      grid: makeMeasuringGrid(),
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("autorise un déplacement latéral (distance égale ou supérieure, pas de réduction stricte)", () => {
    const rule = makeTakeBackRule(makeDeps());
    const context = makeContext({
      inCombat: true,
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 100, y: 60 },
      grid: makeMeasuringGrid(),
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op hors combat, même sur un retour vers la position engagée", () => {
    const rule = makeTakeBackRule(makeDeps());
    const context = makeContext({
      inCombat: false,
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 40, y: 0 },
      grid: makeMeasuringGrid(),
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op si le token n'est pas encore engagé", () => {
    const rule = makeTakeBackRule(makeDeps());
    const context = makeContext({
      inCombat: true,
      engagedPosition: null,
      from: { x: 100, y: 0 },
      to: { x: 40, y: 0 },
      grid: makeMeasuringGrid(),
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });

  it("est un no-op sur scène gridless (miroir distance.js)", () => {
    const rule = makeTakeBackRule(makeDeps());
    const context = makeContext({
      inCombat: true,
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 40, y: 0 },
      grid: { isGridless: true, measurePath: () => ({ spaces: 0, distance: 0, cost: 0 }) },
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeFalsy();
  });
});
