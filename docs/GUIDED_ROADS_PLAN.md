# v0.7 — Guided Roads

Extend v0.6 (`446a746b6515e848f292e4e0b18b8a5f1bf17d5f`) within the existing static Three.js, Rapier and GitHub Pages project.

## Arrival and optional journeys

Spawn in the auto’s left-hand road lane, outside every entry trigger. Enter starts the visit; reloads and shared project hashes only suggest a route. Centered notifications offer a company tour, taxi fares or free exploring. Places also lets the visitor change that choice. The company guide advances through unvisited destinations; taxi guidance follows the selected passenger. Eight accomplishments persist locally, award once and never lock a destination. Actual driving distance, rather than a directory teleport, earns the first-drive accomplishment.

Use small road X marks that expand smoothly within ten metres. Keep the bottom Enter prompt dependent on proximity and speed. The map uses matching X destinations while preserving readable numbered markers in the full atlas.

## Driving and instruments

Keep the map at bottom right and analog speed/rev instruments immediately above it. Display five gears with hysteresis and a rev drop at shifts. Enforce 70 km/h road speed and 120 km/h player boost; gently settle back to road speed on release. Traffic has no boost capability. A boost launch rotates the visual auto about its rear axle for two seconds, adds inexpensive instanced streaks and a gentle camera/edge effect. Keep the physics chassis stable with suspension, CCD and speed-dependent downforce. Reduced motion removes the launch effects.

Touch boost uses an independent captured pointer. Cancel touch state on release, cancellation, focus loss, page hiding and viewport rotation. Reserve separate HUD regions for the logo, journey guide, duty card, directions, instruments and touch controls in portrait and short landscape layouts.

## Traffic and access

Use eight traffic actors in performance mode and twelve in balanced mode. Cars have rounded classic saloon, hatchback, SUV and luxury-sedan silhouettes with sloped glazing, grilles, lamps, trim and visible wheels. Autos, motorbikes and cycles keep their existing forms.

Riders follow terrain height while their obstacle sweep excludes the ground/road trimeshes; fences, buildings, closures and protected residents still block travel. Measure actual displacement, slow cars for bends, reverse briefly out of jams, and recover prolonged stranding on unoccupied forward road samples clear of static colliders and away from the visitor. Traffic lights and loading stops remain intentional. The clinic-to-hill bend clears the OpsFlash porch rather than clipping its collision platform.

Generate hill guardrails from shared road samples, leaving a vehicle-sized margin around the entire observatory driveway and its entry bay. Keep ridge trees out of destination approaches. Test driving out of the observatory, braking on the hill road, reversing through the opening and entering again without a second teleport.

## Scenery and frame budget

Populate each market stall with a vendor/customer and add walking shoppers on the dry verge. Generate a soft shaded cumulus texture once using canvas and render clouds in one instanced draw. Use feathered, hinged-wing birds with body, tail and hooked beak; exactly two eagles orbit Eagle Towers. Start the roof view toward a nearby eagle and correct the left/right yaw sign.

The radio backdrop renders every world animation frame and uses no expensive backdrop blur. Cache fare offer DOM and road routes; keep turn cues current without rebuilding the route for every yaw change. Sustained frame-budget misses reduce shadows and resolution after a few seconds, with further bounded resolution reductions if needed. Weather particles and distant actors follow the quality setting; the simulation, resident protection and fare rules stay active.

## Release evidence

Require formatting, all 47 unit/physics checks, the TypeScript/Vite build and all eighteen production-browser journeys. Review the welcome, X entry, roof/eagle, radio, market, boost and portrait/landscape instrument captures. CI repeats all browser shards and gates Pages deployment. Verify the exact release commit, deployed asset hashes and a live road-first journey. Chromium touch emulation is separate from physical iPhone/Safari testing and hardware frame-time measurements.
