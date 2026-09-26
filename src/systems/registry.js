/**
 * Registre des adaptateurs système.
 *
 * Un adaptateur isole TOUT ce que le module doit savoir du système de jeu :
 * où vivent les vitesses sur la fiche d'acteur, dans quelle unité, et quels
 * modes de déplacement existent. Le reste du module (interception, règles,
 * suivi de position) n'utilise que des API cœur de Foundry et fonctionne donc
 * tel quel dans n'importe quel système.
 *
 * Contrat d'un adaptateur :
 * ```js
 * {
 *   id: "dnd5e",
 *   // Identifiants de systèmes gérés. Vide/absent : adaptateur jamais choisi
 *   // automatiquement (repli explicite, ou sélection par une API tierce).
 *   systems: ["dnd5e"],
 *   // Vitesses de l'acteur, dans l'unité du système.
 *   // `null` : aucune donnée exploitable -> la règle de distance est un no-op.
 *   readSpeeds(actor) -> { speeds: Record<string, number>|null, units?: string }|null,
 *   // Modes de déplacement connus du système : libellé et repli marche.
 *   // Une action absente de cette carte retombe sur la vitesse de marche.
 *   getMovementTypes() -> Record<string, { label?: string, walkFallback?: boolean }>,
 * }
 * ```
 *
 * Résolution : le dernier adaptateur enregistré qui déclare le système courant
 * gagne (un module tiers peut donc remplacer un adaptateur embarqué), sinon
 * l'adaptateur de repli générique.
 */

/** Adaptateurs enregistrés, dans l'ordre d'enregistrement. */
let adapters = [];

/** Adaptateur utilisé quand aucun enregistré ne déclare le système courant. */
let fallbackAdapter = null;

/** Mémoïsation de la résolution, invalidée à chaque enregistrement. */
let resolved = null;

/**
 * Valide la forme minimale d'un adaptateur.
 * @param {object} adapter
 * @throws {Error} si le contrat n'est pas respecté.
 */
function assertAdapter(adapter) {
  if (!adapter || typeof adapter.id !== "string") {
    throw new Error("registerSystemAdapter: adapter.id doit être une chaîne de caractères.");
  }
  if (typeof adapter.readSpeeds !== "function") {
    throw new Error(
      `registerSystemAdapter: l'adaptateur "${adapter.id}" doit exposer une fonction readSpeeds().`,
    );
  }
}

/**
 * Enregistre un adaptateur système. Exposé dans l'API publique du module :
 * un système ou un module tiers peut brancher ses propres vitesses sans
 * modifier fq-restrain-movement.
 * @param {object} adapter
 */
export function registerSystemAdapter(adapter) {
  assertAdapter(adapter);
  adapters.push(adapter);
  resolved = null;
}

/**
 * Définit l'adaptateur de repli (générique). Le dernier défini gagne.
 * @param {object} adapter
 */
export function setFallbackAdapter(adapter) {
  assertAdapter(adapter);
  fallbackAdapter = adapter;
  resolved = null;
}

/**
 * Sélection pure : dernier adaptateur déclarant `systemId`, sinon repli.
 * @param {string|null|undefined} systemId
 * @param {Array<object>} candidates
 * @param {object|null} fallback
 * @returns {object|null}
 */
export function resolveSystemAdapter(systemId, candidates, fallback = null) {
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const adapter = candidates[index];
    if (Array.isArray(adapter.systems) && adapter.systems.includes(systemId)) return adapter;
  }

  return fallback;
}

/**
 * Adaptateur du système courant, mémoïsé. Lecture défensive de `game.system.id`
 * (absent hors runtime Foundry -> repli générique).
 * @param {{ getSystemId?: () => string|undefined }} [deps]
 * @returns {object|null}
 */
export function getSystemAdapter(deps = {}) {
  const getSystemId =
    deps.getSystemId ?? (() => (typeof game !== "undefined" ? game?.system?.id : undefined));

  if (deps.getSystemId) return resolveSystemAdapter(getSystemId(), adapters, fallbackAdapter);

  if (!resolved) resolved = resolveSystemAdapter(getSystemId(), adapters, fallbackAdapter);
  return resolved;
}

/**
 * Vide le registre. Utilitaire de test.
 */
export function clearSystemAdapters() {
  adapters = [];
  fallbackAdapter = null;
  resolved = null;
}
