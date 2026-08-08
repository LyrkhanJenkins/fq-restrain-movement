# Release Notes

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
