import { readNumber } from "./read.js";

/**
 * Adaptateur Pathfinder 2e.
 *
 * pf2e range les vitesses sous `system.attributes.speed` : la vitesse au sol
 * à la racine (`total` en priorité, `value` en repli) et les autres modes dans
 * le tableau `otherSpeeds` (`{ type, value }`, types `burrow`/`climb`/`fly`/
 * `swim`). Les distances pf2e sont en pieds.
 *
 * Repli marche : escalade et nage restent possibles sans vitesse dédiée (via
 * l'Athlétisme), elles retombent donc sur la vitesse au sol ; voler et creuser
 * exigent une vitesse dédiée.
 *
 * @param {{ getSpeedTypes?: () => object }} [deps]
 * @returns {object} adaptateur système
 */
export function makePf2eAdapter(deps = {}) {
  const getSpeedTypes =
    deps.getSpeedTypes ??
    (() => (typeof CONFIG !== "undefined" ? (CONFIG?.PF2E?.speedTypes ?? {}) : {}));

  return {
    id: "pf2e",
    systems: ["pf2e"],

    readSpeeds(actor) {
      const speed = actor?.system?.attributes?.speed;
      if (!speed) return null;

      const speeds = {};

      const walk = readNumber(speed.total) ?? readNumber(speed.value);
      if (walk !== null) speeds.walk = walk;

      for (const other of Array.isArray(speed.otherSpeeds) ? speed.otherSpeeds : []) {
        const action = other?.type === "land" ? "walk" : other?.type;
        if (typeof action !== "string") continue;

        const value = readNumber(other.total) ?? readNumber(other.value);
        if (value !== null) speeds[action] = value;
      }

      if (Object.keys(speeds).length === 0) return null;

      return { speeds, units: "ft" };
    },

    getMovementTypes() {
      const labels = getSpeedTypes();
      const types = {
        walk: { walkFallback: true },
        climb: { walkFallback: true },
        swim: { walkFallback: true },
        fly: { walkFallback: false },
        burrow: { walkFallback: false },
      };

      for (const [action, type] of Object.entries(types)) {
        const label = labels[action] ?? (action === "walk" ? labels.land : undefined);
        if (typeof label === "string") type.label = label;
      }

      return types;
    },
  };
}
