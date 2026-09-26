v3.1.0 (non publiée) :
Feat :
- Support de tous les systèmes Foundry : la lecture des vitesses passe par une couche d'adaptateurs système (src/systems/), le reste du module n'utilise que des API cœur.
- Adaptateurs embarqués : dnd5e (movement.speeds + CONFIG.DND5E.movementTypes), pf2e (attributes.speed + otherSpeeds), et un adaptateur générique qui sonde les emplacements habituels (attributes.movement, attributes.speed, movement, pace, details.move) en tolérant nombres, chaînes et objets (value/total/distance).
- Réglage « Actor speed data path » : le MJ peut pointer directement les vitesses d'un système non détecté. Par défaut l'emplacement dnd5e 6 (system.attributes.movement.speeds), qui sert aussi d'exemple de format ; un chemin sans résultat rend la main au sondage automatique (signalé une fois en console, sauf pour le défaut).
- API publique registerSystemAdapter/getSystemAdapter : un module ou système tiers branche ses propres vitesses ; le dernier adaptateur enregistré pour un système gagne.
- Vitesses converties dans l'unité de la scène quand les deux unités sont connues et diffèrent ; les notifications annoncent l'unité de la scène au lieu des pieds codés en dur.
- Plus de restriction de système dans module.json (relationships.systems retiré).
Fix :
- Vitesse introuvable = aucune limite de vitesse, sans emporter les autres restrictions (hors tour, take-back, contournements).

v3.0.0:
Feat :
- Limite de vitesse appliquée au mode de déplacement utilisé (marche, vol, terrier, escalade, nage) et non plus à la seule marche.
- Modes mélangés sur un même tour : règle dnd5e de bascule de vitesse (le cumul du tour doit rester dans la vitesse du mode utilisé sur chaque segment).
- Une vitesse à 0 bloque tout déplacement dans ce mode (marche à 0 = jeton immobile, vol sans vitesse de vol = vol impossible) ; escalade et nage retombent sur la marche, la téléportation n'est jamais plafonnée, et un jeton sans donnée de vitesse n'est pas restreint.
- Module explicitement lié au système dnd5e (relationships.systems dans module.json).
Fix :
- Par défaut les 2 première régles de restriction de mouvement en combat sont appliqués
- Ne pas appliquer "Interdiction de revenir sur un déplacement déjà effectué" hors combat : la position engagée n'est plus suivie que sur le tour en cours, et la fenêtre de grâce s'ouvre au début du tour.

v0.1.0:
Feat :
- En combat et à son tour, déplacement limité à la vitesse de l'acteur. (pour le moment que walk)
- En combat et hors de son tour, blocage total ; hors combat, aucune restriction.
- Règle d'exception pour le MJ
- Interdiction de revenir sur un déplacement déjà effectué, avec fenêtre de grâce configurable.