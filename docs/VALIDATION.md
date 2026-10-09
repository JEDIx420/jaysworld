# v0.5 validation

The release extends v0.4 at `96ea480d3796642a00a0480cf4552ce3f96c51aa`. The implementation plan is in NEXT_RELEASE_PLAN.md. This document distinguishes local automated evidence from physical-device validation.

## Local gates

The candidate must pass formatting, 33 unit/physics tests, the TypeScript/Vite production build, and all ten production-browser journeys before moving main. The three CI workers repeat those checks and gate deployment.

The unit/physics suite covers three-wheel support/acceleration/braking/steering, four-wheel traffic suspension/steering/braking, static contacts and CCD, resets, touch mapping, exact reconciliation, secure station filtering, terrain triangle agreement, physical hill climbing, field clearance, connected dry routes, resident yielding/sweeps, fare travel/payment/cancellation/save migration, concurrent player/rival claims, four available offers, cooled-down passengers, front/side/back/diagonal closure sweeps, verge placement, collision-free traffic spawn/bay clearance, mutually exclusive signals and clearance, shared day/weather progression, the side observatory terrace, crocodile separation, jaw/capture timing and continuous fish/crocodile trajectories.

## Production-browser journeys

1. Desktop keyboard start at Eagle Towers, shop entry with Enter, roof lift, driving, braking, parked menus and reset.
2. All seven short exhibits, arrow navigation, CRT steps, exact RIFT results, beat editing/playback/stop and return to driving.
3. 390px touch driving, independent look input, pointer cancellation, minimal HUD and the four-step phone drum bank.
4. 320px/430px/short-landscape layouts, direct-link reload and orientation changes without page overflow.
5. First-gesture radio with real media fixtures, rapid seeking, failed stations, recovery, power and preserved off preference.
6. Crocodile stalking/catch, target selection, zoom, elevated observatory visits and constellation changes.
7. Moving traffic, four offers, selected fare routes, off-duty roaming, an existing wallet and a funded tea purchase.
8. Night/day/rain transitions and readable scenes with reduced-motion preference.
9. Slow and missing signals: static/loading until actual playback and a bounded no-signal state.
10. WebGL fallback with all seven projects and public links.

Still captures briefly hold only the world’s render callback and restore it immediately. Assertions use the normal simulation. Expected media failures and the explicitly tested WebGL failure are separated from application exceptions. Diagnostics record draw calls, triangle counts, actor positions and climate state. Desktop, phone, landscape, instrument, radio, roof, hill, crocodile, night and rain renders are reviewed visually.

The local Chromium renderer is SwiftShader. These checks establish functional desktop/touch behavior, not 60 FPS on a physical desktop or 30 FPS on an iPhone. Real iOS Safari, safe-area/browser-toolbar behavior and hardware frame-time/memory profiling remain unverified. Performance mode limits the traffic pool, rain particles, resolution and shadows while keeping the same gameplay/safety rules.

## Size and deployment

The interface is about 74.2 kB raw / 27.3 kB gzip. The lazy 3D/physics bundle is about 5.00 MB raw / 1.85 MB gzip, principally the embedded Rapier compatibility WASM. The Malayalam WOFF2 subset is 24.1 kB. No remote 3D assets, generated raster assets, secrets or server functions are required.

Successful main builds upload one Pages artifact after all three browser workers finish. Deployment verification checks the exact release commit/run, fetched live asset hashes and a live browser journey. The previous v0.4 commit remains the rollback point.

## Evidence recorded 9 October 2026

All ten local browser journeys pass against the production candidate across three shards. The physics/unit suite passes all 33 tests; formatting and build also pass. The final render review found and corrected an overlapping cycle spawn, added safe bay clearing for direct visits and verified that the parked auto remains upright with traffic.

Representative SwiftShader snapshots report 42 draw calls / 201,776 triangles for the phone music visit, 229 / 303,016 during a phone orientation check and 109 / 294,554 at the end of the desktop journey. Counts vary with camera/quality; they are not FPS measurements. Moving-traffic diagnostics record cars, motorcycles, cycles and the rival auto on their lanes.

A fresh shell attempt to read Ente’s real broadcast timed out after eight seconds in this environment. The earlier same-day endpoint probe succeeded; sustained broadcast playback is not established by the deterministic media tests. A no-signal state remains visible and bounded when a broadcaster or network cannot be reached.
