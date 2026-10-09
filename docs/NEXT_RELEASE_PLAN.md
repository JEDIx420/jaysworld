# Jay's World — next release plan, v0.5

Prepared 10 October 2026, India time. Baseline: v0.4, commit `96ea480d3796642a00a0480cf4552ce3f96c51aa`.

Status: proposed implementation specification. This document does not claim these features are implemented or tested. It records the next release against Jay's latest feedback and all ten supplied desktop/phone screenshots.

## The experience

A small Kerala town that visitors can play through. Start outside **Eagle Towers**, hear Ente Radio on the first gesture, drive through a living town, park beside something interesting, and interact with an object there. The professional work stays easy to discover; play, music and observation make the journey memorable.

The visual direction remains warm and restrained: laterite, tiled roofs, timber, hand-painted signs, brass, cream paper, worn plastic, teal and amber. Eagle Towers adds glass, steel and clean signage. The radio, drum machine and project displays get authored shapes, tactile controls, indicator lights and short sound cues. Each venue has its own composition and camera.

Primary content rule: **one title, one short sentence, one interaction** on a normal exhibit screen. Aim for at most 25 words of descriptive copy at once, excluding necessary controls, station names and project titles. Longer professional detail remains optional through accessible project links. No exhibit should require reading a paragraph or scrolling through a page before playing.

## What the review found

| Current evidence                                                                                       | Change required                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Phone screenshots show directions, fare details, radio status, map, speed and branding simultaneously. | Define which information is visible in each mode; remove duplicate persistent panels.                  |
| The tea-shop view looks over its roof, above a large menu panel.                                       | Give each venue authored camera anchors and a close view of its interactive objects.                   |
| Project readers have tab rows, long copy and scrolling layouts.                                        | Browse short visual exhibits with arrows, Enter and touch equivalents.                                 |
| `src/input.ts` supports E globally, but Enter only when the canvas is focused.                         | Make Enter the contextual interaction key and handle focus consistently.                               |
| Observatory uses the shared building model near a road bend.                                           | Validate its whole footprint, foundation, entrance and parking against road clearance.                 |
| Each closure has a 10 m barricade collider; roadside trees are separated by gaps.                      | Close the accessible perimeter with continuous, visibly justified obstacles.                           |
| Terrain tests check ground heights and climbing, but do not prove closures cannot be bypassed.         | Reproduce side approaches, steep-slope driving and high-speed impacts as separate cases.               |
| The player auto already has CCD enabled.                                                               | Investigate missing obstacle coverage and embedded-body cases; another CCD toggle is not the solution. |
| Residents near shops use fixed coordinates rather than a common placement validator.                   | Require safe verge/patio placement for every person, animal and pickup.                                |
| `FareGame` selects one passenger from completed-fare count.                                            | Introduce multiple live offers and explicit player/rival boarding ownership.                           |
| Music-shop action opens the radio FX dialog, although an eight-step beat engine already exists.        | Make the beat instrument the studio's main interaction; simplify the road radio.                       |
| Fish orientation is set to `t * 2`; prey stays positioned relative to a crocodile that keeps circling. | Give prey an independent path and the hunter a coordinated approach, strike and recovery.              |
| Day/night currently blends toward a manual toggle.                                                     | Add a shared environment clock and gradual weather transitions.                                        |

Keep the existing Three.js/Rapier renderer, vehicle controller, road geography, navigation, saves, public project links and static GitHub Pages deployment. Extend these systems in small reviewable commits.

## Controls and a quieter HUD

Introduce a contextual input router in front of the existing driving input. Keyboard, touch and accessible DOM controls dispatch the same actions. The active context owns an event once; switching context clears held driving keys and pointer capture. Native links, text fields and focused controls retain their normal behavior.

