v1.0.0:
Feat :
- Limite de vitesse appliquée au mode de déplacement utilisé (marche, vol, terrier, escalade, nage) et non plus à la seule marche.
- Modes mélangés sur un même tour : règle dnd5e de bascule de vitesse (le cumul du tour doit rester dans la vitesse du mode utilisé sur chaque segment).
- Une vitesse à 0 bloque tout déplacement dans ce mode (marche à 0 = jeton immobile, vol sans vitesse de vol = vol impossible) ; escalade et nage retombent sur la marche, la téléportation n'est jamais plafonnée, et un jeton sans donnée de vitesse n'est pas restreint.
- Module explicitement lié au système dnd5e (relationships.systems dans module.json).
Fix :
- Par défaut les 2 première régles de restriction de mouvement en combat sont appliqués
- Ne pas appliquer "Interdiction de revenir sur un déplacement déjà effectué" hors combat

v0.1.0:
Feat :
- En combat et à son tour, déplacement limité à la vitesse de l'acteur. (pour le moment que walk)
- En combat et hors de son tour, blocage total ; hors combat, aucune restriction.
- Règle d'exception pour le MJ
- Interdiction de revenir sur un déplacement déjà effectué, avec fenêtre de grâce configurable.