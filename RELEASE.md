# Release Notes

## v3.0.0

Le module n'est plus réservé à dnd5e, et la limite de vitesse s'applique au mode de déplacement réellement utilisé plutôt qu'à la seule marche.

### Nouveautés

- **Limite de vitesse par mode de déplacement** — à son tour, un token ne peut pas dépasser la vitesse du mode qu'il utilise (marche, vol, terrier, escalade, nage), dans l'unité de distance de la scène. Une vitesse à 0 interdit tout déplacement dans ce mode ; escalade et nage retombent sur la vitesse de marche ; la téléportation n'est jamais plafonnée.
- **Modes mélangés sur un même tour** — règle de bascule de vitesse : la distance déjà parcourue est décomptée de la vitesse du nouveau mode.
- **Tous les systèmes** — la lecture des vitesses passe par une couche d'adaptateurs (`src/systems/`), le reste du module n'utilisant que des API cœur de Foundry. Adaptateurs dédiés pour **dnd5e** (`movement.speeds` + `CONFIG.DND5E.movementTypes`) et **pf2e** (`attributes.speed` + `otherSpeeds`), et un adaptateur **générique** pour tous les autres, qui sonde les emplacements habituels (`attributes.movement`, `attributes.speed`, `movement`, `pace`, `details.move`) en tolérant nombres, chaînes et objets (`value`, `total`, `distance`). Plus aucune restriction de système à l'installation.
- **Réglage « Actor speed data path »** — pointer directement les vitesses d'un système non détecté. Il vaut par défaut l'emplacement dnd5e 6 (`system.attributes.movement.speeds`), qui sert aussi d'exemple de format ; un chemin sans résultat rend la main au sondage automatique.
- **API `registerSystemAdapter` / `getSystemAdapter`** — un module ou système tiers branche ses propres vitesses ; le dernier adaptateur enregistré pour un système gagne.
- **Unités** — les vitesses sont converties dans l'unité de la scène quand les deux unités sont connues et diffèrent ; les notifications annoncent l'unité de la scène au lieu des pieds codés en dur.

### Corrections

- Les deux premières règles de restriction en combat sont actives par défaut.
- L'interdiction de revenir en arrière ne s'applique plus hors combat : la position engagée n'est suivie que sur le tour en cours, et la fenêtre de grâce s'ouvre au début du tour.
- Vitesse introuvable (véhicule, jeton sans acteur, système non résolu) : la limite de vitesse devient un no-op, sans emporter le blocage hors tour, le take-back ni les contournements.

### Compatibilité

- Foundry VTT v14+ (vérifié 14.368)
- dnd5e 6.0+ (vérifié 6.0.5), pf2e, et tout autre système via l'adaptateur générique

## v0.1.0

Première version de **FQ Restrain Movement** — restrictions de déplacement des tokens pour Foundry VTT v14 / dnd5e.

### Nouveautés

- **Limite de vitesse en combat** — à son tour, un token ne peut pas dépasser sa vitesse de marche (`walk`, en pieds). *(Vitesse de marche uniquement pour cette version.)*
- **Blocage hors de son tour** — en combat, un token ne peut pas bouger quand ce n'est pas son tour. Hors combat, aucune restriction.
- **Exception MJ** — le MJ n'est pas soumis aux restrictions (activé par défaut).
- **Interdiction de revenir en arrière (take-back)** — un token ne peut plus revenir vers sa position engagée après un déplacement, avec fenêtre de grâce configurable.

Interception souris + clavier, restrictions activables séparément, et contournement au cas par cas (MJ, touche de bypass, exemption par token, hook `fq-restrain-movement.evaluate`).

### Compatibilité

- Foundry VTT v14+ (vérifié 14.365)
- Système dnd5e 5.3+