| Context                           | Desktop                                                                       | Phone                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Drive                             | WASD or arrows; Space brake; H horn                                           | Existing thumb stick and a brake control; compact horn beside it           |
| Enter a stop, pick up or drop off | **Enter**, while stopped and within the appropriate area                      | One nearby context button: Enter, Pick up or Drop off                      |
| Browse a venue                    | Left/right choose an exhibit or object; Enter activates; Escape returns       | Swipe or large previous/next controls; one action; one back control        |
| Map                               | M opens; arrows select a place; Enter sets directions; Escape closes          | Tap a destination to set its route; simple back control                    |
| Radio                             | Q opens; left/right seek stations; up/down volume; Enter power; Escape closes | Tap the radio icon; previous/next seek, volume knob and power              |
| Drum machine                      | Arrows move between pads; Enter toggles a pad; Space plays/stops              | Large pads and one transport control; four steps per bank on narrow phones |
| Telescope, binoculars, roof       | Arrows look; +/− zoom; Tab cycles available targets; Escape returns           | Drag to look, pinch to zoom, one target/action control and back            |
| Taxi duty                         | T toggles duty while driving                                                  | Small meter/duty switch                                                    |
| Pause/help                        | Escape from driving                                                           | A single menu icon                                                         |

Retain R for recovery and M for the map. Help is available on demand; the first visit shows one short control hint which fades. E is removed from interaction prompts, action handling, accessible labels and documentation.

Desktop driving HUD: a small map control, a compact radio control, the taxi meter when duty is enabled, and one brief context prompt near a stop. Directions use the existing road arrows plus a small turn cue. Speed can sit inside the small meter. The full identity banner and exploration counter move to the intro/menu.

Phone driving HUD: small map/radio/menu controls at the top, thumb controls at the bottom, and one contextual action when needed. Duty, wallet and destination occupy one compact strip only when relevant. No persistent off-duty explanation, station-name panel or large fare card. Reserve the centre for the road and auto; aim for at least two-thirds of the usable viewport to remain unobstructed by panels.

Use safe-area insets and dynamic viewport sizing. Check portrait and landscape with browser chrome expanded and collapsed. Essential touch controls have at least 44 × 44 CSS-pixel targets. Venue mode replaces driving controls instead of stacking another panel over them. Swipe gestures must distinguish browsing from turning a knob, tapping a pad or dragging a camera. Keep optional semantic DOM content, focus visibility, screen-reader announcements, reduced motion and the non-WebGL project fallback.

## Physical town and placement fixes

Create shared placement definitions in the geography layer: building footprints, parking bays, entrances, walkable verges, pickup positions, solid obstacles and closed-road regions. Rendering, physics, map markers and navigation consume these definitions.

1. **Observatory:** move the building onto a level terrace beside the winding road. Add a short driveway, turning/parking bay, retaining wall, steps and a pedestrian approach. Keep its footprint and roof overhang outside the carriageway and shoulder. Update its trigger, taxi stop, telescope anchor and map route together. Preserve the mountain climb.
2. **Tea-shop people:** move the social group and waiting passenger to the patio/verge. A placement check tests each person's full safety radius against every nearby curved road, not just the nearest road centre. Walking/idling paths stay inside that safe area. Decorative stones and street props also leave both lanes clear.
3. **Mountain and closures:** record failing drive paths first. Join barricades to retaining walls, rock formations, banks or fences that visibly explain why the road ends. Give steep exposed faces appropriate solid collision shapes. Sweep the whole vehicle envelope, not a point, where necessary. Detect genuine embedded-terrain failures and recover to the last safe roadside location. Ordinary fields remain explorable where appropriate.
4. **Collision shape and camera:** check the auto cabin/chassis against its visible size without destabilising suspension or mass. Add camera obstruction checks against roofs, walls and hills, with a minimum comfortable follow distance. Venue cameras face doors, counters and objects at human height.
5. **Junctions:** author clean intersection surfaces, stop lines and verges instead of adding overlapping road strips. The road graph must exclude closed exits and lead every route to a usable parking/pickup bay.

Acceptance: the observatory leaves the road visibly clear; no shop resident stands inside a driving lane; none of the five closures can be crossed or bypassed into its inaccessible region at maximum supported speed, in reverse, diagonally or along either side; the auto cannot enter mountain geometry; cameras do not hide the active object behind a roof.

## Eagle Towers and the venues

Eagle Towers becomes the Eagle Eye location and the default starting point. Build a recognisable glass-and-steel office with multiple floors, visible framing, entrance canopy, sign, forecourt, planted edges and a parked-auto bay. Update the Eagle Eye stop name and all home/reset references. Use restrained glass materials and authored reflections that remain affordable on phones.

At the entrance, Enter offers the office exhibit and roof lift through the same small selector. The office presents the existing verified Eagle Eye work as visual case objects, with optional contact/project links. Do not invent client results or expose private data.

