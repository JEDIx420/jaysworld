# Jay's World — village edition, v0.3

Updated 9 October 2026.

## Experience and implementation

Extend the existing Three.js / Rapier world. Keep the original auto, tiled-roof architecture, old-town loop, seven exhibits, touch input, and static Pages build. Connect them to a larger fictional Kerala village, with everyday life rather than a series of isolated project markers.

The implemented village spans a 460 × 540 metre recovery boundary. Nine connected road paths join six districts: the old village, market quarter, paddy country, ferry and records, observatory ridge, and backwater. Shops, houses, two canal bridges, palms, stalls, a bus shelter, a ferry landing, crops, and hailing residents give the journey context. The map provides directions to project stops and the current fare.

## Visitor journey

1. **Start driving.** The opening gesture starts Ente Radio and original procedural auto sounds. Visitors can mute either independently. Keyboard acceleration also starts the experience; touch visitors use the Start button.
2. **Earn a fare.** Eleven passenger journeys rotate through the village. Stop near the pickup, press E or Pick up, drive to the destination, slow down, and drop off. A visible passenger joins the auto. The wallet receives the fare only after a travelled ride; jumps and recovery cancel the active ride.
3. **Park at a storefront.** Each project has a front-facing visit camera and actions. Visitors can also visit directly from the directory; this cancels an active fare. Reading remains free.
4. **Read the newspaper.** The Kerala Dispatch has three pages: the story, how it works, and a hands-on exhibit. Previous/next buttons, page tabs, and touch swipes support reading.
5. **Stay for chaya.** A paid fare buys tea or snacks at the tea shop. Tea, steam, and a snack appear on the outdoor table. Prices are fictional game prices. Wallet, completed fares, and purchases persist locally; an active passenger does not survive a reload.
6. **Look closer.** Three wetland residents swim, submerge, surface, stalk fish, and snap their articulated jaws. Binocular-style observation offers resident selection, zoom, orbit, and a hunt cue. The observatory offers a movable, magnifiable illustrated sky with Orion, the Big Dipper, and the Southern Cross.
7. **Make a different soundtrack.** The studio processes permitted streams or local audio with low-pass filtering, bass, echo, room reverb, and wobble. Mood presets and an existing beat sequencer give visitors something to play with.

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

The upgrade is functional and stays within the existing setup. Reaching the reference portfolio's authored asset quality still needs bespoke Blender assets, richer terrain and shoreline collision, material/texture production, approved project screenshots, and actual-device performance measurements. The current roads sit on a simplified flat collision floor and water uses recovery zones. The illustrated sky is not a date/location astronomy calculation. Wetland animals are a portfolio exhibit, separate from the standalone survival game.

The physics compatibility bundle still embeds WASM; serving it separately is the main remaining loading optimisation. Target 60 FPS desktop and 30 FPS phone, then measure on representative real devices before claiming those rates.

References: https://bruno-simon.com/ · https://github.com/brunosimon/folio-2025 · https://rapier.rs/docs/user_guides/javascript/vehicle_controller/ · https://developer.chrome.com/blog/autoplay · https://enteradio.com/ · https://api.radio-browser.info/
