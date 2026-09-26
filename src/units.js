/**
 * Conversion et mise en forme des distances.
 *
 * Les vitesses viennent de la fiche d'acteur, dans l'unité du système (pieds
 * en dnd5e/pf2e, mètres dans les systèmes métriques...), tandis que la mesure
 * de trajet (`measureMovementPath`/`grid.measurePath`) rend une distance dans
 * l'unité de la scène (`scene.grid.units`). Comparer les deux directement n'est
 * correct que si les unités coïncident — ce qui n'est plus garanti dès qu'on
 * quitte dnd5e.
 *
 * Politique : on ne convertit QUE si les deux unités sont connues de la table
 * ci-dessous et diffèrent. Unité inconnue (« cases », « steps », libellé
 * traduit...) ou identique : la valeur passe telle quelle, jamais de mise à
 * l'échelle hasardeuse.
 */

/** Facteurs vers le mètre, par unité normalisée (minuscules, sans ponctuation). */
const METERS_PER_UNIT = {
  ft: 0.3048,
  feet: 0.3048,
  foot: 0.3048,
  pi: 0.3048,
  pied: 0.3048,
  pieds: 0.3048,
  in: 0.0254,
  inch: 0.0254,
  inches: 0.0254,
  yd: 0.9144,
  yard: 0.9144,
  yards: 0.9144,
  mi: 1609.344,
  mile: 1609.344,
  miles: 1609.344,
  m: 1,
  meter: 1,
  meters: 1,
  metre: 1,
  metres: 1,
  "mètre": 1,
  "mètres": 1,
  cm: 0.01,
  km: 1000,
};

/**
 * Normalise un libellé d'unité : minuscules, espaces et ponctuation de fin
 * retirés (`"Ft."` -> `"ft"`). Retourne `null` si l'entrée n'est pas une chaîne
 * exploitable.
 * @param {any} units
 * @returns {string|null}
 */
export function normalizeUnits(units) {
  if (typeof units !== "string") return null;

  const normalized = units.trim().toLowerCase().replace(/[.\s]+$/u, "");
  return normalized === "" ? null : normalized;
}

/**
 * Convertit une distance d'une unité vers une autre.
 * Renvoie la valeur inchangée si l'une des unités est inconnue ou si elles
 * sont équivalentes — la conversion est un confort, jamais une source de
 * blocage inattendu.
 * @param {number} value
 * @param {string|null|undefined} from
 * @param {string|null|undefined} to
 * @returns {number}
 */
export function convertDistance(value, from, to) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;

  const source = METERS_PER_UNIT[normalizeUnits(from)];
  const target = METERS_PER_UNIT[normalizeUnits(to)];
  if (!source || !target || source === target) return value;

  return (value * source) / target;
}

/**
 * Convertit une carte de vitesses `{ action: number|null }` d'une unité vers
 * une autre. Les entrées non numériques (`null` = vitesse inconnue) sont
 * conservées telles quelles.
 * @param {Record<string, number|null>|null|undefined} speeds
 * @param {string|null|undefined} from
 * @param {string|null|undefined} to
 * @returns {Record<string, number|null>|null}
 */
export function convertSpeeds(speeds, from, to) {
  if (!speeds) return null;

  const source = METERS_PER_UNIT[normalizeUnits(from)];
  const target = METERS_PER_UNIT[normalizeUnits(to)];
  if (!source || !target || source === target) return speeds;

  const converted = {};
  for (const [action, value] of Object.entries(speeds)) {
    converted[action] = typeof value === "number" ? convertDistance(value, from, to) : value;
  }

  return converted;
}

/**
 * Met en forme une vitesse pour les notifications : valeur arrondie au
 * centième (les conversions produisent des décimales) suivie de l'unité quand
 * elle est connue. Les libellés d'unité sont laissés tels que la scène les
 * expose (« ft », « m », « cases »...).
 * @param {number} value
 * @param {string|null|undefined} units
 * @returns {string}
 */
export function formatSpeed(value, units) {
  const rounded = Math.round(value * 100) / 100;
  const label = typeof units === "string" ? units.trim() : "";

  return label === "" ? `${rounded}` : `${rounded} ${label}`;
}
