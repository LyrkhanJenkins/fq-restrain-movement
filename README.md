# FQ Restrain Movement

Module Foundry VTT (v14, système dnd5e) qui restreint les déplacements des tokens des joueurs. Chaque restriction s'active indépendamment, et le MJ peut toujours laisser passer un déplacement au cas par cas.

Le module intercepte souris **et** clavier : les deux passent par le même point de contrôle.

## Fonctionnalités

- **Limite de vitesse en combat** — à son tour, un token ne peut pas dépasser la vitesse du mode de déplacement qu'il utilise (marche, vol, terrier, escalade, nage), en pieds. Une vitesse à 0 interdit tout déplacement dans ce mode — un acteur avec une vitesse de marche à 0 ne peut pas bouger, et un jeton en mode vol sans vitesse de vol non plus. Escalade et nage retombent sur la vitesse de marche, et la téléportation n'est jamais plafonnée. Un jeton sans donnée de vitesse exploitable (véhicule, jeton sans acteur) n'est pas restreint. Quand un tour mélange plusieurs modes, la règle dnd5e de bascule s'applique : la distance déjà parcourue est décomptée de la vitesse du nouveau mode.
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

## Contournements (override)

Chaque restriction peut laisser passer un déplacement sans être désactivée globalement :

- **MJ** — exempté si « GM is not restrained » est actif.
- **Touche de bypass** — maintenir la touche (par défaut `Alt` gauche) pendant le déplacement.
- **Exemption par token** — via un flag sur le token.
- **Hook `fq-restrain-movement.evaluate`** — un handler peut forcer l'autorisation ou le blocage.

## Compatibilité

- Foundry VTT v14+ (vérifié 14.365)
- Système dnd5e 5.0+ (vérifié 5.3.3) — module réservé à dnd5e : la résolution des vitesses s'appuie sur `CONFIG.DND5E.movementTypes`
- Aucune dépendance runtime

## Langues

Anglais et Français.

## Licence

MIT — voir [LICENSE](LICENSE).