The lift moves into a first-person roof view at an actual elevated camera anchor. Visitors can look around the town with arrows or drag, follow birds, watch clouds, see rain approach and stay for evening lights. A restrained panorama/compass cue appears briefly; Escape returns to the forecourt and the same safely parked auto. Compose the skyline and distant hill silhouettes specifically for this view.

| Stop                     | Main object and interaction                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tea shop / About Jay     | Sit at the counter/table. Arrows choose paper, chaya or a snack tray; Enter reads/turns/buys. The paper shows visual project postcards and a few words about Jay. Cup, steam, plate and coin sounds provide feedback. Prices remain the existing game prices. |
| Eagle Towers / Eagle Eye | A compact office display of real work, with short visual case cards; lift to the roof.                                                                                                                                                                        |
| OpsFlash                 | A retro terminal: arrows move through a small illustrative research/workflow scenario; Enter advances its visible result.                                                                                                                                     |
| RIFT                     | A workshop instrument/clipboard: select a mismatch and see records align, with concise difference indicators.                                                                                                                                                 |
| Music & Beats            | A tactile drum machine and cassette-style transport. Turn on pads, play a pattern, change tempo and recall a few grooves.                                                                                                                                     |
| SALTWATER                | A jetty and binocular view. Follow a resident, zoom in and watch natural swim, surface and hunt behavior.                                                                                                                                                     |
| The Quiet Between Stars  | A telescope with a physical sight/reticle. Look around, focus and choose a constellation; a short project launch action remains reachable by Enter.                                                                                                           |

There is no required menu between arriving and trying a stop. Use authored 3D objects where they improve the scene, supported by small responsive DOM/SVG instrument faces for legibility and accessibility. Every primary exhibit works without a mouse. Professional links stay free and discoverable, independent of taxi earnings.

## Retro radio and beats

The radio opens as a small retro cabinet/dashboard unit: speaker grille, lit station window, moving tuner needle, seek controls, volume and power. Show actual known station frequencies only; internet presets use station names/positions rather than fabricated FM frequencies. Hide the tuner when closed; leave only a compact radio icon/status lamp.

Keep Ente as the first station. The first ready click, tap or Enter starts playback inside that user gesture and unlocks procedural sound. A deliberate off/mute choice survives later interactions. Closing the radio cabinet keeps music playing.

Playback states: **off → tuning → playing**, with **buffering** and **unavailable** branches. Generate gentle band-limited static during tuning, animate the needle, and fade static out when the media element actually emits `playing`. A `waiting` event can bring a little static back. Bound the connection timeout and static duration; failed stations get a small no-signal indication and can be skipped. Cancel stale attempts so fast seeking cannot leave two broadcasts playing. Reduce and stop static immediately when power is off, the tab is hidden or sound is muted.

Seeking means previous/next station, not rewinding a live broadcast. Native HTML audio remains a fallback for streams that cannot be routed through Web Audio. Use a separate static/sound bus and coordinated volume fades; radio processing should not depend on every broadcaster supporting CORS. Keep the existing station discovery/curated fallback behind the tuner, with bounded requests. Remove the visible FX sliders, upload form and station-list page from the normal experience.

At Music & Beats, retain the existing synthesis and scheduling, separate them from the old DOM layout, and give them a physical drum-machine interface: kick/snare/hat pads, eight steps, tempo display, playhead LEDs and a transport switch. Narrow phones show steps 1–4 and 5–8 as banks so pads remain comfortable. Beat playback ducks radio instead of permanently stopping it; closing/stopping the instrument restores the user's prior station and volume unless they had switched it off. Save the visitor's pattern locally with bounded validation. Instrument clicks, percussion and radio must not clip or overwhelm one another.

Acceptance includes slow loading, station errors, rapid seeking, mute/off, tab switching and returning from the beat instrument. Test real Ente playback separately from deterministic audio fixtures; passing a fixture is not proof the broadcaster is currently reachable.

## Traffic, signals and a rival auto

Extend the sampled road graph into directed lanes and junction connectors. Define lanes on the left, curve speed limits, stop lines, signal phases, yield rules, safe pull-offs and blocked links once. Map routing and AI routing share the underlying geography.

Start with a bounded population: two cars, two motorbikes, two cycles and one rival auto on desktop; at least one of each vehicle type plus the rival in the phone quality profile. Pool vehicles and spawn them outside the camera, clear of the player, junctions and queues. Density is adjustable internally after profiling.

