Update 3.0.0:
    Feat:
        - Speed limit per movement mode: on its turn, a token cannot exceed the speed of the mode it is using (walk, fly, burrow, climb, swim), in the distance unit of the scene
        - A speed of 0 forbids any movement in that mode, climb and swim fall back to the walk speed, and teleport is never capped
        - Modes mixed within a single turn: the distance already covered is taken out of the speed of the new mode
        - Every system supported: speeds are read through an adapter layer (src/systems/), the rest of the module only using core Foundry APIs
        - Dedicated adapters for dnd5e (movement.speeds + CONFIG.DND5E.movementTypes) and pf2e (attributes.speed + otherSpeeds)
        - Generic adapter for every other system, probing the usual locations (attributes.movement, attributes.speed, movement, pace, details.move) and tolerating numbers, strings and objects (value, total, distance)
        - No system restriction left at install time
        - "Actor speed data path" setting, to point straight at the speeds of a system that is not detected; it defaults to the dnd5e 6 location (system.attributes.movement.speeds), which also serves as a format example, and a path without a result hands back to the automatic probing
        - registerSystemAdapter / getSystemAdapter API: a third-party module or system plugs in its own speeds, and the last adapter registered for a system wins
        - Speeds converted into the unit of the scene when both units are known and differ, and notifications announcing the unit of the scene instead of hardcoded feet
    Chore:
        - Version bump 14.368, dnd5e 6.0.5 verified, pf2e verified, and every other system through the generic adapter
        - Version following FQ Card Engine and FQ Enhanced Combat: the three modules are published together
    Fix:
        - The first two combat restrictions are enabled by default
        - The take-back ban no longer applies out of combat: the engaged position is only tracked on the current turn, and the grace window opens at the start of the turn
        - Speed not found (vehicle, token without an actor, unresolved system): the speed limit becomes a no-op, without taking down the off-turn block, the take-back or the bypasses

Update 0.1.0:
    Feat:
        - First version of FQ Restrain Movement: movement restrictions for players' tokens on Foundry VTT v14 / dnd5e
        - Speed limit in combat: on its turn, a token cannot exceed its walk speed, in feet (walk speed only in this version)
        - Blocking outside of its turn: in combat, a token cannot move when it is not its turn, and out of combat nothing is restricted
        - GM exception: the GM is not subject to the restrictions (enabled by default)
        - Take-back ban: a token cannot move back towards the position it engaged from, with a configurable grace window
        - Mouse and keyboard interception, restrictions enabled separately, and a case-by-case bypass (GM, bypass key, per-token exemption, fq-restrain-movement.evaluate hook)
    Chore:
        - Version bump 14.365, dnd5e 5.3+
