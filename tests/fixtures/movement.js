/**
 * Fixtures de contexte de mouvement : reproduisent le contrat de contexte sans
 * dépendre de Foundry. Utilisées pour piloter la vraie logique de décision des
 * règles (mesure, autorisé/bloqué/exempté, précédence, override-wins).
 */

/**
 * Construit un `grid` mock dont `measurePath` retourne des métriques fixes.
 * Additif : accepte `spaces` (cases), `distance` et `cost` (pieds) ; défauts
 * sûrs pour ne pas casser les suites qui ne passent que `spaces`. La règle de
 * distance speed-aware compare sur `cost` (repli `distance`), pas `spaces`.
 * @param {{ spaces?: number, distance?: number, cost?: number }} options
 * @returns {{ isGridless: boolean, measurePath: (waypoints: Array) => { spaces: number, distance: number, cost: number } }}
 */
export function makeGrid({ spaces = 0, distance = 0, cost = 0 } = {}) {
  return {
    isGridless: false,
    measurePath: () => ({ spaces, distance, cost }),
  };
}

/**
 * Construit un `grid` mock dont `measurePath` mesure RÉELLEMENT la distance
 * euclidienne entre le premier et le dernier waypoint (`cost`/`distance`
 * identiques). Contrairement à `makeGrid` (valeur fixe), permet aux deux
 * mesures avant/après de la règle take-back ([from, engaged] vs [to, engaged])
 * de différer selon les coordonnées passées.
 * @returns {{ isGridless: boolean, measurePath: (waypoints: Array<{x:number,y:number}>) => { spaces: number, distance: number, cost: number } }}
 */
export function makeMeasuringGrid() {
  return {
    isGridless: false,
    measurePath: (waypoints) => {
      const first = waypoints[0];
      const last = waypoints[waypoints.length - 1];
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return { spaces: 0, distance: dist, cost: dist };
    },
  };
}

/**
 * Construit un contexte de mouvement conforme au contrat de contexte de
 * mouvement.
 * @param {object} overrides
 * @returns {object} contexte de mouvement mockable
 */
export function makeContext(overrides = {}) {
  return {
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    path: null,
    tokenDocument: { flags: {} },
    userId: "u1",
    isGM: false,
    inCombat: false,
    isYourTurn: false,
    speed: 30,
    // Unité de distance de la scène : les plafonds annoncés dans les
    // notifications en héritent (cf. `formatSpeed`).
    speedUnits: "ft",
    engagedPosition: null,
    grid: {
      isGridless: false,
      measurePath: (waypoints) => ({
        spaces: Array.isArray(waypoints) ? Math.max(0, waypoints.length - 1) : 0,
        distance: 0,
        cost: 0,
      }),
    },
    ...overrides,
  };
}

/**
 * Construit un `measurePath` qui rend les cumuls par waypoint attendus par la
 * règle de distance en mode « bascule de vitesse ». `segmentCosts[i]` est le
 * coût en pieds du segment menant au waypoint `i + 1`.
 * @param {number[]} segmentCosts
 * @returns {(waypoints: Array) => { cost: number, distance: number, waypoints: Array<{cost: number, distance: number}> }}
 */
export function makeSegmentedMeasure(segmentCosts) {
  return () => {
    const cumulative = [{ cost: 0, distance: 0 }];
    let total = 0;
    for (const cost of segmentCosts) {
      total += cost;
      cumulative.push({ cost: total, distance: total });
    }
    return { cost: total, distance: total, waypoints: cumulative };
  };
}

/**
 * Construit un trajet de waypoints portant chacun son action de déplacement.
 * Le premier waypoint est l'origine ; `actions[i]` est l'action du segment
 * menant au waypoint `i + 1`.
 * @param {string[]} actions
 * @returns {Array<{x: number, y: number, action: string}>}
 */
export function makeActionPath(actions) {
  return [
    { x: 0, y: 0, action: actions[0] },
    ...actions.map((action, index) => ({ x: (index + 1) * 100, y: 0, action })),
  ];
}