Cars and the rival auto reuse/generalise the existing raycast suspension with route-following steering, acceleration and braking. Bikes/cycles use stable, explicitly controlled movement with wheel rotation, steering and speed-based lean; their obstacle sweeps and spacing rules are mandatory. Full unconstrained two-wheel balancing would add instability without improving this portfolio. All nearby vehicle contacts use Rapier collision envelopes, with conservative approach speed and low bounce. Never rely on a kinematic body's contact response to decide its route.

Add working lights at **every authored major town junction**, with visible red/amber/green, actual stop lines, mutually exclusive movements and a short all-red clearance interval. AI stops for red, clears a junction before the next conflicting movement, yields to residents/animals and queues without overlapping. Roadwork diversions are excluded from routing. Add deadlock recovery that reverses/reroutes safely rather than teleporting in view. Lights remain visible at night and during rain. No compulsory traffic-fine system is needed for this release.

Generalise the existing resident protection to every road vehicle. Residents, cyclists and livestock cannot be hit, knocked over or receive damage. Validate reverse approaches and vehicle-to-vehicle obstruction as well as normal following.

Taxi duty stays optional and defaults off for a new visitor. When enabled, maintain **four simultaneous passenger offers** at safe, distributed stops, with at least one conveniently reachable from the current district. Mark them on the map and with small hailing cues. Selecting one sets directions; drive there and press Enter while stopped to board.

Each offer has explicit ownership: waiting, boarding, riding, delivered/cancelled. The rival pursues one offer at a time, obeys the same traffic rules and visibly picks up its passenger. Resolve close arrivals deterministically; never take an already boarded passenger from the player. Keep other choices available and replenish completed/taken offers. Start gently, cap rival speed, and tune target selection so a new driver has a reasonable chance without requiring perfect driving.

There is no loss of wallet money for losing a pickup. Give a short audible/visual cue, then mark nearby alternatives. No urgent mission panel or constant countdown. Pay only for a valid travelled ride. Preserve the existing wallet and snack totals during save migration; pending offers/rival position do not need to survive reload. Direct visits/recovery keep clear cancellation semantics.

Entering a venue or opening an interface releases driving input, brakes/parks the player safely and suspends new competitive claims. Ambient traffic, birds and clouds can continue around the parked auto. Hidden tabs suspend simulation; resuming never advances a rival by minutes or spends earnings. Switching duty off returns an active fare without a charge, as today.

Acceptance: conflict-free green phases, believable queues and turns, no protected-person contacts, no visible vehicle spawning, no lane shortcuts through the mountain, no double boarding/payment, fair pickup opportunities and a freely explorable world with duty off.

## Kerala street life, sky and weather

Keep the red procession, orange procession, white gathering and JCB repair sites. Add police patrol vehicles parked beside their diversions, officers managing the roadside, cones and clear detours. Use Kerala Police visual references: khaki patrol officers and the white-shirt/khaki-trouser traffic uniform where appropriate. Model the assets specifically for this town. Group animations, gestures and occasional distant sound should vary instead of every person moving in unison.

Add vegetation in composed clusters: thicker coconut/banana groves, shrubs, flowering edges, creepers, laterite banks, drains and garden plots. Give cows/goats grazing areas, birds perches and short flight routes, and the wetland wading birds/dragonflies. Introduce idle variation and local sound, not a dense spread of identical moving objects. Every ground animal receives the same placement/safety rules as residents.

Create one environment clock used by lighting, sky, building windows, street lamps, wildlife and ambient sound. Proposed full day: about 24 real minutes, beginning in late afternoon so an ordinary visit can experience dusk. Transition gradually through daylight, golden hour, blue hour, night and dawn. Observation does not silently force the whole town into night; the telescope can offer an explicit time-lapse to dusk.

Weather progresses through dry/hazy warmth, wind/cloud buildup, monsoon rain and clearing skies on an independent seeded cycle. This is a compressed fictional seasonal mood, not a real-time weather service. Rain changes nearby water, puddle highlights, foliage sway, drops on canopy edges and ambient audio. Dry periods create haze and restrained dust near roadworks/unpaved shoulders. Keep the town readable, especially at night. Wet-road traction changes gently; protection against residents remains absolute.

