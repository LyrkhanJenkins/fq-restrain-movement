import { describe, it, expect, afterEach } from "vitest";
import { registerRule, getRules, clearRules } from "../../src/engine/registry.js";

describe("engine/registry", () => {
  afterEach(() => {
    clearRules();
  });

  it("retourne les règles triées selon la précédence lock > turn > take-back > distance, quel que soit l'ordre d'enregistrement", () => {
    registerRule({ id: "distance", isEnabled: () => true, evaluate: () => ({ allowed: true }) });
    registerRule({ id: "lock", isEnabled: () => true, evaluate: () => ({ allowed: true }) });
    registerRule({ id: "take-back", isEnabled: () => true, evaluate: () => ({ allowed: true }) });
    registerRule({ id: "turn", isEnabled: () => true, evaluate: () => ({ allowed: true }) });

    const ids = getRules().map((rule) => rule.id);

    expect(ids).toEqual(["lock", "turn", "take-back", "distance"]);
  });

  it("place les identifiants inconnus après les règles connues", () => {
    registerRule({ id: "mystere", isEnabled: () => true, evaluate: () => ({ allowed: true }) });
    registerRule({ id: "distance", isEnabled: () => true, evaluate: () => ({ allowed: true }) });
    registerRule({ id: "lock", isEnabled: () => true, evaluate: () => ({ allowed: true }) });

    const ids = getRules().map((rule) => rule.id);

    expect(ids).toEqual(["lock", "distance", "mystere"]);
  });

  it("lève une erreur si la règle n'a pas de fonction evaluate", () => {
    expect(() =>
      registerRule({ id: "lock", isEnabled: () => true })
    ).toThrow();
  });

  it("lève une erreur si l'id n'est pas une chaîne", () => {
    expect(() =>
      registerRule({ id: 42, isEnabled: () => true, evaluate: () => ({ allowed: true }) })
    ).toThrow();
  });

  it("clearRules() vide le registre", () => {
    registerRule({ id: "lock", isEnabled: () => true, evaluate: () => ({ allowed: true }) });
    clearRules();

    expect(getRules()).toEqual([]);
  });
});
