# FQ Restrain Movement

[![CI](https://github.com/LyrkhanJenkins/fq-restrain-movement/actions/workflows/ci.yml/badge.svg)](https://github.com/LyrkhanJenkins/fq-restrain-movement/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/LyrkhanJenkins/fq-restrain-movement?sort=semver)](https://github.com/LyrkhanJenkins/fq-restrain-movement/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Module Foundry VTT (v14, tous systèmes) qui restreint les déplacements des tokens des joueurs. Chaque restriction s'active indépendamment, et le MJ peut toujours laisser passer un déplacement au cas par cas.

Le module intercepte souris **et** clavier : les deux passent par le même point de contrôle.

## Installation

Dans Foundry : **Configuration → Add-on Modules → Install Module**, puis coller ce manifest :

```
https://github.com/LyrkhanJenkins/fq-restrain-movement/releases/latest/download/module.json
```

Sinon, télécharger `fq-restrain-movement.zip` depuis la [dernière release](https://github.com/LyrkhanJenkins/fq-restrain-movement/releases/latest) et le décompresser dans `Data/modules/`.

## Fonctionnalités

- **Limite de vitesse en combat** — à son tour, un token ne peut pas dépasser la vitesse du mode de déplacement qu'il utilise (marche, vol, terrier, escalade, nage), dans l'unité de distance de la scène. Une vitesse à 0 interdit tout déplacement dans ce mode — un acteur avec une vitesse de marche à 0 ne peut pas bouger, et un jeton en mode vol sans vitesse de vol non plus. Escalade et nage retombent sur la vitesse de marche, et la téléportation n'est jamais plafonnée. Un jeton sans donnée de vitesse exploitable (véhicule, jeton sans acteur, système dont les vitesses restent introuvables) n'est pas restreint. Quand un tour mélange plusieurs modes, la règle de bascule s'applique : la distance déjà parcourue est décomptée de la vitesse du nouveau mode.
- **Blocage hors de son tour** — en combat, un token ne peut pas bouger tant que ce n'est pas son tour. Hors combat, aucune restriction.
- **Exception MJ** — le MJ n'est pas soumis aux restrictions (activé par défaut).
- **Interdiction de revenir en arrière (take-back)** — en combat, un token ne peut plus se rapprocher de la position où il a commencé son tour, avec une fenêtre de grâce configurable en début de tour pour corriger un déplacement avant qu'il ne soit figé. Hors combat, aucune restriction.

## Réglages (menu du module, réservés au MJ)

| Réglage | Effet | Défaut |
|---------|-------|--------|
| Enable combat speed limit | Limite le déplacement à la vitesse du mode utilisé, à son tour en combat | On     |
| Block movement out of turn | Bloque tout déplacement hors de son tour en combat | On     |
| GM is not restrained | Exempte le MJ de toutes les restrictions | On     |
| Block taking back a move | En combat, interdit le retour vers la position de début de tour | Off    |
| Take-back grace window (seconds) | Délai après le début du tour avant gel de la position (`0` = gel immédiat) | 0      |
| Actor speed data path | Chemin des vitesses sur la fiche, pour un système non détecté ; chemin sans résultat = détection automatique | `system.attributes.movement.speeds` |

## Contournements (override)

Chaque restriction peut laisser passer un déplacement sans être désactivée globalement :

- **MJ** — exempté si « GM is not restrained » est actif.
- **Touche de bypass** — maintenir la touche (par défaut `Alt` gauche) pendant le déplacement.
- **Exemption par token** — via un flag sur le token.
- **Hook `fq-restrain-movement.evaluate`** — un handler peut forcer l'autorisation ou le blocage.

## Compatibilité

- Foundry VTT v14+ (vérifié 14.368)
- **Tous les systèmes.** Seule la lecture des vitesses dépend du système ; tout le reste (interception, combat,
  suivi de position) n'utilise que des API cœur de Foundry. Les vitesses passent par un *adaptateur système* :
  - **dnd5e** (vérifié 6.0.3) — adaptateur dédié : `system.attributes.movement.speeds`, modes et repli marche
    depuis `CONFIG.DND5E.movementTypes`.
  - **pf2e** — adaptateur dédié : `system.attributes.speed` et `otherSpeeds` ; voler et creuser exigent une
    vitesse dédiée, nager et grimper retombent sur la vitesse au sol.
  - **Tout autre système** — adaptateur générique : il sonde les emplacements habituels
    (`system.attributes.movement`, `system.attributes.speed`, `system.movement`, `system.pace`,
    `system.details.move`...), qu'il s'agisse de nombres, de chaînes ou d'objets (`value`, `total`, `distance`).
    Aucun mode n'étant connu, toute action retombe sur la vitesse de marche — choix permissif.
- **Rien trouvé ?** La limite de vitesse devient un no-op ; le blocage hors tour, le take-back et les
  contournements continuent de fonctionner. Deux recours :
  - le réglage **Actor speed data path**, qui pointe directement les données
    (`system.attributes.movement`, ou `system.details.move.value` pour une vitesse unique). Il vaut par défaut
    l'emplacement dnd5e 6 `system.attributes.movement.speeds`, qui sert aussi d'exemple de format ; un chemin
    qui ne mène à rien rend la main au sondage automatique (et le signale en console, sauf pour le défaut) ;
  - l'API `registerSystemAdapter` (ci-dessous), pour un adaptateur sur mesure.
- **Unités** — les plafonds sont convertis dans l'unité de la scène quand la fiche et la scène utilisent des
  unités connues et différentes (pieds, mètres, yards, kilomètres...). Unité inconnue (« cases »...) : aucune
  conversion, les valeurs sont comparées telles quelles.
- Aucune dépendance runtime

## API

`game.modules.get("fq-restrain-movement").api` expose `evaluate`, `registerRule`, `getSystemAdapter`,
`HOOK_EVALUATE`, `RULE_IDS` et `registerSystemAdapter` :

```js
game.modules.get("fq-restrain-movement").api.registerSystemAdapter({
  id: "mon-systeme",
  systems: ["mon-systeme"],
  // `null` = aucune vitesse exploitable -> aucune limite de vitesse.
  readSpeeds: (actor) => ({
    speeds: { walk: actor?.system?.vitesse ?? 0, fly: actor?.system?.vol ?? 0 },
    units: "m",
  }),
  // Mode absent de cette carte -> repli sur la vitesse de marche.
  getMovementTypes: () => ({
    walk: { label: "MONSYS.Vitesse" },
    fly: { label: "MONSYS.Vol", walkFallback: false },
  }),
});
```

Le dernier adaptateur enregistré pour un système gagne : un module tiers peut donc remplacer un adaptateur
embarqué. À enregistrer au plus tard sur le hook `setup`.

## Langues

Anglais et Français.

## Licence

MIT — voir [LICENSE](LICENSE).

## Contribuer

Les issues et pull requests se font sur [GitHub](https://github.com/LyrkhanJenkins/fq-restrain-movement/issues). La CI vérifie ESLint et Vitest sur chaque PR ; `npm run lint` et `npm test` en local avant de proposer un changement.
