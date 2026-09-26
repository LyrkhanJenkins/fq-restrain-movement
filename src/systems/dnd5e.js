import { firstUnits } from "./read.js";

/**
 * Adaptateur dnd5e (système d'origine du module).
 *
 * dnd5e 6 a déplacé les vitesses de la racine de `movement` vers
 * `movement.speeds`, derrière un shim de lecture qui disparaît en dnd5e 7 :
 * on lit donc UNIQUEMENT `movement.speeds`, jamais la racine. Un acteur hors
 * schéma créature (véhicule, jeton sans acteur) ne rend aucune vitesse, ce qui
 * désactive la règle de distance pour lui.
 *
 * Les modes de déplacement viennent de `CONFIG.DND5E.movementTypes`, dont
 * l'indicateur `walkFallback` (escalade, nage).
 *
 * @param {{ getMovementTypes?: () => object }} [deps]
 * @returns {object} adaptateur système
 */
export function makeDnd5eAdapter(deps = {}) {
  const getMovementTypes =
    deps.getMovementTypes ??
    (() => (typeof CONFIG !== "undefined" ? (CONFIG?.DND5E?.movementTypes ?? {}) : {}));

  return {
    id: "dnd5e",
    systems: ["dnd5e"],

    readSpeeds(actor) {
      const movement = actor?.system?.attributes?.movement;
      const speeds = movement?.speeds;
      if (!speeds) return null;

      return { speeds, units: firstUnits(movement?.units) };
    },

    getMovementTypes,
  };
}
