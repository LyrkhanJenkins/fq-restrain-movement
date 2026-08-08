import { PRECEDENCE } from "../constants.js";

/**
 * Registre de règles. Une règle enregistrée expose :
 * `{ id, isEnabled: () => boolean, evaluate: (context) => { allowed, reason } }`.
 * Stockage au niveau du module ; aucune règle n'est embarquée par défaut.
 */
let rules = [];

/**
 * Enregistre une règle dans le registre.
 * @param {{ id: string, isEnabled: () => boolean, evaluate: (context: object) => { allowed: boolean, reason?: string } }} rule
 * @throws {Error} si `rule.id` n'est pas une chaîne ou `rule.evaluate` n'est pas une fonction.
 */
export function registerRule(rule) {
  if (!rule || typeof rule.id !== "string") {
    throw new Error("registerRule: rule.id doit être une chaîne de caractères.");
  }
  if (typeof rule.evaluate !== "function") {
    throw new Error(`registerRule: la règle "${rule.id}" doit exposer une fonction evaluate().`);
  }
  rules.push(rule);
}

/**
 * Retourne une copie des règles enregistrées, triées selon la précédence
 * `PRECEDENCE`. Les identifiants absents de `PRECEDENCE` sont placés après
 * les règles connues, dans leur ordre d'enregistrement relatif.
 * @returns {Array<object>}
 */
export function getRules() {
  const precedenceIndex = (id) => {
    const index = PRECEDENCE.indexOf(id);
    return index === -1 ? Number.POSITIVE_INFINITY : index;
  };

  return [...rules].sort((a, b) => precedenceIndex(a.id) - precedenceIndex(b.id));
}

/**
 * Vide le registre. Utilitaire de test.
 */
export function clearRules() {
  rules = [];
}
