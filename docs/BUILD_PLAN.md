# Jay's World — village edition, v0.4

Updated 9 October 2026.

## Experience and implementation

Extend the existing Three.js / Rapier world. Keep the original auto, tiled-roof architecture, old-town loop, seven exhibits, touch input, and static Pages build. Connect them to a larger fictional Kerala village, with everyday life rather than a series of isolated project markers.

The implemented village spans a 460 × 540 metre recovery boundary. Fourteen connected road paths join six districts: the old village, market quarter, paddy country, ferry and records, observatory ridge, and backwater. Shops, houses, two canal bridges, palms, stalls, a bus shelter, a ferry landing, crops, and hailing residents give the journey context. The map provides directions to project stops and the current fare.

## Visitor journey

1. **Start exploring.** The first click after loading, including a menu click, starts Ente Radio and original procedural auto sounds. Visitors can mute either independently. Keyboard acceleration also starts the experience; touch visitors use the Start button.
2. **Choose your pace.** Free roam is the default. Enable taxi duty for eleven passenger journeys, or switch it off to browse without a mission. Switching off returns an active passenger to their stop, with no payment. The preference persists locally. Stop near the pickup, press E or Pick up, drive to the destination, slow down, and drop off. A visible passenger joins the auto. The wallet receives the fare only after a travelled ride; jumps and recovery cancel the active ride.
3. **Park at a storefront.** Each project has a front-facing visit camera and actions. Visitors can also visit directly from the directory; this cancels an active fare. Reading remains free.
4. **Read something local.** The tea shop offers The Kerala Dispatch. The other stops have distinct studio notes, an operations brief, a graph-paper workshop log, an illustrated record sleeve, a wetland journal and a dark observatory journal. Their three pages cover the story, how it works and a hands-on exhibit. Previous/next buttons, page tabs, and touch swipes support reading.
5. **Stay for chaya.** A paid fare buys tea or snacks at the tea shop. Tea, steam, and a snack appear on the outdoor table. Prices are fictional game prices. Wallet, completed fares, and purchases persist locally; an active passenger does not survive a reload.
6. **Look closer.** Three wetland residents swim, submerge, surface, stalk fish, and snap their articulated jaws. Binocular-style observation offers resident selection, zoom, orbit, and a hunt cue. The observatory offers a movable, magnifiable illustrated sky with Orion, the Big Dipper, and the Southern Cross.
7. **Make a different soundtrack.** The studio processes permitted streams or local audio with low-pass filtering, bass, echo, room reverb, and wobble. Mood presets and an existing beat sequencer give visitors something to play with.

## Roads, terrain and village life

The observatory approach is a winding, genuinely elevated climb to a level 23 metre landing, with a 24 metre ridge and wooded peaks around it. Ground and Rapier use the exact same indexed triangle data. Road triangles follow that ground and have their own matching collision surface. Reset positions, buildings, marker posts, trees and the telescope sample the shared height. Guardrails follow the grade continuously; the driving camera stays above the terrain.

Paddy rectangles previously overlapped roads at the same height, producing visible depth fighting. Field beds are now cut into cells with road-and-verge clearance; bund segments and crops are also excluded from the road. Asphalt, shoulders and field surfaces have separate height layers. Procedural ground variation, banana gardens, wells, laundry, grazing cows/goats, social groups, terrace shrubs and ridge trees break up the plain green verges.

Five outward roads end in readable scenic closures. Plain red and orange processions and a white-clothed village meeting use fictional participants and no real party symbols. Two repair sites have animated yellow excavators, workers, cones and rubble. Physical barricades stop the auto before these crowds and machinery.

Residents and livestock receive conservative horizontal safety bounds around the whole auto. Predictive yielding begins braking; a per-step swept check catches even a long or fast movement and stops the auto outside the person or animal. They never receive vehicle impulses or damage. Livestock pause their wandering path if the driver is too close. Reverse remains available to leave a protected area.

## Navigation and presentation

Rendering, road clearance, maps and route finding share a Catmull–Rom path. The sampled connected graph uses a priority queue and routes across the two dry bridges. Clicking an atlas marker sets directions without teleporting. Zoom, drag-to-pan and keyboard selection support small screens; the existing text directory remains accessible. The auto follows gold road arrows, a heading cue and remaining route distance. Close and scenic camera presets are independent of taxi duty.

The existing project content and demos remain in place. Original inline vector covers and per-venue typography/materials make reading feel appropriate to each stop. The first ready click unlocks audio in the click event; a stopped radio is never restarted by later clicks.

## Engineering choices

- Fixed 60 Hz Rapier vehicle steps with visual interpolation; progressive throttle and braking, speed-sensitive steering, suspension, physical collisions, and a closer follow camera after manual orbit times out.
- Shared geography and a connected road graph for maps, fares, directions, water recovery, and NPC positions. UI modules do not import the 3D renderer.
- Geometry batching and instancing reuse the established procedural style. New palm groves are independently culled. Performance mode reduces shadow and crop detail. Rendering behind reading dialogs is throttled.
- Persistent wallet validation, stopped-vehicle interaction requirements, travelled-distance checks, and cancellation on direct visits / resets protect the economy.
- Explicit drive, storefront, crocodile, and telescope modes. Observation parks the auto while leaving camera input usable.
- Original procedural sound: rounded exhaust harmonics, firing pulse, gear pitch changes, mechanical rattle, speed-dependent road noise, braking, horn, birds, and small fare / paper / tea cues.
- Web Audio processing only for endpoints verified to permit cross-origin processing. Other broadcasters use direct HTML audio, with clear effect availability. Local audio is not uploaded.
- Public professional content and illustrative demos; no private project code, client records, fabricated outcomes, or live AI service.

## Validation and release

Run formatting, strict type checking, targeted unit/physics tests, production build, and browser journeys. Review the real rendered desktop and phone screenshots. Verify the exact pushed head and GitHub CI. Pages publishing remains a manual workflow under Jay's control.

## Further craft work

The upgrade is functional and stays within the existing setup. Reaching the reference portfolio's authored asset quality still needs bespoke Blender assets, detailed shoreline collision, further material/texture production, approved project screenshots, and actual-device performance measurements. Ground and road collision now follow the shared elevated terrain. Water continues to use recovery zones rather than a buoyant vehicle simulation. The illustrated sky is not a date/location astronomy calculation. Wetland animals are a portfolio exhibit, separate from the standalone survival game.

The physics compatibility bundle still embeds WASM; serving it separately is the main remaining loading optimisation. Target 60 FPS desktop and 30 FPS phone, then measure on representative real devices before claiming those rates.

References: https://bruno-simon.com/ · https://github.com/brunosimon/folio-2025 · https://rapier.rs/docs/user_guides/javascript/vehicle_controller/ · https://developer.chrome.com/blog/autoplay · https://enteradio.com/ · https://api.radio-browser.info/
