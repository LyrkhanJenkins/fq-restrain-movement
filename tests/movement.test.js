import { describe, it, expect } from "vitest";
import {
  getMovementAction,
  usesWalkFallback,
  resolveActionSpeed,
  getActionLabel,
  readMovementContext,
} from "../src/movement.js";

/**
 * Tests des lecteurs de mode de déplacement sans runtime Foundry/dnd5e : les
 * registres `CONFIG.Token.movement.actions` et `CONFIG.DND5E.movementTypes`
 * sont injectés via `deps`, aucun accès à `CONFIG`/`game` réel.
 */

/** Registre d'actions Foundry factice, reproduisant celui de dnd5e. */
const ACTIONS = {
  walk: { label: "TOKEN.ACTIONS.walk" },
  crawl: { label: "TOKEN.ACTIONS.crawl" },
  climb: { label: "TOKEN.ACTIONS.climb" },
  swim: { label: "TOKEN.ACTIONS.swim" },
  fly: { label: "TOKEN.ACTIONS.fly" },
  burrow: { label: "TOKEN.ACTIONS.burrow" },
  jump: { label: "TOKEN.ACTIONS.jump" },
  blink: { label: "TOKEN.ACTIONS.blink", teleport: true },
};

/** Types de mouvement dnd5e factices, alignés sur `CONFIG.DND5E.movementTypes`. */
const MOVEMENT_TYPES = {
  walk: { label: "DND5E.MOVEMENT.Type.Speed" },
  burrow: { label: "DND5E.MOVEMENT.Type.Burrow" },
  climb: { label: "DND5E.MOVEMENT.Type.Climb", walkFallback: true },
  fly: { label: "DND5E.MOVEMENT.Type.Fly" },
  jump: { label: "DND5E.MOVEMENT.Type.Jump" },
  swim: { label: "DND5E.MOVEMENT.Type.Swim", walkFallback: true },
};

/** Construit un `deps` factice branché sur les registres ci-dessus. */
function makeDeps() {
  return {
    getActionConfig: (action) => ACTIONS[action],
    getActionIds: () => Object.keys(ACTIONS),
    getMovementTypeConfig: (action) => MOVEMENT_TYPES[action],
    localize: (key) => `[${key}]`,
  };
}

/** Carte de vitesses dnd5e 6 (`movement.speeds`, chaque clé initialisée à 0). */
function makeSpeeds(overrides = {}) {
  return { walk: 30, burrow: 0, climb: 0, fly: 0, jump: 0, swim: 0, ...overrides };
}

/** Construit un token factice portant les vitesses et l'action passées. */
function makeToken({ speeds, movementAction } = {}) {
  const token = { id: "t1" };
  if (movementAction !== undefined) token.movementAction = movementAction;
  if (speeds !== undefined) token.actor = { system: { attributes: { movement: { speeds } } } };
  return token;
}

describe("movement / getMovementAction", () => {
  it("privilégie l'action portée par l'update", () => {
    const token = makeToken({ movementAction: "walk" });
    expect(getMovementAction(token, { movementAction: "fly" })).toBe("fly");
  });

  it("retombe sur l'action du token quand l'update n'en porte pas", () => {
    expect(getMovementAction(makeToken({ movementAction: "swim" }), {})).toBe("swim");
  });

  it("retombe sur la marche quand rien n'est exposé (défensif)", () => {
    expect(getMovementAction(undefined, undefined)).toBe("walk");
  });
});

describe("movement / usesWalkFallback", () => {
  const deps = makeDeps();

  it("est vrai pour la marche", () => {
    expect(usesWalkFallback("walk", deps)).toBe(true);
  });

  it("est vrai pour le saut (movement.jump est une distance, pas une vitesse)", () => {
    expect(usesWalkFallback("jump", deps)).toBe(true);
  });

  it("est vrai pour les types dnd5e marqués walkFallback (escalade, nage)", () => {
    expect(usesWalkFallback("climb", deps)).toBe(true);
    expect(usesWalkFallback("swim", deps)).toBe(true);
  });

  it("est vrai pour une action inconnue de dnd5e (ramper)", () => {
    expect(usesWalkFallback("crawl", deps)).toBe(true);
  });

  it("est faux pour les modes dédiés (vol, terrier)", () => {
    expect(usesWalkFallback("fly", deps)).toBe(false);
    expect(usesWalkFallback("burrow", deps)).toBe(false);
  });
});

