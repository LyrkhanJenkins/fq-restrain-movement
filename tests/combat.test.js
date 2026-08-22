import { describe, it, expect } from "vitest";
import { getInCombat, getIsYourTurn, readCombatContext } from "../src/combat.js";

/**
 * Tests des lecteurs de contexte de combat sans runtime Foundry : toutes les
 * entrées Foundry passent par un `deps` factice (`getCombat`), aucun accès à
 * `game.*` réel. Les vitesses ne sont plus lues ici : elles dépendent du mode
 * de déplacement et sont couvertes par `tests/movement.test.js`.
 */

/** Construit un `deps` factice dont `getCombat()` retourne un faux combat. */
function makeDeps(combat = null) {
  return { getCombat: () => combat };
}

/** Construit un token factice portant un `id`. */
function makeToken({ id = "t1" } = {}) {
  return { id };
}

describe("combat / getInCombat", () => {
  it("retourne true si le combat est démarré", () => {
    expect(getInCombat(makeDeps({ started: true }))).toBe(true);
  });

  it("retourne false si le combat n'est pas démarré", () => {
    expect(getInCombat(makeDeps({ started: false }))).toBe(false);
  });

  it("retourne false si aucun combat n'est actif", () => {
    expect(getInCombat(makeDeps(null))).toBe(false);
  });
});

describe("combat / getIsYourTurn", () => {
  it("retourne true si le combattant courant correspond au token (tokenId)", () => {
    const deps = makeDeps({ combatant: { tokenId: "t1" } });
    expect(getIsYourTurn(makeToken({ id: "t1" }), deps)).toBe(true);
  });

  it("retourne true si le combattant courant correspond au token (token.id)", () => {
    const deps = makeDeps({ combatant: { token: { id: "t1" } } });
    expect(getIsYourTurn(makeToken({ id: "t1" }), deps)).toBe(true);
  });

  it("retourne false si le combattant courant est un autre token", () => {
    const deps = makeDeps({ combatant: { tokenId: "other" } });
    expect(getIsYourTurn(makeToken({ id: "t1" }), deps)).toBe(false);
  });

  it("retourne false s'il n'y a pas de combattant courant", () => {
    const deps = makeDeps({ combatant: null });
    expect(getIsYourTurn(makeToken({ id: "t1" }), deps)).toBe(false);
  });

  it("retourne false s'il n'y a pas de combat", () => {
    expect(getIsYourTurn(makeToken({ id: "t1" }), makeDeps(null))).toBe(false);
  });
});

describe("combat / readCombatContext", () => {
  it("agrège inCombat/isYourTurn via un deps mocké", () => {
    const deps = makeDeps({ started: true, combatant: { tokenId: "t1" } });

    expect(readCombatContext(makeToken({ id: "t1" }), deps)).toEqual({
      inCombat: true,
      isYourTurn: true,
    });
  });

  it("reflète l'état dégradé : hors combat et pas de tour", () => {
    expect(readCombatContext(makeToken({ id: "t1" }), makeDeps(null))).toEqual({
      inCombat: false,
      isYourTurn: false,
    });
  });
});