Use bounded particles around the camera, instanced foliage, simple cloud layers and quality-dependent reflections/shadows. Do not give every lamp a shadow map or simulate particles across the entire map. Reduced-motion mode removes sharp flashes, strong camera shake and aggressive wind effects. A roof/night/wetland view must look intentional at both graphics levels.

## Crocodile animation and water

Keep the existing residents and observation concept, but rebuild the animation sequence around a coordinated hunter and prey:

1. Swim with a travelling tail wave and tucked/paddling legs; surface/submerge with smooth body depth and eye visibility.
2. A fish follows an independent curved escape path with a tail and small body flex. Its heading follows velocity with a turn-rate limit; roll stays restrained. No perpetual spinning or placement glued ahead of the crocodile.
3. The crocodile notices, turns and approaches an intercept point rather than continuing its idle orbit.
4. A short burst produces acceleration, wake and a timed jaw opening.
5. Capture occurs at a mouth socket as jaws close; transition the fish into a brief held pose before it disappears beneath the water. On a miss, fish continues away and the hunter settles.
6. Recovery blends back into a swim path without snapping position, heading or limb pose.

Improve the crocodile silhouette, eyes, teeth, jaw pivot and tail articulation, and replace the elongated sphere prey with a small authored fish mesh. Use ripples, wake and splash timing to communicate movement; a few coordinated effects are better than one huge expanding ring. Keep proportions and waterline consistent. The camera follows with gentle framing and lets a visitor zoom close enough to judge the catch. Natural hunts recur with varied idle intervals; an Enter action can cue one for observation. No dropdown or large hunt panel.

Acceptance: inspect the full sequence frame by frame from front, side and overhead. Fish direction follows travel; approach, jaw contact and prey capture align; neither animal teleports; repeated hunts and slow frames cannot break the sequence. Review the normal-speed result visually and audibly on phone as well as desktop. State tests alone do not establish animation quality.

## Implementation order and release gates

Work on a release branch so each milestone can be reviewed against the existing game. The full v0.5 release requires all milestones; unfinished extras are not presented as complete.

| Milestone                        | Main work / existing modules                                                                                                                                                     | Gate before proceeding                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Controls and HUD              | Add input contexts and HUD visibility rules; refactor `input.ts`, relevant `main.ts`, `index.html`, `style.css`.                                                                 | Start, drive, route, enter, browse and leave entirely by keyboard; readable portrait/landscape controls; no stuck keys or overlapping panels. |
| 2. Ground, placement and cameras | Shared footprints/parking/obstacle regions in `village.ts`; update `terrain.ts`, `environment.ts`, `roadside.ts`, `village-life.ts`, `safety.ts`, `vehicle.ts`, camera anchors.  | Replayed closure/terrain cases pass; safe residents; clear observatory bay and usable venue cameras.                                          |
| 3. Towers and retro venues       | Add Eagle Towers/roof view, short exhibit controllers and authored object faces; adapt `projects.ts`, `models.ts`, `demos.ts`, `exhibit-art.ts`, `sky.ts` and engine view modes. | All seven stops are usable with the common control scheme; office is the spawn; roof returns safely; no required long text.                   |
| 4. Audio instruments             | Separate playback from old radio DOM; add tuner/static controller; extract beat scheduling from `demos.ts`; coordinate `radio.ts`, `radio-effects.ts` cleanup and `audio.ts`.    | Actual playback states match indicators/static; first gesture starts Ente; seeking/failure/off work; beat/radio restoration is correct.       |
| 5. Traffic and signals           | Introduce focused `traffic.ts` and `signals.ts` systems over directed lanes; reuse vehicle physics and safety. Add original vehicle/officer assets.                              | Vehicles stop/turn/queue safely at every major signal; closures and parked player respected; no deadlocks or harmful contacts.                |
| 6. Passenger competition         | Extend `fares.ts` with offers/ownership and add rival dispatch over the tested traffic layer; update map and pickup cues.                                                        | Four offers, fair rival, correct boarding/payment, saved-wallet migration, cancellation and off-duty behavior.                                |
| 7. Environment and wildlife      | Add environment clock/weather module and roof ambience; revise `wildlife.ts`, water visuals, foliage and animal animation.                                                       | Dawn/night/rain/dust transitions remain readable; polished hunt footage; phone performance stays within measured budgets.                     |
| 8. Integration and publication   | Replace obsolete browser flows with new keyboard/touch journeys, review assets/screenshots and produce a production candidate.                                                   | Required local checks, visual review, CI and exact deployed-build verification all succeed.                                                   |

