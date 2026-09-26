import { DEFAULT_SPEED_PATH, MODULE_ID, SETTINGS } from "../constants.js";
import { firstUnits, getPath, readNumber } from "./read.js";

/**
 * Adaptateur générique : repli pour tous les systèmes sans adaptateur dédié.
 *
 * Il ne connaît aucun système en particulier — il sonde, dans l'ordre, les
 * emplacements où les systèmes Foundry rangent habituellement les vitesses, et
 * retient le premier conteneur qui expose au moins une vitesse numérique.
 * Rien trouvé : aucune vitesse (`null`), la règle de limite de vitesse devient
 * un no-op et les autres restrictions (hors tour, retour en arrière) continuent
 * de fonctionner.
 *
 * Le réglage « chemin des vitesses » (`speedPath`) est essayé en premier : le
 * MJ peut pointer directement l'emplacement de son système, qu'il s'agisse
 * d'un objet de vitesses par mode ou d'un simple nombre (vitesse de marche).
 * Ce chemin vaut par défaut l'emplacement dnd5e 6 (`DEFAULT_SPEED_PATH`) ;
 * quand il ne mène à rien — système rangeant ses vitesses ailleurs, faute de
 * frappe — le sondage reprend la main, pour ne jamais désactiver la détection
 * sur la seule foi d'un réglage.
 *
 * Aucun mode de déplacement n'est déclaré (`getMovementTypes()` vide) : toute
 * action retombe donc sur la vitesse de marche à défaut de vitesse propre —
 * choix permissif, pour ne jamais bloquer un déplacement légitime dans un
 * système dont on ignore les règles.
 */

/** Actions dont on cherche une vitesse dédiée dans un conteneur. */
const SPEED_ACTIONS = ["walk", "fly", "swim", "climb", "burrow", "crawl"];

/**
 * Clés portant la vitesse de marche selon les systèmes (`land` en pf1,
 * `value` quand le conteneur ne porte qu'une vitesse...).
 */
const WALK_KEYS = ["walk", "land", "ground", "base", "value", "total"];

/**
 * Emplacements sondés, du plus spécifique au plus générique. Couvre entre
 * autres dnd5e et ses dérivés (`attributes.movement`), pf1
 * (`attributes.speed.<mode>.total`), a5e (`attributes.movement.<mode>.distance`)
 * et les systèmes à vitesse unique (`details.move.value`).
 */
const CONTAINERS = [
  "system.attributes.movement.speeds",
  "system.attributes.movement",
  "system.attributes.speed",
  "system.attributes.speeds",
  "system.attributes.pace",
  "system.movement",
  "system.speed",
  "system.pace",
  "system.details.movement",
  "system.details.move",
];

/**
 * Unité d'un conteneur de vitesses : celle du conteneur, celle du nœud de
 * marche (a5e porte `unit` par mode), puis celle du mouvement de l'acteur.
 * @param {object} actor
 * @param {object} container
 * @returns {string|undefined}
 */
function readUnits(actor, container) {
  const walkNode = WALK_KEYS.map((key) => container?.[key]).find(
    (node) => node && typeof node === "object",
  );

  return firstUnits(
    container?.units,
    container?.unit,
    walkNode?.units,
    walkNode?.unit,
    getPath(actor, "system.attributes.movement.units"),
    getPath(actor, "system.attributes.movement.unit"),
  );
}

/**
 * Construit la carte des vitesses d'un conteneur : une entrée par action dont
 * une valeur numérique est lisible, la marche acceptant ses alias.
 * Retourne `null` si le conteneur n'expose aucune vitesse.
 * @param {any} container
 * @returns {Record<string, number>|null}
 */
export function readSpeedContainer(container) {
  if (typeof container === "number" || typeof container === "string") {
    const value = readNumber(container);
    return value === null ? null : { walk: value };
  }

  if (!container || typeof container !== "object") return null;

  const speeds = {};

  for (const action of SPEED_ACTIONS) {
    const value = readNumber(container[action]);
    if (value !== null) speeds[action] = value;
  }

  if (speeds.walk === undefined) {
    for (const key of WALK_KEYS) {
      const value = readNumber(container[key]);
      if (value !== null) {
        speeds.walk = value;
        break;
      }
    }
  }

  return Object.keys(speeds).length === 0 ? null : speeds;
}

/**
 * Dépendances par défaut : lecture défensive du réglage de chemin
 * personnalisé (les réglages ne sont pas enregistrés hors runtime Foundry) et
 * avertissement console.
 * @returns {{ getSpeedPath: () => string, warn: (message: string) => void }}
 */
function defaultDeps() {
  return {
    getSpeedPath: () => {
      try {
        return game.settings.get(MODULE_ID, SETTINGS.speedPath);
      } catch {
        return "";
      }
    },
    warn: (message) => console.warn(message),
  };
}

/**
 * Construit l'adaptateur générique.
 * @param {{ getSpeedPath?: () => string, warn?: (message: string) => void }} [deps]
 * @returns {object} adaptateur système
 */
export function makeGenericAdapter(deps = {}) {
  const { getSpeedPath, warn } = { ...defaultDeps(), ...deps };

  /** Chemins configurés déjà signalés : un avertissement, pas un par pas. */
  const warned = new Set();

  /**
   * Signale une fois qu'un chemin configuré par le MJ ne mène à rien. Le
   * chemin par défaut est tu : il rate normalement hors des systèmes
   * dnd5e-like, et le sondage prend le relais.
   * @param {string} path
   */
  function warnOnce(path) {
    if (path === DEFAULT_SPEED_PATH || warned.has(path)) return;

    warned.add(path);
    warn(
      `${MODULE_ID} | aucune vitesse lisible en "${path}" (réglage ${SETTINGS.speedPath}) : ` +
        "détection automatique utilisée à la place.",
    );
  }

  return {
    id: "generic",
    systems: [],

    readSpeeds(actor) {
      if (!actor) return null;

      // Chemin configuré d'abord : c'est le recours du MJ quand le sondage ne
      // trouve pas, ou trouve la mauvaise donnée.
      const customPath = getSpeedPath();
      if (typeof customPath === "string" && customPath.trim() !== "") {
        const path = customPath.trim();
        const container = getPath(actor, path);
        const speeds = readSpeedContainer(container);
        if (speeds) return { speeds, units: readUnits(actor, container) };

        warnOnce(path);
      }

      for (const path of CONTAINERS) {
        const container = getPath(actor, path);
        const speeds = readSpeedContainer(container);
        if (speeds) return { speeds, units: readUnits(actor, container) };
      }

      return null;
    },

    getMovementTypes: () => ({}),
  };
}