describe("movement / resolveActionSpeed", () => {
  const deps = makeDeps();

  it("retourne la vitesse de marche pour la marche", () => {
    expect(resolveActionSpeed("walk", makeSpeeds(), deps)).toBe(30);
  });

  it("retourne la vitesse de vol quand l'acteur en a une", () => {
    expect(resolveActionSpeed("fly", makeSpeeds({ fly: 60 }), deps)).toBe(60);
  });

  it("bloque le vol sans vitesse de vol : plafond 0, pas de repli marche", () => {
    expect(resolveActionSpeed("fly", makeSpeeds(), deps)).toBe(0);
  });

  it("bloque le terrier sans vitesse de terrier : plafond 0", () => {
    expect(resolveActionSpeed("burrow", makeSpeeds(), deps)).toBe(0);
  });

  it("retombe sur la marche pour l'escalade sans vitesse d'escalade", () => {
    expect(resolveActionSpeed("climb", makeSpeeds(), deps)).toBe(30);
  });

  it("prend la meilleure des deux quand l'escalade dépasse la marche", () => {
    expect(resolveActionSpeed("climb", makeSpeeds({ climb: 40 }), deps)).toBe(40);
  });

  it("ne restreint pas la téléportation", () => {
    expect(resolveActionSpeed("blink", makeSpeeds(), deps)).toBeNull();
  });

  it("ne restreint pas quand l'acteur n'a aucune donnée de mouvement", () => {
    expect(resolveActionSpeed("fly", null, deps)).toBeNull();
  });

  it("bloque quand la vitesse de marche renseignée est 0 (acteur immobilisé)", () => {
    expect(resolveActionSpeed("walk", makeSpeeds({ walk: 0 }), deps)).toBe(0);
    expect(resolveActionSpeed("climb", makeSpeeds({ walk: 0 }), deps)).toBe(0);
  });

  it("ne restreint pas quand aucune vitesse n'est renseignée (véhicule, hors schéma créature)", () => {
    expect(resolveActionSpeed("walk", { units: "ft" }, deps)).toBeNull();
    expect(resolveActionSpeed("climb", { walk: undefined }, deps)).toBeNull();
  });
});

describe("movement / getActionLabel", () => {
  const deps = makeDeps();

  it("privilégie le libellé dnd5e du type de mouvement", () => {
    expect(getActionLabel("fly", deps)).toBe("[DND5E.MOVEMENT.Type.Fly]");
  });

  it("retombe sur le libellé de l'action Foundry", () => {
    expect(getActionLabel("crawl", deps)).toBe("[TOKEN.ACTIONS.crawl]");
  });

  it("retombe sur l'identifiant brut quand aucun libellé n'existe", () => {
    expect(getActionLabel("inconnu", deps)).toBe("inconnu");
  });
});

describe("movement / readMovementContext", () => {
  it("agrège action courante, vitesse courante et plafonds par action", () => {
    const token = makeToken({ speeds: makeSpeeds({ fly: 60 }), movementAction: "walk" });

    const context = readMovementContext(token, { movementAction: "fly" }, makeDeps());

    expect(context.movementAction).toBe("fly");
    expect(context.speed).toBe(60);
    expect(context.speedByAction.walk).toBe(30);
    expect(context.speedByAction.fly).toBe(60);
    expect(context.speedByAction.climb).toBe(30);
    expect(context.speedByAction.burrow).toBe(0);
    expect(context.speedByAction.blink).toBeNull();
    expect(context.actionLabels.fly).toBe("[DND5E.MOVEMENT.Type.Fly]");
  });

  it("couvre l'action courante même absente du registre Foundry", () => {
    const token = makeToken({ speeds: makeSpeeds() });

    const context = readMovementContext(token, { movementAction: "inconnu" }, makeDeps());

    expect(context.movementAction).toBe("inconnu");
    // Action inconnue de dnd5e -> repli marche.
    expect(context.speedByAction.inconnu).toBe(30);
  });

  it("ne restreint rien quand l'acteur n'a pas de données de mouvement (défensif)", () => {
    const context = readMovementContext(makeToken({}), {}, makeDeps());

    expect(context.movementAction).toBe("walk");
    expect(context.speed).toBeUndefined();
    expect(context.speedByAction.fly).toBeNull();
    expect(context.speedByAction.walk).toBeNull();
  });

  // dnd5e 6 a déplacé les vitesses de `movement.walk` vers `movement.speeds.walk`,
  // derrière un shim de lecture qui disparaît en dnd5e 7. Lire la racine
  // redeviendrait alors silencieusement « aucune vitesse connue », donc aucune
  // restriction : ce test épingle la lecture sous `speeds`.
  it("lit les vitesses sous `movement.speeds`, jamais à la racine de `movement` (dnd5e 6)", () => {
    const legacy = { id: "t1", actor: { system: { attributes: { movement: makeSpeeds() } } } };

    const context = readMovementContext(legacy, {}, makeDeps());

    expect(context.speedByAction.walk).toBeNull();
  });
});