Art production begins with each feature's model sheet and camera composition before its code is finalised. Author reusable meshes/materials, texture atlases and silhouettes; use original Blender/GLB assets where they improve quality, while retaining the established procedural infrastructure. Additions are lazy-loaded when practical. Establish model/texture/draw-call budgets from a measured baseline; keep source assets and licence attribution in the repository. No dependency rewrite or backend is required.

Separate mode/input logic from exhibit controllers, traffic/signals, fare ownership, environment time and animation. Keep UI code independent of Three.js where it already is. AI planning can run less frequently, but nearby motion/collision safety stays tied to the fixed physics step. Use one authoritative clock per purpose and explicit update order. Quality profiles reduce visuals/population rather than skipping essential safety checks.

## Validation and publishing

Existing passing v0.4 checks do not cover the new requirements. Add tests for behavior that can actually fail: placement radius/road clearance, full closure coverage, fast diagonal contacts, signal conflicts/clearance, blocked routing, concurrent boarding, fair offer availability, wallet migration, cancelled station generations, and animation continuity. Retain existing meaningful vehicle, terrain, fare and public-content checks.

Production browser journeys must include:

- A desktop visitor who starts at Eagle Towers, uses no mouse, visits all seven stops, tunes the radio, makes a beat, observes a hunt/stars/roof and returns to driving.
- Touch driving at 320, 390 and 430 CSS-pixel widths plus a short landscape viewport; orientation changes, safe-area/browser-toolbar changes, independent steering/braking and context replacement.
- Closure approaches and the observatory climb; navigation routes end at safe bays rather than on a building footprint.
- Signals/queues, two autos approaching a passenger, simultaneous claims, off-duty exploration, hidden-tab resume and reload with an existing wallet.
- Radio slow/fail/rapid-seek fixtures, a separate real broadcast check, beat restoration, WebGL failure and reduced motion.
- Seeded daytime, dusk, night, rain and dry-wind scenes; repeated hunts; longer driving with traffic for memory/resource cleanup.

Run `npm run format:check`, `npm test`, `npm run build` and the updated `npm run test:browser` against the candidate. Keep the three CI shards balanced under their job timeout; replace old click-only reader flows rather than appending duplicate long tours. Capture failures and compare real rendered desktop/phone scenes, not only DOM assertions.

Targets: smooth 60 FPS on a representative desktop and sustained 30 FPS on a representative phone, measured while driving through traffic in rain, not from an empty stationary view. Measure frame-time distribution, draw calls, memory and downloaded assets against v0.4. Emulated touch/Chromium results are separate from actual iPhone Safari/device evidence; record anything unverified. If a budget fails, reduce particle/shadow/asset cost before reducing core interactions.

Only merge the validated release to `main` after the local gates pass. The existing workflow then waits for all three check workers before publishing. Check the exact GitHub head/run, live asset hashes and a live keyboard/touch smoke journey. Use a version label so refresh/caching issues are easy to identify. Keep v0.4 available as the rollback point.

## References reviewed

- [Bruno Simon's portfolio](https://bruno-simon.com/) and [its published source](https://github.com/brunosimon/folio-2025): Enter interaction, compact controls, separated game-loop stages, day/year/weather systems and authored asset workflow. Use these as craft references for the existing Kerala world.
- [Rapier rigid body types](https://rapier.rs/docs/user_guides/javascript/rigid_body_type/) and [CCD](https://rapier.rs/docs/user_guides/javascript/rigid_body_ccd/): kinematic trajectories require explicit obstacle handling; collision coverage must be verified with the installed version.
- MDN [playing](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playing_event), [waiting](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/waiting_event) and [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices): honest tuner states, loading/static behavior and first-gesture audio.
- [Kerala Police uniform reference](https://keralapolice.gov.in/storage/pages/custom/ckFiles/file/SOP-3-KERALA-POLICE-UNIFORMS_compressed.pdf): visual guidance for patrol/traffic officers; create original game models.
- Current source, existing validation documentation and all ten supplied screenshots: the implementation baseline and specific failures listed above.
