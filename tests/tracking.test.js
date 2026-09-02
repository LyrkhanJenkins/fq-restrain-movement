import { describe, it, expect, beforeEach } from "vitest";
import {
  getEngagedPosition,
  engageAtTurnStart,
  resetEngagedPosition,
  onCombatTurnChange,
  clearTracking,
} from "../src/tracking.js";

/**
 * Tests unitaires du service de suivi de la position engagée sans runtime
 * Foundry : toutes les entrées Foundry passent par un `deps` factice
 * (`getSetting`/`getCombat`/`now`). Le suivi ne vaut qu'en combat : la seule
 * source de position engagée est le début de tour.
 */

/** Construit un `deps` factice ; `now` et `getSetting` (grâce) surchargeables. */
function makeDeps({ now = () => 0, grace = 0, combat = null } = {}) {
  return {
    now,
    getSetting: () => grace,
    getCombat: () => combat,
  };
}

describe("tracking / getEngagedPosition", () => {
  beforeEach(() => {
    clearTracking();
  });

  it("retourne null si aucune entrée n'existe pour ce token", () => {
    expect(getEngagedPosition("absent", makeDeps())).toBeNull();
  });

  it("retourne null tant que now() est strictement avant freezeTime (grâce ouverte)", () => {
    let now = 0;
    const deps = { now: () => now, getSetting: () => 10 };

    engageAtTurnStart({ id: "t1", x: 5, y: 5 }, deps);

    now = 9999;
    expect(getEngagedPosition("t1", deps)).toBeNull();
  });

  it("retourne la position figée dès now() égal ou après freezeTime", () => {
    let now = 0;
    const deps = { now: () => now, getSetting: () => 10 };

    engageAtTurnStart({ id: "t1", x: 5, y: 5 }, deps);

    now = 10000;
    expect(getEngagedPosition("t1", deps)).toEqual({ x: 5, y: 5 });
  });
});

describe("tracking / engageAtTurnStart", () => {
  beforeEach(() => {
    clearTracking();
  });

  it("pose la position courante du token avec freezeTime = now + grâce_ms", () => {
    const deps = makeDeps({ now: () => 1000, grace: 3 });

    engageAtTurnStart({ id: "t1", x: 7, y: 9 }, deps);

    expect(getEngagedPosition("t1", { now: () => 3999, getSetting: () => 3 })).toBeNull();
    expect(getEngagedPosition("t1", { now: () => 4000, getSetting: () => 3 })).toEqual({
      x: 7,
      y: 9,
    });
  });

  it("grâce 0 -> opposable immédiatement", () => {
    const deps = makeDeps({ now: () => 42, grace: 0 });

    engageAtTurnStart({ id: "t1", x: 8, y: 8 }, deps);

    expect(getEngagedPosition("t1", deps)).toEqual({ x: 8, y: 8 });
  });

  it("écrase l'entrée existante au tour suivant", () => {
    const deps = makeDeps({ now: () => 0, grace: 0 });

    engageAtTurnStart({ id: "t1", x: 1, y: 1 }, deps);
    expect(getEngagedPosition("t1", deps)).toEqual({ x: 1, y: 1 });

    engageAtTurnStart({ id: "t1", x: 2, y: 2 }, deps);
    expect(getEngagedPosition("t1", deps)).toEqual({ x: 2, y: 2 });
  });

  it.each([
    ["négative", -5],
    ["NaN", NaN],
    ["non numérique", "abc"],
    ["undefined", undefined],
  ])("plancher défensif : grâce %s -> traitée comme 0 (opposable immédiatement)", (_label, grace) => {
    const deps = { now: () => 1000, getSetting: () => grace };

    engageAtTurnStart({ id: "t1", x: 3, y: 3 }, deps);

    expect(getEngagedPosition("t1", deps)).toEqual({ x: 3, y: 3 });
  });

  it("tolère un deps sans getSetting (grâce traitée comme 0)", () => {
    const deps = { now: () => 1000 };

    engageAtTurnStart({ id: "t1", x: 4, y: 4 }, deps);

    expect(getEngagedPosition("t1", deps)).toEqual({ x: 4, y: 4 });
  });

  it("est défensif si le tokenDocument (ou son id) est absent", () => {
    const deps = makeDeps();
    expect(() => engageAtTurnStart(undefined, deps)).not.toThrow();
    expect(() => engageAtTurnStart({ x: 1, y: 1 }, deps)).not.toThrow();
  });
});

describe("tracking / resetEngagedPosition", () => {
  beforeEach(() => {
    clearTracking();
  });

  it("supprime l'entrée -> getEngagedPosition retourne null", () => {
    const deps = makeDeps({ now: () => 0, grace: 0 });
    engageAtTurnStart({ id: "t1", x: 1, y: 1 }, deps);
    expect(getEngagedPosition("t1", deps)).toEqual({ x: 1, y: 1 });

    resetEngagedPosition("t1");
    expect(getEngagedPosition("t1", deps)).toBeNull();
  });
});

describe("tracking / onCombatTurnChange", () => {
  beforeEach(() => {
    clearTracking();
  });

  it("engage le combattant courant à sa position de début de tour", () => {
    const combat = {
      combatant: { token: { id: "t1", x: 15, y: 15 } },
    };
    const deps = { now: () => 100, getSetting: () => 0, getCombat: () => combat };

    onCombatTurnChange(deps);

    expect(getEngagedPosition("t1", deps)).toEqual({ x: 15, y: 15 });
  });

  it("réinitialise le suivi du combattant précédent quand il est identifiable", () => {
    engageAtTurnStart({ id: "old", x: 3, y: 3 }, { now: () => 0 });

    const combat = {
      combatant: { token: { id: "new", x: 4, y: 4 } },
      previous: { combatantId: "c-old" },
      combatants: {
        get: (id) => (id === "c-old" ? { tokenId: "old" } : undefined),
      },
    };
    const deps = { now: () => 100, getSetting: () => 0, getCombat: () => combat };

    onCombatTurnChange(deps);

    expect(getEngagedPosition("old", deps)).toBeNull();
    expect(getEngagedPosition("new", deps)).toEqual({ x: 4, y: 4 });
  });

  it("est défensif si pas de combat (aucun crash, aucun effet)", () => {
    const deps = { now: () => 0, getCombat: () => null };
    expect(() => onCombatTurnChange(deps)).not.toThrow();
  });

  it("est défensif si pas de combattant courant (aucun crash)", () => {
    const combat = { combatant: null };
    const deps = { now: () => 0, getCombat: () => combat };
    expect(() => onCombatTurnChange(deps)).not.toThrow();
  });
});

describe("tracking / clearTracking", () => {
  it("vide toute la Map", () => {
    const deps = makeDeps({ now: () => 0, grace: 0 });
    engageAtTurnStart({ id: "t1", x: 1, y: 1 }, deps);
    engageAtTurnStart({ id: "t2", x: 2, y: 2 }, deps);

    clearTracking();

    expect(getEngagedPosition("t1", deps)).toBeNull();
    expect(getEngagedPosition("t2", deps)).toBeNull();
  });
});
