# FQ Restrain Movement

Module Foundry VTT (v14, système dnd5e) qui restreint les déplacements des tokens des joueurs. Chaque restriction s'active indépendamment, et le MJ peut toujours laisser passer un déplacement au cas par cas.

Le module intercepte souris **et** clavier : les deux passent par le même point de contrôle.

## Fonctionnalités

- **Limite de vitesse en combat** — à son tour, un token ne peut pas dépasser sa vitesse de marche (`walk`, en pieds). *(v0.1.0 : vitesse de marche uniquement.)*
- **Blocage hors de son tour** — en combat, un token ne peut pas bouger tant que ce n'est pas son tour. Hors combat, aucune restriction.
- **Exception MJ** — le MJ n'est pas soumis aux restrictions (activé par défaut).
- **Interdiction de revenir en arrière (take-back)** — une fois déplacé, un token ne peut plus revenir vers sa position engagée, avec une fenêtre de grâce configurable pour corriger un déplacement avant qu'il ne soit figé.

## Réglages (menu du module, réservés au MJ)

| Réglage | Effet | Défaut |
|---------|-------|--------|
| Enable combat speed limit | Limite le déplacement à la vitesse de marche, à son tour en combat | On     |
| Block movement out of turn | Bloque tout déplacement hors de son tour en combat | On     |
| GM is not restrained | Exempte le MJ de toutes les restrictions | On     |
| Block taking back a move | Interdit le retour vers la position engagée | Off    |
| Take-back grace window (seconds) | Délai avant gel de la position (`0` = gel immédiat) | 0      |

## Contournements (override)

Chaque restriction peut laisser passer un déplacement sans être désactivée globalement :

- **MJ** — exempté si « GM is not restrained » est actif.
- **Touche de bypass** — maintenir la touche (par défaut `Alt` gauche) pendant le déplacement.
- **Exemption par token** — via un flag sur le token.
- **Hook `fq-restrain-movement.evaluate`** — un handler peut forcer l'autorisation ou le blocage.

## Compatibilité

- Foundry VTT v14+ (vérifié 14.365)
- Système dnd5e 5.3+
- Aucune dépendance runtime

## Langues

Anglais et Français.

## Licence

MIT — voir [LICENSE](LICENSE).
