import { describe, it, expect, afterEach } from "vitest";
import { registerRule, clearRules } from "../../src/engine/registry.js";
import { evaluate } from "../../src/engine/decision.js";
import { makeContext } from "../fixtures/movement.js";

function fakeRule(id, { allowed, reason, enabled = true } = {}) {
  return {
    id,
    isEnabled: () => enabled,
    evaluate: () => ({ allowed, reason }),
  };
}

function fakeHooks(listener) {
  return {
    callAll: (hookName, decision, ...rest) => {
      listener?.(hookName, decision, ...rest);
    },
  };
}

describe("engine/decision", () => {
  afterEach(() => {
    clearRules();
  });

  it("autorise par défaut quand aucune règle n'est enregistrée", () => {
    const context = makeContext({ override: false });

    const decision = evaluate(context, { hooks: fakeHooks() });

    expect(decision.allowed).toBe(true);
  });

  it("override-wins : context.override === true court-circuite une règle bloquante", () => {
    registerRule(fakeRule("lock", { allowed: false, reason: "verrouillé" }));
    const context = makeContext({ override: true });

    const decision = evaluate(context, { hooks: fakeHooks() });

    expect(decision.allowed).toBe(true);
    expect(decision.rule).toBe("override");
  });

  it("sans override, la première règle bloquante (par précédence) l'emporte avec sa raison", () => {
    registerRule(fakeRule("distance", { allowed: false, reason: "trop loin" }));
    registerRule(fakeRule("lock", { allowed: false, reason: "verrouillé" }));
    const context = makeContext({ override: false });

    const decision = evaluate(context, { hooks: fakeHooks() });

    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe("lock");
    expect(decision.reason).toBe("verrouillé");
  });

  it("ignore les règles désactivées (isEnabled() faux)", () => {
    registerRule(fakeRule("lock", { allowed: false, reason: "verrouillé", enabled: false }));
    registerRule(fakeRule("distance", { allowed: false, reason: "trop loin" }));
    const context = makeContext({ override: false });

    const decision = evaluate(context, { hooks: fakeHooks() });

    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe("distance");
  });

  it("appelle toujours Hooks.callAll(HOOK_EVALUATE, ...) en dernier, même override", () => {
    let called = false;
    let hookNameSeen;
    const context = makeContext({ override: true, changes: { x: 1 }, options: {}, userId: "u1" });

    evaluate(context, {
      hooks: fakeHooks((hookName) => {
        called = true;
        hookNameSeen = hookName;
      }),
    });

    expect(called).toBe(true);
    expect(hookNameSeen).toBe("fq-restrain-movement.evaluate");
  });

  it("un listener du hook peut forcer allowed=false sur une décision autorisée (dernier mot)", () => {
    const context = makeContext({ override: false });

    const decision = evaluate(context, {
      hooks: fakeHooks((hookName, decisionObj) => {
        decisionObj.allowed = false;
        decisionObj.reason = "bloqué par un module tiers";
      }),
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("bloqué par un module tiers");
  });

  it("un listener du hook peut forcer allowed=true sur une décision bloquée (dernier mot)", () => {
    registerRule(fakeRule("lock", { allowed: false, reason: "verrouillé" }));
    const context = makeContext({ override: false });

    const decision = evaluate(context, {
      hooks: fakeHooks((hookName, decisionObj) => {
        decisionObj.allowed = true;
      }),
    });

    expect(decision.allowed).toBe(true);
  });

  it("utilise globalThis.Hooks par défaut si aucun deps.hooks n'est fourni", () => {
    const originalHooks = globalThis.Hooks;
    let calledWith;
    globalThis.Hooks = {
      callAll: (...args) => {
        calledWith = args;
      },
    };

    try {
      const context = makeContext({ override: false });
      evaluate(context);
      expect(calledWith[0]).toBe("fq-restrain-movement.evaluate");
    } finally {
      globalThis.Hooks = originalHooks;
    }
  });

  it("ne lève pas d'erreur si ni deps.hooks ni globalThis.Hooks ne sont définis", () => {
    const context = makeContext({ override: false });
    expect(() => evaluate(context)).not.toThrow();
  });
});
