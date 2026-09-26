/**
 * Lectures défensives partagées par les adaptateurs système : descente de
 * chemin et extraction de nombre. Aucune dépendance Foundry.
 */

/** Clés portant la valeur numérique quand une vitesse est un objet. */
const NUMBER_KEYS = ["value", "total", "distance", "max", "base"];

/**
 * Descend un chemin pointé dans un objet (`"system.attributes.movement"`).
 * Retourne `undefined` dès qu'un maillon manque — jamais d'exception.
 * @param {object|null|undefined} root
 * @param {string} path
 * @returns {any}
 */
export function getPath(root, path) {
  if (!root || typeof path !== "string" || path === "") return undefined;

  let current = root;
  for (const key of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }

  return current;
}

/**
 * Extrait une vitesse d'un nœud de données système :
 * - nombre fini positif ou nul -> la valeur ;
 * - chaîne numérique (certains systèmes stockent `"30"`) -> sa valeur ;
 * - objet -> première clé numérique parmi `value`, `total`, `distance`,
 *   `max`, `base` (a5e, pf1, swade... enveloppent la vitesse) ;
 * - tout le reste (`null`, `undefined`, `NaN`, négatif) -> `null`, qui signifie
 *   « pas de donnée » et non « vitesse nulle ».
 * @param {any} node
 * @returns {number|null}
 */
export function readNumber(node) {
  if (typeof node === "number") {
    return Number.isFinite(node) && node >= 0 ? node : null;
  }

  if (typeof node === "string") {
    const trimmed = node.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  if (node && typeof node === "object") {
    for (const key of NUMBER_KEYS) {
      const value = readNumber(node[key]);
      if (value !== null) return value;
    }
  }

  return null;
}

/**
 * Première unité exploitable d'un conteneur de vitesses (`units` ou `unit`),
 * avec repli sur l'unité globale du mouvement de l'acteur.
 * @param {...any} candidates
 * @returns {string|undefined}
 */
export function firstUnits(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") return candidate;
  }

  return undefined;
}
