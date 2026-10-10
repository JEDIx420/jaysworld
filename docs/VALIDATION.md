# v0.6 validation

The release extends v0.5 at `fddb92e7dc43edacdce5824aa33b7b60201bf2b6`. The implementation plan is in ROOMS_AND_ROADS_PLAN.md. This document distinguishes local automated evidence from physical-device validation.

## Local gates

The candidate must pass formatting, 37 unit/physics tests, the TypeScript/Vite production build, and all thirteen production-browser journeys before moving main. The three CI workers repeat those checks and gate deployment.

The unit/physics suite covers three-wheel support/acceleration/braking/steering, four-wheel traffic suspension/steering/braking, static contacts and CCD, resets, touch mapping, exact reconciliation, secure station filtering, terrain triangle agreement, physical hill climbing, field clearance, connected dry routes, resident yielding/sweeps, fare travel/payment/cancellation/save migration, concurrent player/rival claims, four available offers, cooled-down passengers, front/side/back/diagonal closure sweeps, verge placement, collision-free traffic spawn/bay clearance, mutually exclusive signals and clearance, shared day/weather progression, the side observatory terrace, crocodile separation, jaw/capture timing and continuous fish/crocodile trajectories.

## Production-browser journeys

1. Desktop keyboard start at Eagle Towers, shop entry with Enter, roof lift, driving, braking, parked menus and reset.
2. All seven short exhibits, arrow navigation, distinct interior screens and PPT slides, exact RIFT results, beat editing/playback/stop with radio time/volume independence and a nested tuner and return to driving.
3. 390px touch driving, independent look input, pointer cancellation, minimal HUD and the four-step phone drum bank.
4. 320px/430px/short-landscape layouts, direct-link reload and orientation changes without page overflow.
5. First-gesture radio with real media fixtures, rapid seeking, failed stations, recovery, power and preserved off preference.
6. Crocodile stalking/catch, target selection, zoom, elevated observatory visits and constellation changes.
7. Moving traffic, four offers, selected fare routes, off-duty roaming, an existing wallet and a funded tea purchase.
8. Night/day/rain transitions and readable scenes with reduced-motion preference.
9. Slow and missing signals: static/loading until actual playback and a bounded no-signal state.
10. WebGL fallback with all seven projects and public links.
11. Enter pickup after clicking a fare offer, boarding state and touch pickup.
12. Keyboard map previews/routes and readable phone office/tea/observatory/wetland rooms.
13. Blues/rock seeking, cancellation of stale media and one active native audio element.

Still captures briefly hold only the world’s render callback and restore it immediately. Assertions use the normal simulation. Expected media failures and the explicitly tested WebGL failure are separated from application exceptions. Diagnostics record draw calls, triangle counts, actor positions and climate state. Desktop, phone, landscape, instrument, radio, roof, hill, crocodile, night and rain renders are reviewed visually.

The local Chromium renderer is SwiftShader. These checks establish functional desktop/touch behavior, not 60 FPS on a physical desktop or 30 FPS on an iPhone. Real iOS Safari, safe-area/browser-toolbar behavior and hardware frame-time/memory profiling remain unverified. Performance mode limits the traffic pool, rain particles, resolution and shadows while keeping the same gameplay/safety rules.

## Size and deployment

The interface is about 72 kB raw / 27 kB gzip. The lazy 3D/physics bundle is about 5.00 MB raw / 1.85 MB gzip, principally the embedded Rapier compatibility WASM. The Malayalam WOFF2 subset is 24.1 kB. No remote 3D assets, generated raster assets, secrets or server functions are required.

Successful main builds upload one Pages artifact after all three browser workers finish. Deployment verification checks the exact release commit/run, fetched live asset hashes and a live browser journey. The previous v0.5 commit remains the rollback point.

## v0.6 evidence

Formatting, all 37 unit/physics checks, the TypeScript/Vite build and all thirteen production-browser journeys pass locally. The seven-room tour was also rerun in isolation after a local Chromium process crashed before creating its page. Its assertions confirm simultaneous radio/beat playback at unchanged radio volume, nested tuning without stopping the beat, and return to the parked auto. Passenger pickup passes through Enter after offer selection and through the phone control.

The new True Blues and The Eagle HTTPS feeds returned HTTP 200, `audio/mpeg` and valid MP3 frames on 10 October 2026. Deterministic browser fixtures separately test tuner lifecycle and audio independence; station availability remains external to the static site.

The additional v0.6 unit checks cover every actual curb pickup, shared route endpoints, competing taxi claims, dry spaced streetlights outside entry bays, real junction poles and the expanded station dial. The existing fare physics test now aims at the actual relocated destination rather than the old centreline stop.
