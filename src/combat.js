/**
 * Lecteurs de contexte de combat. Même patron que `src/overrides.js` : les
 * entrées Foundry passent par `deps` (injectables via `defaultDeps()`), la
 * logique reste pure et testable sans runtime Foundry. Les vitesses sont
 * lues par `src/movement.js`, qui dépend du mode de déplacement.
 */

/**
 * Dépendances par défaut, branchées sur Foundry en production. Injectables
 * via `deps` pour permettre un test sans runtime Foundry.
 * @returns {{ getCombat: () => object|null|undefined }}
 */
function defaultDeps() {
  return {
    getCombat: () => game.combat,
  };
}

/**
 * Le combat est-il démarré ?
 * @param {{ getCombat: () => object|null|undefined }} deps
 * @returns {boolean}
 */
export function getInCombat(deps) {
  return Boolean(deps.getCombat()?.started);
}

/**
 * Est-ce le tour de ce token ? Vrai si le combattant courant du combat
 * correspond à ce token (comparaison de l'identifiant de token du combattant
 * à `tokenDocument.id`). Faux si pas de combat ou pas de combattant courant.
 * Les deux accès `combatant.tokenId` et `combatant.token?.id` sont supportés.
 * @param {object} tokenDocument
 * @param {{ getCombat: () => object|null|undefined }} deps
 * @returns {boolean}
 */
export function getIsYourTurn(tokenDocument, deps) {
  const combatant = deps.getCombat()?.combatant;
  if (!combatant || !tokenDocument) return false;

  const combatantTokenId = combatant.tokenId ?? combatant.token?.id;
  return combatantTokenId !== undefined && combatantTokenId === tokenDocument.id;
}

/**
 * Agrège les lecteurs de combat en `{ inCombat, isYourTurn }`, fusionné dans le
 * contexte de mouvement par `buildMovementContext()`. Les vitesses sont lues à
 * part par `readMovementContext()` (`src/movement.js`) : elles dépendent du
 * mode de déplacement, pas du combat.
 * @param {object} tokenDocument
 * @param {{ getCombat: () => object|null|undefined }} [deps]
 * @returns {{ inCombat: boolean, isYourTurn: boolean }}
 */
export function readCombatContext(tokenDocument, deps = defaultDeps()) {
  return {
    inCombat: getInCombat(deps),
    isYourTurn: getIsYourTurn(tokenDocument, deps),
  };
}
